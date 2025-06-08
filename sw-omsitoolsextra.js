// sw-omsitoolsextra.js
const CACHE_NAME = 'omsi-tools-extra-cache-v1'; // NEW cache name
const urlsToCache = [
  // Paths are absolute from the domain root (076189.github.io)
  // These should correctly map to your files within the 'live-tracker' directory.
  '/live-tracker/omsi_tools_extra.html',
  '/live-tracker/manifest-omsitoolsextra.json', // Cache the manifest
  '/live-tracker/offline.html',      // Your fallback offline page

  // Add ONE OR TWO essential assets you are SURE exist.
  // For example, if your main page uses a specific CSS or a critical image:
  // '/live-tracker/css/main.css',
  '/live-tracker/fonts/NJFont-Medium.ttf' // The font file
];

// --- START: Firebase Messaging SDK Imports ---
// IMPORTANT: Use the 'compat' versions for service workers as recommended by Firebase
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');
// --- END: Firebase Messaging SDK Imports ---


// --- START: Firebase Configuration for Service Worker ---
// This configuration should match your Firebase project's config.
// The messagingSenderId is CRITICAL for FCM.
const firebaseConfig = {
    apiKey: "AIzaSyDePDF-kZahjzh9ij6tkuApIhoGePwVQ2s",
    authDomain: "omsi-c5505.firebaseapp.com",
    projectId: "omsi-c5505",
    storageBucket: "omsi-c5505.appspot.com",
    messagingSenderId: "503595375440", // Ensure this matches your project's messagingSenderId
    appId: "1:503595375440:web:356be6684b77ff5909ea55",
    measurementId: "G-VN7X65V3F9"
};

// Initialize Firebase App within the service worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
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
            // Log which specific URLs might have caused the failure by trying to fetch them individually.
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
  if (requestUrl.hostname.includes('firebaseio.com') ||
      requestUrl.hostname.includes('firestore.googleapis.com') ||
      requestUrl.hostname.includes('fbsbx.com') ||
      requestUrl.hostname.includes('googleapis.com') ||
      requestUrl.hostname.includes('gstatic.com') || // Include gstatic.com for Firebase SDKs
      requestUrl.hostname.includes('google.com')) { // Include google.com for other Google services
    // console.log(`[SW ${CACHE_NAME}] Network request for (external API): ${event.request.url}`);
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

// --- START: Firebase Cloud Messaging (FCM) Push Event Handlers ---

// Handle incoming background messages (when your app is not in focus or closed)
// Firebase's SDK automatically handles displaying the 'notification' payload.
// Use this handler if you need to process 'data' payloads or override the default notification display.
messaging.onBackgroundMessage(function(payload) {
    console.log('[sw-omsitoolsextra.js] Received background message ', payload);

    // If a notification payload is present (like from Firebase Console "Notifications" tab),
    // FCM will *automatically* display it. No need to call self.registration.showNotification() here
    // for notification payloads, unless you want to deeply customize it and override FCM's default.
    if (payload.notification) {
        console.log('[sw-omsitoolsextra.js] Notification payload received. FCM will auto-display this notification.');
        // If you need custom data from the notification payload for click actions,
        // it's already available in event.notification.data (set by FCM).
        // If you had *only* a 'data' payload and wanted to show a notification, you'd do it here.
        // For now, no action needed for payload.notification here to prevent double display.
    } else if (payload.data) {
        // This block is specifically for 'data-only' messages, where you MUST manually show notification.
        console.log('[sw-omsitoolsextra.js] Data payload received, displaying manually.');
        const notificationTitle = payload.data.title || 'New Data Alert';
        const notificationOptions = {
            body: payload.data.body || 'You have new information.',
            icon: payload.data.icon || '/live-tracker/assets/icons/icon-192x192.png', // Default icon
            badge: payload.data.badge || '/live-tracker/assets/icons/badge-72x72.png', // Optional: badge icon for Android
            data: payload.data, // Attach full data payload for click handling
        };
        self.registration.showNotification(notificationTitle, notificationOptions);
    }
});


// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
    console.log('[sw-omsitoolsextra.js] Notification click received.', event);
    event.notification.close(); // Close the notification after click

    // Check if a URL is provided in the notification's data payload
    // event.notification.data is where custom data attached to the notification would be
    const click_redirect_url = event.notification.data?.url || '/live-tracker/omsi_tools_extra.html'; // Default to the tools page

    event.waitUntil(
        clients.openWindow(click_redirect_url).then(windowClient => {
            // Optional: focus the window if it was already open
            if (windowClient) {
                windowClient.focus();
            }
        })
    );
});

// --- END: Firebase Cloud Messaging (FCM) Push Event Handlers ---
