/**
 * Clinical Triads Manager - V2
 * Native implementation using extracted clinical triads data
 */

import { eventBus } from './EventBus.js';
import { storage } from './StorageManager.js';
import { EVENTS } from './Constants.js';
import { clinicalTriads } from '../../data/clinicalTriads.js';

export class TriadsManager {
    constructor() {
        this.clinicalTriads = clinicalTriads;
        this.initialized = false;
        this.recentTriads = [];
        this.searchCache = new Map();
    }

    /**
     * Initialize native V2 implementation
     */
    initialize() {
        this.recentTriads = storage.getItem('recentTriads', []);
        this.initialized = true;
        console.log(`🔺 TriadsManager initialized (V2 Native) - ${Object.keys(this.clinicalTriads).length} triads loaded`);
    }

    /**
     * Load triads interface - native V2 implementation
     */
    loadTriads() {
        if (!this.initialized) {
            console.error('TriadsManager not initialized');
            return;
        }

        // Create triads interface
        this.displayTriadsInterface();
        
        // Emit event for tracking
        eventBus.emit(EVENTS.TOOL_OPENED, {
            tool: 'clinical-triads',
            timestamp: Date.now()
        });
    }

    /**
     * Display triads interface
     */
    displayTriadsInterface() {
        const container = document.getElementById('medicalToolContent');
        if (!container) {
            console.error('Medical tool content container not found');
            return;
        }

        const stats = this.getStatistics();
        
        container.innerHTML = `
            <div class="triads-interface">
                <div class="tool-header">
                    <h2>🔺 Clinical Triads</h2>
                    <p>Classical medical triads for pattern recognition</p>
                    <div class="stats-summary">
                        <span class="stat-item">${stats.total} triads</span>
                        <span class="stat-item">${Object.keys(stats.categories).length} categories</span>
                        <span class="stat-item">${stats.recentCount} recent</span>
                    </div>
                </div>

                <div class="triads-controls">
                    <div class="search-section">
                        <input type="text" id="triadsSearch" placeholder="Search triads by name, condition, or components..." class="search-input">
                        <button id="clearSearch" class="btn-secondary">Clear</button>
                    </div>
                    
                    <div class="filter-section">
                        <select id="categoryFilter" class="filter-select">
                            <option value="">All Categories</option>
                            ${this.getCategories().map(cat => 
                                `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`
                            ).join('')}
                        </select>
                        
                        <select id="urgencyFilter" class="filter-select">
                            <option value="">All Urgencies</option>
                            <option value="emergency">Emergency</option>
                            <option value="high">High</option>
                            <option value="standard">Standard</option>
                        </select>
                    </div>
                </div>

                <div id="triadsResults" class="triads-results">
                    ${this.generateTriadsGrid()}
                </div>
            </div>
        `;

        this.bindTriadsEvents();
    }

    /**
     * Generate triads grid HTML
     */
    generateTriadsGrid(triads = null) {
        const triadsList = triads || Object.entries(this.clinicalTriads);
        
        if (triadsList.length === 0) {
            return '<div class="no-results">No triads found matching your criteria.</div>';
        }

        return triadsList.map(([key, triad]) => `
            <div class="triad-card" data-key="${key}">
                <div class="triad-header">
                    <h3>${triad.name}</h3>
                    <span class="urgency-badge urgency-${triad.urgency || 'standard'}">${(triad.urgency || 'standard').toUpperCase()}</span>
                </div>
                <div class="triad-condition">
                    <strong>Condition:</strong> ${triad.condition}
                </div>
                <div class="triad-components">
                    <strong>Components:</strong>
                    <ul>
                        ${triad.components.map(comp => `<li>${comp}</li>`).join('')}
                    </ul>
                </div>
                <div class="triad-category">
                    <span class="category-tag">${triad.category}</span>
                </div>
                <div class="triad-actions">
                    <button class="btn-primary view-details" data-key="${key}">View Details</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Bind triads interface events
     */
    bindTriadsEvents() {
        // Search functionality
        const searchInput = document.getElementById('triadsSearch');
        const categoryFilter = document.getElementById('categoryFilter');
        const urgencyFilter = document.getElementById('urgencyFilter');
        const clearSearch = document.getElementById('clearSearch');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.handleSearch());
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.handleSearch());
        }

        if (urgencyFilter) {
            urgencyFilter.addEventListener('change', () => this.handleSearch());
        }

        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                searchInput.value = '';
                categoryFilter.value = '';
                urgencyFilter.value = '';
                this.handleSearch();
            });
        }

        // View details buttons
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.dataset.key;
                this.showTriadDetails(key);
                this.addToRecent(key);
            });
        });
    }

    /**
     * Handle search and filtering
     */
    handleSearch() {
        const searchTerm = document.getElementById('triadsSearch')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const urgencyFilter = document.getElementById('urgencyFilter')?.value || '';

        let results = Object.entries(this.clinicalTriads);

        // Apply search filter
        if (searchTerm) {
            results = results.filter(([key, triad]) => 
                triad.name.toLowerCase().includes(searchTerm) ||
                triad.condition.toLowerCase().includes(searchTerm) ||
                triad.components?.some(c => c.toLowerCase().includes(searchTerm)) ||
                triad.mechanism?.toLowerCase().includes(searchTerm)
            );
        }

        // Apply category filter
        if (categoryFilter) {
            results = results.filter(([key, triad]) => triad.category === categoryFilter);
        }

        // Apply urgency filter
        if (urgencyFilter) {
            results = results.filter(([key, triad]) => triad.urgency === urgencyFilter);
        }

        // Update results display
        const resultsContainer = document.getElementById('triadsResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = this.generateTriadsGrid(results);
            this.bindTriadsEvents(); // Rebind events for new elements
        }
    }

    /**
     * Show detailed view of a triad
     */
    showTriadDetails(key) {
        const triad = this.clinicalTriads[key];
        if (!triad) return;

        // Create modal or detailed view
        const modal = document.createElement('div');
        modal.className = 'triad-modal-overlay';
        modal.innerHTML = `
            <div class="triad-modal">
                <div class="modal-header">
                    <h2>${triad.name}</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-content">
                    <div class="detail-section">
                        <h3>Condition</h3>
                        <p>${triad.condition}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Components</h3>
                        <ul>
                            ${triad.components.map(comp => `<li>${comp}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Mechanism</h3>
                        <p>${triad.mechanism}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Clinical Significance</h3>
                        <p>${triad.clinicalSignificance}</p>
                    </div>
                    
                    ${triad.ukGuidelines ? `
                        <div class="detail-section">
                            <h3>UK Guidelines</h3>
                            <p>${triad.ukGuidelines}</p>
                        </div>
                    ` : ''}
                    
                    <div class="detail-meta">
                        <span class="category-tag">${triad.category}</span>
                        <span class="urgency-badge urgency-${triad.urgency || 'standard'}">${(triad.urgency || 'standard').toUpperCase()}</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal event
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
     * Get triad by key
     */
    getTriad(key) {
        return this.clinicalTriads[key] || null;
    }

    /**
     * Search triads
     */
    searchTriads(query) {
        const cacheKey = query.toLowerCase();
        if (this.searchCache.has(cacheKey)) {
            return this.searchCache.get(cacheKey);
        }

        const term = query.toLowerCase();
        const results = [];

        for (const [key, triad] of Object.entries(this.clinicalTriads)) {
            if (triad.name.toLowerCase().includes(term) ||
                triad.condition.toLowerCase().includes(term) ||
                triad.components?.some(c => c.toLowerCase().includes(term)) ||
                triad.category?.toLowerCase().includes(term) ||
                triad.mechanism?.toLowerCase().includes(term)) {
                results.push({ key, ...triad });
            }
        }

        this.searchCache.set(cacheKey, results);
        return results;
    }

    /**
     * Get all categories
     */
    getCategories() {
        const categories = new Set();
        for (const triad of Object.values(this.clinicalTriads)) {
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
        return Object.entries(this.clinicalTriads)
            .filter(([key, triad]) => triad.category === category)
            .map(([key, triad]) => ({ key, ...triad }));
    }

    /**
     * Get triads by urgency
     */
    getTriadsByUrgency(urgency) {
        return Object.entries(this.clinicalTriads)
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
     * Get recent triads
     */
    getRecentTriads() {
        return this.recentTriads.map(key => ({
            key,
            ...this.clinicalTriads[key]
        })).filter(triad => triad.name); // Filter out invalid keys
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const categories = {};
        const urgencies = {};

        for (const triad of Object.values(this.clinicalTriads)) {
            const cat = triad.category || 'Other';
            const urg = triad.urgency || 'standard';
            
            categories[cat] = (categories[cat] || 0) + 1;
            urgencies[urg] = (urgencies[urg] || 0) + 1;
        }

        return {
            total: Object.keys(this.clinicalTriads).length,
            categories,
            urgencies,
            recentCount: this.recentTriads.length
        };
    }

    /**
     * Get triads for emergency situations
     */
    getEmergencyTriads() {
        return this.getTriadsByUrgency('emergency');
    }

    /**
     * Clear search cache
     */
    clearCache() {
        this.searchCache.clear();
    }
}

// Export singleton instance
export const triadsManager = new TriadsManager();
export default TriadsManager;
