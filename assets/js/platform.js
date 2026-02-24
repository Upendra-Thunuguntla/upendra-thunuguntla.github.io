/* ════════════════════════════════
   Shared JavaScript — platform.js
   Nav, scroll animations, mobile menu, toast, utils
   ════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {

    /* ─── Mobile Navigation ─── */
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks = document.getElementById('nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function () {
            const isOpen = navLinks.classList.toggle('open');
            hamburger.setAttribute('aria-expanded', isOpen);
        });

        // Close on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => navLinks.classList.remove('open'));
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
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

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

});

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
            const orig = btn.textContent;
            btn.classList.add('btn-copy-success');
            btn.textContent = '✓ Copied!';
            setTimeout(() => { btn.textContent = orig; btn.classList.remove('btn-copy-success'); }, 1800);
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
