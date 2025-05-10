// sw.js - Service Worker

// Define a name for your cache
const CACHE_NAME = 'blind-list-cache-v1';

// List the files you want to cache.
// IMPORTANT: Adjust these paths if your file structure is different.
// This should include all essential files for your app to run offline.
const urlsToCache = [
  './', // Alias for index.html or the root path
  './blind-dest-list.html', // Your main HTML file - ADJUST IF DIFFERENT
  // Add paths to your CSS files if you have separate ones
  // e.g., './style.css', 
  // Add paths to your main JavaScript file (the one containing all your logic)
  // e.g., './blind_destination_list_script_v2.js' - YOU WILL NEED TO EXTRACT YOUR SCRIPT TO A SEPARATE FILE
  // Add paths to any images or icons used directly by the HTML/CSS that are critical for offline use
  './images/icon-192x192.png', // Manifest icon
  './images/icon-512x512.png'  // Manifest icon
  // Add CDN links for libraries if you want them cached.
  // Note: Caching external resources from CDNs can be tricky due to opaque responses.
  // It's often better to download them and serve them locally if full offline reliability for them is crucial.
  // For now, we'll focus on your app's core files.
  // 'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js',
  // 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  // 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js'
];

// Install event: opens the cache and adds core files to it.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Opened cache:', CACHE_NAME);
        // Add all URLs to cache. If any of them fail, the SW installation will fail.
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' }))); 
      })
      .then(() => {
        console.log('Service Worker: All files cached successfully.');
        return self.skipWaiting(); // Activate the new service worker immediately
      })
      .catch(error => {
        console.error('Service Worker: Caching failed during install:', error);
      })
  );
});

// Activate event: cleans up old caches.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated and old caches cleaned.');
      return self.clients.claim(); // Take control of all open clients
    })
  );
});

// Fetch event: serves assets from cache if available, otherwise fetches from network.
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests for http/https.
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // console.log('Service Worker: Serving from cache:', event.request.url);
          return response; // Serve the cached version
        }
        // console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request).then((networkResponse) => {
          // Optionally, cache new requests dynamically if needed
          // Be careful with this, especially for frequently changing resources or large files.
          // For this app, we'll stick to the pre-cached assets for simplicity.
          /*
          if (networkResponse && networkResponse.status === 200 && urlsToCache.includes(event.request.url)) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          */
          return networkResponse;
        }).catch(error => {
          console.error('Service Worker: Fetch failed:', error);
          // Optionally, you could return a custom offline fallback page here
          // For example: return caches.match('./offline.html');
        });
      })
  );
});