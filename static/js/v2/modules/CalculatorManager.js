/**
 * Calculator Manager - Registry and management for medical calculators
 */

import { eventBus } from './EventBus.js';
import { storage } from './StorageManager.js';
import { analytics } from './AnalyticsManager.js';
import { EVENTS, STORAGE_KEYS, CALCULATOR_TYPES, TOOL_CATEGORIES } from './Constants.js';
import { calculatorRegistry } from './calculators/CalculatorRegistry.js';

export class CalculatorManager {
    constructor() {
        this.calculators = new Map();
        this.currentCalculator = null;
        this.recentTools = [];
        this.toolNotes = {};
    }

    /**
     * Initialize calculator manager and auto-register all calculators
     */
    initialize() {
        // Load saved data
        this.recentTools = storage.getItem(STORAGE_KEYS.RECENT_TOOLS, []);
        this.toolNotes = storage.getItem(STORAGE_KEYS.TOOL_NOTES, {});
        
        // Auto-register all calculators from registry
        this.registerAllCalculators();
        
        console.log(`🧮 Calculator Manager initialized with ${this.calculators.size} calculators`);
    }
    
    /**
     * Auto-register all calculators from the registry
     */
    registerAllCalculators() {
        Object.entries(calculatorRegistry).forEach(([id, config]) => {
            this.registerCalculator(id, config);
        });
    }

    /**
     * Register a calculator
     */
    registerCalculator(id, config) {
        const calculator = {
            id,
            name: config.name,
            category: config.category || TOOL_CATEGORIES.OTHER,
            description: config.description || '',
            keywords: config.keywords || [],
            getTemplate: config.getTemplate,
            calculate: config.calculate,
            bindEvents: config.bindEvents,
            metadata: config.metadata || {}
        };

        this.calculators.set(id, calculator);
        
        return calculator;
    }
    
    /**
     * Load calculator into detail view
     */
    loadCalculator(calculatorId) {
        const calculator = this.getCalculator(calculatorId);
        if (!calculator) {
            console.error(`Calculator not found: ${calculatorId}`);
            return false;
        }

        try {
            // Switch to calculator detail panel first
            eventBus.emit(EVENTS.UI_SWITCH_TOOL, { tool: 'calculator-detail' });
            
            // Get container
            const container = document.getElementById('calculator-detail-container');
            if (!container) {
                console.error('Calculator detail container not found');
                return false;
            }

            // Build header with back button
            const headerHtml = `
                <div class="calculator-header">
                    <button class="back-btn" id="calc-back-btn">← Back to Calculators</button>
                    <h3>${calculator.name}</h3>
                </div>
                <div class="calculator-content">
                    ${calculator.getTemplate()}
                </div>
            `;

            container.innerHTML = headerHtml;

            // Bind back button
            const backBtn = document.getElementById('calc-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    eventBus.emit(EVENTS.UI_SWITCH_TOOL, { tool: 'calculators' });
                });
            }

            // Bind calculator events
            if (calculator.bindEvents) {
                calculator.bindEvents();
            }

            // Set as current calculator
            this.currentCalculator = calculator;

            // Add to recent
            this.addToRecent(calculatorId);

            // Track usage
            analytics.trackCalculatorUse(calculator.name);

            // Emit event
            eventBus.emit(EVENTS.CALCULATOR_OPENED, { 
                id: calculatorId, 
                name: calculator.name 
            });

            // Switch to detail view
            eventBus.emit(EVENTS.UI_SWITCH_TOOL, { tool: 'calculator-detail' });

            console.log(`🧮 Loaded calculator: ${calculator.name}`);
            return true;

        } catch (error) {
            console.error('Error loading calculator:', error);
            return false;
        }
    }

    /**
     * Render calculator HTML into a container
     */
    renderCalculator(calculatorId, containerId) {
        const calculator = this.getCalculator(calculatorId);
        const container = typeof containerId === 'string' 
            ? document.getElementById(containerId) 
            : containerId;
            
        if (!calculator || !container) {
            console.error('Calculator or container not found');
            return false;
        }
        
        try {
            // Render HTML using getTemplate
            const html = calculator.getTemplate();
            container.innerHTML = html;
            
            // Bind calculator events
            if (calculator.bindEvents) {
                calculator.bindEvents();
            }
            
            return true;
        } catch (error) {
            console.error('Error rendering calculator:', error);
            return false;
        }
    }
    
    /**
     * Execute calculation for a calculator
     */
    executeCalculation(calculatorId) {
        const calculator = this.getCalculator(calculatorId);
        if (!calculator) {
            console.error(`Calculator not found: ${calculatorId}`);
            return null;
        }
        
        try {
            const result = calculator.calculate();
            
            // Emit event
            eventBus.emit(EVENTS.CALCULATOR_CALCULATED, {
                id: calculator.id,
                name: calculator.name,
                result
            });
            
            // Vibration feedback
            if (result && !result.error) {
                analytics.vibrateSuccess();
            } else if (result && result.error) {
                analytics.vibrateError();
            }
            
            return result;
        } catch (error) {
            console.error('Calculation error:', error);
            eventBus.emit(EVENTS.ERROR_OCCURRED, { 
                type: 'calculator', 
                calculator: calculatorId,
                error 
            });
            analytics.vibrateError();
            return null;
        }
    }

    /**
     * Unregister a calculator
     */
    unregisterCalculator(id) {
        const deleted = this.calculators.delete(id);
        if (deleted) {
            console.log(`🗑️ Unregistered calculator: ${id}`);
        }
        return deleted;
    }

    /**
     * Get calculator by ID
     */
    getCalculator(id) {
        return this.calculators.get(id);
    }

    /**
     * Get all calculators
     */
    getAllCalculators() {
        return Array.from(this.calculators.values());
    }

    /**
     * Get calculators by category
     */
    getCalculatorsByCategory(category) {
        return this.getAllCalculators().filter(calc => calc.category === category);
    }

    /**
     * Open calculator
     */
    openCalculator(id) {
        const calculator = this.getCalculator(id);
        if (!calculator) {
            console.error(`Calculator not found: ${id}`);
            return null;
        }

        this.currentCalculator = calculator;
        
        // Add to recent tools (max 10)
        this.addToRecent(id);
        
        // Track usage
        analytics.trackCalculatorUse(calculator.name);
        
        // Emit event
        eventBus.emit(EVENTS.CALCULATOR_OPENED, { id, name: calculator.name });
        
        console.log(`📊 Opened calculator: ${calculator.name}`);
        
        return calculator;
    }

    /**
     * Calculate using current calculator
     */
    calculate(inputs) {
        if (!this.currentCalculator) {
            console.error('No calculator is currently open');
            return null;
        }

        const calculator = this.currentCalculator;
        
        try {
            // New calculators don't take inputs, they read from DOM
            const result = calculator.calculate();
            
            // Emit event
            eventBus.emit(EVENTS.CALCULATOR_CALCULATED, {
                id: calculator.id,
                name: calculator.name,
                result
            });
            
            return result;
        } catch (error) {
            console.error('Calculation error:', error);
            eventBus.emit(EVENTS.ERROR_OCCURRED, { 
                type: 'calculator', 
                calculator: calculator.id,
                error 
            });
            return null;
        }
    }

    /**
     * Add calculator to recent list
     */
    addToRecent(id) {
        // Remove if already in list
        const index = this.recentTools.indexOf(id);
        if (index > -1) {
            this.recentTools.splice(index, 1);
        }

        // Add to beginning
        this.recentTools.unshift(id);

        // Keep max 10 recent
        if (this.recentTools.length > 10) {
            this.recentTools = this.recentTools.slice(0, 10);
        }

        // Save to storage
        storage.setItem(STORAGE_KEYS.RECENT_TOOLS, this.recentTools);
    }

    /**
     * Get recent calculators
     */
    getRecentCalculators() {
        return this.recentTools
            .map(id => this.getCalculator(id))
            .filter(calc => calc !== undefined);
    }

    /**
     * Clear recent calculators
     */
    clearRecent() {
        this.recentTools = [];
        storage.removeItem(STORAGE_KEYS.RECENT_TOOLS);
        console.log('🗑️ Recent calculators cleared');
    }

    /**
     * Add note to calculator
     */
    addNote(calculatorId, note) {
        if (!this.toolNotes[calculatorId]) {
            this.toolNotes[calculatorId] = [];
        }

        this.toolNotes[calculatorId].push({
            text: note,
            timestamp: Date.now()
        });

        storage.setItem(STORAGE_KEYS.TOOL_NOTES, this.toolNotes);
        console.log(`📝 Note added to calculator: ${calculatorId}`);
    }

    /**
     * Get notes for calculator
     */
    getNotes(calculatorId) {
        return this.toolNotes[calculatorId] || [];
    }

    /**
     * Delete note
     */
    deleteNote(calculatorId, index) {
        if (this.toolNotes[calculatorId] && this.toolNotes[calculatorId][index]) {
            this.toolNotes[calculatorId].splice(index, 1);
            storage.setItem(STORAGE_KEYS.TOOL_NOTES, this.toolNotes);
            console.log(`🗑️ Note deleted from calculator: ${calculatorId}`);
            return true;
        }
        return false;
    }

    /**
     * Clear all notes for a calculator
     */
    clearNotes(calculatorId) {
        if (this.toolNotes[calculatorId]) {
            delete this.toolNotes[calculatorId];
            storage.setItem(STORAGE_KEYS.TOOL_NOTES, this.toolNotes);
            console.log(`🗑️ All notes cleared for calculator: ${calculatorId}`);
            return true;
        }
        return false;
    }

    /**
     * Search calculators
     */
    searchCalculators(query) {
        const q = query.toLowerCase();
        return this.getAllCalculators().filter(calc => {
            return calc.name.toLowerCase().includes(q) ||
                   calc.description.toLowerCase().includes(q) ||
                   calc.category.toLowerCase().includes(q);
        });
    }

    /**
     * Get calculator categories
     */
    getCategories() {
        const categories = new Set();
        this.getAllCalculators().forEach(calc => {
            categories.add(calc.category);
        });
        return Array.from(categories).sort();
    }

    /**
     * Get calculator count
     */
    getCalculatorCount() {
        return this.calculators.size;
    }

    /**
     * Get calculator count by category
     */
    getCategoryCount(category) {
        return this.getCalculatorsByCategory(category).length;
    }

    /**
     * Check if calculator exists
     */
    hasCalculator(id) {
        return this.calculators.has(id);
    }

    /**
     * Get current calculator
     */
    getCurrentCalculator() {
        return this.currentCalculator;
    }

    /**
     * Close current calculator
     */
    closeCalculator() {
        const previousCalculator = this.currentCalculator;
        this.currentCalculator = null;
        
        if (previousCalculator) {
            console.log(`📊 Closed calculator: ${previousCalculator.name}`);
        }
        
        return previousCalculator;
    }

    /**
     * Export calculator history (for analysis)
     */
    exportHistory() {
        return {
            recent: this.recentTools,
            notes: this.toolNotes,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import calculator history
     */
    importHistory(data) {
        if (data.recent) {
            this.recentTools = data.recent;
            storage.setItem(STORAGE_KEYS.RECENT_TOOLS, this.recentTools);
        }
        
        if (data.notes) {
            this.toolNotes = data.notes;
            storage.setItem(STORAGE_KEYS.TOOL_NOTES, this.toolNotes);
        }
        
        console.log('📥 Calculator history imported');
    }

    /**
     * Get calculator statistics
     */
    getStatistics() {
        return {
            totalCalculators: this.getCalculatorCount(),
            categories: this.getCategories().length,
            recentCount: this.recentTools.length,
            notesCount: Object.keys(this.toolNotes).length,
            totalNotes: Object.values(this.toolNotes).reduce((sum, notes) => sum + notes.length, 0)
        };
    }

    /**
     * Validate inputs for calculator
     */
    validateInputs(calculatorId, inputs) {
        const calculator = this.getCalculator(calculatorId);
        if (!calculator) {
            return { valid: false, error: 'Calculator not found' };
        }

        // If calculator has custom validation
        if (calculator.metadata.validate) {
            return calculator.metadata.validate(inputs);
        }

        // Basic validation - check all required inputs exist
        if (calculator.metadata.requiredInputs) {
            for (const input of calculator.metadata.requiredInputs) {
                if (inputs[input] === undefined || inputs[input] === null || inputs[input] === '') {
                    return { valid: false, error: `Missing required input: ${input}` };
                }
            }
        }

        return { valid: true };
    }
}

// Export singleton instance
export const calculatorManager = new CalculatorManager();
