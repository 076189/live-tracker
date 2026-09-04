const CACHE_NAME = 'rsg-viewer-shell-v1';
const APP_SHELL = [
    '/live-tracker/rsg_viewer.html',
    '/live-tracker/manifest-rsg_viewer.json',
    '/live-tracker/assets/rsg-viewer-icon.svg',
    '/live-tracker/fonts/NJFont-Medium.ttf'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => Promise.all(cacheNames
                .filter(cacheName => cacheName.startsWith('rsg-viewer-') && cacheName !== CACHE_NAME)
                .map(cacheName => caches.delete(cacheName))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;

    if (event.request.mode === 'navigate' || requestUrl.pathname.endsWith('/rsg_viewer.html')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    return response;
                })
                .catch(() => caches.match(event.request).then(cached => cached || caches.match('/live-tracker/rsg_viewer.html')))
        );
        return;
    }

    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});