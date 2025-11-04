/**
 * InterpretationToolsManager.js - V2 Medical Interpretation Tools Manager
 * 
 * Manages clinical interpretation guides for ECG, ABG, imaging, lab tests, and fluid analysis.
 * Extracted from V1 to provide clean, modular architecture for V2.
 * 
 * Features:
 * - 14+ interpretation tools across different clinical categories
 * - Systematic approach guides for consistent interpretation
 * - Normal values and common abnormality patterns
 * - Category filtering and search functionality
 * - Recent tracking and usage statistics
 */

class InterpretationToolsManager {
    constructor() {
        this.interpretationTools = this.initializeInterpretationTools();
        this.recentTools = [];
        this.maxRecentItems = 10;
        this.searchCache = new Map();
        
        console.log('📊 InterpretationToolsManager initialized with', Object.keys(this.interpretationTools).length, 'tools');
    }

    /**
     * Initialize the complete interpretation tools database
     * @returns {Object} Complete interpretation tools database
     */
    initializeInterpretationTools() {
        return {
            'ecg-basic': {
                name: 'ECG Interpretation Guide',
                category: 'ecg',
                type: 'systematic',
                steps: [
                    'Rate: Count QRS complexes (300/large squares or 1500/small squares)',
                    'Rhythm: Regular or irregular? P waves present?',
                    'Axis: Normal (-30° to +90°), left or right deviation?',
                    'P waves: Present before each QRS? Normal morphology?',
                    'PR interval: 120-200ms (3-5 small squares)',
                    'QRS width: <120ms (3 small squares) = narrow',
                    'ST segments: Elevated (>1mm) or depressed?',
                    'T waves: Upright in I, II, V3-V6? Inverted elsewhere?',
                    'QT interval: <440ms (men), <460ms (women)',
                    'Additional: Q waves, bundle branch blocks, etc.'
                ],
                normalValues: {
                    'Heart Rate': '60-100 bpm',
                    'PR Interval': '120-200ms',
                    'QRS Width': '<120ms',
                    'QT Interval': '<440ms (♂), <460ms (♀)'
                },
                commonAbnormalities: [
                    'STEMI: ST elevation ≥1mm in ≥2 contiguous leads',
                    'NSTEMI: ST depression, T wave inversion',
                    'AF: Irregularly irregular, absent P waves',
                    'Heart Block: Prolonged PR, dropped beats, AV dissociation'
                ]
            },
            'abg-interpretation': {
                name: 'ABG Interpretation',
                category: 'abg',
                type: 'systematic',
                steps: [
                    'Check pH: Acidotic (<7.35) or alkalotic (>7.45)?',
                    'Primary disorder: Respiratory (CO2) or metabolic (HCO3)?',
                    'Compensation: Appropriate for primary disorder?',
                    'Oxygenation: PaO2 adequate for FiO2?',
                    'Calculate A-a gradient if hypoxic',
                    'Check electrolytes: Na+, K+, Cl-, lactate'
                ],
                normalValues: {
                    'pH': '7.35-7.45',
                    'PaCO2': '4.7-6.0 kPa (35-45 mmHg)',
                    'PaO2': '>10 kPa (75 mmHg) on air',
                    'HCO3-': '22-28 mmol/L',
                    'Base Excess': '-2 to +2 mmol/L'
                },
                compensation: {
                    'Metabolic Acidosis': 'Expected pCO2 = 1.5 × [HCO3] + 8 (±2)',
                    'Metabolic Alkalosis': 'Expected pCO2 = 0.7 × [HCO3] + 21 (±2)',
                    'Respiratory Acidosis': 'Acute: HCO3 ↑ by 1 per 10 pCO2 ↑',
                    'Respiratory Alkalosis': 'Acute: HCO3 ↓ by 2 per 10 pCO2 ↓'
                }
            },
            'chest-xray': {
                name: 'Chest X-Ray Systematic Review',
                category: 'imaging',
                type: 'systematic',
                steps: [
                    'Patient details: Name, date, orientation (PA/AP/lateral)',
                    'Quality: Adequate inspiration (ribs 5-7 visible)? Rotation?',
                    'Airways: Trachea central? Carina visible?',
                    'Breathing: Lung fields clear? Pneumothorax?',
                    'Circulation: Heart size (<50% thoracic width)? Mediastinum?',
                    'Disability: Bones intact? Soft tissues normal?',
                    'Everything else: Lines, tubes, pacemakers, etc.',
                    'Review areas: Behind heart, costophrenic angles'
                ],
                commonFindings: [
                    'Consolidation: Air space opacification with air bronchograms',
                    'Pneumothorax: Pleural line with absent lung markings',
                    'Pleural effusion: Costophrenic angle blunting, meniscus sign',
                    'Pulmonary oedema: Bilateral alveolar infiltrates, Kerley B lines'
                ],
                redFlags: [
                    'Tension pneumothorax: Mediastinal shift away',
                    'Massive PE: Right heart strain, oligaemia',
                    'Aortic dissection: Widened mediastinum'
                ]
            },
            'ct-head': {
                name: 'CT Head Interpretation',
                category: 'imaging',
                type: 'systematic',
                steps: [
                    'Patient details and clinical context',
                    'Image quality: Motion artefact? Contrast given?',
                    'Blood: High density (hyperdense) areas?',
                    'Brain parenchyma: Symmetry? Grey-white differentiation?',
                    'CSF spaces: Ventricles, sulci, cisterns normal?',
                    'Bones: Skull fractures? Soft tissue swelling?',
                    'Midline shift: >5mm suggests raised ICP',
                    'Mass effect: Compression of ventricles/cisterns?'
                ],
                densities: {
                    'Hyperdense': 'Fresh blood, calcification, metal',
                    'Isodense': 'Normal brain tissue',
                    'Hypodense': 'Oedema, old infarct, CSF'
                },
                emergencyFindings: [
                    'Acute bleed: Hyperdense area in brain/ventricles',
                    'Mass effect: Midline shift, compressed ventricles',
                    'Herniation: Loss of cisterns, uncal herniation',
                    'Hydrocephalus: Enlarged ventricles'
                ]
            },
            'urinalysis': {
                name: 'Urine Dipstick Interpretation',
                category: 'urine',
                type: 'systematic',
                steps: [
                    'Appearance: Clear, cloudy, haematuria?',
                    'pH: Normal 5-7, high in UTI (Proteus)',
                    'Protein: Trace acceptable, +1 or more abnormal',
                    'Blood: Indicates RBCs - needs microscopy',
                    'Leucocytes: White cells suggest infection',
                    'Nitrites: Bacteria converting nitrates (E.coli)',
                    'Glucose: Glycosuria - diabetes or low renal threshold',
                    'Ketones: Starvation, DKA, alcohol',
                    'Specific gravity: 1.010-1.030 (hydration status)'
                ],
                normalValues: {
                    'pH': '5.0-7.0',
                    'Protein': 'Negative or trace',
                    'Blood': 'Negative',
                    'Leucocytes': 'Negative',
                    'Nitrites': 'Negative',
                    'Glucose': 'Negative',
                    'Ketones': 'Negative',
                    'Specific Gravity': '1.010-1.030'
                },
                commonAbnormalities: [
                    'UTI: Leucocytes +, nitrites + (confirm with culture)',
                    'Proteinuria: Diabetes, glomerulonephritis, pre-eclampsia',
                    'Haematuria: Stones, infection, malignancy, trauma',
                    'Glycosuria: Diabetes mellitus, pregnancy',
                    'DKA: Glucose +, ketones +++, high blood glucose'
                ]
            },
            'pleural-fluid': {
                name: 'Pleural Fluid Analysis',
                category: 'fluids',
                type: 'systematic',
                steps: [
                    'Appearance: Straw (transudate), cloudy (exudate), bloody?',
                    'Protein: >30g/L suggests exudate',
                    'LDH: >200 IU/L suggests exudate',
                    'Light\'s Criteria: Determines exudate vs transudate',
                    'Glucose: <3.3 suggests infection, TB, rheumatoid',
                    'pH: <7.2 suggests empyema or complicated parapneumonic',
                    'Cell count: WCC >1000 suggests infection',
                    'Microscopy: Gram stain, culture, cytology',
                    'Additional: Amylase, triglycerides if indicated'
                ],
                normalValues: {
                    'Protein': '<30 g/L (transudate)',
                    'LDH': '<200 IU/L',
                    'Glucose': '>3.3 mmol/L',
                    'pH': '>7.3',
                    'WCC': '<1000 cells/μL'
                },
                lightsCriteria: {
                    'Exudate if ANY of': 'Pleural protein/serum protein >0.5, Pleural LDH/serum LDH >0.6, Pleural LDH >2/3 upper limit of normal serum LDH'
                },
                commonAbnormalities: [
                    'Transudate: Heart failure, cirrhosis, nephrotic syndrome',
                    'Exudate: Pneumonia, TB, malignancy, PE',
                    'Empyema: pH <7.2, glucose <2.2, pus, positive culture',
                    'Haemothorax: Haematocrit >50% of serum haematocrit',
                    'Chylothorax: Milky, triglycerides >1.24 mmol/L'
                ]
            },
            'ascitic-fluid': {
                name: 'Ascitic Fluid Analysis',
                category: 'fluids',
                type: 'systematic',
                steps: [
                    'Appearance: Straw, cloudy, bloody, milky?',
                    'Cell count: PMN >250 = SBP',
                    'Albumin: Calculate SAAG (serum-ascites albumin gradient)',
                    'Total protein: Helps classify cause',
                    'Culture: Send in blood culture bottles',
                    'Amylase: If pancreatitis suspected',
                    'Cytology: If malignancy suspected',
                    'Gram stain: If SBP suspected'
                ],
                normalValues: {
                    'Appearance': 'Clear, straw-colored',
                    'WCC': '<500 cells/μL',
                    'PMN': '<250 cells/μL',
                    'Protein': 'Varies by cause',
                    'Glucose': 'Similar to serum'
                },
                saagInterpretation: {
                    'High SAAG (≥11 g/L)': 'Portal hypertension - cirrhosis, heart failure, Budd-Chiari',
                    'Low SAAG (<11 g/L)': 'Non-portal causes - TB, peritoneal carcinomatosis, pancreatitis'
                },
                commonAbnormalities: [
                    'SBP: PMN >250, cloudy fluid, positive culture',
                    'Malignant: Bloody, high protein, positive cytology',
                    'Cardiac: High SAAG, high protein (>25g/L)',
                    'TB: Lymphocytic, low SAAG, high protein, positive culture',
                    'Pancreatic: High amylase, low SAAG'
                ]
            },
            'csf-interpretation': {
                name: 'CSF Analysis',
                category: 'fluids',
                type: 'systematic',
                steps: [
                    'Opening pressure: 10-20 cmH2O normal',
                    'Appearance: Clear, cloudy, bloody, xanthochromia?',
                    'Cell count: WCC, RBC counts',
                    'Biochemistry: Protein, glucose (paired with serum)',
                    'Microbiology: Gram stain, culture, PCR',
                    'Opening pressure raised: >25 cm suggests raised ICP',
                    'Glucose: CSF/serum ratio normally >0.6',
                    'Additional: Oligoclonal bands, cytology if indicated'
                ],
                normalValues: {
                    'Opening Pressure': '10-20 cmH2O',
                    'Appearance': 'Clear, colourless',
                    'WCC': '<5 cells/μL (all lymphocytes)',
                    'RBC': '0 cells/μL',
                    'Protein': '0.15-0.45 g/L',
                    'Glucose': '>2/3 of serum glucose',
                    'CSF:Serum Glucose': '>0.6'
                },
                commonAbnormalities: [
                    'Bacterial meningitis: Cloudy, ↑↑↑neutrophils (>1000), ↓glucose, ↑↑protein',
                    'Viral meningitis: Clear/cloudy, ↑lymphocytes (<500), normal glucose, ↑protein',
                    'TB meningitis: Fibrin web, ↑lymphocytes, ↓↓glucose, ↑↑protein',
                    'Fungal meningitis: ↑lymphocytes, ↓glucose, ↑protein',
                    'SAH: Bloody/xanthochromic, ↑↑↑RBCs, ↑protein'
                ],
                emergencyFindings: [
                    'High opening pressure >40 cm: Risk of herniation',
                    'Gram positive diplococci: Pneumococcal meningitis',
                    'Gram negative diplococci: Meningococcal meningitis',
                    'Very low glucose <1.0: Bacterial meningitis likely'
                ]
            },
            'urine-microscopy': {
                name: 'Urine Microscopy',
                category: 'urine',
                type: 'systematic',
                steps: [
                    'RBCs: Present in haematuria, trauma, stones, malignancy',
                    'WBCs: Pyuria suggests UTI or sterile pyuria',
                    'Casts: Indicate location of pathology',
                    'Crystals: Uric acid, calcium oxalate, struvite',
                    'Bacteria: Rods (E.coli) vs cocci (Staph)',
                    'Epithelial cells: Squamous (contamination) vs renal tubular',
                    'Other: Yeast, parasites (Schistosoma)'
                ],
                castTypes: {
                    'Hyaline casts': 'Normal or concentrated urine',
                    'RBC casts': 'Glomerulonephritis, vasculitis',
                    'WBC casts': 'Pyelonephritis, interstitial nephritis',
                    'Granular casts': 'Acute tubular necrosis',
                    'Waxy casts': 'Chronic kidney disease',
                    'Fatty casts': 'Nephrotic syndrome'
                },
                commonAbnormalities: [
                    'Sterile pyuria: TB, partially treated UTI, appendicitis',
                    'Dysmorphic RBCs: Glomerular bleeding',
                    'Struvite crystals: Proteus infection (staghorn calculi)',
                    'Eosinophils: Acute interstitial nephritis',
                    'Renal tubular cells: Acute tubular necrosis'
                ]
            },
            'joint-fluid': {
                name: 'Synovial Fluid Analysis',
                category: 'fluids',
                type: 'systematic',
                steps: [
                    'Appearance: Clear (normal), cloudy (inflammatory), purulent (septic)?',
                    'Colour: Straw, yellow, blood-stained?',
                    'Viscosity: "String test" - normal forms long string',
                    'Cell count: WBC >50,000 suggests septic arthritis',
                    'Microscopy: Crystals, Gram stain, culture',
                    'Polarized microscopy: Urate vs CPPD crystals',
                    'Glucose: Low in septic arthritis',
                    'Culture: Always send if septic arthritis suspected'
                ],
                normalValues: {
                    'Appearance': 'Clear, straw-colored',
                    'Viscosity': 'High (long string)',
                    'WCC': '<200 cells/μL',
                    'PMN': '<25%',
                    'Glucose': 'Within 1 mmol/L of serum',
                    'Protein': '<30 g/L'
                },
                crystalTypes: {
                    'Monosodium urate': 'Needle-shaped, negatively birefringent (yellow when parallel to polarizer) - GOUT',
                    'CPPD': 'Rhomboid, weakly positively birefringent (blue when parallel) - PSEUDOGOUT',
                    'Hydroxyapatite': 'Clumps, non-birefringent - calcific tendinitis',
                    'Cholesterol': 'Rectangular plates - chronic effusions'
                },
                commonAbnormalities: [
                    'Septic arthritis: WBC >50,000 (>75% PMN), low glucose, positive Gram stain',
                    'Gout: WBC 2,000-100,000, urate crystals (needle-shaped, negative birefringence)',
                    'Pseudogout: WCC variable, CPPD crystals (rhomboid, positive birefringence)',
                    'Inflammatory (RA): WCC 2,000-50,000, no crystals',
                    'Haemarthrosis: Blood-stained, trauma, haemophilia, anticoagulation'
                ]
            },
            'liver-function-pattern': {
                name: 'LFT Pattern Recognition',
                category: 'labs',
                type: 'systematic',
                steps: [
                    'Identify pattern: Hepatocellular, cholestatic, or mixed?',
                    'ALT/AST raised: Hepatocellular injury',
                    'ALP/GGT raised: Cholestasis (biliary obstruction)',
                    'Isolated bilirubin: Haemolysis or Gilbert syndrome',
                    'Synthetic function: Albumin, INR (liver function)',
                    'Acute vs chronic: Duration of abnormality',
                    'Calculate AST:ALT ratio if helpful',
                    'Check for associated features: Jaundice, ascites'
                ],
                patterns: {
                    'Hepatocellular': 'ALT/AST >10× normal, ALP <3× - hepatitis, paracetamol OD, ischaemia',
                    'Cholestatic': 'ALP >3× normal, ALT <5× - biliary obstruction, PBC, PSC',
                    'Mixed': 'Both elevated - sepsis, drugs, malignancy',
                    'Isolated ALP rise': 'Bone disease, pregnancy, malignancy (check GGT)'
                },
                ratios: {
                    'AST:ALT >2': 'Alcoholic liver disease',
                    'AST:ALT <1': 'Non-alcoholic liver disease, acute hepatitis',
                    'ALP:ALT >3': 'Cholestasis predominant'
                },
                commonAbnormalities: [
                    'Paracetamol OD: Very high ALT (>1000), rising rapidly',
                    'Alcoholic hepatitis: AST:ALT >2, GGT raised',
                    'Acute viral hepatitis: Very high ALT/AST, jaundice',
                    'Cholestasis: ALP ++, bilirubin ++, GGT confirms hepatic origin',
                    'Cirrhosis: Low albumin, prolonged INR, mild transaminase rise'
                ]
            },
            'anaemia-interpretation': {
                name: 'Anaemia Investigation',
                category: 'labs',
                type: 'systematic',
                steps: [
                    'Confirm anaemia: Hb <13 g/dL (men), <12 g/dL (women)',
                    'Check MCV: Microcytic (<80), normocytic (80-100), macrocytic (>100)',
                    'Reticulocyte count: High (haemolysis/bleeding), low (production failure)',
                    'Blood film: Cell morphology, inclusions',
                    'Iron studies: Ferritin, TIBC, transferrin saturation',
                    'B12 and folate: If macrocytic',
                    'Haemolysis screen: LDH, haptoglobin, bilirubin, reticulocytes',
                    'Consider causes based on MCV pattern'
                ],
                patterns: {
                    'Microcytic (MCV <80)': 'TAILS - Thalassaemia, Anaemia of chronic disease, Iron deficiency, Lead poisoning, Sideroblastic',
                    'Normocytic (MCV 80-100)': 'Acute blood loss, chronic disease, haemolysis, CKD, marrow failure',
                    'Macrocytic (MCV >100)': 'B12/folate deficiency, alcohol, liver disease, hypothyroidism, myelodysplasia, drugs (azathioprine)'
                },
                ironStudies: {
                    'Iron deficiency': 'Low ferritin (<30), low iron, high TIBC, low saturation',
                    'Anaemia of chronic disease': 'Normal/high ferritin, low iron, low TIBC',
                    'Thalassaemia trait': 'Normal ferritin, microcytic, high RBC count',
                    'Haemochromatosis': 'High ferritin, high iron, high saturation (>45%)'
                },
                commonAbnormalities: [
                    'Iron deficiency: Microcytic, hypochromic, low ferritin - GI bleeding',
                    'B12 deficiency: Macrocytic, hypersegmented neutrophils, low B12',
                    'Haemolysis: Normocytic, high reticulocytes, high LDH, low haptoglobin',
                    'Thalassaemia: Microcytic, normal ferritin, high RBC count, family history',
                    'ACD: Normocytic/microcytic, chronic inflammation, high ferritin'
                ]
            },
            'thyroid-function': {
                name: 'Thyroid Function Tests',
                category: 'labs',
                type: 'systematic',
                steps: [
                    'Start with TSH: Screening test, most sensitive',
                    'If TSH high: Check free T4 (confirms hypothyroidism)',
                    'If TSH low: Check free T4 AND T3 (confirms hyperthyroidism)',
                    'If TSH normal: Usually thyroid function is normal',
                    'Subclinical disease: TSH abnormal but T4/T3 normal',
                    'Antibodies: TPO (Hashimoto/Graves), TRAb (Graves)',
                    'Timing: Avoid testing during acute illness (sick euthyroid)',
                    'Medication: Some drugs affect results (amiodarone, lithium)'
                ],
                normalValues: {
                    'TSH': '0.5-5.0 mU/L',
                    'Free T4': '10-20 pmol/L',
                    'Free T3': '3-9 pmol/L',
                    'TPO antibodies': '<35 IU/mL',
                    'TRAb': '<1.0 IU/L'
                },
                patterns: {
                    'Primary hypothyroidism': 'High TSH, low T4 - Hashimoto, iodine deficiency',
                    'Primary hyperthyroidism': 'Low TSH, high T4/T3 - Graves, toxic nodular goitre',
                    'Subclinical hypothyroidism': 'High TSH, normal T4 - consider treatment if TSH >10',
                    'Subclinical hyperthyroidism': 'Low TSH, normal T4/T3 - risk of AF, osteoporosis',
                    'Secondary hypothyroidism': 'Low/normal TSH, low T4 - pituitary disease',
                    'Sick euthyroid': 'Low TSH, low T3, variable T4 - acute illness, recheck when well'
                },
                commonAbnormalities: [
                    'Hashimoto thyroiditis: High TSH, low T4, positive TPO antibodies',
                    'Graves disease: Low TSH, high T3/T4, positive TRAb',
                    'Subclinical hypothyroid: TSH 5-10, normal T4, mild symptoms',
                    'Post-partum thyroiditis: Transient hyper then hypothyroidism',
                    'Drug-induced: Amiodarone (hypo/hyper), lithium (hypothyroid)'
                ]
            }
        };
    }

    /**
     * Load and display interpretation tools panel
     */
    loadInterpretationTools() {
        try {
            const container = document.getElementById('interpretation-container');
            if (!container) {
                console.error('❌ Interpretation tools container not found');
                return;
            }

            container.innerHTML = `
                <div class="search-container">
                    <input type="text" id="interpretation-search" placeholder="Search interpretation tools..." class="tool-search">
                    <button id="interpretation-search-btn">🔍</button>
                </div>
                <div id="interpretation-search-results" class="lab-grid"></div>
                <div class="interpretation-categories">
                    <button class="category-btn active" data-category="all" onclick="window.interpretationToolsManager.showInterpretationCategory('all'); event.stopPropagation();">All Tools</button>
                    <button class="category-btn" data-category="ecg" onclick="window.interpretationToolsManager.showInterpretationCategory('ecg'); event.stopPropagation();">ECG</button>
                    <button class="category-btn" data-category="abg" onclick="window.interpretationToolsManager.showInterpretationCategory('abg'); event.stopPropagation();">ABG</button>
                    <button class="category-btn" data-category="imaging" onclick="window.interpretationToolsManager.showInterpretationCategory('imaging'); event.stopPropagation();">Imaging</button>
                    <button class="category-btn" data-category="urine" onclick="window.interpretationToolsManager.showInterpretationCategory('urine'); event.stopPropagation();">Urine</button>
                    <button class="category-btn" data-category="fluids" onclick="window.interpretationToolsManager.showInterpretationCategory('fluids'); event.stopPropagation();">Fluids</button>
                    <button class="category-btn" data-category="labs" onclick="window.interpretationToolsManager.showInterpretationCategory('labs'); event.stopPropagation();">Lab Tests</button>
                </div>
                <div id="interpretation-tools-list" class="interpretation-grid"></div>
            `;
            
            this.setupSearchHandlers();
            this.displayInterpretationTools(Object.keys(this.interpretationTools));
            console.log('✅ Interpretation tools loaded successfully!');
            
        } catch (error) {
            console.error('❌ Error loading interpretation tools:', error);
            this.showError('Unable to load interpretation tools. Please refresh the page.');
        }
    }

    /**
     * Setup search event handlers
     */
    setupSearchHandlers() {
        const searchInput = document.getElementById('interpretation-search');
        const searchBtn = document.getElementById('interpretation-search-btn');
        
        if (searchInput && searchBtn) {
            searchInput.addEventListener('input', () => this.searchInterpretationTools());
            searchBtn.addEventListener('click', () => this.searchInterpretationTools());
        }

        // Setup category filtering
        this.setupCategoryFiltering();
    }

    /**
     * Setup category filtering handlers
     */
    setupCategoryFiltering() {
        const categoryBtns = document.querySelectorAll('.interpretation-categories .category-btn');
        
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const category = btn.dataset.category || 'all';
                this.showInterpretationCategory(category);
            });
        });
    }

    /**
     * Search interpretation tools
     */
    searchInterpretationTools() {
        const searchInput = document.getElementById('interpretation-search');
        const resultsContainer = document.getElementById('interpretation-search-results');
        
        if (!searchInput || !resultsContainer) return;
        
        const query = searchInput.value.toLowerCase().trim();
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }

        // Check cache first
        const cacheKey = `search_${query}`;
        if (this.searchCache.has(cacheKey)) {
            resultsContainer.innerHTML = this.searchCache.get(cacheKey);
            return;
        }
        
        const matches = Object.keys(this.interpretationTools).filter(key => {
            const tool = this.interpretationTools[key];
            return tool.name.toLowerCase().includes(query) ||
                   tool.category.toLowerCase().includes(query) ||
                   tool.type.toLowerCase().includes(query) ||
                   tool.steps.some(step => step.toLowerCase().includes(query));
        });
        
        let html = '';
        if (matches.length === 0) {
            html = '<div class="no-results">No interpretation tools found</div>';
        } else {
            html = matches.map(key => {
                const tool = this.interpretationTools[key];
                return `
                    <div class="interpretation-item" onclick="window.interpretationToolsManager.showInterpretationDetail('${key}'); event.stopPropagation();">
                        <div class="interpretation-header">
                            <h4>${tool.name}</h4>
                            <span class="interpretation-type">${tool.type}</span>
                        </div>
                        <div class="interpretation-meta">
                            <span class="interpretation-category">${tool.category}</span>
                            <span class="step-count">${tool.steps.length} steps</span>
                        </div>
                        <div class="interpretation-preview">
                            ${tool.steps.slice(0, 2).map(step => 
                                `<div class="step-preview">• ${step}</div>`
                            ).join('')}
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Cache the result
        this.searchCache.set(cacheKey, html);
        resultsContainer.innerHTML = html;
    }

    /**
     * Show interpretation tools by category
     * @param {string} category - Category to filter by
     */
    showInterpretationCategory(category) {
        let filteredTools = Object.keys(this.interpretationTools);
        
        if (category !== 'all') {
            filteredTools = filteredTools.filter(toolId => 
                this.interpretationTools[toolId].category === category
            );
        }
        
        this.displayInterpretationTools(filteredTools);
    }

    /**
     * Display interpretation tools
     * @param {Array} toolIds - Array of tool IDs to display
     */
    displayInterpretationTools(toolIds) {
        const container = document.getElementById('interpretation-tools-list');
        if (!container) return;
        
        if (toolIds.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <h3>📋 No interpretation tools found</h3>
                    <p>Try adjusting your category filter.</p>
                </div>
            `;
            return;
        }
        
        const toolsHtml = toolIds.map(toolId => {
            const tool = this.interpretationTools[toolId];
            
            return `
                <div class="interpretation-item" onclick="window.interpretationToolsManager.showInterpretationDetail('${toolId}'); event.stopPropagation();">
                    <div class="interpretation-header">
                        <h4>${tool.name}</h4>
                        <span class="interpretation-type">${tool.type}</span>
                    </div>
                    <div class="interpretation-meta">
                        <span class="interpretation-category">${tool.category}</span>
                        <span class="step-count">${tool.steps.length} steps</span>
                    </div>
                    <div class="interpretation-preview">
                        ${tool.steps.slice(0, 2).map(step => 
                            `<div class="step-preview">• ${step}</div>`
                        ).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = toolsHtml;
    }

    /**
     * Show detailed view for a specific interpretation tool
     * @param {string} toolId - ID of the tool to display
     */
    showInterpretationDetail(toolId) {
        const tool = this.interpretationTools[toolId];
        if (!tool) return;
        
        const container = document.getElementById('interpretation-tools-list');
        if (!container) return;
        
        // Add to recent
        this.addToRecent(toolId);
        
        let additionalSections = '';
        
        if (tool.normalValues) {
            additionalSections += `
                <div class="normal-values">
                    <h4>📊 Normal Values</h4>
                    <ul class="values-list">
                        ${Object.entries(tool.normalValues).map(([key, value]) => 
                            `<li><strong>${key}:</strong> ${value}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (tool.commonAbnormalities) {
            additionalSections += `
                <div class="common-abnormalities">
                    <h4>⚠️ Common Abnormalities</h4>
                    <ul class="abnormalities-list">
                        ${tool.commonAbnormalities.map(abnormality => `<li>${abnormality}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (tool.compensation) {
            additionalSections += `
                <div class="compensation-rules">
                    <h4>⚖️ Compensation Rules</h4>
                    <ul class="compensation-list">
                        ${Object.entries(tool.compensation).map(([key, value]) => 
                            `<li><strong>${key}:</strong> ${value}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (tool.emergencyFindings) {
            additionalSections += `
                <div class="emergency-findings">
                    <h4>🚨 Emergency Findings</h4>
                    <ul class="emergency-list">
                        ${tool.emergencyFindings.map(finding => `<li>${finding}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (tool.redFlags) {
            additionalSections += `
                <div class="red-flags">
                    <h4>🚩 Red Flags</h4>
                    <ul class="red-flags-list">
                        ${tool.redFlags.map(flag => `<li>${flag}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (tool.commonFindings) {
            additionalSections += `
                <div class="common-findings">
                    <h4>🔍 Common Findings</h4>
                    <ul class="findings-list">
                        ${tool.commonFindings.map(finding => `<li>${finding}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Add specific sections for different tool types
        if (tool.densities) {
            additionalSections += `
                <div class="density-guide">
                    <h4>🧠 Density Guide</h4>
                    <ul class="density-list">
                        ${Object.entries(tool.densities).map(([key, value]) => 
                            `<li><strong>${key}:</strong> ${value}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        if (tool.lightsCriteria) {
            additionalSections += `
                <div class="lights-criteria">
                    <h4>💡 Light's Criteria</h4>
                    <ul class="criteria-list">
                        ${Object.entries(tool.lightsCriteria).map(([key, value]) => 
                            `<li><strong>${key}:</strong> ${value}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        if (tool.saagInterpretation) {
            additionalSections += `
                <div class="saag-interpretation">
                    <h4>🔬 SAAG Interpretation</h4>
                    <ul class="saag-list">
                        ${Object.entries(tool.saagInterpretation).map(([key, value]) => 
                            `<li><strong>${key}:</strong> ${value}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        if (tool.castTypes) {
            additionalSections += `
                <div class="cast-types">
                    <h4>🔬 Cast Types</h4>
                    <ul class="cast-list">
                        ${Object.entries(tool.castTypes).map(([key, value]) => 
                            `<li><strong>${key}:</strong> ${value}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        if (tool.crystalTypes) {
            additionalSections += `
                <div class="crystal-types">
                    <h4>💎 Crystal Types</h4>
                    <ul class="crystal-list">
                        ${Object.entries(tool.crystalTypes).map(([key, value]) => 
                            `<li><strong>${key}:</strong> ${value}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        if (tool.patterns) {
            additionalSections += `
                <div class="patterns">
                    <h4>📋 Patterns</h4>
                    <ul class="pattern-list">
                        ${Object.entries(tool.patterns).map(([key, value]) => 
                            `<li><strong>${key}:</strong> ${value}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        if (tool.ratios) {
            additionalSections += `
                <div class="ratios">
                    <h4>📊 Ratios</h4>
                    <ul class="ratio-list">
                        ${Object.entries(tool.ratios).map(([key, value]) => 
                            `<li><strong>${key}:</strong> ${value}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        if (tool.ironStudies) {
            additionalSections += `
                <div class="iron-studies">
                    <h4>🩸 Iron Studies</h4>
                    <ul class="iron-list">
                        ${Object.entries(tool.ironStudies).map(([key, value]) => 
                            `<li><strong>${key}:</strong> ${value}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }
        
        const html = `
            <div class="guideline-detail">
                <button class="back-btn" onclick="window.interpretationToolsManager.loadInterpretationTools(); event.stopPropagation();">← Back to Interpretation Tools</button>
                <h3>📊 ${tool.name}</h3>
                
                <div class="info-section">
                    <div class="interpretation-type-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin-bottom: 20px;">
                        ${tool.type} approach
                    </div>
                </div>
                
                <div class="info-section">
                    <h4>📋 Systematic Steps</h4>
                    <ol class="interpretation-steps">
                        ${tool.steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
                
                ${additionalSections}
            </div>
        `;
        
        container.innerHTML = html;
    }

    /**
     * Add tool to recent items
     * @param {string} toolId - ID of the tool
     */
    addToRecent(toolId) {
        // Remove if already exists
        this.recentTools = this.recentTools.filter(id => id !== toolId);
        
        // Add to beginning
        this.recentTools.unshift(toolId);
        
        // Limit to max items
        if (this.recentTools.length > this.maxRecentItems) {
            this.recentTools = this.recentTools.slice(0, this.maxRecentItems);
        }
    }

    /**
     * Get recent tools
     * @returns {Array} Array of recent tool IDs
     */
    getRecentTools() {
        return this.recentTools;
    }

    /**
     * Get all available categories
     * @returns {Array} Array of unique categories
     */
    getCategories() {
        const categories = [...new Set(Object.values(this.interpretationTools).map(t => t.category))];
        return categories.sort();
    }

    /**
     * Get tools count by category
     * @returns {Object} Object with category counts
     */
    getCategoryCounts() {
        const counts = {};
        Object.values(this.interpretationTools).forEach(tool => {
            counts[tool.category] = (counts[tool.category] || 0) + 1;
        });
        return counts;
    }

    /**
     * Get statistics about interpretation tools database
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const categories = this.getCategories();
        const counts = this.getCategoryCounts();
        
        return {
            totalTools: Object.keys(this.interpretationTools).length,
            totalCategories: categories.length,
            categories: categories,
            categoryCounts: counts,
            recentCount: this.recentTools.length
        };
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        const container = document.getElementById('interpretation-container');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Interpretation Tools Loading Error</h3>
                    <p>${message}</p>
                    <button onclick="window.interpretationToolsManager.loadInterpretationTools()">Retry</button>
                </div>
            `;
        }
    }
}

// Create singleton instance
const interpretationToolsManager = new InterpretationToolsManager();

// Export singleton instance
export { interpretationToolsManager };
export default interpretationToolsManager;