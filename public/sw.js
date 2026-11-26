// Offline support. The page itself is fetched network-first so a new deploy is
// picked up on the next load; built assets have hashed names, so they're served
// cache-first and fetched once.

const CACHE = 'power-zone-tracker-v1';
const SHELL = ['./', './manifest.webmanifest', './icon.svg'];
const MAX_ENTRIES = 60;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  // Oldest first: drop stale hashed assets from earlier deploys.
  for (const request of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) {
    await cache.delete(request);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) await cache.put('./', response.clone());
          return response;
        } catch {
          return (await cache.match('./')) ?? Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
        void trim(cache);
      }
      return response;
    })(),
  );
});
