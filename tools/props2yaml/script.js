/* ══════════════════════════════════════════════
   Props2YAML — Properties → YAML Converter
   ══════════════════════════════════════════════ */

function p2y_loadExample() {
    document.getElementById('propTextarea').value = "database.host=localhost\ndatabase.port=5432\ndatabase.name=mydb\napp.name=mule-app\napp.version=1.0.0";
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

function p2y_convert() {
    const input = document.getElementById('propTextarea').value.trim();
    if (!input) { 
        document.getElementById('yamlOutput').value = ''; 
        document.getElementById('filterYaml').disabled = true;
        return; 
    }
    document.getElementById('filterYaml').disabled = false;
    const filterQuery = document.getElementById('filterYaml').value.toLowerCase();
    try {
        const obj = {};
        input.split('\n').forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;
            if (filterQuery && !line.toLowerCase().includes(filterQuery)) return;
            const eqIdx = line.indexOf('=');
            if (eqIdx < 0) return;
            const key = line.slice(0, eqIdx).trim();
            const val = line.slice(eqIdx + 1).trim();
            const parts = key.split('.');
            let cur = obj;
            parts.forEach((p, i) => {
                if (i === parts.length - 1) cur[p] = val;
                else { if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {}; cur = cur[p]; }
            });
        });
        
        if (Object.keys(obj).length === 0 && filterQuery) {
            document.getElementById('yamlOutput').value = '# No matching properties found for "' + filterQuery + '"';
        } else {
            document.getElementById('yamlOutput').value = jsyaml.dump(obj, { indent: 2 });
        }
        track_event('convert', { tool: 'props2yaml' });
    } catch (e) { document.getElementById('yamlOutput').value = "❌ Error: " + e.message; }
}

function p2y_clear() {
    document.getElementById('propTextarea').value = '';
    document.getElementById('yamlOutput').value = '';
    document.getElementById('filterYaml').value = '';
    document.getElementById('filterYaml').disabled = true;
    document.getElementById('prop-file-label').textContent = 'Upload .properties File';
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
    if (!name.toLowerCase().endsWith('.yaml') && !name.toLowerCase().endsWith('.yml')) {
        name += '.yaml';
    }
    downloadFile(document.getElementById('yamlOutput').value, name, 'text/plain;charset=utf-8');
    p2y_cancelDownload();
    track_event('download', { tool: 'props2yaml', ext: '.yaml' });
}
