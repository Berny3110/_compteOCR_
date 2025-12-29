const CACHE_NAME = 'factures-pwa-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  // Ne pas mettre en cache les requêtes POST (uploads)
  if (event.request.method === 'POST') {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourne depuis le cache si disponible
        if (response) {
          return response;
        }

        // Sinon, fetch depuis le réseau
        return fetch(event.request).then((response) => {
          // Ne pas mettre en cache les réponses invalides
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone la réponse
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

// Synchronisation en arrière-plan (Background Sync)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-uploads') {
    event.waitUntil(syncUploads());
  }
});

// Fonction de synchronisation des uploads
async function syncUploads() {
  try {
    const queue = JSON.parse(localStorage.getItem('uploadQueue') || '[]');
    
    if (queue.length === 0) return;

    const uploads = [];
    
    for (const item of queue) {
      // Convertir base64 en blob
      const response = await fetch(item.data);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, item.filename);
      formData.append('timestamp', item.timestamp);
      formData.append('synced', 'true');

      // Tenter l'upload
      const uploadPromise = fetch('http://192.168.1.100:8000/upload', {
        method: 'POST',
        body: formData
      });

      uploads.push(uploadPromise);
    }

    // Attendre tous les uploads
    await Promise.all(uploads);
    
    // Vider la file d'attente
    localStorage.setItem('uploadQueue', '[]');
    
    // Notifier l'utilisateur
    self.registration.showNotification('Uploads synchronisés', {
      body: `${queue.length} facture(s) envoyée(s) avec succès`,
      icon: '/icons/icon-192x192.png'
    });

  } catch (error) {
    console.error('Erreur sync:', error);
  }
}
```

## 🚀 **Instructions d'installation**

### 1. **Structure des fichiers**
```
factures-pwa/
│
├── index.html
├── manifest.json
├── service-worker.js
└── icons/
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png