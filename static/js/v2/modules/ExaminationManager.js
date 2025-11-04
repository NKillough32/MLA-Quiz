/**
 * Examination Guide Manager - V2
 * Native implementation using extracted examination guides data
 */

import { eventBus } from './EventBus.js';
import { storage } from './StorageManager.js';
import { EVENTS } from './Constants.js';
import { examinationGuides } from '../../data/examinationGuides.js';

export class ExaminationManager {
    constructor() {
        this.examinationGuides = examinationGuides;
        this.initialized = false;
        this.recentExams = [];
        this.searchCache = new Map();
    }

    /**
     * Initialize native V2 implementation
     */
    initialize() {
        this.recentExams = storage.getItem('recentExams', []);
        this.initialized = true;
        console.log(`🩺 ExaminationManager initialized (V2 Native) - ${Object.keys(this.examinationGuides).length} examination guides loaded`);
    }

    /**
     * Load examination guide interface - native V2 implementation
     */
    loadExaminationGuide() {
        if (!this.initialized) {
            console.error('ExaminationManager not initialized');
            return;
        }

        // Create examination guides interface
        this.displayExaminationInterface();
        
        // Emit event for tracking
        eventBus.emit(EVENTS.TOOL_OPENED, {
            tool: 'examination-guides',
            timestamp: Date.now()
        });
    }

    /**
     * Display examination guides interface
     */
    displayExaminationInterface() {
        const container = document.getElementById('medicalToolContent');
        if (!container) {
            console.error('Medical tool content container not found');
            return;
        }

        const stats = this.getStatistics();
        
        container.innerHTML = `
            <div class="examination-interface">
                <div class="tool-header">
                    <h2>🩺 Clinical Examination Guides</h2>
                    <p>Systematic approaches to clinical examination</p>
                    <div class="stats-summary">
                        <span class="stat-item">${stats.total} examinations</span>
                        <span class="stat-item">${Object.keys(stats.categories).length} categories</span>
                        <span class="stat-item">${stats.recentCount} recent</span>
                    </div>
                </div>

                <div class="examination-controls">
                    <div class="search-section">
                        <input type="text" id="examinationSearch" placeholder="Search examination guides..." class="search-input">
                        <button id="clearExaminationSearch" class="btn-secondary">Clear</button>
                    </div>
                    
                    <div class="filter-section">
                        <select id="examinationCategoryFilter" class="filter-select">
                            <option value="">All Categories</option>
                            ${this.getCategories().map(cat => 
                                `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <div id="examinationResults" class="examination-results">
                    ${this.generateExaminationGrid()}
                </div>
            </div>
        `;

        this.bindExaminationEvents();
    }

    /**
     * Generate examination guides grid HTML
     */
    generateExaminationGrid(examinations = null) {
        const examinationsList = examinations || Object.entries(this.examinationGuides);
        
        if (examinationsList.length === 0) {
            return '<div class="no-results">No examination guides found matching your criteria.</div>';
        }

        return examinationsList.map(([key, examination]) => `
            <div class="examination-card" data-key="${key}">
                <div class="examination-header">
                    <h3>${examination.title}</h3>
                    <span class="category-tag">${examination.category}</span>
                </div>
                <div class="examination-approach">
                    <strong>Approach:</strong> ${examination.approach}
                </div>
                <div class="examination-sections">
                    <strong>${Object.keys(examination.sections || {}).length} sections</strong> to examine
                </div>
                <div class="examination-actions">
                    <button class="btn-primary view-examination" data-key="${key}">View Guide</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Bind examination interface events
     */
    bindExaminationEvents() {
        // Search functionality
        const searchInput = document.getElementById('examinationSearch');
        const categoryFilter = document.getElementById('examinationCategoryFilter');
        const clearSearch = document.getElementById('clearExaminationSearch');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.handleExaminationSearch());
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.handleExaminationSearch());
        }

        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                searchInput.value = '';
                categoryFilter.value = '';
                this.handleExaminationSearch();
            });
        }

        // View examination buttons
        document.querySelectorAll('.view-examination').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.dataset.key;
                this.showExaminationDetails(key);
                this.addToRecent(key);
            });
        });
    }

    /**
     * Handle search and filtering
     */
    handleExaminationSearch() {
        const searchTerm = document.getElementById('examinationSearch')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('examinationCategoryFilter')?.value || '';

        let results = Object.entries(this.examinationGuides);

        // Apply search filter
        if (searchTerm) {
            results = results.filter(([key, examination]) => 
                examination.title.toLowerCase().includes(searchTerm) ||
                examination.category.toLowerCase().includes(searchTerm) ||
                examination.approach.toLowerCase().includes(searchTerm) ||
                Object.values(examination.sections || {}).some(section =>
                    section.name?.toLowerCase().includes(searchTerm) ||
                    section.technique?.toLowerCase().includes(searchTerm)
                )
            );
        }

        // Apply category filter
        if (categoryFilter) {
            results = results.filter(([key, examination]) => examination.category === categoryFilter);
        }

        // Update results display
        const resultsContainer = document.getElementById('examinationResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = this.generateExaminationGrid(results);
            this.bindExaminationEvents(); // Rebind events for new elements
        }
    }

    /**
     * Show detailed examination guide
     */
    showExaminationDetails(key) {
        const examination = this.examinationGuides[key];
        if (!examination) return;

        // Create modal for detailed examination guide
        const modal = document.createElement('div');
        modal.className = 'examination-modal-overlay';
        modal.innerHTML = `
            <div class="examination-modal">
                <div class="modal-header">
                    <h2>${examination.title}</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-content">
                    <div class="examination-overview">
                        <div class="approach-section">
                            <h3>📋 Systematic Approach</h3>
                            <p class="approach-steps">${examination.approach}</p>
                        </div>
                    </div>
                    
                    <div class="examination-sections">
                        <h3>🔍 Examination Sections</h3>
                        ${Object.entries(examination.sections || {}).map(([sectionKey, section]) => `
                            <div class="section-card">
                                <h4>${section.name}</h4>
                                
                                <div class="section-detail">
                                    <strong>Technique:</strong>
                                    <p>${section.technique}</p>
                                </div>
                                
                                <div class="section-detail">
                                    <strong>Normal Findings:</strong>
                                    <p class="normal-findings">${section.normal}</p>
                                </div>
                                
                                <div class="section-detail">
                                    <strong>Abnormal Findings:</strong>
                                    <div class="abnormal-findings">
                                        ${Object.entries(section.abnormal || {}).map(([finding, description]) => `
                                            <div class="finding-item">
                                                <strong>${finding}:</strong> ${description}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                
                                ${section.clinicalPearls ? `
                                    <div class="clinical-pearls">
                                        <strong>💡 Clinical Pearls:</strong>
                                        <p>${section.clinicalPearls}</p>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="detail-meta">
                        <span class="category-tag">${examination.category}</span>
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
     * Get examination by key
     */
    getExamination(key) {
        return this.examinationGuides[key] || null;
    }

    /**
     * Search examinations
     */
    searchExaminations(query) {
        const cacheKey = query.toLowerCase();
        if (this.searchCache.has(cacheKey)) {
            return this.searchCache.get(cacheKey);
        }

        const term = query.toLowerCase();
        const results = [];

        for (const [key, examination] of Object.entries(this.examinationGuides)) {
            if (examination.title.toLowerCase().includes(term) ||
                examination.category.toLowerCase().includes(term) ||
                examination.approach.toLowerCase().includes(term) ||
                Object.values(examination.sections || {}).some(section =>
                    section.name?.toLowerCase().includes(term) ||
                    section.technique?.toLowerCase().includes(term)
                )) {
                results.push({ key, ...examination });
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
        for (const examination of Object.values(this.examinationGuides)) {
            if (examination.category) {
                categories.add(examination.category);
            }
        }
        return Array.from(categories).sort();
    }

    /**
     * Get examinations by category
     */
    getExaminationsByCategory(category) {
        return Object.entries(this.examinationGuides)
            .filter(([key, examination]) => examination.category === category)
            .map(([key, examination]) => ({ key, ...examination }));
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
     * Get recent examinations
     */
    getRecentExaminations() {
        return this.recentExams.map(key => ({
            key,
            ...this.examinationGuides[key]
        })).filter(examination => examination.title); // Filter out invalid keys
    }

    /**
     * Get examination sections count
     */
    getExaminationSectionsCount(key) {
        const examination = this.examinationGuides[key];
        return examination ? Object.keys(examination.sections || {}).length : 0;
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const categories = {};
        let totalSections = 0;

        for (const examination of Object.values(this.examinationGuides)) {
            const cat = examination.category || 'Other';
            categories[cat] = (categories[cat] || 0) + 1;
            
            if (examination.sections) {
                totalSections += Object.keys(examination.sections).length;
            }
        }

        return {
            total: Object.keys(this.examinationGuides).length,
            totalSections,
            categories,
            recentCount: this.recentExams.length
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
export const examinationManager = new ExaminationManager();
export default ExaminationManager;
