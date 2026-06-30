/**
 * LabelManager v2 - DOM-based label system for MapLibre GL JS
 *
 * Two modes:
 * - Bound labels: DOM div appended as child of marker element → follows marker on drag automatically
 * - Standalone labels: maplibregl.Marker with a tooltip DOM element → positioned manually
 */

class LabelManager {
    constructor(engine, app) {
        this.engine = engine; // MapEngine instance
        this.app = app;
        this.labels = new Map(); // labelId → {type, element, visible, ...}
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    /**
     * Create a label
     * @param {string} elementType - point, circle, polygon, line-segment, isochrone, overpass
     * @param {object} element - Element data (id, name, area, distance, azimuth, etc.)
     * @param {object} options - {position, labelId, visible, color, marker (MapMarker), iconType}
     * @returns {string} labelId
     */
    createLabel(elementType, element, options = {}) {
        const config = this.getLabelConfig(elementType, options);
        const content = this.generateLabelContent(elementType, element, options);
        const labelId = options.labelId || `label_${elementType}_${element.id}`;

        // Build styled content
        let styledContent = content;
        if (options.color) {
            const bgColor = this.lightenColor(options.color, 85);
            styledContent = `<div style="background-color:${bgColor};color:${options.color};border-left:3px solid ${options.color};padding:3px 6px;border-radius:3px;">${content}</div>`;
        }

        const visible = options.visible !== undefined ? options.visible : true;

        if (options.marker && options.marker.getElement) {
            // ---- BOUND LABEL: child div of marker element ----
            const markerEl = options.marker.getElement();

            const labelEl = document.createElement('div');
            labelEl.className = `rhinomap-label ${config.className}`;
            labelEl.innerHTML = styledContent;
            labelEl.style.position = 'absolute';
            labelEl.style.whiteSpace = 'nowrap';
            labelEl.style.pointerEvents = 'none';
            labelEl.style.left = '50%';
            labelEl.style.width = 'max-content';

            if (config.direction === 'top') {
                labelEl.style.bottom = '100%';
                labelEl.style.transform = `translate(-50%, ${config.offset[1]}px)`;
            } else if (config.direction === 'center') {
                labelEl.style.top = '50%';
                labelEl.style.transform = `translate(-50%, -50%) translate(${config.offset[0]}px, ${config.offset[1]}px)`;
            } else {
                labelEl.style.transform = `translate(-50%, ${config.offset[1]}px)`;
            }

            if (!visible) labelEl.style.display = 'none';
            markerEl.appendChild(labelEl);

            this.labels.set(labelId, {
                mode: 'bound',
                element: labelEl,
                markerEl: markerEl,
                marker: options.marker,
                elementId: element.id,
                elementType: elementType,
                visible: visible,
                position: options.position || element.latlng || element.center
            });

        } else {
            // ---- STANDALONE LABEL: MapLibre marker with DOM tooltip ----
            const position = options.position || element.latlng || element.center;
            if (!position) {
                console.warn(`LabelManager: no position for standalone label ${labelId}`);
                return labelId;
            }

            const labelEl = document.createElement('div');
            labelEl.className = `rhinomap-label standalone ${config.className}`;
            labelEl.style.width = 'max-content';
            labelEl.innerHTML = styledContent;
            labelEl.style.pointerEvents = 'none';
            labelEl.style.whiteSpace = 'nowrap';

            const mlMarker = new maplibregl.Marker({
                element: labelEl,
                anchor: config.direction === 'top' ? 'bottom' : 'center',
                offset: config.offset
            });
            mlMarker.setLngLat([position.lng, position.lat]);

            if (visible) {
                mlMarker.addTo(this.engine.getMapLibreMap());
            }

            this.labels.set(labelId, {
                mode: 'standalone',
                element: labelEl,
                mlMarker: mlMarker,
                elementId: element.id,
                elementType: elementType,
                visible: visible,
                position: position
            });
        }

        return labelId;
    }

    /**
     * Register a standalone label created externally (e.g., by DrawingTool)
     */
    registerStandaloneLabel(labelId, mapMarker, element) {
        this.labels.set(labelId, {
            mode: 'standalone-external',
            element: element,
            mapMarker: mapMarker,
            visible: true
        });
    }

    updateLabel(labelId, newData) {
        const entry = this.labels.get(labelId);
        if (!entry) {
            console.warn(`⚠️ Label not found: ${labelId}`);
            return false;
        }

        const content = typeof newData === 'string'
            ? newData
            : this.generateLabelContent(entry.elementType, newData);

        entry.element.innerHTML = content;
        return true;
    }

    updateLabelColor(labelId, color, elementData) {
        const entry = this.labels.get(labelId);
        if (!entry) return false;

        const content = this.generateLabelContent(entry.elementType, elementData || {});
        const bgColor = this.lightenColor(color, 85);
        entry.element.innerHTML = `<div style="background-color:${bgColor};color:${color};border-left:3px solid ${color};padding:3px 6px;border-radius:3px;">${content}</div>`;
        return true;
    }

    setVisibility(labelId, visible) {
        const entry = this.labels.get(labelId);
        if (!entry) return false;

        if (visible && !entry.visible) {
            if (entry.mode === 'bound') {
                entry.element.style.display = '';
            } else if (entry.mode === 'standalone') {
                entry.mlMarker.addTo(this.engine.getMapLibreMap());
            }
            entry.visible = true;
        } else if (!visible && entry.visible) {
            if (entry.mode === 'bound') {
                entry.element.style.display = 'none';
            } else if (entry.mode === 'standalone') {
                entry.mlMarker.remove();
            }
            entry.visible = false;
        }
        return true;
    }

    toggleVisibility(labelId) {
        const entry = this.labels.get(labelId);
        if (!entry) return false;
        this.setVisibility(labelId, !entry.visible);
        return entry.visible;
    }

    isVisible(labelId) {
        const entry = this.labels.get(labelId);
        return entry ? entry.visible : null;
    }

    updatePosition(labelId, newPosition) {
        const entry = this.labels.get(labelId);
        if (!entry) return false;

        entry.position = newPosition;

        // Bound labels follow their marker — no manual update needed
        if (entry.mode === 'standalone' && entry.mlMarker) {
            entry.mlMarker.setLngLat([newPosition.lng, newPosition.lat]);
        }
        return true;
    }

    removeLabel(labelId) {
        const entry = this.labels.get(labelId);
        if (!entry) return false;

        if (entry.mode === 'bound') {
            entry.element.remove();
        } else if (entry.mode === 'standalone') {
            entry.mlMarker.remove();
        } else if (entry.mode === 'standalone-external') {
            if (entry.mapMarker && entry.mapMarker.remove) entry.mapMarker.remove();
        }

        this.labels.delete(labelId);
        return true;
    }

    getLabel(labelId) {
        return this.labels.get(labelId) || null;
    }

    getLabelsForElement(elementId) {
        const results = [];
        this.labels.forEach((entry, labelId) => {
            if (entry.elementId === elementId) {
                results.push({ labelId, entry, visible: entry.visible, elementType: entry.elementType });
            }
        });
        return results;
    }

    removeLabelsForElement(elementId) {
        const ids = [];
        this.labels.forEach((entry, labelId) => {
            if (entry.elementId === elementId) ids.push(labelId);
        });
        ids.forEach(id => this.removeLabel(id));
        return ids.length;
    }

    cleanup() {
        this.labels.forEach((entry) => this._removeEntry(entry));
        this.labels.clear();
    }

    _removeEntry(entry) {
        if (entry.mode === 'bound') {
            entry.element.remove();
        } else if (entry.mode === 'standalone' && entry.mlMarker) {
            entry.mlMarker.remove();
        }
    }

    cleanupOrphanedLabels() {
        // Not needed — all labels are tracked
        return 0;
    }

    // ---- Configuration ----

    getLabelConfig(elementType, options = {}) {
        const configs = {
            'point': {
                className: 'label-point',
                direction: 'top',
                offset: [0, options.iconType === 'pin' ? -38 : -8]
            },
            'line-segment': {
                className: 'label-segment',
                direction: 'center',
                offset: [0, 0]
            },
            'circle': {
                className: 'label-point',
                direction: 'top',
                offset: [0, -8]
            },
            'polygon': {
                className: 'label-polygon',
                direction: 'center',
                offset: [0, 0]
            },
            'isochrone': {
                className: 'label-isochrone',
                direction: 'top',
                offset: [0, -20]
            },
            'overpass': {
                className: 'label-overpass',
                direction: 'top',
                offset: [0, -6]
            }
        };
        return configs[elementType] || configs['point'];
    }

    generateLabelContent(elementType, element, options = {}) {
        const showLegend = element.showLegend !== undefined ? element.showLegend : true;
        const fmt = this.app;

        switch (elementType) {
            case 'point':
                return `<div class="point-name">${element.name || 'Point'}</div>`;

            case 'circle': {
                const areaInfo = showLegend && element.area
                    ? `<div class="label-info">${fmt ? fmt.formatArea(element.area) : GeoUtils.formatArea(element.area)}</div>`
                    : '';
                return `<div class="label-title">${element.name || 'Circle'}</div>${areaInfo}`;
            }

            case 'line-segment': {
                const dist = fmt ? fmt.formatDistance(element.distance) : GeoUtils.formatDistance(element.distance);
                const az = element.azimuth ? element.azimuth.toFixed(0) : '0';
                return `${dist} | ${az}°`;
            }

            case 'polygon': {
                const area = fmt ? fmt.formatArea(element.area) : GeoUtils.formatArea(element.area);
                const areaInfo = showLegend ? `<div class="label-info">${area}</div>` : '';
                return `<div class="label-title">${element.name || 'Polygone'}</div>${areaInfo}`;
            }

            case 'isochrone':
                return `<div class="label-title">${element.name || 'Isochrone'}</div>`;

            case 'overpass': {
                const color = options.color || element.color || '#3498db';
                return `<div style="color:${color};font-weight:bold;font-size:0.85em;">${element.name || 'Element'}</div>`;
            }

            default:
                return `<div>${element.name || 'Element'}</div>`;
        }
    }

    getStats() {
        const stats = { total: this.labels.size, visible: 0, hidden: 0, byType: {} };
        this.labels.forEach(entry => {
            if (entry.visible) stats.visible++; else stats.hidden++;
            const t = entry.elementType || 'unknown';
            stats.byType[t] = (stats.byType[t] || 0) + 1;
        });
        return stats;
    }
}

if (typeof window !== 'undefined') {
    window.LabelManager = LabelManager;
}
