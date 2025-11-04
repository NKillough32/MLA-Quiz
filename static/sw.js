/**
 * MLA Quiz Service Worker
 * Provides offline functionality and caching for the PWA
 */

const CACHE_NAME = 'mla-quiz-v1';
const STATIC_CACHE = 'mla-quiz-static-v1';
const RUNTIME_CACHE = 'mla-quiz-runtime-v1';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/static/js/v1/app.js',
    '/static/manifest.json'
    // Icons are inline SVG data URIs, no need to cache external files
    // V2 modules load dynamically, don't pre-cache
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
    '/api/quizzes',
    '/api/quiz/'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('Caching static files');
                return cache.addAll(STATIC_FILES);
            })
        ]).then(() => {
            console.log('Service worker installed successfully');
            return self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => {
                        return cacheName !== STATIC_CACHE && 
                               cacheName !== RUNTIME_CACHE &&
                               cacheName !== CACHE_NAME;
                    })
                    .map((cacheName) => {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        }).then(() => {
            console.log('Service worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle static files (CSS, JS, images)
    if (STATIC_FILES.some(file => url.pathname === file) || 
        url.pathname.startsWith('/static/')) {
        
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return fetch(request).then((response) => {
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                });
            }).catch(() => {
                // Fallback for offline static files
                if (request.destination === 'document') {
                    return caches.match('/');
                }
            })
        );
        return;
    }

    // Handle API requests with network-first strategy
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Only cache successful GET requests
                    if (response.status === 200 && request.method === 'GET') {
                        const responseClone = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache for GET requests
                    if (request.method === 'GET') {
                        return caches.match(request).then((cachedResponse) => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            
                            // Return offline message for API calls
                            return new Response(
                                JSON.stringify({
                                    success: false,
                                    error: 'You are offline. Please check your connection.',
                                    offline: true
                                }),
                                {
                                    status: 503,
                                    headers: {
                                        'Content-Type': 'application/json'
                                    }
                                }
                            );
                        });
                    }
                })
        );
        return;
    }

    // Handle all other requests (mainly the main page)
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return fetch(request).then((response) => {
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            });
        }).catch(() => {
            // Offline fallback
            if (request.destination === 'document') {
                return caches.match('/').then((cachedResponse) => {
                    return cachedResponse || new Response(
                        `<!DOCTYPE html>
                        <html>
                        <head>
                            <title>MLA Quiz - Offline</title>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <style>
                                body {
                                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                                    text-align: center;
                                    padding: 50px 20px;
                                    background: #f2f2f7;
                                }
                                .offline-message {
                                    background: white;
                                    padding: 40px 20px;
                                    border-radius: 16px;
                                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                                    max-width: 400px;
                                    margin: 0 auto;
                                }
                                h1 { color: #1c1c1e; margin-bottom: 16px; }
                                p { color: #8e8e93; line-height: 1.5; }
                            </style>
                        </head>
                        <body>
                            <div class="offline-message">
                                <h1>You're Offline</h1>
                                <p>Please check your internet connection and try again.</p>
                                <button onclick="location.reload()" style="
                                    background: #007AFF;
                                    color: white;
                                    border: none;
                                    border-radius: 8px;
                                    padding: 12px 24px;
                                    font-size: 16px;
                                    margin-top: 20px;
                                    cursor: pointer;
                                ">Try Again</button>
                            </div>
                        </body>
                        </html>`,
                        {
                            status: 200,
                            headers: {
                                'Content-Type': 'text/html'
                            }
                        }
                    );
                });
            }
        })
    );
});

// Background sync for quiz submissions (if supported)
self.addEventListener('sync', (event) => {
    if (event.tag === 'quiz-submission') {
        event.waitUntil(handleBackgroundSync());
    }
});

async function handleBackgroundSync() {
    try {
        // Check if there are any pending quiz submissions in IndexedDB
        // This would be implemented if we add offline submission capabilities
        console.log('Background sync triggered for quiz submissions');
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Push notifications (for future features)
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New quiz available!',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMzAiIGZpbGw9IiMwMDdBRkYiLz4KPHBhdGggZD0iTTQ4IDEzNlYxMjBIMTQ0VjEzNkg0OFpNNDggOTZWODBIMTQ0Vjk2SDQ4Wk00OCA1NlY0MEgxNDRWNTZINDhaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
        badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjcyIiBoZWlnaHQ9IjcyIiByeD0iMTIiIGZpbGw9IiMwMDdBRkYiLz4KPHBhdGggZD0iTTE4IDQ0VjM4SDU0VjQ0SDE4Wk0xOCAzNFYyOEg1NFYzNEgxOFpNMTggMjRWMThINTRWMjRIMThaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Take Quiz',
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiByeD0iMTYiIGZpbGw9IiMwMDdBRkYiLz4KPHBhdGggZD0iTTI0IDU4VjUwSDcyVjU4SDI0Wk0yNCA0MlYzNEg3MlY0MkgyNFpNMjQgMjZWMThINzJWMjZIMjRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'
            },
            {
                action: 'close',
                title: 'Close',
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjcyIiBoZWlnaHQ9IjcyIiByeD0iMTIiIGZpbGw9IiM4ZThlOTMiLz4KPHBhdGggZD0iTTIyLjUgMjIuNUw0OS41IDQ5LjVNNDkuNSAyMi41TDIyLjUgNDkuNSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg=='
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('MLA Quiz', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handling for cache updates
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_UPDATE') {
        event.waitUntil(updateCaches());
    }
});

async function updateCaches() {
    try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(STATIC_FILES);
        console.log('Cache updated successfully');
    } catch (error) {
        console.error('Cache update failed:', error);
    }
}