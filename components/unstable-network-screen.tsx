"use client"

import { useEffect, useState } from "react"
import { Wifi, WifiOff, RefreshCw, ShieldCheck, Loader2 } from "lucide-react"

interface UnstableNetworkScreenProps {
  onRetry: () => Promise<boolean>
}

export function UnstableNetworkScreen({ onRetry }: UnstableNetworkScreenProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryFailed, setRetryFailed] = useState(false)
  const [dots, setDots] = useState("")

  // Animated dots while retrying
  useEffect(() => {
    if (!isRetrying) return
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."))
    }, 400)
    return () => clearInterval(interval)
  }, [isRetrying])

  const handleRetry = async () => {
    setIsRetrying(true)
    setRetryFailed(false)
    const success = await onRetry()
    setIsRetrying(false)
    if (!success) {
      setRetryFailed(true)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0d0f1e] px-6 relative overflow-hidden">
      {/* Background ambient glows */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, oklch(0.35 0.12 240 / 0.35) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 left-1/4 w-75 h-75 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, oklch(0.28 0.08 280 / 0.2) 0%, transparent 70%)",
        }}
      />

      {/* Card */}
      <div
        className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full text-center rounded-3xl px-8 py-10"
        style={{
          background: "oklch(0.13 0.03 250 / 0.85)",
          border: "1px solid oklch(0.35 0.06 240 / 0.5)",
          boxShadow:
            "0 24px 80px oklch(0.12 0.1 240 / 0.5), 0 0 0 1px oklch(0.35 0.06 240 / 0.2)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Icon */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute w-24 h-24 rounded-full animate-pulse"
            style={{
              background: "radial-gradient(circle, oklch(0.45 0.15 240 / 0.2) 0%, transparent 70%)",
            }}
          />
          <div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "oklch(0.18 0.06 240 / 0.8)",
              border: "1px solid oklch(0.4 0.1 240 / 0.3)",
            }}
          >
            <WifiOff className="w-8 h-8" style={{ color: "oklch(0.65 0.12 240)" }} />
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-2">
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ color: "oklch(0.92 0.02 240)" }}
          >
            Network Unstable
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "oklch(0.55 0.04 240)" }}>
            StudyOS needs a stable connection to safely load your data.
            We paused app access to protect your stats from being cleared.
          </p>
        </div>

        {/* Protection notice */}
        <div
          className="flex items-center gap-2.5 w-full rounded-xl px-4 py-3"
          style={{
            background: "oklch(0.22 0.08 170 / 0.25)",
            border: "1px solid oklch(0.45 0.1 170 / 0.3)",
          }}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: "oklch(0.65 0.14 170)" }} />
          <p className="text-xs font-medium text-left" style={{ color: "oklch(0.72 0.08 170)" }}>
            Your stats &amp; streak are safe. We blocked access to prevent accidental data loss.
          </p>
        </div>

        {/* Retry failed message */}
        {retryFailed && (
          <p className="text-xs font-medium" style={{ color: "oklch(0.65 0.18 20)" }}>
            Still no connection. Please check your network and try again.
          </p>
        )}

        {/* Retry button */}
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="flex items-center gap-2 w-full justify-center rounded-2xl px-6 py-3.5 font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: isRetrying
              ? "oklch(0.25 0.06 240 / 0.8)"
              : "linear-gradient(135deg, oklch(0.55 0.18 240), oklch(0.5 0.2 270))",
            color: "oklch(0.95 0.02 240)",
            boxShadow: isRetrying ? "none" : "0 4px 20px oklch(0.45 0.18 240 / 0.4)",
          }}
        >
          {isRetrying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking Connection{dots}</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>{retryFailed ? "Try Again" : "Retry Connection"}</span>
            </>
          )}
        </button>

        {/* Branding */}
        <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "oklch(0.38 0.04 240)" }}>
          StudyOS • Protecting Your Progress
        </p>
      </div>
    </div>
  )
}
