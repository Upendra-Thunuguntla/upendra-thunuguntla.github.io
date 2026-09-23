// Renders tools/mule-debug-package-finder/debug-packages.csv into static HTML rows
// inside tools/mule-debug-package-finder/index.html (between PKG_ROWS_START/END markers).
//
// Why: the connector table must exist as real HTML at deploy time so search engines
// and AI/answer-engine crawlers that don't execute JS can still index the full list.
// The CSV stays the single source of truth for editing — just re-run this script
// (or let the GitHub Actions deploy workflow run it) after changing the CSV.
//
// node scripts/render-debug-packages.js

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const toolDir = path.join(rootDir, 'tools', 'mule-debug-package-finder');
const csvPath = path.join(toolDir, 'debug-packages.csv');
const htmlPath = path.join(toolDir, 'index.html');
// Published publicly (served by GitHub Pages) so the Worker can fetch the current
// package list live at request time — adding a CSV row never requires a Worker redeploy.
const allowlistPath = path.join(toolDir, 'packages.json');

function parseCsv(text) {
    const rows = [];
    let field = '', row = [], inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (c === '"') { inQuotes = false; }
            else { field += c; }
        } else {
            if (c === '"') { inQuotes = true; }
            else if (c === ',') { row.push(field); field = ''; }
            else if (c === '\n' || c === '\r') {
                if (c === '\r' && text[i + 1] === '\n') i++;
                row.push(field); field = '';
                if (row.some(f => f.trim() !== '')) rows.push(row);
                row = [];
            } else { field += c; }
        }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }

    const [header, ...body] = rows;
    const headerNames = header.map(value => value.trim().toLowerCase());
    const connectorIndex = headerNames.indexOf('connector name');
    const descriptionIndex = headerNames.indexOf('description');
    const connectorPackagesIndex = headerNames.indexOf('connector package name(s)');
    const legacyPackagesIndex = headerNames.indexOf('debug package name(s)');
    const driverPackagesIndex = headerNames.indexOf('driver package name(s)');
    const instructionsIndex = headerNames.indexOf('special instructions');
    const versionIndex = headerNames.indexOf('version notes');

    if (connectorIndex < 0 || descriptionIndex < 0 || (connectorPackagesIndex < 0 && legacyPackagesIndex < 0)) {
        throw new Error('CSV must include Connector Name, Description, and package name columns.');
    }

    return body
        .filter(r => r.length > connectorIndex && r[connectorIndex].trim())
        .map(r => ({
            connector: r[connectorIndex].trim(),
            description: r[descriptionIndex].trim(),
            connectorPackages: splitPackages(r[connectorPackagesIndex >= 0 ? connectorPackagesIndex : legacyPackagesIndex]),
            driverPackages: splitPackages(driverPackagesIndex >= 0 ? r[driverPackagesIndex] : ''),
            instructions: instructionsIndex >= 0 ? (r[instructionsIndex] || '').trim() : '',
            versionNotes: versionIndex >= 0 ? (r[versionIndex] || '').trim() : ''
        }));
}

function splitPackages(value) {
    return String(value || '').split(/[;,]/).map(p => p.trim()).filter(Boolean);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderPackages(packages, kind) {
    if (!packages.length) return '<span class="pkg-muted">Not specified</span>';
    return packages.map(p => `<button type="button" class="pkg-chip${kind === 'driver' ? ' pkg-chip-driver' : ''}" data-package="${escapeHtml(p)}" title="Click to copy this package name"><span class="pkg-chip-text">${escapeHtml(p)}</span><i class="fas fa-copy pkg-chip-copy-icon" aria-hidden="true"></i></button>`).join('\n                            ');
}

function renderRow(item) {
    const allPackages = [...item.connectorPackages, ...item.driverPackages];
    const packagesAttr = escapeHtml(allPackages.join(', '));
    const searchText = escapeHtml([item.connector, item.description, ...allPackages, item.instructions, item.versionNotes].join(' '));
    const notes = [item.instructions, item.versionNotes].filter(Boolean).map(note => `<div class="pkg-note">${escapeHtml(note)}</div>`).join('');
    return `                    <div class="pkg-row" role="row" data-connector="${escapeHtml(item.connector)}" data-description="${escapeHtml(item.description)}" data-packages="${packagesAttr}" data-search="${searchText}">
                        <div class="pkg-col-connector" role="cell">${escapeHtml(item.connector)}</div>
                        <div class="pkg-col-desc" role="cell">${escapeHtml(item.description)}</div>
                        <div class="pkg-col-packages" role="cell">
                            <div class="pkg-package-label">Connector</div>
                            ${renderPackages(item.connectorPackages, 'connector')}
                            ${item.driverPackages.length ? `<div class="pkg-package-label">Driver</div>${renderPackages(item.driverPackages, 'driver')}` : ''}
                        </div>
                        <div class="pkg-col-notes" role="cell">${notes || '<span class="pkg-muted">No additional notes</span>'}</div>
                        <div class="pkg-col-actions" role="cell">
                            <button class="btn-icon pkg-copy-log4j" type="button" title="Copy log4j2 AsyncLogger snippet" aria-label="Copy log4j2 snippet for ${escapeHtml(item.connector)}">
                                <i class="fas fa-file-code"></i>
                            </button>
                        </div>
                    </div>`;
}

function main() {
    const csvText = fs.readFileSync(csvPath, 'utf8');
    const data = parseCsv(csvText);
    if (!data.length) throw new Error('No connector rows parsed from CSV — aborting to avoid wiping the page.');

    const rowsHtml = data.map(renderRow).join('\n');
    const countHtml = `Showing all ${data.length} connectors`;

    let html = fs.readFileSync(htmlPath, 'utf8');

    html = html.replace(
        /<!--PKG_ROWS_START-->[\s\S]*?<!--PKG_ROWS_END-->/,
        `<!--PKG_ROWS_START-->\n${rowsHtml}\n                <!--PKG_ROWS_END-->`
    );
    html = html.replace(
        /<!--PKG_COUNT-->[\s\S]*?<!--\/PKG_COUNT-->/,
        `<!--PKG_COUNT-->${countHtml}<!--/PKG_COUNT-->`
    );

    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`Rendered ${data.length} connector rows into ${path.relative(rootDir, htmlPath)}`);

    // Keep the Worker's live-fetched package list in sync with the CSV.
    const allPackages = [...new Set(data.flatMap(item => [...item.connectorPackages, ...item.driverPackages]))].sort();
    fs.mkdirSync(path.dirname(allowlistPath), { recursive: true });
    fs.writeFileSync(allowlistPath, JSON.stringify(allPackages, null, 2) + '\n', 'utf8');
    console.log(`Wrote ${allPackages.length} package names into ${path.relative(rootDir, allowlistPath)}`);
}

main();
