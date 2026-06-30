/**
 * MapEngine - Abstraction over MapLibre GL JS for RhinoMap
 * Isolates all MapLibre specifics so tools and managers never touch maplibregl directly
 */

// ============================================================
// MapMarker - Wrapper around maplibregl.Marker
// ============================================================

class MapMarker {
    constructor(mlMarker, engine) {
        this._marker = mlMarker;
        this._engine = engine;
        this._onMap = false;
        this._events = {};
        this._labelEl = null; // DOM element for bound label
    }

    getLatLng() {
        const ll = this._marker.getLngLat();
        return { lat: ll.lat, lng: ll.lng };
    }

    setLatLng(latlng) {
        this._marker.setLngLat([latlng.lng, latlng.lat]);
        return this;
    }

    setDraggable(draggable) {
        this._marker.setDraggable(draggable);
        return this;
    }

    getElement() {
        return this._marker.getElement();
    }

    addTo(engine) {
        if (this._onMap) return this;
        const map = engine._map || engine;
        this._marker.addTo(map);
        this._onMap = true;
        return this;
    }

    remove() {
        if (!this._onMap) return this;
        // Clean up all event listeners to prevent memory leaks
        if (typeof this.removeAllListeners === 'function') this.removeAllListeners();
        this._marker.remove();
        this._onMap = false;
        return this;
    }

    isOnMap() {
        return this._onMap;
    }

    // Popup
    setPopup(popup) {
        this._marker.setPopup(popup);
        return this;
    }

    getPopup() {
        return this._marker.getPopup();
    }

    togglePopup() {
        this._marker.togglePopup();
        return this;
    }

    // Bound label (DOM child of marker element)
    setLabel(htmlContent, options = {}) {
        const el = this.getElement();
        if (!el) return this;

        if (!this._labelEl) {
            this._labelEl = document.createElement('div');
            this._labelEl.className = 'rhinomap-label';
            el.appendChild(this._labelEl);
        }

        this._labelEl.innerHTML = htmlContent;

        if (options.className) {
            this._labelEl.className = `rhinomap-label ${options.className}`;
        }
        if (options.offset) {
            this._labelEl.style.transform = `translate(${options.offset[0]}px, ${options.offset[1]}px)`;
        }
        if (options.visible === false) {
            this._labelEl.style.display = 'none';
        }

        return this;
    }

    showLabel() {
        if (this._labelEl) this._labelEl.style.display = '';
        return this;
    }

    hideLabel() {
        if (this._labelEl) this._labelEl.style.display = 'none';
        return this;
    }

    removeLabel() {
        if (this._labelEl) {
            this._labelEl.remove();
            this._labelEl = null;
        }
        return this;
    }

    hasLabel() {
        return !!this._labelEl;
    }

    getLabelElement() {
        return this._labelEl;
    }

    // Event handling — tracks bindings for proper cleanup
    on(event, handler) {
        if (!this._events[event]) this._events[event] = [];
        if (!this._bindings) this._bindings = []; // {event, handler, type: 'ml'|'dom', wrapped}

        this._events[event].push(handler);

        // Native maplibregl.Marker events
        if (event === 'dragstart' || event === 'drag' || event === 'dragend') {
            const wrapped = () => handler({ target: this, latlng: this.getLatLng() });
            this._marker.on(event, wrapped);
            this._bindings.push({ event, handler, type: 'ml', wrapped });
        }
        // DOM events on the marker element
        else if (event === 'click' || event === 'dblclick' || event === 'contextmenu') {
            const el = this.getElement();
            if (el) {
                const wrapped = (e) => {
                    if (event === 'contextmenu') e.preventDefault();
                    if (event === 'dblclick') { e.preventDefault(); e.stopPropagation(); }
                    handler({ target: this, latlng: this.getLatLng(), originalEvent: e });
                };
                el.addEventListener(event, wrapped);
                this._bindings.push({ event, handler, type: 'dom', wrapped });
            }
        }

        return this;
    }

    off(event, handler) {
        if (!this._bindings) return this;
        const el = this.getElement();
        const remaining = [];
        for (const b of this._bindings) {
            const matches = b.event === event && (handler == null || b.handler === handler);
            if (matches) {
                if (b.type === 'ml') this._marker.off(b.event, b.wrapped);
                else if (b.type === 'dom' && el) el.removeEventListener(b.event, b.wrapped);
            } else {
                remaining.push(b);
            }
        }
        this._bindings = remaining;
        if (this._events[event]) {
            this._events[event] = handler == null ? [] : this._events[event].filter(h => h !== handler);
        }
        return this;
    }

    // Remove all listeners — call before discarding the marker
    removeAllListeners() {
        if (!this._bindings) return this;
        const el = this.getElement();
        for (const b of this._bindings) {
            if (b.type === 'ml') this._marker.off(b.event, b.wrapped);
            else if (b.type === 'dom' && el) el.removeEventListener(b.event, b.wrapped);
        }
        this._bindings = [];
        this._events = {};
        return this;
    }
}

// ============================================================
// MapEngine - Main class wrapping maplibregl.Map
// ============================================================

class MapEngine {
    /**
     * @param {string} containerId - DOM element ID for the map
     * @param {object} options - {center: {lat, lng}, zoom, style}
     */
    constructor(containerId, options = {}) {
        const center = options.center || { lat: 46.603354, lng: 1.888334 };
        const zoom = options.zoom || 5;
        const style = options.style || 'https://tiles.openfreemap.org/styles/liberty';

        this._map = new maplibregl.Map({
            container: containerId,
            style: style,
            center: [center.lng, center.lat],
            zoom: zoom,
            attributionControl: true,
            renderWorldCopies: false
        });

        this._map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

        // Shape tracking: id → { sourceId, layerIds[], type }
        this._shapes = new Map();
        this._shapeCounter = 0;

        // Satellite layer state
        this._satelliteActive = false;

        // Suppress missing image warnings from the vector tile style
        this._map.on('styleimagemissing', (e) => {
            if (!this._map.hasImage(e.id)) {
                // Create a tiny transparent placeholder
                this._map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
            }
        });
    }

    // ---- View ----

    setView(center, zoom) {
        this._map.flyTo({
            center: [center.lng, center.lat],
            zoom: zoom
        });
    }

    jumpTo(center, zoom) {
        this._map.jumpTo({
            center: [center.lng, center.lat],
            zoom: zoom
        });
    }

    fitBounds(bounds, options = {}) {
        // bounds: [[south, west], [north, east]] in {lat, lng} format
        // or maplibregl.LngLatBounds
        if (bounds.sw && bounds.ne) {
            this._map.fitBounds(
                [[bounds.sw.lng, bounds.sw.lat], [bounds.ne.lng, bounds.ne.lat]],
                { padding: options.padding || 50 }
            );
        } else if (bounds instanceof maplibregl.LngLatBounds) {
            this._map.fitBounds(bounds, { padding: options.padding || 50 });
        }
    }

    /**
     * Fit bounds from an array of {lat, lng} points
     */
    fitBoundsFromPoints(points, padding = 50) {
        if (!points || points.length === 0) return;
        const bounds = new maplibregl.LngLatBounds();
        points.forEach(p => bounds.extend([p.lng, p.lat]));
        this._map.fitBounds(bounds, { padding });
    }

    getCenter() {
        const c = this._map.getCenter();
        return { lat: c.lat, lng: c.lng };
    }

    getZoom() {
        return this._map.getZoom();
    }

    // ---- Markers ----

    /**
     * Create a marker on the map
     * @param {{lat: number, lng: number}} latlng
     * @param {object} options - { element, draggable, color, className }
     * @returns {MapMarker}
     */
    createMarker(latlng, options = {}) {
        const markerOpts = {
            draggable: options.draggable || false
        };

        // Custom DOM element
        if (options.element) {
            markerOpts.element = options.element;
            // Default anchor: top-left. We want center, so no anchor needed
            // — MapLibre's default anchor is 'center' for custom elements
        }

        if (options.offset) {
            markerOpts.offset = options.offset;
        }

        const mlMarker = new maplibregl.Marker(markerOpts);
        mlMarker.setLngLat([latlng.lng, latlng.lat]);

        return new MapMarker(mlMarker, this);
    }

    /**
     * Create a standard popup
     * @param {{lat: number, lng: number}} latlng
     * @param {string} html
     * @returns {maplibregl.Popup}
     */
    createPopup(latlng, html, options = {}) {
        const popup = new maplibregl.Popup({
            closeButton: options.closeButton !== false,
            maxWidth: options.maxWidth || '300px',
            offset: options.offset || [0, -10]
        });
        popup.setLngLat([latlng.lng, latlng.lat]);
        popup.setHTML(html);
        return popup;
    }

    // ---- Shapes (GeoJSON source + layer) ----

    _nextShapeId(prefix) {
        return `${prefix}-${++this._shapeCounter}`;
    }

    /**
     * Add a polyline to the map
     * @param {string|null} id - Shape ID (auto-generated if null)
     * @param {{lat: number, lng: number}[]} coords
     * @param {object} style - { color, weight, opacity, dashArray }
     * @returns {string} Shape ID
     */
    addPolyline(id, coords, style = {}) {
        id = id || this._nextShapeId('line');
        const sourceId = `${id}-src`;
        const layerId = `${id}-layer`;

        const geojson = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: coords.map(c => [c.lng, c.lat])
            }
        };

        this._map.addSource(sourceId, { type: 'geojson', data: geojson });
        this._map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': style.color || '#3498db',
                'line-width': style.weight || 3,
                'line-opacity': style.opacity !== undefined ? style.opacity : 1,
                ...(style.dashArray ? { 'line-dasharray': style.dashArray } : {})
            }
        });

        this._shapes.set(id, { sourceId, layerIds: [layerId], type: 'polyline', geojson });
        return id;
    }

    /**
     * Update polyline coordinates
     */
    updatePolyline(id, coords) {
        const shape = this._shapes.get(id);
        if (!shape) return;
        shape.geojson.geometry.coordinates = coords.map(c => [c.lng, c.lat]);
        const src = this._map.getSource(shape.sourceId);
        if (src) src.setData(shape.geojson);
    }

    /**
     * Add a polygon to the map
     * @param {string|null} id
     * @param {{lat: number, lng: number}[]} coords
     * @param {object} style - { color, fillColor, fillOpacity, weight, opacity, dashArray }
     * @returns {string} Shape ID
     */
    addPolygon(id, coords, style = {}) {
        id = id || this._nextShapeId('poly');
        const sourceId = `${id}-src`;
        const fillLayerId = `${id}-fill`;
        const outlineLayerId = `${id}-outline`;

        // Close the ring
        const ring = coords.map(c => [c.lng, c.lat]);
        if (ring.length > 0) {
            const first = ring[0], last = ring[ring.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
        }

        const geojson = {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [ring] }
        };

        this._map.addSource(sourceId, { type: 'geojson', data: geojson });
        this._map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            paint: {
                'fill-color': style.fillColor || style.color || '#3498db',
                'fill-opacity': style.fillOpacity !== undefined ? style.fillOpacity : 0.2
            }
        });
        this._map.addLayer({
            id: outlineLayerId,
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': style.color || '#3498db',
                'line-width': style.weight || 2,
                'line-opacity': style.opacity !== undefined ? style.opacity : 1,
                ...(style.dashArray ? { 'line-dasharray': style.dashArray } : {})
            }
        });

        this._shapes.set(id, { sourceId, layerIds: [fillLayerId, outlineLayerId], type: 'polygon', geojson });
        return id;
    }

    /**
     * Update polygon coordinates
     */
    updatePolygon(id, coords) {
        const shape = this._shapes.get(id);
        if (!shape) return;
        const ring = coords.map(c => [c.lng, c.lat]);
        if (ring.length > 0) {
            const first = ring[0], last = ring[ring.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
        }
        shape.geojson.geometry.coordinates = [ring];
        const src = this._map.getSource(shape.sourceId);
        if (src) src.setData(shape.geojson);
    }

    /**
     * Add a circle (as polygon approximation)
     * @param {string|null} id
     * @param {{lat: number, lng: number}} center
     * @param {number} radius - In meters
     * @param {object} style
     * @returns {string} Shape ID
     */
    addCirclePolygon(id, center, radius, style = {}) {
        const points = GeoUtils.circleToPolygon(center, radius);
        return this.addPolygon(id || this._nextShapeId('circle'), points, style);
    }

    /**
     * Update circle center and/or radius
     */
    updateCirclePolygon(id, center, radius) {
        const points = GeoUtils.circleToPolygon(center, radius);
        this.updatePolygon(id, points);
    }

    /**
     * Remove a shape from the map
     */
    removeShape(id) {
        const shape = this._shapes.get(id);
        if (!shape) return;

        shape.layerIds.forEach(layerId => {
            if (this._map.getLayer(layerId)) this._map.removeLayer(layerId);
        });
        if (this._map.getSource(shape.sourceId)) {
            this._map.removeSource(shape.sourceId);
        }

        this._shapes.delete(id);
    }

    /**
     * Set shape style properties
     */
    setShapeStyle(id, style) {
        const shape = this._shapes.get(id);
        if (!shape) return;

        shape.layerIds.forEach(layerId => {
            const layer = this._map.getLayer(layerId);
            if (!layer) return;

            if (layer.type === 'fill') {
                if (style.fillColor || style.color) {
                    this._map.setPaintProperty(layerId, 'fill-color', style.fillColor || style.color);
                }
                if (style.fillOpacity !== undefined) {
                    this._map.setPaintProperty(layerId, 'fill-opacity', style.fillOpacity);
                }
            } else if (layer.type === 'line') {
                if (style.color) this._map.setPaintProperty(layerId, 'line-color', style.color);
                if (style.weight) this._map.setPaintProperty(layerId, 'line-width', style.weight);
                if (style.opacity !== undefined) this._map.setPaintProperty(layerId, 'line-opacity', style.opacity);
            }
        });
    }

    /**
     * Show/hide a shape
     */
    setShapeVisibility(id, visible) {
        const shape = this._shapes.get(id);
        if (!shape) return;
        const visibility = visible ? 'visible' : 'none';
        shape.layerIds.forEach(layerId => {
            if (this._map.getLayer(layerId)) {
                this._map.setLayoutProperty(layerId, 'visibility', visibility);
            }
        });
    }

    /**
     * Check if a shape exists
     */
    hasShape(id) {
        return this._shapes.has(id);
    }

    // ---- Events ----

    /**
     * Add event listener with {lat, lng} translation
     * @param {string} event - click, mousemove, contextmenu, dblclick, zoom, move, load
     * @param {function} handler - Receives {latlng: {lat, lng}, originalEvent, point}
     */
    on(event, handler) {
        this._map.on(event, (e) => {
            if (e.lngLat) {
                handler({
                    latlng: { lat: e.lngLat.lat, lng: e.lngLat.lng },
                    originalEvent: e.originalEvent,
                    point: e.point
                });
            } else {
                handler(e);
            }
        });
    }

    off(event, handler) {
        this._map.off(event, handler);
    }

    // ---- Shape events ----

    /**
     * Add click handler on a shape layer
     */
    onShapeClick(shapeId, handler) {
        const shape = this._shapes.get(shapeId);
        if (!shape) return;
        shape.layerIds.forEach(layerId => {
            this._map.on('click', layerId, (e) => {
                handler({
                    latlng: { lat: e.lngLat.lat, lng: e.lngLat.lng },
                    originalEvent: e.originalEvent,
                    shapeId
                });
            });
        });
    }

    onShapeContextMenu(shapeId, handler) {
        const shape = this._shapes.get(shapeId);
        if (!shape) return;
        shape.layerIds.forEach(layerId => {
            this._map.on('contextmenu', layerId, (e) => {
                handler({
                    latlng: { lat: e.lngLat.lat, lng: e.lngLat.lng },
                    originalEvent: e.originalEvent,
                    shapeId
                });
            });
        });
    }

    // ---- Tile layers / style ----

    /**
     * Switch to satellite raster tiles
     */
    enableSatellite() {
        if (this._satelliteActive) return;
        if (!this._map.getSource('satellite-tiles')) {
            this._map.addSource('satellite-tiles', {
                type: 'raster',
                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                tileSize: 256,
                attribution: '&copy; Esri'
            });
        }
        if (!this._map.getLayer('satellite-layer')) {
            this._map.addLayer({
                id: 'satellite-layer',
                type: 'raster',
                source: 'satellite-tiles',
                paint: { 'raster-opacity': 1 }
            }, this._getFirstUserLayerId());
        }
        this._setBasemapVisibility(false);
        this._satelliteActive = true;
    }

    /**
     * Switch back to vector tiles
     */
    disableSatellite() {
        if (!this._satelliteActive) return;
        if (this._map.getLayer('satellite-layer')) this._map.removeLayer('satellite-layer');
        if (this._map.getSource('satellite-tiles')) this._map.removeSource('satellite-tiles');
        this._setBasemapVisibility(true);
        this._satelliteActive = false;
    }

    _getFirstUserLayerId() {
        const style = this._map.getStyle();
        if (!style || !style.layers) return undefined;
        const first = style.layers.find(l => l.id.startsWith('line-') || l.id.startsWith('poly-') || l.id.startsWith('circle-'));
        return first ? first.id : undefined;
    }

    _setBasemapVisibility(visible) {
        const style = this._map.getStyle();
        if (!style || !style.layers) return;
        style.layers.forEach(layer => {
            if (layer.id === 'satellite-layer') return;
            if (this._shapes.has(layer.id.replace(/-(?:src|fill|outline|layer)$/, ''))) return;
            try {
                this._map.setLayoutProperty(layer.id, 'visibility', visible ? 'visible' : 'none');
            } catch (e) { /* some layers don't support visibility */ }
        });
    }

    // ---- 3D buildings ----

    enable3D() {
        if (this._3dActive) return;
        this._3dActive = true;
        this._map.easeTo({ pitch: 45 });

        // Add 3D building extrusion layer if the style has a 'building' source
        const tryAdd3D = () => {
            if (this._map.getLayer('3d-buildings')) return;
            // Find building layer in style
            const layers = this._map.getStyle().layers;
            const buildingLayer = layers.find(l => l.id.includes('building') && l.type === 'fill');
            if (buildingLayer) {
                this._map.addLayer({
                    id: '3d-buildings',
                    source: buildingLayer.source,
                    'source-layer': buildingLayer['source-layer'],
                    type: 'fill-extrusion',
                    minzoom: 14,
                    paint: {
                        'fill-extrusion-color': '#ddd',
                        'fill-extrusion-height': ['get', 'render_height'],
                        'fill-extrusion-base': ['get', 'render_min_height'],
                        'fill-extrusion-opacity': 0.7
                    }
                });
            }
        };

        if (this._map.isStyleLoaded()) {
            tryAdd3D();
        } else {
            this._map.once('styledata', tryAdd3D);
        }
    }

    disable3D() {
        if (!this._3dActive) return;
        this._3dActive = false;
        this._map.easeTo({ pitch: 0 });
        if (this._map.getLayer('3d-buildings')) {
            this._map.removeLayer('3d-buildings');
        }
    }

    // ---- Style switching ----

    setStyleUrl(/* url */) {
        // No-op: OSM and 3D use the same liberty style.
        // Full style switching would require re-adding all user layers after setStyle().
    }

    // ---- Cursor ----

    setCursor(cursor) {
        this._map.getCanvas().style.cursor = cursor;
    }

    // ---- Map ready ----

    onReady(callback) {
        if (this._map.loaded()) {
            callback();
        } else {
            this._map.on('load', callback);
        }
    }

    // ---- Leaflet compatibility layer ----
    // These methods allow layers-manager.js to call engine.addLayer/removeLayer/hasLayer
    // just like it did with Leaflet's map object. Objects can be MapMarker, cluster groups,
    // or any object with addTo()/remove()/_onMap.

    addLayer(obj) {
        if (!obj) return this;
        // Cluster group (simple object with show/hide)
        if (obj.show && obj.hide && obj._markers) {
            obj.show();
            return this;
        }
        // MapMarker or any object with addTo
        if (typeof obj.addTo === 'function') {
            obj.addTo(this);
            return this;
        }
        return this;
    }

    removeLayer(obj) {
        if (!obj) return this;
        if (obj.show && obj.hide && obj._markers) {
            obj.hide();
            return this;
        }
        if (typeof obj.remove === 'function') {
            obj.remove();
            return this;
        }
        return this;
    }

    hasLayer(obj) {
        if (!obj) return false;
        if (obj._visible !== undefined) return obj._visible; // cluster group
        if (obj._onMap !== undefined) return obj._onMap;     // MapMarker
        return false;
    }

    // ---- Access to underlying map (escape hatch) ----

    getMapLibreMap() {
        return this._map;
    }
}

if (typeof window !== 'undefined') {
    window.MapEngine = MapEngine;
    window.MapMarker = MapMarker;
}
