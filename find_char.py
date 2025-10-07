#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Find the ≥ character encoding"""

import unicodedata

file_path = r'c:\Users\Nicho\Desktop\mla-quiz-pwa\MLA-Quiz\static\js\drugDatabase.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find contexts with â
idx = content.find('â')
if idx != -1:
    # Get 50 chars around it
    start = max(0, idx - 20)
    end = min(len(content), idx + 30)
    segment = content[start:end]
    
    print("Segment with â:")
    print(segment)
    print()
    print("Character breakdown:")
    for i, char in enumerate(segment):
        code_point = ord(char)
        if code_point > 127 or char in'âÎ':
            name = unicodedata.name(char, "UNKNOWN")
            print(f"  pos {i}: '{char}' = U+{code_point:04X} ({name})")
