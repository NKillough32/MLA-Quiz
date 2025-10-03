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
        console.log('🚀 Starting app initialization...');
        this.bindEvents();
        this.loadQuizzes();
        
        // Initialize new features
        this.initializeDarkMode();
        this.initializeFontSize();
        this.initializeQuizLength();
        console.log('🩺 About to initialize medical tools...');
        this.initializeMedicalTools();
        console.log('✅ App initialization complete');
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
        console.log('🩺 Initializing medical tools...');
        const toolsToggle = document.getElementById('medical-tools-toggle');
        const toolsPanel = document.getElementById('medical-tools-panel');
        const toolsClose = document.getElementById('tools-close-btn');
        const toolNavBtns = document.querySelectorAll('.tool-nav-btn');
        const toolPanels = document.querySelectorAll('.tool-panel');

        console.log('🩺 Elements found:', {
            toolsToggle: !!toolsToggle,
            toolsPanel: !!toolsPanel,
            toolsClose: !!toolsClose,
            toolNavBtns: toolNavBtns.length,
            toolPanels: toolPanels.length
        });

        // Toggle panel open/close
        if (toolsToggle) {
            toolsToggle.addEventListener('click', () => {
                const wasOpen = toolsPanel.classList.contains('open');
                toolsPanel.classList.toggle('open');
                
                // Initialize drug reference on first open
                if (!wasOpen && !this.medicalToolsInitialized) {
                    this.loadDrugReference();
                    this.medicalToolsInitialized = true;
                }
                
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
                // Don't close if clicking inside the panel content area
                if (!toolsPanel.contains(e.target) && !toolsToggle.contains(e.target)) {
                    toolsPanel.classList.remove('open');
                    console.log('🩺 Medical tools panel closed (clicked outside)');
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
            case 'qrisk':
                workspace.innerHTML = this.getQRISKCalculator();
                break;
            case 'madders':
                workspace.innerHTML = this.getMADDERSCalculator();
                break;
            case 'mews':
                workspace.innerHTML = this.getMEWSCalculator();
                break;
            case 'crb65':
                workspace.innerHTML = this.getCRB65Calculator();
                break;
            case 'rockall':
                workspace.innerHTML = this.getRockallCalculator();
                break;
            case 'child-pugh':
                workspace.innerHTML = this.getChildPughCalculator();
                break;
            case 'ottawa-ankle':
                workspace.innerHTML = this.getOttawaAnkleCalculator();
                break;
            case 'egfr':
                workspace.innerHTML = this.getEGFRCalculator();
                break;
            case 'abcd2':
                workspace.innerHTML = this.getABCD2Calculator();
                break;
            case 'must':
                workspace.innerHTML = this.getMUSTCalculator();
                break;
            case 'waterlow':
                workspace.innerHTML = this.getWaterlowCalculator();
                break;
            case 'frax':
                workspace.innerHTML = this.getFRAXCalculator();
                break;
            case 'news2':
                workspace.innerHTML = this.getNEWS2Calculator();
                break;
            case 'curb65':
                workspace.innerHTML = this.getCURB65Calculator();
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

    getQRISKCalculator() {
        return `
            <div class="calculator-form">
                <h4>QRISK3 Calculator</h4>
                <p><small>10-year cardiovascular disease risk assessment</small></p>
                
                <div class="calc-input-group">
                    <label>Age:</label>
                    <input type="number" id="qrisk-age" placeholder="50" min="25" max="85">
                </div>
                <div class="calc-checkbox-group">
                    <label><input type="radio" name="qrisk-sex" value="male"> Male</label>
                    <label><input type="radio" name="qrisk-sex" value="female"> Female</label>
                </div>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="qrisk-smoking"> Current smoker</label>
                    <label><input type="checkbox" id="qrisk-diabetes"> Diabetes</label>
                    <label><input type="checkbox" id="qrisk-copd"> COPD</label>
                    <label><input type="checkbox" id="qrisk-af"> Atrial fibrillation</label>
                    <label><input type="checkbox" id="qrisk-ckd"> Chronic kidney disease</label>
                    <label><input type="checkbox" id="qrisk-ra"> Rheumatoid arthritis</label>
                </div>
                
                <button onclick="window.quizApp.calculateQRISK()">Calculate Risk</button>
                <div id="qrisk-result" class="calc-result"></div>
            </div>
        `;
    }

    calculateQRISK() {
        const age = parseInt(document.getElementById('qrisk-age').value) || 0;
        const sex = document.querySelector('input[name="qrisk-sex"]:checked')?.value;
        
        if (!age || !sex) {
            document.getElementById('qrisk-result').innerHTML = '<p style="color: red;">Please fill in age and sex</p>';
            return;
        }

        // Improved QRISK3 algorithm for UK clinical practice
        let baseRisk = 0;
        
        // Age-based risk (UK QRISK3 methodology)
        if (age >= 25 && age <= 84) {
            if (sex === 'male') {
                baseRisk = Math.pow(age - 25, 1.8) * 0.15;
            } else {
                baseRisk = Math.pow(age - 25, 1.6) * 0.08;
            }
        }
        
        // Risk multipliers based on conditions
        let multiplier = 1.0;
        if (document.getElementById('qrisk-smoking').checked) multiplier *= 1.9;
        if (document.getElementById('qrisk-diabetes').checked) multiplier *= 2.1;
        if (document.getElementById('qrisk-copd').checked) multiplier *= 1.3;
        if (document.getElementById('qrisk-af').checked) multiplier *= 2.5;
        if (document.getElementById('qrisk-ckd').checked) multiplier *= 1.4;
        if (document.getElementById('qrisk-ra').checked) multiplier *= 1.3;

        let risk = Math.min(baseRisk * multiplier, 95);
        let riskLevel = '';
        let color = '';
        let recommendation = '';

        // UK NICE guidelines for cardiovascular risk
        if (risk < 10) {
            riskLevel = 'Low risk (<10%)';
            color = '#4CAF50';
            recommendation = 'Lifestyle advice, reassess in 5 years. No statin unless other indications';
        } else if (risk < 20) {
            riskLevel = 'Moderate risk (10-20%)';
            color = '#FF9800';
            recommendation = 'NICE: Discuss statin therapy (atorvastatin 20mg). Lifestyle modification essential';
        } else {
            riskLevel = 'High risk (≥20%)';
            color = '#F44336';
            recommendation = 'NICE: Statin therapy recommended (atorvastatin 20mg). Intensive lifestyle changes';
        }

        document.getElementById('qrisk-result').innerHTML = `
            <div style="color: ${color}">
                <strong>10-year CV risk: ${risk.toFixed(1)}%</strong><br>
                <strong>${riskLevel}</strong><br>
                <div style="margin-top: 8px; font-size: 0.9em;">
                    ${recommendation}
                </div>
                <div style="margin-top: 8px; font-size: 0.8em; color: #666;">
                    Based on QRISK3 algorithm (simplified). For accurate calculation use official QRISK3 tool.
                </div>
            </div>
        `;
    }

    getMADDERSCalculator() {
        return `
            <div class="calculator-form">
                <h4>MADDERS Score</h4>
                <p><small>Delirium assessment tool</small></p>
                
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="madders-memory"> Memory impairment</label>
                    <label><input type="checkbox" id="madders-attention"> Attention deficit</label>
                    <label><input type="checkbox" id="madders-disorientation"> Disorientation</label>
                    <label><input type="checkbox" id="madders-delusions"> Delusions/hallucinations</label>
                    <label><input type="checkbox" id="madders-emotional"> Emotional lability</label>
                    <label><input type="checkbox" id="madders-reversal"> Sleep-wake reversal</label>
                    <label><input type="checkbox" id="madders-symptoms"> Symptom fluctuation</label>
                </div>
                
                <button onclick="window.quizApp.calculateMADDERS()">Calculate Score</button>
                <div id="madders-result" class="calc-result"></div>
            </div>
        `;
    }

    calculateMADDERS() {
        let score = 0;
        
        if (document.getElementById('madders-memory').checked) score += 1;
        if (document.getElementById('madders-attention').checked) score += 1;
        if (document.getElementById('madders-disorientation').checked) score += 1;
        if (document.getElementById('madders-delusions').checked) score += 1;
        if (document.getElementById('madders-emotional').checked) score += 1;
        if (document.getElementById('madders-reversal').checked) score += 1;
        if (document.getElementById('madders-symptoms').checked) score += 1;

        let interpretation = '';
        let color = '';

        if (score === 0) {
            interpretation = 'No delirium';
            color = '#4CAF50';
        } else if (score <= 2) {
            interpretation = 'Possible subsyndromal delirium';
            color = '#FF9800';
        } else if (score <= 4) {
            interpretation = 'Probable delirium';
            color = '#F44336';
        } else {
            interpretation = 'Definite delirium';
            color = '#D32F2F';
        }

        document.getElementById('madders-result').innerHTML = `
            <div style="color: ${color}">
                <strong>MADDERS Score: ${score}/7</strong><br>
                <strong>${interpretation}</strong>
            </div>
        `;
    }

    getMEWSCalculator() {
        return `
            <div class="calculator-form">
                <h4>MEWS (Modified Early Warning Score)</h4>
                <p><small>Early warning score for clinical deterioration (UK hospitals often use NEWS2)</small></p>
                
                <div class="calc-input-group">
                    <label>Systolic BP (mmHg):</label>
                    <input type="number" id="mews-sbp" placeholder="120">
                </div>
                <div class="calc-input-group">
                    <label>Heart Rate (bpm):</label>
                    <input type="number" id="mews-hr" placeholder="80">
                </div>
                <div class="calc-input-group">
                    <label>Respiratory Rate (breaths/min):</label>
                    <input type="number" id="mews-rr" placeholder="16">
                </div>
                <div class="calc-input-group">
                    <label>Temperature (°C):</label>
                    <input type="number" id="mews-temp" placeholder="36.5" step="0.1">
                </div>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="mews-neuro"> Neurological concern (AVPU < Alert)</label>
                </div>
                
                <button onclick="window.quizApp.calculateMEWS()">Calculate MEWS</button>
                <div id="mews-result" class="calc-result"></div>
            </div>
        `;
    }

    calculateMEWS() {
        const sbp = parseInt(document.getElementById('mews-sbp').value) || 0;
        const hr = parseInt(document.getElementById('mews-hr').value) || 0;
        const rr = parseInt(document.getElementById('mews-rr').value) || 0;
        const temp = parseFloat(document.getElementById('mews-temp').value) || 0;
        const neuro = document.getElementById('mews-neuro').checked;

        let score = 0;

        // Systolic BP scoring
        if (sbp < 70) score += 3;
        else if (sbp < 80) score += 2;
        else if (sbp < 100) score += 1;
        else if (sbp > 199) score += 2;

        // Heart rate scoring
        if (hr < 40) score += 2;
        else if (hr < 50) score += 1;
        else if (hr > 129) score += 3;
        else if (hr > 109) score += 2;
        else if (hr > 99) score += 1;

        // Respiratory rate scoring
        if (rr < 9) score += 2;
        else if (rr > 29) score += 3;
        else if (rr > 24) score += 2;
        else if (rr > 20) score += 1;

        // Temperature scoring
        if (temp < 35) score += 2;
        else if (temp > 38.4) score += 2;

        // Neurological scoring
        if (neuro) score += 3;

        let risk = '';
        let color = '';
        let action = '';

        if (score === 0) {
            risk = 'Low risk';
            color = '#4CAF50';
            action = 'Continue routine monitoring';
        } else if (score <= 2) {
            risk = 'Low-medium risk';
            color = '#FFC107';
            action = 'Increase monitoring frequency';
        } else if (score <= 4) {
            risk = 'Medium risk';
            color = '#FF9800';
            action = 'Consider medical review';
        } else {
            risk = 'High risk';
            color = '#F44336';
            action = 'Urgent medical review required';
        }

        document.getElementById('mews-result').innerHTML = `
            <div style="color: ${color}">
                <strong>MEWS Score: ${score}</strong><br>
                <strong>${risk}</strong><br>
                ${action}
            </div>
        `;
    }

    getCRB65Calculator() {
        return `
            <div class="calculator-form">
                <h4>CRB-65 Score</h4>
                <p><small>Community-acquired pneumonia severity assessment</small></p>
                
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="crb-confusion"> Confusion (AMT ≤8)</label>
                    <label><input type="checkbox" id="crb-rr"> Respiratory rate ≥30/min</label>
                    <label><input type="checkbox" id="crb-bp"> Systolic BP <90 or Diastolic BP ≤60</label>
                    <label><input type="checkbox" id="crb-age"> Age ≥65 years</label>
                </div>
                
                <button onclick="window.quizApp.calculateCRB65()">Calculate Score</button>
                <div id="crb65-result" class="calc-result"></div>
            </div>
        `;
    }

    calculateCRB65() {
        let score = 0;
        
        if (document.getElementById('crb-confusion').checked) score += 1;
        if (document.getElementById('crb-rr').checked) score += 1;
        if (document.getElementById('crb-bp').checked) score += 1;
        if (document.getElementById('crb-age').checked) score += 1;

        let mortality = '';
        let management = '';
        let color = '';

        if (score === 0) {
            mortality = '<1% 30-day mortality';
            management = 'Home treatment suitable (NICE CG191)';
            color = '#4CAF50';
        } else if (score === 1) {
            mortality = '2.7% 30-day mortality';
            management = 'Consider home treatment or short stay admission';
            color = '#FFC107';
        } else if (score === 2) {
            mortality = '6.8% 30-day mortality';
            management = 'Hospital admission recommended';
            color = '#FF9800';
        } else if (score >= 3) {
            mortality = '≥14% 30-day mortality';
            management = 'Urgent hospital admission (consider ICU assessment)';
            color = '#F44336';
        }

        document.getElementById('crb65-result').innerHTML = `
            <div style="color: ${color}">
                <strong>CRB-65 Score: ${score}/4</strong><br>
                <strong>${mortality}</strong><br>
                <strong>Management: ${management}</strong>
            </div>
        `;
    }

    getRockallCalculator() {
        return `
            <div class="calculator-form">
                <h4>Rockall Score</h4>
                <p><small>Upper GI bleeding risk stratification</small></p>
                
                <div class="calc-input-group">
                    <label>Age:</label>
                    <select id="rockall-age">
                        <option value="0"><60 years (0 points)</option>
                        <option value="1">60-79 years (1 point)</option>
                        <option value="2">≥80 years (2 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Shock:</label>
                    <select id="rockall-shock">
                        <option value="0">No shock (0 points)</option>
                        <option value="1">Tachycardia (1 point)</option>
                        <option value="2">Hypotension (2 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Comorbidity:</label>
                    <select id="rockall-comorbid">
                        <option value="0">None (0 points)</option>
                        <option value="2">Cardiac failure, IHD (2 points)</option>
                        <option value="3">Renal/liver failure, malignancy (3 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Diagnosis:</label>
                    <select id="rockall-diagnosis">
                        <option value="0">Mallory-Weiss tear (0 points)</option>
                        <option value="1">Other diagnosis (1 point)</option>
                        <option value="2">Malignancy of upper GI tract (2 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Stigmata of bleeding:</label>
                    <select id="rockall-stigmata">
                        <option value="0">None/dark spot (0 points)</option>
                        <option value="2">Blood in upper GI tract/clot/visible vessel (2 points)</option>
                    </select>
                </div>
                
                <button onclick="window.quizApp.calculateRockall()">Calculate Score</button>
                <div id="rockall-result" class="calc-result"></div>
            </div>
        `;
    }

    calculateRockall() {
        let score = 0;
        
        score += parseInt(document.getElementById('rockall-age').value) || 0;
        score += parseInt(document.getElementById('rockall-shock').value) || 0;
        score += parseInt(document.getElementById('rockall-comorbid').value) || 0;
        score += parseInt(document.getElementById('rockall-diagnosis').value) || 0;
        score += parseInt(document.getElementById('rockall-stigmata').value) || 0;

        let risk = '';
        let mortality = '';
        let rebleed = '';
        let color = '';

        if (score <= 2) {
            risk = 'Low risk';
            mortality = '<0.2% mortality';
            rebleed = '5% rebleeding risk';
            color = '#4CAF50';
        } else if (score <= 4) {
            risk = 'Intermediate risk';
            mortality = '5.6% mortality';
            rebleed = '11% rebleeding risk';
            color = '#FF9800';
        } else {
            risk = 'High risk';
            mortality = '24.6% mortality';
            rebleed = '25% rebleeding risk';
            color = '#F44336';
        }

        document.getElementById('rockall-result').innerHTML = `
            <div style="color: ${color}">
                <strong>Rockall Score: ${score}</strong><br>
                <strong>${risk}</strong><br>
                ${mortality}<br>
                ${rebleed}
            </div>
        `;
    }

    getChildPughCalculator() {
        return `
            <div class="calculator-form">
                <h4>Child-Pugh Score</h4>
                <p><small>Liver function assessment in cirrhosis</small></p>
                
                <div class="calc-input-group">
                    <label>Bilirubin (μmol/L) - UK units:</label>
                    <select id="cp-bilirubin">
                        <option value="1"><34 μmol/L (Normal: <20) (1 point)</option>
                        <option value="2">34-50 μmol/L (2 points)</option>
                        <option value="3">>50 μmol/L (3 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Albumin (g/L) - UK units:</label>
                    <select id="cp-albumin">
                        <option value="1">>35 g/L (Normal: 35-50) (1 point)</option>
                        <option value="2">28-35 g/L (2 points)</option>
                        <option value="3"><28 g/L (3 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>INR:</label>
                    <select id="cp-inr">
                        <option value="1"><1.7 (1 point)</option>
                        <option value="2">1.7-2.3 (2 points)</option>
                        <option value="3">>2.3 (3 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Ascites:</label>
                    <select id="cp-ascites">
                        <option value="1">None (1 point)</option>
                        <option value="2">Slight (2 points)</option>
                        <option value="3">Moderate/severe (3 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Encephalopathy:</label>
                    <select id="cp-enceph">
                        <option value="1">None (1 point)</option>
                        <option value="2">Grade 1-2 (2 points)</option>
                        <option value="3">Grade 3-4 (3 points)</option>
                    </select>
                </div>
                
                <button onclick="window.quizApp.calculateChildPugh()">Calculate Score</button>
                <div id="cp-result" class="calc-result"></div>
            </div>
        `;
    }

    calculateChildPugh() {
        let score = 0;
        
        score += parseInt(document.getElementById('cp-bilirubin').value) || 0;
        score += parseInt(document.getElementById('cp-albumin').value) || 0;
        score += parseInt(document.getElementById('cp-inr').value) || 0;
        score += parseInt(document.getElementById('cp-ascites').value) || 0;
        score += parseInt(document.getElementById('cp-enceph').value) || 0;

        let grade = '';
        let survival = '';
        let color = '';

        if (score <= 6) {
            grade = 'Child-Pugh A';
            survival = '100% 1-year survival, 85% 2-year survival';
            color = '#4CAF50';
        } else if (score <= 9) {
            grade = 'Child-Pugh B';
            survival = '81% 1-year survival, 57% 2-year survival';
            color = '#FF9800';
        } else {
            grade = 'Child-Pugh C';
            survival = '45% 1-year survival, 35% 2-year survival';
            color = '#F44336';
        }

        document.getElementById('cp-result').innerHTML = `
            <div style="color: ${color}">
                <strong>Score: ${score} points</strong><br>
                <strong>${grade}</strong><br>
                ${survival}
            </div>
        `;
    }

    getOttawaAnkleCalculator() {
        return `
            <div class="calculator-form">
                <h4>Ottawa Ankle Rules</h4>
                <p><small>Determine need for ankle/foot X-ray after injury</small></p>
                
                <h5>Ankle X-ray required if:</h5>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="ottawa-ankle-pain"> Bone tenderness at posterior edge/tip of lateral malleolus</label>
                    <label><input type="checkbox" id="ottawa-ankle-medial"> Bone tenderness at posterior edge/tip of medial malleolus</label>
                    <label><input type="checkbox" id="ottawa-ankle-walk"> Unable to bear weight both immediately and in ED (4 steps)</label>
                </div>
                
                <h5>Foot X-ray required if:</h5>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="ottawa-foot-5th"> Bone tenderness at base of 5th metatarsal</label>
                    <label><input type="checkbox" id="ottawa-foot-navicular"> Bone tenderness at navicular</label>
                    <label><input type="checkbox" id="ottawa-foot-walk"> Unable to bear weight both immediately and in ED (4 steps)</label>
                </div>
                
                <button onclick="window.quizApp.calculateOttawaAnkle()">Assess Need for X-ray</button>
                <div id="ottawa-result" class="calc-result"></div>
            </div>
        `;
    }

    calculateOttawaAnkle() {
        const ankleIndicated = 
            document.getElementById('ottawa-ankle-pain').checked ||
            document.getElementById('ottawa-ankle-medial').checked ||
            document.getElementById('ottawa-ankle-walk').checked;

        const footIndicated = 
            document.getElementById('ottawa-foot-5th').checked ||
            document.getElementById('ottawa-foot-navicular').checked ||
            document.getElementById('ottawa-foot-walk').checked;

        let result = '';
        let color = '';

        if (ankleIndicated && footIndicated) {
            result = '<strong>Both ankle AND foot X-rays indicated</strong>';
            color = '#F44336';
        } else if (ankleIndicated) {
            result = '<strong>Ankle X-ray indicated</strong>';
            color = '#F44336';
        } else if (footIndicated) {
            result = '<strong>Foot X-ray indicated</strong>';
            color = '#F44336';
        } else {
            result = '<strong>No X-rays indicated</strong><br>99% sensitivity for excluding fractures';
            color = '#4CAF50';
        }

        document.getElementById('ottawa-result').innerHTML = `
            <div style="color: ${color}">
                ${result}
            </div>
        `;
    }

    // New UK-Relevant Calculators
    
    getEGFRCalculator() {
        return `
            <div class="calculator-form">
                <h4>eGFR Calculator (CKD-EPI)</h4>
                <p><small>Estimated Glomerular Filtration Rate - UK standard</small></p>
                
                <div class="calc-input-group">
                    <label>Age (years):</label>
                    <input type="number" id="egfr-age" placeholder="50" min="18" max="120">
                </div>
                <div class="calc-checkbox-group">
                    <label><input type="radio" name="egfr-sex" value="male"> Male</label>
                    <label><input type="radio" name="egfr-sex" value="female"> Female</label>
                </div>
                <div class="calc-input-group">
                    <label>Serum Creatinine (μmol/L):</label>
                    <input type="number" id="egfr-creatinine" placeholder="80" min="20" max="2000">
                </div>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="egfr-black"> Black ethnicity</label>
                </div>
                
                <button onclick="window.quizApp.calculateEGFR()">Calculate eGFR</button>
                <div id="egfr-result" class="calc-result"></div>
                
                <div class="calc-reference">
                    <small>
                        <strong>CKD Stages (UK):</strong><br>
                        G1: ≥90 (normal/high)<br>
                        G2: 60-89 (mildly decreased)<br>
                        G3a: 45-59 (mild-moderate)<br>
                        G3b: 30-44 (moderate-severe)<br>
                        G4: 15-29 (severely decreased)<br>
                        G5: <15 (kidney failure)
                    </small>
                </div>
            </div>
        `;
    }

    calculateEGFR() {
        const age = parseInt(document.getElementById('egfr-age').value);
        const sex = document.querySelector('input[name="egfr-sex"]:checked')?.value;
        const creatinine = parseFloat(document.getElementById('egfr-creatinine').value);
        const black = document.getElementById('egfr-black').checked;
        
        if (!age || !sex || !creatinine) {
            document.getElementById('egfr-result').innerHTML = '<p class="error">Please fill in all fields</p>';
            return;
        }
        
        // Convert μmol/L to mg/dL
        const creatinine_mg = creatinine * 0.0113;
        
        // CKD-EPI equation
        let k, alpha;
        if (sex === 'female') {
            k = 0.7;
            alpha = creatinine_mg <= 0.7 ? -0.329 : -1.209;
        } else {
            k = 0.9;
            alpha = creatinine_mg <= 0.9 ? -0.411 : -1.209;
        }
        
        let egfr = 141 * Math.pow(Math.min(creatinine_mg / k, 1), alpha) * 
                   Math.pow(Math.max(creatinine_mg / k, 1), -1.209) * 
                   Math.pow(0.993, age);
                   
        if (sex === 'female') egfr *= 1.018;
        if (black) egfr *= 1.159;
        
        egfr = Math.round(egfr);
        
        let stage = '';
        let color = '';
        let clinical = '';
        
        if (egfr >= 90) {
            stage = 'G1 (Normal/High)';
            color = '#4CAF50';
            clinical = 'Normal kidney function (if no other evidence of kidney damage)';
        } else if (egfr >= 60) {
            stage = 'G2 (Mildly decreased)';
            color = '#8BC34A';
            clinical = 'Mildly decreased kidney function';
        } else if (egfr >= 45) {
            stage = 'G3a (Mild-moderate decrease)';
            color = '#FF9800';
            clinical = 'Mild to moderate decrease. Monitor and consider nephrology referral';
        } else if (egfr >= 30) {
            stage = 'G3b (Moderate-severe decrease)';
            color = '#FF5722';
            clinical = 'Moderate to severe decrease. Nephrology referral recommended';
        } else if (egfr >= 15) {
            stage = 'G4 (Severely decreased)';
            color = '#F44336';
            clinical = 'Severely decreased. Prepare for renal replacement therapy';
        } else {
            stage = 'G5 (Kidney failure)';
            color = '#D32F2F';
            clinical = 'Kidney failure. Urgent nephrology referral for RRT';
        }
        
        document.getElementById('egfr-result').innerHTML = `
            <div style="color: ${color}">
                <strong>eGFR: ${egfr} mL/min/1.73m²</strong><br>
                <strong>CKD Stage: ${stage}</strong><br>
                <div style="margin-top: 8px; font-size: 0.9em;">
                    ${clinical}
                </div>
            </div>
        `;
    }

    getABCD2Calculator() {
        return `
            <div class="calculator-form">
                <h4>ABCD² Score</h4>
                <p><small>Stroke risk after TIA (NICE CG68)</small></p>
                
                <div class="calc-input-group">
                    <label>Age:</label>
                    <select id="abcd2-age">
                        <option value="0"><60 years (0 points)</option>
                        <option value="1">≥60 years (1 point)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Blood Pressure:</label>
                    <select id="abcd2-bp">
                        <option value="0">SBP <140 and DBP <90 (0 points)</option>
                        <option value="1">SBP ≥140 or DBP ≥90 (1 point)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Clinical Features:</label>
                    <select id="abcd2-clinical">
                        <option value="0">Other (0 points)</option>
                        <option value="1">Speech disturbance without weakness (1 point)</option>
                        <option value="2">Unilateral weakness (2 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Duration of TIA:</label>
                    <select id="abcd2-duration">
                        <option value="0"><10 minutes (0 points)</option>
                        <option value="1">10-59 minutes (1 point)</option>
                        <option value="2">≥60 minutes (2 points)</option>
                    </select>
                </div>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="abcd2-diabetes"> Diabetes mellitus (+1)</label>
                </div>
                
                <button onclick="window.quizApp.calculateABCD2()">Calculate Score</button>
                <div id="abcd2-result" class="calc-result"></div>
            </div>
        `;
    }

    calculateABCD2() {
        let score = 0;
        
        score += parseInt(document.getElementById('abcd2-age').value) || 0;
        score += parseInt(document.getElementById('abcd2-bp').value) || 0;
        score += parseInt(document.getElementById('abcd2-clinical').value) || 0;
        score += parseInt(document.getElementById('abcd2-duration').value) || 0;
        if (document.getElementById('abcd2-diabetes').checked) score += 1;
        
        let risk = '';
        let dayStroke = '';
        let management = '';
        let color = '';
        
        if (score <= 3) {
            risk = 'Low risk';
            dayStroke = '1% 2-day stroke risk';
            management = 'Specialist assessment within 7 days (NICE)';
            color = '#4CAF50';
        } else if (score <= 5) {
            risk = 'Moderate risk';
            dayStroke = '4.1% 2-day stroke risk';
            management = 'Specialist assessment within 24 hours (NICE)';
            color = '#FF9800';
        } else {
            risk = 'High risk';
            dayStroke = '8.1% 2-day stroke risk';
            management = 'Immediate specialist assessment (NICE)';
            color = '#F44336';
        }
        
        document.getElementById('abcd2-result').innerHTML = `
            <div style="color: ${color}">
                <strong>ABCD² Score: ${score}/7</strong><br>
                <strong>${risk}</strong><br>
                ${dayStroke}<br>
                <div style="margin-top: 8px; font-weight: bold;">
                    ${management}
                </div>
            </div>
        `;
    }

    getMUSTCalculator() {
        return `
            <div class="calculator-form">
                <h4>MUST Score</h4>
                <p><small>Malnutrition Universal Screening Tool (BAPEN)</small></p>
                
                <div class="calc-input-group">
                    <label>BMI:</label>
                    <select id="must-bmi">
                        <option value="0">BMI >20 (≥18.5 if >65yrs) (0 points)</option>
                        <option value="1">BMI 18.5-20 (1 point)</option>
                        <option value="2">BMI <18.5 (2 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Unplanned Weight Loss (3-6 months):</label>
                    <select id="must-weight">
                        <option value="0"><5% (0 points)</option>
                        <option value="1">5-10% (1 point)</option>
                        <option value="2">>10% (2 points)</option>
                    </select>
                </div>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="must-acute"> Acute disease effect - patient acutely ill and no nutritional intake >5 days (+2)</label>
                </div>
                
                <button onclick="window.quizApp.calculateMUST()">Calculate MUST Score</button>
                <div id="must-result" class="calc-result"></div>
                
                <div class="calc-reference">
                    <small>
                        <strong>MUST Actions:</strong><br>
                        0: Low risk - routine care<br>
                        1: Medium risk - observe/document<br>
                        ≥2: High risk - treat/refer dietitian
                    </small>
                </div>
            </div>
        `;
    }

    calculateMUST() {
        let score = 0;
        
        score += parseInt(document.getElementById('must-bmi').value) || 0;
        score += parseInt(document.getElementById('must-weight').value) || 0;
        if (document.getElementById('must-acute').checked) score += 2;
        
        let risk = '';
        let action = '';
        let color = '';
        
        if (score === 0) {
            risk = 'Low risk';
            action = 'Routine clinical care. Repeat screening weekly (hospital) or annually (community)';
            color = '#4CAF50';
        } else if (score === 1) {
            risk = 'Medium risk';
            action = 'Observe and document dietary intake for 3 days. Repeat screening weekly';
            color = '#FF9800';
        } else {
            risk = 'High risk';
            action = 'Treat - refer to dietitian, improve nutritional intake, monitor and review';
            color = '#F44336';
        }
        
        document.getElementById('must-result').innerHTML = `
            <div style="color: ${color}">
                <strong>MUST Score: ${score}</strong><br>
                <strong>${risk}</strong><br>
                <div style="margin-top: 8px; font-size: 0.9em;">
                    ${action}
                </div>
            </div>
        `;
    }

    getWaterlowCalculator() {
        return `
            <div class="calculator-form">
                <h4>Waterlow Pressure Ulcer Risk Assessment</h4>
                <p><small>UK standard pressure ulcer risk screening</small></p>
                
                <div class="calc-input-group">
                    <label>Age:</label>
                    <select id="waterlow-age">
                        <option value="1">14-49 years (1 point)</option>
                        <option value="2">50-64 years (2 points)</option>
                        <option value="3">65-74 years (3 points)</option>
                        <option value="4">75-80 years (4 points)</option>
                        <option value="5">81+ years (5 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Sex/Build:</label>
                    <select id="waterlow-build">
                        <option value="0">Male (0 points)</option>
                        <option value="1">Female (1 point)</option>
                        <option value="1">Below average build (1 point)</option>
                        <option value="2">Above average build (2 points)</option>
                        <option value="3">Obese (3 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Continence:</label>
                    <select id="waterlow-continence">
                        <option value="0">Complete/catheterised (0 points)</option>
                        <option value="1">Occasional incontinence (1 point)</option>
                        <option value="2">Catheterised/incontinent of faeces (2 points)</option>
                        <option value="3">Doubly incontinent (3 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Mobility:</label>
                    <select id="waterlow-mobility">
                        <option value="0">Fully mobile (0 points)</option>
                        <option value="1">Restless/fidgety (1 point)</option>
                        <option value="2">Apathetic (2 points)</option>
                        <option value="3">Restricted (3 points)</option>
                        <option value="4">Bedfast (4 points)</option>
                        <option value="5">Chairfast (5 points)</option>
                    </select>
                </div>
                
                <button onclick="window.quizApp.calculateWaterlow()">Calculate Risk</button>
                <div id="waterlow-result" class="calc-result"></div>
            </div>
        `;
    }

    calculateWaterlow() {
        let score = 0;
        
        score += parseInt(document.getElementById('waterlow-age').value) || 0;
        score += parseInt(document.getElementById('waterlow-build').value) || 0;
        score += parseInt(document.getElementById('waterlow-continence').value) || 0;
        score += parseInt(document.getElementById('waterlow-mobility').value) || 0;
        
        let risk = '';
        let action = '';
        let color = '';
        
        if (score < 10) {
            risk = 'At risk';
            action = 'Basic preventive measures';
            color = '#4CAF50';
        } else if (score < 15) {
            risk = 'High risk';
            action = 'Enhanced preventive measures + pressure relieving aids';
            color = '#FF9800';
        } else if (score < 20) {
            risk = 'Very high risk';
            action = 'Maximum preventive measures + high-specification foam mattress';
            color = '#F44336';
        } else {
            risk = 'Extremely high risk';
            action = 'As above + specialist mattress/bed + expert advice';
            color = '#D32F2F';
        }
        
        document.getElementById('waterlow-result').innerHTML = `
            <div style="color: ${color}">
                <strong>Waterlow Score: ${score}</strong><br>
                <strong>${risk}</strong><br>
                <div style="margin-top: 8px; font-size: 0.9em;">
                    ${action}
                </div>
            </div>
        `;
    }

    getFRAXCalculator() {
        return `
            <div class="calculator-form">
                <h4>FRAX Calculator (Simplified)</h4>
                <p><small>10-year fracture risk assessment (simplified version)</small></p>
                
                <div class="calc-input-group">
                    <label>Age (40-90 years):</label>
                    <input type="number" id="frax-age" placeholder="65" min="40" max="90">
                </div>
                <div class="calc-checkbox-group">
                    <label><input type="radio" name="frax-sex" value="male"> Male</label>
                    <label><input type="radio" name="frax-sex" value="female"> Female</label>
                </div>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="frax-fracture"> Previous fracture</label>
                    <label><input type="checkbox" id="frax-parent"> Parent hip fracture</label>
                    <label><input type="checkbox" id="frax-smoking"> Current smoking</label>
                    <label><input type="checkbox" id="frax-glucocorticoids"> Glucocorticoids</label>
                    <label><input type="checkbox" id="frax-ra"> Rheumatoid arthritis</label>
                    <label><input type="checkbox" id="frax-osteoporosis"> Secondary osteoporosis</label>
                    <label><input type="checkbox" id="frax-alcohol"> 3+ units alcohol daily</label>
                </div>
                
                <button onclick="window.quizApp.calculateFRAX()">Calculate Risk</button>
                <div id="frax-result" class="calc-result"></div>
                
                <div class="calc-reference">
                    <small>
                        <strong>Note:</strong> This is a simplified version. Use official FRAX tool for accurate assessment with BMD values.
                    </small>
                </div>
            </div>
        `;
    }

    calculateFRAX() {
        const age = parseInt(document.getElementById('frax-age').value);
        const sex = document.querySelector('input[name="frax-sex"]:checked')?.value;
        
        if (!age || !sex) {
            document.getElementById('frax-result').innerHTML = '<p class="error">Please enter age and sex</p>';
            return;
        }
        
        // Simplified FRAX calculation
        let baseRisk = 0;
        
        if (sex === 'female') {
            baseRisk = Math.pow((age - 40) / 50, 2) * 15;
        } else {
            baseRisk = Math.pow((age - 40) / 50, 2) * 8;
        }
        
        let multiplier = 1.0;
        if (document.getElementById('frax-fracture').checked) multiplier *= 1.8;
        if (document.getElementById('frax-parent').checked) multiplier *= 1.9;
        if (document.getElementById('frax-smoking').checked) multiplier *= 1.3;
        if (document.getElementById('frax-glucocorticoids').checked) multiplier *= 2.6;
        if (document.getElementById('frax-ra').checked) multiplier *= 1.4;
        if (document.getElementById('frax-osteoporosis').checked) multiplier *= 1.8;
        if (document.getElementById('frax-alcohol').checked) multiplier *= 1.4;
        
        const majorRisk = Math.min(baseRisk * multiplier, 80);
        const hipRisk = majorRisk * 0.3;
        
        let intervention = '';
        let color = '';
        
        if (majorRisk < 10) {
            intervention = 'Lifestyle advice only';
            color = '#4CAF50';
        } else if (majorRisk < 20) {
            intervention = 'Consider treatment (NOGG guidelines)';
            color = '#FF9800';
        } else {
            intervention = 'Treatment recommended';
            color = '#F44336';
        }
        
        document.getElementById('frax-result').innerHTML = `
            <div style="color: ${color}">
                <strong>10-year major fracture risk: ${majorRisk.toFixed(1)}%</strong><br>
                <strong>10-year hip fracture risk: ${hipRisk.toFixed(1)}%</strong><br>
                <div style="margin-top: 8px; font-weight: bold;">
                    ${intervention}
                </div>
                <div style="margin-top: 8px; font-size: 0.8em; color: #666;">
                    Simplified calculation - use official FRAX tool for clinical decisions
                </div>
            </div>
        `;
    }

    getNEWS2Calculator() {
        return `
            <div class="calculator-form">
                <h4>NEWS2 (National Early Warning Score 2)</h4>
                <p><small>UK standard early warning score (RCP 2017)</small></p>
                
                <div class="calc-input-group">
                    <label>Respiratory Rate (breaths/min):</label>
                    <input type="number" id="news2-rr" placeholder="16" min="5" max="60">
                </div>
                <div class="calc-input-group">
                    <label>SpO₂ (%): <span id="spo2-scale">Scale 1</span></label>
                    <input type="number" id="news2-spo2" placeholder="98" min="70" max="100">
                </div>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="news2-air"> Supplemental oxygen</label>
                    <label><input type="checkbox" id="news2-hypercapnic"> Hypercapnic respiratory failure (COPD) - use Scale 2</label>
                </div>
                <div class="calc-input-group">
                    <label>Systolic BP (mmHg):</label>
                    <input type="number" id="news2-sbp" placeholder="120" min="50" max="300">
                </div>
                <div class="calc-input-group">
                    <label>Heart Rate (bpm):</label>
                    <input type="number" id="news2-hr" placeholder="80" min="30" max="200">
                </div>
                <div class="calc-input-group">
                    <label>AVPU:</label>
                    <select id="news2-avpu">
                        <option value="0">Alert (0 points)</option>
                        <option value="3">Voice, Pain, or Unresponsive (3 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Temperature (°C):</label>
                    <input type="number" id="news2-temp" placeholder="36.5" step="0.1" min="30" max="45">
                </div>
                
                <button onclick="window.quizApp.calculateNEWS2()">Calculate NEWS2</button>
                <div id="news2-result" class="calc-result"></div>
            </div>
        `;
    }

    calculateNEWS2() {
        const rr = parseInt(document.getElementById('news2-rr').value) || 0;
        const spo2 = parseInt(document.getElementById('news2-spo2').value) || 0;
        const sbp = parseInt(document.getElementById('news2-sbp').value) || 0;
        const hr = parseInt(document.getElementById('news2-hr').value) || 0;
        const avpu = parseInt(document.getElementById('news2-avpu').value) || 0;
        const temp = parseFloat(document.getElementById('news2-temp').value) || 0;
        const oxygen = document.getElementById('news2-air').checked;
        const hypercapnic = document.getElementById('news2-hypercapnic').checked;
        
        let score = 0;
        
        // Respiratory rate
        if (rr <= 8) score += 3;
        else if (rr <= 11) score += 1;
        else if (rr <= 20) score += 0;
        else if (rr <= 24) score += 2;
        else score += 3;
        
        // SpO2 (Scale 1 or 2)
        if (hypercapnic) {
            // Scale 2 (COPD patients)
            if (spo2 <= 83) score += 3;
            else if (spo2 <= 85) score += 2;
            else if (spo2 <= 87) score += 1;
            else if (spo2 <= 92) score += 0;
            else if (spo2 <= 94) score += 1;
            else if (spo2 <= 96) score += 2;
            else score += 3;
        } else {
            // Scale 1 (standard)
            if (spo2 <= 91) score += 3;
            else if (spo2 <= 93) score += 2;
            else if (spo2 <= 95) score += 1;
            else score += 0;
        }
        
        // Supplemental oxygen
        if (oxygen) score += 2;
        
        // Systolic BP
        if (sbp <= 90) score += 3;
        else if (sbp <= 100) score += 2;
        else if (sbp <= 110) score += 1;
        else if (sbp <= 219) score += 0;
        else score += 3;
        
        // Heart rate
        if (hr <= 40) score += 3;
        else if (hr <= 50) score += 1;
        else if (hr <= 90) score += 0;
        else if (hr <= 110) score += 1;
        else if (hr <= 130) score += 2;
        else score += 3;
        
        // AVPU
        score += avpu;
        
        // Temperature
        if (temp <= 35.0) score += 3;
        else if (temp <= 36.0) score += 1;
        else if (temp <= 38.0) score += 0;
        else if (temp <= 39.0) score += 1;
        else score += 2;
        
        let risk = '';
        let action = '';
        let color = '';
        
        if (score === 0) {
            risk = 'Low risk';
            action = 'Continue routine monitoring (12 hourly)';
            color = '#4CAF50';
        } else if (score <= 4) {
            risk = 'Low-medium risk';
            action = 'Increase monitoring (4-6 hourly). Consider medical review';
            color = '#FFC107';
        } else if (score <= 6) {
            risk = 'Medium risk';
            action = 'Hourly monitoring. Urgent medical review';
            color = '#FF9800';
        } else {
            risk = 'High risk';
            action = 'Continuous monitoring. Immediate medical review. Consider critical care';
            color = '#F44336';
        }
        
        document.getElementById('news2-result').innerHTML = `
            <div style="color: ${color}">
                <strong>NEWS2 Score: ${score}</strong><br>
                <strong>${risk}</strong><br>
                <div style="margin-top: 8px; font-weight: bold;">
                    ${action}
                </div>
            </div>
        `;
    }

    getCURB65Calculator() {
        return `
            <div class="calculator-form">
                <h4>CURB-65 Score</h4>
                <p><small>Enhanced CAP severity assessment (includes urea)</small></p>
                
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="curb-confusion"> Confusion (AMT ≤8 or new disorientation)</label>
                    <label><input type="checkbox" id="curb-urea"> Urea >7 mmol/L</label>
                    <label><input type="checkbox" id="curb-rr"> Respiratory rate ≥30/min</label>
                    <label><input type="checkbox" id="curb-bp"> Systolic BP <90 or Diastolic BP ≤60</label>
                    <label><input type="checkbox" id="curb-age"> Age ≥65 years</label>
                </div>
                
                <button onclick="window.quizApp.calculateCURB65()">Calculate Score</button>
                <div id="curb65-result" class="calc-result"></div>
                
                <div class="calc-reference">
                    <small>
                        <strong>Comparison with CRB-65:</strong><br>
                        CURB-65 includes urea level, providing more accurate risk stratification than CRB-65
                    </small>
                </div>
            </div>
        `;
    }

    calculateCURB65() {
        let score = 0;
        
        if (document.getElementById('curb-confusion').checked) score += 1;
        if (document.getElementById('curb-urea').checked) score += 1;
        if (document.getElementById('curb-rr').checked) score += 1;
        if (document.getElementById('curb-bp').checked) score += 1;
        if (document.getElementById('curb-age').checked) score += 1;

        let mortality = '';
        let management = '';
        let color = '';

        if (score === 0) {
            mortality = '0.7% 30-day mortality';
            management = 'Home treatment (NICE CG191)';
            color = '#4CAF50';
        } else if (score === 1) {
            mortality = '2.1% 30-day mortality';
            management = 'Home treatment or short hospital stay';
            color = '#8BC34A';
        } else if (score === 2) {
            mortality = '9.2% 30-day mortality';
            management = 'Hospital admission recommended';
            color = '#FF9800';
        } else if (score === 3) {
            mortality = '14.5% 30-day mortality';
            management = 'Hospital admission - consider ICU assessment';
            color = '#F44336';
        } else if (score >= 4) {
            mortality = '≥27% 30-day mortality';
            management = 'Urgent hospital admission - high dependency/ICU care';
            color = '#D32F2F';
        }

        document.getElementById('curb65-result').innerHTML = `
            <div style="color: ${color}">
                <strong>CURB-65 Score: ${score}/5</strong><br>
                <strong>${mortality}</strong><br>
                <strong>Management: ${management}</strong>
            </div>
        `;
    }

    // Drug Reference Functions
    loadDrugReference() {
        const drugDatabase = {
            'paracetamol': {
                name: 'Paracetamol',
                class: 'Analgesic, Antipyretic',
                mechanism: 'Inhibits COX enzymes centrally, affects prostaglandin synthesis in hypothalamus',
                dosing: 'Adults: 500mg-1g every 4-6 hours (max 4g/24h). Children: 15mg/kg every 4-6 hours (max 60mg/kg/24h)',
                contraindications: 'Severe hepatic impairment, hypersensitivity to paracetamol',
                interactions: 'Warfarin (↑ INR with regular use), carbamazepine (↑ hepatotoxicity risk), chronic alcohol (↑ hepatotoxicity)',
                monitoring: 'Liver function with prolonged use, paracetamol levels in overdose',
                pregnancy: 'Safe - preferred analgesic and antipyretic in pregnancy',
                sideEffects: 'Hepatotoxicity (overdose), very rarely serious skin reactions (SJS/TEN)',
                pharmacokinetics: 'Onset: 30min, Peak: 1h, Half-life: 2h, Metabolism: hepatic conjugation',
                clinicalPearls: 'First-line analgesic in UK. No anti-inflammatory effect. Overdose antidote: N-acetylcysteine. Safe in asthma',
                indication: 'Pain relief, fever reduction. Safe alternative to NSAIDs'
            },
            'amoxicillin': {
                name: 'Amoxicillin',
                class: 'Beta-lactam antibiotic (Aminopenicillin)',
                mechanism: 'Inhibits bacterial cell wall synthesis by binding to penicillin-binding proteins',
                dosing: 'Adults: 500mg TDS or 1g BD. Severe infections: 1g TDS. Children: 40-90mg/kg daily in 2-3 divided doses',
                contraindications: 'Penicillin allergy, infectious mononucleosis (high rash risk)',
                interactions: 'Methotrexate (↑ toxicity), combined oral contraceptive (↓ efficacy), probenecid (↑ levels)',
                monitoring: 'Signs of allergic reaction, C. difficile-associated diarrhoea, renal function in severe illness',
                pregnancy: 'Safe - suitable for use in pregnancy',
                sideEffects: 'GI upset, diarrhoea, rash (especially with EBV), CDAD, hypersensitivity reactions',
                pharmacokinetics: 'Onset: 1h, Peak: 1-2h, Half-life: 1h, Excretion: mainly renal',
                clinicalPearls: 'Broad spectrum penicillin. Good oral bioavailability. Reduce dose in severe renal impairment (CrCl <30)',
                coverage: 'Gram-positive: Streptococci, some Staphylococci. Gram-negative: E. coli, H. influenzae. No MRSA/Pseudomonas cover'
            },
            'atorvastatin': {
                name: 'Atorvastatin',
                class: 'HMG-CoA reductase inhibitor (Statin)',
                mechanism: 'Competitively inhibits HMG-CoA reductase, rate-limiting enzyme in cholesterol synthesis',
                dosing: 'Adults: Start 20mg daily, usual dose 20-80mg daily. High-intensity: 40-80mg daily. Take any time of day',
                contraindications: 'Active liver disease, pregnancy, breastfeeding, unexplained persistent ↑ ALT/AST',
                interactions: 'Ciclosporin (↑ statin levels), warfarin (↑ INR), digoxin (↑ levels), grapefruit juice',
                monitoring: 'LFTs before treatment and at 3 months, lipids at 3 months, CK if muscle symptoms',
                pregnancy: 'Contraindicated - stop 3 months before conception',
                sideEffects: 'Myalgia (common), hepatotoxicity (rare), rhabdomyolysis (very rare), new-onset diabetes (slight ↑)',
                pharmacokinetics: 'Peak: 1-2h, Half-life: 14h, Metabolism: CYP3A4, active metabolites',
                clinicalPearls: 'High-intensity statin. NICE preferred high-intensity option. Can take any time due to long half-life',
                targets: 'Primary prevention: 20mg daily. Secondary prevention: 80mg daily. Target >40% LDL-C reduction'
            },
            'metformin': {
                name: 'Metformin',
                class: 'Biguanide antidiabetic',
                mechanism: 'Decreases hepatic glucose production, improves peripheral insulin sensitivity, ↓ intestinal glucose absorption',
                dosing: 'Standard-release: Start 500mg BD with meals, increase weekly. Max 1g BD. Modified-release: Start 500mg OD, max 2g OD',
                contraindications: 'eGFR <30, acute conditions with tissue hypoxia, severe heart failure, alcohol dependence',
                interactions: 'Iodinated contrast media (stop 48h before), alcohol (↑ lactic acidosis risk), diuretics (dehydration risk)',
                monitoring: 'HbA1c every 3-6 months, eGFR annually (6-monthly if ≥45), vitamin B12 annually',
                pregnancy: 'Safe - may be used in gestational diabetes and PCOS',
                sideEffects: 'GI upset (30%), diarrhoea, metallic taste, vitamin B12 deficiency, lactic acidosis (very rare)',
                pharmacokinetics: 'Peak: 2-3h, Half-life: 6h, No metabolism, Excretion: renal unchanged',
                clinicalPearls: 'First-line T2DM in UK. Weight neutral/modest loss. Cardiovascular benefits. Take with food to ↓ GI effects',
                efficacy: 'HbA1c reduction: 11-22mmol/mol (1-2%). Does not cause hypoglycaemia as monotherapy'
            },
            'ramipril': {
                name: 'Ramipril',
                class: 'ACE inhibitor',
                mechanism: 'Inhibits ACE, preventing conversion of angiotensin I to II, reducing aldosterone secretion',
                dosing: 'Hypertension: Start 1.25-2.5mg daily, usual 2.5-5mg daily, max 10mg daily. Heart failure: Start 1.25mg daily, target 10mg daily',
                contraindications: 'Pregnancy, bilateral renal artery stenosis, angioedema history, hyperkalaemia >5.5mmol/L',
                interactions: 'NSAIDs (↓ antihypertensive effect, ↑ nephrotoxicity), potassium supplements (hyperkalaemia), lithium (↑ levels)',
                monitoring: 'eGFR and potassium baseline, 1-2 weeks after starting/dose change, then annually',
                pregnancy: 'Contraindicated - teratogenic (oligohydramnios, IUGR, renal dysgenesis)',
                sideEffects: 'Dry cough (10-15%), hyperkalaemia, acute kidney injury, angioedema (rare), hypotension',
                pharmacokinetics: 'Prodrug activated hepatically, Half-life: 13-17h, Excretion: renal and biliary',
                clinicalPearls: 'Most commonly prescribed ACE inhibitor in UK. Renoprotective in diabetes. Stop immediately if pregnant',
                indication: 'Hypertension, heart failure, post-MI, diabetic nephropathy, primary prevention in high CV risk'
            },
            'levothyroxine': {
                name: 'Levothyroxine',
                class: 'Thyroid hormone replacement',
                mechanism: 'Synthetic L-thyroxine (T4) hormone, converted to active T3 in peripheral tissues',
                dosing: 'Adults <50yrs: 1.6micrograms/kg daily. >50yrs or cardiac disease: 25-50micrograms daily, increase by 25-50micrograms every 3-4 weeks',
                contraindications: 'Untreated adrenal insufficiency, acute myocardial infarction, thyrotoxicosis',
                interactions: 'Iron/calcium (take 4h apart), warfarin (↑ anticoagulant effect), carbamazepine (↑ metabolism)',
                monitoring: 'TSH every 6-8 weeks until stable, then annually. Free T4 if pituitary disease suspected',
                pregnancy: 'Safe - essential in pregnancy. Increase dose by 25-50micrograms. Monitor TSH each trimester',
                sideEffects: 'Over-replacement: palpitations, insomnia, tremor, weight loss, heat intolerance, AF, osteoporosis',
                pharmacokinetics: 'Peak: 2-4h, Half-life: 7 days, Steady state: 6-8 weeks',
                clinicalPearls: 'Take on empty stomach 30-60min before breakfast. Consistent brand/timing. TSH target 0.5-2.5mU/L',
                indication: 'Primary hypothyroidism, secondary hypothyroidism, thyroid cancer (TSH suppression)'
            },
            'simvastatin': {
                name: 'Simvastatin',
                class: 'HMG-CoA reductase inhibitor (Statin)',
                mechanism: 'Inhibits HMG-CoA reductase, reducing cholesterol synthesis, upregulates LDL receptors',
                dosing: 'Start 10-20mg at night, usual dose 40mg daily, max 80mg daily (restricted to patients on 80mg for ≥12 months)',
                contraindications: 'Active liver disease, pregnancy, breastfeeding, concurrent use of strong CYP3A4 inhibitors',
                interactions: 'Amlodipine (max 20mg simvastatin), diltiazem (max 20mg), warfarin (↑ INR), grapefruit juice (avoid large amounts)',
                monitoring: 'LFTs before treatment, lipids at 3 months, CK if muscle symptoms',
                pregnancy: 'Contraindicated - teratogenic risk',
                sideEffects: 'Myalgia, elevated LFTs (rare), rhabdomyolysis (very rare), new-onset diabetes (slight ↑)',
                pharmacokinetics: 'Prodrug, extensive first-pass metabolism, Half-life: 2h, active metabolites',
                clinicalPearls: 'Most cost-effective statin in UK. Take at night. 80mg dose requires specialist monitoring due to interactions',
                indication: 'Hypercholesterolaemia, mixed dyslipidaemia, cardiovascular disease prevention'
            },
            'amlodipine': {
                name: 'Amlodipine',
                class: 'Dihydropyridine calcium channel blocker',
                mechanism: 'Blocks L-type calcium channels in vascular smooth muscle and myocardium, causing vasodilation',
                dosing: 'Hypertension: Start 5mg daily, max 10mg daily. Elderly/hepatic impairment: start 2.5mg daily',
                contraindications: 'Hypersensitivity, unstable angina, significant aortic stenosis',
                interactions: 'Simvastatin (limit simvastatin to 20mg), CYP3A4 inhibitors (monitor for hypotension)',
                monitoring: 'Blood pressure, heart rate, signs of fluid retention, ankle oedema',
                pregnancy: 'Avoid unless essential - limited safety data',
                sideEffects: 'Ankle oedema (dose-related), flushing, dizziness, fatigue, gingival hyperplasia (rare)',
                pharmacokinetics: 'Peak: 6-12h, Half-life: 35-50h, Hepatic metabolism via CYP3A4',
                clinicalPearls: 'Long half-life allows once daily dosing. Ankle oedema not due to fluid retention. Preferred CCB in UK',
                indication: 'Hypertension, stable angina. Often used as add-on therapy'
            },
            'ibuprofen': {
                name: 'Ibuprofen',
                class: 'Non-steroidal anti-inflammatory drug (NSAID)',
                mechanism: 'Non-selective cyclooxygenase (COX) inhibitor, reducing prostaglandin synthesis',
                dosing: 'Adults: 400mg TDS-QDS with food (max 2.4g daily). Children >6 months: 20-30mg/kg daily in 3-4 divided doses',
                contraindications: 'Active peptic ulceration, severe heart failure, severe renal impairment, pregnancy (3rd trimester)',
                interactions: 'ACE inhibitors (↓ antihypertensive effect), warfarin (↑ bleeding risk), lithium (↑ toxicity), methotrexate (↑ toxicity)',
                monitoring: 'Renal function, blood pressure, signs of GI bleeding, fluid retention',
                pregnancy: 'Avoid in 3rd trimester - risk of oligohydramnios and premature closure of ductus arteriosus',
                sideEffects: 'GI bleeding/perforation, acute kidney injury, fluid retention, hypertension, bronchospasm (aspirin-sensitive asthma)',
                pharmacokinetics: 'Onset: 30min, Peak: 1-2h, Half-life: 2-4h, Hepatic metabolism',
                clinicalPearls: 'Most widely used NSAID in UK. Always take with food. Use lowest effective dose for shortest time',
                indication: 'Pain and inflammation, particularly musculoskeletal conditions, fever, dysmenorrhoea'
            },
            'co-codamol': {
                name: 'Co-codamol',
                class: 'Opioid/paracetamol combination analgesic',
                mechanism: 'Codeine acts on μ-opioid receptors, paracetamol inhibits COX enzymes centrally',
                dosing: 'Adults: 8/500mg or 30/500mg, 1-2 tablets every 4-6 hours (max 8 tablets/24h). Children >12 years: 8/500mg only',
                contraindications: 'Children <12 years, acute respiratory depression, paralytic ileus, severe hepatic impairment',
                interactions: 'Alcohol (↑ sedation), MAOIs, other CNS depressants, warfarin (paracetamol component)',
                monitoring: 'Signs of respiratory depression, constipation, dependence with long-term use',
                pregnancy: 'Use with caution - potential neonatal withdrawal if used near term',
                sideEffects: 'Constipation, nausea, drowsiness, dizziness, dry mouth, potential for dependence',
                pharmacokinetics: 'Codeine: prodrug converted to morphine by CYP2D6. Half-life: 3-4h',
                clinicalPearls: 'Popular UK combination. 8/500mg available OTC. 30/500mg prescription only. Maximum 3 days OTC use',
                indication: 'Moderate pain where paracetamol alone insufficient. Post-operative pain, dental pain'
            },
            'doxycycline': {
                name: 'Doxycycline',
                class: 'Tetracycline antibiotic',
                mechanism: 'Inhibits bacterial protein synthesis by binding to 30S ribosomal subunit',
                dosing: 'Adults: 200mg on day 1, then 100mg daily. Acne: 40mg daily modified-release. Malaria prophylaxis: 100mg daily',
                contraindications: 'Pregnancy, breastfeeding, children <12 years, myasthenia gravis',
                interactions: 'Antacids/iron (↓ absorption), warfarin (↑ INR), penicillins (antagonistic)',
                monitoring: 'LFTs if prolonged use, signs of C.difficile colitis, photosensitivity',
                pregnancy: 'Contraindicated - risk of dental staining and bone growth inhibition in fetus',
                sideEffects: 'GI upset, photosensitivity, oesophageal irritation, vaginal thrush',
                pharmacokinetics: 'Well absorbed, Half-life: 18-22h, Hepatic metabolism and renal excretion',
                clinicalPearls: 'Take with food, avoid dairy 2h before/after. Stay upright 30min after dose. First-line for atypical pneumonia',
                indication: 'Respiratory tract infections, acne, chlamydia, malaria prophylaxis, Lyme disease'
            },
            'fluoxetine': {
                name: 'Fluoxetine',
                class: 'Selective serotonin reuptake inhibitor (SSRI)',
                mechanism: 'Inhibits serotonin reuptake at synaptic cleft, increasing serotonin availability',
                dosing: 'Depression: Start 20mg daily, usual dose 20mg, max 60mg daily. Take in morning',
                contraindications: 'MAOIs (within 14 days), mania, severe hepatic impairment',
                interactions: 'MAOIs (serotonin syndrome), warfarin (↑ bleeding), tramadol (↑ seizure risk)',
                monitoring: 'Mood, suicide risk (especially <25 years), weight, sodium levels',
                pregnancy: 'Use if benefit outweighs risk - potential neonatal adaptation syndrome',
                sideEffects: 'Nausea, headache, insomnia, sexual dysfunction, weight loss, hyponatraemia',
                pharmacokinetics: 'Long half-life: 4-6 days (active metabolite: 4-16 days), CYP2D6 metabolism',
                clinicalPearls: 'Longest half-life SSRI - less withdrawal symptoms. May initially increase anxiety. Monitor under 25s weekly',
                indication: 'Depression, panic disorder, OCD, bulimia nervosa, premenstrual dysphoric disorder'
            },
            'lansoprazole': {
                name: 'Lansoprazole',
                class: 'Proton pump inhibitor (PPI)',
                mechanism: 'Irreversibly inhibits gastric H+/K+-ATPase, reducing gastric acid secretion',
                dosing: 'GORD: 30mg daily for 4-8 weeks. Peptic ulcer: 30mg daily for 4-8 weeks. H.pylori: 30mg BD with antibiotics',
                contraindications: 'Hypersensitivity to PPIs',
                interactions: 'Clopidogrel (↓ effect), warfarin (may ↑ INR), digoxin (↑ levels)',
                monitoring: 'Long-term: B12, magnesium levels. Review continued need regularly',
                pregnancy: 'Generally safe - limited human data but no increased malformation risk',
                sideEffects: 'Headache, diarrhoea, abdominal pain, hypomagnesaemia (long-term)',
                pharmacokinetics: 'Rapid onset, Half-life: 1-2h, Duration: 24h+, CYP2C19 and CYP3A4 metabolism',
                clinicalPearls: 'Take before breakfast. Faster symptom relief than omeprazole. Available as orodispersible tablets',
                indication: 'GORD, peptic ulcer disease, H.pylori eradication, NSAID-associated ulcers'
            },
            'warfarin': {
                name: 'Warfarin',
                class: 'Vitamin K antagonist anticoagulant',
                mechanism: 'Inhibits vitamin K epoxide reductase, preventing synthesis of factors II, VII, IX, X',
                dosing: 'Start 5-10mg daily (3mg if elderly/liver disease). Adjust based on INR. Target INR 2.0-3.0 (2.5-3.5 for mechanical valves)',
                contraindications: 'Active bleeding, pregnancy (except mechanical heart valves), severe hepatic disease',
                interactions: 'Numerous: antibiotics, NSAIDs, amiodarone, alcohol. Check BNF interaction checker',
                monitoring: 'INR: daily until stable, then weekly, then up to 12-weekly when stable',
                pregnancy: 'Teratogenic - avoid except mechanical valves (use LMWH periconception)',
                sideEffects: 'Bleeding (major risk), skin necrosis (rare), purple toe syndrome (rare)',
                pharmacokinetics: 'Onset: 36-72h, Half-life: 36-42h, CYP2C9 metabolism',
                clinicalPearls: 'Take same time daily. Avoid vitamin K-rich foods in large amounts. Reversal: vitamin K ± PCC',
                indication: 'AF, VTE, mechanical heart valves. Being replaced by DOACs where appropriate'
            },
            'citalopram': {
                name: 'Citalopram',
                class: 'Selective serotonin reuptake inhibitor (SSRI)',
                mechanism: 'Selective inhibition of serotonin reuptake with minimal effect on other neurotransmitters',
                dosing: 'Adults: Start 20mg daily, usual dose 20mg, max 40mg daily (20mg if >65 years or hepatic impairment)',
                contraindications: 'MAOIs, QT prolongation, recent MI, severe heart failure',
                interactions: 'MAOIs (serotonin syndrome), drugs prolonging QT interval, warfarin',
                monitoring: 'ECG if cardiac risk factors, electrolytes, mood, suicide risk',
                pregnancy: 'Use if benefit outweighs risk - potential pulmonary hypertension in neonate',
                sideEffects: 'Nausea, dry mouth, drowsiness, sexual dysfunction, QT prolongation (dose-related)',
                pharmacokinetics: 'Half-life: 35h, CYP2C19 and CYP3A4 metabolism',
                clinicalPearls: 'Lowest interaction profile of SSRIs. Dose reduction needed in elderly. ECG if >40mg or cardiac risk',
                indication: 'Depression, panic disorder (unlicensed but effective)'
            },
            'sertraline': {
                name: 'Sertraline',
                class: 'Selective serotonin reuptake inhibitor (SSRI)',
                mechanism: 'Potent and selective inhibition of serotonin reuptake',
                dosing: 'Adults: Start 50mg daily, can increase by 50mg increments weekly, max 200mg daily. Take with food',
                contraindications: 'MAOIs, unstable epilepsy, mania',
                interactions: 'MAOIs, warfarin (↑ bleeding risk), NSAIDs, tramadol',
                monitoring: 'Mood, suicide risk (especially <25 years), bleeding if on anticoagulants',
                pregnancy: 'Preferred SSRI in pregnancy - lowest risk profile',
                sideEffects: 'Nausea, diarrhoea, insomnia, sexual dysfunction, tremor, dry mouth',
                pharmacokinetics: 'Half-life: 26h, extensive first-pass metabolism',
                clinicalPearls: 'NICE first-line SSRI choice. Take with food to ↓ GI upset. Lower drug interaction potential',
                indication: 'Depression, panic disorder, OCD, PTSD, social anxiety disorder'
            },
            'mirtazapine': {
                name: 'Mirtazapine',
                class: 'Noradrenergic and specific serotonergic antidepressant (NaSSA)',
                mechanism: 'Blocks α2-adrenergic autoreceptors and 5-HT2/5-HT3 receptors, enhancing noradrenaline and serotonin',
                dosing: 'Adults: Start 15mg at night, increase after 1-2 weeks to 30mg, max 45mg daily',
                contraindications: 'MAOIs, mania, severe hepatic impairment',
                interactions: 'MAOIs, warfarin, alcohol (↑ sedation), tramadol',
                monitoring: 'FBC (especially first few months), weight, mood, sedation level',
                pregnancy: 'Use if benefit outweighs risk - limited safety data',
                sideEffects: 'Sedation (dose-related), weight gain, dry mouth, constipation, blood dyscrasias (rare)',
                pharmacokinetics: 'Half-life: 20-40h, hepatic metabolism',
                clinicalPearls: 'Paradoxical effect: more sedating at lower doses. Good for depression with insomnia/weight loss',
                indication: 'Depression (especially with anxiety, insomnia, or weight loss)'
            },
            'furosemide': {
                name: 'Furosemide',
                class: 'Loop diuretic',
                mechanism: 'Inhibits Na+/K+/2Cl- co-transporter in ascending limb of loop of Henle',
                dosing: 'Heart failure: Start 20-40mg daily, titrate to response. Oedema: 20-80mg daily. IV dose = half oral dose',
                contraindications: 'Anuria, severe electrolyte imbalance, hepatic coma',
                interactions: 'Lithium (↑ toxicity), digoxin (hypokalaemia ↑ toxicity), NSAIDs (↓ effect)',
                monitoring: 'U&Es, fluid balance, weight, hearing (high doses), postural BP',
                pregnancy: 'Use with caution - may cause placental hypoperfusion',
                sideEffects: 'Hypokalaemia, hyponatraemia, dehydration, ototoxicity (high doses), gout',
                pharmacokinetics: 'Oral onset: 1h, Peak: 1-2h, Duration: 6h. IV onset: 5min',
                clinicalPearls: 'Take in morning to avoid nocturia. Monitor K+ closely. Ototoxicity with high IV doses',
                indication: 'Heart failure, pulmonary oedema, hypertension (rarely used), ascites'
            },
            'spironolactone': {
                name: 'Spironolactone',
                class: 'Aldosterone receptor antagonist (potassium-sparing diuretic)',
                mechanism: 'Competitive antagonist of aldosterone at mineralocorticoid receptors',
                dosing: 'Heart failure: Start 25mg daily, max 50mg daily. Ascites: 100-400mg daily. Monitor K+ closely',
                contraindications: 'Hyperkalaemia (>5.0mmol/L), severe renal impairment, Addison\'s disease',
                interactions: 'ACE inhibitors/ARBs (↑ hyperkalaemia), potassium supplements, trimethoprim',
                monitoring: 'U&Es within 1 week, then monthly for 3 months, then 3-monthly. Gynaecomastia',
                pregnancy: 'Avoid - feminisation of male fetus',
                sideEffects: 'Hyperkalaemia, gynaecomastia, menstrual irregularities, GI upset',
                pharmacokinetics: 'Half-life: 1-2 days (active metabolites), onset of action: 2-3 days',
                clinicalPearls: 'K+-sparing effect. Check K+ before starting and monitor closely. Mortality benefit in heart failure',
                indication: 'Heart failure (with ACE-I + β-blocker), primary hyperaldosteronism, ascites'
            },
            'digoxin': {
                name: 'Digoxin',
                class: 'Cardiac glycoside',
                mechanism: 'Inhibits Na+/K+-ATPase pump, increases intracellular Ca2+, ↑ contractility, ↓ AV conduction',
                dosing: 'Loading: 10-15 micrograms/kg IV or PO. Maintenance: 125-250 micrograms daily (reduce in elderly/renal impairment)',
                contraindications: 'Ventricular arrhythmias, heart block, hypertrophic cardiomyopathy with outflow obstruction',
                interactions: 'Amiodarone (↑ levels), diuretics (hypokalaemia ↑ toxicity), verapamil, quinidine',
                monitoring: 'Digoxin levels (6h post-dose), U&Es, heart rate, rhythm, signs of toxicity',
                pregnancy: 'Safe - no teratogenic effects, adjust dose due to increased clearance',
                sideEffects: 'Nausea, vomiting, visual disturbances, arrhythmias, confusion (toxicity)',
                pharmacokinetics: 'Half-life: 36h (longer in renal impairment), mainly renal excretion',
                clinicalPearls: 'Narrow therapeutic window. Target level 1.0-2.0 micrograms/L. Toxicity common in elderly',
                indication: 'AF (rate control), heart failure (symptom control). No mortality benefit'
            },
            'cefalexin': {
                name: 'Cefalexin',
                class: 'First-generation cephalosporin antibiotic',
                mechanism: 'Inhibits bacterial cell wall synthesis by binding to penicillin-binding proteins',
                dosing: 'Adults: 250-500mg QDS. Severe infections: 1-1.5g QDS. Children: 25mg/kg BD (max 1g BD)',
                contraindications: 'Cephalosporin hypersensitivity. Caution if penicillin allergy (cross-reactivity 1-3%)',
                interactions: 'Probenecid (↑ levels), warfarin (may ↑ INR), metformin (monitor)',
                monitoring: 'Signs of allergic reaction, C.difficile-associated diarrhoea, renal function',
                pregnancy: 'Safe - no increased risk of congenital abnormalities',
                sideEffects: 'GI upset, diarrhoea, allergic reactions, CDAD, transient rise in LFTs',
                pharmacokinetics: 'Well absorbed orally, Half-life: 1h, mainly renal excretion',
                clinicalPearls: 'Good oral bioavailability. First-line for cellulitis in UK. Take with food if GI upset',
                indication: 'Skin/soft tissue infections, UTI, respiratory tract infections, prophylaxis'
            },
            'clarithromycin': {
                name: 'Clarithromycin',
                class: 'Macrolide antibiotic',
                mechanism: 'Inhibits bacterial protein synthesis by binding to 50S ribosomal subunit',
                dosing: 'Adults: 250-500mg BD. Severe infections: 500mg BD. H.pylori: 500mg BD with PPI and amoxicillin',
                contraindications: 'Macrolide hypersensitivity, myasthenia gravis, severe hepatic impairment',
                interactions: 'Warfarin (↑ INR), simvastatin (rhabdomyolysis risk), digoxin (↑ levels)',
                monitoring: 'LFTs if prolonged use, signs of cardiac arrhythmias, drug interactions',
                pregnancy: 'Use only if essential - crosses placenta but no evidence of harm',
                sideEffects: 'GI upset, metallic taste, QT prolongation, hepatotoxicity (rare)',
                pharmacokinetics: 'Well absorbed, Half-life: 3-7h, hepatic metabolism (CYP3A4)',
                clinicalPearls: 'Part of triple therapy for H.pylori. Good tissue penetration. Many drug interactions via CYP3A4',
                indication: 'Respiratory tract infections, H.pylori eradication, skin infections, atypical pneumonia'
            },
            'trimethoprim': {
                name: 'Trimethoprim',
                class: 'Folate synthesis inhibitor antibiotic',
                mechanism: 'Inhibits bacterial dihydrofolate reductase, preventing folate synthesis',
                dosing: 'UTI: 200mg BD for 3 days (uncomplicated) or 7 days (men/complicated). Prophylaxis: 100mg at night',
                contraindications: 'Folate deficiency, severe renal impairment, blood dyscrasias',
                interactions: 'Warfarin (↑ INR), methotrexate (↑ toxicity), ACE inhibitors (hyperkalaemia)',
                monitoring: 'FBC if prolonged use, U&Es (can cause hyperkalaemia), signs of folate deficiency',
                pregnancy: 'Avoid in first trimester (folate antagonist). Folate supplementation if essential',
                sideEffects: 'GI upset, skin rashes, hyperkalaemia, blood dyscrasias (rare)',
                pharmacokinetics: 'Well absorbed, Half-life: 10h, mainly renal excretion',
                clinicalPearls: 'First-line for uncomplicated UTI in women. Can cause hyperkalaemia especially with ACE-I',
                indication: 'UTI treatment and prophylaxis, pneumocystis pneumonia prophylaxis'
            },
            'co-amoxiclav': {
                name: 'Co-amoxiclav',
                class: 'Beta-lactam antibiotic with beta-lactamase inhibitor',
                mechanism: 'Amoxicillin inhibits cell wall synthesis, clavulanic acid protects against beta-lactamases',
                dosing: 'Adults: 625mg TDS or 1g BD. Severe infections: 1.2g TDS IV. Available as 375mg, 625mg tablets',
                contraindications: 'Penicillin allergy, previous cholestatic jaundice with co-amoxiclav',
                interactions: 'Warfarin (↑ INR), methotrexate (↑ toxicity), probenecid (↑ levels)',
                monitoring: 'LFTs (risk of cholestatic jaundice), signs of C.difficile colitis',
                pregnancy: 'Safe - no increased risk of congenital abnormalities',
                sideEffects: 'GI upset, diarrhoea, cholestatic jaundice (rare), skin reactions',
                pharmacokinetics: 'Well absorbed, Half-life: 1h, mainly renal excretion',
                clinicalPearls: 'Broad spectrum including beta-lactamase producers. Take with food to ↓ GI upset. Monitor LFTs',
                indication: 'Respiratory tract infections, skin/soft tissue infections, dental infections, UTI'
            },
            'nitrofurantoin': {
                name: 'Nitrofurantoin',
                class: 'Nitrofuran antibiotic',
                mechanism: 'Inhibits bacterial enzymes involved in carbohydrate metabolism',
                dosing: 'UTI treatment: 100mg BD for 3 days (women) or 7 days (men). Prophylaxis: 50-100mg at night',
                contraindications: 'eGFR <45ml/min/1.73m², pregnancy at term, G6PD deficiency, acute porphyria',
                interactions: 'Magnesium salts (↓ absorption), probenecid (↑ toxicity)',
                monitoring: 'Renal function, LFTs, signs of pulmonary toxicity (chronic use)',
                pregnancy: 'Safe except at term (risk of neonatal haemolysis)',
                sideEffects: 'GI upset, pulmonary toxicity (chronic use), peripheral neuropathy, hepatotoxicity',
                pharmacokinetics: 'Rapidly absorbed, concentrated in urine, Half-life: 20min',
                clinicalPearls: 'Excellent for uncomplicated UTI. Take with food. Avoid if eGFR <45. Urine may turn brown',
                indication: 'UTI treatment and prophylaxis. Not effective for pyelonephritis'
            },
            'losartan': {
                name: 'Losartan',
                class: 'Angiotensin receptor blocker (ARB)',
                mechanism: 'Selective antagonist of angiotensin II at AT1 receptors',
                dosing: 'Hypertension: Start 50mg daily, max 100mg daily. Heart failure: Start 12.5mg daily, target 150mg daily',
                contraindications: 'Pregnancy, bilateral renal artery stenosis, severe renal impairment',
                interactions: 'NSAIDs (↓ efficacy), potassium supplements (hyperkalemia), lithium (↑ levels)',
                monitoring: 'eGFR, potassium, blood pressure. Check 1-2 weeks after starting',
                pregnancy: 'Contraindicated - teratogenic in 2nd/3rd trimester',
                sideEffects: 'Dizziness, hyperkalemia, dry cough (less than ACE-I), angioedema (rare)',
                pharmacokinetics: 'Prodrug, active metabolite half-life: 6-9h, hepatic metabolism',
                clinicalPearls: 'Alternative to ACE inhibitor if cough. Less cough than ACE-I but more expensive',
                indication: 'Hypertension, heart failure, diabetic nephropathy, post-MI (ACE-I intolerant)'
            },
            'aspirin': {
                name: 'Aspirin',
                class: 'Non-selective COX inhibitor/Antiplatelet agent',
                mechanism: 'Irreversibly inhibits COX-1, reducing TXA2 production and platelet aggregation',
                dosing: 'Cardioprotection: 75mg daily. Acute MI: 300mg STAT, then 75mg daily. Pain: 300-900mg QDS',
                contraindications: 'Active bleeding, severe heart failure, children <16 years (Reye\'s syndrome)',
                interactions: 'Warfarin (↑ bleeding), methotrexate (↑ toxicity), ACE inhibitors (↓ efficacy)',
                monitoring: 'Signs of bleeding, renal function, hearing (high doses)',
                pregnancy: 'Low-dose safe. Avoid high-dose in 3rd trimester (closure of ductus arteriosus)',
                sideEffects: 'GI bleeding, bronchospasm (asthma), tinnitus (high doses), Reye\'s syndrome (children)',
                pharmacokinetics: 'Rapidly absorbed, irreversible COX inhibition, platelet effect lasts 7-10 days',
                clinicalPearls: 'Dual antiplatelet therapy with clopidogrel post-ACS. Gastro-protection if high risk',
                indication: 'Secondary prevention of CVD, acute coronary syndromes, ischaemic stroke'
            },
            'morphine': {
                name: 'Morphine',
                class: 'Opioid analgesic',
                mechanism: 'Mu-opioid receptor agonist in CNS and peripheral tissues',
                dosing: 'Oral: 5-10mg 4-hourly PRN. IV: 2.5-10mg slowly. MST: 10-30mg BD (opioid-naive)',
                contraindications: 'Respiratory depression, acute abdomen, severe asthma, raised ICP',
                interactions: 'Alcohol/sedatives (↑ sedation), MAOIs (avoid), gabapentinoids (↑ sedation)',
                monitoring: 'Respiratory rate, sedation level, bowel function, pain scores',
                pregnancy: 'Use with caution - neonatal withdrawal syndrome possible',
                sideEffects: 'Respiratory depression, sedation, nausea, constipation, euphoria, dependence',
                pharmacokinetics: 'Oral bioavailability: 30%, Half-life: 2-4h, hepatic metabolism',
                clinicalPearls: 'Always prescribe laxatives. Start low in elderly/renal impairment. Naloxone reverses effects',
                indication: 'Severe pain, acute MI, acute pulmonary oedema, palliative care'
            },
            'metronidazole': {
                name: 'Metronidazole',
                class: 'Nitroimidazole antibiotic',
                mechanism: 'Disrupts DNA synthesis in anaerobic bacteria and protozoa',
                dosing: 'Oral: 400mg TDS for 5-7 days. IV: 500mg TDS. C.diff: 400mg TDS for 10-14 days',
                contraindications: 'Hypersensitivity, first trimester pregnancy, disulfiram reaction with alcohol',
                interactions: 'Warfarin (↑ INR), alcohol (disulfiram-like reaction), lithium (↑ levels)',
                monitoring: 'Signs of peripheral neuropathy with prolonged use, avoid alcohol',
                pregnancy: 'Avoid in first trimester. Use with caution thereafter',
                sideEffects: 'Metallic taste, nausea, disulfiram reaction with alcohol, peripheral neuropathy (prolonged use)',
                pharmacokinetics: 'Well absorbed orally, CSF penetration, hepatic metabolism',
                clinicalPearls: 'Excellent anaerobic cover. Avoid alcohol during and 48h after treatment. Turns urine dark',
                indication: 'Anaerobic infections, C.difficile colitis, H.pylori eradication, bacterial vaginosis'
            },
            'diazepam': {
                name: 'Diazepam',
                class: 'Benzodiazepine',
                mechanism: 'Enhances GABA-A receptor activity, increasing chloride influx and neuronal inhibition',
                dosing: 'Anxiety: 2-5mg TDS. Status epilepticus: 10-20mg IV slowly. Muscle spasm: 2-15mg daily',
                contraindications: 'Respiratory depression, severe hepatic impairment, myasthenia gravis, sleep apnoea',
                interactions: 'Alcohol (↑ sedation), opioids (respiratory depression), phenytoin (variable)',
                monitoring: 'Respiratory function, level of sedation, signs of dependence',
                pregnancy: 'Avoid - risk of floppy baby syndrome and withdrawal in neonate',
                sideEffects: 'Sedation, ataxia, confusion (elderly), dependence, respiratory depression',
                pharmacokinetics: 'Long half-life: 20-100h (including active metabolites), hepatic metabolism',
                clinicalPearls: 'Long-acting benzodiazepine. High dependence potential. Flumazenil reverses effects',
                indication: 'Status epilepticus, severe anxiety, alcohol withdrawal, muscle spasm'
            },
            'adrenaline': {
                name: 'Adrenaline (Epinephrine)',
                class: 'Sympathomimetic (α and β agonist)',
                mechanism: 'Non-selective α and β adrenergic agonist causing vasoconstriction and inotropy',
                dosing: 'Anaphylaxis: 500mcg IM (0.5ml of 1:1000). Cardiac arrest: 1mg IV (1ml of 1:1000)',
                contraindications: 'None in life-threatening situations. Caution with severe hypertension',
                interactions: 'β-blockers (unopposed α effects), tricyclics (arrhythmias), MAOIs',
                monitoring: 'Heart rate, blood pressure, ECG, blood glucose',
                pregnancy: 'Safe in life-threatening situations',
                sideEffects: 'Tachycardia, hypertension, arrhythmias, tremor, anxiety, hyperglycaemia',
                pharmacokinetics: 'Rapid onset, short duration: 5-10min, metabolised by COMT/MAO',
                clinicalPearls: 'First-line for anaphylaxis. IM route for anaphylaxis, IV for cardiac arrest. Check expiry dates',
                indication: 'Anaphylaxis, cardiac arrest, severe asthma (nebulised), local anaesthetic adjunct'
            },
            'gliclazide': {
                name: 'Gliclazide',
                class: 'Sulfonylurea',
                mechanism: 'Stimulates insulin release from pancreatic β-cells by blocking K-ATP channels',
                dosing: 'Standard release: 40-80mg daily with breakfast, max 320mg daily. MR: 30-120mg daily',
                contraindications: 'Type 1 diabetes, ketoacidosis, severe renal/hepatic impairment',
                interactions: 'Alcohol (↑ hypoglycaemia), β-blockers (mask hypoglycaemia), steroids (↑ glucose)',
                monitoring: 'Blood glucose, HbA1c, weight, signs of hypoglycaemia',
                pregnancy: 'Switch to insulin - crosses placenta',
                sideEffects: 'Hypoglycaemia, weight gain, GI upset, skin reactions',
                pharmacokinetics: 'Half-life: 10-20h, hepatic metabolism, renal excretion',
                clinicalPearls: 'Second-line after metformin. Take with food. Lower hypoglycaemia risk than glibenclamide',
                indication: 'Type 2 diabetes (when metformin contraindicated/not tolerated or as add-on)'
            },
            'insulin': {
                name: 'Insulin (Human)',
                class: 'Hormone replacement therapy',
                mechanism: 'Replaces endogenous insulin, promoting glucose uptake and protein synthesis',
                dosing: 'Variable - basal: 0.2-0.4 units/kg/day. Bolus: carbohydrate counting. Sliding scale for acute illness',
                contraindications: 'Hypoglycaemia. Caution in renal/hepatic impairment',
                interactions: 'β-blockers (mask hypoglycaemia), steroids (↑ requirements), alcohol (↑ hypoglycaemia)',
                monitoring: 'Blood glucose, HbA1c, injection sites, weight, hypoglycaemia awareness',
                pregnancy: 'Safe - insulin of choice in pregnancy. Requirements increase',
                sideEffects: 'Hypoglycaemia, lipodystrophy, weight gain, local reactions',
                pharmacokinetics: 'Rapid-acting: onset 15min. Long-acting: 1-2h onset, 24h duration',
                clinicalPearls: 'Rotate injection sites. Store in fridge. Multiple types: rapid, short, intermediate, long-acting',
                indication: 'Type 1 diabetes, type 2 diabetes (various indications), diabetic ketoacidosis'
            },
            'naproxen': {
                name: 'Naproxen',
                class: 'Non-steroidal anti-inflammatory drug (NSAID)',
                mechanism: 'Non-selective cyclooxygenase inhibitor, reducing prostaglandin synthesis',
                dosing: 'Adults: 250-500mg BD with food (max 1.25g daily). Acute gout: 750mg, then 250mg TDS',
                contraindications: 'Active peptic ulceration, severe heart failure, severe renal impairment',
                interactions: 'ACE inhibitors (↓ efficacy), warfarin (↑ bleeding), lithium (↑ toxicity)',
                monitoring: 'Renal function, blood pressure, signs of GI bleeding',
                pregnancy: 'Avoid in 3rd trimester - risk of oligohydramnios and ductus arteriosus closure',
                sideEffects: 'GI bleeding, acute kidney injury, fluid retention, hypertension',
                pharmacokinetics: 'Long half-life: 12-15h, allows twice daily dosing, hepatic metabolism',
                clinicalPearls: 'Longer-acting NSAID allowing BD dosing. Take with food. PPI if high GI risk',
                indication: 'Inflammatory conditions, musculoskeletal pain, dysmenorrhoea, acute gout'
            },
            'codeine': {
                name: 'Codeine',
                class: 'Opioid analgesic',
                mechanism: 'Prodrug converted to morphine by CYP2D6, mu-opioid receptor agonist',
                dosing: 'Pain: 15-60mg QDS PRN. Cough: 15-30mg QDS. Diarrhoea: 30mg TDS-QDS',
                contraindications: 'Children <12 years, breastfeeding, severe respiratory disease, acute abdomen',
                interactions: 'Alcohol/sedatives (↑ sedation), MAOIs (avoid), CYP2D6 inhibitors (↓ efficacy)',
                monitoring: 'Respiratory rate, sedation level, bowel function, signs of dependence',
                pregnancy: 'Avoid near term - risk of neonatal respiratory depression',
                sideEffects: 'Constipation, nausea, sedation, respiratory depression, dependence',
                pharmacokinetics: 'Prodrug, 10% converted to morphine, half-life: 3-4h',
                clinicalPearls: 'Variable efficacy due to CYP2D6 polymorphisms. Always prescribe laxatives for regular use',
                indication: 'Mild to moderate pain, dry cough, diarrhoea'
            },
            'lithium': {
                name: 'Lithium',
                class: 'Mood stabiliser',
                mechanism: 'Unclear - affects neurotransmitter function and cellular signalling',
                dosing: 'Start 200-400mg daily, target level 0.6-1.0mmol/L for maintenance, 0.8-1.2mmol/L acute',
                contraindications: 'Severe renal/cardiac disease, Addison\'s disease, dehydration, pregnancy (1st trimester)',
                interactions: 'Diuretics (↑ toxicity), ACE inhibitors (↑ levels), NSAIDs (↑ levels), theophylline (↓ levels)',
                monitoring: 'Lithium levels weekly until stable, then 3-monthly. TFTs, U&Es, weight',
                pregnancy: 'Avoid 1st trimester (Ebstein\'s anomaly). Use with caution thereafter',
                sideEffects: 'Tremor, polyuria, weight gain, hypothyroidism, nephrotoxicity, teratogenicity',
                pharmacokinetics: 'Narrow therapeutic window, renal excretion, half-life: 12-27h',
                clinicalPearls: 'Regular level monitoring essential. Toxicity >1.5mmol/L. Maintain good hydration',
                indication: 'Bipolar disorder (acute treatment and prophylaxis), treatment-resistant depression'
            },
            'haloperidol': {
                name: 'Haloperidol',
                class: 'Typical antipsychotic',
                mechanism: 'Dopamine D2 receptor antagonist, primarily in mesolimbic pathway',
                dosing: 'Psychosis: 1.5-3mg BD-TDS. Acute agitation: 5-10mg IM. Elderly: start 0.5mg BD',
                contraindications: 'Comatose states, severe CNS depression, Parkinson\'s disease',
                interactions: 'Alcohol (↑ sedation), anticholinergics (↑ side effects), carbamazepine (↓ levels)',
                monitoring: 'Extrapyramidal side effects, prolactin levels, ECG (QT interval), FBC',
                pregnancy: 'Use only if essential - limited safety data',
                sideEffects: 'Extrapyramidal effects, tardive dyskinesia, sedation, hyperprolactinaemia, QT prolongation',
                pharmacokinetics: 'Half-life: 12-38h, hepatic metabolism, high first-pass effect',
                clinicalPearls: 'High risk of extrapyramidal effects. Consider anticholinergic for acute dystonia',
                indication: 'Schizophrenia, acute psychosis, severe agitation, nausea/vomiting (low dose)'
            },
            'flucloxacillin': {
                name: 'Flucloxacillin',
                class: 'Penicillinase-resistant penicillin',
                mechanism: 'β-lactam antibiotic - inhibits cell wall synthesis, resistant to β-lactamases',
                dosing: 'Oral: 250-500mg QDS on empty stomach. IV: 0.25-2g QDS. Severe infections: up to 8g daily',
                contraindications: 'Penicillin allergy, previous flucloxacillin-induced hepatitis',
                interactions: 'Warfarin (may ↑ INR), methotrexate (↑ toxicity), probenecid (↑ levels)',
                monitoring: 'LFTs (risk of cholestatic hepatitis), signs of allergic reaction',
                pregnancy: 'Safe - no evidence of harm',
                sideEffects: 'GI upset, allergic reactions, cholestatic hepatitis (rare but serious), CDAD',
                pharmacokinetics: 'Variable oral absorption, half-life: 1h, mainly renal excretion',
                clinicalPearls: 'First-line for staphylococcal infections. Take on empty stomach. Monitor LFTs',
                indication: 'Staphylococcal infections (cellulitis, bone/joint infections), endocarditis prophylaxis'
            },
            'beclomethasone': {
                name: 'Beclomethasone',
                class: 'Inhaled corticosteroid',
                mechanism: 'Synthetic glucocorticoid with anti-inflammatory effects in airways',
                dosing: 'Adults: 200-800mcg daily in divided doses. Children: 100-400mcg daily. Use spacer device',
                contraindications: 'Hypersensitivity. Caution in active pulmonary TB',
                interactions: 'Few significant interactions due to low systemic absorption',
                monitoring: 'Growth in children, oral candidiasis, signs of systemic effects (high doses)',
                pregnancy: 'Safe - inhaled route minimises systemic exposure',
                sideEffects: 'Oral candidiasis, hoarse voice, growth retardation (children with high doses)',
                pharmacokinetics: 'Low systemic bioavailability (~20%), extensive first-pass metabolism',
                clinicalPearls: 'Brown/red preventer inhaler. Rinse mouth after use. Use spacer device. Regular use essential',
                indication: 'Asthma prophylaxis, COPD (in combination inhalers)'
            },
            'salmeterol': {
                name: 'Salmeterol',
                class: 'Long-acting β2-agonist (LABA)',
                mechanism: 'Selective β2-adrenoreceptor agonist with 12-hour duration of action',
                dosing: 'Adults: 25-50mcg BD via inhaler. Always used with inhaled corticosteroid',
                contraindications: 'Hypersensitivity. Never use as monotherapy in asthma',
                interactions: 'β-blockers (antagonism), diuretics (hypokalaemia), theophylline',
                monitoring: 'Peak flow, asthma control, signs of paradoxical bronchospasm',
                pregnancy: 'Safe - no evidence of harm',
                sideEffects: 'Tremor, palpitations, headache, paradoxical bronchospasm',
                pharmacokinetics: 'Onset: 10-20min, Peak: 3-4h, Duration: 12h',
                clinicalPearls: 'Always combined with ICS. Not for acute relief. Green accuhaler common in UK',
                indication: 'Asthma (step 3+ therapy with ICS), COPD (combination inhalers)'
            },
            'amiodarone': {
                name: 'Amiodarone',
                class: 'Class III antiarrhythmic',
                mechanism: 'Blocks potassium channels, prolongs action potential and refractory period',
                dosing: 'Loading: 200mg TDS for 1 week, then 200mg BD for 1 week. Maintenance: 200mg daily',
                contraindications: 'Sinus bradycardia, heart block, thyroid disease, iodine allergy',
                interactions: 'Warfarin (↑ INR), digoxin (↑ levels), β-blockers (bradycardia), many others',
                monitoring: 'TFTs, LFTs, CXR, ECG, visual symptoms. Pre-treatment: TFTs, LFTs, CXR',
                pregnancy: 'Avoid - neonatal hypo/hyperthyroidism, bradycardia',
                sideEffects: 'Pulmonary fibrosis, thyroid dysfunction, hepatotoxicity, corneal deposits, skin discolouration',
                pharmacokinetics: 'Very long half-life: 20-100 days, extensive tissue distribution',
                clinicalPearls: 'Many serious side effects. Regular monitoring essential. Sun protection (photosensitivity)',
                indication: 'Life-threatening arrhythmias, AF (when other drugs fail), VT/VF'
            },
            'folic acid': {
                name: 'Folic Acid',
                class: 'Vitamin supplement',
                mechanism: 'Synthetic form of folate, essential for DNA synthesis and red cell production',
                dosing: 'Deficiency: 5mg daily. Pregnancy: 400mcg daily (5mg if high risk). With methotrexate: 5mg weekly',
                contraindications: 'Megaloblastic anaemia until B12 deficiency excluded',
                interactions: 'Methotrexate (antagonistic - given on different days), phenytoin (↓ levels)',
                monitoring: 'FBC, B12 levels (must exclude B12 deficiency first)',
                pregnancy: 'Essential - prevents neural tube defects. Start pre-conception',
                sideEffects: 'Generally well tolerated. May mask B12 deficiency',
                pharmacokinetics: 'Well absorbed, stored in liver, renal excretion',
                clinicalPearls: 'Always check B12 before treating megaloblastic anaemia. Take with methotrexate day+1',
                indication: 'Folate deficiency, pregnancy/pre-conception, with methotrexate therapy'
            },
            'naloxone': {
                name: 'Naloxone',
                class: 'Opioid antagonist',
                mechanism: 'Competitive antagonist at mu-opioid receptors, reversing opioid effects',
                dosing: 'IV: 400mcg-2mg, repeat every 2-3min. IM: 400mcg. Infusion: 4mcg/kg/h',
                contraindications: 'Hypersensitivity. Caution in opioid-dependent patients (withdrawal)',
                interactions: 'Reverses all opioid effects including analgesia',
                monitoring: 'Respiratory rate, consciousness level, blood pressure, pain levels',
                pregnancy: 'Safe - no evidence of harm',
                sideEffects: 'Opioid withdrawal syndrome, hypertension, arrhythmias, pulmonary oedema',
                pharmacokinetics: 'Rapid onset: 1-2min IV, Duration: 30-60min (shorter than many opioids)',
                clinicalPearls: 'Shorter duration than most opioids - may need repeat doses. Titrate to respiratory rate',
                indication: 'Opioid overdose, reversal of opioid-induced respiratory depression'
            },
            'atropine': {
                name: 'Atropine',
                class: 'Antimuscarinic',
                mechanism: 'Competitive antagonist at muscarinic acetylcholine receptors',
                dosing: 'Bradycardia: 500mcg IV, repeat if necessary (max 3mg). Pre-med: 300-600mcg IM',
                contraindications: 'Narrow-angle glaucoma, prostatic enlargement, paralytic ileus',
                interactions: 'Tricyclics (↑ antimuscarinic effects), antihistamines (↑ sedation)',
                monitoring: 'Heart rate, blood pressure, pupil size, mental state',
                pregnancy: 'Safe - crosses placenta but no evidence of harm',
                sideEffects: 'Dry mouth, blurred vision, urinary retention, confusion, tachycardia',
                pharmacokinetics: 'Rapid onset: 1-2min IV, Duration: 30min-4h depending on dose',
                clinicalPearls: 'Antidote for organophosphate poisoning. May cause paradoxical bradycardia at low doses',
                indication: 'Symptomatic bradycardia, organophosphate poisoning, pre-medication'
            },
            'levonorgestrel': {
                name: 'Levonorgestrel',
                class: 'Synthetic progestogen',
                mechanism: 'Progesterone receptor agonist, prevents/delays ovulation and affects endometrium',
                dosing: 'Emergency contraception: 1.5mg STAT (within 72h). IUS: 52mg over 5 years',
                contraindications: 'Pregnancy, severe liver disease, undiagnosed vaginal bleeding',
                interactions: 'Enzyme inducers (↓ efficacy - may need higher dose), ritonavir',
                monitoring: 'Pregnancy test if period late, BP with IUS, bleeding patterns',
                pregnancy: 'Contraindicated - stop if pregnancy occurs',
                sideEffects: 'Nausea, headache, breast tenderness, irregular bleeding, mood changes',
                pharmacokinetics: 'Rapid absorption, half-life: 24-32h, hepatic metabolism',
                clinicalPearls: 'Most effective within 12h of unprotected intercourse. Available OTC as emergency contraception',
                indication: 'Emergency contraception, long-term contraception (IUS), menorrhagia'
            },
            'ferrous sulfate': {
                name: 'Ferrous Sulfate',
                class: 'Iron supplement',
                mechanism: 'Provides elemental iron for haemoglobin synthesis and correction of iron deficiency',
                dosing: 'Adults: 200mg (65mg elemental iron) BD-TDS on empty stomach. Prophylaxis: 200mg daily',
                contraindications: 'Haemochromatosis, haemosiderosis, non-iron deficiency anaemia',
                interactions: 'Tetracyclines (↓ absorption both), levothyroxine (separate by 4h), antacids (↓ absorption)',
                monitoring: 'FBC, iron studies, signs of iron overload with prolonged use',
                pregnancy: 'Safe and recommended - increased iron requirements',
                sideEffects: 'GI upset, constipation, diarrhoea, black stools, nausea',
                pharmacokinetics: 'Best absorbed on empty stomach, vitamin C enhances absorption',
                clinicalPearls: 'Take with orange juice (vitamin C). Black stools are normal. Continue 3 months after Hb normal',
                indication: 'Iron deficiency anaemia, prophylaxis in pregnancy/menorrhagia'
            },
            'colecalciferol': {
                name: 'Colecalciferol (Vitamin D3)',
                class: 'Vitamin supplement',
                mechanism: 'Precursor to active vitamin D, essential for calcium absorption and bone health',
                dosing: 'Deficiency: 6000 units daily for 8 weeks. Maintenance: 800-2000 units daily',
                contraindications: 'Hypercalcaemia, severe renal impairment, sarcoidosis',
                interactions: 'Thiazides (↑ hypercalcaemia risk), digoxin (hypercalcaemia ↑ toxicity)',
                monitoring: 'Serum calcium, 25-OH vitamin D levels',
                pregnancy: 'Safe - 400 units daily recommended',
                sideEffects: 'Hypercalcaemia, hypercalciuria, nausea, constipation (overdose)',
                pharmacokinetics: 'Fat-soluble, stored in adipose tissue, half-life: 2-3 weeks',
                clinicalPearls: 'Increasingly prescribed due to widespread deficiency. Take with fatty meal for absorption',
                indication: 'Vitamin D deficiency, osteoporosis prevention, general health maintenance'
            },
            'tramadol': {
                name: 'Tramadol',
                class: 'Atypical opioid analgesic',
                mechanism: 'Weak mu-opioid agonist + inhibits serotonin/noradrenaline reuptake',
                dosing: 'Immediate release: 50-100mg QDS PRN (max 400mg daily). MR: 100-400mg daily',
                contraindications: 'Epilepsy, head injury, concurrent MAOIs, severe respiratory depression',
                interactions: 'MAOIs (serotonin syndrome), SSRIs (↑ seizure risk), carbamazepine (↓ efficacy)',
                monitoring: 'Seizure risk, respiratory depression, signs of dependence',
                pregnancy: 'Avoid - risk of neonatal withdrawal syndrome',
                sideEffects: 'Nausea, dizziness, seizures, constipation, serotonin syndrome, dependence',
                pharmacokinetics: 'Active metabolite via CYP2D6, half-life: 5-7h',
                clinicalPearls: 'Lower respiratory depression than other opioids. Seizure risk especially with SSRIs',
                indication: 'Moderate pain when paracetamol/NSAIDs insufficient'
            },
            'rivaroxaban': {
                name: 'Rivaroxaban',
                class: 'Direct oral anticoagulant (DOAC) - Factor Xa inhibitor',
                mechanism: 'Direct, selective inhibition of factor Xa in coagulation cascade',
                dosing: 'AF: 20mg daily with food. PE/DVT: 15mg BD for 3 weeks, then 20mg daily',
                contraindications: 'Active bleeding, severe renal impairment (CrCl <15ml/min), pregnancy',
                interactions: 'Strong CYP3A4 inhibitors (↑ levels), warfarin (↑ bleeding), NSAIDs (↑ bleeding)',
                monitoring: 'Renal function, signs of bleeding. No routine INR monitoring needed',
                pregnancy: 'Contraindicated - crosses placenta',
                sideEffects: 'Bleeding (major/minor), anaemia, nausea, elevated LFTs',
                pharmacokinetics: 'Peak: 2-4h, Half-life: 5-9h (longer in elderly), renal excretion 66%',
                clinicalPearls: 'Take with food to improve absorption. No antidote available (andexanet alfa limited availability)',
                indication: 'Atrial fibrillation, VTE treatment/prophylaxis, post-orthopedic surgery prophylaxis'
            },
            'apixaban': {
                name: 'Apixaban',
                class: 'Direct oral anticoagulant (DOAC) - Factor Xa inhibitor',
                mechanism: 'Direct, selective inhibition of factor Xa in coagulation cascade',
                dosing: 'AF: 5mg BD (2.5mg BD if ≥2 of: age ≥80, weight ≤60kg, creatinine ≥133). VTE: 10mg BD for 7 days, then 5mg BD',
                contraindications: 'Active bleeding, severe hepatic impairment, pregnancy, prosthetic valves',
                interactions: 'Strong CYP3A4 inhibitors (↓ dose), P-gp inducers (avoid), warfarin (↑ bleeding)',
                monitoring: 'Renal function, hepatic function, signs of bleeding. No routine coagulation monitoring',
                pregnancy: 'Contraindicated - limited safety data',
                sideEffects: 'Bleeding, anaemia, nausea, hypotension',
                pharmacokinetics: 'Peak: 3-4h, Half-life: 12h, multiple elimination pathways',
                clinicalPearls: 'Can be taken with or without food. Less renal clearance than rivaroxaban',
                indication: 'Atrial fibrillation stroke prevention, VTE treatment and prophylaxis'
            },
            'erythromycin': {
                name: 'Erythromycin',
                class: 'Macrolide antibiotic',
                mechanism: 'Inhibits bacterial protein synthesis by binding to 50S ribosomal subunit',
                dosing: 'Adults: 250-500mg QDS. Children: 25-50mg/kg daily in divided doses. Take before food',
                contraindications: 'Hypersensitivity to macrolides, concurrent use with ergot alkaloids',
                interactions: 'Warfarin (↑ INR), theophylline (↑ levels), carbamazepine (↑ levels), QT-prolonging drugs',
                monitoring: 'LFTs with prolonged use, signs of C.difficile colitis, hearing (high doses)',
                pregnancy: 'Safe - drug of choice for chlamydia in pregnancy',
                sideEffects: 'GI upset, QT prolongation, cholestatic hepatitis, tinnitus',
                pharmacokinetics: 'Variable oral absorption, half-life: 1-4h, hepatic metabolism',
                clinicalPearls: 'Take before food to improve absorption. Many drug interactions via CYP3A4',
                indication: 'Respiratory tract infections, skin infections, chlamydia, legionella'
            },
            'montelukast': {
                name: 'Montelukast',
                class: 'Leukotriene receptor antagonist',
                mechanism: 'Selective antagonist of cysteinyl leukotriene receptors in airways',
                dosing: 'Adults: 10mg daily in evening. Children 6-14y: 5mg daily. Children 2-5y: 4mg daily',
                contraindications: 'Hypersensitivity. Caution in neuropsychiatric disorders',
                interactions: 'Few significant interactions. Phenobarbital may ↓ levels',
                monitoring: 'Asthma control, mood changes, suicidal ideation, sleep disturbances',
                pregnancy: 'Limited data - use only if clearly needed',
                sideEffects: 'Headache, mood changes, sleep disturbances, suicidal ideation (rare)',
                pharmacokinetics: 'Well absorbed, peak: 3-4h, hepatic metabolism',
                clinicalPearls: 'Take in evening. Useful add-on therapy. Monitor for mood changes, especially in adolescents',
                indication: 'Asthma add-on therapy, exercise-induced asthma, allergic rhinitis'
            },
            'theophylline': {
                name: 'Theophylline',
                class: 'Methylxanthine bronchodilator',
                mechanism: 'Phosphodiesterase inhibition and adenosine receptor antagonism',
                dosing: 'MR preparation: 200-300mg BD. Adjust to therapeutic levels (10-20mg/L)',
                contraindications: 'Hypersensitivity, porphyria. Caution in cardiovascular disease',
                interactions: 'Ciprofloxacin (↑ levels), carbamazepine (↓ levels), smoking (↓ levels)',
                monitoring: 'Theophylline levels, signs of toxicity, heart rate, seizures',
                pregnancy: 'Use with caution - crosses placenta but appears safe',
                sideEffects: 'Nausea, headache, insomnia, arrhythmias, seizures (toxicity)',
                pharmacokinetics: 'Narrow therapeutic window, hepatic metabolism, wide individual variation',
                clinicalPearls: 'Narrow therapeutic window. Many factors affect levels (smoking, infections, drugs)',
                indication: 'Asthma/COPD (when other treatments inadequate), acute severe asthma'
            },
            'aciclovir': {
                name: 'Aciclovir',
                class: 'Antiviral agent',
                mechanism: 'Nucleoside analogue - inhibits viral DNA polymerase after phosphorylation by viral thymidine kinase',
                dosing: 'Herpes simplex: 200mg 5x daily for 5 days. Shingles: 800mg 5x daily for 7 days. IV: 5-10mg/kg TDS',
                contraindications: 'Hypersensitivity. Caution in renal impairment, dehydration',
                interactions: 'Nephrotoxic drugs (↑ nephrotoxicity), probenecid (↑ levels), mycophenolate',
                monitoring: 'Renal function, hydration status, neurological symptoms (high doses)',
                pregnancy: 'Safe - no evidence of teratogenicity',
                sideEffects: 'GI upset, headache, dizziness, acute kidney injury (IV), neurological effects (high doses)',
                pharmacokinetics: 'Variable oral absorption (15-30%), half-life: 2-3h, mainly renal excretion',
                clinicalPearls: 'Most effective when started within 72h of rash onset. Maintain good hydration',
                indication: 'Herpes simplex, varicella zoster, prophylaxis in immunocompromised'
            },
            'cetirizine': {
                name: 'Cetirizine',
                class: 'Second-generation antihistamine (H1-receptor antagonist)',
                mechanism: 'Selective H1-receptor antagonist with minimal CNS penetration',
                dosing: 'Adults: 10mg daily. Children 6-12y: 5mg daily. Children 2-6y: 2.5mg BD',
                contraindications: 'End-stage renal disease, hypersensitivity',
                interactions: 'Alcohol (may ↑ sedation), ritonavir (avoid), theophylline',
                monitoring: 'Sedation level, anticholinergic effects (rare)',
                pregnancy: 'Use with caution - limited safety data',
                sideEffects: 'Drowsiness (less than first-generation), dry mouth, headache, fatigue',
                pharmacokinetics: 'Well absorbed, half-life: 8h, minimal metabolism, renal excretion',
                clinicalPearls: 'Available OTC. Less sedating than chlorphenamine. Take in evening if causes drowsiness',
                indication: 'Allergic rhinitis, urticaria, allergic conjunctivitis'
            },
            'fluconazole': {
                name: 'Fluconazole',
                class: 'Triazole antifungal',
                mechanism: 'Inhibits fungal cytochrome P450 enzyme 14α-demethylase, disrupting ergosterol synthesis',
                dosing: 'Vaginal candidiasis: 150mg single dose. Oral candidiasis: 50mg daily for 7-14 days. Systemic: 400mg daily',
                contraindications: 'Hypersensitivity to azoles, concurrent terfenadine/astemizole',
                interactions: 'Warfarin (↑ INR), phenytoin (↑ levels), rifampicin (↓ fluconazole levels)',
                monitoring: 'LFTs with prolonged use, signs of hepatotoxicity, drug interactions',
                pregnancy: 'Single dose for thrush probably safe. Avoid high doses',
                sideEffects: 'GI upset, headache, skin rashes, hepatotoxicity (rare), QT prolongation',
                pharmacokinetics: 'Excellent oral bioavailability (90%), CSF penetration, renal excretion',
                clinicalPearls: 'Single dose treatment for vaginal thrush. Good CNS penetration for cryptococcal meningitis',
                indication: 'Candidiasis (vaginal, oral, systemic), cryptococcal meningitis, fungal prophylaxis'
            },
            'gabapentin': {
                name: 'Gabapentin',
                class: 'Gabapentinoid anticonvulsant',
                mechanism: 'Binds to α2δ subunit of voltage-gated calcium channels, reducing neurotransmitter release',
                dosing: 'Neuropathic pain: Start 300mg daily, increase to 300mg TDS, max 3.6g daily. Epilepsy: 300mg TDS initially',
                contraindications: 'Hypersensitivity. Caution in renal impairment, depression',
                interactions: 'Opioids (↑ sedation), alcohol (↑ CNS depression), antacids (↓ absorption)',
                monitoring: 'Mood changes, suicidal ideation, renal function, signs of abuse',
                pregnancy: 'Use only if essential - limited safety data',
                sideEffects: 'Sedation, dizziness, ataxia, weight gain, peripheral oedema, mood changes',
                pharmacokinetics: 'Non-linear absorption, half-life: 5-7h, renal excretion unchanged',
                clinicalPearls: 'Gradual dose escalation needed. No significant drug interactions. Potential for abuse',
                indication: 'Neuropathic pain, epilepsy (adjunct), restless leg syndrome'
            },
            'lansoprazole': {
                name: 'Lansoprazole',
                class: 'Proton pump inhibitor (PPI)',
                mechanism: 'Irreversibly inhibits gastric H+/K+-ATPase (proton pump)',
                dosing: 'GORD: 30mg daily. Peptic ulcer: 30mg daily for 4-8 weeks. H.pylori: 30mg BD with antibiotics',
                contraindications: 'Hypersensitivity to PPIs',
                interactions: 'Similar to omeprazole - clopidogrel, warfarin, digoxin',
                monitoring: 'Similar to omeprazole - B12, magnesium with long-term use',
                pregnancy: 'Generally safe - no increased malformation risk',
                sideEffects: 'Similar to omeprazole - headache, GI upset, long-term risks',
                pharmacokinetics: 'Enteric-coated, acid-labile, hepatic metabolism',
                clinicalPearls: 'Alternative to omeprazole. Take before food. Orodispersible tablets available',
                indication: 'GORD, peptic ulcer disease, H.pylori eradication, Zollinger-Ellison syndrome'
            },
            'chlorphenamine': {
                name: 'Chlorphenamine',
                class: 'First-generation antihistamine (H1-receptor antagonist)',
                mechanism: 'H1-receptor antagonist with anticholinergic and sedative properties',
                dosing: 'Adults: 4mg TDS-QDS. Children 1-2y: 1mg BD. Children 2-6y: 1mg QDS. IV: 10-20mg slowly',
                contraindications: 'MAOIs, severe liver disease, porphyria',
                interactions: 'Alcohol (↑ sedation), anticholinergics (↑ effects), MAOIs (avoid)',
                monitoring: 'Sedation level, anticholinergic effects, driving ability',
                pregnancy: 'Appears safe - no increased malformation risk',
                sideEffects: 'Sedation, dry mouth, blurred vision, urinary retention, confusion (elderly)',
                pharmacokinetics: 'Well absorbed, half-life: 12-15h, hepatic metabolism',
                clinicalPearls: 'Useful for acute allergic reactions. IM/IV route available for anaphylaxis adjunct',
                indication: 'Allergic reactions, urticaria, hay fever, insomnia (short-term)'
            },
            'dexamethasone': {
                name: 'Dexamethasone',
                class: 'Corticosteroid (glucocorticoid)',
                mechanism: 'Potent synthetic glucocorticoid with anti-inflammatory and immunosuppressive effects',
                dosing: 'Cerebral oedema: 4mg QDS. COVID-19: 6mg daily for 10 days. Croup: 150mcg/kg single dose',
                contraindications: 'Systemic infection (unless covering antimicrobials), live vaccines',
                interactions: 'Similar to prednisolone - warfarin, NSAIDs, vaccines',
                monitoring: 'Blood glucose, blood pressure, mood changes, infection signs',
                pregnancy: 'Use if essential - crosses placenta more than prednisolone',
                sideEffects: 'Similar to prednisolone but more potent - hyperglycaemia, immunosuppression',
                pharmacokinetics: 'Long half-life: 36-72h, potency: 25x hydrocortisone',
                clinicalPearls: '4x more potent than prednisolone. Minimal mineralocorticoid activity. Used in COVID-19',
                indication: 'Cerebral oedema, severe COVID-19, croup, severe inflammatory conditions'
            },
            'domperidone': {
                name: 'Domperidone',
                class: 'Dopamine D2-receptor antagonist (antiemetic)',
                mechanism: 'Peripheral dopamine D2-receptor antagonist - does not cross blood-brain barrier',
                dosing: 'Adults: 10mg TDS before meals. Max 30mg daily. Children: 250mcg/kg TDS',
                contraindications: 'Prolactinoma, GI obstruction, moderate-severe hepatic impairment',
                interactions: 'Ketoconazole (↑ levels), erythromycin (↑ levels), apomorphine',
                monitoring: 'ECG if cardiac risk factors, prolactin levels, cardiac arrhythmias',
                pregnancy: 'Limited data - use only if essential',
                sideEffects: 'Hyperprolactinaemia, galactorrhoea, QT prolongation, extrapyramidal effects (rare)',
                pharmacokinetics: 'First-pass metabolism, low CNS penetration, half-life: 7h',
                clinicalPearls: 'Preferred antiemetic in Parkinson\'s disease. Restricted to 7 days treatment',
                indication: 'Nausea, vomiting, gastroparesis, functional dyspepsia'
            },
            'cyclizine': {
                name: 'Cyclizine',
                class: 'Antihistamine antiemetic (H1-receptor antagonist)',
                mechanism: 'H1-receptor antagonist with anticholinergic properties affecting vestibular system',
                dosing: 'Adults: 50mg TDS PO/IM/IV. Children 6-12y: 25mg TDS. Motion sickness: 50mg before travel',
                contraindications: 'Severe heart failure, porphyria',
                interactions: 'Alcohol (↑ sedation), anticholinergics (↑ effects), opioids (↑ sedation)',
                monitoring: 'Sedation level, anticholinergic effects, fluid balance',
                pregnancy: 'Safe - commonly used for hyperemesis gravidarum',
                sideEffects: 'Sedation, dry mouth, blurred vision, constipation, urinary retention',
                pharmacokinetics: 'Well absorbed, half-life: 20h, hepatic metabolism',
                clinicalPearls: 'Useful for motion sickness and post-operative nausea. IV preparation causes less irritation than ondansetron',
                indication: 'Motion sickness, post-operative nausea/vomiting, vestibular disorders'
            },
            'ranitidine': {
                name: 'Ranitidine',
                class: 'H2-receptor antagonist',
                mechanism: 'Competitive antagonist of histamine H2-receptors in gastric parietal cells',
                dosing: 'GORD: 150mg BD or 300mg at night. Peptic ulcer: 300mg at night. Acute: 50mg IV TDS',
                contraindications: 'Hypersensitivity, porphyria',
                interactions: 'Warfarin (may ↑ INR), ketoconazole (↓ absorption), atazanavir',
                monitoring: 'Symptom relief, signs of gastric malignancy (prolonged use)',
                pregnancy: 'Safe - no evidence of harm',
                sideEffects: 'Generally well tolerated, headache, dizziness, GI upset, confusion (elderly)',
                pharmacokinetics: 'Well absorbed, half-life: 2-3h, renal and hepatic elimination',
                clinicalPearls: 'Less effective than PPIs. Withdrawn in many countries due to NDMA contamination concerns',
                indication: 'GORD, peptic ulcer disease, stress ulcer prophylaxis'
            },
            'allopurinol': {
                name: 'Allopurinol',
                class: 'Xanthine oxidase inhibitor',
                mechanism: 'Inhibits xanthine oxidase, reducing uric acid production',
                dosing: 'Start 100mg daily, increase by 100mg every 2-4 weeks. Target <300 micromol/L. Max 900mg daily',
                contraindications: 'Acute gout attack, hypersensitivity, HLA-B*5801 positive (if known)',
                interactions: 'Azathioprine (↑ toxicity), warfarin (may ↑ INR), ACE inhibitors (hypersensitivity)',
                monitoring: 'Uric acid levels, LFTs, FBC, signs of hypersensitivity reaction',
                pregnancy: 'Avoid - limited safety data',
                sideEffects: 'Skin rashes, Stevens-Johnson syndrome, hepatotoxicity, blood dyscrasias',
                pharmacokinetics: 'Well absorbed, active metabolite oxypurinol, half-life: 18-30h',
                clinicalPearls: 'Never start during acute gout attack. Cover with colchicine/NSAID initially',
                indication: 'Gout prophylaxis, hyperuricaemia, tumour lysis syndrome prevention'
            },
            'phenytoin': {
                name: 'Phenytoin',
                class: 'Antiepileptic drug',
                mechanism: 'Blocks voltage-gated sodium channels, stabilizing neuronal membranes',
                dosing: 'Loading: 15-20mg/kg IV slowly. Maintenance: 300-400mg daily (adjust to levels)',
                contraindications: 'Heart block, sinus bradycardia, porphyria',
                interactions: 'Warfarin (variable), carbamazepine (↓ levels), numerous others',
                monitoring: 'Phenytoin levels (10-20mg/L), LFTs, FBC, folate, gum hyperplasia',
                pregnancy: 'Teratogenic - folate supplementation essential',
                sideEffects: 'Gum hyperplasia, hirsutism, acne, ataxia, nystagmus, confusion',
                pharmacokinetics: 'Zero-order kinetics at therapeutic doses, highly protein-bound',
                clinicalPearls: 'Narrow therapeutic window. Many drug interactions. IV administration requires cardiac monitoring',
                indication: 'Epilepsy, status epilepticus, trigeminal neuralgia'
            },
            'carbamazepine': {
                name: 'Carbamazepine',
                class: 'Antiepileptic drug',
                mechanism: 'Blocks voltage-gated sodium channels, stabilizes neuronal membranes',
                dosing: 'Start 100-200mg BD, increase slowly to 800-1200mg daily in divided doses',
                contraindications: 'AV block, porphyria, bone marrow depression',
                interactions: 'Warfarin (↓ effect), contraceptives (↓ efficacy), numerous CYP450 interactions',
                monitoring: 'FBC, LFTs, sodium levels, carbamazepine levels (4-12mg/L)',
                pregnancy: 'Teratogenic - folate supplementation, specialist advice',
                sideEffects: 'Diplopia, ataxia, hyponatraemia, blood dyscrasias, Stevens-Johnson syndrome',
                pharmacokinetics: 'Induces own metabolism, half-life decreases with time',
                clinicalPearls: 'Start low, go slow. Monitor for hyponatraemia. Many drug interactions',
                indication: 'Epilepsy, trigeminal neuralgia, bipolar disorder (second-line)'
            },
            'levodopa': {
                name: 'Levodopa/Carbidopa (Co-careldopa)',
                class: 'Dopaminergic drug for Parkinson\'s disease',
                mechanism: 'Levodopa converted to dopamine in brain; carbidopa prevents peripheral conversion',
                dosing: 'Start 62.5mg (50mg levodopa + 12.5mg carbidopa) TDS, increase gradually',
                contraindications: 'Narrow-angle glaucoma, melanoma, MAOIs',
                interactions: 'MAOIs (hypertensive crisis), antipsychotics (antagonism), iron (↓ absorption)',
                monitoring: 'Motor symptoms, dyskinesias, psychiatric symptoms, blood pressure',
                pregnancy: 'Use only if essential - limited safety data',
                sideEffects: 'Nausea, dyskinesias, psychiatric symptoms, postural hypotension',
                pharmacokinetics: 'Short half-life: 1-3h, extensive first-pass metabolism',
                clinicalPearls: 'Take 30min before food. Wearing-off effects develop over time. Protein meals reduce absorption',
                indication: 'Parkinson\'s disease, restless legs syndrome'
            },
            'methotrexate': {
                name: 'Methotrexate',
                class: 'Antimetabolite/Disease-modifying antirheumatic drug',
                mechanism: 'Inhibits dihydrofolate reductase, interfering with folate metabolism',
                dosing: 'Rheumatoid arthritis: 7.5-25mg weekly. Always prescribe folic acid 5mg weekly (day after MTX)',
                contraindications: 'Pregnancy, breastfeeding, severe renal/hepatic impairment, immunodeficiency',
                interactions: 'NSAIDs (↑ toxicity), trimethoprim (↑ toxicity), PPIs (↑ levels)',
                monitoring: 'FBC, LFTs, U&Es weekly initially, then monthly. CXR annually',
                pregnancy: 'Contraindicated - teratogenic and abortifacient',
                sideEffects: 'Bone marrow suppression, hepatotoxicity, pulmonary fibrosis, mucositis',
                pharmacokinetics: 'Variable absorption, renal excretion, polyglutamate forms accumulate',
                clinicalPearls: 'Always prescribe with folic acid. Stop if infection/illness. DMARD monitoring essential',
                indication: 'Rheumatoid arthritis, psoriasis, cancer (various), ectopic pregnancy'
            },
            'simvastatin': {
                name: 'Simvastatin',
                class: 'HMG-CoA reductase inhibitor (statin)',
                mechanism: 'Competitively inhibits HMG-CoA reductase, rate-limiting enzyme in cholesterol synthesis',
                dosing: 'Start 20mg at night, max 80mg daily. Usual maintenance: 20-40mg daily',
                contraindications: 'Active liver disease, pregnancy, breastfeeding',
                interactions: 'Amlodipine (max simvastatin 20mg), clarithromycin (rhabdomyolysis risk), grapefruit juice',
                monitoring: 'LFTs at baseline and 3 months, CK if muscle symptoms, lipid profile',
                pregnancy: 'Contraindicated - cholesterol essential for fetal development',
                sideEffects: 'Myalgia, rhabdomyolysis (rare), hepatotoxicity, diabetes risk',
                pharmacokinetics: 'Extensive first-pass metabolism, active metabolites, CYP3A4 substrate',
                clinicalPearls: 'Take at night (cholesterol synthesis peaks). Many drug interactions. Generic statin',
                indication: 'Hypercholesterolaemia, cardiovascular disease prevention'
            },
            'bendroflumethiazide': {
                name: 'Bendroflumethiazide',
                class: 'Thiazide-like diuretic',
                mechanism: 'Inhibits sodium-chloride cotransporter in distal convoluted tubule',
                dosing: 'Hypertension: 2.5mg daily (morning). Oedema: 5-10mg daily initially',
                contraindications: 'Anuria, severe renal/hepatic impairment, hypersensitivity to sulfonamides',
                interactions: 'Lithium (↑ toxicity), digoxin (hypokalaemia ↑ toxicity), NSAIDs (↓ effect)',
                monitoring: 'U&Es, glucose, uric acid, blood pressure',
                pregnancy: 'Avoid - may cause neonatal thrombocytopenia',
                sideEffects: 'Hyponatraemia, hypokalaemia, hyperuricaemia, glucose intolerance, impotence',
                pharmacokinetics: 'Onset: 2h, Peak: 4-6h, Duration: 12-18h',
                clinicalPearls: 'Most common thiazide in UK. Take in morning. 2.5mg often sufficient',
                indication: 'Hypertension, mild heart failure, oedema'
            },
            'omeprazole': {
                name: 'Omeprazole',
                class: 'Proton pump inhibitor (PPI)',
                mechanism: 'Irreversibly inhibits gastric H+/K+-ATPase (proton pump)',
                dosing: 'GORD: 20mg daily. Peptic ulcer: 20-40mg daily. H.pylori: 20mg BD with antibiotics',
                contraindications: 'Hypersensitivity to PPIs',
                interactions: 'Clopidogrel (↓ efficacy), warfarin (↑ INR), digoxin (↑ levels)',
                monitoring: 'Vitamin B12, magnesium with long-term use. Review need regularly',
                pregnancy: 'Generally safe - limited human data',
                sideEffects: 'Headache, GI upset, increased infection risk, hypomagnesaemia (long-term)',
                pharmacokinetics: 'Onset: 1h, Peak: 2h, Duration: 72h, CYP2C19 metabolism',
                clinicalPearls: 'First PPI available OTC in UK. Take 30min before food',
                indication: 'GORD, peptic ulcer disease, H.pylori eradication'
            },
            'prednisolone': {
                name: 'Prednisolone',
                class: 'Corticosteroid (glucocorticoid)',
                mechanism: 'Synthetic glucocorticoid with anti-inflammatory and immunosuppressive effects',
                dosing: 'Acute: 30-60mg daily, then taper. Maintenance: 5-15mg daily. Always taper gradually',
                contraindications: 'Systemic infection (unless life-threatening), live vaccines',
                interactions: 'Warfarin (variable effect), NSAIDs (↑ GI bleeding), vaccines (↓ response)',
                monitoring: 'Blood glucose, blood pressure, bone density, growth (children)',
                pregnancy: 'Use if essential - may cause cleft palate (first trimester)',
                sideEffects: 'Weight gain, mood changes, osteoporosis, diabetes, increased infection risk',
                pharmacokinetics: 'Half-life: 12-36h, oral bioavailability: 70%',
                clinicalPearls: 'Never stop abruptly. Take with food. Consider bone protection',
                indication: 'Asthma, COPD exacerbation, inflammatory conditions'
            },
            'salbutamol': {
                name: 'Salbutamol',
                class: 'Short-acting β2-agonist (SABA)',
                mechanism: 'Selective β2-adrenoreceptor agonist causing bronchodilation',
                dosing: 'Inhaler: 100-200mcg PRN, max 800mcg daily. Nebuliser: 2.5-5mg QDS',
                contraindications: 'Hypersensitivity. Caution in cardiovascular disease',
                interactions: 'β-blockers (antagonistic), digoxin (hypokalaemia), diuretics',
                monitoring: 'Peak flow, symptoms, heart rate, potassium (high doses)',
                pregnancy: 'Safe - drug of choice in pregnancy',
                sideEffects: 'Tremor, palpitations, headache, hypokalaemia (high doses)',
                pharmacokinetics: 'Inhaled onset: 5min, Duration: 3-5h',
                clinicalPearls: 'Blue inhaler. If using >3x/week, need preventer. Use spacer',
                indication: 'Asthma, COPD, hyperkalaemia (nebulised)'
            },
            'alendronic acid': {
                name: 'Alendronic Acid',
                class: 'Bisphosphonate',
                mechanism: 'Inhibits osteoclast-mediated bone resorption by binding to hydroxyapatite',
                dosing: 'Osteoporosis: 70mg weekly on empty stomach. Paget\'s disease: 40mg daily for 6 months',
                contraindications: 'Oesophageal abnormalities, hypocalcaemia, severe renal impairment',
                interactions: 'Calcium/iron/antacids (↓ absorption - separate by 2h), NSAIDs (↑ GI irritation)',
                monitoring: 'Calcium, phosphate, vitamin D levels. Dental health. Atypical fractures',
                pregnancy: 'Avoid - crosses placenta and may affect fetal bone development',
                sideEffects: 'Oesophageal irritation, osteonecrosis of jaw (rare), atypical fractures (rare)',
                pharmacokinetics: 'Poor oral absorption (<1%), long bone half-life (10+ years)',
                clinicalPearls: 'Take on empty stomach with full glass water. Stay upright 30min. Weekly dosing improves compliance',
                indication: 'Osteoporosis treatment/prevention, Paget\'s disease, steroid-induced osteoporosis'
            },
            'zopiclone': {
                name: 'Zopiclone',
                class: 'Z-drug (non-benzodiazepine hypnotic)',
                mechanism: 'Selective GABA-A receptor modulator at benzodiazepine binding site',
                dosing: 'Adults: 7.5mg at bedtime. Elderly: 3.75mg. Max 4 weeks treatment',
                contraindications: 'Severe respiratory insufficiency, myasthenia gravis, severe hepatic impairment',
                interactions: 'Alcohol (↑ sedation), opioids (respiratory depression), CYP3A4 inhibitors',
                monitoring: 'Sleep quality, daytime drowsiness, signs of dependence, memory problems',
                pregnancy: 'Avoid - risk of withdrawal symptoms in neonate',
                sideEffects: 'Metallic taste, daytime drowsiness, dependence, rebound insomnia, amnesia',
                pharmacokinetics: 'Rapid absorption, half-life: 5h, hepatic metabolism',
                clinicalPearls: 'Shorter course than benzodiazepines but still dependence risk. Distinctive metallic taste',
                indication: 'Short-term insomnia (max 4 weeks). Second-line to sleep hygiene measures'
            },
            'vancomycin': {
                name: 'Vancomycin',
                class: 'Glycopeptide antibiotic',
                mechanism: 'Inhibits bacterial cell wall synthesis by binding to D-alanyl-D-alanine terminals',
                dosing: 'IV: 15-20mg/kg BD (adjust to levels). Oral: 125mg QDS for C.diff. Target trough 15-20mg/L',
                contraindications: 'Hypersensitivity to glycopeptides',
                interactions: 'Aminoglycosides (↑ nephrotoxicity), loop diuretics (↑ ototoxicity)',
                monitoring: 'Trough levels, renal function, hearing, signs of red man syndrome',
                pregnancy: 'Use if essential - crosses placenta but appears safe',
                sideEffects: 'Red man syndrome, nephrotoxicity, ototoxicity, thrombophlebitis',
                pharmacokinetics: 'Poor oral absorption (for systemic use), renal excretion, half-life: 6h',
                clinicalPearls: 'MRSA first-line. Slow IV infusion to prevent red man syndrome. TDM essential',
                indication: 'MRSA infections, serious Gram-positive infections, C.difficile colitis (oral)'
            },
            'ciprofloxacin': {
                name: 'Ciprofloxacin',
                class: 'Fluoroquinolone antibiotic',
                mechanism: 'Inhibits bacterial DNA gyrase and topoisomerase IV',
                dosing: 'UTI: 250-500mg BD. Complicated infections: 400mg BD IV. Take 2h before/6h after dairy',
                contraindications: 'Epilepsy, G6PD deficiency, myasthenia gravis, children/pregnancy',
                interactions: 'Warfarin (↑ INR), theophylline (↑ levels), dairy products (↓ absorption)',
                monitoring: 'Tendon pain, CNS effects, QT interval, glucose (diabetics)',
                pregnancy: 'Avoid - arthropathy risk in developing cartilage',
                sideEffects: 'Tendon rupture, CNS effects, QT prolongation, photosensitivity, C.diff',
                pharmacokinetics: 'Good tissue penetration, half-life: 4h, renal/hepatic excretion',
                clinicalPearls: 'Broad spectrum but resistance increasing. Avoid dairy. Black box warning for tendons',
                indication: 'UTI, respiratory infections, GI infections, anthrax prophylaxis'
            },
            'lidocaine': {
                name: 'Lidocaine',
                class: 'Local anaesthetic (amide type)',
                mechanism: 'Blocks voltage-gated sodium channels, preventing nerve conduction',
                dosing: 'Local infiltration: max 4.5mg/kg (7mg/kg with adrenaline). Topical: 2-5% preparations',
                contraindications: 'Heart block, severe cardiac failure, hypersensitivity to amides',
                interactions: 'Beta-blockers (↑ toxicity), cimetidine (↑ levels), class I antiarrhythmics',
                monitoring: 'Signs of systemic toxicity, cardiac rhythm (IV use)',
                pregnancy: 'Safe for local use - does not cross placenta significantly',
                sideEffects: 'Local: burning, swelling. Systemic: CNS toxicity, cardiac arrhythmias',
                pharmacokinetics: 'Rapid onset: 2-5min, duration: 1-3h, hepatic metabolism',
                clinicalPearls: 'Most common local anaesthetic. Adrenaline prolongs duration. IV form for arrhythmias',
                indication: 'Local anaesthesia, topical anaesthesia, ventricular arrhythmias (IV)'
            },
            'sildenafil': {
                name: 'Sildenafil',
                class: 'Phosphodiesterase type 5 inhibitor',
                mechanism: 'Inhibits PDE5, increasing cGMP levels and causing smooth muscle relaxation',
                dosing: 'Erectile dysfunction: 50mg 1h before sexual activity. Pulmonary hypertension: 20mg TDS',
                contraindications: 'Nitrates, recent MI/stroke, severe hypotension, hereditary retinal disorders',
                interactions: 'Nitrates (severe hypotension), alpha-blockers (hypotension), CYP3A4 inhibitors',
                monitoring: 'Blood pressure, vision changes, priapism, cardiovascular status',
                pregnancy: 'Not applicable for ED indication. Limited data for pulmonary hypertension',
                sideEffects: 'Headache, flushing, dyspepsia, visual disturbances, priapism (rare)',
                pharmacokinetics: 'Rapid absorption, peak: 1h, half-life: 4h, hepatic metabolism',
                clinicalPearls: 'Never with nitrates. High-fat meals delay absorption. Seek help if erection >4h',
                indication: 'Erectile dysfunction, pulmonary arterial hypertension'
            },
            'senna': {
                name: 'Senna',
                class: 'Stimulant laxative',
                mechanism: 'Stimulates colonic motility by irritating enteric nervous system',
                dosing: 'Adults: 15mg (2 tablets) at bedtime. Children >6y: 7.5mg. Max 4 tablets daily',
                contraindications: 'Intestinal obstruction, acute abdominal conditions, severe dehydration',
                interactions: 'Digoxin (hypokalaemia may ↑ toxicity), diuretics (↑ fluid loss)',
                monitoring: 'Bowel movements, electrolyte balance with chronic use, abdominal pain',
                pregnancy: 'Avoid in first trimester. Small amounts enter breast milk',
                sideEffects: 'Abdominal cramps, diarrhoea, electrolyte imbalance (chronic use)',
                pharmacokinetics: 'Onset: 6-12h, metabolised by colonic bacteria to active form',
                clinicalPearls: 'Take at bedtime for morning effect. Avoid prolonged use (>1 week). Adequate fluid intake essential',
                indication: 'Constipation, bowel preparation, opioid-induced constipation'
            },
            'lactulose': {
                name: 'Lactulose',
                class: 'Osmotic laxative',
                mechanism: 'Non-absorbable disaccharide draws water into bowel lumen by osmosis',
                dosing: 'Constipation: 15ml BD initially, adjust to 1-2 soft stools daily. Hepatic encephalopathy: 30-50ml TDS',
                contraindications: 'Galactosaemia, intestinal obstruction',
                interactions: 'Few significant interactions. May affect absorption of other oral medications',
                monitoring: 'Bowel frequency, fluid balance, electrolytes (high doses)',
                pregnancy: 'Safe - not systemically absorbed',
                sideEffects: 'Flatulence, abdominal cramps, nausea, electrolyte disturbance (high doses)',
                pharmacokinetics: 'Not absorbed in small bowel, metabolised by colonic bacteria',
                clinicalPearls: 'Safe in pregnancy. Can take 2-3 days for effect. Useful in hepatic encephalopathy',
                indication: 'Constipation, hepatic encephalopathy'
            },
            'sumatriptan': {
                name: 'Sumatriptan',
                class: 'Serotonin 5-HT1 receptor agonist (triptan)',
                mechanism: 'Selective 5-HT1B/1D receptor agonist causing vasoconstriction and neuronal inhibition',
                dosing: 'Subcutaneous: 6mg, may repeat after 1h. Oral: 50-100mg, may repeat after 2h. Max 300mg/24h',
                contraindications: 'Ischaemic heart disease, cerebrovascular disease, uncontrolled hypertension',
                interactions: 'MAOIs (avoid), SSRIs (serotonin syndrome risk), ergot alkaloids',
                monitoring: 'Cardiovascular status, blood pressure, frequency of use (medication overuse headache)',
                pregnancy: 'Avoid - limited safety data',
                sideEffects: 'Injection site reactions, chest tightness, dizziness, fatigue, medication overuse headache',
                pharmacokinetics: 'Rapid onset SC: 10-15min, Oral: 30min, half-life: 2h',
                clinicalPearls: 'Most effective when taken early in attack. Limit to 2 days/week to avoid medication overuse',
                indication: 'Acute migraine treatment, cluster headache (subcutaneous)'
            },
            'empagliflozin': {
                name: 'Empagliflozin',
                class: 'SGLT2 inhibitor',
                mechanism: 'Inhibits sodium-glucose co-transporter 2 in proximal renal tubules',
                dosing: 'Type 2 diabetes: 10mg daily, may increase to 25mg. Heart failure: 10mg daily',
                contraindications: 'Type 1 diabetes, ketoacidosis, severe renal impairment (eGFR <30)',
                interactions: 'Diuretics (↑ volume depletion), insulin (↑ hypoglycaemia risk)',
                monitoring: 'eGFR, ketones if unwell, genital infections, volume status',
                pregnancy: 'Avoid - limited safety data',
                sideEffects: 'Genital infections, UTI, volume depletion, diabetic ketoacidosis (rare)',
                pharmacokinetics: 'Long half-life: 12h, renal excretion, minimal drug interactions',
                clinicalPearls: 'Cardiovascular benefits in diabetes. Stop during illness (sick day rules). Monitor for DKA',
                indication: 'Type 2 diabetes, heart failure with reduced ejection fraction'
            },
            'clopidogrel': {
                name: 'Clopidogrel',
                class: 'ADP receptor antagonist (antiplatelet)',
                mechanism: 'Irreversibly inhibits P2Y12 ADP receptor on platelets',
                dosing: 'Acute coronary syndrome: 600mg loading dose, then 75mg daily. Stroke prevention: 75mg daily',
                contraindications: 'Active bleeding, severe hepatic impairment',
                interactions: 'Warfarin (↑ bleeding), PPIs (may ↓ efficacy), CYP2C19 inhibitors',
                monitoring: 'Signs of bleeding, FBC, hepatic function',
                pregnancy: 'Avoid - limited safety data, bleeding risk',
                sideEffects: 'Bleeding, dyspepsia, rash, thrombotic thrombocytopenic purpura (rare)',
                pharmacokinetics: 'Prodrug requiring CYP2C19 activation, irreversible platelet inhibition',
                clinicalPearls: 'Dual antiplatelet therapy with aspirin post-ACS. Genetic testing for CYP2C19 variants',
                indication: 'Acute coronary syndromes, stroke prevention, peripheral vascular disease'
            },
            'enoxaparin': {
                name: 'Enoxaparin',
                class: 'Low molecular weight heparin (LMWH)',
                mechanism: 'Enhances antithrombin III activity, preferentially inhibiting factor Xa',
                dosing: 'VTE prophylaxis: 40mg daily SC. VTE treatment: 1.5mg/kg daily or 1mg/kg BD SC',
                contraindications: 'Active bleeding, thrombocytopenia, severe renal impairment',
                interactions: 'Anticoagulants (↑ bleeding), NSAIDs (↑ bleeding), antiplatelets',
                monitoring: 'Anti-Xa levels (if required), platelet count, signs of bleeding',
                pregnancy: 'Safe - does not cross placenta. Preferred anticoagulant in pregnancy',
                sideEffects: 'Bleeding, thrombocytopenia (HIT), injection site reactions, osteoporosis',
                pharmacokinetics: 'Subcutaneous bioavailability 90%, half-life: 4-7h, renal excretion',
                clinicalPearls: 'More predictable than unfractionated heparin. Pregnancy anticoagulant of choice',
                indication: 'VTE prophylaxis/treatment, acute coronary syndromes, pregnancy anticoagulation'
            },
            'ipratropium': {
                name: 'Ipratropium',
                class: 'Short-acting muscarinic antagonist (SAMA)',
                mechanism: 'Competitive antagonist of muscarinic receptors in bronchial smooth muscle',
                dosing: 'MDI: 40mcg QDS. Nebuliser: 250-500mcg QDS. Acute exacerbation: 500mcg nebulised',
                contraindications: 'Hypersensitivity to atropine or derivatives',
                interactions: 'Other anticholinergics (↑ anticholinergic effects)',
                monitoring: 'Bronchodilator response, anticholinergic side effects, eye symptoms',
                pregnancy: 'Safe - minimal systemic absorption',
                sideEffects: 'Dry mouth, cough, headache, paradoxical bronchospasm (rare)',
                pharmacokinetics: 'Minimal systemic absorption, onset: 15min, duration: 3-6h',
                clinicalPearls: 'Additive effect with beta-2 agonists. Avoid contact with eyes (glaucoma risk)',
                indication: 'COPD, severe asthma (add-on therapy), acute exacerbations'
            },
            'lorazepam': {
                name: 'Lorazepam',
                class: 'Short-acting benzodiazepine',
                mechanism: 'Enhances GABA-A receptor activity, increasing neuronal inhibition',
                dosing: 'Anxiety: 1-4mg daily in divided doses. Status epilepticus: 4mg IV slowly',
                contraindications: 'Respiratory depression, severe hepatic impairment, myasthenia gravis',
                interactions: 'Alcohol (↑ sedation), opioids (respiratory depression), phenytoin',
                monitoring: 'Respiratory function, sedation level, signs of dependence',
                pregnancy: 'Avoid - risk of floppy baby syndrome, neonatal withdrawal',
                sideEffects: 'Sedation, confusion (elderly), dependence, respiratory depression',
                pharmacokinetics: 'Intermediate half-life: 10-20h, conjugated (safer in elderly)',
                clinicalPearls: 'Shorter-acting than diazepam. Less affected by hepatic impairment. High dependence risk',
                indication: 'Short-term anxiety, status epilepticus, premedication'
            },
            'olanzapine': {
                name: 'Olanzapine',
                class: 'Atypical antipsychotic',
                mechanism: 'Dopamine D2, serotonin 5-HT2A receptor antagonist with multiple receptor activity',
                dosing: 'Schizophrenia: Start 10mg daily, range 5-20mg. Bipolar: 15mg daily, adjust 5-20mg',
                contraindications: 'Comatose states, severe CNS depression',
                interactions: 'Alcohol (↑ sedation), carbamazepine (↓ olanzapine levels), smoking (↓ levels)',
                monitoring: 'Weight, glucose, lipids, prolactin, FBC, LFTs, movement disorders',
                pregnancy: 'Use only if essential - risk of extrapyramidal symptoms in neonate',
                sideEffects: 'Weight gain, diabetes, dyslipidaemia, sedation, extrapyramidal effects (less than typical)',
                pharmacokinetics: 'Half-life: 30h, hepatic metabolism, smoking increases clearance',
                clinicalPearls: 'Lower EPS risk than haloperidol but significant metabolic effects. Regular monitoring essential',
                indication: 'Schizophrenia, bipolar disorder (acute mania), treatment-resistant depression'
            },
            'hyoscine': {
                name: 'Hyoscine Butylbromide',
                class: 'Antimuscarinic antispasmodic',
                mechanism: 'Competitive muscarinic receptor antagonist in smooth muscle',
                dosing: 'Abdominal cramps: 20mg QDS. IBS: 10mg TDS. IV: 20mg (bowel obstruction)',
                contraindications: 'Narrow-angle glaucoma, prostatic enlargement, myasthenia gravis',
                interactions: 'Other anticholinergics (↑ effects), tricyclics (↑ anticholinergic effects)',
                monitoring: 'Anticholinergic effects, bowel sounds, pain relief',
                pregnancy: 'Safe - does not cross blood-brain barrier significantly',
                sideEffects: 'Dry mouth, constipation, urinary retention, blurred vision',
                pharmacokinetics: 'Poor CNS penetration, half-life: 5h, minimal systemic effects',
                clinicalPearls: 'Brand name: Buscopan. Less CNS effects than atropine. Good for colicky pain',
                indication: 'Abdominal cramps, IBS, renal/biliary colic, bowel obstruction (palliative)'
            },
            'loperamide': {
                name: 'Loperamide',
                class: 'Opioid receptor agonist (antidiarrheal)',
                mechanism: 'Mu-opioid receptor agonist in gut, slows intestinal motility',
                dosing: 'Acute diarrhoea: 4mg initially, then 2mg after each loose stool (max 16mg daily)',
                contraindications: 'Acute dysentery, pseudomembranous colitis, ileus',
                interactions: 'Few significant interactions due to poor systemic absorption',
                monitoring: 'Stool frequency, signs of toxic megacolon, electrolyte balance',
                pregnancy: 'Safe - minimal systemic absorption',
                sideEffects: 'Constipation, abdominal cramps, dizziness, skin reactions',
                pharmacokinetics: 'Poor systemic absorption, undergoes extensive first-pass metabolism',
                clinicalPearls: 'Available OTC. Does not cross blood-brain barrier. Avoid in infectious diarrhoea',
                indication: 'Symptomatic treatment of acute and chronic diarrhoea'
            },
            'quinine': {
                name: 'Quinine',
                class: 'Antimalarial agent',
                mechanism: 'Interferes with parasitic DNA replication, affects calcium distribution in muscle',
                dosing: 'Malaria: 600mg TDS for 7 days. Cramps: 200-300mg at bedtime (unlicensed)',
                contraindications: 'Optic neuritis, tinnitus, myasthenia gravis, G6PD deficiency',
                interactions: 'Warfarin (↑ INR), digoxin (↑ levels), mefloquine (↑ seizure risk)',
                monitoring: 'Hearing, vision, blood glucose, cardiac rhythm, signs of cinchonism',
                pregnancy: 'Use with caution - may cause thrombocytopenia in neonate',
                sideEffects: 'Cinchonism (tinnitus, headache, nausea), hypoglycaemia, arrhythmias',
                pharmacokinetics: 'Half-life: 18h in malaria (shorter in healthy), hepatic metabolism',
                clinicalPearls: 'Unlicensed use for nocturnal cramps. Monitor for cinchonism. Resistance common',
                indication: 'Complicated malaria, nocturnal leg cramps (second-line)'
            },
            'hydrocortisone': {
                name: 'Hydrocortisone',
                class: 'Topical corticosteroid (mild potency)',
                mechanism: 'Anti-inflammatory glucocorticoid effects via cytoplasmic receptors',
                dosing: 'Topical: Apply thinly BD-QDS. Oral: 20-30mg daily in divided doses',
                contraindications: 'Viral skin infections, rosacea, perioral dermatitis (topical)',
                interactions: 'Minimal with topical use. Oral form: similar to prednisolone',
                monitoring: 'Skin atrophy with prolonged topical use, HPA axis suppression',
                pregnancy: 'Safe topically. Oral use: similar precautions to prednisolone',
                sideEffects: 'Topical: skin atrophy, striae. Oral: similar to other corticosteroids',
                pharmacokinetics: 'Topical absorption varies by site. Oral: short half-life 8-12h',
                clinicalPearls: 'Mildest topical steroid. Available OTC in low concentrations. Safe for face/children',
                indication: 'Eczema, dermatitis, insect bites, adrenal insufficiency (oral)'
            },
            'heparin': {
                name: 'Heparin',
                class: 'Anticoagulant (Unfractionated)',
                mechanism: 'Binds to antithrombin III, enhancing inactivation of thrombin and factor Xa',
                dosing: 'DVT/PE: Loading 80 units/kg IV, then 18 units/kg/h. Monitor APTT. Prophylaxis: 5000 units SC BD-TDS',
                contraindications: 'Active bleeding, severe thrombocytopenia, previous HIT, severe liver disease',
                interactions: 'Aspirin, warfarin (↑ bleeding risk), NSAIDS (↑ bleeding risk)',
                monitoring: 'APTT (target 1.5-2.5x control), platelet count (HIT screening), signs of bleeding',
                pregnancy: 'Safe - does not cross placenta. First-line anticoagulant in pregnancy',
                sideEffects: 'Bleeding, HIT, osteoporosis (long-term), alopecia, skin necrosis',
                pharmacokinetics: 'IV: immediate onset, t½ 1-2h. SC: onset 1-2h. Metabolism hepatic',
                clinicalPearls: 'Monitor for HIT. Reverse with protamine. Use anti-Xa levels if APTT unreliable',
                indication: 'DVT/PE treatment, ACS, AF, cardiac surgery, dialysis, stroke prevention'
            },
            'glyceryl-trinitrate': {
                name: 'Glyceryl Trinitrate (GTN)',
                class: 'Nitrate Vasodilator',
                mechanism: 'Releases nitric oxide causing smooth muscle relaxation and vasodilation',
                dosing: 'Angina: 400-800mcg SL PRN. IV: 10-200mcg/min. Topical: 2.5-5mg patches daily',
                contraindications: 'Severe aortic stenosis, hypertrophic cardiomyopathy, PDE5 inhibitor use',
                interactions: 'Sildenafil/PDE5 inhibitors (severe hypotension), alcohol (↑ hypotension)',
                monitoring: 'Blood pressure, heart rate, headache severity, nitrate tolerance',
                pregnancy: 'Use if benefits outweigh risks. Limited data but generally considered safe',
                sideEffects: 'Headache, hypotension, flushing, dizziness, nitrate tolerance',
                pharmacokinetics: 'SL: onset 2-5min, duration 30min. Patches: onset 30min, duration 12-14h',
                clinicalPearls: 'Nitrate-free period needed to prevent tolerance. Keep tablets in original container',
                indication: 'Angina, heart failure, hypertensive emergency, anal fissure'
            },
            'noradrenaline': {
                name: 'Noradrenaline',
                class: 'Sympathomimetic (Alpha/Beta agonist)',
                mechanism: 'Potent α1 and moderate β1 agonist causing vasoconstriction and increased contractility',
                dosing: 'IV infusion: 0.01-3mcg/kg/min via central line. Titrate to MAP >65mmHg',
                contraindications: 'Hypovolemia (relative), pregnancy (unless life-threatening), peripheral vascular disease',
                interactions: 'TCAs (↑ pressor response), MAOIs (↑ hypertensive crisis), halothane (arrhythmias)',
                monitoring: 'Blood pressure, heart rate, urine output, peripheral perfusion, ECG',
                pregnancy: 'Avoid unless life-threatening. May reduce uterine blood flow',
                sideEffects: 'Hypertension, arrhythmias, peripheral ischemia, tissue necrosis (extravasation)',
                pharmacokinetics: 'IV only. Onset immediate, duration 1-2min after stopping. Metabolized by COMT/MAO',
                clinicalPearls: 'First-line vasopressor in septic shock. Give via central line. Have phentolamine ready',
                indication: 'Septic shock, cardiogenic shock, severe hypotension, cardiac arrest'
            },
            'adenosine': {
                name: 'Adenosine',
                class: 'Antiarrhythmic (Purine nucleoside)',
                mechanism: 'Blocks AV node conduction by activating adenosine A1 receptors',
                dosing: 'Adult: 6mg IV bolus via large vein, then 12mg if needed, then 18mg. Pediatric: 0.1mg/kg',
                contraindications: 'Asthma/COPD, 2nd/3rd degree heart block, sick sinus syndrome, WPW with AF',
                interactions: 'Dipyridamole (↑ effect), theophylline (↓ effect), carbamazepine (↑ heart block)',
                monitoring: 'Continuous ECG, blood pressure, respiratory status',
                pregnancy: 'Safe - category C. Use if maternal benefit outweighs fetal risk',
                sideEffects: 'Chest pain, dyspnea, flushing, transient AV block, bronchospasm',
                pharmacokinetics: 'Very short half-life <10 seconds. Rapid cellular uptake and metabolism',
                clinicalPearls: 'Give fast IV push followed by saline flush. Warn patient of chest discomfort',
                indication: 'SVT termination, diagnostic test for broad complex tachycardia'
            },
            'magnesium-sulfate': {
                name: 'Magnesium Sulfate',
                class: 'Mineral supplement/Antiarrhythmic',
                mechanism: 'Essential cofactor for enzymes, membrane stabilizer, calcium channel blocker',
                dosing: 'Hypomagnesemia: 8mmol IV over 24h. Torsades: 8mmol IV over 10-15min. Eclampsia: 4g IV then 1g/h',
                contraindications: 'Severe renal impairment, myasthenia gravis, heart block',
                interactions: 'Digoxin (↓ efficacy), neuromuscular blockers (↑ paralysis), calcium channel blockers',
                monitoring: 'Serum magnesium, reflexes, respiratory rate, urine output, renal function',
                pregnancy: 'Safe and indicated for eclampsia/pre-eclampsia. Standard treatment',
                sideEffects: 'Hypotension, respiratory depression, areflexia, cardiac arrest (overdose)',
                pharmacokinetics: 'Onset 1-5min IV. Excreted unchanged by kidneys. t½ 3-4h',
                clinicalPearls: 'Check reflexes before each dose. Have calcium gluconate ready as antidote',
                indication: 'Eclampsia, torsades de pointes, hypomagnesemia, severe asthma'
            },
            'tranexamic-acid': {
                name: 'Tranexamic Acid',
                class: 'Antifibrinolytic',
                mechanism: 'Lysine analog that inhibits plasminogen activation and plasmin activity',
                dosing: 'Major bleeding: 1g IV over 10min, then 1g over 8h. Trauma: 1g IV then 1g over 8h within 3h',
                contraindications: 'Active thromboembolic disease, history of seizures, subarachnoid hemorrhage',
                interactions: 'Hormonal contraceptives (↑ thrombosis risk), factor IX complex concentrates',
                monitoring: 'Signs of thrombosis, renal function, visual disturbances',
                pregnancy: 'Generally safe. Used for postpartum hemorrhage. Category B',
                sideEffects: 'Nausea, diarrhea, thrombosis (rare), seizures (high dose), visual disturbances',
                pharmacokinetics: 'Peak 3h PO, 1h IV. 90% excreted unchanged in urine. t½ 2-3h',
                clinicalPearls: 'Most effective within 3h of trauma. Reduces mortality in major bleeding',
                indication: 'Major bleeding, trauma, menorrhagia, hereditary angioedema'
            },
            'calcium-gluconate': {
                name: 'Calcium Gluconate',
                class: 'Mineral replacement/Antidote',
                mechanism: 'Provides calcium ions essential for cardiac, skeletal muscle function and nerve transmission',
                dosing: 'Hypocalcemia: 10-20ml of 10% solution IV. Hyperkalemia: 10ml of 10% IV. Mg toxicity: 10-20ml IV',
                contraindications: 'Hypercalcemia, calcium kidney stones, digoxin toxicity',
                interactions: 'Digoxin (↑ toxicity), thiazides (↑ calcium), levothyroxine (↓ absorption)',
                monitoring: 'Serum calcium, phosphate, magnesium, ECG, signs of extravasation',
                pregnancy: 'Safe when clinically indicated. Essential mineral',
                sideEffects: 'Hypercalcemia, tissue necrosis (extravasation), bradycardia, hypotension',
                pharmacokinetics: 'IV: immediate effect. Calcium distributed to bones, excreted via kidneys',
                clinicalPearls: 'Preferred over calcium chloride peripherally. Give slowly to avoid arrhythmias',
                indication: 'Hypocalcemia, hyperkalemia, hypermagnesemia, calcium channel blocker overdose'
            },
            'ceftriaxone': {
                name: 'Ceftriaxone',
                class: 'Antibiotic (3rd generation cephalosporin)',
                mechanism: 'Inhibits bacterial cell wall synthesis by binding to penicillin-binding proteins',
                dosing: 'Adult: 1-2g daily IV/IM. Severe infections: 2g BD. Meningitis: 2g BD. Max 4g/day',
                contraindications: 'Hypersensitivity to cephalosporins, premature neonates, hyperbilirubinemia',
                interactions: 'Calcium-containing solutions (precipitation), warfarin (↑ INR), probenecid (↑ levels)',
                monitoring: 'Signs of infection resolution, renal function, LFTs, FBC, C.diff surveillance',
                pregnancy: 'Safe - category B. Crosses placenta but no known teratogenic effects',
                sideEffects: 'Diarrhea, rash, injection site reactions, gallbladder sludging, C.diff',
                pharmacokinetics: 'Good tissue penetration including CSF. t½ 6-9h. 50% renal excretion',
                clinicalPearls: 'Excellent CNS penetration. Once daily dosing. Avoid calcium solutions',
                indication: 'Pneumonia, meningitis, sepsis, gonorrhea, cellulitis, intra-abdominal infections'
            },
            'gentamicin': {
                name: 'Gentamicin',
                class: 'Antibiotic (Aminoglycoside)',
                mechanism: 'Inhibits bacterial protein synthesis by binding to 30S ribosomal subunit',
                dosing: 'Adult: 5-7mg/kg daily IV/IM. Adjust for renal function. Monitor levels - trough <2mg/L',
                contraindications: 'Myasthenia gravis, previous 8th nerve damage, severe renal impairment',
                interactions: 'Loop diuretics (↑ ototoxicity), vancomycin (↑ nephrotoxicity), muscle relaxants',
                monitoring: 'Renal function, hearing, balance, drug levels (peak/trough), urine output',
                pregnancy: 'Avoid - category D. Risk of 8th cranial nerve damage to fetus',
                sideEffects: 'Nephrotoxicity, ototoxicity (vestibular/auditory), neuromuscular blockade',
                pharmacokinetics: 'Poor oral absorption. Good tissue penetration. t½ 2-3h. 95% renal excretion',
                clinicalPearls: 'Once daily dosing preferred. Synergistic with beta-lactams. Monitor levels',
                indication: 'Serious gram-negative infections, endocarditis, sepsis, UTI, pneumonia'
            },
            'benzylpenicillin': {
                name: 'Benzylpenicillin',
                class: 'Antibiotic (Penicillin)',
                mechanism: 'Inhibits bacterial cell wall synthesis by binding to penicillin-binding proteins',
                dosing: 'Adult: 0.6-2.4g QDS IV/IM. Meningitis: 2.4g 4-hourly. Severe infections: up to 14.4g/day',
                contraindications: 'Penicillin allergy, previous severe allergic reaction',
                interactions: 'Probenecid (↑ levels), methotrexate (↑ toxicity), oral contraceptives (↓ efficacy)',
                monitoring: 'Signs of infection resolution, allergic reactions, renal function if high dose',
                pregnancy: 'Safe - category A. First-line for many infections in pregnancy',
                sideEffects: 'Allergic reactions (rash to anaphylaxis), diarrhea, injection site reactions',
                pharmacokinetics: 'Good tissue penetration. t½ 30min. Mainly renal excretion',
                clinicalPearls: 'First-line for streptococcal infections. Give IV for serious infections',
                indication: 'Meningitis, cellulitis, pneumonia, endocarditis, necrotizing fasciitis'
            },
            'clindamycin': {
                name: 'Clindamycin',
                class: 'Antibiotic (Lincosamide)',
                mechanism: 'Inhibits bacterial protein synthesis by binding to 50S ribosomal subunit',
                dosing: 'Adult: 150-450mg QDS PO or 0.6-2.7g daily IV in divided doses. Max 4.8g/day IV',
                contraindications: 'Previous C.diff colitis, severe liver disease, lincomycin allergy',
                interactions: 'Neuromuscular blockers (↑ paralysis), warfarin (↑ INR), ciclosporin',
                monitoring: 'Diarrhea/C.diff symptoms, liver function, infection resolution',
                pregnancy: 'Generally safe - category B. Limited placental transfer',
                sideEffects: 'C.diff colitis, diarrhea, rash, metallic taste, liver dysfunction',
                pharmacokinetics: 'Good tissue/bone penetration. t½ 2-3h. Hepatic metabolism',
                clinicalPearls: 'Excellent bone penetration. High C.diff risk. Stop if diarrhea develops',
                indication: 'Bone/joint infections, anaerobic infections, skin/soft tissue, dental infections'
            },
            'azithromycin': {
                name: 'Azithromycin',
                class: 'Antibiotic (Macrolide)',
                mechanism: 'Inhibits bacterial protein synthesis by binding to 50S ribosomal subunit',
                dosing: 'Adult: 500mg daily for 3 days PO or 500mg daily IV. Pneumonia: 500mg x 5 days',
                contraindications: 'Macrolide allergy, severe liver disease, QT prolongation',
                interactions: 'Warfarin (↑ INR), digoxin (↑ levels), simvastatin (↑ myopathy), QT drugs',
                monitoring: 'QT interval, liver function, infection resolution, hearing (high dose)',
                pregnancy: 'Safe - category B. First-line for chlamydia in pregnancy',
                sideEffects: 'GI upset, QT prolongation, hepatotoxicity, hearing loss (rare)',
                pharmacokinetics: 'Long tissue half-life 68h. Good intracellular penetration. Hepatic metabolism',
                clinicalPearls: 'Once daily dosing. Good atypical coverage. Short course therapy',
                indication: 'Atypical pneumonia, COPD exacerbations, chlamydia, URTI, skin infections'
            },
            'meropenem': {
                name: 'Meropenem',
                class: 'Antibiotic (Carbapenem)',
                mechanism: 'Inhibits bacterial cell wall synthesis, stable to most beta-lactamases',
                dosing: 'Adult: 0.5-1g TDS IV. Severe infections/meningitis: 2g TDS. Infuse over 15-30min',
                contraindications: 'Carbapenem allergy, severe penicillin allergy (cross-reactivity)',
                interactions: 'Probenecid (↑ levels), valproate (↓ seizure threshold), ganciclovir',
                monitoring: 'Renal function, seizure activity, infection resolution, C.diff surveillance',
                pregnancy: 'Safe - category B. Use when benefits outweigh risks',
                sideEffects: 'Diarrhea, nausea, headache, seizures (high dose/renal impairment), C.diff',
                pharmacokinetics: 'Excellent tissue penetration including CSF. t½ 1h. 70% renal excretion',
                clinicalPearls: 'Broad spectrum including ESBL producers. Lower seizure risk than imipenem',
                indication: 'Severe sepsis, complicated UTI, intra-abdominal infections, meningitis'
            },
            'piperacillin-tazobactam': {
                name: 'Piperacillin-Tazobactam',
                class: 'Antibiotic (Penicillin/Beta-lactamase inhibitor)',
                mechanism: 'Piperacillin inhibits cell wall synthesis; tazobactam inhibits beta-lactamases',
                dosing: 'Adult: 4.5g TDS IV over 30min. Severe infections: 4.5g QDS. Adjust for renal function',
                contraindications: 'Penicillin allergy, severe beta-lactam allergy',
                interactions: 'Probenecid (↑ levels), aminoglycosides (inactivation), warfarin (↑ INR)',
                monitoring: 'Renal function, infection resolution, allergic reactions, C.diff surveillance',
                pregnancy: 'Safe - category B. Use when clinically indicated',
                sideEffects: 'Diarrhea, rash, phlebitis, electrolyte disturbances, C.diff colitis',
                pharmacokinetics: 'Good tissue penetration. t½ 1h. 80% renal excretion unchanged',
                clinicalPearls: 'Broad spectrum anti-pseudomonal. Common empirical choice for sepsis',
                indication: 'Hospital-acquired pneumonia, complicated UTI, sepsis, neutropenic fever'
            },
            'metoclopramide': {
                name: 'Metoclopramide',
                class: 'Antiemetic/Prokinetic (Dopamine antagonist)',
                mechanism: 'Blocks dopamine D2 receptors in CTZ and enhances GI motility',
                dosing: 'Adult: 10mg TDS PO/IV/IM. Max 5 days treatment. Reduce dose in elderly/renal impairment',
                contraindications: 'GI obstruction, perforation, pheochromocytoma, prolactinoma, Parkinson\'s disease',
                interactions: 'Dopamine agonists (antagonism), CNS depressants, digoxin (↑ absorption)',
                monitoring: 'Neurological symptoms (tardive dyskinesia), cardiac conduction, renal function',
                pregnancy: 'Safe - category A. Commonly used for hyperemesis gravidarum',
                sideEffects: 'Extrapyramidal effects, tardive dyskinesia, drowsiness, depression, galactorrhea',
                pharmacokinetics: 'Onset 30min PO, 10min IV. t½ 4-6h. Hepatic metabolism, renal excretion',
                clinicalPearls: 'Limit to 5 days to reduce tardive dyskinesia risk. Give procyclidine for dystonia',
                indication: 'Nausea/vomiting, gastroparesis, migraine-associated nausea, postoperative nausea'
            },
            'ondansetron': {
                name: 'Ondansetron',
                class: 'Antiemetic (5-HT3 antagonist)',
                mechanism: 'Selective antagonist of 5-HT3 receptors in CTZ and vagal afferents',
                dosing: 'Adult: 4-8mg TDS PO/IV/IM. Chemotherapy: 8mg pre-chemo then 8mg BD. Max 32mg/day',
                contraindications: 'Congenital long QT syndrome, severe hepatic impairment',
                interactions: 'QT-prolonging drugs, apomorphine (severe hypotension), rifampicin (↓ efficacy)',
                monitoring: 'QT interval (especially IV), constipation, liver function',
                pregnancy: 'Generally safe - category B. Benefits usually outweigh risks',
                sideEffects: 'Constipation, headache, QT prolongation, hypersensitivity reactions',
                pharmacokinetics: 'Good oral bioavailability. t½ 3-6h. Hepatic metabolism (CYP3A4)',
                clinicalPearls: 'Most effective for chemotherapy-induced nausea. Check QT with IV use',
                indication: 'Chemotherapy-induced nausea, postoperative nausea, radiotherapy nausea'
            },
            'prochlorperazine': {
                name: 'Prochlorperazine',
                class: 'Antiemetic/Antipsychotic (Phenothiazine)',
                mechanism: 'Blocks dopamine D2 receptors in CTZ and has anticholinergic effects',
                dosing: 'Adult: 5-10mg TDS PO, 12.5mg IM, 25mg PR. Vertigo: 5mg TDS for 2 days then 5mg BD',
                contraindications: 'CNS depression, bone marrow depression, pheochromocytoma, young children',
                interactions: 'CNS depressants, anticholinergics, lithium (↑ extrapyramidal effects)',
                monitoring: 'Extrapyramidal symptoms, blood counts, hepatic function, cardiac conduction',
                pregnancy: 'Use with caution - category C. Potential extrapyramidal effects in neonate',
                sideEffects: 'Extrapyramidal effects, sedation, anticholinergic effects, tardive dyskinesia',
                pharmacokinetics: 'Good oral absorption. t½ 23h. Extensive hepatic metabolism',
                clinicalPearls: 'Effective for vertigo and labyrinthitis. Avoid in Parkinson\'s disease',
                indication: 'Nausea/vomiting, vertigo, migraine, schizophrenia (higher doses)'
            },
            'midazolam': {
                name: 'Midazolam',
                class: 'Benzodiazepine/Sedative',
                mechanism: 'GABA-A receptor agonist causing CNS depression and amnesia',
                dosing: 'Conscious sedation: 1-2.5mg IV slowly. Anaesthesia: 0.15-0.3mg/kg IV. Seizures: 0.2mg/kg IV/IM',
                contraindications: 'Severe respiratory depression, acute narrow-angle glaucoma, myasthenia gravis',
                interactions: 'CNS depressants (↑ sedation), CYP3A4 inhibitors (↑ levels), alcohol',
                monitoring: 'Respiratory rate, oxygen saturation, blood pressure, level of consciousness',
                pregnancy: 'Avoid - category D. Risk of floppy infant syndrome',
                sideEffects: 'Respiratory depression, hypotension, amnesia, paradoxical agitation',
                pharmacokinetics: 'Rapid onset 2-5min IV. t½ 1-4h. Hepatic metabolism (CYP3A4)',
                clinicalPearls: 'Flumazenil antidote available. Titrate slowly. Have airway management ready',
                indication: 'Conscious sedation, premedication, status epilepticus, ICU sedation'
            },
            'propofol': {
                name: 'Propofol',
                class: 'General Anaesthetic (Phenolic compound)',
                mechanism: 'GABA-A receptor agonist causing rapid onset anaesthesia',
                dosing: 'Induction: 1.5-2.5mg/kg IV. Maintenance: 4-12mg/kg/h IV. ICU sedation: 0.3-4mg/kg/h',
                contraindications: 'Egg/soy allergy, children <16 years (prolonged use), severe cardiac failure',
                interactions: 'CNS depressants (↑ effect), NO drug interactions metabolically',
                monitoring: 'Blood pressure, respiratory rate, depth of anaesthesia, lipid levels (prolonged use)',
                pregnancy: 'Safe for anaesthesia - category B. Crosses placenta rapidly',
                sideEffects: 'Hypotension, respiratory depression, injection pain, propofol infusion syndrome',
                pharmacokinetics: 'Rapid onset 40s, offset 5-10min. t½ 1-3h. Hepatic and extrahepatic metabolism',
                clinicalPearls: 'Painful injection - use lidocaine. Quick recovery. Risk of PRIS with prolonged use',
                indication: 'General anaesthesia induction/maintenance, ICU sedation, procedural sedation'
            },
            'ketamine': {
                name: 'Ketamine',
                class: 'Dissociative Anaesthetic/Analgesic',
                mechanism: 'NMDA receptor antagonist causing dissociative anaesthesia and analgesia',
                dosing: 'Anaesthesia: 1-2mg/kg IV, 4-6mg/kg IM. Analgesia: 0.1-0.3mg/kg IV. Depression: 0.5mg/kg',
                contraindications: 'Severe hypertension, raised ICP, psychotic disorders, porphyria',
                interactions: 'CNS depressants, sympathomimetics (↑ hypertension), theophylline',
                monitoring: 'Blood pressure, heart rate, respiratory rate, emergence reactions',
                pregnancy: 'Use with caution - category C. Limited data but appears relatively safe',
                sideEffects: 'Emergence reactions, hallucinations, hypertension, tachycardia, laryngospasm',
                pharmacokinetics: 'Rapid onset 1-2min IV. t½ 2-3h. Hepatic metabolism to active metabolites',
                clinicalPearls: 'Maintains airway reflexes. Good for unstable patients. Pre-treat with benzodiazepine',
                indication: 'Emergency anaesthesia, procedural sedation, severe asthma, treatment-resistant depression'
            },
            'bisoprolol': {
                name: 'Bisoprolol',
                class: 'Beta-1 Selective Blocker',
                mechanism: 'Selective antagonist of cardiac beta-1 adrenoreceptors',
                dosing: 'Heart failure: Start 1.25mg daily, titrate to 10mg daily. Hypertension: 5-10mg daily',
                contraindications: 'Asthma, severe COPD, cardiogenic shock, severe bradycardia, severe heart failure',
                interactions: 'Calcium channel blockers (↑ bradycardia), insulin (masks hypoglycemia), NSAIDs',
                monitoring: 'Heart rate, blood pressure, signs of heart failure, renal function, glucose',
                pregnancy: 'Use with caution - category C. Risk of IUGR and neonatal complications',
                sideEffects: 'Bradycardia, hypotension, fatigue, cold extremities, bronchospasm',
                pharmacokinetics: 'Good oral bioavailability. t½ 10-12h. 50% hepatic, 50% renal elimination',
                clinicalPearls: 'Most cardioselective beta-blocker. Evidence-based for heart failure',
                indication: 'Heart failure, post-MI, hypertension, angina, atrial fibrillation'
            },
            'pregabalin': {
                name: 'Pregabalin',
                class: 'Anticonvulsant/Neuropathic Pain Agent',
                mechanism: 'Binds to voltage-gated calcium channels reducing excitatory neurotransmitter release',
                dosing: 'Neuropathic pain: Start 75mg BD, titrate to 150-300mg BD. Epilepsy: 150-600mg daily',
                contraindications: 'Hypersensitivity to pregabalin, galactose intolerance',
                interactions: 'CNS depressants (↑ sedation), ACE inhibitors (↑ angioedema risk)',
                monitoring: 'Renal function, weight gain, mood changes, visual disturbances',
                pregnancy: 'Avoid - category C. Teratogenic in animal studies',
                sideEffects: 'Sedation, dizziness, weight gain, peripheral edema, blurred vision',
                pharmacokinetics: 'Good oral absorption. t½ 6h. 90% renal excretion unchanged',
                clinicalPearls: 'Effective for neuropathic pain. Controlled drug. Gradual withdrawal needed',
                indication: 'Neuropathic pain, epilepsy, generalized anxiety disorder, fibromyalgia'
            },
            'pantoprazole': {
                name: 'Pantoprazole',
                class: 'Proton Pump Inhibitor',
                mechanism: 'Irreversibly inhibits gastric H+/K+-ATPase (proton pump)',
                dosing: 'Adult: 40mg daily PO/IV. Severe GORD: 40mg BD. Zollinger-Ellison: up to 240mg daily',
                contraindications: 'Hypersensitivity to PPIs, severe liver disease',
                interactions: 'Clopidogrel (↓ efficacy), digoxin (↑ levels), ketoconazole (↓ absorption)',
                monitoring: 'Magnesium levels (long-term), B12 levels, bone density, C.diff risk',
                pregnancy: 'Generally safe - category B. Use if benefits outweigh risks',
                sideEffects: 'Headache, diarrhea, hypomagnesemia, increased fracture risk, C.diff',
                pharmacokinetics: 'Onset 2-3 days for full effect. t½ 1h. Hepatic metabolism (CYP2C19)',
                clinicalPearls: 'IV formulation available. Less drug interactions than omeprazole',
                indication: 'GORD, peptic ulcer disease, H.pylori eradication, stress ulcer prophylaxis'
            }
        };
        
        const container = document.getElementById('drug-reference-container');
        container.innerHTML = `
            <div class="search-container">
                <input type="text" id="drug-search" placeholder="Search medications...">
                <div id="drug-search-results"></div>
            </div>
            <div class="drug-categories">
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('all'); event.stopPropagation();">All Drugs</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('alphabetical'); event.stopPropagation();">A-Z</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('analgesics'); event.stopPropagation();">Pain Management</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('antibiotics'); event.stopPropagation();">Antibiotics</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('cardiovascular'); event.stopPropagation();">Cardiovascular</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('mental-health'); event.stopPropagation();">Mental Health</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('respiratory'); event.stopPropagation();">Respiratory</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('endocrine'); event.stopPropagation();">Endocrine</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('emergency'); event.stopPropagation();">Emergency</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('gastro'); event.stopPropagation();">Gastro</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('neuro'); event.stopPropagation();">Neurological</button>
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
        
        // Sort search results alphabetically by drug name
        matches.sort((a, b) => drugDatabase[a].name.localeCompare(drugDatabase[b].name));
        
        resultsContainer.innerHTML = matches.map(drug => `
            <div class="drug-result" onclick="console.log('💊 Drug search result clicked:', '${drug}'); window.quizApp.showDrugDetail('${drug}'); event.stopPropagation();">
                <div class="drug-name">${drugDatabase[drug].name}</div>
                <div class="drug-class">${drugDatabase[drug].class}</div>
            </div>
        `).join('');
    }
    
    showDrugCategory(category) {
        const drugDatabase = this.drugDatabase;
        const drugList = document.getElementById('drug-list');
        let drugs = Object.keys(drugDatabase);
        
        // Filter drugs by category
        if (category === 'analgesics') {
            drugs = drugs.filter(drug => {
                const drugClass = drugDatabase[drug].class.toLowerCase();
                const drugName = drugDatabase[drug].name.toLowerCase();
                return drugClass.includes('analgesic') || drugClass.includes('nsaid') || 
                       drugClass.includes('opioid') || drugName.includes('paracetamol') ||
                       drugName.includes('ibuprofen') || drugName.includes('morphine') ||
                       drugName.includes('codeine') || drugName.includes('tramadol') ||
                       drugName.includes('naproxen');
            });
        } else if (category === 'antibiotics') {
            drugs = drugs.filter(drug => {
                const drugClass = drugDatabase[drug].class.toLowerCase();
                return drugClass.includes('antibiotic') || drugClass.includes('penicillin') || 
                       drugClass.includes('macrolide') || drugClass.includes('cephalosporin') ||
                       drugClass.includes('quinolone') || drugClass.includes('tetracycline') ||
                       drugClass.includes('glycopeptide') || drugClass.includes('fluoroquinolone') ||
                       drugClass.includes('carbapenem') || drugClass.includes('aminoglycoside') ||
                       drugClass.includes('lincosamide') || drugClass.includes('beta-lactamase');
            });
        } else if (category === 'cardiovascular') {
            drugs = drugs.filter(drug => {
                const drugClass = drugDatabase[drug].class.toLowerCase();
                return drugClass.includes('statin') || drugClass.includes('ace inhibitor') ||
                       drugClass.includes('beta-blocker') || drugClass.includes('diuretic') ||
                       drugClass.includes('calcium channel') || drugClass.includes('anticoagulant') ||
                       drugClass.includes('antiplatelet') || drugClass.includes('angiotensin') ||
                       drugClass.includes('cardiac') || drugClass.includes('antiarrhythmic') ||
                       drugClass.includes('beta-1 selective') || drugClass.includes('nitrate');
            });
        } else if (category === 'mental-health') {
            drugs = drugs.filter(drug => {
                const drugClass = drugDatabase[drug].class.toLowerCase();
                const drugName = drugDatabase[drug].name.toLowerCase();
                return drugClass.includes('antidepressant') || drugClass.includes('ssri') ||
                       drugClass.includes('anxiolytic') || drugClass.includes('antipsychotic') ||
                       drugClass.includes('mood stabilizer') || drugClass.includes('benzodiazepine') ||
                       drugClass.includes('sedative') || drugClass.includes('anaesthetic') ||
                       drugName.includes('fluoxetine') || drugName.includes('citalopram') ||
                       drugName.includes('sertraline') || drugName.includes('diazepam') ||
                       drugName.includes('lithium') || drugName.includes('haloperidol') ||
                       drugName.includes('lorazepam') || drugName.includes('olanzapine') ||
                       drugName.includes('midazolam') || drugName.includes('propofol') ||
                       drugName.includes('ketamine');
            });
        } else if (category === 'respiratory') {
            drugs = drugs.filter(drug => {
                const drugClass = drugDatabase[drug].class.toLowerCase();
                const drugName = drugDatabase[drug].name.toLowerCase();
                return drugClass.includes('bronchodilator') || drugClass.includes('corticosteroid') ||
                       drugClass.includes('beta-2 agonist') || drugClass.includes('anticholinergic') ||
                       drugClass.includes('leukotriene') || drugName.includes('salbutamol') ||
                       drugName.includes('beclomethasone') || drugName.includes('salmeterol') ||
                       drugName.includes('montelukast') || drugName.includes('theophylline') ||
                       drugName.includes('ipratropium');
            });
        } else if (category === 'endocrine') {
            drugs = drugs.filter(drug => {
                const drugClass = drugDatabase[drug].class.toLowerCase();
                return drugClass.includes('antidiabetic') || drugClass.includes('thyroid') ||
                       drugClass.includes('insulin') || drugClass.includes('sulfonylurea') ||
                       drugClass.includes('metformin') || drugClass.includes('corticosteroid') ||
                       drugClass.includes('sglt2') || drugClass.includes('hormone');
            });
        } else if (category === 'emergency') {
            drugs = drugs.filter(drug => {
                const drugClass = drugDatabase[drug].class.toLowerCase();
                const drugName = drugDatabase[drug].name.toLowerCase();
                return drugClass.includes('emergency') || drugClass.includes('antidote') ||
                       drugClass.includes('sympathomimetic') || drugClass.includes('local anaesthetic') ||
                       drugClass.includes('anticoagulant') || drugClass.includes('antiarrhythmic') ||
                       drugClass.includes('mineral') || drugClass.includes('antifibrinolytic') ||
                       drugName.includes('adrenaline') || drugName.includes('epinephrine') ||
                       drugName.includes('naloxone') || drugName.includes('atropine') ||
                       drugName.includes('lidocaine') || drugName.includes('dexamethasone') ||
                       drugName.includes('heparin') || drugName.includes('glyceryl') ||
                       drugName.includes('noradrenaline') || drugName.includes('adenosine') ||
                       drugName.includes('magnesium') || drugName.includes('tranexamic') ||
                       drugName.includes('calcium');
            });
        } else if (category === 'gastro') {
            drugs = drugs.filter(drug => {
                const drugClass = drugDatabase[drug].class.toLowerCase();
                const drugName = drugDatabase[drug].name.toLowerCase();
                return drugClass.includes('proton pump') || drugClass.includes('antiemetic') ||
                       drugClass.includes('laxative') || drugClass.includes('antidiarrhoeal') ||
                       drugClass.includes('antispasmodic') || drugClass.includes('dopamine antagonist') ||
                       drugClass.includes('5-ht3 antagonist') || drugClass.includes('phenothiazine') ||
                       drugName.includes('lansoprazole') || drugName.includes('omeprazole') ||
                       drugName.includes('domperidone') || drugName.includes('cyclizine') ||
                       drugName.includes('senna') || drugName.includes('lactulose') ||
                       drugName.includes('loperamide') || drugName.includes('hyoscine') ||
                       drugName.includes('metoclopramide') || drugName.includes('ondansetron') ||
                       drugName.includes('prochlorperazine') || drugName.includes('pantoprazole');
            });
        } else if (category === 'neuro') {
            drugs = drugs.filter(drug => {
                const drugClass = drugDatabase[drug].class.toLowerCase();
                const drugName = drugDatabase[drug].name.toLowerCase();
                return drugClass.includes('anticonvulsant') || drugClass.includes('antiepilep') ||
                       drugClass.includes('neuropathic') || drugClass.includes('dopamine') ||
                       drugClass.includes('triptan') || drugClass.includes('neuropathic pain') ||
                       drugName.includes('gabapentin') || drugName.includes('phenytoin') ||
                       drugName.includes('carbamazepine') || drugName.includes('levodopa') ||
                       drugName.includes('sumatriptan') || drugName.includes('pregabalin');
            });
        }
        
        // Sort alphabetically if requested or if "A-Z" category selected
        if (category === 'alphabetical') {
            drugs.sort((a, b) => drugDatabase[a].name.localeCompare(drugDatabase[b].name));
        }
        
        drugList.innerHTML = drugs.map(drug => `
            <div class="drug-card" onclick="console.log('💊 Drug card clicked:', '${drug}'); window.quizApp.showDrugDetail('${drug}'); event.stopPropagation();">
                <div class="drug-name">${drugDatabase[drug].name}</div>
                <div class="drug-class">${drugDatabase[drug].class}</div>
            </div>
        `).join('');
    }
    
    showDrugDetail(drugKey) {
        const drug = this.drugDatabase[drugKey];
        const container = document.getElementById('drug-reference-container');
        
        container.innerHTML = `
            <button class="back-btn" onclick="window.quizApp.loadDrugReference(); event.stopPropagation();">← Back to Drug List</button>
            <div class="drug-detail">
                <h3>${drug.name}</h3>
                <div class="drug-info">
                    <div class="info-section">
                        <h4>🏷️ Classification</h4>
                        <p>${drug.class}</p>
                    </div>
                    <div class="info-section">
                        <h4>⚙️ Mechanism of Action</h4>
                        <p>${drug.mechanism}</p>
                    </div>
                    <div class="info-section">
                        <h4>💊 Dosing & Administration</h4>
                        <p>${drug.dosing}</p>
                        ${drug.maxDose ? `<p><strong>Maximum Dose:</strong> ${drug.maxDose}</p>` : ''}
                    </div>
                    <div class="info-section">
                        <h4>⚠️ Contraindications</h4>
                        <p>${drug.contraindications}</p>
                    </div>
                    <div class="info-section">
                        <h4>🔄 Drug Interactions</h4>
                        <p>${drug.interactions}</p>
                    </div>
                    <div class="info-section">
                        <h4>📊 Monitoring Parameters</h4>
                        <p>${drug.monitoring}</p>
                    </div>
                    <div class="info-section">
                        <h4>🤰 Pregnancy Safety</h4>
                        <p>${drug.pregnancy}</p>
                    </div>
                    ${drug.sideEffects ? `
                    <div class="info-section">
                        <h4>🚨 Side Effects</h4>
                        <p>${drug.sideEffects}</p>
                    </div>` : ''}
                    ${drug.pharmacokinetics ? `
                    <div class="info-section">
                        <h4>⏱️ Pharmacokinetics</h4>
                        <p>${drug.pharmacokinetics}</p>
                    </div>` : ''}
                    ${drug.clinicalPearls ? `
                    <div class="info-section">
                        <h4>💎 Clinical Pearls</h4>
                        <p>${drug.clinicalPearls}</p>
                    </div>` : ''}
                    ${drug.coverage ? `
                    <div class="info-section">
                        <h4>🦠 Antimicrobial Coverage</h4>
                        <p>${drug.coverage}</p>
                    </div>` : ''}
                    ${drug.targets ? `
                    <div class="info-section">
                        <h4>🎯 Treatment Targets</h4>
                        <p>${drug.targets}</p>
                    </div>` : ''}
                    ${drug.efficacy ? `
                    <div class="info-section">
                        <h4>📈 Clinical Efficacy</h4>
                        <p>${drug.efficacy}</p>
                    </div>` : ''}
                    ${drug.indications ? `
                    <div class="info-section">
                        <h4>🎯 Indications</h4>
                        <p>${drug.indications}</p>
                    </div>` : ''}
                </div>
            </div>
        `;
    }

    // Lab Values Functions
    loadLabValues() {
        console.log('🧪 Loading lab values...');
        const labDatabase = {
            'cbc': {
                name: 'Complete Blood Count (CBC)',
                values: {
                    'WBC': { 
                        normal: '4.0-11.0 × 10⁹/L', 
                        low: 'Immunosuppression, viral infection, autoimmune disease, chemotherapy', 
                        high: 'Bacterial infection, leukaemia, stress, tissue necrosis, smoking',
                        critical: '<1.0 or >30 × 10⁹/L',
                        ageVariations: 'Neonate: 9-30, Child: 5-17, Adult: 4.0-11.0',
                        clinicalSignificance: 'Left shift suggests bacterial infection. Lymphocytosis in viral infections.'
                    },
                    'RBC': { 
                        normal: 'M: 4.5-6.5, F: 3.8-5.8 × 10¹²/L', 
                        low: 'Anaemia (iron deficiency, chronic disease, haemolysis), bleeding, kidney disease', 
                        high: 'Polycythaemia vera, dehydration, COPD, high altitude',
                        critical: '<2.5 or >7.0 × 10¹²/L',
                        ageVariations: 'Neonate: 4.0-6.6, Child: 3.7-5.3',
                        clinicalSignificance: 'Combined with Hb/Hct for anaemia classification. MCV helps determine type.'
                    },
                    'Haemoglobin': { 
                        normal: 'M: 130-180 g/L, F: 115-165 g/L', 
                        low: 'Anaemia, bleeding, iron deficiency, chronic kidney disease', 
                        high: 'Polycythaemia, dehydration, COPD, smoking',
                        critical: '<70 or >200 g/L',
                        ageVariations: 'Neonate: 140-240, Child: 110-160, Pregnancy: 110-130',
                        clinicalSignificance: 'Best indicator of oxygen-carrying capacity. Transfusion threshold typically <70-80 g/L.'
                    },
                    'Haematocrit': { 
                        normal: 'M: 0.40-0.52, F: 0.36-0.47', 
                        low: 'Anaemia, overhydration, pregnancy, bleeding', 
                        high: 'Dehydration, polycythaemia, COPD, diuretic use',
                        critical: '<0.20 or >0.60',
                        ageVariations: 'Neonate: 0.42-0.75, Child: 0.33-0.45',
                        clinicalSignificance: 'Rule of 3: Hct ≈ 3 × Hb (in g/dL). Falsely elevated in dehydration.'
                    },
                    'Platelets': { 
                        normal: '150-450 × 10⁹/L', 
                        low: 'ITP, drug-induced, hypersplenism, viral infection, heparin', 
                        high: 'Essential thrombocythaemia, reactive (infection, malignancy), iron deficiency',
                        critical: '<20 or >1000 × 10⁹/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Bleeding risk increases <50. Spontaneous bleeding <10. Thrombosis risk >1000.'
                    },
                    'MCV': {
                        normal: '82-98 fL',
                        low: 'Iron deficiency, thalassaemia, chronic disease, lead poisoning',
                        high: 'B12/folate deficiency, alcohol use, hypothyroidism, reticulocytosis',
                        critical: '<70 or >120 fL',
                        ageVariations: 'Child: 70-90, Adult: 82-98',
                        clinicalSignificance: 'Microcytic: iron studies. Macrocytic: B12/folate levels. Normocytic: chronic disease.'
                    }
                }
            },
            'bmp': {
                name: 'Basic Metabolic Panel (BMP)',
                values: {
                    'Glucose': { 
                        normal: '3.9-5.6 mmol/L (fasting), <7.8 random', 
                        low: 'Hypoglycaemia: insulin excess, liver disease, adrenal insufficiency, starvation', 
                        high: 'Diabetes, prediabetes, stress, steroids, pancreatic disease',
                        critical: '<2.2 or >22 mmol/L',
                        ageVariations: 'Child: 3.3-5.6, Adult: 3.9-5.6, Elderly: may be slightly higher',
                        clinicalSignificance: 'Fasting >7.0 or random >11.1 suggests diabetes. HbA1c >48 mmol/mol diagnostic.'
                    },
                    'Urea': { 
                        normal: '2.5-7.5 mmol/L', 
                        low: 'Liver disease, malnutrition, overhydration, low protein diet', 
                        high: 'Acute/chronic kidney disease, dehydration, GI bleeding, high protein diet',
                        critical: '>35 mmol/L',
                        ageVariations: 'Child: 1.8-6.4, Adult: 2.5-7.5, Elderly: may be elevated',
                        clinicalSignificance: 'Urea:Creatinine ratio >100:1 suggests prerenal azotemia. <40:1 suggests liver disease.'
                    },
                    'Creatinine': { 
                        normal: 'M: 62-115 μmol/L, F: 53-97 μmol/L', 
                        low: 'Low muscle mass, malnutrition, pregnancy', 
                        high: 'Acute/chronic kidney disease, dehydration, muscle breakdown',
                        critical: '>354 μmol/L or >3× baseline',
                        ageVariations: 'Child: 27-62, Adult varies by muscle mass, Elderly: lower baseline',
                        clinicalSignificance: 'Use eGFR for kidney function. ≥26 μmol/L rise in 48h = AKI. Delayed rise after injury.'
                    },
                    'eGFR': {
                        normal: '>90 mL/min/1.73m²',
                        low: 'CKD stages: 60-89 (stage 2), 45-59 (3a), 30-44 (3b), 15-29 (4), <15 (5)',
                        high: 'Hyperfiltration (early diabetes), pregnancy',
                        critical: '<15 mL/min/1.73m² (dialysis consideration)',
                        ageVariations: 'Declines ~1 mL/min/year after age 40',
                        clinicalSignificance: 'More accurate than creatinine alone. Adjust medications at <60. Nephrology referral <30.'
                    },
                    'Sodium': { 
                        normal: '135-145 mmol/L', 
                        low: 'SIADH, diuretics, heart failure, liver disease, hypothyroidism', 
                        high: 'Dehydration, diabetes insipidus, excess salt intake, hyperaldosteronism',
                        critical: '<125 or >160 mmol/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Hyponatraemia symptoms: confusion, seizures. Correct slowly (8-12 mmol/L/day) to avoid osmotic demyelination.'
                    },
                    'Potassium': { 
                        normal: '3.5-5.0 mmol/L', 
                        low: 'Diuretics, diarrhoea, hyperaldosteronism, poor intake, alkalosis', 
                        high: 'Kidney disease, ACE inhibitors, tissue breakdown, acidosis, haemolysis',
                        critical: '<2.5 or >6.5 mmol/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Cardiac effects: peaked T-waves >6.5, paralysis >8.0. Replace cautiously in kidney disease.'
                    },
                    'Chloride': { 
                        normal: '98-107 mmol/L', 
                        low: 'Vomiting, diuretics, Addison disease, metabolic alkalosis', 
                        high: 'Dehydration, hypernatraemia, metabolic acidosis, diarrhoea',
                        critical: '<85 or >115 mmol/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Usually follows sodium. Anion gap = Na - (Cl + HCO3). Normal gap: 8-12.'
                    },
                    'Bicarbonate': { 
                        normal: '22-29 mmol/L', 
                        low: 'Metabolic acidosis (DKA, lactic acidosis, renal failure)', 
                        high: 'Metabolic alkalosis (vomiting, diuretics), respiratory acidosis',
                        critical: '<15 or >35 mmol/L',
                        ageVariations: 'Child: 20-28, Adult: 22-29',
                        clinicalSignificance: 'Reflects bicarbonate level. Low HCO3 with high anion gap suggests metabolic acidosis.'
                    }
                }
            },
            'lft': {
                name: 'Liver Function Tests (LFT)',
                values: {
                    'ALT': { 
                        normal: 'M: 5-40 U/L, F: 5-35 U/L', 
                        low: 'Rarely clinically significant', 
                        high: 'Hepatocellular injury: hepatitis, drugs, alcohol, NASH, Wilson disease',
                        critical: '>1000 U/L (acute hepatic necrosis)',
                        ageVariations: 'Child: 5-25, Adult varies by gender',
                        clinicalSignificance: 'More liver-specific than AST. ALT>AST suggests hepatocellular injury. Peak in acute hepatitis: 1000-5000.'
                    },
                    'AST': { 
                        normal: 'M: 5-40 U/L, F: 5-35 U/L', 
                        low: 'Rarely clinically significant', 
                        high: 'Liver/muscle damage, MI, haemolysis, alcohol use',
                        critical: '>1000 U/L',
                        ageVariations: 'Child: 15-40, Adult varies by gender',
                        clinicalSignificance: 'AST>ALT (ratio >2) suggests alcohol. Also elevated in muscle disease, MI, haemolysis.'
                    },
                    'Alkaline Phosphatase': { 
                        normal: '30-130 U/L (adult)', 
                        low: 'Hypothyroidism, malnutrition, Wilson disease', 
                        high: 'Cholestasis, bone disease, pregnancy, malignancy, Paget disease',
                        critical: '>5× upper limit',
                        ageVariations: 'Child/adolescent: 100-390 (bone growth), Pregnancy: elevated',
                        clinicalSignificance: 'Elevated with GGT suggests hepatic source. Isolated elevation: bone disease, pregnancy.'
                    },
                    'GGT': {
                        normal: 'M: 5-55 U/L, F: 5-35 U/L',
                        low: 'Rarely significant',
                        high: 'Alcohol use, cholestasis, drugs, NASH',
                        critical: '>10× upper limit',
                        ageVariations: 'Increases with age',
                        clinicalSignificance: 'Most sensitive for alcohol use. Helps differentiate hepatic vs. bone source of elevated ALP.'
                    },
                    'Total Bilirubin': { 
                        normal: '5-20 μmol/L', 
                        low: 'Rarely significant', 
                        high: 'Haemolysis, liver disease, Gilbert syndrome, cholestasis',
                        critical: '>340 μmol/L',
                        ageVariations: 'Newborn: physiologic elevation first week',
                        clinicalSignificance: 'Conjugated >34 μmol/L suggests hepatic/post-hepatic cause. Unconjugated elevation: haemolysis, Gilbert.'
                    },
                    'Direct Bilirubin': {
                        normal: '0-5 μmol/L',
                        low: 'Normal',
                        high: 'Hepatocellular injury, cholestasis, Dubin-Johnson syndrome',
                        critical: '>255 μmol/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Conjugated bilirubin. Elevation suggests hepatic processing defect or biliary obstruction.'
                    },
                    'Albumin': { 
                        normal: '35-50 g/L', 
                        low: 'Liver disease, malnutrition, nephrotic syndrome, inflammation', 
                        high: 'Dehydration (rare)',
                        critical: '<20 g/L',
                        ageVariations: 'Child: 34-48, Adult: 35-50, Elderly: may be lower',
                        clinicalSignificance: 'Half-life 20 days, reflects chronic liver function. Low albumin increases drug free fractions.'
                    },
                    'PT/INR': { 
                        normal: 'PT: 10-14 sec, INR: 0.9-1.2', 
                        low: 'Hypercoagulable state (rare)', 
                        high: 'Liver disease, warfarin, vitamin K deficiency, factor deficiencies',
                        critical: 'INR >5.0',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Reflects hepatic synthetic function. Warfarin target INR: 2-3 (most), 2.5-3.5 (mechanical valves).'
                    }
                }
            },
            'lipids': {
                name: 'Lipid Panel',
                values: {
                    'Total Cholesterol': { 
                        normal: '<5.0 mmol/L (optimal)', 
                        low: 'Malnutrition, hyperthyroidism, liver disease, malabsorption', 
                        high: 'Familial hypercholesterolaemia, diabetes, hypothyroidism, diet',
                        critical: '>400 mg/dL',
                        ageVariations: 'Increases with age until menopause (women)',
                        clinicalSignificance: 'Borderline high: 200-239. High: ≥240. Less important than LDL for risk assessment.'
                    },
                    'LDL': { 
                        normal: '<2.6 mmol/L (optimal), <1.8 (high risk)', 
                        low: 'Overtreatment, malnutrition, hyperthyroidism', 
                        high: 'Primary hyperlipidaemia, diabetes, hypothyroidism, diet',
                        critical: '>4.9 mmol/L',
                        ageVariations: 'Increases with age',
                        clinicalSignificance: 'Primary target for statin therapy. Goals: <70 (very high risk), <100 (high risk), <130 (moderate risk).'
                    },
                    'HDL': { 
                        normal: 'M: >1.0 mmol/L, F: >1.3 mmol/L', 
                        low: 'Metabolic syndrome, diabetes, smoking, sedentary lifestyle', 
                        high: 'Cardioprotective, exercise, moderate alcohol, genetics',
                        critical: '<0.6 mmol/L',
                        ageVariations: 'Higher in premenopausal women',
                        clinicalSignificance: 'Low HDL major CAD risk factor. HDL >60 is negative risk factor (protective).'
                    },
                    'Triglycerides': { 
                        normal: '<1.7 mmol/L', 
                        low: 'Malnutrition, hyperthyroidism', 
                        high: 'Diabetes, alcohol, obesity, familial hypertriglyceridaemia',
                        critical: '>11.3 mmol/L (pancreatitis risk)',
                        ageVariations: 'Increases with age',
                        clinicalSignificance: 'High: 200-499. Very high: ≥500. Pancreatitis risk >1000. Fasting required for accuracy.'
                    },
                    'Non-HDL Cholesterol': {
                        normal: '<130 mg/dL',
                        low: 'Malnutrition, overtreatment',
                        high: 'Atherogenic dyslipidemia, diabetes',
                        critical: '>220 mg/dL',
                        ageVariations: 'Increases with age',
                        clinicalSignificance: 'Total cholesterol - HDL. Better predictor than LDL when triglycerides elevated. Secondary target.'
                    }
                }
            },
            'thyroid': {
                name: 'Thyroid Function Tests',
                values: {
                    'TSH': {
                        normal: '0.4-4.0 mIU/L',
                        low: 'Hyperthyroidism, central hypothyroidism, pregnancy (1st trimester)',
                        high: 'Primary hypothyroidism, subclinical hypothyroidism',
                        critical: '<0.01 or >20 mIU/L',
                        ageVariations: 'Elderly: upper limit may be 6-7 mIU/L',
                        clinicalSignificance: 'Best screening test. Suppressed in hyperthyroidism, elevated in primary hypothyroidism.'
                    },
                    'Free T4': {
                        normal: '0.8-1.8 ng/dL',
                        low: 'Hypothyroidism, central thyroid disease, severe illness',
                        high: 'Hyperthyroidism, excess thyroid hormone replacement',
                        critical: '<0.4 or >4.0 ng/dL',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Reflects thyroid hormone activity. Normal with abnormal TSH suggests subclinical disease.'
                    },
                    'Free T3': {
                        normal: '2.3-4.2 pg/mL',
                        low: 'Hypothyroidism, sick euthyroid syndrome',
                        high: 'Hyperthyroidism, T3 toxicosis',
                        critical: '<1.0 or >8.0 pg/mL',
                        ageVariations: 'Decreases slightly with age',
                        clinicalSignificance: 'Most metabolically active hormone. May be normal in early hypothyroidism.'
                    }
                }
            },
            'urea_electrolytes': {
                name: 'Urea & Electrolytes (U&Es)',
                values: {
                    'Sodium': {
                        normal: '135-145 mmol/L',
                        low: 'SIADH, diuretics, heart failure, adrenal insufficiency, excess water intake',
                        high: 'Dehydration, diabetes insipidus, excess salt intake, hyperaldosteronism',
                        critical: '<125 or >155 mmol/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Hyponatremia: check osmolality. Rapid correction can cause central pontine myelinolysis.'
                    },
                    'Potassium': {
                        normal: '3.5-5.0 mmol/L',
                        low: 'Diuretics, diarrhea, hyperaldosteronism, poor intake, insulin therapy',
                        high: 'ACE inhibitors, ARBs, renal failure, Addisons disease, acidosis',
                        critical: '<2.5 or >6.5 mmol/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Life-threatening arrhythmias possible. Check ECG if abnormal. Hemolysis causes false elevation.'
                    },
                    'Urea': {
                        normal: '2.5-6.5 mmol/L',
                        low: 'Liver disease, pregnancy, low protein diet, overhydration',
                        high: 'Dehydration, renal impairment, GI bleeding, high protein diet, catabolism',
                        critical: '>30 mmol/L',
                        ageVariations: 'Increases with age',
                        clinicalSignificance: 'Urea:creatinine ratio >100 suggests prerenal cause. Affected by protein metabolism.'
                    },
                    'Creatinine': {
                        normal: 'M: 70-120 μmol/L, F: 50-100 μmol/L',
                        low: 'Low muscle mass, pregnancy, amputation',
                        high: 'Acute/chronic kidney disease, dehydration, muscle breakdown, some drugs',
                        critical: '>500 μmol/L',
                        ageVariations: 'Lower in elderly due to reduced muscle mass',
                        clinicalSignificance: 'Used to calculate eGFR. More specific for kidney function than urea. Creatinine rise lags behind GFR fall.'
                    },
                    'eGFR': {
                        normal: '>90 mL/min/1.73m²',
                        low: 'Chronic kidney disease, acute kidney injury, dehydration',
                        high: 'Hyperfiltration (early diabetes), young age',
                        critical: '<15 mL/min/1.73m² (consider dialysis)',
                        ageVariations: 'Declines ~1 mL/min/year after age 30',
                        clinicalSignificance: 'CKD stages: G1(>90), G2(60-89), G3a(45-59), G3b(30-44), G4(15-29), G5(<15). Adjusted for ethnicity.'
                    }
                }
            },
            'coagulation': {
                name: 'Coagulation Studies',
                values: {
                    'PT/INR': {
                        normal: 'PT: 11-13 seconds, INR: 0.8-1.2',
                        low: 'Thrombophilia, early liver disease',
                        high: 'Warfarin therapy, liver disease, vitamin K deficiency, DIC',
                        critical: 'INR >5.0 (bleeding risk)',
                        ageVariations: 'Slight increase with age',
                        clinicalSignificance: 'INR target 2-3 for most indications, 2.5-3.5 for mechanical valves. Reflects extrinsic pathway.'
                    },
                    'APTT': {
                        normal: '25-35 seconds',
                        low: 'Early DIC, thrombophilia',
                        high: 'Heparin therapy, hemophilia, liver disease, lupus anticoagulant',
                        critical: '>100 seconds',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Monitors unfractionated heparin therapy. Reflects intrinsic pathway. Ratio to control usually reported.'
                    },
                    'Fibrinogen': {
                        normal: '2.0-4.0 g/L',
                        low: 'DIC, liver disease, hyperfibrinolysis, inherited deficiency',
                        high: 'Acute phase reaction, pregnancy, malignancy, smoking',
                        critical: '<1.0 g/L',
                        ageVariations: 'Increases with age',
                        clinicalSignificance: 'Acute phase protein. Low levels increase bleeding risk. Essential for clot formation.'
                    },
                    'D-dimer': {
                        normal: '<0.5 mg/L',
                        low: 'No clinical significance',
                        high: 'VTE, DIC, malignancy, infection, pregnancy, surgery, advanced age',
                        critical: '>10 mg/L',
                        ageVariations: 'Increases with age (age×10 μg/L cutoff >50 years)',
                        clinicalSignificance: 'High sensitivity, low specificity for VTE. Normal D-dimer excludes PE/DVT in low-risk patients.'
                    }
                }
            },
            'cardiac_markers': {
                name: 'Cardiac Markers',
                values: {
                    'Troponin I': {
                        normal: '<0.04 μg/L',
                        low: 'No clinical significance',
                        high: 'MI, myocarditis, PE, renal failure, sepsis, heart failure',
                        critical: '>10× upper limit',
                        ageVariations: 'May be slightly elevated in elderly',
                        clinicalSignificance: 'Most specific for myocardial injury. Rise 3-6h, peak 12-24h, elevated 7-14 days. High-sensitivity assays available.'
                    },
                    'CK-MB': {
                        normal: '<6.3 μg/L',
                        low: 'No clinical significance',
                        high: 'MI, myocarditis, cardiac surgery, skeletal muscle disease',
                        critical: '>25 μg/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Less specific than troponin. Rise 3-6h, peak 12-24h, normalize 48-72h. Still used in some centers.'
                    },
                    'BNP': {
                        normal: '<100 pg/mL',
                        low: 'Heart failure unlikely',
                        high: 'Heart failure, renal failure, PE, atrial fibrillation',
                        critical: '>1000 pg/mL',
                        ageVariations: 'Increases with age',
                        clinicalSignificance: 'Excellent negative predictive value for heart failure. NT-proBNP alternative with different cutoffs.'
                    }
                }
            },
            'inflammatory_markers': {
                name: 'Inflammatory Markers',
                values: {
                    'CRP': {
                        normal: '<3 mg/L',
                        low: 'No active inflammation',
                        high: 'Infection, inflammation, malignancy, tissue necrosis',
                        critical: '>200 mg/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Acute phase protein. Rises within 6h, peaks 24-48h. Useful for monitoring treatment response.'
                    },
                    'ESR': {
                        normal: 'M: <age/2, F: <(age+10)/2',
                        low: 'Polycythemia, severe heart failure, hypofibrinogenemia',
                        high: 'Infection, inflammation, malignancy, anemia, pregnancy',
                        critical: '>100 mm/h',
                        ageVariations: 'Increases significantly with age',
                        clinicalSignificance: 'Non-specific. Takes days to change. Still useful in temporal arteritis, polymyalgia rheumatica.'
                    },
                    'Procalcitonin': {
                        normal: '<0.1 μg/L',
                        low: 'Viral infection, localized bacterial infection',
                        high: 'Bacterial sepsis, severe bacterial infection',
                        critical: '>10 μg/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'More specific for bacterial infection than CRP. Guides antibiotic duration. Useful in sepsis diagnosis.'
                    }
                }
            },
            'endocrine': {
                name: 'Endocrine Tests',
                values: {
                    'HbA1c': {
                        normal: '<42 mmol/mol (6.0%)',
                        low: 'Hypoglycemia risk, recent blood loss',
                        high: 'Diabetes mellitus, poor glycemic control',
                        critical: '>75 mmol/mol (9.0%)',
                        ageVariations: 'Target may be higher in elderly/frail',
                        clinicalSignificance: 'Diabetes: ≥48 mmol/mol. Pre-diabetes: 42-47. Target usually <53 mmol/mol. Reflects 8-12 week average glucose.'
                    },
                    'Random Glucose': {
                        normal: '3.5-7.8 mmol/L',
                        low: 'Hypoglycemia, insulin excess, adrenal insufficiency',
                        high: 'Diabetes, stress, steroids, acute illness',
                        critical: '<2.2 or >22 mmol/L',
                        ageVariations: 'Glucose tolerance decreases with age',
                        clinicalSignificance: 'Random ≥11.1 mmol/L suggests diabetes if symptomatic. Fasting ≥7.0 mmol/L diagnostic for diabetes.'
                    },
                    'Cortisol (9am)': {
                        normal: '200-700 nmol/L',
                        low: 'Addisons disease, secondary adrenal insufficiency, exogenous steroids',
                        high: 'Cushings syndrome, stress, depression, alcohol',
                        critical: '<100 nmol/L (consider steroid replacement)',
                        ageVariations: 'Peak in early morning, follows circadian rhythm',
                        clinicalSignificance: 'Diurnal variation important. Low 9am cortisol needs synacthen test. Midnight cortisol for Cushings.'
                    }
                }
            }
        };
        
        const container = document.getElementById('lab-values-container');
        container.innerHTML = `
            <div class="search-container">
                <input type="text" id="lab-search" placeholder="Search lab values...">
                <div id="lab-search-results" class="lab-grid"></div>
            </div>
            <div class="lab-categories">
                <button class="category-btn" onclick="window.quizApp.showLabCategory('all'); event.stopPropagation();">All Labs</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('cbc'); event.stopPropagation();">CBC</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('bmp'); event.stopPropagation();">Chemistry</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('lft'); event.stopPropagation();">Liver</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('lipids'); event.stopPropagation();">Lipids</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('thyroid'); event.stopPropagation();">Thyroid</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('urea_electrolytes'); event.stopPropagation();">U&Es</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('coagulation'); event.stopPropagation();">Coagulation</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('cardiac_markers'); event.stopPropagation();">Cardiac</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('inflammatory_markers'); event.stopPropagation();">Inflammatory</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('endocrine'); event.stopPropagation();">Endocrine</button>
            </div>
            <div id="lab-list" class="lab-grid"></div>
        `;
        
        const searchInput = document.getElementById('lab-search');
        searchInput.addEventListener('input', () => this.searchLabValues(labDatabase));
        this.labDatabase = labDatabase;
        this.showLabCategory('all');
        console.log('🧪 Lab values interface loaded successfully');
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
            <button class="lab-value-btn" onclick="${match.type === 'panel' ? `console.log('🧪 Search result panel clicked:', '${match.key}'); window.quizApp.showLabPanel('${match.key}'); event.stopPropagation();` : `console.log('🧪 Search result test clicked:', '${match.key}'); window.quizApp.showLabTest('${match.panel}', '${match.key}'); event.stopPropagation();`}">
                <div class="lab-name">${match.name}</div>
                <div class="lab-count">${match.type === 'panel' ? 'Lab Panel' : 'Individual Test'}</div>
            </button>
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
            <button class="lab-value-btn" onclick="console.log('🧪 Lab panel clicked:', '${panel}'); window.quizApp.showLabPanel('${panel}'); event.stopPropagation();">
                <div class="lab-name">${labDatabase[panel].name}</div>
                <div class="lab-count">${Object.keys(labDatabase[panel].values).length} tests</div>
            </button>
        `).join('');
    }
    
    showLabPanel(panelKey) {
        console.log('🧪 Opening lab panel:', panelKey);
        const panel = this.labDatabase[panelKey];
        const container = document.getElementById('lab-values-container');
        
        const testsHtml = Object.entries(panel.values).map(([test, data]) => `
            <button class="lab-value-btn" onclick="console.log('🧪 Lab test clicked:', '${test}'); window.quizApp.showLabTest('${panelKey}', '${test}'); event.stopPropagation();">
                <div class="lab-name">${test}</div>
                <div class="lab-count">${data.normal}</div>
            </button>
        `).join('');
        
        container.innerHTML = `
            <button class="back-btn" onclick="window.quizApp.loadLabValues(); event.stopPropagation();">← Back to Lab Categories</button>
            <div class="lab-panel-detail">
                <h3>${panel.name}</h3>
                <div class="lab-tests lab-grid">
                    ${testsHtml}
                </div>
            </div>
        `;
    }
    
    showLabTest(panelKey, testKey) {
        console.log('🧪 Opening lab test detail:', panelKey, testKey);
        const test = this.labDatabase[panelKey].values[testKey];
        const container = document.getElementById('lab-values-container');
        
        container.innerHTML = `
            <button class="back-btn" onclick="window.quizApp.showLabPanel('${panelKey}'); event.stopPropagation();">← Back to ${this.labDatabase[panelKey].name}</button>
            <div class="lab-test-detail">
                <h3>📊 ${testKey}</h3>
                <div class="test-info">
                    <div class="info-section">
                        <h4>🎯 Normal Range</h4>
                        <p>${test.normal}</p>
                    </div>
                    ${test.ageVariations ? `
                    <div class="info-section">
                        <h4>👶🧓 Age Variations</h4>
                        <p>${test.ageVariations}</p>
                    </div>` : ''}
                    <div class="info-section">
                        <h4>⬇️ Low Values (Causes)</h4>
                        <p>${test.low}</p>
                    </div>
                    <div class="info-section">
                        <h4>⬆️ High Values (Causes)</h4>
                        <p>${test.high}</p>
                    </div>
                    ${test.critical ? `
                    <div class="info-section critical-values">
                        <h4>🚨 Critical Values</h4>
                        <p>${test.critical}</p>
                    </div>` : ''}
                    ${test.clinicalSignificance ? `
                    <div class="info-section">
                        <h4>🔬 Clinical Significance</h4>
                        <p>${test.clinicalSignificance}</p>
                    </div>` : ''}
                </div>
            </div>
        `;
    }

    // Clinical Guidelines Functions  
    loadGuidelines() {
        const guidelinesDatabase = {
            'hypertension': {
                title: 'Hypertension Management (NICE NG136 2024)',
                category: 'cardiovascular',
                evidenceLevel: 'NICE Clinical Guideline',
                lastUpdated: '2024',
                organisation: 'NICE',
                stages: {
                    'Stage 1': 'Clinic BP ≥140/90 mmHg AND ABPM/HBPM ≥135/85 mmHg',
                    'Stage 2': 'Clinic BP ≥160/100 mmHg AND ABPM/HBPM ≥150/95 mmHg',
                    'Stage 3 (Severe)': 'Clinic systolic BP ≥180 mmHg OR clinic diastolic BP ≥120 mmHg'
                },
                treatment: {
                    'Stage 1': 'Offer antihypertensive drug treatment if target organ damage, established CVD, renal disease, diabetes, or 10-year CVD risk ≥10%',
                    'Stage 2': 'Offer antihypertensive drug treatment regardless of age',
                    'Stage 3': 'Consider same-day specialist assessment. Immediate antihypertensive treatment'
                },
                targets: {
                    'General': '<140/90 mmHg clinic, <135/85 mmHg home/ABPM',
                    'Over 80 years': '<150/90 mmHg clinic, <145/85 mmHg home/ABPM',
                    'Diabetes': '<140/90 mmHg clinic, <135/85 mmHg home/ABPM (consider <130/80 if kidney, eye or cerebrovascular damage)'
                },
                algorithm: {
                    'Step 1': 'ACE inhibitor (or ARB if ACE inhibitor not tolerated). Consider CCB for black African/Caribbean ancestry',
                    'Step 2': 'ACE inhibitor + CCB OR ACE inhibitor + thiazide-like diuretic',
                    'Step 3': 'ACE inhibitor + CCB + thiazide-like diuretic',
                    'Step 4': 'Add low-dose spironolactone (if K+ ≤4.5mmol/L) OR alpha-blocker OR beta-blocker'
                },
                lifestyle: 'Reduce salt intake to <6g/day, maintain healthy weight (BMI 20-25), exercise ≥150min/week moderate intensity, alcohol within recommended limits',
                monitoring: 'Annual review. More frequent if treatment changes or poorly controlled. QRISK3 assessment',
                specialPopulations: {
                    'Pregnancy': 'Target <135/85 mmHg. First-line: labetalol. Alternatives: nifedipine, methyldopa',
                    'Type 2 diabetes': 'ACE inhibitor or ARB first-line. Consider SGLT2 inhibitor',
                    'CKD': 'ACE inhibitor or ARB first-line. Monitor eGFR and potassium'
                }
            },
            'diabetes-t2': {
                title: 'Type 2 Diabetes Management (NICE NG28 2024)',
                category: 'endocrine',
                evidenceLevel: 'NICE Clinical Guideline',
                lastUpdated: '2024',
                organisation: 'NICE',
                targets: {
                    'HbA1c': '48mmol/mol (6.5%) for adults on lifestyle/metformin only. 53mmol/mol (7.0%) for adults on any drug with hypoglycaemia risk',
                    'Blood pressure': '<140/90 mmHg (or <130/80 mmHg if kidney, eye or cerebrovascular damage)',
                    'Cholesterol': 'Primary prevention: 40% reduction in non-HDL cholesterol. Secondary prevention: non-HDL <2.5mmol/L'
                },
                algorithm: {
                    'First-line': 'Standard-release metformin, titrate up to 2g daily (or maximum tolerated)',
                    'Dual therapy': 'Metformin + DPP-4 inhibitor, pioglitazone, SU, or SGLT2 inhibitor',
                    'Triple therapy': 'Metformin + 2 other antidiabetic drugs',
                    'Insulin therapy': 'Consider if HbA1c >58mmol/mol (7.5%) on triple therapy'
                },
                firstLine: 'Metformin 500mg twice daily with meals, increase to 1g twice daily if tolerated',
                secondLine: {
                    'CVD established': 'SGLT2 inhibitor with proven CV benefit (empagliflozin, canagliflozin, dapagliflozin)',
                    'Heart failure': 'SGLT2 inhibitor (empagliflozin or dapagliflozin)',
                    'CKD': 'SGLT2 inhibitor if eGFR ≥30ml/min/1.73m²',
                    'Standard approach': 'DPP-4 inhibitor, pioglitazone, sulfonylurea, or SGLT2 inhibitor'
                },
                monitoring: {
                    'HbA1c': 'Every 3-6 months until stable, then 6-monthly',
                    'Annual review': 'BMI, BP, cholesterol, kidney function, foot examination, retinal screening',
                    'Diabetes complications': 'Annual diabetic eye screening, foot risk assessment'
                },
                lifestyle: 'Structured education programme (DESMOND). Weight management if BMI ≥25kg/m²',
                complications: {
                    'Diabetic kidney disease': 'ACE inhibitor or ARB. SGLT2 inhibitor if eGFR ≥30',
                    'Retinopathy': 'Annual digital retinal screening. Refer if sight-threatening',
                    'Neuropathy': 'Annual foot risk assessment. First-line neuropathic pain: amitriptyline, duloxetine, gabapentin, pregabalin'
                }
            },
            'asthma': {
                title: 'Asthma Management (NICE NG80 2024)',
                category: 'pulmonary',
                evidenceLevel: 'NICE Clinical Guideline',
                lastUpdated: '2024',
                organisation: 'NICE',
                diagnosis: {
                    'Clinical features': 'Wheeze, breathlessness, chest tightness, cough. Symptoms worse at night/early morning',
                    'Investigations': 'Fractional exhaled nitric oxide (FeNO) if available. Spirometry with bronchodilator reversibility',
                    'FeNO levels': '<25 ppb: asthma less likely. 25-50 ppb: intermediate. >50 ppb: high probability of asthma'
                },
                treatment: {
                    'Step 1': 'SABA reliever therapy PRN (salbutamol 100-200 micrograms)',
                    'Step 2': 'Add low-dose ICS preventer (beclometasone 200-400 micrograms/day or equivalent)',
                    'Step 3': 'MART (Maintenance and Reliever Therapy) with ICS/formoterol OR ICS + LABA',
                    'Step 4': 'Increase ICS to moderate dose OR add LTRA (montelukast)',
                    'Step 5': 'High-dose ICS OR additional therapies (theophylline, LAMA). Consider specialist referral'
                },
                acute: {
                    'Moderate': 'PEFR 50-75% best/predicted. Prednisolone 40-50mg daily for 5 days',
                    'Severe': 'PEFR 33-50% best/predicted. Oxygen to maintain SpO2 94-98%. High-dose nebulised salbutamol',
                    'Life-threatening': 'PEFR <33%. Silent chest, cyanosis, poor respiratory effort. IV magnesium sulfate, consider IV salbutamol'
                },
                monitoring: 'Annual asthma review. Assess inhaler technique, adherence, trigger avoidance',
                inhalers: {
                    'pMDI': 'Pressurised metered dose inhaler - requires coordination. Use spacer device',
                    'DPI': 'Dry powder inhaler - breath-actuated, needs adequate inspiratory flow',
                    'Spacer': 'Reduces oropharyngeal deposition, improves drug delivery to lungs'
                },
                triggers: 'House dust mite, pollen, pets, exercise, viral infections, occupational allergens, drugs (aspirin, beta-blockers)'
            },
            'copd': {
                title: 'COPD Management (NICE NG115 2024)',
                category: 'pulmonary',
                evidenceLevel: 'NICE Clinical Guideline',
                lastUpdated: '2024',
                organisation: 'NICE',
                diagnosis: 'Post-bronchodilator FEV1/FVC ratio <0.7 confirms airflow obstruction',
                stages: {
                    'Stage 1 (Mild)': 'FEV1 ≥80% predicted',
                    'Stage 2 (Moderate)': 'FEV1 50-79% predicted',
                    'Stage 3 (Severe)': 'FEV1 30-49% predicted',
                    'Stage 4 (Very severe)': 'FEV1 <30% predicted'
                },
                treatment: {
                    'SABA/SAMA': 'Short-acting bronchodilator for breathlessness and exercise limitation',
                    'LABA/LAMA': 'If symptoms persist. LAMA preferred if asthmatic features absent',
                    'ICS': 'Consider adding ICS to LABA/LAMA if asthmatic features, eosinophilia, or steroid-responsive symptoms'
                },
                exacerbations: {
                    'Mild-moderate': 'Increase bronchodilator use. Consider prednisolone 30mg daily for 5 days',
                    'Severe': 'Oral prednisolone + antibiotics if purulent sputum/clinical signs of pneumonia',
                    'Very severe': 'Hospital admission. Consider NIV if pH 7.25-7.35, O2 with target SpO2 88-92%'
                },
                lifestyle: 'Smoking cessation (most important intervention). Pulmonary rehabilitation. Annual influenza vaccination. Pneumococcal vaccination',
                monitoring: 'Annual review. MRC dyspnoea scale, exacerbation frequency, CAT score'
            },
            'ckd': {
                title: 'Chronic Kidney Disease (NICE NG203 2024)',
                category: 'renal',
                evidenceLevel: 'NICE Clinical Guideline',
                lastUpdated: '2024',
                organisation: 'NICE',
                stages: {
                    'G1': 'eGFR ≥90 with kidney damage',
                    'G2': 'eGFR 60-89 with kidney damage',
                    'G3a': 'eGFR 45-59 (mild-moderate decrease)',
                    'G3b': 'eGFR 30-44 (moderate-severe decrease)',
                    'G4': 'eGFR 15-29 (severe decrease)',
                    'G5': 'eGFR <15 (kidney failure)'
                },
                monitoring: {
                    'G1-G2': 'Annual eGFR and ACR',
                    'G3a': 'Annual eGFR and ACR',
                    'G3b': '6-monthly eGFR and ACR',
                    'G4-G5': '3-6 monthly eGFR and ACR. Prepare for RRT'
                },
                treatment: {
                    'ACE inhibitor/ARB': 'If diabetes, hypertension, or ACR ≥3mg/mmol',
                    'Statin': 'Atorvastatin 20mg for primary prevention of CVD',
                    'Blood pressure': 'Target <140/90 mmHg (<130/80 if ACR >70mg/mmol)',
                    'Mineral bone disease': 'Monitor calcium, phosphate, PTH, vitamin D'
                },
                referral: {
                    'Immediate': 'AKI, eGFR <30, ACR >70mg/mmol, suspected renal artery stenosis',
                    'Routine': 'eGFR 30-60 with progressive decline, ACR 30-70mg/mmol, hypertension difficult to control'
                },
                complications: 'Anaemia (Hb <110g/L), mineral bone disease, metabolic acidosis, cardiovascular disease'
            },
            'heart-failure': {
                title: 'Heart Failure (NICE NG106 2024)',
                category: 'cardiovascular',
                evidenceLevel: 'NICE Clinical Guideline',
                lastUpdated: '2024',
                organisation: 'NICE',
                diagnosis: 'Clinical features + structural/functional cardiac abnormality. BNP >400pg/mL or NT-proBNP >2000pg/mL',
                classification: {
                    'HFrEF': 'Heart failure with reduced ejection fraction (LVEF ≤40%)',
                    'HFmrEF': 'Heart failure with mid-range ejection fraction (LVEF 41-49%)',
                    'HFpEF': 'Heart failure with preserved ejection fraction (LVEF ≥50%)'
                },
                treatment: {
                    'ACE inhibitor': 'First-line for HFrEF. Start ramipril 1.25mg twice daily, titrate to 5mg twice daily',
                    'Beta-blocker': 'Add bisoprolol or carvedilol once ACE inhibitor established',
                    'MRA': 'Add spironolactone if symptoms persist despite ACE inhibitor + beta-blocker',
                    'ARB': 'If ACE inhibitor not tolerated. Candesartan or valsartan',
                    'SGLT2 inhibitor': 'Consider dapagliflozin in HFrEF with diabetes or eGFR ≥25'
                },
                monitoring: 'U&Es within 1-2 weeks of starting/changing dose. Aim for target doses if tolerated',
                deviceTherapy: {
                    'ICD': 'Primary prevention if LVEF ≤35% despite 3 months optimal medical therapy',
                    'CRT': 'If LVEF ≤35%, QRS ≥130ms, sinus rhythm, on optimal medical therapy'
                },
                lifestyle: 'Daily weight monitoring. Fluid restriction if severe symptoms. Cardiac rehabilitation'
            },
            'af': {
                title: 'Atrial Fibrillation (NICE NG196 2024)',
                category: 'cardiovascular',
                evidenceLevel: 'NICE Clinical Guideline',
                lastUpdated: '2024',
                organisation: 'NICE',
                types: {
                    'Paroxysmal': 'Self-terminating within 7 days (usually <48 hours)',
                    'Persistent': 'Lasts >7 days or requires cardioversion',
                    'Long-standing persistent': '>12 months duration',
                    'Permanent': 'Accepted long-term AF, no attempt at rhythm control'
                },
                rateControl: {
                    'First-line': 'Beta-blocker or rate-limiting CCB (diltiazem, verapamil)',
                    'Alternative': 'Digoxin (if sedentary or heart failure)',
                    'Target': 'Resting heart rate <110 bpm (lenient control)',
                    'Strict control': '<80 bpm if symptoms persist'
                },
                rhythmControl: {
                    'Indications': 'Symptomatic AF despite rate control, younger patients, first presentation',
                    'Cardioversion': 'If AF <48 hours or anticoagulated for ≥3 weeks',
                    'Maintenance': 'Amiodarone, sotalol, flecainide (if no structural heart disease)'
                },
                anticoagulation: {
                    'CHA₂DS₂-VASc': 'Calculate stroke risk. Anticoagulate if score ≥2 (men) or ≥3 (women)',
                    'HAS-BLED': 'Assess bleeding risk but high score not contraindication',
                    'DOAC': 'First-line: apixaban, dabigatran, edoxaban, rivaroxaban',
                    'Warfarin': 'If DOAC contraindicated. Target INR 2.0-3.0'
                },
                monitoring: 'Annual review. Check for symptoms, pulse rate/rhythm, blood pressure, medication adherence'
            },
            'depression': {
                title: 'Depression Management (NICE NG222 2024)',
                category: 'mental-health',
                evidenceLevel: 'NICE Clinical Guideline',
                lastUpdated: '2024',
                organisation: 'NICE',
                assessment: {
                    'PHQ-9': 'Patient Health Questionnaire for severity assessment',
                    'Mild': 'PHQ-9 score 5-9. Watchful waiting, self-help, brief interventions',
                    'Moderate': 'PHQ-9 score 10-14. Psychological interventions or antidepressants',
                    'Severe': 'PHQ-9 score 15-19. Antidepressants + psychological interventions'
                },
                psychological: {
                    'First-line': 'CBT (individual or group), guided self-help, computerised CBT',
                    'Alternatives': 'IPT (interpersonal therapy), counselling, mindfulness-based cognitive therapy'
                },
                pharmacological: {
                    'First-line': 'SSRI (sertraline, citalopram, fluoxetine, paroxetine)',
                    'Second-line': 'Different SSRI, SNRI (venlafaxine), mirtazapine',
                    'Starting dose': 'Sertraline 50mg daily, citalopram 20mg daily'
                },
                monitoring: {
                    'Initial': 'Review within 2 weeks of starting antidepressant',
                    'Young people': 'Weekly for first month if <30 years old',
                    'Ongoing': 'Every 2-4 weeks for first 3 months, then less frequently'
                },
                duration: 'Continue antidepressant for ≥6 months after remission. Consider longer if recurrent episodes',
                riskFactors: 'Discontinuation symptoms, suicide risk (especially early treatment), drug interactions'
            },
            'obesity': {
                title: 'Obesity Management (NICE NG189 2024)',
                category: 'endocrine',
                evidenceLevel: 'NICE Clinical Guideline',
                lastUpdated: '2024',
                organisation: 'NICE',
                classification: {
                    'Overweight': 'BMI 25-29.9 kg/m²',
                    'Obesity class I': 'BMI 30-34.9 kg/m²',
                    'Obesity class II': 'BMI 35-39.9 kg/m²',
                    'Obesity class III': 'BMI ≥40 kg/m²'
                },
                assessment: 'BMI, waist circumference, comorbidities (T2DM, hypertension, sleep apnoea), cardiovascular risk',
                lifestyle: {
                    'Diet': 'Calorie deficit 600kcal/day. Mediterranean-style, low-calorie, low-fat diets',
                    'Exercise': 'Gradually increase to 150-300 minutes moderate intensity per week',
                    'Behaviour': 'Goal setting, self-monitoring, cognitive restructuring'
                },
                pharmacotherapy: {
                    'Orlistat': 'BMI ≥30 or ≥28 with comorbidities. 120mg three times daily with meals',
                    'GLP-1 agonists': 'Specialist initiation. Liraglutide if specific criteria met',
                    'Monitoring': 'Weight loss target ≥5% at 3 months, ≥10% at 6 months'
                },
                surgery: {
                    'Criteria': 'BMI ≥40 or ≥35 with comorbidities. Failed non-surgical methods',
                    'Options': 'Gastric bypass, sleeve gastrectomy, adjustable gastric band',
                    'Follow-up': 'Lifelong specialist monitoring, nutritional supplements'
                },
                comorbidities: 'Screen for T2DM, hypertension, dyslipidaemia, sleep apnoea, NAFLD, osteoarthritis'
            },
            'stroke': {
                title: 'Stroke Prevention & Management (NICE NG128 2024)',
                category: 'neurological',
                evidenceLevel: 'NICE Clinical Guideline',
                lastUpdated: '2024',
                organisation: 'NICE',
                prevention: {
                    'Antiplatelet': 'Aspirin 75mg + dipyridamole 200mg twice daily for secondary prevention',
                    'Anticoagulation': 'For AF: DOAC first-line (apixaban, rivaroxaban, dabigatran)',
                    'Statin': 'Atorvastatin 80mg daily for secondary prevention',
                    'Blood pressure': 'Target <130/80 mmHg. Start 2 weeks after acute stroke'
                },
                acute: {
                    'Recognition': 'FAST (Face, Arms, Speech, Time) assessment',
                    'Thrombolysis': 'Alteplase within 4.5 hours of symptom onset if eligible',
                    'Thrombectomy': 'Within 6 hours for proximal anterior circulation occlusion',
                    'Aspirin': '300mg daily for 2 weeks, then 75mg daily long-term'
                },
                rehabilitation: {
                    'Early': 'Mobilisation within 24 hours if medically stable',
                    'MDT': 'Physiotherapy, occupational therapy, speech therapy, dietician',
                    'Goals': 'Functional independence, swallowing assessment, mood screening'
                },
                riskFactors: 'Hypertension, AF, diabetes, smoking, hyperlipidaemia, carotid stenosis, previous TIA/stroke',
                monitoring: 'Annual review: BP, cholesterol, diabetes control, medication adherence, functional status'
            },
            'uti': {
                title: 'Urinary Tract Infections (NICE NG109 2024)',
                category: 'infectious-diseases',
                evidenceLevel: 'NICE Clinical Guideline',
                lastUpdated: '2024',
                organisation: 'NICE',
                diagnosis: {
                    'Uncomplicated UTI': 'Dysuria, frequency, urgency, suprapubic pain in healthy women',
                    'Complicated UTI': 'Men, pregnant women, children, catheterised patients, immunocompromised',
                    'Urine dipstick': 'Nitrites + leucocyte esterase positive. Blood may be present'
                },
                treatment: {
                    'Uncomplicated cystitis': 'Nitrofurantoin 100mg twice daily for 3 days OR trimethoprim 200mg twice daily for 3 days',
                    'Pyelonephritis': 'Ciprofloxacin 500mg twice daily for 7 days OR co-amoxiclav 500/125mg three times daily for 14 days',
                    'Men': 'Trimethoprim 200mg twice daily for 7 days OR nitrofurantoin 100mg twice daily for 7 days',
                    'Pregnancy': 'Nitrofurantoin 100mg twice daily for 7 days (avoid at term)'
                },
                recurrent: {
                    'Definition': '≥3 UTIs in 12 months or ≥2 in 6 months',
                    'Prevention': 'Post-coital prophylaxis, continuous prophylaxis, self-treatment',
                    'Prophylaxis': 'Trimethoprim 100mg at night OR nitrofurantoin 50mg at night'
                },
                catheter: {
                    'Symptomatic CAUTI': 'Treat with antibiotics based on local guidelines',
                    'Asymptomatic bacteriuria': 'Do not treat unless immunocompromised or before invasive procedures'
                },
                advice: 'Adequate fluid intake, complete antibiotic course, cranberry products may help prevent recurrence'
            }
        };

        const container = document.getElementById('guidelines-panel');
        container.innerHTML = `
            <div class="search-container">
                <input type="text" id="guidelines-search" placeholder="Search guidelines...">
                <div id="guidelines-search-results" class="lab-grid"></div>
            </div>
            <div class="guidelines-categories">
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('all'); event.stopPropagation();">All Guidelines</button>
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('cardiovascular'); event.stopPropagation();">Cardiovascular</button>
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('pulmonary'); event.stopPropagation();">Pulmonary</button>
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('endocrine'); event.stopPropagation();">Endocrine</button>
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('renal'); event.stopPropagation();">Renal</button>
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('mental-health'); event.stopPropagation();">Mental Health</button>
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('neurological'); event.stopPropagation();">Neurological</button>
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('infectious-diseases'); event.stopPropagation();">Infectious Diseases</button>
            </div>
            <div id="guidelines-list" class="lab-grid"></div>
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
            <button class="lab-value-btn" onclick="console.log('📋 Guideline search result clicked:', '${guideline}'); window.quizApp.showGuidelineDetail('${guideline}'); event.stopPropagation();">
                <div class="lab-name">${guidelinesDatabase[guideline].title}</div>
                <div class="lab-count">${guidelinesDatabase[guideline].category}</div>
            </button>
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
            <button class="lab-value-btn" onclick="console.log('📋 Guideline card clicked:', '${guideline}'); window.quizApp.showGuidelineDetail('${guideline}'); event.stopPropagation();">
                <div class="lab-name">${guidelinesDatabase[guideline].title}</div>
                <div class="lab-count">${guidelinesDatabase[guideline].category}</div>
            </button>
        `).join('');
    }
    
    showGuidelineDetail(guidelineKey) {
        console.log('📋 Opening guideline detail:', guidelineKey);
        const guideline = this.guidelinesDatabase[guidelineKey];
        const container = document.getElementById('guidelines-panel');
        
        let contentHtml = `
            <button class="back-btn" onclick="window.quizApp.loadGuidelines()">← Back to Guidelines</button>
            <div class="guideline-detail">
                <h3>${guideline.title}</h3>
                <div class="guideline-meta">
                    <span class="evidence-level">📋 ${guideline.evidenceLevel || 'Evidence-based'}</span>
                    <span class="last-updated">🗓️ Last updated: ${guideline.lastUpdated || 'Recent'}</span>
                </div>
        `;
        
        if (guideline.stages) {
            contentHtml += `
                <div class="info-section">
                    <h4>📊 Stages/Classification</h4>
                    ${Object.entries(guideline.stages).map(([stage, description]) => `
                        <div class="stage-item">
                            <strong>${stage}:</strong> ${description}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.groups) {
            contentHtml += `
                <div class="info-section">
                    <h4>👥 Patient Groups</h4>
                    ${Object.entries(guideline.groups).map(([group, description]) => `
                        <div class="group-item">
                            <strong>${group}:</strong> ${description}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.targets) {
            contentHtml += `
                <div class="info-section">
                    <h4>🎯 Treatment Targets</h4>
                    ${Object.entries(guideline.targets).map(([target, value]) => `
                        <div class="target-item">
                            <strong>${target}:</strong> ${value}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.treatment) {
            contentHtml += `
                <div class="info-section">
                    <h4>💊 Treatment Recommendations</h4>
                    ${Object.entries(guideline.treatment).map(([stage, treatment]) => `
                        <div class="treatment-item">
                            <strong>${stage}:</strong> ${treatment}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.algorithm) {
            contentHtml += `
                <div class="info-section">
                    <h4>🔄 Treatment Algorithm</h4>
                    ${Object.entries(guideline.algorithm).map(([step, description]) => `
                        <div class="algorithm-item">
                            <strong>${step}:</strong> ${description}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.medications) {
            contentHtml += `
                <div class="info-section">
                    <h4>💊 Medication Classes</h4>
                    ${Object.entries(guideline.medications).map(([type, meds]) => `
                        <div class="medication-item">
                            <strong>${type}:</strong> ${meds}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.firstLine) {
            contentHtml += `
                <div class="info-section">
                    <h4>🥇 First-line Therapy</h4>
                    <p>${guideline.firstLine}</p>
                </div>
            `;
        }
        
        if (guideline.secondLine) {
            contentHtml += `
                <div class="info-section">
                    <h4>🥈 Second-line Options</h4>
                    ${typeof guideline.secondLine === 'string' ? 
                        `<p>${guideline.secondLine}</p>` :
                        Object.entries(guideline.secondLine).map(([indication, treatment]) => `
                            <div class="secondline-item">
                                <strong>${indication}:</strong> ${treatment}
                            </div>
                        `).join('')
                    }
                </div>
            `;
        }
        
        if (guideline.lifestyle) {
            contentHtml += `
                <div class="info-section">
                    <h4>🏃‍♂️ Lifestyle Modifications</h4>
                    <p>${guideline.lifestyle}</p>
                </div>
            `;
        }
        
        if (guideline.monitoring) {
            contentHtml += `
                <div class="info-section">
                    <h4>📊 Monitoring</h4>
                    ${typeof guideline.monitoring === 'string' ? 
                        `<p>${guideline.monitoring}</p>` :
                        Object.entries(guideline.monitoring).map(([parameter, frequency]) => `
                            <div class="monitoring-item">
                                <strong>${parameter}:</strong> ${frequency}
                            </div>
                        `).join('')
                    }
                </div>
            `;
        }
        
        if (guideline.contraindications) {
            contentHtml += `
                <div class="info-section">
                    <h4>⚠️ Contraindications</h4>
                    ${Object.entries(guideline.contraindications).map(([drug, contraindication]) => `
                        <div class="contraindication-item">
                            <strong>${drug}:</strong> ${contraindication}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.specialPopulations) {
            contentHtml += `
                <div class="info-section">
                    <h4>👨‍⚕️ Special Populations</h4>
                    ${Object.entries(guideline.specialPopulations).map(([population, guidance]) => `
                        <div class="special-population-item">
                            <strong>${population}:</strong> ${guidance}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.exacerbations) {
            contentHtml += `
                <div class="info-section">
                    <h4>🚨 Exacerbation Management</h4>
                    ${Object.entries(guideline.exacerbations).map(([severity, treatment]) => `
                        <div class="exacerbation-item">
                            <strong>${severity}:</strong> ${treatment}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.nonPharmacologic) {
            contentHtml += `
                <div class="info-section">
                    <h4>🏥 Non-pharmacologic Interventions</h4>
                    ${Object.entries(guideline.nonPharmacologic).map(([intervention, description]) => `
                        <div class="nonpharm-item">
                            <strong>${intervention}:</strong> ${description}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.redFlags) {
            contentHtml += `
                <div class="info-section alert">
                    <h4>🚩 Red Flags</h4>
                    <p>${guideline.redFlags}</p>
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
                redFlags: '🚩 Sudden onset, severe pain, radiation to back/jaw, diaphoresis, hypotension, syncope',
                presentations: {
                    'Acute coronary syndrome': {
                        features: 'Crushing, substernal, radiates to left arm/jaw, diaphoresis, dyspnea, nausea. Risk factors: age, DM, HTN, smoking, family history',
                        tests: 'ECG (ST changes, Q waves), troponins (peak 12-24h), CXR, echo if available',
                        urgency: 'Emergency',
                        timeToTreat: '90 minutes door-to-balloon for STEMI',
                        clinicalPearls: 'Women may present atypically (fatigue, nausea). Troponins can be elevated in kidney disease',
                        differentiatingFeatures: 'Chest pressure >20min, not positional, not reproduced by palpation'
                    },
                    'Pulmonary embolism': {
                        features: 'Sudden onset, pleuritic, dyspnea, tachycardia. Risk factors: immobilization, surgery, malignancy, OCP, DVT',
                        tests: 'Wells score, D-dimer (if low risk), CTPA, V/Q scan, echo (RV strain)',
                        urgency: 'Emergency',
                        timeToTreat: 'Anticoagulation within hours if high suspicion',
                        clinicalPearls: 'Wells score >4 = high risk. Normal D-dimer rules out PE if low risk. Tachycardia most common sign',
                        differentiatingFeatures: 'Sudden onset, associated dyspnea, risk factors for VTE'
                    },
                    'Pneumothorax': {
                        features: 'Sudden onset, sharp, pleuritic, dyspnea. Risk factors: tall, thin, young males, COPD, trauma',
                        tests: 'CXR (upright, expiratory), CT chest if small pneumothorax suspected',
                        urgency: 'Urgent',
                        timeToTreat: 'Immediate chest tube if tension pneumothorax',
                        clinicalPearls: 'May be missed on supine CXR. Tension pneumothorax causes hemodynamic compromise',
                        differentiatingFeatures: 'Decreased breath sounds, hyperresonance to percussion'
                    },
                    'Aortic dissection': {
                        features: 'Tearing, severe, radiates to back, pulse deficits, HTN. Risk factors: HTN, Marfan, bicuspid valve',
                        tests: 'CTA chest (preferred), TEE, MRI. ECG to rule out MI',
                        urgency: 'Emergency',
                        timeToTreat: 'Emergency surgery for Type A, medical management for Type B',
                        clinicalPearls: 'Type A involves ascending aorta, Type B does not. Blood pressure differential >20mmHg between arms',
                        differentiatingFeatures: 'Maximal intensity at onset, tearing quality, back radiation'
                    },
                    'GERD': {
                        features: 'Burning, retrosternal, postprandial, positional, antacid relief. Triggers: spicy foods, caffeine, alcohol',
                        tests: 'Clinical diagnosis, PPI trial, EGD if alarming features (dysphagia, weight loss, GI bleeding)',
                        urgency: 'Non-urgent',
                        timeToTreat: 'PPI trial 4-8 weeks',
                        clinicalPearls: 'Can mimic angina. Barrett esophagus risk with chronic GERD. H. pylori testing if refractory',
                        differentiatingFeatures: 'Relationship to meals, positional, responds to antacids'
                    },
                    'Costochondritis': {
                        features: 'Sharp, localized, reproducible with palpation, worse with movement/deep inspiration',
                        tests: 'Clinical diagnosis, rule out cardiac causes if risk factors present',
                        urgency: 'Non-urgent',
                        timeToTreat: 'NSAIDs, heat/ice therapy',
                        clinicalPearls: 'Diagnosis of exclusion. Tietze syndrome involves swelling of costal cartilage',
                        differentiatingFeatures: 'Reproducible with palpation, sharp quality, chest wall tenderness'
                    },
                    'Anxiety/Panic attack': {
                        features: 'Sudden onset, sharp/stabbing, palpitations, diaphoresis, sense of doom, hyperventilation',
                        tests: 'Rule out organic causes first, especially in older patients or those with risk factors',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Reassurance, breathing exercises, consider anxiolytics',
                        clinicalPearls: 'Peak symptoms within 10 minutes. Often recurrent. Associated with agoraphobia',
                        differentiatingFeatures: 'Young patient, recurrent episodes, associated anxiety symptoms'
                    }
                }
            },
            'shortness-of-breath': {
                title: 'Shortness of Breath (Dyspnea)',
                category: 'Pulmonary/Cardiovascular',
                redFlags: '🚩 Stridor, tripod positioning, inability to speak, cyanosis, altered mental status',
                presentations: {
                    'Heart failure': {
                        features: 'Exertional dyspnea, orthopnea, PND, bilateral ankle edema, JVD, S3 gallop. History of CAD, HTN, DM',
                        tests: 'BNP/NT-proBNP (>400 pg/mL), echo (EF, wall motion), CXR (pulmonary edema), ECG',
                        urgency: 'Urgent',
                        timeToTreat: 'Diuretics, ACE-I, beta-blockers per guidelines',
                        clinicalPearls: 'BNP <100 rules out HF. Preserved vs reduced EF affects treatment. Check for precipitants',
                        differentiatingFeatures: 'Orthopnea, PND, bilateral edema, elevated JVP'
                    },
                    'Asthma exacerbation': {
                        features: 'Wheezing, cough, chest tightness, trigger exposure (allergens, URI, exercise), personal/family history',
                        tests: 'Peak flow (<50% predicted = severe), ABG if severe, CXR to rule out pneumothorax',
                        urgency: 'Urgent',
                        timeToTreat: 'Beta-agonists, steroids, escalate based on severity',
                        clinicalPearls: 'Silent chest = severe. Peak flow may be unreliable in severe cases. Consider vocal cord dysfunction',
                        differentiatingFeatures: 'Expiratory wheeze, response to bronchodilators, known triggers'
                    },
                    'COPD exacerbation': {
                        features: 'Increased dyspnea, cough, sputum production (purulent), smoking history, barrel chest, prolonged expiration',
                        tests: 'ABG (CO2 retention), CXR (hyperinflation), sputum culture, CBC',
                        urgency: 'Urgent',
                        timeToTreat: 'Bronchodilators, steroids, antibiotics if purulent sputum',
                        clinicalPearls: 'Watch for CO2 retention with O2 therapy. NIV may avoid intubation. Check for precipitants',
                        differentiatingFeatures: 'Smoking history, chronic productive cough, barrel chest'
                    },
                    'Pneumonia': {
                        features: 'Fever, cough, purulent sputum, pleuritic chest pain, rales, dullness to percussion',
                        tests: 'CXR (infiltrate), CBC (leukocytosis), blood cultures, sputum culture, procalcitonin',
                        urgency: 'Urgent',
                        timeToTreat: 'Antibiotics within 4-6 hours, based on community vs hospital acquired',
                        clinicalPearls: 'CURB-65 score for severity. Atypical organisms in young patients. Check for complications',
                        differentiatingFeatures: 'Fever, productive cough, focal findings on exam and CXR'
                    },
                    'Pulmonary embolism': {
                        features: 'Sudden onset, pleuritic chest pain, tachycardia, risk factors for VTE',
                        tests: 'Wells score, D-dimer, CTPA, V/Q scan, echo (RV dysfunction)',
                        urgency: 'Emergency',
                        timeToTreat: 'Anticoagulation immediately if high suspicion',
                        clinicalPearls: 'May present with isolated dyspnea. Hampton hump and Westermark sign on CXR rare',
                        differentiatingFeatures: 'Sudden onset, VTE risk factors, clear lungs on exam'
                    },
                    'Anxiety/Hyperventilation': {
                        features: 'Acute onset, perioral numbness, carpopedal spasm, palpitations, sense of doom',
                        tests: 'Rule out organic causes, ABG (respiratory alkalosis), basic metabolic panel',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Reassurance, breathing exercises, paper bag rebreathing',
                        clinicalPearls: 'Often in young patients. May have history of panic attacks. Exclude underlying disease first',
                        differentiatingFeatures: 'Young patient, associated anxiety, perioral numbness'
                    }
                }
            },
            'abdominal-pain': {
                title: 'Abdominal Pain',
                category: 'Gastroenterology/Surgery',
                redFlags: '🚩 Hemodynamic instability, peritoneal signs, severe persistent pain, vomiting blood',
                presentations: {
                    'Appendicitis': {
                        features: 'Periumbilical pain → RLQ, fever, nausea, vomiting, McBurney point tenderness, psoas/obturator signs',
                        tests: 'CT abdomen/pelvis (preferred), ultrasound (children/pregnancy), CBC (leukocytosis), urinalysis',
                        urgency: 'Emergency',
                        timeToTreat: 'Surgery within 12-24 hours, antibiotics if perforated',
                        clinicalPearls: 'Alvarado score for risk stratification. Atypical presentation in elderly, pregnant. Perforation risk increases with time',
                        differentiatingFeatures: 'Migration of pain to RLQ, rebound tenderness, fever'
                    },
                    'Cholecystitis': {
                        features: 'RUQ pain, Murphy sign, fat intolerance, fever, nausea. Risk factors: 4 Fs (fat, female, forty, fertile)',
                        tests: 'Ultrasound (gallstones, wall thickening), HIDA scan if unclear, LFTs, lipase',
                        urgency: 'Urgent',
                        timeToTreat: 'Cholecystectomy within 72 hours, antibiotics if complicated',
                        clinicalPearls: 'Murphy sign more specific than ultrasound findings. Emphysematous cholecystitis in diabetics',
                        differentiatingFeatures: 'RUQ pain, positive Murphy sign, gallstones on imaging'
                    },
                    'Pancreatitis': {
                        features: 'Epigastric pain radiating to back, nausea, vomiting. Triggers: alcohol, gallstones, hypertriglyceridemia',
                        tests: 'Lipase (>3× normal), amylase, CT abdomen if severe, LFTs, triglycerides',
                        urgency: 'Urgent',
                        timeToTreat: 'Supportive care, pain control, IV fluids, NPO',
                        clinicalPearls: 'Ranson criteria for severity. ERCP if gallstone pancreatitis. Watch for complications (pseudocyst, necrosis)',
                        differentiatingFeatures: 'Epigastric pain radiating to back, elevated lipase'
                    },
                    'Bowel obstruction': {
                        features: 'Crampy pain, nausea, vomiting, distension, constipation, high-pitched bowel sounds or silence',
                        tests: 'CT abdomen/pelvis (transition point), abdominal X-ray (dilated loops), CBC, BMP',
                        urgency: 'Emergency',
                        timeToTreat: 'NGT decompression, IV fluids, surgery if complete obstruction',
                        clinicalPearls: 'Small bowel: crampy, early vomiting. Large bowel: distension, late vomiting. Strangulation risk',
                        differentiatingFeatures: 'Crampy pain, vomiting, distension, abnormal bowel sounds'
                    },
                    'Diverticulitis': {
                        features: 'LLQ pain (Western), fever, change in bowel habits, tender mass. More common in elderly',
                        tests: 'CT abdomen/pelvis (wall thickening, fat stranding), CBC, CRP',
                        urgency: 'Urgent',
                        timeToTreat: 'Antibiotics (ciprofloxacin + metronidazole), bowel rest',
                        clinicalPearls: 'Avoid colonoscopy in acute phase. Hinchey classification for severity. Consider complications',
                        differentiatingFeatures: 'LLQ pain, older patient, known diverticulosis'
                    },
                    'Gastroenteritis': {
                        features: 'Crampy pain, diarrhea, nausea, vomiting, fever. Food/water exposure, contacts with similar illness',
                        tests: 'Clinical diagnosis, stool studies if severe/bloody, CBC if dehydrated',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Supportive care, hydration, probiotics',
                        clinicalPearls: 'Usually self-limited. Antibiotics only if bacterial and severe. Watch for dehydration',
                        differentiatingFeatures: 'Diarrhea predominant, food/water exposure, multiple affected individuals'
                    },
                    'Peptic ulcer disease': {
                        features: 'Epigastric pain, relationship to meals (duodenal: hungry pain, gastric: worse with food), H. pylori history',
                        tests: 'H. pylori testing (stool antigen, urea breath test), upper endoscopy if alarming features',
                        urgency: 'Non-urgent',
                        timeToTreat: 'PPI therapy, H. pylori eradication if positive',
                        clinicalPearls: 'NSAID and H. pylori most common causes. Triple therapy for eradication. Watch for complications',
                        differentiatingFeatures: 'Relationship to meals, response to PPIs, H. pylori positive'
                    }
                }
            },
            'headache': {
                title: 'Headache',
                category: 'Neurology',
                redFlags: '🚩 Sudden severe (thunderclap), fever + neck stiffness, focal neurologic deficits, papilledema',
                presentations: {
                    'Migraine': {
                        features: 'Unilateral, throbbing, 4-72 hours, photophobia, phonophobia, nausea. Aura in 20%. Family history common',
                        tests: 'Clinical diagnosis, neuroimaging if atypical features or red flags',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Triptans (within 2 hours), NSAIDs, antiemetics. Preventive therapy if frequent',
                        clinicalPearls: 'POUND criteria (Pulsating, One day, Unilateral, Nausea, Disabling). Avoid medication overuse',
                        differentiatingFeatures: 'Unilateral throbbing, photophobia, family history'
                    },
                    'Tension headache': {
                        features: 'Bilateral, pressing/tightening, mild-moderate, no photophobia/phonophobia, stress-related',
                        tests: 'Clinical diagnosis',
                        urgency: 'Non-urgent',
                        timeToTreat: 'NSAIDs, acetaminophen, stress management, relaxation techniques',
                        clinicalPearls: 'Most common primary headache. Often chronic. Exclude medication overuse',
                        differentiatingFeatures: 'Bilateral pressing pain, no associated symptoms'
                    },
                    'Cluster headache': {
                        features: 'Unilateral severe, orbital/temporal, 15min-3h, lacrimation, nasal congestion. Male predominance, circadian',
                        tests: 'Clinical diagnosis',
                        urgency: 'Urgent',
                        timeToTreat: 'High-flow oxygen, subcutaneous sumatriptan. Preventive: verapamil',
                        clinicalPearls: 'Attacks in clusters (weeks-months). Patient restless during attack. Alcohol trigger during cluster',
                        differentiatingFeatures: 'Severe unilateral orbital pain, autonomic symptoms, restlessness'
                    },
                    'Subarachnoid hemorrhage': {
                        features: 'Sudden severe (thunderclap), worst headache of life, neck stiffness, photophobia, altered consciousness',
                        tests: 'Non-contrast CT head (within 6h), LP if CT negative, CTA for aneurysm',
                        urgency: 'Emergency',
                        timeToTreat: 'Neurosurgical consultation, aneurysm securing, prevent vasospasm',
                        clinicalPearls: 'Sentinel headache may precede. Hunt-Hess grade for severity. Watch for complications',
                        differentiatingFeatures: 'Thunderclap onset, worst headache ever, meningeal signs'
                    },
                    'Meningitis': {
                        features: 'Fever, headache, neck stiffness, photophobia, altered mental status. Kernig/Brudzinski signs',
                        tests: 'LP (opening pressure, cell count, glucose, protein, culture), blood cultures, CT if focal signs',
                        urgency: 'Emergency',
                        timeToTreat: 'Antibiotics immediately after LP (within 1 hour), steroids for bacterial',
                        clinicalPearls: 'Classic triad only in 44%. Bacterial more acute, viral more indolent. Don\'t delay antibiotics',
                        differentiatingFeatures: 'Fever + headache + neck stiffness, altered mental status'
                    }
                }
            }
        };
        
        const container = document.getElementById('differential-dx-container');
        container.innerHTML = `
            <div class="search-container">
                <input type="text" id="ddx-search" placeholder="Search symptoms or diagnoses...">
                <div id="ddx-search-results" class="lab-grid"></div>
            </div>
            <div class="ddx-categories">
                <button class="category-btn" onclick="window.quizApp.showDdxCategory('all'); event.stopPropagation();">All Symptoms</button>
                <button class="category-btn" onclick="window.quizApp.showDdxCategory('cardiovascular'); event.stopPropagation();">CV/Pulm</button>
                <button class="category-btn" onclick="window.quizApp.showDdxCategory('gastroenterology'); event.stopPropagation();">GI/Surgery</button>
            </div>
            <div id="ddx-list" class="lab-grid"></div>
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
            <button class="lab-value-btn" onclick="${match.type === 'symptom' ? `console.log('🔍 DDX search result clicked:', '${match.key}'); window.quizApp.showDdxDetail('${match.key}'); event.stopPropagation();` : `console.log('🔍 Diagnosis search result clicked:', '${match.key}'); window.quizApp.showDiagnosisDetail('${match.symptom}', '${match.key}'); event.stopPropagation();`}">
                <div class="lab-name">${match.name}</div>
                <div class="lab-count">${match.type === 'symptom' ? 'Symptom Complex' : 'Diagnosis'}</div>
            </button>
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
            <button class="lab-value-btn" onclick="console.log('🔍 DDX card clicked:', '${symptom}'); window.quizApp.showDdxDetail('${symptom}'); event.stopPropagation();">
                <div class="lab-name">${ddxDatabase[symptom].title}</div>
                <div class="lab-count">${Object.keys(ddxDatabase[symptom].presentations).length} differentials</div>
            </button>
        `).join('');
    }
    
    showDdxDetail(symptomKey) {
        const symptom = this.ddxDatabase[symptomKey];
        const container = document.getElementById('differential-dx-container');
        
        const presentationsHtml = Object.entries(symptom.presentations).map(([dx, data]) => `
            <button class="ddx-item-btn ${data.urgency.toLowerCase()}" onclick="console.log('🔍 Diagnosis clicked:', '${dx}'); window.quizApp.showDiagnosisDetail('${symptomKey}', '${dx}'); event.stopPropagation();">
                <div class="ddx-diagnosis">${dx}</div>
                <div class="ddx-urgency ${data.urgency.toLowerCase()}">${data.urgency}</div>
                <div class="ddx-features">${data.features.substring(0, 100)}...</div>
                ${data.differentiatingFeatures ? `<div class="ddx-key-features">🔍 ${data.differentiatingFeatures.substring(0, 80)}...</div>` : ''}
            </button>
        `).join('');
        
        container.innerHTML = `
            <button class="back-btn" onclick="window.quizApp.loadDifferentialDx()">← Back to Symptoms</button>
            <div class="ddx-detail">
                <h3>🔍 ${symptom.title}</h3>
                <p class="ddx-category">📋 ${symptom.category}</p>
                ${symptom.redFlags ? `
                <div class="red-flags-banner">
                    <h4>🚨 RED FLAGS</h4>
                    <p>${symptom.redFlags}</p>
                </div>` : ''}
                <h4>📋 Differential Diagnoses:</h4>
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
                <h3>🔍 ${dxKey}</h3>
                <div class="urgency-banner ${diagnosis.urgency.toLowerCase()}">
                    <span class="urgency-level">⚡ ${diagnosis.urgency.toUpperCase()}</span>
                    ${diagnosis.timeToTreat ? `<span class="time-to-treat">⏱️ ${diagnosis.timeToTreat}</span>` : ''}
                </div>
                <div class="diagnosis-info">
                    <div class="info-section">
                        <h4>🎯 Clinical Features</h4>
                        <p>${diagnosis.features}</p>
                    </div>
                    <div class="info-section">
                        <h4>🔬 Diagnostic Tests</h4>
                        <p>${diagnosis.tests}</p>
                    </div>
                    ${diagnosis.differentiatingFeatures ? `
                    <div class="info-section">
                        <h4>🔍 Key Differentiating Features</h4>
                        <p>${diagnosis.differentiatingFeatures}</p>
                    </div>` : ''}
                    ${diagnosis.clinicalPearls ? `
                    <div class="info-section">
                        <h4>💎 Clinical Pearls</h4>
                        <p>${diagnosis.clinicalPearls}</p>
                    </div>` : ''}
                </div>
            </div>
        `;
    }

    // Override switchMedicalTool to load content
    switchMedicalTool(toolType) {
        const toolPanels = document.querySelectorAll('.tool-panel');
        const navButtons = document.querySelectorAll('.tool-nav-btn');
        
        // Remove active class from all nav buttons
        navButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked nav button
        const activeNavBtn = document.querySelector(`[data-tool="${toolType}"]`);
        if (activeNavBtn) {
            activeNavBtn.classList.add('active');
        }
        
        // Hide all panels
        toolPanels.forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Map navigation data-tool values to actual panel IDs
        const panelIdMap = {
            'drug-reference': 'drug-panel',
            'calculators': 'calculator-panel',
            'lab-values': 'lab-panel',
            'guidelines': 'guidelines-panel',
            'differential-dx': 'differential-panel',
            'triads': 'triads-panel'
        };
        
        // Show selected panel
        const panelId = panelIdMap[toolType] || `${toolType}-panel`;
        const targetPanel = document.getElementById(panelId);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
        
        // Load content for the selected tool
        switch(toolType) {
            case 'drug-reference':
                this.loadDrugReference();
                break;
            case 'calculators':
                // Initialize calculator grid - no additional loading needed
                console.log('🧮 Calculators panel activated');
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
            case 'triads':
                this.loadTriads();
                break;
        }
        
        console.log('🩺 Switched to tool:', toolType, 'Panel ID:', panelId);
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
    console.log('🩺 QuizApp initialized and assigned to window.quizApp');
});

// Clinical Triads Database and Functions
const clinicalTriads = {
    // Cardiovascular Triads
    'becks-triad': {
        name: "Beck's Triad",
        category: 'cardiovascular',
        components: ['Elevated JVP', 'Muffled heart sounds', 'Hypotension'],
        condition: 'Cardiac Tamponade',
        mechanism: 'Pericardial compression limiting cardiac filling',
        urgency: 'emergency',
        clinicalSignificance: 'Diagnostic for cardiac tamponade - requires immediate pericardiocentesis',
        ukGuidelines: 'Call cardiology immediately. Consider emergency pericardiocentesis if haemodynamically unstable'
    },
    'virchows-triad': {
        name: "Virchow's Triad",
        category: 'cardiovascular',
        components: ['Hypercoagulability', 'Vascular wall injury', 'Venous stasis'],
        condition: 'Venous Thromboembolism',
        mechanism: 'Three factors predisposing to thrombosis',
        urgency: 'high',
        clinicalSignificance: 'Risk factors for VTE - guides anticoagulation decisions',
        ukGuidelines: 'Use in conjunction with Wells score for VTE risk assessment (NICE CG144)'
    },
    'cushings-triad': {
        name: "Cushing's Triad",
        category: 'neurologic',
        components: ['Hypertension', 'Bradycardia', 'Irregular respirations'],
        condition: 'Raised Intracranial Pressure',
        mechanism: 'Late signs of critically raised ICP',
        urgency: 'emergency',
        clinicalSignificance: 'Late and ominous sign of brain herniation',
        ukGuidelines: 'Emergency neurosurgical referral. Consider mannitol/hypertonic saline'
    },
    'charcots-triad': {
        name: "Charcot's Triad",
        category: 'emergency',
        components: ['Fever', 'Jaundice', 'Right upper quadrant pain'],
        condition: 'Ascending Cholangitis',
        mechanism: 'Bile duct obstruction with infection',
        urgency: 'emergency',
        clinicalSignificance: 'Biliary sepsis requiring urgent decompression',
        ukGuidelines: 'IV antibiotics + urgent ERCP within 24-48h (BSG guidelines)'
    },
    'reynolds-pentad': {
        name: "Reynolds' Pentad",
        category: 'emergency',
        components: ['Charcot\'s triad', 'Mental confusion', 'Shock'],
        condition: 'Suppurative Cholangitis',
        mechanism: 'Severe ascending cholangitis with sepsis',
        urgency: 'emergency',
        clinicalSignificance: 'More severe form of cholangitis with worse prognosis',
        ukGuidelines: 'Immediate IV antibiotics, ITU consideration, urgent biliary decompression'
    },
    'whipples-triad': {
        name: "Whipple's Triad",
        category: 'endocrine',
        components: ['Hypoglycaemic symptoms', 'Low glucose (<2.8mmol/L)', 'Symptom relief with glucose'],
        condition: 'Hypoglycaemia',
        mechanism: 'Confirms true hypoglycaemia vs pseudo-hypoglycaemia',
        urgency: 'moderate',
        clinicalSignificance: 'Establishes genuine hypoglycaemia requiring investigation',
        ukGuidelines: 'Investigate underlying cause if recurrent (insulinoma, drugs, etc.)'
    },
    'kartageners-syndrome': {
        name: "Kartagener's Syndrome",
        category: 'respiratory',
        components: ['Situs inversus', 'Chronic sinusitis', 'Bronchiectasis'],
        condition: 'Primary Ciliary Dyskinesia',
        mechanism: 'Genetic disorder affecting ciliary function',
        urgency: 'low',
        clinicalSignificance: 'Rare genetic condition requiring specialist management',
        ukGuidelines: 'Refer to specialist respiratory centre for PCD testing'
    },
    'millers-fisher': {
        name: "Miller Fisher Syndrome",
        category: 'neurologic',
        components: ['Ophthalmoplegia', 'Ataxia', 'Areflexia'],
        condition: 'Miller Fisher Syndrome (GBS variant)',
        mechanism: 'Autoimmune peripheral neuropathy variant',
        urgency: 'high',
        clinicalSignificance: 'Variant of Guillain-Barré syndrome',
        ukGuidelines: 'Neurology referral, consider IVIG if severe (NICE CG188)'
    },
    'meningism-triad': {
        name: 'Meningism Triad',
        category: 'neurologic',
        components: ['Neck stiffness', 'Photophobia', 'Headache'],
        condition: 'Meningeal Irritation',
        mechanism: 'Inflammation or irritation of meninges',
        urgency: 'emergency',
        clinicalSignificance: 'Suggests meningitis or subarachnoid haemorrhage',
        ukGuidelines: 'Immediate antibiotics if bacterial meningitis suspected (NICE CG102)'
    },
    'malaria-triad': {
        name: 'Malaria Triad',
        category: 'infectious',
        components: ['Fever', 'Rigors', 'Sweating'],
        condition: 'Malaria',
        mechanism: 'Cyclical pattern related to parasite lifecycle',
        urgency: 'emergency',
        clinicalSignificance: 'Classic pattern but not always present',
        ukGuidelines: 'Urgent thick/thin films if travel history positive (PHE guidelines)'
    },
    'felty-syndrome': {
        name: "Felty's Syndrome",
        category: 'rheumatologic',
        components: ['Rheumatoid arthritis', 'Neutropenia', 'Splenomegaly'],
        condition: 'Felty\'s Syndrome',
        mechanism: 'Severe RA with extra-articular manifestations',
        urgency: 'moderate',
        clinicalSignificance: 'Increased infection risk due to neutropenia',
        ukGuidelines: 'Rheumatology referral, monitor for infections'
    },
    'multiple-endocrine-neoplasia-1': {
        name: 'MEN 1 Syndrome',
        category: 'endocrine',
        components: ['Pituitary adenoma', 'Pancreatic islet tumours', 'Parathyroid hyperplasia'],
        condition: 'Multiple Endocrine Neoplasia Type 1',
        mechanism: 'Genetic syndrome affecting multiple endocrine organs',
        urgency: 'moderate',
        clinicalSignificance: 'Hereditary cancer syndrome requiring screening',
        ukGuidelines: 'Genetic counselling and family screening (NICE guidance)'
    }
};

// Initialize triads functionality within QuizApp class
MLAQuizApp.prototype.loadTriads = function() {
    const triadsResults = document.getElementById('triads-results');
    if (!triadsResults) return;
    
    // Create search functionality
    this.setupTriadsSearch();
    
    // Display all triads initially
    this.displayTriads(Object.keys(clinicalTriads));
};

MLAQuizApp.prototype.setupTriadsSearch = function() {
    const searchInput = document.getElementById('triads-search');
    const searchBtn = document.getElementById('triads-search-btn');
    const categoryBtns = document.querySelectorAll('.triad-categories .category-btn');
    
    // Search functionality
    const performTriadsSearch = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const activeCategory = document.querySelector('.triad-categories .category-btn.active')?.dataset.category || 'all';
        
        let filteredTriads = Object.keys(clinicalTriads);
        
        // Filter by category
        if (activeCategory !== 'all') {
            filteredTriads = filteredTriads.filter(triadId => 
                clinicalTriads[triadId].category === activeCategory
            );
        }
        
        // Filter by search term
        if (searchTerm) {
            filteredTriads = filteredTriads.filter(triadId => {
                const triad = clinicalTriads[triadId];
                return (
                    triad.name.toLowerCase().includes(searchTerm) ||
                    triad.condition.toLowerCase().includes(searchTerm) ||
                    triad.components.some(comp => comp.toLowerCase().includes(searchTerm))
                );
            });
        }
        
        this.displayTriads(filteredTriads);
    };
    
    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', performTriadsSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performTriadsSearch();
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performTriadsSearch);
    }
    
    // Category buttons
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            performTriadsSearch();
        });
    });
    
    // Set 'all' as active initially
    const allBtn = document.querySelector('.triad-categories .category-btn[data-category="all"]');
    if (allBtn) allBtn.classList.add('active');
};

MLAQuizApp.prototype.displayTriads = function(triadIds) {
    const triadsResults = document.getElementById('triads-results');
    if (!triadsResults) return;
    
    if (triadIds.length === 0) {
        triadsResults.innerHTML = `
            <div class="no-results">
                <h3>🔍 No triads found</h3>
                <p>Try adjusting your search terms or category filter.</p>
            </div>
        `;
        return;
    }
    
    // Sort triads by urgency (emergency first) then alphabetically
    const urgencyOrder = { 'emergency': 0, 'high': 1, 'moderate': 2, 'low': 3 };
    const sortedTriadIds = triadIds.sort((a, b) => {
        const triadA = clinicalTriads[a];
        const triadB = clinicalTriads[b];
        
        // First sort by urgency
        const urgencyDiff = urgencyOrder[triadA.urgency] - urgencyOrder[triadB.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        
        // Then alphabetically
        return triadA.name.localeCompare(triadB.name);
    });
    
    const triadsHtml = sortedTriadIds.map(triadId => {
        const triad = clinicalTriads[triadId];
        return this.createTriadCard(triad);
    }).join('');
    
    triadsResults.innerHTML = `
        <div class="triads-grid">
            ${triadsHtml}
        </div>
    `;
    
    console.log('🔺 Displayed triads:', triadIds.length);
};

MLAQuizApp.prototype.createTriadCard = function(triad) {
    const urgencyColors = {
        'emergency': '#D32F2F',
        'high': '#F57C00',
        'moderate': '#1976D2',
        'low': '#388E3C'
    };
    
    const urgencyIcons = {
        'emergency': '🚨',
        'high': '⚠️',
        'moderate': 'ℹ️',
        'low': '✅'
    };
    
    const categoryIcons = {
        'cardiovascular': '❤️',
        'respiratory': '🫁',
        'neurologic': '🧠',
        'emergency': '🚨',
        'infectious': '🦠',
        'endocrine': '⚗️',
        'rheumatologic': '🦴',
        'psychiatric': '🧭'
    };
    
    return `
        <div class="triad-card" style="border-left: 4px solid ${urgencyColors[triad.urgency]}">
            <div class="triad-header">
                <h3>
                    ${categoryIcons[triad.category] || '🔺'} ${triad.name}
                    <span class="urgency-badge" style="background: ${urgencyColors[triad.urgency]}">
                        ${urgencyIcons[triad.urgency]} ${triad.urgency.toUpperCase()}
                    </span>
                </h3>
                <div class="condition-name">${triad.condition}</div>
            </div>
            
            <div class="triad-components">
                <h4>🔺 Classic Triad:</h4>
                <div class="components-list">
                    ${triad.components.map(comp => `<span class="component-item">${comp}</span>`).join('')}
                </div>
            </div>
            
            <div class="triad-details">
                <div class="detail-section">
                    <h4>🔬 Mechanism:</h4>
                    <p>${triad.mechanism}</p>
                </div>
                
                <div class="detail-section">
                    <h4>🎯 Clinical Significance:</h4>
                    <p>${triad.clinicalSignificance}</p>
                </div>
                
                <div class="detail-section uk-guidelines">
                    <h4>🇬🇧 UK Guidelines:</h4>
                    <p>${triad.ukGuidelines}</p>
                </div>
            </div>
        </div>
    `;
};

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