const CACHE_NAME = 'webcam-viewer-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin resources
  if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Return cached version or fetch from network
          if (response) {
            console.log('Serving from cache:', event.request.url);
            return response;
          }
          
          console.log('Fetching from network:', event.request.url);
          return fetch(event.request)
            .then(response => {
              // Don't cache non-successful responses
              if (!response.ok) {
                return response;
              }
              
              // Clone the response since it can only be used once
              const responseClone = response.clone();
              
              // Add to cache for future offline use
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseClone);
                });
              
              return response;
            })
            .catch(() => {
              // Network failed, check if we have a cached fallback
              console.log('Network failed for:', event.request.url);
              return caches.match('./index.html');
            });
        })
    );
  }
});