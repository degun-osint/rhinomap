/**
 * GeoUtils - Pure geographic math utilities for RhinoMap
 * No dependencies on any map library
 */

const GeoUtils = {

    /** Earth radius in meters */
    EARTH_RADIUS: 6371008.8,

    /** Degrees to radians */
    DEG2RAD: Math.PI / 180,

    /** Radians to degrees */
    RAD2DEG: 180 / Math.PI,

    /**
     * Haversine distance between two points in meters
     * @param {{lat: number, lng: number}} p1
     * @param {{lat: number, lng: number}} p2
     * @returns {number} Distance in meters
     */
    haversineDistance(p1, p2) {
        const lat1 = p1.lat * this.DEG2RAD;
        const lat2 = p2.lat * this.DEG2RAD;
        const dLat = (p2.lat - p1.lat) * this.DEG2RAD;
        const dLng = (p2.lng - p1.lng) * this.DEG2RAD;
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return this.EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    /**
     * Azimuth (bearing) from p1 to p2 in degrees [0, 360)
     * @param {{lat: number, lng: number}} p1
     * @param {{lat: number, lng: number}} p2
     * @returns {number} Bearing in degrees
     */
    calculateAzimuth(p1, p2) {
        const lat1 = p1.lat * this.DEG2RAD;
        const lat2 = p2.lat * this.DEG2RAD;
        const dLng = (p2.lng - p1.lng) * this.DEG2RAD;
        const x = Math.sin(dLng) * Math.cos(lat2);
        const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        return (Math.atan2(x, y) * this.RAD2DEG + 360) % 360;
    },

    /**
     * Midpoint between two points (simple average)
     * @param {{lat: number, lng: number}} p1
     * @param {{lat: number, lng: number}} p2
     * @returns {{lat: number, lng: number}}
     */
    calculateMidpoint(p1, p2) {
        return {
            lat: (p1.lat + p2.lat) / 2,
            lng: (p1.lng + p2.lng) / 2
        };
    },

    /**
     * Destination point given start, distance and bearing
     * @param {{lat: number, lng: number}} start
     * @param {number} distance - Distance in meters
     * @param {number} bearing - Bearing in degrees
     * @returns {{lat: number, lng: number}}
     */
    calculateDestination(start, distance, bearing) {
        const d = distance / this.EARTH_RADIUS;
        const brng = bearing * this.DEG2RAD;
        const lat1 = start.lat * this.DEG2RAD;
        const lng1 = start.lng * this.DEG2RAD;

        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(d) +
            Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
        );
        const lng2 = lng1 + Math.atan2(
            Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
            Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
        );

        return {
            lat: lat2 * this.RAD2DEG,
            lng: lng2 * this.RAD2DEG
        };
    },

    /**
     * Polygon area using Shoelace formula (approximation for small areas)
     * @param {{lat: number, lng: number}[]} points
     * @returns {number} Area in m²
     */
    calculatePolygonArea(points) {
        if (points.length < 3) return 0;
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].lng * points[j].lat;
            area -= points[j].lng * points[i].lat;
        }
        area = Math.abs(area) / 2;
        const metersPerDegree = 111320;
        return area * metersPerDegree * metersPerDegree;
    },

    /**
     * Polygon perimeter in meters
     * @param {{lat: number, lng: number}[]} points
     * @returns {number} Perimeter in meters
     */
    calculatePolygonPerimeter(points) {
        if (points.length < 2) return 0;
        let perimeter = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            perimeter += this.haversineDistance(points[i], points[j]);
        }
        return perimeter;
    },

    /**
     * Triangle measurements (sides, perimeter, area via Heron's formula)
     * @param {{lat: number, lng: number}[]} points - Exactly 3 points
     * @returns {{sideAB: number, sideBC: number, sideCA: number, perimeter: number, area: number}}
     */
    calculateTriangulation(points) {
        const [a, b, c] = points;
        const sideAB = this.haversineDistance(a, b);
        const sideBC = this.haversineDistance(b, c);
        const sideCA = this.haversineDistance(c, a);
        const perimeter = sideAB + sideBC + sideCA;
        const s = perimeter / 2;
        const area = Math.sqrt(s * (s - sideAB) * (s - sideBC) * (s - sideCA));
        return { sideAB, sideBC, sideCA, perimeter, area };
    },

    /**
     * Generate a polygon approximating a circle
     * @param {{lat: number, lng: number}} center
     * @param {number} radiusMeters
     * @param {number} numPoints - Number of vertices (default 64)
     * @returns {{lat: number, lng: number}[]} Array of points forming the circle
     */
    circleToPolygon(center, radiusMeters, numPoints = 64) {
        const points = [];
        for (let i = 0; i < numPoints; i++) {
            const bearing = (360 * i) / numPoints;
            points.push(this.calculateDestination(center, radiusMeters, bearing));
        }
        points.push({ ...points[0] }); // Close the ring
        return points;
    },

    /**
     * Convert {lat, lng} to MapLibre [lng, lat]
     * @param {{lat: number, lng: number}} latlng
     * @returns {[number, number]}
     */
    toMapLibre(latlng) {
        return [latlng.lng, latlng.lat];
    },

    /**
     * Convert MapLibre LngLat to {lat, lng}
     * @param {*} lnglat - MapLibre LngLat object or [lng, lat] array
     * @returns {{lat: number, lng: number}}
     */
    fromMapLibre(lnglat) {
        if (Array.isArray(lnglat)) return { lat: lnglat[1], lng: lnglat[0] };
        return { lat: lnglat.lat, lng: lnglat.lng };
    },

    /**
     * Format distance for display
     * @param {number} meters
     * @returns {string}
     */
    formatDistance(meters) {
        if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
        return `${meters.toFixed(2)} m`;
    },

    /**
     * Format area for display
     * @param {number} squareMeters
     * @returns {string}
     */
    formatArea(squareMeters) {
        if (squareMeters >= 10000) return `${(squareMeters / 10000).toFixed(3)} ha`;
        return `${squareMeters.toFixed(2)} m²`;
    }
};

if (typeof window !== 'undefined') {
    window.GeoUtils = GeoUtils;
}
