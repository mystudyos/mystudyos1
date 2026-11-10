"use client"

import { useState } from "react"
import { SUBJECTS, type SubjectKey } from "@/lib/question-types"
import { ArrowLeft, AlertCircle } from "lucide-react"

// Clean, lightweight component rendering only the typographic letter
const LetterIcon = ({ letter }: { letter: string }) => (
  <span className="font-bold text-base leading-none tracking-tight select-none">
    {letter}
  </span>
)

const SUBJECT_ICONS: Record<SubjectKey, React.ReactNode> = {
  mathematics: <LetterIcon letter="M" />,
  english: <LetterIcon letter="ENG" />,
  bst: <LetterIcon letter="BST" />,
  nve: <LetterIcon letter="NVE" />,
  pvs: <LetterIcon letter="PVS" />,
  cca: <LetterIcon letter="CCA" />,
  business: <LetterIcon letter="BUSS" />,
  french: <LetterIcon letter="F" />,
  crs: <LetterIcon letter="CRS" />,
  history: <LetterIcon letter="H" />,
  igbo: <LetterIcon letter="I" />,
  yoruba: <LetterIcon letter="Y" />,
}

const SUBJECT_COLORS: Record<SubjectKey, string> = {
  mathematics: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  english: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
  bst: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  nve: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  pvs: "from-rose-500/20 to-rose-600/10 border-rose-500/30",
  cca: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",
  business: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
  french: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  crs: "from-teal-500/20 to-teal-600/10 border-teal-500/30",
  history: "from-slate-500/20 to-slate-600/10 border-slate-500/30",
  igbo: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
  yoruba: "from-lime-500/20 to-lime-600/10 border-lime-500/30",
}

const SUBJECT_ICON_COLORS: Record<SubjectKey, string> = {
  mathematics: "text-blue-400",
  english: "text-amber-400",
  bst: "text-emerald-400",
  nve: "text-purple-400",
  pvs: "text-rose-400",
  cca: "text-indigo-400",
  business: "text-cyan-400",
  french: "text-orange-400",
  crs: "text-teal-400",
  history: "text-slate-400",
  igbo: "text-yellow-400",
  yoruba: "text-lime-400",
}

interface SubjectPickerProps {
  mode: "training" | "solidq"
  onSelect: (key: SubjectKey) => void
  onBack: () => void
}

export function SubjectPicker({ mode, onSelect, onBack }: SubjectPickerProps) {
  const [notPreparedSubject, setNotPreparedSubject] = useState<string | null>(null)

  const disabledSubjects: SubjectKey[] = []

  const handleSelect = (subject: (typeof SUBJECTS)[number]) => {
    if (disabledSubjects.includes(subject.key)) {
      setNotPreparedSubject(subject.name)
    } else {
      onSelect(subject.key)
    }
  }

  return (
    <div className="flex flex-col min-h-full relative pb-10">
      {/* Not Prepared Overlay */}
      {notPreparedSubject && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center px-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Not Prepared Yet</h2>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-70">
            We are still curating and verifying questions for <span className="text-foreground font-semibold">{notPreparedSubject}</span>. Please check back soon!
          </p>
          <button 
            onClick={onBack}
            className="w-full max-w-60 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-xl shadow-primary/20 active:scale-95 transition-all"
          >
            Back to Dashboard
          </button>
          <button 
            onClick={() => setNotPreparedSubject(null)}
            className="mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
          >
            Choose another subject
          </button>
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3 px-5 pt-12 lg:pt-6 pb-5 max-w-2xl mx-auto">
          <button onClick={onBack} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-0.5">
              {mode === "training" ? "Training Mode" : "Solid Q Mode"}
            </p>
            <h1 className="text-xl font-bold text-foreground line-clamp-1">Choose a Subject</h1>
          </div>
        </div>
      </div>

      {/* Mode description */}
      <div className="px-5 mb-5 mt-5 max-w-2xl mx-auto w-full">
        <div className="glass rounded-2xl p-4 border border-white/5">
          {mode === "training" ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">Learning Zone</span> — Pick a subject, then choose a specific topic. No timer.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">Exam Simulation</span> — Choose your test length. 1 minute per question.
            </p>
          )}
        </div>
      </div>

      {/* Subject cards */}
      <div className="px-5 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 max-w-2xl mx-auto w-full">
        {SUBJECTS.map((subject) => (
          <button
            key={subject.key}
            onClick={() => handleSelect(subject)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border bg-linear-to-r ${SUBJECT_COLORS[subject.key]} hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]`}
          >
            <div className={`w-12 h-12 rounded-xl glass flex items-center justify-center ${SUBJECT_ICON_COLORS[subject.key]}`}>
              {SUBJECT_ICONS[subject.key]}
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-foreground">{subject.name}</p>
              {mode === "solidq" && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose 25, 50, or 100 questions
                </p>
              )}
            </div>
            <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
          </button>
        ))}
      </div>
    </div>
  )
}
