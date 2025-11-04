/**
 * GuidelinesManager - Clinical Guidelines Reference System
 * Manages NICE and specialty clinical guidelines
 */

import { EventBus } from './EventBus.js';
import { StorageManager } from './StorageManager.js';

export class GuidelinesManager {
    constructor() {
        this.guidelinesDatabase = null;
        this.recentGuidelines = [];
        this.maxRecent = 10;
    }

    /**
     * Initialize the guidelines manager
     * Loads the external guidelines database
     */
    async initialize() {
        try {
            // Check if guidelines database is loaded
            if (!window.guidelinesDatabase) {
                console.error('❌ Guidelines database not loaded. Ensure guidelinesDatabase.js is included before modules.');
                return false;
            }

            this.guidelinesDatabase = window.guidelinesDatabase;
            
            // Load recent guidelines from storage
            const stored = await StorageManager.get('recentGuidelines');
            if (stored) {
                this.recentGuidelines = stored;
            }

            console.log('✅ GuidelinesManager initialized with', Object.keys(this.guidelinesDatabase).length, 'guidelines');
            EventBus.emit('GUIDELINES_MANAGER_READY', {
                count: Object.keys(this.guidelinesDatabase).length,
                categories: this.getCategories()
            });

            return true;
        } catch (error) {
            console.error('❌ Failed to initialize GuidelinesManager:', error);
            return false;
        }
    }

    /**
     * Search guidelines by title, category, or content
     * @param {string} query - Search query
     * @returns {Array} Matching guidelines
     */
    searchGuidelines(query) {
        if (!query || query.length < 2) {
            return [];
        }

        const searchTerm = query.toLowerCase();
        const results = [];

        for (const [key, guideline] of Object.entries(this.guidelinesDatabase)) {
            // Search in title, category, and key
            if (guideline.title.toLowerCase().includes(searchTerm) ||
                guideline.category.toLowerCase().includes(searchTerm) ||
                key.toLowerCase().includes(searchTerm) ||
                guideline.organisation?.toLowerCase().includes(searchTerm)) {
                results.push({
                    key: key,
                    title: guideline.title,
                    category: guideline.category,
                    organisation: guideline.organisation,
                    lastUpdated: guideline.lastUpdated
                });
            }
        }

        EventBus.emit('GUIDELINES_SEARCHED', {
            query: query,
            resultsCount: results.length
        });

        return results;
    }

    /**
     * Get all available categories
     * @returns {Array} List of categories with icons
     */
    getCategories() {
        const categories = [
            { id: 'all', name: 'All Guidelines', icon: '📋', count: Object.keys(this.guidelinesDatabase).length },
            { id: 'cardiovascular', name: 'Cardiovascular', icon: '❤️', count: 0 },
            { id: 'pulmonary', name: 'Pulmonary', icon: '🫁', count: 0 },
            { id: 'endocrine', name: 'Endocrine', icon: '🩺', count: 0 },
            { id: 'renal', name: 'Renal', icon: '🫘', count: 0 },
            { id: 'rheumatologic', name: 'Rheumatology', icon: '🦴', count: 0 },
            { id: 'hematologic', name: 'Haematology', icon: '🩸', count: 0 },
            { id: 'emergency', name: 'Emergency', icon: '🚨', count: 0 },
            { id: 'mental-health', name: 'Mental Health', icon: '🧠', count: 0 },
            { id: 'neurological', name: 'Neurological', icon: '🧬', count: 0 },
            { id: 'infectious-diseases', name: 'Infectious Diseases', icon: '🦠', count: 0 }
        ];

        // Count guidelines in each category
        for (const guideline of Object.values(this.guidelinesDatabase)) {
            const category = categories.find(c => c.id === guideline.category);
            if (category) {
                category.count++;
            }
        }

        return categories.filter(c => c.id === 'all' || c.count > 0);
    }

    /**
     * Get all guidelines in a category
     * @param {string} categoryId - Category ID
     * @returns {Array} Guidelines in category
     */
    getGuidelinesByCategory(categoryId) {
        if (categoryId === 'all') {
            return Object.entries(this.guidelinesDatabase).map(([key, guideline]) => ({
                key: key,
                ...guideline
            }));
        }

        return Object.entries(this.guidelinesDatabase)
            .filter(([_, guideline]) => guideline.category === categoryId)
            .map(([key, guideline]) => ({
                key: key,
                ...guideline
            }));
    }

    /**
     * Get a specific guideline by key
     * @param {string} guidelineKey - Guideline key
     * @returns {Object} Guideline details
     */
    getGuideline(guidelineKey) {
        const guideline = this.guidelinesDatabase[guidelineKey];
        
        if (guideline) {
            // Add to recent
            this.addToRecent(guidelineKey, guideline.title);
            
            EventBus.emit('GUIDELINE_VIEWED', {
                key: guidelineKey,
                title: guideline.title,
                category: guideline.category
            });

            return {
                key: guidelineKey,
                ...guideline
            };
        }

        return null;
    }

    /**
     * Add guideline to recent list
     * @param {string} key - Guideline key
     * @param {string} title - Guideline title
     */
    async addToRecent(key, title) {
        // Remove if already exists
        this.recentGuidelines = this.recentGuidelines.filter(g => g.key !== key);
        
        // Add to beginning
        this.recentGuidelines.unshift({
            key: key,
            title: title,
            timestamp: Date.now()
        });

        // Keep only last maxRecent
        if (this.recentGuidelines.length > this.maxRecent) {
            this.recentGuidelines = this.recentGuidelines.slice(0, this.maxRecent);
        }

        // Save to storage
        await StorageManager.set('recentGuidelines', this.recentGuidelines);
    }

    /**
     * Get recent guidelines
     * @returns {Array} Recent guidelines
     */
    getRecentGuidelines() {
        return this.recentGuidelines.map(recent => {
            const guideline = this.guidelinesDatabase[recent.key];
            return {
                key: recent.key,
                title: recent.title,
                category: guideline?.category,
                timestamp: recent.timestamp
            };
        });
    }

    /**
     * Get statistics about guidelines database
     * @returns {Object} Statistics
     */
    getStatistics() {
        const categories = {};
        const organisations = {};

        for (const guideline of Object.values(this.guidelinesDatabase)) {
            // Count by category
            categories[guideline.category] = (categories[guideline.category] || 0) + 1;
            
            // Count by organisation
            if (guideline.organisation) {
                organisations[guideline.organisation] = (organisations[guideline.organisation] || 0) + 1;
            }
        }

        return {
            total: Object.keys(this.guidelinesDatabase).length,
            categories: categories,
            organisations: organisations,
            recentCount: this.recentGuidelines.length
        };
    }

    /**
     * Get guidelines count
     * @returns {number} Total guidelines count
     */
    getGuidelinesCount() {
        return Object.keys(this.guidelinesDatabase).length;
    }

    /**
     * Format guideline for display
     * @param {string} key - Guideline key
     * @returns {string} Formatted HTML
     */
    formatGuidelineDetail(key) {
        const guideline = this.getGuideline(key);
        if (!guideline) {
            return '<p>Guideline not found</p>';
        }

        let html = `
            <div class="guideline-detail">
                <h3>${guideline.title}</h3>
                <div class="guideline-meta">
                    <span class="evidence-level">📋 ${guideline.evidenceLevel || 'Evidence-based'}</span>
                    <span class="last-updated">🗓️ ${guideline.lastUpdated || 'Recent'}</span>
                    <span class="organisation">🏥 ${guideline.organisation || 'Clinical Guideline'}</span>
                </div>
        `;

        // Render sections based on what's available
        const sections = [
            { key: 'stages', title: '📊 Stages/Classification', icon: '📊' },
            { key: 'types', title: '📊 Types/Classification', icon: '📊' },
            { key: 'classification', title: '📊 Classification', icon: '📊' },
            { key: 'diagnosis', title: '🔬 Diagnosis', icon: '🔬' },
            { key: 'assessment', title: '📋 Assessment', icon: '📋' },
            { key: 'recognition', title: '🔍 Recognition', icon: '🔍' },
            { key: 'targets', title: '🎯 Treatment Targets', icon: '🎯' },
            { key: 'treatment', title: '💊 Treatment Recommendations', icon: '💊' },
            { key: 'algorithm', title: '🔄 Treatment Algorithm', icon: '🔄' },
            { key: 'medications', title: '💊 Medication Classes', icon: '💊' },
            { key: 'rateControl', title: '🎯 Rate Control Strategy', icon: '🎯' },
            { key: 'rhythmControl', title: '🔄 Rhythm Control Strategy', icon: '🔄' },
            { key: 'anticoagulation', title: '🩸 Anticoagulation Management', icon: '🩸' },
            { key: 'stemi', title: '🚨 STEMI Management', icon: '🚨' },
            { key: 'nstemi', title: '⚠️ NSTEMI Management', icon: '⚠️' },
            { key: 'secondary prevention', title: '🛡️ Secondary Prevention', icon: '🛡️' },
            { key: 'lifestyle', title: '🏃‍♂️ Lifestyle Modifications', icon: '🏃‍♂️' },
            { key: 'monitoring', title: '📊 Monitoring', icon: '📊' },
            { key: 'exacerbations', title: '🚨 Exacerbation Management', icon: '🚨' },
            { key: 'acute', title: '🚨 Acute Management', icon: '🚨' },
            { key: 'specialPopulations', title: '👨‍⚕️ Special Populations', icon: '👨‍⚕️' },
            { key: 'complications', title: '⚠️ Complications', icon: '⚠️' },
            { key: 'prevention', title: '🛡️ Prevention', icon: '🛡️' },
            { key: 'referral', title: '🏥 Referral Criteria', icon: '🏥' }
        ];

        for (const section of sections) {
            if (guideline[section.key]) {
                html += `<div class="info-section"><h4>${section.title}</h4>`;
                
                const data = guideline[section.key];
                if (typeof data === 'string') {
                    html += `<p>${data}</p>`;
                } else if (typeof data === 'object') {
                    html += '<div class="guideline-list">';
                    for (const [key, value] of Object.entries(data)) {
                        html += `
                            <div class="guideline-item">
                                <strong>${key}:</strong> ${value}
                            </div>
                        `;
                    }
                    html += '</div>';
                }
                
                html += '</div>';
            }
        }


        html += '</div>';
        return html;
    }
}

// Export singleton instance
export const guidelinesManager = new GuidelinesManager();
export default GuidelinesManager;
