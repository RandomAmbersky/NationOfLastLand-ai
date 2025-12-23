import init, { init as gameInit, create_vehicle, update } from '../pkg/nation_of_last_land.js';

class GameDemo {
    constructor() {
        this.app = null;
        this.entities = new Map();
        this.isInitialized = false;
        this.lastUpdate = Date.now();

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
        // Create Pixi.js application
        this.app = new PIXI.Application({
            width: 800,
            height: 600,
            backgroundColor: 0x2a2a2a,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
        });

        // Add canvas to DOM
        const canvas = document.getElementById('game-canvas');
        canvas.parentNode.replaceChild(this.app.view, canvas);

        // Add a grid for reference
        this.drawGrid();

        // Start render loop
        this.app.ticker.add(() => this.gameLoop());
    }

    drawGrid() {
        const gridGraphics = new PIXI.Graphics();
        gridGraphics.lineStyle(1, 0x444444, 0.5);

        // Vertical lines
        for (let x = 0; x <= 800; x += 50) {
            gridGraphics.moveTo(x, 0);
            gridGraphics.lineTo(x, 600);
        }

        // Horizontal lines
        for (let y = 0; y <= 600; y += 50) {
            gridGraphics.moveTo(0, y);
            gridGraphics.lineTo(800, y);
        }

        this.app.stage.addChild(gridGraphics);
    }

    setupEventListeners() {
        document.getElementById('init-btn').addEventListener('click', () => this.initializeGame());
        document.getElementById('spawn-btn').addEventListener('click', () => this.spawnVehicle());
        document.getElementById('update-btn').addEventListener('click', () => this.manualUpdate());
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
                // Create visual representation
                this.createEntitySprite(creationResult.id, x, y, vehicleType);
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
        container.x = x;
        container.y = y;

        this.app.stage.addChild(container);
        this.entities.set(id, { container, x, y, vehicleType });
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
                entity.container.x = gameEntity.x;
                entity.container.y = gameEntity.y;
            } else {
                // Create new visual entity
                this.createEntityFromGameState(gameEntity);
            }
        }
    }

    createEntityFromGameState(gameEntity) {
        // Create a sprite for the entity based on game state
        const graphics = new PIXI.Graphics();

        // Different colors for different entity types (for now just vehicles)
        const color = 0x4CAF50; // Green for vehicles
        graphics.beginFill(color);
        graphics.drawCircle(0, 0, 8);
        graphics.endFill();

        // Add a small label with ID
        const text = new PIXI.Text(gameEntity.id.toString(), {
            fontSize: 10,
            fill: 0xFFFFFF,
            align: 'center'
        });
        text.anchor.set(0.5);
        text.y = -20;

        const container = new PIXI.Container();
        container.addChild(graphics);
        container.addChild(text);
        container.x = gameEntity.x;
        container.y = gameEntity.y;

        this.app.stage.addChild(container);
        this.entities.set(gameEntity.id, {
            container,
            x: gameEntity.x,
            y: gameEntity.y,
            entityType: gameEntity.entity_type
        });
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
