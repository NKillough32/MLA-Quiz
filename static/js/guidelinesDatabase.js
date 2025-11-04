// Clinical Guidelines Database
// UK NICE and specialty guidelines for common conditions

window.guidelinesDatabase = {
    'hypertension': {
        title: 'Hypertension Management (NICE NG136 2024)',
        category: 'cardiovascular',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        stages: {
            'Stage 1': 'Clinic BP ≥140/90 mmHg AND ABPM/HBPM ≥135/85 mmHg',
            'Stage 2': 'Clinic BP ≥160/100 mmHg AND ABPM/HBPM ≥150/95 mmHg',
            'Stage 3 (Severe)': 'Clinic systolic BP ≥180 mmHg OR clinic diastolic BP ≥120 mmHg'
        },
        treatment: {
            'Stage 1': 'Offer antihypertensive drug treatment if target organ damage, established CVD, renal disease, diabetes, or 10-year CVD risk ≥10%',
            'Stage 2': 'Offer antihypertensive drug treatment regardless of age',
            'Stage 3': 'Consider same-day specialist assessment. Immediate antihypertensive treatment'
        },
        targets: {
            'General': '<140/90 mmHg clinic, <135/85 mmHg home/ABPM',
            'Over 80 years': '<150/90 mmHg clinic, <145/85 mmHg home/ABPM',
            'Diabetes': '<140/90 mmHg clinic, <135/85 mmHg home/ABPM (consider <130/80 if kidney, eye or cerebrovascular damage)'
        },
        algorithm: {
            'Step 1': 'ACE inhibitor (or ARB if ACE inhibitor not tolerated). Consider CCB for black African/Caribbean ancestry',
            'Step 2': 'ACE inhibitor + CCB OR ACE inhibitor + thiazide-like diuretic',
            'Step 3': 'ACE inhibitor + CCB + thiazide-like diuretic',
            'Step 4': 'Add low-dose spironolactone (if K+ ≤4.5mmol/L) OR alpha-blocker OR beta-blocker'
        },
        lifestyle: 'Reduce salt intake to <6g/day, maintain healthy weight (BMI 20-25), exercise ≥150min/week moderate intensity, alcohol within recommended limits',
        monitoring: 'Annual review. More frequent if treatment changes or poorly controlled. QRISK3 assessment',
        specialPopulations: {
            'Pregnancy': 'Target <135/85 mmHg. First-line: labetalol. Alternatives: nifedipine, methyldopa',
            'Type 2 diabetes': 'ACE inhibitor or ARB first-line. Consider SGLT2 inhibitor',
            'CKD': 'ACE inhibitor or ARB first-line. Monitor eGFR and potassium'
        }
    },
    'asthma': {
        title: 'Asthma Management (NICE NG80 2024)',
        category: 'pulmonary',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        diagnosis: {
            'Clinical features': 'Wheeze, breathlessness, chest tightness, cough. Symptoms worse at night/early morning',
            'Investigations': 'Fractional exhaled nitric oxide (FeNO) if available. Spirometry with bronchodilator reversibility',
            'FeNO levels': '<25 ppb: asthma less likely. 25-50 ppb: intermediate. >50 ppb: high probability of asthma'
        },
        treatment: {
            'Step 1': 'SABA reliever therapy PRN (salbutamol 100-200 micrograms)',
            'Step 2': 'Add low-dose ICS preventer (beclometasone 200-400 micrograms/day or equivalent)',
            'Step 3': 'MART (Maintenance and Reliever Therapy) with ICS/formoterol OR ICS + LABA',
            'Step 4': 'Increase ICS to moderate dose OR add LTRA (montelukast)',
            'Step 5': 'High-dose ICS OR additional therapies (theophylline, LAMA). Consider specialist referral'
        },
        acute: {
            'Moderate': 'PEFR 50-75% best/predicted. Prednisolone 40-50mg daily for 5 days',
            'Severe': 'PEFR 33-50% best/predicted. Oxygen to maintain SpO2 94-98%. High-dose nebulised salbutamol',
            'Life-threatening': 'PEFR <33%. Silent chest, cyanosis, poor respiratory effort. IV magnesium sulfate, consider IV salbutamol'
        },
        monitoring: 'Annual asthma review. Assess inhaler technique, adherence, trigger avoidance',
        inhalers: {
            'pMDI': 'Pressurised metered dose inhaler - requires coordination. Use spacer device',
            'DPI': 'Dry powder inhaler - breath-actuated, needs adequate inspiratory flow',
            'Spacer': 'Reduces oropharyngeal deposition, improves drug delivery to lungs'
        },
        triggers: 'House dust mite, pollen, pets, exercise, viral infections, occupational allergens, drugs (aspirin, beta-blockers)'
    },
    'copd': {
        title: 'COPD Management (NICE NG115 2024)',
        category: 'pulmonary',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        diagnosis: 'Post-bronchodilator FEV1/FVC ratio <0.7 confirms airflow obstruction',
        stages: {
            'Stage 1 (Mild)': 'FEV1 ≥80% predicted',
            'Stage 2 (Moderate)': 'FEV1 50-79% predicted',
            'Stage 3 (Severe)': 'FEV1 30-49% predicted',
            'Stage 4 (Very severe)': 'FEV1 <30% predicted'
        },
        treatment: {
            'SABA/SAMA': 'Short-acting bronchodilator for breathlessness and exercise limitation',
            'LABA/LAMA': 'If symptoms persist. LAMA preferred if asthmatic features absent',
            'ICS': 'Consider adding ICS to LABA/LAMA if asthmatic features, eosinophilia, or steroid-responsive symptoms'
        },
        exacerbations: {
            'Mild-moderate': 'Increase bronchodilator use. Consider prednisolone 30mg daily for 5 days',
            'Severe': 'Oral prednisolone + antibiotics if purulent sputum/clinical signs of pneumonia',
            'Very severe': 'Hospital admission. Consider NIV if pH 7.25-7.35, O2 with target SpO2 88-92%'
        },
        lifestyle: 'Smoking cessation (most important intervention). Pulmonary rehabilitation. Annual influenza vaccination. Pneumococcal vaccination',
        monitoring: 'Annual review. MRC dyspnoea scale, exacerbation frequency, CAT score'
    },
    'ckd': {
        title: 'Chronic Kidney Disease (NICE NG203 2024)',
        category: 'renal',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        stages: {
            'G1': 'eGFR ≥90 with kidney damage',
            'G2': 'eGFR 60-89 with kidney damage',
            'G3a': 'eGFR 45-59 (mild-moderate decrease)',
            'G3b': 'eGFR 30-44 (moderate-severe decrease)',
            'G4': 'eGFR 15-29 (severe decrease)',
            'G5': 'eGFR <15 (kidney failure)'
        },
        monitoring: {
            'G1-G2': 'Annual eGFR and ACR',
            'G3a': 'Annual eGFR and ACR',
            'G3b': '6-monthly eGFR and ACR',
            'G4-G5': '3-6 monthly eGFR and ACR. Prepare for RRT'
        },
        treatment: {
            'ACE inhibitor/ARB': 'If diabetes, hypertension, or ACR ≥3mg/mmol',
            'Statin': 'Atorvastatin 20mg for primary prevention of CVD',
            'Blood pressure': 'Target <140/90 mmHg (<130/80 if ACR >70mg/mmol)',
            'Mineral bone disease': 'Monitor calcium, phosphate, PTH, vitamin D'
        },
        referral: {
            'Immediate': 'AKI, eGFR <30, ACR >70mg/mmol, suspected renal artery stenosis',
            'Routine': 'eGFR 30-60 with progressive decline, ACR 30-70mg/mmol, hypertension difficult to control'
        },
        complications: 'Anaemia (Hb <110g/L), mineral bone disease, metabolic acidosis, cardiovascular disease'
    },
    'heart-failure': {
        title: 'Heart Failure (NICE NG106 2024)',
        category: 'cardiovascular',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        diagnosis: 'Clinical features + structural/functional cardiac abnormality. BNP >400pg/mL or NT-proBNP >2000pg/mL',
        classification: {
            'HFrEF': 'Heart failure with reduced ejection fraction (LVEF ≤40%)',
            'HFmrEF': 'Heart failure with mid-range ejection fraction (LVEF 41-49%)',
            'HFpEF': 'Heart failure with preserved ejection fraction (LVEF ≥50%)'
        },
        treatment: {
            'ACE inhibitor': 'First-line for HFrEF. Start ramipril 1.25mg twice daily, titrate to 5mg twice daily',
            'Beta-blocker': 'Add bisoprolol or carvedilol once ACE inhibitor established',
            'MRA': 'Add spironolactone if symptoms persist despite ACE inhibitor + beta-blocker',
            'ARB': 'If ACE inhibitor not tolerated. Candesartan or valsartan',
            'SGLT2 inhibitor': 'Consider dapagliflozin in HFrEF with diabetes or eGFR ≥25'
        },
        monitoring: 'U&Es within 1-2 weeks of starting/changing dose. Aim for target doses if tolerated',
        deviceTherapy: {
            'ICD': 'Primary prevention if LVEF ≤35% despite 3 months optimal medical therapy',
            'CRT': 'If LVEF ≤35%, QRS ≥130ms, sinus rhythm, on optimal medical therapy'
        },
        lifestyle: 'Daily weight monitoring. Fluid restriction if severe symptoms. Cardiac rehabilitation'
    },
    'af': {
        title: 'Atrial Fibrillation (NICE NG196 2024)',
        category: 'cardiovascular',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        types: {
            'Paroxysmal': 'Self-terminating within 7 days (usually <48 hours)',
            'Persistent': 'Lasts >7 days or requires cardioversion',
            'Long-standing persistent': '>12 months duration',
            'Permanent': 'Accepted long-term AF, no attempt at rhythm control'
        },
        rateControl: {
            'First-line': 'Beta-blocker or rate-limiting CCB (diltiazem, verapamil)',
            'Alternative': 'Digoxin (if sedentary or heart failure)',
            'Target': 'Resting heart rate <110 bpm (lenient control)',
            'Strict control': '<80 bpm if symptoms persist'
        },
        rhythmControl: {
            'Indications': 'Symptomatic AF despite rate control, younger patients, first presentation',
            'Cardioversion': 'If AF <48 hours or anticoagulated for ≥3 weeks',
            'Maintenance': 'Amiodarone, sotalol, flecainide (if no structural heart disease)'
        },
        anticoagulation: {
            'CHA2DS2-VASc': 'Calculate stroke risk. Anticoagulate if score ≥2 (men) or ≥3 (women)',
            'HAS-BLED': 'Assess bleeding risk but high score not contraindication',
            'DOAC': 'First-line: apixaban, dabigatran, edoxaban, rivaroxaban',
            'Warfarin': 'If DOAC contraindicated. Target INR 2.0-3.0'
        },
        monitoring: 'Annual review. Check for symptoms, pulse rate/rhythm, blood pressure, medication adherence'
    },
    'depression': {
        title: 'Depression Management (NICE NG222 2024)',
        category: 'mental-health',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        assessment: {
            'PHQ-9': 'Patient Health Questionnaire for severity assessment',
            'Mild': 'PHQ-9 score 5-9. Watchful waiting, self-help, brief interventions',
            'Moderate': 'PHQ-9 score 10-14. Psychological interventions or antidepressants',
            'Severe': 'PHQ-9 score 15-19. Antidepressants + psychological interventions'
        },
        psychological: {
            'First-line': 'CBT (individual or group), guided self-help, computerised CBT',
            'Alternatives': 'IPT (interpersonal therapy), counselling, mindfulness-based cognitive therapy'
        },
        pharmacological: {
            'First-line': 'SSRI (sertraline, citalopram, fluoxetine, paroxetine)',
            'Second-line': 'Different SSRI, SNRI (venlafaxine), mirtazapine',
            'Starting dose': 'Sertraline 50mg daily, citalopram 20mg daily'
        },
        monitoring: {
            'Initial': 'Review within 2 weeks of starting antidepressant',
            'Young people': 'Weekly for first month if <30 years old',
            'Ongoing': 'Every 2-4 weeks for first 3 months, then less frequently'
        },
        duration: 'Continue antidepressant for ≥6 months after remission. Consider longer if recurrent episodes',
        riskFactors: 'Discontinuation symptoms, suicide risk (especially early treatment), drug interactions'
    },
    'obesity': {
        title: 'Obesity Management (NICE NG189 2024)',
        category: 'endocrine',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        classification: {
            'Overweight': 'BMI 25-29.9 kg/m²',
            'Obesity class I': 'BMI 30-34.9 kg/m²',
            'Obesity class II': 'BMI 35-39.9 kg/m²',
            'Obesity class III': 'BMI ≥40 kg/m²'
        },
        assessment: 'BMI, waist circumference, comorbidities (T2DM, hypertension, sleep apnoea), cardiovascular risk',
        lifestyle: {
            'Diet': 'Calorie deficit 600kcal/day. Mediterranean-style, low-calorie, low-fat diets',
            'Exercise': 'Gradually increase to 150-300 minutes moderate intensity per week',
            'Behaviour': 'Goal setting, self-monitoring, cognitive restructuring'
        },
        pharmacotherapy: {
            'Orlistat': 'BMI ≥30 or ≥28 with comorbidities. 120mg three times daily with meals',
            'GLP-1 agonists': 'Specialist initiation. Liraglutide if specific criteria met',
            'Monitoring': 'Weight loss target ≥5% at 3 months, ≥10% at 6 months'
        },
        surgery: {
            'Criteria': 'BMI ≥40 or ≥35 with comorbidities. Failed non-surgical methods',
            'Options': 'Gastric bypass, sleeve gastrectomy, adjustable gastric band',
            'Follow-up': 'Lifelong specialist monitoring, nutritional supplements'
        },
        comorbidities: 'Screen for T2DM, hypertension, dyslipidaemia, sleep apnoea, NAFLD, osteoarthritis'
    },
    'stroke': {
        title: 'Stroke Prevention & Management (NICE NG128 2024)',
        category: 'neurological',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        prevention: {
            'Antiplatelet': 'Aspirin 75mg + dipyridamole 200mg twice daily for secondary prevention',
            'Anticoagulation': 'For AF: DOAC first-line (apixaban, rivaroxaban, dabigatran)',
            'Statin': 'Atorvastatin 80mg daily for secondary prevention',
            'Blood pressure': 'Target <130/80 mmHg. Start 2 weeks after acute stroke'
        },
        acute: {
            'Recognition': 'FAST (Face, Arms, Speech, Time) assessment',
            'Thrombolysis': 'Alteplase within 4.5 hours of symptom onset if eligible',
            'Thrombectomy': 'Within 6 hours for proximal anterior circulation occlusion',
            'Aspirin': '300mg daily for 2 weeks, then 75mg daily long-term'
        },
        rehabilitation: {
            'Early': 'Mobilisation within 24 hours if medically stable',
            'MDT': 'Physiotherapy, occupational therapy, speech therapy, dietician',
            'Goals': 'Functional independence, swallowing assessment, mood screening'
        },
        riskFactors: 'Hypertension, AF, diabetes, smoking, hyperlipidaemia, carotid stenosis, previous TIA/stroke',
        monitoring: 'Annual review: BP, cholesterol, diabetes control, medication adherence, functional status'
    },
    'uti': {
        title: 'Urinary Tract Infections (NICE NG109 2024)',
        category: 'infectious-diseases',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        diagnosis: {
            'Uncomplicated UTI': 'Dysuria, frequency, urgency, suprapubic pain in healthy women',
            'Complicated UTI': 'Men, pregnant women, children, catheterised patients, immunocompromised',
            'Urine dipstick': 'Nitrites + leucocyte esterase positive. Blood may be present'
        },
        treatment: {
            'Uncomplicated cystitis': 'Nitrofurantoin 100mg twice daily for 3 days OR trimethoprim 200mg twice daily for 3 days',
            'Pyelonephritis': 'Ciprofloxacin 500mg twice daily for 7 days OR co-amoxiclav 500/125mg three times daily for 14 days',
            'Men': 'Trimethoprim 200mg twice daily for 7 days OR nitrofurantoin 100mg twice daily for 7 days',
            'Pregnancy': 'Nitrofurantoin 100mg twice daily for 7 days (avoid at term)'
        },
        recurrent: {
            'Definition': '≥3 UTIs in 12 months or ≥2 in 6 months',
            'Prevention': 'Post-coital prophylaxis, continuous prophylaxis, self-treatment',
            'Prophylaxis': 'Trimethoprim 100mg at night OR nitrofurantoin 50mg at night'
        },
        catheter: {
            'Symptomatic CAUTI': 'Treat with antibiotics based on local guidelines',
            'Asymptomatic bacteriuria': 'Do not treat unless immunocompromised or before invasive procedures'
        },
        advice: 'Adequate fluid intake, complete antibiotic course, cranberry products may help prevent recurrence'
    },
    'diabetes': {
        title: 'Type 2 Diabetes Management (NICE NG28 2024)',
        category: 'endocrine',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        diagnosis: {
            'HbA1c': '≥48 mmol/mol (≥6.5%) on two occasions OR single value if symptomatic',
            'Fasting glucose': '≥7.0 mmol/L (≥126 mg/dL)',
            'Random glucose': '≥11.1 mmol/L (≥200 mg/dL) with symptoms',
            'OGTT': '2-hour glucose ≥11.1 mmol/L (≥200 mg/dL)'
        },
        targets: {
            'HbA1c': '<48 mmol/mol (<6.5%) for newly diagnosed, <53 mmol/mol (<7.0%) for most adults',
            'Blood pressure': '<130/80 mmHg',
            'Cholesterol': 'Non-HDL <2.5 mmol/L'
        },
        lifestyle: {
            'Diet': 'Mediterranean-style, low glycaemic index, weight loss if BMI >25',
            'Exercise': '150 minutes moderate intensity per week, resistance training',
            'Weight': 'Target weight loss 5-10% if overweight'
        },
        medications: {
            'First-line': 'Metformin 500mg twice daily, titrate to 1g twice daily',
            'Second-line': 'SGLT2 inhibitor (if CVD/heart failure) OR DPP-4 inhibitor OR sulfonylurea',
            'Third-line': 'Triple therapy or insulin',
            'Insulin': 'Start with basal insulin (glargine, detemir) 10 units daily, titrate 2-4 units every 3-7 days'
        },
        monitoring: {
            'HbA1c': 'Every 3-6 months until stable, then 6-monthly',
            'Annual checks': 'Foot examination, eye screening, kidney function, lipids, blood pressure',
            'Sick day rules': 'Continue insulin, increase monitoring, seek help if vomiting'
        },
        complications: 'Retinopathy, nephropathy, neuropathy, cardiovascular disease, diabetic foot'
    },
    'pneumonia': {
        title: 'Pneumonia Management (NICE NG138 2024)',
        category: 'pulmonary',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        diagnosis: {
            'Clinical': 'Cough, fever, dyspnea, pleuritic chest pain, crackles',
            'CXR': 'New infiltrate (may be normal in early disease)',
            'Blood tests': 'FBC, CRP, U&E, LFT. Consider pneumococcal/legionella antigens'
        },
        severity: {
            'CURB-65': 'Confusion, Urea >7, RR ≥30, BP <90/60, age ≥65',
            'Score 0-1': 'Low severity - consider home treatment',
            'Score 2': 'Moderate severity - consider hospital admission',
            'Score ≥3': 'High severity - urgent hospital admission'
        },
        treatment: {
            'Mild CAP': 'Amoxicillin 500mg three times daily for 5 days',
            'Moderate CAP': 'Amoxicillin 500mg three times daily + clarithromycin 500mg twice daily for 5 days',
            'Severe CAP': 'Co-amoxiclav 1.2g three times daily IV + clarithromycin 500mg twice daily IV',
            'Atypical': 'Clarithromycin 500mg twice daily OR doxycycline 200mg on day 1, then 100mg daily'
        },
        admission: {
            'Criteria': 'CURB-65 ≥2, hypoxia <90%, inability to maintain oral intake, significant comorbidities',
            'Monitoring': 'Oxygen saturation, fluid balance, response to treatment',
            'Discharge': 'Clinically stable for 24 hours, able to maintain oral intake, oxygen saturation >90%'
        },
        prevention: 'Pneumococcal vaccination (≥65 years, immunocompromised), annual influenza vaccination'
    },
    'sepsis': {
        title: 'Sepsis Recognition & Management (NICE NG51 2024)',
        category: 'infectious-diseases',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        recognition: {
            'Red flags': 'Systolic BP <90, HR >130, RR ≥25, needs O2 to maintain sats ≥92%, non-blanching rash',
            'Amber flags': 'Relatives concerned about mental state, acute change in mental state, HR 91-130, T <36°C',
            'High-risk groups': 'Age >75, immunocompromised, recent surgery/invasive procedure, indwelling devices'
        },
        definitions: {
            'Sepsis': 'Life-threatening organ dysfunction due to dysregulated host response to infection',
            'Septic shock': 'Sepsis with circulatory/cellular dysfunction (lactate >2, vasopressors needed)',
            'qSOFA': 'Altered mental state, SBP ≤100, RR ≥22 (score ≥2 = high risk)'
        },
        management: {
            'Sepsis Six': '1. Give oxygen, 2. Take blood cultures, 3. Give antibiotics, 4. Give fluids, 5. Measure lactate, 6. Measure urine output',
            'Timeframe': 'Complete within 1 hour of recognition',
            'Antibiotics': 'Broad-spectrum within 1 hour. Adjust based on cultures and local guidelines',
            'Fluids': '500ml crystalloid bolus, reassess and repeat if needed'
        },
        antibiotics: {
            'Community-acquired': 'Amoxicillin 1g IV three times daily + gentamicin',
            'Hospital-acquired': 'Piperacillin-tazobactam 4.5g three times daily + gentamicin',
            'Neutropenic': 'Piperacillin-tazobactam + gentamicin',
            'Duration': 'Review daily, typically 5-7 days depending on source and response'
        },
        monitoring: 'Hourly observations, fluid balance, lactate, organ function, consider HDU/ICU if deteriorating'
    },
    'dvt-pe': {
        title: 'DVT & Pulmonary Embolism (NICE NG158 2024)',
        category: 'cardiovascular',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        assessment: {
            'Wells Score DVT': '<1 unlikely, ≥1 likely. Use 2-level score',
            'Wells Score PE': '≤4 unlikely, >4 likely. Use 2-level score',
            'D-dimer': 'If low probability. Negative D-dimer excludes VTE'
        },
        diagnosis: {
            'DVT': 'Doppler ultrasound within 4 hours or interim DOAC + scan within 24 hours',
            'PE': 'CTPA (CT pulmonary angiography) first-line imaging',
            'V/Q scan': 'If CTPA contraindicated (pregnancy, contrast allergy, renal impairment)'
        },
        treatment: {
            'Initial': 'DOAC (apixaban, rivaroxaban) first-line OR LMWH → warfarin',
            'Apixaban': '10mg twice daily for 7 days, then 5mg twice daily',
            'Rivaroxaban': '15mg twice daily for 21 days, then 20mg daily',
            'Warfarin': 'LMWH overlap until INR 2-3 for 2 consecutive days. Target INR 2.5',
            'Duration': 'Provoked: 3 months. Unprovoked: 3-6 months, consider longer if recurrent'
        },
        'massive PE': {
            'Definition': 'Hypotension, shock, cardiac arrest',
            'Treatment': 'Thrombolysis (alteplase), consider embolectomy',
            'HDU/ICU': 'Immediate admission, monitoring, vasopressor support'
        },
        thrombophilia: {
            'Screen if': 'Age <50, unprovoked VTE, recurrent VTE, unusual site, family history',
            'Tests': 'Protein C/S, antithrombin, factor V Leiden, prothrombin gene, antiphospholipid antibodies',
            'Timing': 'At least 3 months after stopping anticoagulation'
        },
        prevention: 'Risk assess all hospital admissions. LMWH prophylaxis if indicated. TED stockings if immobile'
    },
    'acs': {
        title: 'Acute Coronary Syndrome (NICE NG185 2024)',
        category: 'cardiovascular',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        recognition: {
            'Chest pain': 'Central, crushing, radiating to jaw/arm, associated with sweating, nausea',
            'Atypical': 'Epigastric pain, dyspnoea, syncope (especially elderly, diabetic, women)',
            'ECG': 'ST elevation (STEMI), ST depression/T wave inversion (NSTEMI), normal (possible ACS)'
        },
        'stemi': {
            'Diagnosis': 'ST elevation ≥1mm in ≥2 contiguous leads OR new LBBB',
            'Immediate': 'Aspirin 300mg, P2Y12 inhibitor (ticagrelor 180mg), morphine, antiemetic, GTN',
            'Reperfusion': 'Primary PCI <120 minutes OR thrombolysis if PCI not available <120 minutes',
            'Thrombolysis': 'Alteplase or tenecteplase. Give if PCI not achievable within 120 minutes'
        },
        'nstemi': {
            'Risk stratification': 'GRACE score determines management',
            'High risk': 'Coronary angiography within 72 hours',
            'Immediate': 'Aspirin 300mg, ticagrelor 180mg, fondaparinux 2.5mg SC daily',
            'Anticoagulation': 'Fondaparinux preferred unless angiography planned within 24 hours'
        },
        'secondary prevention': {
            'Antiplatelet': 'Aspirin 75mg + ticagrelor 90mg twice daily for 12 months, then aspirin alone',
            'Statin': 'Atorvastatin 80mg daily',
            'ACE inhibitor': 'Ramipril 1.25mg twice daily, titrate to 5mg twice daily',
            'Beta-blocker': 'Bisoprolol 1.25mg daily, titrate to 10mg daily',
            'Lifestyle': 'Cardiac rehabilitation, smoking cessation, BP <130/80, lipid target'
        },
        complications: 'Arrhythmias, heart failure, cardiogenic shock, mechanical complications (VSD, MR, rupture)',
        targets: 'Total cholesterol <4mmol/L, LDL <2mmol/L, non-HDL <2.5mmol/L'
    },
    'anaphylaxis': {
        title: 'Anaphylaxis Management (Resus Council UK 2024)',
        category: 'emergency',
        evidenceLevel: 'Emergency Guideline',
        lastUpdated: '2024',
        organisation: 'Resuscitation Council UK',
        recognition: {
            'ABC problems': 'Airway, breathing, circulation compromise',
            'Skin changes': 'Urticaria, angioedema, flushing (may be absent in 20%)',
            'Sudden onset': 'Minutes after exposure to known allergen',
            'Life-threatening': 'Airway/breathing/circulation problems'
        },
        treatment: {
            'IM Adrenaline': '500 micrograms (0.5ml of 1:1000) into anterolateral thigh. Repeat after 5 minutes if no improvement',
            'Position': 'Lie flat with legs raised (unless airway/breathing compromised)',
            'High-flow oxygen': '15L via non-rebreathing mask',
            'IV fluids': '500ml-1L crystalloid rapidly if signs of shock',
            'Antihistamine': 'Chlorphenamine 10mg IV/IM (after adrenaline)',
            'Steroid': 'Hydrocortisone 200mg IV/IM (after adrenaline)'
        },
        refractory: {
            'IV adrenaline': 'If no response to IM doses. Titrate carefully, cardiac monitoring',
            'Alternative': 'Glucagon 1-2mg IM if on beta-blockers'
        },
        observation: {
            'Minimum': '6-8 hours observation after resolution',
            'Biphasic reaction': 'Can occur up to 72 hours later (1-20% cases)',
            'Discharge': 'Ensure 2 adrenaline auto-injectors prescribed, referral to allergy clinic'
        },
        autoInjector: {
            'Indications': 'Previous anaphylaxis, high-risk foods (nuts, fish), venom allergy, idiopathic',
            'Training': 'Demonstrate use, provide written plan, MedicAlert bracelet',
            'Types': 'EpiPen, Jext, Emerade (150, 300, 500 microgram doses)'
        }
    },
    'osteoporosis': {
        title: 'Osteoporosis Prevention & Treatment (NICE NG239 2024)',
        category: 'endocrine',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        assessment: {
            'FRAX tool': 'Calculate 10-year fracture risk. Age, sex, BMI, risk factors',
            'DEXA scan': 'T-score ≤-2.5 = osteoporosis. -1 to -2.5 = osteopenia',
            'Indications for DEXA': 'Age >50 + fragility fracture, long-term steroids, FRAX intermediate/high risk'
        },
        riskFactors: {
            'Major': 'Age >75, previous fragility fracture, glucocorticoids, family history hip fracture',
            'Other': 'Low BMI <18.5, alcohol >14 units/week, smoking, rheumatoid arthritis, conditions causing secondary osteoporosis'
        },
        prevention: {
            'Calcium': '700-1200mg daily (diet or supplements)',
            'Vitamin D': '10-20 micrograms (400-800 IU) daily',
            'Exercise': 'Weight-bearing, balance, resistance training',
            'Lifestyle': 'Stop smoking, reduce alcohol, maintain healthy weight'
        },
        treatment: {
            'First-line': 'Oral bisphosphonate (alendronate 70mg weekly OR risedronate 35mg weekly)',
            'Administration': 'Take on empty stomach with full glass water, stay upright 30 minutes',
            'Second-line': 'IV bisphosphonate (zoledronic acid 5mg annually) OR denosumab 60mg SC 6-monthly',
            'Alternatives': 'Raloxifene (postmenopausal women), teriparatide (severe osteoporosis)',
            'Duration': 'Review after 5 years bisphosphonate, consider drug holiday'
        },
        monitoring: {
            'DEXA': 'Not routinely repeated if on treatment unless clinical indication',
            'Falls risk': 'Assess and address falls risk factors',
            'Fracture liaison': 'Post-fracture services for secondary prevention'
        },
        steroids: 'Consider bone protection if prednisolone ≥7.5mg daily for ≥3 months'
    },
    'gout': {
        title: 'Gout Management (BSR/BHPR Guidelines 2024)',
        category: 'rheumatologic',
        evidenceLevel: 'BSR Guideline',
        lastUpdated: '2024',
        organisation: 'British Society for Rheumatology',
        diagnosis: {
            'Clinical': 'Acute monoarthritis (typically 1st MTP joint), rapid onset, severe pain, red, hot, swollen',
            'Joint aspiration': 'Negatively birefringent needle-shaped crystals (monosodium urate)',
            'Serum urate': 'May be normal during acute attack. Check 2-4 weeks after attack'
        },
        acute: {
            'First-line': 'NSAID (naproxen 750mg stat, then 250mg three times daily) OR colchicine 500mcg 2-4 times daily',
            'Alternatives': 'Colchicine (if NSAID contraindicated), oral/IM steroid (if both contraindicated)',
            'Avoid': 'Do NOT start/stop allopurinol during acute attack',
            'Duration': 'Continue until 1-2 days after symptoms resolve'
        },
        uratelowering: {
            'Indications': '≥2 attacks/year, tophi, chronic gouty arthritis, urate stones, CKD stage ≥3',
            'Target': 'Serum urate <300 micromol/L (<5mg/dL)',
            'First-line': 'Allopurinol 100mg daily, increase by 100mg every 2-4 weeks to target (max 900mg)',
            'Prophylaxis': 'Give colchicine 500mcg once/twice daily OR NSAID when starting allopurinol',
            'Alternative': 'Febuxostat if allopurinol not tolerated'
        },
        lifestyle: {
            'Diet': 'Reduce purine-rich foods (red meat, seafood, organ meats, yeast extracts)',
            'Alcohol': 'Limit beer and spirits (wine less problematic)',
            'Drinks': 'Avoid sugar-sweetened drinks, increase water intake',
            'Weight': 'Gradual weight loss if overweight (rapid weight loss can trigger attacks)',
            'Vitamin C': '500mg daily may reduce urate'
        },
        monitoring: 'Check serum urate every 2-4 weeks when titrating allopurinol. Once at target, check 6-monthly',
        complications: 'Tophi (chronic urate deposits), chronic gouty arthritis, urate nephropathy'
    },
    'rheumatoid': {
        title: 'Rheumatoid Arthritis (NICE NG100 2024)',
        category: 'rheumatologic',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        diagnosis: {
            'Clinical': 'Symmetrical polyarthritis, morning stiffness >30 minutes, small joints of hands/feet',
            'Investigations': 'Rheumatoid factor, anti-CCP antibodies (more specific), inflammatory markers',
            'Imaging': 'X-rays of hands/feet. USS/MRI if X-ray normal but clinical suspicion high',
            'Referral': 'Urgent rheumatology if persistent synovitis (even if blood tests negative)'
        },
        treatment: {
            'Immediate': 'Symptom control with NSAIDs/steroids while awaiting rheumatology',
            'First-line DMARD': 'Methotrexate + short-term oral steroid OR methotrexate + another DMARD',
            'Methotrexate': '7.5mg weekly PO, increase to 15-25mg weekly. Take folic acid 5mg weekly (different day)',
            'Alternative DMARDs': 'Sulfasalazine, hydroxychloroquine, leflunomide',
            'Biologics': 'If inadequate response to ≥2 DMARDs (including methotrexate)'
        },
        monitoring: {
            'Methotrexate': 'FBC, U&E, LFT every 2 weeks until stable, then monthly for 3 months, then 2-3 monthly',
            'Disease activity': 'DAS28 score at diagnosis and after treatment changes',
            'Target': 'Remission (DAS28 <2.6) or low disease activity'
        },
        biologics: {
            'Anti-TNF': 'Adalimumab, etanercept, infliximab (if DAS28 >5.1 despite 2 DMARDs)',
            'Others': 'Rituximab, tocilizumab, abatacept, JAK inhibitors',
            'Monitoring': 'Screen for TB, hepatitis before starting. Regular infection monitoring'
        },
        complications: 'Joint damage, cardiovascular disease (increased risk), interstitial lung disease, cervical myelopathy',
        lifestyle: 'Regular exercise, smoking cessation (affects treatment response), foot care, occupational therapy'
    },
    'hypothyroidism': {
        title: 'Hypothyroidism Management (BTA Guidelines 2024)',
        category: 'endocrine',
        evidenceLevel: 'British Thyroid Association Guideline',
        lastUpdated: '2024',
        organisation: 'British Thyroid Association',
        diagnosis: {
            'TSH': '>10 mU/L with low free T4 = overt hypothyroidism',
            'Subclinical': 'TSH 5-10 mU/L with normal free T4',
            'Symptoms': 'Fatigue, weight gain, constipation, cold intolerance, bradycardia, dry skin',
            'Causes': 'Hashimoto thyroiditis (most common), post-thyroidectomy, radioiodine, drugs (amiodarone, lithium)'
        },
        treatment: {
            'Levothyroxine': 'Start 1.6 micrograms/kg/day (usually 50-100 micrograms)',
            'Elderly/cardiac': 'Start 25 micrograms daily, increase slowly',
            'Timing': 'Take on empty stomach, at least 30 minutes before food',
            'Interactions': 'Separate from calcium, iron, PPI by 4 hours'
        },
        monitoring: {
            'Initial': 'Check TSH after 6-8 weeks, adjust dose by 25-50 microgram increments',
            'Target TSH': '0.5-2.5 mU/L (lower half of reference range)',
            'Stable': 'Annual TSH once stable dose achieved',
            'Pregnancy': 'Increase dose by 25-50%, monitor TSH monthly'
        },
        subclinical: {
            'Treat if': 'TSH >10, symptoms, positive antibodies, goitre, pregnancy/planning pregnancy',
            'Monitor if': 'TSH 5-10 with no symptoms - repeat in 3-6 months'
        },
        'myxoedema coma': {
            'Emergency': 'Severe hypothyroidism with altered consciousness, hypothermia',
            'Treatment': 'IV levothyroxine 200-400 micrograms loading, IV hydrocortisone, supportive care',
            'ICU': 'High mortality, requires intensive care monitoring'
        }
    },
    'hyperthyroidism': {
        title: 'Hyperthyroidism Management (BTA Guidelines 2024)',
        category: 'endocrine',
        evidenceLevel: 'British Thyroid Association Guideline',
        lastUpdated: '2024',
        organisation: 'British Thyroid Association',
        diagnosis: {
            'TSH': 'Suppressed (<0.1 mU/L) with raised free T4 and/or T3',
            'Symptoms': 'Weight loss, heat intolerance, tremor, anxiety, palpitations, diarrhoea',
            'Causes': 'Graves disease (most common), toxic multinodular goitre, toxic adenoma, thyroiditis',
            'Graves': 'Diffuse goitre, eye signs, positive TRAb (TSH receptor antibodies)'
        },
        treatment: {
            'Carbimazole': '20-40mg daily initially, reduce to 5-15mg daily maintenance',
            'Propylthiouracil': 'If carbimazole not tolerated or pregnancy. 200-400mg daily',
            'Block and replace': 'High-dose antithyroid + levothyroxine (alternative regimen)',
            'Beta-blocker': 'Propranolol 10-40mg three times daily for symptom control'
        },
        definitive: {
            'Radioiodine': 'First-line definitive treatment for Graves. Single dose, permanent',
            'Contraindications': 'Pregnancy, breastfeeding, active Graves ophthalmopathy',
            'Outcome': 'Most become hypothyroid - need lifelong levothyroxine',
            'Surgery': 'Total thyroidectomy if large goitre, compression symptoms, or patient choice'
        },
        monitoring: {
            'Initial': 'TFTs every 4-6 weeks until stable, then 3-6 monthly',
            'FBC': 'Baseline and if sore throat/fever (agranulocytosis risk with carbimazole)',
            'LFTs': 'Propylthiouracil can cause hepatotoxicity',
            'Duration': '12-18 months antithyroid drugs, then stop and monitor for relapse'
        },
        'thyroid storm': {
            'Emergency': 'Severe thyrotoxicosis with fever, tachycardia, confusion, heart failure',
            'Treatment': 'Propylthiouracil 200mg 4-hourly, propranolol, hydrocortisone, supportive care',
            'ICU': 'High mortality, requires intensive monitoring'
        },
        pregnancy: 'Propylthiouracil preferred in 1st trimester. Aim for high-normal free T4'
    },
    'iron-deficiency': {
        title: 'Iron Deficiency Anaemia (NICE NG8 2024)',
        category: 'hematologic',
        evidenceLevel: 'NICE Clinical Guideline',
        lastUpdated: '2024',
        organisation: 'NICE',
        diagnosis: {
            'FBC': 'Low Hb, low MCV (<80 fL), hypochromic red cells',
            'Iron studies': 'Low ferritin (<30 mcg/L), low serum iron, high TIBC, low transferrin saturation',
            'Clinical': 'Fatigue, dyspnoea, palpitations, pallor, angular stomatitis, koilonychia'
        },
        investigation: {
            'Men/post-menopausal women': 'Investigate for GI blood loss - urgent upper and lower GI endoscopy',
            'Pre-menopausal women': 'Menorrhagia most common cause, investigate if heavy/persistent',
            'Coeliac screen': 'Anti-TTG antibodies in all patients',
            'H. pylori': 'Test and treat if positive'
        },
        treatment: {
            'Oral iron': 'Ferrous sulfate 200mg (65mg elemental iron) twice/three times daily',
            'Alternatives': 'Ferrous fumarate, ferrous gluconate if side effects',
            'Duration': 'Continue for 3 months after Hb normalizes to replete stores',
            'Vitamin C': 'May enhance absorption - take with orange juice'
        },
        sideEffects: {
            'Common': 'Nausea, constipation, diarrhoea, black stools, abdominal pain',
            'Management': 'Take with food (reduces absorption slightly), reduce dose, try alternate day dosing'
        },
        'IV iron': {
            'Indications': 'Oral iron not tolerated/ineffective, malabsorption, ongoing blood loss, CKD',
            'Options': 'Iron isomaltoside, iron carboxymaltose - single dose possible',
            'Monitoring': 'Check Hb and ferritin 2-4 weeks after infusion'
        },
        monitoring: 'Check FBC after 2-4 weeks treatment. Hb should rise 10-20 g/L per week. Investigate if no response',
        transfusion: 'If Hb <70 g/L with symptoms OR <80 g/L with cardiovascular disease'
    }
};
