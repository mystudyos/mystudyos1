"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { LogOut, X, AlertCircle } from "lucide-react"

interface ExitConfirmDialogProps {
  onExit?: () => void
  timeoutMs?: number
}

/**
 * Triggers the exit prompt programmatically from anywhere in the app
 */
export function requestAppExit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("studyos:request-exit"))
  }
}

export function ExitConfirmDialog({
  onExit,
  timeoutMs = 3000,
}: ExitConfirmDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState(timeoutMs)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isExitingRef = useRef(false)
  const isOpenRef = useRef(false)

  // Keep ref synchronized with state to prevent stale closure in popstate listener
  isOpenRef.current = isOpen

  const closeDialog = useCallback(() => {
    setIsOpen(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const handleActualExit = useCallback(() => {
    closeDialog()

    if (onExit) {
      onExit()
      return
    }

    if (typeof window !== "undefined") {
      window.location.href = "/"
    }
  }, [closeDialog, onExit])

  const triggerExitPrompt = useCallback(() => {
    // Dismiss mobile soft keyboard if open
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

    // If dialog is already open and user presses back / exit again -> confirm exit!
    if (isOpenRef.current) {
      handleActualExit()
      return
    }

    // First press: Restore history guard entry so browser doesn't close on first press
    try {
      window.history.pushState({ studyos_exit_guard: true }, "")
    } catch {
      // Ignore pushState errors
    }

    setIsOpen(true)
    setTimeLeft(timeoutMs)

    // Clear existing timers
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)

    const startTime = Date.now()
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, timeoutMs - elapsed)
      setTimeLeft(remaining)
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }, 50)

    timerRef.current = setTimeout(() => {
      closeDialog()
    }, timeoutMs)
  }, [closeDialog, handleActualExit, timeoutMs])

  useEffect(() => {
    if (typeof window === "undefined") return

    // Ensure initial entry exists in history stack to catch back button
    try {
      window.history.pushState({ studyos_exit_guard: true }, "")
    } catch {
      // Ignore
    }

    const onPopState = () => {
      if (isExitingRef.current) return
      triggerExitPrompt()
    }

    const onRequestExit = () => {
      triggerExitPrompt()
    }

    window.addEventListener("popstate", onPopState)
    window.addEventListener("studyos:request-exit", onRequestExit)

    return () => {
      window.removeEventListener("popstate", onPopState)
      window.removeEventListener("studyos:request-exit", onRequestExit)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [triggerExitPrompt])

  if (!isOpen) return null

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / timeoutMs) * 100))

  return (
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={closeDialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-dialog-title"
    >
      <div
        className="relative w-full max-w-xs rounded-3xl bg-background/95 dark:bg-[#121526]/95 border border-border/80 dark:border-white/10 p-6 text-center shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Red Glow */}
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-36 h-36 rounded-full pointer-events-none opacity-30"
          style={{
            background: "radial-gradient(circle, oklch(0.65 0.22 25 / 0.5) 0%, transparent 70%)",
          }}
        />

        {/* Close Button */}
        <button
          onClick={closeDialog}
          className="absolute top-4 right-4 p-1.5 rounded-full glass hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="relative mx-auto mb-3.5 flex h-13 w-13 items-center justify-center rounded-2xl bg-destructive/15 text-destructive border border-destructive/20 shadow-inner">
          <LogOut className="h-6 w-6" />
        </div>

        {/* Header & Prompt */}
        <h3 id="exit-dialog-title" className="text-base font-black tracking-tight text-foreground">
          Exit StudyOS?
        </h3>
        <p className="mt-1 text-xs text-muted-foreground font-medium leading-relaxed">
          Click back again to exit!
        </p>

        {/* Countdown Indicator Bar */}
        <div className="mt-3.5 mb-4.5 w-full bg-muted/40 h-1 rounded-full overflow-hidden">
          <div
            className="h-full bg-destructive transition-all duration-75 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={closeDialog}
            className="flex-1 py-2 rounded-xl border border-border bg-muted/60 hover:bg-muted text-xs font-bold text-foreground transition-all active:scale-95"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={handleActualExit}
            className="flex-1 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold shadow-md shadow-destructive/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit Now
          </button>
        </div>
      </div>
    </div>
  )
}

