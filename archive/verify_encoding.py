#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verify the encoding fixes in drugDatabase.js"""

import unicodedata

file_path = r'c:\Users\Nicho\Desktop\mla-quiz-pwa\MLA-Quiz\static\js\drugDatabase.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Get a sample line
lines = content.split('\n')
sample_line = None
for line in lines:
    if 'Nephrotoxic' in line and 'interactions' in line:
        sample_line = line
        break

print("Sample line with arrow:")
print(sample_line)
print()

# Check for proper characters
proper_up = chr(0x2191)  # ↑
proper_down = chr(0x2193)  # ↓
proper_beta = chr(0x03b2)  # β
proper_alpha = chr(0x03b1)  # α

print(f"Character analysis:")
print(f"  Proper ↑ (U+2191) count: {content.count(proper_up)}")
print(f"  Proper ↓ (U+2193) count: {content.count(proper_down)}")
print(f"  Proper β (U+03B2) count: {content.count(proper_beta)}")
print(f"  Proper α (U+03B1) count: {content.count(proper_alpha)}")
print()

# Analyze characters in sample line
if sample_line:
    print("Non-ASCII characters in sample line:")
    for char in sample_line:
        if ord(char) > 127:
            code_point = f"U+{ord(char):04X}"
            name = unicodedata.name(char, "UNKNOWN")
            print(f"  '{char}' = {code_point} ({name})")
