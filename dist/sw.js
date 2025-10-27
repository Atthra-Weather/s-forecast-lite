// sw.js — v3.0-refresh
const CACHE_NAME = "s-forecast-v3-cache";
const URLS_TO_CACHE = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  console.log("⚙️ [ServiceWorker] Installing new version 3.0-refresh");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting(); // ✅ 즉시 활성화
});

self.addEventListener("activate", (event) => {
  console.log("♻️ [ServiceWorker] Clearing old caches...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // ✅ 새 버전 즉시 적용
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
