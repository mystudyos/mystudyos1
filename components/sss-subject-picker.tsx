"use client"

import { useState } from "react"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { SSS_SUBJECTS, isSSSSubjectAvailable, type SSSSubjectKey } from "@/lib/sss-config"

const LetterIcon = ({ letter }: { letter: string }) => (
  <span className="font-bold text-base leading-none tracking-tight select-none">
    {letter}
  </span>
)

interface SSSSubjectPickerProps {
  onSelect: (key: SSSSubjectKey) => void
  onBack: () => void
}

export function SSSSubjectPicker({ onSelect, onBack }: SSSSubjectPickerProps) {
  const [notAvailableSubject, setNotAvailableSubject] = useState<string | null>(null)

  return (
    <div className="flex flex-col min-h-full relative pb-10">
      {/* Not Available Now Overlay */}
      {notAvailableSubject && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center px-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Not Available Now</h2>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-70">
            Exam practice questions for{" "}
            <span className="text-foreground font-semibold">{notAvailableSubject}</span>{" "}
            are not available right now. Please check back soon!
          </p>
          <button
            onClick={onBack}
            className="w-full max-w-60 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-xl shadow-primary/20 active:scale-95 transition-all cursor-pointer"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => setNotAvailableSubject(null)}
            className="mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors cursor-pointer"
          >
            Choose another subject
          </button>
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3 px-5 pt-12 lg:pt-6 pb-5 max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl glass flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-0.5">
              Solid Q Mode • SSS
            </p>
            <h1 className="text-xl font-bold text-foreground line-clamp-1">
              Choose a Subject (27)
            </h1>
          </div>
        </div>
      </div>

      {/* Mode description */}
      <div className="px-5 mb-5 mt-5 max-w-2xl mx-auto w-full">
        <div className="glass rounded-2xl p-4 border border-white/5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Exam Simulation</span> — Pick an available SSS subject, choose Objective or Theory, and test yourself under real exam conditions.
          </p>
        </div>
      </div>

      {/* Subject cards */}
      <div className="px-5 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 max-w-2xl mx-auto w-full">
        {SSS_SUBJECTS.map((subject) => {
          const available = isSSSSubjectAvailable(subject.key)
          return (
            <button
              key={subject.key}
              onClick={() => {
                if (available) {
                  onSelect(subject.key)
                } else {
                  setNotAvailableSubject(subject.name)
                }
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border bg-linear-to-r ${subject.cardGradient} hover:scale-[1.02] transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                !available ? "opacity-75" : ""
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl glass flex items-center justify-center ${subject.color}`}
              >
                <LetterIcon letter={subject.letter} />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-foreground">{subject.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {available ? "NECO • Objective" : "Coming Soon"}
                </p>
              </div>
              <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
