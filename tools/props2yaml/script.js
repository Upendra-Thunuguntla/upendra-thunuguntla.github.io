/* ══════════════════════════════════════════════
   Props2YAML — Properties → YAML Converter
   ══════════════════════════════════════════════ */

var globalP2yStripValues = false;
var globalP2yOutputMode = 'values';

function p2y_getOutputMode() {
    return globalP2yOutputMode;
}

function p2y_syncOutputMode() {
    document.querySelectorAll('.converter-mode-segmented button[data-output-mode]').forEach(button => {
        const active = button.dataset.outputMode === globalP2yOutputMode;
        button.setAttribute('aria-pressed', String(active));
        button.tabIndex = active ? 0 : -1;
        button.classList.toggle('active', active);
    });
}

function p2y_updateModeOptionVisibility() {
    const outputMode = p2y_getOutputMode();
    document.querySelectorAll('.converter-mode-option[data-visible-modes]').forEach(option => {
        option.hidden = !option.dataset.visibleModes.split(',').includes(outputMode);
    });
}

function p2y_setOutputMode(mode) {
    globalP2yOutputMode = mode;
    p2y_syncOutputMode();
    p2y_updateOptions();
}

function p2y_outputModeKeydown(event) {
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

function p2y_isKeysOnly() {
    return p2y_getOutputMode() === 'keys';
}

function p2y_loadExample() {
    document.getElementById('propTextarea').value = "# MuleSoft application settings\napp.name=orders-api\napp.enabled=true\napp.retry-count=3\napp.optional=null\nmule.home=${MULE_HOME}\nhttp.port:8081\nhttp.base-path=/api\ndatabase.password=![demo-cipher]\nfeatures[0]=inventory\nfeatures[1]=checkout";
    document.getElementById('p2y-separator').value = 'auto';
    document.getElementById('p2y-nest-dotted').checked = true;
    document.getElementById('p2y-array-mode').value = 'auto';
    globalP2yOutputMode = 'values';
    p2y_syncOutputMode();
    document.getElementById('p2y-key-wrapper').value = 'none';
    document.getElementById('p2y-prefix-mode').value = 'encrypted';
    document.getElementById('p2y-custom-prefix').value = '';
    document.getElementById('p2y-value-types').value = 'mulesoft';
    document.getElementById('p2y-sort-keys').checked = false;
    document.getElementById('p2y-preserve-comments').checked = true;
    document.getElementById('filterYaml').value = '';
    globalP2yStripValues = false;
    p2y_updateOptions();
    document.getElementById('prop-file-label').textContent = 'Upload .properties File';
    document.getElementById('propFileInput').value = '';
    p2y_convert();
    track_event('load_example', { tool: 'props2yaml' });
}

function p2y_openFile(event) {
    const file = event.target.files[0]; if (!file) return;
    document.getElementById('prop-file-label').textContent = file.name;
    const reader = new FileReader();
    reader.onload = e => { document.getElementById('propTextarea').value = e.target.result; p2y_convert(); };
    reader.readAsText(file);
    track_event('file_upload', { tool: 'props2yaml', file_type: 'properties' });
}

function p2y_getOption(id, fallback) {
    const control = document.getElementById(id);
    return control ? control.value : fallback;
}

function p2y_isEnabled(id, fallback = false) {
    const control = document.getElementById(id);
    return control ? control.checked : fallback;
}

function p2y_unescape(value) {
    let output = '';
    for (let index = 0; index < value.length; index++) {
        if (value[index] !== '\\' || index === value.length - 1) {
            output += value[index];
            continue;
        }
        const escaped = value[++index];
        if (escaped === 'u' && /^[\da-f]{4}$/i.test(value.slice(index + 1, index + 5))) {
            output += String.fromCharCode(parseInt(value.slice(index + 1, index + 5), 16));
            index += 4;
        } else {
            output += ({ t: '\t', n: '\n', r: '\r', f: '\f' })[escaped] ?? escaped;
        }
    }
    return output;
}

function p2y_parseProperties(input, separatorMode = 'auto') {
    const physicalLines = input.replace(/\r\n?/g, '\n').split('\n');
    const logicalLines = [];
    let pending = '';

    physicalLines.forEach(line => {
        const part = pending ? line.replace(/^\s+/, '') : line;
        pending += part;
        const trailingSlashes = (pending.match(/\\+$/) || [''])[0].length;
        if (trailingSlashes % 2 === 1) {
            pending = pending.slice(0, -1);
        } else {
            logicalLines.push(pending);
            pending = '';
        }
    });
    if (pending) logicalLines.push(pending);

    const entries = [];
    const comments = [];
    logicalLines.forEach(line => {
        const trimmed = line.trimStart();
        if (!trimmed) return;
        if (trimmed.startsWith('#') || trimmed.startsWith('!')) {
            comments.push(trimmed.startsWith('!') ? `# ${trimmed.slice(1).trimStart()}` : trimmed);
            return;
        }
        line = trimmed;

        let separatorIndex = -1;
        let separatorKind = '';
        for (let index = 0; index < line.length; index++) {
            if (line[index] === '\\') {
                index++;
                continue;
            }
            const char = line[index];
            const matches = separatorMode === 'auto'
                ? char === '=' || char === ':' || /\s/.test(char)
                : separatorMode === 'equals' ? char === '='
                    : separatorMode === 'colon' ? char === ':'
                        : /\s/.test(char);
            if (matches) {
                separatorIndex = index;
                separatorKind = /\s/.test(char) ? 'space' : 'symbol';
                break;
            }
        }

        const rawKey = separatorIndex < 0 ? line.trim() : line.slice(0, separatorIndex).trimEnd();
        let valueStart = separatorIndex < 0 ? line.length : separatorIndex + 1;
        if (separatorKind === 'space') {
            while (/\s/.test(line[valueStart] || '')) valueStart++;
            if (line[valueStart] === '=' || line[valueStart] === ':') valueStart++;
        }
        while (/\s/.test(line[valueStart] || '')) valueStart++;

        const key = p2y_unescape(rawKey);
        if (!key) return;
        entries.push({ key, value: p2y_unescape(line.slice(valueStart)) });
    });
    return { entries, comments };
}

function p2y_pathParts(key, nestDotted, indexedArrays) {
    if (!nestDotted) return [key];
    if (!indexedArrays) return key.split('.');
    return (key.match(/[^.[\]]+|\[\d+\]/g) || [key]).map(part => {
        const index = part.match(/^\[(\d+)\]$/);
        return index ? Number(index[1]) : /^\d+$/.test(part) ? Number(part) : part;
    });
}

function p2y_setPath(root, parts, value, key) {
    let current = root;
    for (let index = 0; index < parts.length; index++) {
        const part = parts[index];
        const isArrayIndex = typeof part === 'number';
        if (index === parts.length - 1) {
            if (isArrayIndex) current[part] = value;
            else Object.defineProperty(current, part, { value, enumerable: true, configurable: true, writable: true });
            return;
        }

        const nextIsIndex = typeof parts[index + 1] === 'number';
        const next = Object.prototype.hasOwnProperty.call(current, part) ? current[part] : undefined;
        if (next == null) {
            const child = nextIsIndex ? [] : {};
            if (isArrayIndex) current[part] = child;
            else Object.defineProperty(current, part, { value: child, enumerable: true, configurable: true, writable: true });
        } else if (typeof next !== 'object' || Array.isArray(next) === !nextIsIndex) {
            throw new Error(`Conflicting property paths near "${key}".`);
        }
        current = current[part];
    }
}

function p2y_inferValue(value) {
    if (/^(?:\$\{[^}]*\}|#\[.*\]|!\[[^\]]*\])$/.test(value)) return value;
    if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
    if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) {
        const number = Number(value);
        if (Number.isFinite(number)) return number;
    }
    return value;
}

function p2y_detectIndexedArrays(entries) {
    return entries.some(({ key }) => /(?:\[\d+\]|(?:^|\.)\d+(?:\.|$))/.test(key));
}

function p2y_serializeKey(key) {
    return String(key).replace(/\\/g, '\\\\').replace(/([ :=#!])/g, '\\$1');
}

function p2y_wrapKey(key, prefix = '') {
    const prefixedKey = `${prefix}${key}`;
    const wrapper = p2y_getOption('p2y-key-wrapper', 'none');
    if (wrapper === 'placeholder') return `\${${prefixedKey}}`;
    if (wrapper === 'mule') return `Mule::p("${prefixedKey}")`;
    return `${prefix}${p2y_serializeKey(key)}`;
}

function p2y_wrapEntryKey(entry) {
    const prefixMode = p2y_getOption('p2y-prefix-mode', 'encrypted');
    const customPrefix = p2y_getOption('p2y-custom-prefix', '').trim();
    const prefix = prefixMode === 'all' ? 'secure::'
        : prefixMode === 'custom' ? customPrefix
            : String(entry.value).startsWith('![') ? 'secure::' : '';
    return p2y_wrapKey(entry.key, prefix);
}

function p2y_updatePrefixOptions() {
    const keysOnly = p2y_isKeysOnly();
    const prefixMode = document.getElementById('p2y-prefix-mode');
    const customPrefix = document.getElementById('p2y-custom-prefix');
    prefixMode.disabled = !keysOnly;
    customPrefix.hidden = !keysOnly || prefixMode.value !== 'custom';
    customPrefix.disabled = customPrefix.hidden;
    p2y_convert();
}

function p2y_updateOutputMode() {
    const keysOnly = p2y_isKeysOnly();
    document.getElementById('p2y-output-title').textContent = keysOnly
        ? 'Output: Property keys'
        : globalP2yStripValues ? 'Output: YAML (values stripped)' : 'Output: YAML';
    document.getElementById('p2y-file-extension').textContent = keysOnly ? '.properties' : '.yaml';
    document.getElementById('p2y-save-btn').title = keysOnly ? 'Download property keys' : 'Download YAML';
}

function p2y_updateOptions() {
    const outputMode = p2y_getOutputMode();
    const keysOnly = outputMode === 'keys';
    globalP2yStripValues = outputMode === 'strip';
    p2y_updateModeOptionVisibility();
    document.getElementById('p2y-key-wrapper').disabled = !keysOnly;
    p2y_updatePrefixOptions();
    p2y_updateOutputMode();
    p2y_convert();
}

function p2y_convert() {
    const input = document.getElementById('propTextarea').value;
    const output = document.getElementById('yamlOutput');
    const filter = document.getElementById('filterYaml');
    globalP2yStripValues = p2y_getOutputMode() === 'strip';
    p2y_updateOutputMode();
    if (!input.trim()) {
        output.value = '';
        filter.disabled = true;
        return;
    }
    filter.disabled = false;

    try {
        const parsed = p2y_parseProperties(input, p2y_getOption('p2y-separator', 'auto'));
        const query = filter.value.trim().toLowerCase();
        let entries = parsed.entries.filter(entry => !query || `${entry.key}=${entry.value}`.toLowerCase().includes(query));
        if (p2y_isEnabled('p2y-sort-keys')) entries = entries.sort((left, right) => left.key.localeCompare(right.key));

        const comments = p2y_isEnabled('p2y-preserve-comments', true) ? parsed.comments.join('\n') : '';
        if (p2y_isKeysOnly()) {
            const keys = entries.map(p2y_wrapEntryKey).join('\n');
            output.value = `${comments ? comments + '\n' : ''}${keys || (query ? `# No matching properties found for "${query}"` : '')}`;
            track_event('convert', { tool: 'props2yaml', properties: entries.length, keys_only: true });
            return;
        }

        const root = {};
        const nestDotted = p2y_isEnabled('p2y-nest-dotted', true);
        const arrayMode = p2y_getOption('p2y-array-mode', 'auto');
        const indexedArrays = arrayMode === 'sequence'
            || (arrayMode === 'auto' && p2y_detectIndexedArrays(entries));
        const typeMode = p2y_getOption('p2y-value-types', 'mulesoft');
        entries.forEach(({ key, value }) => {
            const parsedValue = globalP2yStripValues ? '' : typeMode === 'text' ? value : p2y_inferValue(value);
            p2y_setPath(root, p2y_pathParts(key, nestDotted, indexedArrays), parsedValue, key);
        });

        const yaml = entries.length ? jsyaml.dump(root, { indent: 2 }) : '';
        output.value = `${comments ? comments + '\n' : ''}${yaml || (query ? `# No matching properties found for "${query}"` : '')}`;
        track_event('convert', { tool: 'props2yaml', properties: entries.length });
    } catch (e) {
        output.value = `Error: ${e.message}`;
    }
}

function p2y_clear() {
    document.getElementById('propTextarea').value = '';
    document.getElementById('yamlOutput').value = '';
    document.getElementById('filterYaml').value = '';
    document.getElementById('filterYaml').disabled = true;
    document.getElementById('prop-file-label').textContent = 'Upload .properties File';
    document.getElementById('propFileInput').value = '';
    globalP2yOutputMode = 'values';
    p2y_syncOutputMode();
    globalP2yStripValues = false;
    p2y_updateOptions();
}

function p2y_copy() { copyToClipboard(document.getElementById('yamlOutput').value, document.getElementById('p2y-copy-btn')); }

function p2y_downloadPrompt() {
    if (!document.getElementById('yamlOutput').value.trim()) { showToast('Nothing to download!', 'error'); return; }
    document.getElementById('p2y-save-btn').style.display = 'none';
    document.getElementById('p2y-copy-btn').style.display = 'none';
    document.getElementById('p2y-filename-group').style.display = 'flex';
    document.getElementById('p2yFileName').focus();
}

function p2y_cancelDownload() {
    document.getElementById('p2y-save-btn').style.display = 'inline-flex';
    document.getElementById('p2y-copy-btn').style.display = 'inline-flex';
    document.getElementById('p2y-filename-group').style.display = 'none';
    document.getElementById('p2yFileName').value = '';
}

function p2y_doDownload() {
    let name = document.getElementById('p2yFileName').value.trim() || 'config';
    const keysOnly = p2y_isKeysOnly();
    if (keysOnly) {
        if (!name.toLowerCase().endsWith('.properties')) name += '.properties';
    } else if (!name.toLowerCase().endsWith('.yaml') && !name.toLowerCase().endsWith('.yml')) {
        name += '.yaml';
    }
    downloadFile(document.getElementById('yamlOutput').value, name, 'text/plain;charset=utf-8');
    p2y_cancelDownload();
    track_event('download', { tool: 'props2yaml', ext: keysOnly ? '.properties' : '.yaml' });
}
