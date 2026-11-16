"use client"

import { useEffect, useRef } from "react"
import { type User as FirebaseUser } from "firebase/auth"
import {
  getFCMServiceWorker,
  refreshFCMTokenIfGranted,
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

    // 1. Register unified Firebase messaging + PWA service worker
    getFCMServiceWorker()

    // 2. Refresh/sync live FCM token once per authenticated user UID
    if (user?.uid && syncedUidRef.current !== user.uid) {
      syncedUidRef.current = user.uid
      refreshFCMTokenIfGranted(user.uid)
    } else if (!user?.uid) {
      syncedUidRef.current = null
    }

    // 3. Listen for postMessage from firebase-messaging-sw.js on notification click
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "FCM_NAVIGATE") {
        onNavigateRef.current?.(event.data.chatId || null)
      }
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage)
    }

    // 4. Handle cold launches opened via ?tab=chat&chatId=...
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get("tab")
      const chatIdParam = urlParams.get("chatId")

      if (tabParam === "chat" && onNavigateRef.current) {
        onNavigateRef.current(chatIdParam || null)
      }
    } catch {
      // Ignore URL parsing errors
    }

    // 5. Display foreground push notifications via Service Worker so Android/Desktop/iOS
    //    PWAs work consistently and play the user's native default device sound.
    const unsubscribeForeground = listenForegroundMessages(async (payload) => {
      if (!("Notification" in window) || Notification.permission !== "granted") {
        return
      }

      const title = payload.data?.title || payload.notification?.title || "StudyOS"
      const body = payload.data?.body || payload.notification?.body || "New message received"
      const chatId = payload.data?.chatId || null
      const tag = payload.data?.tag || (chatId ? `dm-${chatId}` : "global-chat")
      const url = payload.data?.url || (chatId ? `/?tab=chat&chatId=${chatId}` : "/?tab=chat")

      try {
        const reg = await getFCMServiceWorker()
        if (reg && "showNotification" in reg) {
          await reg.showNotification(title, {
            body,
            icon: "/icon-192-removebg-preview.png",
            badge: "/icon-192-removebg-preview.png",
            tag,
            silent: false,
            data: { url, chatId, type: payload.data?.type || "chat" },
          })
          return
        }

        // Desktop fallback when no Service Worker registration is active
        const notification = new Notification(title, {
          body,
          icon: "/icon-192-removebg-preview.png",
          tag,
          silent: false,
        })
        notification.onclick = () => {
          window.focus()
          onNavigateRef.current?.(chatId)
        }
      } catch (err) {
        console.warn("Foreground notification display error:", err)
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
