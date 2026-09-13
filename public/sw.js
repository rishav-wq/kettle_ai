/*
  Kettle service worker.

  Deliberately small. It caches the app shell so a second visit paints
  immediately on a slow connection, and it serves the offline page when a
  navigation fails. It does not cache anything personal, anything from the API,
  or any video.

  Network-first for navigation, so a signed-in person never sees a stale page
  that thinks they are logged out. Cache-first only for immutable build assets.
*/

const VERSION = "kettle-v1";
const SHELL = ["/offline", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache anything that depends on who is asking.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline").then((r) => r ?? Response.error())));
    return;
  }

  // Build output is content-hashed, so it is safe to serve from cache forever.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copy));
            return res;
          })
      )
    );
  }
});
