import sys
import json
import re

# Set console encoding to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

def analyze_file(filepath):
    print(f"=== Analyzing {filepath} ===")
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    
    # We want to find patterns of:
    # 1. Superscripts (², ³, ⁴, ⁻², ⁻³, etc.)
    # 2. Subscripts (₂, ₁₀, etc.)
    # 3. Fractions (containing /)
    # 4. Special math characters (π, θ, ≥, ≤, ×, ÷, etc.)
    # 5. Formulas that look like equations but aren't formatted
    
    super_chars = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿˣʸ"
    sub_chars = "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎"
    
    for i, item in enumerate(data): # Look at all questions
        question = item.get("question", "")
        options = item.get("options", [])
        answer = item.get("answer", "")

        
        has_super = any(c in question for c in super_chars) or any(any(c in opt for c in super_chars) for opt in options)
        has_sub = any(c in question for c in sub_chars) or any(any(c in opt for c in sub_chars) for opt in options)
        has_slash = "/" in question or any("/" in opt for opt in options)
        has_special = any(c in question for c in "πθ≥≤×÷√°") or any(any(c in opt for c in "πθ≥≤×÷√°") for opt in options)
        
        if has_super or has_sub or has_slash or has_special:
            if has_slash:
                print(f"SLASH MATCH Q{item['id']}: {question}")
                print(f"  Options: {options}")
            else:
                print(f"Q{item['id']}: {question}")
                print(f"  Options: {options}")

if __name__ == "__main__":
    analyze_file("Json/Maths_Solid Q's.json")
    analyze_file("Json/Maths_Training mode.json")

