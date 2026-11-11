"use client"

import { useState, useEffect, useLayoutEffect, useRef, useCallback, memo } from "react"
import { type User as FirebaseUser } from "firebase/auth"
import { type UserStats } from "@/lib/user-stats"
import { 
  sendMessage, 
  deleteMessage, 
  markChatRead, 
  setTypingStatus,
  subscribeToTyping,
  pinMessage,
  unpinMessage,
  editMessage,
  subscribeToRecentMessages,
  subscribeToPinnedMessages,
  type ChatMessage,
  type PinnedMessage
} from "@/lib/chat"
import { query, collection, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { reportFirestoreError } from "@/lib/quota"
import dynamic from "next/dynamic"
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false })
import { Theme } from "emoji-picker-react"
import { ADMIN_EMAIL } from "@/lib/constants"
import { 
  ArrowLeft, 
  Send, 
  Trash2,
  AlertTriangle,
  MessageCircle,
  Reply,
  Smile,
  X,
  Pin,
  ChevronDown,
  ChevronUp,
  PinOff,
  Pencil,
  Keyboard,
} from "lucide-react"
import { toast } from "react-toastify"

interface GlobalChatViewProps {
  user: FirebaseUser
  stats: UserStats | null
  onBack: () => void
  onUserClick?: (uid: string) => void
  hideHeader?: boolean
}

const FORBIDDEN_WORDS = ["fuck", "stupid", "crazy", "papa", "mama", "mad", "madd", "foolish", "dick", "papaa", "mamaa", "pussy" ]

function hasForbiddenWords(input: string): boolean {
  const normalized = input.toLowerCase()
  return FORBIDDEN_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    return regex.test(normalized)
  })
}

interface MessageItemProps {
  msg: ChatMessage
  isOwn: boolean
  showDate: boolean
  dateLabel: string | null
  online: boolean
  isSenderAdmin: boolean
  isAdmin: boolean
  onReply: (id: string, text: string, displayName: string) => void
  onEdit: (msg: ChatMessage) => void
  onDelete: (msgId: string) => void
  onPin: (msg: ChatMessage) => void
  formatTime: (timestamp: any) => string
  onUserClick?: (uid: string) => void
}

const MessageItem = memo(function MessageItem({
  msg,
  isOwn,
  showDate,
  dateLabel,
  online,
  isSenderAdmin,
  isAdmin,
  onReply,
  onEdit,
  onDelete,
  onPin,
  formatTime,
  onUserClick,
}: MessageItemProps) {
  const displayedText = typeof msg.text === "string" ? msg.text.replace(/\\n/g, "\n") : msg.text
  const replyPreviewText = msg.replyTo?.text ? msg.replyTo.text.replace(/\\n/g, "\n") : msg.replyTo?.text

  return (
    <div id={`msg-${msg.id}`}>
      {/* Date separator */}
      {showDate && (
        <div className="flex items-center justify-center my-4">
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {dateLabel}
            </span>
          </div>
        </div>
      )}

      {/* Message bubble */}
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2 group`}>
        <div className={`max-w-[80%] min-w-0 ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
          {/* Sender name (not for own messages) */}
          {!isOwn && (
            <div
              className="flex items-center gap-1.5 mb-1 ml-1 max-w-full cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onUserClick?.(msg.uid)}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                {msg.photoURL ? (
                  <img 
                    src={msg.photoURL} 
                    alt="" 
                    className="w-4 h-4 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-[7px] font-black text-primary">
                      {(msg.displayName || "?").charAt(0)}
                    </span>
                  </div>
                )}
                {online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full border border-background" />
                )}
              </div>
              <span className="text-[11.5px] font-bold text-foreground/70 truncate max-w-27.5 shrink-0">
                {msg.displayName}
              </span>
              {(isSenderAdmin || msg.school === "Admin") ? (
                <span className="text-[9.5px] font-black text-amber-400 uppercase truncate max-w-32.5">
                  • Admin
                </span>
              ) : msg.school ? (
                <span className="text-[9.5px] font-bold text-muted-foreground/40 uppercase truncate max-w-32.5">
                  • {msg.school}
                </span>
              ) : null}
            </div>
          )}

          <div className="flex items-end gap-1.5 min-w-0">
            {/* Actions for own messages (left side — Admin only in Room Chat) */}
            {isOwn && isAdmin && (
              <div className="flex items-center gap-0.5 transition-opacity">
                <button
                  onClick={() => onEdit(msg)}
                  className="p-1 rounded-lg hover:bg-white/5"
                  title="Edit message"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
                <button
                  onClick={() => onDelete(msg.id)}
                  className="p-1 rounded-lg hover:bg-destructive/20"
                  title="Delete message"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
                <button
                  onClick={() => onPin(msg)}
                  className="p-1 rounded-lg hover:bg-amber-500/20"
                  title="Pin message"
                >
                  <Pin className="w-3 h-3 text-amber-400" />
                </button>
              </div>
            )}

            <div
              className={`px-4 py-2.5 rounded-[18px] text-[14px] leading-relaxed whitespace-pre-wrap wrap-break-word [word-break:break-word] shadow-sm min-w-0 select-text ${
                isOwn
                  ? "bg-linear-to-br from-primary to-primary/90 text-primary-foreground rounded-br-lg"
                  : "bg-muted border border-border text-foreground rounded-bl-lg"
              }`}
            >
              {msg.replyTo && (
                <div className={`mb-1.5 px-2 py-1.5 rounded-lg text-[11px] border-l-2 ${isOwn ? "bg-white/20 border-white/40 text-primary-foreground/90" : "bg-white/5 border-primary/50 text-muted-foreground"}`}>
                  <div className="font-bold opacity-80 mb-0.5 truncate">{msg.replyTo.displayName}</div>
                  <div className="truncate max-w-37.5 opacity-70">{replyPreviewText}</div>
                </div>
              )}
              {displayedText}
            </div>

            {/* Actions for others' messages (right side — Admin only in Room Chat) */}
            {!isOwn && isAdmin && (
              <div className="flex items-center gap-0.5 transition-opacity">
                <button
                  onClick={() => onReply(msg.id, msg.text, msg.displayName)}
                  className="p-1 rounded-lg hover:bg-white/5"
                  title="Reply"
                >
                  <Reply className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
                <button
                  onClick={() => onPin(msg)}
                  className="p-1 rounded-lg hover:bg-amber-500/20"
                  title="Pin message"
                >
                  <Pin className="w-3 h-3 text-amber-400" />
                </button>
                <button
                  onClick={() => onDelete(msg.id)}
                  className="p-1 rounded-lg hover:bg-destructive/20"
                  title="Delete message"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <span className={`text-[10px] text-muted-foreground/40 mt-0.5 ${isOwn ? "mr-1 text-right" : "ml-1"}`}>
            {formatTime(msg.createdAt)} {msg.isEdited && <span className="opacity-60 italic text-[9px] font-medium ml-1">(edited)</span>}
          </span>
        </div>
      </div>
    </div>
  )
})

interface MessageListProps {
  messages: ChatMessage[]
  loading: boolean
  user: FirebaseUser
  onlineUsers: Set<string>
  adminUsers: Set<string>
  isAdmin: boolean
  onReply: (id: string, text: string, displayName: string) => void
  onEdit: (msg: ChatMessage) => void
  onDelete: (msgId: string) => void
  onPin: (msg: ChatMessage) => void
  formatTime: (timestamp: any) => string
  shouldShowDate: (index: number) => boolean
  getDateLabel: (timestamp: any) => string | null
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  handleScroll: () => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onUserClick?: (uid: string) => void
  hasMore: boolean
  loadingOlder: boolean
  onLoadOlder: () => void
}

const MessageList = memo(function MessageList({
  messages,
  loading,
  user,
  onlineUsers,
  adminUsers,
  isAdmin,
  onReply,
  onEdit,
  onDelete,
  onPin,
  formatTime,
  shouldShowDate,
  getDateLabel,
  scrollContainerRef,
  handleScroll,
  messagesEndRef,
  onUserClick,
  hasMore,
  loadingOlder,
  onLoadOlder,
}: MessageListProps) {
  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide px-4 py-4 space-y-1"
    >
      {loading ? (
        <div className="space-y-4 pt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
              <div className="h-16 w-56 rounded-2xl bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground mb-1">No messages yet</h3>
          <p className="text-xs text-muted-foreground">Be the first to say hi! 👋</p>
        </div>
      ) : (
        <>
          {/* Older messages button / Beginning of history badge */}
          <div className="flex flex-col items-center justify-center pt-2 pb-3">
            {hasMore ? (
              <button
                type="button"
                onClick={onLoadOlder}
                disabled={loadingOlder}
                className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-base font-semibold text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95 shadow-sm disabled:opacity-60 cursor-pointer"
                title="Load older messages"
              >
                {loadingOlder ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-primary group-hover:-translate-y-0.5 transition-transform" />
                    <span>Older messages</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                <span>Latest messages</span>
              </div>
            )}
          </div>

          {messages.map((msg, index) => {
            const isOwn = msg.uid === user.uid
            const showDate = shouldShowDate(index)

            return (
              <MessageItem
                key={msg.id}
                msg={msg}
                isOwn={isOwn}
                showDate={showDate}
                dateLabel={showDate ? getDateLabel(msg.createdAt) : null}
                online={onlineUsers.has(msg.uid)}
                isSenderAdmin={adminUsers.has(msg.uid)}
                isAdmin={isAdmin}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onPin={onPin}
                formatTime={formatTime}
                onUserClick={onUserClick}
              />
            )
          })}
        </>
      )}
      <div className="h-6 shrink-0" />
      <div ref={messagesEndRef} />
    </div>
  )
})

export function GlobalChatView({ user, stats, onBack, onUserClick, hideHeader }: GlobalChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isNearBottom = useRef(true)
  const isAdmin = user.email === ADMIN_EMAIL
  const isBanned = stats?.isBanned === true

  const [displayLimit, setDisplayLimit] = useState(50)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const prevScrollHeightRef = useRef<number | null>(null)
  const prevScrollTopRef = useRef<number>(0)
  const initialScrollDoneRef = useRef(false)

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [replyTo, setReplyTo] = useState<{ id: string; text: string; displayName: string } | null>(null)
  const [typists, setTypists] = useState<{ uid: string; displayName: string }[]>([])
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [adminUsers, setAdminUsers] = useState<Set<string>>(new Set())
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)

  // Subscribe to messages (real-time with dynamic limit for loading older messages)
  useEffect(() => {
    let mounted = true

    const unsub = subscribeToRecentMessages(displayLimit, (recentMsgs) => {
      if (!mounted) return
      setMessages(recentMsgs)
      setLoading(false)
      setLoadingOlder(false)
      if (recentMsgs.length < displayLimit) {
        setHasMore(false)
      } else {
        setHasMore(true)
      }
    })

    return () => {
      mounted = false
      unsub()
    }
  }, [displayLimit])

  // Preserve scroll position when older messages are prepended to the top
  useLayoutEffect(() => {
    if (prevScrollHeightRef.current !== null && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const heightDiff = container.scrollHeight - prevScrollHeightRef.current
      container.scrollTop = prevScrollTopRef.current + heightDiff
      prevScrollHeightRef.current = null
      setLoadingOlder(false)
    }
  }, [messages])

  // Handler to load the next chunk of older messages
  const handleLoadOlder = useCallback(() => {
    if (loadingOlder || !hasMore) return
    const container = scrollContainerRef.current
    if (container) {
      prevScrollHeightRef.current = container.scrollHeight
      prevScrollTopRef.current = container.scrollTop
    }
    setLoadingOlder(true)
    setDisplayLimit((prev) => prev + 50)
  }, [loadingOlder, hasMore])

  // Subscribe to pinned messages
  useEffect(() => {
    const unsub = subscribeToPinnedMessages((pinnedList) => {
      setPinnedMessages(pinnedList)
    })
    return () => unsub()
  }, [])

  // Auto-cleanup disabled (retained from backup schema if needed)

  // Mark chat as read on mount and unmount
  useEffect(() => {
    markChatRead(user.uid)
    return () => {
      markChatRead(user.uid)
    }
  }, [user.uid])

  // Clear unread count immediately when viewing chat and new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      markChatRead(user.uid)
    }
    if (isNearBottom.current && prevScrollHeightRef.current === null) {
      messagesEndRef.current?.scrollIntoView({ behavior: initialScrollDoneRef.current ? "smooth" : "auto" })
      initialScrollDoneRef.current = true
    }
  }, [messages, user.uid])

  // Typing indicator subscription
  useEffect(() => {
    const unsub = subscribeToTyping((activeTypists) => {
      setTypists(activeTypists.filter(t => t.uid !== user.uid))
    })
    return () => unsub()
  }, [user.uid])

  // Fetch online presence of chat participants — throttled and cached to conserve read quota
  const lastPresenceCheckRef = useRef<number>(0)
  const presenceCacheRef = useRef<Map<string, { isOnline: boolean; isAdminUser: boolean; cachedAt: number }>>(new Map())

  useEffect(() => {
    if (messages.length === 0) return

    const fetchPresence = async () => {
      const now = Date.now()
      // Throttle: avoid re-querying Firestore more frequently than once every 60s
      if (now - lastPresenceCheckRef.current < 60000) return
      lastPresenceCheckRef.current = now

      try {
        const recent = messages.slice(-50)
        const uniqueUids = Array.from(new Set(recent.map((m) => m.uid))).slice(0, 20)
        if (uniqueUids.length === 0) return

        // Filter out UIDs whose presence was checked within the last 2 minutes
        const uidsToFetch = uniqueUids.filter((uid) => {
          const cached = presenceCacheRef.current.get(uid)
          return !cached || now - cached.cachedAt > 120000
        })

        if (uidsToFetch.length > 0) {
          const chunks = []
          for (let i = 0; i < uidsToFetch.length; i += 10) {
            chunks.push(uidsToFetch.slice(i, i + 10))
          }

          for (const chunk of chunks) {
            const q = query(collection(db, "users"), where("__name__", "in", chunk))
            const snap = await getDocs(q)
            snap.forEach((d) => {
              const data = d.data()
              const ts = data?.lastSeen?.toMillis ? data.lastSeen.toMillis() : 0
              const isOnline = now - ts < 300000
              const isAdminUser = data?.email === ADMIN_EMAIL
              presenceCacheRef.current.set(d.id, { isOnline, isAdminUser, cachedAt: now })
            })
          }
        }

        const online = new Set<string>()
        const admins = new Set<string>()
        uniqueUids.forEach((uid) => {
          const entry = presenceCacheRef.current.get(uid)
          if (entry?.isOnline) online.add(uid)
          if (entry?.isAdminUser) admins.add(uid)
        })
        setOnlineUsers(online)
        setAdminUsers(admins)
      } catch (err) {
        reportFirestoreError(err)
      }
    }

    fetchPresence()
    const interval = setInterval(fetchPresence, 90000)
    return () => clearInterval(interval)
  }, [messages.length])

  // Track scroll position
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const threshold = 120
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    isNearBottom.current = distFromBottom < threshold
    setShowScrollDown(distFromBottom > 300)
  }, [])

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
  }, [])

  // Auto scroll to bottom when visual viewport height changes (keyboard pops up)
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return
    const handleResize = () => {
      setTimeout(scrollToBottom, 100)
    }
    window.visualViewport.addEventListener("resize", handleResize)
    return () => window.visualViewport?.removeEventListener("resize", handleResize)
  }, [scrollToBottom])

  // Scroll to pinned message
  const scrollToPinnedMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      // Flash highlight
      el.classList.add("pinned-highlight")
      setTimeout(() => el.classList.remove("pinned-highlight"), 2000)
    } else {
      toast("Pinned message is no longer in chat history")
    }
  }, [])

  // Send handler (Admin only for announcements and update releases)
  const handleSend = async () => {
    const trimmed = text.trim()
    if (!isAdmin || !trimmed || sending || cooldown || isBanned || hasForbiddenWords(trimmed)) return
    if (trimmed.length > 500) {
      toast.error("Message too long (max 500 characters)")
      return
    }

    setSending(true)
    try {
      if (editingMessage) {
        await editMessage(editingMessage.id, trimmed)
        setEditingMessage(null)
        toast.success("Message edited")
      } else {
        await sendMessage(
          user.uid,
          user.displayName || "Anonymous",
          user.photoURL || null,
          isAdmin ? "Admin" : (stats?.school || null),
          trimmed,
          replyTo
        )
      }
      setText("")
      setReplyTo(null)
      setShowEmojiPicker(false)
      setIsTyping(false)
      setTypingStatus(user.uid, user.displayName || "Anonymous", false)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

      if (!editingMessage) {
        markChatRead(user.uid)
        isNearBottom.current = true
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }

      // Cooldown (only for new messages, not editing)
      if (!editingMessage) {
        setCooldown(true)
        setTimeout(() => setCooldown(false), 3000)
      }
    } catch (err) {
      console.error(err)
      toast.error(editingMessage ? "Failed to edit message" : "Failed to send message")
    } finally {
      setSending(false)
    }
  }

  // Delete handler (admin or owner)
  const handleDelete = useCallback(async (msgId: string) => {
    if (!confirm("Delete this message?")) return
    try {
      await deleteMessage(msgId)
      toast.success("Message deleted")
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete message")
    }
  }, [])

  // Pin handler (admin)
  const handlePin = useCallback(async (msg: ChatMessage) => {
    try {
      await pinMessage(msg.id, msg.text, msg.displayName, user.uid)
      toast.success("Message pinned 📌")
    } catch (err: any) {
      console.error(err)
      if (err.message === "MAX_PINS_REACHED") {
        toast.error("Maximum of 3 pinned messages allowed. Unpin one first.")
      } else {
        toast.error("Failed to pin message")
      }
    }
  }, [user.uid])

  const handleReply = useCallback((id: string, text: string, displayName: string) => {
    setReplyTo({ id, text, displayName })
    setEditingMessage(null)
  }, [])

  const handleEdit = useCallback((msg: ChatMessage) => {
    setEditingMessage(msg)
    setText(msg.text)
    setReplyTo(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // Unpin handler (admin)
  const handleUnpin = async (messageId: string) => {
    try {
      await unpinMessage(messageId)
      toast.success("Message unpinned")
    } catch (err) {
      console.error(err)
      toast.error("Failed to unpin message")
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value.slice(0, 500))
    if (!isTyping) {
      setIsTyping(true)
      setTypingStatus(user.uid, user.displayName || "Student", true)
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      setTypingStatus(user.uid, user.displayName || "Student", false)
    }, 2000)
  }

  // Format timestamp
  const formatTime = useCallback((timestamp: any) => {
    if (!timestamp?.toDate) return ""
    const date = timestamp.toDate()
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }, [])

  // Date separator logic
  const getDateLabel = useCallback((timestamp: any): string | null => {
    if (!timestamp?.toDate) return null
    const date = timestamp.toDate()
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return "Today"
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
    return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
  }, [])

  const shouldShowDate = useCallback((index: number): boolean => {
    if (index === 0) return true
    const prev = messages[index - 1]?.createdAt
    const curr = messages[index]?.createdAt
    if (!prev?.toDate || !curr?.toDate) return false
    return prev.toDate().toDateString() !== curr.toDate().toDateString()
  }, [messages])

  return (
    <div className="flex flex-col h-full bg-background select-text apple-font relative overflow-hidden min-h-0" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
      {/* Header */}
      {!hideHeader && (
        <div className="sticky top-0 z-30 bg-background border-b border-white/5 px-5 pt-10 lg:pt-5 pb-4">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <button 
              onClick={() => { markChatRead(user.uid); onBack() }}
              className="p-2.5 rounded-2xl glass hover:bg-white/10 transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight">StudyOS Chat</h1>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black opacity-60 italic">
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </p>
            </div>
            {isAdmin && (
              <div className="px-2 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Admin</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && (
        <div className="sticky top-0 z-20 divide-y divide-amber-500/10 border-b border-amber-500/20 backdrop-blur-md">
          {pinnedMessages.map((pin) => (
            <div 
              key={pin.messageId}
              className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/15 transition-colors cursor-pointer flex items-center gap-2"
              onClick={() => scrollToPinnedMessage(pin.messageId)}
            >
              <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 rotate-45" />
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
                  Pinned ({pin.displayName})
                </span>
                <p className="text-[12.5px] text-foreground truncate">{pin.text}</p>
              </div>
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleUnpin(pin.messageId) }}
                  className="p-1.5 rounded-lg hover:bg-amber-500/20 transition-colors shrink-0"
                  title="Unpin message"
                >
                  <PinOff className="w-3.5 h-3.5 text-amber-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <MessageList
        messages={messages}
        loading={loading}
        user={user}
        onlineUsers={onlineUsers}
        adminUsers={adminUsers}
        isAdmin={isAdmin}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPin={handlePin}
        formatTime={formatTime}
        shouldShowDate={shouldShowDate}
        getDateLabel={getDateLabel}
        scrollContainerRef={scrollContainerRef}
        handleScroll={handleScroll}
        messagesEndRef={messagesEndRef}
        onUserClick={onUserClick}
        hasMore={hasMore}
        loadingOlder={loadingOlder}
        onLoadOlder={handleLoadOlder}
      />

      {/* Scroll to bottom FAB */}
      {showScrollDown && (
        <div className="absolute bottom-44 right-6 z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            onClick={scrollToBottom}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            title="Scroll to bottom"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Typing Indicator */}
      {!isBanned && typists.length > 0 && (
        <div className="px-5 py-1.5 text-[11px] text-muted-foreground flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 bg-background">
          <div className="flex gap-0.5 items-center">
            <div className="w-1 h-1 rounded-full bg-primary/60 animate-bounce" />
            <div className="w-1 h-1 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1 h-1 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
          </div>
          {typists.length === 1 
            ? <span className="font-medium">{typists[0].displayName} is typing...</span>
            : <span className="font-medium">{typists.map(t => t.displayName).join(", ")} are typing...</span>
          }
        </div>
      )}

      {/* Edit Context Bar */}
      {!isBanned && editingMessage && (
        <div className="px-4 py-2 bg-muted/80 border-t border-border flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <Pencil className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[11.5px] font-bold text-foreground">Editing message</span>
              <p className="text-[11px] text-muted-foreground truncate">{editingMessage.text}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setEditingMessage(null)
              setText("")
            }} 
            className="p-1.5 rounded-full hover:bg-white/5"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Reply Context Bar */}
      {!isBanned && replyTo && (
        <div className="px-4 py-2 bg-muted/80 border-t border-border flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[11.5px] font-bold text-foreground">Replying to {replyTo.displayName}</span>
              <p className="text-[11px] text-muted-foreground truncate">{replyTo.text}</p>
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1.5 rounded-full hover:bg-white/5">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Input bar (Admin-only for Room Chat announcements & update releases) */}
      {!isAdmin ? (
        <div className="px-4 py-3.5 border-t border-border bg-background shrink-0">
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-muted/60 border border-border text-center">
            <span className="text-xs text-muted-foreground font-semibold">
              Only admins can post in Room Chat.
            </span>
          </div>
        </div>
      ) : isBanned ? (
        <div className="px-4 py-4 border-t border-white/5 bg-background">
          <div className="max-w-3xl mx-auto flex items-center gap-2 px-4 py-3 rounded-2xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-xs text-destructive font-medium">Account suspended. Messaging disabled.</span>
          </div>
        </div>
      ) : (
        <div className="border-t border-border bg-background flex flex-col shrink-0">
          <div className="max-w-3xl mx-auto w-full px-3 md:px-4 py-3">
            <div className="flex items-end gap-2 w-full">
              {/* Emoji Toggle Button */}
              <button 
                type="button"
                onClick={() => {
                  if (showEmojiPicker) {
                    setShowEmojiPicker(false)
                    setTimeout(() => inputRef.current?.focus(), 50)
                  } else {
                    setShowEmojiPicker(true)
                    inputRef.current?.blur()
                    setTimeout(scrollToBottom, 100)
                  }
                }}
                className="w-11 h-11 shrink-0 rounded-full bg-muted/80 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95"
                title={showEmojiPicker ? "Keyboard" : "Emojis"}
              >
                {showEmojiPicker ? (
                  <Keyboard className="w-5.5 h-5.5" />
                ) : (
                  <Smile className="w-5.5 h-5.5" />
                )}
              </button>

              {/* Text Input */}
              <div className="flex-1 relative flex items-center bg-muted/80 border border-border rounded-2xl focus-within:ring-2 focus-within:ring-primary/30 transition-all min-w-0">
                <textarea
                  ref={inputRef}
                  value={text}
                  onFocus={() => {
                    setShowEmojiPicker(false)
                    setTimeout(scrollToBottom, 150)
                    setTimeout(scrollToBottom, 400)
                  }}
                  onChange={(e) => {
                    handleTextChange(e)
                    const target = e.target
                    requestAnimationFrame(() => {
                      target.style.height = '42px'
                      target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                    })
                  }}
                  placeholder="Type a message..."
                  className="w-full px-4 py-2.5 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/40 resize-none scrollbar-hide text-foreground h-10.5"
                  disabled={sending}
                  rows={1}
                  style={{ height: text ? undefined : '42px' }}
                />
                
                {text.length > 400 && (
                  <span className={`absolute right-3 bottom-2.5 text-[9px] font-bold ${text.length >= 500 ? "text-destructive" : "text-muted-foreground/40"}`}>
                    {text.length}/500
                  </span>
                )}
              </div>

              {/* Send Button */}
              <button
                onTouchEnd={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSend()
                }}
                onClick={handleSend}
                disabled={!text.trim() || sending || cooldown || hasForbiddenWords(text)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  text.trim() && !sending && !cooldown && !hasForbiddenWords(text)
                    ? "bg-primary text-primary-foreground active:scale-95 cursor-pointer shadow-lg shadow-primary/20"
                    : "bg-muted/80 border border-border text-muted-foreground/40 cursor-not-allowed"
                }`}
                title="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          {cooldown && (
            <p className="text-[9px] text-muted-foreground/40 mb-2 ml-6 font-medium max-w-3xl mx-auto w-full">
              Wait a moment...
            </p>
          )}
          {hasForbiddenWords(text) && (
            <p className="text-[10px] text-destructive mb-2 ml-6 font-bold flex items-center gap-1 animate-pulse max-w-3xl mx-auto w-full">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Please remove inappropriate language!
            </p>
          )}

          {showEmojiPicker && (
            <div className="w-full bg-background border-t border-border h-70 overflow-hidden animate-in slide-in-from-bottom duration-200">
              <EmojiPicker 
                theme={Theme.DARK}
                width="100%"
                height="100%"
                skinTonesDisabled
                searchDisabled
                previewConfig={{ showPreview: false }}
                onEmojiClick={(e) => {
                  setText(prev => prev + e.emoji)
                }} 
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
