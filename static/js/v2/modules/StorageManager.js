/**
 * Storage Module - Handles IndexedDB and localStorage operations
 */

export class StorageManager {
    constructor() {
        this.db = null;
        this.dbName = 'MLAQuizDB';
        this.dbVersion = 1;
        this.storeName = 'quizImages';
    }

    /**
     * Initialize IndexedDB for efficient image storage
     */
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.warn('⚠️ IndexedDB not available. Will use localStorage only.');
                resolve(null);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { 
                        keyPath: 'id' 
                    });
                    objectStore.createIndex('quizName', 'quizName', { unique: false });
                    objectStore.createIndex('imageKey', 'imageKey', { unique: false });
                }
            };
        });
    }

    /**
     * Store image in IndexedDB
     */
    async storeImageInDB(quizName, imageKey, imageData) {
        if (!this.db) {
            console.warn('⚠️ IndexedDB not available');
            return false;
        }

        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const id = `${quizName}_${imageKey}`;

                const request = store.put({
                    id: id,
                    quizName: quizName,
                    imageKey: imageKey,
                    imageData: imageData,
                    timestamp: Date.now()
                });

                request.onsuccess = () => resolve(true);
                request.onerror = () => {
                    console.error('Error storing image:', request.error);
                    resolve(false);
                };
            } catch (error) {
                console.error('Error in storeImageInDB:', error);
                resolve(false);
            }
        });
    }

    /**
     * Get image from IndexedDB
     */
    async getImageFromDB(quizName, imageKey) {
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const id = `${quizName}_${imageKey}`;
                const request = store.get(id);

                request.onsuccess = () => {
                    const result = request.result;
                    resolve(result ? result.imageData : null);
                };

                request.onerror = () => {
                    console.error('Error getting image:', request.error);
                    resolve(null);
                };
            } catch (error) {
                console.error('Error in getImageFromDB:', error);
                resolve(null);
            }
        });
    }

    /**
     * Get all images for a quiz
     */
    async getAllImagesForQuiz(quizName) {
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const index = store.index('quizName');
                const request = index.getAll(quizName);

                request.onsuccess = () => {
                    const images = {};
                    request.result.forEach(item => {
                        images[item.imageKey] = item.imageData;
                    });
                    resolve(images);
                };

                request.onerror = () => {
                    console.error('Error getting images:', request.error);
                    resolve([]);
                };
            } catch (error) {
                console.error('Error in getAllImagesForQuiz:', error);
                resolve([]);
            }
        });
    }

    /**
     * Clear all images for a quiz
     */
    async clearQuizImages(quizName) {
        if (!this.db) return false;

        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const index = store.index('quizName');
                const request = index.openCursor(IDBKeyRange.only(quizName));

                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve(true);
                    }
                };

                request.onerror = () => {
                    console.error('Error clearing images:', request.error);
                    resolve(false);
                };
            } catch (error) {
                console.error('Error in clearQuizImages:', error);
                resolve(false);
            }
        });
    }

    /**
     * LocalStorage helpers
     */
    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    }

    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
}

// Export singleton instance
export const storage = new StorageManager();
export const storageManager = storage; // Alias for compatibility

