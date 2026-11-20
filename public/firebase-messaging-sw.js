// Firebase Cloud Messaging + PWA Service Worker for StudyOS
// Single unified Service Worker controlling scope "/" for installability & push notifications.

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Initialize Firebase within the Service Worker using runtime query parameters
const swUrlParams = new URL(self.location.href).searchParams;
const swApiKey = swUrlParams.get("apiKey");

if (swApiKey) {
  firebase.initializeApp({
    apiKey: swApiKey,
    authDomain: swUrlParams.get("authDomain") || "studyos-a4977.firebaseapp.com",
    projectId: swUrlParams.get("projectId") || "studyos-a4977",
    storageBucket: swUrlParams.get("storageBucket") || "studyos-a4977.firebasestorage.app",
    messagingSenderId: swUrlParams.get("messagingSenderId") || "612490443728",
    appId: swUrlParams.get("appId") || "1:612490443728:web:d2b307977999bd419717d5"
  });

  const messaging = firebase.messaging();

  // Handle background data-only FCM messages so there are no duplicate notifications
  messaging.onBackgroundMessage(function(payload) {
    const title = payload.data?.title || payload.notification?.title || 'StudyOS';
    const body = payload.data?.body || payload.notification?.body || 'You have a new message';
    const icon = payload.data?.icon || payload.notification?.icon || '/icon-192-removebg-preview.png';
    const tag = payload.data?.tag || (payload.data?.chatId ? `dm-${payload.data.chatId}` : 'studyos-chat');

    const notificationOptions = {
      body: body,
      icon: icon,
      badge: '/icon-192-removebg-preview.png',
      tag: tag,
      renotify: true,
      silent: false, // Use the user's native device notification sound
      vibrate: [200, 100, 200],
      data: {
        url: payload.data?.url || '/?tab=chat',
        chatId: payload.data?.chatId || null,
        type: payload.data?.type || 'chat',
        timestamp: Date.now()
      }
    };

    return self.registration.showNotification(title, notificationOptions);
  });
}

// Handle notification click: focus matching window or open target route
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/?tab=chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      let targetPathname = '/';
      try {
        targetPathname = new URL(targetUrl, self.location.origin).pathname;
      } catch {}

      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        let clientPathname = '/';
        try {
          clientPathname = new URL(client.url).pathname;
        } catch {}

        if ('focus' in client && clientPathname === targetPathname) {
          client.postMessage({
            type: 'FCM_NAVIGATE',
            url: targetUrl,
            chatId: notificationData.chatId,
            chatType: notificationData.type
          });
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

const STATIC_CACHE = 'studyos-static-v2';
const PAGES_CACHE = 'studyos-pages-v2';
const IS_LOCALHOST = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-logo.webp',
  '/icon-192x192.png',
  '/landing/student-blue.webp',
  '/landing/student-coral.webp',
  '/landing/student-green.webp',
  '/landing/student-purple.webp',
  '/landing/student-yellow.webp',
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  if (IS_LOCALHOST) return;
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      return cache.addAll(PRECACHE_ASSETS).catch(function() {});
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (IS_LOCALHOST || (key !== STATIC_CACHE && key !== PAGES_CACHE)) {
            return caches.delete(key);
          }
        })
      );
    }).then(function() {
      return clients.claim();
    })
  );
});

// Fast PWA shell & immutable static asset caching (skips localhost dev, API, auth, and cross-origin requests)
self.addEventListener('fetch', function(event) {
  if (IS_LOCALHOST) return;
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/__/')) return;

  // Immutable Next.js build assets: Cache-First (0ms on repeat PWA launches)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;
        return fetch(req).then(function(res) {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then(function(cache) {
              cache.put(req, copy);
            });
          }
          return res;
        });
      })
    );
    return;
  }

  // Navigation requests (PWA home-screen tap): Network-First with 1.5s fallback to cached shell
  if (req.mode === 'navigate') {
    event.respondWith(
      new Promise(function(resolve) {
        let settled = false;
        const fallbackTimer = setTimeout(function() {
          if (settled) return;
          caches.match(req).then(function(cachedPage) {
            return cachedPage || caches.match('/');
          }).then(function(hit) {
            if (hit && !settled) {
              settled = true;
              resolve(hit);
            }
          });
        }, 1500);

        fetch(req).then(function(networkRes) {
          clearTimeout(fallbackTimer);
          if (networkRes && networkRes.ok) {
            const copy = networkRes.clone();
            caches.open(PAGES_CACHE).then(function(cache) {
              cache.put(req, copy);
            });
          }
          if (!settled) {
            settled = true;
            resolve(networkRes);
          }
        }).catch(function() {
          clearTimeout(fallbackTimer);
          if (settled) return;
          caches.match(req).then(function(cachedPage) {
            return cachedPage || caches.match('/');
          }).then(function(hit) {
            settled = true;
            resolve(hit || Response.error());
          });
        });
      })
    );
    return;
  }

  // Local static images & icons: Stale-While-Revalidate
  if (
    url.pathname.startsWith('/landing/') ||
    url.pathname.startsWith('/exams/') ||
    /\.(?:webp|png|jpe?g|svg|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then(function(cached) {
        const networkFetch = fetch(req).then(function(res) {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then(function(cache) {
              cache.put(req, copy);
            });
          }
          return res;
        }).catch(function() {
          return cached;
        });
        return cached || networkFetch;
      })
    );
  }
});
