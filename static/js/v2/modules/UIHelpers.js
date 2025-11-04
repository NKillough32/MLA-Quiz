/**
 * UI Utilities Module - Common UI helper functions
 */

export class UIHelpers {
    /**
     * Show loading indicator
     */
    static showLoading(container, message = 'Loading...') {
        if (typeof container === 'string') {
            container = document.getElementById(container) || document.querySelector(container);
        }
        if (!container) return;

        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#666;">
                <div style="font-size:24px;margin-bottom:10px;">⏳</div>
                <div>${message}</div>
            </div>
        `;
    }

    /**
     * Show error message
     */
    static showError(container, message = 'An error occurred') {
        if (typeof container === 'string') {
            container = document.getElementById(container) || document.querySelector(container);
        }
        if (!container) return;

        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#d32f2f;">
                <div style="font-size:24px;margin-bottom:10px;">⚠️</div>
                <div>${message}</div>
            </div>
        `;
    }

    /**
     * Show success message
     */
    static showSuccess(container, message = 'Success!') {
        if (typeof container === 'string') {
            container = document.getElementById(container) || document.querySelector(container);
        }
        if (!container) return;

        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#388e3c;">
                <div style="font-size:24px;margin-bottom:10px;">✅</div>
                <div>${message}</div>
            </div>
        `;
    }

    /**
     * Debounce function
     */
    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function
     */
    static throttle(func, limit = 300) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Format time in seconds to readable string
     */
    static formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes < 60) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }

    /**
     * Format percentage
     */
    static formatPercentage(value, decimals = 1) {
        return `${value.toFixed(decimals)}%`;
    }

    /**
     * Sanitize HTML to prevent XSS
     */
    static sanitizeHTML(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }

    /**
     * Create element with attributes and content
     */
    static createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.substring(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        if (typeof content === 'string') {
            element.innerHTML = content;
        } else if (content instanceof Node) {
            element.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(child => {
                if (child instanceof Node) {
                    element.appendChild(child);
                }
            });
        }
        
        return element;
    }

    /**
     * Smooth scroll to element
     */
    static scrollToElement(element, offset = 0) {
        if (typeof element === 'string') {
            element = document.getElementById(element) || document.querySelector(element);
        }
        if (!element) return;

        const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
    }

    /**
     * Check if element is in viewport
     */
    static isInViewport(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element) || document.querySelector(element);
        }
        if (!element) return false;

        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Copy text to clipboard
     */
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                return true;
            }
        } catch (error) {
            console.error('Failed to copy text:', error);
            return false;
        }
    }

    /**
     * Generate random ID
     */
    static generateId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add class with animation
     */
    static addClassWithAnimation(element, className, duration = 300) {
        if (typeof element === 'string') {
            element = document.getElementById(element) || document.querySelector(element);
        }
        if (!element) return;

        element.classList.add(className);
        setTimeout(() => {
            element.classList.remove(className);
        }, duration);
    }

    /**
     * Toggle dark mode
     */
    static toggleDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
        }
    }

    /**
     * Get dark mode preference
     */
    static isDarkMode() {
        const saved = localStorage.getItem('darkMode');
        if (saved !== null) {
            return saved === 'true';
        }
        // Check system preference
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    /**
     * Format number with separators
     */
    static formatNumber(num, decimals = 0) {
        return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * Parse query string
     */
    static parseQueryString(queryString = window.location.search) {
        const params = new URLSearchParams(queryString);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    /**
     * Build query string
     */
    static buildQueryString(params) {
        const searchParams = new URLSearchParams(params);
        return searchParams.toString();
    }
}

export default UIHelpers;
