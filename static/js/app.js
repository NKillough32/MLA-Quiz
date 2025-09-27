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
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadQuizzes();
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
    
        const container = document.getElementById('questionContainer');
    
        // Hide explanation and feedback initially (will show again if answer is already submitted)
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
            
            // Add right-click/long-press to rule out options
            document.querySelectorAll('.new-option').forEach((option, index) => {
                // Right-click for desktop
                option.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.toggleRuledOut(question.id, index);
                });
                
                // Create isolated variables for each option to prevent interference
                (function(optionIndex) {
                    let longPressTimer = null;
                    let touchStartTime = 0;
                    let touchStartPosition = null;
                    let longPressTriggered = false;
                    let isProcessing = false;
                    
                    const clearLongPress = () => {
                        if (longPressTimer) {
                            clearTimeout(longPressTimer);
                            longPressTimer = null;
                        }
                    };
                    
                    const handleLongPress = () => {
                        if (isProcessing) return;
                        isProcessing = true;
                        
                        longPressTriggered = true;
                        
                        // Add stronger haptic feedback
                        if (navigator.vibrate) {
                            navigator.vibrate([100, 50, 100]);
                        }
                        
                        // Use a small delay to ensure clean execution
                        setTimeout(() => {
                            this.toggleRuledOut(question.id, optionIndex);
                            isProcessing = false;
                        }, 50);
                        
                        clearLongPress();
                    };
                    
                    option.addEventListener('touchstart', (e) => {
                        if (isProcessing) return;
                        
                        longPressTriggered = false;
                        touchStartTime = Date.now();
                        
                        // Record starting position
                        const touch = e.touches[0];
                        touchStartPosition = {
                            x: touch.clientX,
                            y: touch.clientY
                        };
                        
                        clearLongPress();
                        
                        longPressTimer = setTimeout(() => {
                            handleLongPress();
                        }, 700);
                        
                    }, { passive: true });
                    
                    option.addEventListener('touchmove', (e) => {
                        if (!touchStartPosition || !longPressTimer || isProcessing) return;
                        
                        const touch = e.touches[0];
                        const deltaX = Math.abs(touch.clientX - touchStartPosition.x);
                        const deltaY = Math.abs(touch.clientY - touchStartPosition.y);
                        
                        // Allow small movements (10px threshold)
                        if (deltaX > 10 || deltaY > 10) {
                            clearLongPress();
                        }
                    }, { passive: true });
                    
                    option.addEventListener('touchend', (e) => {
                        clearLongPress();
                        
                        // If long press was triggered, prevent the click
                        if (longPressTriggered) {
                            // Small delay to prevent click event
                            setTimeout(() => {
                                longPressTriggered = false;
                            }, 200);
                            return;
                        }
                        
                        // Reset for next interaction
                        touchStartPosition = null;
                        touchStartTime = 0;
                    }, { passive: true });
                    
                    option.addEventListener('touchcancel', () => {
                        clearLongPress();
                        touchStartPosition = null;
                        touchStartTime = 0;
                        longPressTriggered = false;
                        isProcessing = false;
                    }, { passive: true });
                    
                    // Handle click event to prevent it after long press
                    option.addEventListener('click', (e) => {
                        if (longPressTriggered || isProcessing) {
                            e.preventDefault();
                            e.stopPropagation();
                            return false;
                        }
                    });
                }).call(this, index);
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
        
        if (!this.ruledOutAnswers[questionId]) {
            this.ruledOutAnswers[questionId] = [];
        }
        
        const ruledOutList = this.ruledOutAnswers[questionId];
        const index = ruledOutList.indexOf(optionIndex);
        
        if (index > -1) {
            // Remove from ruled out list
            ruledOutList.splice(index, 1);
        } else {
            // Add to ruled out list
            ruledOutList.push(optionIndex);
        }
        
        // Re-render the current question to update the UI
        this.renderCurrentQuestion();
    }
    
    submitAnswer() {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        const selectedAnswer = this.answers[currentQuestion.id];
        
        if (selectedAnswer === undefined) {
            return; // No answer selected
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
        
        // Show explanation if available
        this.showExplanation(currentQuestion.explanations);
        
        // Update sidebar to reflect answer status
        this.buildQuestionList();
        
        // Update progress immediately upon submission
        this.updateProgress();
        
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
        } else {
            this.finishQuiz();
        }
    }
    
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.renderCurrentQuestion();
            this.updateProgress();
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
}

// Global functions for image viewing
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
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.className = 'image-modal';
    modal.innerHTML = `
        <span class="image-modal-close" onclick="closeImageModal()">&times;</span>
        <img src="${actualUrl}" alt="${altText}" loading="lazy">
    `;
    
    // Close modal when clicking on background
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeImageModal();
        }
    });
    
    document.body.appendChild(modal);
    
    // Close modal with Escape key
    document.addEventListener('keydown', handleEscapeKey);
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