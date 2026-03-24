/* ══════════════════════════════════════════════
   JSON2RAML — JSON → RAML DataType Converter
   ══════════════════════════════════════════════ */

const TAB = "  ";
const LE = "\n";
const RAML_HEADER = "#%RAML 1.0 DataType" + LE;

function loadExample() {
    document.getElementById('json-input').value = '{\n  "string": "Hello, World!",\n  "number": 42,\n  "boolean": true,\n  "nullValue": null,\n  "array": [1, 2, 3],\n  "object": {\n    "nested": "value"\n  }\n}';
    track_event('load_example', { tool: 'json2raml' });
}

function clearContents() {
    document.getElementById('json-input').value = '';
    document.getElementById('raml-output').value = '';
    document.getElementById('filename-wrap').style.display = 'none';
    track_event('clear', { tool: 'json2raml' });
}

function loadJSONFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        document.getElementById('json-input').value = e.target.result;
        convert();
        track_event('upload_file', { tool: 'json2raml' });
    };
    reader.readAsText(file);
}

function convert() {
    const keysOptional = document.getElementById('areKeysOptional').checked;
    const keysCamelCased = document.getElementById('areKeysCamelCased').checked;
    const input = document.getElementById('json-input').value.trim();
    const output = document.getElementById('raml-output');

    if (!input) { output.value = ""; return; }
    let parsed;
    try { parsed = JSON.parse(input); } catch (e) { output.value = "❌ Invalid JSON — please check your input.\n\n" + e.message; return; }

    const result = RAML_HEADER + buildRoot(parsed, keysOptional, keysCamelCased);
    output.value = result.replace("\n\n", "\n");
    track_event('convert', {
        tool: 'json2raml',
        input_length: input.length,
        keys_optional: keysOptional,
        keys_camelcase: keysCamelCased,
        success: true,
    });
}

function buildRoot(obj, opt, cc) {
    if (Array.isArray(obj)) return "type: array" + LE + "items:" + LE + buildArray(true, obj, 1, opt, cc);
    if (typeof obj === 'object' && obj !== null) return "type: object" + LE + "properties:" + LE + buildObject(true, obj, 1, opt, cc);
    return "type: " + typeof obj + LE;
}

function buildObject(isRoot, obj, level, opt, cc) {
    let out = "";
    if (!isRoot) { level++; out = getTabs(level) + "properties:"; }
    level++;
    for (const key in obj) {
        out += LE + getTabs(level) + getElementType(key, obj[key], level, opt, cc);
    }
    return out;
}

function buildArray(isRoot, arr, level, opt, cc) {
    let out = "";
    if (arr.length > 0) {
        if (!isRoot) { level++; out = getTabs(level) + "items:"; }
        level++;
        out += LE + getTabs(level) + getElementType(null, arr[0], level, opt, cc);
    } else if (!isRoot) {
        out = getTabs(++level) + "type: array" + LE;
    }
    return out;
}

function getElementType(key, val, level, opt, cc) {
    if (cc && key) key = v.camelCase(key);
    if (opt && key) key = key + "?";
    key = key === null ? "type" : key;
    if (Array.isArray(val)) return key + ": " + LE + buildArray(false, val, level, opt, cc);
    if (val === null) return key + ": nil";
    if (typeof val === 'object') return key + ":" + LE + buildObject(false, val, level, opt, cc);
    if (typeof val === 'string') return key + ": string";
    if (typeof val === 'number') return key + ": number";
    if (typeof val === 'boolean') return key + ": boolean";
    return key + ": any";
}

function getTabs(n) { return TAB.repeat(n); }

function copyResult() {
    const val = document.getElementById('raml-output').value;
    if (val) track_event('copy', { tool: 'json2raml', content_type: 'raml' });
    copyToClipboard(val, document.getElementById('copy-btn'));
}

function downloadRAML() {
    const val = document.getElementById('raml-output').value;
    if (!val || !val.startsWith(RAML_HEADER)) { showToast('Please convert first!', 'error'); return; }
    const wrap = document.getElementById('filename-wrap');
    if (wrap.style.display === 'none') { wrap.style.display = 'block'; document.getElementById('raml-filename').focus(); }
    else doDownload();
}

function doDownload() {
    const name = (document.getElementById('raml-filename').value || 'datatype').trim();
    const content = document.getElementById('raml-output').value;
    if (!content.startsWith(RAML_HEADER)) { showToast('Nothing to download!', 'error'); return; }
    downloadFile(content, name + '.raml', 'text/plain;charset=utf-8');
    track_event('download', { tool: 'json2raml', file_type: 'raml', filename: name });
}
