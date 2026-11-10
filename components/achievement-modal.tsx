"use client"

import { Trophy, Star, X } from "lucide-react"
import { useEffect } from "react"
import confetti from "canvas-confetti"

interface AchievementModalProps {
  title: string
  streak: number
  onClose: () => void
}

export function AchievementModal({ title, streak, onClose }: AchievementModalProps) {
  useEffect(() => {
    // Fire confetti!
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
    }, 250)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm glass-strong rounded-[2.5rem] border border-primary/30 p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-20 h-20 rounded-full bg-linear-to-tr from-primary to-amber-400 mx-auto mb-6 flex items-center justify-center shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)]">
          <Trophy className="w-10 h-10 text-white animate-bounce" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">Achievement Unlocked!</h2>
        <p className="text-primary font-semibold text-lg mb-4">{title}</p>
        
        <div className="glass rounded-2xl p-4 border border-white/5 mb-6 flex items-center justify-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Current Streak</p>
            <p className="text-2xl font-black text-foreground">{streak} 🔥</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-left">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Status</p>
            <p className="text-sm font-bold text-emerald-400 flex items-center gap-1">
              <Star className="w-3 h-3" /> STUDY LEGEND
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
        >
          Claim Reward
        </button>
      </div>
    </div>
  )
}
