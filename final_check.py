#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Final check for any remaining encoding issues"""

file_path = r'c:\Users\Nicho\Desktop\mla-quiz-pwa\MLA-Quiz\static\js\drugDatabase.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check for any remaining suspicious character patterns
issues = []

# Check for â followed by other characters (often indicates double-encoding)
if '\u00e2' in content:
    count = content.count('\u00e2')
    # Get sample contexts
    idx = content.find('\u00e2')
    if idx != -1:
        context = content[max(0, idx-10):idx+20]
        issues.append(f"Found â (U+00E2) {count} times. Sample: {repr(context)}")

# Check for Î followed by other characters
if '\u00ce' in content:
    count = content.count('\u00ce')
    idx = content.find('\u00ce')
    if idx != -1:
        context = content[max(0, idx-10):idx+20]
        issues.append(f"Found Î (U+00CE) {count} times. Sample: {repr(context)}")

# Check for dagger character (†) which shouldn't appear in drug interactions
if '\u2020' in content:
    count = content.count('\u2020')
    idx = content.find('\u2020')
    if idx != -1:
        context = content[max(0, idx-10):idx+20]
        issues.append(f"Found † (U+2020 DAGGER) {count} times. Sample: {repr(context)}")

# Check for smart quotes that might be part of corrupted sequences
left_quote = content.count('\u2018')  # '
right_quote = content.count('\u2019')  # '
left_dquote = content.count('\u201c')  # "
right_dquote = content.count('\u201d')  # "

if issues:
    print("⚠️  REMAINING ENCODING ISSUES FOUND:")
    for issue in issues:
        print(f"  {issue}")
else:
    print("✅ NO ENCODING ISSUES DETECTED!")

print()
print("Summary of special characters:")
up_arrow_count = content.count('\u2191')
down_arrow_count = content.count('\u2193')
beta_count = content.count('\u03b2')
alpha_count = content.count('\u03b1')
delta_count = content.count('\u03b4')

print(f"  ↑ (U+2191 UPWARDS ARROW): {up_arrow_count}")
print(f"  ↓ (U+2193 DOWNWARDS ARROW): {down_arrow_count}")
print(f"  β (U+03B2 GREEK SMALL LETTER BETA): {beta_count}")
print(f"  α (U+03B1 GREEK SMALL LETTER ALPHA): {alpha_count}")
print(f"  δ (U+03B4 GREEK SMALL LETTER DELTA): {delta_count}")
print()
print(f"  Smart quotes (LEFT SINGLE): {left_quote}")
print(f"  Smart quotes (RIGHT SINGLE): {right_quote}")
print(f"  Smart quotes (LEFT DOUBLE): {left_dquote}")
print(f"  Smart quotes (RIGHT DOUBLE): {right_dquote}")
