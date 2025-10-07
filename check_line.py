#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Check line 1626 for encoding issues"""

import unicodedata

file_path = r'c:\Users\Nicho\Desktop\mla-quiz-pwa\MLA-Quiz\static\js\drugDatabase.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

line = lines[1092]  # Line 1093 (0-indexed)

print("Line 1093:")
print(line.strip())
print()

print("Non-ASCII characters in this line:")
for char in line:
    if ord(char) > 127:
        code_point = f"U+{ord(char):04X}"
        name = unicodedata.name(char, "UNKNOWN")
        print(f"  '{char}' = {code_point} ({name})")

# Check for the specific issue around Â
idx = line.find('Â')
if idx != -1:
    context = line[max(0, idx-5):idx+5]
    print()
    print("Context around Â symbol:")
    print(repr(context))
    print()
    print("Characters in context:")
    for char in context:
        code_point = f"U+{ord(char):04X}"
        name = unicodedata.name(char, "UNKNOWN")
        print(f"  '{char}' = {code_point} ({name})")
