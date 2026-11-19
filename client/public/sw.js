/* Service worker for Amali's Trivia Game.
 *
 * Goals: make the app installable, speed up repeat loads, and show the app shell
 * instead of a browser error page when the network (or a Railway redeploy) is flaky.
 *
 * The game itself is real-time (Socket.io), so it only plays online. This worker
 * never touches /socket.io or /api, so live game data is always fetched fresh.
 */
const VERSION = 'v1';
const SHELL_CACHE = `trivia-shell-${VERSION}`;
const ASSET_CACHE = `trivia-assets-${VERSION}`;
const MAX_ASSETS = 30; // hashed build files pile up across deploys; keep the newest few

const SHELL_URLS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Google Fonts etc.: browser default
  if (url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/api/')) return; // live data

  // Page loads: network first, so a new deploy is picked up straight away.
  // Fall back to the cached shell if offline or the server is returning errors.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
            return res;
          }
          return caches.match('/').then((shell) => shell || res);
        })
        .catch(() => caches.match('/').then((shell) => shell || Response.error())),
    );
    return;
  }

  // Vite's hashed output in /assets is immutable: cache first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches
                .open(ASSET_CACHE)
                .then((cache) => cache.put(req, copy))
                .then(() => trimCache(ASSET_CACHE, MAX_ASSETS));
            }
            return res;
          }),
      ),
    );
  }
  // Everything else (icons, manifest, favicon): default network behaviour.
});
