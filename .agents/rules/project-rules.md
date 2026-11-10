---
description: Mandatory StudyOS project rules enforcing no Sparkles icon, append-only non-decreasing user stats, Exam-only streaks without missed-day deduction, and Light Mode default.
---

# StudyOS Project Rules

1. **No `Sparkles` Icon**:
   - Never import or use `Sparkles` from `lucide-react` anywhere in the codebase.
   - Use `Crown` for StudyOS Pro features/badges and `Star`, `Award`, or `Trophy` for achievements.

2. **Zero Data Loss & Append-Only Stats**:
   - Never delete or overwrite Firestore user documents (`/users/{uid}`) or quiz history (`/users/{uid}/quizResults/{resultId}`).
   - Protect all user stats (`currentStreak`, `longestStreak`, `totalQuestions`, `totalCorrect`, `accuracy`, `quizzesTaken`, `achievements`) so they are strictly non-decreasing (`Math.max` merges).
   - Never execute Firestore writes while offline (`!navigator.onLine`) and never overwrite server data with `DEFAULT_STATS`.
   - When network connectivity is weak or offline, serve cached stats as-is without blanking the UI.

3. **Streak Calculation**:
   - Increment `currentStreak` **only** on everyday Exam Practice completions (`!isTraining`), never on Training Mode.
   - Never deduct or reset `currentStreak` when a user misses one or more days.
   - Always fetch and display the user's streak from Firestore on their dashboard.

4. **Theme Default**:
   - Default to Light Mode (`defaultTheme="light"`), especially on the Auth page, while keeping the theme toggle (`Sun`/`Moon`) on the Dashboard.

