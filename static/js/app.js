﻿/**
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
        
        // IndexedDB for efficient image storage (especially on mobile)
        this.db = null;
        this.initIndexedDB();
        
        this.init();
    }

    // Track whether we've programmatically locked orientation
    screenLocked = false;
    lockedTo = null; // 'portrait' or 'landscape'
    // If true, automatically exit fullscreen shortly after a successful programmatic lock
    autoExitFullscreenAfterLock = false;

    // Attempt to load an external SVG layer (bones/muscles). Falls back to renderAnatomyMap()
    async loadAnatomyMap(layer = 'bones', view = 'front') {
        try {
            const canvas = document.getElementById('anatomyCanvas') || document.getElementById('bodyMap');
            if (!canvas) return this.renderAnatomyMap();

            // Try common local filenames first: /static/anatomy/<layer>_<view>.svg etc.
            const candidates = [
                `/static/anatomy/${layer}_${view}.svg`,
                `/static/anatomy/${layer}_${view}_front.svg`,
                `/static/anatomy/${layer}_front.svg`,
                `/static/anatomy/${layer}.svg`
            ];

            let svgText = null;
            for (const url of candidates) {
                try {
                    const res = await fetch(url, { cache: 'no-cache' });
                    if (!res.ok) continue;
                    svgText = await res.text();
                    break;
                } catch (err) {
                    // try next
                }
            }

            // If no local SVG was found, attempt known Wikimedia Commons fallbacks (load remote SVGs at runtime).
            // These are used only when local assets are missing. Browsers will fetch directly from Wikimedia.
            if (!svgText) {
                try {
                    // Try several possible Wikimedia fallbacks for better language coverage.
                    const remoteMap = {
                        'bones_front': [
                            'https://upload.wikimedia.org/wikipedia/commons/c/ca/Human_skeleton_front_en.svg',
                            'https://upload.wikimedia.org/wikipedia/commons/c/c7/Human_skeleton_front.svg'
                        ],
                        // Prefer an English-labelled back skeleton if available, then fall back to other variants
                        'bones_back': [
                            'https://upload.wikimedia.org/wikipedia/commons/4/4e/Human_skeleton_back_en.svg',
                            'https://upload.wikimedia.org/wikipedia/commons/4/4e/Human_skeleton_back.svg',
                            'https://upload.wikimedia.org/wikipedia/commons/4/4e/Human_skeleton_back_uk.svg'
                        ],
                        // Use a combined front/back muscles file; JS will display as-is (file contains both views)
                        'muscles_front': [
                            'https://upload.wikimedia.org/wikipedia/commons/e/ef/Muscles_front_and_back.svg'
                        ],
                        'muscles_back': [
                            'https://upload.wikimedia.org/wikipedia/commons/e/ef/Muscles_front_and_back.svg'
                        ]
                    };

                    const remoteKey = `${layer}_${view}`;
                    const candidates = remoteMap[remoteKey] || remoteMap[`${layer}_front`] || remoteMap[layer] || [];
                    for (const remoteUrl of candidates) {
                        try {
                            const r = await fetch(remoteUrl, { cache: 'no-cache' });
                            if (r.ok) {
                                svgText = await r.text();
                                break;
                            }
                        } catch (innerErr) {
                            // try next candidate
                        }
                    }
                } catch (e) {
                    console.debug('⚠️ Remote Wikimedia fetch failed:', e);
                }
            }

            if (!svgText) {
                // No external SVG found — fall back to programmatic map
                return this.renderAnatomyMap();
            }

            // Inject SVG and add click handlers
            const wrapper = document.createElement('div');
            wrapper.innerHTML = svgText;
            // Remove any previous content
            const bodyMap = document.getElementById('bodyMap');
            if (bodyMap) bodyMap.innerHTML = '';
            // Append nodes
            if (bodyMap) bodyMap.appendChild(wrapper);

            // Try to normalize SVG element ids/titles to keys in anatomyData so
            // clicks and searches map correctly even when external SVG ids differ.
            try {
                this.normalizeAnatomySvg(bodyMap);
            } catch (normErr) {
                console.debug('Anatomy SVG normalization failed:', normErr);
            }
            // Attach click handlers for any element with data-structure or id
            const clickable = bodyMap.querySelectorAll('[data-structure], [id]');
            clickable.forEach(el => {
                const key = el.getAttribute('data-structure') || el.id;
                if (!key) return;
                el.style.cursor = 'pointer';
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Use the key as name if no structured info available
                    this.showStructureInfo(key, `Information about ${key} (SVG layer)`);
                });
            });

            // Success
            console.log(`🔍 Loaded anatomy layer: ${layer}`);
        } catch (err) {
            console.warn('⚠️ Error loading anatomy SVG, falling back to programmatic map', err);
            this.renderAnatomyMap();
        }
    }

    // Search for a structure by name (highlights matching elements)
    searchAnatomy(query) {
        const q = (query || '').toLowerCase();
        const bodyMap = document.getElementById('bodyMap');
        if (!bodyMap) return;

        // Clear previous highlights
        const all = bodyMap.querySelectorAll('[data-structure], rect, path, text');
        all.forEach(el => {
            el.classList.remove('anatomy-highlight');
            if (el.tagName === 'rect' || el.tagName === 'path' || el.tagName === 'polygon') {
                // reset inline styles where we can
                if (el.getAttribute('data-original-fill')) el.setAttribute('fill', el.getAttribute('data-original-fill'));
                el.style.strokeWidth = el.getAttribute('data-original-stroke-width') || el.style.strokeWidth || '';
            }
        });

        if (!q) return;

        // Match by data-structure or text content
        const matches = [];
        bodyMap.querySelectorAll('[data-structure], text').forEach(el => {
            const ds = (el.getAttribute('data-structure') || '').toLowerCase();
            const txt = (el.textContent || '').toLowerCase();
            if (ds.includes(q) || txt.includes(q)) {
                matches.push(el);
            }
        });

        if (matches.length === 0) {
            // No match: show simple message
            const structInfo = document.getElementById('structureInfo');
            if (structInfo) structInfo.innerHTML = `<div style="color:#666">No structures found for "${query}"</div>`;
            return;
        }

        // Highlight matched elements and show first match info
        matches.forEach(el => {
            // For shapes, style them; for text, try to find the corresponding shape
            let target = el;
            if (el.tagName.toLowerCase() === 'text') {
                // try to find a rect with same data-structure
                const ds = el.getAttribute('data-structure');
                if (ds) {
                    const rect = bodyMap.querySelector(`[data-structure="${ds}"]`);
                    if (rect) target = rect;
                }
            }

            if (target) {
                // store originals
                if (!target.getAttribute('data-original-fill') && target.getAttribute('fill')) {
                    target.setAttribute('data-original-fill', target.getAttribute('fill'));
                }
                if (!target.getAttribute('data-original-stroke-width') && target.getAttribute('stroke-width')) {
                    target.setAttribute('data-original-stroke-width', target.getAttribute('stroke-width'));
                }
                try {
                    target.setAttribute('fill', '#fff59d');
                    target.style.strokeWidth = '3px';
                    target.classList.add('anatomy-highlight');
                } catch (err) {}
            }
        });

        // Show info for the first match
        const first = matches[0];
        const name = first.getAttribute('data-structure') || first.textContent || query;
        this.showStructureInfo(name, `Search result for "${query}"`);
    }
    
    async initIndexedDB() {
        try {
            // Only use IndexedDB on mobile devices to avoid storage issues
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (!isMobile) {
                console.log('📱 Desktop detected, using localStorage for images');
                return;
            }
            
            console.log('📱 Mobile detected, initializing IndexedDB for efficient image storage...');
            
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('MLAQuizDB', 1);
                
                request.onerror = () => {
                    console.error('❌ IndexedDB failed to open:', request.error);
                    resolve(); // Don't reject, just use localStorage fallback
                };
                
                request.onsuccess = () => {
                    this.db = request.result;
                    console.log('✅ IndexedDB initialized successfully');
                    resolve();
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // Create object store for images
                    if (!db.objectStoreNames.contains('images')) {
                        const imageStore = db.createObjectStore('images', { keyPath: 'id' });
                        imageStore.createIndex('quizName', 'quizName', { unique: false });
                        console.log('✅ Created IndexedDB object stores');
                    }
                };
            });
        } catch (error) {
            console.error('❌ IndexedDB initialization error:', error);
            // Continue without IndexedDB - will use localStorage
        }
    }

    // Attempt to lock orientation to an optimal state for quizzes
    async lockToOptimalOrientation() {
        if (!this.screenOrientationSupported) {
            console.log('Orientation lock not supported');
            return false;
        }

        // Prefer portrait on phones, allow landscape on tablets
        const isTablet = window.innerWidth >= 768;
        const preferred = isTablet ? 'landscape' : 'portrait-primary';

        try {
            await screen.orientation.lock(preferred);
            console.log(`Screen locked to ${preferred}`);
            this.performHapticFeedback('selection');
            this.screenLocked = true;
            this.lockedTo = isTablet ? 'landscape' : 'portrait';
            this.showToast(`Rotation locked to ${preferred}`);

            // Optional: if an external fullscreen was active and the developer
            // prefers to exit it after the lock, do so after a short delay.
            if (this.autoExitFullscreenAfterLock) {
                try {
                    const exitFn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
                    if ((document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) && exitFn) {
                        setTimeout(() => {
                            try { exitFn.call(document); } catch (e) { /* ignore */ }
                        }, 800);
                    }
                } catch (e) {
                    console.debug('autoExitFullscreenAfterLock failed:', e);
                }
            }

            return true;
        } catch (err) {
            // Common error: lock failing on iOS or when not in fullscreen
            console.warn('Failed to lock orientation:', err && err.message ? err.message : err);

            // NOTE: Removed forced fullscreen fallback to preserve touch/interaction.
            // Fullscreen fallbacks often make the UI non-interactive on some devices.
            // If fullscreen is required for a specific browser, consider enabling
            // requestFullscreenForOrientationLock() from a direct user gesture instead.

            // Inform the user that the lock failed and suggest actions if helpful
            this.showToast('Unable to lock orientation on this device. Try tapping the lock button or enabling fullscreen.', 5000);

            return false;
        }
    }

    // Request fullscreen on the quiz screen and retry locking (useful for iOS/Chrome behavior)
    async requestFullscreenForOrientationLock() {
        const quizScreen = document.getElementById('quizScreen');
        if (!quizScreen) return;

        try {
            const req = quizScreen.requestFullscreen || quizScreen.webkitRequestFullscreen || quizScreen.mozRequestFullScreen || quizScreen.msRequestFullscreen;
            if (req) {
                await req.call(quizScreen);
                // Retry lock after fullscreen settles
                setTimeout(() => this.lockToOptimalOrientation(), 500);
            }
        } catch (err) {
            console.log('Fullscreen request denied or failed:', err);
            this.showToast('Tap fullscreen to enable rotation lock (some browsers)', 5000);
        }
    }

    // Unlock orientation and exit fullscreen if active
    unlockOrientation() {
        try {
            if (this.screenOrientationSupported && screen.orientation && typeof screen.orientation.unlock === 'function') {
                try {
                    screen.orientation.unlock();
                    console.log('Orientation unlocked');
                } catch (err) {
                    console.warn('Failed to unlock orientation:', err);
                }
            }
        } catch (e) {
            console.debug('unlockOrientation check failed:', e);
        }

        // Exit fullscreen if active (try vendor-prefixed variants)
        try {
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msFullscreenElement && document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        } catch (e) {
            console.debug('Failed to exit fullscreen during unlock:', e);
        }

        this.screenLocked = false;
        this.lockedTo = null;
    }
    
    async storeImageInDB(quizName, imageKey, imageData) {
        if (!this.db) {
            console.log('📦 IndexedDB not available, skipping image storage');
            return false;
        }
        
        try {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            
            const data = {
                id: `${quizName}_${imageKey}`,
                quizName: quizName,
                imageKey: imageKey,
                imageData: imageData,
                timestamp: Date.now()
            };
            
            await store.put(data);
            console.log(`✅ Stored image in IndexedDB: ${imageKey}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to store image in IndexedDB:', error);
            return false;
        }
    }
    
    async getImageFromDB(quizName, imageKey) {
        if (!this.db) {
            return null;
        }
        
        try {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.get(`${quizName}_${imageKey}`);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    if (request.result) {
                        console.log(`✅ Retrieved image from IndexedDB: ${imageKey}`);
                        resolve(request.result.imageData);
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => resolve(null);
            });
        } catch (error) {
            console.error('❌ Failed to get image from IndexedDB:', error);
            return null;
        }
    }
    
    async getAllImagesForQuiz(quizName) {
        if (!this.db) {
            return {};
        }
        
        try {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const index = store.index('quizName');
            const request = index.getAll(quizName);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const images = {};
                    request.result.forEach(item => {
                        images[item.imageKey] = item.imageData;
                    });
                    console.log(`✅ Retrieved ${Object.keys(images).length} images from IndexedDB for ${quizName}`);
                    resolve(images);
                };
                request.onerror = () => resolve({});
            });
        } catch (error) {
            console.error('❌ Failed to get images from IndexedDB:', error);
            return {};
        }
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
        this.initializeOrientationDetection();
        this.initializeRotationControl();
        // Try to load upstream QRISK3 library for accurate calculations
        this.loadExternalQRISK();
        console.log('🩺 About to initialize medical tools...');
        this.initializeMedicalTools();
        this.initializeAnatomyExplorer();
        this.initializeInteractiveFeatures();
        console.log('✅ App initialization complete');
    }

    loadExternalQRISK() {
        // Try several CDN locations for the sisuwellness-qrisk3 UMD/UMD-like bundle
        const urls = [
            // Prefer a locally vendored copy first (drop upstream UMD build here)
            '/static/js/qrisk3/qrisk3.umd.js',
            // Then run a local shim to normalize exports if necessary
            '/static/js/qrisk3/qrisk3-loader.js',
            // Fallback to common CDNs
            'https://unpkg.com/sisuwellness-qrisk3@latest/dist/qrisk3.umd.js',
            'https://cdn.jsdelivr.net/npm/sisuwellness-qrisk3@latest/dist/qrisk3.umd.js',
            'https://unpkg.com/sisuwellness-qrisk3@latest/src/qrisk3.js',
            'https://cdn.jsdelivr.net/npm/sisuwellness-qrisk3@latest/src/qrisk3.js'
        ];

        const tryLoad = (index) => {
            if (index >= urls.length) {
                console.log('⚠️ QRISK3 CDN not available; using fallback calculator');
                return;
            }

            const url = urls[index];
            console.log('🔁 Attempting to load QRISK3 library from', url);
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = () => {
                // Some UMD builds attach to window.qrisk3 or module; try to normalize
                if (window.qrisk3 && typeof window.qrisk3.calculateScore === 'function') {
                    console.log('✅ Loaded QRISK3 library from', url);
                } else if (window.qrisk && typeof window.qrisk.calculateScore === 'function') {
                    window.qrisk3 = window.qrisk; // normalize
                    console.log('✅ Loaded QRISK3 library (normalized window.qrisk -> window.qrisk3) from', url);
                } else if (window.calculateScore && window.inputBuilder) {
                    // Some builds might export globals directly
                    window.qrisk3 = { calculateScore: window.calculateScore, inputBuilder: window.inputBuilder };
                    console.log('✅ Loaded QRISK3 globals from', url);
                } else {
                    console.log('⚠️ QRISK3 loaded from', url, 'but expected globals not found; trying next CDN');
                    // try next
                    tryLoad(index + 1);
                }
            };
            script.onerror = () => {
                console.log('❌ Failed to load QRISK3 from', url, '- trying next');
                tryLoad(index + 1);
            };
            document.head.appendChild(script);
        };

        tryLoad(0);
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
        
        // Optional orientation lock toggle in the UI (if present)
        const lockBtn = document.getElementById('lockOrientationBtn');
        if (lockBtn) {
            lockBtn.addEventListener('click', async () => {
                try {
                    if (this.screenLocked) {
                        this.unlockOrientation();
                    } else {
                        await this.lockToOptimalOrientation();
                    }
                } catch (e) { console.debug('lockOrientationBtn handler error:', e); }
            });
        }

        // Navbar rotLock toggle (added to templates). If present, use it to
        // quickly lock/unlock orientation during the quiz.
        const rotNavBtn = document.getElementById('rotLock');
        if (rotNavBtn) {
            rotNavBtn.addEventListener('click', async () => {
                try {
                    if (this.screenLocked) {
                        this.unlockOrientation();
                        rotNavBtn.textContent = '🔒';
                    } else {
                        await this.lockToOptimalOrientation();
                        rotNavBtn.textContent = this.screenLocked ? '🔒' : '🔓';
                    }
                } catch (e) {
                    console.debug('rotLock handler error:', e);
                }
            });
        }
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
    
    async renderQuizList(quizzes) {
        const quizList = document.getElementById('quizList');
        
        // Get uploaded quizzes from localStorage (now async for IndexedDB support)
        const uploadedQuizzes = await this.getUploadedQuizzes();
        
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
                // Load from localStorage (now async for IndexedDB support)
                const uploadedQuizzes = await this.getUploadedQuizzes();
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
                
                // Store current quiz for image lookups
                this.currentQuiz = quiz;
                
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
                console.log('📱 Images available:', Object.keys(quiz.images || {}).length);
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
    
    async startQuiz() {
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
        // LOCK TO PORTRAIT (or allow landscape on tablets)
        try {
            // Attempt a best-effort orientation lock and await it so the UI
            // can settle in the desired orientation before the user interacts.
            await this.lockToOptimalOrientation();
        } catch (e) {
            console.debug('Orientation lock attempt failed at startQuiz:', e);
        }
        // Analytics: quiz_start
        try {
            if (window.MLAAnalytics && typeof window.MLAAnalytics.event === 'function') {
                window.MLAAnalytics.event('quiz_start', {
                    name: this.quizName || null,
                    selected_length: this.selectedQuizLength || null,
                    question_count: (this.questions && this.questions.length) || 0
                });
            }
        } catch (e) {
            console.debug('Analytics quiz_start error:', e);
        }
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

        // If prompt is empty, treat the scenario as the effective prompt internally
        // but avoid printing both scenario and prompt in the UI. We render the
        // scenario separately only when both are present and different.
        const hasScenario = !!(scenarioText && scenarioText.trim());
        const hasPromptField = !!(question.prompt && question.prompt.trim());
        const effectivePromptText = hasPromptField ? question.prompt.trim() : (hasScenario ? scenarioText.trim() : '');
        const useScenarioAsPrompt = !hasPromptField && hasScenario; // internal use only
        const showScenarioSeparately = hasScenario && hasPromptField && (scenarioText.trim() !== (question.prompt || '').trim());
    
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
        
        // Check if there's a separate image field (new parser format)
        if (question.image && question.image.trim()) {
            console.log('✅ NEW FORMAT - Found separate image field:', question.image);
            imageHtml = this.formatText(question.image);
            console.log('✅ NEW FORMAT - Generated imageHtml:', imageHtml.substring(0, 200));
        } else {
            console.log('⚠️ No separate image field found in question object');
        }
        
    // Use effectivePromptText computed earlier which prefers explicit prompt
    // but falls back to scenario when prompt is empty.
    const promptText = effectivePromptText || '';
    console.log('Debug - Prompt text found (effective):', promptText);
    console.log('Debug - Full question object:', question);
        
        // Check if prompt is just an image reference (old format, should not happen with new parser)
        const isImageOnlyPrompt = promptText && promptText.match(/^\s*(\[IMAGE:\s*[^\]]+\]|!\[Image\]\([^)]+\))\s*$/);
        
        if (isImageOnlyPrompt) {
            console.log('Warning - Prompt is image-only, this should not happen with new parser');
            // If prompt is just an image reference and we don't already have an image, process it as image
            if (!imageHtml) {
                imageHtml = this.formatText(promptText);
            }
            // Check if there's a separate question field or use default
            const actualQuestion = question.question || question.questionText;
            if (actualQuestion && actualQuestion !== promptText) {
                questionPromptHtml = `<div class="prompt">${this.formatText(actualQuestion)}</div>`;
            } else {
                // Fallback to default only if no other question text exists
                // Do not insert assumed prompt text; leave prompt container empty if no prompt provided
                questionPromptHtml = `<div class="prompt"></div>`;
            }
        } else if (promptText && promptText.trim()) {
            // Check if prompt contains image references mixed with text
            const imageMatches = promptText.match(/(\[IMAGE:[^\]]+\]|!\[Image\]\([^)]+\))/g);
            let cleanPromptText = promptText;
            
            if (imageMatches) {
                // Remove image references from prompt text
                cleanPromptText = promptText.replace(/(\[IMAGE:[^\]]+\]|!\[Image\]\([^)]+\))/g, '').trim();
                
                // Process each image (only if we don't already have an image from the image field)
                if (!imageHtml) {
                    imageMatches.forEach(imageRef => {
                        imageHtml += this.formatText(imageRef);
                    });
                }
            }
            
            // Use clean prompt text or process entire prompt if no image matches found
            if (cleanPromptText && cleanPromptText.length > 0) {
                questionPromptHtml = `<div class="prompt">${this.formatText(cleanPromptText)}</div>`;
            } else if (!imageMatches) {
                // Process the entire prompt through formatText to handle embedded images
                questionPromptHtml = `<div class="prompt">${this.formatText(promptText)}</div>`;
            } else {
                // Clean prompt is empty after removing images, use default
                // Do not insert assumed prompt text; leave prompt container empty if no prompt provided
                questionPromptHtml = `<div class="prompt"></div>`;
            }
        } else {
            // If no prompt found, add a default question
            // Do not insert assumed prompt text; leave prompt container empty if no prompt provided
            questionPromptHtml = `<div class="prompt"></div>`;
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

                // Remove any leading single-letter markers (e.g. 'A)', 'A.', '(A)', 'A) C.' etc.)
                let cleanOption = option;
                // Iteratively strip repeated leading markers so 'A) C. Text' -> 'Text'
                while (/^[\(\[]?[A-Z][\)\.]\s*/i.test(cleanOption)) {
                    cleanOption = cleanOption.replace(/^[\(\[]?[A-Z][\)\.]\s*/i, '').trim();
                }
                // Also strip a leading single-letter + dot (e.g. 'E. Text') if still present
                while (/^[A-Z]\.\s*/i.test(cleanOption)) {
                    cleanOption = cleanOption.replace(/^[A-Z]\.\s*/i, '').trim();
                }

                optionsHtml += `<label class="${optionClasses}"><input type="radio" name="question_${question.id}" value="${index}" ${isSelected ? 'checked' : ''}><div class="label"><span class="badge">${letter})</span> ${cleanOption}</div></label>`;
            });
            optionsHtml += '</div>';
        }
        console.log('Debug - Options HTML length:', optionsHtml.length);
    
        // Assemble the final HTML with proper spacing
        let finalHtml = '';
    
        // Add scenario/stem only when it should be shown separately.
        if (showScenarioSeparately && scenarioText) {
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
    
        // Add question prompt (use effective prompt text). If we used the
        // scenario as the prompt internally, questionPromptHtml may be empty;
        // in that case render the effective prompt once.
        if (questionPromptHtml && questionPromptHtml.trim() !== '<div class="prompt"></div>') {
            finalHtml += questionPromptHtml;
        } else if (promptText) {
            finalHtml += `<div class="prompt">${this.formatText(promptText)}</div>`;
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
        // Enhanced haptic feedback with Android support and opt-in checking
        console.log('🔊 Attempting haptic feedback:', type);
        
        // Check if user has opted in to haptics
        if (!this.hapticsOptIn) {
            console.log('🔊 Haptics disabled - user has not opted in');
            this.performVisualFeedback(type);
            return false;
        }
        
        // Check for prefers-reduced-motion system preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            console.log('🔊 Haptics disabled - user prefers reduced motion');
            this.performVisualFeedback(type);
            return false;
        }
        
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
                
                // Also provide visual feedback
                this.performVisualFeedback(type);
                
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
        
        // Read haptics preference from localStorage (default: false - opt-in required)
        const savedPreference = localStorage.getItem('hapticsEnabled');
        this.hapticsOptIn = savedPreference === 'true';
        console.log('Haptics opt-in status:', this.hapticsOptIn);
        
        // Check for prefers-reduced-motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            console.log('⚠️ User prefers reduced motion - haptics will be disabled');
        }
        
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
        
        // Add haptics toggle to navbar
        this.addHapticsToggle();
        
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
    
    initializeOrientationDetection() {
        console.log('📱 Initializing orientation detection...');
        
        // Store current orientation
        this.currentOrientation = this.getCurrentOrientation();
        console.log('📱 Initial orientation:', this.currentOrientation);
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            // Wait a bit for the orientation change to complete
            setTimeout(() => {
                const newOrientation = this.getCurrentOrientation();
                console.log('📱 Orientation changed to:', newOrientation);
                
                // Update stored orientation
                this.currentOrientation = newOrientation;
                
                // Handle orientation-specific adjustments
                this.handleOrientationChange(newOrientation);
            }, 100);
        });
        
        // Also listen for resize events (covers some edge cases)
        window.addEventListener('resize', () => {
            // Debounce resize events
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                const newOrientation = this.getCurrentOrientation();
                if (newOrientation !== this.currentOrientation) {
                    console.log('📱 Orientation changed via resize to:', newOrientation);
                    this.currentOrientation = newOrientation;
                    this.handleOrientationChange(newOrientation);
                }
            }, 250);
        });
        
        console.log('✅ Orientation detection initialized');
    }
    
    getCurrentOrientation() {
        // Check screen dimensions
        const { width, height } = window.screen;
        const { innerWidth, innerHeight } = window;
        
        // Use screen dimensions for more reliable detection
        if (width > height) {
            return 'landscape';
        } else {
            return 'portrait';
        }
    }
    
    handleOrientationChange(orientation) {
        console.log('📱 Handling orientation change:', orientation);
        
        // Add orientation class to body for CSS targeting
        document.body.classList.remove('orientation-portrait', 'orientation-landscape');
        document.body.classList.add(`orientation-${orientation}`);
        
        // Adjust quiz layout for landscape mode
        const quizScreen = document.getElementById('quizScreen');
        if (quizScreen && quizScreen.style.display !== 'none') {
            if (orientation === 'landscape') {
                // In landscape, we might want to adjust the layout
                console.log('📱 Landscape mode detected - quiz layout adjustments can be added here');
                // For now, just log - future enhancements could adjust grid layouts
            } else {
                console.log('📱 Portrait mode detected - standard layout');
            }
        }
        
        // Analytics: orientation change
        try {
            if (window.MLAAnalytics && typeof window.MLAAnalytics.event === 'function') {
                window.MLAAnalytics.event('orientation_change', {
                    orientation: orientation,
                    screen_width: window.screen.width,
                    screen_height: window.screen.height
                });
            }
        } catch (e) {
            console.debug('Analytics orientation_change error:', e);
        }
    }
    
    // Screen Orientation API control methods
    initializeRotationControl() {
        console.log('🔄 Initializing rotation control...');

        // Basic presence check for the Screen Orientation API
        this.screenOrientationSupported = ('orientation' in screen) && !!screen.orientation;
        console.log('🔒 API:', this.screenOrientationSupported ? 'Supported' : 'Fallback');

        // If supported, add a simple rotation control and a re-lock listener
        if (this.screenOrientationSupported && typeof screen.orientation.lock === 'function') {
            // Add rotation control button to navbar (keeps existing UI integration)
            this.addRotationControlButton();

            // Gentle one-time fullscreen pre-request tied to the first user gesture
            document.addEventListener('click', async () => {
                try {
                    if (document.fullscreenElement) return;
                    const docEl = document.documentElement;
                    const requestFull = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
                    if (requestFull) {
                        try {
                            await requestFull.call(docEl);
                            console.log('📺 Fullscreen activated to allow orientation control');
                        } catch (err) {
                            console.warn('Fullscreen request failed:', err);
                        }
                    }
                } catch (err) {
                    console.debug('Fullscreen pre-request failed:', err);
                }
            }, { once: true });

            // Re-lock listener: if we programmatically locked earlier, try to reapply
            // when the browser emits orientation changes (helps in transient overrides)
            try {
                screen.orientation?.addEventListener('change', () => {
                    this.updateRotationButtonState();
                    if (this.screenLocked) {
                        setTimeout(() => {
                            try { this.lockToOptimalOrientation(); } catch (e) { console.debug('re-lock attempt failed:', e); }
                        }, 150);
                    }
                });
            } catch (e) {
                console.debug('Could not attach orientation change listener:', e);
            }
        } else {
            console.log('🔄 Screen Orientation API not supported');
            this.screenOrientationSupported = false;
        }
    }
    
    addRotationControlButton() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            // Remove existing rotation button if present
            const existingBtn = document.getElementById('rotation-control-btn');
            if (existingBtn) {
                existingBtn.remove();
            }
            
            const rotationBtn = document.createElement('button');
            rotationBtn.id = 'rotation-control-btn';
            rotationBtn.className = 'navbar-btn';
            // Place the button inline to the left of the centered title so it appears
            // immediately to the left of "MLA Quiz". Avoid absolute positioning so
            // the navbar's centered layout keeps the title centered while this
            // button sits to its left as requested.
            rotationBtn.style.cssText = 'background: none; border: none; color: #007AFF; font-size: 14px; cursor: pointer; padding: 8px; margin-right: 8px;';
            // Use addEventListener for more reliable event wiring (avoids accidental replacement)
            rotationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🔄 Rotation control button clicked');
                this.toggleRotationLock();
            });
            rotationBtn.setAttribute('title', 'Control screen rotation');
            rotationBtn.setAttribute('role', 'button');
            rotationBtn.setAttribute('aria-label', 'Rotation control');
            // Expose pressed state for assistive tech; updated by updateRotationButtonState()
            rotationBtn.setAttribute('aria-pressed', 'false');
            
            // Insert into the left zone if present, otherwise fall back to inserting
            // before the title. This keeps navbar items equally spaced.
            const navLeft = navbar.querySelector('.nav-left');
            const titleEl = document.getElementById('navTitle');
            if (navLeft) {
                navLeft.appendChild(rotationBtn);
            } else if (titleEl) {
                navbar.insertBefore(rotationBtn, titleEl);
            } else {
                navbar.appendChild(rotationBtn);
            }
            this.updateRotationButtonState();
            console.log('🔄 Rotation control button added to navbar');
        } else {
            console.log('🔄 Navbar not found, retrying in 100ms');
            setTimeout(() => this.addRotationControlButton(), 100);
        }
    }
    
    updateRotationButtonState() {
        const rotationBtn = document.getElementById('rotation-control-btn');
        if (!rotationBtn || !this.screenOrientationSupported) return;
        
        try {
            // Prefer using the standardized locked property when available
            const orientationObj = (screen && screen.orientation) ? screen.orientation : null;
            const lockedAvailable = orientationObj && (typeof orientationObj.locked !== 'undefined');
            const locked = lockedAvailable ? orientationObj.locked : null;

            // Read type (may be 'portrait-primary', 'landscape-secondary', etc.)
            const type = orientationObj && orientationObj.type ? String(orientationObj.type).toLowerCase() : '';

            // Helper to set pressed state for assistive tech
            const setAriaPressed = (value) => rotationBtn.setAttribute('aria-pressed', value ? 'true' : 'false');

            // If the browser tells us explicitly whether orientation is locked, use that.
            if (locked === true) {
                // Show locked state; try to pick a friendly label from the reported type
                if (type.startsWith('portrait')) {
                    rotationBtn.textContent = '📱 Portrait';
                    rotationBtn.title = 'Currently locked to portrait - click to unlock';
                } else if (type.startsWith('landscape')) {
                    rotationBtn.textContent = '📱 Landscape';
                    rotationBtn.title = 'Currently locked to landscape - click to unlock';
                } else {
                    rotationBtn.textContent = '🔒 Locked';
                    rotationBtn.title = 'Rotation locked - click to unlock';
                }
                rotationBtn.classList.add('locked');
                setAriaPressed(true);
            } else if (locked === false) {
                // Explicitly unlocked
                rotationBtn.textContent = '🔄 Auto';
                rotationBtn.title = 'Auto rotation enabled - click to lock current orientation';
                rotationBtn.classList.remove('locked');
                setAriaPressed(false);
            } else {
                // locked is unknown -> fall back to type heuristic
                const isPortrait = type.startsWith('portrait') || type === 'portrait';
                const isLandscape = type.startsWith('landscape') || type === 'landscape';

                if (isPortrait) {
                    rotationBtn.textContent = '📱 Portrait';
                    rotationBtn.title = 'Portrait orientation active - click to lock';
                    rotationBtn.classList.add('locked');
                    setAriaPressed(true);
                } else if (isLandscape) {
                    rotationBtn.textContent = '📱 Landscape';
                    rotationBtn.title = 'Landscape orientation active - click to lock';
                    rotationBtn.classList.add('locked');
                    setAriaPressed(true);
                } else {
                    rotationBtn.textContent = '🔄 Auto';
                    rotationBtn.title = 'Auto rotation enabled - click to lock current orientation';
                    rotationBtn.classList.remove('locked');
                    setAriaPressed(false);
                }
            }
        } catch (error) {
            console.debug('Error checking orientation state:', error);
            rotationBtn.textContent = '🔄 Auto';
            rotationBtn.title = 'Auto rotation enabled';
            rotationBtn.classList.remove('locked');
            try { rotationBtn.setAttribute('aria-pressed', 'false'); } catch (e) {}
        }
    }
    
    async toggleRotationLock() {
        console.log('🔄 toggleRotationLock invoked');
        if (!this.screenOrientationSupported) {
            this.showError('Screen rotation control is not supported on this device.');
            return;
        }
        
        try {
            const currentOrientation = this.getCurrentOrientation();
            
            if (screen.orientation.type.includes('primary') || screen.orientation.type.includes('secondary')) {
                // Currently locked, unlock it
                await screen.orientation.unlock();
                console.log('🔄 Orientation unlocked - auto rotation enabled');
                // Immediate visual feedback for user
                try {
                    const rotationBtn = document.getElementById('rotation-control-btn');
                    if (rotationBtn) rotationBtn.textContent = '🔄 Auto';
                    this.showToast('Auto rotation enabled');
                } catch (uiErr) {
                    console.debug('Failed to update UI after unlock:', uiErr);
                }
                
                // Analytics: rotation unlocked
                try {
                    if (window.MLAAnalytics && typeof window.MLAAnalytics.event === 'function') {
                        window.MLAAnalytics.event('rotation_unlocked');
                    }
                } catch (e) {
                    console.debug('Analytics rotation_unlocked error:', e);
                }
            } else {
                // Currently unlocked, lock to current orientation
                const lockOrientation = currentOrientation === 'landscape' ? 'landscape' : 'portrait';
                try {
                    await screen.orientation.lock(lockOrientation);
                    console.log(`🔄 Orientation locked to ${lockOrientation}`);
                    // Immediately reflect locked state in the button text for clearer feedback
                    try {
                        const rotationBtn = document.getElementById('rotation-control-btn');
                        if (rotationBtn) rotationBtn.textContent = lockOrientation === 'portrait' ? '📱 Portrait 🔒' : '📺 Landscape 🔒';
                    } catch (btnErr) {
                        console.debug('Failed to update rotation button text after lock:', btnErr);
                    }
                    // Toast confirmation for clarity
                    try {
                        this.showToast(`Rotation locked to ${lockOrientation}`);
                    } catch (toastErr) {
                        console.debug('Failed to show lock toast:', toastErr);
                    }
                } catch (lockErr) {
                    console.error('❌ Orientation lock failed:', lockErr);

                    // If the error is a permission/security error, guide the user concisely
                    // instead of showing multiple toasts and attempts.
                    if (lockErr && lockErr.name === 'SecurityError') {
                        console.warn('Orientation.lock SecurityError (likely requires fullscreen or installed PWA):', lockErr);
                        try { this.showToast('Rotation lock requires fullscreen or installed PWA'); } catch (t) { console.debug('Failed to show security toast:', t); }
                        return;
                    }

                    // Surface the actual error to the user (helps debugging on mobile)
                    try {
                        const errName = lockErr && lockErr.name ? lockErr.name : 'Error';
                        const errMsg = lockErr && lockErr.message ? lockErr.message : String(lockErr);
                        // Friendly concise toast for quick debugging
                        try { this.showToast(`Lock failed: ${errMsg}`); } catch (t) { console.debug('Failed to show concise lock toast:', t); }
                        // Detailed toast for deeper debugging
                        this.showToast(`Orientation lock failed: ${errName}: ${errMsg}`);
                    } catch (toastErr) {
                        console.debug('Failed to show lockErr toast:', toastErr);
                    }

                    // Some browsers require fullscreen or user gesture/secure context to lock.
                    // Attempt to request fullscreen and retry once.
                    try {
                        this.showToast('Requesting fullscreen to enable orientation lock...');
                        const docEl = document.documentElement;
                        const requestFull = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
                        if (requestFull) {
                            await requestFull.call(docEl);
                            // Wait a short moment for fullscreen to settle
                            await new Promise(r => setTimeout(r, 250));
                            await screen.orientation.lock(lockOrientation);
                            console.log(`🔄 Orientation locked to ${lockOrientation} after fullscreen`);
                            // Update button text immediately for visual feedback
                            try {
                                const rotationBtn = document.getElementById('rotation-control-btn');
                                if (rotationBtn) rotationBtn.textContent = lockOrientation === 'portrait' ? '📱 Portrait 🔒' : '📺 Landscape 🔒';
                            } catch (btnErr2) {
                                console.debug('Failed to update rotation button text after fullscreen lock:', btnErr2);
                            }
                            this.showToast(`Rotation locked to ${lockOrientation}`);
                        } else {
                            throw lockErr;
                        }
                    } catch (fsErr) {
                        console.error('❌ Failed to lock orientation even after fullscreen attempt:', fsErr);
                        // Surface fullscreen attempt error as well
                        try {
                            const fsName = fsErr && fsErr.name ? fsErr.name : 'Error';
                            const fsMsg = fsErr && fsErr.message ? fsErr.message : String(fsErr);
                            try { this.showToast(`Lock failed: ${fsMsg}`); } catch (t) { console.debug('Failed to show concise fs toast:', t); }
                            this.showToast(`Fullscreen+lock failed: ${fsName}: ${fsMsg}`);
                        } catch (toastErr2) {
                            console.debug('Failed to show fsErr toast:', toastErr2);
                        }

                        // Provide user-friendly guidance
                        this.showToast('Unable to lock orientation on this browser. Try installing as PWA or enabling fullscreen/auto-rotate in your device settings.');
                    }
                }
                
                // Analytics: rotation locked
                try {
                    if (window.MLAAnalytics && typeof window.MLAAnalytics.event === 'function') {
                        window.MLAAnalytics.event('rotation_locked', { orientation: lockOrientation });
                    }
                } catch (e) {
                    console.debug('Analytics rotation_locked error:', e);
                }
            }
            
            // Update button state after a short delay to allow the change to take effect
            setTimeout(() => this.updateRotationButtonState(), 100);
            
        } catch (error) {
            console.error('Error toggling rotation lock:', error);
            try {
                const name = error && error.name ? error.name : 'Error';
                const msg = error && error.message ? error.message : String(error);
                this.showError(`Unable to change rotation settings: ${name}: ${msg}`);
                this.showToast(`${name}: ${msg}`);
            } catch (e) {
                // Fallback message if error formatting fails
                this.showError('Unable to change rotation settings. This may not be supported on your device.');
            }
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
            // For uploaded quizzes, calculate score locally
            const isUploadedQuiz = this.currentQuiz && this.currentQuiz.isUploaded;
            
            if (isUploadedQuiz) {
                console.log('📊 Calculating score locally for uploaded quiz');
                
                // Calculate score locally
                let correctCount = 0;
                const results = [];
                
                for (const question of this.questions) {
                    const questionId = question.id.toString();
                    const userAnswer = this.submittedAnswers[questionId];
                    const correctAnswer = question.correct_answer;
                    
                    const isCorrect = userAnswer !== undefined && userAnswer === correctAnswer;
                    if (isCorrect) {
                        correctCount++;
                    }
                    
                    results.push({
                        question_id: question.id,
                        user_answer: userAnswer,
                        correct_answer: correctAnswer,
                        is_correct: isCorrect,
                        question_title: question.title || `Question ${question.id}`
                    });
                }
                
                const score = {
                    correct: correctCount,
                    total: this.questions.length,
                    percentage: Math.round((correctCount / this.questions.length) * 100)
                };
                
                console.log('📊 Local score calculated:', score);
                this.showResults(score, results);
                // Analytics: quiz_finish (local)
                try {
                    if (window.MLAAnalytics && typeof window.MLAAnalytics.event === 'function') {
                        window.MLAAnalytics.event('quiz_finish', {
                            name: this.quizName || null,
                            score: score.percentage,
                            correct: score.correct,
                            total: score.total,
                            method: 'local'
                        });
                    }
                } catch (e) {
                    console.debug('Analytics quiz_finish (local) error:', e);
                }
                
            } else {
                // For server quizzes, submit to API
                console.log('📊 Submitting to server for scoring');
                
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
                    // Analytics: quiz_finish (server)
                    try {
                        if (window.MLAAnalytics && typeof window.MLAAnalytics.event === 'function') {
                            window.MLAAnalytics.event('quiz_finish', {
                                name: this.quizName || null,
                                score: data.score.percentage,
                                correct: data.score.correct,
                                total: data.score.total,
                                method: 'server'
                            });
                        }
                    } catch (e) {
                        console.debug('Analytics quiz_finish (server) error:', e);
                    }
                } else {
                    this.showError('Failed to submit quiz: ' + data.error);
                }
            }
        } catch (error) {
            console.error('Error finishing quiz:', error);
            this.showError('Failed to calculate results. Please try again.');
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
        // Unlock orientation when retrying the quiz to avoid being stuck in lock
        try {
            this.unlockOrientation();
        } catch (e) {
            console.debug('unlockOrientation error in retryQuiz:', e);
        }

        this.currentQuestionIndex = 0;
        this.answers = {};
        this.submittedAnswers = {};
        this.ruledOutAnswers = {};
        this.startQuiz();
    }
    
    showQuizSelection() {
        // Ensure any programmatic orientation locks are released when leaving the quiz selection
        try { this.unlockOrientation(); } catch (e) { console.debug('unlockOrientation error in showQuizSelection:', e); }
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
        // Show the back button only when a quiz or results screen is visible.
        // This prevents the back button appearing on transient overlays (like loading)
        // or other non-interactive screens where a back action would be confusing.
        try {
            const currentScreen = document.querySelector('.screen[style*="block"]');
            if (currentScreen && (currentScreen.id === 'quizScreen' || currentScreen.id === 'resultsScreen')) {
                backBtn.style.display = 'block';
            } else {
                backBtn.style.display = 'none';
            }
        } catch (e) {
            // Fallback to previous behavior if anything goes wrong
            if (title === 'MLA Quiz') {
                backBtn.style.display = 'none';
            } else {
                backBtn.style.display = 'block';
            }
        }
        // Track page view for analytics (if analytics wrapper is loaded)
        try {
            if (window.MLAAnalytics && typeof window.MLAAnalytics.pageView === 'function') {
                window.MLAAnalytics.pageView(window.location.pathname + '#' + title, title);
            }
        } catch (e) {
            // Swallow analytics errors to avoid impacting app
            console.debug('Analytics pageView error:', e);
        }
    }
    
    goBack() {
        const currentScreen = document.querySelector('.screen[style*="block"]');

        // Ensure we unlock orientation when leaving a quiz
        try {
            this.unlockOrientation();
        } catch (e) {
            console.debug('unlockOrientation error in goBack:', e);
        }

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

    // Small non-blocking toast for user feedback (used for rotation feedback)
    showToast(message, duration = 2500) {
        try {
            const existing = document.getElementById('appToast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.id = 'appToast';
            toast.style.cssText = `
                position: fixed;
                left: 50%;
                transform: translateX(-50%);
                bottom: 80px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px 16px;
                border-radius: 12px;
                z-index: 2002;
                font-size: 14px;
                max-width: 90%;
                text-align: center;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                const t = document.getElementById('appToast');
                if (t) t.remove();
            }, duration);
        } catch (e) {
            console.debug('Toast failed:', e);
        }
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
    
    async storeUploadedQuiz(quizData) {
        console.log('🔍 STORAGE DEBUG - Storing quiz:', quizData.name);
        console.log('🔍 STORAGE DEBUG - Quiz has images:', Object.keys(quizData.images || {}));
        
        try {
            // Store in localStorage for persistence
            let uploadedQuizzes = JSON.parse(localStorage.getItem('uploadedQuizzes') || '[]');
            
            // Remove existing quiz with same name
            uploadedQuizzes = uploadedQuizzes.filter(quiz => quiz.name !== quizData.name);
            
            // Calculate sizes
            const dataSize = JSON.stringify(quizData).length;
            const imagesSize = JSON.stringify(quizData.images || {}).length;
            const questionsSize = JSON.stringify(quizData.questions || []).length;
            
            // Adjust limit for mobile devices (2.5MB) vs desktop (5MB)
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const maxLocalStorageSize = isMobile ? 2.5 * 1024 * 1024 : 5 * 1024 * 1024;
            
            console.log('🔍 STORAGE DEBUG - Device type:', isMobile ? 'Mobile' : 'Desktop');
            console.log('🔍 STORAGE DEBUG - Storage limit:', Math.round(maxLocalStorageSize / 1024), 'KB');
            console.log('🔍 STORAGE DEBUG - Total size:', Math.round(dataSize / 1024), 'KB');
            console.log('🔍 STORAGE DEBUG - Images size:', Math.round(imagesSize / 1024), 'KB');
            console.log('🔍 STORAGE DEBUG - Questions size:', Math.round(questionsSize / 1024), 'KB');
            
            // Derive a safe storage key for this quiz
            const storageKey = `quiz_${this.sanitizeStorageKey(quizData.name)}`;

            // On mobile with large images, use IndexedDB
            if (isMobile && imagesSize > 500 * 1024) { // > 500KB of images
                // Ensure IndexedDB is initialised (await if necessary)
                if (!this.db) {
                    try {
                        await this.initIndexedDB();
                    } catch (e) {
                        console.warn('IndexedDB init failed during storeUploadedQuiz:', e);
                    }
                }
                console.log('📱 Mobile device with large images - using IndexedDB for image storage');
                
                // Store images in IndexedDB
                const imageKeys = Object.keys(quizData.images || {});
                let storedCount = 0;
                
                for (const key of imageKeys) {
                    const imageData = quizData.images[key];
                    // Only store actual base64 data in IndexedDB, not references
                    if (typeof imageData === 'string' && imageData.startsWith('data:')) {
                        const success = await this.storeImageInDB(quizData.name, key, imageData);
                        if (success) storedCount++;
                    }
                }
                
                console.log(`✅ Stored ${storedCount}/${imageKeys.length} images in IndexedDB`);
                
                // Store quiz metadata with flag indicating images are in IndexedDB
                // Minimal metadata only — avoid pushing full objects into uploadedQuizzes which may grow large
                const quizMeta = {
                    name: quizData.name,
                    storageKey,
                    total_questions: quizData.total_questions,
                    isUploaded: true,
                    uploadTimestamp: quizData.uploadTimestamp,
                    hasImages: imageKeys.length > 0,
                    imagesInIndexedDB: true, // Flag for image retrieval
                    imageKeys: imageKeys, // Store keys for reference
                    dataStored: 'indexeddb'
                };

                // Add metadata to uploadedQuizzes (small footprint)
                uploadedQuizzes.push(quizMeta);

                // Store full quiz object under its own storageKey
                const fullQuiz = {
                    questions: quizData.questions,
                    images: quizData.images, // actual image data is also in IndexedDB
                    name: quizData.name,
                    total_questions: quizData.total_questions,
                    isUploaded: true,
                    uploadTimestamp: quizData.uploadTimestamp
                };

                try {
                    localStorage.setItem(storageKey, JSON.stringify(fullQuiz));
                    localStorage.setItem('uploadedQuizzes', JSON.stringify(uploadedQuizzes));
                    console.log('✅ Successfully stored quiz using IndexedDB for images (metadata saved separately)');
                    try {
                        if (window.MLAAnalytics && typeof window.MLAAnalytics.event === 'function') {
                            window.MLAAnalytics.event('quiz_upload', {
                                name: quizData.name,
                                total_questions: quizData.total_questions,
                                images: imageKeys.length,
                                storage: 'indexeddb'
                            });
                        }
                    } catch (e) {
                        console.debug('Analytics quiz_upload (indexeddb) error:', e);
                    }
                } catch (storageError) {
                    console.error('❌ Failed to store quiz metadata or full quiz:', storageError);
                    throw storageError;
                }
                
            } else if (dataSize > maxLocalStorageSize) {
                console.log('🔍 STORAGE DEBUG - Quiz too large for localStorage, using split storage');
                
                // Store quiz metadata separately
                const quizMeta = {
                    name: quizData.name,
                    storageKey,
                    total_questions: quizData.total_questions,
                    isUploaded: true,
                    uploadTimestamp: quizData.uploadTimestamp,
                    hasImages: Object.keys(quizData.images || {}).length > 0,
                    dataStored: 'split' // Flag to indicate split storage
                };
                
                // Store only metadata in uploadedQuizzes
                uploadedQuizzes.push(quizMeta);

                // Attempt to store full data under storageKey; fall back to questions-only if quota
                const questionsData = {
                    questions: quizData.questions,
                    images: quizData.images
                };

                try {
                    localStorage.setItem(storageKey, JSON.stringify(questionsData));
                    localStorage.setItem('uploadedQuizzes', JSON.stringify(uploadedQuizzes));
                    console.log('🔍 STORAGE DEBUG - Successfully stored quiz using split storage (full data under storageKey)');
                    try {
                        if (window.MLAAnalytics && typeof window.MLAAnalytics.event === 'function') {
                            window.MLAAnalytics.event('quiz_upload', {
                                name: quizData.name,
                                total_questions: quizData.total_questions,
                                images: Object.keys(quizData.images || {}).length,
                                storage: 'split'
                            });
                        }
                    } catch (e) {
                        console.debug('Analytics quiz_upload (split) error:', e);
                    }
                } catch (quotaError) {
                    console.log('🔍 STORAGE DEBUG - Still too large, removing images to save space');

                    // If still too large, store without images
                    const questionsOnly = {
                        questions: quizData.questions,
                        images: {} // Empty images to save space
                    };

                    try {
                        localStorage.setItem(storageKey, JSON.stringify(questionsOnly));
                        quizMeta.imagesRemoved = true;
                        localStorage.setItem('uploadedQuizzes', JSON.stringify(uploadedQuizzes));
                        // Show user warning about images
                        this.showError('Quiz uploaded successfully, but images were not stored due to browser storage limits. Questions will work but images may not display.');
                    } catch (err) {
                        console.error('🔍 STORAGE ERROR - Failed to store even questionsOnly:', err);
                        throw err;
                    }
                }
            } else {
                // Small enough to store normally. Store minimal metadata list and full quiz under storageKey
                const quizMetaSmall = {
                    name: quizData.name,
                    storageKey,
                    total_questions: quizData.total_questions,
                    isUploaded: true,
                    uploadTimestamp: quizData.uploadTimestamp,
                    hasImages: Object.keys(quizData.images || {}).length > 0,
                    dataStored: 'normal'
                };

                uploadedQuizzes.push(quizMetaSmall);

                const fullQuiz = {
                    ...quizData,
                    storageKey
                };

                try {
                    localStorage.setItem(storageKey, JSON.stringify(fullQuiz));
                    localStorage.setItem('uploadedQuizzes', JSON.stringify(uploadedQuizzes));
                    console.log('🔍 STORAGE DEBUG - Successfully stored quiz normally under storageKey');
                try {
                    if (window.MLAAnalytics && typeof window.MLAAnalytics.event === 'function') {
                        window.MLAAnalytics.event('quiz_upload', {
                            name: quizData.name,
                            total_questions: quizData.total_questions,
                            images: Object.keys(quizData.images || {}).length,
                            storage: 'normal'
                        });
                    }
                } catch (e) {
                    console.debug('Analytics quiz_upload (normal) error:', e);
                }
                } catch (err) {
                    console.error('🔍 STORAGE ERROR - Failed to write full quiz to localStorage:', err);
                    throw err;
                }
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
            try {
                if (window.MLAAnalytics && typeof window.MLAAnalytics.event === 'function') {
                    window.MLAAnalytics.event('quiz_upload', {
                        name: quizData.name,
                        total_questions: quizData.total_questions,
                        images: Object.keys(quizData.images || {}).length,
                        storage: 'memory_fallback'
                    });
                }
            } catch (e) {
                console.debug('Analytics quiz_upload (memory_fallback) error:', e);
            }
        }
    }
    
    async getUploadedQuizzes() {
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
        
        // For split storage or IndexedDB quizzes, reconstruct the data
        const reconstructedQuizzes = [];
        
        for (const quiz of quizzes) {
            // If this entry already contains full quiz data (older format), accept it
            if (quiz.questions && Array.isArray(quiz.questions)) {
                reconstructedQuizzes.push(quiz);
                continue;
            }

            // Prefer storageKey in metadata; fall back to sanitized name
            const storageKey = quiz.storageKey || `quiz_${this.sanitizeStorageKey(quiz.name)}`;

            if (quiz.dataStored === 'indexeddb' && quiz.imagesInIndexedDB) {
                console.log('📱 Reconstructing quiz from IndexedDB:', quiz.name, 'storageKey:', storageKey);
                try {
                    // Try to load the full quiz object from storageKey
                    const storedFull = JSON.parse(localStorage.getItem(storageKey) || 'null');

                    // Get images from IndexedDB (may be empty on desktop)
                    const imagesFromDB = await this.getAllImagesForQuiz(quiz.name);

                    console.log(`✅ Retrieved ${Object.keys(imagesFromDB).length} images from IndexedDB for ${quiz.name}`);

                    const questions = storedFull && Array.isArray(storedFull.questions) ? storedFull.questions : (storedFull?.questions || []);
                    const images = {
                        ...(storedFull && storedFull.images ? storedFull.images : {}),
                        ...imagesFromDB
                    };

                    reconstructedQuizzes.push(Object.assign({}, quiz, {
                        storageKey,
                        questions,
                        images
                    }));
                } catch (error) {
                    console.error('❌ Failed to reconstruct quiz from IndexedDB:', quiz.name, error);
                    reconstructedQuizzes.push(quiz); // Return metadata only
                }
            } else if (quiz.dataStored === 'split') {
                console.log('🔍 STORAGE DEBUG - Reconstructing split storage quiz:', quiz.name, 'storageKey:', storageKey);
                try {
                    const quizData = JSON.parse(localStorage.getItem(storageKey) || '{}');
                    reconstructedQuizzes.push(Object.assign({}, quiz, {
                        storageKey,
                        questions: quizData.questions || [],
                        images: quizData.images || {}
                    }));
                } catch (error) {
                    console.error('🔍 STORAGE ERROR - Failed to reconstruct quiz:', quiz.name, error);
                    reconstructedQuizzes.push(quiz); // Return metadata only
                }
            } else {
                // For normally stored quizzes, try to read the full object from storageKey if present
                try {
                    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
                    if (stored) {
                        reconstructedQuizzes.push(stored);
                    } else {
                        reconstructedQuizzes.push(quiz);
                    }
                } catch (error) {
                    console.error('🔍 STORAGE ERROR - Failed to read stored quiz for', quiz.name, error);
                    reconstructedQuizzes.push(quiz);
                }
            }
        }
        
        console.log('🔍 STORAGE DEBUG - Retrieved', reconstructedQuizzes.length, 'uploaded quizzes');
        reconstructedQuizzes.forEach((quiz, index) => {
            console.log(`🔍 STORAGE DEBUG - Quiz ${index + 1}: ${quiz.name}, Images:`, Object.keys(quiz.images || {}).length);
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

    // Create a safe storage key for localStorage / IndexedDB keys
    sanitizeStorageKey(name) {
        if (!name) return 'quiz_unknown';
        // Replace path separators and other problematic characters with underscore
        return name.toString().trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, '_').substring(0, 120);
    }

    // Robust clear function that removes ALL uploaded quiz data
    async clearAllUploaded() {
        console.log('🗑️ CLEAR DEBUG - Starting comprehensive clear of all uploaded quizzes...');
        try {
            // Step 1: Get all quiz metadata from localStorage
            const uploadedQuizzes = JSON.parse(localStorage.getItem('uploadedQuizzes') || '[]');
            console.log(`🗑️ CLEAR DEBUG - Found ${uploadedQuizzes.length} quizzes in metadata list`);

            // Step 2: Remove per-quiz localStorage entries using sanitized keys
            // This is critical: must match the exact key format used by storeUploadedQuiz
            for (const quiz of uploadedQuizzes) {
                const sanitizedKey = 'quiz_' + this.sanitizeStorageKey(quiz.name);
                try {
                    localStorage.removeItem(sanitizedKey);
                    console.log(`🗑️ CLEAR DEBUG - Removed localStorage key: ${sanitizedKey}`);
                } catch (e) {
                    console.warn(`⚠️ CLEAR DEBUG - Could not remove ${sanitizedKey}:`, e);
                }
            }

            // Step 3: Remove IndexedDB entries for all quizzes
            if (this.db) {
                console.log('🗑️ CLEAR DEBUG - Clearing IndexedDB images...');
                try {
                    const transaction = this.db.transaction(['images'], 'readwrite');
                    const store = transaction.objectStore('images');
                    
                    // Delete all entries matching quiz names from metadata
                    for (const quiz of uploadedQuizzes) {
                        const quizName = quiz.name;
                        // Delete entries with id pattern: `${quizName}_${imageKey}`
                        const index = store.index('quizName');
                        const range = IDBKeyRange.only(quizName);
                        const deleteRequest = index.openCursor(range);

                        deleteRequest.onsuccess = (event) => {
                            const cursor = event.target.result;
                            if (cursor) {
                                cursor.delete();
                                console.log(`🗑️ CLEAR DEBUG - Deleted IndexedDB entry: ${cursor.value.id}`);
                                cursor.continue();
                            }
                        };

                        deleteRequest.onerror = (event) => {
                            console.warn('⚠️ CLEAR DEBUG - IndexedDB delete error:', event.target.error);
                        };
                    }

                    console.log('🗑️ CLEAR DEBUG - IndexedDB images cleared');
                } catch (e) {
                    console.warn('⚠️ CLEAR DEBUG - IndexedDB clear failed:', e);
                }
            } else {
                console.log('ℹ️ CLEAR DEBUG - No IndexedDB available (desktop or unavailable)');
            }

            // Step 4: Remove the uploadedQuizzes metadata list
            try {
                localStorage.removeItem('uploadedQuizzes');
                console.log('🗑️ CLEAR DEBUG - Removed uploadedQuizzes metadata list');
            } catch (e) {
                console.warn('⚠️ CLEAR DEBUG - Could not remove uploadedQuizzes:', e);
            }

            // Step 5: Clear in-memory fallback storage
            if (window.tempUploadedQuizzes) {
                window.tempUploadedQuizzes = [];
                console.log('🗑️ CLEAR DEBUG - Cleared window.tempUploadedQuizzes');
            }

            // Step 6: Verify deletion by checking what remains
            const remainingKeys = Object.keys(localStorage).filter(k => k.startsWith('quiz_'));
            if (remainingKeys.length > 0) {
                console.warn(`⚠️ CLEAR DEBUG - WARNING: ${remainingKeys.length} orphaned quiz_* keys remain:`, remainingKeys);
                // Optionally force-remove any remaining orphaned keys
                remainingKeys.forEach(key => {
                    try {
                        localStorage.removeItem(key);
                        console.log(`🗑️ CLEAR DEBUG - Force-removed orphaned key: ${key}`);
                    } catch (e) {
                        console.warn(`⚠️ CLEAR DEBUG - Could not force-remove ${key}:`, e);
                    }
                });
            }

            console.log('✅ CLEAR DEBUG - Clear operation completed successfully');
            return true;

        } catch (error) {
            console.error('❌ CLEAR DEBUG - Unexpected error during clear:', error);
            return false;
        }
    }
    
    // Format investigations with proper line breaks
    formatInvestigations(investigationsText) {
        if (!investigationsText) return '';
        
        let formatted = investigationsText.trim();
        
        // First, handle lines that start with "- " to ensure they stay on separate lines
        // Replace newlines followed by "- " with a placeholder that won't be collapsed
        formatted = formatted.replace(/\n-\s+/g, '<br>- ');
        
        // Split investigations at natural break points:
        // 1. After reference ranges in parentheses followed by a capital letter
        // 2. After test results with colons followed by a capital letter
        formatted = formatted
            // Pattern: "Value unit (range) NextTest" -> "Value unit (range)<br>NextTest"
            .replace(/(\([^)]+\))\s+([A-Z][A-Za-z])/g, '$1<br>$2')
            // Pattern: "Test: result NextTest" -> "Test: result<br>NextTest" 
            .replace(/(:\s*[a-z][^:]*?)\s+([A-Z][A-Za-z])/g, '$1<br>$2')
            // Collapse multiple spaces but preserve <br> tags
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
                // It's a filename, try to find it in currentQuiz.images
                let imagePath = filename.trim();
                console.log('🖼️ IMAGE DEBUG - Looking for image file:', imagePath);
                
                // Use currentQuiz images if available
                if (this.currentQuiz && this.currentQuiz.images) {
                    console.log('🖼️ IMAGE DEBUG - Searching in currentQuiz.images');
                    
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
                        if (this.currentQuiz.images[key]) {
                            imageData = this.currentQuiz.images[key];
                            foundKey = key;
                            console.log('🖼️ IMAGE DEBUG - Found image with key:', key);
                            break;
                        }
                    }
                    
                    if (imageData) {
                        console.log('🖼️ IMAGE DEBUG - Found embedded image data for:', foundKey);
                        
                        // Handle reference-based storage (resolve references)
                        if (typeof imageData === 'string' && imageData.startsWith('__REF__:')) {
                            const refKey = imageData.substring(8);
                            imageData = this.currentQuiz.images[refKey];
                            console.log('🖼️ IMAGE DEBUG - Resolved reference from', foundKey, 'to', refKey);
                        }
                        
                        if (imageData && imageData.startsWith('data:')) {
                            // Found actual image data
                            return `<div class="image-container"><img src="${imageData}" alt="Image" loading="lazy" onclick="openImageModal('${imageData}', 'Image')"></div>`;
                        } else {
                            console.log('🖼️ IMAGE DEBUG - Image data after resolution:', typeof imageData, imageData?.substring(0, 50) + '...');
                        }
                    } else {
                        console.log('⚠️ Image not found in currentQuiz.images. Available keys:', Object.keys(this.currentQuiz.images).slice(0, 10));
                    }
                } else {
                    console.log('⚠️ currentQuiz or currentQuiz.images not available');
                }
                
                console.log('🖼️ IMAGE DEBUG - No embedded image found, showing as link');
                // Default: show as a link
                return `<a href="#" class="image-link" onclick="alert('Image not available: ${imagePath}'); return false;">🖼️ View Image: ${imagePath}</a>`;
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
                
                // Use currentQuiz images if available (already loaded with IndexedDB data)
                if (this.currentQuiz && this.currentQuiz.images) {
                    console.log('🖼️ IMAGE DEBUG - Using currentQuiz.images for lookup');
                    
                    // Check if the reference key exists directly
                    if (this.currentQuiz.images[refKey]) {
                        let imageData = this.currentQuiz.images[refKey];
                        console.log('🖼️ IMAGE DEBUG - Found direct match for key:', refKey);
                        
                        // If it's another reference, resolve it
                        if (typeof imageData === 'string' && imageData.startsWith('__REF__:')) {
                            const secondRefKey = imageData.substring(8);
                            imageData = this.currentQuiz.images[secondRefKey];
                            console.log('🖼️ IMAGE DEBUG - Resolved nested reference from', refKey, 'to', secondRefKey);
                        }
                        
                        if (imageData && imageData.startsWith('data:')) {
                            actualUrl = imageData;
                            console.log('✅ Resolved markdown reference to base64 data');
                        } else {
                            console.log('⚠️ Found data but not base64:', typeof imageData, imageData?.substring(0, 50));
                        }
                    } else {
                        console.log('⚠️ Key not found:', refKey, 'Available keys:', Object.keys(this.currentQuiz.images).slice(0, 10));
                    }
                } else {
                    console.log('⚠️ currentQuiz or currentQuiz.images not available');
                }
                
                if (actualUrl === url) {
                    console.log('❌ Failed to resolve reference:', refKey);
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
        // Read toggle to decide whether to include explanations
        const includeExplanationsEl = document.getElementById('include-explanations-toggle');
        const includeExplanations = includeExplanationsEl ? includeExplanationsEl.checked : true;
        
        // Check if there's any data to report
        if (reportData.totalQuestions === 0) {
            alert('No questions answered yet. Please answer at least one question to generate a report.');
            return;
        }
        
    const reportHTML = this.generateReportHTML(reportData, includeExplanations);
        
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
            answeredQuestionsList: (function(){
                const answered = [];
                Object.keys(this.submittedAnswers).forEach(questionId => {
                    const question = this.questions.find(q => q.id == questionId);
                    if (question) {
                        const questionIndex = this.questions.findIndex(q => q.id == questionId);
                        answered.push({
                            index: questionIndex,
                            question: question,
                            yourAnswer: this.submittedAnswers[questionId],
                            correctAnswer: question.correct_answer
                        });
                    }
                }, this);
                return answered;
            }).call(this),
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

    generateReportHTML(data, includeExplanations = true) {
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
                            ${includeExplanations && ((q.question.explanations && q.question.explanations.length) || q.question.explanation) ? `
                                <div class="explanation-section">
                                    <strong>Explanation:</strong>
                                    <div class="explanation-text">${this.cleanTextForPDF(Array.isArray(q.question.explanations) && q.question.explanations.length ? q.question.explanations.join('\n') : (q.question.explanation || ''))}</div>
                                </div>
                            ` : ''}
                        </div>
                    `).join('') : 
                    '<p>🎉 Great job! No incorrect answers to review so far.</p>'
                }
                ${isPartialReport ? '<p><em>Note: Only showing answered questions. Continue the quiz for complete analysis.</em></p>' : ''}
            </div>

            <div class="answered-questions">
                <h3>📝 Answered Questions & Explanations</h3>
                ${includeExplanations && data.answeredQuestionsList.length > 0 ? data.answeredQuestionsList.map(q => `
                    <div class="question-text">
                        <strong>Question ${q.index + 1}:</strong>
                        <div style="margin-top:8px;">${this.cleanTextForPDF(q.question.prompt || q.question.scenario || '')}</div>
                    </div>
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
                        <p><strong>Your Answer:</strong> ${q.yourAnswer != null ? 'Option ' + String.fromCharCode(65 + q.yourAnswer) + ' - ' + this.cleanTextForPDF(q.question.options[q.yourAnswer] || 'N/A') : 'N/A'}</p>
                        <p><strong>Correct Answer:</strong> ${q.correctAnswer != null ? 'Option ' + String.fromCharCode(65 + q.correctAnswer) + ' - ' + this.cleanTextForPDF(q.question.options[q.correctAnswer] || 'N/A') : 'N/A'}</p>
                    </div>
                    ${includeExplanations && ((q.question.explanations && q.question.explanations.length) || q.question.explanation) ? `
                        <div class="explanation-section">
                            <strong>Explanation:</strong>
                            <div class="explanation-text">${this.cleanTextForPDF(Array.isArray(q.question.explanations) && q.question.explanations.length ? q.question.explanations.join('\n') : (q.question.explanation || ''))}</div>
                        </div>
                    ` : ''}
                `).join('') : '<p>No answered questions available.</p>'}
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
            toggleBtn.style.cssText = 'background: none; border: none; color: #007AFF; font-size: 14px; cursor: pointer; padding: 8px;';
            toggleBtn.onclick = () => this.toggleDarkMode();

            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            toggleBtn.textContent = currentTheme === 'dark' ? '☀️ Light' : '🌙 Dark';

            const navRight = navbar.querySelector('.nav-right');
            if (navRight) {
                navRight.appendChild(toggleBtn);
            } else {
                navbar.appendChild(toggleBtn);
            }
            console.log('Dark mode toggle added to navbar');
        } else {
            console.log('Navbar not found, retrying in 100ms');
            setTimeout(() => this.addDarkModeToggle(), 100);
        }
    }

    setHapticsEnabled(enabled) {
        this.hapticsOptIn = enabled;
        localStorage.setItem('hapticsEnabled', enabled ? 'true' : 'false');
        
        // Update button icon and tooltip
        const toggleBtn = document.getElementById('haptics-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = enabled ? '🔔' : '🔕';
            toggleBtn.title = enabled ? 'Haptics: On (click to disable)' : 'Haptics: Off (click to enable)';
        }
        
        // Provide brief feedback when enabling
        if (enabled && this.vibrationSupported) {
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!prefersReducedMotion && 'vibrate' in navigator) {
                navigator.vibrate(50);
            }
        }
        
        console.log(`Haptics ${enabled ? 'enabled' : 'disabled'}`);
    }

    addHapticsToggle() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            // Remove existing toggle if present
            const existingToggle = document.querySelector('.haptics-controls');
            if (existingToggle) {
                existingToggle.remove();
            }
            
            // Create a container similar to font-controls
            const hapticsControls = document.createElement('div');
            hapticsControls.className = 'haptics-controls';
            
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'haptics-toggle';
            toggleBtn.className = 'haptics-btn';
            toggleBtn.onclick = () => this.setHapticsEnabled(!this.hapticsOptIn);
            
            toggleBtn.textContent = this.hapticsOptIn ? '🔔' : '🔕';
            toggleBtn.title = this.hapticsOptIn ? 'Haptics: On (click to disable)' : 'Haptics: Off (click to enable)';
            
            hapticsControls.appendChild(toggleBtn);
            const navRight = navbar.querySelector('.nav-right');
            if (navRight) {
                navRight.appendChild(hapticsControls);
            } else {
                navbar.appendChild(hapticsControls);
            }
            console.log('Haptics toggle added to navbar');
        } else {
            console.log('Navbar not found, retrying in 100ms');
            setTimeout(() => this.addHapticsToggle(), 100);
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
        
    // Initialize calculators available in the main UI (frailty, Barthel, etc.)
    this.initializeFrailtyCalculator();
    this.initializeBarthelCalculator();
        
        console.log('🩺 Medical tools initialized');
    }

    initializeAnatomyExplorer() {
        try {
            if (this.anatomyInitialized) return;
            this.anatomyInitialized = true;

            console.log('🦴 Initializing anatomy explorer...');

            // Wire toolbar/search within the anatomy panel
            const toggleBones = document.getElementById('toggleBones');
            const toggleMuscles = document.getElementById('toggleMuscles');
            const searchInput = document.getElementById('searchAnatomy');
            const searchBtn = document.getElementById('searchAnatomyBtn');

            // Default load: bones layer (falls back to programmatic map)
            this.anatomyLayer = 'bones';
            this.anatomyView = 'front';

            // Load structured anatomy data first so the normalizer can map
            // SVG element ids/titles to anatomy keys when the SVG is injected.
            (async () => {
                try {
                    const res = await fetch('/static/anatomy/anatomy_data.json', { cache: 'no-cache' });
                    if (res && res.ok) {
                        this.anatomyData = await res.json();
                        console.log('📚 Loaded anatomy structured data');
                    }
                } catch (err) {
                    console.warn('⚠️ Unable to load anatomy structured data before SVG injection:', err);
                }

                // Now load the SVG (will call normalizeAnatomySvg after injection)
                this.loadAnatomyMap(this.anatomyLayer, this.anatomyView);
            })();
            // Helper to update active states for layer buttons
            const updateLayerButtons = () => {
                if (toggleBones) toggleBones.classList.toggle('active', this.anatomyLayer === 'bones');
                if (toggleMuscles) toggleMuscles.classList.toggle('active', this.anatomyLayer === 'muscles');
            };

            // Initialize button active state
            updateLayerButtons();

            if (toggleBones) {
                toggleBones.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.anatomyLayer = 'bones';
                    updateLayerButtons();
                    this.loadAnatomyMap(this.anatomyLayer, this.anatomyView);
                });
            }

            if (toggleMuscles) {
                toggleMuscles.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.anatomyLayer = 'muscles';
                    updateLayerButtons();
                    this.loadAnatomyMap(this.anatomyLayer, this.anatomyView);
                });
            }

            // View toggles (anterior/posterior)
            const viewAnterior = document.getElementById('viewAnterior');
            const viewPosterior = document.getElementById('viewPosterior');
            const setView = (v) => {
                this.anatomyView = v;
                // Simple visual active state
                if (viewAnterior && viewPosterior) {
                    viewAnterior.classList.toggle('active', v === 'front');
                    viewPosterior.classList.toggle('active', v === 'back');
                }
                // reload current layer
                this.loadAnatomyMap(this.anatomyLayer || 'bones', this.anatomyView);
            };

            if (viewAnterior) viewAnterior.addEventListener('click', () => setView('front'));
            if (viewPosterior) viewPosterior.addEventListener('click', () => setView('back'));

            // Debounced search
            let searchTimer = null;
            const doSearch = (q) => { this.searchAnatomy(q); };

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimer);
                    const q = e.target.value || '';
                    searchTimer = setTimeout(() => doSearch(q.trim()), 250);
                });
            }

            if (searchBtn) {
                searchBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const q = (searchInput && searchInput.value) ? searchInput.value.trim() : '';
                    doSearch(q);
                });
            }

            // (JSON load moved earlier to ensure normalizer has structured data)

            console.log('✅ Anatomy explorer initialized');
        } catch (err) {
            console.error('❌ Failed to initialize anatomy explorer:', err);
        }
    }

    renderAnatomyMap() {
        const bodyMap = document.getElementById('bodyMap');
        if (!bodyMap) {
            console.error('❌ Body map container not found');
            return;
        }

        // Create SVG body map with basic skeleton structure
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 200 400');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.maxWidth = '300px';
        svg.style.margin = '0 auto';
        svg.style.display = 'block';

        // Define anatomical structures with their positions and info
        const structures = [
            { id: 'skull', name: 'Skull', x: 100, y: 30, width: 40, height: 35, info: 'Protects the brain and houses sensory organs. Composed of cranial bones including frontal, parietal, temporal, occipital, sphenoid, and ethmoid bones.' },
            { id: 'spine', name: 'Spinal Column', x: 95, y: 70, width: 10, height: 200, info: 'Supports the body and protects the spinal cord. Consists of 33 vertebrae divided into cervical (7), thoracic (12), lumbar (5), sacral (5), and coccygeal (4) regions.' },
            { id: 'ribs', name: 'Ribs', x: 70, y: 90, width: 60, height: 80, info: '12 pairs of curved bones that form the rib cage, protecting vital organs like heart and lungs. True ribs (1-7) attach directly to sternum, false ribs (8-12) attach indirectly.' },
            { id: 'sternum', name: 'Sternum', x: 95, y: 100, width: 10, height: 40, info: 'Breastbone - flat bone in center of chest that connects ribs and provides attachment for muscles. Consists of manubrium, body, and xiphoid process.' },
            { id: 'humerus', name: 'Humerus', x: 50, y: 140, width: 15, height: 80, info: 'Upper arm bone. Longest bone in upper limb, articulates with scapula at shoulder and radius/ulna at elbow.' },
            { id: 'radius', name: 'Radius', x: 35, y: 200, width: 8, height: 60, info: 'Lateral forearm bone. Allows forearm rotation (supination/pronation) and forms part of elbow and wrist joints.' },
            { id: 'ulna', name: 'Ulna', x: 45, y: 200, width: 8, height: 60, info: 'Medial forearm bone. Forms the bony prominence of the elbow (olecranon process) and stabilizes forearm.' },
            { id: 'femur', name: 'Femur', x: 85, y: 220, width: 15, height: 100, info: 'Thigh bone. Longest and strongest bone in body. Articulates with hip (acetabulum) and tibia/fibula at knee.' },
            { id: 'tibia', name: 'Tibia', x: 85, y: 300, width: 10, height: 70, info: 'Shin bone. Larger of two lower leg bones, bears most of body weight, forms knee and ankle joints.' },
            { id: 'fibula', name: 'Fibula', x: 95, y: 300, width: 8, height: 70, info: 'Lateral lower leg bone. Provides attachment for muscles but bears less weight than tibia.' },
            { id: 'patella', name: 'Patella', x: 90, y: 270, width: 8, height: 12, info: 'Kneecap. Sesamoid bone embedded in quadriceps tendon, protects knee joint and improves mechanical advantage of thigh muscles.' }
        ];

        // Create clickable areas for each structure
        structures.forEach(structure => {
            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', structure.x - structure.width/2);
            rect.setAttribute('y', structure.y - structure.height/2);
            rect.setAttribute('width', structure.width);
            rect.setAttribute('height', structure.height);
            rect.setAttribute('data-structure', structure.id);
            rect.setAttribute('fill', '#e3f2fd');
            rect.setAttribute('stroke', '#1976d2');
            rect.setAttribute('stroke-width', '2');
            rect.setAttribute('rx', '3');
            rect.style.cursor = 'pointer';
            rect.style.opacity = '0.7';
            
            // Add hover effects
            rect.addEventListener('mouseover', () => {
                rect.style.opacity = '1';
                rect.setAttribute('fill', '#bbdefb');
            });
            
            rect.addEventListener('mouseout', () => {
                rect.style.opacity = '0.7';
                rect.setAttribute('fill', '#e3f2fd');
            });
            
            // Add click handler (use id as key for structured lookup)
            rect.addEventListener('click', () => {
                this.showStructureInfo(structure.id, structure.info);
            });
            
            svg.appendChild(rect);
            
            // Add label
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', structure.x);
            text.setAttribute('y', structure.y + structure.height/2 + 15);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('data-structure', structure.id);
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', '#333');
            text.textContent = structure.name;
            svg.appendChild(text);
        });

        // Clear existing content and add SVG
        bodyMap.innerHTML = '';
        bodyMap.appendChild(svg);
        
        // Add instruction text
        const instruction = document.createElement('p');
        instruction.textContent = 'Click on any bone to learn more about it';
        instruction.style.textAlign = 'center';
        instruction.style.marginTop = '10px';
        instruction.style.fontSize = '14px';
        instruction.style.color = '#666';
        bodyMap.appendChild(instruction);
    }

    normalizeAnatomySvg(container) {
        try {
            if (!container) return;
            const svg = container.querySelector && container.querySelector('svg');
            if (!svg) return;

            if (!this.anatomyData || typeof this.anatomyData !== 'object') {
                console.debug('normalizeAnatomySvg: anatomyData not available yet');
                return;
            }

            // Build a map of normalized keys -> original key
            const keyMap = {};
            Object.keys(this.anatomyData).forEach(k => {
                const nk = (k || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
                if (nk) keyMap[nk] = k;
            });

            const allEls = svg.querySelectorAll('*');
            const mappings = {};

            allEls.forEach(el => {
                try {
                    // Skip if already annotated
                    if (el.getAttribute && el.getAttribute('data-structure')) return;

                    const candidateAttrs = [];

                    if (el.id) candidateAttrs.push(el.id);
                    const aria = el.getAttribute && el.getAttribute('aria-label');
                    if (aria) candidateAttrs.push(aria);
                    const dname = el.getAttribute && (el.getAttribute('data-name') || el.getAttribute('data-label'));
                    if (dname) candidateAttrs.push(dname);
                    const inks = el.getAttribute && el.getAttribute('inkscape:label');
                    if (inks) candidateAttrs.push(inks);
                    // title element if present
                    const titleEl = el.querySelector && el.querySelector('title');
                    if (titleEl && titleEl.textContent) candidateAttrs.push(titleEl.textContent.trim());

                    // No candidate strings, skip
                    if (candidateAttrs.length === 0) return;

                    const normalizedCandidates = candidateAttrs.map(s => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, ''))
                        .filter(Boolean);
                    if (normalizedCandidates.length === 0) return;

                    // Find best matching key (exact normalized match preferred, then substring longest)
                    let bestKey = null;
                    let bestMatchLen = 0;

                    for (const cand of normalizedCandidates) {
                        if (keyMap[cand]) {
                            bestKey = keyMap[cand];
                            bestMatchLen = cand.length;
                            break; // exact match highest priority
                        }

                        // substring matches
                        Object.keys(keyMap).forEach(k2 => {
                            if (!k2) return;
                            if (cand.includes(k2) || k2.includes(cand)) {
                                if (k2.length > bestMatchLen) {
                                    bestMatchLen = k2.length;
                                    bestKey = keyMap[k2];
                                }
                            }
                        });
                    }

                    if (bestKey) {
                        // Annotate element and propagate to children when useful
                        el.setAttribute('data-structure', bestKey);
                        el.style.cursor = 'pointer';

                        // Make interactive for keyboard users and prevent duplicate bindings
                        try {
                            if (!el.dataset.anatomyBound) {
                                el.setAttribute('tabindex', '0');
                                // Role button helps assistive tech understand this is interactive
                                el.setAttribute('role', 'button');

                                // Capture key activation (Enter / Space)
                                const k = bestKey;
                                el.addEventListener('keydown', (ev) => {
                                    if (ev.key === 'Enter' || ev.key === ' ') {
                                        ev.preventDefault();
                                        try { this.showStructureInfo(k); } catch (e) {}
                                    }
                                });

                                // Click should also show info
                                el.addEventListener('click', (ev) => {
                                    try { this.showStructureInfo(k); } catch (e) {}
                                });

                                el.dataset.anatomyBound = '1';
                            }
                        } catch (bindErr) {
                            // Non-fatal if individual element can't be enhanced
                        }

                        if (!mappings[bestKey]) mappings[bestKey] = [];
                        mappings[bestKey].push(el);

                        // If this is a group, propagate to descendants that don't have an annotation
                        if (el.tagName && el.tagName.toLowerCase() === 'g') {
                            el.querySelectorAll('*').forEach(child => {
                                if (child.getAttribute && !child.getAttribute('data-structure')) {
                                    child.setAttribute('data-structure', bestKey);
                                }
                            });
                        }

                        // Ensure an accessible title exists for the element
                        const existingTitle = el.querySelector && el.querySelector('title');
                        if (!existingTitle) {
                            try {
                                const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                                t.textContent = (this.anatomyData[bestKey] && this.anatomyData[bestKey].commonName) ? this.anatomyData[bestKey].commonName : bestKey;
                                // insert as first child (some SVG libs don't support prepend)
                                el.insertBefore(t, el.firstChild);
                            } catch (e) {
                                // ignore title insertion failures
                            }
                        }
                    }
                } catch (innerErr) {
                    // per-element failures shouldn't abort normalization
                }
            });

            console.log('🔗 Anatomy normalizer mappings:', mappings);
            return mappings;
        } catch (err) {
            console.warn('⚠️ normalizeAnatomySvg error:', err);
        }
    }

    showStructureInfo(key, fallbackInfo) {
        const infoDiv = document.getElementById('structureInfo') || document.getElementById('anatomyInfo');
        if (!infoDiv) {
            console.error('❌ Structure info container not found');
            return;
        }

        // Try to look up the structure in anatomyData using a few fallbacks so
        // keys inserted into SVG (which may be original keys or normalized ids)
        // resolve correctly.
        const rawKey = (key || '').toString();
        const kLower = rawKey.toLowerCase();
        let data = null;
        if (this.anatomyData) {
            data = this.anatomyData[rawKey] || this.anatomyData[kLower] || null;
        }

        if (data) {
            // Ensure container is announced to assistive tech and focusable for keyboard flow
            try {
                infoDiv.setAttribute('role', 'region');
                infoDiv.setAttribute('aria-live', 'polite');
                infoDiv.setAttribute('aria-label', data.commonName || rawKey);
                infoDiv.setAttribute('tabindex', '-1');
            } catch (e) {}

            // Render using the shared anatomy-info-card class so dark mode styles
            // apply consistently (avoid inline light-theme colors)
            infoDiv.innerHTML = `
                <div class="anatomy-info-card">
                    <h3 style="margin:0 0 8px;">${data.commonName || rawKey}</h3>
                    ${data.brief ? `<p style="margin:0 0 8px;">${data.brief}</p>` : ''}
                    ${data.image ? `<div style="margin-top:8px;text-align:center;"><img src="${data.image}" alt="${data.commonName || rawKey}" loading="lazy" style="max-width:100%;height:auto;border-radius:6px;"></div>` : ''}
                    <div style="display:grid;grid-template-columns: 1fr 1fr; gap:8px; margin-top:8px; font-size:0.95rem;">
                        <div><strong>Origin</strong><div>${data.origin || '—'}</div></div>
                        <div><strong>Insertion</strong><div>${data.insertion || '—'}</div></div>
                        <div><strong>Innervation</strong><div>${data.innervation || '—'}</div></div>
                        <div><strong>Action</strong><div>${data.action || '—'}</div></div>
                    </div>
                    ${data.clinicalPearl ? `<div style="margin-top:10px;background:var(--anatomy-info-bg);padding:8px;border-radius:6px;border:1px solid var(--anatomy-info-border);"><strong>Clinical pearl:</strong><div style="margin-top:6px">${data.clinicalPearl}</div></div>` : ''}
                    ${data.reference ? `<div style="margin-top:10px;font-size:0.9rem;color:#0b66c3;"><a href="${data.reference}" target="_blank" rel="noopener">Learn more / reference</a></div>` : ''}
                </div>
            `;
        } else {
            // Fallback to a simple display using the same card class
            const label = rawKey || 'Structure';
            const infoText = fallbackInfo || '';
            infoDiv.innerHTML = `
                <div class="anatomy-info-card">
                    <h3 style="margin:0 0 8px;">${label}</h3>
                    <p style="margin:0;">${infoText}</p>
                </div>
            `;
        }

        // Smooth scroll to info section and move focus so screen readers announce the content
        try {
            infoDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            // Focus the region so screen readers jump to it
            infoDiv.focus({ preventScroll: true });
        } catch (e) {}
    }

    initializeFrailtyCalculator() {
        try {
            const container = document.getElementById('frailty-rockwood');
            const optionsEl = document.getElementById('frailtyOptions');
            const resultEl = document.getElementById('frailtyResult');
            if (!container || !optionsEl || !resultEl) {
                console.debug('Frailty calculator elements not found; skipping initialization');
                return;
            }

            const descriptions = {
                1: 'Very fit — robust, active, energetic and motivated. Typically exercises regularly.',
                2: 'Well — no active disease symptoms but less fit than category 1.',
                3: 'Managing well — medical problems are well controlled, not regularly active beyond routine activities.',
                4: 'Vulnerable — not dependent on others for daily help, but symptoms limit activities.',
                5: 'Mildly frail — evident slowing and need help in high order instrumental activities of daily living.',
                6: 'Moderately frail — need help with all outside activities and with keeping house.',
                7: 'Severely frail — completely dependent for personal care, but stable and not at high risk of dying within 6 months.',
                8: 'Very severely frail — completely dependent, approaching the end of life. Typically approaching high risk of dying.',
                9: 'Terminally ill — life expectancy <6 months, not otherwise evidently frail.'
            };

            // Delegate click handling
            optionsEl.addEventListener('click', (e) => {
                const opt = e.target.closest('.frailty-option');
                if (!opt) return;

                // Clear previous selection
                optionsEl.querySelectorAll('.frailty-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');

                const val = opt.getAttribute('data-value');
                const desc = descriptions[val] || '';

                // Simple guidance based on cutpoints
                let guidance = '';
                const num = parseInt(val, 10);
                if (num >= 1 && num <= 3) {
                    guidance = 'Not frail — routine care. Encourage activity and prevention.';
                } else if (num === 4) {
                    guidance = 'Pre-frail/vulnerable — consider targeted interventions (exercise, medication review).';
                } else if (num >= 5 && num <= 6) {
                    guidance = 'Frailty present — consider CGA (comprehensive geriatric assessment), falls review and medication optimisation.';
                } else if (num >= 7) {
                    guidance = 'High dependency — prioritise care needs, consider palliative needs assessment where appropriate.';
                }

                resultEl.innerHTML = `<strong>Score: ${val}</strong><div style="margin-top:6px;">${desc}</div><div style="margin-top:8px;color:#374151;font-size:0.95rem;">${guidance}</div>`;
            });

            console.log('🧮 Frailty (Rockwood) calculator initialized');
        } catch (err) {
            console.error('❌ Failed to initialize frailty calculator:', err);
        }
    }

    initializeBarthelCalculator() {
        try {
            const container = document.getElementById('barthel-index');
            const itemsContainer = document.getElementById('barthelItems');
            const totalEl = document.getElementById('barthelTotal');
            if (!container || !itemsContainer || !totalEl) {
                console.debug('Barthel elements not present; skipping initialization');
                return;
            }

            const computeTotal = () => {
                // Sum all selected radio values within barthelItems
                let total = 0;
                const radios = itemsContainer.querySelectorAll('input[type="radio"]');
                const namesSeen = new Set();
                radios.forEach(r => {
                    if (!namesSeen.has(r.name)) namesSeen.add(r.name);
                });

                namesSeen.forEach(name => {
                    const sel = itemsContainer.querySelector(`input[name="${name}"]:checked`);
                    if (sel) total += parseInt(sel.value, 10) || 0;
                });

                // Interpretation categories (simple guidance)
                let interpretation = 'Dependent';
                if (total === 100) interpretation = 'Independent';
                else if (total >= 91) interpretation = 'Slight dependency';
                else if (total >= 61) interpretation = 'Moderate dependency';
                else if (total >= 21) interpretation = 'Severe dependency';
                else interpretation = 'Total dependency';

                totalEl.textContent = `Total: ${total} / 100 — Interpretation: ${interpretation}`;
            };

            // Use event delegation to handle changes
            itemsContainer.addEventListener('change', (e) => {
                const input = e.target;
                if (input && input.matches('input[type="radio"]')) {
                    computeTotal();
                }
            });

            // Initialize total in case default selections exist
            computeTotal();

            console.log('🧮 Barthel Index calculator initialized');
        } catch (err) {
            console.error('❌ Failed to initialize Barthel calculator:', err);
        }
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
            try {
                // If the medical tools panel was opened via our toggle, prefer in-panel navigation first
                if (medicalToolsOpen) {
                    event.preventDefault();

                    if (event.state && event.state.tool && currentTool && currentTool !== 'calculators') {
                        // If a specific tool was open, step back to calculators list
                        this.switchMedicalTool('calculators');
                        currentTool = 'calculators';
                        return;
                    }

                    // Otherwise close the medical tools panel
                    closeMedicalTools();
                    return;
                }

                // If not in the medical tools overlay but a tool panel is active, close it or step back
                const activeToolPanel = document.querySelector('.tool-panel.active');
                if (activeToolPanel) {
                    // If a calculator detail is open, show calculators first
                    if (activeToolPanel.id === 'calculator-detail' || document.getElementById('calculator-detail')?.classList.contains('active')) {
                        this.switchMedicalTool('calculators');
                        return;
                    }

                    // Otherwise return to the calculators hub or close the panel
                    this.switchMedicalTool('calculators');
                    return;
                }

                // Final fallback: show quiz selection if available, otherwise no-op
                if (typeof this.showQuizSelection === 'function') {
                    this.showQuizSelection();
                } else {
                    const quizScreen = document.getElementById('quizScreen');
                    if (quizScreen) {
                        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                        quizScreen.classList.add('active');
                    } else {
                        console.log('Back navigation: no quiz selection screen to show');
                    }
                }
            } catch (err) {
                console.warn('Error handling back navigation in setupMobileBackButton:', err);
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
            case 'mse':
                calculatorTitle = 'Mental State Examination';
                calculatorContent += this.getMSECalculator();
                break;
            case 'mmse':
                calculatorTitle = 'Mini Mental State Examination';
                calculatorContent += this.getMMSECalculator();
                break;
            case 'insulin-sliding':
                calculatorTitle = 'Insulin Sliding Scale';
                calculatorContent += this.getInsulinSlidingCalculator();
                break;
            case 'vasopressor':
                calculatorTitle = 'Vasopressor Dosing';
                calculatorContent += this.getVasopressorCalculator();
                break;
            case 'unit-converter':
                calculatorTitle = 'Clinical Unit Converter';
                calculatorContent += this.getUnitConverterCalculator();
                break;
            case 'drug-volume':
                calculatorTitle = 'Drug Volume Calculator';
                calculatorContent += this.getDrugVolumeCalculator();
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
            case 'rass':
                calculatorTitle = 'RASS Scale';
                calculatorContent += this.getRASSCalculator();
                break;
            case 'frax-fracture':
                calculatorTitle = 'FRAX Fracture Risk';
                calculatorContent += this.getFractureRiskCalculator();
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
            case 'frailty':
                calculatorTitle = 'Clinical Frailty Scale (Rockwood)';
                calculatorContent += this.getFrailtyCalculator();
                break;
            case 'barthel':
                calculatorTitle = 'Barthel Index (ADL)';
                calculatorContent += this.getBarthelCalculator();
                break;
            case 'anion-gap':
                calculatorTitle = 'Anion Gap Calculator';
                calculatorContent += this.getAnionGapCalculator();
                break;
            default:
                calculatorTitle = 'Calculator';
                calculatorContent += '<p>Calculator not found.</p>';
        }
        
        calculatorContent += '</div>';
        calculatorContent = calculatorContent.replace('<h3 id="calculator-title"></h3>', `<h3 id="calculator-title">${calculatorTitle}</h3>`);
        container.innerHTML = calculatorContent;

        // Attach export buttons to results and per-calculator notes area
        try {
            // Ensure export features are available across calc-result blocks
            if (typeof this.setupExportFeatures === 'function') {
                this.setupExportFeatures();
            }

            // Add notes area for this calculator (persisted via localStorage)
            if (typeof this.setupCalculatorNotes === 'function') {
                this.setupCalculatorNotes(calcType);
            }
        } catch (err) {
            console.warn('⚠️ Failed to setup export/features or notes for calculator:', err);
        }

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

    getFrailtyCalculator() {
        return `
            <div class="calculator-form">
                <h4>Clinical Frailty Scale (Rockwood)</h4>
                <p><small>Select the category that best matches the patient</small></p>
                <div class="calc-input-group" id="frailty-options-detail">
                    <select id="frailty-select">
                        <option value="">-- Select frailty score --</option>
                        <option value="1">1 — Very fit</option>
                        <option value="2">2 — Well</option>
                        <option value="3">3 — Managing well</option>
                        <option value="4">4 — Vulnerable</option>
                        <option value="5">5 — Mildly frail</option>
                        <option value="6">6 — Moderately frail</option>
                        <option value="7">7 — Severely frail</option>
                        <option value="8">8 — Very severely frail</option>
                        <option value="9">9 — Terminally ill</option>
                    </select>
                </div>
                <button onclick="window.quizApp.calculateFrailty()">Calculate</button>
                <div id="frailty-detail-result" class="calc-result"></div>
                <div class="calc-reference"><small>Rockwood Clinical Frailty Scale (1–9): use as an aid to clinical judgement.</small></div>
            </div>
        `;
    }

    calculateFrailty() {
        const sel = document.getElementById('frailty-select');
        const out = document.getElementById('frailty-detail-result');
        if (!sel || !out) return;
        const val = sel.value;
        if (!val) {
            out.innerHTML = '<p class="error">Please select a frailty score</p>';
            return;
        }
        const descriptions = {
            1: 'Very fit — robust, active, energetic and motivated. Typically exercises regularly.',
            2: 'Well — no active disease symptoms but less fit than category 1.',
            3: 'Managing well — medical problems are well controlled, not regularly active beyond routine activities.',
            4: 'Vulnerable — not dependent on others for daily help, but symptoms limit activities.',
            5: 'Mildly frail — evident slowing and need help in high order instrumental activities of daily living.',
            6: 'Moderately frail — need help with all outside activities and with keeping house.',
            7: 'Severely frail — completely dependent for personal care, but stable and not at high risk of dying within 6 months.',
            8: 'Very severely frail — completely dependent, approaching the end of life. Typically approaching high risk of dying.',
            9: 'Terminally ill — life expectancy <6 months, not otherwise evidently frail.'
        };
        const guidance = (n) => {
            const num = parseInt(n, 10);
            if (num <= 3) return 'Not frail — encourage activity and prevention.';
            if (num === 4) return 'Pre-frail/vulnerable — consider targeted interventions (exercise, medication review).';
            if (num >=5 && num <=6) return 'Frailty present — consider CGA, falls review and medication optimisation.';
            return 'High dependency — prioritise care needs, consider palliative needs assessment where appropriate.';
        };

        out.innerHTML = `
            <div>
                <strong>Score: ${val}</strong>
                <div style="margin-top:8px">${descriptions[val]}</div>
                <div style="margin-top:8px;color:#374151;font-weight:600">${guidance(val)}</div>
            </div>
        `;
    }

    getBarthelCalculator() {
        return `
            <div class="calculator-form">
                <h4>Barthel Index (ADL)</h4>
                <p><small>Complete the items and press Calculate</small></p>
                <div class="calc-input-group" id="barthel-detail-items">
                    <!-- Simplified form: items named to match common Barthel scoring -->
                    <label>Feeding: <select id="b-feeding"><option value="0">Dependent (0)</option><option value="5">Needs assistance (5)</option><option value="10">Independent (10)</option></select></label>
                    <label>Bathing: <select id="b-bathing"><option value="0">Dependent (0)</option><option value="5">Independent (5)</option></select></label>
                    <label>Grooming: <select id="b-grooming"><option value="0">Needs help (0)</option><option value="5">Independent (5)</option></select></label>
                    <label>Dressing: <select id="b-dressing"><option value="0">Dependent (0)</option><option value="5">Needs help (5)</option><option value="10">Independent (10)</option></select></label>
                    <label>Bowels: <select id="b-bowels"><option value="0">Incontinent (0)</option><option value="5">Occasional accident (5)</option><option value="10">Continent (10)</option></select></label>
                    <label>Bladder: <select id="b-bladder"><option value="0">Incontinent (0)</option><option value="5">Occasional accident (5)</option><option value="10">Continent (10)</option></select></label>
                    <label>Toilet use: <select id="b-toilet"><option value="0">Dependent (0)</option><option value="5">Needs some help (5)</option><option value="10">Independent (10)</option></select></label>
                    <label>Transfers (bed-chair): <select id="b-transfers"><option value="0">Dependent (0)</option><option value="5">Major help (5)</option><option value="10">Minor help (10)</option><option value="15">Independent (15)</option></select></label>
                    <label>Mobility (level): <select id="b-mobility"><option value="0">Dependent (0)</option><option value="5">Immobile (5)</option><option value="10">Walks with help (10)</option><option value="15">Independent (15)</option></select></label>
                    <label>Stairs: <select id="b-stairs"><option value="0">Unable (0)</option><option value="5">Needs help (5)</option><option value="10">Independent (10)</option></select></label>
                </div>
                <button onclick="window.quizApp.calculateBarthel()">Calculate</button>
                <div id="barthel-detail-result" class="calc-result"></div>
                <div class="calc-reference"><small>Score 0-100. Higher scores indicate greater independence.</small></div>
            </div>
        `;
    }

    calculateBarthel() {
        const ids = ['b-feeding','b-bathing','b-grooming','b-dressing','b-bowels','b-bladder','b-toilet','b-transfers','b-mobility','b-stairs'];
        let total = 0;
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) total += parseInt(el.value, 10) || 0;
        });
        let interpretation = 'Total dependency';
        if (total === 100) interpretation = 'Independent';
        else if (total >= 91) interpretation = 'Slight dependency';
        else if (total >= 61) interpretation = 'Moderate dependency';
        else if (total >= 21) interpretation = 'Severe dependency';
        document.getElementById('barthel-detail-result').innerHTML = `
            <div>
                <strong>Barthel Total: ${total} / 100</strong>
                <div style="margin-top:8px">Interpretation: ${interpretation}</div>
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
                <h4>APACHE II Score Calculator</h4>
                <p><small>Acute Physiology and Chronic Health Evaluation II - ICU mortality prediction</small></p>
                
                <div class="apache-sections">
                    <div class="apache-section">
                        <h5>🌡️ Physiologic Variables (worst values in first 24 hours)</h5>
                        
                        <div class="calc-input-group">
                            <label>Temperature (°C):</label>
                            <input type="number" id="apache-temp" placeholder="37.0" step="0.1" min="25" max="45">
                            <small>Normal: 36-38°C</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>Mean Arterial Pressure (MAP) mmHg:</label>
                            <input type="number" id="apache-map" placeholder="70" min="30" max="200">
                            <small>Normal: 70-100 mmHg</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>Heart Rate (bpm):</label>
                            <input type="number" id="apache-hr" placeholder="80" min="30" max="250">
                            <small>Normal: 60-100 bpm</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>Respiratory Rate (breaths/min):</label>
                            <input type="number" id="apache-rr" placeholder="16" min="5" max="60">
                            <small>Normal: 12-20 breaths/min</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>FiO2 (%):</label>
                            <input type="number" id="apache-fio2" placeholder="21" min="21" max="100">
                            <small>Room air: 21%, Ventilated: typically >50%</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>PaO2 (mmHg) - if FiO2 ≥50%:</label>
                            <input type="number" id="apache-pao2" placeholder="80" min="30" max="500">
                            <small>Normal: 80-100 mmHg</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>A-a Gradient (mmHg) - if FiO2 <50%:</label>
                            <input type="number" id="apache-aa-grad" placeholder="15" min="0" max="600">
                            <small>Normal: <20 mmHg</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>Arterial pH:</label>
                            <input type="number" id="apache-ph" placeholder="7.40" step="0.01" min="6.8" max="7.8">
                            <small>Normal: 7.35-7.45</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>Serum Sodium (mEq/L):</label>
                            <input type="number" id="apache-sodium" placeholder="140" min="110" max="180">
                            <small>Normal: 136-145 mEq/L</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>Serum Potassium (mEq/L):</label>
                            <input type="number" id="apache-potassium" placeholder="4.0" step="0.1" min="1.5" max="8.0">
                            <small>Normal: 3.5-5.0 mEq/L</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>Serum Creatinine (mg/dL):</label>
                            <input type="number" id="apache-creatinine" placeholder="1.0" step="0.1" min="0.2" max="15.0">
                            <small>Normal: 0.6-1.2 mg/dL</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>Hematocrit (%):</label>
                            <input type="number" id="apache-hematocrit" placeholder="40" step="0.1" min="10" max="70">
                            <small>Normal: Men 41-50%, Women 36-44%</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>WBC Count (×10³/μL):</label>
                            <input type="number" id="apache-wbc" placeholder="8.0" step="0.1" min="0.1" max="100">
                            <small>Normal: 4.0-11.0 ×10³/μL</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>Glasgow Coma Scale (3-15):</label>
                            <input type="number" id="apache-gcs" placeholder="15" min="3" max="15">
                            <small>Normal: 15, Severe impairment: ≤8</small>
                        </div>
                    </div>
                    
                    <div class="apache-section">
                        <h5>👤 Demographics & Health Status</h5>
                        
                        <div class="calc-input-group">
                            <label>Age (years):</label>
                            <input type="number" id="apache-age" placeholder="65" min="0" max="120">
                        </div>
                        
                        <div class="calc-checkbox-group">
                            <label><strong>Chronic Health Problems:</strong></label>
                            <label><input type="checkbox" id="apache-liver"> Severe liver disease (cirrhosis, portal hypertension)</label>
                            <label><input type="checkbox" id="apache-cardiovascular"> Severe cardiovascular disease (NYHA Class IV)</label>
                            <label><input type="checkbox" id="apache-pulmonary"> Severe pulmonary disease (severe restriction/obstruction)</label>
                            <label><input type="checkbox" id="apache-renal"> Chronic renal failure (on dialysis)</label>
                            <label><input type="checkbox" id="apache-immunocompromised"> Immunocompromised state</label>
                        </div>
                        
                        <div class="calc-checkbox-group">
                            <label><strong>Operative Status:</strong></label>
                            <label><input type="radio" name="apache-surgery" value="none"> No surgery</label>
                            <label><input type="radio" name="apache-surgery" value="elective"> Elective surgery</label>
                            <label><input type="radio" name="apache-surgery" value="emergency"> Emergency surgery</label>
                        </div>
                    </div>
                </div>
                
                <button onclick="window.quizApp.calculateAPACHE()">Calculate APACHE II Score</button>
                <div id="apache-result" class="calc-result"></div>
                
                <div class="calc-reference">
                    <h5>APACHE II Interpretation:</h5>
                    <ul>
                        <li><strong>0-4:</strong> Very low risk (~4% mortality)</li>
                        <li><strong>5-9:</strong> Low risk (~8% mortality)</li>
                        <li><strong>10-14:</strong> Moderate risk (~15% mortality)</li>
                        <li><strong>15-19:</strong> High risk (~25% mortality)</li>
                        <li><strong>20-24:</strong> Very high risk (~40% mortality)</li>
                        <li><strong>≥25:</strong> Extremely high risk (~55%+ mortality)</li>
                    </ul>
                    <small><strong>Note:</strong> APACHE II predicts hospital mortality for groups of critically ill patients, not individual patient outcomes.</small>
                </div>
            </div>
        `;
    }

    calculateAPACHE() {
        // Get all input values
        const temp = parseFloat(document.getElementById('apache-temp').value);
        const map = parseFloat(document.getElementById('apache-map').value);
        const hr = parseFloat(document.getElementById('apache-hr').value);
        const rr = parseFloat(document.getElementById('apache-rr').value);
        const fio2 = parseFloat(document.getElementById('apache-fio2').value);
        const pao2 = parseFloat(document.getElementById('apache-pao2').value);
        const aaGrad = parseFloat(document.getElementById('apache-aa-grad').value);
        const ph = parseFloat(document.getElementById('apache-ph').value);
        const sodium = parseFloat(document.getElementById('apache-sodium').value);
        const potassium = parseFloat(document.getElementById('apache-potassium').value);
        const creatinine = parseFloat(document.getElementById('apache-creatinine').value);
        const hematocrit = parseFloat(document.getElementById('apache-hematocrit').value);
        const wbc = parseFloat(document.getElementById('apache-wbc').value);
        const gcs = parseInt(document.getElementById('apache-gcs').value);
        const age = parseInt(document.getElementById('apache-age').value);
        
        // Check required fields
        const requiredFields = [temp, map, hr, rr, fio2, ph, sodium, potassium, creatinine, hematocrit, wbc, gcs, age];
        const requiredNames = ['Temperature', 'MAP', 'Heart Rate', 'Respiratory Rate', 'FiO2', 'pH', 'Sodium', 'Potassium', 'Creatinine', 'Hematocrit', 'WBC', 'GCS', 'Age'];
        
        for (let i = 0; i < requiredFields.length; i++) {
            if (isNaN(requiredFields[i]) || requiredFields[i] === null) {
                document.getElementById('apache-result').innerHTML = `<p class="error">Please enter ${requiredNames[i]}</p>`;
                return;
            }
        }
        
        let physScore = 0;
        let scoreBreakdown = [];
        
        // Temperature scoring
        let tempScore = 0;
        if (temp >= 41) tempScore = 4;
        else if (temp >= 39) tempScore = 3;
        else if (temp >= 38.5) tempScore = 1;
        else if (temp >= 36) tempScore = 0;
        else if (temp >= 34) tempScore = 1;
        else if (temp >= 32) tempScore = 2;
        else if (temp >= 30) tempScore = 3;
        else tempScore = 4;
        physScore += tempScore;
        scoreBreakdown.push(`Temperature (${temp}°C): ${tempScore} points`);
        
        // MAP scoring
        let mapScore = 0;
        if (map >= 160) mapScore = 4;
        else if (map >= 130) mapScore = 3;
        else if (map >= 110) mapScore = 2;
        else if (map >= 70) mapScore = 0;
        else if (map >= 50) mapScore = 2;
        else mapScore = 4;
        physScore += mapScore;
        scoreBreakdown.push(`MAP (${map} mmHg): ${mapScore} points`);
        
        // Heart Rate scoring
        let hrScore = 0;
        if (hr >= 180) hrScore = 4;
        else if (hr >= 140) hrScore = 3;
        else if (hr >= 110) hrScore = 2;
        else if (hr >= 70) hrScore = 0;
        else if (hr >= 55) hrScore = 2;
        else if (hr >= 40) hrScore = 3;
        else hrScore = 4;
        physScore += hrScore;
        scoreBreakdown.push(`Heart Rate (${hr} bpm): ${hrScore} points`);
        
        // Respiratory Rate scoring
        let rrScore = 0;
        if (rr >= 50) rrScore = 4;
        else if (rr >= 35) rrScore = 3;
        else if (rr >= 25) rrScore = 1;
        else if (rr >= 12) rrScore = 0;
        else if (rr >= 10) rrScore = 1;
        else if (rr >= 6) rrScore = 2;
        else rrScore = 4;
        physScore += rrScore;
        scoreBreakdown.push(`Respiratory Rate (${rr}/min): ${rrScore} points`);
        
        // Oxygenation scoring (PaO2 if FiO2 ≥50%, A-a gradient if FiO2 <50%)
        let oxyScore = 0;
        if (fio2 >= 50) {
            // Use PaO2
            if (!isNaN(pao2)) {
                if (pao2 >= 500) oxyScore = 4;
                else if (pao2 >= 350) oxyScore = 3;
                else if (pao2 >= 200) oxyScore = 2;
                else if (pao2 >= 70) oxyScore = 0;
                else if (pao2 >= 61) oxyScore = 1;
                else if (pao2 >= 55) oxyScore = 3;
                else oxyScore = 4;
                scoreBreakdown.push(`PaO2 (${pao2} mmHg, FiO2 ${fio2}%): ${oxyScore} points`);
            }
        } else {
            // Use A-a gradient
            if (!isNaN(aaGrad)) {
                if (aaGrad >= 500) oxyScore = 4;
                else if (aaGrad >= 350) oxyScore = 3;
                else if (aaGrad >= 200) oxyScore = 2;
                else oxyScore = 0;
                scoreBreakdown.push(`A-a Gradient (${aaGrad} mmHg, FiO2 ${fio2}%): ${oxyScore} points`);
            }
        }
        physScore += oxyScore;
        
        // pH scoring
        let phScore = 0;
        if (ph >= 7.7) phScore = 4;
        else if (ph >= 7.6) phScore = 3;
        else if (ph >= 7.5) phScore = 1;
        else if (ph >= 7.33) phScore = 0;
        else if (ph >= 7.25) phScore = 2;
        else if (ph >= 7.15) phScore = 3;
        else phScore = 4;
        physScore += phScore;
        scoreBreakdown.push(`pH (${ph}): ${phScore} points`);
        
        // Sodium scoring
        let naScore = 0;
        if (sodium >= 180) naScore = 4;
        else if (sodium >= 160) naScore = 3;
        else if (sodium >= 155) naScore = 2;
        else if (sodium >= 150) naScore = 1;
        else if (sodium >= 130) naScore = 0;
        else if (sodium >= 120) naScore = 2;
        else if (sodium >= 111) naScore = 3;
        else naScore = 4;
        physScore += naScore;
        scoreBreakdown.push(`Sodium (${sodium} mEq/L): ${naScore} points`);
        
        // Potassium scoring
        let kScore = 0;
        if (potassium >= 7) kScore = 4;
        else if (potassium >= 6) kScore = 3;
        else if (potassium >= 5.5) kScore = 1;
        else if (potassium >= 3.5) kScore = 0;
        else if (potassium >= 3) kScore = 1;
        else if (potassium >= 2.5) kScore = 2;
        else kScore = 4;
        physScore += kScore;
        scoreBreakdown.push(`Potassium (${potassium} mEq/L): ${kScore} points`);
        
        // Creatinine scoring
        let creatScore = 0;
        if (creatinine >= 3.5) creatScore = 4;
        else if (creatinine >= 2) creatScore = 3;
        else if (creatinine >= 1.5) creatScore = 2;
        else creatScore = 0;
        physScore += creatScore;
        scoreBreakdown.push(`Creatinine (${creatinine} mg/dL): ${creatScore} points`);
        
        // Hematocrit scoring
        let hctScore = 0;
        if (hematocrit >= 60) hctScore = 4;
        else if (hematocrit >= 50) hctScore = 2;
        else if (hematocrit >= 46) hctScore = 1;
        else if (hematocrit >= 30) hctScore = 0;
        else if (hematocrit >= 20) hctScore = 2;
        else hctScore = 4;
        physScore += hctScore;
        scoreBreakdown.push(`Hematocrit (${hematocrit}%): ${hctScore} points`);
        
        // WBC scoring
        let wbcScore = 0;
        if (wbc >= 40) wbcScore = 4;
        else if (wbc >= 20) wbcScore = 2;
        else if (wbc >= 15) wbcScore = 1;
        else if (wbc >= 3) wbcScore = 0;
        else if (wbc >= 1) wbcScore = 2;
        else wbcScore = 4;
        physScore += wbcScore;
        scoreBreakdown.push(`WBC (${wbc} ×10³/μL): ${wbcScore} points`);
        
        // GCS scoring (15 - actual GCS)
        const gcsScore = 15 - gcs;
        physScore += gcsScore;
        scoreBreakdown.push(`GCS (${gcs}): ${gcsScore} points`);
        
        // Age scoring
        let ageScore = 0;
        if (age >= 75) ageScore = 6;
        else if (age >= 65) ageScore = 5;
        else if (age >= 55) ageScore = 3;
        else if (age >= 45) ageScore = 2;
        else ageScore = 0;
        
        // Chronic health scoring
        let chronicScore = 0;
        const hasLiver = document.getElementById('apache-liver').checked;
        const hasCV = document.getElementById('apache-cardiovascular').checked;
        const hasPulm = document.getElementById('apache-pulmonary').checked;
        const hasRenal = document.getElementById('apache-renal').checked;
        const hasImmuno = document.getElementById('apache-immunocompromised').checked;
        
        if (hasLiver || hasCV || hasPulm || hasRenal || hasImmuno) {
            const surgery = document.querySelector('input[name="apache-surgery"]:checked')?.value;
            if (surgery === 'emergency') {
                chronicScore = 5;
            } else if (surgery === 'elective' || surgery === 'none') {
                chronicScore = 2;
            }
        }
        
        const totalScore = physScore + ageScore + chronicScore;
        
        // Mortality estimation
        let mortality = '';
        let mortalityColor = '';
        if (totalScore <= 4) {
            mortality = '~4%';
            mortalityColor = '#4CAF50';
        } else if (totalScore <= 9) {
            mortality = '~8%';
            mortalityColor = '#8BC34A';
        } else if (totalScore <= 14) {
            mortality = '~15%';
            mortalityColor = '#FF9800';
        } else if (totalScore <= 19) {
            mortality = '~25%';
            mortalityColor = '#FF5722';
        } else if (totalScore <= 24) {
            mortality = '~40%';
            mortalityColor = '#F44336';
        } else {
            mortality = '≥55%';
            mortalityColor = '#9C27B0';
        }
        
        let chronicHealthText = '';
        if (chronicScore > 0) {
            const conditions = [];
            if (hasLiver) conditions.push('Liver disease');
            if (hasCV) conditions.push('Cardiovascular disease');
            if (hasPulm) conditions.push('Pulmonary disease');
            if (hasRenal) conditions.push('Renal failure');
            if (hasImmuno) conditions.push('Immunocompromised');
            chronicHealthText = `Chronic health (${conditions.join(', ')}): ${chronicScore} points`;
        }
        
        document.getElementById('apache-result').innerHTML = `
            <div class="apache-result-display">
                <div class="result-summary">
                    <div class="result-value" style="color: ${mortalityColor}">
                        <strong>APACHE II Score: ${totalScore}</strong>
                    </div>
                    <div class="result-interpretation" style="color: ${mortalityColor}">
                        <strong>Predicted Hospital Mortality: ${mortality}</strong>
                    </div>
                </div>
                
                <div class="score-breakdown">
                    <h5>Score Breakdown:</h5>
                    <div class="breakdown-section">
                        <strong>Physiologic Score: ${physScore}</strong>
                        <ul style="font-size: 0.9em; margin: 5px 0;">
                            ${scoreBreakdown.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="breakdown-section">
                        <strong>Age Score: ${ageScore}</strong> (Age: ${age} years)
                    </div>
                    
                    ${chronicScore > 0 ? `
                    <div class="breakdown-section">
                        <strong>Chronic Health Score: ${chronicScore}</strong><br>
                        <small>${chronicHealthText}</small>
                    </div>
                    ` : ''}
                </div>
                
                <div class="clinical-guidance">
                    <h5>Clinical Interpretation:</h5>
                    <div style="background-color: rgba(${mortalityColor === '#4CAF50' ? '76,175,80' : mortalityColor === '#8BC34A' ? '139,195,74' : mortalityColor === '#FF9800' ? '255,152,0' : mortalityColor === '#FF5722' ? '255,87,34' : mortalityColor === '#F44336' ? '244,67,54' : '156,39,176'}, 0.1); padding: 10px; border-radius: 5px; margin-top: 8px;">
                        ${totalScore <= 4 ? 'Very low risk group. Good prognosis with appropriate care.' : 
                          totalScore <= 9 ? 'Low risk group. Standard ICU care indicated.' :
                          totalScore <= 14 ? 'Moderate risk group. Close monitoring and aggressive care.' :
                          totalScore <= 19 ? 'High risk group. Consider goals of care discussion.' :
                          totalScore <= 24 ? 'Very high risk group. Intensive care with careful consideration of prognosis.' :
                          'Extremely high risk group. Palliative care consultation may be appropriate.'}
                    </div>
                </div>
                
                <div class="important-notes">
                    <h5>Important Notes:</h5>
                    <ul>
                        <li>APACHE II predicts <strong>group mortality</strong>, not individual patient outcomes</li>
                        <li>Use worst physiologic values from first 24 hours of ICU admission</li>
                        <li>Score should be interpreted in clinical context</li>
                        <li>Higher scores indicate need for more intensive monitoring and care</li>
                    </ul>
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
                
                <div class="qrisk-sections">
                    <div class="qrisk-section">
                        <h5>👤 About You</h5>
                        
                        <div class="calc-input-group">
                            <label>Age (25-84 years):</label>
                            <input type="number" id="qrisk-age" placeholder="50" min="25" max="84">
                            <small>QRISK3 is validated for ages 25-84 years</small>
                        </div>
                        
                        <div class="calc-checkbox-group">
                            <label><strong>Sex:</strong></label>
                            <label><input type="radio" name="qrisk-sex" value="male"> Male</label>
                            <label><input type="radio" name="qrisk-sex" value="female"> Female</label>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>Ethnicity:</label>
                            <select id="qrisk-ethnicity">
                                <option value="1">White/not stated</option>
                                <option value="2">Indian</option>
                                <option value="3">Pakistani</option>
                                <option value="4">Bangladeshi</option>
                                <option value="5">Other Asian</option>
                                <option value="6">Caribbean</option>
                                <option value="7">Black African</option>
                                <option value="8">Chinese</option>
                                <option value="9">Other ethnic group</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="qrisk-section">
                        <h5>📊 Measurements</h5>
                        
                        <div class="calc-input-group">
                            <label>BMI (kg/m²):</label>
                            <input type="number" id="qrisk-bmi" placeholder="25.0" min="15" max="50" step="0.1">
                            <small>Normal: 18.5-24.9 kg/m²</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>Systolic Blood Pressure (mmHg):</label>
                            <input type="number" id="qrisk-sbp" placeholder="130" min="80" max="250">
                            <small>Normal: <120 mmHg</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>Total Cholesterol (mmol/L):</label>
                            <input type="number" id="qrisk-cholesterol" placeholder="5.0" min="2" max="15" step="0.1">
                            <small>Desirable: <5.0 mmol/L</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>HDL Cholesterol (mmol/L):</label>
                            <input type="number" id="qrisk-hdl" placeholder="1.2" min="0.5" max="5" step="0.1">
                            <small>Good: >1.0 (men), >1.3 (women) mmol/L</small>
                        </div>
                        
                        <div class="calc-input-group">
                            <label>Systolic BP Standard Deviation (optional):</label>
                            <input type="number" id="qrisk-sbpsd" placeholder="0" min="0" max="50" step="0.1">
                            <small>Measure of BP variability, 0 if unknown</small>
                        </div>
                    </div>
                    
                    <div class="qrisk-section">
                        <h5>🚬 Smoking</h5>
                        <div class="calc-input-group">
                            <label>Smoking Status:</label>
                            <select id="qrisk-smoking">
                                <option value="0">Non-smoker</option>
                                <option value="1">Former smoker</option>
                                <option value="2">Light smoker (1-9/day)</option>
                                <option value="3">Moderate smoker (10-19/day)</option>
                                <option value="4">Heavy smoker (≥20/day)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="qrisk-section">
                        <h5>🏥 Medical Conditions</h5>
                        <div class="calc-checkbox-group">
                            <label><input type="checkbox" id="qrisk-diabetes-type1"> Type 1 diabetes</label>
                            <label><input type="checkbox" id="qrisk-diabetes-type2"> Type 2 diabetes</label>
                            <label><input type="checkbox" id="qrisk-family-history"> Family history of CHD in first degree relative <60 years</label>
                            <label><input type="checkbox" id="qrisk-ckd"> Chronic kidney disease (stage 4/5)</label>
                            <label><input type="checkbox" id="qrisk-af"> Atrial fibrillation</label>
                            <label><input type="checkbox" id="qrisk-bp-treatment"> On blood pressure treatment</label>
                            <label><input type="checkbox" id="qrisk-ra"> Rheumatoid arthritis</label>
                            <label><input type="checkbox" id="qrisk-lupus"> Systemic lupus erythematosus</label>
                            <label><input type="checkbox" id="qrisk-smi"> Severe mental illness</label>
                            <label><input type="checkbox" id="qrisk-antipsychotic"> On atypical antipsychotics</label>
                            <label><input type="checkbox" id="qrisk-steroid"> On regular steroid tablets</label>
                            <label><input type="checkbox" id="qrisk-erectile"> Erectile dysfunction (males only)</label>
                            <label><input type="checkbox" id="qrisk-migraine"> Migraine</label>
                        </div>
                    </div>
                    
                    <div class="qrisk-section">
                        <h5>📍 Social (Optional)</h5>
                        <div class="calc-input-group">
                            <label>Townsend Deprivation Score:</label>
                            <input type="number" id="qrisk-townsend" placeholder="0" step="0.1" min="-6" max="15">
                            <small>Postcode-based deprivation measure, 0 if unknown</small>
                        </div>
                    </div>
                </div>
                
                <button onclick="window.quizApp.calculateQRISK()">Calculate QRISK3 Score</button>
                <div id="qrisk-result" class="calc-result"></div>
                
                <div class="calc-reference">
                    <h5>QRISK3 Information:</h5>
                    <ul>
                        <li>Predicts 10-year cardiovascular disease risk</li>
                        <li>Based on UK population data</li>
                        <li>Includes traditional and novel risk factors</li>
                        <li>Used in NICE guidelines for statin therapy decisions</li>
                    </ul>
                    <small><strong>Clinical Use:</strong> Use official QRISK3 tool at <a href="https://qrisk.org" target="_blank">qrisk.org</a> for clinical decisions</small>
                </div>
            </div>
        `;
    }

    calculateQRISK() {
        // Get input values
        const age = parseInt(document.getElementById('qrisk-age').value);
        const sex = document.querySelector('input[name="qrisk-sex"]:checked')?.value;
        const ethnicity = parseInt(document.getElementById('qrisk-ethnicity').value);
        const bmi = parseFloat(document.getElementById('qrisk-bmi').value);
        const sbp = parseFloat(document.getElementById('qrisk-sbp').value);
        const cholesterol = parseFloat(document.getElementById('qrisk-cholesterol').value);
        const hdl = parseFloat(document.getElementById('qrisk-hdl').value);
        const sbpSD = parseFloat(document.getElementById('qrisk-sbpsd').value) || 0;
        const smokingStatus = parseInt(document.getElementById('qrisk-smoking').value);
        const townsend = parseFloat(document.getElementById('qrisk-townsend').value) || 0;
        
        // Validate required fields
        if (!age || !sex || !bmi || !sbp || !cholesterol || !hdl) {
            document.getElementById('qrisk-result').innerHTML = 
                '<p class="error">Please fill in all required fields (age, sex, BMI, blood pressure, cholesterol and HDL)</p>';
            return;
        }

        // QRISK3 age validation
        if (age < 25 || age > 84) {
            document.getElementById('qrisk-result').innerHTML = 
                '<p class="error">QRISK3 is validated for ages 25-84 years only</p>';
            return;
        }

        // Get medical conditions
        const diabetesType1 = document.getElementById('qrisk-diabetes-type1').checked;
        const diabetesType2 = document.getElementById('qrisk-diabetes-type2').checked;
        
        // Validate diabetes - can't have both types
        if (diabetesType1 && diabetesType2) {
            document.getElementById('qrisk-result').innerHTML = 
                '<p class="error">Please select only Type 1 OR Type 2 diabetes, not both</p>';
            return;
        }

        // Calculate cholesterol to HDL ratio
        const cholesterolHdlRatio = cholesterol / hdl;

        // Build QRISK3 input object (following sisuhealthgroup/qrisk3 format)
        const qriskInput = {
            sex: sex,
            age: age,
            atrialFibrillation: document.getElementById('qrisk-af').checked,
            onAtypicalAntipsychoticsMedication: document.getElementById('qrisk-antipsychotic').checked,
            onRegularSteroidTablets: document.getElementById('qrisk-steroid').checked,
            diagnosisOrTreatmentOfErectileDisfunction: document.getElementById('qrisk-erectile').checked,
            migraine: document.getElementById('qrisk-migraine').checked,
            rheumatoidArthritis: document.getElementById('qrisk-ra').checked,
            chronicKidneyDiseaseStage345: document.getElementById('qrisk-ckd').checked,
            severeMentalIllness: document.getElementById('qrisk-smi').checked,
            systemicLupusErythematosus: document.getElementById('qrisk-lupus').checked,
            bloodPressureTreatment: document.getElementById('qrisk-bp-treatment').checked,
            diabetesType1: diabetesType1,
            diabetesType2: diabetesType2,
            bmi: bmi,
            ethnicity: ethnicity,
            familyAnginaOrHeartAttack: document.getElementById('qrisk-family-history').checked,
            cholesterolHdlRatio: cholesterolHdlRatio,
            systolicBloodPressure: sbp,
            systolicStandardDeviation: sbpSD,
            smokerStatus: smokingStatus,
            survivorSpan: 10, // QRISK3 only works with 10 years
            townsendScore: townsend
        };

        console.log('🔍 QRISK3 Input:', qriskInput);

        let risk = null;
        let usingOfficialLibrary = false;

        // Try to use the official QRISK3 library
        if (window.qrisk3 && typeof window.qrisk3.calculateScore === 'function') {
            try {
                risk = window.qrisk3.calculateScore(qriskInput);
                usingOfficialLibrary = true;
                console.log('✅ Used official QRISK3 library, result:', risk);
            } catch (error) {
                console.warn('❌ Official QRISK3 library failed:', error);
                risk = null;
            }
        } else {
            console.warn('⚠️ Official QRISK3 library not available');
        }

        // Fallback to simplified calculation if official library not available
        if (risk === null) {
            risk = this.calculateQRISKFallback(qriskInput);
            console.log('🔄 Used fallback calculation, result:', risk);
        }

        // Ensure risk is a valid number
        if (isNaN(risk) || risk < 0) {
            document.getElementById('qrisk-result').innerHTML = 
                '<p class="error">Unable to calculate risk. Please check your inputs.</p>';
            return;
        }

        // Cap risk at 99% for display
        risk = Math.min(risk, 99);

        // NICE CG181 and NG238 risk categorization
        let riskLevel = '';
        let color = '';
        let recommendation = '';

        if (risk < 10) {
            riskLevel = 'Low risk (<10%)';
            color = '#4CAF50';
            recommendation = 'NICE NG238: Lifestyle advice. Reassess in 5 years. Consider statin if additional risk factors or patient preference.';
        } else if (risk < 20) {
            riskLevel = 'Moderate risk (10-20%)';
            color = '#FF9800';
            recommendation = 'NICE NG238: Offer atorvastatin 20mg daily with lifestyle advice. Shared decision-making important.';
        } else {
            riskLevel = 'High risk (≥20%)';
            color = '#F44336';
            recommendation = 'NICE NG238: Offer atorvastatin 20mg daily with lifestyle advice. Consider higher intensity if required.';
        }

        // Additional risk factors for context
        const riskFactors = [];
        if (diabetesType1) riskFactors.push('Type 1 diabetes');
        if (diabetesType2) riskFactors.push('Type 2 diabetes');
        if (qriskInput.atrialFibrillation) riskFactors.push('Atrial fibrillation');
        if (qriskInput.familyAnginaOrHeartAttack) riskFactors.push('Family history of CHD');
        if (qriskInput.chronicKidneyDiseaseStage345) riskFactors.push('Chronic kidney disease');
        if (qriskInput.rheumatoidArthritis) riskFactors.push('Rheumatoid arthritis');
        if (qriskInput.systemicLupusErythematosus) riskFactors.push('SLE');
        if (smokingStatus > 0) {
            const smokingLabels = ['Non-smoker', 'Former smoker', 'Light smoker', 'Moderate smoker', 'Heavy smoker'];
            riskFactors.push(smokingLabels[smokingStatus] || 'Smoker');
        }

        document.getElementById('qrisk-result').innerHTML = `
            <div class="qrisk-result-display">
                <div class="result-summary">
                    <div class="result-value" style="color: ${color}">
                        <strong>10-year CVD Risk: ${risk.toFixed(1)}%</strong>
                    </div>
                    <div class="result-interpretation" style="color: ${color}">
                        <strong>${riskLevel}</strong>
                    </div>
                </div>
                
                <div class="clinical-guidance">
                    <h5>NICE Guidance:</h5>
                    <div style="background-color: rgba(${color === '#4CAF50' ? '76,175,80' : color === '#FF9800' ? '255,152,0' : '244,67,54'}, 0.1); padding: 10px; border-radius: 5px; margin-top: 8px;">
                        ${recommendation}
                    </div>
                </div>
                
                <div class="risk-factors">
                    <h5>Key Measurements:</h5>
                    <ul>
                        <li><strong>Cholesterol/HDL ratio:</strong> ${cholesterolHdlRatio.toFixed(2)} ${cholesterolHdlRatio > 4.5 ? '(elevated)' : '(good)'}</li>
                        <li><strong>BMI:</strong> ${bmi} kg/m² ${bmi >= 30 ? '(obese)' : bmi >= 25 ? '(overweight)' : '(normal)'}</li>
                        <li><strong>Blood pressure:</strong> ${sbp} mmHg ${sbp >= 140 ? '(high)' : sbp >= 120 ? '(elevated)' : '(normal)'}</li>
                        ${riskFactors.length > 0 ? `<li><strong>Risk factors:</strong> ${riskFactors.join(', ')}</li>` : ''}
                    </ul>
                </div>
                
                <div class="calculation-info">
                    <small>
                        <strong>Calculation method:</strong> ${usingOfficialLibrary ? 
                            '✅ Official QRISK3 algorithm (sisuhealthgroup implementation)' : 
                            '⚠️ Simplified approximation - use official tool for clinical decisions'
                        }<br>
                        <strong>Reference:</strong> NICE NG238 (2023) - Cardiovascular disease: risk assessment and reduction
                    </small>
                </div>
            </div>
        `;
    }

    // Fallback calculation if official QRISK3 library not available
    calculateQRISKFallback(input) {
        // This is a simplified approximation based on QRISK3 risk factors
        // For clinical use, always use the official QRISK3 tool
        
        let logRisk = 0;
        
        // Age (strongest predictor)
        const ageYears = input.age;
        if (input.sex === 'male') {
            logRisk += (ageYears - 40) * 0.05;
        } else {
            logRisk += (ageYears - 40) * 0.04;
        }
        
        // BMI (J-shaped curve)
        const bmiOptimal = 23;
        const bmiDeviation = Math.abs(input.bmi - bmiOptimal);
        logRisk += bmiDeviation * 0.02;
        
        // Blood pressure
        const sbpDeviation = Math.max(0, input.systolicBloodPressure - 120);
        logRisk += sbpDeviation * 0.01;
        
        // Cholesterol ratio
        const cholRatioDeviation = Math.max(0, input.cholesterolHdlRatio - 3.5);
        logRisk += cholRatioDeviation * 0.3;
        
        // Ethnicity multipliers (approximate)
        const ethnicityFactors = [1.0, 1.0, 1.4, 1.6, 1.8, 1.2, 1.2, 0.9, 0.8, 1.1];
        logRisk += Math.log(ethnicityFactors[input.ethnicity - 1] || 1.0);
        
        // Major risk factors
        if (input.diabetesType1) logRisk += 1.2;
        if (input.diabetesType2) logRisk += 0.8;
        if (input.atrialFibrillation) logRisk += 0.9;
        if (input.familyAnginaOrHeartAttack) logRisk += 0.5;
        if (input.chronicKidneyDiseaseStage345) logRisk += 0.8;
        if (input.rheumatoidArthritis) logRisk += 0.4;
        if (input.systemicLupusErythematosus) logRisk += 0.9;
        if (input.severeMentalIllness) logRisk += 0.3;
        if (input.bloodPressureTreatment) logRisk += 0.4;
        if (input.onRegularSteroidTablets) logRisk += 0.4;
        if (input.onAtypicalAntipsychoticsMedication) logRisk += 0.3;
        if (input.diagnosisOrTreatmentOfErectileDisfunction) logRisk += 0.2;
        if (input.migraine) logRisk += 0.2;
        
        // Smoking
        const smokingFactors = [0, 0.4, 0.5, 0.7, 0.9]; // non, former, light, moderate, heavy
        logRisk += smokingFactors[input.smokerStatus] || 0;
        
        // Townsend deprivation
        logRisk += input.townsendScore * 0.03;
        
        // Convert to percentage (simplified baseline risk)
        const baselineRisk = input.sex === 'male' ? 8 : 5; // Approximate 10-year baseline risk %
        const risk = baselineRisk * Math.exp(logRisk);
        
        return Math.min(risk, 99);
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
        
        // CKD-EPI 2021 equation (race-neutral) - NIDDK
        // 142 × min(Scr/κ,1)^α × max(Scr/κ,1)^−1.200 × 0.9938^Age × (×1.012 if female)
        let k, alpha;
        if (sex === 'female') {
            k = 0.7;
            alpha = -0.241;  // Female exponent for CKD-EPI 2021
        } else {
            k = 0.9;
            alpha = -0.302;  // Male exponent for CKD-EPI 2021
        }
        
        let egfr = 142 * Math.pow(Math.min(creatinine_mg / k, 1), alpha) * 
                   Math.pow(Math.max(creatinine_mg / k, 1), -1.200) * 
                   Math.pow(0.9938, age);
                   
        if (sex === 'female') egfr *= 1.012;
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
                <h4>Urea:Creatinine Ratio Calculator</h4>
                <p><small>Contextual information for kidney function assessment</small></p>
                
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
                        <strong>⚠️ Note:</strong> U:C ratio is NOT used for AKI diagnosis<br>
                        <strong>AKI Diagnostic Criteria (KDIGO/NICE CG169):</strong><br>
                        • Creatinine rise ≥26 μmol/L in 48h, OR<br>
                        • Creatinine ≥1.5× baseline in 7 days, OR<br>
                        • Urine output <0.5 mL/kg/hr for >6 hours<br><br>
                        <strong>U:C Ratio (contextual only):</strong><br>
                        40-100:1 typical | >100:1 may suggest prerenal causes<br>
                        <em>Always interpret with clinical context, AKI staging, and eGFR</em>
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

    getUnitConverterCalculator() {
        return `
            <div class="calculator-form">
                <h4>Clinical Unit Converter</h4>
                <p><small>Convert between common medical units</small></p>
                
                <div class="calc-input-group">
                    <label>Conversion Type:</label>
                    <select id="unit-type" onchange="window.quizApp.updateUnitConverter()">
                        <option value="">Select conversion type</option>
                        <optgroup label="Laboratory Values - Common">
                            <option value="glucose">Glucose (mmol/L ⇄ mg/dL)</option>
                            <option value="cholesterol">Cholesterol/Lipids (mmol/L ⇄ mg/dL)</option>
                            <option value="creatinine">Creatinine (μmol/L ⇄ mg/dL)</option>
                            <option value="bilirubin">Bilirubin (μmol/L ⇄ mg/dL)</option>
                            <option value="hba1c">HbA1c (% ⇄ mmol/mol)</option>
                            <option value="hemoglobin">Hemoglobin (g/dL ⇄ g/L)</option>
                        </optgroup>
                        <optgroup label="Electrolytes & Minerals">
                            <option value="calcium">Calcium (mmol/L ⇄ mg/dL)</option>
                            <option value="magnesium">Magnesium (mmol/L ⇄ mg/dL)</option>
                            <option value="phosphate">Phosphate (mmol/L ⇄ mg/dL)</option>
                            <option value="urea">Urea/BUN (mmol/L ⇄ mg/dL)</option>
                        </optgroup>
                        <optgroup label="Proteins & Lipids">
                            <option value="albumin">Albumin (g/L ⇄ g/dL)</option>
                            <option value="triglycerides">Triglycerides (mmol/L ⇄ mg/dL)</option>
                        </optgroup>
                        <optgroup label="Other Lab Values">
                            <option value="uric-acid">Uric Acid (μmol/L ⇄ mg/dL)</option>
                            <option value="vitamin-d">Vitamin D (nmol/L ⇄ ng/mL)</option>
                            <option value="ferritin">Ferritin (μg/L ⇄ ng/mL)</option>
                        </optgroup>
                        <optgroup label="Physical Measurements">
                            <option value="weight">Weight (kg ⇄ lbs)</option>
                            <option value="height">Height (cm ⇄ inches/feet)</option>
                            <option value="temperature">Temperature (°C ⇄ °F)</option>
                        </optgroup>
                        <optgroup label="Clinical Measurements">
                            <option value="pressure">Pressure (mmHg ⇄ kPa)</option>
                            <option value="blood-volume">Blood Volume (mL ⇄ units/pints)</option>
                            <option value="inr">INR ⇄ Prothrombin %</option>
                        </optgroup>
                    </select>
                </div>
                
                <div id="unit-converter-fields"></div>
                
                <div id="unit-result" class="calc-result"></div>
                
                <div class="calc-reference">
                    <small id="conversion-info"></small>
                </div>
            </div>
        `;
    }

    updateUnitConverter() {
        const unitType = document.getElementById('unit-type').value;
        const fieldsContainer = document.getElementById('unit-converter-fields');
        const conversionInfo = document.getElementById('conversion-info');
        
        if (!unitType) {
            fieldsContainer.innerHTML = '';
            conversionInfo.innerHTML = '';
            document.getElementById('unit-result').innerHTML = '';
            return;
        }
        
        let fieldsHtml = '';
        let infoText = '';
        
        switch(unitType) {
            case 'glucose':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>mmol/L:</label>
                        <input type="number" id="unit-input-1" placeholder="5.5" step="0.1" 
                               oninput="window.quizApp.convertUnits('glucose', 'mmol')">
                    </div>
                    <div class="calc-input-group">
                        <label>mg/dL:</label>
                        <input type="number" id="unit-input-2" placeholder="100" step="1" 
                               oninput="window.quizApp.convertUnits('glucose', 'mgdl')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> mg/dL = mmol/L × 18 | Normal fasting: 3.9-5.6 mmol/L (70-100 mg/dL)';
                break;
                
            case 'cholesterol':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>mmol/L:</label>
                        <input type="number" id="unit-input-1" placeholder="5.0" step="0.1" 
                               oninput="window.quizApp.convertUnits('cholesterol', 'mmol')">
                    </div>
                    <div class="calc-input-group">
                        <label>mg/dL:</label>
                        <input type="number" id="unit-input-2" placeholder="193" step="1" 
                               oninput="window.quizApp.convertUnits('cholesterol', 'mgdl')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> mg/dL = mmol/L × 38.67 | Target total cholesterol: <5.0 mmol/L (<193 mg/dL)';
                break;
                
            case 'creatinine':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>μmol/L:</label>
                        <input type="number" id="unit-input-1" placeholder="100" step="1" 
                               oninput="window.quizApp.convertUnits('creatinine', 'umol')">
                    </div>
                    <div class="calc-input-group">
                        <label>mg/dL:</label>
                        <input type="number" id="unit-input-2" placeholder="1.13" step="0.01" 
                               oninput="window.quizApp.convertUnits('creatinine', 'mgdl')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> mg/dL = μmol/L × 0.0113 | Normal: M 62-115 μmol/L, F 53-97 μmol/L';
                break;
                
            case 'bilirubin':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>μmol/L:</label>
                        <input type="number" id="unit-input-1" placeholder="20" step="1" 
                               oninput="window.quizApp.convertUnits('bilirubin', 'umol')">
                    </div>
                    <div class="calc-input-group">
                        <label>mg/dL:</label>
                        <input type="number" id="unit-input-2" placeholder="1.17" step="0.01" 
                               oninput="window.quizApp.convertUnits('bilirubin', 'mgdl')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> mg/dL = μmol/L × 0.0585 | Normal: 5-20 μmol/L (0.3-1.2 mg/dL)';
                break;
                
            case 'hba1c':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>% (DCCT):</label>
                        <input type="number" id="unit-input-1" placeholder="6.5" step="0.1" 
                               oninput="window.quizApp.convertUnits('hba1c', 'percent')">
                    </div>
                    <div class="calc-input-group">
                        <label>mmol/mol (IFCC):</label>
                        <input type="number" id="unit-input-2" placeholder="48" step="1" 
                               oninput="window.quizApp.convertUnits('hba1c', 'mmol')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> mmol/mol = (% - 2.15) × 10.929 | Diabetes: ≥48 mmol/mol (≥6.5%)';
                break;
                
            case 'weight':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>Kilograms (kg):</label>
                        <input type="number" id="unit-input-1" placeholder="70" step="0.1" 
                               oninput="window.quizApp.convertUnits('weight', 'kg')">
                    </div>
                    <div class="calc-input-group">
                        <label>Pounds (lbs):</label>
                        <input type="number" id="unit-input-2" placeholder="154" step="0.1" 
                               oninput="window.quizApp.convertUnits('weight', 'lbs')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> 1 kg = 2.20462 lbs | 1 lb = 0.453592 kg';
                break;
                
            case 'height':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>Centimeters (cm):</label>
                        <input type="number" id="unit-input-1" placeholder="175" step="0.1" 
                               oninput="window.quizApp.convertUnits('height', 'cm')">
                    </div>
                    <div class="calc-input-group">
                        <label>Feet:</label>
                        <input type="number" id="unit-input-2" placeholder="5" step="1" 
                               oninput="window.quizApp.convertUnits('height', 'feet')">
                    </div>
                    <div class="calc-input-group">
                        <label>Inches:</label>
                        <input type="number" id="unit-input-3" placeholder="9" step="1" 
                               oninput="window.quizApp.convertUnits('height', 'inches')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> 1 inch = 2.54 cm | 1 foot = 12 inches = 30.48 cm';
                break;
                
            case 'temperature':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>Celsius (°C):</label>
                        <input type="number" id="unit-input-1" placeholder="37" step="0.1" 
                               oninput="window.quizApp.convertUnits('temperature', 'celsius')">
                    </div>
                    <div class="calc-input-group">
                        <label>Fahrenheit (°F):</label>
                        <input type="number" id="unit-input-2" placeholder="98.6" step="0.1" 
                               oninput="window.quizApp.convertUnits('temperature', 'fahrenheit')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> °F = (°C × 9/5) + 32 | Normal body temp: 36.5-37.5°C (97.7-99.5°F)';
                break;
                
            case 'pressure':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>mmHg:</label>
                        <input type="number" id="unit-input-1" placeholder="120" step="1" 
                               oninput="window.quizApp.convertUnits('pressure', 'mmhg')">
                    </div>
                    <div class="calc-input-group">
                        <label>kPa:</label>
                        <input type="number" id="unit-input-2" placeholder="16" step="0.1" 
                               oninput="window.quizApp.convertUnits('pressure', 'kpa')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> 1 kPa = 7.50062 mmHg | Normal BP: <120/80 mmHg (<16/10.7 kPa)';
                break;
                
            case 'hemoglobin':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>g/dL:</label>
                        <input type="number" id="unit-input-1" placeholder="14.5" step="0.1" 
                               oninput="window.quizApp.convertUnits('hemoglobin', 'gdl')">
                    </div>
                    <div class="calc-input-group">
                        <label>g/L:</label>
                        <input type="number" id="unit-input-2" placeholder="145" step="1" 
                               oninput="window.quizApp.convertUnits('hemoglobin', 'gl')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> g/L = g/dL × 10 | Normal: M 130-180 g/L (13-18 g/dL), F 120-160 g/L (12-16 g/dL)';
                break;
                
            case 'calcium':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>mmol/L:</label>
                        <input type="number" id="unit-input-1" placeholder="2.4" step="0.01" 
                               oninput="window.quizApp.convertUnits('calcium', 'mmol')">
                    </div>
                    <div class="calc-input-group">
                        <label>mg/dL:</label>
                        <input type="number" id="unit-input-2" placeholder="9.6" step="0.1" 
                               oninput="window.quizApp.convertUnits('calcium', 'mgdl')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> mg/dL = mmol/L × 4.008 | Normal: 2.2-2.6 mmol/L (8.8-10.4 mg/dL) | Adjust for albumin';
                break;
                
            case 'magnesium':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>mmol/L:</label>
                        <input type="number" id="unit-input-1" placeholder="0.85" step="0.01" 
                               oninput="window.quizApp.convertUnits('magnesium', 'mmol')">
                    </div>
                    <div class="calc-input-group">
                        <label>mg/dL:</label>
                        <input type="number" id="unit-input-2" placeholder="2.07" step="0.01" 
                               oninput="window.quizApp.convertUnits('magnesium', 'mgdl')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> mg/dL = mmol/L × 2.431 | Normal: 0.7-1.0 mmol/L (1.7-2.4 mg/dL)';
                break;
                
            case 'phosphate':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>mmol/L:</label>
                        <input type="number" id="unit-input-1" placeholder="1.0" step="0.01" 
                               oninput="window.quizApp.convertUnits('phosphate', 'mmol')">
                    </div>
                    <div class="calc-input-group">
                        <label>mg/dL:</label>
                        <input type="number" id="unit-input-2" placeholder="3.1" step="0.1" 
                               oninput="window.quizApp.convertUnits('phosphate', 'mgdl')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> mg/dL = mmol/L × 3.097 | Normal: 0.8-1.5 mmol/L (2.5-4.5 mg/dL)';
                break;
                
            case 'urea':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>mmol/L (Urea):</label>
                        <input type="number" id="unit-input-1" placeholder="5.0" step="0.1" 
                               oninput="window.quizApp.convertUnits('urea', 'mmol')">
                    </div>
                    <div class="calc-input-group">
                        <label>mg/dL (BUN):</label>
                        <input type="number" id="unit-input-2" placeholder="14" step="1" 
                               oninput="window.quizApp.convertUnits('urea', 'mgdl')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> BUN (mg/dL) = Urea (mmol/L) × 2.8 | Normal: 2.5-7.8 mmol/L (7-22 mg/dL BUN)';
                break;
                
            case 'albumin':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>g/L:</label>
                        <input type="number" id="unit-input-1" placeholder="40" step="1" 
                               oninput="window.quizApp.convertUnits('albumin', 'gl')">
                    </div>
                    <div class="calc-input-group">
                        <label>g/dL:</label>
                        <input type="number" id="unit-input-2" placeholder="4.0" step="0.1" 
                               oninput="window.quizApp.convertUnits('albumin', 'gdl')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> g/dL = g/L × 0.1 | Normal: 35-50 g/L (3.5-5.0 g/dL)';
                break;
                
            case 'triglycerides':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>mmol/L:</label>
                        <input type="number" id="unit-input-1" placeholder="1.5" step="0.1" 
                               oninput="window.quizApp.convertUnits('triglycerides', 'mmol')">
                    </div>
                    <div class="calc-input-group">
                        <label>mg/dL:</label>
                        <input type="number" id="unit-input-2" placeholder="133" step="1" 
                               oninput="window.quizApp.convertUnits('triglycerides', 'mgdl')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> mg/dL = mmol/L × 88.57 | Target: <1.7 mmol/L (<150 mg/dL)';
                break;
                
            case 'uric-acid':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>μmol/L:</label>
                        <input type="number" id="unit-input-1" placeholder="350" step="10" 
                               oninput="window.quizApp.convertUnits('uric-acid', 'umol')">
                    </div>
                    <div class="calc-input-group">
                        <label>mg/dL:</label>
                        <input type="number" id="unit-input-2" placeholder="5.9" step="0.1" 
                               oninput="window.quizApp.convertUnits('uric-acid', 'mgdl')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> mg/dL = μmol/L × 0.0168 | Normal: M 200-430 μmol/L, F 140-360 μmol/L | Gout: >360 μmol/L';
                break;
                
            case 'vitamin-d':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>nmol/L:</label>
                        <input type="number" id="unit-input-1" placeholder="75" step="1" 
                               oninput="window.quizApp.convertUnits('vitamin-d', 'nmol')">
                    </div>
                    <div class="calc-input-group">
                        <label>ng/mL:</label>
                        <input type="number" id="unit-input-2" placeholder="30" step="1" 
                               oninput="window.quizApp.convertUnits('vitamin-d', 'ngml')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> ng/mL = nmol/L × 0.4 | Deficient: <25 nmol/L (<10 ng/mL) | Sufficient: >50 nmol/L (>20 ng/mL)';
                break;
                
            case 'ferritin':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>μg/L:</label>
                        <input type="number" id="unit-input-1" placeholder="100" step="1" 
                               oninput="window.quizApp.convertUnits('ferritin', 'ugl')">
                    </div>
                    <div class="calc-input-group">
                        <label>ng/mL:</label>
                        <input type="number" id="unit-input-2" placeholder="100" step="1" 
                               oninput="window.quizApp.convertUnits('ferritin', 'ngml')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> 1 μg/L = 1 ng/mL (same value, different units) | Normal: M 30-400, F 15-150 μg/L';
                break;
                
            case 'blood-volume':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>Milliliters (mL):</label>
                        <input type="number" id="unit-input-1" placeholder="450" step="10" 
                               oninput="window.quizApp.convertUnits('blood-volume', 'ml')">
                    </div>
                    <div class="calc-input-group">
                        <label>Units (blood transfusion):</label>
                        <input type="number" id="unit-input-2" placeholder="1" step="0.1" 
                               oninput="window.quizApp.convertUnits('blood-volume', 'units')">
                    </div>
                    <div class="calc-input-group">
                        <label>Pints:</label>
                        <input type="number" id="unit-input-3" placeholder="0.95" step="0.01" 
                               oninput="window.quizApp.convertUnits('blood-volume', 'pints')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> 1 unit ≈ 450-500 mL ≈ 0.95 pints | 1 pint = 473 mL | RBC increases Hb by ~10 g/L per unit';
                break;
                
            case 'inr':
                fieldsHtml = `
                    <div class="calc-input-group">
                        <label>INR:</label>
                        <input type="number" id="unit-input-1" placeholder="2.5" step="0.1" 
                               oninput="window.quizApp.convertUnits('inr', 'inr')">
                    </div>
                    <div class="calc-input-group">
                        <label>Prothrombin Time (%):</label>
                        <input type="number" id="unit-input-2" placeholder="40" step="1" 
                               oninput="window.quizApp.convertUnits('inr', 'percent')">
                    </div>
                `;
                infoText = '<strong>Conversion:</strong> PT% = 100 ÷ INR | Normal INR: 0.8-1.2 (100-83%) | Therapeutic: AF 2-3, DVT/PE 2-3, Mechanical valve 2.5-3.5';
                break;
        }
        
        fieldsContainer.innerHTML = fieldsHtml;
        conversionInfo.innerHTML = infoText;
        document.getElementById('unit-result').innerHTML = '';
    }

    convertUnits(unitType, sourceUnit) {
        const input1 = document.getElementById('unit-input-1');
        const input2 = document.getElementById('unit-input-2');
        const input3 = document.getElementById('unit-input-3');
        const resultDiv = document.getElementById('unit-result');
        
        let value, converted, resultText = '';
        
        switch(unitType) {
            case 'glucose':
                if (sourceUnit === 'mmol') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value * 18;
                        input2.value = converted.toFixed(1);
                        resultText = `${value} mmol/L = ${converted.toFixed(1)} mg/dL`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value / 18;
                        input1.value = converted.toFixed(1);
                        resultText = `${value} mg/dL = ${converted.toFixed(1)} mmol/L`;
                    }
                }
                break;
                
            case 'cholesterol':
                if (sourceUnit === 'mmol') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value * 38.67;
                        input2.value = converted.toFixed(0);
                        resultText = `${value} mmol/L = ${converted.toFixed(0)} mg/dL`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value / 38.67;
                        input1.value = converted.toFixed(2);
                        resultText = `${value} mg/dL = ${converted.toFixed(2)} mmol/L`;
                    }
                }
                break;
                
            case 'creatinine':
                if (sourceUnit === 'umol') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value * 0.0113;
                        input2.value = converted.toFixed(2);
                        resultText = `${value} μmol/L = ${converted.toFixed(2)} mg/dL`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value / 0.0113;
                        input1.value = converted.toFixed(0);
                        resultText = `${value} mg/dL = ${converted.toFixed(0)} μmol/L`;
                    }
                }
                break;
                
            case 'bilirubin':
                if (sourceUnit === 'umol') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value * 0.0585;
                        input2.value = converted.toFixed(2);
                        resultText = `${value} μmol/L = ${converted.toFixed(2)} mg/dL`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value / 0.0585;
                        input1.value = converted.toFixed(0);
                        resultText = `${value} mg/dL = ${converted.toFixed(0)} μmol/L`;
                    }
                }
                break;
                
            case 'hba1c':
                if (sourceUnit === 'percent') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = (value - 2.15) * 10.929;
                        input2.value = converted.toFixed(0);
                        resultText = `${value}% = ${converted.toFixed(0)} mmol/mol`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = (value / 10.929) + 2.15;
                        input1.value = converted.toFixed(1);
                        resultText = `${value} mmol/mol = ${converted.toFixed(1)}%`;
                    }
                }
                break;
                
            case 'weight':
                if (sourceUnit === 'kg') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value * 2.20462;
                        input2.value = converted.toFixed(1);
                        resultText = `${value} kg = ${converted.toFixed(1)} lbs`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value * 0.453592;
                        input1.value = converted.toFixed(1);
                        resultText = `${value} lbs = ${converted.toFixed(1)} kg`;
                    }
                }
                break;
                
            case 'height':
                if (sourceUnit === 'cm') {
                    value = parseFloat(input1.value);
                    if (value) {
                        const totalInches = value / 2.54;
                        const feet = Math.floor(totalInches / 12);
                        const inches = Math.round(totalInches % 12);
                        input2.value = feet;
                        input3.value = inches;
                        resultText = `${value} cm = ${feet}' ${inches}"`;
                    }
                } else {
                    const feet = parseFloat(input2.value) || 0;
                    const inches = parseFloat(input3.value) || 0;
                    if (feet || inches) {
                        const totalInches = (feet * 12) + inches;
                        converted = totalInches * 2.54;
                        input1.value = converted.toFixed(1);
                        resultText = `${feet}' ${inches}" = ${converted.toFixed(1)} cm`;
                    }
                }
                break;
                
            case 'temperature':
                if (sourceUnit === 'celsius') {
                    value = parseFloat(input1.value);
                    if (value !== undefined && value !== null && value !== '') {
                        converted = (value * 9/5) + 32;
                        input2.value = converted.toFixed(1);
                        resultText = `${value}°C = ${converted.toFixed(1)}°F`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value !== undefined && value !== null && value !== '') {
                        converted = (value - 32) * 5/9;
                        input1.value = converted.toFixed(1);
                        resultText = `${value}°F = ${converted.toFixed(1)}°C`;
                    }
                }
                break;
                
            case 'pressure':
                if (sourceUnit === 'mmhg') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value / 7.50062;
                        input2.value = converted.toFixed(1);
                        resultText = `${value} mmHg = ${converted.toFixed(1)} kPa`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value * 7.50062;
                        input1.value = converted.toFixed(0);
                        resultText = `${value} kPa = ${converted.toFixed(0)} mmHg`;
                    }
                }
                break;
                
            case 'hemoglobin':
                if (sourceUnit === 'gdl') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value * 10;
                        input2.value = converted.toFixed(0);
                        resultText = `${value} g/dL = ${converted.toFixed(0)} g/L`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value / 10;
                        input1.value = converted.toFixed(1);
                        resultText = `${value} g/L = ${converted.toFixed(1)} g/dL`;
                    }
                }
                break;
                
            case 'calcium':
                if (sourceUnit === 'mmol') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value * 4.008;
                        input2.value = converted.toFixed(1);
                        resultText = `${value} mmol/L = ${converted.toFixed(1)} mg/dL`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value / 4.008;
                        input1.value = converted.toFixed(2);
                        resultText = `${value} mg/dL = ${converted.toFixed(2)} mmol/L`;
                    }
                }
                break;
                
            case 'magnesium':
                if (sourceUnit === 'mmol') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value * 2.431;
                        input2.value = converted.toFixed(2);
                        resultText = `${value} mmol/L = ${converted.toFixed(2)} mg/dL`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value / 2.431;
                        input1.value = converted.toFixed(2);
                        resultText = `${value} mg/dL = ${converted.toFixed(2)} mmol/L`;
                    }
                }
                break;
                
            case 'phosphate':
                if (sourceUnit === 'mmol') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value * 3.097;
                        input2.value = converted.toFixed(1);
                        resultText = `${value} mmol/L = ${converted.toFixed(1)} mg/dL`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value / 3.097;
                        input1.value = converted.toFixed(2);
                        resultText = `${value} mg/dL = ${converted.toFixed(2)} mmol/L`;
                    }
                }
                break;
                
            case 'urea':
                if (sourceUnit === 'mmol') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value * 2.8;
                        input2.value = converted.toFixed(0);
                        resultText = `${value} mmol/L (Urea) = ${converted.toFixed(0)} mg/dL (BUN)`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value / 2.8;
                        input1.value = converted.toFixed(1);
                        resultText = `${value} mg/dL (BUN) = ${converted.toFixed(1)} mmol/L (Urea)`;
                    }
                }
                break;
                
            case 'albumin':
                if (sourceUnit === 'gl') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value * 0.1;
                        input2.value = converted.toFixed(1);
                        resultText = `${value} g/L = ${converted.toFixed(1)} g/dL`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value * 10;
                        input1.value = converted.toFixed(0);
                        resultText = `${value} g/dL = ${converted.toFixed(0)} g/L`;
                    }
                }
                break;
                
            case 'triglycerides':
                if (sourceUnit === 'mmol') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value * 88.57;
                        input2.value = converted.toFixed(0);
                        resultText = `${value} mmol/L = ${converted.toFixed(0)} mg/dL`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value / 88.57;
                        input1.value = converted.toFixed(2);
                        resultText = `${value} mg/dL = ${converted.toFixed(2)} mmol/L`;
                    }
                }
                break;
                
            case 'uric-acid':
                if (sourceUnit === 'umol') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value * 0.0168;
                        input2.value = converted.toFixed(1);
                        resultText = `${value} μmol/L = ${converted.toFixed(1)} mg/dL`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value / 0.0168;
                        input1.value = converted.toFixed(0);
                        resultText = `${value} mg/dL = ${converted.toFixed(0)} μmol/L`;
                    }
                }
                break;
                
            case 'vitamin-d':
                if (sourceUnit === 'nmol') {
                    value = parseFloat(input1.value);
                    if (value) {
                        converted = value * 0.4;
                        input2.value = converted.toFixed(0);
                        resultText = `${value} nmol/L = ${converted.toFixed(0)} ng/mL`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        converted = value / 0.4;
                        input1.value = converted.toFixed(0);
                        resultText = `${value} ng/mL = ${converted.toFixed(0)} nmol/L`;
                    }
                }
                break;
                
            case 'ferritin':
                if (sourceUnit === 'ugl') {
                    value = parseFloat(input1.value);
                    if (value) {
                        input2.value = value;
                        resultText = `${value} μg/L = ${value} ng/mL (same numeric value)`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value) {
                        input1.value = value;
                        resultText = `${value} ng/mL = ${value} μg/L (same numeric value)`;
                    }
                }
                break;
                
            case 'blood-volume':
                if (sourceUnit === 'ml') {
                    value = parseFloat(input1.value);
                    if (value) {
                        const units = value / 475; // Average of 450-500
                        const pints = value / 473;
                        input2.value = units.toFixed(2);
                        if (input3) input3.value = pints.toFixed(2);
                        resultText = `${value} mL = ${units.toFixed(2)} units = ${pints.toFixed(2)} pints`;
                    }
                } else if (sourceUnit === 'units') {
                    value = parseFloat(input2.value);
                    if (value) {
                        const ml = value * 475;
                        const pints = ml / 473;
                        input1.value = ml.toFixed(0);
                        if (input3) input3.value = pints.toFixed(2);
                        resultText = `${value} units = ${ml.toFixed(0)} mL = ${pints.toFixed(2)} pints`;
                    }
                } else if (sourceUnit === 'pints') {
                    value = parseFloat(input3.value);
                    if (value) {
                        const ml = value * 473;
                        const units = ml / 475;
                        input1.value = ml.toFixed(0);
                        input2.value = units.toFixed(2);
                        resultText = `${value} pints = ${ml.toFixed(0)} mL = ${units.toFixed(2)} units`;
                    }
                }
                break;
                
            case 'inr':
                if (sourceUnit === 'inr') {
                    value = parseFloat(input1.value);
                    if (value && value > 0) {
                        converted = 100 / value;
                        input2.value = converted.toFixed(0);
                        resultText = `INR ${value} = ${converted.toFixed(0)}% prothrombin time`;
                    }
                } else {
                    value = parseFloat(input2.value);
                    if (value && value > 0) {
                        converted = 100 / value;
                        input1.value = converted.toFixed(1);
                        resultText = `${value}% prothrombin time = INR ${converted.toFixed(1)}`;
                    }
                }
                break;
        }
        
        if (resultText) {
            resultDiv.innerHTML = `<div class="unit-converter-result" style="font-weight: bold; padding: 10px; border-radius: 4px;">${resultText}</div>`;
        }
    }

    getDrugVolumeCalculator() {
        return `
            <div class="calculator-form">
                <h4>Drug Volume Calculator</h4>
                <p><small>Calculate volume to draw up for required dose</small></p>
                
                <div class="calc-input-group">
                    <label>Dose Required:</label>
                    <input type="number" id="drug-dose-required" placeholder="500" step="0.1" min="0">
                    <select id="drug-dose-unit">
                        <option value="mg">mg</option>
                        <option value="g">g</option>
                        <option value="mcg">mcg</option>
                        <option value="units">units</option>
                        <option value="mmol">mmol</option>
                    </select>
                </div>
                
                <div class="calc-input-group">
                    <label>Stock Concentration:</label>
                    <input type="number" id="drug-stock-amount" placeholder="1000" step="0.1" min="0">
                    <select id="drug-stock-unit">
                        <option value="mg">mg</option>
                        <option value="g">g</option>
                        <option value="mcg">mcg</option>
                        <option value="units">units</option>
                        <option value="mmol">mmol</option>
                    </select>
                    <span> per </span>
                    <input type="number" id="drug-stock-volume" placeholder="10" step="0.1" min="0" style="width: 80px;">
                    <select id="drug-volume-unit">
                        <option value="ml">ml</option>
                        <option value="L">L</option>
                    </select>
                </div>
                
                <div class="calc-input-group">
                    <label>Drug Name (optional):</label>
                    <input type="text" id="drug-name" placeholder="e.g., Amoxicillin">
                </div>
                
                <button onclick="window.quizApp.calculateDrugVolume()">Calculate Volume</button>
                <div id="drug-volume-result" class="calc-result"></div>
                
                <div class="calc-reference">
                    <small><strong>Formula:</strong> Volume = (Dose Required ÷ Stock Concentration) × Stock Volume<br>
                    <strong>Example:</strong> Need 500mg, Stock is 1000mg/10ml → Draw up 5ml</small>
                </div>
                
                <div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 15px;">
                    <h5>Quick Common Drug Calculations:</h5>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <button class="quick-drug-btn" onclick="window.quizApp.quickDrugCalc('adrenaline1000')">Adrenaline 1:1000</button>
                        <button class="quick-drug-btn" onclick="window.quizApp.quickDrugCalc('adrenaline10000')">Adrenaline 1:10000 (ALS)</button>
                        <button class="quick-drug-btn" onclick="window.quizApp.quickDrugCalc('atropine')">Atropine</button>
                        <button class="quick-drug-btn" onclick="window.quizApp.quickDrugCalc('amiodarone')">Amiodarone</button>
                        <button class="quick-drug-btn" onclick="window.quizApp.quickDrugCalc('naloxone')">Naloxone</button>
                        <button class="quick-drug-btn" onclick="window.quizApp.quickDrugCalc('benzylpenicillin')">Benzylpenicillin</button>
                        <button class="quick-drug-btn" onclick="window.quizApp.quickDrugCalc('gentamicin')">Gentamicin</button>
                        <button class="quick-drug-btn" onclick="window.quizApp.quickDrugCalc('morphine')">Morphine</button>
                    </div>
                </div>
            </div>
        `;
    }

    calculateDrugVolume() {
        const doseRequired = parseFloat(document.getElementById('drug-dose-required').value);
        const doseUnit = document.getElementById('drug-dose-unit').value;
        const stockAmount = parseFloat(document.getElementById('drug-stock-amount').value);
        const stockUnit = document.getElementById('drug-stock-unit').value;
        const stockVolume = parseFloat(document.getElementById('drug-stock-volume').value);
        const volumeUnit = document.getElementById('drug-volume-unit').value;
        const drugName = document.getElementById('drug-name').value;
        
        if (!doseRequired || !stockAmount || !stockVolume) {
            document.getElementById('drug-volume-result').innerHTML = 
                '<div style="color: #f44336; padding: 10px; background: #ffebee; border-radius: 4px;">Please fill in all required fields</div>';
            return;
        }
        
        // Convert units to same base (mg)
        const unitConversion = {
            'g': 1000,
            'mg': 1,
            'mcg': 0.001,
            'units': 1,
            'mmol': 1
        };
        
        // Check units match
        if ((doseUnit === 'units' && stockUnit !== 'units') || 
            (doseUnit === 'mmol' && stockUnit !== 'mmol') ||
            (doseUnit !== 'units' && doseUnit !== 'mmol' && (stockUnit === 'units' || stockUnit === 'mmol'))) {
            document.getElementById('drug-volume-result').innerHTML = 
                '<div style="color: #ff9800; padding: 10px; background: #fff3e0; border-radius: 4px;">⚠️ Warning: Dose and stock units should match (both mass units, units, or mmol)</div>';
            return;
        }
        
        // Convert to base units
        const doseInBase = doseRequired * unitConversion[doseUnit];
        const stockInBase = stockAmount * unitConversion[stockUnit];
        
        // Convert stock volume to ml if in L
        const stockVolumeInMl = volumeUnit === 'L' ? stockVolume * 1000 : stockVolume;
        
        // Calculate volume to draw up
        const volumeToDraw = (doseInBase / stockInBase) * stockVolumeInMl;
        
        // Determine if volume is practical
        let practicality = '';
        let warningClass = 'drug-warning-green';
        
        if (volumeToDraw < 0.1) {
            practicality = '⚠️ Very small volume - difficult to draw up accurately. Consider alternative concentration.';
            warningClass = 'drug-warning-orange';
        } else if (volumeToDraw < 0.5) {
            practicality = '⚠️ Small volume - use 1ml syringe for accuracy';
            warningClass = 'drug-warning-orange';
        } else if (volumeToDraw > 20) {
            practicality = '⚠️ Large volume - may need to give as infusion or split into multiple injections';
            warningClass = 'drug-warning-orange';
        } else if (volumeToDraw > 50) {
            practicality = '⚠️ Very large volume - definitely give as infusion, check calculation';
            warningClass = 'drug-warning-red';
        } else {
            practicality = '✓ Practical volume to draw up';
        }
        
        const drugNameDisplay = drugName ? `<div style="margin-bottom: 10px;"><strong>Drug:</strong> ${drugName}</div>` : '';
        
        document.getElementById('drug-volume-result').innerHTML = `
            <div class="drug-calc-result-container" style="border-left: 4px solid; padding: 15px; border-radius: 4px;">
                ${drugNameDisplay}
                <div style="margin-bottom: 10px;">
                    <div><strong>Dose Required:</strong> ${doseRequired} ${doseUnit}</div>
                    <div><strong>Stock Concentration:</strong> ${stockAmount} ${stockUnit} per ${stockVolume} ${volumeUnit}</div>
                </div>
                <div class="${warningClass}" style="padding: 15px; margin: 15px 0; border-radius: 8px; border: 2px solid;">
                    <div class="drug-calc-dose-display">
                        Draw up: ${volumeToDraw.toFixed(2)} ml
                    </div>
                    <div style="font-weight: 500;">${practicality}</div>
                </div>
                <div class="drug-calc-working" style="font-weight: bold; margin-bottom: 5px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">Working:</div>
                    <div>Volume = (${doseRequired} ${doseUnit} ÷ ${stockAmount} ${stockUnit}) × ${stockVolume} ${volumeUnit}</div>
                    <div>Volume = (${doseInBase} ÷ ${stockInBase}) × ${stockVolumeInMl} ml = <strong>${volumeToDraw.toFixed(2)} ml</strong></div>
                </div>
            </div>
        `;
    }

    quickDrugCalc(drugType) {
        const drugs = {
            'adrenaline1000': {
                name: 'Adrenaline 1:1000 (Anaphylaxis)',
                dose: 500,
                doseUnit: 'mcg',
                stock: 1,
                stockUnit: 'mg',
                volume: 1,
                volumeUnit: 'ml',
                info: 'Adult IM dose for anaphylaxis. 1:1000 = 1mg/ml. Repeat after 5 min if needed.'
            },
            'adrenaline10000': {
                name: 'Adrenaline 1:10000 (ALS/Cardiac Arrest)',
                dose: 1,
                doseUnit: 'mg',
                stock: 0.1,
                stockUnit: 'mg',
                volume: 1,
                volumeUnit: 'ml',
                info: 'Cardiac arrest: 1mg IV (10ml of 1:10000). Repeat every 3-5 mins during CPR.'
            },
            'atropine': {
                name: 'Atropine (Bradycardia)',
                dose: 600,
                doseUnit: 'mcg',
                stock: 600,
                stockUnit: 'mcg',
                volume: 1,
                volumeUnit: 'ml',
                info: 'Adult dose for bradycardia. May repeat to max 3mg. Stock usually 600mcg/ml or 1mg/ml.'
            },
            'amiodarone': {
                name: 'Amiodarone (VT/VF)',
                dose: 300,
                doseUnit: 'mg',
                stock: 50,
                stockUnit: 'mg',
                volume: 1,
                volumeUnit: 'ml',
                info: 'Cardiac arrest VT/VF: 300mg IV after 3rd shock. Further 150mg after 5th shock. Stock 50mg/ml.'
            },
            'naloxone': {
                name: 'Naloxone (Opioid Reversal)',
                dose: 400,
                doseUnit: 'mcg',
                stock: 400,
                stockUnit: 'mcg',
                volume: 1,
                volumeUnit: 'ml',
                info: 'Opioid overdose: 400mcg IV/IM/SC, repeat every 2-3 mins if needed. Max 2mg initially.'
            },
            'benzylpenicillin': {
                name: 'Benzylpenicillin',
                dose: 1.2,
                doseUnit: 'g',
                stock: 600,
                stockUnit: 'mg',
                volume: 1,
                volumeUnit: 'ml',
                info: 'Reconstitute 600mg vial with 1.6ml WFI to give 600mg/ml. Meningitis dose.'
            },
            'gentamicin': {
                name: 'Gentamicin',
                dose: 280,
                doseUnit: 'mg',
                stock: 80,
                stockUnit: 'mg',
                volume: 2,
                volumeUnit: 'ml',
                info: 'Typical 70kg patient dose (4-7mg/kg). Stock usually 80mg/2ml. Check levels.'
            },
            'morphine': {
                name: 'Morphine',
                dose: 10,
                doseUnit: 'mg',
                stock: 10,
                stockUnit: 'mg',
                volume: 1,
                volumeUnit: 'ml',
                info: 'Standard stock concentration 10mg/ml. Titrate to effect in pain/acute dyspnoea.'
            }
        };
        
        const drug = drugs[drugType];
        
        document.getElementById('drug-dose-required').value = drug.dose;
        document.getElementById('drug-dose-unit').value = drug.doseUnit;
        document.getElementById('drug-stock-amount').value = drug.stock;
        document.getElementById('drug-stock-unit').value = drug.stockUnit;
        document.getElementById('drug-stock-volume').value = drug.volume;
        document.getElementById('drug-volume-unit').value = drug.volumeUnit;
        document.getElementById('drug-name').value = drug.name;
        
        this.calculateDrugVolume();
        
        // Add info to result
        setTimeout(() => {
            const resultDiv = document.getElementById('drug-volume-result');
            if (resultDiv.innerHTML) {
                resultDiv.innerHTML += `
                    <div class="drug-info-box">
                        <strong>ℹ️ ${drug.name}:</strong> ${drug.info}
                    </div>
                `;
            }
        }, 100);
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

        // UK opioid conversion factors - Faculty of Pain Medicine guidance
        // ⚠️ CRITICAL: Patch conversions are per mcg/hr, NOT total daily dose
        const toMorphineFactors = {
            'morphine-oral': 1,
            'morphine-sc': 2,  // SC morphine is twice as potent as oral
            'oxycodone-oral': 1.5,  // Oxycodone 1mg = 1.5mg morphine
            'fentanyl-patch': 2.4,  // UK: Fentanyl 12 mcg/hr ≈ 30-45mg OME/day → ~2.4-3.75 mg per mcg/hr
            'codeine': 0.1,  // Codeine 10mg = 1mg morphine
            'tramadol': 0.1,  // Tramadol 10mg = 1mg morphine
            'buprenorphine-patch': 2.4  // UK: Buprenorphine 5 mcg/hr ≈ 12mg OME/day → ~2.4 mg per mcg/hr
        };

        // Conversion factors from oral morphine equivalents
        const fromMorphineFactors = {
            'morphine-oral': 1,
            'morphine-sc': 0.5,  // Oral to SC morphine
            'oxycodone-oral': 0.67,  // Morphine to oxycodone
            'fentanyl-patch': 0.4,  // Conservative: ~2.5mg OME per mcg/hr
            'diamorphine-sc': 0.33  // Oral morphine to SC diamorphine
        };

        // Convert current dose to morphine equivalents
        const morphineEquivalent = currentDose * toMorphineFactors[currentOpioid];
        
        // Faculty of Pain Medicine: Reduce by 25-50% when switching (more for high doses/elderly)
        const fullTargetDose = morphineEquivalent * fromMorphineFactors[targetOpioid];
        const reducedTargetDose = fullTargetDose * 0.5; // 50% reduction for safety

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
                <strong>Opioid Conversion Estimate:</strong><br>
                <strong>Oral Morphine Equivalent: ${Math.round(morphineEquivalent)} mg/day</strong><br>
                <strong>Recommended Starting Dose: ${Math.round(reducedTargetDose * 10) / 10} ${dosageForm}</strong><br>
                <em>Administration:</em> ${administration}<br>
                <em>Breakthrough:</em> ${frequency}<br><br>
                <div style="color: #D32F2F; font-weight: bold; margin: 8px 0; border: 2px solid #D32F2F; padding: 8px; background: #FFEBEE;">
                    ⚠️ FACULTY OF PAIN MEDICINE WARNING:<br>
                    • Reduce calculated doses by 25-50% when switching<br>
                    • Reduce more for high doses (>200mg OME/day) or elderly<br>
                    • Incomplete cross-tolerance between opioids<br>
                    • Titrate carefully and monitor closely
                </div>
                <small style="color: #666;">
                    Using UK Faculty of Pain Medicine & MHRA guidance<br>
                    Original: ${currentDose} ${currentOpioid.replace('-', ' ')}<br>
                    Estimated OME: ${Math.round(morphineEquivalent)} mg/day<br>
                    Full calculated: ${Math.round(fullTargetDose * 10) / 10} ${dosageForm} (50% reduction applied)<br>
                    <em>This is a simplified calculator - seek specialist advice for complex conversions</em>
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
            <div class="search-container" style="display:flex;gap:8px;align-items:center;">
                <input type="text" id="drug-search" placeholder="Search medications..." class="tool-search" style="flex:1;">
                <button id="drug-search-btn" title="Search">🔍</button>
                <button id="drug-voice-btn" title="Voice search" aria-label="Voice search" style="font-size:16px;padding:8px;border-radius:6px;">🎤</button>
            </div>
            <div id="drug-search-results"></div>
            <div class="drug-categories">
                <button class="category-btn" onclick="window.quizApp.showDrugCategory('all'); event.stopPropagation();">All Drugs</button>
                <button class="category-btn active" onclick="window.quizApp.showDrugCategory('alphabetical'); event.stopPropagation();">A-Z</button>
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
        const voiceBtn = document.getElementById('drug-voice-btn');

        // Normal text input search
        searchInput.addEventListener('input', () => this.searchDrugs(drugDatabase));
        searchBtn.addEventListener('click', () => this.searchDrugs(drugDatabase));

        // Voice search toggle
        if (voiceBtn) {
            voiceBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // If browser doesn't support SpeechRecognition, show helpful message
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) {
                    const resultsContainer = document.getElementById('drug-search-results');
                    if (resultsContainer) {
                        resultsContainer.innerHTML = '<div class="no-results">Voice search not supported in this browser. Try Chrome/Edge on desktop or Android. iOS Safari has limited support.</div>';
                    }
                    return;
                }

                // Toggle recognition
                if (this.drugRecognition && this.drugRecognition.active) {
                    this.stopDrugVoiceRecognition();
                } else {
                    this.startDrugVoiceRecognition();
                }
            });
        }
        this.drugDatabase = drugDatabase;
        this.showDrugCategory('alphabetical');
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
            <div class="drug-card" onclick="console.log('💊 Drug search result clicked:', '${drug}'); window.quizApp.showDrugDetail('${drug}'); event.stopPropagation();">
                <div class="drug-name">${drugDatabase[drug].name}</div>
                <div class="drug-class">${drugDatabase[drug].class}</div>
                <button class="speak-name-btn" onclick="event.stopPropagation(); window.quizApp.speakDrugName(this.dataset.name);" data-name="${drugDatabase[drug].name.replace(/\"/g, '&quot;')}">🔊</button>
            </div>
        `).join('');
    }

    // Voice recognition for drug search
    startDrugVoiceRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        // If an existing instance exists, stop it first
        if (this.drugRecognition) {
            try { this.drugRecognition.abort(); } catch (e) {}
            this.drugRecognition = null;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        const searchInput = document.getElementById('drug-search');
        const resultsContainer = document.getElementById('drug-search-results');
        const voiceBtn = document.getElementById('drug-voice-btn');

        recognition.onstart = () => {
            recognition.active = true;
            this.drugRecognition = recognition;
            if (voiceBtn) voiceBtn.classList.add('active');
            if (resultsContainer) resultsContainer.innerHTML = '<div class="loading-message">🎤 Listening... Speak the drug name clearly.</div>';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript || '';
            if (searchInput) {
                searchInput.value = transcript;
                // Trigger search immediately
                this.searchDrugs(this.drugDatabase);
            }
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition error', event.error);
            if (resultsContainer) resultsContainer.innerHTML = '<div class="no-results">Voice recognition error: ' + (event.error || 'unknown') + '</div>';
        };

        recognition.onend = () => {
            recognition.active = false;
            if (voiceBtn) voiceBtn.classList.remove('active');
            // keep last result displayed; if search input is short, clear listening message
            if (resultsContainer && (!searchInput || (searchInput && searchInput.value.length < 2))) {
                // leave as-is or clear
            }
            this.drugRecognition = null;
        };

        try {
            recognition.start();
        } catch (e) {
            console.warn('Failed to start speech recognition', e);
            if (resultsContainer) resultsContainer.innerHTML = '<div class="no-results">Failed to start voice recognition.</div>';
        }
    }

    stopDrugVoiceRecognition() {
        if (this.drugRecognition) {
            try {
                this.drugRecognition.onend = null;
                this.drugRecognition.stop();
            } catch (e) {}
            const voiceBtn = document.getElementById('drug-voice-btn');
            if (voiceBtn) voiceBtn.classList.remove('active');
            this.drugRecognition = null;
        }
    }

    // Text-to-Speech: read drug name aloud
    speakDrugName(name) {
        if (!name) return;
        try {
            const synth = window.speechSynthesis;
            if (!synth) {
                alert('Text-to-speech not supported in this browser. Try Chrome/Edge.');
                return;
            }

            // Cancel any existing utterances
            synth.cancel();

            const utter = new SpeechSynthesisUtterance(name);
            // Try to pick an English voice (prefer en-US or en-GB)
            const voices = synth.getVoices();
            let chosen = voices.find(v => /en[-_]?us/i.test(v.lang)) || voices.find(v => /en[-_]?gb/i.test(v.lang)) || voices[0];
            if (chosen) utter.voice = chosen;
            utter.rate = 0.95; // slightly slower for clarity
            utter.pitch = 1;
            synth.speak(utter);
        } catch (e) {
            console.warn('TTS error', e);
        }
    }
    
    showDrugCategory(category) {
        const drugDatabase = this.drugDatabase;
        const drugList = document.getElementById('drug-list');
        let drugs = Object.keys(drugDatabase);
        
        // Update active state of category buttons
        const categoryButtons = document.querySelectorAll('.drug-categories .category-btn');
        categoryButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Find and activate the correct button
        const activeButton = Array.from(categoryButtons).find(btn => {
            const btnText = btn.textContent.trim();
            if (category === 'all' && btnText === 'All Drugs') return true;
            if (category === 'alphabetical' && btnText === 'A-Z') return true;
            if (category === 'analgesics' && btnText === 'Pain Management') return true;
            if (category === 'antibiotics' && btnText === 'Antibiotics') return true;
            if (category === 'cardiovascular' && btnText === 'Cardiovascular') return true;
            if (category === 'mental-health' && btnText === 'Mental Health') return true;
            if (category === 'respiratory' && btnText === 'Respiratory') return true;
            if (category === 'endocrine' && btnText === 'Endocrine') return true;
            if (category === 'emergency' && btnText === 'Emergency') return true;
            if (category === 'gastro' && btnText === 'Gastro') return true;
            if (category === 'neuro' && btnText === 'Neurological') return true;
            return false;
        });
        if (activeButton) activeButton.classList.add('active');
        
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
                <div style="display:flex;align-items:center;gap:10px;">
                    <h3 style="margin:0;">${drug.name}</h3>
                    <button class="speak-name-btn" onclick="event.stopPropagation(); window.quizApp.speakDrugName('${(drug.name || '').replace(/\"/g, '&quot;')}');">🔊 Read name</button>
                </div>
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
        
        // Scroll to the top - target the parent panel that actually scrolls
        const drugPanel = document.getElementById('drug-panel');
        if (drugPanel) {
            drugPanel.scrollTop = 0;
        }
        
        // Also scroll the container itself
        container.scrollTop = 0;
        
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
                    },
                    'LH': {
                        normal: 'M: 1-10 IU/L, F (follicular): 2-10, F (ovulation): 20-70, F (luteal): 1-15, Postmenopausal: 10-60',
                        low: 'Hypogonadotropic hypogonadism, hypopituitarism, anorexia, stress',
                        high: 'Primary gonadal failure, PCOS, menopause, Kallmann syndrome',
                        critical: 'Not typically defined',
                        ageVariations: 'Varies significantly by menstrual phase and menopausal status',
                        clinicalSignificance: 'Measure with FSH for fertility evaluation. LH:FSH ratio >2 suggests PCOS.'
                    },
                    'FSH': {
                        normal: 'M: 1-10 IU/L, F (follicular): 3-10, F (ovulation): 10-20, F (luteal): 1-10, Postmenopausal: 20-120',
                        low: 'Hypogonadotropic hypogonadism, hypopituitarism, pregnancy',
                        high: 'Primary ovarian/testicular failure, menopause, Klinefelter syndrome',
                        critical: 'Not typically defined',
                        ageVariations: 'Increases dramatically after menopause',
                        clinicalSignificance: 'High FSH with low estrogen/testosterone indicates primary gonadal failure.'
                    },
                    'Testosterone': {
                        normal: 'M: 10-30 nmol/L, F: 0.5-2.5 nmol/L',
                        low: 'Hypogonadism, pituitary disease, obesity, medications, aging',
                        high: 'PCOS, adrenal tumors, testicular tumors, anabolic steroid use',
                        critical: 'Not typically defined',
                        ageVariations: 'Declines with age in men (~1% per year after 30)',
                        clinicalSignificance: 'Measure total and free testosterone. Sample in morning (9-11am). Low testosterone with low LH/FSH = secondary hypogonadism.'
                    },
                    'Prolactin': {
                        normal: 'M: <15 μg/L, F (non-pregnant): <25 μg/L',
                        low: 'Rarely clinically significant, hypopituitarism',
                        high: 'Prolactinoma, medications (antipsychotics, metoclopramide), hypothyroidism, pregnancy',
                        critical: '>200 μg/L (likely prolactinoma)',
                        ageVariations: 'Elevated during pregnancy and lactation',
                        clinicalSignificance: 'Causes galactorrhea, hypogonadism. Macroprolactin can cause false elevations. MRI pituitary if >100.'
                    }
                }
            },
            'vitamins_minerals': {
                name: 'Vitamins & Minerals',
                values: {
                    'Vitamin B12': {
                        normal: '200-900 ng/L',
                        low: 'Pernicious anaemia, malabsorption, vegan diet, metformin use, gastric surgery',
                        high: 'B12 supplementation, liver disease, myeloproliferative disorders',
                        critical: '<150 ng/L',
                        ageVariations: 'Absorption decreases with age',
                        clinicalSignificance: 'Deficiency causes macrocytic anaemia, neuropathy. Check MMA/homocysteine if borderline. Treat empirically if symptomatic.'
                    },
                    'Folate': {
                        normal: '3-20 μg/L',
                        low: 'Poor diet, malabsorption, alcohol, antifolate drugs (methotrexate), pregnancy',
                        high: 'Folate supplementation, rarely clinically significant',
                        critical: '<2 μg/L',
                        ageVariations: 'Requirements increase in pregnancy',
                        clinicalSignificance: 'Deficiency causes macrocytic anaemia. Always check B12 concurrently. Treat B12 deficiency before folate.'
                    },
                    'Vitamin D': {
                        normal: '>50 nmol/L (adequate), 30-50 (insufficient), <30 (deficient)',
                        low: 'Limited sun exposure, malabsorption, CKD, obesity, dark skin',
                        high: 'Vitamin D toxicity, excessive supplementation',
                        critical: '<25 nmol/L (severe deficiency)',
                        ageVariations: 'Elderly at higher risk of deficiency',
                        clinicalSignificance: 'Deficiency causes osteomalacia, osteoporosis. Supplement if <50. Check PTH if low. Common in UK population.'
                    },
                    'Ferritin': {
                        normal: 'M: 30-300 μg/L, F: 15-200 μg/L',
                        low: 'Iron deficiency anaemia, blood loss, poor intake, malabsorption',
                        high: 'Inflammation, infection, liver disease, haemochromatosis, malignancy',
                        critical: '<15 μg/L (iron deficiency)',
                        ageVariations: 'Lower in premenopausal women due to menstruation',
                        clinicalSignificance: 'Best test for iron stores. <30 suggests iron deficiency even if not anaemic. Acute phase protein - can be falsely elevated.'
                    },
                    'Iron': {
                        normal: '10-30 μmol/L',
                        low: 'Iron deficiency, chronic disease, poor intake',
                        high: 'Haemochromatosis, iron supplementation, haemolysis, repeated transfusions',
                        critical: 'Not typically defined',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Shows diurnal variation. Best interpreted with TIBC and ferritin. Low with high TIBC suggests iron deficiency.'
                    },
                    'TIBC': {
                        normal: '45-70 μmol/L',
                        low: 'Chronic disease, malnutrition, liver disease, nephrotic syndrome',
                        high: 'Iron deficiency, pregnancy, oral contraceptives',
                        critical: 'Not typically defined',
                        ageVariations: 'Slightly higher in pregnancy',
                        clinicalSignificance: 'Transferrin saturation = (Iron/TIBC) × 100%. Normal: 20-45%. <20% = iron deficiency. >45% = iron overload.'
                    },
                    'Transferrin Saturation': {
                        normal: '20-45%',
                        low: 'Iron deficiency anaemia, chronic disease',
                        high: 'Haemochromatosis, iron overload, sideroblastic anaemia',
                        critical: '>60% (consider haemochromatosis)',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: '<20% suggests iron deficiency. >45% warrants investigation for haemochromatosis. Calculate from iron and TIBC.'
                    },
                    'Calcium (corrected)': {
                        normal: '2.20-2.60 mmol/L',
                        low: 'Hypoparathyroidism, vitamin D deficiency, CKD, pancreatitis, hypoalbuminaemia',
                        high: 'Primary hyperparathyroidism, malignancy, vitamin D toxicity, thiazide diuretics',
                        critical: '<1.90 or >3.00 mmol/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Correct for albumin: Corrected Ca = measured Ca + 0.02 × (40 - albumin g/L). Check PTH if abnormal.'
                    },
                    'Magnesium': {
                        normal: '0.70-1.00 mmol/L',
                        low: 'Diuretics, alcohol, diarrhoea, malabsorption, DKA, refeeding syndrome',
                        high: 'Renal failure, excessive supplementation, Addisons disease',
                        critical: '<0.50 or >1.50 mmol/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Often overlooked. Low Mg causes arrhythmias, seizures, resistant hypokalaemia/hypocalcaemia. Replace IV if severe.'
                    },
                    'Phosphate': {
                        normal: '0.80-1.50 mmol/L',
                        low: 'Refeeding syndrome, vitamin D deficiency, hyperparathyroidism, DKA recovery',
                        high: 'Renal failure, hypoparathyroidism, tumour lysis syndrome, rhabdomyolysis',
                        critical: '<0.30 or >2.50 mmol/L',
                        ageVariations: 'Higher in children',
                        clinicalSignificance: 'Low phosphate dangerous in refeeding. High phosphate in CKD requires phosphate binders. Check with calcium and PTH.'
                    }
                }
            },
            'bone_markers': {
                name: 'Bone Markers',
                values: {
                    'PTH': {
                        normal: '1.6-6.9 pmol/L',
                        low: 'Hypoparathyroidism, vitamin D toxicity, hypercalcaemia',
                        high: 'Primary/secondary hyperparathyroidism, vitamin D deficiency, CKD',
                        critical: '<0.5 or >30 pmol/L',
                        ageVariations: 'Increases with age',
                        clinicalSignificance: 'High PTH + high Ca = primary hyperparathyroidism. High PTH + low Ca = secondary (vitamin D deficiency, CKD).'
                    },
                    'ALP (bone-specific)': {
                        normal: '20-130 U/L',
                        low: 'Hypothyroidism, malnutrition',
                        high: 'Paget disease, bone metastases, fracture healing, osteomalacia, hyperparathyroidism',
                        critical: '>5× upper limit',
                        ageVariations: 'Elevated in children (growth) and elderly (bone turnover)',
                        clinicalSignificance: 'Use to differentiate bone vs liver cause of elevated total ALP. Order if total ALP elevated without GGT elevation.'
                    }
                }
            },
            'immunology': {
                name: 'Immunology & Autoimmune',
                values: {
                    'Rheumatoid Factor': {
                        normal: '<20 IU/mL',
                        low: 'No clinical significance',
                        high: 'Rheumatoid arthritis, Sjögren syndrome, SLE, chronic infections, elderly',
                        critical: '>100 IU/mL (high titre)',
                        ageVariations: 'Can be positive in 5-10% of healthy elderly',
                        clinicalSignificance: 'Positive in 70-80% of RA. Not specific - also in other autoimmune diseases. High titre more significant.'
                    },
                    'Anti-CCP': {
                        normal: '<20 units/mL',
                        low: 'No clinical significance',
                        high: 'Rheumatoid arthritis',
                        critical: '>100 units/mL (strongly positive)',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'More specific than RF for RA (95% specificity). Predicts erosive disease. Can be positive years before symptoms.'
                    },
                    'ANA': {
                        normal: '<1:80 (negative)',
                        low: 'No clinical significance',
                        high: 'SLE, drug-induced lupus, Sjögren, scleroderma, mixed connective tissue disease',
                        critical: '>1:640 (high titre)',
                        ageVariations: 'Low titres can be positive in healthy individuals, especially elderly',
                        clinicalSignificance: 'Screening test for autoimmune disease. Pattern matters (speckled, homogeneous, nucleolar). Positive in 5-10% healthy.'
                    }
                }
            },
            'proteins': {
                name: 'Protein Studies',
                values: {
                    'Total Protein': {
                        normal: '60-80 g/L',
                        low: 'Malnutrition, liver disease, nephrotic syndrome, protein-losing enteropathy',
                        high: 'Dehydration, multiple myeloma, chronic inflammation',
                        critical: '<40 or >100 g/L',
                        ageVariations: 'Slightly lower in elderly',
                        clinicalSignificance: 'Sum of albumin and globulins. Use with albumin to calculate A:G ratio and globulin level.'
                    },
                    'Globulin': {
                        normal: '20-35 g/L',
                        low: 'Immunodeficiency, nephrotic syndrome, malnutrition',
                        high: 'Chronic infection, autoimmune disease, multiple myeloma, liver disease',
                        critical: '<15 or >50 g/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Calculated: Total Protein - Albumin. A:G ratio normally 1.5-2.5. Low ratio (<1) suggests myeloma or liver disease.'
                    }
                }
            },
            'renal_urine': {
                name: 'Renal & Urine Tests',
                values: {
                    'Urine ACR': {
                        normal: '<3 mg/mmol',
                        low: 'No clinical significance',
                        high: 'Diabetic nephropathy, CKD, hypertension, proteinuria',
                        critical: '>30 mg/mmol (macroalbuminuria)',
                        ageVariations: 'Increases with age',
                        clinicalSignificance: 'Microalbuminuria: 3-30 mg/mmol. Screen annually in diabetes. Early marker of diabetic kidney disease. ACE-I/ARB if elevated.'
                    },
                    'Urinalysis': {
                        normal: 'Negative for blood, protein, glucose, ketones, nitrites, leukocytes',
                        low: 'Not applicable',
                        high: 'UTI (nitrites, leukocytes), diabetes (glucose), kidney disease (protein, blood), DKA (ketones)',
                        critical: 'Gross haematuria, heavy proteinuria',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Dipstick: quick screening. Blood without infection needs imaging for malignancy. Protein needs quantification. Nitrites 90% specific for UTI.'
                    }
                }
            },
            'hematology_additional': {
                name: 'Additional Hematology',
                values: {
                    'Reticulocyte Count': {
                        normal: '0.5-2.0% (25-100 × 10⁹/L)',
                        low: 'Bone marrow failure, aplastic anaemia, B12/folate deficiency',
                        high: 'Haemolytic anaemia, bleeding, response to treatment',
                        critical: '<0.2% or >6%',
                        ageVariations: 'Higher in neonates',
                        clinicalSignificance: 'Reflects bone marrow red cell production. High with anaemia = haemolysis or bleeding. Low with anaemia = production problem.'
                    },
                    'Blood Film': {
                        normal: 'Normal red cell, white cell, and platelet morphology',
                        low: 'Not applicable',
                        high: 'Various abnormalities: target cells, spherocytes, blasts, hypersegmented neutrophils',
                        critical: 'Presence of blasts (leukaemia), severe haemolysis features',
                        ageVariations: 'Morphology changes with age',
                        clinicalSignificance: 'Essential in anaemia workup. Identifies: iron deficiency (pencil cells), B12 deficiency (hypersegmentation), haemolysis (spherocytes, fragments).'
                    }
                }
            },
            'specialized': {
                name: 'Specialized Tests',
                values: {
                    'PSA': {
                        normal: '<4 ng/mL (age-dependent)',
                        low: 'No clinical significance',
                        high: 'Prostate cancer, BPH, prostatitis, recent DRE/ejaculation',
                        critical: '>10 ng/mL (high risk)',
                        ageVariations: 'Increases with age: <50yr: <2.5, 50-60: <3.5, 60-70: <4.5, >70: <6.5',
                        clinicalSignificance: 'Screening controversial. Velocity >0.75/year concerning. Free:total ratio <25% suggests cancer. Can be elevated 48h after ejaculation.'
                    },
                    'Lactate': {
                        normal: '0.5-2.0 mmol/L',
                        low: 'No clinical significance',
                        high: 'Sepsis, shock, tissue hypoxia, seizures, metformin, liver disease',
                        critical: '>4 mmol/L',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Marker of tissue hypoperfusion. Serial lactates guide sepsis resuscitation. Elevated in sepsis, shock, mesenteric ischaemia.'
                    },
                    'Amylase': {
                        normal: '30-110 U/L',
                        low: 'Chronic pancreatitis, pancreatic insufficiency',
                        high: 'Acute pancreatitis, perforated peptic ulcer, mesenteric ischaemia, mumps',
                        critical: '>3× upper limit (suggests pancreatitis)',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'Rises within 6-12h of acute pancreatitis. Not specific - also elevated in other acute abdomens. Lipase more specific.'
                    },
                    'Lipase': {
                        normal: '10-140 U/L',
                        low: 'Chronic pancreatitis (late stage)',
                        high: 'Acute pancreatitis, pancreatic cancer, renal failure, bowel obstruction',
                        critical: '>3× upper limit',
                        ageVariations: 'Consistent across ages',
                        clinicalSignificance: 'More specific and sensitive than amylase for acute pancreatitis. Remains elevated longer (7-14 days vs 3-5 days).'
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
                <button class="category-btn active" onclick="window.quizApp.showLabCategory('all'); event.stopPropagation();">All Labs</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('collection'); event.stopPropagation();">🩸 Collection</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('cbc'); event.stopPropagation();">CBC</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('bmp'); event.stopPropagation();">Chemistry</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('lft'); event.stopPropagation();">Liver</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('lipids'); event.stopPropagation();">Lipids</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('thyroid'); event.stopPropagation();">Thyroid</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('urea_electrolytes'); event.stopPropagation();">U&Es</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('coagulation'); event.stopPropagation();">Coagulation</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('cardiac_markers'); event.stopPropagation();">Cardiac</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('inflammatory_markers'); event.stopPropagation();">Inflammatory</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('endocrine'); event.stopPropagation();">Hormones</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('vitamins_minerals'); event.stopPropagation();">Vitamins</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('bone_markers'); event.stopPropagation();">Bone</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('immunology'); event.stopPropagation();">Immunology</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('proteins'); event.stopPropagation();">Proteins</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('renal_urine'); event.stopPropagation();">Urine</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('hematology_additional'); event.stopPropagation();">Hematology+</button>
                <button class="category-btn" onclick="window.quizApp.showLabCategory('specialized'); event.stopPropagation();">Specialized</button>
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
        
        // Handle special collection category
        if (category === 'collection') {
            this.showCollectionGuide();
            return;
        }
        
        let panels = Object.keys(labDatabase);
        
        // Update active state of category buttons
        const categoryButtons = document.querySelectorAll('.lab-categories .category-btn');
        if (categoryButtons.length > 0) {
            categoryButtons.forEach(btn => {
                btn.classList.remove('active');
                const btnText = btn.textContent.trim();
                if ((category === 'all' && btnText === 'All Labs') ||
                    (category === 'collection' && btnText === '🩸 Collection') ||
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
        
        // Scroll to the top - target the parent panel that actually scrolls
        const labPanel = document.getElementById('lab-panel');
        if (labPanel) {
            labPanel.scrollTop = 0;
        }
        
        // Also scroll the container itself
        container.scrollTop = 0;
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
        
        // Scroll to the top - target the parent panel that actually scrolls
        const labPanel = document.getElementById('lab-panel');
        if (labPanel) {
            labPanel.scrollTop = 0;
        }
        
        // Also scroll the container itself
        container.scrollTop = 0;
    }

    showCollectionGuide() {
        console.log('🩸 Opening comprehensive collection guide');
        const labList = document.getElementById('lab-list');
        
        labList.innerHTML = `
            <div class="blood-draw-guide">
                <div class="guide-intro">
                    <h4>🩸 Complete Blood Collection Guide</h4>
                    <p><em>Knowing which blood bottles to use for different tests is essential in clinical practice. Knowledge of blood bottles is one of those practical things which is poorly taught, if at all! Even though most hospitals now have printable stickers for bottles that tell you which ones to use, it is still vital to understand which bottles are used and why to prevent mistakes and/or awkward phone calls from the laboratory.</em></p>
                    
                    <div class="important-notice">
                        <strong>⚠️ Important:</strong> The colours of the vacutainer bottles are standardised. However, depending on which hospital you work in, preferences may vary between individual laboratories, especially regarding tests performed less frequently. It is important to check local guidelines or discuss with the laboratory if you're not sure.
                    </div>
                </div>

                <div class="tube-order-summary">
                    <h5>📋 Quick Reference - Order of Draw</h5>
                    <div class="order-summary-grid">
                        <div class="order-item"><span class="order-num">1</span> Blue (Citrate) - 3-4 inversions</div>
                        <div class="order-item"><span class="order-num">2</span> Yellow/Gold (Serum) - 5-6 inversions</div>
                        <div class="order-item"><span class="order-num">3</span> Green (Heparin) - 8 inversions</div>
                        <div class="order-item"><span class="order-num">4</span> Purple (EDTA) - 8-10 inversions</div>
                        <div class="order-item"><span class="order-num">5</span> Grey (Fluoride) - 8-10 inversions</div>
                    </div>
                </div>

                <div class="detailed-bottles">
                    <h5>🧪 Detailed Bottle Guide</h5>
                    
                    <!-- Blue Bottle -->
                    <div class="bottle-detail">
                        <div class="bottle-header">
                            <div class="bottle-visual blue-bottle">🔵</div>
                            <h6>Blue Blood Bottle (Sodium Citrate)</h6>
                        </div>
                        <div class="bottle-content">
                            <div class="bottle-info-grid">
                                <div class="info-section">
                                    <strong>Additive:</strong> Buffered sodium citrate - acts as reversible anticoagulant by binding calcium ions
                                    <br><strong>Inversions:</strong> 3-4 times
                                    <br><strong>Fill level:</strong> Must be filled to the line - critical for accurate results!
                                </div>
                                <div class="info-section">
                                    <strong>Common Tests:</strong>
                                    <ul>
                                        <li>Coagulation screen (PT, aPTT, TT, fibrinogen)</li>
                                        <li>INR (warfarin monitoring)</li>
                                        <li>D-dimer (thrombosis screening)</li>
                                        <li>APTR (heparin monitoring)</li>
                                        <li>Anti-Xa assay (LMWH monitoring)</li>
                                    </ul>
                                </div>
                                <div class="info-section">
                                    <strong>Special Tests:</strong>
                                    <ul>
                                        <li>Specific clotting factors (VIII, IX, vWF)</li>
                                        <li>Thrombophilia screen</li>
                                        <li>Lupus anticoagulant</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="clinical-tips">
                                <strong>💡 Clinical Tips:</strong>
                                <ul>
                                    <li>With butterfly needles, may need 2 bottles (first removes air from tubing)</li>
                                    <li>INR ideally done in morning</li>
                                    <li>Anti-Xa must be taken 3-4 hours after tinzaparin</li>
                                    <li>Under-filled tubes = over-anticoagulated results</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Yellow/Gold Bottle -->
                    <div class="bottle-detail">
                        <div class="bottle-header">
                            <div class="bottle-visual yellow-bottle">🟡</div>
                            <h6>Yellow/Gold Blood Bottle (SST - Serum Separator)</h6>
                        </div>
                        <div class="bottle-content">
                            <div class="bottle-info-grid">
                                <div class="info-section">
                                    <strong>Additive:</strong> Silica particles (clot activator) + serum separator gel
                                    <br><strong>Inversions:</strong> 5-6 times
                                    <br><strong>Volume:</strong> ~12 tests from one full bottle
                                </div>
                                <div class="info-section">
                                    <strong>Biochemistry:</strong>
                                    <ul>
                                        <li>U&E (urea, creatinine, Na+, K+)</li>
                                        <li>LFTs (bilirubin, ALP, AST/ALT, GGT)</li>
                                        <li>CRP, amylase, bone profile</li>
                                        <li>Lipids, TFTs, troponin</li>
                                        <li>Iron studies, vitamins</li>
                                    </ul>
                                </div>
                                <div class="info-section">
                                    <strong>Endocrinology:</strong>
                                    <ul>
                                        <li>Cortisol, sex hormones</li>
                                        <li>Beta-hCG, growth hormone</li>
                                        <li>Calcitonin*, EPO, IGF-1</li>
                                    </ul>
                                </div>
                                <div class="info-section">
                                    <strong>Tumour Markers:</strong>
                                    <ul>
                                        <li>PSA, CEA, CA-125, CA19-9</li>
                                        <li>AFP, LDH</li>
                                    </ul>
                                </div>
                                <div class="info-section">
                                    <strong>Toxicology/Drugs:</strong>
                                    <ul>
                                        <li>Paracetamol, salicylates</li>
                                        <li>Digoxin, lithium, gentamicin</li>
                                        <li>Ethanol, cannabis, opiates</li>
                                    </ul>
                                </div>
                                <div class="info-section">
                                    <strong>Microbiology/Immunology:</strong>
                                    <ul>
                                        <li>Viral hepatitis, HIV serology</li>
                                        <li>Immunoglobulins, complement</li>
                                        <li>Autoantibodies, RF, thyroid antibodies</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="clinical-tips">
                                <strong>💡 Clinical Tips:</strong>
                                <ul>
                                    <li>Don't panic if blood clots - it's supposed to!</li>
                                    <li>Separate bottles needed for different lab departments</li>
                                    <li>Troponin requires 2 samples at different times</li>
                                    <li>Serum osmolality needs concurrent urine sample</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Purple Bottle -->
                    <div class="bottle-detail">
                        <div class="bottle-header">
                            <div class="bottle-visual purple-bottle">🟣</div>
                            <h6>Purple Blood Bottle (EDTA - "Lavender")</h6>
                        </div>
                        <div class="bottle-content">
                            <div class="bottle-info-grid">
                                <div class="info-section">
                                    <strong>Additive:</strong> EDTA (ethylenediaminetetraacetic acid) - potent anticoagulant
                                    <br><strong>Inversions:</strong> 8-10 times
                                    <br><strong>Volume:</strong> 1ml sufficient for FBC, full bottle for ESR
                                </div>
                                <div class="info-section">
                                    <strong>Common Tests:</strong>
                                    <ul>
                                        <li>Full Blood Count (FBC)</li>
                                        <li>ESR (erythrocyte sedimentation rate)</li>
                                        <li>Blood film for malaria/abnormal cells</li>
                                        <li>HbA1C (diabetic control)</li>
                                        <li>Reticulocytes, red cell folate</li>
                                    </ul>
                                </div>
                                <div class="info-section">
                                    <strong>Special Tests:</strong>
                                    <ul>
                                        <li>Monospot test (EBV)</li>
                                        <li>Parathyroid hormone (PTH)*</li>
                                        <li>Ciclosporin/tacrolimus levels</li>
                                        <li>G6PD, ACTH level*</li>
                                        <li>Porphyria screen*, plasma metanephrines*</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="clinical-tips">
                                <strong>💡 Clinical Tips:</strong>
                                <ul>
                                    <li>EDTA binds calcium and metal ions - used in chelation therapy</li>
                                    <li>Can be labelled with radioisotopes for EDTA scans (GFR assessment)</li>
                                    <li>Mix gently - don't shake or sample will haemolyse</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Pink Bottle -->
                    <div class="bottle-detail">
                        <div class="bottle-header">
                            <div class="bottle-visual pink-bottle">🩷</div>
                            <h6>Pink Blood Bottle (Transfusion Lab EDTA)</h6>
                        </div>
                        <div class="bottle-content">
                            <div class="bottle-info-grid">
                                <div class="info-section">
                                    <strong>Additive:</strong> EDTA (same as purple but for transfusion lab only)
                                    <br><strong>Inversions:</strong> 8-10 times
                                    <br><strong>Volume:</strong> At least 1ml, more preferred
                                </div>
                                <div class="info-section">
                                    <strong>Common Tests:</strong>
                                    <ul>
                                        <li><strong>Group & Save (G&S):</strong> Blood typed and saved (NO blood products issued)</li>
                                        <li><strong>Crossmatch (XM):</strong> Blood matched to specific units for transfusion</li>
                                        <li>Direct Coombs test (autoimmune haemolytic anaemia)</li>
                                    </ul>
                                </div>
                                <div class="info-section">
                                    <strong>Special Tests:</strong>
                                    <ul>
                                        <li>Specific red cell antibodies (usually 3 bottles required)</li>
                                        <li>Can use for FBC if purple bottles unavailable</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="clinical-tips">
                                <strong>💡 Critical Safety:</strong>
                                <ul>
                                    <li>Special bedside hand-written label - prevents catastrophic mismatched transfusions</li>
                                    <li>Full crossmatch takes 45-60 minutes</li>
                                    <li>Type-specific blood available in 10-20 minutes</li>
                                    <li>O negative emergency blood from fridge stocks</li>
                                    <li>Ring transfusion lab for urgent/complex requests</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Grey Bottle -->
                    <div class="bottle-detail">
                        <div class="bottle-header">
                            <div class="bottle-visual grey-bottle">⚫</div>
                            <h6>Grey Blood Bottle (Fluoride Oxalate)</h6>
                        </div>
                        <div class="bottle-content">
                            <div class="bottle-info-grid">
                                <div class="info-section">
                                    <strong>Additive:</strong> Sodium fluoride (antiglycolytic) + potassium oxalate (anticoagulant)
                                    <br><strong>Inversions:</strong> 8-10 times
                                    <br><strong>Volume:</strong> Tiny amount for glucose, 1ml+ for lactate
                                </div>
                                <div class="info-section">
                                    <strong>Tests:</strong>
                                    <ul>
                                        <li><strong>Glucose:</strong> Fasting, non-fasting, GTT</li>
                                        <li><strong>Lactate:</strong> Must be sent immediately</li>
                                        <li>Blood ethanol (non-legal purposes)</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="clinical-tips">
                                <strong>💡 Clinical Tips:</strong>
                                <ul>
                                    <li>Fluoride prevents further glucose breakdown in sample</li>
                                    <li>Venous glucose more accurate than capillary (especially hyperglycaemic patients)</li>
                                    <li>For urgent glucose: use capillary blood glucose</li>
                                    <li>For urgent lactate: use arterial blood gas</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Additional Bottles -->
                    <div class="bottle-detail">
                        <div class="bottle-header">
                            <h6>🔴 Other Important Bottles</h6>
                        </div>
                        <div class="bottle-content">
                            <div class="bottle-info-grid">
                                <div class="info-section">
                                    <strong>🔴 Red Bottle:</strong> Silica clot activator, no separator gel
                                    <ul><li>Sensitive hormones, ionised calcium, cryoglobulins</li></ul>
                                </div>
                                <div class="info-section">
                                    <strong>🟢 Dark Green:</strong> Sodium heparin
                                    <ul><li>Ammonia*, insulin*, renin/aldosterone, chromosomes</li></ul>
                                </div>
                                <div class="info-section">
                                    <strong>🟢 Light Green:</strong> Lithium heparin + separator (PST)
                                    <ul><li>Routine biochemistry (alternative to yellow)</li></ul>
                                </div>
                                <div class="info-section">
                                    <strong>🔵 Blood Cultures:</strong> Culture medium
                                    <ul><li>Aerobic (blue lid), anaerobic (purple lid), mycobacterial (black lid)</li></ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="practical-tips">
                    <h5>💡 Essential Practical Tips</h5>
                    <div class="tips-grid">
                        <div class="tip-section">
                            <h6>⚠️ Critical Points</h6>
                            <ul>
                                <li><strong>Tests marked with *</strong> need immediate transport on ice</li>
                                <li><strong>Invert don't shake</strong> - be gentle or samples haemolyse</li>
                                <li><strong>Blood cultures first</strong> - use ANTT, before antibiotics</li>
                                <li><strong>Fill citrate tubes to line</strong> - under-filling affects results</li>
                            </ul>
                        </div>
                        <div class="tip-section">
                            <h6>🏥 Hospital Variations</h6>
                            <ul>
                                <li>Check local laboratory guidelines</li>
                                <li>Different departments may require separate bottles</li>
                                <li>Paediatric bottles have different colours</li>
                                <li>When unsure, ask the laboratory technicians</li>
                            </ul>
                        </div>
                        <div class="tip-section">
                            <h6>🩸 Sample Quality</h6>
                            <ul>
                                <li>Label tubes immediately at bedside</li>
                                <li>Transport promptly (some tests time-sensitive)</li>
                                <li>Room temperature unless specified otherwise</li>
                                <li>Avoid haemolysis, clots, insufficient volume</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="other-applications">
                    <h5>🫁 Non-Blood Fluid Applications</h5>
                    <p>These bottles can also be used for other body fluids:</p>
                    <ul>
                        <li><strong>Purple:</strong> Cell count (pleural, ascitic, CSF)</li>
                        <li><strong>Yellow:</strong> Electrolytes, albumin, LDH</li>
                        <li><strong>Grey:</strong> Glucose levels</li>
                        <li><strong>Blood culture bottles:</strong> Fluid cultures</li>
                    </ul>
                    <p><em>Always specify fluid type and anatomical source on request forms!</em></p>
                </div>

                <div class="abg-section">
                    <h5>🫁 Arterial Blood Gas (ABG) Syringes</h5>
                    <div class="abg-info">
                        <p><strong>Contains:</strong> Heparin to prevent clotting</p>
                        <p><strong>Uses:</strong> Oxygenation, acid-base balance, electrolytes (K+), lactate</p>
                        <p><strong>Key Points:</strong></p>
                        <ul>
                            <li>Expel heparin through needle before sampling</li>
                            <li>Self-filling syringes preferred (pressure-driven)</li>
                            <li>More challenging and uncomfortable than venous sampling</li>
                            <li><strong>Must reach lab within 10 minutes</strong> - becomes denatured</li>
                            <li>Results available within minutes</li>
                        </ul>
                    </div>
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
                <button class="category-btn active" onclick="window.quizApp.showGuidelinesCategory('all'); event.stopPropagation();">All Guidelines</button>
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
                    ${typeof guideline.lifestyle === 'string' ? 
                        `<p>${guideline.lifestyle}</p>` :
                        Object.entries(guideline.lifestyle).map(([aspect, description]) => `
                            <div class="lifestyle-item">
                                <strong>${aspect}:</strong> ${description}
                            </div>
                        `).join('')
                    }
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
                    ${typeof guideline.assessment === 'string' ? 
                        `<p>${guideline.assessment}</p>` :
                        Object.entries(guideline.assessment).map(([aspect, description]) => `
                            <div class="assessment-item">
                                <strong>${aspect}:</strong> ${description}
                            </div>
                        `).join('')
                    }
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
        
        // Scroll to the top - target the parent panel that actually scrolls
        const guidelinesPanel = document.getElementById('guidelines-panel');
        if (guidelinesPanel) {
            guidelinesPanel.scrollTop = 0;
        }
        
        // Also scroll the container itself
        container.scrollTop = 0;
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
        document.querySelectorAll('.ddx-categories .category-btn').forEach(btn => btn.classList.remove('active'));
        const targetButton = Array.from(document.querySelectorAll('.ddx-categories .category-btn')).find(btn => 
            btn.textContent.toLowerCase().includes(category.toLowerCase()) ||
            (category === 'all' && btn.textContent === 'All Symptoms')
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
        
        // Scroll to the top - target the parent panel that actually scrolls
        const ddxPanel = document.getElementById('differential-panel');
        if (ddxPanel) {
            ddxPanel.scrollTop = 0;
        }
        
        // Also scroll the container itself
        container.scrollTop = 0;
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
        
        // Scroll to the top - target the parent panel that actually scrolls
        const ddxPanel = document.getElementById('differential-panel');
        if (ddxPanel) {
            ddxPanel.scrollTop = 0;
        }
        
        // Also scroll the container itself
        container.scrollTop = 0;
    }

    // Override switchMedicalTool to load content
    switchMedicalTool(toolType, toolName = null) {
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
            'interpretation': 'interpretation-panel',
            'anatomy': 'anatomy-panel'
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
            case 'anatomy':
                this.initializeAnatomyExplorer();
                break;
        }
        
        console.log('🩺 Switched to tool:', toolType, 'Panel ID:', panelId);

        // Track usage of tools (activate add-to-recent/localStorage logic)
        try {
            const nameToTrack = toolName || toolType;
            if (typeof this.trackToolUsage === 'function') {
                this.trackToolUsage(toolType, nameToTrack);
                console.log(`📈 Tracked usage for ${toolType} → ${nameToTrack}`);
            }
        } catch (err) {
            console.warn('⚠️ Failed to track tool usage:', err);
        }
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
                <button class="font-size-btn" data-size="small" title="Small Text" style="background: transparent; border: 1px solid #007AFF; color: #007AFF; padding: 4px 6px; border-radius: 4px; font-size: 9px; cursor: pointer; font-weight: bold;">A</button>
                <button class="font-size-btn" data-size="medium" title="Medium Text" style="background: transparent; border: 1px solid #007AFF; color: #007AFF; padding: 4px 6px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: bold;">A</button>
                <button class="font-size-btn" data-size="large" title="Large Text" style="background: transparent; border: 1px solid #007AFF; color: #007AFF; padding: 4px 6px; border-radius: 4px; font-size: 13px; cursor: pointer; font-weight: bold;">A</button>
                <button class="font-size-btn" data-size="xlarge" title="Extra Large Text" style="background: transparent; border: 1px solid #007AFF; color: #007AFF; padding: 4px 6px; border-radius: 4px; font-size: 15px; cursor: pointer; font-weight: bold;">A</button>
            `;
            
            // Add event listeners
            fontControls.addEventListener('click', (e) => {
                if (e.target.classList.contains('font-size-btn')) {
                    console.log(`Font size button clicked: ${e.target.dataset.size}`);
                    this.setFontSize(e.target.dataset.size);
                }
            });
            
            const navRight = navbar.querySelector('.nav-right');
            if (navRight) {
                navRight.appendChild(fontControls);
            } else {
                navbar.appendChild(fontControls);
            }
            
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
/**
 * Setup export buttons for calculator result blocks.
 * Adds a small "Export Result" button to each `.calc-result` element
 * which will download the result text as a .txt file.
 */
MLAQuizApp.prototype.setupExportFeatures = function() {
    try {
        const attachExportTo = (container) => {
            if (!container || container.querySelector('.export-btn')) return;

            const btn = document.createElement('button');
            btn.className = 'export-btn';
            btn.textContent = 'Export Result';
            btn.style.cssText = 'margin-top:8px;padding:6px 10px;border-radius:6px;border:1px solid #d1d5db;background:#f3f4f6;cursor:pointer;';
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const text = (container.innerText || container.textContent || '').trim();
                try {
                    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    // Use calculator title if available and safe filename
                    const safeTitle = (document.getElementById('calculator-title')?.innerText || 'calculator_result').replace(/[^a-z0-9\-\_ ]+/ig, '').trim() || 'calculator_result';
                    link.download = `${safeTitle}.txt`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(link.href);
                    console.log('📤 Exported calculator result');
                } catch (err) {
                    console.warn('⚠️ Export failed:', err);
                }
            });

            container.appendChild(btn);
        };

        // Attach to existing calc-result blocks
        document.querySelectorAll('.calc-result').forEach(el => attachExportTo(el));

        // Observe future additions within calculator-detail-container
        const detail = document.getElementById('calculator-detail-container');
        if (detail && typeof MutationObserver !== 'undefined') {
            const mo = new MutationObserver((mutations) => {
                mutations.forEach(m => {
                    m.addedNodes && m.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            // Attach to any newly added calc-result elements
                            node.querySelectorAll && node.querySelectorAll('.calc-result').forEach(r => attachExportTo(r));
                            if (node.classList && node.classList.contains('calc-result')) attachExportTo(node);
                        }
                    });
                });
            });
            mo.observe(detail, { childList: true, subtree: true });
        }
    } catch (err) {
        console.warn('⚠️ setupExportFeatures failed:', err);
    }
};

/**
 * Add a per-calculator notes textarea and Save button.
 * Notes are persisted using saveToolNote/getToolNote (localStorage-backed).
 */
MLAQuizApp.prototype.setupCalculatorNotes = function(calcType) {
    try {
        const container = document.getElementById('calculator-detail-container');
        if (!container) return;

        // Avoid duplicating notes area
        const existing = container.querySelector('.calculator-notes');
        if (existing) return;

        const notesWrapper = document.createElement('div');
        notesWrapper.className = 'calculator-notes';
        notesWrapper.style.cssText = 'margin-top:12px;padding:10px;border-top:1px solid #e5e7eb;';
        notesWrapper.innerHTML = `
            <h4>Notes</h4>
            <textarea id="note-${calcType}" rows="4" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;resize:vertical;"></textarea>
            <div style="margin-top:8px;display:flex;gap:8px;">
                <button id="save-note-${calcType}" class="save-note-btn" style="padding:6px 10px;border-radius:6px;background:#007AFF;color:#fff;border:none;">Save Note</button>
                <button id="clear-note-${calcType}" class="clear-note-btn" style="padding:6px 10px;border-radius:6px;background:#f3f4f6;border:1px solid #d1d5db;">Clear</button>
            </div>
        `;

        container.appendChild(notesWrapper);

        const textarea = document.getElementById(`note-${calcType}`);
        const saveBtn = document.getElementById(`save-note-${calcType}`);
        const clearBtn = document.getElementById(`clear-note-${calcType}`);

        // Prefill saved note if present
        if (textarea && typeof this.getToolNote === 'function') {
            try {
                const saved = this.getToolNote(calcType);
                if (saved) textarea.value = saved;
            } catch (err) {
                console.warn('⚠️ getToolNote failed:', err);
            }
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const val = textarea.value || '';
                try {
                    if (typeof this.saveToolNote === 'function') {
                        this.saveToolNote(calcType, val);
                        this.showToast && this.showToast('Note saved');
                    } else {
                        localStorage.setItem(`toolNote:${calcType}`, val);
                        this.showToast && this.showToast('Note saved');
                    }
                } catch (err) {
                    console.warn('⚠️ saveToolNote failed:', err);
                    this.showToast && this.showToast('Failed to save note');
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (!textarea) return;
                textarea.value = '';
                try {
                    if (typeof this.saveToolNote === 'function') this.saveToolNote(calcType, '');
                    else localStorage.removeItem(`toolNote:${calcType}`);
                    this.showToast && this.showToast('Note cleared');
                } catch (err) {
                    console.warn('⚠️ clear note failed:', err);
                }
            });
        }
    } catch (err) {
        console.warn('⚠️ setupCalculatorNotes failed:', err);
    }
};

// Simple localStorage-backed note helpers if not already provided elsewhere
MLAQuizApp.prototype.getToolNote = MLAQuizApp.prototype.getToolNote || function(toolName) {
    try {
        return localStorage.getItem(`toolNote:${toolName}`) || '';
    } catch (err) {
        console.warn('⚠️ getToolNote localStorage read failed:', err);
        return '';
    }
};

MLAQuizApp.prototype.saveToolNote = MLAQuizApp.prototype.saveToolNote || function(toolName, noteText) {
    try {
        localStorage.setItem(`toolNote:${toolName}`, noteText || '');
        return true;
    } catch (err) {
        console.warn('⚠️ saveToolNote localStorage write failed:', err);
        return false;
    }
};

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
    
    // Scroll to the top - target the parent panel that actually scrolls
    const examPanel = document.getElementById('examination-panel');
    if (examPanel) {
        examPanel.scrollTop = 0;
    }
    
    // Also scroll the container itself
    container.scrollTop = 0;
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
    
    // Scroll to the top - target the parent panel that actually scrolls
    const examPanel = document.getElementById('examination-panel');
    if (examPanel) {
        examPanel.scrollTop = 0;
    }
    
    // Also scroll the container itself
    container.scrollTop = 0;
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

// Mental State Examination (MSE) Calculator
MLAQuizApp.prototype.getMSECalculator = function() {
    return `
        <div class="calculator-form">
            <h4>Mental State Examination (MSE)</h4>
            <p class="calc-description">Comprehensive psychiatric clinical assessment tool</p>
            
            <div class="calc-input-group">
                <label><strong>1. Appearance & Behavior</strong></label>
                <textarea id="mse-appearance" placeholder="E.g., Well-groomed, casually dressed, good eye contact, calm and cooperative" rows="2"></textarea>
            </div>
            
            <div class="calc-input-group">
                <label><strong>2. Speech</strong></label>
                <select id="mse-speech">
                    <option value="">Select...</option>
                    <option value="Normal rate, rhythm, volume">Normal rate, rhythm, volume</option>
                    <option value="Pressured">Pressured</option>
                    <option value="Slowed">Slowed</option>
                    <option value="Monotone">Monotone</option>
                    <option value="Loud">Loud</option>
                    <option value="Soft/Quiet">Soft/Quiet</option>
                    <option value="Stuttering">Stuttering</option>
                </select>
            </div>
            
            <div class="calc-input-group">
                <label><strong>3. Mood (Subjective)</strong></label>
                <input type="text" id="mse-mood" placeholder="Patient's own words, e.g., 'I feel depressed'">
            </div>
            
            <div class="calc-input-group">
                <label><strong>4. Affect (Objective)</strong></label>
                <select id="mse-affect">
                    <option value="">Select...</option>
                    <option value="Euthymic, full range, appropriate">Euthymic, full range, appropriate</option>
                    <option value="Anxious">Anxious</option>
                    <option value="Depressed">Depressed</option>
                    <option value="Elevated/Euphoric">Elevated/Euphoric</option>
                    <option value="Irritable">Irritable</option>
                    <option value="Flat/Blunted">Flat/Blunted</option>
                    <option value="Labile">Labile</option>
                    <option value="Incongruent">Incongruent</option>
                </select>
            </div>
            
            <div class="calc-input-group">
                <label><strong>5. Thought Process</strong></label>
                <select id="mse-thought-process">
                    <option value="">Select...</option>
                    <option value="Linear, logical, goal-directed">Linear, logical, goal-directed</option>
                    <option value="Tangential">Tangential</option>
                    <option value="Circumstantial">Circumstantial</option>
                    <option value="Flight of ideas">Flight of ideas</option>
                    <option value="Loose associations">Loose associations</option>
                    <option value="Perseveration">Perseveration</option>
                    <option value="Thought blocking">Thought blocking</option>
                </select>
            </div>
            
            <div class="calc-input-group">
                <label><strong>6. Thought Content</strong></label>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="mse-delusions"> Delusions</label>
                    <label><input type="checkbox" id="mse-suicidal"> Suicidal ideation</label>
                    <label><input type="checkbox" id="mse-homicidal"> Homicidal ideation</label>
                    <label><input type="checkbox" id="mse-paranoia"> Paranoia</label>
                    <label><input type="checkbox" id="mse-obsessions"> Obsessions</label>
                </div>
                <textarea id="mse-thought-content" placeholder="Additional details..." rows="2"></textarea>
            </div>
            
            <div class="calc-input-group">
                <label><strong>7. Perception</strong></label>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="mse-hallucinations-auditory"> Auditory hallucinations</label>
                    <label><input type="checkbox" id="mse-hallucinations-visual"> Visual hallucinations</label>
                    <label><input type="checkbox" id="mse-hallucinations-other"> Other hallucinations</label>
                    <label><input type="checkbox" id="mse-illusions"> Illusions</label>
                </div>
                <textarea id="mse-perception" placeholder="Additional details..." rows="2"></textarea>
            </div>
            
            <div class="calc-input-group">
                <label><strong>8. Cognition</strong></label>
                <select id="mse-orientation">
                    <option value="Oriented x3 (person, place, time)">Oriented x3 (person, place, time)</option>
                    <option value="Oriented x2">Oriented x2</option>
                    <option value="Oriented x1">Oriented x1</option>
                    <option value="Disoriented">Disoriented</option>
                </select>
                <select id="mse-memory" style="margin-top: 8px;">
                    <option value="Intact immediate, recent, remote memory">Intact immediate, recent, remote memory</option>
                    <option value="Impaired recent memory">Impaired recent memory</option>
                    <option value="Impaired remote memory">Impaired remote memory</option>
                    <option value="Global memory impairment">Global memory impairment</option>
                </select>
                <select id="mse-concentration" style="margin-top: 8px;">
                    <option value="Good concentration/attention">Good concentration/attention</option>
                    <option value="Mildly impaired">Mildly impaired concentration</option>
                    <option value="Moderately impaired">Moderately impaired concentration</option>
                    <option value="Severely impaired">Severely impaired concentration</option>
                </select>
            </div>
            
            <div class="calc-input-group">
                <label><strong>9. Insight</strong></label>
                <select id="mse-insight">
                    <option value="">Select...</option>
                    <option value="Good - recognizes illness, need for treatment">Good - recognizes illness, need for treatment</option>
                    <option value="Partial - some awareness of problems">Partial - some awareness of problems</option>
                    <option value="Poor - minimal awareness">Poor - minimal awareness</option>
                    <option value="Absent - denies illness completely">Absent - denies illness completely</option>
                </select>
            </div>
            
            <div class="calc-input-group">
                <label><strong>10. Judgment</strong></label>
                <select id="mse-judgment">
                    <option value="">Select...</option>
                    <option value="Good - able to make appropriate decisions">Good - able to make appropriate decisions</option>
                    <option value="Fair - some impairment in decision-making">Fair - some impairment in decision-making</option>
                    <option value="Poor - significant impairment">Poor - significant impairment</option>
                    <option value="Very poor - unable to make safe decisions">Very poor - unable to make safe decisions</option>
                </select>
            </div>
            
            <button onclick="window.quizApp.calculateMSE()">Generate MSE Summary</button>
            <div id="mse-result" class="calc-result"></div>
            <div class="calc-reference">
                <small><strong>Note:</strong> MSE is a comprehensive clinical interview documenting all aspects of mental status</small>
            </div>
        </div>
    `;
};

// Mini Mental State Examination (MMSE) Calculator
MLAQuizApp.prototype.getMMSECalculator = function() {
    return `
        <div class="calculator-form">
            <h4>Mini Mental State Examination (MMSE)</h4>
            <p class="calc-description">Cognitive screening tool for dementia (Maximum score: 30)</p>
            
            <div class="calc-input-group">
                <label><strong>1. Orientation to Time (5 points)</strong></label>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="mmse-year"> Year (1 point)</label>
                    <label><input type="checkbox" id="mmse-season"> Season (1 point)</label>
                    <label><input type="checkbox" id="mmse-date"> Date (1 point)</label>
                    <label><input type="checkbox" id="mmse-day"> Day (1 point)</label>
                    <label><input type="checkbox" id="mmse-month"> Month (1 point)</label>
                </div>
            </div>
            
            <div class="calc-input-group">
                <label><strong>2. Orientation to Place (5 points)</strong></label>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="mmse-country"> Country (1 point)</label>
                    <label><input type="checkbox" id="mmse-county"> County (1 point)</label>
                    <label><input type="checkbox" id="mmse-town"> Town (1 point)</label>
                    <label><input type="checkbox" id="mmse-hospital"> Hospital (1 point)</label>
                    <label><input type="checkbox" id="mmse-floor"> Floor (1 point)</label>
                </div>
            </div>
            
            <div class="calc-input-group">
                <label><strong>3. Registration (3 points)</strong></label>
                <p style="font-size: 14px; margin: 5px 0;">Ask patient to repeat 3 words (e.g., "apple, table, penny")</p>
                <label>Number of words correctly repeated on first attempt:</label>
                <select id="mmse-registration">
                    <option value="3">3 words (3 points)</option>
                    <option value="2">2 words (2 points)</option>
                    <option value="1">1 word (1 point)</option>
                    <option value="0">0 words (0 points)</option>
                </select>
            </div>
            
            <div class="calc-input-group">
                <label><strong>4. Attention & Calculation (5 points)</strong></label>
                <p style="font-size: 14px; margin: 5px 0;">Serial 7s: 100-7, -7, -7, -7, -7 (93, 86, 79, 72, 65)<br>OR spell "WORLD" backwards (D-L-R-O-W)</p>
                <label>Number of correct answers:</label>
                <select id="mmse-attention">
                    <option value="5">5 correct (5 points)</option>
                    <option value="4">4 correct (4 points)</option>
                    <option value="3">3 correct (3 points)</option>
                    <option value="2">2 correct (2 points)</option>
                    <option value="1">1 correct (1 point)</option>
                    <option value="0">0 correct (0 points)</option>
                </select>
            </div>
            
            <div class="calc-input-group">
                <label><strong>5. Recall (3 points)</strong></label>
                <p style="font-size: 14px; margin: 5px 0;">Ask patient to recall the 3 words from Registration</p>
                <label>Number of words correctly recalled:</label>
                <select id="mmse-recall">
                    <option value="3">3 words (3 points)</option>
                    <option value="2">2 words (2 points)</option>
                    <option value="1">1 word (1 point)</option>
                    <option value="0">0 words (0 points)</option>
                </select>
            </div>
            
            <div class="calc-input-group">
                <label><strong>6. Naming (2 points)</strong></label>
                <p style="font-size: 14px; margin: 5px 0;">Show patient a watch and a pen, ask them to name each</p>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="mmse-naming-1"> Named first object (1 point)</label>
                    <label><input type="checkbox" id="mmse-naming-2"> Named second object (1 point)</label>
                </div>
            </div>
            
            <div class="calc-input-group">
                <label><strong>7. Repetition (1 point)</strong></label>
                <p style="font-size: 14px; margin: 5px 0;">Ask patient to repeat: "No ifs, ands, or buts"</p>
                <label><input type="checkbox" id="mmse-repetition"> Correctly repeated (1 point)</label>
            </div>
            
            <div class="calc-input-group">
                <label><strong>8. Three-Stage Command (3 points)</strong></label>
                <p style="font-size: 14px; margin: 5px 0;">"Take this paper in your right hand, fold it in half, and put it on the floor"</p>
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="mmse-command-1"> Takes paper (1 point)</label>
                    <label><input type="checkbox" id="mmse-command-2"> Folds paper (1 point)</label>
                    <label><input type="checkbox" id="mmse-command-3"> Places on floor (1 point)</label>
                </div>
            </div>
            
            <div class="calc-input-group">
                <label><strong>9. Reading (1 point)</strong></label>
                <p style="font-size: 14px; margin: 5px 0;">Show patient "CLOSE YOUR EYES" and ask them to do what it says</p>
                <label><input type="checkbox" id="mmse-reading"> Closes eyes (1 point)</label>
            </div>
            
            <div class="calc-input-group">
                <label><strong>10. Writing (1 point)</strong></label>
                <p style="font-size: 14px; margin: 5px 0;">Ask patient to write a complete sentence</p>
                <label><input type="checkbox" id="mmse-writing"> Writes grammatically correct sentence (1 point)</label>
            </div>
            
            <div class="calc-input-group">
                <label><strong>11. Copying (1 point)</strong></label>
                <p style="font-size: 14px; margin: 5px 0;">Ask patient to copy two intersecting pentagons</p>
                <label><input type="checkbox" id="mmse-copying"> Correctly copies diagram (1 point)</label>
            </div>
            
            <button onclick="window.quizApp.calculateMMSE()">Calculate MMSE Score</button>
            <div id="mmse-result" class="calc-result"></div>
            <div class="calc-reference">
                <small><strong>Interpretation:</strong> 24-30 Normal | 18-23 Mild impairment | 10-17 Moderate | <10 Severe<br>
                <strong>Note:</strong> Adjust for age and education level. Not diagnostic alone - clinical judgment required.</small>
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

// Mental State Examination (MSE) Calculation
MLAQuizApp.prototype.calculateMSE = function() {
    const appearance = document.getElementById('mse-appearance').value;
    const speech = document.getElementById('mse-speech').value;
    const mood = document.getElementById('mse-mood').value;
    const affect = document.getElementById('mse-affect').value;
    const thoughtProcess = document.getElementById('mse-thought-process').value;
    const thoughtContent = document.getElementById('mse-thought-content').value;
    const perception = document.getElementById('mse-perception').value;
    const orientation = document.getElementById('mse-orientation').value;
    const memory = document.getElementById('mse-memory').value;
    const concentration = document.getElementById('mse-concentration').value;
    const insight = document.getElementById('mse-insight').value;
    const judgment = document.getElementById('mse-judgment').value;
    
    // Check for concerning findings
    const delusions = document.getElementById('mse-delusions').checked;
    const suicidal = document.getElementById('mse-suicidal').checked;
    const homicidal = document.getElementById('mse-homicidal').checked;
    const paranoia = document.getElementById('mse-paranoia').checked;
    const obsessions = document.getElementById('mse-obsessions').checked;
    const auditoryHalluc = document.getElementById('mse-hallucinations-auditory').checked;
    const visualHalluc = document.getElementById('mse-hallucinations-visual').checked;
    const otherHalluc = document.getElementById('mse-hallucinations-other').checked;
    const illusions = document.getElementById('mse-illusions').checked;
    
    // Build thought content section
    let thoughtContentDetails = [];
    if (delusions) thoughtContentDetails.push('delusions present');
    if (suicidal) thoughtContentDetails.push('⚠️ SUICIDAL IDEATION');
    if (homicidal) thoughtContentDetails.push('⚠️ HOMICIDAL IDEATION');
    if (paranoia) thoughtContentDetails.push('paranoid ideation');
    if (obsessions) thoughtContentDetails.push('obsessive thoughts');
    if (thoughtContent) thoughtContentDetails.push(thoughtContent);
    
    const thoughtContentSummary = thoughtContentDetails.length > 0 
        ? thoughtContentDetails.join(', ') 
        : 'No abnormalities noted';
    
    // Build perception section
    let perceptionDetails = [];
    if (auditoryHalluc) perceptionDetails.push('auditory hallucinations');
    if (visualHalluc) perceptionDetails.push('visual hallucinations');
    if (otherHalluc) perceptionDetails.push('other hallucinations');
    if (illusions) perceptionDetails.push('illusions');
    if (perception) perceptionDetails.push(perception);
    
    const perceptionSummary = perceptionDetails.length > 0 
        ? perceptionDetails.join(', ') 
        : 'No perceptual disturbances';
    
    // Risk assessment
    let riskWarning = '';
    if (suicidal || homicidal) {
        riskWarning = `
            <div class="clinical-note" style="background: #fee2e2; border-color: #dc2626; margin-top: 15px;">
                <h4 style="color: #dc2626; margin-top: 0;">⚠️ RISK ALERT</h4>
                <p><strong>IMMEDIATE ACTION REQUIRED:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    ${suicidal ? '<li>Suicidal ideation present - assess risk, ensure safety, consider crisis team</li>' : ''}
                    ${homicidal ? '<li>Homicidal ideation present - assess risk, ensure safety, consider urgent psychiatric review and duty to warn</li>' : ''}
                </ul>
            </div>
        `;
    }
    
    // Generate MSE summary
    const mseSummary = `
        <h4 style="color: #007AFF;">Mental State Examination Summary</h4>
        <div class="mse-summary" style="text-align: left; line-height: 1.8;">
            <p><strong>Appearance & Behavior:</strong> ${appearance || 'Not documented'}</p>
            <p><strong>Speech:</strong> ${speech || 'Not documented'}</p>
            <p><strong>Mood:</strong> ${mood ? `"${mood}"` : 'Not documented'}</p>
            <p><strong>Affect:</strong> ${affect || 'Not documented'}</p>
            <p><strong>Thought Process:</strong> ${thoughtProcess || 'Not documented'}</p>
            <p><strong>Thought Content:</strong> ${thoughtContentSummary}</p>
            <p><strong>Perception:</strong> ${perceptionSummary}</p>
            <p><strong>Cognition:</strong></p>
            <ul style="margin: 5px 0 10px 20px;">
                <li>Orientation: ${orientation}</li>
                <li>Memory: ${memory}</li>
                <li>Concentration: ${concentration}</li>
            </ul>
            <p><strong>Insight:</strong> ${insight || 'Not documented'}</p>
            <p><strong>Judgment:</strong> ${judgment || 'Not documented'}</p>
        </div>
        ${riskWarning}
        <div class="calc-reference" style="margin-top: 15px;">
            <small><strong>Clinical Use:</strong> Document this MSE in the patient's medical record. Repeat MSE if mental status changes.</small>
        </div>
    `;
    
    document.getElementById('mse-result').innerHTML = mseSummary;
};

// Mini Mental State Examination (MMSE) Calculation
MLAQuizApp.prototype.calculateMMSE = function() {
    let score = 0;
    
    // Orientation to Time (5 points)
    if (document.getElementById('mmse-year').checked) score++;
    if (document.getElementById('mmse-season').checked) score++;
    if (document.getElementById('mmse-date').checked) score++;
    if (document.getElementById('mmse-day').checked) score++;
    if (document.getElementById('mmse-month').checked) score++;
    
    // Orientation to Place (5 points)
    if (document.getElementById('mmse-country').checked) score++;
    if (document.getElementById('mmse-county').checked) score++;
    if (document.getElementById('mmse-town').checked) score++;
    if (document.getElementById('mmse-hospital').checked) score++;
    if (document.getElementById('mmse-floor').checked) score++;
    
    // Registration (3 points)
    score += parseInt(document.getElementById('mmse-registration').value);
    
    // Attention & Calculation (5 points)
    score += parseInt(document.getElementById('mmse-attention').value);
    
    // Recall (3 points)
    score += parseInt(document.getElementById('mmse-recall').value);
    
    // Naming (2 points)
    if (document.getElementById('mmse-naming-1').checked) score++;
    if (document.getElementById('mmse-naming-2').checked) score++;
    
    // Repetition (1 point)
    if (document.getElementById('mmse-repetition').checked) score++;
    
    // Three-Stage Command (3 points)
    if (document.getElementById('mmse-command-1').checked) score++;
    if (document.getElementById('mmse-command-2').checked) score++;
    if (document.getElementById('mmse-command-3').checked) score++;
    
    // Reading (1 point)
    if (document.getElementById('mmse-reading').checked) score++;
    
    // Writing (1 point)
    if (document.getElementById('mmse-writing').checked) score++;
    
    // Copying (1 point)
    if (document.getElementById('mmse-copying').checked) score++;
    
    // Interpretation
    let interpretation, color, severity, recommendations;
    
    if (score >= 24) {
        interpretation = 'Normal Cognition';
        color = '#16a34a';
        severity = 'No cognitive impairment detected';
        recommendations = 'No further cognitive testing required at this time. Consider reassessment if concerns arise.';
    } else if (score >= 18) {
        interpretation = 'Mild Cognitive Impairment';
        color = '#eab308';
        severity = 'Mild impairment - may indicate early dementia or delirium';
        recommendations = 'Consider: Full cognitive assessment, medication review, exclude delirium (infection, metabolic), neuroimaging if new onset, referral to memory clinic.';
    } else if (score >= 10) {
        interpretation = 'Moderate Cognitive Impairment';
        color = '#f97316';
        severity = 'Moderate impairment - likely dementia or severe delirium';
        recommendations = 'Urgent actions: Exclude reversible causes (delirium, medication, B12, thyroid), neuroimaging, specialist referral, assess capacity, discuss safety and support needs.';
    } else {
        interpretation = 'Severe Cognitive Impairment';
        color = '#dc2626';
        severity = 'Severe impairment - advanced dementia or acute confusion';
        recommendations = 'Immediate actions: Exclude acute delirium (sepsis, stroke, metabolic), assess safety, urgent geriatric or psychiatric review, consider safeguarding needs.';
    }
    
    // Score breakdown
    const orientationTime = [
        document.getElementById('mmse-year').checked,
        document.getElementById('mmse-season').checked,
        document.getElementById('mmse-date').checked,
        document.getElementById('mmse-day').checked,
        document.getElementById('mmse-month').checked
    ].filter(x => x).length;
    
    const orientationPlace = [
        document.getElementById('mmse-country').checked,
        document.getElementById('mmse-county').checked,
        document.getElementById('mmse-town').checked,
        document.getElementById('mmse-hospital').checked,
        document.getElementById('mmse-floor').checked
    ].filter(x => x).length;
    
    const registration = parseInt(document.getElementById('mmse-registration').value);
    const attention = parseInt(document.getElementById('mmse-attention').value);
    const recall = parseInt(document.getElementById('mmse-recall').value);
    
    const naming = [
        document.getElementById('mmse-naming-1').checked,
        document.getElementById('mmse-naming-2').checked
    ].filter(x => x).length;
    
    const repetition = document.getElementById('mmse-repetition').checked ? 1 : 0;
    
    const command = [
        document.getElementById('mmse-command-1').checked,
        document.getElementById('mmse-command-2').checked,
        document.getElementById('mmse-command-3').checked
    ].filter(x => x).length;
    
    const reading = document.getElementById('mmse-reading').checked ? 1 : 0;
    const writing = document.getElementById('mmse-writing').checked ? 1 : 0;
    const copying = document.getElementById('mmse-copying').checked ? 1 : 0;
    
    const languageScore = naming + repetition + command + reading + writing + copying;
    
    document.getElementById('mmse-result').innerHTML = `
        <h4 style="color: ${color}">MMSE Score: ${score}/30</h4>
        <p><strong>Interpretation:</strong> ${interpretation}</p>
        <p><strong>Severity:</strong> ${severity}</p>
        
        <div class="mmse-breakdown" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: left;">
            <h5 style="margin-top: 0;">Score Breakdown:</h5>
            <ul style="list-style: none; padding: 0; margin: 0;">
                <li>📍 Orientation to Time: ${orientationTime}/5</li>
                <li>🗺️ Orientation to Place: ${orientationPlace}/5</li>
                <li>📝 Registration: ${registration}/3</li>
                <li>🧮 Attention & Calculation: ${attention}/5</li>
                <li>🧠 Recall: ${recall}/3</li>
                <li>💬 Language: ${languageScore}/9</li>
            </ul>
        </div>
        
        <div class="clinical-note">
            <p><strong>Recommendations:</strong></p>
            <p>${recommendations}</p>
        </div>
        
        <div class="calc-reference" style="margin-top: 15px;">
            <small><strong>Important Notes:</strong><br>
            • MMSE should be adjusted for age, education, and cultural factors<br>
            • Not diagnostic alone - use alongside clinical assessment and history<br>
            • Consider MoCA for subtle cognitive impairment (more sensitive)<br>
            • Repeat testing useful to track progression</small>
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

// RASS Scale Calculator
MLAQuizApp.prototype.getRASSCalculator = function() {
    return `
        <div class="calculator-form">
            <h4>Richmond Agitation-Sedation Scale (RASS)</h4>
            <p><small>Assessment of sedation and agitation levels in critically ill patients</small></p>
            
            <div class="calc-input-group">
                <label>Patient's Current State:</label>
                <select id="rass-level">
                    <option value="+4">+4 - Combative (violent, immediate danger)</option>
                    <option value="+3">+3 - Very agitated (pulls/removes tubes, aggressive)</option>
                    <option value="+2">+2 - Agitated (frequent non-purposeful movement)</option>
                    <option value="+1">+1 - Restless (anxious, apprehensive, not aggressive)</option>
                    <option value="0" selected>0 - Alert and calm</option>
                    <option value="-1">-1 - Drowsy (not fully alert, sustained awakening to voice)</option>
                    <option value="-2">-2 - Light sedation (briefly awakens to voice <10 sec)</option>
                    <option value="-3">-3 - Moderate sedation (movement/eye opening to voice, no eye contact)</option>
                    <option value="-4">-4 - Deep sedation (no response to voice, movement to physical stimulation)</option>
                    <option value="-5">-5 - Unarousable (no response to voice or physical stimulation)</option>
                </select>
            </div>
            
            <button onclick="window.quizApp.calculateRASS()">Assess RASS Level</button>
            <div id="rass-result" class="calc-result"></div>
            
            <div class="calc-reference">
                <small>
                    <strong>Assessment:</strong><br>
                    • +4 to +1: Agitation states<br>
                    • 0: Alert and calm (target for most patients)<br>
                    • -1 to -3: Varying levels of sedation<br>
                    • -4 to -5: Deep sedation/unconscious<br>
                    <strong>Target:</strong> Usually 0 to -2 for mechanically ventilated patients
                </small>
            </div>
        </div>
    `;
};

// FRAX Fracture Risk Calculator
MLAQuizApp.prototype.getFractureRiskCalculator = function() {
    return `
        <div class="calculator-form">
            <h4>FRAX Fracture Risk Assessment</h4>
            <p><small>10-year probability of major osteoporotic fracture (UK version)</small></p>
            
            <div class="calc-input-group">
                <label>Age (years):</label>
                <input type="number" id="frax-age" placeholder="65" min="40" max="90">
            </div>
            <div class="calc-checkbox-group">
                <label><input type="radio" name="frax-sex" value="female"> Female</label>
                <label><input type="radio" name="frax-sex" value="male"> Male</label>
            </div>
            <div class="calc-input-group">
                <label>Weight (kg):</label>
                <input type="number" id="frax-weight" placeholder="70" min="25" max="125">
            </div>
            <div class="calc-input-group">
                <label>Height (cm):</label>
                <input type="number" id="frax-height" placeholder="160" min="100" max="220">
            </div>
            
            <h5>Risk Factors:</h5>
            <div class="calc-checkbox-group">
                <label><input type="checkbox" id="frax-previous-fracture"> Previous fracture after age 50</label>
                <label><input type="checkbox" id="frax-parent-fracture"> Parent fractured hip</label>
                <label><input type="checkbox" id="frax-smoking"> Current smoking</label>
                <label><input type="checkbox" id="frax-steroids"> Glucocorticoids (≥3 months)</label>
                <label><input type="checkbox" id="frax-ra"> Rheumatoid arthritis</label>
                <label><input type="checkbox" id="frax-secondary"> Secondary osteoporosis</label>
                <label><input type="checkbox" id="frax-alcohol"> Alcohol 3+ units daily</label>
            </div>
            
            <div class="calc-input-group">
                <label>Femoral neck BMD T-score (optional):</label>
                <input type="number" id="frax-bmd" placeholder="-2.5" min="-5" max="3" step="0.1">
                <small>Leave blank if unknown</small>
            </div>
            
            <button onclick="window.quizApp.calculateFractureRisk()">Calculate Fracture Risk</button>
            <div id="frax-result" class="calc-result"></div>
            
            <div class="calc-reference">
                <small>
                    <strong>Intervention thresholds (NICE):</strong><br>
                    • Major osteoporotic fracture: ≥10% (consider treatment)<br>
                    • Hip fracture: ≥3% (consider treatment)<br>
                    <strong>Note:</strong> This is a simplified assessment. Use official FRAX tool for clinical decisions.
                </small>
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
    
    const K = sex === 'male' ? 1.23 : 1.04;  // UK constants for μmol/L
    const crCl = ((140 - age) * weight * K) / creatinine;
    
    let doseAdjustment = '';
    let color = '';
    
    if (crCl >= 60) {
        doseAdjustment = 'No dose adjustment typically required for most medications';
        color = '#4CAF50';
    } else if (crCl >= 30) {
        doseAdjustment = 'Dose adjustment required for many renally-excreted drugs (e.g., metformin, DOACs, antibiotics)';
        color = '#FF9800';
    } else if (crCl >= 15) {
        doseAdjustment = 'Significant dose adjustment or contraindications for many drugs. Specialist review advised';
        color = '#F44336';
    } else {
        doseAdjustment = 'Severe renal impairment - many drugs contraindicated. Urgent specialist review';
        color = '#D32F2F';
    }
    
    document.getElementById('cg-result').innerHTML = `
        <div class="result-section">
            <h5>Cockcroft-Gault Results</h5>
            <div class="result-grid">
                <div><strong>Creatinine Clearance:</strong> ${crCl.toFixed(1)} mL/min</div>
                <div style="color: ${color};"><strong>Dose Adjustment Guidance:</strong> ${doseAdjustment}</div>
            </div>
            <div class="alert alert-warning">
                ⚠️ CrCl is used for drug dosing, NOT CKD staging<br>
                <small>UK CKD staging uses eGFR (G1-G5) + albuminuria (A1-A3)<br>
                Use eGFR calculator for CKD staging and monitoring</small>
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

// RASS Scale Calculation
MLAQuizApp.prototype.calculateRASS = function() {
    const level = document.getElementById('rass-level').value;
    const score = parseInt(level);
    
    let category = '';
    let description = '';
    let management = '';
    let targetRange = '';
    
    if (score >= 3) {
        category = 'Severe Agitation';
        description = 'Patient is combative or very agitated';
        management = '• Consider sedation (propofol, midazolam)<br>• Assess for pain, delirium, hypoxia<br>• Ensure patient safety<br>• Consider physical restraints if necessary';
        targetRange = 'Aim to reduce to 0 to -2 range';
    } else if (score >= 1) {
        category = 'Mild-Moderate Agitation';
        description = 'Patient is restless or mildly agitated';
        management = '• Investigate underlying causes<br>• Consider non-pharmacological interventions<br>• Light sedation if needed<br>• Frequent reassessment';
        targetRange = 'Aim for 0 to -1 range';
    } else if (score === 0) {
        category = 'Alert and Calm';
        description = 'Ideal conscious level for most patients';
        management = '• No intervention needed<br>• Continue current management<br>• Monitor for changes';
        targetRange = 'Optimal level for most patients';
    } else if (score >= -2) {
        category = 'Light Sedation';
        description = 'Appropriate sedation level for many ICU patients';
        management = '• Appropriate for mechanically ventilated patients<br>• Consider daily sedation holds<br>• Monitor for oversedation';
        targetRange = 'Often target range for ventilated patients';
    } else if (score >= -3) {
        category = 'Moderate Sedation';
        description = 'Deeper sedation - assess necessity';
        management = '• Review sedation requirements<br>• Consider reducing sedation if appropriate<br>• Daily sedation interruption';
        targetRange = 'May be appropriate for specific indications';
    } else {
        category = 'Deep Sedation/Unconscious';
        description = 'Very deep sedation or unconscious';
        management = '• Review indication for deep sedation<br>• Consider reducing if possible<br>• Assess neurological status<br>• May indicate paralysis or coma';
        targetRange = 'Usually avoid unless specific indication';
    }
    
    document.getElementById('rass-result').innerHTML = `
        <div class="result-section">
            <h5>RASS Assessment Results</h5>
            <div class="result-grid">
                <div><strong>RASS Score:</strong> ${level}</div>
                <div><strong>Category:</strong> ${category}</div>
                <div><strong>Description:</strong> ${description}</div>
            </div>
            <div class="management-section">
                <h6>Management Recommendations:</h6>
                <div class="management-text">${management}</div>
            </div>
            <div class="alert alert-info">
                <strong>Target Range:</strong> ${targetRange}
            </div>
            <div class="alert alert-warning">
                💡 <strong>Remember:</strong> Assess RASS regularly. Target is usually 0 to -2 for mechanically ventilated patients.
            </div>
        </div>
    `;
};

// FRAX Fracture Risk Calculation
MLAQuizApp.prototype.calculateFractureRisk = function() {
    const age = parseInt(document.getElementById('frax-age').value);
    const sex = document.querySelector('input[name="frax-sex"]:checked')?.value;
    const weight = parseFloat(document.getElementById('frax-weight').value);
    const height = parseFloat(document.getElementById('frax-height').value);
    const bmd = document.getElementById('frax-bmd').value;
    
    if (!age || !sex || !weight || !height) {
        document.getElementById('frax-result').innerHTML = '<div class="error">Please fill in all required fields</div>';
        return;
    }
    
    // Calculate BMI
    const bmi = weight / ((height / 100) ** 2);
    
    // Count risk factors
    let riskFactors = 0;
    const riskInputs = [
        'frax-previous-fracture',
        'frax-parent-fracture', 
        'frax-smoking',
        'frax-steroids',
        'frax-ra',
        'frax-secondary',
        'frax-alcohol'
    ];
    
    riskInputs.forEach(id => {
        if (document.getElementById(id).checked) {
            riskFactors++;
        }
    });
    
    // Simplified risk calculation (real FRAX uses complex algorithms)
    let baseRisk = 0;
    
    // Age factor (increases significantly with age)
    if (age < 50) baseRisk += 2;
    else if (age < 60) baseRisk += 5;
    else if (age < 70) baseRisk += 10;
    else if (age < 80) baseRisk += 20;
    else baseRisk += 35;
    
    // Sex factor (women higher risk post-menopause)
    if (sex === 'female' && age >= 50) {
        baseRisk += 5;
    }
    
    // BMI factor (low BMI increases risk)
    if (bmi < 20) baseRisk += 3;
    else if (bmi < 22) baseRisk += 1;
    
    // Risk factors (each adds to risk)
    baseRisk += riskFactors * 3;
    
    // BMD adjustment if provided
    if (bmd) {
        const bmdValue = parseFloat(bmd);
        if (bmdValue < -2.5) baseRisk += 8;
        else if (bmdValue < -2.0) baseRisk += 5;
        else if (bmdValue < -1.0) baseRisk += 2;
    }
    
    // Cap at reasonable maximum
    const majorFractureRisk = Math.min(baseRisk, 50);
    const hipFractureRisk = Math.round(majorFractureRisk * 0.3); // Hip fractures are subset
    
    let riskCategory = '';
    let recommendation = '';
    
    if (majorFractureRisk < 10) {
        riskCategory = 'Low Risk';
        recommendation = 'Lifestyle measures: adequate calcium (1000-1200mg/day), vitamin D (800-1000 IU/day), weight-bearing exercise, fall prevention';
    } else if (majorFractureRisk < 20) {
        riskCategory = 'Moderate Risk';
        recommendation = 'Consider treatment. DEXA scan recommended. First-line: Alendronate 70mg weekly or Risedronate 35mg weekly';
    } else {
        riskCategory = 'High Risk';
        recommendation = 'Treatment recommended. Consider bisphosphonates, denosumab, or other anti-osteoporotic therapy. Specialist referral may be needed';
    }
    
    document.getElementById('frax-result').innerHTML = `
        <div class="result-section">
            <h5>FRAX Fracture Risk Results</h5>
            <div class="result-grid">
                <div><strong>BMI:</strong> ${bmi.toFixed(1)} kg/m²</div>
                <div><strong>Risk Factors:</strong> ${riskFactors}/7</div>
                <div><strong>Major Fracture Risk:</strong> ${majorFractureRisk}% (10-year)</div>
                <div><strong>Hip Fracture Risk:</strong> ${hipFractureRisk}% (10-year)</div>
                <div><strong>Risk Category:</strong> ${riskCategory}</div>
            </div>
            <div class="recommendation-section">
                <h6>Management Recommendations:</h6>
                <p>${recommendation}</p>
            </div>
            <div class="alert alert-warning">
                ⚠️ <strong>Important:</strong> This is a simplified calculation. Use official FRAX tool (www.sheffield.ac.uk/FRAX) for clinical decision-making.
            </div>
            <div class="alert alert-info">
                💡 <strong>NICE Thresholds:</strong> Consider treatment if major fracture risk ≥10% or hip fracture risk ≥3%
            </div>
        </div>
    `;
};

// Interactive Features Implementation
MLAQuizApp.prototype.initializeInteractiveFeatures = function() {
    console.log('🔗 Initializing interactive features...');
    
    // Bookmark functionality removed - not used
    
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

// Anion Gap Calculator
MLAQuizApp.prototype.getAnionGapCalculator = function() {
    return `
        <div class="calculator-form">
            <h4>Anion Gap Calculator</h4>
            <p><small>Calculate serum anion gap from basic metabolic panel</small></p>
            
            <div class="calc-input-group">
                <label>Sodium (Na+) mEq/L:</label>
                <input type="number" id="ag-sodium" placeholder="140" step="0.1" min="120" max="160">
                <small>Normal: 136-145 mEq/L</small>
            </div>
            <div class="calc-input-group">
                <label>Chloride (Cl-) mEq/L:</label>
                <input type="number" id="ag-chloride" placeholder="103" step="0.1" min="90" max="120">
                <small>Normal: 98-107 mEq/L</small>
            </div>
            <div class="calc-input-group">
                <label>Bicarbonate (HCO3-) mEq/L:</label>
                <input type="number" id="ag-bicarbonate" placeholder="24" step="0.1" min="10" max="35">
                <small>Normal: 22-28 mEq/L</small>
            </div>
            
            <button onclick="window.quizApp.calculateAnionGap()">Calculate Anion Gap</button>
            <div id="anion-gap-result" class="calc-result"></div>
            
            <div class="calc-reference">
                <h5>Reference Values:</h5>
                <ul>
                    <li><strong>Normal:</strong> 8-12 mEq/L</li>
                    <li><strong>High Anion Gap (>12):</strong> Metabolic acidosis</li>
                    <li><strong>Low Anion Gap (<8):</strong> Rare, check for errors</li>
                </ul>
                <h5>High Anion Gap Causes (MUDPILES):</h5>
                <ul>
                    <li><strong>M</strong>ethanol</li>
                    <li><strong>U</strong>remia</li>
                    <li><strong>D</strong>iabetic ketoacidosis</li>
                    <li><strong>P</strong>aracetamol/Paraldehyde</li>
                    <li><strong>I</strong>soniazid/Iron</li>
                    <li><strong>L</strong>actic acidosis</li>
                    <li><strong>E</strong>thylene glycol</li>
                    <li><strong>S</strong>alicylates</li>
                </ul>
            </div>
        </div>
    `;
};

MLAQuizApp.prototype.calculateAnionGap = function() {
    const sodium = parseFloat(document.getElementById('ag-sodium').value);
    const chloride = parseFloat(document.getElementById('ag-chloride').value);
    const bicarbonate = parseFloat(document.getElementById('ag-bicarbonate').value);
    
    if (!sodium || !chloride || !bicarbonate) {
        document.getElementById('anion-gap-result').innerHTML = '<p class="error">Please enter all values</p>';
        return;
    }
    
    if (sodium < 120 || sodium > 160) {
        document.getElementById('anion-gap-result').innerHTML = '<p class="error">Sodium value seems unrealistic (120-160 mEq/L expected)</p>';
        return;
    }
    
    if (chloride < 90 || chloride > 120) {
        document.getElementById('anion-gap-result').innerHTML = '<p class="error">Chloride value seems unrealistic (90-120 mEq/L expected)</p>';
        return;
    }
    
    if (bicarbonate < 10 || bicarbonate > 35) {
        document.getElementById('anion-gap-result').innerHTML = '<p class="error">Bicarbonate value seems unrealistic (10-35 mEq/L expected)</p>';
        return;
    }
    
    // Calculate anion gap: Na+ - (Cl- + HCO3-)
    const anionGap = sodium - (chloride + bicarbonate);
    
    let interpretation = '';
    let color = '';
    let recommendations = '';
    
    if (anionGap < 8) {
        interpretation = 'Low Anion Gap';
        color = '#2196F3';
        recommendations = `
            <strong>Possible Causes:</strong><br>
            • Laboratory error (most common)<br>
            • Hypoalbuminemia<br>
            • Multiple myeloma<br>
            • Hypercalcemia, hypermagnesemia<br>
            • Lithium intoxication<br>
            <strong>Action:</strong> Recheck labs, consider protein electrophoresis
        `;
    } else if (anionGap >= 8 && anionGap <= 12) {
        interpretation = 'Normal Anion Gap';
        color = '#4CAF50';
        recommendations = `
            <strong>Normal Range:</strong> No metabolic acidosis indicated<br>
            If acidosis present, consider:<br>
            • Normal anion gap metabolic acidosis<br>
            • Diarrhea, ureterosigmoidostomy<br>
            • Renal tubular acidosis<br>
            • Carbonic anhydrase inhibitors
        `;
    } else if (anionGap > 12 && anionGap <= 16) {
        interpretation = 'Mildly Elevated Anion Gap';
        color = '#FF9800';
        recommendations = `
            <strong>Mild Elevation:</strong> Monitor closely<br>
            • Early/mild metabolic acidosis<br>
            • Chronic kidney disease<br>
            • Dehydration<br>
            • Consider arterial blood gas<br>
            <strong>Action:</strong> Check serum lactate, ketones, creatinine
        `;
    } else {
        interpretation = 'High Anion Gap';
        color = '#F44336';
        recommendations = `
            <strong>High Anion Gap Metabolic Acidosis!</strong><br>
            <strong>MUDPILES causes:</strong><br>
            • <strong>Methanol</strong> poisoning<br>
            • <strong>Uremia</strong> (BUN >60)<br>
            • <strong>Diabetic</strong> ketoacidosis<br>
            • <strong>Paracetamol</strong>/Paraldehyde<br>
            • <strong>Isoniazid</strong>/Iron<br>
            • <strong>Lactic</strong> acidosis<br>
            • <strong>Ethylene glycol</strong><br>
            • <strong>Salicylates</strong><br>
            <strong>Urgent:</strong> ABG, lactate, ketones, osmolar gap
        `;
    }
    
    document.getElementById('anion-gap-result').innerHTML = `
        <div class="result-summary">
            <div class="result-value" style="color: ${color}">
                <strong>Anion Gap: ${anionGap.toFixed(1)} mEq/L</strong>
            </div>
            <div class="result-interpretation" style="color: ${color}">
                <strong>${interpretation}</strong>
            </div>
        </div>
        
        <div class="calculation-details">
            <h5>Calculation:</h5>
            <p>Anion Gap = Na<sup>+</sup> - (Cl<sup>-</sup> + HCO<sub>3</sub><sup>-</sup>)</p>
            <p>= ${sodium} - (${chloride} + ${bicarbonate}) = <strong>${anionGap.toFixed(1)} mEq/L</strong></p>
        </div>
        
        <div class="clinical-guidance">
            <h5>Clinical Interpretation:</h5>
            <div style="background-color: rgba(${color === '#F44336' ? '244,67,54' : color === '#FF9800' ? '255,152,0' : color === '#4CAF50' ? '76,175,80' : '33,150,243'}, 0.1); padding: 10px; border-radius: 5px; margin-top: 8px;">
                ${recommendations}
            </div>
        </div>
        
        <div class="additional-info">
            <h5>Additional Considerations:</h5>
            <ul>
                <li><strong>Delta ratio:</strong> If high AG acidosis, check Δ(AG)/Δ(HCO3-) for mixed disorders</li>
                <li><strong>Osmolar gap:</strong> Consider if methanol/ethylene glycol suspected</li>
                <li><strong>Albumin correction:</strong> For every 1 g/dL ↓ albumin, AG ↓ by ~2.5</li>
            </ul>
        </div>
    `;
};
