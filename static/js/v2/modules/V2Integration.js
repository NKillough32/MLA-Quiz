/**
 * V2 Integration Layer
 * 
 * This module bridges V2's modular system with V1's existing UI structure.
 * It allows V2 managers (Calculator, Drug, Lab, Guidelines) to work within
 * the existing medical tools panel without requiring a complete UI rewrite.
 * 
 * Visual differences are allowed - functionality must be preserved.
 */

import { calculatorManager } from './CalculatorManager.js';
import { drugReferenceManager } from './DrugReferenceManager.js';
import { labValuesManager } from './LabValuesManager.js';
import { guidelinesManager } from './GuidelinesManager.js';
import { differentialDxManager } from './DifferentialDxManager.js';
import { triadsManager } from './TriadsManager.js';
import { examinationManager } from './ExaminationManager.js';
import { emergencyProtocolsManager } from './EmergencyProtocolsManager.js';
import { mnemonicsManager } from './MnemonicsManager.js';
import { interpretationToolsManager } from './InterpretationToolsManager.js';
import { laddersManager } from './LaddersManager.js';
import { eventBus } from './EventBus.js';
import { EVENTS, TOOL_CATEGORIES } from './Constants.js';

export class V2Integration {
    constructor() {
        this.initialized = false;
        this.v1App = null; // Reference to V1's MLAQuizApp instance
    }

    /**
     * Initialize V2 integration with V1 app
     */
    initialize(v1AppInstance) {
        if (this.initialized) {
            console.log('⚠️ V2 Integration already initialized');
            return;
        }

        this.v1App = v1AppInstance;
        
        // Initialize native V2 managers (no V1 dependencies)
        differentialDxManager.initialize();
        triadsManager.initialize();
        examinationManager.initialize();
        emergencyProtocolsManager.initialize();
        
        // Initialize standalone managers
        mnemonicsManager.loadMnemonics();
        interpretationToolsManager.loadInterpretationTools();
        laddersManager.loadLadders();
        
        // Hook into V1's switchMedicalTool method
        this.patchV1SwitchMethod();
        
        // Setup event bridges
        this.setupEventBridges();
        
        this.initialized = true;
        console.log('🔗 V2 Integration initialized - 100% Native V2 Implementation');
        console.log('   ✅ Calculators, Differential Dx, Triads, Examinations, Emergency Protocols');
        console.log('   ✅ Mnemonics, Interpretation Tools, Treatment Ladders');
        console.log('   🎉 All managers now V2 native - no V1 dependencies!');
    }

    /**
     * Patch V1's switchMedicalTool to use V2 when appropriate
     */
    patchV1SwitchMethod() {
        if (!this.v1App) return;

        const originalSwitch = this.v1App.switchMedicalTool.bind(this.v1App);
        
        this.v1App.switchMedicalTool = (toolType, toolName = null) => {
            // First, let V1 handle the basic panel switching
            originalSwitch(toolType, toolName);
            
            // Then enhance with V2 functionality where available
            this.enhanceWithV2(toolType, toolName);
        };
        
        console.log('✅ Patched V1 switchMedicalTool to integrate V2');
    }

    /**
     * Enhance V1 panels with V2 functionality
     */
    enhanceWithV2(toolType, toolName) {
        switch(toolType) {
            case 'calculators':
                this.enhanceCalculatorsList();
                break;
            case 'calculator-detail':
                // V1 handles individual calculator loading via loadCalculator()
                // We could enhance this later if needed
                break;
            case 'drug-reference':
                this.enhanceDrugReference();
                break;
            case 'lab-values':
                this.enhanceLabValues();
                break;
            case 'guidelines':
                this.enhanceGuidelines();
                break;
            case 'mnemonics':
                this.enhanceMnemonics();
                break;
            case 'interpretation':
                this.enhanceInterpretationTools();
                break;
            case 'ladders':
                this.enhanceLadders();
                break;
        }
    }

    /**
     * Enhance calculators list with V2 registry data
     */
    enhanceCalculatorsList() {
        const container = document.getElementById('calculator-list');
        if (!container) {
            console.warn('Calculator list container not found');
            return;
        }

        // Get all V2 calculators
        const allCalculators = calculatorManager.getAllCalculators();
        
        if (allCalculators.length === 0) {
            console.warn('No V2 calculators found');
            return;
        }

        // Group by category
        const byCategory = {};
        allCalculators.forEach(calc => {
            const cat = calc.category || 'Other';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(calc);
        });

        // Add V2 calculator stats badge
        const existingBadge = container.querySelector('.v2-calculator-badge');
        if (!existingBadge) {
            const badge = document.createElement('div');
            badge.className = 'v2-calculator-badge';
            badge.style.cssText = `
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                margin-bottom: 16px;
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            `;
            badge.innerHTML = `
                <div>🧮 <strong>${allCalculators.length}</strong> Clinical Calculators Available</div>
                <div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">
                    ${Object.keys(byCategory).length} Categories • Enhanced V2 Architecture
                </div>
            `;
            container.insertBefore(badge, container.firstChild);
        }

        console.log(`✨ Enhanced calculator list with ${allCalculators.length} V2 calculators`);
    }

    /**
     * Enhance drug reference with V2 manager features
     */
    enhanceDrugReference() {
        const container = document.querySelector('#drug-panel');
        if (!container) return;

        // Add V2 features indicator
        const existingBadge = container.querySelector('.v2-drug-badge');
        if (!existingBadge) {
            const stats = drugReferenceManager.getStatistics();
            const badge = document.createElement('div');
            badge.className = 'v2-drug-badge';
            badge.style.cssText = `
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                margin-bottom: 16px;
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(240, 147, 251, 0.3);
            `;
            badge.innerHTML = `
                <div>💊 <strong>${stats.totalDrugs}</strong> UK BNF-Aligned Drugs</div>
                <div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">
                    ${stats.categories.length} Categories • ${stats.totalViews} Views
                </div>
            `;
            
            const searchContainer = container.querySelector('.search-container');
            if (searchContainer) {
                container.insertBefore(badge, searchContainer);
            } else {
                container.insertBefore(badge, container.firstChild);
            }
        }

        console.log('✨ Enhanced drug reference with V2 manager stats');
    }

    /**
     * Enhance lab values with V2 manager features
     */
    enhanceLabValues() {
        const container = document.querySelector('#lab-panel');
        if (!container) return;

        // Add V2 features indicator
        const existingBadge = container.querySelector('.v2-lab-badge');
        if (!existingBadge) {
            const stats = labValuesManager.getStatistics();
            const badge = document.createElement('div');
            badge.className = 'v2-lab-badge';
            badge.style.cssText = `
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                margin-bottom: 16px;
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(79, 172, 254, 0.3);
            `;
            badge.innerHTML = `
                <div>🧪 <strong>${stats.totalPanels}</strong> Lab Panels • <strong>${stats.totalTests}</strong> Tests</div>
                <div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">
                    UK Reference Ranges • ${stats.totalViews} Views
                </div>
            `;
            
            const searchContainer = container.querySelector('.search-container');
            if (searchContainer) {
                container.insertBefore(badge, searchContainer);
            } else {
                container.insertBefore(badge, container.firstChild);
            }
        }

        console.log('✨ Enhanced lab values with V2 manager stats');
    }

    /**
     * Enhance guidelines with V2 manager features
     */
    enhanceGuidelines() {
        const container = document.querySelector('#guidelines-panel');
        if (!container) return;

        // Add V2 features indicator
        const existingBadge = container.querySelector('.v2-guidelines-badge');
        if (!existingBadge) {
            const stats = guidelinesManager.getStatistics();
            const badge = document.createElement('div');
            badge.className = 'v2-guidelines-badge';
            badge.style.cssText = `
                background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                margin-bottom: 16px;
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(67, 233, 123, 0.3);
            `;
            badge.innerHTML = `
                <div>📋 <strong>${stats.totalGuidelines}</strong> Clinical Guidelines</div>
                <div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">
                    NICE + Specialty Guidelines • ${stats.totalViews} Views
                </div>
            `;
            
            const searchContainer = container.querySelector('.search-container');
            if (searchContainer) {
                container.insertBefore(badge, searchContainer);
            } else {
                container.insertBefore(badge, container.firstChild);
            }
        }

        console.log('✨ Enhanced guidelines with V2 manager stats');
    }

    /**
     * Enhance mnemonics with V2 manager features
     */
    enhanceMnemonics() {
        const container = document.querySelector('#mnemonics-panel');
        if (!container) return;

        // Add V2 features indicator
        const existingBadge = container.querySelector('.v2-mnemonics-badge');
        if (!existingBadge) {
            const stats = mnemonicsManager.getStatistics();
            const badge = document.createElement('div');
            badge.className = 'v2-mnemonics-badge';
            badge.style.cssText = `
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                margin-bottom: 16px;
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            `;
            badge.innerHTML = `
                <div>🧠 <strong>${stats.totalMnemonics}</strong> Medical Mnemonics</div>
                <div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">
                    ${stats.totalCategories} Categories • Memory Aids for Clinical Practice
                </div>
            `;
            
            const searchContainer = container.querySelector('.search-container');
            if (searchContainer) {
                container.insertBefore(badge, searchContainer);
            } else {
                container.insertBefore(badge, container.firstChild);
            }
        }

        console.log('✨ Enhanced mnemonics with V2 manager stats');
    }

    /**
     * Enhance interpretation tools with V2 manager features
     */
    enhanceInterpretationTools() {
        const container = document.querySelector('#interpretation-panel') || document.querySelector('#interpretation-container');
        if (!container) return;

        // Add V2 features indicator
        const existingBadge = container.querySelector('.v2-interpretation-badge');
        if (!existingBadge) {
            const stats = interpretationToolsManager.getStatistics();
            const badge = document.createElement('div');
            badge.className = 'v2-interpretation-badge';
            badge.style.cssText = `
                background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                margin-bottom: 16px;
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(250, 112, 154, 0.3);
            `;
            badge.innerHTML = `
                <div>📊 <strong>${stats.totalTools}</strong> Interpretation Guides</div>
                <div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">
                    ECG, ABG, Imaging, Lab Results • Systematic Analysis
                </div>
            `;
            
            const searchContainer = container.querySelector('.search-container');
            if (searchContainer) {
                container.insertBefore(badge, searchContainer);
            } else {
                container.insertBefore(badge, container.firstChild);
            }
        }

        console.log('✨ Enhanced interpretation tools with V2 manager stats');
    }

    /**
     * Enhance ladders with V2 manager features
     */
    enhanceLadders() {
        const container = document.querySelector('#ladders-panel');
        if (!container) return;

        // Add V2 features indicator
        const existingBadge = container.querySelector('.v2-ladders-badge');
        if (!existingBadge) {
            const stats = laddersManager.getStatistics();
            const badge = document.createElement('div');
            badge.className = 'v2-ladders-badge';
            badge.style.cssText = `
                background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
                color: #333;
                padding: 8px 16px;
                border-radius: 8px;
                margin-bottom: 16px;
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(168, 237, 234, 0.3);
            `;
            badge.innerHTML = `
                <div>🪜 <strong>${stats.totalLadders}</strong> Treatment Ladders</div>
                <div style="font-size: 11px; margin-top: 4px; opacity: 0.8;">
                    Steroid & Pain Management • Conversion Guides
                </div>
            `;
            
            const tabsContainer = container.querySelector('.ladder-tabs');
            if (tabsContainer) {
                container.insertBefore(badge, tabsContainer);
            } else {
                container.insertBefore(badge, container.firstChild);
            }
        }

        console.log('✨ Enhanced treatment ladders with V2 manager stats');
    }

    /**
     * Setup event bridges between V1 and V2
     */
    setupEventBridges() {
        // Listen to V2 calculator events
        eventBus.on(EVENTS.CALCULATOR_OPENED, (data) => {
            console.log(`🔗 V2 Calculator opened: ${data.name}`);
            // Could track in V1's analytics here if needed
        });

        eventBus.on(EVENTS.CALCULATOR_CALCULATED, (data) => {
            console.log(`🔗 V2 Calculation completed: ${data.name}`);
        });

        // Listen to drug reference events
        eventBus.on('drug:viewed', (data) => {
            console.log(`🔗 V2 Drug viewed: ${data.name}`);
        });

        // Listen to lab values events
        eventBus.on('lab:viewed', (data) => {
            console.log(`🔗 V2 Lab panel viewed: ${data.name}`);
        });

        // Listen to guidelines events
        eventBus.on('guideline:viewed', (data) => {
            console.log(`🔗 V2 Guideline viewed: ${data.name}`);
        });

        console.log('✅ Event bridges established between V1 and V2');
    }

    /**
     * Create V2-powered calculator list (optional alternative UI)
     * This can be used if you want a completely V2-driven calculator interface
     */
    createV2CalculatorList(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container not found: ${containerId}`);
            return;
        }

        const allCalculators = calculatorManager.getAllCalculators();
        
        // Group by category
        const byCategory = {};
        allCalculators.forEach(calc => {
            const cat = calc.category || 'Other';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(calc);
        });

        // Build HTML
        let html = `
            <div class="v2-calculator-header">
                <h3>Medical Calculators</h3>
                <p class="subtitle">${allCalculators.length} calculators across ${Object.keys(byCategory).length} categories</p>
            </div>
        `;

        // Add categories
        Object.entries(byCategory).forEach(([category, calcs]) => {
            html += `
                <div class="calculator-category">
                    <h4 class="category-title">${category}</h4>
                    <div class="calculator-grid">
            `;

            calcs.forEach(calc => {
                html += `
                    <button class="calculator-card" data-calc-id="${calc.id}" onclick="window.v2Integration.openV2Calculator('${calc.id}')">
                        <div class="calc-name">${calc.name}</div>
                        <div class="calc-desc">${calc.description}</div>
                    </button>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        console.log(`✅ Created V2 calculator list with ${allCalculators.length} calculators`);
    }

    /**
     * Open a V2 calculator
     */
    openV2Calculator(calculatorId) {
        // Get V1's calculator detail container
        const detailContainer = document.getElementById('calculator-detail-container');
        if (!detailContainer) {
            console.error('Calculator detail container not found');
            return;
        }

        // Switch V1 to calculator detail view
        if (this.v1App && typeof this.v1App.switchMedicalTool === 'function') {
            this.v1App.switchMedicalTool('calculator-detail');
        }

        // Render V2 calculator
        const success = calculatorManager.renderCalculator(calculatorId, detailContainer);
        
        if (success) {
            // Add back button
            const backBtn = document.createElement('button');
            backBtn.className = 'back-btn';
            backBtn.textContent = '← Back to Calculators';
            backBtn.onclick = () => {
                if (this.v1App) {
                    this.v1App.switchMedicalTool('calculators');
                }
            };
            detailContainer.insertBefore(backBtn, detailContainer.firstChild);
            
            console.log(`✅ Opened V2 calculator: ${calculatorId}`);
        }
    }

    /**
     * Get integration statistics
     */
    getStatistics() {
        return {
            initialized: this.initialized,
            calculators: calculatorManager.getCalculatorCount(),
            drugs: drugReferenceManager.getStatistics().totalDrugs,
            labPanels: labValuesManager.getStatistics().totalPanels,
            guidelines: guidelinesManager.getStatistics().totalGuidelines
        };
    }

    /**
     * Check if V2 is available for a given tool
     */
    isV2Available(toolType) {
        switch(toolType) {
            case 'calculators':
                return calculatorManager.getCalculatorCount() > 0;
            case 'drug-reference':
                return drugReferenceManager.getStatistics().totalDrugs > 0;
            case 'lab-values':
                return labValuesManager.getStatistics().totalPanels > 0;
            case 'guidelines':
                return guidelinesManager.getStatistics().totalGuidelines > 0;
            case 'mnemonics':
                return mnemonicsManager.getStatistics().totalMnemonics > 0;
            case 'interpretation':
                return interpretationToolsManager.getStatistics().totalTools > 0;
            case 'ladders':
                return laddersManager.getStatistics().totalLadders > 0;
            default:
                return false;
        }
    }
}

// Export singleton instance
export const v2Integration = new V2Integration();
