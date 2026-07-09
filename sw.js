/* ============================================================
   Budologist Service Worker — cache-first for local assets
   ============================================================ */
const CACHE = 'budologist-v3';

const LOCAL_ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './firebase.js',
  './camera.js',
  './manifest.json',
  './icon.png'
];

/* Pre-cache all local assets on install */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(LOCAL_ASSETS))
  );
  self.skipWaiting();
});

/* Remove old caches on activate */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Fetch strategy:
   - Navigation requests  → always serve index.html from cache (fixes PWA 404)
   - CDN / external       → network first, fallback to cache
   - Local assets         → cache first, fallback to network */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  /* Navigation requests (opening the app, refreshing) → serve index.html */
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(cached => {
        if (cached) return cached;
        return fetch('./index.html');
      })
    );
    return;
  }

  /* External CDN resources — network first */
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  /* Local assets — cache first */
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return response;
      });
    })
  );
});


