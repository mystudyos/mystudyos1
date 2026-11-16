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

self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

// Minimal fetch listener to satisfy PWA installability without altering network streams
self.addEventListener('fetch', function() {});
