/* ══════════════════════════════════════════════
   Gmail URL — Gmail Compose URL Generator
   ══════════════════════════════════════════════ */

let generatedURL = '';

function generateURL() {
    const to = document.getElementById('gmail-to').value.trim();
    const cc = document.getElementById('gmail-cc').value.trim();
    const bcc = document.getElementById('gmail-bcc').value.trim();
    const subject = document.getElementById('gmail-subject').value.trim();
    const body = document.getElementById('gmail-body').value;

    if (!to || !subject || !body.trim()) {
        document.getElementById('result-area').style.display = 'none';
        document.getElementById('placeholder-area').style.display = 'block';
        return;
    }

    const encBody = body.replace(/\r?\n/g, '%0D%0A');
    generatedURL = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(to)}&cc=${encodeURIComponent(cc)}&bcc=${encodeURIComponent(bcc)}&su=${encodeURIComponent(subject)}&body=${encBody}`;

    document.getElementById('gmail-url-display').textContent = generatedURL;
    document.getElementById('result-area').style.display = 'block';
    document.getElementById('placeholder-area').style.display = 'none';
    track_event('url_generated', {
        tool: 'gmail_url',
        has_cc: !!cc,
        has_bcc: !!bcc,
        subject_length: subject.length,
        body_length: body.length,
    });
}

function openGmail() {
    if (!generatedURL) return;
    window.open(generatedURL, '_blank', 'noopener');
    track_event('open_gmail', { tool: 'gmail_url' });
}

function copyURL() {
    copyToClipboard(generatedURL, document.getElementById('copy-url-btn'));
    track_event('copy', { tool: 'gmail_url', content_type: 'url' });
}

function loadTestValues() {
    document.getElementById('gmail-to').value = 'upendra.thunuguntla@gmail.com';
    document.getElementById('gmail-subject').value = 'Sending Mail from Gmail Compose URL Generator';
    document.getElementById('gmail-body').value = 'Hi Upendra,\n\nYour tool is so helpful ❤️\n\nThanks!';
    track_event('load_example', { tool: 'gmail_url' });
}

function clearForm() {
    ['gmail-to', 'gmail-cc', 'gmail-bcc', 'gmail-subject', 'gmail-body'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('result-area').style.display = 'none';
    document.getElementById('placeholder-area').style.display = 'block';
    generatedURL = '';
}

['gmail-to', 'gmail-cc', 'gmail-bcc', 'gmail-subject', 'gmail-body'].forEach(id => {
    document.getElementById(id).addEventListener('input', generateURL);
});
