// Service Worker for Push Notifications

self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification from FinBuddy',
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/pwa-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.data?.url || '/',
        dateOfArrival: Date.now(),
      },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Dismiss' }
      ],
      tag: 'finbuddy-notification',
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'FinBuddy', options)
    );
  } catch (error) {
    console.error('Error parsing push data:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (client.navigate) {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed', event);
});

