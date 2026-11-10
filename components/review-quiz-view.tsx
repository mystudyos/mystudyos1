"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, CheckCircle2, XCircle, Info, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import type { Question } from "@/lib/question-types"
import { MathText } from "./math-text"

interface ReviewQuizViewProps {
  quizTitle: string
  questions: Question[]
  userAnswers: (number | null)[]
  onBack: () => void
}

export function ReviewQuizView({ quizTitle, questions, userAnswers, onBack }: ReviewQuizViewProps) {
  const [filter, setFilter] = useState<"all" | "wrong">("wrong")

  const filteredQuestions = useMemo(() => {
    return questions.map((q, i) => ({ q, i }))
      .filter(({ q, i }) => filter === "all" || userAnswers[i] !== q.correctIndex)
  }, [questions, userAnswers, filter])

  const stats = useMemo(() => {
    const wrong = userAnswers.filter((ans, i) => ans !== questions[i].correctIndex).length
    return { total: questions.length, wrong }
  }, [questions, userAnswers])

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-xl z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-5 pt-12 pb-5">
          <button onClick={onBack} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{quizTitle}</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Reviewing your answers</p>
          </div>
        </div>
      </div>

      {/* Stats & Filter */}
      <div className="px-5 mb-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 p-1 bg-foreground/5 rounded-xl mb-4">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filter === "all" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter("wrong")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filter === "wrong" ? "bg-background text-red-400 shadow-sm" : "text-muted-foreground"}`}
          >
            Wrong ({stats.wrong})
          </button>
        </div>

        {filter === "wrong" && stats.wrong === 0 && (
          <div className="glass rounded-2xl p-8 text-center border border-emerald-500/20">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-foreground font-bold">Perfect Score!</h3>
            <p className="text-sm text-muted-foreground mt-1">You didn&apos;t get any questions wrong in this session.</p>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="px-5 space-y-4 max-w-2xl mx-auto w-full">
        {filteredQuestions.map(({ q, i }) => {
          const isCorrect = userAnswers[i] === q.correctIndex
          
          return (
            <div 
              key={`${q.id}-${i}`}
              className={`glass rounded-2xl border overflow-hidden transition-all ${isCorrect ? "border-white/5" : "border-red-500/20"}`}
            >
              <div className="w-full p-4 flex flex-col gap-3 text-left">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col mb-2 gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">Question {i + 1}</span>
                        <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-tight truncate max-w-37.5">{q.topic}</span>
                      </div>
                    </div>
                    <div className="text-[13px] text-foreground font-semibold leading-snug mb-2">
                      <MathText text={q.question} />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pl-8">
                  {/* Options */}
                  {q.options.length > 0 && (
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const isUserChoice = userAnswers[i] === optIdx
                        const isCorrectAnswer = q.correctIndex === optIdx
                        
                        let stateStyles = "bg-white/5 border-transparent opacity-60"
                        if (isCorrectAnswer) stateStyles = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold"
                        else if (isUserChoice && !isCorrectAnswer) stateStyles = "bg-red-500/10 border-red-500/30 text-red-400"

                        return (
                          <div 
                            key={optIdx}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-[11px] transition-all ${stateStyles}`}
                          >
                            <span className="w-4 h-4 rounded-md bg-white/5 flex items-center justify-center text-[9px] shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <div className="flex-1">
                               <MathText text={opt} />
                            </div>
                            {isCorrectAnswer && <CheckCircle2 className="w-3 h-3" />}
                            {isUserChoice && !isCorrectAnswer && <XCircle className="w-3 h-3" />}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
