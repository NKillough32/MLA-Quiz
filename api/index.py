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
            investigation_pattern = r'\*\*Investigations?(?::\*\*|\*\*:)\s*'
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
        correct_answer = None
        
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
                    
                    # Check if this is marked as correct (common patterns)
                    if any(marker in text.lower() for marker in ['correct', '✓', '*correct*']):
                        correct_answer = len(current_options) - 1
                
                # Look for explanations
                elif line.startswith('Explanation:') or line.startswith('Answer:'):
                    current_explanations.append(line)
            
            if current_options:
                options.extend(current_options)
                explanations.extend(current_explanations)

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
        if 'quiz_file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No quiz file provided'
            }), 400
        
        file = request.files['quiz_file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Validate file size (max 20MB)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > 20 * 1024 * 1024:  # 20MB limit
            return jsonify({
                'success': False,
                'error': 'File too large. Maximum size is 20MB.'
            }), 400
        
        # Read file content
        if file.filename.endswith('.zip'):
            import zipfile
            import io
            
            try:
                # Extract zip file
                zip_content = io.BytesIO(file.read())
                quiz_data = []
                
                with zipfile.ZipFile(zip_content, 'r') as zip_ref:
                    md_files = [f for f in zip_ref.namelist() if f.endswith('.md')]
                    
                    if not md_files:
                        return jsonify({
                            'success': False,
                            'error': 'No .md files found in the zip archive'
                        }), 400
                    
                    for filename in md_files:
                        try:
                            with zip_ref.open(filename) as md_file:
                                content = md_file.read().decode('utf-8')
                                questions = PWAQuizLoader.parse_markdown_content(content, filename)
                                quiz_data.extend(questions)
                        except UnicodeDecodeError:
                            logger.warning(f"Could not decode file {filename}, skipping...")
                            continue
                
                if not quiz_data:
                    return jsonify({
                        'success': False,
                        'error': 'No valid quiz questions found in the uploaded files'
                    }), 400
            
            except zipfile.BadZipFile:
                return jsonify({
                    'success': False,
                    'error': 'Invalid zip file format'
                }), 400
            
            return jsonify({
                'success': True,
                'quiz_name': file.filename.replace('.zip', ''),
                'questions': quiz_data,
                'total_questions': len(quiz_data)
            })
            
        elif file.filename.endswith('.md'):
            try:
                content = file.read().decode('utf-8')
                questions = PWAQuizLoader.parse_markdown_content(content, file.filename)
                
                if not questions:
                    return jsonify({
                        'success': False,
                        'error': 'No valid quiz questions found in the markdown file'
                    }), 400
                
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
        
        else:
            return jsonify({
                'success': False,
                'error': 'Unsupported file type. Please upload .md or .zip files'
            }), 400
            
    except Exception as e:
        logger.error(f"Error uploading quiz: {e}")
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
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'static'), 'manifest.json')

@app.route('/sw.js')
def service_worker():
    """Serve service worker."""
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'static'), 'sw.js')

@app.route('/favicon.ico')
def favicon():
    """Serve favicon."""
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'static'), 'favicon.ico')

# This is what Vercel will use as the serverless function
# Don't modify this part
if __name__ == '__main__':
    app.run(debug=False)