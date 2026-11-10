"use client"

import { useState, useEffect, useRef } from "react"
import { type User as FirebaseUser } from "firebase/auth"
import { 
  Users, 
  Search, 
  Mail, 
  School, 
  TrendingUp, 
  Target, 
  ArrowLeft, 
  ShieldCheck,
  Circle,
  FileText,
  Crown,
  Ban,
  RotateCcw,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Loader2,
  Building2,
  Calendar,
  ArrowUp,
  Flame
} from "lucide-react"

function toMillisSafe(val: any): number {
  if (!val) return 0
  try {
    if (typeof val.toMillis === "function") return val.toMillis()
    if (typeof val.toDate === "function") return val.toDate().getTime()
    if (typeof val.seconds === "number") return val.seconds * 1000
    if (typeof val === "number") return val
    if (typeof val === "string") {
      const parsed = Date.parse(val)
      return isNaN(parsed) ? 0 : parsed
    }
  } catch {
    return 0
  }
  return 0
}

function formatJoinedDate(createdAt: any): string {
  if (!createdAt) return "Joined N/A"
  try {
    let date: Date
    if (createdAt.toDate && typeof createdAt.toDate === "function") {
      date = createdAt.toDate()
    } else if (createdAt.seconds) {
      date = new Date(createdAt.seconds * 1000)
    } else if (typeof createdAt === "number" || typeof createdAt === "string") {
      date = new Date(createdAt)
    } else {
      return "Joined N/A"
    }
    if (isNaN(date.getTime())) return "Joined N/A"
    return `Joined ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  } catch (e) {
    return "Joined N/A"
  }
}
import { fetchAllStudents, type UserStats, banUser, unbanUser } from "@/lib/user-stats"
import { 
  fetchSafetyReports, 
  dismissSafetyReport, 
  unblockUserInChat, 
  type SafetyReport 
} from "@/lib/dm"
import { 
  ADMIN_EMAIL, 
  BAN_MESSAGE_TEMPLATE, 
  UNCONFIRMED_SCHOOL_TEMPLATE, 
  WELCOME_MESSAGE_TEMPLATE, 
  CELEBRATION_MESSAGE_TEMPLATE, 
  MESSAGE_OPTIONS, 
  type MessageType 
} from "@/lib/constants"
import { fetchPendingSchools, approveSchool, rejectSchool, type SchoolDoc } from "@/lib/schools"
import { toast } from "react-toastify"

interface AdminDashboardProps {
  user: FirebaseUser
  onBack: () => void
}

type StudentRecord = UserStats & { uid: string }

export function AdminDashboard({ user, onBack }: AdminDashboardProps) {
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [openMailMenu, setOpenMailMenu] = useState<string | null>(null)
  const mailMenuRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [pendingSchools, setPendingSchools] = useState<SchoolDoc[]>([])
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [processingSchool, setProcessingSchool] = useState<string | null>(null)
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>([])
  const [loadingReports, setLoadingReports] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      const windowScroll = window.scrollY || document.documentElement.scrollTop
      const parentScroll = containerRef.current?.parentElement?.scrollTop || 0
      const selfScroll = containerRef.current?.scrollTop || 0
      const currentScroll = Math.max(windowScroll, parentScroll, selfScroll)
      setShowScrollTop(currentScroll > 150)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    const parent = containerRef.current?.parentElement
    if (parent) {
      parent.addEventListener("scroll", handleScroll, { passive: true })
    }

    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (parent) {
        parent.removeEventListener("scroll", handleScroll)
      }
    }
  }, [])

  const handleScrollToTop = () => {
    if (containerRef.current?.parentElement) {
      containerRef.current.parentElement.scrollTo({ top: 0, behavior: "smooth" })
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await fetchAllStudents()
      setStudents(data)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load student data")
    } finally {
      setLoading(false)
    }
  }

  const loadSchools = async () => {
    setLoadingSchools(true)
    try {
      const schools = await fetchPendingSchools()
      setPendingSchools(schools)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSchools(false)
    }
  }

  const loadReports = async () => {
    setLoadingReports(true)
    try {
      const reports = await fetchSafetyReports()
      setSafetyReports(reports)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingReports(false)
    }
  }

  useEffect(() => {
    loadData()
    loadSchools()
    loadReports()
  }, [])

  // Close mail menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mailMenuRef.current && !mailMenuRef.current.contains(e.target as Node)) {
        setOpenMailMenu(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getMailtoLink = (type: MessageType, student: StudentRecord) => {
    const name = student.displayName || "Student"
    let template: { subject: string; body: string }

    switch (type) {
      case "unconfirmed_school":
        template = UNCONFIRMED_SCHOOL_TEMPLATE(name, student.email || "")
        break
      case "welcome":
        template = WELCOME_MESSAGE_TEMPLATE(name)
        break
      case "celebration":
        template = CELEBRATION_MESSAGE_TEMPLATE(name)
        break
    }

    return `mailto:${student.email}?subject=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(template.body)}`
  }

  const handleBan = async (student: StudentRecord) => {
    if (!confirm(`Are you sure you want to ban ${student.displayName || student.email}?`)) return
    
    try {
      await banUser(student.uid, "Inaccurate School Affiliation")
      toast.success("User banned successfully")
      
      // Prepare mailto link
      const body = BAN_MESSAGE_TEMPLATE.replace("[Student Name]", student.displayName || "Student")
      const mailto = `mailto:${student.email}?subject=Important Account Action: StudyOS Access Suspended&body=${encodeURIComponent(body)}`
      
      // Open mailto link
      window.location.href = mailto
      
      loadData() // refresh list
    } catch (err) {
      console.error(err)
      toast.error("Failed to ban user")
    }
  }

  const handleUnban = async (student: StudentRecord) => {
    if (!confirm(`Are you sure you want to unban ${student.displayName || student.email}?`)) return
    
    try {
      await unbanUser(student.uid)
      toast.success("User unbanned successfully")
      loadData() // refresh list
    } catch (err) {
      console.error(err)
      toast.error("Failed to unban user")
    }
  }

  const handleUnblock = async (chatId: string, reportId: string) => {
    if (!confirm("Are you sure you want to unblock this DM chat session?")) return
    try {
      await unblockUserInChat(chatId)
      await dismissSafetyReport(reportId)
      toast.success("User unblocked and report dismissed")
      loadReports()
    } catch (err) {
      console.error(err)
      toast.error("Failed to unblock user")
    }
  }

  const handleDismissReport = async (reportId: string) => {
    if (!confirm("Dismiss this report without unblocking?")) return
    try {
      await dismissSafetyReport(reportId)
      toast.success("Report dismissed")
      loadReports()
    } catch (err) {
      console.error(err)
      toast.error("Failed to dismiss report")
    }
  }

  const filteredStudents = students.filter(s => 
    s.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.school?.toLowerCase().includes(search.toLowerCase())
  )

  const nowMs = Date.now()
  const DAY_MS = 86_400_000
  const WEEK_MS = 7 * DAY_MS
  const MONTH_MS = 30 * DAY_MS

  // Active students in the last 7 days (completed an exam or active session in last 7 days)
  const active7dStudents = students.filter(s => {
    const quizMs = toMillisSafe(s.lastQuizDate)
    const activityMs = Math.max(quizMs, toMillisSafe(s.lastSeen), toMillisSafe(s.updatedAt))
    return quizMs >= nowMs - WEEK_MS || (activityMs >= nowMs - WEEK_MS && (s.quizzesTaken || 0) > 0)
  })

  // Practice exams completed in the last 7 days
  const exams7d = active7dStudents.reduce((sum, s) => {
    const joinedMs = toMillisSafe(s.createdAt)
    const totalQuizzes = s.quizzesTaken || 0
    if (joinedMs >= nowMs - WEEK_MS) {
      return sum + totalQuizzes
    }
    const recentEstimate = Math.min(totalQuizzes, Math.max(1, s.currentStreak || 1))
    return sum + recentEstimate
  }, 0)

  // North Star Metric: Weekly practice exams completed per active student (last 7 days)
  const weeklyExamsPerActiveNum = active7dStudents.length > 0
    ? exams7d / active7dStudents.length
    : 0

  // Baseline comparison: prior 30-day cohort (or prior 7–30d window if platform < 60d old)
  const priorMonthStudents = students.filter(s => {
    const joinedMs = toMillisSafe(s.createdAt)
    const quizMs = toMillisSafe(s.lastQuizDate)
    const activityMs = Math.max(quizMs, toMillisSafe(s.lastSeen), toMillisSafe(s.updatedAt), joinedMs)
    return (joinedMs > 0 && joinedMs < nowMs - MONTH_MS && (s.quizzesTaken || 0) > 0) ||
      (activityMs >= nowMs - 2 * MONTH_MS && activityMs < nowMs - MONTH_MS && (s.quizzesTaken || 0) > 0)
  })

  const fallbackPriorCohort = priorMonthStudents.length > 0
    ? priorMonthStudents
    : students.filter(s => {
        const joinedMs = toMillisSafe(s.createdAt)
        const quizMs = toMillisSafe(s.lastQuizDate)
        return ((joinedMs > 0 && joinedMs < nowMs - WEEK_MS) || (quizMs > 0 && quizMs < nowMs - WEEK_MS)) && (s.quizzesTaken || 0) > 0
      })

  const priorWeeklyRate = fallbackPriorCohort.length > 0
    ? fallbackPriorCohort.reduce((sum, s) => {
        const joinedMs = toMillisSafe(s.createdAt) || (nowMs - MONTH_MS)
        const weeksActive = Math.max(1, Math.ceil((nowMs - joinedMs) / WEEK_MS))
        return sum + ((s.quizzesTaken || 0) / weeksActive)
      }, 0) / fallbackPriorCohort.length
    : 0

  const momGrowth = priorWeeklyRate > 0 && weeklyExamsPerActiveNum > 0
    ? Math.round(((weeklyExamsPerActiveNum - priorWeeklyRate) / priorWeeklyRate) * 100)
    : 0

  // Weekly & Monthly Streaks
  const weeklyStreaks = students.filter(s => {
    const quizMs = toMillisSafe(s.lastQuizDate)
    const activityMs = Math.max(quizMs, toMillisSafe(s.updatedAt))
    return (s.currentStreak || 0) >= 7 || ((s.currentStreak || 0) >= 1 && activityMs >= nowMs - WEEK_MS)
  }).length

  const monthlyStreaks = students.filter(s => {
    const quizMs = toMillisSafe(s.lastQuizDate)
    const activityMs = Math.max(quizMs, toMillisSafe(s.updatedAt))
    return (s.currentStreak || 0) >= 30 || ((s.currentStreak || 0) >= 1 && (activityMs >= nowMs - MONTH_MS || (s.currentStreak || 0) > 0))
  }).length

  const stats = {
    total: students.length,
    active: students.filter(s => s.lastSeen && (nowMs - toMillisSafe(s.lastSeen)) < 300000).length,
    pro: students.filter(s => s.isPro).length,
    momGrowth,
    weeklyStreaks,
    monthlyStreaks,
  }

  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <ShieldCheck className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">This area is reserved for the platform administrator.</p>
        <button onClick={onBack} className="mt-6 px-6 py-2 bg-primary rounded-xl text-primary-foreground">Go Back</button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex flex-col min-h-screen bg-background pb-12 relative">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/80 px-5 pt-8 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2.5 rounded-2xl bg-card border border-border/80 hover:bg-muted text-foreground transition-all active:scale-95 shadow-xs cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-foreground">Admin Center</h1>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black opacity-80">System Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live Session</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card text-card-foreground rounded-2xl p-3 border border-border/80 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-base font-bold text-foreground">{stats.total}</span>
            </div>
            <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight truncate">Students</div>
          </div>
          <div className="bg-card text-card-foreground rounded-2xl p-3 border border-border/80 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <Circle className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20" />
              <span className="text-base font-bold text-foreground">{stats.active}</span>
            </div>
            <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight truncate">Online</div>
          </div>
          <div className="bg-card text-card-foreground rounded-2xl p-3 border border-border/80 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-base font-bold text-foreground">{stats.pro}</span>
            </div>
            <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight truncate">Pro</div>
          </div>
        </div>

        {/* North Star Growth & Streak Metrics */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-card text-card-foreground rounded-2xl p-3 border border-border/80 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-base font-bold text-foreground">{stats.momGrowth}%</span>
            </div>
            <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight truncate">MoM Growth</div>
          </div>

          <div className="bg-card text-card-foreground rounded-2xl p-3 border border-border/80 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-base font-bold text-foreground">{stats.weeklyStreaks}</span>
            </div>
            <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight truncate">Weekly Streaks</div>
          </div>

          <div className="bg-card text-card-foreground rounded-2xl p-3 border border-border/80 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span className="text-base font-bold text-foreground">{stats.monthlyStreaks}</span>
            </div>
            <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight truncate">Monthly Streaks</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search name, email, or school..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border/80 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs transition-colors"
          />
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* School Management Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">School Submissions</h2>
            {pendingSchools.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                {pendingSchools.length} Pending
              </span>
            )}
          </div>

          {loadingSchools ? (
            <div className="bg-card text-card-foreground rounded-2xl p-4 border border-border/80 flex items-center gap-3 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading submissions...</span>
            </div>
          ) : pendingSchools.length === 0 ? (
            <div className="bg-card rounded-2xl p-5 border border-dashed border-border/80 text-center">
              <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No pending school submissions.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSchools.map((s) => (
                <div key={s.slug} className="bg-card text-card-foreground rounded-2xl p-4 border border-amber-500/20 flex items-center gap-4 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <School className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Submitted by: {s.submittedBy || "Unknown"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={async () => {
                        setProcessingSchool(s.slug)
                        try {
                          await approveSchool(s.slug)
                          toast.success(`"${s.name}" approved!`)
                          loadSchools()
                        } catch (err) {
                          toast.error("Failed to approve school")
                        } finally {
                          setProcessingSchool(null)
                        }
                      }}
                      disabled={processingSchool === s.slug}
                      className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      title="Approve"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Reject "${s.name}"? This will delete the submission.`)) return
                        setProcessingSchool(s.slug)
                        try {
                          await rejectSchool(s.slug)
                          toast.success(`"${s.name}" rejected`)
                          loadSchools()
                        } catch (err) {
                          toast.error("Failed to reject school")
                        } finally {
                          setProcessingSchool(null)
                        }
                      }}
                      disabled={processingSchool === s.slug}
                      className="p-2 rounded-xl bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      title="Reject"
                    >
                      <XCircle className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Safety Reports & Blocked Chats Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Safety & Block Reports</h2>
            {safetyReports.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider animate-pulse">
                {safetyReports.length} Report{safetyReports.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          
          {loadingReports ? (
            <div className="bg-card text-card-foreground rounded-2xl p-4 border border-border/80 flex items-center gap-3 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading safety reports...</span>
            </div>
          ) : safetyReports.length === 0 ? (
            <div className="bg-card rounded-2xl p-5 border border-dashed border-border/80 text-center">
              <ShieldCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active safety reports. All quiet!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {safetyReports.map((report) => (
                <div key={report.id} className="bg-card text-card-foreground rounded-2xl p-4 border border-red-500/20 flex flex-col gap-3 shadow-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-red-600 dark:text-red-400">{report.blockerName}</span>
                        <span className="text-xs text-muted-foreground">blocked</span>
                        <span className="text-xs font-bold text-foreground">{report.blockeeName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Reported: {report.reportedAt ? new Date(report.reportedAt.toDate()).toLocaleString() : "Just now"}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUnblock(report.chatId, report.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 transition-all active:scale-95 cursor-pointer"
                        title="Unblock DM Chat"
                      >
                        Unblock
                      </button>
                      <button
                        onClick={() => handleDismissReport(report.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-muted border border-border/80 hover:bg-muted/80 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer"
                        title="Dismiss Report"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  
                  {report.reason && (
                    <div className="bg-destructive/5 border border-destructive/15 rounded-xl p-3">
                      <span className="text-[9px] font-black text-destructive uppercase tracking-widest block mb-1">Reason Given:</span>
                      <p className="text-xs text-foreground/90 italic leading-relaxed">
                        "{report.reason}"
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Student List */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Registered Students</h2>
          
          {loading ? (
             <div className="space-y-3">
               {[1,2,3].map(i => <div key={i} className="h-24 bg-card rounded-2xl border border-border/80 animate-pulse" />)}
             </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-3xl border border-dashed border-border/80">
              <p className="text-muted-foreground text-sm">No students found matching your search.</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div key={student.uid} className="bg-card text-card-foreground rounded-3xl p-5 border border-border/80 shadow-xs relative group transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-4">
                  <div className="relative shrink-0 w-fit">
                    <div className="w-14 h-14 rounded-2xl bg-muted border border-border/60 flex items-center justify-center overflow-hidden">
                      {student.photoURL ? (
                        <img src={student.photoURL} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-xl font-black text-primary">
                          {(student.displayName || "S").charAt(0)}
                        </span>
                      )}
                    </div>
                    {student.lastSeen && (Date.now() - student.lastSeen.toMillis()) < 300000 && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-card" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <h3 className="font-bold text-foreground truncate text-sm">{student.displayName || "Unknown Student"}</h3>
                      <div className="px-2 py-0.5 bg-primary/10 rounded-md border border-primary/20">
                        <span className="text-[8px] font-black text-primary uppercase tracking-tight whitespace-nowrap">
                          {student.school || "Unconfirmed"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate font-medium">{student.email}</p>
                  </div>

                  {/* Joined Date Badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/60 text-muted-foreground shrink-0 self-start sm:self-center sm:ml-auto">
                    <Calendar className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                    <span className="text-[11px] font-semibold tracking-tight">
                      {formatJoinedDate(student.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5 p-3 rounded-2xl bg-muted/50 border border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">{student.totalCorrect}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Score</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">{student.accuracy}%</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Accuracy</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <div className="flex-1 relative" ref={openMailMenu === student.uid ? mailMenuRef : undefined}>
                    <button
                      onClick={() => setOpenMailMenu(openMailMenu === student.uid ? null : student.uid)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/60 border border-border/60 hover:bg-muted text-foreground transition-colors font-bold text-xs uppercase tracking-wider cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Mail Student</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${openMailMenu === student.uid ? 'rotate-180' : ''}`} />
                    </button>

                    {openMailMenu === student.uid && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl bg-popover text-popover-foreground border border-border shadow-2xl shadow-black/10 dark:shadow-black/60 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {MESSAGE_OPTIONS.map((option) => (
                          <a
                            key={option.type}
                            href={getMailtoLink(option.type, student)}
                            onClick={() => setOpenMailMenu(null)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/80 transition-colors border-b border-border/40 last:border-b-0 cursor-pointer"
                          >
                            <div className={`w-8 h-8 rounded-lg ${option.bgColor} border ${option.borderColor} flex items-center justify-center shrink-0`}>
                              <Mail className={`w-4 h-4 ${option.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs font-bold uppercase tracking-wider ${option.color}`}>{option.label}</div>
                              <div className="text-[11px] text-muted-foreground truncate font-medium mt-0.5">{option.description}</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {student.isBanned ? (
                    <button 
                      onClick={() => handleUnban(student)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 text-emerald-foreground hover:bg-emerald-500/90 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Unban User"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="text-[8px] font-black uppercase tracking-wider">Unban</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleBan(student)}
                      className="px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all cursor-pointer"
                      title="Ban User"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={handleScrollToTop}
          className="fixed bottom-24 sm:bottom-8 right-6 sm:right-8 z-50 p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer animate-in fade-in zoom-in-75"
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}
    </div>
  )
}
