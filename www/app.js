import init, { init as gameInit, create_vehicle, update, set_entity_target, select_entity, deselect_entity, set_group_target, get_selected_entities, create_base, build_floor, get_entity_info, create_random_alert, clear_selection } from '../pkg/nation_of_last_land.js';

class GameDemo {
    constructor() {
        this.app = null;
        this.entities = new Map();
        this.isInitialized = false;
        this.lastUpdate = Date.now();
        this.selectedEntityIds = new Set(); // Changed to support multiple selections
        this.combatEffects = new Map(); // Store active combat visualizations
        this.isSelecting = false; // Prevent concurrent selection operations
        this.selectionOperationInProgress = false; // Prevent server sync from overriding local selection changes
        this.autoUpdateEnabled = false; // Auto update disabled by default
        this.dragSelection = {
            isDragging: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            graphics: null,
            hasDragged: false,
            justFinishedDrag: false,
            mouseLeftCanvas: false
        };

        this.initPixi();
        this.bases = new Map(); // Store base information
        this.setupEventListeners();
        this.updateStatus('WebAssembly module loading...');
    }

    async init() {
        try {
            // Initialize WebAssembly module
            await init();
            this.updateStatus('WebAssembly loaded successfully!\nInitializing game automatically...');

            // Automatically initialize the game
            await this.initializeGame();
        } catch (error) {
            this.updateStatus(`Error loading WebAssembly: ${error.message}`);
            console.error('WASM init error:', error);
        }
    }

    initPixi() {
        // Get canvas container dimensions
        const canvasContainer = document.querySelector('.game-container');
        const rect = canvasContainer.getBoundingClientRect();

        // Create Pixi.js application with responsive size
        this.app = new PIXI.Application({
            width: rect.width,
            height: rect.height,
            backgroundColor: 0x2a2a2a,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        // Add canvas to DOM
        const canvas = document.getElementById('game-canvas');
        canvas.parentNode.replaceChild(this.app.view, canvas);

        // Store original game world size
        this.gameWidth = 800;
        this.gameHeight = 600;

        // Add a grid for reference
        this.drawGrid();

        // Add mouse event handlers for canvas (DOM events)
        this.app.view.addEventListener('mousedown', (event) => this.handleMouseDown(event));
        this.app.view.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        this.app.view.addEventListener('mouseup', (event) => this.handleMouseUp(event));
        this.app.view.addEventListener('mouseleave', (event) => this.handleMouseLeave(event));
        this.app.view.addEventListener('mouseenter', (event) => this.handleMouseEnter(event));
        this.app.view.addEventListener('click', (event) => this.handleCanvasClick(event));
        this.app.view.addEventListener('dblclick', (event) => this.handleDoubleClick(event));
        this.app.view.addEventListener('contextmenu', (event) => {
            event.preventDefault(); // Prevent browser context menu
        });

        // Add resize handler
        window.addEventListener('resize', () => this.handleResize());

        // Clean up any existing graphics on startup
        this.cleanupOrphanedGraphics();

        // Start render loop
        this.app.ticker.add(() => this.gameLoop());
    }

    handleResize() {
        const canvasContainer = document.querySelector('.game-container');
        const rect = canvasContainer.getBoundingClientRect();

        // Resize Pixi application
        this.app.renderer.resize(rect.width, rect.height);

        // Update grid
        this.updateGrid();
    }

    updateGrid() {
        // Clear existing grid
        if (this.gridContainer) {
            this.app.stage.removeChild(this.gridContainer);
        }

        // Create new grid
        this.gridContainer = new PIXI.Container();
        const gridGraphics = new PIXI.Graphics();
        gridGraphics.lineStyle(1, 0x444444, 0.5);

        const gridSize = 50;
        const scaleX = this.app.screen.width / this.gameWidth;
        const scaleY = this.app.screen.height / this.gameHeight;

        // Vertical lines
        for (let x = 0; x <= this.gameWidth; x += gridSize) {
            const scaledX = x * scaleX;
            gridGraphics.moveTo(scaledX, 0);
            gridGraphics.lineTo(scaledX, this.app.screen.height);
        }

        // Horizontal lines
        for (let y = 0; y <= this.gameHeight; y += gridSize) {
            const scaledY = y * scaleY;
            gridGraphics.moveTo(0, scaledY);
            gridGraphics.lineTo(this.app.screen.width, scaledY);
        }

        this.gridContainer.addChild(gridGraphics);
        this.app.stage.addChildAt(this.gridContainer, 0); // Add behind other elements
    }

    drawGrid() {
        this.updateGrid();
    }

    setupEventListeners() {
        document.getElementById('init-btn').addEventListener('click', () => this.initializeGame());
        document.getElementById('spawn-btn').addEventListener('click', () => this.spawnVehicle());
        document.getElementById('create-base-btn').addEventListener('click', () => this.createBase());
        document.getElementById('build-floor-btn').addEventListener('click', () => this.buildFloor());
        document.getElementById('create-alert-btn').addEventListener('click', () => this.createRandomAlert());
        document.getElementById('update-btn').addEventListener('click', () => this.manualUpdate());
        document.getElementById('clear-selection-btn').addEventListener('click', () => this.clearAllSelections());
        document.getElementById('start-auto-update-btn').addEventListener('click', () => this.startAutoUpdate());
        document.getElementById('stop-auto-update-btn').addEventListener('click', () => this.stopAutoUpdate());
        document.getElementById('update-once-btn').addEventListener('click', () => this.updateOnce());

        // Keyboard event listeners
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
    }


    handleCanvasClick(event) {
        if (!this.isInitialized) return;

        // Prevent click if we just finished a drag selection
        if (this.dragSelection.justFinishedDrag) {
            this.dragSelection.justFinishedDrag = false;
            return;
        }

        // Debug info
        const rect = this.app.view.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        // Check if click is within canvas bounds
        if (screenX < 0 || screenX > this.app.screen.width || screenY < 0 || screenY > this.app.screen.height) {
            return;
        }

        // Convert screen coordinates to game coordinates
        const gameX = (screenX / this.app.screen.width) * this.gameWidth;
        const gameY = (screenY / this.app.screen.height) * this.gameHeight;

        // First, try to select entity at clicked position (higher priority)
        const entityAtPosition = this.findEntityAtPosition(screenX, screenY);

        if (entityAtPosition !== null) {
            const entity = this.entities.get(entityAtPosition);
            // Check if clicked entity is an alert
            if (entity && entity.entityType === 'alert' && this.selectedEntityIds.size > 0) {
                // Clicked directly on an alert with selected vehicles - set it as target
                this.setGroupTarget(entity.gameX, entity.gameY);
                this.updateStatus(`Moving group to alert at (${entity.gameX.toFixed(1)}, ${entity.gameY.toFixed(1)})`);
                // Add visual feedback - highlight the target alert
                this.highlightTargetAlert({ x: entity.gameX, y: entity.gameY, id: entityAtPosition });
            } else {
                // Handle entity click - always exclusive selection since user has only mouse
                this.handleEntityClick(entityAtPosition, false, event);
            }
        } else if (this.selectedEntityIds.size > 0) {
            // Check if clicked on an alert (using more precise radius)
            const alertAtPosition = this.findAlertAtPosition(gameX, gameY);

            if (alertAtPosition !== null) {
                // Clicked on an alert - set it as target for selected group
                this.setGroupTarget(alertAtPosition.x, alertAtPosition.y);
                this.updateStatus(`Moving group to alert at (${alertAtPosition.x.toFixed(1)}, ${alertAtPosition.y.toFixed(1)})`);
                // Add visual feedback - highlight the target alert
                this.highlightTargetAlert(alertAtPosition);
            } else {
                // Clicked on empty space - set movement target for group
                this.setGroupTarget(gameX, gameY);
            }
        } else {
            // Clicked on empty space with no selection - clear any existing selection
            this.clearAllSelections();
        }
    }

    // Clean up any orphaned graphics objects
    cleanupOrphanedGraphics() {
        let removedCount = 0;
        // Find and remove any PIXI.Graphics objects that might be selection rectangles
        // Be ultra aggressive - remove all graphics except essential ones
        for (let i = this.app.stage.children.length - 1; i >= 0; i--) {
            const child = this.app.stage.children[i];
            if (child instanceof PIXI.Graphics) {
                // Keep only essential graphics: grid, target indicators, alert highlights
                const isEssential = child === this.gridContainer ||
                    child === this.targetIndicator ||
                    child === this.alertHighlight;
                if (!isEssential) {
                    console.log('Removing orphaned graphics:', child);
                    this.app.stage.removeChild(child);
                    removedCount++;
                }
            }
        }
        if (removedCount > 0) {
            console.log(`Cleaned up ${removedCount} orphaned graphics objects`);
        }
    }

    handleMouseDown(event) {
        if (!this.isInitialized) return;

        // Check mouse button type
        if (event.button === 2) { // Right mouse button
            this.handleRightMouseDown(event);
            return; // Prevent further processing for right click
        }

        // Left mouse button - handle selection/drag
        // Clean up any orphaned graphics before starting new drag
        this.cleanupOrphanedGraphics();

        const rect = this.app.view.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        // If we have a pending drag from mouse leaving canvas, clean it up
        if (this.dragSelection.mouseLeftCanvas) {
            this.dragSelection.isDragging = false;
            this.dragSelection.mouseLeftCanvas = false;
            if (this.dragSelection.graphics) {
                this.app.stage.removeChild(this.dragSelection.graphics);
                this.dragSelection.graphics = null;
            }
        }

        // Always start drag selection tracking, but only show rectangle if dragged enough
        this.dragSelection.isDragging = true;
        this.dragSelection.startX = screenX;
        this.dragSelection.startY = screenY;
        this.dragSelection.currentX = screenX;
        this.dragSelection.currentY = screenY;
        this.dragSelection.hasDragged = false; // Track if user actually dragged
        this.dragSelection.mouseLeftCanvas = false; // Reset flag for new drag

        // Remove any existing selection rectangle first
        if (this.dragSelection.graphics) {
            this.app.stage.removeChild(this.dragSelection.graphics);
            this.dragSelection.graphics = null;
        }

        // Create selection rectangle (initially invisible)
        this.dragSelection.graphics = new PIXI.Graphics();
        this.dragSelection.graphics.alpha = 0; // Start invisible
        this.dragSelection.graphics.zIndex = 1000; // High z-index
        this.app.stage.addChild(this.dragSelection.graphics);
        console.log('Created selection graphics:', this.dragSelection.graphics);

    }

    handleRightMouseDown(event) {
        const rect = this.app.view.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        // Check if right-click is on an entity to show info
        const entityAtPosition = this.findEntityAtPosition(screenX, screenY);

        if (entityAtPosition !== null) {
            // Right-clicked on an entity - show its information
            const entity = this.entities.get(entityAtPosition);
            if (entity) {
                let entityType = entity.entityType === 'vehicle' ? entity.vehicleType : entity.entityType;
                const faction = entity.faction || 'Unknown';

                // Fallback for unknown types based on faction
                if (!entityType || entityType === 'unknown') {
                    if (faction === 'Wild') {
                        entityType = 'wild_creature';
                    } else if (faction === 'Neutral') {
                        entityType = 'neutral_entity';
                    } else {
                        entityType = 'unit';
                    }
                }

                this.updateStatus(`Entity #${entityAtPosition}: ${entityType} (${faction}) - Info displayed in panel`);
            }
            this.displayEntityInfo(entityAtPosition);
        } else {
            // Right-clicked on empty space - clear selection
            this.clearAllSelections();
        }
    }

    handleMouseMove(event) {
        if (!this.dragSelection.isDragging) {
            return;
        }

        // If mouse left canvas during this drag, don't continue selection and clean up
        if (this.dragSelection.mouseLeftCanvas) {
            this.dragSelection.isDragging = false;
            this.dragSelection.hasDragged = false;
            // Make sure graphics is removed if it somehow still exists
            if (this.dragSelection.graphics) {
                this.app.stage.removeChild(this.dragSelection.graphics);
                this.dragSelection.graphics = null;
            }
            return;
        }

        const rect = this.app.view.getBoundingClientRect();
        const newX = event.clientX - rect.left;
        const newY = event.clientY - rect.top;

        // Clamp coordinates to canvas bounds to prevent issues when mouse goes outside
        const clampedX = Math.max(0, Math.min(newX, this.app.screen.width));
        const clampedY = Math.max(0, Math.min(newY, this.app.screen.height));

        this.dragSelection.currentX = clampedX;
        this.dragSelection.currentY = clampedY;

        // Check if user has dragged enough to show selection rectangle
        const dragDistance = Math.sqrt(
            (clampedX - this.dragSelection.startX) ** 2 +
            (clampedY - this.dragSelection.startY) ** 2
        );

        if (dragDistance > 5) { // Minimum drag distance of 5 pixels
            if (!this.dragSelection.hasDragged) {
                this.dragSelection.hasDragged = true;
            }

            // Update selection rectangle
            if (this.dragSelection.graphics) {
                this.dragSelection.graphics.clear();
                this.dragSelection.graphics.lineStyle(2, 0x00FF00, 0.8);
                this.dragSelection.graphics.beginFill(0x00FF00, 0.2);

                const x = Math.min(this.dragSelection.startX, this.dragSelection.currentX);
                const y = Math.min(this.dragSelection.startY, this.dragSelection.currentY);
                const width = Math.abs(this.dragSelection.currentX - this.dragSelection.startX);
                const height = Math.abs(this.dragSelection.currentY - this.dragSelection.startY);

                // Only draw and make visible if rectangle has meaningful size
                if (width > 1 && height > 1) {
                    this.dragSelection.graphics.drawRect(x, y, width, height);
                    this.dragSelection.graphics.alpha = 1; // Make visible
                } else {
                    this.dragSelection.graphics.alpha = 0; // Keep invisible
                }
            }
        }
    }

    handleMouseUp(event) {
        // Clean up any leftover graphics from interrupted drags
        if (this.dragSelection.graphics && !this.dragSelection.isDragging) {
            console.log('Removing selection graphics:', this.dragSelection.graphics);
            this.app.stage.removeChild(this.dragSelection.graphics);
            this.dragSelection.graphics = null;
            return;
        }

        if (!this.dragSelection.isDragging) return;

        // If mouse left canvas during this drag, cancel selection entirely
        if (this.dragSelection.mouseLeftCanvas) {
            this.dragSelection.isDragging = false;
            this.dragSelection.mouseLeftCanvas = false;

            // Remove selection rectangle
            if (this.dragSelection.graphics) {
                console.log('Removing selection graphics:', this.dragSelection.graphics);
                this.app.stage.removeChild(this.dragSelection.graphics);
                this.dragSelection.graphics = null;
            }
            return;
        }

        const wasDragging = this.dragSelection.hasDragged;
        this.dragSelection.isDragging = false;

        // Prevent concurrent selection operations
        if (this.isSelecting) return;
        this.isSelecting = true;
        this.selectionOperationInProgress = true;

        try {
            // Only process selection if user actually dragged
            if (wasDragging) {
                // Calculate selection rectangle bounds
                const x = Math.min(this.dragSelection.startX, this.dragSelection.currentX);
                const y = Math.min(this.dragSelection.startY, this.dragSelection.currentY);
                const width = Math.abs(this.dragSelection.currentX - this.dragSelection.startX);
                const height = Math.abs(this.dragSelection.currentY - this.dragSelection.startY);

                // Only process if rectangle has meaningful size (not just a click)
                if (width > 5 && height > 5) {
                    // Prevent the click event from firing
                    this.dragSelection.justFinishedDrag = true;


                    // Find all entities within the selection rectangle and try to select them
                    const entitiesInRectangle = [];
                    for (const [id, entity] of this.entities) {
                        // Check if entity is within selection bounds
                        if (entity.container.x >= x && entity.container.x <= x + width &&
                            entity.container.y >= y && entity.container.y <= y + height) {
                            entitiesInRectangle.push(id);
                        }
                    }

                    if (entitiesInRectangle.length > 0) {
                        // Update selection: keep intersection, add new ones that can be selected, remove old ones not in new selection
                        const successfullySelectedEntities = new Set();

                        // Remove units that are currently selected but not in the new selection
                        for (const entityId of this.selectedEntityIds) {
                            if (!entitiesInRectangle.includes(entityId)) {
                                this.deselectEntity(entityId, true);
                            } else {
                                // Keep units that are still in selection
                                successfullySelectedEntities.add(entityId);
                            }
                        }

                        // Try to add units from new selection that aren't already selected (respecting 12 unit limit)
                        let addedCount = 0;
                        for (const entityId of entitiesInRectangle) {
                            if (!this.selectedEntityIds.has(entityId)) {
                                // Check if we would exceed the 12 unit limit
                                if (successfullySelectedEntities.size >= 12) {
                                    break; // Stop adding more units
                                }
                                const selectionSuccess = this.selectEntity(entityId, true, false); // exclusive = false for drag selection
                                if (selectionSuccess) {
                                    successfullySelectedEntities.add(entityId);
                                    addedCount++;
                                }
                            } else {
                                successfullySelectedEntities.add(entityId);
                            }
                        }

                        const selectedCount = successfullySelectedEntities.size;
                        const totalFound = entitiesInRectangle.length;
                        if (selectedCount > 0) {
                            if (totalFound > 12) {
                                this.updateStatus(`Selected ${selectedCount} units (found ${totalFound}, limited to 12)`);
                            } else {
                                this.updateStatus(`Selected ${selectedCount} units (updated group)`);
                            }
                        } else {
                            this.updateStatus('No selectable units in selection area');
                        }
                    }
                } else {
                    // Rectangle too small, treat as click - don't prevent click event
                    this.dragSelection.justFinishedDrag = false;
                }
            }
        } finally {
            this.isSelecting = false;
            // Reset flag after a short delay to allow server sync to complete
            setTimeout(() => {
                this.selectionOperationInProgress = false;
            }, 100);

            // Remove selection rectangle
            if (this.dragSelection.graphics) {
                console.log('Removing selection graphics:', this.dragSelection.graphics);
                this.app.stage.removeChild(this.dragSelection.graphics);
                this.dragSelection.graphics = null;
            }
        }
    }

    handleMouseLeave(event) {
        if (!this.dragSelection.isDragging) return;

        // Mark that mouse left canvas during drag
        this.dragSelection.mouseLeftCanvas = true;

        // Cancel drag selection when mouse leaves canvas
        this.dragSelection.isDragging = false;
        this.dragSelection.hasDragged = false;

        // Remove selection rectangle if it exists
        if (this.dragSelection.graphics) {
            this.app.stage.removeChild(this.dragSelection.graphics);
            this.dragSelection.graphics = null;
        }
    }

    handleMouseEnter(event) {
        // Mouse entered canvas - no action needed for drag selection
        // mouseLeftCanvas flag is reset in handleMouseDown for new drags
    }

    handleDoubleClick(event) {
        if (!this.isInitialized) return;

        // Get coordinates of double click
        const rect = this.app.view.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        // Find entity at double-click position
        const entityId = this.findEntityAtPosition(screenX, screenY);

        if (entityId !== null) {
            // Double-clicked on an entity - select all units of same type in visibility range
            this.selectSameTypeUnits(entityId);
        } else {
            // Double-clicked on empty space - select all player units
            this.selectAllPlayerUnits();
            this.updateStatus(`Double click on empty space - Selected all player units`);
        }
    }

    selectAllPlayerUnits() {
        // Prevent concurrent selection operations
        if (this.isSelecting) return;
        this.isSelecting = true;
        this.selectionOperationInProgress = true;

        try {
            // Clear current selection first
            this.clearAllSelections(true);

            // Find all player units (faction 'Player' and entity type 'vehicle')
            const playerUnits = [];
            for (const [id, entity] of this.entities) {
                if (entity.faction === 'Player' && entity.entityType === 'vehicle') {
                    playerUnits.push(id);
                }
            }

            if (playerUnits.length > 0) {
                // Select all player units
                for (const unitId of playerUnits) {
                    this.selectEntity(unitId, true, false); // exclusive = false for multi-select
                }

                this.updateStatus(`Selected all ${playerUnits.length} player units`);
            } else {
                this.updateStatus('No player units found to select');
            }
        } finally {
            this.isSelecting = false;
            // Reset flag after a delay to allow server sync to complete
            setTimeout(() => {
                this.selectionOperationInProgress = false;
            }, 1000);
        }
    }

    selectSameTypeUnits(entityId) {
        // Prevent concurrent selection operations
        if (this.isSelecting) return;
        this.isSelecting = true;
        this.selectionOperationInProgress = true;

        try {
            const targetEntity = this.entities.get(entityId);
            if (!targetEntity) {
                this.updateStatus('Target entity not found');
                return;
            }

            // Clear current selection first
            this.clearAllSelections(true);

            // Get target entity type information
            const targetVehicleType = targetEntity.vehicleType;
            const targetEntityType = targetEntity.entityType;
            const targetFaction = targetEntity.faction;

            // Find all units of the same type within visibility range (200 game units)
            const visibilityRange = 200;
            const sameTypeUnits = [];

            for (const [id, entity] of this.entities) {
                // Check if entity is the same type and faction
                if (entity.entityType === targetEntityType &&
                    entity.vehicleType === targetVehicleType &&
                    entity.faction === targetFaction) {

                    // Check if entity is within visibility range
                    const distance = Math.sqrt(
                        (entity.gameX - targetEntity.gameX) ** 2 +
                        (entity.gameY - targetEntity.gameY) ** 2
                    );

                    if (distance <= visibilityRange) {
                        sameTypeUnits.push(id);
                    }
                }
            }

            if (sameTypeUnits.length > 0) {
                // Limit to 12 units maximum
                const unitsToSelect = sameTypeUnits.slice(0, 12);

                // Select units - first one with exclusive=true, others with exclusive=false
                let selectedCount = 0;
                for (let i = 0; i < unitsToSelect.length; i++) {
                    const unitId = unitsToSelect[i];
                    const isFirst = i === 0;
                    const selectionSuccess = this.selectEntity(unitId, true, !isFirst); // exclusive = true for first, false for others
                    if (selectionSuccess) {
                        selectedCount++;
                    }
                }

                const totalFound = sameTypeUnits.length;
                const actuallySelected = selectedCount;
                if (totalFound > 12) {
                    this.updateStatus(`Selected ${actuallySelected} ${targetVehicleType} units of same type (found ${totalFound}, limited to 12)`);
                } else {
                    this.updateStatus(`Selected ${actuallySelected} ${targetVehicleType} units of same type`);
                }
            } else {
                this.updateStatus(`No other ${targetVehicleType} units found in visibility range`);
            }
        } finally {
            this.isSelecting = false;
            // Reset flag after a short delay to allow server sync to complete
            setTimeout(() => {
                this.selectionOperationInProgress = false;
            }, 100);
        }
    }

    selectAllPlayerUnitsAtBase() {
        // Prevent concurrent selection operations
        if (this.isSelecting) return;
        this.isSelecting = true;
        this.selectionOperationInProgress = true;

        try {
            // Clear current selection first
            this.clearAllSelections(true);

            // Find the first base (assuming player has one main base)
            if (this.bases.size === 0) {
                this.updateStatus('No base found to select units from');
                return;
            }

            const baseId = Array.from(this.bases.keys())[0];
            const base = this.bases.get(baseId);

            // Find all player units within base radius (50 game units)
            const baseRadius = 50;
            const unitsAtBase = [];

            for (const [id, entity] of this.entities) {
                // Check if entity is a player vehicle
                if (entity.faction === 'Player' && entity.entityType === 'vehicle') {
                    // Check if entity is within base radius
                    const distance = Math.sqrt(
                        (entity.gameX - base.x) ** 2 +
                        (entity.gameY - base.y) ** 2
                    );

                    if (distance <= baseRadius) {
                        unitsAtBase.push(id);
                    }
                }
            }

            if (unitsAtBase.length > 0) {
                // Select units (respecting the 12 unit limit)
                let selectedCount = 0;
                for (let i = 0; i < unitsAtBase.length && selectedCount < 12; i++) {
                    const unitId = unitsAtBase[i];
                    const isFirst = i === 0;
                    const selectionSuccess = this.selectEntity(unitId, true, !isFirst); // exclusive = true for first, false for others
                    if (selectionSuccess) {
                        selectedCount++;
                    }
                }

                this.updateStatus(`Selected ${selectedCount} player units at base`);
            } else {
                this.updateStatus('No player units found at base');
            }
        } finally {
            this.isSelecting = false;
            // Reset flag after a short delay to allow server sync to complete
            setTimeout(() => {
                this.selectionOperationInProgress = false;
            }, 100);
        }
    }

    handleEntityClick(entityId, isMultiSelect) {
        const entity = this.entities.get(entityId);
        if (!entity) return;

        console.log('handleEntityClick called for entity:', entityId, 'type:', entity.entityType, 'faction:', entity.faction);

        // Prevent concurrent selection operations
        if (this.isSelecting) return;
        this.isSelecting = true;
        this.selectionOperationInProgress = true;

        try {
            // Check modifier keys for selection behavior
            const ctrlPressed = event && (event.ctrlKey || event.metaKey); // Ctrl or Cmd
            const shiftPressed = event && event.shiftKey;

            // Check if this is an attack scenario (different faction and hostile)
            if (this.selectedEntityIds.size > 0 && !isMultiSelect && !ctrlPressed && !shiftPressed) {
                const targetEntity = entity;
                let shouldAttack = false;

                // Check if any selected unit is hostile towards this target
                for (const selectedId of this.selectedEntityIds) {
                    const selectedEntity = this.entities.get(selectedId);
                    if (selectedEntity && this.areFactionsHostile(selectedEntity.faction, targetEntity.faction)) {
                        shouldAttack = true;
                        break;
                    }
                }

                if (shouldAttack) {
                    // Clear any alert highlights before attacking
                    if (this.alertHighlight) {
                        this.app.stage.removeChild(this.alertHighlight);
                        this.alertHighlight = null;
                    }
                    // Set the clicked unit as target for all selected units
                    this.setGroupTarget(targetEntity.gameX, targetEntity.gameY);
                    this.updateStatus(`Group attacking enemy unit!`);
                    return;
                }
            }

            // Handle selection based on modifiers
            let selectionSuccessful = false;

            if (ctrlPressed) {
                // Ctrl + click: toggle selection (add/remove from group)
                if (this.selectedEntityIds.has(entityId)) {
                    this.deselectEntity(entityId, true);
                    this.updateStatus(`Removed unit ${entityId} from selection`);
                } else {
                    // Check group size limit (12 units)
                    if (this.selectedEntityIds.size >= 12) {
                        this.updateStatus(`Cannot select more than 12 units in a group (current: ${this.selectedEntityIds.size})`);
                        return;
                    }
                    selectionSuccessful = this.selectEntity(entityId, true, false); // exclusive = false
                    if (selectionSuccessful) {
                        this.updateStatus(`Added unit ${entityId} to selection (${this.selectedEntityIds.size} total)`);
                    }
                }
            } else if (shiftPressed) {
                // Shift + click: extend selection (add to group without clearing)
                if (!this.selectedEntityIds.has(entityId)) {
                    // Check group size limit (12 units)
                    if (this.selectedEntityIds.size >= 12) {
                        this.updateStatus(`Cannot select more than 12 units in a group (current: ${this.selectedEntityIds.size})`);
                        return;
                    }
                    selectionSuccessful = this.selectEntity(entityId, true, false); // exclusive = false
                    if (selectionSuccessful) {
                        this.updateStatus(`Extended selection to ${this.selectedEntityIds.size} units`);
                    }
                }
            } else {
                // Check if we have any immobile units (bases) selected
                let hasImmobileSelected = false;
                for (const selectedId of this.selectedEntityIds) {
                    const selectedEntity = this.entities.get(selectedId);
                    if (selectedEntity && selectedEntity.entityType === 'base') {
                        hasImmobileSelected = true;
                        break;
                    }
                }

                if (hasImmobileSelected) {
                    // If we have immobile units selected, add the new unit to selection instead of replacing
                    // Check group size limit (12 units) - enforce on client side
                    if (this.selectedEntityIds.size >= 12) {
                        this.updateStatus(`Cannot select more than 12 units in a group (current: ${this.selectedEntityIds.size})`);
                        return;
                    }
                    selectionSuccessful = this.selectEntity(entityId, true, false); // exclusive = false
                } else {
                    // Regular click: single selection
                    this.clearAllSelections(true);
                    selectionSuccessful = this.selectEntity(entityId, true, true); // exclusive = true
                }

                // If selection failed (e.g., clicking on non-selectable entity like alert),
                // clear all selections to provide feedback that the click was registered
                if (!selectionSuccessful) {
                    this.clearAllSelections(true);
                }
            }

            // Display entity information always when clicking on an entity
            this.displayEntityInfo(entityId);
        } finally {
            this.isSelecting = false;
            // Reset flag after a short delay to allow server sync to complete
            setTimeout(() => {
                this.selectionOperationInProgress = false;
            }, 100);
        }
    }

    findEntityAtPosition(x, y) {
        // Find entity closest to click position (within 20 pixels)
        // Priority order: bases > vehicles > alerts (bases have highest priority)
        console.log('findEntityAtPosition called with click at:', x, y);
        console.log('Total entities in game:', this.entities.size);
        for (const [id, entity] of this.entities) {
            console.log(`Entity ${id}: type=${entity.entityType}, faction=${entity.faction}, pos=(${entity.container.x.toFixed(1)}, ${entity.container.y.toFixed(1)})`);
        }

        let closestEntity = null;
        let closestDistance = 20;
        let foundEntities = [];
        let priorityEntities = { base: null, vehicle: null, alert: null };

        for (const [id, entity] of this.entities) {
            // Use current container position for accurate hit detection
            const distance = Math.sqrt((entity.container.x - x) ** 2 + (entity.container.y - y) ** 2);
            if (distance < closestDistance) {
                foundEntities.push({ id, entityType: entity.entityType, distance: distance.toFixed(2) });

                // Track entities by priority
                if (entity.entityType === 'base' && (!priorityEntities.base || distance < priorityEntities.base.distance)) {
                    priorityEntities.base = { id, distance };
                } else if (entity.entityType === 'vehicle' && (!priorityEntities.vehicle || distance < priorityEntities.vehicle.distance)) {
                    priorityEntities.vehicle = { id, distance };
                } else if (entity.entityType === 'alert' && (!priorityEntities.alert || distance < priorityEntities.alert.distance)) {
                    priorityEntities.alert = { id, distance };
                }
            }
        }

        // Select entity with highest priority (bases first, then vehicles, then alerts)
        if (priorityEntities.base) {
            closestEntity = priorityEntities.base.id;
        } else if (priorityEntities.vehicle) {
            closestEntity = priorityEntities.vehicle.id;
        } else if (priorityEntities.alert) {
            closestEntity = priorityEntities.alert.id;
        }

        if (foundEntities.length > 0) {
            console.log('findEntityAtPosition found entities near click:', foundEntities);
            console.log('Priority selection - base:', priorityEntities.base?.id, 'vehicle:', priorityEntities.vehicle?.id, 'alert:', priorityEntities.alert?.id);
            console.log('Selected entity:', closestEntity, 'type:', this.entities.get(closestEntity)?.entityType);
        }

        return closestEntity;
    }

    findAlertAtPosition(gameX, gameY) {
        // Find alert closest to click position (within 15 game units - matches visual size)
        // Alerts are drawn with radius 8-12, so 15 is a reasonable click radius
        // Use already rendered entities instead of calling update()
        let closestAlert = null;
        let closestDistance = 15; // Reduced from 50 to match visual size

        for (const [id, entity] of this.entities) {
            if (entity.entityType === 'alert') {
                const distance = Math.sqrt((entity.gameX - gameX) ** 2 + (entity.gameY - gameY) ** 2);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestAlert = { x: entity.gameX, y: entity.gameY, id: id };
                }
            }
        }

        return closestAlert;
    }

    selectEntityAtPosition(x, y) {
        const entityId = this.findEntityAtPosition(x, y);
        if (entityId !== null) {
            this.selectEntity(entityId, false, true); // exclusive = true for single position select
        } else {
            this.deselectEntity();
        }
    }

    selectEntity(entityId, bypassCheck = false, exclusive = true) {
        // Prevent concurrent operations unless bypassed (for internal calls)
        if (!bypassCheck && this.isSelecting) return false;

        // Don't re-select if already selected
        if (this.selectedEntityIds.has(entityId)) return true;

        // Check group size limit (12 units) - enforce on client side
        if (this.selectedEntityIds.size >= 12) {
            console.log('Selection limit reached (12 units), cannot select more');
            return false;
        }

        // Select entity via API
        try {
            const result = select_entity(entityId, exclusive);
            const selectionResult = JSON.parse(result);
            if (selectionResult.success) {
                this.selectedEntityIds.add(entityId);
                const entity = this.entities.get(entityId);
                if (entity) {
                    // Add selection indicator (blue border for player units, red for enemies)
                    const selectionGraphics = new PIXI.Graphics();
                    const isEnemy = entity.faction === 'Enemy' || entity.faction === 'Wild';
                    const color = isEnemy ? 0xFF0000 : 0x0080FF; // Red for enemies, blue for player
                    selectionGraphics.lineStyle(3, color, 1);
                    selectionGraphics.drawCircle(0, 0, 12);
                    entity.container.addChild(selectionGraphics);
                    entity.selectionIndicator = selectionGraphics;
                }

                const count = this.selectedEntityIds.size;
                if (count === 1) {
                    this.updateStatus(`Entity ${entityId} selected.`);
                } else {
                    this.updateStatus(`${count} entities selected. Click on map to set group movement target.`);
                }
                return true;
            } else {
                // Don't log error for expected cases (non-player units, non-movable units)
                // Only log unexpected errors
                if (!selectionResult.message.includes('is not a player unit') &&
                    !selectionResult.message.includes('cannot move')) {
                    console.error('Selection failed:', selectionResult.message);
                }
                return false;
            }
        } catch (error) {
            console.error('Selection error:', error);
            return false;
        }
    }

    deselectEntity(entityId, bypassCheck = false) {
        // Prevent concurrent operations unless bypassed (for internal calls)
        if (!bypassCheck && this.isSelecting) return;

        if (!this.selectedEntityIds.has(entityId)) return;

        // Always remove from local selection first
        this.selectedEntityIds.delete(entityId);
        const entity = this.entities.get(entityId);
        if (entity && entity.selectionIndicator) {
            entity.container.removeChild(entity.selectionIndicator);
            entity.selectionIndicator = null;
        }

        // Deselect entity via API (may fail if entity is already destroyed)
        try {
            const result = deselect_entity(entityId);
            const selectionResult = JSON.parse(result);
            if (!selectionResult.success) {
                // Entity may have been destroyed - this is expected
                console.log(`Entity ${entityId} deselection failed (may be destroyed):`, selectionResult.message);
            }
        } catch (error) {
            console.error('Deselection API error:', error);
        }

        const count = this.selectedEntityIds.size;
        if (count === 0) {
            this.updateStatus('Selection cleared.');
        } else {
            this.updateStatus(`${count} entities selected.`);
        }
    }

    clearAllSelections(bypassCheck = false) {
        // Prevent concurrent selection operations unless bypassed (for internal calls)
        if (!bypassCheck && this.isSelecting) return;
        this.selectionOperationInProgress = true;

        // Clear selection on server
        try {
            const result = clear_selection();
            const clearResult = JSON.parse(result);
            if (!clearResult.success) {
                console.error('Failed to clear selection on server:', clearResult.message);
            }
        } catch (error) {
            console.error('Error clearing selection on server:', error);
        }

        // Clear all visual indicators locally
        for (const entityId of this.selectedEntityIds) {
            const entity = this.entities.get(entityId);
            if (entity && entity.selectionIndicator) {
                entity.container.removeChild(entity.selectionIndicator);
                entity.selectionIndicator = null;
            }
        }
        this.selectedEntityIds.clear();
        this.updateStatus('Selection cleared.');
        this.updateEntityInfo(null); // Hide entity info when selection is cleared

        // Reset flag after a short delay to allow server sync to complete
        setTimeout(() => {
            this.selectionOperationInProgress = false;
        }, 100);
    }


    async setEntityTarget(entityId, x, y) {
        try {
            const result = set_entity_target(entityId, x, y);
            const movementResult = JSON.parse(result);

            if (movementResult.success) {
                this.updateStatus(`Target set: ${movementResult.message}`);
                // Add visual target indicator
                this.showTargetIndicator(x, y);
                // Clear selection after setting target
                this.clearAllSelections();
                // Clear any alert highlights
                if (this.alertHighlight) {
                    this.app.stage.removeChild(this.alertHighlight);
                    this.alertHighlight = null;
                }
            } else {
                this.updateStatus(`Failed to set target: ${movementResult.message}`);
                console.error('Failed to set target:', movementResult.message);
            }
        } catch (error) {
            this.updateStatus(`Error setting target: ${error.message}`);
            console.error('Target setting error:', error);
        }
    }

    async setGroupTarget(x, y) {
        try {
            const result = set_group_target(x, y);
            const groupResult = JSON.parse(result);

            if (groupResult.success) {
                this.updateStatus(`Group target set: ${groupResult.message}`);
                // Add visual target indicator
                this.showTargetIndicator(x, y);
                // Don't clear selection for group commands
                // Clear any alert highlights
                if (this.alertHighlight) {
                    this.app.stage.removeChild(this.alertHighlight);
                    this.alertHighlight = null;
                }
            } else {
                this.updateStatus(`Failed to set group target: ${groupResult.message}`);
                console.error('Failed to set group target:', groupResult.message);
            }
        } catch (error) {
            this.updateStatus(`Error setting group target: ${error.message}`);
            console.error('Group target setting error:', error);
        }
    }

    showTargetIndicator(gameX, gameY) {
        // Remove existing target indicator
        if (this.targetIndicator) {
            this.app.stage.removeChild(this.targetIndicator);
        }

        // Convert game coordinates to screen coordinates
        const scaleX = this.app.screen.width / this.gameWidth;
        const scaleY = this.app.screen.height / this.gameHeight;
        const screenX = gameX * scaleX;
        const screenY = gameY * scaleY;

        // Create new target indicator
        const graphics = new PIXI.Graphics();
        graphics.lineStyle(2, 0xFF0000, 1);
        graphics.drawCircle(0, 0, 10);
        graphics.moveTo(-15, 0);
        graphics.lineTo(15, 0);
        graphics.moveTo(0, -15);
        graphics.lineTo(0, 15);

        graphics.x = screenX;
        graphics.y = screenY;

        this.app.stage.addChild(graphics);
        this.targetIndicator = graphics;

        // Remove after 2 seconds
        setTimeout(() => {
            if (this.targetIndicator) {
                this.app.stage.removeChild(this.targetIndicator);
                this.targetIndicator = null;
            }
        }, 2000);
    }

    highlightTargetAlert(alert) {
        // Remove existing alert highlight
        if (this.alertHighlight) {
            this.app.stage.removeChild(this.alertHighlight);
        }

        // Find the alert entity ID
        let alertId = null;
        for (const [id, entity] of this.entities) {
            if (entity.entityType === 'alert' &&
                Math.abs(entity.gameX - alert.x) < 1 &&
                Math.abs(entity.gameY - alert.y) < 1) {
                alertId = id;
                break;
            }
        }

        // Convert game coordinates to screen coordinates
        const scaleX = this.app.screen.width / this.gameWidth;
        const scaleY = this.app.screen.height / this.gameHeight;
        const screenX = alert.x * scaleX;
        const screenY = alert.y * scaleY;

        // Create highlight circle around the alert
        const graphics = new PIXI.Graphics();
        graphics.lineStyle(4, 0x00FF00, 1); // Green highlight
        graphics.drawCircle(0, 0, 20); // Larger than alert to show it's selected
        graphics.alertId = alertId; // Store alert ID for cleanup

        graphics.x = screenX;
        graphics.y = screenY;

        this.app.stage.addChild(graphics);
        this.alertHighlight = graphics;

        // Remove highlight after 3 seconds
        setTimeout(() => {
            if (this.alertHighlight && this.alertHighlight === graphics) {
                this.app.stage.removeChild(this.alertHighlight);
                this.alertHighlight = null;
            }
        }, 3000);
    }

    async initializeGame() {
        // Clean up any orphaned graphics before initializing
        this.cleanupOrphanedGraphics();

        try {
            const result = gameInit();
            const gameState = JSON.parse(result);
            this.isInitialized = true;
            this.autoUpdateEnabled = false; // Auto update disabled on initialization
            let status = `Game initialized!\nTime: ${gameState.time}\nEntities: ${gameState.entities_count}\nAlerts: ${gameState.alerts_count}\nAuto update: disabled\nUse "Start Auto Update" or "Update Once" to continue`;
            if (gameState.debug_messages && gameState.debug_messages.length > 0) {
                status += '\n\nDebug:\n' + gameState.debug_messages.join('\n');
            }
            this.updateStatus(status);
        } catch (error) {
            this.updateStatus(`Game initialization failed: ${error.message}`);
            console.error('Game init error:', error);
        }
    }

    async spawnVehicle() {
        if (!this.isInitialized) {
            this.updateStatus('Please initialize the game first!');
            return;
        }

        const vehicleType = document.getElementById('vehicle-type').value;
        const x = parseFloat(document.getElementById('spawn-x').value);
        const y = parseFloat(document.getElementById('spawn-y').value);

        try {
            const result = create_vehicle(vehicleType, x, y);
            const creationResult = JSON.parse(result);

            if (creationResult.success) {
                // Trigger immediate update to get the new entity in game state
                try {
                    const updateResult = update(0.016); // Small dt to trigger update
                    const gameState = JSON.parse(updateResult);
                    this.syncEntitiesWithGameState(gameState.entities);
                } catch (error) {
                    console.error('Update after spawn error:', error);
                }

                // Select only the newly spawned vehicle
                this.selectEntity(creationResult.id, true, true);

                this.updateStatus(`Vehicle spawned and selected!\nID: ${creationResult.id}\nType: ${vehicleType}\nPosition: (${x}, ${y})`);
            } else {
                this.updateStatus(`Failed to spawn vehicle: ${creationResult.message}`);
            }
        } catch (error) {
            this.updateStatus(`Vehicle creation failed: ${error.message}`);
            console.error('Vehicle creation error:', error);
        }
    }

    async createBase() {
        if (!this.isInitialized) {
            this.updateStatus('Please initialize the game first!');
            return;
        }

        const x = parseFloat(document.getElementById('base-x').value);
        const y = parseFloat(document.getElementById('base-y').value);

        try {
            const result = create_base(x, y);
            const baseInfo = JSON.parse(result);

            // Store base information
            this.bases.set(baseInfo.id, baseInfo);

            // Trigger immediate update to sync state
            try {
                const updateResult = update(0.016);
                const gameState = JSON.parse(updateResult);

                this.syncEntitiesWithGameState(gameState.entities);
            } catch (error) {
                console.error('Update after base creation error:', error);
            }

            this.updateStatus(`Base created!\nID: ${baseInfo.id}\nPosition: (${x}, ${y})\nFloors: ${baseInfo.floors.length}\nStorage: ${baseInfo.current_storage_usage}/${baseInfo.total_storage_capacity}`);
        } catch (error) {
            this.updateStatus(`Base creation failed: ${error.message}`);
            console.error('Base creation error:', error);
        }
    }

    async buildFloor() {
        if (!this.isInitialized) {
            this.updateStatus('Please initialize the game first!');
            return;
        }

        const floorType = document.getElementById('floor-type').value;

        // For now, build on the first base (we'll improve this later)
        if (this.bases.size === 0) {
            this.updateStatus('No bases available. Create a base first!');
            return;
        }

        const baseId = Array.from(this.bases.keys())[0]; // Get first base

        try {
            const result = build_floor(baseId, floorType);
            const updatedBase = JSON.parse(result);

            // Update stored base information
            this.bases.set(updatedBase.id, updatedBase);

            // Trigger immediate update to sync state
            try {
                const updateResult = update(0.016);
                const gameState = JSON.parse(updateResult);
                this.syncEntitiesWithGameState(gameState.entities);
            } catch (error) {
                console.error('Update after floor building error:', error);
            }

            this.updateStatus(`Floor construction started!\nBase ID: ${baseId}\nFloor Type: ${floorType}\nTotal Floors: ${updatedBase.floors.length}`);
        } catch (error) {
            this.updateStatus(`Floor building failed: ${error.message}`);
            console.error('Floor building error:', error);
        }
    }

    async createRandomAlert() {
        if (!this.isInitialized) {
            this.updateStatus('Please initialize the game first!');
            return;
        }

        try {
            const result = create_random_alert();
            const alertResult = JSON.parse(result);

            if (alertResult.success) {
                // Trigger immediate update to get the new alert in game state
                try {
                    const updateResult = update(0.016); // Small dt to trigger update
                    const gameState = JSON.parse(updateResult);
                    this.syncEntitiesWithGameState(gameState.entities);
                } catch (error) {
                    console.error('Update after alert creation error:', error);
                }

                this.updateStatus(`Random alert created!\nID: ${alertResult.id}\n${alertResult.message}`);
            } else {
                this.updateStatus(`Failed to create alert: ${alertResult.message}`);
            }
        } catch (error) {
            this.updateStatus(`Alert creation failed: ${error.message}`);
            console.error('Alert creation error:', error);
        }
    }

    createEntitySprite(id, x, y, vehicleType, faction = null, entityType = 'vehicle') {
        // Convert game coordinates to screen coordinates
        const scaleX = this.app.screen.width / this.gameWidth;
        const scaleY = this.app.screen.height / this.gameHeight;
        const screenX = x * scaleX;
        const screenY = y * scaleY;

        // Create a sprite for the entity
        const graphics = new PIXI.Graphics();

        // Different colors and shapes for different entity types
        // Colors depend on faction: Player uses bright colors, Enemy uses dark colors, Wild uses brown, Neutral uses cyan
        let color;
        let alpha = 1.0; // Default opacity

        // Check entity type first for special cases
        console.log('Creating entity sprite:', { id, x, y, vehicleType, faction, entityType });
        if (entityType === 'base') {
            // Base entities - blue square
            color = 0x2196F3; // Blue for bases
            graphics.beginFill(color);
            graphics.drawRect(-15, -15, 30, 30);
            // Add floor indicators as small circles around the base
            if (vehicleType && vehicleType.startsWith('floors_')) {
                const floorCount = parseInt(vehicleType.split('_')[1]) || 1;
                for (let i = 0; i < floorCount; i++) {
                    const angle = (i / floorCount) * Math.PI * 2;
                    const radius = 20;
                    const fx = Math.cos(angle) * radius;
                    const fy = Math.sin(angle) * radius;
                    graphics.drawCircle(fx, fy, 3);
                }
            }
        } else {
            // Handle other entity types by vehicle type
            console.log('Switch case for vehicleType:', vehicleType);
            switch (vehicleType) {
                case 'scout':
                    if (faction === 'Neutral') {
                        color = 0x00BCD4; // Cyan for neutral
                    } else if (faction === 'Wild') {
                        color = 0x8D6E63; // Brown for wild creatures
                    } else if (faction === 'Enemy') {
                        color = 0x2E7D32; // Dark green for enemy
                    } else {
                        color = 0x4CAF50; // Bright green for player
                    }
                    graphics.beginFill(color);
                    graphics.drawCircle(0, 0, 8);
                    break;
                case 'tank':
                    if (faction === 'Neutral') {
                        color = 0x00BCD4; // Cyan for neutral
                    } else if (faction === 'Wild') {
                        color = 0x8D6E63; // Brown for wild creatures
                    } else if (faction === 'Enemy') {
                        color = 0xB71C1C; // Dark red for enemy
                    } else {
                        color = 0xFF5722; // Bright red for player
                    }
                    graphics.beginFill(color);
                    graphics.drawRect(-10, -8, 20, 16);
                    break;
                case 'transport':
                    if (faction === 'Neutral') {
                        color = 0x00BCD4; // Cyan for neutral
                    } else if (faction === 'Wild') {
                        color = 0x8D6E63; // Brown for wild creatures
                    } else if (faction === 'Enemy') {
                        color = 0x0D47A1; // Dark blue for enemy
                    } else {
                        color = 0x2196F3; // Bright blue for player
                    }
                    graphics.beginFill(color);
                    graphics.drawRect(-12, -10, 24, 20);
                    break;
                default:
                    // Check if this is an alert (any vehicleType with '_' in it)
                    if (vehicleType && vehicleType.includes('_')) {
                        let alertType, alertState;
                        [alertType, alertState] = vehicleType.split('_');

                        if (alertState === 'Hidden') {
                            // Hidden alerts - dark yellow with question mark style
                            color = 0xB8860B; // Dark yellow
                            alpha = 0.7;
                            graphics.lineStyle(2, color, alpha);
                            graphics.drawCircle(0, 0, 8);
                            // Question mark shape
                            graphics.moveTo(-3, -6);
                            graphics.lineTo(3, -6);
                            graphics.lineTo(3, -2);
                            graphics.lineTo(0, 0);
                            graphics.lineTo(0, 4);
                            graphics.moveTo(0, 6);
                            graphics.lineTo(0, 7);
                        } else {
                            // Revealed alerts - dark yellow question mark in circle
                            color = 0xB8860B; // Dark yellow
                            graphics.lineStyle(3, color, 1);
                            graphics.drawCircle(0, 0, 12);
                            // Question mark shape (larger for revealed alerts)
                            graphics.moveTo(-4, -8);
                            graphics.lineTo(4, -8);
                            graphics.lineTo(4, -3);
                            graphics.lineTo(0, -1);
                            graphics.lineTo(0, 5);
                            graphics.moveTo(0, 7);
                            graphics.lineTo(0, 8);
                        }
                        break;
                    }
                    // Fallback for unknown vehicle types - green circle
                    if (faction === 'Neutral') {
                        color = 0x00BCD4; // Cyan for neutral
                    } else if (faction === 'Wild') {
                        color = 0x8D6E63; // Brown for wild creatures
                    } else if (faction === 'Enemy') {
                        color = 0xB71C1C; // Dark red for enemy
                    } else {
                        color = 0x4CAF50; // Bright green for player (default)
                    }
                    graphics.beginFill(color);
                    graphics.drawCircle(0, 0, 8);
                    break;
            }
        }

        graphics.alpha = alpha;

        graphics.endFill();

        // Add a small label
        const text = new PIXI.Text(id.toString(), {
            fontSize: 10,
            fill: 0xFFFFFF,
            align: 'center'
        });
        text.anchor.set(0.5);
        text.y = -20;

        const container = new PIXI.Container();
        container.addChild(graphics);
        container.addChild(text);
        container.x = screenX;
        container.y = screenY;

        this.app.stage.addChild(container);
        this.entities.set(id, {
            container,
            x: screenX,
            y: screenY,
            gameX: x, // Store both screen and game coordinates
            gameY: y,
            vehicleType,
            entityType,
            faction
        });
    }

    manualUpdate() {
        if (!this.isInitialized) {
            this.updateStatus('Please initialize the game first!');
            return;
        }

        const now = Date.now();
        const dt = (now - this.lastUpdate) / 1000; // Convert to seconds
        this.lastUpdate = now;

        try {
            const result = update(dt);
            const gameState = JSON.parse(result);
            this.updateStatus(`Game updated!\nTime: ${gameState.time.toFixed(2)}s\nEntities: ${gameState.entities_count}\nAlerts: ${gameState.alerts_count}\nDelta Time: ${dt.toFixed(3)}s`);
        } catch (error) {
            this.updateStatus(`Game update failed: ${error.message}`);
            console.error('Game update error:', error);
        }
    }

    startAutoUpdate() {
        this.autoUpdateEnabled = true;
        this.updateStatus('Auto update started - game will update automatically');
    }

    stopAutoUpdate() {
        this.autoUpdateEnabled = false;
        this.updateStatus('Auto update stopped - use "Update Once" or "Start Auto Update" to continue');
    }

    updateOnce() {
        if (!this.isInitialized) {
            this.updateStatus('Please initialize the game first!');
            return;
        }

        const now = Date.now();
        const dt = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        try {
            const result = update(dt);
            const gameState = JSON.parse(result);
            this.syncEntitiesWithGameState(gameState.entities);
            this.updateStatus(`Single update completed!\nTime: ${gameState.time.toFixed(2)}s\nEntities: ${gameState.entities_count}\nAlerts: ${gameState.alerts_count}`);
        } catch (error) {
            this.updateStatus(`Single update failed: ${error.message}`);
            console.error('Single update error:', error);
        }
    }

    gameLoop() {
        // Auto-update every frame for smooth animation (if enabled)
        if (this.isInitialized && this.autoUpdateEnabled) {
            const now = Date.now();
            const dt = (now - this.lastUpdate) / 1000;
            this.lastUpdate = now;

            try {
                const result = update(dt);
                const gameState = JSON.parse(result);

                // Update status occasionally (not every frame to avoid spam)
                if (Math.random() < 0.01) { // ~1% chance per frame
                    this.updateStatus(`Running (Auto)...\nTime: ${gameState.time.toFixed(2)}s\nEntities: ${gameState.entities_count}\nAlerts: ${gameState.alerts_count}`);
                }

                // Sync visual entities with game state
                this.syncEntitiesWithGameState(gameState.entities);

                // Process combat messages and create visual effects
                if (gameState.debug_messages && gameState.debug_messages.length > 0) {
                    this.processCombatMessages(gameState.debug_messages);

                    // Log combat and damage events to console
                    gameState.debug_messages.forEach(message => {
                        // Check if message contains combat/damage info
                        if (message.includes('damage') || message.includes('combat') || message.includes('destroyed') || message.includes('Collision detected')) {
                            // console.log('⚔️ ' + message);
                        } else if (message.includes('cooldown')) {
                            // console.log('⏱️ ' + message);
                        } else {
                            // console.log('🔍 ' + message);
                        }
                    });
                }

            } catch (error) {
                console.error('Game loop error:', error);
            }
        }
    }

    syncEntitiesWithGameState(gameEntities) {

        // Remove entities that no longer exist in game state
        const gameEntityIds = new Set(gameEntities.map(e => e.id));
        const alertIds = new Set(gameEntities.filter(e => e.entity_type === 'alert').map(e => e.id));

        for (const [id, entity] of this.entities) {
            if (!gameEntityIds.has(id)) {
                // Remove any selection indicators before removing container
                if (entity.selectionIndicator) {
                    entity.container.removeChild(entity.selectionIndicator);
                }
                this.app.stage.removeChild(entity.container);
                this.entities.delete(id);
            }
        }

        // Clear selection for entities that no longer exist
        const entitiesToRemove = [];
        for (const entityId of this.selectedEntityIds) {
            if (!gameEntityIds.has(entityId)) {
                entitiesToRemove.push(entityId);
            }
        }
        for (const entityId of entitiesToRemove) {
            this.deselectEntity(entityId, true);
        }
        if (entitiesToRemove.length > 0) {
            this.updateStatus(`${entitiesToRemove.length} selected unit(s) were destroyed!`);
        }

        // Always clear alert highlight on every update (most aggressive cleanup)
        if (this.alertHighlight) {
            this.app.stage.removeChild(this.alertHighlight);
            this.alertHighlight = null;
        }

        // Update existing entities and add new ones
        for (const gameEntity of gameEntities) {
            if (this.entities.has(gameEntity.id)) {
                // Update existing entity position and faction
                const entity = this.entities.get(gameEntity.id);
                const scaleX = this.app.screen.width / this.gameWidth;
                const scaleY = this.app.screen.height / this.gameHeight;
                entity.container.x = gameEntity.x * scaleX;
                entity.container.y = gameEntity.y * scaleY;
                entity.x = entity.container.x;
                entity.y = entity.container.y;
                entity.gameX = gameEntity.x;
                entity.gameY = gameEntity.y;
                entity.faction = gameEntity.faction || null;

                // Update selection indicator based on server state, but only if it differs from local state
                // and we're not in the middle of a local selection operation
                const locallySelected = this.selectedEntityIds.has(gameEntity.id);
                if (!this.selectionOperationInProgress && gameEntity.is_selected !== locallySelected) {
                    if (gameEntity.is_selected && !entity.selectionIndicator) {
                        // Add selection indicator if server says selected but we don't have one
                        const selectionGraphics = new PIXI.Graphics();
                        selectionGraphics.lineStyle(3, 0x0080FF, 1); // Blue border
                        selectionGraphics.drawCircle(0, 0, 12);
                        entity.container.addChild(selectionGraphics);
                        entity.selectionIndicator = selectionGraphics;
                        this.selectedEntityIds.add(gameEntity.id);
                    } else if (!gameEntity.is_selected && entity.selectionIndicator) {
                        // Remove selection indicator if server says not selected but we have one
                        entity.container.removeChild(entity.selectionIndicator);
                        entity.selectionIndicator = null;
                        this.selectedEntityIds.delete(gameEntity.id);
                    }
                }
            } else {
                // Create new visual entity
                this.createEntityFromGameState(gameEntity);
            }
        }
    }

    createEntityFromGameState(gameEntity) {
        // Determine entity type and subtype from game entity data
        let vehicleType = 'scout'; // Default
        let entityType = gameEntity.entity_type || 'vehicle';
        let faction = gameEntity.faction || null;

        console.log('createEntityFromGameState called with:', {
            id: gameEntity.id,
            entity_type: gameEntity.entity_type,
            subtype: gameEntity.subtype,
            faction: gameEntity.faction,
            is_selected: gameEntity.is_selected
        });

        if (gameEntity.subtype) {
            // Check entity type first to determine how to handle subtype
            if (entityType === 'alert') {
                // This is an alert - use subtype directly
                vehicleType = gameEntity.subtype;
            } else if (entityType === 'base') {
                // For bases, always use 'base' as vehicleType for consistent rendering
                vehicleType = 'base';
            } else if (entityType === 'vehicle') {
                // Convert from Rust enum names to JS names for vehicles
                switch (gameEntity.subtype) {
                    case 'Scout Car':
                        vehicleType = 'scout';
                        break;
                    case 'Heavy Tank':
                        vehicleType = 'tank';
                        break;
                    case 'Armored Truck':
                        vehicleType = 'transport';
                        break;
                    default:
                        vehicleType = 'scout';
                }
            } else if (entityType === 'base') {
                // For bases, always use 'base' as vehicleType for consistent rendering
                vehicleType = 'base';
            }
        }

        // Create entity with game coordinates (createEntitySprite will convert to screen coordinates)
        console.log('Creating entity sprite:', gameEntity.id, gameEntity.x, gameEntity.y, 'vehicleType:', vehicleType, 'entityType:', entityType, 'faction:', faction);
        this.createEntitySprite(gameEntity.id, gameEntity.x, gameEntity.y, vehicleType, faction, entityType);
    }

    areFactionsHostile(factionA, factionB) {
        // Check if two factions are hostile towards each other
        // Based on the faction logic from faction.rs
        if (!factionA || !factionB) return false;

        switch (`${factionA}-${factionB}`) {
            // Player and Enemy are hostile to each other
            case 'Player-Enemy':
            case 'Enemy-Player':
                return true;

            // Player considers Wild creatures hostile
            case 'Player-Wild':
            case 'Wild-Player':
                return true;

            // Wild creatures attack everyone except their own kind
            case 'Wild-Wild':
                return false;
            default:
                if (factionA.startsWith('Wild-') || factionB.startsWith('Wild-')) {
                    return true;
                }
                break;
        }

        // Neutral entities don't attack anyone
        if (factionA === 'Neutral' || factionB === 'Neutral') {
            return false;
        }

        // Same faction - never hostile
        if (factionA === factionB) {
            return false;
        }

        // Default: not hostile
        return false;
    }

    updateStatus(message) {
        // Add selection counter to status if there are selected units
        let fullMessage = message;
        if (this.selectedEntityIds.size > 0) {
            fullMessage += `\n\n[Выбрано юнитов: ${this.selectedEntityIds.size}/12]`;
        }
        document.getElementById('status').textContent = fullMessage;
    }

    updateEntityInfo(message) {
        const entityInfoDiv = document.getElementById('entity-info');
        if (message) {
            entityInfoDiv.textContent = message;
            entityInfoDiv.style.display = 'block';
        } else {
            entityInfoDiv.style.display = 'none';
        }
    }

    // Parse combat messages from debug_messages and create visual effects
    processCombatMessages(debugMessages) {
        const combatEvents = [];

        for (const message of debugMessages) {
            // Parse damage messages: "Entity X dealt Y damage to entity Z"
            const damageMatch = message.match(/Entity (\d+) dealt ([\d.]+) damage to entity (\d+)/);
            if (damageMatch) {
                const [, attackerId, damage, targetId] = damageMatch;
                combatEvents.push({
                    type: 'damage',
                    attackerId: parseInt(attackerId),
                    targetId: parseInt(targetId),
                    damage: parseFloat(damage)
                });
                continue;
            }

            // Parse destruction messages: "Entity X was destroyed!"
            const destroyMatch = message.match(/Entity (\d+) was destroyed!/);
            if (destroyMatch) {
                const [, entityId] = destroyMatch;
                combatEvents.push({
                    type: 'destroyed',
                    entityId: parseInt(entityId)
                });
                continue;
            }

            // Parse collision messages: "Collision detected between entities X and Y"
            const collisionMatch = message.match(/Collision detected between entities (\d+) and (\d+)/);
            if (collisionMatch) {
                const [, entityAId, entityBId] = collisionMatch;
                combatEvents.push({
                    type: 'collision',
                    entityAId: parseInt(entityAId),
                    entityBId: parseInt(entityBId)
                });
                continue;
            }
        }

        // Process each combat event
        for (const event of combatEvents) {
            this.createCombatVisualization(event);
        }
    }

    // Create visual effects for combat events
    createCombatVisualization(event) {
        switch (event.type) {
            case 'damage':
                this.createDamageEffect(event.attackerId, event.targetId, event.damage);
                break;
            case 'destroyed':
                this.createDestructionEffect(event.entityId);
                break;
            case 'collision':
                this.createCollisionEffect(event.entityAId, event.entityBId);
                break;
        }
    }

    // Create damage effect showing attack from attacker to target
    createDamageEffect(attackerId, targetId, damage) {
        const attacker = this.entities.get(attackerId);
        const target = this.entities.get(targetId);

        if (!attacker || !target) return;

        // Create attack line from attacker to target
        const graphics = new PIXI.Graphics();

        // Red line for damage
        graphics.lineStyle(3, 0xFF0000, 0.8);
        graphics.moveTo(attacker.container.x, attacker.container.y);
        graphics.lineTo(target.container.x, target.container.y);

        // Add arrow head at target position
        const angle = Math.atan2(target.container.y - attacker.container.y, target.container.x - attacker.container.x);
        const arrowLength = 15;
        const arrowAngle = Math.PI / 6; // 30 degrees

        graphics.moveTo(target.container.x, target.container.y);
        graphics.lineTo(
            target.container.x - arrowLength * Math.cos(angle - arrowAngle),
            target.container.y - arrowLength * Math.sin(angle - arrowAngle)
        );
        graphics.moveTo(target.container.x, target.container.y);
        graphics.lineTo(
            target.container.x - arrowLength * Math.cos(angle + arrowAngle),
            target.container.y - arrowLength * Math.sin(angle + arrowAngle)
        );

        this.app.stage.addChild(graphics);

        // Add damage text
        const damageText = new PIXI.Text(`-${damage.toFixed(1)}`, {
            fontSize: 14,
            fill: 0xFF0000,
            fontWeight: 'bold',
            stroke: 0xFFFFFF,
            strokeThickness: 2
        });
        damageText.anchor.set(0.5);
        damageText.x = (attacker.container.x + target.container.x) / 2;
        damageText.y = (attacker.container.y + target.container.y) / 2 - 10;

        this.app.stage.addChild(damageText);

        // Add flash effect at target
        const flashGraphics = new PIXI.Graphics();
        flashGraphics.beginFill(0xFF0000, 0.3);
        flashGraphics.drawCircle(0, 0, 25);
        flashGraphics.endFill();
        flashGraphics.x = target.container.x;
        flashGraphics.y = target.container.y;
        this.app.stage.addChild(flashGraphics);

        // Animate and remove effects
        let alpha = 1.0;
        const animate = () => {
            alpha -= 0.05;
            graphics.alpha = alpha;
            damageText.alpha = alpha;
            flashGraphics.alpha = alpha * 0.5;

            if (alpha > 0) {
                requestAnimationFrame(animate);
            } else {
                this.app.stage.removeChild(graphics);
                this.app.stage.removeChild(damageText);
                this.app.stage.removeChild(flashGraphics);
            }
        };
        animate();

        // Store effect reference for cleanup if needed
        const effectId = `damage_${attackerId}_${targetId}_${Date.now()}`;
        this.combatEffects.set(effectId, { graphics, damageText, flashGraphics });
    }

    // Create destruction effect for destroyed entities
    createDestructionEffect(entityId) {
        const entity = this.entities.get(entityId);
        if (!entity) return;

        // Create explosion effect
        const explosionGraphics = new PIXI.Graphics();
        explosionGraphics.beginFill(0xFFA500, 0.8);
        explosionGraphics.drawCircle(0, 0, 5);
        explosionGraphics.endFill();
        explosionGraphics.x = entity.container.x;
        explosionGraphics.y = entity.container.y;
        this.app.stage.addChild(explosionGraphics);

        // Add explosion particles
        const particles = [];
        for (let i = 0; i < 8; i++) {
            const particle = new PIXI.Graphics();
            particle.beginFill(0xFF4500, 0.6);
            particle.drawCircle(0, 0, 2);
            particle.endFill();
            particle.x = entity.container.x;
            particle.y = entity.container.y;
            particle.vx = (Math.random() - 0.5) * 200;
            particle.vy = (Math.random() - 0.5) * 200;
            this.app.stage.addChild(particle);
            particles.push(particle);
        }

        // Animate explosion
        let scale = 1.0;
        let particleAlpha = 1.0;
        const animate = () => {
            scale += 0.1;
            explosionGraphics.scale.set(scale);
            explosionGraphics.alpha = Math.max(0, 1.0 - scale * 0.2);

            // Animate particles
            particleAlpha -= 0.02;
            for (const particle of particles) {
                particle.x += particle.vx * 0.016;
                particle.y += particle.vy * 0.016;
                particle.alpha = particleAlpha;
                particle.vx *= 0.98; // Slow down
                particle.vy *= 0.98;
            }

            if (scale < 3.0) {
                requestAnimationFrame(animate);
            } else {
                this.app.stage.removeChild(explosionGraphics);
                for (const particle of particles) {
                    this.app.stage.removeChild(particle);
                }
            }
        };
        animate();
    }

    // Create collision effect showing units in combat range
    createCollisionEffect(entityAId, entityBId) {
        const entityA = this.entities.get(entityAId);
        const entityB = this.entities.get(entityBId);

        if (!entityA || !entityB) return;

        // Yellow rings removed - they were behaving incorrectly during attacks
        // Previous code created pulsing yellow circles around colliding entities
    }

    // Display detailed information about an entity
    async displayEntityInfo(entityId) {
        try {
            // Check if entity still exists in visual representation
            if (!this.entities.has(entityId)) {
                this.updateEntityInfo('Entity no longer exists');
                return;
            }

            const result = get_entity_info(entityId);
            const entityInfo = JSON.parse(result);

            let infoText = `🏷️ Entity #${entityInfo.id}\n`;
            infoText += `📍 Position: (${entityInfo.position[0].toFixed(1)}, ${entityInfo.position[1].toFixed(1)})\n`;
            infoText += `🏛️ Type: ${entityInfo.entity_type}`;

            if (entityInfo.subtype) {
                infoText += ` (${entityInfo.subtype})`;
            }
            infoText += '\n';

            if (entityInfo.faction) {
                infoText += `🎯 Faction: ${entityInfo.faction}\n`;
            }

            if (entityInfo.health) {
                const [current, max] = entityInfo.health;
                const percentage = (current / max * 100).toFixed(1);
                const healthBar = this.createHealthBar(current, max);
                infoText += `❤️ Health: ${healthBar} ${percentage}%\n`;
            }

            if (entityInfo.speed !== null && entityInfo.speed !== undefined) {
                infoText += `💨 Speed: ${entityInfo.speed.toFixed(1)} units/s\n`;
            }

            if (entityInfo.damage && entityInfo.damage_type) {
                infoText += `⚔️ Damage: ${entityInfo.damage.toFixed(1)} (${entityInfo.damage_type})\n`;
            }

            if (entityInfo.combat_cooldown) {
                const [current, max] = entityInfo.combat_cooldown;
                const progress = (current / max * 100).toFixed(1);
                infoText += `⏰ Cooldown: ${current.toFixed(1)}s/${max.toFixed(1)}s (${progress}%)\n`;
            }

            if (entityInfo.devices && entityInfo.devices.length > 0) {
                infoText += `\n🔧 Crew/Devices (${entityInfo.devices.length}):\n`;
                for (const device of entityInfo.devices) {
                    infoText += `  • ${device.name} (${device.device_type})\n`;
                    if (device.description) {
                        infoText += `    ${device.description}\n`;
                    }
                }
            }

            // Commands available for selected units or player bases
            if (entityInfo.faction === 'Player') {
                if (entityInfo.entity_type === 'base') {
                    infoText += `\n🏗️ Available Base Commands:\n`;
                    infoText += `  • [Строить этаж] - Build new floor\n`;
                    infoText += `  • [Улучшить этаж] - Upgrade existing floor\n`;
                    infoText += `  • [Назначить юнитов] - Assign units to floors\n`;
                    infoText += `  • [Информация] - View base details\n`;
                } else if (entityInfo.is_selected) {
                    infoText += `\n🎮 Available Commands:\n`;
                    infoText += `  • [Двигаться] - Right-click map\n`;
                    infoText += `  • [Атаковать] - Right-click enemy\n`;
                    infoText += `  • [Остановить] - Space key\n`;
                    infoText += `  • [Отменить] - Delete key\n`;
                    infoText += `  • [Ремонт] - Return to base\n`;
                    infoText += `  • [Экипировка] - For crew cats\n`;
                }
            }

            if (entityInfo.is_selected) {
                infoText += '\n✅ SELECTED';
            }

            this.updateEntityInfo(infoText);
        } catch (error) {
            console.error('Error getting entity info:', error);
            this.updateEntityInfo(`❌ Error loading entity info: ${error.message}`);
        }
    }

    // Create a visual health bar
    createHealthBar(current, max) {
        const percentage = current / max;
        const barLength = 10;
        const filled = Math.round(percentage * barLength);
        const empty = barLength - filled;

        let bar = '[';
        for (let i = 0; i < filled; i++) {
            bar += '█';
        }
        for (let i = 0; i < empty; i++) {
            bar += '░';
        }
        bar += ']';

        return bar;
    }



    // Handle keyboard input
    handleKeyDown(event) {
        if (!this.isInitialized) return;

        // Check for Ctrl+A (select all player units at base)
        if (event.ctrlKey && event.key === 'a') {
            event.preventDefault(); // Prevent browser select all
            this.selectAllPlayerUnitsAtBase();
            return;
        }

        switch (event.key) {
            case 'Escape':
                // Clear all selections
                this.clearAllSelections();
                this.updateStatus('Selection cleared (Escape key)');
                break;

            case ' ': // Spacebar
                // Stop current actions for selected units
                if (this.selectedEntityIds.size > 0) {
                    // For now, just clear movement targets by setting them to current position
                    // This effectively stops movement
                    for (const entityId of this.selectedEntityIds) {
                        const entity = this.entities.get(entityId);
                        if (entity) {
                            this.setEntityTarget(entityId, entity.gameX, entity.gameY);
                        }
                    }
                    this.updateStatus(`Stopped ${this.selectedEntityIds.size} unit(s) (Spacebar)`);
                }
                event.preventDefault(); // Prevent page scroll
                break;

            case 'Delete':
                // Cancel current commands (same as stopping for now)
                if (this.selectedEntityIds.size > 0) {
                    for (const entityId of this.selectedEntityIds) {
                        const entity = this.entities.get(entityId);
                        if (entity) {
                            this.setEntityTarget(entityId, entity.gameX, entity.gameY);
                        }
                    }
                    this.updateStatus(`Cancelled commands for ${this.selectedEntityIds.size} unit(s) (Delete key)`);
                }
                break;

            default:
                // Ignore other keys
                break;
        }
    }
}

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const demo = new GameDemo();
    demo.init();
});
