"use client"

import { ArrowLeft, ChevronRight, CheckCircle2 } from "lucide-react"
import { type SubjectKey, getSubjectByKey } from "@/lib/question-types"

interface QuestionCountPickerProps {
  subjectKey?: SubjectKey
  subjectLabel?: string
  counts?: { count: number; label: string; duration: string }[]
  onSelect: (count: number) => void
  onBack: () => void
}

export function QuestionCountPicker({ subjectKey, subjectLabel, counts, onSelect, onBack }: QuestionCountPickerProps) {
  const displaySubjectName = subjectLabel || (subjectKey ? getSubjectByKey(subjectKey).name : "Subject")
  const options = counts || [
    { count: 25, label: "Short Session", duration: "25 mins" },
    { count: 50, label: "Medium Session", duration: "50 mins" },
    { count: 100, label: "Full Exam Simulation", duration: "100 mins" },
  ]

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-white/5 mb-4">
        <div className="flex items-center gap-3 px-5 pt-12 lg:pt-6 pb-6 max-w-xl mx-auto">
          <button onClick={onBack} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <p className="text-xs text-muted-foreground">{displaySubjectName} Exam Practice</p>
            <h1 className="text-lg font-bold text-foreground">Select Exam Length</h1>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-3 max-w-xl mx-auto w-full">
        {options.map((opt) => (
          <button
            key={opt.count}
            onClick={() => onSelect(opt.count)}
            className="w-full flex items-center justify-between p-5 rounded-2xl glass border border-white/5 hover:border-primary/50 transition-all duration-200 group active:scale-[0.98]"
          >
            <div className="text-left">
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{opt.count} Questions</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {opt.duration}
                </span>
                <span className="text-xs text-muted-foreground">{opt.label}</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>

      <div className="mt-auto px-8 py-10 text-center max-w-xl mx-auto w-full">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <CheckCircle2 className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Choose a length that fits your study time. Each question is timed at 1 minute per question for the best exam preparation.
        </p>
      </div>
    </div>
  )
}
