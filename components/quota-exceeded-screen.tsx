"use client"

import { useState } from "react"
import { AlertTriangle, ShieldCheck, RefreshCw, Database, ArrowRight } from "lucide-react"

interface QuotaExceededScreenProps {
  onRetry: () => Promise<void> | void
  onContinueOffline?: () => void
  hasLocalData?: boolean
}

export function QuotaExceededScreen({
  onRetry,
  onContinueOffline,
  hasLocalData = false,
}: QuotaExceededScreenProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setTimeout(() => setIsRetrying(false), 1200)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0b16] px-6 relative overflow-hidden text-white">
      {/* Background ambient glows */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-140 h-140 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, oklch(0.5 0.22 30 / 0.25) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, oklch(0.6 0.18 200 / 0.15) 0%, transparent 70%)",
        }}
      />

      {/* Main card */}
      <div
        className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full text-center rounded-3xl p-8 sm:p-10"
        style={{
          background: "oklch(0.14 0.03 260 / 0.9)",
          border: "1px solid oklch(0.45 0.18 30 / 0.4)",
          boxShadow:
            "0 24px 80px oklch(0.1 0.15 30 / 0.4), 0 0 0 1px oklch(0.5 0.18 30 / 0.2)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Animated Warning Icon */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute w-28 h-28 rounded-full animate-ping opacity-25"
            style={{
              background: "radial-gradient(circle, oklch(0.6 0.22 30 / 0.4) 0%, transparent 70%)",
            }}
          />
          <div
            className="relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl"
            style={{
              background: "oklch(0.2 0.08 30 / 0.9)",
              border: "1px solid oklch(0.55 0.2 30 / 0.5)",
            }}
          >
            <Database className="w-10 h-10 text-amber-400" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-500 border-2 border-[#0a0b16] flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-white stroke-3" />
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-1.5 self-center px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
            High Server Traffic
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            Traffic Limit Reached
          </h1>
        </div>

        {/* Data Protection Reassurance Banner */}
        <div
          className="flex items-start gap-3 w-full rounded-2xl p-4 text-left border"
          style={{
            background: "oklch(0.2 0.05 160 / 0.3)",
            borderColor: "oklch(0.5 0.15 160 / 0.4)",
          }}
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-emerald-300">Your Data is 100% Safe</h4>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full mt-2">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full py-3.5 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
            <span>{isRetrying ? "Checking Service Status..." : "Check Status & Retry"}</span>
          </button>

          {hasLocalData && onContinueOffline && (
            <button
              onClick={onContinueOffline}
              className="w-full py-3 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer border border-white/10"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
