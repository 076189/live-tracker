// sw-omsi.js (Make sure your service worker file is named this or update registration)

const CACHE_NAME = 'omsi-suite-cache-v2'; // Incremented version due to path changes
const urlsToCache = [
  // Add the main HTML pages (absolute paths from root)
  '/live-tracker/omsi_tools_extra.html',
  '/live-tracker/omsi_arrivals.html',
  '/live-tracker/omsi_tools.html',
  '/live-tracker/', // Cache the directory if it serves an index or if start_url points here

  // Font (absolute path from root)
  '/live-tracker/fonts/NJFont-Medium.ttf',

  // Manifest file (absolute path from root)
  '/live-tracker/manifest-omsi.json',

  // Essential images/assets (absolute paths from root)
  '/live-tracker/assets/TfL.png',

  // Icons specified in your manifest (absolute paths from root)
  '/live-tracker/assets/icons/icon-192x192.png',
  '/live-tracker/assets/icons/icon-512x512.png',
  // Add other icons like apple-touch-icon if you want to pre-cache it
  '/live-tracker/assets/icons/apple-touch-icon-180x180.png', // Example path

  // Custom offline fallback page (absolute path from root)
  '/live-tracker/offline.html'
];

// Install event: Cache the app shell
self.addEventListener('install', event => {
  console.log('[Service Worker] Install Event for cache:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell essentials:', urlsToCache);
        return cache.addAll(urlsToCache).catch(error => {
          console.error('[Service Worker] Failed to cache one or more URLs during install:', error);
          // Log which URLs failed
          urlsToCache.forEach(url => {
            fetch(url).catch(() => console.error(`[Service Worker] Failed to fetch (and cache) during install: ${url}`));
          });
          // It's often better to let the install fail if critical assets are missing
          // rather than having a partially working PWA.
          throw error;
        });
      })
      .then(() => {
        console.log('[Service Worker] All essential assets cached. Skip waiting.');
        return self.skipWaiting(); // Activate worker immediately
      })
      .catch(error => {
        console.error('[Service Worker] Caching failed, install aborted:', error);
        // Do not call skipWaiting if caching failed.
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate Event for cache:', CACHE_NAME);
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
      console.log('[Service Worker] Old caches cleared. Claiming clients.');
      return self.clients.claim(); // Take control of clients
    })
  );
});

// Fetch event: Strategy for serving responses
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network first for external/dynamic resources
  if (url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebasestorage.googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('cdn.tailwindcss.com') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('gov.uk')) {

    event.respondWith(fetch(event.request).catch(error => {
      console.warn(`[Service Worker] Network request failed for external resource ${event.request.url}:`, error);
      // Optionally, return a specific error response or just let it fail.
      // For critical CDN scripts, failure here means parts of your app might not work if network is down.
    }));
    return;
  }

  // Cache-first, then network, then offline fallback for app assets
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // console.log('[Service Worker] Fetching from network (not in cache):', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response and it's one of our app's assets
            // Only cache GET requests that were successfully fetched (status 200)
            // and are listed in urlsToCache (or match a pattern for dynamic caching if you add it).
            if (event.request.method === 'GET' &&
                networkResponse && networkResponse.status === 200 &&
                (networkResponse.type === 'basic' || urlsToCache.includes(url.pathname + url.search))) { // url.pathname for general match, url.pathname + url.search if query params matter for caching specific URLs
              
              // IMPORTANT: If an asset is in urlsToCache, it should have been cached during install.
              // Caching it again here implies either:
              // 1. Install failed for this asset (check console).
              // 2. You want a "stale-while-revalidate" pattern for assets NOT in urlsToCache (more advanced).
              // For simplicity with precaching, often you don't re-cache here unless specific strategy.
              // However, if install failed for an asset, fetching it now and caching is a good fallback.

              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  // console.log('[Service Worker] Caching new resource from network:', event.request.url);
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(() => {
          // Network request failed, and it's not in cache.
          if (event.request.mode === 'navigate') {
            console.log('[Service Worker] Navigate request failed, serving offline fallback page.');
            return caches.match('/live-tracker/offline.html'); // Ensure this path is correct
          }
          // For other non-navigation requests (images, css, etc.), let the browser handle the failure.
        });
      })
  );
});
