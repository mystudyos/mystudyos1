"use client"

import { useState } from "react"
import { ArrowLeft, Calendar, Check } from "lucide-react"
import {
  getSSSSubjectByKey,
  SSS_EXAM_OPTIONS,
  SSS_YEARS,
  type SSSExamType,
  type SSSSubjectKey,
} from "@/lib/sss-config"

interface SSSExamPickerProps {
  subjectKey: SSSSubjectKey
  mode: "training" | "solidq"
  onSelect: (examType: SSSExamType, year: string) => void
  onBack: () => void
}

export function SSSExamPicker({
  subjectKey,
  mode,
  onSelect,
  onBack,
}: SSSExamPickerProps) {
  const subject = getSSSSubjectByKey(subjectKey)
  const [selectedExam, setSelectedExam] = useState<SSSExamType>("wassce")
  const [selectedYear, setSelectedYear] = useState<string>("all")

  return (
    <div className="flex flex-col min-h-full pb-10">
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
              {subject.name} • {mode === "training" ? "Training Mode" : "Exam Practice"}
            </p>
            <h1 className="text-xl font-bold text-foreground line-clamp-1">
              Select Exam &amp; Year
            </h1>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 max-w-2xl mx-auto w-full space-y-6">
        {/* Exam Type Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            1. Choose Examination Body
          </label>
          <div className="space-y-3">
            {SSS_EXAM_OPTIONS.map((exam) => {
              const isSelected = selectedExam === exam.type
              return (
                <button
                  key={exam.type}
                  type="button"
                  onClick={() => setSelectedExam(exam.type)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "glass border-white/10 hover:border-primary/40"
                  }`}
                >
                  <div className="pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm sm:text-base">
                        {exam.label}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/15 text-primary">
                        {exam.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {exam.description}
                    </p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Year Filter */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            2. Examination Year (Optional)
          </label>
          <div className="relative">
            <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl glass border border-white/10">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-background text-foreground">
                  All Years (Random Mix 1988–2026)
                </option>
                {SSS_YEARS.map((y) => (
                  <option key={y} value={y} className="bg-background text-foreground">
                    {y} Past Questions
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Continue CTA */}
        <button
          type="button"
          onClick={() => onSelect(selectedExam, selectedYear)}
          className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          {mode === "training" ? "Start Training Session →" : "Continue to Exam Setup →"}
        </button>
      </div>
    </div>
  )
}
