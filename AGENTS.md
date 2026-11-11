# StudyOS Agent Rules & Architectural Guardrails

These rules are mandatory for all AI agents and developers working on the **StudyOS** codebase (`studyos1.online`).

## 1. Forbidden Icon: No `Sparkles`
- **NEVER** import or render `Sparkles` from `lucide-react` (or any custom SVG equivalent) anywhere in the entire codebase.
- **Pro / Upgrade Icon**: Always use `Crown` from `lucide-react` to represent StudyOS Pro, premium badges, and upgrade prompts.
- **Achievements / Celebrations**: Use `Star`, `Award`, or `Trophy` from `lucide-react`.

## 2. Zero Data Loss & Append-Only User Stats (Production Data Protection)
User statistics (`totalQuestions`, `totalCorrect`, `accuracy`, `quizzesTaken`, `currentStreak`, `longestStreak`, `achievements`, `subjectBreakdown`, and `quizResults`) are treated as **strictly append-only private property**:
- **Never Delete or Overwrite**: Never call `deleteDoc` on `/users/{uid}` or `/users/{uid}/quizResults/{resultId}`. Never overwrite an existing user document with `DEFAULT_STATS` (`0`s).
- **Monotonic Non-Decreasing Counters**: `totalQuestions`, `totalCorrect`, `quizzesTaken`, `currentStreak`, `longestStreak`, and `achievements.length` must **only increase**, never decrease or reset on reconnect, reload, or weak network conditions.
- **No Offline Writes**: Never queue Firestore mutations when `navigator.onLine === false` or when the server cannot be reached, to prevent stale offline writes from conflicting with and wiping live production data on sync.
- **Weak Network Resilience**: When the network is weak or offline, display cached user stats (`localStorage` backup / session cache) as-is without triggering destructive re-fetches or blanking the UI.

## 3. Daily Streak Rules
- **Exam Practice Only**: User streaks (`currentStreak` and `longestStreak`) must **only** be incremented when a user completes an **Exam Practice** session (`!isTraining` / `mode === "exam"`). Training Mode sessions must never increment or alter streak counters.
- **No Deduction on Missed Days**: Never reset or deduct `currentStreak` to `0` or `1` when a user misses a day or more between Exam Practice sessions. Each new distinct calendar day of Exam Practice increments the user's existing `currentStreak` by `+1`.
- **Dashboard Display**: Always fetch and synchronize the user's streak count from Firestore (`/users/{uid}`) and display it on their individual dashboard upon visit.

## 4. Theme & Performance Standards
- **Light Mode Default**: The application defaults to **Light Mode** (`defaultTheme="light"`, `enableSystem={false}`), and the Auth screen (`AuthView`) must always render in Light Mode. The theme toggle icon (`Sun` / `Moon`) remains accessible on the Dashboard.
- **Code Splitting**: Heavy views and question bank consumers (`TrainingQuiz`, `SolidQuiz`, `AdminDashboard`, `ProAnalyticsView`, etc.) must be dynamically imported (`next/dynamic`) so they never block First Contentful Paint (FCP), Largest Contentful Paint (LCP), or Total Blocking Time (TBT).

## 5. Git Workflow (`git pull` Before `git push`)
- Always run `git pull` before `git push` to synchronize any remote commits on GitHub (`mystudyos`) and prevent merge conflicts or rejected pushes.

