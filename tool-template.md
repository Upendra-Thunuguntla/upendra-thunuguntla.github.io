# Developer Tool Template & Specification (`tool-template.md`)

This document serves as the master specification, blueprint, and implementation guideline for creating new developer utilities on [Upendra.dev](https://upendra-thunuguntla.github.io/). It is 100% LLM-readable and structured to allow any agent or human developer to instantly build, refine, and validate a tool with zero regressions.

---

## 1. Directory Structure & File Placement

Every tool must be self-contained in its own subdirectory under `/tools/` using a slug-based folder name (e.g., `/tools/mule-log-parser/`).

```text
upendra-thunuguntla.github.io/
├── assets/
│   ├── css/
│   │   ├── core.css           # Global typography, color variables, shared styles
│   │   ├── home.css           # Homepage styling and animations
│   │   └── tool.css           # Shared developer tool styles, layouts, grids, sections
│   └── js/
│       ├── theme.js           # Theme engine (Light/Dark toggle, local link overrides)
│       ├── platform.js        # Shared utilities (copyToClipboard, showToast, downloadFile)
│       ├── blogs-loader.js    # Dynamic blog loading framework
│       └── analytics.js       # Global event tracking helper
├── tools/
│   └── [tool-slug]/           # Tool-specific folder
│       ├── index.html         # Main UI layout, SEO metadata, Structured Data
│       ├── script.js          # Core logic, input listeners, DOM interactions
│       ├── style.css          # Optional: Tool-specific override styles
│       └── README.md          # Description, live links, and features
```

---

## 2. Core Philosophy & Architectural Standards

### Client-Side Processing Only
- **Zero Backend Dependability:** All tools must operate entirely in-browser. Payloads, keys, logs, or sensitive configs **must never** be sent to any server.
- **Data Privacy Compliance:** Emphasize to the user and in structured data that operations run 100% locally.
- **Storage Policy:** Use local state variables. If caching settings or keys is requested, store them locally in `localStorage` under a prefixed key specific to the tool (e.g., `upendra-tool-[tool-slug]-key`).

### CSS Strategy: Common vs. Separate CSS
- **Leverage Common CSS (`/assets/css/core.css` and `/assets/css/tool.css`):** Do not write custom styles for standard layouts, page headers, breadcrumbs, inputs, textareas, code blocks, buttons, sections, or footers. The classes are predefined and adapt automatically to themes.
- **Use Separate CSS (`style.css` in tool folder):** Create a local `style.css` **only** if the tool introduces unique visual elements not represented in the common library (e.g., specific cryptography configuration cards, custom interactive sliders, parsed result breakdown tables, visual nodes). All rules in local files must reference CSS custom variables (tokens) from `core.css` to respect light/dark themes.

---

## 3. HTML Blueprint (`index.html`)

Below is the complete boilerplate for a tool. It handles SEO, structured schemas, global scripts, navigation headers, common layout grids, section styling, support banners, and scripts in order.

```html
<!DOCTYPE html>
<html lang="en" data-theme="">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- SEO & AEO Title Structure -->
    <title>[Tool Title] | [Target Keyword/Sub-keywords] | Upendra.dev</title>
    
    <!-- Meta Descriptions (Keep under 160 characters, highlight privacy & function) -->
    <meta name="description"
        content="Free [Tool Name] for developers. [Primary Action Statement]. 100% client-side, browser-local processing for absolute data security.">
    
    <!-- Brand / Identity Elements -->
    <link rel="icon" href="/portfolio.png" type="image/png">
    <link rel="manifest" href="/manifest.json">
    <link rel="canonical" href="https://upendra-thunuguntla.github.io/tools/[tool-slug]/">
    
    <!-- Pre-render Theme Injection (Important: Prevents page flash) -->
    <script src="/assets/js/theme.js"></script>
    
    <!-- Global CSS Hierarchy -->
    <link rel="stylesheet" href="/assets/css/core.css">
    <link rel="stylesheet" href="/assets/css/home.css">
    <link rel="stylesheet" href="/assets/css/tool.css">
    
    <!-- Optional: Tool-specific stylesheet override -->
    <link rel="stylesheet" href="style.css">
    
    <!-- FontAwesome Library (Icons) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        crossorigin="anonymous">
        
    <!-- Google Analytics (GA4) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-9YH1D05QCJ"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'G-9YH1D05QCJ');
    </script>

    <!-- Schema.org JSON-LD Structured Data for Rich Snippets & LLM Query Engines (AEO) -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "[Tool Title]",
        "description": "[Comprehensive meta description]",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "All",
        "url": "https://upendra-thunuguntla.github.io/tools/[tool-slug]/",
        "author": {
            "@type": "Person",
            "name": "Upendra Venkata Muralidhar Thunuguntla"
        }
    }
    </script>
</head>

<body class="tool-page">

    <!-- Global Navigation Menu -->
    <nav class="nav" role="navigation" aria-label="Main navigation">
        <div class="nav-inner">
            <a href="/" class="nav-logo" aria-label="Home">Upendra.dev</a>
            <ul class="nav-links" id="nav-links">
                <li><a href="/#tools">🛠 All Tools</a></li>
                <li><a href="/#about">👤 About</a></li>
                <li><a href="/#contact">📬 Contact</a></li>
            </ul>
            <div class="nav-actions">
                <button class="theme-toggle" aria-label="Toggle theme" title="Toggle theme">☀️</button>
                <button class="nav-hamburger" id="nav-hamburger" aria-expanded="false" aria-label="Open menu">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
    </nav>

    <!-- Tool Hero Banner (Breadcrumbs, Title, Sub-desc, Badge Tags) -->
    <div class="tool-hero">
        <div class="container">
            <nav class="tool-breadcrumb" aria-label="Breadcrumb">
                <a href="/">Home</a><span class="tool-breadcrumb-sep">/</span>
                <a href="/#tools">Tools</a><span class="tool-breadcrumb-sep">/</span>
                <span>[Tool Name]</span>
            </nav>
            <div class="tool-hero-inner">
                <div class="tool-page-icon" aria-hidden="true">[Representative Emoji]</div>
                <div class="tool-hero-text">
                    <h1>[Tool Title]</h1>
                    <p>[Main action description detailing benefits, compatibility, and speed.]</p>
                    
                    <!-- Meta Badges -->
                    <div style="display:flex; gap:var(--space-sm); flex-wrap:wrap; margin-top:var(--space-md);">
                        <span class="badge">[Category Label, e.g. MuleSoft]</span>
                        <span class="badge badge-purple">[Feature Label, e.g. DataWeave]</span>
                        <span class="badge badge-success">🟢 Active</span>
                        <span class="badge badge-info">🔒 100% Client-Side</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Workspace Section -->
    <div class="tool-workspace">
        <div class="container">
            
            <!-- OPTIONAL: Collapsible Help/Alert Banner -->
            <details class="debug-banner-collapsible" style="margin-bottom: var(--space-lg);">
                <summary class="debug-banner-summary">
                    <span class="debug-banner-summary-left">
                        <i class="fas fa-info-circle"></i>
                        Quick Configuration Guide
                    </span>
                    <span class="debug-banner-summary-right">
                        <span class="debug-banner-hint">expand for setup details</span>
                        <i class="fas fa-chevron-down debug-chevron"></i>
                    </span>
                </summary>
                <div style="padding: var(--space-md); font-size: 0.85rem; color: var(--text-subtle);">
                    <!-- Insert Setup Code or Configuration Snippet -->
                </div>
            </details>

            <!-- 2-Column Split Workspace (Left: Input | Right: Output) -->
            <div class="workspace-grid">

                <!-- Left Column Panel: Input Area -->
                <div class="workspace-panel">
                    <div class="panel-header">
                        <span class="panel-title"><i class="fas fa-code"></i> Source Input</span>
                        <div class="panel-actions">
                            <button id="btn-load-example" class="btn btn-ghost btn-sm" title="Load Example data" onclick="loadExample()">
                                <i class="fas fa-bolt"></i> Example
                            </button>
                            <button id="btn-clear-all" class="btn btn-ghost btn-sm" title="Clear inputs" onclick="clearAll()">
                                <i class="fas fa-trash-alt"></i> Clear
                            </button>
                        </div>
                    </div>
                    <div class="editor-wrapper">
                        <!-- Standard inputs must use ID mapping and proper classes -->
                        <textarea id="text-input" class="code-textarea" placeholder="Paste source contents here..." aria-label="Source Input Area"></textarea>
                    </div>
                </div>

                <!-- Right Column Panel: Output Area -->
                <div class="workspace-panel">
                    <div class="panel-header">
                        <span class="panel-title"><i class="fas fa-poll-h"></i> Converted Output</span>
                        <div class="panel-actions">
                            <button id="btn-copy" class="btn btn-ghost btn-sm" title="Copy to clipboard" onclick="copyResult()">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                            <button id="btn-download" class="btn btn-ghost btn-sm" title="Download output file" onclick="downloadResult()">
                                <i class="fas fa-download"></i> Download
                            </button>
                        </div>
                    </div>
                    <div class="editor-wrapper">
                        <textarea id="text-output" class="code-output" readonly placeholder="Parsed output will display here..." aria-label="Parsed Output Area"></textarea>
                    </div>
                </div>

            </div>
            
            <!-- OPTIONAL: Parsed Breakdown section (Rendered dynamically below workspace grid) -->
            <div id="parsed-breakdown" class="breakdown-banner" style="display:none; margin-top: var(--space-xl);">
                <div class="breakdown-banner-title">
                    <i class="fas fa-sitemap"></i> Detailed Breakdown
                </div>
                <!-- Symmetrical Breakdown Columns -->
                <div class="breakdown-grid">
                    <div class="breakdown-col" id="breakdown-details-left"></div>
                    <div class="breakdown-col" id="breakdown-details-right"></div>
                </div>
            </div>

        </div>
    </div>

    <!-- Social Proof Highlight Bar -->
    <div class="tool-section tool-section-alt" role="region" aria-label="Key Advantages">
        <div class="container">
            <div class="social-proof-bar">
                <div class="proof-item">
                    <div class="proof-number">Fast</div>
                    <div class="proof-label">Instant parsing<br>in real time</div>
                </div>
                <div class="proof-item">
                    <div class="proof-number">Secure</div>
                    <div class="proof-label">100% local<br>No cloud storage</div>
                </div>
                <div class="proof-item">
                    <div class="proof-number">Standard</div>
                    <div class="proof-label">Valid syntax<br>ready output</div>
                </div>
                <div class="proof-item">
                    <div class="proof-number">Free</div>
                    <div class="proof-label">Open source<br>No registrations</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Interactive Step-by-Step Guide Section -->
    <div class="tool-section" id="how-to-use" role="region" aria-label="How-to Guide">
        <div class="container">
            <div class="tool-section-header">
                <span class="tool-section-label">Getting Started</span>
                <h2>How to Use [Tool Name]</h2>
                <p>Follow these quick steps to convert, format, or process your files locally.</p>
            </div>
            <div class="how-to-steps">
                <div class="how-to-step">
                    <h4>Step 1: Provide Input</h4>
                    <p>Paste the raw code or file content into the Left Input Panel, or click "Example" to see a demo.</p>
                </div>
                <div class="how-to-step">
                    <h4>Step 2: Customize Options</h4>
                    <p>Configure any processing options (if available) under the configuration dashboard panel.</p>
                </div>
                <div class="how-to-step">
                    <h4>Step 3: Auto-Conversion</h4>
                    <p>Watch the output update instantly in the Right Output Panel as you paste or adjust parameters.</p>
                </div>
                <div class="how-to-step">
                    <h4>Step 4: Save Result</h4>
                    <p>Copy the output directly to your clipboard or download it as a standalone file using panel headers.</p>
                </div>
            </div>
        </div>
    </div>

    <!-- FAQ Section (Essential for Search Engine AEO & Rich Snippets) -->
    <div class="tool-section tool-section-alt" id="faq" role="region" aria-label="FAQ">
        <div class="container">
            <div class="tool-section-header">
                <span class="tool-section-label">FAQ</span>
                <h2>Frequently Asked Questions</h2>
            </div>
            <div class="faq-list">
                <details class="faq-item">
                    <summary>Is my data sent to any server?</summary>
                    <div class="faq-answer">
                        No. The tool processes all inputs directly inside your browser. No data, payloads, or values leave your local system.
                    </div>
                </details>
                <details class="faq-item">
                    <summary>What specifications or formats does it support?</summary>
                    <div class="faq-answer">
                        This tool supports [Format specifications, e.g. DataWeave 2.0, RAML 1.0, JSON Schema Draft 7].
                    </div>
                </details>
                <details class="faq-item">
                    <summary>How can I run it offline?</summary>
                    <div class="faq-answer">
                        Since all files are static and logic is processed locally, you can save this page to your computer or use it directly offline once loaded.
                    </div>
                </details>
            </div>
        </div>
    </div>

    <!-- Dynamic Blog Snippets Area -->
    <div class="tool-section" id="blog-articles" role="region" aria-label="From the Blog">
        <div class="container">
            <div class="tool-section-header">
                <span class="tool-section-label">Learn More</span>
                <h2>From the Blog</h2>
                <p>Read in-depth explanations, architect tips, and tutorials about API integrations.</p>
            </div>
            <div class="blog-grid" data-blog-type="blog-card" data-blog-limit="2">
                <p style="color:var(--text-muted)">Loading latest articles...</p>
            </div>
        </div>
    </div>

    <!-- Support / Creator Coffee Banner -->
    <div class="container">
        <div class="support-banner">
            <div class="support-banner-text">
                <h3>🤠 Find this tool useful?</h3>
                <p>All utilities are free and open source. If this saved you time, a coffee is always appreciated!</p>
            </div>
            <script type="text/javascript" src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js"
                data-name="bmc-button" data-slug="upendra.thunuguntla" data-color="#FFDD00" data-emoji="🤠"
                data-font="Cookie" data-text="Buy me a coffee" data-outline-color="#000000" data-font-color="#000000"
                data-coffee-color="#ffffff"></script>
        </div>
    </div>

    <!-- Related Tools Grid Section -->
    <div class="related-tools" role="navigation" aria-label="Related tools">
        <div class="container">
            <h3 style="margin-bottom:var(--space-lg); font-size:1rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.1em;">
                Related Tools
            </h3>
            <div class="related-tools-grid">
                <!-- Include 3-4 other tool relative paths -->
                <a href="/tools/yaml2props/" class="related-tool-link">
                    <span class="icon" aria-hidden="true">⚙️</span>
                    <div>
                        <div class="name">YAML → Properties</div>
                        <div class="desc">Flatten YAML configurations</div>
                    </div>
                </a>
                <a href="/tools/props2yaml/" class="related-tool-link">
                    <span class="icon" aria-hidden="true">📝</span>
                    <div>
                        <div class="name">Properties → YAML</div>
                        <div class="desc">Build YAML trees from flat property list</div>
                    </div>
                </a>
                <a href="/tools/mule2curl/" class="related-tool-link">
                    <span class="icon" aria-hidden="true">⚡</span>
                    <div>
                        <div class="name">MuleLog to cURL</div>
                        <div class="desc">Extract HTTP requests from logs</div>
                    </div>
                </a>
            </div>
        </div>
    </div>

    <!-- Shared Footer -->
    <footer class="footer">
        <div class="container">
            Built by <a href="https://www.linkedin.com/in/upendra-thunuguntla/" target="_blank" rel="noopener">Upendra Thunuguntla</a> ❤️ ·
            <a href="https://github.com/Upendra-Thunuguntla" target="_blank" rel="noopener">GitHub</a>
            <br>
            All tools run fully client-side. No sensitive data ever hits our hosting servers.
        </div>
    </footer>

    <!-- Scripts in order of initialization -->
    <!-- Add external libraries, e.g. js-yaml.min.js here if needed -->
    <script src="/assets/js/platform.js"></script>
    <script src="/assets/js/blogs-loader.js"></script>
    <script src="/assets/js/analytics.js"></script>
    <script src="script.js"></script>

</body>
</html>
```

---

## 4. Design & Aesthetics Specification (CSS)

### Global Typography & Variables
The typography is driven by Google Fonts loaded in `core.css`:
- **Heading Font:** `Space Grotesk` (clean, geometric, futuristic sans-serif).
- **Body Font:** `Inter` (high-readability, neutral sans-serif).
- **Monospace Font:** `JetBrains Mono` or `Fira Code` (highly legible coding typeface).

### Theme Styling
The site supports light and dark themes using custom properties. Never hardcode colors (e.g., `#fff`, `#333`, `rgb(0,0,0)`). Always use HSL-derived semantic variables:

| Variable | Light Theme Value | Dark Theme Value (Default) | Role |
| :--- | :--- | :--- | :--- |
| `--bg` | `#f4f6fb` | `#0d1b2a` | Main background |
| `--bg-alt` | `#eef1f8` | `#0a1628` | Secondary/inner element backgrounds |
| `--surface` | `#ffffff` | `#1b2d40` | Main card/modal backgrounds |
| `--surface-2` | `#f8faff` | `#223347` | Options panels, header background overlays |
| `--surface-3` | `#eef1f8` | `#2a3f55` | Borders on active states, hover backgrounds |
| `--border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` | Standard borders |
| `--border-accent`| `rgba(0, 119, 204, 0.3)` | `rgba(0, 212, 255, 0.3)` | Focus/Hover state border accents |
| `--text` | `#1e293b` | `#e2e8f0` | Prime copy text |
| `--text-muted` | `#64748b` | `#64748b` | Low-priority labels, breadcrumbs, titles |
| `--text-subtle` | `#94a3b8` | `#94a3b8` | Explanations and instruction text |
| `--accent` | `#0077cc` | `#00d4ff` | Primary theme color (cyan/ocean) |
| `--accent2` | `#6d28d9` | `#7c3aed` | Secondary theme color (purple) |
| `--success` | `#22c55e` | `#22c55e` | Outputs, success indicators |

### Symmetry Guidelines
- **Input/Output Balancing:** The main workspace must be divided into a balanced, equal-width layout. On screen resolutions $>768px$, columns should sit side-by-side (`grid-template-columns: 1fr 1fr`).
- **Interactive State Alignments:** Panel headers must feature the title icon/name aligned strictly to the left, and control buttons (Clear, Load Example, Copy, Download) aligned strictly to the right using flex layouts.
- **Breakdown Alignment:** If structured result details are parsed, the banner must span the full width of the container, while its internal details grid should align with the two-column structure of the input-output panels above it.

### Micro-Animations
Implement fluid transitions on all user-interactive objects:
- **Hover Transitions:** `transition: border-color var(--transition), box-shadow var(--transition);` on cards, panels, and textareas.
- **Interactive Buttons:** Primary CTA buttons should scale up slightly on hover (`transform: translateY(-2px)`) and increase shadow glow.
- **Input Highlight Glow:** When textareas are focused, apply `box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.15);` to clearly mark active operations.

---

## 5. Functional JavaScript Specification (`script.js`)

Your JavaScript must execute performantly, cleanly handle user input, and hook directly into shared utility helpers.

### Javascript Structure & Pattern
```javascript
/* ══════════════════════════════════════════════
   [Tool Name] - Client-Side Engine
   ══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Element Selectors
    const sourceEl = document.getElementById('text-input');
    const resultEl = document.getElementById('text-output');
    const copyBtn = document.getElementById('btn-copy');

    // 2. Real-Time Conversion Triggers
    if (sourceEl) {
        // Debounce parsing to preserve keypress fluidness and prevent frame lag
        sourceEl.addEventListener('input', debounce(processData, 250));
    }

    // 3. Debouncer Helper Function
    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // 4. Primary Processing Logic
    function processData() {
        const rawValue = sourceEl.value.trim();

        if (!rawValue) {
            resultEl.value = '';
            // Hide parsed breakdowns if they exist
            toggleBreakdownVisibility(false);
            return;
        }

        try {
            // Business Logic Engine Execution
            const processedResult = runParserEngine(rawValue);
            
            // Render outputs
            resultEl.value = processedResult;
            
            // Send track event to analytics.js
            track_event('[tool_slug]_processed', { length: rawValue.length });
            
        } catch (error) {
            // Render error output clearly inside output box
            resultEl.value = `// Process Error: ${error.message}`;
        }
    }

    function runParserEngine(input) {
        // [Add parsing/conversion code here]
        return input; // placeholder
    }
    
    function toggleBreakdownVisibility(show) {
        const breakdown = document.getElementById('parsed-breakdown');
        if (breakdown) {
            breakdown.style.display = show ? 'block' : 'none';
        }
    }
});

// 5. Shared Global Action Wrapper Wrappers
function copyResult() {
    const text = document.getElementById('text-output').value;
    const btn = document.getElementById('btn-copy');
    // Global copy handler inside platform.js
    copyToClipboard(text, btn);
}

function downloadResult() {
    const text = document.getElementById('text-output').value;
    if (!text.trim() || text.startsWith('//')) {
        showToast('Nothing valid to download!', 'error');
        return;
    }
    // Global download handler inside platform.js
    downloadFile(text, 'output-file.txt', 'text/plain;charset=utf-8');
    track_event('[tool_slug]_download', { format: 'txt' });
}

function clearAll() {
    document.getElementById('text-input').value = '';
    document.getElementById('text-output').value = '';
    const breakdown = document.getElementById('parsed-breakdown');
    if (breakdown) breakdown.style.display = 'none';
    
    // Global toast handler inside platform.js
    showToast('Inputs cleared');
}

function loadExample() {
    const sample = `Example string or code here...`;
    document.getElementById('text-input').value = sample;
    // Dispatch input event to trigger auto-conversion
    document.getElementById('text-input').dispatchEvent(new Event('input'));
    showToast('Example data loaded!');
}
```

---

## 6. SEO & AEO Optimization Guidelines

To ensure your tool reaches developers seeking solutions via both traditional Search Engines (Google, Bing) and AI Answer Engines (ChatGPT, Gemini, Perplexity), implement the following rules:

### Metadata & Title Tuning
- **Title Structure:** Must begin with the target developer action + tool name. Avoid generic labels.
  - *Correct:* `MuleSoft Secure Properties Generator | Encrypt & Decrypt Configs | Upendra.dev`
  - *Incorrect:* `Secure Config Tool`
- **Descriptions:** Must use action verbs, outline file support formats, and state privacy parameters.
  - *Example:* "Instantly convert raw CSV examples into DataWeave 2.0 script schemas. Works completely locally in client browser memory."

### Schema.org JSON-LD structured data
- Every page must contain the `@type: WebApplication` JSON-LD schema referencing the direct URL, matching descriptions, categorizing as `DeveloperApplication`, and attributing authorship to `Upendra Venkata Muralidhar Thunuguntla`.

### Answer Engine Optimization (AEO) Copywriting
- **Target Direct Questions:** Under the FAQ section, structure the `<summary>` tags to match real queries developers type into search boxes:
  - *Example:* `How do I import a cURL command into Postman?` instead of `Postman import`.
- **Provide Direct Answers:** The first sentence of the FAQ answer must immediately resolve the question (concise and objective), followed by bulleted sub-steps.
- **Syntactic Semantic Markup:** Maintain semantic order. The page must have exactly one `<h1>` inside the Hero, and sections must use `<h2>` with subheadings inside cards utilizing `<h4>` tags.

---

## 7. Tool README Template (`README.md`)

Each tool folder must contain a `README.md` to document the utility inside GitHub. Use this format:

```markdown
# [Tool Name]

## 🟢 Live Tool
**[Use [Tool Name] Live →](https://upendra-thunuguntla.github.io/tools/[tool-slug]/)**

## Description
[1-2 sentences summarizing the utility's goal, privacy policies, and who it is built for.]

## Key Features
- **Feature Name:** [Action explanation, e.g. Automatically parses method and query variables.]
- **Feature Name:** [Action explanation, e.g. Formats output directly as DataWeave schemas.]
- **Client-Side Engine:** Runs 100% locally in browser memory for data safety.
```

---

## 8. Double-Validation Checklist

Before checking in code, execute the following validation tests:

### 1. Functional Integrity Check
- [ ] Load the page. Click the `Example` button. Verify that sample data loads and converts instantly.
- [ ] Paste corrupted or invalid formatting. Verify that the tool handles errors gracefully (displays error block inside the output area) and does not crash or throw unhandled console exceptions.
- [ ] Click the `Copy` button. Verify that the toast alert appears (`Copied to clipboard! 📋`) and the clipboard holds the identical output content.
- [ ] Click the `Download` button. Verify the download prompt launches and the generated filename matches target standards.
- [ ] Click `Clear` button. Verify inputs and outputs return to initial state.

### 2. Design & Responsiveness Check
- [ ] Resize the viewport to mobile width ($<768px$). Verify layout columns stack vertically.
- [ ] Check accessibility layout. Ensure all buttons have descriptive `aria-label` tags and textareas are keyboard focusable.
- [ ] Run theme toggle (Light/Dark). Ensure all elements (including options dashboards and header components) shift colors and remain highly readable without visual contrast anomalies.
- [ ] Verify there are no absolute colors (e.g. `#fff`) overrides in the local `style.css`.

### 3. SEO & Structured Data Compliance
- [ ] Verify only one `<h1>` exists on the page.
- [ ] Ensure the JSON-LD contains no JSON syntax errors and accurately lists the canonical URL path with trailing slash.
- [ ] Run a local validator or review the links. Verify all internal links point to same-tab destinations.
- [ ] Verify that Google Analytics is loaded at line 18-20 and tracking triggers dispatch when events complete.
