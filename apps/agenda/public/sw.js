/* Service worker mínimo de la Agenda Irene.
   Estrategia deliberadamente conservadora: red primero, y solo se cachean
   assets estáticos inmutables de Next (/_next/static). Nunca se cachean
   páginas ni llamadas a Supabase — la agenda trabaja con datos vivos y auth. */

const CACHE = "agenda-irene-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isImmutableAsset =
    url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");

  if (!isImmutableAsset) return; // red directa para todo lo demás

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
    )
  );
});
