#!/usr/bin/env python3
"""
Vercel Serverless Function Entry Point for MLA Quiz PWA
This file contains the Flask app for Vercel's serverless environment
"""

import os
import re
import json
import hashlib
import time
import logging
import base64
import zipfile
import io
from pathlib import Path
from typing import List, Dict, Any, Optional
from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, 
           template_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates'),
           static_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static'))
CORS(app)  # Enable CORS for development

# Reuse the QuizLoader logic from your existing main.py
class PWAQuizLoader:
    """PWA version of QuizLoader that reuses your existing parsing logic."""
    
    _cache = {}
    QUESTION_RE = re.compile(r'(###\s*\d+\..*?)(?=###\s*\d+\.|\Z)', re.DOTALL)
    SPECIALTY_HEADER_RE = re.compile(r'^##\s+(.+?)$', re.MULTILINE)
    
    @staticmethod
    def _get_file_hash_and_content(path):
        """Get file hash and content - reused from your main.py."""
        try:
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            file_hash = hashlib.md5(content.encode()).hexdigest()
            return file_hash, content
        except Exception as e:
            logger.error(f"Error reading file {path}: {e}")
            return None, None
    
    @staticmethod
    def analyze_investigation_variations(content):
        """Analyze Investigation section variations - from your main.py."""
        variations = {}
        total_count = 0
        
        # Pattern to find all Investigation/Investigations sections
        pattern = r'\*\*Investigations?(?::\*\*|\*\*:)\s*'
        
        matches = re.finditer(pattern, content, re.IGNORECASE)
        for match in matches:
            variation = match.group(0)
            variations[variation] = variations.get(variation, 0) + 1
            total_count += 1
        
        logger.info(f"Found {total_count} Investigation sections with {len(variations)} variations")
        return variations
    
    @staticmethod
    def _parse_question(block, specialty):
        """Parse a markdown question block - reused from your main.py with modifications."""
        if not block or not block.strip().startswith('###'):
            return None

        m = re.match(r'###\s*(\d+)\.\s*(.*?)\n(.*)', block, re.DOTALL)
        if not m:
            return None

        num, title, rest = m.groups()
        # Remove maxsplit limitation to capture all sections including image and question after image
        parts = [p.strip() for p in re.split(r'\n\s*\n', rest) if p.strip()]
        
        logger.info(f"Question {num}: Split into {len(parts)} parts")
        for idx, part in enumerate(parts):
            logger.info(f"Question {num}: parts[{idx}] = '{part[:100]}...'" if len(part) > 100 else f"Question {num}: parts[{idx}] = '{part}'")

        scenario = parts[0] if parts else ""
        investigation_index = None
        investigations = ""

        # Handle cases where the first section actually contains the options
        # (i.e. no scenario/stem provided, only the prompt/options in the first block).
        # If parts[0] starts with option markers (A. or A) ), treat it as the prompt
        # rather than the scenario. This fixes parsing of "prompt-only" questions.
        prompt_from_first_section = False
        if parts:
            if re.search(r'^\s*[A-Z][\.)]\s+', parts[0], re.MULTILINE):
                logger.info(f"Question {num}: Detected options in first section; treating parts[0] as prompt")
                scenario = ""
                prompt = parts[0]
                tail_start = 1
                # Mark that prompt/options were provided in the first section so later
                # logic doesn't overwrite prompt when inspecting parts[1]
                prompt_from_first_section = True

        for i, part in enumerate(parts):
            # Enhanced regex to handle all Investigation section variations
            # Matches: **Investigations:** OR **Investigations**: OR **Investigation:** OR **Investigation**:
            investigation_pattern = r'\*\*Investigations?(?::\*\*|\*\*:|:\*\*|\*\*)\s*'
            investigation_match = re.search(investigation_pattern, part, re.IGNORECASE)
            
            if investigation_match:
                investigation_index = i
                # Extract investigations content
                investigations = re.sub(investigation_pattern, '', parts[i], flags=re.IGNORECASE).strip()
                break

        # Default prompt handling: do NOT invent or insert assumed prompt text.
        # If a prompt wasn't found, leave it empty so callers/UI can decide how to
        # display or prompt the user. This avoids inserting potentially misleading
        # medical questions like "What is the most likely diagnosis?" automatically.
        if 'prompt' not in locals():
            prompt = ""
        if 'tail_start' not in locals():
            tail_start = 1
        image = ""  # Store image reference separately for frontend display

        if investigation_index is not None:
            if investigation_index + 1 < len(parts):
                potential_prompt = parts[investigation_index + 1]
                logger.info(f"Question {num}: Section after investigations: '{potential_prompt[:100]}'")
                
                # Check if this section is just an image reference
                # Pattern: [IMAGE: filename.png] or ![Image](__REF__:filename)
                is_image_only = re.match(r'^\s*(\[IMAGE:\s*[^\]]+\]|!\[Image\]\([^)]+\))\s*$', potential_prompt.strip())
                
                if is_image_only:
                    logger.info(f"Question {num}: Detected image-only section")
                    logger.info(f"Question {num}: len(parts)={len(parts)}, investigation_index={investigation_index}")
                    logger.info(f"Question {num}: Checking if investigation_index + 2 ({investigation_index + 2}) < len(parts) ({len(parts)})")
                    # Store the image reference separately
                    image = potential_prompt.strip()
                    
                    if investigation_index + 2 < len(parts):
                        # The actual question comes AFTER the image in a separate section
                        prompt = parts[investigation_index + 2]
                        tail_start = investigation_index + 3
                        logger.info(f"Question {num}: Using section after image as prompt: '{prompt[:100]}'")
                    else:
                        logger.warning(f"Question {num}: Image detected but no section after image (investigation_index={investigation_index}, len(parts)={len(parts)})")
                        tail_start = investigation_index + 2
                else:
                    # Not image-only, but check if image is embedded in the text
                    # Split the section into lines to separate image from question
                    section_lines = potential_prompt.split('\n')
                    image_lines = []
                    question_lines = []
                    found_image = False
                    
                    for line in section_lines:
                        # Check if line contains an image reference
                        if re.match(r'^\s*(\[IMAGE:\s*[^\]]+\]|!\[Image\]\([^)]+\))\s*$', line.strip()):
                            image_lines.append(line)
                            found_image = True
                        elif found_image:
                            # Everything after the image is the question
                            question_lines.append(line)
                        elif not found_image and not line.strip():
                            # Empty line before we found image, skip it
                            continue
                        elif not found_image:
                            # Before image, could be part of investigations or scenario
                            question_lines.append(line)
                    
                    if found_image and question_lines:
                        # Found image embedded with question - separate them
                        prompt = '\n'.join(question_lines).strip()
                        logger.info(f"Question {num}: Separated embedded image from question: '{prompt[:100]}'")
                        tail_start = investigation_index + 2
                    else:
                        # No image found, use as-is
                        prompt = potential_prompt
                        tail_start = investigation_index + 2
            else:
                scenario_parts_check = scenario.split('\n\n')
                if len(scenario_parts_check) > 1:
                    prompt = scenario_parts_check[-1]
                    scenario = '\n\n'.join(scenario_parts_check[:-1])
        elif len(parts) >= 2:
            # If we already detected options/prompt in the first section, skip the
            # complex logic that would overwrite prompt using parts[1]. The
            # correct flow is to treat parts[1:] as tail (answer/explanation).
            if 'prompt_from_first_section' in locals() and prompt_from_first_section:
                logger.info(f"Question {num}: prompt came from first section, skipping parts[1] processing")
            else:
                potential_prompt = parts[1]
                logger.info(f"Question {num}: Section after scenario: '{potential_prompt[:100]}'")
                logger.info(f"Question {num}: DEBUG - len(parts)={len(parts)}, parts array: {[p[:50] + '...' if len(p) > 50 else p for p in parts]}")
            
            # Check if the section after scenario is an image reference
            
                is_image_only = re.match(r'^\s*(\[IMAGE:\s*[^\]]+\]|!\[Image\]\([^)]+\))\s*$', potential_prompt.strip())
                
                if is_image_only:
                    logger.info(f"Question {num}: Detected image-only section after scenario")
                    # Store the image reference separately
                    image = potential_prompt.strip()
                    logger.info(f"Question {num}: DEBUG - Stored image reference: '{image}'")
                    
                    if len(parts) >= 3:
                        # The actual question comes AFTER the image in a separate section
                        logger.info(f"Question {num}: DEBUG - BEFORE assignment: prompt='{prompt}'")
                        logger.info(f"Question {num}: DEBUG - parts[2] content: '{parts[2]}'")
                        prompt = parts[2]
                        logger.info(f"Question {num}: DEBUG - AFTER assignment: prompt='{prompt}'")
                        tail_start = 3
                        logger.info(f"Question {num}: Using section after image as prompt: '{prompt[:100]}'")
                    else:
                        logger.warning(f"Question {num}: Image detected but no section after image")
                        tail_start = 2
                else:
                    # Not image-only, but check if image is embedded in the text
                    logger.info(f"Question {num}: Checking for embedded image in section (length {len(potential_prompt)} chars)")
                    section_lines = potential_prompt.split('\n')
                    logger.info(f"Question {num}: Section has {len(section_lines)} lines")
                    image_lines = []
                    question_lines = []
                    found_image = False
                    
                    for idx, line in enumerate(section_lines):
                        is_image_line = re.match(r'^\s*(\[IMAGE:\s*[^\]]+\]|!\[Image\]\([^)]+\))\s*$', line.strip())
                        if is_image_line:
                            logger.info(f"Question {num}: Line {idx} is image: '{line.strip()[:80]}'")
                            image_lines.append(line)
                            found_image = True
                        elif found_image:
                            logger.info(f"Question {num}: Line {idx} after image: '{line.strip()[:80]}'")
                            question_lines.append(line)
                        elif not found_image and not line.strip():
                            continue
                        elif not found_image:
                            question_lines.append(line)
                    
                    if found_image and question_lines:
                        prompt = '\n'.join(question_lines).strip()
                        logger.info(f"Question {num}: Separated embedded image from question: '{prompt[:100]}'")
                        tail_start = 2
                    else:
                        logger.info(f"Question {num}: No embedded image found or no question lines after image (found_image={found_image}, question_lines={len(question_lines)})")
                        prompt = potential_prompt
                        tail_start = 2

        # Extract options (A, B, C, D, etc.)
        options = []
        explanations = []
        
        # Combine all tail parts to search for answer
        tail_content = '\n\n'.join(parts[tail_start:])
        logger.info(f"Question {num} tail content (first 500 chars): {tail_content[:500]}")
        
        # Parse answer using flexible regex to handle both formats
        # Matches: **Answer:** A OR **Answer**: A OR **Ans:** A OR **Ans**: A
        answer_match = re.search(r'\*\*Ans(?:wer)?(?::\*\*|\*\*:|:\*\*|\*\*)\s*([A-Z])\.?', tail_content, re.IGNORECASE)
        answer_letter = answer_match.group(1).upper() if answer_match else None
        
        # Convert letter to index (A=0, B=1, C=2, etc.)
        correct_answer = ord(answer_letter) - ord('A') if answer_letter else None
        
        logger.info(f"Answer detection: found pattern '{answer_match.group(0) if answer_match else 'None'}' -> letter={answer_letter}, index={correct_answer}")
        
        for part in parts[tail_start:]:
            lines = part.strip().split('\n')
            current_options = []
            current_explanations = []
            
            for line in lines:
                line = line.strip()
                option_match = re.match(r'^([A-Z])[.)]\s*(.*)', line)
                if option_match:
                    letter, text = option_match.groups()
                    current_options.append(f"{letter}) {text}")
                
                # Look for explanations using main.py format
                elif line.startswith('Explanation:') or line.startswith('Answer:'):
                    current_explanations.append(line)
            
            if current_options:
                options.extend(current_options)
                explanations.extend(current_explanations)
        
        # Parse explanation using multiple patterns from main.py and common formats
        explanation_patterns = [
            # Main.py format
            r'\*\*(?:Explanation|Rationale)\*\*:\s*(.*?)(?=\n-{3,}|\n\*\*\s*End Explanation\s*\*\*|$)',
            # Simple formats
            r'Explanation:\s*(.*?)(?=\n\n|\n[A-Z]\.|$)',
            r'Answer:\s*[A-Z]\.?\s*(.*?)(?=\n\n|\n[A-Z]\.|$)', 
            r'\*\*Explanation\*\*\s*(.*?)(?=\n\n|\n[A-Z]\.|$)',
            # Format with Answer: X followed by explanation
            r'Answer:\s*[A-Z]\.?\s*\n(.*?)(?=\n\n|\n[A-Z]\.|$)',
            # Just look for any text after "Answer: X"
            r'Answer:\s*[A-Z]\.?\s*[-:\s]*(.*?)(?=\n\n|\n###|$)'
        ]
        
        explanation = ""
        for pattern in explanation_patterns:
            explanation_match = re.search(pattern, tail_content, re.DOTALL | re.IGNORECASE)
            if explanation_match:
                explanation = explanation_match.group(1).strip()
                logger.info(f"Found explanation for question {num} using pattern: {explanation[:100]}...")
                break
        
        if explanation:
            explanations = [f"Explanation: {explanation}"]
        else:
            logger.warning(f"No explanation found for question {num}. Tail content sample: {tail_content[:300]}")
            explanations = []

        # Extract options from prompt if they're mixed together
        # This is common when question and options are in the same markdown section
        
        # SIMPLER LOGIC: If prompt is just an image, find the question sentence before the options
        logger.info(f"Question {num}: DEBUG - About to check fallback. Current prompt value: '{prompt}'")
        logger.info(f"Question {num}: DEBUG - tail_start={tail_start}, len(parts)={len(parts)}")
        if re.match(r'^\s*(\[IMAGE:\s*[^\]]+\]|!\[Image\]\([^)]+\))\s*$', prompt.strip()):
            logger.warning(f"Question {num}: Prompt is still just an image after parsing! Looking for question before options...")
            
            # Look through the tail parts (where options should be) to find the question
            question_found = False
            for i in range(tail_start, len(parts)):
                part = parts[i]
                logger.info(f"Question {num}: Checking parts[{i}] for options/question: '{part[:100]}'")
                # Check if this part contains options (starts with A. or A))
                if re.search(r'^\s*[A-Z][.)]\s', part, re.MULTILINE):
                    logger.info(f"Question {num}: Found options in parts[{i}]")
                    # The question should be right before the first option
                    # Split by newlines and find the last sentence before options
                    lines = part.split('\n')
                    question_lines = []
                    for line in lines:
                        if re.match(r'^\s*[A-Z][.)]\s', line):
                            # Found first option, stop
                            break
                        if line.strip():
                            question_lines.append(line.strip())
                    
                    if question_lines:
                        # Join the lines that come before options
                        potential_question = ' '.join(question_lines).strip()
                        # Check if it ends with a question mark
                        if potential_question.endswith('?'):
                            prompt = potential_question
                            question_found = True
                            logger.info(f"Question {num}: Found question before options: '{prompt}'")
                            break
                        # Even if no question mark, use the last sentence before options
                        elif len(potential_question) > 10:
                            prompt = potential_question
                            question_found = True
                            logger.info(f"Question {num}: Using text before options as question: '{prompt}'")
                            break
            
                if not question_found:
                    # Check in scenario if it ends with a question and use it only if
                    # genuinely present. Otherwise leave prompt empty.
                    if scenario.strip().endswith('?'):
                        # Get the last sentence from scenario
                        sentences = re.split(r'[.!]\s+', scenario)
                        if sentences and sentences[-1].strip().endswith('?'):
                            prompt = sentences[-1].strip()
                            logger.info(f"Question {num}: Extracted question from end of scenario: '{prompt}'")
                            question_found = True

                if not question_found:
                    # Do NOT invent a prompt. Leave prompt empty to avoid misleading
                    # content being injected into question data.
                    prompt = ""
                    logger.info(f"Question {num}: No explicit prompt found; leaving prompt empty")
        else:
            logger.info(f"Question {num}: DEBUG - Fallback check passed, prompt is NOT just an image")
        
        prompt_lines = prompt.split('\n')
        option_lines = []
        non_option_lines = []
        
        for line in prompt_lines:
            line_stripped = line.strip()
            # Match option patterns like "A) Option text" or "A. Option text"
            if re.match(r'^([A-Z])[.)]\s*', line_stripped):
                option_lines.append(line_stripped)
            else:
                non_option_lines.append(line)
        
        if option_lines:
            # Options were found in the prompt section
            if not options:
                # No options found elsewhere, use these
                options = option_lines
            else:
                # Options found in both places, prefer the ones from prompt
                options = option_lines
            # Clean the prompt to only contain the question text
            prompt = '\n'.join(non_option_lines).strip()
            logger.info(f"Question {num}: Extracted {len(option_lines)} options from prompt section")

        logger.info(f"Parsed question {num}: title='{title[:50] if len(title) > 50 else title}', prompt='{prompt[:80] if prompt else 'None'}', options={len(options)}, correct_answer={correct_answer}")
        if correct_answer is None and options:
            logger.warning(f"No correct answer found for question {num}. Sample content: {tail_content[:200]}...")

        logger.info(f"Question {num}: DEBUG - FINAL VALUES BEFORE RETURN:")
        logger.info(f"Question {num}: DEBUG - scenario='{scenario[:100] if len(scenario) > 100 else scenario}'")
        logger.info(f"Question {num}: DEBUG - prompt='{prompt}'")
        logger.info(f"Question {num}: DEBUG - image='{image}'")
        logger.info(f"Question {num}: DEBUG - investigations='{investigations[:50] if investigations else 'None'}'")

        return {
            'id': int(num),
            'title': title.strip(),
            'specialty': specialty,
            'scenario': scenario,
            'investigations': investigations,
            'image': image,  # Separate image field for frontend
            'prompt': prompt,
            'options': options,
            'correct_answer': correct_answer,
            'explanations': explanations
        }

    @staticmethod
    def parse_markdown_content(content, filename="uploaded_quiz"):
        """Parse markdown content directly without file system."""
        try:
            logger.info(f"Starting to parse quiz content from {filename}, length: {len(content)} characters")
            
            # Clean up the content first
            content = content.strip()
            
            # Log some debugging info about the content structure
            lines_with_hash = [line.strip() for line in content.split('\n') if line.strip().startswith('###')]
            logger.info(f"Found {len(lines_with_hash)} lines starting with '###': {lines_with_hash[:5]}")
            
            if len(lines_with_hash) == 0:
                # Maybe the content uses different formatting - check for other patterns
                lines_with_numbers = [line.strip() for line in content.split('\n') if re.match(r'^\d+\.', line.strip())]
                logger.info(f"Found {len(lines_with_numbers)} lines starting with numbers: {lines_with_numbers[:3]}")
                
                # Try to detect other question patterns
                question_patterns = [
                    r'^\d+\.\s+',  # 1. Question
                    r'^Q\d+[.:]\s*',  # Q1: Question
                    r'^Question\s+\d+',  # Question 1
                    r'##\s*\d+',  # ## 1
                ]
                
                for pattern in question_patterns:
                    matches = re.findall(pattern, content, re.MULTILINE)
                    if matches:
                        logger.info(f"Found {len(matches)} matches for pattern '{pattern}': {matches[:3]}")
                        break
            
            # Debug: Look for question patterns
            question_pattern_matches = re.findall(r'###\s*\d+.*?(?=###\s*\d+|\Z)', content, re.DOTALL)
            logger.info(f"Found {len(question_pattern_matches)} question blocks using QUESTION_RE pattern")
            
            if len(question_pattern_matches) > 0:
                logger.info(f"First question block preview (200 chars): {question_pattern_matches[0][:200]}...")
                if len(question_pattern_matches) > 1:
                    logger.info(f"Second question block preview (200 chars): {question_pattern_matches[1][:200]}...")
            
            # Analyze investigation variations
            PWAQuizLoader.analyze_investigation_variations(content)

            questions = []
            specialty_markers = [(0, "Uncategorized")]
            
            # Find specialty headers
            for m in PWAQuizLoader.SPECIALTY_HEADER_RE.finditer(content):
                specialty_markers.append((m.start(), m.group(1).strip()))
            specialty_markers.sort(key=lambda x: x[0])
            logger.info(f"Found {len(specialty_markers)} specialty markers: {[s[1] for s in specialty_markers]}")

            def find_specialty(pos: int) -> str:
                lo, hi = 0, len(specialty_markers) - 1
                best = 0
                while lo <= hi:
                    mid = (lo + hi) // 2
                    if specialty_markers[mid][0] <= pos:
                        best = mid
                        lo = mid + 1
                    else:
                        hi = mid - 1
                return specialty_markers[best][1]

            # Parse questions
            question_count = 0
            failed_blocks = 0
            for qm in PWAQuizLoader.QUESTION_RE.finditer(content):
                block = qm.group(1)
                specialty = find_specialty(qm.start())
                logger.info(f"Processing question block {question_count + 1} (specialty: {specialty})")
                logger.debug(f"Block content: {block[:200]}...")
                
                q = PWAQuizLoader._parse_question(block, specialty)
                if q:
                    questions.append(q)
                    question_count += 1
                    logger.info(f"✓ Successfully parsed question {question_count}: ID={q['id']}, title='{q['title'][:50]}...'")
                else:
                    failed_blocks += 1
                    logger.warning(f"✗ Failed to parse question block {question_count + failed_blocks}. Block start: {block[:100]}...")

            logger.info(f"Parsing complete: {len(questions)} questions successfully parsed, {failed_blocks} blocks failed")
            
            if len(questions) == 0:
                logger.error(f"NO QUESTIONS PARSED! Debug info for {filename}:")
                logger.error(f"Content has ### headers: {'###' in content}")
                logger.error(f"QUESTION_RE pattern: {PWAQuizLoader.QUESTION_RE.pattern}")
                logger.error(f"Content length: {len(content)} characters")
                logger.error(f"First 1000 chars: {content[:1000]}")
                
                # Try alternative parsing approach
                logger.info("Attempting alternative parsing approaches...")
                
                # Try a more flexible question pattern
                alternative_patterns = [
                    r'(\d+\.\s+.*?)(?=\d+\.\s+|\Z)',  # 1. Question format
                    r'(Q\d+[.:]\s*.*?)(?=Q\d+[.:]\s*|\Z)',  # Q1: Question format
                    r'(Question\s+\d+.*?)(?=Question\s+\d+|\Z)',  # Question 1 format
                ]
                
                for pattern_name, pattern in [("numbered", alternative_patterns[0]), ("Q-format", alternative_patterns[1]), ("Question-format", alternative_patterns[2])]:
                    alt_matches = re.findall(pattern, content, re.DOTALL | re.IGNORECASE)
                    logger.info(f"Alternative pattern '{pattern_name}' found {len(alt_matches)} matches")
                    if alt_matches:
                        logger.info(f"Sample match: {alt_matches[0][:200]}...")
                        # Try to parse with modified content
                        modified_content = content
                        # Convert to ### format
                        for i, match in enumerate(alt_matches, 1):
                            if pattern_name == "numbered":
                                # Convert "1. Question" to "### 1. Question"
                                modified_content = re.sub(r'^(\d+\.\s+)', r'### \1', modified_content, flags=re.MULTILINE)
                            elif pattern_name == "Q-format":
                                # Convert "Q1: Question" to "### 1. Question"
                                modified_content = re.sub(r'^Q(\d+)[.:]\s*', r'### \1. ', modified_content, flags=re.MULTILINE)
                            elif pattern_name == "Question-format":
                                # Convert "Question 1" to "### 1."
                                modified_content = re.sub(r'^Question\s+(\d+)', r'### \1.', modified_content, flags=re.MULTILINE)
                        
                        # Try parsing again with modified content
                        if modified_content != content:
                            logger.info(f"Attempting to re-parse with {pattern_name} conversion...")
                            alt_questions = []
                            for qm in PWAQuizLoader.QUESTION_RE.finditer(modified_content):
                                block = qm.group(1)
                                specialty = find_specialty(qm.start())
                                q = PWAQuizLoader._parse_question(block, specialty)
                                if q:
                                    alt_questions.append(q)
                            
                            if alt_questions:
                                logger.info(f"✓ Alternative parsing succeeded with {len(alt_questions)} questions!")
                                questions = alt_questions
                                break
                
                if len(questions) == 0:
                    # Split by lines and look for numbered items
                    lines = content.split('\n')
                    question_lines = []
                    for i, line in enumerate(lines):
                        if re.match(r'^\s*###\s*\d+', line) or re.match(r'^\s*\d+\.', line):
                            question_lines.append((i, line.strip()))
                    
                    logger.info(f"Found {len(question_lines)} potential question lines: {question_lines[:5]}")
            
            return questions

        except Exception as e:
            logger.error(f"Error parsing content from {filename}: {e}")
            import traceback
            traceback.print_exc()
            return []

    @staticmethod
    def load_from_markdown(path: str):
        """Load questions from markdown file - adapted from your main.py."""
        try:
            file_hash, content = PWAQuizLoader._get_file_hash_and_content(path)
            if not content:
                return []

            # Analyze investigation variations
            PWAQuizLoader.analyze_investigation_variations(content)

            questions = []
            specialty_markers = [(0, "Uncategorized")]
            
            # Find specialty headers
            for m in PWAQuizLoader.SPECIALTY_HEADER_RE.finditer(content):
                specialty_markers.append((m.start(), m.group(1).strip()))
            specialty_markers.sort(key=lambda x: x[0])

            def find_specialty(pos: int) -> str:
                lo, hi = 0, len(specialty_markers) - 1
                best = 0
                while lo <= hi:
                    mid = (lo + hi) // 2
                    if specialty_markers[mid][0] <= pos:
                        best = mid
                        lo = mid + 1
                    else:
                        hi = mid - 1
                return specialty_markers[best][1]

            # Parse questions
            for qm in PWAQuizLoader.QUESTION_RE.finditer(content):
                block = qm.group(1)
                specialty = find_specialty(qm.start())
                q = PWAQuizLoader._parse_question(block, specialty)
                if q:
                    questions.append(q)

            logger.info(f"Loaded {len(questions)} questions from {path}")
            return questions

        except Exception as e:
            logger.error(f"Error loading questions from {path}: {e}")
            return []

    @staticmethod
    def get_available_quizzes():
        """Get list of available quiz files."""
        quiz_files = []
        
        # Get the directory of the current script
        script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Check for quiz files in common locations
        search_paths = [
            os.path.join(script_dir, 'Questions'),
            script_dir,
            os.path.join(script_dir, 'MLA')
        ]
        
        for search_path in search_paths:
            if os.path.exists(search_path):
                for file in os.listdir(search_path):
                    if file.endswith('.md') and ('quiz' in file.lower() or 'ukmla' in file.lower() or 'mla' in file.lower()):
                        quiz_files.append({
                            'name': file.replace('.md', ''),
                            'filename': file,
                            'path': os.path.join(search_path, file),
                            'size': os.path.getsize(os.path.join(search_path, file))
                        })
        
        return quiz_files

# Flask Routes
@app.route('/')
def home():
    """Serve the main PWA application."""
    return render_template('index.html')

@app.route('/api/quizzes')
def get_quizzes():
    """Get list of available quizzes."""
    try:
        quizzes = PWAQuizLoader.get_available_quizzes()
        return jsonify({
            'success': True,
            'quizzes': quizzes
        })
    except Exception as e:
        logger.error(f"Error getting quizzes: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/quiz/<quiz_name>')
def get_quiz(quiz_name):
    """Load a specific quiz."""
    try:
        # Find the quiz file
        quizzes = PWAQuizLoader.get_available_quizzes()
        quiz_file = None
        
        for quiz in quizzes:
            if quiz['name'] == quiz_name or quiz['filename'] == f"{quiz_name}.md":
                quiz_file = quiz['path']
                break
        
        if not quiz_file:
            return jsonify({
                'success': False,
                'error': f'Quiz "{quiz_name}" not found'
            }), 404
        
        # Load questions
        questions = PWAQuizLoader.load_from_markdown(quiz_file)
        
        return jsonify({
            'success': True,
            'quiz_name': quiz_name,
            'questions': questions,
            'total_questions': len(questions)
        })
        
    except Exception as e:
        logger.error(f"Error loading quiz {quiz_name}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/quiz/submit', methods=['POST'])
def submit_quiz():
    """Submit quiz answers and get results."""
    try:
        data = request.json
        quiz_name = data.get('quiz_name')
        answers = data.get('answers', {})
        
        # Load the original quiz to check answers
        quizzes = PWAQuizLoader.get_available_quizzes()
        quiz_file = None
        
        for quiz in quizzes:
            if quiz['name'] == quiz_name:
                quiz_file = quiz['path']
                break
        
        if not quiz_file:
            return jsonify({
                'success': False,
                'error': 'Quiz not found'
            }), 404
        
        questions = PWAQuizLoader.load_from_markdown(quiz_file)
        
        # Calculate score
        correct_count = 0
        total_questions = len(questions)
        results = []
        
        for i, question in enumerate(questions):
            question_id = str(question['id'])
            user_answer = answers.get(question_id)
            correct_answer = question.get('correct_answer')
            
            is_correct = user_answer is not None and user_answer == correct_answer
            if is_correct:
                correct_count += 1
            
            results.append({
                'question_id': question['id'],
                'user_answer': user_answer,
                'correct_answer': correct_answer,
                'is_correct': is_correct,
                'question_title': question['title']
            })
        
        score_percentage = (correct_count / total_questions * 100) if total_questions > 0 else 0
        
        return jsonify({
            'success': True,
            'score': {
                'correct': correct_count,
                'total': total_questions,
                'percentage': round(score_percentage, 1)
            },
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Error submitting quiz: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/upload-quiz', methods=['POST'])
def upload_quiz():
    """Handle quiz file upload from client."""
    try:
        logger.info("Upload request received")
        
        if 'quiz_file' not in request.files:
            logger.error("No quiz_file in request.files")
            return jsonify({
                'success': False,
                'error': 'No quiz file provided'
            }), 400
        
        file = request.files['quiz_file']
        logger.info(f"File received: {file.filename}")
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Read file content first
        file_content = file.read()
        logger.info(f"File size: {len(file_content)} bytes")
        
        # Validate file size (max 4.5MB for Vercel Hobby plan)
        if len(file_content) > 4.5 * 1024 * 1024:  # 4.5MB limit
            return jsonify({
                'success': False,
                'error': 'File too large. Maximum size is 4.5MB.'
            }), 400
        
        # Process file based on extension
        if file.filename.lower().endswith('.zip'):
            logger.info("Processing ZIP file")
            
            try:
                # Extract zip file
                zip_content = io.BytesIO(file_content)
                quiz_data = []
                image_data = {}  # Store images from zip
                
                with zipfile.ZipFile(zip_content, 'r') as zip_ref:
                    # Get all files in the zip
                    all_files = zip_ref.namelist()
                    # Filter out directories and hidden files
                    actual_files = [f for f in all_files if not f.endswith('/') and not f.startswith('__MACOSX') and not f.startswith('.')]
                    md_files = [f for f in actual_files if f.lower().endswith(('.md', '.txt')) and not f.startswith('.')]
                    image_files = [f for f in actual_files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'))]
                    
                    logger.info(f"ZIP contents: {all_files}")
                    logger.info(f"Found {len(md_files)} .md files: {md_files}")
                    logger.info(f"Found {len(image_files)} image files: {image_files}")
                    
                    if not md_files:
                        return jsonify({
                            'success': False,
                            'error': f'No markdown files found in ZIP. Found files: {actual_files[:10]}... (showing first 10)'
                        }), 400
                    
                    # Extract and encode images as base64
                    for image_file in image_files:
                        try:
                            with zip_ref.open(image_file) as img_file:
                                img_content = img_file.read()
                                # Get file extension for mime type
                                ext = image_file.lower().split('.')[-1]
                                mime_type = {
                                    'jpg': 'image/jpeg',
                                    'jpeg': 'image/jpeg', 
                                    'png': 'image/png',
                                    'gif': 'image/gif',
                                    'webp': 'image/webp',
                                    'svg': 'image/svg+xml'
                                }.get(ext, 'image/jpeg')
                                
                                # Convert to base64 data URL
                                img_base64 = base64.b64encode(img_content).decode('utf-8')
                                data_url = f"data:{mime_type};base64,{img_base64}"
                                
                                # Store the actual image data only once with the primary key
                                primary_key = image_file.replace('\\', '/').lstrip('./')
                                image_data[primary_key] = data_url
                                
                                # Create reference mappings (without duplicating the base64 data)
                                filename_only = image_file.split('/')[-1]
                                name_without_ext = filename_only.rsplit('.', 1)[0]
                                
                                # Only store references if they're different from the primary key
                                reference_keys = [
                                    image_file,  # Original path
                                    filename_only,  # Just filename
                                    name_without_ext,  # Name without extension
                                    filename_only.lower(),  # Lowercase filename
                                    name_without_ext.lower()  # Lowercase name without extension
                                ]
                                
                                # Store references that point to the primary key (much smaller)
                                for ref_key in reference_keys:
                                    if ref_key != primary_key and ref_key not in image_data:
                                        image_data[ref_key] = f"__REF__:{primary_key}"
                                
                                logger.info(f"Processed image: {image_file} -> primary key: {primary_key}, references: {len(reference_keys)}")
                        except Exception as e:
                            logger.warning(f"Could not process image {image_file}: {e}")
                            continue
                    
                    # Process markdown files
                    for filename in md_files:
                        try:
                            logger.info(f"Processing MD file: {filename}")
                            with zip_ref.open(filename) as md_file:
                                raw_content = md_file.read()
                                logger.info(f"Raw content length: {len(raw_content)} bytes")
                                
                                # Try different encodings
                                content = None
                                encodings_to_try = ['utf-8', 'utf-8-sig', 'latin1', 'cp1252']
                                
                                for encoding in encodings_to_try:
                                    try:
                                        content = raw_content.decode(encoding)
                                        logger.info(f"Successfully decoded with {encoding}")
                                        break
                                    except UnicodeDecodeError as e:
                                        logger.warning(f"Failed to decode with {encoding}: {e}")
                                        continue
                                
                                if content is None:
                                    logger.error(f"Could not decode {filename} with any encoding")
                                    continue
                                
                                logger.info(f"Decoded content length: {len(content)} characters")
                                logger.info(f"First 500 characters: {repr(content[:500])}")
                                
                                # Check if this looks like a valid markdown quiz file
                                has_questions = bool(re.search(r'###\s*\d+', content))
                                has_hash_headers = content.count('###') > 0
                                has_bullet_points = content.count('A)') > 0 or content.count('A.') > 0
                                
                                logger.info(f"Content validation - has_questions: {has_questions}, has_hash_headers: {has_hash_headers}, has_bullet_points: {has_bullet_points}")
                                
                                if not has_questions and not has_hash_headers:
                                    logger.warning(f"File {filename} does not appear to contain quiz questions (no ### headers found)")
                                    # Show some sample lines to help debug
                                    sample_lines = content.split('\n')[:20]
                                    logger.info(f"First 20 lines: {sample_lines}")
                                
                                original_content = content
                                
                                # Replace local image references with base64 data URLs
                                replacements_made = 0
                                
                                # First pass: exact matches
                                for image_path, data_url in image_data.items():
                                    old_content = content
                                    
                                    # Replace various possible reference formats
                                    content = content.replace(f"({image_path})", f"({data_url})")
                                    content = content.replace(f'"{image_path}"', f'"{data_url}"')
                                    content = content.replace(f"'{image_path}'", f"'{data_url}'")
                                    # Handle relative paths
                                    content = content.replace(f"(./{image_path})", f"({data_url})")
                                    content = content.replace(f"(../{image_path})", f"({data_url})")
                                    # Handle [IMAGE: filename] format specifically
                                    content = content.replace(f"[IMAGE: {image_path}]", f"![Image]({data_url})")
                                    content = content.replace(f"[IMAGE:{image_path}]", f"![Image]({data_url})")
                                    # Handle spaces in IMAGE format
                                    content = content.replace(f"[IMAGE:  {image_path}]", f"![Image]({data_url})")
                                    content = content.replace(f"[IMAGE:   {image_path}]", f"![Image]({data_url})")
                                    
                                    if content != old_content:
                                        replacements_made += 1
                                        logger.info(f"Replaced image reference: {image_path}")
                                
                                # Second pass: case-insensitive search for unreplaced IMAGE tags
                                image_pattern = re.compile(r'\[IMAGE:\s*([^\]]+)\]', re.IGNORECASE)
                                matches = image_pattern.findall(content)
                                
                                for match in matches:
                                    match_clean = match.strip()
                                    found_replacement = None
                                    
                                    # Try to find matching image by filename (case insensitive)
                                    for image_path, data_url in image_data.items():
                                        if (match_clean.lower() == image_path.lower() or 
                                            match_clean.lower() in image_path.lower() or
                                            image_path.lower() in match_clean.lower()):
                                            found_replacement = data_url
                                            logger.info(f"Found case-insensitive match: '{match_clean}' -> '{image_path}'")
                                            break
                                    
                                    if found_replacement:
                                        # Replace with case-insensitive regex
                                        old_content = content
                                        pattern = re.compile(re.escape(f"[IMAGE: {match_clean}]"), re.IGNORECASE)
                                        content = pattern.sub(f"![Image]({found_replacement})", content)
                                        pattern = re.compile(re.escape(f"[IMAGE:{match_clean}]"), re.IGNORECASE)
                                        content = pattern.sub(f"![Image]({found_replacement})", content)
                                        
                                        if content != old_content:
                                            replacements_made += 1
                                            logger.info(f"Case-insensitive replacement: {match_clean}")
                                
                                logger.info(f"Made {replacements_made} image replacements in {filename}")
                                if replacements_made == 0 and len(image_data) > 0:
                                    logger.warning(f"No image replacements made in {filename}, but {len(image_data)} images available")
                                    logger.info(f"Available images: {list(image_data.keys())}")
                                    # Show IMAGE references found in content
                                    image_refs = re.findall(r'\[IMAGE:\s*([^\]]+)\]', original_content, re.IGNORECASE)
                                    if image_refs:
                                        logger.info(f"Found IMAGE references: {image_refs}")
                                    else:
                                        logger.info("No [IMAGE: ...] references found in content")
                                    # Show first 300 chars of content for debugging
                                    logger.info(f"Content preview: {original_content[:300]}...")
                                
                                questions = PWAQuizLoader.parse_markdown_content(content, filename)
                                quiz_data.extend(questions)
                                logger.info(f"Extracted {len(questions)} questions from {filename}")
                                
                                # Debug: Show sample of content being parsed
                                if len(questions) == 0:
                                    logger.error(f"NO QUESTIONS FOUND in {filename}")
                                    logger.error(f"Content length: {len(content)} characters")
                                    logger.error(f"Content preview (first 500 chars): {content[:500]}")
                                    logger.error(f"Looking for ### patterns...")
                                    question_matches = re.findall(r'###\s*\d+', content)
                                    logger.error(f"Found {len(question_matches)} question headers: {question_matches[:5]}")
                                else:
                                    logger.info(f"Successfully found {len(questions)} questions in {filename}")
                        except UnicodeDecodeError as e:
                            logger.warning(f"Could not decode file {filename}: {e}")
                            continue
                        except Exception as e:
                            logger.error(f"Error processing file {filename}: {e}")
                            continue
                
                if not quiz_data:
                    error_msg = f'No valid quiz questions found in the uploaded files. Processed {len(md_files)} markdown files: {", ".join([f.split("/")[-1] for f in md_files])}'
                    logger.error(f"Final error: {error_msg}")
                    return jsonify({
                        'success': False,
                        'error': error_msg
                    }), 400
            
            except zipfile.BadZipFile:
                logger.error("Invalid ZIP file")
                return jsonify({
                    'success': False,
                    'error': 'Invalid zip file format'
                }), 400
            except Exception as e:
                logger.error(f"ZIP processing error: {e}")
                return jsonify({
                    'success': False,
                    'error': f'Error processing ZIP file: {str(e)}'
                }), 500
            
            quiz_name = file.filename.replace('.zip', '')
            logger.info(f"Successfully processed ZIP file: {len(quiz_data)} total questions, {len(image_data)} images")
            
            return jsonify({
                'success': True,
                'quiz_name': quiz_name,
                'questions': quiz_data,
                'total_questions': len(quiz_data),
                'images': image_data  # Add this line to include images in response
            })
            
        elif file.filename.lower().endswith('.md'):
            logger.info("Processing MD file")
            try:
                content = file_content.decode('utf-8')
                questions = PWAQuizLoader.parse_markdown_content(content, file.filename)
                
                if not questions:
                    return jsonify({
                        'success': False,
                        'error': 'No valid quiz questions found in the markdown file'
                    }), 400
                
                logger.info(f"Successfully processed MD file: {len(questions)} questions")
                
                return jsonify({
                    'success': True,
                    'quiz_name': file.filename.replace('.md', ''),
                    'questions': questions,
                    'total_questions': len(questions)
                })
            except UnicodeDecodeError:
                return jsonify({
                    'success': False,
                    'error': 'Could not read the markdown file. Please ensure it is UTF-8 encoded.'
                }), 400
            except Exception as e:
                logger.error(f"MD processing error: {e}")
                return jsonify({
                    'success': False,
                    'error': f'Error processing markdown file: {str(e)}'
                }), 500
        
        else:
            return jsonify({
                'success': False,
                'error': 'Unsupported file type. Please upload .md or .zip files'
            }), 400
            
    except Exception as e:
        logger.error(f"Upload error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@app.route('/api/quiz/<quiz_name>/specialty/<specialty>')
def get_quiz_by_specialty(quiz_name, specialty):
    """Get questions filtered by specialty."""
    try:
        quizzes = PWAQuizLoader.get_available_quizzes()
        quiz_file = None
        
        for quiz in quizzes:
            if quiz['name'] == quiz_name:
                quiz_file = quiz['path']
                break
        
        if not quiz_file:
            return jsonify({
                'success': False,
                'error': 'Quiz not found'
            }), 404
        
        all_questions = PWAQuizLoader.load_from_markdown(quiz_file)
        
        # Filter by specialty
        if specialty.lower() == 'all':
            filtered_questions = all_questions
        else:
            filtered_questions = [q for q in all_questions if specialty.lower() in q['specialty'].lower()]
        
        return jsonify({
            'success': True,
            'quiz_name': quiz_name,
            'specialty': specialty,
            'questions': filtered_questions,
            'total_questions': len(filtered_questions)
        })
        
    except Exception as e:
        logger.error(f"Error loading quiz by specialty: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/manifest.json')
def manifest():
    """Serve PWA manifest."""
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'static'), 'manifest.json', mimetype='application/json')

@app.route('/sw.js')
def service_worker():
    """Serve service worker."""
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'static'), 'sw.js', mimetype='application/javascript')

@app.route('/static/js/<path:filename>')
def serve_js(filename):
    """Serve JavaScript files."""
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'static', 'js'), filename, mimetype='application/javascript')

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files."""
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'static'), filename)

@app.route('/favicon.ico')
def favicon():
    """Serve favicon."""
    try:
        return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'static'), 'favicon.ico')
    except:
        # Return a simple 1x1 transparent PNG if favicon doesn't exist
        return '', 204

@app.route('/test-medical-tools')
def test_medical_tools():
    """Test endpoint to verify medical tools elements are present"""
    try:
        # Read the main template
        template_path = os.path.join(app.template_folder, 'index.html')
        with open(template_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for key medical tools elements
        tests = {
            'medical-tools-toggle': 'id="medical-tools-toggle"' in content,
            'medical-tools-panel': 'id="medical-tools-panel"' in content,
            'calculator-panel': 'id="calculator-panel"' in content,
            'calculator-buttons': 'data-calc="bmi"' in content,
            'nav-buttons': 'data-tool="calculators"' in content,
            'drug-panel': 'id="drug-panel"' in content,
            'lab-panel': 'id="lab-panel"' in content
        }
        
        return jsonify({
            'status': 'success',
            'tests': tests,
            'all_passed': all(tests.values())
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

# This is what Vercel will use as the serverless function
# Don't modify this part
if __name__ == '__main__':
    app.run(debug=False)