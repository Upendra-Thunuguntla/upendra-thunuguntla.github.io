/* ══════════════════════════════════════════════
   YAML2Props — YAML → Properties Converter
   ══════════════════════════════════════════════ */

var globalY2pOp = "";
var globalY2pOutputMode = 'values';
var globalY2pStripValues = false;

function y2p_getOutputMode() {
    return globalY2pOutputMode;
}

function y2p_syncOutputMode() {
    document.querySelectorAll('.converter-mode-segmented button[data-output-mode]').forEach(button => {
        const active = button.dataset.outputMode === globalY2pOutputMode;
        button.setAttribute('aria-pressed', String(active));
        button.tabIndex = active ? 0 : -1;
        button.classList.toggle('active', active);
    });
}

function y2p_updateModeOptionVisibility() {
    const outputMode = y2p_getOutputMode();
    document.querySelectorAll('.converter-mode-option[data-visible-modes]').forEach(option => {
        option.hidden = !option.dataset.visibleModes.split(',').includes(outputMode);
    });
}

function y2p_setOutputMode(mode) {
    globalY2pOutputMode = mode;
    y2p_syncOutputMode();
    y2p_updateOptions();
}

function y2p_outputModeKeydown(event) {
    const buttons = [...event.currentTarget.parentElement.querySelectorAll('button[data-output-mode]')];
    const currentIndex = buttons.indexOf(event.currentTarget);
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % buttons.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[nextIndex].focus();
    buttons[nextIndex].click();
}

function y2p_loadExample() {
    document.getElementById('yamlTextarea').value = "# MuleSoft application settings\napp:\n  name: orders-api\n  enabled: true\n  retry-count: 3\nhttp:\n  port: 8081\n  base-path: /api\nfeatures:\n  - inventory\n  - checkout\ndatabase:\n  password: ![demo-cipher]";
    globalY2pOutputMode = 'values';
    globalY2pStripValues = false;
    y2p_syncOutputMode();
    document.getElementById('keyWrapper').value = 'none';
    document.getElementById('keyWrapper').disabled = true;
    document.getElementById('keyPrefixMode').value = 'encrypted';
    document.getElementById('customKeyPrefix').value = '';
    y2p_updateOptions();
    document.getElementById('propertyDelimiter').value = 'auto';
    document.getElementById('arrayNotation').value = 'auto';
    document.getElementById('sortKeys').checked = false;
    document.getElementById('preserveYamlComments').checked = true;
    document.getElementById('filterProp').value = '';
    document.getElementById('yaml-file-label').textContent = 'Upload .yaml File';
    document.getElementById('yamlFileInput').value = '';
    y2p_convert();
    track_event('load_example', { tool: 'yaml2props' });
}

function y2p_openFile(event) {
    const file = event.target.files[0]; if (!file) return;
    document.getElementById('yaml-file-label').textContent = file.name;
    const reader = new FileReader();
    reader.onload = e => { document.getElementById('yamlTextarea').value = e.target.result; y2p_convert(); };
    reader.readAsText(file);
    track_event('file_upload', { tool: 'yaml2props', file_type: 'yaml' });
}

function y2p_extractComments(input) {
    return input.split(/\r?\n/).filter(line => /^\s*#/.test(line)).map(line => line.trim());
}

function y2p_pathText(parts, notation) {
    return parts.reduce((path, part) => {
        if (typeof part === 'number' && notation === 'bracket') return `${path}[${part}]`;
        return `${path}${path ? '.' : ''}${part}`;
    }, '');
}

function y2p_escapeKey(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/[\t\f]/g, char => char === '\t' ? '\\t' : '\\f')
        .replace(/([ :=#!])/g, '\\$1');
}

function y2p_escapeValue(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\r\n?|\n/g, '\\n')
        .replace(/\t/g, '\\t').replace(/\f/g, '\\f').replace(/^([ \t]+)/, match => match.replace(/ /g, '\\ ').replace(/\t/g, '\\t'));
}

function convertYamlToProperties(yamlData) {
    const normalizedYaml = yamlData.replace(/(:\s*)!\[([^\]\r\n]*)\]/g,
        (_, prefix, encryptedValue) => `${prefix}${JSON.stringify(`![${encryptedValue}]`)}`);
    const data = jsyaml.load(normalizedYaml);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('The YAML document must have a mapping at its root.');
    }

    const keysOnly = y2p_getOutputMode() === 'keys';
    const wrapper = document.getElementById('keyWrapper').value;
    const prefixMode = document.getElementById('keyPrefixMode').value;
    const customPrefix = document.getElementById('customKeyPrefix').value.trim();
    const delimiterMode = document.getElementById('propertyDelimiter').value;
    const delimiter = delimiterMode === 'auto' ? '=' : delimiterMode;
    const notationMode = document.getElementById('arrayNotation').value;
    const notation = notationMode === 'auto' ? 'dot' : notationMode;
    const entries = [];

    function addEntry(parts, value) {
        const originalKey = y2p_pathText(parts, notation);
        if (!originalKey) return;
        const hasEncryptedValue = String(value).startsWith('![');
        const prefix = !keysOnly ? ''
            : prefixMode === 'all' ? 'secure::'
                : prefixMode === 'custom' ? customPrefix
                    : hasEncryptedValue ? 'secure::' : '';
        const key = `${prefix}${originalKey}`;
        const wrappedKey = wrapper === 'placeholder' ? `\${${key}}`
            : wrapper === 'mule' ? `Mule::p("${key}")` : key;
        const serializedKey = wrapper === 'none' ? `${prefix}${y2p_escapeKey(originalKey)}` : wrappedKey;
        entries.push(keysOnly ? serializedKey : `${y2p_escapeKey(originalKey)}${delimiter}${globalY2pStripValues ? '' : y2p_escapeValue(value)}`);
    }

    function visit(value, parts) {
        if (Array.isArray(value)) {
            if (!value.length) addEntry(parts, '');
            else value.forEach((item, index) => visit(item, [...parts, index]));
        } else if (value && typeof value === 'object') {
            const keys = Object.keys(value);
            if (!keys.length) addEntry(parts, '');
            else keys.forEach(key => visit(value[key], [...parts, key]));
        } else {
            addEntry(parts, value === null ? 'null' : value);
        }
    }

    Object.keys(data).forEach(key => visit(data[key], [key]));
    if (document.getElementById('sortKeys').checked) {
        entries.sort((left, right) => left.localeCompare(right));
    }
    return entries.join('\n');
}

function y2p_updatePrefixOptions() {
    const keysOnly = y2p_getOutputMode() === 'keys';
    const prefixMode = document.getElementById('keyPrefixMode');
    const customPrefix = document.getElementById('customKeyPrefix');
    prefixMode.disabled = !keysOnly;
    customPrefix.hidden = !keysOnly || prefixMode.value !== 'custom';
    customPrefix.disabled = customPrefix.hidden;
    y2p_convert();
}

function y2p_updateOptions() {
    const outputMode = y2p_getOutputMode();
    const keysOnly = outputMode === 'keys';
    globalY2pStripValues = outputMode === 'strip';
    y2p_updateModeOptionVisibility();
    document.getElementById('keyWrapper').disabled = !keysOnly;
    y2p_updatePrefixOptions();
    y2p_convert();
}

function y2p_convert() {
    const yamlInput = document.getElementById('yamlTextarea').value.trim();
    const outputMode = y2p_getOutputMode();
    const keysOnly = outputMode === 'keys';
    globalY2pStripValues = outputMode === 'strip';
    document.getElementById('y2p-output-title').textContent = keysOnly ? 'Output: Property keys'
        : globalY2pStripValues ? 'Output: Properties (values stripped)' : 'Output: Properties';
    if (!yamlInput) {
        document.getElementById('propertiesOutput').value = '';
        document.getElementById('filterProp').disabled = true;
        globalY2pOp = '';
        return;
    }
    try {
        const converted = convertYamlToProperties(yamlInput);
        const comments = document.getElementById('preserveYamlComments').checked
            ? y2p_extractComments(yamlInput).join('\n') : '';
        const op = `${comments ? comments + '\n' : ''}${converted}`;
        document.getElementById('propertiesOutput').value = op;
        document.getElementById('filterProp').disabled = false;
        globalY2pOp = op;
        track_event('convert', { tool: 'yaml2props', keys_only: keysOnly, strip_values: globalY2pStripValues });
    } catch (e) {
        document.getElementById('propertiesOutput').value = `Error: ${e.message}`;
        document.getElementById('filterProp').disabled = true;
        globalY2pOp = '';
    }
}

function y2p_filter(q) {
    if (!q) { document.getElementById('propertiesOutput').value = globalY2pOp; return; }
    const lines = globalY2pOp.split("\n").filter(l => l.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('propertiesOutput').value = lines.join("\n");
}

function y2p_clear() {
    document.getElementById('yamlTextarea').value = '';
    document.getElementById('propertiesOutput').value = '';
    document.getElementById('filterProp').disabled = true;
    document.getElementById('filterProp').value = '';
    document.getElementById('yaml-file-label').textContent = 'Upload .yaml File';
    document.getElementById('yamlFileInput').value = '';
    document.getElementById('y2p-filename-group').style.display = 'none';
    globalY2pOutputMode = 'values';
    globalY2pStripValues = false;
    y2p_syncOutputMode();
    y2p_updateOptions();
    globalY2pOp = '';
}

function y2p_copy() { copyToClipboard(document.getElementById('propertiesOutput').value, document.getElementById('y2p-copy-btn')); }

function y2p_downloadPrompt() {
    if (!document.getElementById('propertiesOutput').value.trim()) { showToast('Nothing to download!', 'error'); return; }
    document.getElementById('y2p-save-btn').style.display = 'none';
    document.getElementById('y2p-copy-btn').style.display = 'none';
    document.getElementById('y2p-filename-group').style.display = 'flex';
    document.getElementById('y2pFileName').focus();
}

function y2p_cancelDownload() {
    document.getElementById('y2p-save-btn').style.display = 'inline-flex';
    document.getElementById('y2p-copy-btn').style.display = 'inline-flex';
    document.getElementById('y2p-filename-group').style.display = 'none';
    document.getElementById('y2pFileName').value = '';
}

function y2p_doDownload() {
    let name = document.getElementById('y2pFileName').value.trim() || 'mule-config';
    if (!name.toLowerCase().endsWith('.properties')) {
        name += '.properties';
    }
    downloadFile(document.getElementById('propertiesOutput').value, name, 'text/plain;charset=utf-8');
    y2p_cancelDownload();
    track_event('download', { tool: 'yaml2props', ext: '.properties' });
}
