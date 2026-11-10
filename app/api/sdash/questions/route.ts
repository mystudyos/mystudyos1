import { NextRequest, NextResponse } from "next/server"
import {
  getSSSSubjectByKey,
  type SSSExamType,
  type SSSSubjectKey,
} from "@/lib/sss-config"
import type { Question } from "@/lib/question-types"

interface CacheEntry {
  questions: Question[]
  expiresAt: number
}

// Server-side in-memory batch cache (30 minutes TTL) per SdashAPI ToS Section 8.1
const batchCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30 * 60 * 1000

function normalizeSdashItem(
  raw: any,
  subjectKey: SSSSubjectKey,
  examType: SSSExamType,
  idx: number
): Question | null {
  if (!raw || typeof raw.question !== "string" || !raw.question.trim()) {
    return null
  }

  const subjInfo = getSSSSubjectByKey(subjectKey)
  const optionObj = raw.option || {}
  const keys = ["a", "b", "c", "d", "e"] as const
  const options: string[] = []
  const keyToIndex: Record<string, number> = {}

  for (const k of keys) {
    const val = optionObj[k] ?? optionObj[k.toUpperCase()]
    if (typeof val === "string" && val.trim().length > 0) {
      keyToIndex[k] = options.length
      options.push(val.trim())
    }
  }

  if (options.length < 2) return null

  const ansKey = String(raw.answer || "a")
    .trim()
    .toLowerCase()
    .charAt(0)
  const correctIndex = keyToIndex[ansKey] !== undefined ? keyToIndex[ansKey] : 0

  const sectionPrefix =
    typeof raw.section === "string" && raw.section.trim().length > 0
      ? `${raw.section.trim()}\n\n`
      : ""

  const examLabel =
    typeof raw.examtype === "string" && raw.examtype.trim()
      ? raw.examtype.trim().toUpperCase()
      : examType.toUpperCase()
  const yearLabel =
    raw.examyear !== undefined && raw.examyear !== null && String(raw.examyear).trim()
      ? String(raw.examyear).trim()
      : ""

  const topicLabel = yearLabel ? `${examLabel} ${yearLabel}` : examLabel
  const correctOptionText = options[correctIndex] || ""
  const explanation =
    typeof raw.solution === "string" && raw.solution.trim().length > 0
      ? raw.solution.trim()
      : `The correct answer is (${String.fromCharCode(65 + correctIndex)}) ${correctOptionText}.`

  return {
    id: `sdash-${raw.id ?? `${subjectKey}-${examType}-${idx}`}`,
    subject: subjInfo.name,
    topic: topicLabel,
    question: `${sectionPrefix}${raw.question.trim()}`,
    options,
    correctIndex,
    explanation,
    usesLatex:
      subjectKey === "mathematics" ||
      subjectKey === "physics" ||
      subjectKey === "chemistry",
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subject = (searchParams.get("subject") || "mathematics") as SSSSubjectKey
  const type = (searchParams.get("type") || "wassce") as SSSExamType
  const year = searchParams.get("year") || "all"
  const requestedLimit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50)
  )

  const cacheKey = `${subject}:${type}:${year}`
  const now = Date.now()
  const cached = batchCache.get(cacheKey)

  if (cached && cached.expiresAt > now && cached.questions.length > 0) {
    return NextResponse.json({
      status: 200,
      source: "cache",
      questions: cached.questions.slice(0, requestedLimit),
    })
  }

  const apiKey = process.env.SDASH_API_KEY || process.env.SDASHAPI_ACCESS_TOKEN
  const baseUrl = (
    process.env.SDASHAPI_BASE_URL || "https://sdashapi.com/api/v1"
  ).replace(/\/+$/, "")

  if (!apiKey) {
    return NextResponse.json(
      {
        status: 503,
        available: false,
        message: "Not available now.",
        questions: [],
      },
      { status: 503 }
    )
  }

  try {
    const upstreamParams = new URLSearchParams({
      subject,
      type,
      limit: "50",
    })
    if (year && year !== "all") {
      upstreamParams.set("year", year)
    }

    const upstreamRes = await fetch(
      `${baseUrl}/q?${upstreamParams.toString()}`,
      {
        method: "GET",
        headers: {
          AccessToken: apiKey,
          Accept: "application/json",
        },
        next: { revalidate: 1800 },
      }
    )

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          status: upstreamRes.status,
          available: false,
          message: "Not available now.",
          questions: [],
        },
        { status: 503 }
      )
    }

    const payload = await upstreamRes.json()
    const rawList = Array.isArray(payload?.data)
      ? payload.data
      : payload?.data
        ? [payload.data]
        : []

    const normalized = rawList
      .map((item: any, idx: number) => normalizeSdashItem(item, subject, type, idx))
      .filter((q: Question | null): q is Question => q !== null)

    if (normalized.length === 0) {
      return NextResponse.json(
        {
          status: 404,
          available: false,
          message: "Not available now.",
          questions: [],
        },
        { status: 404 }
      )
    }

    batchCache.set(cacheKey, {
      questions: normalized,
      expiresAt: now + CACHE_TTL_MS,
    })

    return NextResponse.json({
      status: 200,
      available: true,
      source: "sdashapi",
      questions: normalized.slice(0, requestedLimit),
    })
  } catch (err) {
    console.warn("SdashAPI fetch failed:", err)
    return NextResponse.json(
      {
        status: 503,
        available: false,
        message: "Not available now.",
        questions: [],
      },
      { status: 503 }
    )
  }
}
