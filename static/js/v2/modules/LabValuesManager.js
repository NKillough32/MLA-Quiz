/**
 * Lab Values Manager
 * Manages lab values database, panels, reference ranges, and search
 */

import { EventBus } from './EventBus.js';
import { StorageManager } from './StorageManager.js';

export class LabValuesManager {
    constructor() {
        this.eventBus = EventBus.getInstance();
        this.storage = StorageManager.getInstance();
        this.labDatabase = null;
        this.recentLabs = [];
    }

    async initialize() {
        console.log('🧪 Initializing LabValuesManager...');
        
        // Load lab database from window.labDatabase (loaded from labDatabase.js)
        if (typeof window.labDatabase !== 'undefined') {
            this.labDatabase = window.labDatabase;
            console.log(`✅ Lab database loaded: ${Object.keys(this.labDatabase).length} panels`);
        } else {
            console.error('❌ Lab database not loaded. Ensure labDatabase.js is included before modules.');
            return;
        }

        // Load recent labs from storage
        this.recentLabs = await this.storage.get('recentLabs') || [];
        
        const totalTests = Object.values(this.labDatabase).reduce((sum, panel) => 
            sum + Object.keys(panel.values).length, 0
        );
        
        this.eventBus.emit('LAB_MANAGER_READY', { 
            panelCount: Object.keys(this.labDatabase).length,
            testCount: totalTests
        });
    }

    /**
     * Search labs by panel name or test name
     */
    searchLabs(query) {
        if (!this.labDatabase) return [];
        
        const lowerQuery = query.toLowerCase().trim();
        if (lowerQuery.length < 2) return [];

        const matches = [];
        
        // Search through all panels and tests
        Object.entries(this.labDatabase).forEach(([panelKey, panel]) => {
            // Check if panel name matches
            if (panel.name.toLowerCase().includes(lowerQuery)) {
                matches.push({
                    type: 'panel',
                    key: panelKey,
                    name: panel.name,
                    testCount: Object.keys(panel.values).length
                });
            }
            
            // Check if any test within panel matches
            Object.entries(panel.values).forEach(([testKey, test]) => {
                if (testKey.toLowerCase().includes(lowerQuery)) {
                    matches.push({
                        type: 'test',
                        panelKey,
                        panelName: panel.name,
                        testKey,
                        testName: testKey,
                        normal: test.normal
                    });
                }
            });
        });

        this.eventBus.emit('LAB_SEARCHED', { query, resultCount: matches.length });
        
        return matches;
    }

    /**
     * Get all lab panels
     */
    getPanels() {
        if (!this.labDatabase) return [];
        
        return Object.entries(this.labDatabase).map(([key, panel]) => ({
            key,
            name: panel.name,
            testCount: Object.keys(panel.values).length
        }));
    }

    /**
     * Get a specific panel with all its tests
     */
    getPanel(panelKey) {
        if (!this.labDatabase || !this.labDatabase[panelKey]) return null;
        
        const panel = this.labDatabase[panelKey];
        
        // Add to recent
        this.addToRecent({ type: 'panel', key: panelKey });
        
        this.eventBus.emit('LAB_PANEL_VIEWED', { panelKey, panelName: panel.name });
        
        return {
            key: panelKey,
            name: panel.name,
            tests: Object.entries(panel.values).map(([testKey, test]) => ({
                key: testKey,
                ...test
            }))
        };
    }

    /**
     * Get a specific test
     */
    getTest(panelKey, testKey) {
        if (!this.labDatabase || !this.labDatabase[panelKey] || 
            !this.labDatabase[panelKey].values[testKey]) return null;
        
        const panel = this.labDatabase[panelKey];
        const test = panel.values[testKey];
        
        // Add to recent
        this.addToRecent({ type: 'test', panelKey, testKey });
        
        this.eventBus.emit('LAB_TEST_VIEWED', { panelKey, testKey });
        
        return {
            panelKey,
            panelName: panel.name,
            testKey,
            ...test
        };
    }

    /**
     * Add lab to recent history
     */
    async addToRecent(item) {
        // Create unique identifier
        const identifier = item.type === 'panel' 
            ? `panel:${item.key}` 
            : `test:${item.panelKey}:${item.testKey}`;
        
        // Remove if already exists
        this.recentLabs = this.recentLabs.filter(lab => 
            (lab.type === 'panel' ? `panel:${lab.key}` : `test:${lab.panelKey}:${lab.testKey}`) !== identifier
        );
        
        // Add to front
        this.recentLabs.unshift(item);
        
        // Keep only last 10
        this.recentLabs = this.recentLabs.slice(0, 10);
        
        await this.storage.set('recentLabs', this.recentLabs);
    }

    /**
     * Get recent labs
     */
    getRecentLabs() {
        return this.recentLabs.map(item => {
            if (item.type === 'panel') {
                const panel = this.labDatabase[item.key];
                return panel ? { type: 'panel', key: item.key, name: panel.name } : null;
            } else {
                const panel = this.labDatabase[item.panelKey];
                const test = panel?.values[item.testKey];
                return panel && test ? {
                    type: 'test',
                    panelKey: item.panelKey,
                    panelName: panel.name,
                    testKey: item.testKey,
                    testName: item.testKey
                } : null;
            }
        }).filter(item => item !== null);
    }

    /**
     * Get lab categories
     */
    getCategories() {
        return [
            { id: 'all', name: 'All Panels', icon: '🧪' },
            { id: 'common', name: 'Common Tests', icon: '⭐', 
              panels: ['cbc', 'bmp', 'lft'] },
            { id: 'cardiac', name: 'Cardiac', icon: '❤️', 
              panels: ['cardiac_markers', 'lipids'] },
            { id: 'metabolic', name: 'Metabolic', icon: '⚗️', 
              panels: ['bmp', 'thyroid', 'endocrine'] },
            { id: 'hematology', name: 'Hematology', icon: '🩸', 
              panels: ['cbc', 'coagulation', 'hematology_additional'] }
        ];
    }

    /**
     * Get panels by category
     */
    getPanelsByCategory(categoryId) {
        const category = this.getCategories().find(cat => cat.id === categoryId);
        
        if (categoryId === 'all' || !category) {
            return this.getPanels();
        }
        
        if (category.panels) {
            return category.panels
                .map(panelKey => {
                    const panel = this.labDatabase[panelKey];
                    return panel ? {
                        key: panelKey,
                        name: panel.name,
                        testCount: Object.keys(panel.values).length
                    } : null;
                })
                .filter(panel => panel !== null);
        }
        
        return [];
    }

    /**
     * Get panel count
     */
    getPanelCount() {
        return this.labDatabase ? Object.keys(this.labDatabase).length : 0;
    }

    /**
     * Get total test count
     */
    getTestCount() {
        if (!this.labDatabase) return 0;
        return Object.values(this.labDatabase).reduce((sum, panel) => 
            sum + Object.keys(panel.values).length, 0
        );
    }

    /**
     * Get statistics
     */
    getStatistics() {
        return {
            totalPanels: this.getPanelCount(),
            totalTests: this.getTestCount(),
            totalViews: this.recentPanels.length,
            initialized: this.initialized
        };
    }

    /**
     * Interpret lab value (check if abnormal)
     */
    interpretValue(panelKey, testKey, value) {
        const test = this.getTest(panelKey, testKey);
        if (!test) return null;
        
        // This is a simplified interpretation
        // Real implementation would need to parse the 'normal' range string
        // and compare with the value
        
        return {
            value,
            normal: test.normal,
            interpretation: 'See normal range for interpretation',
            clinicalSignificance: test.clinicalSignificance
        };
    }
}

export default LabValuesManager;
