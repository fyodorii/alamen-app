// Service worker for the home-screen web app: shows push notifications sent by
// push/cron.php and opens the related thread when one is tapped.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

async function messageFor(event) {
  if (event.data) {
    try {
      return event.data.json();
    } catch (e) {
      return { body: event.data.text() };
    }
  }
  // Servers whose PHP cannot encrypt payloads send an empty push; fetch the text instead.
  try {
    const res = await fetch(new URL('push/pending.php', self.registration.scope), { cache: 'no-store' });
    return await res.json();
  } catch (e) {
    return {};
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const msg = await messageFor(event);
      // iOS requires every push to show a notification, so always show one.
      await self.registration.showNotification(msg.title || 'شبكة الأمين السلفية', {
        body: msg.body || '',
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: msg.tag || undefined,
        lang: 'ar',
        dir: 'rtl',
        data: { url: msg.url || './' },
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (client.url.startsWith(self.registration.scope)) {
          await client.focus();
          client.postMessage({ type: 'open', url });
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
