"use client"

import { useState, useEffect, useCallback } from "react"
import { type User as FirebaseUser } from "firebase/auth"
import {
  fetchUserStats,
  subscribeToUserStats,
  type UserStats,
} from "@/lib/user-stats"

import { readCache } from "@/lib/cache"
import { reportFirestoreError } from "@/lib/quota"

interface UseUserStatsReturn {
  stats: UserStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook that subscribes to user stats from Firestore in real-time.
 * Hardened to fallback to persistent local backup cache when offline,
 * ensuring stats are never wiped or shown as null due to network issues.
 */
export function useUserStats(user: FirebaseUser | null): UseUserStatsReturn {
  const [stats, setStats] = useState<UserStats | null>(() => {
    if (!user) return null
    return readCache<UserStats>(`userStats_backup_${user.uid}`, "local") || null
  })
  const [loading, setLoading] = useState<boolean>(() => {
    if (!user) return false
    return !readCache<UserStats>(`userStats_backup_${user.uid}`, "local")
  })
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats(null)
      setLoading(false)
      return
    }

    const localBackup = readCache<UserStats>(`userStats_backup_${user.uid}`, "local")

    // When network is offline or weak, keep showing cached data as-is without triggering a re-fetch that could blank the UI
    if (typeof window !== "undefined" && !navigator.onLine) {
      if (localBackup) {
        setStats((prev) => prev || localBackup)
      }
      setLoading(false)
      return
    }

    // Only show loading skeleton if we don't already have stats to display
    setStats((prev) => {
      if (!prev && !localBackup) setLoading(true)
      return prev || localBackup || null
    })
    setError(null)

    try {
      const data = await fetchUserStats(user.uid)
      if (data) {
        setStats(data)
      } else if (localBackup) {
        setStats((prev) => prev || localBackup)
      }
    } catch (err: any) {
      console.error("Failed to fetch user stats:", err)
      reportFirestoreError(err)
      setError(err?.message || "Failed to fetch stats")
      if (localBackup) setStats((prev) => prev || localBackup)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setStats(null)
      setLoading(false)
      return
    }

    const localBackup = readCache<UserStats>(`userStats_backup_${user.uid}`, "local")
    if (localBackup) {
      setStats((prev) => prev || localBackup)
      setLoading(false)
    } else {
      setLoading(true)
    }

    let isMounted = true

    // Safety timeout: if Firestore is hanging (weak network / quota exceeded / backoff), unblock after 4s
    const timer = setTimeout(() => {
      if (!isMounted) return
      const latestBackup = readCache<UserStats>(`userStats_backup_${user.uid}`, "local")
      if (latestBackup) {
        setStats((prev) => prev || latestBackup)
      }
      setLoading(false)
    }, 4000)

    const unsub = subscribeToUserStats(user.uid, (data) => {
      if (!isMounted) return
      clearTimeout(timer)

      if (data !== null) {
        setStats(data)
      } else {
        const latestBackup = readCache<UserStats>(`userStats_backup_${user.uid}`, "local")
        if (latestBackup) {
          setStats((prev) => prev || latestBackup)
        }
      }
      setLoading(false)
    })

    return () => {
      isMounted = false
      clearTimeout(timer)
      unsub()
    }
  }, [user])

  return { stats, loading, error, refetch: fetchStats }
}
