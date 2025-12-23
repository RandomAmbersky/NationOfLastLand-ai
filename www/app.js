import init, { init as gameInit, create_vehicle, update, set_entity_target } from '../pkg/nation_of_last_land.js';

class GameDemo {
    constructor() {
        this.app = null;
        this.entities = new Map();
        this.isInitialized = false;
        this.lastUpdate = Date.now();
        this.selectedEntityId = null;

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

        // Add click handler for canvas
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
    }

    handleCanvasClick(event) {
        if (!this.isInitialized) return;

        const rect = this.app.view.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        // Convert screen coordinates to game world coordinates
        const gameX = (screenX / this.app.screen.width) * this.gameWidth;
        const gameY = (screenY / this.app.screen.height) * this.gameHeight;

        if (this.selectedEntityId !== null) {
            // Set target for selected entity
            this.setEntityTarget(this.selectedEntityId, gameX, gameY);
        } else {
            // Try to select entity at clicked position
            this.selectEntityAtPosition(screenX, screenY);
        }
    }

    selectEntityAtPosition(x, y) {
        // Find entity closest to click position (within 20 pixels)
        let closestEntity = null;
        let closestDistance = 20;

        for (const [id, entity] of this.entities) {
            // Use current container position for accurate hit detection
            const distance = Math.sqrt((entity.container.x - x) ** 2 + (entity.container.y - y) ** 2);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestEntity = id;
            }
        }

        if (closestEntity !== null) {
            this.selectEntity(closestEntity);
        } else {
            this.deselectEntity();
        }
    }

    selectEntity(entityId) {
        // Deselect previous entity
        this.deselectEntity();

        // Select new entity
        this.selectedEntityId = entityId;
        const entity = this.entities.get(entityId);
        if (entity) {
            // Add selection indicator (yellow border)
            const selectionGraphics = new PIXI.Graphics();
            selectionGraphics.lineStyle(3, 0xFFFF00, 1);
            selectionGraphics.drawCircle(0, 0, 12);
            entity.container.addChild(selectionGraphics);
            entity.selectionIndicator = selectionGraphics;

            this.updateStatus(`Entity ${entityId} selected. Click on map to set movement target.`);
        }
    }

    deselectEntity() {
        if (this.selectedEntityId !== null) {
            const entity = this.entities.get(this.selectedEntityId);
            if (entity && entity.selectionIndicator) {
                entity.container.removeChild(entity.selectionIndicator);
                entity.selectionIndicator = null;
            }
            this.selectedEntityId = null;
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
            } else {
                this.updateStatus(`Failed to set target: ${movementResult.message}`);
            }
        } catch (error) {
            this.updateStatus(`Error setting target: ${error.message}`);
            console.error('Target setting error:', error);
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

    async initializeGame() {
        try {
            const result = gameInit();
            const gameState = JSON.parse(result);
            this.isInitialized = true;
            this.updateStatus(`Game initialized!\nTime: ${gameState.time}\nEntities: ${gameState.entities_count}`);
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

                this.updateStatus(`Vehicle spawned!\nID: ${creationResult.id}\nType: ${vehicleType}\nPosition: (${x}, ${y})`);
            } else {
                this.updateStatus(`Failed to spawn vehicle: ${creationResult.message}`);
            }
        } catch (error) {
            this.updateStatus(`Vehicle creation failed: ${error.message}`);
            console.error('Vehicle creation error:', error);
        }
    }

    createEntitySprite(id, x, y, vehicleType) {
        // Convert game coordinates to screen coordinates
        const scaleX = this.app.screen.width / this.gameWidth;
        const scaleY = this.app.screen.height / this.gameHeight;
        const screenX = x * scaleX;
        const screenY = y * scaleY;

        // Create a sprite for the entity
        const graphics = new PIXI.Graphics();

        // Different colors for different vehicle types
        let color;
        switch (vehicleType) {
            case 'scout':
                color = 0x4CAF50; // Green
                graphics.beginFill(color);
                graphics.drawCircle(0, 0, 8);
                break;
            case 'tank':
                color = 0xFF5722; // Red
                graphics.beginFill(color);
                graphics.drawRect(-10, -8, 20, 16);
                break;
            case 'transport':
                color = 0x2196F3; // Blue
                graphics.beginFill(color);
                graphics.drawRect(-12, -10, 24, 20);
                break;
        }

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
            entityType: 'vehicle'
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
            this.updateStatus(`Game updated!\nTime: ${gameState.time.toFixed(2)}s\nEntities: ${gameState.entities_count}\nDelta Time: ${dt.toFixed(3)}s`);
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
                    this.updateStatus(`Running...\nTime: ${gameState.time.toFixed(2)}s\nEntities: ${gameState.entities_count}`);
                }

                // Sync visual entities with game state
                this.syncEntitiesWithGameState(gameState.entities);

            } catch (error) {
                console.error('Game loop error:', error);
            }
        }
    }

    syncEntitiesWithGameState(gameEntities) {
        // Remove entities that no longer exist in game state
        const gameEntityIds = new Set(gameEntities.map(e => e.id));
        for (const [id, entity] of this.entities) {
            if (!gameEntityIds.has(id)) {
                this.app.stage.removeChild(entity.container);
                this.entities.delete(id);
            }
        }

        // Update existing entities and add new ones
        for (const gameEntity of gameEntities) {
            if (this.entities.has(gameEntity.id)) {
                // Update existing entity position
                const entity = this.entities.get(gameEntity.id);
                const scaleX = this.app.screen.width / this.gameWidth;
                const scaleY = this.app.screen.height / this.gameHeight;
                entity.container.x = gameEntity.x * scaleX;
                entity.container.y = gameEntity.y * scaleY;
                entity.x = entity.container.x;
                entity.y = entity.container.y;
                entity.gameX = gameEntity.x;
                entity.gameY = gameEntity.y;
            } else {
                // Create new visual entity
                this.createEntityFromGameState(gameEntity);
            }
        }
    }

    createEntityFromGameState(gameEntity) {
        // Determine vehicle type from game entity data
        let vehicleType = 'scout'; // Default
        if (gameEntity.vehicle_type) {
            // Convert from Rust enum names to JS names
            switch (gameEntity.vehicle_type) {
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
        }

        // Create entity with game coordinates (createEntitySprite will convert to screen coordinates)
        this.createEntitySprite(gameEntity.id, gameEntity.x, gameEntity.y, vehicleType);
    }

    updateStatus(message) {
        document.getElementById('status').textContent = message;
    }
}

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const demo = new GameDemo();
    demo.init();
});
