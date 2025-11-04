/**
 * Constants and Configuration
 * Centralized configuration values for the application
 */

// Application Info
export const APP_NAME = 'MLA Quiz PWA';
export const APP_VERSION = '1.0.0';

// Storage Keys
export const STORAGE_KEYS = {
    APP_STATE: 'appState',
    DARK_MODE: 'darkMode',
    FONT_SIZE: 'fontSize',
    VIBRATION: 'vibrationEnabled',
    UPLOADED_QUIZZES: 'uploadedQuizzes',
    QUIZ_PROGRESS: 'quizProgress',
    RECENT_TOOLS: 'medicalToolsRecent',
    TOOL_NOTES: 'medicalToolsNotes',
    LAST_QUIZ: 'lastQuiz',
    SESSION_STATS: 'sessionStats',
    ORIENTATION_LOCK: 'orientationLock'
};

// IndexedDB Configuration
export const DB_CONFIG = {
    NAME: 'MLAQuizDB',
    VERSION: 1,
    STORES: {
        QUIZ_IMAGES: 'quizImages'
    }
};

// Quiz Configuration
export const QUIZ_CONFIG = {
    DEFAULT_LENGTH: 20,
    MIN_LENGTH: 5,
    MAX_LENGTH: 100,
    TIME_WARNING_THRESHOLD: 300, // 5 minutes in seconds
    AUTO_SAVE_INTERVAL: 30000 // 30 seconds
};

// UI Configuration
export const UI_CONFIG = {
    FONT_SIZES: {
        SMALL: 'small',
        MEDIUM: 'medium',
        LARGE: 'large'
    },
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 300,
    ANIMATION_DURATION: 300,
    TOAST_DURATION: 3000
};

// Vibration Patterns
export const VIBRATION_PATTERNS = {
    CLICK: 10,
    SUCCESS: [50, 50, 50],
    ERROR: [100, 50, 100],
    WARNING: [50, 30, 50, 30, 50]
};

// API Endpoints
export const API_ENDPOINTS = {
    QUIZZES: '/api/quizzes',
    ANATOMY_DATA: '/static/anatomy/anatomy_data.json'
};

// Anatomy Configuration
export const ANATOMY_CONFIG = {
    LAYERS: ['bones', 'muscles'],
    VIEWS: ['front', 'back'],
    DEFAULT_LAYER: 'bones',
    DEFAULT_VIEW: 'front',
    SEARCH_DEBOUNCE: 250
};

// Calculator Types
export const CALCULATOR_TYPES = {
    BMI: 'bmi',
    BSA: 'bsa',
    GCS: 'gcs',
    APGAR: 'apgar',
    CHADSVASC: 'chadsvasc',
    HASBLED: 'hasbled',
    WELLS_DVT: 'wellsDvt',
    WELLS_PE: 'wellsPe',
    QRISK3: 'qrisk3'
};

// Medical Tool Categories
export const TOOL_CATEGORIES = {
    EMERGENCY: 'emergency',
    CARDIOLOGY: 'cardiology',
    NEUROLOGY: 'neurology',
    RESPIRATORY: 'respiratory',
    NEPHROLOGY: 'nephrology',
    ENDOCRINE: 'endocrine',
    REFERENCE: 'reference',
    ANATOMY: 'anatomy'
};

// Event Names
export const EVENTS = {
    // App Events
    APP_READY: 'app:ready',
    
    // Quiz Events
    QUIZ_LOADED: 'quiz:loaded',
    QUIZ_STARTED: 'quiz:started',
    QUIZ_COMPLETED: 'quiz:completed',
    QUIZ_RESUME_REQUESTED: 'quiz:resumeRequested',
    QUESTION_ANSWERED: 'question:answered',
    QUESTION_FLAGGED: 'question:flagged',
    
    // UI Events
    THEME_CHANGED: 'theme:changed',
    FONT_SIZE_CHANGED: 'fontsize:changed',
    ORIENTATION_CHANGED: 'orientation:changed',
    UI_SWITCH_TOOL: 'ui:switchTool',
    
    // Anatomy Events
    ANATOMY_LOADED: 'anatomy:loaded',
    ANATOMY_LAYER_CHANGED: 'anatomy:layerChanged',
    ANATOMY_VIEW_CHANGED: 'anatomy:viewChanged',
    ANATOMY_STRUCTURE_CLICKED: 'anatomy:structureClicked',
    
    // Calculator Events
    CALCULATOR_OPENED: 'calculator:opened',
    CALCULATOR_CALCULATED: 'calculator:calculated',
    
    // Storage Events
    DATA_SAVED: 'data:saved',
    DATA_LOADED: 'data:loaded',
    DATA_CLEARED: 'data:cleared',
    
    // Error Events
    ERROR_OCCURRED: 'error:occurred'
};

// Error Messages
export const ERROR_MESSAGES = {
    QUIZ_LOAD_FAILED: 'Failed to load quiz',
    QUIZ_NOT_FOUND: 'Quiz not found',
    ANATOMY_LOAD_FAILED: 'Failed to load anatomy data',
    STORAGE_ERROR: 'Storage operation failed',
    NETWORK_ERROR: 'Network error occurred',
    INVALID_INPUT: 'Invalid input provided'
};

// Success Messages
export const SUCCESS_MESSAGES = {
    QUIZ_SAVED: 'Quiz progress saved',
    QUIZ_COMPLETED: 'Quiz completed successfully',
    DATA_CLEARED: 'Data cleared successfully',
    SETTINGS_SAVED: 'Settings saved'
};

// Regex Patterns
export const PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    NUMBER: /^-?\d*\.?\d+$/,
    INTEGER: /^-?\d+$/,
    POSITIVE_NUMBER: /^\d*\.?\d+$/,
    POSITIVE_INTEGER: /^\d+$/
};

// Color Scheme
export const COLORS = {
    PRIMARY: '#1976d2',
    SECONDARY: '#424242',
    SUCCESS: '#4caf50',
    WARNING: '#ff9800',
    ERROR: '#f44336',
    INFO: '#2196f3'
};

// Breakpoints (for responsive design)
export const BREAKPOINTS = {
    MOBILE: 480,
    TABLET: 768,
    DESKTOP: 1024,
    LARGE: 1440
};

// Default Settings
export const DEFAULT_SETTINGS = {
    darkMode: false,
    fontSize: 'medium',
    vibrationEnabled: true,
    autoSave: true,
    showHints: true
};

// Feature Flags
export const FEATURES = {
    ENABLE_ANALYTICS: false,
    ENABLE_OFFLINE_MODE: true,
    ENABLE_PWA_INSTALL: true,
    ENABLE_ORIENTATION_LOCK: true,
    ENABLE_HAPTIC_FEEDBACK: true
};

// Clinical Triads Database
export const CLINICAL_TRIADS = {
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
    'meningism-triad': {
        name: 'Meningism Triad',
        category: 'neurologic',
        components: ['Neck stiffness', 'Photophobia', 'Headache'],
        condition: 'Meningeal Irritation',
        mechanism: 'Inflammation or irritation of meninges',
        urgency: 'emergency',
        clinicalSignificance: 'Suggests meningitis or subarachnoid haemorrhage',
        ukGuidelines: 'Immediate antibiotics if bacterial meningitis suspected (NICE CG102)'
    }
};

// Emergency Protocols Database
export const EMERGENCY_PROTOCOLS = {
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
            'Give Adrenaline 1mg IV/IO after 2nd shock',
            'Give Amiodarone 300mg IV/IO after 3rd shock',
            'Continue cycles until ROSC or exhaustion'
        ],
        drugs: ['Adrenaline 1mg IV/IO every 3-5 minutes', 'Amiodarone 300mg IV/IO (then 150mg if needed)'],
        ukGuideline: 'Resuscitation Council UK 2021',
        criticalActions: ['High-quality CPR', 'Minimise interruptions', 'Consider reversible causes (4Hs 4Ts)']
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
    }
};

// Interpretation Tools
export const INTERPRETATION_TOOLS = {
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
            'AF: Irregularly irregular rhythm, absent P waves',
            'Heart block: Prolonged PR, dropped beats, dissociated P/QRS',
            'Bundle branch block: QRS >120ms with specific morphology'
        ]
    },
    'abg-interpretation': {
        name: 'ABG Interpretation',
        category: 'respiratory',
        type: 'systematic',
        steps: [
            'Check oxygenation: PaO2 (normal 10-13 kPa)',
            'Check pH: Acidosis (<7.35) or alkalosis (>7.45)?',
            'Check CO2: Respiratory component (normal 4.5-6.0 kPa)',
            'Check HCO3: Metabolic component (normal 22-26 mmol/L)',
            'Determine primary disturbance',
            'Check for compensation',
            'Calculate anion gap if metabolic acidosis',
            'Consider clinical context'
        ],
        normalValues: {
            'pH': '7.35-7.45',
            'PaO2': '10-13 kPa (75-100 mmHg)',
            'PaCO2': '4.5-6.0 kPa (35-45 mmHg)',
            'HCO3': '22-26 mmol/L',
            'Base Excess': '-2 to +2'
        },
        commonPatterns: [
            'Respiratory acidosis: ↓pH, ↑CO2 (COPD, hypoventilation)',
            'Respiratory alkalosis: ↑pH, ↓CO2 (hyperventilation, PE)',
            'Metabolic acidosis: ↓pH, ↓HCO3 (DKA, sepsis, renal failure)',
            'Metabolic alkalosis: ↑pH, ↑HCO3 (vomiting, diuretics)'
        ]
    }
};

export default {
    APP_NAME,
    APP_VERSION,
    STORAGE_KEYS,
    DB_CONFIG,
    QUIZ_CONFIG,
    UI_CONFIG,
    VIBRATION_PATTERNS,
    API_ENDPOINTS,
    ANATOMY_CONFIG,
    CALCULATOR_TYPES,
    TOOL_CATEGORIES,
    EVENTS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    PATTERNS,
    COLORS,
    BREAKPOINTS,
    DEFAULT_SETTINGS,
    FEATURES,
    CLINICAL_TRIADS,
    EMERGENCY_PROTOCOLS,
    INTERPRETATION_TOOLS
};
