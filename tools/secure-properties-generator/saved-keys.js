/* ══════════════════════════════════════════════
   Saved Keys — browser localStorage only.
   Keys are stored in the user's own browser;
   nothing is ever sent to any server.
   ══════════════════════════════════════════════ */

(function () {
    'use strict';

    var STORAGE_KEY = 'upendra_secure_saved_keys';
    var activeKey = null;

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

        if (panel.open) {
            closePanel();
            return;
        }
        renderList();
        panel.showModal();
        btn.setAttribute('aria-expanded', 'true');
        document.body.classList.add('sk-modal-open');
    }

    function closePanel() {
        var panel = document.getElementById('saved-keys-panel');
        if (panel) panel.close();
    }

    function syncActiveKey() {
        var status = document.getElementById('sk-active-key');
        var keyEl = document.getElementById('inp-key');
        if (activeKey && (!keyEl || keyEl.value.trim() !== activeKey.key)) activeKey = null;
        status.hidden = !activeKey;
        status.textContent = activeKey ? 'Using key: ' + activeKey.name : '';
    }

    /* ── Render saved-key list ── */
    function renderList() {
        var list = document.getElementById('sk-list');
        if (!list) return;

        var keys = loadAll();
        if (keys.length === 0) {
            list.innerHTML = '<p class="sk-empty">No saved keys yet.</p>';
            return;
        }

        list.innerHTML = keys.map(function (k) {
            return '<div class="sk-item" data-id="' + escHtml(k.id) + '">' +
                '<button type="button" class="sk-item-info" data-action="load" title="Load ' + escHtml(k.name) + '">' +
                    '<span class="sk-name">' + escHtml(k.name) + '</span>' +
                    '<span class="sk-meta">' + escHtml(k.algo) + ' / ' + escHtml(k.mode) + (k.iv ? ' / Random IV' : '') + '</span>' +
                '</button>' +
                '<div class="sk-item-actions">' +
                    '<button type="button" class="sk-btn-del" data-action="remove" title="Delete ' + escHtml(k.name) + '" aria-label="Delete ' + escHtml(k.name) + '">' +
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
        activeKey = keys[keys.length - 1];
        syncActiveKey();
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

        activeKey = entry;
        syncActiveKey();
        closePanel();
        if (typeof showToast === 'function') showToast('"' + entry.name + '" loaded');
    }

    /* ── Delete a saved key ── */
    function removeKey(id) {
        var keys = loadAll();
        var entry = keys.find(function (k) { return k.id === id; });
        persistAll(keys.filter(function (k) { return k.id !== id; }));
        if (activeKey && activeKey.id === id) activeKey = null;
        syncActiveKey();
        renderList();
        if (entry && typeof showToast === 'function') showToast('"' + entry.name + '" removed');
    }

    var panel = document.getElementById('saved-keys-panel');
    panel.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            closePanel();
        }
    });
    panel.addEventListener('close', function () {
        document.getElementById('btn-saved-keys').setAttribute('aria-expanded', 'false');
        document.body.classList.remove('sk-modal-open');
    });
    panel.addEventListener('click', function (event) {
        if (event.target !== panel) return;
        var bounds = panel.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) closePanel();
    });
    document.getElementById('sk-list').addEventListener('click', function (event) {
        var button = event.target.closest('button[data-action]');
        if (!button) return;
        var id = button.closest('.sk-item').dataset.id;
        if (button.dataset.action === 'load') loadKey(id);
        else removeKey(id);
    });

    /* ── Public API ── */
    window.savedKeys = {
        toggle: togglePanel,
        close:  closePanel,
        sync:   syncActiveKey,
        save:   saveCurrentKey,
        load:   loadKey,
        remove: removeKey
    };
})();
