/**
 * MnemonicsManager.js - V2 Medical Mnemonics Manager
 * 
 * Manages medical mnemonics database with search, categorization and display functionality.
 * Extracted from V1 to provide clean, modular architecture for V2.
 * 
 * Features:
 * - 50+ medical mnemonics across 14 specialties
 * - Search by mnemonic, title, meaning, or category
 * - Category filtering
 * - Detailed breakdown view
 * - Recent tracking
 */

class MnemonicsManager {
    constructor() {
        this.mnemonicsDatabase = this.initializeMnemonicsDatabase();
        this.recentMnemonics = [];
        this.maxRecentItems = 10;
        this.searchCache = new Map();
        
        console.log('🧠 MnemonicsManager initialized with', Object.keys(this.mnemonicsDatabase).length, 'mnemonics');
    }

    /**
     * Initialize the complete mnemonics database
     * @returns {Object} Complete mnemonics database
     */
    initializeMnemonicsDatabase() {
        return {
            // Cardiovascular
            'acs-management': {
                title: 'ACS Management - MONA',
                category: 'cardiovascular',
                mnemonic: 'MONA',
                meaning: 'Morphine, Oxygen, Nitrates, Aspirin',
                usage: 'Initial management of acute coronary syndrome',
                details: [
                    'M - Morphine for pain relief (2-5mg IV)',
                    'O - Oxygen if saturations <94%',
                    'N - Nitrates (GTN spray/tablets) for chest pain',
                    'A - Aspirin 300mg loading dose'
                ]
            },
            'heart-failure-causes': {
                title: 'Heart Failure Causes - I FAILED',
                category: 'cardiovascular',
                mnemonic: 'I FAILED',
                meaning: 'Ischaemia, Forget meds, Arrhythmia, Infection, Lifestyle, Embolism, Drugs',
                usage: 'Common precipitants of acute heart failure',
                details: [
                    'I - Ischaemia/MI',
                    'F - Forget medications (non-compliance)',
                    'A - Arrhythmia (AF, VT)',
                    'I - Infection/Inflammatory',
                    'L - Lifestyle (excessive salt/fluid, alcohol)',
                    'E - Embolism (PE)',
                    'D - Drugs (NSAIDs, CCB, corticosteroids)'
                ]
            },
            'shock-types': {
                title: 'Shock Types - CHOPS',
                category: 'cardiovascular',
                mnemonic: 'CHOPS',
                meaning: 'Cardiogenic, Hypovolemic, Obstructive, Psychogenic, Septic',
                usage: 'Types of shock',
                details: [
                    'C - Cardiogenic (MI, arrhythmia)',
                    'H - Hypovolemic (bleeding, dehydration)',
                    'O - Obstructive (PE, tamponade, tension pneumothorax)',
                    'P - Psychogenic/Neurogenic',
                    'S - Septic (infection, SIRS)'
                ]
            },
            'bradycardia-causes': {
                title: 'Bradycardia Causes - CAVED IN',
                category: 'cardiovascular',
                mnemonic: 'CAVED IN',
                meaning: 'Cardiac, Athletic, Vagal, Endocrine, Drugs, Ischaemia, Neurological',
                usage: 'Causes of bradycardia',
                details: [
                    'C - Cardiac (heart block, sick sinus syndrome)',
                    'A - Athletic (trained athletes)',
                    'V - Vagal stimulation',
                    'E - Endocrine (hypothyroidism)',
                    'D - Drugs (beta-blockers, CCB, digoxin, amiodarone)',
                    'I - Ischaemia (inferior MI)',
                    'N - Neurological (raised ICP)'
                ]
            },
            'peripheral-oedema': {
                title: 'Bilateral Leg Oedema - CHAMP',
                category: 'cardiovascular',
                mnemonic: 'CHAMP',
                meaning: 'Cardiac, Hepatic, Albumin low, Medications, Pregnancy/Pelvic mass',
                usage: 'Causes of bilateral lower limb oedema',
                details: [
                    'C - Cardiac failure',
                    'H - Hepatic cirrhosis',
                    'A - Albumin low (nephrotic syndrome, malnutrition)',
                    'M - Medications (CCB, NSAIDs, steroids)',
                    'P - Pregnancy, Pelvic mass (IVC obstruction)'
                ]
            },

            // Respiratory
            'asthma-severity': {
                title: 'Life-Threatening Asthma - CHEST',
                category: 'respiratory',
                mnemonic: 'CHEST',
                meaning: 'Cyanosis, Hypotension, Exhaustion, Silent chest, Tachyarrhythmia',
                usage: 'Signs of life-threatening asthma attack',
                details: [
                    'C - Cyanosis or SpO2 <92%',
                    'H - Hypotension',
                    'E - Exhaustion, poor respiratory effort',
                    'S - Silent chest (no wheeze)',
                    'T - Tachyarrhythmia or bradycardia'
                ]
            },
            'pneumonia-severity': {
                title: 'Pneumonia Severity - CURB-65',
                category: 'respiratory',
                mnemonic: 'CURB-65',
                meaning: 'Confusion, Urea, Respiratory rate, BP, 65 years',
                usage: 'Risk stratification for community-acquired pneumonia',
                details: [
                    'C - Confusion (new onset)',
                    'U - Urea >7 mmol/L',
                    'R - Respiratory rate ≥30/min',
                    'B - Blood pressure: SBP <90 or DBP ≤60',
                    '65 - Age ≥65 years',
                    '',
                    'Score 0-1: Low risk (outpatient)',
                    'Score 2: Moderate risk (consider admission)',
                    'Score ≥3: High risk (urgent admission, consider ICU)'
                ]
            },
            'respiratory-failure': {
                title: 'Type 2 Respiratory Failure - CAN\'T Breathe',
                category: 'respiratory',
                mnemonic: 'CAN\'T Breathe',
                meaning: 'CNS depression, Airway obstruction, Neuromuscular, Thoracic cage',
                usage: 'Causes of hypercapnic respiratory failure (Type 2)',
                details: [
                    'C - CNS depression (opioids, sedatives, stroke)',
                    'A - Airway obstruction (COPD, asthma)',
                    'N - Neuromuscular (myasthenia, GBS, spinal cord injury)',
                    'T - Thoracic cage problems (kyphoscoliosis, flail chest)',
                    '',
                    'PaCO2 >6 kPa with or without hypoxia',
                    'Type 1: Normal/low CO2 (V/Q mismatch, shunt)'
                ]
            },
            'copd-exacerbation': {
                title: 'COPD Exacerbation Causes - VIPER',
                category: 'respiratory',
                mnemonic: 'VIPER',
                meaning: 'Viral infection, Infection bacterial, Pulmonary embolism, Environment, Rx non-compliance',
                usage: 'Common precipitants of COPD exacerbation',
                details: [
                    'V - Viral infection (most common)',
                    'I - Infection bacterial (H. influenzae, S. pneumoniae)',
                    'P - Pulmonary embolism',
                    'E - Environment (pollution, cold weather)',
                    'R - Rx non-compliance (stopped inhalers)'
                ]
            },

            // Neurology
            'stroke-fast': {
                title: 'Stroke Recognition - FAST',
                category: 'neurology',
                mnemonic: 'FAST',
                meaning: 'Face, Arms, Speech, Time',
                usage: 'Rapid stroke assessment',
                details: [
                    'F - Face drooping (ask to smile)',
                    'A - Arm weakness (raise both arms)',
                    'S - Speech difficulty (repeat a phrase)',
                    'T - Time to call emergency services'
                ]
            },
            'confusion-causes': {
                title: 'Confusion Causes - DIMTOP',
                category: 'neurology',
                mnemonic: 'DIMTOP',
                meaning: 'Drugs, Infection, Metabolic, Trauma, Oxygen, Psychiatric',
                usage: 'Differential diagnosis for acute confusion',
                details: [
                    'D - Drugs/toxins',
                    'I - Infection (UTI, pneumonia, meningitis)',
                    'M - Metabolic (hypoglycemia, hyponatremia, uremia)',
                    'T - Trauma (head injury, subdural)',
                    'O - Oxygen (hypoxia, hypercapnia)',
                    'P - Psychiatric'
                ]
            },
            'glasgow-coma': {
                title: 'Glasgow Coma Scale - MOVE',
                category: 'neurology',
                mnemonic: 'MOVE',
                meaning: 'Motor, Oral (verbal), Visual (eye)',
                usage: 'Remember GCS components (total /15)',
                details: [
                    'M - Motor response (/6)',
                    'O - Oral/Verbal response (/5)',
                    'V - Visual/Eye opening (/4)',
                    'E - (Eyes)',
                    '',
                    'Score: 15 = Normal, 13-14 = Mild, 9-12 = Moderate, ≤8 = Severe'
                ]
            },
            'seizure-causes': {
                title: 'Seizure Causes - VITAMINS',
                category: 'neurology',
                mnemonic: 'VITAMINS',
                meaning: 'Vascular, Infection, Tumour/Trauma, Autoimmune, Metabolic, Idiopathic, Neglect (non-compliance), Sympathomimetics',
                usage: 'Differential diagnosis for seizures',
                details: [
                    'V - Vascular (stroke, AVM)',
                    'I - Infection (meningitis, encephalitis, abscess)',
                    'T - Tumour, Trauma',
                    'A - Autoimmune (SLE)',
                    'M - Metabolic (hypoglycemia, hyponatremia, hypocalcemia, uraemia)',
                    'I - Idiopathic epilepsy',
                    'N - Neglect (medication non-compliance)',
                    'S - Sympathomimetics (drugs, alcohol withdrawal)'
                ]
            },
            'headache-red-flags': {
                title: 'Headache Red Flags - SNOOP',
                category: 'neurology',
                mnemonic: 'SNOOP',
                meaning: 'Systemic, Neurological, Onset sudden, Older age, Pattern change',
                usage: 'Red flags requiring urgent investigation',
                details: [
                    'S - Systemic symptoms (fever, weight loss, HIV)',
                    'N - Neurological signs (confusion, altered consciousness, focal deficits)',
                    'O - Onset sudden (thunderclap headache - SAH)',
                    'O - Older age (>50 years - consider GCA)',
                    'P - Pattern change (different from usual headaches)'
                ]
            },
            'coma-causes': {
                title: 'Coma Causes - AEIOU TIPS',
                category: 'neurology',
                mnemonic: 'AEIOU TIPS',
                meaning: 'Alcohol, Epilepsy, Insulin, Overdose, Uraemia, Trauma, Infection, Psychogenic, Stroke',
                usage: 'Causes of reduced consciousness/coma',
                details: [
                    'A - Alcohol, Acidosis',
                    'E - Epilepsy (post-ictal), Encephalopathy',
                    'I - Insulin (hypo/hyperglycemia)',
                    'O - Overdose, Oxygen (hypoxia)',
                    'U - Uraemia',
                    'T - Trauma (head injury)',
                    'I - Infection (meningitis, encephalitis, sepsis)',
                    'P - Psychogenic',
                    'S - Stroke, Subarachnoid haemorrhage'
                ]
            },

            // Gastroenterology
            'gi-bleeding': {
                title: 'Upper GI Bleeding - ABCDE',
                category: 'gastroenterology',
                mnemonic: 'ABCDE',
                meaning: 'Airway, Breathing, Circulation, Drugs, Endoscopy',
                usage: 'Management priorities in upper GI bleeding',
                details: [
                    'A - Airway protection (consider intubation if drowsy)',
                    'B - Breathing/Oxygen',
                    'C - Circulation: 2 large bore cannulas, fluid resuscitation, crossmatch',
                    'D - Drugs: PPI, stop anticoagulants, reverse if needed',
                    'E - Endoscopy within 24 hours (urgent if unstable)'
                ]
            },
            'hepatic-encephalopathy': {
                title: 'Hepatic Encephalopathy - HEPATIC',
                category: 'gastroenterology',
                mnemonic: 'HEPATIC',
                meaning: 'High protein, Electrolytes, Portosystemic shunt, Alkalosis, Toxins, Infection, Constipation',
                usage: 'Precipitants of hepatic encephalopathy',
                details: [
                    'H - High protein meal',
                    'E - Electrolyte imbalance (hypokalemia)',
                    'P - Portosystemic shunt',
                    'A - Alkalosis',
                    'T - Toxins/Drugs (sedatives, diuretics)',
                    'I - Infection (SBP)',
                    'C - Constipation/GI bleed'
                ]
            },
            'jaundice-prehepatic': {
                title: 'Jaundice - Pre-Hepatic vs Hepatic vs Post-Hepatic',
                category: 'gastroenterology',
                mnemonic: 'Think 3 Phases',
                meaning: 'Pre (haemolysis), Hepatic (liver disease), Post (obstruction)',
                usage: 'Classification of jaundice causes',
                details: [
                    'PRE-HEPATIC (unconjugated):',
                    '- Haemolysis (spherocytosis, G6PD, sickle cell)',
                    '- Gilbert\'s syndrome',
                    '',
                    'HEPATIC (mixed):',
                    '- Hepatitis (viral, alcohol, drug-induced)',
                    '- Cirrhosis, Wilson\'s, haemochromatosis',
                    '',
                    'POST-HEPATIC (conjugated):',
                    '- Gallstones, pancreatic cancer',
                    '- Cholangiocarcinoma, primary biliary cholangitis',
                    '- Dark urine, pale stools, pruritus'
                ]
            },
            'acute-abdomen': {
                title: 'Acute Abdomen - APPENDICITIS',
                category: 'gastroenterology',
                mnemonic: 'APPENDICITIS',
                meaning: 'Common causes starting with each letter',
                usage: 'Surgical causes of acute abdomen',
                details: [
                    'A - Appendicitis',
                    'P - Pancreatitis, Perforated viscus',
                    'P - Peptic ulcer perforation',
                    'E - Ectopic pregnancy',
                    'N - Neoplasm',
                    'D - Diverticulitis',
                    'I - Ischaemic bowel, IBD',
                    'C - Cholecystitis',
                    'I - Intussusception',
                    'T - Torsion (ovarian/testicular)',
                    'I - Incarcerated hernia',
                    'S - Small bowel obstruction'
                ]
            },
            'diarrhoea-causes': {
                title: 'Chronic Diarrhoea - GASTRO',
                category: 'gastroenterology',
                mnemonic: 'GASTRO',
                meaning: 'Gut (IBS/IBD), Antibiotics, Sugar (lactose), Thyroid, Radiation, Overflow',
                usage: 'Causes of chronic diarrhoea (>4 weeks)',
                details: [
                    'G - Gut disorders (IBS, IBD, coeliac)',
                    'A - Antibiotics (C. diff, antibiotic-associated)',
                    'S - Sugar intolerance (lactose, fructose malabsorption)',
                    'T - Thyroid (hyperthyroidism)',
                    'R - Radiation enteritis',
                    'O - Overflow (constipation with overflow)'
                ]
            },

            // Renal
            'aki-causes': {
                title: 'AKI Causes - PRE-RENAL-POST',
                category: 'renal',
                mnemonic: 'PRE-RENAL-POST',
                meaning: 'Pre-renal, Renal (intrinsic), Post-renal',
                usage: 'Classification of acute kidney injury',
                details: [
                    'PRE-RENAL: Hypovolemia, hypotension, renal artery stenosis',
                    'RENAL (Intrinsic): ATN, glomerulonephritis, interstitial nephritis, vascular',
                    'POST-RENAL: Obstruction (stones, BPH, malignancy, catheter blocked)'
                ]
            },
            'hyperkalaemia-ecg': {
                title: 'Hyperkalaemia ECG - MURDER',
                category: 'renal',
                mnemonic: 'MURDER',
                meaning: 'Muscle weakness, U wave absent, R wave tall, Dysrhythmias, Extreme bradycardia, Repolarisation (peaked T)',
                usage: 'ECG changes in hyperkalaemia',
                details: [
                    'M - Muscle weakness',
                    'U - U wave absent/small',
                    'R - R wave tall (peaked T waves)',
                    'D - Dysrhythmias',
                    'E - Extreme bradycardia',
                    'R - Repolarisation abnormalities (widened QRS, sine wave)'
                ]
            },
            'nephrotic-syndrome': {
                title: 'Nephrotic Syndrome Features - PHEO',
                category: 'renal',
                mnemonic: 'PHEO',
                meaning: 'Proteinuria, Hypoalbuminaemia, Oedema',
                usage: 'Classic triad of nephrotic syndrome',
                details: [
                    'P - Proteinuria >3.5g/24 hours',
                    'H - Hypoalbuminaemia <30g/L',
                    'E - (O)edema (peripheral, periorbital, ascites)',
                    '',
                    'Also: Hyperlipidaemia, hypercoagulable state',
                    'Causes: Minimal change, FSGS, membranous, diabetes'
                ]
            },
            'nephritic-syndrome': {
                title: 'Nephritic Syndrome Features - PHAROAH',
                category: 'renal',
                mnemonic: 'PHAROAH',
                meaning: 'Proteinuria, Haematuria, Azotaemia, Renal failure, Oliguria, Anti-HTN needed, Hypertension',
                usage: 'Features of nephritic syndrome',
                details: [
                    'P - Proteinuria (mild <3.5g/24h)',
                    'H - Haematuria (red cell casts)',
                    'A - Azotaemia (raised urea/creatinine)',
                    'R - Renal failure (acute)',
                    'O - Oliguria',
                    'A - Anti-hypertensives needed',
                    'H - Hypertension',
                    '',
                    'Causes: Post-strep GN, IgA nephropathy, vasculitis'
                ]
            },

            // Endocrine
            'hypoglycaemia-symptoms': {
                title: 'Hypoglycaemia - TIRED',
                category: 'endocrine',
                mnemonic: 'TIRED',
                meaning: 'Tremor, Irritability, Restless, Excess sweating, Drowsy',
                usage: 'Symptoms of hypoglycaemia',
                details: [
                    'T - Tremor, tachycardia',
                    'I - Irritability',
                    'R - Restlessness',
                    'E - Excess sweating, hunger',
                    'D - Drowsiness, confusion, coma'
                ]
            },
            'dka-management': {
                title: 'DKA Management - INSULIN',
                category: 'endocrine',
                mnemonic: 'INSULIN',
                meaning: 'Investigate, Fluids, Insulin, Potassium',
                usage: 'Priorities in DKA management',
                details: [
                    'I - Investigate: glucose, ketones, VBG, U&E',
                    'N - Normal saline (0.9%) IV fluids',
                    'S - Suspect precipitant (infection, MI)',
                    'U - Urinalysis (infection)',
                    'L - Low-dose insulin infusion (0.1 units/kg/hr)',
                    'I - IV potassium (monitor closely)',
                    'N - Never stop insulin (even when glucose normalizes)'
                ]
            },
            'cushings-features': {
                title: 'Cushing\'s Syndrome - CUSHINGOID',
                category: 'endocrine',
                mnemonic: 'CUSHINGOID',
                meaning: 'Central obesity, Urinary free cortisol, Skin changes, etc.',
                usage: 'Clinical features of Cushing\'s syndrome',
                details: [
                    'C - Central obesity, Cervical fat pad',
                    'U - Urinary free cortisol elevated',
                    'S - Skin thin, easy bruising, striae',
                    'H - Hypertension, Hyperglycaemia',
                    'I - Infections (immunosuppressed)',
                    'N - Neuropsychiatric (depression, psychosis)',
                    'G - Growth retardation (children)',
                    'O - Osteoporosis',
                    'I - Impotence/Irregular periods',
                    'D - Dexamethasone suppression test abnormal'
                ]
            },
            'addisons-features': {
                title: 'Addison\'s Disease - ADDISONS',
                category: 'endocrine',
                mnemonic: 'ADDISONS',
                meaning: 'Anorexia, Depression, Dizziness, Increased pigmentation, Orthostatic hypotension, etc.',
                usage: 'Clinical features of adrenal insufficiency',
                details: [
                    'A - Anorexia, weight loss',
                    'D - Depression, fatigue',
                    'D - Dizziness',
                    'I - Increased pigmentation (buccal, palmar creases)',
                    'S - Salt craving',
                    'O - Orthostatic hypotension',
                    'N - Nausea, vomiting, diarrhoea',
                    'S - Sodium low, potassium high'
                ]
            },

            // Infectious Disease
            'sepsis-six': {
                title: 'Sepsis Six',
                category: 'infectious',
                mnemonic: 'Sepsis 6',
                meaning: '3 in, 3 out within 1 hour',
                usage: 'Initial sepsis management bundle',
                details: [
                    '3 IN:',
                    '1. Oxygen to maintain SpO2 >94%',
                    '2. IV fluid resuscitation',
                    '3. IV antibiotics',
                    '',
                    '3 OUT:',
                    '4. Blood cultures',
                    '5. Lactate and FBC',
                    '6. Urine output monitoring'
                ]
            },
            'meningitis-causes': {
                title: 'Meningitis - V SPIN',
                category: 'infectious',
                mnemonic: 'V SPIN',
                meaning: 'Viral, Strep pneumoniae, Protozoal, Invasive (Neisseria), Neonatal',
                usage: 'Common causes of meningitis',
                details: [
                    'V - Viral (enterovirus, HSV)',
                    'S - Streptococcus pneumoniae (most common bacterial)',
                    'P - Protozoal/Parasitic (rare)',
                    'I - Invasive Neisseria meningitidis',
                    'N - Neonatal causes (Group B Strep, E. coli, Listeria)'
                ]
            },

            // Emergency & Trauma
            'trauma-atls': {
                title: 'Trauma Assessment - ABCDE',
                category: 'emergency',
                mnemonic: 'ABCDE',
                meaning: 'Airway, Breathing, Circulation, Disability, Exposure',
                usage: 'Systematic trauma assessment (ATLS approach)',
                details: [
                    'A - Airway with C-spine protection',
                    'B - Breathing and ventilation',
                    'C - Circulation with hemorrhage control',
                    'D - Disability (neurological assessment - GCS, pupils)',
                    'E - Exposure/Environmental control (full examination, prevent hypothermia)'
                ]
            },
            'burns-assessment': {
                title: 'Burns Assessment - Rule of 9s',
                category: 'emergency',
                mnemonic: 'Rule of 9s',
                meaning: 'Body surface area estimation',
                usage: 'Calculate total body surface area (TBSA) in burns',
                details: [
                    'Head & Neck: 9%',
                    'Each Arm: 9% (total 18%)',
                    'Anterior Torso: 18%',
                    'Posterior Torso: 18%',
                    'Each Leg: 18% (total 36%)',
                    'Perineum: 1%',
                    '',
                    'Palmar surface = ~1% TBSA (useful for scattered burns)'
                ]
            },

            // Obstetrics
            'preeclampsia': {
                title: 'Pre-eclampsia Features - HELLP',
                category: 'obstetrics',
                mnemonic: 'HELLP',
                meaning: 'Hemolysis, Elevated Liver enzymes, Low Platelets',
                usage: 'HELLP syndrome - severe complication of pre-eclampsia',
                details: [
                    'H - Hemolysis (blood film shows schistocytes)',
                    'EL - Elevated Liver enzymes (AST/ALT)',
                    'LP - Low Platelets (<100)',
                    '',
                    'Presents with: Epigastric/RUQ pain, nausea/vomiting, malaise',
                    'Management: Deliver baby, supportive care, monitor closely'
                ]
            },

            // Rheumatology
            'gout-joints': {
                title: 'Gout - First MTP',
                category: 'rheumatology',
                mnemonic: 'First MTP',
                meaning: 'First Metatarsophalangeal joint',
                usage: 'Most common site of gout',
                details: [
                    'First MTP joint (big toe) - 50% of first attacks',
                    'Also affects: ankles, knees, wrists, fingers',
                    'Acute monoarthritis: red, hot, swollen, extremely painful',
                    'Diagnosis: Joint aspiration shows negatively birefringent crystals'
                ]
            },
            'back-pain-red-flags': {
                title: 'Back Pain Red Flags - TUNA FISH',
                category: 'rheumatology',
                mnemonic: 'TUNA FISH',
                meaning: 'Trauma, Unexplained weight loss, Neurological symptoms, Age >50, Fever, IV drug use, Steroid use, History cancer',
                usage: 'Red flags requiring urgent investigation',
                details: [
                    'T - Trauma (major)',
                    'U - Unexplained weight loss',
                    'N - Neurological deficit (saddle anaesthesia, incontinence)',
                    'A - Age >50 or <20',
                    'F - Fever',
                    'I - IV drug use',
                    'S - Steroid use, immunosuppression',
                    'H - History of cancer'
                ]
            },
            'septic-arthritis-causes': {
                title: 'Septic Arthritis Organisms - SING',
                category: 'rheumatology',
                mnemonic: 'SING',
                meaning: 'Staph aureus, IV drug users, Neisseria (sexually active), Gonococcal',
                usage: 'Common organisms causing septic arthritis',
                details: [
                    'S - Staph aureus (most common overall)',
                    'I - IV drug users (Pseudomonas, MRSA)',
                    'N - Neisseria gonorrhoeae (young sexually active)',
                    'G - Gram negatives (elderly, immunocompromised)',
                    '',
                    'Presentation: Hot, swollen, painful joint, fever',
                    'Management: Joint aspiration, IV antibiotics, surgical washout'
                ]
            },

            // Pharmacology
            'cytochrome-inducers': {
                title: 'P450 Inducers - PC BRAS',
                category: 'pharmacology',
                mnemonic: 'PC BRAS',
                meaning: 'Phenytoin, Carbamazepine, Barbiturates, Rifampicin, Alcohol (chronic), St Johns Wort, Smoking',
                usage: 'Drugs that induce CYP450 (increase metabolism of other drugs)',
                details: [
                    'P - Phenytoin',
                    'C - Carbamazepine',
                    'B - Barbiturates',
                    'R - Rifampicin',
                    'A - Alcohol (chronic use)',
                    'S - St John\'s Wort, Smoking',
                    '',
                    'Effect: Reduces plasma levels of other drugs (e.g., warfarin, OCP, immunosuppressants)'
                ]
            },
            'cytochrome-inhibitors': {
                title: 'P450 Inhibitors - SICKFACES.COM',
                category: 'pharmacology',
                mnemonic: 'SICKFACES.COM',
                meaning: 'Sodium valproate, Isoniazid, Cimetidine, Ketoconazole, etc.',
                usage: 'Drugs that inhibit CYP450 (decrease metabolism)',
                details: [
                    'S - Sodium valproate',
                    'I - Isoniazid',
                    'C - Cimetidine, Ciprofloxacin',
                    'K - Ketoconazole',
                    'F - Fluconazole',
                    'A - Alcohol (acute), Amiodarone',
                    'C - Chloramphenicol',
                    'E - Erythromycin',
                    'S - Sulphonamides',
                    'COM - Clarithromycin, Omeprazole, Metronidazole',
                    '',
                    'Effect: Increases plasma levels (risk of toxicity)'
                ]
            },

            // Haematology
            'anaemia-causes': {
                title: 'Microcytic Anaemia - TAILS',
                category: 'haematology',
                mnemonic: 'TAILS',
                meaning: 'Thalassemia, Anaemia of chronic disease, Iron deficiency, Lead poisoning, Sideroblastic',
                usage: 'Causes of low MCV (<80 fL)',
                details: [
                    'T - Thalassemia',
                    'A - Anaemia of chronic disease (can be normocytic)',
                    'I - Iron deficiency (most common)',
                    'L - Lead poisoning',
                    'S - Sideroblastic anaemia'
                ]
            },
            'transfusion-reactions': {
                title: 'Transfusion Reactions - TRALI',
                category: 'haematology',
                mnemonic: 'TRALI',
                meaning: 'Transfusion-Related Acute Lung Injury',
                usage: 'Serious transfusion complication',
                details: [
                    'T - Transfusion-related',
                    'R - Respiratory distress (hypoxia, dyspnoea)',
                    'A - Acute onset (within 6 hours)',
                    'L - Lung injury (bilateral infiltrates on CXR)',
                    'I - Inflammatory response',
                    '',
                    'Management: Stop transfusion, oxygen, supportive care'
                ]
            },
            'coagulopathy-causes': {
                title: 'Coagulopathy Causes - VITAMIN C',
                category: 'haematology',
                mnemonic: 'VITAMIN C',
                meaning: 'Vascular, Inherited, Tissue factor, Anticoagulants, Massive transfusion, Infection, Nutritional, Cirrhosis',
                usage: 'Causes of coagulopathy/bleeding disorders',
                details: [
                    'V - Vascular (vasculitis, scurvy)',
                    'I - Inherited (haemophilia, von Willebrand)',
                    'T - Tissue factor (trauma, surgery)',
                    'A - Anticoagulants (warfarin, DOACs, heparin)',
                    'M - Massive transfusion (dilutional)',
                    'I - Infection (DIC, sepsis)',
                    'N - Nutritional (vitamin K deficiency)',
                    'C - Cirrhosis (liver synthetic dysfunction)'
                ]
            },

            // Psychiatry
            'suicide-risk': {
                title: 'Suicide Risk Assessment - SAD PERSONS',
                category: 'psychiatry',
                mnemonic: 'SAD PERSONS',
                meaning: 'Sex, Age, Depression, Previous attempt, Ethanol, Rational thinking loss, Social support lacking, Organized plan, No spouse, Sickness',
                usage: 'Risk factors for suicide',
                details: [
                    'S - Sex (male)',
                    'A - Age (<19 or >45)',
                    'D - Depression',
                    'P - Previous attempt',
                    'E - Ethanol abuse',
                    'R - Rational thinking loss (psychosis)',
                    'S - Social support lacking',
                    'O - Organized plan',
                    'N - No spouse (divorced, widowed, single)',
                    'S - Sickness (chronic illness, pain)'
                ]
            },
            'psychosis-differential': {
                title: 'Psychosis Causes - MIND MAPS',
                category: 'psychiatry',
                mnemonic: 'MIND MAPS',
                meaning: 'Medical, Intoxication, Neurological, Drugs, Mood disorder, Alcohol, Psychotic disorder, Schizoaffective',
                usage: 'Differential diagnosis for psychotic symptoms',
                details: [
                    'M - Medical (thyroid, Cushing\'s, SLE)',
                    'I - Intoxication (stimulants, cannabis)',
                    'N - Neurological (dementia, delirium, epilepsy)',
                    'D - Drugs (steroids, dopamine agonists)',
                    'M - Mood disorder (bipolar, severe depression)',
                    'A - Alcohol withdrawal',
                    'P - Psychotic disorder (schizophrenia)',
                    'S - Schizoaffective disorder'
                ]
            },

            // Dermatology
            'rash-causes': {
                title: 'Maculopapular Rash - VEXED SCAM',
                category: 'dermatology',
                mnemonic: 'VEXED SCAM',
                meaning: 'Viral, Exanthem, X-rays, Eczema, Drug, Syphilis, Connective tissue, Abscess, Mycosis',
                usage: 'Causes of widespread maculopapular rash',
                details: [
                    'V - Viral (measles, rubella, EBV, roseola)',
                    'E - Erythema multiforme',
                    'X - X-rays (radiation)',
                    'E - Eczema',
                    'D - Drug reaction',
                    'S - Syphilis (secondary)',
                    'C - Connective tissue disease (SLE)',
                    'A - Acute HIV',
                    'M - Mycosis fungoides'
                ]
            },
            'skin-cancer-abcde': {
                title: 'Melanoma Warning Signs - ABCDE',
                category: 'dermatology',
                mnemonic: 'ABCDE',
                meaning: 'Asymmetry, Border, Colour, Diameter, Evolution',
                usage: 'Features suggestive of melanoma',
                details: [
                    'A - Asymmetry (irregular shape)',
                    'B - Border irregular (notched, scalloped)',
                    'C - Colour variation (multiple colours)',
                    'D - Diameter >6mm',
                    'E - Evolution (changing size, shape, colour)',
                    '',
                    'Also: Ugly duckling sign (different from other moles)',
                    'Urgent 2-week referral for suspected melanoma'
                ]
            }
        };
    }

    /**
     * Load and display mnemonics panel
     */
    loadMnemonics() {
        try {
            const container = document.getElementById('mnemonics-panel');
            if (!container) {
                console.error('❌ Mnemonics panel container not found');
                return;
            }

            container.innerHTML = `
                <div class="search-container">
                    <input type="text" id="mnemonics-search" placeholder="Search mnemonics..." class="tool-search">
                    <button id="mnemonics-search-btn">🔍</button>
                </div>
                <div id="mnemonics-search-results" class="lab-grid"></div>
                <div class="mnemonics-categories">
                    <button class="category-btn active" onclick="window.mnemonicsManager.showMnemonicsCategory('all'); event.stopPropagation();">All Mnemonics</button>
                    <button class="category-btn" onclick="window.mnemonicsManager.showMnemonicsCategory('cardiovascular'); event.stopPropagation();">Cardiovascular</button>
                    <button class="category-btn" onclick="window.mnemonicsManager.showMnemonicsCategory('respiratory'); event.stopPropagation();">Respiratory</button>
                    <button class="category-btn" onclick="window.mnemonicsManager.showMnemonicsCategory('neurology'); event.stopPropagation();">Neurology</button>
                    <button class="category-btn" onclick="window.mnemonicsManager.showMnemonicsCategory('gastroenterology'); event.stopPropagation();">Gastroenterology</button>
                    <button class="category-btn" onclick="window.mnemonicsManager.showMnemonicsCategory('renal'); event.stopPropagation();">Renal</button>
                    <button class="category-btn" onclick="window.mnemonicsManager.showMnemonicsCategory('endocrine'); event.stopPropagation();">Endocrine</button>
                    <button class="category-btn" onclick="window.mnemonicsManager.showMnemonicsCategory('infectious'); event.stopPropagation();">Infectious</button>
                    <button class="category-btn" onclick="window.mnemonicsManager.showMnemonicsCategory('emergency'); event.stopPropagation();">Emergency</button>
                    <button class="category-btn" onclick="window.mnemonicsManager.showMnemonicsCategory('rheumatology'); event.stopPropagation();">Rheumatology</button>
                    <button class="category-btn" onclick="window.mnemonicsManager.showMnemonicsCategory('pharmacology'); event.stopPropagation();">Pharmacology</button>
                    <button class="category-btn" onclick="window.mnemonicsManager.showMnemonicsCategory('haematology'); event.stopPropagation();">Haematology</button>
                    <button class="category-btn" onclick="window.mnemonicsManager.showMnemonicsCategory('psychiatry'); event.stopPropagation();">Psychiatry</button>
                    <button class="category-btn" onclick="window.mnemonicsManager.showMnemonicsCategory('dermatology'); event.stopPropagation();">Dermatology</button>
                </div>
                <div id="mnemonics-list" class="lab-grid"></div>
            `;
            
            this.setupSearchHandlers();
            this.showMnemonicsCategory('all');
            console.log('✅ Mnemonics loaded successfully!');
            
        } catch (error) {
            console.error('❌ Error loading mnemonics:', error);
            this.showError('Unable to load mnemonics. Please refresh the page.');
        }
    }

    /**
     * Setup search event handlers
     */
    setupSearchHandlers() {
        const searchInput = document.getElementById('mnemonics-search');
        const searchBtn = document.getElementById('mnemonics-search-btn');
        
        if (searchInput && searchBtn) {
            searchInput.addEventListener('input', () => this.searchMnemonics());
            searchBtn.addEventListener('click', () => this.searchMnemonics());
        }
    }

    /**
     * Search mnemonics database
     */
    searchMnemonics() {
        const searchInput = document.getElementById('mnemonics-search');
        const resultsContainer = document.getElementById('mnemonics-search-results');
        
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
        
        const matches = Object.keys(this.mnemonicsDatabase).filter(key => {
            const mnemonic = this.mnemonicsDatabase[key];
            return mnemonic.title.toLowerCase().includes(query) ||
                   mnemonic.mnemonic.toLowerCase().includes(query) ||
                   mnemonic.meaning.toLowerCase().includes(query) ||
                   mnemonic.category.toLowerCase().includes(query) ||
                   mnemonic.usage.toLowerCase().includes(query);
        });
        
        let html = '';
        if (matches.length === 0) {
            html = '<div class="no-results">No mnemonics found</div>';
        } else {
            html = matches.map(key => {
                const mnemonic = this.mnemonicsDatabase[key];
                return `
                    <button class="lab-value-btn" onclick="window.mnemonicsManager.showMnemonicDetail('${key}'); event.stopPropagation();">
                        <div class="lab-name">${mnemonic.mnemonic}</div>
                        <div class="lab-count">${mnemonic.title}</div>
                    </button>
                `;
            }).join('');
        }
        
        // Cache the result
        this.searchCache.set(cacheKey, html);
        resultsContainer.innerHTML = html;
    }

    /**
     * Show mnemonics by category
     * @param {string} category - Category to filter by
     */
    showMnemonicsCategory(category) {
        const mnemonicsList = document.getElementById('mnemonics-list');
        if (!mnemonicsList) return;
        
        let mnemonics = Object.keys(this.mnemonicsDatabase);
        
        // Reset container to grid layout for list view
        mnemonicsList.style.display = 'grid';
        
        // Update active state of category buttons
        const categoryButtons = document.querySelectorAll('.mnemonics-categories .category-btn');
        categoryButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.toLowerCase().includes(category) || (category === 'all' && btn.textContent.includes('All'))) {
                btn.classList.add('active');
            }
        });
        
        if (category !== 'all') {
            mnemonics = mnemonics.filter(key => 
                this.mnemonicsDatabase[key].category === category
            );
        }
        
        mnemonicsList.innerHTML = mnemonics.map(key => {
            const mnemonic = this.mnemonicsDatabase[key];
            return `
                <button class="lab-value-btn" onclick="window.mnemonicsManager.showMnemonicDetail('${key}'); event.stopPropagation();">
                    <div class="lab-name">${mnemonic.mnemonic}</div>
                    <div class="lab-count">${mnemonic.title}</div>
                </button>
            `;
        }).join('');
    }

    /**
     * Show detailed view for a specific mnemonic
     * @param {string} mnemonicKey - Key of the mnemonic to display
     */
    showMnemonicDetail(mnemonicKey) {
        const mnemonic = this.mnemonicsDatabase[mnemonicKey];
        if (!mnemonic) return;
        
        const mnemonicsList = document.getElementById('mnemonics-list');
        if (!mnemonicsList) return;
        
        // Add to recent
        this.addToRecent(mnemonicKey);
        
        // Change to block layout for detail view
        mnemonicsList.style.display = 'block';
        
        const html = `
            <div class="guideline-detail">
                <button class="back-btn" onclick="window.mnemonicsManager.showMnemonicsCategory('all'); event.stopPropagation();">← Back to Mnemonics</button>
                <h3>🧠 ${mnemonic.title}</h3>
                
                <div class="info-section">
                    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; margin-bottom: 20px;">
                        <div style="font-size: 2.5em; font-weight: bold; letter-spacing: 3px; margin-bottom: 10px;">${mnemonic.mnemonic}</div>
                        <div style="font-size: 1.1em; opacity: 0.95;">${mnemonic.meaning}</div>
                    </div>
                </div>
                
                <div class="info-section">
                    <h4>📋 Clinical Use</h4>
                    <p>${mnemonic.usage}</p>
                </div>
                
                <div class="info-section">
                    <h4>🔍 Breakdown</h4>
                    <div class="treatment-item" style="line-height: 1.8;">
                        ${mnemonic.details.map(detail => 
                            detail === '' ? '<div style="height: 10px;"></div>' : `<div style="padding: 8px 0; border-left: 3px solid #667eea; padding-left: 15px; margin: 5px 0;">${detail}</div>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
        
        mnemonicsList.innerHTML = html;
    }

    /**
     * Add mnemonic to recent items
     * @param {string} mnemonicKey - Key of the mnemonic
     */
    addToRecent(mnemonicKey) {
        // Remove if already exists
        this.recentMnemonics = this.recentMnemonics.filter(key => key !== mnemonicKey);
        
        // Add to beginning
        this.recentMnemonics.unshift(mnemonicKey);
        
        // Limit to max items
        if (this.recentMnemonics.length > this.maxRecentItems) {
            this.recentMnemonics = this.recentMnemonics.slice(0, this.maxRecentItems);
        }
    }

    /**
     * Get recent mnemonics
     * @returns {Array} Array of recent mnemonic keys
     */
    getRecentMnemonics() {
        return this.recentMnemonics;
    }

    /**
     * Get all available categories
     * @returns {Array} Array of unique categories
     */
    getCategories() {
        const categories = [...new Set(Object.values(this.mnemonicsDatabase).map(m => m.category))];
        return categories.sort();
    }

    /**
     * Get mnemonics count by category
     * @returns {Object} Object with category counts
     */
    getCategoryCounts() {
        const counts = {};
        Object.values(this.mnemonicsDatabase).forEach(mnemonic => {
            counts[mnemonic.category] = (counts[mnemonic.category] || 0) + 1;
        });
        return counts;
    }

    /**
     * Get statistics about mnemonics database
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const categories = this.getCategories();
        const counts = this.getCategoryCounts();
        
        return {
            totalMnemonics: Object.keys(this.mnemonicsDatabase).length,
            totalCategories: categories.length,
            categories: categories,
            categoryCounts: counts,
            recentCount: this.recentMnemonics.length
        };
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        const container = document.getElementById('mnemonics-panel');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Mnemonics Loading Error</h3>
                    <p>${message}</p>
                    <button onclick="window.mnemonicsManager.loadMnemonics()">Retry</button>
                </div>
            `;
        }
    }
}

// Create singleton instance
const mnemonicsManager = new MnemonicsManager();

// Export singleton instance
export { mnemonicsManager };
export default mnemonicsManager;