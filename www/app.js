import init, { init as gameInit, create_vehicle, update, set_entity_target, select_entity, deselect_entity, clear_selection, set_group_target, get_selected_entities } from '../pkg/nation_of_last_land.js';

class GameDemo {
    constructor() {
        this.app = null;
        this.entities = new Map();
        this.isInitialized = false;
        this.lastUpdate = Date.now();
        this.selectedEntityIds = new Set(); // Changed to support multiple selections
        this.combatEffects = new Map(); // Store active combat visualizations
        this.dragSelection = {
            isDragging: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            graphics: null,
            hasDragged: false,
            justFinishedDrag: false
        };

        this.initPixi();
        this.setupEventListeners();
        this.updateStatus('WebAssembly module loading...');
    }

    async init() {
        try {
            // Initialize WebAssembly module
            await init();
            this.updateStatus('WebAssembly loaded successfully!\nClick "Initialize Game" to start.');
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
        this.app.view.addEventListener('click', (event) => this.handleCanvasClick(event));

        // Add resize handler
        window.addEventListener('resize', () => this.handleResize());

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
        document.getElementById('update-btn').addEventListener('click', () => this.manualUpdate());
        document.getElementById('clear-selection-btn').addEventListener('click', () => this.clearSelection());
    }

    clearSelection() {
        this.deselectEntity();
        this.updateStatus('Selection cleared. Click on a unit to select it.');
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
            // Handle entity click
            this.handleEntityClick(entityAtPosition, event.ctrlKey || event.metaKey);
        } else if (this.selectedEntityIds.size > 0) {
            // Check if clicked on an alert
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
            this.clearSelection();
        }
    }

    handleMouseDown(event) {
        if (!this.isInitialized) return;

        const rect = this.app.view.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        // Always start drag selection tracking, but only show rectangle if dragged enough
        this.dragSelection.isDragging = true;
        this.dragSelection.startX = screenX;
        this.dragSelection.startY = screenY;
        this.dragSelection.currentX = screenX;
        this.dragSelection.currentY = screenY;
        this.dragSelection.hasDragged = false; // Track if user actually dragged

        // Create selection rectangle (initially invisible)
        this.dragSelection.graphics = new PIXI.Graphics();
        this.dragSelection.graphics.alpha = 0; // Start invisible
        this.dragSelection.graphics.zIndex = 1000; // High z-index
        this.app.stage.addChild(this.dragSelection.graphics);

    }

    handleMouseMove(event) {
        if (!this.dragSelection.isDragging) return;

        const rect = this.app.view.getBoundingClientRect();
        const newX = event.clientX - rect.left;
        const newY = event.clientY - rect.top;

        this.dragSelection.currentX = newX;
        this.dragSelection.currentY = newY;

        // Check if user has dragged enough to show selection rectangle
        const dragDistance = Math.sqrt(
            (newX - this.dragSelection.startX) ** 2 +
            (newY - this.dragSelection.startY) ** 2
        );

        if (dragDistance > 5) { // Minimum drag distance of 5 pixels
            if (!this.dragSelection.hasDragged) {
                this.dragSelection.hasDragged = true;
            }
            this.dragSelection.graphics.alpha = 1; // Make visible

            // Update selection rectangle
            if (this.dragSelection.graphics) {
                this.dragSelection.graphics.clear();
                this.dragSelection.graphics.lineStyle(2, 0x00FF00, 0.8);
                this.dragSelection.graphics.beginFill(0x00FF00, 0.2);

                const x = Math.min(this.dragSelection.startX, this.dragSelection.currentX);
                const y = Math.min(this.dragSelection.startY, this.dragSelection.currentY);
                const width = Math.abs(this.dragSelection.currentX - this.dragSelection.startX);
                const height = Math.abs(this.dragSelection.currentY - this.dragSelection.startY);

                this.dragSelection.graphics.drawRect(x, y, width, height);
            }
        }
    }

    handleMouseUp(event) {
        if (!this.dragSelection.isDragging) return;

        const wasDragging = this.dragSelection.hasDragged;
        this.dragSelection.isDragging = false;


        // Only process selection if user actually dragged
        if (wasDragging) {
            // Prevent the click event from firing
            this.dragSelection.justFinishedDrag = true;

            // Calculate selection rectangle bounds
            const x = Math.min(this.dragSelection.startX, this.dragSelection.currentX);
            const y = Math.min(this.dragSelection.startY, this.dragSelection.currentY);
            const width = Math.abs(this.dragSelection.currentX - this.dragSelection.startX);
            const height = Math.abs(this.dragSelection.currentY - this.dragSelection.startY);


            // Find all entities within the selection rectangle
            const selectedEntities = [];
            for (const [id, entity] of this.entities) {
                // Skip alerts - they should not be selectable
                if (entity.entityType === 'alert') continue;

                // Check if entity is within selection bounds
                if (entity.container.x >= x && entity.container.x <= x + width &&
                    entity.container.y >= y && entity.container.y <= y + height) {
                    selectedEntities.push(id);
                }
            }


            if (selectedEntities.length > 0) {
                // Clear previous selection and select the new group
                this.clearSelection();
                for (const entityId of selectedEntities) {
                    this.selectEntity(entityId);
                }
                this.updateStatus(`Selected ${selectedEntities.length} units`);
            } else {
                // No entities selected, clear selection
                this.clearSelection();
            }
        }

        // Remove selection rectangle
        if (this.dragSelection.graphics) {
            this.app.stage.removeChild(this.dragSelection.graphics);
            this.dragSelection.graphics = null;
        }
    }

    handleEntityClick(entityId, isMultiSelect) {
        const entity = this.entities.get(entityId);
        if (!entity) return;

        // Check if this is an attack scenario (different faction and hostile)
        if (this.selectedEntityIds.size > 0 && !isMultiSelect) {
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

        // Handle selection
        if (isMultiSelect) {
            // Multi-select mode: toggle selection
            if (this.selectedEntityIds.has(entityId)) {
                this.deselectEntity(entityId);
            } else {
                this.selectEntity(entityId);
            }
        } else {
            // Single select mode: clear previous selection and select this entity
            this.clearSelection();
            this.selectEntity(entityId);
        }
    }

    findEntityAtPosition(x, y) {
        // Find entity closest to click position (within 20 pixels)
        // Only consider vehicles, not alerts
        let closestEntity = null;
        let closestDistance = 20;

        for (const [id, entity] of this.entities) {
            // Skip alerts - they should not be selectable
            if (entity.entityType === 'alert') {
                continue;
            }
            // Use current container position for accurate hit detection
            const distance = Math.sqrt((entity.container.x - x) ** 2 + (entity.container.y - y) ** 2);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestEntity = id;
            }
        }

        return closestEntity;
    }

    findAlertAtPosition(gameX, gameY) {
        // Find alert closest to click position (within 50 game units)
        // Use already rendered entities instead of calling update()
        let closestAlert = null;
        let closestDistance = 50;

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
            this.selectEntity(entityId);
        } else {
            this.deselectEntity();
        }
    }

    selectEntity(entityId) {
        // Don't re-select if already selected
        if (this.selectedEntityIds.has(entityId)) return;

        // Select entity via API
        try {
            const result = select_entity(entityId);
            const selectionResult = JSON.parse(result);
            if (selectionResult.success) {
                this.selectedEntityIds.add(entityId);
                const entity = this.entities.get(entityId);
                if (entity) {
                    // Add selection indicator (yellow border)
                    const selectionGraphics = new PIXI.Graphics();
                    selectionGraphics.lineStyle(3, 0xFFFF00, 1);
                    selectionGraphics.drawCircle(0, 0, 12);
                    entity.container.addChild(selectionGraphics);
                    entity.selectionIndicator = selectionGraphics;
                }

                const count = this.selectedEntityIds.size;
                if (count === 1) {
                    this.updateStatus(`Entity ${entityId} selected. Hold Ctrl/Cmd and click to select multiple units, or drag to select area.`);
                } else {
                    this.updateStatus(`${count} entities selected. Click on map to set group movement target.`);
                }
            }
        } catch (error) {
            console.error('Selection error:', error);
        }
    }

    deselectEntity(entityId) {
        if (!this.selectedEntityIds.has(entityId)) return;

        // Deselect entity via API
        try {
            const result = deselect_entity(entityId);
            const selectionResult = JSON.parse(result);
            if (selectionResult.success) {
                this.selectedEntityIds.delete(entityId);
                const entity = this.entities.get(entityId);
                if (entity && entity.selectionIndicator) {
                    entity.container.removeChild(entity.selectionIndicator);
                    entity.selectionIndicator = null;
                }

                const count = this.selectedEntityIds.size;
                if (count === 0) {
                    this.updateStatus('Selection cleared.');
                } else {
                    this.updateStatus(`${count} entities selected.`);
                }
            }
        } catch (error) {
            console.error('Deselection error:', error);
        }
    }

    clearSelection() {
        // Clear selection via API
        try {
            const result = clear_selection();
            const selectionResult = JSON.parse(result);
            if (selectionResult.success) {
                // Clear all visual indicators
                for (const entityId of this.selectedEntityIds) {
                    const entity = this.entities.get(entityId);
                    if (entity && entity.selectionIndicator) {
                        entity.container.removeChild(entity.selectionIndicator);
                        entity.selectionIndicator = null;
                    }
                }
                this.selectedEntityIds.clear();
                this.updateStatus('Selection cleared.');
            }
        } catch (error) {
            console.error('Clear selection error:', error);
        }
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
                this.deselectEntity();
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
        try {
            const result = gameInit();
            const gameState = JSON.parse(result);
            this.isInitialized = true;
            let status = `Game initialized!\nTime: ${gameState.time}\nEntities: ${gameState.entities_count}\nAlerts: ${gameState.alerts_count}`;
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

                // Automatically select the newly spawned vehicle
                this.selectEntity(creationResult.id);

                this.updateStatus(`Vehicle spawned and selected!\nID: ${creationResult.id}\nType: ${vehicleType}\nPosition: (${x}, ${y})`);
            } else {
                this.updateStatus(`Failed to spawn vehicle: ${creationResult.message}`);
            }
        } catch (error) {
            this.updateStatus(`Vehicle creation failed: ${error.message}`);
            console.error('Vehicle creation error:', error);
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
                // Handle alert types with state information
                if (entityType === 'alert' || (vehicleType && vehicleType.includes('_'))) {
                    let alertType, alertState;
                    if (vehicleType && vehicleType.includes('_')) {
                        [alertType, alertState] = vehicleType.split('_');
                    } else {
                        alertType = 'alert';
                        alertState = 'Hidden'; // fallback
                    }

                    if (alertState === 'Hidden') {
                        // Hidden alerts - dimmed yellow with question mark style
                        color = 0xFFEB3B;
                        alpha = 0.5;
                        graphics.lineStyle(1, color, alpha);
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
                        // Revealed alerts - bright yellow cross
                        color = 0xFFEB3B;
                        graphics.lineStyle(3, color, 1);
                        graphics.drawCircle(0, 0, 12);
                        graphics.moveTo(-10, 0);
                        graphics.lineTo(10, 0);
                        graphics.moveTo(0, -10);
                        graphics.lineTo(0, 10);
                    }
                    break;
                }
                // Fallback for unknown types
                color = 0xFFEB3B; // Yellow for alerts
                graphics.lineStyle(2, color, 1);
                graphics.drawCircle(0, 0, 12);
                graphics.moveTo(-8, 0);
                graphics.lineTo(8, 0);
                graphics.moveTo(0, -8);
                graphics.lineTo(0, 8);
                break;
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

    gameLoop() {
        // Auto-update every frame for smooth animation
        if (this.isInitialized) {
            const now = Date.now();
            const dt = (now - this.lastUpdate) / 1000;
            this.lastUpdate = now;

            try {
                const result = update(dt);
                const gameState = JSON.parse(result);

                // Update status occasionally (not every frame to avoid spam)
                if (Math.random() < 0.01) { // ~1% chance per frame
                    this.updateStatus(`Running...\nTime: ${gameState.time.toFixed(2)}s\nEntities: ${gameState.entities_count}\nAlerts: ${gameState.alerts_count}`);
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
            this.deselectEntity(entityId);
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

                // Update selection indicator based on server state
                if (gameEntity.is_selected && !entity.selectionIndicator) {
                    // Add selection indicator if server says selected but we don't have one
                    const selectionGraphics = new PIXI.Graphics();
                    selectionGraphics.lineStyle(3, 0xFFFF00, 1);
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

        if (gameEntity.subtype) {
            if (entityType === 'vehicle') {
                // Convert from Rust enum names to JS names
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
            } else if (entityType === 'alert') {
                // For alerts, use the subtype directly (includes alert type and state)
                vehicleType = gameEntity.subtype;
            }
        }

        // Create entity with game coordinates (createEntitySprite will convert to screen coordinates)
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
        document.getElementById('status').textContent = message;
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
}

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const demo = new GameDemo();
    demo.init();
});
