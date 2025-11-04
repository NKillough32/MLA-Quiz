/**
 * Analytics Module - Handles tracking and vibration feedback
 */

export class AnalyticsManager {
    constructor() {
        this.vibrationEnabled = this.getVibrationSetting();
    }

    /**
     * Get vibration setting from localStorage
     */
    getVibrationSetting() {
        try {
            const setting = localStorage.getItem('vibrationEnabled');
            return setting === null ? true : setting === 'true';
        } catch (error) {
            return true;
        }
    }

    /**
     * Set vibration setting
     */
    setVibrationSetting(enabled) {
        this.vibrationEnabled = enabled;
        try {
            localStorage.setItem('vibrationEnabled', enabled.toString());
        } catch (error) {
            console.error('Error saving vibration setting:', error);
        }
    }

    /**
     * Trigger haptic feedback
     */
    vibrate(pattern = 50) {
        if (!this.vibrationEnabled) return;
        
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch (error) {
                console.warn('Vibration not supported:', error);
            }
        }
    }

    /**
     * Success vibration pattern
     */
    vibrateSuccess() {
        this.vibrate([50, 50, 50]);
    }

    /**
     * Error vibration pattern
     */
    vibrateError() {
        this.vibrate([100, 50, 100]);
    }

    /**
     * Warning vibration pattern
     */
    vibrateWarning() {
        this.vibrate([50, 30, 50, 30, 50]);
    }

    /**
     * Click vibration pattern
     */
    vibrateClick() {
        this.vibrate(10);
    }

    /**
     * Track page view (if analytics is implemented)
     */
    trackPageView(page) {
        console.log(`📊 Page view: ${page}`);
        // Placeholder for future analytics integration
    }

    /**
     * Track event (if analytics is implemented)
     */
    trackEvent(category, action, label = '', value = 0) {
        console.log(`📊 Event: ${category} - ${action}`, { label, value });
        // Placeholder for future analytics integration
    }

    /**
     * Track quiz completion
     */
    trackQuizCompletion(quizName, score, timeSpent) {
        this.trackEvent('Quiz', 'Completed', quizName, score);
        console.log(`📊 Quiz completed: ${quizName} - Score: ${score}% - Time: ${timeSpent}s`);
    }

    /**
     * Track calculator usage
     */
    trackCalculatorUse(calculatorName) {
        this.trackEvent('Calculator', 'Used', calculatorName);
    }

    /**
     * Track anatomy view
     */
    trackAnatomyView(layer, view) {
        this.trackEvent('Anatomy', 'Viewed', `${layer}-${view}`);
    }
}

// Export singleton instance
export const analytics = new AnalyticsManager();
