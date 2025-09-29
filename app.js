class RhinoMapToolbox {
    constructor() {
        this.map = null;
        this.currentTool = null;
        this.currentLayer = 'map';
        this.layers = {};
        this.data = {
            points: [],
            lines: [],
            circles: [],
            polygons: []
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
        this.updateThrottle = 16; // ~60fps

        this.init();
    }

    init() {
        this.initMap();
        this.initEventListeners();
        this.updateInfo('Carte initialisée', 'Sélectionnez un outil pour commencer');
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
        document.getElementById('triangle-tool').addEventListener('click', () => this.selectTool('triangle'));
        document.getElementById('clear-tool').addEventListener('click', () => this.clearAll());

        // Couches
        document.getElementById('map-layer').addEventListener('click', () => this.switchLayer('map'));
        document.getElementById('satellite-layer').addEventListener('click', () => this.switchLayer('satellite'));

        // Import/Export
        document.getElementById('import-btn').addEventListener('click', () => this.importData());
        document.getElementById('export-btn').addEventListener('click', () => this.exportData());
        document.getElementById('file-input').addEventListener('change', (e) => this.loadFile(e));

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

        // Afficher/masquer le bouton de contraintes selon l'outil
        const constraintsBtn = document.getElementById('constraints-tool');
        if (tool === 'line') {
            constraintsBtn.style.display = 'flex';
        } else {
            constraintsBtn.style.display = 'none';
        }

        this.updateInfo(this.getCurrentToolName(), this.getCurrentToolDescription());
    }

    switchLayer(layer) {
        document.querySelectorAll('.layer-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(layer + '-layer').classList.add('active');

        this.map.removeLayer(this.layers[this.currentLayer]);

        if (layer === 'satellite') {
            this.layers.satellite.addTo(this.map);
        } else {
            this.layers.osm.addTo(this.map);
        }

        this.currentLayer = layer;
    }

    handleMapClick(e) {
        const latlng = e.latlng;

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
            case 'triangle':
                this.handleTriangleClick(latlng);
                break;
        }
    }

    handleMapDoubleClick(e) {
        if (this.currentTool === 'line' && this.isDrawing) {
            this.finishCurrentLine();
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
                Distance totale: ${totalDistance.toFixed(2)} m<br>
                Points: ${this.currentLine.points.length}
            `)
            .openOn(this.map);

        // Sauvegarder dans les données
        this.data.lines.push({
            ...this.currentLine,
            totalDistance: totalDistance,
            segmentCount: segmentCount
        });

        // Nettoyer et terminer
        this.clearTempElements();
        this.isDrawing = false;
        this.currentLine = null;
        this.resetConstraints();
        this.hidePanel();

        this.updateInfo('Tracé terminé', `${segmentCount} segments, ${totalDistance.toFixed(2)}m total`);
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
        .setContent(`${segment.distance.toFixed(1)}m<br>${segment.azimuth.toFixed(0)}°`)
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
        const marker = L.marker(latlng)
            .addTo(this.map)
            .bindPopup(`Point<br>Lat: ${latlng.lat.toFixed(6)}<br>Lng: ${latlng.lng.toFixed(6)}`);

        this.data.points.push({
            id: Date.now(),
            latlng: latlng,
            marker: marker
        });

        this.updateInfo('Point ajouté', `Total: ${this.data.points.length} points`);
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
                segmentLabels: []
            };

            // Marker de début
            const startMarker = L.marker(latlng)
                .addTo(this.map)
                .bindPopup('Début du tracé');

            this.currentLine.markers.push(startMarker);

            // Ouvrir automatiquement le panneau de contraintes
            this.showPanel();

            this.updateInfo('Tracé commencé', 'Clic: ajouter segment | Double-clic: terminer | Ctrl+L: contraintes');
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

            // Marker intermédiaire ou de fin
            const marker = L.marker(endPoint)
                .addTo(this.map)
                .bindPopup(`Point ${this.currentLine.points.length - 1}`);

            this.currentLine.markers.push(marker);

            // Label permanent pour ce segment
            this.addSegmentLabel(segment, startPoint, endPoint);

            // Nettoyer les éléments temporaires
            this.clearTempElements();

            // Réinitialiser les contraintes pour le prochain segment
            this.resetConstraintsForNextSegment();

            const totalDistance = this.calculateTotalDistance();
            this.updateInfo('Segment ajouté',
                `${this.currentLine.segments.length} segments | Total: ${totalDistance.toFixed(2)}m | Double-clic pour terminer`);

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

        // Calculer les mesures
        const distance = this.calculateDistance(startPoint, constrainedPoint);
        const azimuth = this.calculateAzimuth(startPoint, constrainedPoint);
        const midpoint = this.calculateMidpoint(startPoint, constrainedPoint);

        // Créer ou mettre à jour le tooltip
        const content = this.getConstrainedTooltipContent(distance, azimuth);

        if (!this.tempMeasurementTooltip) {
            this.tempMeasurementTooltip = L.tooltip({
                permanent: true,
                className: 'measurement-tooltip fade-in'
            })
            .setLatLng(midpoint)
            .setContent(content)
            .addTo(this.map);
        } else {
            this.tempMeasurementTooltip
                .setLatLng(midpoint)
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
        let content = `${distance.toFixed(2)}m - ${azimuth.toFixed(1)}°`;

        if (this.constraints.distanceLocked || this.constraints.azimuthLocked) {
            content += ' 🔒';
        }

        if (this.constraints.distanceLocked) {
            content += ` | D: ${this.constraints.lockedDistance}m`;
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

            const centerMarker = L.marker(latlng)
                .addTo(this.map)
                .bindPopup('Centre du cercle');

            this.tempElements.push(centerMarker);

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

                // Mettre à jour le tooltip
                if (this.radiusTooltip) {
                    this.map.removeLayer(this.radiusTooltip);
                }

                this.radiusTooltip = L.tooltip({
                    permanent: true,
                    className: 'measurement-tooltip'
                })
                .setLatLng(e.latlng)
                .setContent(`Rayon: ${radius.toFixed(2)}m`)
                .addTo(this.map);
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
                    Rayon: ${radius.toFixed(2)} m<br>
                    Superficie: ${(Math.PI * radius * radius / 10000).toFixed(2)} ha
                `);

                this.data.circles.push({
                    id: Date.now(),
                    center: this.circleCenter,
                    radius: radius,
                    circle: finalCircle,
                    centerMarker: centerMarker
                });

                // Nettoyer
                this.clearTempElements();
                if (this.radiusTooltip) {
                    this.map.removeLayer(this.radiusTooltip);
                }

                this.map.off('mousemove', onMouseMove);
                this.map.off('click', onMapClick);
                this.isDrawing = false;

                this.updateInfo('Cercle créé', `Rayon: ${radius.toFixed(2)}m`);
            };

            this.map.on('mousemove', onMouseMove);
            this.map.on('click', onMapClick);

            this.updateInfo('Cercle commencé', 'Déplacez la souris et cliquez pour définir le rayon');
        }
    }

    handleTriangleClick(latlng) {
        this.trianglePoints.push(latlng);

        // Ajouter un marker
        const marker = L.marker(latlng)
            .addTo(this.map)
            .bindPopup(`Point ${this.trianglePoints.length}/3`);

        this.tempElements.push(marker);

        if (this.trianglePoints.length === 3) {
            // Calculer la triangulation
            const triangle = this.calculateTriangulation(this.trianglePoints);

            // Créer le triangle visuel
            const polygon = L.polygon(this.trianglePoints, {
                color: '#9b59b6',
                fillColor: '#9b59b6',
                fillOpacity: 0.3,
                weight: 2
            }).addTo(this.map);

            // Calculer le centre du triangle
            const center = this.calculateTriangleCenter(this.trianglePoints);

            polygon.bindPopup(`
                <strong>Triangle</strong><br>
                Côté AB: ${triangle.sideAB.toFixed(2)} m<br>
                Côté BC: ${triangle.sideBC.toFixed(2)} m<br>
                Côté CA: ${triangle.sideCA.toFixed(2)} m<br>
                Aire: ${triangle.area.toFixed(2)} m²<br>
                Périmètre: ${triangle.perimeter.toFixed(2)} m
            `);

            this.data.triangles.push({
                id: Date.now(),
                points: [...this.trianglePoints],
                polygon: polygon,
                markers: [...this.tempElements],
                measurements: triangle
            });

            this.updateInfo('Triangle créé', `Aire: ${triangle.area.toFixed(2)} m²`);

            // Reset
            this.trianglePoints = [];
            this.tempElements = [];
        } else {
            this.updateInfo('Triangulation', `Point ${this.trianglePoints.length}/3 placé`);
        }
    }

    calculateDistance(latlng1, latlng2) {
        return this.map.distance(latlng1, latlng2);
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
        }

        this.isDrawing = false;
        this.currentLine = null;
        this.trianglePoints = [];
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

    clearAll() {
        // Supprimer tous les éléments de la carte
        [...this.data.points, ...this.data.lines, ...this.data.circles, ...this.data.triangles].forEach(item => {
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
        });

        // Vider les données
        this.data = {
            points: [],
            lines: [],
            circles: [],
            triangles: []
        };

        this.cancelCurrentAction();
        this.updateInfo('Carte effacée', 'Tous les éléments ont été supprimés');
    }

    exportData() {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: "1.0",
            data: {
                points: this.data.points.map(p => ({
                    id: p.id,
                    lat: p.latlng.lat,
                    lng: p.latlng.lng
                })),
                lines: this.data.lines.map(l => ({
                    id: l.id,
                    points: l.points.map(p => ({ lat: p.lat, lng: p.lng })),
                    distance: l.distance,
                    azimuth: l.azimuth
                })),
                circles: this.data.circles.map(c => ({
                    id: c.id,
                    center: { lat: c.center.lat, lng: c.center.lng },
                    radius: c.radius
                })),
                triangles: this.data.triangles.map(t => ({
                    id: t.id,
                    points: t.points.map(p => ({ lat: p.lat, lng: p.lng })),
                    measurements: t.measurements
                }))
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rhinomap_${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.updateInfo('Export terminé', 'Fichier JSON sauvegardé');
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
                this.restoreData(importedData);
                this.updateInfo('Import terminé', 'Données restaurées avec succès');
            } catch (error) {
                alert('Erreur lors du chargement du fichier: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    restoreData(importedData) {
        this.clearAll();

        const data = importedData.data;

        // Restaurer les points
        data.points.forEach(pointData => {
            const latlng = { lat: pointData.lat, lng: pointData.lng };
            this.addPoint(latlng);
        });

        // Restaurer les lignes
        data.lines.forEach(lineData => {
            const points = lineData.points;
            const polyline = L.polyline(points, {
                color: '#e74c3c',
                weight: 3
            }).addTo(this.map);

            // Markers
            const startMarker = L.marker(points[0]).addTo(this.map).bindPopup('Début du trait');
            const endMarker = L.marker(points[1]).addTo(this.map).bindPopup('Fin du trait');

            // Popup avec mesures
            const midpoint = this.calculateMidpoint(points[0], points[1]);
            L.popup()
                .setLatLng(midpoint)
                .setContent(`
                    <strong>Mesures</strong><br>
                    Distance: ${lineData.distance.toFixed(2)} m<br>
                    Azimut: ${lineData.azimuth.toFixed(1)}°
                `)
                .openOn(this.map);

            this.data.lines.push({
                id: lineData.id,
                points: points,
                polyline: polyline,
                markers: [startMarker, endMarker],
                distance: lineData.distance,
                azimuth: lineData.azimuth
            });
        });

        // Restaurer les cercles
        data.circles.forEach(circleData => {
            const center = circleData.center;
            const centerMarker = L.marker(center).addTo(this.map).bindPopup('Centre du cercle');

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

            this.data.circles.push({
                id: circleData.id,
                center: center,
                radius: circleData.radius,
                circle: circle,
                centerMarker: centerMarker
            });
        });

        // Restaurer les triangles
        data.triangles.forEach(triangleData => {
            const points = triangleData.points;

            const polygon = L.polygon(points, {
                color: '#9b59b6',
                fillColor: '#9b59b6',
                fillOpacity: 0.3,
                weight: 2
            }).addTo(this.map);

            const markers = points.map((point, i) =>
                L.marker(point).addTo(this.map).bindPopup(`Point ${i + 1}/3`)
            );

            const measurements = triangleData.measurements;
            polygon.bindPopup(`
                <strong>Triangle</strong><br>
                Côté AB: ${measurements.sideAB.toFixed(2)} m<br>
                Côté BC: ${measurements.sideBC.toFixed(2)} m<br>
                Côté CA: ${measurements.sideCA.toFixed(2)} m<br>
                Aire: ${measurements.area.toFixed(2)} m²<br>
                Périmètre: ${measurements.perimeter.toFixed(2)} m
            `);

            this.data.triangles.push({
                id: triangleData.id,
                points: points,
                polygon: polygon,
                markers: markers,
                measurements: measurements
            });
        });
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
            <div class="info-item">Triangles: ${this.data.triangles.length}</div>
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
            point: 'Placement de points',
            line: 'Tracé de traits',
            circle: 'Cercle de mesure',
            triangle: 'Triangulation'
        };
        return toolNames[this.currentTool] || 'Aucun outil';
    }

    getCurrentToolDescription() {
        const instructions = {
            point: 'Cliquez sur la carte pour placer un point',
            line: this.isDrawing ? 'Cliquez pour terminer le trait (Ctrl+L pour contraintes)' : 'Cliquez pour commencer un trait',
            circle: 'Cliquez sur un point central puis déplacez pour définir le rayon',
            triangle: 'Cliquez sur 3 points pour créer un triangle'
        };
        return instructions[this.currentTool] || 'Sélectionnez un outil pour commencer';
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    new RhinoMapToolbox();
});