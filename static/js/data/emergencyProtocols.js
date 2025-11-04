/**
 * Emergency Protocols Database
 * Extracted from V1 for V2 independence
 * Contains critical emergency management protocols
 */

export const emergencyProtocols = {
    'acls-vf-vt': {
        name: 'ACLS: VF/VT',
        category: 'cardiac',
        urgency: 'emergency',
        steps: [
            'Verify unresponsiveness and no normal breathing',
            'Begin CPR: 30:2 compressions to ventilations',
            'Attach defibrillator/monitor',
            'Check rhythm - VF/VT confirmed',
            'Charge defibrillator to 200J (biphasic)',
            'Clear area and deliver shock',
            'Resume CPR immediately for 2 minutes',
            'Check rhythm - if VF/VT persists, repeat shock',
            'Give Adrenaline 1mg IV/IO after 2nd shock',
            'Give Amiodarone 300mg IV/IO after 3rd shock',
            'Continue cycles until ROSC or exhaustion'
        ],
        drugs: ['Adrenaline 1mg IV/IO every 3-5 minutes', 'Amiodarone 300mg IV/IO (then 150mg if needed)'],
        ukGuideline: 'Resuscitation Council UK 2021',
        criticalActions: ['High-quality CPR', 'Minimise interruptions', 'Consider reversible causes (4Hs 4Ts)']
    },
    'acls-pea-asystole': {
        name: 'ACLS: PEA/Asystole',
        category: 'cardiac',
        urgency: 'emergency',
        steps: [
            'Verify unresponsiveness and no normal breathing',
            'Begin CPR: 30:2 compressions to ventilations',
            'Attach defibrillator/monitor',
            'Check rhythm - PEA/Asystole confirmed',
            'Continue CPR for 2 minutes',
            'Give Adrenaline 1mg IV/IO as soon as possible',
            'Check rhythm every 2 minutes',
            'Repeat Adrenaline every 3-5 minutes',
            'Treat reversible causes aggressively',
            'Continue until ROSC or exhaustion'
        ],
        drugs: ['Adrenaline 1mg IV/IO every 3-5 minutes'],
        ukGuideline: 'Resuscitation Council UK 2021',
        criticalActions: ['High-quality CPR', 'Identify and treat reversible causes', 'Consider mechanical CPR device']
    },
    'sepsis-six': {
        name: 'Sepsis 6 Bundle',
        category: 'sepsis',
        urgency: 'emergency',
        steps: [
            'Give high-flow oxygen (aim SpO2 94-98%)',
            'Take blood cultures (and other cultures)',
            'Give IV antibiotics within 1 hour',
            'Give IV fluid resuscitation if hypotensive',
            'Check lactate levels',
            'Monitor urine output (aim >0.5ml/kg/hr)'
        ],
        drugs: ['Broad-spectrum antibiotics within 1 hour', '30ml/kg crystalloid if hypotensive'],
        ukGuideline: 'NICE NG51',
        criticalActions: ['Time-critical delivery', 'Source control', 'Early escalation to critical care']
    },
    'major-trauma': {
        name: 'Major Trauma Protocol',
        category: 'trauma',
        urgency: 'emergency',
        steps: [
            'Primary survey: A-B-C-D-E',
            'Airway with C-spine control',
            'Breathing - chest examination, O2',
            'Circulation - control bleeding, IV access',
            'Disability - neurological assessment',
            'Exposure - full examination, prevent hypothermia',
            'Team leader to coordinate care',
            'Activate major trauma team',
            'CT trauma series if stable',
            'Damage control surgery if unstable'
        ],
        drugs: ['Tranexamic acid 1g IV if bleeding', 'Blood products as per massive transfusion protocol'],
        ukGuideline: 'NICE NG39',
        criticalActions: ['Stop catastrophic bleeding', 'Prevent hypothermia', 'Rapid decision making']
    },
    'anaphylaxis': {
        name: 'Anaphylaxis Management',
        category: 'respiratory',
        urgency: 'emergency',
        steps: [
            'Remove/avoid trigger if possible',
            'Call for help immediately',
            'Give Adrenaline 500mcg IM (0.5ml 1:1000)',
            'Lie patient flat with legs raised',
            'High-flow oxygen (15L via non-rebreather)',
            'Establish IV access',
            'Give IV fluids if hypotensive',
            'Repeat Adrenaline after 5 minutes if no improvement',
            'Give Chlorphenamine 10mg IV/IM',
            'Give Hydrocortisone 200mg IV/IM'
        ],
        drugs: ['Adrenaline 500mcg IM (repeat if needed)', 'Chlorphenamine 10mg IV/IM', 'Hydrocortisone 200mg IV/IM'],
        ukGuideline: 'Resuscitation Council UK 2021',
        criticalActions: ['Early Adrenaline', 'Airway management', 'Fluid resuscitation']
    },
    'dka-protocol': {
        name: 'DKA Management',
        category: 'metabolic',
        urgency: 'emergency',
        steps: [
            'Confirm diagnosis: glucose >11mmol/L, ketones >3mmol/L, pH <7.3',
            'Start IV fluids: 0.9% saline 1L over 1 hour',
            'Start fixed-rate insulin infusion: 0.1 units/kg/hr',
            'Replace potassium as guided by levels',
            'Monitor blood glucose, ketones, pH hourly',
            'When glucose <14mmol/L, add 10% dextrose',
            'Continue until ketones <0.6mmol/L and pH >7.3',
            'Identify and treat precipitating cause',
            'Convert to subcutaneous insulin when stable'
        ],
        drugs: ['0.9% saline', 'Insulin (Actrapid) 0.1 units/kg/hr', 'Potassium replacement'],
        ukGuideline: 'Joint British Diabetes Societies 2013',
        criticalActions: ['Fluid replacement', 'Insulin therapy', 'Potassium monitoring', 'Identify precipitant']
    },
    'hhs-protocol': {
        name: 'HHS Management',
        category: 'metabolic',
        urgency: 'emergency',
        steps: [
            'Confirm diagnosis: glucose >30mmol/L, osmolality >320mOsm/kg',
            'Calculate fluid deficit (usually 8-12L)',
            'Start 0.9% saline 15-20ml/kg over first hour',
            'Continue fluid replacement over 24-48 hours',
            'Start insulin only when glucose stops falling with fluids',
            'Insulin rate: 0.05 units/kg/hr (half DKA rate)',
            'Replace potassium carefully',
            'Monitor for cerebral oedema',
            'Anticoagulation (LMWH) unless contraindicated'
        ],
        drugs: ['0.9% saline (large volumes)', 'Insulin (lower rate than DKA)', 'LMWH prophylaxis'],
        ukGuideline: 'Joint British Diabetes Societies 2012',
        criticalActions: ['Careful fluid replacement', 'Lower insulin doses', 'Thromboprophylaxis']
    },
    'acute-asthma': {
        name: 'Acute Asthma Management',
        category: 'respiratory',
        urgency: 'emergency',
        steps: [
            'Assess severity: mild, moderate, severe, life-threatening',
            'Give high-flow oxygen (aim SpO2 94-98%)',
            'Salbutamol 5mg nebulized with oxygen',
            'Prednisolone 40-50mg PO or Hydrocortisone 100mg IV',
            'If severe: Ipratropium 500mcg nebulized',
            'If life-threatening: Magnesium sulphate 2g IV over 20min',
            'Consider aminophylline if not responding',
            'Monitor peak flow, ABG if severe',
            'Escalate to ITU if deteriorating'
        ],
        drugs: ['Salbutamol 5mg nebulized', 'Prednisolone 40-50mg PO', 'Ipratropium 500mcg', 'Magnesium sulphate 2g IV'],
        ukGuideline: 'BTS/SIGN 2019',
        criticalActions: ['Early steroids', 'High-flow oxygen', 'Consider magnesium', 'Monitor for deterioration']
    },
    'stroke-protocol': {
        name: 'Acute Stroke Protocol',
        category: 'neurological',
        urgency: 'emergency',
        steps: [
            'FAST assessment: Face, Arms, Speech, Time',
            'Check blood glucose immediately',
            'CT head within 1 hour of arrival',
            'Consider thrombolysis if <4.5 hours onset',
            'Aspirin 300mg PO if haemorrhage excluded',
            'Admit to stroke unit',
            'Swallow assessment before oral intake',
            'Monitor for complications',
            'Early mobilization',
            'Consider thrombectomy if large vessel occlusion'
        ],
        drugs: ['Alteplase (if thrombolysis candidate)', 'Aspirin 300mg PO (after excluding bleed)'],
        ukGuideline: 'NICE NG128',
        criticalActions: ['Time-critical imaging', 'Thrombolysis assessment', 'Stroke unit admission']
    },
    'status-epilepticus': {
        name: 'Status Epilepticus',
        category: 'neurological',
        urgency: 'emergency',
        steps: [
            'Secure airway, give oxygen',
            'Check blood glucose, correct if low',
            'Lorazepam 4mg IV (or Diazepam 10mg IV)',
            'If continues >5min: repeat benzodiazepine',
            'If continues >25min: Phenytoin 20mg/kg IV',
            'If continues >45min: General anaesthesia',
            'Monitor ECG, BP, temperature',
            'Investigate underlying cause',
            'Consider thiamine if alcohol history'
        ],
        drugs: ['Lorazepam 4mg IV', 'Phenytoin 20mg/kg IV', 'General anaesthetic agents'],
        ukGuideline: 'NICE CG137',
        criticalActions: ['Early benzodiazepines', 'Airway protection', 'Escalate quickly if not responding']
    },
    'gi-bleeding': {
        name: 'Upper GI Bleeding',
        category: 'gastrointestinal',
        urgency: 'emergency',
        steps: [
            'Assess haemodynamic stability',
            'Two large-bore IV cannulae',
            'Cross-match 4-6 units blood',
            'PPI infusion: Omeprazole 80mg IV then 8mg/hr',
            'Rockall score calculation',
            'Emergency endoscopy if unstable',
            'Transfuse if Hb <70g/L (or <100g/L if IHD)',
            'Consider Terlipressin if variceal bleeding',
            'Surgery if endoscopy fails',
            'ICU if shocked'
        ],
        drugs: ['Omeprazole 80mg IV then 8mg/hr', 'Terlipressin 2mg IV (if varices)', 'Blood products'],
        ukGuideline: 'NICE CG141',
        criticalActions: ['Rapid resuscitation', 'Early endoscopy', 'Blood transfusion threshold']
    },
    'neutropenic-sepsis': {
        name: 'Neutropenic Sepsis',
        category: 'oncology',
        urgency: 'emergency',
        steps: [
            'Recognize risk: neutrophils <1.0 x10⁹/L + temp >38°C',
            'Take cultures before antibiotics',
            'Start Piperacillin-tazobactam 4.5g IV TDS immediately',
            'If penicillin allergy: Meropenem + Vancomycin',
            'Daily FBC, U&E, LFT, CRP',
            'If fever persists >48hr: add antifungal',
            'G-CSF if prolonged neutropenia expected',
            'Isolation precautions',
            'Avoid live vaccines/fresh fruit'
        ],
        drugs: ['Piperacillin-tazobactam 4.5g IV TDS', 'Alternative: Meropenem + Vancomycin'],
        ukGuideline: 'NICE CG151',
        criticalActions: ['Immediate antibiotics', 'Source identification', 'Daily monitoring']
    }
};