// ============================================
// sw.js — Service Worker de Location App
// ============================================

const CACHE_VERSION = "location-app-v16";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  "/",
  "/index.html",
  "/login.html",
  "/login.html?source=pwa",
  "/register.html",
  "/changer-mot-de-passe.html",
  "/profil.html",
  "/bailleur.html",
  "/locataire.html",
  OFFLINE_URL,
  "/manifest.json",
  "/css/style.css",
  "/css/animations.css",
  "/css/theme.css?v=16",
  "/js/icons.js?v=16",
  "/js/ui.js?v=16",
  "/js/onboarding.js?v=16",
  "/js/animations.js",
  "/js/notifications.js?v=6",
  "/js/charts.js",
  "/js/calendar.js",
  "/js/navbar.js?v=16",
  "/js/bailleur.js?v=16",
  "/js/chat.js?v=16",
  "/js/i18n.js?v=16",
  "/js/login.js?v=16",
  "/js/index.js",
  "/js/locataire.js?v=16",
  "/js/profil.js?v=16",
  "/js/changer-mot-de-passe.js?v=16",
  "/js/pwa.js?v=16",
  "/assets/hero-bg.jpeg",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isCacheable(response) {
  return response && (response.ok || response.type === "opaque");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Les données métier et les fichiers privés ne sont jamais mis en cache.
  if (url.origin === self.location.origin && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/"))) {
    return;
  }

  // Navigation : réseau d'abord, cache ensuite, page hors ligne en dernier recours.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheable(response)) {
            const copie = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copie));
          }
          return response;
        })
        .catch(async () => {
          return (await caches.match(request))
            || (await caches.match(OFFLINE_URL))
            || new Response("Hors ligne", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        })
    );
    return;
  }

  // Ressources statiques : cache d'abord, mise à jour silencieuse en arrière-plan.
  event.respondWith(
    caches.match(request).then((cached) => {
      const reseau = fetch(request)
        .then((response) => {
          if (isCacheable(response)) {
            const copie = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copie));
          }
          return response;
        })
        .catch(() => null);

      return cached || reseau || new Response("", { status: 504 });
    })
  );
});
