/**
 * Icon Picker Modal
 * Allows users to select custom SVG icons for map markers
 */

class IconPicker {
    constructor() {
        // List of all available icons in /frontend/icons
        this.icons = [
            'aerialway', 'airfield', 'airport', 'alcohol-shop', 'american-football',
            'amusement-park', 'animal-shelter', 'aquarium', 'arrow', 'art-gallery',
            'attraction', 'bakery', 'bank', 'bank-JP', 'bar', 'barrier', 'baseball',
            'basketball', 'bbq', 'beach', 'beer', 'bicycle', 'bicycle-share',
            'blood-bank', 'bowling-alley', 'bridge', 'building', 'building-alt1',
            'bus', 'cafe', 'campsite', 'car', 'car-rental', 'car-repair', 'casino',
            'castle', 'castle-JP', 'caution', 'cemetery', 'cemetery-JP',
            'charging-station', 'cinema', 'circle', 'circle-stroked', 'city',
            'clothing-store', 'college', 'college-JP', 'commercial',
            'communications-tower', 'confectionery', 'construction', 'convenience',
            'cricket', 'cross', 'dam', 'danger', 'defibrillator', 'dentist',
            'diamond', 'doctor', 'dog-park', 'drinking-water', 'elevator', 'embassy',
            'emergency-phone', 'entrance', 'entrance-alt1', 'farm', 'fast-food',
            'fence', 'ferry', 'ferry-JP', 'fire-station', 'fire-station-JP',
            'fitness-centre', 'florist', 'fuel', 'furniture', 'gaming', 'garden',
            'garden-centre', 'gate', 'gift', 'globe', 'golf', 'grocery',
            'hairdresser', 'harbor', 'hardware', 'heart', 'heliport',
            'highway-rest-area', 'historic', 'home', 'horse-riding', 'hospital',
            'hospital-JP', 'hot-spring', 'ice-cream', 'industry', 'information',
            'jewelry-store', 'karaoke', 'landmark', 'landmark-JP', 'landuse',
            'laundry', 'library', 'lift-gate', 'lighthouse', 'lighthouse-JP',
            'lodging', 'logging', 'marae', 'marker', 'marker-stroked', 'mobile-phone',
            'monument', 'monument-JP', 'mountain', 'museum', 'music', 'natural',
            'nightclub', 'observation-tower', 'optician', 'paint', 'park',
            'park-alt1', 'parking', 'parking-garage', 'parking-paid', 'pharmacy',
            'picnic-site', 'pitch', 'place-of-worship', 'playground', 'police',
            'police-JP', 'post', 'post-JP', 'prison', 'racetrack', 'racetrack-boat',
            'racetrack-cycling', 'racetrack-horse', 'rail', 'rail-light',
            'rail-metro', 'ranger-station', 'recycling', 'religious-buddhist',
            'religious-christian', 'religious-jewish', 'religious-muslim',
            'religious-shinto', 'residential-community', 'restaurant',
            'restaurant-bbq', 'restaurant-noodle', 'restaurant-pizza',
            'restaurant-seafood', 'restaurant-sushi', 'road-accident', 'roadblock',
            'rocket', 'school', 'school-JP', 'scooter', 'shelter', 'shoe', 'shop',
            'skateboard', 'skiing', 'slaughterhouse', 'slipway', 'snowmobile',
            'soccer', 'square', 'square-stroked', 'stadium', 'star', 'star-stroked',
            'suitcase', 'swimming', 'table-tennis', 'taxi', 'teahouse', 'telephone',
            'tennis', 'terminal', 'theatre', 'toilet', 'toll', 'town', 'town-hall',
            'triangle', 'triangle-stroked', 'tunnel', 'veterinary', 'viewpoint',
            'village', 'volcano', 'volleyball', 'warehouse', 'waste-basket', 'watch',
            'water', 'waterfall', 'watermill', 'wetland', 'wheelchair', 'windmill',
            'zoo'
        ];

        this.modal = null;
        this.grid = null;
        this.searchInput = null;
        this.callback = null;
        this.currentColor = '#e74c3c'; // Default color
        this.svgCache = {}; // Cache for loaded SVG content
        this._fetchController = null; // AbortController for in-flight SVG fetches

        this.init();
    }

    init() {
        this.modal = document.getElementById('iconPickerModal');
        this.grid = document.getElementById('iconPickerGrid');
        this.searchInput = document.getElementById('iconSearchInput');
        const closeBtn = document.getElementById('iconPickerClose');

        if (!this.modal || !this.grid || !this.searchInput) {
            console.error('Icon picker elements not found');
            return;
        }

        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Search functionality
        this.searchInput.addEventListener('input', (e) => {
            this.filterIcons(e.target.value);
        });

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });

        // Render initial grid
        this.renderGrid();
    }

    /**
     * Render the icon grid
     */
    renderGrid(filter = '') {
        // Cancel any in-flight SVG fetches from previous render
        if (this._fetchController) this._fetchController.abort();
        this._fetchController = new AbortController();

        this.grid.innerHTML = '';
        const lowerFilter = filter.toLowerCase();

        // Filter icons
        const filteredIcons = this.icons.filter(icon =>
            icon.toLowerCase().includes(lowerFilter)
        );

        // Determine icon color based on background luminance
        const luminance = this.getLuminance(this.currentColor);
        const iconColor = luminance > 0.5 ? '#000000' : '#ffffff';

        // Create grid items
        filteredIcons.forEach(iconName => {
            const item = document.createElement('div');
            item.className = 'icon-picker-item';
            item.setAttribute('data-icon', iconName);

            // Load SVG and apply contrast color
            this.loadSVG(iconName, iconColor, this._fetchController.signal).then(svgContent => {
                item.innerHTML = `
                    <div style="
                        width: 48px;
                        height: 48px;
                        background-color: ${this.currentColor};
                        border-radius: 50%;
                        border: 2px solid white;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 8px;
                        margin-bottom: 0.25rem;
                    ">
                        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                            ${svgContent}
                        </div>
                    </div>
                    <div class="icon-name">${iconName}</div>
                `;
            }).catch(err => {
                console.warn(`Failed to load icon ${iconName}:`, err);
                item.innerHTML = `
                    <div style="
                        width: 48px;
                        height: 48px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 50%;
                        margin-bottom: 0.25rem;
                    "></div>
                    <div class="icon-name">${iconName}</div>
                `;
            });

            item.addEventListener('click', () => {
                this.selectIcon(iconName);
            });

            this.grid.appendChild(item);
        });
    }

    /**
     * Load an SVG file and apply color styling
     */
    async loadSVG(iconName, color, signal) {
        const cacheKey = `${iconName}_${color}`;

        // Check cache
        if (this.svgCache[cacheKey]) {
            return this.svgCache[cacheKey];
        }

        try {
            const response = await fetch(`icons/${iconName}.svg`, { signal });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            let svgContent = await response.text();

            // Apply color by adding fill attribute to SVG
            // This works by injecting the fill color into the path/shape elements
            svgContent = svgContent.replace(
                /<svg([^>]*)>/,
                `<svg$1 fill="${color}">`
            );

            // Cache it
            this.svgCache[cacheKey] = svgContent;

            return svgContent;
        } catch (error) {
            console.error(`Error loading SVG ${iconName}:`, error);
            throw error;
        }
    }

    /**
     * Filter icons by search term
     */
    filterIcons(searchTerm) {
        this.renderGrid(searchTerm);
    }

    /**
     * Select an icon
     */
    selectIcon(iconName) {
        if (this.callback) {
            this.callback(iconName);
        }
        this.closeModal();
    }

    /**
     * Open the modal
     * @param {string} color - The color to apply to icons (from layer)
     * @param {Function} callback - Callback when icon is selected
     */
    openModal(color = '#e74c3c', callback) {
        this.currentColor = color;
        this.callback = callback;
        this.svgCache = {}; // Clear cache when color changes

        // Clear search and re-render with new color
        this.searchInput.value = '';
        this.renderGrid();

        // Update title with i18n
        const title = document.getElementById('iconPickerTitle');
        if (title && window.i18n) {
            title.textContent = i18n.t('choose_icon');
        }

        // Update placeholder with i18n
        if (window.i18n) {
            this.searchInput.placeholder = i18n.t('search_icons');
        }

        // Show modal
        this.modal.classList.add('active');
    }

    /**
     * Close the modal
     */
    closeModal() {
        // Cancel any in-flight SVG fetches
        if (this._fetchController) this._fetchController.abort();
        this.modal.classList.remove('active');
        this.callback = null;
    }

    /**
     * Calculate luminance of a color to determine if white or black text should be used
     * @param {string} color - Hex color code
     * @returns {number} Luminance value (0-1)
     */
    getLuminance(color) {
        // Convert hex to RGB
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;

        // Calculate relative luminance
        const a = [r, g, b].map(v => {
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    // ============================================================
    // MapLibre-compatible methods (return DOM elements, no Leaflet)
    // ============================================================

    /**
     * Create a DOM element icon from an SVG (async)
     * @param {string} iconName
     * @param {string} color
     * @param {number} size
     * @returns {Promise<HTMLElement>}
     */
    async createIcon(iconName, color, size = 28) {
        const luminance = this.getLuminance(color);
        const iconColor = luminance > 0.5 ? '#000000' : '#ffffff';
        const svgContent = await this.loadSVG(iconName, iconColor);

        const el = document.createElement('div');
        el.className = 'custom-svg-marker-icon';
        el.style.cssText = `width:${size}px;height:${size}px;`;
        el.innerHTML = `<div style="
            width: ${size}px; height: ${size}px;
            background-color: ${color}; border-radius: 50%;
            border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center; padding: 4px;
        "><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${svgContent}</div></div>`;
        return el;
    }

    /**
     * Create a DOM element icon synchronously (placeholder, SVG loaded async)
     * @param {string} iconName
     * @param {string} color
     * @param {number} size
     * @returns {HTMLElement}
     */
    createIconSync(iconName, color, size = 32) {
        const el = document.createElement('div');
        el.className = 'custom-svg-marker-icon loading';
        el.style.cssText = `width:${size}px;height:${size}px;`;
        el.innerHTML = `<div style="
            width: ${size}px; height: ${size}px;
            display: flex; align-items: center; justify-content: center;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        "><div class="icon-loading" data-icon="${iconName}" data-color="${color}"></div></div>`;

        this.loadSVG(iconName, color).then(svgContent => {
            const loading = el.querySelector('.icon-loading');
            if (loading) loading.outerHTML = svgContent;
            el.classList.remove('loading');
        }).catch(err => {
            console.warn(`Failed to load icon ${iconName}:`, err);
        });

        return el;
    }

    /**
     * Create a simple colored circle DOM element (default marker)
     * @param {string} color
     * @param {number} size
     * @returns {HTMLElement}
     */
    static createDefaultIcon(color = '#e74c3c', size = 20) {
        const el = document.createElement('div');
        el.className = 'custom-marker-icon';
        el.style.cssText = `width:${size}px;height:${size}px;`;
        el.innerHTML = `<div style="
            background-color: ${color}; width: ${size}px; height: ${size}px;
            border-radius: 50%; border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>`;
        return el;
    }
}

// Helper function to create default marker icon (DOM element)
window.createDefaultMarkerIcon = function(color = '#e74c3c', size = 20) {
    return IconPicker.createDefaultIcon(color, size);
}

// Initialize the icon picker globally
window.iconPicker = new IconPicker();
