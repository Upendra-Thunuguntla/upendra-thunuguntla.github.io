/* ══════════════════════════════════════════════
   Base64 Encoder & Decoder - Client-Side Engine
   ══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Element Selectors
    const sourceEl = document.getElementById('text-input');
    const resultEl = document.getElementById('text-output');
    const modeEncodeBtn = document.getElementById('mode-encode');
    const modeDecodeBtn = document.getElementById('mode-decode');
    const encodingSel = document.getElementById('sel-encoding');
    const urlSafeCheck = document.getElementById('check-urlsafe');
    const paddingCheck = document.getElementById('check-padding');
    const paddingSwitchRow = document.getElementById('padding-switch-row');
    const wrapSel = document.getElementById('sel-wrap');
    const formatOptionsCol = document.getElementById('format-options-col');
    const formatLabel = document.getElementById('format-label');
    const fileUploadEl = document.getElementById('file-upload');
    const fileNameDisplay = document.getElementById('file-name-display');

    // UI state
    let activeMode = 'encode'; // 'encode' or 'decode'
    let inputType = 'text'; // 'text' or 'file'
    let loadedFileName = '';

    // Initialize inputs
    if (sourceEl) {
        sourceEl.addEventListener('input', debounce(processData, 200));
    }

    // Export variables/functions to window for index.html onclick handlers
    window.setMode = function(mode) {
        if (activeMode === mode) return;
        activeMode = mode;

        if (mode === 'encode') {
            modeEncodeBtn.classList.add('active');
            modeDecodeBtn.classList.remove('active');
            
            // Show wrap select, hide strip padding
            wrapSel.style.display = 'block';
            paddingSwitchRow.style.display = 'none';
            formatLabel.textContent = 'Output Formatting';
            
            sourceEl.placeholder = 'Paste clear text here...';
        } else {
            modeEncodeBtn.classList.remove('active');
            modeDecodeBtn.classList.add('active');
            
            // Hide wrap select, show strip padding (if urlSafe or always, let's keep it visible for flexibility in decode mode)
            wrapSel.style.display = 'none';
            paddingSwitchRow.style.display = 'flex';
            formatLabel.textContent = 'Decoding Options';
            
            sourceEl.placeholder = 'Paste Base64 encoded string here...';
        }
        
        // Clear outputs and re-process
        processData();
    };

    window.setInputType = function(type) {
        if (inputType === type) return;
        inputType = type;

        const tabText = document.getElementById('tab-text');
        const tabFile = document.getElementById('tab-file');
        const wrapperText = document.getElementById('text-input-wrapper');
        const wrapperFile = document.getElementById('file-input-wrapper');

        if (type === 'text') {
            tabText.classList.add('active');
            tabFile.classList.remove('active');
            wrapperText.style.display = 'block';
            wrapperFile.style.display = 'none';
        } else {
            tabText.classList.remove('active');
            tabFile.classList.add('active');
            wrapperText.style.display = 'none';
            wrapperFile.style.display = 'block';
        }
        processData();
    };

    window.toggleUrlSafe = function() {
        // Handled by the checkbox change event or direct click
        // To make sure checkbox clicks register correctly, we only trigger processData
    };
    
    window.onUrlSafeChange = function(event) {
        // Strip padding is relevant if urlSafe is checked, or when decoding
        if (activeMode === 'encode') {
            if (event.target.checked) {
                paddingSwitchRow.style.display = 'flex';
            } else {
                paddingSwitchRow.style.display = 'none';
            }
        }
        processData();
    };

    window.togglePadding = function() {
        // Process data will fetch the checkbox state directly
    };

    // 2. Main Logic Execution
    function processData() {
        const rawValue = sourceEl.value;
        const selectedEncoding = encodingSel.value;
        const useUrlSafe = urlSafeCheck.checked;
        const shouldStripPadding = paddingCheck.checked;
        const wrapLen = wrapSel.value;

        // Reset stats if empty
        if (!rawValue && inputType === 'text') {
            resultEl.value = '';
            updateStats(0, 0, 0, 0, 0, 'Ready');
            return;
        }

        try {
            let processed = '';
            let inputByteSize = 0;
            let outputByteSize = 0;
            let validity = 'Ready';

            if (activeMode === 'encode') {
                validity = 'Encoding';
                // Estimate input size based on selected encoding
                inputByteSize = calculateByteSize(rawValue, selectedEncoding);
                
                // Perform encode
                processed = encodeBase64(rawValue, selectedEncoding, useUrlSafe, shouldStripPadding);
                
                // Wrap formatting
                if (wrapLen !== 'none') {
                    processed = wrapString(processed, parseInt(wrapLen));
                }

                outputByteSize = processed.length; // Base64 chars are 1 byte each in ASCII
                updateStats(rawValue.length, inputByteSize, processed.length, outputByteSize, getLineCount(rawValue), 'Encoded ✓');
            } else {
                validity = 'Decoding';
                // Clean spaces for size estimation
                const cleanedBase64 = rawValue.replace(/\s/g, '');
                inputByteSize = cleanedBase64.length;

                // Perform decode
                processed = decodeBase64(rawValue, selectedEncoding);

                // Estimate output size
                outputByteSize = calculateByteSize(processed, selectedEncoding);
                updateStats(rawValue.length, inputByteSize, processed.length, outputByteSize, getLineCount(rawValue), 'Decoded ✓');
            }

            resultEl.value = processed;
            
            // Analytics tracking
            if (typeof track_event === 'function') {
                track_event('base64_processed', { mode: activeMode, encoding: selectedEncoding });
            }
        } catch (error) {
            resultEl.value = `// Error: ${error.message}`;
            updateStats(rawValue.length, 0, 0, 0, getLineCount(rawValue), 'Error');
            document.getElementById('stat-validity').classList.add('danger');
            document.getElementById('stat-validity').classList.remove('success');
            document.getElementById('stat-validity').textContent = 'Invalid Data';
        }
    }

    // 3. Conversion Routines
    function encodeBase64(input, encoding, urlSafe, stripPadding) {
        let binaryString = "";
        if (encoding === "UTF-8") {
            const bytes = new TextEncoder().encode(input);
            for (let i = 0; i < bytes.length; i++) {
                binaryString += String.fromCharCode(bytes[i]);
            }
        } else if (encoding === "ASCII") {
            for (let i = 0; i < input.length; i++) {
                const code = input.charCodeAt(i);
                if (code > 127) {
                    throw new Error("ASCII encoding selected, but input contains non-ASCII characters.");
                }
                binaryString += input[i];
            }
        } else if (encoding === "HEX") {
            const cleaned = input.replace(/[^0-9a-fA-F]/g, '');
            if (cleaned.length % 2 !== 0) {
                throw new Error("Hexadecimal string must have an even number of characters.");
            }
            for (let i = 0; i < cleaned.length; i += 2) {
                binaryString += String.fromCharCode(parseInt(cleaned.slice(i, i + 2), 16));
            }
        } else if (encoding === "UTF-16LE") {
            for (let i = 0; i < input.length; i++) {
                const code = input.charCodeAt(i);
                binaryString += String.fromCharCode(code & 0xff);
                binaryString += String.fromCharCode((code >> 8) & 0xff);
            }
        } else if (encoding === "UTF-16BE") {
            for (let i = 0; i < input.length; i++) {
                const code = input.charCodeAt(i);
                binaryString += String.fromCharCode((code >> 8) & 0xff);
                binaryString += String.fromCharCode(code & 0xff);
            }
        }

        let base64 = btoa(binaryString);
        if (urlSafe) {
            base64 = base64.replace(/\+/g, '-').replace(/\//g, '_');
            if (stripPadding) {
                base64 = base64.replace(/=+$/, '');
            }
        }
        return base64;
    }

    function decodeBase64(input, encoding) {
        // Clean whitespaces
        let cleaned = input.replace(/\s/g, '');

        // Normalize URL-safe characters back to standard Base64
        cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');

        // Add missing padding if stripped
        while (cleaned.length % 4 !== 0) {
            cleaned += '=';
        }

        // Validate character set
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
            throw new Error("Input contains invalid characters for Base64.");
        }

        let binaryString;
        try {
            binaryString = atob(cleaned);
        } catch (e) {
            throw new Error("Invalid Base64 syntax structure.");
        }

        if (encoding === "UTF-8") {
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            // Use TextDecoder fatal option to fail on invalid UTF-8 bytes
            return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        } else if (encoding === "ASCII") {
            let result = "";
            for (let i = 0; i < binaryString.length; i++) {
                const code = binaryString.charCodeAt(i);
                if (code > 127) {
                    throw new Error("Decoded binary sequence is not standard 7-bit ASCII.");
                }
                result += binaryString[i];
            }
            return result;
        } else if (encoding === "HEX") {
            let hex = "";
            for (let i = 0; i < binaryString.length; i++) {
                const h = binaryString.charCodeAt(i).toString(16);
                hex += (h.length === 1 ? '0' : '') + h;
            }
            // Format as spaced pairs
            return hex.match(/.{1,2}/g)?.join(' ') || hex;
        } else if (encoding === "UTF-16LE") {
            let result = "";
            for (let i = 0; i < binaryString.length; i += 2) {
                const low = binaryString.charCodeAt(i);
                const high = (i + 1 < binaryString.length) ? binaryString.charCodeAt(i + 1) : 0;
                result += String.fromCharCode(low | (high << 8));
            }
            return result;
        } else if (encoding === "UTF-16BE") {
            let result = "";
            for (let i = 0; i < binaryString.length; i += 2) {
                const high = binaryString.charCodeAt(i);
                const low = (i + 1 < binaryString.length) ? binaryString.charCodeAt(i + 1) : 0;
                result += String.fromCharCode((high << 8) | low);
            }
            return result;
        }
    }

    // Helper to calculate byte size of a string based on format
    function calculateByteSize(str, encoding) {
        if (!str) return 0;
        if (encoding === "UTF-8") {
            return new TextEncoder().encode(str).length;
        } else if (encoding === "ASCII") {
            return str.length;
        } else if (encoding === "HEX") {
            const cleaned = str.replace(/[^0-9a-fA-F]/g, '');
            return Math.floor(cleaned.length / 2);
        } else if (encoding === "UTF-16LE" || encoding === "UTF-16BE") {
            return str.length * 2;
        }
        return str.length;
    }

    function wrapString(str, length) {
        if (!length || length <= 0) return str;
        const regex = new RegExp(`.{1,${length}}`, 'g');
        return str.match(regex).join('\n');
    }

    function getLineCount(str) {
        if (!str) return 0;
        return str.split('\n').length;
    }

    // 4. Update Statistics Breakdown
    function updateStats(inChars, inBytes, outChars, outBytes, lines, status) {
        document.getElementById('stat-input-chars').textContent = inChars.toLocaleString();
        document.getElementById('stat-input-bytes').textContent = formatBytes(inBytes);
        document.getElementById('stat-lines').textContent = lines.toLocaleString();
        
        document.getElementById('stat-output-chars').textContent = outChars.toLocaleString();
        document.getElementById('stat-output-bytes').textContent = formatBytes(outBytes);
        
        const validityEl = document.getElementById('stat-validity');
        validityEl.textContent = status;
        if (status.includes('✓') || status === 'Ready') {
            validityEl.className = 'value success';
        } else if (status === 'Error' || status === 'Invalid Data') {
            validityEl.className = 'value danger';
        } else {
            validityEl.className = 'value accent';
        }

        // Add size ratio calculation
        if (inBytes > 0 && outBytes > 0) {
            const ratio = ((outBytes - inBytes) / inBytes * 100).toFixed(1);
            const ratioSign = ratio > 0 ? '+' : '';
            const ratioText = ` (${ratioSign}${ratio}%)`;
            document.getElementById('stat-output-bytes').textContent += ratioText;
        }
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // 5. Global Actions
    window.loadExample = function() {
        if (activeMode === 'encode') {
            sourceEl.value = "Hello, World! 👋 Base64 encoding allows standard binary structures to be encapsulated safely inside text formats. Emojis work fine, too! 🚀🔥";
        } else {
            sourceEl.value = "SGVsbG8sIFdvcmxkISAgQmFzZTY0IGVuY29kaW5nIGFsbG93cyBzdGFuZGFyZCBiaW5hcnkgc3RydWN0dXJlcyB0byBiZSBlbmNhcHN1bGF0ZWQgc2FmZWx5IGluc2lkZCB0ZXh0IGZvcm1hdHMuIEVtb2ppcyB3b3JrIGZpbmUsIHRvbyEg8J+ZhfCfmYUg";
        }
        
        if (inputType === 'file') {
            window.setInputType('text');
        }
        
        processData();
        if (typeof showToast === 'function') {
            showToast('Example data loaded!');
        }
    };

    window.clearAll = function() {
        sourceEl.value = '';
        resultEl.value = '';
        fileUploadEl.value = '';
        fileNameDisplay.textContent = '';
        loadedFileName = '';
        updateStats(0, 0, 0, 0, 0, 'Ready');
        
        if (typeof showToast === 'function') {
            showToast('Cleared inputs and outputs.');
        }
    };

    window.copyResult = function() {
        const text = resultEl.value;
        const btn = document.getElementById('btn-copy');
        if (typeof copyToClipboard === 'function') {
            copyToClipboard(text, btn);
        }
    };

    window.downloadResult = function() {
        const text = resultEl.value;
        if (!text.trim() || text.startsWith('// Error:')) {
            if (typeof showToast === 'function') {
                showToast('Nothing valid to download!', 'error');
            }
            return;
        }

        let defaultName = 'encoded-base64.txt';
        if (activeMode === 'decode') {
            defaultName = 'decoded-file.txt';
            // Try to name it intelligently based on the loaded file
            if (loadedFileName) {
                if (loadedFileName.toLowerCase().endsWith('.b64') || loadedFileName.toLowerCase().endsWith('.base64')) {
                    defaultName = loadedFileName.replace(/\.(b64|base64)$/i, '');
                    if (!defaultName.includes('.')) {
                        defaultName += '.txt';
                    }
                } else {
                    defaultName = 'decoded-' + loadedFileName;
                }
            }
        } else {
            if (loadedFileName) {
                defaultName = loadedFileName + '.b64';
            }
        }

        if (typeof downloadFile === 'function') {
            downloadFile(text, defaultName, 'text/plain;charset=utf-8');
            if (typeof track_event === 'function') {
                track_event('base64_download', { mode: activeMode });
            }
        }
    };

    // File Upload handlers
    window.handleFileUpload = function(event) {
        const file = event.target.files[0];
        if (!file) return;

        loadedFileName = file.name;
        fileNameDisplay.textContent = `${file.name} (${formatBytes(file.size)})`;

        const selectedEncoding = encodingSel.value;
        const reader = new FileReader();

        reader.onload = function(e) {
            if (selectedEncoding === 'HEX') {
                // Read binary array buffer and convert to hex
                const buffer = e.target.result;
                const bytes = new Uint8Array(buffer);
                let hex = '';
                for (let i = 0; i < bytes.length; i++) {
                    const h = bytes[i].toString(16);
                    hex += (h.length === 1 ? '0' : '') + h;
                }
                sourceEl.value = hex;
            } else {
                // Normal text
                sourceEl.value = e.target.result;
            }
            processData();
            if (typeof showToast === 'function') {
                showToast(`Loaded ${file.name} successfully.`);
            }
        };

        if (selectedEncoding === 'HEX') {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    };
});
