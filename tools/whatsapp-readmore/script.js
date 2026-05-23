/* ══════════════════════════════════════════════
   WhatsApp Read More Generator — script.js
   ══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const introInput = document.getElementById('intro-message');
    const hiddenInput = document.getElementById('hidden-message');
    const separatorSelect = document.getElementById('separator-char');
    const multiplierInput = document.getElementById('char-multiplier');
    const multiplierValue = document.getElementById('multiplier-value');

    const previewPlaceholder = document.getElementById('preview-placeholder');
    const previewBubbleWrapper = document.getElementById('preview-bubble-wrapper');
    const previewContent = document.getElementById('preview-content');
    const previewTimeStamp = document.getElementById('preview-time-stamp');

    const statIntro = document.getElementById('stat-intro');
    const statSpacer = document.getElementById('stat-spacer');
    const statHidden = document.getElementById('stat-hidden');

    const btnLoadExample = document.getElementById('btn-load-example');
    const btnClearAll = document.getElementById('btn-clear-all');
    const btnCopyText = document.getElementById('btn-copy-text');
    const btnSendWhatsApp = document.getElementById('btn-send-whatsapp');

    // Advanced Options elements
    const btnToggleAdvanced = document.getElementById('btn-toggle-advanced');
    const advancedOptionsPanel = document.getElementById('advanced-options-panel');
    const advancedToggleIcon = document.getElementById('advanced-toggle-icon');

    // Mapped separator character sequences
    const separatorChars = {
        'zwsp': '\u200B',
        'zwj_zwnj': '\u200E\u200F',
        'zwnj': '\u200C'
    };

    // Preview state
    let isPreviewExpanded = false;
    let generatedPayload = '';

    // Set dynamic current time in preview header
    function updatePreviewTime() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const timeString = `${hours}:${minutes} ${ampm}`;
        if (previewTimeStamp) {
            previewTimeStamp.textContent = timeString;
        }
    }
    updatePreviewTime();

    // Generate output and update stats/preview
    function generateMessage() {
        const introText = introInput.value;
        const hiddenText = hiddenInput.value;
        const separatorKey = separatorSelect.value;
        const multiplier = parseInt(multiplierInput.value, 10);

        // Update multiplier text label
        multiplierValue.textContent = multiplier;

        // Character count stats
        statIntro.textContent = introText.length;
        statSpacer.textContent = multiplier;
        statHidden.textContent = hiddenText.length;

        // If both inputs are empty, reset
        if (!introText && !hiddenText) {
            previewPlaceholder.style.display = 'block';
            previewBubbleWrapper.style.display = 'none';
            generatedPayload = '';
            return;
        }

        previewPlaceholder.style.display = 'none';
        previewBubbleWrapper.style.display = 'flex';

        // Build the invisible separator string
        const separatorUnit = separatorChars[separatorKey] || '\u200B';
        const separatorString = separatorUnit.repeat(multiplier);

        // Concatenate final result
        generatedPayload = introText + separatorString + hiddenText;

        // Render preview content
        renderPreview(introText, hiddenText, separatorString);
    }

    // Helper to escape HTML characters to prevent XSS in mock bubble
    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Render preview inside mock bubble
    function renderPreview(introText, hiddenText, separatorString) {
        if (!hiddenText) {
            // No hidden text, just render escaped intro
            previewContent.innerHTML = escapeHtml(introText);
            return;
        }

        if (isPreviewExpanded) {
            // Render full message with spacer and hidden message
            // We escape html but preserve the zero-width spaces for copying/preview accuracy
            previewContent.innerHTML = escapeHtml(introText) + separatorString + escapeHtml(hiddenText);
        } else {
            // Render collapsed version (intro message followed by ... Read more link)
            previewContent.innerHTML = escapeHtml(introText) + '<span class="whatsapp-readmore-link" id="read-more-trigger">... Read more</span>';
            
            // Wire click event to the Read More link
            const trigger = document.getElementById('read-more-trigger');
            if (trigger) {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    isPreviewExpanded = true;
                    // Re-render
                    renderPreview(introText, hiddenText, separatorString);
                });
            }
        }
    }

    // Load template/example values
    function loadExample() {
        introInput.value = 'Tap to see the magic trick... 🪄';
        hiddenInput.value = 'Surprise! This message was hidden behind a zero-width space wall! 🤯✨\n\nHope this tool brings a smile to your face! Feel free to copy and send to your friends.';
        separatorSelect.value = 'zwsp';
        multiplierInput.value = 3000;
        multiplierValue.textContent = 3000;
        
        isPreviewExpanded = false;
        generateMessage();

        // Track custom analytics event if available
        if (typeof track_event === 'function') {
            track_event('load_example', { tool: 'whatsapp_readmore' });
        }
    }

    // Clear form
    function clearForm() {
        introInput.value = '';
        hiddenInput.value = '';
        separatorSelect.value = 'zwsp';
        multiplierInput.value = 3000;
        multiplierValue.textContent = 3000;
        
        isPreviewExpanded = false;
        previewPlaceholder.style.display = 'block';
        previewBubbleWrapper.style.display = 'none';
        
        statIntro.textContent = 0;
        statSpacer.textContent = 3000;
        statHidden.textContent = 0;
        
        generatedPayload = '';

        if (typeof track_event === 'function') {
            track_event('clear_form', { tool: 'whatsapp_readmore' });
        }
    }

    // Copy result payload to clipboard
    function copyMessage() {
        if (!generatedPayload) {
            if (typeof showToast === 'function') {
                showToast('Write a message first!', 'error');
            } else {
                alert('Write a message first!');
            }
            return;
        }

        if (typeof copyToClipboard === 'function') {
            copyToClipboard(generatedPayload, btnCopyText);
        } else {
            navigator.clipboard.writeText(generatedPayload)
                .then(() => alert('Copied successfully!'))
                .catch(() => alert('Copy failed. Please copy manually.'));
        }

        if (typeof track_event === 'function') {
            track_event('copy', { 
                tool: 'whatsapp_readmore', 
                intro_len: introInput.value.length,
                hidden_len: hiddenInput.value.length,
                spacer_len: parseInt(multiplierInput.value, 10)
            });
        }
    }

    // Redirect to share via WhatsApp Web/App
    // Direct api.whatsapp.com is more robust and prevents URL length truncation of emojis
    function sendWhatsApp() {
        if (!generatedPayload) {
            if (typeof showToast === 'function') {
                showToast('Write a message first!', 'error');
            } else {
                alert('Write a message first!');
            }
            return;
        }

        const encoded = encodeURIComponent(generatedPayload);
        const url = `https://api.whatsapp.com/send?text=${encoded}`;
        
        window.open(url, '_blank', 'noopener');

        if (typeof track_event === 'function') {
            track_event('send_whatsapp', { tool: 'whatsapp_readmore' });
        }
    }

    // Reset preview collapse state when user changes any text input
    function handleInput() {
        isPreviewExpanded = false;
        generateMessage();
    }

    // Advanced Options Toggle handler
    if (btnToggleAdvanced && advancedOptionsPanel) {
        btnToggleAdvanced.addEventListener('click', () => {
            const isHidden = advancedOptionsPanel.style.display === 'none';
            advancedOptionsPanel.style.display = isHidden ? 'flex' : 'none';
            if (advancedToggleIcon) {
                advancedToggleIcon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
            }
        });
    }

    // Attach Event Listeners
    introInput.addEventListener('input', handleInput);
    hiddenInput.addEventListener('input', handleInput);
    separatorSelect.addEventListener('change', handleInput);
    multiplierInput.addEventListener('input', handleInput);

    btnLoadExample.addEventListener('click', loadExample);
    btnClearAll.addEventListener('click', clearForm);
    btnCopyText.addEventListener('click', copyMessage);
    btnSendWhatsApp.addEventListener('click', sendWhatsApp);
});
