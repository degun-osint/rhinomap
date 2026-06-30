/**
 * Region Selector for Multi-Region Image Analysis
 * Allows users to draw up to 3 rectangular regions on an image
 */

class RegionSelector {
    constructor(imageElement, canvasElement) {
        this.imageElement = imageElement;
        this.canvasElement = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.regions = []; // Array of {x, y, width, height} in normalized coordinates (0-1)
        this.currentRegion = null;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.enabled = false;
        this.maxRegions = 3;

        // Colors for each region
        this.regionColors = [
            '#3498db', // Blue
            '#e74c3c', // Red
            '#2ecc71'  // Green
        ];

        this.initEventListeners();
    }

    initEventListeners() {
        // Mouse events
        this.canvasElement.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvasElement.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvasElement.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Touch events for mobile
        this.canvasElement.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvasElement.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvasElement.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Prevent context menu on canvas
        this.canvasElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    enable() {
        this.enabled = true;
        this.canvasElement.style.cursor = 'crosshair';
        this.updateCanvas();
    }

    disable() {
        this.enabled = false;
        this.canvasElement.style.cursor = 'default';
        this.clear();
    }

    updateCanvas() {
        // Match canvas size to image
        const rect = this.imageElement.getBoundingClientRect();
        this.canvasElement.width = rect.width;
        this.canvasElement.height = rect.height;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        // Draw all saved regions
        this.regions.forEach((region, index) => {
            this.drawRegion(region, index);
        });

        // Draw current region being drawn
        if (this.currentRegion) {
            this.drawRegion(this.currentRegion, this.regions.length, true);
        }
    }

    drawRegion(region, index, isCurrent = false) {
        const color = this.regionColors[index % this.regionColors.length];
        const rect = this.imageElement.getBoundingClientRect();

        // Convert normalized coordinates to canvas pixels
        const x = region.x * rect.width;
        const y = region.y * rect.height;
        const width = region.width * rect.width;
        const height = region.height * rect.height;

        // Draw rectangle
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = isCurrent ? 2 : 3;
        this.ctx.setLineDash(isCurrent ? [5, 5] : []);
        this.ctx.strokeRect(x, y, width, height);

        // Draw semi-transparent fill
        this.ctx.fillStyle = color + '20'; // Add alpha
        this.ctx.fillRect(x, y, width, height);

        // Draw label
        if (!isCurrent) {
            this.ctx.fillStyle = color;
            this.ctx.font = 'bold 14px sans-serif';
            this.ctx.fillText(`Region ${index + 1}`, x + 5, y + 20);
        }

        this.ctx.setLineDash([]); // Reset dash
    }

    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvasElement.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    normalizeCoordinates(x, y, width, height) {
        const rect = this.imageElement.getBoundingClientRect();

        // Clamp to [0, 1] range to handle edge cases
        const clamp = (val) => Math.max(0, Math.min(1, val));

        return {
            x: clamp(x / rect.width),
            y: clamp(y / rect.height),
            width: clamp(width / rect.width),
            height: clamp(height / rect.height)
        };
    }

    handleMouseDown(e) {
        if (!this.enabled) return;
        if (this.regions.length >= this.maxRegions) {
            showWarning(`Maximum ${this.maxRegions} regions allowed. Remove a region to add a new one.`);
            return;
        }

        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        this.isDrawing = true;
        this.startX = coords.x;
        this.startY = coords.y;
        this.currentRegion = null;
    }

    handleMouseMove(e) {
        if (!this.enabled || !this.isDrawing) return;

        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        const width = coords.x - this.startX;
        const height = coords.y - this.startY;

        // Normalize coordinates
        this.currentRegion = this.normalizeCoordinates(
            Math.min(this.startX, coords.x),
            Math.min(this.startY, coords.y),
            Math.abs(width),
            Math.abs(height)
        );

        this.updateCanvas();
    }

    handleMouseUp(e) {
        if (!this.enabled || !this.isDrawing) return;

        this.isDrawing = false;

        if (this.currentRegion && this.currentRegion.width > 0.02 && this.currentRegion.height > 0.02) {
            // Region is large enough (at least 2% of image dimensions)
            this.regions.push(this.currentRegion);
            this.updateRegionsList();
            showToast(`Region ${this.regions.length} added`, 'success');
        }

        this.currentRegion = null;
        this.updateCanvas();
    }

    // Touch event handlers
    handleTouchStart(e) {
        if (!this.enabled) return;
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    }

    handleTouchMove(e) {
        if (!this.enabled) return;
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }

    handleTouchEnd(e) {
        if (!this.enabled) return;
        e.preventDefault();
        this.handleMouseUp({});
    }

    removeRegion(index) {
        if (index >= 0 && index < this.regions.length) {
            this.regions.splice(index, 1);
            this.updateCanvas();
            this.updateRegionsList();
            showToast(`Region ${index + 1} removed`, 'info');
        }
    }

    clear() {
        this.regions = [];
        this.currentRegion = null;
        this.isDrawing = false;
        this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        this.updateRegionsList();
    }

    getRegions() {
        return this.regions;
    }

    hasRegions() {
        return this.regions.length > 0;
    }

    updateRegionsList() {
        const listElement = document.getElementById('regionsList');
        if (!listElement) return;

        if (this.regions.length === 0) {
            listElement.innerHTML = '<small style="color: rgba(255,255,255,0.5);">No regions selected. Draw rectangles on the image to select areas of interest.</small>';
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
        this.regions.forEach((region, index) => {
            const color = this.regionColors[index % this.regionColors.length];
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(45, 55, 72, 0.5); border-left: 3px solid ${color}; border-radius: 4px;">
                    <span style="font-size: 0.85rem;">
                        <strong>Region ${index + 1}</strong>
                        <small style="color: rgba(255,255,255,0.5); margin-left: 0.5rem;">
                            ${Math.round(region.width * 100)}% × ${Math.round(region.height * 100)}%
                        </small>
                    </span>
                    <button
                        onclick="window.regionSelector.removeRegion(${index})"
                        style="background: rgba(231, 76, 60, 0.2); border: 1px solid rgba(231, 76, 60, 0.5); color: #e74c3c; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.75rem;"
                        type="button"
                    >
                        Remove
                    </button>
                </div>
            `;
        });
        html += '</div>';

        listElement.innerHTML = html;
    }
}

// Export for use in map.html
window.RegionSelector = RegionSelector;
