"use client"

import { useState, useEffect, useRef } from "react"
import { type User as FirebaseUser } from "firebase/auth"
import { type UserStats } from "@/lib/user-stats"
import { subscribeToUnreadCount } from "@/lib/chat"
import { 
  subscribeToUserDMs, 
  removeChatForUser,
  type DirectChat 
} from "@/lib/dm"
import { GlobalChatView } from "./global-chat-view"
import { DMChatView } from "./dm-chat-view"
import { 
  ArrowLeft, 
  Pin, 
  Search, 
  ShieldAlert,
  MessageSquare,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "react-toastify"

interface ChatHubProps {
  user: FirebaseUser
  stats: UserStats | null
  onBack: () => void
  onViewProfile: (uid: string) => void
  initialChatId?: string | null
  onClearInitialChatId?: () => void
}

export function ChatHub({ 
  user, 
  stats, 
  onBack, 
  onViewProfile,
  initialChatId,
  onClearInitialChatId
}: ChatHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<"global" | "dm">("global")
  const [chats, setChats] = useState<DirectChat[]>([])
  const [selectedChat, setSelectedChat] = useState<DirectChat | null>(null)
  const [loadingChats, setLoadingChats] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [globalUnread, setGlobalUnread] = useState(0)
  const [mobileMenuChat, setMobileMenuChat] = useState<DirectChat | null>(null)
  const [removingChatId, setRemovingChatId] = useState<string | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTriggeredRef = useRef(false)

  const handleRemoveChat = async (chat: DirectChat, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (removingChatId === chat.id) return
    setRemovingChatId(chat.id)
    try {
      await removeChatForUser(chat.id, user.uid)
      setChats((prev) => prev.filter((c) => c.id !== chat.id))
      setMobileMenuChat(null)
      toast.success("Chat removed")
    } catch (err) {
      console.error("Failed to remove chat:", err)
      toast.error("Failed to remove chat")
    } finally {
      setRemovingChatId(null)
    }
  }

  // Subscribe to Global Chat unread count
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToUnreadCount(
      user.uid,
      stats?.lastChatReadAt || null,
      (count) => setGlobalUnread(count)
    )
    return () => unsub()
  }, [user, stats?.lastChatReadAt])

  // Subscribe to user's DMs
  useEffect(() => {
    setLoadingChats(true)
    const unsub = subscribeToUserDMs(user.uid, (userChats) => {
      setChats(userChats)
      setLoadingChats(false)

      // If we have a selectedChat currently, update its reference in real-time
      if (selectedChat) {
        const updated = userChats.find((c) => c.id === selectedChat.id)
        if (updated) {
          setSelectedChat(updated)
        }
      }
    })

    return () => unsub()
  }, [user.uid, selectedChat?.id])

  // Handle initialChatId if passed down from a ProfileModal click
  useEffect(() => {
    if (initialChatId && chats.length > 0) {
      const targetChat = chats.find((c) => c.id === initialChatId)
      if (targetChat) {
        setSelectedChat(targetChat)
        setActiveSubTab("dm")
        onClearInitialChatId?.()
      }
    }
  }, [initialChatId, chats, onClearInitialChatId])

  // Count total unread messages in DMs
  const totalUnreadDMs = chats.reduce((acc, chat) => {
    return acc + (chat.unreadCount?.[user.uid] || 0)
  }, 0)

  // Filter chats by search query
  const filteredChats = chats.filter((chat) => {
    const otherUid = chat.users.find((u) => u !== user.uid) || ""
    const otherName = chat.userNames?.[otherUid] || ""
    return otherName.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Format timestamp for DM list
  const formatDMTime = (timestamp: any) => {
    if (!timestamp?.toDate) return ""
    const date = timestamp.toDate()
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  // If a chat is selected, show the DM chat view
  if (selectedChat) {
    return (
      <DMChatView
        user={user}
        chat={selectedChat}
        onBack={() => setSelectedChat(null)}
        onViewProfile={onViewProfile}
        onRefreshChats={() => {}}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-background apple-font select-none overflow-hidden min-h-0">
      {/* Unified Header */}
      <div className="sticky top-0 z-30 bg-background border-b border-white/5 px-5 pt-10 lg:pt-5 pb-4 flex flex-col gap-4">
        <div className="max-w-3xl mx-auto w-full flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl glass hover:bg-white/10 transition-all active:scale-95"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          
          <div className="flex-1">
            <h1 className="text-lg font-black tracking-tight">StudyOS</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black opacity-60">
              Connect & Learn
            </p>
          </div>
        </div>

        {/* Premium Sliding Segmented Control */}
        <div className="max-w-3xl mx-auto w-full relative p-1 rounded-2xl bg-muted border border-border flex items-center justify-between">
          <button
            onClick={() => setActiveSubTab("global")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all relative z-10 ${
              activeSubTab === "global" 
                ? "text-primary-foreground font-extrabold" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeSubTab === "global" && (
              <div className="absolute inset-0 rounded-xl bg-primary shadow-lg shadow-primary/20 animate-in fade-in zoom-in-95 duration-200 -z-10" />
            )}
            <Pin className="w-4 h-4" />
            Note Room
            {activeSubTab !== "global" && globalUnread > 0 && (
              <span className="min-w-4.5 h-4.5 px-1.5 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center border border-background shadow-md">
                {globalUnread}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("dm")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all relative z-10 ${
              activeSubTab === "dm" 
                ? "text-primary-foreground font-extrabold" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeSubTab === "dm" && (
              <div className="absolute inset-0 rounded-xl bg-primary shadow-lg shadow-primary/20 animate-in fade-in zoom-in-95 duration-200 -z-10" />
            )}
            <MessageSquare className="w-4 h-4" />
            Private DM's
            {totalUnreadDMs > 0 && (
              <span className="min-w-4.5 h-4.5 px-1.5 rounded-full bg-destructive text-white text-[9px] font-black flex items-center justify-center border border-background shadow-md">
                {totalUnreadDMs}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeSubTab === "global" ? (
          <GlobalChatView
            user={user}
            stats={stats}
            onBack={onBack}
            onUserClick={onViewProfile}
            hideHeader={true}
          />
        ) : (
          <div className="flex flex-col h-full bg-background">
            {/* Search Bar for DMs */}
            <div className="px-5 py-3">
              <div className="relative flex items-center bg-muted border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                <Search className="absolute left-4.5 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search direct chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            {/* Chats List */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-6 space-y-2">
              {loadingChats ? (
                <div className="space-y-3 pt-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 glass rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-16 h-16 rounded-2.5xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/20">
                    <MessageSquare className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-2">No Private Chats Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Click on a student's profile card in the <span className="font-bold text-primary">Leaderboard</span>, then select <span className="font-bold">Message Student</span> to start a private convo.
                  </p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const otherUid = chat.users.find((u) => u !== user.uid) || ""
                  const otherName = chat.userNames?.[otherUid] || "Student"
                  const otherPhoto = chat.userPhotos?.[otherUid] || null
                  const unread = chat.unreadCount?.[user.uid] || 0
                  const isBlocked = chat.blockedBy !== null
                  
                  // Display pending state
                  const isPending = chat.status === "pending"
                  const iAmReceiver = chat.lastMessageSender !== user.uid && isPending

                  return (
                    <div
                      key={chat.id}
                      onClick={() => {
                        if (longPressTriggeredRef.current) {
                          longPressTriggeredRef.current = false
                          return
                        }
                        setSelectedChat(chat)
                      }}
                      onTouchStart={() => {
                        longPressTriggeredRef.current = false
                        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
                        longPressTimerRef.current = setTimeout(() => {
                          longPressTriggeredRef.current = true
                          setMobileMenuChat(chat)
                        }, 450)
                      }}
                      onTouchEnd={() => {
                        if (longPressTimerRef.current) {
                          clearTimeout(longPressTimerRef.current)
                          longPressTimerRef.current = null
                        }
                      }}
                      onTouchMove={() => {
                        if (longPressTimerRef.current) {
                          clearTimeout(longPressTimerRef.current)
                          longPressTimerRef.current = null
                        }
                      }}
                      onContextMenu={(e) => {
                        if (typeof window !== "undefined" && window.innerWidth < 768) {
                          e.preventDefault()
                          longPressTriggeredRef.current = true
                          setMobileMenuChat(chat)
                        }
                      }}
                      className={`flex items-center gap-3.5 p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] border relative overflow-hidden ${
                        unread > 0 
                          ? "bg-primary/5 border-primary/20 shadow-xs" 
                          : "glass border-white/5"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative w-12 h-12 rounded-full shrink-0 overflow-hidden bg-primary/10 border border-white/10 flex items-center justify-center">
                        {otherPhoto ? (
                          <img src={otherPhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-base font-black text-primary">
                            {otherName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Info & Message Snippet */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold text-foreground truncate max-w-44">
                            {otherName}
                          </h4>
                          <span className="text-[10px] text-muted-foreground/60 font-semibold">
                            {chat.lastMessageAt ? formatDMTime(chat.lastMessageAt) : ""}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs truncate flex-1 ${unread > 0 ? "text-foreground font-black" : "text-muted-foreground"}`}>
                            {isBlocked ? (
                              <span className="text-destructive font-semibold flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Chat Blocked
                              </span>
                            ) : chat.lastMessage ? (
                              chat.lastMessage
                            ) : (
                              <span className="italic text-muted-foreground/60">Tap to start conversation</span>
                            )}
                          </p>

                          {/* Unread count badge */}
                          {unread > 0 && (
                            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shrink-0">
                              {unread}
                            </span>
                          )}

                          {/* Status badges */}
                          {isPending && !isBlocked && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              iAmReceiver 
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                : "bg-white/5 text-muted-foreground/60 border border-white/5"
                            }`}>
                              {iAmReceiver ? "Request" : "Sent"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Large Screen End-Side Delete / Remove Chat Button */}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveChat(chat, e)}
                        disabled={removingChatId === chat.id}
                        title="Remove chat"
                        aria-label="Remove chat"
                        className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl bg-destructive/10 hover:bg-destructive hover:text-white text-destructive border border-destructive/20 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Small Screen Centered Delete Modal on Long-Press */}
            {mobileMenuChat && (
              <div
                className="fixed inset-0 z-100 md:hidden bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                onClick={() => setMobileMenuChat(null)}
              >
                <div
                  className="w-full max-w-xs rounded-2xl bg-card border border-border p-4 shadow-2xl animate-in zoom-in-95 duration-200 space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-1 pb-2 border-b border-border/60">
                    <span className="text-xs font-bold text-foreground truncate">
                      {mobileMenuChat.userNames?.[mobileMenuChat.users.find((u) => u !== user.uid) || ""] || "Direct Chat"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMobileMenuChat(null)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={removingChatId === mobileMenuChat.id}
                    onClick={(e) => handleRemoveChat(mobileMenuChat, e)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-bold transition-colors"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>{removingChatId === mobileMenuChat.id ? "Removing..." : "Remove Chat"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
