/**
 * Medical Mnemonics Database
 * Comprehensive collection of medical memory aids organized by specialty
 * Data extracted from V1 app.js and organized for V2 architecture
 */

export const mnemonicsDatabase = {
    // Cardiovascular Mnemonics
    'mona-acs': {
        title: 'MONA for Acute Coronary Syndrome',
        category: 'cardiovascular',
        mnemonic: 'MONA',
        meaning: 'Morphine, Oxygen, Nitrates, Aspirin',
        usage: 'Initial management of acute coronary syndrome',
        details: [
            '<strong>M</strong> - <strong>Morphine</strong> for pain relief (also reduces preload)',
            '<strong>O</strong> - <strong>Oxygen</strong> if hypoxic (SpO2 <94%)',
            '<strong>N</strong> - <strong>Nitrates</strong> (GTN) for symptom relief',
            '<strong>A</strong> - <strong>Aspirin</strong> 300mg (antiplatelet)',
            '',
            '💊 Modern approach adds:',
            '• Clopidogrel/Ticagrelor (dual antiplatelet)',
            '• Beta-blocker once stable',
            '• ACE inhibitor',
            '• Statin',
            '',
            '⚠️ Note: Oxygen only if hypoxic - avoid hyperoxia'
        ]
    },
    'i-failed-heart-failure': {
        title: 'I FAILED - Heart Failure Causes',
        category: 'cardiovascular',
        mnemonic: 'I FAILED',
        meaning: 'Causes of Heart Failure Decompensation',
        usage: 'Remember precipitants of acute heart failure',
        details: [
            '<strong>I</strong> - <strong>Ischaemia/Infarction</strong> (new MI)',
            '<strong>F</strong> - <strong>Fluid overload</strong> (dietary indiscretion, excess IV fluids)',
            '<strong>A</strong> - <strong>Arrhythmias</strong> (AF, VT)',
            '<strong>I</strong> - <strong>Iatrogenic</strong> (medications - NSAIDs, steroids)',
            '<strong>L</strong> - <strong>Lifestyle</strong> (alcohol, smoking, cocaine)',
            '<strong>E</strong> - <strong>Endocrine</strong> (thyroid disease, Cushing)',
            '<strong>D</strong> - <strong>Dietary</strong> (high salt intake, non-compliance)',
            '',
            '🩺 Always look for reversible causes in acute decompensation'
        ]
    },
    'chops-shock': {
        title: 'CHOPS - Types of Shock',
        category: 'cardiovascular',
        mnemonic: 'CHOPS',
        meaning: 'Cardiogenic, Hypovolaemic, Obstructive, Psychogenic, Septic',
        usage: 'Classification of shock types',
        details: [
            '<strong>C</strong> - <strong>Cardiogenic</strong> (pump failure - MI, myocarditis)',
            '<strong>H</strong> - <strong>Hypovolaemic</strong> (fluid loss - bleeding, dehydration)',
            '<strong>O</strong> - <strong>Obstructive</strong> (mechanical - PE, tamponade, tension pneumothorax)',
            '<strong>P</strong> - <strong>Psychogenic</strong> (vasovagal)',
            '<strong>S</strong> - <strong>Septic</strong> (distributive - infection, vasodilation)',
            '',
            '💡 Also remember:',
            '• Anaphylactic shock (distributive)',
            '• Neurogenic shock (spinal injury)',
            '',
            '🔬 Distinguish by clinical features and haemodynamic parameters'
        ]
    },

    // Respiratory Mnemonics
    'chest-life-threatening-asthma': {
        title: 'CHEST - Life-Threatening Asthma',
        category: 'respiratory',
        mnemonic: 'CHEST',
        meaning: 'Clinical features of life-threatening asthma',
        usage: 'Identify patients requiring ITU admission',
        details: [
            '<strong>C</strong> - <strong>Confusion/Coma</strong> (hypoxia/hypercapnia)',
            '<strong>H</strong> - <strong>Hypotension</strong> (severe attack)',
            '<strong>E</strong> - <strong>Exhaustion</strong> (tiring, unable to complete sentences)',
            '<strong>S</strong> - <strong>Silent chest</strong> (no wheeze - very little air movement)',
            '<strong>T</strong> - <strong>Tachycardia</strong> (>140 bpm)',
            '',
            '⚠️ Other features:',
            '• SpO2 <92%',
            '• PaO2 <8 kPa',
            '• Normal/raised PaCO2 (4.6-6 kPa)',
            '• Peak flow <33% predicted',
            '',
            '🚨 Requires immediate senior review and ITU consideration'
        ]
    },
    'curb-65': {
        title: 'CURB-65 - Pneumonia Severity',
        category: 'respiratory',
        mnemonic: 'CURB-65',
        meaning: 'Confusion, Urea, Respiratory rate, Blood pressure, 65 years',
        usage: 'Pneumonia severity assessment and admission decision',
        details: [
            '<strong>C</strong> - <strong>Confusion</strong> (AMTS ≤8 or new disorientation)',
            '<strong>U</strong> - <strong>Urea</strong> >7 mmol/L',
            '<strong>R</strong> - <strong>Respiratory rate</strong> ≥30/min',
            '<strong>B</strong> - <strong>Blood pressure</strong> (systolic <90 or diastolic ≤60 mmHg)',
            '<strong>65</strong> - <strong>Age</strong> ≥65 years',
            '',
            '📊 Scoring:',
            '• Score 0-1: Low risk → consider home treatment',
            '• Score 2: Intermediate risk → consider hospital admission',
            '• Score 3-5: High risk → urgent hospital admission',
            '',
            '💡 CRB-65 (without urea) can be used in community'
        ]
    },

    // Neurological Mnemonics
    'fast-stroke': {
        title: 'FAST - Stroke Recognition',
        category: 'neurology',
        mnemonic: 'FAST',
        meaning: 'Face, Arms, Speech, Time',
        usage: 'Public stroke recognition campaign',
        details: [
            '<strong>F</strong> - <strong>Face</strong> drooping (ask patient to smile)',
            '<strong>A</strong> - <strong>Arms</strong> weakness (can they raise both arms?)',
            '<strong>S</strong> - <strong>Speech</strong> difficulty (slurred or unable to speak)',
            '<strong>T</strong> - <strong>Time</strong> to call 999 immediately',
            '',
            '⏱️ Time is brain:',
            '• Thrombolysis window: 4.5 hours',
            '• Thrombectomy window: up to 24 hours (selected patients)',
            '• Every minute counts - 1.9 million neurons lost per minute',
            '',
            '🚨 Call 999 immediately if any symptoms present'
        ]
    },
    'dimtop-confusion': {
        title: 'DIMTOP - Causes of Confusion',
        category: 'neurology',
        mnemonic: 'DIMTOP',
        meaning: 'Common reversible causes of acute confusion',
        usage: 'Systematic approach to delirium assessment',
        details: [
            '<strong>D</strong> - <strong>Drugs</strong> (opioids, benzodiazepines, anticholinergics)',
            '<strong>I</strong> - <strong>Infection</strong> (UTI, pneumonia, meningitis)',
            '<strong>M</strong> - <strong>Metabolic</strong> (hypo/hyperglycemia, Na+, Ca2+)',
            '<strong>T</strong> - <strong>Trauma</strong> (head injury, subdural hematoma)',
            '<strong>O</strong> - <strong>Oxygen</strong> (hypoxia from any cause)',
            '<strong>P</strong> - <strong>Pain</strong> (acute pain, urinary retention)',
            '',
            '💡 Also consider:',
            '• Alcohol withdrawal',
            '• Liver failure (hepatic encephalopathy)',
            '• Renal failure (uremic encephalopathy)',
            '',
            '🔬 Investigate and treat underlying cause'
        ]
    },
    'move-gcs': {
        title: 'MOVE - Remembering GCS Motor Score',
        category: 'neurology',
        mnemonic: 'MOVE',
        meaning: 'Motor response grading in GCS',
        usage: 'Remember motor component of Glasgow Coma Scale',
        details: [
            '<strong>M</strong> - <strong>M</strong>otor score 1-6:',
            '',
            '6 - <strong>O</strong>beys commands',
            '5 - Localises to pain',
            '4 - Withdraws from pain',
            '3 - Flexion to pain (decorticate)',
            '2 - <strong>E</strong>xtension to pain (decerebrate)',
            '1 - No response',
            '',
            '📊 Total GCS = Eye (4) + Verbal (5) + Motor (6) = 15',
            '',
            '⚠️ GCS <8 indicates severe impairment and need for airway protection'
        ]
    },

    // Gastrointestinal Mnemonics
    'abcde-gi-bleeding': {
        title: 'ABCDE - Upper GI Bleeding Management',
        category: 'gastroenterology',
        mnemonic: 'ABCDE',
        meaning: 'Systematic approach to GI bleeding',
        usage: 'Initial management of acute upper GI bleeding',
        details: [
            '<strong>A</strong> - <strong>Airway</strong> protection (risk of aspiration)',
            '<strong>B</strong> - <strong>Breathing</strong> (high-flow oxygen)',
            '<strong>C</strong> - <strong>Circulation</strong> (two large-bore cannulas, fluid resuscitation)',
            '<strong>D</strong> - <strong>Drugs</strong> (PPI, tranexamic acid if needed)',
            '<strong>E</strong> - <strong>Endoscopy</strong> (within 24h, urgent if shocked)',
            '',
            '💉 Resuscitation targets:',
            '• Hb >70 g/L (restrictive strategy)',
            '• Platelets >50 × 10⁹/L',
            '• INR <1.5',
            '',
            '🔬 Calculate Glasgow-Blatchford and Rockall scores'
        ]
    },
    'hepatic-enceph': {
        title: 'HEPATIC - Hepatic Encephalopathy Precipitants',
        category: 'gastroenterology',
        mnemonic: 'HEPATIC',
        meaning: 'Causes of hepatic encephalopathy decompensation',
        usage: 'Identify and treat reversible precipitants',
        details: [
            '<strong>H</strong> - <strong>H</strong>ypoglycemia',
            '<strong>E</strong> - <strong>E</strong>lectrolyte imbalance (K+, Na+)',
            '<strong>P</strong> - <strong>P</strong>rotein overload (GI bleed, constipation)',
            '<strong>A</strong> - <strong>A</strong>lcohol or drug use',
            '<strong>T</strong> - <strong>T</strong>oxins/medications (sedatives)',
            '<strong>I</strong> - <strong>I</strong>nfection (SBP, UTI, pneumonia)',
            '<strong>C</strong> - <strong>C</strong>onstipation',
            '',
            '💊 Treatment:',
            '• Lactulose (bowel clearance)',
            '• Rifaximin (reduce ammonia-producing bacteria)',
            '• Treat underlying precipitant',
            '',
            '🩺 Grade using West Haven criteria (1-4)'
        ]
    },

    // Renal Mnemonics
    'pre-renal-post': {
        title: 'PRE-RENAL-POST - Acute Kidney Injury Classification',
        category: 'renal',
        mnemonic: 'PRE-RENAL-POST',
        meaning: 'Categories of acute kidney injury',
        usage: 'Systematic approach to AKI diagnosis',
        details: [
            '<strong>PRE-RENAL</strong> (70% of AKI):',
            '• Hypovolemia (hemorrhage, dehydration)',
            '• Hypotension (sepsis, cardiogenic shock)',
            '• Renal artery stenosis',
            '• NSAIDs, ACE inhibitors',
            '',
            '<strong>RENAL</strong> (intrinsic, 25% of AKI):',
            '• Acute tubular necrosis (ATN)',
            '• Glomerulonephritis',
            '• Interstitial nephritis',
            '• Vascular (vasculitis)',
            '',
            '<strong>POST-RENAL</strong> (5% of AKI):',
            '• Obstruction: stones, tumor, BPH',
            '• Bilateral ureteric obstruction',
            '• Bladder outlet obstruction',
            '',
            '🔬 Urinalysis helps distinguish causes'
        ]
    },
    'murder-hyperkalaemia-ecg': {
        title: 'MURDER - Hyperkalaemia ECG Changes',
        category: 'renal',
        mnemonic: 'MURDER',
        meaning: 'Progressive ECG changes in hyperkalaemia',
        usage: 'Recognize life-threatening hyperkalaemia',
        details: [
            '<strong>M</strong> - <strong>M</strong>uscle weakness',
            '<strong>U</strong> - <strong>U</strong> waves (actually T waves!)',
            '<strong>R</strong> - <strong>R</strong>hythm problems (bradycardia)',
            '<strong>D</strong> - <strong>D</strong>ecreased P wave amplitude',
            '<strong>E</strong> - <strong>E</strong>levated/tall tented T waves',
            '<strong>R</strong> - <strong>R</strong>eally wide QRS complexes',
            '',
            '⚡ Progressive changes:',
            '• K+ 5.5-6.5: Tall peaked T waves',
            '• K+ 6.5-8: Prolonged PR, widened QRS',
            '• K+ >8: Sine wave pattern → VF/asystole',
            '',
            '🚨 Emergency treatment if ECG changes:',
            '• 10ml 10% calcium gluconate IV',
            '• Insulin + dextrose',
            '• Salbutamol nebulizers',
            '• Treat underlying cause'
        ]
    },

    // Endocrine Mnemonics
    'tired-hypoglycaemia': {
        title: 'TIRED - Causes of Hypoglycaemia',
        category: 'endocrine',
        mnemonic: 'TIRED',
        meaning: 'Common causes of low blood glucose',
        usage: 'Remember differential for hypoglycaemia',
        details: [
            '<strong>T</strong> - <strong>T</strong>oo much insulin/sulphonylureas',
            '<strong>I</strong> - <strong>I</strong>nsufficient carbohydrate intake',
            '<strong>R</strong> - <strong>R</strong>enal failure (reduced insulin clearance)',
            '<strong>E</strong> - <strong>E</strong>xercise (increased glucose utilization)',
            '<strong>D</strong> - <strong>D</strong>rinks (alcohol)',
            '',
            '💡 Also consider:',
            '• Insulinoma (rare)',
            '• Adrenal insufficiency',
            '• Sepsis',
            '• Liver failure',
            '',
            '⚠️ Whipple\'s triad confirms true hypoglycaemia:',
            '1. Symptoms consistent with hypoglycaemia',
            '2. Low plasma glucose (<2.8 mmol/L)',
            '3. Relief of symptoms with glucose'
        ]
    },
    'insulin-dka': {
        title: 'INSULIN - DKA Management',
        category: 'endocrine',
        mnemonic: 'INSULIN',
        meaning: 'Key steps in DKA management',
        usage: 'Systematic approach to DKA treatment',
        details: [
            '<strong>I</strong> - <strong>I</strong>nsulin (fixed rate IV infusion 0.1 units/kg/hr)',
            '<strong>N</strong> - <strong>N</strong>aCl 0.9% fluid resuscitation',
            '<strong>S</strong> - <strong>S</strong>earch for precipitant (infection, non-compliance)',
            '<strong>U</strong> - <strong>U</strong>rea and electrolytes (monitor K+)',
            '<strong>L</strong> - <strong>L</strong>ook for complications (cerebral edema)',
            '<strong>I</strong> - <strong>I</strong>nfection treatment (antibiotics if indicated)',
            '<strong>N</strong> - <strong>N</strong>ever stop long-acting insulin',
            '',
            '⚡ DKA criteria:',
            '• Glucose >11 mmol/L',
            '• pH <7.3 or bicarbonate <15 mmol/L',
            '• Ketones >3 mmol/L or 2+ on dipstick',
            '',
            '🎯 Treatment targets:',
            '• Ketones fall by 0.5 mmol/L/hr',
            '• Glucose fall by 3 mmol/L/hr',
            '• Maintain K+ 4-5 mmol/L'
        ]
    },

    // Infectious Disease Mnemonics
    'sepsis-six': {
        title: 'Sepsis Six',
        category: 'infectious',
        mnemonic: 'Sepsis 6',
        meaning: '3 in, 3 out - Complete within 1 hour',
        usage: 'Initial management bundle for sepsis',
        details: [
            '<strong>3 IN (Give):</strong>',
            '1. <strong>Oxygen</strong> (target SpO2 94-98%)',
            '2. <strong>IV fluids</strong> (crystalloid bolus)',
            '3. <strong>IV antibiotics</strong> (within 1 hour)',
            '',
            '<strong>3 OUT (Take):</strong>',
            '1. <strong>Blood cultures</strong> (before antibiotics if possible)',
            '2. <strong>Urine output</strong> monitoring (catheter)',
            '3. <strong>Lactate</strong> and FBC measurement',
            '',
            '⏱️ Complete ALL within 1 hour of recognition',
            '',
            '🎯 qSOFA screening:',
            '• RR ≥22/min',
            '• Altered mental status',
            '• SBP ≤100 mmHg',
            '',
            '📊 ≥2 criteria = high risk of poor outcome'
        ]
    },
    'v-spin-meningitis': {
        title: 'V SPIN - Viral Meningitis Features',
        category: 'infectious',
        mnemonic: 'V SPIN',
        meaning: 'Features distinguishing viral from bacterial meningitis',
        usage: 'Help differentiate viral vs bacterial meningitis',
        details: [
            '<strong>V</strong> - <strong>V</strong>iral prodrome (preceding URTI)',
            '<strong>S</strong> - <strong>S</strong>low onset (over days)',
            '<strong>P</strong> - <strong>P</strong>hotophobia less severe',
            '<strong>I</strong> - <strong>I</strong>mmunity intact (less unwell)',
            '<strong>N</strong> - <strong>N</strong>o rash (usually)',
            '',
            '🔬 CSF findings viral vs bacterial:',
            '',
            '<strong>Viral:</strong>',
            '• Clear CSF',
            '• Lymphocytes predominant',
            '• Protein <1 g/L',
            '• Glucose normal',
            '',
            '<strong>Bacterial:</strong>',
            '• Turbid CSF',
            '• Neutrophils predominant',
            '• Protein >1 g/L',
            '• Glucose <50% plasma',
            '',
            '⚠️ If in doubt, treat as bacterial until proven otherwise'
        ]
    },

    // Emergency Medicine Mnemonics
    'abcde-trauma': {
        title: 'ABCDE - Trauma Assessment',
        category: 'emergency',
        mnemonic: 'ABCDE',
        meaning: 'Systematic primary survey in trauma',
        usage: 'ATLS approach to trauma patient',
        details: [
            '<strong>A</strong> - <strong>Airway</strong> + C-spine control',
            '• Clear airway, consider intubation',
            '• Immobilize cervical spine',
            '',
            '<strong>B</strong> - <strong>Breathing</strong> + ventilation',
            '• Inspect, palpate, percuss, auscultate',
            '• Chest drain if tension pneumothorax',
            '',
            '<strong>C</strong> - <strong>Circulation</strong> + hemorrhage control',
            '• Control external bleeding',
            '• Two large-bore cannulas',
            '• Fluid resuscitation',
            '',
            '<strong>D</strong> - <strong>Disability</strong> (neurological)',
            '• GCS, pupils, glucose',
            '',
            '<strong>E</strong> - <strong>Exposure</strong> + environment',
            '• Full examination',
            '• Prevent hypothermia',
            '',
            '🚨 Repeat primary survey frequently'
        ]
    },
    'rule-of-9s-burns': {
        title: 'Rule of 9s - Burns Assessment',
        category: 'emergency',
        mnemonic: 'Rule of 9s',
        meaning: 'Body surface area calculation for burns',
        usage: 'Estimate total body surface area affected',
        details: [
            '<strong>Head and neck:</strong> 9%',
            '<strong>Each arm:</strong> 9%',
            '<strong>Front of torso:</strong> 18%',
            '<strong>Back of torso:</strong> 18%',
            '<strong>Each leg:</strong> 18%',
            '<strong>Perineum:</strong> 1%',
            '',
            '<strong>Total:</strong> 100%',
            '',
            '💡 For irregular burns:',
            '• Patient\'s palm (including fingers) ≈ 1% TBSA',
            '',
            '🏥 Fluid resuscitation if:',
            '• >15% TBSA in adults',
            '• >10% TBSA in children',
            '',
            '💧 Parkland formula:',
            '• 4ml × weight (kg) × %TBSA',
            '• Give half in first 8 hours',
            '• Give remaining half over next 16 hours'
        ]
    },

    // Obstetrics Mnemonics
    'hellp-syndrome': {
        title: 'HELLP Syndrome',
        category: 'obstetrics',
        mnemonic: 'HELLP',
        meaning: 'Severe pre-eclampsia complication',
        usage: 'Recognize life-threatening pregnancy complication',
        details: [
            '<strong>H</strong> - <strong>H</strong>emolysis',
            '<strong>EL</strong> - <strong>EL</strong>evated Liver enzymes',
            '<strong>LP</strong> - <strong>L</strong>ow <strong>P</strong>latelet count',
            '',
            '🔬 Diagnostic criteria:',
            '• Hemolysis: schistocytes, ↑bilirubin, ↑LDH',
            '• Elevated liver enzymes: AST/ALT >2× normal',
            '• Low platelets: <100 × 10⁹/L',
            '',
            '⚠️ Clinical features:',
            '• RUQ/epigastric pain',
            '• Nausea/vomiting',
            '• Headache',
            '• Visual disturbances',
            '',
            '🚨 Management:',
            '• Urgent obstetric review',
            '• Blood pressure control',
            '• MgSO4 for seizure prophylaxis',
            '• Delivery is definitive treatment'
        ]
    },

    // Pharmacology Mnemonics
    'pc-bras-cyp-inducers': {
        title: 'PC BRAS - CYP450 Inducers',
        category: 'pharmacology',
        mnemonic: 'PC BRAS',
        meaning: 'Common enzyme inducers',
        usage: 'Remember drugs that induce hepatic metabolism',
        details: [
            '<strong>P</strong> - <strong>P</strong>henytoin',
            '<strong>C</strong> - <strong>C</strong>arbamazepine',
            '',
            '<strong>B</strong> - <strong>B</strong>arbiturates',
            '<strong>R</strong> - <strong>R</strong>ifampicin',
            '<strong>A</strong> - <strong>A</strong>lcohol (chronic)',
            '<strong>S</strong> - <strong>S</strong>t John\'s Wort, <strong>S</strong>ulphonylureas',
            '',
            '💊 Clinical implications:',
            '• Reduce levels of other drugs metabolized by CYP450',
            '• OCP may become less effective',
            '• Warfarin dose may need increasing',
            '• Steroid doses may need adjusting',
            '',
            '⚠️ Effects develop over weeks, persist after stopping'
        ]
    },
    'sickfaces-cyp-inhibitors': {
        title: 'SICKFACES.COM - CYP450 Inhibitors',
        category: 'pharmacology',
        mnemonic: 'SICKFACES.COM',
        meaning: 'Common enzyme inhibitors',
        usage: 'Remember drugs that inhibit hepatic metabolism',
        details: [
            '<strong>S</strong> - <strong>S</strong>odium valproate, <strong>S</strong>SRIs',
            '<strong>I</strong> - <strong>I</strong>soniazid',
            '<strong>C</strong> - <strong>C</strong>imetidine, <strong>C</strong>iprofloxacin',
            '<strong>K</strong> - <strong>K</strong>etoconazole',
            '<strong>F</strong> - <strong>F</strong>luconazole',
            '<strong>A</strong> - <strong>A</strong>lcohol (acute)',
            '<strong>C</strong> - <strong>C</strong>hloramphenicol',
            '<strong>E</strong> - <strong>E</strong>rythromycin',
            '<strong>S</strong> - <strong>S</strong>ulphonamides',
            '',
            '<strong>C</strong> - <strong>C</strong>ranberry juice',
            '<strong>O</strong> - <strong>O</strong>meprazole',
            '<strong>M</strong> - <strong>M</strong>etronidazole',
            '',
            '💊 Clinical implications:',
            '• Increase levels of other drugs',
            '• Risk of toxicity with warfarin, phenytoin',
            '• Grapefruit juice also inhibits CYP3A4',
            '',
            '⚠️ Effects usually rapid (hours to days)'
        ]
    },

    // Haematology Mnemonics
    'tails-microcytic-anaemia': {
        title: 'TAILS - Causes of Microcytic Anaemia',
        category: 'haematology',
        mnemonic: 'TAILS',
        meaning: 'Differential diagnosis of low MCV',
        usage: 'Remember causes of microcytic anaemia',
        details: [
            '<strong>T</strong> - <strong>T</strong>halassemia',
            '<strong>A</strong> - <strong>A</strong>naemia of chronic disease',
            '<strong>I</strong> - <strong>I</strong>ron deficiency',
            '<strong>L</strong> - <strong>L</strong>ead poisoning',
            '<strong>S</strong> - <strong>S</strong>ideroblastic anaemia',
            '',
            '🔬 Investigations to distinguish:',
            '',
            '<strong>Iron deficiency:</strong>',
            '• ↓ Ferritin, ↓ serum iron',
            '• ↑ TIBC, ↓ transferrin saturation',
            '',
            '<strong>Thalassemia:</strong>',
            '• Normal/↑ ferritin',
            '• Hb electrophoresis abnormal',
            '',
            '<strong>Anaemia of chronic disease:</strong>',
            '• Normal/↑ ferritin',
            '• ↓ TIBC',
            '',
            '💡 Most common cause is iron deficiency'
        ]
    },
    'trali': {
        title: 'TRALI - Transfusion Reaction',
        category: 'haematology',
        mnemonic: 'TRALI',
        meaning: 'Transfusion-Related Acute Lung Injury',
        usage: 'Recognize serious transfusion complication',
        details: [
            '<strong>T</strong>ransfusion-<strong>R</strong>elated <strong>A</strong>cute <strong>L</strong>ung <strong>I</strong>njury',
            '',
            '⚠️ Clinical features:',
            '• Acute dyspnea during or within 6 hours of transfusion',
            '• Hypoxemia',
            '• Bilateral pulmonary infiltrates on CXR',
            '• No evidence of fluid overload',
            '',
            '🔬 Mechanism:',
            '• Donor antibodies react with recipient neutrophils',
            '• Causes acute lung injury',
            '',
            '💊 Management:',
            '• Stop transfusion immediately',
            '• Supportive care (oxygen, ventilation if needed)',
            '• Usually resolves within 48-96 hours',
            '',
            '📋 Report to blood transfusion service'
        ]
    },

    // Rheumatology Mnemonics
    'loss-sle-criteria': {
        title: 'SOAP BRAIN MD - SLE Diagnostic Criteria',
        category: 'rheumatology',
        mnemonic: 'SOAP BRAIN MD',
        meaning: 'ACR criteria for SLE diagnosis',
        usage: '4 or more criteria needed for SLE diagnosis',
        details: [
            '<strong>S</strong> - <strong>S</strong>erositis (pleuritis, pericarditis)',
            '<strong>O</strong> - <strong>O</strong>ral ulcers (usually painless)',
            '<strong>A</strong> - <strong>A</strong>rthritis (non-erosive, 2+ joints)',
            '<strong>P</strong> - <strong>P</strong>hotosensitivity',
            '',
            '<strong>B</strong> - <strong>B</strong>lood disorders (anemia, leukopenia, thrombocytopenia)',
            '<strong>R</strong> - <strong>R</strong>enal involvement (proteinuria, casts)',
            '<strong>A</strong> - <strong>A</strong>NA positive',
            '<strong>I</strong> - <strong>I</strong>mmunologic (anti-dsDNA, anti-Sm, antiphospholipid)',
            '<strong>N</strong> - <strong>N</strong>eurologic (seizures, psychosis)',
            '',
            '<strong>M</strong> - <strong>M</strong>alar rash',
            '<strong>D</strong> - <strong>D</strong>iscoid rash',
            '',
            '📊 Need ≥4 criteria for diagnosis',
            '',
            '🔬 ANA sensitivity 95% but low specificity'
        ]
    },

    // Dermatology Mnemonics
    'abcde-melanoma': {
        title: 'ABCDE - Melanoma Features',
        category: 'dermatology',
        mnemonic: 'ABCDE',
        meaning: 'Suspicious features in pigmented lesions',
        usage: 'Screen for melanoma in pigmented lesions',
        details: [
            '<strong>A</strong> - <strong>A</strong>symmetry (one half different from other)',
            '<strong>B</strong> - <strong>B</strong>order irregularity (irregular, scalloped, poorly defined)',
            '<strong>C</strong> - <strong>C</strong>olour variation (multiple colours, uneven distribution)',
            '<strong>D</strong> - <strong>D</strong>iameter >6mm (size of pencil eraser)',
            '<strong>E</strong> - <strong>E</strong>volving (changing in size, shape, or colour)',
            '',
            '⚠️ Additional warning signs:',
            '• "Ugly duckling" sign (lesion looks different from others)',
            '• Bleeding or oozing',
            '• Itching or pain',
            '• Rapid growth',
            '',
            '🚨 Urgent 2-week rule referral if suspicious',
            '',
            '🔬 Dermoscopy improves diagnostic accuracy'
        ]
    }
};

/**
 * Get all mnemonics for a specific category
 * @param {string} category - Category to filter by
 * @returns {Object} Filtered mnemonics object
 */
export function getMnemonicsByCategory(category) {
    if (category === 'all') {
        return mnemonicsDatabase;
    }
    
    const filtered = {};
    for (const [key, mnemonic] of Object.entries(mnemonicsDatabase)) {
        if (mnemonic.category === category) {
            filtered[key] = mnemonic;
        }
    }
    return filtered;
}

/**
 * Search mnemonics by term
 * @param {string} searchTerm - Search query
 * @returns {Object} Matching mnemonics
 */
export function searchMnemonics(searchTerm) {
    const term = searchTerm.toLowerCase();
    const results = {};
    
    for (const [key, mnemonic] of Object.entries(mnemonicsDatabase)) {
        const searchableText = `${mnemonic.title} ${mnemonic.mnemonic} ${mnemonic.meaning} ${mnemonic.usage} ${mnemonic.category}`.toLowerCase();
        if (searchableText.includes(term)) {
            results[key] = mnemonic;
        }
    }
    
    return results;
}

/**
 * Get categories for mnemonics navigation
 * @returns {Array} Array of unique categories
 */
export function getMnemonicCategories() {
    const categories = new Set();
    for (const mnemonic of Object.values(mnemonicsDatabase)) {
        categories.add(mnemonic.category);
    }
    return Array.from(categories).sort();
}
