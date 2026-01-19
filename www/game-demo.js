import { init, update, get_entity_info, get_entities_data } from './wasm-imports.js';
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
        this._scaleCache = null;

        // Инициализация подсистем
        this.inputHandler = new InputHandler(this);
        this.entityRenderer = new EntityRenderer(this);
        this.selectionManager = new SelectionManager(this);
        this.gameStateManager = new GameStateManager(this);

        this.initPixi();
        this.setupEventListeners();
        this.updateStatus('WebAssembly module loading...');
    }

    /**
     * Get cached scale values (invalidated on resize)
     */
    getScale() {
        if (!this._scaleCache) {
            this._scaleCache = {
                x: this.app.screen.width / this.gameWidth,
                y: this.app.screen.height / this.gameHeight
            };
        }
        return this._scaleCache;
    }

    /**
     * Invalidate scale cache (call on resize)
     */
    invalidateScaleCache() {
        this._scaleCache = null;
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

        // Invalidate scale cache
        this.invalidateScaleCache();

        // Update grid
        this.entityRenderer.updateGrid();
    }

    setupEventListeners() {
        document.getElementById('init-btn').addEventListener('click', () => this.initializeGame());
        document.getElementById('spawn-btn').addEventListener('click', () => this.spawnVehicle());
        document.getElementById('create-base-btn').addEventListener('click', () => this.createBase());
        document.getElementById('build-floor-btn').addEventListener('click', () => this.buildFloor());
        document.getElementById('create-alert-btn').addEventListener('click', () => this.createRandomAlert());
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

    // Централизованный метод для обновления состояния выделения
    updateSelectionState(removedEntities = []) {
        let removedCount = 0;

        // Удаляем сущности, которые были убраны из выделения на сервере
        for (const entityId of removedEntities) {
            if (this.selectedEntityIds.has(entityId)) {
                this.selectedEntityIds.delete(entityId);
                removedCount++;

                // Удаляем визуальный индикатор выделения
                const entity = this.entities.get(entityId);
                if (entity && entity.selectionIndicator) {
                    entity.container.removeChild(entity.selectionIndicator);
                    entity.selectionIndicator = null;
                }

                console.log(`Entity ${entityId} removed from selection (destroyed)`);
            }
        }

        // Дополнительная проверка: удаляем сущности, которые больше не существуют в мире
        const entitiesToRemove = [];
        for (const entityId of this.selectedEntityIds) {
            if (!this.entities.has(entityId)) {
                entitiesToRemove.push(entityId);
            }
        }

        for (const entityId of entitiesToRemove) {
            this.selectedEntityIds.delete(entityId);
            removedCount++;
            console.log(`Entity ${entityId} removed from selection (no longer exists)`);
        }

        if (removedCount > 0) {
            this.updateStatus(`${removedCount} selected unit(s) were destroyed!`);
        }

        // Валидация консистентности состояния
        this._validateSelectionState();

        return removedCount;
    }

    // Валидация консистентности состояния выделения
    _validateSelectionState() {
        const inconsistencies = [];

        for (const entityId of this.selectedEntityIds) {
            const entity = this.entities.get(entityId);
            if (!entity) {
                inconsistencies.push(`Entity ${entityId} in selection but not in entities map`);
            } else if (!entity.selectionIndicator) {
                inconsistencies.push(`Entity ${entityId} selected but has no visual indicator`);
            }
        }

        // Проверяем, что все визуальные индикаторы соответствуют выделению
        for (const [entityId, entity] of this.entities) {
            if (entity.selectionIndicator && !this.selectedEntityIds.has(entityId)) {
                inconsistencies.push(`Entity ${entityId} has indicator but not in selection`);
            }
        }

        if (inconsistencies.length > 0) {
            console.warn('Selection state inconsistencies detected:', inconsistencies);
            // Автоматическая коррекция
            this._fixSelectionInconsistencies();
        }
    }

    // Автоматическая коррекция несогласованностей
    _fixSelectionInconsistencies() {
        // Удаляем индикаторы для невыделенных сущностей
        for (const [entityId, entity] of this.entities) {
            if (entity.selectionIndicator && !this.selectedEntityIds.has(entityId)) {
                entity.container.removeChild(entity.selectionIndicator);
                entity.selectionIndicator = null;
            }
        }

        // Добавляем недостающие индикаторы для выделенных сущностей
        for (const entityId of this.selectedEntityIds) {
            const entity = this.entities.get(entityId);
            if (entity && !entity.selectionIndicator) {
                const isEnemy = entity.faction === 'Enemy' || entity.faction === 'Wild' || entity.entityType === 'alert';
                this.selectionManager._createSelectionIndicator(entity, isEnemy);
            }
        }
    }

    syncEntitiesWithGameState(gameEntities) {
        // Remove entities that no longer exist in game state
        const gameEntityIds = new Set(gameEntities.map(e => e.id));

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

        // NOTE: Selection cleanup now handled by updateSelectionState() in game-state-manager.js
        // to avoid duplication and ensure proper ordering

        // Always clear alert highlight on every update (most aggressive cleanup)
        if (this.entityRenderer.alertHighlight) {
            this.app.stage.removeChild(this.entityRenderer.alertHighlight);
            this.entityRenderer.alertHighlight = null;
        }

        // Get cached scale values
        const scale = this.getScale();

        // Update existing entities and add new ones
        for (const gameEntity of gameEntities) {
            if (this.entities.has(gameEntity.id)) {
                // Update existing entity position and faction
                const entity = this.entities.get(gameEntity.id);
                const posX = gameEntity.position ? gameEntity.position.x : 0;
                const posY = gameEntity.position ? gameEntity.position.y : 0;
                entity.container.x = posX * scale.x;
                entity.container.y = posY * scale.y;
                entity.x = entity.container.x;
                entity.y = entity.container.y;
                entity.gameX = posX;
                entity.gameY = posY;
                entity.faction = gameEntity.faction || null;

                // Selection indicators are managed by SelectionManager, not synced from server state
                // This prevents unwanted deselection when server state doesn't match local selection
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
            // Check if subtype contains '_' which indicates an alert/revealed unit with state (e.g., 'Scout Car_Revealed')
            if (gameEntity.subtype.includes('_')) {
                // Keep full subtype for rendering (handles alerts, revealed enemy units, etc.)
                vehicleType = gameEntity.subtype;
            } else {
                // Standard vehicle subtype without underscore
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
                    case 'raider':
                    case 'hostile':
                    case 'static':
                        vehicleType = gameEntity.subtype;
                        break;
                    default:
                        vehicleType = 'scout';
                }
            }
        }

        // Create entity with game coordinates (createEntitySprite will convert to screen coordinates)
        const posX = gameEntity.position ? gameEntity.position.x : 0;
        const posY = gameEntity.position ? gameEntity.position.y : 0;
        this.entityRenderer.createEntitySprite(gameEntity.id, posX, posY, vehicleType, faction, entityType);
    }

    updateStatus(message) {
        document.getElementById('status').textContent = message;
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

    // Create text format group information
    createGroupInfoText(entitiesData) {
        // Фильтруем только выбранные сущности
        const selectedEntities = entitiesData.filter(entity =>
            this.selectedEntityIds.has(entity.id)
        );

        if (selectedEntities.length === 0) {
            return null;
        }

        let infoText = `🏷️ Группа (${selectedEntities.length} юнитов игрока)\n`;
        infoText += `━━━━━━━━━━━━━━━━━━━━━━\n`;

        for (const entity of selectedEntities) {
            let healthText = '❓ Неизвестно';
            let isDead = false;

            if (entity.health && entity.health.length >= 2) {
                const [current, max] = entity.health;
                const percentage = (current / max * 100).toFixed(1);
                const healthBar = this.createHealthBar(current, max);
                healthText = `${healthBar} ${percentage}%`;
                if (current <= 0) isDead = true;
            }

            const entityName = entity.subtype || entity.entity_type || 'unit';
            const deadMark = isDead ? ' 💀' : '';
            infoText += `  #${entity.id} (${entityName}): ${healthText}${deadMark}\n`;
        }

        infoText += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        return infoText;
    }

    // Unified method to display group information from different data sources
    displayGroupInfoFromData(entitiesData, useHtmlFormat = true) {
        const entityInfoDiv = document.getElementById('entity-info');

        // Фильтруем только выбранные сущности
        const selectedEntities = entitiesData.filter(entity =>
            this.selectedEntityIds.has(entity.id)
        );

        if (selectedEntities.length === 0) {
            entityInfoDiv.style.display = 'none';
            return;
        }

        if (useHtmlFormat) {
            let html = '<div class="entity-info-content">';
            html += `<h3>Группа (${selectedEntities.length} юнитов)</h3>`;

            // Вычисляем общее здоровье группы
            let totalHealth = 0;
            let totalMaxHealth = 0;
            let healthyUnits = 0;

            selectedEntities.forEach(entity => {
                if (entity.health && entity.health.length >= 2) {
                    const [current, max] = entity.health;
                    if (current > 0 && max > 0) {
                        totalHealth += current;
                        totalMaxHealth += max;
                        healthyUnits++;

                    }
                }
            });

            if (totalMaxHealth > 0) {
                const avgHealthPercent = (totalHealth / totalMaxHealth) * 100;
                html += `
                    <div class="health-bar">
                        <div class="health-label">Среднее здоровье группы: ${(avgHealthPercent).toFixed(1)}% (${healthyUnits} юнитов)</div>
                        <div class="health-fill" style="width: ${avgHealthPercent}%"></div>
                    </div>
                `;
            }

            // Показываем здоровье каждого юнита в группе
            html += '<div class="group-units">';
            selectedEntities.forEach(entity => {
                if (entity.health && entity.health.length >= 2) {
                    const [current, max] = entity.health;
                    if (current > 0 && max > 0) {
                        const healthPercent = (current / max) * 100;
                        const entityName = entity.subtype || entity.entity_type || `Юнит ${entity.id}`;
                        html += `
                            <div class="unit-health">
                                <span class="unit-name">${entityName}</span>
                                <div class="health-bar small">
                                    <div class="health-fill" style="width: ${healthPercent}%"></div>
                                </div>
                                <span class="health-text">${current}/${max}</span>
                            </div>
                        `;
                    }
                }
            });
            html += '</div>';

            html += '</div>';
            entityInfoDiv.innerHTML = html;
            entityInfoDiv.style.display = 'block';
        } else {
            // Use the shared text creation method
            const infoText = this.createGroupInfoText(entitiesData);
            entityInfoDiv.innerHTML = infoText;
            entityInfoDiv.style.display = 'block';
        }
    }

    // Update information for selected entities dynamically
    async updateSelectedEntityInfo(gameEntities) {

        // Check if selected units still have targets - hide target indicator if none do
        this.checkAndUpdateTargetIndicator(gameEntities);

        // If no entities selected, clear info
        if (this.selectedEntityIds.size === 0) {
            this.updateEntityInfo(null);
            return;
        }

        if (this.selectedEntityIds.size > 1) {
            this.updateGroupInfo(gameEntities);
            return;
        }

        // For single selected entities, always show info regardless of panel visibility

        // Get the first selected entity to display its info
        const selectedEntityId = Array.from(this.selectedEntityIds)[0];

        // Check if the selected entity still exists in the current game state
        const gameEntity = gameEntities.find(entity => entity.id === selectedEntityId);
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

        // Add selection info
        const isSelected = entityInfo.selection?.is_selected ?? false;
        const groupId = entityInfo.selection?.group_id;

        if (groupId !== null && groupId !== undefined) {
            infoText += `👥 Group: ${groupId}\n`;
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
            } else if (isSelected) {
                infoText += `\n Available Commands:\n`;
                infoText += `  • [Двигаться] - Right-click map\n`;
                infoText += `  • [Атаковать] - Right-click enemy\n`;
                infoText += `  • [Остановить] - Space key\n`;
                infoText += `  • [Отменить] - Delete key\n`;
                infoText += `  • [Ремонт] - Return to base\n`;
                infoText += `  • [Экипировка] - For crew cats\n`;
            }
        }

        if (isSelected) {
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

    displayGroupInfo() {
        // Показываем информацию о группе выбранных юнитов
        if (this.selectedEntityIds.size > 1) {
            // Получаем актуальные данные о всех сущностях
            try {
                const result = get_entities_data();
                const entitiesData = JSON.parse(result);
                this.displayGroupInfoFromData(entitiesData, true);
            } catch (error) {
                console.error('Ошибка получения данных сущностей:', error);
            }
        } else if (this.selectedEntityIds.size === 1) {
            // Если пытаемся показать группу, но выбран только один юнит,
            // показываем детальную информацию об этом юните
            const selectedId = Array.from(this.selectedEntityIds)[0];
            this.displayEntityInfo(selectedId);
        } else {
            // Ничего не выбрано
            this.updateEntityInfo(null);
        }
    }

    // Отображение информации о группе выбранных юнитов игрока (здоровье каждого)
    updateGroupInfo(gameEntities) {
        this.displayGroupInfoFromData(gameEntities, false);
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
        const scale = this.getScale();
        return {
            x: x * scale.x,
            y: y * scale.y
        };
    }

    // Find the player's base entity
    findPlayerBase() {
        for (const [entityId, entity] of this.entities) {
            if (entity.faction === 'Player' && entity.entityType === 'base') {
                return entity;
            }
        }
        return null;
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

    // Check if selected units still have targets and hide target indicator if none do
    checkAndUpdateTargetIndicator(entities) {
        // If no target indicator is currently shown, nothing to check
        if (!this.entityRenderer.targetIndicator) {
            return;
        }

        // Check if any selected player units still have movement targets
        let hasAnyTarget = false;

        for (const entityId of this.selectedEntityIds) {
            const gameEntity = entities.find(e => e.id === entityId);
            if (gameEntity && gameEntity.movement) {
                // Check if this unit has a target
                if (gameEntity.movement.target_x !== null && gameEntity.movement.target_y !== null) {
                    hasAnyTarget = true;
                    break;
                }
            }
        }

        // If no selected units have targets, hide the target indicator
        if (!hasAnyTarget) {
            this.entityRenderer.clearTargetIndicator();
        }
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
