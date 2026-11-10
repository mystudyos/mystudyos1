"use client"

import { useState, useEffect } from "react"
import { 
  X, 
  User, 
  Award, 
  Flame, 
  Target, 
  TrendingUp, 
  Crown, 
  Building2, 
  ShieldCheck,
} from "lucide-react"
import { fetchUserStats, type UserStats } from "@/lib/user-stats"
import { SURVEYS } from "@/lib/surveys"
import { ADMIN_EMAIL } from "@/lib/constants"

interface ProfileModalProps {
  userId: string
  currentUserId: string
  onClose: () => void
  onStartMessage: (userId: string, name: string, photo: string | null, email: string) => void
}

export function ProfileModal({ userId, currentUserId, onClose, onStartMessage }: ProfileModalProps) {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)

    async function loadStats() {
      try {
        const data = await fetchUserStats(userId)
        if (active) {
          setStats(data)
        }
      } catch (err) {
        console.error("Failed to load user stats for modal:", err)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadStats()
    return () => {
      active = false
    }
  }, [userId])

  if (!userId) return null

  const isOwnProfile = userId === currentUserId
  const isAdminProfile = stats?.email === ADMIN_EMAIL
  const displayName = stats?.displayName || "Anonymous Scholar"
  const photoURL = stats?.photoURL || null
  const school = isAdminProfile ? "Admin" : (stats?.school || "Unconfirmed School")
  const isPro = stats?.isPro || false
  const accuracy = stats?.accuracy ?? 0
  const currentStreak = stats?.currentStreak ?? 0
  const longestStreak = stats?.longestStreak ?? 0
  const totalQuestions = stats?.totalQuestions ?? 0
  const topSubject = stats?.topSubject ?? "—"
  const achievements = stats?.achievements ?? []

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Background glow */}
      <div className="absolute w-72 h-72 rounded-full bg-primary/20 blur-[120px] pointer-events-none" />

      {/* Modal card */}
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-4xl border border-white/10 bg-background/90 p-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-300"
        style={{
          boxShadow: isPro 
            ? "0 20px 50px rgba(245, 158, 11, 0.15), 0 0 0 1px rgba(245, 158, 11, 0.2)"
            : "0 20px 50px rgba(99, 102, 241, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05)"
        }}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-spin">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
            <p className="text-xs text-muted-foreground mt-4 font-bold tracking-widest uppercase animate-pulse">Loading Profile...</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Header / Avatar info */}
            <div className="flex flex-col items-center text-center mt-2 mb-6">
              <div 
                className="relative w-20 h-20 rounded-[1.75rem] flex items-center justify-center overflow-hidden mb-3.5 border border-white/10 shadow-lg"
                style={{
                  background: photoURL ? "transparent" : "linear-gradient(135deg, oklch(0.72 0.16 192), oklch(0.62 0.18 240))"
                }}
              >
                {photoURL ? (
                  <img src={photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-9 h-9 text-white" />
                )}
                
                {/* Active online dot */}
                {stats?.lastSeen && (
                  Date.now() - (
                    typeof stats.lastSeen.toMillis === "function"
                      ? stats.lastSeen.toMillis()
                      : stats.lastSeen.seconds
                        ? stats.lastSeen.seconds * 1000
                        : new Date(stats.lastSeen).getTime()
                  )
                ) < 300000 && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-[#121421] shadow-md shadow-emerald-500/20" />
                )}
              </div>

              <h3 className="text-base font-black text-foreground flex items-center gap-1.5 justify-center">
                {displayName}
                {isPro && (
                  <span className="flex items-center gap-0.5 text-[8.5px] font-black uppercase bg-linear-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-500/30">
                    <Crown className="w-2.5 h-2.5" /> PRO
                  </span>
                )}
              </h3>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 px-3 py-1 rounded-xl bg-white/5 border border-white/5">
                {isAdminProfile ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
                <span className={`font-bold truncate max-w-56 ${isAdminProfile ? "text-amber-400 uppercase tracking-wider" : ""}`}>
                  {school}
                </span>
              </div>
            </div>

            {/* Performance metrics grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {/* Accuracy Card */}
              <div className="glass p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 rounded-bl-full bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-2">
                  <Target className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-xl font-black text-foreground leading-none">{accuracy}%</span>
                <span className="text-[10px] text-muted-foreground/90 uppercase font-black tracking-wider mt-1.5">Accuracy</span>
                <span className="text-[9px] text-foreground mt-0.5">{totalQuestions} questions</span>
              </div>

              {/* Streak Card */}
              <div className="glass p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 rounded-bl-full bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center mb-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-xl font-black text-foreground leading-none">{currentStreak} Days</span>
                <span className="text-[10px] text-muted-foreground/90 uppercase font-black tracking-wider mt-1.5">Streak</span>
                <span className="text-[9px] text-foreground mt-0.5">Best: {longestStreak} days</span>
              </div>
            </div>

            {/* Additional info card */}
            <div className="glass rounded-2xl p-4 border border-white/5 mb-6 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                <span className="text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" /> Top Subject
                </span>
                <span className="font-bold text-foreground text-right truncate max-w-44">{topSubject}</span>
              </div>

              {/* Achievements row */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" /> Medals Unlocked ({achievements.length})
                </span>
                {achievements.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {achievements.slice(0, 3).map((ach) => (
                      <div key={ach} className="glass px-2.5 py-1 rounded-xl text-[10.5px] font-semibold text-foreground/80 flex items-center gap-1 border border-white/5 shadow-xs">
                        <span>{ach.split(" ").pop()}</span>
                        <span>{ach.split(" ").slice(0, -1).join(" ")}</span>
                      </div>
                    ))}
                    {achievements.length > 3 && (
                      <div className="glass px-2.5 py-1 rounded-xl text-[10.5px] font-black text-primary/80 border border-primary/20">
                        +{achievements.length - 3} More
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/40 italic">No achievements unlocked yet.</span>
                )}
              </div>

              {/* Trivia Triumphs row */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-purple-400" /> Trivia Triumphs
                </span>
                {stats?.surveyResults && Object.keys(stats.surveyResults).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.entries(stats.surveyResults).map(([surveyId, res]) => {
                      const survey = SURVEYS.find((s) => s.id === surveyId)
                      const title = survey ? survey.title : surveyId
                      return (
                        <div key={surveyId} className="glass px-2.5 py-1 rounded-xl text-[10px] font-semibold text-foreground/80 flex items-center gap-1 border border-white/5 shadow-xs">
                          <span>🎖️</span>
                          <span>{title}: <strong>{res.score}/{res.total}</strong></span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/40 italic">No trivia completed yet.</span>
                )}
              </div>
            </div>

            {/* Action button */}
            {isOwnProfile ? (
              <div className="text-center text-xs text-muted-foreground/50 italic py-2">
                This is your student profile card!
              </div>
            ) : (
              <button
                onClick={() => {
                  onClose()
                  onStartMessage(
                    userId,
                    displayName,
                    photoURL,
                    stats?.email || ""
                  )
                }}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-95 shadow-lg shadow-primary/20"
              >
                Message Student
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
