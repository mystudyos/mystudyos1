import {
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  increment,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"
import { type User as FirebaseUser } from "firebase/auth"
import { readCache, writeCache, clearCache, clearCachePrefix } from "./cache"
import { ADMIN_EMAIL } from "./constants"
import { reportFirestoreError } from "./quota"

// ─── Firestore document shape: users/{uid} ───
export interface UserStats {
  totalQuestions: number
  totalCorrect: number
  accuracy: number            // 0–100
  currentStreak: number
  longestStreak: number
  lastQuizDate: string | null // ISO date string (YYYY-MM-DD)
  streakBrokenDate: string | null // ISO date string of last break
  topSubject: string | null
  subjectBreakdown: Record<string, { answered: number; correct: number }>
  quizzesTaken: number
  isPro: boolean
  proExpiresAt?: string | null // ISO date string when Pro expires
  achievements: string[]
  school?: string
  schoolName?: string
  category?: "JSS" | "SSS"
  email?: string
  displayName?: string
  photoURL?: string
  isBanned?: boolean
  banReason?: string
  createdAt: unknown          // serverTimestamp
  updatedAt: unknown          // serverTimestamp
  lastSeen?: any             // serverTimestamp
  lastChatReadAt?: any       // serverTimestamp — last time user opened global chat
  surveyResults?: Record<string, { score: number; total: number; completedAt: string; answers: (number | null)[] }>
  fcmToken?: string | null
  fcmTokens?: string[]
}

// ─── Sub-collection: users/{uid}/quizResults/{docId} ───
export interface QuizResult {
  score: number
  total: number
  accuracy: number
  subjects: string[]
  answeredAt: unknown        // serverTimestamp
  timeTakenSeconds: number
  details: {
    questionId: string
    subject: string
    correct: boolean
    selectedOption: number | null
    correctOption: number
  }[]
}

// ─── Default stats for new users ───
const DEFAULT_STATS: Omit<UserStats, "createdAt" | "updatedAt"> = {
  totalQuestions: 0,
  totalCorrect: 0,
  accuracy: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastQuizDate: null,
  streakBrokenDate: null,
  topSubject: null,
  subjectBreakdown: {},
  quizzesTaken: 0,
  isPro: false,
  achievements: [],
}

/**
 * Monotonically merge incoming Firestore stats with local backup stats so that
 * user counters (streaks, scores, questions, quizzesTaken, achievements) NEVER
 * decrease or reset on reconnect, reload, or partial cache reads.
 */
export function mergeProtectedStats(
  incoming: UserStats,
  backup: UserStats | null
): UserStats {
  if (!backup) {
    const resolved = incoming.schoolName || incoming.school
    return resolved ? { ...incoming, school: resolved, schoolName: resolved } : incoming
  }

  const totalQuestions = Math.max(incoming.totalQuestions || 0, backup.totalQuestions || 0)
  const totalCorrect = Math.max(incoming.totalCorrect || 0, backup.totalCorrect || 0)
  const quizzesTaken = Math.max(incoming.quizzesTaken || 0, backup.quizzesTaken || 0)
  const currentStreak = Math.max(incoming.currentStreak || 0, backup.currentStreak || 0)
  const longestStreak = Math.max(
    incoming.longestStreak || 0,
    backup.longestStreak || 0,
    currentStreak
  )

  // Merge subject breakdown monotonically per subject
  const mergedBreakdown: Record<string, { answered: number; correct: number }> = {
    ...(backup.subjectBreakdown || {}),
  }
  for (const [subj, counts] of Object.entries(incoming.subjectBreakdown || {})) {
    const prev = mergedBreakdown[subj]
    if (!prev) {
      mergedBreakdown[subj] = {
        answered: counts?.answered || 0,
        correct: counts?.correct || 0,
      }
    } else {
      mergedBreakdown[subj] = {
        answered: Math.max(prev.answered || 0, counts?.answered || 0),
        correct: Math.max(prev.correct || 0, counts?.correct || 0),
      }
    }
  }

  // Merge achievements as an append-only union
  const achievements = Array.from(
    new Set([...(backup.achievements || []), ...(incoming.achievements || [])])
  )

  // Keep the most recent lastQuizDate
  const lastQuizDate =
    incoming.lastQuizDate && backup.lastQuizDate
      ? incoming.lastQuizDate >= backup.lastQuizDate
        ? incoming.lastQuizDate
        : backup.lastQuizDate
      : incoming.lastQuizDate || backup.lastQuizDate || null

  const computedAccuracy =
    totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : Math.max(incoming.accuracy || 0, backup.accuracy || 0)

  const accuracy =
    incoming.totalQuestions >= (backup.totalQuestions || 0) && incoming.accuracy !== undefined
      ? incoming.accuracy
      : computedAccuracy

  const resolvedSchool =
    incoming.schoolName || incoming.school || backup.schoolName || backup.school

  return {
    ...backup,
    ...incoming,
    ...(resolvedSchool ? { school: resolvedSchool, schoolName: resolvedSchool } : {}),
    totalQuestions,
    totalCorrect,
    quizzesTaken,
    currentStreak,
    longestStreak,
    accuracy,
    subjectBreakdown: mergedBreakdown,
    topSubject: incoming.topSubject || backup.topSubject || computeTopSubject(mergedBreakdown),
    achievements,
    lastQuizDate,
  }
}

/**
 * Ensure a user stats document exists. Called after sign-up / first sign-in.
 * Hardened to NEVER overwrite or clear existing stats if network is unstable/offline.
 */
export async function ensureUserStats(
  user: FirebaseUser,
  school?: string,
  category?: "JSS" | "SSS"
): Promise<void> {
  if (category && typeof window !== "undefined") {
    try {
      localStorage.setItem("studyos_category", category)
    } catch {}
  }

  // Never perform DB mutation if browser reports offline
  if (typeof window !== "undefined" && !navigator.onLine) {
    console.warn("Network offline; skipping ensureUserStats to protect user stats.")
    return
  }

  const ref = doc(db, "users", user.uid)
  const isAdmin = user.email === ADMIN_EMAIL
  
  const userData: any = {
    displayName: user.displayName,
    photoURL: user.photoURL,
    email: user.email,
  }

  if (isAdmin) {
    userData.isPro = true
  }

  if (school) userData.school = school
  if (category) userData.category = category

  try {
    // Always verify against the live server before deciding whether the user doc exists.
    // If the network is weak and getDocFromServer fails, we abort immediately without writing.
    const snap = await getDocFromServer(ref)

    if (snap.exists()) {
      const data = snap.data()
      const updates: any = {
        ...userData,
        updatedAt: serverTimestamp(),
      }
      if (isAdmin && !data.isPro) {
        updates.isPro = true
      }
      if (!data.createdAt) {
        updates.createdAt = user.metadata?.creationTime ? new Date(user.metadata.creationTime) : serverTimestamp()
      }
      await updateDoc(ref, updates)
    } else {
      // Safety Check: Verify if user has a local backup cache.
      // If a local backup cache exists, never reset stats to 0.
      const cacheKeyBackup = `userStats_backup_${user.uid}`
      const hasBackup = readCache<UserStats>(cacheKeyBackup, "local")
      if (hasBackup) {
        console.warn("Local stats backup found; restoring protected stats instead of resetting.")
        await setDoc(
          ref,
          {
            ...hasBackup,
            ...userData,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
        return
      }

      await setDoc(
        ref,
        {
          ...DEFAULT_STATS,
          ...userData,
          isPro: isAdmin ? true : false,
          createdAt: user.metadata?.creationTime ? new Date(user.metadata.creationTime) : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    }
  } catch (err: any) {
    console.warn("Failed to ensure user stats (network/permission issue):", err)
    reportFirestoreError(err)
    // CRITICAL: Do NOT attempt fallback setDoc on generic errors as that will overwrite stats on reconnect!
  }
}

/**
 * Fetch the user's aggregated stats from Firestore.
 * Uses persistent local storage fallback when network is unstable or weak,
 * and never triggers destructive re-fetches or overwrites.
 */
export async function fetchUserStats(uid: string): Promise<UserStats | null> {
  const cacheKey = `userStats_${uid}`
  const cacheKeyBackup = `userStats_backup_${uid}`

  // Check persistent local storage backup cache
  const localBackup = readCache<UserStats>(cacheKeyBackup, "local")

  // Check short-term session cache first
  const cached = readCache<UserStats>(cacheKey, "session")
  if (cached) {
    return mergeProtectedStats(cached, localBackup)
  }

  // When offline, return cached backup as-is without hitting network
  if (typeof window !== "undefined" && !navigator.onLine) {
    return localBackup || null
  }

  try {
    const ref = doc(db, "users", uid)
    let snap
    try {
      snap = await getDocFromServer(ref)
    } catch {
      snap = await getDoc(ref)
    }
    if (!snap.exists()) {
      return localBackup || null
    }

    const rawData = snap.data() as UserStats
    const data = mergeProtectedStats(rawData, localBackup)
    
    // Admin is always Pro
    if (data.email === ADMIN_EMAIL) {
      data.isPro = true
    } else if (data.isPro && data.proExpiresAt) {
      // Mask expired Pro status in memory only (never mutate Firestore during a read)
      const isExpired = new Date(data.proExpiresAt).getTime() < Date.now()
      if (isExpired) {
        data.isPro = false
      }
    }
    
    // Cache user stats in session cache (5 mins) and local backup (365 days)
    writeCache<UserStats>(cacheKey, data, "session", 5 * 60 * 1000)
    writeCache<UserStats>(cacheKeyBackup, data, "local", 365 * 24 * 60 * 60 * 1000)
    return data
  } catch (err) {
    console.warn("Failed to fetch user stats from network, utilizing local backup:", err)
    reportFirestoreError(err)
    return localBackup || null
  }
}

/**
 * Record a completed quiz — updates the aggregate doc (append-only) and writes a quiz result.
 * Streaks are updated ONLY on Exam Practices (!isTraining) and NEVER deduct on missed days.
 */
export async function recordQuizResult(
  uid: string,
  questions: {
    id: string
    subject: string
    correct: number // correct option index
  }[],
  selectedOptions: (number | null)[],
  timeTakenSeconds: number,
  isTraining: boolean = false
): Promise<{ title: string; streak: number } | null> {
  // Never queue offline writes that could conflict and wipe live data on sync
  if (typeof window !== "undefined" && !navigator.onLine) {
    console.warn("Offline: skipping recordQuizResult to protect live Firestore stats.")
    return null
  }

  const score = selectedOptions.filter(
    (opt, i) => opt === questions[i].correct
  ).length
  const total = questions.length
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0

  // Build per-question details
  const details: QuizResult["details"] = questions.map((q, i) => ({
    questionId: q.id,
    subject: q.subject,
    correct: selectedOptions[i] === q.correct,
    selectedOption: selectedOptions[i],
    correctOption: q.correct,
  }))

  // Build subject delta for this quiz
  const subjectDelta: Record<string, { answered: number; correct: number }> = {}
  details.forEach((d) => {
    if (!subjectDelta[d.subject]) {
      subjectDelta[d.subject] = { answered: 0, correct: 0 }
    }
    subjectDelta[d.subject].answered += 1
    if (d.correct) subjectDelta[d.subject].correct += 1
  })

  // Unique subjects in this quiz
  const subjects = [...new Set(questions.map((q) => q.subject))]

  // Verify live server document first before mutating anything
  const userRef = doc(db, "users", uid)
  const cacheKeyBackup = `userStats_backup_${uid}`
  const localBackup = readCache<UserStats>(cacheKeyBackup, "local")

  let snap
  try {
    snap = await getDocFromServer(userRef)
  } catch (err) {
    console.warn("Weak network during recordQuizResult; aborting write to protect live stats:", err)
    reportFirestoreError(err)
    return null
  }

  // --- Append quiz result to subcollection ---
  const resultsCol = collection(db, "users", uid, "quizResults")
  await addDoc(resultsCol, {
    score,
    total,
    accuracy,
    subjects,
    answeredAt: serverTimestamp(),
    timeTakenSeconds,
    details,
    mode: isTraining ? "training" : "exam",
  } satisfies QuizResult & { mode: string })

  // Leaderboard logic: Training Mode gives 0 points to the 'totalCorrect' count
  const leaderboardIncrement = isTraining ? 0 : score

  const existing: UserStats = snap.exists()
    ? mergeProtectedStats(snap.data() as UserStats, localBackup)
    : localBackup || ({ ...DEFAULT_STATS, createdAt: null, updatedAt: null } as UserStats)

  // Merge subject breakdown (strictly additive)
  const merged: Record<string, { answered: number; correct: number }> = {
    ...(existing.subjectBreakdown || {}),
  }
  for (const [subj, delta] of Object.entries(subjectDelta)) {
    if (!merged[subj]) merged[subj] = { answered: 0, correct: 0 }
    merged[subj] = {
      answered: (merged[subj].answered || 0) + delta.answered,
      correct: (merged[subj].correct || 0) + delta.correct,
    }
  }

  const topSubject = computeTopSubject(merged)

  // Streak logic:
  // 1. Counted ONLY on everyday Exam Practices (!isTraining).
  // 2. NEVER deducts or resets to 0/1 when a user misses a day.
  const today = todayISO()
  let newStreak = existing.currentStreak || 0
  let lastQuizDate = existing.lastQuizDate || null

  if (!isTraining) {
    if (existing.lastQuizDate === today) {
      // Already practiced in Exam Mode today — keep existing streak (at least 1)
      newStreak = Math.max(existing.currentStreak || 0, 1)
    } else {
      // New calendar day of Exam Practice — strictly add +1 without ever deducting for missed days
      newStreak = (existing.currentStreak || 0) + 1
    }
    lastQuizDate = today
  }

  const longestStreak = Math.max(existing.longestStreak || 0, newStreak)

  // Achievement Check (append-only)
  let achievementUnlocked: string | null = null
  const existingAchievements = existing.achievements || []
  const newAchievements = [...existingAchievements]

  if (!isTraining) {
    if (newStreak === 7 && !newAchievements.includes("7 Day Warrior 🛡️")) {
      achievementUnlocked = "7 Day Warrior 🛡️"
      newAchievements.push(achievementUnlocked)
    }
    if (newStreak === 30 && !newAchievements.includes("Monthly Master 🎓")) {
      achievementUnlocked = "Monthly Master 🎓"
      newAchievements.push(achievementUnlocked)
    }
    if (newStreak === 100 && !newAchievements.includes("Study Legend 👑")) {
      achievementUnlocked = "Study Legend 👑"
      newAchievements.push(achievementUnlocked)
    }
  }

  // Monotonic non-decreasing totals
  const totalCorrectNew = (existing.totalCorrect || 0) + leaderboardIncrement
  const totalQuestionsNew = (existing.totalQuestions || 0) + total
  const quizzesTakenNew = (existing.quizzesTaken || 0) + 1
  const newAccuracy =
    totalQuestionsNew > 0
      ? Math.round((totalCorrectNew / totalQuestionsNew) * 100)
      : existing.accuracy || 0

  if (snap.exists()) {
    await updateDoc(userRef, {
      totalQuestions: increment(total),
      totalCorrect: increment(leaderboardIncrement),
      accuracy: newAccuracy,
      currentStreak: newStreak,
      longestStreak,
      lastQuizDate,
      topSubject,
      subjectBreakdown: merged,
      quizzesTaken: increment(1),
      achievements: newAchievements,
      updatedAt: serverTimestamp(),
    })
  } else {
    await setDoc(
      userRef,
      {
        ...existing,
        totalQuestions: totalQuestionsNew,
        totalCorrect: totalCorrectNew,
        accuracy: newAccuracy,
        currentStreak: newStreak,
        longestStreak,
        lastQuizDate,
        topSubject,
        subjectBreakdown: merged,
        quizzesTaken: quizzesTakenNew,
        achievements: newAchievements,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  }

  // Immediately persist updated stats to local backup cache so UI/reload is protected
  const updatedStatsSnapshot: UserStats = {
    ...existing,
    totalQuestions: totalQuestionsNew,
    totalCorrect: totalCorrectNew,
    accuracy: newAccuracy,
    currentStreak: newStreak,
    longestStreak,
    lastQuizDate,
    topSubject,
    subjectBreakdown: merged,
    quizzesTaken: quizzesTakenNew,
    achievements: newAchievements,
  }
  writeCache<UserStats>(cacheKeyBackup, updatedStatsSnapshot, "local", 365 * 24 * 60 * 60 * 1000)

  // Invalidate caches for this user and leaderboard so frontend sees fresh aggregates
  try {
    clearCache(`userStats_${uid}`)
    clearCachePrefix(`recentQuizResults_${uid}_`)
    clearCachePrefix("leaderboard_")
  } catch {}

  return achievementUnlocked ? { title: achievementUnlocked, streak: newStreak } : null
}

/**
 * Record a completed survey / trivia game result.
 */
export async function recordSurveyResult(
  uid: string,
  surveyId: string,
  score: number,
  total: number,
  answers: (number | null)[]
): Promise<void> {
  if (typeof window !== "undefined" && !navigator.onLine) return
  const userRef = doc(db, "users", uid)
  const today = new Date().toISOString()

  await updateDoc(userRef, {
    [`surveyResults.${surveyId}`]: {
      score,
      total,
      completedAt: today,
      answers,
    },
    updatedAt: serverTimestamp(),
  })

  // Invalidate cache
  try {
    clearCache(`userStats_${uid}`)
  } catch {}
}

/**
 * Fetch the last N quiz results for a user.
 */
export async function fetchRecentQuizResults(
  uid: string,
  count = 10
): Promise<(QuizResult & { id: string })[]> {
  const cacheKey = `recentQuizResults_${uid}_${count}`
  const cached = readCache<(QuizResult & { id: string })[]>(cacheKey, "session")
  if (cached) return cached

  const col = collection(db, "users", uid, "quizResults")
  const q = query(col, orderBy("answeredAt", "desc"), limit(count))
  const snap = await getDocs(q)
  const results = snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuizResult) }))

  // Cache for short period (60s)
  writeCache(cacheKey, results, "session", 60 * 1000)
  return results
}

/**
 * Deletion of quiz results is strictly disabled by StudyOS Zero-Data-Loss policy.
 */
export async function deleteQuizResult(_uid: string, _resultId: string): Promise<void> {
  console.warn("StudyOS Data Protection: Deletion of quiz results is disabled.")
}

export interface LeaderboardEntry {
  uid: string
  totalCorrect: number
  accuracy: number
  quizzesTaken: number
  displayName?: string
  photoURL?: string
  isOnline?: boolean
  isPro?: boolean
  school?: string
  category?: "JSS" | "SSS"
  email?: string
  createdAt?: any
}

/**
 * Fetch top users for the leaderboard.
 */
export async function fetchLeaderboard(limitCount = 1000): Promise<LeaderboardEntry[]> {
  // Avoid caching very large leaderboards in browser storage (storage limits).
  const shouldCache = limitCount <= 200
  const cacheKey = `leaderboard_${limitCount}`
  if (shouldCache) {
    const cached = readCache<LeaderboardEntry[]>(cacheKey, "session")
    if (cached) return cached
  }

  const usersCol = collection(db, "users")
  const q = query(usersCol, orderBy("totalCorrect", "desc"), limit(limitCount))
  const snap = await getDocs(q)
  const results = snap.docs.map((d) => {
    const data = d.data() as UserStats & { displayName?: string; photoURL?: string }
    return {
      uid: d.id,
      totalCorrect: data.totalCorrect || 0,
      accuracy: data.accuracy || 0,
      quizzesTaken: data.quizzesTaken || 0,
      displayName: data.displayName,
      photoURL: data.photoURL,
      isOnline: data.lastSeen ? (
        Date.now() - (
          typeof data.lastSeen.toMillis === "function"
            ? data.lastSeen.toMillis()
            : data.lastSeen.seconds
              ? data.lastSeen.seconds * 1000
              : new Date(data.lastSeen).getTime()
        )
      ) < 300000 : false,
      isPro: data.isPro || false,
      school: data.schoolName || data.school,
      category: (data.category === "SSS" ? "SSS" : "JSS") as "JSS" | "SSS",
      email: data.email,
      createdAt: data.createdAt || null,
    }
  })

  if (shouldCache) writeCache(cacheKey, results, "session", 60 * 1000)
  return results
}

/**
 * Update user's academic category ("JSS" | "SSS").
 */
export async function updateUserCategory(uid: string, category: "JSS" | "SSS"): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("studyos_category", category)
    } catch {}
  }
  if (typeof window !== "undefined" && !navigator.onLine) return
  const ref = doc(db, "users", uid)
  await updateDoc(ref, {
    category,
    updatedAt: serverTimestamp(),
  })
  try {
    clearCache(`userStats_${uid}`)
    clearCachePrefix("leaderboard_")
  } catch {}
}

/**
 * Update user's school (sets schoolName for student profile updates).
 */
export async function updateUserSchool(uid: string, school: string): Promise<void> {
  if (typeof window !== "undefined" && !navigator.onLine) return
  const trimmed = school.trim()
  if (!trimmed) return
  const ref = doc(db, "users", uid)
  try {
    await updateDoc(ref, {
      schoolName: trimmed,
    })
  } catch {
    await updateDoc(ref, {
      schoolName: trimmed,
      school: trimmed,
      updatedAt: serverTimestamp(),
    })
  }
  try { clearCache(`userStats_${uid}`); clearCachePrefix("leaderboard_") } catch {}
}

/**
 * Update user's profile photo URL.
 */
export async function updateUserPhotoURL(uid: string, photoURL: string | null): Promise<void> {
  if (typeof window !== "undefined" && !navigator.onLine) return
  const ref = doc(db, "users", uid)
  await updateDoc(ref, {
    photoURL,
    updatedAt: serverTimestamp(),
  })
  try { clearCache(`userStats_${uid}`); clearCachePrefix("leaderboard_") } catch {}
}

/**
 * Fetch all students (Admin only).
 */
export async function fetchAllStudents(): Promise<(UserStats & { uid: string })[]> {
  const col = collection(db, "users")
  let snap
  try {
    const q = query(col, orderBy("createdAt", "desc"))
    snap = await getDocs(q)
  } catch (err) {
    snap = await getDocs(col)
  }
  return snap.docs.map(d => {
    const data = d.data() as UserStats
    const resolvedSchool = data.schoolName || data.school
    return {
      uid: d.id,
      ...data,
      ...(resolvedSchool ? { school: resolvedSchool, schoolName: resolvedSchool } : {}),
    }
  })
}

/**
 * Upgrade a user to Pro status.
 */
export async function upgradeUserToPro(uid: string): Promise<void> {
  if (typeof window !== "undefined" && !navigator.onLine) return
  const ref = doc(db, "users", uid)
  
  // Calculate 60 days (2 months) from now
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 60)

  await updateDoc(ref, {
    isPro: true,
    proExpiresAt: expiresAt.toISOString(),
    updatedAt: serverTimestamp(),
  })
  try { clearCache(`userStats_${uid}`); clearCachePrefix("leaderboard_") } catch {}
}

/**
 * Update the user's last seen timestamp for presence tracking.
 */
export async function updateUserPresence(uid: string): Promise<void> {
  if (typeof window !== "undefined" && !navigator.onLine) return
  const userRef = doc(db, "users", uid)
  await updateDoc(userRef, {
    lastSeen: serverTimestamp()
  }).catch((err) => {
     // Ignore if doc doesn't exist yet
     console.warn("Presence update failed:", err.message)
  })
}

/**
 * Ban a user.
 */
export async function banUser(uid: string, reason: string): Promise<void> {
  if (typeof window !== "undefined" && !navigator.onLine) return
  const ref = doc(db, "users", uid)
  await updateDoc(ref, {
    isBanned: true,
    banReason: reason,
    updatedAt: serverTimestamp(),
  })
  try { clearCache(`userStats_${uid}`); clearCachePrefix("leaderboard_") } catch {}
}

/**
 * Unban a user.
 */
export async function unbanUser(uid: string): Promise<void> {
  if (typeof window !== "undefined" && !navigator.onLine) return
  const ref = doc(db, "users", uid)
  await updateDoc(ref, {
    isBanned: false,
    updatedAt: serverTimestamp(),
  })
  try { clearCache(`userStats_${uid}`); clearCachePrefix("leaderboard_") } catch {}
}

// ─── Helpers ───

function computeTopSubject(
  breakdown: Record<string, { answered: number; correct: number }>
): string | null {
  let top: string | null = null
  let maxAnswered = 0
  for (const [subj, data] of Object.entries(breakdown)) {
    if (data.answered > maxAnswered) {
      maxAnswered = data.answered
      top = subj
    }
  }
  return top
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Subscribe to user stats document in real-time.
 * Hardened to fallback to local persistent backup cache if network is offline or subscription errors occur,
 * and monotonically merge incoming snapshots so stats never decrease or reset on reconnect/reload.
 */
export function subscribeToUserStats(
  uid: string,
  callback: (stats: UserStats | null) => void
): Unsubscribe {
  const ref = doc(db, "users", uid)
  const cacheKey = `userStats_${uid}`
  const cacheKeyBackup = `userStats_backup_${uid}`

  return onSnapshot(
    ref,
    (snap) => {
      const currentBackup = readCache<UserStats>(cacheKeyBackup, "local")
      if (snap.exists()) {
        const rawData = snap.data({ serverTimestamps: "estimate" }) as UserStats
        const data = mergeProtectedStats(rawData, currentBackup)
        if (data.email === ADMIN_EMAIL) {
          data.isPro = true
        }
        // Save to session and persistent backup cache
        writeCache<UserStats>(cacheKey, data, "session", 5 * 60 * 1000)
        writeCache<UserStats>(cacheKeyBackup, data, "local", 365 * 24 * 60 * 60 * 1000)
        callback(data)
      } else {
        // If snap doesn't exist yet, fallback to local backup without erasing it
        callback(currentBackup || null)
      }
    },
    (err: any) => {
      console.warn("Failed to subscribe to user stats, utilizing local backup:", err)
      reportFirestoreError(err)
      const currentBackup = readCache<UserStats>(cacheKeyBackup, "local")
      // Always call callback so callers are never stuck in an infinite loading state
      callback(currentBackup || null)
    }
  )
}

/**
 * Save user's FCM push notification token.
 * Prevents redundant writes if the token has already been synced on this device.
 */
export async function saveUserFCMToken(uid: string, token: string): Promise<void> {
  if (!uid || !token) return
  if (typeof window !== "undefined" && !navigator.onLine) return
  const syncKey = `fcm_synced_${uid}_${token}`
  if (typeof window !== "undefined" && localStorage.getItem(syncKey) === "true") {
    return
  }
  const ref = doc(db, "users", uid)
  try {
    await updateDoc(ref, {
      fcmToken: token,
      updatedAt: serverTimestamp(),
    })
    if (typeof window !== "undefined") {
      localStorage.setItem(syncKey, "true")
    }
  } catch (err: any) {
    console.warn("Failed to update FCM token in user doc:", err?.message)
    reportFirestoreError(err)
  }
}
