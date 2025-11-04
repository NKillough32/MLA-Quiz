/**
 * Emergency Protocols Manager - V2
 * Native implementation using extracted emergency protocols data
 */

import { eventBus } from './EventBus.js';
import { storage } from './StorageManager.js';
import { EVENTS } from './Constants.js';
import { emergencyProtocols } from '../../data/emergencyProtocols.js';

export class EmergencyProtocolsManager {
    constructor() {
        this.emergencyProtocols = emergencyProtocols;
        this.initialized = false;
        this.recentProtocols = [];
        this.searchCache = new Map();
    }

    /**
     * Initialize native V2 implementation
     */
    initialize() {
        this.recentProtocols = storage.getItem('recentProtocols', []);
        this.initialized = true;
        console.log(`🚨 EmergencyProtocolsManager initialized (V2 Native) - ${Object.keys(this.emergencyProtocols).length} protocols loaded`);
    }

    /**
     * Load emergency protocols interface - native V2 implementation
     */
    loadEmergencyProtocols() {
        if (!this.initialized) {
            console.error('EmergencyProtocolsManager not initialized');
            return;
        }

        // Create emergency protocols interface
        this.displayEmergencyProtocolsInterface();
        
        // Emit event for tracking
        eventBus.emit(EVENTS.TOOL_OPENED, {
            tool: 'emergency-protocols',
            timestamp: Date.now()
        });
    }

    /**
     * Display emergency protocols interface
     */
    displayEmergencyProtocolsInterface() {
        const container = document.getElementById('medicalToolContent');
        if (!container) {
            console.error('Medical tool content container not found');
            return;
        }

        const stats = this.getStatistics();
        
        container.innerHTML = `
            <div class="emergency-protocols-interface">
                <div class="tool-header">
                    <h2>🚨 Emergency Protocols</h2>
                    <p>Critical emergency management protocols and guidelines</p>
                    <div class="stats-summary">
                        <span class="stat-item">${stats.total} protocols</span>
                        <span class="stat-item">${Object.keys(stats.categories).length} categories</span>
                        <span class="stat-item">${stats.recentCount} recent</span>
                    </div>
                </div>

                <div class="emergency-controls">
                    <div class="search-section">
                        <input type="text" id="protocolSearch" placeholder="Search emergency protocols..." class="search-input">
                        <button id="clearProtocolSearch" class="btn-secondary">Clear</button>
                    </div>
                    
                    <div class="filter-section">
                        <select id="protocolCategoryFilter" class="filter-select">
                            <option value="">All Categories</option>
                            ${this.getCategories().map(cat => 
                                `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`
                            ).join('')}
                        </select>
                        
                        <select id="protocolUrgencyFilter" class="filter-select">
                            <option value="">All Urgencies</option>
                            <option value="emergency">Emergency</option>
                        </select>
                    </div>
                </div>

                <div id="protocolResults" class="emergency-protocols-results">
                    ${this.generateProtocolsGrid()}
                </div>
            </div>
        `;

        this.bindProtocolEvents();
    }

    /**
     * Generate emergency protocols grid HTML
     */
    generateProtocolsGrid(protocols = null) {
        const protocolsList = protocols || Object.entries(this.emergencyProtocols);
        
        if (protocolsList.length === 0) {
            return '<div class="no-results">No emergency protocols found matching your criteria.</div>';
        }

        return protocolsList.map(([key, protocol]) => `
            <div class="protocol-card emergency-card" data-key="${key}">
                <div class="protocol-header">
                    <h3>${protocol.name}</h3>
                    <div class="protocol-badges">
                        <span class="category-tag">${protocol.category}</span>
                        <span class="urgency-badge urgency-${protocol.urgency || 'standard'}">${(protocol.urgency || 'standard').toUpperCase()}</span>
                    </div>
                </div>
                <div class="protocol-summary">
                    <div class="protocol-info">
                        <strong>${protocol.steps.length} steps</strong> • 
                        <strong>${protocol.drugs.length} medications</strong> • 
                        <strong>${protocol.criticalActions.length} critical actions</strong>
                    </div>
                    <div class="protocol-guideline">
                        <strong>Guideline:</strong> ${protocol.ukGuideline}
                    </div>
                </div>
                <div class="protocol-actions">
                    <button class="btn-primary view-protocol" data-key="${key}">View Protocol</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Bind protocol interface events
     */
    bindProtocolEvents() {
        // Search functionality
        const searchInput = document.getElementById('protocolSearch');
        const categoryFilter = document.getElementById('protocolCategoryFilter');
        const urgencyFilter = document.getElementById('protocolUrgencyFilter');
        const clearSearch = document.getElementById('clearProtocolSearch');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.handleProtocolSearch());
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.handleProtocolSearch());
        }

        if (urgencyFilter) {
            urgencyFilter.addEventListener('change', () => this.handleProtocolSearch());
        }

        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                searchInput.value = '';
                categoryFilter.value = '';
                urgencyFilter.value = '';
                this.handleProtocolSearch();
            });
        }

        // View protocol buttons
        document.querySelectorAll('.view-protocol').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.dataset.key;
                this.showProtocolDetails(key);
                this.addToRecent(key);
            });
        });
    }

    /**
     * Handle search and filtering
     */
    handleProtocolSearch() {
        const searchTerm = document.getElementById('protocolSearch')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('protocolCategoryFilter')?.value || '';
        const urgencyFilter = document.getElementById('protocolUrgencyFilter')?.value || '';

        let results = Object.entries(this.emergencyProtocols);

        // Apply search filter
        if (searchTerm) {
            results = results.filter(([key, protocol]) => 
                protocol.name.toLowerCase().includes(searchTerm) ||
                protocol.category.toLowerCase().includes(searchTerm) ||
                protocol.steps.some(step => step.toLowerCase().includes(searchTerm)) ||
                protocol.drugs.some(drug => drug.toLowerCase().includes(searchTerm)) ||
                protocol.criticalActions.some(action => action.toLowerCase().includes(searchTerm))
            );
        }

        // Apply category filter
        if (categoryFilter) {
            results = results.filter(([key, protocol]) => protocol.category === categoryFilter);
        }

        // Apply urgency filter
        if (urgencyFilter) {
            results = results.filter(([key, protocol]) => protocol.urgency === urgencyFilter);
        }

        // Update results display
        const resultsContainer = document.getElementById('protocolResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = this.generateProtocolsGrid(results);
            this.bindProtocolEvents(); // Rebind events for new elements
        }
    }

    /**
     * Show detailed emergency protocol
     */
    showProtocolDetails(key) {
        const protocol = this.emergencyProtocols[key];
        if (!protocol) return;

        // Create modal for detailed protocol view
        const modal = document.createElement('div');
        modal.className = 'protocol-modal-overlay';
        modal.innerHTML = `
            <div class="protocol-modal emergency-modal">
                <div class="modal-header">
                    <h2>${protocol.name}</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-content">
                    <div class="protocol-overview">
                        <div class="protocol-meta">
                            <span class="category-tag">${protocol.category}</span>
                            <span class="urgency-badge urgency-${protocol.urgency || 'standard'}">${(protocol.urgency || 'standard').toUpperCase()}</span>
                            <span class="guideline-badge">${protocol.ukGuideline}</span>
                        </div>
                    </div>
                    
                    <div class="protocol-sections">
                        <div class="protocol-section">
                            <h3>📋 Protocol Steps</h3>
                            <ol class="protocol-steps">
                                ${protocol.steps.map((step, index) => `
                                    <li class="protocol-step">
                                        <span class="step-number">${index + 1}</span>
                                        <span class="step-text">${step}</span>
                                    </li>
                                `).join('')}
                            </ol>
                        </div>
                        
                        <div class="protocol-section">
                            <h3>💊 Medications</h3>
                            <ul class="protocol-drugs">
                                ${protocol.drugs.map(drug => `
                                    <li class="drug-item">${drug}</li>
                                `).join('')}
                            </ul>
                        </div>
                        
                        <div class="protocol-section">
                            <h3>🚨 Critical Actions</h3>
                            <ul class="critical-actions">
                                ${protocol.criticalActions.map(action => `
                                    <li class="critical-action">${action}</li>
                                `).join('')}
                            </ul>
                        </div>
                        
                        <div class="protocol-section guideline-section">
                            <h3>📖 UK Guideline</h3>
                            <p class="guideline-reference">${protocol.ukGuideline}</p>
                        </div>
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
     * Get protocol by key
     */
    getProtocol(key) {
        return this.emergencyProtocols[key] || null;
    }

    /**
     * Search protocols
     */
    searchProtocols(query) {
        const cacheKey = query.toLowerCase();
        if (this.searchCache.has(cacheKey)) {
            return this.searchCache.get(cacheKey);
        }

        const term = query.toLowerCase();
        const results = [];

        for (const [key, protocol] of Object.entries(this.emergencyProtocols)) {
            if (protocol.name.toLowerCase().includes(term) ||
                protocol.category.toLowerCase().includes(term) ||
                protocol.steps.some(step => step.toLowerCase().includes(term)) ||
                protocol.drugs.some(drug => drug.toLowerCase().includes(term)) ||
                protocol.criticalActions.some(action => action.toLowerCase().includes(term))) {
                results.push({ key, ...protocol });
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
        for (const protocol of Object.values(this.emergencyProtocols)) {
            if (protocol.category) {
                categories.add(protocol.category);
            }
        }
        return Array.from(categories).sort();
    }

    /**
     * Get protocols by category
     */
    getProtocolsByCategory(category) {
        return Object.entries(this.emergencyProtocols)
            .filter(([key, protocol]) => protocol.category === category)
            .map(([key, protocol]) => ({ key, ...protocol }));
    }

    /**
     * Get emergency protocols (all are emergency)
     */
    getEmergencyProtocols() {
        return Object.entries(this.emergencyProtocols)
            .filter(([key, protocol]) => protocol.urgency === 'emergency')
            .map(([key, protocol]) => ({ key, ...protocol }));
    }

    /**
     * Add to recent
     */
    addToRecent(protocolKey) {
        if (!this.recentProtocols.includes(protocolKey)) {
            this.recentProtocols.unshift(protocolKey);
            this.recentProtocols = this.recentProtocols.slice(0, 10); // Keep last 10
            storage.setItem('recentProtocols', this.recentProtocols);
        }
    }

    /**
     * Get recent protocols
     */
    getRecentProtocols() {
        return this.recentProtocols.map(key => ({
            key,
            ...this.emergencyProtocols[key]
        })).filter(protocol => protocol.name); // Filter out invalid keys
    }

    /**
     * Get protocols by urgency
     */
    getProtocolsByUrgency(urgency) {
        return Object.entries(this.emergencyProtocols)
            .filter(([key, protocol]) => protocol.urgency === urgency)
            .map(([key, protocol]) => ({ key, ...protocol }));
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const categories = {};
        let totalSteps = 0;
        let totalDrugs = 0;

        for (const protocol of Object.values(this.emergencyProtocols)) {
            const cat = protocol.category || 'Other';
            categories[cat] = (categories[cat] || 0) + 1;
            
            totalSteps += protocol.steps.length;
            totalDrugs += protocol.drugs.length;
        }

        return {
            total: Object.keys(this.emergencyProtocols).length,
            totalSteps,
            totalDrugs,
            categories,
            recentCount: this.recentProtocols.length
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
export const emergencyProtocolsManager = new EmergencyProtocolsManager();
export default EmergencyProtocolsManager;
