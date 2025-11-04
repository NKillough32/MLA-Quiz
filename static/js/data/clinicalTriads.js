/**
 * Clinical Triads Database
 * Extracted from V1 for V2 independence
 * Contains classical medical triads for pattern recognition
 */

export const clinicalTriads = {
    // Cardiovascular Triads
    'becks-triad': {
        name: "Beck's Triad",
        category: 'cardiovascular',
        components: ['Elevated JVP', 'Muffled heart sounds', 'Hypotension'],
        condition: 'Cardiac Tamponade',
        mechanism: 'Pericardial compression limiting cardiac filling',
        urgency: 'emergency',
        clinicalSignificance: 'Diagnostic for cardiac tamponade - requires immediate pericardiocentesis',
        ukGuidelines: 'Call cardiology immediately. Consider emergency pericardiocentesis if haemodynamically unstable'
    },
    'virchows-triad': {
        name: "Virchow's Triad",
        category: 'cardiovascular',
        components: ['Hypercoagulability', 'Vascular wall injury', 'Venous stasis'],
        condition: 'Venous Thromboembolism',
        mechanism: 'Three factors predisposing to thrombosis',
        urgency: 'high',
        clinicalSignificance: 'Risk factors for VTE - guides anticoagulation decisions',
        ukGuidelines: 'Use in conjunction with Wells score for VTE risk assessment (NICE CG144)'
    },
    'cushings-triad': {
        name: "Cushing's Triad",
        category: 'neurologic',
        components: ['Hypertension', 'Bradycardia', 'Irregular respirations'],
        condition: 'Raised Intracranial Pressure',
        mechanism: 'Late signs of critically raised ICP',
        urgency: 'emergency',
        clinicalSignificance: 'Late and ominous sign of brain herniation',
        ukGuidelines: 'Emergency neurosurgical referral. Consider mannitol/hypertonic saline'
    },
    'charcots-triad': {
        name: "Charcot's Triad",
        category: 'emergency',
        components: ['Fever', 'Jaundice', 'Right upper quadrant pain'],
        condition: 'Ascending Cholangitis',
        mechanism: 'Bile duct obstruction with infection',
        urgency: 'emergency',
        clinicalSignificance: 'Biliary sepsis requiring urgent decompression',
        ukGuidelines: 'IV antibiotics + urgent ERCP within 24-48h (BSG guidelines)'
    },
    'reynolds-pentad': {
        name: "Reynolds' Pentad",
        category: 'emergency',
        components: ['Charcot\'s triad', 'Mental confusion', 'Shock'],
        condition: 'Suppurative Cholangitis',
        mechanism: 'Severe ascending cholangitis with sepsis',
        urgency: 'emergency',
        clinicalSignificance: 'More severe form of cholangitis with worse prognosis',
        ukGuidelines: 'Immediate IV antibiotics, ITU consideration, urgent biliary decompression'
    },
    'whipples-triad': {
        name: "Whipple's Triad",
        category: 'endocrine',
        components: ['Hypoglycaemic symptoms', 'Low glucose (<2.8mmol/L)', 'Symptom relief with glucose'],
        condition: 'Hypoglycaemia',
        mechanism: 'Confirms true hypoglycaemia vs pseudo-hypoglycaemia',
        urgency: 'moderate',
        clinicalSignificance: 'Establishes genuine hypoglycaemia requiring investigation',
        ukGuidelines: 'Investigate underlying cause if recurrent (insulinoma, drugs, etc.)'
    },
    'kartageners-syndrome': {
        name: "Kartagener's Syndrome",
        category: 'respiratory',
        components: ['Situs inversus', 'Chronic sinusitis', 'Bronchiectasis'],
        condition: 'Primary Ciliary Dyskinesia',
        mechanism: 'Genetic disorder affecting ciliary function',
        urgency: 'low',
        clinicalSignificance: 'Rare genetic condition requiring specialist management',
        ukGuidelines: 'Refer to specialist respiratory centre for PCD testing'
    },
    'millers-fisher': {
        name: "Miller Fisher Syndrome",
        category: 'neurologic',
        components: ['Ophthalmoplegia', 'Ataxia', 'Areflexia'],
        condition: 'Miller Fisher Syndrome (GBS variant)',
        mechanism: 'Autoimmune peripheral neuropathy variant',
        urgency: 'high',
        clinicalSignificance: 'Variant of Guillain-Barré syndrome',
        ukGuidelines: 'Neurology referral, consider IVIG if severe (NICE CG188)'
    },
    'meningism-triad': {
        name: 'Meningism Triad',
        category: 'neurologic',
        components: ['Neck stiffness', 'Photophobia', 'Headache'],
        condition: 'Meningeal Irritation',
        mechanism: 'Inflammation or irritation of meninges',
        urgency: 'emergency',
        clinicalSignificance: 'Suggests meningitis or subarachnoid haemorrhage',
        ukGuidelines: 'Immediate antibiotics if bacterial meningitis suspected (NICE CG102)'
    },
    'malaria-triad': {
        name: 'Malaria Triad',
        category: 'infectious',
        components: ['Fever', 'Rigors', 'Sweating'],
        condition: 'Malaria',
        mechanism: 'Cyclical pattern related to parasite lifecycle',
        urgency: 'emergency',
        clinicalSignificance: 'Classic pattern but not always present',
        ukGuidelines: 'Urgent thick/thin films if travel history positive (PHE guidelines)'
    },
    'felty-syndrome': {
        name: "Felty's Syndrome",
        category: 'rheumatologic',
        components: ['Rheumatoid arthritis', 'Neutropenia', 'Splenomegaly'],
        condition: 'Felty\'s Syndrome',
        mechanism: 'Severe RA with extra-articular manifestations',
        urgency: 'moderate',
        clinicalSignificance: 'Increased infection risk due to neutropenia',
        ukGuidelines: 'Rheumatology referral, monitor for infections'
    },
    'multiple-endocrine-neoplasia-1': {
        name: 'MEN 1 Syndrome',
        category: 'endocrine',
        components: ['Pituitary adenoma', 'Pancreatic islet tumours', 'Parathyroid hyperplasia'],
        condition: 'Multiple Endocrine Neoplasia Type 1',
        mechanism: 'Genetic syndrome affecting multiple endocrine organs',
        urgency: 'moderate',
        clinicalSignificance: 'Hereditary cancer syndrome requiring screening',
        ukGuidelines: 'Genetic counselling and family screening (NICE guidance)'
    }
};

// Export helper functions
export function searchTriads(query) {
    const results = [];
    const searchTerm = query.toLowerCase();
    
    Object.keys(clinicalTriads).forEach(key => {
        const triad = clinicalTriads[key];
        if (triad.name.toLowerCase().includes(searchTerm) ||
            triad.condition.toLowerCase().includes(searchTerm) ||
            triad.components.some(c => c.toLowerCase().includes(searchTerm))) {
            results.push({ id: key, ...triad });
        }
    });
    
    return results;
}

export function getTriadsByCategory(category) {
    if (category === 'all') {
        return Object.keys(clinicalTriads).map(key => ({ id: key, ...clinicalTriads[key] }));
    }
    
    return Object.keys(clinicalTriads)
        .filter(key => clinicalTriads[key].category === category)
        .map(key => ({ id: key, ...clinicalTriads[key] }));
}

export function getTriadsByUrgency(urgency) {
    return Object.keys(clinicalTriads)
        .filter(key => clinicalTriads[key].urgency === urgency)
        .map(key => ({ id: key, ...clinicalTriads[key] }));
}

export function getAllCategories() {
    const categories = new Set();
    Object.values(clinicalTriads).forEach(triad => {
        categories.add(triad.category);
    });
    return Array.from(categories).sort();
}

export function getEmergencyTriads() {
    return getTriadsByUrgency('emergency');
}
