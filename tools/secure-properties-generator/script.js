/* ══════════════════════════════════════════════
   Secure Properties — Engine (Modernized)
   ══════════════════════════════════════════════ */

const initialToolState = {
    mode: 'encrypt',
    inputType: 'string',
    fileSource: 'paste',
    useRandomIV: false,
    status: 'idle'
};
let toolState = { ...initialToolState };
let keyVisibilityTimeout = null;
let fileReadToken = 0;

function reduceToolState(state, action) {
    if (state.status === 'running' && action.type !== 'operation-succeeded' &&
        action.type !== 'operation-failed') return state;

    switch (action.type) {
        case 'mode-changed':
            if (!['encrypt', 'decrypt'].includes(action.mode) || state.mode === action.mode) return state;
            return { ...state, mode: action.mode };
        case 'input-type-changed':
            if (!['string', 'file', 'whole-file'].includes(action.inputType) ||
                state.inputType === action.inputType) return state;
            return { ...state, inputType: action.inputType };
        case 'file-source-changed':
            if (!['upload', 'paste'].includes(action.fileSource) ||
                state.fileSource === action.fileSource) return state;
            return { ...state, fileSource: action.fileSource };
        case 'random-iv-changed':
            if (state.useRandomIV === action.enabled) return state;
            return { ...state, useRandomIV: action.enabled };
        case 'operation-started':
            if (state.status === 'running' || !['encrypt', 'decrypt'].includes(action.mode)) return state;
            return { ...state, mode: action.mode, status: 'running' };
        case 'operation-succeeded':
        case 'operation-failed':
            if (state.status !== 'running') return state;
            return { ...state, status: action.type === 'operation-succeeded' ? 'succeeded' : 'failed' };
        default:
            return state;
    }
}

function transitionToolState(action) {
    const nextState = reduceToolState(toolState, action);
    if (nextState === toolState) return false;
    toolState = nextState;
    renderToolState();
    return true;
}

/* ─── Initialization ─── */
document.addEventListener('DOMContentLoaded', () => {
    renderToolState();

    document.getElementById('inp-value').addEventListener('input', () => {
        fileReadToken++;
    });
    document.getElementById('iv-toggle-check').addEventListener('change', (event) => {
        setRandomIV(event.target.checked);
    });

    // Auto-trim spaces on key input blur event
    const keyInput = document.getElementById('inp-key');
    if (keyInput) {
        keyInput.addEventListener('blur', (e) => {
            e.target.value = e.target.value.trim();
            onKeyInput();
        });
    }
});

/* ─── Mode Toggles (Encrypt / Decrypt) ─── */
function setMode(mode) {
    transitionToolState({ type: 'mode-changed', mode });
}

/* ─── Input Type Toggles (String | File | Whole File) ─── */
function setInputType(inputType) {
    transitionToolState({ type: 'input-type-changed', inputType });
}

function setFileSource(fileSource) {
    transitionToolState({ type: 'file-source-changed', fileSource });
}

function setRandomIV(enabled) {
    transitionToolState({ type: 'random-iv-changed', enabled: Boolean(enabled) });
}

function renderToolState() {
    const isBusy = toolState.status === 'running';
    const isStringInput = toolState.inputType === 'string';
    const isRca = document.getElementById('sel-algo').value === 'RCA';

    document.querySelectorAll('.type-tab').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.type === toolState.inputType);
    });
    document.getElementById('string-input-container').style.display = isStringInput ? 'block' : 'none';
    document.getElementById('source-switcher').style.display = isStringInput ? 'none' : 'flex';
    document.getElementById('upload-container').style.display =
        !isStringInput && toolState.fileSource === 'upload' ? 'block' : 'none';
    document.getElementById('paste-container').style.display =
        !isStringInput && toolState.fileSource === 'paste' ? 'block' : 'none';
    document.getElementById('src-upload').classList.toggle('active', toolState.fileSource === 'upload');
    document.getElementById('src-paste').classList.toggle('active', toolState.fileSource === 'paste');

    const generateKeyButton = document.getElementById('btn-gen-key');
    const generateValueButton = document.getElementById('btn-gen-value');
    if (generateKeyButton) generateKeyButton.style.display = toolState.mode === 'encrypt' ? 'block' : 'none';
    if (generateValueButton) generateValueButton.style.display = toolState.mode === 'encrypt' ? 'block' : 'none';

    const wrappedButton = document.getElementById('btn-copy-wrapped');
    if (wrappedButton) {
        wrappedButton.style.display =
            toolState.mode === 'encrypt' && isStringInput ? 'inline-flex' : 'none';
    }
    document.getElementById('inp-string').placeholder = toolState.mode === 'encrypt'
        ? 'Enter value to encrypt...'
        : '![AbC123...] or raw base64';
    document.getElementById('inp-value').placeholder = toolState.mode === 'encrypt'
        ? 'Paste YAML/Properties content here...'
        : 'Paste content containing ![secrets] to decrypt...';

    const modeField = document.getElementById('mode-field');
    const ivRow = document.getElementById('iv-toggle-row');
    const modeSelect = document.getElementById('sel-mode');
    const ivCheckbox = document.getElementById('iv-toggle-check');
    modeField.style.opacity = isRca ? '0.35' : '';
    modeField.style.pointerEvents = isRca ? 'none' : '';
    ivRow.style.opacity = isRca ? '0.35' : '';
    ivRow.style.pointerEvents = isRca ? 'none' : '';
    ivCheckbox.checked = toolState.useRandomIV;

    document.querySelectorAll(
        '.config-card button, .config-card input, .config-card select, .type-tabs button, ' +
        '.source-toggle button, #string-input-container input, #string-input-container button, ' +
        '#upload-container input, #paste-container textarea, #paste-container button, .operation-actions button'
    ).forEach((control) => {
        control.disabled = isBusy;
    });
    modeSelect.disabled = isBusy || isRca;
    ivCheckbox.disabled = isBusy || isRca;
    document.getElementById('workspace').setAttribute('aria-busy', String(isBusy));
}

/* ─── Key & Algo Logic ─── */
function onAlgoChange() {
    renderToolState();
    onKeyInput();
}

function onKeyInput() {
    if (window.savedKeys) window.savedKeys.sync();
    const key = document.getElementById('inp-key').value.trim();
    const algo = document.getElementById('sel-algo').value;
    const info = getKeyInfo(key, algo);
    const hint = document.getElementById('key-hint');
    if (hint) {
        hint.textContent = info.hint;
        hint.className = 'key-hint ' + (info.valid ? 'ok' : 'warn');
    }
}

function toggleKeyVisibility() {
    const inp = document.getElementById('inp-key');
    if (toolState.status === 'running') return;
    setKeyVisibility(inp.type === 'password');
}

function setKeyVisibility(visible) {
    const inp = document.getElementById('inp-key');
    const eye = document.getElementById('eye-key');
    if (keyVisibilityTimeout !== null) {
        clearTimeout(keyVisibilityTimeout);
        keyVisibilityTimeout = null;
    }
    inp.type = visible ? 'text' : 'password';
    if (eye) {
        eye.classList.toggle('fa-eye', !visible);
        eye.classList.toggle('fa-eye-slash', visible);
    }
    if (visible) keyVisibilityTimeout = setTimeout(() => setKeyVisibility(false), 5000);
}

/* ─── Main Execution ─── */
async function runOperation(operation) {
    if (toolState.status === 'running') return;
    if (!['encrypt', 'decrypt'].includes(operation)) return;

    const snapshot = {
        mode: operation,
        inputType: toolState.inputType,
        useRandomIV: toolState.useRandomIV,
        key: document.getElementById('inp-key').value.trim(),
        algorithm: document.getElementById('sel-algo').value,
        cipherMode: document.getElementById('sel-mode').value
    };
    let input = snapshot.inputType === 'string'
        ? document.getElementById('inp-string').value
        : document.getElementById('inp-value').value;
    
    input = input.trim();

    if (!snapshot.key) {
        if (typeof showToast === 'function') showToast('Please enter an encryption key', 'error');
        return;
    }
    if (!input) {
        if (typeof showToast === 'function') showToast('Please provide some input', 'error');
        return;
    }

    const runBtn = document.getElementById(`mode-${snapshot.mode}`);
    const oldHtml = runBtn.innerHTML;
    if (!transitionToolState({ type: 'operation-started', mode: snapshot.mode })) return;
    runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        let result;
        if (snapshot.inputType === 'file') {
            result = await processFileContent(
                input, snapshot.key, snapshot.algorithm, snapshot.cipherMode,
                snapshot.useRandomIV, snapshot.mode
            );
        } else {
            const cipher = snapshot.mode === 'encrypt' ? muleEncrypt : muleDecrypt;
            result = await cipher(
                input, snapshot.key, snapshot.algorithm, snapshot.cipherMode, snapshot.useRandomIV
            );
        }

        document.getElementById('result-box').value = result;
        transitionToolState({ type: 'operation-succeeded' });
        if (typeof track_event === 'function') track_event(snapshot.mode);
        if (typeof showToast === 'function') showToast('Success!');
        if (snapshot.mode === 'encrypt') {
            showCopyHint();
        }
    } catch (e) {
        transitionToolState({ type: 'operation-failed' });
        if (typeof showToast === 'function') showToast(e.message || 'Operation failed', 'error');
        console.error(e);
    } finally {
        runBtn.innerHTML = oldHtml;
    }
}

/* ─── File Processor Logic ─── */
async function processFileContent(content, key, algo, encryptMode, randomIV, opMode) {
    if (opMode === 'decrypt') {
        const regex = /!\[([^\]]+)\]/g;
        const matches = [...content.matchAll(regex)];
        if (matches.length === 0) {
            throw new Error('No encrypted patterns (![...]) found in the input.');
        }

        let result = content;
        let failCount = 0;
        let successCount = 0;
        
        // Process matches in reverse to maintain indices
        for (let i = matches.length - 1; i >= 0; i--) {
            const match = matches[i];
            try {
                const plaintext = await muleDecrypt(match[0], key, algo, encryptMode, randomIV);
                result = result.substring(0, match.index) + plaintext + result.substring(match.index + match[0].length);
                successCount++;
            } catch (e) {
                failCount++;
                console.warn('Failed to decrypt match:', match[0], e);
            }
        }

        if (failCount > 0 && successCount === 0) {
            throw new Error('Decryption failed for all encrypted patterns. Check your security key and algorithm.');
        } else if (failCount > 0) {
            if (typeof showToast === 'function') {
                showToast(`Decrypted ${successCount} secrets, ${failCount} failed.`, 'warning');
            }
        }
        return result;
    } else {
        // Encrypt Mode: Identify values and encrypt them.
        // This is tricky. We'll support standard properties and simple YAML.
        return await encryptAllValues(content, key, algo, encryptMode, randomIV);
    }
}

async function encryptAllValues(content, key, algo, encryptMode, randomIV) {
    const lines = content.split('\n');
    const processedLines = [];
    let successCount = 0;
    let failCount = 0;
    let attemptedCount = 0;

    for (let line of lines) {
        const trimmed = line.trim();
        // Skip comments, empty lines, and structural lines (YAML - or ---)
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!') || trimmed.startsWith('---') || (trimmed === '-')) {
            processedLines.push(line);
            continue;
        }

        // Try both YAML (key: value) and Properties (key=value)
        // Match key [separator] [optional space] [value]
        const match = line.match(/^(\s*)([^#!=:\s][^=:]*?)(\s*[=:]\s*)(.*)$/);
        
        if (match) {
            const indent = match[1];
            const k = match[2];
            const sep = match[3];
            const rawValue = match[4];
            const v = rawValue.trim();
            const trailingWhitespace = rawValue.slice(v.length);
            
            // Skip if it's already a secret or looks like a JSON block starting
            if (v && !v.startsWith('![') && !v.startsWith('{') && !v.startsWith('[')) {
                attemptedCount++;
                try {
                    const secret = await muleEncrypt(v, key, algo, encryptMode, randomIV);
                    // Encrypted values in the file MUST be wrapped in ![] wrapper
                    processedLines.push(`${indent}${k}${sep}![${secret}]${trailingWhitespace}`);
                    successCount++;
                    continue;
                } catch(e) {
                    failCount++;
                    console.error('Encryption failed for line:', line, e);
                }
            }
        }

        processedLines.push(line);
    }

    if (attemptedCount > 0 && successCount === 0) {
        throw new Error('Encryption failed for all values. Check your key and configuration.');
    } else if (failCount > 0) {
        if (typeof showToast === 'function') {
            showToast(`Encrypted ${successCount} values, ${failCount} failed.`, 'warning');
        }
    }

    return processedLines.join('\n');
}

/* ─── File Upload Logic ─── */
function handleFileUpload(event) {
    if (toolState.status === 'running') return;
    const file = event.target.files[0];
    if (!file) return;

    const requestToken = ++fileReadToken;
    const reader = new FileReader();
    reader.onload = (e) => {
        if (requestToken !== fileReadToken) return;
        document.getElementById('inp-value').value = e.target.result;
        showToast(`Loaded: ${file.name}`);
    };
    reader.onerror = () => {
        if (requestToken !== fileReadToken) return;
        if (typeof showToast === 'function') showToast(`Could not read ${file.name}.`, 'error');
    };
    reader.readAsText(file);
}

function copyResult(withWrapper = true) {
    let res = document.getElementById('result-box').value;
    if (!res) return;

    if (toolState.mode === 'encrypt' && toolState.inputType === 'string') {
        if (withWrapper) {
            // Add wrapper if missing
            if (!res.startsWith('![')) res = '![' + res + ']';
        } else {
            // Remove wrapper if present
            res = res.replace(/^!\[/, '').replace(/\]$/, '');
        }
    }

    navigator.clipboard.writeText(res).then(() => {
        if (typeof track_event === 'function') track_event('copy');
        if (withWrapper) sessionStorage.setItem('wrapped_hint_shown', 'true');
        hideCopyHint();

        if (typeof showToast === 'function') {
            showToast(withWrapper ? 'Copied with ![ ]' : 'Copied to clipboard');
        }
    });
}

function showCopyHint() {
    const hint = document.getElementById('wrapped-copy-hint');
    if (!hint) return;
    const shown = sessionStorage.getItem('wrapped_hint_shown');
    if (!shown && toolState.mode === 'encrypt' && toolState.inputType === 'string') {
        hint.style.display = 'block';
    }
}

function hideCopyHint() {
    const hint = document.getElementById('wrapped-copy-hint');
    if (hint) hint.style.display = 'none';
}

function downloadResult() {
    const res = document.getElementById('result-box').value;
    if (!res) {
        if (typeof showToast === 'function') showToast('No result to download', 'error');
        return;
    }
    
    const ext = (toolState.inputType === 'string') ? 'txt' : 'yaml';
    const blob = new Blob([res], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secure_properties_${new Date().getTime()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof track_event === 'function') track_event('download');
    
    if (typeof showToast === 'function') showToast('File download started');
}

function clearAll() {
    if (toolState.status === 'running') return;
    fileReadToken++;
    if (document.getElementById('inp-string')) document.getElementById('inp-string').value = '';
    if (document.getElementById('inp-value')) document.getElementById('inp-value').value = '';
    if (document.getElementById('file-upload')) document.getElementById('file-upload').value = '';
    if (document.getElementById('result-box')) document.getElementById('result-box').value = '';
    if (typeof track_event === 'function') track_event('clear');
}

function generateRandomKey() {
    if (toolState.status === 'running') return;
    const prefixes = ['Mule', 'Anypoint', 'Secure', 'Secret', 'Vault', 'Shadow', 'Frost', 'Iron', 'Zenith', 'Titan'];
    const suffixes = ['Key', 'Prop', 'Node', 'Core', 'Vortex', 'Sentinel', 'Pulse', 'Edge', 'Base', 'Host'];
    
    const pre = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suf = suffixes[Math.floor(Math.random() * suffixes.length)];
    const rand = Math.floor(1000 + Math.random() * 9000);
    const newKey = pre + suf + rand + '!';
    
    const keyInput = document.getElementById('inp-key');
    if (keyInput) {
        keyInput.value = newKey;
        setKeyVisibility(true);
        onKeyInput();
        if (typeof showToast === 'function') showToast('Random key generated!');
    }
}

function generateRandomValue() {
    if (toolState.status === 'running') return;
    const list = ['mulesoft_client_secret', 'anypoint_prod_db_pwd', 'secure_payload_auth', 'api_gateway_internal_key', 'sfdc_org_id_secret', 'aws_access_key_alias'];
    const val = list[Math.floor(Math.random() * list.length)];
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(2))).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const inp = document.getElementById('inp-string');
    if (inp) {
        inp.value = val + '_' + randomHex;
        if (typeof showToast === 'function') showToast('Random value generated!');
    }
}
