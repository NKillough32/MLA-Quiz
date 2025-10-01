/**
 * MLA Quiz PWA - Main JavaScript Application
 * Handles quiz interaction, API communication, and state management
 */

class MLAQuizApp {
    constructor() {
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.answers = {};
        this.submittedAnswers = {}; // Track which questions have been submitted
        this.ruledOutAnswers = {}; // Track which options are ruled out
        this.questions = [];
        this.quizName = '';
        this.flaggedQuestions = new Set(); // Track flagged questions
        this.selectedQuizLength = 20; // Default quiz length
        
        // Time tracking properties
        this.questionStartTime = null;
        this.questionTimes = {}; // Store time per question
        this.quizStartTime = null;
        this.totalStudyTime = 0;
        this.sessionStats = {
            questionsAnswered: 0,
            totalTime: 0,
            averageTimePerQuestion: 0
        };
        
        // Theme and font size settings
        this.fontSize = localStorage.getItem('fontSize') || 'medium';
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadQuizzes();
        
        // Initialize new features
        this.initializeDarkMode();
        this.initializeFontSize();
        this.initializeQuizLength();
        this.initializeMedicalTools();
    }
    
    bindEvents() {
        // Navigation
        document.getElementById('backBtn').addEventListener('click', () => this.goBack());
        document.getElementById('homeBtn').addEventListener('click', () => this.showQuizSelection());
        document.getElementById('retryBtn').addEventListener('click', () => this.retryQuiz());
        
        // Quiz navigation
        document.getElementById('submitBtn').addEventListener('click', () => this.submitAnswer());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('prevBtn').addEventListener('click', () => this.prevQuestion());
        
        // Top navigation buttons
        document.getElementById('nextBtnTop').addEventListener('click', () => this.nextQuestion());
        document.getElementById('prevBtnTop').addEventListener('click', () => this.prevQuestion());
        
        // Flag button
        document.getElementById('flagBtn').addEventListener('click', () => this.toggleFlag());
        // Sidebar toggle removed - now using responsive grid layout
        
        // File upload
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('quizFileInput').click();
        });
        
        document.getElementById('quizFileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });
        
        // Quiz length selection
        document.addEventListener('click', (e) => {
            // Check if the clicked element or its parent is a quiz length button
            const lengthBtn = e.target.closest('.quiz-length-btn');
            if (lengthBtn) {
                this.selectQuizLength(lengthBtn);
            }
        });
    }

    // Quiz length selection methods
    selectQuizLength(button) {
        console.log('🎯 Quiz length button clicked:', button);
        
        // Remove active class from all buttons
        document.querySelectorAll('.quiz-length-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Update selected length
        const length = button.getAttribute('data-length');
        this.selectedQuizLength = length === 'all' ? 'all' : parseInt(length);
        
        console.log('🎯 Selected quiz length:', this.selectedQuizLength);
        
        // Update info text
        this.updateQuizLengthInfo();
    }
    
    updateQuizLengthInfo() {
        const infoEl = document.getElementById('quiz-length-info');
        if (!infoEl) {
            console.log('🎯 Quiz length info element not found');
            return;
        }
        
        let message = '';
        if (this.selectedQuizLength === 'all') {
            message = '📚 Selected: All available questions for comprehensive practice';
        } else if (this.selectedQuizLength === 100) {
            message = '🎯 Selected: 100 questions for standard test simulation';
        } else {
            message = '📝 Selected: 20 questions for quick practice session';
        }
        
        infoEl.textContent = message;
        console.log('🎯 Updated quiz length info:', message);
    }
    
    filterQuestionsByLength(questions) {
        if (this.selectedQuizLength === 'all' || this.selectedQuizLength >= questions.length) {
            return questions;
        }
        
        // Shuffle questions and take the selected amount
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, this.selectedQuizLength);
    }

    async loadQuizzes() {
        try {
            const response = await fetch('/api/quizzes');
            const data = await response.json();
            
            if (data.success) {
                this.renderQuizList(data.quizzes);
            } else {
                this.showError('Failed to load quizzes: ' + data.error);
            }
        } catch (error) {
            console.error('Error loading quizzes:', error);
            this.showError('Failed to load quizzes. Please check your connection.');
        }
    }
    
    renderQuizList(quizzes) {
        const quizList = document.getElementById('quizList');
        
        // Get uploaded quizzes from localStorage
        const uploadedQuizzes = this.getUploadedQuizzes();
        
        // Combine server quizzes with uploaded quizzes
        const allQuizzes = [...quizzes];
        
        if (quizzes.length === 0 && uploadedQuizzes.length === 0) {
            quizList.innerHTML = `
                <div class="loading">
                    <p>No quizzes found. Upload quiz files using the button above.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        // Add uploaded quizzes first (with special styling)
        uploadedQuizzes.forEach(quiz => {
            html += `
                <div class="quiz-item uploaded-quiz" data-quiz-name="${quiz.name}" data-is-uploaded="true">
                    <div class="quiz-info">
                        <h3 class="quiz-name">📁 ${quiz.name}</h3>
                        <p class="quiz-details">Uploaded • ${quiz.total_questions} questions</p>
                    </div>
                    <span class="chevron">›</span>
                </div>
            `;
        });
        
        // Add server quizzes
        quizzes.forEach(quiz => {
            const sizeKB = Math.round(quiz.size / 1024);
            html += `
                <div class="quiz-item" data-quiz-name="${quiz.name}">
                    <div class="quiz-info">
                        <h3 class="quiz-name">${quiz.name}</h3>
                        <p class="quiz-details">${sizeKB}KB • ${quiz.filename}</p>
                    </div>
                    <span class="chevron">›</span>
                </div>
            `;
        });
        
        quizList.innerHTML = html;
        
        // Bind quiz selection events
        document.querySelectorAll('.quiz-item').forEach(item => {
            item.addEventListener('click', () => {
                const quizName = item.dataset.quizName;
                const isUploaded = item.dataset.isUploaded === 'true';
                this.loadQuiz(quizName, isUploaded);
            });
        });
    }
    
    async loadQuiz(quizName, isUploaded = false) {
        this.showLoading('Loading quiz...');
        
        try {
            if (isUploaded) {
                // Load from localStorage
                const uploadedQuizzes = this.getUploadedQuizzes();
                const quiz = uploadedQuizzes.find(q => q.name === quizName);
                
                if (!quiz) {
                    this.showError('Uploaded quiz not found. Please re-upload the file.');
                    return;
                }
                
                // Check if this is a split storage quiz that needs reconstruction
                if (quiz.dataStored === 'split' && (!quiz.questions || quiz.questions.length === 0)) {
                    console.log('🔍 LOADING - Reconstructing split storage quiz');
                    try {
                        const quizData = JSON.parse(localStorage.getItem(`quiz_${quiz.name}`) || '{}');
                        if (quizData.questions && quizData.questions.length > 0) {
                            quiz.questions = quizData.questions;
                            quiz.images = quizData.images || {};
                            console.log('🔍 LOADING - Successfully reconstructed quiz with', quiz.questions.length, 'questions');
                        } else {
                            throw new Error('No questions found in split storage');
                        }
                    } catch (error) {
                        console.error('🔍 LOADING ERROR - Failed to reconstruct quiz:', error);
                        this.showError('Failed to load quiz data. Please re-upload the file.');
                        return;
                    }
                }
                
                this.questions = quiz.questions || [];
                
                // Filter questions based on selected length
                this.questions = this.filterQuestionsByLength(this.questions);
                this.quizName = quiz.name;
                this.currentQuestionIndex = 0;
                this.answers = {};
                this.submittedAnswers = {};
                this.ruledOutAnswers = {};
                this.flaggedQuestions = new Set();
                
                if (this.questions.length === 0) {
                    this.showError('This quiz contains no questions.');
                    return;
                }
                
                console.log('🔍 LOADING - Successfully loaded uploaded quiz with', this.questions.length, 'questions');
                if (quiz.imagesRemoved) {
                    this.showError('Note: Images were not stored due to browser limits. Questions will work but images may not display.');
                }
                
                this.startQuiz();
            } else {
                // Load from server
                const response = await fetch(`/api/quiz/${encodeURIComponent(quizName)}`);
                const data = await response.json();
                
                if (data.success) {
                    this.questions = data.questions;
                    
                    // Filter questions based on selected length
                    this.questions = this.filterQuestionsByLength(this.questions);
                    
                    this.quizName = data.quiz_name;
                    this.currentQuestionIndex = 0;
                    this.answers = {};
                    this.submittedAnswers = {};
                    this.flaggedQuestions = new Set();
                    
                    if (this.questions.length === 0) {
                        this.showError('This quiz contains no questions.');
                        return;
                    }
                    
                    this.startQuiz();
                } else {
                    this.showError('Failed to load quiz: ' + data.error);
                }
            }
        } catch (error) {
            console.error('Error loading quiz:', error);
            this.showError('Failed to load quiz. Please check your connection.');
        }
    }
    
    startQuiz() {
        // Reset quiz state
        this.submittedAnswers = {}; // Reset submitted answers
        this.ruledOutAnswers = {}; // Reset ruled out answers
        this.ruledOutAnswers = {}; // Reset ruled out answers
        
        // Reset time tracking for new quiz
        this.quizStartTime = Date.now();
        this.questionTimes = {};
        this.sessionStats = {
            questionsAnswered: 0,
            totalTime: 0,
            averageTimePerQuestion: 0
        };
        
        // Shuffle questions to randomize order
        this.questions = this.shuffleArray(this.questions);
        
        // Shuffle options for all questions to prevent pattern memorization
        this.questions = this.questions.map(question => this.shuffleOptions(question));
        
        this.showScreen('quizScreen');
        this.updateNavigation('Quiz');
        this.renderCurrentQuestion();
        this.updateProgress();
        this.buildQuestionList(); // Build the question list in the sidebar
    }
    
    renderCurrentQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        console.log('Debug - Question object:', question);
        console.log('Debug - Question prompt value:', question.prompt);
    
        if (!question) return;
        
        // Track question start time
        this.questionStartTime = Date.now();

        const container = document.getElementById('questionContainer');        // Hide explanation and feedback initially (will show again if answer is already submitted)
        const explanationContainer = document.getElementById('explanationContainer');
        const feedbackContainer = document.getElementById('feedbackContainer');
        if (explanationContainer) {
            explanationContainer.style.display = 'none';
        }
        if (feedbackContainer) {
            feedbackContainer.style.display = 'none';
        }

        // Process scenario text - add full stop if missing
        let scenarioText = question.scenario || '';
        if (
            scenarioText &&
            scenarioText.trim() &&
            !scenarioText.trim().endsWith('.') &&
            !scenarioText.trim().endsWith('?') &&
            !scenarioText.trim().endsWith('!')
        ) {
            scenarioText = scenarioText.trim() + '.';
        }
        console.log('Debug - Processed scenario:', scenarioText);
    
        // Format investigations if present (with proper line breaks)
        let investigationsHtml = '';
        if (question.investigations && question.investigations.trim()) {
            const formattedInvestigations = this.formatInvestigations(question.investigations);
            investigationsHtml = `<div class="investigations"><h4>Investigations</h4><div>${formattedInvestigations}</div></div>`;
        }
        console.log('Debug - Investigations HTML:', investigationsHtml);
    
        // Format question prompt - separate images from question text
        let questionPromptHtml = '';
        let imageHtml = '';
        const promptText = question.prompt || question.question || question.title || '';
        console.log('Debug - Prompt text found:', promptText);
        
        // Check if prompt is just an image reference (common for questions with images)
        const isImageOnlyPrompt = promptText && promptText.match(/^!\[Image\]\(__REF__:[^)]+\)$/);
        
        if (isImageOnlyPrompt) {
            // If prompt is just an image reference, process it as image and use default question text
            imageHtml = this.formatText(promptText);
            questionPromptHtml = `<div class="prompt"><strong>What is the most likely diagnosis?</strong></div>`;
        } else if (promptText && promptText.trim()) {
            // Check if prompt contains image references mixed with text
            const imageMatches = promptText.match(/\[IMAGE:[^\]]+\]/g);
            let cleanPromptText = promptText;
            
            if (imageMatches) {
                // Remove image references from prompt text
                cleanPromptText = promptText.replace(/\[IMAGE:[^\]]+\]/g, '').trim();
                
                // Process each image
                imageMatches.forEach(imageRef => {
                    imageHtml += this.formatText(imageRef);
                });
            }
            
            // Use clean prompt text or process entire prompt if no image matches found
            if (cleanPromptText && cleanPromptText.length > 0) {
                questionPromptHtml = `<div class="prompt">${this.formatText(cleanPromptText)}</div>`;
            } else if (!imageMatches) {
                // Process the entire prompt through formatText to handle embedded images
                questionPromptHtml = `<div class="prompt">${this.formatText(promptText)}</div>`;
            } else {
                // Clean prompt is empty after removing images, use default
                questionPromptHtml = `<div class="prompt"><strong>What is the most likely diagnosis?</strong></div>`;
            }
        } else {
            // If no prompt found, add a default question
            questionPromptHtml = `<div class="prompt"><strong>What is the most likely diagnosis?</strong></div>`;
        }
        
        console.log('Debug - Image HTML:', imageHtml);
        console.log('Debug - Question Prompt HTML:', questionPromptHtml);
    
        // Format options
        let optionsHtml = '';
        if (question.options && question.options.length > 0) {
            const isSubmitted = this.submittedAnswers && this.submittedAnswers.hasOwnProperty(question.id);
            const selectedAnswer = this.answers[question.id];
            const correctAnswer = question.correct_answer;
    
            optionsHtml = '<div class="new-options">';
            question.options.forEach((option, index) => {
                const isSelected = selectedAnswer === index;
                const letter = String.fromCharCode(65 + index); // A, B, C, D, etc.
                const isRuledOut = this.ruledOutAnswers[question.id] && this.ruledOutAnswers[question.id].includes(index);

                let optionClasses = 'new-option';

                if (isSelected) {
                    optionClasses += ' selected';
                }
                
                if (isRuledOut) {
                    optionClasses += ' ruled-out';
                }

                // Add feedback classes if answer is submitted
                if (isSubmitted) {
                    if (index === selectedAnswer) {
                        optionClasses += selectedAnswer === correctAnswer ? ' correct' : ' incorrect';
                    }
                    if (index === correctAnswer && selectedAnswer !== correctAnswer) {
                        optionClasses += ' correct';
                    }
                }

                const cleanOption = option.replace(/^[A-E]\)\s*/, ''); // Remove letter prefix if present

                optionsHtml += `<label class="${optionClasses}"><input type="radio" name="question_${question.id}" value="${index}" ${isSelected ? 'checked' : ''}><div class="label"><span class="badge">${letter})</span> ${cleanOption}</div></label>`;
            });
            optionsHtml += '</div>';
        }
        console.log('Debug - Options HTML length:', optionsHtml.length);
    
        // Assemble the final HTML with proper spacing
        let finalHtml = '';
    
        // Add scenario/stem
        if (scenarioText) {
            finalHtml += `<div class="q-text">${this.formatText(scenarioText)}</div>`;
        }
        
        // Add images if present (with minimal spacing)
        if (imageHtml) {
            finalHtml += imageHtml;
        }
    
        // Add investigations if present (with minimal spacing)
        if (investigationsHtml) {
            finalHtml += investigationsHtml;
        }
    
        // Add question prompt (always present now, with minimal spacing)
        if (questionPromptHtml) {
            finalHtml += questionPromptHtml;
        }
    
        // Add options (with minimal spacing)
        if (optionsHtml) {
            finalHtml += '<div style="margin-top: 16px;">' + optionsHtml + '</div>';
        }
    
        console.log('Debug - Final HTML pieces:', finalHtml.substring(0, 200) + '...');
    
        container.innerHTML = finalHtml;
    
        // Bind option selection events (only if not submitted)
        const isSubmitted = this.submittedAnswers && this.submittedAnswers.hasOwnProperty(question.id);
        if (!isSubmitted) {
            document.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        const optionIndex = parseInt(radio.value);
                        this.selectOption(optionIndex);
                    }
                });
            });
            
            // Add right-click/long-press to rule out options - SIMPLIFIED VERSION
            document.querySelectorAll('.new-option').forEach((option, index) => {
                // Right-click for desktop
                option.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.toggleRuledOut(question.id, index);
                });
                
                // Simple, reliable long press for mobile
                let pressTimer = null;
                let startPos = null;
                
                option.addEventListener('touchstart', (e) => {
                    const touch = e.touches[0];
                    startPos = { x: touch.clientX, y: touch.clientY };
                    
                    pressTimer = setTimeout(() => {
                        // Enhanced haptic feedback for long press
                        this.performHapticFeedback('heavy');
                        this.toggleRuledOut(question.id, index);
                    }, 800); // Longer delay for more reliable detection
                    
                }, { passive: true });
                
                option.addEventListener('touchmove', (e) => {
                    if (startPos && pressTimer) {
                        const touch = e.touches[0];
                        const deltaX = Math.abs(touch.clientX - startPos.x);
                        const deltaY = Math.abs(touch.clientY - startPos.y);
                        
                        if (deltaX > 15 || deltaY > 15) {
                            clearTimeout(pressTimer);
                            pressTimer = null;
                        }
                    }
                }, { passive: true });
                
                option.addEventListener('touchend', () => {
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                    startPos = null;
                }, { passive: true });
                
                option.addEventListener('touchcancel', () => {
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                    startPos = null;
                }, { passive: true });
            });
        }
    
        // If answer already submitted, show feedback and explanation
        if (isSubmitted) {
            const selectedAnswer = this.answers[question.id];
            const correctAnswer = question.correct_answer;
            const isCorrect = selectedAnswer === correctAnswer;
    
            this.showFeedback(isCorrect, correctAnswer);
    
            if (question.explanations) {
                this.showExplanation(question.explanations);
            }
        }
    
        // Update button states
        this.updateButtons();
    }
    
    selectOption(optionIndex) {
        const questionId = this.questions[this.currentQuestionIndex].id;
        this.answers[questionId] = optionIndex;
        
        // Haptic feedback for selection
        this.performHapticFeedback('selection');
        
        // Update UI - both old and new classes for compatibility
        document.querySelectorAll('.option').forEach((opt, index) => {
            opt.classList.toggle('selected', index === optionIndex);
        });
        
        document.querySelectorAll('.new-option').forEach((opt, index) => {
            opt.classList.toggle('selected', index === optionIndex);
        });
        
        this.updateButtons();
    }
    
    toggleRuledOut(questionId, optionIndex) {
        // Don't allow ruling out if answer is already submitted
        if (this.submittedAnswers && this.submittedAnswers.hasOwnProperty(questionId)) {
            return;
        }
        
        // Simple debounce - prevent rapid calls
        const now = Date.now();
        if (this.lastRuleOutTime && (now - this.lastRuleOutTime) < 1000) {
            return;
        }
        this.lastRuleOutTime = now;
        
        if (!this.ruledOutAnswers[questionId]) {
            this.ruledOutAnswers[questionId] = [];
        }
        
        const ruledOutList = this.ruledOutAnswers[questionId];
        const index = ruledOutList.indexOf(optionIndex);
        
        if (index > -1) {
            // Remove from ruled out list
            ruledOutList.splice(index, 1);
            console.log(`Removed rule-out for Q${questionId} option ${optionIndex}`);
        } else {
            // Add to ruled out list
            ruledOutList.push(optionIndex);
            console.log(`Added rule-out for Q${questionId} option ${optionIndex}`);
        }
        
        // Update just the visual state without re-rendering entire question
        this.updateOptionVisualState(optionIndex, index === -1);
    }
    
    updateOptionVisualState(optionIndex, isRuledOut) {
        const options = document.querySelectorAll('.new-option');
        if (options[optionIndex]) {
            const option = options[optionIndex];
            if (isRuledOut) {
                option.classList.add('ruled-out');
            } else {
                option.classList.remove('ruled-out');
            }
        }
    }
    
    performHapticFeedback(type = 'light') {
        // Enhanced haptic feedback with Android support
        console.log('🔊 Attempting haptic feedback:', type);
        
        // Check for modern haptic API first (Android Chrome)
        if (window.navigator && navigator.vibrate) {
            try {
                let pattern;
                switch (type) {
                    case 'success':
                        pattern = [100, 50, 100]; // Double tap for success
                        break;
                    case 'error':
                        pattern = [200, 100, 200, 100, 200]; // Triple tap for error
                        break;
                    case 'selection':
                        pattern = [50]; // Single short for selection
                        break;
                    case 'heavy':
                        pattern = [500]; // Long vibration for long press
                        break;
                    default:
                        pattern = [80, 40, 80]; // Default light feedback
                }
                
                navigator.vibrate(pattern);
                console.log('🔊 Vibration triggered:', pattern);
                return true;
            } catch (error) {
                console.log('🔊 Vibration failed:', error);
            }
        }
        
        // Check for iOS haptic feedback
        if (window.navigator && navigator.platform && navigator.platform.includes('iPhone')) {
            try {
                // iOS doesn't support vibrate() but we can try other methods
                if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
                    // This is iOS 13+ with permission-based haptics
                    console.log('🔊 iOS haptic feedback attempted');
                }
            } catch (error) {
                console.log('🔊 iOS haptic feedback failed:', error);
            }
        }
        
        // Visual feedback fallback for all devices
        this.performVisualFeedback(type);
        
        return false;
    }
    
    performVisualFeedback(type = 'light') {
        try {
            const intensity = type === 'heavy' ? '0.3' : '0.15';
            const duration = type === 'heavy' ? 150 : 100;
            
            document.documentElement.style.setProperty('--haptic-flash', intensity);
            setTimeout(() => {
                document.documentElement.style.setProperty('--haptic-flash', '0');
            }, duration);
            
            console.log('🔊 Visual feedback applied:', type);
        } catch (error) {
            console.log('🔊 Visual feedback failed:', error);
        }
    }
    
    submitAnswer() {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        const selectedAnswer = this.answers[currentQuestion.id];
        
        if (selectedAnswer === undefined) {
            return; // No answer selected
        }
        
        // Record time spent on this question
        if (this.questionStartTime) {
            const timeSpent = Date.now() - this.questionStartTime;
            this.questionTimes[this.currentQuestionIndex] = timeSpent;
            this.sessionStats.questionsAnswered++;
            this.sessionStats.totalTime += timeSpent;
            this.sessionStats.averageTimePerQuestion = this.sessionStats.totalTime / this.sessionStats.questionsAnswered;
        }
        
        // Mark this answer as submitted
        this.submittedAnswers[currentQuestion.id] = selectedAnswer;
        
        // Show feedback (optional - you can customize this)
        const correctAnswer = currentQuestion.correct_answer;
        const isCorrect = selectedAnswer === correctAnswer;
        
        console.log('Question:', currentQuestion.title);
        console.log('Selected:', selectedAnswer, 'Correct:', correctAnswer, 'IsCorrect:', isCorrect);
        
        // Update the selected option with feedback styling
        document.querySelectorAll('.option').forEach((opt, index) => {
            opt.classList.remove('correct', 'incorrect');
            if (index === selectedAnswer) {
                opt.classList.add(isCorrect ? 'correct' : 'incorrect');
            }
            if (index === correctAnswer && !isCorrect) {
                opt.classList.add('correct');
            }
        });
        
        // Show feedback
        this.showFeedback(isCorrect, correctAnswer);
        
        // Haptic feedback based on answer correctness
        this.performHapticFeedback(isCorrect ? 'success' : 'error');
        
        // Show explanation if available
        this.showExplanation(currentQuestion.explanations);
        
        // Update sidebar to reflect answer status
        this.buildQuestionList();
        
        // Update progress immediately upon submission
        this.updateProgress();
        
        // Update time tracking display
        this.updateTimeDisplay();
        
        this.updateButtons();
    }
    
    showFeedback(isCorrect, correctAnswer) {
        const feedbackContainer = document.getElementById('feedbackContainer');
        
        if (isCorrect) {
            feedbackContainer.innerHTML = '✅ Correct!';
            feedbackContainer.className = 'feedback-container correct';
        } else {
            const correctLetter = String.fromCharCode(65 + correctAnswer); // Convert 0->A, 1->B, etc.
            feedbackContainer.innerHTML = `❌ Incorrect. The correct answer is ${correctLetter}.`;
            feedbackContainer.className = 'feedback-container incorrect';
        }
        
        feedbackContainer.style.display = 'block';
    }
    
    buildQuestionList() {
        const sidebarContent = document.getElementById('sidebarContent');
        
        if (!this.questions || this.questions.length === 0 || !sidebarContent) {
            return;
        }
        
        let html = '<div class="progress-list">';
        
        this.questions.forEach((question, index) => {
            const isAnswered = this.submittedAnswers && this.submittedAnswers.hasOwnProperty(question.id);
            const isCorrect = isAnswered && this.submittedAnswers[question.id] === question.correct_answer;
            const isCurrent = index === this.currentQuestionIndex;
            const isFlagged = this.flaggedQuestions.has(question.id);
            
            let statusIcon = '⚪'; // Not answered
            if (isAnswered) {
                statusIcon = isCorrect ? '✅' : '❌';
            }
            
            const flagIcon = isFlagged ? ' 🚩' : '';
            
            html += `
                <div class="progress-item ${isCurrent ? 'current' : ''}" data-question-index="${index}" style="cursor: pointer;">
                    <span>Q${index + 1}${flagIcon}</span>
                    <span>${statusIcon}</span>
                </div>
            `;
        });
        
        html += '</div>';
        sidebarContent.innerHTML = html;
        
        // Add click listeners to question items
        document.querySelectorAll('.progress-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const questionIndex = parseInt(e.currentTarget.dataset.questionIndex);
                this.goToQuestion(questionIndex);
            });
        });
    }
    
    goToQuestion(questionIndex) {
        if (questionIndex >= 0 && questionIndex < this.questions.length) {
            this.currentQuestionIndex = questionIndex;
            this.renderCurrentQuestion();
            this.updateProgress();
            this.buildQuestionList(); // Refresh the list to update current indicator
            this.scrollToTop();
        }
    }
    
    // Shuffle array using Fisher-Yates algorithm
    shuffleArray(array) {
        const shuffled = [...array]; // Create a copy to avoid mutating original
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    // Shuffle options for a question to prevent pattern memorization
    shuffleOptions(question) {
        if (!question.options || question.options.length <= 1) {
            return question;
        }
        
        // Validate correct_answer index is within bounds
        if (question.correct_answer === null || question.correct_answer === undefined || 
            question.correct_answer < 0 || question.correct_answer >= question.options.length) {
            console.warn('Invalid correct_answer index:', question.correct_answer, 'for question with', question.options.length, 'options. Question:', question.title);
            // Try to find the correct answer by looking at the first option
            question.correct_answer = 0; // Default to first option as fallback
        }
        
        // Create array of indices and their corresponding options
        const optionPairs = question.options.map((option, index) => ({ option, originalIndex: index }));
        
        // Fisher-Yates shuffle
        for (let i = optionPairs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [optionPairs[i], optionPairs[j]] = [optionPairs[j], optionPairs[i]];
        }
        
        // Create the shuffled question
        const shuffledQuestion = { ...question };
        shuffledQuestion.options = optionPairs.map(pair => pair.option);
        
        // Update the correct answer index to match the new position
        const correctOptionPair = optionPairs.find(pair => pair.originalIndex === question.correct_answer);
        if (correctOptionPair) {
            shuffledQuestion.correct_answer = optionPairs.indexOf(correctOptionPair);
        } else {
            // This should not happen after validation, but as a safety measure
            console.error('Failed to find correct option pair for question:', question.title);
            console.error('Original correct_answer:', question.correct_answer, 'Options length:', question.options.length);
            console.error('Options:', question.options);
            shuffledQuestion.correct_answer = 0; // Default to first option
        }
        
        // Store the mapping for this question so we can maintain consistency
        shuffledQuestion.optionMapping = optionPairs.map(pair => pair.originalIndex);
        
        return shuffledQuestion;
    }
    
    showExplanation(explanations) {
        const explanationContainer = document.getElementById('explanationContainer');
        
        console.log('showExplanation called with:', explanations);
        
        if (!explanations || explanations.length === 0) {
            console.log('No explanations found, hiding container');
            explanationContainer.style.display = 'none';
            return;
        }
        
        console.log('Showing explanations:', explanations.length, 'items');
        let explanationHtml = '<h4>Explanation</h4>';
        
        explanations.forEach(exp => {
            // Remove "Explanation:" or "Answer:" prefix if present
            const cleanExp = exp.replace(/^(Explanation:|Answer:)\s*/i, '');
            explanationHtml += `<p>${this.formatText(cleanExp)}</p>`;
        });
        
        explanationContainer.innerHTML = explanationHtml;
        explanationContainer.style.display = 'block';
    }
    
    updateButtons() {
        const submitBtn = document.getElementById('submitBtn');
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtnTop = document.getElementById('nextBtnTop');
        const prevBtnTop = document.getElementById('prevBtnTop');
        const flagBtn = document.getElementById('flagBtn');
        
        const currentQuestion = this.questions[this.currentQuestionIndex];
        const hasAnswer = this.answers.hasOwnProperty(currentQuestion.id);
        const isSubmitted = this.submittedAnswers && this.submittedAnswers.hasOwnProperty(currentQuestion.id);
        
        // Show/hide previous buttons
        const showPrev = this.currentQuestionIndex > 0;
        prevBtn.style.display = showPrev ? 'block' : 'none';
        prevBtnTop.style.display = showPrev ? 'block' : 'none';
        
        // Next buttons are always active
        nextBtnTop.style.display = 'block';
        nextBtnTop.disabled = false;
        
        // Update flag button state
        if (flagBtn) {
            if (this.flaggedQuestions.has(currentQuestion.id)) {
                flagBtn.classList.add('flagged');
                flagBtn.title = 'Remove flag';
            } else {
                flagBtn.classList.remove('flagged');
                flagBtn.title = 'Flag this question';
            }
        }
        
        if (!hasAnswer) {
            // No answer selected - show submit button, next always available
            submitBtn.style.display = 'none';
            nextBtn.style.display = 'block';
            nextBtn.disabled = false;
        } else if (!isSubmitted) {
            // Answer selected but not submitted - show submit button
            submitBtn.style.display = 'block';
            nextBtn.style.display = 'none';
        } else {
            // Answer submitted - show next button
            submitBtn.style.display = 'none';
            nextBtn.style.display = 'block';
            nextBtn.disabled = false;
        }
        
        // Update next button text
        const nextText = this.currentQuestionIndex === this.questions.length - 1 ? 'Finish Quiz' : 'Next Question';
        nextBtn.textContent = nextText;
        nextBtnTop.textContent = this.currentQuestionIndex === this.questions.length - 1 ? 'Finish' : 'Next →';
    }
    
    toggleFlag() {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        
        if (this.flaggedQuestions.has(currentQuestion.id)) {
            this.flaggedQuestions.delete(currentQuestion.id);
        } else {
            this.flaggedQuestions.add(currentQuestion.id);
        }
        
        this.updateButtons();
        this.buildQuestionList(); // Refresh sidebar to show flag status
    }
    
    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.renderCurrentQuestion();
            this.updateProgress();
            this.scrollToTop();
        } else {
            this.finishQuiz();
        }
    }
    
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.renderCurrentQuestion();
            this.updateProgress();
            this.scrollToTop();
        }
    }
    
    updateProgress() {
        if (!this.questions || this.questions.length === 0) return;
        
        const percentage = Math.round(((this.currentQuestionIndex + 1) / this.questions.length) * 100);
        
        // Update header progress
        const questionTitle = document.getElementById('questionTitle');
        const questionProgress = document.getElementById('questionProgress');
        if (questionTitle) {
            questionTitle.textContent = `Question ${this.currentQuestionIndex + 1}`;
        }
        if (questionProgress) {
            questionProgress.textContent = `${this.currentQuestionIndex + 1} of ${this.questions.length}`;
        }
        
        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.setProperty('--w', `${percentage}%`);
        }
        
        // Update sidebar stats
        let answeredCount = 0;
        let correctCount = 0;
        
        if (this.submittedAnswers) {
            Object.keys(this.submittedAnswers).forEach(questionId => {
                const question = this.questions.find(q => q.id == questionId);
                if (question) {
                    answeredCount++;
                    if (this.submittedAnswers[questionId] === question.correct_answer) {
                        correctCount++;
                    }
                }
            });
        }
        
        const completedCount = document.getElementById('completedCount');
        const correctCountEl = document.getElementById('correctCount');
        
        if (completedCount) {
            completedCount.textContent = `${answeredCount}/${this.questions.length}`;
        }
        
        if (correctCountEl) {
            const correctPercentage = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
            correctCountEl.textContent = `${correctCount} (${correctPercentage}%)`;
        }
    }
    
    async finishQuiz() {
        this.showLoading('Calculating results...');
        
        try {
            const response = await fetch('/api/quiz/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quiz_name: this.quizName,
                    answers: this.answers
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showResults(data.score, data.results);
            } else {
                this.showError('Failed to submit quiz: ' + data.error);
            }
        } catch (error) {
            console.error('Error submitting quiz:', error);
            this.showError('Failed to submit quiz. Please check your connection.');
        }
    }
    
    showResults(score, results) {
        this.showScreen('resultsScreen');
        this.updateNavigation('Results');
        
        const scorePercentage = document.getElementById('scorePercentage');
        const scoreDetails = document.getElementById('scoreDetails');
        
        scorePercentage.textContent = `${score.percentage}%`;
        scoreDetails.textContent = `${score.correct} out of ${score.total} questions correct`;
        
        // Update score card color based on performance
        const scoreCard = document.querySelector('.score-card');
        if (score.percentage >= 80) {
            scoreCard.style.background = 'linear-gradient(135deg, #34C759 0%, #00C957 100%)';
        } else if (score.percentage >= 60) {
            scoreCard.style.background = 'linear-gradient(135deg, #FF9500 0%, #FF8C00 100%)';
        } else {
            scoreCard.style.background = 'linear-gradient(135deg, #FF3B30 0%, #FF2D1C 100%)';
        }
    }
    
    retryQuiz() {
        this.currentQuestionIndex = 0;
        this.answers = {};
        this.submittedAnswers = {};
        this.ruledOutAnswers = {};
        this.startQuiz();
    }
    
    showQuizSelection() {
        this.showScreen('quizSelection');
        this.updateNavigation('MLA Quiz');
        this.loadQuizzes(); // Refresh the quiz list
    }
    
    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        // Show target screen
        document.getElementById(screenId).style.display = 'block';
    }
    
    updateNavigation(title) {
        const navTitle = document.getElementById('navTitle');
        const backBtn = document.getElementById('backBtn');
        
        navTitle.textContent = title;
        
        if (title === 'MLA Quiz') {
            backBtn.style.display = 'none';
        } else {
            backBtn.style.display = 'block';
        }
    }
    
    goBack() {
        const currentScreen = document.querySelector('.screen[style*="block"]');
        
        if (currentScreen && currentScreen.id === 'quizScreen') {
            this.showQuizSelection();
        } else if (currentScreen && currentScreen.id === 'resultsScreen') {
            this.showQuizSelection();
        }
    }
    
    showLoading(message) {
        // Create a simple loading overlay
        const existingOverlay = document.getElementById('loadingOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        overlay.innerHTML = `
            <div style="background: white; padding: 32px; border-radius: 16px; text-align: center; max-width: 200px;">
                <div class="spinner"></div>
                <p style="margin: 16px 0 0 0; color: #1c1c1e;">${message}</p>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Auto-remove after 10 seconds to prevent stuck loading
        setTimeout(() => {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) overlay.remove();
        }, 10000);
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    showError(message) {
        this.hideLoading();
        
        // Create error alert
        const existingAlert = document.getElementById('errorAlert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        const alert = document.createElement('div');
        alert.id = 'errorAlert';
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            background: #FF3B30;
            color: white;
            padding: 16px;
            border-radius: 10px;
            z-index: 1500;
            text-align: center;
            font-weight: 500;
        `;
        
        alert.innerHTML = `
            ${message}
            <button onclick="this.parentElement.remove()" style="
                position: absolute;
                top: 8px;
                right: 12px;
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
            ">×</button>
        `;
        
        document.body.appendChild(alert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const alert = document.getElementById('errorAlert');
            if (alert) alert.remove();
        }, 5000);
    }
    
    async handleFileUpload(files) {
        if (!files || files.length === 0) return;
        
        const uploadStatus = document.getElementById('uploadStatus');
        uploadStatus.innerHTML = '<span style="color: #007AFF;">📤 Uploading files...</span>';
        
        try {
            for (let file of files) {
                await this.uploadSingleFile(file);
            }
            
            // Refresh the quiz list to show uploaded quizzes
            await this.loadQuizzes();
            uploadStatus.innerHTML = '<span style="color: #34c759;">✅ Files uploaded successfully!</span>';
            
            // Clear status after 3 seconds
            setTimeout(() => {
                uploadStatus.innerHTML = '';
            }, 3000);
            
        } catch (error) {
            console.error('Upload error:', error);
            uploadStatus.innerHTML = '<span style="color: #ff3b30;">❌ Upload failed: ' + error.message + '</span>';
        }
    }
    
    async uploadSingleFile(file) {
        console.log('🔄 UPLOAD START - File details:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified).toISOString()
        });

        try {
            const formData = new FormData();
            formData.append('quiz_file', file);
            
            console.log('🔄 UPLOAD - Sending request to /api/upload-quiz');
            
            const response = await fetch('/api/upload-quiz', {
                method: 'POST',
                body: formData
            });
            
            console.log('🔍 UPLOAD DEBUG - Response received:', response.status, response.statusText);
            
            // Check if response is ok
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ UPLOAD ERROR - Response not ok:', response.status, errorText);
                console.error('❌ UPLOAD ERROR - Full response text:', errorText);
                
                // Try to parse as JSON, fallback to text
                try {
                    const errorData = JSON.parse(errorText);
                    console.error('❌ UPLOAD ERROR - Parsed error:', errorData);
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                } catch (parseError) {
                    console.error('❌ UPLOAD ERROR - Could not parse as JSON:', parseError);
                    throw new Error(`Server error: ${response.status} - ${errorText.substring(0, 200)}`);
                }
            }
            
            console.log('🔍 UPLOAD DEBUG - Raw response status:', response.status);
            console.log('🔍 UPLOAD DEBUG - Response headers:', [...response.headers.entries()]);
            
            const data = await response.json();
            console.log('🔍 UPLOAD DEBUG - Full server response:', data);
            console.log('🔍 UPLOAD DEBUG - Response keys:', Object.keys(data));
            console.log('🔍 UPLOAD DEBUG - Questions received:', data.questions?.length);
            console.log('🔍 UPLOAD DEBUG - Images in response:', data.images);
            console.log('🔍 UPLOAD DEBUG - Images keys:', data.images ? Object.keys(data.images) : 'No images property');
            console.log('🔍 UPLOAD DEBUG - First question sample:', data.questions?.[0]);
            
            if (!data.success) {
                throw new Error(data.error || 'Upload failed');
            }
            
            // Store quiz data temporarily for immediate use
            const quizData = {
                name: data.quiz_name,
                questions: data.questions,
                total_questions: data.total_questions,
                isUploaded: true,
                images: data.images || {}, // Store any images that came with the upload
                uploadTimestamp: Date.now()
            };
            
            console.log('🔍 UPLOAD DEBUG - Quiz data to store:', quizData);
            
            // Count actual images vs references for debugging
            const actualImages = Object.values(quizData.images).filter(v => typeof v === 'string' && v.startsWith('data:')).length;
            const references = Object.values(quizData.images).filter(v => typeof v === 'string' && v.startsWith('__REF__:')).length;
            const totalKeys = Object.keys(quizData.images || {}).length;
            
            console.log('🔍 UPLOAD DEBUG - Image storage breakdown:', {
                totalKeys,
                actualImages,
                references,
                compressionRatio: totalKeys > 0 ? (actualImages / totalKeys).toFixed(2) : 0
            });
            
            // Add to local storage or memory for immediate access
            this.storeUploadedQuiz(quizData);
            
            return data;
            
        } catch (error) {
            console.error('Upload error details:', error);
            throw error;
        }
    }
    
    storeUploadedQuiz(quizData) {
        console.log('🔍 STORAGE DEBUG - Storing quiz:', quizData.name);
        console.log('🔍 STORAGE DEBUG - Quiz has images:', Object.keys(quizData.images || {}));
        
        try {
            // Store in localStorage for persistence
            let uploadedQuizzes = JSON.parse(localStorage.getItem('uploadedQuizzes') || '[]');
            
            // Remove existing quiz with same name
            uploadedQuizzes = uploadedQuizzes.filter(quiz => quiz.name !== quizData.name);
            
            // Check if we need to compress or split the data
            const dataSize = JSON.stringify(quizData).length;
            const maxLocalStorageSize = 5 * 1024 * 1024; // 5MB typical limit
            
            console.log('🔍 STORAGE DEBUG - Quiz data size:', Math.round(dataSize / 1024), 'KB');
            
            if (dataSize > maxLocalStorageSize) {
                console.log('🔍 STORAGE DEBUG - Quiz too large for localStorage, using split storage');
                
                // Store quiz metadata separately
                const quizMeta = {
                    name: quizData.name,
                    total_questions: quizData.total_questions,
                    isUploaded: true,
                    uploadTimestamp: quizData.uploadTimestamp,
                    hasImages: Object.keys(quizData.images || {}).length > 0,
                    dataStored: 'split' // Flag to indicate split storage
                };
                
                uploadedQuizzes.push(quizMeta);
                
                // Store questions and images separately with compression
                const questionsData = {
                    questions: quizData.questions,
                    images: quizData.images
                };
                
                // Try to store the full data
                try {
                    localStorage.setItem(`quiz_${quizData.name}`, JSON.stringify(questionsData));
                    localStorage.setItem('uploadedQuizzes', JSON.stringify(uploadedQuizzes));
                    console.log('🔍 STORAGE DEBUG - Successfully stored quiz using split storage');
                } catch (quotaError) {
                    console.log('🔍 STORAGE DEBUG - Still too large, using image-reduced storage');
                    
                    // If still too large, store without images and show warning
                    const questionsOnly = {
                        questions: quizData.questions,
                        images: {} // Empty images to save space
                    };
                    
                    localStorage.setItem(`quiz_${quizData.name}`, JSON.stringify(questionsOnly));
                    quizMeta.imagesRemoved = true;
                    localStorage.setItem('uploadedQuizzes', JSON.stringify(uploadedQuizzes));
                    
                    // Show user warning about images
                    this.showError('Quiz uploaded successfully, but images were not stored due to browser storage limits. Questions will work but images may not display.');
                }
            } else {
                // Small enough to store normally
                uploadedQuizzes.push(quizData);
                localStorage.setItem('uploadedQuizzes', JSON.stringify(uploadedQuizzes));
                console.log('🔍 STORAGE DEBUG - Successfully stored quiz normally');
            }
            
            console.log('🔍 STORAGE DEBUG - Total uploaded quizzes stored:', uploadedQuizzes.length);
            
        } catch (error) {
            console.error('🔍 STORAGE ERROR - Failed to store quiz:', error);
            
            // Fallback: store only in memory for this session
            if (!window.tempUploadedQuizzes) {
                window.tempUploadedQuizzes = [];
            }
            
            // Remove existing quiz with same name from temp storage
            window.tempUploadedQuizzes = window.tempUploadedQuizzes.filter(quiz => quiz.name !== quizData.name);
            window.tempUploadedQuizzes.push(quizData);
            
            console.log('🔍 STORAGE DEBUG - Stored quiz in temporary memory storage');
            this.showError('Quiz uploaded successfully but could not be saved permanently. It will be available until you refresh the page.');
        }
    }
    
    getUploadedQuizzes() {
        console.log('🔍 STORAGE DEBUG - Retrieving uploaded quizzes');
        
        // Get quizzes from localStorage
        let quizzes = JSON.parse(localStorage.getItem('uploadedQuizzes') || '[]');
        
        // Also check temporary storage
        if (window.tempUploadedQuizzes && window.tempUploadedQuizzes.length > 0) {
            console.log('🔍 STORAGE DEBUG - Found', window.tempUploadedQuizzes.length, 'quizzes in temporary storage');
            // Merge with persistent storage, removing duplicates
            const tempNames = window.tempUploadedQuizzes.map(q => q.name);
            quizzes = quizzes.filter(q => !tempNames.includes(q.name));
            quizzes = [...quizzes, ...window.tempUploadedQuizzes];
        }
        
        // For split storage quizzes, we need to reconstruct the data when loading
        const reconstructedQuizzes = quizzes.map(quiz => {
            if (quiz.dataStored === 'split') {
                console.log('🔍 STORAGE DEBUG - Reconstructing split storage quiz:', quiz.name);
                try {
                    const quizData = JSON.parse(localStorage.getItem(`quiz_${quiz.name}`) || '{}');
                    return {
                        ...quiz,
                        questions: quizData.questions || [],
                        images: quizData.images || {}
                    };
                } catch (error) {
                    console.error('🔍 STORAGE ERROR - Failed to reconstruct quiz:', quiz.name, error);
                    return quiz; // Return metadata only
                }
            }
            return quiz;
        });
        
        console.log('🔍 STORAGE DEBUG - Retrieved', reconstructedQuizzes.length, 'uploaded quizzes from localStorage');
        reconstructedQuizzes.forEach((quiz, index) => {
            console.log(`🔍 STORAGE DEBUG - Quiz ${index + 1}: ${quiz.name}, Images:`, Object.keys(quiz.images || {}));
        });
        
        return reconstructedQuizzes;
    }
    
    // Helper function to resolve image references
    resolveImageReference(imageData, allImages) {
        if (typeof imageData === 'string' && imageData.startsWith('__REF__:')) {
            const refKey = imageData.substring(8); // Remove '__REF__:' prefix (8 characters)
            return allImages[refKey] || imageData; // Return actual data or original if not found
        }
        return imageData;
    }
    
    // Format investigations with proper line breaks
    formatInvestigations(investigationsText) {
        if (!investigationsText) return '';
        
        let formatted = investigationsText.trim();
        
        // Split investigations at natural break points:
        // 1. After reference ranges in parentheses followed by a capital letter
        // 2. After test results with colons followed by a capital letter
        formatted = formatted
            // Pattern: "Value unit (range) NextTest" -> "Value unit (range)<br>NextTest"
            .replace(/(\([^)]+\))\s+([A-Z][A-Za-z])/g, '$1<br>$2')
            // Pattern: "Test: result NextTest" -> "Test: result<br>NextTest" 
            .replace(/(:\s*[a-z][^:]*?)\s+([A-Z][A-Za-z])/g, '$1<br>$2')
            // Clean up multiple spaces
            .replace(/\s+/g, ' ')
            // Trim any extra whitespace
            .trim();
            
        return this.formatText(formatted);
    }

    formatText(text) {
        if (!text) return '';
        
        // Convert markdown-style formatting to HTML
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/- (.*?)(?=\n|$)/g, '• $1') // Bullet points
            .trim();
        
        // Handle [IMAGE: filename] format first - improved handling with better path resolution
        formattedText = formattedText.replace(/\[IMAGE:\s*([^\]]+)\]/gi, (match, filename) => {
            console.log('🖼️ IMAGE DEBUG - Processing image:', filename);
            
            // Check if we have a data URL already embedded in the text
            const dataUrlPattern = /data:[^;]+;base64,[A-Za-z0-9+/=]+/;
            if (dataUrlPattern.test(filename)) {
                console.log('🖼️ IMAGE DEBUG - Found data URL, displaying directly');
                // It's already a data URL, display it as an image
                return `<div class="image-container"><img src="${filename}" alt="Image" loading="lazy" onclick="openImageModal('${filename}', 'Image')"></div>`;
            } else {
                // It's a filename, try different possible paths
                let imagePath = filename.trim();
                console.log('🖼️ IMAGE DEBUG - Looking for image file:', imagePath);
                
                // Try common paths for images
                const possiblePaths = [
                    imagePath, // Original filename
                    `Questions/MLA/MLA_images/${imagePath}`, // Common MLA images folder
                    `static/images/${imagePath}`, // Static images folder
                    `/api/image/${imagePath}` // API endpoint for images
                ];
                console.log('🖼️ IMAGE DEBUG - Possible paths:', possiblePaths);
                
                // For uploaded quizzes, check if images are embedded in localStorage
                const uploadedQuizzes = this.getUploadedQuizzes();
                console.log('🖼️ IMAGE DEBUG - Checking', uploadedQuizzes.length, 'uploaded quizzes for embedded images');
                
                for (const quiz of uploadedQuizzes) {
                    console.log('🖼️ IMAGE DEBUG - Quiz:', quiz.name, 'has images:', Object.keys(quiz.images || {}));
                    if (quiz.images) {
                        // Try multiple possible keys for the image
                        const possibleKeys = [
                            imagePath, // Original filename
                            imagePath.toLowerCase(), // Lowercase
                            imagePath.replace(/\.[^.]+$/, ''), // Without extension
                            imagePath.replace(/\.[^.]+$/, '').toLowerCase(), // Without extension, lowercase
                            `MLA_images/${imagePath}`, // With folder prefix
                            `MLA_images/${imagePath.toLowerCase()}`, // With folder prefix, lowercase
                        ];
                        
                        let imageData = null;
                        let foundKey = null;
                        
                        for (const key of possibleKeys) {
                            if (quiz.images[key]) {
                                imageData = quiz.images[key];
                                foundKey = key;
                                console.log('🖼️ IMAGE DEBUG - Found image with key:', key);
                                break;
                            }
                        }
                        
                        if (imageData) {
                            console.log('🖼️ IMAGE DEBUG - Found embedded image data for:', foundKey);
                            
                            // Handle reference-based storage (resolve references)
                            if (typeof imageData === 'string' && imageData.startsWith('__REF__:')) {
                                const refKey = imageData.substring(8); // Remove '__REF__:' prefix (8 characters)
                                imageData = quiz.images[refKey];
                                console.log('🖼️ IMAGE DEBUG - Resolved reference from', foundKey, 'to', refKey);
                            }
                            
                            if (imageData && imageData.startsWith('data:')) {
                                // Found actual image data
                                return `<div class="image-container"><img src="${imageData}" alt="Image" loading="lazy" onclick="openImageModal('${imageData}', 'Image')"></div>`;
                            } else {
                                console.log('🖼️ IMAGE DEBUG - Image data after resolution:', typeof imageData, imageData?.substring(0, 50) + '...');
                            }
                        }
                    }
                }
                
                console.log('🖼️ IMAGE DEBUG - No embedded image found, showing as link with path:', possiblePaths[1]);
                // Default: show as a link that tries the first possible path
                return `<a href="#" class="image-link" onclick="openImageModal('${possiblePaths[1]}', 'Image'); return false;">🖼️ View Image: ${imagePath}</a>`;
            }
        });
        
        // Handle markdown-style images: ![alt text](url) or ![alt text](url "caption")
        formattedText = formattedText.replace(/!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]+)")?\)/g, (match, alt, url, caption) => {
            let actualUrl = url;
            
            // Handle reference-based storage (resolve references)
            if (typeof url === 'string' && url.startsWith('__REF__:')) {
                console.log('🖼️ IMAGE DEBUG - Found reference in markdown image:', url);
                const refKey = url.substring(8); // Remove '__REF__:' prefix (8 characters)
                console.log('🖼️ IMAGE DEBUG - Looking for refKey:', refKey);
                
                // Look up the actual image data
                const uploadedQuizzes = this.getUploadedQuizzes();
                for (const quiz of uploadedQuizzes) {
                    if (quiz.images) {
                        console.log('🖼️ IMAGE DEBUG - Checking quiz:', quiz.name, 'for key:', refKey);
                        
                        // Check if the reference key exists directly
                        if (quiz.images[refKey]) {
                            let imageData = quiz.images[refKey];
                            console.log('🖼️ IMAGE DEBUG - Found direct match for key:', refKey);
                            
                            // If it's another reference, resolve it
                            if (typeof imageData === 'string' && imageData.startsWith('__REF__:')) {
                                const secondRefKey = imageData.substring(8); // Remove '__REF__:' prefix (8 characters)
                                imageData = quiz.images[secondRefKey];
                                console.log('🖼️ IMAGE DEBUG - Resolved nested reference from', refKey, 'to', secondRefKey);
                            }
                            
                            if (imageData && imageData.startsWith('data:')) {
                                actualUrl = imageData;
                                console.log('🖼️ IMAGE DEBUG - Resolved markdown reference to base64 data');
                                break;
                            } else {
                                console.log('🖼️ IMAGE DEBUG - Found data but not base64:', typeof imageData, imageData?.substring(0, 50));
                            }
                        } else {
                            console.log('🖼️ IMAGE DEBUG - Key not found directly, available keys:', Object.keys(quiz.images).slice(0, 10));
                        }
                    }
                }
                
                if (actualUrl === url) {
                    console.log('🖼️ IMAGE DEBUG - Failed to resolve reference:', refKey);
                }
            }
            
            const imageHtml = `<img src="${actualUrl}" alt="${alt}" loading="lazy" onclick="openImageModal('${actualUrl}', '${alt}')">`;
            if (caption) {
                return `<div class="image-container">${imageHtml}<div class="image-caption">${caption}</div></div>`;
            }
            return `<div class="image-container">${imageHtml}</div>`;
        });
        
        // Handle simple image URLs (common formats)
        formattedText = formattedText.replace(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?/gi, (url) => {
            return `<div class="image-container"><img src="${url}" alt="Image" loading="lazy" onclick="openImageModal('${url}', 'Image')"></div>`;
        });
        
        // Handle image links with "View Image" button: [View Image](url)
        formattedText = formattedText.replace(/\[(View Image|view image|IMAGE|Image)\]\(([^)]+)\)/gi, (match, text, url) => {
            return `<a href="#" class="image-link" onclick="openImageModal('${url}', 'Image'); return false;">🖼️ View Image</a>`;
        });
        
        // Convert plain URLs to clickable links with proper wrapping attributes
        formattedText = formattedText.replace(
            /(https?:\/\/[^\s<>"']+)/gi,
            '<a href="$1" target="_blank" rel="noopener noreferrer" class="explanation-link">$1</a>'
        );
        
        // Convert www.domain.com to clickable links
        formattedText = formattedText.replace(
            /(?<!https?:\/\/)\b(www\.[^\s<>"']+)/gi,
            '<a href="http://$1" target="_blank" rel="noopener noreferrer" class="explanation-link">$1</a>'
        );
        
        // Check if text contains line breaks that suggest multiple paragraphs
        if (formattedText.includes('\n\n')) {
            // Only convert double line breaks to paragraph breaks, single line breaks to spaces
            formattedText = formattedText
                .replace(/\n\s*\n/g, '</p><p>') // Double line breaks = new paragraphs
                .replace(/\n/g, ' ') // Single line breaks = spaces
                .replace(/^/, '<p>') // Add opening paragraph tag
                .replace(/$/, '</p>'); // Add closing paragraph tag
        } else {
            // For single line or simple text, just convert single line breaks to spaces
            formattedText = formattedText.replace(/\n/g, ' ');
        }
        
        return formattedText;
    }
    
    // Time tracking methods
    updateTimeDisplay() {
        const timeDisplayEl = document.getElementById('time-display');
        if (timeDisplayEl && this.sessionStats.questionsAnswered > 0) {
            const avgTime = Math.round(this.sessionStats.averageTimePerQuestion / 1000);
            const totalTime = Math.round(this.sessionStats.totalTime / 1000);
            timeDisplayEl.innerHTML = `
                <div class="time-stats">
                    <span>Avg: ${avgTime}s</span>
                    <span>Total: ${this.formatTime(totalTime)}</span>
                </div>
            `;
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }
    
    // Study report generation methods
    generateStudyReport() {
        const reportData = this.calculateReportData();
        
        // Check if there's any data to report
        if (reportData.totalQuestions === 0) {
            alert('No questions answered yet. Please answer at least one question to generate a report.');
            return;
        }
        
        const reportHTML = this.generateReportHTML(reportData);
        
        // Create a printable window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>MLA Quiz Study Report</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
                    .report-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007AFF; padding-bottom: 20px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
                    .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                    .weak-areas { margin: 20px 0; }
                    .question-list { margin: 20px 0; }
                    .incorrect-question {
                        margin: 20px 0;
                        padding: 15px;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        background: #f8fafc;
                        page-break-inside: avoid;
                    }
                    .question-header {
                        margin-bottom: 10px;
                        color: #dc2626;
                        font-size: 16px;
                        font-weight: bold;
                    }
                    .question-scenario {
                        margin: 10px 0;
                        padding: 10px;
                        background: #f0f9ff;
                        border-left: 4px solid #0ea5e9;
                        border-radius: 4px;
                    }
                    .scenario-text {
                        margin-top: 5px;
                        font-size: 14px;
                        line-height: 1.5;
                        color: #0f172a;
                    }
                    .question-investigations {
                        margin: 10px 0;
                        padding: 10px;
                        background: #f0fdf4;
                        border-left: 4px solid #22c55e;
                        border-radius: 4px;
                    }
                    .investigations-text {
                        margin-top: 5px;
                        font-size: 14px;
                        line-height: 1.5;
                        color: #0f172a;
                    }
                    .question-prompt {
                        margin: 10px 0;
                        padding: 10px;
                        background: #fefce8;
                        border-left: 4px solid #eab308;
                        border-radius: 4px;
                    }
                    .prompt-text {
                        margin-top: 5px;
                        font-size: 14px;
                        line-height: 1.5;
                        color: #0f172a;
                        font-weight: 500;
                    }
                    .question-text {
                        margin: 10px 0;
                        padding: 8px;
                        background: white;
                        border-left: 3px solid #007AFF;
                        font-size: 14px;
                        line-height: 1.5;
                    }
                    .question-options {
                        margin: 10px 0;
                    }
                    .question-options ol {
                        margin: 5px 0;
                        padding-left: 20px;
                    }
                    .question-options li {
                        margin: 5px 0;
                        padding: 3px 8px;
                        border-radius: 4px;
                        font-size: 13px;
                    }
                    .question-options li.your-answer {
                        background: #fee2e2;
                        border-left: 3px solid #dc2626;
                    }
                    .question-options li.correct-answer {
                        background: #dcfce7;
                        border-left: 3px solid #16a34a;
                        font-weight: bold;
                    }
                    .answer-analysis {
                        margin: 10px 0;
                        padding: 8px;
                        background: #f1f5f9;
                        border-radius: 4px;
                        font-size: 13px;
                    }
                    .explanation-section {
                        margin: 10px 0;
                        padding: 10px;
                        background: #fffbeb;
                        border: 1px solid #fbbf24;
                        border-radius: 4px;
                    }
                    .explanation-text {
                        margin-top: 5px;
                        font-size: 13px;
                        line-height: 1.6;
                        color: #374151;
                    }
                    .correct-question { background: #e8f5e8; padding: 10px; margin: 10px 0; border-radius: 5px; }
                    .progress-note { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>${reportHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    calculateReportData() {
        const totalQuestions = Object.keys(this.submittedAnswers).length;
        let correctAnswers = 0;
        
        Object.keys(this.submittedAnswers).forEach(questionId => {
            const question = this.questions.find(q => q.id == questionId);
            if (question && this.submittedAnswers[questionId] === question.correct_answer) {
                correctAnswers++;
            }
        });
        
        const incorrectAnswers = totalQuestions - correctAnswers;
        const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        
        return {
            quizName: this.quizName,
            totalQuestions,
            correctAnswers,
            incorrectAnswers,
            accuracy,
            totalTime: this.sessionStats.totalTime,
            averageTime: this.sessionStats.averageTimePerQuestion,
            questionsAnswered: this.sessionStats.questionsAnswered,
            date: new Date().toLocaleDateString(),
            incorrectQuestionsList: this.getIncorrectQuestions(),
            timePerQuestion: this.questionTimes
        };
    }

    cleanTextForPDF(text) {
        if (!text) return 'N/A';
        
        // Remove HTML tags but preserve basic formatting
        let cleanText = text
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<em>(.*?)<\/em>/gi, '*$1*')
            .replace(/<[^>]*>/g, '') // Remove all other HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
            
        // Limit length for readability in PDF
        if (cleanText.length > 800) {
            cleanText = cleanText.substring(0, 800) + '...';
        }
        
        return cleanText;
    }

    generateReportHTML(data) {
        const isPartialReport = data.totalQuestions < (this.questions?.length || 0);
        const totalQuizQuestions = this.questions?.length || data.totalQuestions;
        
        return `
            <div class="report-header">
                <h1>📊 MLA Quiz Study Report</h1>
                <h2>${data.quizName}</h2>
                <p>Generated on ${data.date}</p>
                ${isPartialReport ? '<p><em>⚠️ Partial Report - Quiz in progress</em></p>' : ''}
            </div>
            
            ${isPartialReport ? `
                <div class="progress-note">
                    <h3>📈 Progress Status</h3>
                    <p><strong>Questions Answered:</strong> ${data.totalQuestions} of ${totalQuizQuestions}</p>
                    <p><strong>Completion:</strong> ${Math.round((data.totalQuestions / totalQuizQuestions) * 100)}%</p>
                </div>
            ` : ''}
            
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>📈 Performance</h3>
                    <p><strong>Accuracy:</strong> ${data.accuracy}%</p>
                    <p><strong>Correct:</strong> ${data.correctAnswers}</p>
                    <p><strong>Incorrect:</strong> ${data.incorrectAnswers}</p>
                    <p><strong>Questions Answered:</strong> ${data.totalQuestions}</p>
                    ${isPartialReport ? `<p><strong>Total Quiz Questions:</strong> ${totalQuizQuestions}</p>` : ''}
                </div>
                
                <div class="stat-card">
                    <h3>⏱️ Time Analysis</h3>
                    <p><strong>Total Time:</strong> ${this.formatTime(Math.round(data.totalTime / 1000))}</p>
                    <p><strong>Average per Question:</strong> ${Math.round(data.averageTime / 1000)}s</p>
                    <p><strong>Questions Timed:</strong> ${data.questionsAnswered}</p>
                    ${isPartialReport ? '<p><em>Note: Times for answered questions only</em></p>' : ''}
                </div>
            </div>
            
            <div class="weak-areas">
                <h3>🎯 Areas for Improvement</h3>
                ${data.incorrectQuestionsList.length > 0 ? 
                    data.incorrectQuestionsList.map(q => `
                        <div class="incorrect-question">
                            <div class="question-header">
                                <strong>Question ${q.index + 1}:</strong>
                            </div>
                            ${q.question.scenario ? `
                                <div class="question-scenario">
                                    <strong>Scenario:</strong>
                                    <div class="scenario-text">${this.cleanTextForPDF(q.question.scenario)}</div>
                                </div>
                            ` : ''}
                            ${q.question.investigations ? `
                                <div class="question-investigations">
                                    <strong>Investigations:</strong>
                                    <div class="investigations-text">${this.cleanTextForPDF(q.question.investigations)}</div>
                                </div>
                            ` : ''}
                            ${q.question.prompt ? `
                                <div class="question-prompt">
                                    <strong>Question:</strong>
                                    <div class="prompt-text">${this.cleanTextForPDF(q.question.prompt)}</div>
                                </div>
                            ` : ''}
                            ${q.question.options ? `
                                <div class="question-options">
                                    <strong>Options:</strong>
                                    <ol type="A">
                                        ${q.question.options.map((option, idx) => `
                                            <li class="${idx === q.yourAnswer ? 'your-answer' : ''} ${idx === q.correctAnswer ? 'correct-answer' : ''}">${this.cleanTextForPDF(option)}</li>
                                        `).join('')}
                                    </ol>
                                </div>
                            ` : ''}
                            <div class="answer-analysis">
                                <p><strong>Your Answer:</strong> Option ${String.fromCharCode(65 + q.yourAnswer)} - ${this.cleanTextForPDF(q.question.options[q.yourAnswer] || 'N/A')}</p>
                                <p><strong>Correct Answer:</strong> Option ${String.fromCharCode(65 + q.correctAnswer)} - ${this.cleanTextForPDF(q.question.options[q.correctAnswer] || 'N/A')}</p>
                            </div>
                            ${q.question.explanation ? `
                                <div class="explanation-section">
                                    <strong>Explanation:</strong>
                                    <div class="explanation-text">${this.cleanTextForPDF(q.question.explanation)}</div>
                                </div>
                            ` : ''}
                        </div>
                    `).join('') : 
                    '<p>🎉 Great job! No incorrect answers to review so far.</p>'
                }
                ${isPartialReport ? '<p><em>Note: Only showing answered questions. Continue the quiz for complete analysis.</em></p>' : ''}
            </div>
        `;
    }

    getIncorrectQuestions() {
        const incorrectQuestions = [];
        Object.keys(this.submittedAnswers).forEach(questionId => {
            const question = this.questions.find(q => q.id == questionId);
            const selectedAnswer = this.submittedAnswers[questionId];
            
            if (question && selectedAnswer !== question.correct_answer) {
                const questionIndex = this.questions.findIndex(q => q.id == questionId);
                incorrectQuestions.push({
                    index: questionIndex,
                    question: question,
                    yourAnswer: selectedAnswer,
                    correctAnswer: question.correct_answer
                });
            }
        });
        return incorrectQuestions;
    }
    
    // Dark mode methods
    initializeDarkMode() {
        // Load saved theme preference
        const savedTheme = localStorage.getItem('theme') || 'light';
        console.log(`Initializing dark mode with theme: ${savedTheme}`);
        this.setTheme(savedTheme);
        
        // Add dark mode toggle button
        this.addDarkModeToggle();
    }

    setTheme(theme) {
        console.log(`Setting theme to: ${theme}`);
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Force a reflow to apply the changes
        document.body.offsetHeight;
        
        // Update toggle button text
        const toggleBtn = document.getElementById('dark-mode-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
            toggleBtn.style.color = theme === 'dark' ? '#ffffff' : '#007AFF';
        }
        
        console.log(`Theme applied. Current data-theme: ${document.documentElement.getAttribute('data-theme')}`);
    }

    toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        console.log(`Toggling theme from ${currentTheme} to ${newTheme}`);
        this.setTheme(newTheme);
    }

    addDarkModeToggle() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            // Remove existing toggle if present
            const existingToggle = document.getElementById('dark-mode-toggle');
            if (existingToggle) {
                existingToggle.remove();
            }
            
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'dark-mode-toggle';
            toggleBtn.className = 'navbar-btn';
            toggleBtn.style.cssText = 'position: absolute; right: 60px; background: none; border: none; color: #007AFF; font-size: 14px; cursor: pointer; padding: 8px; z-index: 1001;';
            toggleBtn.onclick = () => this.toggleDarkMode();
            
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            toggleBtn.textContent = currentTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
            
            navbar.appendChild(toggleBtn);
            console.log('Dark mode toggle added to navbar');
        } else {
            console.log('Navbar not found, retrying in 100ms');
            setTimeout(() => this.addDarkModeToggle(), 100);
        }
    }
    
    // Font size adjustment methods
    initializeFontSize() {
        // Load saved font size
        const savedSize = localStorage.getItem('fontSize') || 'medium';
        this.setFontSize(savedSize);
        
        // Add font size controls
        this.addFontSizeControls();
    }

    initializeQuizLength() {
        // Set up initial quiz length selection
        setTimeout(() => {
            this.updateQuizLengthInfo();
            
            // Ensure the default (20) button is marked as active
            const defaultButton = document.querySelector('.quiz-length-btn[data-length="20"]');
            if (defaultButton && !defaultButton.classList.contains('active')) {
                defaultButton.classList.add('active');
            }
            
            console.log('🎯 Quiz length initialized:', this.selectedQuizLength);
        }, 100);
    }

    initializeMedicalTools() {
        // Medical tools panel functionality
        const toolsToggle = document.getElementById('medical-tools-toggle');
        const toolsPanel = document.getElementById('medical-tools-panel');
        const toolsClose = document.getElementById('tools-close-btn');
        const toolNavBtns = document.querySelectorAll('.tool-nav-btn');
        const toolPanels = document.querySelectorAll('.tool-panel');

        // Toggle panel open/close
        if (toolsToggle) {
            toolsToggle.addEventListener('click', () => {
                toolsPanel.classList.toggle('open');
                console.log('🩺 Medical tools panel toggled');
            });
        }

        // Close panel
        if (toolsClose) {
            toolsClose.addEventListener('click', () => {
                toolsPanel.classList.remove('open');
            });
        }

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (toolsPanel && toolsPanel.classList.contains('open')) {
                if (!toolsPanel.contains(e.target) && !toolsToggle.contains(e.target)) {
                    toolsPanel.classList.remove('open');
                }
            }
        });

        // Handle tool navigation
        toolNavBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const toolType = btn.getAttribute('data-tool');
                this.switchMedicalTool(toolType);
                
                // Update active nav button
                toolNavBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Initialize calculators
        this.initializeCalculators();
        
        console.log('🩺 Medical tools initialized');
    }

    switchMedicalTool(toolType) {
        const toolPanels = document.querySelectorAll('.tool-panel');
        
        // Hide all panels
        toolPanels.forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Show selected panel
        const targetPanel = document.getElementById(`${toolType}-panel`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
        
        console.log('🩺 Switched to tool:', toolType);
    }

    initializeCalculators() {
        // Handle calculator button clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.calculator-btn')) {
                const calcType = e.target.closest('.calculator-btn').getAttribute('data-calc');
                this.loadCalculator(calcType);
            }
        });
    }

    loadCalculator(calcType) {
        const workspace = document.getElementById('calculator-workspace');
        if (!workspace) return;

        workspace.classList.add('active');
        
        switch (calcType) {
            case 'bmi':
                workspace.innerHTML = this.getBMICalculator();
                break;
            case 'chads2vasc':
                workspace.innerHTML = this.getCHADS2VAScCalculator();
                break;
            case 'hasbled':
                workspace.innerHTML = this.getHASBLEDCalculator();
                break;
            case 'gcs':
                workspace.innerHTML = this.getGCSCalculator();
                break;
            case 'apache':
                workspace.innerHTML = this.getAPACHECalculator();
                break;
            case 'wells':
                workspace.innerHTML = this.getWellsCalculator();
                break;
            default:
                workspace.innerHTML = '<p>Calculator not yet implemented</p>';
        }
        
        console.log('🧮 Loaded calculator:', calcType);
    }

    getBMICalculator() {
        return `
            <div class="calculator-form">
                <h4>BMI Calculator</h4>
                <div class="calc-input-group">
                    <label>Weight (kg):</label>
                    <input type="number" id="bmi-weight" placeholder="70" step="0.1">
                </div>
                <div class="calc-input-group">
                    <label>Height (cm):</label>
                    <input type="number" id="bmi-height" placeholder="175" step="0.1">
                </div>
                <button onclick="window.quizApp.calculateBMI()">Calculate</button>
                <div id="bmi-result" class="calc-result"></div>
                <div class="calc-reference">
                    <small>
                        <strong>BMI Categories:</strong><br>
                        Underweight: &lt;18.5<br>
                        Normal: 18.5-24.9<br>
                        Overweight: 25-29.9<br>
                        Obese: ≥30
                    </small>
                </div>
            </div>
        `;
    }

    calculateBMI() {
        const weight = parseFloat(document.getElementById('bmi-weight').value);
        const height = parseFloat(document.getElementById('bmi-height').value) / 100; // Convert cm to m
        
        if (!weight || !height) {
            document.getElementById('bmi-result').innerHTML = '<p class="error">Please enter valid weight and height</p>';
            return;
        }
        
        const bmi = weight / (height * height);
        let category = '';
        let color = '';
        
        if (bmi < 18.5) {
            category = 'Underweight';
            color = '#2196F3';
        } else if (bmi < 25) {
            category = 'Normal weight';
            color = '#4CAF50';
        } else if (bmi < 30) {
            category = 'Overweight';
            color = '#FF9800';
        } else {
            category = 'Obese';
            color = '#F44336';
        }
        
        document.getElementById('bmi-result').innerHTML = `
            <div class="bmi-result-display">
                <div class="bmi-value" style="color: ${color}">
                    <strong>${bmi.toFixed(1)} kg/m²</strong>
                </div>
                <div class="bmi-category" style="color: ${color}">
                    ${category}
                </div>
            </div>
        `;
    }

    getCHADS2VAScCalculator() {
        return `
            <div class="calculator-form">
                <h4>CHA₂DS₂-VASc Score</h4>
                <p><small>Stroke risk assessment in atrial fibrillation</small></p>
                
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="chads-chf"> Congestive heart failure (+1)</label>
                    <label><input type="checkbox" id="chads-htn"> Hypertension (+1)</label>
                    <label><input type="checkbox" id="chads-age75"> Age ≥75 years (+2)</label>
                    <label><input type="checkbox" id="chads-diabetes"> Diabetes mellitus (+1)</label>
                    <label><input type="checkbox" id="chads-stroke"> Stroke/TIA/thromboembolism (+2)</label>
                    <label><input type="checkbox" id="chads-vascular"> Vascular disease (+1)</label>
                    <label><input type="checkbox" id="chads-age65"> Age 65-74 years (+1)</label>
                    <label><input type="checkbox" id="chads-female"> Female sex (+1)</label>
                </div>
                
                <button onclick="window.quizApp.calculateCHADS2VASc()">Calculate Score</button>
                <div id="chads-result" class="calc-result"></div>
            </div>
        `;
    }

    calculateCHADS2VASc() {
        let score = 0;
        
        if (document.getElementById('chads-chf').checked) score += 1;
        if (document.getElementById('chads-htn').checked) score += 1;
        if (document.getElementById('chads-age75').checked) score += 2;
        if (document.getElementById('chads-diabetes').checked) score += 1;
        if (document.getElementById('chads-stroke').checked) score += 2;
        if (document.getElementById('chads-vascular').checked) score += 1;
        if (document.getElementById('chads-age65').checked) score += 1;
        if (document.getElementById('chads-female').checked) score += 1;
        
        let risk = '';
        let recommendation = '';
        let color = '';
        
        if (score === 0) {
            risk = 'Low risk (0.2%/year)';
            recommendation = 'No anticoagulation';
            color = '#4CAF50';
        } else if (score === 1) {
            risk = 'Low-moderate risk (0.6%/year)';
            recommendation = 'Consider anticoagulation';
            color = '#FF9800';
        } else {
            risk = 'High risk (≥2.2%/year)';
            recommendation = 'Anticoagulation recommended';
            color = '#F44336';
        }
        
        document.getElementById('chads-result').innerHTML = `
            <div class="score-result">
                <div class="score-value" style="color: ${color}">
                    Score: <strong>${score}</strong>
                </div>
                <div class="score-risk">${risk}</div>
                <div class="score-recommendation" style="color: ${color}">
                    <strong>${recommendation}</strong>
                </div>
            </div>
        `;
    }

    getHASBLEDCalculator() {
        return `
            <div class="calculator-form">
                <h4>HAS-BLED Score</h4>
                <p><small>Bleeding risk assessment in atrial fibrillation</small></p>
                
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="hasbled-htn"> Hypertension (+1)</label>
                    <label><input type="checkbox" id="hasbled-renal"> Abnormal renal function (+1)</label>
                    <label><input type="checkbox" id="hasbled-liver"> Abnormal liver function (+1)</label>
                    <label><input type="checkbox" id="hasbled-stroke"> Stroke history (+1)</label>
                    <label><input type="checkbox" id="hasbled-bleeding"> Prior bleeding/predisposition (+1)</label>
                    <label><input type="checkbox" id="hasbled-labile"> Labile INR (+1)</label>
                    <label><input type="checkbox" id="hasbled-elderly"> Elderly (>65 years) (+1)</label>
                    <label><input type="checkbox" id="hasbled-drugs"> Drugs/alcohol (+1)</label>
                </div>
                
                <button onclick="window.quizApp.calculateHASBLED()">Calculate Score</button>
                <div id="hasbled-result" class="calc-result"></div>
            </div>
        `;
    }

    calculateHASBLED() {
        let score = 0;
        
        if (document.getElementById('hasbled-htn').checked) score += 1;
        if (document.getElementById('hasbled-renal').checked) score += 1;
        if (document.getElementById('hasbled-liver').checked) score += 1;
        if (document.getElementById('hasbled-stroke').checked) score += 1;
        if (document.getElementById('hasbled-bleeding').checked) score += 1;
        if (document.getElementById('hasbled-labile').checked) score += 1;
        if (document.getElementById('hasbled-elderly').checked) score += 1;
        if (document.getElementById('hasbled-drugs').checked) score += 1;
        
        let risk = '';
        let recommendation = '';
        let color = '';
        
        if (score <= 2) {
            risk = 'Low bleeding risk';
            recommendation = 'Anticoagulation usually safe';
            color = '#4CAF50';
        } else {
            risk = 'High bleeding risk';
            recommendation = 'Caution with anticoagulation - consider modifiable risk factors';
            color = '#F44336';
        }
        
        document.getElementById('hasbled-result').innerHTML = `
            <div class="score-result">
                <div class="score-value" style="color: ${color}">
                    Score: <strong>${score}</strong>
                </div>
                <div class="score-risk">${risk}</div>
                <div class="score-recommendation" style="color: ${color}">
                    <strong>${recommendation}</strong>
                </div>
            </div>
        `;
    }

    getGCSCalculator() {
        return `
            <div class="calculator-form">
                <h4>Glasgow Coma Scale</h4>
                
                <div class="calc-select-group">
                    <label>Eye Opening:</label>
                    <select id="gcs-eye">
                        <option value="1">No eye opening (1)</option>
                        <option value="2">Eye opening to pain (2)</option>
                        <option value="3">Eye opening to verbal command (3)</option>
                        <option value="4" selected>Eyes open spontaneously (4)</option>
                    </select>
                </div>
                
                <div class="calc-select-group">
                    <label>Verbal Response:</label>
                    <select id="gcs-verbal">
                        <option value="1">No verbal response (1)</option>
                        <option value="2">Incomprehensible sounds (2)</option>
                        <option value="3">Inappropriate words (3)</option>
                        <option value="4">Confused (4)</option>
                        <option value="5" selected>Oriented (5)</option>
                    </select>
                </div>
                
                <div class="calc-select-group">
                    <label>Motor Response:</label>
                    <select id="gcs-motor">
                        <option value="1">No motor response (1)</option>
                        <option value="2">Extension to pain (2)</option>
                        <option value="3">Flexion to pain (3)</option>
                        <option value="4">Withdrawal from pain (4)</option>
                        <option value="5">Localizes pain (5)</option>
                        <option value="6" selected>Obeys commands (6)</option>
                    </select>
                </div>
                
                <button onclick="window.quizApp.calculateGCS()">Calculate GCS</button>
                <div id="gcs-result" class="calc-result"></div>
            </div>
        `;
    }

    calculateGCS() {
        const eye = parseInt(document.getElementById('gcs-eye').value);
        const verbal = parseInt(document.getElementById('gcs-verbal').value);
        const motor = parseInt(document.getElementById('gcs-motor').value);
        
        const total = eye + verbal + motor;
        
        let severity = '';
        let color = '';
        
        if (total <= 8) {
            severity = 'Severe brain injury';
            color = '#F44336';
        } else if (total <= 12) {
            severity = 'Moderate brain injury';
            color = '#FF9800';
        } else {
            severity = 'Mild brain injury';
            color = '#4CAF50';
        }
        
        document.getElementById('gcs-result').innerHTML = `
            <div class="gcs-result-display">
                <div class="gcs-breakdown">
                    Eye: ${eye} + Verbal: ${verbal} + Motor: ${motor}
                </div>
                <div class="gcs-total" style="color: ${color}">
                    Total GCS: <strong>${total}/15</strong>
                </div>
                <div class="gcs-severity" style="color: ${color}">
                    ${severity}
                </div>
            </div>
        `;
    }

    getAPACHECalculator() {
        return `
            <div class="calculator-form">
                <h4>APACHE II Score</h4>
                <p><small>Simplified version - ICU mortality prediction</small></p>
                <p><em>Note: This is a complex score requiring multiple physiologic variables. This is a basic implementation.</em></p>
                
                <div class="calc-input-group">
                    <label>Age:</label>
                    <input type="number" id="apache-age" placeholder="65" min="0" max="120">
                </div>
                
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="apache-chronic"> Chronic health problems</label>
                    <label><input type="checkbox" id="apache-emergency"> Emergency surgery</label>
                </div>
                
                <button onclick="window.quizApp.calculateAPACHE()">Estimate Score</button>
                <div id="apache-result" class="calc-result"></div>
                
                <div class="calc-reference">
                    <small><strong>Note:</strong> Complete APACHE II requires 12 physiologic variables, chronic health evaluation, and surgical status. This is a simplified version for educational purposes.</small>
                </div>
            </div>
        `;
    }

    calculateAPACHE() {
        const age = parseInt(document.getElementById('apache-age').value);
        
        if (!age) {
            document.getElementById('apache-result').innerHTML = '<p class="error">Please enter age</p>';
            return;
        }
        
        let score = 0;
        
        // Age points
        if (age >= 75) score += 6;
        else if (age >= 65) score += 5;
        else if (age >= 55) score += 3;
        else if (age >= 45) score += 2;
        
        // Chronic health
        if (document.getElementById('apache-chronic').checked) score += 5;
        
        // Emergency surgery
        if (document.getElementById('apache-emergency').checked) score += 5;
        
        document.getElementById('apache-result').innerHTML = `
            <div class="apache-result-display">
                <div class="apache-partial">
                    Partial Score: <strong>${score}</strong>
                </div>
                <div class="apache-note">
                    <small>Complete APACHE II score requires additional physiologic variables (temperature, MAP, heart rate, respiratory rate, oxygenation, arterial pH, sodium, potassium, creatinine, hematocrit, WBC count, GCS)</small>
                </div>
            </div>
        `;
    }

    getWellsCalculator() {
        return `
            <div class="calculator-form">
                <h4>Wells Score for PE</h4>
                <p><small>Pulmonary embolism clinical probability</small></p>
                
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="wells-clinical"> Clinical signs of DVT (+3)</label>
                    <label><input type="checkbox" id="wells-likely"> PE as likely as alternative diagnosis (+3)</label>
                    <label><input type="checkbox" id="wells-hr"> Heart rate >100 (+1.5)</label>
                    <label><input type="checkbox" id="wells-immobility"> Immobilization/surgery in past 4 weeks (+1.5)</label>
                    <label><input type="checkbox" id="wells-previous"> Previous DVT/PE (+1.5)</label>
                    <label><input type="checkbox" id="wells-hemoptysis"> Hemoptysis (+1)</label>
                    <label><input type="checkbox" id="wells-malignancy"> Malignancy (+1)</label>
                </div>
                
                <button onclick="window.quizApp.calculateWells()">Calculate Score</button>
                <div id="wells-result" class="calc-result"></div>
            </div>
        `;
    }

    calculateWells() {
        let score = 0;
        
        if (document.getElementById('wells-clinical').checked) score += 3;
        if (document.getElementById('wells-likely').checked) score += 3;
        if (document.getElementById('wells-hr').checked) score += 1.5;
        if (document.getElementById('wells-immobility').checked) score += 1.5;
        if (document.getElementById('wells-previous').checked) score += 1.5;
        if (document.getElementById('wells-hemoptysis').checked) score += 1;
        if (document.getElementById('wells-malignancy').checked) score += 1;
        
        let probability = '';
        let recommendation = '';
        let color = '';
        
        if (score <= 4) {
            probability = 'Low probability (≤4)';
            recommendation = 'D-dimer; if negative, PE unlikely';
            color = '#4CAF50';
        } else if (score <= 6) {
            probability = 'Moderate probability (4-6)';
            recommendation = 'Consider CT pulmonary angiogram';
            color = '#FF9800';
        } else {
            probability = 'High probability (>6)';
            recommendation = 'CT pulmonary angiogram recommended';
            color = '#F44336';
        }
        
        document.getElementById('wells-result').innerHTML = `
            <div class="wells-result-display">
                <div class="wells-score" style="color: ${color}">
                    Score: <strong>${score}</strong>
                </div>
                <div class="wells-probability">${probability}</div>
                <div class="wells-recommendation" style="color: ${color}">
                    <strong>${recommendation}</strong>
                </div>
            </div>
        `;
    }

    // Drug Reference Functions
    loadDrugReference() {
        const drugDatabase = {
            'acetaminophen': {
                name: 'Acetaminophen (Paracetamol)',
                class: 'Analgesic, Antipyretic',
                mechanism: 'Inhibits COX enzymes centrally',
                dosing: 'Adults: 325-1000mg q4-6h (max 4g/day). Pediatric: 10-15mg/kg q4-6h',
                contraindications: 'Severe hepatic impairment, hypersensitivity',
                interactions: 'Warfarin (↑ INR), chronic alcohol use (↑ hepatotoxicity)',
                monitoring: 'Liver function with prolonged use or overdose',
                pregnancy: 'Category B - Safe in pregnancy'
            },
            'amoxicillin': {
                name: 'Amoxicillin',
                class: 'Beta-lactam antibiotic (Penicillin)',
                mechanism: 'Inhibits bacterial cell wall synthesis',
                dosing: 'Adults: 500mg q8h or 875mg q12h. Pediatric: 25-50mg/kg/day divided q8-12h',
                contraindications: 'Penicillin allergy, severe renal impairment',
                interactions: 'Methotrexate (↑ toxicity), oral contraceptives (↓ efficacy)',
                monitoring: 'Signs of allergic reaction, C. diff colitis',
                pregnancy: 'Category B - Safe in pregnancy'
            },
            'atorvastatin': {
                name: 'Atorvastatin',
                class: 'HMG-CoA reductase inhibitor (Statin)',
                mechanism: 'Inhibits cholesterol synthesis',
                dosing: 'Adults: 10-80mg daily in evening',
                contraindications: 'Active liver disease, pregnancy, breastfeeding',
                interactions: 'Warfarin (↑ INR), cyclosporine (↑ statin levels)',
                monitoring: 'Liver enzymes, CK, lipid panel',
                pregnancy: 'Category X - Contraindicated'
            },
            'metformin': {
                name: 'Metformin',
                class: 'Biguanide antidiabetic',
                mechanism: 'Decreases hepatic glucose production, improves insulin sensitivity',
                dosing: 'Adults: Start 500mg BID, max 2550mg/day divided',
                contraindications: 'eGFR <30, acute heart failure, severe liver disease',
                interactions: 'Contrast dye (hold 48h), alcohol (↑ lactic acidosis risk)',
                monitoring: 'Renal function, B12 levels, lactic acid',
                pregnancy: 'Category B - Generally safe'
            },
            'lisinopril': {
                name: 'Lisinopril',
                class: 'ACE inhibitor',
                mechanism: 'Inhibits angiotensin-converting enzyme',
                dosing: 'Adults: 5-40mg daily',
                contraindications: 'Pregnancy, bilateral renal artery stenosis, angioedema history',
                interactions: 'NSAIDs (↓ efficacy), potassium supplements (hyperkalemia)',
                monitoring: 'Blood pressure, renal function, potassium',
                pregnancy: 'Category D - Contraindicated'
            },
            'levothyroxine': {
                name: 'Levothyroxine',
                class: 'Thyroid hormone replacement',
                mechanism: 'Synthetic T4 hormone replacement',
                dosing: 'Adults: 1.6mcg/kg/day, adjust based on TSH',
                contraindications: 'Untreated adrenal insufficiency, acute MI',
                interactions: 'Iron, calcium (↓ absorption), warfarin (↑ effect)',
                monitoring: 'TSH, T4, cardiac symptoms',
                pregnancy: 'Category A - Safe, may need dose increase'
            }
        };
        
        const container = document.getElementById('drug-reference-container');
        container.innerHTML = `
            <div class="search-container">
                <input type="text" id="drug-search" placeholder="Search medications...">
                <div id="drug-search-results"></div>
            </div>
            <div class="drug-categories">
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('all')">All Drugs</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('antibiotics')">Antibiotics</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('cardiovascular')">Cardiovascular</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('endocrine')">Endocrine</button>
            </div>
            <div id="drug-list"></div>
        `;
        
        const searchInput = document.getElementById('drug-search');
        searchInput.addEventListener('input', () => this.searchDrugs(drugDatabase));
        this.drugDatabase = drugDatabase;
        this.showDrugCategory('all');
    }

    searchDrugs(drugDatabase) {
        const query = document.getElementById('drug-search').value.toLowerCase();
        const resultsContainer = document.getElementById('drug-search-results');
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        const matches = Object.keys(drugDatabase).filter(drug => 
            drug.toLowerCase().includes(query) || 
            drugDatabase[drug].name.toLowerCase().includes(query) ||
            drugDatabase[drug].class.toLowerCase().includes(query)
        );
        
        if (matches.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No medications found</div>';
            return;
        }
        
        resultsContainer.innerHTML = matches.map(drug => `
            <div class="drug-result" onclick="window.quizApp.showDrugDetail('${drug}')">
                <div class="drug-name">${drugDatabase[drug].name}</div>
                <div class="drug-class">${drugDatabase[drug].class}</div>
            </div>
        `).join('');
    }
    
    showDrugCategory(category) {
        const drugDatabase = this.drugDatabase;
        const drugList = document.getElementById('drug-list');
        let drugs = Object.keys(drugDatabase);
        
        if (category === 'antibiotics') {
            drugs = drugs.filter(drug => drugDatabase[drug].class.toLowerCase().includes('antibiotic'));
        } else if (category === 'cardiovascular') {
            drugs = drugs.filter(drug => 
                drugDatabase[drug].class.toLowerCase().includes('statin') ||
                drugDatabase[drug].class.toLowerCase().includes('ace inhibitor')
            );
        } else if (category === 'endocrine') {
            drugs = drugs.filter(drug => 
                drugDatabase[drug].class.toLowerCase().includes('antidiabetic') ||
                drugDatabase[drug].class.toLowerCase().includes('thyroid')
            );
        }
        
        drugList.innerHTML = drugs.map(drug => `
            <div class="drug-card" onclick="window.quizApp.showDrugDetail('${drug}')">
                <div class="drug-name">${drugDatabase[drug].name}</div>
                <div class="drug-class">${drugDatabase[drug].class}</div>
            </div>
        `).join('');
    }
    
    showDrugDetail(drugKey) {
        const drug = this.drugDatabase[drugKey];
        const container = document.getElementById('drug-reference-container');
        
        container.innerHTML = `
            <button class="back-btn" onclick="window.quizApp.loadDrugReference()">← Back to Drug List</button>
            <div class="drug-detail">
                <h3>${drug.name}</h3>
                <div class="drug-info">
                    <div class="info-section">
                        <h4>Classification</h4>
                        <p>${drug.class}</p>
                    </div>
                    <div class="info-section">
                        <h4>Mechanism of Action</h4>
                        <p>${drug.mechanism}</p>
                    </div>
                    <div class="info-section">
                        <h4>Dosing</h4>
                        <p>${drug.dosing}</p>
                    </div>
                    <div class="info-section">
                        <h4>Contraindications</h4>
                        <p>${drug.contraindications}</p>
                    </div>
                    <div class="info-section">
                        <h4>Drug Interactions</h4>
                        <p>${drug.interactions}</p>
                    </div>
                    <div class="info-section">
                        <h4>Monitoring</h4>
                        <p>${drug.monitoring}</p>
                    </div>
                    <div class="info-section">
                        <h4>Pregnancy Category</h4>
                        <p>${drug.pregnancy}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Lab Values Functions
    loadLabValues() {
        const labDatabase = {
            'cbc': {
                name: 'Complete Blood Count (CBC)',
                values: {
                    'WBC': { normal: '4.5-11.0 × 10³/μL', low: 'Immunosuppression, viral infection', high: 'Infection, leukemia, stress' },
                    'RBC': { normal: 'M: 4.7-6.1, F: 4.2-5.4 × 10⁶/μL', low: 'Anemia, bleeding', high: 'Polycythemia, dehydration' },
                    'Hemoglobin': { normal: 'M: 14-18, F: 12-16 g/dL', low: 'Anemia, bleeding', high: 'Polycythemia, COPD' },
                    'Hematocrit': { normal: 'M: 42-52%, F: 37-47%', low: 'Anemia, overhydration', high: 'Dehydration, polycythemia' },
                    'Platelets': { normal: '150-450 × 10³/μL', low: 'Bleeding risk, ITP', high: 'Thrombocytosis, malignancy' }
                }
            },
            'bmp': {
                name: 'Basic Metabolic Panel (BMP)',
                values: {
                    'Glucose': { normal: '70-100 mg/dL (fasting)', low: 'Hypoglycemia, insulin excess', high: 'Diabetes, stress, steroids' },
                    'BUN': { normal: '7-20 mg/dL', low: 'Liver disease, malnutrition', high: 'Renal failure, dehydration' },
                    'Creatinine': { normal: 'M: 0.7-1.3, F: 0.6-1.1 mg/dL', low: 'Low muscle mass', high: 'Renal failure, dehydration' },
                    'Sodium': { normal: '136-145 mEq/L', low: 'Hyponatremia, SIADH', high: 'Dehydration, diabetes insipidus' },
                    'Potassium': { normal: '3.5-5.0 mEq/L', low: 'Diuretics, diarrhea', high: 'Renal failure, ACE inhibitors' },
                    'Chloride': { normal: '98-107 mEq/L', low: 'Vomiting, diuretics', high: 'Dehydration, hypernatremia' },
                    'CO2': { normal: '22-29 mEq/L', low: 'Metabolic acidosis', high: 'Metabolic alkalosis' }
                }
            },
            'lft': {
                name: 'Liver Function Tests (LFT)',
                values: {
                    'ALT': { normal: 'M: 10-40, F: 7-35 U/L', low: 'Rarely significant', high: 'Hepatitis, liver damage' },
                    'AST': { normal: 'M: 10-40, F: 9-32 U/L', low: 'Rarely significant', high: 'Liver/muscle damage, MI' },
                    'Alkaline Phosphatase': { normal: '44-147 U/L', low: 'Hypothyroidism', high: 'Liver disease, bone disease' },
                    'Total Bilirubin': { normal: '0.3-1.2 mg/dL', low: 'Rarely significant', high: 'Hemolysis, liver disease' },
                    'Albumin': { normal: '3.5-5.0 g/dL', low: 'Liver disease, malnutrition', high: 'Dehydration' },
                    'PT/INR': { normal: 'PT: 11-13 sec, INR: 0.8-1.1', low: 'Hypercoagulable state', high: 'Liver disease, warfarin' }
                }
            },
            'lipids': {
                name: 'Lipid Panel',
                values: {
                    'Total Cholesterol': { normal: '<200 mg/dL', low: 'Malnutrition, hyperthyroid', high: 'CAD risk, familial hypercholesterolemia' },
                    'LDL': { normal: '<100 mg/dL (optimal)', low: 'Over-treatment', high: 'CAD risk, diabetes' },
                    'HDL': { normal: 'M: >40, F: >50 mg/dL', low: 'CAD risk, metabolic syndrome', high: 'Cardioprotective' },
                    'Triglycerides': { normal: '<150 mg/dL', low: 'Malnutrition', high: 'Pancreatitis risk, diabetes' }
                }
            }
        };
        
        const container = document.getElementById('lab-values-container');
        container.innerHTML = `
            <div class="search-container">
                <input type="text" id="lab-search" placeholder="Search lab values...">
                <div id="lab-search-results"></div>
            </div>
            <div class="lab-categories">
                <button class="category-btn" onclick="window.quizApp.showLabCategory('all')">All Labs</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('cbc')">CBC</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('bmp')">Chemistry</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('lft')">Liver</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('lipids')">Lipids</button>
            </div>
            <div id="lab-list"></div>
        `;
        
        const searchInput = document.getElementById('lab-search');
        searchInput.addEventListener('input', () => this.searchLabValues(labDatabase));
        this.labDatabase = labDatabase;
        this.showLabCategory('all');
    }

    searchLabValues(labDatabase) {
        const query = document.getElementById('lab-search').value.toLowerCase();
        const resultsContainer = document.getElementById('lab-search-results');
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        const matches = [];
        Object.keys(labDatabase).forEach(panel => {
            if (labDatabase[panel].name.toLowerCase().includes(query)) {
                matches.push({ type: 'panel', key: panel, name: labDatabase[panel].name });
            }
            Object.keys(labDatabase[panel].values).forEach(test => {
                if (test.toLowerCase().includes(query)) {
                    matches.push({ type: 'test', panel: panel, key: test, name: test });
                }
            });
        });
        
        if (matches.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No lab values found</div>';
            return;
        }
        
        resultsContainer.innerHTML = matches.map(match => `
            <div class="lab-result" onclick="${match.type === 'panel' ? `window.quizApp.showLabPanel('${match.key}')` : `window.quizApp.showLabTest('${match.panel}', '${match.key}')`}">
                <div class="lab-name">${match.name}</div>
                <div class="lab-type">${match.type === 'panel' ? 'Lab Panel' : 'Individual Test'}</div>
            </div>
        `).join('');
    }
    
    showLabCategory(category) {
        const labDatabase = this.labDatabase;
        const labList = document.getElementById('lab-list');
        let panels = Object.keys(labDatabase);
        
        if (category !== 'all') {
            panels = panels.filter(panel => panel === category);
        }
        
        labList.innerHTML = panels.map(panel => `
            <div class="lab-card" onclick="window.quizApp.showLabPanel('${panel}')">
                <div class="lab-panel-name">${labDatabase[panel].name}</div>
                <div class="lab-test-count">${Object.keys(labDatabase[panel].values).length} tests</div>
            </div>
        `).join('');
    }
    
    showLabPanel(panelKey) {
        const panel = this.labDatabase[panelKey];
        const container = document.getElementById('lab-values-container');
        
        const testsHtml = Object.entries(panel.values).map(([test, data]) => `
            <div class="lab-test" onclick="window.quizApp.showLabTest('${panelKey}', '${test}')">
                <div class="test-name">${test}</div>
                <div class="test-normal">${data.normal}</div>
            </div>
        `).join('');
        
        container.innerHTML = `
            <button class="back-btn" onclick="window.quizApp.loadLabValues()">← Back to Lab Categories</button>
            <div class="lab-panel-detail">
                <h3>${panel.name}</h3>
                <div class="lab-tests">
                    ${testsHtml}
                </div>
            </div>
        `;
    }
    
    showLabTest(panelKey, testKey) {
        const test = this.labDatabase[panelKey].values[testKey];
        const container = document.getElementById('lab-values-container');
        
        container.innerHTML = `
            <button class="back-btn" onclick="window.quizApp.showLabPanel('${panelKey}')">← Back to ${this.labDatabase[panelKey].name}</button>
            <div class="lab-test-detail">
                <h3>${testKey}</h3>
                <div class="test-info">
                    <div class="info-section">
                        <h4>Normal Range</h4>
                        <p>${test.normal}</p>
                    </div>
                    <div class="info-section">
                        <h4>Low Values</h4>
                        <p>${test.low}</p>
                    </div>
                    <div class="info-section">
                        <h4>High Values</h4>
                        <p>${test.high}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Clinical Guidelines Functions  
    loadGuidelines() {
        const guidelinesDatabase = {
            'hypertension': {
                title: 'Hypertension Management (ACC/AHA 2017)',
                category: 'Cardiovascular',
                stages: {
                    'Normal': 'SBP <120 AND DBP <80 mmHg',
                    'Elevated': 'SBP 120-129 AND DBP <80 mmHg',
                    'Stage 1': 'SBP 130-139 OR DBP 80-89 mmHg',
                    'Stage 2': 'SBP ≥140 OR DBP ≥90 mmHg'
                },
                treatment: {
                    'Elevated': 'Lifestyle modifications only',
                    'Stage 1': 'Lifestyle + medication if CVD risk ≥10% or DM/CKD',
                    'Stage 2': 'Lifestyle + combination therapy (ACE-I/ARB + CCB or thiazide)'
                },
                lifestyle: 'Weight loss, DASH diet, sodium restriction (<2.3g/day), exercise, alcohol moderation'
            },
            'diabetes': {
                title: 'Type 2 Diabetes Management (ADA 2024)',
                category: 'Endocrine',
                targets: {
                    'HbA1c': '<7% (individualize 6.5-8%)',
                    'Preprandial glucose': '80-130 mg/dL',
                    'Postprandial glucose': '<180 mg/dL',
                    'Blood pressure': '<130/80 mmHg',
                    'LDL': '<100 mg/dL (<70 if CVD)'
                },
                firstLine: 'Metformin + lifestyle modifications',
                secondLine: 'Add SGLT2-i, GLP-1 RA, DPP-4i, insulin, or SU based on patient factors',
                cvd: 'SGLT2-i or GLP-1 RA with proven CV benefit if established CVD'
            },
            'copd': {
                title: 'COPD Management (GOLD 2023)',
                category: 'Pulmonary',
                stages: {
                    'GOLD 1': 'FEV1 ≥80% predicted',
                    'GOLD 2': 'FEV1 50-79% predicted',
                    'GOLD 3': 'FEV1 30-49% predicted',
                    'GOLD 4': 'FEV1 <30% predicted'
                },
                groups: {
                    'Group A': 'Low symptoms, low risk (mMRC 0-1, CAT <10, 0-1 exacerbation)',
                    'Group B': 'High symptoms, low risk (mMRC ≥2, CAT ≥10, 0-1 exacerbation)',
                    'Group E': 'Any symptoms, high risk (≥2 exacerbations or ≥1 hospitalization)'
                },
                treatment: {
                    'Group A': 'Bronchodilator (SABA or LABA or LAMA)',
                    'Group B': 'LABA + LAMA',
                    'Group E': 'LABA + LAMA ± ICS (if eosinophils >300 or frequent exacerbations)'
                }
            }
        };
        
        const container = document.getElementById('guidelines-container');
        container.innerHTML = `
            <div class="search-container">
                <input type="text" id="guidelines-search" placeholder="Search guidelines...">
                <div id="guidelines-search-results"></div>
            </div>
            <div class="guidelines-categories">
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('all')">All Guidelines</button>
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('cardiovascular')">Cardiovascular</button>
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('endocrine')">Endocrine</button>
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('pulmonary')">Pulmonary</button>
            </div>
            <div id="guidelines-list"></div>
        `;
        
        const searchInput = document.getElementById('guidelines-search');
        searchInput.addEventListener('input', () => this.searchGuidelines(guidelinesDatabase));
        this.guidelinesDatabase = guidelinesDatabase;
        this.showGuidelinesCategory('all');
    }

    searchGuidelines(guidelinesDatabase) {
        const query = document.getElementById('guidelines-search').value.toLowerCase();
        const resultsContainer = document.getElementById('guidelines-search-results');
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        const matches = Object.keys(guidelinesDatabase).filter(guideline => 
            guidelinesDatabase[guideline].title.toLowerCase().includes(query) ||
            guidelinesDatabase[guideline].category.toLowerCase().includes(query) ||
            guideline.toLowerCase().includes(query)
        );
        
        if (matches.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No guidelines found</div>';
            return;
        }
        
        resultsContainer.innerHTML = matches.map(guideline => `
            <div class="guideline-result" onclick="window.quizApp.showGuidelineDetail('${guideline}')">
                <div class="guideline-title">${guidelinesDatabase[guideline].title}</div>
                <div class="guideline-category">${guidelinesDatabase[guideline].category}</div>
            </div>
        `).join('');
    }
    
    showGuidelinesCategory(category) {
        const guidelinesDatabase = this.guidelinesDatabase;
        const guidelinesList = document.getElementById('guidelines-list');
        let guidelines = Object.keys(guidelinesDatabase);
        
        if (category !== 'all') {
            guidelines = guidelines.filter(guideline => 
                guidelinesDatabase[guideline].category.toLowerCase() === category
            );
        }
        
        guidelinesList.innerHTML = guidelines.map(guideline => `
            <div class="guideline-card" onclick="window.quizApp.showGuidelineDetail('${guideline}')">
                <div class="guideline-title">${guidelinesDatabase[guideline].title}</div>
                <div class="guideline-category">${guidelinesDatabase[guideline].category}</div>
            </div>
        `).join('');
    }
    
    showGuidelineDetail(guidelineKey) {
        const guideline = this.guidelinesDatabase[guidelineKey];
        const container = document.getElementById('guidelines-container');
        
        let contentHtml = `
            <button class="back-btn" onclick="window.quizApp.loadGuidelines()">← Back to Guidelines</button>
            <div class="guideline-detail">
                <h3>${guideline.title}</h3>
        `;
        
        if (guideline.stages) {
            contentHtml += `
                <div class="info-section">
                    <h4>Stages/Classification</h4>
                    ${Object.entries(guideline.stages).map(([stage, description]) => `
                        <p><strong>${stage}:</strong> ${description}</p>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.groups) {
            contentHtml += `
                <div class="info-section">
                    <h4>Patient Groups</h4>
                    ${Object.entries(guideline.groups).map(([group, description]) => `
                        <p><strong>${group}:</strong> ${description}</p>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.targets) {
            contentHtml += `
                <div class="info-section">
                    <h4>Treatment Targets</h4>
                    ${Object.entries(guideline.targets).map(([target, value]) => `
                        <p><strong>${target}:</strong> ${value}</p>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.treatment) {
            contentHtml += `
                <div class="info-section">
                    <h4>Treatment Recommendations</h4>
                    ${Object.entries(guideline.treatment).map(([stage, treatment]) => `
                        <p><strong>${stage}:</strong> ${treatment}</p>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.firstLine) {
            contentHtml += `
                <div class="info-section">
                    <h4>First-line Therapy</h4>
                    <p>${guideline.firstLine}</p>
                </div>
            `;
        }
        
        if (guideline.secondLine) {
            contentHtml += `
                <div class="info-section">
                    <h4>Second-line Options</h4>
                    <p>${guideline.secondLine}</p>
                </div>
            `;
        }
        
        if (guideline.lifestyle) {
            contentHtml += `
                <div class="info-section">
                    <h4>Lifestyle Modifications</h4>
                    <p>${guideline.lifestyle}</p>
                </div>
            `;
        }
        
        contentHtml += `</div>`;
        container.innerHTML = contentHtml;
    }

    // Differential Diagnosis Functions
    loadDifferentialDx() {
        const ddxDatabase = {
            'chest-pain': {
                title: 'Chest Pain',
                category: 'Cardiovascular/Pulmonary',
                presentations: {
                    'Acute coronary syndrome': {
                        features: 'Crushing, substernal, radiates to arm/jaw, diaphoresis, dyspnea',
                        tests: 'ECG, troponins, CXR',
                        urgency: 'Emergency'
                    },
                    'Pulmonary embolism': {
                        features: 'Sudden onset, pleuritic, dyspnea, tachycardia, risk factors',
                        tests: 'Wells score, D-dimer, CTPA, V/Q scan',
                        urgency: 'Emergency'
                    },
                    'Pneumothorax': {
                        features: 'Sudden onset, pleuritic, dyspnea, decreased breath sounds',
                        tests: 'CXR, CT chest',
                        urgency: 'Urgent'
                    },
                    'Aortic dissection': {
                        features: 'Tearing, severe, radiates to back, pulse deficits',
                        tests: 'CTA chest, TEE, MRI',
                        urgency: 'Emergency'
                    },
                    'GERD': {
                        features: 'Burning, postprandial, positional, antacid relief',
                        tests: 'Clinical, PPI trial, EGD if alarming features',
                        urgency: 'Non-urgent'
                    },
                    'Costochondritis': {
                        features: 'Sharp, localized, reproducible with palpation',
                        tests: 'Clinical diagnosis, rule out cardiac causes',
                        urgency: 'Non-urgent'
                    }
                }
            },
            'shortness-of-breath': {
                title: 'Shortness of Breath (Dyspnea)',
                category: 'Pulmonary/Cardiovascular',
                presentations: {
                    'Heart failure': {
                        features: 'Exertional dyspnea, orthopnea, PND, edema, JVD',
                        tests: 'BNP/NT-proBNP, echo, CXR, ECG',
                        urgency: 'Urgent'
                    },
                    'Asthma exacerbation': {
                        features: 'Wheezing, cough, chest tightness, trigger exposure',
                        tests: 'Peak flow, ABG if severe, CXR',
                        urgency: 'Urgent'
                    },
                    'COPD exacerbation': {
                        features: 'Increased dyspnea, cough, sputum production, smoking history',
                        tests: 'ABG, CXR, sputum culture',
                        urgency: 'Urgent'
                    },
                    'Pneumonia': {
                        features: 'Fever, cough, purulent sputum, pleuritic pain',
                        tests: 'CXR, CBC, blood cultures, sputum culture',
                        urgency: 'Urgent'
                    },
                    'Anxiety/Panic': {
                        features: 'Acute onset, palpitations, diaphoresis, sense of doom',
                        tests: 'Rule out organic causes first',
                        urgency: 'Non-urgent'
                    }
                }
            },
            'abdominal-pain': {
                title: 'Abdominal Pain',
                category: 'Gastroenterology/Surgery',
                presentations: {
                    'Appendicitis': {
                        features: 'Periumbilical → RLQ pain, fever, nausea, McBurney point',
                        tests: 'CBC, CT abdomen, ultrasound',
                        urgency: 'Emergency'
                    },
                    'Cholecystitis': {
                        features: 'RUQ pain, Murphy sign, fat intolerance, fever',
                        tests: 'Ultrasound, HIDA scan, LFTs',
                        urgency: 'Urgent'
                    },
                    'Pancreatitis': {
                        features: 'Epigastric pain radiating to back, nausea, vomiting',
                        tests: 'Lipase, amylase, CT abdomen',
                        urgency: 'Urgent'
                    },
                    'Bowel obstruction': {
                        features: 'Crampy pain, nausea, vomiting, distension, constipation',
                        tests: 'CT abdomen, abdominal X-ray',
                        urgency: 'Emergency'
                    },
                    'Gastroenteritis': {
                        features: 'Crampy pain, diarrhea, nausea, vomiting',
                        tests: 'Clinical, stool studies if severe',
                        urgency: 'Non-urgent'
                    }
                }
            }
        };
        
        const container = document.getElementById('differential-dx-container');
        container.innerHTML = `
            <div class="search-container">
                <input type="text" id="ddx-search" placeholder="Search symptoms or diagnoses...">
                <div id="ddx-search-results"></div>
            </div>
            <div class="ddx-categories">
                <button class="category-btn" onclick="window.quizApp.showDdxCategory('all')">All Symptoms</button>
                <button class="category-btn" onclick="window.quizApp.showDdxCategory('cardiovascular')">CV/Pulm</button>
                <button class="category-btn" onclick="window.quizApp.showDdxCategory('gastroenterology')">GI/Surgery</button>
            </div>
            <div id="ddx-list"></div>
        `;
        
        const searchInput = document.getElementById('ddx-search');
        searchInput.addEventListener('input', () => this.searchDdx(ddxDatabase));
        this.ddxDatabase = ddxDatabase;
        this.showDdxCategory('all');
    }

    searchDdx(ddxDatabase) {
        const query = document.getElementById('ddx-search').value.toLowerCase();
        const resultsContainer = document.getElementById('ddx-search-results');
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        const matches = [];
        Object.keys(ddxDatabase).forEach(symptom => {
            if (ddxDatabase[symptom].title.toLowerCase().includes(query) ||
                ddxDatabase[symptom].category.toLowerCase().includes(query)) {
                matches.push({ type: 'symptom', key: symptom, name: ddxDatabase[symptom].title });
            }
            Object.keys(ddxDatabase[symptom].presentations).forEach(dx => {
                if (dx.toLowerCase().includes(query)) {
                    matches.push({ type: 'diagnosis', symptom: symptom, key: dx, name: dx });
                }
            });
        });
        
        if (matches.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
            return;
        }
        
        resultsContainer.innerHTML = matches.map(match => `
            <div class="ddx-result" onclick="${match.type === 'symptom' ? `window.quizApp.showDdxDetail('${match.key}')` : `window.quizApp.showDiagnosisDetail('${match.symptom}', '${match.key}')`}">
                <div class="ddx-name">${match.name}</div>
                <div class="ddx-type">${match.type === 'symptom' ? 'Symptom Complex' : 'Diagnosis'}</div>
            </div>
        `).join('');
    }
    
    showDdxCategory(category) {
        const ddxDatabase = this.ddxDatabase;
        const ddxList = document.getElementById('ddx-list');
        let symptoms = Object.keys(ddxDatabase);
        
        if (category !== 'all') {
            symptoms = symptoms.filter(symptom => 
                ddxDatabase[symptom].category.toLowerCase().includes(category)
            );
        }
        
        ddxList.innerHTML = symptoms.map(symptom => `
            <div class="ddx-card" onclick="window.quizApp.showDdxDetail('${symptom}')">
                <div class="ddx-title">${ddxDatabase[symptom].title}</div>
                <div class="ddx-category">${ddxDatabase[symptom].category}</div>
                <div class="ddx-count">${Object.keys(ddxDatabase[symptom].presentations).length} differentials</div>
            </div>
        `).join('');
    }
    
    showDdxDetail(symptomKey) {
        const symptom = this.ddxDatabase[symptomKey];
        const container = document.getElementById('differential-dx-container');
        
        const presentationsHtml = Object.entries(symptom.presentations).map(([dx, data]) => `
            <div class="ddx-item ${data.urgency.toLowerCase()}" onclick="window.quizApp.showDiagnosisDetail('${symptomKey}', '${dx}')">
                <div class="ddx-diagnosis">${dx}</div>
                <div class="ddx-urgency ${data.urgency.toLowerCase()}">${data.urgency}</div>
                <div class="ddx-features">${data.features}</div>
            </div>
        `).join('');
        
        container.innerHTML = `
            <button class="back-btn" onclick="window.quizApp.loadDifferentialDx()">← Back to Symptoms</button>
            <div class="ddx-detail">
                <h3>${symptom.title}</h3>
                <p class="ddx-category">${symptom.category}</p>
                <h4>Differential Diagnoses:</h4>
                <div class="ddx-presentations">
                    ${presentationsHtml}
                </div>
            </div>
        `;
    }
    
    showDiagnosisDetail(symptomKey, dxKey) {
        const diagnosis = this.ddxDatabase[symptomKey].presentations[dxKey];
        const container = document.getElementById('differential-dx-container');
        
        container.innerHTML = `
            <button class="back-btn" onclick="window.quizApp.showDdxDetail('${symptomKey}')">← Back to ${this.ddxDatabase[symptomKey].title}</button>
            <div class="diagnosis-detail">
                <h3>${dxKey}</h3>
                <div class="diagnosis-info">
                    <div class="info-section">
                        <h4>Clinical Features</h4>
                        <p>${diagnosis.features}</p>
                    </div>
                    <div class="info-section">
                        <h4>Diagnostic Tests</h4>
                        <p>${diagnosis.tests}</p>
                    </div>
                    <div class="info-section">
                        <h4>Urgency Level</h4>
                        <p class="urgency-level ${diagnosis.urgency.toLowerCase()}">${diagnosis.urgency}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Override switchMedicalTool to load content
    switchMedicalTool(toolType) {
        const toolPanels = document.querySelectorAll('.tool-panel');
        
        // Hide all panels
        toolPanels.forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Show selected panel
        const targetPanel = document.getElementById(`${toolType}-panel`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
        
        // Load content for the selected tool
        switch(toolType) {
            case 'drug-reference':
                this.loadDrugReference();
                break;
            case 'lab-values':
                this.loadLabValues();
                break;
            case 'guidelines':
                this.loadGuidelines();
                break;
            case 'differential-dx':
                this.loadDifferentialDx();
                break;
        }
        
        console.log('🩺 Switched to tool:', toolType);
    }

    setFontSize(size) {
        this.fontSize = size;
        localStorage.setItem('fontSize', size);
        
        // Apply font size CSS
        const fontSizeMap = {
            'small': '0.85',
            'medium': '1.0',
            'large': '1.2',
            'xlarge': '1.4'
        };
        
        const multiplier = fontSizeMap[size] || '1.0';
        
        // Apply scaling to root element for rem-based sizing
        document.documentElement.style.fontSize = `${16 * parseFloat(multiplier)}px`;
        
        // Update active button
        document.querySelectorAll('.font-size-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.size === size) {
                btn.classList.add('active');
                btn.style.backgroundColor = '#007AFF';
                btn.style.color = 'white';
            } else {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = '#007AFF';
            }
        });
        
        console.log(`Font size set to ${size} (${multiplier}x)`);
    }

    addFontSizeControls() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            // Remove existing font controls if present
            const existingControls = document.querySelector('.font-controls');
            if (existingControls) {
                existingControls.remove();
            }
            
            const fontControls = document.createElement('div');
            fontControls.className = 'font-controls';
            fontControls.innerHTML = `
                <button class="font-size-btn" data-size="small" title="Small Text" style="background: transparent; border: 1px solid #007AFF; color: #007AFF; padding: 4px 6px; border-radius: 4px; font-size: 9px; cursor: pointer; font-weight: bold; min-width: 20px;">A</button>
                <button class="font-size-btn" data-size="medium" title="Medium Text" style="background: transparent; border: 1px solid #007AFF; color: #007AFF; padding: 4px 6px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: bold; min-width: 20px;">A</button>
                <button class="font-size-btn" data-size="large" title="Large Text" style="background: transparent; border: 1px solid #007AFF; color: #007AFF; padding: 4px 6px; border-radius: 4px; font-size: 13px; cursor: pointer; font-weight: bold; min-width: 20px;">A</button>
                <button class="font-size-btn" data-size="xlarge" title="Extra Large Text" style="background: transparent; border: 1px solid #007AFF; color: #007AFF; padding: 4px 6px; border-radius: 4px; font-size: 15px; cursor: pointer; font-weight: bold; min-width: 20px;">A</button>
            `;
            
            // Add event listeners
            fontControls.addEventListener('click', (e) => {
                if (e.target.classList.contains('font-size-btn')) {
                    console.log(`Font size button clicked: ${e.target.dataset.size}`);
                    this.setFontSize(e.target.dataset.size);
                }
            });
            
            navbar.appendChild(fontControls);
            
            // Set initial state
            this.setFontSize(this.fontSize);
            console.log('Font size controls added to navbar');
        } else {
            console.log('Navbar not found for font controls, retrying in 100ms');
            setTimeout(() => this.addFontSizeControls(), 100);
        }
    }
    
    // Scroll to top functionality
    scrollToTop() {
        // Smooth scroll to top of the page
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
        
        // Also scroll the main container if it exists
        const container = document.querySelector('.container');
        if (container) {
            container.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
            });
        }
        
        // Scroll the quiz screen container specifically
        const quizScreen = document.getElementById('quizScreen');
        if (quizScreen) {
            quizScreen.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
            });
        }
        
        console.log('Scrolled to top');
    }
}

// Global functions for image viewing with pinch zoom
function openImageModal(imageUrl, altText) {
    // Remove existing modal if any
    const existingModal = document.getElementById('imageModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Handle case where imageUrl might be a filename that needs to be resolved
    let actualUrl = imageUrl;
    
    // If it's not a data URL or http URL, try to find it in the document
    if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
        // Look for an image with this filename in the document
        const images = document.querySelectorAll('img');
        for (let img of images) {
            if (img.src.includes(imageUrl) || img.alt === imageUrl) {
                actualUrl = img.src;
                break;
            }
        }
        
        // If still not found, show error
        if (actualUrl === imageUrl && !imageUrl.startsWith('data:')) {
            console.warn('Image not found:', imageUrl);
            alert('Image not found: ' + imageUrl);
            return;
        }
    }
    
    // Create modal with zoom container
    const modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.className = 'image-modal';
    modal.innerHTML = `
        <span class="image-modal-close" onclick="closeImageModal()">&times;</span>
        <div class="image-zoom-container">
            <img src="${actualUrl}" alt="${altText}" loading="lazy" class="zoomable-image">
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initialize pinch zoom functionality
    const img = modal.querySelector('.zoomable-image');
    const container = modal.querySelector('.image-zoom-container');
    initPinchZoom(img, container);
    
    // Close modal when clicking on background (but not on image)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeImageModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', handleEscapeKey);
}

function initPinchZoom(img, container) {
    let scale = 1;
    let startDistance = 0;
    let startScale = 1;
    let translateX = 0;
    let translateY = 0;
    let startTranslateX = 0;
    let startTranslateY = 0;
    let isDragging = false;
    let lastTouchTime = 0;
    
    // Touch event handlers for pinch zoom and pan
    container.addEventListener('touchstart', (e) => {
        e.preventDefault();
        
        if (e.touches.length === 2) {
            // Pinch gesture
            isDragging = false;
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            startDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            startScale = scale;
        } else if (e.touches.length === 1 && scale > 1) {
            // Pan gesture (only when zoomed in)
            isDragging = true;
            const touch = e.touches[0];
            startTranslateX = translateX;
            startTranslateY = translateY;
            container.dataset.startX = touch.clientX;
            container.dataset.startY = touch.clientY;
        }
        
        // Double tap to zoom
        const currentTime = new Date().getTime();
        if (currentTime - lastTouchTime < 300 && e.touches.length === 1) {
            if (scale === 1) {
                // Zoom in to 2x
                scale = 2;
                translateX = 0;
                translateY = 0;
            } else {
                // Reset zoom
                scale = 1;
                translateX = 0;
                translateY = 0;
            }
            updateTransform();
        }
        lastTouchTime = currentTime;
    }, { passive: false });
    
    container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        
        if (e.touches.length === 2 && startDistance > 0) {
            // Pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            scale = startScale * (currentDistance / startDistance);
            scale = Math.max(1, Math.min(scale, 4)); // Limit zoom between 1x and 4x
            
            // Reset translation when zooming out to 1x
            if (scale === 1) {
                translateX = 0;
                translateY = 0;
            }
            
            updateTransform();
        } else if (e.touches.length === 1 && isDragging && scale > 1) {
            // Pan when zoomed in
            const touch = e.touches[0];
            const deltaX = touch.clientX - parseFloat(container.dataset.startX);
            const deltaY = touch.clientY - parseFloat(container.dataset.startY);
            
            translateX = startTranslateX + deltaX;
            translateY = startTranslateY + deltaY;
            
            // Limit panning to keep image bounds reasonable
            const maxTranslate = (scale - 1) * 150;
            translateX = Math.max(-maxTranslate, Math.min(maxTranslate, translateX));
            translateY = Math.max(-maxTranslate, Math.min(maxTranslate, translateY));
            
            updateTransform();
        }
    }, { passive: false });
    
    container.addEventListener('touchend', (e) => {
        isDragging = false;
        if (e.touches.length === 0) {
            startDistance = 0;
        }
    }, { passive: false });
    
    // Mouse wheel zoom for desktop
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        scale *= delta;
        scale = Math.max(1, Math.min(scale, 4));
        
        if (scale === 1) {
            translateX = 0;
            translateY = 0;
        }
        
        updateTransform();
    }, { passive: false });
    
    // Double click to zoom for desktop
    container.addEventListener('dblclick', (e) => {
        e.preventDefault();
        if (scale === 1) {
            scale = 2;
            translateX = 0;
            translateY = 0;
        } else {
            scale = 1;
            translateX = 0;
            translateY = 0;
        }
        updateTransform();
    });
    
    function updateTransform() {
        img.style.transform = `scale(${scale}) translate(${translateX/scale}px, ${translateY/scale}px)`;
        img.style.transformOrigin = 'center center';
        img.style.transition = isDragging ? 'none' : 'transform 0.2s ease';
    }
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.remove();
    }
    document.removeEventListener('keydown', handleEscapeKey);
}

function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeImageModal();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.quizApp = new MLAQuizApp();
});

// Service Worker registration with better error handling
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content is available, show update notification
                            console.log('New content is available; please refresh.');
                        }
                    });
                });
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
                // Continue without service worker - app should still work
            });
    });
} else {
    console.log('Service Worker not supported in this browser');
}