"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import {
  User,
  Award,
  TrendingUp,
  ChevronRight,
  LogOut,
  Shield,
  HelpCircle,
  Clock,
  MessageCircle,
  Pencil,
  Bot,
  Crown,
  FileText,
  Cookie,
  Settings,
  Check,
  X,
  School,
} from "lucide-react"
import AvatarPicker from "./avatar-picker"
import { type User as FirebaseUser } from "firebase/auth"
import { type UserStats, updateUserCategory, updateUserSchool } from "@/lib/user-stats"
import { subscribeToUnreadCount } from "@/lib/chat"
import { SURVEYS } from "@/lib/surveys"
import { fetchApprovedSchools } from "@/lib/schools"
import { ADMIN_EMAIL } from "@/lib/constants"
import { toast } from "react-toastify"

interface ProfileViewProps {
  user: FirebaseUser | null
  stats: UserStats | null
  statsLoading: boolean
  onLogout: () => void
  onShowLegal: (type: "terms" | "privacy" | "cookies") => void
  onShowLeaderboard: () => void
  onShowHistory: () => void
  onOpenChat: () => void
  onShowSurveys?: () => void
  currentCategory?: "JSS" | "SSS"
}



export function ProfileView({ user, stats, statsLoading, onLogout, onShowLegal, onShowLeaderboard, onShowHistory, onOpenChat, onShowSurveys, currentCategory = "JSS" }: ProfileViewProps) {
  const displayName = user?.displayName || "User"
  const email = user?.email || "No email"
  const photoURL = user?.photoURL
  const [unreadCount, setUnreadCount] = useState(0)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<"JSS" | "SSS">(currentCategory)
  const [movingCategory, setMovingCategory] = useState(false)
  const [showSchoolModal, setShowSchoolModal] = useState(false)
  const [schoolInput, setSchoolInput] = useState("")
  const [approvedSchools, setApprovedSchools] = useState<string[]>([])
  const [savingSchool, setSavingSchool] = useState(false)
  const [aiChatLoading, setAiChatLoading] = useState(false)
  const cxgenieLoaded = useRef(false)
  const isAdmin = user?.email === ADMIN_EMAIL
  const currentSchoolName = isAdmin
    ? "Admin"
    : (stats?.schoolName || stats?.school || "")

  useEffect(() => {
    setSelectedCategory(currentCategory)
  }, [currentCategory])

  useEffect(() => {
    if (!isAdmin) {
      setSchoolInput(stats?.schoolName || stats?.school || "")
    }
  }, [stats?.schoolName, stats?.school, isAdmin])

  useEffect(() => {
    if (showSchoolModal && approvedSchools.length === 0) {
      fetchApprovedSchools()
        .then(setApprovedSchools)
        .catch(() => {})
    }
  }, [showSchoolModal, approvedSchools.length])

  // Real-time unread badge
  useEffect(() => {
    if (!user || !stats) return
    const unsub = subscribeToUnreadCount(
      user.uid,
      stats.lastChatReadAt || null,
      (count) => setUnreadCount(count)
    )
    return () => unsub()
  }, [user, stats?.lastChatReadAt])

  // Pre-load CXGenie script in background if user is Pro
  useEffect(() => {
    if (stats?.isPro && !cxgenieLoaded.current) {
      // Check if script already exists to avoid duplicate script elements
      const existingScript = document.querySelector('script[src="https://widget.cxgenie.ai/widget.js"]')
      if (existingScript) {
        cxgenieLoaded.current = true
        return
      }

      const script = document.createElement("script")
      script.src = "https://widget.cxgenie.ai/widget.js"
      script.setAttribute("data-aid", "78f8c818-088b-4897-a1f3-e766c75db6e5")
      script.setAttribute("data-lang", "en")
      script.setAttribute("data-hide-widget-button", "true")
      script.async = true
      script.onload = () => {
        cxgenieLoaded.current = true
      }
      document.body.appendChild(script)
    }
  }, [stats?.isPro])

  const completedIds = stats?.surveyResults
    ? Object.keys(stats.surveyResults).filter((id) => {
        const survey = SURVEYS.find((s) => s.id === id)
        return survey ? stats.surveyResults![id].total === survey.questions.length : true
      })
    : []
  const uncompletedCount = SURVEYS.filter((s) => !completedIds.includes(s.id)).length

  const MENU_ITEMS = [
    { icon: Award, label: "Achievements", badge: stats?.achievements?.length ? `${stats.achievements.length} Unlocked` : "0 Unlocked", action: "achievements" },
    { icon: Clock, label: "Activity History", action: "history" },
    {
      icon: School,
      label: "School Name",
      badge: currentSchoolName ? (currentSchoolName.length > 22 ? `${currentSchoolName.slice(0, 22)}…` : currentSchoolName) : "Edit",
      action: "school",
    },
    { icon: Settings, label: "Category", badge: "New", action: "category", isBold: true },
    { icon: HelpCircle, label: "Trivia & Surveys", badge: uncompletedCount > 0 ? `${uncompletedCount} New` : undefined, action: "surveys" },
    { icon: Shield, label: "Privacy Policy", action: "privacy" },
    { icon: FileText, label: "Terms of Service", action: "terms" },
    { icon: Cookie, label: "Cookie Policy", action: "cookies" },
  ]

  // Derive display values from real stats
  const questionsValue = statsLoading ? "—" : String(stats?.totalQuestions ?? 0)
  const accuracyValue = statsLoading ? "—" : `${stats?.accuracy ?? 0}%`
  const streakValue = statsLoading ? "—" : String(stats?.currentStreak ?? 0)

  const STATS_DISPLAY = [
    { label: "Questions", value: questionsValue },
    { label: "Accuracy", value: accuracyValue },
    { label: "Streak", value: streakValue },
  ]

  // Derive top subject
  const topSubject = stats?.topSubject ?? "—"

  return (
    <div className="flex flex-col min-h-full w-full max-w-lg mx-auto px-5 pt-12 lg:pt-6 pb-8">
      {/* Avatar & name */}
      <div className="flex flex-col items-center mb-8">
        <div
          role="button"
          onClick={() => setShowAvatarPicker(true)}
          className="relative w-20 h-20 rounded-2xl mb-4 flex items-center justify-center overflow-hidden cursor-pointer"
          style={{
            background: photoURL ? "transparent" : "linear-gradient(135deg, oklch(0.72 0.16 192), oklch(0.62 0.18 240))",
            boxShadow: "0 0 32px oklch(0.72 0.16 192 / 0.4)",
          }}
        >
          {photoURL ? (
            <Image
              src={photoURL}
              alt={displayName}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-9 h-9 text-white" strokeWidth={1.5} />
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowAvatarPicker(true)
            }}
            aria-label="Change avatar"
            className="absolute -right-1 -bottom-1 bg-foreground/12 hover:bg-foreground/20 text-foreground p-2 rounded-full flex items-center justify-center w-10 h-10 shadow-md"
          >
            <Pencil className="w-5 h-5" />
          </button>
        </div>

        {showAvatarPicker && (
          <AvatarPicker
            user={user}
            onClose={() => setShowAvatarPicker(false)}
            onUpdated={(url) => {
              // Firestore doc will update
            }}
          />
        )}
        <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
        <p className="text-sm text-muted-foreground">{email}</p>
        <span className={`mt-2 text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full ${
          stats?.isPro 
            ? "bg-amber-500/15 text-amber-400" 
            : "bg-primary/15 text-primary"
        }`}>
          {stats?.isPro ? "Pro Plan" : "Free Plan"}
        </span>
      </div>

      {/* Stats */}
      <div className="glass rounded-2xl p-4 mb-5">
        <div className="grid grid-cols-3 divide-x divide-border/50">
          {STATS_DISPLAY.map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center px-2">
              <span className={`text-lg font-bold text-foreground ${statsLoading ? "animate-pulse" : ""}`}>{value}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top subject card */}
      <div className="glass rounded-2xl p-4 mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Top Subject</p>
          <p className={`text-xs font-bold text-foreground ${statsLoading ? "animate-pulse" : ""}`}>
            {topSubject}
          </p>
        </div>
      </div>

      {/* Unlocked Achievements List */}
      {stats?.achievements && stats.achievements.length > 0 && (
        <div className="glass rounded-2xl p-4 border border-primary/20 mb-5 bg-primary/5">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
            <Award className="w-3 h-3" /> Unlocked Medals
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.achievements.map((ach) => (
              <div key={ach} className="glass border border-white/10 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground flex items-center gap-1.5 shadow-sm">
                <span className="text-base leading-none">{ach.split(" ").pop()}</span>
                <span>{ach.split(" ").slice(0, -1).join(" ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trivia Triumphs List */}
      {stats?.surveyResults && Object.keys(stats.surveyResults).length > 0 && (
        <div className="glass rounded-2xl p-4 border border-purple-500/20 mb-5 bg-purple-500/5">
          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            Trivia Triumphs 🏆
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.surveyResults).map(([surveyId, res]) => {
              const survey = SURVEYS.find((s) => s.id === surveyId)
              const title = survey ? survey.title : surveyId
              return (
                <div key={surveyId} className="glass border border-white/10 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground flex items-center gap-1.5 shadow-sm">
                  <span className="text-base leading-none">🎖️</span>
                  <span>{title}: <strong>{res.score}/{res.total}</strong></span>
                </div>
              )
            })}
          </div>
        </div>
      )}



      <div className="glass rounded-2xl overflow-hidden mb-5">
        {MENU_ITEMS.map(({ icon: Icon, label, badge, action, isBold }, i) => (
          <button
            key={label}
            onClick={() => {
              if (action === "privacy" || action === "terms" || action === "cookies") onShowLegal(action as any)
              if (action === "school" && !isAdmin) {
                setSchoolInput(stats?.schoolName || stats?.school || "")
                setShowSchoolModal(true)
              }
              if (action === "category") setShowCategoryModal(true)
              if (action === "history") onShowHistory()
              if (action === "surveys" && onShowSurveys) onShowSurveys()
            }}
            className={`flex items-center gap-3 w-full px-4 py-3.5 text-sm text-foreground/80 hover:bg-foreground/5 transition-colors ${
              i < MENU_ITEMS.length - 1 ? "border-b border-border/50" : ""
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isBold ? "text-foreground" : "text-muted-foreground"}`} strokeWidth={isBold ? 2 : 1.5} />
            <span className={`flex-1 text-left ${isBold ? "font-bold text-foreground" : ""}`}>{label}</span>
            {badge ? (
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${badge === "New" ? "bg-primary/15 text-primary border border-primary/25" : "bg-foreground/5 text-muted-foreground"}`}>
                {badge}
              </span>
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            )}
          </button>
        ))}
      </div>

      {/* School Name Edit Modal (Students only) */}
      {showSchoolModal && !isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowSchoolModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-border/60 p-5 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <School className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">School Name</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSchoolModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Update the school name shown on your student profile.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Your School Name
                </label>
                <input
                  type="text"
                  value={schoolInput}
                  onChange={(e) => setSchoolInput(e.target.value)}
                  placeholder="Enter your school name..."
                  maxLength={120}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-foreground/5 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {approvedSchools.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Or Pick from Partner Schools
                  </label>
                  <select
                    value={approvedSchools.includes(schoolInput) ? schoolInput : ""}
                    onChange={(e) => {
                      if (e.target.value) setSchoolInput(e.target.value)
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-foreground/5 border border-border/60 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="" className="bg-background text-foreground">
                      Select a school (optional)
                    </option>
                    {approvedSchools.map((s) => (
                      <option key={s} value={s} className="bg-background text-foreground">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSchoolModal(false)}
                className="px-4 py-2 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingSchool || !schoolInput.trim()}
                onClick={async () => {
                  const trimmed = schoolInput.trim()
                  if (!trimmed || !user?.uid) return
                  setSavingSchool(true)
                  try {
                    await updateUserSchool(user.uid, trimmed)
                    toast.success("updated")
                    setShowSchoolModal(false)
                  } catch (err) {
                    console.error("Failed to update:", err)
                    toast.error("Failed to update")
                  } finally {
                    setSavingSchool(false)
                  }
                }}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
              >
                {savingSchool ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category (JSS / SSS) Selection Prompt Modal */}
      {showCategoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-border/60 p-5 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Select Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Choose your academic level category.
            </p>

            <div className="flex flex-col gap-2.5">
              {(["JSS", "SSS"] as const).map((cat) => {
                const isSelected = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/60 bg-foreground/5 hover:border-primary/40 text-foreground/85"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-foreground">{cat}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {cat === "JSS"
                          ? "Junior Secondary School (JSS 1–3)"
                          : "Senior Secondary School (SSS 1–3)"}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex justify-end">
              <button
                type="button"
                disabled={movingCategory}
                onClick={async () => {
                  if (selectedCategory === currentCategory) {
                    setShowCategoryModal(false)
                    return
                  }
                  setMovingCategory(true)
                  try {
                    if (user?.uid) {
                      await updateUserCategory(user.uid, selectedCategory)
                    } else if (typeof window !== "undefined") {
                      localStorage.setItem("studyos_category", selectedCategory)
                    }
                  } catch (err) {
                    console.warn("Failed to update category:", err)
                  } finally {
                    setMovingCategory(false)
                    setShowCategoryModal(false)
                    if (typeof window !== "undefined") {
                      window.location.href = selectedCategory === "SSS" ? "/sss" : "/"
                    }
                  }
                }}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
              >
                {movingCategory
                  ? "Moving..."
                  : selectedCategory !== currentCategory
                    ? "Move"
                    : "Stay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* StudyOS AI Chat — Pro Only */}
      {stats?.isPro && (
        <button
          onClick={() => {
            if ((window as any).openCXGenieChatWidget) {
              try {
                (window as any).openCXGenieChatWidget()
              } catch {}
            } else {
              setAiChatLoading(true)
              
              // Poll for initialization (runs every 100ms)
              const checkInterval = setInterval(() => {
                if ((window as any).openCXGenieChatWidget) {
                  clearInterval(checkInterval)
                  try {
                    (window as any).openCXGenieChatWidget()
                  } catch {}
                  setAiChatLoading(false)
                }
              }, 100)

              // If script has not been loaded/appended yet (safety fallback)
              const existingScript = document.querySelector('script[src="https://widget.cxgenie.ai/widget.js"]')
              if (!existingScript) {
                const script = document.createElement("script")
                script.src = "https://widget.cxgenie.ai/widget.js"
                script.setAttribute("data-aid", "78f8c818-088b-4897-a1f3-e766c75db6e5")
                script.setAttribute("data-lang", "en")
                script.setAttribute("data-hide-widget-button", "true")
                script.async = true
                script.onload = () => {
                  cxgenieLoaded.current = true
                }
                script.onerror = () => {
                  clearInterval(checkInterval)
                  setAiChatLoading(false)
                }
                document.body.appendChild(script)
              }

              // Safety timeout: stop spinner if it fails to initialize in 5s
              setTimeout(() => {
                clearInterval(checkInterval)
                setAiChatLoading(false)
              }, 5000)
            }
          }}
          disabled={aiChatLoading}
          className="group relative w-full rounded-2xl p-px overflow-hidden mb-5 active:scale-[0.98] transition-all duration-200"
        >
          {/* Animated gradient border */}
          <div
            className="absolute inset-0 rounded-2xl opacity-80 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: "linear-gradient(135deg, oklch(0.72 0.16 192), oklch(0.62 0.18 240), oklch(0.62 0.18 295), oklch(0.72 0.16 192))",
              backgroundSize: "300% 300%",
              animation: "aiGradientShift 4s ease infinite",
            }}
          />
          {/* Inner content */}
          <div className="relative flex items-center gap-3 px-4 py-3.5 rounded-[calc(1rem-1px)] bg-background/95 backdrop-blur-xl">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, oklch(0.72 0.16 192 / 0.2), oklch(0.62 0.18 295 / 0.2))",
                border: "1px solid oklch(0.72 0.16 192 / 0.3)",
              }}
            >
              {aiChatLoading ? (
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <Bot className="w-4.5 h-4.5 text-primary" strokeWidth={2} />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-foreground leading-tight">Chat StudyOS AI</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Ask anything about your subjects</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400">Pro</span>
            </div>
          </div>
        </button>
      )}

      {/* Logout */}
      <button
        onClick={onLogout}
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-destructive/30 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-all"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>

      {/* Credits Footer */}
      <div className="mt-auto pt-8 flex flex-col items-center">
        <div className="glass px-5 py-3 rounded-2xl border border-white/10 flex items-center gap-2 shadow-sm">
          <p className="text-[10px] font-medium text-foreground tracking-tight">
            Sponsored by <span className="font-bold">Oliver</span>
          </p>
        </div>
      </div>
    </div>
  )
}
