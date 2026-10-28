/* MukulDhaliOfficial PWA service worker
 * Conservative caching: keeps the app shell available and avoids caching API responses.
 */
const CACHE_NAME = 'mukuldhali-shell-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never cache Supabase/API calls or other cross-origin dynamic requests.
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request, { ignoreSearch: true });
          return cached || caches.match('./index.html') || new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title><p style="font-family:sans-serif;padding:2rem">ইন্টারনেট সংযোগ নেই। আবার অনলাইনে এসে MukulDhaliOfficial খুলুন।</p>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
          );
        })
    );
    return;
  }
  // Cache only same-origin app-shell files; do not cache API or arbitrary data.
  if (APP_SHELL.some((path) => new URL(path, self.registration.scope).pathname === url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});
