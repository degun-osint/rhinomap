/**
 * PointTool - Creates named, draggable point markers on the map
 * Supports custom SVG icons via IconPicker
 */

class PointTool extends DrawingTool {

    get name() { return 'point'; }

    activate() {
        super.activate();
    }

    /**
     * Map click → store location, open name modal
     */
    onMapClick(latlng, originalEvent) {
        this.app.tempPointLocation = latlng;
        this.app.openPointNameModal();
    }

    /**
     * Create a named point (called from modal confirm)
     * @param {{lat: number, lng: number}} latlng
     * @param {string} name
     * @param {string|null} existingId - For restoring from localStorage
     * @returns {object} pointData
     */
    createPoint(latlng, name, existingId = null) {
        const color = this.getLayerColor();
        const iconType = 'circle'; // Default, can be changed later via icon picker
        const iconName = null;

        // Create marker DOM element
        const el = this._createMarkerElement(color, iconType);

        const marker = this.engine.createMarker(latlng, {
            element: el,
            draggable: true
        });

        marker.addTo(this.engine);

        const pointData = {
            id: existingId || Date.now(),
            latlng: { ...latlng },
            name: name,
            type: 'standalone',
            marker: marker,
            label: null,
            color: color,
            iconType: iconType,
            iconName: iconName,
            isHelperPoint: false,
            showName: true
        };

        // Create label bound to marker (follows on drag automatically)
        if (this.labelManager) {
            const label = this.labelManager.createLabel('point', pointData, {
                position: latlng,
                visible: true,
                labelId: `label_point_${pointData.id}`,
                marker: marker,
                color: color
            });
            pointData.label = label;
        }

        // Popup with coordinates
        const popupHtml = this._createPopupHtml(name, latlng);
        const popup = this.engine.createPopup(latlng, popupHtml);
        marker.setPopup(popup);

        // Drag events
        marker.on('dragstart', () => {
            if (this.app) this.app.isDragging = true;
        });

        marker.on('drag', (e) => {
            pointData.latlng = e.latlng;
            if (this.app && this.app.updateConnectedElements) {
                this.app.updateConnectedElements(pointData, e.latlng);
            }
        });

        marker.on('dragend', (e) => {
            if (this.app) this.app.isDragging = false;
            pointData.latlng = e.latlng;
            // Update popup with new coords
            const newPopupHtml = this._createPopupHtml(pointData.name, e.latlng);
            const newPopup = this.engine.createPopup(e.latlng, newPopupHtml);
            marker.setPopup(newPopup);
            if (this.app && this.app.updateConnectedElements) {
                this.app.updateConnectedElements(pointData, e.latlng);
            }
            if (this.app && this.app.saveToLocalStorage) {
                this.app.saveToLocalStorage();
            }
        });

        // Context menu
        marker.on('contextmenu', (e) => {
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

        // Store in data and layer system
        this.app.data.points.push(pointData);
        this.app.saveToLocalStorage();
        this.addToLayer(pointData, 'point');

        return pointData;
    }

    /**
     * Change icon of an existing point
     * @param {object} pointData
     * @param {string} iconName - SVG icon name
     * @param {string} color
     */
    async changeIcon(pointData, iconName, color) {
        if (!window.iconPicker) return;

        const el = await window.iconPicker.createIcon(iconName, color);
        if (el && pointData.marker) {
            const markerEl = pointData.marker.getElement();
            // Replace marker content
            markerEl.innerHTML = '';
            markerEl.appendChild(el);
            pointData.iconType = 'svg';
            pointData.iconName = iconName;
            pointData.color = color;
        }
    }

    // ---- Private helpers ----

    _createMarkerElement(color, iconType = 'circle', size = 20) {
        const el = document.createElement('div');
        el.className = 'custom-marker-icon';
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.innerHTML = `<div style="
            background-color: ${color};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>`;
        return el;
    }

    _createPopupHtml(name, latlng) {
        if (this.app && this.app.createCoordinatesPopupContent) {
            return this.app.createCoordinatesPopupContent(
                name, latlng.lat, latlng.lng,
                `<br><small>${i18n.t('click_name_to_rename')}</small>`
            );
        }
        return `<strong>${name}</strong><br>
                <span>Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}</span>`;
    }
}

if (typeof window !== 'undefined') {
    window.PointTool = PointTool;
}
