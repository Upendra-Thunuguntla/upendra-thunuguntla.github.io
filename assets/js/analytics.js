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
     hire_me         — hire me section interactions
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
        if (p.includes('/mule2curl')) return 'mule2curl';
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
        wireHireMeSection();
        wireToolSpecificActions();
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

        /* Blog cards on tool pages */
        var blogCards = document.querySelectorAll('.blog-card');
        blogCards.forEach(function (card) {
            card.addEventListener('click', function () {
                var titleEl = card.querySelector('.blog-card-title');
                track('blog_card_click', {
                    blog_title: titleEl ? titleEl.textContent.trim() : 'unknown',
                    blog_href: card.href,
                    page_tool: PAGE_TOOL,
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
                        file_name: input.files[0].name,
                        file_size_bytes: input.files[0].size,
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
                    option_label: cb.nextElementSibling ? cb.nextElementSibling.textContent.trim().substring(0, 60) : '',
                    checked: cb.checked,
                    page_tool: PAGE_TOOL,
                });
            });
        });

        /* Details / accordion (XML SDK optional fields, FAQ) */
        var details = document.querySelectorAll('details');
        details.forEach(function (d) {
            d.addEventListener('toggle', function () {
                var summaryEl = d.querySelector('summary');
                track('accordion_toggle', {
                    open: d.open,
                    summary_text: summaryEl ? summaryEl.textContent.trim().substring(0, 80) : '',
                    section: d.classList.contains('faq-item') ? 'faq' : 'tool_options',
                    page_tool: PAGE_TOOL,
                });
            });
        });

        /* Select dropdown changes in forms */
        var selects = document.querySelectorAll('.form-control[id]');
        selects.forEach(function (sel) {
            if (sel.tagName === 'SELECT') {
                sel.addEventListener('change', function () {
                    track('select_change', {
                        select_id: sel.id,
                        selected_value: sel.value,
                        page_tool: PAGE_TOOL,
                    });
                });
            }
        });

        /* Textarea focus tracking — user started working */
        var textareas = document.querySelectorAll('.code-textarea, .code-output');
        textareas.forEach(function (ta) {
            var hasFired = false;
            ta.addEventListener('focus', function () {
                if (!hasFired) {
                    hasFired = true;
                    track('textarea_focus', {
                        textarea_id: ta.id || 'unknown',
                        page_tool: PAGE_TOOL,
                    });
                }
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
                link.classList.contains('related-tool-link') ||
                link.classList.contains('blog-card')) return;

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
       11. HIRE ME SECTION
    ════════════════════════════════════════ */
    function wireHireMeSection() {
        /* Hire Me CTA buttons */
        var hireMeLinks = document.querySelectorAll('.hire-me-cta-card .btn');
        hireMeLinks.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var btnText = btn.textContent.trim();
                var isGmail = btn.href && btn.href.includes('mail.google.com');
                var isLinkedIn = btn.href && btn.href.includes('linkedin.com');
                var isMailto = btn.href && btn.href.startsWith('mailto:');

                track('hire_me_cta_click', {
                    button_text: btnText,
                    button_type: isGmail ? 'gmail_compose' : isLinkedIn ? 'linkedin' : isMailto ? 'email' : 'other',
                    page_tool: PAGE_TOOL,
                });
            });
        });

        /* Service card visibility / interest (hover tracking) */
        var serviceCards = document.querySelectorAll('.service-card');
        serviceCards.forEach(function (card) {
            var hoverTimer;
            card.addEventListener('mouseenter', function () {
                hoverTimer = setTimeout(function () {
                    var h4 = card.querySelector('h4');
                    track('service_card_interest', {
                        service_name: h4 ? h4.textContent.trim() : 'unknown',
                        page_tool: PAGE_TOOL,
                    });
                }, 2000); // Only track if hovered for 2+ seconds (genuine interest)
            });
            card.addEventListener('mouseleave', function () {
                clearTimeout(hoverTimer);
            });
        });

        /* Contact section CTA buttons */
        var contactBtns = document.querySelectorAll('#contact .btn');
        contactBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                track('contact_cta_click', {
                    button_text: btn.textContent.trim(),
                    button_href: btn.href || '',
                    page_tool: PAGE_TOOL,
                });
            });
        });
    }

    /* ════════════════════════════════════════
       12. TOOL-SPECIFIC GRANULAR TRACKING
       ─── JSON2RAML ───────────────────────
       ─── YAML Tools ──────────────────────
       ─── XML SDK ─────────────────────────
       ─── Gmail URL ───────────────────────
       ─── Salary Calc ─────────────────────
    ════════════════════════════════════════ */
    function wireToolSpecificActions() {

        /* ─── JSON2RAML Tool Actions ─── */
        if (PAGE_TOOL === 'json2raml') {
            wireBtn('convert', 'converted_to_raml', function () {
                var jsonInput = document.getElementById('json-input');
                var ramlOutput = document.getElementById('raml-output');
                var keysOptional = document.getElementById('areKeysOptional');
                var keysCamelCase = document.getElementById('areKeysCamelCased');
                return {
                    input_length: jsonInput ? jsonInput.value.length : 0,
                    output_length: ramlOutput ? ramlOutput.value.length : 0,
                    keys_optional: keysOptional ? keysOptional.checked : false,
                    keys_camelcase: keysCamelCase ? keysCamelCase.checked : false,
                    has_output: ramlOutput ? ramlOutput.value.length > 0 : false,
                };
            });

            // Track option changes specifically
            wireCheckbox('areKeysOptional', 'json2raml_option_optional_keys');
            wireCheckbox('areKeysCamelCased', 'json2raml_option_camelcase_keys');

            // Track Load Example
            wireBtnById(null, 'json2raml_load_example', function () { return {}; }, '.panel-actions .btn-ghost');

            // Track Copy
            wireBtnById('copy-btn', 'json2raml_copied_raml', function () {
                var ramlOutput = document.getElementById('raml-output');
                return { output_length: ramlOutput ? ramlOutput.value.length : 0 };
            });

            // Track Download
            wireBtnByText('Download .raml', 'json2raml_downloaded_raml', function () {
                return {};
            });
        }

        /* ─── YAML Tools Actions ─── */
        if (PAGE_TOOL === 'yaml_tools') {
            // YAML → Properties conversion
            wireGlobalFn('y2p_convert', 'converted_yaml_to_properties', function () {
                var keysOnly = document.getElementById('keysOnly');
                var addGenericProp = document.getElementById('addGenericProp');
                var addMuleProp = document.getElementById('addMuleProp');
                return {
                    keys_only: keysOnly ? keysOnly.checked : false,
                    generic_prop_format: addGenericProp ? addGenericProp.checked : false,
                    mule_p_format: addMuleProp ? addMuleProp.checked : false,
                };
            });

            // Properties → YAML conversion
            wireGlobalFn('p2y_convert', 'converted_properties_to_yaml', function () {
                var propInput = document.getElementById('propTextarea');
                return {
                    input_length: propInput ? propInput.value.length : 0,
                    input_lines: propInput ? propInput.value.split('\n').length : 0,
                };
            });

            // Track option checkboxes
            wireCheckbox('keysOnly', 'yaml_tools_option_keys_only');
            wireCheckbox('addGenericProp', 'yaml_tools_option_generic_prop_format');
            wireCheckbox('addMuleProp', 'yaml_tools_option_mule_p_format');

            // Track YAML remove values
            wireGlobalFn('y2p_removeValues', 'yaml_tools_remove_values', function () { return {}; });

            // Track copy actions
            wireBtnById('y2p-copy-btn', 'yaml_tools_copied_properties', function () {
                var output = document.getElementById('propertiesOutput');
                return { output_length: output ? output.value.length : 0 };
            });
            wireBtnById('p2y-copy-btn', 'yaml_tools_copied_yaml', function () {
                var output = document.getElementById('yamlOutput');
                return { output_length: output ? output.value.length : 0 };
            });

            // Track downloads
            wireGlobalFn('y2p_doDownload', 'yaml_tools_downloaded_properties', function () { return {}; });
            wireGlobalFn('p2y_download', 'yaml_tools_downloaded_yaml', function () { return {}; });

            // Track tab switches
            wireGlobalFn('switchTab', 'yaml_tools_tab_switch', function (args) {
                return { tab_id: args && args[0] ? args[0] : 'unknown' };
            });
        }

        /* ─── XML SDK Actions ─── */
        if (PAGE_TOOL === 'xml_sdk') {
            // Track operation name set
            wireGlobalFn('op_name_change', 'xml_sdk_operation_name_set', function (args) {
                return { operation_name: args && args[0] ? args[0] : '' };
            });

            // Track operation description set
            wireGlobalFn('op_desc_change', 'xml_sdk_operation_description_set', function () { return {}; });

            // Track parameter added
            wireGlobalFn('param_convert', 'xml_sdk_parameter_added', function () {
                var paramName = document.getElementById('param_name');
                var paramType = document.getElementById('param_type');
                var paramRole = document.getElementById('param_role');
                var paramUse = document.getElementById('param_use');
                return {
                    param_name: paramName ? paramName.value : '',
                    param_type: paramType ? paramType.value : '',
                    param_role: paramRole ? paramRole.value : '',
                    param_required: paramUse ? paramUse.value : '',
                };
            });

            // Track reset
            wireGlobalFn('resetAll', 'xml_sdk_reset_all', function () { return {}; });
            wireGlobalFn('op_reset', 'xml_sdk_operation_reset', function () { return {}; });

            // Track copy
            wireBtnById('xml-copy-btn', 'xml_sdk_copied_xml', function () {
                var xmlOutput = document.getElementById('xml-output');
                return { output_length: xmlOutput ? xmlOutput.value.length : 0 };
            });

            // Track download
            wireGlobalFn('downloadXML', 'xml_sdk_downloaded_xml', function () { return {}; });

            // Track tab switch
            wireGlobalFn('switchTab', 'xml_sdk_tab_switch', function (args) {
                return { tab_id: args && args[0] ? args[0] : 'unknown' };
            });
        }

        /* ─── Gmail URL Actions ─── */
        if (PAGE_TOOL === 'gmail_url') {
            // Track URL generated
            wireGlobalFn('generateURL', 'gmail_url_generated', function () {
                var to = document.getElementById('gmail-to');
                var cc = document.getElementById('gmail-cc');
                var bcc = document.getElementById('gmail-bcc');
                var subject = document.getElementById('gmail-subject');
                var body = document.getElementById('gmail-body');
                return {
                    has_to: to ? to.value.trim().length > 0 : false,
                    has_cc: cc ? cc.value.trim().length > 0 : false,
                    has_bcc: bcc ? bcc.value.trim().length > 0 : false,
                    subject_length: subject ? subject.value.length : 0,
                    body_length: body ? body.value.length : 0,
                    recipient_count: to ? to.value.split(',').filter(function (e) { return e.trim(); }).length : 0,
                };
            });

            // Track Open in Gmail
            wireGlobalFn('openGmail', 'gmail_url_opened_in_gmail', function () { return {}; });

            // Track Copy URL
            wireBtnById('copy-url-btn', 'gmail_url_copied', function () { return {}; });

            // Track Load Test Values
            wireGlobalFn('loadTestValues', 'gmail_url_loaded_test_values', function () { return {}; });

            // Track Clear
            wireGlobalFn('clearForm', 'gmail_url_cleared_form', function () { return {}; });
        }

        /* ─── Salary Calc Actions ─── */
        if (PAGE_TOOL === 'salary_calc') {
            // Track calculations (debounced to avoid spamming on every keystroke)
            var calcDebounce;
            wireGlobalFn('calc', 'salary_calc_calculated', function () {
                var currentEl = document.getElementById('current-salary');
                var revisedEl = document.getElementById('revised-salary');
                var pctEl = document.getElementById('hike-percentage');
                var resultEl = document.getElementById('hike-result');
                return {
                    has_current: currentEl ? currentEl.value.length > 0 : false,
                    has_revised: revisedEl ? revisedEl.value.length > 0 : false,
                    has_hike_pct: pctEl ? pctEl.value.length > 0 : false,
                    result_text: resultEl ? resultEl.textContent.trim() : '',
                    calculation_mode: revisedEl && revisedEl.value ? 'revised_to_pct' : 'pct_to_revised',
                };
            }, true); // debounced = true
        }
    }

    /* ── Helper: wire a button by ID ── */
    function wireBtnById(id, eventName, paramsFn) {
        if (!id) return;
        var btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', function () {
                var params = Object.assign({ page_tool: PAGE_TOOL }, paramsFn ? paramsFn() : {});
                track(eventName, params);
            });
        }
    }

    /* ── Helper: wire a button by text content ── */
    function wireBtnByText(text, eventName, paramsFn) {
        var btns = document.querySelectorAll('.btn');
        btns.forEach(function (btn) {
            if (btn.textContent.trim().includes(text)) {
                btn.addEventListener('click', function () {
                    var params = Object.assign({ page_tool: PAGE_TOOL }, paramsFn ? paramsFn() : {});
                    track(eventName, params);
                });
            }
        });
    }

    /* ── Helper: wire a checkbox by ID ── */
    function wireCheckbox(id, eventName) {
        var cb = document.getElementById(id);
        if (cb) {
            cb.addEventListener('change', function () {
                track(eventName, {
                    checked: cb.checked,
                    page_tool: PAGE_TOOL,
                });
            });
        }
    }

    /* ── Helper: wire a button matching onclick function name ── */
    function wireBtn(fnName, eventName, paramsFn) {
        var btns = document.querySelectorAll('[onclick*="' + fnName + '"]');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var params = Object.assign({ page_tool: PAGE_TOOL }, paramsFn ? paramsFn() : {});
                track(eventName, params);
            });
        });
    }

    /* ── Helper: intercept a global function ── */
    function wireGlobalFn(fnName, eventName, paramsFn, debounced) {
        if (typeof window[fnName] !== 'function') return;
        var original = window[fnName];
        var debounceTimer;
        window[fnName] = function () {
            var args = arguments;
            var result = original.apply(this, args);

            if (debounced) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(function () {
                    var params = Object.assign({ page_tool: PAGE_TOOL }, paramsFn ? paramsFn(args) : {});
                    track(eventName, params);
                }, 1000);
            } else {
                var params = Object.assign({ page_tool: PAGE_TOOL }, paramsFn ? paramsFn(args) : {});
                track(eventName, params);
            }
            return result;
        };
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
