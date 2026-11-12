"use client"

import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import {
  Home,
  Crown,
  User,
  ShieldCheck,
  MessageCircle,
  TrendingUp,
  Sun,
  Moon,
  LogOut,
  RotateCw,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"
import { useTheme } from "next-themes"
import { subscribeToUnreadCount } from "@/lib/chat"
import { AuthView } from "@/components/auth-view"
import { DashboardView } from "@/components/dashboard-view"
import { UnstableNetworkScreen } from "@/components/unstable-network-screen"
import { QuotaExceededScreen } from "@/components/quota-exceeded-screen"
import { subscribeQuotaExceeded, resetQuotaExceededState } from "@/lib/quota"
import { readCache } from "@/lib/cache"
import { createOrGetChatSession } from "@/lib/dm"
import { ADMIN_EMAIL } from "@/lib/constants"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth"
import { useUserStats } from "@/hooks/use-user-stats"
import { useNetworkStatus } from "@/hooks/use-network-status"
import { recordQuizResult, updateUserPresence, ensureUserStats } from "@/lib/user-stats"
import {
  getSSSSubjectByKey,
  type SSSExamType,
  type SSSPaperType,
  type SSSSubjectKey,
} from "@/lib/sss-config"
import type { Question } from "@/lib/question-types"
import { type Survey } from "@/lib/surveys"
import { useNotifications } from "@/hooks/use-notifications"

const ProView = dynamic(() => import("@/components/pro-view").then((m) => m.ProView))
const ProfileView = dynamic(() => import("@/components/profile-view").then((m) => m.ProfileView))
const SSSSubjectPicker = dynamic(() => import("@/components/sss-subject-picker").then((m) => m.SSSSubjectPicker))
const SSSExamPicker = dynamic(() => import("@/components/sss-exam-picker").then((m) => m.SSSExamPicker))
const SSSSolidQuiz = dynamic(() => import("@/components/sss-solid-quiz").then((m) => m.SSSSolidQuiz))
const QuizResult = dynamic(() => import("@/components/quiz-result").then((m) => m.QuizResult))
const LegalView = dynamic(() => import("@/components/legal-view").then((m) => m.LegalView))
const LeaderboardView = dynamic(() => import("@/components/leaderboard-view").then((m) => m.LeaderboardView))
const QuestionCountPicker = dynamic(() => import("@/components/question-count-picker").then((m) => m.QuestionCountPicker))
const AchievementModal = dynamic(() => import("@/components/achievement-modal").then((m) => m.AchievementModal))
const HistoryView = dynamic(() => import("@/components/history-view").then((m) => m.HistoryView))
const ReviewQuizView = dynamic(() => import("@/components/review-quiz-view").then((m) => m.ReviewQuizView))
const TimeLimitPicker = dynamic(() => import("@/components/time-limit-picker").then((m) => m.TimeLimitPicker))
const SchoolSelectionView = dynamic(() => import("@/components/school-selection-view").then((m) => m.SchoolSelectionView))
const AdminDashboard = dynamic(() => import("@/components/admin-dashboard").then((m) => m.AdminDashboard))
const BannedView = dynamic(() => import("@/components/banned-view").then((m) => m.BannedView))
const ChatHub = dynamic(() => import("@/components/chat-hub").then((m) => m.ChatHub))
const ProfileModal = dynamic(() => import("@/components/profile-modal").then((m) => m.ProfileModal))
const GlobalChatView = dynamic(() => import("@/components/global-chat-view").then((m) => m.GlobalChatView))
const SurveysView = dynamic(() => import("@/components/surveys-view").then((m) => m.SurveysView))
const SurveyQuiz = dynamic(() => import("@/components/survey-quiz").then((m) => m.SurveyQuiz))
const NotificationPermissionDialog = dynamic(
  () => import("@/components/notification-permission-dialog").then((m) => m.NotificationPermissionDialog),
  { ssr: false }
)
const ExitConfirmDialog = dynamic(
  () => import("@/components/exit-confirm-dialog").then((m) => m.ExitConfirmDialog),
  { ssr: false }
)

type Tab = "home" | "pro" | "chat" | "rank" | "profile" | "admin"
type Screen =
  | "auth"
  | "app"
  | "solidq-subject"
  | "solidq-exam"
  | "solidq-count"
  | "solidq-time"
  | "solidq-quiz"
  | "result"
  | "legal-terms"
  | "legal-privacy"
  | "legal-cookies"
  | "leaderboard"
  | "history"
  | "review"
  | "school-selection"
  | "admin-dashboard"
  | "banned"
  | "global-chat"
  | "surveys-list"
  | "survey-quiz"

interface QuizResults {
  subject: string
  topic: string
  total: number
  correct: number
  questions: Question[]
  answers: (number | null)[]
  mode?: "training" | "exam"
}

const NAV_ITEMS: { tab: Tab; icon: typeof Home; label: string }[] = [
  { tab: "home", icon: Home, label: "Home" },
  { tab: "pro", icon: Crown, label: "Pro" },
  { tab: "chat", icon: MessageCircle, label: "Chat" },
  { tab: "rank", icon: TrendingUp, label: "Rank" },
  { tab: "profile", icon: User, label: "Profile" },
]

const SSS_QUESTION_COUNTS = [
  { count: 20, label: "Quick Objective Drill", duration: "20 mins" },
  { count: 40, label: "Standard Objective Session", duration: "40 mins" },
  { count: 60, label: "Full Objective CBT Simulation", duration: "60 mins" },
]

export default function StudyOSSSSPage() {
  const [screen, setScreen] = useState<Screen>("app")
  const [authInitialMode, setAuthInitialMode] = useState<"signin" | "signup">("signin")
  const [activeTab, setActiveTab] = useState<Tab>("home")
  const [authChecked, setAuthChecked] = useState(false)
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const { stats, loading: statsLoading, refetch: refetchStats } = useUserStats(user)
  const { isNetworkUnstable, recheckConnection } = useNetworkStatus()

  const [mounted, setMounted] = useState(false)
  const [quotaBlocked, setQuotaBlocked] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
    return subscribeQuotaExceeded((exceeded) => setQuotaBlocked(exceeded))
  }, [])

  useEffect(() => {
    if (screen === "auth") {
      setTheme("light")
    }
  }, [screen, setTheme])

  // SSS Quiz flow state
  const [selectedSubject, setSelectedSubject] = useState<SSSSubjectKey>("biology")
  const [selectedExamType, setSelectedExamType] = useState<SSSExamType>("neco")
  const [selectedPaperType, setSelectedPaperType] = useState<SSSPaperType>("objective")
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(40)
  const [selectedTimeLimit, setSelectedTimeLimit] = useState<number>(40)
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null)
  const [selectedQuizResult, setSelectedQuizResult] = useState<{
    title: string
    questions: Question[]
    answers: (number | null)[]
  } | null>(null)
  const [reviewSource, setReviewSource] = useState<"history" | "result">("history")
  const [activeAchievement, setActiveAchievement] = useState<{
    title: string
    streak: number
  } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeProfileUserId, setActiveProfileUserId] = useState<string | null>(null)
  const [initialChatId, setInitialChatId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null)

  const handleNavigateToChat = useCallback((chatId?: string | null) => {
    setActiveTab("chat")
    setScreen("app")
    if (chatId) {
      setInitialChatId(chatId)
    }
  }, [])

  useNotifications({
    user,
    onNavigateToChat: handleNavigateToChat,
  })

  const handleStartMessage = async (
    otherUid: string,
    otherName: string,
    otherPhoto: string | null,
    otherEmail: string
  ) => {
    if (!user) return
    try {
      const chatSession = await createOrGetChatSession(
        user.uid,
        otherUid,
        user.displayName || "Student",
        otherName,
        user.photoURL || null,
        otherPhoto,
        user.email || "",
        otherEmail
      )
      setActiveTab("chat")
      setScreen("app")
      setInitialChatId(chatSession.id)
      setActiveProfileUserId(null)
    } catch (err) {
      console.error("Failed to start DM session:", err)
    }
  }

  useEffect(() => {
    if (!user || !stats) return
    const unsub = subscribeToUnreadCount(
      user.uid,
      stats.lastChatReadAt || null,
      (count) => setUnreadCount(count)
    )
    return () => unsub()
  }, [user, stats?.lastChatReadAt])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const isGoogleUser = currentUser.providerData.some(
          (provider) => provider.providerId === "google.com"
        )
        if (isGoogleUser && currentUser.email !== ADMIN_EMAIL) {
          await signOut(auth)
          return
        }

        setUser(currentUser)
        setScreen("app")
        setAuthChecked(true)
        if (navigator.onLine) {
          ensureUserStats(currentUser, undefined, "SSS").catch((err) => {
            console.warn("Background ensureUserStats warning:", err)
          })
        }
      } else {
        setUser(null)
        setScreen("auth")
        setAuthChecked(true)
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    updateUserPresence(user.uid)
    const interval = setInterval(() => {
      updateUserPresence(user.uid)
    }, 60000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    if (!user || !stats || statsLoading || !authChecked) return

    if (stats.isBanned) {
      if (screen !== "banned") setScreen("banned")
      return
    }

    if (!stats.school) {
      if (screen !== "school-selection" && screen !== "auth") {
        setScreen("school-selection")
      }
      return
    }

    if (stats.school && (screen === "school-selection" || (screen === "banned" && !stats.isBanned))) {
      setScreen("app")
    }
  }, [user, stats, statsLoading, authChecked, screen])

  if (quotaBlocked) {
    return (
      <QuotaExceededScreen
        hasLocalData={Boolean(
          stats || (user && readCache(`userStats_backup_${user.uid}`, "local"))
        )}
        onRetry={async () => {
          resetQuotaExceededState()
          await refetchStats()
        }}
        onContinueOffline={() => {
          setQuotaBlocked(false)
          setScreen("app")
        }}
      />
    )
  }

  if (isNetworkUnstable && !authChecked) {
    return <UnstableNetworkScreen onRetry={recheckConnection} />
  }

  const isAdmin = user?.email === ADMIN_EMAIL
  const currentNavItems = isAdmin
    ? [...NAV_ITEMS, { tab: "admin" as Tab, icon: ShieldCheck, label: "Admin" }]
    : NAV_ITEMS

  const handleLogout = async () => {
    await signOut(auth)
    setScreen("auth")
  }

  const goHome = () => {
    setScreen("app")
    setActiveTab("home")
  }

  const handleQuizFinish = async (results: QuizResults) => {
    setQuizResults(results)
    setScreen("result")
    if (user) {
      try {
        const formattedQuestions = results.questions.map((q) => ({
          id: q.id,
          subject: q.subject,
          correct: q.correctIndex,
        }))
        const result = await recordQuizResult(
          user.uid,
          formattedQuestions,
          results.answers,
          0,
          results.mode === "training"
        )
        if (result) setActiveAchievement(result)
        await refetchStats()
      } catch (e) {
        console.error("Failed to record SSS quiz result:", e)
      }
    }
  }

  const showSidebar =
    user && screen !== "auth" && screen !== "school-selection" && screen !== "banned"

  return (
    <div
      className={`${
        screen === "auth" ? "bg-white" : "mesh-bg"
      } h-dvh w-full flex overflow-hidden select-text lg:select-auto`}
    >
      {/* Desktop Sidebar Nav */}
      {showSidebar && (
        <div
          className={`hidden lg:flex flex-col ${
            sidebarCollapsed ? "w-18" : "w-60"
          } h-full border-r border-border/40 bg-card/40 backdrop-blur-md shrink-0 p-3 justify-between select-none transition-all duration-300 ease-in-out overflow-hidden`}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1 pt-1">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-foreground tracking-tighter italic">
                    StudyOS
                  </h1>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all duration-200 shrink-0 ${
                  sidebarCollapsed ? "mx-auto" : ""
                }`}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="w-5 h-5" strokeWidth={2} />
                ) : (
                  <PanelLeftClose className="w-5 h-5" strokeWidth={2} />
                )}
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {currentNavItems.map(({ tab, icon: Icon, label }) => {
                const isActive = activeTab === tab && screen === "app"
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab)
                      setScreen("app")
                    }}
                    className={`flex items-center ${
                      sidebarCollapsed ? "justify-center" : "gap-3"
                    } px-3 py-2.5 rounded-xl transition-all duration-200 text-left font-semibold text-sm relative ${
                      isActive
                        ? "text-primary bg-primary/10 font-bold"
                        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                    {!sidebarCollapsed && <span className="flex-1 truncate">{label}</span>}

                    {tab === "chat" && activeTab !== "chat" && unreadCount > 0 && (
                      <span
                        className={`min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border border-background shadow-md ${
                          sidebarCollapsed
                            ? "absolute -top-1 -right-1 min-w-4 h-4 px-1 text-[8px]"
                            : ""
                        }`}
                      >
                        {unreadCount}
                      </span>
                    )}

                    {tab === "rank" && (
                      <span
                        className={`flex h-2 w-2 absolute ${
                          sidebarCollapsed ? "top-1.5 right-1.5" : "top-3.5 right-4"
                        }`}
                      >
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 border border-background shadow-md" />
                      </span>
                    )}

                    {tab === "profile" && (
                      <span
                        className={`w-2 h-2 rounded-full bg-red-500 border border-background shadow-md absolute ${
                          sidebarCollapsed ? "top-1.5 right-1.5" : "top-3.5 right-4"
                        }`}
                      />
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => window.location.reload()}
              className={`flex items-center ${
                sidebarCollapsed ? "justify-center" : "gap-3"
              } px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-all duration-200 text-left font-semibold text-sm`}
            >
              <RotateCw className="w-5 h-5 shrink-0" strokeWidth={2} />
              {!sidebarCollapsed && <span>Refresh App</span>}
            </button>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`flex items-center ${
                sidebarCollapsed ? "justify-center" : "gap-3"
              } px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-all duration-200 text-left font-semibold text-sm`}
            >
              {mounted && theme === "dark" ? (
                <>
                  <Sun className="w-5 h-5 shrink-0" strokeWidth={2} />
                  {!sidebarCollapsed && <span>Light Mode</span>}
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5 shrink-0" strokeWidth={2} />
                  {!sidebarCollapsed && <span>Dark Mode</span>}
                </>
              )}
            </button>

            <button
              onClick={handleLogout}
              className={`flex items-center ${
                sidebarCollapsed ? "justify-center" : "gap-3"
              } px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-all duration-200 text-left font-semibold text-sm`}
            >
              <LogOut className="w-5 h-5 shrink-0" strokeWidth={2} />
              {!sidebarCollapsed && <span>Log Out</span>}
            </button>
          </div>
        </div>
      )}

      <div
        className={`relative flex-1 flex flex-col h-full overflow-y-auto scrollbar-hide transition-all duration-300 ${
          showSidebar
            ? "w-full bg-background/85"
            : "w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto md:h-205 md:rounded-[2.5rem] md:my-auto bg-white border border-slate-200/80"
        }`}
      >
        {screen === "auth" && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <AuthView
              onLogin={() => {
                setScreen("app")
                setActiveTab("home")
              }}
              initialMode={authInitialMode}
              onBackToLanding={() => {
                window.location.href = "/"
              }}
              onShowLegal={(type) => {
                if (type === "terms") setScreen("legal-terms")
                else if (type === "privacy") setScreen("legal-privacy")
                else setScreen("legal-cookies")
              }}
            />
          </div>
        )}

        {screen === "school-selection" && user && (
          <SchoolSelectionView
            user={user}
            onConfirmed={() => {
              refetchStats()
              setScreen("app")
            }}
            onLogout={handleLogout}
          />
        )}

        {screen === "admin-dashboard" && user && (
          <AdminDashboard user={user} onBack={() => setScreen("app")} />
        )}

        {screen === "global-chat" && user && (
          <div className="flex-1 overflow-hidden">
            <GlobalChatView
              user={user}
              stats={stats}
              onBack={() => {
                setScreen("app")
                setActiveTab("profile")
              }}
            />
          </div>
        )}

        {screen === "banned" && <BannedView onLogout={handleLogout} />}

        {(screen === "legal-terms" ||
          screen === "legal-privacy" ||
          screen === "legal-cookies") && (
          <div className="absolute inset-0 z-60 bg-background">
            <LegalView
              type={
                screen === "legal-terms"
                  ? "terms"
                  : screen === "legal-privacy"
                    ? "privacy"
                    : "cookies"
              }
              onBack={() => setScreen(user ? "app" : "auth")}
            />
          </div>
        )}

        {screen === "leaderboard" && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <LeaderboardView
              currentUser={user}
              onBack={() => setScreen("app")}
              onPractice={goHome}
              onUserClick={(uid) => setActiveProfileUserId(uid)}
            />
          </div>
        )}

        {/* SSS Exam Practice Flow: Subject -> Exam/Paper -> Question Count -> Time Limit -> Solid Quiz */}
        {screen === "solidq-subject" && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <SSSSubjectPicker
              onSelect={(key) => {
                setSelectedSubject(key)
                setScreen("solidq-exam")
              }}
              onBack={goHome}
            />
          </div>
        )}

        {screen === "solidq-exam" && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <SSSExamPicker
              subjectKey={selectedSubject}
              mode="solidq"
              onSelect={(examType, paperType) => {
                setSelectedExamType(examType)
                setSelectedPaperType(paperType)
                setScreen("solidq-count")
              }}
              onBack={() => setScreen("solidq-subject")}
              onBackToDashboard={goHome}
            />
          </div>
        )}

        {screen === "solidq-count" && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <QuestionCountPicker
              subjectLabel={`${getSSSSubjectByKey(selectedSubject).name} (${selectedExamType.toUpperCase()} ${selectedPaperType === "theory" ? "Theory" : "OBJ"})`}
              counts={SSS_QUESTION_COUNTS}
              onSelect={(count) => {
                setSelectedQuestionCount(count)
                setScreen("solidq-time")
              }}
              onBack={() => setScreen("solidq-exam")}
            />
          </div>
        )}

        {screen === "solidq-time" && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <TimeLimitPicker
              questionCount={selectedQuestionCount}
              onSelect={(mins) => {
                setSelectedTimeLimit(mins)
                setScreen("solidq-quiz")
              }}
              onBack={() => setScreen("solidq-count")}
            />
          </div>
        )}

        {screen === "solidq-quiz" && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <SSSSolidQuiz
              subjectKey={selectedSubject}
              examType={selectedExamType}
              paperType={selectedPaperType}
              questionCount={selectedQuestionCount}
              timeLimit={selectedTimeLimit}
              onBack={() => setScreen("solidq-time")}
              onComplete={handleQuizFinish}
            />
          </div>
        )}

        {screen === "history" && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <HistoryView
              user={user}
              onBack={() => setScreen("app")}
              onSelectResult={() => {}}
            />
          </div>
        )}

        {screen === "surveys-list" && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <SurveysView
              stats={stats}
              onBack={() => setScreen("app")}
              onPlaySurvey={(survey) => {
                setActiveSurvey(survey)
                setScreen("survey-quiz")
              }}
            />
          </div>
        )}

        {screen === "survey-quiz" && activeSurvey && user && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <SurveyQuiz
              survey={activeSurvey}
              userId={user.uid}
              onBack={() => setScreen("surveys-list")}
              onComplete={() => {
                refetchStats()
                setScreen("surveys-list")
              }}
            />
          </div>
        )}

        {screen === "review" && selectedQuizResult && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <ReviewQuizView
              quizTitle={selectedQuizResult.title}
              questions={selectedQuizResult.questions}
              userAnswers={selectedQuizResult.answers}
              onBack={() => setScreen(reviewSource)}
            />
          </div>
        )}

        {screen === "result" && quizResults && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <QuizResult
              subject={quizResults.subject}
              topic={quizResults.topic}
              total={quizResults.total}
              correct={quizResults.correct}
              questions={quizResults.questions}
              answers={quizResults.answers}
              onBackToDashboard={goHome}
              onReviewAnswers={() => {
                setSelectedQuizResult({
                  title: quizResults.subject,
                  questions: quizResults.questions,
                  answers: quizResults.answers,
                })
                setReviewSource("result")
                setScreen("review")
              }}
            />
          </div>
        )}

        {screen === "app" && (
          <>
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden max-w-4xl mx-auto w-full">
              {activeTab === "home" && (
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <DashboardView
                    user={user}
                    stats={stats}
                    statsLoading={statsLoading}
                    category="SSS"
                    onStartSolidQ={() => setScreen("solidq-subject")}
                    onGoToPro={() => setActiveTab("pro")}
                    onOpenChat={() => setActiveTab("chat")}
                  />
                </div>
              )}

              {activeTab === "pro" && (
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <ProView
                    user={user}
                    isPro={stats?.isPro || false}
                    onUpgradeSuccess={refetchStats}
                    category="SSS"
                  />
                </div>
              )}

              {activeTab === "chat" && user && (
                <div className="flex-1 overflow-hidden h-full flex flex-col min-h-0">
                  <ChatHub
                    user={user}
                    stats={stats}
                    onBack={() => setActiveTab("home")}
                    onViewProfile={(uid) => setActiveProfileUserId(uid)}
                    initialChatId={initialChatId}
                    onClearInitialChatId={() => setInitialChatId(null)}
                  />
                </div>
              )}

              {activeTab === "rank" && (
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <LeaderboardView
                    currentUser={user}
                    onBack={() => setActiveTab("home")}
                    onPractice={goHome}
                    onUserClick={(uid) => setActiveProfileUserId(uid)}
                  />
                </div>
              )}

              {activeTab === "profile" && (
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <ProfileView
                    user={user}
                    stats={stats}
                    statsLoading={statsLoading}
                    currentCategory="SSS"
                    onLogout={handleLogout}
                    onShowLegal={(type) => {
                      if (type === "terms") setScreen("legal-terms")
                      else if (type === "privacy") setScreen("legal-privacy")
                      else setScreen("legal-cookies")
                    }}
                    onShowLeaderboard={() => setScreen("leaderboard")}
                    onShowHistory={() => setScreen("history")}
                    onOpenChat={() => setActiveTab("chat")}
                    onShowSurveys={() => setScreen("surveys-list")}
                  />
                </div>
              )}

              {activeTab === "admin" && user && (
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <AdminDashboard user={user} onBack={() => setActiveTab("home")} />
                </div>
              )}
            </div>

            <div
              className="h-20 flex items-center justify-around px-2 shrink-0 z-50 bg-background/85 lg:hidden w-full max-w-2xl mx-auto"
              style={{
                backdropFilter: "blur(20px)",
                borderTop: "1px solid var(--glass-border)",
              }}
            >
              {currentNavItems.map(({ tab, icon: Icon, label }) => {
                const isActive = activeTab === tab
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex flex-col items-center gap-1 px-2.5 sm:px-4 py-2 rounded-xl transition-all duration-200 relative"
                  >
                    {isActive && (
                      <div className="absolute inset-0 rounded-xl bg-primary/10" />
                    )}
                    <div className="relative w-6 h-6 flex items-center justify-center">
                      {tab === "pro" ? (
                        <Icon
                          className="w-5 h-5"
                          style={{
                            color: isActive
                              ? "oklch(0.62 0.18 295)"
                              : "oklch(0.55 0.03 250)",
                          }}
                          strokeWidth={isActive ? 2.5 : 1.8}
                        />
                      ) : (
                        <Icon
                          className="w-5 h-5"
                          style={{
                            color: isActive
                              ? "oklch(0.72 0.16 192)"
                              : "oklch(0.55 0.03 250)",
                          }}
                          strokeWidth={isActive ? 2.5 : 1.8}
                        />
                      )}
                      {tab === "rank" && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 border border-background" />
                        </span>
                      )}
                      {tab === "profile" && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-background" />
                      )}
                      {tab === "chat" && activeTab !== "chat" && unreadCount > 0 && (
                        <div className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center border border-background shadow-md">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </div>
                      )}
                      {isActive && (
                        <div
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                          style={{
                            background:
                              tab === "pro"
                                ? "oklch(0.62 0.18 295)"
                                : "oklch(0.72 0.16 192)",
                          }}
                        />
                      )}
                    </div>
                    <span
                      className="text-[10px] font-semibold tracking-wide"
                      style={{
                        color: isActive
                          ? tab === "pro"
                            ? "oklch(0.62 0.18 295)"
                            : "oklch(0.72 0.16 192)"
                          : "oklch(0.45 0.02 250)",
                      }}
                    >
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <NotificationPermissionDialog userUid={user?.uid || null} />
        <ExitConfirmDialog
          onExit={() => {
            window.location.href = "/"
          }}
        />

        {activeAchievement && (
          <AchievementModal
            title={activeAchievement.title}
            streak={activeAchievement.streak}
            onClose={() => setActiveAchievement(null)}
          />
        )}

        {activeProfileUserId && user && (
          <ProfileModal
            userId={activeProfileUserId}
            currentUserId={user.uid}
            onClose={() => setActiveProfileUserId(null)}
            onStartMessage={handleStartMessage}
          />
        )}
      </div>
    </div>
  )
}
