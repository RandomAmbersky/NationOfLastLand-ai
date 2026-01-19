import { select_entity, deselect_entity, clear_selection, handle_entity_selection } from './wasm-imports.js';
import { GAME_CONFIG } from './game-config.js';

/**
 * Управляет выделением сущностей
 */
export class SelectionManager {
    constructor(gameDemo) {
        this.gameDemo = gameDemo;
        this.isSelecting = false;
    }

    async handleEntityClick(entityId, isMultiSelect, event) {
        const entity = this.gameDemo.entities.get(entityId);
        if (!entity) return;

        if (this.isSelecting) return;
        this.isSelecting = true;

        try {
            // Используем новую логику выбора из Rust
            const currentSelectedIds = Array.from(this.gameDemo.selectedEntityIds);
            const result = await handle_entity_selection(entityId, isMultiSelect, currentSelectedIds);
            const selectionResult = JSON.parse(result);

            if (selectionResult.success) {
                // Обновляем локальное состояние на основе результата из Rust
                this._updateLocalSelectionState(selectionResult);

                // Обрабатываем различные действия
                switch (selectionResult.action) {
                    case 'EntitySelected':
                        this.gameDemo.displayEntityInfo(entityId);
                        break;
                    case 'EntityDeselected':
                        if (selectionResult.selected_entities.length === 1) {
                            this.gameDemo.displayEntityInfo(selectionResult.selected_entities[0]);
                        } else {
                            this.gameDemo.updateEntityInfo(null);
                        }
                        break;
                    case 'GroupTargetAssigned':
                        if (selectionResult.target_assigned) {
                            this._showGroupTargetingIndicator(selectionResult.target_assigned);
                        }
                        break;
                    case 'SelectionCleared':
                        this.gameDemo.updateEntityInfo(null);
                        break;
                }

                // Обновляем кнопки и статус
                this.gameDemo.updateSpawnButtonState();
                this.gameDemo.updateStatus(selectionResult.message);
            } else {
                this.gameDemo.updateStatus(`Ошибка выбора: ${selectionResult.message}`);
            }
        } catch (error) {
            console.error('Ошибка при выборе сущности:', error);
            this.gameDemo.updateStatus('Ошибка при выборе сущности');
        } finally {
            this.isSelecting = false;
        }
    }

    _updateLocalSelectionState(selectionResult) {
        // Синхронизируем локальное состояние с состоянием из Rust
        const newSelectedIds = new Set(selectionResult.selected_entities);

        // Удаляем индикаторы выделения для сущностей, которые больше не выбраны
        for (const entityId of this.gameDemo.selectedEntityIds) {
            if (!newSelectedIds.has(entityId)) {
                const entity = this.gameDemo.entities.get(entityId);
                if (entity && entity.selectionIndicator) {
                    entity.container.removeChild(entity.selectionIndicator);
                    entity.selectionIndicator = null;
                }
            }
        }

        // Добавляем индикаторы выделения для новых выбранных сущностей
        for (const entityId of newSelectedIds) {
            if (!this.gameDemo.selectedEntityIds.has(entityId)) {
                const entity = this.gameDemo.entities.get(entityId);
                if (entity) {
                    const isEnemy = entity.faction === 'Enemy' || entity.faction === 'Wild' || entity.entityType === 'alert';
                    this._createSelectionIndicator(entity, isEnemy);
                }
            }
        }

        // Обновляем множество выбранных ID
        this.gameDemo.selectedEntityIds = newSelectedIds;
    }

    _showGroupTargetingIndicator(targetAssignment) {
        const renderer = this.gameDemo.entityRenderer;
        if (renderer.alertHighlight) {
            this.gameDemo.app.stage.removeChild(renderer.alertHighlight);
            renderer.alertHighlight = null;
        }

        renderer.showTargetIndicator(targetAssignment.target_x, targetAssignment.target_y);

        const targetEntity = this.gameDemo.entities.get(targetAssignment.target_entity_id);
        const targetType = targetEntity ? (targetEntity.vehicleType || targetEntity.entityType) : 'unknown';
        const targetFaction = targetEntity ? (targetEntity.faction || 'Unknown') : 'Unknown';

        this.gameDemo.updateStatus(`Группа атакует: ${targetType} (#${targetAssignment.target_entity_id}) ${targetFaction}`);
    }

    selectEntity(entityId, bypassCheck = false, exclusive = true) {
        if (!bypassCheck && this.isSelecting) return false;

        // Clear target indicator when selecting a new entity
        if (this.gameDemo.selectedEntityIds.size > 0 && !this.gameDemo.selectedEntityIds.has(entityId)) {
            this.gameDemo.entityRenderer.clearTargetIndicator();
        }

        if (this.gameDemo.selectedEntityIds.has(entityId)) return true;

        if (this.gameDemo.selectedEntityIds.size >= GAME_CONFIG.LIMITS.maxGroupSize) {
            return false;
        }

        try {
            const result = select_entity(entityId, exclusive);
            const selectionResult = JSON.parse(result);
            if (selectionResult.success) {
                this.gameDemo.selectedEntityIds.add(entityId);
                const entity = this.gameDemo.entities.get(entityId);
                if (entity) {
                    // Все алерты подсвечиваются как враг
                    const isAlert = entity.entityType === 'alert';
                    const isEnemy = entity.faction === 'Enemy' || entity.faction === 'Wild' || isAlert;
                    this._createSelectionIndicator(entity, isEnemy);
                }

                const count = this.gameDemo.selectedEntityIds.size;
                if (count > 1) {
                    this.gameDemo.updateStatus(`${count} юнитов выделено.`);
                }
                this.gameDemo.updateSpawnButtonState();
                // this.gameDemo.updateSelectedEntityInfo();
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    deselectEntity(entityId, bypassCheck = false) {
        if (!bypassCheck && this.isSelecting) return;
        if (!this.gameDemo.selectedEntityIds.has(entityId)) return;

        this.gameDemo.selectedEntityIds.delete(entityId);
        const entity = this.gameDemo.entities.get(entityId);
        if (entity && entity.selectionIndicator) {
            entity.container.removeChild(entity.selectionIndicator);
            entity.selectionIndicator = null;
        }

        try {
            const result = deselect_entity(entityId);
            const selectionResult = JSON.parse(result);
            if (!selectionResult.success) {
                console.log(`Снятие выделения с ${entityId} не удалось:`, selectionResult.message);
            }
        } catch (error) {
            console.error('Ошибка API снятия выделения:', error);
        }

        this._updateSelectionStatus();
        // this.gameDemo.updateSelectedEntityInfo();
    }

    clearAllSelections(bypassCheck = false) {
        if (!bypassCheck && this.isSelecting) return;

        try {
            const result = clear_selection();
            const clearResult = JSON.parse(result);
            if (!clearResult.success) {
                console.error('Не удалось очистить выделение на сервере:', clearResult.message);
            }
        } catch (error) {
            console.error('Ошибка очистки выделения на сервере:', error);
        }

        for (const entityId of this.gameDemo.selectedEntityIds) {
            const entity = this.gameDemo.entities.get(entityId);
            if (entity && entity.selectionIndicator) {
                entity.container.removeChild(entity.selectionIndicator);
                entity.selectionIndicator = null;
            }
        }
        this.gameDemo.selectedEntityIds.clear();
        this.gameDemo.updateStatus('Выделение снято.');
        this.gameDemo.updateEntityInfo(null);
        this.gameDemo.updateSpawnButtonState();
    }

    async selectEntitiesInRectangle(bounds) {
        if (this.isSelecting) return;

        this.isSelecting = true;

        try {
            const entitiesInRectangle = this._findEntitiesInRectangle(bounds);
            if (entitiesInRectangle.length > 0) {
                await this._processRectangleSelection(entitiesInRectangle);
            }
        } finally {
            this.isSelecting = false;
        }
    }

    _findEntitiesInRectangle(bounds) {
        const entities = [];
        for (const [id, entity] of this.gameDemo.entities) {
            if (this._isEntityInBounds(entity, bounds)) {
                entities.push(id);
            }
        }
        return entities;
    }

    _isEntityInBounds(entity, bounds) {
        return entity.container.x >= bounds.x &&
               entity.container.x <= bounds.x + bounds.width &&
               entity.container.y >= bounds.y &&
               entity.container.y <= bounds.y + bounds.height;
    }

    async _processRectangleSelection(entitiesInRectangle) {
        this._clearAlertSelections();

        const playerMovableUnits = entitiesInRectangle.filter(id => {
            const entity = this.gameDemo.entities.get(id);
            return entity &&
                   entity.faction === 'Player' &&
                   entity.entityType === 'vehicle';
        });

        if (playerMovableUnits.length === 0) {
            this.gameDemo.updateStatus('Нет подвижных юнитов игрока в области выделения');
            return;
        }

        this.clearAllSelections(true);

        const maxSize = GAME_CONFIG.LIMITS.maxGroupSize;
        const unitsToSelect = playerMovableUnits.slice(0, maxSize);

        // Используем handle_entity_selection для каждого юнита с isMultiSelect=true
        // чтобы получить правильное отображение группы
        for (const entityId of unitsToSelect) {
            try {
                const currentSelectedIds = Array.from(this.gameDemo.selectedEntityIds);
                const result = await handle_entity_selection(entityId, true, currentSelectedIds);
                const selectionResult = JSON.parse(result);

                if (selectionResult.success) {
                    // Обновляем локальное состояние на основе результата из Rust
                    this._updateLocalSelectionState(selectionResult);
                } else {
                    console.warn(`Не удалось выбрать юнит ${entityId}:`, selectionResult.message);
                }
            } catch (error) {
                console.error('Ошибка при выборе сущности рамкой:', error);
            }
        }

        // После выбора всех юнитов обновляем статус и информацию
        const finalSelectedCount = this.gameDemo.selectedEntityIds.size;
        if (finalSelectedCount > 0) {
            // Обновляем статус через gameDemo.updateStatus с правильным сообщением группы
            this.gameDemo.updateStatus(`Группа (${finalSelectedCount} юнитов игрока)`);
            // Показываем информацию о группе с здоровьем
            this.gameDemo.displayGroupInfo();
        } else {
            this.gameDemo.updateStatus('Не удалось выбрать юнитов из области выделения');
        }
    }

    _clearAlertSelections() {
        for (const entityId of this.gameDemo.selectedEntityIds) {
            const entity = this.gameDemo.entities.get(entityId);
            if (entity && entity.entityType === 'alert') {
                this.deselectEntity(entityId, true);
            }
        }
    }

    _hasPlayerUnitsSelected() {
        for (const entityId of this.gameDemo.selectedEntityIds) {
            const entity = this.gameDemo.entities.get(entityId);
            if (entity && entity.faction === 'Player') {
                return true;
            }
        }
        return false;
    }

    _createSelectionIndicator(entity, isEnemy = false) {
        const graphics = new PIXI.Graphics();
        const color = isEnemy ? GAME_CONFIG.COLORS.selection.enemy : GAME_CONFIG.COLORS.selection.player;
        graphics.lineStyle(3, color, 1);
        graphics.drawCircle(0, 0, 12);
        entity.container.addChild(graphics);
        entity.selectionIndicator = graphics;
    }

    _updateSelectionStatus() {
        const count = this.gameDemo.selectedEntityIds.size;
        if (count === 0) {
            this.gameDemo.updateStatus('Выделение снято.');
            this.gameDemo.updateEntityInfo(null);
        } else {
            this.gameDemo.updateStatus(`${count} юнитов выделено.`);
        }
        this.gameDemo.updateSpawnButtonState();
    }

    /**
     * Выбрать всех подвижных юнитов игрока (с новой логикой группы)
     */
    async selectAllPlayerUnits() {
        this.clearAllSelections(true);

        // Собираем всех подвижных юнитов игрока
        const playerMovableUnits = [];
        for (const [entityId, entity] of this.gameDemo.entities) {
            if (entity.faction === 'Player' && entity.entityType === 'vehicle') {
                playerMovableUnits.push(entityId);
            }
        }

        if (playerMovableUnits.length === 0) {
            this.gameDemo.updateStatus('Нет доступных юнитов игрока');
            return;
        }

        const maxSize = GAME_CONFIG.LIMITS.maxGroupSize;
        const unitsToSelect = playerMovableUnits.slice(0, maxSize);

        // Используем handle_entity_selection для каждого юнита с isMultiSelect=true
        // чтобы получить правильное отображение группы
        for (const entityId of unitsToSelect) {
            try {
                const currentSelectedIds = Array.from(this.gameDemo.selectedEntityIds);
                const result = await handle_entity_selection(entityId, true, currentSelectedIds);
                const selectionResult = JSON.parse(result);

                if (selectionResult.success) {
                    // Обновляем локальное состояние на основе результата из Rust
                    this._updateLocalSelectionState(selectionResult);
                } else {
                    console.warn(`Не удалось выбрать юнит ${entityId}:`, selectionResult.message);
                }
            } catch (error) {
                console.error('Ошибка при выборе всех юнитов:', error);
            }
        }

        // После выбора всех юнитов обновляем статус и информацию
        const finalSelectedCount = this.gameDemo.selectedEntityIds.size;
        if (finalSelectedCount > 0) {
            // Обновляем статус через gameDemo.updateStatus с правильным сообщением группы
            this.gameDemo.updateStatus(`Группа (${finalSelectedCount} юнитов игрока)`);
            // Показываем информацию о группе с здоровьем
            this.gameDemo.displayGroupInfo();
        } else {
            this.gameDemo.updateStatus('Не удалось выбрать юнитов');
        }
    }

    /**
     * Выбрать все юниты того же типа
     */
    selectSameTypeUnits(entityId) {
        const entity = this.gameDemo.entities.get(entityId);
        if (!entity) return;

        const targetType = entity.vehicleType || entity.entityType;
        const targetFaction = entity.faction;

        this.clearAllSelections(true);

        let addedCount = 0;
        const maxSize = GAME_CONFIG.LIMITS.maxGroupSize;

        for (const [id, ent] of this.gameDemo.entities) {
            if (this.gameDemo.selectedEntityIds.size >= maxSize) break;
            const entityType = ent.vehicleType || ent.entityType;
            if (entityType === targetType && ent.faction === targetFaction) {
                if (this.selectEntity(id, true, false)) {
                    addedCount++;
                }
            }
        }

        this.gameDemo.updateStatus(`Выделено ${addedCount} юнитов типа ${targetType}`);
        // this.gameDemo.updateSelectedEntityInfo();
    }

    /**
     * Выбрать всех подвижных юнитов игрока у базы
     */
    selectAllPlayerUnitsAtBase() {
        // Find player base first
        let baseEntity = null;
        for (const [entityId, entity] of this.gameDemo.entities) {
            if (entity.faction === 'Player' && entity.entityType === 'base') {
                baseEntity = entity;
                break;
            }
        }

        if (!baseEntity) {
            this.gameDemo.updateStatus('База игрока не найдена');
            return;
        }

        this.clearAllSelections(true);

        // Select the base first
        for (const [entityId, entity] of this.gameDemo.entities) {
            if (entity.faction === 'Player' && entity.entityType === 'base' && entity.id === baseEntity.id) {
                this.selectEntity(entityId, true, false);
                break;
            }
        }

        // Then select all player vehicles
        let addedCount = 1; // Base is already selected
        const maxSize = GAME_CONFIG.LIMITS.maxGroupSize;
        const baseRange = 100; // Units within 100 units of base

        for (const [entityId, entity] of this.gameDemo.entities) {
            if (this.gameDemo.selectedEntityIds.size >= maxSize) break;
            if (entity.faction === 'Player' && entity.entityType === 'vehicle') {
                const distance = Math.sqrt(
                    (entity.gameX - baseEntity.gameX) ** 2 +
                    (entity.gameY - baseEntity.gameY) ** 2
                );
                if (distance <= baseRange) {
                    if (this.selectEntity(entityId, true, false)) {
                        addedCount++;
                    }
                }
            }
        }

        this.gameDemo.updateStatus(`Выделено ${addedCount} юнитов у базы`);
        // this.gameDemo.updateSelectedEntityInfo();
    }
}
