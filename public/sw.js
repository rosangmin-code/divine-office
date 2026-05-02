// v5 — FR-NEW #230 (F-X5): new routes `/pray/[date]/firstVespers` and
// `/pray/[date]/firstCompline` introduced; bumping invalidates the prior
// HTML/asset cache so existing PWA installs do NOT serve a 404 from
// stale `network-only` HTML or stale precache. See CLAUDE.md
// "Service Worker 캐시 — 배포 회귀 1순위 리스크".
const CACHE_VERSION = 'divine-office-v5'
const OFFLINE_URL = '/offline.html'
const PRECACHE_URLS = [OFFLINE_URL, '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Network-only for HTML: Vercel already sends no-store headers, and
    // caching the response here caused stale markup to be served for users
    // whose PageRef links were still pointing at the old external PDF href.
    // Fall back to the offline page only when the network is unreachable.
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    )
    return
  }

  const destination = request.destination
  if (
    destination === 'script' ||
    destination === 'style' ||
    destination === 'font' ||
    destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches
                .open(CACHE_VERSION)
                .then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
})
