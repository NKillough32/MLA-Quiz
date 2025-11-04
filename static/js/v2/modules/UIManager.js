/**
 * UI Manager - Handles theme, font size, and UI state management
 */

import { eventBus } from './EventBus.js';
import { storage } from './StorageManager.js';
import UIHelpers from './UIHelpers.js';
import { EVENTS, STORAGE_KEYS, UI_CONFIG, DEFAULT_SETTINGS } from './Constants.js';

export class UIManager {
    constructor() {
        this.fontSize = DEFAULT_SETTINGS.fontSize;
        this.darkMode = DEFAULT_SETTINGS.darkMode;
        this.currentView = 'home';
        this.navigationHistory = [];
    }

    /**
     * Initialize UI Manager
     */
    initialize() {
        // Load saved settings
        this.loadSettings();
        
        // Apply settings
        this.applyTheme();
        this.applyFontSize();
        
        // Setup listeners
        this.setupEventListeners();
        
        console.log('🎨 UI Manager initialized');
    }

    /**
     * Load saved settings
     */
    loadSettings() {
        this.fontSize = storage.getItem(STORAGE_KEYS.FONT_SIZE, DEFAULT_SETTINGS.fontSize);
        const savedDarkMode = storage.getItem(STORAGE_KEYS.DARK_MODE);
        
        if (savedDarkMode !== null) {
            this.darkMode = savedDarkMode === 'true';
        } else {
            // Check system preference
            this.darkMode = window.matchMedia && 
                window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                const savedPreference = storage.getItem(STORAGE_KEYS.DARK_MODE);
                if (savedPreference === null) {
                    // Only auto-switch if user hasn't set a preference
                    this.setDarkMode(e.matches);
                }
            });
        }

        // Listen for resize events
        window.addEventListener('resize', UIHelpers.debounce(() => {
            this.handleResize();
        }, UI_CONFIG.DEBOUNCE_DELAY));
    }

    /**
     * Toggle dark mode
     */
    toggleDarkMode() {
        this.setDarkMode(!this.darkMode);
        return this.darkMode;
    }

    /**
     * Set dark mode
     */
    setDarkMode(enabled) {
        this.darkMode = enabled;
        this.applyTheme();
        storage.setItem(STORAGE_KEYS.DARK_MODE, enabled.toString());
        eventBus.emit(EVENTS.THEME_CHANGED, { darkMode: enabled });
        console.log(`🌓 Dark mode: ${enabled ? 'ON' : 'OFF'}`);
    }

    /**
     * Apply theme to document
     */
    applyTheme() {
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    /**
     * Get current theme
     */
    isDarkMode() {
        return this.darkMode;
    }

    /**
     * Set font size
     */
    setFontSize(size) {
        const validSizes = Object.values(UI_CONFIG.FONT_SIZES);
        if (!validSizes.includes(size)) {
            console.warn(`Invalid font size: ${size}`);
            return;
        }

        this.fontSize = size;
        this.applyFontSize();
        storage.setItem(STORAGE_KEYS.FONT_SIZE, size);
        eventBus.emit(EVENTS.FONT_SIZE_CHANGED, { fontSize: size });
        console.log(`📝 Font size: ${size}`);
    }

    /**
     * Apply font size to document
     */
    applyFontSize() {
        // Remove all font size classes
        Object.values(UI_CONFIG.FONT_SIZES).forEach(size => {
            document.body.classList.remove(`font-${size}`);
        });
        
        // Add current font size class
        document.body.classList.add(`font-${this.fontSize}`);
    }

    /**
     * Get current font size
     */
    getFontSize() {
        return this.fontSize;
    }

    /**
     * Cycle to next font size
     */
    cycleFontSize() {
        const sizes = Object.values(UI_CONFIG.FONT_SIZES);
        const currentIndex = sizes.indexOf(this.fontSize);
        const nextIndex = (currentIndex + 1) % sizes.length;
        this.setFontSize(sizes[nextIndex]);
        return this.fontSize;
    }

    /**
     * Show view (screen/section)
     */
    showView(viewName) {
        const views = document.querySelectorAll('.view, .screen');
        views.forEach(view => {
            if (view.id === viewName || view.dataset.view === viewName) {
                view.style.display = 'block';
                view.classList.add('active');
            } else {
                view.style.display = 'none';
                view.classList.remove('active');
            }
        });

        // Update navigation history
        if (this.currentView !== viewName) {
            this.navigationHistory.push(this.currentView);
            this.currentView = viewName;
        }

        console.log(`📄 Showing view: ${viewName}`);
    }

    /**
     * Go back to previous view
     */
    goBack() {
        if (this.navigationHistory.length > 0) {
            const previousView = this.navigationHistory.pop();
            this.showView(previousView);
            return true;
        }
        return false;
    }

    /**
     * Get current view
     */
    getCurrentView() {
        return this.currentView;
    }

    /**
     * Show modal/dialog
     */
    showModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal not found: ${modalId}`);
            return;
        }

        modal.style.display = 'block';
        modal.classList.add('show');

        // Add backdrop
        if (options.backdrop !== false) {
            this.showBackdrop(() => this.hideModal(modalId));
        }

        // Focus first input
        if (options.autoFocus !== false) {
            const firstInput = modal.querySelector('input, textarea, select, button');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }

        // Close on escape key
        if (options.closeOnEscape !== false) {
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    this.hideModal(modalId);
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        }
    }

    /**
     * Hide modal/dialog
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.style.display = 'none';
        modal.classList.remove('show');
        this.hideBackdrop();
    }

    /**
     * Show backdrop
     */
    showBackdrop(onClickCallback) {
        let backdrop = document.getElementById('modal-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'modal-backdrop';
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
                cursor: pointer;
            `;
            document.body.appendChild(backdrop);
        }

        backdrop.style.display = 'block';
        
        if (onClickCallback) {
            backdrop.onclick = onClickCallback;
        }
    }

    /**
     * Hide backdrop
     */
    hideBackdrop() {
        const backdrop = document.getElementById('modal-backdrop');
        if (backdrop) {
            backdrop.style.display = 'none';
            backdrop.onclick = null;
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = UI_CONFIG.TOAST_DURATION) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: ${this.getToastColor(type)};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideUp 0.3s ease-out;
            max-width: 90%;
            text-align: center;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease-in';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, duration);

        return toast;
    }

    /**
     * Get toast color based on type
     */
    getToastColor(type) {
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };
        return colors[type] || colors.info;
    }

    /**
     * Show loading overlay
     */
    showLoadingOverlay(message = 'Loading...') {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.innerHTML = `
                <div style="text-align:center;">
                    <div class="spinner"></div>
                    <p id="loading-message" style="margin-top:20px;color:white;">${message}</p>
                </div>
            `;
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            document.body.appendChild(overlay);
        } else {
            const messageEl = overlay.querySelector('#loading-message');
            if (messageEl) messageEl.textContent = message;
        }

        overlay.style.display = 'flex';
    }

    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Update loading message
     */
    updateLoadingMessage(message) {
        const messageEl = document.querySelector('#loading-overlay #loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }

    /**
     * Confirm dialog
     */
    async confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const existingDialog = document.getElementById('confirm-dialog');
            if (existingDialog) {
                document.body.removeChild(existingDialog);
            }

            const dialog = document.createElement('div');
            dialog.id = 'confirm-dialog';
            dialog.innerHTML = `
                <div style="background:white;padding:24px;border-radius:12px;max-width:400px;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
                    <h3 style="margin:0 0 16px 0;color:#333;">${title}</h3>
                    <p style="margin:0 0 24px 0;color:#666;">${message}</p>
                    <div style="display:flex;gap:12px;justify-content:flex-end;">
                        <button id="confirm-no" style="padding:8px 20px;border:1px solid #ccc;background:white;color:#333;border-radius:6px;cursor:pointer;">Cancel</button>
                        <button id="confirm-yes" style="padding:8px 20px;border:none;background:#1976d2;color:white;border-radius:6px;cursor:pointer;">Confirm</button>
                    </div>
                </div>
            `;
            dialog.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
            `;

            document.body.appendChild(dialog);

            dialog.querySelector('#confirm-yes').onclick = () => {
                document.body.removeChild(dialog);
                resolve(true);
            };

            dialog.querySelector('#confirm-no').onclick = () => {
                document.body.removeChild(dialog);
                resolve(false);
            };

            dialog.onclick = (e) => {
                if (e.target === dialog) {
                    document.body.removeChild(dialog);
                    resolve(false);
                }
            };
        });
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const width = window.innerWidth;
        
        // Update body classes for responsive design
        document.body.classList.toggle('mobile', width < 768);
        document.body.classList.toggle('tablet', width >= 768 && width < 1024);
        document.body.classList.toggle('desktop', width >= 1024);
        
        eventBus.emit('ui:resize', { width, height: window.innerHeight });
    }

    /**
     * Scroll to top smoothly
     */
    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Toggle fullscreen
     */
    async toggleFullscreen() {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
            return true;
        } else {
            await document.exitFullscreen();
            return false;
        }
    }

    /**
     * Get UI settings
     */
    getSettings() {
        return {
            darkMode: this.darkMode,
            fontSize: this.fontSize,
            currentView: this.currentView
        };
    }

    /**
     * Reset UI settings to defaults
     */
    resetSettings() {
        this.setDarkMode(DEFAULT_SETTINGS.darkMode);
        this.setFontSize(DEFAULT_SETTINGS.fontSize);
        console.log('🔄 UI settings reset to defaults');
    }
}

// Export singleton instance
export const uiManager = new UIManager();
