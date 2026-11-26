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
      usesLatex:
        subjectKey === "mathematics" ||
        subjectKey === "physics" ||
        subjectKey === "chemistry",
    }
  })
}

type JsonPoolLoader = () => Promise<{ default: RawJsonQuestion[] }>

const NECO_JSON_POOLS: Partial<Record<SSSSubjectKey, JsonPoolLoader>> = {
  accounting: () => import("../Json/NECO/Accounting.json") as Promise<{ default: RawJsonQuestion[] }>,
  agriculture: () => import("../Json/NECO/Agricsci.json") as Promise<{ default: RawJsonQuestion[] }>,
  biology: () => import("../Json/NECO/Biology.json") as Promise<{ default: RawJsonQuestion[] }>,
  chemistry: () => import("../Json/NECO/Chemistry.json") as Promise<{ default: RawJsonQuestion[] }>,
  civiledu: () => import("../Json/NECO/Civic.json") as Promise<{ default: RawJsonQuestion[] }>,
  commerce: () => import("../Json/NECO/Commerce.json") as Promise<{ default: RawJsonQuestion[] }>,
  computer: () => import("../Json/NECO/Computer.json") as Promise<{ default: RawJsonQuestion[] }>,
  crk: () => import("../Json/NECO/Crs.json") as Promise<{ default: RawJsonQuestion[] }>,
  economics: () => import("../Json/NECO/Economics.json") as Promise<{ default: RawJsonQuestion[] }>,
  english: () => import("../Json/NECO/English.json") as Promise<{ default: RawJsonQuestion[] }>,
  englishlit: () => import("../Json/NECO/Literature.json") as Promise<{ default: RawJsonQuestion[] }>,
  government: () => import("../Json/NECO/Government.json") as Promise<{ default: RawJsonQuestion[] }>,
  healthedu: () => import("../Json/NECO/HealthEdu.json") as Promise<{ default: RawJsonQuestion[] }>,
  mathematics: () => import("../Json/NECO/Mathematics.json") as Promise<{ default: RawJsonQuestion[] }>,
  nutrition: () => import("../Json/NECO/Nutrition.json") as Promise<{ default: RawJsonQuestion[] }>,
  physics: () => import("../Json/NECO/Physics.json") as Promise<{ default: RawJsonQuestion[] }>,
  visualart: () => import("../Json/NECO/VirtualArt.json") as Promise<{ default: RawJsonQuestion[] }>,
}

const WAEC_JSON_POOLS: Partial<Record<SSSSubjectKey, JsonPoolLoader>> = {
  accounting: () => import("../Json/WAEC/FINANCIAL ACCOUNTS.json") as Promise<{ default: RawJsonQuestion[] }>,
  agriculture: () => import("../Json/WAEC/AGRIC.json") as Promise<{ default: RawJsonQuestion[] }>,
  animalhusbandry: () => import("../Json/WAEC/ANIMAL HUSBANDRY.json") as Promise<{ default: RawJsonQuestion[] }>,
  biology: () => import("../Json/WAEC/BIOLOGY.json") as Promise<{ default: RawJsonQuestion[] }>,
  chemistry: () => import("../Json/WAEC/CHEMISTRY.json") as Promise<{ default: RawJsonQuestion[] }>,
  civiledu: () => import("../Json/WAEC/CIVIC EDUCATION.json") as Promise<{ default: RawJsonQuestion[] }>,
  commerce: () => import("../Json/WAEC/COMMERCE.json") as Promise<{ default: RawJsonQuestion[] }>,
  computer: () => import("../Json/WAEC/COMPUTER.json") as Promise<{ default: RawJsonQuestion[] }>,
  crk: () => import("../Json/WAEC/CRS.json") as Promise<{ default: RawJsonQuestion[] }>,
  dataprocessing: () => import("../Json/WAEC/DATA PROCESSING.json") as Promise<{ default: RawJsonQuestion[] }>,
  economics: () => import("../Json/WAEC/ECONOMICS.json") as Promise<{ default: RawJsonQuestion[] }>,
  english: () => import("../Json/WAEC/ENGLISH.json") as Promise<{ default: RawJsonQuestion[] }>,
  englishlit: () => import("../Json/WAEC/LITERATURE.json") as Promise<{ default: RawJsonQuestion[] }>,
  french: () => import("../Json/WAEC/FRENCH.json") as Promise<{ default: RawJsonQuestion[] }>,
  geography: () => import("../Json/WAEC/GEOGRAPHY.json") as Promise<{ default: RawJsonQuestion[] }>,
  government: () => import("../Json/WAEC/GOVERNMENT.json") as Promise<{ default: RawJsonQuestion[] }>,
  history: () => import("../Json/WAEC/HISTORY.json") as Promise<{ default: RawJsonQuestion[] }>,
  ict: () => import("../Json/WAEC/ICT.json") as Promise<{ default: RawJsonQuestion[] }>,
  irk: () => import("../Json/WAEC/IRS.json") as Promise<{ default: RawJsonQuestion[] }>,
  marketing: () => import("../Json/WAEC/MARKETING.json") as Promise<{ default: RawJsonQuestion[] }>,
  mathematics: () => import("../Json/WAEC/MATHEMATICS.json") as Promise<{ default: RawJsonQuestion[] }>,
  physics: () => import("../Json/WAEC/PHYSICS.json") as Promise<{ default: RawJsonQuestion[] }>,
  yoruba: () => import("../Json/WAEC/YORUBA.json") as Promise<{ default: RawJsonQuestion[] }>,
}

const JAMB_JSON_POOLS: Partial<Record<SSSSubjectKey, JsonPoolLoader>> = {
  accounting: () => import("../Json/JAMB/Accounting.json") as Promise<{ default: RawJsonQuestion[] }>,
  biology: () => import("../Json/JAMB/Biology.json") as Promise<{ default: RawJsonQuestion[] }>,
  chemistry: () => import("../Json/JAMB/Chemistry.json") as Promise<{ default: RawJsonQuestion[] }>,
  crk: () => import("../Json/JAMB/Crs.json") as Promise<{ default: RawJsonQuestion[] }>,
  english: () => import("../Json/JAMB/English.json") as Promise<{ default: RawJsonQuestion[] }>,
  englishlit: () => import("../Json/JAMB/Literature.json") as Promise<{ default: RawJsonQuestion[] }>,
  geography: () => import("../Json/JAMB/Geography.json") as Promise<{ default: RawJsonQuestion[] }>,
  irk: () => import("../Json/JAMB/Islamic.json") as Promise<{ default: RawJsonQuestion[] }>,
  mathematics: () => import("../Json/JAMB/Mathematics.json") as Promise<{ default: RawJsonQuestion[] }>,
  physics: () => import("../Json/JAMB/Physics.json") as Promise<{ default: RawJsonQuestion[] }>,
}

interface SSSSolidQuizProps {
  subjectKey: SSSSubjectKey
  subjectKeys?: SSSSubjectKey[]
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

interface SubjectQuestionRange {
  key: SSSSubjectKey
  name: string
  shortName: string
  startIndex: number
  count: number
}

export function SSSSolidQuiz({
  subjectKey,
  subjectKeys,
  examType,
  paperType = "objective",
  questionCount,
  timeLimit,
  onBack,
  onComplete,
}: SSSSolidQuizProps) {
  const effectiveSubjects =
    subjectKeys && subjectKeys.length > 0 ? subjectKeys : [subjectKey]
  const subjectsKeyId = effectiveSubjects.join(",")
  const subject = getSSSSubjectByKey(effectiveSubjects[0])
  const examLabel =
    examType === "wassce" ? "WAEC" : examType === "neco" ? "NECO" : "JAMB"
  const paperLabel = paperType === "theory" ? "Theory" : "Objective"
  const topicLabel = `${examLabel} ${paperLabel} — Full Syllabus`

  const [questions, setQuestions] = useState<Question[]>([])
  const [subjectRanges, setSubjectRanges] = useState<SubjectQuestionRange[]>([])
  const [poolLoading, setPoolLoading] = useState(true)

  useEffect(() => {
    let active = true
    const keysToLoad = subjectsKeyId.split(",") as SSSSubjectKey[]
    if (paperType !== "objective" || keysToLoad.length === 0) {
      setQuestions([])
      setSubjectRanges([])
      setPoolLoading(false)
      return
    }

    const poolMap =
      examType === "neco"
        ? NECO_JSON_POOLS
        : examType === "wassce"
          ? WAEC_JSON_POOLS
          : JAMB_JSON_POOLS

    const perSubjectBase = Math.floor(questionCount / keysToLoad.length)
    const remainder = questionCount % keysToLoad.length

    setPoolLoading(true)
    Promise.all(
      keysToLoad.map(async (sk, index) => {
        const loader = poolMap[sk]
        if (!loader) return { key: sk, questions: [] as Question[] }
        const mod = await loader()
        const rawPool = mod.default || []
        if (rawPool.length === 0) return { key: sk, questions: [] as Question[] }
        const mapped = mapNecoJsonToQuestions(rawPool, sk, examType)
        const shuffled = shuffleArray(mapped)
        const target = perSubjectBase + (index < remainder ? 1 : 0)
        return {
          key: sk,
          questions: shuffled.slice(0, Math.min(target, shuffled.length)),
        }
      })
    )
      .then((sections) => {
        if (!active) return
        const combined: Question[] = []
        const ranges: SubjectQuestionRange[] = []
        for (const sec of sections) {
          if (sec.questions.length === 0) continue
          const info = getSSSSubjectByKey(sec.key)
          ranges.push({
            key: sec.key,
            name: info.name,
            shortName: info.shortName,
            startIndex: combined.length,
            count: sec.questions.length,
          })
          combined.push(...sec.questions)
        }
        setSubjectRanges(ranges)
        setQuestions(combined)
      })
      .catch((err) => {
        console.error("Failed to load SSS question pool:", err)
        if (active) {
          setSubjectRanges([])
          setQuestions([])
        }
      })
      .finally(() => {
        if (active) setPoolLoading(false)
      })

    return () => {
      active = false
    }
  }, [subjectsKeyId, examType, paperType, questionCount])

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
    const sessionTitle =
      subjectRanges.length > 1
        ? `${examLabel} (${subjectRanges.map((r) => r.shortName).join(" • ")})`
        : subject.name
    onComplete({
      subject: sessionTitle,
      topic: topicLabel,
      total: questions.length,
      correct,
      questions,
      answers,
      mode: "exam",
    })
  }, [questions, answers, subject.name, subjectRanges, examLabel, topicLabel, onComplete])

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !submitted && questions.length > 0) handleSubmit()
  }, [timeLeft, submitted, questions.length, handleSubmit])

  if (poolLoading) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-8 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading {effectiveSubjects.length > 1 ? `${examLabel} (${effectiveSubjects.length} subjects)` : subject.name} questions...
        </p>
      </div>
    )
  }

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
  const isMultiSubject = subjectRanges.length > 1
  const activeRange = isMultiSubject
    ? subjectRanges.find(
        (r) => currentIdx >= r.startIndex && currentIdx < r.startIndex + r.count
      ) || subjectRanges[0]
    : null
  const activeSubjectInfo = getSSSSubjectByKey((q.subject as SSSSubjectKey) || subjectKey)

  return (
    <div className="flex flex-col min-h-full pb-10">
      {showStartWarning && (
        <QuizStartWarning onConfirm={() => setShowStartWarning(false)} />
      )}
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 glass-strong">
        <div className="flex items-center justify-between gap-2 px-5 pt-12 lg:pt-6 pb-3 max-w-2xl mx-auto w-full">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl glass flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="text-center min-w-0 flex-1 px-1">
            <p className="text-xs text-muted-foreground truncate">
              {activeSubjectInfo.name} • {examLabel} {paperLabel}
            </p>
            <p className="text-sm font-semibold text-foreground">
              Q {currentIdx + 1}/{questions.length}
            </p>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
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

        {/* JAMB 4-subject tabs */}
        {isMultiSubject && (
          <div className="px-5 pb-2.5 flex gap-1.5 overflow-x-auto glass-scrollbar max-w-2xl mx-auto w-full">
            {subjectRanges.map((range) => {
              const isTabActive = activeRange?.key === range.key
              const tabAnswered = answers
                .slice(range.startIndex, range.startIndex + range.count)
                .filter((a) => a !== null).length
              return (
                <button
                  key={range.key}
                  type="button"
                  onClick={() => setCurrentIdx(range.startIndex)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                    isTabActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "glass text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{range.shortName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isTabActive
                        ? "bg-white/20 text-primary-foreground"
                        : "bg-foreground/5 text-muted-foreground"
                    }`}
                  >
                    {tabAnswered}/{range.count}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Progress dots (scoped per subject tab in JAMB 4-subject mode) */}
        <div className="px-5 pb-3 flex gap-0.5 overflow-x-auto glass-scrollbar max-w-2xl mx-auto w-full">
          {(activeRange
            ? Array.from({ length: activeRange.count }, (_, localIdx) => ({
                globalIdx: activeRange.startIndex + localIdx,
                label: localIdx + 1,
              }))
            : questions.map((_, i) => ({ globalIdx: i, label: i + 1 }))
          ).map(({ globalIdx, label }) => (
            <button
              key={globalIdx}
              onClick={() => setCurrentIdx(globalIdx)}
              className={`w-6 h-6 rounded text-[10px] font-bold shrink-0 transition-all ${
                globalIdx === currentIdx
                  ? "bg-primary text-primary-foreground"
                  : answers[globalIdx] !== null
                    ? "bg-emerald-500/30 text-emerald-300"
                    : "glass text-muted-foreground"
              }`}
            >
              {label}
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
            <MathText text={opt} className="text-sm text-foreground text-left flex-1 min-w-0" />
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
