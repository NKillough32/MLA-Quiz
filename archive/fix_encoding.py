#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix UTF-8 encoding corruption in drugDatabase.js
Replaces:
- â†' → ↑ (increase/up arrow)
- â†" → ↓ (decrease/down arrow)
- Î² → β (beta character)
"""

import os

file_path = r'c:\Users\Nicho\Desktop\mla-quiz-pwa\MLA-Quiz\static\js\drugDatabase.js'

# Read the file with UTF-8 encoding
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the corrupted sequences and their replacements
# The file has literal multi-byte character sequences from double-encoding
replacements = [
    ('\u00e2\u2020\u2018', '\u2191'),  # â†' → ↑ (up arrow)
    ('\u00e2\u2020\u201c', '\u2193'),  # â†" → ↓ (down arrow)
    ('\u00ce\u00b2', '\u03b2'),        # Î² → β (beta)
    ('\u00ce\u00b1', '\u03b1'),        # Î± → α (alpha)
    ('\u00ce\u00b4', '\u03b4'),        # Î´ → δ (delta)
    ('\u00e2\u2030\u00a5', '\u2265'),  # â‰¥ → ≥ (greater than or equal)
    ('\u00e2\u2030\u00a4', '\u2264'),  # â‰¤ → ≤ (less than or equal)
    ('\u00ce\u00bc', '\u03bc'),        # Î¼ → μ (mu)
    ('\u00c2\u00bd', '\u00bd'),        # Â½ → ½ (one half)
    ('\u00c2\u00b1', '\u00b1'),        # Â± → ± (plus-minus)
]

# Count occurrences before replacement
counts = {}
for old, new in replacements:
    counts[old] = content.count(old)

print(f"Found corrupted characters:")
print(f"  Up arrow corrupted: {counts[replacements[0][0]]} occurrences")
print(f"  Down arrow corrupted: {counts[replacements[1][0]]} occurrences")
print(f"  Beta character corrupted: {counts[replacements[2][0]]} occurrences")
print(f"  Alpha character corrupted: {counts[replacements[3][0]]} occurrences")
print(f"  Delta character corrupted: {counts[replacements[4][0]]} occurrences")
print(f"  Greater-or-equal corrupted: {counts[replacements[5][0]]} occurrences")
print(f"  Less-or-equal corrupted: {counts[replacements[6][0]]} occurrences")
print(f"  Mu character corrupted: {counts[replacements[7][0]]} occurrences")
print(f"  One-half (½) corrupted: {counts[replacements[8][0]]} occurrences")
print(f"  Plus-minus (±) corrupted: {counts[replacements[9][0]]} occurrences")
print()

# Perform replacements
for old, new in replacements:
    content = content.replace(old, new)

# Write back with UTF-8 encoding
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Replacements complete!")
print(f"  Up arrows fixed: {counts[replacements[0][0]]} replacements")
print(f"  Down arrows fixed: {counts[replacements[1][0]]} replacements")
print(f"  Beta characters fixed: {counts[replacements[2][0]]} replacements")
print(f"  Alpha characters fixed: {counts[replacements[3][0]]} replacements")
print(f"  Delta characters fixed: {counts[replacements[4][0]]} replacements")
print()
total = sum(counts.values())
print(f"Total: {total} characters fixed")

# Verify by reading the file again
with open(file_path, 'r', encoding='utf-8') as f:
    final_content = f.read()

print("\nVerification:")
print(f"  Proper up arrow ↑ count: {final_content.count('↑')}")
print(f"  Proper down arrow ↓ count: {final_content.count('↓')}")
print(f"  Proper beta β count: {final_content.count('β')}")
print(f"  Proper alpha α count: {final_content.count('α')}")
print(f"  Proper delta δ count: {final_content.count('δ')}")

# Check for remaining corruption
corrupt_up = final_content.count('\u00e2\u0086\u0091')
corrupt_down = final_content.count('\u00e2\u0086\u0093')
corrupt_beta = final_content.count('\u00ce\u00b2')
corrupt_alpha = final_content.count('\u00ce\u00b1')
corrupt_delta = final_content.count('\u00ce\u00b4')

if corrupt_up + corrupt_down + corrupt_beta + corrupt_alpha + corrupt_delta > 0:
    print("\n⚠️ WARNING: Still found corrupted characters!")
    if corrupt_up > 0: print(f"  Corrupted up arrows: {corrupt_up}")
    if corrupt_down > 0: print(f"  Corrupted down arrows: {corrupt_down}")
    if corrupt_beta > 0: print(f"  Corrupted beta: {corrupt_beta}")
    if corrupt_alpha > 0: print(f"  Corrupted alpha: {corrupt_alpha}")
    if corrupt_delta > 0: print(f"  Corrupted delta: {corrupt_delta}")
else:
    print("\n✅ All UTF-8 encoding corruption fixed!")
