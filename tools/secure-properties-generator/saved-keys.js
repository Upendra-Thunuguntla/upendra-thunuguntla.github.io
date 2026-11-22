/* ══════════════════════════════════════════════
    Saved Keys — encrypted browser-local storage.
   ══════════════════════════════════════════════ */

(function () {
    'use strict';

    var STORAGE_KEY = 'upendra_secure_saved_keys';
    var DATABASE_NAME = 'upendra_secure_saved_keys_crypto';
    var activeKey = null;
    var operationQueue = Promise.resolve();

    /* ── Storage helpers ── */
    function openKeyDatabase() {
        return new Promise(function (resolve, reject) {
            var request = indexedDB.open(DATABASE_NAME, 1);
            request.onupgradeneeded = function () {
                request.result.createObjectStore('keys');
            };
            request.onsuccess = function () { resolve(request.result); };
            request.onerror = function () { reject(request.error); };
            request.onblocked = function () { reject(new Error('Browser key storage is blocked')); };
        });
    }

    async function getStorageKey(create) {
        var candidate = create ? await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
        ) : null;
        var database = await openKeyDatabase();
        return new Promise(function (resolve, reject) {
            var transaction = database.transaction('keys', create ? 'readwrite' : 'readonly');
            var store = transaction.objectStore('keys');
            var request = store.get('storage-key');
            var key;
            request.onsuccess = function () {
                key = request.result;
                if (!key && candidate) {
                    key = candidate;
                    store.put(key, 'storage-key');
                }
            };
            transaction.oncomplete = function () {
                database.close();
                if (key) resolve(key);
                else reject(new Error('Browser encryption key is missing'));
            };
            transaction.onerror = transaction.onabort = function () {
                database.close();
                reject(transaction.error || new Error('Browser key storage failed'));
            };
        });
    }

    function encodeBytes(bytes) {
        var binary = '';
        bytes.forEach(function (byte) { binary += String.fromCharCode(byte); });
        return btoa(binary);
    }

    function decodeBytes(value) {
        var binary = atob(value);
        return Uint8Array.from(binary, function (character) { return character.charCodeAt(0); });
    }

    async function loadAll() {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        var data = JSON.parse(stored);
        if (Array.isArray(data)) {
            if (data.length) await persistAll(data);
            return data;
        }
        if (!data || data.version !== 1 || typeof data.iv !== 'string' || typeof data.ciphertext !== 'string') {
            throw new Error('Invalid saved key data');
        }
        var key = await getStorageKey(false);
        var plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: decodeBytes(data.iv) }, key, decodeBytes(data.ciphertext)
        );
        var keys = JSON.parse(new TextDecoder().decode(plaintext));
        if (!Array.isArray(keys)) throw new Error('Invalid saved key data');
        return keys;
    }

    async function persistAll(keys) {
        var key = await getStorageKey(true);
        var iv = crypto.getRandomValues(new Uint8Array(12));
        var plaintext = new TextEncoder().encode(JSON.stringify(keys));
        var ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plaintext);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            version: 1,
            iv: encodeBytes(iv),
            ciphertext: encodeBytes(new Uint8Array(ciphertext))
        }));
    }

    function enqueue(operation) {
        operationQueue = operationQueue.then(operation).catch(function (error) {
            console.error('Saved keys error:', error);
            if (typeof showToast === 'function') showToast('Could not access saved keys in this browser', 'error');
        });
        return operationQueue;
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
        enqueue(renderList);
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
    async function renderList() {
        var list = document.getElementById('sk-list');
        if (!list) return;

        var keys = await loadAll();
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
    async function saveCurrentKey() {
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

        var keys = await loadAll();

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

        await persistAll(keys);
        if (typeof track_event === 'function') track_event('key_save');
        activeKey = keys[keys.length - 1];
        syncActiveKey();
        nameInput.value = '';
        await renderList();
        if (typeof showToast === 'function') showToast('"' + name + '" saved');
    }

    /* ── Load a saved key into the form ── */
    async function loadKey(id) {
        var entry = (await loadAll()).find(function (k) { return k.id === id; });
        if (!entry) return;

        var keyEl  = document.getElementById('inp-key');
        var algoEl = document.getElementById('sel-algo');
        var modeEl = document.getElementById('sel-mode');
        var ivEl   = document.getElementById('iv-toggle-check');

        if (keyEl)  keyEl.value    = entry.key;
        if (algoEl) algoEl.value   = entry.algo;
        if (modeEl) modeEl.value   = entry.mode;
        if (ivEl) setRandomIV(entry.iv);

        // Trigger existing script.js callbacks so UI stays consistent
        if (typeof onKeyInput   === 'function') onKeyInput();
        if (typeof onAlgoChange === 'function') onAlgoChange();

        activeKey = entry;
        if (typeof track_event === 'function') track_event('key_load');
        syncActiveKey();
        closePanel();
        if (typeof showToast === 'function') showToast('"' + entry.name + '" loaded');
    }

    /* ── Delete a saved key ── */
    async function removeKey(id) {
        var keys = await loadAll();
        var entry = keys.find(function (k) { return k.id === id; });
        await persistAll(keys.filter(function (k) { return k.id !== id; }));
        if (entry && typeof track_event === 'function') track_event('key_delete');
        if (activeKey && activeKey.id === id) activeKey = null;
        syncActiveKey();
        await renderList();
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
        if (button.dataset.action === 'load') enqueue(function () { return loadKey(id); });
        else enqueue(function () { return removeKey(id); });
    });

    /* ── Public API ── */
    window.savedKeys = {
        toggle: togglePanel,
        close:  closePanel,
        sync:   syncActiveKey,
        save:   function () { return enqueue(saveCurrentKey); },
        load:   function (id) { return enqueue(function () { return loadKey(id); }); },
        remove: function (id) { return enqueue(function () { return removeKey(id); }); }
    };
    enqueue(loadAll);
})();
