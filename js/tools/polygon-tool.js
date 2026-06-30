/**
 * PolygonTool - Multi-point polygon with area/perimeter measurement
 * Draggable vertices that update area in real-time
 */

class PolygonTool extends DrawingTool {

    get name() { return 'polygon'; }

    constructor(app, engine, labelManager, layersManager) {
        super(app, engine, labelManager, layersManager);
        this.currentPolygon = null;
        this.previewShapeId = null;
    }

    onMapClick(latlng, originalEvent) {
        if (originalEvent && originalEvent.ctrlKey && this._drawing) {
            this.finishDrawing();
            return;
        }

        if (!this._drawing) {
            this._startPolygon(latlng);
        } else {
            this._addVertex(latlng);
        }
    }

    onMapDoubleClick(latlng) {
        if (this._drawing) this.finishDrawing();
    }

    onMapRightClick(latlng, originalEvent) {
        if (this._drawing) this.finishDrawing();
    }

    // ---- Polygon creation ----

    _startPolygon(latlng) {
        this._drawing = true;
        const color = this.getLayerColor();

        this.currentPolygon = {
            id: Date.now(),
            points: [latlng],
            pointData: []
        };

        const pd = this.createHelperPoint(latlng, 'Point 1', 'polygon-point', color);
        this.currentPolygon.pointData.push(pd);

        if (this.app.updateInfo) {
            this.app.updateInfo('Polygone commencé', 'Clic: ajouter point | Ctrl+clic: terminer (min 3 points)');
        }
    }

    _addVertex(latlng) {
        const color = this.getLayerColor();
        this.currentPolygon.points.push(latlng);

        const pointIndex = this.currentPolygon.points.length;
        const pd = this.createHelperPoint(latlng, `Point ${pointIndex}`, 'polygon-point', color);
        this.currentPolygon.pointData.push(pd);

        this._updatePreview();

        if (this.app.updateInfo) {
            this.app.updateInfo('Point ajouté', `${pointIndex} points | Ctrl+clic pour terminer (min 3)`);
        }
    }

    _updatePreview() {
        if (this.currentPolygon && this.currentPolygon.points.length >= 2) {
            if (this.previewShapeId) {
                this.engine.updatePolygon(this.previewShapeId, this.currentPolygon.points);
            } else {
                this.previewShapeId = this.engine.addPolygon(null, this.currentPolygon.points, {
                    color: '#9b59b6',
                    fillColor: '#9b59b6',
                    fillOpacity: 0.2,
                    weight: 2,
                    dashArray: [5, 5]
                });
            }
        }
    }

    // ---- Finish ----

    finishDrawing() {
        if (!this.currentPolygon || this.currentPolygon.points.length < 3) {
            if (this.app.updateInfo) {
                this.app.updateInfo('Erreur', 'Un polygone doit avoir au moins 3 points');
            }
            return;
        }

        // Remove preview
        if (this.previewShapeId) {
            this.engine.removeShape(this.previewShapeId);
            this.previewShapeId = null;
        }

        const points = this.currentPolygon.points;
        const color = this.getLayerColor();
        const area = GeoUtils.calculatePolygonArea(points);
        const perimeter = GeoUtils.calculatePolygonPerimeter(points);

        // Create final polygon
        const shapeId = this.engine.addPolygon(null, points, {
            color: color,
            fillColor: color,
            fillOpacity: 0.3,
            weight: 2
        });

        // Context menu
        this.engine.onShapeContextMenu(shapeId, (e) => {
            if (this.app && !this._drawing) {
                this.app.showUnifiedContextMenu(
                    e.originalEvent.clientX, e.originalEvent.clientY,
                    polygonData, 'polygon'
                );
            }
        });

        // Calculate center for label
        const center = this._calculateCentroid(points);

        const polygonData = {
            ...this.currentPolygon,
            shapeId: shapeId,
            name: 'Polygone',
            area: area,
            perimeter: perimeter,
            center: center,
            color: color,
            showName: true,
            showIcon: true
        };

        // Polygon label at center
        const labelId = `label_polygon_${polygonData.id}`;
        this.labelManager.createLabel('polygon', polygonData, {
            position: center,
            visible: true,
            labelId: labelId,
            color: color
        });

        // Click-through during drawing (shapes don't block map clicks)
        this.engine.onShapeClick(shapeId, (e) => {
            if (this.app && (this.app.isDrawing || this.app.currentTool)) {
                // Let click pass through
            }
        });

        // Save
        this.app.data.polygons.push(polygonData);
        this.app.saveToLocalStorage();
        this.addToLayer(polygonData, 'polygon');

        this._drawing = false;
        this.currentPolygon = null;

        if (this.app.deselectTool) this.app.deselectTool();
        if (this.app.updateInfo) {
            this.app.updateInfo('Polygone terminé', `Aire: ${GeoUtils.formatArea(area)}`);
        }
    }

    cancelDrawing() {
        if (this.currentPolygon) {
            this.currentPolygon.pointData.forEach(pd => {
                if (pd.marker) pd.marker.remove();
                this.labelManager.removeLabel(`label_point_${pd.id}`);
            });
        }
        if (this.previewShapeId) {
            this.engine.removeShape(this.previewShapeId);
            this.previewShapeId = null;
        }
        this._drawing = false;
        this.currentPolygon = null;
    }

    // ---- Connected updates (called when vertices are dragged) ----

    updatePolygonVertices(polygonData, changedPointIndex, newPos) {
        if (polygonData.points) {
            polygonData.points[changedPointIndex] = newPos;
        }
        if (polygonData.shapeId) {
            this.engine.updatePolygon(polygonData.shapeId, polygonData.points);
        }

        // Recalculate
        polygonData.area = GeoUtils.calculatePolygonArea(polygonData.points);
        polygonData.perimeter = GeoUtils.calculatePolygonPerimeter(polygonData.points);
        polygonData.center = this._calculateCentroid(polygonData.points);

        // Update label
        const labelId = `label_polygon_${polygonData.id}`;
        this.labelManager.updateLabel(labelId, polygonData);
        this.labelManager.updatePosition(labelId, polygonData.center);
    }

    _calculateCentroid(points) {
        if (!points || points.length === 0) return { lat: 0, lng: 0 };
        const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
        const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
        return { lat, lng };
    }
}

if (typeof window !== 'undefined') {
    window.PolygonTool = PolygonTool;
}
