/* ══════════════════════════════════════════
   SERVICE WORKER — sw.js
   Enables offline support and instant loading.
   Strategy: Stale-While-Revalidate
   ══════════════════════════════════════════ */

const CACHE_NAME = 'upendra-dev-cache-v1.0.2';

// ─── Assets to pre-cache on install ───
const PRE_CACHE_ASSETS = [
    '/',
    '/index.html',
    '/assets/css/core.css',
    '/assets/css/home.css',
    '/assets/css/tool.css',
    '/assets/js/platform.js',
    '/assets/js/theme.js',
    '/assets/js/analytics.js',
    '/portfolio.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// ─── Install Event ───
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Pre-caching core assets');
            return cache.addAll(PRE_CACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

// ─── Activate Event (Cleanup old caches) ───
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// ─── Fetch Event (Stale-While-Revalidate) ───
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip tracking/external scripts we don't want to cache deeply
    const url = new URL(event.request.url);
    if (url.origin.includes('google-analytics') || url.origin.includes('googletagmanager')) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                const fetchedResponse = fetch(event.request).then(networkResponse => {
                    // Update cache with fresh version
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Fail silently if network fails (offline)
                });

                // Return cached version immediately if available, else wait for network
                return cachedResponse || fetchedResponse;
            });
        })
    );
});
