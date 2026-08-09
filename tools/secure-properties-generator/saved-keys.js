/* ══════════════════════════════════════════════
   Saved Keys — browser localStorage only.
   Keys are stored in the user's own browser;
   nothing is ever sent to any server.
   ══════════════════════════════════════════════ */

(function () {
    'use strict';

    var STORAGE_KEY = 'upendra_secure_saved_keys';

    /* ── Storage helpers ── */
    function loadAll() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function persistAll(keys) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    }

    function genId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ── Panel open/close ── */
    function togglePanel() {
        var panel = document.getElementById('saved-keys-panel');
        var btn   = document.getElementById('btn-saved-keys');
        if (!panel) return;

        var opening = !panel.classList.contains('open');
        panel.classList.toggle('open', opening);
        btn.setAttribute('aria-expanded', String(opening));

        if (opening) {
            renderList();
            // Close on next outside click
            setTimeout(function () {
                document.addEventListener('click', closeOnOutside);
            }, 0);
        } else {
            document.removeEventListener('click', closeOnOutside);
        }
    }

    function closePanel() {
        var panel = document.getElementById('saved-keys-panel');
        var btn   = document.getElementById('btn-saved-keys');
        if (panel) panel.classList.remove('open');
        if (btn)   btn.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', closeOnOutside);
    }

    function closeOnOutside(e) {
        var panel = document.getElementById('saved-keys-panel');
        var btn   = document.getElementById('btn-saved-keys');
        if (!panel) return;
        if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
            closePanel();
        }
    }

    /* ── Render saved-key list ── */
    function renderList() {
        var list = document.getElementById('sk-list');
        if (!list) return;

        var keys = loadAll();
        if (keys.length === 0) {
            list.innerHTML = '<p class="sk-empty">No saved keys yet.<br><span style="font-weight:400;">Enter a name above and click <em>Save current key</em> to store your key + algorithm for quick reuse.</span></p>';
            return;
        }

        list.innerHTML = keys.map(function (k) {
            return '<div class="sk-item" data-id="' + k.id + '" onclick="savedKeys.load(\'' + k.id + '\')" title="Click to load \'' + escHtml(k.name) + '\'">' +
                '<div class="sk-item-info">' +
                    '<span class="sk-name">' + escHtml(k.name) + '</span>' +
                    '<span class="sk-meta">' + escHtml(k.algo) + ' / ' + escHtml(k.mode) + (k.iv ? ' / Random IV' : '') + '</span>' +
                '</div>' +
                '<div class="sk-item-actions">' +
                    '<button class="sk-btn-del" onclick="event.stopPropagation(); savedKeys.remove(\'' + k.id + '\')" title="Delete \'' + escHtml(k.name) + '\'" aria-label="Delete ' + escHtml(k.name) + '">' +
                        '<i class="fas fa-trash-alt"></i>' +
                    '</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    /* ── Save current key ── */
    function saveCurrentKey() {
        var nameInput = document.getElementById('sk-name-input');
        var keyEl     = document.getElementById('inp-key');
        var algoEl    = document.getElementById('sel-algo');
        var modeEl    = document.getElementById('sel-mode');
        var ivEl      = document.getElementById('iv-toggle-check');

        var name = nameInput ? nameInput.value.trim() : '';
        var key  = keyEl     ? keyEl.value.trim()     : '';

        if (!name) {
            if (nameInput) nameInput.focus();
            if (typeof showToast === 'function') showToast('Enter a name for this key', 'error');
            return;
        }
        if (!key) {
            if (typeof showToast === 'function') showToast('Enter a key first', 'error');
            return;
        }

        var keys = loadAll();

        // Prevent duplicate names
        if (keys.some(function (k) { return k.name.toLowerCase() === name.toLowerCase(); })) {
            if (typeof showToast === 'function') showToast('A key with that name already exists', 'error');
            return;
        }

        keys.push({
            id:      genId(),
            name:    name,
            key:     key,
            algo:    algoEl ? algoEl.value : 'AES',
            mode:    modeEl ? modeEl.value : 'CBC',
            iv:      ivEl   ? ivEl.checked : false,
            savedAt: new Date().toISOString()
        });

        persistAll(keys);
        nameInput.value = '';
        renderList();
        if (typeof showToast === 'function') showToast('"' + name + '" saved');
    }

    /* ── Load a saved key into the form ── */
    function loadKey(id) {
        var entry = loadAll().find(function (k) { return k.id === id; });
        if (!entry) return;

        var keyEl  = document.getElementById('inp-key');
        var algoEl = document.getElementById('sel-algo');
        var modeEl = document.getElementById('sel-mode');
        var ivEl   = document.getElementById('iv-toggle-check');

        if (keyEl)  keyEl.value    = entry.key;
        if (algoEl) algoEl.value   = entry.algo;
        if (modeEl) modeEl.value   = entry.mode;
        if (ivEl)   ivEl.checked   = entry.iv;

        // Trigger existing script.js callbacks so UI stays consistent
        if (typeof onKeyInput   === 'function') onKeyInput();
        if (typeof onAlgoChange === 'function') onAlgoChange();

        closePanel();
        if (typeof showToast === 'function') showToast('"' + entry.name + '" loaded');
    }

    /* ── Delete a saved key ── */
    function removeKey(id) {
        var keys = loadAll();
        var entry = keys.find(function (k) { return k.id === id; });
        persistAll(keys.filter(function (k) { return k.id !== id; }));
        renderList();
        if (entry && typeof showToast === 'function') showToast('"' + entry.name + '" removed');
    }

    /* ── Public API ── */
    window.savedKeys = {
        toggle: togglePanel,
        save:   saveCurrentKey,
        load:   loadKey,
        remove: removeKey
    };
})();
