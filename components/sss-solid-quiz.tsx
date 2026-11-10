"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { QuizStartWarning } from "./quiz-start-warning"
import { MathText } from "./math-text"
import {
  getSSSSubjectByKey,
  type SSSExamType,
  type SSSSubjectKey,
} from "@/lib/sss-config"
import { shuffleArray, type Question } from "@/lib/question-types"
import { readCache, writeCache } from "@/lib/cache"

interface SSSSolidQuizProps {
  subjectKey: SSSSubjectKey
  examType: SSSExamType
  year: string
  questionCount: number
  timeLimit: number
  onBack: () => void
  onComplete: (results: {
    subject: string
    topic: string
    total: number
    correct: number
    questions: Question[]
    answers: (number | null)[]
    mode?: "training" | "exam"
  }) => void
}

export function SSSSolidQuiz({
  subjectKey,
  examType,
  year,
  questionCount,
  timeLimit,
  onBack,
  onComplete,
}: SSSSolidQuizProps) {
  const subject = getSSSSubjectByKey(subjectKey)
  const examLabel =
    examType === "wassce" ? "WAEC" : examType === "neco" ? "NECO" : "JAMB"
  const topicLabel =
    year && year !== "all"
      ? `${examLabel} (${year}) — Exam Practice`
      : `${examLabel} — Full Syllabus`

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [timeLeft, setTimeLeft] = useState(timeLimit * 60)
  const [submitted, setSubmitted] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showStartWarning, setShowStartWarning] = useState(true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let active = true
    const cacheKey = `sss_q_${subjectKey}_${examType}_${year}`
    const cached = readCache<Question[]>(cacheKey, "session")

    if (cached && cached.length > 0) {
      const shuffled = shuffleArray(cached)
      const sliced = shuffled.slice(0, Math.min(questionCount, shuffled.length))
      setQuestions(sliced)
      setAnswers(Array(sliced.length).fill(null))
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(
      `/api/sdash/questions?subject=${encodeURIComponent(subjectKey)}&type=${encodeURIComponent(examType)}&year=${encodeURIComponent(year)}&limit=50`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        const list: Question[] = Array.isArray(data?.questions) ? data.questions : []
        if (list.length > 0) {
          writeCache(cacheKey, list, "session", 30 * 60 * 1000)
        }
        const shuffled = shuffleArray(list)
        const sliced = shuffled.slice(0, Math.min(questionCount, shuffled.length))
        setQuestions(sliced)
        setAnswers(Array(sliced.length).fill(null))
      })
      .catch((err) => {
        console.error("Failed to fetch SSS exam questions:", err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [subjectKey, examType, year, questionCount])

  // Timer
  useEffect(() => {
    if (loading || submitted || showStartWarning || questions.length === 0) return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [loading, submitted, showStartWarning, questions.length])

  const handleSubmit = useCallback(() => {
    setSubmitted(true)
    if (timerRef.current) clearInterval(timerRef.current)
    const correct = questions.reduce(
      (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
      0
    )
    onComplete({
      subject: subject.name,
      topic: topicLabel,
      total: questions.length,
      correct,
      questions,
      answers,
      mode: "exam",
    })
  }, [questions, answers, subject.name, topicLabel, onComplete])

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !submitted && questions.length > 0) handleSubmit()
  }, [timeLeft, submitted, questions.length, handleSubmit])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-bold text-foreground">
          Preparing {subject.name} ({examLabel}) CBT Simulation...
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Loading timed past questions
        </p>
      </div>
    )
  }

  const q = questions[currentIdx]
  if (!q) return null

  const handleSelect = (idx: number) => {
    if (submitted) return
    const newAnswers = [...answers]
    newAnswers[currentIdx] = idx
    setAnswers(newAnswers)
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const isLowTime = timeLeft < 300
  const answeredCount = answers.filter((a) => a !== null).length

  return (
    <div className="flex flex-col min-h-full pb-10">
      {showStartWarning && (
        <QuizStartWarning onConfirm={() => setShowStartWarning(false)} />
      )}
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 glass-strong">
        <div className="flex items-center justify-between px-5 pt-12 lg:pt-6 pb-3 max-w-2xl mx-auto w-full">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl glass flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {subject.name} • {examLabel}
            </p>
            <p className="text-sm font-semibold text-foreground">
              Q {currentIdx + 1}/{questions.length}
            </p>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              isLowTime
                ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse"
                : "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold text-sm tracking-wide">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </div>
        </div>
        {/* Progress dots */}
        <div className="px-5 pb-3 flex gap-0.5 overflow-x-auto glass-scrollbar max-w-2xl mx-auto w-full">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`w-6 h-6 rounded text-[10px] font-bold shrink-0 transition-all ${
                i === currentIdx
                  ? "bg-primary text-primary-foreground"
                  : answers[i] !== null
                    ? "bg-emerald-500/30 text-emerald-300"
                    : "glass text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="px-5 mt-4 mb-6 max-w-2xl mx-auto w-full">
        <div className="glass rounded-2xl p-5 border border-white/5">
          <MathText
            text={q.question}
            className="text-foreground text-base leading-relaxed font-medium"
          />
        </div>
      </div>

      {/* Options */}
      <div className="px-5 space-y-3 flex-1 max-w-2xl mx-auto w-full">
        {q.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200 ${
              answers[currentIdx] === idx
                ? "bg-primary/20 border border-primary/50"
                : "glass border border-white/10 hover:border-white/30"
            }`}
          >
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                answers[currentIdx] === idx
                  ? "bg-primary text-primary-foreground"
                  : "glass text-muted-foreground"
              }`}
            >
              {String.fromCharCode(65 + idx)}
            </span>
            <MathText text={opt} className="text-sm text-foreground text-left flex-1" />
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="px-5 mt-5 flex gap-3 max-w-2xl mx-auto w-full">
        <button
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="flex-1 py-3 rounded-xl glass border border-white/10 text-foreground font-medium text-sm flex items-center justify-center gap-1 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        {currentIdx < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIdx((i) => i + 1)}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
          >
            Submit ({answeredCount}/{questions.length})
          </button>
        )}
      </div>

      {/* Submit confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="glass rounded-2xl p-6 border border-white/10 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <h3 className="text-lg font-bold text-foreground">Submit Exam?</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              You&apos;ve answered{" "}
              <span className="text-foreground font-semibold">{answeredCount}</span> of{" "}
              <span className="text-foreground font-semibold">{questions.length}</span>{" "}
              questions.
              {answeredCount < questions.length &&
                " Unanswered questions will be marked wrong."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl glass border border-white/10 text-foreground font-medium text-sm"
              >
                Go Back
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
              >
                Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
