// --- File: sw-omsitoolsextra.js ---

// IMPORTANT: Increment this version number every time you change this file.
const CACHE_NAME = 'omsi-tools-extra-cache-v3'; 
const urlsToCache = [
    '/live-tracker/omsi_tools_extra.html',
    '/live-tracker/manifest-omsitoolsextra.json',
    '/live-tracker/offline.html',
    '/live-tracker/fonts/NJFont-Medium.ttf',
    'https://076189.github.io/live-tracker/assets/icons/tools_icon-192x192.png',
    'https://076189.github.io/live-tracker/assets/icons/tools_icon-512x512.png'
];

// Import the Firebase SDKs using the 'compat' version for service workers
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize Firebase App within the service worker
const firebaseConfig = {
    apiKey: "AIzaSyDePDF-kZahjzh9ij6tkuApIhoGePwVQ2s",
    authDomain: "omsi-c5505.firebaseapp.com",
    projectId: "omsi-c5505",
    storageBucket: "omsi-c5505.appspot.com",
    messagingSenderId: "503595375440",
    appId: "1:503595375440:web:356be6684b77ff5909ea55",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// --- CORRECTED: Background Push Notification Handler ---
// This is the standard Firebase SDK method for handling background notifications.
messaging.onBackgroundMessage(function(payload) {
    console.log('[SW] Received background message.', payload);

    // Extract notification data from the payload.
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || '/live-tracker/assets/icons/icon-192x192.png',
        data: {
            // Use the click_action from the data payload if it exists, otherwise default.
            url: payload.data.click_action || '/live-tracker/omsi_tools_extra.html' 
        }
    };

    // The service worker must explicitly show the notification.
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// --- Standard Notification Click Handler ---
self.addEventListener('notificationclick', function(event) {
    console.log('[SW] Notification click received.', event);
    event.notification.close(); // Close the notification

    // Get the URL to open from the notification's data payload
    const urlToOpen = event.notification.data.url || '/';
    
    // Open the URL and focus the window if it's already open
    event.waitUntil(
        clients.matchAll({
            type: "window"
        }).then(clientList => {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});


// --- Standard Service Worker Lifecycle Events ---

// Install event: cache the application shell.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log(`[SW ${CACHE_NAME}] Caching app shell`);
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event: clean up old caches.
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log(`[SW] Deleting old cache: ${cache}`);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event: serve from cache, fallback to network.
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Always go to the network for Firebase and Google APIs
    if (requestUrl.hostname.includes('firebaseio.com') || requestUrl.hostname.includes('googleapis.com')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // For app assets, try cache first, then network, then offline page
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        }).catch(() => {
            if (event.request.mode === 'navigate') {
                return caches.match('/live-tracker/offline.html');
            }
        })
    );
});
