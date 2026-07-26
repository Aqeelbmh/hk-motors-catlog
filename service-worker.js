const CACHE_NAME = 'HKMOTORS-V23';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './products.json',
  './logo-hk.png',
  './logo hk.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/maskable-icon.png',
  './supabase-config.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

function isAppShellRequest(request, url) {
  if (request.mode === 'navigate') return true;
  const path = url.pathname;
  return path.endsWith('/') ||
    path.endsWith('/index.html') ||
    path.endsWith('/service-worker.js') ||
    path.endsWith('/supabase-config.js');
}

// Install event: Pre-cache core shell resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Pre-caching offline assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event: Clean up old caches and take control immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network-first for HTML/app shell so updates appear; cache-first for static assets
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Always network-first for app shell / HTML / SW / config so deployments show up
  if (isAppShellRequest(event.request, url) || url.pathname.endsWith('products.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          console.log('[Service Worker] Offline fallback for', url.pathname);
          return caches.match(event.request).then(cached => {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Cache-First with Network Fallback for static assets and libraries
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Stale-while-revalidate: return cache, refresh in background
        fetch(event.request).then(response => {
          if (response && response.status === 200 && (response.type === 'basic' || url.host.includes('fonts.googleapis.com') || url.host.includes('fonts.gstatic.com') || url.host.includes('cdn.jsdelivr.net'))) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        if (response && response.status === 200 && (url.host.includes('fonts.googleapis.com') || url.host.includes('fonts.gstatic.com'))) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
