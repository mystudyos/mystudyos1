"use client"

import { useState, useEffect, useCallback } from "react"
import { db } from "@/lib/firebase"
import { doc, getDocFromServer } from "firebase/firestore"

interface NetworkStatus {
  isOnline: boolean
  isNetworkUnstable: boolean
  isChecking: boolean
  recheckConnection: () => Promise<boolean>
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== "undefined" ? navigator.onLine : true
  )
  const [isNetworkUnstable, setIsNetworkUnstable] = useState<boolean>(false)
  const [isChecking, setIsChecking] = useState<boolean>(false)

  const checkPing = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return true
    if (!navigator.onLine) {
      setIsOnline(false)
      setIsNetworkUnstable(true)
      return false
    }

    setIsChecking(true)
    try {
      // Use cache-busting fetch to verify active internet connectivity
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      const response = await fetch(`/favicon.ico?_t=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null)

      clearTimeout(timeoutId)

      const online = response !== null && response.ok || navigator.onLine
      setIsOnline(online)
      setIsNetworkUnstable(!online)
      return online
    } catch {
      setIsOnline(false)
      setIsNetworkUnstable(true)
      return false
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => {
      setIsOnline(true)
      checkPing()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsNetworkUnstable(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Initial ping check
    checkPing()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [checkPing])

  return {
    isOnline,
    isNetworkUnstable,
    isChecking,
    recheckConnection: checkPing,
  }
}
