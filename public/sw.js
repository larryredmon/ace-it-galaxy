// Ace It Galaxy service worker: lets the site be installed as an app and open faster.
// Pages always try the network first, so students get new versions right away.
const CACHE = "aig-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/mascots/ace-owl.webp"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // Firebase, Google, fonts: leave alone
  if (url.pathname.startsWith("/api/")) return;              // never cache AI or account calls

  // Pages: network first, fall back to the saved home page when offline.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh.ok && url.pathname === "/") (await caches.open(CACHE)).put("/", fresh.clone());
        return fresh;
      } catch {
        return (await caches.match("/")) || Response.error();
      }
    })());
    return;
  }

  // Built files have a unique name per version, so the saved copy is always right.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
    return;
  }

  // Images and icons: use the saved copy, refresh it in the background.
  if (/^\/(mascots|icons)\//.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
  }
});
