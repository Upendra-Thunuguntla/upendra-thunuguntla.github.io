/* ══════════════════════════════════════════════
   Mule2Curl — Debug Log → cURL Converter Engine
   ══════════════════════════════════════════════ */

const logInput = document.getElementById('log-input');
const curlOutput = document.getElementById('curl-output');
const parseStatusEl = document.getElementById('parse-status');
const breakdownEl = document.getElementById('parsed-breakdown');

/* ── Live parsing on input ── */
logInput.addEventListener('input', debounce(parseAndConvert, 300));

/* ── Debounce helper ── */
function debounce(fn, ms) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}

/* ══════════════════════════════════════════════
   PARSER: Extract HTTP details from Mule logs
   ══════════════════════════════════════════════ */
function parseMuleLog(raw) {
    const lines = raw.split(/\r?\n/);
    let method = '';
    let scheme = 'https';
    let host = '';
    let port = '';
    let path = '';
    let queryString = '';
    const headers = [];
    let body = '';
    let bodyCapture = false;

    const requestLineRe = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE)\s+(\S+)\s*(HTTP\/[\d.]+)?/i;
    const hostRe = /^Host:\s*(.+)/i;
    const headerRe = /^([A-Za-z0-9\-_]+)\s*:\s*(.+)/;
    const muleRequestUriRe = /requesting:\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE)\s+(\S+)/i;
    const muleUriRe = /URI:\s*(\S+)/i;
    const muleMethodRe = /method:\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE)/i;
    const muleHostRe = /host:\s*(\S+)/i;
    const mulePortRe = /port:\s*(\d+)/i;
    const mulePathRe = /path:\s*(\S+)/i;
    const muleSchemeRe = /scheme:\s*(https?)/i;
    const muleQueryParamRe = /queryParam[s]?:\s*\{([^}]*)\}/i;
    const muleHeadersBlockRe = /headers:\s*\{([^}]*)\}/i;
    const bodyRe = /^(?:body|payload|Request body|request-body|data):\s*(.*)/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Strip common Mule log prefixes (timestamps, log levels, class names)
        const cleaned = line
            .replace(/^\d{4}[-/]\d{2}[-/]\d{2}\s+\d{2}:\d{2}:\d{2}[.,]\d{1,3}\s+/, '')
            .replace(/^(DEBUG|INFO|WARN|ERROR|TRACE)\s+/i, '')
            .replace(/^\[.*?\]\s*/, '')
            .replace(/^[\w]+(?:\.[\w]+){2,}\s*[-–:]\s*/, '')
            .trim();

        let m = cleaned.match(muleRequestUriRe);
        if (m) {
            method = m[1].toUpperCase();
            parseFullUrl(m[2]);
            continue;
        }

        m = cleaned.match(requestLineRe);
        if (m && !method) {
            method = m[1].toUpperCase();
            const urlPart = m[2];
            if (urlPart.startsWith('http')) {
                parseFullUrl(urlPart);
            } else {
                const qIdx = urlPart.indexOf('?');
                if (qIdx !== -1) {
                    path = urlPart.substring(0, qIdx);
                    queryString = urlPart.substring(qIdx + 1);
                } else {
                    path = urlPart;
                }
            }
            continue;
        }

        m = cleaned.match(muleMethodRe);
        if (m && !method) { method = m[1].toUpperCase(); continue; }

        m = cleaned.match(muleUriRe);
        if (m && !path) {
            const uri = m[1];
            if (uri.startsWith('http')) { parseFullUrl(uri); }
            else {
                const qIdx = uri.indexOf('?');
                if (qIdx !== -1) { path = uri.substring(0, qIdx); queryString = uri.substring(qIdx + 1); }
                else { path = uri; }
            }
            continue;
        }

        m = cleaned.match(muleSchemeRe);
        if (m) { scheme = m[1].toLowerCase(); continue; }

        m = cleaned.match(mulePortRe);
        if (m) { port = m[1]; continue; }

        m = cleaned.match(mulePathRe);
        if (m && !path) {
            const p = m[1];
            const qIdx = p.indexOf('?');
            if (qIdx !== -1) { path = p.substring(0, qIdx); queryString = p.substring(qIdx + 1); }
            else { path = p; }
            continue;
        }

        m = cleaned.match(muleQueryParamRe);
        if (m) {
            const pairs = m[1].split(',').map(p => p.trim()).filter(Boolean);
            queryString = pairs.join('&');
            continue;
        }

        m = cleaned.match(muleHeadersBlockRe);
        if (m) {
            m[1].split(',').map(p => p.trim()).filter(Boolean).forEach(p => {
                const eqIdx = p.indexOf('=');
                if (eqIdx !== -1) {
                    headers.push({ key: p.substring(0, eqIdx).trim(), value: p.substring(eqIdx + 1).trim() });
                }
            });
            continue;
        }

        m = cleaned.match(hostRe);
        if (m) {
            const hostVal = m[1].trim();
            if (!host) {
                const colonIdx = hostVal.indexOf(':');
                if (colonIdx !== -1) { host = hostVal.substring(0, colonIdx); port = hostVal.substring(colonIdx + 1); }
                else { host = hostVal; }
            }
            headers.push({ key: 'Host', value: hostVal });
            continue;
        }

        m = cleaned.match(muleHostRe);
        if (m && !host) {
            const hostVal = m[1].trim();
            const colonIdx = hostVal.indexOf(':');
            if (colonIdx !== -1) { host = hostVal.substring(0, colonIdx); port = hostVal.substring(colonIdx + 1); }
            else { host = hostVal; }
            continue;
        }

        m = cleaned.match(bodyRe);
        if (m) { body = m[1].trim(); bodyCapture = true; continue; }

        if (bodyCapture && cleaned.startsWith('{') || bodyCapture && cleaned.startsWith('[')) {
            body += (body ? '\n' : '') + cleaned; continue;
        }

        m = cleaned.match(headerRe);
        if (m) {
            const hKey = m[1].trim();
            const hVal = m[2].trim();
            const skipKeys = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'TRACE', 'at', 'Caused'];
            if (!skipKeys.includes(hKey) && hKey.length < 60) {
                headers.push({ key: hKey, value: hVal });
            }
            if (hKey.toLowerCase() === 'host' && !host) {
                const colonIdx = hVal.indexOf(':');
                if (colonIdx !== -1) { host = hVal.substring(0, colonIdx); port = hVal.substring(colonIdx + 1); }
                else { host = hVal; }
            }
            bodyCapture = false;
            continue;
        }

        if (bodyCapture && cleaned) { body += '\n' + cleaned; }
    }

    function parseFullUrl(url) {
        try {
            const u = new URL(url);
            scheme = u.protocol.replace(':', '');
            host = u.hostname;
            if (u.port) port = u.port;
            path = u.pathname;
            if (u.search) queryString = u.search.substring(1);
        } catch (e) {
            const protoMatch = url.match(/^(https?):\/\/([^/:]+)(?::(\d+))?(\/[^?]*)?(?:\?(.*))?$/i);
            if (protoMatch) {
                scheme = protoMatch[1]; host = protoMatch[2];
                if (protoMatch[3]) port = protoMatch[3];
                if (protoMatch[4]) path = protoMatch[4];
                if (protoMatch[5]) queryString = protoMatch[5];
            }
        }
    }

    const headerMap = new Map();
    headers.forEach(h => headerMap.set(h.key, h.value));
    const dedupedHeaders = [];
    headerMap.forEach((v, k) => dedupedHeaders.push({ key: k, value: v }));

    let fullUrl = '';
    if (host) {
        const defaultPort = scheme === 'https' ? '443' : '80';
        const portSuffix = (port && port !== defaultPort) ? ':' + port : '';
        fullUrl = scheme + '://' + host + portSuffix + (path || '/');
        if (queryString) fullUrl += '?' + queryString;
    }

    return {
        method: method || 'GET', scheme, host, port,
        path: path || '/', queryString,
        headers: dedupedHeaders, body: body.trim(), fullUrl,
        hasData: !!host || !!method,
    };
}

/* ══════════════════════════════════════════════
   BUILD cURL COMMAND
   ══════════════════════════════════════════════ */
function buildCurl(parsed) {
    const parts = ['curl'];
    parts.push('--location');
    parts.push('--request ' + parsed.method);
    parts.push("'" + parsed.fullUrl + "'");

    parsed.headers.forEach(h => {
        if (h.key.toLowerCase() === 'host') return;
        if (h.key.toLowerCase() === 'content-length') return;
        parts.push("--header '" + h.key + ': ' + h.value + "'");
    });

    if (parsed.body) {
        parts.push("--data '" + parsed.body.replace(/'/g, "'\\''") + "'");
    }

    return parts.join(' \\\n  ');
}

/* ══════════════════════════════════════════════
   RENDER PARSED BREAKDOWN (Full-width, 2-column)
   ══════════════════════════════════════════════ */
const requestCol = document.getElementById('breakdown-request');
const headersCol = document.getElementById('breakdown-headers');

function renderBreakdown(parsed) {
    requestCol.innerHTML = '';
    headersCol.innerHTML = '';

    function makeField(label, value) {
        const div = document.createElement('div');
        div.className = 'parsed-field';
        div.innerHTML = `
            <span class="parsed-field-label">${label}</span>
            <span class="parsed-field-value${value ? '' : ' empty'}">${value || '—'}</span>
        `;
        return div;
    }

    // Left column: Request Info
    requestCol.appendChild(makeField('Method', parsed.method));
    requestCol.appendChild(makeField('Scheme', parsed.scheme));
    requestCol.appendChild(makeField('Host', parsed.host));
    if (parsed.port) requestCol.appendChild(makeField('Port', parsed.port));
    requestCol.appendChild(makeField('Path', parsed.path));
    if (parsed.queryString) requestCol.appendChild(makeField('Query', parsed.queryString));
    if (parsed.body) {
        requestCol.appendChild(makeField('Body', parsed.body.length > 300 ? parsed.body.substring(0, 300) + '…' : parsed.body));
    }

    // Right column: Headers
    if (parsed.headers.length > 0) {
        const headerDiv = document.createElement('div');
        headerDiv.innerHTML = `
            <div class="parsed-headers-list">
                ${parsed.headers.map(h => `
                    <div class="parsed-header-row">
                        <span class="parsed-header-key">${escapeHtml(h.key)}:</span>
                        <span class="parsed-header-val">${escapeHtml(h.value)}</span>
                    </div>
                `).join('')}
            </div>
        `;
        headersCol.appendChild(headerDiv);
    } else {
        headersCol.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem; font-style:italic;">No headers detected</div>';
    }

    breakdownEl.style.display = 'block';
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════════════
   MAIN: Parse and Convert
   ══════════════════════════════════════════════ */
function parseAndConvert() {
    const raw = logInput.value.trim();

    if (!raw) {
        curlOutput.value = '';
        parseStatusEl.className = 'parse-status idle';
        parseStatusEl.textContent = '⏳ Waiting for input…';
        breakdownEl.style.display = 'none';
        return;
    }

    try {
        const parsed = parseMuleLog(raw);

        if (!parsed.hasData || !parsed.host) {
            parseStatusEl.className = 'parse-status error';
            parseStatusEl.textContent = '⚠️ Could not detect HTTP request details. Check your log format.';
            curlOutput.value = '# Unable to parse the input. Try pasting the full HTTP debug log.';
            breakdownEl.style.display = 'none';
            return;
        }

        const curl = buildCurl(parsed);
        curlOutput.value = curl;
        renderBreakdown(parsed);

        const headerCount = parsed.headers.length;
        parseStatusEl.className = 'parse-status success';
        parseStatusEl.textContent = `✅ Parsed: ${parsed.method} ${parsed.host}${parsed.path} — ${headerCount} header${headerCount !== 1 ? 's' : ''}`;

        track_event('mule2curl_parsed', {
            tool: 'mule2curl',
            method: parsed.method,
            header_count: headerCount,
            has_body: !!parsed.body,
            has_query: !!parsed.queryString,
        });

    } catch (err) {
        parseStatusEl.className = 'parse-status error';
        parseStatusEl.textContent = '❌ Parse error: ' + err.message;
        curlOutput.value = '# Parse error: ' + err.message;
    }
}

/* ══════════════════════════════════════════════
   ACTIONS
   ══════════════════════════════════════════════ */
function copyCurl() {
    copyToClipboard(curlOutput.value, document.getElementById('curl-copy-btn'));
    track_event('copy', { tool: 'mule2curl', content_type: 'curl' });
}

function downloadCurl() {
    const content = curlOutput.value;
    if (!content.trim() || content.startsWith('#')) {
        showToast('Nothing to download!', 'error');
        return;
    }
    downloadFile('#!/bin/bash\n\n' + content + '\n', 'mule-request.sh', 'text/x-shellscript;charset=utf-8');
    track_event('download', { tool: 'mule2curl', file_type: 'sh' });
}

function clearAll() {
    logInput.value = '';
    curlOutput.value = '';
    parseStatusEl.className = 'parse-status idle';
    parseStatusEl.textContent = '⏳ Waiting for input…';
    breakdownEl.style.display = 'none';
    requestCol.innerHTML = '';
    headersCol.innerHTML = '';
    showToast('Cleared.');
}

function loadExample() {
    logInput.value = `2024-03-11 14:23:45.123 DEBUG [processor-1] org.mule.service.http.impl.service.HttpMessageLogger - 
POST /api/v1/orders?status=active&page=1 HTTP/1.1
Host: api.acme-corp.com:8443
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature
Accept: application/json
x-correlation-id: 8f14e45f-ceea-367a-a92e-4427f2d1a3b7
x-client-id: mule-order-service
Cache-Control: no-cache
Content-Length: 82

{"customerId": "CUST-2024-001", "items": [{"sku": "PROD-100", "quantity": 3}]}`;
    parseAndConvert();
    showToast('Example loaded!');
    track_event('load_example', { tool: 'mule2curl' });
}
