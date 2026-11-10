"use client"

import { useEffect, useRef } from "react"
import { type User as FirebaseUser } from "firebase/auth"
import {
  getFCMServiceWorker,
  syncLocalFCMTokenToUser,
  listenForegroundMessages,
} from "@/lib/fcm-client"

interface UseNotificationsProps {
  user: FirebaseUser | null
  onNavigateToChat?: (chatId?: string | null) => void
}

export function useNotifications({ user, onNavigateToChat }: UseNotificationsProps) {
  const onNavigateRef = useRef(onNavigateToChat)
  useEffect(() => {
    onNavigateRef.current = onNavigateToChat
  }, [onNavigateToChat])

  const syncedUidRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    // 1. Register Firebase messaging service worker on app startup
    getFCMServiceWorker()

    // 2. Sync token once per authenticated user UID (never in a loop)
    if (user?.uid && syncedUidRef.current !== user.uid) {
      syncedUidRef.current = user.uid
      syncLocalFCMTokenToUser(user.uid)
    }

    // 3. Listen for postMessage from firebase-messaging-sw.js on notification click
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "FCM_NAVIGATE") {
        console.log("[FCM] Received navigation event from service worker:", event.data)
        onNavigateRef.current?.(event.data.chatId || null)
      }
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage)
    }

    // 4. Check if the app was opened with ?tab=chat&chatId=... in URL
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get("tab")
      const chatIdParam = urlParams.get("chatId")

      if (tabParam === "chat" && onNavigateToChat) {
        onNavigateToChat(chatIdParam || null)
      }
    } catch (e) {
      // Ignore URL parsing errors
    }

    // 5. Listen for foreground push messages
    const unsubscribeForeground = listenForegroundMessages((payload) => {
      const title = payload.notification?.title || payload.data?.title || "StudyOS"
      const body = payload.notification?.body || payload.data?.body || "New message received"

      // Play soft notification sound if audio is available
      try {
        const audio = new Audio("/notification.mp3")
        audio.play().catch(() => {})
      } catch {}

      // If user has granted notifications, show browser notification even in foreground
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          const notification = new Notification(title, {
            body,
            icon: "/icon-192-removebg-preview.png",
            tag: payload.data?.chatId ? `dm-${payload.data.chatId}` : "global-chat",
          })
          notification.onclick = () => {
            window.focus()
            onNavigateRef.current?.(payload.data?.chatId || null)
          }
        } catch (err) {
          console.warn("[FCM] Foreground notification display error:", err)
        }
      }
    })

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage)
      }
      unsubscribeForeground()
    }
  }, [user?.uid])
}
