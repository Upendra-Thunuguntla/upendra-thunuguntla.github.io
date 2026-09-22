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

    const [, ...body] = rows;
    return body
        .filter(r => r.length >= 3 && r[0].trim())
        .map(r => ({
            connector: r[0].trim(),
            description: r[1].trim(),
            packages: r[2].split(',').map(p => p.trim()).filter(Boolean)
        }));
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderRow(item) {
    const packagesAttr = escapeHtml(item.packages.join(', '));
    return `                    <div class="pkg-row" role="row" data-connector="${escapeHtml(item.connector)}" data-description="${escapeHtml(item.description)}" data-packages="${packagesAttr}">
                        <div class="pkg-col-connector" role="cell">${escapeHtml(item.connector)}</div>
                        <div class="pkg-col-desc" role="cell">${escapeHtml(item.description)}</div>
                        <div class="pkg-col-packages" role="cell">
                            ${item.packages.map(p => `<button type="button" class="pkg-chip" data-package="${escapeHtml(p)}" title="Click to copy this package name"><span class="pkg-chip-text">${escapeHtml(p)}</span><i class="fas fa-copy pkg-chip-copy-icon" aria-hidden="true"></i></button>`).join('\n                            ')}
                        </div>
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
}

main();
