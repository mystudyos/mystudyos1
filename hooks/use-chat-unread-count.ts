"use client"

import { useEffect, useState } from "react"
import type { User as FirebaseUser } from "firebase/auth"
import { subscribeToUnreadCount } from "@/lib/chat"
import { subscribeToUserDMs } from "@/lib/dm"
import type { UserStats } from "@/lib/user-stats"

/**
 * Subscribes to both Note Room (global) and Private DM unread counts,
 * returning their combined total so chat badges reflect either section.
 */
export function useChatUnreadCount(
  user: FirebaseUser | null,
  stats: UserStats | null
): number {
  const [globalUnread, setGlobalUnread] = useState(0)
  const [dmUnread, setDmUnread] = useState(0)

  useEffect(() => {
    if (!user || !stats) {
      setGlobalUnread(0)
      return
    }
    const unsub = subscribeToUnreadCount(
      user.uid,
      stats.lastChatReadAt || null,
      (count) => setGlobalUnread(count)
    )
    return () => unsub()
  }, [user, stats?.lastChatReadAt])

  useEffect(() => {
    if (!user) {
      setDmUnread(0)
      return
    }
    const unsub = subscribeToUserDMs(user.uid, (chats) => {
      const total = chats.reduce(
        (acc, chat) => acc + (chat.unreadCount?.[user.uid] || 0),
        0
      )
      setDmUnread(total)
    })
    return () => unsub()
  }, [user])

  return globalUnread + dmUnread
}
