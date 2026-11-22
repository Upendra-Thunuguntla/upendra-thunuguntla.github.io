const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const analytics = fs.readFileSync(path.join(root, 'assets', 'js', 'analytics.js'), 'utf8');
const prefixes = {
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

function setup(slug) {
    const calls = [];
    const documentListeners = {};
    const windowListeners = {};
    const timers = new Map();
    const file = {
        files: [{ name: 'person@example.test', size: 12 }],
        addEventListener(name, callback) { this[name] = callback; }
    };
    const document = {
        documentElement: { getAttribute: () => 'dark' },
        querySelector: () => null,
        querySelectorAll: selector => selector === 'input[type="file"]' ? [file] : [],
        addEventListener(name, callback) { documentListeners[name] = callback; }
    };
    let timerId = 0;
    const context = {
        document,
        location: { pathname: slug ? `/tools/${slug}/` : '/' },
        gtag: (...args) => calls.push(JSON.parse(JSON.stringify(args))),
        addEventListener(name, callback) { windowListeners[name] = callback; },
        setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; },
        clearTimeout(id) { timers.delete(id); },
        setInterval() {},
        URL
    };
    context.window = context;
    vm.runInNewContext(analytics, context);
    documentListeners.DOMContentLoaded();
    calls.length = 0;
    return {
        context, calls, documentListeners, windowListeners, file,
        flush() {
            const callbacks = [...timers.values()];
            timers.clear();
            callbacks.forEach(callback => callback());
        }
    };
}

test('all tool pages have distinct prefixes and masked workspaces', () => {
    const directories = fs.readdirSync(path.join(root, 'tools'), { withFileTypes: true })
        .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
    assert.deepEqual(directories, Object.keys(prefixes).sort());
    assert.equal(new Set(Object.values(prefixes)).size, directories.length);
    for (const slug of directories) {
        const html = fs.readFileSync(path.join(root, 'tools', slug, 'index.html'), 'utf8');
        assert.match(html, /id="workspace"[^>]*data-clarity-mask="True"/);
        const { context, calls, flush } = setup(slug);
        context.track_event('convert', { filename: 'person@example.test', salary: 123 });
        flush();
        assert.deepEqual(calls, [['event', `${prefixes[slug]}_convert`, { page_tool: slug }]]);
    }
});

test('live actions debounce, flush on page hide, and ignore user data', () => {
    const { context, calls, windowListeners, flush } = setup('base64-converter');
    context.track_event('base64_processed', { mode: 'encode', input: 'private' });
    context.track_event('base64_processed', { mode: 'encode', input: 'private' });
    context.track_event('base64_processed', { mode: 'decode', input: 'private' });
    windowListeners.pagehide();
    flush();
    assert.deepEqual(calls, [
        ['event', 'b64_encode', { page_tool: 'base64-converter' }],
        ['event', 'b64_decode', { page_tool: 'base64-converter' }]
    ]);
    context.track_event('__proto__');
    context.track_event('base64_processed', { mode: 'private' });
    assert.equal(calls.length, 2);
});

test('file selection does not send filenames', () => {
    const { file, calls } = setup('json2raml');
    file.change();
    assert.deepEqual(calls, [['event', 'j2r_file_select', { page_tool: 'json2raml' }]]);
});

test('home tool navigation and dynamically added article clicks use safe events', () => {
    const { context, calls, documentListeners } = setup();
    context.track_event('convert', { input: 'private' });
    documentListeners.click({
        target: {
            closest(selector) {
                if (selector === 'a.tool-card') return { href: 'https://upendra.fyi/tools/json2raml/#workspace' };
                return null;
            }
        }
    });
    documentListeners.click({
        target: {
            closest(selector) {
                if (selector === '.pub-card, .blog-card') return { classList: { contains: () => false }, textContent: 'person@example.test' };
                return null;
            }
        }
    });
    assert.deepEqual(calls, [
        ['event', 'home_open_j2r', { page_tool: 'home' }],
        ['event', 'home_blog_card_click', { page_tool: 'home' }]
    ]);
});
