"use client"

import { useMemo } from "react"
import katex from "katex"
import "katex/dist/katex.min.css"

interface MathTextProps {
  text: string
  className?: string
}

/**
 * Renders text with inline LaTeX math between $ delimiters.
 * E.g. "Solve $2x + 5 = 13$" renders the math portion with KaTeX.
 */
export function MathText({ text, className = "" }: MathTextProps) {
  const html = useMemo(() => {
    const normalized = normalizeMathText(text)
    
    // Split by $...$ or \(...\) or \[...\]
    const parts = normalized.split(/(\$[^$]+\$|\\\(.*?\\\)|\\\[.*?\\\])/g)
    
    return parts
      .map((part) => {
        let latex = ""
        let isMath = false
        
        if (part.startsWith("$") && part.endsWith("$")) {
          latex = part.slice(1, -1)
          isMath = true
        } else if (part.startsWith("\\(") && part.endsWith("\\)")) {
          latex = part.slice(2, -2)
          isMath = true
        }
        
        if (isMath) {
          try {
            return katex.renderToString(latex, {
              throwOnError: false,
              displayMode: false,
              strict: false,
            })
          } catch {
            return escapeHtml(part)
          }
        }
        return escapeHtml(part)
      })
      .join("")
  }, [text])

  return (
    <span
      className={`math-text-container ${className}`}
      style={{ 
        fontFamily: 'inherit',
        lineHeight: '1.6'
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function escapeHtml(value: string) {
  if (!value) return ""
  return value.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function normalizeMathText(value: string) {
  if (!value) return value

  let formatted = value

  // 1. Convert specific legacy patterns BEFORE wrapping in delimiters
  // Handle {frac}{a}{b} -> \frac{a}{b}
  formatted = formatted.replace(/\{frac\}\{([^}]+)\}\{([^}]+)\}/g, "\\frac{$1}{$2}")
  
  // Handle {a/b} as a hint for a fraction
  formatted = formatted.replace(/\{(\d+)\/(\d+)\}/g, "\\frac{$1}{$2}")

  // 2. Auto-wrap common patterns if NOT already in delimiters
  if (!formatted.includes("$") && !formatted.includes("\\(") && !formatted.includes("\\[")) {
    // If it contains \frac, \sqrt, \pm or common operators inside complex expressions
    if (formatted.includes("\\frac") || formatted.includes("\\sqrt") || formatted.includes("\\pm") || formatted.includes("\\times")) {
      formatted = `\\(${formatted}\\)`
    } else {
      // Single-pass power/subscript wrapping handles BOTH:
      //   base^(complex exponent)  e.g. 3^(x + 1), (64)^(-2/3)
      //   base^simple              e.g. 3^x, 10^2
      // Using a single regex prevents the second pass from corrupting
      // the \(...\) delimiters output by the first pass.
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
