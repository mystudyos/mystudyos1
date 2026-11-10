"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, AlertTriangle } from "lucide-react"
import { QuizStartWarning } from "./quiz-start-warning"
import { MathText } from "./math-text"
import { type SubjectKey, getSubjectByKey, getQuestionsForSubject, shuffleArray } from "@/lib/question-types"
import type { Question } from "@/lib/question-types"
import { ALL_QUESTIONS } from "@/lib/questions"
import englishSolidJson from "../Json/English Lang_Solid Q's.json"
import mathsSolidJson from "../Json/Maths_Solid Q's.json"
import crsSolidJson from "../Json/CRS_Solid Q's.json"
import bstSolidJson from "../Json/BST_Solid Q's.json"
import pvsSolidJson from "../Json/PVS_Solid Q's.json"
import bussSolidJson from "../Json/BUSS Solid Q's.json"
import nveSolidJson from "../Json/NVE_Solid Q's.json"
import ccaSolidJson from "../Json/CCA_Solid Q's.json"
import historySolidJson from "../Json/History_Solid Q's.json"
import frenchSolidJson from "../Json/French_Solid Q's.json"
import yorubaSolidJson from "../Json/Yoruba_Solid Q's.json"
import igboSolidJson from "../Json/Igbo_Solid Q's.json"

function mapJsonToQuestions(json: any[], subjectId: string): Question[] {
  return json.map((q) => {
    const correctChar = q.answer ? q.answer.trim().charAt(0).toUpperCase() : "A"
    let originalCorrectIndex = 0
    if (correctChar === "B") originalCorrectIndex = 1
    else if (correctChar === "C") originalCorrectIndex = 2
    else if (correctChar === "D") originalCorrectIndex = 3

    const cleanedOptions = (q.options || []).map((opt: string) => opt.replace(/^[A-D]\.\s*/, ""))
    
    // Shuffle options: create indexed pairs, shuffle, then find new correct index
    const indexed = cleanedOptions.map((opt: string, i: number) => ({ opt, wasCorrect: i === originalCorrectIndex }))
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexed[i], indexed[j]] = [indexed[j], indexed[i]]
    }
    
    const shuffledOptions = indexed.map((item: any) => item.opt)
    const newCorrectIndex = indexed.findIndex((item: any) => item.wasCorrect)

    return {
      id: `${subjectId}-solid-${q.id}`,
      subject: subjectId,
      topic: q.topic || "General",
      question: q.question || "",
      options: shuffledOptions,
      correctIndex: newCorrectIndex,
      explanation: `The correct answer is ${shuffledOptions[newCorrectIndex]}.`,
      difficulty: (q.difficulty?.toLowerCase() as any) || "medium",
      usesLatex: subjectId === "mathematics",
    }
  })
}

const mappedEnglishJson = mapJsonToQuestions(englishSolidJson as any[], "english")
const mappedMathsJson = mapJsonToQuestions(mathsSolidJson as any[], "mathematics")
const mappedCrsJson = mapJsonToQuestions(crsSolidJson as any[], "crs")
const mappedBstJson = mapJsonToQuestions(bstSolidJson as any[], "bst")
const mappedPvsJson = mapJsonToQuestions(pvsSolidJson as any[], "pvs")
const mappedBussJson = mapJsonToQuestions(bussSolidJson as any[], "business")
const mappedNveJson = mapJsonToQuestions(nveSolidJson as any[], "nve")
const mappedCcaJson = mapJsonToQuestions(ccaSolidJson as any[], "cca")
const mappedHistoryJson = mapJsonToQuestions(historySolidJson as any[], "history")
const mappedFrenchJson = mapJsonToQuestions(frenchSolidJson as any[], "french")
const mappedYorubaJson = mapJsonToQuestions(yorubaSolidJson as any[], "yoruba")
const mappedIgboJson = mapJsonToQuestions(igboSolidJson as any[], "igbo")

interface SolidQuizProps {
  subjectKey: SubjectKey
  questionCount: number
  timeLimit: number
  onBack: () => void
  onComplete: (results: { 
    subject: string; 
    topic: string; 
    total: number; 
    correct: number; 
    questions: Question[]; 
    answers: (number | null)[];
    mode?: "training" | "exam";
  }) => void
}

export function SolidQuiz({ subjectKey, questionCount, timeLimit, onBack, onComplete }: SolidQuizProps) {
  const subject = getSubjectByKey(subjectKey)

  const questions = useMemo(() => {
    let pool: Question[]
    if (subjectKey === "english") {
      pool = mappedEnglishJson
    } else if (subjectKey === "mathematics") {
      pool = mappedMathsJson
    } else if (subjectKey === "crs") {
      pool = mappedCrsJson
    } else if (subjectKey === "bst") {
      pool = mappedBstJson
    } else if (subjectKey === "pvs") {
      pool = mappedPvsJson
    } else if (subjectKey === "business") {
      pool = mappedBussJson
    } else if (subjectKey === "nve") {
      pool = mappedNveJson
    } else if (subjectKey === "cca") {
      pool = mappedCcaJson
    } else if (subjectKey === "history") {
      pool = mappedHistoryJson
    } else if (subjectKey === "french") {
      pool = mappedFrenchJson
    } else if (subjectKey === "yoruba") {
      pool = mappedYorubaJson
    } else if (subjectKey === "igbo") {
      pool = mappedIgboJson
    } else {
      pool = getQuestionsForSubject(subjectKey, ALL_QUESTIONS)
    }
    const shuffled = shuffleArray(pool)
    return shuffled.slice(0, Math.min(questionCount, shuffled.length))
  }, [subjectKey, questionCount])

  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null))
  const [timeLeft, setTimeLeft] = useState(timeLimit * 60)
  const [submitted, setSubmitted] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showStartWarning, setShowStartWarning] = useState(true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const q = questions[currentIdx]

  // Timer
  useEffect(() => {
    if (submitted || showStartWarning) return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [submitted, showStartWarning])

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !submitted) handleSubmit()
  }, [timeLeft, submitted])

  const handleSelect = (idx: number) => {
    if (submitted) return
    const newAnswers = [...answers]
    newAnswers[currentIdx] = idx
    setAnswers(newAnswers)
  }

  const handleSubmit = useCallback(() => {
    setSubmitted(true)
    if (timerRef.current) clearInterval(timerRef.current)
    const correct = questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0)
    onComplete({
      subject: subject.name,
      topic: "Solid Q — Full Syllabus",
      total: questions.length,
      correct,
      questions,
      answers,
      mode: "exam",
    })
  }, [questions, answers, subject.name, onComplete])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const isLowTime = timeLeft < 300 // less than 5 minutes
  const answeredCount = answers.filter((a) => a !== null).length

  if (!q) return null

  const TextRenderer = MathText

  return (
    <div className="flex flex-col min-h-full pb-10">
      {showStartWarning && <QuizStartWarning onConfirm={() => setShowStartWarning(false)} />}
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 glass-strong">
        <div className="flex items-center justify-between px-5 pt-12 lg:pt-6 pb-3 max-w-2xl mx-auto w-full">
          <button onClick={onBack} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{subject.name}</p>
            <p className="text-sm font-semibold text-foreground">Q {currentIdx + 1}/{questions.length}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${isLowTime ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse" : "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]"}`}>
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold text-sm tracking-wide">{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
          </div>
        </div>
        {/* Progress dots */}
        <div className="px-5 pb-3 flex gap-0.5 overflow-x-auto glass-scrollbar max-w-2xl mx-auto w-full">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`w-6 h-6 rounded text-[10px] font-bold shrink-0 transition-all ${
                i === currentIdx ? "bg-primary text-primary-foreground" :
                answers[i] !== null ? "bg-emerald-500/30 text-emerald-300" :
                "glass text-muted-foreground"
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
          <TextRenderer text={q.question} className="text-foreground text-base leading-relaxed font-medium" />
        </div>
      </div>

      {/* Options — no feedback, just select */}
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
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
              answers[currentIdx] === idx ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
            }`}>
              {String.fromCharCode(65 + idx)}
            </span>
            <TextRenderer text={opt} className="text-sm text-foreground text-left flex-1" />
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
              You&apos;ve answered <span className="text-foreground font-semibold">{answeredCount}</span> of{" "}
              <span className="text-foreground font-semibold">{questions.length}</span> questions.
              {answeredCount < questions.length && " Unanswered questions will be marked wrong."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 rounded-xl glass border border-white/10 text-foreground font-medium text-sm">
                Go Back
              </button>
              <button onClick={handleSubmit} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm">
                Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
