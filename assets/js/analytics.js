/* ═══════════════════════════════════════════════════════════════
   UPENDRA DEV PLATFORM — Analytics (GA4 Custom Events)
   Measurement ID: G-9YH1D05QCJ
   ─────────────────────────────────────────────────────────────
   Event Categories:
     navigation      — nav clicks, breadcrumbs, back-to-home
     engagement      — scroll depth, time on page, visibility
     tool_usage      — per-tool convert / encrypt / decrypt / load / clear
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
        if (p.includes('/yaml2props')) return 'yaml2props';
        if (p.includes('/props2yaml')) return 'props2yaml';
        if (p.includes('/yaml-tools')) return 'yaml_tools';
        if (p.includes('/xml-sdk')) return 'xml_sdk';
        if (p.includes('/gmail-url')) return 'gmail_url';
        if (p.includes('/salary-calc')) return 'salary_calc';
        if (p.includes('/mule2curl')) return 'mule2curl';
        if (p.includes('/curl2mule')) return 'curl2mule';
        if (p.includes('/raml2oas')) return 'raml2oas';
        if (p.includes('/cron-builder')) return 'cron_builder';
        if (p.includes('/base64-converter')) return 'base64_converter';
        if (p.includes('/secure-properties-generator')) return 'secure_properties';
        if (p.includes('/whatsapp-readmore')) return 'whatsapp_readmore';
        return 'home';
    })();

    /* ════════════════════════════════════════
       1. PAGE VIEW & INITIALIZATION
    ════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', function () {
        track('page_context', {
            page_tool: PAGE_TOOL,
            page_path: window.location.pathname,
            referrer: document.referrer ? new URL(document.referrer).hostname : 'direct',
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

        /* ── Fail-safe universal click tracker ── */
        wireUniversalClickTracker();

        /* ── Wire tool-specific function proxies ── */
        wireToolSpecificActions();
    });

    /* Also attempt wiring on window load to catch late inline scripts */
    window.addEventListener('load', function () {
        wireToolSpecificActions();
    });

    /* ════════════════════════════════════════
       2. FAIL-SAFE UNIVERSAL CLICK TRACKER
       Guarantees GA4 event calls fire whenever user
       clicks Convert, Encrypt, Decrypt, Run, Load, Clear, etc.
    ════════════════════════════════════════ */
    function wireUniversalClickTracker() {
        document.addEventListener('click', function (e) {
            var target = e.target.closest('button, a, input[type="button"], input[type="submit"], [role="button"], .btn, .btn-icon, .mode-btn, .type-tab, .source-btn, .btn-convert-middle, .mode-toggle-btn, .file-zone-card, .sk-save-btn, .sk-item');
            if (!target) return;

            var text = (target.textContent || target.value || target.title || '').trim();
            var textLower = text.toLowerCase();
            var id = (target.id || '').toLowerCase();
            var onclickAttr = (target.getAttribute('onclick') || '').toLowerCase();
            var titleAttr = (target.getAttribute('title') || '').toLowerCase();
            var ariaLabel = (target.getAttribute('aria-label') || '').toLowerCase();

            /* A. CONVERT / ENCRYPT / DECRYPT / RUN / CALCULATE / GENERATE / BUILD ACTIONS */
            if (
                textLower.includes('convert') || textLower.includes('encrypt') || textLower.includes('decrypt') ||
                textLower.includes('run') || textLower.includes('generate') || textLower.includes('calculate') ||
                textLower.includes('encode') || textLower.includes('decode') || textLower.includes('build') ||
                textLower.includes('flatten') || textLower.includes('add parameter') || textLower.includes('open in gmail') ||
                id.includes('convert') || id.includes('run') || id.includes('encrypt') || id.includes('decrypt') ||
                id.includes('generate') || id.includes('calc') || id.includes('encode') || id.includes('decode') ||
                onclickAttr.includes('convert') || onclickAttr.includes('runoperation') || onclickAttr.includes('encrypt') ||
                onclickAttr.includes('decrypt') || onclickAttr.includes('y2p_convert') || onclickAttr.includes('p2y_convert') ||
                onclickAttr.includes('generate') || onclickAttr.includes('calc') || onclickAttr.includes('encode') ||
                onclickAttr.includes('decode') || onclickAttr.includes('param_convert') || onclickAttr.includes('buildcron')
            ) {
                var actionType = 'convert';
                if (textLower.includes('encrypt') || id.includes('encrypt') || onclickAttr.includes('encrypt')) actionType = 'encrypt';
                else if (textLower.includes('decrypt') || id.includes('decrypt') || onclickAttr.includes('decrypt')) actionType = 'decrypt';
                else if (textLower.includes('generate') || id.includes('generate') || onclickAttr.includes('generate')) actionType = 'generate';
                else if (textLower.includes('calculate') || id.includes('calc') || onclickAttr.includes('calc')) actionType = 'calculate';
                else if (textLower.includes('encode') || onclickAttr.includes('encode')) actionType = 'encode';
                else if (textLower.includes('decode') || onclickAttr.includes('decode')) actionType = 'decode';

                track('tool_action_click', {
                    action_type: actionType,
                    button_text: text.substring(0, 50) || target.title || target.id,
                    button_id: target.id || 'none',
                    page_tool: PAGE_TOOL
                });

                // Also fire explicit top-level GA4 event names for simple reports
                if (actionType === 'encrypt') track('encrypt_click', { page_tool: PAGE_TOOL });
                else if (actionType === 'decrypt') track('decrypt_click', { page_tool: PAGE_TOOL });
                else if (actionType === 'convert') track('convert_click', { page_tool: PAGE_TOOL });
                else if (actionType === 'generate') track('generate_click', { page_tool: PAGE_TOOL });
                else if (actionType === 'calculate') track('calculate_click', { page_tool: PAGE_TOOL });
            }

            /* B. LOAD EXAMPLE / TEST VALUES / SAMPLES */
            if (
                textLower.includes('example') || textLower.includes('test value') || textLower.includes('sample') ||
                titleAttr.includes('example') || titleAttr.includes('sample') ||
                id.includes('example') || onclickAttr.includes('example') || onclickAttr.includes('loadtestvalues')
            ) {
                track('tool_load_example_click', {
                    button_text: text.substring(0, 50) || target.title || target.id,
                    page_tool: PAGE_TOOL
                });
                track('load_example_click', { page_tool: PAGE_TOOL });
            }

            /* C. CLEAR / RESET / TRASH */
            if (
                textLower.includes('clear') || textLower.includes('reset') ||
                titleAttr.includes('clear') || titleAttr.includes('reset') ||
                id.includes('clear') || onclickAttr.includes('clear') || onclickAttr.includes('reset') || onclickAttr.includes('op_reset')
            ) {
                track('tool_clear_click', {
                    button_text: text.substring(0, 50) || target.title || target.id,
                    page_tool: PAGE_TOOL
                });
                track('clear_click', { page_tool: PAGE_TOOL });
            }

            /* D. COPY TO CLIPBOARD */
            if (
                textLower.includes('copy') || titleAttr.includes('copy') ||
                id.includes('copy') || onclickAttr.includes('copy')
            ) {
                track('tool_copy_click', {
                    button_text: text.substring(0, 50) || target.title || target.id,
                    page_tool: PAGE_TOOL
                });
                track('copy_click', { page_tool: PAGE_TOOL });
            }

            /* E. DOWNLOAD */
            if (
                textLower.includes('download') || titleAttr.includes('download') ||
                id.includes('download') || onclickAttr.includes('download') || onclickAttr.includes('dodownload')
            ) {
                track('tool_download_click', {
                    button_text: text.substring(0, 50) || target.title || target.id,
                    page_tool: PAGE_TOOL
                });
                track('download_click', { page_tool: PAGE_TOOL });
            }

            /* F. MODE / TAB / OPTION CAPSULE SWITCHERS & SAVED KEYS */
            if (
                target.classList.contains('mode-btn') || target.classList.contains('type-tab') ||
                target.classList.contains('source-btn') || target.classList.contains('mode-toggle-btn') ||
                target.classList.contains('sk-save-btn') || target.classList.contains('sk-item')
            ) {
                track('tool_option_switch', {
                    option_name: text.substring(0, 50) || target.title || target.id,
                    page_tool: PAGE_TOOL
                });
            }
        });
    }

    /* ════════════════════════════════════════
       3. NAVIGATION EVENTS
    ════════════════════════════════════════ */
    function wireNavigation() {
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

        var logo = document.querySelector('.nav-logo');
        if (logo) {
            logo.addEventListener('click', function () {
                track('nav_logo_click', { from_tool: PAGE_TOOL });
            });
        }

        var breadcrumbs = document.querySelectorAll('.tool-breadcrumb a');
        breadcrumbs.forEach(function (bc) {
            bc.addEventListener('click', function () {
                track('breadcrumb_click', {
                    link_text: bc.textContent.trim(),
                    page_tool: PAGE_TOOL,
                });
            });
        });
    }

    /* ════════════════════════════════════════
       4. SOCIAL LINKS
    ════════════════════════════════════════ */
    function wireSocialLinks() {
        var socialLinks = document.querySelectorAll('.social-link');
        socialLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                track('social_click', {
                    platform: link.getAttribute('title') || link.href,
                    page_tool: PAGE_TOOL,
                });
            });
        });
    }

    /* ════════════════════════════════════════
       5. THEME TOGGLE
    ════════════════════════════════════════ */
    function wireThemeToggle() {
        var toggles = document.querySelectorAll('.theme-toggle');
        toggles.forEach(function (toggle) {
            toggle.addEventListener('click', function () {
                setTimeout(function () {
                    var currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
                    track('theme_toggle', {
                        new_theme: currentTheme,
                        page_tool: PAGE_TOOL,
                    });
                }, 50);
            });
        });
    }

    /* ════════════════════════════════════════
       6. SCROLL DEPTH
    ════════════════════════════════════════ */
    function wireScrollDepth() {
        var milestones = { 25: false, 50: false, 75: false, 100: false };

        function onScroll() {
            var h = document.documentElement;
            var b = document.body;
            var st = h.scrollTop || b.scrollTop;
            var sh = h.scrollHeight || b.scrollHeight;
            var ch = h.clientHeight;
            var pct = Math.round((st / (sh - ch)) * 100);

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
       7. PUBLICATIONS & ARTICLES
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
       8. GENERIC FORM & UI INTERACTIONS
    ════════════════════════════════════════ */
    function wireToolActions() {
        var trackedBtns = document.querySelectorAll('[data-track]');
        trackedBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                track(btn.getAttribute('data-track'), {
                    page_tool: PAGE_TOOL,
                    label: btn.getAttribute('data-track-label') || btn.textContent.trim(),
                });
            });
        });

        var tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                track('tab_switch', {
                    tab_name: btn.textContent.trim(),
                    page_tool: PAGE_TOOL,
                });
            });
        });

        var fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(function (input) {
            input.addEventListener('change', function () {
                if (input.files && input.files[0]) {
                    var sizeKB = Math.round(input.files[0].size / 1024);
                    track('file_upload', {
                        file_type: input.files[0].name.split('.').pop(),
                        file_size_bucket: sizeKB < 10 ? '<10KB' : sizeKB < 100 ? '<100KB' : sizeKB < 1024 ? '<1MB' : '>=1MB',
                        page_tool: PAGE_TOOL,
                    });
                }
            });
        });

        var checkboxes = document.querySelectorAll('.options-bar input[type="checkbox"], .option-row input[type="checkbox"], .switch input[type="checkbox"]');
        checkboxes.forEach(function (cb) {
            cb.addEventListener('change', function () {
                track('option_toggle', {
                    option_id: cb.id || 'unknown',
                    checked: cb.checked,
                    page_tool: PAGE_TOOL,
                });
            });
        });

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
    }

    /* ════════════════════════════════════════
       9. TIME ON PAGE / ENGAGEMENT
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

        window.addEventListener('beforeunload', function () {
            var elapsed = Math.round((Date.now() - START) / 1000);
            track('page_exit', {
                time_spent_sec: elapsed,
                page_tool: PAGE_TOOL,
            });
        });
    }

    /* ════════════════════════════════════════
       10. EXTERNAL LINKS
    ════════════════════════════════════════ */
    function wireExternalLinks() {
        document.addEventListener('click', function (e) {
            var link = e.target.closest('a[target="_blank"]');
            if (!link) return;
            var href = link.href || '';
            if (link.classList.contains('social-link') ||
                link.classList.contains('pub-card') ||
                link.classList.contains('related-tool-link') ||
                link.classList.contains('blog-card')) return;

            try {
                var extUrl = new URL(href);
                track('external_link_click', {
                    href_host: extUrl.hostname,
                    href_path: extUrl.pathname,
                    link_text: link.textContent.trim().substring(0, 60),
                    page_tool: PAGE_TOOL,
                });
            } catch (err) { }
        });
    }

    /* ════════════════════════════════════════
       11. FILTER / SEARCH INPUT
    ════════════════════════════════════════ */
    function wireSearchOrFilter() {
        var filterInputs = document.querySelectorAll('#filterProp, .filter-input, #tool-search');
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
       12. HIRE ME SECTION
    ════════════════════════════════════════ */
    function wireHireMeSection() {
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
                }, 2000);
            });
            card.addEventListener('mouseleave', function () {
                clearTimeout(hoverTimer);
            });
        });
    }

    /* ════════════════════════════════════════
       13. DYNAMIC GLOBAL FUNCTION PROXY INTERCEPTOR
       Interceptors for inline tool function calls
    ════════════════════════════════════════ */
    function wireGlobalFn(fnName, eventName, paramsFn, debounced) {
        var debounceTimer;

        function attachProxy() {
            if (typeof window[fnName] !== 'function') return false;
            if (window[fnName]._ga_tracked) return true; // already attached

            var original = window[fnName];
            var proxied = function () {
                var args = arguments;
                var result = original.apply(this, args);

                if (debounced) {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(function () {
                        var params = Object.assign({ page_tool: PAGE_TOOL }, paramsFn ? paramsFn(args) : {});
                        track(eventName, params);
                    }, 800);
                } else {
                    var params = Object.assign({ page_tool: PAGE_TOOL }, paramsFn ? paramsFn(args) : {});
                    track(eventName, params);
                }
                return result;
            };
            proxied._ga_tracked = true;
            window[fnName] = proxied;
            return true;
        }

        if (!attachProxy()) {
            window.addEventListener('load', attachProxy);
            setTimeout(attachProxy, 300);
            setTimeout(attachProxy, 1000);
            setTimeout(attachProxy, 2500);
        }
    }

    /* ════════════════════════════════════════
       14. TOOL-SPECIFIC GRANULAR FUNCTION PROXIES
    ════════════════════════════════════════ */
    function wireToolSpecificActions() {

        /* ── Secure Properties Generator ── */
        if (PAGE_TOOL === 'secure_properties') {
            wireGlobalFn('runOperation', 'secure_properties_run', function () {
                var algo = document.getElementById('sel-algo');
                var mode = document.getElementById('sel-mode');
                var inpStr = document.getElementById('inp-string');
                var inpVal = document.getElementById('inp-value');
                return {
                    algorithm: algo ? algo.value : 'AES',
                    operation_mode: mode ? mode.value : 'CBC',
                    input_length: (inpStr && inpStr.value ? inpStr.value.length : 0) || (inpVal && inpVal.value ? inpVal.value.length : 0)
                };
            });
            wireGlobalFn('setMode', 'secure_properties_mode_set', function (args) {
                return { mode: args && args[0] ? args[0] : 'unknown' };
            });
            wireGlobalFn('setInputType', 'secure_properties_input_type_set', function (args) {
                return { input_type: args && args[0] ? args[0] : 'unknown' };
            });
            wireGlobalFn('generateRandomKey', 'secure_properties_gen_key', function () { return {}; });
            wireGlobalFn('generateRandomValue', 'secure_properties_gen_val', function () { return {}; });
            wireGlobalFn('clearAll', 'secure_properties_clear', function () { return {}; });
            wireGlobalFn('downloadResult', 'secure_properties_download', function () { return {}; });
            wireGlobalFn('copyResult', 'secure_properties_copy', function (args) {
                return { wrapped: args && args[0] ? true : false };
            });
        }

        /* ── JSON2RAML ── */
        if (PAGE_TOOL === 'json2raml') {
            wireGlobalFn('convert', 'json2raml_converted', function () {
                var jsonInput = document.getElementById('json-input');
                var ramlOutput = document.getElementById('raml-output');
                return {
                    input_length: jsonInput ? jsonInput.value.length : 0,
                    output_length: ramlOutput ? ramlOutput.value.length : 0
                };
            });
            wireGlobalFn('convertJsonToRaml', 'json2raml_converted', function () { return {}; });
            wireGlobalFn('loadExample', 'json2raml_load_example', function () { return {}; });
            wireGlobalFn('clearContents', 'json2raml_cleared', function () { return {}; });
            wireGlobalFn('copyRaml', 'json2raml_copied', function () { return {}; });
            wireGlobalFn('downloadRaml', 'json2raml_downloaded', function () { return {}; });
        }

        /* ── YAML Tools / YAML2Props / Props2YAML ── */
        if (PAGE_TOOL === 'yaml_tools' || PAGE_TOOL === 'yaml2props' || PAGE_TOOL === 'props2yaml') {
            wireGlobalFn('y2p_convert', 'converted_yaml_to_properties', function () {
                var keysOnly = document.getElementById('keysOnly');
                return { keys_only: keysOnly ? keysOnly.checked : false };
            });
            wireGlobalFn('p2y_convert', 'converted_properties_to_yaml', function () { return {}; });
            wireGlobalFn('y2p_loadExample', 'yaml_tools_load_example_y2p', function () { return {}; });
            wireGlobalFn('p2y_loadExample', 'yaml_tools_load_example_p2y', function () { return {}; });
            wireGlobalFn('y2p_clear', 'yaml_tools_clear_y2p', function () { return {}; });
            wireGlobalFn('p2y_clear', 'yaml_tools_clear_p2y', function () { return {}; });
            wireGlobalFn('y2p_copy', 'yaml_tools_copied_properties', function () { return {}; });
            wireGlobalFn('p2y_copy', 'yaml_tools_copied_yaml', function () { return {}; });
            wireGlobalFn('y2p_doDownload', 'yaml_tools_downloaded_properties', function () { return {}; });
            wireGlobalFn('p2y_download', 'yaml_tools_downloaded_yaml', function () { return {}; });
        }

        /* ── Mule2cURL ── */
        if (PAGE_TOOL === 'mule2curl') {
            wireGlobalFn('convertMuleToCurl', 'mule2curl_converted', function () { return {}; });
            wireGlobalFn('loadExample', 'mule2curl_load_example', function () { return {}; });
            wireGlobalFn('clearInput', 'mule2curl_clear', function () { return {}; });
            wireGlobalFn('copyCurl', 'mule2curl_copied', function () { return {}; });
        }

        /* ── cURL2Mule ── */
        if (PAGE_TOOL === 'curl2mule') {
            wireGlobalFn('convertCurlToMule', 'curl2mule_converted', function () { return {}; });
            wireGlobalFn('loadExample', 'curl2mule_load_example', function () { return {}; });
            wireGlobalFn('clearInput', 'curl2mule_clear', function () { return {}; });
            wireGlobalFn('copyMuleXml', 'curl2mule_copied', function () { return {}; });
        }

        /* ── RAML2OAS ── */
        if (PAGE_TOOL === 'raml2oas') {
            wireGlobalFn('convertRaml', 'raml2oas_converted', function () { return {}; });
            wireGlobalFn('loadExample', 'raml2oas_load_example', function () { return {}; });
            wireGlobalFn('copyOutput', 'raml2oas_copied', function () { return {}; });
            wireGlobalFn('downloadOutput', 'raml2oas_downloaded', function () { return {}; });
        }

        /* ── Cron Builder ── */
        if (PAGE_TOOL === 'cron_builder') {
            wireGlobalFn('buildCron', 'cron_builder_built', function () { return {}; });
            wireGlobalFn('copyCron', 'cron_builder_copied', function () { return {}; });
        }

        /* ── Base64 Converter ── */
        if (PAGE_TOOL === 'base64_converter') {
            wireGlobalFn('encodeBase64', 'base64_encoded', function () { return {}; });
            wireGlobalFn('decodeBase64', 'base64_decoded', function () { return {}; });
            wireGlobalFn('loadExample', 'base64_load_example', function () { return {}; });
            wireGlobalFn('clearAll', 'base64_clear', function () { return {}; });
            wireGlobalFn('copyOutput', 'base64_copied', function () { return {}; });
        }

        /* ── XML SDK ── */
        if (PAGE_TOOL === 'xml_sdk') {
            wireGlobalFn('param_convert', 'xml_sdk_parameter_added', function () { return {}; });
            wireGlobalFn('op_reset', 'xml_sdk_operation_reset', function () { return {}; });
            wireGlobalFn('resetAll', 'xml_sdk_reset_all', function () { return {}; });
            wireGlobalFn('copyXML', 'xml_sdk_copied_xml', function () { return {}; });
            wireGlobalFn('downloadXML', 'xml_sdk_downloaded_xml', function () { return {}; });
        }

        /* ── Gmail URL ── */
        if (PAGE_TOOL === 'gmail_url') {
            wireGlobalFn('generateURL', 'gmail_url_generated', function () { return {}; });
            wireGlobalFn('openGmail', 'gmail_url_opened_in_gmail', function () { return {}; });
            wireGlobalFn('loadTestValues', 'gmail_url_loaded_test_values', function () { return {}; });
            wireGlobalFn('clearForm', 'gmail_url_cleared_form', function () { return {}; });
            wireGlobalFn('copyUrl', 'gmail_url_copied', function () { return {}; });
        }

        /* ── Salary Calc ── */
        if (PAGE_TOOL === 'salary_calc') {
            wireGlobalFn('calc', 'salary_calc_calculated', function () { return {}; }, true);
        }

        /* ── WhatsApp Read More ── */
        if (PAGE_TOOL === 'whatsapp_readmore') {
            wireGlobalFn('generateReadMore', 'whatsapp_readmore_generated', function () { return {}; });
            wireGlobalFn('copyResult', 'whatsapp_readmore_copied', function () { return {}; });
        }
    }

    /* ════════════════════════════════════════
       15. PUBLIC HELPERS — called from inline scripts
    ════════════════════════════════════════ */
    window.track_event = function (eventName, params) {
        var merged = Object.assign({ page_tool: PAGE_TOOL }, params || {});
        track(eventName, params ? eventName : 'custom_event', merged);
    };

})();
