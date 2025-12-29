const CACHE_NAME = 'factures-pwa-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache : Mise en cache des ressources critiques');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activation : Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Cache : Suppression de l\'ancien cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Interception des requêtes (Stratégie : Cache First, then Network)
self.addEventListener('fetch', (event) => {
  // On ne met jamais en cache les requêtes POST (Uploads)
  if (event.request.method === 'POST') {
    return; 
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((networkResponse) => {
          // On ne met en cache que les réponses valides
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      })
  );
});

// Gestion de la synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-uploads') {
    console.log('Sync : Tentative de synchronisation détectée');
    // Note : localStorage n'est pas accessible ici. 
    // Il faudra migrer vers IndexedDB pour une vraie gestion hors-ligne.
  }
});