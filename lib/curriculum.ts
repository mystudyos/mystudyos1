import type { Question } from "./question-types"
import { ALL_QUESTIONS } from "./questions"

// Solid Qs JSONs
import englishSolidJson from "../Json/English Lang_Solid Q's.json"
import mathsSolidJson from "../Json/Maths_Solid Q's.json"
import crsSolidJson from "../Json/CRS_Solid Q's.json"
import bstSolidJson from "../Json/BST_Solid Q's.json"
import pvsSolidJson from "../Json/PVS_Solid Q's.json"
import bussSolidJson from "../Json/BUSS Solid Q's.json"
import nveSolidJson from "../Json/NVE_Solid Q's.json"
import ccaSolidJson from "../Json/CCA_Solid Q's.json"
import frenchSolidJson from "../Json/French_Solid Q's.json"
import historySolidJson from "../Json/History_Solid Q's.json"
import yorubaSolidJson from "../Json/Yoruba_Solid Q's.json"
import igboSolidJson from "../Json/Igbo_Solid Q's.json"


function formatMath(text: string): string {
  if (!text) return text

  let formatted = text
    // Replace Unicode superscripts with LaTeX
    .replace(/⁰/g, "^0").replace(/¹/g, "^1").replace(/²/g, "^2").replace(/³/g, "^3")
    .replace(/⁴/g, "^4").replace(/⁵/g, "^5").replace(/⁶/g, "^6").replace(/⁷/g, "^7")
    .replace(/⁸/g, "^8").replace(/⁹/g, "^9").replace(/⁻/g, "^-")
    // Replace Unicode subscripts
    .replace(/₀/g, "_0").replace(/₁/g, "_1").replace(/₂/g, "_2").replace(/₃/g, "_3")
    .replace(/₄/g, "_4").replace(/₅/g, "_5").replace(/₆/g, "_6").replace(/₇/g, "_7")
    .replace(/₈/g, "_8").replace(/₉/g, "_9")
    // Replace symbols
    .replace(/×/g, " \\times ")
    .replace(/÷/g, " \\div ")
    .replace(/√/g, "\\sqrt")
    .replace(/π/g, "\\pi")
    .replace(/≠/g, "\\neq")
    .replace(/≤/g, "\\leq")
    .replace(/≥/g, "\\geq")
    .replace(/±/g, "\\pm")
    .replace(/°/g, "^\\circ")
    .replace(/θ/g, "\\theta")
    .replace(/α/g, "\\alpha")
    .replace(/β/g, "\\beta")

  // Simple fraction conversion: "3/4" -> "\frac{3}{4}" 
  // (Only if it's digit/digit to avoid breaking normal sentences)
  formatted = formatted.replace(/(\d+)\/(\d+)/g, "\\frac{$1}{$2}")

  // If there's an exponent like ^-9, wrap the content after ^ in braces
  formatted = formatted.replace(/\^([-]?[0-9a-zA-Z]+)/g, "^{$1}")
  
  // If there's a subscript like _2, wrap the content after _ in braces
  formatted = formatted.replace(/_([0-9a-zA-Z]+)/g, "_{$1}")

  // Wrap in $ for MathText to pick up, but only if it contains math-y characters
  // and isn't already wrapped.
  const hasMath = /[\^\\_\/\*\+\=\-\(\)\[\]]/.test(formatted) || formatted.includes("\\")
  if (hasMath && !formatted.includes("$")) {
    // If it's a short string (likely an option), wrap the whole thing
    if (formatted.length < 30) {
      return `$${formatted.trim()}$`
    }
    // For longer strings (questions), we just hope it works or use more complex logic
    // For now, let's just do the symbols and let MathText handle text-math mix
    // Actually, let's wrap sequences that look like math
    return formatted.replace(/([0-9a-zA-Z\\^_{}\/ \-+=\(\)]*[\^\\_][0-9a-zA-Z\\^_{}\/ \-+=\(\)]*)/g, (match) => {
       if (match.trim().length > 1) return `$${match.trim()}$`
       return match
    })
  }

  return formatted
}

function mapSolidJson(json: any[], subjectId: string): Question[] {
  return json.map((q) => {
    const options = [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean)
    const correctLetter = q.correct_option?.toLowerCase()
    const correctIndex = correctLetter === "a" ? 0 : correctLetter === "b" ? 1 : correctLetter === "c" ? 2 : 3

    const isMath = subjectId === "mathematics"

    return {
      id: `${subjectId}-solid-${q.id}`,
      subject: q.subject || subjectId,
      topic: q.topic || "General",
      question: isMath ? formatMath(q.question) : q.question,
      options: isMath ? options.map(opt => formatMath(opt)) : options,
      correctIndex,
      explanation: isMath ? formatMath(q.explanation || "") : q.explanation || "No explanation available.",
      difficulty: (q.difficulty?.toLowerCase() as any) || "medium",
      usesLatex: isMath,
    }
  })
}

// All mapped questions registry
export const MASTER_CURRICULUM: Question[] = [
  ...ALL_QUESTIONS,
  ...mapSolidJson(englishSolidJson, "english"),
  ...mapSolidJson(mathsSolidJson, "mathematics"),
  ...mapSolidJson(crsSolidJson, "crs"),
  ...mapSolidJson(bstSolidJson, "bst"),
  ...mapSolidJson(pvsSolidJson, "pvs"),
  ...mapSolidJson(bussSolidJson, "business"),
  ...mapSolidJson(nveSolidJson, "nve"),
  ...mapSolidJson(ccaSolidJson, "cca"),
  ...mapSolidJson(frenchSolidJson, "french"),
  ...mapSolidJson(historySolidJson, "history"),
  ...mapSolidJson(yorubaSolidJson, "yoruba"),
  ...mapSolidJson(igboSolidJson, "igbo"),
]

export function findQuestionById(id: string): Question | undefined {
  return MASTER_CURRICULUM.find(q => q.id === id)
}
