/**
 * LineTool - Multi-segment measured line with distance/azimuth labels
 * Supports distance and azimuth constraints
 */

class LineTool extends DrawingTool {

    get name() { return 'line'; }

    constructor(app, engine, labelManager, layersManager) {
        super(app, engine, labelManager, layersManager);
        this.currentLine = null;
        this.tempPreviewLineId = null;
        this.tempTooltipId = null;
        this.constrainedEndPoint = null;
        this._lastUpdateTime = 0;
        this._lastConstrainedPoint = null;
        this._lastDistance = 0;
        this._lastAzimuth = 0;
        this._lastMidpoint = null;
        this.updateThrottle = 50;

        // Constraints
        this.constraints = {
            distanceLocked: false,
            azimuthLocked: false,
            lockedDistance: null,
            lockedAzimuth: null
        };
    }

    activate() {
        super.activate();
        if (this.app.showPanel) this.app.showPanel();
    }

    deactivate() {
        this.cancelDrawing();
        this._active = false;
        this.engine.setCursor('');
        if (this.app.hidePanel) this.app.hidePanel();
    }

    onMapClick(latlng, originalEvent) {
        // Ctrl+click to finish
        if (originalEvent && originalEvent.ctrlKey && this._drawing) {
            this.finishDrawing();
            return;
        }

        if (!this._drawing) {
            this._startLine(latlng);
        } else {
            this._addSegment(latlng);
        }
    }

    onMapMouseMove(latlng) {
        if (!this._drawing || !this.currentLine) return;
        this._updatePreview(latlng);
    }

    onMapDoubleClick(latlng) {
        if (this._drawing) this.finishDrawing();
    }

    onMapRightClick(latlng, originalEvent) {
        if (this._drawing) this.finishDrawing();
    }

    // ---- Line creation ----

    _startLine(latlng) {
        this._drawing = true;
        this.currentLine = {
            id: Date.now(),
            points: [latlng],
            segments: [],
            shapeIds: [],     // MapEngine shape IDs for polyline segments
            pointData: [],
            segmentLabelIds: [],
            totalDistance: 0
        };

        const startPoint = this.createHelperPoint(latlng, 'Début', 'start');
        this.currentLine.pointData.push(startPoint);

        if (this.app.updateInfo) {
            this.app.updateInfo('Tracé commencé', 'Clic: ajouter segment | Ctrl+clic: terminer');
        }
    }

    _addSegment(latlng) {
        const endPoint = this.constrainedEndPoint || latlng;
        const startPoint = this.currentLine.points[this.currentLine.points.length - 1];

        this.currentLine.points.push(endPoint);

        const color = this.getLayerColor();

        // Calculate segment data
        const distance = GeoUtils.haversineDistance(startPoint, endPoint);
        const azimuth = GeoUtils.calculateAzimuth(startPoint, endPoint);
        const segment = {
            id: Date.now() + Math.random(),
            start: startPoint,
            end: endPoint,
            distance,
            azimuth
        };
        this.currentLine.segments.push(segment);

        // Draw polyline segment
        const shapeId = this.engine.addPolyline(null, [startPoint, endPoint], {
            color: color,
            weight: 3
        });
        this.currentLine.shapeIds.push(shapeId);

        // Context menu on segment
        this.engine.onShapeContextMenu(shapeId, (e) => {
            if (this.app) {
                this.app.showUnifiedContextMenu(
                    e.originalEvent.clientX, e.originalEvent.clientY,
                    this.currentLine, 'line'
                );
            }
        });

        // Create helper point at segment end
        const pointIndex = this.currentLine.points.length;
        const pointData = this.createHelperPoint(endPoint, `Point ${pointIndex}`, 'segment', color);
        this.currentLine.pointData.push(pointData);

        // Segment measurement label at midpoint
        const midpoint = GeoUtils.calculateMidpoint(startPoint, endPoint);
        const segmentIndex = this.currentLine.segments.length - 1;
        const labelId = `label_line-segment_${this.currentLine.id}_${segmentIndex}`;
        this.labelManager.createLabel('line-segment', segment, {
            position: midpoint,
            visible: true,
            labelId: labelId,
            color: color
        });
        this.currentLine.segmentLabelIds.push(labelId);

        // Clear preview
        this._clearPreview();
        this._resetConstraintsForNextSegment();

        const totalDistance = this.currentLine.segments.reduce((t, s) => t + s.distance, 0);
        this.currentLine.totalDistance = totalDistance;

        if (this.app.updateInfo) {
            this.app.updateInfo('Segment ajouté',
                `${this.currentLine.segments.length} segments | Total: ${GeoUtils.formatDistance(totalDistance)} | Ctrl+clic pour terminer`);
        }
    }

    // ---- Preview ----

    _updatePreview(latlng) {
        const now = performance.now();
        if (now - this._lastUpdateTime < this.updateThrottle) return;
        this._lastUpdateTime = now;

        const startPoint = this.currentLine.points[this.currentLine.points.length - 1];
        const constrainedPoint = this._applyConstraints(latlng, startPoint);

        // Preview polyline
        if (!this.tempPreviewLineId) {
            this.tempPreviewLineId = this.engine.addPolyline(null, [startPoint, constrainedPoint], {
                color: '#3498db',
                weight: 2,
                dashArray: [5, 5],
                opacity: 0.7
            });
        } else {
            this.engine.updatePolyline(this.tempPreviewLineId, [startPoint, constrainedPoint]);
        }

        // Calculate measurements
        if (!this._lastConstrainedPoint ||
            this._lastConstrainedPoint.lat !== constrainedPoint.lat ||
            this._lastConstrainedPoint.lng !== constrainedPoint.lng) {
            this._lastConstrainedPoint = constrainedPoint;
            this._lastDistance = GeoUtils.haversineDistance(startPoint, constrainedPoint);
            this._lastAzimuth = GeoUtils.calculateAzimuth(startPoint, constrainedPoint);
            this._lastMidpoint = GeoUtils.calculateMidpoint(startPoint, constrainedPoint);
        }

        // Measurement tooltip
        const content = this._getTooltipContent(this._lastDistance, this._lastAzimuth);

        if (!this.tempTooltipId) {
            this.tempTooltipId = this.labelManager.createLabel('line-segment', {
                id: 'temp_preview',
                distance: this._lastDistance,
                azimuth: this._lastAzimuth
            }, {
                position: this._lastMidpoint,
                visible: true,
                labelId: 'label_temp_preview'
            });
        } else {
            this.labelManager.updateLabel('label_temp_preview', {
                distance: this._lastDistance,
                azimuth: this._lastAzimuth
            });
            this.labelManager.updatePosition('label_temp_preview', this._lastMidpoint);
        }

        this.constrainedEndPoint = constrainedPoint;
    }

    _clearPreview() {
        if (this.tempPreviewLineId) {
            this.engine.removeShape(this.tempPreviewLineId);
            this.tempPreviewLineId = null;
        }
        if (this.tempTooltipId) {
            this.labelManager.removeLabel('label_temp_preview');
            this.tempTooltipId = null;
        }
        this._lastConstrainedPoint = null;
        this.constrainedEndPoint = null;
    }

    // ---- Constraints ----

    _applyConstraints(latlng, startPoint) {
        let point = { ...latlng };

        if (this.constraints.distanceLocked && this.constraints.lockedDistance) {
            const bearing = this.constraints.azimuthLocked
                ? this.constraints.lockedAzimuth
                : GeoUtils.calculateAzimuth(startPoint, latlng);
            point = GeoUtils.calculateDestination(startPoint, this.constraints.lockedDistance, bearing);
        } else if (this.constraints.azimuthLocked && this.constraints.lockedAzimuth !== null) {
            const distance = GeoUtils.haversineDistance(startPoint, latlng);
            point = GeoUtils.calculateDestination(startPoint, distance, this.constraints.lockedAzimuth);
        }

        return point;
    }

    setConstraints(constraints) {
        Object.assign(this.constraints, constraints);
    }

    resetConstraints() {
        this.constraints = { distanceLocked: false, azimuthLocked: false, lockedDistance: null, lockedAzimuth: null };
    }

    _resetConstraintsForNextSegment() {
        // Keep constraints for consistent segments
    }

    _getTooltipContent(distance, azimuth) {
        let content = `${GeoUtils.formatDistance(distance)} - ${azimuth.toFixed(1)}°`;
        if (this.constraints.distanceLocked || this.constraints.azimuthLocked) content += ' 🔒';
        if (this.constraints.distanceLocked) content += ` | D: ${GeoUtils.formatDistance(this.constraints.lockedDistance)}`;
        if (this.constraints.azimuthLocked) content += ` | A: ${this.constraints.lockedAzimuth}°`;
        return content;
    }

    // ---- Finish ----

    finishDrawing() {
        if (!this.currentLine || this.currentLine.segments.length === 0) return;

        this._clearPreview();

        const totalDistance = this.currentLine.totalDistance;
        const segmentCount = this.currentLine.segments.length;

        // Summary popup
        const lastPoint = this.currentLine.points[this.currentLine.points.length - 1];
        const popup = this.engine.createPopup(lastPoint, `
            <strong>Tracé terminé</strong><br>
            Segments: ${segmentCount}<br>
            Distance totale: ${GeoUtils.formatDistance(totalDistance)}<br>
            Points: ${this.currentLine.points.length}
        `);
        popup.addTo(this.engine.getMapLibreMap());

        // Save
        const lineData = { ...this.currentLine };
        this.app.data.lines.push(lineData);
        this.app.saveToLocalStorage();
        this.addToLayer(lineData, 'line');

        this._drawing = false;
        this.currentLine = null;
        this.resetConstraints();

        if (this.app.hidePanel) this.app.hidePanel();
        if (this.app.deselectTool) this.app.deselectTool();

        if (this.app.updateInfo) {
            this.app.updateInfo('Tracé terminé', `${segmentCount} segments, ${GeoUtils.formatDistance(totalDistance)} total`);
        }
    }

    cancelDrawing() {
        if (this.currentLine) {
            // Remove all created elements
            this.currentLine.pointData.forEach(pd => {
                if (pd.marker) pd.marker.remove();
                this.labelManager.removeLabel(`label_point_${pd.id}`);
            });
            this.currentLine.shapeIds.forEach(id => this.engine.removeShape(id));
            this.currentLine.segmentLabelIds.forEach(id => this.labelManager.removeLabel(id));
        }
        this._clearPreview();
        this._drawing = false;
        this.currentLine = null;
    }

    // ---- Segment redraw (called when helper points are dragged) ----

    redrawSegments(lineData, changedPointIndex) {
        if (!lineData.shapeIds || !lineData.points) return;

        const updateSegment = (segmentIndex, start, end) => {
            if (lineData.shapeIds[segmentIndex]) {
                this.engine.updatePolyline(lineData.shapeIds[segmentIndex], [start, end]);
            }

            const distance = GeoUtils.haversineDistance(start, end);
            const azimuth = GeoUtils.calculateAzimuth(start, end);
            const midpoint = GeoUtils.calculateMidpoint(start, end);

            if (lineData.segments[segmentIndex]) {
                lineData.segments[segmentIndex].distance = distance;
                lineData.segments[segmentIndex].azimuth = azimuth;
            }

            const labelId = `label_line-segment_${lineData.id}_${segmentIndex}`;
            this.labelManager.updateLabel(labelId, { distance, azimuth });
            this.labelManager.updatePosition(labelId, midpoint);
        };

        if (changedPointIndex > 0) {
            updateSegment(changedPointIndex - 1, lineData.points[changedPointIndex - 1], lineData.points[changedPointIndex]);
        }
        if (changedPointIndex < lineData.points.length - 1) {
            updateSegment(changedPointIndex, lineData.points[changedPointIndex], lineData.points[changedPointIndex + 1]);
        }
    }
}

if (typeof window !== 'undefined') {
    window.LineTool = LineTool;
}
