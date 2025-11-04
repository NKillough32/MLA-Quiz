/**
 * Clinical Triads Manager - V2
 * Bridges to V1's clinical triads database
 */

import { eventBus } from './EventBus.js';
import { storage } from './StorageManager.js';
import { EVENTS } from './Constants.js';

export class TriadsManager {
    constructor() {
        this.v1App = null;
        this.initialized = false;
        this.recentTriads = [];
    }

    /**
     * Initialize with V1 app reference
     */
    initialize(v1AppInstance) {
        this.v1App = v1AppInstance || window.quizApp;
        this.recentTriads = storage.getItem('recentTriads', []);
        this.initialized = true;
        console.log('🔺 TriadsManager initialized (V1 bridge)');
    }

    /**
     * Load triads interface
     */
    loadTriads() {
        if (!this.v1App) {
            console.error('V1 app not available for triads');
            return;
        }

        // Bridge to V1's loadTriads method
        if (typeof this.v1App.loadTriads === 'function') {
            this.v1App.loadTriads();
            
            // Emit event for tracking
            eventBus.emit(EVENTS.TOOL_OPENED, {
                tool: 'clinical-triads',
                timestamp: Date.now()
            });
        } else {
            console.error('V1 loadTriads method not found');
        }
    }

    /**
     * Get triad by key
     */
    getTriad(key) {
        if (!this.v1App || !this.v1App.clinicalTriads) {
            return null;
        }
        return this.v1App.clinicalTriads[key];
    }

    /**
     * Search triads
     */
    searchTriads(query) {
        if (!this.v1App || !this.v1App.clinicalTriads) {
            return [];
        }

        const term = query.toLowerCase();
        const results = [];

        for (const [key, triad] of Object.entries(this.v1App.clinicalTriads)) {
            if (triad.name.toLowerCase().includes(term) ||
                triad.condition.toLowerCase().includes(term) ||
                triad.components?.some(c => c.toLowerCase().includes(term)) ||
                triad.category?.toLowerCase().includes(term)) {
                results.push({ key, ...triad });
            }
        }

        return results;
    }

    /**
     * Get all categories
     */
    getCategories() {
        if (!this.v1App || !this.v1App.clinicalTriads) {
            return [];
        }

        const categories = new Set();
        for (const triad of Object.values(this.v1App.clinicalTriads)) {
            if (triad.category) {
                categories.add(triad.category);
            }
        }
        return Array.from(categories).sort();
    }

    /**
     * Get triads by category
     */
    getTriadsByCategory(category) {
        if (!this.v1App || !this.v1App.clinicalTriads) {
            return [];
        }

        return Object.entries(this.v1App.clinicalTriads)
            .filter(([key, triad]) => triad.category === category)
            .map(([key, triad]) => ({ key, ...triad }));
    }

    /**
     * Get triads by urgency
     */
    getTriadsByUrgency(urgency) {
        if (!this.v1App || !this.v1App.clinicalTriads) {
            return [];
        }

        return Object.entries(this.v1App.clinicalTriads)
            .filter(([key, triad]) => triad.urgency === urgency)
            .map(([key, triad]) => ({ key, ...triad }));
    }

    /**
     * Add to recent
     */
    addToRecent(triadKey) {
        if (!this.recentTriads.includes(triadKey)) {
            this.recentTriads.unshift(triadKey);
            this.recentTriads = this.recentTriads.slice(0, 10); // Keep last 10
            storage.setItem('recentTriads', this.recentTriads);
        }
    }

    /**
     * Get statistics
     */
    getStatistics() {
        if (!this.v1App || !this.v1App.clinicalTriads) {
            return { total: 0, categories: {}, urgencies: {} };
        }

        const categories = {};
        const urgencies = {};

        for (const triad of Object.values(this.v1App.clinicalTriads)) {
            const cat = triad.category || 'Other';
            const urg = triad.urgency || 'standard';
            
            categories[cat] = (categories[cat] || 0) + 1;
            urgencies[urg] = (urgencies[urg] || 0) + 1;
        }

        return {
            total: Object.keys(this.v1App.clinicalTriads).length,
            categories,
            urgencies,
            recentCount: this.recentTriads.length
        };
    }
}

// Export singleton instance
export const triadsManager = new TriadsManager();
export default TriadsManager;
