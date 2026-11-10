"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import {
  Target,
  Sun,
  Moon,
  ChevronRight,
  Flame,
  Check,
  Bell,
  X,
  MessageCircle,
  RotateCw,
} from "lucide-react"
import { type User as FirebaseUser } from "firebase/auth"
import { type UserStats } from "@/lib/user-stats"
import { subscribeToUnreadCount } from "@/lib/chat"
import { SSS_SUBJECTS } from "@/lib/sss-config"

const ProAnalyticsView = dynamic(
  () => import("./pro-analytics-view").then((mod) => mod.ProAnalyticsView),
  { ssr: false }
)

interface DashboardViewProps {
  user: FirebaseUser | null
  stats: UserStats | null
  statsLoading: boolean
  onStartTraining?: () => void
  onStartSolidQ: () => void
  onGoToPro: () => void
  onOpenChat: () => void
  category?: "JSS" | "SSS"
}

// Clean, lightweight component rendering only the typographic letter
const LetterIcon = ({ letter }: { letter: string }) => (
  <span className="font-bold text-base leading-none tracking-tight select-none">
    {letter}
  </span>
)

const SUBJECTS = [
  { name: "Mathematics", icon: <LetterIcon letter="M" />, color: "text-primary", bg: "bg-primary/15" },
  { name: "English Lang.", icon: <LetterIcon letter="ENG" />, color: "text-amber-400", bg: "bg-amber-400/15" },
  { name: "BST", icon: <LetterIcon letter="BST" />, color: "text-accent", bg: "bg-accent/15" },
  { name: "NVE", icon: <LetterIcon letter="NVE" />, color: "text-purple-400", bg: "bg-purple-400/15" },
  { name: "PVS", icon: <LetterIcon letter="PVS" />, color: "text-rose-400", bg: "bg-rose-400/15" },
  { name: "CCA", icon: <LetterIcon letter="CCA" />, color: "text-indigo-400", bg: "bg-indigo-400/15" },
  { name: "Business Std.", icon: <LetterIcon letter="BUSS" />, color: "text-cyan-400", bg: "bg-cyan-400/15" },
  { name: "French", icon: <LetterIcon letter="F" />, color: "text-orange-400", bg: "bg-orange-400/15" },
  { name: "CRS", icon: <LetterIcon letter="CRS" />, color: "text-teal-400", bg: "bg-teal-400/15" }, 
  { name: "History", icon: <LetterIcon letter="H" />, color: "text-slate-400", bg: "bg-slate-400/15" },
  { name: "Igbo", icon: <LetterIcon letter="I" />, color: "text-yellow-400", bg: "bg-yellow-400/15" },
  { name: "Yoruba", icon: <LetterIcon letter="Y" />, color: "text-lime-400", bg: "bg-lime-400/15" },
]

const SSS_DASHBOARD_SUBJECTS = SSS_SUBJECTS.map((s) => ({
  name: s.shortName,
  icon: <LetterIcon letter={s.letter} />,
  color: s.color,
  bg: s.bg,
}))

export function DashboardView({ user, stats, statsLoading, onStartTraining, onStartSolidQ, onGoToPro, onOpenChat, category = "JSS" }: DashboardViewProps) {
  const isSSS = category === "SSS"
  const displayedSubjects = isSSS ? SSS_DASHBOARD_SUBJECTS : SUBJECTS
  const [isScrolledToRight, setIsScrolledToRight] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const isRight = Math.abs(target.scrollWidth - target.clientWidth - target.scrollLeft) < 10
    setIsScrolledToRight(isRight)
  }

  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll when changelog modal is open
  useEffect(() => {
    if (showChangelog) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [showChangelog])

  // Derive display values from real stats
  const displayName = user?.displayName?.split(" ")[0] || "Student"
  const questionsValue = statsLoading ? "—" : String(stats?.totalQuestions ?? 0)
  const accuracyValue = statsLoading ? "—" : `${stats?.accuracy ?? 0}%`
  const topSubjectValue = statsLoading ? "—" : (stats?.topSubject ?? "N/A")
  const currentStreak = stats?.currentStreak ?? 0
  const maxStreakDots = 7

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md flex items-center justify-between px-5 md:px-8 lg:px-10 pt-6 lg:pt-6 pb-4 border-b border-white/5 shadow-xs">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-0.5">
            Welcome!
          </p>
          <h1 className="text-base font-bold text-foreground">
            Hi, {displayName}! 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => window.location.reload()}
            className="relative w-10 h-10 rounded-xl glass flex items-center justify-center transition-colors hover:bg-white/5 active:scale-95"
            aria-label="Refresh app"
          >
            <RotateCw className="w-5 h-5 text-muted-foreground" />
          </button>
          {/* Notification Bell */}
          <button
            onClick={() => setShowChangelog(!showChangelog)}
            className="relative w-10 h-10 rounded-xl glass flex items-center justify-center transition-colors hover:bg-white/5 active:scale-95"
            aria-label="What's new"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {/* Red notification dot */}
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
          </button>
          {/* Theme Toggle */}
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative w-10 h-10 rounded-xl glass flex items-center justify-center transition-colors hover:bg-white/5 active:scale-95"
            aria-label="Toggle theme"
          >
            {mounted ? (
              theme === "dark" ? (
                <Sun className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Moon className="w-5 h-5 text-muted-foreground" />
              )
            ) : (
              <div className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* What's New — Notification Dropdown */}
      {showChangelog && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowChangelog(false)}
          />
          {/* Panel — fixed overlay to prevent outer scroll */}
          <div
            className="fixed inset-x-0 top-0 z-50 flex justify-center px-5 pt-20 pb-10 pointer-events-none"
            style={{ maxHeight: '100dvh' }}
          >
          <div
            className="pointer-events-auto w-full max-w-lg glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200 flex flex-col"
            style={{ maxHeight: '75dvh' }}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">What&apos;s New</h3>
              </div>
              <button 
                onClick={() => setShowChangelog(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-foreground/5 transition-colors active:scale-90"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Entries — sorted newest first */}
            <div className="px-4 py-3 space-y-3 flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>

              {/* Nov 9 — Flex Score Share Card */}
              <div className="flex gap-3 group">
                <div className="mt-1 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.5)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">Feature</span>
                    <span className="text-[9px] text-foreground font-semibold tabular-nums">November 9, 2026</span>
                  </div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">Flex Score Share Card is Live!</p>
                  <p className="text-[11px] text-foreground mt-0.5 leading-relaxed">Head to the National Ranking Leaderboard and tap the FLEX SCORE badge next to your name to generate, download, and share your personalized score card directly to WhatsApp!</p>
                </div>
              </div>

              <div className="h-px bg-border/30" />

              {/* Aug 4 — Push Notifications */}
              <div className="flex gap-3 group">
                <div className="mt-1 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">Feature</span>
                    <span className="text-[9px] text-foreground font-semibold tabular-nums">August 4, 2026</span>
                  </div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">Web Push Notifications are Live!</p>
                  <p className="text-[11px] text-foreground mt-0.5 leading-relaxed">Stay connected in real-time and get instant background push notifications for new private DMs and Chat Room messages even when StudyOS is closed.</p>
                </div>
              </div>

              <div className="h-px bg-border/30" />

              {/* Jun 11 — Responsive UI Design */}
              <div className="flex gap-3 group">
                <div className="mt-1 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.5)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">Feature</span>
                    <span className="text-[9px] text-foreground font-semibold tabular-nums">June 11, 2026</span>
                  </div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">Larger Screen UI Built</p>
                  <p className="text-[11px] text-foreground mt-0.5 leading-relaxed">We've updated the UI to better fit larger screens such as laptops and desktops.</p>
                </div>
              </div>
              <div className="h-px bg-border/30" />

              {/* Jun 1 — Private DMs */}
              <div className="flex gap-3 group">
                <div className="mt-1 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.5)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">Feature</span>
                    <span className="text-[9px] text-foreground font-semibold tabular-nums">June 1, 2026</span>
                  </div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">Private DM's are Live!</p>
                  <p className="text-[11px] text-foreground mt-0.5 leading-relaxed">Start private 1-on-1 chats with fellow students by clicking their profile cards on the Leaderboard or Room Chat. Safe & secure communication built directly into StudyOS.</p>
                </div>
              </div>

              <div className="h-px bg-border/30" />
                            
              {/* May 21 — Avatar Picker */}
              <div className="flex gap-3 group">
                <div className="mt-1 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(139,92,246,0.5)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-500">Feature</span>
                    <span className="text-[9px] text-foreground font-semibold tabular-nums">May 21, 2026</span>
                  </div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">New Avatar Picker — choose illustrated avatars</p>
                  <p className="text-[11px] text-foreground mt-0.5 leading-relaxed">Pick from DiceBear Adventurer illustrations. Avatars are saved to your profile and shown across StudyOS.</p>
                </div>
              </div>

              <div className="h-px bg-border/30" />

              {/* May 17 — Global Chat */}
              <div className="flex gap-3 group">
                <div className="mt-1 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500">Feature</span>
                    <span className="text-[9px] text-foreground font-semibold tabular-nums">May 17, 2026</span>
                  </div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">Global Chat is Live!</p>
                  <p className="text-[11px] text-foreground mt-0.5 leading-relaxed">Connect and study together! The all-new real-time Global Chat lets you talk to students from all schools directly from your dashboard.</p>
                </div>
              </div>

              <div className="h-px bg-border/30" />

              {/* May 13 — Streak Reliability */}
              <div className="flex gap-3 group">
                <div className="mt-1 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.5)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">Update</span>
                    <span className="text-[9px] text-foreground font-semibold tabular-nums">May 13, 2026</span>
                  </div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">Streak Reliability Updated</p>
                  <p className="text-[11px] text-foreground mt-0.5 leading-relaxed">Streaks now correctly increment once per day (instead of every quiz), preventing unrealistic inflation and making progress feel earned.</p>
                </div>
              </div>

              <div className="h-px bg-border/30" />

              {/* May 12 — Pro Plan Unlocked */}
              <div className="flex gap-3 group">
                <div className="mt-1 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500">Feature</span>
                    <span className="text-[9px] text-foreground font-semibold tabular-nums">May 12, 2026</span>
                  </div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">StudyOS Pro Unlocked! 👑</p>
                  <p className="text-[11px] text-foreground mt-0.5 leading-relaxed">Upgrade to Pro to unlock the Advanced Analytics dashboard, Performance Trends, Subject Mastery matrix, and your exact Global Rank!</p>
                </div>
              </div>

              <div className="h-px bg-border/30" />
              {/* May 11 — Streaks Secured */}
              <div className="flex gap-3 group">
                <div className="mt-1 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">Security</span>
                    <span className="text-[9px] text-foreground font-semibold tabular-nums">May 11, 2026</span>
                  </div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">Streaks &amp; Data Secured</p>
                  <p className="text-[11px] text-foreground mt-0.5 leading-relaxed">Your progress is now fully protected. Streaks, scores, and achievements will never reset again.</p>
                </div>
              </div>

              <div className="h-px bg-border/30" />

              {/* May 11 — Training No-Score */}
              <div className="flex gap-3 group">
                <div className="mt-1 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-400/10 text-amber-500">Update</span>
                    <span className="text-[9px] text-foreground font-semibold tabular-nums">May 11, 2026</span>
                  </div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">Training Mode: No-Score</p>
                  <p className="text-[11px] text-foreground mt-0.5 leading-relaxed">Training Mode no longer adds to leaderboard points. Only Exam Practice earns ranking credit.</p>
                </div>
              </div>

              <div className="h-px bg-border/30" />

              {/* May 10 — Leaderboard */}
              <div className="flex gap-3 group">
                <div className="mt-1 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_rgba(var(--primary),0.5)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">Feature</span>
                    <span className="text-[9px] text-foreground font-semibold tabular-nums">May 10, 2026</span>
                  </div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">Global Leaderboard</p>
                  <p className="text-[11px] text-foreground mt-0.5 leading-relaxed">Compete with students across all schools. Your scores now rank you in a live global leaderboard.</p>
                </div>
              </div>

              <div className="h-px bg-border/30" />

              {/* May 6 — School Verification */}
              <div className="flex gap-3 group">
                <div className="mt-1 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.5)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-violet-400/10 text-violet-500">Feature</span>
                    <span className="text-[9px] text-foreground font-semibold tabular-nums">May 6, 2026</span>
                  </div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">School Verification</p>
                  <p className="text-[11px] text-foreground mt-0.5 leading-relaxed">Students now confirm their school during sign-up for a personalized experience.</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </>
      )}

      {/* Category Prep Badge */}
      <div className="px-5 md:px-8 lg:px-10 mb-5 pt-4">
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 w-fit">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary tracking-wide">
            {isSSS ? "YR 10-12 WAEC • NECO • JAMB PREP" : "YR 7-9 BECE PREP"}
          </span>
        </div>
      </div>

      {/* Pro upsell banner */}
      {!stats?.isPro && (
        <div className="px-5 md:px-8 lg:px-10 mb-5">
          <div
          className="relative rounded-2xl p-4 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, oklch(0.35 0.14 295 / 0.7), oklch(0.28 0.12 240 / 0.7))",
            border: "1px solid oklch(0.62 0.18 295 / 0.35)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Decorative glow blob */}
          <div
            className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-40 pointer-events-none"
            style={{ background: "radial-gradient(circle, oklch(0.62 0.18 295), transparent 70%)" }}
          />
          <div className="relative flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">StudyOS Pro</p>
              <p className="text-xs text-purple-200/80 mt-0.5 leading-tight">
                Unlock Explanations &amp; Analytics
              </p>
            </div>
            <div className="shrink-0">
              <div className="text-right mb-1">
                <span className="text-white font-bold text-sm">{isSSS ? "₦1,000" : "₦500"}</span>
                <span className="text-purple-200/70 text-xs">{isSSS ? "/3mo" : "/2mo"}</span>
                {!isSSS && (
                  <span className="text-purple-200/50 text-[11px] line-through ml-1">/1mo</span>
                )}
              </div>
              <button
                onClick={onGoToPro}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-primary-foreground whitespace-nowrap"
                style={{
                  background: "linear-gradient(135deg, oklch(0.72 0.16 192), oklch(0.62 0.18 240))",
                  boxShadow: "0 2px 12px oklch(0.72 0.16 192 / 0.4)",
                }}
              >
                Unlock
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
      {/* Streak card */}
      <div className="px-5 md:px-8 lg:px-10 mb-5">
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/15 flex items-center justify-center">
            <Flame className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Exam Practice Streak</p>
            <p className={`text-[9px] font-bold text-foreground whitespace-nowrap ${statsLoading ? "animate-pulse" : ""}`}>
              {statsLoading ? "Loading..." : currentStreak === 0 ? "No exam streak yet" : `${currentStreak} day${currentStreak !== 1 ? "s" : ""} exam streak`}
            </p>
          </div>
          <div className="ml-auto">
            <div className="flex gap-1">
              {Array.from({ length: maxStreakDots }).map((_, d) => (
                <div
                  key={d}
                  className={`flex items-center justify-center w-4 h-4 rounded-full transition-all duration-300 ${d < currentStreak ? "bg-amber-400" : "bg-foreground/10"}`}
                >
                  {d < currentStreak && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action grid */}
      <div className="px-5 md:px-8 lg:px-10 mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Practice Mode
        </h2>
        <div className="lg:max-w-4xl">
          {/* Solid Question / Exam Practice Mode */}
          <button
            onClick={onStartSolidQ}
            className="w-full relative rounded-2xl p-4 sm:p-5 text-left overflow-hidden active:scale-[0.98] transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer"
            style={{
              background: "linear-gradient(145deg, oklch(0.25 0.1 295 / 0.85), oklch(0.2 0.08 280 / 0.9))",
              border: "1px solid oklch(0.62 0.18 295 / 0.3)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 4px 24px oklch(0.62 0.18 295 / 0.2)",
            }}
          >
            <div
              className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full pointer-events-none opacity-30"
              style={{ background: "radial-gradient(circle, oklch(0.62 0.2 295), transparent 70%)" }}
            />
            <div className="flex items-center gap-3.5 relative">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.62 0.2 295 / 0.2)", border: "1px solid oklch(0.62 0.2 295 / 0.35)" }}
              >
                <Target className="w-5 h-5 text-purple-300" strokeWidth={1.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm sm:text-base font-bold text-white">Exam Practice</p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-400/15 text-purple-300">
                    Free
                  </span>
                </div>
                <p className="text-xs text-white/70 mt-0.5">
                  {isSSS
                    ? "Timed CBT past question simulation (WAEC • NECO • JAMB)"
                    : "Timed BECE past question simulation"}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-purple-200/80 shrink-0 relative" />
          </button>
        </div>
      </div>

      {/* Recent subjects */}
      <div className="mb-4">
        <div className="flex items-center justify-between px-5 md:px-8 lg:px-10 mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Subjects
          </h2>
          <div className="flex items-center gap-2 lg:hidden">
            <button 
              onClick={() => {
                const el = document.getElementById('subjects-scroll');
                if (el) el.scrollBy({ left: -150, behavior: 'smooth' });
              }}
              className="text-primary font-bold text-sm tracking-widest flex items-center active:scale-90 transition-all hover:opacity-80 p-1 cursor-pointer"
              aria-label="Scroll subjects left"
            >
              &lt;&lt;
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('subjects-scroll');
                if (el) el.scrollBy({ left: 150, behavior: 'smooth' });
              }}
              className="text-primary font-bold text-sm tracking-widest flex items-center active:scale-90 transition-all hover:opacity-80 p-1 -mr-1 cursor-pointer"
              aria-label="Scroll subjects right"
            >
              &gt;&gt;
            </button>
          </div>
        </div>
        <div className="relative">
          <div 
            id="subjects-scroll"
            className="flex gap-3 px-5 md:px-8 lg:px-10 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] lg:grid lg:grid-cols-6 lg:gap-5 lg:overflow-visible"
            onScroll={handleScroll}
          >
            {displayedSubjects.map(({ name, icon, color, bg }) => (
              <div
                key={name}
                className="flex flex-col items-center gap-2 shrink-0 transition-all duration-200"
              >
                <div className={`w-14 h-14 rounded-2xl glass flex items-center justify-center ${bg} ${color}`}>
                  {icon}
                </div>
                <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{name}</span>
              </div>
            ))}
          </div>
          {/* Cloud fade overlay */}
          <div 
            className={`absolute right-0 top-0 bottom-0 w-16 pointer-events-none transition-opacity duration-300 lg:hidden ${isScrolledToRight ? "opacity-0" : "opacity-100"}`}
            style={{ background: "linear-gradient(to left, var(--background), transparent)" }}
          />
        </div>
      </div>

      {/* Stats row — now uses real data */}
      <div className="px-5 md:px-8 lg:px-10">
        <div className="grid grid-cols-3 gap-3 md:gap-4 lg:gap-6 lg:max-w-4xl">
          {[
            { label: "Questions Done", value: questionsValue },
            { label: "Accuracy", value: accuracyValue },
            { label: "Top Subject", value: topSubjectValue },
          ].map(({ label, value }) => (
            <div key={label} className="glass rounded-xl p-3 text-center flex flex-col justify-center min-h-18">
              <p className={`text-xs font-bold text-foreground leading-tight ${statsLoading ? "animate-pulse" : ""}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight uppercase tracking-wider font-medium opacity-70">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pro Analytics View */}
      {stats?.isPro && (
        <div className="mt-8">
          <ProAnalyticsView user={user} stats={stats} />
        </div>
      )}

    </div>
  )
}
