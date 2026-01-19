import { gameInit, create_vehicle, update, set_entity_target, set_group_target, create_base, build_floor, create_random_alert, clear_selection } from './wasm-imports.js';

/**
 * Управляет состоянием игры и коммуникацией с WebAssembly
 */
export class GameStateManager {
    constructor(gameDemo) {
        this.gameDemo = gameDemo;
    }

    async initializeGame() {
        this.gameDemo.entityRenderer.cleanupOrphanedGraphics();

        try {
            const result = gameInit();
            const gameState = JSON.parse(result);
            this.gameDemo.isInitialized = true;
            this.gameDemo.autoUpdateEnabled = false;
            let status = `Game initialized!\nTime: ${gameState.time}\nEntities: ${gameState.entities_count}\nAlerts: ${gameState.alerts_count}\nAuto update: disabled\nUse "Start Auto Update" or "Update Once" to continue`;
            if (gameState.debug_messages && gameState.debug_messages.length > 0) {
                status += '\n\nDebug:\n' + gameState.debug_messages.join('\n');
            }
            this.gameDemo.updateStatus(status);
            this.gameDemo.updateSpawnButtonState();
        } catch (error) {
            this.gameDemo.updateStatus(`Game initialization failed: ${error.message}`);
            console.error('Game init error:', error);
        }
    }

    _checkInitialized() {
        if (!this.gameDemo.isInitialized) {
            this.gameDemo.updateStatus('Please initialize the game first!');
            return false;
        }
        return true;
    }

    _handleTargetSet(x, y, clearSelection = true) {
        this.gameDemo.entityRenderer.showTargetIndicator(x, y);
        if (clearSelection) {
            this.gameDemo.selectionManager.clearAllSelections();
        }
        if (this.gameDemo.entityRenderer.alertHighlight) {
            this.gameDemo.app.stage.removeChild(this.gameDemo.entityRenderer.alertHighlight);
            this.gameDemo.entityRenderer.alertHighlight = null;
        }
    }

    async spawnVehicle() {
        if (!this._checkInitialized()) return;

        if (!this.gameDemo.isPlayerBaseSelected()) {
            this.gameDemo.updateStatus('Cannot spawn vehicle: Please select a player base first!');
            return;
        }

        const vehicleType = document.getElementById('vehicle-type').value;

        let spawnX, spawnY;
        for (const entityId of this.gameDemo.selectedEntityIds) {
            const entity = this.gameDemo.entities.get(entityId);
            if (entity && entity.entityType === 'base' && entity.faction === 'Player') {
                const distance = 10 + Math.random() * 30;
                const angle = Math.random() * Math.PI * 2;

                spawnX = entity.gameX + Math.cos(angle) * distance;
                spawnY = entity.gameY + Math.sin(angle) * distance;
                break;
            }
        }

        if (spawnX === undefined || spawnY === undefined) {
            this.gameDemo.updateStatus('Error: Could not determine base position for spawning');
            return;
        }

        try {
            const result = create_vehicle(vehicleType, spawnX, spawnY);
            const creationResult = JSON.parse(result);

            if (creationResult.success) {
                this.gameDemo.selectionManager.selectEntity(creationResult.id, true, true);
                this.gameDemo.displayEntityInfo(creationResult.id);

                this.gameDemo.updateStatus(`Vehicle spawned and selected!\nID: ${creationResult.id}\nType: ${vehicleType}\nPosition: (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)})`);
            } else {
                this.gameDemo.updateStatus(`Failed to spawn vehicle: ${creationResult.message}`);
            }
        } catch (error) {
            this.gameDemo.updateStatus(`Vehicle creation failed: ${error.message}`);
            console.error('Vehicle creation error:', error);
        }
    }

    async createBase() {
        if (!this._checkInitialized()) return;

        const x = parseFloat(document.getElementById('base-x').value);
        const y = parseFloat(document.getElementById('base-y').value);

        try {
            const result = create_base(x, y);
            const baseInfo = JSON.parse(result);

            this.gameDemo.bases.set(baseInfo.id, baseInfo);
            this.gameDemo.updateStatus(`Base created!\nID: ${baseInfo.id}\nPosition: (${x}, ${y})\nFloors: ${baseInfo.floors.length}\nStorage: ${baseInfo.current_storage_usage}/${baseInfo.total_storage_capacity}`);
        } catch (error) {
            this.gameDemo.updateStatus(`Base creation failed: ${error.message}`);
            console.error('Base creation error:', error);
        }
    }

    async buildFloor() {
        if (!this._checkInitialized()) return;

        const floorType = document.getElementById('floor-type').value;

        if (this.gameDemo.bases.size === 0) {
            this.gameDemo.updateStatus('No bases available. Create a base first!');
            return;
        }

        const baseId = Array.from(this.gameDemo.bases.keys())[0];

        try {
            const result = build_floor(baseId, floorType);
            const updatedBase = JSON.parse(result);

            this.gameDemo.bases.set(updatedBase.id, updatedBase);
            this.gameDemo.updateStatus(`Floor construction started!\nBase ID: ${baseId}\nFloor Type: ${floorType}\nTotal Floors: ${updatedBase.floors.length}`);
        } catch (error) {
            this.gameDemo.updateStatus(`Floor building failed: ${error.message}`);
            console.error('Floor building error:', error);
        }
    }

    async createRandomAlert() {
        if (!this._checkInitialized()) return;

        try {
            const result = create_random_alert();
            const alertResult = JSON.parse(result);

            if (alertResult.success) {
                this.gameDemo.updateStatus(`Random alert created!\nID: ${alertResult.id}\n${alertResult.message}`);
            } else {
                this.gameDemo.updateStatus(`Failed to create alert: ${alertResult.message}`);
            }
        } catch (error) {
            this.gameDemo.updateStatus(`Alert creation failed: ${error.message}`);
            console.error('Alert creation error:', error);
        }
    }

    startAutoUpdate() {
        this.gameDemo.autoUpdateEnabled = true;
        this.gameDemo.updateStatus('Auto update started - game will update automatically');
    }

    stopAutoUpdate() {
        this.gameDemo.autoUpdateEnabled = false;
        this.gameDemo.updateStatus('Auto update stopped - use "Update Once" or "Start Auto Update" to continue');
    }

    updateOnce() {
        const now = Date.now();
        const dt = (now - this.gameDemo.lastUpdate) / 1000;
        this.gameDemo.lastUpdate = now;

        try {
            const result = update(dt);
            const gameState = JSON.parse(result);

            if (Math.random() < 0.01) {
                this.gameDemo.updateStatus(`Running (Auto)...\nTime: ${gameState.time.toFixed(2)}s\nEntities: ${gameState.entities_count}\nAlerts: ${gameState.alerts_count}`);
            }

            // Централизованное обновление состояния выделения с removed_entities
            this.gameDemo.updateSelectionState(gameState.removed_entities || []);

            this.gameDemo.syncEntitiesWithGameState(gameState.entities);
            this.gameDemo.updateSelectedEntityInfo(gameState.entities);

        } catch (error) {
            console.error('Game loop error:', error);
        }
    }

    async setEntityTarget(entityId, x, y) {
        try {
            const result = set_entity_target(entityId, x, y);
            const movementResult = JSON.parse(result);

            if (movementResult.success) {
                this.gameDemo.updateStatus(`Target set: ${movementResult.message}`);
                this._handleTargetSet(x, y);
            } else {
                this.gameDemo.updateStatus(`Failed to set target: ${movementResult.message}`);
                console.error('Failed to set target:', movementResult.message);
            }
        } catch (error) {
            this.gameDemo.updateStatus(`Error setting target: ${error.message}`);
            console.error('Target setting error:', error);
        }
    }

    async setGroupTarget(x, y) {
        try {
            const result = set_group_target(x, y);
            const groupResult = JSON.parse(result);

            if (groupResult.success) {
                this.gameDemo.updateStatus(`Group target set: ${groupResult.message}`);
                this._handleTargetSet(x, y, false); // Don't clear selection for group target
            } else {
                this.gameDemo.updateStatus(`Failed to set group target: ${groupResult.message}`);
                console.error('Failed to set group target:', groupResult.message);
            }
        } catch (error) {
            this.gameDemo.updateStatus(`Error setting group target: ${error.message}`);
            console.error('Group target setting error:', error);
        }
    }

    gameLoop() {
        if (this.gameDemo.isInitialized && this.gameDemo.autoUpdateEnabled) {
            this.updateOnce()
        }
    }
}
