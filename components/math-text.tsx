"use client"

import { useMemo } from "react"
import katex from "katex"

interface MathTextProps {
  text: string
  className?: string
}

const CURRENCY_TOKEN_RE = /\$\d[\d,]*(?:\.\d+)?(?=\s|[.,;:?!)]|$)/g
const ESCAPED_DOLLAR_PLACEHOLDER = "\uE005"
const CURRENCY_PLACEHOLDER_PREFIX = "\uE006"

/**
 * Renders text with inline/display LaTeX math between $...$, \(...\), or \[...\] delimiters.
 * Safely preserves currency amounts like "$72,000 ... $432,000" as plain text.
 */
export function MathText({ text, className = "" }: MathTextProps) {
  const html = useMemo(() => {
    const currencyValues: string[] = []
    let prepared = (text || "").replace(/\\\$/g, ESCAPED_DOLLAR_PLACEHOLDER)

    // Protect standalone currency amounts (e.g., "$72,000 out of $432,000") without touching real math like "$3 + 7$"
    prepared = prepared.replace(CURRENCY_TOKEN_RE, (match, offset, full) => {
      const prevChar = offset > 0 ? full[offset - 1] : ""
      if (prevChar && !/[\s(\[{,:;=<>+\-*/]/.test(prevChar)) {
        return match
      }
      const rest = full.slice(offset + match.length)
      if (rest.startsWith("$")) {
        return match
      }
      const nextDollarIdx = rest.indexOf("$")
      const untilNextDollar = nextDollarIdx === -1 ? rest : rest.slice(0, nextDollarIdx)
      // If there is a closing "$" with LaTeX commands or math operators inside, leave it as math.
      if (nextDollarIdx !== -1 && /[\\^_=<>+*/]/.test(untilNextDollar)) {
        return match
      }
      // Single unpaired currency "$275" OR prose text leading into another currency "$432,000"
      if (nextDollarIdx === -1 || /\s+[a-zA-Z]{2,}/.test(untilNextDollar)) {
        const tokenIdx = currencyValues.length
        currencyValues.push(match)
        return `${CURRENCY_PLACEHOLDER_PREFIX}${tokenIdx}${CURRENCY_PLACEHOLDER_PREFIX}`
      }
      return match
    })

    const normalized = normalizeMathText(prepared)

    // Split by $...$ or \(...\) or \[...\]
    const parts = normalized.split(/(\$[^$]+\$|\\\(.*?\\\)|\\\[.*?\\\])/g)

    const rendered = parts
      .map((part) => {
        let latex = ""
        let isMath = false
        let displayMode = false

        if (part.startsWith("$") && part.endsWith("$") && part.length >= 2) {
          const inner = part.slice(1, -1)
          const strippedCommands = inner.replace(/\\(?:text|mathrm|operatorname)\{[^}]*\}/g, "")
          // Reject accidental pairs containing consecutive multi-letter English prose words
          const looksLikeProse = /\b[a-z]{2,}\s+[a-z]{2,}\b/.test(strippedCommands)
          if (!looksLikeProse) {
            latex = inner
            isMath = true
          }
        } else if (part.startsWith("\\(") && part.endsWith("\\)")) {
          latex = part.slice(2, -2)
          isMath = true
        } else if (part.startsWith("\\[") && part.endsWith("\\]")) {
          latex = part.slice(2, -2)
          isMath = true
          displayMode = true
        }

        if (isMath) {
          try {
            return katex.renderToString(latex, {
              output: "html",
              throwOnError: false,
              displayMode,
              strict: false,
            })
          } catch {
            return escapeHtml(part)
          }
        }
        return escapeHtml(part)
      })
      .join("")

    return rendered
      .replaceAll(ESCAPED_DOLLAR_PLACEHOLDER, "$")
      .replace(/\uE006(\d+)\uE006/g, (_, idx) => escapeHtml(currencyValues[Number(idx)] || ""))
  }, [text])

  return (
    <span
      className={`math-text-container ${className}`}
      style={{
        fontFamily: "inherit",
        lineHeight: "1.6",
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function escapeHtml(value: string) {
  if (!value) return ""
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function normalizeMathText(value: string) {
  if (!value) return value

  let formatted = value

  // 1. Convert specific legacy patterns BEFORE wrapping in delimiters
  // Handle {frac}{a}{b} -> \frac{a}{b}
  formatted = formatted.replace(/\{frac\}\{([^}]+)\}\{([^}]+)\}/g, "\\frac{$1}{$2}")

  // Handle {a/b} while preserving outer braces so 27^{2/3} becomes 27^{\frac{2}{3}} instead of 27^\frac{2}{3}
  formatted = formatted.replace(/\{(\d+)\/(\d+)\}/g, "{\\frac{$1}{$2}}")

  // 2. Auto-wrap common patterns if NOT already in delimiters
  if (!formatted.includes("$") && !formatted.includes("\\(") && !formatted.includes("\\[")) {
    // If it contains \frac, \sqrt, \pm or common operators inside complex expressions
    if (
      formatted.includes("\\frac") ||
      formatted.includes("\\sqrt") ||
      formatted.includes("\\pm") ||
      formatted.includes("\\times")
    ) {
      formatted = `\\(${formatted}\\)`
    } else {
      // Single-pass power/subscript wrapping handles BOTH:
      //   base^(complex exponent)  e.g. 3^(x + 1), (64)^(-2/3)
      //   base^simple              e.g. 3^x, 10^2
      formatted = formatted
        .replace(
          /(\(?[0-9a-zA-Z.]+\)?)\^(?:\(([^)]+)\)|([0-9a-zA-Z.]+|\{[^}]+\}))/g,
          (_, base, parenExp, simpleExp) => {
            const exp = parenExp || simpleExp
            return `\\(${base}^{${exp}}\\)`
          }
        )
        .replace(
          /(\(?[0-9a-zA-Z.]+\)?)_(?:\(([^)]+)\)|([0-9a-zA-Z.]+|\{[^}]+\}))/g,
          (_, base, parenSub, simpleSub) => {
            const sub = parenSub || simpleSub
            return `\\(${base}_{${sub}}\\)`
          }
        )
    }
  }

  // 3. Final cleanup: avoid nested delimiters \( \( ... \) \)
  formatted = formatted.replace(/\\\( *\\\((.*?)\\\) *\\\)/g, "\\($1\\)")

  return formatted
}
