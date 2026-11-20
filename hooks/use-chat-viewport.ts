"use client"

import { useEffect, useState, type CSSProperties } from "react"

/**
 * Locks a mobile chat container to the active `window.visualViewport` bounds
 * whenever the on-screen keyboard is open, keeping the top chat header pinned
 * at the top of the visible screen and the composer bar flush above the keyboard.
 */
export function useChatViewport(enabled = true): {
  viewportStyle: CSSProperties | undefined
  isKeyboardOpen: boolean
} {
  const [viewportStyle, setViewportStyle] = useState<CSSProperties | undefined>(undefined)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setViewportStyle(undefined)
      setIsKeyboardOpen(false)
      return
    }

    const vv = window.visualViewport
    if (!vv) return

    const syncViewport = () => {
      if (window.innerWidth >= 1024) {
        setViewportStyle(undefined)
        setIsKeyboardOpen(false)
        return
      }

      // Snap any iOS layout-viewport pan back to origin so fixed header never drifts
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0)
      }

      const heightDiff = window.innerHeight - vv.height
      const keyboardVisible = heightDiff > 60 || vv.offsetTop > 1

      setIsKeyboardOpen(keyboardVisible)

      if (keyboardVisible) {
        setViewportStyle({
          position: "fixed",
          left: 0,
          right: 0,
          top: `${Math.max(0, vv.offsetTop)}px`,
          height: `${vv.height}px`,
          zIndex: 45,
        })
      } else {
        setViewportStyle(undefined)
      }
    }

    syncViewport()
    vv.addEventListener("resize", syncViewport)
    vv.addEventListener("scroll", syncViewport)
    window.addEventListener("resize", syncViewport)

    return () => {
      vv.removeEventListener("resize", syncViewport)
      vv.removeEventListener("scroll", syncViewport)
      window.removeEventListener("resize", syncViewport)
    }
  }, [enabled])

  return { viewportStyle, isKeyboardOpen }
}
