/**
 * SERVICE WORKER - Multi-Tenant PWA
 * 
 * Jednostavni service worker za PWA funkcionalnost
 * Podržava offline pristup i cache-iranje resursa
 */

// NAPOMENA: Promijeni datum kada deploy-aš novu verziju s promjenama u JS/CSS
const CACHE_VERSION = 'v2025-11-03';
// Dev-only logging flag (service worker nije bundlan, pa koristimo hostname detekciju)
const DEBUG = (self.location && self.location.hostname === 'localhost');
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
  if (DEBUG) console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      if (DEBUG) console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  if (DEBUG) console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            if (DEBUG) console.log('[SW] Deleting old cache:', name);
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

  // KRITIČNO: NE CACHE-IRAJ API POZIVE!
  // API pozivi moraju uvijek biti fresh s servera
  if (event.request.url.includes('/api/')) {
    return; // Pusti da ide direktno na network
  }

  // Network-only for JS/CSS and versioned build assets to avoid serving stale cached modules
  const dest = event.request.destination;
  if (dest === 'script' || dest === 'style' || event.request.url.includes('/assets/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Always fetch organization uploads from network to avoid stale logos/documents
  if (event.request.url.includes('/uploads/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first for navigation (HTML) to avoid stale cached versions
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).catch((error) => {
        if (DEBUG) console.error('[SW] Navigation fetch failed:', error);
        // Return cached index.html only if network fails completely
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Cache-first for everything else (images, fonts, PWA icons)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        if (DEBUG) console.log('[SW] Serving from cache:', event.request.url);
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
        if (DEBUG) console.error('[SW] Fetch failed:', error);
        // For non-navigation requests, don't return HTML fallback
        throw error;
      });
    })
  );
});
