// Service worker: makes the game installable and keeps the app shell and assets cached.
// API calls always go to the network; progress lives on the server.
const CACHE = "djesi-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["/"])).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const put = (req, res) => {
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((cache) => cache.put(req, copy));
  }
  return res;
};

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Build assets have content hashes in their names: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
    return;
  }
  // Pages: network first, cached copy when offline.
  event.respondWith(
    fetch(req)
      .then((res) => put(req, res))
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
  );
});
