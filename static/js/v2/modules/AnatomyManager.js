/**
 * Anatomy Manager - Handles anatomy exploration features
 */

import { eventBus } from './EventBus.js';
import { analytics } from './AnalyticsManager.js';
import UIHelpers from './UIHelpers.js';
import { EVENTS, ANATOMY_CONFIG, API_ENDPOINTS } from './Constants.js';

export class AnatomyManager {
    constructor() {
        this.anatomyData = null;
        this.anatomyLayer = ANATOMY_CONFIG.DEFAULT_LAYER;
        this.anatomyView = ANATOMY_CONFIG.DEFAULT_VIEW;
        this.anatomyInitialized = false;
    }

    /**
     * Initialize anatomy explorer
     */
    async initialize() {
        if (this.anatomyInitialized) return;
        this.anatomyInitialized = true;

        console.log('🦴 Initializing anatomy explorer...');

        // Load anatomy data
        await this.loadAnatomyData();

        // Setup UI controls
        this.setupControls();

        // Load default view
        await this.loadAnatomyMap(this.anatomyLayer, this.anatomyView);

        eventBus.emit(EVENTS.ANATOMY_LOADED);
        console.log('✅ Anatomy explorer initialized');
    }

    /**
     * Load anatomy structured data
     */
    async loadAnatomyData() {
        try {
            const res = await fetch(API_ENDPOINTS.ANATOMY_DATA, { cache: 'no-cache' });
            if (res && res.ok) {
                this.anatomyData = await res.json();
                console.log('📚 Loaded anatomy structured data');
                return this.anatomyData;
            }
        } catch (err) {
            console.warn('⚠️ Unable to load anatomy structured data:', err);
        }
        return null;
    }

    /**
     * Setup anatomy controls
     */
    setupControls() {
        const toggleBones = document.getElementById('toggleBones');
        const toggleMuscles = document.getElementById('toggleMuscles');
        const viewAnterior = document.getElementById('viewAnterior');
        const viewPosterior = document.getElementById('viewPosterior');
        const searchInput = document.getElementById('searchAnatomy');
        const searchBtn = document.getElementById('searchAnatomyBtn');

        // Helper to update layer button states
        const updateLayerButtons = () => {
            if (toggleBones) toggleBones.classList.toggle('active', this.anatomyLayer === 'bones');
            if (toggleMuscles) toggleMuscles.classList.toggle('active', this.anatomyLayer === 'muscles');
        };

        // Helper to update view button states
        const updateViewButtons = () => {
            if (viewAnterior) viewAnterior.classList.toggle('active', this.anatomyView === 'front');
            if (viewPosterior) viewPosterior.classList.toggle('active', this.anatomyView === 'back');
        };

        // Initialize button states
        updateLayerButtons();
        updateViewButtons();

        // Layer toggle handlers
        if (toggleBones) {
            toggleBones.addEventListener('click', (e) => {
                e.stopPropagation();
                this.anatomyLayer = 'bones';
                updateLayerButtons();
                this.loadAnatomyMap(this.anatomyLayer, this.anatomyView);
                eventBus.emit(EVENTS.ANATOMY_LAYER_CHANGED, 'bones');
            });
        }

        if (toggleMuscles) {
            toggleMuscles.addEventListener('click', (e) => {
                e.stopPropagation();
                this.anatomyLayer = 'muscles';
                updateLayerButtons();
                this.loadAnatomyMap(this.anatomyLayer, this.anatomyView);
                eventBus.emit(EVENTS.ANATOMY_LAYER_CHANGED, 'muscles');
            });
        }

        // View toggle handlers
        if (viewAnterior) {
            viewAnterior.addEventListener('click', () => {
                this.anatomyView = 'front';
                updateViewButtons();
                this.loadAnatomyMap(this.anatomyLayer, this.anatomyView);
                eventBus.emit(EVENTS.ANATOMY_VIEW_CHANGED, 'front');
            });
        }

        if (viewPosterior) {
            viewPosterior.addEventListener('click', () => {
                this.anatomyView = 'back';
                updateViewButtons();
                this.loadAnatomyMap(this.anatomyLayer, this.anatomyView);
                eventBus.emit(EVENTS.ANATOMY_VIEW_CHANGED, 'back');
            });
        }

        // Search functionality
        const doSearch = UIHelpers.debounce((q) => {
            this.searchAnatomy(q.trim());
        }, ANATOMY_CONFIG.SEARCH_DEBOUNCE);

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                doSearch(e.target.value || '');
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const q = (searchInput && searchInput.value) ? searchInput.value.trim() : '';
                this.searchAnatomy(q);
            });
        }
    }

    /**
     * Load anatomy map (SVG or programmatic)
     */
    async loadAnatomyMap(layer = 'bones', view = 'front') {
        try {
            const canvas = document.getElementById('anatomyCanvas') || document.getElementById('bodyMap');
            if (!canvas) return this.renderAnatomyMap();

            UIHelpers.showLoading(canvas, 'Loading anatomy image...');

            // Try local files first
            const candidates = [
                `/static/anatomy/${layer}_${view}.svg`,
                `/static/anatomy/${layer}_${view}_front.svg`,
                `/static/anatomy/${layer}_front.svg`,
                `/static/anatomy/${layer}.svg`,
                `/static/anatomy/male-musculator.svg`
            ];

            let svgText = null;
            let loadedFrom = null;

            for (const url of candidates) {
                try {
                    const res = await fetch(url, { cache: 'no-cache' });
                    if (!res.ok) continue;
                    svgText = await res.text();
                    loadedFrom = url;
                    console.log(`✅ Loaded local anatomy image: ${url}`);
                    break;
                } catch (err) {
                    // try next
                }
            }

            // Try remote fallbacks if local not found
            if (!svgText) {
                svgText = await this.loadRemoteAnatomy(layer, view, canvas);
                if (!svgText) {
                    console.log('⚠️ No SVG found, using programmatic fallback');
                    return this.renderAnatomyMap();
                }
            }

            // Inject SVG and enhance it
            this.injectSvg(canvas, svgText, layer, view);

            analytics.trackAnatomyView(layer, view);
        } catch (err) {
            console.error('❌ Error loading anatomy map:', err);
            UIHelpers.showError(document.getElementById('anatomyCanvas') || document.getElementById('bodyMap'),
                'Failed to load anatomy map');
        }
    }

    /**
     * Load remote anatomy images
     */
    async loadRemoteAnatomy(layer, view, canvas) {
        const remoteMap = {
            'bones_front': [
                'https://upload.wikimedia.org/wikipedia/commons/c/ca/Human_skeleton_front_en.svg',
                'https://upload.wikimedia.org/wikipedia/commons/c/c7/Human_skeleton_front.svg',
                'https://upload.wikimedia.org/wikipedia/commons/1/14/Human_skeleton_diagram_en.svg'
            ],
            'bones_back': [
                'https://upload.wikimedia.org/wikipedia/commons/4/4e/Human_skeleton_back_en.svg',
                'https://upload.wikimedia.org/wikipedia/commons/4/4e/Human_skeleton_back.svg',
                'https://upload.wikimedia.org/wikipedia/commons/d/d7/Posterior_view_of_human_body_skeleton.svg'
            ],
            'muscles_front': [
                'https://upload.wikimedia.org/wikipedia/commons/c/c1/Muscular_system_front_labeled.svg',
                'https://upload.wikimedia.org/wikipedia/commons/0/0b/Anterior_view_of_human_muscular_system.svg',
                'https://upload.wikimedia.org/wikipedia/commons/3/30/Gray_muscle_front_view.png',
                'https://upload.wikimedia.org/wikipedia/commons/9/91/Anterior_muscles.png',
                'https://upload.wikimedia.org/wikipedia/commons/5/5a/Muscles_anterior_labeled.png'
            ],
            'muscles_back': [
                'https://upload.wikimedia.org/wikipedia/commons/a/aa/Muscular_system_back_labeled.svg',
                'https://upload.wikimedia.org/wikipedia/commons/6/60/Posterior_view_of_human_muscular_system.svg',
                'https://upload.wikimedia.org/wikipedia/commons/7/72/Gray_muscle_back_view.png',
                'https://upload.wikimedia.org/wikipedia/commons/1/14/Posterior_muscles.png',
                'https://upload.wikimedia.org/wikipedia/commons/b/b4/Muscles_posterior_labeled.png'
            ]
        };

        const remoteKey = `${layer}_${view}`;
        const candidates = remoteMap[remoteKey] || remoteMap[`${layer}_front`] || [];

        for (const remoteUrl of candidates) {
            try {
                console.log(`🔄 Trying remote image: ${remoteUrl}`);
                const r = await fetch(remoteUrl, { cache: 'default', mode: 'cors' });
                if (r.ok) {
                    const contentType = r.headers.get('content-type');
                    if (contentType && contentType.includes('svg')) {
                        const svgText = await r.text();
                        console.log(`✅ Loaded remote SVG: ${remoteUrl}`);
                        return svgText;
                    } else {
                        // Handle bitmap images
                        const blob = await r.blob();
                        const imageUrl = URL.createObjectURL(blob);
                        this.renderBitmapWithButtons(canvas, imageUrl, layer, view);
                        console.log(`✅ Loaded remote image (bitmap): ${remoteUrl}`);
                        return null; // Handled directly
                    }
                }
            } catch (innerErr) {
                console.warn(`⚠️ Failed to load ${remoteUrl}:`, innerErr.message);
            }
        }
        return null;
    }

    /**
     * Render bitmap image with interactive buttons
     */
    renderBitmapWithButtons(canvas, imageUrl, layer, view) {
        if (layer === 'muscles') {
            canvas.innerHTML = `
                <div style="position:relative;max-width:600px;margin:0 auto;">
                    <img src="${imageUrl}" 
                         style="width:100%;height:auto;display:block;"
                         alt="${layer} ${view} anatomy" />
                    <div id="muscle-buttons" style="margin-top:20px;">
                        <p style="text-align:center;color:#666;margin-bottom:12px;">Click on a muscle to learn more:</p>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;padding:0 16px;">
                            ${this.getMuscleButtons(view)}
                        </div>
                    </div>
                </div>
            `;
            this.attachMuscleButtonHandlers();
        } else {
            canvas.innerHTML = `
                <img src="${imageUrl}" 
                     style="width:100%;height:auto;max-width:600px;display:block;margin:0 auto;"
                     alt="${layer} ${view} anatomy" />
            `;
        }
    }

    /**
     * Inject and enhance SVG
     */
    injectSvg(canvas, svgText, layer, view) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = svgText;
        canvas.innerHTML = '';
        canvas.appendChild(wrapper);

        const svgElement = canvas.querySelector('svg');
        if (svgElement) {
            this.enhanceSvg(svgElement);
        }

        // Normalize SVG elements
        const mappings = this.normalizeAnatomySvg(canvas);
        if (mappings && Object.keys(mappings).length > 0) {
            console.log(`✅ Mapped ${Object.keys(mappings).length} anatomical structures`);
        } else {
            console.warn('⚠️ No anatomical structures were mapped');
            if (layer === 'muscles') {
                const buttonContainer = document.createElement('div');
                buttonContainer.id = 'muscle-buttons';
                buttonContainer.style.cssText = 'margin-top:20px;';
                buttonContainer.innerHTML = `
                    <p style="text-align:center;color:#666;margin-bottom:12px;">Click on a muscle to learn more:</p>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;padding:0 16px;">
                        ${this.getMuscleButtons(view)}
                    </div>
                `;
                canvas.appendChild(buttonContainer);
                this.attachMuscleButtonHandlers();
            }
        }

        // Add fallback click handlers
        this.addFallbackClickHandlers(canvas);
    }

    /**
     * Enhance SVG with quality attributes
     */
    enhanceSvg(svgElement) {
        svgElement.setAttribute('shape-rendering', 'geometricPrecision');
        svgElement.setAttribute('text-rendering', 'geometricPrecision');
        svgElement.setAttribute('color-rendering', 'optimizeQuality');
        svgElement.setAttribute('image-rendering', 'optimizeQuality');
        svgElement.style.shapeRendering = 'auto';

        if (!svgElement.hasAttribute('viewBox')) {
            const width = svgElement.getAttribute('width') || '800';
            const height = svgElement.getAttribute('height') || '600';
            const numWidth = parseFloat(width);
            const numHeight = parseFloat(height);
            svgElement.setAttribute('viewBox', `0 0 ${numWidth} ${numHeight}`);
        }

        svgElement.removeAttribute('width');
        svgElement.removeAttribute('height');
        svgElement.style.width = '100%';
        svgElement.style.height = 'auto';
        svgElement.style.maxWidth = '700px';
        svgElement.style.display = 'block';
        svgElement.style.margin = '0 auto';
        svgElement.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))';
    }

    /**
     * Normalize SVG elements to match anatomy data
     */
    normalizeAnatomySvg(container) {
        try {
            if (!container) return;
            const svg = container.querySelector && container.querySelector('svg');
            if (!svg) return;

            if (!this.anatomyData || typeof this.anatomyData !== 'object') {
                console.debug('normalizeAnatomySvg: anatomyData not available yet');
                return;
            }

            // Build a map of normalized keys
            const keyMap = {};
            Object.keys(this.anatomyData).forEach(k => {
                const nk = (k || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
                if (nk) keyMap[nk] = k;
                keyMap[k] = k; // Also add original key
            });

            const allEls = svg.querySelectorAll('*');
            const mappings = {};

            allEls.forEach(el => {
                try {
                    if (el.getAttribute && el.getAttribute('data-structure')) return;

                    const candidateAttrs = [];
                    if (el.id) candidateAttrs.push(el.id);
                    const aria = el.getAttribute && el.getAttribute('aria-label');
                    if (aria) candidateAttrs.push(aria);
                    const dname = el.getAttribute && (el.getAttribute('data-name') || el.getAttribute('data-label'));
                    if (dname) candidateAttrs.push(dname);
                    const inks = el.getAttribute && el.getAttribute('inkscape:label');
                    if (inks) candidateAttrs.push(inks);
                    const titleEl = el.querySelector && el.querySelector('title');
                    if (titleEl && titleEl.textContent) candidateAttrs.push(titleEl.textContent.trim());
                    if (el.className && el.className.baseVal) {
                        candidateAttrs.push(el.className.baseVal);
                    }

                    if (candidateAttrs.length === 0) return;

                    const normalizedCandidates = candidateAttrs
                        .map(s => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, ''))
                        .filter(Boolean);
                    if (normalizedCandidates.length === 0) return;

                    let bestKey = null;
                    let bestMatchLen = 0;

                    // Try direct match first
                    for (const origCand of candidateAttrs) {
                        if (this.anatomyData[origCand]) {
                            bestKey = origCand;
                            bestMatchLen = origCand.length;
                            break;
                        }
                    }

                    if (!bestKey) {
                        // Try normalized matches
                        for (const cand of normalizedCandidates) {
                            if (keyMap[cand]) {
                                bestKey = keyMap[cand];
                                bestMatchLen = cand.length;
                                break;
                            }

                            // Substring matches
                            Object.keys(keyMap).forEach(k2 => {
                                if (!k2) return;
                                if (cand.includes(k2) || k2.includes(cand)) {
                                    if (k2.length > bestMatchLen) {
                                        bestMatchLen = k2.length;
                                        bestKey = keyMap[k2];
                                    }
                                }
                            });
                        }
                    }

                    if (bestKey) {
                        el.setAttribute('data-structure', bestKey);
                        el.style.cursor = 'pointer';
                        el.style.transition = 'opacity 0.2s, filter 0.2s';
                        el.setAttribute('tabindex', '0');
                        el.setAttribute('data-anatomy-bound', 'true');

                        // Add click handler
                        const clickHandler = (e) => {
                            e.stopPropagation();
                            this.showStructureInfo(bestKey);
                            eventBus.emit(EVENTS.ANATOMY_STRUCTURE_CLICKED, bestKey);
                        };

                        el.addEventListener('click', clickHandler);
                        el.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                clickHandler(e);
                            }
                        });

                        // Add hover effects
                        el.addEventListener('mouseenter', () => {
                            el.style.opacity = '0.8';
                            el.style.filter = 'brightness(1.2)';
                        });
                        el.addEventListener('mouseleave', () => {
                            el.style.opacity = '1';
                            el.style.filter = 'none';
                        });

                        mappings[bestKey] = true;
                    }
                } catch (err) {
                    console.debug('Error normalizing element:', err);
                }
            });

            return mappings;
        } catch (normErr) {
            console.error('❌ Anatomy SVG normalization failed:', normErr);
        }
    }

    /**
     * Add fallback click handlers for unbound elements
     */
    addFallbackClickHandlers(canvas) {
        const unboundClickable = canvas.querySelectorAll('[id]:not([data-anatomy-bound])');

        unboundClickable.forEach(el => {
            const key = el.id;
            if (!key || el.getAttribute('data-structure')) return;

            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            let hasMatch = false;

            if (this.anatomyData) {
                for (const dataKey of Object.keys(this.anatomyData)) {
                    const normalizedDataKey = dataKey.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (normalizedKey.includes(normalizedDataKey) || normalizedDataKey.includes(normalizedKey)) {
                        hasMatch = true;
                        break;
                    }
                }
            }

            if (hasMatch) {
                el.style.cursor = 'pointer';
                el.setAttribute('tabindex', '0');
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showStructureInfo(key);
                });
            }
        });
    }

    /**
     * Get muscle buttons HTML
     */
    getMuscleButtons(view) {
        const anteriorMuscles = [
            'pectoralis_major', 'deltoid', 'biceps', 'rectus_abdominis',
            'external_obliques', 'quadriceps', 'tibialis_anterior',
            'sternocleidomastoid', 'trapezius', 'serratus_anterior'
        ];

        const posteriorMuscles = [
            'trapezius', 'latissimus_dorsi', 'deltoid', 'triceps',
            'erector_spinae', 'gluteus_maximus', 'hamstrings',
            'gastrocnemius', 'soleus', 'rhomboids'
        ];

        const muscles = view === 'front' ? anteriorMuscles : posteriorMuscles;

        return muscles.map(muscleId => {
            const muscleData = this.anatomyData && this.anatomyData[muscleId];
            const muscleName = muscleData ? muscleData.commonName : muscleId.replace(/_/g, ' ');
            return `
                <button class="muscle-button" data-muscle="${muscleId}" 
                        style="padding:8px 12px;background:var(--primary-color);color:white;
                               border:none;border-radius:6px;cursor:pointer;font-size:13px;
                               transition:transform 0.2s,background 0.2s;">
                    ${muscleName}
                </button>
            `;
        }).join('');
    }

    /**
     * Attach handlers to muscle buttons
     */
    attachMuscleButtonHandlers() {
        const buttons = document.querySelectorAll('.muscle-button');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const muscleId = button.getAttribute('data-muscle');
                this.showStructureInfo(muscleId);
            });

            button.addEventListener('mouseenter', () => {
                button.style.transform = 'scale(1.05)';
                button.style.background = 'var(--button-hover, #0056b3)';
            });

            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
                button.style.background = 'var(--primary-color)';
            });
        });
    }

    /**
     * Search anatomy structures
     */
    searchAnatomy(query) {
        const q = (query || '').toLowerCase();
        const bodyMap = document.getElementById('bodyMap');
        if (!bodyMap) return;

        // Clear previous highlights
        const all = bodyMap.querySelectorAll('[data-structure], rect, path, text');
        all.forEach(el => {
            el.classList.remove('anatomy-highlight');
            if (el.tagName === 'rect' || el.tagName === 'path' || el.tagName === 'polygon') {
                if (el.getAttribute('data-original-fill')) {
                    el.setAttribute('fill', el.getAttribute('data-original-fill'));
                }
                el.style.strokeWidth = el.getAttribute('data-original-stroke-width') || el.style.strokeWidth || '';
            }
        });

        if (!q) return;

        // Find matches
        const matches = [];
        bodyMap.querySelectorAll('[data-structure], text').forEach(el => {
            const ds = (el.getAttribute('data-structure') || '').toLowerCase();
            const txt = (el.textContent || '').toLowerCase();
            if (ds.includes(q) || txt.includes(q)) {
                matches.push(el);
            }
        });

        if (matches.length === 0) {
            const structInfo = document.getElementById('structureInfo');
            if (structInfo) {
                structInfo.innerHTML = `<div style="color:#666">No structures found for "${query}"</div>`;
            }
            return;
        }

        // Highlight matches
        matches.forEach(el => {
            let target = el;
            if (el.tagName.toLowerCase() === 'text') {
                const ds = el.getAttribute('data-structure');
                if (ds) {
                    const rect = bodyMap.querySelector(`[data-structure="${ds}"]`);
                    if (rect) target = rect;
                }
            }

            if (target) {
                if (!target.getAttribute('data-original-fill') && target.getAttribute('fill')) {
                    target.setAttribute('data-original-fill', target.getAttribute('fill'));
                }
                if (!target.getAttribute('data-original-stroke-width') && target.getAttribute('stroke-width')) {
                    target.setAttribute('data-original-stroke-width', target.getAttribute('stroke-width'));
                }
                try {
                    target.setAttribute('fill', '#fff59d');
                    target.style.strokeWidth = '3px';
                    target.classList.add('anatomy-highlight');
                } catch (err) {}
            }
        });

        // Show info for first match
        const first = matches[0];
        const name = first.getAttribute('data-structure') || first.textContent || query;
        this.showStructureInfo(name, `Search result for "${query}"`);
    }

    /**
     * Show structure information
     */
    showStructureInfo(key, fallbackInfo) {
        const info = document.getElementById('structureInfo');
        if (!info) return;

        if (!this.anatomyData || !this.anatomyData[key]) {
            info.innerHTML = `
                <div class="anatomy-info-card">
                    <h3>${key.replace(/_/g, ' ')}</h3>
                    <p>${fallbackInfo || 'No detailed information available.'}</p>
                </div>
            `;
            return;
        }

        const data = this.anatomyData[key];
        const name = data.commonName || key.replace(/_/g, ' ');
        const desc = data.description || '';
        const func = data.function || '';
        const clinical = data.clinicalPearls || [];

        let html = `
            <div class="anatomy-info-card" style="animation: fadeIn 0.3s ease-in;">
                <h3 style="color:var(--primary-color);margin-bottom:12px;">${name}</h3>
        `;

        if (desc) {
            html += `<p style="margin-bottom:12px;line-height:1.6;">${desc}</p>`;
        }

        if (func) {
            html += `
                <div style="margin-bottom:12px;">
                    <strong style="color:var(--secondary-color);">Function:</strong>
                    <p style="margin-top:4px;line-height:1.6;">${func}</p>
                </div>
            `;
        }

        if (clinical && clinical.length > 0) {
            html += `
                <div style="background:rgba(255,193,7,0.1);padding:12px;border-radius:6px;border-left:4px solid #ffc107;">
                    <strong style="color:#f57c00;">Clinical Pearls:</strong>
                    <ul style="margin-top:8px;padding-left:20px;">
                        ${clinical.map(pearl => `<li style="margin-bottom:4px;">${pearl}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        html += `</div>`;
        info.innerHTML = html;
    }

    /**
     * Render programmatic anatomy map (fallback)
     */
    renderAnatomyMap() {
        const bodyMap = document.getElementById('bodyMap');
        if (!bodyMap) {
            console.error('❌ Body map container not found');
            return;
        }

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 200 400');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.maxWidth = '300px';
        svg.style.margin = '0 auto';
        svg.style.display = 'block';

        const structures = [
            { id: 'skull', name: 'Skull', x: 100, y: 30, width: 40, height: 35 },
            { id: 'spine', name: 'Spinal Column', x: 95, y: 70, width: 10, height: 200 },
            { id: 'ribs', name: 'Ribs', x: 70, y: 90, width: 60, height: 80 },
            { id: 'sternum', name: 'Sternum', x: 95, y: 100, width: 10, height: 40 },
            { id: 'humerus', name: 'Humerus', x: 50, y: 140, width: 15, height: 80 },
            { id: 'radius', name: 'Radius', x: 35, y: 200, width: 8, height: 60 },
            { id: 'ulna', name: 'Ulna', x: 45, y: 200, width: 8, height: 60 },
            { id: 'femur', name: 'Femur', x: 85, y: 220, width: 15, height: 100 },
            { id: 'tibia', name: 'Tibia', x: 85, y: 300, width: 10, height: 70 },
            { id: 'fibula', name: 'Fibula', x: 95, y: 300, width: 8, height: 70 },
            { id: 'patella', name: 'Patella', x: 90, y: 270, width: 8, height: 12 }
        ];

        structures.forEach(structure => {
            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', structure.x - structure.width / 2);
            rect.setAttribute('y', structure.y - structure.height / 2);
            rect.setAttribute('width', structure.width);
            rect.setAttribute('height', structure.height);
            rect.setAttribute('data-structure', structure.id);
            rect.setAttribute('fill', '#e3f2fd');
            rect.setAttribute('stroke', '#1976d2');
            rect.setAttribute('stroke-width', '2');
            rect.setAttribute('rx', '3');
            rect.style.cursor = 'pointer';
            rect.style.opacity = '0.7';

            rect.addEventListener('mouseover', () => {
                rect.style.opacity = '1';
                rect.setAttribute('fill', '#bbdefb');
            });

            rect.addEventListener('mouseout', () => {
                rect.style.opacity = '0.7';
                rect.setAttribute('fill', '#e3f2fd');
            });

            rect.addEventListener('click', () => {
                this.showStructureInfo(structure.id);
            });

            svg.appendChild(rect);

            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', structure.x);
            text.setAttribute('y', structure.y + structure.height / 2 + 15);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('data-structure', structure.id);
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', '#333');
            text.textContent = structure.name;
            svg.appendChild(text);
        });

        bodyMap.innerHTML = '';
        bodyMap.appendChild(svg);
    }
}

// Export singleton instance
export const anatomyManager = new AnatomyManager();
