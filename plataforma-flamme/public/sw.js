// Service worker (Flamme): recebe as notificações push e abre a demanda ao tocar.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { titulo: event.data && event.data.text() }; }
  const icone = '/marca/flamme-192.png';
  event.waitUntil(
    self.registration.showNotification(d.titulo || 'Nova atualização', {
      body: d.corpo || '',
      icon: icone,
      badge: icone,
      tag: d.tag,
      renotify: Boolean(d.tag),
      data: { url: d.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const alvo = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abas) => {
      for (const aba of abas) {
        if ('focus' in aba) {
          aba.navigate(alvo).catch(() => {});
          return aba.focus();
        }
      }
      return self.clients.openWindow(alvo);
    })
  );
});
