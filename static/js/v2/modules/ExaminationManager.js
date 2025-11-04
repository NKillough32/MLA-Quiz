/**
 * Examination Guide Manager - V2
 * Bridges to V1's examination guides system
 */

import { eventBus } from './EventBus.js';
import { storage } from './StorageManager.js';
import { EVENTS } from './Constants.js';

export class ExaminationManager {
    constructor() {
        this.v1App = null;
        this.initialized = false;
        this.recentExams = [];
    }

    /**
     * Initialize with V1 app reference
     */
    initialize(v1AppInstance) {
        this.v1App = v1AppInstance || window.quizApp;
        this.recentExams = storage.getItem('recentExams', []);
        this.initialized = true;
        console.log('🩺 ExaminationManager initialized (V1 bridge)');
    }

    /**
     * Load examination guide interface
     */
    loadExaminationGuide() {
        if (!this.v1App) {
            console.error('V1 app not available for examination guides');
            return;
        }

        // Bridge to V1's loadExaminationGuide method
        if (typeof this.v1App.loadExaminationGuide === 'function') {
            this.v1App.loadExaminationGuide();
            
            // Emit event for tracking
            eventBus.emit(EVENTS.TOOL_OPENED, {
                tool: 'examination-guides',
                timestamp: Date.now()
            });
        } else {
            console.error('V1 loadExaminationGuide method not found');
        }
    }

    /**
     * Get examination by key
     */
    getExamination(key) {
        if (!this.v1App || !this.v1App.examinationGuides) {
            return null;
        }
        return this.v1App.examinationGuides[key];
    }

    /**
     * Search examinations
     */
    searchExaminations(query) {
        if (!this.v1App || !this.v1App.examinationGuides) {
            return [];
        }

        const term = query.toLowerCase();
        const results = [];

        for (const [key, exam] of Object.entries(this.v1App.examinationGuides)) {
            if (exam.name.toLowerCase().includes(term) ||
                exam.system?.toLowerCase().includes(term) ||
                exam.overview?.toLowerCase().includes(term)) {
                results.push({ key, ...exam });
            }
        }

        return results;
    }

    /**
     * Get all systems
     */
    getSystems() {
        if (!this.v1App || !this.v1App.examinationGuides) {
            return [];
        }

        const systems = new Set();
        for (const exam of Object.values(this.v1App.examinationGuides)) {
            if (exam.system) {
                systems.add(exam.system);
            }
        }
        return Array.from(systems).sort();
    }

    /**
     * Get examinations by system
     */
    getExaminationsBySystem(system) {
        if (!this.v1App || !this.v1App.examinationGuides) {
            return [];
        }

        return Object.entries(this.v1App.examinationGuides)
            .filter(([key, exam]) => exam.system === system)
            .map(([key, exam]) => ({ key, ...exam }));
    }

    /**
     * Add to recent
     */
    addToRecent(examKey) {
        if (!this.recentExams.includes(examKey)) {
            this.recentExams.unshift(examKey);
            this.recentExams = this.recentExams.slice(0, 10); // Keep last 10
            storage.setItem('recentExams', this.recentExams);
        }
    }

    /**
     * Get statistics
     */
    getStatistics() {
        if (!this.v1App || !this.v1App.examinationGuides) {
            return { total: 0, systems: {} };
        }

        const systems = {};
        for (const exam of Object.values(this.v1App.examinationGuides)) {
            const sys = exam.system || 'Other';
            systems[sys] = (systems[sys] || 0) + 1;
        }

        return {
            total: Object.keys(this.v1App.examinationGuides).length,
            systems,
            recentCount: this.recentExams.length
        };
    }
}

// Export singleton instance
export const examinationManager = new ExaminationManager();
export default ExaminationManager;
