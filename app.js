class RhinoMapToolbox {
    constructor() {
        this.map = null;
        this.currentTool = null;
        this.currentLayer = 'osm';
        this.layers = {};
        this.data = {
            points: [],
            lines: [],
            circles: [],
            polygons: [],
            isochrones: []
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
        this.updateThrottle = 50; // ~20fps pour réduire le lag

        this.init();
    }

    init() {
        this.initMap();
        this.initEventListeners();
        // Initialiser les labels du panneau isochrone
        this.updateCostLabel();

        // Charger les données depuis localStorage au démarrage
        const loaded = this.loadFromLocalStorage();

        if (!loaded) {
            this.updateInfo('Carte initialisée', 'Sélectionnez un outil pour commencer');
        }
    }

    initMap() {
        // Initialiser la carte centrée sur la France
        this.map = L.map('map').setView([46.603354, 1.888334], 6);

        // Couches de carte
        this.layers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        });

        this.layers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri'
        });

        // Ajouter la couche par défaut
        this.layers.osm.addTo(this.map);

        // Événements de la carte
        this.map.on('mousemove', (e) => {
            this.updateCoordinates(e.latlng);
        });

        this.map.on('click', (e) => {
            this.handleMapClick(e);
        });

        this.map.on('dblclick', (e) => {
            this.handleMapDoubleClick(e);
        });

        // Clic droit pour finir les tracés
        this.map.on('contextmenu', (e) => {
            this.handleMapRightClick(e);
        });

        this.map.on('mousemove', (e) => {
            if (this.currentTool === 'line' && this.isDrawing && this.currentLine) {
                this.updateLinePreview(e.latlng);
            }
        });
    }

    initEventListeners() {
        // Outils
        document.getElementById('point-tool').addEventListener('click', () => this.selectTool('point'));
        document.getElementById('line-tool').addEventListener('click', () => this.selectTool('line'));
        document.getElementById('circle-tool').addEventListener('click', () => this.selectTool('circle'));
        document.getElementById('polygon-tool').addEventListener('click', () => this.selectTool('polygon'));
        document.getElementById('isochrone-tool').addEventListener('click', () => this.selectTool('isochrone'));
        document.getElementById('clear-tool').addEventListener('click', () => this.clearAll());

        // Couches
        document.getElementById('map-layer').addEventListener('click', () => this.switchLayer('osm'));
        document.getElementById('satellite-layer').addEventListener('click', () => this.switchLayer('satellite'));

        // Import/Export
        document.getElementById('import-btn').addEventListener('click', () => this.importData());
        document.getElementById('export-btn').addEventListener('click', (e) => this.toggleExportMenu(e));
        document.getElementById('clear-storage-btn').addEventListener('click', () => this.clearLocalStorage());

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
        document.getElementById('search-btn').addEventListener('click', () => this.performSearch());
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
        document.getElementById('file-input').addEventListener('change', (e) => this.loadFile(e));

        // Système d'édition moderne
        this.currentEditElement = null;
        this.isDragging = false;
        this.setupModernEditSystem();

        // Panneau de contraintes
        document.getElementById('constraints-tool').addEventListener('click', () => this.togglePanel());
        document.getElementById('panel-toggle').addEventListener('click', () => this.togglePanel());
        document.getElementById('reset-constraints').addEventListener('click', () => this.resetConstraints());
        document.getElementById('finish-line').addEventListener('click', () => this.finishCurrentLine());

        // Écouter les changements de contraintes en temps réel
        document.getElementById('lock-distance').addEventListener('change', () => this.updateConstraintsRealTime());
        document.getElementById('lock-azimuth').addEventListener('change', () => this.updateConstraintsRealTime());
        document.getElementById('distance-value').addEventListener('input', () => this.updateConstraintsRealTime());
        document.getElementById('azimuth-value').addEventListener('input', () => this.updateConstraintsRealTime());

        // Modal de nommage des points
        document.getElementById('cancel-point').addEventListener('click', () => this.closePointNameModal());
        document.getElementById('confirm-point').addEventListener('click', () => this.confirmPointName());
        document.getElementById('simple-modal-overlay').addEventListener('click', () => this.closePointNameModal());
        document.getElementById('point-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.confirmPointName();
            }
        });

        // Panneau isochrones
        document.getElementById('isochrone-panel-toggle').addEventListener('click', () => this.toggleIsochronePanel());
        document.getElementById('cancel-isochrone').addEventListener('click', () => this.cancelIsochrone());
        document.getElementById('calculate-isochrone').addEventListener('click', () => this.calculateIsochrone());

        // Mise à jour dynamique du label selon le mode de calcul
        document.getElementById('calc-mode').addEventListener('change', () => this.updateCostLabel());
        document.getElementById('time-unit').addEventListener('change', () => this.updateCostLabel());

        // Raccourcis clavier
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelCurrentAction();
            }

            // Ctrl+L pour ouvrir/fermer le panneau pendant le tracé
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
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));

        // Activer le nouvel outil
        document.getElementById(tool + '-tool').classList.add('active');

        this.currentTool = tool;
        this.cancelCurrentAction();

        // Afficher/masquer les panneaux selon l'outil
        const constraintsBtn = document.getElementById('constraints-tool');
        const isochronePanel = document.getElementById('isochrone-panel');
        const constraintsPanel = document.getElementById('constraints-panel');

        if (tool === 'line') {
            constraintsBtn.style.display = 'flex';
            isochronePanel.classList.add('hidden');
        } else if (tool === 'isochrone') {
            constraintsBtn.style.display = 'none';
            constraintsPanel.classList.add('hidden');
            isochronePanel.classList.remove('hidden');
        } else {
            constraintsBtn.style.display = 'none';
            constraintsPanel.classList.add('hidden');
            isochronePanel.classList.add('hidden');
        }

        // Changer le curseur de la carte en crosshair pour les outils de dessin
        const mapContainer = document.getElementById('map');
        mapContainer.style.cursor = 'crosshair';

        this.updateInfo(this.getCurrentToolName(), this.getCurrentToolDescription());
    }

    deselectTool() {
        // Désactiver tous les outils
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        this.currentTool = null;

        // Remettre le curseur par défaut
        const mapContainer = document.getElementById('map');
        mapContainer.style.cursor = '';

        // Masquer tous les panneaux
        document.getElementById('constraints-panel').classList.add('hidden');
        document.getElementById('isochrone-panel').classList.add('hidden');
        document.getElementById('constraints-tool').style.display = 'none';

        this.updateInfo('Mode déplacement', 'Vous pouvez maintenant déplacer les points et interagir avec les éléments');
    }

    switchLayer(layer) {
        document.querySelectorAll('.layer-btn').forEach(btn => btn.classList.remove('active'));

        // Activer le bon bouton selon la couche
        if (layer === 'osm') {
            document.getElementById('map-layer').classList.add('active');
        } else {
            document.getElementById('satellite-layer').classList.add('active');
        }

        // Vérifier si la couche actuelle existe et est attachée avant de la supprimer
        const currentLayerObj = this.layers[this.currentLayer];
        if (currentLayerObj && this.map.hasLayer(currentLayerObj)) {
            this.map.removeLayer(currentLayerObj);
        }

        // Ajouter la nouvelle couche
        if (layer === 'satellite') {
            this.layers.satellite.addTo(this.map);
        } else {
            this.layers.osm.addTo(this.map);
        }

        this.currentLayer = layer;
    }

    handleMapClick(e) {
        const latlng = e.latlng;
        const originalEvent = e.originalEvent;

        // Vérifier si c'est Ctrl+clic pour finir un tracé
        if (originalEvent && originalEvent.ctrlKey) {
            this.handleFinishDrawing();
            return;
        }

        switch (this.currentTool) {
            case 'point':
                this.addPoint(latlng);
                break;
            case 'line':
                this.handleLineClick(latlng);
                break;
            case 'circle':
                this.handleCircleClick(latlng);
                break;
            case 'polygon':
                this.handlePolygonClick(latlng);
                break;
            case 'isochrone':
                this.handleIsochroneClick(latlng);
                break;
        }
    }

    handleMapDoubleClick(e) {
        if (this.currentTool === 'line' && this.isDrawing) {
            this.finishCurrentLine();
        } else if (this.currentTool === 'polygon' && this.isDrawing) {
            this.finishCurrentPolygon();
        }
    }

    handleMapRightClick(e) {
        // Empêcher le menu contextuel par défaut
        L.DomEvent.preventDefault(e.originalEvent);

        // Finir le tracé en cours
        this.handleFinishDrawing();
    }

    handleFinishDrawing() {
        if (!this.isDrawing) return;

        switch (this.currentTool) {
            case 'line':
                if (this.currentLine && this.currentLine.points.length >= 2) {
                    this.finishCurrentLine();
                }
                break;
            case 'polygon':
                if (this.currentPolygon && this.currentPolygon.points.length >= 3) {
                    this.finishCurrentPolygon();
                }
                break;
        }
    }

    finishCurrentLine() {
        if (!this.currentLine || this.currentLine.segments.length === 0) return;

        // Calculer les statistiques totales
        const totalDistance = this.calculateTotalDistance();
        const segmentCount = this.currentLine.segments.length;

        // Popup récapitulatif
        const lastPoint = this.currentLine.points[this.currentLine.points.length - 1];
        L.popup()
            .setLatLng(lastPoint)
            .setContent(`
                <strong>Tracé terminé</strong><br>
                Segments: ${segmentCount}<br>
                Distance totale: ${this.formatDistance(totalDistance)}<br>
                Points: ${this.currentLine.points.length}
            `)
            .openOn(this.map);

        // Sauvegarder dans les données
        this.data.lines.push({
            ...this.currentLine,
            totalDistance: totalDistance,
            segmentCount: segmentCount
        });
        this.saveToLocalStorage();

        // Nettoyer et terminer
        this.clearTempElements();
        this.isDrawing = false;
        this.currentLine = null;
        this.resetConstraints();
        this.hidePanel();

        // Désélectionner l'outil pour revenir en mode déplacement
        this.deselectTool();

        this.updateInfo('Tracé terminé', `${segmentCount} segments, ${this.formatDistance(totalDistance)} total`);
    }

    createSegment(startPoint, endPoint) {
        const distance = this.calculateDistance(startPoint, endPoint);
        const azimuth = this.calculateAzimuth(startPoint, endPoint);

        return {
            id: Date.now() + Math.random(),
            start: startPoint,
            end: endPoint,
            distance: distance,
            azimuth: azimuth
        };
    }

    addSegmentLabel(segment, startPoint, endPoint) {
        const midpoint = this.calculateMidpoint(startPoint, endPoint);

        const label = L.tooltip({
            permanent: true,
            direction: 'center',
            className: 'segment-label'
        })
        .setLatLng(midpoint)
        .setContent(`${this.formatDistance(segment.distance)}<br>${segment.azimuth.toFixed(0)}°`)
        .addTo(this.map);

        this.currentLine.segmentLabels.push(label);
    }

    calculateTotalDistance() {
        if (!this.currentLine || !this.currentLine.segments) return 0;
        return this.currentLine.segments.reduce((total, segment) => total + segment.distance, 0);
    }

    resetConstraintsForNextSegment() {
        // Optionnel: garder les contraintes ou les réinitialiser
        // Pour l'instant on les garde pour permettre des segments identiques
        this.updateInfo('Segment ajouté', 'Contraintes conservées pour le prochain segment');
    }

    addPoint(latlng) {
        // Stocker temporairement les coordonnées du point
        this.tempPointLocation = latlng;
        this.openPointNameModal();
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
            // Mode modification avec objet point direct
            this.currentEditingPoint.name = pointName;
            if (this.currentEditingPoint.label) {
                this.currentEditingPoint.label.setContent(pointName);
            }
            this.closePointNameModal();
        } else if (this.currentEditingPointId) {
            // Mode modification avec ID (ancien système)
            this.renamePoint(this.currentEditingPointId, pointName);
            this.closePointNameModal();
        } else if (this.tempPointLocation) {
            // Mode création
            this.createNamedPoint(this.tempPointLocation, pointName);
            this.closePointNameModal();
        }
    }

    createRenameablePoint(latlng, name, type = 'point', existingId = null) {
        // Créer le marker avec drag&drop
        const marker = L.marker(latlng, {
            draggable: true
        }).addTo(this.map);

        // Label moderne et stable
        const label = L.tooltip({
            permanent: true,
            direction: 'top',
            offset: [0, -40], // Plus loin du pin
            className: 'modern-point-label',
            interactive: false
        })
        .setLatLng(latlng)
        .setContent(`<div class="point-name">${name}</div>`)
        .addTo(this.map);

        // Objet de données du point - utiliser l'ID existant ou en créer un nouveau
        const pointData = {
            id: existingId || (Date.now() + Math.random()),
            latlng: latlng,
            name: name,
            type: type,
            marker: marker,
            label: label,
            color: '#e74c3c'
        };

        // === ÉVÉNEMENTS MODERNES ===

        // Drag & Drop pour déplacer
        marker.on('dragstart', () => {
            this.isDragging = true;
        });

        marker.on('drag', (e) => {
            const newPos = e.target.getLatLng();
            pointData.latlng = newPos;
            label.setLatLng(newPos);

            // Mettre à jour tous les éléments connectés en temps réel
            this.updateConnectedElements(pointData, newPos);
        });

        marker.on('dragend', (e) => {
            this.isDragging = false;
            const newPos = e.target.getLatLng();
            pointData.latlng = newPos;

            // Mise à jour finale des éléments connectés
            this.updateConnectedElements(pointData, newPos);
            this.updateInfo('Point déplacé', `"${pointData.name}" repositionné`);
            this.saveToLocalStorage();
        });

        // Clic droit pour menu contextuel
        marker.on('contextmenu', (e) => {
            e.originalEvent.preventDefault();
            if (!this.isDragging) {
                this.showContextMenu(e.originalEvent.clientX, e.originalEvent.clientY, pointData, 'point');
            }
        });

        // Double-clic pour renommer rapidement
        marker.on('dblclick', (e) => {
            e.originalEvent.preventDefault();
            this.renamePoint(pointData);
        });

        return pointData;
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
            // Mettre à jour le nom
            pointData.name = newName;

            // Mettre à jour le label
            if (pointData.nameLabel) {
                pointData.nameLabel.setContent(newName);
            }

            // Mettre à jour la popup du marker
            if (pointData.marker) {
                pointData.marker.bindPopup(`
                    <strong>${newName}</strong><br>
                    Lat: ${pointData.latlng.lat.toFixed(6)}<br>
                    Lng: ${pointData.latlng.lng.toFixed(6)}<br>
                    <small>Clic sur le nom pour renommer</small>
                `);
            }

            this.updateInfo('Point renommé', `"${newName}"`);
        }
    }

    createNamedPoint(latlng, name, existingId = null) {
        // Utiliser la nouvelle méthode pour créer un point renommable avec ID optionnel
        const pointData = this.createRenameablePoint(latlng, name, 'standalone', existingId);

        // Ajouter le popup avec les coordonnées
        pointData.marker.bindPopup(`
            <strong>${name}</strong><br>
            Lat: ${latlng.lat.toFixed(6)}<br>
            Lng: ${latlng.lng.toFixed(6)}<br>
            <small>Clic sur le nom pour renommer</small>
        `);

        this.data.points.push(pointData);
        this.updateInfo('Point ajouté', `"${name}" - Total: ${this.data.points.length} points`);
        this.saveToLocalStorage();

        return pointData;
    }


    handleLineClick(latlng) {
        if (!this.isDrawing) {
            // Commencer une nouvelle ligne multi-segments
            this.isDrawing = true;
            this.currentLine = {
                id: Date.now(),
                points: [latlng],
                segments: [],
                polylines: [],
                markers: [],
                segmentLabels: [],
                pointData: [] // Données des points avec noms
            };

            // Créer un point renommable pour le début
            const startPointData = this.createRenameablePoint(latlng, 'Début', 'start');
            this.currentLine.pointData.push(startPointData);
            this.currentLine.markers.push(startPointData.marker);

            // Ouvrir automatiquement le panneau de contraintes
            this.showPanel();

            this.updateInfo('Tracé commencé', 'Clic: ajouter segment | Ctrl+clic: terminer | Ctrl+L: contraintes');
        } else {
            // Ajouter un segment
            const endPoint = this.constrainedEndPoint || latlng;
            const startPoint = this.currentLine.points[this.currentLine.points.length - 1];

            // Ajouter le nouveau point
            this.currentLine.points.push(endPoint);

            // Créer le segment
            const segment = this.createSegment(startPoint, endPoint);
            this.currentLine.segments.push(segment);

            // Créer la ligne du segment
            const segmentPolyline = L.polyline([startPoint, endPoint], {
                color: '#e74c3c',
                weight: 3
            }).addTo(this.map);

            this.currentLine.polylines.push(segmentPolyline);

            // Créer un point renommable pour ce segment
            const pointIndex = this.currentLine.points.length;
            const pointData = this.createRenameablePoint(endPoint, `Point ${pointIndex}`, 'segment');
            this.currentLine.pointData.push(pointData);
            this.currentLine.markers.push(pointData.marker);

            // Label permanent pour ce segment
            this.addSegmentLabel(segment, startPoint, endPoint);

            // Nettoyer les éléments temporaires
            this.clearTempElements();

            // Réinitialiser les contraintes pour le prochain segment
            this.resetConstraintsForNextSegment();

            const totalDistance = this.calculateTotalDistance();
            this.updateInfo('Segment ajouté',
                `${this.currentLine.segments.length} segments | Total: ${this.formatDistance(totalDistance)} | Ctrl+clic pour terminer`);

            // Mettre à jour les statistiques du panneau
            this.updatePanelStats();
        }
    }

    updateLinePreview(latlng) {
        if (!this.currentLine) return;

        // Throttle updates for performance
        const now = performance.now();
        if (now - this.lastUpdateTime < this.updateThrottle) {
            return;
        }
        this.lastUpdateTime = now;

        // Utiliser le dernier point du tracé comme point de départ
        const startPoint = this.currentLine.points[this.currentLine.points.length - 1];

        // Appliquer les contraintes
        const constrainedPoint = this.applyConstraintsToPoint(latlng, startPoint);

        // Créer ou mettre à jour la ligne temporaire
        if (!this.tempPreviewLine) {
            this.tempPreviewLine = L.polyline([startPoint, constrainedPoint], {
                color: '#3498db',
                weight: 2,
                dashArray: '5, 5',
                opacity: 0.7
            }).addTo(this.map);
        } else {
            this.tempPreviewLine.setLatLngs([startPoint, constrainedPoint]);
        }

        // Calculer les mesures (optimisation: ne recalculer que si nécessaire)
        if (!this._lastConstrainedPoint ||
            this._lastConstrainedPoint.lat !== constrainedPoint.lat ||
            this._lastConstrainedPoint.lng !== constrainedPoint.lng) {

            this._lastConstrainedPoint = constrainedPoint;
            this._lastDistance = this.calculateDistance(startPoint, constrainedPoint);
            this._lastAzimuth = this.calculateAzimuth(startPoint, constrainedPoint);
            this._lastMidpoint = this.calculateMidpoint(startPoint, constrainedPoint);
        }

        // Créer ou mettre à jour le tooltip
        const content = this.getConstrainedTooltipContent(this._lastDistance, this._lastAzimuth);

        if (!this.tempMeasurementTooltip) {
            this.tempMeasurementTooltip = L.tooltip({
                permanent: true,
                className: 'measurement-tooltip fade-in'
            })
            .setLatLng(this._lastMidpoint)
            .setContent(content)
            .addTo(this.map);
        } else {
            this.tempMeasurementTooltip
                .setLatLng(this._lastMidpoint)
                .setContent(content);
        }

        // Stocker le point contraint pour l'utiliser lors du clic
        this.constrainedEndPoint = constrainedPoint;
    }

    applyConstraintsToPoint(latlng, customStartPoint = null) {
        const startPoint = customStartPoint || this.currentLine.points[0];
        let constrainedPoint = { ...latlng };

        if (this.constraints.distanceLocked && this.constraints.lockedDistance) {
            // Calculer un point à la distance verrouillée
            const bearing = this.constraints.azimuthLocked ?
                this.constraints.lockedAzimuth * Math.PI / 180 :
                this.calculateBearing(startPoint, latlng);

            constrainedPoint = this.calculateDestination(startPoint, this.constraints.lockedDistance, bearing);
        } else if (this.constraints.azimuthLocked && this.constraints.lockedAzimuth !== null) {
            // Calculer un point sur l'azimut verrouillé
            const distance = this.constraints.distanceLocked ?
                this.constraints.lockedDistance :
                this.calculateDistance(startPoint, latlng);

            const bearing = this.constraints.lockedAzimuth * Math.PI / 180;
            constrainedPoint = this.calculateDestination(startPoint, distance, bearing);
        }

        return constrainedPoint;
    }

    calculateBearing(start, end) {
        const lat1 = start.lat * Math.PI / 180;
        const lat2 = end.lat * Math.PI / 180;
        const deltaLng = (end.lng - start.lng) * Math.PI / 180;

        const x = Math.sin(deltaLng) * Math.cos(lat2);
        const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

        return Math.atan2(x, y);
    }

    calculateDestination(start, distance, bearing) {
        const R = 6371000; // Rayon de la Terre en mètres
        const lat1 = start.lat * Math.PI / 180;
        const lng1 = start.lng * Math.PI / 180;

        const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / R) +
            Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearing));

        const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(distance / R) * Math.cos(lat1),
            Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2));

        return {
            lat: lat2 * 180 / Math.PI,
            lng: lng2 * 180 / Math.PI
        };
    }

    getConstrainedTooltipContent(distance, azimuth) {
        let content = `${this.formatDistance(distance)} - ${azimuth.toFixed(1)}°`;

        if (this.constraints.distanceLocked || this.constraints.azimuthLocked) {
            content += ' 🔒';
        }

        if (this.constraints.distanceLocked) {
            content += ` | D: ${this.formatDistance(this.constraints.lockedDistance)}`;
        }

        if (this.constraints.azimuthLocked) {
            content += ` | A: ${this.constraints.lockedAzimuth}°`;
        }

        return content;
    }

    handleCircleClick(latlng) {
        if (!this.isDrawing) {
            // Commencer un cercle
            this.isDrawing = true;
            this.circleCenter = latlng;

            // Créer un point renommable pour le centre
            this.currentCenterPointData = this.createRenameablePoint(latlng, 'Centre', 'circle-center');
            this.tempElements.push(this.currentCenterPointData.marker, this.currentCenterPointData.label);

            // Créer un cercle temporaire
            this.tempCircle = L.circle(latlng, {
                radius: 100,
                color: '#f39c12',
                fillColor: '#f39c12',
                fillOpacity: 0.2,
                weight: 2
            }).addTo(this.map);

            this.tempElements.push(this.tempCircle);

            // Événement pour ajuster le rayon
            const onMouseMove = (e) => {
                const radius = this.calculateDistance(this.circleCenter, e.latlng);
                this.tempCircle.setRadius(radius);

                // Mettre à jour le tooltip avec throttling
                const now = performance.now();
                if (now - this.lastCircleUpdate > 32) { // ~30fps
                    this.lastCircleUpdate = now;

                    if (this.radiusTooltip) {
                        this.radiusTooltip
                            .setLatLng(e.latlng)
                            .setContent(`Rayon: ${this.formatDistance(radius)}<br>Superficie: ${this.formatArea(Math.PI * radius * radius)}`);
                    } else {
                        this.radiusTooltip = L.tooltip({
                            permanent: true,
                            className: 'measurement-tooltip fade-in'
                        })
                        .setLatLng(e.latlng)
                        .setContent(`Rayon: ${this.formatDistance(radius)}<br>Superficie: ${this.formatArea(Math.PI * radius * radius)}`)
                        .addTo(this.map);
                    }
                }
            };

            const onMapClick = (e) => {
                const radius = this.calculateDistance(this.circleCenter, e.latlng);

                // Créer le cercle final
                const finalCircle = L.circle(this.circleCenter, {
                    radius: radius,
                    color: '#f39c12',
                    fillColor: '#f39c12',
                    fillOpacity: 0.2,
                    weight: 2
                }).addTo(this.map);

                finalCircle.bindPopup(`
                    <strong>Cercle de mesure</strong><br>
                    Rayon: ${this.formatDistance(radius)}<br>
                    Superficie: ${this.formatArea(Math.PI * radius * radius)}
                `);

                // Retirer le point du centre des éléments temporaires pour qu'il ne soit pas supprimé
                const markerIndex = this.tempElements.indexOf(this.currentCenterPointData.marker);
                if (markerIndex > -1) this.tempElements.splice(markerIndex, 1);
                const labelIndex = this.tempElements.indexOf(this.currentCenterPointData.label);
                if (labelIndex > -1) this.tempElements.splice(labelIndex, 1);

                const circleData = {
                    id: Date.now(),
                    center: this.circleCenter,
                    radius: radius,
                    circle: finalCircle,
                    centerPoint: this.currentCenterPointData
                };

                // Menu contextuel sur le cercle
                finalCircle.on('contextmenu', (e) => {
                    e.originalEvent.preventDefault();
                    this.showContextMenu(e.originalEvent.clientX, e.originalEvent.clientY, circleData, 'circle');
                });

                this.data.circles.push(circleData);
                this.saveToLocalStorage();

                // Nettoyer
                this.clearTempElements();
                if (this.radiusTooltip) {
                    this.map.removeLayer(this.radiusTooltip);
                }

                this.map.off('mousemove', onMouseMove);
                this.map.off('click', onMapClick);
                this.isDrawing = false;

                // Désélectionner l'outil pour revenir en mode déplacement
                this.deselectTool();

                this.updateInfo('Cercle créé', `Rayon: ${this.formatDistance(radius)}`);
            };

            this.map.on('mousemove', onMouseMove);
            this.map.on('click', onMapClick);

            this.updateInfo('Cercle commencé', 'Déplacez la souris et cliquez pour définir le rayon');
        }
    }

    handlePolygonClick(latlng) {
        if (!this.isDrawing) {
            // Commencer un nouveau polygone
            this.isDrawing = true;
            this.currentPolygon = {
                id: Date.now(),
                points: [latlng],
                pointData: []
            };

            // Point de début renommable
            const startPointData = this.createRenameablePoint(latlng, 'Point 1', 'polygon-point');
            this.currentPolygon.pointData.push(startPointData);

            this.updateInfo('Polygone commencé', 'Clic: ajouter point | Ctrl+clic: terminer (min 3 points)');
        } else {
            // Ajouter un point au polygone
            this.currentPolygon.points.push(latlng);

            const pointIndex = this.currentPolygon.points.length;
            const pointData = this.createRenameablePoint(latlng, `Point ${pointIndex}`, 'polygon-point');
            this.currentPolygon.pointData.push(pointData);

            // Prévisualisation du polygone
            this.updatePolygonPreview();

            this.updateInfo('Point ajouté',
                `${pointIndex} points | Ctrl+clic pour terminer (min 3)`);
        }
    }

    updatePolygonPreview() {
        if (this.currentPolygon && this.currentPolygon.points.length >= 2) {
            // Supprimer l'ancienne prévisualisation
            if (this.tempPolygonPreview) {
                this.map.removeLayer(this.tempPolygonPreview);
            }

            // Créer la nouvelle prévisualisation
            this.tempPolygonPreview = L.polygon(this.currentPolygon.points, {
                color: '#9b59b6',
                fillColor: '#9b59b6',
                fillOpacity: 0.2,
                weight: 2,
                dashArray: '5, 5'
            }).addTo(this.map);
        }
    }

    finishCurrentPolygon() {
        if (!this.currentPolygon || this.currentPolygon.points.length < 3) {
            this.updateInfo('Erreur', 'Un polygone doit avoir au moins 3 points');
            return;
        }

        // Calculer l'aire et le périmètre
        const area = this.calculatePolygonArea(this.currentPolygon.points);
        const perimeter = this.calculatePolygonPerimeter(this.currentPolygon.points);

        // Créer le polygone final
        const polygon = L.polygon(this.currentPolygon.points, {
            color: '#9b59b6',
            fillColor: '#9b59b6',
            fillOpacity: 0.3,
            weight: 2
        }).addTo(this.map);

        polygon.bindPopup(`
            <strong>Polygone</strong><br>
            Points: ${this.currentPolygon.points.length}<br>
            Aire: ${this.formatArea(area)}<br>
            Périmètre: ${this.formatDistance(perimeter)}
        `);

        const polygonData = {
            ...this.currentPolygon,
            polygon: polygon,
            area: area,
            perimeter: perimeter
        };

        // Menu contextuel sur le polygone
        polygon.on('contextmenu', (e) => {
            e.originalEvent.preventDefault();
            this.showContextMenu(e.originalEvent.clientX, e.originalEvent.clientY, polygonData, 'polygon');
        });

        // Sauvegarder
        this.data.polygons.push(polygonData);
        this.saveToLocalStorage();

        // Nettoyer
        if (this.tempPolygonPreview) {
            this.map.removeLayer(this.tempPolygonPreview);
            this.tempPolygonPreview = null;
        }

        this.isDrawing = false;
        this.currentPolygon = null;

        // Désélectionner l'outil pour revenir en mode déplacement
        this.deselectTool();

        this.updateInfo('Polygone terminé', `Aire: ${this.formatArea(area)}`);
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
        return this.map.distance(latlng1, latlng2);
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

    clearTempElements() {
        // Nettoyer les éléments temporaires génériques
        this.tempElements.forEach(element => {
            this.map.removeLayer(element);
        });
        this.tempElements = [];

        // Nettoyer les éléments de preview spécifiques avec fade-out
        if (this.tempPreviewLine) {
            this.map.removeLayer(this.tempPreviewLine);
            this.tempPreviewLine = null;
        }

        if (this.tempMeasurementTooltip) {
            // Ajouter classe fade-out avant suppression
            const tooltipElement = this.tempMeasurementTooltip.getElement();
            if (tooltipElement) {
                tooltipElement.classList.add('fade-out');
                setTimeout(() => {
                    if (this.tempMeasurementTooltip) {
                        this.map.removeLayer(this.tempMeasurementTooltip);
                        this.tempMeasurementTooltip = null;
                    }
                }, 200);
            } else {
                this.map.removeLayer(this.tempMeasurementTooltip);
                this.tempMeasurementTooltip = null;
            }
        }
    }

    cancelCurrentAction() {
        // Nettoyer le tracé en cours si il y en a un
        if (this.currentLine) {
            // Supprimer les éléments du tracé en cours
            if (this.currentLine.markers) {
                this.currentLine.markers.forEach(marker => this.map.removeLayer(marker));
            }
            if (this.currentLine.polylines) {
                this.currentLine.polylines.forEach(polyline => this.map.removeLayer(polyline));
            }
            if (this.currentLine.segmentLabels) {
                this.currentLine.segmentLabels.forEach(label => this.map.removeLayer(label));
            }
            // Supprimer les points renommables du tracé en cours
            if (this.currentLine.pointData) {
                this.currentLine.pointData.forEach(pointData => {
                    if (pointData.marker) this.map.removeLayer(pointData.marker);
                    if (pointData.label) this.map.removeLayer(pointData.label);
                });
            }
        }

        // Nettoyer le polygone en cours
        if (this.currentPolygon) {
            if (this.currentPolygon.markers) {
                this.currentPolygon.markers.forEach(marker => this.map.removeLayer(marker));
            }
            // Supprimer les points renommables du polygone en cours
            if (this.currentPolygon.pointData) {
                this.currentPolygon.pointData.forEach(pointData => {
                    if (pointData.marker) this.map.removeLayer(pointData.marker);
                    if (pointData.label) this.map.removeLayer(pointData.label);
                });
            }
            if (this.tempPolygonPreview) {
                this.map.removeLayer(this.tempPolygonPreview);
                this.tempPolygonPreview = null;
            }
        }

        this.isDrawing = false;
        this.currentLine = null;
        this.currentPolygon = null;
        this.clearTempElements();

        // Fermer le panneau si un tracé était en cours
        if (this.currentTool === 'line') {
            this.hidePanel();
        }

        if (this.radiusTooltip) {
            this.map.removeLayer(this.radiusTooltip);
            this.radiusTooltip = null;
        }

        // Retirer tous les événements temporaires
        this.map.off('mousemove');
        this.map.off('click');

        // Rétablir les événements de base
        this.map.on('mousemove', (e) => {
            this.updateCoordinates(e.latlng);
            if (this.currentTool === 'line' && this.isDrawing && this.currentLine) {
                this.updateLinePreview(e.latlng);
            }
        });

        this.map.on('click', (e) => {
            this.handleMapClick(e);
        });
    }

    clearAll(skipSave = false) {
        // Supprimer tous les éléments de la carte
        const allItems = [...this.data.points, ...this.data.lines, ...this.data.circles, ...this.data.polygons];
        if (this.data.isochrones) {
            allItems.push(...this.data.isochrones);
        }

        allItems.forEach(item => {
            if (item.marker) this.map.removeLayer(item.marker);
            if (item.polyline) this.map.removeLayer(item.polyline);
            if (item.circle) this.map.removeLayer(item.circle);
            if (item.polygon) this.map.removeLayer(item.polygon);
            if (item.centerMarker) this.map.removeLayer(item.centerMarker);
            if (item.markers) {
                item.markers.forEach(marker => this.map.removeLayer(marker));
            }
            // Nouveaux éléments multi-segments
            if (item.polylines) {
                item.polylines.forEach(polyline => this.map.removeLayer(polyline));
            }
            if (item.segmentLabels) {
                item.segmentLabels.forEach(label => this.map.removeLayer(label));
            }
            // Nouveaux points renommables
            if (item.pointData) {
                item.pointData.forEach(pointData => {
                    if (pointData.marker) this.map.removeLayer(pointData.marker);
                    if (pointData.label) this.map.removeLayer(pointData.label);
                });
            }
            if (item.centerPoint) {
                if (item.centerPoint.marker) this.map.removeLayer(item.centerPoint.marker);
                if (item.centerPoint.label) this.map.removeLayer(item.centerPoint.label);
            }
            // Labels des points autonomes
            if (item.label) this.map.removeLayer(item.label);
        });

        // Supprimer tous les tooltips/labels restants (sécurité)
        this.map.eachLayer((layer) => {
            if (layer instanceof L.Tooltip) {
                this.map.removeLayer(layer);
            }
        });

        // Vider les données
        this.data = {
            points: [],
            lines: [],
            circles: [],
            polygons: [],
            isochrones: []
        };

        // Nettoyer les marqueurs temporaires
        if (this.searchMarker) {
            this.map.removeLayer(this.searchMarker);
            this.searchMarker = null;
        }
        if (this.isochroneMarker) {
            this.map.removeLayer(this.isochroneMarker);
            this.isochroneMarker = null;
        }

        // Sauvegarder l'état vide dans localStorage (sauf si skipSave est true)
        if (!skipSave) {
            this.saveToLocalStorage();
        }

        // Reset du panneau isochrone
        document.getElementById('isochrone-panel').classList.add('hidden');
        document.getElementById('isochrone-point-info').textContent = 'Cliquez sur la carte pour placer le point de départ';
        document.getElementById('calculate-isochrone').disabled = true;
        this.selectedIsochronePoint = null;

        this.cancelCurrentAction();
        this.updateInfo('Carte effacée', 'Tous les éléments ont été supprimés');
    }

    toggleExportMenu(e) {
        e.stopPropagation();
        const menu = document.getElementById('export-menu');
        menu.classList.toggle('hidden');
    }

    hideExportMenu() {
        document.getElementById('export-menu').classList.add('hidden');
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
        const exportData = {
            timestamp: new Date().toISOString(),
            version: "1.0",
            data: {
                points: this.data.points.map(p => ({
                    id: p.id,
                    name: p.name,
                    lat: p.latlng.lat,
                    lng: p.latlng.lng
                })),
                lines: this.data.lines.map(l => ({
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
                circles: this.data.circles.map(c => ({
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
                polygons: this.data.polygons.map(p => ({
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
                isochrones: this.data.isochrones ? this.data.isochrones.map(iso => ({
                    id: iso.id,
                    name: iso.name || 'Isochrone',
                    color: iso.color || '#3498db',
                    centerPoint: iso.centerPoint ? {
                        lat: iso.centerPoint.lat,
                        lng: iso.centerPoint.lng
                    } : null,
                    coordinates: iso.polygon ? iso.polygon.getLatLngs()[0].map(coord => ({
                        lat: coord.lat,
                        lng: coord.lng
                    })) : [],
                    properties: {
                        mode: iso.mode,
                        calcMode: iso.calcMode,
                        cost: iso.cost,
                        timeUnit: iso.timeUnit,
                        direction: iso.direction
                    }
                })) : []
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        this.downloadFile(blob, `rhinomap_${timestamp}.json`);
        this.updateInfo('Export JSON terminé', 'Fichier sauvegardé');
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
                if (iso.coordinates && iso.coordinates.length > 0) {
                    const coords = iso.coordinates.map(c => [c.lng, c.lat]);
                    coords.push(coords[0]);

                    features.push({
                        type: 'Feature',
                        properties: {
                            type: 'isochrone',
                            name: iso.name,
                            mode: iso.mode,
                            calcMode: iso.calcMode,
                            cost: iso.cost
                        },
                        geometry: {
                            type: 'Polygon',
                            coordinates: [coords]
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
        this.updateInfo('Export GeoJSON terminé', 'Fichier sauvegardé');
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
                if (iso.coordinates && iso.coordinates.length > 0) {
                    kml += '<Placemark>\n';
                    kml += `  <name>${this.escapeXML(iso.name || `Isochrone ${idx + 1}`)}</name>\n`;
                    kml += `  <description>Mode: ${iso.mode}, ${iso.calcMode}</description>\n`;
                    kml += '  <Polygon>\n';
                    kml += '    <outerBoundaryIs>\n';
                    kml += '      <LinearRing>\n';
                    kml += '        <coordinates>\n';
                    iso.coordinates.forEach(c => {
                        kml += `          ${c.lng},${c.lat},0\n`;
                    });
                    // Fermer le polygone
                    kml += `          ${iso.coordinates[0].lng},${iso.coordinates[0].lat},0\n`;
                    kml += '        </coordinates>\n';
                    kml += '      </LinearRing>\n';
                    kml += '    </outerBoundaryIs>\n';
                    kml += '  </Polygon>\n';
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
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                version: "1.0",
                data: {
                    points: this.data.points.map(p => ({
                        id: p.id,
                        name: p.name,
                        lat: p.latlng.lat,
                        lng: p.latlng.lng
                    })),
                    lines: this.data.lines.map(l => ({
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
                    circles: this.data.circles.map(c => ({
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
                    polygons: this.data.polygons.map(p => ({
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
                    isochrones: this.data.isochrones ? this.data.isochrones.map(iso => ({
                        id: iso.id,
                        name: iso.name || 'Isochrone',
                        color: iso.color || '#3498db',
                        centerPoint: iso.centerPoint ? {
                            lat: iso.centerPoint.lat,
                            lng: iso.centerPoint.lng
                        } : null,
                        coordinates: iso.polygon ? iso.polygon.getLatLngs()[0].map(coord => ({
                            lat: coord.lat,
                            lng: coord.lng
                        })) : [],
                        properties: {
                            mode: iso.mode,
                            calcMode: iso.calcMode,
                            cost: iso.cost,
                            timeUnit: iso.timeUnit,
                            direction: iso.direction
                        }
                    })) : []
                }
            };

            localStorage.setItem('rhinomap_data', JSON.stringify(exportData));
            console.log('✅ Données sauvegardées dans localStorage');
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde localStorage:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('rhinomap_data');
            if (savedData) {
                const importedData = JSON.parse(savedData);
                this.restoreData(importedData);
                console.log('✅ Données chargées depuis localStorage');
                this.updateInfo('Données restaurées', 'Session précédente chargée');
                return true;
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement localStorage:', error);
        }
        return false;
    }

    clearLocalStorage() {
        if (confirm('⚠️ Êtes-vous sûr de vouloir purger le localStorage ?\n\nToutes les données sauvegardées automatiquement seront supprimées.\n\nLes tracés actuellement affichés resteront sur la carte jusqu\'à ce que vous rechargiez la page.')) {
            try {
                localStorage.removeItem('rhinomap_data');
                console.log('🗑️ localStorage purgé');
                this.updateInfo('Storage purgé', 'localStorage vidé avec succès');
                alert('✅ localStorage purgé !\n\nLes données automatiques ont été supprimées.\nRechargez la page pour démarrer une session vierge.');
            } catch (error) {
                console.error('❌ Erreur lors de la purge localStorage:', error);
                alert('❌ Erreur lors de la purge du localStorage');
            }
        }
    }

    importData() {
        document.getElementById('file-input').click();
    }

    loadFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

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
                    alert('Format de fichier non reconnu. Utilisez un fichier JSON ou GeoJSON exporté depuis RhinoMap.');
                }
            } catch (error) {
                alert('Erreur lors du chargement du fichier: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    importGeoJSON(geojson) {
        this.clearAll(true); // Ne pas sauvegarder l'état vide

        geojson.features.forEach(feature => {
            const props = feature.properties || {};
            const geom = feature.geometry;

            if (geom.type === 'Point') {
                // Point
                const [lng, lat] = geom.coordinates;
                const name = props.name || 'Point importé';
                this.createNamedPoint({ lat, lng }, name);
            } else if (geom.type === 'LineString') {
                // Ligne
                const points = geom.coordinates.map(coord => ({
                    lat: coord[1],
                    lng: coord[0]
                }));

                if (points.length < 2) return;

                const lineData = {
                    id: Date.now() + Math.random(),
                    points: points,
                    segments: [],
                    pointData: [],
                    polylines: [],
                    segmentLabels: [],
                    totalDistance: 0
                };

                // Créer les points renommables
                points.forEach((point, idx) => {
                    const name = idx === 0 ? 'Début' : (idx === points.length - 1 ? 'Fin' : `Point ${idx + 1}`);
                    const pointData = this.createRenameablePoint(point, name, 'line-point');
                    lineData.pointData.push(pointData);
                });

                // Créer les segments
                let totalDistance = 0;
                for (let i = 0; i < points.length - 1; i++) {
                    const start = points[i];
                    const end = points[i + 1];

                    const distance = this.calculateDistance(start, end);
                    const azimuth = this.calculateAzimuth(start, end);

                    lineData.segments.push({ distance, azimuth });
                    totalDistance += distance;

                    const polyline = L.polyline([start, end], {
                        color: '#e74c3c',
                        weight: 3
                    }).addTo(this.map);

                    lineData.polylines.push(polyline);

                    // Label du segment
                    const midpoint = this.calculateMidpoint(start, end);
                    const label = L.tooltip({
                        permanent: true,
                        className: 'measurement-tooltip'
                    })
                    .setLatLng(midpoint)
                    .setContent(`${this.formatDistance(distance)} | ${azimuth.toFixed(0)}°`)
                    .addTo(this.map);

                    lineData.segmentLabels.push(label);
                }

                lineData.totalDistance = totalDistance;
                this.data.lines.push(lineData);

            } else if (geom.type === 'Polygon') {
                // Polygone ou Cercle
                const coords = geom.coordinates[0].map(coord => ({
                    lat: coord[1],
                    lng: coord[0]
                }));

                if (props.type === 'circle') {
                    // Cercle - recréer approximativement le centre
                    const centerLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
                    const centerLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;
                    const center = { lat: centerLat, lng: centerLng };
                    const radius = props.radius || this.calculateDistance(center, coords[0]);

                    const centerPoint = this.createRenameablePoint(center, props.centerName || 'Centre', 'circle-center');

                    const circle = L.circle(center, {
                        radius: radius,
                        color: '#f39c12',
                        fillColor: '#f39c12',
                        fillOpacity: 0.2,
                        weight: 2
                    }).addTo(this.map);

                    circle.bindPopup(`
                        <strong>Cercle importé</strong><br>
                        Rayon: ${this.formatDistance(radius)}<br>
                        Superficie: ${this.formatArea(Math.PI * radius * radius)}
                    `);

                    const circleData = {
                        id: Date.now() + Math.random(),
                        center: center,
                        radius: radius,
                        circle: circle,
                        centerPoint: centerPoint
                    };

                    circle.on('contextmenu', (e) => {
                        e.originalEvent.preventDefault();
                        this.showContextMenu(e.originalEvent.clientX, e.originalEvent.clientY, circleData, 'circle');
                    });

                    this.data.circles.push(circleData);

                } else {
                    // Polygone normal
                    coords.pop(); // Retirer le dernier point (doublon pour fermer)

                    const pointData = coords.map((point, idx) => {
                        return this.createRenameablePoint(point, `Point ${idx + 1}`, 'polygon-point');
                    });

                    const polygon = L.polygon(coords, {
                        color: '#9b59b6',
                        fillColor: '#9b59b6',
                        fillOpacity: 0.3,
                        weight: 2
                    }).addTo(this.map);

                    const area = props.area || this.calculatePolygonArea(coords);
                    const perimeter = props.perimeter || this.calculatePolygonPerimeter(coords);

                    polygon.bindPopup(`
                        <strong>${props.type === 'isochrone' ? 'Isochrone importée' : 'Polygone importé'}</strong><br>
                        Points: ${coords.length}<br>
                        Aire: ${this.formatArea(area)}<br>
                        Périmètre: ${this.formatDistance(perimeter)}
                    `);

                    const polygonData = {
                        id: Date.now() + Math.random(),
                        points: coords,
                        pointData: pointData,
                        polygon: polygon,
                        area: area,
                        perimeter: perimeter
                    };

                    polygon.on('contextmenu', (e) => {
                        e.originalEvent.preventDefault();
                        this.showContextMenu(e.originalEvent.clientX, e.originalEvent.clientY, polygonData, 'polygon');
                    });

                    this.data.polygons.push(polygonData);
                }
            }
        });

        // Sauvegarder dans localStorage après import
        this.saveToLocalStorage();
    }

    restoreData(importedData) {
        this.clearAll(true); // Ne pas sauvegarder l'état vide

        const data = importedData.data;

        // Restaurer les points avec leurs IDs d'origine
        data.points.forEach(pointData => {
            const latlng = { lat: pointData.lat, lng: pointData.lng };
            const name = pointData.name || `Point ${this.data.points.length + 1}`;
            this.createNamedPoint(latlng, name, pointData.id);
        });

        // Restaurer les lignes
        data.lines.forEach(lineData => {
            // Créer la ligne avec le nouveau format multi-segments
            const restoredLine = {
                id: lineData.id,
                points: lineData.points,
                segments: lineData.segments || [],
                pointData: [],
                polylines: [],
                segmentLabels: [],
                totalDistance: lineData.totalDistance || 0
            };

            // Recréer les points renommables avec leurs IDs d'origine
            if (lineData.pointData) {
                lineData.pointData.forEach(pd => {
                    const pointData = this.createRenameablePoint(
                        { lat: pd.lat, lng: pd.lng },
                        pd.name,
                        pd.type,
                        pd.id  // Passer l'ID existant
                    );
                    restoredLine.pointData.push(pointData);
                });
            }

            // Recréer les segments
            for (let i = 0; i < lineData.points.length - 1; i++) {
                const start = lineData.points[i];
                const end = lineData.points[i + 1];

                const polyline = L.polyline([start, end], {
                    color: '#e74c3c',
                    weight: 3
                }).addTo(this.map);

                restoredLine.polylines.push(polyline);

                // Label du segment
                const midpoint = this.calculateMidpoint(start, end);
                const segment = lineData.segments && lineData.segments[i];
                const distance = segment ? segment.distance : this.calculateDistance(start, end);
                const azimuth = segment ? segment.azimuth : this.calculateAzimuth(start, end);

                const label = L.tooltip({
                    permanent: true,
                    className: 'measurement-tooltip'
                })
                .setLatLng(midpoint)
                .setContent(`${distance.toFixed(1)}m | ${azimuth.toFixed(0)}°`)
                .addTo(this.map);

                restoredLine.segmentLabels.push(label);
            }

            this.data.lines.push(restoredLine);
        });

        // Restaurer les cercles
        data.circles.forEach(circleData => {
            const center = circleData.center;

            // Recréer le point central renommable avec son ID d'origine
            let centerPoint = null;
            if (circleData.centerPoint) {
                centerPoint = this.createRenameablePoint(
                    { lat: circleData.centerPoint.lat, lng: circleData.centerPoint.lng },
                    circleData.centerPoint.name,
                    circleData.centerPoint.type,
                    circleData.centerPoint.id  // Passer l'ID existant
                );
            }

            const circle = L.circle(center, {
                radius: circleData.radius,
                color: '#f39c12',
                fillColor: '#f39c12',
                fillOpacity: 0.2,
                weight: 2
            }).addTo(this.map);

            circle.bindPopup(`
                <strong>Cercle de mesure</strong><br>
                Rayon: ${circleData.radius.toFixed(2)} m<br>
                Superficie: ${(Math.PI * circleData.radius * circleData.radius / 10000).toFixed(2)} ha
            `);

            const restoredCircle = {
                id: circleData.id,
                center: center,
                radius: circleData.radius,
                circle: circle,
                centerPoint: centerPoint
            };

            // Menu contextuel sur le cercle
            circle.on('contextmenu', (e) => {
                e.originalEvent.preventDefault();
                this.showContextMenu(e.originalEvent.clientX, e.originalEvent.clientY, restoredCircle, 'circle');
            });

            this.data.circles.push(restoredCircle);
        });

        // Restaurer les polygones
        if (data.polygons) {
            data.polygons.forEach(polygonData => {
                const points = polygonData.points;

                // Recréer les points renommables avec leurs IDs d'origine
                let pointData = [];
                if (polygonData.pointData) {
                    polygonData.pointData.forEach(pd => {
                        const restoredPoint = this.createRenameablePoint(
                            { lat: pd.lat, lng: pd.lng },
                            pd.name,
                            pd.type,
                            pd.id  // Passer l'ID existant
                        );
                        pointData.push(restoredPoint);
                    });
                }

                const polygon = L.polygon(points, {
                    color: '#9b59b6',
                fillColor: '#9b59b6',
                fillOpacity: 0.3,
                weight: 2
            }).addTo(this.map);

                polygon.bindPopup(`
                    <strong>Polygone</strong><br>
                    Points: ${points.length}<br>
                    Aire: ${polygonData.area.toFixed(2)} m²<br>
                    Périmètre: ${polygonData.perimeter.toFixed(2)} m<br>
                    Aire (ha): ${(polygonData.area / 10000).toFixed(3)} ha
                `);

                const restoredPolygon = {
                    id: polygonData.id,
                    points: points,
                    pointData: pointData,
                    polygon: polygon,
                    area: polygonData.area,
                    perimeter: polygonData.perimeter
                };

                // Menu contextuel sur le polygone
                polygon.on('contextmenu', (e) => {
                    e.originalEvent.preventDefault();
                    this.showContextMenu(e.originalEvent.clientX, e.originalEvent.clientY, restoredPolygon, 'polygon');
                });

                this.data.polygons.push(restoredPolygon);
            });
        }

        // Gérer aussi les anciens triangles pour rétrocompatibilité
        if (data.triangles) {
            data.triangles.forEach(triangleData => {
                const points = triangleData.points;

                const polygon = L.polygon(points, {
                    color: '#9b59b6',
                    fillColor: '#9b59b6',
                    fillOpacity: 0.3,
                    weight: 2
                }).addTo(this.map);

                const measurements = triangleData.measurements;
                polygon.bindPopup(`
                    <strong>Triangle (ancien format)</strong><br>
                    Aire: ${measurements.area.toFixed(2)} m²<br>
                    Périmètre: ${measurements.perimeter.toFixed(2)} m
                `);

                this.data.polygons.push({
                    id: triangleData.id,
                    points: points,
                    pointData: [],
                    polygon: polygon,
                    area: measurements.area,
                    perimeter: measurements.perimeter
                });
            });
        }

        // Restaurer les isochrones
        if (data.isochrones && data.isochrones.length > 0) {
            data.isochrones.forEach(isoData => {
                if (isoData.coordinates && isoData.coordinates.length > 0) {
                    const coords = isoData.coordinates.map(c => [c.lat, c.lng]);

                    const isochronePolygon = L.polygon(coords, {
                        color: isoData.color || '#3498db',
                        fillColor: isoData.color || '#3498db',
                        fillOpacity: 0.2,
                        weight: 2
                    }).addTo(this.map);

                    const props = isoData.properties || {};
                    const modeLabel = props.mode === 'car' ? 'Voiture' : 'Piéton';
                    const calcModeLabel = props.calcMode === 'time' ? 'Isochrone' : 'Isodistance';
                    const unitLabel = props.calcMode === 'time' ? (props.timeUnit === 'min' ? 'min' : 'h') : 'm';

                    isochronePolygon.bindPopup(`
                        <strong>${isoData.name || 'Isochrone'}</strong><br>
                        Mode: ${modeLabel}<br>
                        Type: ${calcModeLabel}<br>
                        Valeur: ${props.cost || 'N/A'} ${unitLabel}<br>
                        Direction: ${props.direction === 'departure' ? 'Depuis le point' : 'Vers le point'}
                    `);

                    // Menu contextuel pour renommer et supprimer
                    isochronePolygon.on('contextmenu', (e) => {
                        e.originalEvent.preventDefault();
                        const isochroneObj = this.data.isochrones.find(iso => iso.id === isoData.id);
                        if (isochroneObj) {
                            this.showContextMenu(e.originalEvent.clientX, e.originalEvent.clientY, isochroneObj, 'isochrone');
                        }
                    });

                    const isochroneObj = {
                        id: isoData.id,
                        name: isoData.name || 'Isochrone',
                        color: isoData.color || '#3498db',
                        polygon: isochronePolygon,
                        centerPoint: isoData.centerPoint,
                        mode: props.mode,
                        calcMode: props.calcMode,
                        cost: props.cost,
                        timeUnit: props.timeUnit,
                        direction: props.direction
                    };

                    this.data.isochrones.push(isochroneObj);
                }
            });
        }

        // Sauvegarder dans localStorage après avoir tout restauré
        this.saveToLocalStorage();
    }

    updateCoordinates(latlng) {
        document.getElementById('coordinates').textContent =
            `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`;
    }

    updateInfo(title, description) {
        let constraintInfo = '';
        if (this.currentTool === 'line' && (this.constraints.distanceLocked || this.constraints.azimuthLocked)) {
            constraintInfo = '<div class="info-item">🔒 Contraintes actives</div>';
            if (this.constraints.distanceLocked) {
                constraintInfo += `<div class="info-item">Distance: ${this.constraints.lockedDistance}m</div>`;
            }
            if (this.constraints.azimuthLocked) {
                constraintInfo += `<div class="info-item">Azimut: ${this.constraints.lockedAzimuth}°</div>`;
            }
        }

        document.getElementById('info-content').innerHTML = `
            <div class="info-item"><strong>Outil:</strong> ${title}</div>
            <div class="info-item">${description}</div>
            ${constraintInfo}
            <div class="info-item"><strong>Stats:</strong></div>
            <div class="info-item">Points: ${this.data.points.length}</div>
            <div class="info-item">Traits: ${this.data.lines.length}</div>
            <div class="info-item">Cercles: ${this.data.circles.length}</div>
            <div class="info-item">Polygones: ${this.data.polygons.length}</div>
        `;
    }

    // Méthodes pour gérer le panneau de contraintes
    showPanel() {
        const panel = document.getElementById('constraints-panel');
        const finishBtn = document.getElementById('finish-line');

        // Charger les valeurs actuelles
        document.getElementById('lock-distance').checked = this.constraints.distanceLocked;
        document.getElementById('lock-azimuth').checked = this.constraints.azimuthLocked;
        document.getElementById('distance-value').value = this.constraints.lockedDistance || '';
        document.getElementById('azimuth-value').value = this.constraints.lockedAzimuth || '';

        // Afficher le bouton "Terminer" seulement si un tracé est en cours avec des segments
        if (this.isDrawing && this.currentLine && this.currentLine.segments && this.currentLine.segments.length > 0) {
            finishBtn.style.display = 'flex';
        } else {
            finishBtn.style.display = 'none';
        }

        // Mettre à jour les statistiques
        this.updatePanelStats();

        panel.classList.remove('hidden');
        panel.classList.remove('collapsed');
    }

    hidePanel() {
        const panel = document.getElementById('constraints-panel');
        panel.classList.add('hidden');
    }

    togglePanel() {
        const panel = document.getElementById('constraints-panel');
        const toggleBtn = document.getElementById('panel-toggle');
        const icon = toggleBtn.querySelector('i');

        if (panel.classList.contains('hidden')) {
            this.showPanel();
        } else if (panel.classList.contains('collapsed')) {
            panel.classList.remove('collapsed');
            icon.classList.remove('iconoir-nav-arrow-right');
            icon.classList.add('iconoir-nav-arrow-left');
        } else {
            panel.classList.add('collapsed');
            icon.classList.remove('iconoir-nav-arrow-left');
            icon.classList.add('iconoir-nav-arrow-right');
        }
    }

    resetConstraints() {
        this.constraints = {
            distanceLocked: false,
            azimuthLocked: false,
            lockedDistance: null,
            lockedAzimuth: null
        };

        // Réinitialiser les champs du panneau
        document.getElementById('lock-distance').checked = false;
        document.getElementById('lock-azimuth').checked = false;
        document.getElementById('distance-value').value = '';
        document.getElementById('azimuth-value').value = '';

        this.updateInfo(this.getCurrentToolName(), this.getCurrentToolDescription());
        this.updatePanelStats();
    }

    updateConstraintsRealTime() {
        const distanceLocked = document.getElementById('lock-distance').checked;
        const azimuthLocked = document.getElementById('lock-azimuth').checked;
        const distanceValue = parseFloat(document.getElementById('distance-value').value);
        const azimuthValue = parseFloat(document.getElementById('azimuth-value').value);

        // Validation et mise à jour en temps réel
        let validDistance = distanceLocked && distanceValue > 0 ? distanceValue : null;
        let validAzimuth = azimuthLocked && !isNaN(azimuthValue) && azimuthValue >= 0 && azimuthValue < 360 ? azimuthValue : null;

        // Appliquer les contraintes
        this.constraints.distanceLocked = distanceLocked && validDistance !== null;
        this.constraints.azimuthLocked = azimuthLocked && validAzimuth !== null;
        this.constraints.lockedDistance = validDistance;
        this.constraints.lockedAzimuth = validAzimuth;

        this.updateInfo(this.getCurrentToolName(), this.getCurrentToolDescription());
    }

    updatePanelStats() {
        // Throttle panel updates for performance
        const now = performance.now();
        if (now - (this.lastPanelUpdate || 0) < 100) { // Max 10fps pour le panel
            return;
        }
        this.lastPanelUpdate = now;

        if (!this.currentLine || !this.currentLine.segments) {
            document.getElementById('segment-count').textContent = '0';
            document.getElementById('total-distance').textContent = '0.0m';
            return;
        }

        const segmentCount = this.currentLine.segments.length;
        const totalDistance = this.calculateTotalDistance();

        document.getElementById('segment-count').textContent = segmentCount.toString();
        document.getElementById('total-distance').textContent = totalDistance.toFixed(1) + 'm';
    }

    getCurrentToolName() {
        const toolNames = {
            point: 'Points nommés',
            line: 'Tracé mesuré',
            circle: 'Zone circulaire',
            polygon: 'Aire polygone',
            isochrone: 'Isochrones'
        };
        return toolNames[this.currentTool] || 'Aucun outil';
    }

    getCurrentToolDescription() {
        const instructions = {
            point: 'Cliquez sur la carte pour placer et nommer un point',
            line: this.isDrawing ? 'Cliquez pour ajouter un segment, Ctrl+clic pour terminer' : 'Cliquez pour commencer un tracé avec mesures',
            circle: 'Cliquez sur un point central puis déplacez pour définir le rayon de la zone',
            polygon: this.isDrawing ? `${this.currentPolygon?.points.length || 0} points - Ctrl+clic pour terminer (min 3)` : 'Cliquez pour commencer un polygone de calcul d\'aire',
            isochrone: 'Cliquez sur la carte pour sélectionner un point de départ'
        };
        return instructions[this.currentTool] || 'Sélectionnez un outil pour commencer';
    }

    async performSearch() {
        const query = document.getElementById('search-input').value.trim();
        if (!query) return;

        const searchBtn = document.getElementById('search-btn');
        const originalContent = searchBtn.innerHTML;

        try {
            // Indiquer le chargement
            searchBtn.innerHTML = '<i class="iconoir-refresh"></i>';
            searchBtn.disabled = true;

            // Faire la recherche avec Nominatim
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
            const results = await response.json();

            this.displaySearchResults(results);
        } catch (error) {
            console.error('Erreur de recherche:', error);
            this.updateInfo('Erreur', 'Impossible de rechercher ce lieu');
        } finally {
            // Restaurer le bouton
            searchBtn.innerHTML = originalContent;
            searchBtn.disabled = false;
        }
    }

    displaySearchResults(results) {
        const resultsContainer = document.getElementById('search-results');

        if (!results || results.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-item">Aucun résultat trouvé</div>';
            resultsContainer.classList.remove('hidden');
            return;
        }

        const resultHTML = results.map(result => {
            return `
                <div class="search-result-item" onclick="app.selectSearchResult(${result.lat}, ${result.lon}, '${result.display_name.replace(/'/g, "\\'")}')">
                    <div class="result-name">${result.name || result.display_name.split(',')[0]}</div>
                    <div class="result-address">${result.display_name}</div>
                </div>
            `;
        }).join('');

        resultsContainer.innerHTML = resultHTML;
        resultsContainer.classList.remove('hidden');

        // Masquer les résultats au clic ailleurs
        setTimeout(() => {
            document.addEventListener('click', this.hideSearchResults.bind(this), { once: true });
        }, 100);
    }

    selectSearchResult(lat, lng, name) {
        // Centrer la carte sur le résultat
        this.map.setView([lat, lng], 15);

        // Ajouter un marqueur temporaire
        if (this.searchMarker) {
            this.map.removeLayer(this.searchMarker);
        }

        this.searchMarker = L.marker([lat, lng])
            .addTo(this.map)
            .bindPopup(`
                <strong>Résultat de recherche</strong><br>
                ${name}<br>
                <small>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</small>
            `)
            .openPopup();

        // Masquer les résultats
        this.hideSearchResults();

        // Vider le champ de recherche
        document.getElementById('search-input').value = '';

        this.updateInfo('Lieu trouvé', 'Marqueur ajouté temporairement');
    }

    hideSearchResults() {
        document.getElementById('search-results').classList.add('hidden');
    }

    updateCoordinates(latlng) {
        document.getElementById('coordinates').textContent =
            `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`;
    }

    // ========== MÉTHODES ISOCHRONES ==========

    handleIsochroneClick(latlng) {
        // Stocker le point sélectionné
        this.selectedIsochronePoint = latlng;

        // Ajouter un marqueur avec icône personnalisée pour le point de départ
        if (this.isochroneMarker) {
            this.map.removeLayer(this.isochroneMarker);
        }

        // Créer une icône spéciale pour le point d'isochrone
        const isochroneIcon = L.divIcon({
            className: 'isochrone-marker',
            html: '<i class="iconoir-timer"></i>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        this.isochroneMarker = L.marker(latlng, { icon: isochroneIcon })
            .addTo(this.map)
            .bindTooltip('Point de calcul d\'isochrone', {
                permanent: false,
                direction: 'top'
            });

        // Mettre à jour l'info du panneau
        document.getElementById('isochrone-point-info').textContent =
            `Point placé (${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)})`;

        // Activer le bouton calculer
        document.getElementById('calculate-isochrone').disabled = false;

        this.updateInfo('Point sélectionné', 'Configurez les paramètres dans le panneau puis cliquez sur Calculer');
    }

    toggleIsochronePanel() {
        const panel = document.getElementById('isochrone-panel');
        const toggleBtn = document.getElementById('isochrone-panel-toggle');

        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            toggleBtn.innerHTML = '<i class="iconoir-nav-arrow-left"></i>';
        } else {
            panel.classList.add('hidden');
            toggleBtn.innerHTML = '<i class="iconoir-nav-arrow-right"></i>';
        }
    }

    cancelIsochrone() {
        // Fermer le panneau
        document.getElementById('isochrone-panel').classList.add('hidden');

        // Nettoyer le marqueur temporaire
        if (this.isochroneMarker) {
            this.map.removeLayer(this.isochroneMarker);
            this.isochroneMarker = null;
        }

        // Reset l'état
        this.selectedIsochronePoint = null;
        document.getElementById('isochrone-point-info').textContent = 'Cliquez sur la carte pour placer le point de départ';
        document.getElementById('calculate-isochrone').disabled = true;

        // Changer d'outil
        this.selectTool(null);
        this.updateInfo('Outil désactivé', 'Sélectionnez un outil pour commencer');
    }

    updateCostLabel() {
        const calcMode = document.getElementById('calc-mode').value;
        const costLabel = document.getElementById('cost-label');
        const timeUnitSelect = document.getElementById('time-unit');

        if (calcMode === 'time') {
            costLabel.textContent = 'Durée';
            timeUnitSelect.innerHTML = '<option value="min">min</option><option value="sec">sec</option>';
            timeUnitSelect.style.display = 'inline-block';
            document.getElementById('cost-value').value = '10';
            document.getElementById('cost-value').placeholder = '10';
        } else {
            costLabel.textContent = 'Distance';
            timeUnitSelect.innerHTML = '<option value="m">m</option><option value="km">km</option>';
            timeUnitSelect.style.display = 'inline-block';
            timeUnitSelect.value = 'm';
            document.getElementById('cost-value').value = '1000';
            document.getElementById('cost-value').placeholder = '1000';
        }
    }

    async calculateIsochrone() {
        if (!this.selectedIsochronePoint) {
            alert('Aucun point sélectionné');
            return;
        }

        // Récupérer les paramètres du formulaire
        const transportMode = document.getElementById('transport-mode').value;
        const calcMode = document.getElementById('calc-mode').value;
        const directionMode = document.getElementById('direction-mode').value;
        const inputValue = parseFloat(document.getElementById('cost-value').value);
        const inputUnit = document.getElementById('time-unit').value;

        // Convertir vers l'unité attendue par l'API (secondes pour time, mètres pour distance)
        let costValue;
        if (calcMode === 'time') {
            costValue = inputUnit === 'min' ? inputValue * 60 : inputValue; // Convertir en secondes
        } else {
            costValue = inputUnit === 'km' ? inputValue * 1000 : inputValue; // Convertir en mètres
        }

        // Contraintes
        const avoidTolls = document.getElementById('avoid-tolls').checked;
        const avoidTunnels = document.getElementById('avoid-tunnels').checked;
        const avoidBridges = document.getElementById('avoid-bridges').checked;

        if (!costValue || costValue <= 0) {
            alert('Veuillez saisir une valeur positive pour la durée/distance');
            return;
        }

        // Construire l'URL de la nouvelle API Géoplateforme (plus besoin de clé !)
        const baseUrl = 'https://data.geopf.fr/navigation/isochrone';
        const params = new URLSearchParams({
            'point': `${this.selectedIsochronePoint.lng},${this.selectedIsochronePoint.lat}`,
            'resource': 'bdtopo-valhalla', // Nouvelle ressource selon la doc mise à jour
            'costValue': costValue.toString(),
            'costType': calcMode,
            'profile': transportMode,
            'direction': directionMode,
            'geometryFormat': 'geojson'
        });

        // Ajouter les contraintes selon getcapabilities response (waytype avec valeurs correctes)
        const constraints = [];
        if (avoidTolls) {
            constraints.push('{"constraintType":"banned","key":"waytype","operator":"=","value":"autoroute"}');
        }
        if (avoidTunnels) {
            constraints.push('{"constraintType":"banned","key":"waytype","operator":"=","value":"tunnel"}');
        }
        if (avoidBridges) {
            constraints.push('{"constraintType":"banned","key":"waytype","operator":"=","value":"pont"}');
        }

        // Format pipe-delimited selon la doc API
        if (constraints.length > 0) {
            params.append('constraints', constraints.join('|'));
        }

        const url = `${baseUrl}?${params.toString()}`;

        try {
            this.updateInfo('Calcul en cours...', 'Requête envoyée au service d\'isochrones');
            console.log('URL de la requête:', url);

            // D'abord récupérer les capabilities pour découvrir les vraies valeurs de contraintes
            try {
                const capabilitiesResponse = await fetch('https://data.geopf.fr/navigation/getcapabilities');
                const capabilities = await capabilitiesResponse.json();
                console.log('Capabilities de l\'API:', capabilities);
            } catch (capError) {
                console.log('Impossible de récupérer les capabilities:', capError);
            }

            const response = await fetch(url);
            const data = await response.json();
            console.log('Réponse de l\'API:', data);

            // Vérifier s'il y a une erreur dans la réponse (même si HTTP 400)
            if (data && data.error) {
                throw new Error(data.error.message || 'Erreur inconnue du service');
            }

            // Vérifier le statut HTTP seulement si pas d'erreur dans le JSON
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
            }

            if (data && data.geometry) {
                // Passer aussi les paramètres de calcul à displayIsochrone
                this.displayIsochrone(data, {
                    transportMode: transportMode,
                    calcMode: calcMode,
                    directionMode: directionMode,
                    inputValue: inputValue,
                    inputUnit: inputUnit,
                    costValue: costValue
                });
                // Fermer le panneau après calcul
                document.getElementById('isochrone-panel').classList.add('hidden');
                this.updateInfo('Isochrone calculée', 'Résultat affiché sur la carte');
            } else {
                throw new Error('Réponse invalide du service');
            }

        } catch (error) {
            console.error('Erreur lors du calcul d\'isochrone:', error);

            // Détecter les erreurs de géolocalisation (hors France)
            let errorMessage = `Erreur API Géoplateforme: ${error.message}`;

            if (error.message && (
                error.message.includes('NOT in bbox') ||
                error.message.includes('Parameter \'point\' is invalid') ||
                error.message.includes('user value') && error.message.includes('is NOT in bbox') ||
                error.message.includes('No path found')
            )) {
                errorMessage = `⚠️ Zone non supportée\n\nLes isochrones ne fonctionnent qu'en France métropolitaine et DOM-TOM.\n\nVeuillez placer le point sur le territoire français.`;
                this.updateInfo('Zone non supportée', 'Isochrones disponibles uniquement en France');
            } else {
                errorMessage += `\n\nVérifiez votre connexion Internet et les paramètres saisis.`;
                this.updateInfo('Erreur API', 'Impossible de calculer l\'isochrone');
            }

            alert(errorMessage);
        }
    }

    displayIsochrone(isochroneData, params) {
        console.log('Données d\'isochrone:', isochroneData);

        // La géométrie peut être dans différents formats selon l'API
        let coordinates;

        if (typeof isochroneData.geometry === 'string') {
            // Si c'est une string, c'est probablement du WKT ou un format encodé
            console.log('Géométrie en format string:', isochroneData.geometry);
            // Pour l'instant, on essaie de décoder si c'est du GeoJSON stringifié
            try {
                const geom = JSON.parse(isochroneData.geometry);
                coordinates = geom.coordinates[0].map(coord => [coord[1], coord[0]]);
            } catch (e) {
                console.error('Impossible de parser la géométrie:', e);
                alert('Format de géométrie non supporté');
                return;
            }
        } else if (isochroneData.geometry && isochroneData.geometry.coordinates) {
            // Format GeoJSON standard
            coordinates = isochroneData.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
        } else {
            console.error('Format de géométrie non reconnu:', isochroneData.geometry);
            alert('Format de géométrie non supporté');
            return;
        }

        // Créer le polygone d'isochrone
        const isochronePolygon = L.polygon(coordinates, {
            fillColor: '#3388ff',
            fillOpacity: 0.2,
            color: '#3388ff',
            weight: 2
        }).addTo(this.map);

        // Utiliser les paramètres passés
        const modeText = params.transportMode === 'car' ? 'Voiture' : 'Piéton';
        const calcText = `${params.inputValue}${params.inputUnit}`;
        const dirText = params.directionMode === 'departure' ? 'depuis' : 'vers';

        isochronePolygon.bindPopup(`
            <strong>Isochrone</strong><br>
            Mode: ${modeText}<br>
            ${params.calcMode === 'time' ? 'Temps' : 'Distance'}: ${calcText}<br>
            Direction: ${dirText} le point
        `);

        // Stocker l'isochrone (optionnel pour export/import futur)
        if (!this.data.isochrones) {
            this.data.isochrones = [];
        }

        const isochroneData_obj = {
            id: 'isochrone_' + Date.now(),
            polygon: isochronePolygon,
            center: this.selectedIsochronePoint,
            data: isochroneData,
            parameters: params,
            name: 'Isochrone'
        };

        // Ajouter l'événement de clic droit sur l'isochrone
        isochronePolygon.on('contextmenu', (e) => {
            e.originalEvent.preventDefault();
            this.showContextMenu(e.originalEvent.clientX, e.originalEvent.clientY, isochroneData_obj, 'isochrone');
        });

        this.data.isochrones.push(isochroneData_obj);
        this.saveToLocalStorage();

        // Garder le marqueur du point de départ visible
        // Le marqueur reste sur la carte pour montrer le point de calcul

        // Ajuster la vue pour inclure l'isochrone
        this.map.fitBounds(isochronePolygon.getBounds());
    }

    // === NOUVEAU SYSTÈME D'ÉDITION MODERNE ===

    setupModernEditSystem() {
        // Initialiser le menu contextuel simple
        this.setupSimpleContextMenu();
    }

    setupSimpleContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        const colorSubmenu = document.getElementById('color-submenu');

        // Éviter d'attacher les événements plusieurs fois
        if (this.contextMenuInitialized) return;
        this.contextMenuInitialized = true;

        // Masquer le menu au clic gauche ailleurs (ignorer les clics droits)
        document.addEventListener('click', (e) => {
            // Ignorer les clics droits (button === 2) pour ne pas interférer avec contextmenu
            if (e.button !== 0) return;

            const clickOnContextMenu = contextMenu.contains(e.target);
            const clickOnColorSubmenu = colorSubmenu.contains(e.target);
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
            if (!colorSubmenu.classList.contains('hidden')) {
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

        // Événements du menu (une seule fois)
        document.getElementById('edit-element').addEventListener('click', () => {
            this.editCurrentElement();
            this.hideContextMenu();
        });

        document.getElementById('change-color').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const colorSubmenu = document.getElementById('color-submenu');
            if (colorSubmenu.classList.contains('hidden')) {
                this.showColorSubmenu(e);
            } else {
                this.hideColorSubmenu();
            }
        });

        document.getElementById('delete-element').addEventListener('click', () => {
            this.deleteCurrentElement();
            this.hideContextMenu();
        });

        // Événement pour le bouton de fermeture du sous-menu
        document.getElementById('close-color-submenu').addEventListener('click', (e) => {
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
                colorSubmenu.classList.add('hidden');

                // Puis fermer le menu principal
                setTimeout(() => {
                    this.hideContextMenu();
                }, 10);
            });
        });
    }

    showContextMenu(x, y, element, elementType) {
        const contextMenu = document.getElementById('context-menu');
        this.currentEditElement = { element, elementType };

        // Adapter le menu selon le type
        const moveBtn = document.getElementById('move-element');
        const editBtn = document.getElementById('edit-element');
        const deleteBtn = document.getElementById('delete-element');

        moveBtn.style.display = 'none'; // Plus besoin car drag&drop

        // Adapter le texte du bouton supprimer selon le contexte
        if (elementType === 'point') {
            // Vérifier si le point fait partie d'une structure
            const isPartOfStructure = this.isPointPartOfStructure(element);
            if (isPartOfStructure) {
                deleteBtn.innerHTML = '<i class="iconoir-trash"></i><span>Supprimer point</span>';
                deleteBtn.title = 'Supprimer ce point et recalculer la structure';
            } else {
                deleteBtn.innerHTML = '<i class="iconoir-trash"></i><span>Supprimer</span>';
                deleteBtn.title = 'Supprimer ce point';
            }
        } else {
            deleteBtn.innerHTML = '<i class="iconoir-trash"></i><span>Supprimer</span>';
            deleteBtn.title = 'Supprimer cet élément';
        }

        // Positionner intelligemment
        contextMenu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
        contextMenu.style.top = Math.min(y, window.innerHeight - 160) + 'px';
        contextMenu.classList.remove('hidden');
    }

    hideContextMenu() {
        document.getElementById('context-menu').classList.add('hidden');
        this.hideColorSubmenu();
        this.currentEditElement = null;
    }

    hideColorSubmenu() {
        document.getElementById('color-submenu').classList.add('hidden');
    }

    editCurrentElement() {
        if (!this.currentEditElement) return;

        const { element, elementType } = this.currentEditElement;

        if (elementType === 'point') {
            this.renamePoint(element);
        } else if (elementType === 'isochrone') {
            this.renameIsochrone(element);
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
            if (confirm(`Supprimer cet élément ?`)) {
                this.removeElementFromMap(element, elementType);
            }
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

    deletePointWithStructureUpdate(pointData) {
        const structures = this.findStructuresContainingPoint(pointData);

        if (structures.length === 0) {
            // Point isolé, suppression simple
            if (confirm(`Supprimer le point "${pointData.name}" ?`)) {
                this.removeElementFromMap(pointData, 'point');
            }
            return;
        }

        // Point faisant partie de structures
        let message = `Supprimer le point "${pointData.name}" ?\n\n`;
        message += `Cela affectera :\n`;
        structures.forEach(struct => {
            if (struct.type === 'line') {
                message += `• Ligne avec ${struct.data.points.length} points\n`;
            } else if (struct.type === 'polygon') {
                message += `• Polygone avec ${struct.data.points.length} points\n`;
            } else if (struct.type === 'circle') {
                message += `• Cercle (suppression complète)\n`;
            }
        });

        if (confirm(message)) {
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
        if (pointData.label) this.map.removeLayer(pointData.label);

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
            if (line.polylines[segIndex]) {
                this.map.removeLayer(line.polylines[segIndex]);
                line.polylines.splice(segIndex, 1);
            }
            if (line.segmentLabels[segIndex]) {
                this.map.removeLayer(line.segmentLabels[segIndex]);
                line.segmentLabels.splice(segIndex, 1);
            }
            if (line.segments[segIndex]) {
                line.segments.splice(segIndex, 1);
            }
        });

        // Reconnecter si nécessaire (il faut un point avant ET après)
        if (needsReconnection && prevPoint && nextPoint) {
            // Créer un nouveau segment pour reconnecter
            const newSegment = this.createSegment(prevPoint, nextPoint);
            const newPolyline = L.polyline([prevPoint, nextPoint], {
                color: line.color || '#e74c3c',
                weight: 3
            }).addTo(this.map);

            // Insérer le nouveau segment à la bonne position (où était le premier segment supprimé)
            const insertIndex = pointIndex > 0 ? pointIndex - 1 : 0;
            line.segments.splice(insertIndex, 0, newSegment);
            line.polylines.splice(insertIndex, 0, newPolyline);

            // Ajouter le label du nouveau segment
            const midpoint = this.calculateMidpoint(prevPoint, nextPoint);
            const label = L.tooltip({
                permanent: true,
                direction: 'center',
                className: 'segment-label'
            })
            .setLatLng(midpoint)
            .setContent(`${newSegment.distance.toFixed(1)}m<br>${newSegment.azimuth.toFixed(0)}°`)
            .addTo(this.map);

            line.segmentLabels.splice(insertIndex, 0, label);
        }

        // Recalculer la distance totale
        line.totalDistance = line.segments.reduce((sum, seg) => sum + seg.distance, 0);
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
                this.updateInfo('Point modifié', `"${newName}" mis à jour`);
                this.saveToLocalStorage();
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
            this.updateInfo('Isochrone modifiée', `"${newName}" mis à jour`);
        }
    }

    applyColorToElement(editElement, color) {
        const { element, elementType } = editElement;

        if (elementType === 'point') {
            // Pour les points, changer la couleur du label
            if (element.label) {
                element.label.setContent(`<div class="point-name" style="color: ${color};">${element.name}</div>`);
            }
            // Changer la couleur du marker si possible
            if (element.marker) {
                element.marker.setIcon(L.icon({
                    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${this.getMarkerColorName(color)}.png`,
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                }));
            }
        } else if (elementType === 'line') {
            if (element.polylines && Array.isArray(element.polylines)) {
                element.polylines.forEach(polyline => {
                    if (polyline && polyline.setStyle) {
                        polyline.setStyle({ color: color });
                    }
                });
            }
        } else if (elementType === 'circle') {
            if (element.circle && element.circle.setStyle) {
                element.circle.setStyle({ color: color, fillColor: color });
            }
        } else if (elementType === 'polygon') {
            if (element.polygon && element.polygon.setStyle) {
                element.polygon.setStyle({ color: color, fillColor: color });
            }
        } else if (elementType === 'isochrone') {
            if (element.polygon && element.polygon.setStyle) {
                element.polygon.setStyle({ color: color, fillColor: color });
            }
        }

        element.color = color;
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
        if (elementType === 'point') {
            if (element.marker) this.map.removeLayer(element.marker);
            if (element.label) this.map.removeLayer(element.label);
            this.data.points = this.data.points.filter(p => p.id !== element.id);
        } else if (elementType === 'line') {
            if (element.polylines) element.polylines.forEach(p => this.map.removeLayer(p));
            if (element.segmentLabels) element.segmentLabels.forEach(l => this.map.removeLayer(l));
            if (element.pointData) {
                element.pointData.forEach(pd => {
                    if (pd.marker) this.map.removeLayer(pd.marker);
                    if (pd.label) this.map.removeLayer(pd.label);
                });
            }
            this.data.lines = this.data.lines.filter(l => l.id !== element.id);
        } else if (elementType === 'circle') {
            if (element.circle) this.map.removeLayer(element.circle);
            if (element.centerPoint) {
                if (element.centerPoint.marker) this.map.removeLayer(element.centerPoint.marker);
                if (element.centerPoint.label) this.map.removeLayer(element.centerPoint.label);
            }
            this.data.circles = this.data.circles.filter(c => c.id !== element.id);
        } else if (elementType === 'polygon') {
            if (element.polygon) this.map.removeLayer(element.polygon);
            if (element.pointData) {
                element.pointData.forEach(pd => {
                    if (pd.marker) this.map.removeLayer(pd.marker);
                    if (pd.label) this.map.removeLayer(pd.label);
                });
            }
            this.data.polygons = this.data.polygons.filter(p => p.id !== element.id);
        } else if (elementType === 'isochrone') {
            if (element.polygon) this.map.removeLayer(element.polygon);
            this.data.isochrones = this.data.isochrones.filter(i => i.id !== element.id);
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
        if (!line.polylines || !line.points) return;

        // Redessiner le segment précédent (si existe)
        if (changedPointIndex > 0) {
            const prevSegmentIndex = changedPointIndex - 1;
            if (line.polylines[prevSegmentIndex]) {
                const startPoint = line.points[prevSegmentIndex];
                const endPoint = line.points[changedPointIndex];

                line.polylines[prevSegmentIndex].setLatLngs([startPoint, endPoint]);

                // Mettre à jour le label du segment
                if (line.segmentLabels && line.segmentLabels[prevSegmentIndex]) {
                    const distance = this.calculateDistance(startPoint, endPoint);
                    const azimuth = this.calculateAzimuth(startPoint, endPoint);
                    const midpoint = this.calculateMidpoint(startPoint, endPoint);

                    line.segmentLabels[prevSegmentIndex]
                        .setLatLng(midpoint)
                        .setContent(`${distance.toFixed(1)}m<br>${azimuth.toFixed(0)}°`);

                    // Mettre à jour les données du segment
                    if (line.segments && line.segments[prevSegmentIndex]) {
                        line.segments[prevSegmentIndex].distance = distance;
                        line.segments[prevSegmentIndex].azimuth = azimuth;
                    }
                }
            }
        }

        // Redessiner le segment suivant (si existe)
        if (changedPointIndex < line.points.length - 1) {
            const nextSegmentIndex = changedPointIndex;
            if (line.polylines[nextSegmentIndex]) {
                const startPoint = line.points[changedPointIndex];
                const endPoint = line.points[changedPointIndex + 1];

                line.polylines[nextSegmentIndex].setLatLngs([startPoint, endPoint]);

                // Mettre à jour le label du segment
                if (line.segmentLabels && line.segmentLabels[nextSegmentIndex]) {
                    const distance = this.calculateDistance(startPoint, endPoint);
                    const azimuth = this.calculateAzimuth(startPoint, endPoint);
                    const midpoint = this.calculateMidpoint(startPoint, endPoint);

                    line.segmentLabels[nextSegmentIndex]
                        .setLatLng(midpoint)
                        .setContent(`${distance.toFixed(1)}m<br>${azimuth.toFixed(0)}°`);

                    // Mettre à jour les données du segment
                    if (line.segments && line.segments[nextSegmentIndex]) {
                        line.segments[nextSegmentIndex].distance = distance;
                        line.segments[nextSegmentIndex].azimuth = azimuth;
                    }
                }
            }
        }
    }

    updateConnectedCircles(pointData, newPos) {
        this.data.circles.forEach(circle => {
            if (circle.centerPoint && circle.centerPoint.id === pointData.id) {
                // Ce point est le centre du cercle, redessiner le cercle
                circle.center = newPos;
                if (circle.circle) {
                    circle.circle.setLatLng(newPos);

                    // Mettre à jour le popup avec les informations recalculées
                    const area = Math.PI * circle.radius * circle.radius;
                    circle.circle.bindPopup(`
                        <strong>Cercle de mesure</strong><br>
                        Rayon: ${circle.radius.toFixed(2)} m<br>
                        Superficie: ${(area / 10000).toFixed(3)} ha<br>
                        Aire: ${area.toFixed(2)} m²
                    `);
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
            }
        });
    }
}

// Initialiser l'application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new RhinoMapToolbox();
});