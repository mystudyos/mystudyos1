"use client"

import { useState } from "react"
import { ArrowLeft, Clock, Timer, Check } from "lucide-react"

interface TimeLimitPickerProps {
  onSelect: (minutes: number) => void
  onBack: () => void
  questionCount: number
}

const SUGGESTED_TIMES = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2 hours", value: 120 },
]

export function TimeLimitPicker({ onSelect, onBack, questionCount }: TimeLimitPickerProps) {
  const [customMinutes, setCustomMinutes] = useState<number>(questionCount) // Default to 1 min per question

  return (
    <div className="min-h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 py-6 lg:py-4">
        <div className="flex items-center gap-4 max-w-xl mx-auto w-full px-6">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full glass flex items-center justify-center text-foreground/80 hover:text-foreground hover:scale-105 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Time Limit</h1>
            <p className="text-sm text-muted-foreground">How long do you need?</p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-8 max-w-xl mx-auto w-full">
        {/* Suggested Times - Grid Style */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Timer className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Suggested</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {SUGGESTED_TIMES.map((time) => (
              <button
                key={time.value}
                onClick={() => onSelect(time.value)}
                className="relative group p-4 rounded-2xl glass border border-white/5 hover:border-primary/30 transition-all text-left overflow-hidden"
              >
                <div className="relative z-10">
                  <p className="text-lg font-bold">{time.label}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                    {Math.round(time.value / (questionCount || 1))} min/q
                  </p>
                </div>
                <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Check className="w-4 h-4 text-primary" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Apple Style Wheel-ish Custom Picker */}
        <section className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Custom Limit</span>
          </div>
          
          <div className="glass rounded-4xl p-8 border border-white/5 flex flex-col items-center gap-6">
             <div className="flex items-end gap-3">
                <input 
                  type="number"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 bg-transparent text-4xl font-bold text-center border-b-2 border-primary/20 focus:border-primary focus:outline-none transition-colors"
                />
                <span className="text-2xl font-semibold text-muted-foreground mb-2">min</span>
             </div>
             
             <button
              onClick={() => onSelect(customMinutes)}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground uppercase font-bold text-sm shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all"
             >
               Start Practice
             </button>
          </div>
        </section>
      </div>

      <footer className="mt-8 text-center text-[10px] text-black uppercase tracking-[0.2em] opacity-50 max-w-xl mx-auto w-full">
        StudyOS • Time Management
      </footer>
    </div>
  )
}
