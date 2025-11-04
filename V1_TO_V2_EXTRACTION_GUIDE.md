# V1 to V2 Function Extraction Guide

This document maps V1 functions that need to be copied to V2 and details the integration changes required.

---

## 📋 Overview

**V1 Architecture**: Monolithic `app.js` (22,961 lines) with all functionality in one class  
**V2 Architecture**: Modular system with separate managers for each feature  
**Challenge**: Extract V1 functions and adapt them to V2's event-driven, modular architecture

---

## 🧮 1. CALCULATORS (Priority: CRITICAL)

### V1 Location
- **File**: `static/js/v1/app.js`
- **Lines**: 4809-5212 (initialization), 5212-15000+ (individual calculators)
- **Function**: `loadCalculator(calcType)` - Main dispatcher
- **Individual Functions**: `getBMICalculator()`, `getCHADS2VAScCalculator()`, etc.

### V1 Implementation Pattern

```javascript
// V1 Pattern - Inside MLAQuizApp class
loadCalculator(calcType) {
    this.trackToolUsage('calculator', calcType);
    this.switchMedicalTool('calculator-detail');
    const container = document.getElementById('calculator-detail-container');
    
    let calculatorContent = `
        <div class="calculator-header">
            <button class="back-btn" onclick="window.quizApp.switchMedicalTool('calculators');">← Back</button>
            <h3 id="calculator-title"></h3>
        </div>
        <div class="calculator-content">
    `;
    
    switch (calcType) {
        case 'bmi':
            calculatorTitle = 'BMI Calculator';
            calculatorContent += this.getBMICalculator();
            break;
        case 'chads2vasc':
            calculatorTitle = 'CHA₂DS₂-VASc Score';
            calculatorContent += this.getCHADS2VAScCalculator();
            break;
        // ... 49 more cases
    }
    
    container.innerHTML = calculatorContent;
    this.setupCalculatorNotes(calcType);
}

getBMICalculator() {
    return `
        <div class="calculator-form">
            <h4>BMI & Waist Circumference Calculator</h4>
            <div class="calc-input-group">
                <label>Weight (kg):</label>
                <input type="number" id="bmi-weight" placeholder="70" step="0.1">
            </div>
            <!-- More inputs -->
            <button onclick="window.quizApp.calculateBMI()">Calculate</button>
            <div id="bmi-result" class="calc-result"></div>
        </div>
    `;
}

calculateBMI() {
    const weight = parseFloat(document.getElementById('bmi-weight').value);
    const height = parseFloat(document.getElementById('bmi-height').value) / 100;
    // ... calculation logic
    document.getElementById('bmi-result').innerHTML = `<div>Result: ${result}</div>`;
}
```

### V2 Required Structure

**File to Create**: `static/js/v2/modules/calculators/CalculatorRegistry.js`

```javascript
// V2 Pattern - Separate registry file
export const calculatorRegistry = {
    'bmi': {
        id: 'bmi',
        name: 'BMI Calculator',
        category: 'Body Metrics',
        description: 'Calculate BMI and assess weight status',
        
        // HTML template (extracted from V1)
        getTemplate: () => {
            return `
                <div class="calculator-form">
                    <h4>BMI & Waist Circumference Calculator</h4>
                    <div class="calc-input-group">
                        <label>Weight (kg):</label>
                        <input type="number" id="bmi-weight" placeholder="70" step="0.1">
                    </div>
                    <!-- More inputs -->
                    <button id="bmi-calculate-btn">Calculate</button>
                    <div id="bmi-result" class="calc-result"></div>
                </div>
            `;
        },
        
        // Calculation logic (extracted from V1)
        calculate: () => {
            const weight = parseFloat(document.getElementById('bmi-weight').value);
            const height = parseFloat(document.getElementById('bmi-height').value) / 100;
            
            if (!weight || !height) {
                return { error: 'Please enter valid weight and height' };
            }
            
            const bmi = weight / (height * height);
            let category = '';
            let color = '';
            
            if (bmi < 18.5) {
                category = 'Underweight';
                color = '#2196F3';
            } else if (bmi < 25) {
                category = 'Normal weight';
                color = '#4CAF50';
            } else if (bmi < 30) {
                category = 'Overweight';
                color = '#FF9800';
            } else {
                category = 'Obese';
                color = '#F44336';
            }
            
            return {
                bmi: bmi.toFixed(1),
                category,
                color,
                html: `<div style="color: ${color}"><strong>BMI: ${bmi.toFixed(1)}</strong><br>${category}</div>`
            };
        },
        
        // Event bindings (NEW in V2)
        bindEvents: () => {
            const calculateBtn = document.getElementById('bmi-calculate-btn');
            if (calculateBtn) {
                calculateBtn.addEventListener('click', () => {
                    const result = calculatorRegistry['bmi'].calculate();
                    const resultDiv = document.getElementById('bmi-result');
                    if (result.error) {
                        resultDiv.innerHTML = `<p class="error">${result.error}</p>`;
                    } else {
                        resultDiv.innerHTML = result.html;
                        // Emit event for analytics tracking
                        window.eventBus?.emit('calculator:used', { 
                            calculator: 'bmi', 
                            result: result.bmi 
                        });
                    }
                });
            }
        }
    },
    
    'chads2vasc': {
        id: 'chads2vasc',
        name: 'CHA₂DS₂-VASc Score',
        category: 'Cardiology',
        description: 'Stroke risk in atrial fibrillation',
        getTemplate: () => { /* ... */ },
        calculate: () => { /* ... */ },
        bindEvents: () => { /* ... */ }
    }
    
    // ... 49 more calculators
};
```

### V2 CalculatorManager Integration

**File**: `static/js/v2/modules/CalculatorManager.js` (ALREADY EXISTS)

```javascript
// Current V2 CalculatorManager needs to import the registry
import { calculatorRegistry } from './calculators/CalculatorRegistry.js';

export class CalculatorManager {
    constructor(storageManager, eventBus) {
        this.storage = storageManager;
        this.eventBus = eventBus;
        this.calculators = calculatorRegistry; // ← Import registry
        this.currentCalculator = null;
    }
    
    // Load calculator by ID
    loadCalculator(calcId) {
        const calculator = this.calculators[calcId];
        if (!calculator) {
            console.error(`Calculator not found: ${calcId}`);
            return;
        }
        
        this.currentCalculator = calcId;
        
        // Render template
        const container = document.getElementById('calculator-detail-container');
        container.innerHTML = `
            <div class="calculator-header">
                <button class="back-btn" id="calc-back-btn">← Back to Calculators</button>
                <h3>${calculator.name}</h3>
            </div>
            <div class="calculator-content">
                ${calculator.getTemplate()}
            </div>
        `;
        
        // Bind events for this calculator
        calculator.bindEvents();
        
        // Bind back button
        document.getElementById('calc-back-btn')?.addEventListener('click', () => {
            this.eventBus.emit('ui:switch-tool', { tool: 'calculators' });
        });
        
        // Track usage
        this.eventBus.emit('calculator:loaded', { calculator: calcId });
    }
    
    // Get list of all calculators
    getCalculatorList() {
        return Object.values(this.calculators).map(calc => ({
            id: calc.id,
            name: calc.name,
            category: calc.category,
            description: calc.description
        }));
    }
}
```

### Key Changes Required

| V1 Pattern | V2 Pattern | Change Required |
|------------|------------|-----------------|
| `onclick="window.quizApp.calculateBMI()"` | Event listener binding | Replace inline onclick with `addEventListener` in `bindEvents()` |
| `this.switchMedicalTool()` | `eventBus.emit('ui:switch-tool')` | Use event bus instead of direct method calls |
| `this.trackToolUsage()` | `eventBus.emit('calculator:used')` | Use events for cross-module communication |
| Methods on `MLAQuizApp` class | Functions in registry object | Extract methods to standalone functions |
| Direct DOM manipulation | Return data objects | Separate logic from rendering where possible |
| Global `window.quizApp` reference | Module imports | Use proper ES6 module system |

### Calculators to Extract (51 Total)

1. ✅ **bmi** - BMI Calculator
2. ✅ **chads2vasc** - CHA₂DS₂-VASc Score
3. ✅ **hasbled** - HAS-BLED Score
4. ✅ **gcs** - Glasgow Coma Scale
5. ✅ **apache** - APACHE II Score
6. ✅ **wells** - Wells Score for PE
7. ✅ **qrisk** - QRISK3 Calculator
8. ✅ **madders** - MADDERS Score
9. ✅ **mews** - MEWS Score
10. ✅ **crb65** - CRB-65 Score
11. ✅ **rockall** - Rockall Score
12. ✅ **child-pugh** - Child-Pugh Score
13. ✅ **ottawa-ankle** - Ottawa Ankle Rules
14. ✅ **egfr** - eGFR Calculator
15. ✅ **urea-creatinine** - Urea:Creatinine Ratio
16. ✅ **abcd2** - ABCD² Score
17. ✅ **must** - MUST Score
18. ✅ **waterlow** - Waterlow Score
19. ✅ **grace** - GRACE Score
20. ✅ **crusade** - CRUSADE Score
21. ✅ **phq9** - PHQ-9 Depression Scale
22. ✅ **gad7** - GAD-7 Anxiety Scale
23. ✅ **mse** - Mental State Examination
24. ✅ **mmse** - Mini Mental State Examination
25. ✅ **insulin-sliding** - Insulin Sliding Scale
26. ✅ **vasopressor** - Vasopressor Dosing
27. ✅ **unit-converter** - Clinical Unit Converter
28. ✅ **drug-volume** - Drug Volume Calculator
29. ✅ **news2** - NEWS2 Score
30. ✅ **curb65** - CURB-65 Score
31. ✅ **palliative** - Palliative Care Calculator
32. ✅ **paediatric-dosing** - Paediatric Dosing Calculator
33. ✅ **infusion-rate** - Infusion Rate Calculator
34. ✅ **rass** - RASS Scale
35. ✅ **frax-fracture** - FRAX Fracture Risk
36. ✅ **cockcroft-gault** - Cockcroft-Gault eGFR
37. ✅ **bsa** - Body Surface Area Calculator
38. ✅ **fluid-balance** - Fluid Balance Calculator
39. ✅ **timi** - TIMI Risk Score
40. ✅ **nihss** - NIH Stroke Scale
41. ✅ **rankin** - Modified Rankin Scale
42. ✅ **frailty** - Clinical Frailty Scale (Rockwood)
43. ✅ **barthel** - Barthel Index (ADL)
44. ✅ **anion-gap** - Anion Gap Calculator
45. ✅ **wells-dvt** - Wells DVT Score
46. ✅ **perc** - PERC Rule
47. ✅ **rcri** - Revised Cardiac Risk Index
48. ✅ **qtc** - Corrected QT Calculator
49. ✅ **corrected-sodium** - Corrected Sodium
50. ✅ **osmolal-gap** - Osmolal Gap
51. ✅ **centor** - Centor Score
52. ✅ **alvarado** - Alvarado Score
53. ✅ **glasgow-blatchford** - Glasgow-Blatchford Score
54. ✅ **apgar** - APGAR Score
55. ✅ **bishop** - Bishop Score
56. ✅ **map** - Mean Arterial Pressure
57. ✅ **aa-gradient** - A-a Gradient
58. ✅ **corrected-calcium** - Corrected Calcium
59. ✅ **ldl-calc** - LDL Calculator
60. ✅ **winters** - Winters Formula
61. ✅ **asthma** - Asthma Severity Assessment

---

## 🩺 2. DIFFERENTIAL DIAGNOSIS (Priority: CRITICAL)

### V1 Location
- **File**: `static/js/v1/app.js`
- **Lines**: 15340-16500+
- **Function**: `loadDifferentialDx()`
- **Data Structure**: Nested object `ddxDatabase`

### V1 Implementation Pattern

```javascript
loadDifferentialDx() {
    const ddxDatabase = {
        'chest-pain': {
            title: 'Chest Pain',
            category: 'Cardiovascular/Pulmonary',
            redFlags: '🚩 Sudden onset, severe pain, radiation to back/jaw',
            presentations: {
                'Acute coronary syndrome': {
                    features: 'Crushing, substernal, radiates to left arm/jaw...',
                    tests: 'ECG (ST changes, Q waves), troponins...',
                    urgency: 'Emergency',
                    timeToTreat: '90 minutes door-to-balloon for STEMI',
                    clinicalPearls: 'Women may present atypically...',
                    differentiatingFeatures: 'Chest pressure >20min...'
                },
                'Pulmonary embolism': { /* ... */ },
                // ... more presentations
            }
        },
        'shortness-of-breath': { /* ... */ },
        'abdominal-pain': { /* ... */ },
        // ... more symptoms
    };
    
    // Render symptom list
    const container = document.getElementById('differential-container');
    let html = '<div class="differential-grid">';
    for (const [symptomId, symptomData] of Object.entries(ddxDatabase)) {
        html += `
            <div class="symptom-card" onclick="window.quizApp.showDifferentialDetail('${symptomId}')">
                <h4>${symptomData.title}</h4>
                <p>${symptomData.category}</p>
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
}

showDifferentialDetail(symptomId) {
    const symptomData = ddxDatabase[symptomId];
    // Render detailed view with presentations
}
```

### V2 Required Structure

**File to Create**: `static/js/v2/modules/DifferentialDxManager.js`

```javascript
export class DifferentialDxManager {
    constructor(storageManager, eventBus) {
        this.storage = storageManager;
        this.eventBus = eventBus;
        this.ddxDatabase = this.loadDatabase();
        this.currentSymptom = null;
    }
    
    loadDatabase() {
        return {
            'chest-pain': {
                title: 'Chest Pain',
                category: 'Cardiovascular/Pulmonary',
                redFlags: '🚩 Sudden onset, severe pain...',
                presentations: {
                    'Acute coronary syndrome': { /* ... */ },
                    'Pulmonary embolism': { /* ... */ }
                }
            },
            // ... more symptoms
        };
    }
    
    // Render symptom list
    renderSymptomList(containerId) {
        const container = document.getElementById(containerId);
        let html = '<div class="differential-grid">';
        
        for (const [symptomId, symptomData] of Object.entries(this.ddxDatabase)) {
            html += `
                <div class="symptom-card" data-symptom="${symptomId}">
                    <h4>${symptomData.title}</h4>
                    <p>${symptomData.category}</p>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
        
        // Bind click events
        container.querySelectorAll('.symptom-card').forEach(card => {
            card.addEventListener('click', () => {
                const symptomId = card.dataset.symptom;
                this.showSymptomDetail(symptomId);
            });
        });
    }
    
    // Show detailed differential for a symptom
    showSymptomDetail(symptomId) {
        this.currentSymptom = symptomId;
        const symptomData = this.ddxDatabase[symptomId];
        
        // Emit event for UI manager to switch views
        this.eventBus.emit('differential:symptom-selected', {
            symptomId,
            symptomData
        });
        
        // Track usage
        this.storage.incrementUsage('differential', symptomId);
    }
    
    // Get statistics
    getStatistics() {
        return {
            totalSymptoms: Object.keys(this.ddxDatabase).length,
            totalPresentations: Object.values(this.ddxDatabase)
                .reduce((sum, s) => sum + Object.keys(s.presentations).length, 0),
            initialized: true
        };
    }
}
```

### Key Changes Required

| V1 Pattern | V2 Pattern | Change Required |
|------------|------------|-----------------|
| Inline `onclick` attributes | Event delegation | Add event listeners in `renderSymptomList()` |
| Direct DOM manipulation | Event emission | Use `eventBus.emit()` to notify UIManager |
| Data embedded in function | Separate method | Extract `ddxDatabase` to `loadDatabase()` |
| Global function calls | Module methods | Call methods on manager instance |

### Symptoms to Extract

1. ✅ **chest-pain** - 7 presentations (ACS, PE, pneumothorax, aortic dissection, GERD, costochondritis, anxiety)
2. ✅ **shortness-of-breath** - 6 presentations (heart failure, asthma, COPD, pneumonia, PE, anxiety)
3. ✅ **abdominal-pain** - 12+ presentations (appendicitis, cholecystitis, pancreatitis, bowel obstruction, etc.)
4. **headache** - Multiple presentations
5. **altered-mental-status** - Multiple presentations
6. **fever** - Multiple presentations
7. **syncope** - Multiple presentations
8. **back-pain** - Multiple presentations
9. **joint-pain** - Multiple presentations
10. **rash** - Multiple presentations

---

## 🔬 3. CLINICAL TRIADS (Priority: IMPORTANT)

### V1 Location
- **File**: `static/js/v1/app.js`
- **Lines**: 17236+ (search for `loadTriads`)
- **Function**: `loadTriads()`

### V2 Required Structure

**File to Create**: `static/js/v2/modules/TriadsManager.js`

```javascript
export class TriadsManager {
    constructor(storageManager, eventBus) {
        this.storage = storageManager;
        this.eventBus = eventBus;
        this.triads = this.loadTriads();
    }
    
    loadTriads() {
        return {
            'becks-triad': {
                name: "Beck's Triad",
                category: 'Cardiology',
                condition: 'Cardiac Tamponade',
                features: [
                    'Hypotension',
                    'Muffled heart sounds',
                    'Jugular venous distension (JVD)'
                ],
                clinicalPearls: 'Classic but only present in 30% of cases. Pulsus paradoxus >10mmHg is more sensitive.',
                emergency: true
            },
            'charcots-triad': {
                name: "Charcot's Triad",
                category: 'Gastroenterology',
                condition: 'Ascending Cholangitis',
                features: [
                    'Right upper quadrant pain',
                    'Jaundice',
                    'Fever/Rigors'
                ],
                clinicalPearls: 'Reynolds pentad adds hypotension and confusion (septic shock).',
                emergency: true
            }
            // ... more triads
        };
    }
    
    renderTriadsList(containerId) {
        const container = document.getElementById(containerId);
        let html = '<div class="triads-list">';
        
        for (const [triadId, triadData] of Object.entries(this.triads)) {
            const emergencyBadge = triadData.emergency ? '🚨 ' : '';
            html += `
                <div class="triad-card" data-triad="${triadId}">
                    <h4>${emergencyBadge}${triadData.name}</h4>
                    <p class="condition">${triadData.condition}</p>
                    <p class="category">${triadData.category}</p>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
        
        // Bind events
        container.querySelectorAll('.triad-card').forEach(card => {
            card.addEventListener('click', () => {
                this.showTriadDetail(card.dataset.triad);
            });
        });
    }
    
    showTriadDetail(triadId) {
        const triad = this.triads[triadId];
        this.eventBus.emit('triad:selected', { triadId, triad });
        this.storage.incrementUsage('triads', triadId);
    }
    
    getStatistics() {
        return {
            totalTriads: Object.keys(this.triads).length,
            emergencyTriads: Object.values(this.triads).filter(t => t.emergency).length,
            initialized: true
        };
    }
}
```

---

## 🩹 4. EXAMINATION GUIDES (Priority: IMPORTANT)

### V1 Location
- **File**: `static/js/v1/app.js`
- **Lines**: 17415+ (search for `loadExaminationGuide`)
- **Function**: `loadExaminationGuide()`

### V2 Required Structure

**File to Create**: `static/js/v2/modules/ExaminationManager.js`

```javascript
export class ExaminationManager {
    constructor(storageManager, eventBus) {
        this.storage = storageManager;
        this.eventBus = eventBus;
        this.examinations = this.loadExaminations();
    }
    
    loadExaminations() {
        return {
            'cardiovascular': {
                name: 'Cardiovascular Examination',
                system: 'Cardiovascular',
                steps: [
                    {
                        stage: 'General Inspection',
                        actions: [
                            'Patient comfort and distress',
                            'Peripheral cyanosis',
                            'Peripheral oedema',
                            'Breathlessness'
                        ]
                    },
                    {
                        stage: 'Hands',
                        actions: [
                            'Temperature and colour',
                            'Clubbing',
                            'Splinter haemorrhages',
                            'Capillary refill time'
                        ]
                    }
                    // ... more steps
                ],
                clinicalPearls: 'Always inspect, palpate, percuss, auscultate in order.'
            }
            // ... more examinations
        };
    }
    
    renderExaminationList(containerId) {
        // Similar pattern to other managers
    }
    
    showExaminationDetail(examId) {
        const exam = this.examinations[examId];
        this.eventBus.emit('examination:selected', { examId, exam });
    }
}
```

---

## 🚨 5. EMERGENCY PROTOCOLS (Priority: IMPORTANT)

### V1 Location
- **File**: `static/js/v1/app.js`
- **Lines**: 20782+ (search for `loadEmergencyProtocols`)
- **Function**: `loadEmergencyProtocols()`

### V2 Required Structure

**File to Create**: `static/js/v2/modules/EmergencyProtocolsManager.js`

```javascript
export class EmergencyProtocolsManager {
    constructor(storageManager, eventBus) {
        this.storage = storageManager;
        this.eventBus = eventBus;
        this.protocols = this.loadProtocols();
    }
    
    loadProtocols() {
        return {
            'anaphylaxis': {
                name: 'Anaphylaxis',
                category: 'Allergy/Immunology',
                severity: 'Life-threatening',
                immediateActions: [
                    'Remove trigger if possible',
                    'Call for help',
                    'IM Adrenaline 0.5mg (0.5mL of 1:1000) into anterolateral thigh',
                    'Lie patient flat with legs raised',
                    'High-flow oxygen'
                ],
                dosing: {
                    adult: '0.5mg IM (0.5mL of 1:1000)',
                    child: '0.15mg (<6 years), 0.3mg (6-12 years)'
                },
                monitoring: 'Repeat adrenaline every 5 minutes if no improvement',
                clinicalPearls: 'Adrenaline is the ONLY life-saving drug in anaphylaxis.'
            }
            // ... more protocols
        };
    }
    
    renderProtocolsList(containerId) {
        // Similar pattern
    }
    
    showProtocolDetail(protocolId) {
        const protocol = this.protocols[protocolId];
        this.eventBus.emit('protocol:selected', { protocolId, protocol });
    }
}
```

---

## 🔄 Integration Changes Summary

### Global Changes Across All Modules

| V1 Pattern | V2 Pattern | Reason |
|------------|------------|--------|
| `onclick="window.quizApp.method()"` | Event listeners with `addEventListener` | Separation of concerns, better memory management |
| `this.switchMedicalTool()` | `eventBus.emit('ui:switch-tool', {tool})` | Decouple modules |
| `this.trackToolUsage()` | `eventBus.emit('analytics:track', {data})` | Centralized analytics |
| Direct DOM updates | Emit events, let UIManager handle | Single responsibility |
| Class methods | Module exports | ES6 modules |
| `window.quizApp` global | Module imports | No globals |

### Event Bus Events to Implement

```javascript
// Calculator events
eventBus.emit('calculator:loaded', { calculator: 'bmi' });
eventBus.emit('calculator:used', { calculator: 'bmi', result: 24.5 });

// Differential events
eventBus.emit('differential:symptom-selected', { symptomId, symptomData });

// Triad events
eventBus.emit('triad:selected', { triadId, triad });

// Examination events
eventBus.emit('examination:selected', { examId, exam });

// Protocol events
eventBus.emit('protocol:selected', { protocolId, protocol });

// UI events (existing)
eventBus.emit('ui:switch-tool', { tool: 'calculators' });
```

### UIManager Updates Required

The existing `UIManager.js` needs to listen for these events:

```javascript
// In UIManager constructor
this.eventBus.on('calculator:loaded', (data) => this.handleCalculatorLoaded(data));
this.eventBus.on('differential:symptom-selected', (data) => this.handleSymptomSelected(data));
this.eventBus.on('triad:selected', (data) => this.handleTriadSelected(data));
this.eventBus.on('examination:selected', (data) => this.handleExaminationSelected(data));
this.eventBus.on('protocol:selected', (data) => this.handleProtocolSelected(data));
```

---

## 📊 Extraction Checklist

### Phase 1: Critical (MVP)
- [ ] **CalculatorRegistry.js** - Extract all 51 calculators (8-12 hours)
  - [ ] Extract HTML templates from `getXXXCalculator()` methods
  - [ ] Extract calculation logic from `calculateXXX()` methods
  - [ ] Convert inline onclick to event listeners
  - [ ] Test each calculator individually
  
- [ ] **DifferentialDxManager.js** - Extract differential database (4-6 hours)
  - [ ] Extract `ddxDatabase` object
  - [ ] Convert `loadDifferentialDx()` to `renderSymptomList()`
  - [ ] Convert `showDifferentialDetail()` to use events
  - [ ] Test symptom navigation

### Phase 2: Important (Complete Parity)
- [ ] **TriadsManager.js** - Extract triads (2-3 hours)
- [ ] **ExaminationManager.js** - Extract exam guides (2-3 hours)
- [ ] **EmergencyProtocolsManager.js** - Extract protocols (2-3 hours)

### Phase 3: Integration
- [ ] Update UIManager to handle new events (2 hours)
- [ ] Update V2Integration.js for backwards compatibility (1 hour)
- [ ] Test all interactions (4 hours)

### Phase 4: Testing
- [ ] Unit test each calculator (4 hours)
- [ ] Integration test tool switching (2 hours)
- [ ] User acceptance testing (2 hours)

---

## 🚀 Next Steps

1. **Start with Calculators**: This is the biggest blocker
2. **Use this document as reference**: Copy patterns shown above
3. **Test incrementally**: Don't extract all 51 calculators before testing
4. **Maintain HTML/CSS**: Keep existing styles and structure
5. **Event-driven**: Always emit events instead of direct calls

---

## ⏱️ Time Estimates

| Task | Time Estimate | Priority |
|------|--------------|----------|
| CalculatorRegistry.js (51 calculators) | 8-12 hours | 🔴 CRITICAL |
| DifferentialDxManager.js | 4-6 hours | 🔴 CRITICAL |
| TriadsManager.js | 2-3 hours | 🟡 Important |
| ExaminationManager.js | 2-3 hours | 🟡 Important |
| EmergencyProtocolsManager.js | 2-3 hours | 🟡 Important |
| UIManager updates | 2 hours | 🟡 Important |
| Integration testing | 4 hours | 🟡 Important |
| **TOTAL (MVP)** | **16-24 hours** | |
| **TOTAL (Complete)** | **28-37 hours** | |

---

## 💡 Pro Tips

1. **Don't rewrite, copy**: The V1 HTML and logic work perfectly, just restructure
2. **Test early**: Get one calculator working end-to-end before doing all 51
3. **Keep V1 as reference**: Don't delete V1 code until V2 is fully tested
4. **Use events everywhere**: This makes testing and debugging much easier
5. **Incremental commits**: Commit after each calculator/feature works

---

**Ready to start? Begin with extracting the BMI calculator as a proof of concept! 🎯**
