"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react"
import {
  auth,
  googleAuthProvider,
} from "@/lib/firebase"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth"
import { ensureUserStats } from "@/lib/user-stats"
import { ADMIN_EMAIL, COLLAB_MESSAGE_TEMPLATE } from "@/lib/constants"
import { fetchApprovedSchools, submitSchool } from "@/lib/schools"

interface AuthViewProps {
  onLogin: () => void
  onShowLegal: (type: "terms" | "privacy" | "cookies") => void
  initialMode?: "signin" | "signup"
  onBackToLanding?: () => void
}

function getFirebaseErrorMessage(error: any): string {
  if (!error) return "An unknown error occurred. Please try again."
  
  const code = error.code || ""
  const message = error.message || ""
  
  if (code === "auth/email-already-in-use") return "This email is already used."
  if (code === "auth/invalid-email") return "Please enter a valid email address."
  if (code === "auth/user-not-found") return "No account found with this email."
  if (code === "auth/wrong-password") return "Incorrect password. Please try again."
  if (code === "auth/invalid-credential") return "Invalid email or password."
  if (code === "auth/weak-password") return "Password must be at least 6 characters long."
  if (code === "auth/too-many-requests") return "Too many failed attempts. Please try again later."
  if (code === "auth/network-request-failed") return "Network error. Please check your internet connection."
  if (code === "auth/popup-blocked") return "Popup blocked. Please allow popups and try again."
  if (code === "auth/popup-closed-by-user") return "Sign-in was cancelled."
  
  // Fallback for untranslated Firebase errors
  if (message.includes("Firebase:")) {
    return "An authentication error occurred. Please check your details and try again."
  }
  
  return message || "An unexpected error occurred. Please try again."
}

export function AuthView({ onLogin, onShowLegal, initialMode = "signin", onBackToLanding }: AuthViewProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup")
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [school, setSchool] = useState("")
  const [otherSchool, setOtherSchool] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<"JSS" | "SSS">("JSS")
  const [loading, setLoading] = useState(false)
  const [schools, setSchools] = useState<string[]>([])
  const [loadingSchools, setLoadingSchools] = useState(true)

  const [error, setError] = useState<string | null>(null)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  useEffect(() => {
    setIsSignUp(initialMode === "signup")
  }, [initialMode])

  // Fetch schools from Firestore when user switches to Register tab, sorted A-Z
  useEffect(() => {
    if (!isSignUp || schools.length > 0) return
    setLoadingSchools(true)
    fetchApprovedSchools()
      .then((list) =>
        setSchools(
          [...list].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
        )
      )
      .catch((err) => console.error("Failed to fetch schools:", err))
      .finally(() => setLoadingSchools(false))
  }, [isSignUp, schools.length])

  useEffect(() => {
    if (error || resetMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setResetMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, resetMessage])

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address first to reset your password.")
      setResetMessage(null)
      return
    }
    
    setError(null)
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setResetMessage("Password reset link sent! Check your inbox.")
    } catch (err) {
      setError(getFirebaseErrorMessage(err))
      setResetMessage(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        // Determine final school value: either chosen collaborated school or the
        // custom school entered by the user when they selected "other".
        const finalSchool = school === "other" ? otherSchool.trim() : school
        if (!finalSchool) {
          setError("Please enter your school name.")
          setLoading(false)
          return
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        if (name.trim()) {
          await updateProfile(userCredential.user, {
            displayName: name.trim(),
          })
        }

        // Immediately create/update the user's stats doc with their school and category so
        // they can proceed without waiting for admin intervention.
        try {
          await ensureUserStats(userCredential.user, finalSchool, selectedCategory)
        } catch (err) {
          console.warn("ensureUserStats failed after signup:", err)
        }

        // If they entered a custom school, submit it for admin review (non-blocking)
        if (school === "other" && finalSchool) {
          submitSchool(finalSchool, userCredential.user.uid).catch((err) =>
            console.warn("submitSchool failed:", err)
          )
        }

        if (selectedCategory === "SSS" && typeof window !== "undefined") {
          window.location.href = "/sss"
          return
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }

      onLogin()
    } catch (error) {
      setError(getFirebaseErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    // We intentionally do not set loading=true here to prevent breaking the trusted 
    // user interaction context, which can cause the browser to block the popup.

    try {
      const userCredential = await signInWithPopup(auth, googleAuthProvider)
      
      // Restrict Google Sign-In/Registration to Admin only
      if (userCredential.user.email !== ADMIN_EMAIL) {
        await auth.signOut()
        setError("Only Admin can use Google login. Students must Sign Up or Sign In.")
        setLoading(false)
        return
      }

      setLoading(true) 
      onLogin()
    } catch (error) {
      const err = error as any;
      if (err.code === 'auth/popup-closed-by-user') {
        // User intentionally closed the popup, no need to show an error
        setError(null)
      } else {
        setError(getFirebaseErrorMessage(error))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex flex-col min-h-full bg-white text-slate-900 overflow-y-auto">
      {onBackToLanding && (
        <div className="px-5 pt-5 max-w-md mx-auto w-full">
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-2 text-xs font-normal text-black hover:text-primary transition-colors py-1.5 px-3 rounded-lg bg-slate-100 border border-slate-200/80"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </button>
        </div>
      )}

      {/* Hero section */}
      <div className="flex flex-col items-center pt-10 md:pt-12 lg:pt-14 pb-8 px-6 text-center max-w-lg mx-auto w-full">
        {/* Logo mark */}
        <div className="relative mb-5">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center">
            <Image
              src="/icon-192-removebg-preview.png"
              alt="StudyOS logo"
              width={48}
              height={48}
              priority
              className="rounded-xl md:w-14 md:h-14"
            />
          </div>
        </div>

        {/* Brand name */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-1">
          Study<span className="text-primary">OS</span>
        </h1>
        <p className="text-xs md:text-sm font-medium tracking-[0.18em] uppercase text-primary mb-3">
          Exam Preparation Platform
        </p>
      </div>

      {/* Auth card */}
      <div className="flex-1 px-5 pb-8 max-w-md mx-auto w-full">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80">

          {/* Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-5">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 text-sm font-normal rounded-lg transition-colors duration-200 ${
                !isSignUp
                  ? "bg-primary text-primary-foreground"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 text-sm font-normal rounded-lg transition-colors duration-200 ${
                isSignUp
                  ? "bg-primary text-primary-foreground"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    required
                    placeholder="Your Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Your School
                  </label>
                  {loadingSchools ? (
                    <div className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-border flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Loading schools...</span>
                    </div>
                  ) : (
                    <select
                      required
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-border text-sm text-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                    >
                      <option value="" disabled className="bg-background">Select your school</option>
                      {[...schools]
                        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
                        .map((s) => (
                          <option key={s} value={s} className="bg-background text-foreground">{s}</option>
                        ))}
                      <option value="other" className="bg-background">My school isn’t listed</option>
                    </select>
                  )}
                </div>

                    {school === "other" && (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-muted-foreground">Enter your school name</label>
                        <input
                          type="text"
                          value={otherSchool}
                          onChange={(e) => setOtherSchool(e.target.value)}
                          placeholder="e.g. Sunshine Secondary School"
                          className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-border text-sm text-foreground placeholder:text-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                        <p className="text-xs text-black">School not listed? Type its name above and we'll add it after a quick review.</p>
                      </div>
                    )}

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Category
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-foreground/5 border border-border">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("JSS")}
                      className={`py-2.5 text-sm font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                        selectedCategory === "JSS"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      JSS
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("SSS")}
                      className={`py-2.5 text-sm font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                        selectedCategory === "SSS"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      SSS
                    </button>
                  </div>
                  <p className="text-xs font-medium text-foreground mt-1.5 leading-snug">
                    *Pick your class carefully, it sets your route.
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-foreground/5 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="text-right -mt-1">
                <button 
                  type="button" 
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isSignUp && school === "other" && otherSchool.trim() === "")}
              className="w-full py-3 rounded-md bg-primary hover:bg-primary/90 text-sm font-bold tracking-normal text-primary-foreground transition-colors duration-200 active:scale-[0.99] disabled:opacity-60 mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </span>
              ) : (
                isSignUp ? "Create Account" : "Sign In"
              )}
            </button>
          </form>

          {error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive mt-4">
              {error}
            </div>
          ) : null}

          {resetMessage ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200 mt-4">
              {resetMessage}
            </div>
          ) : null}

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-black">or continue as Admin</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-foreground/5 border border-border text-sm font-semibold text-foreground flex items-center justify-center gap-3 hover:bg-foreground/10 active:scale-95 transition-all duration-200 disabled:opacity-60"
          >
            {/* Google "G" SVG */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer note */}
        <div className="mt-6 text-center max-w-md mx-auto w-full">
          <p className="text-[11px] font-medium text-muted-foreground leading-relaxed max-w-65 mx-auto">
            By continuing, you agree to our{" "}
            <button onClick={() => onShowLegal("terms")} className="text-foreground hover:text-foreground/80 transition-colors underline decoration-border underline-offset-[3px]">Terms of Service</button> & {" "}
            <button onClick={() => onShowLegal("privacy")} className="text-foreground hover:text-foreground/80 transition-colors underline decoration-border underline-offset-[3px]">Privacy Policy</button>.
          </p>
        </div>
      </div>
    </div>
  )
}
