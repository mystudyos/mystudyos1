"use client"

import { useState } from "react"
import { ArrowLeft, CheckCircle2, XCircle, Trophy, Lightbulb, Award, Loader2 } from "lucide-react"
import { type Survey, type SurveyQuestion } from "@/lib/surveys"
import { recordSurveyResult } from "@/lib/user-stats"
import confetti from "canvas-confetti"

interface SurveyQuizProps {
  survey: Survey
  userId: string
  onBack: () => void
  onComplete: () => void
}

export function SurveyQuiz({ survey, userId, onBack, onComplete }: SurveyQuizProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(survey.questions.length).fill(null))
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFinished, setIsFinished] = useState(false)

  const questions = survey.questions
  const q = questions[currentIdx]

  const handleSelect = (idx: number) => {
    if (answered) return
    setSelectedOption(idx)
    setAnswered(true)

    const updatedAnswers = [...answers]
    updatedAnswers[currentIdx] = idx
    setAnswers(updatedAnswers)

    if (idx === q.correctIndex) {
      setScore((s) => s + 1)
    }
  }

  const handleNext = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((idx) => idx + 1)
      setSelectedOption(null)
      setAnswered(false)
    } else {
      setIsSubmitting(true)
      try {
        const finalScore = score + (selectedOption === q.correctIndex ? 1 : 0)
        await recordSurveyResult(userId, survey.id, finalScore, questions.length, [
          ...answers.slice(0, -1),
          selectedOption,
        ])
        
        // Trigger confetti celebration!
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#6366f1", "#f59e0b", "#10b981", "#ec4899"]
        })

        setIsFinished(true)
      } catch (err) {
        console.error("Failed to save survey results:", err)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const getOptionClass = (idx: number) => {
    if (!answered) {
      return "glass border border-white/10 hover:border-primary/50 hover:bg-white/5 active:scale-[0.99]"
    }
    if (idx === q.correctIndex) {
      return "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
    }
    if (idx === selectedOption) {
      return "bg-red-500/20 border border-red-500/50 text-red-300"
    }
    return "glass border border-white/5 opacity-40 cursor-default"
  }

  const progress = ((currentIdx + 1) / questions.length) * 100
  const isCorrect = selectedOption === q.correctIndex

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100)
    const grade = percentage >= 80 ? "A" : percentage >= 60 ? "B" : percentage >= 40 ? "C" : "D"
    const isPerfect = score === questions.length

    return (
      <div className="flex flex-col min-h-full max-w-lg mx-auto px-5 pt-12 lg:pt-6 pb-8 items-center justify-center animate-in fade-in duration-300">
        <div className="absolute w-64 h-64 rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
        
        <div className="glass rounded-4xl border border-white/10 p-8 w-full text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-primary/5 pointer-events-none" />
          
          <div className="w-16 h-16 rounded-2xl bg-amber-400/15 flex items-center justify-center mx-auto mb-6 border border-amber-400/20 shadow-[0_0_24px_rgba(251,191,36,0.25)] animate-bounce">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>

          <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">Trivia Completed!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You completed the <span className="font-bold text-primary">{survey.title}</span>.
          </p>

          <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
              <circle 
                cx="60" cy="60" 
                r="50" 
                fill="none" 
                strokeWidth="8" 
                strokeLinecap="round"
                className="stroke-primary"
                strokeDasharray={`${(percentage / 100) * 314} 314`}
                style={{ transition: "stroke-dasharray 1s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-foreground">{score} / {questions.length}</span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Grade {grade}</span>
            </div>
          </div>

          {isPerfect && (
            <div className="flex items-center gap-1.5 justify-center text-xs font-bold text-amber-400 mb-6 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full w-fit mx-auto">
              <Award className="w-3.5 h-3.5" /> Perfect Score! Mastermind Status
            </div>
          )}

          <button
            onClick={onComplete}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/25"
          >
            Back to Surveys
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full w-full max-w-lg mx-auto px-5 pt-12 lg:pt-6 pb-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          disabled={true}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center opacity-30 cursor-not-allowed"
          title="Navigation is disabled during trivia"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest line-clamp-1">{survey.title}</p>
          <p className="text-xs font-semibold text-foreground">Question {currentIdx + 1} of {questions.length}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mb-6">
        <div 
          className="h-full rounded-full bg-linear-to-r from-primary to-primary/60 transition-all duration-500" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* Question Card */}
      <div className="glass rounded-[1.75rem] p-6 border border-white/10 mb-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full bg-white/2 pointer-events-none" />
        <p className="text-foreground text-[15px] font-semibold leading-relaxed">
          {q.text}
        </p>
      </div>

      {/* Options List */}
      <div className="space-y-3 mb-6">
        {q.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            disabled={answered || isSubmitting}
            className={`w-full flex items-center gap-3.5 p-4 rounded-2xl text-left transition-all duration-300 ${getOptionClass(idx)}`}
          >
            <span className="w-7 h-7 rounded-xl glass border border-white/5 flex items-center justify-center text-xs font-bold text-muted-foreground/80 shrink-0">
              {String.fromCharCode(65 + idx)}
            </span>
            <span className="text-sm font-semibold text-foreground flex-1 pr-2">
              {opt}
            </span>
            {answered && idx === q.correctIndex && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            {answered && idx === selectedOption && !isCorrect && (
              <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
          </button>
        ))}
      </div>

      {/* Answer feedback and trivia explanation */}
      {answered && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
          <div className={`rounded-2xl p-4 border text-center text-xs font-bold uppercase tracking-wider ${
            isCorrect 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {isCorrect ? "🎉 Excellent! Correct Answer" : `❌ Incorrect — correct answer is ${String.fromCharCode(65 + q.correctIndex)}`}
          </div>

          <div className="glass rounded-2xl p-5 border border-white/10 bg-primary/5">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-2">
              <Lightbulb className="w-4 h-4" /> Did you know?
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed font-medium">
              {q.explanation}
            </p>
          </div>

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting Results...
              </>
            ) : currentIdx < questions.length - 1 ? (
              "Next Question →"
            ) : (
              "Complete & Submit"
            )}
          </button>
        </div>
      )}
    </div>
  )
}
