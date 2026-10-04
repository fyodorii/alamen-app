// Service worker for the home-screen web app:
// - keeps the app's files on the device so it opens fast, even offline,
// - shows push notifications sent by push/cron.php and opens the thread when one is tapped.

const VERSION = 'v4';
const PAGE_CACHE = `alamen-page-${VERSION}`;
const FILE_CACHE = `alamen-files-${VERSION}`;
const SCOPE = self.registration.scope; // https://…/app/
// Ask for index.html by name: the server redirects the bare folder address elsewhere.
const PAGE_URL = new URL('index.html', SCOPE).href;
const KEEP_BUNDLES = 3; // old app versions kept so a cached page still finds its code

// Cache the app page and everything it needs on install, so even the second
// launch comes from the device.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch(PAGE_URL, { cache: 'no-cache' });
        if (!isAppPage(res)) return;
        const html = await res.clone().text();
        await (await caches.open(PAGE_CACHE)).put(PAGE_URL, res);
        const urls = [...html.matchAll(/(?:src|href)="(\/app\/(?:_expo|fonts)\/[^"]+|\/app\/splash-logo\.png)"/g)].map((m) => m[1]);
        await (await caches.open(FILE_CACHE)).addAll(urls);
      } catch (e) {
        // Offline during install: files get cached as they are used instead.
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('alamen-') && key !== PAGE_CACHE && key !== FILE_CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })()
  );
});

// The app page: prefer the server's copy so updates show up on the next open, but
// never wait long for it — after a short timeout (or offline) use the saved copy.
const PAGE_TIMEOUT_MS = 2500;

// Only a direct, successful answer is the app page (never a redirect to the forum).
const isAppPage = (res) => res && res.ok && !res.redirected;

async function appPage(event) {
  const cache = await caches.open(PAGE_CACHE);
  const fresh = fetch(PAGE_URL, { cache: 'no-cache' }).then((res) => {
    if (isAppPage(res)) cache.put(PAGE_URL, res.clone());
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, PAGE_TIMEOUT_MS));
  try {
    const res = await Promise.race([fresh, timeout]);
    if (isAppPage(res)) return res;
  } catch (e) {
    // Offline: fall through to the saved copy.
  }
  const saved = await cache.match(PAGE_URL);
  if (saved) {
    event.waitUntil(fresh.catch(() => {}));
    return saved;
  }
  return fresh;
}

// Build files have a content hash in their name, so a saved copy never goes stale.
async function savedFile(request) {
  const cache = await caches.open(FILE_CACHE);
  const saved = await cache.match(request);
  if (saved) return saved;
  const res = await fetch(request);
  if (res.ok) {
    await cache.put(request, res.clone());
    if (/\/_expo\/static\/js\//.test(request.url)) await trimBundles(cache);
  }
  return res;
}

async function trimBundles(cache) {
  const bundles = (await cache.keys()).filter((r) => /\/_expo\/static\/js\//.test(r.url));
  for (const old of bundles.slice(0, Math.max(0, bundles.length - KEEP_BUNDLES))) await cache.delete(old);
}

// Icons and the manifest: answer from the device, refresh in the background.
async function refreshedFile(event) {
  const cache = await caches.open(FILE_CACHE);
  const saved = await cache.match(event.request);
  const fresh = fetch(event.request).then((res) => {
    if (res.ok) cache.put(event.request, res.clone());
    return res;
  });
  if (saved) {
    event.waitUntil(fresh.catch(() => {}));
    return saved;
  }
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Forum pages are cached by the app itself; notification scripts must stay live.
  if (!url.href.startsWith(SCOPE) || url.pathname.includes('/push/')) return;

  if (request.mode === 'navigate') {
    const path = url.pathname.replace(new URL(SCOPE).pathname, '');
    if (path === '' || path === 'index.html') event.respondWith(appPage(event));
    return;
  }
  if (/\/(_expo|assets|fonts)\//.test(url.pathname)) event.respondWith(savedFile(request));
  else event.respondWith(refreshedFile(event));
});

// ---- Push notifications ----

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
    const res = await fetch(new URL('push/pending.php', SCOPE), { cache: 'no-store' });
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
  const url = new URL((event.notification.data && event.notification.data.url) || './', SCOPE).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (client.url.startsWith(SCOPE)) {
          await client.focus();
          client.postMessage({ type: 'open', url });
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
