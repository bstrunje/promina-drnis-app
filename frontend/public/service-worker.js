/**
 * SERVICE WORKER - Multi-Tenant PWA
 * 
 * Jednostavni service worker za PWA funkcionalnost
 * Podržava offline pristup i cache-iranje resursa
 */

// NAPOMENA: Promijeni datum kada deploy-aš novu verziju s promjenama u JS/CSS
const CACHE_VERSION = 'v2025-11-02';
const CACHE_NAME = `pwa-cache-${CACHE_VERSION}`;

// Resursi za cache-iranje
// NAPOMENA: manifest.json se ne cache-ira jer se dinamički generira preko API-ja
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/pwa/icons/icon-192x192.png',
  '/pwa/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other protocols
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Network-only for JS/CSS and versioned build assets to avoid serving HTML fallbacks
  const dest = event.request.destination;
  if (dest === 'script' || dest === 'style' || event.request.url.includes('/assets/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // KRITIČNO: NE CACHE-IRAJ API POZIVE!
  // API pozivi moraju uvijek biti fresh s servera
  if (event.request.url.includes('/api/')) {
    return; // Pusti da ide direktno na network
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[SW] Serving from cache:', event.request.url);
        return cachedResponse;
      }

      // Not in cache - fetch from network
      return fetch(event.request).then((response) => {
        // Don't cache if not a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache dynamic content
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch((error) => {
        console.error('[SW] Fetch failed:', error);
        // Return offline page or fallback
        return caches.match('/index.html');
      });
    })
  );
});
