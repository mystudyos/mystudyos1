"use client"

import { useState, useEffect } from "react"
import { Bell, MessageSquare, ShieldCheck, X } from "lucide-react"
import { requestNotificationPermissionAndGetToken } from "@/lib/fcm-client"

interface NotificationPermissionDialogProps {
  userUid?: string | null
  onPermissionGranted?: (token: string | null) => void
}

export function NotificationPermissionDialog({
  userUid,
  onPermissionGranted,
}: NotificationPermissionDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") {
      return
    }
    if (!("Notification" in globalThis)) {
      window.dispatchEvent(new Event("studyos-notification-prompt-resolved"))
      return
    }

    // If permission is already granted or blocked, don't ask — allow 2nd popup (PWA install) to proceed
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      window.dispatchEvent(new Event("studyos-notification-prompt-resolved"))
      return
    }

    // Prompt new users or users who have not allowed yet once per session
    const alreadyPromptedThisSession = sessionStorage.getItem("studyos_fcm_prompted_session")
    if (alreadyPromptedThisSession) {
      window.dispatchEvent(new Event("studyos-notification-prompt-resolved"))
      return
    }

    // Slight delay (1.2s) after mount so it doesn't jarringly block initial render
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, 1200)

    return () => clearTimeout(timer)
  }, [])

  const notifyPromptResolved = () => {
    try {
      sessionStorage.setItem("studyos_fcm_prompted_session", "true")
      localStorage.setItem("studyos_fcm_prompted", "true")
      window.dispatchEvent(new Event("studyos-notification-prompt-resolved"))
    } catch {}
  }

  const handleEnable = async () => {
    setLoading(true)
    try {
      const token = await requestNotificationPermissionAndGetToken(userUid)
      if (token && onPermissionGranted) {
        onPermissionGranted(token)
      }
    } catch (err) {
      console.warn("Permission request error:", err)
    } finally {
      setLoading(false)
      setIsOpen(false)
      notifyPromptResolved()
    }
  }

  const handleDismiss = () => {
    setIsOpen(false)
    notifyPromptResolved()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6 text-primary" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-base font-bold text-foreground leading-tight">
              Enable Push Notifications
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Stay connected and receive real-time alerts on StudyOS.
            </p>
          </div>
        </div>

        {/* Features preview */}
        <div className="mt-4 p-3 rounded-2xl bg-muted/50 border border-border/60 flex items-center justify-between text-[9px] sm:text-xs font-medium">
          <span className="flex items-center gap-1.5 text-foreground/90">
            <MessageSquare className="w-3.5 h-3.5 text-primary" /> Real-time DMs
          </span>
          <span className="flex items-center gap-1.5 text-foreground/90">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Private & Safe
          </span>
          <span className="flex items-center gap-1.5 text-foreground/90">
            <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Instant Alerts
          </span>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Later
          </button>
          <button
            onClick={handleEnable}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              "Enable Now"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
