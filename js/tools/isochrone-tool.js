/**
 * IsochroneTool - Compute and display isochrones from IGN Géoplateforme
 * Single click to place point, configure in sidebar, async API call
 */

class IsochroneTool extends DrawingTool {

    get name() { return 'isochrone'; }

    constructor(app, engine, labelManager, layersManager) {
        super(app, engine, labelManager, layersManager);
        this.selectedPoint = null;
        this.isochroneMarker = null;
    }

    activate() {
        super.activate();
        if (window.showSidebar) window.showSidebar('isochrone');
    }

    onMapClick(latlng, originalEvent) {
        this.selectedPoint = latlng;

        // Remove previous temp marker
        if (this.isochroneMarker) {
            this.isochroneMarker.remove();
        }

        // Create timer icon marker
        const el = document.createElement('div');
        el.className = 'isochrone-marker';
        el.innerHTML = '<i class="iconoir-timer"></i>';
        el.style.cssText = 'width:24px;height:24px;display:flex;align-items:center;justify-content:center;';

        this.isochroneMarker = this.engine.createMarker(latlng, { element: el });
        this.isochroneMarker.addTo(this.engine);

        // Update sidebar
        const infoEl = document.getElementById('isochrone-point-info-sidebar');
        if (infoEl) infoEl.textContent = `Point placé (${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)})`;

        const calcBtn = document.getElementById('calculate-isochrone-sidebar');
        if (calcBtn) calcBtn.disabled = false;

        if (this.app.updateInfo) {
            this.app.updateInfo('Point sélectionné', 'Configurez les paramètres dans le panneau puis cliquez sur Calculer');
        }
    }

    /**
     * Calculate isochrone — called from sidebar "Calculate" button
     */
    async calculate() {
        if (!this.selectedPoint) {
            showWarning(i18n.t('error_select_point'));
            return;
        }

        // Collect parameters from sidebar form
        const transportMode = document.getElementById('transport-mode-sidebar')?.value || 'car';
        const calcMode = document.getElementById('calc-mode-sidebar')?.value || 'time';
        const directionMode = document.getElementById('direction-mode-sidebar')?.value || 'departure';
        const inputValue = parseFloat(document.getElementById('cost-value-sidebar')?.value || '10');
        const inputUnit = document.getElementById('time-unit-sidebar')?.value || 'min';
        const avoidTolls = document.getElementById('avoid-tolls-sidebar')?.checked || false;
        const avoidTunnels = document.getElementById('avoid-tunnels-sidebar')?.checked || false;
        const avoidBridges = document.getElementById('avoid-bridges-sidebar')?.checked || false;

        // Convert to API units
        let costValue;
        if (calcMode === 'time') {
            costValue = inputUnit === 'min' ? inputValue * 60 : inputValue;
        } else {
            costValue = inputUnit === 'km' ? inputValue * 1000 : inputValue;
        }

        if (!costValue || costValue <= 0) {
            showWarning(i18n.t('error_invalid_duration_distance'));
            return;
        }

        // Build API URL
        const params = new URLSearchParams({
            'point': `${this.selectedPoint.lng},${this.selectedPoint.lat}`,
            'resource': 'bdtopo-valhalla',
            'costValue': costValue.toString(),
            'costType': calcMode,
            'profile': transportMode,
            'direction': directionMode,
            'geometryFormat': 'geojson'
        });

        const constraints = [];
        if (avoidTolls) constraints.push('{"constraintType":"banned","key":"waytype","operator":"=","value":"autoroute"}');
        if (avoidTunnels) constraints.push('{"constraintType":"banned","key":"waytype","operator":"=","value":"tunnel"}');
        if (avoidBridges) constraints.push('{"constraintType":"banned","key":"waytype","operator":"=","value":"pont"}');
        if (constraints.length > 0) params.append('constraints', constraints.join('|'));

        const url = `https://data.geopf.fr/navigation/isochrone?${params.toString()}`;

        try {
            if (this.app.updateInfo) this.app.updateInfo('Calcul en cours...', 'Requête envoyée');

            const response = await fetch(url);
            const data = await response.json();

            if (data && data.error) throw new Error(data.error.message || 'Erreur inconnue');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            if (data && data.geometry) {
                this._displayResult(data, {
                    transportMode, calcMode, directionMode,
                    inputValue, inputUnit, costValue,
                    avoidTolls, avoidTunnels, avoidBridges
                });
                if (this.app.updateInfo) this.app.updateInfo('Isochrone calculée', 'Résultat affiché');
            } else {
                throw new Error('Réponse invalide');
            }
        } catch (error) {
            console.error('Isochrone error:', error);
            let msg = `Erreur API: ${error.message}`;
            if (error.message && (error.message.includes('NOT in bbox') || error.message.includes('No path found'))) {
                msg = 'Zone non supportée — isochrones disponibles uniquement en France';
            }
            showError(msg, 6000);
        }
    }

    _displayResult(isochroneData, params) {
        // Parse geometry
        let coordinates;
        if (typeof isochroneData.geometry === 'string') {
            try {
                const geom = JSON.parse(isochroneData.geometry);
                coordinates = geom.coordinates[0].map(c => ({ lat: c[1], lng: c[0] }));
            } catch (e) {
                showError('Format de géométrie non supporté');
                return;
            }
        } else if (isochroneData.geometry?.coordinates) {
            coordinates = isochroneData.geometry.coordinates[0].map(c => ({ lat: c[1], lng: c[0] }));
        } else {
            showError('Format de géométrie non reconnu');
            return;
        }

        const color = this.getLayerColor();

        // Create polygon
        const shapeId = this.engine.addPolygon(null, coordinates, {
            color: color,
            fillColor: color,
            fillOpacity: 0.2,
            weight: 2
        });

        // Create permanent center marker (replace temp)
        if (this.isochroneMarker) {
            this.isochroneMarker.remove();
            this.isochroneMarker = null;
        }

        const centerEl = document.createElement('div');
        centerEl.className = 'isochrone-marker';
        centerEl.innerHTML = '<i class="iconoir-timer"></i>';
        centerEl.style.cssText = 'width:24px;height:24px;display:flex;align-items:center;justify-content:center;';

        const centerMarker = this.engine.createMarker(this.selectedPoint, { element: centerEl });
        centerMarker.addTo(this.engine);

        const popupHtml = this.app.createCoordinatesPopupContent
            ? this.app.createCoordinatesPopupContent('Centre isochrone', this.selectedPoint.lat, this.selectedPoint.lng)
            : `<strong>Centre isochrone</strong><br>Lat: ${this.selectedPoint.lat.toFixed(6)}, Lng: ${this.selectedPoint.lng.toFixed(6)}`;
        const popup = this.engine.createPopup(this.selectedPoint, popupHtml);
        centerMarker.setPopup(popup);

        // Context menu on polygon
        this.engine.onShapeContextMenu(shapeId, (e) => {
            if (this.app) {
                this.app.showUnifiedContextMenu(
                    e.originalEvent.clientX, e.originalEvent.clientY,
                    isoData, 'isochrone'
                );
            }
        });

        const isoData = {
            id: 'isochrone_' + Date.now(),
            name: 'Isochrone',
            shapeId: shapeId,
            centerMarker: centerMarker,
            centerPoint: { ...this.selectedPoint },
            center: { ...this.selectedPoint },
            coordinates: coordinates,
            parameters: params,
            color: color,
            showName: true
        };

        // Label at center
        const labelId = `label_isochrone_${isoData.id}`;
        this.labelManager.createLabel('isochrone', isoData, {
            position: this.selectedPoint,
            visible: true,
            labelId: labelId,
            color: color
        });

        // Fit bounds
        this.engine.fitBoundsFromPoints(coordinates);

        // Save
        this.app.data.isochrones = this.app.data.isochrones || [];
        this.app.data.isochrones.push(isoData);
        this.app.saveToLocalStorage();
        this.addToLayer(isoData, 'isochrone');
    }

    cancelDrawing() {
        if (this.isochroneMarker) {
            this.isochroneMarker.remove();
            this.isochroneMarker = null;
        }
        this.selectedPoint = null;

        const infoEl = document.getElementById('isochrone-point-info-sidebar');
        if (infoEl) infoEl.textContent = 'Cliquez sur la carte pour placer le point de départ';
        const calcBtn = document.getElementById('calculate-isochrone-sidebar');
        if (calcBtn) calcBtn.disabled = true;
    }

    finishDrawing() {
        // Isochrone finishes via calculate(), not via explicit finish
    }
}

if (typeof window !== 'undefined') {
    window.IsochroneTool = IsochroneTool;
}
