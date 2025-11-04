/**
 * Calculator Registry - V2 Native Implementation
 * 
 * UPDATED APPROACH: 
 * Now uses native V2 calculator implementations instead of bridging to V1.
 * This provides better performance, independence, and maintainability.
 */

import { calculatorRegistry as nativeCalculators } from '../Calculators.js';

// Export the native calculator registry directly
export const calculatorRegistry = nativeCalculators;

/**
 * Helper function to get calculator by ID
 */
export function getCalculator(calcId) {
    return calculatorRegistry.getCalculator(calcId);
}

/**
 * Helper function to get all calculator IDs
 */
export function getAllCalculatorIds() {
    return calculatorRegistry.getAllCalculators().map(calc => calc.id);
}

/**
 * Helper function to get calculators by category
 */
export function getCalculatorsByCategory(category) {
    return calculatorRegistry.getCalculatorsByCategory(category);
}

/**
 * Helper function to get all categories
 */
export function getCategories() {
    const categories = new Set();
    calculatorRegistry.getAllCalculators().forEach(calc => {
        categories.add(calc.category);
    });
    return Array.from(categories).sort();
}

/**
 * Helper function to search calculators
 */
export function searchCalculators(query) {
    const term = query.toLowerCase();
    return calculatorRegistry.getAllCalculators().filter(calc => {
        return calc.name.toLowerCase().includes(term) ||
               calc.description.toLowerCase().includes(term) ||
               calc.keywords.some(kw => kw.toLowerCase().includes(term));
    });
}

console.log('✅ Calculator Registry updated to use native V2 implementations');
