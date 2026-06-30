/**
 * RhinoMap Toolbox — UI wiring (toolbar, sidebars, modals, import/export).
 * Extracted from the inline scripts of the original page.
 */

        function showExportImageModal() {
            const modal = document.getElementById('export-image-modal');
            const overlay = document.getElementById('simple-modal-overlay');
            modal.classList.remove('hidden');
            overlay.classList.remove('hidden');
        }

        function closeExportImageModal() {
            const modal = document.getElementById('export-image-modal');
            const overlay = document.getElementById('simple-modal-overlay');
            modal.classList.add('hidden');
            overlay.classList.add('hidden');
        }

        async function exportMapAsImage() {
            // Check if user is logged in
            if (!currentUser) {
                showWarning(i18n.t('error_must_login_for_export'));
                closeExportImageModal();
                return;
            }

            try {
                // Get export options
                const qualityMultiplier = parseInt(document.getElementById('export-image-size').value);
                const includeLegend = document.getElementById('export-include-legend').checked;

                // Calculate dimensions based on current map size and quality multiplier
                const currentMap = window.app.map;
                const mapContainer = currentMap.getContainer();
                const width = mapContainer.offsetWidth * qualityMultiplier;
                const height = mapContainer.offsetHeight * qualityMultiplier;

                // Show loading state
                window.showToast(i18n.t('export_image_generating'), 'info');

                // Create loading overlay
                const loadingOverlay = document.createElement('div');
                loadingOverlay.style.position = 'fixed';
                loadingOverlay.style.top = '0';
                loadingOverlay.style.left = '0';
                loadingOverlay.style.width = '100%';
                loadingOverlay.style.height = '100%';
                loadingOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                loadingOverlay.style.zIndex = '999999';
                loadingOverlay.style.display = 'flex';
                loadingOverlay.style.alignItems = 'center';
                loadingOverlay.style.justifyContent = 'center';
                loadingOverlay.style.color = 'white';
                loadingOverlay.style.fontSize = '18px';
                loadingOverlay.innerHTML = '<div><i class="iconoir-download-circle-outline" style="font-size: 48px;"></i><br>Generating image...</div>';
                document.body.appendChild(loadingOverlay);

                // Create canvas for final export
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                try {
                    // Draw white background
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(0, 0, width, height);

                    // Capture the current map (just tiles and base elements)
                    if (typeof html2canvas !== 'undefined') {
                        const mapCanvas = await html2canvas(mapContainer, {
                            useCORS: true,
                            allowTaint: false,
                            logging: false,
                            backgroundColor: '#ffffff',
                            scale: qualityMultiplier
                        });

                        // Draw scaled map (same aspect ratio, perfect fit)
                        ctx.drawImage(mapCanvas, 0, 0, width, height);

                        // Now draw all elements manually using current map's coordinate system
                        if (window.layersManager) {
                            window.layersManager.layers.forEach(layer => {
                                if (!layer.visible) return;

                                layer.elements.forEach(element => {
                                    const color = layer.color || '#3498db';

                                    if (element.type === 'circle') {
                                        // Convert center to pixel coordinates
                                        const centerPoint = currentMap.latLngToContainerPoint([element.center.lat, element.center.lng]);
                                        const scaledCenterX = centerPoint.x * qualityMultiplier;
                                        const scaledCenterY = centerPoint.y * qualityMultiplier;

                                        // Calculate radius in pixels
                                        const radiusPoint = currentMap.latLngToContainerPoint([
                                            element.center.lat + (element.radius / 111320), // Rough conversion
                                            element.center.lng
                                        ]);
                                        const radiusInPixels = Math.abs(radiusPoint.y - centerPoint.y) * qualityMultiplier;

                                        // Draw circle
                                        ctx.beginPath();
                                        ctx.arc(scaledCenterX, scaledCenterY, radiusInPixels, 0, Math.PI * 2);
                                        ctx.strokeStyle = color;
                                        ctx.lineWidth = 2 * qualityMultiplier;
                                        ctx.stroke();
                                        ctx.fillStyle = color + '33'; // Add transparency
                                        ctx.fill();

                                    } else if (element.type === 'line') {
                                        // Draw polyline
                                        if (element.points && element.points.length > 0) {
                                            ctx.beginPath();
                                            const firstPoint = currentMap.latLngToContainerPoint([element.points[0].lat, element.points[0].lng]);
                                            ctx.moveTo(firstPoint.x * qualityMultiplier, firstPoint.y * qualityMultiplier);

                                            for (let i = 1; i < element.points.length; i++) {
                                                const point = currentMap.latLngToContainerPoint([element.points[i].lat, element.points[i].lng]);
                                                ctx.lineTo(point.x * qualityMultiplier, point.y * qualityMultiplier);
                                            }

                                            ctx.strokeStyle = color;
                                            ctx.lineWidth = 3 * qualityMultiplier;
                                            ctx.stroke();
                                        }

                                    } else if (element.type === 'polygon') {
                                        // Draw polygon
                                        if (element.points && element.points.length > 0) {
                                            ctx.beginPath();
                                            const firstPoint = currentMap.latLngToContainerPoint([element.points[0].lat, element.points[0].lng]);
                                            ctx.moveTo(firstPoint.x * qualityMultiplier, firstPoint.y * qualityMultiplier);

                                            for (let i = 1; i < element.points.length; i++) {
                                                const point = currentMap.latLngToContainerPoint([element.points[i].lat, element.points[i].lng]);
                                                ctx.lineTo(point.x * qualityMultiplier, point.y * qualityMultiplier);
                                            }

                                            ctx.closePath();
                                            ctx.strokeStyle = color;
                                            ctx.lineWidth = 2 * qualityMultiplier;
                                            ctx.stroke();
                                            ctx.fillStyle = color + '33'; // Add transparency
                                            ctx.fill();
                                        }
                                    }
                                });
                            });
                        }
                    } else {
                        window.showError(i18n.t('export_image_library_missing'));
                        loadingOverlay.remove();
                        return;
                    }

                    // Get title from input
                    const mapTitle = document.getElementById('export-map-title').value;

                    // Add title at top if provided
                    if (mapTitle) {
                        const titleHeight = 50;
                        const titlePadding = 20;

                        // Draw title background (semi-transparent)
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                        ctx.fillRect(0, 0, width, titleHeight);

                        // Draw title text
                        ctx.fillStyle = '#2c3e50';
                        ctx.font = 'bold 24px Arial, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(mapTitle, width / 2, titleHeight / 2);
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'alphabetic';
                    }

                    // Add legend if requested
                    let legendBottomY = 0;
                    if (includeLegend && window.layersManager) {
                        const visibleLayers = window.layersManager.layers.filter(l => l.visible);
                        if (visibleLayers.length > 0) {
                            const legendX = 20;
                            const legendHeight = visibleLayers.length * 30 + 40;
                            const legendY = height - 100 - legendHeight; // Leave space for logo below
                            legendBottomY = legendY + legendHeight;
                            const legendWidth = 200;

                            // Draw legend background
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                            ctx.strokeStyle = '#333';
                            ctx.lineWidth = 2;
                            ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
                            ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

                            // Draw legend title
                            ctx.fillStyle = '#333';
                            ctx.font = 'bold 14px Arial';
                            ctx.textAlign = 'left';
                            ctx.fillText(i18n.t('legend') || 'Legend', legendX + 10, legendY + 25);

                            // Draw each layer
                            visibleLayers.forEach((layer, idx) => {
                                const y = legendY + 45 + (idx * 30);

                                // Draw color indicator
                                ctx.fillStyle = layer.color || '#3498db';
                                ctx.fillRect(legendX + 10, y - 10, 20, 20);
                                ctx.strokeStyle = '#333';
                                ctx.lineWidth = 1;
                                ctx.strokeRect(legendX + 10, y - 10, 20, 20);

                                // Draw layer name
                                ctx.fillStyle = '#333';
                                ctx.font = '12px Arial';
                                ctx.fillText(layer.name.substring(0, 20), legendX + 40, y + 5);
                            });
                        }
                    }

                    // Add logo at bottom left (under legend)
                    try {
                        const logo = new Image();
                        logo.crossOrigin = 'anonymous';
                        await new Promise((resolve, reject) => {
                            logo.onload = resolve;
                            logo.onerror = reject;
                            logo.src = 'logo-wide.png';
                        });

                        // Logo dimensions (wide logo is ~3:1 ratio)
                        const logoWidth = 150;
                        const logoHeight = 50;
                        const logoX = 20;

                        // Position below legend if present, otherwise at bottom
                        const logoY = legendBottomY > 0 ? legendBottomY + 15 : height - logoHeight - 15;

                        // Draw logo with opacity
                        ctx.globalAlpha = 0.4;
                        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
                        ctx.globalAlpha = 1.0;
                    } catch (err) {
                        console.warn('Could not load logo for export:', err);
                        // Continue without logo if it fails
                    }

                    // Download the image
                    canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `rhinomap_export_${Date.now()}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        window.showToast(i18n.t('export_image_success'), 'success');
                        closeExportImageModal();
                    });

                } catch (err) {
                    console.error('Error in export process:', err);
                    window.showError(i18n.t('export_image_error'));
                } finally {
                    // Cleanup: remove overlay
                    if (loadingOverlay && loadingOverlay.parentNode) {
                        loadingOverlay.parentNode.removeChild(loadingOverlay);
                    }
                }

            } catch (error) {
                console.error('Error exporting map:', error);
                window.showError(i18n.t('export_image_error'));
            }
        }


// Menu dropdown toggles
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = btn.nextElementSibling;

                // Close other dropdowns
                document.querySelectorAll('.menu-dropdown').forEach(d => {
                    if (d !== dropdown) d.classList.remove('show');
                });

                // Toggle current dropdown
                dropdown.classList.toggle('show');
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.menu-dropdown').forEach(d => {
                d.classList.remove('show');
            });
        });

        // Sidebar box toggle
        function toggleBox(boxId) {
            const box = document.getElementById(boxId);
            box.classList.toggle('collapsed');
            const icon = box.querySelector('.box-toggle i');
            if (box.classList.contains('collapsed')) {
                icon.className = 'iconoir-nav-arrow-down';
            } else {
                icon.className = 'iconoir-nav-arrow-up';
            }
        }

        // Show sidebar with specific content
        function showSidebar(type) {
            const sidebar = document.getElementById('leftSidebar');
            sidebar.classList.add('open');

            // Hide contextual boxes
            ['files-box', 'isochrone-settings-box', 'line-constraints-box'].forEach(boxId => {
                const box = document.getElementById(boxId);
                if (box) box.style.display = 'none';
            });

            // Show requested contextual box
            if (type === 'files') {
                document.getElementById('files-box').style.display = 'block';
            } else if (type === 'isochrone') {
                document.getElementById('isochrone-settings-box').style.display = 'block';
            } else if (type === 'constraints') {
                document.getElementById('line-constraints-box').style.display = 'block';
                syncConstraintsValues();
            }
        }

        // Toggle the right layers sidebar
        function toggleLayersSidebar() {
            const sidebar = document.getElementById('layersSidebar');
            if (!sidebar) return;

            const isOpen = sidebar.classList.contains('open');

            if (isOpen) {
                // Close sidebar
                sidebar.classList.remove('open');
                document.body.classList.remove('layers-sidebar-open');
                localStorage.setItem('layersSidebarOpen', 'false');
            } else {
                // Open sidebar
                sidebar.classList.add('open');
                document.body.classList.add('layers-sidebar-open');
                localStorage.setItem('layersSidebarOpen', 'true');

                // Update layers UI when opening
                if (window.updateLayersUI) {
                    window.updateLayersUI();
                }
                if (window.updateOverpassLayersPanel) {
                    window.updateOverpassLayersPanel();
                }
            }
        }

        // Restore layers sidebar state on page load
        function restoreLayersSidebarState() {
            const sidebar = document.getElementById('layersSidebar');
            if (!sidebar) return;

            const wasOpen = localStorage.getItem('layersSidebarOpen') === 'true';
            if (wasOpen) {
                sidebar.classList.add('open');
                document.body.classList.add('layers-sidebar-open');
                // Update layers UI
                if (window.updateLayersUI) {
                    window.updateLayersUI();
                }
                if (window.updateOverpassLayersPanel) {
                    window.updateOverpassLayersPanel();
                }
            }
        }

        // Sync constraints values between old panel and sidebar
        function syncConstraintsValues() {
            const lockDistance = document.getElementById('lock-distance')?.checked || false;
            const lockAzimuth = document.getElementById('lock-azimuth')?.checked || false;
            const distanceValue = document.getElementById('distance-value')?.value || '';
            const azimuthValue = document.getElementById('azimuth-value')?.value || '';
            const segmentCount = document.getElementById('segment-count')?.textContent || '0';
            const totalDistance = document.getElementById('total-distance')?.textContent || '0.0m';

            if (document.getElementById('lock-distance-sidebar')) {
                document.getElementById('lock-distance-sidebar').checked = lockDistance;
            }
            if (document.getElementById('lock-azimuth-sidebar')) {
                document.getElementById('lock-azimuth-sidebar').checked = lockAzimuth;
            }
            if (document.getElementById('distance-value-sidebar')) {
                document.getElementById('distance-value-sidebar').value = distanceValue;
            }
            if (document.getElementById('azimuth-value-sidebar')) {
                document.getElementById('azimuth-value-sidebar').value = azimuthValue;
            }
            if (document.getElementById('segment-count-sidebar')) {
                document.getElementById('segment-count-sidebar').textContent = segmentCount;
            }
            if (document.getElementById('total-distance-sidebar')) {
                document.getElementById('total-distance-sidebar').textContent = totalDistance;
            }
        }

        // Tool Sidebar Management
        function updateToolSidebarState(activeTool) {
            // Remove active class from all tool buttons
            document.querySelectorAll('.tool-sidebar-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Try to activate by ID first (for overpass, ai, etc.)
            const toolBtn = document.getElementById(activeTool + '-tool');
            if (toolBtn) {
                toolBtn.classList.add('active');
                return;
            }

            // Fallback: Map tools to their corresponding button indices
            const toolMap = {
                'point': 0,
                'line': 1,
                'circle': 2,
                'polygon': 3,
                'isochrone': 4
            };

            // Add active class to the current tool
            if (toolMap[activeTool] !== undefined) {
                const buttons = document.querySelectorAll('.tool-sidebar-btn');
                if (buttons[toolMap[activeTool]]) {
                    buttons[toolMap[activeTool]].classList.add('active');
                }
            }
        }

        // Wrapper functions for menu
        function selectTool(tool) {
            if (window.app && window.app.selectTool) {
                window.app.selectTool(tool);
                updateToolSidebarState(tool);

                // Hide all contextual boxes first
                const contextualBoxes = ['isochrone-settings-box', 'line-constraints-box', 'overpass-box', 'image-analysis-box', 'ai-history-box'];
                contextualBoxes.forEach(boxId => {
                    const box = document.getElementById(boxId);
                    if (box) box.style.display = 'none';
                });

                // Show specific contextual box for certain tools
                if (tool === 'isochrone') {
                    showSidebar('isochrone');
                } else if (tool === 'line') {
                    showSidebar('constraints');
                } else {
                    // For other tools, just show layers (no contextual box)
                    showSidebar('layers');
                }
            }
        }

        async function clearAllElements() {
            if (await confirmAction('Clear all elements from the map?')) {
                if (window.app && window.app.clearAll) {
                    window.app.clearAll();
                }
            }
        }

        function importData() {
            document.getElementById('file-input').click();
        }

        function exportData(format) {
            if (window.app && window.app.exportData) {
                window.app.exportData(format);
            }
        }

        async function clearLocalStorage() {
            if (await confirmAction('This will delete all saved data. Continue?')) {
                localStorage.clear();
                location.reload();
            }
        }

        // Map layer switcher
        document.getElementById('map-layer').addEventListener('click', function() {
            if (window.app) {
                window.app.switchLayer('osm');
                this.classList.add('active');
                document.getElementById('satellite-layer').classList.remove('active');
            }
        });

        document.getElementById('satellite-layer').addEventListener('click', function() {
            if (window.app) {
                window.app.switchLayer('satellite');
                this.classList.add('active');
                document.getElementById('map-layer').classList.remove('active');
            }
        });

        // Initialize Layer Management System when app is ready
        window.addEventListener('DOMContentLoaded', function() {
            // Wait for app to be initialized
            const initInterval = setInterval(function() {
                if (window.app) {
                    clearInterval(initInterval);

                    // Step 1: Initialize layers UI (this creates LayersManager)
                    if (typeof initLayersUI === 'function') {
                        initLayersUI(window.app);
                    }

                    // Step 2: Load data from localStorage (must wait for MapLibre style to load)
                    const doRestore = () => {
                        if (window.app.loadFromLocalStorage) {
                            window.app.loadFromLocalStorage();
                        }
                    };

                    if (window.app.engine && window.app.engine.onReady) {
                        window.app.engine.onReady(() => {
                            // Defer to next tick — MapLibre can't add sources during render cycle
                            setTimeout(doRestore, 0);
                        });
                    } else {
                        doRestore();
                    }

                    // Step 3: Connect sidebar buttons
                    setupIsochroneSidebarListeners();
                    setupConstraintsSidebarListeners();


                    // Step 5: Restore layers sidebar state (right sidebar)
                    restoreLayersSidebarState();

                }
            }, 100);
        });

        // Setup sidebar isochrone listeners
        function setupIsochroneSidebarListeners() {
            // Calculate and Cancel buttons - handled by app.js safeAddListener
            // Calc mode and unit updates - handled by app.js updateCostLabel()

            // Sync point info text changes from old panel to sidebar
            const oldPointInfo = document.getElementById('isochrone-point-info');
            const sidebarPointInfo = document.getElementById('isochrone-point-info-sidebar');
            if (oldPointInfo && sidebarPointInfo) {
                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.type === 'childList' || mutation.type === 'characterData') {
                            sidebarPointInfo.textContent = oldPointInfo.textContent;
                        }
                    });
                });
                observer.observe(oldPointInfo, {
                    childList: true,
                    characterData: true,
                    subtree: true
                });
            }

            // Sync calculate button disabled state
            const oldCalculateBtn = document.getElementById('calculate-isochrone');
            const sidebarCalculateBtn = document.getElementById('calculate-isochrone-sidebar');
            if (oldCalculateBtn && sidebarCalculateBtn) {
                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.attributeName === 'disabled') {
                            sidebarCalculateBtn.disabled = oldCalculateBtn.disabled;
                        }
                    });
                });
                observer.observe(oldCalculateBtn, { attributes: true });
            }
        }

        // Setup sidebar constraints listeners
        function setupConstraintsSidebarListeners() {
            // Sync checkbox changes
            const lockDistanceSidebar = document.getElementById('lock-distance-sidebar');
            if (lockDistanceSidebar) {
                lockDistanceSidebar.addEventListener('change', function() {
                    const oldCheck = document.getElementById('lock-distance');
                    if (oldCheck) oldCheck.checked = this.checked;
                    // Trigger app's constraint handler
                    if (window.app && window.app.constraints) {
                        window.app.constraints.distanceLocked = this.checked;
                    }
                });
            }

            const lockAzimuthSidebar = document.getElementById('lock-azimuth-sidebar');
            if (lockAzimuthSidebar) {
                lockAzimuthSidebar.addEventListener('change', function() {
                    const oldCheck = document.getElementById('lock-azimuth');
                    if (oldCheck) oldCheck.checked = this.checked;
                    // Trigger app's constraint handler
                    if (window.app && window.app.constraints) {
                        window.app.constraints.azimuthLocked = this.checked;
                    }
                });
            }

            // Sync value inputs
            const distanceValueSidebar = document.getElementById('distance-value-sidebar');
            if (distanceValueSidebar) {
                distanceValueSidebar.addEventListener('input', function() {
                    const oldInput = document.getElementById('distance-value');
                    if (oldInput) oldInput.value = this.value;
                    // Trigger app's constraint handler
                    if (window.app && window.app.constraints) {
                        window.app.constraints.lockedDistance = parseFloat(this.value) || null;
                    }
                });
            }

            const azimuthValueSidebar = document.getElementById('azimuth-value-sidebar');
            if (azimuthValueSidebar) {
                azimuthValueSidebar.addEventListener('input', function() {
                    const oldInput = document.getElementById('azimuth-value');
                    if (oldInput) oldInput.value = this.value;
                    // Trigger app's constraint handler
                    if (window.app && window.app.constraints) {
                        window.app.constraints.lockedAzimuth = parseFloat(this.value) || null;
                    }
                });
            }

            // Reset button
            const resetBtn = document.getElementById('reset-constraints-sidebar');
            if (resetBtn) {
                resetBtn.addEventListener('click', function() {
                    const oldResetBtn = document.getElementById('reset-constraints');
                    if (oldResetBtn) oldResetBtn.click();
                    // Update sidebar values
                    if (lockDistanceSidebar) lockDistanceSidebar.checked = false;
                    if (lockAzimuthSidebar) lockAzimuthSidebar.checked = false;
                    if (distanceValueSidebar) distanceValueSidebar.value = '';
                    if (azimuthValueSidebar) azimuthValueSidebar.value = '';
                });
            }

            // Finish button
            const finishBtn = document.getElementById('finish-line-sidebar');
            if (finishBtn) {
                finishBtn.addEventListener('click', function() {
                    const oldFinishBtn = document.getElementById('finish-line');
                    if (oldFinishBtn) oldFinishBtn.click();
                });
            }

            // Sync stats changes from old panel to sidebar
            const segmentCount = document.getElementById('segment-count');
            const totalDistance = document.getElementById('total-distance');
            const segmentCountSidebar = document.getElementById('segment-count-sidebar');
            const totalDistanceSidebar = document.getElementById('total-distance-sidebar');

            if (segmentCount && segmentCountSidebar) {
                const observer = new MutationObserver(function() {
                    segmentCountSidebar.textContent = segmentCount.textContent;
                });
                observer.observe(segmentCount, { childList: true, characterData: true, subtree: true });
            }

            if (totalDistance && totalDistanceSidebar) {
                const observer = new MutationObserver(function() {
                    totalDistanceSidebar.textContent = totalDistance.textContent;
                });
                observer.observe(totalDistance, { childList: true, characterData: true, subtree: true });
            }

            // Sync finish button visibility
            const finishBtnOld = document.getElementById('finish-line');
            const finishBtnSidebar = document.getElementById('finish-line-sidebar');
            if (finishBtnOld && finishBtnSidebar) {
                const observer = new MutationObserver(function() {
                    finishBtnSidebar.style.display = finishBtnOld.style.display;
                });
                observer.observe(finishBtnOld, { attributes: true, attributeFilter: ['style'] });
            }
        }

        /**
         * Overpass workflow functions
         */

        // Handle zone type selection change
        function syncSidebarToOldPanel() {
            const mapping = {
                'transport-mode-sidebar': 'transport-mode',
                'calc-mode-sidebar': 'calc-mode',
                'direction-mode-sidebar': 'direction-mode',
                'cost-value-sidebar': 'cost-value',
                'time-unit-sidebar': 'time-unit',
                'avoid-tolls-sidebar': 'avoid-tolls',
                'avoid-tunnels-sidebar': 'avoid-tunnels',
                'avoid-bridges-sidebar': 'avoid-bridges'
            };

            Object.entries(mapping).forEach(([sidebarId, oldId]) => {
                const sidebarEl = document.getElementById(sidebarId);
                const oldEl = document.getElementById(oldId);
                if (sidebarEl && oldEl) {
                    if (sidebarEl.type === 'checkbox') {
                        oldEl.checked = sidebarEl.checked;
                    } else {
                        oldEl.value = sidebarEl.value;
                    }
                }
            });
        }

        // Override app's enable/disable calculate button to work with sidebar
        const originalSetInterval = window.setInterval;
        window.setInterval = function(...args) {
            const result = originalSetInterval.apply(this, args);
            // Intercept button state changes
            if (window.app) {
                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.attributeName === 'disabled') {
                            const oldBtn = document.getElementById('calculate-isochrone');
                            const sidebarBtn = document.getElementById('calculate-isochrone-sidebar');
                            if (oldBtn && sidebarBtn) {
                                sidebarBtn.disabled = oldBtn.disabled;
                            }
                        }
                    });
                });

                const oldBtn = document.getElementById('calculate-isochrone');
                if (oldBtn) {
                    observer.observe(oldBtn, { attributes: true });
                }
            }
            return result;
        };
