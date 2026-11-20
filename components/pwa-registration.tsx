"use client"

import { useEffect, useState } from "react"
import { Smartphone } from "lucide-react"

export function PWARegistration() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [canShowInstall, setCanShowInstall] = useState(false)

  useEffect(() => {
    // Purge any stale caches in local dev so Next HMR chunks are never shadowed
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
      "caches" in window
    ) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((k) => k.startsWith("studyos-")).map((k) => caches.delete(k))))
        .catch(() => {})
    }

    // Defer Service Worker registration until browser is idle so it never blocks FCP/LCP
    let idleId: number | null = null
    let swTimer: ReturnType<typeof setTimeout> | null = null
    const registerSW = () => {
      import("@/lib/fcm-client")
        .then((m) => m.getFCMServiceWorker())
        .catch(() => {})
    }
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = (window as any).requestIdleCallback(registerSW, { timeout: 2500 })
    } else {
      swTimer = setTimeout(registerSW, 1200)
    }

    // Check if Notification popup (1st popup) is already resolved or not needed
    const isNotificationResolved = () => {
      if (typeof window === "undefined") return false
      if (!("Notification" in window)) return true
      if (Notification.permission === "granted" || Notification.permission === "denied") {
        return true
      }
      return sessionStorage.getItem("studyos_fcm_prompted_session") === "true"
    }

    let delayTimer: ReturnType<typeof setTimeout> | null = null

    if (isNotificationResolved()) {
      delayTimer = setTimeout(() => {
        setCanShowInstall(true)
      }, 1500)
    }

    const handleNotificationResolved = () => {
      if (delayTimer) clearTimeout(delayTimer)
      delayTimer = setTimeout(() => {
        setCanShowInstall(true)
      }, 800)
    }

    window.addEventListener("studyos-notification-prompt-resolved", handleNotificationResolved)

    // Handle the install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered after the 1st popup resolves
      setDeferredPrompt(e)
      if (!window.matchMedia("(display-mode: standalone)").matches) {
        setShowPrompt(true)
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowPrompt(false)
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer)
      if (swTimer) clearTimeout(swTimer)
      if (idleId !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        ;(window as any).cancelIdleCallback(idleId)
      }
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("studyos-notification-prompt-resolved", handleNotificationResolved)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    
    // Show the native install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to the install prompt: ${outcome}`)
    
    // We've used the prompt, and can't use it again
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  if (!showPrompt || !canShowInstall) return null

  return (
    <div className="fixed bottom-24 left-5 right-5 z-100 flex justify-center animate-in slide-in-from-bottom duration-700">
      <div className="bg-white dark:bg-[#1a1c2e] rounded-2xl p-4 border border-black/5 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-4 max-w-sm w-full">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/20">
          <Smartphone className="w-6 h-6 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground">Install StudyOS</h3>
          <p className="text-[11px] text-muted-foreground leading-tight mt-1">
            Install for the full mobile experience.
          </p>
        </div>
        
        <div className="flex flex-col gap-2 shrink-0">
          <button 
            onClick={handleInstallClick}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            Install
          </button>
          <button 
            onClick={() => setShowPrompt(false)}
            className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider text-center py-1"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
