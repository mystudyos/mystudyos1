"use client"

import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging"
import { app, auth } from "./firebase"
import { saveUserFCMToken } from "./user-stats"

let messagingInstance: Messaging | null = null
let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null

/**
 * Initialize Firebase Messaging client-side safely.
 */
export async function getFCMClient(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null
  if (messagingInstance) return messagingInstance

  try {
    const supported = await isSupported()
    if (!supported) {
      return null
    }
    messagingInstance = getMessaging(app)
    return messagingInstance
  } catch (err) {
    console.warn("[FCM] Error initializing messaging:", err)
    return null
  }
}

/**
 * Register or reuse the single unified Service Worker (`firebase-messaging-sw.js`)
 * for both PWA installability and FCM push notifications on scope "/".
 */
export function getFCMServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null)
  }

  if (swRegistrationPromise) {
    return swRegistrationPromise
  }

  swRegistrationPromise = (async () => {
    try {
      // Remove any legacy standalone /sw.js registration competing for scope "/"
      const existingRegs = await navigator.serviceWorker.getRegistrations()
      for (const reg of existingRegs) {
        const scriptUrl = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || ""
        if (scriptUrl.endsWith("/sw.js")) {
          await reg.unregister().catch(() => {})
        }
      }

      const swParams = new URLSearchParams({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studyos-a4977.firebaseapp.com",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studyos-a4977",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studyos-a4977.firebasestorage.app",
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "612490443728",
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:612490443728:web:d2b307977999bd419717d5",
      })
      const swUrl = `/firebase-messaging-sw.js?${swParams.toString()}`
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: "/",
      })
      await navigator.serviceWorker.ready
      return registration
    } catch (err) {
      console.warn("Service Worker registration failed:", err)
      swRegistrationPromise = null
      return null
    }
  })()

  return swRegistrationPromise
}

async function fetchAndPersistFCMToken(userUid?: string | null): Promise<string | null> {
  const messaging = await getFCMClient()
  if (!messaging) return null

  const swRegistration = await getFCMServiceWorker()
  if (!swRegistration) {
    console.warn("[FCM] Cannot get token without active Service Worker registration.")
    return null
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: swRegistration,
  })

  if (!token) {
    console.warn("[FCM] No registration token available.")
    return null
  }

  localStorage.setItem("studyos_fcm_token", token)
  if (userUid) {
    await saveUserFCMToken(userUid, token)
  }
  return token
}

/**
 * Request Notification Permission and retrieve FCM Token.
 * If userUid is supplied, saves token to Firestore immediately.
 */
export async function requestNotificationPermissionAndGetToken(
  userUid?: string | null
): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      return null
    }
    return await fetchAndPersistFCMToken(userUid)
  } catch (err) {
    console.error("[FCM] An error occurred while retrieving token:", err)
    return null
  }
}

/**
 * Silently refreshes and persists the active FCM token whenever notification
 * permission is already granted (handles cleared localStorage, token rotation,
 * and multi-device sign-ins without showing a prompt).
 */
export async function refreshFCMTokenIfGranted(userUid: string): Promise<void> {
  if (typeof window === "undefined" || !userUid) return
  if (!("Notification" in window)) return

  if (Notification.permission === "granted") {
    try {
      await fetchAndPersistFCMToken(userUid)
      return
    } catch (err) {
      console.warn("[FCM] Silent token refresh failed:", err)
    }
  }

  await syncLocalFCMTokenToUser(userUid)
}

/**
 * Syncs locally saved FCM token to the user document once they log in.
 */
export async function syncLocalFCMTokenToUser(userUid: string): Promise<void> {
  if (typeof window === "undefined" || !userUid) return
  const token = localStorage.getItem("studyos_fcm_token")
  if (!token) return

  const syncKey = `fcm_synced_${userUid}_${token}`
  if (localStorage.getItem(syncKey) === "true") {
    return
  }

  await saveUserFCMToken(userUid, token)
}

/**
 * Dispatches a push notification request authenticated with the current user's
 * Firebase Auth ID token.
 */
export async function dispatchPushNotification(payload: {
  type: "dm" | "room"
  senderName: string
  text: string
  chatId?: string
  recipientUid?: string
  roomName?: string
}): Promise<void> {
  if (typeof window === "undefined") return
  try {
    const idToken = await auth.currentUser?.getIdToken()
    if (!idToken) return

    await fetch("/api/send-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.warn("[Push] Failed to trigger notification:", err)
  }
}

/**
 * Listen for messages received while the app is in the foreground.
 */
export function listenForegroundMessages(callback: (payload: any) => void): () => void {
  let unsubscribe: (() => void) | null = null
  let cancelled = false

  getFCMClient().then((messaging) => {
    if (cancelled || !messaging) return
    unsubscribe = onMessage(messaging, (payload) => {
      callback(payload)
    })
  })

  return () => {
    cancelled = true
    if (unsubscribe) unsubscribe()
  }
}
