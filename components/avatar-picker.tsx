"use client"

import React, { useState, useEffect } from "react"
import { type User as FirebaseUser, updateProfile } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { updateUserPhotoURL } from "@/lib/user-stats"
import { X, Loader2 } from "lucide-react"

interface AvatarPickerProps {
  user: FirebaseUser | null
  onClose: () => void
  onUpdated?: (photoURL: string) => void
}

const SEEDS = [
  "sparky",
  "adventurer",
  "brave",
  "nova",
  "luna",
  "mira",
  "zuri",
  "kai",
  "tala",
  "rio",
  "oliver",
  "nala",
  "ember",
  "ash",
  "glimmer",
  "sol",
  "atlas",
  "zephyr",
  "sage",
  "poppy",
  "idris",
  "milo",
  "aria",
  "noa",
  "juno",
  "cora",
  "felix",
  "ivy",
  "otto",
  "sora",
  "kyro",
  "leo",
  "hazel",
  "dex",
  "lyra",
  "ora",
  "mako",
  "vivi",
  "echo",
  "skye",
  "finn",
  "mora",
  "tess",
  "rory",
]

const PAGE_SIZE = 12

function getAvatarUrl(seed: string, version: "9.x" | "7.x" = "9.x") {
  return `https://api.dicebear.com/${version}/adventurer/svg?seed=${encodeURIComponent(seed)}`
}

export default function AvatarPicker({ user, onClose, onUpdated }: AvatarPickerProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loadingSeed, setLoadingSeed] = useState<string | null>(null)
  const [loadedSeeds, setLoadedSeeds] = useState<Record<string, boolean>>({})
  const [fallbackSeeds, setFallbackSeeds] = useState<Record<string, number>>({})

  const visibleSeeds = SEEDS.slice(0, visibleCount)
  const hasMore = visibleCount < SEEDS.length

  // Preload the next batch in the background after a short delay for instant "Load more"
  useEffect(() => {
    const nextBatch = SEEDS.slice(visibleCount, visibleCount + PAGE_SIZE)
    if (nextBatch.length === 0) return

    const timer = setTimeout(() => {
      nextBatch.forEach((seed) => {
        const img = new window.Image()
        img.src = getAvatarUrl(seed, "9.x")
      })
    }, 600)

    return () => clearTimeout(timer)
  }, [visibleCount])

  async function choose(seed: string) {
    if (!user || loadingSeed) return
    setLoadingSeed(seed)
    const url = getAvatarUrl(seed, "9.x")
    try {
      await updateUserPhotoURL(user.uid, url)
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: url })
      }
      onUpdated?.(url)
      onClose()
    } catch (err) {
      console.error("Failed to set avatar:", err)
      alert("Failed to save avatar. Try again.")
    } finally {
      setLoadingSeed(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <div className="rounded-2xl p-4 sm:p-5 w-full max-w-90 sm:max-w-105 shadow-2xl bg-white dark:bg-slate-900 border border-border/60">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Choose an avatar</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Avatars generated with DiceBear Adventurer (CC BY 4.0).
        </p>

        <div className="max-h-[56vh] overflow-y-auto pr-1 space-y-3">
          <div className="grid grid-cols-4 gap-2.5">
            {visibleSeeds.map((seed) => {
              const retryCount = fallbackSeeds[seed] || 0
              const isLoaded = Boolean(loadedSeeds[seed])
              const src =
                retryCount === 0
                  ? getAvatarUrl(seed, "9.x")
                  : `${getAvatarUrl(seed, "7.x")}&retry=${retryCount}`

              return (
                <button
                  key={seed}
                  type="button"
                  onClick={() => choose(seed)}
                  aria-label={`Choose avatar ${seed}`}
                  className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/80 border border-border/50 hover:border-primary/60 p-1.5 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {!isLoaded && (
                    <div className="absolute inset-1.5 rounded-lg bg-slate-200/70 dark:bg-slate-700/50 animate-pulse flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-muted-foreground/50 animate-spin" />
                    </div>
                  )}

                  <img
                    src={src}
                    alt=""
                    loading="eager"
                    decoding="async"
                    onLoad={() =>
                      setLoadedSeeds((prev) => (prev[seed] ? prev : { ...prev, [seed]: true }))
                    }
                    onError={() => {
                      if (retryCount < 2) {
                        setTimeout(() => {
                          setFallbackSeeds((prev) => ({
                            ...prev,
                            [seed]: (prev[seed] || 0) + 1,
                          }))
                        }, 400 * (retryCount + 1))
                      }
                    }}
                    className={`w-14 h-14 object-contain transition-opacity duration-200 ${
                      isLoaded ? "opacity-100" : "opacity-0"
                    }`}
                  />

                  {loadingSeed === seed && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-medium">
                      Saving...
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2 pb-1">
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, SEEDS.length))
                }
                className="px-5 py-2 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary text-sm font-medium transition-colors text-center"
              >
                Load more
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 pt-2 border-t border-border/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
