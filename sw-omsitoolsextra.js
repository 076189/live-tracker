const CACHE_NAME = 'live-tracker-cache-v1';
const urlsToCache = [
  '/076189/live-tracker/live-tracker-b22742a107f91303504b3f0686f482c9b45481ed/tools.html',
  '/076189/live-tracker/live-tracker-b22742a107f91303504b3f0686f482c9b45481ed/tracker.html',
  // You mentioned style.css and script.js, but these were not in the provided file list with a full path.
  // Please adjust these paths if they are in different subdirectories or uncomment if they exist at the base path.
  // If these files exist in the same directory as tools.html and tracker.html, use the following:
  // '/076189/live-tracker/live-tracker-b22742a107f91303504b3f0686f482c9b45481ed/style.css',
  // '/076189/live-tracker/live-tracker-b22742a107f91303504b3f0686f482c9b45481ed/script.js',
];

// Install event: Cache the static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    }).catch((error) => {
      console.error('Failed to add URLs to cache:', error);
      // Log the specific URL that failed if possible or check browser's network tab
    })
  );
});

// Fetch event: Serve cached resources or fetch from the network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return the cached resource if available, otherwise fetch from the network
      return response || fetch(event.request);
    })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push event: Handle incoming Firebase Cloud Messaging notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  console.log('Push received:', data);

  const title = data.notification.title || 'New Notification';
  const options = {
    body: data.notification.body || 'You have a new message.',
    icon: data.notification.icon || '/live-tracker/icons/icon-192.png', // Path to your notification icon
    badge: data.notification.badge,
    image: data.notification.image,
    data: data.data // Custom data payload to be accessed on notification click
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event: Handle user clicking on a notification
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);
  event.notification.close();

  // Example: Open a specific URL when the notification is clicked
  // if (event.notification.data && event.notification.data.url) {
  //   event.waitUntil(clients.openWindow(event.notification.data.url));
  // } else {
  //   event.waitUntil(clients.openWindow('/')); // Open the root URL
  // }
});
