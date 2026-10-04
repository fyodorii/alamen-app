// Web Push for the home-screen web app: the service worker (public/sw.js) shows
// notifications sent by the PHP script in public/push/, even when the app is closed.

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.navigator.standalone === true || !!window.matchMedia?.('(display-mode: standalone)').matches;

let registration;
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  // Relative to the app's folder (/app/), so the worker controls only the app.
  registration ??= navigator.serviceWorker.register('sw.js').catch(() => null);
  return registration;
}

async function api(path, body) {
  const res = await fetch(`push/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function base64UrlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function currentSubscription() {
  const reg = await registerServiceWorker();
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function getPushState() {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  return !!(await currentSubscription());
}

// Must be called straight from a tap: iOS only shows the permission prompt for a user gesture.
export async function enablePush(topics) {
  if (!pushSupported()) throw new Error(isIOS() && !isStandalone() ? 'ADD_TO_HOME' : 'UNSUPPORTED');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('DENIED');
  const reg = await registerServiceWorker();
  if (!reg) throw new Error('UNSUPPORTED');
  const { publicKey } = await api('key.php');
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }));
  await api('subscribe.php', { subscription: sub.toJSON(), topics });
  return true;
}

export async function updatePushTopics(topics) {
  const sub = await currentSubscription();
  if (sub) await api('subscribe.php', { subscription: sub.toJSON(), topics });
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await api('subscribe.php', { endpoint: sub.endpoint, remove: true }).catch(() => {});
  await sub.unsubscribe();
}

// Taps on a notification while the app is open arrive as a message from the service worker.
export function onNotificationOpen(handler) {
  if (!('serviceWorker' in navigator)) return () => {};
  const listen = (e) => {
    if (e.data?.type === 'open') handler(e.data.url);
  };
  navigator.serviceWorker.addEventListener('message', listen);
  return () => navigator.serviceWorker.removeEventListener('message', listen);
}

// When a notification opens the app fresh, the thread to show is in the URL (?t=123).
export function initialThreadId() {
  const id = new URLSearchParams(window.location.search).get('t');
  if (id) window.history.replaceState(null, '', window.location.pathname);
  return id;
}
