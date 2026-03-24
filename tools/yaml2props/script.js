/* ══════════════════════════════════════════════
   YAML2Props — YAML → Properties Converter
   ══════════════════════════════════════════════ */

var keyPrefix = "", keySuffix = "", globalY2pOp = "";

function y2p_loadExample() {
    document.getElementById('yamlTextarea').value = "string: Hello, World!\nnumber: 42\nboolean: true\ndatabase:\n  host: \"localhost\"\n  port: 5432\n  name: mydb\napp:\n  name: mule-app\n  version: 1.0.0";
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

function checkCheckboxes(data) {
    const keysOnly = document.getElementById('keysOnly');
    const addGen = document.getElementById('addGenericProp');
    const addMule = document.getElementById('addMuleProp');
    if (data === 'keysOnly') {
        addGen.disabled = !keysOnly.checked;
        addMule.disabled = !keysOnly.checked;
        if (!keysOnly.checked) { addGen.checked = false; addMule.checked = false; }
    } else if (data === 'addGenericProp') { addMule.checked = false; }
    else if (data === 'addMuleProp') { addGen.checked = false; }
}

function convertYamlToProperties(yamlData, keysOnly) {
    const data = jsyaml.load(yamlData);
    let properties = "";
    for (const key of Object.keys(data)) {
        function processObject(obj, prefix) {
            if (typeof obj === "object" && obj !== null) {
                for (const k of Object.keys(obj)) {
                    const val = obj[k];
                    if (typeof val === "object" && val !== null) processObject(val, `${prefix}${k}.`);
                    else {
                        const sVal = String(val);
                        if (keysOnly) properties += (sVal.startsWith('![') ? `${keyPrefix}secure::${prefix}${k}${keySuffix}` : `${keyPrefix}${prefix}${k}${keySuffix}`) + "\n";
                        else properties += `${prefix}${k}=${sVal}\n`;
                    }
                }
            } else {
                const sObj = String(obj);
                if (keysOnly) properties += (sObj.startsWith('![') ? `${keyPrefix}secure::${prefix.slice(0, -1)}${keySuffix}` : `${keyPrefix}${prefix.slice(0, -1)}${keySuffix}`) + "\n";
                else properties += `${prefix.slice(0, -1)}=${sObj}\n`;
            }
        }
        processObject(data[key], `${key}.`);
    }
    return properties;
}

function y2p_convert() {
    const yamlInput = document.getElementById('yamlTextarea').value.trim();
    if (!yamlInput) { document.getElementById('propertiesOutput').value = ''; return; }
    const keysOnly = document.getElementById('keysOnly').checked;
    if (document.getElementById('addGenericProp').checked) { keyPrefix = "${"; keySuffix = "}"; }
    else if (document.getElementById('addMuleProp').checked) { keyPrefix = 'Mule::p("'; keySuffix = '")'; }
    else { keyPrefix = ""; keySuffix = ""; }
    try {
        const op = convertYamlToProperties(yamlInput, keysOnly);
        document.getElementById('propertiesOutput').value = op;
        document.getElementById('filterProp').disabled = false;
        globalY2pOp = op;
        track_event('convert', { tool: 'yaml2props', keys_only: keysOnly });
    } catch (e) {
        document.getElementById('propertiesOutput').value = "❌ Error: " + e.message;
        document.getElementById('filterProp').disabled = true;
    }
}

function y2p_removeValues() {
    const yamlInput = document.getElementById('yamlTextarea').value.trim();
    if (!yamlInput) return;
    try {
        const data = jsyaml.load(yamlInput);
        function clearVals(obj) {
            for (const k of Object.keys(obj)) { if (typeof obj[k] === "object" && obj[k] !== null) clearVals(obj[k]); else obj[k] = String(obj[k]).startsWith('![') ? "![]" : ""; }
        }
        clearVals(data);
        document.getElementById('propertiesOutput').value = jsyaml.dump(data);
        track_event('remove_values', { tool: 'yaml2props' });
    } catch (e) { document.getElementById('propertiesOutput').value = "❌ Error: " + e.message; }
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
    document.getElementById('y2p-filename-group').style.display = 'none';
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
