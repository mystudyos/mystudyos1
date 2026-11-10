"use client"

import { useMemo } from "react"
import { Trophy, Target, ArrowLeft, BarChart3, Lock, Eye } from "lucide-react"
import type { Question } from "@/lib/question-types"

interface QuizResultProps {
  subject: string
  topic: string
  total: number
  correct: number
  questions: Question[]
  answers: (number | null)[]
  onBackToDashboard: () => void
  onReviewAnswers?: () => void
  onQuizComplete?: () => void
}

export function QuizResult({ subject, topic, total, correct, questions, answers, onBackToDashboard, onReviewAnswers, onQuizComplete }: QuizResultProps) {
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0

  // Topic breakdown for performance analysis
  const topicBreakdown = useMemo(() => {
    const map: Record<string, { total: number; correct: number }> = {}
    questions.forEach((q, i) => {
      if (!map[q.topic]) map[q.topic] = { total: 0, correct: 0 }
      map[q.topic].total++
      if (answers[i] === q.correctIndex) map[q.topic].correct++
    })
    return Object.entries(map)
      .map(([topic, data]) => ({ topic, ...data, pct: Math.round((data.correct / data.total) * 100) }))
      .sort((a, b) => a.pct - b.pct) // worst first
  }, [questions, answers])

  const grade = percentage >= 80 ? "A" : percentage >= 70 ? "B" : percentage >= 60 ? "C" : percentage >= 50 ? "D" : "F"
  const gradeColor = percentage >= 70 ? "text-emerald-400" : percentage >= 50 ? "text-amber-400" : "text-red-400"
  const ringColor = percentage >= 70 ? "stroke-emerald-400" : percentage >= 50 ? "stroke-amber-400" : "stroke-red-400"

  return (
    <div className="flex flex-col min-h-full pb-10">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3 px-5 pt-12 lg:pt-6 pb-5 max-w-2xl mx-auto w-full">
        <button onClick={onBackToDashboard} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-0.5">{subject}</p>
          <h1 className="text-xl font-bold text-foreground">Your Results</h1>
        </div>
        </div>
      </div>

      {/* Score circle */}
      <div className="flex flex-col items-center justify-center px-5 mb-6 max-w-2xl mx-auto w-full">
        <div className="relative w-40 h-40 mb-4">
          <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
            <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" strokeLinecap="round"
              className={ringColor}
              strokeDasharray={`${(percentage / 100) * 327} 327`}
              style={{ transition: "stroke-dasharray 1s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${gradeColor}`}>{percentage}%</span>
            <span className="text-xs text-muted-foreground">Grade {grade}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div>
              <p className="text-lg font-bold text-foreground">{correct}/{total}</p>
              <p className="text-xs text-muted-foreground font-bold">Correct</p>
            </div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex items-center gap-2">
            <div>
              <p className="text-lg font-bold text-foreground">{total - correct}</p>
              <p className="text-xs text-muted-foreground font-bold">Wrong</p>
            </div>
          </div>
        </div>
      </div>

      {/* Topic Breakdown */}
      <div className="px-5 mb-5 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-foreground">Performance Breakdown</h3>
        </div>
        <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {topicBreakdown.map((t) => (
            <div key={t.topic} className="glass rounded-xl p-3 border border-white/5">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <p className="text-[10px] font-bold text-foreground/80 leading-tight flex-1">{t.topic}</p>
                <p className={`text-[9px] font-black whitespace-nowrap ${t.pct >= 70 ? "text-emerald-400" : t.pct >= 50 ? "text-amber-400" : "text-red-400"}`}>
                  {t.correct}/{t.total} ({t.pct}%)
                </p>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${t.pct >= 70 ? "bg-emerald-400" : t.pct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${t.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 mt-auto space-y-3 max-w-2xl mx-auto w-full">
        {onReviewAnswers && (
          <button
            onClick={onReviewAnswers}
            className="w-full py-3.5 rounded-xl glass border border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition-all"
          >
            <Eye className="w-4 h-4" />
            Review Answers
          </button>
        )}
        <button
          onClick={onBackToDashboard}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}
