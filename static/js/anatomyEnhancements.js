/**
 * Anatomy Explorer Enhancements
 * Adds quick access buttons, quiz mode, and improved interactions
 */

(function() {
    'use strict';
    
    // Wait for anatomy panel to be ready
    const initEnhancements = () => {
        const anatomyPanel = document.getElementById('anatomy-panel');
        if (!anatomyPanel || !window.quizApp) {
            setTimeout(initEnhancements, 500);
            return;
        }
        
        addQuickAccessButtons();
        addQuizMode();
        enhanceStructureDisplay();
        console.log('✨ Anatomy enhancements initialized');
    };
    
    function addQuickAccessButtons() {
        const searchContainer = document.querySelector('#anatomy-panel .search-container');
        if (!searchContainer) return;
        
        const quickAccessDiv = document.createElement('div');
        quickAccessDiv.className = 'anatomy-quick-access';
        quickAccessDiv.style.cssText = 'margin-top:12px;';
        quickAccessDiv.innerHTML = `
            <h4 style="font-size:14px;margin:0 0 8px;color:var(--text-secondary);">Quick Access:</h4>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
                <button class="region-btn" data-region="skull" style="padding:6px 12px;background:#f0f8ff;border:1px solid #007AFF;border-radius:16px;font-size:12px;cursor:pointer;transition:all 0.2s;">🧠 Head</button>
                <button class="region-btn" data-region="spine" style="padding:6px 12px;background:#f0f8ff;border:1px solid #007AFF;border-radius:16px;font-size:12px;cursor:pointer;transition:all 0.2s;">🦴 Spine</button>
                <button class="region-btn" data-region="humerus" style="padding:6px 12px;background:#f0f8ff;border:1px solid #007AFF;border-radius:16px;font-size:12px;cursor:pointer;transition:all 0.2s;">💪 Arm</button>
                <button class="region-btn" data-region="femur" style="padding:6px 12px;background:#f0f8ff;border:1px solid #007AFF;border-radius:16px;font-size:12px;cursor:pointer;transition:all 0.2s;">🦵 Leg</button>
                <button class="region-btn" data-region="ribs" style="padding:6px 12px;background:#f0f8ff;border:1px solid #007AFF;border-radius:16px;font-size:12px;cursor:pointer;transition:all 0.2s;">🫁 Thorax</button>
                <button class="region-btn" data-region="pectoralis" style="padding:6px 12px;background:#f0f8ff;border:1px solid #007AFF;border-radius:16px;font-size:12px;cursor:pointer;transition:all 0.2s;">💪 Chest</button>
            </div>
        `;
        
        searchContainer.parentNode.insertBefore(quickAccessDiv, searchContainer);
        
        // Add click handlers
        document.querySelectorAll('.region-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const region = btn.dataset.region;
                if (window.quizApp && window.quizApp.searchAnatomy) {
                    window.quizApp.searchAnatomy(region);
                    window.quizApp.showStructureInfo(region);
                }
            });
            
            // Hover effect
            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#007AFF';
                btn.style.color = 'white';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = '#f0f8ff';
                btn.style.color = '#000';
            });
        });
    }
    
    function addQuizMode() {
        const structureInfo = document.getElementById('structureInfo');
        if (!structureInfo) return;
        
        // Add quiz mode button
        const quizBtnDiv = document.createElement('div');
        quizBtnDiv.style.cssText = 'margin-top:12px;text-align:center;';
        quizBtnDiv.innerHTML = `
            <button id="anatomyQuizBtn" style="padding:10px 20px;background:#34c759;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;transition:all 0.2s;">🎯 Test Your Knowledge</button>
        `;
        
        structureInfo.parentNode.insertBefore(quizBtnDiv, structureInfo);
        
        // Add quiz container
        const quizContainer = document.createElement('div');
        quizContainer.id = 'anatomyQuizContainer';
        quizContainer.style.cssText = 'display:none;margin-top:12px;padding:16px;background:var(--card-bg);border-radius:12px;border:2px solid #34c759;';
        quizContainer.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <h3 style="margin:0;color:#34c759;">🎯 Anatomy Quiz</h3>
                <button id="exitQuizBtn" style="padding:6px 12px;background:#ff3b30;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;">✕ Exit</button>
            </div>
            <div id="quizQuestion" style="font-size:16px;font-weight:600;margin-bottom:12px;"></div>
            <div id="quizOptions" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;"></div>
            <div id="quizFeedback" style="padding:10px;border-radius:8px;margin-bottom:12px;display:none;"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div id="quizScore" style="font-size:14px;font-weight:600;"></div>
                <button id="nextQuizBtn" style="padding:8px 16px;background:#007AFF;color:white;border:none;border-radius:6px;cursor:pointer;display:none;">Next Question →</button>
            </div>
        `;
        
        structureInfo.parentNode.insertBefore(quizContainer, structureInfo.nextSibling);
        
        // Quiz state
        let quizState = {
            active: false,
            score: 0,
            totalQuestions: 0,
            currentQuestion: null
        };
        
        // Quiz question generator
        function generateQuestion() {
            if (!window.quizApp || !window.quizApp.anatomyData) {
                return null;
            }
            
            const anatomyData = window.quizApp.anatomyData;
            const keys = Object.keys(anatomyData);
            if (keys.length === 0) return null;
            
            // Pick random structure
            const correctKey = keys[Math.floor(Math.random() * keys.length)];
            const correctData = anatomyData[correctKey];
            
            // Generate question types
            const questionTypes = [
                {
                    type: 'identify',
                    question: `Which structure is this? "${correctData.brief}"`,
                    correct: correctData.commonName
                },
                {
                    type: 'origin',
                    question: `What is the origin of the ${correctData.commonName}?`,
                    correct: correctData.origin
                },
                {
                    type: 'action',
                    question: `What is the primary action of the ${correctData.commonName}?`,
                    correct: correctData.action
                },
                {
                    type: 'innervation',
                    question: `What nerve innervates the ${correctData.commonName}?`,
                    correct: correctData.innervation
                }
            ];
            
            const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
            
            // Generate wrong answers from other structures
            const wrongAnswers = [];
            const shuffledKeys = keys.sort(() => 0.5 - Math.random());
            
            for (let i = 0; i < shuffledKeys.length && wrongAnswers.length < 3; i++) {
                const wrongKey = shuffledKeys[i];
                if (wrongKey === correctKey) continue;
                
                const wrongData = anatomyData[wrongKey];
                let wrongAnswer;
                
                switch(questionType.type) {
                    case 'identify':
                        wrongAnswer = wrongData.commonName;
                        break;
                    case 'origin':
                        wrongAnswer = wrongData.origin;
                        break;
                    case 'action':
                        wrongAnswer = wrongData.action;
                        break;
                    case 'innervation':
                        wrongAnswer = wrongData.innervation;
                        break;
                }
                
                if (wrongAnswer && wrongAnswer !== questionType.correct) {
                    wrongAnswers.push(wrongAnswer);
                }
            }
            
            // Mix correct and wrong answers
            const allAnswers = [questionType.correct, ...wrongAnswers].sort(() => 0.5 - Math.random());
            
            return {
                question: questionType.question,
                correctAnswer: questionType.correct,
                options: allAnswers,
                structureKey: correctKey
            };
        }
        
        function startQuiz() {
            quizState.active = true;
            quizState.score = 0;
            quizState.totalQuestions = 0;
            
            document.getElementById('anatomyQuizContainer').style.display = 'block';
            document.getElementById('structureInfo').style.display = 'none';
            document.getElementById('bodyMap').style.opacity = '0.3';
            
            loadNextQuestion();
        }
        
        function loadNextQuestion() {
            const question = generateQuestion();
            if (!question) {
                alert('No anatomy data available for quiz');
                exitQuiz();
                return;
            }
            
            quizState.currentQuestion = question;
            quizState.totalQuestions++;
            
            document.getElementById('quizQuestion').textContent = question.question;
            document.getElementById('quizScore').textContent = `Score: ${quizState.score}/${quizState.totalQuestions}`;
            document.getElementById('quizFeedback').style.display = 'none';
            document.getElementById('nextQuizBtn').style.display = 'none';
            
            const optionsContainer = document.getElementById('quizOptions');
            optionsContainer.innerHTML = '';
            
            question.options.forEach((option, index) => {
                const btn = document.createElement('button');
                btn.className = 'quiz-option-btn';
                btn.textContent = option;
                btn.style.cssText = 'padding:12px;background:var(--card-bg);border:2px solid var(--border-color);border-radius:8px;cursor:pointer;text-align:left;transition:all 0.2s;';
                
                btn.addEventListener('click', () => checkAnswer(option));
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = '#f0f8ff';
                    btn.style.borderColor = '#007AFF';
                });
                btn.addEventListener('mouseleave', () => {
                    if (!btn.classList.contains('selected')) {
                        btn.style.background = 'var(--card-bg)';
                        btn.style.borderColor = 'var(--border-color)';
                    }
                });
                
                optionsContainer.appendChild(btn);
            });
        }
        
        function checkAnswer(selectedAnswer) {
            const question = quizState.currentQuestion;
            const isCorrect = selectedAnswer === question.correctAnswer;
            
            if (isCorrect) {
                quizState.score++;
            }
            
            // Update score
            document.getElementById('quizScore').textContent = `Score: ${quizState.score}/${quizState.totalQuestions}`;
            
            // Show feedback
            const feedback = document.getElementById('quizFeedback');
            feedback.style.display = 'block';
            
            if (isCorrect) {
                feedback.style.background = '#d4edda';
                feedback.style.color = '#155724';
                feedback.style.border = '1px solid #c3e6cb';
                feedback.innerHTML = `✅ Correct! ${question.correctAnswer}`;
            } else {
                feedback.style.background = '#f8d7da';
                feedback.style.color = '#721c24';
                feedback.style.border = '1px solid #f5c6cb';
                feedback.innerHTML = `❌ Incorrect. The correct answer is: ${question.correctAnswer}`;
            }
            
            // Disable all option buttons
            document.querySelectorAll('.quiz-option-btn').forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.6';
                btn.style.cursor = 'not-allowed';
                
                if (btn.textContent === question.correctAnswer) {
                    btn.style.background = '#d4edda';
                    btn.style.borderColor = '#28a745';
                }
                if (btn.textContent === selectedAnswer && !isCorrect) {
                    btn.style.background = '#f8d7da';
                    btn.style.borderColor = '#dc3545';
                }
            });
            
            // Show next button
            document.getElementById('nextQuizBtn').style.display = 'block';
            
            // Show structure info
            if (window.quizApp && window.quizApp.showStructureInfo) {
                setTimeout(() => {
                    const tempInfo = document.createElement('div');
                    tempInfo.style.cssText = 'margin-top:12px;padding:10px;background:var(--card-bg);border-radius:8px;border:1px solid var(--border-color);';
                    
                    if (window.quizApp.anatomyData && window.quizApp.anatomyData[question.structureKey]) {
                        const data = window.quizApp.anatomyData[question.structureKey];
                        tempInfo.innerHTML = `<strong>${data.commonName}</strong><p style="font-size:13px;margin:6px 0 0;color:var(--text-secondary);">${data.brief}</p>`;
                    }
                    
                    feedback.appendChild(tempInfo);
                }, 100);
            }
        }
        
        function exitQuiz() {
            quizState.active = false;
            document.getElementById('anatomyQuizContainer').style.display = 'none';
            document.getElementById('structureInfo').style.display = 'block';
            document.getElementById('bodyMap').style.opacity = '1';
            
            if (quizState.totalQuestions > 0) {
                const percentage = Math.round((quizState.score / quizState.totalQuestions) * 100);
                alert(`Quiz Complete!\n\nScore: ${quizState.score}/${quizState.totalQuestions} (${percentage}%)`);
            }
        }
        
        // Event listeners
        document.getElementById('anatomyQuizBtn').addEventListener('click', startQuiz);
        document.getElementById('exitQuizBtn').addEventListener('click', exitQuiz);
        document.getElementById('nextQuizBtn').addEventListener('click', loadNextQuestion);
    }
    
    function enhanceStructureDisplay() {
        // Add hover effects to SVG elements
        const observer = new MutationObserver(() => {
            const bodyMap = document.getElementById('bodyMap');
            if (!bodyMap) return;
            
            const svgElements = bodyMap.querySelectorAll('[data-structure]');
            svgElements.forEach(el => {
                if (el.dataset.enhanced) return;
                el.dataset.enhanced = 'true';
                
                el.addEventListener('mouseenter', () => {
                    el.style.opacity = '0.8';
                    el.style.filter = 'brightness(1.2)';
                });
                
                el.addEventListener('mouseleave', () => {
                    el.style.opacity = '';
                    el.style.filter = '';
                });
            });
        });
        
        const bodyMap = document.getElementById('bodyMap');
        if (bodyMap) {
            observer.observe(bodyMap, { childList: true, subtree: true });
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEnhancements);
    } else {
        initEnhancements();
    }
})();
