/**
 * Layers UI Manager
 * Handles the visual layer management interface
 */

// Helper to create bounds from an array of {lat, lng} points
function _makeBounds(points) {
    return { _points: points.map(p => ({ lat: p.lat, lng: p.lng || p.lon })) };
}

let layersManager = null;

/**
 * Initialize layers UI
 */
function initLayersUI(app) {
    layersManager = new LayersManager(app);

    window.layersManager = layersManager;

    // NOTE: We no longer need to "load" or "reconnect" layers here
    // The app.js loadFromLocalStorage() will call layersManager.load()
    // and then restore all elements to the map using restoreElementToMap()
    // This ensures layers are the single source of truth

    updateLayersUI();
}

// NOTE: reconnectLayersWithElements() has been removed
// Elements are now restored directly from layers using restoreElementToMap()
// in app.js loadFromLocalStorage() - no reconnection needed!

/**
 * Update the layers UI
 */
function updateLayersUI() {
    if (!layersManager) return;

    // Render in the new right sidebar
    const container = document.getElementById('layers-tree-sidebar');
    if (!container) return;

    container.innerHTML = '';

    const fragment = document.createDocumentFragment();
    layersManager.layers.forEach((layer, index) => {
        fragment.appendChild(createLayerElement(layer));
    });
    container.appendChild(fragment);
}

/**
 * Create layer HTML element
 */
function createLayerElement(layer) {
    const div = document.createElement('div');
    div.className = 'layer-item';
    div.dataset.layerId = layer.id;

    const isActive = layersManager.currentLayerId === layer.id;

    const layerColor = layer.color || '#3498db';

    div.innerHTML = `
        <div class="layer-header ${isActive ? 'active' : ''}" onclick="selectLayer('${layer.id}')"
             ondragover="onLayerDragOver(event)"
             ondragleave="onLayerDragLeave(event)"
             ondrop="onLayerDrop(event, '${layer.id}')">
            <div class="layer-controls">
                <button class="layer-toggle-btn" onclick="event.stopPropagation(); toggleLayerExpansion('${layer.id}')" title="Expand/Collapse">
                    <i class="iconoir-nav-arrow-down layer-arrow"></i>
                </button>
                <button class="layer-visibility-btn ${layer.visible ? 'visible' : ''}" onclick="event.stopPropagation(); toggleLayerVisibility('${layer.id}')" title="Toggle Visibility">
                    <i class="iconoir-${layer.visible ? 'eye' : 'eye-closed'}"></i>
                </button>
            </div>
            <div class="layer-info">
                <span class="layer-color-badge" style="background-color: ${layerColor};" title="Layer color"></span>
                <span class="layer-name">${layer.name}</span>
                <span class="layer-count">${layer.elements.length}</span>
            </div>
            <div class="layer-actions">
                <button class="layer-action-btn" onclick="showLayerMenuHandler(event, '${layer.id}')" title="More options">
                    <i class="iconoir-more-vert"></i>
                </button>
            </div>
        </div>
        <div class="layer-elements" id="elements-${layer.id}" style="display: none;"
             ondragover="onLayerDragOver(event)"
             ondragleave="onLayerDragLeave(event)"
             ondrop="onLayerDrop(event, '${layer.id}')">
            ${layer.elements.map(element => createElementHTML(element)).join('')}
        </div>
    `;

    return div;
}

/**
 * Create element HTML
 */
function createElementHTML(element) {
    const icon = getElementIcon(element.type);
    const isVisible = element.visible !== undefined ? element.visible : true;
    const visibilityIcon = isVisible ? 'eye' : 'eye-closed';
    const visibilityClass = isVisible ? 'visible' : '';

    return `
        <div class="element-item" data-element-id="${element.id}" draggable="true"
             ondragstart="onElementDragStart(event)" ondragend="onElementDragEnd(event)">
            <button class="element-visibility-btn ${visibilityClass}"
                    onclick="event.stopPropagation(); toggleElementVisibility('${element.id}')"
                    title="${i18n.t('element_toggle_visibility')}">
                <i class="iconoir-${visibilityIcon}"></i>
            </button>
            <i class="iconoir-${icon}"></i>
            <span class="element-name">${element.name || 'Unnamed'}</span>
            <div class="element-actions">
                <button class="element-action-btn" onclick="showElementMenuHandler(event, '${element.id}')" title="More">
                    <i class="iconoir-more-vert"></i>
                </button>
            </div>
        </div>
    `;
}

/**
 * Get icon for element type
 */
function getElementIcon(type) {
    const icons = {
        point: 'map-pin',
        line: 'linear',
        circle: 'circle',
        polygon: 'multi-window',
        isochrone: 'timer',
        overpass: 'search',
        image: 'camera'
    };
    return icons[type] || 'map-pin';
}

/**
 * Select layer as active
 */
function selectLayer(layerId) {
    layersManager.setCurrentLayer(layerId);
}

/**
 * Toggle layer visibility
 */
function toggleLayerVisibility(layerId) {
    layersManager.toggleLayerVisibility(layerId);
}

/**
 * Toggle element visibility (independent from layer)
 */
function toggleElementVisibility(elementId) {
    if (layersManager) {
        layersManager.toggleElementVisibility(elementId);
    }
}

/**
 * Toggle layer expansion
 */
function toggleLayerExpansion(layerId) {
    const elementsDiv = document.getElementById(`elements-${layerId}`);
    const arrow = event.target.closest('.layer-toggle-btn')?.querySelector('.layer-arrow');

    if (elementsDiv) {
        const isExpanded = elementsDiv.style.display !== 'none';
        elementsDiv.style.display = isExpanded ? 'none' : 'block';

        if (arrow) {
            arrow.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
        }
    }
}

/**
 * Show layer context menu handler
 */
function showLayerMenuHandler(event, layerId) {
    event.stopPropagation();
    event.preventDefault();
    const menu = createLayerContextMenu(layerId);
    showContextMenu(menu, event.clientX, event.clientY);
}

/**
 * Show layer context menu
 */
function showLayerMenu(layerId, event) {
    const menu = createLayerContextMenu(layerId);
    showContextMenu(menu, event.clientX, event.clientY);
}

/**
 * Show element context menu handler
 */
function showElementMenuHandler(event, elementId) {
    event.stopPropagation();
    event.preventDefault();
    const menu = createElementContextMenu(elementId);
    showContextMenu(menu, event.clientX, event.clientY);
}

/**
 * Show element context menu
 */
function showElementMenu(elementId, event) {
    const menu = createElementContextMenu(elementId);
    showContextMenu(menu, event.clientX, event.clientY);
}

/**
 * Create layer context menu
 */
function createLayerContextMenu(layerId) {
    const layer = layersManager.getLayer(layerId);
    const canDelete = layersManager.layers.length > 1;

    return `
        <div class="context-menu-item" data-action="rename-layer" data-layer-id="${layerId}">
            <i class="iconoir-edit-pencil"></i>
            <span>Rename Layer</span>
        </div>
        <div class="context-menu-item" data-action="change-layer-color" data-layer-id="${layerId}">
            <i class="iconoir-color-picker"></i>
            <span>Change Layer Color</span>
        </div>
        <div class="context-menu-item" data-action="duplicate-layer" data-layer-id="${layerId}">
            <i class="iconoir-copy"></i>
            <span>Duplicate Layer</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" data-action="toggle-all-labels" data-layer-id="${layerId}">
            <i class="iconoir-eye"></i>
            <span>${i18n.t('layers_toggle_all_labels')}</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item ${!canDelete ? 'disabled' : ''}" data-action="${canDelete ? 'delete-layer' : ''}" data-layer-id="${layerId}">
            <i class="iconoir-trash"></i>
            <span>Delete Layer</span>
        </div>
    `;
}

/**
 * Create element context menu
 */
function createElementContextMenu(elementId) {
    const element = layersManager.findElementById(elementId);
    if (!element) return '';

    if (element.showIcon === undefined) element.showIcon = true;
    if (element.showName === undefined) element.showName = true;
    if (element.data) {
        if (element.data.showIcon === undefined) element.data.showIcon = true;
        if (element.data.showName === undefined) element.data.showName = true;
    }

    const showIconChecked = (element.data && element.data.showIcon !== undefined) ? element.data.showIcon : element.showIcon;
    const showNameChecked = (element.data && element.data.showName !== undefined) ? element.data.showName : element.showName;

    const showLegendChecked = (element.data && element.data.showLegend !== undefined) ? element.data.showLegend : (element.showLegend !== undefined ? element.showLegend : true);
    const hasLegend = element.type === 'polygon' || element.type === 'circle';

    let legendToggle = '';
    if (hasLegend) {
        legendToggle = `
        <div class="context-menu-item checkbox-item" data-action="toggle-legend" data-element-id="${elementId}">
            <label class="checkbox-label">
                <input type="checkbox" ${showLegendChecked ? 'checked' : ''}
                       onchange="handleToggleElementLegend(event, '${elementId}')"
                       onclick="event.stopPropagation()">
                <span>${i18n.t('toggle_legend')}</span>
            </label>
        </div>`;
    }

    const isLine = element.type === 'line';
    const showMeasurementsChecked = (element.data && element.data.showMeasurements !== undefined)
        ? element.data.showMeasurements
        : (element.showMeasurements !== undefined ? element.showMeasurements : true);

    let measurementsToggle = '';
    if (isLine) {
        measurementsToggle = `
        <div class="context-menu-item checkbox-item" data-action="toggle-measurements" data-element-id="${elementId}">
            <label class="checkbox-label">
                <input type="checkbox" ${showMeasurementsChecked ? 'checked' : ''}
                       onchange="handleToggleLineMeasurements(event, '${elementId}')"
                       onclick="event.stopPropagation()">
                <span>${i18n.t('toggle_line_measurements')}</span>
            </label>
        </div>`;
    }

    const isPoint = element.type === 'point';
    let changeIconItem = '';
    let copyCoordinatesItem = '';
    if (isPoint) {
        changeIconItem = `
        <div class="context-menu-item" data-action="change-icon" data-element-id="${elementId}" onclick="handleChangeElementIcon('${elementId}')">
            <i class="iconoir-edit"></i>
            <span>${i18n.t('change_icon')}</span>
        </div>`;
        copyCoordinatesItem = `
        <div class="context-menu-item" data-action="copy-coordinates" data-element-id="${elementId}" onclick="handleCopyPointCoordinates('${elementId}')">
            <i class="iconoir-copy"></i>
            <span>${i18n.t('copy_coordinates')}</span>
        </div>`;
    }

    return `
        <div class="context-menu-item" data-action="rename-element" data-element-id="${elementId}">
            <i class="iconoir-edit-pencil"></i>
            <span>Rename</span>
        </div>
        <div class="context-menu-item" data-action="zoom-element" data-element-id="${elementId}">
            <i class="iconoir-zoom-in"></i>
            <span>Zoom To</span>
        </div>
        ${changeIconItem}
        ${copyCoordinatesItem}
        <div class="context-menu-divider"></div>
        <div class="context-menu-item checkbox-item" data-action="toggle-icon" data-element-id="${elementId}">
            <label class="checkbox-label">
                <input type="checkbox" ${showIconChecked ? 'checked' : ''}
                       onchange="handleToggleElementIcon(event, '${elementId}')"
                       onclick="event.stopPropagation()">
                <span>Show Icon</span>
            </label>
        </div>
        <div class="context-menu-item checkbox-item" data-action="toggle-name" data-element-id="${elementId}">
            <label class="checkbox-label">
                <input type="checkbox" ${showNameChecked ? 'checked' : ''}
                       onchange="handleToggleElementName(event, '${elementId}')"
                       onclick="event.stopPropagation()">
                <span>Show Name</span>
            </label>
        </div>
        ${legendToggle}
        ${measurementsToggle}
        <div class="context-menu-divider"></div>
        <div class="context-menu-item has-submenu">
            <i class="iconoir-drag-hand-gesture"></i>
            <span>${i18n.t('element_move_to_layer')}</span>
            <div class="context-submenu">
                ${createLayersSubmenu(elementId)}
            </div>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" data-action="delete-element" data-element-id="${elementId}">
            <i class="iconoir-trash"></i>
            <span>Delete</span>
        </div>
    `;
}

/**
 * Find which layer contains a specific element
 */
function findLayerIdByElementId(elementId) {
    // Convert elementId to string for comparison (IDs from HTML are strings)
    const elementIdStr = String(elementId);

    for (const layer of layersManager.layers) {
        const element = layer.elements.find(el => String(el.id) === elementIdStr);
        if (element) {
            return layer.id;
        }
    }
    return null;
}

/**
 * Create submenu with list of layers for "Move to Layer"
 */
function createLayersSubmenu(elementId) {
    const currentLayerId = findLayerIdByElementId(elementId);

    if (!currentLayerId) {
        logger.warn('Could not find layer for element:', elementId);
        return '<div class="context-submenu-item" style="opacity: 0.5; padding: 8px 12px;">No layers found</div>';
    }

    const submenuHTML = layersManager.layers
        .map(layer => {
            const isCurrentLayer = layer.id === currentLayerId;
            const disabledClass = isCurrentLayer ? 'current-layer' : '';
            const checkIcon = isCurrentLayer ? '<i class="iconoir-check"></i>' : '';

            return `
                <div class="context-submenu-item ${disabledClass}"
                     data-action="move-element-to-layer"
                     data-element-id="${elementId}"
                     data-target-layer-id="${layer.id}">
                    ${checkIcon}
                    <span style="color: ${layer.color}; margin-left: ${isCurrentLayer ? '0' : '1.2rem'};">
                        ${layer.name}
                    </span>
                </div>
            `;
        })
        .join('');

    return submenuHTML;
}

/**
 * Close context menu
 */
function closeContextMenu() {
    const menu = document.querySelector('.layers-context-menu');
    if (menu) {
        menu.remove();
    }
}

/**
 * Show context menu
 */
function showContextMenu(content, x, y) {
    closeContextMenu();

    const menu = document.createElement('div');
    menu.className = 'layers-context-menu';
    menu.innerHTML = content;

    // Disable transitions temporarily to avoid animation from off-screen
    menu.style.transition = 'none';

    // Position off-screen first to measure size
    menu.style.left = '-9999px';
    menu.style.top = '-9999px';
    document.body.appendChild(menu);

    // Get menu dimensions
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate position with boundary checks
    let finalX = x;
    let finalY = y;

    // Check right boundary
    if (x + menuRect.width > viewportWidth) {
        finalX = viewportWidth - menuRect.width - 10; // 10px margin
    }

    // Check bottom boundary
    if (y + menuRect.height > viewportHeight) {
        finalY = viewportHeight - menuRect.height - 10; // 10px margin
    }

    // Ensure menu doesn't go off-screen on left/top
    finalX = Math.max(10, finalX);
    finalY = Math.max(10, finalY);

    // Apply final position
    menu.style.left = finalX + 'px';
    menu.style.top = finalY + 'px';

    // Re-enable transitions after positioning (next frame)
    requestAnimationFrame(() => {
        menu.style.transition = '';
    });

    // Add click handlers to menu items (both main items and submenu items)
    const mainItems = menu.querySelectorAll('.context-menu-item');
    const submenuItems = menu.querySelectorAll('.context-submenu-item');
    const allItems = [...mainItems, ...submenuItems];

    allItems.forEach(item => {
        const action = item.dataset.action;
        const layerId = item.dataset.layerId;
        const elementId = item.dataset.elementId;

        if (!action || item.classList.contains('disabled') || item.classList.contains('current-layer')) return;

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            closeContextMenu();

            // Execute action based on data-action attribute
            setTimeout(() => {
                switch(action) {
                    // Layer actions
                    case 'rename-layer':
                        renameLayerPrompt(layerId);
                        break;
                    case 'change-layer-color':
                        changeLayerColorPrompt(layerId);
                        break;
                    case 'duplicate-layer':
                        duplicateLayer(layerId);
                        break;
                    case 'toggle-all-labels':
                        toggleAllLayerLabels(layerId);
                        break;
                    case 'delete-layer':
                        deleteLayerPrompt(layerId);
                        break;
                    // Element actions
                    case 'rename-element':
                        renameElementPrompt(elementId);
                        break;
                    case 'zoom-element':
                        zoomToElement(elementId);
                        break;
                    case 'move-element-to-layer':
                        const targetLayerId = item.dataset.targetLayerId;
                        if (targetLayerId && elementId) {
                            moveElementToLayer(elementId, targetLayerId);
                        }
                        break;
                    case 'delete-element':
                        deleteElementPrompt(elementId);
                        break;
                    default:
                        console.warn('Unknown action:', action);
                }
            }, 10);
        });
    });

    // Handle submenu visibility with JavaScript (better than pure CSS)
    const submenuParents = menu.querySelectorAll('.has-submenu');
    submenuParents.forEach(parent => {
        const submenu = parent.querySelector('.context-submenu');
        if (!submenu) return;

        let hideTimeout = null;

        const showSubmenu = () => {
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }
            submenu.style.display = 'block';
        };

        const hideSubmenu = () => {
            hideTimeout = setTimeout(() => {
                submenu.style.display = 'none';
            }, 200); // 200ms delay before hiding
        };

        parent.addEventListener('mouseenter', showSubmenu);
        parent.addEventListener('mouseleave', hideSubmenu);
        submenu.addEventListener('mouseenter', showSubmenu);
        submenu.addEventListener('mouseleave', hideSubmenu);
    });

    // Close on click outside
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            closeContextMenu();
            document.removeEventListener('click', closeMenu);
        }
    };

    setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

/**
 * Create new layer
 */
async function createNewLayer() {
    if (!layersManager) {
        console.error('LayersManager not initialized yet');
        showWarning('Please wait for the map to fully load');
        return;
    }
    const name = await promptUser('Enter layer name:', `Layer ${layersManager.layers.length + 1}`, '');
    if (name) {
        layersManager.createLayer(name, true);
    }
}

/**
 * Rename layer
 */
async function renameLayerPrompt(layerId) {
    const layer = layersManager.getLayer(layerId);
    if (layer) {
        const newName = await promptUser('Enter new layer name:', layer.name, '');
        if (newName && newName.trim()) {
            layersManager.renameLayer(layerId, newName.trim());
        }
    }
}

/**
 * Change layer color
 */
function changeLayerColorPrompt(layerId) {
    const layer = layersManager.getLayer(layerId);
    if (layer) {
        // Create a color picker dialog
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = layer.color || '#3498db';

        // Position it near the cursor but make it invisible
        // Using opacity instead of display:none fixes positioning issues
        colorInput.style.position = 'fixed';
        colorInput.style.opacity = '0';
        colorInput.style.pointerEvents = 'none';
        colorInput.style.left = '50%';
        colorInput.style.top = '50%';
        colorInput.style.transform = 'translate(-50%, -50%)';
        colorInput.style.width = '0px';
        colorInput.style.height = '0px';

        // Add to DOM (required for some browsers)
        document.body.appendChild(colorInput);

        colorInput.addEventListener('change', (e) => {
            const newColor = e.target.value;
            layersManager.setLayerColor(layerId, newColor);
            // Remove from DOM after use
            document.body.removeChild(colorInput);
        });

        // Also remove if canceled (click outside)
        colorInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (colorInput.parentNode) {
                    document.body.removeChild(colorInput);
                }
            }, 100);
        });

        colorInput.click();
    }
}

/**
 * Delete layer
 */
async function deleteLayerPrompt(layerId) {
    const layer = layersManager.getLayer(layerId);
    if (layer) {
        if (await confirmAction(`Delete layer "${layer.name}" and all its ${layer.elements.length} elements?`)) {
            layersManager.deleteLayer(layerId);
        }
    }
}

/**
 * Duplicate layer
 */
function duplicateLayer(layerId) {
    const layer = layersManager.getLayer(layerId);
    if (layer) {
        const newLayer = layersManager.createLayer(`${layer.name} (Copy)`);
        showInfo('Layer duplicated (elements copy coming soon)');
    }
}

/**
 * Rename element
 */
async function renameElementPrompt(elementId) {
    // Find element
    let element = null;
    for (let layer of layersManager.layers) {
        element = layer.elements.find(e => e.id == elementId);
        if (element) break;
    }

    if (element) {
        const newName = await promptUser('Enter new name:', element.name || '', '');
        if (newName !== null && newName.trim()) {
            layersManager.renameElement(elementId, newName.trim());
        }
    } else {
        showError('Error: Element not found in layers');
    }
}

/**
 * Delete element
 */
async function deleteElementPrompt(elementId) {
    if (await confirmAction('Delete this element?')) {
        layersManager.removeElement(elementId);
    }
}

/**
 * Zoom to element
 */
function zoomToElement(elementId) {
    // Find element (use == for type coercion)
    let element = null;
    for (let layer of layersManager.layers) {
        element = layer.elements.find(e => e.id == elementId);
        if (element) break;
    }

    if (!element) {
        console.error('❌ Element not found:', elementId);
        return;
    }

    // Get the map instance
    const map = (window.app && window.app.map) || layersManager.app.map;

    if (!map) {
        console.error('❌ Map instance not found');
        return;
    }

    // Try different ways to get bounds/position
    let bounds = null;
    let latlng = null;

    // Try mapObject first
    if (element.mapObject) {
        if (element.mapObject.getBounds) {
            bounds = element.mapObject.getBounds();
        } else if (element.mapObject.getLatLng) {
            latlng = element.mapObject.getLatLng();
        }
    }

    // Try marker
    if (!bounds && !latlng && element.marker) {
        if (element.marker.getLatLng) {
            latlng = element.marker.getLatLng();
        }
    }

    // Try data object
    if (!bounds && !latlng && element.data) {
        if (element.data.type === 'node' && element.data.lat && element.data.lon) {
            latlng = { lat: element.data.lat, lng: element.data.lon };
        }
        else if (element.data.type === 'way' && element.data.geometry && element.data.geometry.length > 0) {
            const pts = element.data.geometry.map(p => ({ lat: p.lat, lng: p.lon || p.lng }));
            bounds = _makeBounds(pts);
        }
        else if (element.data.type === 'relation' && element.data.center) {
            latlng = { lat: element.data.center.lat, lng: element.data.center.lon || element.data.center.lng };
        }
        else if (element.data.latlng) {
            latlng = element.data.latlng;
        }
        else if (element.data.center) {
            latlng = element.data.center;
        }
        else if (element.data.points && element.data.points.length > 0) {
            bounds = _makeBounds(element.data.points);
        }
        else if (element.data.polygon && element.data.polygon.length > 0) {
            bounds = _makeBounds(element.data.polygon);
        }
        else if (element.data.coordinates && element.data.coordinates.length > 0) {
            bounds = _makeBounds(element.data.coordinates);
        }
    }

    // Zoom to the element
    const engine = window.app && window.app.engine;
    if (bounds && engine) {
        engine.fitBoundsFromPoints(bounds._points || []);
    } else if (latlng && engine) {
        engine.setView(latlng, 15);
    } else {
        console.warn('⚠️ Could not determine zoom location for element:', element);
    }
}

/**
 * Drag and drop handlers
 */
let draggedElementId = null;

function onElementDragStart(event) {
    draggedElementId = event.target.dataset.elementId;
    event.target.style.opacity = '0.5';
}

function onElementDragEnd(event) {
    event.target.style.opacity = '1';
}

function onLayerDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function onLayerDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

function onLayerDrop(event, targetLayerId) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');

    if (draggedElementId) {
        layersManager.moveElement(draggedElementId, targetLayerId);
        draggedElementId = null;
    }
}

/**
 * Handler functions for context menu actions
 * These close the menu after the action completes
 */
function handleRenameElement(elementId) {
    closeContextMenu();
    setTimeout(() => renameElementPrompt(elementId), 10);
}

function handleZoomToElement(elementId) {
    closeContextMenu();
    setTimeout(() => zoomToElement(elementId), 10);
}

function handleDeleteElement(elementId) {
    closeContextMenu();
    setTimeout(() => deleteElementPrompt(elementId), 10);
}

function handleRenameLayer(layerId) {
    closeContextMenu();
    setTimeout(() => renameLayerPrompt(layerId), 10);
}

function handleChangeLayerColor(layerId) {
    closeContextMenu();
    setTimeout(() => changeLayerColorPrompt(layerId), 10);
}

function handleDuplicateLayer(layerId) {
    closeContextMenu();
    setTimeout(() => duplicateLayer(layerId), 10);
}

function handleDeleteLayer(layerId) {
    closeContextMenu();
    setTimeout(() => deleteLayerPrompt(layerId), 10);
}

/**
 * Toggle all labels in a layer
 */
function toggleAllLayerLabels(layerId) {
    const layer = layersManager.getLayer(layerId);
    if (!layer) return;

    // Count visible vs hidden labels
    let visibleCount = 0;
    let totalCount = 0;

    layer.elements.forEach(element => {
        // Check if element has a label (or can have one)
        if (element.data || element.label) {
            totalCount++;
            const showName = (element.data && element.data.showName !== undefined)
                ? element.data.showName
                : element.showName !== undefined
                    ? element.showName
                    : true;
            if (showName) {
                visibleCount++;
            }
        }
    });

    // Determine target state: if >50% visible, hide all; otherwise show all
    const targetState = visibleCount <= (totalCount / 2);

    // Apply to all elements
    layer.elements.forEach(element => {
        // Update state
        element.showName = targetState;
        if (element.data) {
            element.data.showName = targetState;
        }

        // Apply visibility using app.js functions if available
        if (window.app) {
            window.app.currentEditElement = { element: element.data || element, elementType: element.type };
            window.app.toggleElementName(targetState);
            window.app.currentEditElement = null;
        }
    });

    // Save changes
    layersManager.save();

    // Update UI
    layersManager.updateUI();

    // Show toast notification
    const message = targetState
        ? i18n.t('layers_all_labels_shown').replace('{name}', layer.name)
        : i18n.t('layers_all_labels_hidden').replace('{name}', layer.name);
    showToast(message);
}

/**
 * Toggle element icon visibility
 */
function handleToggleElementIcon(event, elementId) {
    event.stopPropagation();
    const checked = event.target.checked;

    // Find element in layers
    const element = layersManager.findElementById(elementId);
    if (!element) return;

    // Update state
    element.showIcon = checked;
    if (element.data) {
        element.data.showIcon = checked;
    }

    // Apply visibility using app.js functions if available
    if (window.app) {
        window.app.currentEditElement = { element: element.data || element, elementType: element.type };
        window.app.toggleElementIcon(checked);
        window.app.currentEditElement = null;
    }

    layersManager.save();
}

/**
 * Toggle element name visibility
 */
function handleToggleElementName(event, elementId) {
    event.stopPropagation();
    const checked = event.target.checked;

    // Find element in layers
    const element = layersManager.findElementById(elementId);
    if (!element) return;

    // Update state
    element.showName = checked;
    if (element.data) {
        element.data.showName = checked;
    }

    // Apply visibility using app.js functions if available
    if (window.app) {
        window.app.currentEditElement = { element: element.data || element, elementType: element.type };
        window.app.toggleElementName(checked);
        window.app.currentEditElement = null;
    }

    layersManager.save();
}

/**
 * Toggle element legend (area info) visibility for polygons and circles
 */
function handleToggleElementLegend(event, elementId) {
    event.stopPropagation();
    const checked = event.target.checked;

    // Find element in layers
    const element = layersManager.findElementById(elementId);
    if (!element) return;

    // Only for polygons and circles
    if (element.type !== 'polygon' && element.type !== 'circle') return;

    // Update state
    element.showLegend = checked;
    if (element.data) {
        element.data.showLegend = checked;
    }

    // Update the label content
    if (window.app && window.app.labelManager) {
        const labelId = `label_${element.type}_${element.id}`;
        const labelData = element.data || element;

        // Regenerate label with new showLegend state
        window.app.labelManager.updateLabel(labelId, labelData);
    }

    layersManager.save();
}

/**
 * Toggle line measurements visibility
 */
function handleToggleLineMeasurements(event, elementId) {
    event.stopPropagation();
    const checked = event.target.checked;

    // Find element in layers
    const element = layersManager.findElementById(elementId);
    if (!element) return;

    // Only for lines
    if (element.type !== 'line') return;

    // Update state
    element.showMeasurements = checked;
    if (element.data) {
        element.data.showMeasurements = checked;
    }

    // Toggle measurements using app.js function if available
    if (window.app) {
        window.app.currentEditElement = { element: element.data || element, elementType: element.type };
        window.app.toggleLineMeasurements();
        window.app.currentEditElement = null;
    }

    layersManager.save();
}

/**
 * Change the icon of a point element
 */
/**
 * Copy point coordinates to clipboard
 */
function handleCopyPointCoordinates(elementId) {
    closeContextMenu();

    // Find element in layers
    const element = layersManager.findElementById(elementId);
    if (!element) return;

    // Only for points
    if (element.type !== 'point') return;

    // Get coordinates from element data
    const latlng = element.data?.latlng || element.latlng;
    if (!latlng) {
        console.warn('No coordinates found for element:', elementId);
        return;
    }

    const coords = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
    navigator.clipboard.writeText(coords).then(() => {
        showToast(i18n.t('coordinates_copied'), 'success');
    }).catch(err => {
        console.error('Failed to copy coordinates:', err);
        showError(i18n.t('copy_failed'));
    });
}

async function handleChangeElementIcon(elementId) {
    // Find element in layers
    const element = layersManager.findElementById(elementId);
    if (!element) return;

    // Only for points
    if (element.type !== 'point') return;

    // Get the marker
    const marker = element.marker || element.data?.marker;
    if (!marker) {
        console.warn('No marker found for element:', elementId);
        return;
    }

    // Get the element's layer color
    let layerColor = '#e74c3c'; // Default color
    const layerId = findLayerIdByElementId(elementId);
    if (layerId) {
        const layer = layersManager.getLayer(layerId);
        if (layer) {
            layerColor = layer.color;
        }
    }

    // Check if icon picker is available
    if (!window.iconPicker) {
        console.error('Icon picker not initialized');
        if (window.showError) {
            window.showError('Icon picker not available');
        }
        return;
    }

    // Close the context menu
    if (window.hideContextMenu) {
        window.hideContextMenu();
    }

    // Open icon picker modal
    window.iconPicker.openModal(layerColor, async (iconName) => {
        try {
            // Create the new icon (28px by default)
            const newIconEl = await window.iconPicker.createIcon(iconName, layerColor);

            // Update the marker DOM — replace content and resize
            const markerEl = marker.getElement ? marker.getElement() : null;
            if (markerEl && newIconEl) {
                const labels = markerEl.querySelectorAll('.rhinomap-label');
                markerEl.innerHTML = newIconEl.innerHTML;
                markerEl.className = newIconEl.className;
                markerEl.style.cssText = newIconEl.style.cssText;
                labels.forEach(l => markerEl.appendChild(l));
            }

            // Store the new icon type
            element.iconType = 'svg';
            element.iconName = iconName;
            if (element.data) {
                element.data.iconType = 'svg';
                element.data.iconName = iconName;
            }

            // Update label using LabelManager if available
            if (window.app && window.app.labelManager) {
                const labelId = `label_point_${element.id}`;
                const pointData = element.data || element;

                // Check if label is currently visible
                const wasVisible = window.app.labelManager.isVisible(labelId);

                // Remove old label
                window.app.labelManager.removeLabel(labelId);

                // Create new label with correct offset for SVG icon
                const newLabel = window.app.labelManager.createLabel('point', pointData, {
                    position: element.latlng || element.data?.latlng,
                    visible: wasVisible !== null ? wasVisible : true,
                    labelId: labelId,
                    iconType: 'svg',
                    marker: marker,
                    color: layerColor
                });

                // Update references
                if (element.label) element.label = newLabel;
                if (element.data && element.data.label) element.data.label = newLabel;
            }

            // Save changes
            layersManager.save();
            if (window.app) {
                window.app.saveToLocalStorage();
            }

            // Show success notification
            if (window.showToast) {
                window.showToast(i18n.t('icon_changed_successfully') || `Icon changed to ${iconName}`, 'success');
            }

        } catch (error) {
            console.error('Failed to change icon:', error);
            if (window.showError) {
                window.showError(i18n.t('error_change_icon') || 'Failed to change icon');
            }
        }
    });
}

/**
 * Move an element from its current layer to a target layer
 * @param {string} elementId - The element ID
 * @param {string} targetLayerId - The target layer ID
 */
function moveElementToLayer(elementId, targetLayerId) {
    if (!layersManager || !elementId || !targetLayerId) return;

    const sourceLayerId = findLayerIdByElementId(elementId);
    if (!sourceLayerId) {
        console.warn('Could not find source layer for element:', elementId);
        return;
    }

    if (sourceLayerId === targetLayerId) {
        return;
    }

    const sourceLayer = layersManager.getLayer(sourceLayerId);
    const targetLayer = layersManager.getLayer(targetLayerId);

    if (!sourceLayer || !targetLayer) {
        console.warn('Source or target layer not found');
        return;
    }

    // Use LayersManager.moveElement() which handles:
    // - Moving the element between layers
    // - Updating the color to match target layer
    // - Updating all mapObjects (markers, polylines, etc.)
    layersManager.moveElement(elementId, targetLayerId);

    // Update UI
    updateLayersUI();

    // Show success notification
    if (window.showToast) {
        window.showToast(`Element moved to layer "${targetLayer.name}"`, 'success');
    }

}

/**
 * Highlight a layer and element in the sidebar when clicked on map
 * @param {string} layerId - The layer ID
 * @param {string} elementId - The element ID
 */
function highlightLayerAndElement(layerId, elementId) {
    if (!layerId || !elementId) return;

    // 1. Activate the layer
    selectLayer(layerId);

    // 2. Ensure layer is expanded
    const elementsDiv = document.getElementById(`elements-${layerId}`);
    const layerItem = document.querySelector(`[data-layer-id="${layerId}"]`);

    if (elementsDiv && elementsDiv.style.display === 'none') {
        // Expand the layer
        const arrow = layerItem?.querySelector('.layer-arrow');
        elementsDiv.style.display = 'block';
        if (arrow) {
            arrow.style.transform = 'rotate(180deg)';
        }
    }

    // 3. Highlight the specific element
    const elementItem = document.querySelector(`[data-element-id="${elementId}"]`);
    if (elementItem) {
        // Remove previous highlights
        document.querySelectorAll('.element-item.highlighted').forEach(el => {
            el.classList.remove('highlighted');
        });

        // Add highlight to this element
        elementItem.classList.add('highlighted');

        // Scroll into view
        elementItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Remove highlight after 2 seconds
        setTimeout(() => {
            elementItem.classList.remove('highlighted');
        }, 2000);
    }
}

// Make functions globally available
window.initLayersUI = initLayersUI;
window.updateLayersUI = updateLayersUI;
window.selectLayer = selectLayer;
window.toggleLayerVisibility = toggleLayerVisibility;
window.toggleElementVisibility = toggleElementVisibility;
window.toggleLayerExpansion = toggleLayerExpansion;
window.showLayerMenu = showLayerMenu;
window.showLayerMenuHandler = showLayerMenuHandler;
window.showElementMenu = showElementMenu;
window.showElementMenuHandler = showElementMenuHandler;
window.closeContextMenu = closeContextMenu;
window.createNewLayer = createNewLayer;
window.renameLayerPrompt = renameLayerPrompt;
window.changeLayerColorPrompt = changeLayerColorPrompt;
window.deleteLayerPrompt = deleteLayerPrompt;
window.duplicateLayer = duplicateLayer;
window.renameElementPrompt = renameElementPrompt;
window.deleteElementPrompt = deleteElementPrompt;
window.moveElementToLayer = moveElementToLayer;
window.highlightLayerAndElement = highlightLayerAndElement;
window.zoomToElement = zoomToElement;
window.onElementDragStart = onElementDragStart;
window.onElementDragEnd = onElementDragEnd;
window.onLayerDragOver = onLayerDragOver;
window.onLayerDragLeave = onLayerDragLeave;
window.onLayerDrop = onLayerDrop;
window.handleRenameElement = handleRenameElement;
window.handleZoomToElement = handleZoomToElement;
window.handleDeleteElement = handleDeleteElement;
window.handleRenameLayer = handleRenameLayer;
window.handleChangeLayerColor = handleChangeLayerColor;
window.handleDuplicateLayer = handleDuplicateLayer;
window.handleDeleteLayer = handleDeleteLayer;
window.handleToggleElementIcon = handleToggleElementIcon;
window.handleToggleElementName = handleToggleElementName;
window.handleToggleElementLegend = handleToggleElementLegend;
window.handleToggleLineMeasurements = handleToggleLineMeasurements;
window.handleChangeElementIcon = handleChangeElementIcon;
window.toggleAllLayerLabels = toggleAllLayerLabels;
