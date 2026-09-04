const CACHE_NAME = 'omsi-live-tracker-shell-v3';
const APP_SHELL = [
    '/live-tracker/omsi_live_tracker.html',
    '/live-tracker/manifest-omsi_live_tracker.json',
    '/live-tracker/assets/omsi-tracker-icon-192.png',
    '/live-tracker/assets/omsi-tracker-icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => Promise.all(cacheNames
                .filter(cacheName => cacheName.startsWith('omsi-live-tracker-') && cacheName !== CACHE_NAME)
                .map(cacheName => caches.delete(cacheName))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;

    if (event.request.mode === 'navigate' || requestUrl.pathname.endsWith('/omsi_live_tracker.html')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    return response;
                })
                .catch(() => caches.match(event.request).then(cached => cached || caches.match('/live-tracker/omsi_live_tracker.html')))
        );
        return;
    }

    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});