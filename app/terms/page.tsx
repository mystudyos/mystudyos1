"use client"

import { useRouter } from "next/navigation"
import { LegalView } from "@/components/legal-view"

export default function TermsOfServicePage() {
  const router = useRouter()
  return (
    <div className="min-h-dvh bg-background">
      <LegalView type="terms" onBack={() => router.push("/")} />
    </div>
  )
}

