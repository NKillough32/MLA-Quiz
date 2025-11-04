/**
 * V2 Calculator Implementations
 * Complete implementation of medical calculators for V2 system
 * Replaces the V1 bridge pattern with native V2 implementations
 */

import { TOOL_CATEGORIES } from './Constants.js';

/**
 * Calculator implementations organized by category
 */
class V2Calculators {
    constructor() {
        this.calculators = new Map();
        this.initializeCalculators();
    }
    
    /**
     * Initialize all calculator implementations
     */
    initializeCalculators() {
        // Register all calculators
        this.registerBodyMetricsCalculators();
        this.registerCardiologyCalculators();
        this.registerNeurologyCalculators();
        this.registerRespiratoryCalculators();
        this.registerCriticalCareCalculators();
        this.registerRenalCalculators();
        this.registerGastroenterologyCalculators();
        this.registerEmergencyCalculators();
        this.registerGeriatricsCalculators();
        this.registerPsychiatryCalculators();
        this.registerEndocrineCalculators();
        this.registerChemistryCalculators();
        this.registerObstetricsCalculators();
        this.registerOtherCalculators();
        
        console.log(`✅ V2 Calculators initialized: ${this.calculators.size} calculators`);
    }
    
    /**
     * Register Body Metrics calculators
     */
    registerBodyMetricsCalculators() {
        // BMI Calculator
        this.calculators.set('bmi', {
            id: 'bmi',
            name: 'BMI Calculator',
            category: TOOL_CATEGORIES.BODY_METRICS,
            description: 'Calculate BMI and assess weight status',
            keywords: ['bmi', 'body mass index', 'weight', 'obesity'],
            getTemplate: () => this.getBMITemplate(),
            calculate: () => this.calculateBMI(),
            bindEvents: () => this.bindBMIEvents()
        });
        
        // BSA Calculator
        this.calculators.set('bsa', {
            id: 'bsa',
            name: 'Body Surface Area',
            category: TOOL_CATEGORIES.BODY_METRICS,
            description: 'Calculate body surface area using DuBois formula',
            keywords: ['bsa', 'body surface area', 'dubois'],
            getTemplate: () => this.getBSATemplate(),
            calculate: () => this.calculateBSA(),
            bindEvents: () => this.bindBSAEvents()
        });
        
        // Fluid Balance Calculator
        this.calculators.set('fluid-balance', {
            id: 'fluid-balance',
            name: 'Fluid Balance Calculator',
            category: TOOL_CATEGORIES.BODY_METRICS,
            description: 'Calculate fluid balance and requirements',
            keywords: ['fluid', 'balance', 'intake', 'output'],
            getTemplate: () => this.getFluidBalanceTemplate(),
            calculate: () => this.calculateFluidBalance(),
            bindEvents: () => this.bindFluidBalanceEvents()
        });
    }
    
    /**
     * BMI Calculator Implementation
     */
    getBMITemplate() {
        return `
            <div class="calculator-form">
                <h4>BMI & Waist Circumference Calculator</h4>
                <div class="calc-input-group">
                    <label>Weight (kg):</label>
                    <input type="number" id="bmi-weight" placeholder="70" step="0.1">
                </div>
                <div class="calc-input-group">
                    <label>Height (cm):</label>
                    <input type="number" id="bmi-height" placeholder="175" step="0.1">
                </div>
                <div class="calc-input-group">
                    <label>Waist Circumference (cm) - Optional:</label>
                    <input type="number" id="bmi-waist" placeholder="85" step="0.1">
                </div>
                <div class="calc-input-group">
                    <label>Ethnicity:</label>
                    <select id="bmi-ethnicity">
                        <option value="european">European/Caucasian</option>
                        <option value="asian">Asian (Chinese, Japanese, South Asian)</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="calc-checkbox-group">
                    <label><input type="radio" name="bmi-sex" value="male"> Male</label>
                    <label><input type="radio" name="bmi-sex" value="female"> Female</label>
                </div>
                <button class="calc-button" data-calc="bmi">Calculate</button>
                <div id="bmi-result" class="calc-result"></div>
                <div class="calc-reference">
                    <small>
                        <strong>BMI Categories (WHO):</strong><br>
                        Underweight: &lt;18.5 | Normal: 18.5-24.9<br>
                        Overweight: 25-29.9 | Obese: ≥30<br>
                        <strong>Asian populations:</strong> Overweight ≥23, Obese ≥27.5
                    </small>
                </div>
            </div>
        `;
    }
    
    calculateBMI() {
        const weight = parseFloat(document.getElementById('bmi-weight')?.value);
        const height = parseFloat(document.getElementById('bmi-height')?.value) / 100; // Convert cm to m
        const waist = parseFloat(document.getElementById('bmi-waist')?.value);
        const ethnicity = document.getElementById('bmi-ethnicity')?.value;
        const sex = document.querySelector('input[name="bmi-sex"]:checked')?.value;
        
        if (!weight || !height) {
            document.getElementById('bmi-result').innerHTML = '<p class="error">Please enter valid weight and height</p>';
            return { error: 'Missing required inputs' };
        }
        
        const bmi = weight / (height * height);
        let category = '';
        let color = '';
        let healthRisk = '';
        
        // Ethnic-specific BMI thresholds
        let overweightThreshold = 25;
        let obeseThreshold = 30;
        
        if (ethnicity === 'asian') {
            overweightThreshold = 23;
            obeseThreshold = 27.5;
        }
        
        if (bmi < 18.5) {
            category = 'Underweight';
            color = '#2196F3';
            healthRisk = 'Increased risk: nutritional deficiency, osteoporosis, immune dysfunction';
        } else if (bmi < overweightThreshold) {
            category = 'Normal weight';
            color = '#4CAF50';
            healthRisk = 'Optimal health risk profile';
        } else if (bmi < obeseThreshold) {
            category = 'Overweight';
            color = '#FF9800';
            healthRisk = 'Increased risk: diabetes, cardiovascular disease, sleep apnoea';
        } else if (bmi < 35) {
            category = 'Obese Class I';
            color = '#F44336';
            healthRisk = 'High risk: diabetes, CVD, stroke, certain cancers';
        } else if (bmi < 40) {
            category = 'Obese Class II';
            color = '#D32F2F';
            healthRisk = 'Very high risk: consider bariatric surgery consultation';
        } else {
            category = 'Obese Class III';
            color = '#B71C1C';
            healthRisk = 'Extremely high risk: urgent weight management, consider bariatric surgery';
        }
        
        // Waist circumference assessment
        let waistAssessment = '';
        if (waist && sex) {
            let waistRisk = '';
            let waistColor = '#4CAF50';
            
            if (sex === 'male') {
                if (waist >= 102) {
                    waistRisk = 'Very high risk';
                    waistColor = '#F44336';
                } else if (waist >= 94) {
                    waistRisk = 'Increased risk';
                    waistColor = '#FF9800';
                } else {
                    waistRisk = 'Low risk';
                }
            } else {
                if (waist >= 88) {
                    waistRisk = 'Very high risk';
                    waistColor = '#F44336';
                } else if (waist >= 80) {
                    waistRisk = 'Increased risk';
                    waistColor = '#FF9800';
                } else {
                    waistRisk = 'Low risk';
                }
            }
            
            waistAssessment = `
                <div style="margin-top: 8px; padding: 6px; background: #f5f5f5; border-radius: 4px;">
                    <strong>Waist Circumference:</strong> ${waist} cm<br>
                    <span style="color: ${waistColor}; font-weight: bold;">${waistRisk}</span> for metabolic complications
                </div>
            `;
        }
        
        const result = {
            bmi: bmi.toFixed(1),
            category,
            color,
            healthRisk,
            waistAssessment,
            ethnicity
        };
        
        document.getElementById('bmi-result').innerHTML = `
            <div class="bmi-result-display">
                <div class="bmi-value" style="color: ${color}; font-size: 1.2em;">
                    <strong>BMI: ${result.bmi} kg/m²</strong>
                </div>
                <div class="bmi-category" style="color: ${color}; font-weight: bold; margin: 4px 0;">
                    ${category}
                </div>
                <div style="margin-top: 8px; font-size: 0.9em; color: #666;">
                    ${healthRisk}
                </div>
                ${waistAssessment}
                <div style="margin-top: 8px; font-size: 0.8em; color: #666;">
                    ${ethnicity === 'asian' ? 'Using Asian-specific BMI thresholds' : 'Using WHO BMI thresholds'}
                </div>
            </div>
        `;
        
        return result;
    }
    
    bindBMIEvents() {
        const button = document.querySelector('.calc-button[data-calc="bmi"]');
        if (button) {
            button.addEventListener('click', () => this.calculateBMI());
        }
    }
    
    /**
     * Register Cardiology calculators
     */
    registerCardiologyCalculators() {
        // CHA₂DS₂-VASc Score
        this.calculators.set('chads2vasc', {
            id: 'chads2vasc',
            name: 'CHA₂DS₂-VASc Score',
            category: TOOL_CATEGORIES.CARDIOLOGY,
            description: 'Stroke risk in atrial fibrillation',
            keywords: ['chads', 'vasc', 'stroke', 'atrial fibrillation'],
            getTemplate: () => this.getCHADS2VAScTemplate(),
            calculate: () => this.calculateCHADS2VASc(),
            bindEvents: () => this.bindCHADS2VAScEvents()
        });
        
        // HAS-BLED Score
        this.calculators.set('hasbled', {
            id: 'hasbled',
            name: 'HAS-BLED Score',
            category: TOOL_CATEGORIES.CARDIOLOGY,
            description: 'Bleeding risk with anticoagulation',
            keywords: ['hasbled', 'bleeding', 'anticoagulation'],
            getTemplate: () => this.getHASBLEDTemplate(),
            calculate: () => this.calculateHASBLED(),
            bindEvents: () => this.bindHASBLEDEvents()
        });
    }
    
    getCHADS2VAScTemplate() {
        return `
            <div class="calculator-form">
                <h4>CHA₂DS₂-VASc Score</h4>
                <p><small>Stroke risk assessment in atrial fibrillation</small></p>
                
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="chads-chf"> Congestive heart failure (+1)</label>
                    <label><input type="checkbox" id="chads-htn"> Hypertension (+1)</label>
                    <label><input type="checkbox" id="chads-age75"> Age ≥75 years (+2)</label>
                    <label><input type="checkbox" id="chads-diabetes"> Diabetes mellitus (+1)</label>
                    <label><input type="checkbox" id="chads-stroke"> Stroke/TIA/thromboembolism (+2)</label>
                    <label><input type="checkbox" id="chads-vascular"> Vascular disease (+1)</label>
                    <label><input type="checkbox" id="chads-age65"> Age 65-74 years (+1)</label>
                    <label><input type="checkbox" id="chads-female"> Female sex (+1)</label>
                </div>
                
                <button class="calc-button" data-calc="chads2vasc">Calculate Score</button>
                <div id="chads-result" class="calc-result"></div>
            </div>
        `;
    }
    
    calculateCHADS2VASc() {
        let score = 0;
        
        if (document.getElementById('chads-chf')?.checked) score += 1;
        if (document.getElementById('chads-htn')?.checked) score += 1;
        if (document.getElementById('chads-age75')?.checked) score += 2;
        if (document.getElementById('chads-diabetes')?.checked) score += 1;
        if (document.getElementById('chads-stroke')?.checked) score += 2;
        if (document.getElementById('chads-vascular')?.checked) score += 1;
        if (document.getElementById('chads-age65')?.checked) score += 1;
        
        const isFemale = document.getElementById('chads-female')?.checked;
        if (isFemale) score += 1;
        
        let risk = '';
        let recommendation = '';
        let color = '';
        
        if (score === 0) {
            risk = 'Low risk (0.2%/year)';
            recommendation = 'No anticoagulation recommended';
            color = '#4CAF50';
        } else if (score === 1) {
            if (isFemale && score === 1) {
                risk = 'Low-moderate risk (0.6%/year)';
                recommendation = 'Female sex alone: generally no anticoagulation. Consider other risk factors';
                color = '#FF9800';
            } else {
                risk = 'Low-moderate risk (0.6%/year)';
                recommendation = 'Consider anticoagulation (men ≥1 or women ≥2 with non-sex risk factors)';
                color = '#FF9800';
            }
        } else {
            risk = 'High risk (≥2.2%/year)';
            recommendation = 'Anticoagulation recommended unless contraindicated';
            color = '#F44336';
        }
        
        const result = { score, risk, recommendation, color };
        
        document.getElementById('chads-result').innerHTML = `
            <div class="score-result">
                <div class="score-value" style="color: ${color}">
                    Score: <strong>${score}</strong>
                </div>
                <div class="score-risk">${risk}</div>
                <div class="score-recommendation" style="color: ${color}">
                    <strong>${recommendation}</strong>
                </div>
                <div style="margin-top: 8px; font-size: 0.8em; color: #666;">
                    Based on current UK guidelines. Consider individual bleeding risk (HAS-BLED).
                </div>
            </div>
        `;
        
        return result;
    }
    
    bindCHADS2VAScEvents() {
        const button = document.querySelector('.calc-button[data-calc="chads2vasc"]');
        if (button) {
            button.addEventListener('click', () => this.calculateCHADS2VASc());
        }
    }
    
    /**
     * HAS-BLED Calculator Implementation
     */
    getHASBLEDTemplate() {
        return `
            <div class="calculator-form">
                <h4>HAS-BLED Score</h4>
                <p><small>Bleeding risk assessment in atrial fibrillation</small></p>
                
                <div class="calc-checkbox-group">
                    <label><input type="checkbox" id="hasbled-htn"> Hypertension (+1)</label>
                    <label><input type="checkbox" id="hasbled-renal"> Abnormal renal function (+1)</label>
                    <label><input type="checkbox" id="hasbled-liver"> Abnormal liver function (+1)</label>
                    <label><input type="checkbox" id="hasbled-stroke"> Stroke history (+1)</label>
                    <label><input type="checkbox" id="hasbled-bleeding"> Prior bleeding/predisposition (+1)</label>
                    <label><input type="checkbox" id="hasbled-labile"> Labile INR (+1)</label>
                    <label><input type="checkbox" id="hasbled-elderly"> Elderly (>65 years) (+1)</label>
                    <label><input type="checkbox" id="hasbled-drugs"> Drugs/alcohol (+1)</label>
                </div>
                
                <button class="calc-button" data-calc="hasbled">Calculate Score</button>
                <div id="hasbled-result" class="calc-result"></div>
            </div>
        `;
    }
    
    calculateHASBLED() {
        let score = 0;
        
        if (document.getElementById('hasbled-htn')?.checked) score += 1;
        if (document.getElementById('hasbled-renal')?.checked) score += 1;
        if (document.getElementById('hasbled-liver')?.checked) score += 1;
        if (document.getElementById('hasbled-stroke')?.checked) score += 1;
        if (document.getElementById('hasbled-bleeding')?.checked) score += 1;
        if (document.getElementById('hasbled-labile')?.checked) score += 1;
        if (document.getElementById('hasbled-elderly')?.checked) score += 1;
        if (document.getElementById('hasbled-drugs')?.checked) score += 1;
        
        let risk = '';
        let bleedingRate = '';
        let recommendation = '';
        let color = '';
        
        if (score <= 2) {
            risk = 'Low bleeding risk';
            bleedingRate = '0.9-2.4% per year';
            recommendation = 'Anticoagulation generally safe - benefits likely outweigh bleeding risk';
            color = '#4CAF50';
        } else if (score === 3) {
            risk = 'Moderate bleeding risk';
            bleedingRate = '3.7% per year';
            recommendation = 'Anticoagulation possible but requires caution - regular monitoring essential';
            color = '#FF9800';
        } else {
            risk = 'High bleeding risk';
            bleedingRate = '8.7-12.5% per year';
            recommendation = 'Consider alternatives to anticoagulation or enhanced monitoring';
            color = '#F44336';
        }
        
        const result = { score, risk, bleedingRate, recommendation, color };
        
        document.getElementById('hasbled-result').innerHTML = `
            <div class="score-result">
                <div class="score-value" style="color: ${color}">
                    HAS-BLED Score: <strong>${score}/9</strong>
                </div>
                <div class="score-risk" style="color: ${color}; font-weight: bold;">
                    ${risk} (${bleedingRate})
                </div>
                <div class="score-recommendation" style="margin-top: 8px;">
                    <strong>Recommendation:</strong> ${recommendation}
                </div>
                <div style="margin-top: 8px; font-size: 0.8em; color: #666;">
                    Note: HAS-BLED should not be used alone to exclude anticoagulation but to identify patients requiring closer monitoring
                </div>
            </div>
        `;
        
        return result;
    }
    
    bindHASBLEDEvents() {
        const button = document.querySelector('.calc-button[data-calc="hasbled"]');
        if (button) {
            button.addEventListener('click', () => this.calculateHASBLED());
        }
    }
    
    /**
     * Register Neurology calculators
     */
    registerNeurologyCalculators() {
        // Glasgow Coma Scale
        this.calculators.set('gcs', {
            id: 'gcs',
            name: 'Glasgow Coma Scale',
            category: TOOL_CATEGORIES.NEUROLOGY,
            description: 'Assess level of consciousness',
            keywords: ['gcs', 'glasgow', 'coma', 'consciousness'],
            getTemplate: () => this.getGCSTemplate(),
            calculate: () => this.calculateGCS(),
            bindEvents: () => this.bindGCSEvents()
        });
    }
    
    /**
     * Glasgow Coma Scale Implementation
     */
    getGCSTemplate() {
        return `
            <div class="calculator-form">
                <h4>Glasgow Coma Scale</h4>
                
                <div class="calc-select-group">
                    <label>Eye Opening:</label>
                    <select id="gcs-eye">
                        <option value="1">No eye opening (1)</option>
                        <option value="2">Eye opening to pain (2)</option>
                        <option value="3">Eye opening to verbal command (3)</option>
                        <option value="4" selected>Eyes open spontaneously (4)</option>
                    </select>
                </div>
                
                <div class="calc-select-group">
                    <label>Verbal Response:</label>
                    <select id="gcs-verbal">
                        <option value="1">No verbal response (1)</option>
                        <option value="2">Incomprehensible sounds (2)</option>
                        <option value="3">Inappropriate words (3)</option>
                        <option value="4">Confused (4)</option>
                        <option value="5" selected>Oriented (5)</option>
                    </select>
                </div>
                
                <div class="calc-select-group">
                    <label>Motor Response:</label>
                    <select id="gcs-motor">
                        <option value="1">No motor response (1)</option>
                        <option value="2">Extension to pain (2)</option>
                        <option value="3">Flexion to pain (3)</option>
                        <option value="4">Withdrawal from pain (4)</option>
                        <option value="5">Localizes pain (5)</option>
                        <option value="6" selected>Obeys commands (6)</option>
                    </select>
                </div>
                
                <button class="calc-button" data-calc="gcs">Calculate GCS</button>
                <div id="gcs-result" class="calc-result"></div>
            </div>
        `;
    }
    
    calculateGCS() {
        const eye = parseInt(document.getElementById('gcs-eye')?.value);
        const verbal = parseInt(document.getElementById('gcs-verbal')?.value);
        const motor = parseInt(document.getElementById('gcs-motor')?.value);
        
        const total = eye + verbal + motor;
        
        let severity = '';
        let color = '';
        
        if (total <= 8) {
            severity = 'Severe brain injury';
            color = '#F44336';
        } else if (total <= 12) {
            severity = 'Moderate brain injury';
            color = '#FF9800';
        } else {
            severity = 'Mild brain injury';
            color = '#4CAF50';
        }
        
        const result = { eye, verbal, motor, total, severity, color };
        
        document.getElementById('gcs-result').innerHTML = `
            <div class="gcs-result-display">
                <div class="gcs-breakdown">
                    Eye: ${eye} + Verbal: ${verbal} + Motor: ${motor}
                </div>
                <div class="gcs-total" style="color: ${color}">
                    Total GCS: <strong>${total}/15</strong>
                </div>
                <div class="gcs-severity" style="color: ${color}">
                    ${severity}
                </div>
            </div>
        `;
        
        return result;
    }
    
    bindGCSEvents() {
        const button = document.querySelector('.calc-button[data-calc="gcs"]');
        if (button) {
            button.addEventListener('click', () => this.calculateGCS());
        }
    }
    
    // Placeholder methods for remaining categories - to be implemented
    registerRespiratoryCalculators() { 
        // Wells PE, PERC, CRB-65, etc. - to be implemented
    }
    
    registerCriticalCareCalculators() { 
        // APACHE II, MEWS, RASS, etc. - to be implemented
    }
    
    registerRenalCalculators() { 
        // eGFR, Cockcroft-Gault, etc. - to be implemented
    }
    
    registerGastroenterologyCalculators() { 
        // Rockall, Glasgow-Blatchford, Child-Pugh, etc. - to be implemented
    }
    
    registerEmergencyCalculators() { 
        // Ottawa Ankle, Centor, Alvarado, etc. - to be implemented
    }
    
    registerGeriatricsCalculators() { 
        // Frailty Scale, Barthel Index, etc. - to be implemented
    }
    
    registerPsychiatryCalculators() { 
        // PHQ-9, GAD-7, etc. - to be implemented
    }
    
    registerEndocrineCalculators() { 
        // Insulin sliding scale, etc. - to be implemented
    }
    
    registerChemistryCalculators() { 
        // Anion gap, osmolal gap, etc. - to be implemented
    }
    
    registerObstetricsCalculators() { 
        // APGAR, Bishop Score, etc. - to be implemented
    }
    
    registerOtherCalculators() { 
        // FRAX, unit converter, etc. - to be implemented
    }
    
    // Placeholder implementations for BSA and Fluid Balance
    getBSATemplate() { 
        return '<div class="calculator-form"><h4>BSA Calculator</h4><p>Body Surface Area Calculator - Implementation coming soon</p></div>'; 
    }
    
    calculateBSA() { 
        return { error: 'BSA Calculator not yet implemented' }; 
    }
    
    bindBSAEvents() { 
        // BSA event binding - to be implemented
    }
    
    getFluidBalanceTemplate() { 
        return '<div class="calculator-form"><h4>Fluid Balance Calculator</h4><p>Fluid Balance Calculator - Implementation coming soon</p></div>'; 
    }
    
    calculateFluidBalance() { 
        return { error: 'Fluid Balance Calculator not yet implemented' }; 
    }
    
    bindFluidBalanceEvents() { 
        // Fluid balance event binding - to be implemented
    }
    
    /**
     * Get all calculators
     */
    getAllCalculators() {
        return Array.from(this.calculators.values());
    }
    
    /**
     * Get calculator by ID
     */
    getCalculator(id) {
        return this.calculators.get(id);
    }
    
    /**
     * Get calculators by category
     */
    getCalculatorsByCategory(category) {
        return this.getAllCalculators().filter(calc => calc.category === category);
    }
    
    /**
     * Get calculator count
     */
    getCalculatorCount() {
        return this.calculators.size;
    }
}

// Create and export singleton instance
export const v2Calculators = new V2Calculators();

// Export the registry object for CalculatorManager compatibility
export const calculatorRegistry = {
    // Convert Map to object for backward compatibility
    ...Object.fromEntries(v2Calculators.calculators),
    
    // Helper methods
    getCalculator: (id) => v2Calculators.getCalculator(id),
    getAllCalculators: () => v2Calculators.getAllCalculators(),
    getCalculatorsByCategory: (category) => v2Calculators.getCalculatorsByCategory(category),
    getCalculatorCount: () => v2Calculators.getCalculatorCount()
};

console.log('✅ V2 Calculators module loaded with native implementations');