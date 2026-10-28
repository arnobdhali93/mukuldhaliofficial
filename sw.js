
/* MukulDhaliOfficial PWA service worker
 * Cache the app's HTML shell for offline navigation.
 * API calls and cross-origin resources are never cached.
 */
const CACHE_NAME = 'mukuldhali-shell-v2';
const INDEX_URL = new URL('./index.html', self.registration.scope).href;

const SHELL_URLS = [
  INDEX_URL,
  new URL('./manifest.json', self.registration.scope).href,
  new URL('./icons/icon-192.png', self.registration.scope).href,
  new URL('./icons/icon-512.png', self.registration.scope).href
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.add(INDEX_URL);

    await Promise.all(SHELL_URLS.slice(1).map(async (url) => {
      try {
        await cache.add(url);
      } catch (_) {
        // Optional assets must not block installation.
      }
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache APIs, CDNs, or external resources.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);

        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(INDEX_URL, response.clone());
        }

        return response;
      } catch (_) {
        const cachedPage = await caches.match(INDEX_URL);

        if (cachedPage) return cachedPage;

        return new Response(
          '<!doctype html><html lang="bn">' +
          '<meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<title>MukulDhaliOfficial — Offline</title>' +
          '<body style="font-family:sans-serif;padding:2rem">' +
          '<h2>ইন্টারনেট সংযোগ নেই</h2>' +
          '<p>আগে অনলাইনে MukulDhaliOfficial খুলে আবার চেষ্টা করুন।</p>' +
          '</body></html>',
          {
            headers: {
              'Content-Type': 'text/html; charset=utf-8'
            },
            status: 200
          }
        );
      }
    })());

    return;
  }

  // Cache only known app-shell assets.
  if (SHELL_URLS.includes(url.href)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);

      if (cached) return cached;

      const response = await fetch(request);

      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    })());
  }
});
