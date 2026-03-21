/* ══════════════════════════════════════════════
   XML SDK Helper — Mule Connector XML Builder
   ══════════════════════════════════════════════ */

/* ══ Model ══ */
const xmlSer = new XMLSerializer();
const xmlDoc = document.implementation.createDocument("", "", null);
const operation = xmlDoc.createElement("operation");
const params = xmlDoc.createElement("parameters");
operation.appendChild(params);

/* ══ Helpers ══ */
function toKebab(s) { return v ? v.kebabCase(s) : s.replace(/\s+/g, '-').toLowerCase(); }

function prettyXML(xmlStr) {
    let formatted = ''; let indent = '';
    xmlStr.replace(/>\s*</g, '>\n<').split('\n').forEach(node => {
        if (node.match(/^<\/\w/)) indent = indent.substring(2);
        formatted += indent + node + '\n';
        if (node.match(/^<\w[^>]*[^/]>.*$/) && !node.match(/<.*\/>/)) indent += '  ';
    });
    return formatted.trim();
}

function displayOutput() {
    const raw = xmlSer.serializeToString(operation);
    document.getElementById('xml-output').value = prettyXML(raw);
}

/* ══ Tab ══ */
function switchTab(id, btn) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('form-' + id).classList.add('active');
    btn.classList.add('active');
}

/* ══ Operation ══ */
function op_name_change(val) {
    const kb = toKebab(val);
    document.getElementById('op_name').value = kb;
    operation.setAttribute('name', kb);
    displayOutput();
}

function op_desc_change(val) {
    if (val) operation.setAttribute('doc:description', val);
    else operation.removeAttribute('doc:description');
    displayOutput();
}

function op_reset() {
    document.getElementById('op_name').value = '';
    document.getElementById('op_description').value = '';
    operation.removeAttribute('name');
    operation.removeAttribute('doc:description');
    // Remove all params
    while (params.firstChild) params.removeChild(params.firstChild);
    document.getElementById('xml-output').value = '';
}

/* ══ Parameter ══ */
const param_fields = [
    { id: 'param_order', attr: 'order', req: false },
    { id: 'param_tab', attr: 'tab', req: false },
    { id: 'param_use', attr: 'use', req: true },
    { id: 'param_name', attr: 'name', req: true },
    { id: 'param_displayName', attr: 'displayName', req: true },
    { id: 'param_defaultValue', attr: 'defaultValue', req: false },
    { id: 'param_summary', attr: 'summary', req: false },
    { id: 'param_example', attr: 'example', req: false },
    { id: 'param_description', attr: 'doc:description', req: false },
    { id: 'param_role', attr: 'role', req: true },
    { id: 'param_password', attr: 'password', req: false },
];

function param_CheckType(val) {
    const customWrap = document.getElementById('custom-type-wrap');
    const dd = document.getElementById('param_type');
    if (val === 'other') {
        customWrap.style.display = 'flex';
        dd.style.display = 'none';
    } else {
        customWrap.style.display = 'none';
        dd.style.display = 'block';
    }
}

function clearCustomType() {
    document.getElementById('param_type').value = '';
    document.getElementById('param_type').style.display = 'block';
    document.getElementById('custom-type-wrap').style.display = 'none';
    document.getElementById('param_type_text').value = '';
}

function param_disable_default(val) {
    document.getElementById('param_defaultValue').disabled = (val === 'REQUIRED');
}

function showError(msg) {
    const el = document.getElementById('xml-error');
    el.textContent = '⚠️ ' + msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

function param_convert() {
    const name = document.getElementById('param_name').value.trim();
    const disp = document.getElementById('param_displayName').value.trim();
    const role = document.getElementById('param_role').value;
    const use = document.getElementById('param_use').value;
    // Get type
    const typeDd = document.getElementById('param_type');
    const typeText = document.getElementById('param_type_text').value.trim();
    const typeVal = typeDd.style.display === 'none' ? typeText : typeDd.value;

    if (!name) { showError('Parameter Name is required.'); document.getElementById('param_name').focus(); return; }
    if (!disp) { showError('Display Name is required.'); document.getElementById('param_displayName').focus(); return; }
    if (!role) { showError('Role is required.'); document.getElementById('param_role').focus(); return; }
    if (!use) { showError('Is Required field is required.'); document.getElementById('param_use').focus(); return; }
    if (!typeVal) { showError('Type is required.'); return; }

    const param = xmlDoc.createElement("parameter");

    param_fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el && el.value) param.setAttribute(f.attr, el.value);
    });
    // Override type with correct value
    param.setAttribute('type', typeVal);

    params.appendChild(param);
    displayOutput();
    param_clear();
    showToast('Parameter added! ✓');
    track_event('add_parameter', { tool: 'xml_sdk', total_params: params.children.length });
}

function param_clear() {
    param_fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el) el.value = '';
    });
    document.getElementById('param_type_text').value = '';
    clearCustomType();
    document.getElementById('xml-error').style.display = 'none';
}

function resetAll() {
    op_reset();
    param_clear();
    showToast('Reset complete.');
}

/* ══ Actions ══ */
function copyXML() { copyToClipboard(document.getElementById('xml-output').value, document.getElementById('xml-copy-btn')); }
function downloadXML() {
    const content = document.getElementById('xml-output').value;
    if (!content.trim()) { showToast('Nothing to download!', 'error'); return; }
    const opName = operation.getAttribute('name') || 'operation';
    downloadFile(content, opName + '.xml', 'text/xml;charset=utf-8');
    track_event('download', { tool: 'xml_sdk', file_type: 'xml' });
}
