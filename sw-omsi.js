// sw.js

const CACHE_NAME = 'omsi-suite-cache-v1'; // Increment version to v2, v3 etc. when you update critical assets
const urlsToCache = [
  // Add the main HTML pages
  '/omsi_arrivals.html',
  '/omsi_tools.html',
  // If you have a root index page that links to these, add it too:
  // '/', 

  // Add your custom font if it's locally hosted
  '/live-tracker/fonts/NJFont-Medium.ttf', // Make sure this path is correct relative to your root

  // Add your manifest file itself
  '/live-tracker/manifest-omsi.json',

  // Add essential images/assets (like your TfL logo if it's local & critical for app shell)
  '/live-tracker/assets/TfL.png', // Ensure this path is correct

  // Add the icons you specified in your manifest
  // Ensure these paths are correct and the files exist!
  '/live-tracker/assets/icons/icon-192x192.png', 
  '/live-tracker/assets/icons/icon-512x512.png',
  // Add any other icon sizes you created (e.g., apple-touch-icon)
  // '/assets/icons/apple-touch-icon-180x180.png',

  // Add a custom offline fallback page
  '/offline.html' 
];

// Install event: Cache the app shell
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell essentials');
        // Use a try-catch for individual addAll failures if some assets might be optional
        // or if you want to handle non-critical asset caching failures gracefully.
        return cache.addAll(urlsToCache).catch(error => {
            console.error('[Service Worker] Failed to cache one or more URLs during install:', error);
            // Depending on your needs, you might not want to fail the entire install
            // if only non-critical assets are missing. For now, it will fail if any URL is bad.
        });
      })
      .then(() => {
        return self.skipWaiting(); // Activate worker immediately after install
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim(); // Ensures the active service worker takes control of the page ASAP
    })
  );
});

// Fetch event: Strategy for serving responses
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always try network first for Firebase, CDNs, and other APIs.
  // These resources are dynamic and should not be stale from cache.
  if (url.hostname.includes('firebaseio.com') || // Firebase RTDB
      url.hostname.includes('firestore.googleapis.com') || // Firestore (if you use it)
      url.hostname.includes('firebasestorage.googleapis.com') || // Firebase Storage
      url.hostname.includes('gstatic.com') || // Google CDNs (Firebase JS SDK)
      url.hostname.includes('cdn.tailwindcss.com') ||
      url.hostname.includes('cdnjs.cloudflare.com') || // For xlsx
      url.hostname.includes('gov.uk')) { // For bank holidays

    // Network first, then nothing (or a generic error for API calls if needed)
    event.respondWith(
      fetch(event.request).catch(error => {
        console.warn(`[Service Worker] Network request failed for ${event.request.url}:`, error);
        // For API calls, you might return a custom error response or just let it fail
        // For script/style CDNs, if they fail, the app might break, so caching them (if allowed by CORS)
        // could be an advanced strategy, but is complex.
      })
    );
    return;
  }

  // For other requests (your app shell: HTML, local CSS, local JS, local images, local fonts)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Cache hit - return response
        if (cachedResponse) {
          // console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Not in cache - go to network
        // console.log('[Service Worker] Fetching from network (not in cache):', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && !urlsToCache.includes(url.pathname)) {
              // 'basic' type indicates same-origin. Non-basic types are often opaque responses from CDNs (if not handled above).
              // We generally only want to cache our own assets or explicitly listed cross-origin assets that are part of the app shell.
              return networkResponse;
            }

            // IMPORTANT: Only cache GET requests that are part of your app shell
            // or explicitly whitelisted for dynamic caching.
            // Here, we're mostly relying on the precached `urlsToCache`.
            // If you wanted to dynamically cache other same-origin assets as they are fetched,
            // you'd add logic here, but be careful not to cache everything.

            // Example: if you want to cache successful GET requests for items in urlsToCache as they are fetched
            // (This is somewhat redundant if precaching in 'install' works, but can act as a refresh mechanism if combined with network-first strategy)
            /*
            if (event.request.method === 'GET' && urlsToCache.includes(url.pathname)) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                    .then(cache => {
                        console.log('[Service Worker] Caching new resource:', event.request.url);
                        cache.put(event.request, responseToCache);
                    });
            }
            */
            return networkResponse;
          }
        ).catch(() => {
          // Network request failed, and it's not in cache.
          // If it's a navigation request (e.g., trying to load an HTML page), show offline page.
          if (event.request.mode === 'navigate') {
            console.log('[Service Worker] Navigate request failed, serving offline page.');
            return caches.match('/offline.html');
          }
          // For other types of requests (images, css, etc.), just let the browser handle the failure.
        });
      })
  );
});
