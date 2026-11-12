export type SSSSubjectKey =
  | "mathematics"
  | "english"
  | "biology"
  | "chemistry"
  | "physics"
  | "economics"
  | "government"
  | "englishlit"
  | "civiledu"
  | "commerce"
  | "accounting"
  | "agriculture"
  | "geography"
  | "crk"
  | "computer"
  | "history"
  | "irk"
  | "currentaffairs"
  | "fineart"
  | "homeeconomics"
  | "insurance"
  | "gscience"
  | "music"
  | "arabic"
  | "hausa"
  | "igbo"
  | "yoruba"

export type SSSExamType = "wassce" | "neco" | "utme"
export type SSSPaperType = "objective" | "theory"

// Subjects that currently have verified internal JSON question banks under Json/NECO/
export const AVAILABLE_SSS_OBJECTIVE_SUBJECTS: Record<SSSExamType, SSSSubjectKey[]> = {
  neco: ["agriculture", "biology", "chemistry"],
  wassce: [],
  utme: [],
}

export const AVAILABLE_SSS_THEORY_SUBJECTS: Record<Exclude<SSSExamType, "utme">, SSSSubjectKey[]> = {
  neco: [],
  wassce: [],
}

export function isSSSSubjectAvailable(key: SSSSubjectKey): boolean {
  return Object.values(AVAILABLE_SSS_OBJECTIVE_SUBJECTS).some((list) => list.includes(key))
}

export function isSSSPaperAvailable(
  subjectKey: SSSSubjectKey,
  examType: SSSExamType,
  paperType: SSSPaperType
): boolean {
  if (paperType === "theory") {
    if (examType === "utme") return false
    return AVAILABLE_SSS_THEORY_SUBJECTS[examType].includes(subjectKey)
  }
  return AVAILABLE_SSS_OBJECTIVE_SUBJECTS[examType].includes(subjectKey)
}

export interface SSSSubjectInfo {
  key: SSSSubjectKey
  name: string
  shortName: string
  letter: string
  color: string
  bg: string
  cardGradient: string
}

export const SSS_SUBJECTS: SSSSubjectInfo[] = [
  { key: "mathematics", name: "Mathematics", shortName: "Mathematics", letter: "M", color: "text-primary", bg: "bg-primary/15", cardGradient: "from-blue-500/20 to-blue-600/10 border-blue-500/30" },
  { key: "english", name: "English Language", shortName: "English Lang.", letter: "ENG", color: "text-amber-400", bg: "bg-amber-400/15", cardGradient: "from-amber-500/20 to-amber-600/10 border-amber-500/30" },
  { key: "biology", name: "Biology", shortName: "Biology", letter: "BIO", color: "text-emerald-400", bg: "bg-emerald-400/15", cardGradient: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30" },
  { key: "chemistry", name: "Chemistry", shortName: "Chemistry", letter: "CHM", color: "text-cyan-400", bg: "bg-cyan-400/15", cardGradient: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30" },
  { key: "physics", name: "Physics", shortName: "Physics", letter: "PHY", color: "text-blue-400", bg: "bg-blue-400/15", cardGradient: "from-blue-500/20 to-blue-600/10 border-blue-500/30" },
  { key: "economics", name: "Economics", shortName: "Economics", letter: "ECO", color: "text-purple-400", bg: "bg-purple-400/15", cardGradient: "from-purple-500/20 to-purple-600/10 border-purple-500/30" },
  { key: "government", name: "Government", shortName: "Government", letter: "GOV", color: "text-rose-400", bg: "bg-rose-400/15", cardGradient: "from-rose-500/20 to-rose-600/10 border-rose-500/30" },
  { key: "englishlit", name: "English Literature", shortName: "Literature", letter: "LIT", color: "text-indigo-400", bg: "bg-indigo-400/15", cardGradient: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30" },
  { key: "civiledu", name: "Civic Education", shortName: "Civic Edu.", letter: "CIV", color: "text-teal-400", bg: "bg-teal-400/15", cardGradient: "from-teal-500/20 to-teal-600/10 border-teal-500/30" },
  { key: "commerce", name: "Commerce", shortName: "Commerce", letter: "COM", color: "text-orange-400", bg: "bg-orange-400/15", cardGradient: "from-orange-500/20 to-orange-600/10 border-orange-500/30" },
  { key: "accounting", name: "Accounting", shortName: "Accounting", letter: "ACC", color: "text-lime-400", bg: "bg-lime-400/15", cardGradient: "from-lime-500/20 to-lime-600/10 border-lime-500/30" },
  { key: "agriculture", name: "Agriculture", shortName: "Agriculture", letter: "AGR", color: "text-emerald-400", bg: "bg-emerald-400/15", cardGradient: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30" },
  { key: "geography", name: "Geography", shortName: "Geography", letter: "GEO", color: "text-sky-400", bg: "bg-sky-400/15", cardGradient: "from-sky-500/20 to-sky-600/10 border-sky-500/30" },
  { key: "crk", name: "CRK", shortName: "CRK", letter: "CRK", color: "text-teal-400", bg: "bg-teal-400/15", cardGradient: "from-teal-500/20 to-teal-600/10 border-teal-500/30" },
  { key: "computer", name: "Computer Studies", shortName: "Computer", letter: "CMP", color: "text-violet-400", bg: "bg-violet-400/15", cardGradient: "from-violet-500/20 to-violet-600/10 border-violet-500/30" },
  { key: "history", name: "History", shortName: "History", letter: "H", color: "text-slate-400", bg: "bg-slate-400/15", cardGradient: "from-slate-500/20 to-slate-600/10 border-slate-500/30" },
  { key: "irk", name: "IRK", shortName: "IRK", letter: "IRK", color: "text-emerald-400", bg: "bg-emerald-400/15", cardGradient: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30" },
  { key: "currentaffairs", name: "Current Affairs", shortName: "Current Aff.", letter: "CA", color: "text-amber-400", bg: "bg-amber-400/15", cardGradient: "from-amber-500/20 to-amber-600/10 border-amber-500/30" },
  { key: "fineart", name: "Fine Art", shortName: "Fine Art", letter: "ART", color: "text-pink-400", bg: "bg-pink-400/15", cardGradient: "from-pink-500/20 to-pink-600/10 border-pink-500/30" },
  { key: "homeeconomics", name: "Home Economics", shortName: "Home Econ.", letter: "HEC", color: "text-rose-400", bg: "bg-rose-400/15", cardGradient: "from-rose-500/20 to-rose-600/10 border-rose-500/30" },
  { key: "insurance", name: "Insurance", shortName: "Insurance", letter: "INS", color: "text-cyan-400", bg: "bg-cyan-400/15", cardGradient: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30" },
  { key: "gscience", name: "General Science", shortName: "Gen. Science", letter: "GSC", color: "text-blue-400", bg: "bg-blue-400/15", cardGradient: "from-blue-500/20 to-blue-600/10 border-blue-500/30" },
  { key: "music", name: "Music", shortName: "Music", letter: "MUS", color: "text-fuchsia-400", bg: "bg-fuchsia-400/15", cardGradient: "from-fuchsia-500/20 to-fuchsia-600/10 border-fuchsia-500/30" },
  { key: "arabic", name: "Arabic Studies", shortName: "Arabic", letter: "ARB", color: "text-amber-400", bg: "bg-amber-400/15", cardGradient: "from-amber-500/20 to-amber-600/10 border-amber-500/30" },
  { key: "hausa", name: "Hausa", shortName: "Hausa", letter: "HAU", color: "text-orange-400", bg: "bg-orange-400/15", cardGradient: "from-orange-500/20 to-orange-600/10 border-orange-500/30" },
  { key: "igbo", name: "Igbo", shortName: "Igbo", letter: "I", color: "text-yellow-400", bg: "bg-yellow-400/15", cardGradient: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30" },
  { key: "yoruba", name: "Yoruba", shortName: "Yoruba", letter: "Y", color: "text-lime-400", bg: "bg-lime-400/15", cardGradient: "from-lime-500/20 to-lime-600/10 border-lime-500/30" },
]

export const SSS_EXAM_OPTIONS: {
  type: SSSExamType
  label: string
  badge: string
  description: string
  enabled: boolean
  supportsTheory: boolean
}[] = [
  {
    type: "wassce",
    label: "WAEC (WASSCE)",
    badge: "SSCE",
    description: "West African Senior School Certificate Examination (Objective & Theory)",
    enabled: false,
    supportsTheory: true,
  },
  {
    type: "neco",
    label: "NECO",
    badge: "SSCE",
    description: "National Examinations Council Senior School Certificate (Objective & Theory)",
    enabled: true,
    supportsTheory: true,
  },
  {
    type: "utme",
    label: "JAMB (UTME)",
    badge: "UTME",
    description: "Unified Tertiary Matriculation Examination CBT (Objective Only)",
    enabled: false,
    supportsTheory: false,
  },
]

export function getSSSSubjectByKey(key: SSSSubjectKey): SSSSubjectInfo {
  return SSS_SUBJECTS.find((s) => s.key === key) || SSS_SUBJECTS[0]
}
