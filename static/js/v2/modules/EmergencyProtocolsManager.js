/**
 * Emergency Protocols Manager - V2
 * Bridges to V1's emergency protocols system
 */

import { eventBus } from './EventBus.js';
import { storage } from './StorageManager.js';
import { EVENTS } from './Constants.js';

export class EmergencyProtocolsManager {
    constructor() {
        this.v1App = null;
        this.initialized = false;
        this.recentProtocols = [];
    }

    /**
     * Initialize with V1 app reference
     */
    initialize(v1AppInstance) {
        this.v1App = v1AppInstance || window.quizApp;
        this.recentProtocols = storage.getItem('recentProtocols', []);
        this.initialized = true;
        console.log('🚨 EmergencyProtocolsManager initialized (V1 bridge)');
    }

    /**
     * Load emergency protocols interface
     */
    loadEmergencyProtocols() {
        if (!this.v1App) {
            console.error('V1 app not available for emergency protocols');
            return;
        }

        // Bridge to V1's loadEmergencyProtocols method
        if (typeof this.v1App.loadEmergencyProtocols === 'function') {
            this.v1App.loadEmergencyProtocols();
            
            // Emit event for tracking
            eventBus.emit(EVENTS.TOOL_OPENED, {
                tool: 'emergency-protocols',
                timestamp: Date.now()
            });
        } else {
            console.error('V1 loadEmergencyProtocols method not found');
        }
    }

    /**
     * Get protocol by key
     */
    getProtocol(key) {
        if (!this.v1App || !this.v1App.emergencyProtocols) {
            return null;
        }
        return this.v1App.emergencyProtocols[key];
    }

    /**
     * Search protocols
     */
    searchProtocols(query) {
        if (!this.v1App || !this.v1App.emergencyProtocols) {
            return [];
        }

        const term = query.toLowerCase();
        const results = [];

        for (const [key, protocol] of Object.entries(this.v1App.emergencyProtocols)) {
            if (protocol.name.toLowerCase().includes(term) ||
                protocol.category?.toLowerCase().includes(term) ||
                protocol.overview?.toLowerCase().includes(term)) {
                results.push({ key, ...protocol });
            }
        }

        return results;
    }

    /**
     * Get all categories
     */
    getCategories() {
        if (!this.v1App || !this.v1App.emergencyProtocols) {
            return [];
        }

        const categories = new Set();
        for (const protocol of Object.values(this.v1App.emergencyProtocols)) {
            if (protocol.category) {
                categories.add(protocol.category);
            }
        }
        return Array.from(categories).sort();
    }

    /**
     * Get protocols by category
     */
    getProtocolsByCategory(category) {
        if (!this.v1App || !this.v1App.emergencyProtocols) {
            return [];
        }

        return Object.entries(this.v1App.emergencyProtocols)
            .filter(([key, protocol]) => protocol.category === category)
            .map(([key, protocol]) => ({ key, ...protocol }));
    }

    /**
     * Get high priority protocols
     */
    getHighPriorityProtocols() {
        if (!this.v1App || !this.v1App.emergencyProtocols) {
            return [];
        }

        return Object.entries(this.v1App.emergencyProtocols)
            .filter(([key, protocol]) => protocol.priority === 'high' || protocol.urgent === true)
            .map(([key, protocol]) => ({ key, ...protocol }));
    }

    /**
     * Add to recent
     */
    addToRecent(protocolKey) {
        if (!this.recentProtocols.includes(protocolKey)) {
            this.recentProtocols.unshift(protocolKey);
            this.recentProtocols = this.recentProtocols.slice(0, 10); // Keep last 10
            storage.setItem('recentProtocols', this.recentProtocols);
        }
    }

    /**
     * Get statistics
     */
    getStatistics() {
        if (!this.v1App || !this.v1App.emergencyProtocols) {
            return { total: 0, categories: {} };
        }

        const categories = {};
        for (const protocol of Object.values(this.v1App.emergencyProtocols)) {
            const cat = protocol.category || 'Other';
            categories[cat] = (categories[cat] || 0) + 1;
        }

        return {
            total: Object.keys(this.v1App.emergencyProtocols).length,
            categories,
            recentCount: this.recentProtocols.length
        };
    }
}

// Export singleton instance
export const emergencyProtocolsManager = new EmergencyProtocolsManager();
export default EmergencyProtocolsManager;
