/**
 * Clinical Examination Guides Database
 * Extracted from V1 for V2 independence
 * Contains systematic examination approaches for major body systems
 */

export const examinationGuides = {
    'cardiovascular': {
        title: 'Cardiovascular Examination',
        category: 'systemic',
        approach: 'General inspection → Hands → Pulse → Blood pressure → Face → Neck → Precordium → Back',
        sections: {
            'general-inspection': {
                name: 'General Inspection',
                technique: 'Observe patient from end of bed before approaching',
                normal: 'Comfortable at rest, appropriate dress, no distress, normal colour',
                abnormal: {
                    'Cyanosis': 'Central (tongue/lips): respiratory/cardiac causes. Peripheral (fingers/toes): poor circulation',
                    'Dyspnea': 'Breathlessness at rest or minimal exertion suggests heart failure',
                    'Cachexia': 'Muscle wasting in advanced heart failure (cardiac cachexia)',
                    'Pallor': 'May indicate anemia contributing to heart failure',
                    'Oedema': 'Bilateral ankle swelling, sacral edema if bed-bound'
                },
                clinicalPearls: 'Always introduce yourself and gain consent. Observe before touching'
            },
            'hands': {
                name: 'Hand Examination',
                technique: 'Inspect both hands, palpate radial pulse, assess capillary refill',
                normal: 'Warm hands, pink nail beds, CRT <2 seconds, regular pulse',
                abnormal: {
                    'Clubbing': 'Loss of angle between nail and nail bed. Causes: IE, congenital heart disease, lung disease',
                    'Splinter hemorrhages': 'Linear hemorrhages under nails - may indicate infective endocarditis',
                    'Janeway lesions': 'Painless palmar/plantar macules in infective endocarditis',
                    'Osler nodes': 'Painful pulp infarcts in fingers/toes - infective endocarditis',
                    'Cool peripheries': 'Poor perfusion, heart failure, shock',
                    'Prolonged CRT': '>2 seconds indicates poor perfusion'
                },
                clinicalPearls: 'Clubbing takes months to develop. Check both hands for symmetry'
            },
            'pulse': {
                name: 'Pulse Assessment',
                technique: 'Radial pulse rate, rhythm, character. Check for radio-radial delay',
                normal: '60-100 bpm, regular rhythm, normal volume and character',
                abnormal: {
                    'Tachycardia': '>100 bpm - fever, anxiety, hyperthyroidism, heart failure, arrhythmia',
                    'Bradycardia': '<60 bpm - athletes, medications (beta-blockers), heart block',
                    'Irregular rhythm': 'AF (irregularly irregular), ectopics, heart block',
                    'Weak pulse': 'Low volume - heart failure, shock, aortic stenosis',
                    'Bounding pulse': 'High volume - aortic regurgitation, hyperthyroidism, fever',
                    'Radio-radial delay': 'Coarctation of aorta, aortic dissection'
                },
                clinicalPearls: 'Palpate for 15 seconds minimum, 60 seconds if irregular. Check both radials simultaneously'
            },
            'blood-pressure': {
                name: 'Blood Pressure',
                technique: 'Appropriate cuff size, patient relaxed, arm at heart level',
                normal: '<140/90 mmHg (or <130/80 mmHg in diabetes/CKD)',
                abnormal: {
                    'Hypertension': 'Stage 1: 140-159/90-99, Stage 2: 160-179/100-109, Stage 3: ≥180/110',
                    'Hypotension': '<90 mmHg systolic - shock, medications, postural hypotension',
                    'Wide pulse pressure': '>60 mmHg - aortic regurgitation, hyperthyroidism',
                    'Narrow pulse pressure': '<30 mmHg - aortic stenosis, cardiac tamponade',
                    'Postural drop': '>20 mmHg fall on standing - dehydration, medications'
                },
                clinicalPearls: 'Repeat if abnormal. Check both arms if suspicious of coarctation/dissection'
            },
            'jvp': {
                name: 'Jugular Venous Pressure',
                technique: 'Patient at 45°, look for internal jugular pulsation, measure height above sternal angle',
                normal: '<3 cm above sternal angle, normal waveform',
                abnormal: {
                    'Elevated JVP': '>3 cm - right heart failure, fluid overload, tricuspid disease',
                    'Giant V waves': 'Tricuspid regurgitation - systolic waves in jugular vein',
                    'Cannon waves': 'Complete heart block - atria contract against closed tricuspid valve',
                    'Hepatojugular reflux': 'Rise in JVP with abdominal pressure - right heart failure',
                    'Absent pulsation': 'SVC obstruction - non-pulsatile, fixed elevation'
                },
                clinicalPearls: 'Distinguish from carotid pulsation - JVP has double waveform, varies with respiration'
            },
            'precordium': {
                name: 'Precordial Examination',
                technique: 'Inspect, palpate (apex, heaves, thrills), percuss cardiac borders, auscultate',
                normal: 'No visible pulsations, apex beat 5th intercostal space mid-clavicular line',
                abnormal: {
                    'Displaced apex': 'Lateral displacement - left ventricular enlargement',
                    'Heaves': 'Right ventricular heave (left sternal border) - pulmonary hypertension, RV enlargement',
                    'Thrills': 'Palpable murmurs - significant valvular disease (grade 4+ murmurs)',
                    'Systolic murmur': 'Aortic stenosis, mitral regurgitation, tricuspid regurgitation',
                    'Diastolic murmur': 'Always pathological - aortic regurgitation, mitral stenosis',
                    'Gallop rhythm': 'S3 (heart failure), S4 (stiff ventricle)'
                },
                clinicalPearls: 'Listen in all areas: aortic, pulmonary, tricuspid, mitral. Listen with diaphragm and bell'
            }
        }
    },
    'respiratory': {
        title: 'Respiratory Examination',
        category: 'systemic',
        approach: 'General inspection → Hands → Face → Neck → Chest inspection → Palpation → Percussion → Auscultation',
        sections: {
            'general-inspection': {
                name: 'General Inspection',
                technique: 'Observe breathing pattern, use of accessory muscles, positioning',
                normal: 'Quiet breathing, 12-20 breaths/min, no accessory muscle use',
                abnormal: {
                    'Tachypnea': '>20 breaths/min - pneumonia, asthma, anxiety, metabolic acidosis',
                    'Bradypnea': '<12 breaths/min - opioids, raised ICP, hypothyroidism',
                    'Accessory muscles': 'SCM, intercostals - respiratory distress',
                    'Tripod position': 'Leaning forward with arms supported - severe respiratory distress',
                    'Pursed lip breathing': 'COPD - creates back-pressure to prevent airway collapse'
                },
                clinicalPearls: 'Count respiratory rate when patient unaware. Look for pattern and effort'
            },
            'hands': {
                name: 'Hand Examination',
                technique: 'Inspect for clubbing, cyanosis, nicotine staining, assess asterixis',
                normal: 'Pink nail beds, no clubbing, warm hands',
                abnormal: {
                    'Clubbing': 'Lung cancer, bronchiectasis, lung abscess, IPF (not COPD/asthma)',
                    'Cyanosis': 'Central cyanosis indicates hypoxemia, peripheral indicates poor circulation',
                    'Nicotine staining': 'Yellow fingers - smoking history',
                    'Asterixis': 'CO2 retention - ask patient to hold hands up, look for flapping tremor',
                    'Wasting': 'Small muscle wasting in hands - lung cancer cachexia'
                },
                clinicalPearls: 'Clubbing rare in COPD unless complications. Asterixis also seen in liver failure'
            },
            'face-neck': {
                name: 'Face and Neck',
                technique: 'Inspect lips, eyes, lymph nodes, tracheal position',
                normal: 'Pink lips, clear conjunctiva, central trachea, no lymphadenopathy',
                abnormal: {
                    'Central cyanosis': 'Blue lips/tongue - hypoxemia (<85% saturation)',
                    'Pallor': 'Anemia - may contribute to dyspnea',
                    'Horner syndrome': 'Ptosis, miosis, anhidrosis - Pancoast tumor',
                    'Lymphadenopathy': 'Supraclavicular nodes - lung cancer metastases',
                    'Tracheal deviation': 'Away from tension pneumothorax, towards collapse/fibrosis'
                },
                clinicalPearls: 'Central cyanosis only visible when Hb <5g/dL is desaturated'
            },
            'chest-inspection': {
                name: 'Chest Inspection',
                technique: 'Observe shape, symmetry, movement, scars',
                normal: 'Symmetrical expansion, no deformity, 1:2 AP to lateral ratio',
                abnormal: {
                    'Barrel chest': 'Increased AP diameter - COPD with hyperinflation',
                    'Pectus carinatum': 'Pigeon chest - congenital, may restrict lung function',
                    'Pectus excavatum': 'Funnel chest - usually cosmetic only',
                    'Kyphoscoliosis': 'Spinal deformity - restrictive lung disease',
                    'Asymmetrical expansion': 'Pneumothorax, pleural effusion, consolidation'
                },
                clinicalPearls: 'Look for surgical scars (thoracotomy, lobectomy). Note chest wall movement'
            },
            'palpation': {
                name: 'Palpation',
                technique: 'Chest expansion, tactile vocal fremitus, apex beat',
                normal: 'Symmetrical expansion >5cm, equal tactile fremitus',
                abnormal: {
                    'Reduced expansion': 'Pain (pleurisy), pleural effusion, pneumothorax',
                    'Increased tactile fremitus': 'Consolidation - solid tissue transmits vibrations better',
                    'Reduced tactile fremitus': 'Pleural effusion, pneumothorax - fluid/air dampens vibrations',
                    'Pleural friction rub': 'Grating sensation - inflamed pleura rubbing together',
                    'Subcutaneous emphysema': 'Crackling under skin - pneumothorax with air leak'
                },
                clinicalPearls: 'Use "99" or "boy oh boy" for vocal fremitus. Compare symmetrical areas'
            },
            'percussion': {
                name: 'Percussion',
                technique: 'Percuss systematically comparing both sides, note resonance',
                normal: 'Resonant throughout lung fields',
                abnormal: {
                    'Dull percussion': 'Consolidation, pleural effusion - fluid/solid tissue',
                    'Stony dull': 'Large pleural effusion - completely dull note',
                    'Hyperresonant': 'Pneumothorax, emphysema - increased air content',
                    'Reduced percussion': 'Partial consolidation, small effusion',
                    'Shifting dullness': 'Free pleural fluid - changes with position'
                },
                clinicalPearls: 'Percuss from resonant to dull areas. Note upper level of effusions'
            },
            'auscultation': {
                name: 'Auscultation',
                technique: 'Systematic listening with diaphragm, compare both sides',
                normal: 'Vesicular breath sounds, no added sounds',
                abnormal: {
                    'Wheeze': 'Expiratory - asthma, COPD. Inspiratory stridor - upper airway obstruction',
                    'Crackles': 'Fine (pulmonary edema, fibrosis), coarse (pneumonia, bronchiectasis)',
                    'Pleural friction rub': 'Grating sound - pleural inflammation',
                    'Bronchial breathing': 'High-pitched, equal inspiration/expiration - consolidation',
                    'Reduced air entry': 'Pleural effusion, pneumothorax, severe consolidation',
                    'Absent breath sounds': 'Complete obstruction, massive effusion, pneumothorax'
                },
                clinicalPearls: 'Listen during full inspiration and expiration. Ask patient to breathe deeply through mouth'
            }
        }
    },
    'abdominal': {
        title: 'Abdominal Examination',
        category: 'systemic',
        approach: 'Look → Feel → Percuss → Listen (different order from other systems)',
        sections: {
            'inspection': {
                name: 'Inspection',
                technique: 'Patient supine, fully exposed abdomen, observe from different angles',
                normal: 'Flat or gently rounded, no visible masses, symmetrical',
                abnormal: {
                    'Distension': 'Generalized - ascites, obstruction, pregnancy. Localized - masses, organomegaly',
                    'Scars': 'Previous surgery - note location and implications',
                    'Striae': 'Stretch marks - pregnancy, weight gain, Cushing syndrome',
                    'Caput medusae': 'Dilated umbilical veins - portal hypertension',
                    'Visible peristalsis': 'Bowel obstruction - waves of contraction',
                    'Hernias': 'Inguinal, umbilical, incisional - may be more visible when coughing'
                },
                clinicalPearls: 'Look from foot of bed and from side. Ask patient to cough to reveal hernias'
            },
            'palpation-light': {
                name: 'Light Palpation',
                technique: 'Start away from pain, use flat of hand, superficial pressure',
                normal: 'Soft, non-tender, no masses',
                abnormal: {
                    'Tenderness': 'Localized - inflammation, infection. Generalized - peritonitis',
                    'Guarding': 'Voluntary muscle tension due to pain',
                    'Rigidity': 'Involuntary muscle spasm - peritoneal irritation',
                    'Masses': 'Note size, consistency, mobility, pulsatility',
                    'Hepatomegaly': 'Liver edge palpable below costal margin',
                    'Splenomegaly': 'Spleen tip palpable (enlarges towards RIF)'
                },
                clinicalPearls: 'Watch patient\'s face for signs of discomfort. Start gently'
            },
            'palpation-deep': {
                name: 'Deep Palpation',
                technique: 'Deeper pressure to feel for masses and organomegaly',
                normal: 'No masses, organs not palpable (except sometimes liver edge)',
                abnormal: {
                    'Hepatomegaly': 'Smooth edge (fatty liver), irregular (cirrhosis, metastases)',
                    'Splenomegaly': 'Moves with respiration, cannot get above it',
                    'Kidney masses': 'Ballotable, bimanual palpation in flanks',
                    'Aortic aneurysm': 'Pulsatile mass above umbilicus, expansile pulsation',
                    'Bladder': 'Suprapubic mass if full - dull to percussion',
                    'Rebound tenderness': 'Pain worse on releasing pressure - peritoneal irritation'
                },
                clinicalPearls: 'Feel for liver and spleen during inspiration. Use bimanual palpation for kidneys'
            },
            'percussion': {
                name: 'Percussion',
                technique: 'Percuss liver span, spleen, kidneys, bladder, test for ascites',
                normal: 'Liver span 12-15cm, spleen not percussible, no shifting dullness',
                abnormal: {
                    'Hepatomegaly': 'Increased liver span >15cm',
                    'Splenomegaly': 'Dullness in left hypochondrium',
                    'Ascites': 'Shifting dullness, fluid thrill (if large volume)',
                    'Bladder distension': 'Suprapubic dullness - urinary retention',
                    'Kidney enlargement': 'Flank dullness - polycystic kidneys, hydronephrosis'
                },
                clinicalPearls: 'Normal liver dullness from 5th intercostal space to costal margin'
            },
            'auscultation': {
                name: 'Auscultation',
                technique: 'Listen for bowel sounds, bruits, listen for 2 minutes if absent',
                normal: 'Bowel sounds every 5-10 seconds, no bruits',
                abnormal: {
                    'Absent bowel sounds': 'Paralytic ileus, peritonitis (listen for 2 minutes)',
                    'Hyperactive sounds': 'Bowel obstruction - high-pitched, frequent',
                    'Aortic bruit': 'Abdominal aortic aneurysm, atherosclerosis',
                    'Renal bruits': 'Renal artery stenosis - listen in flanks',
                    'Hepatic bruits': 'Hepatocellular carcinoma, alcoholic hepatitis',
                    'Venous hum': 'Portal hypertension - continuous sound at umbilicus'
                },
                clinicalPearls: 'Auscultate before deep palpation to avoid altering bowel sounds'
            }
        }
    },
    'neurological': {
        title: 'Neurological Examination',
        category: 'systemic',
        approach: 'Mental state → Cranial nerves → Motor → Sensory → Reflexes → Coordination → Gait',
        sections: {
            'mental-state': {
                name: 'Mental State',
                technique: 'Assess consciousness level, orientation, memory, attention',
                normal: 'Alert, oriented to time/place/person, normal cognition',
                abnormal: {
                    'Reduced GCS': '<15 - see GCS calculator for detailed assessment',
                    'Confusion': 'Disorientation, impaired attention - delirium, dementia',
                    'Memory loss': 'Short-term (recent events), long-term (remote events)',
                    'Dysphasia': 'Expressive (Broca), receptive (Wernicke), mixed',
                    'Neglect': 'Inattention to one side - usually right brain lesions',
                    'Apraxia': 'Cannot perform learned movements despite intact motor function'
                },
                clinicalPearls: 'Use MMSE or MoCA for detailed cognitive assessment. Note speech pattern'
            },
            'cranial-nerves': {
                name: 'Cranial Nerves',
                technique: 'Systematic assessment CN I-XII',
                normal: 'All cranial nerves intact and functioning normally',
                abnormal: {
                    'CN II (Optic)': 'Visual field defects, papilledema, optic atrophy',
                    'CN III (Oculomotor)': 'Ptosis, dilated pupil, eye movement problems',
                    'CN VII (Facial)': 'Facial weakness - upper motor neuron spares forehead',
                    'CN VIII (Acoustic)': 'Hearing loss, vertigo, tinnitus',
                    'CN IX/X': 'Dysphagia, dysphonia, absent gag reflex',
                    'CN XII (Hypoglossal)': 'Tongue deviation towards lesion side'
                },
                clinicalPearls: 'UMN facial weakness spares forehead, LMN affects all facial muscles'
            },
            'motor': {
                name: 'Motor Examination',
                technique: 'Inspect, tone, power (MRC scale), reflexes',
                normal: 'Normal muscle bulk, normal tone, power 5/5, reflexes 2+',
                abnormal: {
                    'Muscle wasting': 'LMN lesions, disuse atrophy, myopathy',
                    'Fasciculations': 'Visible muscle twitching - motor neuron disease',
                    'Increased tone': 'Spasticity (UMN), rigidity (Parkinson), clonus',
                    'Reduced tone': 'LMN lesions, cerebellar lesions, acute stroke',
                    'Weakness patterns': 'Pyramidal (extensors>flexors upper limb), proximal (myopathy)',
                    'Hyperreflexia': 'UMN lesions - brisk reflexes, upgoing plantars'
                },
                clinicalPearls: 'MRC scale: 0=no movement, 1=flicker, 2=movement without gravity, 3=against gravity, 4=against resistance, 5=normal'
            },
            'sensory': {
                name: 'Sensory Examination',
                technique: 'Test light touch, pain, vibration, proprioception',
                normal: 'Intact sensation to all modalities',
                abnormal: {
                    'Glove/stocking': 'Peripheral neuropathy - diabetes, alcohol, B12 deficiency',
                    'Dermatomal loss': 'Nerve root lesions - corresponds to specific dermatomes',
                    'Hemianesthesia': 'Stroke, thalamic lesions - one whole side affected',
                    'Suspended sensory loss': 'Syringomyelia - "cape" distribution',
                    'Vibration loss': 'Posterior column disease - B12, tabes dorsalis',
                    'Dissociated loss': 'Loss of pain/temperature with preserved touch'
                },
                clinicalPearls: 'Test from abnormal to normal areas. Use cotton wool and neurological pin'
            },
            'coordination': {
                name: 'Coordination',
                technique: 'Finger-nose test, heel-shin test, rapid alternating movements',
                normal: 'Smooth, accurate movements, no tremor',
                abnormal: {
                    'Intention tremor': 'Worse on movement - cerebellar lesions',
                    'Dysmetria': 'Past-pointing - cerebellar dysfunction',
                    'Dysdiadochokinesis': 'Impaired rapid alternating movements - cerebellum',
                    'Ataxia': 'Unsteady, uncoordinated movements',
                    'Resting tremor': 'Present at rest - Parkinson\'s disease',
                    'Action tremor': 'Essential tremor, anxiety, hyperthyroidism'
                },
                clinicalPearls: 'Cerebellar signs: DANISH - Dysdiadochokinesis, Ataxia, Nystagmus, Intention tremor, Speech, Hypotonia'
            },
            'gait': {
                name: 'Gait Assessment',
                technique: 'Observe normal walking, heel-toe walking, Romberg test',
                normal: 'Steady, coordinated gait, negative Romberg',
                abnormal: {
                    'Hemiplegic gait': 'Leg swings in arc - stroke, circumduction',
                    'Parkinsonian gait': 'Shuffling, reduced arm swing, festination',
                    'Ataxic gait': 'Wide-based, unsteady - cerebellar or sensory ataxia',
                    'High-stepping': 'Foot drop - common peroneal nerve palsy',
                    'Trendelenburg': 'Hip drops on weight-bearing - superior gluteal nerve',
                    'Positive Romberg': 'Falls when eyes closed - sensory ataxia'
                },
                clinicalPearls: 'Romberg tests proprioception - positive if worse with eyes closed'
            }
        }
    },
    'mental-state': {
        title: 'Mental State Examination',
        category: 'psychiatric',
        approach: 'Appearance → Behaviour → Speech → Mood → Thought → Perception → Cognition → Insight',
        sections: {
            'appearance': {
                name: 'Appearance and Behaviour',
                technique: 'Observe dress, hygiene, posture, facial expression, eye contact',
                normal: 'Appropriately dressed, good hygiene, normal posture, appropriate eye contact',
                abnormal: {
                    'Self-neglect': 'Poor hygiene, inappropriate dress - depression, dementia, schizophrenia',
                    'Agitation': 'Restlessness, pacing, fidgeting - anxiety, mania, drug withdrawal',
                    'Psychomotor retardation': 'Slowed movements, reduced facial expression - depression',
                    'Bizarre behaviour': 'Inappropriate actions - psychosis, dementia',
                    'Poor eye contact': 'Depression, autism, social anxiety, cultural factors'
                },
                clinicalPearls: 'Note cultural considerations. Observe throughout interview'
            },
            'speech': {
                name: 'Speech Assessment',
                technique: 'Assess rate, volume, tone, fluency, content',
                normal: 'Normal rate, appropriate volume, coherent content',
                abnormal: {
                    'Pressure of speech': 'Rapid, difficult to interrupt - mania, hyperthyroidism',
                    'Poverty of speech': 'Reduced amount - depression, schizophrenia',
                    'Flight of ideas': 'Rapid topic changes with logical connections - mania',
                    'Circumstantial speech': 'Excessive unnecessary detail but reaches point - anxiety',
                    'Word salad': 'Incoherent jumble of words - severe thought disorder'
                },
                clinicalPearls: 'Note both form (how they speak) and content (what they say)'
            },
            'mood-affect': {
                name: 'Mood and Affect',
                technique: 'Ask about mood, observe affect, assess congruence',
                normal: 'Euthymic mood, appropriate affect, mood-affect congruent',
                abnormal: {
                    'Depression': 'Low mood, reduced interest, anhedonia, hopelessness',
                    'Mania/Hypomania': 'Elevated mood, increased energy, decreased need for sleep',
                    'Anxiety': 'Worry, tension, fear, physical symptoms',
                    'Labile affect': 'Rapid mood changes - bipolar disorder, brain injury',
                    'Flat affect': 'Reduced emotional expression - schizophrenia, depression'
                },
                clinicalPearls: 'Mood = sustained emotional state. Affect = observed emotional expression'
            },
            'thought': {
                name: 'Thought Assessment',
                technique: 'Assess thought form, content, and possession',
                normal: 'Logical, goal-directed thinking, no abnormal content',
                abnormal: {
                    'Delusions': 'Fixed false beliefs - persecutory, grandiose, somatic',
                    'Thought broadcasting': 'Belief thoughts can be heard by others',
                    'Thought insertion': 'Belief thoughts put into mind by external force',
                    'Obsessions': 'Intrusive, unwanted thoughts - OCD',
                    'Suicidal ideation': 'Thoughts of self-harm - assess risk factors'
                },
                clinicalPearls: 'Always assess suicide risk. Distinguish overvalued ideas from delusions'
            },
            'perception': {
                name: 'Perceptual Abnormalities',
                technique: 'Ask about hallucinations, illusions, other perceptual disturbances',
                normal: 'No hallucinations or perceptual disturbances',
                abnormal: {
                    'Auditory hallucinations': 'Hearing voices - schizophrenia, severe depression',
                    'Visual hallucinations': 'Seeing things - delirium, dementia, substance use',
                    'Command hallucinations': 'Voices giving orders - high risk, requires urgent assessment',
                    'Illusions': 'Misperception of real stimuli - delirium, anxiety',
                    'Depersonalization': 'Feeling detached from self - anxiety, depression'
                },
                clinicalPearls: 'Command hallucinations require immediate risk assessment'
            },
            'cognition': {
                name: 'Cognitive Assessment',
                technique: 'Assess orientation, memory, attention, executive function',
                normal: 'Oriented x3, intact memory, normal attention and concentration',
                abnormal: {
                    'Disorientation': 'Time (earliest), place, person (latest) - delirium, dementia',
                    'Memory impairment': 'Anterograde (new memories), retrograde (old memories)',
                    'Attention deficit': 'Cannot focus, easily distracted - ADHD, anxiety, delirium',
                    'Executive dysfunction': 'Poor planning, judgment, abstract thinking - frontal lobe'
                },
                clinicalPearls: 'Use standardized tests: MMSE, MoCA, ACE-III for detailed assessment'
            },
            'insight': {
                name: 'Insight and Judgment',
                technique: 'Assess awareness of illness, understanding of need for treatment',
                normal: 'Good insight into condition, appropriate judgment',
                abnormal: {
                    'Poor insight': 'Denial of illness, refuses treatment - psychosis, mania',
                    'Partial insight': 'Some awareness but minimizes severity',
                    'Poor judgment': 'Impulsive decisions, risk-taking behavior - mania, substance use'
                },
                clinicalPearls: 'Insight often impaired in psychotic disorders and severe mood episodes'
            }
        }
    }
};