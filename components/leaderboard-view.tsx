"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, TrendingUp, Crown, Play, X, Download, Loader2 } from "lucide-react"
import { fetchLeaderboard, subscribeToUserStats, type LeaderboardEntry, type UserStats } from "@/lib/user-stats"
import { type User as FirebaseUser } from "firebase/auth"
import { ADMIN_EMAIL } from "@/lib/constants"

interface LeaderboardViewProps {
  currentUser: FirebaseUser | null
  onBack: () => void
  onPractice?: () => void
  onUserClick?: (uid: string) => void
}

/**
 * Helper to determine if a user belongs to Class A, Class B, or Class C.
 * Class A: Joined on or before May 15, 2026.
 * Class B: Joined May 16, 2026 through October 19, 2026.
 * Class C: Joined on or after October 20, 2026.
 */
function getUserClass(createdAt: any): "classA" | "classB" | "classC" {
  if (!createdAt) return "classA" // Default older accounts with missing timestamp to Class A
  try {
    let ts: number
    if (createdAt.toDate && typeof createdAt.toDate === "function") {
      ts = createdAt.toDate().getTime()
    } else if (createdAt.seconds) {
      ts = createdAt.seconds * 1000
    } else if (typeof createdAt === "number" || typeof createdAt === "string") {
      ts = new Date(createdAt).getTime()
    } else {
      return "classA"
    }

    if (isNaN(ts)) return "classA"

    const cutoffA = new Date("2026-05-15T23:59:59.999Z").getTime()
    const cutoffB = new Date("2026-10-19T23:59:59.999Z").getTime()
    if (ts <= cutoffA) return "classA"
    if (ts <= cutoffB) return "classB"
    return "classC"
  } catch (e) {
    return "classA"
  }
}

function getShortName(name?: string | null): string {
  const cleaned = (name || "Scholar").trim()
  if (!cleaned) return "Scholar"
  const parts = cleaned.split(/\s+/)
  return parts[0]
}

function getInitial(name?: string | null): string {
  const cleaned = (name || "S").trim()
  return (cleaned[0] || "S").toUpperCase()
}

const DUMMY_SCHOLARS: LeaderboardEntry[] = [
  { uid: "dummy-1", displayName: "Chidinma Okafor", totalCorrect: 312, accuracy: 96, quizzesTaken: 8, isOnline: false, createdAt: "2026-04-10" },
  { uid: "dummy-2", displayName: "Emeka Nwankwo", totalCorrect: 287, accuracy: 93, quizzesTaken: 7, isOnline: false, createdAt: "2026-05-01" },
  { uid: "dummy-3", displayName: "Aisha Bello", totalCorrect: 265, accuracy: 91, quizzesTaken: 6, isOnline: false, createdAt: "2026-05-12" },
  { uid: "dummy-4", displayName: "Tunde Adeyemi", totalCorrect: 241, accuracy: 89, quizzesTaken: 6, isOnline: false, createdAt: "2026-05-18" },
  { uid: "dummy-5", displayName: "Ngozi Eze", totalCorrect: 198, accuracy: 87, quizzesTaken: 5, isOnline: false, createdAt: "2026-05-20" },
  { uid: "dummy-6", displayName: "Ibrahim Musa", totalCorrect: 176, accuracy: 85, quizzesTaken: 5, isOnline: false, createdAt: "2026-06-01" },
  { uid: "dummy-7", displayName: "Blessing Adeola", totalCorrect: 154, accuracy: 82, quizzesTaken: 4, isOnline: false, createdAt: "2026-04-20" },
  { uid: "dummy-8", displayName: "Chukwuma Igwe", totalCorrect: 132, accuracy: 80, quizzesTaken: 4, isOnline: false, createdAt: "2026-05-14" },
  { uid: "dummy-9", displayName: "Fatima Abdullahi", totalCorrect: 110, accuracy: 78, quizzesTaken: 3, isOnline: false, createdAt: "2026-06-15" },
  { uid: "dummy-10", displayName: "Oluwaseun Bakare", totalCorrect: 88, accuracy: 75, quizzesTaken: 3, isOnline: false, createdAt: "2026-07-01" },
]

export function LeaderboardView({
  currentUser,
  onBack,
  onPractice,
  onUserClick,
}: LeaderboardViewProps) {
  const [allLeaders, setAllLeaders] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [myStats, setMyStats] = useState<UserStats | null>(null)
  const [showFlexModal, setShowFlexModal] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState<"whatsapp" | "download" | null>(null)
  const shareCardRef = useRef<HTMLDivElement | null>(null)
  const isAdmin = currentUser?.email === ADMIN_EMAIL

  // Track the logged in user's class assignment
  const [userClass, setUserClass] = useState<"classA" | "classB" | "classC">("classA")
  // Active selected class tab
  const [activeClass, setActiveClass] = useState<"classA" | "classB" | "classC">("classA")

  // Independent scroll position tracking for Class A, Class B, and Class C
  const scrollRefA = useRef<number>(0)
  const scrollRefB = useRef<number>(0)
  const scrollRefC = useRef<number>(0)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const handleTabSwitch = (targetClass: "classA" | "classB" | "classC") => {
    if (targetClass === activeClass) return

    const scrollContainer = rootRef.current?.closest(".overflow-y-auto") || rootRef.current
    if (scrollContainer) {
      if (activeClass === "classA") {
        scrollRefA.current = scrollContainer.scrollTop
      } else if (activeClass === "classB") {
        scrollRefB.current = scrollContainer.scrollTop
      } else {
        scrollRefC.current = scrollContainer.scrollTop
      }
    }

    setActiveClass(targetClass)

    requestAnimationFrame(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop =
          targetClass === "classA"
            ? scrollRefA.current
            : targetClass === "classB"
              ? scrollRefB.current
              : scrollRefC.current
      }
    })
  }

  useEffect(() => {
    async function loadData() {
      try {
        const realData = await fetchLeaderboard(1000)

        // Merge real users with dummy scholars
        const realUids = new Set(realData.map((u) => u.uid))
        const dummyToAdd = DUMMY_SCHOLARS.filter((d) => !realUids.has(d.uid))
        const merged = [...realData, ...dummyToAdd]

        setAllLeaders(merged)

        // Find current user entry or fallback to Class A
        const myEntry = merged.find((u) => u.uid === currentUser?.uid)
        const myClass = myEntry ? getUserClass(myEntry.createdAt) : "classA"
        setUserClass(myClass)
        setActiveClass(myClass)
      } catch (err) {
        console.error("Failed to fetch leaderboard.", err)
        setAllLeaders(DUMMY_SCHOLARS)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [currentUser?.uid])

  useEffect(() => {
    if (!currentUser?.uid) return
    const unsub = subscribeToUserStats(currentUser.uid, (stats) => {
      setMyStats(stats)
    })
    return () => unsub()
  }, [currentUser?.uid])

  // Filter & sort for Class A, Class B, and Class C
  const classALeaders = allLeaders
    .filter((u) => getUserClass(u.createdAt) === "classA")
    .sort((a, b) => b.totalCorrect - a.totalCorrect)

  const classBLeaders = allLeaders
    .filter((u) => getUserClass(u.createdAt) === "classB")
    .sort((a, b) => b.totalCorrect - a.totalCorrect)

  const classCLeaders = allLeaders
    .filter((u) => getUserClass(u.createdAt) === "classC")
    .sort((a, b) => b.totalCorrect - a.totalCorrect)

  const displayedLeaders =
    activeClass === "classA"
      ? classALeaders
      : activeClass === "classB"
        ? classBLeaders
        : classCLeaders
  const topThree = displayedLeaders.slice(0, 3)
  const restLeaders = displayedLeaders.slice(3)

  // Current user's own rank & score in their assigned class
  const myClassList =
    userClass === "classA"
      ? classALeaders
      : userClass === "classB"
        ? classBLeaders
        : classCLeaders
  const myIndexInClass = currentUser
    ? myClassList.findIndex((u) => u.uid === currentUser.uid)
    : -1
  const myEntry = myIndexInClass >= 0 ? myClassList[myIndexInClass] : null
  const myRank = myIndexInClass >= 0 ? myIndexInClass + 1 : myClassList.length + 1
  const myScore = Math.max(myEntry?.totalCorrect ?? 0, myStats?.totalCorrect ?? 0)
  const myPhoto = myEntry?.photoURL || myStats?.photoURL || currentUser?.photoURL || null
  const myDisplayName =
    myEntry?.displayName ||
    myStats?.displayName ||
    currentUser?.displayName ||
    "Scholar"
  const myCategory = myEntry?.category || myStats?.category || "JSS"
  const mySchool = (myEntry?.school || myStats?.school || "").trim()
  const isMyAccountAdmin =
    isAdmin || myEntry?.email === ADMIN_EMAIL || myStats?.email === ADMIN_EMAIL
  const myCategoryAndSchool = isMyAccountAdmin
    ? "Admin"
    : mySchool
      ? `${myCategory}, ${mySchool}`
      : `${myCategory} Scholar`

  const generateShareCardBlob = async (): Promise<Blob | null> => {
    if (!shareCardRef.current) return null
    if (typeof document !== "undefined" && document.fonts?.ready) {
      await document.fonts.ready
    }

    const html2canvasModule = await import("html2canvas-pro")
    const html2canvas = html2canvasModule.default

    const canvas = await html2canvas(shareCardRef.current, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#00565b",
    })

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 1.0)
    })
  }

  const triggerBlobDownload = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const safeName = myDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "scholar"
    link.download = `studyos-flex-score-${safeName}-${myScore}.png`
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const handleDownloadImage = async () => {
    if (isGeneratingImage) return
    setIsGeneratingImage("download")
    try {
      const blob = await generateShareCardBlob()
      if (blob) {
        triggerBlobDownload(blob)
      }
    } catch (err) {
      console.error("Failed to generate Flex Score image:", err)
    } finally {
      setIsGeneratingImage(null)
    }
  }

  const handleShareToWhatsApp = async () => {
    if (isGeneratingImage) return
    setIsGeneratingImage("whatsapp")
    try {
      const blob = await generateShareCardBlob()
      if (!blob) return

      const safeName = myDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "scholar"
      const imageFile = new File([blob], `studyos-flex-score-${safeName}.png`, {
        type: "image/png",
      })
      const shareText = `I scored ${myScore} on StudyOS! Can you beat my score? https://studyos1.online`

      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [imageFile] })
      ) {
        try {
          await navigator.share({
            title: "My StudyOS Flex Score",
            text: shareText,
            files: [imageFile],
          })
          return
        } catch (shareErr: any) {
          if (shareErr?.name === "AbortError") {
            return
          }
          // Fallback to download if share fails
          triggerBlobDownload(blob)
        }
      } else {
        // Fallback: download the generated PNG image file
        triggerBlobDownload(blob)
      }
    } catch (err) {
      console.error("Failed to share Flex Score image:", err)
    } finally {
      setIsGeneratingImage(null)
    }
  }

  const renderPodiumSpot = (
    scholar: LeaderboardEntry | undefined,
    rank: 1 | 2 | 3
  ) => {
    if (!scholar) {
      return <div key={`empty-${rank}`} className="w-24 sm:w-28" />
    }

    const isFirst = rank === 1
    const ringClass =
      rank === 1
        ? "border-4 border-amber-300"
        : rank === 2
          ? "border-[3.5px] border-slate-300"
          : "border-[3.5px] border-[#e29b6b]"

    const badgeClass =
      rank === 1
        ? "bg-amber-300 text-slate-900"
        : rank === 2
          ? "bg-slate-300 text-slate-800"
          : "bg-[#d98a4e] text-white"

    const avatarSizeClass = isFirst
      ? "w-20 h-20 sm:w-24 sm:h-24"
      : "w-16 h-16 sm:w-20 sm:h-20"

    return (
      <div
        key={scholar.uid}
        onClick={() => onUserClick?.(scholar.uid)}
        className={`flex flex-col items-center text-center cursor-pointer group ${
          isFirst ? "-mt-3 sm:-mt-5" : "mt-2 sm:mt-3"
        }`}
      >
        {/* Avatar + Crown + Rank Badge */}
        <div className="relative flex flex-col items-center">
          {isFirst && (
            <Crown
              className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300 fill-amber-300 mb-1 drop-shadow-xs"
              strokeWidth={2}
            />
          )}

          <div
            className={`relative ${avatarSizeClass} rounded-full ${ringClass} bg-white/20 overflow-hidden flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200`}
          >
            {scholar.photoURL ? (
              <img
                src={scholar.photoURL}
                alt={scholar.displayName || "Scholar"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#004d40] text-white flex items-center justify-center font-extrabold text-lg sm:text-xl">
                {getInitial(scholar.displayName)}
              </div>
            )}
          </div>

          {/* Overlapping Rank Number Pill */}
          <span
            className={`-mt-3 relative z-10 w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full ${badgeClass} text-[11px] sm:text-xs font-black flex items-center justify-center shadow-xs`}
          >
            {rank}
          </span>
        </div>

        {/* Name + Category Badge */}
        <div className="mt-1.5 flex items-center justify-center gap-1 max-w-28 sm:max-w-36">
          <p
            className={`font-extrabold text-white truncate ${
              isFirst ? "text-sm sm:text-base" : "text-xs sm:text-sm"
            }`}
          >
            {getShortName(scholar.displayName)}
          </p>
          <span
            className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
              scholar.email === ADMIN_EMAIL
                ? "bg-amber-300 text-slate-900"
                : scholar.category === "SSS"
                  ? "bg-amber-300 text-slate-900"
                  : "bg-white/20 text-white"
            }`}
          >
            {scholar.email === ADMIN_EMAIL
              ? "Admin"
              : scholar.category === "SSS"
                ? "SSS"
                : "JSS"}
          </span>
        </div>

        {/* Score */}
        <p className="text-[11px] sm:text-xs text-white/90 font-medium leading-tight mt-0.5">
          <span
            className={`font-extrabold ${
              isFirst ? "text-amber-300" : "text-white"
            }`}
          >
            {scholar.totalCorrect}
          </span>{" "}
          score
        </p>

        {/* Accuracy Pill */}
        <div className="mt-1.5 px-3 py-0.5 rounded-full bg-black/20 text-white text-[11px] sm:text-xs font-bold">
          {scholar.accuracy}%
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="flex flex-col min-h-full bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground select-none"
    >
      {/* ── 1. Sticky Top Bar: Title + Class A/B Segmented Switcher ── */}
      <div className="sticky top-0 z-40 bg-primary text-white">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-3">
          {/* Header Title Row */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 text-white active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>

            <div className="text-center">
              <h1 className="text-base sm:text-lg font-extrabold text-white flex items-center justify-center gap-2 tracking-tight">
                National Ranking
              </h1>
              <p className="text-[11px] sm:text-xs text-white/85 font-medium mt-0.5">
                {activeClass === "classA"
                  ? "Phase A • Early Scholars"
                  : activeClass === "classB"
                    ? "Phase B • Rising Scholars"
                    : "Phase C • New Scholars"}
              </p>
            </div>

            <div className="w-9 sm:w-10" />
          </div>

          {/* Class A / Class B / Class C Pill Selector */}
          <div className="max-w-md mx-auto w-full mt-3.5">
            <div className="p-1 rounded-full bg-black/20 flex items-center">
              <button
                type="button"
                onClick={() => handleTabSwitch("classA")}
                className={`flex-1 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  activeClass === "classA"
                    ? "bg-white text-primary shadow-xs"
                    : "text-white/85 hover:text-white"
                }`}
              >
                Class A
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch("classB")}
                className={`flex-1 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  activeClass === "classB"
                    ? "bg-white text-primary shadow-xs"
                    : "text-white/85 hover:text-white"
                }`}
              >
                Class B
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch("classC")}
                className={`flex-1 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  activeClass === "classC"
                    ? "bg-white text-primary shadow-xs"
                    : "text-white/85 hover:text-white"
                }`}
              >
                Class C
              </button>
            </div>

            {isAdmin && (
              <p className="text-[10px] text-white/75 text-center mt-1.5 font-medium">
                Your class:{" "}
                <span className="font-bold text-white">
                  {userClass === "classA"
                    ? "Class A"
                    : userClass === "classB"
                      ? "Class B"
                      : "Class C"}
                </span>{" "}
                • Admin view
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Scrolling Teal Top-3 Podium Hero ── */}
      <div className="bg-primary text-white rounded-b-[2.5rem] sm:rounded-b-[3rem] pb-7 sm:pb-9 pt-3 sm:pt-5 px-4 shadow-xs">
        <div className="max-w-xl mx-auto w-full">
          {loading ? (
            <div className="grid grid-cols-3 items-end gap-4 justify-items-center py-4">
              <div className="w-16 h-24 rounded-2xl bg-white/15 animate-pulse" />
              <div className="w-20 h-28 rounded-2xl bg-white/20 animate-pulse" />
              <div className="w-16 h-24 rounded-2xl bg-white/15 animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-3 items-end gap-2 sm:gap-6 justify-items-center">
              {/* #2 Left */}
              {renderPodiumSpot(topThree[1], 2)}
              {/* #1 Center (Elevated) */}
              {renderPodiumSpot(topThree[0], 1)}
              {/* #3 Right */}
              {renderPodiumSpot(topThree[2], 3)}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Ranks #4+ Card List (Responsive for Monitor, Laptop, Tablet & Mobile) ── */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5 pb-6 flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-18 rounded-2xl bg-white dark:bg-card border border-slate-200/60 dark:border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : displayedLeaders.length === 0 ? (
          <div className="text-center py-12 rounded-3xl bg-white dark:bg-card border border-dashed border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-muted-foreground text-sm">
              No scholars registered in{" "}
              {activeClass === "classA"
                ? "Class A"
                : activeClass === "classB"
                  ? "Class B"
                  : "Class C"}{" "}
              yet.
            </p>
          </div>
        ) : (
          restLeaders.map((scholar, idx) => {
            const rank = idx + 4
            const isCurrentUser = scholar.uid === currentUser?.uid

            return (
              <div
                key={scholar.uid}
                onClick={() => onUserClick?.(scholar.uid)}
                className={`flex items-center px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl cursor-pointer transition-all duration-200 ${
                  isCurrentUser
                    ? "bg-primary/8 dark:bg-primary/15 border border-primary/35 shadow-xs"
                    : "bg-white dark:bg-card border border-slate-200/70 dark:border-white/10 hover:border-primary/30 shadow-[0_2px_10px_rgba(0,0,0,0.025)]"
                }`}
              >
                {/* Rank Number (4, 5, 6...) */}
                <div className="w-7 sm:w-8 flex items-center justify-start shrink-0">
                  <span className="text-sm sm:text-base font-bold text-slate-400 dark:text-muted-foreground">
                    {rank}
                  </span>
                </div>

                {/* Avatar with Online Dot */}
                <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full shrink-0 mr-3.5">
                  {scholar.photoURL ? (
                    <img
                      src={scholar.photoURL}
                      alt={scholar.displayName || "Scholar"}
                      className="w-full h-full rounded-full object-cover border border-slate-200/80 dark:border-white/10"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#004d40] text-white flex items-center justify-center font-bold text-sm">
                      {getInitial(scholar.displayName)}
                    </div>
                  )}
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-card ${
                      scholar.isOnline
                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-zinc-400 dark:bg-zinc-600"
                    }`}
                  />
                </div>

                {/* Scholar Name & Accuracy */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-slate-900 dark:text-foreground text-xs sm:text-sm truncate">
                      {scholar.displayName || "Anonymous Scholar"}
                    </p>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                        scholar.email === ADMIN_EMAIL
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                          : scholar.category === "SSS"
                            ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25"
                            : "bg-primary/12 text-primary border border-primary/20"
                      }`}
                    >
                      {scholar.email === ADMIN_EMAIL
                        ? "Admin"
                        : scholar.category === "SSS"
                          ? "SSS"
                          : "JSS"}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[9px] font-extrabold uppercase bg-primary text-primary-foreground px-1.5 py-0.5 rounded shrink-0">
                        You
                      </span>
                    )}
                    {scholar.isPro && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/25 shrink-0">
                        <Crown className="w-2.5 h-2.5" />
                        PRO
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-muted-foreground mt-0.5 flex items-center gap-1.5 font-medium">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {scholar.accuracy}% Accuracy
                  </p>
                </div>

                {/* Score */}
                <div className="text-right ml-3 shrink-0">
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-foreground leading-tight">
                    {scholar.totalCorrect}
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-muted-foreground uppercase tracking-wider mt-0.5">
                    SCORE
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── 4. Pinned Bottom 'You / CURRENT' + Practice CTA Bar ── */}
      <div className="sticky bottom-0 z-40 mt-auto bg-white/95 dark:bg-card/95 backdrop-blur-md border-t border-slate-200/80 dark:border-white/10 shadow-[0_-6px_24px_rgba(0,0,0,0.06)]">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-3">
          {/* Left: Rank Pill + Avatar + You [CURRENT] + Score */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <span className="px-2.5 py-1.5 rounded-lg bg-primary/12 text-primary text-xs sm:text-sm font-extrabold shrink-0">
              #{myRank}
            </span>

            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full shrink-0">
              {myPhoto ? (
                <img
                  src={myPhoto}
                  alt={myDisplayName}
                  className="w-full h-full rounded-full object-cover border border-slate-200 dark:border-white/10"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#004d40] text-white flex items-center justify-center font-bold text-sm">
                  {getInitial(myDisplayName)}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-card ${
                  (myEntry?.isOnline ?? true)
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : "bg-zinc-400 dark:bg-zinc-600"
                }`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-foreground">
                  You
                </span>
                <button
                  type="button"
                  onClick={() => setShowFlexModal(true)}
                  className="px-2 py-0.5 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  FLEX SCORE
                </button>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-400 dark:text-muted-foreground leading-tight mt-0.5">
                <span className="text-sm sm:text-base font-black text-primary mr-1">
                  {myScore}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  SCORE
                </span>
              </p>
            </div>
          </div>

          {/* Right: Practice Button (Typography Primary Color -> Directs to Dashboard) */}
          <button
            type="button"
            onClick={() => {
              if (onPractice) {
                onPractice()
              } else {
                onBack()
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 px-5 sm:px-6 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Practice</span>
          </button>
        </div>
      </div>

      {/* ── 5. Flex Score Share Card Modal ── */}
      {showFlexModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowFlexModal(false)}
        >
          <div
            className="relative w-full max-w-85 sm:max-w-90 rounded-[1.75rem] bg-white overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button (excluded from html2canvas image capture) */}
            <button
              type="button"
              onClick={() => setShowFlexModal(false)}
              aria-label="Close Share Modal"
              className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Preview Share Card (captured via html2canvas) */}
            <div
              ref={shareCardRef}
              className="relative px-6 pt-7 pb-6 flex flex-col items-center text-center overflow-hidden"
              style={{
                background:
                  "radial-gradient(circle at 50% 24%, rgba(255,255,255,0.18) 0%, transparent 62%), linear-gradient(180deg, #00c4c9 0%, #008b94 55%, #005459 100%)",
              }}
            >
              {/* Top Center Logo */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-md mb-3.5 p-2"
                style={{ backgroundColor: "#ffffff" }}
              >
                <img
                  src="/icon-192-removebg-preview.png"
                  alt="StudyOS Logo"
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Student Full Name */}
              <h2
                className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug max-w-full wrap-break-word"
                style={{ color: "#ffffff" }}
              >
                {myDisplayName}
              </h2>

              {/* Category & School */}
              <p
                className="text-xs sm:text-sm font-medium mt-0.5 max-w-full wrap-break-word"
                style={{ color: "rgba(255,255,255,0.92)" }}
              >
                {myCategoryAndSchool}
              </p>

              {/* Current Score Label */}
              <p
                className="mt-5 text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.14em]"
                style={{ color: "#ffffff" }}
              >
                CURRENT SCORE
              </p>

              {/* Massive Score using Google Font 'Paytone One' */}
              <div
                className="font-paytone text-6xl sm:text-7xl leading-none tracking-wide my-2 select-none"
                style={{
                  fontFamily: "var(--font-paytone), 'Paytone One', sans-serif",
                  color: "#ffe600",
                  WebkitTextStroke: "2.5px #1a1a1a",
                  textShadow:
                    "0 4px 0 #1a1a1a, 0 8px 20px rgba(0, 0, 0, 0.28)",
                }}
              >
                {myScore}
              </div>

              {/* Website Link Text (studyos1.online) */}
              <p
                className="mt-5 mb-3 text-xs sm:text-sm font-bold tracking-wider"
                style={{ color: "rgba(255,255,255,0.95)" }}
              >
                studyos1.online
              </p>

              {/* Bottom Challenge Banner using Google Font 'Paytone One' */}
              <div
                className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: "rgba(0, 38, 41, 0.35)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                }}
              >
                <span
                  className="font-paytone text-xs sm:text-sm tracking-wider uppercase leading-none"
                  style={{
                    fontFamily: "var(--font-paytone), 'Paytone One', sans-serif",
                    color: "#ffffff",
                  }}
                >
                  WHO CAN BEAT MY SCORE?
                </span>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="p-4 bg-white flex flex-col gap-2.5">
              {/* Share to WhatsApp (Green) */}
              <button
                type="button"
                disabled={isGeneratingImage !== null}
                onClick={handleShareToWhatsApp}
                className="w-full py-3 px-4 rounded-xl bg-[#2ecc71] hover:bg-[#27ae60] disabled:opacity-60 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                {isGeneratingImage === "whatsapp" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 shrink-0"
                  >
                    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
                  </svg>
                )}
                <span>Share to WhatsApp</span>
              </button>

              {/* Download Image (Teal) */}
              <button
                type="button"
                disabled={isGeneratingImage !== null}
                onClick={handleDownloadImage}
                className="w-full py-3 px-4 rounded-xl bg-[#008989] hover:bg-[#007070] disabled:opacity-60 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                {isGeneratingImage === "download" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 shrink-0" />
                )}
                <span>Download Image</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
