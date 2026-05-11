const CACHE_NAME = 'bullet-forge-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  // Vite usually bundles the assets, so we can just cache everything that is requested
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((networkResponse) => {
          // Dynamic caching
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Don't cache API or external unneeded requests too aggressively
          if (event.request.url.includes('google.com')) return networkResponse;

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        });
      }).catch(() => {
        // Fallback for HTML if totally offline and not cached
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});
