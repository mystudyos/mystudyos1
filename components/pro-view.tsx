"use client"

import { useState } from "react"
import { Check, Zap, BarChart2, MessageCircle, Gamepad2, Loader2, Shield, Crown, Lock } from "lucide-react"
import type { User as FirebaseUser } from "firebase/auth"
import { upgradeUserToPro } from "@/lib/user-stats"
import { toast } from "react-toastify"

const FEATURES_FREE = [
  "Exam Practice (Solid Question) mode",
  "All BECE subjects",
  "Basic progress tracking",
]

const FEATURES_PRO = [
  { text: "Everything in Free", active: true },
  { text: "Leaderboard identification", active: true },
  { text: "StudyOS AI", active: true },
  { text: "Advanced analytics & insights", active: true },
  { text: "Performance comparisons", active: true },
  { text: "Priority support", active: true },
  { text: "Game Study Challenge", active: false },
]

interface ProViewProps {
  user: FirebaseUser | null
  isPro: boolean
  onUpgradeSuccess: () => void
  category?: "JSS" | "SSS"
}

export function ProView({ user, isPro, onUpgradeSuccess, category = "JSS" }: ProViewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isSSS = category === "SSS"
  const freeFeatures = isSSS
    ? [
        "Exam Practice (Solid Question) mode",
        "All 27 SSS subjects (WAEC, NECO & JAMB)",
        "Basic progress tracking",
      ]
    : FEATURES_FREE

  const handlePayment = async () => {
    if (!user?.email) {
      toast.error("Please sign in to upgrade.")
      return
    }
    setIsLoading(true)

    try {
      // @ts-ignore
      const PaystackPop = (await import("@paystack/inline-js")).default
      const paystack = new PaystackPop()
      paystack.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY as string,
        email: user.email,
        amount: 500 * 100, // ₦500 in kobo
        currency: "NGN",
        metadata: {
          custom_fields: [
            { display_name: "Student Name", variable_name: "student_name", value: user.displayName || "Student" },
            { display_name: "User ID", variable_name: "user_id", value: user.uid },
          ]
        },
        onSuccess: async (transaction: any) => {
          try {
            await upgradeUserToPro(user.uid)
            toast.success(
              <div>
                <div className="font-bold">Welcome to StudyOS Pro! 🎉</div>
                <div className="text-xs opacity-80 mt-0.5">You now have access to all premium features.</div>
              </div>,
              { autoClose: 5000 }
            )
            onUpgradeSuccess()
          } catch (error) {
            console.error("Failed to upgrade user", error)
            toast.error("Payment received but upgrade failed. Please contact support.")
          } finally {
            setIsLoading(false)
          }
        },
        onCancel: () => {
          setIsLoading(false)
          toast(
            <div>
              <div className="font-bold">Payment cancelled</div>
              <div className="text-xs opacity-80 mt-0.5">No charges were made to your account.</div>
            </div>
          )
        },
      })
    } catch (err) {
      console.error(err)
      toast.error("Could not initialize payment. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full w-full max-w-lg lg:max-w-2xl mx-auto px-5 pt-12 lg:pt-6 pb-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, oklch(0.55 0.2 295), oklch(0.48 0.18 280))",
            boxShadow: "0 0 28px oklch(0.55 0.2 295 / 0.5)",
          }}
        >
          <Crown className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2 text-balance">
          Upgrade to StudyOS <span className="text-accent">Pro</span>
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed text-balance">
          {isSSS
            ? "Get the full power of StudyOS and maximise your WAEC, NECO & JAMB scores."
            : "Get the full power of StudyOS and maximise your BECE score."}
        </p>
      </div>

      {/* Price card */}
      <div
        className="relative rounded-2xl p-5 mb-5 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, oklch(0.28 0.1 295 / 0.8), oklch(0.22 0.08 270 / 0.8))",
          border: "1px solid oklch(0.55 0.2 295 / 0.4)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.62 0.18 295), transparent 70%)" }}
        />
        <div className="flex items-end gap-2 mb-1">
          <span className="text-4xl font-black text-white">{isSSS ? "₦1,000" : "₦500"}</span>
          <span className="text-muted-foreground pb-1">{isSSS ? "/3 months" : "/2 months"}</span>
          {!isSSS && (
            <span className="text-sm text-muted-foreground/60 line-through pb-1">/1 month</span>
          )}
        </div>
        <p className="text-xs text-purple-200/70 mb-5">
          {isSSS ? "Billed every 3 months · WAEC, NECO & JAMB Prep" : "Billed every 2 months · Cancel anytime"}
        </p>

        {isPro ? (
          <div
            className="w-full py-3.5 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2"
            style={{ 
              background: "oklch(0.62 0.18 150 / 0.1)",
              border: "1px solid oklch(0.62 0.18 150 / 0.3)",
            }}
          >
            <Crown className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400">You are a Pro Member!</span>
          </div>
        ) : (
          <button
            onClick={isSSS ? undefined : handlePayment}
            disabled={isSSS || isLoading}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, oklch(0.72 0.16 192), oklch(0.62 0.18 240))",
              boxShadow: "0 4px 24px oklch(0.72 0.16 192 / 0.4)",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                {isSSS ? "Unlock Pro Now" : "Unlock Pro Now"}
              </>
            )}
          </button>
        )}
      </div>

      {/* Secure badge */}
      <div className="flex items-center justify-center gap-2 mb-5">
        <Shield className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">Secured by Paystack · 256-bit encryption</span>
      </div>

      {/* Features Grid */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-4 mb-4">
        {/* Pro Feature list */}
        <div className="glass rounded-2xl p-4 lg:mb-0 mb-4 flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Pro Features
          </p>
          <div className="flex flex-col gap-2.5">
            {FEATURES_PRO.map((feat) => (
              <div key={feat.text} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${feat.active ? "bg-primary/20" : "bg-foreground/5"}`}>
                  {feat.active ? (
                    <Check className="w-3 h-3 text-primary" />
                  ) : (
                    <Gamepad2 className="w-3 h-3 text-muted-foreground/40" />
                  )}
                </div>
                {feat.active ? (
                  <span className="text-sm text-foreground/90">{feat.text}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground/40 line-through">{feat.text}</span>
                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500">Soon</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Free Plan */}
        <div className="glass rounded-2xl p-4 flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Free Plan
          </p>
          <div className="flex flex-col gap-2.5">
            {freeFeatures.map((feat) => (
              <div key={feat} className="flex items-center gap-3 opacity-60">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-muted-foreground" />
                </div>
                <span className="text-sm text-foreground/70">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-4">
        Secure Payment
      </p>
    </div>
  )
}
