// Cloudflare Worker — anonymous copy-count ranking for the Mule Debug Package Finder.
// Routed only at upendra.fyi/api/pkg-ranks/* (see wrangler.toml); this is namespaced
// to avoid any collision with the existing api.upendra.fyi Vercel resume backend.
// Everything else on the zone continues to be served by GitHub Pages, untouched.
//
// Storage model: a single KV key ("ranks") holding { "package.name": count, ... }.
// This keeps each request to exactly one KV read (+ one write for /api/pkg-ranks/track),
// well inside the Workers free-tier KV limits for a low-traffic personal site.
//
// Package validation is redeploy-free by design:
//   1. Structural check — must look like a real Java package name.
//   2. Best-effort stricter check against the live packages.json published by
//      the static site (scripts/render-debug-packages.js keeps it in sync with
//      the CSV on every push). Cached at the edge; if unreachable, we simply
//      fall back to the structural check alone rather than failing closed.

const RANKS_KEY = 'ranks';
const PACKAGE_NAME_RE = /^[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)+$/;
const MAX_PACKAGE_LENGTH = 200;
const MAX_TRACKED_PACKAGES = 300; // bounds storage/abuse even without a fixed allowlist

const LIVE_ALLOWLIST_URL = 'https://upendra.fyi/tools/mule-debug-package-finder/packages.json';
const LIVE_ALLOWLIST_CACHE_TTL = 3600; // seconds

// Counts are anonymous/aggregate (no PII), so open CORS is safe here and lets
// the page call this API from any origin (production domain, localhost, previews).
const CORS_HEADERS = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type'
};
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', ...CORS_HEADERS };

function json(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function isValidPackageFormat(pkg) {
    return typeof pkg === 'string' && pkg.length > 0 && pkg.length <= MAX_PACKAGE_LENGTH && PACKAGE_NAME_RE.test(pkg);
}

// Returns a Set of currently-known packages, or null if the live list couldn't be fetched.
async function fetchLiveAllowlist() {
    try {
        const res = await fetch(LIVE_ALLOWLIST_URL, {
            cf: { cacheTtl: LIVE_ALLOWLIST_CACHE_TTL, cacheEverything: true }
        });
        if (!res.ok) return null;
        const list = await res.json();
        return Array.isArray(list) ? new Set(list) : null;
    } catch {
        return null;
    }
}

async function handleGetRanks(env) {
    const raw = await env.PACKAGE_RANKS.get(RANKS_KEY);
    return new Response(raw || '{}', {
        headers: { ...JSON_HEADERS, 'cache-control': 'public, max-age=30' }
    });
}

async function handleTrack(request, env) {
    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid JSON body' }, 400);
    }

    const pkg = typeof body?.package === 'string' ? body.package.trim() : '';
    if (!isValidPackageFormat(pkg)) {
        return json({ error: 'Invalid package format' }, 400);
    }

    // Best-effort stricter check — only enforced when the live list is reachable.
    const liveAllowlist = await fetchLiveAllowlist();
    if (liveAllowlist && !liveAllowlist.has(pkg)) {
        return json({ error: 'Unknown package' }, 400);
    }

    const raw = await env.PACKAGE_RANKS.get(RANKS_KEY);
    const ranks = raw ? JSON.parse(raw) : {};

    if (!(pkg in ranks) && Object.keys(ranks).length >= MAX_TRACKED_PACKAGES) {
        return json({ error: 'Tracking capacity reached' }, 429);
    }

    ranks[pkg] = (ranks[pkg] || 0) + 1;
    await env.PACKAGE_RANKS.put(RANKS_KEY, JSON.stringify(ranks));

    return json({ ok: true, package: pkg, count: ranks[pkg] });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }
        if (url.pathname === '/api/pkg-ranks/ranks' && request.method === 'GET') {
            return handleGetRanks(env);
        }
        if (url.pathname === '/api/pkg-ranks/track' && request.method === 'POST') {
            return handleTrack(request, env);
        }
        return json({ error: 'Not found' }, 404);
    }
};
