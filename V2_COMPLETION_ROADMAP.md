# V2 Completion Roadmap

## Goal: Enable V2 to Take Over from V1 (While Keeping V1 as Backup)

This document outlines exactly what needs to be completed for V2 to replace V1 in production.

---

## Current Status Assessment

### ✅ V2 Components Complete (Working)

#### Foundation
- [x] EventBus.js - Event communication system
- [x] StorageManager.js - Local/IndexedDB storage
- [x] OrientationManager.js - Device orientation
- [x] AnalyticsManager.js - Analytics + haptics
- [x] UIHelpers.js - Utility functions
- [x] Constants.js - Shared constants
- [x] UIManager.js - UI state management

#### Reference Managers
- [x] DrugReferenceManager.js - 200+ drugs (working)
- [x] LabValuesManager.js - 15 panels, 100+ tests (working)
- [x] GuidelinesManager.js - 29 guidelines (working)

#### Feature Managers
- [x] AnatomyManager.js - Anatomy explorer (working)
- [x] QuizManager.js - Quiz system (working)
- [x] CalculatorManager.js - Calculator framework (working)

#### Integration
- [x] V2Integration.js - Bridge to V1 (working)

### ❌ V2 Components Missing (Critical Gaps)

#### 1. **CalculatorRegistry.js** - CRITICAL 🔴
**Status**: Does NOT exist
**Impact**: No calculators available in V2
**Priority**: MUST HAVE

**What it needs**:
```javascript
// File: static/js/v2/modules/calculators/CalculatorRegistry.js
export const calculatorRegistry = {
    'bmi': {
        name: 'BMI Calculator',
        category: 'Basic',
        description: 'Body Mass Index calculation',
        render: () => `<HTML for BMI calculator>`,
        calculate: () => { /* calculation logic */ }
    },
    // ... 50 more calculators
};
```

**Required**: All 51 clinical calculators from V1

#### 2. **Differential Diagnosis Manager** - CRITICAL 🔴
**Status**: Does NOT exist
**Impact**: Differential diagnosis feature missing
**Priority**: MUST HAVE

**What it needs**:
- `DifferentialDxManager.js` in v2/modules/
- Symptom database
- Diagnosis lookup
- UI rendering

#### 3. **Clinical Triads Manager** - IMPORTANT 🟡
**Status**: Does NOT exist
**Impact**: Triads feature missing
**Priority**: SHOULD HAVE

**What it needs**:
- `TriadsManager.js` in v2/modules/
- Clinical triads data
- Search functionality
- UI rendering

#### 4. **Examination Guide Manager** - IMPORTANT 🟡
**Status**: Does NOT exist
**Impact**: Examination guides missing
**Priority**: SHOULD HAVE

**What it needs**:
- `ExaminationManager.js` in v2/modules/
- Examination protocols
- Step-by-step guides
- UI rendering

#### 5. **Emergency Protocols Manager** - IMPORTANT 🟡
**Status**: Does NOT exist
**Impact**: Emergency protocols missing
**Priority**: SHOULD HAVE

**What it needs**:
- `EmergencyProtocolsManager.js` in v2/modules/
- Protocol database
- Quick access UI
- Critical care algorithms

#### 6. **Interpretation Tools Manager** - OPTIONAL 🟢
**Status**: Does NOT exist
**Impact**: ECG/X-ray interpretation missing
**Priority**: NICE TO HAVE

---

## Phase 1: Critical Components (MUST COMPLETE)

### Task 1.1: Create CalculatorRegistry.js ⭐ HIGHEST PRIORITY

**File**: `static/js/v2/modules/calculators/CalculatorRegistry.js`

**Steps**:
1. Extract all 51 calculator functions from V1 app.js
2. Convert to V2 registry format
3. Test each calculator individually
4. Verify calculations match V1

**Estimated Time**: 8-12 hours (for all 51 calculators)

**Template**:
```javascript
export const calculatorRegistry = {
    'bmi': {
        name: 'BMI Calculator',
        category: 'Basic Measurements',
        description: 'Calculate Body Mass Index with UK/Asian thresholds',
        render: () => `
            <div class="calculator-form">
                <div class="form-group">
                    <label>Weight (kg):</label>
                    <input type="number" id="bmi-weight" step="0.1" />
                </div>
                <div class="form-group">
                    <label>Height (cm):</label>
                    <input type="number" id="bmi-height" step="0.1" />
                </div>
                <button data-calc="bmi" class="calc-btn">Calculate</button>
                <div id="bmi-result"></div>
            </div>
        `,
        calculate: () => {
            const weight = parseFloat(document.getElementById('bmi-weight').value);
            const height = parseFloat(document.getElementById('bmi-height').value) / 100;
            
            if (!weight || !height) {
                return { error: 'Please enter valid values' };
            }
            
            const bmi = weight / (height * height);
            const resultDiv = document.getElementById('bmi-result');
            
            let category = '';
            let color = '';
            if (bmi < 18.5) {
                category = 'Underweight';
                color = '#FFA500';
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
            
            resultDiv.innerHTML = `
                <div class="result-box" style="background: ${color}; color: white; padding: 16px; border-radius: 8px;">
                    <h3>BMI: ${bmi.toFixed(1)}</h3>
                    <p>${category}</p>
                </div>
            `;
            
            return { bmi, category };
        }
    },
    
    // Add 50 more calculators here...
    // Each following the same pattern
};
```

**Calculators to Include** (from V1):
1. BMI
2. GCS (Glasgow Coma Scale)
3. CHA₂DS₂-VASc
4. HAS-BLED
5. Wells DVT
6. Wells PE
7. CURB-65
8. CRB-65
9. NEWS2
10. MEWS
11. APACHE II
12. SOFA
13. QRISK3
14. GRACE
15. TIMI
16. CRUSADE
17. Rockall
18. Glasgow-Blatchford
19. Child-Pugh
20. MUST
21. Waterlow
22. Ottawa Ankle
23. eGFR
24. Cockcroft-Gault
25. BSA
26. Fluid Balance
27. Infusion Rate
28. ABCD²
29. NIHSS
30. Modified Rankin
31. PHQ-9
32. GAD-7
33. MMSE
34. Clinical Frailty Scale
35. Barthel Index
36. RASS
37. PERC
38. RCRI
39. QTc
40. Anion Gap
41. Corrected Calcium
42. Corrected Sodium
43. Osmolal Gap
44. A-a Gradient
45. Winters Formula
46. MAP
47. Centor
48. Alvarado
49. Bishop Score
50. APGAR
51. (Plus any others from V1)

### Task 1.2: Create DifferentialDxManager.js ⭐ HIGH PRIORITY

**File**: `static/js/v2/modules/DifferentialDxManager.js`

**Steps**:
1. Extract differential diagnosis data from V1
2. Create manager class
3. Implement search/filter
4. Create UI rendering
5. Test with V2Integration

**Template**:
```javascript
import { eventBus } from './EventBus.js';
import { storage } from './StorageManager.js';

export class DifferentialDxManager {
    constructor() {
        this.symptoms = new Map();
        this.diagnoses = new Map();
        this.initialized = false;
    }

    initialize() {
        this.loadSymptoms();
        this.loadDiagnoses();
        this.initialized = true;
        console.log('🩺 Differential Dx Manager initialized');
    }

    loadSymptoms() {
        // Extract from V1 app.js
        this.symptoms.set('chest-pain', {
            name: 'Chest Pain',
            category: 'Cardiovascular',
            differentials: [
                {
                    diagnosis: 'Acute MI',
                    likelihood: 'high',
                    redFlags: ['Crushing pain', 'Radiation to arm', 'Sweating'],
                    investigations: ['ECG', 'Troponin', 'CXR']
                },
                // More differentials...
            ]
        });
    }

    searchSymptom(query) {
        // Implement search
    }

    renderSymptomList(containerId) {
        // Implement UI
    }

    renderDifferentials(symptomId, containerId) {
        // Implement UI
    }
}

export const differentialDxManager = new DifferentialDxManager();
```

---

## Phase 2: Important Components (SHOULD COMPLETE)

### Task 2.1: Create TriadsManager.js

**File**: `static/js/v2/modules/TriadsManager.js`

Similar structure to DifferentialDxManager but for clinical triads.

### Task 2.2: Create ExaminationManager.js

**File**: `static/js/v2/modules/ExaminationManager.js`

Manages examination guides and protocols.

### Task 2.3: Create EmergencyProtocolsManager.js

**File**: `static/js/v2/modules/EmergencyProtocolsManager.js`

Manages emergency protocols and algorithms.

---

## Phase 3: Integration & Testing

### Task 3.1: Update V2Integration.js

Add support for new managers:
```javascript
import { differentialDxManager } from './DifferentialDxManager.js';
import { triadsManager } from './TriadsManager.js';
import { examinationManager } from './ExaminationManager.js';
import { emergencyProtocolsManager } from './EmergencyProtocolsManager.js';

// Add enhancements for each new feature
```

### Task 3.2: Update main.js

Initialize all new managers:
```javascript
import { differentialDxManager } from './modules/DifferentialDxManager.js';
// ... other imports

async initializeManagers() {
    // ... existing
    differentialDxManager.initialize();
    triadsManager.initialize();
    examinationManager.initialize();
    emergencyProtocolsManager.initialize();
}
```

### Task 3.3: Testing Checklist

- [ ] All 51 calculators work
- [ ] Calculator results match V1
- [ ] Differential diagnosis search works
- [ ] Triads display correctly
- [ ] Examination guides accessible
- [ ] Emergency protocols load
- [ ] Drug reference works
- [ ] Lab values work
- [ ] Guidelines work
- [ ] Anatomy explorer works
- [ ] Quiz system works
- [ ] Theme switching works
- [ ] Font size controls work
- [ ] Mobile responsive
- [ ] PWA features work
- [ ] No console errors

---

## Phase 4: Deployment Strategy

### Step 1: Parallel Running (V1 + V2 Together)

**Current HTML** (keep V1 as primary):
```html
<!-- V1 PRIMARY -->
<script src="/static/js/v1/app.js"></script>

<!-- V2 ENHANCEMENTS -->
<script src="/static/js/drugDatabase.js"></script>
<script src="/static/js/labDatabase.js"></script>
<script src="/static/js/guidelinesDatabase.js"></script>
<script type="module" src="/static/js/v2/main.js"></script>
```

This allows:
- ✅ V1 handles UI and core features
- ✅ V2 enhances with badges and stats
- ✅ Gradual feature testing
- ✅ Easy rollback

### Step 2: Feature Flags (Controlled Rollout)

Add feature flag system:
```javascript
const FEATURE_FLAGS = {
    useV2Calculators: false,  // Enable when ready
    useV2DifferentialDx: false,
    useV2Triads: false,
    // etc.
};
```

### Step 3: Full V2 Takeover

When all features complete and tested:
```html
<!-- V2 ONLY -->
<script src="/static/js/drugDatabase.js"></script>
<script src="/static/js/labDatabase.js"></script>
<script src="/static/js/guidelinesDatabase.js"></script>
<script type="module" src="/static/js/v2/main.js"></script>

<!-- V1 BACKUP (commented out) -->
<!--
<script src="/static/js/v1/app.js"></script>
<script src="/static/js/v1/anatomyEnhancements.js"></script>
-->
```

---

## Time Estimates

### Minimum Viable V2 (Critical Only)
- CalculatorRegistry.js: **8-12 hours**
- DifferentialDxManager.js: **4-6 hours**
- Integration + Testing: **4-6 hours**
- **Total: 16-24 hours**

### Complete V2 (All Features)
- Critical components: **16-24 hours**
- Important components: **8-12 hours**
- Testing + Polish: **8-12 hours**
- **Total: 32-48 hours**

---

## Priority Ranking

### 🔴 CRITICAL (Must Have for V2 Launch)
1. **CalculatorRegistry.js** - All 51 calculators
2. **DifferentialDxManager.js** - Differential diagnosis

### 🟡 IMPORTANT (Should Have Soon After)
3. **TriadsManager.js** - Clinical triads
4. **ExaminationManager.js** - Examination guides
5. **EmergencyProtocolsManager.js** - Emergency protocols

### 🟢 OPTIONAL (Nice to Have)
6. InterpretationToolsManager.js - ECG/X-ray tools
7. Additional calculators beyond the 51
8. Enhanced search features
9. Advanced analytics

---

## Recommended Approach

### Option A: Minimum Viable Product (FASTEST)
**Time**: 2-3 days
**Scope**: Critical components only

1. Create CalculatorRegistry.js with all 51 calculators
2. Create DifferentialDxManager.js
3. Test thoroughly
4. Deploy V2 alongside V1 (parallel running)
5. Gradually switch features to V2

**Pros**: Fast deployment, early testing
**Cons**: Some features still in V1

### Option B: Complete Feature Parity (RECOMMENDED)
**Time**: 1-2 weeks
**Scope**: All V1 features

1. Complete all critical components
2. Complete all important components
3. Comprehensive testing
4. Deploy V2 alongside V1
5. Full switch when stable

**Pros**: Complete migration, no missing features
**Cons**: Takes longer

### Option C: Phased Rollout (SAFEST)
**Time**: 2-3 weeks
**Scope**: Gradual migration

1. Deploy V2 enhancements alongside V1 (current state)
2. Add calculators one category at a time
3. Add other features incrementally
4. Test each phase thoroughly
5. Full V2 when all complete

**Pros**: Safest, continuous testing
**Cons**: Longest timeline

---

## Next Steps (Immediate Actions)

### To Start V2 Completion Today:

1. **Create CalculatorRegistry.js skeleton**
   ```bash
   # Create the file
   touch static/js/v2/modules/calculators/CalculatorRegistry.js
   ```

2. **Extract first calculator from V1**
   - Open v1/app.js
   - Find BMI calculator code
   - Convert to V2 format
   - Test it works

3. **Repeat for all 51 calculators**
   - One at a time
   - Test each one
   - Commit frequently

4. **Create DifferentialDxManager.js**
   - Extract data from V1
   - Create manager class
   - Implement UI

5. **Test Everything**
   - Enable V2 in HTML
   - Test all features
   - Fix bugs

6. **Deploy**
   - Deploy V2 alongside V1
   - Monitor for issues
   - Full switch when stable

---

## Current Blocker

**The main blocker preventing V2 from taking over is:**

# ❌ CalculatorRegistry.js DOES NOT EXIST

This single file contains all 51 clinical calculators and is the most critical component. Without it, V2 cannot provide calculator functionality.

**Once this file is created, V2 can operate independently.**

---

## Summary

| Component | Status | Priority | Blocks V2? |
|-----------|--------|----------|------------|
| CalculatorRegistry.js | ❌ Missing | 🔴 Critical | YES |
| DifferentialDxManager.js | ❌ Missing | 🔴 Critical | YES |
| TriadsManager.js | ❌ Missing | 🟡 Important | NO |
| ExaminationManager.js | ❌ Missing | 🟡 Important | NO |
| EmergencyProtocolsManager.js | ❌ Missing | 🟡 Important | NO |
| All other V2 components | ✅ Complete | - | NO |

**Bottom Line**: Create CalculatorRegistry.js and DifferentialDxManager.js, and V2 can take over from V1.
