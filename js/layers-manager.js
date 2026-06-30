/**
 * RhinoMap Layers Manager
 * Hierarchical layer management system
 */

class LayersManager {
    constructor(app) {
        this.app = app;
        this.layers = [];
        this.currentLayerId = null;
        this._saveTimer = null;
        this._elementIndex = new Map(); // elementId → {layer, element} for O(1) lookup

        // Guarantee save on page unload (covers browser close during debounce)
        window.addEventListener('beforeunload', () => {
            if (this._saveTimer) {
                clearTimeout(this._saveTimer);
                this._saveImmediate();
            }
        });

        const loaded = this.load();

        if (!loaded || this.layers.length === 0) {
            this.createLayer('Default Layer', true);
        }
    }

    /**
     * Create a new layer
     */
    createLayer(name, setAsCurrent = false) {
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const layer = {
            id: 'layer_' + Date.now(),
            name: name || `Layer ${this.layers.length + 1}`,
            visible: true,
            locked: false,
            color: randomColor,
            elements: [],
            created: new Date().toISOString(),
            clusterGroup: null
        };

        this.layers.push(layer);

        if (setAsCurrent || !this.currentLayerId) {
            this.currentLayerId = layer.id;
        }

        this.save();
        this.updateUI();

        return layer;
    }

    /**
     * Get layer by ID
     */
    getLayer(layerId) {
        return this.layers.find(l => l.id === layerId);
    }

    /**
     * Get current active layer
     */
    getCurrentLayer() {
        return this.getLayer(this.currentLayerId) || this.layers[0];
    }

    /**
     * Get or create the MarkerClusterGroup for a layer
     */
    getOrCreateClusterGroup(layer) {
        if (!layer.clusterGroup && this.app.engine) {
            const engine = this.app.engine;
            const map = engine.getMapLibreMap();
            const layerColor = layer.color || '#3498db';

            // Supercluster-based clustering
            const index = new Supercluster({ radius: 50, maxZoom: 17 });
            const allMarkers = new Map(); // id → { marker, latlng }
            const clusterMarkers = new Map(); // clusterId → DOM marker
            let visible = true;
            let nextId = 0;

            const updateClusters = () => {
                if (!visible) return;

                // Build GeoJSON points
                const points = [];
                allMarkers.forEach((entry, id) => {
                    points.push({
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [entry.latlng.lng, entry.latlng.lat] },
                        properties: { id }
                    });
                });
                index.load(points);

                const zoom = Math.floor(map.getZoom());
                const bounds = map.getBounds();
                const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
                const clusters = index.getClusters(bbox, zoom);

                // Track which individual markers should be visible
                const visibleMarkerIds = new Set();
                const newClusterKeys = new Set();

                clusters.forEach(feature => {
                    if (feature.properties.cluster) {
                        // It's a cluster
                        const key = `c_${feature.properties.cluster_id}`;
                        newClusterKeys.add(key);
                        const [lng, lat] = feature.geometry.coordinates;
                        const count = feature.properties.point_count;

                        if (clusterMarkers.has(key)) {
                            // Update existing cluster marker position/count
                            const cm = clusterMarkers.get(key);
                            cm.marker.setLngLat([lng, lat]);
                            cm.el.textContent = count;
                        } else {
                            // Create cluster badge
                            const el = document.createElement('div');
                            el.className = 'rhinomap-cluster-badge';
                            el.style.cssText = `background:${layerColor};color:#fff;border-radius:50%;
                                width:36px;height:36px;display:flex;align-items:center;justify-content:center;
                                font-weight:bold;font-size:0.85rem;border:3px solid white;
                                box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;`;
                            el.textContent = count;

                            const cm = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
                            el.addEventListener('click', () => {
                                const expansionZoom = index.getClusterExpansionZoom(feature.properties.cluster_id);
                                map.easeTo({ center: [lng, lat], zoom: expansionZoom + 1 });
                            });
                            clusterMarkers.set(key, { marker: cm, el });
                        }
                    } else {
                        // Individual point
                        visibleMarkerIds.add(feature.properties.id);
                    }
                });

                // Remove stale cluster markers
                clusterMarkers.forEach((cm, key) => {
                    if (!newClusterKeys.has(key)) {
                        cm.marker.remove();
                        clusterMarkers.delete(key);
                    }
                });

                // Show/hide individual markers
                allMarkers.forEach((entry, id) => {
                    if (visibleMarkerIds.has(id)) {
                        if (!entry.marker._onMap) entry.marker.addTo(engine);
                    } else {
                        if (entry.marker._onMap) entry.marker.remove();
                    }
                });
            };

            // Debounce cluster updates (150ms — coalesces rapid pan/zoom events)
            let updateTimer = null;
            const scheduleUpdate = () => {
                if (updateTimer) clearTimeout(updateTimer);
                updateTimer = setTimeout(updateClusters, 150);
            };

            map.on('moveend', scheduleUpdate);
            map.on('zoomend', scheduleUpdate);

            layer.clusterGroup = {
                _markers: allMarkers,
                _visible: visible,

                addLayer(m) {
                    const id = `m${nextId++}`;
                    const latlng = m.getLatLng();
                    allMarkers.set(id, { marker: m, latlng });
                    scheduleUpdate();
                },

                removeLayer(m) {
                    let found = null;
                    allMarkers.forEach((entry, id) => { if (entry.marker === m) found = id; });
                    if (found) {
                        allMarkers.delete(found);
                        if (m._onMap) m.remove();
                        scheduleUpdate();
                    }
                },

                hasLayer(m) {
                    let has = false;
                    allMarkers.forEach(entry => { if (entry.marker === m) has = true; });
                    return has;
                },

                eachLayer(fn) {
                    allMarkers.forEach(entry => fn(entry.marker));
                },

                show() {
                    visible = true;
                    scheduleUpdate();
                },

                hide() {
                    visible = false;
                    allMarkers.forEach(entry => { if (entry.marker._onMap) entry.marker.remove(); });
                    clusterMarkers.forEach(cm => cm.marker.remove());
                    clusterMarkers.clear();
                },

                updateColor(newColor) {
                    clusterMarkers.forEach(cm => { cm.el.style.background = newColor; });
                },

                update: scheduleUpdate
            };
        }
        return layer.clusterGroup;
    }

    /**
     * Recolor a marker by updating its DOM element
     */
    _recolorMarker(marker, color) {
        if (!marker) return;
        const el = typeof marker.getElement === 'function' ? marker.getElement() : null;
        if (el) {
            const inner = el.querySelector('div');
            if (inner) inner.style.backgroundColor = color;
        }
    }

    /**
     * Recolor a shape via engine
     */
    _recolorShape(shapeIdOrObj, color) {
        if (!shapeIdOrObj) return;
        // New format: string shapeId
        if (typeof shapeIdOrObj === 'string' && this.app.engine) {
            this.app.engine.setShapeStyle(shapeIdOrObj, { color, fillColor: color });
        }
        // Old format: Leaflet object with setStyle
        if (shapeIdOrObj.setStyle) {
            shapeIdOrObj.setStyle({ color, fillColor: color });
        }
    }

    /**
     * Determine if an element should be clustered
     */
    _shouldClusterElement(element) {
        if (element.type === 'point') return true;
        if (element.type === 'image_analysis_zone') return true;
        if (element.type === 'overpass' && element.data) {
            return element.data.type === 'node' || element.data.type === 'relation';
        }
        return false;
    }

    /**
     * Get the layer containing an element (via index)
     */
    _getLayerForElement(element) {
        const entry = this._elementIndex.get(String(element.id));
        return entry ? entry.layer : null;
    }

    /**
     * Find an element by ID across all layers
     */
    findElementById(elementId) {
        // O(1) lookup via index
        const entry = this._elementIndex.get(String(elementId));
        if (entry) return entry.element;
        // Fallback: linear scan (index may be stale after import)
        for (const layer of this.layers) {
            const element = layer.elements.find(e => e.id == elementId);
            if (element) return element;
        }
        return null;
    }

    /**
     * Rename a layer
     */
    renameLayer(layerId, newName) {
        const layer = this.getLayer(layerId);
        if (layer) {
            layer.name = newName;
            this.save();
            this.updateUI();
        }
    }

    /**
     * Convert hex color to nearest marker color
     */
    hexToMarkerColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        // Available marker colors with their approximate RGB values
        const markerColors = {
            'blue': [52, 152, 219],
            'red': [231, 76, 60],
            'green': [46, 204, 113],
            'orange': [243, 156, 18],
            'yellow': [241, 196, 15],
            'violet': [155, 89, 182],
            'grey': [149, 165, 166],
            'black': [52, 73, 94]
        };

        // Find closest color using Euclidean distance
        let minDistance = Infinity;
        let closestColor = 'blue';

        for (const [colorName, [mr, mg, mb]] of Object.entries(markerColors)) {
            const distance = Math.sqrt(
                Math.pow(r - mr, 2) +
                Math.pow(g - mg, 2) +
                Math.pow(b - mb, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestColor = colorName;
            }
        }

        return closestColor;
    }

    /**
     * Create a colored Leaflet icon
     * @param {string} color - Hex color to convert to marker
     * @returns {HTMLElement} DOM element for the marker icon
     */
    createColoredIcon(color) {
        // Returns a DOM element (no Leaflet dependency)
        if (typeof IconPicker !== 'undefined' && IconPicker.createDefaultIcon) {
            return IconPicker.createDefaultIcon(color, 20);
        }
        // Fallback
        const el = document.createElement('div');
        el.className = 'custom-marker-icon';
        el.style.cssText = 'width:20px;height:20px;';
        el.innerHTML = `<div style="background-color:${color};width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`;
        return el;
    }

    /**
     * Set layer color and apply to all elements
     */
    setLayerColor(layerId, color) {
        const layer = this.getLayer(layerId);
        if (layer) {
            layer.color = color;
            let updatedCount = 0;
            layer.elements.forEach(element => {
                if (element.mapObject) {
                    this._recolorShape(element.mapObject, color);
                    this._recolorMarker(element.mapObject, color);
                    updatedCount++;

                    element.color = color;
                    if (element.data) {
                        element.data.color = color;
                    }
                }

                if (element.type === 'point') {
                    this._recolorMarker(element.marker, color);
                    if (element.data) this._recolorMarker(element.data.marker, color);
                }

                if (element.type === 'circle' && element.data) {
                    this._recolorShape(element.data.circle || element.data.shapeId, color);
                    if (element.data.centerPoint) {
                        this._recolorMarker(element.data.centerPoint.marker, color);
                    }
                }

                if ((element.type === 'line' || element.type === 'polygon') && element.data && element.data.pointData) {
                    element.data.pointData.forEach(pd => this._recolorMarker(pd.marker, color));
                }

                if (element.type === 'line' && element.data) {
                    // New format: shapeIds
                    if (element.data.shapeIds) {
                        element.data.shapeIds.forEach(id => this._recolorShape(id, color));
                    }
                    // Old format: polylines
                    if (element.data.polylines) {
                        element.data.polylines.forEach(p => this._recolorShape(p, color));
                    }
                }

                if ((element.type === 'polygon' || element.type === 'isochrone') && element.data) {
                    this._recolorShape(element.data.polygon || element.data.shapeId, color);
                }

                if (this.app.labelManager) {
                    let labelUpdated = false;

                    if (element.type === 'point' || element.type === 'circle' || element.type === 'polygon' || element.type === 'isochrone') {
                        const labelId = `label_${element.type}_${element.id}`;
                        const elementData = element.data || element;
                        if (this.app.labelManager.updateLabelColor(labelId, color, elementData)) {
                            labelUpdated = true;
                        }
                    }

                    if (element.type === 'line' && element.data && element.data.segments) {
                        element.data.segments.forEach(segment => {
                            const labelId = `label_line-segment_${element.id}_${segment.id}`;
                            if (this.app.labelManager.updateLabelColor(labelId, color, segment)) {
                                labelUpdated = true;
                            }
                        });
                    }

                }

                if (!element.mapObject) {
                    console.warn('⚠️ Element without mapObject:', element);
                }
            });

            // Update cluster color
            if (layer.clusterGroup && layer.clusterGroup.updateColor) {
                layer.clusterGroup.updateColor(color);
            }

            this.save();

            // Also save app.data to persist color changes
            if (this.app && this.app.saveToLocalStorage) {
                this.app.saveToLocalStorage();
            }

            this.updateUI();
        }
    }

    /**
     * Delete a layer
     */
    deleteLayer(layerId) {
        if (this.layers.length === 1) {
            showWarning('Cannot delete the last layer');
            return false;
        }

        const index = this.layers.findIndex(l => l.id === layerId);
        if (index > -1) {
            const layer = this.layers[index];

            layer.elements.forEach(element => {
                this.removeElementFromMap(element);
                this._elementIndex.delete(String(element.id));
            });

            // Clean up cluster group
            if (layer.clusterGroup) {
                this.app.map.removeLayer(layer.clusterGroup);
                layer.clusterGroup = null;
            }

            this.layers.splice(index, 1);

            if (this.currentLayerId === layerId) {
                this.currentLayerId = this.layers[0].id;
            }

            this.save();
            this.updateUI();
            return true;
        }

        return false;
    }

    /**
     * Toggle element visibility (independent from layer visibility)
     */
    toggleElementVisibility(elementId) {
        for (let layer of this.layers) {
            const element = layer.elements.find(e => e.id == elementId);
            if (element) {
                element.visible = !element.visible;

                if (layer.visible && element.visible) {
                    this.addElementToMap(element);
                } else {
                    this.removeElementFromMap(element);
                }

                this.save();

                // Save expanded state before updating UI
                const expandedLayers = this.getExpandedLayers();

                this.updateUI();

                // Restore expanded state after UI update
                this.restoreExpandedLayers(expandedLayers);

                return true;
            }
        }

        console.warn('⚠️ Element not found:', elementId);
        return false;
    }

    /**
     * Get list of currently expanded layers
     */
    getExpandedLayers() {
        const expanded = [];
        this.layers.forEach(layer => {
            const elementsDiv = document.getElementById(`elements-${layer.id}`);
            if (elementsDiv && elementsDiv.style.display !== 'none') {
                expanded.push(layer.id);
            }
        });
        return expanded;
    }

    /**
     * Restore expanded state for layers
     */
    restoreExpandedLayers(expandedLayerIds) {
        expandedLayerIds.forEach(layerId => {
            const elementsDiv = document.getElementById(`elements-${layerId}`);
            const arrow = document.querySelector(`[onclick="event.stopPropagation(); toggleLayerExpansion('${layerId}')"] .layer-arrow`);

            if (elementsDiv) {
                elementsDiv.style.display = 'block';
            }
            if (arrow) {
                arrow.style.transform = 'rotate(180deg)';
            }
        });
    }

    /**
     * Toggle layer visibility
     */
    toggleLayerVisibility(layerId) {
        const layer = this.getLayer(layerId);
        if (layer) {
            layer.visible = !layer.visible;

            // Toggle cluster group visibility
            if (layer.clusterGroup) {
                if (layer.visible) {
                    if (!this.app.map.hasLayer(layer.clusterGroup)) {
                        this.app.map.addLayer(layer.clusterGroup);
                    }
                } else {
                    if (this.app.map.hasLayer(layer.clusterGroup)) {
                        this.app.map.removeLayer(layer.clusterGroup);
                    }
                }
            }

            // Show/hide all elements in this layer (respecting individual element visibility)
            layer.elements.forEach(element => {
                const isClusteredElement = this._shouldClusterElement(element);
                if (layer.visible && element.visible) {
                    // Clustered mapObjects are handled by the cluster group toggle above
                    if (!isClusteredElement && element.mapObject && !this.app.map.hasLayer(element.mapObject)) {
                        this.app.map.addLayer(element.mapObject);
                    }
                    if (element.label && !this.app.map.hasLayer(element.label)) {
                        this.app.map.addLayer(element.label);
                    }
                    if (element.marker && !this.app.map.hasLayer(element.marker)) {
                        this.app.map.addLayer(element.marker);
                    }
                    if (element.circleObject && !this.app.map.hasLayer(element.circleObject)) {
                        this.app.map.addLayer(element.circleObject);
                    }

                    // For elements with data object
                    if (element.data) {
                        // Show marker from data (skip for clustered elements — handled by cluster group)
                        if (!isClusteredElement && element.data.marker && !this.app.map.hasLayer(element.data.marker)) {
                            this.app.map.addLayer(element.data.marker);
                        }
                        if (element.data.label && !this.app.map.hasLayer(element.data.label)) {
                            this.app.map.addLayer(element.data.label);
                        }

                        // For circles: show circle and center point
                        if (element.data.circle && !this.app.map.hasLayer(element.data.circle)) {
                            this.app.map.addLayer(element.data.circle);
                        }
                        if (element.data.centerPoint) {
                            // Always show marker (helper points need to be draggable)
                            if (element.data.centerPoint.marker && !this.app.map.hasLayer(element.data.centerPoint.marker)) {
                                this.app.map.addLayer(element.data.centerPoint.marker);
                            }
                            // Show label based on showName state (helper points hidden by default unless explicitly shown)
                            const showName = (element.data.showName !== undefined) ? element.data.showName : (element.showName !== undefined) ? element.showName : !element.data.centerPoint.isHelperPoint;
                            if (showName && element.data.centerPoint.label && !this.app.map.hasLayer(element.data.centerPoint.label)) {
                                this.app.map.addLayer(element.data.centerPoint.label);
                            }
                        }

                        // For lines: show all polylines and segment labels
                        if (element.data.polylines && Array.isArray(element.data.polylines)) {
                            element.data.polylines.forEach(polyline => {
                                if (polyline && !this.app.map.hasLayer(polyline)) {
                                    this.app.map.addLayer(polyline);
                                }
                            });
                        }
                        if (element.data.segmentLabels && Array.isArray(element.data.segmentLabels)) {
                            element.data.segmentLabels.forEach(label => {
                                if (label && !this.app.map.hasLayer(label)) {
                                    this.app.map.addLayer(label);
                                }
                            });
                        }

                        // For polygons and lines: show point markers and labels
                        if (element.data.pointData && Array.isArray(element.data.pointData)) {
                            element.data.pointData.forEach(pointData => {
                                // Always show marker (helper points need to be draggable)
                                if (pointData.marker && !this.app.map.hasLayer(pointData.marker)) {
                                    this.app.map.addLayer(pointData.marker);
                                }
                                // Show label based on showName state (helper points hidden by default unless explicitly shown)
                                const showName = (element.data.showName !== undefined) ? element.data.showName : (element.showName !== undefined) ? element.showName : !pointData.isHelperPoint;
                                if (showName && pointData.label && !this.app.map.hasLayer(pointData.label)) {
                                    this.app.map.addLayer(pointData.label);
                                }
                            });
                        }

                        // For polygons: show the polygon object
                        if (element.data.polygon && !this.app.map.hasLayer(element.data.polygon)) {
                            this.app.map.addLayer(element.data.polygon);
                        }

                        // MapEngine shapes (new format)
                        if (element.data.shapeId && this.app.engine) {
                            this.app.engine.setShapeVisibility(element.data.shapeId, true);
                        }
                        if (element.data.shapeIds && this.app.engine) {
                            element.data.shapeIds.forEach(id => this.app.engine.setShapeVisibility(id, true));
                        }
                        // Isochrone center marker
                        if (element.data.centerMarker && !element.data.centerMarker._onMap) {
                            element.data.centerMarker.addTo(this.app.engine);
                        }
                    }
                } else {
                    // Hide all map objects (clustered ones handled by cluster group toggle)
                    if (!isClusteredElement && element.mapObject && this.app.map.hasLayer(element.mapObject)) {
                        this.app.map.removeLayer(element.mapObject);
                    }
                    if (element.label && this.app.map.hasLayer(element.label)) {
                        this.app.map.removeLayer(element.label);
                    }
                    if (element.marker && this.app.map.hasLayer(element.marker)) {
                        this.app.map.removeLayer(element.marker);
                    }
                    if (element.circleObject && this.app.map.hasLayer(element.circleObject)) {
                        this.app.map.removeLayer(element.circleObject);
                    }

                    // For elements with data object
                    if (element.data) {
                        // Hide marker from data (skip for clustered — handled by cluster group)
                        if (!isClusteredElement && element.data.marker && this.app.map.hasLayer(element.data.marker)) {
                            this.app.map.removeLayer(element.data.marker);
                        }
                        if (element.data.label && this.app.map.hasLayer(element.data.label)) {
                            this.app.map.removeLayer(element.data.label);
                        }

                        // For circles: hide circle and center point
                        if (element.data.circle && this.app.map.hasLayer(element.data.circle)) {
                            this.app.map.removeLayer(element.data.circle);
                        }
                        if (element.data.centerPoint) {
                            if (element.data.centerPoint.marker && this.app.map.hasLayer(element.data.centerPoint.marker)) {
                                this.app.map.removeLayer(element.data.centerPoint.marker);
                            }
                            if (element.data.centerPoint.label && this.app.map.hasLayer(element.data.centerPoint.label)) {
                                this.app.map.removeLayer(element.data.centerPoint.label);
                            }
                        }

                        // For lines: hide all polylines and segment labels
                        if (element.data.polylines && Array.isArray(element.data.polylines)) {
                            element.data.polylines.forEach(polyline => {
                                if (polyline && this.app.map.hasLayer(polyline)) {
                                    this.app.map.removeLayer(polyline);
                                }
                            });
                        }
                        if (element.data.segmentLabels && Array.isArray(element.data.segmentLabels)) {
                            element.data.segmentLabels.forEach(label => {
                                if (label && this.app.map.hasLayer(label)) {
                                    this.app.map.removeLayer(label);
                                }
                            });
                        }

                        // For polygons and lines: hide point markers and labels
                        if (element.data.pointData && Array.isArray(element.data.pointData)) {
                            element.data.pointData.forEach(pointData => {
                                if (pointData.marker && this.app.map.hasLayer(pointData.marker)) {
                                    this.app.map.removeLayer(pointData.marker);
                                }
                                if (pointData.label && this.app.map.hasLayer(pointData.label)) {
                                    this.app.map.removeLayer(pointData.label);
                                }
                            });
                        }

                        // For polygons: hide the polygon object
                        if (element.data.polygon && this.app.map.hasLayer(element.data.polygon)) {
                            this.app.map.removeLayer(element.data.polygon);
                        }

                        // MapEngine shapes (new format)
                        if (element.data.shapeId && this.app.engine) {
                            this.app.engine.setShapeVisibility(element.data.shapeId, false);
                        }
                        if (element.data.shapeIds && this.app.engine) {
                            element.data.shapeIds.forEach(id => this.app.engine.setShapeVisibility(id, false));
                        }
                        // Isochrone center marker
                        if (element.data.centerMarker && element.data.centerMarker._onMap) {
                            element.data.centerMarker.remove();
                        }
                    }
                }
            });

            this.save();
            this.updateUI();
        }
    }

    /**
     * Set current layer
     */
    setCurrentLayer(layerId) {
        if (this.getLayer(layerId)) {
            this.currentLayerId = layerId;
            this.save();
            this.updateUI();
        }
    }

    /**
     * Add element to layer
     */
    addElement(layerId, element) {
        const layer = this.getLayer(layerId);
        if (layer) {
            element.id = element.id || 'element_' + Date.now();
            element.layerId = layerId;
            // Initialize element visibility (default: visible)
            if (element.visible === undefined) {
                element.visible = true;
            }

            // Warn user when element count gets high (performance)
            const totalElements = this.layers.reduce((sum, l) => sum + l.elements.length, 0);
            if (totalElements === 500) {
                window.showToast && window.showToast(
                    i18n.t('performance_warning_500_elements') || '500 elements on map — performance may decrease',
                    'warning'
                );
            } else if (totalElements === 1000) {
                window.showToast && window.showToast(
                    i18n.t('performance_warning_1000_elements') || '1000 elements — consider removing unused layers for better performance',
                    'warning'
                );
            }

            layer.elements.push(element);
            this._elementIndex.set(String(element.id), { layer, element });

            // If layer is visible AND element is visible, add element to map immediately
            if (layer.visible && element.visible) {
                this.addElementToMap(element);
            }

            this.save();
            this.updateUI();
        }
    }

    /**
     * Remove element from layer
     */
    removeElement(elementId) {
        for (let layer of this.layers) {
            // Use == instead of === to allow type coercion (string vs number)
            const index = layer.elements.findIndex(e => e.id == elementId);
            if (index > -1) {
                const element = layer.elements[index];

                // Remove from map
                this.removeElementFromMap(element);

                // Also remove from app.data (points, lines, circles, etc.)
                if (this.app && this.app.data) {
                    const dataArrays = {
                        'point': this.app.data.points,
                        'line': this.app.data.lines,
                        'circle': this.app.data.circles,
                        'polygon': this.app.data.polygons,
                        'isochrone': this.app.data.isochrones
                    };

                    const dataArray = dataArrays[element.type];
                    if (dataArray && Array.isArray(dataArray)) {
                        // Use == for type coercion
                        const dataIndex = dataArray.findIndex(item => item.id == elementId);
                        if (dataIndex > -1) {
                            dataArray.splice(dataIndex, 1);

                            // Save app data
                            if (this.app.saveToLocalStorage) {
                                this.app.saveToLocalStorage();
                            }
                        }
                    }
                }

                // Remove from layer and index
                layer.elements.splice(index, 1);
                this._elementIndex.delete(String(elementId));
                this.save();
                this.updateUI();

                return true;
            }
        }
        console.warn('⚠️ Element not found in any layer:', elementId, 'Type:', typeof elementId);
        return false;
    }

    /**
     * Move element to another layer
     */
    moveElement(elementId, targetLayerId) {
        let element = null;
        let sourceLayer = null;

        // Find the element (use == for type coercion)
        for (let layer of this.layers) {
            const index = layer.elements.findIndex(e => e.id == elementId);
            if (index > -1) {
                element = layer.elements[index];
                sourceLayer = layer;
                layer.elements.splice(index, 1);
                break;
            }
        }

        if (element && sourceLayer) {
            const targetLayer = this.getLayer(targetLayerId);
            if (targetLayer) {
                element.layerId = targetLayerId;
                targetLayer.elements.push(element);

                // Update color to match target layer
                const color = targetLayer.color;

                // Update mapObject color
                if (element.mapObject) {
                    this._recolorShape(element.mapObject, color);
                    this._recolorMarker(element.mapObject, color);
                }

                element.color = color;
                if (element.data) element.data.color = color;

                if (element.type === 'point') {
                    this._recolorMarker(element.marker, color);
                    if (element.data) this._recolorMarker(element.data.marker, color);
                }

                if (element.type === 'circle' && element.data) {
                    this._recolorShape(element.data.circle || element.data.shapeId, color);
                    if (element.data.centerPoint) this._recolorMarker(element.data.centerPoint.marker, color);
                }

                if ((element.type === 'line' || element.type === 'polygon') && element.data && element.data.pointData) {
                    element.data.pointData.forEach(pd => this._recolorMarker(pd.marker, color));
                }

                // For lines: update polylines color
                if (element.type === 'line' && element.data) {
                    // New format: shapeIds
                    if (element.data.shapeIds) {
                        element.data.shapeIds.forEach(id => this._recolorShape(id, color));
                    }
                    // Old format: polylines
                    if (element.data.polylines) {
                        element.data.polylines.forEach(p => this._recolorShape(p, color));
                    }
                }

                if ((element.type === 'polygon' || element.type === 'isochrone') && element.data) {
                    this._recolorShape(element.data.polygon || element.data.shapeId, color);
                }

                // === UPDATE LABEL ===
                // Update label color when moving to different layer
                if (this.app.labelManager) {
                    // For simple elements (points, circles, polygons, isochrones)
                    if (element.type === 'point' || element.type === 'circle' || element.type === 'polygon' || element.type === 'isochrone') {
                        const labelId = `label_${element.type}_${element.id}`;
                        const elementData = element.data || element;
                        this.app.labelManager.updateLabelColor(labelId, color, elementData);
                    }

                    // For lines: update all segment labels
                    if (element.type === 'line' && element.data && element.data.segments) {
                        element.data.segments.forEach(segment => {
                            const labelId = `label_line-segment_${element.id}_${segment.id}`;
                            this.app.labelManager.updateLabelColor(labelId, color, segment);
                        });
                    }
                }

                // Remove from source cluster group if applicable
                if (this._shouldClusterElement(element) && sourceLayer.clusterGroup && element.mapObject) {
                    if (sourceLayer.clusterGroup.hasLayer(element.mapObject)) {
                        sourceLayer.clusterGroup.removeLayer(element.mapObject);
                    }
                }

                // Update element index to point to target layer
                this._elementIndex.set(String(element.id), { layer: targetLayer, element });

                // Add to target (cluster group or map) based on visibility
                if (element.mapObject) {
                    if (targetLayer.visible) {
                        if (this._shouldClusterElement(element)) {
                            const clusterGroup = this.getOrCreateClusterGroup(targetLayer);
                            if (clusterGroup && !clusterGroup.hasLayer(element.mapObject)) {
                                clusterGroup.addLayer(element.mapObject);
                            }
                        } else if (!this.app.map.hasLayer(element.mapObject)) {
                            this.app.map.addLayer(element.mapObject);
                        }
                    } else {
                        if (this.app.map.hasLayer(element.mapObject)) {
                            this.app.map.removeLayer(element.mapObject);
                        }
                    }
                }

                this.save();

                // Also save app.data to persist color changes
                if (this.app && this.app.saveToLocalStorage) {
                    this.app.saveToLocalStorage();
                }

                this.updateUI();
                return true;
            }
        }

        return false;
    }

    /**
     * Rename element
     */
    renameElement(elementId, newName) {
        for (let layer of this.layers) {
            const element = layer.elements.find(e => e.id == elementId);
            if (element) {
                // Update name in element
                element.name = newName;

                // Update name in element.data (for persistence)
                if (element.data) {
                    element.data.name = newName;
                }

                // === CIRCLES: Update centerPoint label ===
                if (element.type === 'circle' && element.data && element.data.centerPoint) {
                    // Update centerPoint name
                    element.data.centerPoint.name = newName;

                    // Update centerPoint label using LabelManager with color
                    const labelId = `label_point_${element.data.centerPoint.id}`;
                    const color = element.data.color || layer.color || '#f39c12';
                    if (window.app && window.app.labelManager) {
                        window.app.labelManager.updateLabelColor(labelId, color, element.data.centerPoint);
                    }

                    // Update circle popup
                    if (element.data.circle && element.data.circle.bindPopup) {
                        const radius = element.data.radius || 0;
                        const area = Math.PI * radius * radius;
                        element.data.circle.bindPopup(`
                            <strong>${newName}</strong><br>
                            Rayon: ${window.app ? window.app.formatDistance(radius) : radius + ' m'}<br>
                            Superficie: ${window.app ? window.app.formatArea(area) : area + ' m²'}
                        `);
                    }
                }

                // === POLYGONS: Update label with area ===
                if (element.type === 'polygon' && element.data) {
                    // Update polygon label using LabelManager with color
                    const labelId = `label_polygon_${element.data.id}`;
                    const color = element.data.color || layer.color || '#9b59b6';
                    if (window.app && window.app.labelManager) {
                        window.app.labelManager.updateLabelColor(labelId, color, element.data);
                    }

                    // Update polygon popup
                    if (element.data.polygon && element.data.polygon.bindPopup) {
                        const points = element.data.points ? element.data.points.length : 0;
                        const area = element.data.area || 0;
                        const perimeter = element.data.perimeter || 0;
                        element.data.polygon.bindPopup(`
                            <strong>${newName}</strong><br>
                            Points: ${points}<br>
                            Aire: ${window.app ? window.app.formatArea(area) : area + ' m²'}<br>
                            Périmètre: ${window.app ? window.app.formatDistance(perimeter) : perimeter + ' m'}
                        `);
                    }
                }

                // === POINTS: Update label ===
                if (element.type === 'point' && element.data) {
                    const labelId = `label_point_${element.data.id}`;
                    const color = element.data.color || layer.color || '#e74c3c';
                    if (window.app && window.app.labelManager) {
                        window.app.labelManager.updateLabelColor(labelId, color, element.data);
                    }
                }

                // === OVERPASS: Update label ===
                if (element.type === 'overpass' && element.data) {
                    const labelId = `label_overpass_${element.data.id || element.id}`;
                    const color = layer.color || '#3498db';
                    if (window.app && window.app.labelManager) {
                        window.app.labelManager.updateLabelColor(labelId, color, element.data);
                    }
                }

                // === ISOCHRONES: Update label ===
                if (element.type === 'isochrone') {
                    // Update using LabelManager with color
                    const labelId = `label_isochrone_${element.id || element.data?.id}`;
                    const color = element.color || element.data?.color || layer.color || '#3388ff';
                    const dataToUpdate = element.data || element;
                    if (window.app && window.app.labelManager) {
                        window.app.labelManager.updateLabelColor(labelId, color, dataToUpdate);
                    }
                    // Update polygon popup
                    if (element.data && element.data.polygon && element.data.polygon.getPopup) {
                        const popup = element.data.polygon.getPopup();
                        if (popup) {
                            const oldContent = popup.getContent();
                            const updatedContent = oldContent.replace(/<strong>.*?<\/strong>/, `<strong>${newName}</strong>`);
                            popup.setContent(updatedContent);
                        }
                    }
                    // Update mapObject popup
                    if (element.mapObject && element.mapObject.getPopup) {
                        const popup = element.mapObject.getPopup();
                        if (popup) {
                            const oldContent = popup.getContent();
                            const updatedContent = oldContent.replace(/<strong>.*?<\/strong>/, `<strong>${newName}</strong>`);
                            popup.setContent(updatedContent);
                        }
                    }
                }

                // === GENERIC: Update any other label ===
                if (element.label && element.label.setContent && element.type !== 'isochrone') {
                    element.label.setContent(newName);
                }

                // === GENERIC: Update marker popup ===
                if (element.marker && element.marker.getPopup) {
                    const popup = element.marker.getPopup();
                    if (popup) {
                        const content = popup.getContent();
                        if (typeof content === 'string') {
                            const lines = content.split('<br>');
                            lines[0] = `<strong>${newName}</strong>`;
                            popup.setContent(lines.join('<br>'));
                        }
                    }
                }

                // Also sync to app.data for circles and polygons
                if (window.app && window.app.data) {
                    if (element.type === 'circle') {
                        const circle = window.app.data.circles.find(c => c.id == elementId);
                        if (circle) circle.name = newName;
                    } else if (element.type === 'polygon') {
                        const polygon = window.app.data.polygons.find(p => p.id == elementId);
                        if (polygon) polygon.name = newName;
                    }
                }

                this.save();
                this.updateUI();
                return true;
            }
        }
        return false;
    }

    /**
     * Remove element from map
     */
    /**
     * Add element to map (called when adding element to visible layer)
     */
    addElementToMap(element) {
        // Determine if this element should go into a cluster group
        const shouldCluster = this._shouldClusterElement(element);
        const layer = this._getLayerForElement(element);

        if (shouldCluster && layer && element.mapObject) {
            const clusterGroup = this.getOrCreateClusterGroup(layer);
            if (clusterGroup && !clusterGroup.hasLayer(element.mapObject)) {
                clusterGroup.addLayer(element.mapObject);
            }
        } else if (element.mapObject && !this.app.map.hasLayer(element.mapObject)) {
            // Add directly to map for non-clustered elements
            this.app.map.addLayer(element.mapObject);
        }

        // Add circle object
        if (element.circleObject && !this.app.map.hasLayer(element.circleObject)) {
            this.app.map.addLayer(element.circleObject);
        }

        // Add marker
        if (element.marker && !this.app.map.hasLayer(element.marker)) {
            this.app.map.addLayer(element.marker);
        }

        // Add label
        if (element.label && !this.app.map.hasLayer(element.label)) {
            this.app.map.addLayer(element.label);
        }

        // For elements with data object
        if (element.data) {
            // Add marker and label from data
            if (element.data.marker && !this.app.map.hasLayer(element.data.marker)) {
                this.app.map.addLayer(element.data.marker);
            }
            if (element.data.label && !this.app.map.hasLayer(element.data.label)) {
                this.app.map.addLayer(element.data.label);
            }

            // For circles: add circle and center point
            if (element.data.circle && !this.app.map.hasLayer(element.data.circle)) {
                this.app.map.addLayer(element.data.circle);
            }
            if (element.data.centerPoint) {
                // Always show marker (helper points need to be draggable)
                if (element.data.centerPoint.marker && !this.app.map.hasLayer(element.data.centerPoint.marker)) {
                    this.app.map.addLayer(element.data.centerPoint.marker);
                }
                // Show label based on showName state (helper points hidden by default unless explicitly shown)
                const showName = (element.data.showName !== undefined) ? element.data.showName : (element.showName !== undefined) ? element.showName : !element.data.centerPoint.isHelperPoint;
                if (showName && element.data.centerPoint.label && !this.app.map.hasLayer(element.data.centerPoint.label)) {
                    this.app.map.addLayer(element.data.centerPoint.label);
                }
            }

            // For lines: add all polylines and segment labels
            if (element.data.polylines && Array.isArray(element.data.polylines)) {
                element.data.polylines.forEach(polyline => {
                    if (polyline && !this.app.map.hasLayer(polyline)) {
                        this.app.map.addLayer(polyline);
                    }
                });
            }
            if (element.data.segmentLabels && Array.isArray(element.data.segmentLabels)) {
                element.data.segmentLabels.forEach(label => {
                    if (label && !this.app.map.hasLayer(label)) {
                        this.app.map.addLayer(label);
                    }
                });
            }

            // For polygons and lines: add point markers and labels
            if (element.data.pointData && Array.isArray(element.data.pointData)) {
                element.data.pointData.forEach(pointData => {
                    // Always show marker (helper points need to be draggable)
                    if (pointData.marker && !this.app.map.hasLayer(pointData.marker)) {
                        this.app.map.addLayer(pointData.marker);
                    }
                    // Show label based on showName state (helper points hidden by default unless explicitly shown)
                    const showName = (element.data.showName !== undefined) ? element.data.showName : (element.showName !== undefined) ? element.showName : !pointData.isHelperPoint;
                    if (showName && pointData.label && !this.app.map.hasLayer(pointData.label)) {
                        this.app.map.addLayer(pointData.label);
                    }
                });
            }

            // For polygons: add the polygon object
            if (element.data.polygon && !this.app.map.hasLayer(element.data.polygon)) {
                this.app.map.addLayer(element.data.polygon);
            }
        }
    }

    removeElementFromMap(element) {
        // Remove main mapObject (from cluster group or map)
        const shouldCluster = this._shouldClusterElement(element);
        const layer = this._getLayerForElement(element);

        if (shouldCluster && layer && layer.clusterGroup && element.mapObject) {
            if (layer.clusterGroup.hasLayer(element.mapObject)) {
                layer.clusterGroup.removeLayer(element.mapObject);
            }
        } else if (element.mapObject) {
            if (this.app.map.hasLayer(element.mapObject)) {
                this.app.map.removeLayer(element.mapObject);
            }
        }

        // Remove circle object
        if (element.circleObject && this.app.map.hasLayer(element.circleObject)) {
            this.app.map.removeLayer(element.circleObject);
        }

        // Remove marker
        if (element.marker && this.app.map.hasLayer(element.marker)) {
            this.app.map.removeLayer(element.marker);
        }

        // Remove label
        if (element.label && this.app.map.hasLayer(element.label)) {
            this.app.map.removeLayer(element.label);
        }

        // For elements with data object, remove all Leaflet objects from there too
        if (element.data) {
            // Remove marker and label from data
            if (element.data.marker && this.app.map.hasLayer(element.data.marker)) {
                this.app.map.removeLayer(element.data.marker);
            }
            if (element.data.label && this.app.map.hasLayer(element.data.label)) {
                this.app.map.removeLayer(element.data.label);
            }

            // For circles: remove circle and center point
            if (element.data.circle && this.app.map.hasLayer(element.data.circle)) {
                this.app.map.removeLayer(element.data.circle);
            }
            if (element.data.centerPoint) {
                if (element.data.centerPoint.marker && this.app.map.hasLayer(element.data.centerPoint.marker)) {
                    this.app.map.removeLayer(element.data.centerPoint.marker);
                }
                if (element.data.centerPoint.label && this.app.map.hasLayer(element.data.centerPoint.label)) {
                    this.app.map.removeLayer(element.data.centerPoint.label);
                }
            }

            // For lines: remove all polylines and segment labels
            if (element.data.polylines && Array.isArray(element.data.polylines)) {
                element.data.polylines.forEach(polyline => {
                    if (polyline && this.app.map.hasLayer(polyline)) {
                        this.app.map.removeLayer(polyline);
                    }
                });
            }
            if (element.data.segmentLabels && Array.isArray(element.data.segmentLabels)) {
                element.data.segmentLabels.forEach(label => {
                    if (label && this.app.map.hasLayer(label)) {
                        this.app.map.removeLayer(label);
                    }
                });
            }

            // For polygons and lines: remove point markers and labels
            if (element.data.pointData && Array.isArray(element.data.pointData)) {
                element.data.pointData.forEach(pointData => {
                    if (pointData.marker && this.app.map.hasLayer(pointData.marker)) {
                        this.app.map.removeLayer(pointData.marker);
                    }
                    if (pointData.label && this.app.map.hasLayer(pointData.label)) {
                        this.app.map.removeLayer(pointData.label);
                    }
                });
            }

            // For polygons: remove the polygon object
            if (element.data.polygon && this.app.map.hasLayer(element.data.polygon)) {
                this.app.map.removeLayer(element.data.polygon);
            }
        }
    }

    /**
     * Get all elements across all layers
     */
    getAllElements() {
        const allElements = [];
        this.layers.forEach(layer => {
            layer.elements.forEach(element => {
                allElements.push({
                    ...element,
                    layerName: layer.name
                });
            });
        });
        return allElements;
    }

    /**
     * Extract serializable data from an element
     */
    extractElementData(element) {
        // Extract only serializable data, avoiding Leaflet objects
        const serializableData = {
            id: element.id,
            type: element.type,
            name: element.name,
            properties: element.properties || {}
        };

        // Try to extract from element.data first, then fallback to element itself
        const data = element.data || element;

        // For points
        if (data.latlng) {
            serializableData.latlng = {
                lat: data.latlng.lat,
                lng: data.latlng.lng
            };
            // Save icon type and name for points
            if (data.iconType) {
                serializableData.iconType = data.iconType;
            }
            if (data.iconName) {
                serializableData.iconName = data.iconName;
            }
        }

        // For lines
        if (data.points && Array.isArray(data.points)) {
            serializableData.points = data.points.map(p => ({
                lat: p.lat,
                lng: p.lng
            }));
        }

        // For circles
        if (data.center) {
            serializableData.center = {
                lat: data.center.lat,
                lng: data.center.lng
            };
            serializableData.radius = data.radius;
        }

        // For polygons
        if (data.polygon && Array.isArray(data.polygon)) {
            serializableData.polygon = data.polygon.map(p => ({
                lat: p.lat,
                lng: p.lng
            }));
        }

        // For polygons - alternative structure (points array)
        if (data.points && element.type === 'polygon') {
            serializableData.polygon = data.points.map(p => ({
                lat: p.lat,
                lng: p.lng
            }));
        }

        // For isochrones
        if (element.type === 'isochrone') {
            // Support both centerPoint and center properties
            const centerPoint = data.centerPoint || data.center;
            if (centerPoint) {
                serializableData.centerPoint = {
                    lat: centerPoint.lat,
                    lng: centerPoint.lng
                };
            } else {
                console.warn('⚠️ No centerPoint found in isochrone data:', {
                    hasCenterPoint: !!data.centerPoint,
                    hasCenter: !!data.center
                });
            }

            // Extract polygon coordinates
            if (data.coordinates && Array.isArray(data.coordinates)) {
                // New format: coordinates already stored as array of {lat, lng}
                serializableData.coordinates = data.coordinates.map(c => ({
                    lat: c.lat, lng: c.lng
                }));
            } else if (data.polygon && typeof data.polygon.getLatLngs === 'function') {
                // Old Leaflet format: extract from Leaflet polygon object
                const coords = data.polygon.getLatLngs()[0];
                serializableData.coordinates = coords.map(c => ({ lat: c.lat, lng: c.lng }));
            }

            // Copy isochrone properties
            serializableData.mode = data.mode;
            serializableData.calcMode = data.calcMode;
            serializableData.cost = data.cost;
            serializableData.timeUnit = data.timeUnit;
            serializableData.direction = data.direction;
        }

        // For Overpass elements
        if (element.type === 'overpass' && element.data) {
            // Store OSM element data WITHOUT Leaflet objects (marker, label)
            const { marker, label, ...cleanData } = element.data;
            serializableData.data = cleanData;
            // Preserve showName and showIcon flags
            if (element.data.showName !== undefined) serializableData.showName = element.data.showName;
            if (element.data.showIcon !== undefined) serializableData.showIcon = element.data.showIcon;
        }

        // For Image Analysis zones
        if (element.type === 'image_analysis_zone' && element.data) {
            // Store zone data WITHOUT Leaflet objects (polygon, markers)
            const { polygon, markers, ...cleanData } = element.data;
            serializableData.data = cleanData;
        }

        // Copy other simple properties
        if (data.color) serializableData.color = data.color;
        if (data.area) serializableData.area = data.area;
        if (data.perimeter) serializableData.perimeter = data.perimeter;
        if (data.distance) serializableData.distance = data.distance;
        if (data.totalDistance) serializableData.totalDistance = data.totalDistance;
        if (data.segments) serializableData.segments = data.segments;

        // Copy visibility preferences (with fallback to element level)
        serializableData.showName = element.showName !== undefined ? element.showName : (data.showName !== undefined ? data.showName : true);
        serializableData.showIcon = element.showIcon !== undefined ? element.showIcon : (data.showIcon !== undefined ? data.showIcon : true);
        // Copy element visibility state (default: true)
        serializableData.visible = element.visible !== undefined ? element.visible : true;

        return serializableData;
    }

    /**
     * Export layers structure
     */
    exportData() {
        // Extract Overpass queries summary for better readability
        const overpassQueries = [];
        this.layers.forEach(layer => {
            const overpassElements = layer.elements.filter(el => el.type === 'overpass');
            if (overpassElements.length > 0) {
                // Get the query from the first element (all elements in a layer share the same query)
                const firstElement = overpassElements[0];
                const query = firstElement.data?.query || '';

                overpassQueries.push({
                    layerId: layer.id,
                    layerName: layer.name,
                    layerColor: layer.color,
                    query: query,
                    elementCount: overpassElements.length,
                    items: firstElement.data?.items || [],
                    created: layer.created
                });
            }
        });

        return {
            layers: this.layers.map(layer => ({
                id: layer.id,
                name: layer.name,
                visible: layer.visible,
                locked: layer.locked,
                color: layer.color,  // ✅ Export layer color
                created: layer.created,
                elements: layer.elements.map(element => this.extractElementData(element))
            })),
            currentLayerId: this.currentLayerId,
            overpassQueries: overpassQueries  // ✅ Summary of Overpass queries
        };
    }

    /**
     * Import layers structure
     */
    importData(data) {
        if (data.layers) {
            this.layers = data.layers;
            this.currentLayerId = data.currentLayerId || this.layers[0]?.id;

            // Rebuild element index and reset cluster groups
            this._elementIndex.clear();
            for (const layer of this.layers) {
                layer.clusterGroup = null;
                for (const element of layer.elements) {
                    this._elementIndex.set(String(element.id), { layer, element });
                }
            }

            // Overpass queries are now part of layer elements
            // Restore happens via restoreOverpassQueries() called from map initialization

            // Don't save here - data is already saved in localStorage and doesn't have Leaflet objects
            // this.save();
            this.updateUI();
        }
    }

    /**
     * Save to localStorage (debounced — batches rapid calls into one write)
     */
    save() {
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            this._saveImmediate();
            this._saveTimer = null;
        }, 500);
    }

    /**
     * Immediate save to localStorage (used by debounce and beforeunload)
     */
    _saveImmediate() {
        try {
            const data = this.exportData();
            const json = JSON.stringify(data);
            localStorage.setItem('rhinomap_layers', json);
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.error('localStorage quota exceeded! Data size:', JSON.stringify(this.exportData()).length);
                window.showError && window.showError(
                    i18n.t('storage_quota_exceeded') || 'Storage full — export your data and remove unused layers'
                );
            } else {
                console.error('Failed to save layers:', e);
            }
        }
    }

    /**
     * Load from localStorage
     */
    load() {
        try {
            const data = localStorage.getItem('rhinomap_layers');
            if (data) {
                this.importData(JSON.parse(data));
                return true;
            }
        } catch (e) {
            console.error('Failed to load layers:', e);
        }
        return false;
    }

    /**
     * Update UI (to be called from UI code)
     */
    updateUI() {
        if (window.updateLayersUI) {
            window.updateLayersUI();
        }
    }
}

// Make it globally available
window.LayersManager = LayersManager;
