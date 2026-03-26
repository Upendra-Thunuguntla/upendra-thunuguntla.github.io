/* ══════════════════════════════════════════════
   cURL → Mule HTTP Request Converter Engine
   ══════════════════════════════════════════════ */

const curlInput = document.getElementById('curl-input');
const configOutput = document.getElementById('config-output');
const processorOutput = document.getElementById('processor-output');
const breakdownEl = document.getElementById('parsed-breakdown');
const configSection = document.getElementById('config-output-section');
const processorSection = document.getElementById('processor-output-section');

let currentMode = 'separated'; // 'separated', 'embedded'

/* ── Live parsing on input ── */
curlInput.addEventListener('input', debounce(parseAndConvert, 300));
document.getElementById('config-name').addEventListener('input', debounce(parseAndConvert, 300));

// Re-generate on option changes
['opt-follow-redirects', 'opt-response-timeout', 'opt-streaming', 'opt-format-body'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', parseAndConvert);
});
document.getElementById('opt-timeout-value').addEventListener('input', debounce(parseAndConvert, 300));

/* ── Debounce helper ── */
function debounce(fn, ms) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}

/* ── Mode toggle ── */
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (mode === 'embedded') {
        configSection.style.display = 'none';
        processorSection.style.display = 'block';
    } else {
        configSection.style.display = 'block';
        processorSection.style.display = 'block';
    }
    parseAndConvert();
}

/* ══════════════════════════════════════════════
   PARSER: Extract HTTP details from cURL
   ══════════════════════════════════════════════ */
function parseCurl(raw) {
    // Normalize: join continuation lines
    let cmd = raw.replace(/\\\s*\n/g, ' ').replace(/\\\s*\r\n/g, ' ').trim();

    // Strip leading 'curl' keyword
    cmd = cmd.replace(/^curl\s+/i, '');

    const result = {
        method: '',
        url: '',
        scheme: 'https',
        host: '',
        port: '',
        path: '/',
        queryParams: [],
        headers: [],
        body: '',
        basicAuth: null,
        isInsecure: false,
        followRedirects: true,
        hasData: false,
    };

    // Tokenize: respect quotes
    const tokens = tokenize(cmd);

    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];

        if (token === '-X' || token === '--request') {
            result.method = (tokens[++i] || '').toUpperCase();
        } else if (token === '-H' || token === '--header') {
            const hdr = tokens[++i] || '';
            const colonIdx = hdr.indexOf(':');
            if (colonIdx !== -1) {
                const key = hdr.substring(0, colonIdx).trim();
                const val = hdr.substring(colonIdx + 1).trim();
                result.headers.push({ key, value: val });
            }
        } else if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary' || token === '--data-urlencode') {
            result.body = tokens[++i] || '';
            result.hasData = true;
        } else if (token === '-u' || token === '--user') {
            const cred = tokens[++i] || '';
            const sepIdx = cred.indexOf(':');
            if (sepIdx !== -1) {
                result.basicAuth = {
                    username: cred.substring(0, sepIdx),
                    password: cred.substring(sepIdx + 1)
                };
            } else {
                result.basicAuth = { username: cred, password: '' };
            }
        } else if (token === '-L' || token === '--location') {
            result.followRedirects = true;
        } else if (token === '-k' || token === '--insecure') {
            result.isInsecure = true;
        } else if (token === '--compressed' || token === '-s' || token === '--silent' || token === '-S' || token === '--show-error' || token === '-v' || token === '--verbose' || token === '-i') {
            // Skip known flags without arguments
        } else if (token === '--connect-timeout' || token === '--max-time' || token === '-o' || token === '--output') {
            i++; // skip value
        } else if (!token.startsWith('-')) {
            // URL
            result.url = token;
        }
        i++;
    }

    // Parse URL
    if (result.url) {
        try {
            const u = new URL(result.url);
            result.scheme = u.protocol.replace(':', '');
            result.host = u.hostname;
            if (u.port) result.port = u.port;
            result.path = u.pathname || '/';
            u.searchParams.forEach((v, k) => {
                result.queryParams.push({ key: k, value: v });
            });
        } catch (e) {
            // Fallback regex
            const m = result.url.match(/^(https?):\/\/([^/:]+)(?::(\d+))?(\/[^?]*)?(?:\?(.*))?$/i);
            if (m) {
                result.scheme = m[1];
                result.host = m[2];
                if (m[3]) result.port = m[3];
                if (m[4]) result.path = m[4];
                if (m[5]) {
                    m[5].split('&').forEach(p => {
                        const eq = p.indexOf('=');
                        if (eq !== -1) {
                            result.queryParams.push({
                                key: decodeURIComponent(p.substring(0, eq)),
                                value: decodeURIComponent(p.substring(eq + 1))
                            });
                        }
                    });
                }
            }
        }
    }

    // Default method
    if (!result.method) {
        result.method = result.hasData ? 'POST' : 'GET';
    }

    // Default port
    if (!result.port) {
        result.port = result.scheme === 'https' ? '443' : '80';
    }

    return result;
}

/* Tokenizer: split respecting single and double quotes */
function tokenize(str) {
    const tokens = [];
    let current = '';
    let inSingle = false;
    let inDouble = false;
    let escaped = false;

    for (let i = 0; i < str.length; i++) {
        const ch = str[i];

        if (escaped) {
            current += ch;
            escaped = false;
            continue;
        }

        if (ch === '\\' && !inSingle) {
            escaped = true;
            continue;
        }

        if (ch === "'" && !inDouble) {
            inSingle = !inSingle;
            continue;
        }

        if (ch === '"' && !inSingle) {
            inDouble = !inDouble;
            continue;
        }

        if ((ch === ' ' || ch === '\t') && !inSingle && !inDouble) {
            if (current) {
                tokens.push(current);
                current = '';
            }
            continue;
        }

        current += ch;
    }

    if (current) tokens.push(current);
    return tokens;
}

/* ══════════════════════════════════════════════
   XML BUILDERS
   ══════════════════════════════════════════════ */
function escXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/* ── Body Formatter ── */
function formatBody(body) {
    if (!body) return '';
    const trimmed = body.trim();

    // 1. Try to parse as JSON first
    try {
        const parsed = JSON.parse(trimmed);
        return JSON.stringify(parsed, null, 4);
    } catch (e) {
        // Not standard JSON
    }

    // 2. Try to handle DataWeave / "Java" style objects with unquoted keys
    // Very basic brace-based formatter for DW/Java maps
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        let level = 0;
        const indentString = '    ';
        let result = '';
        let lastChar = '';
        let inQuote = false;
        let quoteChar = '';

        for (let i = 0; i < trimmed.length; i++) {
            const char = trimmed[i];
            
            // Handle quotes to ignore braces inside strings
            if ((char === '"' || char === "'") && lastChar !== '\\') {
                if (!inQuote) {
                    inQuote = true;
                    quoteChar = char;
                } else if (char === quoteChar) {
                    inQuote = false;
                }
            }

            if (!inQuote) {
                if (char === '{' || char === '[') {
                    level++;
                    result += char + '\n' + indentString.repeat(level);
                } else if (char === '}' || char === ']') {
                    level = Math.max(0, level - 1);
                    result = result.trimEnd();
                    result += '\n' + indentString.repeat(level) + char;
                } else if (char === ',') {
                    result += ',\n' + indentString.repeat(level);
                } else if (char === ':') {
                    result += ': ';
                } else if (/\s/.test(char)) {
                    // skip whitespace
                } else {
                    result += char;
                }
            } else {
                result += char;
            }
            lastChar = char;
        }
        return result.trim();
    }

    return trimmed;
}

function buildConfigXml(parsed) {
    const configName = document.getElementById('config-name').value.trim() || 'HTTP_Request_Configuration';
    const defaultPort = parsed.scheme === 'https' ? '443' : '80';
    const port = parsed.port && parsed.port !== defaultPort ? parsed.port : defaultPort;

    let xml = `<http:request-config name="${escXml(configName)}">\n`;
    xml += `    <http:request-connection protocol="${parsed.scheme.toUpperCase()}" host="${escXml(parsed.host)}" port="${port}" />\n`;

    if (parsed.basicAuth) {
        xml += `    <http:authentication>\n`;
        xml += `        <http:basic-authentication username="${escXml(parsed.basicAuth.username)}" password="${escXml(parsed.basicAuth.password)}" />\n`;
        xml += `    </http:authentication>\n`;
    }

    xml += `</http:request-config>`;
    return xml;
}

function buildProcessorXml(parsed, useConfigRef) {
    const configName = document.getElementById('config-name').value.trim() || 'HTTP_Request_Configuration';
    const followRedirects = document.getElementById('opt-follow-redirects').checked;
    const responseTimeout = document.getElementById('opt-response-timeout').checked;
    const timeoutVal = document.getElementById('opt-timeout-value').value || '30000';
    const streaming = document.getElementById('opt-streaming').checked;

    const filteredHeaders = parsed.headers.filter(h => {
        const k = h.key.toLowerCase();
        return k !== 'content-length' && k !== 'host';
    });

    const requestName = `${parsed.method} | ${parsed.host} | ${parsed.path}`;
    let xml = `<http:request method="${parsed.method}" doc:name="${escXml(requestName)}" `;

    if (useConfigRef) {
        xml += `config-ref="${escXml(configName)}" `;
        xml += `path="${escXml(parsed.path)}"`;
    } else {
        // Embedded: use full URL
        const fullUrl = parsed.url;
        xml += `url="${escXml(fullUrl)}"`;
    }

    xml += ` followRedirects="${followRedirects}"`;
    if (responseTimeout) {
        xml += ` responseTimeout="${escXml(timeoutVal)}"`;
    }
    if (streaming) {
        xml += ` requestStreamingMode="ALWAYS"`;
    }

    // Check if we need child elements
    const hasChildren = filteredHeaders.length > 0 || parsed.queryParams.length > 0 || parsed.body;

    if (!hasChildren) {
        xml += ` />`;
        return xml;
    }

    xml += `>\n`;

    // Body
    if (parsed.body) {
        const shouldFormat = document.getElementById('opt-format-body').checked;
        let bodyContent = parsed.body;

        if (shouldFormat) {
            bodyContent = formatBody(parsed.body);
        }

        if (bodyContent.includes('\n')) {
            // Indent the multi-line body for XML readability
            const indented = bodyContent.split('\n').map(line => '        ' + line).join('\n');
            xml += `    <http:body><![CDATA[#[\n${indented}\n    ]]]></http:body>\n`;
        } else {
            xml += `    <http:body><![CDATA[#[${bodyContent}]]]></http:body>\n`;
        }
    }

    // Headers as dynamic input params (DataWeave map)
    if (filteredHeaders.length > 0) {
        xml += `    <http:headers><![CDATA[#[\n`;
        xml += `        {\n`;
        filteredHeaders.forEach((h, idx) => {
            const comma = idx < filteredHeaders.length - 1 ? ',' : '';
            xml += `            "${escXml(h.key)}": "${escXml(h.value)}"${comma}\n`;
        });
        xml += `        }\n`;
        xml += `    ]]]></http:headers>\n`;
    }

    // Query params as dynamic input params
    if (parsed.queryParams.length > 0) {
        xml += `    <http:query-params><![CDATA[#[\n`;
        xml += `        {\n`;
        parsed.queryParams.forEach((p, idx) => {
            const comma = idx < parsed.queryParams.length - 1 ? ',' : '';
            xml += `            "${escXml(p.key)}": "${escXml(p.value)}"${comma}\n`;
        });
        xml += `        }\n`;
        xml += `    ]]]></http:query-params>\n`;
    }

    xml += `</http:request>`;
    return xml;
}


/* ══════════════════════════════════════════════
   RENDER PARSED BREAKDOWN
   ══════════════════════════════════════════════ */
const requestCol = document.getElementById('breakdown-request');
const headersCol = document.getElementById('breakdown-headers');

function renderBreakdown(parsed) {
    if (!requestCol || !headersCol || !breakdownEl) return;

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

    requestCol.appendChild(makeField('Method', parsed.method));
    requestCol.appendChild(makeField('Scheme', parsed.scheme));
    requestCol.appendChild(makeField('Host', parsed.host));
    if (parsed.port) requestCol.appendChild(makeField('Port', parsed.port));
    requestCol.appendChild(makeField('Path', parsed.path));
    if (parsed.body) {
        const isFormat = document.getElementById('opt-format-body').checked;
        const b = isFormat ? formatBody(parsed.body) : parsed.body;
        requestCol.appendChild(makeField('Body', b.length > 500 ? b.substring(0, 500) + '…' : b));
    }
    if (parsed.basicAuth) {
        const uname = parsed.basicAuth.username || '';
        requestCol.appendChild(makeField('Auth', 'Basic (' + escXml(uname) + ')'));
    }

    // Headers + Query Params
    let content = '';
    if (parsed.headers.length > 0) {
        content += '<div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);margin-bottom:4px;">HEADERS</div>';
        content += '<div class="parsed-headers-list">';
        parsed.headers.forEach(h => {
            content += `<div class="parsed-header-row">
                <span class="parsed-header-key">${escXml(h.key)}:</span>
                <span class="parsed-header-val">${escXml(h.value)}</span>
            </div>`;
        });
        content += '</div>';
    }

    if (parsed.queryParams.length > 0) {
        content += '<div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);margin-top:var(--space-sm);margin-bottom:4px;">QUERY PARAMS</div>';
        content += '<div class="parsed-headers-list">';
        parsed.queryParams.forEach(p => {
            content += `<div class="parsed-header-row">
                <span class="parsed-header-key">${escXml(p.key)}:</span>
                <span class="parsed-header-val">${escXml(p.value)}</span>
            </div>`;
        });
        content += '</div>';
    }

    headersCol.innerHTML = content || '<div style="color:var(--text-muted); font-size:0.8rem; font-style:italic;">No headers or query params detected</div>';

    breakdownEl.style.display = 'block';
}

/* ══════════════════════════════════════════════
   MAIN: Parse and Convert
   ══════════════════════════════════════════════ */
function parseAndConvert() {
    const raw = curlInput.value.trim();

    if (!raw) {
        configOutput.value = '';
        processorOutput.value = '';
        breakdownEl.style.display = 'none';
        return;
    }

    try {
        const parsed = parseCurl(raw);

        if (!parsed.host) {
            configOutput.value = '<!-- Unable to parse the cURL command. Check the URL format. -->';
            processorOutput.value = '';
            breakdownEl.style.display = 'none';
            return;
        }

        if (currentMode === 'embedded') {
            configOutput.value = '';
            processorOutput.value = buildProcessorXml(parsed, false);
        } else {
            configOutput.value = buildConfigXml(parsed);
            processorOutput.value = buildProcessorXml(parsed, true);
        }

        renderBreakdown(parsed);

        const headerCount = parsed.headers.length;
        const qpCount = parsed.queryParams.length;

        if (typeof track_event === 'function') {
            track_event('curl2mule_parsed', {
                tool: 'curl2mule',
                method: parsed.method,
                header_count: headerCount,
                qp_count: qpCount,
                has_body: !!parsed.body,
                mode: currentMode,
            });
        }

    } catch (err) {
        configOutput.value = '<!-- Parse error: ' + err.message + ' -->';
        processorOutput.value = '';
        if (breakdownEl) breakdownEl.style.display = 'none';
    }
}

/* ══════════════════════════════════════════════
   ACTIONS
   ══════════════════════════════════════════════ */
function copyConfig() {
    copyToClipboard(configOutput.value, document.getElementById('config-copy-btn'));
    if (typeof track_event === 'function') track_event('copy', { tool: 'curl2mule', content_type: 'config' });
}

function copyProcessor() {
    copyToClipboard(processorOutput.value, document.getElementById('processor-copy-btn'));
    if (typeof track_event === 'function') track_event('copy', { tool: 'curl2mule', content_type: 'processor' });
}

function copyAll() {
    const all = (configOutput.value ? configOutput.value + '\n\n' : '') + processorOutput.value;
    copyToClipboard(all);
    if (typeof track_event === 'function') track_event('copy', { tool: 'curl2mule', content_type: 'all' });
}

function downloadXml() {
    const all = (configOutput.value ? configOutput.value + '\n\n' : '') + processorOutput.value;
    if (!all.trim()) {
        showToast('Nothing to download!', 'error');
        return;
    }
    downloadFile(all, 'mule-http-request.xml', 'application/xml;charset=utf-8');
    if (typeof track_event === 'function') track_event('download', { tool: 'curl2mule', file_type: 'xml' });
}

function clearAll() {
    curlInput.value = '';
    configOutput.value = '';
    processorOutput.value = '';
    if (breakdownEl) breakdownEl.style.display = 'none';
    showToast('Cleared.');
}

function loadExample() {
    curlInput.value = `curl --location --request POST 'https://api.acme-corp.com:8443/api/v1/orders?status=active&page=1' \\
  --header 'Content-Type: application/json' \\
  --header 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature' \\
  --header 'Accept: application/json' \\
  --header 'x-correlation-id: 8f14e45f-ceea-367a-a92e-4427f2d1a3b7' \\
  --header 'x-client-id: mule-order-service' \\
  --data '{"customerId": "CUST-2024-001", "items": [{"sku": "PROD-100", "quantity": 3}]}'`;
    parseAndConvert();
    showToast('Example loaded!');
    if (typeof track_event === 'function') track_event('load_example', { tool: 'curl2mule' });
}
