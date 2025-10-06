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
        
        // Initialize interactive features (bookmarks removed - not used)
        this.recentTools = JSON.parse(localStorage.getItem('medicalToolsRecent')) || [];
        this.toolNotes = JSON.parse(localStorage.getItem('medicalToolsNotes')) || {};
        
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
        this.initializeVibration();
        console.log('🩺 About to initialize medical tools...');
        this.initializeMedicalTools();
        this.initializeInteractiveFeatures();
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
                        // Vibration feedback is now handled in toggleRuledOut
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
            // Light vibration for un-excluding
            this.performHapticFeedback('selection');
        } else {
            // Add to ruled out list
            ruledOutList.push(optionIndex);
            console.log(`Added rule-out for Q${questionId} option ${optionIndex}`);
            // Heavy vibration for excluding answer
            this.performHapticFeedback('heavy');
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
        
        // First try the Vibration API (Android Chrome, Firefox)
        if ('vibrate' in navigator && this.vibrationSupported !== false) {
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
                        pattern = [300]; // Longer vibration for long press (reduced from 500ms)
                        break;
                    default:
                        pattern = [80, 40, 80]; // Default light feedback
                }
                
                // Cancel any existing vibrations first
                navigator.vibrate(0);
                
                // Add small delay to ensure cancellation, then trigger new vibration
                setTimeout(() => {
                    const success = navigator.vibrate(pattern);
                    console.log('🔊 Vibration triggered:', pattern, 'Success:', success);
                    
                    // Fallback for some Android browsers that return false but still work
                    if (!success && pattern.length === 1) {
                        // Try with single number instead of array
                        navigator.vibrate(pattern[0]);
                        console.log('🔊 Fallback vibration attempt:', pattern[0]);
                    }
                }, 10);
                
                return true;
            } catch (error) {
                console.log('🔊 Vibration failed:', error);
                this.vibrationSupported = false; // Disable future attempts
            }
        } else {
            console.log('🔊 Vibration API not supported or disabled');
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
    
    initializeVibration() {
        console.log('🔊 Initializing vibration support...');
        
        // Test vibration availability
        if ('vibrate' in navigator) {
            console.log('✅ Vibration API available');
            
            // Test with a very short vibration to ensure it works
            try {
                navigator.vibrate(1);
                console.log('✅ Vibration test successful');
                this.vibrationSupported = true;
            } catch (error) {
                console.log('⚠️ Vibration test failed:', error);
                this.vibrationSupported = false;
            }
        } else {
            console.log('⚠️ Vibration API not available');
            this.vibrationSupported = false;
        }
        
        // Store vibration support status
        this.vibrationSupported = this.vibrationSupported || false;
        
        // Add user interaction listener to enable vibration (required on some Android browsers)
        const enableVibrationOnInteraction = () => {
            if (this.vibrationSupported && !this.vibrationEnabled) {
                try {
                    navigator.vibrate(1);
                    this.vibrationEnabled = true;
                    console.log('✅ Vibration enabled after user interaction');
                    // Remove listener after first successful interaction
                    document.removeEventListener('touchstart', enableVibrationOnInteraction);
                    document.removeEventListener('click', enableVibrationOnInteraction);
                } catch (error) {
                    console.log('⚠️ Failed to enable vibration:', error);
                }
            }
        };
        
        // Add listeners for user interaction
        document.addEventListener('touchstart', enableVibrationOnInteraction, { once: true, passive: true });
        document.addEventListener('click', enableVibrationOnInteraction, { once: true });
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
                    answers: this.submittedAnswers
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
            formatted = formatted
                .replace(/(\([^)]+\))\s+([A-Z][A-Za-z])/g, '$1<br>$2')
                .replace(/(:\s*[a-z][^:]*?)\s+([A-Z][A-Za-z])/g, '$1<br>$2')
                .replace(/\s+/g, ' ')
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
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent medical tools panel from closing
                const toolType = btn.getAttribute('data-tool');
                this.switchMedicalTool(toolType);
                
                // Update active nav button
                toolNavBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Initialize calculators only when needed (moved to switchMedicalTool)
        // this.initializeCalculators();
        
        // Setup mobile back button behavior
        this.setupMobileBackButton();
        
        console.log('🩺 Medical tools initialized');
    }

    setupMobileBackButton() {
        let medicalToolsOpen = false;
        let currentTool = null;
        
        // Track when medical tools panel opens/closes
        const toolsToggle = document.getElementById('medical-tools-toggle');
        const toolsPanel = document.getElementById('medical-tools-panel');
        
        const openMedicalTools = () => {
            medicalToolsOpen = true;
            window.history.pushState({ medicalTools: true }, '', '');
        };
        
        const closeMedicalTools = () => {
            medicalToolsOpen = false;
            currentTool = null;
            if (toolsPanel) {
                toolsPanel.classList.remove('active');
            }
        };
        
        // Track tool navigation
        const originalSwitchTool = this.switchMedicalTool.bind(this);
        this.switchMedicalTool = function(toolType) {
            if (currentTool !== toolType) {
                window.history.pushState({ medicalTools: true, tool: toolType }, '', '');
                currentTool = toolType;
            }
            return originalSwitchTool(toolType);
        };
        
        // Handle back button
        window.addEventListener('popstate', (event) => {
            if (medicalToolsOpen) {
                event.preventDefault();
                
                if (event.state && event.state.tool && currentTool !== 'calculators') {
                    // Go back to main tools view
                    this.switchMedicalTool('calculators');
                    currentTool = 'calculators';
                } else {
                    // Close medical tools
                    closeMedicalTools();
                }
            }
        });
        
        // Update event listeners
        if (toolsToggle) {
            toolsToggle.addEventListener('click', openMedicalTools);
        }
    }

    initializeCalculators() {
        // Remove any existing calculator event listeners to prevent duplicates
        this.cleanupCalculatorEvents();
        
        console.log('🧮 Initializing calculator events...');
        
        // Use targeted event delegation instead of global listeners
        const calculatorPanel = document.getElementById('calculator-panel');
        if (!calculatorPanel) {
            console.error('❌ Calculator panel not found!');
            return;
        }
        
        // Track scroll state to prevent buttons triggering during scroll
        let isScrolling = false;
        let scrollTimeout;
        let startY = 0;
        let startX = 0;
        const scrollThreshold = 10; // pixels
        
        // Handle scroll detection
        this.calculatorScrollHandler = (e) => {
            isScrolling = true;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, 150); // Reset scroll state after 150ms of no scroll
        };
        
        // Handle touch start to track initial position
        this.calculatorTouchStartHandler = (e) => {
            if (e.touches && e.touches.length > 0) {
                startY = e.touches[0].clientY;
                startX = e.touches[0].clientX;
            }
        };
        
        // Handle calculator button interactions with scroll detection
        this.calculatorPanelHandler = (e) => {
            // Check if we're scrolling
            if (isScrolling) {
                console.log('🧮 Ignoring interaction - currently scrolling');
                return;
            }
            
            // For touch events, check if this was a scroll gesture
            if (e.type === 'touchend' && e.changedTouches && e.changedTouches.length > 0) {
                const endY = e.changedTouches[0].clientY;
                const endX = e.changedTouches[0].clientX;
                const deltaY = Math.abs(endY - startY);
                const deltaX = Math.abs(endX - startX);
                
                // If touch moved more than threshold, it's likely a scroll gesture
                if (deltaY > scrollThreshold || deltaX > scrollThreshold) {
                    console.log('🧮 Ignoring interaction - detected scroll gesture');
                    return;
                }
            }
            
            // Only handle events within the calculator panel
            const calcBtn = e.target.closest('.calculator-btn');
            if (calcBtn && calculatorPanel.classList.contains('active')) {
                e.preventDefault();
                e.stopPropagation();
                const calcType = calcBtn.getAttribute('data-calc');
                console.log('🧮 Calculator triggered via panel delegation:', calcType);
                this.loadCalculator(calcType);
            }
        };
        
        // Add event listeners to the calculator panel
        calculatorPanel.addEventListener('scroll', this.calculatorScrollHandler);
        calculatorPanel.addEventListener('touchstart', this.calculatorTouchStartHandler, { passive: true });
        calculatorPanel.addEventListener('touchend', this.calculatorPanelHandler);
        calculatorPanel.addEventListener('click', this.calculatorPanelHandler);
        
        console.log('✅ Calculator events initialized with scroll detection');
    }

    cleanupCalculatorEvents() {
        // Remove calculator event listeners to prevent unwanted triggers
        const calculatorPanel = document.getElementById('calculator-panel');
        if (calculatorPanel) {
            if (this.calculatorPanelHandler) {
                calculatorPanel.removeEventListener('click', this.calculatorPanelHandler);
                calculatorPanel.removeEventListener('touchend', this.calculatorPanelHandler);
                this.calculatorPanelHandler = null;
            }
            if (this.calculatorScrollHandler) {
                calculatorPanel.removeEventListener('scroll', this.calculatorScrollHandler);
                this.calculatorScrollHandler = null;
            }
            if (this.calculatorTouchStartHandler) {
                calculatorPanel.removeEventListener('touchstart', this.calculatorTouchStartHandler);
                this.calculatorTouchStartHandler = null;
            }
        }
        
        // Legacy cleanup for old global listeners
        if (this.calculatorTouchHandler) {
            document.removeEventListener('touchend', this.calculatorTouchHandler);
            this.calculatorTouchHandler = null;
        }
        if (this.calculatorClickHandler) {
            document.removeEventListener('click', this.calculatorClickHandler);
            this.calculatorClickHandler = null;
        }
        console.log('🧮 Calculator event listeners cleaned up');
    }

    loadCalculator(calcType) {
        // Track tool usage
        this.trackToolUsage('calculator', calcType);
        
        // Switch to dedicated calculator panel
        this.switchMedicalTool('calculator-detail');
        
        const container = document.getElementById('calculator-detail-container');
        if (!container) return;
        
        // Add back button and structured content
        let calculatorContent = `
            <div class="calculator-header">
                <button class="back-btn" onclick="window.quizApp.switchMedicalTool('calculators'); event.stopPropagation();">← Back to Calculators</button>
                <h3 id="calculator-title"></h3>
            </div>
            <div class="calculator-content">
        `;
        
        let calculatorTitle = '';
        
        switch (calcType) {
            case 'bmi':
                calculatorTitle = 'BMI Calculator';
                calculatorContent += this.getBMICalculator();
                break;
            case 'chads2vasc':
                calculatorTitle = 'CHA₂DS₂-VASc Score';
                calculatorContent += this.getCHADS2VAScCalculator();
                break;
            case 'hasbled':
                calculatorTitle = 'HAS-BLED Score';
                calculatorContent += this.getHASBLEDCalculator();
                break;
            case 'gcs':
                calculatorTitle = 'Glasgow Coma Scale';
                calculatorContent += this.getGCSCalculator();
                break;
            case 'apache':
                calculatorTitle = 'APACHE II Score';
                calculatorContent += this.getAPACHECalculator();
                break;
            case 'wells':
                calculatorTitle = 'Wells Score for PE';
                calculatorContent += this.getWellsCalculator();
                break;
            case 'qrisk':
                calculatorTitle = 'QRISK3 Calculator';
                calculatorContent += this.getQRISKCalculator();
                break;
            case 'madders':
                calculatorTitle = 'MADDERS Score';
                calculatorContent += this.getMADDERSCalculator();
                break;
            case 'mews':
                calculatorTitle = 'MEWS Score';
                calculatorContent += this.getMEWSCalculator();
                break;
            case 'crb65':
                calculatorTitle = 'CRB-65 Score';
                calculatorContent += this.getCRB65Calculator();
                break;
            case 'rockall':
                calculatorTitle = 'Rockall Score';
                calculatorContent += this.getRockallCalculator();
                break;
            case 'child-pugh':
                calculatorTitle = 'Child-Pugh Score';
                calculatorContent += this.getChildPughCalculator();
                break;
            case 'ottawa-ankle':
                calculatorTitle = 'Ottawa Ankle Rules';
                calculatorContent += this.getOttawaAnkleCalculator();
                break;
            case 'egfr':
                calculatorTitle = 'eGFR Calculator';
                calculatorContent += this.getEGFRCalculator();
                break;
            case 'urea-creatinine':
                calculatorTitle = 'Urea:Creatinine Ratio';
                calculatorContent += this.getUreaCreatinineCalculator();
                break;
            case 'abcd2':
                calculatorTitle = 'ABCD² Score';
                calculatorContent += this.getABCD2Calculator();
                break;
            case 'must':
                calculatorTitle = 'MUST Score';
                calculatorContent += this.getMUSTCalculator();
                break;
            case 'waterlow':
                calculatorTitle = 'Waterlow Score';
                calculatorContent += this.getWaterlowCalculator();
                break;
            case 'grace':
                calculatorTitle = 'GRACE Score';
                calculatorContent += this.getGRACECalculator();
                break;
            case 'crusade':
                calculatorTitle = 'CRUSADE Score';
                calculatorContent += this.getCRUSADECalculator();
                break;
            case 'phq9':
                calculatorTitle = 'PHQ-9 Depression Scale';
                calculatorContent += this.getPHQ9Calculator();
                break;
            case 'gad7':
                calculatorTitle = 'GAD-7 Anxiety Scale';
                calculatorContent += this.getGAD7Calculator();
                break;
            case 'insulin-sliding':
                calculatorTitle = 'Insulin Sliding Scale';
                calculatorContent += this.getInsulinSlidingCalculator();
                break;
            case 'vasopressor':
                calculatorTitle = 'Vasopressor Dosing';
                calculatorContent += this.getVasopressorCalculator();
                break;
            case 'frax':
                calculatorTitle = 'FRAX Calculator';
                calculatorContent += this.getFRAXCalculator();
                break;
            case 'news2':
                calculatorTitle = 'NEWS2 Score';
                calculatorContent += this.getNEWS2Calculator();
                break;
            case 'curb65':
                calculatorTitle = 'CURB-65 Score';
                calculatorContent += this.getCURB65Calculator();
                break;
            case 'palliative':
                calculatorTitle = 'Palliative Care Calculator';
                calculatorContent += this.getPalliativeCalculator();
                break;
            case 'paediatric-dosing':
                calculatorTitle = 'Paediatric Dosing Calculator';
                calculatorContent += this.getPaediatricDosingCalculator();
                break;
            case 'infusion-rate':
                calculatorTitle = 'Infusion Rate Calculator';
                calculatorContent += this.getInfusionRateCalculator();
                break;
            case 'cockcroft-gault':
                calculatorTitle = 'Cockcroft-Gault eGFR';
                calculatorContent += this.getCockcroftGaultCalculator();
                break;
            case 'bsa':
                calculatorTitle = 'Body Surface Area Calculator';
                calculatorContent += this.getBSACalculator();
                break;
            case 'fluid-balance':
                calculatorTitle = 'Fluid Balance Calculator';
                calculatorContent += this.getFluidBalanceCalculator();
                break;
            case 'timi':
                calculatorTitle = 'TIMI Risk Score';
                calculatorContent += this.getTIMICalculator();
                break;
            case 'nihss':
                calculatorTitle = 'NIH Stroke Scale';
                calculatorContent += this.getNIHSSCalculator();
                break;
            case 'rankin':
                calculatorTitle = 'Modified Rankin Scale';
                calculatorContent += this.getModifiedRankinCalculator();
                break;
            default:
                calculatorTitle = 'Calculator';
                calculatorContent += '<p>Calculator not found.</p>';
        }
        
        calculatorContent += '</div>';
        calculatorContent = calculatorContent.replace('<h3 id="calculator-title"></h3>', `<h3 id="calculator-title">${calculatorTitle}</h3>`);
        container.innerHTML = calculatorContent;
        
        console.log('🧮 Loaded calculator:', calcType);
    }

    getBMICalculator() {
        return `
            <div class="calculator-form">
                <h4>BMI & Waist Circumference Calculator</h4>
                <div class="calc-input-group">
                    <label>Weight (kg):</label>
                    <input type="number" id="bmi-weight" placeholder="70" step="0.1">
                </div>
                <div class="calc-input-group">
                    <label>Height (cm):</label>
                    <input type="number" id="bmi-height" placeholder="175" step="0.1">
                </div>
                <div class="calc-input-group">
                    <label>Waist Circumference (cm) - Optional:</label>
                    <input type="number" id="bmi-waist" placeholder="85" step="0.1">
                </div>
                <div class="calc-input-group">
                    <label>Ethnicity:</label>
                    <select id="bmi-ethnicity">
                        <option value="european">European/Caucasian</option>
                        <option value="asian">Asian (Chinese, Japanese, South Asian)</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="calc-checkbox-group">
                    <label><input type="radio" name="bmi-sex" value="male"> Male</label>
                    <label><input type="radio" name="bmi-sex" value="female"> Female</label>
                </div>
                <button onclick="window.quizApp.calculateBMI()">Calculate</button>
                <div id="bmi-result" class="calc-result"></div>
                <div class="calc-reference">
                    <small>
                        <strong>BMI Categories (WHO):</strong><br>
                        Underweight: &lt;18.5 | Normal: 18.5-24.9<br>
                        Overweight: 25-29.9 | Obese: ≥30<br>
                        <strong>Asian populations:</strong> Overweight ≥23, Obese ≥27.5
                    </small>
                </div>
            </div>
        `;
    }

    calculateBMI() {
        const weight = parseFloat(document.getElementById('bmi-weight').value);
        const height = parseFloat(document.getElementById('bmi-height').value) / 100; // Convert cm to m
        const waist = parseFloat(document.getElementById('bmi-waist').value);
        const ethnicity = document.getElementById('bmi-ethnicity').value;
        const sex = document.querySelector('input[name="bmi-sex"]:checked')?.value;
        
        if (!weight || !height) {
            document.getElementById('bmi-result').innerHTML = '<p class="error">Please enter valid weight and height</p>';
            return;
        }
        
        const bmi = weight / (height * height);
        let category = '';
        let color = '';
        let healthRisk = '';
        
        // Ethnic-specific BMI thresholds
        let overweightThreshold = 25;
        let obeseThreshold = 30;
        
        if (ethnicity === 'asian') {
            overweightThreshold = 23;
            obeseThreshold = 27.5;
        }
        
        if (bmi < 18.5) {
            category = 'Underweight';
            color = '#2196F3';
            healthRisk = 'Increased risk: nutritional deficiency, osteoporosis, immune dysfunction';
        } else if (bmi < overweightThreshold) {
            category = 'Normal weight';
            color = '#4CAF50';
            healthRisk = 'Optimal health risk profile';
        } else if (bmi < obeseThreshold) {
            category = 'Overweight';
            color = '#FF9800';
            healthRisk = 'Increased risk: diabetes, cardiovascular disease, sleep apnoea';
        } else if (bmi < 35) {
            category = 'Obese Class I';
            color = '#F44336';
            healthRisk = 'High risk: diabetes, CVD, stroke, certain cancers';
        } else if (bmi < 40) {
            category = 'Obese Class II';
            color = '#D32F2F';
            healthRisk = 'Very high risk: consider bariatric surgery consultation';
        } else {
            category = 'Obese Class III';
            color = '#B71C1C';
            healthRisk = 'Extremely high risk: urgent weight management, consider bariatric surgery';
        }
        
        // Waist circumference assessment
        let waistAssessment = '';
        if (waist && sex) {
            let waistRisk = '';
            let waistColor = '#4CAF50';
            
            if (sex === 'male') {
                if (waist >= 102) {
                    waistRisk = 'Very high risk';
                    waistColor = '#F44336';
                } else if (waist >= 94) {
                    waistRisk = 'Increased risk';
                    waistColor = '#FF9800';
                } else {
                    waistRisk = 'Low risk';
                }
            } else {
                if (waist >= 88) {
                    waistRisk = 'Very high risk';
                    waistColor = '#F44336';
                } else if (waist >= 80) {
                    waistRisk = 'Increased risk';
                    waistColor = '#FF9800';
                } else {
                    waistRisk = 'Low risk';
                }
            }
            
            waistAssessment = `
                <div style="margin-top: 8px; padding: 6px; background: #f5f5f5; border-radius: 4px;">
                    <strong>Waist Circumference:</strong> ${waist} cm<br>
                    <span style="color: ${waistColor}; font-weight: bold;">${waistRisk}</span> for metabolic complications
                </div>
            `;
        }
        
        document.getElementById('bmi-result').innerHTML = `
            <div class="bmi-result-display">
                <div class="bmi-value" style="color: ${color}; font-size: 1.2em;">
                    <strong>BMI: ${bmi.toFixed(1)} kg/m²</strong>
                </div>
                <div class="bmi-category" style="color: ${color}; font-weight: bold; margin: 4px 0;">
                    ${category}
                </div>
                <div style="margin-top: 8px; font-size: 0.9em; color: #666;">
                    ${healthRisk}
                </div>
                ${waistAssessment}
                <div style="margin-top: 8px; font-size: 0.8em; color: #666;">
                    ${ethnicity === 'asian' ? 'Using Asian-specific BMI thresholds' : 'Using WHO BMI thresholds'}
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
        
        const isFemale = document.getElementById('chads-female').checked;
        if (isFemale) score += 1;
        
        let risk = '';
        let recommendation = '';
        let color = '';
        
        // Updated UK guidelines: sex-specific treatment recommendations
        if (score === 0) {
            risk = 'Low risk (0.2%/year)';
            recommendation = 'No anticoagulation recommended';
            color = '#4CAF50';
        } else if (score === 1) {
            if (isFemale && score === 1) {
                // Female with score 1 (sex alone) - special case
                risk = 'Low-moderate risk (0.6%/year)';
                recommendation = 'Female sex alone: generally no anticoagulation. Consider other risk factors';
                color = '#FF9800';
            } else {
                // Male with score 1 or female with other risk factors
                risk = 'Low-moderate risk (0.6%/year)';
                recommendation = 'Consider anticoagulation (men ≥1 or women ≥2 with non-sex risk factors)';
                color = '#FF9800';
            }
        } else {
            // Score ≥2
            risk = 'High risk (≥2.2%/year)';
            recommendation = 'Anticoagulation recommended unless contraindicated';
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
                <div style="margin-top: 8px; font-size: 0.8em; color: #666;">
                    Based on current UK guidelines. Consider individual bleeding risk (HAS-BLED).
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
        let bleedingRate = '';
        let recommendation = '';
        let modifiableFactors = '';
        let color = '';
        
        if (score <= 2) {
            risk = 'Low bleeding risk';
            bleedingRate = '0.9-2.4% per year';
            recommendation = 'Anticoagulation generally safe - benefits likely outweigh bleeding risk';
            color = '#4CAF50';
            modifiableFactors = 'Continue regular monitoring. Address any modifiable factors.';
        } else if (score === 3) {
            risk = 'Moderate bleeding risk';
            bleedingRate = '3.7% per year';
            recommendation = 'Anticoagulation possible but requires caution - regular monitoring essential';
            color = '#FF9800';
            modifiableFactors = 'Review modifiable factors: alcohol intake, drug interactions, INR stability';
        } else {
            risk = 'High bleeding risk';
            bleedingRate = '8.7-12.5% per year';
            recommendation = 'Consider alternatives to anticoagulation or enhanced monitoring';
            color = '#F44336';
            modifiableFactors = 'Priority: Address modifiable factors (alcohol, drugs, BP control, INR stability)';
        }
        
        document.getElementById('hasbled-result').innerHTML = `
            <div class="score-result">
                <div class="score-value" style="color: ${color}">
                    HAS-BLED Score: <strong>${score}/9</strong>
                </div>
                <div class="score-risk" style="color: ${color}; font-weight: bold;">
                    ${risk} (${bleedingRate})
                </div>
                <div class="score-recommendation" style="margin-top: 8px;">
                    <strong>Recommendation:</strong> ${recommendation}
                </div>
                <div style="margin-top: 8px; font-size: 0.9em; color: #666;">
                    <strong>Action:</strong> ${modifiableFactors}
                </div>
                <div style="margin-top: 8px; font-size: 0.8em; color: #666;">
                    Note: HAS-BLED should not be used alone to exclude anticoagulation but to identify patients requiring closer monitoring
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
                <p><small>10-year cardiovascular disease risk assessment (UK validated)</small></p>
                
                <div class="calc-input-group">
                    <label>Age (25-84 years):</label>
                    <input type="number" id="qrisk-age" placeholder="50" min="25" max="84">
                </div>
                <div class="calc-checkbox-group">
                    <label><input type="radio" name="qrisk-sex" value="male"> Male</label>
                    <label><input type="radio" name="qrisk-sex" value="female"> Female</label>
                </div>
                
                <div class="calc-input-group">
                    <label>Ethnicity:</label>
                    <select id="qrisk-ethnicity">
                        <option value="white">White/not stated</option>
                        <option value="indian">Indian</option>
                        <option value="pakistani">Pakistani</option>
                        <option value="bangladeshi">Bangladeshi</option>
                        <option value="other-asian">Other Asian</option>
                        <option value="caribbean">Caribbean</option>
                        <option value="black-african">Black African</option>
                        <option value="chinese">Chinese</option>
                        <option value="other">Other ethnic group</option>
                    </select>
                </div>
                
                <div class="calc-input-group">
                    <label>BMI (kg/m²):</label>
                    <input type="number" id="qrisk-bmi" placeholder="25" min="15" max="50" step="0.1">
                </div>
                
                <div class="calc-input-group">
                    <label>Systolic BP (mmHg):</label>
                    <input type="number" id="qrisk-sbp" placeholder="130" min="80" max="250">
                </div>
                
                <div class="calc-input-group">
                    <label>Total Cholesterol (mmol/L):</label>
                    <input type="number" id="qrisk-cholesterol" placeholder="5.0" min="2" max="15" step="0.1">
                </div>
                
                <div class="calc-input-group">
                    <label>HDL Cholesterol (mmol/L):</label>
                    <input type="number" id="qrisk-hdl" placeholder="1.2" min="0.5" max="5" step="0.1">
                </div>
                
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="qrisk-smoking"> Current smoker</label>
                    <label><input type="checkbox" id="qrisk-diabetes-type1"> Type 1 diabetes</label>
                    <label><input type="checkbox" id="qrisk-diabetes-type2"> Type 2 diabetes</label>
                    <label><input type="checkbox" id="qrisk-family-history"> Family history of CHD in first degree relative <60 years</label>
                    <label><input type="checkbox" id="qrisk-ckd"> Chronic kidney disease (stage 4/5)</label>
                    <label><input type="checkbox" id="qrisk-af"> Atrial fibrillation</label>
                    <label><input type="checkbox" id="qrisk-bp-treatment"> On blood pressure treatment</label>
                    <label><input type="checkbox" id="qrisk-ra"> Rheumatoid arthritis</label>
                    <label><input type="checkbox" id="qrisk-lupus"> Systemic lupus erythematosus</label>
                    <label><input type="checkbox" id="qrisk-antipsychotic"> On atypical antipsychotics</label>
                    <label><input type="checkbox" id="qrisk-steroid"> On corticosteroids</label>
                    <label><input type="checkbox" id="qrisk-erectile"> Erectile dysfunction (males)</label>
                    <label><input type="checkbox" id="qrisk-migraine"> Migraine</label>
                </div>
                
                <button onclick="window.quizApp.calculateQRISK()">Calculate Risk</button>
                <div id="qrisk-result" class="calc-result"></div>
                
                <div class="calc-reference">
                    <small>
                        <strong>Note:</strong> This is a simplified QRISK3 implementation for educational purposes.<br>
                        For clinical decisions, use the official QRISK3 tool at <a href="https://qrisk.org" target="_blank">qrisk.org</a>
                    </small>
                </div>
            </div>
        `;
    }

    calculateQRISK() {
        const age = parseInt(document.getElementById('qrisk-age').value) || 0;
        const sex = document.querySelector('input[name="qrisk-sex"]:checked')?.value;
        const bmi = parseFloat(document.getElementById('qrisk-bmi').value) || 0;
        const sbp = parseFloat(document.getElementById('qrisk-sbp').value) || 0;
        const cholesterol = parseFloat(document.getElementById('qrisk-cholesterol').value) || 0;
        const hdl = parseFloat(document.getElementById('qrisk-hdl').value) || 0;
        
        if (!age || !sex || !bmi || !sbp || !cholesterol || !hdl) {
            document.getElementById('qrisk-result').innerHTML = '<p style="color: red;">Please fill in all required fields (age, sex, BMI, BP, cholesterol)</p>';
            return;
        }

        // QRISK3 age validation (25-84 years as per NICE guidance)
        if (age < 25 || age > 84) {
            document.getElementById('qrisk-result').innerHTML = '<p style="color: red;">QRISK3 is validated for ages 25-84 years only</p>';
            return;
        }

        // Improved QRISK3-based algorithm (simplified but more accurate)
        let score = 0;
        
        // Age component (log-linear relationship)
        if (sex === 'male') {
            score += Math.log(age/40) * 0.22;
        } else {
            score += Math.log(age/40) * 0.25;
        }
        
        // BMI component (J-shaped curve, optimal around 22-25)
        const bmiDeviation = Math.abs(bmi - 23.5);
        score += bmiDeviation * 0.008;
        
        // Blood pressure component
        const sbpDeviation = Math.max(0, sbp - 120);
        score += sbpDeviation * 0.002;
        
        // Cholesterol ratio component
        const cholRatio = cholesterol / hdl;
        score += (cholRatio - 3.5) * 0.15;
        
        // Ethnicity adjustments
        const ethnicity = document.getElementById('qrisk-ethnicity').value;
        const ethnicityFactors = {
            'white': 1.0,
            'indian': 1.4,
            'pakistani': 1.6,
            'bangladeshi': 1.8,
            'other-asian': 1.2,
            'caribbean': 1.2,
            'black-african': 0.9,
            'chinese': 0.8,
            'other': 1.1
        };
        score += Math.log(ethnicityFactors[ethnicity] || 1.0);
        
        // Risk factors
        if (document.getElementById('qrisk-smoking').checked) score += 0.63;
        if (document.getElementById('qrisk-diabetes-type1').checked) score += 1.2;
        if (document.getElementById('qrisk-diabetes-type2').checked) score += 0.8;
        if (document.getElementById('qrisk-family-history').checked) score += 0.54;
        if (document.getElementById('qrisk-ckd').checked) score += 0.9;
        if (document.getElementById('qrisk-af').checked) score += 0.88;
        if (document.getElementById('qrisk-bp-treatment').checked) score += 0.51;
        if (document.getElementById('qrisk-ra').checked) score += 0.4;
        if (document.getElementById('qrisk-lupus').checked) score += 0.95;
        if (document.getElementById('qrisk-antipsychotic').checked) score += 0.31;
        if (document.getElementById('qrisk-steroid').checked) score += 0.37;
        if (document.getElementById('qrisk-erectile').checked && sex === 'male') score += 0.22;
        if (document.getElementById('qrisk-migraine').checked) score += 0.25;
        
        // Convert to probability (simplified survival function)
        const baselineRisk = sex === 'male' ? 0.15 : 0.08;
        let risk = baselineRisk * Math.exp(score);
        risk = Math.min(risk * 100, 95); // Cap at 95%
        
        let riskLevel = '';
        let color = '';
        let recommendation = '';

        // Updated NICE guidelines for cardiovascular risk
        if (risk < 10) {
            riskLevel = 'Low risk (<10%)';
            color = '#4CAF50';
            recommendation = 'Lifestyle advice and reassess in 5 years. Statins not routinely recommended unless additional factors';
        } else if (risk < 20) {
            riskLevel = 'Moderate risk (10-20%)';
            color = '#FF9800';
            recommendation = 'NICE: Consider offering statin therapy (atorvastatin 20mg) with shared decision-making. Discuss benefits and risks';
        } else {
            riskLevel = 'High risk (≥20%)';
            color = '#F44336';
            recommendation = 'NICE: Offer statin therapy (atorvastatin 20mg) with shared decision-making and lifestyle modification';
        }

        document.getElementById('qrisk-result').innerHTML = `
            <div style="color: ${color}">
                <strong>10-year CV risk: ${risk.toFixed(1)}%</strong><br>
                <strong>${riskLevel}</strong><br>
                <div style="margin-top: 8px; font-size: 0.9em;">
                    ${recommendation}
                </div>
                <div style="margin-top: 8px; font-size: 0.8em; color: #666;">
                    Cholesterol ratio: ${cholRatio.toFixed(1)}:1 | BMI: ${bmi} kg/m²<br>
                    Simplified QRISK3 algorithm. Use official tool for clinical decisions.
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
                <h4>eGFR Calculator (CKD-EPI 2021)</h4>
                <p><small>Estimated Glomerular Filtration Rate - UK standard (race-neutral equation)</small></p>
                
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
        
        if (!age || !sex || !creatinine) {
            document.getElementById('egfr-result').innerHTML = '<p class="error">Please fill in all fields</p>';
            return;
        }
        
        // Convert μmol/L to mg/dL
        const creatinine_mg = creatinine * 0.0113;
        
        // CKD-EPI 2021 equation (race-neutral)
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
        // Race multiplier removed as per CKD-EPI 2021 recommendations
        
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
                <div style="margin-top: 8px; font-size: 0.8em; color: #666;">
                    Using CKD-EPI 2021 race-neutral equation
                </div>
            </div>
        `;
    }

    getUreaCreatinineCalculator() {
        return `
            <div class="calculator-form">
                <h4>Urea:Creatinine Ratio Calculator (UK Standards)</h4>
                <p><small>Assessment of kidney function and AKI classification (NICE/KDIGO guidelines)</small></p>
                
                <div class="calc-input-group">
                    <label>Serum Urea (mmol/L):</label>
                    <input type="number" id="urea-value" placeholder="7.0" min="1" max="50" step="0.1">
                    <small>Normal range: 2.5-7.5 mmol/L</small>
                </div>
                <div class="calc-input-group">
                    <label>Serum Creatinine (μmol/L):</label>
                    <input type="number" id="creatinine-value" placeholder="80" min="20" max="2000">
                    <small>Normal range: 60-110 μmol/L (men), 45-90 μmol/L (women)</small>
                </div>
                
                <button onclick="window.quizApp.calculateUreaCreatinine()">Calculate Ratio</button>
                <div id="urea-creatinine-result" class="calc-result"></div>
                
                <div class="calc-reference">
                    <small>
                        <strong>UK Reference Ranges (NICE CG169):</strong><br>
                        <strong>Normal:</strong> 40-100:1 (typical range)<br>
                        <strong>Prerenal AKI:</strong> >100:1 (dehydration, reduced perfusion)<br>
                        <strong>Intrinsic renal AKI:</strong> 40-80:1 (ATN, glomerulonephritis)<br>
                        <strong>Post-renal AKI:</strong> Variable, often >100:1 initially<br>
                        <em>Note: Always interpret with clinical context and eGFR</em>
                    </small>
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

    calculateUreaCreatinine() {
        const urea = parseFloat(document.getElementById('urea-value').value);
        const creatinine = parseFloat(document.getElementById('creatinine-value').value);
        
        if (!urea || !creatinine) {
            document.getElementById('urea-creatinine-result').innerHTML = 
                '<div class="calc-error"><strong>Please enter both urea and creatinine values</strong></div>';
            return;
        }
        
        // Calculate urea:creatinine ratio (UK standard: both in mmol/L)
        // Convert creatinine from μmol/L to mmol/L for ratio calculation
        const creatinineMmol = creatinine / 1000;
        const ratio = urea / creatinineMmol;
        
        let interpretation = '';
        let color = '';
        let clinicalContext = '';
        let niceGuidance = '';
        
        if (ratio < 40) {
            interpretation = 'Low ratio (<40:1)';
            color = '#FF5722';
            clinicalContext = 'Unusual - check sample integrity. May suggest intrinsic renal disease with reduced urea production.';
            niceGuidance = 'Consider liver disease, malnutrition, or analytical error.';
        } else if (ratio >= 40 && ratio <= 100) {
            interpretation = 'Normal ratio (40-100:1)';
            color = '#4CAF50';
            clinicalContext = 'Normal kidney function or stable CKD. Ratio within expected range.';
            niceGuidance = 'Continue standard monitoring as per NICE CG169.';
        } else if (ratio > 100 && ratio <= 150) {
            interpretation = 'Elevated ratio (100-150:1)';
            color = '#FF9800';
            clinicalContext = 'Suggests prerenal AKI - assess volume status, BP, medications (ACEi/ARB, diuretics).';
            niceGuidance = 'Check fluid balance, stop nephrotoxic drugs, consider IV fluids if volume depleted.';
        } else {
            interpretation = 'Very high ratio (>150:1)';
            color = '#F44336';
            clinicalContext = 'Strongly suggests severe prerenal AKI or early post-renal obstruction.';
            niceGuidance = 'Urgent assessment required. Consider IV fluids, review medications, bladder scan, nephrology review.';
        }
        
        // Additional context based on absolute values
        let additionalNotes = '';
        if (urea > 20) {
            additionalNotes += '⚠️ Significantly elevated urea - consider urgent nephrology review. ';
        }
        if (creatinine > 300) {
            additionalNotes += '⚠️ Severely elevated creatinine - may require acute dialysis. ';
        }
        
        document.getElementById('urea-creatinine-result').innerHTML = `
            <div style="color: ${color}">
                <strong>Urea:Creatinine Ratio: ${Math.round(ratio)}:1</strong><br>
                <strong>${interpretation}</strong><br>
                <div style="margin-top: 8px; font-size: 0.9em;">
                    <strong>Clinical Context:</strong> ${clinicalContext}
                </div>
                <div style="margin-top: 8px; font-size: 0.9em; color: #2E7D32;">
                    <strong>NICE Guidance:</strong> ${niceGuidance}
                </div>
                ${additionalNotes ? `<div style="margin-top: 8px; font-size: 0.9em; color: #D84315;"><strong>${additionalNotes}</strong></div>` : ''}
                <div style="margin-top: 12px; font-size: 0.8em; color: #666; border-top: 1px solid #eee; padding-top: 8px;">
                    <strong>Values:</strong> Urea ${urea} mmol/L | Creatinine ${creatinine} μmol/L<br>
                    <em>Always interpret alongside eGFR, clinical history, and AKI staging (KDIGO criteria)</em>
                </div>
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
        let color = '';
        
        if (score <= 3) {
            risk = 'Low risk';
            dayStroke = '1% 2-day stroke risk';
            color = '#4CAF50';
        } else if (score <= 5) {
            risk = 'Moderate risk';
            dayStroke = '4.1% 2-day stroke risk';
            color = '#FF9800';
        } else {
            risk = 'High risk';
            dayStroke = '8.1% 2-day stroke risk';
            color = '#F44336';
        }
        
        document.getElementById('abcd2-result').innerHTML = `
            <div style="color: ${color}">
                <strong>ABCD² Score: ${score}/7</strong><br>
                <strong>${risk}</strong><br>
                ${dayStroke}<br>
                <div style="margin-top: 8px; font-weight: bold; color: #2196F3;">
                    All suspected TIA → same-day specialist assessment (within 24h)
                </div>
                <div style="margin-top: 6px; font-size: 0.85em; color: #666;">
                    Current UK guidance: ABCD² used for stroke risk stratification, not triage timing
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

    getPalliativeCalculator() {
        return `
            <div class="calculator-form">
                <h4>🌸 Palliative Care Drug Calculator</h4>
                <p><small>Morphine equivalents, breakthrough dosing, and symptom management</small></p>
                
                <div class="calc-section">
                    <h5>📊 Opioid Conversion</h5>
                    <div class="calc-input-group">
                        <label>Current Opioid:</label>
                        <select id="palliative-current-opioid">
                            <option value="morphine-oral">Morphine (oral)</option>
                            <option value="morphine-sc">Morphine (subcutaneous)</option>
                            <option value="oxycodone-oral">Oxycodone (oral)</option>
                            <option value="fentanyl-patch">Fentanyl (patch mcg/hr)</option>
                            <option value="codeine">Codeine</option>
                            <option value="tramadol">Tramadol</option>
                            <option value="buprenorphine-patch">Buprenorphine (patch mcg/hr)</option>
                        </select>
                    </div>
                    <div class="calc-input-group">
                        <label>Current Daily Dose (mg or mcg/hr for patches):</label>
                        <input type="number" id="palliative-current-dose" placeholder="60" step="0.1">
                    </div>
                    <div class="calc-input-group">
                        <label>Convert to:</label>
                        <select id="palliative-target-opioid">
                            <option value="morphine-oral">Morphine (oral)</option>
                            <option value="morphine-sc">Morphine (subcutaneous)</option>
                            <option value="oxycodone-oral">Oxycodone (oral)</option>
                            <option value="fentanyl-patch">Fentanyl (patch mcg/hr)</option>
                            <option value="diamorphine-sc">Diamorphine (subcutaneous)</option>
                        </select>
                    </div>
                    <button onclick="window.quizApp.calculateOpioidConversion()">Convert Opioid</button>
                    <div id="opioid-conversion-result" class="calc-result"></div>
                </div>

                <div class="calc-section">
                    <h5>💉 Breakthrough Dosing</h5>
                    <div class="calc-input-group">
                        <label>Total Daily Morphine Equivalent (mg):</label>
                        <input type="number" id="palliative-daily-morphine" placeholder="60" step="1">
                    </div>
                    <button onclick="window.quizApp.calculateBreakthroughDose()">Calculate Breakthrough</button>
                    <div id="breakthrough-result" class="calc-result"></div>
                </div>

                <div class="calc-section">
                    <h5>🤧 Anti-emetic Calculator</h5>
                    <div class="calc-input-group">
                        <label>Patient Weight (kg):</label>
                        <input type="number" id="palliative-weight" placeholder="70" step="1">
                    </div>
                    <div class="calc-input-group">
                        <label>Cause of Nausea:</label>
                        <select id="palliative-nausea-cause">
                            <option value="opioid">Opioid-induced</option>
                            <option value="chemotherapy">Chemotherapy</option>
                            <option value="bowel-obstruction">Bowel obstruction</option>
                            <option value="raised-icp">Raised ICP</option>
                            <option value="metabolic">Metabolic</option>
                            <option value="vestibular">Vestibular</option>
                        </select>
                    </div>
                    <button onclick="window.quizApp.calculateAntiemetic()">Recommend Anti-emetic</button>
                    <div id="antiemetic-result" class="calc-result"></div>
                </div>

                <div class="calc-section">
                    <h5>🫁 Respiratory Secretions</h5>
                    <div class="calc-input-group">
                        <label>Patient Weight (kg):</label>
                        <input type="number" id="palliative-secretions-weight" placeholder="70" step="1">
                    </div>
                    <div class="calc-input-group">
                        <label>Secretion Type:</label>
                        <select id="palliative-secretion-type">
                            <option value="bronchial">Bronchial secretions</option>
                            <option value="salivary">Excessive salivation</option>
                            <option value="death-rattle">Death rattle</option>
                        </select>
                    </div>
                    <button onclick="window.quizApp.calculateSecretionManagement()">Calculate Doses</button>
                    <div id="secretion-result" class="calc-result"></div>
                </div>

                <div class="calc-reference">
                    <small>
                        <strong>⚠️ Important Notes:</strong><br>
                        • All doses are starting suggestions - titrate to effect<br>
                        • Consider 25-50% dose reduction if frail/elderly<br>
                        • Monitor for sedation and respiratory depression<br>
                        • Seek specialist palliative care advice for complex cases<br>
                        • These calculations are guidelines only
                    </small>
                </div>
            </div>
        `;
    }

    calculateOpioidConversion() {
        const currentOpioid = document.getElementById('palliative-current-opioid').value;
        const currentDose = parseFloat(document.getElementById('palliative-current-dose').value) || 0;
        const targetOpioid = document.getElementById('palliative-target-opioid').value;

        if (currentDose === 0) {
            document.getElementById('opioid-conversion-result').innerHTML = 
                '<div class="calc-error"><strong>Please enter current dose</strong></div>';
            return;
        }

        // Updated conversion factors to oral morphine equivalents (mg) - UK Faculty of Pain Medicine 2022
        const toMorphineFactors = {
            'morphine-oral': 1,
            'morphine-sc': 2,  // SC morphine is twice as potent as oral
            'oxycodone-oral': 1.5,  // Oxycodone 1mg = 1.5mg morphine
            'fentanyl-patch': 100,  // UK guidance: 1 mcg/hr fentanyl = 100mg oral morphine per day (was 150)
            'codeine': 0.1,  // Codeine 10mg = 1mg morphine
            'tramadol': 0.1,  // Tramadol 10mg = 1mg morphine
            'buprenorphine-patch': 110  // UK guidance: 1 mcg/hr buprenorphine = 110mg oral morphine per day (was 75)
        };

        // Conversion factors from oral morphine equivalents
        const fromMorphineFactors = {
            'morphine-oral': 1,
            'morphine-sc': 0.5,  // Oral to SC morphine
            'oxycodone-oral': 0.67,  // Morphine to oxycodone
            'fentanyl-patch': 0.01,  // Morphine to fentanyl patch (1/100)
            'diamorphine-sc': 0.33  // Oral morphine to SC diamorphine
        };

        // Convert current dose to morphine equivalents
        const morphineEquivalent = currentDose * toMorphineFactors[currentOpioid];
        
        // Convert to target opioid with 25-50% dose reduction for safety
        const fullTargetDose = morphineEquivalent * fromMorphineFactors[targetOpioid];
        const reducedTargetDose = fullTargetDose * 0.75; // 25% reduction

        let dosageForm = '';
        let administration = '';
        let frequency = '';

        switch (targetOpioid) {
            case 'morphine-oral':
                dosageForm = 'mg oral';
                administration = 'Give as modified-release BD or immediate-release 4-hourly';
                frequency = reducedTargetDose <= 30 ? '5-10mg 4-hourly PRN' : Math.round(reducedTargetDose/6) + 'mg 4-hourly PRN';
                break;
            case 'morphine-sc':
                dosageForm = 'mg subcutaneous';
                administration = 'Via syringe driver over 24 hours or divided into 4-6 hourly doses';
                frequency = Math.round(reducedTargetDose/6) + 'mg SC PRN (1/6 of daily dose)';
                break;
            case 'oxycodone-oral':
                dosageForm = 'mg oral';
                administration = 'Give as modified-release BD or immediate-release 4-hourly';
                frequency = Math.round(reducedTargetDose/6) + 'mg 4-hourly PRN';
                break;
            case 'fentanyl-patch':
                dosageForm = 'mcg/hr patch';
                administration = 'Change patch every 72 hours';
                frequency = 'Breakthrough: use fast-acting fentanyl products or oral morphine';
                break;
            case 'diamorphine-sc':
                dosageForm = 'mg subcutaneous';
                administration = 'Via syringe driver over 24 hours';
                frequency = Math.round(reducedTargetDose/6) + 'mg SC PRN (1/6 of daily dose)';
                break;
        }

        document.getElementById('opioid-conversion-result').innerHTML = `
            <div style="color: #2196F3;">
                <strong>Conversion Result:</strong><br>
                <strong>Target Dose: ${Math.round(reducedTargetDose * 10) / 10} ${dosageForm}</strong><br>
                <em>Administration:</em> ${administration}<br>
                <em>Breakthrough:</em> ${frequency}<br><br>
                <div style="color: #FF5722; font-weight: bold; margin: 8px 0;">
                    ⚠️ SAFETY: Start at 25-50% dose reduction and titrate carefully
                </div>
                <small style="color: #666;">
                    Using UK Faculty of Pain Medicine conversion factors<br>
                    Original: ${currentDose} ${currentOpioid.replace('-', ' ')} = ${Math.round(morphineEquivalent)} mg oral morphine equiv.<br>
                    Full calculated dose: ${Math.round(fullTargetDose * 10) / 10} ${dosageForm} (reduced for safety)
                </small>
            </div>
        `;
    }

    calculateBreakthroughDose() {
        const dailyMorphine = parseFloat(document.getElementById('palliative-daily-morphine').value) || 0;

        if (dailyMorphine === 0) {
            document.getElementById('breakthrough-result').innerHTML = 
                '<div class="calc-error"><strong>Please enter daily morphine equivalent</strong></div>';
            return;
        }

        // Breakthrough dose is typically 1/6 of total daily dose
        const breakthroughDose = Math.round(dailyMorphine / 6);
        const scBreakthroughDose = Math.round(breakthroughDose / 2);

        document.getElementById('breakthrough-result').innerHTML = `
            <div class="calc-success">
                <strong>Breakthrough Dosing:</strong><br>
                <strong>Oral Morphine:</strong> ${breakthroughDose}mg every 1-2 hours PRN<br>
                <strong>SC Morphine:</strong> ${scBreakthroughDose}mg every 1-2 hours PRN<br>
                <strong>Oxycodone:</strong> ${Math.round(breakthroughDose * 0.67)}mg every 1-2 hours PRN<br><br>
                <em>Frequency:</em> Maximum 6 doses per 24 hours<br>
                <em>Review:</em> If >2 breakthrough doses/day, consider increasing background dose<br><br>
                <small class="calc-note">
                    💡 Rule: Breakthrough = 1/6 of total daily dose
                </small>
            </div>
        `;
    }

    calculateAntiemetic() {
        const weight = parseFloat(document.getElementById('palliative-weight').value) || 70;
        const cause = document.getElementById('palliative-nausea-cause').value;

        let firstLine = '';
        let secondLine = '';
        let notes = '';

        switch (cause) {
            case 'opioid':
                firstLine = `<strong>Haloperidol:</strong> 0.5-1.5mg PO BD or 1.5-5mg SC/24h<br>
                           <strong>Metoclopramide:</strong> 10mg TDS PO/SC (max 5 days)`;
                secondLine = `<strong>Ondansetron:</strong> 4-8mg TDS<br>
                            <strong>Levomepromazine:</strong> 6.25-25mg/24h SC`;
                notes = 'Avoid metoclopramide if bowel obstruction suspected';
                break;
            case 'chemotherapy':
                firstLine = `<strong>Ondansetron:</strong> 8mg BD PO or 8mg/24h SC<br>
                           <strong>Dexamethasone:</strong> 8-12mg daily`;
                secondLine = `<strong>Metoclopramide:</strong> 10mg TDS<br>
                            <strong>Levomepromazine:</strong> 6.25-12.5mg/24h SC`;
                notes = 'Consider NK1 antagonists for highly emetogenic chemotherapy';
                break;
            case 'bowel-obstruction':
                firstLine = `<strong>Levomepromazine:</strong> 6.25-25mg/24h SC<br>
                           <strong>Haloperidol:</strong> 2.5-10mg/24h SC`;
                secondLine = `<strong>Octreotide:</strong> 300-600mcg/24h SC<br>
                            <strong>Hyoscine butylbromide:</strong> 60-120mg/24h SC`;
                notes = '⚠️ AVOID metoclopramide - may worsen colic';
                break;
            case 'raised-icp':
                firstLine = `<strong>Dexamethasone:</strong> 8-16mg daily<br>
                           <strong>Cyclizine:</strong> 50mg TDS PO or 150mg/24h SC`;
                secondLine = `<strong>Levomepromazine:</strong> 6.25-12.5mg/24h SC`;
                notes = 'Treat underlying cause. Consider mannitol if acute';
                break;
            case 'metabolic':
                firstLine = `<strong>Haloperidol:</strong> 0.5-1.5mg BD PO or 2.5-5mg/24h SC<br>
                           <strong>Metoclopramide:</strong> 10mg TDS`;
                secondLine = `<strong>Ondansetron:</strong> 4-8mg TDS`;
                notes = 'Correct reversible causes (hypercalcaemia, uraemia, etc.)';
                break;
            case 'vestibular':
                firstLine = `<strong>Cyclizine:</strong> 50mg TDS PO or 150mg/24h SC<br>
                           <strong>Prochlorperazine:</strong> 5-10mg TDS`;
                secondLine = `<strong>Levomepromazine:</strong> 6.25-12.5mg/24h SC`;
                notes = 'Consider cause: drugs, infection, vestibular disorders';
                break;
        }

        document.getElementById('antiemetic-result').innerHTML = `
            <div style="color: #2196F3;">
                <strong>Recommended Anti-emetics for ${cause.replace('-', ' ')}:</strong><br><br>
                <strong>First Line:</strong><br>
                ${firstLine}<br><br>
                <strong>Second Line:</strong><br>
                ${secondLine}<br><br>
                <em>Clinical Notes:</em> ${notes}<br><br>
                <small style="color: #666;">
                    ⚠️ Weight: ${weight}kg considered. Adjust doses for renal/hepatic impairment<br>
                    💊 Can combine drugs with different mechanisms if single agent insufficient
                </small>
            </div>
        `;
    }

    calculateSecretionManagement() {
        const weight = parseFloat(document.getElementById('palliative-secretions-weight').value) || 70;
        const secretionType = document.getElementById('palliative-secretion-type').value;

        let primaryDrug = '';
        let alternativeDrugs = '';
        let nonPharmacological = '';

        switch (secretionType) {
            case 'bronchial':
                primaryDrug = `<strong>Hyoscine hydrobromide:</strong><br>
                             • 0.4-0.6mg SC TDS-QDS<br>
                             • Or 1.2-2.4mg SC/24h via syringe driver<br>
                             • Patches: 1mg/72h (change every 3 days)`;
                alternativeDrugs = `<strong>Glycopyrronium:</strong> 200-400mcg SC TDS-QDS<br>
                                  <strong>Atropine:</strong> 0.4-0.6mg SC QDS<br>
                                  <strong>Hyoscine butylbromide:</strong> 20mg SC TDS (less CNS effects)`;
                nonPharmacological = 'Positioning, gentle suction, reduce fluid intake';
                break;
            case 'salivary':
                primaryDrug = `<strong>Glycopyrronium:</strong><br>
                             • 200-400mcg SC TDS<br>
                             • Or 800-1200mcg SC/24h via syringe driver`;
                alternativeDrugs = `<strong>Hyoscine patches:</strong> 1mg/72h<br>
                                  <strong>Atropine drops:</strong> 1% drops sublingually<br>
                                  <strong>Amitriptyline:</strong> 25-75mg at night (if swallowing possible)`;
                nonPharmacological = 'Frequent mouth care, suction, positioning';
                break;
            case 'death-rattle':
                primaryDrug = `<strong>Hyoscine hydrobromide:</strong><br>
                             • 0.4-0.6mg SC STAT, then every 4-8h PRN<br>
                             • Or 1.2-2.4mg SC/24h continuous<br>
                             • Start early - less effective once established`;
                alternativeDrugs = `<strong>Glycopyrronium:</strong> 200-400mcg SC TDS<br>
                                  <strong>Atropine:</strong> 0.6mg SC TDS<br>
                                  <strong>Hyoscine butylbromide:</strong> 20mg SC TDS`;
                nonPharmacological = 'Family education that this doesn\'t cause distress to patient, positioning';
                break;
        }

        document.getElementById('secretion-result').innerHTML = `
            <div class="calc-success">
                <strong>Management of ${secretionType.replace('-', ' ')}:</strong><br><br>
                <strong>First Choice:</strong><br>
                ${primaryDrug}<br><br>
                <strong>Alternatives:</strong><br>
                ${alternativeDrugs}<br><br>
                <strong>Non-pharmacological:</strong><br>
                ${nonPharmacological}<br><br>
                <small class="calc-note">
                    💊 Weight: ${weight}kg - doses shown are standard adult doses<br>
                    ⚠️ All anticholinergics can cause drowsiness, confusion, and dry mouth<br>
                    🕒 Review effectiveness after 24-48 hours and adjust accordingly
                </small>
            </div>
        `;
    }

    // Drug Reference Functions
    loadDrugReference() {
        // Check if drugDatabase is available (loaded from external file)
        if (typeof window.drugDatabase === 'undefined') {
            console.error('Drug database not loaded. Make sure drugDatabase.js is included before app.js');
            const container = document.getElementById('drug-reference-container');
            if (container) {
                container.innerHTML = '<div class="error-message">⚠️ Drug database not available. Please refresh the page.</div>';
            }
            return;
        }
        
        const drugDatabase = window.drugDatabase;
        
        const container = document.getElementById('drug-reference-container');
        container.innerHTML = `
            <div class="search-container">
                <input type="text" id="drug-search" placeholder="Search medications..." class="tool-search">
                <button id="drug-search-btn">🔍</button>
            </div>
            <div id="drug-search-results"></div>
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
        const searchBtn = document.getElementById('drug-search-btn');
        searchInput.addEventListener('input', () => this.searchDrugs(drugDatabase));
        searchBtn.addEventListener('click', () => this.searchDrugs(drugDatabase));
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
        
        // Scroll to the top of the drug reference container
        container.scrollTop = 0;
        
        // Also scroll the main content area to the top if it exists
        const mainContent = document.querySelector('.medical-tools-container') || document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
        
        // Scroll the page to the top as well
        window.scrollTo(0, 0);
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
                <input type="text" id="lab-search" placeholder="Search lab values..." class="tool-search">
                <button id="lab-search-btn">🔍</button>
            </div>
            <div id="lab-search-results" class="lab-grid"></div>
            <div class="lab-categories">
                <button class="filter-btn active" onclick="window.quizApp.showLabCategory('all'); event.stopPropagation();">All Labs</button>
                <button class="filter-btn" onclick="window.quizApp.showLabCategory('cbc'); event.stopPropagation();">CBC</button>
                <button class="filter-btn" onclick="window.quizApp.showLabCategory('bmp'); event.stopPropagation();">Chemistry</button>
                <button class="filter-btn" onclick="window.quizApp.showLabCategory('lft'); event.stopPropagation();">Liver</button>
                <button class="filter-btn" onclick="window.quizApp.showLabCategory('lipids'); event.stopPropagation();">Lipids</button>
                <button class="filter-btn" onclick="window.quizApp.showLabCategory('thyroid'); event.stopPropagation();">Thyroid</button>
                <button class="filter-btn" onclick="window.quizApp.showLabCategory('urea_electrolytes'); event.stopPropagation();">U&Es</button>
                <button class="filter-btn" onclick="window.quizApp.showLabCategory('coagulation'); event.stopPropagation();">Coagulation</button>
                <button class="filter-btn" onclick="window.quizApp.showLabCategory('cardiac_markers'); event.stopPropagation();">Cardiac</button>
                <button class="filter-btn" onclick="window.quizApp.showLabCategory('inflammatory_markers'); event.stopPropagation();">Inflammatory</button>
                <button class="filter-btn" onclick="window.quizApp.showLabCategory('endocrine'); event.stopPropagation();">Endocrine</button>
            </div>
            <div id="lab-list" class="lab-grid"></div>
        `;
        
        const searchInput = document.getElementById('lab-search');
        const searchBtn = document.getElementById('lab-search-btn');
        searchInput.addEventListener('input', () => this.searchLabValues(labDatabase));
        searchBtn.addEventListener('click', () => this.searchLabValues(labDatabase));
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
        
        // Update active state of category buttons
        const categoryButtons = document.querySelectorAll('.lab-categories .filter-btn');
        if (categoryButtons.length > 0) {
            categoryButtons.forEach(btn => {
                btn.classList.remove('active');
                const btnText = btn.textContent.trim();
                if ((category === 'all' && btnText === 'All Labs') ||
                    (category === 'cbc' && btnText === 'CBC') ||
                    (category === 'bmp' && btnText === 'Chemistry') ||
                    (category === 'lft' && btnText === 'Liver') ||
                    (category === 'lipids' && btnText === 'Lipids') ||
                    (category === 'thyroid' && btnText === 'Thyroid') ||
                    (category === 'urea_electrolytes' && btnText === 'U&Es') ||
                    (category === 'coagulation' && btnText === 'Coagulation') ||
                    (category === 'cardiac_markers' && btnText === 'Cardiac') ||
                    (category === 'inflammatory_markers' && btnText === 'Inflammatory') ||
                    (category === 'endocrine' && btnText === 'Endocrine')) {
                    btn.classList.add('active');
                }
            });
        } else {
            console.log('⚠️ Lab category buttons not found');
        }
        
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
        console.log('📋 Loading guidelines...');
        const guidelinesContainer = document.getElementById('guidelines-panel');
        if (!guidelinesContainer) {
            console.error('❌ Guidelines panel not found!');
            return;
        }
        console.log('✅ Guidelines panel found, setting up database...');
        
        try {
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
                    'CHA2DS2-VASc': 'Calculate stroke risk. Anticoagulate if score ≥2 (men) or ≥3 (women)',
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
            },
            'diabetes': {
                title: 'Type 2 Diabetes Management (NICE NG28 2024)',
                category: 'endocrine',
                evidenceLevel: 'NICE Clinical Guideline',
                lastUpdated: '2024',
                organisation: 'NICE',
                diagnosis: {
                    'HbA1c': '≥48 mmol/mol (≥6.5%) on two occasions OR single value if symptomatic',
                    'Fasting glucose': '≥7.0 mmol/L (≥126 mg/dL)',
                    'Random glucose': '≥11.1 mmol/L (≥200 mg/dL) with symptoms',
                    'OGTT': '2-hour glucose ≥11.1 mmol/L (≥200 mg/dL)'
                },
                targets: {
                    'HbA1c': '<48 mmol/mol (<6.5%) for newly diagnosed, <53 mmol/mol (<7.0%) for most adults',
                    'Blood pressure': '<130/80 mmHg',
                    'Cholesterol': 'Non-HDL <2.5 mmol/L'
                },
                lifestyle: {
                    'Diet': 'Mediterranean-style, low glycaemic index, weight loss if BMI >25',
                    'Exercise': '150 minutes moderate intensity per week, resistance training',
                    'Weight': 'Target weight loss 5-10% if overweight'
                },
                medications: {
                    'First-line': 'Metformin 500mg twice daily, titrate to 1g twice daily',
                    'Second-line': 'SGLT2 inhibitor (if CVD/heart failure) OR DPP-4 inhibitor OR sulfonylurea',
                    'Third-line': 'Triple therapy or insulin',
                    'Insulin': 'Start with basal insulin (glargine, detemir) 10 units daily, titrate 2-4 units every 3-7 days'
                },
                monitoring: {
                    'HbA1c': 'Every 3-6 months until stable, then 6-monthly',
                    'Annual checks': 'Foot examination, eye screening, kidney function, lipids, blood pressure',
                    'Sick day rules': 'Continue insulin, increase monitoring, seek help if vomiting'
                },
                complications: 'Retinopathy, nephropathy, neuropathy, cardiovascular disease, diabetic foot'
            },
            'pneumonia': {
                title: 'Pneumonia Management (NICE NG138 2024)',
                category: 'pulmonary',
                evidenceLevel: 'NICE Clinical Guideline',
                lastUpdated: '2024',
                organisation: 'NICE',
                diagnosis: {
                    'Clinical': 'Cough, fever, dyspnea, pleuritic chest pain, crackles',
                    'CXR': 'New infiltrate (may be normal in early disease)',
                    'Blood tests': 'FBC, CRP, U&E, LFT. Consider pneumococcal/legionella antigens'
                },
                severity: {
                    'CURB-65': 'Confusion, Urea >7, RR ≥30, BP <90/60, age ≥65',
                    'Score 0-1': 'Low severity - consider home treatment',
                    'Score 2': 'Moderate severity - consider hospital admission',
                    'Score ≥3': 'High severity - urgent hospital admission'
                },
                treatment: {
                    'Mild CAP': 'Amoxicillin 500mg three times daily for 5 days',
                    'Moderate CAP': 'Amoxicillin 500mg three times daily + clarithromycin 500mg twice daily for 5 days',
                    'Severe CAP': 'Co-amoxiclav 1.2g three times daily IV + clarithromycin 500mg twice daily IV',
                    'Atypical': 'Clarithromycin 500mg twice daily OR doxycycline 200mg on day 1, then 100mg daily'
                },
                admission: {
                    'Criteria': 'CURB-65 ≥2, hypoxia <90%, inability to maintain oral intake, significant comorbidities',
                    'Monitoring': 'Oxygen saturation, fluid balance, response to treatment',
                    'Discharge': 'Clinically stable for 24 hours, able to maintain oral intake, oxygen saturation >90%'
                },
                prevention: 'Pneumococcal vaccination (≥65 years, immunocompromised), annual influenza vaccination'
            },
            'sepsis': {
                title: 'Sepsis Recognition & Management (NICE NG51 2024)',
                category: 'infectious-diseases',
                evidenceLevel: 'NICE Clinical Guideline',
                lastUpdated: '2024',
                organisation: 'NICE',
                recognition: {
                    'Red flags': 'Systolic BP <90, HR >130, RR ≥25, needs O2 to maintain sats ≥92%, non-blanching rash',
                    'Amber flags': 'Relatives concerned about mental state, acute change in mental state, HR 91-130, T <36°C',
                    'High-risk groups': 'Age >75, immunocompromised, recent surgery/invasive procedure, indwelling devices'
                },
                definitions: {
                    'Sepsis': 'Life-threatening organ dysfunction due to dysregulated host response to infection',
                    'Septic shock': 'Sepsis with circulatory/cellular dysfunction (lactate >2, vasopressors needed)',
                    'qSOFA': 'Altered mental state, SBP ≤100, RR ≥22 (score ≥2 = high risk)'
                },
                management: {
                    'Sepsis Six': '1. Give oxygen, 2. Take blood cultures, 3. Give antibiotics, 4. Give fluids, 5. Measure lactate, 6. Measure urine output',
                    'Timeframe': 'Complete within 1 hour of recognition',
                    'Antibiotics': 'Broad-spectrum within 1 hour. Adjust based on cultures and local guidelines',
                    'Fluids': '500ml crystalloid bolus, reassess and repeat if needed'
                },
                antibiotics: {
                    'Community-acquired': 'Amoxicillin 1g IV three times daily + gentamicin',
                    'Hospital-acquired': 'Piperacillin-tazobactam 4.5g three times daily + gentamicin',
                    'Neutropenic': 'Piperacillin-tazobactam + gentamicin',
                    'Duration': 'Review daily, typically 5-7 days depending on source and response'
                },
                monitoring: 'Hourly observations, fluid balance, lactate, organ function, consider HDU/ICU if deteriorating'
            }
        };
        console.log('✅ Guidelines database created with', Object.keys(guidelinesDatabase).length, 'guidelines');

        const container = document.getElementById('guidelines-panel');
        container.innerHTML = `
            <div class="search-container">
                <input type="text" id="guidelines-search" placeholder="Search guidelines..." class="tool-search">
                <button id="guidelines-search-btn">🔍</button>
            </div>
            <div id="guidelines-search-results" class="lab-grid"></div>
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
            <div id="guidelines-list" class="tool-results"></div>
        `;
        
        const searchInput = document.getElementById('guidelines-search');
        const searchBtn = document.getElementById('guidelines-search-btn');
        searchInput.addEventListener('input', () => this.searchGuidelines(guidelinesDatabase));
        searchBtn.addEventListener('click', () => this.searchGuidelines(guidelinesDatabase));
        this.guidelinesDatabase = guidelinesDatabase;
        this.showGuidelinesCategory('all');
        console.log('✅ Guidelines loaded successfully!');
        
        } catch (error) {
            console.error('❌ Error loading guidelines:', error);
            const container = document.getElementById('guidelines-panel');
            container.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Guidelines Loading Error</h3>
                    <p>Unable to load clinical guidelines. Please refresh the page.</p>
                    <button onclick="window.quizApp.loadGuidelines()">Retry</button>
                </div>
            `;
        }
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
        
        // Update active state of category buttons
        const categoryButtons = document.querySelectorAll('.guidelines-categories .category-btn');
        categoryButtons.forEach(btn => {
            btn.classList.remove('active');
            // Check if this button corresponds to the selected category
            const btnCategory = this.getCategoryFromButtonText(btn.textContent);
            if (btnCategory === category) {
                btn.classList.add('active');
            }
        });
        
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
    
    // Helper function to map button text to category
    getCategoryFromButtonText(buttonText) {
        const categoryMap = {
            'All Guidelines': 'all',
            'Cardiovascular': 'cardiovascular',
            'Pulmonary': 'pulmonary',
            'Endocrine': 'endocrine',
            'Renal': 'renal',
            'Mental Health': 'mental-health',
            'Neurological': 'neurological',
            'Infectious Diseases': 'infectious-diseases'
        };
        return categoryMap[buttonText] || 'all';
    }
    
    showGuidelineDetail(guidelineKey) {
        console.log('📋 Opening guideline detail:', guidelineKey);
        const guideline = this.guidelinesDatabase[guidelineKey];
        const container = document.getElementById('guidelines-list');
        
        let contentHtml = `
            <button class="back-btn" onclick="window.quizApp.showGuidelinesCategory('all'); event.stopPropagation();">← Back to Guidelines</button>
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
        
        // Atrial Fibrillation specific properties
        if (guideline.types) {
            contentHtml += `
                <div class="info-section">
                    <h4>📊 AF Types/Classification</h4>
                    ${Object.entries(guideline.types).map(([type, description]) => `
                        <div class="stage-item">
                            <strong>${type}:</strong> ${description}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.rateControl) {
            contentHtml += `
                <div class="info-section">
                    <h4>🎯 Rate Control Strategy</h4>
                    ${Object.entries(guideline.rateControl).map(([strategy, description]) => `
                        <div class="treatment-item">
                            <strong>${strategy}:</strong> ${description}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.rhythmControl) {
            contentHtml += `
                <div class="info-section">
                    <h4>🔄 Rhythm Control Strategy</h4>
                    ${Object.entries(guideline.rhythmControl).map(([strategy, description]) => `
                        <div class="treatment-item">
                            <strong>${strategy}:</strong> ${description}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.anticoagulation) {
            contentHtml += `
                <div class="info-section">
                    <h4>🩸 Anticoagulation Management</h4>
                    ${Object.entries(guideline.anticoagulation).map(([aspect, description]) => `
                        <div class="treatment-item">
                            <strong>${aspect}:</strong> ${description}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Other specific properties used by various guidelines
        if (guideline.diagnosis) {
            contentHtml += `
                <div class="info-section">
                    <h4>🔬 Diagnosis</h4>
                    ${typeof guideline.diagnosis === 'string' ? 
                        `<p>${guideline.diagnosis}</p>` :
                        Object.entries(guideline.diagnosis).map(([aspect, description]) => `
                            <div class="diagnosis-item">
                                <strong>${aspect}:</strong> ${description}
                            </div>
                        `).join('')
                    }
                </div>
            `;
        }
        
        if (guideline.classification) {
            contentHtml += `
                <div class="info-section">
                    <h4>📊 Classification</h4>
                    ${Object.entries(guideline.classification).map(([level, description]) => `
                        <div class="stage-item">
                            <strong>${level}:</strong> ${description}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.assessment) {
            contentHtml += `
                <div class="info-section">
                    <h4>📋 Assessment</h4>
                    ${Object.entries(guideline.assessment).map(([aspect, description]) => `
                        <div class="assessment-item">
                            <strong>${aspect}:</strong> ${description}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.psychological) {
            contentHtml += `
                <div class="info-section">
                    <h4>🧠 Psychological Interventions</h4>
                    ${Object.entries(guideline.psychological).map(([intervention, description]) => `
                        <div class="treatment-item">
                            <strong>${intervention}:</strong> ${description}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.pharmacological) {
            contentHtml += `
                <div class="info-section">
                    <h4>💊 Pharmacological Treatment</h4>
                    ${Object.entries(guideline.pharmacological).map(([line, description]) => `
                        <div class="medication-item">
                            <strong>${line}:</strong> ${description}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.duration) {
            contentHtml += `
                <div class="info-section">
                    <h4>⏱️ Treatment Duration</h4>
                    <p>${guideline.duration}</p>
                </div>
            `;
        }
        
        if (guideline.riskFactors) {
            contentHtml += `
                <div class="info-section">
                    <h4>⚠️ Risk Factors</h4>
                    <p>${guideline.riskFactors}</p>
                </div>
            `;
        }
        
        if (guideline.prevention) {
            contentHtml += `
                <div class="info-section">
                    <h4>🛡️ Prevention</h4>
                    ${typeof guideline.prevention === 'string' ? 
                        `<p>${guideline.prevention}</p>` :
                        Object.entries(guideline.prevention).map(([aspect, description]) => `
                            <div class="prevention-item">
                                <strong>${aspect}:</strong> ${description}
                            </div>
                        `).join('')
                    }
                </div>
            `;
        }
        
        if (guideline.acute) {
            contentHtml += `
                <div class="info-section">
                    <h4>🚨 Acute Management</h4>
                    ${typeof guideline.acute === 'string' ? 
                        `<p>${guideline.acute}</p>` :
                        Object.entries(guideline.acute).map(([severity, description]) => `
                            <div class="acute-item">
                                <strong>${severity}:</strong> ${description}
                            </div>
                        `).join('')
                    }
                </div>
            `;
        }
        
        if (guideline.rehabilitation) {
            contentHtml += `
                <div class="info-section">
                    <h4>♻️ Rehabilitation</h4>
                    ${typeof guideline.rehabilitation === 'string' ? 
                        `<p>${guideline.rehabilitation}</p>` :
                        Object.entries(guideline.rehabilitation).map(([aspect, description]) => `
                            <div class="rehab-item">
                                <strong>${aspect}:</strong> ${description}
                            </div>
                        `).join('')
                    }
                </div>
            `;
        }
        
        if (guideline.referral) {
            contentHtml += `
                <div class="info-section">
                    <h4>📞 Referral Criteria</h4>
                    ${typeof guideline.referral === 'string' ? 
                        `<p>${guideline.referral}</p>` :
                        Object.entries(guideline.referral).map(([urgency, criteria]) => `
                            <div class="referral-item">
                                <strong>${urgency}:</strong> ${criteria}
                            </div>
                        `).join('')
                    }
                </div>
            `;
        }
        
        if (guideline.complications) {
            contentHtml += `
                <div class="info-section">
                    <h4>⚠️ Complications</h4>
                    <p>${guideline.complications}</p>
                </div>
            `;
        }
        
        if (guideline.deviceTherapy) {
            contentHtml += `
                <div class="info-section">
                    <h4>🔌 Device Therapy</h4>
                    ${Object.entries(guideline.deviceTherapy).map(([device, criteria]) => `
                        <div class="device-item">
                            <strong>${device}:</strong> ${criteria}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.pharmacotherapy) {
            contentHtml += `
                <div class="info-section">
                    <h4>💊 Pharmacotherapy</h4>
                    ${Object.entries(guideline.pharmacotherapy).map(([medication, details]) => `
                        <div class="medication-item">
                            <strong>${medication}:</strong> ${details}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.surgery) {
            contentHtml += `
                <div class="info-section">
                    <h4>🏥 Surgical Options</h4>
                    ${Object.entries(guideline.surgery).map(([type, details]) => `
                        <div class="surgery-item">
                            <strong>${type}:</strong> ${details}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.comorbidities) {
            contentHtml += `
                <div class="info-section">
                    <h4>🔗 Comorbidities</h4>
                    <p>${guideline.comorbidities}</p>
                </div>
            `;
        }
        
        if (guideline.recurrent) {
            contentHtml += `
                <div class="info-section">
                    <h4>🔄 Recurrent Cases</h4>
                    ${Object.entries(guideline.recurrent).map(([aspect, details]) => `
                        <div class="recurrent-item">
                            <strong>${aspect}:</strong> ${details}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.catheter) {
            contentHtml += `
                <div class="info-section">
                    <h4>🩺 Catheter-Related</h4>
                    ${Object.entries(guideline.catheter).map(([aspect, details]) => `
                        <div class="catheter-item">
                            <strong>${aspect}:</strong> ${details}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.advice) {
            contentHtml += `
                <div class="info-section">
                    <h4>💡 Patient Advice</h4>
                    <p>${guideline.advice}</p>
                </div>
            `;
        }
        
        if (guideline.inhalers) {
            contentHtml += `
                <div class="info-section">
                    <h4>💨 Inhaler Devices</h4>
                    ${Object.entries(guideline.inhalers).map(([type, description]) => `
                        <div class="inhaler-item">
                            <strong>${type}:</strong> ${description}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.triggers) {
            contentHtml += `
                <div class="info-section">
                    <h4>⚡ Common Triggers</h4>
                    <p>${guideline.triggers}</p>
                </div>
            `;
        }
        
        if (guideline.admission) {
            contentHtml += `
                <div class="info-section">
                    <h4>🏥 Admission Criteria</h4>
                    ${Object.entries(guideline.admission).map(([criteria, details]) => `
                        <div class="admission-item">
                            <strong>${criteria}:</strong> ${details}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.severity) {
            contentHtml += `
                <div class="info-section">
                    <h4>📊 Severity Assessment</h4>
                    ${Object.entries(guideline.severity).map(([level, description]) => `
                        <div class="severity-item">
                            <strong>${level}:</strong> ${description}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.antibiotics) {
            contentHtml += `
                <div class="info-section">
                    <h4>💉 Antibiotic Management</h4>
                    ${Object.entries(guideline.antibiotics).map(([type, details]) => `
                        <div class="antibiotic-item">
                            <strong>${type}:</strong> ${details}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.recognition) {
            contentHtml += `
                <div class="info-section">
                    <h4>🔍 Recognition</h4>
                    ${Object.entries(guideline.recognition).map(([aspect, details]) => `
                        <div class="recognition-item">
                            <strong>${aspect}:</strong> ${details}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.definitions) {
            contentHtml += `
                <div class="info-section">
                    <h4>📖 Definitions</h4>
                    ${Object.entries(guideline.definitions).map(([term, definition]) => `
                        <div class="definition-item">
                            <strong>${term}:</strong> ${definition}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (guideline.management) {
            contentHtml += `
                <div class="info-section">
                    <h4>⚕️ Management</h4>
                    ${Object.entries(guideline.management).map(([aspect, details]) => `
                        <div class="management-item">
                            <strong>${aspect}:</strong> ${details}
                        </div>
                    `).join('')}
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
            },
            'altered-mental-status': {
                title: 'Altered Mental Status',
                category: 'Neurology/Emergency',
                redFlags: '🚩 Focal neurological signs, hypoglycemia, hypoxia, severe hypotension, hyperthermia',
                presentations: {
                    'Hypoglycemia': {
                        features: 'Confusion, diaphoresis, tachycardia, tremor, hunger. History of diabetes, missed meals, medication errors',
                        tests: 'Blood glucose (<3.9 mmol/L), HbA1c, C-peptide if factitious suspected',
                        urgency: 'Emergency',
                        timeToTreat: 'Immediate glucose correction, glucagon if unable to swallow',
                        clinicalPearls: 'Whipple triad: symptoms + low glucose + relief with treatment. Consider sulphonylurea poisoning',
                        differentiatingFeatures: 'Rapid improvement with glucose, diaphoresis, known diabetes'
                    },
                    'Stroke/TIA': {
                        features: 'Sudden onset focal deficits, FAST positive, speech difficulties, weakness, vision changes',
                        tests: 'CT head (exclude haemorrhage), CT angiogram, MRI if available, ECG, glucose',
                        urgency: 'Emergency',
                        timeToTreat: 'Thrombolysis within 4.5 hours, thrombectomy within 6-24 hours',
                        clinicalPearls: 'ROSIER score for recognition. NIHSS for severity. Time is brain - rapid assessment crucial',
                        differentiatingFeatures: 'Sudden onset, focal signs, FAST positive'
                    },
                    'Sepsis/Septic shock': {
                        features: 'Fever/hypothermia, tachycardia, hypotension, altered mental state, source of infection',
                        tests: 'Blood cultures, lactate, FBC, CRP, procalcitonin, urinalysis, CXR',
                        urgency: 'Emergency',
                        timeToTreat: 'Antibiotics within 1 hour, fluid resuscitation, vasopressors if needed',
                        clinicalPearls: 'qSOFA score for screening. Lactate >2 indicates organ dysfunction. Source control important',
                        differentiatingFeatures: 'Systemic signs of infection, elevated lactate, hypotension'
                    },
                    'Drug intoxication': {
                        features: 'History of ingestion, pupils (miosis/mydriasis), respiratory depression, specific toxidromes',
                        tests: 'Toxicology screen, paracetamol/salicylate levels, ABG, glucose, U&Es',
                        urgency: 'Emergency',
                        timeToTreat: 'Supportive care, specific antidotes (naloxone, flumazenil), activated charcoal if early',
                        clinicalPearls: 'Common toxidromes: opioid (miosis, bradycardia), anticholinergic (mydriasis, dry skin)',
                        differentiatingFeatures: 'History of ingestion, specific toxidrome, response to antidotes'
                    },
                    'Hepatic encephalopathy': {
                        features: 'Known liver disease, asterixis, confusion to coma, precipitants (infection, GI bleed, drugs)',
                        tests: 'Ammonia (elevated), LFTs, FBC, U&Es, blood cultures, ascitic tap if present',
                        urgency: 'Urgent',
                        timeToTreat: 'Lactulose, rifaximin, identify and treat precipitants',
                        clinicalPearls: 'West Haven criteria for grading. Common precipitants: infection, GI bleeding, constipation',
                        differentiatingFeatures: 'Known cirrhosis, asterixis, elevated ammonia'
                    },
                    'Uremic encephalopathy': {
                        features: 'Known CKD, confusion, nausea, muscle twitching, pericardial friction rub',
                        tests: 'U&Es (very high urea/creatinine), urinalysis, ECG (hyperkalaemia), ABG',
                        urgency: 'Emergency',
                        timeToTreat: 'Urgent dialysis, treat hyperkalaemia if present',
                        clinicalPearls: 'Usually urea >40 mmol/L. Watch for hyperkalaemia. Dialysis definitive treatment',
                        differentiatingFeatures: 'Known renal failure, very high urea, muscle twitching'
                    }
                }
            },
            'dizziness': {
                title: 'Dizziness/Vertigo',
                category: 'Neurology/ENT',
                redFlags: '🚩 Focal neurological signs, severe headache, hearing loss, diplopia, dysarthria',
                presentations: {
                    'BPPV': {
                        features: 'Episodic rotational vertigo with position changes, Dix-Hallpike positive, nausea',
                        tests: 'Clinical diagnosis with Dix-Hallpike manoeuvre, audiometry if hearing concerns',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Canalith repositioning procedures (Epley manoeuvre)',
                        clinicalPearls: 'Most common cause of vertigo. Posterior canal most affected. May recur',
                        differentiatingFeatures: 'Positional triggers, Dix-Hallpike positive, brief episodes'
                    },
                    'Vestibular neuronitis': {
                        features: 'Sudden onset severe vertigo, nausea, vomiting, no hearing loss, recent viral illness',
                        tests: 'Clinical diagnosis, audiometry to rule out labyrinthitis',
                        urgency: 'Urgent',
                        timeToTreat: 'Vestibular suppressants (prochlorperazine), early mobilisation',
                        clinicalPearls: 'Horizontal nystagmus away from affected side. Gradual improvement over weeks',
                        differentiatingFeatures: 'Acute severe vertigo, no hearing loss, recent viral illness'
                    },
                    'Meniere disease': {
                        features: 'Episodic vertigo, fluctuating hearing loss, tinnitus, aural fullness',
                        tests: 'Audiometry (low-frequency hearing loss), consider MRI to exclude retrocochlear pathology',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Low-salt diet, diuretics, betahistine, vestibular suppressants for acute attacks',
                        clinicalPearls: 'Triad: vertigo + hearing loss + tinnitus. Attacks last hours to days',
                        differentiatingFeatures: 'Triad of symptoms, fluctuating hearing loss, episodic'
                    },
                    'Posterior circulation stroke': {
                        features: 'Sudden vertigo with neurological signs (diplopia, dysarthria, ataxia, weakness)',
                        tests: 'Urgent CT head, MRI with DWI, CT angiogram, ECG',
                        urgency: 'Emergency',
                        timeToTreat: 'Thrombolysis/thrombectomy if within time window',
                        clinicalPearls: 'HINTS exam (Head Impulse, Nystagmus, Test of Skew) can differentiate from peripheral',
                        differentiatingFeatures: 'Associated neurological signs, negative head impulse test'
                    },
                    'Orthostatic hypotension': {
                        features: 'Dizziness on standing, lightheadedness, near-syncope, medications (antihypertensives)',
                        tests: 'Orthostatic vitals (drop >20 mmHg systolic or >10 mmHg diastolic), ECG',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Medication review, increase fluid/salt intake, compression stockings',
                        clinicalPearls: 'Common in elderly. Check medications (diuretics, alpha-blockers). Gradual position changes',
                        differentiatingFeatures: 'Positional component, medication history, orthostatic vital changes'
                    },
                    'Anxiety/Panic': {
                        features: 'Lightheadedness, palpitations, chest tightness, sense of unreality, hyperventilation',
                        tests: 'Rule out organic causes, consider ECG, glucose if symptoms suggest',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Reassurance, breathing exercises, CBT, consider anxiolytics',
                        clinicalPearls: 'Often in young patients. Associated with agoraphobia. Exclude cardiac/metabolic causes',
                        differentiatingFeatures: 'Associated anxiety symptoms, hyperventilation, young patient'
                    }
                }
            },
            'seizures': {
                title: 'Seizures',
                category: 'Neurology/Emergency',
                redFlags: '🚩 Status epilepticus (>5 minutes), focal neurological deficits, head trauma, fever in adults',
                presentations: {
                    'Tonic-clonic seizure': {
                        features: 'Generalised stiffening then rhythmic jerking, tongue biting, incontinence, post-ictal confusion',
                        tests: 'Blood glucose, U&Es, LFTs, drug levels (if on AEDs), CT head if first seizure',
                        urgency: 'Emergency',
                        timeToTreat: 'Protect airway, benzodiazepines if prolonged (>5 minutes)',
                        clinicalPearls: 'Most recover spontaneously. Lateral recovery position. Check for precipitants',
                        differentiatingFeatures: 'Generalised tonic-clonic movements, post-ictal confusion'
                    },
                    'Status epilepticus': {
                        features: 'Seizure >5 minutes or recurrent seizures without recovery of consciousness',
                        tests: 'Emergency investigations: glucose, U&Es, AED levels, ABG, consider LP if febrile',
                        urgency: 'Emergency',
                        timeToTreat: 'IV lorazepam, then phenytoin/levetiracetam, consider intubation',
                        clinicalPearls: 'Medical emergency. Refractory if continues despite two appropriate AEDs',
                        differentiatingFeatures: 'Prolonged seizure activity, impaired consciousness'
                    },
                    'Focal seizure': {
                        features: 'Localised symptoms (motor, sensory, psychic), may have impaired awareness, aura',
                        tests: 'EEG, MRI brain to identify structural lesion, routine bloods',
                        urgency: 'Urgent',
                        timeToTreat: 'Investigate underlying cause, consider AED therapy',
                        clinicalPearls: 'May indicate structural brain lesion. Can progress to generalised seizure',
                        differentiatingFeatures: 'Focal symptoms, may remain conscious, consistent pattern'
                    },
                    'Febrile seizure': {
                        features: 'Child 6 months-6 years, fever, usually brief generalised seizure',
                        tests: 'Identify source of fever, LP if <12 months or concerning features',
                        urgency: 'Urgent',
                        timeToTreat: 'Treat underlying infection, antipyretics, reassurance to parents',
                        clinicalPearls: 'Simple vs complex (>15 min, focal, recurs in 24h). Family history common',
                        differentiatingFeatures: 'Young child, fever, family history'
                    },
                    'Non-epileptic attack': {
                        features: 'Atypical movements, fluctuating consciousness, eyes closed during event, prolonged duration',
                        tests: 'Video EEG for definitive diagnosis, prolactin not raised post-ictally',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Psychological support, avoid unnecessary AEDs, address underlying trauma',
                        clinicalPearls: 'Often history of trauma/abuse. Side-to-side head movements. Gradual onset/offset',
                        differentiatingFeatures: 'Atypical features, eyes closed, normal EEG during event'
                    },
                    'Syncope (mimicking seizure)': {
                        features: 'Brief loss of consciousness, preceding lightheadedness, pallor, rapid recovery',
                        tests: 'ECG, orthostatic vitals, echo if cardiac cause suspected',
                        urgency: 'Urgent',
                        timeToTreat: 'Treat underlying cause (cardiac, orthostatic), avoid triggers',
                        clinicalPearls: 'Brief myoclonic jerks common. No post-ictal confusion. Triggers often present',
                        differentiatingFeatures: 'Brief duration, rapid recovery, triggers (standing, pain)'
                    }
                }
            },
            'weakness': {
                title: 'Weakness/Paralysis',
                category: 'Neurology',
                redFlags: '🚩 Sudden onset, bilateral weakness, respiratory difficulty, bulbar symptoms',
                presentations: {
                    'Stroke': {
                        features: 'Sudden onset unilateral weakness, facial droop, speech difficulties, FAST positive',
                        tests: 'Urgent CT head, CT angiogram, MRI, ECG, glucose, NIHSS assessment',
                        urgency: 'Emergency',
                        timeToTreat: 'Thrombolysis within 4.5 hours, mechanical thrombectomy up to 24 hours',
                        clinicalPearls: 'Time critical. ROSIER score for recognition. Exclude hypoglycemia and seizure',
                        differentiatingFeatures: 'Sudden onset, unilateral, upper motor neuron signs'
                    },
                    'Guillain-Barré syndrome': {
                        features: 'Ascending symmetrical weakness, areflexia, minimal sensory loss, preceding infection',
                        tests: 'LP (raised protein, normal cells), nerve conduction studies, anti-GM1 antibodies',
                        urgency: 'Emergency',
                        timeToTreat: 'IVIG or plasmapheresis, monitor respiratory function',
                        clinicalPearls: 'Miller-Fisher variant: ophthalmoplegia, ataxia, areflexia. Watch for respiratory failure',
                        differentiatingFeatures: 'Ascending pattern, areflexia, recent infection'
                    },
                    'Myasthenia gravis': {
                        features: 'Fluctuating weakness, worse with activity, ptosis, diplopia, bulbar symptoms',
                        tests: 'Anti-AChR antibodies, Tensilon test, EMG with repetitive stimulation, CT thorax',
                        urgency: 'Urgent',
                        timeToTreat: 'Anticholinesterases, immunosuppression, plasmapheresis if crisis',
                        clinicalPearls: 'Ocular symptoms common initially. Myasthenic crisis can cause respiratory failure',
                        differentiatingFeatures: 'Fatigable weakness, ocular symptoms, improves with rest'
                    },
                    'Spinal cord compression': {
                        features: 'Back pain, bilateral leg weakness, sensory level, bowel/bladder dysfunction',
                        tests: 'Urgent MRI spine, FBC, ESR, PSA (males), protein electrophoresis',
                        urgency: 'Emergency',
                        timeToTreat: 'High-dose steroids, urgent neurosurgical/oncology referral',
                        clinicalPearls: 'Oncological emergency. Cauda equina if bladder/bowel involved. Time critical',
                        differentiatingFeatures: 'Sensory level, bilateral symptoms, bowel/bladder involvement'
                    },
                    'Periodic paralysis': {
                        features: 'Episodic weakness, triggers (exercise, carbohydrates), family history, normal between episodes',
                        tests: 'Potassium levels during attack, genetic testing, muscle biopsy',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Treat electrolyte abnormalities, avoid triggers, prophylactic medications',
                        clinicalPearls: 'Hypokalaemic most common. Thyrotoxic variant in Asian males. Carbonic anhydrase inhibitors help',
                        differentiatingFeatures: 'Episodic nature, family history, electrolyte abnormalities'
                    },
                    'Conversion disorder': {
                        features: 'Inconsistent weakness, normal reflexes, give-way weakness, incongruent examination',
                        tests: 'Diagnosis of exclusion, detailed neurological assessment, psychological evaluation',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Physiotherapy, psychological support, reassurance',
                        clinicalPearls: 'Often precipitated by stress. Hoover sign may be positive. Avoid confrontation',
                        differentiatingFeatures: 'Inconsistent findings, psychological stressors, normal investigations'
                    }
                }
            },
            'nausea-vomiting': {
                title: 'Nausea and Vomiting',
                category: 'Gastroenterology/General',
                redFlags: '🚩 Hematemesis, severe dehydration, projectile vomiting, abdominal distension',
                presentations: {
                    'Gastroenteritis': {
                        features: 'Acute onset nausea, vomiting, diarrhea, crampy pain, fever, food/water exposure',
                        tests: 'Clinical diagnosis, stool MC&S if bloody/severe, U&Es if dehydrated',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Oral rehydration, antiemetics, antibiotics only if severe bacterial',
                        clinicalPearls: 'Usually viral. Norovirus common in outbreaks. Antibiotics may prolong shedding',
                        differentiatingFeatures: 'Acute onset, diarrhea, fever, food exposure'
                    },
                    'Bowel obstruction': {
                        features: 'Vomiting (early if small bowel), crampy pain, distension, constipation, previous surgery',
                        tests: 'CT abdomen/pelvis, AXR, FBC, U&Es, lactate',
                        urgency: 'Emergency',
                        timeToTreat: 'NBM, NG decompression, IV fluids, surgery if complete',
                        clinicalPearls: 'Small bowel: early vomiting, less distension. Large bowel: late vomiting, more distension',
                        differentiatingFeatures: 'Crampy pain, distension, previous abdominal surgery'
                    },
                    'Pregnancy': {
                        features: 'Missed period, morning sickness, breast tenderness, fatigue, food aversions',
                        tests: 'Pregnancy test (urine/serum βhCG), FBC if hyperemesis gravidarum',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Small frequent meals, ginger, antiemetics if severe',
                        clinicalPearls: 'Hyperemesis gravidarum if severe (weight loss, ketosis). Usually improves by 16 weeks',
                        differentiatingFeatures: 'Reproductive age female, missed period, positive pregnancy test'
                    },
                    'Medication side effects': {
                        features: 'Recent medication changes, chemotherapy, opioids, antibiotics, timing related to doses',
                        tests: 'Review medication history, drug levels if applicable',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Dose adjustment, antiemetics, alternative medications',
                        clinicalPearls: 'Common with chemotherapy, opioids, antibiotics. Ondansetron effective for chemotherapy',
                        differentiatingFeatures: 'Temporal relationship with medications, known emetogenic drugs'
                    },
                    'Migraine': {
                        features: 'Headache with nausea/vomiting, photophobia, phonophobia, aura, family history',
                        tests: 'Clinical diagnosis, neuroimaging if atypical features',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Triptans, antiemetics, NSAIDs, dark quiet environment',
                        clinicalPearls: 'Nausea often prominent. Metoclopramide helps both nausea and headache',
                        differentiatingFeatures: 'Associated headache, photophobia, family history'
                    },
                    'Appendicitis': {
                        features: 'Initially periumbilical pain → RLQ, nausea, vomiting, fever, McBurney point tenderness',
                        tests: 'CT abdomen/pelvis, FBC, CRP, urinalysis',
                        urgency: 'Emergency',
                        timeToTreat: 'Appendicectomy, antibiotics if perforated',
                        clinicalPearls: 'Vomiting after pain onset. Rovsing sign. Atypical in elderly/pregnant',
                        differentiatingFeatures: 'Pain migration to RLQ, fever, rebound tenderness'
                    }
                }
            },
            'back-pain': {
                title: 'Back Pain',
                category: 'Musculoskeletal/Emergency',
                redFlags: '🚩 Bowel/bladder dysfunction, saddle anaesthesia, bilateral leg symptoms, fever',
                presentations: {
                    'Mechanical low back pain': {
                        features: 'Gradual onset, worse with movement, better with rest, no neurological signs',
                        tests: 'Clinical diagnosis, imaging only if red flags or persistent >6 weeks',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Analgesia, early mobilisation, physiotherapy, avoid bed rest',
                        clinicalPearls: 'Most resolve within 6 weeks. Avoid early imaging unless red flags',
                        differentiatingFeatures: 'Mechanical pain, no neurological signs, improves with rest'
                    },
                    'Sciatica/Disc prolapse': {
                        features: 'Leg pain worse than back pain, dermatomal distribution, positive straight leg raise',
                        tests: 'MRI if persistent >6 weeks or neurological deficit, nerve conduction studies',
                        urgency: 'Urgent if neurological deficit',
                        timeToTreat: 'Analgesia, physiotherapy, consider surgery if severe/persistent',
                        clinicalPearls: 'L5/S1 most common. Positive crossed straight leg raise more specific',
                        differentiatingFeatures: 'Dermatomal leg pain, positive straight leg raise'
                    },
                    'Cauda equina syndrome': {
                        features: 'Bilateral leg symptoms, saddle anaesthesia, bowel/bladder dysfunction, severe pain',
                        tests: 'Urgent MRI lumbosacral spine, post-void bladder scan',
                        urgency: 'Emergency',
                        timeToTreat: 'Urgent surgical decompression within 24-48 hours',
                        clinicalPearls: 'Surgical emergency. May have insidious onset. High index of suspicion needed',
                        differentiatingFeatures: 'Bilateral symptoms, saddle anaesthesia, bladder dysfunction'
                    },
                    'Spinal infection': {
                        features: 'Severe pain, fever, risk factors (IVDU, immunosuppression, recent surgery)',
                        tests: 'FBC, ESR, CRP, blood cultures, MRI spine',
                        urgency: 'Emergency',
                        timeToTreat: 'IV antibiotics, surgical drainage if abscess',
                        clinicalPearls: 'Discitis, osteomyelitis, epidural abscess. May present without fever in elderly',
                        differentiatingFeatures: 'Fever, risk factors, raised inflammatory markers'
                    },
                    'Vertebral fracture': {
                        features: 'Severe pain after trauma/fall, elderly with osteoporosis, point tenderness',
                        tests: 'Plain X-rays, CT if neurological signs, DEXA scan for osteoporosis',
                        urgency: 'Urgent',
                        timeToTreat: 'Analgesia, bracing, vertebroplasty if severe, treat osteoporosis',
                        clinicalPearls: 'Common in elderly with minimal trauma. Check for other fractures',
                        differentiatingFeatures: 'History of trauma, osteoporosis, point tenderness'
                    },
                    'Ankylosing spondylitis': {
                        features: 'Young male, morning stiffness >1 hour, improves with exercise, family history',
                        tests: 'HLA-B27, ESR, CRP, MRI sacroiliac joints, plain X-rays',
                        urgency: 'Non-urgent',
                        timeToTreat: 'NSAIDs, physiotherapy, biologics if severe',
                        clinicalPearls: 'Inflammatory back pain. Schober test for spinal mobility. Eye involvement common',
                        differentiatingFeatures: 'Young male, morning stiffness, improves with exercise'
                    }
                }
            },
            'diarrhea': {
                title: 'Diarrhea',
                category: 'Gastroenterology',
                redFlags: '🚩 Bloody stools, severe dehydration, high fever, immunocompromised, recent antibiotics',
                presentations: {
                    'Viral gastroenteritis': {
                        features: 'Acute watery diarrhea, nausea, vomiting, low-grade fever, household contacts affected',
                        tests: 'Clinical diagnosis, stool MC&S if severe/prolonged, U&Es if dehydrated',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Oral rehydration, symptomatic treatment, usually self-limiting',
                        clinicalPearls: 'Norovirus most common. Usually resolves in 2-3 days. Highly contagious',
                        differentiatingFeatures: 'Watery stools, household outbreak, viral prodrome'
                    },
                    'Bacterial gastroenteritis': {
                        features: 'Bloody diarrhea, high fever, severe cramping, food exposure (poultry, eggs, dairy)',
                        tests: 'Stool MC&S, blood cultures if systemic, C. diff toxin if recent antibiotics',
                        urgency: 'Urgent',
                        timeToTreat: 'Antibiotics if severe (ciprofloxacin), supportive care',
                        clinicalPearls: 'Salmonella, Campylobacter, Shigella common. Avoid antimotility agents',
                        differentiatingFeatures: 'Bloody stools, high fever, severe symptoms'
                    },
                    'C. difficile colitis': {
                        features: 'Recent antibiotics, watery/bloody diarrhea, cramping, may have toxic megacolon',
                        tests: 'C. diff toxin (PCR preferred), FBC, CRP, AXR if toxic megacolon suspected',
                        urgency: 'Emergency if severe',
                        timeToTreat: 'Oral vancomycin or fidaxomicin, stop precipitating antibiotics',
                        clinicalPearls: 'Fulminant colitis can be life-threatening. PPI use also risk factor',
                        differentiatingFeatures: 'Recent antibiotic use, healthcare setting, positive C. diff'
                    },
                    'Inflammatory bowel disease': {
                        features: 'Chronic bloody diarrhea, weight loss, extraintestinal features (arthritis, eye problems)',
                        tests: 'Colonoscopy with biopsy, faecal calprotectin, CRP, FBC',
                        urgency: 'Urgent if acute flare',
                        timeToTreat: 'Aminosalicylates, steroids for flares, immunosuppression',
                        clinicalPearls: 'UC: continuous from rectum. Crohn: skip lesions, transmural',
                        differentiatingFeatures: 'Chronic course, extraintestinal features, young patient'
                    },
                    'Traveller\'s diarrhea': {
                        features: 'Recent travel to endemic area, acute watery diarrhea, may have blood/mucus',
                        tests: 'Stool MC&S including parasites, O&P examination',
                        urgency: 'Non-urgent unless severe',
                        timeToTreat: 'Ciprofloxacin if bacterial, specific treatment for parasites',
                        clinicalPearls: 'ETEC most common bacterial cause. Giardia common parasitic cause',
                        differentiatingFeatures: 'Recent travel history, endemic area exposure'
                    },
                    'Medication-induced': {
                        features: 'Recent medication changes, antibiotics, PPIs, metformin, colchicine',
                        tests: 'Review medication history, stool studies if prolonged',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Stop offending medication, supportive care',
                        clinicalPearls: 'Antibiotics disrupt normal flora. Magnesium-containing antacids common cause',
                        differentiatingFeatures: 'Temporal relationship with medication, known causative drugs'
                    }
                }
            },
            'constipation': {
                title: 'Constipation',
                category: 'Gastroenterology',
                redFlags: '🚩 Acute onset in elderly, weight loss, rectal bleeding, complete obstruction',
                presentations: {
                    'Functional constipation': {
                        features: 'Chronic constipation, no alarm features, may have IBS symptoms',
                        tests: 'Clinical diagnosis, consider colonoscopy if >50 years or alarm features',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Dietary fibre, fluid intake, laxatives (macrogol, senna)',
                        clinicalPearls: 'Rome IV criteria. Exclude organic causes. Toilet position important',
                        differentiatingFeatures: 'Chronic course, no alarm features, dietary factors'
                    },
                    'Medication-induced': {
                        features: 'Recent medication changes, opioids, anticholinergics, iron supplements',
                        tests: 'Medication review, basic investigations if severe',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Review medications, laxatives, opioid antagonists if appropriate',
                        clinicalPearls: 'Opioids very constipating. Calcium channel blockers, antihistamines also cause',
                        differentiatingFeatures: 'Temporal relationship with medications, known constipating drugs'
                    },
                    'Colorectal cancer': {
                        features: 'Change in bowel habit, weight loss, rectal bleeding, family history, >50 years',
                        tests: 'Urgent colonoscopy, CT colonography, CEA, FBC',
                        urgency: 'Urgent',
                        timeToTreat: 'Urgent 2-week-wait referral for investigation',
                        clinicalPearls: 'Left-sided tumours cause obstruction. Right-sided may present with anaemia',
                        differentiatingFeatures: 'New-onset in elderly, weight loss, rectal bleeding'
                    },
                    'Hypothyroidism': {
                        features: 'Fatigue, weight gain, cold intolerance, dry skin, bradycardia',
                        tests: 'TSH, free T4, consider TPO antibodies',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Levothyroxine replacement, start low dose in elderly',
                        clinicalPearls: 'Often insidious onset. May present with constipation alone',
                        differentiatingFeatures: 'Associated hypothyroid symptoms, elevated TSH'
                    },
                    'Anal fissure': {
                        features: 'Severe pain with defecation, small amount of bright red blood, anal spasm',
                        tests: 'Clinical examination (may require EUA), sigmoidoscopy if atypical',
                        urgency: 'Non-urgent',
                        timeToTreat: 'High-fibre diet, topical anaesthetics, GTN ointment',
                        clinicalPearls: 'Anal fissures cause secondary constipation due to pain. Lateral fissures suspicious',
                        differentiatingFeatures: 'Severe anal pain, fear of defecation, visible fissure'
                    },
                    'Hirschsprung disease': {
                        features: 'Chronic constipation from birth, failure to thrive, delayed passage of meconium',
                        tests: 'Rectal biopsy (absent ganglion cells), barium enema',
                        urgency: 'Urgent in neonates',
                        timeToTreat: 'Surgical correction (pull-through procedure)',
                        clinicalPearls: 'Congenital absence of enteric neurons. Family history in 20%',
                        differentiatingFeatures: 'Neonatal presentation, delayed meconium, failure to thrive'
                    }
                }
            },
            'jaundice': {
                title: 'Jaundice',
                category: 'Hepatology/Gastroenterology',
                redFlags: '🚩 Acute onset with confusion, coagulopathy, severe abdominal pain, hypotension',
                presentations: {
                    'Viral hepatitis': {
                        features: 'Prodromal illness, fatigue, nausea, RUQ pain, dark urine, pale stools',
                        tests: 'Hep A/B/C/E serology, LFTs (ALT>>bilirubin), FBC, PT/INR',
                        urgency: 'Urgent',
                        timeToTreat: 'Supportive care, avoid hepatotoxic drugs, monitor for fulminant hepatitis',
                        clinicalPearls: 'Hep A: faeco-oral, self-limiting. Hep B: blood-borne, may become chronic',
                        differentiatingFeatures: 'Prodromal illness, very high ALT, positive serology'
                    },
                    'Gallstones/Cholangitis': {
                        features: 'RUQ pain, fever, jaundice (Charcot triad), may have hypotension/confusion',
                        tests: 'LFTs (conjugated bilirubin, ALP), MRCP, blood cultures, ultrasound',
                        urgency: 'Emergency',
                        timeToTreat: 'Antibiotics, urgent ERCP with sphincterotomy',
                        clinicalPearls: 'Reynolds pentad if hypotension/confusion. Urgent decompression needed',
                        differentiatingFeatures: 'Charcot triad, gallstones on imaging, elevated ALP'
                    },
                    'Drug-induced hepatitis': {
                        features: 'Recent medication exposure, paracetamol, antibiotics, anticonvulsants, herbs',
                        tests: 'LFTs, paracetamol level, drug levels if applicable, PT/INR',
                        urgency: 'Emergency if fulminant',
                        timeToTreat: 'Stop offending drug, N-acetylcysteine for paracetamol, supportive care',
                        clinicalPearls: 'Paracetamol most common. Dose-dependent vs idiosyncratic reactions',
                        differentiatingFeatures: 'Medication exposure, elevated ALT, improvement after stopping drug'
                    },
                    'Alcoholic hepatitis': {
                        features: 'Heavy alcohol use, fever, hepatomegaly, may have ascites/encephalopathy',
                        tests: 'LFTs (AST:ALT >2:1), GGT, FBC, PT/INR, discriminant function',
                        urgency: 'Urgent',
                        timeToTreat: 'Alcohol cessation, prednisolone if severe, nutritional support',
                        clinicalPearls: 'Maddrey discriminant function >32 indicates severe disease',
                        differentiatingFeatures: 'Alcohol history, AST:ALT ratio >2:1, hepatomegaly'
                    },
                    'Pancreatic cancer': {
                        features: 'Painless progressive jaundice, weight loss, palpable gallbladder (Courvoisier sign)',
                        tests: 'CT abdomen, MRCP, CA 19-9, ERCP with biopsy/stenting',
                        urgency: 'Urgent',
                        timeToTreat: 'Urgent oncology referral, biliary stenting for palliation',
                        clinicalPearls: 'Courvoisier law: palpable gallbladder with jaundice suggests malignancy',
                        differentiatingFeatures: 'Painless jaundice, weight loss, palpable gallbladder'
                    },
                    'Haemolytic anaemia': {
                        features: 'Anaemia, splenomegaly, unconjugated hyperbilirubinaemia, dark urine',
                        tests: 'FBC (anaemia, spherocytes), LDH, haptoglobin, Coombs test, blood film',
                        urgency: 'Urgent',
                        timeToTreat: 'Treat underlying cause, steroids if autoimmune, folic acid',
                        clinicalPearls: 'Unconjugated bilirubin predominates. Look for underlying cause',
                        differentiatingFeatures: 'Anaemia, unconjugated bilirubin, elevated LDH'
                    }
                }
            },
            'fever': {
                title: 'Fever',
                category: 'Infectious Disease/General',
                redFlags: '🚩 Hypotension, altered mental status, petechial rash, neck stiffness, immunocompromised',
                presentations: {
                    'Viral upper respiratory tract infection': {
                        features: 'Gradual onset, rhinorrhoea, sore throat, myalgia, low-grade fever',
                        tests: 'Clinical diagnosis, throat swab if bacterial suspected',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Symptomatic treatment, paracetamol, plenty of fluids',
                        clinicalPearls: 'Most common cause of fever. Usually self-limiting in 5-7 days',
                        differentiatingFeatures: 'URTI symptoms, gradual onset, low-grade fever'
                    },
                    'Pneumonia': {
                        features: 'Cough, purulent sputum, dyspnea, pleuritic chest pain, crackles',
                        tests: 'CXR, blood cultures, sputum culture, FBC, CRP, urea',
                        urgency: 'Urgent',
                        timeToTreat: 'Antibiotics within 4 hours, supportive care',
                        clinicalPearls: 'CURB-65 for severity assessment. Atypical organisms in young adults',
                        differentiatingFeatures: 'Respiratory symptoms, infiltrate on CXR, elevated CRP'
                    },
                    'Urinary tract infection': {
                        features: 'Dysuria, frequency, urgency, suprapubic pain, may have loin pain',
                        tests: 'Urine dipstick, midstream urine MC&S, blood cultures if systemically unwell',
                        urgency: 'Urgent if pyelonephritis',
                        timeToTreat: 'Antibiotics (trimethoprim, nitrofurantoin), analgesia',
                        clinicalPearls: 'Nitrites more specific than leucocytes. Pyelonephritis if loin pain/systemic',
                        differentiatingFeatures: 'Urinary symptoms, positive urine dipstick'
                    },
                    'Meningitis': {
                        features: 'Headache, neck stiffness, photophobia, vomiting, petechial rash',
                        tests: 'Blood cultures, lumbar puncture, throat swab, FBC, CRP',
                        urgency: 'Emergency',
                        timeToTreat: 'Antibiotics immediately, don\'t delay for LP if meningococcal suspected',
                        clinicalPearls: 'Classic triad uncommon. Non-blanching rash suggests meningococcal',
                        differentiatingFeatures: 'Meningism, photophobia, petechial rash'
                    },
                    'Sepsis': {
                        features: 'Source of infection, hypotension, tachycardia, altered mental state, oliguria',
                        tests: 'Blood cultures, lactate, FBC, CRP, source-specific investigations',
                        urgency: 'Emergency',
                        timeToTreat: 'Antibiotics within 1 hour, fluid resuscitation, source control',
                        clinicalPearls: 'qSOFA screening tool. Lactate >2 mmol/L indicates organ dysfunction',
                        differentiatingFeatures: 'Systemic features, hypotension, elevated lactate'
                    },
                    'Malaria': {
                        features: 'Recent travel to endemic area, cyclical fever, rigors, headache, myalgia',
                        tests: 'Thick and thin blood films, rapid antigen tests, FBC',
                        urgency: 'Emergency',
                        timeToTreat: 'Antimalarial therapy based on species and resistance pattern',
                        clinicalPearls: 'P. falciparum most dangerous. Cyclical fever not always present',
                        differentiatingFeatures: 'Travel history, cyclical fever, positive blood film'
                    }
                }
            },
            'syncope': {
                title: 'Syncope',
                category: 'Cardiology/Neurology',
                redFlags: '🚩 Exertional syncope, family history sudden death, structural heart disease, prolonged recovery',
                presentations: {
                    'Vasovagal syncope': {
                        features: 'Triggers (standing, pain, emotion), prodrome (nausea, sweating), rapid recovery',
                        tests: 'Clinical diagnosis, ECG, echocardiogram if cardiac risk factors',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Avoid triggers, increase fluid/salt intake, tilt training',
                        clinicalPearls: 'Most common cause. Typical triggers and prodromal symptoms',
                        differentiatingFeatures: 'Clear triggers, prodromal symptoms, rapid recovery'
                    },
                    'Cardiac arrhythmia': {
                        features: 'Sudden onset, minimal prodrome, palpitations, may occur supine',
                        tests: 'ECG, 24-48 hour Holter monitor, echocardiogram, exercise testing',
                        urgency: 'Urgent',
                        timeToTreat: 'Treat underlying arrhythmia, pacemaker if bradycardia',
                        clinicalPearls: 'VT, complete heart block, sick sinus syndrome. May need EP studies',
                        differentiatingFeatures: 'Sudden onset, minimal warning, palpitations'
                    },
                    'Orthostatic hypotension': {
                        features: 'Symptoms on standing, medications (antihypertensives), elderly',
                        tests: 'Orthostatic vital signs, medication review, autonomic function tests',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Medication review, gradual position changes, compression stockings',
                        clinicalPearls: '>20 mmHg drop systolic or >10 mmHg diastolic. Common in elderly',
                        differentiatingFeatures: 'Positional triggers, medication history, elderly'
                    },
                    'Aortic stenosis': {
                        features: 'Exertional syncope, chest pain, dyspnea, ejection systolic murmur',
                        tests: 'Echocardiogram (valve area, gradient), ECG, CXR',
                        urgency: 'Urgent',
                        timeToTreat: 'Aortic valve replacement if severe, avoid vasodilators',
                        clinicalPearls: 'Classic triad: angina, syncope, heart failure. Poor prognosis if symptomatic',
                        differentiatingFeatures: 'Exertional symptoms, murmur, elderly'
                    },
                    'Hypertrophic cardiomyopathy': {
                        features: 'Young athlete, family history sudden death, may have murmur that increases with Valsalva',
                        tests: 'Echocardiogram, ECG, genetic testing, family screening',
                        urgency: 'Urgent',
                        timeToTreat: 'Activity restriction, beta-blockers, ICD if high risk',
                        clinicalPearls: 'Leading cause of sudden death in young athletes. Autosomal dominant',
                        differentiatingFeatures: 'Young age, family history, murmur increases with Valsalva'
                    },
                    'Seizure': {
                        features: 'Tonic-clonic movements, tongue biting, incontinence, post-ictal confusion',
                        tests: 'Glucose, EEG, MRI brain, prolactin level',
                        urgency: 'Urgent',
                        timeToTreat: 'Antiepileptic drugs if recurrent, investigate underlying cause',
                        clinicalPearls: 'Convulsive syncope can mimic seizure. True seizures have post-ictal phase',
                        differentiatingFeatures: 'Tonic-clonic movements, post-ictal confusion'
                    }
                }
            },
            'urinary-symptoms': {
                title: 'Urinary Symptoms',
                category: 'Urology/Nephrology',
                redFlags: '🚩 Acute kidney injury, anuria, haematuria with clots, severe loin pain',
                presentations: {
                    'Urinary tract infection': {
                        features: 'Dysuria, frequency, urgency, suprapubic pain, cloudy/smelly urine',
                        tests: 'Urine dipstick, midstream urine MC&S, blood cultures if systemically unwell',
                        urgency: 'Non-urgent unless complicated',
                        timeToTreat: 'Antibiotics (trimethoprim, nitrofurantoin), increase fluid intake',
                        clinicalPearls: 'Nitrites more specific than leucocytes. Treat for 3 days if uncomplicated',
                        differentiatingFeatures: 'Classic urinary symptoms, positive dipstick'
                    },
                    'Pyelonephritis': {
                        features: 'Loin pain, fever, rigors, nausea, vomiting, may have lower urinary symptoms',
                        tests: 'Urine MC&S, blood cultures, FBC, CRP, U&Es, ultrasound if recurrent',
                        urgency: 'Urgent',
                        timeToTreat: 'IV antibiotics (co-amoxiclav), analgesia, supportive care',
                        clinicalPearls: 'More common in women. May lead to sepsis. Check for structural abnormalities',
                        differentiatingFeatures: 'Loin pain, fever, systemic upset'
                    },
                    'Kidney stones': {
                        features: 'Severe colicky loin-to-groin pain, haematuria, nausea, vomiting, restlessness',
                        tests: 'CT KUB (non-contrast), urinalysis, U&Es, calcium, uric acid',
                        urgency: 'Urgent',
                        timeToTreat: 'Strong analgesia, alpha-blockers, lithotripsy/surgery if large',
                        clinicalPearls: 'Calcium oxalate most common. Uric acid stones radiolucent on plain X-ray',
                        differentiatingFeatures: 'Colicky pain, patient unable to lie still, haematuria'
                    },
                    'Acute urinary retention': {
                        features: 'Unable to pass urine, suprapubic pain, palpable bladder, elderly male',
                        tests: 'Bladder scan, U&Es, PSA (after catheterisation), urinalysis',
                        urgency: 'Emergency',
                        timeToTreat: 'Immediate catheterisation, alpha-blockers, urology referral',
                        clinicalPearls: 'BPH most common cause in men. Constipation, drugs common in women',
                        differentiatingFeatures: 'Complete inability to void, palpable bladder'
                    },
                    'Prostatitis': {
                        features: 'Perineal pain, dysuria, fever, tender prostate on PR examination',
                        tests: 'Urine MC&S, blood cultures, avoid vigorous PR examination',
                        urgency: 'Urgent',
                        timeToTreat: 'Antibiotics (ciprofloxacin for 28 days), alpha-blockers',
                        clinicalPearls: 'Avoid vigorous massage as may cause bacteraemia. Consider chronic prostatitis',
                        differentiatingFeatures: 'Perineal pain, fever, tender prostate'
                    },
                    'Interstitial cystitis': {
                        features: 'Chronic pelvic pain, frequency, urgency, negative urine cultures',
                        tests: 'Cystoscopy, urodynamics, exclude other causes',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Bladder training, amitriptyline, pentosan polysulfate',
                        clinicalPearls: 'Diagnosis of exclusion. More common in women. Pain relief with voiding',
                        differentiatingFeatures: 'Chronic symptoms, negative cultures, bladder pain'
                    }
                }
            },
            'weight-loss': {
                title: 'Unintentional Weight Loss',
                category: 'General Medicine/Oncology',
                redFlags: '🚩 >10% weight loss in 6 months, night sweats, lymphadenopathy, rectal bleeding',
                presentations: {
                    'Malignancy': {
                        features: 'Progressive weight loss, night sweats, fatigue, site-specific symptoms',
                        tests: 'FBC, LFTs, CXR, CT chest/abdomen/pelvis, tumour markers',
                        urgency: 'Urgent',
                        timeToTreat: 'Urgent 2-week-wait referral based on suspected primary',
                        clinicalPearls: 'Lung, GI, pancreatic cancers commonly present with weight loss',
                        differentiatingFeatures: 'Progressive loss, night sweats, other suspicious symptoms'
                    },
                    'Hyperthyroidism': {
                        features: 'Weight loss despite good appetite, palpitations, tremor, heat intolerance',
                        tests: 'TSH (suppressed), free T4, T3, TSH receptor antibodies',
                        urgency: 'Urgent',
                        timeToTreat: 'Antithyroid drugs (carbimazole), beta-blockers for symptoms',
                        clinicalPearls: 'Graves disease most common. May have thyroid eye disease',
                        differentiatingFeatures: 'Good appetite, thyrotoxic symptoms, suppressed TSH'
                    },
                    'Depression': {
                        features: 'Poor appetite, low mood, anhedonia, sleep disturbance, fatigue',
                        tests: 'Clinical assessment, PHQ-9 score, exclude organic causes',
                        urgency: 'Non-urgent unless suicidal',
                        timeToTreat: 'Antidepressants, psychological therapies, social support',
                        clinicalPearls: 'Common in elderly. May present as failure to thrive',
                        differentiatingFeatures: 'Mood symptoms, poor appetite, sleep disturbance'
                    },
                    'Diabetes mellitus': {
                        features: 'Polyuria, polydipsia, fatigue, recurrent infections, family history',
                        tests: 'Random glucose, HbA1c, fasting glucose, ketones if suspected DKA',
                        urgency: 'Urgent if DKA suspected',
                        timeToTreat: 'Insulin if type 1, metformin if type 2, dietary advice',
                        clinicalPearls: 'Type 1 usually young with rapid onset. Type 2 more insidious',
                        differentiatingFeatures: 'Classical triad, elevated glucose'
                    },
                    'Inflammatory bowel disease': {
                        features: 'Diarrhea, abdominal pain, rectal bleeding, extraintestinal features',
                        tests: 'Colonoscopy with biopsy, faecal calprotectin, CRP, FBC',
                        urgency: 'Urgent',
                        timeToTreat: 'Aminosalicylates, steroids for flares, immunosuppression',
                        clinicalPearls: 'Young adults commonly affected. Extraintestinal features important',
                        differentiatingFeatures: 'GI symptoms, young adult, raised inflammatory markers'
                    },
                    'COPD': {
                        features: 'Smoking history, progressive dyspnea, chronic cough, frequent infections',
                        tests: 'Spirometry, CXR, BMI calculation, alpha-1 antitrypsin',
                        urgency: 'Non-urgent unless acute exacerbation',
                        timeToTreat: 'Smoking cessation, bronchodilators, pulmonary rehabilitation',
                        clinicalPearls: 'Weight loss indicates severe disease. Nutritional support important',
                        differentiatingFeatures: 'Smoking history, respiratory symptoms, cachexia'
                    }
                }
            },
            'palpitations': {
                title: 'Palpitations',
                category: 'Cardiology',
                redFlags: '🚩 Syncope, chest pain, severe dyspnea, hemodynamic instability',
                presentations: {
                    'Anxiety/Panic attack': {
                        features: 'Rapid onset, associated anxiety, sweating, tremor, sense of doom',
                        tests: 'ECG (often normal), consider thyroid function, glucose if indicated',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Reassurance, breathing exercises, beta-blockers if needed',
                        clinicalPearls: 'Most common cause. Often in young patients. Exclude organic causes',
                        differentiatingFeatures: 'Associated anxiety, young patient, normal ECG'
                    },
                    'Atrial fibrillation': {
                        features: 'Irregular pulse, may be asymptomatic, dyspnea, chest discomfort',
                        tests: 'ECG (irregularly irregular), echocardiogram, thyroid function',
                        urgency: 'Urgent if fast rate or unstable',
                        timeToTreat: 'Rate control, anticoagulation, consider rhythm control',
                        clinicalPearls: 'Most common sustained arrhythmia. Stroke risk with CHA2DS2-VASc',
                        differentiatingFeatures: 'Irregularly irregular pulse, ECG changes'
                    },
                    'Supraventricular tachycardia': {
                        features: 'Sudden onset/offset, regular fast pulse, chest discomfort, dyspnea',
                        tests: 'ECG during episode, adenosine test, electrophysiology studies',
                        urgency: 'Urgent',
                        timeToTreat: 'Vagal manoeuvres, adenosine, DC cardioversion if unstable',
                        clinicalPearls: 'Often in young patients. Accessory pathways (WPW) may be present',
                        differentiatingFeatures: 'Sudden onset/offset, regular tachycardia'
                    },
                    'Ventricular tachycardia': {
                        features: 'Rapid regular pulse, chest pain, dyspnea, may cause hemodynamic compromise',
                        tests: 'ECG (wide complex tachycardia), echocardiogram, cardiac catheterisation',
                        urgency: 'Emergency',
                        timeToTreat: 'DC cardioversion if unstable, amiodarone, treat underlying cause',
                        clinicalPearls: 'Usually indicates structural heart disease. High risk of sudden death',
                        differentiatingFeatures: 'Wide complex tachycardia, hemodynamic compromise'
                    },
                    'Hyperthyroidism': {
                        features: 'Weight loss, heat intolerance, tremor, frequent palpitations',
                        tests: 'TSH (suppressed), free T4/T3, TSH receptor antibodies',
                        urgency: 'Urgent',
                        timeToTreat: 'Antithyroid drugs, beta-blockers for symptom control',
                        clinicalPearls: 'AF common complication. Thyroid storm is life-threatening',
                        differentiatingFeatures: 'Thyrotoxic symptoms, suppressed TSH'
                    },
                    'Caffeine/Stimulants': {
                        features: 'Temporal relationship with caffeine/drugs, anxiety, tremor',
                        tests: 'Clinical history, urine drug screen if suspicious',
                        urgency: 'Non-urgent',
                        timeToTreat: 'Reduce/eliminate stimulants, supportive care',
                        clinicalPearls: 'Energy drinks, cocaine, amphetamines. Often in young patients',
                        differentiatingFeatures: 'Clear temporal relationship, drug/caffeine history'
                    }
                }
            }
        };
        
        const container = document.getElementById('differential-dx-container');
        container.innerHTML = `
            <div class="search-container">
                <input type="text" id="ddx-search" placeholder="Search symptoms or diagnoses..." class="tool-search">
                <button id="ddx-search-btn">🔍</button>
            </div>
            <div id="ddx-search-results" class="lab-grid"></div>
            <div class="ddx-categories">
                <button class="category-btn active" onclick="window.quizApp.showDdxCategory('all'); event.stopPropagation();">All Symptoms</button>
                <button class="category-btn" onclick="window.quizApp.showDdxCategory('cardiovascular'); event.stopPropagation();">CV/Pulm</button>
                <button class="category-btn" onclick="window.quizApp.showDdxCategory('gastroenterology'); event.stopPropagation();">GI/Surgery</button>
                <button class="category-btn" onclick="window.quizApp.showDdxCategory('neurology'); event.stopPropagation();">Neurology</button>
                <button class="category-btn" onclick="window.quizApp.showDdxCategory('emergency'); event.stopPropagation();">Emergency</button>
                <button class="category-btn" onclick="window.quizApp.showDdxCategory('general'); event.stopPropagation();">General Med</button>
            </div>
            <div id="ddx-list" class="lab-grid"></div>
        `;
        
        const searchInput = document.getElementById('ddx-search');
        const searchBtn = document.getElementById('ddx-search-btn');
        searchInput.addEventListener('input', () => this.searchDdx(ddxDatabase));
        searchBtn.addEventListener('click', () => this.searchDdx(ddxDatabase));
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
        
        // Update active button state
        document.querySelectorAll('.ddx-categories .filter-btn').forEach(btn => btn.classList.remove('active'));
        const targetButton = Array.from(document.querySelectorAll('.ddx-categories .filter-btn')).find(btn => 
            btn.textContent.toLowerCase().includes(category.toLowerCase()) ||
            (category === 'all' && btn.textContent === 'All')
        );
        if (targetButton) targetButton.classList.add('active');
        
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
            <button class="lab-value-btn" onclick="console.log('🔍 Diagnosis clicked:', '${dx}'); window.quizApp.showDiagnosisDetail('${symptomKey}', '${dx}'); event.stopPropagation();">
                <div class="lab-name">${dx}</div>
                <div class="lab-count">${data.urgency}</div>
            </button>
        `).join('');
        
        container.innerHTML = `
            <button class="back-btn" onclick="window.quizApp.loadDifferentialDx(); event.stopPropagation();">← Back to Symptoms</button>
            <div class="ddx-detail">
                <h3>🔍 ${symptom.title}</h3>
                <p class="ddx-category">📋 ${symptom.category}</p>
                ${symptom.redFlags ? `
                <div class="red-flags-banner">
                    <h4>🚨 RED FLAGS</h4>
                    <p>${symptom.redFlags}</p>
                </div>` : ''}
                <h4>📋 Differential Diagnoses:</h4>
                <div class="lab-grid">
                    ${presentationsHtml}
                </div>
            </div>
        `;
    }
    
    showDiagnosisDetail(symptomKey, dxKey) {
        const diagnosis = this.ddxDatabase[symptomKey].presentations[dxKey];
        const container = document.getElementById('differential-dx-container');
        
        container.innerHTML = `
            <button class="back-btn" onclick="window.quizApp.showDdxDetail('${symptomKey}'); event.stopPropagation();">← Back to ${this.ddxDatabase[symptomKey].title}</button>
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
        
        // Clean up calculator events when switching away from calculators
        const currentActiveTool = document.querySelector('.tool-nav-btn.active')?.getAttribute('data-tool');
        if (currentActiveTool === 'calculators' && toolType !== 'calculators' && toolType !== 'calculator-detail') {
            this.cleanupCalculatorEvents();
        }
        
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
            'calculator-detail': 'calculator-detail',
            'lab-values': 'lab-panel',
            'guidelines': 'guidelines-panel',
            'differential-dx': 'differential-panel',
            'triads': 'triads-panel',
            'examination': 'examination-panel',
            'emergency-protocols': 'emergency-protocols-panel',
            'interpretation': 'interpretation-panel'
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
                // Re-initialize calculator event handlers when switching to calculators
                this.initializeCalculators();
                console.log('🧮 Calculators panel activated');
                break;
            case 'calculator-detail':
                // Individual calculator panel - content loaded by loadCalculator
                console.log('🧮 Calculator detail panel activated');
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
            case 'examination':
                this.loadExaminationGuide();
                break;
            case 'emergency-protocols':
                this.loadEmergencyProtocols();
                break;
            case 'interpretation':
                this.loadInterpretationTools();
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
    // Setup mobile back button override
    window.quizApp.setupMobileBackButton();
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

// Clinical Examination Guide Functions
MLAQuizApp.prototype.loadExaminationGuide = function() {
    console.log('🩺 Loading examination guide...');
    const examinationContainer = document.getElementById('examination-container');
    if (!examinationContainer) {
        console.error('❌ Examination container not found!');
        return;
    }
    console.log('✅ Examination container found, setting up database...');
    
    const examinationDatabase = {
        'cardiovascular': {
            title: 'Cardiovascular Examination',
            category: 'systemic',
            approach: 'General inspection → Hands → Pulse → Blood pressure → Face → Neck → Precordium → Back',
            sections: {
                'general-inspection': {
                    name: 'General Inspection',
                    technique: 'Observe patient from end of bed before approaching',
                    normal: 'Comfortable at rest, appropriate dress, no distress, normal colour',
                    abnormal: {
                        'Cyanosis': 'Central (tongue/lips): respiratory/cardiac causes. Peripheral (fingers/toes): poor circulation',
                        'Dyspnea': 'Breathlessness at rest or minimal exertion suggests heart failure',
                        'Cachexia': 'Muscle wasting in advanced heart failure (cardiac cachexia)',
                        'Pallor': 'May indicate anemia contributing to heart failure',
                        'Oedema': 'Bilateral ankle swelling, sacral edema if bed-bound'
                    },
                    clinicalPearls: 'Always introduce yourself and gain consent. Observe before touching'
                },
                'hands': {
                    name: 'Hand Examination',
                    technique: 'Inspect both hands, palpate radial pulse, assess capillary refill',
                    normal: 'Warm hands, pink nail beds, CRT <2 seconds, regular pulse',
                    abnormal: {
                        'Clubbing': 'Loss of angle between nail and nail bed. Causes: IE, congenital heart disease, lung disease',
                        'Splinter hemorrhages': 'Linear hemorrhages under nails - may indicate infective endocarditis',
                        'Janeway lesions': 'Painless palmar/plantar macules in infective endocarditis',
                        'Osler nodes': 'Painful pulp infarcts in fingers/toes - infective endocarditis',
                        'Cool peripheries': 'Poor perfusion, heart failure, shock',
                        'Prolonged CRT': '>2 seconds indicates poor perfusion'
                    },
                    clinicalPearls: 'Clubbing takes months to develop. Check both hands for symmetry'
                },
                'pulse': {
                    name: 'Pulse Assessment',
                    technique: 'Radial pulse rate, rhythm, character. Check for radio-radial delay',
                    normal: '60-100 bpm, regular rhythm, normal volume and character',
                    abnormal: {
                        'Tachycardia': '>100 bpm - fever, anxiety, hyperthyroidism, heart failure, arrhythmia',
                        'Bradycardia': '<60 bpm - athletes, medications (beta-blockers), heart block',
                        'Irregular rhythm': 'AF (irregularly irregular), ectopics, heart block',
                        'Weak pulse': 'Low volume - heart failure, shock, aortic stenosis',
                        'Bounding pulse': 'High volume - aortic regurgitation, hyperthyroidism, fever',
                        'Radio-radial delay': 'Coarctation of aorta, aortic dissection'
                    },
                    clinicalPearls: 'Palpate for 15 seconds minimum, 60 seconds if irregular. Check both radials simultaneously'
                },
                'blood-pressure': {
                    name: 'Blood Pressure',
                    technique: 'Appropriate cuff size, patient relaxed, arm at heart level',
                    normal: '<140/90 mmHg (or <130/80 mmHg in diabetes/CKD)',
                    abnormal: {
                        'Hypertension': 'Stage 1: 140-159/90-99, Stage 2: 160-179/100-109, Stage 3: ≥180/110',
                        'Hypotension': '<90 mmHg systolic - shock, medications, postural hypotension',
                        'Wide pulse pressure': '>60 mmHg - aortic regurgitation, hyperthyroidism',
                        'Narrow pulse pressure': '<30 mmHg - aortic stenosis, cardiac tamponade',
                        'Postural drop': '>20 mmHg fall on standing - dehydration, medications'
                    },
                    clinicalPearls: 'Repeat if abnormal. Check both arms if suspicious of coarctation/dissection'
                },
                'jvp': {
                    name: 'Jugular Venous Pressure',
                    technique: 'Patient at 45°, look for internal jugular pulsation, measure height above sternal angle',
                    normal: '<3 cm above sternal angle, normal waveform',
                    abnormal: {
                        'Elevated JVP': '>3 cm - right heart failure, fluid overload, tricuspid disease',
                        'Giant V waves': 'Tricuspid regurgitation - systolic waves in jugular vein',
                        'Cannon waves': 'Complete heart block - atria contract against closed tricuspid valve',
                        'Hepatojugular reflux': 'Rise in JVP with abdominal pressure - right heart failure',
                        'Absent pulsation': 'SVC obstruction - non-pulsatile, fixed elevation'
                    },
                    clinicalPearls: 'Distinguish from carotid pulsation - JVP has double waveform, varies with respiration'
                },
                'precordium': {
                    name: 'Precordial Examination',
                    technique: 'Inspect, palpate (apex, heaves, thrills), percuss cardiac borders, auscultate',
                    normal: 'No visible pulsations, apex beat 5th intercostal space mid-clavicular line',
                    abnormal: {
                        'Displaced apex': 'Lateral displacement - left ventricular enlargement',
                        'Heaves': 'Right ventricular heave (left sternal border) - pulmonary hypertension, RV enlargement',
                        'Thrills': 'Palpable murmurs - significant valvular disease (grade 4+ murmurs)',
                        'Systolic murmur': 'Aortic stenosis, mitral regurgitation, tricuspid regurgitation',
                        'Diastolic murmur': 'Always pathological - aortic regurgitation, mitral stenosis',
                        'Gallop rhythm': 'S3 (heart failure), S4 (stiff ventricle)'
                    },
                    clinicalPearls: 'Listen in all areas: aortic, pulmonary, tricuspid, mitral. Listen with diaphragm and bell'
                }
            }
        },
        'respiratory': {
            title: 'Respiratory Examination',
            category: 'systemic',
            approach: 'General inspection → Hands → Face → Neck → Chest inspection → Palpation → Percussion → Auscultation',
            sections: {
                'general-inspection': {
                    name: 'General Inspection',
                    technique: 'Observe breathing pattern, use of accessory muscles, positioning',
                    normal: 'Quiet breathing, 12-20 breaths/min, no accessory muscle use',
                    abnormal: {
                        'Tachypnea': '>20 breaths/min - pneumonia, asthma, anxiety, metabolic acidosis',
                        'Bradypnea': '<12 breaths/min - opioids, raised ICP, hypothyroidism',
                        'Accessory muscles': 'SCM, intercostals - respiratory distress',
                        'Tripod position': 'Leaning forward with arms supported - severe respiratory distress',
                        'Pursed lip breathing': 'COPD - creates back-pressure to prevent airway collapse'
                    },
                    clinicalPearls: 'Count respiratory rate when patient unaware. Look for pattern and effort'
                },
                'hands': {
                    name: 'Hand Examination',
                    technique: 'Inspect for clubbing, cyanosis, nicotine staining, assess asterixis',
                    normal: 'Pink nail beds, no clubbing, warm hands',
                    abnormal: {
                        'Clubbing': 'Lung cancer, bronchiectasis, lung abscess, IPF (not COPD/asthma)',
                        'Cyanosis': 'Central cyanosis indicates hypoxemia, peripheral indicates poor circulation',
                        'Nicotine staining': 'Yellow fingers - smoking history',
                        'Asterixis': 'CO2 retention - ask patient to hold hands up, look for flapping tremor',
                        'Wasting': 'Small muscle wasting in hands - lung cancer cachexia'
                    },
                    clinicalPearls: 'Clubbing rare in COPD unless complications. Asterixis also seen in liver failure'
                },
                'face-neck': {
                    name: 'Face and Neck',
                    technique: 'Inspect lips, eyes, lymph nodes, tracheal position',
                    normal: 'Pink lips, clear conjunctiva, central trachea, no lymphadenopathy',
                    abnormal: {
                        'Central cyanosis': 'Blue lips/tongue - hypoxemia (<85% saturation)',
                        'Pallor': 'Anemia - may contribute to dyspnea',
                        'Horner syndrome': 'Ptosis, miosis, anhidrosis - Pancoast tumor',
                        'Lymphadenopathy': 'Supraclavicular nodes - lung cancer metastases',
                        'Tracheal deviation': 'Away from tension pneumothorax, towards collapse/fibrosis'
                    },
                    clinicalPearls: 'Central cyanosis only visible when Hb <5g/dL is desaturated'
                },
                'chest-inspection': {
                    name: 'Chest Inspection',
                    technique: 'Observe shape, symmetry, movement, scars',
                    normal: 'Symmetrical expansion, no deformity, 1:2 AP to lateral ratio',
                    abnormal: {
                        'Barrel chest': 'Increased AP diameter - COPD with hyperinflation',
                        'Pectus carinatum': 'Pigeon chest - congenital, may restrict lung function',
                        'Pectus excavatum': 'Funnel chest - usually cosmetic only',
                        'Kyphoscoliosis': 'Spinal deformity - restrictive lung disease',
                        'Asymmetrical expansion': 'Pneumothorax, pleural effusion, consolidation'
                    },
                    clinicalPearls: 'Look for surgical scars (thoracotomy, lobectomy). Note chest wall movement'
                },
                'palpation': {
                    name: 'Palpation',
                    technique: 'Chest expansion, tactile vocal fremitus, apex beat',
                    normal: 'Symmetrical expansion >5cm, equal tactile fremitus',
                    abnormal: {
                        'Reduced expansion': 'Pain (pleurisy), pleural effusion, pneumothorax',
                        'Increased tactile fremitus': 'Consolidation - solid tissue transmits vibrations better',
                        'Reduced tactile fremitus': 'Pleural effusion, pneumothorax - fluid/air dampens vibrations',
                        'Pleural friction rub': 'Grating sensation - inflamed pleura rubbing together',
                        'Subcutaneous emphysema': 'Crackling under skin - pneumothorax with air leak'
                    },
                    clinicalPearls: 'Use "99" or "boy oh boy" for vocal fremitus. Compare symmetrical areas'
                },
                'percussion': {
                    name: 'Percussion',
                    technique: 'Percuss systematically comparing both sides, note resonance',
                    normal: 'Resonant throughout lung fields',
                    abnormal: {
                        'Dull percussion': 'Consolidation, pleural effusion - fluid/solid tissue',
                        'Stony dull': 'Large pleural effusion - completely dull note',
                        'Hyperresonant': 'Pneumothorax, emphysema - increased air content',
                        'Reduced percussion': 'Partial consolidation, small effusion',
                        'Shifting dullness': 'Free pleural fluid - changes with position'
                    },
                    clinicalPearls: 'Percuss from resonant to dull areas. Note upper level of effusions'
                },
                'auscultation': {
                    name: 'Auscultation',
                    technique: 'Systematic listening with diaphragm, compare both sides',
                    normal: 'Vesicular breath sounds, no added sounds',
                    abnormal: {
                        'Wheeze': 'Expiratory - asthma, COPD. Inspiratory stridor - upper airway obstruction',
                        'Crackles': 'Fine (pulmonary edema, fibrosis), coarse (pneumonia, bronchiectasis)',
                        'Pleural friction rub': 'Grating sound - pleural inflammation',
                        'Bronchial breathing': 'High-pitched, equal inspiration/expiration - consolidation',
                        'Reduced air entry': 'Pleural effusion, pneumothorax, severe consolidation',
                        'Absent breath sounds': 'Complete obstruction, massive effusion, pneumothorax'
                    },
                    clinicalPearls: 'Listen during full inspiration and expiration. Ask patient to breathe deeply through mouth'
                }
            }
        },
        'abdominal': {
            title: 'Abdominal Examination',
            category: 'systemic',
            approach: 'Look → Feel → Percuss → Listen (different order from other systems)',
            sections: {
                'inspection': {
                    name: 'Inspection',
                    technique: 'Patient supine, fully exposed abdomen, observe from different angles',
                    normal: 'Flat or gently rounded, no visible masses, symmetrical',
                    abnormal: {
                        'Distension': 'Generalized - ascites, obstruction, pregnancy. Localized - masses, organomegaly',
                        'Scars': 'Previous surgery - note location and implications',
                        'Striae': 'Stretch marks - pregnancy, weight gain, Cushing syndrome',
                        'Caput medusae': 'Dilated umbilical veins - portal hypertension',
                        'Visible peristalsis': 'Bowel obstruction - waves of contraction',
                        'Hernias': 'Inguinal, umbilical, incisional - may be more visible when coughing'
                    },
                    clinicalPearls: 'Look from foot of bed and from side. Ask patient to cough to reveal hernias'
                },
                'palpation-light': {
                    name: 'Light Palpation',
                    technique: 'Start away from pain, use flat of hand, superficial pressure',
                    normal: 'Soft, non-tender, no masses',
                    abnormal: {
                        'Tenderness': 'Localized - inflammation, infection. Generalized - peritonitis',
                        'Guarding': 'Voluntary muscle tension due to pain',
                        'Rigidity': 'Involuntary muscle spasm - peritoneal irritation',
                        'Masses': 'Note size, consistency, mobility, pulsatility',
                        'Hepatomegaly': 'Liver edge palpable below costal margin',
                        'Splenomegaly': 'Spleen tip palpable (enlarges towards RIF)'
                    },
                    clinicalPearls: 'Watch patient\'s face for signs of discomfort. Start gently'
                },
                'palpation-deep': {
                    name: 'Deep Palpation',
                    technique: 'Deeper pressure to feel for masses and organomegaly',
                    normal: 'No masses, organs not palpable (except sometimes liver edge)',
                    abnormal: {
                        'Hepatomegaly': 'Smooth edge (fatty liver), irregular (cirrhosis, metastases)',
                        'Splenomegaly': 'Moves with respiration, cannot get above it',
                        'Kidney masses': 'Ballotable, bimanual palpation in flanks',
                        'Aortic aneurysm': 'Pulsatile mass above umbilicus, expansile pulsation',
                        'Bladder': 'Suprapubic mass if full - dull to percussion',
                        'Rebound tenderness': 'Pain worse on releasing pressure - peritoneal irritation'
                    },
                    clinicalPearls: 'Feel for liver and spleen during inspiration. Use bimanual palpation for kidneys'
                },
                'percussion': {
                    name: 'Percussion',
                    technique: 'Percuss liver span, spleen, kidneys, bladder, test for ascites',
                    normal: 'Liver span 12-15cm, spleen not percussible, no shifting dullness',
                    abnormal: {
                        'Hepatomegaly': 'Increased liver span >15cm',
                        'Splenomegaly': 'Dullness in left hypochondrium',
                        'Ascites': 'Shifting dullness, fluid thrill (if large volume)',
                        'Bladder distension': 'Suprapubic dullness - urinary retention',
                        'Kidney enlargement': 'Flank dullness - polycystic kidneys, hydronephrosis'
                    },
                    clinicalPearls: 'Normal liver dullness from 5th intercostal space to costal margin'
                },
                'auscultation': {
                    name: 'Auscultation',
                    technique: 'Listen for bowel sounds, bruits, listen for 2 minutes if absent',
                    normal: 'Bowel sounds every 5-10 seconds, no bruits',
                    abnormal: {
                        'Absent bowel sounds': 'Paralytic ileus, peritonitis (listen for 2 minutes)',
                        'Hyperactive sounds': 'Bowel obstruction - high-pitched, frequent',
                        'Aortic bruit': 'Abdominal aortic aneurysm, atherosclerosis',
                        'Renal bruits': 'Renal artery stenosis - listen in flanks',
                        'Hepatic bruits': 'Hepatocellular carcinoma, alcoholic hepatitis',
                        'Venous hum': 'Portal hypertension - continuous sound at umbilicus'
                    },
                    clinicalPearls: 'Auscultate before deep palpation to avoid altering bowel sounds'
                }
            }
        },
        'neurological': {
            title: 'Neurological Examination',
            category: 'systemic',
            approach: 'Mental state → Cranial nerves → Motor → Sensory → Reflexes → Coordination → Gait',
            sections: {
                'mental-state': {
                    name: 'Mental State',
                    technique: 'Assess consciousness level, orientation, memory, attention',
                    normal: 'Alert, oriented to time/place/person, normal cognition',
                    abnormal: {
                        'Reduced GCS': '<15 - see GCS calculator for detailed assessment',
                        'Confusion': 'Disorientation, impaired attention - delirium, dementia',
                        'Memory loss': 'Short-term (recent events), long-term (remote events)',
                        'Dysphasia': 'Expressive (Broca), receptive (Wernicke), mixed',
                        'Neglect': 'Inattention to one side - usually right brain lesions',
                        'Apraxia': 'Cannot perform learned movements despite intact motor function'
                    },
                    clinicalPearls: 'Use MMSE or MoCA for detailed cognitive assessment. Note speech pattern'
                },
                'cranial-nerves': {
                    name: 'Cranial Nerves',
                    technique: 'Systematic assessment CN I-XII',
                    normal: 'All cranial nerves intact and functioning normally',
                    abnormal: {
                        'CN II (Optic)': 'Visual field defects, papilledema, optic atrophy',
                        'CN III (Oculomotor)': 'Ptosis, dilated pupil, eye movement problems',
                        'CN VII (Facial)': 'Facial weakness - upper motor neuron spares forehead',
                        'CN VIII (Acoustic)': 'Hearing loss, vertigo, tinnitus',
                        'CN IX/X': 'Dysphagia, dysphonia, absent gag reflex',
                        'CN XII (Hypoglossal)': 'Tongue deviation towards lesion side'
                    },
                    clinicalPearls: 'UMN facial weakness spares forehead, LMN affects all facial muscles'
                },
                'motor': {
                    name: 'Motor Examination',
                    technique: 'Inspect, tone, power (MRC scale), reflexes',
                    normal: 'Normal muscle bulk, normal tone, power 5/5, reflexes 2+',
                    abnormal: {
                        'Muscle wasting': 'LMN lesions, disuse atrophy, myopathy',
                        'Fasciculations': 'Visible muscle twitching - motor neuron disease',
                        'Increased tone': 'Spasticity (UMN), rigidity (Parkinson), clonus',
                        'Reduced tone': 'LMN lesions, cerebellar lesions, acute stroke',
                        'Weakness patterns': 'Pyramidal (extensors>flexors upper limb), proximal (myopathy)',
                        'Hyperreflexia': 'UMN lesions - brisk reflexes, upgoing plantars'
                    },
                    clinicalPearls: 'MRC scale: 0=no movement, 1=flicker, 2=movement without gravity, 3=against gravity, 4=against resistance, 5=normal'
                },
                'sensory': {
                    name: 'Sensory Examination',
                    technique: 'Test light touch, pain, vibration, proprioception',
                    normal: 'Intact sensation to all modalities',
                    abnormal: {
                        'Glove/stocking': 'Peripheral neuropathy - diabetes, alcohol, B12 deficiency',
                        'Dermatomal loss': 'Nerve root lesions - corresponds to specific dermatomes',
                        'Hemianesthesia': 'Stroke, thalamic lesions - one whole side affected',
                        'Suspended sensory loss': 'Syringomyelia - "cape" distribution',
                        'Vibration loss': 'Posterior column disease - B12, tabes dorsalis',
                        'Dissociated loss': 'Loss of pain/temperature with preserved touch'
                    },
                    clinicalPearls: 'Test from abnormal to normal areas. Use cotton wool and neurological pin'
                },
                'coordination': {
                    name: 'Coordination',
                    technique: 'Finger-nose test, heel-shin test, rapid alternating movements',
                    normal: 'Smooth, accurate movements, no tremor',
                    abnormal: {
                        'Intention tremor': 'Worse on movement - cerebellar lesions',
                        'Dysmetria': 'Past-pointing - cerebellar dysfunction',
                        'Dysdiadochokinesis': 'Impaired rapid alternating movements - cerebellum',
                        'Ataxia': 'Unsteady, uncoordinated movements',
                        'Resting tremor': 'Present at rest - Parkinson\'s disease',
                        'Action tremor': 'Essential tremor, anxiety, hyperthyroidism'
                    },
                    clinicalPearls: 'Cerebellar signs: DANISH - Dysdiadochokinesis, Ataxia, Nystagmus, Intention tremor, Speech, Hypotonia'
                },
                'gait': {
                    name: 'Gait Assessment',
                    technique: 'Observe normal walking, heel-toe walking, Romberg test',
                    normal: 'Steady, coordinated gait, negative Romberg',
                    abnormal: {
                        'Hemiplegic gait': 'Leg swings in arc - stroke, circumduction',
                        'Parkinsonian gait': 'Shuffling, reduced arm swing, festination',
                        'Ataxic gait': 'Wide-based, unsteady - cerebellar or sensory ataxia',
                        'High-stepping': 'Foot drop - common peroneal nerve palsy',
                        'Trendelenburg': 'Hip drops on weight-bearing - superior gluteal nerve',
                        'Positive Romberg': 'Falls when eyes closed - sensory ataxia'
                    },
                    clinicalPearls: 'Romberg tests proprioception - positive if worse with eyes closed'
                }
            }
        },
        'mental-state': {
            title: 'Mental State Examination',
            category: 'psychiatric',
            approach: 'Appearance → Behaviour → Speech → Mood → Thought → Perception → Cognition → Insight',
            sections: {
                'appearance': {
                    name: 'Appearance and Behaviour',
                    technique: 'Observe dress, hygiene, posture, facial expression, eye contact',
                    normal: 'Appropriately dressed, good hygiene, normal posture, appropriate eye contact',
                    abnormal: {
                        'Self-neglect': 'Poor hygiene, inappropriate dress - depression, dementia, schizophrenia',
                        'Agitation': 'Restlessness, pacing, fidgeting - anxiety, mania, drug withdrawal',
                        'Psychomotor retardation': 'Slowed movements, reduced facial expression - depression',
                        'Bizarre behaviour': 'Inappropriate actions - psychosis, dementia',
                        'Poor eye contact': 'Depression, autism, social anxiety, cultural factors'
                    },
                    clinicalPearls: 'Note cultural considerations. Observe throughout interview'
                },
                'speech': {
                    name: 'Speech Assessment',
                    technique: 'Assess rate, volume, tone, fluency, content',
                    normal: 'Normal rate, appropriate volume, coherent content',
                    abnormal: {
                        'Pressure of speech': 'Rapid, difficult to interrupt - mania, hyperthyroidism',
                        'Poverty of speech': 'Reduced amount - depression, schizophrenia',
                        'Flight of ideas': 'Rapid topic changes with logical connections - mania',
                        'Circumstantial speech': 'Excessive unnecessary detail but reaches point - anxiety',
                        'Word salad': 'Incoherent jumble of words - severe thought disorder'
                    },
                    clinicalPearls: 'Note both form (how they speak) and content (what they say)'
                },
                'mood-affect': {
                    name: 'Mood and Affect',
                    technique: 'Ask about mood, observe affect, assess congruence',
                    normal: 'Euthymic mood, appropriate affect, mood-affect congruent',
                    abnormal: {
                        'Depression': 'Low mood, reduced interest, anhedonia, hopelessness',
                        'Mania/Hypomania': 'Elevated mood, increased energy, decreased need for sleep',
                        'Anxiety': 'Worry, tension, fear, physical symptoms',
                        'Labile affect': 'Rapid mood changes - bipolar disorder, brain injury',
                        'Flat affect': 'Reduced emotional expression - schizophrenia, depression'
                    },
                    clinicalPearls: 'Mood = sustained emotional state. Affect = observed emotional expression'
                },
                'thought': {
                    name: 'Thought Assessment',
                    technique: 'Assess thought form, content, and possession',
                    normal: 'Logical, goal-directed thinking, no abnormal content',
                    abnormal: {
                        'Delusions': 'Fixed false beliefs - persecutory, grandiose, somatic',
                        'Thought broadcasting': 'Belief thoughts can be heard by others',
                        'Thought insertion': 'Belief thoughts put into mind by external force',
                        'Obsessions': 'Intrusive, unwanted thoughts - OCD',
                        'Suicidal ideation': 'Thoughts of self-harm - assess risk factors'
                    },
                    clinicalPearls: 'Always assess suicide risk. Distinguish overvalued ideas from delusions'
                },
                'perception': {
                    name: 'Perceptual Abnormalities',
                    technique: 'Ask about hallucinations, illusions, other perceptual disturbances',
                    normal: 'No hallucinations or perceptual disturbances',
                    abnormal: {
                        'Auditory hallucinations': 'Hearing voices - schizophrenia, severe depression',
                        'Visual hallucinations': 'Seeing things - delirium, dementia, substance use',
                        'Command hallucinations': 'Voices giving orders - high risk, requires urgent assessment',
                        'Illusions': 'Misperception of real stimuli - delirium, anxiety',
                        'Depersonalization': 'Feeling detached from self - anxiety, depression'
                    },
                    clinicalPearls: 'Command hallucinations require immediate risk assessment'
                },
                'cognition': {
                    name: 'Cognitive Assessment',
                    technique: 'Test orientation, attention, memory, executive function',
                    normal: 'Oriented x3, intact attention and memory',
                    abnormal: {
                        'Disorientation': 'Time first, then place, then person - delirium, dementia',
                        'Poor concentration': 'Cannot sustain attention - depression, anxiety, ADHD',
                        'Memory impairment': 'Short-term vs long-term - dementia, depression',
                        'Confabulation': 'False memories to fill gaps - Korsakoff syndrome',
                        'Poor insight': 'Lack awareness of illness - psychosis, dementia'
                    },
                    clinicalPearls: 'Use MMSE or MoCA for detailed assessment. Note pattern of deficits'
                }
            }
        },
        'thyroid': {
            title: 'Thyroid Examination',
            category: 'endocrine',
            approach: 'General inspection → Neck inspection → Palpation → Auscultation → Functional assessment',
            sections: {
                'inspection': {
                    name: 'Inspection',
                    technique: 'Observe neck from front, look for swelling, scars, ask patient to swallow',
                    normal: 'No visible swelling, symmetrical neck, moves with swallowing',
                    abnormal: {
                        'Goitre': 'Visible thyroid enlargement, moves with swallowing',
                        'Thyroidectomy scar': 'Horizontal scar in lower neck - previous surgery',
                        'Asymmetry': 'One-sided swelling - nodule, carcinoma',
                        'Retrosternal extension': 'Goitre extending behind sternum',
                        'Skin changes': 'Pretibial myxoedema in Graves disease'
                    },
                    clinicalPearls: 'Thyroid moves with swallowing unlike lymph nodes'
                },
                'palpation': {
                    name: 'Palpation',
                    technique: 'Palpate from behind, locate isthmus and lobes, assess size, consistency, nodules',
                    normal: 'Barely palpable, soft, smooth, mobile',
                    abnormal: {
                        'Smooth enlargement': 'Graves disease, simple goitre, thyroiditis',
                        'Multinodular goitre': 'Multiple nodules, irregular surface',
                        'Single nodule': 'Solitary thyroid nodule - may be malignant',
                        'Hard, fixed mass': 'Suspicious for carcinoma',
                        'Tender thyroid': 'Thyroiditis (de Quervain, Hashimoto)'
                    },
                    clinicalPearls: 'Palpate during swallowing. Note consistency and mobility'
                },
                'lymph-nodes': {
                    name: 'Lymph Node Assessment',
                    technique: 'Palpate cervical, supraclavicular, and infraclavicular nodes',
                    normal: 'No palpable lymphadenopathy',
                    abnormal: {
                        'Cervical lymphadenopathy': 'Thyroid carcinoma metastases',
                        'Hard, fixed nodes': 'Malignant involvement',
                        'Multiple enlarged nodes': 'Systemic disease, infection',
                        'Supraclavicular nodes': 'Advanced malignancy',
                        'Tender nodes': 'Infection, inflammation'
                    },
                    clinicalPearls: 'Always examine lymph nodes in thyroid examination'
                },
                'functional-signs': {
                    name: 'Functional Assessment',
                    technique: 'Look for signs of hyper/hypothyroidism',
                    normal: 'No signs of thyroid dysfunction',
                    abnormal: {
                        'Hyperthyroid signs': 'Tremor, sweating, tachycardia, lid lag, exophthalmos',
                        'Hypothyroid signs': 'Bradycardia, dry skin, slow reflexes, hoarse voice',
                        'Graves ophthalmopathy': 'Lid retraction, proptosis, diplopia',
                        'Thyroid acropachy': 'Finger clubbing in severe Graves disease',
                        'Pretibial myxoedema': 'Thickened skin over shins in Graves'
                    },
                    clinicalPearls: 'Check pulse, reflexes, eyes. Lid lag = upper lid lags behind eyeball'
                }
            }
        },
        'lymph-nodes': {
            title: 'Lymph Node Examination',
            category: 'general',
            approach: 'Systematic examination of all lymph node groups → Assess characteristics → Look for primary source',
            sections: {
                'head-neck': {
                    name: 'Head and Neck Nodes',
                    technique: 'Palpate preauricular, postauricular, occipital, tonsillar, submandibular, submental, cervical chain',
                    normal: 'No palpable nodes or small (<1cm), soft, mobile nodes',
                    abnormal: {
                        'Cervical lymphadenopathy': 'URTI, EBV, CMV, toxoplasmosis, malignancy',
                        'Virchow node': 'Left supraclavicular node - abdominal malignancy',
                        'Tonsillar nodes': 'Throat infections, oral cavity malignancy',
                        'Submandibular nodes': 'Dental infections, oral cavity pathology',
                        'Postauricular nodes': 'Scalp infections, rubella'
                    },
                    clinicalPearls: 'Examine from behind patient. Note size, consistency, mobility'
                },
                'axillary': {
                    name: 'Axillary Nodes',
                    technique: 'Support patient arm, palpate central, anterior, posterior, infraclavicular, supraclavicular groups',
                    normal: 'No palpable axillary lymphadenopathy',
                    abnormal: {
                        'Axillary lymphadenopathy': 'Breast carcinoma, lymphoma, arm/hand infections',
                        'Fixed nodes': 'Malignant involvement, local invasion',
                        'Matted nodes': 'Multiple nodes stuck together - infection, malignancy',
                        'Supraclavicular nodes': 'Lung carcinoma, breast carcinoma metastases',
                        'Infraclavicular nodes': 'Breast carcinoma, lung pathology'
                    },
                    clinicalPearls: 'Examine with patient seated, arm relaxed and supported'
                },
                'inguinal': {
                    name: 'Inguinal Nodes',
                    technique: 'Palpate horizontal and vertical groups, examine external genitalia',
                    normal: 'Small, soft, mobile inguinal nodes may be normal',
                    abnormal: {
                        'Inguinal lymphadenopathy': 'STIs, genital infections, lower limb cellulitis',
                        'Unilateral enlargement': 'Local pathology, malignancy',
                        'Bilateral enlargement': 'Systemic disease, sexually transmitted infections',
                        'Hard, fixed nodes': 'Metastatic disease from pelvic organs',
                        'Tender nodes': 'Active infection, inflammation'
                    },
                    clinicalPearls: 'Small inguinal nodes often normal. Examine genitalia and lower limbs'
                },
                'generalized': {
                    name: 'Generalized Assessment',
                    technique: 'Examine all node groups, assess hepatosplenomegaly',
                    normal: 'No generalized lymphadenopathy',
                    abnormal: {
                        'Generalized lymphadenopathy': 'Lymphoma, leukaemia, viral infections, autoimmune',
                        'B symptoms': 'Fever, night sweats, weight loss - malignancy',
                        'Hepatosplenomegaly': 'Lymphoma, leukaemia, chronic infections',
                        'Waldeyer ring': 'Tonsillar involvement in lymphoma',
                        'Mediastinal nodes': 'Lymphoma, lung carcinoma (CXR required)'
                    },
                    clinicalPearls: 'Note pattern: localized vs generalized. Always examine liver and spleen'
                }
            }
        },
        'skin': {
            title: 'Skin Examination',
            category: 'dermatology',
            approach: 'General inspection → Systematic examination → Dermoscopy → Documentation',
            sections: {
                'inspection': {
                    name: 'General Inspection',
                    technique: 'Good lighting, expose skin systematically, note distribution pattern',
                    normal: 'Normal skin colour, texture, temperature, no lesions',
                    abnormal: {
                        'Pallor': 'Anaemia, shock, vasospasm',
                        'Cyanosis': 'Central (cardiorespiratory), peripheral (cold, poor circulation)',
                        'Jaundice': 'Hepatic dysfunction, haemolysis, obstruction',
                        'Erythema': 'Inflammation, infection, drug reactions',
                        'Pigmentation changes': 'Vitiligo, melasma, post-inflammatory hyperpigmentation'
                    },
                    clinicalPearls: 'Use natural light when possible. Note symmetry and distribution'
                },
                'lesion-morphology': {
                    name: 'Lesion Morphology',
                    technique: 'Describe size, shape, colour, surface, borders, distribution',
                    normal: 'Normal skin without pathological lesions',
                    abnormal: {
                        'Macule': 'Flat, <1cm - freckles, café-au-lait spots',
                        'Papule': 'Raised, <1cm - seborrhoeic keratosis, naevi',
                        'Nodule': 'Raised, >1cm - basal cell carcinoma, melanoma',
                        'Vesicle': 'Fluid-filled, <1cm - herpes simplex, eczema',
                        'Ulcer': 'Loss of epidermis - venous, arterial, neuropathic'
                    },
                    clinicalPearls: 'Use dermoscopy for pigmented lesions. Photograph for monitoring'
                },
                'suspicious-lesions': {
                    name: 'Suspicious Lesions',
                    technique: 'ABCDE assessment for melanoma, check for red flag features',
                    normal: 'Benign-appearing lesions with regular features',
                    abnormal: {
                        'Melanoma (ABCDE)': 'Asymmetry, Border irregularity, Colour variation, Diameter >6mm, Evolving',
                        'Basal cell carcinoma': 'Pearly, rolled edge, central ulceration, telangiectasia',
                        'Squamous cell carcinoma': 'Scaly, hyperkeratotic, may ulcerate',
                        'Actinic keratosis': 'Rough, scaly patches on sun-exposed areas',
                        'Changing mole': 'Recent change in size, shape, colour, symptoms'
                    },
                    clinicalPearls: 'Ugly duckling sign - lesion different from others. 2-week rule for suspicious lesions'
                },
                'common-conditions': {
                    name: 'Common Skin Conditions',
                    technique: 'Recognize pattern and distribution of common dermatoses',
                    normal: 'Healthy skin without inflammatory or infectious conditions',
                    abnormal: {
                        'Eczema': 'Dry, itchy, flexural distribution in adults',
                        'Psoriasis': 'Well-demarcated plaques with silvery scale, extensor surfaces',
                        'Acne': 'Comedones, papules, pustules on face, chest, back',
                        'Cellulitis': 'Spreading erythema, warmth, tenderness, systemic upset',
                        'Fungal infections': 'Scaling, well-demarcated border, KOH positive'
                    },
                    clinicalPearls: 'Note distribution pattern - helpful for diagnosis. Consider systemic causes'
                }
            }
        },
        'musculoskeletal': {
            title: 'Musculoskeletal Examination',
            category: 'orthopaedic',
            approach: 'Look → Feel → Move → Special tests → Function',
            sections: {
                'inspection': {
                    name: 'Inspection',
                    technique: 'Observe posture, gait, deformity, swelling, muscle wasting',
                    normal: 'Normal posture, no deformity, symmetrical muscle bulk',
                    abnormal: {
                        'Deformity': 'Angular (varus/valgus), rotational, fixed flexion',
                        'Swelling': 'Joint effusion, soft tissue oedema, bony enlargement',
                        'Muscle wasting': 'Disuse atrophy, neurological causes',
                        'Scars': 'Previous surgery, trauma',
                        'Skin changes': 'Erythema, warmth, rash'
                    },
                    clinicalPearls: 'Compare both sides. Expose joints above and below affected area'
                },
                'palpation': {
                    name: 'Palpation',
                    technique: 'Feel for tenderness, swelling, temperature, crepitus',
                    normal: 'No tenderness, normal temperature, no swelling',
                    abnormal: {
                        'Joint line tenderness': 'Arthritis, meniscal tears',
                        'Bony tenderness': 'Fracture, osteomyelitis',
                        'Soft tissue swelling': 'Inflammation, infection, bleeding',
                        'Crepitus': 'Osteoarthritis, fracture',
                        'Warmth': 'Inflammation, infection, crystal arthropathy'
                    },
                    clinicalPearls: 'Watch patient face for signs of discomfort. Palpate systematically'
                },
                'movement': {
                    name: 'Range of Movement',
                    technique: 'Active then passive movement, compare to normal side',
                    normal: 'Full range of movement, no pain',
                    abnormal: {
                        'Reduced range': 'Pain, stiffness, mechanical block, muscle weakness',
                        'Painful arc': 'Shoulder impingement, rotator cuff pathology',
                        'End-feel': 'Hard (bony), soft (muscle spasm), empty (pain)',
                        'Instability': 'Ligament rupture, chronic dislocation',
                        'Locking': 'Mechanical block - loose body, meniscal tear'
                    },
                    clinicalPearls: 'Active movement tests muscle power. Passive tests joint integrity'
                },
                'special-tests': {
                    name: 'Special Tests',
                    technique: 'Joint-specific tests for ligament integrity, impingement, instability',
                    normal: 'Negative special tests, stable joints',
                    abnormal: {
                        'McMurray test': 'Positive in meniscal tears (knee)',
                        'Anterior drawer': 'ACL rupture (knee), ankle instability',
                        'Thomas test': 'Hip flexion contracture',
                        'Schobers test': 'Reduced spinal flexion in ankylosing spondylitis',
                        'Tinel/Phalen signs': 'Carpal tunnel syndrome'
                    },
                    clinicalPearls: 'Know specific tests for each joint. Practice technique for accuracy'
                }
            }
        },
        'ent-basic': {
            title: 'Basic ENT Examination',
            category: 'specialist',
            approach: 'External inspection → Otoscopy → Hearing → Nose → Throat → Neck',
            sections: {
                'ears': {
                    name: 'Ear Examination',
                    technique: 'Inspect pinna, otoscopy (pull up and back in adults), hearing tests',
                    normal: 'Normal pinna, clear tympanic membrane, intact hearing',
                    abnormal: {
                        'Otitis externa': 'Red, swollen ear canal, discharge, pain on movement',
                        'Otitis media': 'Red, bulging tympanic membrane, fluid level',
                        'Perforated drum': 'Hole in tympanic membrane, discharge',
                        'Hearing loss': 'Conductive (wax, infection) vs sensorineural (age, noise)',
                        'Vertigo': 'Dizziness, nystagmus, balance problems'
                    },
                    clinicalPearls: 'Use largest speculum that fits. Pull pinna up and back in adults'
                },
                'nose': {
                    name: 'Nasal Examination',
                    technique: 'External inspection, anterior rhinoscopy, test patency',
                    normal: 'Patent nostrils, pink mucosa, no discharge',
                    abnormal: {
                        'Rhinitis': 'Swollen, red mucosa, discharge',
                        'Polyps': 'Pale, grape-like swellings',
                        'Deviated septum': 'Asymmetric nostrils, blocked airflow',
                        'Epistaxis': 'Nosebleeds - anterior (Little area) vs posterior',
                        'Anosmia': 'Loss of smell - viral, trauma, tumour'
                    },
                    clinicalPearls: 'Check airflow by occluding one nostril. Look for septal deviation'
                },
                'throat': {
                    name: 'Throat Examination',
                    technique: 'Inspect lips, teeth, tongue, throat with good light and tongue depressor',
                    normal: 'Pink mucosa, white teeth, no lesions, symmetrical soft palate',
                    abnormal: {
                        'Tonsillitis': 'Red, swollen tonsils, exudate, lymphadenopathy',
                        'Pharyngitis': 'Red throat, sore, may have exudate',
                        'Oral thrush': 'White plaques on tongue, buccal mucosa',
                        'Ulceration': 'Aphthous ulcers, viral, malignancy',
                        'Dental problems': 'Caries, abscesses, poor hygiene'
                    },
                    clinicalPearls: 'Use torch and tongue depressor. Check for referred ear pain'
                },
                'neck': {
                    name: 'Neck Examination',
                    technique: 'Inspect for swelling, palpate lymph nodes, thyroid, salivary glands',
                    normal: 'No swelling, no palpable lymph nodes, normal thyroid',
                    abnormal: {
                        'Lymphadenopathy': 'Infection, malignancy, systemic disease',
                        'Thyroid swelling': 'Goitre, nodules, carcinoma',
                        'Salivary gland swelling': 'Infection, stones, tumours',
                        'Neck masses': 'Thyroglossal cyst, branchial cyst, lymphoma',
                        'Torticollis': 'Muscle spasm, injury, infection'
                    },
                    clinicalPearls: 'Ask patient to swallow when examining thyroid. Palpate from behind'
                }
            }
        },
        'breast': {
            title: 'Breast Examination',
            category: 'primary-care',
            approach: 'Inspection → Palpation → Lymph nodes → Teaching self-examination',
            sections: {
                'inspection': {
                    name: 'Inspection',
                    technique: 'Patient seated, arms by sides, then raised, then hands on hips',
                    normal: 'Symmetrical breasts, no skin changes, normal nipples',
                    abnormal: {
                        'Asymmetry': 'Size difference, one breast higher - may be normal variant',
                        'Skin dimpling': 'Peau d\'orange, tethering - suspicious for malignancy',
                        'Nipple changes': 'Inversion, discharge, scaling - may indicate pathology',
                        'Visible lump': 'Obvious mass, skin changes over lump',
                        'Skin discoloration': 'Erythema, bruising, inflammatory changes'
                    },
                    clinicalPearls: 'Inspect in 3 positions: arms down, up, hands on hips. Look for symmetry'
                },
                'palpation': {
                    name: 'Palpation',
                    technique: 'Systematic palpation using pads of fingers, patient supine with arm behind head',
                    normal: 'Soft breast tissue, no discrete lumps, normal nodularity',
                    abnormal: {
                        'Breast lump': 'Discrete mass - assess size, consistency, mobility, skin attachment',
                        'Hard, fixed lump': 'Suspicious for malignancy - urgent referral',
                        'Soft, mobile lump': 'Likely benign - fibroadenoma, cyst',
                        'Skin tethering': 'Lump attached to skin - concerning feature',
                        'Nipple discharge': 'Bloody, unilateral - requires investigation'
                    },
                    clinicalPearls: 'Use flat of fingers, not fingertips. Examine in clockwise manner'
                },
                'lymph-nodes': {
                    name: 'Lymph Node Assessment',
                    technique: 'Palpate axillary, supraclavicular, and infraclavicular nodes',
                    normal: 'No palpable lymphadenopathy',
                    abnormal: {
                        'Axillary nodes': 'Most common site for breast cancer spread',
                        'Supraclavicular nodes': 'Advanced disease, poor prognosis',
                        'Fixed nodes': 'Malignant involvement likely',
                        'Multiple nodes': 'Extensive nodal disease',
                        'Tender nodes': 'May indicate infection or inflammation'
                    },
                    clinicalPearls: 'Always examine lymph nodes. Support patient\'s arm during examination'
                },
                'patient-education': {
                    name: 'Self-Examination Teaching',
                    technique: 'Teach monthly self-examination technique',
                    normal: 'Patient understands technique and timing',
                    abnormal: {
                        'Poor technique': 'Inadequate examination method',
                        'Infrequent checking': 'Not examining regularly',
                        'Anxiety about findings': 'Excessive worry about normal changes',
                        'Delayed presentation': 'Found lump but delayed seeking help',
                        'Lack of awareness': 'Doesn\'t know what to look for'
                    },
                    clinicalPearls: 'Best time is week after menstruation. Emphasize normal cyclical changes'
                }
            }
        },
        'prostate': {
            title: 'Prostate Examination',
            category: 'primary-care',
            approach: 'History → General examination → Digital rectal examination → Assessment',
            sections: {
                'preparation': {
                    name: 'Preparation and Consent',
                    technique: 'Explain procedure, obtain consent, position patient appropriately',
                    normal: 'Patient consented and positioned comfortably',
                    abnormal: {
                        'Patient anxiety': 'Excessive worry about procedure - reassurance needed',
                        'Positioning difficulties': 'Mobility issues, pain on positioning',
                        'Incomplete consent': 'Patient not fully informed',
                        'Cultural concerns': 'Religious or cultural objections',
                        'Previous trauma': 'History of abuse or difficult examinations'
                    },
                    clinicalPearls: 'Left lateral position most common. Explain each step as you proceed'
                },
                'inspection': {
                    name: 'Perianal Inspection',
                    technique: 'Inspect perianal area before digital examination',
                    normal: 'Normal perianal skin, no lesions',
                    abnormal: {
                        'Haemorrhoids': 'External piles, skin tags',
                        'Anal fissure': 'Painful tear in anal margin',
                        'Skin lesions': 'Warts, tumours, inflammatory conditions',
                        'Discharge': 'Mucus, blood, pus from anus',
                        'Prolapse': 'Rectal prolapse on straining'
                    },
                    clinicalPearls: 'Good lighting essential. Look for obvious pathology before palpation'
                },
                'digital-examination': {
                    name: 'Digital Rectal Examination',
                    technique: 'Lubricated finger, gentle insertion, systematic palpation of prostate',
                    normal: 'Smooth, firm, symmetrical prostate, size of walnut',
                    abnormal: {
                        'Enlarged prostate': 'BPH - smooth, symmetrical enlargement',
                        'Hard, irregular prostate': 'Suspicious for carcinoma - craggy, asymmetrical',
                        'Tender prostate': 'Prostatitis - acute inflammation',
                        'Nodules': 'Discrete lumps - may be malignant',
                        'Fixed prostate': 'Advanced carcinoma with local invasion'
                    },
                    clinicalPearls: 'Assess size, consistency, symmetry, mobility. Note patient discomfort'
                },
                'assessment': {
                    name: 'Clinical Assessment',
                    technique: 'Correlate findings with symptoms and PSA if available',
                    normal: 'Normal prostate examination, correlates with clinical picture',
                    abnormal: {
                        'LUTS symptoms': 'Lower urinary tract symptoms with enlarged prostate',
                        'Elevated PSA': 'High PSA with abnormal examination - urgent referral',
                        'Haematuria': 'Blood in urine with prostate abnormality',
                        'Bone pain': 'Back pain with hard prostate - metastases?',
                        'Weight loss': 'Constitutional symptoms with prostate mass'
                    },
                    clinicalPearls: 'PSA can be elevated 48hrs post-examination. Consider 2-week rule referral'
                }
            }
        },
        'eye': {
            title: 'Eye Examination',
            category: 'primary-care',
            approach: 'Visual acuity → External inspection → Pupil examination → Fundoscopy',
            sections: {
                'visual-acuity': {
                    name: 'Visual Acuity Testing',
                    technique: 'Snellen chart at 6 metres, test each eye separately with/without glasses',
                    normal: '6/6 vision in both eyes',
                    abnormal: {
                        'Reduced acuity': '6/9, 6/12, 6/18 etc - refractive error, pathology',
                        'Sudden visual loss': 'Acute onset - retinal detachment, stroke, temporal arteritis',
                        'Gradual visual loss': 'Cataracts, macular degeneration, glaucoma',
                        'Cannot read top line': 'Count fingers, hand movements, light perception',
                        'Metamorphopsia': 'Distorted vision - macular pathology'
                    },
                    clinicalPearls: 'Test with glasses on if worn. Pinhole improves refractive errors'
                },
                'external-examination': {
                    name: 'External Eye Examination',
                    technique: 'Inspect lids, conjunctiva, cornea, iris, pupils',
                    normal: 'Clear cornea, white sclera, pink conjunctiva, normal lids',
                    abnormal: {
                        'Red eye': 'Conjunctivitis, episcleritis, scleritis, acute glaucoma',
                        'Ptosis': 'Drooping eyelid - nerve palsy, muscle weakness',
                        'Proptosis': 'Bulging eye - thyroid, orbital tumour',
                        'Corneal opacity': 'Scar, infection, dystrophy',
                        'Jaundice': 'Yellow sclera - liver disease, haemolysis'
                    },
                    clinicalPearls: 'Use good lighting. Look for asymmetry between eyes'
                },
                'pupil-examination': {
                    name: 'Pupil Examination',
                    technique: 'Test pupil size, shape, light reflex, accommodation',
                    normal: 'Equal, round, reactive pupils (PEARL)',
                    abnormal: {
                        'Anisocoria': 'Unequal pupils - Horner syndrome, nerve palsy',
                        'Fixed dilated pupil': 'No light reflex - nerve damage, drugs',
                        'Relative afferent pupillary defect': 'RAPD - optic nerve pathology',
                        'Irregular pupil': 'Trauma, previous surgery, inflammation',
                        'Argyll Robertson pupil': 'Accommodates but doesn\'t react - neurosyphilis'
                    },
                    clinicalPearls: 'Swinging light test for RAPD. Note pupil size in light and dark'
                },
                'fundoscopy': {
                    name: 'Fundoscopy',
                    technique: 'Dilated pupils preferred, examine optic disc, macula, vessels',
                    normal: 'Pink optic disc, clear vessels, normal macula',
                    abnormal: {
                        'Papilloedema': 'Swollen optic disc - raised intracranial pressure',
                        'Diabetic retinopathy': 'Microaneurysms, haemorrhages, exudates',
                        'Hypertensive retinopathy': 'AV nipping, flame haemorrhages',
                        'Macular degeneration': 'Drusen, pigmentation, haemorrhage',
                        'Retinal detachment': 'Grey, elevated retina'
                    },
                    clinicalPearls: 'Use mydriatics for better view. Examine red reflex first'
                }
            }
        },
        'diabetic-foot': {
            title: 'Diabetic Foot Examination',
            category: 'primary-care',
            approach: 'Inspection → Vascular assessment → Neurological assessment → Risk stratification',
            sections: {
                'inspection': {
                    name: 'Foot Inspection',
                    technique: 'Examine both feet, between toes, soles, check footwear',
                    normal: 'Intact skin, no deformity, appropriate footwear',
                    abnormal: {
                        'Ulceration': 'Open wounds, typically painless in neuropathy',
                        'Callus formation': 'Thickened skin at pressure points',
                        'Deformity': 'Clawing, hammer toes, Charcot arthropathy',
                        'Skin changes': 'Dry skin, fissures, fungal infections',
                        'Poor footwear': 'Ill-fitting shoes, inappropriate for diabetes'
                    },
                    clinicalPearls: 'Remove shoes and socks completely. Use mirror to check soles'
                },
                'vascular-assessment': {
                    name: 'Vascular Assessment',
                    technique: 'Palpate foot pulses, check capillary refill, assess skin temperature',
                    normal: 'Palpable dorsalis pedis and posterior tibial pulses',
                    abnormal: {
                        'Absent pulses': 'Peripheral arterial disease',
                        'Cold feet': 'Poor circulation, arterial insufficiency',
                        'Prolonged capillary refill': '>2 seconds - poor perfusion',
                        'Dependent rubor': 'Red feet when dependent - severe PAD',
                        'Pallor on elevation': 'White feet when elevated - arterial disease'
                    },
                    clinicalPearls: 'Doppler may be needed if pulses not palpable. Check both feet'
                },
                'neurological-assessment': {
                    name: 'Neurological Assessment',
                    technique: 'Test vibration, pain, light touch, reflexes using monofilament',
                    normal: 'Intact sensation to 10g monofilament, normal reflexes',
                    abnormal: {
                        'Loss of protective sensation': 'Cannot feel 10g monofilament',
                        'Absent vibration sense': 'Tuning fork not felt - large fibre neuropathy',
                        'Reduced pain sensation': 'Cannot feel pinprick',
                        'Absent ankle reflexes': 'Peripheral neuropathy',
                        'Motor neuropathy': 'Weakness, muscle wasting, deformity'
                    },
                    clinicalPearls: '10g monofilament is gold standard. Test multiple sites on each foot'
                },
                'risk-stratification': {
                    name: 'Risk Assessment',
                    technique: 'Categorize risk level based on findings, plan follow-up',
                    normal: 'Low risk - normal sensation and circulation',
                    abnormal: {
                        'Low risk': 'No neuropathy, no PAD, no deformity',
                        'Moderate risk': 'Neuropathy OR PAD OR deformity',
                        'High risk': 'Neuropathy + PAD, or previous ulcer/amputation',
                        'Active pathology': 'Current ulcer, infection, acute Charcot',
                        'Urgent referral': 'Signs of infection, gangrene, acute ischaemia'
                    },
                    clinicalPearls: 'Annual screening for low risk, 3-6 monthly for high risk patients'
                }
            }
        },
        'blood-pressure': {
            title: 'Blood Pressure Measurement',
            category: 'primary-care',
            approach: 'Preparation → Correct technique → Interpretation → Follow-up planning',
            sections: {
                'preparation': {
                    name: 'Patient Preparation',
                    technique: 'Patient seated, 5 minutes rest, correct cuff size, arm supported',
                    normal: 'Patient relaxed, appropriate cuff size, correct positioning',
                    abnormal: {
                        'Incorrect cuff size': 'Too small (overestimates) or too large (underestimates)',
                        'Poor positioning': 'Arm unsupported, wrong height, talking during measurement',
                        'White coat effect': 'Elevated BP in medical setting only',
                        'Recent caffeine/smoking': 'Temporary elevation in BP',
                        'Full bladder': 'Can elevate BP readings'
                    },
                    clinicalPearls: 'Cuff should cover 80% of arm circumference. No talking during measurement'
                },
                'technique': {
                    name: 'Measurement Technique',
                    technique: 'Inflate 20mmHg above palpated systolic, deflate 2mmHg/second',
                    normal: 'Clear Korotkoff sounds, consistent readings',
                    abnormal: {
                        'Auscultatory gap': 'Silent period between systolic and diastolic',
                        'Irregular rhythm': 'Atrial fibrillation affects accuracy',
                        'Very high BP': '>180/110 - needs urgent assessment',
                        'Orthostatic hypotension': '>20mmHg drop on standing',
                        'Inter-arm difference': '>20mmHg difference - vascular pathology'
                    },
                    clinicalPearls: 'Take 2-3 readings, 1 minute apart. Check both arms initially'
                },
                'interpretation': {
                    name: 'Blood Pressure Categories',
                    technique: 'Classify BP according to NICE guidelines',
                    normal: 'Optimal <120/80, Normal <130/85',
                    abnormal: {
                        'High normal': '130-139/85-89 mmHg',
                        'Stage 1 hypertension': '140-159/90-99 mmHg (home >135/85)',
                        'Stage 2 hypertension': '160-179/100-109 mmHg (home >150/95)',
                        'Stage 3 hypertension': '≥180/110 mmHg - severe, consider admission',
                        'Isolated systolic hypertension': 'Systolic >140, diastolic <90'
                    },
                    clinicalPearls: 'ABPM/HBPM preferred for diagnosis. Clinic readings often higher'
                },
                'follow-up': {
                    name: 'Follow-up Planning',
                    technique: 'Plan appropriate monitoring and treatment based on risk',
                    normal: 'Annual check for normal BP',
                    abnormal: {
                        'Newly diagnosed hypertension': 'Assess cardiovascular risk, consider treatment',
                        'Uncontrolled hypertension': 'Review medications, lifestyle advice',
                        'Resistant hypertension': 'Consider specialist referral',
                        'Secondary hypertension': 'Young age, severe/resistant - investigate causes',
                        'Accelerated hypertension': 'Papilloedema, AKI - emergency treatment'
                    },
                    clinicalPearls: 'QRisk3 calculator for cardiovascular risk assessment'
                }
            }
        },
        'gynaecological': {
            title: 'Gynaecological Examination',
            category: 'primary-care',
            approach: 'Consent → Positioning → Inspection → Speculum → Bimanual → Documentation',
            sections: {
                'consent-preparation': {
                    name: 'Consent and Preparation',
                    technique: 'Explain procedure, obtain consent, chaperone present, correct positioning',
                    normal: 'Patient consented, comfortable, appropriately positioned',
                    abnormal: {
                        'Inadequate consent': 'Patient not fully informed of procedure',
                        'No chaperone': 'Required for intimate examinations',
                        'Patient anxiety': 'Excessive worry, previous trauma',
                        'Positioning difficulties': 'Mobility issues, pain',
                        'Cultural concerns': 'Religious objections, modesty issues'
                    },
                    clinicalPearls: 'Always offer chaperone. Explain each step. Stop if patient requests'
                },
                'external-inspection': {
                    name: 'External Inspection',
                    technique: 'Inspect vulva, perineum, anus for abnormalities',
                    normal: 'Normal vulval anatomy, no lesions, normal hair distribution',
                    abnormal: {
                        'Vulval lesions': 'Ulcers, warts, tumours, inflammatory conditions',
                        'Discharge': 'Abnormal colour, consistency, odour',
                        'Prolapse': 'Cystocoele, rectocoele, uterine prolapse',
                        'Atrophic changes': 'Post-menopausal atrophy, dryness',
                        'Trauma': 'Tears, bruising, signs of abuse'
                    },
                    clinicalPearls: 'Good lighting essential. Note any asymmetry or obvious pathology'
                },
                'speculum-examination': {
                    name: 'Speculum Examination',
                    technique: 'Insert appropriate speculum, visualize cervix, take samples if needed',
                    normal: 'Normal cervix, no discharge, appropriate cervical os',
                    abnormal: {
                        'Cervical abnormalities': 'Erosion, polyps, suspicious lesions',
                        'Abnormal discharge': 'Purulent, offensive, blood-stained',
                        'Bleeding': 'Contact bleeding, intermenstrual bleeding',
                        'Cervical motion tenderness': 'Pain on moving cervix - PID',
                        'Uterine prolapse': 'Cervix visible at introitus'
                    },
                    clinicalPearls: 'Warm speculum. Insert at 45° angle. Cervical screening if due'
                },
                'bimanual-examination': {
                    name: 'Bimanual Examination',
                    technique: 'Two fingers in vagina, other hand on abdomen, assess uterus and adnexae',
                    normal: 'Normal sized, mobile uterus, no adnexal masses',
                    abnormal: {
                        'Enlarged uterus': 'Pregnancy, fibroids, malignancy',
                        'Fixed uterus': 'Endometriosis, malignancy, adhesions',
                        'Adnexal masses': 'Ovarian cysts, tumours, ectopic pregnancy',
                        'Tenderness': 'PID, ovarian pathology, endometriosis',
                        'Irregular contour': 'Fibroids, malignancy'
                    },
                    clinicalPearls: 'Gentle technique. Warn patient before examination. Note any masses'
                }
            }
        }
    };
    
    const container = examinationContainer;
    container.innerHTML = `
        <div class="search-container">
            <input type="text" id="examination-search" placeholder="Search examination techniques..." class="tool-search">
            <button id="examination-search-btn">🔍</button>
        </div>
        <div id="examination-search-results" class="lab-grid"></div>
        <div class="examination-categories">
            <button class="category-btn active" onclick="window.quizApp.showExaminationCategory('all'); event.stopPropagation();">All Systems</button>
            <button class="category-btn" onclick="window.quizApp.showExaminationCategory('cardiovascular'); event.stopPropagation();">Cardiovascular</button>
            <button class="category-btn" onclick="window.quizApp.showExaminationCategory('respiratory'); event.stopPropagation();">Respiratory</button>
            <button class="category-btn" onclick="window.quizApp.showExaminationCategory('abdominal'); event.stopPropagation();">Abdominal</button>
            <button class="category-btn" onclick="window.quizApp.showExaminationCategory('neurological'); event.stopPropagation();">Neurological</button>
            <button class="category-btn" onclick="window.quizApp.showExaminationCategory('ward-based'); event.stopPropagation();">Ward-Based</button>
            <button class="category-btn" onclick="window.quizApp.showExaminationCategory('primary-care'); event.stopPropagation();">Primary Care</button>
        </div>
        <div id="examination-list" class="lab-grid"></div>
    `;
    
    const searchInput = document.getElementById('examination-search');
    const searchBtn = document.getElementById('examination-search-btn');
    const self = this;
    searchInput.addEventListener('input', () => self.searchExamination(examinationDatabase));
    searchBtn.addEventListener('click', () => self.searchExamination(examinationDatabase));
    this.examinationDatabase = examinationDatabase;
    this.showExaminationCategory('all');
    console.log('✅ Examination guide loaded successfully!');
};

MLAQuizApp.prototype.searchExamination = function(examinationDatabase) {
    const query = document.getElementById('examination-search').value.toLowerCase();
    const resultsContainer = document.getElementById('examination-search-results');
    
    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }
    
    const matches = [];
    Object.keys(examinationDatabase).forEach(system => {
        if (examinationDatabase[system].title.toLowerCase().includes(query)) {
            matches.push({ type: 'system', key: system, name: examinationDatabase[system].title });
        }
        Object.keys(examinationDatabase[system].sections).forEach(section => {
            const sectionData = examinationDatabase[system].sections[section];
            if (sectionData.name.toLowerCase().includes(query) ||
                sectionData.technique.toLowerCase().includes(query)) {
                matches.push({ type: 'section', system: system, key: section, name: `${sectionData.name} (${examinationDatabase[system].title})` });
            }
        });
    });
    
    if (matches.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
        return;
    }
    
    resultsContainer.innerHTML = matches.map(match => `
        <button class="lab-value-btn" onclick="${match.type === 'system' ? `console.log('🩺 Examination system clicked:', '${match.key}'); window.quizApp.showExaminationDetail('${match.key}'); event.stopPropagation();` : `console.log('🩺 Examination section clicked:', '${match.key}'); window.quizApp.showSectionDetail('${match.system}', '${match.key}'); event.stopPropagation();`}">
            <div class="lab-name">${match.name}</div>
            <div class="lab-count">${match.type === 'system' ? 'System' : 'Technique'}</div>
        </button>
    `).join('');
};

MLAQuizApp.prototype.showExaminationCategory = function(category) {
    const examinationDatabase = this.examinationDatabase;
    const examinationList = document.getElementById('examination-list');
    
    // Safety check - if examination-list doesn't exist, reload the interface first
    if (!examinationList) {
        console.log('⚠️ Examination list not found, reloading interface...');
        this.loadExaminationGuide();
        // Try again after a short delay to allow DOM to update
        setTimeout(() => this.showExaminationCategory(category), 100);
        return;
    }
    
    // Safety check for examination database
    if (!examinationDatabase) {
        console.log('⚠️ Examination database not loaded, reloading...');
        this.loadExaminationGuide();
        return;
    }
    
    let systems = Object.keys(examinationDatabase);
    
    // Update active state of category buttons
    const categoryButtons = document.querySelectorAll('.examination-categories .category-btn');
    if (categoryButtons.length > 0) {
        categoryButtons.forEach(btn => {
            btn.classList.remove('active');
            const btnText = btn.textContent.trim();
            if ((category === 'all' && btnText === 'All Systems') ||
                (category === 'cardiovascular' && btnText === 'Cardiovascular') ||
                (category === 'respiratory' && btnText === 'Respiratory') ||
                (category === 'abdominal' && btnText === 'Abdominal') ||
                (category === 'neurological' && btnText === 'Neurological') ||
                (category === 'ward-based' && btnText === 'Ward-Based') ||
                (category === 'primary-care' && btnText === 'Primary Care')) {
                btn.classList.add('active');
            }
        });
    } else {
        console.log('⚠️ Examination category buttons not found');
    }
    
    if (category !== 'all') {
        if (category === 'ward-based') {
            systems = systems.filter(system => 
                ['mental-state', 'thyroid', 'lymph-nodes', 'skin', 'musculoskeletal', 'ent-basic'].includes(system)
            );
        } else if (category === 'primary-care') {
            systems = systems.filter(system => 
                ['breast', 'prostate', 'eye', 'diabetic-foot', 'blood-pressure', 'gynaecological'].includes(system)
            );
        } else {
            systems = systems.filter(system => examinationDatabase[system].category === category);
        }
    }
    
    // Safely update the examination list
    if (examinationList) {
        examinationList.innerHTML = systems.map(system => `
            <button class="lab-value-btn" onclick="console.log('🩺 Examination system clicked:', '${system}'); window.quizApp.showExaminationDetail('${system}'); event.stopPropagation();">
                <div class="lab-name">${examinationDatabase[system].title}</div>
                <div class="lab-count">${Object.keys(examinationDatabase[system].sections).length} sections</div>
            </button>
        `).join('');
    } else {
        console.log('⚠️ Failed to update examination list - element not found');
    }
};

MLAQuizApp.prototype.showExaminationDetail = function(systemKey) {
    // Safety checks
    if (!this.examinationDatabase) {
        console.log('⚠️ Examination database not loaded, reloading...');
        this.loadExaminationGuide();
        return;
    }
    
    const system = this.examinationDatabase[systemKey];
    if (!system) {
        console.log('⚠️ System not found:', systemKey);
        this.loadExaminationGuide();
        return;
    }
    
    const container = document.getElementById('examination-container');
    if (!container) {
        console.log('⚠️ Examination container not found');
        return;
    }
    
    const sectionsHtml = Object.entries(system.sections).map(([sectionKey, section]) => `
        <button class="lab-value-btn" onclick="window.quizApp.showSectionDetail('${systemKey}', '${sectionKey}'); event.stopPropagation();">
            <div class="lab-name">${section.name}</div>
            <div class="lab-count">${Object.keys(section.abnormal).length} abnormal findings</div>
        </button>
    `).join('');
    
    container.innerHTML = `
        <button class="back-btn" onclick="window.quizApp.loadExaminationGuide(); event.stopPropagation();">← Back to Examinations</button>
        <div class="examination-detail">
            <h3>🩺 ${system.title}</h3>
            <p class="exam-category">📋 ${system.category}</p>
            <div class="approach-banner">
                <h4>🔄 Systematic Approach</h4>
                <p>${system.approach}</p>
            </div>
            <h4>📋 Examination Sections:</h4>
            <div class="lab-grid">
                ${sectionsHtml}
            </div>
        </div>
    `;
};

MLAQuizApp.prototype.showSectionDetail = function(systemKey, sectionKey) {
    // Safety checks
    if (!this.examinationDatabase) {
        console.log('⚠️ Examination database not loaded, reloading...');
        this.loadExaminationGuide();
        return;
    }
    
    const system = this.examinationDatabase[systemKey];
    if (!system) {
        console.log('⚠️ System not found:', systemKey);
        this.loadExaminationGuide();
        return;
    }
    
    const section = system.sections[sectionKey];
    if (!section) {
        console.log('⚠️ Section not found:', sectionKey);
        this.showExaminationDetail(systemKey);
        return;
    }
    
    const container = document.getElementById('examination-container');
    if (!container) {
        console.log('⚠️ Examination container not found');
        return;
    }
    
    const abnormalHtml = Object.entries(section.abnormal).map(([finding, description]) => `
        <div class="finding-item abnormal">
            <div class="finding-name">⚠️ ${finding}</div>
            <div class="finding-description">${description}</div>
        </div>
    `).join('');
    
    container.innerHTML = `
        <button class="back-btn" onclick="window.quizApp.showExaminationDetail('${systemKey}'); event.stopPropagation();">← Back to ${system.title}</button>
        <div class="section-detail">
            <h3>🔍 ${section.name}</h3>
            <div class="technique-banner">
                <h4>🛠️ Technique</h4>
                <p>${section.technique}</p>
            </div>
            <div class="findings-section">
                <div class="normal-findings">
                    <h4>✅ Normal Findings</h4>
                    <div class="normal-box">
                        ${section.normal}
                    </div>
                </div>
                <div class="abnormal-findings">
                    <h4>⚠️ Abnormal Findings</h4>
                    <div class="abnormal-list">
                        ${abnormalHtml}
                    </div>
                </div>
            </div>
            ${section.clinicalPearls ? `
            <div class="clinical-pearls">
                <h4>💎 Clinical Pearls</h4>
                <p>${section.clinicalPearls}</p>
            </div>` : ''}
        </div>
    `;
};

// Mobile back button override for medical tools
MLAQuizApp.prototype.setupMobileBackButton = function() {
    // Push initial state to enable back button override
    if (window.history.state === null) {
        window.history.pushState({ medicalToolsActive: false }, '', window.location.href);
    }
    
    window.addEventListener('popstate', (event) => {
        // Check active panel instead of stored variable
        const activePanel = document.querySelector('.tool-panel.active');
        const activePanelId = activePanel ? activePanel.id : null;
        
        // If we're in a medical tool panel, go back intelligently
        if (activePanelId && activePanelId !== 'quiz-panel') {
            event.preventDefault();
            
            // If in a sub-panel, go back to parent tool
            if (activePanelId === 'calculator-detail') {
                this.switchMedicalTool('calculators');
            } else if (activePanelId === 'examination-panel') {
                this.switchMedicalTool('examinations');
            } else {
                // Go back to main quiz interface - but we need to handle this properly
                // For now, stay in current panel to avoid breaking the app
                console.log('🔙 Back button pressed in:', activePanelId);
            }
            
            // Maintain history state
            window.history.pushState({ medicalToolsActive: true }, '', window.location.href);
        }
    });
};

// ===== NEW CALCULATORS FROM APP2.JS =====

// GRACE Score Calculator
MLAQuizApp.prototype.getGRACECalculator = function() {
    return `
        <div class="calculator-form">
            <h4>GRACE Score for ACS Risk Assessment</h4>
            <div class="calc-input-group">
                <label>Age (years):</label>
                <input type="number" id="grace-age" placeholder="65" min="0" max="120">
            </div>
            <div class="calc-input-group">
                <label>Heart Rate (bpm):</label>
                <input type="number" id="grace-hr" placeholder="80" min="30" max="250">
            </div>
            <div class="calc-input-group">
                <label>Systolic BP (mmHg):</label>
                <input type="number" id="grace-sbp" placeholder="120" min="50" max="300">
            </div>
            <div class="calc-input-group">
                <label>Creatinine (μmol/L):</label>
                <input type="number" id="grace-creatinine" placeholder="100" min="50" max="1000">
            </div>
            <div class="calc-checkbox-group">
                <label><input type="checkbox" id="grace-killip2"> Killip Class II-IV</label>
                <label><input type="checkbox" id="grace-cardiac-arrest"> Cardiac arrest</label>
                <label><input type="checkbox" id="grace-st-deviation"> ST deviation</label>
                <label><input type="checkbox" id="grace-elevated-enzymes"> Elevated cardiac enzymes</label>
            </div>
            <button onclick="window.quizApp.calculateGRACE()">Calculate GRACE Score</button>
            <div id="grace-result" class="calc-result"></div>
            <div class="calc-reference">
                <small><strong>GRACE Risk:</strong> Low ≤108 | Intermediate 109-140 | High >140</small>
            </div>
        </div>
    `;
};

// CRUSADE Score Calculator
MLAQuizApp.prototype.getCRUSADECalculator = function() {
    return `
        <div class="calculator-form">
            <h4>CRUSADE Bleeding Risk Score</h4>
            <div class="calc-input-group">
                <label>Baseline Haematocrit (%):</label>
                <input type="number" id="crusade-hct" placeholder="40" min="10" max="60" step="0.1">
            </div>
            <div class="calc-input-group">
                <label>Creatinine Clearance (ml/min):</label>
                <input type="number" id="crusade-ccr" placeholder="80" min="5" max="200">
            </div>
            <div class="calc-input-group">
                <label>Heart Rate (bpm):</label>
                <input type="number" id="crusade-hr" placeholder="70" min="30" max="250">
            </div>
            <div class="calc-input-group">
                <label>Systolic BP (mmHg):</label>
                <input type="number" id="crusade-sbp" placeholder="120" min="50" max="300">
            </div>
            <div class="calc-radio-group">
                <label>Sex:</label>
                <label><input type="radio" name="crusade-sex" value="male" checked> Male</label>
                <label><input type="radio" name="crusade-sex" value="female"> Female</label>
            </div>
            <div class="calc-checkbox-group">
                <label><input type="checkbox" id="crusade-chf"> Signs of CHF</label>
                <label><input type="checkbox" id="crusade-pvd"> Prior vascular disease</label>
                <label><input type="checkbox" id="crusade-diabetes"> Diabetes mellitus</label>
            </div>
            <button onclick="window.quizApp.calculateCRUSADE()">Calculate CRUSADE Score</button>
            <div id="crusade-result" class="calc-result"></div>
            <div class="calc-reference">
                <small><strong>Bleeding Risk:</strong> Very Low ≤20 | Low 21-30 | Moderate 31-40 | High 41-50 | Very High >50</small>
            </div>
        </div>
    `;
};

// PHQ-9 Depression Scale Calculator
MLAQuizApp.prototype.getPHQ9Calculator = function() {
    return `
        <div class="calculator-form">
            <h4>PHQ-9 Depression Severity Scale</h4>
            <p class="calc-description">Over the last 2 weeks, how often have you been bothered by any of the following problems?</p>
            
            <div class="phq9-questions">
                <div class="phq9-question">
                    <p>1. Little interest or pleasure in doing things</p>
                    <div class="radio-group">
                        <label><input type="radio" name="phq9-q1" value="0"> Not at all</label>
                        <label><input type="radio" name="phq9-q1" value="1"> Several days</label>
                        <label><input type="radio" name="phq9-q1" value="2"> More than half the days</label>
                        <label><input type="radio" name="phq9-q1" value="3"> Nearly every day</label>
                    </div>
                </div>
                
                <div class="phq9-question">
                    <p>2. Feeling down, depressed, or hopeless</p>
                    <div class="radio-group">
                        <label><input type="radio" name="phq9-q2" value="0"> Not at all</label>
                        <label><input type="radio" name="phq9-q2" value="1"> Several days</label>
                        <label><input type="radio" name="phq9-q2" value="2"> More than half the days</label>
                        <label><input type="radio" name="phq9-q2" value="3"> Nearly every day</label>
                    </div>
                </div>
                
                <div class="phq9-question">
                    <p>3. Trouble falling or staying asleep, or sleeping too much</p>
                    <div class="radio-group">
                        <label><input type="radio" name="phq9-q3" value="0"> Not at all</label>
                        <label><input type="radio" name="phq9-q3" value="1"> Several days</label>
                        <label><input type="radio" name="phq9-q3" value="2"> More than half the days</label>
                        <label><input type="radio" name="phq9-q3" value="3"> Nearly every day</label>
                    </div>
                </div>
                
                <div class="phq9-question">
                    <p>4. Feeling tired or having little energy</p>
                    <div class="radio-group">
                        <label><input type="radio" name="phq9-q4" value="0"> Not at all</label>
                        <label><input type="radio" name="phq9-q4" value="1"> Several days</label>
                        <label><input type="radio" name="phq9-q4" value="2"> More than half the days</label>
                        <label><input type="radio" name="phq9-q4" value="3"> Nearly every day</label>
                    </div>
                </div>
                
                <div class="phq9-question">
                    <p>5. Poor appetite or overeating</p>
                    <div class="radio-group">
                        <label><input type="radio" name="phq9-q5" value="0"> Not at all</label>
                        <label><input type="radio" name="phq9-q5" value="1"> Several days</label>
                        <label><input type="radio" name="phq9-q5" value="2"> More than half the days</label>
                        <label><input type="radio" name="phq9-q5" value="3"> Nearly every day</label>
                    </div>
                </div>
                
                <div class="phq9-question">
                    <p>6. Feeling bad about yourself or that you are a failure</p>
                    <div class="radio-group">
                        <label><input type="radio" name="phq9-q6" value="0"> Not at all</label>
                        <label><input type="radio" name="phq9-q6" value="1"> Several days</label>
                        <label><input type="radio" name="phq9-q6" value="2"> More than half the days</label>
                        <label><input type="radio" name="phq9-q6" value="3"> Nearly every day</label>
                    </div>
                </div>
                
                <div class="phq9-question">
                    <p>7. Trouble concentrating on things</p>
                    <div class="radio-group">
                        <label><input type="radio" name="phq9-q7" value="0"> Not at all</label>
                        <label><input type="radio" name="phq9-q7" value="1"> Several days</label>
                        <label><input type="radio" name="phq9-q7" value="2"> More than half the days</label>
                        <label><input type="radio" name="phq9-q7" value="3"> Nearly every day</label>
                    </div>
                </div>
                
                <div class="phq9-question">
                    <p>8. Moving or speaking slowly, or being fidgety/restless</p>
                    <div class="radio-group">
                        <label><input type="radio" name="phq9-q8" value="0"> Not at all</label>
                        <label><input type="radio" name="phq9-q8" value="1"> Several days</label>
                        <label><input type="radio" name="phq9-q8" value="2"> More than half the days</label>
                        <label><input type="radio" name="phq9-q8" value="3"> Nearly every day</label>
                    </div>
                </div>
                
                <div class="phq9-question">
                    <p>9. Thoughts that you would be better off dead or hurting yourself</p>
                    <div class="radio-group">
                        <label><input type="radio" name="phq9-q9" value="0"> Not at all</label>
                        <label><input type="radio" name="phq9-q9" value="1"> Several days</label>
                        <label><input type="radio" name="phq9-q9" value="2"> More than half the days</label>
                        <label><input type="radio" name="phq9-q9" value="3"> Nearly every day</label>
                    </div>
                </div>
            </div>
            
            <button onclick="window.quizApp.calculatePHQ9()">Calculate PHQ-9 Score</button>
            <div id="phq9-result" class="calc-result"></div>
            <div class="calc-reference">
                <small><strong>Severity:</strong> Minimal 1-4 | Mild 5-9 | Moderate 10-14 | Moderately Severe 15-19 | Severe 20-27</small>
            </div>
        </div>
    `;
};

// GAD-7 Anxiety Scale Calculator
MLAQuizApp.prototype.getGAD7Calculator = function() {
    return `
        <div class="calculator-form">
            <h4>GAD-7 Anxiety Screening Scale</h4>
            <p>Over the last 2 weeks, how often have you been bothered by any of the following problems?</p>
            
            <div class="calc-input-group">
                <label>Feeling nervous, anxious or on edge:</label>
                <select id="gad7-q1">
                    <option value="0">Not at all</option>
                    <option value="1">Several days</option>
                    <option value="2">More than half the days</option>
                    <option value="3">Nearly every day</option>
                </select>
            </div>
            
            <div class="calc-input-group">
                <label>Not being able to stop or control worrying:</label>
                <select id="gad7-q2">
                    <option value="0">Not at all</option>
                    <option value="1">Several days</option>
                    <option value="2">More than half the days</option>
                    <option value="3">Nearly every day</option>
                </select>
            </div>
            
            <div class="calc-input-group">
                <label>Worrying too much about different things:</label>
                <select id="gad7-q3">
                    <option value="0">Not at all</option>
                    <option value="1">Several days</option>
                    <option value="2">More than half the days</option>
                    <option value="3">Nearly every day</option>
                </select>
            </div>
            
            <div class="calc-input-group">
                <label>Trouble relaxing:</label>
                <select id="gad7-q4">
                    <option value="0">Not at all</option>
                    <option value="1">Several days</option>
                    <option value="2">More than half the days</option>
                    <option value="3">Nearly every day</option>
                </select>
            </div>
            
            <div class="calc-input-group">
                <label>Being so restless that it is hard to sit still:</label>
                <select id="gad7-q5">
                    <option value="0">Not at all</option>
                    <option value="1">Several days</option>
                    <option value="2">More than half the days</option>
                    <option value="3">Nearly every day</option>
                </select>
            </div>
            
            <div class="calc-input-group">
                <label>Becoming easily annoyed or irritable:</label>
                <select id="gad7-q6">
                    <option value="0">Not at all</option>
                    <option value="1">Several days</option>
                    <option value="2">More than half the days</option>
                    <option value="3">Nearly every day</option>
                </select>
            </div>
            
            <div class="calc-input-group">
                <label>Feeling afraid as if something awful might happen:</label>
                <select id="gad7-q7">
                    <option value="0">Not at all</option>
                    <option value="1">Several days</option>
                    <option value="2">More than half the days</option>
                    <option value="3">Nearly every day</option>
                </select>
            </div>
            
            <button onclick="window.quizApp.calculateGAD7()">Calculate GAD-7 Score</button>
            <div id="gad7-result" class="calc-result"></div>
            <div class="calc-reference">
                <small><strong>Anxiety Severity:</strong> Minimal 0-4 | Mild 5-9 | Moderate 10-14 | Severe 15-21</small>
            </div>
        </div>
    `;
};

// Insulin Sliding Scale Calculator
MLAQuizApp.prototype.getInsulinSlidingCalculator = function() {
    return `
        <div class="calculator-form">
            <h4>Insulin Sliding Scale Calculator</h4>
            <div class="calc-input-group">
                <label>Current Blood Glucose (mmol/L):</label>
                <input type="number" id="insulin-glucose" placeholder="12.5" step="0.1" min="1" max="50">
            </div>
            <div class="calc-input-group">
                <label>Patient Weight (kg):</label>
                <input type="number" id="insulin-weight" placeholder="70" min="20" max="200">
            </div>
            <div class="calc-input-group">
                <label>Insulin Sensitivity:</label>
                <select id="insulin-sensitivity">
                    <option value="normal">Normal (0.5-1 unit/kg/day)</option>
                    <option value="resistant">Insulin resistant (>1 unit/kg/day)</option>
                    <option value="sensitive">Insulin sensitive (<0.5 unit/kg/day)</option>
                </select>
            </div>
            <div class="calc-checkbox-group">
                <label><input type="checkbox" id="insulin-critical"> Critically ill patient</label>
                <label><input type="checkbox" id="insulin-steroids"> On high-dose steroids</label>
            </div>
            <button onclick="window.quizApp.calculateInsulinSliding()">Calculate Insulin Dose</button>
            <div id="insulin-result" class="calc-result"></div>
            <div class="calc-reference">
                <small><strong>Target glucose:</strong> 6-10 mmol/L (general wards) | 6-8 mmol/L (critical care)</small>
            </div>
        </div>
    `;
};

// Vasopressor Dosing Calculator
MLAQuizApp.prototype.getVasopressorCalculator = function() {
    return `
        <div class="calculator-form">
            <h4>Vasopressor Dosing Calculator</h4>
            <div class="calc-input-group">
                <label>Patient Weight (kg):</label>
                <input type="number" id="vaso-weight" placeholder="70" min="20" max="200">
            </div>
            <div class="calc-input-group">
                <label>Vasopressor:</label>
                <select id="vaso-drug">
                    <option value="noradrenaline">Noradrenaline</option>
                    <option value="adrenaline">Adrenaline</option>
                    <option value="dopamine">Dopamine</option>
                    <option value="dobutamine">Dobutamine</option>
                    <option value="vasopressin">Vasopressin</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>Target Dose (mcg/kg/min):</label>
                <input type="number" id="vaso-dose" placeholder="0.1" step="0.01" min="0.01" max="10">
            </div>
            <div class="calc-input-group">
                <label>Concentration (mg/ml):</label>
                <select id="vaso-concentration">
                    <option value="1">1 mg/ml (standard)</option>
                    <option value="4">4 mg/ml (concentrated)</option>
                    <option value="8">8 mg/ml (very concentrated)</option>
                </select>
            </div>
            <button onclick="window.quizApp.calculateVasopressor()">Calculate Infusion Rate</button>
            <div id="vaso-result" class="calc-result"></div>
            <div class="calc-reference">
                <small><strong>Typical ranges:</strong> Noradrenaline 0.01-3 mcg/kg/min | Adrenaline 0.01-1 mcg/kg/min</small>
            </div>
        </div>
    `;
};

// ===== CALCULATION FUNCTIONS FOR NEW CALCULATORS =====

// GRACE Score Calculation
MLAQuizApp.prototype.calculateGRACE = function() {
    const age = parseInt(document.getElementById('grace-age').value);
    const hr = parseInt(document.getElementById('grace-hr').value);
    const sbp = parseInt(document.getElementById('grace-sbp').value);
    const creatinine = parseInt(document.getElementById('grace-creatinine').value);
    
    if (!age || !hr || !sbp || !creatinine) {
        document.getElementById('grace-result').innerHTML = '<p class="error">Please fill in all required fields</p>';
        return;
    }
    
    let score = 0;
    
    // Age scoring
    if (age < 30) score += 0;
    else if (age < 40) score += 8;
    else if (age < 50) score += 25;
    else if (age < 60) score += 41;
    else if (age < 70) score += 58;
    else if (age < 80) score += 75;
    else score += 91;
    
    // Heart rate scoring
    if (hr < 50) score += 0;
    else if (hr < 70) score += 3;
    else if (hr < 90) score += 9;
    else if (hr < 110) score += 15;
    else if (hr < 150) score += 24;
    else if (hr < 200) score += 38;
    else score += 46;
    
    // Systolic BP scoring
    if (sbp >= 200) score += 0;
    else if (sbp >= 160) score += 10;
    else if (sbp >= 140) score += 18;
    else if (sbp >= 120) score += 24;
    else if (sbp >= 100) score += 34;
    else if (sbp >= 80) score += 43;
    else score += 53;
    
    // Creatinine scoring
    if (creatinine < 35) score += 1;
    else if (creatinine < 71) score += 4;
    else if (creatinine < 107) score += 7;
    else if (creatinine < 177) score += 10;
    else if (creatinine < 354) score += 13;
    else score += 21;
    
    // Additional factors
    if (document.getElementById('grace-killip2').checked) score += 20;
    if (document.getElementById('grace-cardiac-arrest').checked) score += 43;
    if (document.getElementById('grace-st-deviation').checked) score += 28;
    if (document.getElementById('grace-elevated-enzymes').checked) score += 14;
    
    // Risk categorization
    let riskLevel, color, mortality;
    if (score <= 108) {
        riskLevel = 'Low Risk';
        color = '#16a34a';
        mortality = '<1%';
    } else if (score <= 140) {
        riskLevel = 'Intermediate Risk';
        color = '#eab308';
        mortality = '1-3%';
    } else {
        riskLevel = 'High Risk';
        color = '#dc2626';
        mortality = '>3%';
    }
    
    document.getElementById('grace-result').innerHTML = `
        <h4 style="color: ${color}">GRACE Score: ${score}</h4>
        <p><strong>Risk Level:</strong> ${riskLevel}</p>
        <p><strong>6-month mortality:</strong> ${mortality}</p>
        <div class="risk-interpretation">
            <p><strong>Management:</strong></p>
            <ul>
                <li>Low Risk: Early conservative management appropriate</li>
                <li>Intermediate Risk: Consider early invasive strategy</li>
                <li>High Risk: Urgent invasive management indicated</li>
            </ul>
        </div>
    `;
};

// CRUSADE Score Calculation
MLAQuizApp.prototype.calculateCRUSADE = function() {
    const hct = parseFloat(document.getElementById('crusade-hct').value);
    const ccr = parseInt(document.getElementById('crusade-ccr').value);
    const hr = parseInt(document.getElementById('crusade-hr').value);
    const sbp = parseInt(document.getElementById('crusade-sbp').value);
    const sex = document.querySelector('input[name="crusade-sex"]:checked').value;
    
    if (!hct || !ccr || !hr || !sbp) {
        document.getElementById('crusade-result').innerHTML = '<p class="error">Please fill in all required fields</p>';
        return;
    }
    
    let score = 0;
    
    // Hematocrit scoring
    if (hct >= 40) score += 0;
    else if (hct >= 37) score += 2;
    else if (hct >= 34) score += 3;
    else if (hct >= 31) score += 7;
    else score += 9;
    
    // Creatinine clearance scoring
    if (ccr > 120) score += 0;
    else if (ccr > 90) score += 2;
    else if (ccr > 60) score += 5;
    else if (ccr > 30) score += 8;
    else if (ccr > 15) score += 13;
    else score += 17;
    
    // Heart rate scoring
    if (hr < 71) score += 0;
    else if (hr < 81) score += 1;
    else if (hr < 91) score += 3;
    else if (hr < 101) score += 6;
    else if (hr < 111) score += 8;
    else if (hr < 121) score += 10;
    else score += 11;
    
    // Blood pressure scoring
    if (sbp >= 141) score += 0;
    else if (sbp >= 121) score += 1;
    else if (sbp >= 101) score += 3;
    else if (sbp >= 91) score += 5;
    else score += 10;
    
    // Sex scoring
    if (sex === 'female') score += 8;
    
    // Additional conditions
    if (document.getElementById('crusade-chf').checked) score += 7;
    if (document.getElementById('crusade-pvd').checked) score += 6;
    if (document.getElementById('crusade-diabetes').checked) score += 6;
    
    // Risk categorization
    let riskLevel, color, bleedingRisk;
    if (score <= 20) {
        riskLevel = 'Very Low Risk';
        color = '#16a34a';
        bleedingRisk = '3.1%';
    } else if (score <= 30) {
        riskLevel = 'Low Risk';
        color = '#22c55e';
        bleedingRisk = '5.5%';
    } else if (score <= 40) {
        riskLevel = 'Moderate Risk';
        color = '#eab308';
        bleedingRisk = '8.6%';
    } else if (score <= 50) {
        riskLevel = 'High Risk';
        color = '#f97316';
        bleedingRisk = '11.9%';
    } else {
        riskLevel = 'Very High Risk';
        color = '#dc2626';
        bleedingRisk = '19.5%';
    }
    
    document.getElementById('crusade-result').innerHTML = `
        <h4 style="color: ${color}">CRUSADE Score: ${score}</h4>
        <p><strong>Bleeding Risk:</strong> ${riskLevel}</p>
        <p><strong>Major bleeding risk:</strong> ${bleedingRisk}</p>
        <div class="risk-interpretation">
            <p><strong>Clinical implications:</strong></p>
            <ul>
                <li>Consider bleeding risk vs thrombotic benefit</li>
                <li>High risk patients may benefit from shorter dual antiplatelet therapy</li>
                <li>Consider radial approach for procedures</li>
            </ul>
        </div>
    `;
};

// PHQ-9 Calculation
MLAQuizApp.prototype.calculatePHQ9 = function() {
    let totalScore = 0;
    
    for (let i = 1; i <= 9; i++) {
        const questionValue = document.querySelector(`input[name="phq9-q${i}"]:checked`);
        if (!questionValue) {
            document.getElementById('phq9-result').innerHTML = '<p class="error">Please answer all questions</p>';
            return;
        }
        totalScore += parseInt(questionValue.value);
    }
    
    let severity, color, recommendation;
    if (totalScore <= 4) {
        severity = 'Minimal Depression';
        color = '#16a34a';
        recommendation = 'No treatment needed. Repeat screening as clinically indicated.';
    } else if (totalScore <= 9) {
        severity = 'Mild Depression';
        color = '#22c55e';
        recommendation = 'Watchful waiting. Self-help resources. Consider therapy if no improvement.';
    } else if (totalScore <= 14) {
        severity = 'Moderate Depression';
        color = '#eab308';
        recommendation = 'Treatment warranted. Consider antidepressants or psychotherapy.';
    } else if (totalScore <= 19) {
        severity = 'Moderately Severe Depression';
        color = '#f97316';
        recommendation = 'Active treatment with antidepressants and/or psychotherapy.';
    } else {
        severity = 'Severe Depression';
        color = '#dc2626';
        recommendation = 'Immediate treatment. Consider psychiatry referral. Assess suicide risk.';
    }
    
    document.getElementById('phq9-result').innerHTML = `
        <h4 style="color: ${color}">PHQ-9 Score: ${totalScore}</h4>
        <p><strong>Severity:</strong> ${severity}</p>
        <p><strong>Recommendation:</strong> ${recommendation}</p>
        ${totalScore >= 15 ? '<p style="color: #dc2626;"><strong>⚠️ High risk: Assess for suicidal ideation</strong></p>' : ''}
    `;
};

// GAD-7 Calculation
MLAQuizApp.prototype.calculateGAD7 = function() {
    let totalScore = 0;
    
    for (let i = 1; i <= 7; i++) {
        const value = parseInt(document.getElementById(`gad7-q${i}`).value);
        if (isNaN(value)) {
            document.getElementById('gad7-result').innerHTML = '<p class="error">Please answer all questions</p>';
            return;
        }
        totalScore += value;
    }
    
    let severity, color, recommendation;
    if (totalScore <= 4) {
        severity = 'Minimal Anxiety';
        color = '#16a34a';
        recommendation = 'No treatment needed. Monitor symptoms.';
    } else if (totalScore <= 9) {
        severity = 'Mild Anxiety';
        color = '#22c55e';
        recommendation = 'Mild anxiety. Consider self-help resources or brief therapy.';
    } else if (totalScore <= 14) {
        severity = 'Moderate Anxiety';
        color = '#eab308';
        recommendation = 'Moderate anxiety. Consider therapy or medication.';
    } else {
        severity = 'Severe Anxiety';
        color = '#dc2626';
        recommendation = 'Severe anxiety. Active treatment recommended. Consider specialist referral.';
    }
    
    document.getElementById('gad7-result').innerHTML = `
        <h4 style="color: ${color}">GAD-7 Score: ${totalScore}</h4>
        <p><strong>Severity:</strong> ${severity}</p>
        <p><strong>Recommendation:</strong> ${recommendation}</p>
        <div class="clinical-note">
            <p><strong>Note:</strong> Score ≥10 has good sensitivity and specificity for GAD</p>
        </div>
    `;
};

// Insulin Sliding Scale Calculation
MLAQuizApp.prototype.calculateInsulinSliding = function() {
    const glucose = parseFloat(document.getElementById('insulin-glucose').value);
    const weight = parseFloat(document.getElementById('insulin-weight').value);
    const sensitivity = document.getElementById('insulin-sensitivity').value;
    const critical = document.getElementById('insulin-critical').checked;
    const steroids = document.getElementById('insulin-steroids').checked;
    
    if (!glucose || !weight) {
        document.getElementById('insulin-result').innerHTML = '<p class="error">Please fill in glucose and weight</p>';
        return;
    }
    
    // Calculate insulin sensitivity factor
    let insulinSensitivity = 100; // mmol/L per unit of insulin
    if (sensitivity === 'resistant') insulinSensitivity = 50;
    if (sensitivity === 'sensitive') insulinSensitivity = 150;
    if (critical) insulinSensitivity *= 0.7; // More resistant when critically ill
    if (steroids) insulinSensitivity *= 0.5; // Much more resistant with steroids
    
    // Target glucose
    const targetGlucose = critical ? 7 : 8; // mmol/L
    
    // Calculate correction dose
    const glucoseExcess = glucose - targetGlucose;
    let correctionDose = 0;
    
    if (glucoseExcess > 0) {
        correctionDose = Math.round((glucoseExcess / insulinSensitivity) * weight * 10) / 10;
    }
    
    // Sliding scale recommendations
    let slidingScale = '';
    if (glucose < 4) {
        slidingScale = 'HOLD insulin. Give 15-20g glucose. Recheck in 15 minutes.';
    } else if (glucose < 6) {
        slidingScale = 'Consider holding insulin. Monitor closely.';
    } else if (glucose <= 10) {
        slidingScale = critical ? '1-2 units subcutaneous' : 'No additional insulin needed';
    } else if (glucose <= 15) {
        slidingScale = `2-4 units subcutaneous (calculated: ${correctionDose} units)`;
    } else if (glucose <= 20) {
        slidingScale = `4-6 units subcutaneous (calculated: ${correctionDose} units)`;
    } else {
        slidingScale = `6-8 units subcutaneous (calculated: ${correctionDose} units). Consider IV insulin if >25 mmol/L`;
    }
    
    document.getElementById('insulin-result').innerHTML = `
        <h4>Insulin Sliding Scale Recommendation</h4>
        <p><strong>Current glucose:</strong> ${glucose} mmol/L</p>
        <p><strong>Target glucose:</strong> ${targetGlucose} mmol/L</p>
        <p><strong>Calculated correction:</strong> ${correctionDose} units</p>
        <p><strong>Sliding scale:</strong> ${slidingScale}</p>
        <div class="clinical-note">
            <p><strong>Notes:</strong></p>
            <ul>
                <li>Recheck glucose in 1-2 hours after subcutaneous insulin</li>
                <li>Consider continuous IV insulin if glucose consistently >15 mmol/L</li>
                <li>Adjust doses based on response and clinical condition</li>
            </ul>
        </div>
    `;
};

// Vasopressor Calculation
MLAQuizApp.prototype.calculateVasopressor = function() {
    const weight = parseFloat(document.getElementById('vaso-weight').value);
    const drug = document.getElementById('vaso-drug').value;
    const dose = parseFloat(document.getElementById('vaso-dose').value);
    const concentration = parseFloat(document.getElementById('vaso-concentration').value);
    
    if (!weight || !dose || !concentration) {
        document.getElementById('vaso-result').innerHTML = '<p class="error">Please fill in all fields</p>';
        return;
    }
    
    // Calculate infusion rate
    // Dose (mcg/kg/min) × Weight (kg) × 60 (min/hr) ÷ [Concentration (mg/ml) × 1000 (mcg/mg)] = ml/hr
    const infusionRate = (dose * weight * 60) / (concentration * 1000);
    
    // Drug-specific information
    let drugInfo = '';
    switch(drug) {
        case 'noradrenaline':
            drugInfo = 'Noradrenaline: First-line vasopressor for shock. Typical range 0.01-3 mcg/kg/min';
            break;
        case 'adrenaline':
            drugInfo = 'Adrenaline: Second-line for refractory shock. Typical range 0.01-1 mcg/kg/min';
            break;
        case 'dopamine':
            drugInfo = 'Dopamine: Consider if bradycardia. Typical range 5-20 mcg/kg/min';
            break;
        case 'dobutamine':
            drugInfo = 'Dobutamine: Inotrope for cardiogenic shock. Typical range 2.5-15 mcg/kg/min';
            break;
        case 'vasopressin':
            drugInfo = 'Vasopressin: Fixed dose 0.01-0.04 units/min (not weight-based)';
            break;
    }
    
    document.getElementById('vaso-result').innerHTML = `
        <h4>Vasopressor Infusion Calculation</h4>
        <p><strong>Drug:</strong> ${drug.charAt(0).toUpperCase() + drug.slice(1)}</p>
        <p><strong>Dose:</strong> ${dose} mcg/kg/min</p>
        <p><strong>Weight:</strong> ${weight} kg</p>
        <p><strong>Concentration:</strong> ${concentration} mg/ml</p>
        <h5 style="color: #007AFF;">Infusion Rate: ${infusionRate.toFixed(1)} ml/hr</h5>
        <div class="clinical-note">
            <p><strong>${drugInfo}</strong></p>
            <p><strong>Safety notes:</strong></p>
            <ul>
                <li>Use central venous access when possible</li>
                <li>Titrate to MAP >65 mmHg or clinical endpoints</li>
                <li>Monitor for arrhythmias and tissue ischemia</li>
                <li>Wean gradually when shock resolves</li>
            </ul>
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

// Emergency Protocols Database
const emergencyProtocols = {
    'acls-vf-vt': {
        name: 'ACLS: VF/VT',
        category: 'cardiac',
        urgency: 'emergency',
        steps: [
            'Verify unresponsiveness and no normal breathing',
            'Begin CPR: 30:2 compressions to ventilations',
            'Attach defibrillator/monitor',
            'Check rhythm - VF/VT confirmed',
            'Charge defibrillator to 200J (biphasic)',
            'Clear area and deliver shock',
            'Resume CPR immediately for 2 minutes',
            'Check rhythm - if VF/VT persists, repeat shock',
            'Give Adrenaline 1mg IV/IO after 2nd shock',
            'Give Amiodarone 300mg IV/IO after 3rd shock',
            'Continue cycles until ROSC or exhaustion'
        ],
        drugs: ['Adrenaline 1mg IV/IO every 3-5 minutes', 'Amiodarone 300mg IV/IO (then 150mg if needed)'],
        ukGuideline: 'Resuscitation Council UK 2021',
        criticalActions: ['High-quality CPR', 'Minimise interruptions', 'Consider reversible causes (4Hs 4Ts)']
    },
    'acls-pea-asystole': {
        name: 'ACLS: PEA/Asystole',
        category: 'cardiac',
        urgency: 'emergency',
        steps: [
            'Verify unresponsiveness and no normal breathing',
            'Begin CPR: 30:2 compressions to ventilations',
            'Attach defibrillator/monitor',
            'Check rhythm - PEA/Asystole confirmed',
            'Continue CPR for 2 minutes',
            'Give Adrenaline 1mg IV/IO as soon as possible',
            'Check rhythm every 2 minutes',
            'Repeat Adrenaline every 3-5 minutes',
            'Treat reversible causes aggressively',
            'Continue until ROSC or exhaustion'
        ],
        drugs: ['Adrenaline 1mg IV/IO every 3-5 minutes'],
        ukGuideline: 'Resuscitation Council UK 2021',
        criticalActions: ['High-quality CPR', 'Identify and treat reversible causes', 'Consider mechanical CPR device']
    },
    'sepsis-six': {
        name: 'Sepsis 6 Bundle',
        category: 'sepsis',
        urgency: 'emergency',
        steps: [
            'Give high-flow oxygen (aim SpO2 94-98%)',
            'Take blood cultures (and other cultures)',
            'Give IV antibiotics within 1 hour',
            'Give IV fluid resuscitation if hypotensive',
            'Check lactate levels',
            'Monitor urine output (aim >0.5ml/kg/hr)'
        ],
        drugs: ['Broad-spectrum antibiotics within 1 hour', '30ml/kg crystalloid if hypotensive'],
        ukGuideline: 'NICE NG51',
        criticalActions: ['Time-critical delivery', 'Source control', 'Early escalation to critical care']
    },
    'major-trauma': {
        name: 'Major Trauma Protocol',
        category: 'trauma',
        urgency: 'emergency',
        steps: [
            'Primary survey: A-B-C-D-E',
            'Airway with C-spine control',
            'Breathing - chest examination, O2',
            'Circulation - control bleeding, IV access',
            'Disability - neurological assessment',
            'Exposure - full examination, prevent hypothermia',
            'Team leader to coordinate care',
            'Activate major trauma team',
            'CT trauma series if stable',
            'Damage control surgery if unstable'
        ],
        drugs: ['Tranexamic acid 1g IV if bleeding', 'Blood products as per massive transfusion protocol'],
        ukGuideline: 'NICE NG39',
        criticalActions: ['Stop catastrophic bleeding', 'Prevent hypothermia', 'Rapid decision making']
    },
    'anaphylaxis': {
        name: 'Anaphylaxis Management',
        category: 'respiratory',
        urgency: 'emergency',
        steps: [
            'Remove/avoid trigger if possible',
            'Call for help immediately',
            'Give Adrenaline 500mcg IM (0.5ml 1:1000)',
            'Lie patient flat with legs raised',
            'High-flow oxygen (15L via non-rebreather)',
            'Establish IV access',
            'Give IV fluids if hypotensive',
            'Repeat Adrenaline after 5 minutes if no improvement',
            'Give Chlorphenamine 10mg IV/IM',
            'Give Hydrocortisone 200mg IV/IM'
        ],
        drugs: ['Adrenaline 500mcg IM (repeat if needed)', 'Chlorphenamine 10mg IV/IM', 'Hydrocortisone 200mg IV/IM'],
        ukGuideline: 'Resuscitation Council UK 2021',
        criticalActions: ['Early Adrenaline', 'Airway management', 'Fluid resuscitation']
    },
    'dka-protocol': {
        name: 'DKA Management',
        category: 'metabolic',
        urgency: 'emergency',
        steps: [
            'Confirm diagnosis: glucose >11mmol/L, ketones >3mmol/L, pH <7.3',
            'Start IV fluids: 0.9% saline 1L over 1 hour',
            'Start fixed-rate insulin infusion: 0.1 units/kg/hr',
            'Replace potassium as guided by levels',
            'Monitor blood glucose, ketones, pH hourly',
            'When glucose <14mmol/L, add 10% dextrose',
            'Continue until ketones <0.6mmol/L and pH >7.3',
            'Identify and treat precipitating cause',
            'Convert to subcutaneous insulin when stable'
        ],
        drugs: ['0.9% saline', 'Insulin (Actrapid) 0.1 units/kg/hr', 'Potassium replacement'],
        ukGuideline: 'Joint British Diabetes Societies 2013',
        criticalActions: ['Fluid replacement', 'Insulin therapy', 'Potassium monitoring', 'Identify precipitant']
    },
    'hhs-protocol': {
        name: 'HHS Management',
        category: 'metabolic',
        urgency: 'emergency',
        steps: [
            'Confirm diagnosis: glucose >30mmol/L, osmolality >320mOsm/kg',
            'Calculate fluid deficit (usually 8-12L)',
            'Start 0.9% saline 15-20ml/kg over first hour',
            'Continue fluid replacement over 24-48 hours',
            'Start insulin only when glucose stops falling with fluids',
            'Insulin rate: 0.05 units/kg/hr (half DKA rate)',
            'Replace potassium carefully',
            'Monitor for cerebral oedema',
            'Anticoagulation (LMWH) unless contraindicated'
        ],
        drugs: ['0.9% saline (large volumes)', 'Insulin (lower rate than DKA)', 'LMWH prophylaxis'],
        ukGuideline: 'Joint British Diabetes Societies 2012',
        criticalActions: ['Careful fluid replacement', 'Lower insulin doses', 'Thromboprophylaxis']
    }
};

// Emergency Protocols Functions
MLAQuizApp.prototype.loadEmergencyProtocols = function() {
    const container = document.getElementById('emergency-protocols-container');
    if (!container) return;
    
    // Setup category filtering
    this.setupEmergencyProtocolsSearch();
    
    // Display all protocols initially
    this.displayEmergencyProtocols(Object.keys(emergencyProtocols));
};

MLAQuizApp.prototype.setupEmergencyProtocolsSearch = function() {
    const categoryBtns = document.querySelectorAll('.emergency-categories .category-btn');
    
    const filterProtocols = () => {
        const activeCategory = document.querySelector('.emergency-categories .category-btn.active')?.dataset.category || 'all';
        
        let filteredProtocols = Object.keys(emergencyProtocols);
        
        if (activeCategory !== 'all') {
            filteredProtocols = filteredProtocols.filter(protocolId => 
                emergencyProtocols[protocolId].category === activeCategory
            );
        }
        
        this.displayEmergencyProtocols(filteredProtocols);
    };
    
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent medical tools panel from closing
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterProtocols();
        });
    });
};

MLAQuizApp.prototype.displayEmergencyProtocols = function(protocolIds) {
    const container = document.getElementById('emergency-protocols-container');
    if (!container) return;
    
    if (protocolIds.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h3>🚨 No protocols found</h3>
                <p>Try adjusting your category filter.</p>
            </div>
        `;
        return;
    }
    
    // Sort by urgency (emergency first) then alphabetically
    const urgencyOrder = { 'emergency': 0, 'high': 1, 'moderate': 2, 'low': 3 };
    const sortedProtocolIds = protocolIds.sort((a, b) => {
        const protocolA = emergencyProtocols[a];
        const protocolB = emergencyProtocols[b];
        
        const urgencyDiff = urgencyOrder[protocolA.urgency] - urgencyOrder[protocolB.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        
        return protocolA.name.localeCompare(protocolB.name);
    });
    
    const protocolsHtml = sortedProtocolIds.map(protocolId => {
        const protocol = emergencyProtocols[protocolId];
        const urgencyClass = protocol.urgency === 'emergency' ? 'emergency' : 'standard';
        
        return `
            <div class="protocol-item ${urgencyClass}" onclick="window.quizApp.showProtocolDetail('${protocolId}'); event.stopPropagation();">
                <div class="protocol-header">
                    <h4>${protocol.name}</h4>
                    <span class="protocol-urgency ${protocol.urgency}">${protocol.urgency.toUpperCase()}</span>
                </div>
                <div class="protocol-meta">
                    <span class="protocol-category">${protocol.category}</span>
                    <span class="protocol-guideline">${protocol.ukGuideline}</span>
                </div>
                <div class="protocol-actions">
                    ${protocol.criticalActions.slice(0, 2).map(action => 
                        `<span class="action-tag">${action}</span>`
                    ).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = protocolsHtml;
};

MLAQuizApp.prototype.showProtocolDetail = function(protocolId) {
    const protocol = emergencyProtocols[protocolId];
    if (!protocol) return;
    
    const container = document.getElementById('emergency-protocols-container');
    if (!container) return;
    
    const detailHtml = `
        <div class="protocol-detail" onclick="event.stopPropagation();">
            <div class="protocol-detail-header">
                <button class="back-btn" onclick="window.quizApp.loadEmergencyProtocols(); event.stopPropagation();">← Back to Protocols</button>
                <h3>${protocol.name}</h3>
                <span class="protocol-urgency ${protocol.urgency}">${protocol.urgency.toUpperCase()}</span>
            </div>
            
            <div class="protocol-steps">
                <h4>📋 Protocol Steps</h4>
                <ol class="step-list">
                    ${protocol.steps.map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>
            
            <div class="protocol-drugs">
                <h4>💊 Key Medications</h4>
                <ul class="drug-list">
                    ${protocol.drugs.map(drug => `<li>${drug}</li>`).join('')}
                </ul>
            </div>
            
            <div class="protocol-actions">
                <h4>⚠️ Critical Actions</h4>
                <ul class="action-list">
                    ${protocol.criticalActions.map(action => `<li>${action}</li>`).join('')}
                </ul>
            </div>
            
            <div class="protocol-guideline">
                <h4>📚 UK Guideline</h4>
                <p>${protocol.ukGuideline}</p>
            </div>
        </div>
    `;
    
    container.innerHTML = detailHtml;
};

// Interpretation Tools Database
const interpretationTools = {
    'ecg-basic': {
        name: 'ECG Interpretation Guide',
        category: 'ecg',
        type: 'systematic',
        steps: [
            'Rate: Count QRS complexes (300/large squares or 1500/small squares)',
            'Rhythm: Regular or irregular? P waves present?',
            'Axis: Normal (-30° to +90°), left or right deviation?',
            'P waves: Present before each QRS? Normal morphology?',
            'PR interval: 120-200ms (3-5 small squares)',
            'QRS width: <120ms (3 small squares) = narrow',
            'ST segments: Elevated (>1mm) or depressed?',
            'T waves: Upright in I, II, V3-V6? Inverted elsewhere?',
            'QT interval: <440ms (men), <460ms (women)',
            'Additional: Q waves, bundle branch blocks, etc.'
        ],
        normalValues: {
            'Heart Rate': '60-100 bpm',
            'PR Interval': '120-200ms',
            'QRS Width': '<120ms',
            'QT Interval': '<440ms (♂), <460ms (♀)'
        },
        commonAbnormalities: [
            'STEMI: ST elevation ≥1mm in ≥2 contiguous leads',
            'NSTEMI: ST depression, T wave inversion',
            'AF: Irregularly irregular, absent P waves',
            'Heart Block: Prolonged PR, dropped beats, AV dissociation'
        ]
    },
    'abg-interpretation': {
        name: 'ABG Interpretation',
        category: 'abg',
        type: 'systematic',
        steps: [
            'Check pH: Acidotic (<7.35) or alkalotic (>7.45)?',
            'Primary disorder: Respiratory (CO2) or metabolic (HCO3)?',
            'Compensation: Appropriate for primary disorder?',
            'Oxygenation: PaO2 adequate for FiO2?',
            'Calculate A-a gradient if hypoxic',
            'Check electrolytes: Na+, K+, Cl-, lactate'
        ],
        normalValues: {
            'pH': '7.35-7.45',
            'PaCO2': '4.7-6.0 kPa (35-45 mmHg)',
            'PaO2': '>10 kPa (75 mmHg) on air',
            'HCO3-': '22-28 mmol/L',
            'Base Excess': '-2 to +2 mmol/L'
        },
        compensation: {
            'Metabolic Acidosis': 'Expected pCO2 = 1.5 × [HCO3] + 8 (±2)',
            'Metabolic Alkalosis': 'Expected pCO2 = 0.7 × [HCO3] + 21 (±2)',
            'Respiratory Acidosis': 'Acute: HCO3 ↑ by 1 per 10 pCO2 ↑',
            'Respiratory Alkalosis': 'Acute: HCO3 ↓ by 2 per 10 pCO2 ↓'
        }
    },
    'chest-xray': {
        name: 'Chest X-Ray Systematic Review',
        category: 'imaging',
        type: 'systematic',
        steps: [
            'Patient details: Name, date, orientation (PA/AP/lateral)',
            'Quality: Adequate inspiration (ribs 5-7 visible)? Rotation?',
            'Airways: Trachea central? Carina visible?',
            'Breathing: Lung fields clear? Pneumothorax?',
            'Circulation: Heart size (<50% thoracic width)? Mediastinum?',
            'Disability: Bones intact? Soft tissues normal?',
            'Everything else: Lines, tubes, pacemakers, etc.',
            'Review areas: Behind heart, costophrenic angles'
        ],
        commonFindings: [
            'Consolidation: Air space opacification with air bronchograms',
            'Pneumothorax: Pleural line with absent lung markings',
            'Pleural effusion: Costophrenic angle blunting, meniscus sign',
            'Pulmonary oedema: Bilateral alveolar infiltrates, Kerley B lines'
        ],
        redFlags: [
            'Tension pneumothorax: Mediastinal shift away',
            'Massive PE: Right heart strain, oligaemia',
            'Aortic dissection: Widened mediastinum'
        ]
    },
    'ct-head': {
        name: 'CT Head Interpretation',
        category: 'imaging',
        type: 'systematic',
        steps: [
            'Patient details and clinical context',
            'Image quality: Motion artefact? Contrast given?',
            'Blood: High density (hyperdense) areas?',
            'Brain parenchyma: Symmetry? Grey-white differentiation?',
            'CSF spaces: Ventricles, sulci, cisterns normal?',
            'Bones: Skull fractures? Soft tissue swelling?',
            'Midline shift: >5mm suggests raised ICP',
            'Mass effect: Compression of ventricles/cisterns?'
        ],
        densities: {
            'Hyperdense': 'Fresh blood, calcification, metal',
            'Isodense': 'Normal brain tissue',
            'Hypodense': 'Oedema, old infarct, CSF'
        },
        emergencyFindings: [
            'Acute bleed: Hyperdense area in brain/ventricles',
            'Mass effect: Midline shift, compressed ventricles',
            'Herniation: Loss of cisterns, uncal herniation',
            'Hydrocephalus: Enlarged ventricles'
        ]
    }
};

// Interpretation Tools Functions
MLAQuizApp.prototype.loadInterpretationTools = function() {
    const container = document.getElementById('interpretation-container');
    if (!container) return;
    
    // Setup category filtering
    this.setupInterpretationSearch();
    
    // Display all tools initially
    this.displayInterpretationTools(Object.keys(interpretationTools));
};

MLAQuizApp.prototype.setupInterpretationSearch = function() {
    const categoryBtns = document.querySelectorAll('.interpretation-categories .category-btn');
    
    const filterTools = () => {
        const activeCategory = document.querySelector('.interpretation-categories .category-btn.active')?.dataset.category || 'all';
        
        let filteredTools = Object.keys(interpretationTools);
        
        if (activeCategory !== 'all') {
            filteredTools = filteredTools.filter(toolId => 
                interpretationTools[toolId].category === activeCategory
            );
        }
        
        this.displayInterpretationTools(filteredTools);
    };
    
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent medical tools panel from closing
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterTools();
        });
    });
};

MLAQuizApp.prototype.displayInterpretationTools = function(toolIds) {
    const container = document.getElementById('interpretation-container');
    if (!container) return;
    
    if (toolIds.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h3>📋 No interpretation tools found</h3>
                <p>Try adjusting your category filter.</p>
            </div>
        `;
        return;
    }
    
    const toolsHtml = toolIds.map(toolId => {
        const tool = interpretationTools[toolId];
        
        return `
            <div class="interpretation-item" onclick="window.quizApp.showInterpretationDetail('${toolId}'); event.stopPropagation();">
                <div class="interpretation-header">
                    <h4>${tool.name}</h4>
                    <span class="interpretation-type">${tool.type}</span>
                </div>
                <div class="interpretation-meta">
                    <span class="interpretation-category">${tool.category}</span>
                    <span class="step-count">${tool.steps.length} steps</span>
                </div>
                <div class="interpretation-preview">
                    ${tool.steps.slice(0, 2).map(step => 
                        `<div class="step-preview">• ${step}</div>`
                    ).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = toolsHtml;
};

MLAQuizApp.prototype.showInterpretationDetail = function(toolId) {
    const tool = interpretationTools[toolId];
    if (!tool) return;
    
    const container = document.getElementById('interpretation-container');
    if (!container) return;
    
    let additionalSections = '';
    
    if (tool.normalValues) {
        additionalSections += `
            <div class="normal-values">
                <h4>📊 Normal Values</h4>
                <ul class="values-list">
                    ${Object.entries(tool.normalValues).map(([key, value]) => 
                        `<li><strong>${key}:</strong> ${value}</li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }
    
    if (tool.commonAbnormalities) {
        additionalSections += `
            <div class="common-abnormalities">
                <h4>⚠️ Common Abnormalities</h4>
                <ul class="abnormalities-list">
                    ${tool.commonAbnormalities.map(abnormality => `<li>${abnormality}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (tool.compensation) {
        additionalSections += `
            <div class="compensation-rules">
                <h4>⚖️ Compensation Rules</h4>
                <ul class="compensation-list">
                    ${Object.entries(tool.compensation).map(([key, value]) => 
                        `<li><strong>${key}:</strong> ${value}</li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }
    
    if (tool.emergencyFindings) {
        additionalSections += `
            <div class="emergency-findings">
                <h4>🚨 Emergency Findings</h4>
                <ul class="emergency-list">
                    ${tool.emergencyFindings.map(finding => `<li>${finding}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (tool.redFlags) {
        additionalSections += `
            <div class="red-flags">
                <h4>🚩 Red Flags</h4>
                <ul class="red-flags-list">
                    ${tool.redFlags.map(flag => `<li>${flag}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (tool.commonFindings) {
        additionalSections += `
            <div class="common-findings">
                <h4>🔍 Common Findings</h4>
                <ul class="findings-list">
                    ${tool.commonFindings.map(finding => `<li>${finding}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (tool.densities) {
        additionalSections += `
            <div class="densities">
                <h4>📷 CT Densities</h4>
                <ul class="densities-list">
                    ${Object.entries(tool.densities).map(([key, value]) => 
                        `<li><strong>${key}:</strong> ${value}</li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }
    
    const detailHtml = `
        <div class="interpretation-detail" onclick="event.stopPropagation();">
            <div class="interpretation-detail-header">
                <button class="back-btn" onclick="window.quizApp.loadInterpretationTools(); event.stopPropagation();">← Back to Interpretation Tools</button>
                <h3>${tool.name}</h3>
                <span class="interpretation-type">${tool.type}</span>
            </div>
            
            <div class="interpretation-steps">
                <h4>📋 Systematic Approach</h4>
                <ol class="step-list">
                    ${tool.steps.map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>
            
            ${additionalSections}
        </div>
    `;
    
    container.innerHTML = detailHtml;
};

// Missing Calculator Implementations

// Paediatric Dosing Calculator
MLAQuizApp.prototype.getPaediatricDosingCalculator = function() {
    return `
        <div class="calculator-form">
            <h4>Paediatric Dosing Calculator</h4>
            <p><small>Weight-based pediatric drug dosing calculations</small></p>
            
            <div class="calc-input-group">
                <label>Child's Weight (kg):</label>
                <input type="number" id="paed-weight" placeholder="15" min="1" max="100" step="0.1">
            </div>
            <div class="calc-input-group">
                <label>Child's Age (years):</label>
                <input type="number" id="paed-age" placeholder="5" min="0" max="18" step="0.1">
            </div>
            <div class="calc-input-group">
                <label>Medication:</label>
                <select id="paed-medication">
                    <option value="">Select medication</option>
                    <option value="paracetamol">Paracetamol (Acetaminophen)</option>
                    <option value="ibuprofen">Ibuprofen</option>
                    <option value="amoxicillin">Amoxicillin</option>
                    <option value="prednisolone">Prednisolone</option>
                    <option value="salbutamol">Salbutamol</option>
                    <option value="azithromycin">Azithromycin</option>
                </select>
            </div>
            
            <button onclick="window.quizApp.calculatePaediatricDosing()">Calculate Dose</button>
            <div id="paed-dosing-result" class="calc-result"></div>
            
            <div class="calc-reference">
                <small><strong>Note:</strong> Always verify doses with current pediatric guidelines. For children under 3 months, seek specialist advice.</small>
            </div>
        </div>
    `;
};

// Infusion Rate Calculator
MLAQuizApp.prototype.getInfusionRateCalculator = function() {
    return `
        <div class="calculator-form">
            <h4>IV Infusion Rate Calculator</h4>
            <p><small>Calculate infusion rates for IV medications and fluids</small></p>
            
            <div class="calc-input-group">
                <label>Total Volume (ml):</label>
                <input type="number" id="infusion-volume" placeholder="1000" min="1" max="10000">
            </div>
            <div class="calc-input-group">
                <label>Infusion Time (hours):</label>
                <input type="number" id="infusion-time" placeholder="8" min="0.1" max="24" step="0.1">
            </div>
            <div class="calc-input-group">
                <label>Drop Factor (drops/ml):</label>
                <select id="drop-factor">
                    <option value="10">10 (Blood set)</option>
                    <option value="15">15 (Standard)</option>
                    <option value="20" selected>20 (Standard)</option>
                    <option value="60">60 (Micro-drip)</option>
                </select>
            </div>
            
            <button onclick="window.quizApp.calculateInfusionRate()">Calculate Rate</button>
            <div id="infusion-result" class="calc-result"></div>
            
            <div class="calc-reference">
                <small><strong>Formula:</strong> Rate (ml/hr) = Volume / Time; Drops/min = (Volume × Drop Factor) / (Time × 60)</small>
            </div>
        </div>
    `;
};

// Cockcroft-Gault Calculator
MLAQuizApp.prototype.getCockcroftGaultCalculator = function() {
    return `
        <div class="calculator-form">
            <h4>Cockcroft-Gault eGFR Calculator</h4>
            <p><small>Estimate creatinine clearance based on age, weight, and serum creatinine</small></p>
            
            <div class="calc-input-group">
                <label>Age (years):</label>
                <input type="number" id="cg-age" placeholder="65" min="18" max="120">
            </div>
            <div class="calc-input-group">
                <label>Weight (kg):</label>
                <input type="number" id="cg-weight" placeholder="70" min="30" max="200" step="0.1">
            </div>
            <div class="calc-input-group">
                <label>Serum Creatinine (μmol/L):</label>
                <input type="number" id="cg-creatinine" placeholder="100" min="50" max="1000">
            </div>
            <div class="calc-checkbox-group">
                <label><input type="radio" name="cg-sex" value="male" checked> Male</label>
                <label><input type="radio" name="cg-sex" value="female"> Female</label>
            </div>
            
            <button onclick="window.quizApp.calculateCockcroftGault()">Calculate eGFR</button>
            <div id="cg-result" class="calc-result"></div>
            
            <div class="calc-reference">
                <small><strong>Formula:</strong> CrCl = ((140-age) × weight × K) / creatinine<br>
                K = 1.23 (male), 1.04 (female)</small>
            </div>
        </div>
    `;
};

// Body Surface Area Calculator
MLAQuizApp.prototype.getBSACalculator = function() {
    return `
        <div class="calculator-form">
            <h4>Body Surface Area Calculator</h4>
            <p><small>Calculate BSA using Dubois, Mosteller, and Haycock formulas</small></p>
            
            <div class="calc-input-group">
                <label>Weight (kg):</label>
                <input type="number" id="bsa-weight" placeholder="70" min="1" max="300" step="0.1">
            </div>
            <div class="calc-input-group">
                <label>Height (cm):</label>
                <input type="number" id="bsa-height" placeholder="170" min="50" max="250" step="0.1">
            </div>
            
            <button onclick="window.quizApp.calculateBSA()">Calculate BSA</button>
            <div id="bsa-result" class="calc-result"></div>
            
            <div class="calc-reference">
                <small><strong>Formulas:</strong><br>
                • Dubois: 0.007184 × W^0.425 × H^0.725<br>
                • Mosteller: √(W × H / 3600)<br>
                • Haycock: 0.024265 × W^0.5378 × H^0.3964</small>
            </div>
        </div>
    `;
};

// Fluid Balance Calculator
MLAQuizApp.prototype.getFluidBalanceCalculator = function() {
    return `
        <div class="calculator-form">
            <h4>Fluid Balance Calculator</h4>
            <p><small>Calculate daily fluid requirements and monitor fluid balance</small></p>
            
            <div class="calc-input-group">
                <label>Patient Weight (kg):</label>
                <input type="number" id="fluid-weight" placeholder="70" min="1" max="300" step="0.1">
            </div>
            <div class="calc-input-group">
                <label>Age (years):</label>
                <input type="number" id="fluid-age" placeholder="65" min="1" max="120">
            </div>
            <div class="calc-checkbox-group">
                <label><input type="checkbox" id="fluid-fever"> Fever (add 500ml per °C above 37°C)</label>
                <label><input type="checkbox" id="fluid-losses"> Abnormal losses (diarrhea, drains, etc.)</label>
                <label><input type="checkbox" id="fluid-heart-failure"> Heart failure (restrict fluids)</label>
                <label><input type="checkbox" id="fluid-renal"> Renal impairment</label>
            </div>
            <div class="calc-input-group">
                <label>Additional Losses (ml/day):</label>
                <input type="number" id="fluid-additional" placeholder="0" min="0" max="5000">
            </div>
            
            <button onclick="window.quizApp.calculateFluidBalance()">Calculate Requirements</button>
            <div id="fluid-result" class="calc-result"></div>
            
            <div class="calc-reference">
                <small><strong>Basic Formula:</strong> 30-35ml/kg/day for adults, 100ml/kg/day for infants</small>
            </div>
        </div>
    `;
};

// TIMI Risk Score Calculator
MLAQuizApp.prototype.getTIMICalculator = function() {
    return `
        <div class="calculator-form">
            <h4>TIMI Risk Score</h4>
            <p><small>Risk assessment for patients with acute coronary syndromes</small></p>
            
            <div class="calc-checkbox-group">
                <label><input type="checkbox" id="timi-age"> Age ≥65 years (+1)</label>
                <label><input type="checkbox" id="timi-risk-factors"> ≥3 CAD risk factors (+1)</label>
                <label><input type="checkbox" id="timi-known-cad"> Known CAD (stenosis ≥50%) (+1)</label>
                <label><input type="checkbox" id="timi-aspirin"> Aspirin use in prior 7 days (+1)</label>
                <label><input type="checkbox" id="timi-severe-angina"> Severe angina (≥2 episodes in 24h) (+1)</label>
                <label><input type="checkbox" id="timi-st-deviation"> ST deviation ≥0.5mm (+1)</label>
                <label><input type="checkbox" id="timi-cardiac-markers"> Elevated cardiac markers (+1)</label>
            </div>
            
            <button onclick="window.quizApp.calculateTIMI()">Calculate TIMI Score</button>
            <div id="timi-result" class="calc-result"></div>
            
            <div class="calc-reference">
                <small><strong>Risk factors:</strong> Family history, hypertension, hypercholesterolemia, diabetes, current smoker</small>
            </div>
        </div>
    `;
};

// NIH Stroke Scale Calculator
MLAQuizApp.prototype.getNIHSSCalculator = function() {
    return `
        <div class="calculator-form">
            <h4>NIH Stroke Scale (NIHSS)</h4>
            <p><small>Neurological assessment for acute stroke severity</small></p>
            
            <div class="calc-input-group">
                <label>1a. Level of Consciousness:</label>
                <select id="nihss-loc">
                    <option value="0">Alert, responsive (0)</option>
                    <option value="1">Not alert, arousable (1)</option>
                    <option value="2">Not alert, requires stimulation (2)</option>
                    <option value="3">Unresponsive (3)</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>1b. LOC Questions (month, age):</label>
                <select id="nihss-questions">
                    <option value="0">Answers both correctly (0)</option>
                    <option value="1">Answers 1 correctly (1)</option>
                    <option value="2">Answers neither correctly (2)</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>1c. LOC Commands (open/close eyes, grip):</label>
                <select id="nihss-commands">
                    <option value="0">Performs both correctly (0)</option>
                    <option value="1">Performs 1 correctly (1)</option>
                    <option value="2">Performs neither correctly (2)</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>2. Best Gaze:</label>
                <select id="nihss-gaze">
                    <option value="0">Normal (0)</option>
                    <option value="1">Partial gaze palsy (1)</option>
                    <option value="2">Forced deviation (2)</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>3. Visual Fields:</label>
                <select id="nihss-visual">
                    <option value="0">No visual loss (0)</option>
                    <option value="1">Partial hemianopia (1)</option>
                    <option value="2">Complete hemianopia (2)</option>
                    <option value="3">Bilateral hemianopia (3)</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>4. Facial Palsy:</label>
                <select id="nihss-facial">
                    <option value="0">Normal (0)</option>
                    <option value="1">Minor paralysis (1)</option>
                    <option value="2">Partial paralysis (2)</option>
                    <option value="3">Complete paralysis (3)</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>5a. Motor Arm - Left:</label>
                <select id="nihss-arm-left">
                    <option value="0">No drift (0)</option>
                    <option value="1">Drift (1)</option>
                    <option value="2">Some effort against gravity (2)</option>
                    <option value="3">No effort against gravity (3)</option>
                    <option value="4">No movement (4)</option>
                    <option value="9">Amputation/joint fusion (9)</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>5b. Motor Arm - Right:</label>
                <select id="nihss-arm-right">
                    <option value="0">No drift (0)</option>
                    <option value="1">Drift (1)</option>
                    <option value="2">Some effort against gravity (2)</option>
                    <option value="3">No effort against gravity (3)</option>
                    <option value="4">No movement (4)</option>
                    <option value="9">Amputation/joint fusion (9)</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>6a. Motor Leg - Left:</label>
                <select id="nihss-leg-left">
                    <option value="0">No drift (0)</option>
                    <option value="1">Drift (1)</option>
                    <option value="2">Some effort against gravity (2)</option>
                    <option value="3">No effort against gravity (3)</option>
                    <option value="4">No movement (4)</option>
                    <option value="9">Amputation/joint fusion (9)</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>6b. Motor Leg - Right:</label>
                <select id="nihss-leg-right">
                    <option value="0">No drift (0)</option>
                    <option value="1">Drift (1)</option>
                    <option value="2">Some effort against gravity (2)</option>
                    <option value="3">No effort against gravity (3)</option>
                    <option value="4">No movement (4)</option>
                    <option value="9">Amputation/joint fusion (9)</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>7. Limb Ataxia:</label>
                <select id="nihss-ataxia">
                    <option value="0">Absent (0)</option>
                    <option value="1">Present in one limb (1)</option>
                    <option value="2">Present in two limbs (2)</option>
                    <option value="9">Unable to test (9)</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>8. Sensory:</label>
                <select id="nihss-sensory">
                    <option value="0">Normal (0)</option>
                    <option value="1">Mild-moderate loss (1)</option>
                    <option value="2">Severe/total loss (2)</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>9. Best Language:</label>
                <select id="nihss-language">
                    <option value="0">No aphasia (0)</option>
                    <option value="1">Mild-moderate aphasia (1)</option>
                    <option value="2">Severe aphasia (2)</option>
                    <option value="3">Mute/global aphasia (3)</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>10. Dysarthria:</label>
                <select id="nihss-dysarthria">
                    <option value="0">Normal (0)</option>
                    <option value="1">Mild-moderate (1)</option>
                    <option value="2">Severe (2)</option>
                    <option value="9">Intubated/unable to test (9)</option>
                </select>
            </div>
            <div class="calc-input-group">
                <label>11. Extinction/Inattention:</label>
                <select id="nihss-extinction">
                    <option value="0">No abnormality (0)</option>
                    <option value="1">Visual/tactile/auditory extinction (1)</option>
                    <option value="2">Profound hemi-inattention (2)</option>
                </select>
            </div>
            
            <button onclick="window.quizApp.calculateNIHSS()">Calculate NIHSS Score</button>
            <div id="nihss-result" class="calc-result"></div>
            
            <div class="calc-reference">
                <small><strong>Interpretation:</strong> 0 = Normal, 1-4 = Minor, 5-15 = Moderate, 16-20 = Moderate-severe, 21-42 = Severe</small>
            </div>
        </div>
    `;
};

// Modified Rankin Scale Calculator
MLAQuizApp.prototype.getModifiedRankinCalculator = function() {
    return `
        <div class="calculator-form">
            <h4>Modified Rankin Scale</h4>
            <p><small>Assessment of functional disability after stroke</small></p>
            
            <div class="calc-input-group">
                <label>Patient Functional Status:</label>
                <select id="rankin-score">
                    <option value="0">0 - No symptoms</option>
                    <option value="1">1 - No significant disability (minor symptoms)</option>
                    <option value="2">2 - Slight disability (unable to do all previous activities)</option>
                    <option value="3">3 - Moderate disability (requires some help, walks unassisted)</option>
                    <option value="4">4 - Moderately severe disability (unable to walk unassisted)</option>
                    <option value="5">5 - Severe disability (requires constant care, bedridden)</option>
                    <option value="6">6 - Dead</option>
                </select>
            </div>
            
            <button onclick="window.quizApp.calculateModifiedRankin()">Assess Functional Status</button>
            <div id="rankin-result" class="calc-result"></div>
            
            <div class="calc-reference">
                <small><strong>Used for:</strong> Measuring degree of disability/dependence in daily activities. Lower scores indicate better outcomes.</small>
            </div>
        </div>
    `;
};

// Calculation Functions for Missing Calculators

// Paediatric Dosing Calculation
MLAQuizApp.prototype.calculatePaediatricDosing = function() {
    const weight = parseFloat(document.getElementById('paed-weight').value);
    const age = parseFloat(document.getElementById('paed-age').value);
    const medication = document.getElementById('paed-medication').value;
    
    if (!weight || !age || !medication) {
        document.getElementById('paed-dosing-result').innerHTML = 
            '<div class="alert alert-warning">Please fill in all fields</div>';
        return;
    }
    
    const dosing = {
        'paracetamol': {
            dose: '15 mg/kg',
            frequency: 'every 4-6 hours',
            maxDaily: '60 mg/kg/day',
            maxSingle: '1g',
            route: 'PO/IV'
        },
        'ibuprofen': {
            dose: '5-10 mg/kg',
            frequency: 'every 6-8 hours',
            maxDaily: '30 mg/kg/day',
            maxSingle: '400mg',
            route: 'PO'
        },
        'amoxicillin': {
            dose: '20-40 mg/kg',
            frequency: 'every 8 hours',
            maxDaily: '90 mg/kg/day',
            maxSingle: '1g',
            route: 'PO'
        },
        'prednisolone': {
            dose: '1-2 mg/kg',
            frequency: 'once daily',
            maxDaily: '60 mg/day',
            maxSingle: '60mg',
            route: 'PO'
        },
        'salbutamol': {
            dose: '100-200 mcg (1-2 puffs)',
            frequency: 'every 4-6 hours PRN',
            maxDaily: '8 puffs/day',
            maxSingle: '200mcg',
            route: 'Inhaled'
        },
        'azithromycin': {
            dose: '10 mg/kg',
            frequency: 'once daily for 3 days',
            maxDaily: '500 mg/day',
            maxSingle: '500mg',
            route: 'PO'
        }
    };
    
    const drug = dosing[medication];
    const doseValue = parseFloat(drug.dose.split(' ')[0]);
    const calculatedDose = doseValue * weight;
    
    let ageWarning = '';
    if (age < 0.25) {
        ageWarning = '<div class="alert alert-danger">⚠️ Neonatal dosing requires specialist consultation</div>';
    } else if (age < 2) {
        ageWarning = '<div class="alert alert-warning">⚠️ Infant dosing - verify with pediatric guidelines</div>';
    }
    
    document.getElementById('paed-dosing-result').innerHTML = `
        ${ageWarning}
        <div class="result-section">
            <h5>${medication.charAt(0).toUpperCase() + medication.slice(1)} Dosing</h5>
            <div class="result-grid">
                <div><strong>Calculated Dose:</strong> ${calculatedDose.toFixed(1)} mg</div>
                <div><strong>Standard Dose:</strong> ${drug.dose}</div>
                <div><strong>Frequency:</strong> ${drug.frequency}</div>
                <div><strong>Route:</strong> ${drug.route}</div>
                <div><strong>Max Single Dose:</strong> ${drug.maxSingle}</div>
                <div><strong>Max Daily Dose:</strong> ${drug.maxDaily}</div>
            </div>
        </div>
    `;
};

// Infusion Rate Calculation
MLAQuizApp.prototype.calculateInfusionRate = function() {
    const volume = parseFloat(document.getElementById('infusion-volume').value);
    const time = parseFloat(document.getElementById('infusion-time').value);
    const dropFactor = parseFloat(document.getElementById('drop-factor').value);
    
    if (!volume || !time || !dropFactor) {
        document.getElementById('infusion-result').innerHTML = 
            '<div class="alert alert-warning">Please fill in all fields</div>';
        return;
    }
    
    const ratePerHour = volume / time;
    const dropsPerMinute = (volume * dropFactor) / (time * 60);
    const ratePerMinute = ratePerHour / 60;
    
    document.getElementById('infusion-result').innerHTML = `
        <div class="result-section">
            <h5>Infusion Rate Results</h5>
            <div class="result-grid">
                <div><strong>Rate:</strong> ${ratePerHour.toFixed(1)} ml/hr</div>
                <div><strong>Rate per minute:</strong> ${ratePerMinute.toFixed(2)} ml/min</div>
                <div><strong>Drops per minute:</strong> ${dropsPerMinute.toFixed(0)} drops/min</div>
                <div><strong>Total time:</strong> ${time} hours</div>
            </div>
            <div class="alert alert-info">
                💡 Set pump to <strong>${ratePerHour.toFixed(1)} ml/hr</strong> or count <strong>${dropsPerMinute.toFixed(0)} drops/min</strong>
            </div>
        </div>
    `;
};

// Cockcroft-Gault Calculation
MLAQuizApp.prototype.calculateCockcroftGault = function() {
    const age = parseFloat(document.getElementById('cg-age').value);
    const weight = parseFloat(document.getElementById('cg-weight').value);
    const creatinine = parseFloat(document.getElementById('cg-creatinine').value);
    const sex = document.querySelector('input[name="cg-sex"]:checked').value;
    
    if (!age || !weight || !creatinine) {
        document.getElementById('cg-result').innerHTML = 
            '<div class="alert alert-warning">Please fill in all fields</div>';
        return;
    }
    
    const K = sex === 'male' ? 1.23 : 1.04;
    const crCl = ((140 - age) * weight * K) / creatinine;
    
    let interpretation = '';
    let stage = '';
    
    if (crCl >= 90) {
        interpretation = 'Normal kidney function';
        stage = 'CKD Stage 1 (if kidney damage present)';
    } else if (crCl >= 60) {
        interpretation = 'Mildly decreased kidney function';
        stage = 'CKD Stage 2';
    } else if (crCl >= 45) {
        interpretation = 'Mild to moderately decreased kidney function';
        stage = 'CKD Stage 3a';
    } else if (crCl >= 30) {
        interpretation = 'Moderately to severely decreased kidney function';
        stage = 'CKD Stage 3b';
    } else if (crCl >= 15) {
        interpretation = 'Severely decreased kidney function';
        stage = 'CKD Stage 4';
    } else {
        interpretation = 'Kidney failure';
        stage = 'CKD Stage 5';
    }
    
    document.getElementById('cg-result').innerHTML = `
        <div class="result-section">
            <h5>Cockcroft-Gault Results</h5>
            <div class="result-grid">
                <div><strong>Creatinine Clearance:</strong> ${crCl.toFixed(1)} ml/min</div>
                <div><strong>Interpretation:</strong> ${interpretation}</div>
                <div><strong>CKD Stage:</strong> ${stage}</div>
            </div>
            <div class="alert alert-info">
                💡 Consider dose adjustment for medications if CrCl < 60 ml/min
            </div>
        </div>
    `;
};

// BSA Calculation
MLAQuizApp.prototype.calculateBSA = function() {
    const weight = parseFloat(document.getElementById('bsa-weight').value);
    const height = parseFloat(document.getElementById('bsa-height').value);
    
    if (!weight || !height) {
        document.getElementById('bsa-result').innerHTML = 
            '<div class="alert alert-warning">Please enter weight and height</div>';
        return;
    }
    
    // Dubois formula: 0.007184 × W^0.425 × H^0.725
    const dubois = 0.007184 * Math.pow(weight, 0.425) * Math.pow(height, 0.725);
    
    // Mosteller formula: √(W × H / 3600)
    const mosteller = Math.sqrt((weight * height) / 3600);
    
    // Haycock formula: 0.024265 × W^0.5378 × H^0.3964
    const haycock = 0.024265 * Math.pow(weight, 0.5378) * Math.pow(height, 0.3964);
    
    const average = (dubois + mosteller + haycock) / 3;
    
    document.getElementById('bsa-result').innerHTML = `
        <div class="result-section">
            <h5>Body Surface Area Results</h5>
            <div class="result-grid">
                <div><strong>Dubois Formula:</strong> ${dubois.toFixed(2)} m²</div>
                <div><strong>Mosteller Formula:</strong> ${mosteller.toFixed(2)} m²</div>
                <div><strong>Haycock Formula:</strong> ${haycock.toFixed(2)} m²</div>
                <div><strong>Average BSA:</strong> ${average.toFixed(2)} m²</div>
            </div>
            <div class="alert alert-info">
                💡 Mosteller formula is most commonly used for drug dosing
            </div>
        </div>
    `;
};

// Fluid Balance Calculation
MLAQuizApp.prototype.calculateFluidBalance = function() {
    const weight = parseFloat(document.getElementById('fluid-weight').value);
    const age = parseFloat(document.getElementById('fluid-age').value);
    const fever = document.getElementById('fluid-fever').checked;
    const losses = document.getElementById('fluid-losses').checked;
    const heartFailure = document.getElementById('fluid-heart-failure').checked;
    const renal = document.getElementById('fluid-renal').checked;
    const additional = parseFloat(document.getElementById('fluid-additional').value) || 0;
    
    if (!weight || !age) {
        document.getElementById('fluid-result').innerHTML = 
            '<div class="alert alert-warning">Please enter weight and age</div>';
        return;
    }
    
    let baseRequirement;
    
    // Calculate base fluid requirement
    if (age < 1) {
        baseRequirement = weight * 100; // 100ml/kg/day for infants
    } else if (age < 18) {
        if (weight <= 10) {
            baseRequirement = weight * 100;
        } else if (weight <= 20) {
            baseRequirement = 1000 + ((weight - 10) * 50);
        } else {
            baseRequirement = 1500 + ((weight - 20) * 20);
        }
    } else {
        baseRequirement = weight * 30; // 30ml/kg/day for adults
    }
    
    let adjustedRequirement = baseRequirement;
    let adjustments = [];
    
    if (fever) {
        const feverIncrease = 500;
        adjustedRequirement += feverIncrease;
        adjustments.push(`+${feverIncrease}ml for fever`);
    }
    
    if (losses) {
        const lossIncrease = 500;
        adjustedRequirement += lossIncrease;
        adjustments.push(`+${lossIncrease}ml for abnormal losses`);
    }
    
    if (additional > 0) {
        adjustedRequirement += additional;
        adjustments.push(`+${additional}ml for additional losses`);
    }
    
    if (heartFailure) {
        adjustedRequirement *= 0.8; // Restrict to 80%
        adjustments.push('Restricted to 80% due to heart failure');
    }
    
    if (renal) {
        adjustments.push('Consider further restriction for renal impairment');
    }
    
    const hourlyRate = adjustedRequirement / 24;
    
    document.getElementById('fluid-result').innerHTML = `
        <div class="result-section">
            <h5>Fluid Balance Results</h5>
            <div class="result-grid">
                <div><strong>Base Requirement:</strong> ${baseRequirement.toFixed(0)} ml/day</div>
                <div><strong>Adjusted Requirement:</strong> ${adjustedRequirement.toFixed(0)} ml/day</div>
                <div><strong>Hourly Rate:</strong> ${hourlyRate.toFixed(1)} ml/hr</div>
            </div>
            ${adjustments.length > 0 ? `
                <div class="adjustments">
                    <h6>Adjustments Applied:</h6>
                    <ul>
                        ${adjustments.map(adj => `<li>${adj}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            <div class="alert alert-info">
                💡 Monitor urine output (>0.5ml/kg/hr for adults, >1ml/kg/hr for children)
            </div>
        </div>
    `;
};

// TIMI Risk Score Calculation
MLAQuizApp.prototype.calculateTIMI = function() {
    let score = 0;
    
    if (document.getElementById('timi-age').checked) score += 1;
    if (document.getElementById('timi-risk-factors').checked) score += 1;
    if (document.getElementById('timi-known-cad').checked) score += 1;
    if (document.getElementById('timi-aspirin').checked) score += 1;
    if (document.getElementById('timi-severe-angina').checked) score += 1;
    if (document.getElementById('timi-st-deviation').checked) score += 1;
    if (document.getElementById('timi-cardiac-markers').checked) score += 1;
    
    let riskLevel = '';
    let riskPercentage = '';
    let recommendations = '';
    
    if (score <= 2) {
        riskLevel = 'Low Risk';
        riskPercentage = '4.7% risk of death/MI/urgent revascularization at 14 days';
        recommendations = 'Consider discharge with outpatient cardiology follow-up if clinically stable';
    } else if (score <= 4) {
        riskLevel = 'Intermediate Risk';
        riskPercentage = '19.9% risk of death/MI/urgent revascularization at 14 days';
        recommendations = 'Consider admission and cardiology consultation. Early invasive strategy may be beneficial';
    } else {
        riskLevel = 'High Risk';
        riskPercentage = '40.9% risk of death/MI/urgent revascularization at 14 days';
        recommendations = 'Admit for urgent cardiology evaluation. Early invasive strategy strongly recommended';
    }
    
    document.getElementById('timi-result').innerHTML = `
        <div class="result-section">
            <h5>TIMI Risk Score Results</h5>
            <div class="result-grid">
                <div><strong>Score:</strong> ${score}/7 points</div>
                <div><strong>Risk Level:</strong> ${riskLevel}</div>
                <div><strong>14-day Risk:</strong> ${riskPercentage}</div>
            </div>
            <div class="alert alert-info">
                <strong>Recommendations:</strong> ${recommendations}
            </div>
        </div>
    `;
};

// NIH Stroke Scale Calculation
MLAQuizApp.prototype.calculateNIHSS = function() {
    let score = 0;
    
    score += parseInt(document.getElementById('nihss-loc').value);
    score += parseInt(document.getElementById('nihss-questions').value);
    score += parseInt(document.getElementById('nihss-commands').value);
    score += parseInt(document.getElementById('nihss-gaze').value);
    score += parseInt(document.getElementById('nihss-visual').value);
    score += parseInt(document.getElementById('nihss-facial').value);
    
    // Motor scores (excluding 9 = untestable)
    const armLeft = parseInt(document.getElementById('nihss-arm-left').value);
    const armRight = parseInt(document.getElementById('nihss-arm-right').value);
    const legLeft = parseInt(document.getElementById('nihss-leg-left').value);
    const legRight = parseInt(document.getElementById('nihss-leg-right').value);
    
    score += (armLeft === 9 ? 0 : armLeft);
    score += (armRight === 9 ? 0 : armRight);
    score += (legLeft === 9 ? 0 : legLeft);
    score += (legRight === 9 ? 0 : legRight);
    
    const ataxia = parseInt(document.getElementById('nihss-ataxia').value);
    score += (ataxia === 9 ? 0 : ataxia);
    
    score += parseInt(document.getElementById('nihss-sensory').value);
    score += parseInt(document.getElementById('nihss-language').value);
    
    const dysarthria = parseInt(document.getElementById('nihss-dysarthria').value);
    score += (dysarthria === 9 ? 0 : dysarthria);
    
    score += parseInt(document.getElementById('nihss-extinction').value);
    
    let severity = '';
    let interpretation = '';
    let thrombectomyEligible = '';
    
    if (score === 0) {
        severity = 'Normal';
        interpretation = 'No stroke symptoms';
        thrombectomyEligible = 'Not applicable';
    } else if (score <= 4) {
        severity = 'Minor Stroke';
        interpretation = 'Minor stroke - good prognosis';
        thrombectomyEligible = 'Generally not eligible for thrombectomy';
    } else if (score <= 15) {
        severity = 'Moderate Stroke';
        interpretation = 'Moderate stroke severity';
        thrombectomyEligible = 'Consider thrombectomy if large vessel occlusion and within time window';
    } else if (score <= 20) {
        severity = 'Moderate-Severe Stroke';
        interpretation = 'Moderate to severe stroke';
        thrombectomyEligible = 'Strong candidate for thrombectomy if large vessel occlusion';
    } else {
        severity = 'Severe Stroke';
        interpretation = 'Severe stroke - guarded prognosis';
        thrombectomyEligible = 'Consider thrombectomy with caution - discuss with neurology';
    }
    
    document.getElementById('nihss-result').innerHTML = `
        <div class="result-section">
            <h5>NIH Stroke Scale Results</h5>
            <div class="result-grid">
                <div><strong>Total Score:</strong> ${score}/42 points</div>
                <div><strong>Severity:</strong> ${severity}</div>
                <div><strong>Interpretation:</strong> ${interpretation}</div>
            </div>
            <div class="alert alert-info">
                <strong>Thrombectomy Consideration:</strong> ${thrombectomyEligible}
            </div>
            <div class="alert alert-warning">
                💡 <strong>Time is brain:</strong> Assess for thrombolysis (≤4.5h) and thrombectomy (≤24h for select cases)
            </div>
        </div>
    `;
};

// Modified Rankin Scale Calculation
MLAQuizApp.prototype.calculateModifiedRankin = function() {
    const score = parseInt(document.getElementById('rankin-score').value);
    
    let description = '';
    let prognosis = '';
    let careNeeds = '';
    
    switch (score) {
        case 0:
            description = 'No symptoms at all';
            prognosis = 'Excellent functional outcome';
            careNeeds = 'No assistance required';
            break;
        case 1:
            description = 'No significant disability despite symptoms';
            prognosis = 'Excellent functional outcome';
            careNeeds = 'Able to carry out all usual duties and activities';
            break;
        case 2:
            description = 'Slight disability';
            prognosis = 'Good functional outcome';
            careNeeds = 'Unable to carry out all previous activities but able to look after own affairs without assistance';
            break;
        case 3:
            description = 'Moderate disability';
            prognosis = 'Moderate functional outcome';
            careNeeds = 'Requiring some help, but able to walk without assistance';
            break;
        case 4:
            description = 'Moderately severe disability';
            prognosis = 'Poor functional outcome';
            careNeeds = 'Unable to walk without assistance and unable to attend to bodily needs without assistance';
            break;
        case 5:
            description = 'Severe disability';
            prognosis = 'Poor functional outcome';
            careNeeds = 'Bedridden, incontinent, and requiring constant nursing care and attention';
            break;
        case 6:
            description = 'Dead';
            prognosis = 'Fatal outcome';
            careNeeds = 'Not applicable';
            break;
    }
    
    let outcome = '';
    if (score <= 2) {
        outcome = 'Favorable outcome (mRS 0-2)';
    } else if (score <= 5) {
        outcome = 'Unfavorable outcome (mRS 3-5)';
    } else {
        outcome = 'Death (mRS 6)';
    }
    
    document.getElementById('rankin-result').innerHTML = `
        <div class="result-section">
            <h5>Modified Rankin Scale Results</h5>
            <div class="result-grid">
                <div><strong>Score:</strong> ${score}/6</div>
                <div><strong>Description:</strong> ${description}</div>
                <div><strong>Outcome Category:</strong> ${outcome}</div>
                <div><strong>Prognosis:</strong> ${prognosis}</div>
            </div>
            <div class="care-needs">
                <h6>Care Requirements:</h6>
                <p>${careNeeds}</p>
            </div>
            <div class="alert alert-info">
                💡 <strong>Clinical Use:</strong> Primary outcome measure in stroke trials. mRS 0-2 considered good functional outcome.
            </div>
        </div>
    `;
};

// Interactive Features Implementation
MLAQuizApp.prototype.initializeInteractiveFeatures = function() {
    console.log('🔗 Initializing interactive features...');
    
    // Add bookmark buttons to existing calculators
    this.addBookmarkButtons();
    
    // Setup export functionality
    this.setupExportFeatures();
    
    console.log('🔗 Interactive features initialized');
};

// Bookmark functionality removed - not used in calculators

// Recent Tools Management
MLAQuizApp.prototype.addToRecentTools = function(toolType, toolName, toolData = {}) {
    const recentItem = {
        type: toolType,
        name: toolName,
        data: toolData,
        timestamp: new Date().toISOString()
    };
    
    // Remove if already in recent
    this.recentTools = this.recentTools.filter(r => !(r.type === toolType && r.name === toolName));
    
    // Add to beginning
    this.recentTools.unshift(recentItem);
    
    // Limit to 20 recent items
    if (this.recentTools.length > 20) {
        this.recentTools = this.recentTools.slice(0, 20);
    }
    
    localStorage.setItem('medicalToolsRecent', JSON.stringify(this.recentTools));
};

// Notes Management
MLAQuizApp.prototype.saveToolNote = function(toolId, note) {
    if (note.trim() === '') {
        delete this.toolNotes[toolId];
    } else {
        this.toolNotes[toolId] = {
            content: note,
            timestamp: new Date().toISOString()
        };
    }
    localStorage.setItem('medicalToolsNotes', JSON.stringify(this.toolNotes));
};

MLAQuizApp.prototype.getToolNote = function(toolId) {
    return this.toolNotes[toolId]?.content || '';
};

// Export/Share Functionality
MLAQuizApp.prototype.exportCalculationResults = function(calculatorType, results) {
    const exportData = {
        calculator: calculatorType,
        results: results,
        timestamp: new Date().toISOString(),
        source: 'MLA Quiz PWA - Medical Tools'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${calculatorType}-results-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    console.log(`📤 Exported results for ${calculatorType}`);
};

MLAQuizApp.prototype.generateTextReport = function(calculatorType, results) {
    const reportContent = `
MEDICAL CALCULATOR REPORT
=========================

Calculator: ${calculatorType.toUpperCase()}
Generated: ${new Date().toLocaleString()}
Source: MLA Quiz PWA - Medical Tools

${Object.entries(results).map(([key, value]) => `${key}: ${value}`).join('\n')}

Disclaimer: This calculation is for educational purposes only.
Always verify results and consult clinical guidelines.
Do not use for actual patient care without proper validation.
    `.trim();
    
    const dataBlob = new Blob([reportContent], {type: 'text/plain'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${calculatorType}-report-${new Date().toISOString().split('T')[0]}.txt`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    console.log(`📋 Generated text report for ${calculatorType}`);
};

// Bookmark functionality removed - not used in calculators

MLAQuizApp.prototype.setupExportFeatures = function() {
    // Add export buttons to calculator results when they're displayed
    console.log('📤 Export features ready');
};

// Enhanced tool tracking
MLAQuizApp.prototype.trackToolUsage = function(toolType, toolName) {
    this.addToRecentTools(toolType, toolName);
    
    // Track usage statistics
    const usageStats = JSON.parse(localStorage.getItem('medicalToolsUsage')) || {};
    const toolKey = `${toolType}-${toolName}`;
    
    if (!usageStats[toolKey]) {
        usageStats[toolKey] = { count: 0, lastUsed: null };
    }
    
    usageStats[toolKey].count++;
    usageStats[toolKey].lastUsed = new Date().toISOString();
    
    localStorage.setItem('medicalToolsUsage', JSON.stringify(usageStats));
};
