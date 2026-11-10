"use client"

import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging"
import { app } from "./firebase"
import { saveUserFCMToken } from "./user-stats"

let messagingInstance: Messaging | null = null

/**
 * Initialize Firebase Messaging client-side safely.
 */
export async function getFCMClient(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null
  if (messagingInstance) return messagingInstance

  try {
    const supported = await isSupported()
    if (!supported) {
      console.log("[FCM] Push notifications not supported on this browser.")
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
 * Register or get the firebase-messaging-sw.js service worker.
 */
export async function getFCMServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null
  }

  try {
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
    console.log("[FCM] Service Worker registered with scope:", registration.scope)
    return registration
  } catch (err) {
    console.warn("[FCM] Service Worker registration failed:", err)
    return null
  }
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
    // 1. Request native browser notification permission
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      console.log("[FCM] Notification permission was not granted:", permission)
      return null
    }

    // 2. Ensure messaging is supported & Service Worker is registered
    const messaging = await getFCMClient()
    if (!messaging) return null

    const swRegistration = await getFCMServiceWorker()
    if (!swRegistration) {
      console.warn("[FCM] Cannot get token without active Service Worker registration.")
      return null
    }

    // 3. Generate or retrieve device FCM registration token
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    })

    if (token) {
      console.log("[FCM] Token retrieved successfully")
      // Save locally to persist across sessions/login
      localStorage.setItem("studyos_fcm_token", token)

      // If user is currently signed in, write to Firestore
      if (userUid) {
        await saveUserFCMToken(userUid, token)
      }
      return token
    } else {
      console.warn("[FCM] No registration token available.")
      return null
    }
  } catch (err) {
    console.error("[FCM] An error occurred while retrieving token:", err)
    return null
  }
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
    return // Already synced to this user!
  }

  await saveUserFCMToken(userUid, token)
  localStorage.setItem(syncKey, "true")
}

/**
 * Listen for messages received while the app is in the foreground.
 */
export function listenForegroundMessages(callback: (payload: any) => void): () => void {
  let unsubscribe: (() => void) | null = null

  getFCMClient().then((messaging) => {
    if (messaging) {
      unsubscribe = onMessage(messaging, (payload) => {
        console.log("[FCM] Foreground message received:", payload)
        callback(payload)
      })
    }
  })

  return () => {
    if (unsubscribe) unsubscribe()
  }
}
