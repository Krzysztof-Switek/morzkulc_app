/**
 * Service Worker — SKK Morzkulc PWA
 *
 * Strategia cache:
 *  - App shell (HTML, JS, CSS, ikony): Cache-first z fallbackiem do sieci.
 *    Instalacja preloaduje shell do statycznego cache.
 *  - /api/** i zewnętrzne URL-e (Firebase SDK, auth, storage):
 *    Zawsze sieć — nigdy nie cachujemy odpowiedzi API ani danych użytkownika.
 *  - Nawigacja (request.mode === "navigate"):
 *    Network-first; jeśli sieć niedostępna → index.html z cache (offline fallback).
 *
 * Wersjonowanie: zmień CACHE_VERSION przy każdym deployu, który zmienia assets.
 * Stary cache jest automatycznie czyszczony w activate.
 */

const CACHE_VERSION = "v10";
const STATIC_CACHE  = `morzkulc-static-${CACHE_VERSION}`;

// Pliki precachowane przy instalacji SW
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-180.png",
  "/core/app_shell.js",
  "/core/render_shell.js",
  "/core/modules_registry.js",
  "/core/firebase_client.js",
  "/core/api_client.js",
  "/core/access_control.js",
  "/core/router.js",
  "/core/theme.js",
  "/core/module_stub.js",
  "/core/user_error_messages.js",
  "/modules/gear_module.js",
  "/modules/my_reservations_module.js",
  "/modules/godzinki_module.js",
  "/modules/impreza_module.js",
  "/modules/basen_module.js",
  "/styles/app.css",
  "/styles/base.css",
  "/styles/dashboard.css",
  "/styles/gear.css",
  "/styles/start.css",
  "/styles/events.css",
  "/styles/basen.css",
];

// ── Instalacja ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Precachujemy po jednym — błąd jednego zasobu nie blokuje całości
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[SW] precache miss:", url, err?.message);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Aktywacja — czyszczenie starych cache'y + powiadomienie o aktualizacji ────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      const oldCaches = keys.filter((k) => k.startsWith("morzkulc-") && k !== STATIC_CACHE);
      const isUpdate = oldCaches.length > 0;

      return Promise.all(
        oldCaches.map((k) => {
          console.info("[SW] deleting old cache:", k);
          return caches.delete(k);
        })
      )
        .then(() => self.clients.claim())
        .then(() => {
          // Powiadamiaj otwarte karty tylko przy aktualizacji (nie przy pierwszej instalacji)
          if (isUpdate) {
            return self.clients.matchAll({ type: "window" }).then((clients) => {
              clients.forEach((client) => client.postMessage({ type: "SW_UPDATED" }));
            });
          }
        });
    })
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Zewnętrzne origin-y (Firebase SDK z CDN, auth, storage, Firestore)
  //    → zawsze sieć, SW nie ingeruje
  if (url.origin !== self.location.origin) {
    return; // przeglądarka obsłuży normalnie
  }

  // 2. API — zawsze sieć, nigdy nie cachujemy danych użytkownika
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(req));
    return;
  }

  // 3. Nawigacja (wejście na stronę, odświeżenie) — network-first
  //    Fallback: index.html z cache (umożliwia uruchomienie offline)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          // Odśwież kopię index.html w cache przy każdym udanym pobraniu
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
          }
          return resp;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // 4. Statyczne assety (JS, CSS, ikony, manifest) — cache-first, sieć jako fallback
  //    Przy pomyślnym pobraniu z sieci aktualizujemy cache.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((resp) => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
        }
        return resp;
      });
    })
  );
});