// Firebase Cloud Messaging Service Worker for StudyOS
// Handles background push notifications when the app/tab is closed.

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

  // Handle background messages
  messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const title = payload.notification?.title || payload.data?.title || 'StudyOS Message';
    const body = payload.notification?.body || payload.data?.body || 'You have a new message';
    const icon = payload.notification?.icon || payload.data?.icon || '/icon-192-removebg-preview.png';
    const tag = payload.data?.tag || (payload.data?.chatId ? `dm-${payload.data.chatId}` : 'studyos-chat');

    const notificationOptions = {
      body: body,
      icon: icon,
      badge: '/icon-192-removebg-preview.png',
      tag: tag,
      renotify: true,
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

// Handle notification click: focus existing window or open a new one
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/?tab=chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // 1. If a tab is already open, focus it and post a message to navigate
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          client.postMessage({
            type: 'FCM_NAVIGATE',
            url: targetUrl,
            chatId: notificationData.chatId,
            chatType: notificationData.type
          });
          return client.focus();
        }
      }

      // 2. If no window is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Basic Service Worker Lifecycle listeners
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});
