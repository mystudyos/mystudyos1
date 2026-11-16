import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

MATH_FILES = [
    Path("Json/BECE/Maths_Solid Q's.json"),
    Path("Json/NECO/Mathematics.json"),
    Path("Json/WAEC/MATHEMATICS.json"),
]

SUP_DICT = {
    "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
    "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
    "⁺": "+", "⁻": "-", "⁼": "=", "⁽": "(", "⁾": ")",
    "ⁿ": "n", "ˣ": "x", "ʸ": "y",
}
SUB_DICT = {
    "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
    "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
    "₊": "+", "₋": "-", "₌": "=", "₍": "(", "₎": ")",
    "ₓ": "x", "ₙ": "n",
}
SUP_MAP = str.maketrans(SUP_DICT)
SUB_MAP = str.maketrans(SUB_DICT)

SUP_CHARS = "".join(SUP_DICT.keys()) + "ᵀ"
SUB_CHARS = "".join(SUB_DICT.keys())

SYMBOL_MAP = {
    "π": r"\pi",
    "θ": r"\theta",
    "α": r"\alpha",
    "β": r"\beta",
    "≥": r"\ge",
    "≤": r"\le",
    "×": r"\times",
    "÷": r"\div",
    "°": r"^{\circ}",
    "≡": r"\equiv",
    "∩": r"\cap",
    "∪": r"\cup",
    "∅": r"\emptyset",
    "∧": r"\land",
    "∨": r"\lor",
    "★": r"\star",
    "⊕": r"\oplus",
    "Δ": r"\Delta",
    "⊙": r"\odot",
    "⊗": r"\otimes",
    "♦": r"\diamondsuit",
    "○": r"\circ",
    "⊞": r"\boxplus",
    "♣": r"\clubsuit",
    "·": r"\cdot",
    "¼": r"\frac{1}{4}",
    "½": r"\frac{1}{2}",
    "¾": r"\frac{3}{4}",
    "−": "-",
}

PROTECTED_SLASH_RE = re.compile(
    r"\b(?:km/h|km/hr|m/s²|m/s\^2|m/s|cm/s|cm³/s|cm\^3/s|N/m²|N/m\^2|kg/m³|kg/m\^3|mol/dm³|mol/dm\^3|g/cm³|g/cm\^3|and/or|true/false|yes/no|either/or|profit/loss)\b",
    re.IGNORECASE,
)

MARKER_START = "\uE000"
MARKER_END = "\uE001"
MARKER_RE = re.compile(rf"{MARKER_START}(.*?){MARKER_END}", re.DOTALL)


def wrap_tok(latex: str) -> str:
    return f"{MARKER_START}{latex.strip()}{MARKER_END}"


def convert_inline_fragment(expr: str) -> str:
    """Convert raw math tokens inside an expression into clean KaTeX LaTeX."""
    s = expr.strip()
    if s.startswith("(") and s.endswith(")") and s.count("(") == 1 and s.count(")") == 1:
        # Leave inner parens only if needed elsewhere; strip for numer/denom calls if desired
        pass

    s = s.replace("−", "-")
    # Convert vulgar fractions
    s = s.replace("¼", r"\frac{1}{4}").replace("½", r"\frac{1}{2}").replace("¾", r"\frac{3}{4}")

    # Cube roots & square roots
    s = re.sub(r"∛\(([^()]+)\)", lambda m: rf"\sqrt[3]{{{convert_inline_fragment(m.group(1))}}}", s)
    s = re.sub(r"∛([A-Za-z0-9.]+)", r"\\sqrt[3]{\1}", s)
    s = re.sub(r"√\(([^()]+)\)", lambda m: rf"\sqrt{{{convert_inline_fragment(m.group(1))}}}", s)
    s = re.sub(r"√([A-Za-z0-9.]+)", r"\\sqrt{\1}", s)

    # Fractions a/b inside fragment (when not already \frac)
    s = re.sub(
        r"(?<![\\A-Za-z0-9.])(\d+)\s+(\d+)/(\d+)(?![A-Za-z0-9/])",
        r"\1\\frac{\2}{\3}",
        s,
    )
    s = re.sub(
        r"(\([^()]+\)|\\sqrt(?:\[3\])?\{[^}]+\}|[A-Za-z0-9]+)\s*/\s*(\([^()]+\)|\\sqrt(?:\[3\])?\{[^}]+\}|[A-Za-z0-9]+)",
        lambda m: rf"\frac{{{m.group(1).strip('()') if m.group(1).startswith('(') and m.group(1).endswith(')') else m.group(1)}}}{{{m.group(2).strip('()') if m.group(2).startswith('(') and m.group(2).endswith(')') else m.group(2)}}}",
        s,
    )

    # Powers: base^(exp) or base^token
    s = re.sub(
        r"\^\(([^()]+)\)",
        lambda m: f"^{{{convert_inline_fragment(m.group(1))}}}",
        s,
    )
    s = re.sub(r"\^([A-Za-z0-9+-]+)", r"^{\1}", s)

    # Format metric units cleanly inside math mode (e.g. 76cm² -> 76\,\text{cm}^{2})
    s = re.sub(
        rf"(\d)\s*(mm|cm|dm|km|m)([{re.escape(SUP_CHARS)}]+)",
        lambda m: rf"{m.group(1)}\,\text{{{m.group(2)}}}^{{{m.group(3).translate(SUP_MAP)}}}",
        s,
    )
    s = re.sub(
        rf"\b(mm|cm|dm|km|m)([{re.escape(SUP_CHARS)}]+)",
        lambda m: rf"\text{{{m.group(1)}}}^{{{m.group(2).translate(SUP_MAP)}}}",
        s,
    )

    # Unicode superscripts & subscripts
    s = re.sub(rf"([{re.escape(SUP_CHARS)}]+)", lambda m: "^{\\top}" if m.group(1) == "ᵀ" else f"^{{{m.group(1).translate(SUP_MAP).replace('ᵀ', r'\\top')}}}", s)
    s = re.sub(rf"([{re.escape(SUB_CHARS)}]+)", lambda m: f"_{{{m.group(1).translate(SUB_MAP)}}}", s)

    # Named symbols
    for ch, tex in SYMBOL_MAP.items():
        if ch in ("¼", "½", "¾", "−"):
            continue
        s = re.sub(re.escape(ch), lambda _m, t=tex: f" {t} " if t.startswith("\\") and not t.startswith("^{") else t, s)

    s = re.sub(r"\s{2,}", " ", s).strip()
    return s


def replace_outside_markers(text: str, pattern: re.Pattern[str], repl_fn) -> str:
    parts = re.split(rf"({MARKER_START}.*?{MARKER_END})", text, flags=re.DOTALL)
    out = []
    for part in parts:
        if part.startswith(MARKER_START) and part.endswith(MARKER_END):
            out.append(part)
        else:
            out.append(pattern.sub(repl_fn, part))
    return "".join(out)


def format_math_segment(segment: str) -> str:
    """Format a plain-text segment (without existing \\( ... \\) blocks) into neat \\( ... \\) LaTeX."""
    if not segment:
        return segment

    protected: list[str] = []

    def protect_match(m: re.Match[str]) -> str:
        idx = len(protected)
        protected.append(m.group(0))
        return f"\uE002{idx}\uE003"

    s = PROTECTED_SLASH_RE.sub(protect_match, segment)
    s = s.replace("³√", "∛")

    # 1. 2x2 matrices like [[2,3],[1,4]]
    s = replace_outside_markers(
        s,
        re.compile(r"\[\[\s*([^\[\],]+)\s*,\s*([^\[\],]+)\s*\]\s*,\s*\[\s*([^\[\],]+)\s*,\s*([^\[\],]+)\s*\]\]"),
        lambda m: wrap_tok(
            rf"\begin{{pmatrix}} {convert_inline_fragment(m.group(1))} & {convert_inline_fragment(m.group(2))} \\ {convert_inline_fragment(m.group(3))} & {convert_inline_fragment(m.group(4))} \end{{pmatrix}}"
        ),
    )

    # 2. Integrals like ∫₀¹ or bare ∫
    s = replace_outside_markers(
        s,
        re.compile(rf"∫([{re.escape(SUB_CHARS)}]+)?([{re.escape(SUP_CHARS)}]+)?"),
        lambda m: wrap_tok(
            r"\int"
            + (f"_{{{m.group(1).translate(SUB_MAP)}}}" if m.group(1) else "")
            + (f"^{{{m.group(2).translate(SUP_MAP)}}}" if m.group(2) else "")
        ),
    )

    # 3. Cube roots & square roots: ∛(...), ∛x, √(...), √x
    s = replace_outside_markers(
        s,
        re.compile(r"∛\(([^()]+)\)"),
        lambda m: wrap_tok(rf"\sqrt[3]{{{convert_inline_fragment(m.group(1))}}}"),
    )
    s = replace_outside_markers(
        s,
        re.compile(r"∛([A-Za-z0-9.]+)"),
        lambda m: wrap_tok(rf"\sqrt[3]{{{m.group(1)}}}"),
    )
    s = replace_outside_markers(
        s,
        re.compile(r"√\(([^()]+)\)"),
        lambda m: wrap_tok(rf"\sqrt{{{convert_inline_fragment(m.group(1))}}}"),
    )
    s = replace_outside_markers(
        s,
        re.compile(r"√([A-Za-z0-9.]+(?:\s*/\s*[A-Za-z0-9.]+)?)"),
        lambda m: wrap_tok(
            rf"\sqrt{{\frac{{{m.group(1).split('/')[0].strip()}}}{{{m.group(1).split('/')[1].strip()}}}}}"
            if "/" in m.group(1)
            else rf"\sqrt{{{m.group(1)}}}"
        ),
    )

    # 4. Parenthesized exponents like (1/4)^(−1/2), 3^(2x - 1), 4^(1/2), x^(1/2), 2^x
    s = replace_outside_markers(
        s,
        re.compile(r"(\([^()]+\)|[A-Za-z0-9]+)\^\(([^()]+)\)"),
        lambda m: wrap_tok(
            f"{convert_inline_fragment(m.group(1))}^{{{convert_inline_fragment(m.group(2))}}}"
        ),
    )
    s = replace_outside_markers(
        s,
        re.compile(r"(\([^()]+\)|[A-Za-z0-9]+)\^([A-Za-z0-9+-]+)"),
        lambda m: wrap_tok(f"{convert_inline_fragment(m.group(1))}^{{{m.group(2)}}}"),
    )

    # 5. Mixed numbers like 1 3/20, 1 1/12
    s = replace_outside_markers(
        s,
        re.compile(r"(?<![A-Za-z0-9.])(\d+)\s+(\d+)/(\d+)(?![A-Za-z0-9/]|(?:\.\d))"),
        lambda m: wrap_tok(rf"{m.group(1)}\frac{{{m.group(2)}}}{{{m.group(3)}}}"),
    )

    # 6. Parenthesized fractions like (2y + 4) / 3, 1/(x + 1)², or K/(2m)
    sup_opt = rf"(?:[{re.escape(SUP_CHARS)}{re.escape(SUB_CHARS)}]+)?"
    paren_atom = rf"\([^()]+\){sup_opt}"
    atom = rf"[A-Za-z0-9πθ{re.escape(SUP_CHARS)}{re.escape(SUB_CHARS)}]+"
    s = replace_outside_markers(
        s,
        re.compile(rf"({paren_atom})\s*/\s*({paren_atom}|{atom})"),
        lambda m: wrap_tok(
            rf"\frac{{{convert_inline_fragment(m.group(1)[1:-1] if m.group(1).startswith('(') and m.group(1).endswith(')') else m.group(1))}}}{{{convert_inline_fragment(m.group(2)[1:-1] if m.group(2).startswith('(') and m.group(2).endswith(')') else m.group(2))}}}"
        ),
    )
    s = replace_outside_markers(
        s,
        re.compile(rf"({atom})\s*/\s*({paren_atom})"),
        lambda m: wrap_tok(
            rf"\frac{{{convert_inline_fragment(m.group(1))}}}{{{convert_inline_fragment(m.group(2)[1:-1] if m.group(2).startswith('(') and m.group(2).endswith(')') else m.group(2))}}}"
        ),
    )

    # 7. Numeric / algebraic fractions like 22/7, 3/4, x/4, 1/x², 3V/4π, 2K/m
    # Allow sentence-ending period (not followed by a digit) after the denominator
    frac_num = rf"(?:\d+(?:\.\d+)?|[A-Za-z0-9πθ{re.escape(SUP_CHARS)}{re.escape(SUB_CHARS)}]{{1,4}})"
    s = replace_outside_markers(
        s,
        re.compile(rf"(?<![A-Za-z0-9.])({frac_num})\s*/\s*({frac_num})(?![A-Za-z0-9/]|(?:\.\d))"),
        lambda m: wrap_tok(rf"\frac{{{convert_inline_fragment(m.group(1))}}}{{{convert_inline_fragment(m.group(2))}}}")
        if (re.search(rf"[\dπθ{re.escape(SUP_CHARS)}{re.escape(SUB_CHARS)}]", m.group(1) + m.group(2)) or (len(m.group(1)) <= 2 and len(m.group(2)) <= 2))
        else m.group(0),
    )

    # 8. Set literals like {1, 2, 3, 4} or {a, b, c}
    s = replace_outside_markers(
        s,
        re.compile(r"\{([A-Za-z0-9,\s+-]+)\}"),
        lambda m: wrap_tok(rf"\{{{m.group(1).strip()}\}}"),
    )

    # 9. Tokens with Unicode superscripts/subscripts: 4x², 10⁻³, 11011₂, cm³, Aᵀ, etc.
    s = replace_outside_markers(
        s,
        re.compile(rf"([A-Za-z0-9.()]+(?:[{re.escape(SUP_CHARS)}{re.escape(SUB_CHARS)}]+)+)"),
        lambda m: wrap_tok(convert_inline_fragment(m.group(1))),
    )

    # 10. Standalone degree values like 30°, 540°
    s = replace_outside_markers(
        s,
        re.compile(r"(\d+(?:\.\d+)?|[A-Za-z])°"),
        lambda m: wrap_tok(rf"{m.group(1)}^{{\circ}}"),
    )

    # 11. Standalone symbols / vulgar fractions / Unicode minus in math expressions
    sym_pattern = re.compile("|".join(re.escape(k) for k in SYMBOL_MAP.keys()))
    s = replace_outside_markers(
        s,
        sym_pattern,
        lambda m: wrap_tok(SYMBOL_MAP[m.group(0)]),
    )

    # 12. Merge adjacent <<LATEX>> blocks separated by numbers/vars/operators/whitespace (not English words)
    # Single-pass loop until fixed point:
    # Join `<<LATEX:A>> <connectors/numbers/single-letter vars> <<LATEX:B>>`
    connector_re = re.compile(
        rf"{MARKER_START}(.*?){MARKER_END}(\s*(?:[+\-*/=<>(),\d.]|\b[a-zA-Z]\b|\bdx\b|\bdy\b|\bmod\b|\bsin\b|\bcos\b|\btan\b|\blog\b)+\s*){MARKER_START}(.*?){MARKER_END}",
        re.DOTALL,
    )
    while True:
        new_s = connector_re.sub(
            lambda m: wrap_tok(
                f"{m.group(1)} {re.sub(r'\s+', ' ', m.group(2)).strip()} {m.group(3)}".strip()
            ),
            s,
        )
        if new_s == s:
            break
        s = new_s

    # Expand surrounding equation parts into adjacent marker:
    # Leading math expression right before a marker, e.g. `3x - 2 <<\ge>>` or `sin <<\theta>> = 0.5` or `(A <<\cup>> B)'`
    # Trailing math expression right after a marker, e.g. `<<\ge>> 4x - 6` or `<<\pi>> = 22/7`
    # Careful not to swallow words like "is", "of", "to", "find", "and"
    func_prefix_re = re.compile(
        rf"(?<![A-Za-z])((?:\b(?:sin|cos|tan|log|mod|lim)\b|[(\d-][A-Za-z0-9()+\-*=.,\s]*?(?<!\band\s)(?<!\bof\s)(?<!\bto\s)(?<!\bis\s)(?<!\bin\s)(?<!\bfor\s))\s*){MARKER_START}(.*?){MARKER_END}",
        re.DOTALL,
    )
    # Apply conservative expansion only for clear short math prefixes/suffixes (<= 24 chars, no lowercase >2-letter words except trig/log/dx)
    ALLOWED_MATH_WORDS = {"sin", "cos", "tan", "cot", "sec", "csc", "log", "ln", "mod", "dx", "dy", "dt"}

    def clean_math_chunk(raw_chunk: str) -> bool:
        words = re.findall(r"[A-Za-z]+", raw_chunk)
        return all((len(w) <= 2 and w.lower() not in {"is", "in", "of", "to", "on", "at", "by", "if", "or", "an", "as", "it", "be", "we", "he", "no", "so"}) or w.lower() in ALLOWED_MATH_WORDS for w in words)

    parts = re.split(rf"({MARKER_START}.*?{MARKER_END})", s, flags=re.DOTALL)
    for idx in range(len(parts)):
        if parts[idx].startswith(MARKER_START) and parts[idx].endswith(MARKER_END):
            inner = parts[idx][1:-1]
            # Pull immediate trailing math tail like ` = 0` or ` + C` or ` dx` or `' ` from parts[idx+1]
            if idx + 1 < len(parts) and not parts[idx + 1].startswith(MARKER_START):
                tail_m = re.match(r"^(\s*(?:[+\-*=<>',^]|[a-zA-Z0-9()]+(?:\s*[+\-*=<>]\s*[a-zA-Z0-9()]+)*)+)(?=\s*(?:[.,;?!)]?\s|$|[A-Za-z]{3,}))", parts[idx + 1])
                if tail_m:
                    tail = tail_m.group(1)
                    if clean_math_chunk(tail) and any(ch in tail for ch in "=+-<>'0123456789") and not re.match(r"^\s*\d+\s*$", tail):
                        inner = f"{inner}{tail}"
                        parts[idx + 1] = parts[idx + 1][len(tail):]
            # Pull immediate leading math prefix like `sin ` or `3x - 2 ` or `A = `
            if idx - 1 >= 0 and not parts[idx - 1].startswith(MARKER_START):
                prev = parts[idx - 1]
                # Match after colon, comma, space+word, or start
                lead_m = re.search(r"(?:^|(?<=:\s)|(?<=,\s)|(?<=\.\s)|(?<=\(\s))([A-Za-z0-9()+\-*=<>.\s]{1,28})$", prev)
                if lead_m:
                    cand = lead_m.group(1)
                    if cand.strip() and clean_math_chunk(cand) and (
                        any(ch in cand for ch in "=+-*/<>()^0123456789")
                        or any(w.lower() in ALLOWED_MATH_WORDS for w in re.findall(r"[A-Za-z]+", cand))
                    ):
                        # Preserve leading whitespace before math
                        ws_lead = cand[: len(cand) - len(cand.lstrip())]
                        core = cand.lstrip()
                        if core:
                            inner = f"{core}{inner}"
                            parts[idx - 1] = prev[: len(prev) - len(cand)] + ws_lead
            parts[idx] = wrap_tok(inner)

    s = "".join(parts)

    # Restore protected tokens
    for idx, orig in enumerate(protected):
        s = s.replace(f"\uE002{idx}\uE003", orig)

    # Convert markers to \( ... \), clean spacing
    def finalize_marker(m: re.Match[str]) -> str:
        tex = m.group(1).strip()
        tex = re.sub(r"\s{2,}", " ", tex)
        return rf"\({tex}\)"

    s = MARKER_RE.sub(finalize_marker, s)
    # Collapse accidental adjacent \(\) \(\) separated only by whitespace
    s = re.sub(r"\\\)\s+\\\(", " ", s)
    return s


def format_math_text(text: str) -> str:
    if not text or not isinstance(text, str):
        return text

    # Preserve option prefix like "A. "
    prefix = ""
    body = text
    opt_m = re.match(r"^([A-D]\.\s+)(.*)$", text, flags=re.DOTALL)
    if opt_m:
        prefix, body = opt_m.group(1), opt_m.group(2)

    # Preserve any existing \( ... \) blocks untouched
    chunks = re.split(r"(\\\(.*?\\\))", body, flags=re.DOTALL)
    out = []
    for chunk in chunks:
        if chunk.startswith(r"\(") and chunk.endswith(r"\)"):
            out.append(chunk)
        else:
            out.append(format_math_segment(chunk))
    return prefix + "".join(out)


def analyze_file(filepath: Path, apply_changes: bool = False) -> tuple[int, int]:
    data = json.loads(filepath.read_text(encoding="utf-8"))
    changed_items = 0

    for item in data:
        new_q = format_math_text(item.get("question", ""))
        new_opts = [format_math_text(opt) for opt in item.get("options", [])]
        if new_q != item.get("question") or new_opts != item.get("options"):
            changed_items += 1
            if apply_changes:
                item["question"] = new_q
                item["options"] = new_opts

    if apply_changes and changed_items > 0:
        filepath.write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    print(f"{filepath}: total={len(data)}, {'updated' if apply_changes else 'needs_update'}={changed_items}")
    return len(data), changed_items


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze and convert Mathematics JSONs to KaTeX LaTeX.")
    parser.add_argument("--apply", action="store_true", help="Write formatted LaTeX changes to all Mathematics JSON files.")
    args = parser.parse_args()

    for path in MATH_FILES:
        if path.exists():
            analyze_file(path, apply_changes=args.apply)
        else:
            print(f"{path}: NOT FOUND")


if __name__ == "__main__":
    main()
