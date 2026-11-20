"use client"

import { useState, useEffect, useCallback } from "react"

interface NetworkStatus {
  isOnline: boolean
  isNetworkUnstable: boolean
  isChecking: boolean
  recheckConnection: () => Promise<boolean>
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(true)
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
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      const response = await fetch(`/favicon.ico?_t=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null)

      clearTimeout(timeoutId)

      const online = (response !== null && response.ok) || navigator.onLine
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

    const syncInitial = () => {
      const online = navigator.onLine
      setIsOnline(online)
      setIsNetworkUnstable(!online)
    }
    syncInitial()

    const handleOnline = () => {
      setIsOnline(true)
      setIsNetworkUnstable(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsNetworkUnstable(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return {
    isOnline,
    isNetworkUnstable,
    isChecking,
    recheckConnection: checkPing,
  }
}
