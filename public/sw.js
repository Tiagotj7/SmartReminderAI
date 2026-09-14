const CACHE_NAME = 'smart-reminders-v1';
const urlsToCache = ['/', '/index.html'];

// ═══════════════════════════════════════
// INSTALAÇÃO DO SERVICE WORKER
// ═══════════════════════════════════════
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// ═══════════════════════════════════════
// ATIVAÇÃO
// ═══════════════════════════════════════
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ═══════════════════════════════════════
// FETCH - Cache primeiro
// ═══════════════════════════════════════
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// ═══════════════════════════════════════
// NOTIFICAÇÕES PUSH
// ═══════════════════════════════════════
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Você tem um lembrete!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'done', title: '✅ Concluído' },
      { action: 'snooze', title: '⏰ Adiar 10min' }
    ],
    requireInteraction: true,
    tag: data.tag || 'reminder',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🔔 Lembrete!', options)
  );
});

// ═══════════════════════════════════════
// CLIQUE NA NOTIFICAÇÃO
// ═══════════════════════════════════════
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'snooze') {
    // Reagendar para 10 minutos
    setTimeout(() => {
      self.registration.showNotification('⏰ Lembrete Adiado', {
        body: event.notification.body,
        icon: '/icon-192.png',
        vibrate: [200, 100, 200],
      });
    }, 10 * 60 * 1000);
    return;
  }

  // Abrir o app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// ═══════════════════════════════════════
// MENSAGENS DO APP → SERVICE WORKER
// ═══════════════════════════════════════
// setTimeout guarda o delay num inteiro de 32 bits: acima de ~24.8 dias
// (2^31-1 ms) ele estoura e dispara quase na hora. Por isso agendamos
// em pedaços, nunca passando desse limite de uma vez.
const MAX_TIMEOUT_DELAY = 2147483647;

function showReminderNotification(reminder) {
  self.registration.showNotification(`🔔 ${reminder.title}`, {
    body: `${reminder.description || ''}\n📅 ${reminder.formattedDate}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    tag: `reminder-${reminder.id}`,
    actions: [
      { action: 'done', title: '✅ Concluído' },
      { action: 'snooze', title: '⏰ +10min' }
    ],
    data: { reminderId: reminder.id }
  });
}

function scheduleChunked(reminder, remainingDelay) {
  if (remainingDelay > MAX_TIMEOUT_DELAY) {
    setTimeout(() => {
      scheduleChunked(reminder, remainingDelay - MAX_TIMEOUT_DELAY);
    }, MAX_TIMEOUT_DELAY);
    return;
  }
  setTimeout(() => {
    showReminderNotification(reminder);
  }, Math.max(remainingDelay, 0));
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { reminder, delay } = event.data;
    scheduleChunked(reminder, delay);
  }
});