import { init, update, get_entity_info } from './wasm-imports.js';
import { GAME_CONFIG } from './game-config.js';

import { InputHandler } from './input-handler.js';
import { EntityRenderer } from './entity-renderer.js';
import { SelectionManager } from './selection-manager.js';
import { GameStateManager } from './game-state-manager.js';

/**
 * Главный класс игры, координирующий работу всех подсистем
 */
export class GameDemo {

    /**
     * Создает экземпляр игры
     */
    constructor() {
        this.app = null;
        this.entities = new Map();
        this.isInitialized = false;
        this.lastUpdate = Date.now();
        this.selectedEntityIds = new Set();
        this.bases = new Map();

        // Инициализация подсистем
        this.inputHandler = new InputHandler(this);
        this.entityRenderer = new EntityRenderer(this);
        this.selectionManager = new SelectionManager(this);
        this.gameStateManager = new GameStateManager(this);

        this.initPixi();
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

        // Setup subsystems
        this.entityRenderer.setupGrid();
        this.inputHandler.setupEventListeners();

        // Add resize handler
        window.addEventListener('resize', () => this.handleResize());

        // Clean up any existing graphics on startup
        this.entityRenderer.cleanupOrphanedGraphics();

        // Start render loop
        this.app.ticker.add(() => this.gameLoop());
    }

    handleResize() {
        const canvasContainer = document.querySelector('.game-container');
        const rect = canvasContainer.getBoundingClientRect();

        // Resize Pixi application
        this.app.renderer.resize(rect.width, rect.height);

        // Update grid
        this.entityRenderer.updateGrid();
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
    }

    async initializeGame() {
        await this.gameStateManager.initializeGame();
    }

    async spawnVehicle() {
        await this.gameStateManager.spawnVehicle();
    }

    async createBase() {
        await this.gameStateManager.createBase();
    }

    async buildFloor() {
        await this.gameStateManager.buildFloor();
    }

    async createRandomAlert() {
        await this.gameStateManager.createRandomAlert();
    }

    manualUpdate() {
        this.gameStateManager.manualUpdate();
    }

    startAutoUpdate() {
        this.gameStateManager.startAutoUpdate();
    }

    stopAutoUpdate() {
        this.gameStateManager.stopAutoUpdate();
    }

    updateOnce() {
        this.gameStateManager.updateOnce();
    }

    async setEntityTarget(entityId, x, y) {
        await this.gameStateManager.setEntityTarget(entityId, x, y);
    }

    async setGroupTarget(x, y) {
        await this.gameStateManager.setGroupTarget(x, y);
    }

    gameLoop() {
        this.gameStateManager.gameLoop();
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
            this.selectionManager.deselectEntity(entityId, true);
        }
        if (entitiesToRemove.length > 0) {
            this.updateStatus(`${entitiesToRemove.length} selected unit(s) were destroyed!`);
        }

        // Always clear alert highlight on every update (most aggressive cleanup)
        if (this.entityRenderer.alertHighlight) {
            this.app.stage.removeChild(this.entityRenderer.alertHighlight);
            this.entityRenderer.alertHighlight = null;
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
                if (!this.selectionManager.selectionOperationInProgress && gameEntity.is_selected !== locallySelected) {
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
        this.entityRenderer.createEntitySprite(gameEntity.id, gameEntity.x, gameEntity.y, vehicleType, faction, entityType);
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
        let fullMessage = message;

        if (this.selectedEntityIds.size > 0) {
            if (this.selectedEntityIds.size === 1) {
                // Show info about the single selected unit
                const entityId = Array.from(this.selectedEntityIds)[0];
                const entity = this.entities.get(entityId);
                if (entity) {
                    const entityType = entity.entityType === 'vehicle' ? entity.vehicleType : entity.entityType;
                    const faction = entity.faction || 'Unknown';
                    fullMessage += `\n\n[Выбран: ${entityType} (${faction}) #${entityId}]`;
                }
            } else {
                // Show count for multiple units
                fullMessage += `\n\n[Выбрано юнитов: ${this.selectedEntityIds.size}/12]`;
            }
        }

        document.getElementById('status').textContent = fullMessage;
    }

    updateEntityInfo(message) {
        // Clear any existing info indicators before showing new info
        for (const [id, entity] of this.entities) {
            if (entity.infoIndicator) {
                entity.container.removeChild(entity.infoIndicator);
                entity.infoIndicator = null;
            }
        }

        const entityInfoDiv = document.getElementById('entity-info');
        if (message) {
            entityInfoDiv.innerHTML = message;
            entityInfoDiv.style.display = 'block';

            // Add event delegation for spawn button
            const existingHandler = entityInfoDiv._spawnButtonHandler;
            if (existingHandler) {
                entityInfoDiv.removeEventListener('click', existingHandler);
            }

            const spawnButtonHandler = (event) => {
                if (event.target.classList.contains('spawn-vehicle-btn')) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (window.demo) {
                        window.demo.spawnVehicle();
                    } else {
                        console.error('window.demo not available');
                    }
                }
            };

            entityInfoDiv.addEventListener('click', spawnButtonHandler);
            entityInfoDiv._spawnButtonHandler = spawnButtonHandler;
        } else {
            entityInfoDiv.style.display = 'none';
            // Remove event listener when hiding
            const existingHandler = entityInfoDiv._spawnButtonHandler;
            if (existingHandler) {
                entityInfoDiv.removeEventListener('click', existingHandler);
                entityInfoDiv._spawnButtonHandler = null;
            }
        }
    }

    // Update information for selected entities dynamically
    async updateSelectedEntityInfo() {
        // Clean up dead entities from selection first
        const entitiesToRemove = [];
        for (const entityId of this.selectedEntityIds) {
            // Check if entity exists in visual representation
            if (!this.entities.has(entityId)) {
                entitiesToRemove.push(entityId);
                continue;
            }

            // Check if entity is dead by checking game state
            try {
                const updateResult = update(0.001);
                const gameState = JSON.parse(updateResult);
                const gameEntity = gameState.entities.find(entity => entity.id === entityId);

                if (!gameEntity || (gameEntity.health && gameEntity.health[0] <= 0)) {
                    entitiesToRemove.push(entityId);
                }
            } catch (error) {
                // If we can't check, assume entity is dead
                entitiesToRemove.push(entityId);
            }
        }

        // Remove dead entities from selection
        for (const entityId of entitiesToRemove) {
            this.selectedEntityIds.delete(entityId);
            const entity = this.entities.get(entityId);
            if (entity && entity.selectionIndicator) {
                entity.container.removeChild(entity.selectionIndicator);
                entity.selectionIndicator = null;
            }
        }

        // Now check if we should show info: only for single selected entities, not for groups
        if (this.selectedEntityIds.size !== 1) {
            // If no entities or multiple entities selected, clear the info
            this.updateEntityInfo(null);
            return;
        }

        // For single selected entities, always show info regardless of panel visibility

        // Get the first selected entity to display its info
        const selectedEntityId = Array.from(this.selectedEntityIds)[0];

        // First check if the selected entity is still alive by checking game state
        // This prevents showing stale information for dead entities
        try {
            const updateResult = update(0.001); // Minimal update to get current state
            const gameState = JSON.parse(updateResult);

            // Check if the selected entity still exists in the current game state
            const gameEntity = gameState.entities.find(entity => entity.id === selectedEntityId);
            if (!gameEntity) {
                this.updateEntityInfo(null);
                // Remove from selection
                this.selectedEntityIds.delete(selectedEntityId);
                const entity = this.entities.get(selectedEntityId);
                if (entity && entity.selectionIndicator) {
                    entity.container.removeChild(entity.selectionIndicator);
                    entity.selectionIndicator = null;
                }
                return;
            }

            // Check if entity is dead (health <= 0)
            const isDead = gameEntity.health && gameEntity.health[0] <= 0;

            if (isDead) {
                this.updateEntityInfo(null);
                // Remove from selection
                this.selectedEntityIds.delete(selectedEntityId);
                const entity = this.entities.get(selectedEntityId);
                if (entity && entity.selectionIndicator) {
                    entity.container.removeChild(entity.selectionIndicator);
                    entity.selectionIndicator = null;
                }
                // Clear any info indicators
                if (entity && entity.infoIndicator) {
                    entity.container.removeChild(entity.infoIndicator);
                    entity.infoIndicator = null;
                }
                return;
            }
        } catch (error) {
            console.error('Error checking entity existence:', error);
        }

        try {
            // Check if entity still exists in visual representation
            if (!this.entities.has(selectedEntityId)) {
                this.updateEntityInfo('Entity no longer exists');
                return;
            }

            const result = get_entity_info(selectedEntityId);
            const entityInfo = JSON.parse(result);

            // Check if entity is alive (has health > 0)
            if (entityInfo.health && entityInfo.health[0] <= 0) {
                this.updateEntityInfo(null);
                return;
            }

            // Use the shared function to create info text with commands
            const infoText = this.createEntityInfoText(entityInfo, true);

            // Get the entity info div element
            const entityInfoDiv = document.getElementById('entity-info');

            // Check if info has actually changed before updating
            if (entityInfoDiv.innerHTML !== infoText) {
                entityInfoDiv.innerHTML = infoText;
            }

            // Add info indicator for display (always, even if entity can't be selected)
            const entity = this.entities.get(selectedEntityId);
            if (entity && !entity.selectionIndicator && !entity.infoIndicator) {
                const infoGraphics = new PIXI.Graphics();
                // Use blue color for info display (like alerts)
                infoGraphics.lineStyle(3, 0x0080FF, 1);
                infoGraphics.drawCircle(0, 0, 12);
                entity.container.addChild(infoGraphics);
                entity.infoIndicator = infoGraphics; // Store reference to remove later
            }
        } catch (error) {
            console.error('Error updating selected entity info:', error);
            // If entity is dead or doesn't exist, clear the info
            if (error.message && (error.message.includes('Entity is dead') || error.message.includes('Entity not found'))) {
                this.updateEntityInfo(null);
                // Also remove from selection if it's dead
                this.selectedEntityIds.delete(selectedEntityId);
                const entity = this.entities.get(selectedEntityId);
                if (entity && entity.selectionIndicator) {
                    entity.container.removeChild(entity.selectionIndicator);
                    entity.selectionIndicator = null;
                }
            } else {
                // Don't show error message for dynamic updates to avoid spam
            }
        }
    }

    // Create formatted entity information text
    createEntityInfoText(entityInfo, includeCommands = false) {
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

        // Add commands if requested
        if (includeCommands && entityInfo.faction === 'Player') {
            if (entityInfo.entity_type === 'base') {
                infoText += `\n🏗️ Available Base Commands:\n`;
                infoText += `  • <button class="spawn-vehicle-btn" style="background: #4CAF50; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">Спавн транспорта</button> - Spawn new vehicle\n`;
                infoText += `  • [Строить этаж] - Build new floor\n`;
                infoText += `  • [Улучшить этаж] - Upgrade existing floor\n`;
                infoText += `  • [Назначить юнитов] - Assign units to floors\n`;
                infoText += `  • [Информация] - View base details\n`;
            } else if (entityInfo.is_selected) {
                infoText += `\n Available Commands:\n`;
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

        return infoText;
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

            // Create info text without commands (for right-click display)
            const infoText = this.createEntityInfoText(entityInfo, false);

            // Update entity info display first
            this.updateEntityInfo(infoText);

            // Add info indicator for display (always, even if entity can't be selected)
            const entity = this.entities.get(entityId);
            if (entity && !entity.selectionIndicator) {
                const infoGraphics = new PIXI.Graphics();
                // Use blue color for info display (like alerts)
                infoGraphics.lineStyle(3, 0x0080FF, 1);
                infoGraphics.drawCircle(0, 0, 12);
                entity.container.addChild(infoGraphics);
                entity.infoIndicator = infoGraphics; // Store reference to remove later
            }
        } catch (error) {
            console.error('Error getting entity info:', error);
            this.updateEntityInfo(`❌ Error loading entity info: ${error.message}`);
        }
    }

    // Create a visual health bar
    createHealthBar(current, max) {
        const percentage = current / max;
        const barLength = GAME_CONFIG.UI.healthBarLength;
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

    // Utility methods for coordinate conversion
    screenToGame(x, y) {
        return {
            x: (x / this.app.screen.width) * this.gameWidth,
            y: (y / this.app.screen.height) * this.gameHeight
        };
    }

    gameToScreen(x, y) {
        const scaleX = this.app.screen.width / this.gameWidth;
        const scaleY = this.app.screen.height / this.gameHeight;
        return {
            x: x * scaleX,
            y: y * scaleY
        };
    }

    // Utility methods for creating visual indicators
    createSelectionIndicator(entity, isEnemy = false) {
        const color = isEnemy ?
            GAME_CONFIG.COLORS.selection.enemy :
            GAME_CONFIG.COLORS.selection.player;

        const graphics = new PIXI.Graphics();
        graphics.lineStyle(3, color, 1);
        graphics.drawCircle(0, 0, GAME_CONFIG.UI.indicatorSize);
        entity.container.addChild(graphics);
        return graphics;
    }

    createInfoIndicator(entity) {
        const graphics = new PIXI.Graphics();
        graphics.lineStyle(3, GAME_CONFIG.COLORS.info, 1);
        graphics.drawCircle(0, 0, GAME_CONFIG.UI.indicatorSize);
        entity.container.addChild(graphics);
        return graphics;
    }

    // Utility method for distance calculation
    calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    // Utility method for checking entity existence
    isEntityValid(entityId) {
        return this.entities.has(entityId) && this.entities.get(entityId) !== null;
    }

    isPlayerBaseSelected() {
        // Check if any selected entity is a player base
        for (const entityId of this.selectedEntityIds) {
            const entity = this.entities.get(entityId);
            if (entity && entity.entityType === 'base' && entity.faction === 'Player') {
                return true;
            }
        }
        return false;
    }

    updateSpawnButtonState() {
        const spawnBtn = document.getElementById('spawn-btn');
        const isBaseSelected = this.isPlayerBaseSelected();

        if (isBaseSelected) {
            spawnBtn.style.display = 'inline-block';
            spawnBtn.disabled = false;
            spawnBtn.style.opacity = '1.0';
            spawnBtn.style.cursor = 'pointer';
            spawnBtn.title = 'Spawn a new vehicle at the selected base';
        } else {
            spawnBtn.style.display = 'none';
            spawnBtn.disabled = true;
        }
    }

    clearAllSelections() {
        this.selectionManager.clearAllSelections();
    }
}

// Global demo instance for onclick handlers
let demo;

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
    demo = new GameDemo();
    window.demo = demo; // Make demo globally accessible
    demo.init();
});
