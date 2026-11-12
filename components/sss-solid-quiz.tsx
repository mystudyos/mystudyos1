"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  AlertCircle,
} from "lucide-react"
import { QuizStartWarning } from "./quiz-start-warning"
import { MathText } from "./math-text"
import {
  getSSSSubjectByKey,
  type SSSExamType,
  type SSSPaperType,
  type SSSSubjectKey,
} from "@/lib/sss-config"
import { shuffleArray, type Question } from "@/lib/question-types"
import necoAgricJson from "../Json/NECO/Agricsci.json"
import necoBiologyJson from "../Json/NECO/Biology.json"
import necoChemistryJson from "../Json/NECO/Chemistry.json"

interface RawJsonQuestion {
  id: number | string
  question?: string
  options?: string[]
  answer?: string
  topic?: string
  difficulty?: string
}

function mapNecoJsonToQuestions(
  json: RawJsonQuestion[],
  subjectKey: SSSSubjectKey,
  examType: SSSExamType
): Question[] {
  return json.map((q) => {
    const correctChar = q.answer ? q.answer.trim().charAt(0).toUpperCase() : "A"
    let originalCorrectIndex = 0
    if (correctChar === "B") originalCorrectIndex = 1
    else if (correctChar === "C") originalCorrectIndex = 2
    else if (correctChar === "D") originalCorrectIndex = 3

    const cleanedOptions = (q.options || []).map((opt) =>
      opt.replace(/^[A-D]\.\s*/, "")
    )

    // Fisher-Yates shuffle options while preserving the correct answer index
    const indexed = cleanedOptions.map((opt, i) => ({
      opt,
      wasCorrect: i === originalCorrectIndex,
    }))
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indexed[i], indexed[j]] = [indexed[j], indexed[i]]
    }

    const shuffledOptions = indexed.map((item) => item.opt)
    const newCorrectIndex = indexed.findIndex((item) => item.wasCorrect)

    return {
      id: `${examType}-${subjectKey}-solid-${q.id}`,
      subject: subjectKey,
      topic: q.topic || "General",
      question: q.question || "",
      options: shuffledOptions,
      correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
      explanation: `The correct answer is ${shuffledOptions[newCorrectIndex] || ""}.`,
      usesLatex: false,
    }
  })
}

const NECO_JSON_POOLS: Partial<Record<SSSSubjectKey, RawJsonQuestion[]>> = {
  agriculture: necoAgricJson as RawJsonQuestion[],
  biology: necoBiologyJson as RawJsonQuestion[],
  chemistry: necoChemistryJson as RawJsonQuestion[],
}

interface SSSSolidQuizProps {
  subjectKey: SSSSubjectKey
  examType: SSSExamType
  paperType?: SSSPaperType
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
  paperType = "objective",
  questionCount,
  timeLimit,
  onBack,
  onComplete,
}: SSSSolidQuizProps) {
  const subject = getSSSSubjectByKey(subjectKey)
  const examLabel =
    examType === "wassce" ? "WAEC" : examType === "neco" ? "NECO" : "JAMB"
  const paperLabel = paperType === "theory" ? "Theory" : "Objective"
  const topicLabel = `${examLabel} ${paperLabel} — Full Syllabus`

  const questions = useMemo(() => {
    if (examType !== "neco" || paperType !== "objective") {
      return []
    }
    const rawPool = NECO_JSON_POOLS[subjectKey]
    if (!rawPool || rawPool.length === 0) {
      return []
    }
    const mapped = mapNecoJsonToQuestions(rawPool, subjectKey, examType)
    const shuffled = shuffleArray(mapped)
    return shuffled.slice(0, Math.min(questionCount, shuffled.length))
  }, [subjectKey, examType, paperType, questionCount])

  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    Array(questions.length).fill(null)
  )
  const [timeLeft, setTimeLeft] = useState(timeLimit * 60)
  const [submitted, setSubmitted] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showStartWarning, setShowStartWarning] = useState(true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setCurrentIdx(0)
    setAnswers(Array(questions.length).fill(null))
    setTimeLeft(timeLimit * 60)
    setSubmitted(false)
  }, [questions.length, timeLimit])

  // Timer
  useEffect(() => {
    if (submitted || showStartWarning || questions.length === 0) return
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
  }, [submitted, showStartWarning, questions.length])

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

  if (questions.length === 0) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Not Available Now
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-8 max-w-70">
          Exam practice questions for{" "}
          <span className="text-foreground font-semibold">
            {subject.name} ({examLabel} {paperLabel})
          </span>{" "}
          are not available right now. Please check back soon!
        </p>
        <button
          onClick={onBack}
          className="w-full max-w-60 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-xl shadow-primary/20 active:scale-95 transition-all cursor-pointer"
        >
          Go Back
        </button>
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
              {subject.name} • {examLabel} {paperLabel}
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
