// sw.js

const CACHE_NAME = 'omsi-contract-dates-cache-v1';
const APP_SHELL_FILES = [
    './OMSI Contract Dates.html', // Your main HTML file
    './',                         // Caches the root if your HTML is served as index.html
    // Add paths to your icons here once created, e.g.:
    // './icons/icon-192x192.png',
    // './icons/icon-512x512.png'
];
// Note: CDN-hosted libraries (xlsx, jspdf) will be cached by the fetch handler
// on first successful use while online, enabling offline use thereafter if cached.

// Install event: Cache the app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching app shell');
                return cache.addAll(APP_SHELL_FILES);
            })
            .then(() => self.skipWaiting()) // Activate the new service worker immediately
            .catch(err => {
                console.error('[ServiceWorker] App shell caching failed:', err);
            })
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[ServiceWorker] Clearing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of any open clients
    );
});

// Fetch event: Serve cached content when available, fall back to network, and cache new successful requests
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // If a cached response is found, return it
            if (cachedResponse) {
                return cachedResponse;
            }

            // If not in cache, fetch from the network
            return fetch(event.request).then((networkResponse) => {
                // Check if we received a valid response
                if (networkResponse && networkResponse.status === 200) {
                    // Cache same-origin ('basic') and successfully fetched cross-origin ('cors') responses.
                    // Major CDNs like cdnjs usually serve files with CORS headers, allowing them to be cached.
                    if (networkResponse.type === 'basic' || networkResponse.type === 'cors') {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                }
                return networkResponse;
            }).catch(() => {
                // If the network request fails (e.g., offline) and it's not in the cache,
                // the browser will show its default offline error page for the resource.
                // For a more advanced PWA, you could return a custom offline fallback page here,
                // especially for navigation requests (e.g., event.request.mode === 'navigate').
            });
        })
    );
});
