// Offline support. Every file is fetched from the network when possible
// (so updates arrive straight away) and kept in a cache, which is used
// whenever the network is not available.

const CACHE = 'foothold-v1';

const FILES = [
  './',
  './index.html',
  './styles.css',
  './src/game/main.js',
  './src/game/art.js',
  './src/game/goods.js',
  './src/game/storage.js',
  './src/engine/change.js',
  './src/engine/countup.js',
  './src/engine/diagnose.js',
  './src/engine/learner.js',
  './src/engine/money.js',
  './src/engine/patterns.js',
  './src/engine/rng.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })),
  );
});
