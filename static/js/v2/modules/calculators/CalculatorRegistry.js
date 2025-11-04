/**
 * Calculator Registry - V2 Modular Calculators
 * 
 * STREAMLINED APPROACH: 
 * Since V1 code is working, we use V1's existing implementations
 * via window.quizApp as a bridge until full extraction is complete.
 * 
 * This allows V2 to work immediately while maintaining V1 functionality.
 */

// Helper to get V1 app instance
const getV1App = () => window.quizApp || window.MLAQuizAppV1;

// Helper to create calculator entry that bridges to V1
const createV1BridgeCalculator = (id, name, category, description, v1MethodName) => ({
    id,
    name,
    category,
    description,
    keywords: [],
    getTemplate: () => {
        const v1App = getV1App();
        if (v1App && v1App[v1MethodName]) {
            return v1App[v1MethodName]();
        }
        return `<p>Calculator not available (V1 app not loaded)</p>`;
    },
    calculate: () => {
        // V1 calculators update DOM directly, so this is handled by bindEvents
        return { success: true };
    },
    bindEvents: () => {
        const v1App = getV1App();
        // V1 buttons already have onclick handlers in their HTML
        // Just need to ensure quizApp is available globally
        if (!window.quizApp && v1App) {
            window.quizApp = v1App;
        }
    }
});

export const calculatorRegistry = {
    
    // Body Metrics
    'bmi': createV1BridgeCalculator('bmi', 'BMI Calculator', 'Body Metrics', 'Calculate BMI and assess weight status', 'getBMICalculator'),
    'bsa': createV1BridgeCalculator('bsa', 'Body Surface Area', 'Body Metrics', 'Calculate body surface area', 'getBSACalculator'),
    'fluid-balance': createV1BridgeCalculator('fluid-balance', 'Fluid Balance Calculator', 'Body Metrics', 'Calculate fluid balance', 'getFluidBalanceCalculator'),
    
    // Cardiology
    'chads2vasc': createV1BridgeCalculator('chads2vasc', 'CHA₂DS₂-VASc Score', 'Cardiology', 'Stroke risk in atrial fibrillation', 'getCHADS2VAScCalculator'),
    'hasbled': createV1BridgeCalculator('hasbled', 'HAS-BLED Score', 'Cardiology', 'Bleeding risk with anticoagulation', 'getHASBLEDCalculator'),
    'grace': createV1BridgeCalculator('grace', 'GRACE Score', 'Cardiology', 'ACS risk stratification', 'getGRACECalculator'),
    'crusade': createV1BridgeCalculator('crusade', 'CRUSADE Score', 'Cardiology', 'Bleeding risk in ACS', 'getCRUSADECalculator'),
    'timi': createV1BridgeCalculator('timi', 'TIMI Risk Score', 'Cardiology', 'Risk stratification in ACS', 'getTIMICalculator'),
    'qrisk': createV1BridgeCalculator('qrisk', 'QRISK3 Calculator', 'Cardiology', 'CV risk assessment', 'getQRISKCalculator'),
    'qtc': createV1BridgeCalculator('qtc', 'Corrected QT Calculator', 'Cardiology', 'QT interval correction', 'getQTcCalculator'),
    'map': createV1BridgeCalculator('map', 'Mean Arterial Pressure', 'Cardiology', 'Calculate MAP', 'getMAPCalculator'),
    'rcri': createV1BridgeCalculator('rcri', 'Revised Cardiac Risk Index', 'Cardiology', 'Perioperative cardiac risk', 'getRCRICalculator'),
    
    // Neurology
    'gcs': createV1BridgeCalculator('gcs', 'Glasgow Coma Scale', 'Neurology', 'Assess level of consciousness', 'getGCSCalculator'),
    'nihss': createV1BridgeCalculator('nihss', 'NIH Stroke Scale', 'Neurology', 'Stroke severity assessment', 'getNIHSSCalculator'),
    'abcd2': createV1BridgeCalculator('abcd2', 'ABCD² Score', 'Neurology', 'TIA stroke risk', 'getABCD2Calculator'),
    'rankin': createV1BridgeCalculator('rankin', 'Modified Rankin Scale', 'Neurology', 'Stroke disability scale', 'getModifiedRankinCalculator'),
    
    // Respiratory
    'wells': createV1BridgeCalculator('wells', 'Wells Score for PE', 'Respiratory', 'Pulmonary embolism probability', 'getWellsCalculator'),
    'perc': createV1BridgeCalculator('perc', 'PERC Rule', 'Respiratory', 'PE risk stratification', 'getPERCCalculator'),
    'crb65': createV1BridgeCalculator('crb65', 'CRB-65 Score', 'Respiratory', 'Pneumonia severity', 'getCRB65Calculator'),
    'curb65': createV1BridgeCalculator('curb65', 'CURB-65 Score', 'Respiratory', 'Pneumonia severity assessment', 'getCURB65Calculator'),
    'news2': createV1BridgeCalculator('news2', 'NEWS2 Score', 'Respiratory', 'Early warning score', 'getNEWS2Calculator'),
    'aa-gradient': createV1BridgeCalculator('aa-gradient', 'A-a Gradient', 'Respiratory', 'Alveolar-arterial gradient', 'getAAGradientCalculator'),
    'asthma': createV1BridgeCalculator('asthma', 'Asthma Severity Assessment', 'Respiratory', 'Assess asthma severity', 'getAsthmaCalculator'),
    
    // Critical Care
    'apache': createV1BridgeCalculator('apache', 'APACHE II Score', 'Critical Care', 'ICU mortality prediction', 'getAPACHECalculator'),
    'mews': createV1BridgeCalculator('mews', 'MEWS Score', 'Critical Care', 'Modified early warning score', 'getMEWSCalculator'),
    'rass': createV1BridgeCalculator('rass', 'RASS Scale', 'Critical Care', 'Sedation assessment', 'getRASSCalculator'),
    'madders': createV1BridgeCalculator('madders', 'MADDERS Score', 'Critical Care', 'Delirium assessment', 'getMADDERSCalculator'),
    'vasopressor': createV1BridgeCalculator('vasopressor', 'Vasopressor Dosing', 'Critical Care', 'Calculate vasopressor doses', 'getVasopressorCalculator'),
    'infusion-rate': createV1BridgeCalculator('infusion-rate', 'Infusion Rate Calculator', 'Critical Care', 'Calculate infusion rates', 'getInfusionRateCalculator'),
    
    // Renal
    'egfr': createV1BridgeCalculator('egfr', 'eGFR Calculator', 'Renal', 'Estimate glomerular filtration rate', 'getEGFRCalculator'),
    'cockcroft-gault': createV1BridgeCalculator('cockcroft-gault', 'Cockcroft-Gault eGFR', 'Renal', 'Calculate eGFR', 'getCockcroftGaultCalculator'),
    'urea-creatinine': createV1BridgeCalculator('urea-creatinine', 'Urea:Creatinine Ratio', 'Renal', 'Assess renal function', 'getUreaCreatinineCalculator'),
    'corrected-sodium': createV1BridgeCalculator('corrected-sodium', 'Corrected Sodium', 'Renal', 'Sodium correction for glucose', 'getCorrectedSodiumCalculator'),
    
    // Gastroenterology
    'rockall': createV1BridgeCalculator('rockall', 'Rockall Score', 'Gastroenterology', 'Upper GI bleed risk', 'getRockallCalculator'),
    'glasgow-blatchford': createV1BridgeCalculator('glasgow-blatchford', 'Glasgow-Blatchford Score', 'Gastroenterology', 'GI bleed risk', 'getGlasgowBlatchfordCalculator'),
    'child-pugh': createV1BridgeCalculator('child-pugh', 'Child-Pugh Score', 'Gastroenterology', 'Liver disease severity', 'getChildPughCalculator'),
    
    // Emergency Medicine
    'ottawa-ankle': createV1BridgeCalculator('ottawa-ankle', 'Ottawa Ankle Rules', 'Emergency', 'Ankle injury imaging decision', 'getOttawaAnkleCalculator'),
    'centor': createV1BridgeCalculator('centor', 'Centor Score', 'Emergency', 'Strep throat probability', 'getCentorCalculator'),
    'alvarado': createV1BridgeCalculator('alvarado', 'Alvarado Score', 'Emergency', 'Appendicitis probability', 'getAlvaradoCalculator'),
    'wells-dvt': createV1BridgeCalculator('wells-dvt', 'Wells DVT Score', 'Emergency', 'DVT probability', 'getWellsDVTCalculator'),
    
    // Geriatrics
    'frailty': createV1BridgeCalculator('frailty', 'Clinical Frailty Scale', 'Geriatrics', 'Rockwood frailty assessment', 'getFrailtyCalculator'),
    'barthel': createV1BridgeCalculator('barthel', 'Barthel Index', 'Geriatrics', 'Activities of daily living', 'getBarthelCalculator'),
    'waterlow': createV1BridgeCalculator('waterlow', 'Waterlow Score', 'Geriatrics', 'Pressure ulcer risk', 'getWaterlowCalculator'),
    'must': createV1BridgeCalculator('must', 'MUST Score', 'Geriatrics', 'Malnutrition screening', 'getMUSTCalculator'),
    
    // Psychiatry
    'phq9': createV1BridgeCalculator('phq9', 'PHQ-9 Depression Scale', 'Psychiatry', 'Depression severity', 'getPHQ9Calculator'),
    'gad7': createV1BridgeCalculator('gad7', 'GAD-7 Anxiety Scale', 'Psychiatry', 'Anxiety severity', 'getGAD7Calculator'),
    'mse': createV1BridgeCalculator('mse', 'Mental State Examination', 'Psychiatry', 'MSE assessment tool', 'getMSECalculator'),
    'mmse': createV1BridgeCalculator('mmse', 'Mini Mental State Examination', 'Psychiatry', 'Cognitive screening', 'getMMSECalculator'),
    
    // Endocrine
    'insulin-sliding': createV1BridgeCalculator('insulin-sliding', 'Insulin Sliding Scale', 'Endocrine', 'Variable insulin dosing', 'getInsulinSlidingCalculator'),
    
    // Clinical Chemistry
    'anion-gap': createV1BridgeCalculator('anion-gap', 'Anion Gap Calculator', 'Chemistry', 'Calculate anion gap', 'getAnionGapCalculator'),
    'osmolal-gap': createV1BridgeCalculator('osmolal-gap', 'Osmolal Gap', 'Chemistry', 'Calculate osmolal gap', 'getOsmolalGapCalculator'),
    'corrected-calcium': createV1BridgeCalculator('corrected-calcium', 'Corrected Calcium', 'Chemistry', 'Calcium correction for albumin', 'getCorrectedCalciumCalculator'),
    'ldl-calc': createV1BridgeCalculator('ldl-calc', 'LDL Calculator', 'Chemistry', 'Calculate LDL cholesterol', 'getLDLCalculator'),
    'winters': createV1BridgeCalculator('winters', 'Winters Formula', 'Chemistry', 'Expected pCO2 in metabolic acidosis', 'getWintersCalculator'),
    
    // Obstetrics
    'apgar': createV1BridgeCalculator('apgar', 'APGAR Score', 'Obstetrics', 'Newborn assessment', 'getAPGARCalculator'),
    'bishop': createV1BridgeCalculator('bishop', 'Bishop Score', 'Obstetrics', 'Cervical ripeness assessment', 'getBishopCalculator'),
    
    // Other
    'frax-fracture': createV1BridgeCalculator('frax-fracture', 'FRAX Fracture Risk', 'Other', 'Osteoporosis fracture risk', 'getFractureRiskCalculator'),
    'unit-converter': createV1BridgeCalculator('unit-converter', 'Clinical Unit Converter', 'Other', 'Convert clinical units', 'getUnitConverterCalculator'),
    'drug-volume': createV1BridgeCalculator('drug-volume', 'Drug Volume Calculator', 'Other', 'Calculate drug volumes', 'getDrugVolumeCalculator'),
    'paediatric-dosing': createV1BridgeCalculator('paediatric-dosing', 'Paediatric Dosing Calculator', 'Other', 'Calculate paediatric doses', 'getPaediatricDosingCalculator'),
    'palliative': createV1BridgeCalculator('palliative', 'Palliative Care Calculator', 'Other', 'Palliative medication doses', 'getPalliativeCalculator'),
};

/**
 * Helper function to get calculator by ID
 */
export function getCalculator(calcId) {
    return calculatorRegistry[calcId];
}

/**
 * Helper function to get all calculator IDs
 */
export function getAllCalculatorIds() {
    return Object.keys(calculatorRegistry);
}

/**
 * Helper function to get calculators by category
 */
export function getCalculatorsByCategory(category) {
    return Object.values(calculatorRegistry)
        .filter(calc => calc.category === category);
}

/**
 * Helper function to get all categories
 */
export function getCategories() {
    const categories = new Set();
    Object.values(calculatorRegistry).forEach(calc => {
        categories.add(calc.category);
    });
    return Array.from(categories).sort();
}

/**
 * Helper function to search calculators
 */
export function searchCalculators(query) {
    const term = query.toLowerCase();
    return Object.values(calculatorRegistry).filter(calc => {
        return calc.name.toLowerCase().includes(term) ||
               calc.description.toLowerCase().includes(term) ||
               calc.keywords.some(kw => kw.includes(term));
    });
}
