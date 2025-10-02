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

        let score = 0;
        if (age >= 65) score += 2;
        else if (age >= 55) score += 1;
        
        if (sex === 'male') score += 1;
        if (document.getElementById('qrisk-smoking').checked) score += 2;
        if (document.getElementById('qrisk-diabetes').checked) score += 2;
        if (document.getElementById('qrisk-copd').checked) score += 1;
        if (document.getElementById('qrisk-af').checked) score += 1;
        if (document.getElementById('qrisk-ckd').checked) score += 1;
        if (document.getElementById('qrisk-ra').checked) score += 1;

        let risk = Math.min(score * 2.5 + (age - 40) * 0.3, 50);
        let riskLevel = '';
        let color = '';
        let recommendation = '';

        if (risk < 10) {
            riskLevel = 'Low risk';
            color = '#4CAF50';
            recommendation = 'Lifestyle advice, reassess in 5 years';
        } else if (risk < 20) {
            riskLevel = 'Medium risk';
            color = '#FF9800';
            recommendation = 'Consider statin therapy, lifestyle modification';
        } else {
            riskLevel = 'High risk';
            color = '#F44336';
            recommendation = 'Statin therapy recommended, aggressive lifestyle changes';
        }

        document.getElementById('qrisk-result').innerHTML = `
            <div style="color: ${color}">
                <strong>10-year CV risk: ${risk.toFixed(1)}%</strong><br>
                <strong>${riskLevel}</strong><br>
                ${recommendation}
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
                <p><small>Early warning score for clinical deterioration</small></p>
                
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
            management = 'Home treatment';
            color = '#4CAF50';
        } else if (score === 1) {
            mortality = '2.7% 30-day mortality';
            management = 'Home treatment or short hospital stay';
            color = '#FFC107';
        } else if (score === 2) {
            mortality = '6.8% 30-day mortality';
            management = 'Hospital treatment';
            color = '#FF9800';
        } else if (score >= 3) {
            mortality = '14% 30-day mortality';
            management = 'Hospital treatment (consider ICU)';
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
                    <label>Bilirubin (μmol/L):</label>
                    <select id="cp-bilirubin">
                        <option value="1"><34 (1 point)</option>
                        <option value="2">34-50 (2 points)</option>
                        <option value="3">>50 (3 points)</option>
                    </select>
                </div>
                <div class="calc-input-group">
                    <label>Albumin (g/L):</label>
                    <select id="cp-albumin">
                        <option value="1">>35 (1 point)</option>
                        <option value="2">28-35 (2 points)</option>
                        <option value="3"><28 (3 points)</option>
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
            'ramipril': {
                name: 'Ramipril',
                class: 'ACE inhibitor',
                mechanism: 'Inhibits ACE, reducing angiotensin II formation and aldosterone secretion',
                dosing: 'HTN: Start 1.25-2.5mg daily, max 10mg daily. Heart failure: Start 1.25mg daily, target 10mg daily',
                contraindications: 'Pregnancy, bilateral renal artery stenosis, angioedema history',
                interactions: 'NSAIDs (↓ efficacy), potassium supplements (hyperkalemia), lithium (↑ levels)',
                monitoring: 'eGFR, potassium, blood pressure. Check 1-2 weeks after initiation/dose change',
                pregnancy: 'Contraindicated - teratogenic',
                sideEffects: 'Dry cough (10%), hyperkalemia, acute kidney injury, angioedema (rare)',
                pharmacokinetics: 'Prodrug activated in liver, Half-life: 13-17h, Excretion: renal',
                clinicalPearls: 'Very common UK first-line ACE inhibitor. Renoprotective in diabetes. Stop if pregnant',
                indication: 'Hypertension, heart failure, post-MI, diabetic nephropathy'
            },
            'bendroflumethiazide': {
                name: 'Bendroflumethiazide',
                class: 'Thiazide-like diuretic',
                mechanism: 'Inhibits sodium-chloride cotransporter in distal convoluted tubule',
                dosing: 'HTN: 2.5mg daily (morning). Oedema: 5-10mg daily initially, then reduce',
                contraindications: 'Anuria, severe renal/hepatic impairment, hypersensitivity to sulfonamides',
                interactions: 'Lithium (↑ levels), digoxin (hypokalemia ↑ toxicity), NSAIDs (↓ effect)',
                monitoring: 'U&Es, glucose, uric acid, blood pressure',
                pregnancy: 'Avoid - may cause neonatal thrombocytopenia',
                sideEffects: 'Hyponatremia, hypokalemia, hyperuricemia, glucose intolerance, impotence',
                pharmacokinetics: 'Onset: 2h, Peak: 4-6h, Duration: 12-18h',
                clinicalPearls: 'Common UK thiazide. Take morning to avoid nocturia. 2.5mg often sufficient for BP',
                indication: 'Hypertension, mild heart failure, oedema'
            },
            'bisoprolol': {
                name: 'Bisoprolol',
                class: 'Cardioselective beta-blocker',
                mechanism: 'Selective β1-adrenoreceptor antagonist, reducing heart rate and contractility',
                dosing: 'HTN: Start 5mg daily, max 20mg daily. Heart failure: Start 1.25mg daily, target 10mg daily',
                contraindications: 'Severe asthma, uncontrolled heart failure, severe bradycardia, heart block',
                interactions: 'Verapamil/diltiazem (AV block), insulin (masks hypoglycemia), NSAIDs',
                monitoring: 'Heart rate, blood pressure, signs of heart failure',
                pregnancy: 'Use if essential - may cause fetal bradycardia',
                sideEffects: 'Fatigue, dizziness, bradycardia, cold extremities, impotence',
                pharmacokinetics: 'Half-life: 10-12h, Bioavailability: 80%, Renal excretion: 50%',
                clinicalPearls: 'Preferred β-blocker in UK guidelines. Cardioselective but not cardiospecific',
                indication: 'Hypertension, heart failure, post-MI, angina'
            },
            'omeprazole': {
                name: 'Omeprazole',
                class: 'Proton pump inhibitor (PPI)',
                mechanism: 'Irreversibly inhibits H+/K+-ATPase (proton pump) in gastric parietal cells',
                dosing: 'GORD: 20mg daily. PUD: 20-40mg daily. H.pylori: 20mg BD with antibiotics',
                contraindications: 'Hypersensitivity to PPIs',
                interactions: 'Clopidogrel (↓ efficacy), warfarin (↑ INR), digoxin (↑ levels)',
                monitoring: 'Vitamin B12, magnesium with long-term use. Review need regularly',
                pregnancy: 'Generally safe - limited human data',
                sideEffects: 'Headache, GI upset, increased infection risk, hypomagnesemia (long-term)',
                pharmacokinetics: 'Onset: 1h, Peak: 2h, Duration: 72h, CYP2C19 metabolism',
                clinicalPearls: 'First PPI available OTC in UK. Take 30min before food. Avoid long-term use without indication',
                indication: 'GORD, peptic ulcer disease, H.pylori eradication, stress ulcer prophylaxis'
            },
            'prednisolone': {
                name: 'Prednisolone',
                class: 'Corticosteroid',
                mechanism: 'Synthetic glucocorticoid with anti-inflammatory and immunosuppressive effects',
                dosing: 'Acute: 30-60mg daily, then taper. Maintenance: 5-15mg daily. Always taper gradually',
                contraindications: 'Systemic infection (unless life-threatening), live vaccines',
                interactions: 'Warfarin (variable effect), NSAIDs (↑ GI bleeding), vaccines (↓ response)',
                monitoring: 'Blood glucose, blood pressure, bone density, growth (children)',
                pregnancy: 'Use if essential - may cause cleft palate (first trimester)',
                sideEffects: 'Weight gain, mood changes, osteoporosis, diabetes, increased infection risk',
                pharmacokinetics: 'Half-life: 12-36h, Oral bioavailability: 70%',
                clinicalPearls: 'Never stop abruptly. Take with food. Common UK oral steroid. Consider bone protection',
                indication: 'Asthma, COPD exacerbation, inflammatory conditions, autoimmune disease'
            },
            'salbutamol': {
                name: 'Salbutamol',
                class: 'Short-acting β2-agonist (SABA)',
                mechanism: 'Selective β2-adrenoreceptor agonist causing bronchodilation',
                dosing: 'Inhaler: 100-200mcg PRN, max 800mcg daily. Nebuliser: 2.5-5mg QDS',
                contraindications: 'Hypersensitivity. Caution in cardiovascular disease, diabetes',
                interactions: 'β-blockers (antagonistic), digoxin (hypokalemia), diuretics',
                monitoring: 'Peak flow, symptoms, heart rate, potassium (high doses)',
                pregnancy: 'Safe - drug of choice in pregnancy',
                sideEffects: 'Tremor, palpitations, headache, hypokalemia (high doses)',
                pharmacokinetics: 'Inhaled onset: 5min, Duration: 3-5h',
                clinicalPearls: 'Blue inhaler. If using >3x/week, need preventer. Spacer improves delivery',
                indication: 'Asthma, COPD, hyperkalemia (nebulised), premature labour'
            },
            'bendroflumethiazide': {
                name: 'Bendroflumethiazide',
                class: 'Thiazide-like diuretic',
                mechanism: 'Inhibits sodium-chloride cotransporter in distal convoluted tubule',
                dosing: 'Hypertension: 2.5mg daily (morning). Oedema: 5-10mg daily initially, then reduce to maintenance',
                contraindications: 'Anuria, severe renal/hepatic impairment, hypersensitivity to sulfonamides, symptomatic hyperuricaemia',
                interactions: 'Lithium (↑ toxicity), digoxin (hypokalaemia ↑ toxicity), NSAIDs (↓ antihypertensive effect)',
                monitoring: 'U&Es, glucose, uric acid, blood pressure. Monitor electrolytes 4-6 weeks after starting',
                pregnancy: 'Avoid - may cause neonatal thrombocytopenia and electrolyte disturbance',
                sideEffects: 'Hyponatraemia, hypokalaemia, hyperuricaemia, glucose intolerance, impotence, postural hypotension',
                pharmacokinetics: 'Onset: 2h, Peak: 4-6h, Duration: 12-18h, Renal excretion',
                clinicalPearls: 'Most common thiazide in UK. Take in morning to avoid nocturia. 2.5mg usually sufficient for BP control',
                indication: 'Hypertension (usually as add-on), mild heart failure, oedema'
            },
            'bisoprolol': {
                name: 'Bisoprolol',
                class: 'Cardioselective β1-adrenoreceptor antagonist',
                mechanism: 'Selective β1-adrenoreceptor blockade, reducing heart rate, contractility and cardiac output',
                dosing: 'Hypertension: Start 5mg daily, max 20mg daily. Heart failure: Start 1.25mg daily, titrate slowly to max 10mg daily',
                contraindications: 'Severe asthma, uncontrolled heart failure, severe bradycardia, 2nd/3rd degree heart block, cardiogenic shock',
                interactions: 'Verapamil/diltiazem (risk of heart block), insulin (may mask hypoglycaemia), NSAIDs (↓ antihypertensive effect)',
                monitoring: 'Heart rate, blood pressure, signs of heart failure exacerbation, glucose (diabetics)',
                pregnancy: 'Use only if essential - may cause fetal bradycardia, hypoglycaemia, IUGR',
                sideEffects: 'Fatigue, dizziness, bradycardia, cold extremities, erectile dysfunction, sleep disturbances',
                pharmacokinetics: 'Half-life: 10-12h, Bioavailability: 80%, 50% renal excretion',
                clinicalPearls: 'Preferred β-blocker in UK guidelines. β1-selective but selectivity lost at high doses. Withdraw gradually',
                indication: 'Hypertension, heart failure, post-MI, stable angina'
            },
            'omeprazole': {
                name: 'Omeprazole',
                class: 'Proton pump inhibitor (PPI)',
                mechanism: 'Irreversibly inhibits gastric H+/K+-ATPase (proton pump), reducing gastric acid production',
                dosing: 'GORD: 20mg daily for 4-8 weeks. Peptic ulcer: 20mg daily for 4-8 weeks. H.pylori eradication: 20mg BD with antibiotics',
                contraindications: 'Hypersensitivity to PPIs, patients with known osteoporosis (relative)',
                interactions: 'Clopidogrel (↓ antiplatelet effect), warfarin (may ↑ INR), atazanavir (↓ absorption)',
                monitoring: 'Magnesium levels with long-term use, vitamin B12 annually, review need for continued treatment',
                pregnancy: 'Safe - no increased risk of congenital malformations',
                sideEffects: 'Headache, GI upset, hypomagnesaemia (long-term), C.diff risk, possible fracture risk',
                pharmacokinetics: 'Onset: 1h, Peak effect: 2h, Duration: up to 72h, CYP2C19 metabolism',
                clinicalPearls: 'First PPI available OTC in UK. Take 30-60min before food. Step down therapy when appropriate',
                indication: 'GORD, peptic ulcer disease, H.pylori eradication, stress ulcer prophylaxis'
            },
            'prednisolone': {
                name: 'Prednisolone',
                class: 'Corticosteroid (glucocorticoid)',
                mechanism: 'Synthetic glucocorticoid with potent anti-inflammatory and immunosuppressive effects',
                dosing: 'Acute conditions: 30-60mg daily initially, then reduce. Maintenance: 2.5-15mg daily. Always reduce gradually',
                contraindications: 'Systemic infection (unless covering with antimicrobials), live vaccines, recent surgery',
                interactions: 'Warfarin (variable effects), NSAIDs (↑ GI bleeding risk), live vaccines (↓ immune response)',
                monitoring: 'Blood glucose, blood pressure, bone density (if >3 months), weight, mood changes',
                pregnancy: 'Use if essential - possible increased risk of cleft palate if used in first trimester',
                sideEffects: 'Weight gain, mood changes, osteoporosis, diabetes, Cushing\'s syndrome, increased infection risk',
                pharmacokinetics: 'Well absorbed orally, Half-life: 12-36h, Hepatic metabolism',
                clinicalPearls: 'Never stop abruptly after >3 weeks use. Take with food. Consider bone protection if prolonged use',
                indication: 'Severe asthma, COPD exacerbation, inflammatory arthritis, severe allergic reactions, autoimmune conditions'
            },
            'salbutamol': {
                name: 'Salbutamol',
                class: 'Short-acting β2-adrenoreceptor agonist (SABA)',
                mechanism: 'Selective β2-adrenoreceptor agonist causing smooth muscle relaxation and bronchodilation',
                dosing: 'MDI: 100-200micrograms PRN (max 800micrograms/day). Nebuliser: 2.5-5mg up to QDS. Acute severe asthma: 5mg nebulised',
                contraindications: 'Hypersensitivity. Caution in cardiovascular disease, diabetes, hyperthyroidism',
                interactions: 'β-blockers (antagonism), digoxin (hypokalaemia may ↑ toxicity), theophylline (↑ toxicity risk)',
                monitoring: 'Peak flow, symptom relief, heart rate, potassium levels (high-dose nebulised)',
                pregnancy: 'Safe - preferred bronchodilator in pregnancy and breastfeeding',
                sideEffects: 'Fine tremor, palpitations, headache, muscle cramps, hypokalaemia (high doses)',
                pharmacokinetics: 'Inhaled onset: 5min, Peak: 15-30min, Duration: 3-5h',
                clinicalPearls: 'Blue reliever inhaler. Use with spacer device. If needed >3x/week, requires preventer therapy',
                indication: 'Asthma, COPD, acute bronchospasm, premature labour (tocolysis), hyperkalaemia (nebulised)'
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
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('antibiotics'); event.stopPropagation();">Antibiotics</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('cardiovascular'); event.stopPropagation();">Cardiovascular</button>
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('endocrine'); event.stopPropagation();">Endocrine</button>
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
                        normal: '4.5-11.0 × 10³/μL', 
                        low: 'Immunosuppression, viral infection, autoimmune disease, chemotherapy', 
                        high: 'Bacterial infection, leukemia, stress, tissue necrosis, smoking',
                        critical: '<1.0 or >30 × 10³/μL',
                        ageVariations: 'Newborn: 9-30, Child: 5-17, Adult: 4.5-11',
                        clinicalSignificance: 'Left shift suggests bacterial infection. Lymphocytosis in viral infections.'
                    },
                    'RBC': { 
                        normal: 'M: 4.7-6.1, F: 4.2-5.4 × 10⁶/μL', 
                        low: 'Anemia (iron deficiency, chronic disease, hemolysis), bleeding, kidney disease', 
                        high: 'Polycythemia vera, dehydration, COPD, high altitude',
                        critical: '<2.5 or >7.0 × 10⁶/μL',
                        ageVariations: 'Newborn: 4.8-7.1, Child: 4.0-5.2',
                        clinicalSignificance: 'Combined with Hgb/Hct for anemia classification. MCV helps determine type.'
                    },
                    'Hemoglobin': { 
                        normal: 'M: 14-18, F: 12-16 g/dL', 
                        low: 'Anemia, bleeding, iron deficiency, chronic kidney disease', 
                        high: 'Polycythemia, dehydration, COPD, smoking',
                        critical: '<7.0 or >20 g/dL',
                        ageVariations: 'Newborn: 14-24, Child: 11-16, Pregnancy: 11-13',
                        clinicalSignificance: 'Best indicator of oxygen-carrying capacity. Transfusion threshold typically <7-8 g/dL.'
                    },
                    'Hematocrit': { 
                        normal: 'M: 42-52%, F: 37-47%', 
                        low: 'Anemia, overhydration, pregnancy, bleeding', 
                        high: 'Dehydration, polycythemia, COPD, diuretic use',
                        critical: '<20% or >60%',
                        ageVariations: 'Newborn: 42-75%, Child: 33-45%',
                        clinicalSignificance: 'Rule of 3: Hct ≈ 3 × Hgb. Falsely elevated in dehydration.'
                    },
                    'Platelets': { 
                        normal: '150-450 × 10³/μL', 
                        low: 'ITP, drug-induced, hypersplenism, viral infection, heparin', 
                        high: 'Essential thrombocythemia, reactive (infection, malignancy), iron deficiency',
                        critical: '<20 or >1000 × 10³/μL',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Bleeding risk increases <50K. Spontaneous bleeding <10K. Thrombosis risk >1000K.'
                    },
                    'MCV': {
                        normal: '80-100 fL',
                        low: 'Iron deficiency, thalassemia, chronic disease, lead poisoning',
                        high: 'B12/folate deficiency, alcohol use, hypothyroidism, reticulocytosis',
                        critical: '<70 or >120 fL',
                        ageVariations: 'Child: 70-90, Adult: 80-100',
                        clinicalSignificance: 'Microcytic: iron studies. Macrocytic: B12/folate levels. Normocytic: chronic disease.'
                    }
                }
            },
            'bmp': {
                name: 'Basic Metabolic Panel (BMP)',
                values: {
                    'Glucose': { 
                        normal: '70-100 mg/dL (fasting), <140 random', 
                        low: 'Hypoglycemia: insulin excess, liver disease, adrenal insufficiency, starvation', 
                        high: 'Diabetes, prediabetes, stress, steroids, pancreatic disease',
                        critical: '<40 or >400 mg/dL',
                        ageVariations: 'Child: 60-100, Adult: 70-100, Elderly: may be slightly higher',
                        clinicalSignificance: 'Fasting >126 or random >200 suggests diabetes. HbA1c >6.5% diagnostic.'
                    },
                    'BUN': { 
                        normal: '7-20 mg/dL', 
                        low: 'Liver disease, malnutrition, overhydration, low protein diet', 
                        high: 'Acute/chronic kidney disease, dehydration, GI bleeding, high protein diet',
                        critical: '>100 mg/dL',
                        ageVariations: 'Child: 5-18, Adult: 7-20, Elderly: may be elevated',
                        clinicalSignificance: 'BUN:Cr ratio >20 suggests prerenal azotemia. <10 suggests liver disease.'
                    },
                    'Creatinine': { 
                        normal: 'M: 0.7-1.3, F: 0.6-1.1 mg/dL', 
                        low: 'Low muscle mass, malnutrition, pregnancy', 
                        high: 'Acute/chronic kidney disease, dehydration, muscle breakdown',
                        critical: '>4.0 mg/dL or >3× baseline',
                        ageVariations: 'Child: 0.3-0.7, Adult varies by muscle mass, Elderly: lower baseline',
                        clinicalSignificance: 'Use eGFR for kidney function. 50% increase = AKI. Delayed rise after injury.'
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
                        normal: '136-145 mEq/L', 
                        low: 'SIADH, diuretics, heart failure, liver disease, hypothyroidism', 
                        high: 'Dehydration, diabetes insipidus, excess salt intake, hyperaldosteronism',
                        critical: '<125 or >160 mEq/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Hyponatremia symptoms: confusion, seizures. Correct slowly (0.5-1 mEq/L/hr) to avoid osmotic demyelination.'
                    },
                    'Potassium': { 
                        normal: '3.5-5.0 mEq/L', 
                        low: 'Diuretics, diarrhea, hyperaldosteronism, poor intake, alkalosis', 
                        high: 'Kidney disease, ACE inhibitors, tissue breakdown, acidosis, hemolysis',
                        critical: '<2.5 or >6.5 mEq/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Cardiac effects: peaked T-waves >6.5, paralysis >8.0. Replace cautiously in kidney disease.'
                    },
                    'Chloride': { 
                        normal: '98-107 mEq/L', 
                        low: 'Vomiting, diuretics, Addison disease, metabolic alkalosis', 
                        high: 'Dehydration, hypernatremia, metabolic acidosis, diarrhea',
                        critical: '<85 or >115 mEq/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Usually follows sodium. Anion gap = Na - (Cl + CO2). Normal gap: 8-12.'
                    },
                    'CO2': { 
                        normal: '22-29 mEq/L', 
                        low: 'Metabolic acidosis (DKA, lactic acidosis, renal failure)', 
                        high: 'Metabolic alkalosis (vomiting, diuretics), respiratory acidosis',
                        critical: '<15 or >35 mEq/L',
                        ageVariations: 'Child: 20-28, Adult: 22-29',
                        clinicalSignificance: 'Reflects bicarbonate level. Low CO2 with high anion gap suggests metabolic acidosis.'
                    }
                }
            },
            'lft': {
                name: 'Liver Function Tests (LFT)',
                values: {
                    'ALT': { 
                        normal: 'M: 10-40, F: 7-35 U/L', 
                        low: 'Rarely clinically significant', 
                        high: 'Hepatocellular injury: hepatitis, drugs, alcohol, NASH, Wilson disease',
                        critical: '>1000 U/L (acute hepatic necrosis)',
                        ageVariations: 'Child: 5-25, Adult varies by gender',
                        clinicalSignificance: 'More liver-specific than AST. ALT>AST suggests hepatocellular injury. Peak in acute hepatitis: 1000-5000.'
                    },
                    'AST': { 
                        normal: 'M: 10-40, F: 9-32 U/L', 
                        low: 'Rarely clinically significant', 
                        high: 'Liver/muscle damage, MI, hemolysis, alcohol use',
                        critical: '>1000 U/L',
                        ageVariations: 'Child: 15-40, Adult varies by gender',
                        clinicalSignificance: 'AST>ALT (ratio >2) suggests alcohol. Also elevated in muscle disease, MI, hemolysis.'
                    },
                    'Alkaline Phosphatase': { 
                        normal: '44-147 U/L (adult)', 
                        low: 'Hypothyroidism, malnutrition, Wilson disease', 
                        high: 'Cholestasis, bone disease, pregnancy, malignancy, Paget disease',
                        critical: '>5× upper limit',
                        ageVariations: 'Child/adolescent: 100-390 (bone growth), Pregnancy: elevated',
                        clinicalSignificance: 'Elevated with GGT suggests hepatic source. Isolated elevation: bone disease, pregnancy.'
                    },
                    'GGT': {
                        normal: 'M: 9-50, F: 8-40 U/L',
                        low: 'Rarely significant',
                        high: 'Alcohol use, cholestasis, drugs, NASH',
                        critical: '>10× upper limit',
                        ageVariations: 'Increases with age',
                        clinicalSignificance: 'Most sensitive for alcohol use. Helps differentiate hepatic vs. bone source of elevated ALP.'
                    },
                    'Total Bilirubin': { 
                        normal: '0.3-1.2 mg/dL', 
                        low: 'Rarely significant', 
                        high: 'Hemolysis, liver disease, Gilbert syndrome, cholestasis',
                        critical: '>20 mg/dL',
                        ageVariations: 'Newborn: physiologic elevation first week',
                        clinicalSignificance: 'Conjugated >2.0 suggests hepatic/post-hepatic cause. Unconjugated elevation: hemolysis, Gilbert.'
                    },
                    'Direct Bilirubin': {
                        normal: '0.0-0.3 mg/dL',
                        low: 'Normal',
                        high: 'Hepatocellular injury, cholestasis, Dubin-Johnson syndrome',
                        critical: '>15 mg/dL',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Conjugated bilirubin. Elevation suggests hepatic processing defect or biliary obstruction.'
                    },
                    'Albumin': { 
                        normal: '3.5-5.0 g/dL', 
                        low: 'Liver disease, malnutrition, nephrotic syndrome, inflammation', 
                        high: 'Dehydration (rare)',
                        critical: '<2.0 g/dL',
                        ageVariations: 'Child: 3.4-4.8, Adult: 3.5-5.0, Elderly: may be lower',
                        clinicalSignificance: 'Half-life 20 days, reflects chronic liver function. Low albumin increases drug free fractions.'
                    },
                    'PT/INR': { 
                        normal: 'PT: 11-13 sec, INR: 0.8-1.1', 
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
                        normal: '<200 mg/dL (desirable)', 
                        low: 'Malnutrition, hyperthyroidism, liver disease, malabsorption', 
                        high: 'Familial hypercholesterolemia, diabetes, hypothyroidism, diet',
                        critical: '>400 mg/dL',
                        ageVariations: 'Increases with age until menopause (women)',
                        clinicalSignificance: 'Borderline high: 200-239. High: ≥240. Less important than LDL for risk assessment.'
                    },
                    'LDL': { 
                        normal: '<100 mg/dL (optimal), <70 (high risk)', 
                        low: 'Overtreatment, malnutrition, hyperthyroidism', 
                        high: 'Primary hyperlipidemia, diabetes, hypothyroidism, diet',
                        critical: '>190 mg/dL',
                        ageVariations: 'Increases with age',
                        clinicalSignificance: 'Primary target for statin therapy. Goals: <70 (very high risk), <100 (high risk), <130 (moderate risk).'
                    },
                    'HDL': { 
                        normal: 'M: >40, F: >50 mg/dL', 
                        low: 'Metabolic syndrome, diabetes, smoking, sedentary lifestyle', 
                        high: 'Cardioprotective, exercise, moderate alcohol, genetics',
                        critical: '<25 mg/dL',
                        ageVariations: 'Higher in premenopausal women',
                        clinicalSignificance: 'Low HDL major CAD risk factor. HDL >60 is negative risk factor (protective).'
                    },
                    'Triglycerides': { 
                        normal: '<150 mg/dL', 
                        low: 'Malnutrition, hyperthyroidism', 
                        high: 'Diabetes, alcohol, obesity, familial hypertriglyceridemia',
                        critical: '>1000 mg/dL (pancreatitis risk)',
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
                <div id="lab-search-results"></div>
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
            <div id="lab-list"></div>
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
            <button class="lab-result-btn" onclick="${match.type === 'panel' ? `console.log('🧪 Search result panel clicked:', '${match.key}'); window.quizApp.showLabPanel('${match.key}'); event.stopPropagation();` : `console.log('🧪 Search result test clicked:', '${match.key}'); window.quizApp.showLabTest('${match.panel}', '${match.key}'); event.stopPropagation();`}">
                <div class="lab-name">${match.name}</div>
                <div class="lab-type">${match.type === 'panel' ? 'Lab Panel' : 'Individual Test'}</div>
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
            <button class="medical-tool-btn" onclick="console.log('🧪 Lab panel clicked:', '${panel}'); window.quizApp.showLabPanel('${panel}'); event.stopPropagation();">
                <div class="tool-name">${labDatabase[panel].name}</div>
                <div class="tool-count">${Object.keys(labDatabase[panel].values).length} tests</div>
            </button>
        `).join('');
    }
    
    showLabPanel(panelKey) {
        console.log('🧪 Opening lab panel:', panelKey);
        const panel = this.labDatabase[panelKey];
        const container = document.getElementById('lab-values-container');
        
        const testsHtml = Object.entries(panel.values).map(([test, data]) => `
            <button class="medical-tool-btn" onclick="console.log('🧪 Lab test clicked:', '${test}'); window.quizApp.showLabTest('${panelKey}', '${test}'); event.stopPropagation();">
                <div class="tool-name">${test}</div>
                <div class="tool-count">${data.normal}</div>
            </button>
        `).join('');
        
        container.innerHTML = `
            <button class="back-btn" onclick="window.quizApp.loadLabValues(); event.stopPropagation();">← Back to Lab Categories</button>
            <div class="lab-panel-detail">
                <h3>${panel.name}</h3>
                <div class="lab-tests">
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
                title: 'Hypertension Management (ACC/AHA 2017)',
                category: 'Cardiovascular',
                evidenceLevel: 'Class I, Level A',
                lastUpdated: '2017',
                stages: {
                    'Normal': 'SBP <120 AND DBP <80 mmHg',
                    'Elevated': 'SBP 120-129 AND DBP <80 mmHg',
                    'Stage 1': 'SBP 130-139 OR DBP 80-89 mmHg',
                    'Stage 2': 'SBP ≥140 OR DBP ≥90 mmHg',
                    'Hypertensive Crisis': 'SBP >180 AND/OR DBP >120 mmHg'
                },
                treatment: {
                    'Normal': 'Promote optimal lifestyle habits. Reassess in 1 year',
                    'Elevated': 'Nonpharmacologic therapy. Reassess in 3-6 months',
                    'Stage 1': 'Lifestyle + medication if ASCVD risk ≥10% or DM/CKD/CVD. Goal <130/80',
                    'Stage 2': 'Lifestyle + combination therapy (ACE-I/ARB + CCB or thiazide). Goal <130/80',
                    'Crisis': 'Immediate evaluation. Lower BP gradually over 24-48h unless end-organ damage'
                },
                lifestyle: 'Weight loss (1kg = 1mmHg), DASH diet, sodium <2.3g/day, exercise 150min/week, limit alcohol (M: ≤2 drinks, F: ≤1 drink)',
                medications: {
                    'First-line': 'ACE inhibitor, ARB, thiazide diuretic, CCB',
                    'Combination': 'ACE-I/ARB + CCB, ACE-I/ARB + thiazide, CCB + thiazide',
                    'Resistant': 'Add spironolactone 25-50mg daily after optimizing first-line agents'
                },
                monitoring: 'Home BP monitoring preferred. Office visits q1-3mo until goal, then q3-6mo',
                contraindications: {
                    'ACE-I/ARB': 'Pregnancy, hyperkalemia, bilateral RAS, angioedema',
                    'Thiazides': 'Gout, hyponatremia, sulfa allergy',
                    'CCB': 'Heart failure with reduced EF (non-DHP)',
                    'Beta-blockers': 'Asthma, heart block, peripheral artery disease'
                },
                specialPopulations: {
                    'Diabetes': 'Goal <130/80, prefer ACE-I/ARB for renoprotection',
                    'CKD': 'Goal <130/80, prefer ACE-I/ARB, monitor K+ and Cr',
                    'Elderly': 'Goal <130/80 if tolerated, start low and go slow',
                    'Pregnancy': 'Goal <140/90, use labetalol, nifedipine, methyldopa'
                }
            },
            'diabetes': {
                title: 'Type 2 Diabetes Management (ADA 2024)',
                category: 'Endocrine',
                evidenceLevel: 'Evidence-based recommendations',
                lastUpdated: '2024',
                targets: {
                    'HbA1c': '<7% (individualize 6.5-8% based on age, comorbidities, life expectancy)',
                    'Preprandial glucose': '80-130 mg/dL',
                    'Postprandial glucose': '<180 mg/dL',
                    'Blood pressure': '<130/80 mmHg',
                    'LDL cholesterol': '<100 mg/dL (<70 if ASCVD, <55 if very high risk)',
                    'Triglycerides': '<150 mg/dL',
                    'HDL': '>40 mg/dL (men), >50 mg/dL (women)'
                },
                algorithm: {
                    'Initial': 'Metformin + comprehensive lifestyle intervention',
                    'Dual therapy': 'Metformin + SGLT2-i (CKD/HF), GLP-1 RA (ASCVD/obesity), DPP-4i, SU, or insulin',
                    'Triple therapy': 'Add third agent based on patient factors and A1C target',
                    'Injectable': 'GLP-1 RA preferred over insulin when possible'
                },
                firstLine: 'Metformin 500mg BID, titrate to 2000mg daily or maximum tolerated dose',
                secondLine: {
                    'ASCVD': 'GLP-1 RA or SGLT2-i with proven CV benefit',
                    'Heart failure': 'SGLT2-i (empagliflozin, dapagliflozin)',
                    'CKD': 'SGLT2-i, finerenone if albuminuria',
                    'Obesity': 'GLP-1 RA (semaglutide, liraglutide)',
                    'Hypoglycemia risk': 'DPP-4 inhibitor',
                    'Cost concern': 'Sulfonylurea (glyburide avoid in elderly)'
                },
                lifestyle: 'Medical nutrition therapy (150min exercise/week, 5-10% weight loss), diabetes self-management education',
                monitoring: {
                    'A1C': 'q3mo if not at goal, q6mo if stable at goal',
                    'BP': 'Every visit',
                    'Lipids': 'Annually or more frequently if not at goal',
                    'Nephropathy': 'Annual eGFR and urine albumin/creatinine ratio',
                    'Retinopathy': 'Annual dilated eye exam',
                    'Neuropathy': 'Annual foot exam with monofilament'
                },
                complications: {
                    'Microvascular': 'Retinopathy, nephropathy, neuropathy - prevented by glycemic control',
                    'Macrovascular': 'CAD, stroke, PAD - prevented by comprehensive risk factor management',
                    'Acute': 'DKA (rare in T2DM), HHS (elderly, precipitated by illness/dehydration)'
                },
                specialConsiderations: {
                    'Elderly': 'Individualized A1C goals (7.5-8.5%), avoid hypoglycemia, assess cognitive function',
                    'CKD': 'Adjust medications for eGFR, avoid metformin if eGFR <30',
                    'Pregnancy': 'Preconception counseling, insulin preferred, A1C <6.5%'
                }
            },
            'copd': {
                title: 'COPD Management (GOLD 2023)',
                category: 'Pulmonary',
                evidenceLevel: 'Evidence-based global strategy',
                lastUpdated: '2023',
                stages: {
                    'GOLD 1 (Mild)': 'FEV1 ≥80% predicted',
                    'GOLD 2 (Moderate)': 'FEV1 50-79% predicted',
                    'GOLD 3 (Severe)': 'FEV1 30-49% predicted',
                    'GOLD 4 (Very Severe)': 'FEV1 <30% predicted'
                },
                assessment: {
                    'mMRC': '0-1: less breathless, ≥2: more breathless',
                    'CAT': '<10: less symptoms, ≥10: more symptoms',
                    'Exacerbations': '0-1 not leading to hospitalization: low risk, ≥2 or ≥1 hospitalization: high risk'
                },
                groups: {
                    'Group A': 'Low symptoms (mMRC 0-1, CAT <10), low risk (0-1 exacerbation not requiring hospitalization)',
                    'Group B': 'High symptoms (mMRC ≥2, CAT ≥10), low risk (0-1 exacerbation not requiring hospitalization)',
                    'Group E': 'Any symptoms, high risk (≥2 exacerbations or ≥1 hospitalization)'
                },
                treatment: {
                    'Group A': 'Bronchodilator (SABA PRN or LABA or LAMA daily)',
                    'Group B': 'LABA + LAMA combination',
                    'Group E': 'LABA + LAMA ± ICS (if eosinophils >300 or recurrent exacerbations)'
                },
                medications: {
                    'SABA': 'Albuterol 2-4 puffs q4-6h PRN',
                    'LABA': 'Formoterol, salmeterol, indacaterol, olodaterol',
                    'LAMA': 'Tiotropium, umeclidinium, glycopyrronium, aclidinium',
                    'ICS': 'Consider if eosinophils >300 cells/μL or history of asthma',
                    'Combinations': 'LABA/LAMA, LABA/ICS, LABA/LAMA/ICS (triple therapy)'
                },
                exacerbations: {
                    'Mild': 'Increase bronchodilator use',
                    'Moderate': 'Bronchodilators + oral corticosteroids (prednisone 40mg × 5 days)',
                    'Severe': 'Hospitalization, IV corticosteroids, antibiotics if purulent sputum, O2 if hypoxemic'
                },
                nonPharmacologic: {
                    'Smoking cessation': 'Most important intervention, refer to cessation programs',
                    'Pulmonary rehabilitation': 'Class I recommendation for all symptomatic patients',
                    'Vaccinations': 'Annual influenza, pneumococcal (PCV20 or PCV15 + PPSV23)',
                    'Oxygen therapy': 'Long-term if PaO2 ≤55mmHg or SaO2 ≤88%',
                    'Surgery': 'Lung volume reduction, transplantation in selected patients'
                },
                monitoring: 'Spirometry annually, assess symptoms and exacerbations at each visit, review inhaler technique',
                redFlags: 'Hemoptysis, unexplained weight loss, chest pain, rapid decline in FEV1 (>80mL/year)'
            },
            'heartFailure': {
                title: 'Heart Failure Management (AHA/ACC/HFSA 2022)',
                category: 'Cardiovascular',
                evidenceLevel: 'Class I recommendations',
                lastUpdated: '2022',
                classification: {
                    'HFrEF': 'LVEF ≤40% - reduced ejection fraction',
                    'HFmrEF': 'LVEF 41-49% - mildly reduced ejection fraction',
                    'HFpEF': 'LVEF ≥50% - preserved ejection fraction'
                },
                nyhaClass: {
                    'Class I': 'No limitation of physical activity',
                    'Class II': 'Slight limitation, comfortable at rest',
                    'Class III': 'Marked limitation, comfortable only at rest',
                    'Class IV': 'Unable to carry out physical activity without discomfort'
                },
                guidedMedicalTherapy: {
                    'ACE-I/ARB/ARNI': 'First-line for HFrEF. ARNI preferred if tolerated',
                    'Beta-blockers': 'Carvedilol, metoprolol succinate, or bisoprolol',
                    'MRA': 'Spironolactone or eplerenone if eGFR >30 and K+ <5.0',
                    'SGLT2-i': 'Dapagliflozin or empagliflozin regardless of diabetes status',
                    'Diuretics': 'Loop diuretics for volume overload'
                },
                deviceTherapy: {
                    'ICD': 'Primary prevention if EF ≤35% despite 3 months optimal medical therapy',
                    'CRT': 'QRS ≥150ms with LBBB pattern and EF ≤35%',
                    'LVAD': 'Bridge to transplant or destination therapy'
                },
                lifestyle: 'Daily weights, fluid restriction 2L/day if severe, sodium <3g/day, exercise training',
                monitoring: 'BNP/NT-proBNP, renal function, electrolytes, daily weights'
            }
        };
        
        const container = document.getElementById('guidelines-panel');
        container.innerHTML = `
            <div class="search-container">
                <input type="text" id="guidelines-search" placeholder="Search guidelines...">
                <div id="guidelines-search-results"></div>
            </div>
            <div class="guidelines-categories">
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('all'); event.stopPropagation();">All Guidelines</button>
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('cardiovascular'); event.stopPropagation();">Cardiovascular</button>
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('endocrine'); event.stopPropagation();">Endocrine</button>
                <button class="category-btn" onclick="window.quizApp.showGuidelinesCategory('pulmonary'); event.stopPropagation();">Pulmonary</button>
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
            <div class="guideline-result" onclick="console.log('📋 Guideline search result clicked:', '${guideline}'); window.quizApp.showGuidelineDetail('${guideline}'); event.stopPropagation();">
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
            <button class="medical-tool-btn" onclick="console.log('📋 Guideline card clicked:', '${guideline}'); window.quizApp.showGuidelineDetail('${guideline}'); event.stopPropagation();">
                <div class="tool-name">${guidelinesDatabase[guideline].title}</div>
                <div class="tool-count">${guidelinesDatabase[guideline].category}</div>
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
                <div id="ddx-search-results"></div>
            </div>
            <div class="ddx-categories">
                <button class="category-btn" onclick="window.quizApp.showDdxCategory('all'); event.stopPropagation();">All Symptoms</button>
                <button class="category-btn" onclick="window.quizApp.showDdxCategory('cardiovascular'); event.stopPropagation();">CV/Pulm</button>
                <button class="category-btn" onclick="window.quizApp.showDdxCategory('gastroenterology'); event.stopPropagation();">GI/Surgery</button>
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
            <div class="ddx-result" onclick="${match.type === 'symptom' ? `console.log('🔍 DDX search result clicked:', '${match.key}'); window.quizApp.showDdxDetail('${match.key}'); event.stopPropagation();` : `console.log('🔍 Diagnosis search result clicked:', '${match.key}'); window.quizApp.showDiagnosisDetail('${match.symptom}', '${match.key}'); event.stopPropagation();`}">
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
            <button class="medical-tool-btn" onclick="console.log('🔍 DDX card clicked:', '${symptom}'); window.quizApp.showDdxDetail('${symptom}'); event.stopPropagation();">
                <div class="tool-name">${ddxDatabase[symptom].title}</div>
                <div class="tool-count">${Object.keys(ddxDatabase[symptom].presentations).length} differentials</div>
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
            'differential-dx': 'differential-panel'
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