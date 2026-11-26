"use client"

import { useState } from "react"
import { ArrowLeft, Check, X } from "lucide-react"
import {
  getSSSExamLabel,
  getSSSObjectiveSubjectsForExam,
  getSSSSubjectByKey,
  type SSSExamType,
  type SSSPaperType,
  type SSSSubjectKey,
} from "@/lib/sss-config"

const LetterIcon = ({ letter }: { letter: string }) => (
  <span className="font-bold text-base leading-none tracking-tight select-none">
    {letter}
  </span>
)

const JAMB_REQUIRED_COUNT = 4

interface SSSSubjectPickerProps {
  examType: SSSExamType
  paperType?: SSSPaperType
  initialSelectedSubjects?: SSSSubjectKey[]
  onSelect: (key: SSSSubjectKey) => void
  onSelectMultiple?: (keys: SSSSubjectKey[]) => void
  onBack: () => void
}

export function SSSSubjectPicker({
  examType,
  paperType = "objective",
  initialSelectedSubjects = [],
  onSelect,
  onSelectMultiple,
  onBack,
}: SSSSubjectPickerProps) {
  const examLabel = getSSSExamLabel(examType)
  const paperLabel = paperType === "theory" ? "Theory" : "Objective"
  const isJambMulti = examType === "utme"
  const availableSubjects = getSSSObjectiveSubjectsForExam(examType)

  const [selectedSubjects, setSelectedSubjects] = useState<SSSSubjectKey[]>(() =>
    isJambMulti
      ? initialSelectedSubjects
          .filter((k) => availableSubjects.some((s) => s.key === k))
          .slice(0, JAMB_REQUIRED_COUNT)
      : []
  )

  const toggleJambSubject = (key: SSSSubjectKey) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(key)) {
        return prev.filter((item) => item !== key)
      }
      if (prev.length >= JAMB_REQUIRED_COUNT) {
        return prev
      }
      return [...prev, key]
    })
  }

  return (
    <div className={`flex flex-col min-h-full relative ${isJambMulti ? "pb-36" : "pb-10"}`}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between gap-3 px-5 pt-12 lg:pt-6 pb-5 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl glass flex items-center justify-center shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-0.5 truncate">
                {examLabel} • {paperLabel} • SSS
              </p>
              <h1 className="text-xl font-bold text-foreground line-clamp-1">
                {isJambMulti ? "Select 4 Subjects" : "Choose a Subject"}
              </h1>
            </div>
          </div>

          {isJambMulti && (
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-bold border shrink-0 transition-colors ${
                selectedSubjects.length === JAMB_REQUIRED_COUNT
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "glass text-foreground border-border"
              }`}
            >
              {selectedSubjects.length} of {JAMB_REQUIRED_COUNT}
            </div>
          )}
        </div>
      </div>

      {/* Mode description & JAMB selected chips */}
      <div className="px-5 mb-5 mt-5 max-w-2xl mx-auto w-full space-y-3">
        <div className="glass rounded-2xl p-4 border border-white/5">
          {isJambMulti ? (
            <div className="space-y-2.5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="text-foreground font-medium">JAMB CBT</span>: Pick{" "}
                <span className="text-foreground font-semibold">4 subjects</span> to practice.
              </p>

              {selectedSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedSubjects.map((key) => {
                    const subj = getSSSSubjectByKey(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleJambSubject(key)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/12 text-primary border border-primary/30 text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        <span>{subj.shortName}</span>
                        <X className="w-3 h-3" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">{examLabel}</span>: Pick an available subject to choose your question count and time limit.
            </p>
          )}
        </div>
      </div>

      {/* Subject cards */}
      <div className="px-5 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 max-w-2xl mx-auto w-full">
        {availableSubjects.map((subject) => {
          const isSelected = isJambMulti && selectedSubjects.includes(subject.key)
          const isMaxBlocked =
            isJambMulti &&
            !isSelected &&
            selectedSubjects.length >= JAMB_REQUIRED_COUNT

          return (
            <button
              key={subject.key}
              type="button"
              disabled={isMaxBlocked}
              onClick={() => {
                if (isJambMulti) {
                  toggleJambSubject(subject.key)
                } else {
                  onSelect(subject.key)
                }
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border bg-linear-to-r ${subject.cardGradient} transition-all duration-200 ${
                isSelected
                  ? "ring-2 ring-primary border-primary scale-[1.01]"
                  : isMaxBlocked
                    ? "opacity-45 cursor-not-allowed"
                    : "hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl glass flex items-center justify-center ${subject.color}`}
              >
                <LetterIcon letter={subject.letter} />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{subject.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isSelected
                    ? "Selected • Tap to remove"
                    : `${examLabel} ${paperLabel}`}
                </p>
              </div>
              {isJambMulti ? (
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40 bg-background/40"
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </div>
              ) : (
                <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 shrink-0" />
              )}
            </button>
          )
        })}
      </div>

      {/* JAMB 4-subject Sticky Start Bar */}
      {isJambMulti && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto flex justify-center">
            <button
              type="button"
              disabled={selectedSubjects.length !== JAMB_REQUIRED_COUNT}
              onClick={() => {
                if (selectedSubjects.length === JAMB_REQUIRED_COUNT) {
                  onSelectMultiple?.(selectedSubjects)
                }
              }}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm uppercase tracking-wider shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer text-center"
            >
              Start
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
