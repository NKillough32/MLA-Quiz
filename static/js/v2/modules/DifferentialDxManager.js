/**
 * Differential Diagnosis Manager - V2
 * Native implementation using extracted differential diagnosis data
 */

import { eventBus } from './EventBus.js';
import { storage } from './StorageManager.js';
import { EVENTS } from './Constants.js';
import { differentialDatabase } from '../../data/differentials.js';

export class DifferentialDxManager {
    constructor() {
        this.differentialDatabase = differentialDatabase;
        this.initialized = false;
        this.recentDifferentials = [];
        this.searchCache = new Map();
    }

    /**
     * Initialize native V2 implementation
     */
    initialize() {
        this.recentDifferentials = storage.getItem('recentDifferentials', []);
        this.initialized = true;
        console.log(`🔬 DifferentialDxManager initialized (V2 Native) - ${Object.keys(this.differentialDatabase).length} presentations loaded`);
    }

    /**
     * Load differential diagnosis interface - native V2 implementation
     */
    loadDifferentialDx() {
        if (!this.initialized) {
            console.error('DifferentialDxManager not initialized');
            return;
        }

        // Create differential diagnosis interface
        this.displayDifferentialInterface();
        
        // Emit event for tracking
        eventBus.emit(EVENTS.TOOL_OPENED, {
            tool: 'differential-diagnosis',
            timestamp: Date.now()
        });
    }

    /**
     * Display differential diagnosis interface
     */
    displayDifferentialInterface() {
        const container = document.getElementById('medicalToolContent');
        if (!container) {
            console.error('Medical tool content container not found');
            return;
        }

        const stats = this.getStatistics();
        
        container.innerHTML = `
            <div class="differential-interface">
                <div class="tool-header">
                    <h2>🔬 Differential Diagnosis</h2>
                    <p>Comprehensive differential diagnoses for common presenting complaints</p>
                    <div class="stats-summary">
                        <span class="stat-item">${stats.total} presentations</span>
                        <span class="stat-item">${Object.keys(stats.categories).length} categories</span>
                        <span class="stat-item">${stats.recentCount} recent</span>
                    </div>
                </div>

                <div class="differential-controls">
                    <div class="search-section">
                        <input type="text" id="differentialSearch" placeholder="Search by presentation, condition, or features..." class="search-input">
                        <button id="clearDifferentialSearch" class="btn-secondary">Clear</button>
                    </div>
                    
                    <div class="filter-section">
                        <select id="differentialCategoryFilter" class="filter-select">
                            <option value="">All Categories</option>
                            ${this.getCategories().map(cat => 
                                `<option value="${cat}">${cat}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <div id="differentialResults" class="differential-results">
                    ${this.generateDifferentialGrid()}
                </div>
            </div>
        `;

        this.bindDifferentialEvents();
    }

    /**
     * Generate differential diagnosis grid HTML
     */
    generateDifferentialGrid(presentations = null) {
        const presentationsList = presentations || Object.entries(this.differentialDatabase);
        
        if (presentationsList.length === 0) {
            return '<div class="no-results">No differential diagnoses found matching your criteria.</div>';
        }

        return presentationsList.map(([key, presentation]) => `
            <div class="differential-card" data-key="${key}">
                <div class="differential-header">
                    <h3>${presentation.title}</h3>
                    <span class="category-tag">${presentation.category}</span>
                </div>
                ${presentation.redFlags ? `
                    <div class="red-flags">
                        ${presentation.redFlags}
                    </div>
                ` : ''}
                <div class="presentation-count">
                    <strong>${Object.keys(presentation.presentations || {}).length} conditions</strong> to consider
                </div>
                <div class="differential-actions">
                    <button class="btn-primary view-differential" data-key="${key}">View Differentials</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Bind differential diagnosis interface events
     */
    bindDifferentialEvents() {
        // Search functionality
        const searchInput = document.getElementById('differentialSearch');
        const categoryFilter = document.getElementById('differentialCategoryFilter');
        const clearSearch = document.getElementById('clearDifferentialSearch');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.handleDifferentialSearch());
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.handleDifferentialSearch());
        }

        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                searchInput.value = '';
                categoryFilter.value = '';
                this.handleDifferentialSearch();
            });
        }

        // View differential buttons
        document.querySelectorAll('.view-differential').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.dataset.key;
                this.showDifferentialDetails(key);
                this.addToRecent(key);
            });
        });
    }

    /**
     * Handle search and filtering
     */
    handleDifferentialSearch() {
        const searchTerm = document.getElementById('differentialSearch')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('differentialCategoryFilter')?.value || '';

        let results = Object.entries(this.differentialDatabase);

        // Apply search filter
        if (searchTerm) {
            results = results.filter(([key, presentation]) => 
                presentation.title.toLowerCase().includes(searchTerm) ||
                presentation.category.toLowerCase().includes(searchTerm) ||
                Object.keys(presentation.presentations || {}).some(condition => 
                    condition.toLowerCase().includes(searchTerm)
                ) ||
                Object.values(presentation.presentations || {}).some(condition =>
                    condition.features?.toLowerCase().includes(searchTerm) ||
                    condition.differentiatingFeatures?.toLowerCase().includes(searchTerm)
                )
            );
        }

        // Apply category filter
        if (categoryFilter) {
            results = results.filter(([key, presentation]) => presentation.category === categoryFilter);
        }

        // Update results display
        const resultsContainer = document.getElementById('differentialResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = this.generateDifferentialGrid(results);
            this.bindDifferentialEvents(); // Rebind events for new elements
        }
    }

    /**
     * Show detailed view of differential diagnoses
     */
    showDifferentialDetails(key) {
        const presentation = this.differentialDatabase[key];
        if (!presentation) return;

        // Create modal for detailed view
        const modal = document.createElement('div');
        modal.className = 'differential-modal-overlay';
        modal.innerHTML = `
            <div class="differential-modal">
                <div class="modal-header">
                    <h2>${presentation.title}</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-content">
                    ${presentation.redFlags ? `
                        <div class="red-flags-section">
                            <h3>🚩 Red Flags</h3>
                            <p>${presentation.redFlags}</p>
                        </div>
                    ` : ''}
                    
                    <div class="differentials-section">
                        <h3>Differential Diagnoses</h3>
                        <div class="differentials-list">
                            ${Object.entries(presentation.presentations || {}).map(([condition, details]) => `
                                <div class="differential-item">
                                    <h4>${condition}</h4>
                                    <div class="differential-details">
                                        <div class="detail-row">
                                            <strong>Features:</strong> ${details.features || 'Not specified'}
                                        </div>
                                        <div class="detail-row">
                                            <strong>Tests:</strong> ${details.tests || 'Not specified'}
                                        </div>
                                        <div class="detail-row">
                                            <strong>Urgency:</strong> 
                                            <span class="urgency-badge urgency-${details.urgency?.toLowerCase() || 'standard'}">${details.urgency || 'Standard'}</span>
                                        </div>
                                        ${details.timeToTreat ? `
                                            <div class="detail-row">
                                                <strong>Time to Treat:</strong> ${details.timeToTreat}
                                            </div>
                                        ` : ''}
                                        ${details.clinicalPearls ? `
                                            <div class="detail-row">
                                                <strong>Clinical Pearls:</strong> ${details.clinicalPearls}
                                            </div>
                                        ` : ''}
                                        ${details.differentiatingFeatures ? `
                                            <div class="detail-row">
                                                <strong>Differentiating Features:</strong> ${details.differentiatingFeatures}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="detail-meta">
                        <span class="category-tag">${presentation.category}</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal events
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Search differential diagnoses
     */
    searchDifferentials(query) {
        const cacheKey = query.toLowerCase();
        if (this.searchCache.has(cacheKey)) {
            return this.searchCache.get(cacheKey);
        }

        const term = query.toLowerCase();
        const results = [];

        for (const [key, presentation] of Object.entries(this.differentialDatabase)) {
            if (presentation.title.toLowerCase().includes(term) ||
                presentation.category.toLowerCase().includes(term) ||
                Object.keys(presentation.presentations || {}).some(condition => 
                    condition.toLowerCase().includes(term)
                ) ||
                Object.values(presentation.presentations || {}).some(condition =>
                    condition.features?.toLowerCase().includes(term) ||
                    condition.differentiatingFeatures?.toLowerCase().includes(term)
                )) {
                results.push({ key, ...presentation });
            }
        }

        this.searchCache.set(cacheKey, results);
        return results;
    }

    /**
     * Get differential by key
     */
    getDifferential(key) {
        return this.differentialDatabase[key] || null;
    }

    /**
     * Get all categories
     */
    getCategories() {
        const categories = new Set();
        for (const presentation of Object.values(this.differentialDatabase)) {
            if (presentation.category) {
                categories.add(presentation.category);
            }
        }
        return Array.from(categories).sort();
    }

    /**
     * Get differentials by category
     */
    getDifferentialsByCategory(category) {
        return Object.entries(this.differentialDatabase)
            .filter(([key, presentation]) => presentation.category === category)
            .map(([key, presentation]) => ({ key, ...presentation }));
    }

    /**
     * Add to recent
     */
    addToRecent(presentationKey) {
        if (!this.recentDifferentials.includes(presentationKey)) {
            this.recentDifferentials.unshift(presentationKey);
            this.recentDifferentials = this.recentDifferentials.slice(0, 10); // Keep last 10
            storage.setItem('recentDifferentials', this.recentDifferentials);
        }
    }

    /**
     * Get recent differentials
     */
    getRecentDifferentials() {
        return this.recentDifferentials.map(key => ({
            key,
            ...this.differentialDatabase[key]
        })).filter(presentation => presentation.title); // Filter out invalid keys
    }

    /**
     * Get emergency presentations
     */
    getEmergencyPresentations() {
        const emergencyPresentations = [];
        
        for (const [key, presentation] of Object.entries(this.differentialDatabase)) {
            if (presentation.presentations) {
                const hasEmergency = Object.values(presentation.presentations).some(
                    condition => condition.urgency === 'Emergency'
                );
                if (hasEmergency) {
                    emergencyPresentations.push({ key, ...presentation });
                }
            }
        }
        
        return emergencyPresentations;
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const categories = {};
        let totalConditions = 0;

        for (const presentation of Object.values(this.differentialDatabase)) {
            const cat = presentation.category || 'Other';
            categories[cat] = (categories[cat] || 0) + 1;
            
            if (presentation.presentations) {
                totalConditions += Object.keys(presentation.presentations).length;
            }
        }

        return {
            total: Object.keys(this.differentialDatabase).length,
            totalConditions,
            categories,
            recentCount: this.recentDifferentials.length
        };
    }

    /**
     * Clear search cache
     */
    clearCache() {
        this.searchCache.clear();
    }
}

// Export singleton instance
export const differentialDxManager = new DifferentialDxManager();
export default DifferentialDxManager;
