# V1 to V2 Integration Changes - Detailed Examples

This document shows **exact code blocks** from V1 and how they should be transformed for V2.

---

## 🧮 Example 1: BMI Calculator - Complete Transformation

### V1 Code (app.js - Lines 5212-5300)

```javascript
// In MLAQuizApp class
getBMICalculator() {
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
            <button onclick="window.quizApp.calculateBMI()">Calculate</button>
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
    const weight = parseFloat(document.getElementById('bmi-weight').value);
    const height = parseFloat(document.getElementById('bmi-height').value) / 100; // Convert cm to m
    const waist = parseFloat(document.getElementById('bmi-waist').value);
    const ethnicity = document.getElementById('bmi-ethnicity').value;
    const sex = document.querySelector('input[name="bmi-sex"]:checked')?.value;
    
    if (!weight || !height) {
        document.getElementById('bmi-result').innerHTML = '<p class="error">Please enter valid weight and height</p>';
        return;
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
        const waistThreshold = {
            male: ethnicity === 'asian' ? 90 : 102,
            female: ethnicity === 'asian' ? 80 : 88
        };
        
        if (waist >= waistThreshold[sex]) {
            waistAssessment = `<div style="margin-top:10px;color:#F44336;"><strong>⚠️ Central obesity detected</strong><br>Waist: ${waist}cm (Risk threshold: ${waistThreshold[sex]}cm)<br>Increased metabolic syndrome risk</div>`;
        } else {
            waistAssessment = `<div style="margin-top:10px;color:#4CAF50;">Waist circumference: ${waist}cm (within normal range)</div>`;
        }
    }
    
    document.getElementById('bmi-result').innerHTML = `
        <div style="padding:15px;border-left:4px solid ${color};">
            <div style="font-size:24px;font-weight:bold;color:${color};">BMI: ${bmi.toFixed(1)}</div>
            <div style="font-size:18px;margin-top:5px;color:${color};"><strong>${category}</strong></div>
            <div style="margin-top:10px;color:#374151;">${healthRisk}</div>
            ${waistAssessment}
        </div>
    `;
}
```

### V2 Code (CalculatorRegistry.js)

```javascript
// static/js/v2/modules/calculators/CalculatorRegistry.js
export const calculatorRegistry = {
    'bmi': {
        id: 'bmi',
        name: 'BMI Calculator',
        category: 'Body Metrics',
        description: 'Calculate BMI and assess weight status',
        keywords: ['body', 'weight', 'obesity', 'bmi', 'waist'],
        
        // COPY HTML TEMPLATE - Remove onclick attribute
        getTemplate: () => {
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
                    <button id="bmi-calculate-btn">Calculate</button>
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
        },
        
        // COPY CALCULATION LOGIC - Extract from calculateBMI()
        calculate: () => {
            const weight = parseFloat(document.getElementById('bmi-weight').value);
            const height = parseFloat(document.getElementById('bmi-height').value) / 100;
            const waist = parseFloat(document.getElementById('bmi-waist').value);
            const ethnicity = document.getElementById('bmi-ethnicity').value;
            const sex = document.querySelector('input[name="bmi-sex"]:checked')?.value;
            
            if (!weight || !height) {
                return {
                    error: true,
                    html: '<p class="error">Please enter valid weight and height</p>'
                };
            }
            
            const bmi = weight / (height * height);
            let category = '';
            let color = '';
            let healthRisk = '';
            
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
            
            let waistAssessment = '';
            if (waist && sex) {
                const waistThreshold = {
                    male: ethnicity === 'asian' ? 90 : 102,
                    female: ethnicity === 'asian' ? 80 : 88
                };
                
                if (waist >= waistThreshold[sex]) {
                    waistAssessment = `<div style="margin-top:10px;color:#F44336;"><strong>⚠️ Central obesity detected</strong><br>Waist: ${waist}cm (Risk threshold: ${waistThreshold[sex]}cm)<br>Increased metabolic syndrome risk</div>`;
                } else {
                    waistAssessment = `<div style="margin-top:10px;color:#4CAF50;">Waist circumference: ${waist}cm (within normal range)</div>`;
                }
            }
            
            return {
                error: false,
                bmi: bmi.toFixed(1),
                category,
                color,
                healthRisk,
                html: `
                    <div style="padding:15px;border-left:4px solid ${color};">
                        <div style="font-size:24px;font-weight:bold;color:${color};">BMI: ${bmi.toFixed(1)}</div>
                        <div style="font-size:18px;margin-top:5px;color:${color};"><strong>${category}</strong></div>
                        <div style="margin-top:10px;color:#374151;">${healthRisk}</div>
                        ${waistAssessment}
                    </div>
                `
            };
        },
        
        // NEW IN V2 - Event binding replaces onclick
        bindEvents: () => {
            const calculateBtn = document.getElementById('bmi-calculate-btn');
            const resultDiv = document.getElementById('bmi-result');
            
            if (!calculateBtn || !resultDiv) return;
            
            calculateBtn.addEventListener('click', () => {
                const result = calculatorRegistry['bmi'].calculate();
                resultDiv.innerHTML = result.html;
                
                // Emit event for analytics tracking
                if (!result.error && window.eventBus) {
                    window.eventBus.emit('calculator:used', {
                        calculator: 'bmi',
                        result: {
                            bmi: result.bmi,
                            category: result.category
                        }
                    });
                }
            });
            
            // Optional: Enter key support
            ['bmi-weight', 'bmi-height', 'bmi-waist'].forEach(id => {
                const input = document.getElementById(id);
                if (input) {
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            calculateBtn.click();
                        }
                    });
                }
            });
        }
    }
    
    // Add 50 more calculators following the same pattern...
};
```

### Key Changes Made

| Line | V1 | V2 | Reason |
|------|----|----|--------|
| HTML | `<button onclick="window.quizApp.calculateBMI()">` | `<button id="bmi-calculate-btn">` | Remove inline onclick |
| Logic | Method on class | Function in object | Modular structure |
| Events | None | `bindEvents()` method | Proper event handling |
| Analytics | Direct call to `trackToolUsage()` | Event emission | Decoupled modules |
| Return | Direct DOM update | Return data object | Testability |

---

## 🩺 Example 2: Differential Diagnosis - Chest Pain

### V1 Code (app.js - Lines 15340-15500)

```javascript
loadDifferentialDx() {
    const ddxDatabase = {
        'chest-pain': {
            title: 'Chest Pain',
            category: 'Cardiovascular/Pulmonary',
            redFlags: '🚩 Sudden onset, severe pain, radiation to back/jaw, diaphoresis, hypotension, syncope',
            presentations: {
                'Acute coronary syndrome': {
                    features: 'Crushing, substernal, radiates to left arm/jaw, diaphoresis, dyspnea, nausea. Risk factors: age, DM, HTN, smoking, family history',
                    tests: 'ECG (ST changes, Q waves), troponins (peak 12-24h), CXR, echo if available',
                    urgency: 'Emergency',
                    timeToTreat: '90 minutes door-to-balloon for STEMI',
                    clinicalPearls: 'Women may present atypically (fatigue, nausea). Troponins can be elevated in kidney disease',
                    differentiatingFeatures: 'Chest pressure >20min, not positional, not reproduced by palpation'
                },
                'Pulmonary embolism': {
                    features: 'Sudden onset, pleuritic, dyspnea, tachycardia. Risk factors: immobilization, surgery, malignancy, OCP, DVT',
                    tests: 'Wells score, D-dimer (if low risk), CTPA, V/Q scan, echo (RV strain)',
                    urgency: 'Emergency',
                    timeToTreat: 'Anticoagulation within hours if high suspicion',
                    clinicalPearls: 'Wells score >4 = high risk. Normal D-dimer rules out PE if low risk. Tachycardia most common sign',
                    differentiatingFeatures: 'Sudden onset, associated dyspnea, risk factors for VTE'
                }
                // ... more presentations
            }
        },
        'shortness-of-breath': { /* ... */ },
        'abdominal-pain': { /* ... */ }
        // ... more symptoms
    };
    
    const container = document.getElementById('differential-container');
    let html = '<div class="search-box"><input type="text" id="ddx-search" placeholder="Search symptoms..."></div>';
    html += '<div class="differential-grid">';
    
    for (const [symptomId, symptomData] of Object.entries(ddxDatabase)) {
        html += `
            <div class="symptom-card" onclick="window.quizApp.showDifferentialDetail('${symptomId}')">
                <h4>${symptomData.title}</h4>
                <p class="symptom-category">${symptomData.category}</p>
                <div class="symptom-red-flags">${symptomData.redFlags}</div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    // Search functionality
    document.getElementById('ddx-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.symptom-card').forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    });
}

showDifferentialDetail(symptomId) {
    const symptomData = ddxDatabase[symptomId]; // Problem: ddxDatabase not accessible
    // ... render detail view
    this.trackToolUsage('differential', symptomId);
}
```

### V2 Code (DifferentialDxManager.js)

```javascript
// static/js/v2/modules/DifferentialDxManager.js
export class DifferentialDxManager {
    constructor(storageManager, eventBus) {
        this.storage = storageManager;
        this.eventBus = eventBus;
        this.ddxDatabase = this.loadDatabase();
        this.currentSymptom = null;
    }
    
    // COPY DATABASE - Extract from loadDifferentialDx()
    loadDatabase() {
        return {
            'chest-pain': {
                title: 'Chest Pain',
                category: 'Cardiovascular/Pulmonary',
                redFlags: '🚩 Sudden onset, severe pain, radiation to back/jaw, diaphoresis, hypotension, syncope',
                presentations: {
                    'Acute coronary syndrome': {
                        features: 'Crushing, substernal, radiates to left arm/jaw, diaphoresis, dyspnea, nausea. Risk factors: age, DM, HTN, smoking, family history',
                        tests: 'ECG (ST changes, Q waves), troponins (peak 12-24h), CXR, echo if available',
                        urgency: 'Emergency',
                        timeToTreat: '90 minutes door-to-balloon for STEMI',
                        clinicalPearls: 'Women may present atypically (fatigue, nausea). Troponins can be elevated in kidney disease',
                        differentiatingFeatures: 'Chest pressure >20min, not positional, not reproduced by palpation'
                    },
                    'Pulmonary embolism': {
                        features: 'Sudden onset, pleuritic, dyspnea, tachycardia. Risk factors: immobilization, surgery, malignancy, OCP, DVT',
                        tests: 'Wells score, D-dimer (if low risk), CTPA, V/Q scan, echo (RV strain)',
                        urgency: 'Emergency',
                        timeToTreat: 'Anticoagulation within hours if high suspicion',
                        clinicalPearls: 'Wells score >4 = high risk. Normal D-dimer rules out PE if low risk. Tachycardia most common sign',
                        differentiatingFeatures: 'Sudden onset, associated dyspnea, risk factors for VTE'
                    }
                    // ... more presentations
                }
            },
            'shortness-of-breath': { /* ... */ },
            'abdominal-pain': { /* ... */ }
            // ... more symptoms
        };
    }
    
    // COPY RENDER LOGIC - Replace onclick with data attributes
    renderSymptomList(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let html = '<div class="search-box"><input type="text" id="ddx-search" placeholder="Search symptoms..."></div>';
        html += '<div class="differential-grid">';
        
        for (const [symptomId, symptomData] of Object.entries(this.ddxDatabase)) {
            html += `
                <div class="symptom-card" data-symptom="${symptomId}">
                    <h4>${symptomData.title}</h4>
                    <p class="symptom-category">${symptomData.category}</p>
                    <div class="symptom-red-flags">${symptomData.redFlags}</div>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
        
        // Bind click events using delegation
        container.querySelector('.differential-grid').addEventListener('click', (e) => {
            const card = e.target.closest('.symptom-card');
            if (card) {
                const symptomId = card.dataset.symptom;
                this.showSymptomDetail(symptomId);
            }
        });
        
        // Search functionality
        const searchInput = document.getElementById('ddx-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterSymptoms(e.target.value);
            });
        }
    }
    
    filterSymptoms(searchTerm) {
        const term = searchTerm.toLowerCase();
        const cards = document.querySelectorAll('.symptom-card');
        
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(term) ? 'block' : 'none';
        });
    }
    
    // COPY DETAIL VIEW - Use events instead of direct DOM manipulation
    showSymptomDetail(symptomId) {
        const symptomData = this.ddxDatabase[symptomId];
        if (!symptomData) {
            console.error(`Symptom not found: ${symptomId}`);
            return;
        }
        
        this.currentSymptom = symptomId;
        
        // Build presentations HTML
        let presentationsHtml = '';
        for (const [presentationName, presentationData] of Object.entries(symptomData.presentations)) {
            const urgencyColor = presentationData.urgency === 'Emergency' ? '#F44336' : 
                                 presentationData.urgency === 'Urgent' ? '#FF9800' : '#4CAF50';
            
            presentationsHtml += `
                <div class="presentation-card">
                    <h4>${presentationName}</h4>
                    <div class="urgency-badge" style="background:${urgencyColor};">${presentationData.urgency}</div>
                    <div class="presentation-section">
                        <strong>Clinical Features:</strong>
                        <p>${presentationData.features}</p>
                    </div>
                    <div class="presentation-section">
                        <strong>Investigations:</strong>
                        <p>${presentationData.tests}</p>
                    </div>
                    <div class="presentation-section">
                        <strong>Time to Treatment:</strong>
                        <p>${presentationData.timeToTreat}</p>
                    </div>
                    <div class="presentation-section">
                        <strong>Clinical Pearls:</strong>
                        <p>${presentationData.clinicalPearls}</p>
                    </div>
                    <div class="presentation-section">
                        <strong>Differentiating Features:</strong>
                        <p>${presentationData.differentiatingFeatures}</p>
                    </div>
                </div>
            `;
        }
        
        // Emit event to UIManager to render detail view
        this.eventBus.emit('differential:symptom-selected', {
            symptomId,
            symptomData: {
                title: symptomData.title,
                category: symptomData.category,
                redFlags: symptomData.redFlags,
                presentationsHtml
            }
        });
        
        // Track usage
        this.storage.incrementUsage('differential', symptomId);
        this.eventBus.emit('analytics:track', {
            category: 'differential',
            action: 'view',
            label: symptomId
        });
    }
    
    // Get symptom by ID
    getSymptom(symptomId) {
        return this.ddxDatabase[symptomId];
    }
    
    // Search symptoms
    searchSymptoms(query) {
        const results = [];
        const term = query.toLowerCase();
        
        for (const [symptomId, symptomData] of Object.entries(this.ddxDatabase)) {
            if (symptomData.title.toLowerCase().includes(term) ||
                symptomData.category.toLowerCase().includes(term)) {
                results.push({ id: symptomId, ...symptomData });
            }
        }
        
        return results;
    }
    
    // Statistics
    getStatistics() {
        const symptoms = Object.keys(this.ddxDatabase).length;
        const presentations = Object.values(this.ddxDatabase)
            .reduce((sum, s) => sum + Object.keys(s.presentations).length, 0);
        
        return {
            totalSymptoms: symptoms,
            totalPresentations: presentations,
            emergencyPresentations: this.countEmergencyPresentations(),
            initialized: true
        };
    }
    
    countEmergencyPresentations() {
        let count = 0;
        for (const symptomData of Object.values(this.ddxDatabase)) {
            for (const presentation of Object.values(symptomData.presentations)) {
                if (presentation.urgency === 'Emergency') {
                    count++;
                }
            }
        }
        return count;
    }
}
```

### UIManager Event Handler

```javascript
// In UIManager.js - Add this handler
handleSymptomSelected(data) {
    const container = document.getElementById('differential-detail-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="detail-header">
            <button class="back-btn" id="ddx-back-btn">← Back to Symptoms</button>
            <h3>${data.symptomData.title}</h3>
            <p class="category-badge">${data.symptomData.category}</p>
        </div>
        <div class="red-flags-section">
            ${data.symptomData.redFlags}
        </div>
        <div class="presentations-container">
            ${data.symptomData.presentationsHtml}
        </div>
    `;
    
    // Switch to detail view
    this.switchTool('differential-detail');
    
    // Bind back button
    document.getElementById('ddx-back-btn')?.addEventListener('click', () => {
        this.switchTool('differential-dx');
    });
}
```

---

## 🔄 Example 3: Event Flow Comparison

### V1 Event Flow (Direct Calls)

```
User clicks calculator button
    ↓
onclick="window.quizApp.loadCalculator('bmi')"
    ↓
window.quizApp.loadCalculator() method
    ↓
this.switchMedicalTool('calculator-detail')
    ↓
Direct DOM manipulation
    ↓
this.trackToolUsage('calculator', 'bmi')
    ↓
localStorage update
```

### V2 Event Flow (Event-Driven)

```
User clicks calculator button
    ↓
Event listener (bound in bindEvents())
    ↓
calculatorManager.loadCalculator('bmi')
    ↓
eventBus.emit('calculator:loaded', {calculator: 'bmi'})
    ↓
UIManager hears event → renders UI
    ↓
User calculates → eventBus.emit('calculator:used', {result})
    ↓
AnalyticsManager hears event → tracks usage
    ↓
StorageManager hears event → saves to localStorage
```

**Benefits of V2 approach:**
- Modules don't need to know about each other
- Easy to add new listeners without modifying existing code
- Testable in isolation
- No global dependencies

---

## 📋 Conversion Checklist

For each V1 function, follow these steps:

### Step 1: Identify V1 Pattern
- [ ] Find the function in v1/app.js
- [ ] Note line numbers
- [ ] Identify dependencies (what other methods it calls)
- [ ] Find associated HTML templates

### Step 2: Extract Code
- [ ] Copy HTML template (remove onclick attributes)
- [ ] Copy calculation/logic (keep as-is)
- [ ] Copy any helper functions

### Step 3: Transform to V2
- [ ] Replace `onclick=""` with `id=""` attributes
- [ ] Create `bindEvents()` method for event listeners
- [ ] Replace `this.method()` with `eventBus.emit()`
- [ ] Return data objects instead of direct DOM manipulation
- [ ] Add error handling

### Step 4: Test
- [ ] Verify HTML renders correctly
- [ ] Test event bindings work
- [ ] Verify calculations are accurate
- [ ] Check events are emitted properly
- [ ] Test with V1 side-by-side for comparison

---

## 🎯 Quick Reference: Common Replacements

| V1 Code | V2 Code |
|---------|---------|
| `onclick="window.quizApp.method()"` | `id="unique-btn-id"` + addEventListener |
| `this.switchMedicalTool('tool')` | `eventBus.emit('ui:switch-tool', {tool})` |
| `this.trackToolUsage('type', 'name')` | `eventBus.emit('analytics:track', {data})` |
| `document.getElementById().innerHTML = html` | Return html, let UIManager render |
| Method on `MLAQuizApp` class | Function in registry/manager |
| `window.quizApp.calculate()` | `calculate()` method in registry |

---

## 💡 Next Steps

1. **Start with ONE calculator** (BMI is simplest)
2. **Test end-to-end** before moving to next
3. **Use this document as template** for all others
4. **Keep V1 running** for comparison testing
5. **Commit after each working calculator**

Ready to begin extraction! 🚀
