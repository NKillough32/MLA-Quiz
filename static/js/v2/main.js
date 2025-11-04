/**
 * Main Application Entry Point
 * Initializes all managers and wires up the modular architecture
 */

// Foundation Modules
import { eventBus } from './modules/EventBus.js';
import { storage, storageManager } from './modules/StorageManager.js';
import { orientationManager } from './modules/OrientationManager.js';
import { analytics } from './modules/AnalyticsManager.js';
import { EVENTS, STORAGE_KEYS, UI_CONFIG } from './modules/Constants.js';
import * as UIHelpers from './modules/UIHelpers.js';

// Feature Modules
import { anatomyManager } from './modules/AnatomyManager.js';
import { quizManager } from './modules/QuizManager.js';
import { uiManager } from './modules/UIManager.js';
import { calculatorManager } from './modules/CalculatorManager.js';

// Reference Modules (require external database files)
import { DrugReferenceManager } from './modules/DrugReferenceManager.js';
import { LabValuesManager } from './modules/LabValuesManager.js';
import { GuidelinesManager } from './modules/GuidelinesManager.js';

// Clinical Feature Modules (bridge to V1)
import { differentialDxManager } from './modules/DifferentialDxManager.js';
import { triadsManager } from './modules/TriadsManager.js';
import { examinationManager } from './modules/ExaminationManager.js';
import { emergencyProtocolsManager } from './modules/EmergencyProtocolsManager.js';

// V2 Integration Layer
import { v2Integration } from './modules/V2Integration.js';

/**
 * Main Application Class
 */
class MLAQuizApp {
    constructor() {
        this.initialized = false;
        this.drugManager = new DrugReferenceManager();
        this.labManager = new LabValuesManager();
        this.guidelinesManager = new GuidelinesManager();
        this.v2Integration = v2Integration;
        this.setupEventListeners();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        if (this.initialized) {
            console.warn('App already initialized');
            return;
        }

        console.log('🚀 Initializing MLA Quiz PWA...');

        try {
            // Show loading
            UIHelpers.showLoading('Initializing app...');

            // Initialize managers in order
            await this.initializeManagers();

            // Wire up cross-module communication
            this.setupCrossModuleCommunication();

            // Initialize UI
            await this.initializeUI();

            // Load any saved state
            await this.restoreState();

            this.initialized = true;
            console.log('✅ MLA Quiz PWA initialized successfully');

            // Hide loading
            UIHelpers.hideLoading();

            // Emit ready event
            eventBus.emit(EVENTS.APP_READY);

        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            UIHelpers.hideLoading();
            uiManager.showToast('Failed to initialize app. Please refresh.', 'error');
        }
    }

    /**
     * Initialize all managers
     */
    async initializeManagers() {
        console.log('📦 Initializing managers...');

        // Initialize storage first (needed by others)
        await storageManager.initIndexedDB();

        // Initialize UI manager (theme, settings)
        uiManager.initialize();

        // Initialize orientation manager
        orientationManager.initialize();

        // Initialize anatomy manager
        anatomyManager.initialize();

        // Initialize quiz manager
        quizManager.initialize();

        // Initialize calculator manager (auto-registers all calculators)
        calculatorManager.initialize();

        // Initialize drug reference manager (requires drugDatabase.js to be loaded)
        await this.drugManager.initialize();

        // Initialize lab values manager (requires labDatabase.js to be loaded)
        await this.labManager.initialize();

        // Initialize guidelines manager (requires guidelinesDatabase.js to be loaded)
        await this.guidelinesManager.initialize();

        console.log('✅ All managers initialized');
        console.log(`   - Calculators: ${calculatorManager.getCalculatorCount()}`);
        console.log(`   - Drugs: ${this.drugManager.getDrugCount()}`);
        console.log(`   - Lab panels: ${this.labManager.getPanelCount()}, Tests: ${this.labManager.getTestCount()}`);
        console.log(`   - Guidelines: ${this.guidelinesManager.getGuidelinesCount()}`);
        
        // Initialize V2 Integration Layer (must happen AFTER V1 app exists)
        // This will be called from index.html after V1's app.js loads
        console.log('✅ V2 Integration ready (awaiting V1 app instance)');
    }

    /**
     * Setup cross-module communication
     */
    setupCrossModuleCommunication() {
        console.log('🔗 Setting up cross-module communication...');

        // Calculator button clicks (event delegation on calculator panel)
        const calculatorPanel = document.getElementById('calculator-panel');
        if (calculatorPanel) {
            calculatorPanel.addEventListener('click', (e) => {
                const calcBtn = e.target.closest('.calculator-btn');
                if (calcBtn) {
                    const calcId = calcBtn.getAttribute('data-calc');
                    if (calcId) {
                        console.log(`🧮 Calculator button clicked: ${calcId}`);
                        calculatorManager.loadCalculator(calcId);
                    }
                }
            });
            console.log('✅ Calculator panel event delegation setup');
        }

        // Quiz completion → Show results in UI
        eventBus.on(EVENTS.QUIZ_COMPLETED, (data) => {
            const score = data.score;
            const total = data.totalQuestions;
            const percentage = Math.round((score / total) * 100);
            
            uiManager.showToast(
                `Quiz completed! Score: ${score}/${total} (${percentage}%)`,
                'success'
            );
            
            analytics.vibrateSuccess();
        });

        // Quiz answer → Feedback
        eventBus.on(EVENTS.QUESTION_ANSWERED, (data) => {
            if (data.correct) {
                analytics.vibrateSuccess();
            } else {
                analytics.vibrateError();
            }
        });

        // Anatomy structure clicked → Show info
        eventBus.on(EVENTS.ANATOMY_STRUCTURE_CLICKED, (data) => {
            analytics.vibrateClick();
        });

        // Calculator opened → Track
        eventBus.on(EVENTS.CALCULATOR_OPENED, (data) => {
            console.log(`📊 Calculator opened: ${data.name}`);
            analytics.vibrateClick();
        });

        // Theme changed → Update everywhere
        eventBus.on(EVENTS.THEME_CHANGED, (data) => {
            console.log(`🎨 Theme changed to: ${data.darkMode ? 'dark' : 'light'}`);
        });

        // UI tool switching (for calculators, etc.)
        eventBus.on(EVENTS.UI_SWITCH_TOOL, (data) => {
            console.log(`🔧 Switching to tool: ${data.tool}`);
            this.switchTool(data.tool);
        });

        // Error handling
        eventBus.on(EVENTS.ERROR_OCCURRED, (data) => {
            console.error('Error occurred:', data);
            uiManager.showToast(`Error: ${data.error?.message || 'Unknown error'}`, 'error');
        });

        console.log('✅ Cross-module communication setup complete');
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Service Worker registration
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/static/sw.js')
                    .then(registration => {
                        console.log('✅ Service Worker registered:', registration);
                    })
                    .catch(error => {
                        console.warn('⚠️ Service Worker registration failed:', error);
                    });
            });
        }

        // Online/Offline status
        window.addEventListener('online', () => {
            console.log('🌐 App is online');
            uiManager.showToast('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            console.log('📡 App is offline');
            uiManager.showToast('You are offline. Some features may be limited.', 'warning');
        });

        // Visibility change (tab focus)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('👋 App hidden');
                // Save state when user leaves
                this.saveState();
            } else {
                console.log('👀 App visible');
            }
        });

        // Before unload (save state)
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });
    }

    /**
     * Initialize UI
     */
    async initializeUI() {
        console.log('🎨 Initializing UI...');

        // Setup navigation
        this.setupNavigation();

        // Setup global keyboard shortcuts
        this.setupKeyboardShortcuts();

        console.log('✅ UI initialized');
    }

    /**
     * Setup navigation
     */
    setupNavigation() {
        // Handle browser back button
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.view) {
                uiManager.showView(event.state.view, false);
            }
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + D: Toggle dark mode
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                uiManager.toggleDarkMode();
            }

            // Ctrl/Cmd + F: Focus search (if search exists)
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                const searchInput = document.querySelector('#search-input, .search-input');
                if (searchInput) {
                    e.preventDefault();
                    searchInput.focus();
                }
            }

            // Escape: Close modals
            if (e.key === 'Escape') {
                uiManager.hideModal();
            }
        });
    }

    /**
     * Save application state
     */
    saveState() {
        const state = {
            timestamp: Date.now(),
            theme: uiManager.isDarkMode(),
            fontSize: uiManager.currentFontSize
        };

        storage.setItem(STORAGE_KEYS.APP_STATE, state);
        console.log('💾 App state saved');
    }

    /**
     * Restore application state
     */
    async restoreState() {
        console.log('🔄 Restoring app state...');

        const state = storage.getItem(STORAGE_KEYS.APP_STATE);
        if (state) {
            console.log('✅ Previous state found, restoring...');
            // State already restored by individual managers
        }

        // Check for saved quiz progress
        const quizProgress = await quizManager.loadProgress();
        if (quizProgress) {
            const resume = await uiManager.confirm(
                'You have an unfinished quiz. Would you like to resume?'
            );
            
            if (resume) {
                // Emit event to show quiz view
                eventBus.emit(EVENTS.QUIZ_RESUME_REQUESTED, quizProgress);
            }
        }

        console.log('✅ State restoration complete');
    }

    /**
     * Switch between tools/panels (V1 compatibility method)
     */
    switchTool(toolType) {
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
            'calculator-detail': 'calculator-detail',
            'lab-values': 'lab-panel',
            'guidelines': 'guidelines-panel',
            'differential-dx': 'differential-panel',
            'triads': 'triads-panel',
            'examination': 'examination-panel',
            'emergency-protocols': 'emergency-protocols-panel',
            'interpretation': 'interpretation-panel',
            'anatomy': 'anatomy-panel',
            'ladders': 'ladders-panel'
        };
        
        // Show selected panel
        const panelId = panelIdMap[toolType] || `${toolType}-panel`;
        const targetPanel = document.getElementById(panelId);
        if (targetPanel) {
            targetPanel.classList.add('active');
            console.log(`✅ Switched to panel: ${panelId}`);
        } else {
            console.warn(`⚠️ Panel not found: ${panelId}`);
        }
    }

    /**
     * Get app info
     */
    getInfo() {
        return {
            initialized: this.initialized,
            managers: {
                ui: uiManager.getInfo?.() || 'initialized',
                quiz: quizManager.getStatistics(),
                anatomy: 'initialized',
                calculator: calculatorManager.getStatistics(),
                storage: 'initialized',
                orientation: 'initialized',
                analytics: 'initialized'
            }
        };
    }
}

// Create and export app instance
const app = new MLAQuizApp();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
    app.initialize();
}

// Export for global access if needed
window.MLAQuizApp = app;

// Export managers for backward compatibility with existing app.js
window.eventBus = eventBus;
window.storage = storage;
window.uiManager = uiManager;
window.quizManager = quizManager;
window.anatomyManager = anatomyManager;
window.calculatorManager = calculatorManager;
window.orientationManager = orientationManager;
window.analytics = analytics;
window.drugManager = app.drugManager;
window.labManager = app.labManager;
window.guidelinesManager = app.guidelinesManager;
window.differentialDxManager = differentialDxManager;
window.triadsManager = triadsManager;
window.examinationManager = examinationManager;
window.emergencyProtocolsManager = emergencyProtocolsManager;
window.v2Integration = v2Integration;

// Helper function to initialize V2 integration after V1 app is ready
window.initializeV2Integration = function(v1AppInstance) {
    if (v1AppInstance && window.v2Integration) {
        window.v2Integration.initialize(v1AppInstance);
        console.log('✅ V2 Integration initialized with V1 app');
        
        // Make drugManager, labManager, guidelinesManager available globally
        window.drugReferenceManager = app.drugManager;
        window.labValuesManager = app.labManager;
        window.guidelinesManager = app.guidelinesManager;
        
        return true;
    }
    console.error('❌ Failed to initialize V2 integration - missing V1 app or V2 integration');
    return false;
};

console.log('📦 MLA Quiz PWA modules loaded');

export default app;
