/* Mule Debug Package Finder — script.js
 * The connector table is statically rendered server-side (see
 * scripts/render-debug-packages.js) from debug-packages.csv, so the full
 * list is crawlable without JS. This script only adds the live filter,
 * level toggle, and copy-to-clipboard interactions on top of it.
 */

document.addEventListener('DOMContentLoaded', init);

function init() {
    const filterInput = document.getElementById('pkg-filter');
    const rowsContainer = document.getElementById('pkg-rows');

    if (filterInput) filterInput.addEventListener('input', applyFilter);

    if (rowsContainer) {
        rowsContainer.addEventListener('click', (e) => {
            const chip = e.target.closest('.pkg-chip');
            const copyLog4jBtn = e.target.closest('.pkg-copy-log4j');
            if (chip) copyChipPackage(chip);
            else if (copyLog4jBtn) copyLog4j(copyLog4jBtn);
        });
    }
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
    const rows = getAllRows();
    let visibleCount = 0;

    rows.forEach(row => {
        const haystack = (
            row.dataset.connector + ' ' +
            row.dataset.description + ' ' +
            row.dataset.packages
        ).toLowerCase();
        const match = !q || haystack.includes(q);
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
}

function copyAllVisible() {
    const level = getLevel();
    const rows = getAllRows().filter(row => row.style.display !== 'none');
    if (!rows.length) { showToast('Nothing to copy — no rows visible!', 'error'); return; }

    const lines = [];
    rows.forEach(row => {
        row.dataset.packages.split(',').map(p => p.trim()).filter(Boolean)
            .forEach(p => lines.push(`    <AsyncLogger name="${p}" level="${level}"/>`));
    });
    const snippet = `<Loggers>\n${lines.join('\n')}\n</Loggers>`;
    copyToClipboard(snippet, document.getElementById('btn-copy-all'));
}
