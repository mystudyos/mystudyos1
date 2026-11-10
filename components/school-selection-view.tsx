"use client"

import { useState, useEffect } from "react"
import { type User as FirebaseUser } from "firebase/auth"
import { School, ArrowRight, LogOut, Mail, Loader2 } from "lucide-react"
import { ADMIN_EMAIL, COLLAB_MESSAGE_TEMPLATE } from "@/lib/constants"
import { updateUserSchool } from "@/lib/user-stats"
import { fetchApprovedSchools } from "@/lib/schools"

interface SchoolSelectionViewProps {
  user: FirebaseUser
  onConfirmed: () => void
  onLogout: () => void
}

export function SchoolSelectionView({ user, onConfirmed, onLogout }: SchoolSelectionViewProps) {
  const [school, setSchool] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schools, setSchools] = useState<string[]>([])
  const [loadingSchools, setLoadingSchools] = useState(true)

  useEffect(() => {
    fetchApprovedSchools()
      .then(setSchools)
      .catch((err) => {
        console.error("Failed to fetch schools:", err)
      })
      .finally(() => setLoadingSchools(false))
  }, [])

  const handleConfirm = async () => {
    if (!school || school === "other") return
    
    setLoading(true)
    setError(null)
    try {
      await updateUserSchool(user.uid, school)
      onConfirmed()
    } catch (err) {
      console.error("Failed to update school:", err)
      setError("Failed to save. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm glass rounded-[2.5rem] p-8 shadow-2xl border border-white/5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 mx-auto">
          <School className="w-8 h-8 text-primary" />
        </div>

        <h2 className="text-2xl font-bold text-center text-foreground mb-2">Identify Your School</h2>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Welcome back, {user.displayName || "Student"}! Please confirm which school you belong to.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 ml-1">
              Select School
            </label>
            {loadingSchools ? (
              <div className="w-full px-4 py-4 rounded-2xl bg-foreground/5 border border-white/5 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading schools...</span>
              </div>
            ) : (
              <select
                required
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl bg-foreground/5 border border-white/5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
              >
                <option value="" disabled className="bg-background text-foreground">Select your school (A–Z)</option>
                {[...schools]
                  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
                  .map((s) => (
                    <option key={s} value={s} className="bg-background text-foreground">{s}</option>
                  ))}
                <option value="other" className="bg-background text-foreground">My school is not listed...</option>
              </select>
            )}
          </div>

          {school === "other" && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-2">
              <p className="mb-3">We only support students from collaborated schools at the moment.</p>
              <a 
                href={`mailto:${ADMIN_EMAIL}?body=${encodeURIComponent(COLLAB_MESSAGE_TEMPLATE)}`}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all"
              >
                <Mail className="w-4 h-4" />
                Contact for Collaboration
              </a>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive text-center font-medium">{error}</p>
          )}

          <button
            onClick={handleConfirm}
            disabled={loading || loadingSchools || !school || school === "other"}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Confirm School"}
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onLogout}
            className="w-full py-4 text-sm font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}



