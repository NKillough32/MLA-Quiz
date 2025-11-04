# V1 to V2 Function Extraction - Quick Start Checklist

Use this checklist to track your extraction progress.

---

## 🎯 Phase 1: Proof of Concept (1-2 hours)

- [x] BMI calculator extracted to CalculatorRegistry.js
- [ ] Update CalculatorManager.js to import registry
- [ ] Test BMI calculator in browser
- [ ] Verify calculation matches V1
- [ ] Verify events emit correctly
- [ ] Document any issues found

**If POC works → Proceed to Phase 2**  
**If POC fails → Debug before continuing**

---

## 🧮 Phase 2: Top 10 Calculators (3-4 hours)

Extract the most commonly used calculators:

### Cardiology (High Priority)
- [ ] **chads2vasc** - CHA₂DS₂-VASc Score (V1 line ~4950)
- [ ] **hasbled** - HAS-BLED Score (V1 line ~4952)
- [ ] **grace** - GRACE Score (V1 line ~5059)

### Respiratory (High Priority)
- [ ] **wells** - Wells PE Score (V1 line ~4956)
- [ ] **news2** - NEWS2 Score (V1 line ~5105)
- [ ] **curb65** - CURB-65 Score (V1 line ~5107)

### Neurology (High Priority)
- [ ] **gcs** - Glasgow Coma Scale (V1 line ~4954)
- [ ] **nihss** - NIH Stroke Scale (V1 line ~5143)

### General (High Priority)
- [ ] **egfr** - eGFR Calculator (V1 line ~5019)
- [ ] **bsa** - Body Surface Area (V1 line ~5133)

**After each calculator:**
- [ ] Test in browser
- [ ] Verify calculation accuracy
- [ ] Commit to git

---

## 🧮 Phase 3: Remaining Calculators (5-8 hours)

### Critical Care
- [ ] apache - APACHE II Score
- [ ] mews - MEWS Score
- [ ] rass - RASS Scale
- [ ] vasopressor - Vasopressor Dosing

### Gastroenterology
- [ ] rockall - Rockall Score
- [ ] child-pugh - Child-Pugh Score
- [ ] glasgow-blatchford - Glasgow-Blatchford Score
- [ ] alvarado - Alvarado Score

### Geriatrics
- [ ] frailty - Clinical Frailty Scale
- [ ] barthel - Barthel Index
- [ ] waterlow - Waterlow Score
- [ ] must - MUST Score

### Obstetrics
- [ ] apgar - APGAR Score
- [ ] bishop - Bishop Score

### Psychiatry
- [ ] phq9 - PHQ-9 Depression Scale
- [ ] gad7 - GAD-7 Anxiety Scale
- [ ] mse - Mental State Examination
- [ ] mmse - Mini Mental State Examination

### Renal
- [ ] cockcroft-gault - Cockcroft-Gault eGFR
- [ ] urea-creatinine - Urea:Creatinine Ratio

### Emergency Medicine
- [ ] ottawa-ankle - Ottawa Ankle Rules
- [ ] centor - Centor Score
- [ ] perc - PERC Rule
- [ ] rcri - Revised Cardiac Risk Index

### Neurology (Additional)
- [ ] abcd2 - ABCD² Score
- [ ] rankin - Modified Rankin Scale

### Cardiology (Additional)
- [ ] timi - TIMI Risk Score
- [ ] crusade - CRUSADE Score
- [ ] qrisk - QRISK3 Calculator

### Clinical Chemistry
- [ ] anion-gap - Anion Gap Calculator
- [ ] corrected-sodium - Corrected Sodium
- [ ] osmolal-gap - Osmolal Gap
- [ ] corrected-calcium - Corrected Calcium
- [ ] ldl-calc - LDL Calculator
- [ ] winters - Winters Formula
- [ ] aa-gradient - A-a Gradient

### General Clinical
- [ ] map - Mean Arterial Pressure
- [ ] qtc - Corrected QT Calculator
- [ ] madders - MADDERS Score
- [ ] crb65 - CRB-65 Score

### Drug Calculations
- [ ] insulin-sliding - Insulin Sliding Scale
- [ ] unit-converter - Clinical Unit Converter
- [ ] drug-volume - Drug Volume Calculator
- [ ] paediatric-dosing - Paediatric Dosing Calculator
- [ ] infusion-rate - Infusion Rate Calculator
- [ ] palliative - Palliative Care Calculator

### DVT/PE Assessment
- [ ] wells-dvt - Wells DVT Score

### Respiratory (Additional)
- [ ] asthma - Asthma Severity Assessment

### Other
- [ ] frax-fracture - FRAX Fracture Risk
- [ ] fluid-balance - Fluid Balance Calculator

**Total: 51 calculators**

---

## 🩺 Phase 4: Differential Diagnosis (4-6 hours)

### Create DifferentialDxManager.js

- [ ] Create file: `static/js/v2/modules/DifferentialDxManager.js`
- [ ] Copy class structure from guide
- [ ] Extract ddxDatabase from V1 line 15340

### Extract Symptoms

- [ ] chest-pain (7 presentations)
- [ ] shortness-of-breath (6 presentations)
- [ ] abdominal-pain (12+ presentations)
- [ ] headache
- [ ] altered-mental-status
- [ ] fever
- [ ] syncope
- [ ] back-pain
- [ ] joint-pain
- [ ] rash

### Test Differential

- [ ] Symptom list renders
- [ ] Click symptom shows detail
- [ ] Back button works
- [ ] Search filters correctly
- [ ] Events emit properly

---

## 🔬 Phase 5: Clinical Triads (2-3 hours)

### Create TriadsManager.js

- [ ] Create file: `static/js/v2/modules/TriadsManager.js`
- [ ] Copy class structure from guide
- [ ] Extract triads from V1 line 17236+

### Extract Triads

- [ ] Beck's Triad (Cardiac tamponade)
- [ ] Charcot's Triad (Ascending cholangitis)
- [ ] Virchow's Triad (Thrombosis)
- [ ] Cushing's Triad (Raised ICP)
- [ ] Other triads from V1

### Test Triads

- [ ] Triad list renders
- [ ] Click shows detail
- [ ] Emergency badge displays correctly
- [ ] Events emit properly

---

## 🩹 Phase 6: Examination Guides (2-3 hours)

### Create ExaminationManager.js

- [ ] Create file: `static/js/v2/modules/ExaminationManager.js`
- [ ] Copy class structure from guide
- [ ] Extract examinations from V1 line 17415+

### Extract Examinations

- [ ] Cardiovascular examination
- [ ] Respiratory examination
- [ ] Abdominal examination
- [ ] Neurological examination
- [ ] Musculoskeletal examination
- [ ] Other examinations from V1

### Test Examinations

- [ ] Examination list renders
- [ ] Click shows step-by-step guide
- [ ] Navigation works
- [ ] Events emit properly

---

## 🚨 Phase 7: Emergency Protocols (2-3 hours)

### Create EmergencyProtocolsManager.js

- [ ] Create file: `static/js/v2/modules/EmergencyProtocolsManager.js`
- [ ] Copy class structure from guide
- [ ] Extract protocols from V1 line 20782+

### Extract Protocols

- [ ] Anaphylaxis
- [ ] Cardiac arrest
- [ ] Status epilepticus
- [ ] Sepsis
- [ ] DKA
- [ ] Other protocols from V1

### Test Protocols

- [ ] Protocol list renders
- [ ] Emergency badge prominent
- [ ] Step-by-step clear
- [ ] Events emit properly

---

## 🔄 Phase 8: Integration (2 hours)

### Update UIManager

- [ ] Add event listener: `calculator:loaded`
- [ ] Add event listener: `differential:symptom-selected`
- [ ] Add event listener: `triad:selected`
- [ ] Add event listener: `examination:selected`
- [ ] Add event listener: `protocol:selected`

### Update AnalyticsManager

- [ ] Track calculator usage
- [ ] Track differential views
- [ ] Track triad views
- [ ] Track examination views
- [ ] Track protocol views

### Update main.js

- [ ] Import new managers
- [ ] Initialize new managers
- [ ] Export to window for compatibility

---

## ✅ Phase 9: Testing (4 hours)

### Unit Testing

- [ ] Test 5 random calculators for accuracy
- [ ] Compare results with V1
- [ ] Test edge cases (invalid inputs)
- [ ] Test error handling

### Integration Testing

- [ ] Test tool switching
- [ ] Test back buttons
- [ ] Test search functionality
- [ ] Test analytics events
- [ ] Test storage persistence

### Browser Testing

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Mobile view (responsive)

### User Testing

- [ ] Navigate entire app
- [ ] Use calculators
- [ ] Browse differential diagnoses
- [ ] Check triads
- [ ] Review examinations
- [ ] Read protocols

---

## 🚀 Phase 10: Deployment (1 hour)

### Pre-Deployment

- [ ] All tests passing
- [ ] No console errors
- [ ] V1 still works (fallback)
- [ ] Git commit all changes
- [ ] Update VERSION in code

### Enable V2

- [ ] Uncomment V2 scripts in index.html
- [ ] Comment out V1 scripts
- [ ] Test locally one more time
- [ ] Push to Vercel

### Post-Deployment

- [ ] Test on live URL
- [ ] Verify V2 loads
- [ ] Spot check 5 calculators
- [ ] Monitor for errors
- [ ] Keep V1 code for rollback if needed

---

## 📊 Progress Tracker

**Overall Progress:**
```
Calculators:    [█░░░░░░░░░] 1/51 (2%)
Differential:   [░░░░░░░░░░] 0/10 (0%)
Triads:         [░░░░░░░░░░] 0/1 (0%)
Examinations:   [░░░░░░░░░░] 0/1 (0%)
Protocols:      [░░░░░░░░░░] 0/1 (0%)
Integration:    [░░░░░░░░░░] 0/1 (0%)
Testing:        [░░░░░░░░░░] 0/1 (0%)
```

**Estimated Time Remaining:** 28-37 hours

---

## 🆘 Troubleshooting

### Calculator Not Working

1. Check browser console for errors
2. Verify element IDs match between template and calculate()
3. Verify bindEvents() is called
4. Compare with working BMI example
5. Check V1 for reference

### Events Not Emitting

1. Verify eventBus exists: `console.log(window.eventBus)`
2. Check event name spelling
3. Add console.log to verify emit is called
4. Check UIManager has listener registered

### HTML Not Rendering

1. Check getTemplate() returns string
2. Verify container element exists
3. Check for JavaScript syntax errors
4. Inspect DOM in browser devtools

### Calculation Incorrect

1. Compare with V1 step by step
2. Check input value parsing (parseInt vs parseFloat)
3. Verify thresholds and categories match V1
4. Test with known values from V1

---

## 📝 Notes

Use this space to track issues, decisions, or reminders:

```
Date: ___________

Issues encountered:
-

Solutions found:
-

Decisions made:
-

Next session TODO:
-

```

---

**Start here → Test BMI calculator (Phase 1) ✅**
