// Service Worker for Push Notifications
// Version: 1.1

console.log('[SW] Service Worker loaded');

// Install event - take control immediately
self.addEventListener('install', function(event) {
  console.log('[SW] Installing service worker...');
  event.waitUntil(self.skipWaiting());
});

// Activate event - claim all clients
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating service worker...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  console.log('[SW] Push event received');
  
  if (!event.data) {
    console.log('[SW] Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data:', data);
    
    // Map notification types to icons and badges
    const typeConfig = {
      budget_alert: { icon: '/pwa-192x192.png', badge: '/pwa-192x192.png' },
      subscription: { icon: '/pwa-192x192.png', badge: '/pwa-192x192.png' },
      achievement: { icon: '/pwa-192x192.png', badge: '/pwa-192x192.png' },
      tip: { icon: '/pwa-192x192.png', badge: '/pwa-192x192.png' },
      system: { icon: '/pwa-192x192.png', badge: '/pwa-192x192.png' },
      warning: { icon: '/pwa-192x192.png', badge: '/pwa-192x192.png' }
    };
    
    const config = typeConfig[data.type] || typeConfig.system;
    
    const options = {
      body: data.body || 'New notification from FinBuddy',
      icon: data.icon || config.icon,
      badge: data.badge || config.badge,
      vibrate: data.type === 'warning' ? [200, 100, 200, 100, 200] : [100, 50, 100],
      data: {
        url: data.data?.url || '/',
        type: data.type || 'system',
        dateOfArrival: Date.now(),
      },
      actions: data.actions || [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Dismiss' }
      ],
      tag: data.tag || `finbuddy-${data.type || 'notification'}`,
      renotify: true,
      requireInteraction: data.type === 'warning' || data.type === 'budget_alert'
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'FinBuddy', options)
    );
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked');
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
  console.log('[SW] Notification closed');
});

// Handle fetch for offline support (basic)
self.addEventListener('fetch', function(event) {
  // Just pass through for now - VitePWA handles caching
});
