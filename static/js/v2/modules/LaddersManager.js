/**
 * LaddersManager.js - V2 Clinical Treatment Ladders Manager
 * 
 * Manages steroid and pain treatment ladders with equivalent dosing and conversion guides.
 * Extracted from V1 to provide clean, modular architecture for V2.
 * 
 * Features:
 * - Steroid potency comparison and equivalent dosing
 * - WHO Pain Ladder with systematic approach
 * - Opioid conversion calculations
 * - Adjuvant analgesics for different pain types
 * - Clinical pearls and safety guidelines
 * - Tab-based navigation between different ladders
 */

class LaddersManager {
    constructor() {
        this.ladderTabsInitialized = false;
        this.activeLadder = 'steroids';
        this.laddersData = this.initializeLaddersData();
        
        console.log('🪜 LaddersManager initialized with steroid and pain ladders');
    }

    /**
     * Initialize the ladders data structure
     * @returns {Object} Complete ladders data
     */
    initializeLaddersData() {
        return {
            steroids: {
                name: 'Corticosteroid Ladder',
                description: 'Glucocorticoid potency and equivalent dosing',
                icon: '💊',
                medications: [
                    {
                        name: 'Betamethasone',
                        potency: '25-30x',
                        equivalentDose: '0.75 mg',
                        duration: '36-54h',
                        clinicalUses: 'Fetal lung maturation, severe inflammation',
                        category: 'ultra-high'
                    },
                    {
                        name: 'Dexamethasone',
                        potency: '25-30x',
                        equivalentDose: '0.75 mg',
                        duration: '36-54h',
                        clinicalUses: 'Cerebral oedema, croup, severe asthma, COVID-19',
                        category: 'ultra-high'
                    },
                    {
                        name: 'Methylprednisolone',
                        potency: '5x',
                        equivalentDose: '4 mg',
                        duration: '12-36h',
                        clinicalUses: 'Acute asthma, COPD, spinal cord injury',
                        category: 'high'
                    },
                    {
                        name: 'Prednisolone',
                        potency: '4x',
                        equivalentDose: '5 mg',
                        duration: '12-36h',
                        clinicalUses: 'Asthma, COPD, polymyalgia rheumatica, IBD',
                        category: 'high'
                    },
                    {
                        name: 'Hydrocortisone',
                        potency: '1x (baseline)',
                        equivalentDose: '20 mg',
                        duration: '8-12h',
                        clinicalUses: 'Addison\'s, adrenal crisis, septic shock',
                        category: 'medium'
                    },
                    {
                        name: 'Cortisone',
                        potency: '0.8x',
                        equivalentDose: '25 mg',
                        duration: '8-12h',
                        clinicalUses: 'Rarely used (requires hepatic conversion)',
                        category: 'low'
                    }
                ],
                categories: {
                    'ultra-high': {
                        name: 'High Potency (Long-acting)',
                        color: '#dc3545',
                        medications: 'Dexamethasone, Betamethasone',
                        features: [
                            'Minimal mineralocorticoid activity',
                            'Suitable for cerebral oedema',
                            'Used in fetal lung maturation',
                            'Severe inflammatory conditions'
                        ]
                    },
                    'high': {
                        name: 'Intermediate Potency',
                        color: '#fd7e14',
                        medications: 'Prednisolone, Methylprednisolone',
                        features: [
                            'Most common for systemic use',
                            'Acute asthma exacerbations',
                            'COPD exacerbations',
                            'Autoimmune conditions',
                            'IBD flares'
                        ]
                    },
                    'medium': {
                        name: 'Low Potency (Short-acting)',
                        color: '#ffc107',
                        medications: 'Hydrocortisone',
                        features: [
                            'Physiological replacement therapy',
                            'Addison\'s disease',
                            'Adrenal crisis',
                            'Has mineralocorticoid activity'
                        ]
                    }
                },
                clinicalPearls: [
                    'Conversion: Prednisolone 40mg ≈ Hydrocortisone 100mg ≈ Dexamethasone 6mg',
                    'Tapering: Required if >3 weeks use, >40mg/day prednisolone, or evening doses',
                    'Side effects: Hyperglycaemia, immunosuppression, osteoporosis, adrenal suppression',
                    'Morning dosing: Mimics physiological cortisol rhythm (except dexamethasone)',
                    'PPI protection: Consider if high-dose, elderly, or GI risk factors'
                ]
            },
            pain: {
                name: 'WHO Analgesic Ladder',
                description: 'Stepwise approach to pain management',
                icon: '🎚️',
                steps: [
                    {
                        step: 3,
                        severity: 'Severe Pain (7-10/10)',
                        color: '#dc3545',
                        approach: 'Strong Opioids ± Non-opioid ± Adjuvant',
                        medications: [
                            {
                                name: 'Morphine',
                                dose: '5-10mg PO/2.5-5mg SC/IV 4-hourly (immediate release)',
                                note: 'Gold standard, predictable'
                            },
                            {
                                name: 'Oxycodone',
                                dose: '5-10mg PO 4-6 hourly',
                                note: '1.5x potency of morphine'
                            },
                            {
                                name: 'Fentanyl',
                                dose: '12-25mcg/hr patch (change 72-hourly)',
                                note: '100x morphine potency, for stable pain'
                            },
                            {
                                name: 'Buprenorphine',
                                dose: '5-20mcg/hr patch (change weekly)',
                                note: 'Partial agonist, ceiling effect'
                            }
                        ]
                    },
                    {
                        step: 2,
                        severity: 'Moderate Pain (4-6/10)',
                        color: '#fd7e14',
                        approach: 'Weak Opioids ± Non-opioid ± Adjuvant',
                        medications: [
                            {
                                name: 'Codeine',
                                dose: '30-60mg PO 4-6 hourly (max 240mg/day)',
                                note: 'Prodrug, 10% morphine potency'
                            },
                            {
                                name: 'Tramadol',
                                dose: '50-100mg PO/IV 6-hourly (max 400mg/day)',
                                note: 'Mixed mechanism, lower dependence risk'
                            },
                            {
                                name: 'Dihydrocodeine',
                                dose: '30mg PO 4-6 hourly',
                                note: 'Similar to codeine'
                            }
                        ]
                    },
                    {
                        step: 1,
                        severity: 'Mild Pain (1-3/10)',
                        color: '#28a745',
                        approach: 'Non-opioid ± Adjuvant',
                        medications: [
                            {
                                name: 'Paracetamol',
                                dose: '1g PO/IV 6-hourly (max 4g/day)',
                                note: 'Safe, minimal side effects'
                            },
                            {
                                name: 'Ibuprofen',
                                dose: '400mg PO 8-hourly (max 2.4g/day)',
                                note: 'Anti-inflammatory, GI risk'
                            },
                            {
                                name: 'Naproxen',
                                dose: '250-500mg PO 12-hourly',
                                note: 'Longer-acting NSAID'
                            },
                            {
                                name: 'Diclofenac',
                                dose: '50mg PO 8-hourly',
                                note: 'Potent NSAID, CV risk'
                            }
                        ]
                    }
                ],
                adjuvants: {
                    'Neuropathic Pain': [
                        'Amitriptyline: 10-75mg nocte',
                        'Gabapentin: 300mg-1.2g TDS',
                        'Pregabalin: 75-300mg BD',
                        'Duloxetine: 60mg OD'
                    ],
                    'Bone Pain': [
                        'Bisphosphonates (e.g., zoledronic acid)',
                        'Radiotherapy for metastases',
                        'NSAIDs (if safe)'
                    ],
                    'Muscle Spasm': [
                        'Baclofen: 5-20mg TDS',
                        'Diazepam: 2-5mg BD-TDS'
                    ],
                    'Inflammatory Pain': [
                        'Corticosteroids (e.g., dexamethasone 4-8mg OD)'
                    ]
                },
                conversions: [
                    {
                        medication: 'Morphine',
                        route: 'Oral',
                        equivalent: '1 (baseline)'
                    },
                    {
                        medication: 'Morphine',
                        route: 'SC/IV',
                        equivalent: '2-3x oral dose'
                    },
                    {
                        medication: 'Oxycodone',
                        route: 'Oral',
                        equivalent: '1.5-2x'
                    },
                    {
                        medication: 'Codeine',
                        route: 'Oral',
                        equivalent: '÷10'
                    },
                    {
                        medication: 'Tramadol',
                        route: 'Oral',
                        equivalent: '÷10'
                    },
                    {
                        medication: 'Fentanyl patch',
                        route: 'Transdermal',
                        equivalent: '12mcg/hr ≈ 30mg oral morphine/day'
                    },
                    {
                        medication: 'Buprenorphine patch',
                        route: 'Transdermal',
                        equivalent: '5mcg/hr ≈ 12mg oral morphine/day'
                    }
                ],
                clinicalPearls: [
                    'Breakthrough pain: 1/6th of total daily opioid dose for rescue',
                    'Starting strong opioids: Morphine 5mg PO 4-hourly or 2.5mg SC 4-hourly',
                    'Titration: Increase by 30-50% if inadequate pain control',
                    'Constipation: ALL patients on opioids need laxatives (senna + docusate)',
                    'Nausea: Common in first week, prescribe antiemetic prophylactically',
                    'Renal impairment: Avoid morphine, codeine (toxic metabolites); use oxycodone, fentanyl, buprenorphine',
                    'Hepatic impairment: Reduce doses, avoid codeine',
                    'By the mouth: Oral route preferred when possible',
                    'By the clock: Regular dosing, not PRN alone',
                    'Multimodal: Combine paracetamol + NSAID + opioid for additive effect'
                ]
            }
        };
    }

    /**
     * Initialize ladder tabs functionality
     */
    initializeLadderTabs() {
        try {
            // Check if already initialized to avoid duplicate listeners
            if (this.ladderTabsInitialized) return;
            this.ladderTabsInitialized = true;

            console.log('🪜 Initializing ladder tabs...');

            const tabButtons = document.querySelectorAll('.ladder-tab-btn');
            const tabContents = document.querySelectorAll('.ladder-tab-content');

            if (!tabButtons.length || !tabContents.length) {
                console.warn('⚠️ Ladder tab elements not found');
                return;
            }

            tabButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetLadder = button.getAttribute('data-ladder');

                    // Remove active class from all buttons and contents
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));

                    // Add active class to clicked button
                    button.classList.add('active');

                    // Show corresponding content
                    const targetContent = document.getElementById(`${targetLadder}-ladder`);
                    if (targetContent) {
                        targetContent.classList.add('active');
                        this.activeLadder = targetLadder;
                        console.log(`🪜 Switched to ${targetLadder} ladder`);
                    }
                });
            });

            console.log('✅ Ladder tabs initialized successfully');
        } catch (err) {
            console.error('❌ Error initializing ladder tabs:', err);
        }
    }

    /**
     * Load and display ladders panel
     */
    loadLadders() {
        try {
            const container = document.getElementById('ladders-panel');
            if (!container) {
                console.error('❌ Ladders panel container not found');
                return;
            }

            container.innerHTML = `
                <div class="ladders-container">
                    <h2>🪜 Clinical Treatment Ladders</h2>
                    
                    <!-- Tab Navigation -->
                    <div class="ladder-tabs">
                        <button class="ladder-tab-btn active" data-ladder="steroids">💊 Steroid Ladder</button>
                        <button class="ladder-tab-btn" data-ladder="pain">🎚️ Pain Ladder</button>
                    </div>
                    
                    <!-- Steroid Ladder Tab Content -->
                    <div id="steroids-ladder" class="ladder-tab-content active">
                        ${this.renderSteroidLadder()}
                    </div>
                    
                    <!-- Pain Ladder Tab Content -->
                    <div id="pain-ladder" class="ladder-tab-content">
                        ${this.renderPainLadder()}
                    </div>
                </div>
            `;
            
            this.initializeLadderTabs();
            console.log('✅ Ladders loaded successfully!');
            
        } catch (error) {
            console.error('❌ Error loading ladders:', error);
            this.showError('Unable to load treatment ladders. Please refresh the page.');
        }
    }

    /**
     * Render steroid ladder content
     * @returns {string} HTML content for steroid ladder
     */
    renderSteroidLadder() {
        const steroidData = this.laddersData.steroids;
        
        const medicationsTable = steroidData.medications.map(med => `
            <tr class="potency-${med.category}">
                <td><strong>${med.name}</strong></td>
                <td>${med.potency}</td>
                <td>${med.equivalentDose}</td>
                <td>${med.duration}</td>
                <td>${med.clinicalUses}</td>
            </tr>
        `).join('');

        const categoriesCards = Object.entries(steroidData.categories).map(([key, category]) => `
            <div class="category-card">
                <h4 style="color: ${category.color};">🔴 ${category.name}</h4>
                <p><strong>${category.medications}</strong></p>
                <ul>
                    ${category.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
            </div>
        `).join('');

        return `
            <div class="ladder-section">
                <h3>💊 Corticosteroid Ladder</h3>
                <p class="ladder-intro">${steroidData.description}</p>
                
                <div class="steroid-comparison">
                    <table class="ladder-table">
                        <thead>
                            <tr>
                                <th>Steroid</th>
                                <th>Relative Potency</th>
                                <th>Equivalent Dose</th>
                                <th>Duration</th>
                                <th>Clinical Uses</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${medicationsTable}
                        </tbody>
                    </table>
                </div>
                
                <div class="steroid-categories">
                    ${categoriesCards}
                </div>
                
                <div class="clinical-pearl">
                    <h4>💡 Clinical Pearls</h4>
                    <ul>
                        ${steroidData.clinicalPearls.map(pearl => `<li>${pearl}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Render pain ladder content
     * @returns {string} HTML content for pain ladder
     */
    renderPainLadder() {
        const painData = this.laddersData.pain;
        
        const stepsHtml = painData.steps.map(step => `
            <div class="ladder-step step-${step.step}">
                <div class="step-number">Step ${step.step}</div>
                <div class="step-content">
                    <h4 style="color: ${step.color};">${step.severity}</h4>
                    <p><strong>${step.approach}</strong></p>
                    <div class="medication-list">
                        ${step.medications.map(med => `
                            <div class="med-item">
                                <strong>${med.name}</strong>
                                <span>${med.dose}</span>
                                <span class="med-note">${med.note}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        const adjuvantsHtml = Object.entries(painData.adjuvants).map(([type, medications]) => `
            <div class="adjuvant-card">
                <h5>${type}</h5>
                <ul>
                    ${medications.map(med => `<li>${med}</li>`).join('')}
                </ul>
            </div>
        `).join('');

        const conversionsTable = painData.conversions.map(conv => `
            <tr>
                <td>${conv.medication}</td>
                <td>${conv.route}</td>
                <td>${conv.equivalent}</td>
            </tr>
        `).join('');

        return `
            <div class="ladder-section">
                <h3>🎚️ WHO Analgesic Ladder</h3>
                <p class="ladder-intro">${painData.description}</p>
                
                <div class="pain-ladder-visual">
                    ${stepsHtml}
                </div>
                
                <div class="adjuvant-section">
                    <h4>➕ Adjuvant Analgesics (All Steps)</h4>
                    <div class="adjuvant-grid">
                        ${adjuvantsHtml}
                    </div>
                </div>
                
                <div class="opioid-conversion-table">
                    <h4>🔄 Opioid Conversion Guide</h4>
                    <table class="ladder-table">
                        <thead>
                            <tr>
                                <th>Medication</th>
                                <th>Route</th>
                                <th>Oral Morphine Equivalent</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${conversionsTable}
                        </tbody>
                    </table>
                </div>
                
                <div class="clinical-pearl">
                    <h4>💡 Clinical Pearls</h4>
                    <ul>
                        ${painData.clinicalPearls.map(pearl => `<li>${pearl}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Switch to a specific ladder tab
     * @param {string} ladderType - Type of ladder ('steroids' or 'pain')
     */
    switchToLadder(ladderType) {
        const tabButtons = document.querySelectorAll('.ladder-tab-btn');
        const tabContents = document.querySelectorAll('.ladder-tab-content');

        // Remove active class from all
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Activate the selected ladder
        const targetButton = document.querySelector(`[data-ladder="${ladderType}"]`);
        const targetContent = document.getElementById(`${ladderType}-ladder`);

        if (targetButton && targetContent) {
            targetButton.classList.add('active');
            targetContent.classList.add('active');
            this.activeLadder = ladderType;
            console.log(`🪜 Switched to ${ladderType} ladder`);
        }
    }

    /**
     * Get steroid conversion calculation
     * @param {string} fromSteroid - Source steroid name
     * @param {number} dose - Dose amount
     * @param {string} toSteroid - Target steroid name
     * @returns {Object} Conversion result
     */
    convertSteroid(fromSteroid, dose, toSteroid) {
        const steroids = this.laddersData.steroids.medications;
        const fromMed = steroids.find(s => s.name.toLowerCase() === fromSteroid.toLowerCase());
        const toMed = steroids.find(s => s.name.toLowerCase() === toSteroid.toLowerCase());

        if (!fromMed || !toMed) {
            return { error: 'Steroid not found' };
        }

        // Extract numeric potency values
        const fromPotency = parseFloat(fromMed.potency.replace('x', '').replace('(baseline)', '1'));
        const toPotency = parseFloat(toMed.potency.replace('x', '').replace('(baseline)', '1'));

        const convertedDose = (dose * fromPotency) / toPotency;

        return {
            fromSteroid: fromMed.name,
            fromDose: dose,
            toSteroid: toMed.name,
            convertedDose: Math.round(convertedDose * 100) / 100,
            equivalentDose: toMed.equivalentDose,
            duration: toMed.duration
        };
    }

    /**
     * Calculate opioid conversion
     * @param {string} fromOpioid - Source opioid
     * @param {number} dose - Daily dose
     * @param {string} toOpioid - Target opioid
     * @returns {Object} Conversion result
     */
    convertOpioid(fromOpioid, dose, toOpioid) {
        const conversions = this.laddersData.pain.conversions;
        const fromConv = conversions.find(c => c.medication.toLowerCase().includes(fromOpioid.toLowerCase()));
        const toConv = conversions.find(c => c.medication.toLowerCase().includes(toOpioid.toLowerCase()));

        if (!fromConv || !toConv) {
            return { error: 'Opioid not found in conversion table' };
        }

        // This is a simplified conversion - real clinical conversions need more complex calculations
        return {
            fromOpioid: fromConv.medication,
            fromDose: dose,
            toOpioid: toConv.medication,
            note: 'Clinical conversion requires individual assessment and dose adjustment',
            fromEquivalent: fromConv.equivalent,
            toEquivalent: toConv.equivalent
        };
    }

    /**
     * Get current active ladder
     * @returns {string} Active ladder type
     */
    getActiveLadder() {
        return this.activeLadder;
    }

    /**
     * Get ladder data
     * @param {string} ladderType - Type of ladder
     * @returns {Object} Ladder data
     */
    getLadderData(ladderType) {
        return this.laddersData[ladderType];
    }

    /**
     * Get statistics about ladders
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const steroidCount = this.laddersData.steroids.medications.length;
        const painStepsCount = this.laddersData.pain.steps.length;
        const adjuvantCount = Object.keys(this.laddersData.pain.adjuvants).length;
        const conversionCount = this.laddersData.pain.conversions.length;
        
        return {
            totalLadders: Object.keys(this.laddersData).length,
            steroids: {
                medications: steroidCount,
                categories: Object.keys(this.laddersData.steroids.categories).length
            },
            pain: {
                steps: painStepsCount,
                adjuvantTypes: adjuvantCount,
                conversions: conversionCount
            }
        };
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        const container = document.getElementById('ladders-panel');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Ladders Loading Error</h3>
                    <p>${message}</p>
                    <button onclick="window.laddersManager.loadLadders()">Retry</button>
                </div>
            `;
        }
    }
}

// Create singleton instance
const laddersManager = new LaddersManager();

// Export singleton instance
export { laddersManager };
export default laddersManager;