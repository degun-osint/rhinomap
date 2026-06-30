class RhinoMapToolbox {
    constructor() {
        this.engine = null;     // MapEngine instance
        this.map = null;        // Alias for engine (backward compat for layers-manager etc.)
        this.currentTool = null; // Tool name string
        this.currentToolInstance = null; // DrawingTool instance
        this.currentLayer = 'osm';
        this.layers = {};
        this.data = {
            points: [],
            lines: [],
            circles: [],
            polygons: [],
            isochrones: [],
            aiGeolocation: []
        };
        this.tempElements = [];
        this.isDrawing = false;
        this.currentLine = null;
        this.trianglePoints = [];

        // Contraintes de tracé
        this.constraints = {
            distanceLocked: false,
            azimuthLocked: false,
            lockedDistance: null,
            lockedAzimuth: null
        };

        // Performance optimization
        this.lastUpdateTime = 0;
        this.lastCircleUpdate = 0;
        this.lastCoordinatesUpdate = 0;
        this.updateThrottle = 50;
        this.coordinatesThrottle = 100;
        this.rafPending = false;

        // Cached DOM references
        this._toolButtons = null;

        // Tool instances (initialized after engine is ready)
        this.tools = {};

        this.init();
    }

    init() {
        this.initMap();
        this.initEventListeners();
        this._toolButtons = document.querySelectorAll('.tool-btn, .tool-sidebar-btn');
        this.updateCostLabel();

        // NOTE: loadFromLocalStorage() is now called AFTER LayersManager is initialized
        this.updateInfo('Carte initialisée', 'Initialisation du système de layers...');
    }

    /**
     * Add layer/element highlighting on marker click
     * @param {MapMarker|object} mapObject - Map object
     * @param {string} layerId - Layer ID
     * @param {string} elementId - Element ID
     */
    attachLayerHighlighting(mapObject, layerId, elementId) {
        if (!mapObject || !layerId || !elementId) return;

        mapObject._rhinoLayerId = layerId;
        mapObject._rhinoElementId = elementId;

        mapObject.on('click', () => {
            if (window.highlightLayerAndElement) {
                window.highlightLayerAndElement(layerId, elementId);
            }
        });
    }

    /**
     * Create popup content with GPS coordinates and copy button
     * @param {string} name - Name to display in popup
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {string} additionalContent - Optional additional HTML content
     * @returns {string} HTML content for popup
     */
    createCoordinatesPopupContent(name, lat, lng, additionalContent = '') {
        const copyId = `copy-coords-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        let html = `<strong>${name}</strong><br>`;
        html += `<div class="popup-coords-container">`;
        html += `<span class="popup-coords-text">Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</span>`;
        html += `<button id="${copyId}" class="copy-coords-btn" title="${i18n.t('copy_coordinates')}" data-lat="${lat}" data-lng="${lng}">`;
        html += `<i class="iconoir-copy"></i>`;
        html += `</button>`;
        html += `</div>`;

        if (additionalContent) {
            html += additionalContent;
        }

        return html;
    }

    /**
     * Update the popup content of a point marker with new coordinates
     * @param {object} pointData - The point data object containing marker, name, latlng
     */
    updatePointPopup(pointData) {
        if (!pointData || !pointData.marker) return;

        const additionalContent = pointData.type === 'standalone'
            ? `<br><small>${i18n.t('click_name_to_rename')}</small>`
            : '';

        const newContent = this.createCoordinatesPopupContent(
            pointData.name,
            pointData.latlng.lat,
            pointData.latlng.lng,
            additionalContent
        );

        pointData.marker.setPopupContent(newContent);
    }

    /**
     * Attach click-through handler to a shape
     * In MapLibre, map clicks propagate through shapes automatically — this is a no-op
     */
    attachClickThroughHandler(shape) {
        // No-op in MapLibre — clicks propagate to map by default
    }

    initMap() {
        // MapLibre GL JS via MapEngine + OpenFreeMap vector tiles
        this.engine = new MapEngine('map', {
            center: { lat: 46.603354, lng: 1.888334 },
            zoom: 5,
            style: 'https://tiles.openfreemap.org/styles/liberty'
        });

        // Backward compat alias (used by layers-manager, overpass, etc.)
        this.map = this.engine;

        this.labelManager = new LabelManager(this.engine, this);

        // Initialize drawing tools (after engine + labelManager are ready)
        this.engine.onReady(() => {
            setTimeout(() => this._initTools(), 0);
        });

        // Map events → route to tools or app handlers
        this.engine.on('mousemove', (e) => {
            this.updateCoordinates(e.latlng);
            if (this.currentToolInstance && this.currentToolInstance.isDrawing) {
                this.currentToolInstance.onMapMouseMove(e.latlng);
            }
        });

        this.engine.on('click', (e) => {
            this.handleMapClick(e);
        });

        this.engine.on('dblclick', (e) => {
            this.handleMapDoubleClick(e);
        });

        this.engine.on('contextmenu', (e) => {
            this.handleMapRightClick(e);
        });
    }

    _initTools() {
        const lm = this.labelManager;
        const wlm = window.layersManager;
        this.tools = {
            point: new PointTool(this, this.engine, lm, wlm),
            line: new LineTool(this, this.engine, lm, wlm),
            circle: new CircleTool(this, this.engine, lm, wlm),
            polygon: new PolygonTool(this, this.engine, lm, wlm),
            isochrone: new IsochroneTool(this, this.engine, lm, wlm)
        };
    }

    initEventListeners() {
        // Helper function to safely add event listeners
        const safeAddListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            }
        };

        // Outils (check if elements exist for v2 compatibility)
        safeAddListener('point-tool', 'click', () => this.selectTool('point'));
        safeAddListener('line-tool', 'click', () => this.selectTool('line'));
        safeAddListener('circle-tool', 'click', () => this.selectTool('circle'));
        safeAddListener('polygon-tool', 'click', () => this.selectTool('polygon'));
        safeAddListener('isochrone-tool', 'click', () => this.selectTool('isochrone'));
        safeAddListener('clear-tool', 'click', () => this.clearAll());

        // Couches
        safeAddListener('map-layer', 'click', () => this.switchLayer('osm'));
        safeAddListener('satellite-layer', 'click', () => this.switchLayer('satellite'));
        safeAddListener('3d-layer', 'click', () => this.switchLayer('3d'));

        // Import/Export
        safeAddListener('import-btn', 'click', () => this.importData());
        safeAddListener('export-btn', 'click', (e) => this.toggleExportMenu(e));
        safeAddListener('clear-storage-btn', 'click', () => this.clearLocalStorage());

        // Export menu options
        document.querySelectorAll('.export-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.dataset.format;
                this.exportData(format);
                this.hideExportMenu();
            });
        });

        // Fermer le menu export si on clique ailleurs
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.export-dropdown')) {
                this.hideExportMenu();
            }
        });

        // Search
        safeAddListener('search-btn', 'click', () => this.performSearch());
        safeAddListener('search-input', 'keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
        safeAddListener('file-input', 'change', (e) => this.loadFile(e));

        // Système d'édition moderne
        this.currentEditElement = null;
        this.isDragging = false;
        this.setupModernEditSystem();

        // Panneau de contraintes
        safeAddListener('constraints-tool', 'click', () => this.togglePanel());
        safeAddListener('panel-toggle', 'click', () => this.togglePanel());
        safeAddListener('reset-constraints', 'click', () => this.resetConstraints());
        safeAddListener('finish-line', 'click', () => {
            if (this.tools.line && this.tools.line.isDrawing) this.tools.line.finishDrawing();
        });

        // Écouter les changements de contraintes en temps réel
        safeAddListener('lock-distance-sidebar', 'change', () => this.updateConstraintsRealTime());
        safeAddListener('lock-azimuth-sidebar', 'change', () => this.updateConstraintsRealTime());
        safeAddListener('distance-value-sidebar', 'input', () => this.updateConstraintsRealTime());
        safeAddListener('azimuth-value-sidebar', 'input', () => this.updateConstraintsRealTime());

        // Modal de nommage des points
        safeAddListener('cancel-point', 'click', () => this.closePointNameModal());
        safeAddListener('confirm-point', 'click', () => this.confirmPointName());
        safeAddListener('simple-modal-overlay', 'click', () => this.closePointNameModal());
        safeAddListener('point-name-input', 'keypress', (e) => {
            if (e.key === 'Enter') {
                this.confirmPointName();
            }
        });

        // Panneau isochrones
        // Note: isochrone panel is now in the sidebar (no separate toggle button)
        safeAddListener('cancel-isochrone-sidebar', 'click', () => {
            if (this.tools.isochrone) this.tools.isochrone.cancelDrawing();
            this.selectTool(null);
        });
        safeAddListener('calculate-isochrone-sidebar', 'click', () => {
            if (this.tools.isochrone) this.tools.isochrone.calculate();
        });

        // Mise à jour dynamique du label selon le mode de calcul
        safeAddListener('calc-mode-sidebar', 'change', () => this.updateCostLabel());
        safeAddListener('time-unit-sidebar', 'change', () => this.updateCostLabel());

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === 'Escape') {
                this.cancelCurrentAction();
            }

            if (e.key === 'v' || e.key === 'V') {
                e.preventDefault();
                this.selectTool('pan');
            }

            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                this.selectTool('point');
            }

            if (e.key === 'l' || e.key === 'L') {
                e.preventDefault();
                this.selectTool('line');
            }

            if (e.key === 'c' || e.key === 'C') {
                e.preventDefault();
                this.selectTool('circle');
            }

            if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                this.selectTool('isochrone');
            }

            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                if (this.currentTool === 'line') {
                    this.togglePanel();
                }
            }
        });
    }

    selectTool(tool) {
        // Désactiver l'outil précédent
        (this._toolButtons || document.querySelectorAll('.tool-btn, .tool-sidebar-btn')).forEach(btn => btn.classList.remove('active'));

        // Deactivate current tool instance
        if (this.currentToolInstance) {
            this.currentToolInstance.deactivate();
            this.currentToolInstance = null;
        }

        if (tool === 'pan' || !tool) {
            const panBtn = document.getElementById('pan-tool');
            if (panBtn) panBtn.classList.add('active');
            this.currentTool = null;
            this.engine.setCursor('');
            this.updateInfo(i18n.t('pan_tool') || 'Pan Map', i18n.t('pan_tool_desc') || 'Navigate and interact with the map');
            return;
        }

        const toolBtn = document.getElementById(tool + '-tool');
        if (toolBtn) toolBtn.classList.add('active');

        this.currentTool = tool;

        // Activate tool instance
        if (this.tools[tool]) {
            // Ensure tools have fresh reference to layersManager
            this.tools[tool].layersManager = window.layersManager;
            this.currentToolInstance = this.tools[tool];
            this.currentToolInstance.activate();
        }

        this.updateInfo(this.getCurrentToolName(), this.getCurrentToolDescription());
    }

    updateInfo(title, description) {
        const infoContent = document.getElementById('info-content');
        if (!infoContent) return;
        infoContent.innerHTML = `
            <div class="info-item"><strong>Outil:</strong> ${title}</div>
            <div class="info-item">${description}</div>
            <div class="info-item"><strong>Stats:</strong> Points: ${this.data.points.length} | Traits: ${this.data.lines.length} | Cercles: ${this.data.circles.length} | Polygones: ${this.data.polygons.length}</div>
        `;
    }

    getCurrentToolName() {
        const names = { point: 'Points nommés', line: 'Tracé mesuré', circle: 'Zone circulaire', polygon: 'Aire polygone', isochrone: 'Isochrones' };
        return names[this.currentTool] || 'Aucun outil';
    }

    getCurrentToolDescription() {
        const desc = {
            point: 'Cliquez sur la carte pour placer et nommer un point',
            line: 'Cliquez pour commencer un tracé avec mesures',
            circle: 'Cliquez sur un point central puis déplacez pour définir le rayon',
            polygon: 'Cliquez pour commencer un polygone de calcul d\'aire',
            isochrone: 'Cliquez sur la carte pour sélectionner un point de départ'
        };
        return desc[this.currentTool] || 'Sélectionnez un outil pour commencer';
    }

    deselectTool() {
        this.selectTool(null);
    }

    /**
     * Add element to current active layer (if layers system is available)
     */
    addToLayer(element, type) {
        if (!window.layersManager) {
            console.error('❌ LayersManager NOT AVAILABLE - element will NOT be saved!');
            return;
        }

        const currentLayer = window.layersManager.getCurrentLayer();

        if (!currentLayer) {
            console.error('❌ No current layer - element will NOT be saved!');
            return;
        }

        const layerElement = {
            id: element.id,
            type: type,
            name: element.name || `${type} ${element.id}`,
            mapObject: element.mapObject || element.marker || element.polyline || element.polygon || element.circle,
            data: element,
            properties: element.properties || {},
            showName: element.showName !== undefined ? element.showName : true  // Default to visible
        };


        window.layersManager.addElement(currentLayer.id, layerElement);
    }

    switchLayer(layer) {
        document.querySelectorAll('.map-layer-btn').forEach(btn => btn.classList.remove('active'));

        if (layer === 'osm') {
            document.getElementById('map-layer').classList.add('active');
            this.engine.disableSatellite();
            this.engine.setStyleUrl('https://tiles.openfreemap.org/styles/liberty');
        } else if (layer === 'satellite') {
            document.getElementById('satellite-layer').classList.add('active');
            this.engine.enableSatellite();
        } else if (layer === '3d') {
            document.getElementById('3d-layer').classList.add('active');
            this.engine.disableSatellite();
            this.engine.setStyleUrl('https://tiles.openfreemap.org/styles/liberty');
            this.engine.enable3D();
        }

        // Disable 3D if switching away from it
        if (layer !== '3d') {
            this.engine.disable3D();
        }

        this.currentLayer = layer;
    }

    handleMapClick(e) {
        const latlng = e.latlng;
        const originalEvent = e.originalEvent;

        // Ctrl+clic pour finir un tracé
        if (originalEvent && originalEvent.ctrlKey && this.currentToolInstance && this.currentToolInstance.isDrawing) {
            this.currentToolInstance.finishDrawing();
            return;
        }

        // Route to active tool
        if (this.currentToolInstance) {
            this.currentToolInstance.onMapClick(latlng, originalEvent);
        }
    }

    handleMapDoubleClick(e) {
        if (this.currentToolInstance && this.currentToolInstance.isDrawing) {
            this.currentToolInstance.onMapDoubleClick(e.latlng);
        }
    }

    handleMapRightClick(e) {
        if (e.originalEvent) e.originalEvent.preventDefault();

        // Si un tracé est en cours, le finir
        if (this.currentToolInstance && this.currentToolInstance.isDrawing) {
            this.currentToolInstance.finishDrawing();
            return;
        }

        // Sinon, menu contextuel de la carte
        this.showMapContextMenu(e.originalEvent.clientX, e.originalEvent.clientY, e.latlng);
    }

    /**
     * Show context menu for map (right-click on empty area)
     */
    showMapContextMenu(x, y, latlng) {
        // Store the clicked position for later use
        this.contextMenuLatLng = latlng;

        const menuHTML = `
            <div class="context-menu-item" data-action="create-point" data-lat="${latlng.lat}" data-lng="${latlng.lng}">
                <i class="iconoir-pin"></i>
                <span>${i18n.t('ctx_add_point')}</span>
            </div>
            <div class="context-menu-item" data-action="create-line" data-lat="${latlng.lat}" data-lng="${latlng.lng}">
                <i class="iconoir-ruler"></i>
                <span>${i18n.t('ctx_start_line')}</span>
            </div>
            <div class="context-menu-item" data-action="create-circle" data-lat="${latlng.lat}" data-lng="${latlng.lng}">
                <i class="iconoir-circle"></i>
                <span>${i18n.t('ctx_start_circle')}</span>
            </div>
            <div class="context-menu-item" data-action="create-polygon" data-lat="${latlng.lat}" data-lng="${latlng.lng}">
                <i class="iconoir-hexagon"></i>
                <span>${i18n.t('ctx_start_polygon')}</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="create-isochrone" data-lat="${latlng.lat}" data-lng="${latlng.lng}">
                <i class="iconoir-timer"></i>
                <span>${i18n.t('ctx_calc_isochrone')}</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="copy-coordinates" data-lat="${latlng.lat}" data-lng="${latlng.lng}">
                <i class="iconoir-copy"></i>
                <span>${i18n.t('copy_coordinates')}</span>
            </div>
        `;

        if (window.showContextMenu) {
            window.showContextMenu(menuHTML, x, y);
            this.attachMapContextMenuHandlers();
        }
    }

    /**
     * Attach click handlers to map context menu items
     */
    attachMapContextMenuHandlers() {
        // Small delay to ensure menu is in DOM
        setTimeout(() => {
            const menu = document.querySelector('.layers-context-menu');
            if (!menu) return;

            const items = menu.querySelectorAll('.context-menu-item');
            items.forEach(item => {
                const action = item.dataset.action;
                const lat = parseFloat(item.dataset.lat);
                const lng = parseFloat(item.dataset.lng);

                if (!action) return;

                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.closeContextMenu) {
                        window.closeContextMenu();
                    }

                    const latlng = { lat, lng };

                    setTimeout(() => {
                        switch(action) {
                            case 'create-point':
                                this.createPointAtLocation(latlng);
                                break;
                            case 'create-line':
                                this.startLineAtLocation(latlng);
                                break;
                            case 'create-circle':
                                this.startCircleAtLocation(latlng);
                                break;
                            case 'create-polygon':
                                this.startPolygonAtLocation(latlng);
                                break;
                            case 'create-isochrone':
                                this.startIsochroneAtLocation(latlng);
                                break;
                            case 'copy-coordinates':
                                this.copyCoordinatesToClipboard(lat, lng);
                                break;
                        }
                    }, 10);
                });
            });
        }, 10);
    }

    /**
     * Create a point at the specified location (from context menu)
     */
    createPointAtLocation(latlng) {
        const name = `Point ${this.data.points.length + 1}`;
        if (this.tools.point) {
            this.tools.point.createPoint(latlng, name);
        }
        showToast(i18n.t('point_created'), 'success');
    }

    /**
     * Start a line at the specified location (from context menu)
     */
    startLineAtLocation(latlng) {
        this.selectTool('line');
        if (this.currentToolInstance) this.currentToolInstance.onMapClick(latlng);
        showToast(i18n.t('line_started'), 'info');
    }

    startCircleAtLocation(latlng) {
        this.selectTool('circle');
        if (this.currentToolInstance) this.currentToolInstance.onMapClick(latlng);
        showToast(i18n.t('circle_started'), 'info');
    }

    startPolygonAtLocation(latlng) {
        this.selectTool('polygon');
        if (this.currentToolInstance) this.currentToolInstance.onMapClick(latlng);
        showToast(i18n.t('polygon_started'), 'info');
    }

    startIsochroneAtLocation(latlng) {
        this.selectTool('isochrone');
        if (this.currentToolInstance) this.currentToolInstance.onMapClick(latlng);
    }

    /**
     * Copy coordinates to clipboard
     */
    copyCoordinatesToClipboard(lat, lng) {
        const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        navigator.clipboard.writeText(coords).then(() => {
            showToast(i18n.t('coordinates_copied'), 'success');
        }).catch(err => {
            console.error('Failed to copy coordinates:', err);
            showError(i18n.t('copy_failed'));
        });
    }

    handleFinishDrawing() {
        if (this.currentToolInstance && this.currentToolInstance.isDrawing) {
            this.currentToolInstance.finishDrawing();
        }
    }

    openPointNameModal(pointData = null, isEditMode = false) {
        const modal = document.getElementById('point-name-modal');
        const overlay = document.getElementById('simple-modal-overlay');
        const input = document.getElementById('point-name-input');
        const title = document.getElementById('modal-title');

        if (isEditMode && pointData) {
            // Mode édition
            title.textContent = 'Renommer le point';
            input.value = pointData.name;
            this.currentEditingPoint = pointData;
            this.currentEditingPointId = null; // On utilise directement pointData
            this.tempPointLocation = null;
        } else {
            // Mode création
            title.textContent = 'Nommer le point';
            input.value = '';
            this.currentEditingPoint = null;
            this.currentEditingPointId = null;
        }

        modal.classList.remove('hidden');
        overlay.classList.remove('hidden');

        // Focus sur l'input avec un délai pour l'animation
        setTimeout(() => input.focus(), 100);
    }

    closePointNameModal() {
        const modal = document.getElementById('point-name-modal');
        const overlay = document.getElementById('simple-modal-overlay');
        const title = document.getElementById('modal-title');

        modal.classList.add('hidden');
        overlay.classList.add('hidden');
        title.textContent = 'Nommer le point'; // Reset le titre

        // Nettoyer les variables d'état
        this.tempPointLocation = null;
        this.currentEditingPointId = null;
    }

    confirmPointName() {
        const input = document.getElementById('point-name-input');
        const pointName = input.value.trim() || `Point ${this.data.points.length + 1}`;

        if (this.currentEditingPoint) {
            // Mode modification
            this.currentEditingPoint.name = pointName;
            // Update label via LabelManager
            const labelId = `label_point_${this.currentEditingPoint.id}`;
            if (this.labelManager) {
                this.labelManager.updateLabel(labelId, { name: pointName });
            }
            this.closePointNameModal();
        } else if (this.currentEditingPointId) {
            this.renamePoint(this.currentEditingPointId, pointName);
            this.closePointNameModal();
        } else if (this.tempPointLocation) {
            // Mode création — delegate to PointTool
            if (this.tools.point) {
                this.tools.point.createPoint(this.tempPointLocation, pointName);
            }
            this.closePointNameModal();
        }
    }

    renamePoint(pointId, newName) {
        // Chercher dans tous les types de points
        let pointData = null;
        let container = null;

        // Points autonomes
        pointData = this.data.points.find(p => p.id === pointId);
        if (pointData) {
            container = 'standalone';
        }

        // Points dans les tracés
        if (!pointData) {
            for (let line of this.data.lines) {
                if (line.pointData) {
                    pointData = line.pointData.find(p => p.id === pointId);
                    if (pointData) {
                        container = line;
                        break;
                    }
                }
            }
        }

        // Points dans les cercles
        if (!pointData) {
            for (let circle of this.data.circles) {
                if (circle.centerPointData && circle.centerPointData.id === pointId) {
                    pointData = circle.centerPointData;
                    container = circle;
                    break;
                }
            }
        }

        // Points dans les polygones
        if (!pointData) {
            for (let polygon of this.data.polygons) {
                if (polygon.pointData) {
                    pointData = polygon.pointData.find(p => p.id === pointId);
                    if (pointData) {
                        container = polygon;
                        break;
                    }
                }
            }
        }

        if (pointData) {
            pointData.name = newName;

            this.labelManager.updateLabel(`label_point_${pointData.id}`, pointData);

            if (pointData.marker) {
                const additionalContent = `<br><small>Clic sur le nom pour renommer</small>`;
                pointData.marker.bindPopup(
                    this.createCoordinatesPopupContent(newName, pointData.latlng.lat, pointData.latlng.lng, additionalContent)
                );
            }

            this.updateInfo('Point renommé', `"${newName}"`);
        }
    }





    calculatePolygonArea(points) {
        if (points.length < 3) return 0;

        // Formule de Shoelace pour calculer l'aire d'un polygone
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].lng * points[j].lat;
            area -= points[j].lng * points[i].lat;
        }
        area = Math.abs(area) / 2;

        // Convertir en m² (approximation pour petites surfaces)
        const metersPerDegree = 111320; // À l'équateur
        return area * metersPerDegree * metersPerDegree;
    }

    calculatePolygonPerimeter(points) {
        if (points.length < 2) return 0;

        let perimeter = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            perimeter += this.calculateDistance(points[i], points[j]);
        }
        return perimeter;
    }

    calculateDistance(latlng1, latlng2) {
        return GeoUtils.haversineDistance(latlng1, latlng2);
    }

    formatDistance(meters) {
        if (meters >= 1000) {
            return `${(meters / 1000).toFixed(2)} km`;
        }
        return `${meters.toFixed(2)} m`;
    }

    formatArea(squareMeters) {
        if (squareMeters >= 10000) {
            return `${(squareMeters / 10000).toFixed(3)} ha`;
        }
        return `${squareMeters.toFixed(2)} m²`;
    }

    calculateAzimuth(latlng1, latlng2) {
        const lat1 = latlng1.lat * Math.PI / 180;
        const lat2 = latlng2.lat * Math.PI / 180;
        const deltaLng = (latlng2.lng - latlng1.lng) * Math.PI / 180;

        const x = Math.sin(deltaLng) * Math.cos(lat2);
        const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

        let azimuth = Math.atan2(x, y) * 180 / Math.PI;
        return (azimuth + 360) % 360;
    }

    calculateMidpoint(latlng1, latlng2) {
        return {
            lat: (latlng1.lat + latlng2.lat) / 2,
            lng: (latlng1.lng + latlng2.lng) / 2
        };
    }

    calculateTriangulation(points) {
        const [a, b, c] = points;

        const sideAB = this.calculateDistance(a, b);
        const sideBC = this.calculateDistance(b, c);
        const sideCA = this.calculateDistance(c, a);

        const perimeter = sideAB + sideBC + sideCA;
        const s = perimeter / 2;

        // Formule de Héron pour l'aire
        const area = Math.sqrt(s * (s - sideAB) * (s - sideBC) * (s - sideCA));

        return {
            sideAB,
            sideBC,
            sideCA,
            perimeter,
            area
        };
    }

    calculateTriangleCenter(points) {
        const lat = (points[0].lat + points[1].lat + points[2].lat) / 3;
        const lng = (points[0].lng + points[1].lng + points[2].lng) / 3;
        return { lat, lng };
    }


    cancelCurrentAction() {
        // Delegate to current tool instance (if any)
        if (this.currentToolInstance) {
            this.currentToolInstance.cancelDrawing();
        }
        this.isDrawing = false;
        this.currentLine = null;
        this.currentPolygon = null;
    }

    clearAll(skipSave = false) {
        // Supprimer tous les éléments de la carte
        const allItems = [...this.data.points, ...this.data.lines, ...this.data.circles, ...this.data.polygons];
        if (this.data.isochrones) {
            allItems.push(...this.data.isochrones);
        }

        const rm = (obj) => { if (obj && obj.remove) obj.remove(); };
        const rmShape = (id) => { if (id && this.engine) this.engine.removeShape(id); };

        allItems.forEach(item => {
            // Markers (MapMarker or Leaflet)
            rm(item.marker);
            rm(item.centerMarker);
            // Shapes (new format)
            rmShape(item.shapeId);
            if (item.shapeIds) item.shapeIds.forEach(id => rmShape(id));
            // Old Leaflet objects (compat)
            rm(item.polyline); rm(item.circle); rm(item.polygon);
            if (item.polylines) item.polylines.forEach(p => rm(p));
            if (item.markers) item.markers.forEach(m => rm(m));
            // Helper points
            if (item.pointData) item.pointData.forEach(pd => rm(pd.marker));
            if (item.centerPoint) rm(item.centerPoint.marker);
        });

        // Clean up all labels
        if (this.labelManager) this.labelManager.cleanup();

        // Vider les données
        this.data = {
            points: [],
            lines: [],
            circles: [],
            polygons: [],
            isochrones: []
        };

        if (this.searchMarker) { rm(this.searchMarker); this.searchMarker = null; }
        if (this.isochroneMarker) { rm(this.isochroneMarker); this.isochroneMarker = null; }

        // Sauvegarder l'état vide dans localStorage (sauf si skipSave est true)
        if (!skipSave) {
            this.saveToLocalStorage();
        }

        // Reset du panneau isochrone
        // Note: isochrone panel is now in the sidebar, no need to hide it here
        document.getElementById('isochrone-point-info-sidebar').textContent = 'Cliquez sur la carte pour placer le point de départ';
        document.getElementById('calculate-isochrone-sidebar').disabled = true;
        this.selectedIsochronePoint = null;

        this.cancelCurrentAction();
        this.updateInfo('Carte effacée', 'Tous les éléments ont été supprimés');
    }

    toggleExportMenu(e) {
        e.stopPropagation();
        const menu = document.getElementById('export-menu');
        if (menu) {
            menu.classList.toggle('hidden');
        }
    }

    hideExportMenu() {
        const menu = document.getElementById('export-menu');
        if (menu) {
            menu.classList.add('hidden');
        }
    }

    exportData(format = 'json') {
        const timestamp = new Date().getTime();

        switch(format) {
            case 'json':
                this.exportJSON(timestamp);
                break;
            case 'csv':
                this.exportCSV(timestamp);
                break;
            case 'geojson':
                this.exportGeoJSON(timestamp);
                break;
            case 'kml':
                this.exportKML(timestamp);
                break;
        }
    }

    exportJSON(timestamp) {
        // Check if we have layers system (version 2.0+)
        const hasLayers = window.layersManager && window.layersManager.layers.length > 0;

        const exportData = {
            timestamp: new Date().toISOString(),
            version: "2.0", // Version 2.0 with layer support
            // Export empty data structure when layers exist (all data is in layers)
            // Keep populated data for backwards compatibility when no layers
            data: {
                points: hasLayers ? [] : this.data.points.map(p => ({
                    id: p.id,
                    name: p.name,
                    lat: p.latlng.lat,
                    lng: p.latlng.lng,
                    iconType: p.iconType,
                    iconName: p.iconName
                })),
                lines: hasLayers ? [] : this.data.lines.map(l => ({
                    id: l.id,
                    points: l.points.map(p => ({ lat: p.lat, lng: p.lng })),
                    pointData: l.pointData ? l.pointData.map(pd => ({
                        id: pd.id,
                        name: pd.name,
                        lat: pd.latlng.lat,
                        lng: pd.latlng.lng,
                        type: pd.type
                    })) : [],
                    segments: l.segments ? l.segments.map(s => ({
                        distance: s.distance,
                        azimuth: s.azimuth
                    })) : [],
                    totalDistance: l.totalDistance
                })),
                circles: hasLayers ? [] : this.data.circles.map(c => ({
                    id: c.id,
                    center: { lat: c.center.lat, lng: c.center.lng },
                    radius: c.radius,
                    centerPoint: c.centerPoint ? {
                        id: c.centerPoint.id,
                        name: c.centerPoint.name,
                        lat: c.centerPoint.latlng.lat,
                        lng: c.centerPoint.latlng.lng,
                        type: c.centerPoint.type
                    } : null
                })),
                polygons: hasLayers ? [] : this.data.polygons.map(p => ({
                    id: p.id,
                    points: p.points.map(pt => ({ lat: pt.lat, lng: pt.lng })),
                    pointData: p.pointData ? p.pointData.map(pd => ({
                        id: pd.id,
                        name: pd.name,
                        lat: pd.latlng.lat,
                        lng: pd.latlng.lng,
                        type: pd.type
                    })) : [],
                    area: p.area,
                    perimeter: p.perimeter
                })),
                isochrones: hasLayers ? [] : (this.data.isochrones ? this.data.isochrones.map(iso => ({
                    id: iso.id,
                    name: iso.name || 'Isochrone',
                    color: iso.color || '#3498db',
                    centerPoint: iso.centerPoint ? {
                        lat: iso.centerPoint.lat,
                        lng: iso.centerPoint.lng
                    } : (iso.center ? {
                        lat: iso.center.lat,
                        lng: iso.center.lng
                    } : null),
                    coordinates: iso.coordinates ? iso.coordinates.map(c => ({
                        lat: c.lat, lng: c.lng
                    })) : (iso.polygon && iso.polygon.getLatLngs ? iso.polygon.getLatLngs()[0].map(c => ({
                        lat: c.lat, lng: c.lng
                    })) : []),
                    properties: {
                        mode: iso.mode,
                        calcMode: iso.calcMode,
                        cost: iso.cost,
                        timeUnit: iso.timeUnit,
                        direction: iso.direction
                    }
                })) : []),
                aiGeolocation: this.data.aiGeolocation || []
            }
        };

        // Add layer data if layers system is available
        if (window.layersManager) {
            const layersData = window.layersManager.exportData();
            exportData.layers = layersData.layers;
            exportData.currentLayerId = layersData.currentLayerId;
        }

        // Add AI search history from localStorage
        const aiHistorySaved = localStorage.getItem('aiSearchHistory');
        if (aiHistorySaved) {
            try {
                exportData.aiSearchHistory = JSON.parse(aiHistorySaved);
            } catch (e) {
                console.error('Error exporting AI history:', e);
                exportData.aiSearchHistory = [];
            }
        } else {
            exportData.aiSearchHistory = [];
        }

        // Add Overpass saved queries from localStorage
        const savedQueries = localStorage.getItem('rhinomap_saved_queries');
        if (savedQueries) {
            try {
                exportData.savedQueries = JSON.parse(savedQueries);
            } catch (e) {
                console.error('Error exporting saved queries:', e);
                exportData.savedQueries = [];
            }
        } else {
            exportData.savedQueries = [];
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        this.downloadFile(blob, `rhinomap_${timestamp}.json`);

        const stats = [
            (exportData.aiSearchHistory?.length || 0) + ' recherche(s) IA',
            'layers & elements'
        ];

        this.updateInfo('Export JSON terminé', 'Fichier sauvegardé (' + stats.join(', ') + ')');
        this.saveToLocalStorage();
    }

    exportCSV(timestamp) {
        // CSV avec tous les points (autonomes + lignes + cercles + polygones)
        let csv = 'Type,Nom,Latitude,Longitude,Informations\n';

        // Points autonomes
        this.data.points.forEach(p => {
            csv += `Point,"${p.name}",${p.latlng.lat},${p.latlng.lng},-\n`;
        });

        // Points des lignes
        this.data.lines.forEach((line, idx) => {
            if (line.pointData) {
                line.pointData.forEach(pd => {
                    csv += `Ligne ${idx + 1},"${pd.name}",${pd.latlng.lat},${pd.latlng.lng},"Distance totale: ${line.totalDistance?.toFixed(2)}m"\n`;
                });
            }
        });

        // Centres des cercles
        this.data.circles.forEach((circle, idx) => {
            if (circle.centerPoint) {
                csv += `Cercle ${idx + 1},"${circle.centerPoint.name}",${circle.centerPoint.latlng.lat},${circle.centerPoint.latlng.lng},"Rayon: ${circle.radius.toFixed(2)}m"\n`;
            }
        });

        // Points des polygones
        this.data.polygons.forEach((poly, idx) => {
            if (poly.pointData) {
                poly.pointData.forEach(pd => {
                    csv += `Polygone ${idx + 1},"${pd.name}",${pd.latlng.lat},${pd.latlng.lng},"Aire: ${poly.area?.toFixed(2)}m²"\n`;
                });
            }
        });

        // Centres des isochrones
        if (this.data.isochrones) {
            this.data.isochrones.forEach((iso, idx) => {
                const centerPoint = iso.centerPoint || iso.center;
                if (centerPoint) {
                    const modeText = iso.mode === 'car' ? 'Voiture' : 'Piéton';
                    const calcText = iso.calcMode === 'time' ? 'Temps' : 'Distance';
                    csv += `Isochrone ${idx + 1},"${iso.name || 'Centre'}",${centerPoint.lat},${centerPoint.lng},"${modeText}, ${calcText}: ${iso.cost} ${iso.timeUnit || ''}"\n`;
                }
            });
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        this.downloadFile(blob, `rhinomap_${timestamp}.csv`);
        this.updateInfo('Export CSV terminé', 'Points exportés');
    }

    exportGeoJSON(timestamp) {
        const features = [];

        // Points autonomes
        this.data.points.forEach(p => {
            features.push({
                type: 'Feature',
                properties: {
                    name: p.name,
                    type: 'point'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [p.latlng.lng, p.latlng.lat]
                }
            });
        });

        // Lignes
        this.data.lines.forEach(line => {
            features.push({
                type: 'Feature',
                properties: {
                    type: 'line',
                    totalDistance: line.totalDistance,
                    segments: line.segments?.length || 0
                },
                geometry: {
                    type: 'LineString',
                    coordinates: line.points.map(p => [p.lng, p.lat])
                }
            });
        });

        // Cercles (comme polygones)
        this.data.circles.forEach(circle => {
            const center = circle.center;
            const radius = circle.radius;
            const points = 64;
            const coordinates = [];

            for (let i = 0; i <= points; i++) {
                const angle = (i * 360 / points) * Math.PI / 180;
                const dx = radius * Math.cos(angle) / 111320;
                const dy = radius * Math.sin(angle) / (111320 * Math.cos(center.lat * Math.PI / 180));
                coordinates.push([center.lng + dx, center.lat + dy]);
            }

            features.push({
                type: 'Feature',
                properties: {
                    type: 'circle',
                    radius: radius,
                    centerName: circle.centerPoint?.name || 'Centre'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [coordinates]
                }
            });
        });

        // Polygones
        this.data.polygons.forEach(poly => {
            const coords = poly.points.map(p => [p.lng, p.lat]);
            coords.push(coords[0]); // Fermer le polygone

            features.push({
                type: 'Feature',
                properties: {
                    type: 'polygon',
                    area: poly.area,
                    perimeter: poly.perimeter
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [coords]
                }
            });
        });

        // Isochrones
        if (this.data.isochrones) {
            this.data.isochrones.forEach(iso => {
                // Get coordinates from new format (array of {lat, lng}) or old format (Leaflet polygon)
                let isoCoords = null;
                if (iso.coordinates && Array.isArray(iso.coordinates)) {
                    isoCoords = iso.coordinates.map(c => [c.lng, c.lat]);
                } else if (iso.polygon && iso.polygon.getLatLngs) {
                    isoCoords = iso.polygon.getLatLngs()[0].map(c => [c.lng, c.lat]);
                }

                if (isoCoords) {
                    if (isoCoords.length > 0) {
                        const first = isoCoords[0], last = isoCoords[isoCoords.length - 1];
                        if (first[0] !== last[0] || first[1] !== last[1]) isoCoords.push([...first]);
                    }

                    features.push({
                        type: 'Feature',
                        properties: {
                            type: 'isochrone',
                            name: iso.name || 'Isochrone',
                            mode: iso.mode,
                            calcMode: iso.calcMode,
                            cost: iso.cost,
                            timeUnit: iso.timeUnit,
                            direction: iso.direction
                        },
                        geometry: {
                            type: 'Polygon',
                            coordinates: [isoCoords]
                        }
                    });
                }

                // Export center point as separate feature
                const centerPoint = iso.centerPoint || iso.center;
                if (centerPoint) {
                    features.push({
                        type: 'Feature',
                        properties: {
                            type: 'isochrone_center',
                            name: (iso.name || 'Isochrone') + ' - Centre',
                            parentIsochroneId: iso.id
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [centerPoint.lng, centerPoint.lat]
                        }
                    });
                }
            });
        }

        // Overpass queries are now in LayersManager - they will be exported as layer elements
        // No need for separate overpassQueries handling here

        // Géolocalisation IA
        if (this.data.aiGeolocation) {
            this.data.aiGeolocation.forEach(geo => {
                if (geo.lat && geo.lon) {
                    features.push({
                        type: 'Feature',
                        properties: {
                            type: 'ai_geolocation',
                            name: geo.name || 'Localisation IA',
                            confidence: geo.confidence,
                            description: geo.description
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [geo.lon, geo.lat]
                        }
                    });
                }
            });
        }

        const geojson = {
            type: 'FeatureCollection',
            features: features
        };

        const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `rhinomap_${timestamp}.geojson`);
        const aiCount = this.data.aiGeolocation?.length || 0;
        this.updateInfo('Export GeoJSON terminé',
            `Fichier sauvegardé (${aiCount} géoloc IA, + layers)`);
    }

    exportKML(timestamp) {
        let kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
        kml += '<Document>\n';
        kml += '<name>RhinoMap Export</name>\n';
        kml += '<description>Export depuis RhinoMapToolbox</description>\n\n';

        // Points autonomes
        this.data.points.forEach(p => {
            kml += '<Placemark>\n';
            kml += `  <name>${this.escapeXML(p.name)}</name>\n`;
            kml += '  <Point>\n';
            kml += `    <coordinates>${p.latlng.lng},${p.latlng.lat},0</coordinates>\n`;
            kml += '  </Point>\n';
            kml += '</Placemark>\n\n';
        });

        // Lignes
        this.data.lines.forEach((line, idx) => {
            kml += '<Placemark>\n';
            kml += `  <name>Ligne ${idx + 1}</name>\n`;
            kml += `  <description>Distance totale: ${line.totalDistance?.toFixed(2)}m</description>\n`;
            kml += '  <LineString>\n';
            kml += '    <coordinates>\n';
            line.points.forEach(p => {
                kml += `      ${p.lng},${p.lat},0\n`;
            });
            kml += '    </coordinates>\n';
            kml += '  </LineString>\n';
            kml += '</Placemark>\n\n';
        });

        // Polygones
        this.data.polygons.forEach((poly, idx) => {
            kml += '<Placemark>\n';
            kml += `  <name>Polygone ${idx + 1}</name>\n`;
            kml += `  <description>Aire: ${poly.area?.toFixed(2)}m²</description>\n`;
            kml += '  <Polygon>\n';
            kml += '    <outerBoundaryIs>\n';
            kml += '      <LinearRing>\n';
            kml += '        <coordinates>\n';
            poly.points.forEach(p => {
                kml += `          ${p.lng},${p.lat},0\n`;
            });
            // Fermer le polygone
            kml += `          ${poly.points[0].lng},${poly.points[0].lat},0\n`;
            kml += '        </coordinates>\n';
            kml += '      </LinearRing>\n';
            kml += '    </outerBoundaryIs>\n';
            kml += '  </Polygon>\n';
            kml += '</Placemark>\n\n';
        });

        // Isochrones
        if (this.data.isochrones) {
            this.data.isochrones.forEach((iso, idx) => {
                // Export isochrone polygon
                const isoCoords = iso.coordinates || (iso.polygon && iso.polygon.getLatLngs ? iso.polygon.getLatLngs()[0] : null);
                if (isoCoords) {
                    const coords = isoCoords;
                    kml += '<Placemark>\n';
                    kml += `  <name>${this.escapeXML(iso.name || `Isochrone ${idx + 1}`)}</name>\n`;
                    const modeText = iso.mode === 'car' ? 'Voiture' : 'Piéton';
                    const calcText = iso.calcMode === 'time' ? 'Temps' : 'Distance';
                    kml += `  <description>${modeText}, ${calcText}: ${iso.cost} ${iso.timeUnit || ''}</description>\n`;
                    kml += '  <Polygon>\n';
                    kml += '    <outerBoundaryIs>\n';
                    kml += '      <LinearRing>\n';
                    kml += '        <coordinates>\n';
                    coords.forEach(c => {
                        kml += `          ${c.lng},${c.lat},0\n`;
                    });
                    // Fermer le polygone
                    kml += `          ${coords[0].lng},${coords[0].lat},0\n`;
                    kml += '        </coordinates>\n';
                    kml += '      </LinearRing>\n';
                    kml += '    </outerBoundaryIs>\n';
                    kml += '  </Polygon>\n';
                    kml += '</Placemark>\n\n';
                }

                // Export center point
                const centerPoint = iso.centerPoint || iso.center;
                if (centerPoint) {
                    kml += '<Placemark>\n';
                    kml += `  <name>${this.escapeXML((iso.name || `Isochrone ${idx + 1}`) + ' - Centre')}</name>\n`;
                    kml += '  <Point>\n';
                    kml += `    <coordinates>${centerPoint.lng},${centerPoint.lat},0</coordinates>\n`;
                    kml += '  </Point>\n';
                    kml += '</Placemark>\n\n';
                }
            });
        }

        kml += '</Document>\n';
        kml += '</kml>';

        const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
        this.downloadFile(blob, `rhinomap_${timestamp}.kml`);
        this.updateInfo('Export KML terminé', 'Fichier sauvegardé');
    }

    escapeXML(text) {
        return text.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case "'": return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    saveToLocalStorage() {
        // NOTE: Layers are now the single source of truth for persistence
        // We delegate all saving to the layersManager
        if (window.layersManager) {
            window.layersManager.save();
        } else {
            console.warn('⚠️ LayersManager not available, cannot save');
        }
    }

    loadFromLocalStorage() {
        // NOTE: Layers are now the single source of truth for persistence
        // We restore everything FROM the layersManager
        if (!window.layersManager) {
            console.warn('⚠️ LayersManager not available yet, cannot load');
            return false;
        }

        try {
            const hasLayers = window.layersManager.load();

            if (hasLayers && window.layersManager.layers.length > 0) {
                // Restore all elements from layers to the map
                let totalRestored = 0;

                window.layersManager.layers.forEach(layer => {
                    layer.elements.forEach(element => {
                        this.restoreElementToMap(element, layer.id);
                        totalRestored++;
                    });
                });

                this.updateInfo('Données restaurées', `${totalRestored} éléments chargés`);
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement depuis layers:', error);
            return false;
        }
    }

    async clearLocalStorage() {
        const confirmed = await confirmAction(
            '⚠️ ' + i18n.t('prompt_purge_storage'),
            i18n.t('delete'),
            i18n.t('cancel')
        );

        if (confirmed) {
            try {
                // Clear both old format and new layers format
                localStorage.removeItem('rhinomap_data');
                localStorage.removeItem('rhinomap_layers');
                this.updateInfo('Storage purgé', 'localStorage vidé avec succès');
                showSuccess(i18n.t('success_storage_purged'), 6000);
            } catch (error) {
                console.error('❌ Erreur lors de la purge localStorage:', error);
                showError(i18n.t('error_storage_purge'));
            }
        }
    }

    importData() {
        document.getElementById('file-input').click();
    }

    loadFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const isKML = fileName.endsWith('.kml');

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;

                // If KML file, convert to GeoJSON using toGeoJSON
                if (isKML || content.trim().startsWith('<?xml') || content.trim().startsWith('<kml')) {
                    if (typeof toGeoJSON === 'undefined') {
                        showError('KML parser not loaded. Please refresh the page.');
                        return;
                    }

                    // Parse XML
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(content, 'text/xml');

                    // Check for XML parsing errors
                    const parserError = xmlDoc.getElementsByTagName('parsererror');
                    if (parserError.length > 0) {
                        showError('Invalid KML file: XML parsing error');
                        return;
                    }

                    // Convert KML to GeoJSON
                    const geojson = toGeoJSON.kml(xmlDoc);

                    // Verify conversion succeeded
                    if (!geojson || !geojson.features || geojson.features.length === 0) {
                        showWarning('KML file is empty or contains no valid features');
                        return;
                    }

                    // Import as GeoJSON
                    this.importGeoJSON(geojson);
                    this.updateInfo('Import KML terminé', `${geojson.features.length} éléments importés`);
                    return;
                }

                // Otherwise, parse as JSON
                const importedData = JSON.parse(content);

                // Détecter le format (GeoJSON ou JSON RhinoMap)
                if (importedData.type === 'FeatureCollection') {
                    // Format GeoJSON
                    this.importGeoJSON(importedData);
                    this.updateInfo('Import GeoJSON terminé', 'Données restaurées avec succès');
                } else if (importedData.data) {
                    // Format JSON RhinoMap
                    this.restoreData(importedData);
                    this.updateInfo('Import JSON terminé', 'Données restaurées avec succès');
                } else {
                    showWarning(i18n.t('error_file_format'));
                }
            } catch (error) {
                showError(i18n.t('error_file_load') + ' ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    importGeoJSON(geojson) {
        this.clearAll(true);
        const color = '#e74c3c';

        geojson.features.forEach(feature => {
            const props = feature.properties || {};
            const geom = feature.geometry;
            if (!geom || !geom.type) return;

            if (geom.type === 'Point') {
                const [lng, lat] = geom.coordinates;
                if (this.tools.point) {
                    this.tools.point.createPoint({ lat, lng }, props.name || 'Point importé');
                }

            } else if (geom.type === 'LineString') {
                const points = geom.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
                if (points.length < 2) return;

                // Reuse restoreElementToMap for lines
                const lineElement = {
                    id: Date.now() + Math.random(),
                    type: 'line',
                    name: props.name || 'Ligne importée',
                    points: points
                };
                // Add to default layer then restore
                if (window.layersManager) {
                    const layer = window.layersManager.getCurrentLayer();
                    if (layer) {
                        window.layersManager.addElement(layer.id, {
                            id: lineElement.id, type: 'line', name: lineElement.name,
                            data: lineElement, properties: props, showName: true
                        });
                        this.restoreElementToMap(lineElement, layer.id);
                    }
                }

            } else if (geom.type === 'Polygon') {
                const coords = geom.coordinates[0].map(c => ({ lat: c[1], lng: c[0] }));

                if (props.type === 'circle') {
                    const center = {
                        lat: coords.reduce((s, c) => s + c.lat, 0) / coords.length,
                        lng: coords.reduce((s, c) => s + c.lng, 0) / coords.length
                    };
                    const radius = props.radius || GeoUtils.haversineDistance(center, coords[0]);
                    const circleElement = {
                        id: Date.now() + Math.random(),
                        type: 'circle',
                        name: props.centerName || 'Cercle importé',
                        center, radius
                    };
                    if (window.layersManager) {
                        const layer = window.layersManager.getCurrentLayer();
                        if (layer) {
                            window.layersManager.addElement(layer.id, {
                                id: circleElement.id, type: 'circle', name: circleElement.name,
                                data: circleElement, properties: props, showName: true
                            });
                            this.restoreElementToMap(circleElement, layer.id);
                        }
                    }
                } else {
                    // Remove closing duplicate point
                    if (coords.length > 1) coords.pop();
                    const polyElement = {
                        id: Date.now() + Math.random(),
                        type: 'polygon',
                        name: props.name || 'Polygone importé',
                        polygon: coords,
                        area: props.area,
                        perimeter: props.perimeter
                    };
                    if (window.layersManager) {
                        const layer = window.layersManager.getCurrentLayer();
                        if (layer) {
                            window.layersManager.addElement(layer.id, {
                                id: polyElement.id, type: 'polygon', name: polyElement.name,
                                data: polyElement, properties: props, showName: true
                            });
                            this.restoreElementToMap(polyElement, layer.id);
                        }
                    }
                }
            }
        });

        this.saveToLocalStorage();
    }

    /**
     * Restore an element from serialized data to the map
     */
    /**
     * Restore an element from serialized data to the map (MapEngine version)
     * Called during loadFromLocalStorage for each saved element
     */
    restoreElementToMap(element, layerId) {
        // Guard: wait for engine to be ready
        if (!this.engine) {
            console.warn('restoreElementToMap: engine not ready');
            return;
        }

        const type = element.type;
        const layer = window.layersManager ? window.layersManager.getLayer(layerId) : null;
        const layerColor = element.color || (layer ? layer.color : '#e74c3c');

        if (type === 'point' && element.latlng) {
            const latlng = element.latlng;
            const iconType = element.iconType || element.data?.iconType || 'circle';
            const iconName = element.iconName || element.data?.iconName || null;
            const needsSvgIcon = iconType === 'svg' && window.iconPicker && iconName;

            // Create marker DOM element
            const size = needsSvgIcon ? 28 : 20;
            const el = IconPicker.createDefaultIcon(layerColor, size);

            const marker = this.engine.createMarker(latlng, { element: el, draggable: true });

            // Load SVG icon asynchronously if needed
            if (needsSvgIcon) {
                window.iconPicker.createIcon(iconName, layerColor).then(iconEl => {
                    const markerEl = marker.getElement();
                    if (markerEl && iconEl) {
                        const labels = markerEl.querySelectorAll('.rhinomap-label');
                        markerEl.innerHTML = iconEl.innerHTML;
                        markerEl.className = iconEl.className;
                        markerEl.style.cssText = iconEl.style.cssText;
                        labels.forEach(l => markerEl.appendChild(l));
                    }
                }).catch(err => console.warn('Failed to load SVG icon:', err));
            }

            // Popup
            const popupHtml = this.createCoordinatesPopupContent(element.name || 'Point', latlng.lat, latlng.lng);
            const popup = this.engine.createPopup(latlng, popupHtml);
            marker.setPopup(popup);

            const pointData = {
                id: element.id,
                name: element.name || 'Point',
                latlng: latlng,
                marker: marker,
                label: null,
                type: element.type || 'standalone',
                iconType: iconType,
                iconName: iconName,
                color: layerColor,
                showName: element.showName !== false
            };

            // Label
            const showLabel = element.showName !== false;
            const labelId = this.labelManager.createLabel('point', pointData, {
                position: latlng,
                visible: showLabel,
                labelId: `label_point_${element.id}`,
                marker: marker,
                color: layerColor
            });
            pointData.label = labelId;

            // Events
            marker.on('dragend', (e) => {
                pointData.latlng = e.latlng;
                const newPopup = this.engine.createPopup(e.latlng,
                    this.createCoordinatesPopupContent(pointData.name, e.latlng.lat, e.latlng.lng));
                marker.setPopup(newPopup);
                this.saveToLocalStorage();
            });
            marker.on('dblclick', () => this.renamePoint(pointData));
            marker.on('contextmenu', (e) => {
                this.showUnifiedContextMenu(e.originalEvent.clientX, e.originalEvent.clientY, pointData, 'point');
            });

            this.data.points.push(pointData);

            // Register in layer system
            if (window.layersManager) {
                const lyr = window.layersManager.getLayer(layerId);
                if (lyr) {
                    const layerElement = lyr.elements.find(e => e.id === element.id);
                    if (layerElement) {
                        layerElement.mapObject = marker;
                        layerElement.data = pointData;
                        if (lyr.visible && layerElement.visible !== false) {
                            window.layersManager.addElementToMap(layerElement);
                        }
                    }
                }
            }

        } else if (type === 'line' && element.points) {
            const points = element.points;
            const lineData = {
                id: element.id, points, segments: [], pointData: [],
                shapeIds: [], segmentLabelIds: [], totalDistance: 0
            };

            // Create helper points
            points.forEach((point, idx) => {
                const name = idx === 0 ? 'Début' : (idx === points.length - 1 ? 'Fin' : `Point ${idx + 1}`);
                const pd = this.tools.line
                    ? this.tools.line.createHelperPoint(point, name, 'line-point', layerColor)
                    : { id: Date.now() + idx, latlng: point, name, marker: null };
                lineData.pointData.push(pd);
            });

            // Create segments
            let totalDistance = 0;
            for (let i = 0; i < points.length - 1; i++) {
                const start = points[i], end = points[i + 1];
                const distance = GeoUtils.haversineDistance(start, end);
                const azimuth = GeoUtils.calculateAzimuth(start, end);
                lineData.segments.push({ distance, azimuth });
                totalDistance += distance;

                const shapeId = this.engine.addPolyline(null, [start, end], { color: layerColor, weight: 3 });
                lineData.shapeIds.push(shapeId);

                this.engine.onShapeContextMenu(shapeId, (e) => {
                    this.showUnifiedContextMenu(e.originalEvent.clientX, e.originalEvent.clientY, lineData, 'line');
                });

                const midpoint = GeoUtils.calculateMidpoint(start, end);
                const labelId = `label_line-segment_${element.id}_${i}`;
                this.labelManager.createLabel('line-segment', { distance, azimuth, id: `${element.id}_seg_${i}` }, {
                    position: midpoint, visible: true, labelId, color: layerColor
                });
                lineData.segmentLabelIds.push(labelId);
            }

            lineData.totalDistance = totalDistance;
            this.data.lines.push(lineData);

            this._updateLayerElement(layerId, element.id, lineData.shapeIds[0], lineData);

        } else if (type === 'circle' && element.center && element.radius) {
            const center = element.center;
            const radius = element.radius;
            const name = element.name || element.data?.name || 'Circle';
            const showName = element.showName !== undefined ? element.showName : true;

            // Center helper point
            const centerPoint = this.tools.circle
                ? this.tools.circle.createHelperPoint(center, name, 'circle-center', layerColor)
                : { id: Date.now(), latlng: center, name, marker: null };

            if (centerPoint.marker) {
                this.labelManager.setVisibility(`label_point_${centerPoint.id}`, showName);
            }

            // Circle shape
            const shapeId = this.engine.addCirclePolygon(null, center, radius, {
                color: layerColor, fillColor: layerColor, fillOpacity: 0.2, weight: 2
            });

            this.engine.onShapeContextMenu(shapeId, (e) => {
                this.showUnifiedContextMenu(e.originalEvent.clientX, e.originalEvent.clientY, circleData, 'circle');
            });

            const circleData = {
                id: element.id, name, center, radius,
                shapeId, centerPoint, showName, color: layerColor,
                area: Math.PI * radius * radius
            };

            this.data.circles.push(circleData);
            this._updateLayerElement(layerId, element.id, shapeId, circleData);

        } else if (type === 'polygon' && element.polygon) {
            const points = element.polygon;
            const name = element.name || element.data?.name || 'Polygon';
            const showName = element.showName !== undefined ? element.showName : true;

            // Vertex helper points
            const pointData = points.map((point, idx) => {
                return this.tools.polygon
                    ? this.tools.polygon.createHelperPoint(point, `Point ${idx + 1}`, 'polygon-point', layerColor)
                    : { id: Date.now() + idx, latlng: point, name: `Point ${idx + 1}`, marker: null };
            });

            // Polygon shape
            const shapeId = this.engine.addPolygon(null, points, {
                color: layerColor, fillColor: layerColor, fillOpacity: 0.3, weight: 2
            });

            this.engine.onShapeContextMenu(shapeId, (e) => {
                this.showUnifiedContextMenu(e.originalEvent.clientX, e.originalEvent.clientY, polygonData, 'polygon');
            });

            const area = element.area || GeoUtils.calculatePolygonArea(points);
            const perimeter = element.perimeter || GeoUtils.calculatePolygonPerimeter(points);
            const center = {
                lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
                lng: points.reduce((s, p) => s + p.lng, 0) / points.length
            };

            const polygonData = {
                id: element.id, name, points, pointData, shapeId,
                area, perimeter, center, showName, color: layerColor
            };

            // Label at center
            this.labelManager.createLabel('polygon', polygonData, {
                position: center, visible: showName,
                labelId: `label_polygon_${polygonData.id}`, color: layerColor
            });

            this.data.polygons.push(polygonData);
            this._updateLayerElement(layerId, element.id, shapeId, polygonData);

        } else if (type === 'isochrone' && element.coordinates) {
            const coordinates = element.coordinates.map(c =>
                (c.lat !== undefined) ? c : { lat: c[0] || c.lat, lng: c[1] || c.lng }
            );
            const color = element.color || layerColor;

            const shapeId = this.engine.addPolygon(null, coordinates, {
                color, fillColor: color, fillOpacity: 0.15, weight: 2
            });

            // Center marker
            let centerMarker = null;
            const centerPoint = element.centerPoint;
            if (centerPoint) {
                const el = document.createElement('div');
                el.className = 'isochrone-marker';
                el.innerHTML = '<i class="iconoir-timer"></i>';
                el.style.cssText = 'width:24px;height:24px;display:flex;align-items:center;justify-content:center;';
                centerMarker = this.engine.createMarker({lat: centerPoint.lat, lng: centerPoint.lng}, { element: el });
                centerMarker.addTo(this.engine);
                const popup = this.engine.createPopup(
                    {lat: centerPoint.lat, lng: centerPoint.lng},
                    this.createCoordinatesPopupContent('Centre isochrone', centerPoint.lat, centerPoint.lng)
                );
                centerMarker.setPopup(popup);
            }

            const props = element.properties || element;
            const isoData = {
                id: element.id,
                name: element.name || 'Isochrone',
                shapeId, centerMarker, centerPoint,
                coordinates, color,
                mode: props.mode || 'car',
                calcMode: props.calcMode || 'time',
                cost: props.cost || 10,
                timeUnit: props.timeUnit || 'min',
                showName: element.showName !== undefined ? element.showName : true
            };

            // Label
            const isoCenter = centerPoint || {
                lat: coordinates.reduce((s, c) => s + c.lat, 0) / coordinates.length,
                lng: coordinates.reduce((s, c) => s + c.lng, 0) / coordinates.length
            };
            this.labelManager.createLabel('isochrone', isoData, {
                position: isoCenter, visible: isoData.showName,
                labelId: `label_isochrone_${isoData.id}`, color
            });

            if (!this.data.isochrones) this.data.isochrones = [];
            const existIdx = this.data.isochrones.findIndex(iso => iso.id === isoData.id);
            if (existIdx >= 0) this.data.isochrones[existIdx] = isoData;
            else this.data.isochrones.push(isoData);

            this._updateLayerElement(layerId, element.id, shapeId, isoData);

        } else if (type === 'overpass' && element.data) {
            // Restore overpass element from saved layer data
            const ovData = element.data;
            const color = element.color || layerColor;
            if (window.overpassManager) {
                const marker = window.overpassManager.createOverpassMarker(ovData, color, []);
                if (marker && window.layersManager) {
                    const lyr = window.layersManager.getLayer(layerId);
                    if (lyr) {
                        const le = lyr.elements.find(e => e.id === element.id);
                        if (le) {
                            le.mapObject = marker;
                            le.data = ovData;
                            if (lyr.visible && le.visible !== false) {
                                window.layersManager.addElementToMap(le);
                            }
                        }
                    }
                }
            }

        } else if (type === 'image_analysis_zone' && element.data) {
            const zoneData = element.data;
            const color =
                zoneData.confidence === 'very_high' ? '#2ecc71' :
                zoneData.confidence === 'high' ? '#3498db' :
                zoneData.confidence === 'medium' ? '#f39c12' : '#95a5a6';

            let circleShapeId = null;
            if (zoneData.type === 'circle' && zoneData.center) {
                const ctr = { lat: zoneData.center.lat, lng: zoneData.center.lon || zoneData.center.lng };
                circleShapeId = this.engine.addCirclePolygon(null, ctr, zoneData.radius, {
                    color, fillColor: color, fillOpacity: 0.1, weight: 2
                });
            }

            const ctr = { lat: zoneData.center.lat, lng: zoneData.center.lon || zoneData.center.lng };
            const el = IconPicker.createDefaultIcon(color, 20);
            const marker = this.engine.createMarker(ctr, { element: el });

            // Popup
            let popupHtml = `<div class="image-zone-popup"><strong>${element.name}</strong>`;
            if (zoneData.confidence) popupHtml += `<br><small>Confiance: ${zoneData.confidence}</small>`;
            popupHtml += '</div>';
            marker.setPopup(this.engine.createPopup(ctr, popupHtml));

            this._updateLayerElement(layerId, element.id, marker, zoneData);
            if (window.layersManager) {
                const lyr = window.layersManager.getLayer(layerId);
                if (lyr) {
                    const le = lyr.elements.find(e => e.id === element.id);
                    if (le) {
                        le.circleShapeId = circleShapeId;
                        if (lyr.visible && le.visible !== false) {
                            window.layersManager.addElementToMap(le);
                        }
                    }
                }
            }
        }
    }

    /**
     * Helper: update layer element references after restore
     */
    _updateLayerElement(layerId, elementId, mapObject, data) {
        if (!window.layersManager) return;
        const lyr = window.layersManager.getLayer(layerId);
        if (!lyr) return;
        const le = lyr.elements.find(e => e.id === elementId);
        if (le) {
            le.mapObject = mapObject;
            le.data = data;
        }
    }

    restoreData(importedData) {
        this.clearAll(true); // Ne pas sauvegarder l'état vide

        const data = importedData.data;

        // Restore AI search history
        if (importedData.aiSearchHistory) {
            try {
                localStorage.setItem('aiSearchHistory', JSON.stringify(importedData.aiSearchHistory));
                // Update UI if the function exists
                if (typeof window.loadAIHistory === 'function') {
                    window.loadAIHistory();
                }
            } catch (e) {
                console.error('Error restoring AI history:', e);
            }
        }

        // Restore Overpass saved queries
        if (importedData.savedQueries) {
            try {
                localStorage.setItem('rhinomap_saved_queries', JSON.stringify(importedData.savedQueries));
                // Update UI if the OverpassManager is available
                if (window.overpassManager && typeof window.overpassManager.updateSavedQueriesUI === 'function') {
                    window.overpassManager.updateSavedQueriesUI();
                }
            } catch (e) {
                console.error('Error restoring saved queries:', e);
            }
        }

        // Overpass queries are now managed by LayersManager and OverpassManager
        // No longer storing in this.data.overpassQueries

        // Check if we have layer data in the import
        if (importedData.layers && window.layersManager) {
            // Store importedData globally for fallback access (cleaned up after restore)
            window.importedDataForFallback = importedData;

            // Import with layer structure
            window.layersManager.importData(importedData);

            // Now restore the actual map objects for each layer's elements
            importedData.layers.forEach(layer => {
                layer.elements.forEach(element => {
                    this.restoreElementToMap(element, layer.id);
                });
            });

            // Clean up temporary fallback data
            delete window.importedDataForFallback;

            // Restore Overpass markers (skipped by restoreElementToMap)
            if (window.restoreOverpassQueries) {
                window.restoreOverpassQueries();
            }

            return;
        }

        // Fallback: old format without layers — convert to layer format and use restoreElementToMap
        if (!window.layersManager) return;
        const fallbackLayer = window.layersManager.getCurrentLayer();
        if (!fallbackLayer) return;
        const fLayerId = fallbackLayer.id;

        data.points.forEach(pd => {
            const el = { id: pd.id || Date.now(), type: 'point', name: pd.name || 'Point', latlng: { lat: pd.lat, lng: pd.lng }, iconType: pd.iconType, iconName: pd.iconName };
            window.layersManager.addElement(fLayerId, { id: el.id, type: 'point', name: el.name, data: el, showName: true });
            this.restoreElementToMap(el, fLayerId);
        });

        if (data.lines) data.lines.forEach(ld => {
            const el = { id: ld.id || Date.now(), type: 'line', name: ld.name || 'Ligne', points: ld.points };
            window.layersManager.addElement(fLayerId, { id: el.id, type: 'line', name: el.name, data: el, showName: true });
            this.restoreElementToMap(el, fLayerId);
        });

        if (data.circles) data.circles.forEach(cd => {
            const el = { id: cd.id || Date.now(), type: 'circle', name: cd.name || 'Cercle', center: cd.center, radius: cd.radius };
            window.layersManager.addElement(fLayerId, { id: el.id, type: 'circle', name: el.name, data: el, showName: true });
            this.restoreElementToMap(el, fLayerId);
        });

        if (data.polygons) data.polygons.forEach(pd => {
            const pts = pd.polygon || pd.points;
            const el = { id: pd.id || Date.now(), type: 'polygon', name: pd.name || 'Polygone', polygon: pts, area: pd.area, perimeter: pd.perimeter };
            window.layersManager.addElement(fLayerId, { id: el.id, type: 'polygon', name: el.name, data: el, showName: true });
            this.restoreElementToMap(el, fLayerId);
        });

        if (data.isochrones) data.isochrones.forEach(iso => {
            const el = { id: iso.id || Date.now(), type: 'isochrone', name: iso.name || 'Isochrone',
                coordinates: iso.coordinates || iso.polygon, centerPoint: iso.centerPoint || iso.center,
                color: iso.color, mode: iso.mode, calcMode: iso.calcMode, cost: iso.cost, timeUnit: iso.timeUnit };
            window.layersManager.addElement(fLayerId, { id: el.id, type: 'isochrone', name: el.name, data: el, showName: true });
            this.restoreElementToMap(el, fLayerId);
        });

        this.saveToLocalStorage();
    }

    // ---- DEAD CODE REMOVED ----
    // The following old Leaflet methods were here and have been removed:
    // createRenameablePoint, handleLineClick, updateLinePreview, handleCircleClick,
    // makeCircleResizable, handlePolygonClick, updatePolygonPreview, finishCurrentPolygon,
    // finishCurrentLine, createSegment, addSegmentLabel, calculateTotalDistance,
    // clearTempElements, handleIsochroneClick, calculateIsochrone, displayIsochrone, etc.
    // All drawing is now handled by tools/ classes.

    _dead_code_fence() { /* fence to find the start of remaining live code */ }

    // The following line marks where dead code was removed and live code resumes
    // ========== PANEL CONTRAINTES ==========

    showPanel() {
        const panel = document.getElementById('constraints-panel');
        const finishBtn = document.getElementById('finish-line');
        const lockDistance = document.getElementById('lock-distance-sidebar');
        const lockAzimuth = document.getElementById('lock-azimuth-sidebar');
        const distanceValue = document.getElementById('distance-value-sidebar');
        const azimuthValue = document.getElementById('azimuth-value-sidebar');
        if (!panel) return;
        if (lockDistance) lockDistance.checked = this.constraints.distanceLocked;
        if (lockAzimuth) lockAzimuth.checked = this.constraints.azimuthLocked;
        if (distanceValue) distanceValue.value = this.constraints.lockedDistance || '';
        if (azimuthValue) azimuthValue.value = this.constraints.lockedAzimuth || '';
        if (finishBtn) {
            const lineTool = this.tools.line;
            finishBtn.style.display = (lineTool && lineTool.isDrawing && lineTool.currentLine && lineTool.currentLine.segments.length > 0) ? 'flex' : 'none';
        }
        panel.classList.remove('hidden');
        panel.classList.remove('collapsed');
    }

    hidePanel() {
        const panel = document.getElementById('constraints-panel');
        if (panel) panel.classList.add('hidden');
    }

    togglePanel() {
        const panel = document.getElementById('constraints-panel');
        if (!panel) return;
        if (panel.classList.contains('hidden')) { this.showPanel(); }
        else { panel.classList.add('hidden'); }
    }

    resetConstraints() {
        this.constraints = { distanceLocked: false, azimuthLocked: false, lockedDistance: null, lockedAzimuth: null };
        const lockDistance = document.getElementById('lock-distance-sidebar');
        const lockAzimuth = document.getElementById('lock-azimuth-sidebar');
        const distanceValue = document.getElementById('distance-value-sidebar');
        const azimuthValue = document.getElementById('azimuth-value-sidebar');
        if (lockDistance) lockDistance.checked = false;
        if (lockAzimuth) lockAzimuth.checked = false;
        if (distanceValue) distanceValue.value = '';
        if (azimuthValue) azimuthValue.value = '';
        if (this.tools.line) this.tools.line.resetConstraints();
    }

    updateConstraintsRealTime() {
        const lockDistanceEl = document.getElementById('lock-distance-sidebar');
        const lockAzimuthEl = document.getElementById('lock-azimuth-sidebar');
        const distanceValueEl = document.getElementById('distance-value-sidebar');
        const azimuthValueEl = document.getElementById('azimuth-value-sidebar');
        if (!lockDistanceEl || !lockAzimuthEl || !distanceValueEl || !azimuthValueEl) return;
        const dLocked = lockDistanceEl.checked;
        const aLocked = lockAzimuthEl.checked;
        const dVal = parseFloat(distanceValueEl.value);
        const aVal = parseFloat(azimuthValueEl.value);
        this.constraints.distanceLocked = dLocked && dVal > 0;
        this.constraints.azimuthLocked = aLocked && !isNaN(aVal) && aVal >= 0 && aVal < 360;
        this.constraints.lockedDistance = dLocked && dVal > 0 ? dVal : null;
        this.constraints.lockedAzimuth = aLocked && !isNaN(aVal) ? aVal : null;
        if (this.tools.line) this.tools.line.setConstraints(this.constraints);
    }

    updatePanelStats() {
        // No-op — stats block was removed from sidebar
    }

    // ========== RECHERCHE ==========

    parseGPSCoordinates(input) {
        const cleaned = input.trim();
        const decimalMatch = cleaned.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
        if (decimalMatch) {
            const lat = parseFloat(decimalMatch[1]), lng = parseFloat(decimalMatch[2]);
            if (this.isValidCoordinate(lat, lng)) return { lat, lng };
        }
        const dmsMatch = cleaned.match(/(\d+)[°]\s*(\d+)[′']\s*(\d+\.?\d*)[″"]?\s*([NSns])[,\s]+(\d+)[°]\s*(\d+)[′']\s*(\d+\.?\d*)[″"]?\s*([EWew])/);
        if (dmsMatch) {
            let lat = parseInt(dmsMatch[1]) + parseInt(dmsMatch[2]) / 60 + parseFloat(dmsMatch[3]) / 3600;
            let lng = parseInt(dmsMatch[5]) + parseInt(dmsMatch[6]) / 60 + parseFloat(dmsMatch[7]) / 3600;
            if (dmsMatch[4].toUpperCase() === 'S') lat = -lat;
            if (dmsMatch[8].toUpperCase() === 'W') lng = -lng;
            if (this.isValidCoordinate(lat, lng)) return { lat, lng };
        }
        return null;
    }

    isValidCoordinate(lat, lng) { return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180; }

    async performSearch() {
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        if (!searchInput || !searchBtn) return;
        const query = searchInput.value.trim();
        if (!query) return;
        const coords = this.parseGPSCoordinates(query);
        if (coords) { this.navigateToGPSCoordinates(coords.lat, coords.lng); return; }
        const originalContent = searchBtn.innerHTML;
        try {
            searchBtn.innerHTML = '<i class="iconoir-refresh"></i>';
            searchBtn.disabled = true;
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
            const results = await response.json();
            this.displaySearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            this.updateInfo('Erreur', 'Impossible de rechercher ce lieu');
        } finally {
            searchBtn.innerHTML = originalContent;
            searchBtn.disabled = false;
        }
    }

    navigateToGPSCoordinates(lat, lng) {
        this.engine.setView({lat, lng}, 17);
        if (this.searchMarker) this.searchMarker.remove();
        const el = IconPicker.createDefaultIcon('#e74c3c', 16);
        this.searchMarker = this.engine.createMarker({lat, lng}, { element: el });
        this.searchMarker.addTo(this.engine);
        this.searchMarker.setPopup(this.engine.createPopup({lat, lng},
            this.createCoordinatesPopupContent(i18n.t('search_gps_coordinates'), lat, lng, `<br><strong>${lat.toFixed(6)}, ${lng.toFixed(6)}</strong>`)));
        this.searchMarker.togglePopup();
        this.hideSearchResults();
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
    }

    displaySearchResults(results) {
        const container = document.getElementById('search-results');
        if (!container) return;
        container.innerHTML = '';
        if (!results || results.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'search-result-item';
            empty.textContent = 'Aucun résultat trouvé';
            container.appendChild(empty);
            container.classList.remove('hidden');
            return;
        }
        results.forEach(r => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            const nameEl = document.createElement('div');
            nameEl.className = 'result-name';
            nameEl.textContent = r.name || (r.display_name || '').split(',')[0];
            const addrEl = document.createElement('div');
            addrEl.className = 'result-address';
            addrEl.textContent = r.display_name || '';
            item.appendChild(nameEl);
            item.appendChild(addrEl);
            item.addEventListener('click', () => this.selectSearchResult(r.lat, r.lon, r.display_name || ''));
            container.appendChild(item);
        });
        container.classList.remove('hidden');
        setTimeout(() => { document.addEventListener('click', this.hideSearchResults.bind(this), { once: true }); }, 100);
    }

    selectSearchResult(lat, lng, name) {
        this.engine.setView({lat, lng}, 15);
        if (this.searchMarker) this.searchMarker.remove();
        const el = IconPicker.createDefaultIcon('#e74c3c', 16);
        this.searchMarker = this.engine.createMarker({lat, lng}, { element: el });
        this.searchMarker.addTo(this.engine);
        this.searchMarker.setPopup(this.engine.createPopup({lat, lng},
            this.createCoordinatesPopupContent('Résultat de recherche', lat, lng, `<br>${name}`)));
        this.searchMarker.togglePopup();
        this.hideSearchResults();
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
    }

    hideSearchResults() {
        const container = document.getElementById('search-results');
        if (container) container.classList.add('hidden');
    }

    // ========== ISOCHRONE UI ==========

    updateCostLabel() {
        const calcModeEl = document.getElementById('calc-mode-sidebar');
        const costLabel = document.getElementById('cost-label-sidebar');
        const timeUnitSelect = document.getElementById('time-unit-sidebar');
        const costValueEl = document.getElementById('cost-value-sidebar');
        if (!calcModeEl || !costLabel || !timeUnitSelect || !costValueEl) return;

        const calcMode = calcModeEl.value;
        const parentEl = timeUnitSelect.parentNode;
        if (parentEl) {
            parentEl.querySelectorAll('.custom-select-wrapper').forEach(w => w.remove());
        }
        timeUnitSelect.style.display = '';

        if (calcMode === 'time') {
            costLabel.textContent = 'Durée';
            timeUnitSelect.innerHTML = '<option value="min">min</option><option value="sec">sec</option>';
            costValueEl.value = '10';
            costValueEl.placeholder = '10';
        } else {
            costLabel.textContent = 'Distance';
            timeUnitSelect.innerHTML = '<option value="m">m</option><option value="km">km</option>';
            timeUnitSelect.value = 'm';
            costValueEl.value = '1000';
            costValueEl.placeholder = '1000';
        }

        if (window.CustomSelect) new window.CustomSelect(timeUnitSelect);
    }

    updateCoordinates(latlng) {
        // Throttle pour éviter trop de mises à jour DOM
        const now = performance.now();
        if (now - this.lastCoordinatesUpdate < this.coordinatesThrottle) {
            return;
        }
        this.lastCoordinatesUpdate = now;

        const coordsEl = document.getElementById('coordinates');
        if (coordsEl) {
            coordsEl.textContent = `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`;
        }
    }


    // === NOUVEAU SYSTÈME D'ÉDITION MODERNE ===

    setupModernEditSystem() {
        // Initialiser le menu contextuel simple
        this.setupSimpleContextMenu();
    }

    setupSimpleContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        const colorSubmenu = document.getElementById('color-submenu');

        // If context menu doesn't exist, skip initialization
        if (!contextMenu) {
            console.warn('[DEBUG] Context menu element not found, skipping initialization');
            return;
        }

        // Éviter d'attacher les événements plusieurs fois
        if (this.contextMenuInitialized) return;
        this.contextMenuInitialized = true;

        // Masquer le menu au clic gauche ailleurs (ignorer les clics droits)
        document.addEventListener('click', (e) => {
            // Ignorer les clics droits (button === 2) pour ne pas interférer avec contextmenu
            if (e.button !== 0) return;

            const clickOnContextMenu = contextMenu.contains(e.target);
            const clickOnColorSubmenu = colorSubmenu ? colorSubmenu.contains(e.target) : false;
            const clickOnColorButton = e.target.closest('#change-color');
            const clickOnColorOption = e.target.closest('.color-option');

            // Si clic sur le bouton couleur, ne rien faire (géré par son propre événement)
            if (clickOnColorButton) {
                return;
            }

            // Si clic sur une option de couleur, ne rien faire (géré par l'événement spécifique)
            if (clickOnColorOption) {
                return;
            }

            // Si le sous-menu couleur est visible et qu'on clique n'importe où (sauf bouton couleur et option), fermer le sous-menu
            if (colorSubmenu && !colorSubmenu.classList.contains('hidden')) {
                this.hideColorSubmenu();
                // Si le clic n'est pas sur le menu contextuel, fermer aussi le menu principal
                if (!clickOnContextMenu) {
                    this.hideContextMenu();
                }
                return;
            }

            // Sinon, si clic en dehors du menu contextuel, fermer tout
            if (!clickOnContextMenu) {
                this.hideContextMenu();
            }
        });

        // Helper function to safely add event listeners (local scope)
        const safeAdd = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`[DEBUG] safeAdd: Element #${id} not found!`);
            }
        };

        // Événements du menu (une seule fois)
        safeAdd('edit-element', 'click', () => {
            this.editCurrentElement();
            this.hideContextMenu();
        });

        safeAdd('change-color', 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const colorSubmenu = document.getElementById('color-submenu');
            if (colorSubmenu && colorSubmenu.classList.contains('hidden')) {
                this.showColorSubmenu(e);
            } else if (colorSubmenu) {
                this.hideColorSubmenu();
            }
        });

        safeAdd('delete-element', 'click', () => {
            this.deleteCurrentElement();
            this.hideContextMenu();
        });

        safeAdd('change-icon', 'click', () => {
            this.togglePointIcon();
            this.hideContextMenu();
        });

        safeAdd('toggle-line-measurements', 'click', () => {
            this.toggleLineSegmentLabels();
            this.hideContextMenu();
        });

        // Événement pour le bouton de fermeture du sous-menu
        safeAdd('close-color-submenu', 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.hideColorSubmenu();
        });

        // Événements pour le sous-menu couleur
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const color = e.currentTarget.getAttribute('data-color');

                if (this.currentEditElement) {
                    this.applyColorToElement(this.currentEditElement, color);
                }

                // Fermer le sous-menu immédiatement et directement
                const colorSubmenu = document.getElementById('color-submenu');
                if (colorSubmenu) {
                    colorSubmenu.classList.add('hidden');
                }

                // Puis fermer le menu principal
                setTimeout(() => {
                    this.hideContextMenu();
                }, 10);
            });
        });
    }

    showContextMenu(x, y, element, elementType) {
        const contextMenu = document.getElementById('context-menu');

        if (!contextMenu) {
            console.warn('Context menu element not found');
            return;
        }

        this.currentEditElement = { element, elementType };

        // Adapter le menu selon le type
        const moveBtn = document.getElementById('move-element');
        const editBtn = document.getElementById('edit-element');
        const deleteBtn = document.getElementById('delete-element');
        const changeIconBtn = document.getElementById('change-icon');
        const changeIconText = document.getElementById('change-icon-text');

        // Hide move button if it exists (drag&drop replaces it)
        if (moveBtn) {
            moveBtn.style.display = 'none';
        }

        // Show change icon button only for points
        if (changeIconBtn) {
            if (elementType === 'point') {
                changeIconBtn.style.display = 'flex';
                if (changeIconText) {
                    changeIconText.textContent = i18n.t('change_icon');
                }
            } else {
                changeIconBtn.style.display = 'none';
            }
        }

        // Show copy coordinates button only for points
        const copyCoordinatesBtn = document.getElementById('copy-point-coordinates');
        const copyCoordinatesText = document.getElementById('copy-point-coordinates-text');
        if (copyCoordinatesBtn) {
            if (elementType === 'point') {
                copyCoordinatesBtn.style.display = 'flex';
                if (copyCoordinatesText) {
                    copyCoordinatesText.textContent = i18n.t('copy_coordinates');
                }
                // Remove old listener and add new one
                const newBtn = copyCoordinatesBtn.cloneNode(true);
                copyCoordinatesBtn.parentNode.replaceChild(newBtn, copyCoordinatesBtn);
                newBtn.addEventListener('click', () => {
                    this.hideContextMenu();
                    if (element.latlng) {
                        this.copyCoordinatesToClipboard(element.latlng.lat, element.latlng.lng);
                    }
                });
            } else {
                copyCoordinatesBtn.style.display = 'none';
            }
        }

        // Show toggle measurements button only for lines
        const toggleLineMeasurementsBtn = document.getElementById('toggle-line-measurements');
        const toggleLineMeasurementsText = document.getElementById('toggle-line-measurements-text');
        if (toggleLineMeasurementsBtn) {
            if (elementType === 'line') {
                toggleLineMeasurementsBtn.style.display = 'flex';
                if (toggleLineMeasurementsText) {
                    toggleLineMeasurementsText.textContent = i18n.t('toggle_line_measurements');
                }
            } else {
                toggleLineMeasurementsBtn.style.display = 'none';
            }
        }

        // Adapter le texte du bouton supprimer selon le contexte
        if (deleteBtn) {
            if (elementType === 'point') {
                // Vérifier si le point fait partie d'une structure
                const isPartOfStructure = this.isPointPartOfStructure(element);
                if (isPartOfStructure) {
                    deleteBtn.innerHTML = `<i class="iconoir-trash"></i><span>${i18n.t('delete')}</span>`;
                    deleteBtn.title = i18n.t('prompt_delete_point');
                } else {
                    deleteBtn.innerHTML = `<i class="iconoir-trash"></i><span>${i18n.t('delete')}</span>`;
                    deleteBtn.title = i18n.t('prompt_delete_point');
                }
            } else {
                deleteBtn.innerHTML = `<i class="iconoir-trash"></i><span>${i18n.t('delete')}</span>`;
                deleteBtn.title = i18n.t('delete');
            }
        }

        // Positionner intelligemment
        contextMenu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
        contextMenu.style.top = Math.min(y, window.innerHeight - 160) + 'px';
        contextMenu.classList.remove('hidden');
    }

    /**
     * Show unified context menu for element (uses layers-ui.js menu system)
     * This replaces the old showContextMenu for better UX consistency
     */
    showUnifiedContextMenu(x, y, elementData, elementType) {
        // Find the element in layers by ID
        if (!elementData || !elementData.id) {
            console.warn('Element data or ID missing for unified context menu');
            return;
        }

        // Use the layers-ui.js menu system directly
        if (window.createElementContextMenu && window.showContextMenu) {
            const menuHTML = window.createElementContextMenu(elementData.id);
            // If menu is empty (element not found in layers), use fallback
            if (menuHTML && menuHTML.trim() !== '') {
                window.showContextMenu(menuHTML, x, y);
            } else {
                // Fallback to old menu for sub-elements (circle centerPoints, polygon points, etc.)
                this.showContextMenu(x, y, elementData, elementType);
            }
        } else {
            // Fallback to old menu if layers-ui not loaded
            this.showContextMenu(x, y, elementData, elementType);
        }
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu) {
            contextMenu.classList.add('hidden');
        }
        this.hideColorSubmenu();
        this.currentEditElement = null;

        // Also close layers-ui menu if open
        if (window.closeContextMenu) {
            window.closeContextMenu();
        }
    }

    hideColorSubmenu() {
        const colorSubmenu = document.getElementById('color-submenu');
        if (colorSubmenu) {
            colorSubmenu.classList.add('hidden');
        }
    }

    editCurrentElement() {
        if (!this.currentEditElement) return;

        const { element, elementType } = this.currentEditElement;

        if (elementType === 'point') {
            // Check if this point is a centerPoint of a circle
            const parentCircle = this.data.circles.find(c => c.centerPoint && c.centerPoint.id === element.id);
            if (parentCircle) {
                this.renameCircle(parentCircle);
            } else {
                this.renamePoint(element);
            }
        } else if (elementType === 'isochrone') {
            this.renameIsochrone(element);
        } else if (elementType === 'polygon') {
            this.renamePolygon(element);
        } else if (elementType === 'circle') {
            this.renameCircle(element);
        }
    }

    showColorSubmenu(event) {
        if (!this.currentEditElement) return;

        const colorSubmenu = document.getElementById('color-submenu');
        const changeColorBtn = event.currentTarget;

        // Calculer la position du sous-menu par rapport au bouton "Couleur"
        const btnRect = changeColorBtn.getBoundingClientRect();

        // Positionner le sous-menu à droite du bouton
        colorSubmenu.style.left = `${btnRect.right + 5}px`;
        colorSubmenu.style.top = `${btnRect.top}px`;

        // Afficher le sous-menu
        colorSubmenu.classList.remove('hidden');
    }

    deleteCurrentElement() {
        if (!this.currentEditElement) return;

        const { element, elementType } = this.currentEditElement;

        if (elementType === 'point') {
            this.deletePointWithStructureUpdate(element);
        } else {
            confirmAction(i18n.t('prompt_delete_element'), i18n.t('delete'), i18n.t('cancel')).then(confirmed => {
                if (confirmed) {
                    this.removeElementFromMap(element, elementType);
                }
            });
        }
    }

    toggleElementName(show) {
        if (!this.currentEditElement) return;

        const { element, elementType } = this.currentEditElement;

        // Save showName preference in element AND in LayersManager
        element.showName = show;

        // Also save in LayersManager element
        let found = false;
        if (window.layersManager && element.id) {
            for (let layer of window.layersManager.layers) {
                const layerElement = layer.elements.find(e => e.id == element.id);
                if (layerElement) {
                    layerElement.showName = show;
                    // Also save in element.data
                    if (layerElement.data) {
                        layerElement.data.showName = show;
                    }
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.warn('  ⚠️ Element not found in layers!');
            }
        }

        // Use LabelManager for points, polygons, and isochrones
        if (elementType === 'point') {
            const labelId = `label_point_${element.id}`;
            this.labelManager.setVisibility(labelId, show);
        } else if (elementType === 'polygon') {
            const labelId = `label_polygon_${element.id}`;
            this.labelManager.setVisibility(labelId, show);
        } else if (elementType === 'isochrone') {
            const labelId = `label_isochrone_${element.id}`;
            this.labelManager.setVisibility(labelId, show);
        } else {
            // Pour les éléments Overpass, le label est dans element.data.label
            const label = element.label || element.data?.label;

            // Toggle label/name visibility
            if (label) {
                if (show) {
                    if (!this.map.hasLayer(label)) {
                        label.addTo(this.map);
                    }
                } else {
                    if (this.map.hasLayer(label)) {
                        this.map.removeLayer(label);
                    }
                }
            }
        }

        // For circles: toggle center point label using LabelManager
        if (elementType === 'circle' && element.centerPoint) {
            const labelId = `label_point_${element.centerPoint.id}`;
            this.labelManager.setVisibility(labelId, show);
        }

        // For lines and polygons: toggle ALL helper point labels using LabelManager
        if ((elementType === 'line' || elementType === 'polygon') && element.pointData) {
            element.pointData.forEach(pointData => {
                const labelId = `label_point_${pointData.id}`;
                this.labelManager.setVisibility(labelId, show);
            });
        }

        // Save to both storages
        this.saveToLocalStorage();
        if (window.layersManager) {
            window.layersManager.save();
        }
    }

    toggleElementIcon(show) {
        if (!this.currentEditElement) return;

        const { element, elementType } = this.currentEditElement;

        // Pour les éléments Overpass, le marker est dans element.data.marker ou element.mapObject
        const marker = element.marker || element.data?.marker || element.mapObject;

        // Toggle marker/icon visibility for simple elements (points, overpass)
        if (marker && (elementType === 'point' || elementType === 'overpass')) {
            // Find the layer element to use cluster-aware add/remove
            const layerElement = element.layerId ?
                window.layersManager?.getLayer(element.layerId)?.elements.find(e => e.id === element.id) :
                null;

            if (layerElement && window.layersManager) {
                if (show) {
                    window.layersManager.addElementToMap(layerElement);
                } else {
                    window.layersManager.removeElementFromMap(layerElement);
                }
            } else {
                // Fallback for elements not in layers
                if (show) {
                    if (!this.map.hasLayer(marker)) {
                        marker.addTo(this.map);
                    }
                } else {
                    if (this.map.hasLayer(marker)) {
                        this.map.removeLayer(marker);
                    }
                }
            }
        }

        // For circles: toggle ONLY center point marker (not the circle itself)
        if (elementType === 'circle') {
            if (element.centerPoint && element.centerPoint.marker) {
                if (show) {
                    if (!this.map.hasLayer(element.centerPoint.marker)) {
                        element.centerPoint.marker.addTo(this.map);
                    }
                } else {
                    if (this.map.hasLayer(element.centerPoint.marker)) {
                        this.map.removeLayer(element.centerPoint.marker);
                    }
                }
            }
        }

        // For polygons: toggle corner point markers AND their labels
        if (elementType === 'polygon') {
            element.showIcon = show;  // Save icon visibility state
            if (element.pointData) {
                element.pointData.forEach(pointData => {
                    // Toggle marker
                    if (pointData.marker) {
                        if (show) {
                            if (!this.map.hasLayer(pointData.marker)) {
                                pointData.marker.addTo(this.map);
                            }
                        } else {
                            if (this.map.hasLayer(pointData.marker)) {
                                this.map.removeLayer(pointData.marker);
                            }
                        }
                    }
                    // Toggle label using LabelManager
                    const labelId = `label_point_${pointData.id}`;
                    this.labelManager.setVisibility(labelId, show);
                });
            }
        }

        // For lines: toggle ONLY point markers (not the polylines)
        if (elementType === 'line') {
            if (element.pointData) {
                element.pointData.forEach(pointData => {
                    if (pointData.marker) {
                        if (show) {
                            if (!this.map.hasLayer(pointData.marker)) {
                                pointData.marker.addTo(this.map);
                            }
                        } else {
                            if (this.map.hasLayer(pointData.marker)) {
                                this.map.removeLayer(pointData.marker);
                            }
                        }
                    }
                });
            }
        }

        this.saveToLocalStorage();
        if (window.layersManager) {
            window.layersManager.save();
        }
    }

    async togglePointIcon() {
        if (!this.currentEditElement) return;

        const { element, elementType } = this.currentEditElement;

        if (elementType !== 'point') return;

        // Get the marker
        const marker = element.marker || element.data?.marker;
        if (!marker) return;

        // Get the element's layer color (not the current active layer!)
        let layerColor = '#e74c3c'; // Default color
        if (window.layersManager) {
            const elementId = element.id || element.data?.id;
            const elementPointType = element.type || element.data?.type;

            // Special case: if this is a circle center point, find the parent circle
            if (elementPointType === 'circle-center') {
                // Find the circle that contains this center point
                for (const layer of window.layersManager.layers) {
                    const parentCircle = layer.elements.find(e =>
                        e.type === 'circle' &&
                        e.data?.centerPoint?.id === elementId
                    );
                    if (parentCircle) {
                        layerColor = layer.color;
                        break;
                    }
                }
            } else {
                // Normal case: find the element directly in layers
                for (const layer of window.layersManager.layers) {
                    const foundElement = layer.elements.find(e => e.id == elementId);
                    if (foundElement) {
                        layerColor = layer.color;
                        break;
                    }
                }
            }
        }

        // Open icon picker modal
        if (!window.iconPicker) {
            console.error('Icon picker not initialized');
            return;
        }

        // Open modal with callback
        window.iconPicker.openModal(layerColor, async (iconName) => {
            try {
                // Create the new icon (28px by default)
                const newIconEl = await window.iconPicker.createIcon(iconName, layerColor);

                // Update the marker DOM — replace content and resize
                const markerEl = marker.getElement ? marker.getElement() : null;
                if (markerEl && newIconEl) {
                    const labels = markerEl.querySelectorAll('.rhinomap-label');
                    markerEl.innerHTML = newIconEl.innerHTML;
                    markerEl.className = newIconEl.className;
                    markerEl.style.cssText = newIconEl.style.cssText;
                    labels.forEach(l => markerEl.appendChild(l));
                }

                // Store the new icon type
                element.iconType = 'svg';
                element.iconName = iconName;
                if (element.data) {
                    element.data.iconType = 'svg';
                    element.data.iconName = iconName;
                }

                // Update label using LabelManager
                const labelId = `label_point_${element.id}`;
                const pointData = element.data || element;

                // Check if label is currently visible
                const wasVisible = this.labelManager.isVisible(labelId);

                // Remove old label from LabelManager
                this.labelManager.removeLabel(labelId);

                // Create new label with correct offset for SVG icon
                const newLabel = this.labelManager.createLabel('point', pointData, {
                    position: element.latlng || element.data?.latlng,
                    visible: wasVisible !== null ? wasVisible : true,
                    labelId: labelId,
                    iconType: 'svg',
                    marker: marker,  // Pass marker for bindTooltip
                    color: layerColor  // Pass layer color for styling
                });

                // Update references
                if (element.label) element.label = newLabel;
                if (element.data && element.data.label) element.data.label = newLabel;

                // Save to localStorage
                this.saveToLocalStorage();
                if (window.layersManager) {
                    window.layersManager.save();
                }

            } catch (error) {
                console.error('Failed to change icon:', error);
                showError(i18n.t('error_change_icon'));
            }
        });
    }

    toggleLineSegmentLabels() {
        if (!this.currentEditElement) return;

        const { element, elementType } = this.currentEditElement;

        if (!element || elementType !== 'line') return;

        // Get segment labels
        const segmentLabels = element.segmentLabels || element.data?.segmentLabels;
        if (!segmentLabels || segmentLabels.length === 0) return;

        // Check current state (are labels visible?)
        const currentlyVisible = this.map.hasLayer(segmentLabels[0]);
        const targetState = !currentlyVisible;

        // Toggle all segment labels
        segmentLabels.forEach(label => {
            if (label) {
                if (targetState) {
                    if (!this.map.hasLayer(label)) {
                        this.map.addLayer(label);
                    }
                } else {
                    if (this.map.hasLayer(label)) {
                        this.map.removeLayer(label);
                    }
                }
            }
        });

        // Store state in element for persistence
        if (element.showSegmentLabels !== undefined) {
            element.showSegmentLabels = targetState;
        }
        if (element.data) {
            element.data.showSegmentLabels = targetState;
        }

        // Save changes
        this.saveToLocalStorage();
        if (window.layersManager) {
            window.layersManager.save();
        }

    }

    isPointPartOfStructure(pointData) {
        // Vérifier si le point fait partie d'une ligne
        const inLine = this.data.lines.some(line =>
            line.pointData && line.pointData.some(p => p.id === pointData.id)
        );

        // Vérifier si le point fait partie d'un polygone
        const inPolygon = this.data.polygons.some(polygon =>
            polygon.pointData && polygon.pointData.some(p => p.id === pointData.id)
        );

        // Vérifier si le point est le centre d'un cercle
        const isCenterOfCircle = this.data.circles.some(circle =>
            circle.centerPoint && circle.centerPoint.id === pointData.id
        );

        return inLine || inPolygon || isCenterOfCircle;
    }

    async deletePointWithStructureUpdate(pointData) {
        const structures = this.findStructuresContainingPoint(pointData);

        if (structures.length === 0) {
            // Point isolé, suppression simple
            const confirmed = await confirmAction(
                `${i18n.t('prompt_delete_point')} "${pointData.name}" ?`,
                i18n.t('delete'),
                i18n.t('cancel')
            );
            if (confirmed) {
                this.removeElementFromMap(pointData, 'point');
            }
            return;
        }

        // Point faisant partie de structures
        let message = `${i18n.t('prompt_delete_point')} "${pointData.name}" ?<br><br>`;
        message += `${i18n.t('prompt_delete_point_with_structures')}<br>`;
        structures.forEach(struct => {
            if (struct.type === 'line') {
                message += `• ${i18n.t('prompt_line_with_points').replace('{count}', struct.data.points.length)}<br>`;
            } else if (struct.type === 'polygon') {
                message += `• ${i18n.t('prompt_polygon_with_points').replace('{count}', struct.data.points.length)}<br>`;
            } else if (struct.type === 'circle') {
                message += `• ${i18n.t('prompt_circle_complete_deletion')}<br>`;
            }
        });

        const confirmed = await confirmAction(message, i18n.t('delete'), i18n.t('cancel'));
        if (confirmed) {
            this.removePointFromStructures(pointData, structures);
        }
    }

    findStructuresContainingPoint(pointData) {
        const structures = [];

        // Chercher dans les lignes
        this.data.lines.forEach(line => {
            if (line.pointData && line.pointData.some(p => p.id === pointData.id)) {
                structures.push({ type: 'line', data: line });
            }
        });

        // Chercher dans les polygones
        this.data.polygons.forEach(polygon => {
            if (polygon.pointData && polygon.pointData.some(p => p.id === pointData.id)) {
                structures.push({ type: 'polygon', data: polygon });
            }
        });

        // Chercher dans les cercles
        this.data.circles.forEach(circle => {
            if (circle.centerPoint && circle.centerPoint.id === pointData.id) {
                structures.push({ type: 'circle', data: circle });
            }
        });

        return structures;
    }

    removePointFromStructures(pointData, structures) {
        structures.forEach(struct => {
            if (struct.type === 'line') {
                this.removePointFromLine(pointData, struct.data);
            } else if (struct.type === 'polygon') {
                this.removePointFromPolygon(pointData, struct.data);
            } else if (struct.type === 'circle') {
                // Si c'est le centre du cercle, supprimer tout le cercle
                this.removeElementFromMap(struct.data, 'circle');
            }
        });

        // Supprimer le point lui-même des points autonomes
        this.data.points = this.data.points.filter(p => p.id !== pointData.id);
        if (pointData.marker) this.map.removeLayer(pointData.marker);

        // Remove label using LabelManager
        this.labelManager.removeLabel(`label_point_${pointData.id}`);

        this.updateInfo('Point supprimé', 'Structures mises à jour');
    }

    removePointFromLine(pointData, line) {
        const pointIndex = line.pointData.findIndex(p => p.id === pointData.id);
        if (pointIndex === -1) return;

        // Si c'est une ligne avec seulement 2 points, supprimer toute la ligne
        if (line.points.length <= 2) {
            this.removeElementFromMap(line, 'line');
            return;
        }

        // Identifier les segments à supprimer AVANT de supprimer le point
        const segmentsToRemove = [];

        // Segment amont (si pas le premier point)
        if (pointIndex > 0) {
            segmentsToRemove.push(pointIndex - 1);
        }

        // Segment aval (si pas le dernier point)
        if (pointIndex < line.points.length - 1) {
            segmentsToRemove.push(pointIndex);
        }

        // Stocker les points pour la reconnexion AVANT de supprimer
        const needsReconnection = pointIndex > 0 && pointIndex < line.points.length - 1;
        const prevPoint = needsReconnection ? line.points[pointIndex - 1] : null;
        const nextPoint = needsReconnection ? line.points[pointIndex + 1] : null;

        // Supprimer le point
        line.pointData.splice(pointIndex, 1);
        line.points.splice(pointIndex, 1);

        // Supprimer les segments, polylines et labels dans l'ordre inverse pour éviter les problèmes d'index
        segmentsToRemove.sort((a, b) => b - a).forEach(segIndex => {
            // New format: shapeIds
            if (line.shapeIds && line.shapeIds[segIndex]) {
                this.engine.removeShape(line.shapeIds[segIndex]);
                line.shapeIds.splice(segIndex, 1);
            }
            // Old format: polylines
            if (line.polylines && line.polylines[segIndex]) {
                if (line.polylines[segIndex].remove) line.polylines[segIndex].remove();
                line.polylines.splice(segIndex, 1);
            }
            // Segment label
            if (line.segmentLabelIds && line.segmentLabelIds[segIndex]) {
                this.labelManager.removeLabel(line.segmentLabelIds[segIndex]);
                line.segmentLabelIds.splice(segIndex, 1);
            } else if (line.segmentLabels && line.segmentLabels[segIndex]) {
                this.labelManager.removeLabel(`label_line-segment_${line.id}_${segIndex}`);
                line.segmentLabels.splice(segIndex, 1);
            }
            if (line.segments[segIndex]) {
                line.segments.splice(segIndex, 1);
            }
        });

        // Reconnecter si nécessaire (il faut un point avant ET après)
        if (needsReconnection && prevPoint && nextPoint) {
            // Créer un nouveau segment pour reconnecter
            const newSegment = {
                id: Date.now() + Math.random(),
                start: prevPoint, end: nextPoint,
                distance: GeoUtils.haversineDistance(prevPoint, nextPoint),
                azimuth: GeoUtils.calculateAzimuth(prevPoint, nextPoint)
            };
            const newShapeId = this.engine.addPolyline(null, [prevPoint, nextPoint], {
                color: line.color || '#e74c3c',
                weight: 3
            });
            const newPolyline = newShapeId; // Store shape ID instead of Leaflet object

            // Insérer le nouveau segment à la bonne position (où était le premier segment supprimé)
            const insertIndex = pointIndex > 0 ? pointIndex - 1 : 0;
            line.segments.splice(insertIndex, 0, newSegment);
            line.polylines.splice(insertIndex, 0, newPolyline);

            // Ajouter le label du nouveau segment using LabelManager with polyline binding
            const midpoint = this.calculateMidpoint(prevPoint, nextPoint);
            const segmentData = { distance: newSegment.distance, azimuth: newSegment.azimuth, id: `${line.id}_seg_${insertIndex}` };
            const labelId = `label_line-segment_${line.id}_${insertIndex}`;
            const label = this.labelManager.createLabel('line-segment', segmentData, {
                position: midpoint,
                visible: true,
                labelId: labelId,
                polyline: newPolyline  // Bind tooltip to the reconnection polyline
            });

            line.segmentLabels.splice(insertIndex, 0, label);
        }

        // Recalculer la distance totale
        line.totalDistance = line.segments.reduce((sum, seg) => sum + seg.distance, 0);

        // IMPORTANT: After removing/adding segments, indexes changed!
        // We need to recreate ALL segment labels with correct indexes
        this.recreateLineSegmentLabels(line);

        // Save changes
        this.saveToLocalStorage();
        if (window.layersManager) {
            window.layersManager.save();
        }
    }

    recreateLineSegmentLabels(line) {
        // Remove all existing segment labels
        if (line.segmentLabels) {
            line.segmentLabels.forEach((label, index) => {
                this.labelManager.removeLabel(`label_line-segment_${line.id}_${index}`);
            });
        }

        // Recreate all segment labels with correct indexes and polyline bindings
        line.segmentLabels = [];
        for (let i = 0; i < line.points.length - 1; i++) {
            const startPoint = line.points[i];
            const endPoint = line.points[i + 1];
            const midpoint = this.calculateMidpoint(startPoint, endPoint);
            const segment = line.segments[i];
            const polyline = line.polylines[i];  // Get corresponding polyline

            if (segment && polyline) {
                const segmentData = { distance: segment.distance, azimuth: segment.azimuth, id: `${line.id}_seg_${i}` };
                const labelId = `label_line-segment_${line.id}_${i}`;
                const label = this.labelManager.createLabel('line-segment', segmentData, {
                    position: midpoint,
                    visible: true,
                    labelId: labelId,
                    polyline: polyline  // Bind tooltip to polyline
                });
                line.segmentLabels.push(label);
            }
        }
    }

    removePointFromPolygon(pointData, polygon) {
        const pointIndex = polygon.pointData.findIndex(p => p.id === pointData.id);
        if (pointIndex === -1) return;

        // Si le polygone a moins de 4 points, le supprimer complètement
        if (polygon.points.length <= 3) {
            this.removeElementFromMap(polygon, 'polygon');
            return;
        }

        // Supprimer le point
        polygon.pointData.splice(pointIndex, 1);
        polygon.points.splice(pointIndex, 1);

        // Redessiner le polygone
        if (polygon.polygon) {
            polygon.polygon.setLatLngs(polygon.points);

            // Recalculer l'aire et le périmètre
            polygon.area = this.calculatePolygonArea(polygon.points);
            polygon.perimeter = this.calculatePolygonPerimeter(polygon.points);

            // Mettre à jour le popup
            polygon.polygon.bindPopup(`
                <strong>Polygone</strong><br>
                Points: ${polygon.points.length}<br>
                Aire: ${polygon.area.toFixed(2)} m²<br>
                Périmètre: ${polygon.perimeter.toFixed(2)} m<br>
                Aire (ha): ${(polygon.area / 10000).toFixed(3)} ha
            `);

            // Mettre à jour le label central avec la nouvelle superficie
            const labelId = `label_polygon_${polygon.id}`;
            const color = polygon.color || '#9b59b6';
            this.labelManager.updateLabelColor(labelId, color, polygon);
            // Update position manually for bound tooltips
            const center = polygon.polygon.getBounds().getCenter();
            polygon.center = center;
            this.labelManager.updatePosition(labelId, center);
        }
    }

    // === MÉTHODES UTILITAIRES ===

    renamePoint(pointData) {
        const modal = document.getElementById('point-name-modal');
        const input = document.getElementById('point-name-input');
        const overlay = document.getElementById('simple-modal-overlay');
        const title = document.getElementById('modal-title');

        title.textContent = 'Modifier le nom du point';
        input.value = pointData.name;
        modal.classList.remove('hidden');
        overlay.classList.remove('hidden');
        input.focus();

        const confirm = () => {
            const newName = input.value.trim();
            if (newName && newName !== pointData.name) {
                pointData.name = newName;
                if (pointData.label) {
                    pointData.label.setContent(`<div class="point-name">${newName}</div>`);
                }

                // Update element name in layers system
                if (window.layersManager && pointData.id) {
                    for (let layer of window.layersManager.layers) {
                        const element = layer.elements.find(e => e.id === pointData.id);
                        if (element) {
                            element.name = newName;
                            break;
                        }
                    }
                }

                this.updateInfo('Point modifié', `"${newName}" mis à jour`);
                this.saveToLocalStorage();

                // Update layer UI to reflect the name change
                if (window.updateLayersUI) {
                    window.updateLayersUI();
                }
            }
            modal.classList.add('hidden');
            overlay.classList.add('hidden');
        };

        const cancel = () => {
            modal.classList.add('hidden');
            overlay.classList.add('hidden');
        };

        document.getElementById('confirm-point').onclick = confirm;
        document.getElementById('cancel-point').onclick = cancel;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') confirm();
            if (e.key === 'Escape') cancel();
        };
    }

    renameIsochrone(isochroneData) {
        const newName = prompt('Nom de l\'isochrone:', isochroneData.name || 'Isochrone');
        if (newName && newName.trim()) {
            isochroneData.name = newName.trim();
            if (isochroneData.polygon) {
                const params = isochroneData.parameters;
                const modeText = params.transportMode === 'car' ? 'Voiture' : 'Piéton';
                const calcText = `${params.inputValue}${params.inputUnit}`;
                const dirText = params.directionMode === 'departure' ? 'depuis' : 'vers';

                isochroneData.polygon.bindPopup(`
                    <strong>${newName}</strong><br>
                    Mode: ${modeText}<br>
                    ${params.calcMode === 'time' ? 'Temps' : 'Distance'}: ${calcText}<br>
                    Direction: ${dirText} le point
                `);
            }

            // Update label using LabelManager
            const labelId = `label_isochrone_${isochroneData.id}`;
            this.labelManager.updateLabel(labelId, { ...isochroneData, name: newName.trim() });

            // Update element name in layers system
            if (window.layersManager && isochroneData.id) {
                for (let layer of window.layersManager.layers) {
                    const element = layer.elements.find(e => e.id === isochroneData.id);
                    if (element) {
                        element.name = newName.trim();
                        break;
                    }
                }
            }

            this.updateInfo('Isochrone modifiée', `"${newName}" mis à jour`);

            // Update layer UI to reflect the name change
            if (window.updateLayersUI) {
                window.updateLayersUI();
            }
        }
    }

    renamePolygon(polygonData) {
        const newName = prompt('Nom du polygone:', polygonData.name || 'Polygone');
        if (newName !== null && newName.trim()) {
            polygonData.name = newName.trim();

            // Update label using LabelManager with color
            const labelId = `label_polygon_${polygonData.id}`;

            // Get color from stored data, or from current layer, or fallback to polygon's fillColor
            let color = polygonData.color;
            if (!color && window.layersManager) {
                // Try to find the polygon in layers to get its color
                for (const layer of window.layersManager.layers) {
                    const found = layer.elements.find(e => e.id === polygonData.id && e.type === 'polygon');
                    if (found) {
                        color = layer.color;
                        break;
                    }
                }
            }
            if (!color && polygonData.polygon && polygonData.polygon.options) {
                // Fallback to polygon's own fillColor
                color = polygonData.polygon.options.fillColor || polygonData.polygon.options.color;
            }
            if (!color) {
                color = '#9b59b6';  // Final fallback
            }

            // Store the color for next time
            polygonData.color = color;

            this.labelManager.updateLabelColor(labelId, color, polygonData);

            // Update popup
            if (polygonData.polygon) {
                polygonData.polygon.bindPopup(`
                    <strong>${newName.trim()}</strong><br>
                    Points: ${polygonData.points.length}<br>
                    Aire: ${this.formatArea(polygonData.area)}<br>
                    Périmètre: ${this.formatDistance(polygonData.perimeter)}
                `);
            }

            // Update element name in layers system
            if (window.layersManager && polygonData.id) {
                for (let layer of window.layersManager.layers) {
                    const element = layer.elements.find(e => e.id === polygonData.id);
                    if (element) {
                        element.name = newName.trim();
                        break;
                    }
                }
            }

            this.updateInfo('Polygone modifié', `"${newName.trim()}" mis à jour`);
            this.saveToLocalStorage();

            // Update layer UI to reflect the name change
            if (window.updateLayersUI) {
                window.updateLayersUI();
            }
        }
    }

    renameCircle(circleData) {
        const newName = prompt('Nom du cercle:', circleData.name || 'Cercle');
        if (newName !== null && newName.trim()) {
            circleData.name = newName.trim();

            // Update center point label using LabelManager
            if (circleData.centerPoint) {
                circleData.centerPoint.name = newName.trim();
                const labelId = `label_point_${circleData.centerPoint.id}`;
                this.labelManager.updateLabel(labelId, circleData.centerPoint);
            }

            // Update popup
            if (circleData.circle) {
                circleData.circle.bindPopup(`
                    <strong>${newName.trim()}</strong><br>
                    Rayon: ${this.formatDistance(circleData.radius)}<br>
                    Superficie: ${this.formatArea(Math.PI * circleData.radius * circleData.radius)}
                `);
            }

            // Update element name in layers system
            let found = false;
            if (window.layersManager && circleData.id) {
                for (let layer of window.layersManager.layers) {
                    const element = layer.elements.find(e => e.id == circleData.id);
                    if (element) {
                        element.name = newName.trim();
                        // Also update element.data.name for persistence
                        if (element.data) {
                            element.data.name = newName.trim();
                        }
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    console.error('  ❌ NOT FOUND in any layer!');
                }
                // Save and update UI
                window.layersManager.save();
                window.layersManager.updateUI();
            } else {
                console.warn('⚠️ LayersManager not available or no ID');
            }

            this.updateInfo('Cercle modifié', `"${newName.trim()}" mis à jour`);
            this.saveToLocalStorage();

            // Update layer UI to reflect the name change
            if (window.updateLayersUI) {
                window.updateLayersUI();
            }
        }
    }

    applyColorToElement(editElement, color) {
        const { element, elementType } = editElement;

        if (elementType === 'point') {
            // Update marker DOM
            if (element.marker && element.marker.getElement) {
                const el = element.marker.getElement();
                const inner = el.querySelector('div');
                if (inner) inner.style.backgroundColor = color;
            }
            // Update label color
            const labelId = `label_point_${element.id}`;
            this.labelManager.updateLabelColor(labelId, color, element);
        } else if (elementType === 'line') {
            // New format: shapeIds
            if (element.shapeIds && this.engine) {
                element.shapeIds.forEach(id => this.engine.setShapeStyle(id, { color }));
            }
            // Old format: polylines
            if (element.polylines) {
                element.polylines.forEach(p => { if (p && p.setStyle) p.setStyle({ color }); });
            }
            // Update segment labels
            if (element.segmentLabelIds) {
                element.segmentLabelIds.forEach(id => this.labelManager.updateLabelColor(id, color, {}));
            }
        } else if (elementType === 'circle') {
            if (element.shapeId && this.engine) {
                this.engine.setShapeStyle(element.shapeId, { color, fillColor: color });
            }
            if (element.circle && element.circle.setStyle) {
                element.circle.setStyle({ color, fillColor: color });
            }
        } else if (elementType === 'polygon' || elementType === 'isochrone') {
            if (element.shapeId && this.engine) {
                this.engine.setShapeStyle(element.shapeId, { color, fillColor: color });
            }
            if (element.polygon && element.polygon.setStyle) {
                element.polygon.setStyle({ color, fillColor: color });
            }
            const labelId = `label_${elementType}_${element.id}`;
            this.labelManager.updateLabelColor(labelId, color, element);
        }

        // Update helper points (line vertices, polygon vertices, circle center)
        if (element.pointData) {
            element.pointData.forEach(pd => {
                if (pd.marker && pd.marker.getElement) {
                    const inner = pd.marker.getElement().querySelector('div');
                    if (inner) inner.style.backgroundColor = color;
                }
            });
        }
        if (element.centerPoint && element.centerPoint.marker && element.centerPoint.marker.getElement) {
            const inner = element.centerPoint.marker.getElement().querySelector('div');
            if (inner) inner.style.backgroundColor = color;
        }

        element.color = color;
        if (element.data) element.data.color = color;
        this.updateInfo('Couleur modifiée', 'Élément mis à jour');
        this.saveToLocalStorage();
    }

    getMarkerColorName(hexColor) {
        const colorMap = {
            '#e74c3c': 'red',
            '#3498db': 'blue',
            '#27ae60': 'green',
            '#f39c12': 'orange',
            '#9b59b6': 'violet',
            '#e91e63': 'red'
        };
        return colorMap[hexColor] || 'red';
    }

    removeElementFromMap(element, elementType) {
        // Helper: remove a MapMarker or Leaflet layer
        const rm = (obj) => {
            if (!obj) return;
            if (obj.remove) obj.remove();                        // MapMarker / maplibregl.Marker
            else if (this.map && this.map.removeLayer) this.map.removeLayer(obj); // compat
        };

        // Helper: remove a shape by ID
        const rmShape = (id) => {
            if (id && this.engine) this.engine.removeShape(id);
        };

        if (elementType === 'point') {
            rm(element.marker);
            this.labelManager.removeLabel(`label_point_${element.id}`);
            this.data.points = this.data.points.filter(p => p.id !== element.id);

        } else if (elementType === 'line') {
            // New format: shapeIds
            if (element.shapeIds) element.shapeIds.forEach(id => rmShape(id));
            // Old format: polylines
            if (element.polylines) element.polylines.forEach(p => rm(p));
            // Segment labels
            if (element.segmentLabelIds) {
                element.segmentLabelIds.forEach(id => this.labelManager.removeLabel(id));
            } else if (element.segmentLabels) {
                element.segmentLabels.forEach((l, i) => this.labelManager.removeLabel(`label_line-segment_${element.id}_${i}`));
            }
            // Helper points
            if (element.pointData) {
                element.pointData.forEach(pd => {
                    rm(pd.marker);
                    this.labelManager.removeLabel(`label_point_${pd.id}`);
                });
            }
            this.data.lines = this.data.lines.filter(l => l.id !== element.id);

        } else if (elementType === 'circle') {
            rmShape(element.shapeId);           // new format
            rm(element.circle);                 // old format
            if (element.centerPoint) {
                rm(element.centerPoint.marker);
                this.labelManager.removeLabel(`label_point_${element.centerPoint.id}`);
            }
            this.data.circles = this.data.circles.filter(c => c.id !== element.id);

        } else if (elementType === 'polygon') {
            rmShape(element.shapeId);           // new format
            rm(element.polygon);                // old format
            this.labelManager.removeLabel(`label_polygon_${element.id}`);
            if (element.pointData) {
                element.pointData.forEach(pd => {
                    rm(pd.marker);
                    this.labelManager.removeLabel(`label_point_${pd.id}`);
                });
            }
            this.data.polygons = this.data.polygons.filter(p => p.id !== element.id);

        } else if (elementType === 'isochrone') {
            rmShape(element.shapeId);           // new format
            rm(element.polygon);                // old format
            this.labelManager.removeLabel(`label_isochrone_${element.id}`);
            rm(element.centerMarker);
            this.data.isochrones = this.data.isochrones.filter(i => i.id !== element.id);
        }

        // Remove from LayersManager to ensure persistence
        if (window.layersManager && element.id) {
            window.layersManager.removeElement(element.id);
        }

        this.updateInfo('Élément supprimé', 'Retiré de la carte');
        this.saveToLocalStorage();
    }

    // === SYSTÈME DE MISE À JOUR DES ÉLÉMENTS CONNECTÉS ===

    updateConnectedElements(pointData, newPos) {
        // Mettre à jour les lignes connectées
        this.updateConnectedLines(pointData, newPos);

        // Mettre à jour les cercles dont ce point est le centre
        this.updateConnectedCircles(pointData, newPos);

        // Mettre à jour les polygones contenant ce point
        this.updateConnectedPolygons(pointData, newPos);
    }

    updateConnectedLines(pointData, newPos) {
        this.data.lines.forEach(line => {
            if (!line.pointData) return;

            // Trouver l'index du point dans la ligne
            const pointIndex = line.pointData.findIndex(p => p.id === pointData.id);
            if (pointIndex === -1) return;

            // Mettre à jour les coordonnées dans le tableau des points
            if (line.points && line.points[pointIndex]) {
                line.points[pointIndex] = newPos;
            }

            // Redessiner les segments connectés
            this.redrawLineSegments(line, pointIndex);
        });
    }

    redrawLineSegments(line, changedPointIndex) {
        // Support both old (polylines array) and new (shapeIds array) formats
        const hasShapeIds = line.shapeIds && line.shapeIds.length > 0;
        const hasPolylines = line.polylines && line.polylines.length > 0;
        if (!hasShapeIds && !hasPolylines) return;
        if (!line.points) return;

        const updateSegment = (segIndex, startPoint, endPoint) => {
            // Update geometry
            if (hasShapeIds && line.shapeIds[segIndex]) {
                this.engine.updatePolyline(line.shapeIds[segIndex], [startPoint, endPoint]);
            } else if (hasPolylines && line.polylines[segIndex] && line.polylines[segIndex].setLatLngs) {
                line.polylines[segIndex].setLatLngs([startPoint, endPoint]);
            }

            // Update measurements
            const distance = GeoUtils.haversineDistance(startPoint, endPoint);
            const azimuth = GeoUtils.calculateAzimuth(startPoint, endPoint);
            const midpoint = GeoUtils.calculateMidpoint(startPoint, endPoint);

            if (line.segments && line.segments[segIndex]) {
                line.segments[segIndex].distance = distance;
                line.segments[segIndex].azimuth = azimuth;
            }

            const labelId = `label_line-segment_${line.id}_${segIndex}`;
            this.labelManager.updateLabel(labelId, { distance, azimuth });
            this.labelManager.updatePosition(labelId, midpoint);
        };

        if (changedPointIndex > 0) {
            updateSegment(changedPointIndex - 1, line.points[changedPointIndex - 1], line.points[changedPointIndex]);
        }

        // Redessiner le segment suivant (si existe)
        if (changedPointIndex < line.points.length - 1) {
            updateSegment(changedPointIndex, line.points[changedPointIndex], line.points[changedPointIndex + 1]);
        }
    }

    updateConnectedCircles(pointData, newPos) {
        this.data.circles.forEach(circle => {
            if (circle.centerPoint && circle.centerPoint.id === pointData.id) {
                circle.center = newPos;
                // New format: shapeId
                if (circle.shapeId && this.engine) {
                    this.engine.updateCirclePolygon(circle.shapeId, newPos, circle.radius);
                }
                // Old Leaflet format fallback
                if (circle.circle && circle.circle.setLatLng) {
                    circle.circle.setLatLng(newPos);
                }
            }
        });
    }

    updateConnectedPolygons(pointData, newPos) {
        this.data.polygons.forEach(polygon => {
            if (!polygon.pointData) return;

            // Trouver l'index du point dans le polygone
            const pointIndex = polygon.pointData.findIndex(p => p.id === pointData.id);
            if (pointIndex === -1) return;

            // Mettre à jour les coordonnées dans le tableau des points
            if (polygon.points && polygon.points[pointIndex]) {
                polygon.points[pointIndex] = newPos;
            }

            // Redessiner le polygone — new format (shapeId) or old (Leaflet polygon)
            if (polygon.shapeId && this.engine) {
                this.engine.updatePolygon(polygon.shapeId, polygon.points);
            } else if (polygon.polygon && polygon.polygon.setLatLngs) {
                polygon.polygon.setLatLngs(polygon.points);
            }

            // Recalculer
            polygon.area = GeoUtils.calculatePolygonArea(polygon.points);
            polygon.perimeter = GeoUtils.calculatePolygonPerimeter(polygon.points);

            // Centre
            const center = {
                lat: polygon.points.reduce((s, p) => s + p.lat, 0) / polygon.points.length,
                lng: polygon.points.reduce((s, p) => s + p.lng, 0) / polygon.points.length
            };
            polygon.center = center;
            const labelId = `label_polygon_${polygon.id}`;

            const color = polygon.color || '#9b59b6';
            {

                // Store the color for next time
                polygon.color = color;

                this.labelManager.updateLabelColor(labelId, color, polygon);
                // Note: Bound tooltips on polygons need manual position update when polygon shape changes
                this.labelManager.updatePosition(labelId, center);
            }
        });
    }
}

// Initialiser l'application
let app;
document.addEventListener('DOMContentLoaded', () => {
    try {
        app = new RhinoMapToolbox();
        window.app = app; // Exposer globalement pour les autres modules
    } catch(e) {
        console.error('❌ RhinoMapToolbox init FAILED:', e);
        window.app = app; // Expose même si init partielle
    }

    // Expose helper function globally for other modules (like overpass-manager.js)
    window.createCoordinatesPopupContent = (name, lat, lng, additionalContent = '') => {
        return app.createCoordinatesPopupContent(name, lat, lng, additionalContent);
    };

    // Expose attachLayerHighlighting globally for overpass-manager.js and others
    window.attachLayerHighlighting = (mapObject, layerId, elementId) => {
        return app.attachLayerHighlighting(mapObject, layerId, elementId);
    };

    // Add global event listener for copy coordinates button
    // Using event delegation on document for dynamically created popups
    document.addEventListener('click', function(e) {
        const copyBtn = e.target.closest('.copy-coords-btn');
        if (!copyBtn) return;

        e.preventDefault();
        e.stopPropagation();

        const lat = parseFloat(copyBtn.dataset.lat);
        const lng = parseFloat(copyBtn.dataset.lng);

        if (isNaN(lat) || isNaN(lng)) {
            console.error('Invalid coordinates for copy:', copyBtn.dataset);
            return;
        }

        // Format coordinates for clipboard
        const coordsText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

        // Copy to clipboard using modern Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(coordsText)
                .then(() => {
                    showToast(i18n.t('coordinates_copied'), 'success');
                })
                .catch(err => {
                    console.error('Failed to copy coordinates:', err);
                    showError(i18n.t('error'));
                });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = coordsText;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showToast(i18n.t('coordinates_copied'), 'success');
            } catch (err) {
                console.error('Failed to copy coordinates:', err);
                showError(i18n.t('error'));
            }
            document.body.removeChild(textArea);
        }
    });
});