/* Shared, privacy-safe GA4 custom events. See tool-template.md for event names. */
(function () {
    'use strict';

    var tools = {
        'base64-converter': 'b64',
        'cron-builder': 'cron',
        'curl2mule': 'c2m',
        'gmail-url': 'gmail',
        'json2raml': 'j2r',
        'mule-debug-package-finder': 'debug',
        'mule2curl': 'm2c',
        'props2yaml': 'p2y',
        'raml2oas': 'r2o',
        'salary-calc': 'salary',
        'secure-properties-generator': 'secure',
        'whatsapp-readmore': 'wa',
        'xml-sdk': 'xml',
        'yaml2props': 'y2p'
    };
    var match = window.location.pathname.match(/^\/tools\/([^/]+)(?:\/|$)/);
    var tool = match && Object.prototype.hasOwnProperty.call(tools, match[1]) ? match[1] : 'home';
    var prefix = tools[tool] || 'home';
    var pending = {};

    function track(name, params) {
        if (typeof gtag === 'function') {
            gtag('event', prefix + '_' + name, Object.assign({ page_tool: tool }, params || {}));
        }
    }

    // Tool scripts use only these fixed action names; arbitrary parameters are never sent.
    var actions = {
        add_parameter: 'add_param',
        base64_download: 'download',
        build: 'build',
        calculate: 'calc',
        clear: 'clear',
        clear_form: 'clear',
        convert: 'convert',
        copy: 'copy',
        curl2mule_parsed: 'convert',
        decrypt: 'decrypt',
        download: 'download',
        encrypt: 'encrypt',
        generate: 'generate',
        key_delete: 'key_delete',
        key_load: 'key_load',
        key_save: 'key_save',
        load_example: 'example',
        mule2curl_parsed: 'convert',
        open_gmail: 'open',
        send_whatsapp: 'send',
        url_generated: 'generate',
        check: 'check'
    };
    var liveActions = { build: true, calc: true, convert: true, decode: true, encode: true, generate: true };

    window.track_event = function (name, params) {
        var action = name === 'base64_processed' && params &&
            (params.mode === 'encode' || params.mode === 'decode') ? params.mode :
            Object.prototype.hasOwnProperty.call(actions, name) ? actions[name] : null;
        if (!action || tool === 'home') return;

        if (liveActions[action]) {
            clearTimeout(pending[action]);
            pending[action] = setTimeout(function () {
                delete pending[action];
                track(action);
            }, 800);
        } else {
            track(action);
        }
    };

    window.addEventListener('pagehide', function () {
        Object.keys(pending).forEach(function (action) {
            clearTimeout(pending[action]);
            delete pending[action];
            track(action);
        });
    });

    window.track_page_event = function (name) {
        track(name);
    };

    document.addEventListener('DOMContentLoaded', function () {
        track('page_context');

        document.querySelectorAll('.nav-links a').forEach(function (link) {
            link.addEventListener('click', function () {
                track('nav_click', { link_text: link.textContent.trim(), link_href: link.getAttribute('href') });
            });
        });
        var logo = document.querySelector('.nav-logo');
        if (logo) logo.addEventListener('click', function () { track('nav_logo_click'); });
        document.querySelectorAll('.tool-breadcrumb a').forEach(function (link) {
            link.addEventListener('click', function () { track('breadcrumb_click'); });
        });
        document.querySelectorAll('.social-link').forEach(function (link) {
            link.addEventListener('click', function () {
                track('social_click', { platform: link.getAttribute('title') || 'other' });
            });
        });
        document.querySelectorAll('.theme-toggle').forEach(function (toggle) {
            toggle.addEventListener('click', function () {
                setTimeout(function () {
                    track('theme_toggle', { new_theme: document.documentElement.getAttribute('data-theme') || 'dark' });
                }, 50);
            });
        });

        var milestones = {};
        window.addEventListener('scroll', function () {
            var root = document.documentElement;
            var height = root.scrollHeight - root.clientHeight;
            if (height <= 0) return;
            var percent = Math.round(root.scrollTop / height * 100);
            [25, 50, 75, 100].forEach(function (mark) {
                if (!milestones[mark] && percent >= mark) {
                    milestones[mark] = true;
                    track('scroll_depth', { depth_percent: mark });
                }
            });
        }, { passive: true });

        document.addEventListener('click', function (event) {
            var toolLink = event.target.closest('a.tool-card');
            if (toolLink && tool === 'home') {
                var target = new URL(toolLink.href).pathname.match(/^\/tools\/([^/]+)(?:\/|$)/);
                if (target && Object.prototype.hasOwnProperty.call(tools, target[1])) track('open_' + tools[target[1]]);
                return;
            }
            var card = event.target.closest('.pub-card, .blog-card');
            if (card) {
                track(card.classList.contains('pub-card') ? 'article_click' : 'blog_card_click');
                return;
            }
            var link = event.target.closest('a[target="_blank"]');
            if (link && !link.classList.contains('social-link') && !link.classList.contains('related-tool-link')) {
                track('external_link_click');
            }
        });

        document.querySelectorAll('.tab-btn').forEach(function (button) {
            button.addEventListener('click', function () {
                track('tab_switch', { tab_name: button.id || 'other' });
            });
        });
        document.querySelectorAll('input[type="file"]').forEach(function (input) {
            input.addEventListener('change', function () {
                if (input.files && input.files[0]) track('file_select');
            });
        });
        document.querySelectorAll('.options-bar input[type="checkbox"], .option-row input[type="checkbox"], .switch input[type="checkbox"]').forEach(function (input) {
            input.addEventListener('change', function () {
                track('option_toggle', { option_id: input.id || 'unknown', checked: input.checked ? 'yes' : 'no' });
            });
        });
        document.querySelectorAll('details').forEach(function (details) {
            details.addEventListener('toggle', function () {
                track('accordion_toggle', { open: details.open ? 'yes' : 'no', section: details.classList.contains('faq-item') ? 'faq' : 'tool_options' });
            });
        });
        document.querySelectorAll('select.form-control[id]').forEach(function (select) {
            select.addEventListener('change', function () {
                track('select_change', { select_id: select.id });
            });
        });
        document.querySelectorAll('#filterProp, input.filter-input, #tool-search').forEach(function (input) {
            var timer;
            input.addEventListener('input', function () {
                clearTimeout(timer);
                timer = setTimeout(function () {
                    if (input.value.length > 1) track('filter_used');
                }, 600);
            });
        });
        document.querySelectorAll('.hire-me-cta-card .btn').forEach(function (button) {
            button.addEventListener('click', function () {
                var href = button.getAttribute('href') || '';
                track('hire_me_cta_click', {
                    button_type: href.includes('mail.google.com') ? 'gmail_compose' :
                        href.includes('linkedin.com') ? 'linkedin' : href.startsWith('mailto:') ? 'email' : 'other'
                });
            });
        });
        document.querySelectorAll('.service-card').forEach(function (card) {
            var timer;
            card.addEventListener('mouseenter', function () {
                timer = setTimeout(function () {
                    var heading = card.querySelector('h4');
                    track('service_card_interest', { service_name: heading ? heading.textContent.trim() : 'unknown' });
                }, 2000);
            });
            card.addEventListener('mouseleave', function () { clearTimeout(timer); });
        });

        var start = Date.now();
        var sent = {};
        setInterval(function () {
            var elapsed = Math.round((Date.now() - start) / 1000);
            [30, 60, 120, 300].forEach(function (seconds) {
                if (!sent[seconds] && elapsed >= seconds) {
                    sent[seconds] = true;
                    track('time_on_page', { seconds: seconds });
                }
            });
        }, 10000);
        window.addEventListener('beforeunload', function () {
            track('page_exit', { time_spent_sec: Math.round((Date.now() - start) / 1000) });
        });
    });
})();
