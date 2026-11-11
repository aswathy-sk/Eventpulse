const CACHE_PREFIX = "eventpulse-tracker-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const APP_SHELL_URL = new URL("./index.html", self.registration.scope);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.add(APP_SHELL_URL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET") {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    let response;

    try {
      response = await fetch(event.request);
    } catch {
      const cachedResponse = await cache.match(event.request);
      const appShell = cachedResponse || await cache.match(APP_SHELL_URL);
      return appShell || new Response("You are offline and the app page is not cached.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    if (response.ok) {
      try {
        await cache.put(event.request, response.clone());
      } catch (error) {
        console.error("Failed to cache navigation response:", error);
      }
    }

    return response;
  })());
});
