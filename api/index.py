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
        parts = [p.strip() for p in re.split(r'\n\s*\n', rest, maxsplit=4) if p.strip()]

        scenario = parts[0] if parts else ""
        investigation_index = None
        investigations = ""

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

        prompt = "What is the most likely diagnosis?"
        tail_start = 1

        if investigation_index is not None:
            if investigation_index + 1 < len(parts):
                prompt = parts[investigation_index + 1]
                tail_start = investigation_index + 2
            else:
                scenario_parts_check = scenario.split('\n\n')
                if len(scenario_parts_check) > 1:
                    prompt = scenario_parts_check[-1]
                    scenario = '\n\n'.join(scenario_parts_check[:-1])
        elif len(parts) >= 2:
            prompt = parts[1]
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
                # Match option patterns like "A) Option text" or "A. Option text"
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

        # If no options found, try to extract from the prompt section
        if not options and prompt:
            prompt_lines = prompt.split('\n')
            option_lines = []
            non_option_lines = []
            
            for line in prompt_lines:
                line = line.strip()
                if re.match(r'^([A-Z])[.)]\s*', line):
                    option_lines.append(line)
                else:
                    non_option_lines.append(line)
            
            if option_lines:
                options = option_lines
                prompt = '\n'.join(non_option_lines).strip()

        logger.info(f"Parsed question {num}: title='{title[:50] if len(title) > 50 else title}', options={len(options)}, correct_answer={correct_answer}")
        if correct_answer is None and options:
            logger.warning(f"No correct answer found for question {num}. Sample content: {tail_content[:200]}...")

        return {
            'id': int(num),
            'title': title.strip(),
            'specialty': specialty,
            'scenario': scenario,
            'investigations': investigations,
            'prompt': prompt,
            'options': options,
            'correct_answer': correct_answer,
            'explanations': explanations
        }

    @staticmethod
    def parse_markdown_content(content, filename="uploaded_quiz"):
        """Parse markdown content directly without file system."""
        try:
            logger.info(f"Starting to parse quiz content, length: {len(content)} characters")
            logger.info(f"First 1000 chars of content: {content[:1000]}")
            
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

            logger.info(f"Loaded {len(questions)} questions from {filename}")
            return questions

        except Exception as e:
            logger.error(f"Error parsing content from {filename}: {e}")
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
                    md_files = [f for f in all_files if f.endswith('.md')]
                    image_files = [f for f in all_files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'))]
                    
                    logger.info(f"Found {len(md_files)} .md files and {len(image_files)} image files in ZIP")
                    
                    if not md_files:
                        return jsonify({
                            'success': False,
                            'error': 'No .md files found in the zip archive'
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
                                
                                # Store with normalized path (remove leading ./ or ../)
                                clean_path = image_file.replace('\\', '/').lstrip('./')
                                image_data[clean_path] = data_url
                                image_data[image_file] = data_url  # Also store original path
                                # Store just filename for relative references
                                filename_only = image_file.split('/')[-1]
                                image_data[filename_only] = data_url
                                # Store filename without extension for [IMAGE: name] format
                                name_without_ext = filename_only.rsplit('.', 1)[0]
                                image_data[name_without_ext] = data_url
                                # Store variations of the filename
                                image_data[filename_only.lower()] = data_url
                                image_data[name_without_ext.lower()] = data_url
                                
                                logger.info(f"Processed image: {image_file} -> stored as keys: {filename_only}, {name_without_ext}, {clean_path}")
                        except Exception as e:
                            logger.warning(f"Could not process image {image_file}: {e}")
                            continue
                    
                    # Process markdown files
                    for filename in md_files:
                        try:
                            logger.info(f"Processing file: {filename}")
                            with zip_ref.open(filename) as md_file:
                                content = md_file.read().decode('utf-8')
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
                                image_pattern = re.compile(r'\\[IMAGE:\\s*([^\\]]+)\\]', re.IGNORECASE)
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
                                    image_refs = re.findall(r'\\[IMAGE:\\s*([^\\]]+)\\]', original_content, re.IGNORECASE)
                                    if image_refs:
                                        logger.info(f"Found IMAGE references: {image_refs}")
                                    else:
                                        logger.info("No [IMAGE: ...] references found in content")
                                    # Show first 300 chars of content for debugging
                                    logger.info(f"Content preview: {original_content[:300]}...")
                                
                                questions = PWAQuizLoader.parse_markdown_content(content, filename)
                                quiz_data.extend(questions)
                                logger.info(f"Extracted {len(questions)} questions from {filename}")
                        except UnicodeDecodeError as e:
                            logger.warning(f"Could not decode file {filename}: {e}")
                            continue
                        except Exception as e:
                            logger.error(f"Error processing file {filename}: {e}")
                            continue
                
                if not quiz_data:
                    return jsonify({
                        'success': False,
                        'error': 'No valid quiz questions found in the uploaded files'
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
            logger.info(f"Successfully processed ZIP file: {len(quiz_data)} total questions")
            
            return jsonify({
                'success': True,
                'quiz_name': quiz_name,
                'questions': quiz_data,
                'total_questions': len(quiz_data)
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

# This is what Vercel will use as the serverless function
# Don't modify this part
if __name__ == '__main__':
    app.run(debug=False)