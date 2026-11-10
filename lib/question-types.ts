export interface Question {
  id: string
  subject: string
  topic: string
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
  usesLatex: boolean
}

export const SUBJECTS = [
  { key: "mathematics", name: "Mathematics", solidQCount: 100, durationMins: 100 },
  { key: "english", name: "English", solidQCount: 100, durationMins: 100 },
  { key: "bst", name: "BST", solidQCount: 100, durationMins: 100 },
  { key: "nve", name: "NVE.", solidQCount: 100, durationMins: 100 },
  { key: "pvs", name: "PVS", solidQCount: 100, durationMins: 100 },
  { key: "cca", name: "CCA", solidQCount: 100, durationMins: 100 },
  { key: "business", name: "Business Std.", solidQCount: 100, durationMins: 100 },
  { key: "french", name: "French Lang.", solidQCount: 100, durationMins: 100 },
  { key: "crs", name: "CRS", solidQCount: 100, durationMins: 100 },
  { key: "history", name: "History", solidQCount: 100, durationMins: 100 },
  { key: "igbo", name: "Igbo Lang.", solidQCount: 100, durationMins: 100 },
  { key: "yoruba", name: "Yoruba Lang.", solidQCount: 100, durationMins: 100 },
] as const

export type SubjectKey = (typeof SUBJECTS)[number]["key"]

export function getSubjectByKey(key: SubjectKey) {
  return SUBJECTS.find((s) => s.key === key)!
}

export function getTopicsForSubject(key: SubjectKey, questions: Question[]): string[] {
  const topics = new Set<string>()
  questions.filter((q) => q.subject === getSubjectByKey(key).name).forEach((q) => topics.add(q.topic))
  return Array.from(topics)
}

export function getQuestionsForSubject(key: SubjectKey, questions: Question[]): Question[] {
  return questions.filter((q) => q.subject === getSubjectByKey(key).name)
}

export function getQuestionsForTopic(key: SubjectKey, topic: string, questions: Question[]): Question[] {
  return questions.filter((q) => q.subject === getSubjectByKey(key).name && q.topic === topic)
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
