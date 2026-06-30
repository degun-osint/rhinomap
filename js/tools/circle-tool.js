/**
 * CircleTool - Create circles with measured radius/area
 * Two-click: center then edge. Resizable by edge drag.
 */

class CircleTool extends DrawingTool {

    get name() { return 'circle'; }

    constructor(app, engine, labelManager, layersManager) {
        super(app, engine, labelManager, layersManager);
        this.circleCenter = null;
        this.centerPointData = null;
        this.tempCircleId = null;
        this.radiusTooltipId = null;
        this._lastCircleUpdate = 0;
        this._onMouseMove = null;
        this._onMapClick = null;
    }

    onMapClick(latlng, originalEvent) {
        if (!this._drawing) {
            this._startCircle(latlng);
        }
        // Second click is handled by the temp _onMapClick handler
    }

    onMapMouseMove(latlng) {
        // Preview handled by temp handlers during drawing
    }

    // ---- Circle creation ----

    _startCircle(latlng) {
        this._drawing = true;
        this.circleCenter = latlng;

        // Center helper point
        this.centerPointData = this.createHelperPoint(latlng, 'Centre', 'circle-center');

        // Temp circle (small initial radius)
        const color = this.getLayerColor();
        this.tempCircleId = this.engine.addCirclePolygon(null, latlng, 100, {
            color: '#f39c12',
            fillColor: '#f39c12',
            fillOpacity: 0.2,
            weight: 2
        });

        // Temporary event handlers
        this._onMouseMove = (e) => this._onPreviewMove(e.latlng);
        this._onMapClick = (e) => this._confirmRadius(e.latlng);

        this.engine.on('mousemove', this._onMouseMove);
        this.engine.on('click', this._onMapClick);

        if (this.app.updateInfo) {
            this.app.updateInfo('Cercle commencé', 'Déplacez la souris et cliquez pour définir le rayon');
        }
    }

    _onPreviewMove(latlng) {
        if (!this._drawing || !this.circleCenter) return;

        const radius = GeoUtils.haversineDistance(this.circleCenter, latlng);
        this.engine.updateCirclePolygon(this.tempCircleId, this.circleCenter, radius);

        // Throttled tooltip
        const now = performance.now();
        if (now - this._lastCircleUpdate > 32) {
            this._lastCircleUpdate = now;
            const area = Math.PI * radius * radius;
            const content = `Rayon: ${GeoUtils.formatDistance(radius)}<br>Superficie: ${GeoUtils.formatArea(area)}`;

            if (!this.radiusTooltipId) {
                this.radiusTooltipId = this.labelManager.createLabel('line-segment', {
                    id: 'temp_circle_radius',
                    distance: radius,
                    azimuth: 0
                }, {
                    position: latlng,
                    visible: true,
                    labelId: 'label_temp_circle'
                });
                // Override content with custom html
                this.labelManager.updateLabel('label_temp_circle', content);
            } else {
                this.labelManager.updateLabel('label_temp_circle', content);
                this.labelManager.updatePosition('label_temp_circle', latlng);
            }
        }
    }

    _confirmRadius(latlng) {
        if (!this._drawing || !this.circleCenter) return;

        const radius = GeoUtils.haversineDistance(this.circleCenter, latlng);
        const color = this.getLayerColor();
        const area = Math.PI * radius * radius;

        // Remove temp elements
        this._cleanupTempHandlers();
        if (this.tempCircleId) {
            this.engine.removeShape(this.tempCircleId);
            this.tempCircleId = null;
        }
        if (this.radiusTooltipId) {
            this.labelManager.removeLabel('label_temp_circle');
            this.radiusTooltipId = null;
        }

        // Create final circle
        const circleShapeId = this.engine.addCirclePolygon(null, this.circleCenter, radius, {
            color: color,
            fillColor: color,
            fillOpacity: 0.2,
            weight: 2
        });

        // Context menu on circle
        this.engine.onShapeContextMenu(circleShapeId, (e) => {
            if (this.app && !this._drawing) {
                this.app.showUnifiedContextMenu(
                    e.originalEvent.clientX, e.originalEvent.clientY,
                    circleData, 'circle'
                );
            }
        });

        const circleData = {
            id: Date.now() + Math.random(),
            name: this.centerPointData?.name || 'Circle',
            center: { ...this.circleCenter },
            radius: radius,
            area: area,
            shapeId: circleShapeId,
            centerPoint: this.centerPointData,
            showName: true,
            color: color
        };

        // Make resizable
        this._makeResizable(circleData);

        // Save
        this.app.data.circles.push(circleData);
        this.app.saveToLocalStorage();
        this.addToLayer(circleData, 'circle');

        // Show center label
        if (this.centerPointData) {
            const labelId = `label_point_${this.centerPointData.id}`;
            this.labelManager.setVisibility(labelId, circleData.showName);
        }

        this._drawing = false;
        this.circleCenter = null;
        this.centerPointData = null;

        if (this.app.deselectTool) this.app.deselectTool();
        if (this.app.updateInfo) {
            this.app.updateInfo('Cercle créé', `Rayon: ${GeoUtils.formatDistance(radius)}`);
        }
    }

    // ---- Resize ----

    _makeResizable(circleData) {
        let isResizing = false;
        let resizeTooltipId = null;

        this.engine.onShapeClick(circleData.shapeId, (e) => {
            // Check if click is near edge (80% threshold)
            const dist = GeoUtils.haversineDistance(circleData.center, e.latlng);
            if (dist < circleData.radius * 0.8) return;

            isResizing = true;
            // Disable map drag
            this.engine.getMapLibreMap().dragPan.disable();

            const onMove = (moveE) => {
                if (!isResizing) return;
                const newRadius = GeoUtils.haversineDistance(circleData.center, moveE.latlng);
                if (newRadius < 10) return;

                circleData.radius = newRadius;
                circleData.area = Math.PI * newRadius * newRadius;
                this.engine.updateCirclePolygon(circleData.shapeId, circleData.center, newRadius);
            };

            const onUp = () => {
                isResizing = false;
                this.engine.getMapLibreMap().dragPan.enable();
                this.engine.off('mousemove', onMove);
                this.engine.off('mouseup', onUp);
                this.app.saveToLocalStorage();
                if (this.app.updateInfo) {
                    this.app.updateInfo('Cercle redimensionné', `Rayon: ${GeoUtils.formatDistance(circleData.radius)}`);
                }
            };

            this.engine.on('mousemove', onMove);
            this.engine.on('mouseup', onUp);
        });
    }

    // ---- Cleanup ----

    _cleanupTempHandlers() {
        if (this._onMouseMove) {
            this.engine.off('mousemove', this._onMouseMove);
            this._onMouseMove = null;
        }
        if (this._onMapClick) {
            this.engine.off('click', this._onMapClick);
            this._onMapClick = null;
        }
    }

    cancelDrawing() {
        this._cleanupTempHandlers();
        if (this.tempCircleId) {
            this.engine.removeShape(this.tempCircleId);
            this.tempCircleId = null;
        }
        if (this.radiusTooltipId) {
            this.labelManager.removeLabel('label_temp_circle');
            this.radiusTooltipId = null;
        }
        if (this.centerPointData && this.centerPointData.marker) {
            this.centerPointData.marker.remove();
            this.labelManager.removeLabel(`label_point_${this.centerPointData.id}`);
        }
        this._drawing = false;
        this.circleCenter = null;
        this.centerPointData = null;
    }

    finishDrawing() {
        // Circle finishes on second click, not via explicit finish
    }

    // ---- Connected updates (called when center is dragged) ----

    updateCircleCenter(circleData, newPos) {
        circleData.center = newPos;
        this.engine.updateCirclePolygon(circleData.shapeId, newPos, circleData.radius);
    }
}

if (typeof window !== 'undefined') {
    window.CircleTool = CircleTool;
}
