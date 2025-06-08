const CACHE_NAME = 'live-tracker-cache-v1';
const urlsToCache = [
  '/live-tracker/tools.html',
  '/live-tracker/tracker.html',
  '/live-tracker/style.css', // Example CSS file
  '/live-tracker/script.js', // Example JS file
];

// Install event: Cache the static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
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
