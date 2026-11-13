"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { type User as FirebaseUser } from "firebase/auth"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import dynamic from "next/dynamic"
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false })
import { Theme } from "emoji-picker-react"
import {
  sendDM,
  subscribeToDMMessages,
  editDMMessage,
  deleteDMMessage,
  updateChatStatus,
  blockUserInChat,
  unblockUserInChat,
  markDMRead,
  setDMTypingStatus,
  subscribeToDMTyping,
  type DirectChat,
  type DMMessage,
} from "@/lib/dm"
import {
  ArrowLeft,
  Send,
  Trash2,
  AlertTriangle,
  MessageCircle,
  Reply,
  Smile,
  X,
  Pencil,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  CheckCircle,
  XCircle,
  Ban,
  User,
  ChevronDown,
  Info,
  Keyboard,
} from "lucide-react"
import { toast } from "react-toastify"

// Helper to format the user's last seen time
function formatLastSeen(lastSeen: any): string {
  if (!lastSeen) return "offline"
  const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen)
  if (isNaN(date.getTime())) return "offline"
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  
  if (date.getTime() >= today.getTime()) {
    return `last seen today at ${timeStr}`
  } else if (date.getTime() >= yesterday.getTime()) {
    return `last seen yesterday at ${timeStr}`
  } else {
    const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" })
    return `last seen on ${dateStr} at ${timeStr}`
  }
}

// ─── Forbidden Words ───
const FORBIDDEN_WORDS = ["fuck", "stupid", "crazy", "papa", "mama", "mad", "foolish"]
function hasForbiddenWords(input: string): boolean {
  const normalized = input.toLowerCase()
  return FORBIDDEN_WORDS.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "i")
    return regex.test(normalized)
  })
}

interface DMChatViewProps {
  user: FirebaseUser
  chat: DirectChat
  onBack: () => void
  onViewProfile: (uid: string) => void
  onRefreshChats?: () => void
}

export function DMChatView({ user, chat, onBack, onViewProfile, onRefreshChats }: DMChatViewProps) {
  const [messages, setMessages] = useState<DMMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isNearBottom = useRef(true)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [replyTo, setReplyTo] = useState<{ id: string; text: string; displayName: string } | null>(null)
  const [editingMessage, setEditingMessage] = useState<DMMessage | null>(null)
  const [showPolicyWarning, setShowPolicyWarning] = useState(false)
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [blockReason, setBlockReason] = useState("")
  const [blocking, setBlocking] = useState(false)
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const otherUid = chat.users.find((u) => u !== user.uid) || ""
  const [otherUserStatus, setOtherUserStatus] = useState<{
    isOnline: boolean
    lastSeen: any
  } | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Real-time other user presence subscription
  useEffect(() => {
    if (!otherUid) return
    const ref = doc(db, "users", otherUid)
    const unsub = onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        const lastSeen = data.lastSeen
        let isOnline = false
        if (lastSeen) {
          const ts = lastSeen.toMillis ? lastSeen.toMillis() : (lastSeen.seconds ? lastSeen.seconds * 1000 : new Date(lastSeen).getTime())
          isOnline = Date.now() - ts < 300000 // 5 minutes
        }
        setOtherUserStatus({ isOnline, lastSeen })
      }
    })
    return () => unsub()
  }, [otherUid])

  // Real-time other user typing subscription
  useEffect(() => {
    if (!chat.id || !otherUid) return
    const unsub = subscribeToDMTyping(chat.id, otherUid, (typing) => {
      setIsOtherTyping(typing)
    })
    return () => {
      unsub()
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      setDMTypingStatus(chat.id, user.uid, false)
    }
  }, [chat.id, otherUid, user.uid])
  const otherName = chat.userNames?.[otherUid] || "Student"
  const otherPhoto = chat.userPhotos?.[otherUid] || null
  const isBlocked = chat.blockedBy !== null
  const iBlockedThem = chat.blockedBy === user.uid
  const theyBlockedMe = chat.blockedBy === otherUid
  const isPending = chat.status === "pending"
  const isAccepted = chat.status === "accepted"
  const isRejected = chat.status === "rejected"
  const iAmReceiver = chat.lastMessageSender !== user.uid && isPending

  // Check if policy was already accepted (localStorage)
  useEffect(() => {
    const key = `dm_policy_accepted_${user.uid}`
    if (localStorage.getItem(key) === "true") {
      setPolicyAccepted(true)
    }
  }, [user.uid])

  // Subscribe to messages
  useEffect(() => {
    let mounted = true
    setLoading(true)

    const unsub = subscribeToDMMessages(chat.id, (msgs) => {
      if (!mounted) return
      setMessages(msgs)
      setLoading(false)
    })

    return () => {
      mounted = false
      unsub()
    }
  }, [chat.id])

  // Mark as read on mount
  useEffect(() => {
    markDMRead(chat.id, user.uid)
  }, [chat.id, user.uid])

  // Auto-scroll
  useEffect(() => {
    if (isNearBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Scroll to bottom when other user starts typing
  useEffect(() => {
    if (isOtherTyping && isNearBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [isOtherTyping])

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    isNearBottom.current = distFromBottom < 120
    setShowScrollDown(distFromBottom > 300)
  }, [])

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

  // ─── Send handler ───
  const handleSend = async (bypassPolicy = false) => {
    const trimmed = text.trim()
    if (!trimmed || sending || cooldown || hasForbiddenWords(trimmed)) return
    if (trimmed.length > 500) {
      toast.error("Message too long (max 500 characters)")
      return
    }

    setIsTyping(false)
    setDMTypingStatus(chat.id, user.uid, false)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    // If this is the first message and policy not accepted, show warning
    if (!bypassPolicy && !policyAccepted && messages.filter((m) => m.uid === user.uid).length === 0) {
      setShowPolicyWarning(true)
      return
    }

    setSending(true)
    try {
      if (editingMessage) {
        await editDMMessage(chat.id, editingMessage.id, trimmed)
        setEditingMessage(null)
        toast.success("Message edited")
      } else {
        await sendDM(chat.id, user.uid, user.displayName || "Anonymous", user.photoURL || null, trimmed, replyTo)
      }
      setText("")
      setReplyTo(null)

      if (!editingMessage) {
        isNearBottom.current = true
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        setCooldown(true)
        setTimeout(() => setCooldown(false), 2000)
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const handleAcceptPolicy = () => {
    setPolicyAccepted(true)
    localStorage.setItem(`dm_policy_accepted_${user.uid}`, "true")
    setShowPolicyWarning(false)
    // Now actually send the message bypassing warning modal
    handleSend(true)
  }

  const handleAcceptChat = async () => {
    try {
      await updateChatStatus(chat.id, "accepted")
      toast.success("Chat accepted!")
      onRefreshChats?.()
    } catch (err) {
      toast.error("Failed to accept")
    }
  }

  const handleRejectChat = async () => {
    try {
      await updateChatStatus(chat.id, "rejected")
      toast.success("Chat declined")
      onRefreshChats?.()
      onBack()
    } catch (err) {
      toast.error("Failed to reject")
    }
  }

  const handleBlockUser = async () => {
    if (blocking) return
    setBlocking(true)
    try {
      await blockUserInChat(
        chat.id,
        user.uid,
        user.displayName || "Student",
        user.email || "",
        otherUid,
        otherName,
        chat.userEmails?.[otherUid] || "",
        blockReason
      )
      toast.success("User blocked & reported to admin")
      setShowBlockModal(false)
      setBlockReason("")
      onRefreshChats?.()
      onBack()
    } catch (err) {
      console.error(err)
      toast.error("Failed to block user")
    } finally {
      setBlocking(false)
    }
  }

  const handleDelete = useCallback(
    async (msgId: string) => {
      if (!confirm("Delete this message?")) return
      try {
        await deleteDMMessage(chat.id, msgId)
        toast.success("Message deleted")
      } catch (err) {
        toast.error("Failed to delete")
      }
    },
    [chat.id]
  )

  const handleReply = useCallback((id: string, text: string, displayName: string) => {
    setReplyTo({ id, text, displayName })
    setEditingMessage(null)
  }, [])

  const handleEdit = useCallback((msg: DMMessage) => {
    setEditingMessage(msg)
    setText(msg.text)
    setReplyTo(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const formatTime = useCallback((timestamp: any) => {
    if (!timestamp?.toDate) return ""
    return timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }, [])

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

  const shouldShowDate = useCallback(
    (index: number): boolean => {
      if (index === 0) return true
      const prev = messages[index - 1]?.createdAt
      const curr = messages[index]?.createdAt
      if (!prev?.toDate || !curr?.toDate) return false
      return prev.toDate().toDateString() !== curr.toDate().toDateString()
    },
    [messages]
  )

  return (
    <div className="flex flex-col h-full bg-background select-text apple-font relative overflow-hidden min-h-0" style={{ userSelect: "text", WebkitUserSelect: "text" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background border-b border-white/5 px-5 pt-10 lg:pt-5 pb-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl glass hover:bg-white/10 transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onViewProfile(otherUid)}
          >
            <div className="relative w-9 h-9 shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border border-white/10">
                {otherPhoto ? (
                  <img src={otherPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4.5 h-4.5 text-primary" />
                )}
              </div>
              {otherUserStatus?.isOnline && !isBlocked && !isPending && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-black tracking-tight truncate">{otherName}</h1>
              <p className={`text-[9.5px] font-medium leading-none mt-0.5 ${
                isOtherTyping && !isBlocked
                  ? "text-primary animate-pulse font-bold"
                  : otherUserStatus?.isOnline && !isBlocked && !isPending
                    ? "text-emerald-400/90"
                    : "text-muted-foreground/60"
              }`}>
                {isBlocked 
                  ? "blocked" 
                  : isPending 
                    ? "pending" 
                    : isOtherTyping
                      ? "typing..."
                      : otherUserStatus?.isOnline 
                        ? "online" 
                        : formatLastSeen(otherUserStatus?.lastSeen)}
              </p>
            </div>
          </div>

          {/* Block action */}
          {!isBlocked && (
            <button
              onClick={() => setShowBlockModal(true)}
              className="p-2 rounded-xl bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-all active:scale-95"
              title="Block & Report"
            >
              <ShieldAlert className="w-4 h-4 text-destructive" />
            </button>
          )}
        </div>
      </div>

      {/* Receiver Accept/Reject Banner */}
      {isPending && iAmReceiver && !isBlocked && (
        <div className="mx-4 my-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 backdrop-blur-md shadow-lg shadow-black/10">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Info className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground mb-1 leading-tight">
                <span className="text-amber-400">{otherName}</span> wants to chat with you
              </p>
              <p className="text-[11px] text-muted-foreground mb-3.5 leading-normal">
                You can accept, decline, or block this student if needed.
              </p>
              <div className="flex flex-wrap items-center gap-2 w-full">
                <button
                  onClick={handleAcceptChat}
                  className="flex-1 min-w-22.5 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-500 text-background text-[11px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-all active:scale-95 shadow-md shadow-emerald-500/10"
                >
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Accept
                </button>
                <button
                  onClick={handleRejectChat}
                  className="flex-1 min-w-22.5 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-muted-foreground text-[11px] font-black uppercase tracking-wider hover:bg-white/10 transition-all active:scale-95"
                >
                  <XCircle className="w-3.5 h-3.5 shrink-0" /> Decline
                </button>
                <button
                  onClick={() => setShowBlockModal(true)}
                  className="flex-1 min-w-22.5 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-destructive/15 border border-destructive/20 text-destructive text-[11px] font-black uppercase tracking-wider hover:bg-destructive/25 transition-all active:scale-95"
                >
                  <Ban className="w-3.5 h-3.5 shrink-0" /> Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Banner */}
      {isBlocked && (
        <div className="px-4 py-4 bg-destructive/5 border-b border-destructive/20">
          <div className="flex items-center gap-3">
            <ShieldOff className="w-5 h-5 text-destructive shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-destructive">
                {iBlockedThem
                  ? "You blocked this user"
                  : "This user has blocked you"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {iBlockedThem
                  ? "This chat is restricted. An admin has been notified."
                  : "You cannot send messages to this user."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide px-4 py-4 space-y-1"
      >
        {loading ? (
          <div className="space-y-4 pt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <div className="h-14 w-48 rounded-2xl bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">No messages yet</h3>
            <p className="text-xs text-muted-foreground">Send the first message to start the conversation.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.uid === user.uid
            const showDate = shouldShowDate(index)
            const displayedText = typeof msg.text === "string" ? msg.text.replace(/\\n/g, "\n") : msg.text
            const replyPreviewText = msg.replyTo?.text ? msg.replyTo.text.replace(/\\n/g, "\n") : msg.replyTo?.text

            return (
              <div key={msg.id} id={`dm-msg-${msg.id}`}>
                {showDate && (
                  <div className="flex items-center justify-center my-4">
                    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {getDateLabel(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                )}

                <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2 group`}>
                  <div className={`max-w-[80%] min-w-0 ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                    {/* Sender name for other user */}
                    {!isOwn && (
                      <div className="flex items-center gap-1.5 mb-1 ml-1 max-w-full">
                        <div className="relative shrink-0">
                          {msg.photoURL ? (
                            <img src={msg.photoURL} alt="" className="w-4 h-4 rounded-full object-cover" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-[7px] font-black text-primary">{(msg.displayName || "?").charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[11.5px] font-bold text-foreground/70 truncate max-w-27.5">{msg.displayName}</span>
                      </div>
                    )}

                    <div className="flex items-end gap-1.5 min-w-0">
                      {/* Own message actions */}
                      {isOwn && (
                        <div className="flex items-center gap-0.5 transition-opacity">
                          <button onClick={() => handleEdit(msg)} className="p-1 rounded-lg hover:bg-white/5" title="Edit">
                            <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
                          </button>
                          <button onClick={() => handleDelete(msg.id)} className="p-1 rounded-lg hover:bg-destructive/20" title="Delete">
                            <Trash2 className="w-3 h-3 text-destructive" />
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
                          <div
                            className={`mb-1.5 px-2 py-1.5 rounded-lg text-[11px] border-l-2 ${
                              isOwn
                                ? "bg-white/20 border-white/40 text-primary-foreground/90"
                                : "bg-white/5 border-primary/50 text-muted-foreground"
                            }`}
                          >
                            <div className="font-bold opacity-80 mb-0.5 truncate">{msg.replyTo.displayName}</div>
                            <div className="truncate max-w-37.5 opacity-70">{replyPreviewText}</div>
                          </div>
                        )}
                        {displayedText}
                      </div>

                      {/* Others message actions */}
                      {!isOwn && (
                        <div className="flex items-center gap-0.5 transition-opacity">
                          <button onClick={() => handleReply(msg.id, msg.text, msg.displayName)} className="p-1 rounded-lg hover:bg-white/5" title="Reply">
                            <Reply className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
                          </button>
                        </div>
                      )}
                    </div>

                    <span className={`text-[10px] text-muted-foreground/40 mt-0.5 ${isOwn ? "mr-1 text-right" : "ml-1"}`}>
                      {formatTime(msg.createdAt)}{" "}
                      {msg.isEdited && <span className="opacity-60 italic text-[9px] font-medium ml-1">(edited)</span>}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div className="h-6 shrink-0" />
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom FAB */}
      {showScrollDown && (
        <div className="absolute bottom-44 right-6 z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            onClick={scrollToBottom}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Edit Context Bar */}
      {editingMessage && (
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
      {replyTo && (
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

      {/* Typing Indicator */}
      {isOtherTyping && !isBlocked && !isRejected && (
        <div className="px-5 py-2 text-[11px] text-muted-foreground flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 bg-background/95 backdrop-blur-xs border-t border-border/50">
          <div className="flex gap-1 items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
          </div>
          <span className="font-semibold text-foreground/80">{otherName} is typing...</span>
        </div>
      )}

      {/* Input bar */}
      {isBlocked ? (
        <div className="px-4 py-4 border-t border-white/5 bg-background">
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-xs text-destructive font-medium">
              {iBlockedThem
                ? "You blocked this user. Unblock from Admin or contact support."
                : "This user has blocked you."}
            </span>
          </div>
        </div>
      ) : isRejected ? (
        <div className="px-4 py-4 border-t border-white/5 bg-background">
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs text-amber-500 font-bold truncate">
                This chat request was declined.
              </span>
            </div>
            <button
              onClick={handleAcceptChat}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider hover:scale-[1.02] transition-transform active:scale-95 shadow-md shadow-emerald-500/20 shrink-0"
            >
              Start Chat
            </button>
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
                    const val = e.target.value.slice(0, 500)
                    setText(val)
                    const target = e.target
                    requestAnimationFrame(() => {
                      target.style.height = "42px"
                      target.style.height = Math.min(target.scrollHeight, 120) + "px"
                    })
                    if (val.trim()) {
                      if (!isTyping) {
                        setIsTyping(true)
                        setDMTypingStatus(chat.id, user.uid, true)
                      }
                      if (typingTimeoutRef.current)
                        clearTimeout(typingTimeoutRef.current)
                      typingTimeoutRef.current = setTimeout(() => {
                        setIsTyping(false)
                        setDMTypingStatus(chat.id, user.uid, false)
                      }, 2000)
                    } else {
                      if (typingTimeoutRef.current)
                        clearTimeout(typingTimeoutRef.current)
                      setIsTyping(false)
                      setDMTypingStatus(chat.id, user.uid, false)
                    }
                  }}
                  placeholder="Type a message..."
                  className="w-full px-4 py-2.5 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/40 resize-none scrollbar-hide h-10.5"
                  disabled={sending}
                  rows={1}
                  style={{ height: text ? undefined : "42px" }}
                />
                {text.length > 400 && (
                  <span
                    className={`absolute right-3 bottom-2.5 text-[9px] font-bold ${
                      text.length >= 500 ? "text-destructive" : "text-muted-foreground/40"
                    }`}
                  >
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
                onClick={() => handleSend()}
                disabled={!text.trim() || sending || cooldown || hasForbiddenWords(text)}
                className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-all ${
                  text.trim() && !sending && !cooldown && !hasForbiddenWords(text)
                    ? "bg-primary text-primary-foreground active:scale-95 shadow-lg shadow-primary/20"
                    : "bg-muted/80 border border-border text-muted-foreground/40 cursor-not-allowed"
                }`}
                title="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          {cooldown && (
            <p className="text-[9px] text-muted-foreground/40 mb-2 ml-6 font-medium max-w-3xl mx-auto w-full">Cooldown — wait a moment...</p>
          )}
          {hasForbiddenWords(text) && (
            <p className="text-[10px] text-destructive mb-2 ml-6 font-bold flex items-center gap-1 animate-pulse max-w-3xl mx-auto w-full">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Please remove inappropriate language
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

      {/* ─── Chat Policy Warning Modal ─── */}
      {showPolicyWarning && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-background/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-4xl border border-white/10 bg-background/95 p-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-lg font-black text-foreground mb-1">Chat Guidelines</h3>
              <p className="text-xs text-muted-foreground">Please review before messaging</p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { icon: "🚫", title: "No Spamming", desc: "Do not send repeated or unwanted messages." },
                { icon: "🤝", title: "Be Respectful", desc: "Treat every student with kindness and dignity." },
                { icon: "🔒", title: "Keep It Appropriate", desc: "No inappropriate content, links, or harassment." },
                { icon: "📢", title: "Report Abuse", desc: "If someone is violating rules, block & report them." },
                { icon: "⚠️", title: "Admin Monitoring", desc: "Reports are reviewed by the admin who can take action." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 glass rounded-xl p-3 border border-white/5">
                  <span className="text-lg leading-none mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPolicyWarning(false)}
                className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-muted-foreground hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptPolicy}
                className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-black uppercase tracking-wider hover:scale-[1.02] transition-transform active:scale-95 shadow-lg shadow-primary/20"
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Block & Report Modal ─── */}
      {showBlockModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-background/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-4xl border border-destructive/20 bg-background/95 p-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-4">
                <ShieldAlert className="w-7 h-7 text-destructive" />
              </div>
              <h3 className="text-lg font-black text-destructive mb-1">Block & Report</h3>
              <p className="text-xs text-muted-foreground">
                Block <span className="font-bold text-foreground">{otherName}</span> and report to admin
              </p>
            </div>

            <div className="mb-5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                Reason (optional)
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value.slice(0, 300))}
                placeholder="e.g. spamming, inappropriate messages, threats..."
                className="w-full px-4 py-3 rounded-xl bg-muted border border-dashed border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30 resize-y min-h-20"
                rows={3}
              />
              <p className="text-[9px] text-muted-foreground/40 mt-1 text-right">{blockReason.length}/300</p>
            </div>

            <div className="glass rounded-xl p-3 border border-amber-500/10 mb-5">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground">
                  The admin will receive an email notification about this report and can take further action (e.g., banning the user).
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 w-full">
              <button
                onClick={() => {
                  setShowBlockModal(false)
                  setBlockReason("")
                }}
                className="w-full sm:flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockUser}
                disabled={blocking}
                className="w-full sm:flex-1 py-3 rounded-2xl bg-destructive text-destructive-foreground text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95 shadow-lg shadow-destructive/20 disabled:opacity-50"
              >
                {blocking ? "Blocking..." : "Block & Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
