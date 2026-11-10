"use client"

type QuotaListener = (isExceeded: boolean) => void

let isQuotaExceededState = false
const listeners = new Set<QuotaListener>()

/**
 * Check if the Firestore quota has been reported as exceeded.
 */
export function isQuotaExceeded(): boolean {
  return isQuotaExceededState
}

/**
 * Report any Firestore error. If it is a quota or resource-exhausted error,
 * updates global state and notifies listeners.
 */
export function reportFirestoreError(err: any): void {
  if (!err) return
  const msg = typeof err === "string" ? err : err.message || ""
  const code = err.code || ""

  const isQuota =
    code === "resource-exhausted" ||
    msg.toLowerCase().includes("quota exceeded") ||
    msg.toLowerCase().includes("resource-exhausted") ||
    msg.toLowerCase().includes("resource_exhausted")

  if (isQuota) {
    console.warn("[StudyOS Quota Monitor] Quota exceeded detected:", code, msg)
    if (!isQuotaExceededState) {
      isQuotaExceededState = true
      listeners.forEach((fn) => fn(true))
    }
  }
}

/**
 * Subscribe to quota status changes.
 */
export function subscribeQuotaExceeded(listener: QuotaListener): () => void {
  listeners.add(listener)
  listener(isQuotaExceededState)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Reset quota exceeded state (e.g. when user clicks retry and connection succeeds).
 */
export function resetQuotaExceededState(): void {
  isQuotaExceededState = false
  listeners.forEach((fn) => fn(false))
}
