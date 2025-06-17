const CACHE_NAME = 'omsi-arrivals-cache-v5'; // Increment this again for sure!
const urlsToCache = [
  '/live-tracker/omsi_arrivals.html',
  '/live-tracker/manifest-omsi.json',
  '/live-tracker/offline.html',
  '/live-tracker/fonts/NJFont-Medium.ttf',
  '/live-tracker/assets/icons/icon-192x192.png',
  '/live-tracker/assets/icons/icon-512x512.png'
];

// --- START: Firebase Messaging SDK Imports (ADD THIS BLOCK) ---
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');
// --- END: Firebase Messaging SDK Imports ---


// --- START: Firebase Configuration for Service Worker (ADD THIS BLOCK) ---
const firebaseConfig = {
    apiKey: "AIzaSyDePDF-kZahjzh9ij6tkuApIhoGePwVQ2s",
    authDomain: "omsi-c5505.firebaseapp.com",
    projectId: "omsi-c5505",
    storageBucket: "omsi-c5505.appspot.com",
    messagingSenderId: "503595375440", // CRITICAL for FCM
    appId: "1:503595375440:web:356be6684b77ff5909ea55",
    measurementId: "G-VN7X65V3F9"
};

// Initialize Firebase App within the service worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging(); // This line helps with PWA installability signals
// --- END: Firebase Configuration for Service Worker ---


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
            urlsToCache.forEach(url => {
              fetch(new Request(url, { mode: 'no-cors' }))
                .then(response => {
                  if (!response.ok && response.type !== 'opaque') {
                      console.warn(`[SW ${CACHE_NAME}] Diagnostic fetch for ${url} failed with status: ${response.status}`);
                  }
                })
                .catch(() => {
                  console.error(`[SW ${CACHE_NAME}] Diagnostic fetch for ${url} FAILED entirely (network error or CORS if not no-cors).`);
                });
            });
            throw error;
          });
      })
      .then(() => {
        console.log(`[SW ${CACHE_NAME}] Installation successful. Activating now (skipWaiting).`);
        return self.skipWaiting();
      })
      .catch(error => {
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
      return self.clients.claim();
    })
  );
});

// Fetch event: serve from cache, fallback to network, then to offline page
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Don't cache Firebase or other dynamic API calls, always go to network
  if (requestUrl.hostname.includes('firebaseio.com') ||
      requestUrl.hostname.includes('firestore.googleapis.com') ||
      requestUrl.hostname.includes('fbsbx.com') ||
      requestUrl.hostname.includes('googleapis.com') ||
      requestUrl.hostname.includes('gstatic.com') ||
      requestUrl.hostname.includes('google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For other requests (your app assets)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then(networkResponse => {
            return networkResponse;
          })
          .catch(() => {
            console.warn(`[SW ${CACHE_NAME}] Network fetch failed for: ${event.request.url}. Mode: ${event.request.mode}`);
            if (event.request.mode === 'navigate') {
              console.log(`[SW ${CACHE_NAME}] Serving offline fallback page.`);
              return caches.match('/live-tracker/offline.html');
            }
          });
      })
  );
});
