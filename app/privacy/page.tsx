"use client"

import { useRouter } from "next/navigation"
import { LegalView } from "@/components/legal-view"

export default function PrivacyPolicyPage() {
  const router = useRouter()
  return (
    <div className="min-h-dvh bg-background">
      <LegalView type="privacy" onBack={() => router.push("/")} />
    </div>
  )
}

