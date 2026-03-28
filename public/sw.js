const CACHE_NAME = 'menumix-v2';
const urlsToCache = ['/'];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forza l'attivazione immediata
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const method = event.request.method;

  // Do not cache API calls to Supabase or non-GET requests
  if (url.includes('supabase.co') || method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── PUSH NOTIFICATIONS ──────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  // Some push services may not deliver the encrypted payload body —
  // fall back to a generic reminder so the notification is never empty.
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { data = {}; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Menumix', {
      body: data.body || 'Hai un promemoria in attesa. Apri l\'app.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'reminder',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
