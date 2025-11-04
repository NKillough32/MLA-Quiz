/**
 * Orientation Manager - Handles screen orientation locking and fullscreen
 */

export class OrientationManager {
    constructor() {
        this.screenLocked = false;
        this.lockedTo = null; // 'portrait' or 'landscape'
        this.autoExitFullscreenAfterLock = false;
    }

    /**
     * Lock to optimal orientation based on screen dimensions
     */
    async lockToOptimalOrientation() {
        if (!window.screen?.orientation?.lock) {
            console.log('⚠️ Screen Orientation API not supported');
            return false;
        }

        const width = window.innerWidth;
        const height = window.innerHeight;
        const isLandscape = width > height;

        try {
            if (isLandscape) {
                await window.screen.orientation.lock('landscape');
                this.screenLocked = true;
                this.lockedTo = 'landscape';
                console.log('🔒 Locked to landscape');
            } else {
                await window.screen.orientation.lock('portrait');
                this.screenLocked = true;
                this.lockedTo = 'portrait';
                console.log('🔒 Locked to portrait');
            }
            return true;
        } catch (err) {
            console.warn('⚠️ Could not lock orientation:', err.message);
            return false;
        }
    }

    /**
     * Request fullscreen for orientation lock
     */
    async requestFullscreenForOrientationLock() {
        const elem = document.documentElement;

        try {
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }

            console.log('✅ Entered fullscreen');

            if (this.autoExitFullscreenAfterLock) {
                setTimeout(() => {
                    this.exitFullscreen();
                }, 1500);
            }

            return true;
        } catch (err) {
            console.warn('⚠️ Could not enter fullscreen:', err.message);
            return false;
        }
    }

    /**
     * Exit fullscreen
     */
    exitFullscreen() {
        try {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            console.log('✅ Exited fullscreen');
        } catch (err) {
            console.warn('⚠️ Could not exit fullscreen:', err.message);
        }
    }

    /**
     * Unlock orientation
     */
    unlockOrientation() {
        if (!window.screen?.orientation?.unlock) {
            console.log('⚠️ Screen Orientation API not supported');
            return false;
        }

        try {
            window.screen.orientation.unlock();
            this.screenLocked = false;
            this.lockedTo = null;
            console.log('🔓 Unlocked orientation');
            return true;
        } catch (err) {
            console.warn('⚠️ Could not unlock orientation:', err.message);
            return false;
        }
    }

    /**
     * Toggle rotation lock
     */
    async toggleRotationLock() {
        if (this.screenLocked) {
            this.unlockOrientation();
            return { locked: false };
        } else {
            const success = await this.lockToOptimalOrientation();
            if (!success) {
                await this.requestFullscreenForOrientationLock();
                await this.lockToOptimalOrientation();
            }
            return { locked: this.screenLocked, lockedTo: this.lockedTo };
        }
    }

    /**
     * Check if device is in landscape mode
     */
    isLandscape() {
        return window.innerWidth > window.innerHeight;
    }

    /**
     * Check if device is in portrait mode
     */
    isPortrait() {
        return window.innerHeight > window.innerWidth;
    }

    /**
     * Get current orientation
     */
    getCurrentOrientation() {
        return this.isLandscape() ? 'landscape' : 'portrait';
    }

    /**
     * Add orientation change listener
     */
    onOrientationChange(callback) {
        window.addEventListener('orientationchange', callback);
        window.addEventListener('resize', callback);
        
        // Return cleanup function
        return () => {
            window.removeEventListener('orientationchange', callback);
            window.removeEventListener('resize', callback);
        };
    }
}

// Export singleton instance
export const orientationManager = new OrientationManager();
