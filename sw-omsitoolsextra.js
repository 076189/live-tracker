
// Handle incoming background messages (when your app is not in focus or closed)
messaging.onBackgroundMessage(function(payload) {
    console.log('[sw-omsitoolsextra.js] Received background message ', payload);
    console.log('[sw-omsitoolsextra.js] Received background message. Attempting to show notification.', payload); // <-- NEW LOG HERE

// Default values if title/body/icon are not directly in payload.notification or payload.data
const notificationTitle = payload.notification?.title || payload.data?.title || 'OMSI Tools Alert';
@@ -161,9 +161,28 @@ messaging.onBackgroundMessage(function(payload) {
// FCM SDK provides the payload, but the Service Worker must call showNotification.
event.waitUntil(
self.registration.showNotification(notificationTitle, notificationOptions)
        .then(() => {
            console.log('[sw-omsitoolsextra.js] Notification successfully shown.'); // <-- NEW SUCCESS LOG
        })
        .catch(error => {
            console.error('[sw-omsitoolsextra.js] Error showing notification:', error); // <-- NEW ERROR LOG
            // Attempt to send this error back to the main page's console if possible, though not guaranteed.
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'NOTIFICATION_ERROR', message: error.message, stack: error.stack });
                });
            });
        })
);
});

// Add a listener for messages from clients (like the main page)
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'DEBUG_MESSAGE') {
        console.log('[SW-DEBUG] Message from main page:', event.data.content);
    }
});


// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
