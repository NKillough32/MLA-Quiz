/**
 * Differential Diagnosis Manager - V2
 * Bridges to V1's differential diagnosis system
 */

import { eventBus } from './EventBus.js';
import { storage } from './StorageManager.js';
import { EVENTS } from './Constants.js';

export class DifferentialDxManager {
    constructor() {
        this.v1App = null;
        this.initialized = false;
    }

    /**
     * Initialize with V1 app reference
     */
    initialize(v1AppInstance) {
        this.v1App = v1AppInstance || window.quizApp;
        this.initialized = true;
        console.log('🔬 DifferentialDxManager initialized (V1 bridge)');
    }

    /**
     * Load differential diagnosis interface
     */
    loadDifferentialDx() {
        if (!this.v1App) {
            console.error('V1 app not available for differential diagnosis');
            return;
        }

        // Bridge to V1's loadDifferentialDx method
        if (typeof this.v1App.loadDifferentialDx === 'function') {
            this.v1App.loadDifferentialDx();
            
            // Emit event for tracking
            eventBus.emit(EVENTS.TOOL_OPENED, {
                tool: 'differential-diagnosis',
                timestamp: Date.now()
            });
        } else {
            console.error('V1 loadDifferentialDx method not found');
        }
    }

    /**
     * Search differential diagnoses
     */
    searchDifferentials(query) {
        if (!this.v1App || !this.v1App.ddxDatabase) {
            return [];
        }

        const term = query.toLowerCase();
        const results = [];

        for (const [key, ddx] of Object.entries(this.v1App.ddxDatabase)) {
            if (ddx.condition.toLowerCase().includes(term) ||
                ddx.symptoms?.some(s => s.toLowerCase().includes(term)) ||
                ddx.category?.toLowerCase().includes(term)) {
                results.push({ key, ...ddx });
            }
        }

        return results;
    }

    /**
     * Get differential by key
     */
    getDifferential(key) {
        if (!this.v1App || !this.v1App.ddxDatabase) {
            return null;
        }
        return this.v1App.ddxDatabase[key];
    }

    /**
     * Get all categories
     */
    getCategories() {
        if (!this.v1App || !this.v1App.ddxDatabase) {
            return [];
        }

        const categories = new Set();
        for (const ddx of Object.values(this.v1App.ddxDatabase)) {
            if (ddx.category) {
                categories.add(ddx.category);
            }
        }
        return Array.from(categories).sort();
    }

    /**
     * Get differentials by category
     */
    getDifferentialsByCategory(category) {
        if (!this.v1App || !this.v1App.ddxDatabase) {
            return [];
        }

        return Object.entries(this.v1App.ddxDatabase)
            .filter(([key, ddx]) => ddx.category === category)
            .map(([key, ddx]) => ({ key, ...ddx }));
    }

    /**
     * Get statistics
     */
    getStatistics() {
        if (!this.v1App || !this.v1App.ddxDatabase) {
            return { total: 0, categories: {} };
        }

        const categories = {};
        for (const ddx of Object.values(this.v1App.ddxDatabase)) {
            const cat = ddx.category || 'Other';
            categories[cat] = (categories[cat] || 0) + 1;
        }

        return {
            total: Object.keys(this.v1App.ddxDatabase).length,
            categories
        };
    }
}

// Export singleton instance
export const differentialDxManager = new DifferentialDxManager();
export default DifferentialDxManager;
