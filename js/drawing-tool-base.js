/**
 * DrawingTool - Abstract base class for all drawing tools in RhinoMap
 * Provides lifecycle management, shared helpers, and integration points
 */

class DrawingTool {
    /**
     * @param {object} app - Reference to main RhinoMapToolbox (for UI, data, context menu)
     * @param {MapEngine} engine - MapEngine instance
     * @param {LabelManager} labelManager - LabelManager instance
     * @param {LayersManager} layersManager - LayersManager instance
     */
    constructor(app, engine, labelManager, layersManager) {
        this.app = app;
        this.engine = engine;
        this.labelManager = labelManager;
        this.layersManager = layersManager;

        this._active = false;
        this._drawing = false;
        this._tempMarkers = [];   // MapMarker instances to clean up
        this._tempShapeIds = [];  // Shape IDs to clean up
        this._tempLabelIds = [];  // Standalone label marker IDs to clean up
    }

    /** Tool name for display/i18n */
    get name() { return 'tool'; }

    /** Whether this tool is currently active */
    get isActive() { return this._active; }

    /** Whether a multi-step drawing is in progress */
    get isDrawing() { return this._drawing; }

    // ============================================================
    // Lifecycle — called by app.js orchestrator
    // ============================================================

    /**
     * Activate this tool. Called when user selects it.
     * Override in subclass to add custom setup (e.g., show constraints panel).
     */
    activate() {
        this._active = true;
        this.engine.setCursor('crosshair');
    }

    /**
     * Deactivate this tool. Called when switching to another tool.
     * Cleans up all temp state. Override to add custom cleanup.
     */
    deactivate() {
        this.cancelDrawing();
        this._active = false;
        this.engine.setCursor('');
    }

    // ============================================================
    // Event hooks — routed by app.js
    // ============================================================

    /** Handle map click. Override in subclass. */
    onMapClick(latlng, originalEvent) {}

    /** Handle mouse move. Override for live preview. */
    onMapMouseMove(latlng) {}

    /** Handle double-click. Default: finish drawing. */
    onMapDoubleClick(latlng) {
        if (this._drawing) this.finishDrawing();
    }

    /** Handle right-click. Default: finish drawing if active. */
    onMapRightClick(latlng, originalEvent) {
        if (this._drawing) {
            this.finishDrawing();
        }
    }

    /** Handle keyboard events (e.g., Escape to cancel). */
    onKeyDown(event) {
        if (event.key === 'Escape') {
            this.cancelDrawing();
        }
    }

    // ============================================================
    // Drawing lifecycle
    // ============================================================

    /**
     * Finish the current drawing. Must be implemented by subclass.
     */
    finishDrawing() {
        // Override in subclass
    }

    /**
     * Cancel the current drawing, remove all temp elements
     */
    cancelDrawing() {
        this.clearTempElements();
        this._drawing = false;
    }

    // ============================================================
    // Temporary elements management
    // ============================================================

    /**
     * Track a temporary marker for cleanup
     * @param {MapMarker} marker
     */
    addTempMarker(marker) {
        this._tempMarkers.push(marker);
    }

    /**
     * Track a temporary shape for cleanup
     * @param {string} shapeId
     */
    addTempShape(shapeId) {
        this._tempShapeIds.push(shapeId);
    }

    /**
     * Remove all temporary elements from the map
     */
    clearTempElements() {
        this._tempMarkers.forEach(m => m.remove());
        this._tempMarkers = [];

        this._tempShapeIds.forEach(id => this.engine.removeShape(id));
        this._tempShapeIds = [];

        this._tempLabelIds.forEach(id => {
            // Standalone label markers
            if (this.labelManager) this.labelManager.removeLabel(id);
        });
        this._tempLabelIds = [];
    }

    // ============================================================
    // Shared helpers
    // ============================================================

    /**
     * Create a draggable helper point (vertex marker for lines, polygons, circles)
     * @param {{lat: number, lng: number}} latlng
     * @param {string} name - Display name
     * @param {string} type - 'segment', 'polygon-point', 'circle-center', 'start', 'line-point'
     * @param {string|null} color - Hex color (default: current layer color)
     * @param {string|null} existingId - Reuse an existing ID
     * @returns {object} pointData
     */
    createHelperPoint(latlng, name, type, color = null, existingId = null) {
        if (!color) {
            const layer = this.layersManager ? this.layersManager.getCurrentLayer() : null;
            color = layer ? layer.color : '#e74c3c';
        }

        // Create DOM element for the marker
        const el = document.createElement('div');
        el.className = 'custom-marker-icon';
        el.innerHTML = `<div style="
            background-color: ${color};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>`;
        el.style.width = '20px';
        el.style.height = '20px';

        const marker = this.engine.createMarker(latlng, {
            element: el,
            draggable: true
        });

        marker.addTo(this.engine);

        const pointData = {
            id: existingId || (Date.now() + Math.random()),
            latlng: { ...latlng },
            name: name,
            type: type,
            marker: marker,
            label: null,
            color: color,
            iconType: 'circle',
            iconName: null,
            isHelperPoint: true
        };

        // Create label (hidden by default for helper points)
        if (this.labelManager) {
            const label = this.labelManager.createLabel('point', pointData, {
                position: latlng,
                visible: false,
                labelId: `label_point_${pointData.id}`,
                marker: marker,
                color: color
            });
            pointData.label = label;
        }

        // Wire drag events (throttled to ~30fps to avoid lag with many connected elements)
        marker.on('dragstart', () => {
            if (this.app) this.app.isDragging = true;
            pointData._lastDragUpdate = 0;
        });

        marker.on('drag', (e) => {
            pointData.latlng = e.latlng;
            const now = performance.now();
            if (now - (pointData._lastDragUpdate || 0) < 33) return; // ~30fps
            pointData._lastDragUpdate = now;
            if (this.app && this.app.updateConnectedElements) {
                this.app.updateConnectedElements(pointData, e.latlng);
            }
        });

        marker.on('dragend', (e) => {
            if (this.app) this.app.isDragging = false;
            pointData.latlng = e.latlng;
            if (this.app) {
                if (this.app.updateConnectedElements) {
                    this.app.updateConnectedElements(pointData, e.latlng);
                }
                if (this.app.saveToLocalStorage) this.app.saveToLocalStorage();
            }
        });

        // Context menu
        marker.on('contextmenu', (e) => {
            if (e.originalEvent) e.originalEvent.preventDefault();
            if (this.app && !this.app.isDragging) {
                this.app.showUnifiedContextMenu(
                    e.originalEvent.clientX, e.originalEvent.clientY,
                    pointData, 'point'
                );
            }
        });

        // Double-click to rename
        marker.on('dblclick', (e) => {
            if (this.app && this.app.renamePoint) {
                this.app.renamePoint(pointData);
            }
        });

        return pointData;
    }

    /**
     * Create a standalone label (not bound to any marker)
     * Used for segment measurements, polygon areas, etc.
     * @param {{lat: number, lng: number}} position
     * @param {string} content - HTML content
     * @param {object} options - { className, labelId, color }
     * @returns {string} Label ID
     */
    createStandaloneLabel(position, content, options = {}) {
        const el = document.createElement('div');
        el.className = `rhinomap-label standalone ${options.className || ''}`.trim();
        el.innerHTML = content;
        el.style.pointerEvents = 'none';

        const marker = this.engine.createMarker(position, {
            element: el,
            anchor: 'center'
        });
        marker.addTo(this.engine);

        const labelId = options.labelId || `label_${Date.now()}`;

        // Store in a way LabelManager can track
        if (this.labelManager) {
            this.labelManager.registerStandaloneLabel(labelId, marker, el);
        }

        return labelId;
    }

    /**
     * Add finalized element to the layer system
     * @param {object} elementData
     * @param {string} type - 'point', 'line', 'circle', 'polygon', 'isochrone'
     */
    addToLayer(elementData, type) {
        if (!this.layersManager) return;
        const layer = this.layersManager.getCurrentLayer();
        if (!layer) return;

        const layerElement = {
            id: elementData.id,
            type: type,
            name: elementData.name || `${type} ${elementData.id}`,
            data: elementData,
            properties: elementData.properties || {},
            showName: elementData.showName !== undefined ? elementData.showName : true
        };

        this.layersManager.addElement(layer.id, layerElement);
    }

    /**
     * Utility: get current layer color
     * @returns {string} Hex color
     */
    getLayerColor() {
        if (this.layersManager) {
            const layer = this.layersManager.getCurrentLayer();
            if (layer) return layer.color;
        }
        return '#e74c3c';
    }
}

if (typeof window !== 'undefined') {
    window.DrawingTool = DrawingTool;
}
