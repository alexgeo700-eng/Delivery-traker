// Service Worker - Delivery Tracker George PWA
// Versiune cache - schimbă numărul când actualizezi aplicația
const CACHE_NAME = 'delivery-tracker-v2';

// Fișiere de cache la instalare
const FILES_TO_CACHE = [
  './delivery_tracker_george_html_toate_3.html',
  './manifest.json',
  './service-worker.js'
];

// Instalare service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalare...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache deschis, adaug fișierele locale...');
      return cache.addAll(FILES_TO_CACHE).catch((err) => {
        console.warn('[SW] Cache parțial eșuat:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activare și curățare cache vechi
self.addEventListener('activate', (event) => {
  console.log('[SW] Activare...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Șterg cache vechi:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Intercept fetch - strategie: Network First, fallback la Cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Pentru Firebase și CDN-uri externe: treci direct la rețea (nu cache)
  const externalHosts = [
    'firebasedatabase.app',
    'firebaseio.com',
    'googleapis.com',
    'gstatic.com',
    'cdn.tailwindcss.com',
    'fonts.googleapis.com',
    'generativelanguage.googleapis.com'
  ];

  const isExternal = externalHosts.some(host => url.hostname.includes(host));

  if (isExternal) {
    // Firebase și API-uri: mereu network, nu cache
    event.respondWith(fetch(event.request));
    return;
  }

  // Fișiere locale: Network First, fallback cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Salvează în cache dacă e OK
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline: încearcă din cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback pentru navigare
          return caches.match('./delivery_tracker_george_html_toate_3.html');
        });
      })
  );
});
