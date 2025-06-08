// sw-omsitoolsextra.js
const CACHE_NAME = 'omsi-tools-extra-cache-v1'; // NEW cache name
const urlsToCache = [
  // Paths are absolute from the domain root (076189.github.io)
  // These should correctly map to your files within the 'live-tracker' directory.

  '/live-tracker/omsi_tools_extra.html',
  '/live-tracker/manifest-omsitoolsextra.json', // Cache the manifest
  '/live-tracker/offline.html',       // Your fallback offline page

  // Add ONE OR TWO essential assets you are SURE exist.
  // For example, if your main page uses a specific CSS or a critical image:
  // '/live-tracker/css/main.css',
  '/live-tracker/fonts/NJFont-Medium.ttf' // The font file
];

// Install event: cache the app shell
self.addEventListener('install', event => {
  console.log(`[SW ${CACHE_NAME}] Install event started.`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[SW ${CACHE_NAME}] Opened cache. Caching app shell:`, urlsToCache);
        return cache.addAll(urlsToCache)
          .then(() => {
            console.log(`[SW ${CACHE_NAME}] All specified URLs cached successfully.`);
          })
          .catch(error => {
            console.error(`[SW ${CACHE_NAME}] cache.addAll() FAILED:`, error);
            // Log which specific URLs might have caused the failure by trying to fetch them individually.
            // This is for diagnostics. The install will still fail because addAll failed.
            urlsToCache.forEach(url => {
              fetch(new Request(url, { mode: 'no-cors' })) // Use no-cors for this diagnostic fetch for external resources too
                .then(response => {
                  if (!response.ok && response.type !== 'opaque') { // Opaque means cross-origin, no-cors, which is fine for just checking fetchability
                     console.warn(`[SW ${CACHE_NAME}] Diagnostic fetch for ${url} failed with status: ${response.status}`);
                  }
                })
                .catch(() => {
                  console.error(`[SW ${CACHE_NAME}] Diagnostic fetch for ${url} FAILED entirely (network error or CORS if not no-cors).`);
                });
            });
            throw error; // IMPORTANT: Re-throw the error to ensure install fails if addAll fails.
          });
      })
      .then(() => {
        console.log(`[SW ${CACHE_NAME}] Installation successful. Activating now (skipWaiting).`);
        return self.skipWaiting(); // Activate the new SW immediately
      })
      .catch(error => {
        // This catch is for errors from caches.open or the skipWaiting promise
        console.error(`[SW ${CACHE_NAME}] Overall installation process FAILED:`, error);
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  console.log(`[SW ${CACHE_NAME}] Activate event started.`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log(`[SW ${CACHE_NAME}] Clearing old cache:`, cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log(`[SW ${CACHE_NAME}] Old caches cleared. Claiming clients.`);
      return self.clients.claim(); // Take control of any open clients
    })
  );
});

// Fetch event: serve from cache, fallback to network, then to offline page
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Don't cache Firebase or other dynamic API calls, always go to network
  // (Adjust hostnames if you use other third-party services)
  if (requestUrl.hostname.includes('firebaseio.com') ||
      requestUrl.hostname.includes('firestore.googleapis.com') ||
      requestUrl.hostname.includes('fbsbx.com') || // For Firebase storage
      requestUrl.hostname.includes('googleapis.com')) { // General Google APIs
    // console.log(`[SW ${CACHE_NAME}] Network request for (external API): ${event.request.url}`);
    event.respondWith(fetch(event.request));
    return;
  }

  // For other requests (your app assets)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Cache hit - return response
        if (cachedResponse) {
          // console.log(`[SW ${CACHE_NAME}] Serving from cache: ${event.request.url}`);
          return cachedResponse;
        }

        // Not in cache - try to fetch from network
        // console.log(`[SW ${CACHE_NAME}] Not in cache, fetching from network: ${event.request.url}`);
        return fetch(event.request)
          .then(networkResponse => {
            // Optional: You could add logic here to dynamically cache certain new resources
            // if they are same-origin and successful, but for a "scratch" version,
            // relying on the pre-cached assets is simpler.
            return networkResponse;
          })
          .catch(() => {
            // Network fetch failed (offline or error)
            console.warn(`[SW ${CACHE_NAME}] Network fetch failed for: ${event.request.url}. Mode: ${event.request.mode}`);
            // If it's a navigation request (e.g., for an HTML page), serve the offline fallback.
            if (event.request.mode === 'navigate') {
              console.log(`[SW ${CACHE_NAME}] Serving offline fallback page.`);
              return caches.match('/live-tracker/offline.html'); // Ensure this path is correct!
            }
            // For non-navigation requests (images, css etc.), just let the browser handle the failure.
            // A specific image failing won't break the whole page like a failed navigation.
          });
      })
  );
});
