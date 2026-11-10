import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | StudyOS",
  description: "Privacy Policy for StudyOS BECE Exam Preparation Platform.",
  alternates: {
    canonical: "/privacy",
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}

