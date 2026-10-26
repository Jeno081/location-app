// ============================================
// sw.js — Service Worker de Location App
// ============================================

const CACHE_VERSION = "location-app-v23";
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
  "/css/theme.css?v=22",
  "/js/icons.js?v=22",
  "/js/ui.js?v=22",
  "/js/onboarding.js?v=22",
  "/js/animations.js",
  "/js/notifications.js?v=6",
  "/js/charts.js",
  "/js/calendar.js",
  "/js/navbar.js?v=22",
  "/js/bailleur.js?v=22",
  "/js/chat.js?v=22",
  "/js/i18n.js?v=22",
  "/js/login.js?v=22",
  "/js/index.js",
  "/js/locataire.js?v=22",
  "/js/profil.js?v=22",
  "/js/changer-mot-de-passe.js?v=22",
  "/js/pwa.js?v=22",
  "/js/push.js?v=22",
  "/js/firebase-config.js?v=22",
  "/vendor/firebase-app-compat.js?v=22",
  "/vendor/firebase-messaging-compat.js?v=22",
  "/vendor/lucide.min.js?v=22",
  "/vendor/chart.umd.min.js?v=22",
  "/vendor/pdf.min.js?v=22",
  "/vendor/pdf.worker.min.js?v=22",
  "/assets/hero-bg.jpeg",
  "/icons/logo.png",
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
  return response && response.ok;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Les ressources tierces (polices, etc.) ne sont jamais interceptées ni mises en cache.
  if (url.origin !== self.location.origin) return;

  // Les données métier et les fichiers privés ne sont jamais mis en cache.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) return;

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

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = {};
  }

  const data = payload.data || {};
  const notification = payload.notification || {};
  const title = data.title || notification.title || "Location App";
  const body = data.body || notification.body || "";
  const url = data.url || (payload.fcmOptions && payload.fcmOptions.link) || "/";
  const tag = data.tag || "location-app";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/favicon-32.png",
      tag,
      renotify: true,
      data: { url }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const fenetre of fenetres) {
      if (fenetre.url.startsWith(self.location.origin)) {
        await fenetre.focus();
        if ("navigate" in fenetre) await fenetre.navigate(cible);
        return;
      }
    }
    await self.clients.openWindow(cible);
  })());
});
