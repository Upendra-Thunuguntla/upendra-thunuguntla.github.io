/* ══════════════════════════════════════════════
   Secure Properties Generator — Encrypt/Decrypt
   ══════════════════════════════════════════════ */

// ─── State ─────────────────────────────────────────────────────────────────
let mode = 'encrypt';
let useRandomIV = false;

// ─── Mode switching ─────────────────────────────────────────────────────────
function setMode(m) {
    mode = m;
    document.getElementById('tab-encrypt').className = m === 'encrypt' ? 'btn btn-primary' : 'btn btn-outline';
    document.getElementById('tab-decrypt').className = m === 'decrypt' ? 'btn btn-primary' : 'btn btn-outline';

    document.getElementById('inp-label').textContent = m === 'encrypt' ? 'Plain Value' : 'Encrypted Value (with or without ![ ])';
    document.getElementById('inp-value').placeholder = m === 'encrypt' ? 'Enter value to encrypt...' : '![AbC123...] or raw base64';

    document.getElementById('btn-run-icon').className = 'fas fa-arrow-right';
    document.getElementById('btn-run').title = m === 'encrypt' ? 'Encrypt' : 'Decrypt';
    document.getElementById('btn-run-text').textContent = m === 'encrypt' ? ' Encrypt' : ' Decrypt';

    clearResult();
    validateForm();
}

// ─── Algorithm change ───────────────────────────────────────────────────────
function onAlgoChange() {
    const algo = document.getElementById('sel-algo').value;
    const modeField = document.getElementById('mode-field');
    const ivRow = document.getElementById('iv-toggle-row');

    // RC4 is a stream cipher: no mode, no IV
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

    // Highlight active algo tag
    document.querySelectorAll('.algo-tag').forEach(t => {
        const tagAlgo = t.dataset.algo;
        const matches = tagAlgo === algo || (tagAlgo === 'RCA' && algo === 'RCA');
        t.classList.toggle('active-algo', matches);
    });

    onKeyInput();
    clearResult();
    validateForm();
}

// ─── Key input ──────────────────────────────────────────────────────────────
function onKeyInput() {
    const key = document.getElementById('inp-key').value;
    const algo = document.getElementById('sel-algo').value;
    const info = getKeyInfo(key, algo);
    const hint = document.getElementById('key-hint');
    hint.textContent = info.hint;
    hint.className = 'key-hint ' + (info.valid ? 'ok' : 'warn');
    validateForm();
}

// ─── IV toggle ──────────────────────────────────────────────────────────────
function toggleIV() {
    useRandomIV = !useRandomIV;
    document.getElementById('iv-toggle-check').checked = useRandomIV;
    clearResult();
}

// ─── Validation ─────────────────────────────────────────────────────────────
function validateForm() {
    const key = document.getElementById('inp-key').value.trim();
    const value = document.getElementById('inp-value').value.trim();
    const algo = document.getElementById('sel-algo').value;
    const info = getKeyInfo(key, algo);
    const ok = info.valid && value.length > 0;
    document.getElementById('btn-run').disabled = !ok;
}

// ─── Clear result ───────────────────────────────────────────────────────────
function clearResult() {
    document.getElementById('result-box').value = '';
    document.getElementById('result-note').textContent = '';
    document.getElementById('error-box').style.display = 'none';
    document.getElementById('error-box').textContent = '';
}

// ─── Main operation ─────────────────────────────────────────────────────────
async function runOp() {
    const key = document.getElementById('inp-key').value;
    const value = document.getElementById('inp-value').value.trim();
    const algo = document.getElementById('sel-algo').value;
    const mode_ = document.getElementById('sel-mode').value;

    clearResult();

    const btn = document.getElementById('btn-run');
    btn.disabled = true;
    document.getElementById('btn-run-icon').className = 'fas fa-spinner fa-spin';

    try {
        let result;
        if (mode === 'encrypt') {
            result = await muleEncrypt(value, key, algo, mode_, useRandomIV);
        } else {
            result = await muleDecrypt(value, key, algo, mode_, useRandomIV);
        }

        document.getElementById('result-box').value = result;
        document.getElementById('result-note').textContent = mode === 'encrypt' ? '↳ Ready to paste into your .yaml or .properties file' : '';
        track_event('convert', { tool: 'secure_props', mode: mode, algo: algo });
    } catch (e) {
        const errBox = document.getElementById('error-box');
        errBox.textContent = '✕ ' + (e.message || 'Operation failed. Check key and input.');
        errBox.style.display = 'block';
    } finally {
        btn.disabled = false;
        document.getElementById('btn-run-icon').className = 'fas fa-arrow-right';
    }
}

// ─── Copy ───────────────────────────────────────────────────────────────────
function copyResult() {
    copyToClipboard(document.getElementById('result-box').value, document.getElementById('btn-copy'));
}

// Initial setup
validateForm();
onAlgoChange();
