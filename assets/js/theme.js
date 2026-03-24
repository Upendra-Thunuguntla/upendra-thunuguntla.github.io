/* ═══════════════════════════
   Shared JavaScript — theme.js
   Theme toggle with localStorage
   ═══════════════════════════ */
(function () {
  const STORAGE_KEY = 'upendra-theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  function getPreferred() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : DARK;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === LIGHT ? LIGHT : '');
    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleUI(theme);
  }

  function updateToggleUI(theme) {
    const toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(btn => {
      btn.textContent = theme === LIGHT ? '🌙' : '☀️';
      btn.setAttribute('aria-label', theme === LIGHT ? 'Switch to dark mode' : 'Switch to light mode');
    });
  }

  function toggleTheme() {
    const current = localStorage.getItem(STORAGE_KEY) || DARK;
    applyTheme(current === DARK ? LIGHT : DARK);
  }

  // Apply on load (before DOM content to avoid flash)
  applyTheme(getPreferred());

  // Wire up toggles after DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', toggleTheme);
    });
    updateToggleUI(getPreferred());

    // ── Global Link Handling ──
    // Open internal links in same tab, external in new tab
    document.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      const isExternal = href.startsWith('http') && !href.includes(window.location.host);
      
      if (isExternal) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      } else {
        // Force same tab for internal links (overriding existing target="_blank")
        if (link.hasAttribute('target')) {
          link.removeAttribute('target');
        }
      }
    });

    // Handle Hamburger menu if it exists on the page
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks = document.getElementById('nav-links');
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', () => {
        const expanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', !expanded);
        navLinks.classList.toggle('active');
        hamburger.classList.toggle('active');
      });
      // Close menu when clicking a link
      navLinks.querySelectorAll('a').forEach(l => {
        l.addEventListener('click', () => {
          hamburger.setAttribute('aria-expanded', 'false');
          navLinks.classList.remove('active');
          hamburger.classList.remove('active');
        });
      });
    }
  });

  window.__themeToggle = toggleTheme;
})();
