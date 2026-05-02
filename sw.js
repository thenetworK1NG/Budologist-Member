const CACHE = 'budologist-v1'

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './js/app.js',
  './js/firebase.js',
  './js/signature.js',
  './js/pages/analytics.js',
  './js/pages/members.js',
  './js/pages/add-member.js',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return

  // Firebase / CDN resources — network first, cache fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(cache => cache.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
