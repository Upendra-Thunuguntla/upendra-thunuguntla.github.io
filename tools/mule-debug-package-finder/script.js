/* Mule Debug Package Finder — script.js
 * The connector table is statically rendered server-side (see
 * scripts/render-debug-packages.js) from debug-packages.csv, so the full
 * list is crawlable without JS. This script layers on the live filter,
 * level toggle, copy-to-clipboard interactions, and "Most Copied" sorting
 * backed by an anonymous Cloudflare Worker counter (see /worker).
 */

const RANKS_API = 'https://upendra.fyi/api/pkg-ranks/ranks';
const TRACK_API = 'https://upendra.fyi/api/pkg-ranks/track';

let packageRanks = {};

document.addEventListener('DOMContentLoaded', init);

function init() {
    const filterInput = document.getElementById('pkg-filter');
    const sortSelect = document.getElementById('pkg-sort');
    const rowsContainer = document.getElementById('pkg-rows');

    if (filterInput) filterInput.addEventListener('input', applyFilter);
    if (sortSelect) sortSelect.addEventListener('change', () => applySort(sortSelect.value));

    if (rowsContainer) {
        rowsContainer.addEventListener('click', (e) => {
            const chip = e.target.closest('.pkg-chip');
            const copyLog4jBtn = e.target.closest('.pkg-copy-log4j');
            if (chip) copyChipPackage(chip);
            else if (copyLog4jBtn) copyLog4j(copyLog4jBtn);
        });
    }

    // Sort immediately using whatever we have (all-zero scores ⇒ alphabetical
    // tie-break) so the page isn't stuck in raw CSV order while ranks load.
    applySort(sortSelect ? sortSelect.value : 'rank');
    loadRanks();
}

/* ─── Live rank data (anonymous copy counters via Cloudflare Worker) ─── */
function loadRanks() {
    fetch(RANKS_API)
        .then(res => (res.ok ? res.json() : {}))
        .then(data => {
            packageRanks = data && typeof data === 'object' ? data : {};
            const sortSelect = document.getElementById('pkg-sort');
            applySort(sortSelect ? sortSelect.value : 'rank');
        })
        .catch(() => { /* ranking API unavailable — static CSV order remains */ });
}

function trackCopy(pkg) {
    fetch(TRACK_API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ package: pkg }),
        keepalive: true
    }).catch(() => { /* best-effort only — never block the copy UX */ });
}

function rowScore(row) {
    return row.dataset.packages.split(',').map(p => p.trim()).filter(Boolean)
        .reduce((sum, p) => sum + (packageRanks[p] || 0), 0);
}

/* ─── Sorting (reorders the pre-rendered rows in place) ─── */
function applySort(mode) {
    const container = document.getElementById('pkg-rows');
    const rows = getAllRows();

    rows.sort((a, b) => {
        if (mode === 'az') return a.dataset.connector.localeCompare(b.dataset.connector);
        if (mode === 'za') return b.dataset.connector.localeCompare(a.dataset.connector);
        // 'rank': most-copied first, unranked/zero rows pushed to the bottom (alphabetical among ties)
        const scoreDiff = rowScore(b) - rowScore(a);
        return scoreDiff !== 0 ? scoreDiff : a.dataset.connector.localeCompare(b.dataset.connector);
    });

    const frag = document.createDocumentFragment();
    rows.forEach(row => frag.appendChild(row));
    container.appendChild(frag);
}

function getAllRows() {
    return Array.from(document.querySelectorAll('#pkg-rows .pkg-row'));
}

function getLevel() {
    const sel = document.getElementById('pkg-level');
    return (sel && sel.value) || 'DEBUG';
}

/* ─── Filtering (show/hide pre-rendered rows) ─── */
function applyFilter() {
    const q = document.getElementById('pkg-filter').value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    const rows = getAllRows();
    let visibleCount = 0;

    rows.forEach(row => {
        const haystack = (
            row.dataset.connector + ' ' +
            row.dataset.description + ' ' +
            row.dataset.packages
        ).toLowerCase();
        // Every typed word must appear somewhere in the row (any order), so a
        // search matches across connector, description, and packages together.
        const match = terms.every(term => haystack.includes(term));
        row.style.display = match ? '' : 'none';
        if (match) visibleCount++;
    });

    document.getElementById('pkg-empty').style.display = visibleCount ? 'none' : 'block';
    document.getElementById('pkg-count').textContent = q
        ? `Showing ${visibleCount} of ${rows.length} connectors`
        : `Showing all ${rows.length} connectors`;
}

/* ─── Copy actions ─── */
function copyChipPackage(chip) {
    // Don't let the shared helper overwrite the chip's label — just flash its border.
    copyToClipboard(chip.dataset.package, null);
    chip.classList.add('pkg-chip-copied');
    clearTimeout(chip._copiedTimer);
    chip._copiedTimer = setTimeout(() => chip.classList.remove('pkg-chip-copied'), 1200);
    trackCopy(chip.dataset.package);
}

function copyLog4j(btn) {
    const row = btn.closest('.pkg-row');
    if (!row) return;
    const level = getLevel();
    const packages = row.dataset.packages.split(',').map(p => p.trim()).filter(Boolean);
    const snippet = packages
        .map(p => `<AsyncLogger name="${p}" level="${level}"/>`)
        .join('\n');
    copyToClipboard(snippet, btn);
    packages.forEach(trackCopy);
}
