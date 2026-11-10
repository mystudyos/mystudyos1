"use client"

import { AlertTriangle } from "lucide-react"

interface QuizStartWarningProps {
  onConfirm: () => void
}

export function QuizStartWarning({ onConfirm }: QuizStartWarningProps) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in fade-in duration-500">
      <div className="glass rounded-4xl p-8 max-w-sm w-full border border-white/10 shadow-2xl flex flex-col items-center text-center gap-6 scale-in-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30 animate-pulse">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>
        
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-foreground tracking-tighter italic">WARNING!</h2>
          <p className="text-sm text-muted-foreground leading-6 font-medium max-w-[24rem] mx-auto">
            You are about to begin your session. <span className="text-foreground font-bold underline decoration-amber-500/50">Do not exit or refresh</span> this page, or you will lose all your progress and have to start over.
          </p>
        </div>

        <button
          onClick={onConfirm}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all"
        >
          I Understand, Start Now
        </button>
      </div>

      <style jsx>{`
        .scale-in-center {
          animation: scale-in-center 0.4s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
        }
        @keyframes scale-in-center {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
