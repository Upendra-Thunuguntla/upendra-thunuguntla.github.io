/* ════════════════════════════════
   Shared JavaScript — platform.js
   Nav, scroll animations, mobile menu, toast, utils, full-screen drag & drop popup with blur + strict file validation
   ════════════════════════════════ */

/* ─── Global Tool Drag & Drop Engine Definition ─── */
function initGlobalToolDragAndDrop() {
    // 1. Prevent default browser behavior (which opens raw file in browser)
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        window.addEventListener(eventName, function (e) {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    // 2. Ensure global full-screen popup modal with blur backdrop exists
    let overlay = document.getElementById('global-drag-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-drag-overlay';
        overlay.className = 'drag-drop-overlay';
        overlay.innerHTML = `
            <div class="drag-drop-modal-box">
                <div class="drag-drop-icon">📥</div>
                <h3 class="drag-drop-title">Drop File Anywhere</h3>
                <p class="drag-drop-subtitle" id="drag-overlay-subtitle">Release file to load contents into tool</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    let dragCounter = 0;

    function hidePopup() {
        dragCounter = 0;
        if (overlay) overlay.classList.remove('active');
    }

    function showPopup() {
        if (!overlay) return;
        const toolName = document.querySelector('.tool-hero-text h1, h1')?.textContent?.trim() || 'Developer Tool';
        const sub = overlay.querySelector('#drag-overlay-subtitle');
        if (sub) sub.textContent = `Release to load file directly into ${toolName}`;
        overlay.classList.add('active');
    }

    // Helper: Determine allowed extensions for current tool
    function getAllowedExtensions() {
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput && fileInput.getAttribute('accept')) {
            const acceptAttr = fileInput.getAttribute('accept');
            const exts = acceptAttr.split(',')
                .map(s => s.trim().toLowerCase())
                .filter(s => s.startsWith('.'))
                .map(s => s.substring(1));
            if (exts.length) return exts;
        }

        const path = window.location.pathname.toLowerCase();
        if (path.includes('json2raml')) {
            return ['json', 'txt'];
        } else if (path.includes('yaml2props')) {
            return ['yaml', 'yml', 'txt'];
        } else if (path.includes('props2yaml')) {
            return ['properties', 'prop', 'txt'];
        } else if (path.includes('raml2oas')) {
            return ['raml', 'yaml', 'yml', 'json', 'txt'];
        } else if (path.includes('secure-properties-generator')) {
            return ['properties', 'prop', 'yaml', 'yml', 'txt'];
        } else if (path.includes('mule2curl')) {
            return ['log', 'txt', 'xml'];
        } else if (path.includes('curl2mule')) {
            return ['txt', 'sh', 'curl', 'log'];
        } else if (path.includes('xml-sdk')) {
            return ['xml', 'txt'];
        }

        return ['txt', 'json', 'yaml', 'yml', 'properties', 'prop', 'raml', 'xml', 'csv', 'log', 'dwl', 'md', 'js', 'html', 'css', 'b64', 'base64'];
    }

    // Helper: Validate file extension strictly
    function validateFileExtension(file) {
        const name = file.name || '';
        const extMatch = name.match(/\.([a-zA-Z0-9]+)$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : '';

        const BLOCKED_EXTENSIONS = ['exe', 'dll', 'sys', 'bat', 'cmd', 'ps1', 'vbs', 'bin', 'iso', 'img', 'zip', 'tar', 'gz', '7z', 'rar', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'mp3', 'mp4', 'avi', 'mov', 'mkv'];
        
        if (BLOCKED_EXTENSIONS.includes(ext)) {
            return { valid: false, reason: `Extension '.${ext}' is binary/unsupported for this code tool.` };
        }

        const allowedList = getAllowedExtensions();
        if (allowedList && allowedList.length > 0) {
            if (!ext || !allowedList.includes(ext)) {
                return { 
                    valid: false, 
                    reason: `File format '.${ext || 'unknown'}' is not allowed. Allowed formats: ${allowedList.map(e => '.' + e).join(', ')}` 
                };
            }
        }

        return { valid: true };
    }

    window.addEventListener('dragenter', function (e) {
        if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
            dragCounter++;
            showPopup();
        }
    });

    window.addEventListener('dragleave', function (e) {
        dragCounter--;
        if (dragCounter <= 0) {
            hidePopup();
        }
    });

    window.addEventListener('dragover', function (e) {
        if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
            if (!overlay.classList.contains('active')) {
                showPopup();
            }
        }
    });

    window.addEventListener('drop', function (e) {
        // ALWAYS REMOVE POPUP IMMEDIATELY ON DROP / RELEASE
        hidePopup();

        const files = e.dataTransfer ? e.dataTransfer.files : null;
        if (!files || !files.length) return;

        const file = files[0];
        handleFileImport(file);
    });

    window.addEventListener('dragend', function () {
        hidePopup();
    });

    // Make explicit file dropzones clickable to browse
    document.querySelectorAll('.file-dropzone, #file-input-wrapper').forEach(zone => {
        zone.addEventListener('click', function(e) {
            if (e.target.tagName === 'INPUT') return;
            const fileInput = zone.querySelector('input[type="file"]') || document.querySelector('input[type="file"]');
            if (fileInput) fileInput.click();
        });
    });

    function handleFileImport(file) {
        // STRICT FILE EXTENSION VALIDATION
        const validation = validateFileExtension(file);
        if (!validation.valid) {
            if (typeof showToast === 'function') {
                showToast(`❌ ${validation.reason}`, 'error');
            } else {
                alert(`File Rejected: ${validation.reason}`);
            }
            return; // REJECT FILE DO NOT READ
        }

        // A. If hidden file input exists, populate FileList & dispatch change event
        const hiddenFileInput = document.querySelector('input[type="file"]');
        if (hiddenFileInput) {
            try {
                const dt = new DataTransfer();
                dt.items.add(file);
                hiddenFileInput.files = dt.files;
                
                hiddenFileInput.dispatchEvent(new Event('change', { bubbles: true }));

                if (typeof handleFileUpload === 'function') {
                    handleFileUpload({ target: hiddenFileInput });
                } else if (typeof y2p_openFile === 'function') {
                    y2p_openFile({ target: hiddenFileInput });
                } else if (typeof p2y_openFile === 'function') {
                    p2y_openFile({ target: hiddenFileInput });
                } else if (typeof loadJSONFile === 'function') {
                    loadJSONFile({ target: hiddenFileInput });
                }
            } catch (err) {
                console.warn('[DragNDrop] FileInput assignment fallback:', err);
            }
        }

        // B. Read file content as text and populate main input textarea
        const reader = new FileReader();
        reader.onload = function (evt) {
            const content = evt.target.result;

            const primaryTextarea = document.querySelector('.code-textarea, #text-input, #inp-value, #json-input, #yamlTextarea, #propTextarea, #raml-input, #log-input, #curl-input, #gmail-body, #intro-message, textarea:not([readonly])');

            if (primaryTextarea) {
                primaryTextarea.value = content;
                
                primaryTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                primaryTextarea.dispatchEvent(new Event('change', { bubbles: true }));

                if (typeof processData === 'function') processData();
                if (typeof convert === 'function') convert();
                if (typeof y2p_convert === 'function') y2p_convert();
                if (typeof p2y_convert === 'function') p2y_convert();
                if (typeof convertRamlToOas === 'function') convertRamlToOas();
                if (typeof convertLogToCurl === 'function') convertLogToCurl();
                if (typeof convertCurl === 'function') convertCurl();

                if (typeof showToast === 'function') {
                    showToast(`File "${file.name}" loaded successfully! 📄`, 'success');
                }
            } else if (hiddenFileInput) {
                if (typeof showToast === 'function') {
                    showToast(`File "${file.name}" loaded! 📄`, 'success');
                }
            }
        };

        reader.onerror = function () {
            if (typeof showToast === 'function') {
                showToast(`Could not read file "${file.name}".`, 'error');
            }
        };

        reader.readAsText(file);
    }
}

// Export to window object
window.initGlobalToolDragAndDrop = initGlobalToolDragAndDrop;

document.addEventListener('DOMContentLoaded', function () {

    /* ─── Mobile Navigation ─── */
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks = document.getElementById('nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function () {
            const isOpen = navLinks.classList.toggle('open');
            hamburger.classList.toggle('open', isOpen);
            hamburger.setAttribute('aria-expanded', isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        // Close on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                hamburger.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    /* ─── Scroll Reveal (IntersectionObserver) ─── */
    const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
    if (revealEls.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px 150px 0px' });

        revealEls.forEach(el => observer.observe(el));
    }

    /* ─── Active nav link on scroll ─── */
    const sections = document.querySelectorAll('section[id]');
    const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

    if (sections.length && navAnchors.length) {
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navAnchors.forEach(a => {
                        a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
                    });
                }
            });
        }, { threshold: 0.4 });

        sections.forEach(s => sectionObserver.observe(s));
    }

    /* ─── Initialize Global Drag & Drop for Developer Tools ─── */
    initGlobalToolDragAndDrop();

    /* ─── Check & Display Domain Redirect Notice ─── */
    checkDomainRedirectNotice();

});

/* ─── Domain Redirect Notice Banner ─── */
function checkDomainRedirectNotice() {
    try {
        const currentHost = window.location.hostname.toLowerCase();
        
        // Target domain is upendra.fyi. If already on upendra.fyi or subdomains, do not display.
        if (currentHost === 'upendra.fyi' || currentHost.endsWith('.upendra.fyi')) {
            return;
        }

        // Check if user dismissed notice in the last 15 days (15 * 24 * 60 * 60 * 1000 ms)
        const STORAGE_KEY = 'upendra_domain_banner_dismissed_at';
        const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
        
        const lastDismissed = localStorage.getItem(STORAGE_KEY);
        if (lastDismissed) {
            const timePassed = Date.now() - parseInt(lastDismissed, 10);
            if (!isNaN(timePassed) && timePassed < FIFTEEN_DAYS_MS) {
                return; // Dismissed less than 15 days ago
            }
        }

        // Create domain redirect banner element
        const banner = document.createElement('div');
        banner.id = 'domain-redirect-banner';
        banner.className = 'domain-redirect-banner';
        banner.setAttribute('role', 'banner');
        banner.setAttribute('aria-label', 'Domain Redirect Notice');

        const currentDisplayHost = currentHost || 'this location';

        banner.innerHTML = `
            <div class="domain-banner-content">
                <div class="domain-banner-icon">🌐</div>
                <div class="domain-banner-text">
                    <div class="domain-banner-title">
                        Official Domain: <strong>upendra.fyi</strong>
                    </div>
                    <div class="domain-banner-desc">
                        Visiting via <code>${currentDisplayHost}</code>? Switch to <strong>upendra.fyi</strong> for the newest tools!
                        <span style="display:block; margin-top:0.25rem; opacity:0.85; font-size:0.78rem; font-style:italic;">(Hit ✕ & I promise not to disturb your peace for 15 whole days! 🤫)</span>
                    </div>
                </div>
            </div>
            <div class="domain-banner-actions">
                <button id="domain-banner-switch-btn" class="domain-banner-btn primary">
                    Switch to upendra.fyi <i class="fas fa-arrow-right"></i>
                </button>
                <button id="domain-banner-dismiss-btn" class="domain-banner-btn close" aria-label="Dismiss notice for 15 days" title="Dismiss for 15 days">
                    ✕
                </button>
            </div>
        `;

        document.body.appendChild(banner);

        // Track GA4 Impression Event
        if (typeof gtag === 'function') {
            gtag('event', 'domain_banner_impression', {
                source_host: currentHost,
                page_path: window.location.pathname
            });
        }

        // Animate in smoothly after page render
        setTimeout(() => {
            banner.classList.add('show');
        }, 800);

        // Event listener: Switch button
        const switchBtn = document.getElementById('domain-banner-switch-btn');
        if (switchBtn) {
            switchBtn.addEventListener('click', function () {
                const targetUrl = 'https://upendra.fyi' + window.location.pathname + window.location.search + window.location.hash;
                
                // Track GA4 Switch Event
                if (typeof gtag === 'function') {
                    gtag('event', 'domain_banner_switch_click', {
                        source_host: currentHost,
                        target_url: targetUrl,
                        page_path: window.location.pathname
                    });
                }

                window.location.href = targetUrl;
            });
        }

        // Event listener: Dismiss button
        const dismissBtn = document.getElementById('domain-banner-dismiss-btn');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', function () {
                // Track GA4 Dismiss Event
                if (typeof gtag === 'function') {
                    gtag('event', 'domain_banner_dismiss_click', {
                        source_host: currentHost,
                        suppression_days: 15,
                        page_path: window.location.pathname
                    });
                }

                try {
                    localStorage.setItem(STORAGE_KEY, Date.now().toString());
                } catch (e) {
                    console.warn('[DomainNotice] Storage permission error:', e);
                }
                banner.classList.remove('show');
                setTimeout(() => {
                    if (banner.parentNode) {
                        banner.parentNode.removeChild(banner);
                    }
                }, 400);

                if (typeof showToast === 'function') {
                    showToast("Got it! Hibernating for 15 days... Happy building! 😴✨", "info");
                }
            });
        }

    } catch (e) {
        console.warn('[DomainNotice] Error initializing domain banner:', e);
    }
}

/* ─── Toast notification ─── */
function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast toast-' + type + ' show';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ─── Copy to clipboard (shared) ─── */
function copyToClipboard(text, btn) {
    if (!text || !text.trim()) {
        showToast('Nothing to copy!', 'error');
        return;
    }
    navigator.clipboard ? navigator.clipboard.writeText(text).then(onCopied, onFail)
        : legacyCopy(text);

    function onCopied() {
        showToast('Copied to clipboard! 📋');
        if (btn) {
            const hasIcon = btn.querySelector('i');
            const isSmall = btn.classList.contains('btn-icon') || btn.offsetWidth < 50;

            if (hasIcon && isSmall) {
                const icon = btn.querySelector('i');
                const origClass = icon.className;
                icon.className = 'fas fa-check btn-copy-success';
                btn.classList.add('btn-copy-success');
                setTimeout(() => {
                    icon.className = origClass;
                    btn.classList.remove('btn-copy-success');
                }, 2000);
            } else {
                const orig = btn.innerHTML;
                btn.classList.add('btn-copy-success');
                btn.textContent = '✓ Copied!';
                setTimeout(() => {
                    btn.innerHTML = orig;
                    btn.classList.remove('btn-copy-success');
                }, 2000);
            }
        }
    }
    function onFail() { showToast('Copy failed — please copy manually.', 'error'); }
    function legacyCopy(t) {
        const ta = document.createElement('textarea');
        ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); onCopied(); } catch (e) { onFail(); }
        document.body.removeChild(ta);
    }
}

/* ─── Download file helper ─── */
function downloadFile(content, filename, mimeType) {
    if (!content || !content.trim()) { showToast('Nothing to download!', 'error'); return; }
    const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ─── Typewriter effect ─── */
function initTypewriter(elId, phrases, typingSpeed, pauseTime, deletingSpeed) {
    const el = document.getElementById(elId);
    if (!el) return;
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function tick() {
        const phrase = phrases[phraseIndex % phrases.length];
        if (!deleting) {
            charIndex++;
            el.textContent = phrase.slice(0, charIndex);
            if (charIndex === phrase.length) {
                deleting = true;
                setTimeout(tick, pauseTime || 2000);
                return;
            }
        } else {
            charIndex--;
            el.textContent = phrase.slice(0, charIndex);
            if (charIndex === 0) {
                deleting = false;
                phraseIndex++;
            }
        }
        setTimeout(tick, deleting ? (deletingSpeed || 45) : (typingSpeed || 80));
    }
    tick();
}

/* ─── Service Worker Registration (Caching) ─── */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                reg.onupdatefound = () => {
                    const installingWorker = reg.installing;
                    if (installingWorker) {
                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('[SW] New version available, reload to update!');
                            }
                        };
                    }
                };
            })
            .catch(err => console.error('[SW] Error registering service worker:', err));
    });
}
