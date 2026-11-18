"use client"

import { useState } from "react"
import { ArrowLeft, AlertCircle, Check, Crown, FileText, ListChecks, Lock } from "lucide-react"
import {
  getSSSSubjectByKey,
  isSSSExamProOnly,
  isSSSPaperAvailable,
  SSS_EXAM_OPTIONS,
  type SSSExamType,
  type SSSPaperType,
  type SSSSubjectKey,
} from "@/lib/sss-config"

interface SSSExamPickerProps {
  subjectKey: SSSSubjectKey
  mode: "training" | "solidq"
  isPro?: boolean
  onSelect: (examType: SSSExamType, paperType: SSSPaperType) => void
  onBack: () => void
  onBackToDashboard?: () => void
  onGoToPro?: () => void
}

export function SSSExamPicker({
  subjectKey,
  mode,
  isPro = false,
  onSelect,
  onBack,
  onBackToDashboard,
  onGoToPro,
}: SSSExamPickerProps) {
  const subject = getSSSSubjectByKey(subjectKey)
  const visibleExams = SSS_EXAM_OPTIONS.filter((e) => e.enabled)
  const firstAvailableExam =
    visibleExams.find((e) => isSSSPaperAvailable(subjectKey, e.type, "objective"))?.type ||
    visibleExams[0]?.type ||
    "neco"
  const [selectedExam, setSelectedExam] = useState<SSSExamType>(firstAvailableExam)
  const [selectedPaper, setSelectedPaper] = useState<SSSPaperType>("objective")
  const [notAvailablePaper, setNotAvailablePaper] = useState<string | null>(null)
  const [proLockLabel, setProLockLabel] = useState<string | null>(null)

  const currentExamOption = visibleExams.find((e) => e.type === selectedExam)
  const supportsTheory = currentExamOption?.supportsTheory ?? false

  const handleContinue = () => {
    if (isSSSExamProOnly(subjectKey, selectedExam, selectedPaper) && !isPro) {
      setProLockLabel(`${subject.name} (${currentExamOption?.label || "JAMB"}) Objective`)
      return
    }
    if (!isSSSPaperAvailable(subjectKey, selectedExam, selectedPaper)) {
      const label =
        selectedPaper === "theory"
          ? `${subject.name} (Theory)`
          : `${subject.name} (${currentExamOption?.label || selectedExam.toUpperCase()})`
      setNotAvailablePaper(label)
      return
    }
    onSelect(selectedExam, selectedPaper)
  }

  return (
    <div className="flex flex-col min-h-full relative pb-10">
      {/* Pro Required Overlay */}
      {proLockLabel && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center px-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-6">
            <Crown className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">StudyOS Pro Required</h2>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-75">
            <span className="text-foreground font-semibold">{proLockLabel}</span>{" "}
            is locked for Free users. Upgrade to StudyOS Pro to unlock full JAMB English CBT practice!
          </p>
          <button
            onClick={() => {
              setProLockLabel(null)
              onGoToPro?.()
            }}
            className="w-full max-w-64 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            Upgrade to Pro
          </button>
          <button
            onClick={() => setProLockLabel(null)}
            className="mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors cursor-pointer"
          >
            Choose another option
          </button>
        </div>
      )}
      {/* Not Available Now Overlay */}
      {notAvailablePaper && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center px-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Not Available Now</h2>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-70">
            Exam practice questions for{" "}
            <span className="text-foreground font-semibold">{notAvailablePaper}</span>{" "}
            are not available right now. Please check back soon!
          </p>
          <button
            onClick={onBackToDashboard || onBack}
            className="w-full max-w-60 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-xl shadow-primary/20 active:scale-95 transition-all cursor-pointer"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => setNotAvailablePaper(null)}
            className="mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors cursor-pointer"
          >
            Choose another option
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
              {subject.name} • {mode === "training" ? "Training Mode" : "Exam Practice"}
            </p>
            <h1 className="text-xl font-bold text-foreground line-clamp-1">
              Select Exam &amp; Paper Type
            </h1>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 max-w-2xl mx-auto w-full space-y-6">
        {/* Exam Type Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            1. Examination Body
          </label>
          <div className="space-y-3">
            {visibleExams.map((exam) => {
              const isSelected = selectedExam === exam.type
              const examHasObjective = isSSSPaperAvailable(subjectKey, exam.type, "objective")
              const isProLocked = isSSSExamProOnly(subjectKey, exam.type, "objective")
              return (
                <button
                  key={exam.type}
                  type="button"
                  onClick={() => {
                    setSelectedExam(exam.type)
                    if (!exam.supportsTheory) {
                      setSelectedPaper("objective")
                    }
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "glass border-white/10 hover:border-primary/40"
                  }`}
                >
                  <div className="pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-sm sm:text-base">
                        {exam.label}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/15 text-primary">
                        {exam.badge}
                      </span>
                      {isProLocked && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30">
                          {isPro ? <Crown className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          Pro
                        </span>
                      )}
                      {!examHasObjective && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500">
                          Soon
                        </span>
                      )}
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

        {/* Paper Type Selection (Objective 20/40/60 vs Theory, except JAMB) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            2. Paper Format
          </label>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setSelectedPaper("objective")}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPaper === "objective"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "glass border-white/10 hover:border-primary/40"
              }`}
            >
              <div className="flex items-start gap-3 pr-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <ListChecks className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm sm:text-base">
                      Objective (OBJ)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Timed multiple-choice CBT practice
                  </p>
                </div>
              </div>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                  selectedPaper === "objective"
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/40"
                }`}
              >
                {selectedPaper === "objective" && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </div>
            </button>

            {supportsTheory && (
              <button
                type="button"
                onClick={() => setSelectedPaper("theory")}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedPaper === "theory"
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "glass border-white/10 hover:border-primary/40"
                }`}
              >
                <div className="flex items-start gap-3 pr-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm sm:text-base">
                        Theory (Essay)
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500">
                        Soon
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Structured scheme practice.
                    </p>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                    selectedPaper === "theory"
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  }`}
                >
                  {selectedPaper === "theory" && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Continue CTA */}
        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          CONTINUE
        </button>
      </div>
    </div>
  )
}
