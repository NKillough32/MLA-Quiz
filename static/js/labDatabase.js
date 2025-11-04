// Lab Values Database for MLA Quiz PWA
// Extracted from app.js for better organization

window.labDatabase = {
    'cbc': {
        name: 'Complete Blood Count (CBC)',
        values: {
            'WBC': { 
                normal: '4.0-11.0 × 10⁹/L', 
                low: 'Immunosuppression, viral infection, autoimmune disease, chemotherapy', 
                high: 'Bacterial infection, leukaemia, stress, tissue necrosis, smoking',
                critical: '<1.0 or >30 × 10⁹/L',
                ageVariations: 'Neonate: 9-30, Child: 5-17, Adult: 4.0-11.0',
                clinicalSignificance: 'Left shift suggests bacterial infection. Lymphocytosis in viral infections.'
            },
            'RBC': { 
                normal: 'M: 4.5-6.5, F: 3.8-5.8 × 10¹²/L', 
                low: 'Anaemia (iron deficiency, chronic disease, haemolysis), bleeding, kidney disease', 
                high: 'Polycythaemia vera, dehydration, COPD, high altitude',
                critical: '<2.5 or >7.0 × 10¹²/L',
                ageVariations: 'Neonate: 4.0-6.6, Child: 3.7-5.3',
                clinicalSignificance: 'Combined with Hb/Hct for anaemia classification. MCV helps determine type.'
            },
            'Haemoglobin': { 
                normal: 'M: 130-180 g/L, F: 115-165 g/L', 
                low: 'Anaemia, bleeding, iron deficiency, chronic kidney disease', 
                high: 'Polycythaemia, dehydration, COPD, smoking',
                critical: '<70 or >200 g/L',
                ageVariations: 'Neonate: 140-240, Child: 110-160, Pregnancy: 110-130',
                clinicalSignificance: 'Best indicator of oxygen-carrying capacity. Transfusion threshold typically <70-80 g/L.'
            },
            'Platelets': { 
                normal: '150-450 × 10⁹/L', 
                low: 'ITP, drug-induced, hypersplenism, viral infection, heparin', 
                high: 'Essential thrombocythaemia, reactive (infection, malignancy), iron deficiency',
                critical: '<20 or >1000 × 10⁹/L',
                ageVariations: 'Consistent across ages',
                clinicalSignificance: 'Bleeding risk increases <50. Spontaneous bleeding <10. Thrombosis risk >1000.'
            },
            'MCV': {
                normal: '82-98 fL',
                low: 'Iron deficiency, thalassaemia, chronic disease, lead poisoning',
                high: 'B12/folate deficiency, alcohol use, hypothyroidism, reticulocytosis',
                critical: '<70 or >120 fL',
                ageVariations: 'Child: 70-90, Adult: 82-98',
                clinicalSignificance: 'Microcytic: iron studies. Macrocytic: B12/folate levels. Normocytic: chronic disease.'
            }
        }
    },
    'bmp': {
        name: 'Basic Metabolic Panel (BMP)',
        values: {
            'Glucose': { 
                normal: '3.9-5.6 mmol/L (fasting), <7.8 random', 
                low: 'Hypoglycaemia: insulin excess, liver disease, adrenal insufficiency, starvation', 
                high: 'Diabetes, prediabetes, stress, steroids, pancreatic disease',
                critical: '<2.2 or >22 mmol/L',
                ageVariations: 'Child: 3.3-5.6, Adult: 3.9-5.6, Elderly: may be slightly higher',
                clinicalSignificance: 'Fasting >7.0 or random >11.1 suggests diabetes. HbA1c >48 mmol/mol diagnostic.'
            },
            'Urea': { 
                normal: '2.5-7.5 mmol/L', 
                low: 'Liver disease, malnutrition, overhydration, low protein diet', 
                high: 'Acute/chronic kidney disease, dehydration, GI bleeding, high protein diet',
                critical: '>35 mmol/L',
                ageVariations: 'Child: 1.8-6.4, Adult: 2.5-7.5, Elderly: may be elevated',
                clinicalSignificance: 'Urea:Creatinine ratio >100:1 suggests prerenal azotemia. <40:1 suggests liver disease.'
            },
            'Creatinine': { 
                normal: 'M: 62-115 μmol/L, F: 53-97 μmol/L', 
                low: 'Low muscle mass, malnutrition, pregnancy', 
                high: 'Acute/chronic kidney disease, dehydration, muscle breakdown',
                critical: '>354 μmol/L or >3× baseline',
                ageVariations: 'Child: 27-62, Adult varies by muscle mass, Elderly: lower baseline',
                clinicalSignificance: 'Use eGFR for kidney function. ≥26 μmol/L rise in 48h = AKI. Delayed rise after injury.'
            },
            'eGFR': {
                normal: '>90 mL/min/1.73m²',
                low: 'CKD stages: 60-89 (stage 2), 45-59 (3a), 30-44 (3b), 15-29 (4), <15 (5)',
                high: 'Hyperfiltration (early diabetes), pregnancy',
                critical: '<15 mL/min/1.73m² (dialysis consideration)',
                ageVariations: 'Declines ~1 mL/min/year after age 40',
                clinicalSignificance: 'More accurate than creatinine alone. Adjust medications at <60. Nephrology referral <30.'
            },
            'Sodium': { 
                normal: '135-145 mmol/L', 
                low: 'SIADH, diuretics, heart failure, liver disease, hypothyroidism', 
                high: 'Dehydration, diabetes insipidus, excess salt intake, hyperaldosteronism',
                critical: '<125 or >160 mmol/L',
                ageVariations: 'Consistent across ages',
                clinicalSignificance: 'Hyponatraemia symptoms: confusion, seizures. Correct slowly (8-12 mmol/L/day) to avoid osmotic demyelination.'
            },
            'Potassium': { 
                normal: '3.5-5.0 mmol/L', 
                low: 'Diuretics, diarrhoea, hyperaldosteronism, poor intake, alkalosis', 
                high: 'Kidney disease, ACE inhibitors, tissue breakdown, acidosis, haemolysis',
                critical: '<2.5 or >6.5 mmol/L',
                ageVariations: 'Consistent across ages',
                clinicalSignificance: 'Cardiac effects: peaked T-waves >6.5, paralysis >8.0. Replace cautiously in kidney disease.'
            },
            'Bicarbonate': { 
                normal: '22-29 mmol/L', 
                low: 'Metabolic acidosis (DKA, lactic acidosis, renal failure)', 
                high: 'Metabolic alkalosis (vomiting, diuretics), respiratory acidosis',
                critical: '<15 or >35 mmol/L',
                ageVariations: 'Child: 20-28, Adult: 22-29',
                clinicalSignificance: 'Reflects bicarbonate level. Low HCO3 with high anion gap suggests metabolic acidosis.'
            }
        }
    },
    'lft': {
        name: 'Liver Function Tests (LFT)',
        values: {
            'ALT': { 
                normal: 'M: 5-40 U/L, F: 5-35 U/L', 
                low: 'Rarely clinically significant', 
                high: 'Hepatocellular injury: hepatitis, drugs, alcohol, NASH, Wilson disease',
                critical: '>1000 U/L (acute hepatic necrosis)',
                ageVariations: 'Child: 5-25, Adult varies by gender',
                clinicalSignificance: 'More liver-specific than AST. ALT>AST suggests hepatocellular injury. Peak in acute hepatitis: 1000-5000.'
            },
            'AST': { 
                normal: 'M: 5-40 U/L, F: 5-35 U/L', 
                low: 'Rarely clinically significant', 
                high: 'Liver/muscle damage, MI, haemolysis, alcohol use',
                critical: '>1000 U/L',
                ageVariations: 'Child: 15-40, Adult varies by gender',
                clinicalSignificance: 'AST>ALT (ratio >2) suggests alcohol. Also elevated in muscle disease, MI, haemolysis.'
            },
            'Alkaline Phosphatase': { 
                normal: '30-130 U/L (adult)', 
                low: 'Hypothyroidism, malnutrition, Wilson disease', 
                high: 'Cholestasis, bone disease, pregnancy, malignancy, Paget disease',
                critical: '>5× upper limit',
                ageVariations: 'Child/adolescent: 100-390 (bone growth), Pregnancy: elevated',
                clinicalSignificance: 'Elevated with GGT suggests hepatic source. Isolated elevation: bone disease, pregnancy.'
            },
            'GGT': {
                normal: 'M: 5-55 U/L, F: 5-35 U/L',
                low: 'Rarely significant',
                high: 'Alcohol use, cholestasis, drugs, NASH',
                critical: '>10× upper limit',
                ageVariations: 'Increases with age',
                clinicalSignificance: 'Most sensitive for alcohol use. Helps differentiate hepatic vs. bone source of elevated ALP.'
            },
            'Total Bilirubin': { 
                normal: '5-20 μmol/L', 
                low: 'Rarely significant', 
                high: 'Haemolysis, liver disease, Gilbert syndrome, cholestasis',
                critical: '>340 μmol/L',
                ageVariations: 'Newborn: physiologic elevation first week',
                clinicalSignificance: 'Conjugated >34 μmol/L suggests hepatic/post-hepatic cause. Unconjugated elevation: haemolysis, Gilbert.'
            },
            'Albumin': { 
                normal: '35-50 g/L', 
                low: 'Liver disease, malnutrition, nephrotic syndrome, inflammation', 
                high: 'Dehydration (rare)',
                critical: '<20 g/L',
                ageVariations: 'Child: 34-48, Adult: 35-50, Elderly: may be lower',
                clinicalSignificance: 'Half-life 20 days, reflects chronic liver function. Low albumin increases drug free fractions.'
            },
            'PT/INR': { 
                normal: 'PT: 10-14 sec, INR: 0.9-1.2', 
                low: 'Hypercoagulable state (rare)', 
                high: 'Liver disease, warfarin, vitamin K deficiency, factor deficiencies',
                critical: 'INR >5.0',
                ageVariations: 'Consistent across ages',
                clinicalSignificance: 'Reflects hepatic synthetic function. Warfarin target INR: 2-3 (most), 2.5-3.5 (mechanical valves).'
            }
        }
    },
    'lipids': {
        name: 'Lipid Panel',
        values: {
            'Total Cholesterol': { 
                normal: '<5.0 mmol/L (optimal)', 
                low: 'Malnutrition, hyperthyroidism, liver disease, malabsorption', 
                high: 'Familial hypercholesterolaemia, diabetes, hypothyroidism, diet',
                critical: '>7.5 mmol/L',
                ageVariations: 'Increases with age until menopause (women)',
                clinicalSignificance: 'Borderline high: 5.0-6.2. High: ≥6.2. Less important than LDL for risk assessment.'
            },
            'LDL': { 
                normal: '<2.6 mmol/L (optimal), <1.8 (high risk)', 
                low: 'Overtreatment, malnutrition, hyperthyroidism', 
                high: 'Primary hyperlipidaemia, diabetes, hypothyroidism, diet',
                critical: '>4.9 mmol/L',
                ageVariations: 'Increases with age',
                clinicalSignificance: 'Primary target for statin therapy. Goals: <1.8 (very high risk), <2.6 (high risk), <3.0 (moderate risk).'
            },
            'HDL': { 
                normal: 'M: >1.0 mmol/L, F: >1.3 mmol/L', 
                low: 'Metabolic syndrome, diabetes, smoking, sedentary lifestyle', 
                high: 'Cardioprotective, exercise, moderate alcohol, genetics',
                critical: '<0.6 mmol/L',
                ageVariations: 'Higher in premenopausal women',
                clinicalSignificance: 'Low HDL major CAD risk factor. HDL >1.5 is protective.'
            },
            'Triglycerides': { 
                normal: '<1.7 mmol/L', 
                low: 'Malnutrition, hyperthyroidism', 
                high: 'Diabetes, alcohol, obesity, familial hypertriglyceridaemia',
                critical: '>11.3 mmol/L (pancreatitis risk)',
                ageVariations: 'Increases with age',
                clinicalSignificance: 'High: 2.3-5.6. Very high: ≥5.6. Pancreatitis risk >10.0. Fasting required for accuracy.'
            }
        }
    },
    'thyroid': {
        name: 'Thyroid Function Tests',
        values: {
            'TSH': {
                normal: '0.4-4.0 mIU/L',
                low: 'Hyperthyroidism, central hypothyroidism, pregnancy (1st trimester)',
                high: 'Primary hypothyroidism, subclinical hypothyroidism',
                critical: '<0.01 or >20 mIU/L',
                ageVariations: 'Elderly: upper limit may be 6-7 mIU/L',
                clinicalSignificance: 'Best screening test. Suppressed in hyperthyroidism, elevated in primary hypothyroidism.'
            },
            'Free T4': {
                normal: '12-22 pmol/L',
                low: 'Hypothyroidism, central thyroid disease, severe illness',
                high: 'Hyperthyroidism, excess thyroid hormone replacement',
                critical: '<5 or >50 pmol/L',
                ageVariations: 'Consistent across ages',
                clinicalSignificance: 'Reflects thyroid hormone activity. Normal with abnormal TSH suggests subclinical disease.'
            },
            'Free T3': {
                normal: '3.1-6.8 pmol/L',
                low: 'Hypothyroidism, sick euthyroid syndrome',
                high: 'Hyperthyroidism, T3 toxicosis',
                critical: '<2.0 or >15 pmol/L',
                ageVariations: 'Decreases slightly with age',
                clinicalSignificance: 'Most metabolically active hormone. May be normal in early hypothyroidism.'
            }
        }
    },
    'coagulation': {
        name: 'Coagulation Studies',
        values: {
            'PT/INR': {
                normal: 'PT: 11-13 seconds, INR: 0.8-1.2',
                low: 'Thrombophilia, early liver disease',
                high: 'Warfarin therapy, liver disease, vitamin K deficiency, DIC',
                critical: 'INR >5.0 (bleeding risk)',
                ageVariations: 'Slight increase with age',
                clinicalSignificance: 'INR target 2-3 for most indications, 2.5-3.5 for mechanical valves. Reflects extrinsic pathway.'
            },
            'APTT': {
                normal: '25-35 seconds',
                low: 'Early DIC, thrombophilia',
                high: 'Heparin therapy, hemophilia, liver disease, lupus anticoagulant',
                critical: '>100 seconds',
                ageVariations: 'Consistent across ages',
                clinicalSignificance: 'Monitors unfractionated heparin therapy. Reflects intrinsic pathway. Ratio to control usually reported.'
            },
            'D-dimer': {
                normal: '<0.5 mg/L',
                low: 'No clinical significance',
                high: 'VTE, DIC, malignancy, infection, pregnancy, surgery, advanced age',
                critical: '>10 mg/L',
                ageVariations: 'Increases with age (age×10 μg/L cutoff >50 years)',
                clinicalSignificance: 'High sensitivity, low specificity for VTE. Normal D-dimer excludes PE/DVT in low-risk patients.'
            }
        }
    },
    'cardiac_markers': {
        name: 'Cardiac Markers',
        values: {
            'Troponin I': {
                normal: '<0.04 μg/L',
                low: 'No clinical significance',
                high: 'MI, myocarditis, PE, renal failure, sepsis, heart failure',
                critical: '>10× upper limit',
                ageVariations: 'May be slightly elevated in elderly',
                clinicalSignificance: 'Most specific for myocardial injury. Rise 3-6h, peak 12-24h, elevated 7-14 days. High-sensitivity assays available.'
            },
            'BNP': {
                normal: '<100 pg/mL',
                low: 'Heart failure unlikely',
                high: 'Heart failure, renal failure, PE, atrial fibrillation',
                critical: '>1000 pg/mL',
                ageVariations: 'Increases with age',
                clinicalSignificance: 'Excellent negative predictive value for heart failure. NT-proBNP alternative with different cutoffs.'
            }
        }
    },
    'inflammatory_markers': {
        name: 'Inflammatory Markers',
        values: {
            'CRP': {
                normal: '<3 mg/L',
                low: 'No active inflammation',
                high: 'Infection, inflammation, malignancy, tissue necrosis',
                critical: '>200 mg/L',
                ageVariations: 'Consistent across ages',
                clinicalSignificance: 'Acute phase protein. Rises within 6h, peaks 24-48h. Useful for monitoring treatment response.'
            },
            'ESR': {
                normal: 'M: <age/2, F: <(age+10)/2',
                low: 'Polycythemia, severe heart failure, hypofibrinogenemia',
                high: 'Infection, inflammation, malignancy, anemia, pregnancy',
                critical: '>100 mm/h',
                ageVariations: 'Increases significantly with age',
                clinicalSignificance: 'Non-specific. Takes days to change. Still useful in temporal arteritis, polymyalgia rheumatica.'
            }
        }
    },
    'vitamins_minerals': {
        name: 'Vitamins & Minerals',
        values: {
            'Vitamin B12': {
                normal: '200-900 ng/L',
                low: 'Pernicious anaemia, malabsorption, vegan diet, metformin use, gastric surgery',
                high: 'B12 supplementation, liver disease, myeloproliferative disorders',
                critical: '<150 ng/L',
                ageVariations: 'Absorption decreases with age',
                clinicalSignificance: 'Deficiency causes macrocytic anaemia, neuropathy. Check MMA/homocysteine if borderline. Treat empirically if symptomatic.'
            },
            'Folate': {
                normal: '3-20 μg/L',
                low: 'Poor diet, malabsorption, alcohol, antifolate drugs (methotrexate), pregnancy',
                high: 'Folate supplementation, rarely clinically significant',
                critical: '<2 μg/L',
                ageVariations: 'Requirements increase in pregnancy',
                clinicalSignificance: 'Deficiency causes macrocytic anaemia. Always check B12 concurrently. Treat B12 deficiency before folate.'
            },
            'Vitamin D': {
                normal: '>50 nmol/L (adequate), 30-50 (insufficient), <30 (deficient)',
                low: 'Limited sun exposure, malabsorption, CKD, obesity, dark skin',
                high: 'Vitamin D toxicity, excessive supplementation',
                critical: '<25 nmol/L (severe deficiency)',
                ageVariations: 'Elderly at higher risk of deficiency',
                clinicalSignificance: 'Deficiency causes osteomalacia, osteoporosis. Supplement if <50. Check PTH if low. Common in UK population.'
            },
            'Ferritin': {
                normal: 'M: 30-300 μg/L, F: 15-200 μg/L',
                low: 'Iron deficiency anaemia, blood loss, poor intake, malabsorption',
                high: 'Inflammation, infection, liver disease, haemochromatosis, malignancy',
                critical: '<15 μg/L (iron deficiency)',
                ageVariations: 'Lower in premenopausal women due to menstruation',
                clinicalSignificance: 'Best test for iron stores. <30 suggests iron deficiency even if not anaemic. Acute phase protein - can be falsely elevated.'
            },
            'Calcium (corrected)': {
                normal: '2.20-2.60 mmol/L',
                low: 'Hypoparathyroidism, vitamin D deficiency, CKD, pancreatitis',
                high: 'Primary hyperparathyroidism, malignancy, vitamin D toxicity, thiazide diuretics',
                critical: '<1.90 or >3.00 mmol/L',
                ageVariations: 'Consistent across ages',
                clinicalSignificance: 'Correct for albumin: Corrected Ca = measured Ca + 0.02 × (40 - albumin g/L). Check PTH if abnormal.'
            }
        }
    }
};
