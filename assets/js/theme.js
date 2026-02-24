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
  });

  window.__themeToggle = toggleTheme;
})();
