const CACHE_NAME = 'smart-reminders-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// O agendamento local é controlado pela aplicação para permitir cancelamento.
// Este handler fica preparado para Web Push futuro, caso um backend seja adicionado.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Você tem um lembrete!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    requireInteraction: true,
    tag: data.tag || 'reminder',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Lembrete', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.whatsappUrl || event.notification.data?.url || '/';
  event.waitUntil(
    (targetUrl.startsWith('https://wa.me/')
      ? clients.openWindow(targetUrl)
      : clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
      return undefined;
      }))
  );
});
