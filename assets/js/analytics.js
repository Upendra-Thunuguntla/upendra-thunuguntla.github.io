/* ═══════════════════════════════════════════════════════════════
   UPENDRA DEV PLATFORM — Analytics (GA4 Custom Events)
   Measurement ID: G-9YH1D05QCJ
   ─────────────────────────────────────────────────────────────
   Event Categories:
     navigation      — nav clicks, breadcrumbs, back-to-home
     engagement      — scroll depth, time on page, visibility
     tool_usage      — per-tool convert / generate / clear / load
     clipboard       — copy actions per page / section
     download        — file downloads per tool
     theme           — dark/light toggle
     social          — social link clicks
     publications    — article card clicks
     error           — JS errors, invalid inputs
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ── Safe gtag wrapper (no-op if GA not loaded yet) ── */
    function track(eventName, params) {
        if (typeof gtag === 'function') {
            gtag('event', eventName, params || {});
        }
    }

    /* ── Page metadata ── */
    var PAGE_TOOL = (function () {
        var p = window.location.pathname;
        if (p.includes('/json2raml')) return 'json2raml';
        if (p.includes('/yaml-tools')) return 'yaml_tools';
        if (p.includes('/xml-sdk')) return 'xml_sdk';
        if (p.includes('/gmail-url')) return 'gmail_url';
        if (p.includes('/salary-calc')) return 'salary_calc';
        return 'home';
    })();

    /* ════════════════════════════════════════
       1. PAGE VIEW with context
    ════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', function () {
        track('page_context', {
            page_tool: PAGE_TOOL,
            page_path: window.location.pathname,
            referrer: document.referrer || 'direct',
            screen_width: window.screen.width,
            color_scheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            theme_stored: localStorage.getItem('upendra-theme') || 'default',
        });

        /* ── Wire all event listeners ── */
        wireNavigation();
        wireSocialLinks();
        wireThemeToggle();
        wireScrollDepth();
        wirePublications();
        wireToolActions();
        wireEngagementTime();
        wireExternalLinks();
        wireSearchOrFilter();
    });

    /* ════════════════════════════════════════
       2. NAVIGATION EVENTS
    ════════════════════════════════════════ */
    function wireNavigation() {
        /* Nav links */
        var navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                track('nav_click', {
                    link_text: link.textContent.trim(),
                    link_href: link.getAttribute('href'),
                    page_tool: PAGE_TOOL,
                });
            });
        });

        /* Logo click */
        var logo = document.querySelector('.nav-logo');
        if (logo) {
            logo.addEventListener('click', function () {
                track('nav_logo_click', { from_tool: PAGE_TOOL });
            });
        }

        /* Breadcrumb clicks (tool pages) */
        var breadcrumbs = document.querySelectorAll('.tool-breadcrumb a');
        breadcrumbs.forEach(function (bc) {
            bc.addEventListener('click', function () {
                track('breadcrumb_click', {
                    link_text: bc.textContent.trim(),
                    page_tool: PAGE_TOOL,
                });
            });
        });

        /* CTA buttons in hero */
        var ctaBtns = document.querySelectorAll('.hero-actions .btn');
        ctaBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                track('hero_cta_click', {
                    button_text: btn.textContent.trim(),
                    button_href: btn.getAttribute('href'),
                });
            });
        });

        /* Tool cards on home page */
        var toolCards = document.querySelectorAll('.tool-card');
        toolCards.forEach(function (card) {
            card.addEventListener('click', function () {
                var titleEl = card.querySelector('.tool-card-title');
                track('tool_card_click', {
                    tool_name: titleEl ? titleEl.textContent.trim() : 'unknown',
                    card_href: card.getAttribute('href') || '',
                });
            });
        });

        /* Related tool links (on tool pages) */
        var relatedLinks = document.querySelectorAll('.related-tool-link');
        relatedLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                var nameEl = link.querySelector('.name');
                track('related_tool_click', {
                    from_tool: PAGE_TOOL,
                    to_tool: nameEl ? nameEl.textContent.trim() : link.href,
                });
            });
        });
    }

    /* ════════════════════════════════════════
       3. SOCIAL LINK CLICKS
    ════════════════════════════════════════ */
    function wireSocialLinks() {
        var socialLinks = document.querySelectorAll('.social-link, .hero-social a');
        socialLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                track('social_link_click', {
                    platform: link.getAttribute('title') || link.href,
                    page_tool: PAGE_TOOL,
                });
            });
        });

        /* Footer links */
        var footerLinks = document.querySelectorAll('.footer a');
        footerLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                track('footer_link_click', {
                    link_text: link.textContent.trim(),
                    link_href: link.href,
                    page_tool: PAGE_TOOL,
                });
            });
        });
    }

    /* ════════════════════════════════════════
       4. THEME TOGGLE
    ════════════════════════════════════════ */
    function wireThemeToggle() {
        var toggleBtns = document.querySelectorAll('.theme-toggle');
        toggleBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var newTheme = (localStorage.getItem('upendra-theme') === 'light') ? 'dark' : 'light';
                track('theme_toggle', {
                    new_theme: newTheme,
                    page_tool: PAGE_TOOL,
                });
            });
        });
    }

    /* ════════════════════════════════════════
       5. SCROLL DEPTH (25 / 50 / 75 / 100%)
    ════════════════════════════════════════ */
    function wireScrollDepth() {
        var milestones = { 25: false, 50: false, 75: false, 100: false };

        function onScroll() {
            var scrollTop = window.scrollY || document.documentElement.scrollTop;
            var docHeight = document.documentElement.scrollHeight - window.innerHeight;
            var pct = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 100;

            [25, 50, 75, 100].forEach(function (mark) {
                if (!milestones[mark] && pct >= mark) {
                    milestones[mark] = true;
                    track('scroll_depth', {
                        depth_percent: mark,
                        page_tool: PAGE_TOOL,
                    });
                }
            });
        }

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    /* ════════════════════════════════════════
       6. PUBLICATION CARD CLICKS
    ════════════════════════════════════════ */
    function wirePublications() {
        var pubCards = document.querySelectorAll('.pub-card');
        pubCards.forEach(function (card) {
            card.addEventListener('click', function () {
                var titleEl = card.querySelector('.pub-title');
                track('article_click', {
                    article_title: titleEl ? titleEl.textContent.trim() : 'unknown',
                    article_href: card.href,
                });
            });
        });
    }

    /* ════════════════════════════════════════
       7. TOOL-SPECIFIC ACTIONS
    ════════════════════════════════════════ */
    function wireToolActions() {
        /* Generic: monitor any button with data-track attribute */
        var trackedBtns = document.querySelectorAll('[data-track]');
        trackedBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                track(btn.getAttribute('data-track'), {
                    page_tool: PAGE_TOOL,
                    label: btn.getAttribute('data-track-label') || btn.textContent.trim(),
                });
            });
        });

        /* Tab switches */
        var tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                track('tab_switch', {
                    tab_name: btn.textContent.trim(),
                    page_tool: PAGE_TOOL,
                });
            });
        });

        /* File upload zones */
        var fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(function (input) {
            input.addEventListener('change', function () {
                if (input.files && input.files[0]) {
                    track('file_upload', {
                        file_type: input.files[0].name.split('.').pop(),
                        page_tool: PAGE_TOOL,
                    });
                }
            });
        });

        /* Options / checkbox changes */
        var checkboxes = document.querySelectorAll('.options-bar input[type="checkbox"], .option-row input[type="checkbox"]');
        checkboxes.forEach(function (cb) {
            cb.addEventListener('change', function () {
                track('option_toggle', {
                    option_id: cb.id || 'unknown',
                    checked: cb.checked,
                    page_tool: PAGE_TOOL,
                });
            });
        });

        /* Details / accordion (XML SDK optional fields) */
        var details = document.querySelectorAll('details');
        details.forEach(function (d) {
            d.addEventListener('toggle', function () {
                track('accordion_toggle', {
                    open: d.open,
                    page_tool: PAGE_TOOL,
                });
            });
        });
    }

    /* ════════════════════════════════════════
       8. TIME ON PAGE / ENGAGEMENT
    ════════════════════════════════════════ */
    function wireEngagementTime() {
        var START = Date.now();
        var sent = { 30: false, 60: false, 120: false, 300: false };

        function checkTime() {
            var elapsed = Math.round((Date.now() - START) / 1000);
            [30, 60, 120, 300].forEach(function (sec) {
                if (!sent[sec] && elapsed >= sec) {
                    sent[sec] = true;
                    track('time_on_page', {
                        seconds: sec,
                        page_tool: PAGE_TOOL,
                    });
                }
            });
        }

        setInterval(checkTime, 10000);

        /* Before unload — fire final engagement */
        window.addEventListener('beforeunload', function () {
            var elapsed = Math.round((Date.now() - START) / 1000);
            track('page_exit', {
                time_spent_sec: elapsed,
                page_tool: PAGE_TOOL,
            });
        });
    }

    /* ════════════════════════════════════════
       9. EXTERNAL LINK CLICKS
    ════════════════════════════════════════ */
    function wireExternalLinks() {
        document.addEventListener('click', function (e) {
            var link = e.target.closest('a[target="_blank"]');
            if (!link) return;
            var href = link.href || '';
            /* Exclude already-tracked social / pub / related */
            if (link.classList.contains('social-link') ||
                link.classList.contains('pub-card') ||
                link.classList.contains('related-tool-link')) return;

            track('external_link_click', {
                href: href,
                link_text: link.textContent.trim().substring(0, 60),
                page_tool: PAGE_TOOL,
            });
        });
    }

    /* ════════════════════════════════════════
       10. FILTER / SEARCH INPUT
    ════════════════════════════════════════ */
    function wireSearchOrFilter() {
        var filterInputs = document.querySelectorAll('#filterProp, .filter-input');
        filterInputs.forEach(function (input) {
            var debounceTimer;
            input.addEventListener('input', function () {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(function () {
                    if (input.value.length > 1) {
                        track('filter_used', {
                            query_length: input.value.length,
                            page_tool: PAGE_TOOL,
                        });
                    }
                }, 600);
            });
        });
    }

    /* ════════════════════════════════════════
       PUBLIC HELPERS — called from inline scripts
       e.g. track_event('convert', { input_len: n })
    ════════════════════════════════════════ */
    window.track_event = function (eventName, params) {
        var merged = Object.assign({ page_tool: PAGE_TOOL }, params || {});
        track(eventName, merged);
    };

})();
