// Offline support. Every file is fetched from the network when possible
// (so updates arrive straight away) and kept in a cache, which is used
// whenever the network is not available.

const CACHE = 'foothold-v9';

const FILES = [
  './',
  './index.html',
  './styles.css',
  './src/counter/change.js',
  './src/counter/countup.js',
  './src/counter/job.js',
  './src/counter/money.js',
  './src/counter/patterns.js',
  './src/depot/job.js',
  './src/depot/patterns.js',
  './src/depot/problems.js',
  './src/engine/diagnose.js',
  './src/engine/learner.js',
  './src/engine/rng.js',
  './src/game/art.js',
  './src/game/counter-view.js',
  './src/game/depot-view.js',
  './src/game/dom.js',
  './src/game/goods.js',
  './src/game/kitchen-view.js',
  './src/game/main.js',
  './src/game/number-pad.js',
  './src/game/office-view.js',
  './src/game/storage.js',
  './src/kitchen/fractions.js',
  './src/kitchen/job.js',
  './src/kitchen/patterns.js',
  './src/kitchen/problems.js',
  './src/office/job.js',
  './src/office/patterns.js',
  './src/office/problems.js',
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
  // "no-cache" makes the browser check with the server instead of reusing
  // its own stored copy, so a new version shows up on the next visit.
  event.respondWith(
    fetch(request.url, { cache: 'no-cache' })
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
