import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service | StudyOS",
  description: "Terms of Service for StudyOS BECE Exam Preparation Platform.",
  alternates: {
    canonical: "/terms",
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}

