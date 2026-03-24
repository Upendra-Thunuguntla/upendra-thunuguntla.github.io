/* ══════════════════════════════════════════════
   Secure Properties — Engine (Modernized)
   ══════════════════════════════════════════════ */

let globalMode = 'encrypt';      // encrypt | decrypt
let inputType = 'string';        // string | file | whole-file
let useRandomIV = false;
let fileSource = 'upload';      // upload | paste

function toggleKeyVisibility() {
    const keyInput = document.getElementById('inp-key');
    const eyeIcon = document.getElementById('eye-key');
    if (keyInput.type === 'password') {
        keyInput.type = 'text';
        eyeIcon.classList.replace('fa-eye', 'fa-eye-slash');
        setTimeout(() => {
            if (keyInput.type === 'text') toggleKeyVisibility();
        }, 3000);
    } else {
        keyInput.type = 'password';
        eyeIcon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

/* ─── Initialization ─── */
document.addEventListener('DOMContentLoaded', () => {
    setMode('encrypt');
    setInputType('string');
});

/* ─── Mode Toggles (Encrypt / Decrypt) ─── */
function setMode(m) {
    globalMode = m;
    document.getElementById('mode-encrypt').classList.toggle('active', m === 'encrypt');
    document.getElementById('mode-decrypt').classList.toggle('active', m === 'decrypt');
    
    // Toggle Random Key button (only for encrypt)
    const genBtn = document.getElementById('btn-gen-key');
    if (genBtn) genBtn.style.display = (m === 'encrypt' ? 'block' : 'none');

    const genValBtn = document.getElementById('btn-gen-value');
    if (genValBtn) genValBtn.style.display = (m === 'encrypt' ? 'block' : 'none');

    // Update Run Button
    const runBtn = document.getElementById('btn-run');
    if (runBtn) {
        runBtn.innerHTML = m === 'encrypt' ? '<i class="fas fa-lock"></i> Run Encryption' : '<i class="fas fa-unlock"></i> Run Decryption';
    }
    
    updateCopyVisibility();
    updatePlaceholders();
}

/* ─── Input Type Toggles (String | File | Whole File) ─── */
function setInputType(type) {
    inputType = type;
    
    // Update Tabs UI
    document.querySelectorAll('.type-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.type === type);
    });

    // Toggle containers
    document.getElementById('string-input-container').style.display = (type === 'string') ? 'block' : 'none';
    document.getElementById('source-switcher').style.display = (type === 'string') ? 'none' : 'flex';
    
    if (type === 'string') {
        document.getElementById('upload-container').style.display = 'none';
        document.getElementById('paste-container').style.display = 'none';
    } else {
        setFileSource(fileSource); // Refresh visibility based on current fileSource
    }
    
    updateCopyVisibility();
    updatePlaceholders();
}

function updateCopyVisibility() {
    const wrappedBtn = document.getElementById('btn-copy-wrapped');
    if (wrappedBtn) {
        wrappedBtn.style.display = (globalMode === 'encrypt' && inputType === 'string') ? 'inline-flex' : 'none';
    }
}

function setFileSource(src) {
    fileSource = src;
    document.getElementById('src-upload').classList.toggle('active', src === 'upload');
    document.getElementById('src-paste').classList.toggle('active', src === 'paste');

    document.getElementById('upload-container').style.display = (src === 'upload') ? 'block' : 'none';
    document.getElementById('paste-container').style.display = (src === 'paste') ? 'block' : 'none';
}

function updatePlaceholders() {
    const stringInp = document.getElementById('inp-string');
    const pasteArea = document.getElementById('inp-value');
    
    if (globalMode === 'encrypt') {
        stringInp.placeholder = "Enter value to encrypt...";
        pasteArea.placeholder = "Paste YAML/Properties content here...";
    } else {
        stringInp.placeholder = "![AbC123...] or raw base64";
        pasteArea.placeholder = "Paste content containing ![secrets] to decrypt...";
    }
}

/* ─── Key & Algo Logic ─── */
function onAlgoChange() {
    const algo = document.getElementById('sel-algo').value;
    const modeField = document.getElementById('mode-field');
    const ivRow = document.getElementById('iv-toggle-row');

    if (algo === 'RCA') {
        modeField.style.opacity = '0.35';
        modeField.style.pointerEvents = 'none';
        ivRow.style.opacity = '0.35';
        ivRow.style.pointerEvents = 'none';
    } else {
        modeField.style.opacity = '';
        modeField.style.pointerEvents = '';
        ivRow.style.opacity = '';
        ivRow.style.pointerEvents = '';
    }
    onKeyInput();
}

function onKeyInput() {
    const key = document.getElementById('inp-key').value;
    const algo = document.getElementById('sel-algo').value;
    const info = getKeyInfo(key, algo);
    const hint = document.getElementById('key-hint');
    if (hint) {
        hint.textContent = info.hint;
        hint.className = 'key-hint ' + (info.valid ? 'ok' : 'warn');
    }
}

function toggleIV() {
    useRandomIV = !useRandomIV;
    document.getElementById('iv-toggle-check').checked = useRandomIV;
}

function toggleKeyVisibility() {
    const inp = document.getElementById('inp-key');
    const eye = document.getElementById('eye-key');
    if (inp.type === 'password') {
        inp.type = 'text';
        eye.className = 'fas fa-eye-slash';
        setTimeout(() => {
            inp.type = 'password';
            eye.className = 'fas fa-eye';
        }, 3000);
    } else {
        inp.type = 'password';
        eye.className = 'fas fa-eye';
    }
}

/* ─── Main Execution ─── */
async function runOperation() {
    const key = document.getElementById('inp-key').value;
    const algo = document.getElementById('sel-algo').value;
    const mode_ = document.getElementById('sel-mode').value;
    
    let input = (inputType === 'string') 
        ? document.getElementById('inp-string').value 
        : document.getElementById('inp-value').value;
    
    input = input.trim();

    if (!key) {
        if (typeof showToast === 'function') showToast('Please enter an encryption key', 'error');
        return;
    }
    if (!input) {
        if (typeof showToast === 'function') showToast('Please provide some input', 'error');
        return;
    }

    const runBtn = document.getElementById('btn-run');
    const oldHtml = runBtn.innerHTML;
    runBtn.disabled = true;
    runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        let result = '';
        
        if (inputType === 'string') {
            result = globalMode === 'encrypt' 
                ? await muleEncrypt(input, key, algo, mode_, useRandomIV)
                : await muleDecrypt(input, key, algo, mode_, useRandomIV);
        } 
        else if (inputType === 'whole-file') {
            result = globalMode === 'encrypt'
                ? await muleEncrypt(input, key, algo, mode_, useRandomIV)
                : await muleDecrypt(input, key, algo, mode_, useRandomIV);
        }
        else if (inputType === 'file') {
            // Process YAML/Properties line by line or via regex
            result = await processFileContent(input, key, algo, mode_, useRandomIV, globalMode);
        }

        document.getElementById('result-box').value = result;
        showToast('Success!');
        if (globalMode === 'encrypt') {
            showCopyHint();
        }
    } catch (e) {
        showToast(e.message || 'Operation failed', 'error');
        console.error(e);
    } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = oldHtml;
    }
}

/* ─── File Processor Logic ─── */
async function processFileContent(content, key, algo, encryptMode, randomIV, opMode) {
    if (opMode === 'decrypt') {
        // Find all ![...] and decrypt them
        const regex = /!\[([^\]]+)\]/g;
        const matches = [...content.matchAll(regex)];
        let result = content;
        
        // Process matches in reverse to maintain indices
        for (let i = matches.length - 1; i >= 0; i--) {
            const match = matches[i];
            try {
                const plaintext = await muleDecrypt(match[0], key, algo, encryptMode, randomIV);
                result = result.substring(0, match.index) + plaintext + result.substring(match.index + match[0].length);
            } catch (e) {
                console.warn('Failed to decrypt match:', match[0], e);
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

    for (let line of lines) {
        const trimmed = line.trim();
        // Skip comments, empty lines, and structural lines (YAML - or ---)
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!') || trimmed.startsWith('---') || (trimmed === '-')) {
            processedLines.push(line);
            continue;
        }

        // Try both YAML (key: value) and Properties (key=value)
        // Match key [separator] [optional space] [value]
        const match = line.match(/^(\s*)([^#!=:\s][^=:]*)\s*([=:])\s*(.*)$/);
        
        if (match) {
            const indent = match[1];
            const k = match[2];
            const sep = match[3];
            const v = match[4].trim();
            
            // Skip if it's already a secret or looks like a JSON block starting
            if (v && !v.startsWith('![') && !v.startsWith('{') && !v.startsWith('[')) {
                try {
                    const secret = await muleEncrypt(v, key, algo, encryptMode, randomIV);
                    processedLines.push(`${indent}${k}${sep} ${secret}`);
                    continue;
                } catch(e) {
                    console.error('Encryption failed for line:', line, e);
                }
            }
        }

        processedLines.push(line);
    }
    return processedLines.join('\n');
}

/* ─── File Upload Logic ─── */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('inp-value').value = e.target.result;
        showToast(`Loaded: ${file.name}`);
    };
    reader.readAsText(file);
}

function copyResult(withWrapper = true) {
    let res = document.getElementById('result-box').value;
    if (!res) return;

    if (globalMode === 'encrypt' && inputType === 'string') {
        if (withWrapper) {
            // Add wrapper if missing
            if (!res.startsWith('![')) res = '![' + res + ']';
        } else {
            // Remove wrapper if present
            res = res.replace(/^!\[/, '').replace(/\]$/, '');
        }
    }

    navigator.clipboard.writeText(res).then(() => {
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
    if (!shown && globalMode === 'encrypt' && inputType === 'string') {
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
    
    const ext = (inputType === 'string') ? 'txt' : 'yaml';
    const blob = new Blob([res], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secure_properties_${new Date().getTime()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (typeof showToast === 'function') showToast('File download started');
}

function clearAll() {
    if (document.getElementById('inp-string')) document.getElementById('inp-string').value = '';
    if (document.getElementById('inp-value')) document.getElementById('inp-value').value = '';
    if (document.getElementById('result-box')) document.getElementById('result-box').value = '';
}

function generateRandomKey() {
    const prefixes = ['Mule', 'Anypoint', 'Secure', 'Secret', 'Vault', 'Shadow', 'Frost', 'Iron', 'Zenith', 'Titan'];
    const suffixes = ['Key', 'Prop', 'Node', 'Core', 'Vortex', 'Sentinel', 'Pulse', 'Edge', 'Base', 'Host'];
    
    const pre = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suf = suffixes[Math.floor(Math.random() * suffixes.length)];
    const rand = Math.floor(1000 + Math.random() * 9000);
    const newKey = pre + suf + rand + '!';
    
    const keyInput = document.getElementById('inp-key');
    if (keyInput) {
        keyInput.value = newKey;
        if (keyInput.type === 'password') {
            keyInput.type = 'text';
            setTimeout(() => { if (keyInput.type === 'text') keyInput.type = 'password'; }, 2000);
        }
        onKeyInput();
        if (typeof showToast === 'function') showToast('Random key generated!');
    }
}

function generateRandomValue() {
    const list = ['mulesoft_client_secret', 'anypoint_prod_db_pwd', 'secure_payload_auth', 'api_gateway_internal_key', 'sfdc_org_id_secret', 'aws_access_key_alias'];
    const val = list[Math.floor(Math.random() * list.length)];
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(2))).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const inp = document.getElementById('inp-string');
    if (inp) {
        inp.value = val + '_' + randomHex;
        if (typeof showToast === 'function') showToast('Random value generated!');
    }
}
