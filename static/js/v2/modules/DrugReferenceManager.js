/**
 * Drug Reference Manager
 * Manages drug database, search, categories, and voice recognition
 */

import { EventBus } from './EventBus.js';
import { StorageManager } from './StorageManager.js';

export class DrugReferenceManager {
    constructor() {
        this.eventBus = EventBus.getInstance();
        this.storage = StorageManager.getInstance();
        this.drugDatabase = null;
        this.recognition = null;
        this.recentDrugs = [];
    }

    async initialize() {
        console.log('🏥 Initializing DrugReferenceManager...');
        
        // Load drug database from window.drugDatabase (loaded from drugDatabase.js)
        if (typeof window.drugDatabase !== 'undefined') {
            this.drugDatabase = window.drugDatabase;
            console.log(`✅ Drug database loaded: ${Object.keys(this.drugDatabase).length} drugs`);
        } else {
            console.error('❌ Drug database not loaded. Ensure drugDatabase.js is included before modules.');
            return;
        }

        // Load recent drugs from storage
        this.recentDrugs = await this.storage.get('recentDrugs') || [];
        
        this.eventBus.emit('DRUG_MANAGER_READY', { 
            drugCount: Object.keys(this.drugDatabase).length 
        });
    }

    /**
     * Search drugs by name, class, or indication
     */
    searchDrugs(query) {
        if (!this.drugDatabase) return [];
        
        const lowerQuery = query.toLowerCase().trim();
        if (lowerQuery.length < 2) return [];

        const matches = Object.entries(this.drugDatabase).filter(([key, drug]) => {
            return key.toLowerCase().includes(lowerQuery) ||
                   drug.name.toLowerCase().includes(lowerQuery) ||
                   drug.class.toLowerCase().includes(lowerQuery) ||
                   (drug.indication && drug.indication.toLowerCase().includes(lowerQuery));
        });

        // Sort by relevance (exact name match first, then starts with, then contains)
        matches.sort(([keyA, drugA], [keyB, drugB]) => {
            const nameA = drugA.name.toLowerCase();
            const nameB = drugB.name.toLowerCase();
            
            if (nameA === lowerQuery) return -1;
            if (nameB === lowerQuery) return 1;
            if (nameA.startsWith(lowerQuery)) return -1;
            if (nameB.startsWith(lowerQuery)) return 1;
            return nameA.localeCompare(nameB);
        });

        this.eventBus.emit('DRUG_SEARCHED', { query, resultCount: matches.length });
        
        return matches.map(([key, drug]) => ({ key, ...drug }));
    }

    /**
     * Get drugs by category
     */
    getDrugsByCategory(category) {
        if (!this.drugDatabase) return [];

        const drugs = Object.entries(this.drugDatabase);
        
        if (category === 'all' || category === 'alphabetical') {
            return drugs
                .map(([key, drug]) => ({ key, ...drug }))
                .sort((a, b) => a.name.localeCompare(b.name));
        }

        // Category filters
        const filters = {
            analgesics: (drug) => {
                const drugClass = drug.class.toLowerCase();
                const drugName = drug.name.toLowerCase();
                return drugClass.includes('analgesic') || drugClass.includes('nsaid') || 
                       drugClass.includes('opioid') || drugName.includes('paracetamol') ||
                       drugName.includes('ibuprofen') || drugName.includes('morphine') ||
                       drugName.includes('codeine') || drugName.includes('tramadol');
            },
            antibiotics: (drug) => {
                const drugClass = drug.class.toLowerCase();
                return drugClass.includes('antibiotic') || drugClass.includes('penicillin') || 
                       drugClass.includes('macrolide') || drugClass.includes('cephalosporin') ||
                       drugClass.includes('quinolone') || drugClass.includes('tetracycline');
            },
            cardiovascular: (drug) => {
                const drugClass = drug.class.toLowerCase();
                return drugClass.includes('statin') || drugClass.includes('ace inhibitor') ||
                       drugClass.includes('beta-blocker') || drugClass.includes('diuretic') ||
                       drugClass.includes('calcium channel') || drugClass.includes('anticoagulant') ||
                       drugClass.includes('antiplatelet') || drugClass.includes('cardiac');
            },
            'mental-health': (drug) => {
                const drugClass = drug.class.toLowerCase();
                return drugClass.includes('antidepressant') || drugClass.includes('ssri') ||
                       drugClass.includes('anxiolytic') || drugClass.includes('antipsychotic') ||
                       drugClass.includes('benzodiazepine') || drugClass.includes('mood stabilizer');
            },
            respiratory: (drug) => {
                const drugClass = drug.class.toLowerCase();
                return drugClass.includes('bronchodilator') || drugClass.includes('corticosteroid') ||
                       drugClass.includes('beta-2 agonist') || drugClass.includes('anticholinergic');
            },
            endocrine: (drug) => {
                const drugClass = drug.class.toLowerCase();
                return drugClass.includes('antidiabetic') || drugClass.includes('thyroid') ||
                       drugClass.includes('insulin') || drugClass.includes('hormone');
            },
            emergency: (drug) => {
                const drugClass = drug.class.toLowerCase();
                const drugName = drug.name.toLowerCase();
                return drugClass.includes('emergency') || drugClass.includes('antidote') ||
                       drugName.includes('adrenaline') || drugName.includes('naloxone') ||
                       drugName.includes('atropine') || drugName.includes('glucagon');
            },
            gastro: (drug) => {
                const drugClass = drug.class.toLowerCase();
                return drugClass.includes('proton pump') || drugClass.includes('antiemetic') ||
                       drugClass.includes('laxative') || drugClass.includes('antidiarrhoeal');
            },
            neuro: (drug) => {
                const drugClass = drug.class.toLowerCase();
                return drugClass.includes('anticonvulsant') || drugClass.includes('antiepilep') ||
                       drugClass.includes('neuropathic') || drugClass.includes('triptan');
            }
        };

        const filter = filters[category];
        if (!filter) return [];

        return drugs
            .filter(([, drug]) => filter(drug))
            .map(([key, drug]) => ({ key, ...drug }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Get drug details by key
     */
    getDrug(drugKey) {
        if (!this.drugDatabase || !this.drugDatabase[drugKey]) return null;
        
        // Add to recent drugs
        this.addToRecent(drugKey);
        
        this.eventBus.emit('DRUG_VIEWED', { drugKey, drug: this.drugDatabase[drugKey] });
        
        return { key: drugKey, ...this.drugDatabase[drugKey] };
    }

    /**
     * Add drug to recent history
     */
    async addToRecent(drugKey) {
        // Remove if already exists
        this.recentDrugs = this.recentDrugs.filter(key => key !== drugKey);
        
        // Add to front
        this.recentDrugs.unshift(drugKey);
        
        // Keep only last 10
        this.recentDrugs = this.recentDrugs.slice(0, 10);
        
        await this.storage.set('recentDrugs', this.recentDrugs);
    }

    /**
     * Get recent drugs
     */
    getRecentDrugs() {
        return this.recentDrugs
            .map(key => this.drugDatabase[key] ? { key, ...this.drugDatabase[key] } : null)
            .filter(drug => drug !== null);
    }

    /**
     * Start voice recognition for drug search
     */
    startVoiceSearch() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            this.eventBus.emit('DRUG_VOICE_ERROR', { 
                error: 'Voice search not supported in this browser' 
            });
            return false;
        }

        // Stop existing recognition
        this.stopVoiceSearch();

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.eventBus.emit('DRUG_VOICE_STARTED');
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.eventBus.emit('DRUG_VOICE_RESULT', { transcript });
        };

        this.recognition.onerror = (event) => {
            this.eventBus.emit('DRUG_VOICE_ERROR', { error: event.error });
        };

        this.recognition.onend = () => {
            this.eventBus.emit('DRUG_VOICE_ENDED');
            this.recognition = null;
        };

        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Voice recognition error:', error);
            return false;
        }
    }

    /**
     * Stop voice recognition
     */
    stopVoiceSearch() {
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Error stopping voice recognition:', error);
            }
            this.recognition = null;
        }
    }

    /**
     * Speak drug name using text-to-speech
     */
    speakDrugName(drugName) {
        const synth = window.speechSynthesis;
        
        if (!synth) {
            console.warn('Text-to-speech not supported');
            return false;
        }

        // Cancel any existing speech
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(drugName);
        
        // Try to use English voice
        const voices = synth.getVoices();
        const englishVoice = voices.find(v => /en[-_]?(us|gb)/i.test(v.lang));
        if (englishVoice) {
            utterance.voice = englishVoice;
        }
        
        utterance.rate = 0.95;
        utterance.pitch = 1;

        synth.speak(utterance);
        
        this.eventBus.emit('DRUG_NAME_SPOKEN', { drugName });
        
        return true;
    }

    /**
     * Get all drug categories
     */
    getCategories() {
        return [
            { id: 'all', name: 'All Drugs', icon: '💊' },
            { id: 'alphabetical', name: 'A-Z', icon: '🔤' },
            { id: 'analgesics', name: 'Pain Management', icon: '💉' },
            { id: 'antibiotics', name: 'Antibiotics', icon: '🦠' },
            { id: 'cardiovascular', name: 'Cardiovascular', icon: '❤️' },
            { id: 'mental-health', name: 'Mental Health', icon: '🧠' },
            { id: 'respiratory', name: 'Respiratory', icon: '🫁' },
            { id: 'endocrine', name: 'Endocrine', icon: '🔬' },
            { id: 'emergency', name: 'Emergency', icon: '🚨' },
            { id: 'gastro', name: 'Gastro', icon: '🫀' },
            { id: 'neuro', name: 'Neurological', icon: '⚡' }
        ];
    }

    /**
     * Get drug count
     */
    getDrugCount() {
        return this.drugDatabase ? Object.keys(this.drugDatabase).length : 0;
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const categories = this.getCategories();
        return {
            totalDrugs: this.getDrugCount(),
            categories: categories,
            totalViews: this.recentDrugs.length,
            initialized: this.initialized
        };
    }
}

// Export singleton instance
export const drugReferenceManager = new DrugReferenceManager();
export default DrugReferenceManager;

