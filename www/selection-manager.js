import { select_entity, deselect_entity, clear_selection } from './wasm-imports.js';
import { GAME_CONFIG } from './game-config.js';

/**
 * Управляет выделением сущностей
 */
export class SelectionManager {
    constructor(gameDemo) {
        this.gameDemo = gameDemo;
        this.isSelecting = false;
        this.selectionOperationInProgress = false;
    }

    handleEntityClick(entityId, isMultiSelect, event) {
        const entity = this.gameDemo.entities.get(entityId);
        if (!entity) return;

        if (this.isSelecting) return;
        this.isSelecting = true;
        this.selectionOperationInProgress = true;

        try {
            if (this.hasImmobilePlayerUnitSelected()) {
                this.handleImmobileUnitSelection(entityId);
                return;
            }

            if (this.hasNonPlayerUnitSelected()) {
                this.handleNonPlayerUnitSelection(entityId);
                return;
            }

            this.handleStandardEntityClick(entityId, event, isMultiSelect);
        } finally {
            this.isSelecting = false;
            setTimeout(() => {
                this.selectionOperationInProgress = false;
            }, 100);
        }
    }

    hasImmobilePlayerUnitSelected() {
        for (const selectedId of this.gameDemo.selectedEntityIds) {
            const selectedEntity = this.gameDemo.entities.get(selectedId);
            if (selectedEntity && selectedEntity.faction === 'Player' && selectedEntity.entityType === 'base') {
                return true;
            }
        }
        return false;
    }

    hasNonPlayerUnitSelected() {
        for (const selectedId of this.gameDemo.selectedEntityIds) {
            const selectedEntity = this.gameDemo.entities.get(selectedId);
            if (selectedEntity && selectedEntity.faction !== 'Player') {
                return true;
            }
        }
        return false;
    }

    handleImmobileUnitSelection(entityId) {
        this.clearAllSelections(true);
        const selectionSuccessful = this.selectEntity(entityId, true, true);
        if (selectionSuccessful) {
            this.gameDemo.updateStatus(`Switched selection from immobile unit to entity ${entityId}`);
        }
        this.gameDemo.displayEntityInfo(entityId);
    }

    handleNonPlayerUnitSelection(entityId) {
        this.clearAllSelections(true);
        const selectionSuccessful = this.selectEntity(entityId, true, true);
        if (selectionSuccessful) {
            this.gameDemo.updateStatus(`Switched selection to entity ${entityId}`);
        }
        this.gameDemo.displayEntityInfo(entityId);
    }

    handleStandardEntityClick(entityId, event, isMultiSelect) {
        const entity = this.gameDemo.entities.get(entityId);
        if (!entity) return;

        const ctrlPressed = event && (event.ctrlKey || event.metaKey);
        const shiftPressed = event && event.shiftKey;

        if (this.gameDemo.selectedEntityIds.size > 0 && !isMultiSelect && !ctrlPressed && !shiftPressed && entity.entityType === 'alert') {
            if (this.gameDemo.entityRenderer.alertHighlight) {
                this.gameDemo.app.stage.removeChild(this.gameDemo.entityRenderer.alertHighlight);
                this.gameDemo.entityRenderer.alertHighlight = null;
            }
            this.gameDemo.setGroupTarget(entity.gameX, entity.gameY);
            this.gameDemo.updateStatus(`Moving group to alert at (${entity.gameX.toFixed(1)}, ${entity.gameY.toFixed(1)})`);
            this.gameDemo.entityRenderer.highlightTargetAlert({ x: entity.gameX, y: entity.gameY, id: entityId });
            return;
        }

        if (this.gameDemo.selectedEntityIds.size > 0 && !isMultiSelect && !ctrlPressed && !shiftPressed) {
            const targetEntity = entity;
            const isNonPlayerFaction = targetEntity.faction && targetEntity.faction !== 'Player';

            if (isNonPlayerFaction && this.hasPlayerUnitsSelected()) {
                if (this.gameDemo.entityRenderer.alertHighlight) {
                    this.gameDemo.app.stage.removeChild(this.gameDemo.entityRenderer.alertHighlight);
                    this.gameDemo.entityRenderer.alertHighlight = null;
                }
                this.gameDemo.setGroupTarget(targetEntity.gameX, targetEntity.gameY);
                this.gameDemo.updateStatus(`Group targeting enemy unit!`);
                return;
            }
        }

        let selectionSuccessful = false;

        if (ctrlPressed) {
            if (this.gameDemo.selectedEntityIds.has(entityId)) {
                this.deselectEntity(entityId, true);
                this.gameDemo.updateStatus(`Removed unit ${entityId} from selection`);
            } else {
                if (this.gameDemo.selectedEntityIds.size >= GAME_CONFIG.LIMITS.maxGroupSize) {
                    this.gameDemo.updateStatus(`Cannot select more than ${GAME_CONFIG.LIMITS.maxGroupSize} units in a group (current: ${this.gameDemo.selectedEntityIds.size})`);
                    return;
                }
                selectionSuccessful = this.selectEntity(entityId, true, false);
                if (selectionSuccessful) {
                    this.gameDemo.updateStatus(`Added unit ${entityId} to selection (${this.gameDemo.selectedEntityIds.size} total)`);
                }
            }
        } else if (shiftPressed) {
            if (!this.gameDemo.selectedEntityIds.has(entityId)) {
                if (this.gameDemo.selectedEntityIds.size >= GAME_CONFIG.LIMITS.maxGroupSize) {
                    this.gameDemo.updateStatus(`Cannot select more than ${GAME_CONFIG.LIMITS.maxGroupSize} units in a group (current: ${this.gameDemo.selectedEntityIds.size})`);
                    return;
                }
                selectionSuccessful = this.selectEntity(entityId, true, false);
                if (selectionSuccessful) {
                    this.gameDemo.updateStatus(`Extended selection to ${this.gameDemo.selectedEntityIds.size} units`);
                }
            }
        } else {
            this.clearAllSelections(true);
            selectionSuccessful = this.selectEntity(entityId, true, true);

            if (!selectionSuccessful) {
                this.clearAllSelections(true);
            }
        }

        this.gameDemo.displayEntityInfo(entityId);
    }

    selectEntity(entityId, bypassCheck = false, exclusive = true) {
        if (!bypassCheck && this.isSelecting) return false;

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
                    const selectionGraphics = new PIXI.Graphics();
                    const isEnemy = entity.faction === 'Enemy' || entity.faction === 'Wild';
                    const color = isEnemy ? 0xFF0000 : 0x0080FF;
                    selectionGraphics.lineStyle(3, color, 1);
                    selectionGraphics.drawCircle(0, 0, 12);
                    entity.container.addChild(selectionGraphics);
                    entity.selectionIndicator = selectionGraphics;
                }

                const count = this.gameDemo.selectedEntityIds.size;
                if (count === 1) {
                    this.gameDemo.updateStatus(`Entity ${entityId} selected.`);
                } else {
                    this.gameDemo.updateStatus(`${count} entities selected. Click on map to set group movement target.`);
                }

                this.gameDemo.updateSpawnButtonState();
                return true;
            } else {
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
                console.log(`Entity ${entityId} deselection failed (may be destroyed):`, selectionResult.message);
            }
        } catch (error) {
            console.error('Deselection API error:', error);
        }

        const count = this.gameDemo.selectedEntityIds.size;
        if (count === 0) {
            this.gameDemo.updateStatus('Selection cleared.');
        } else {
            this.gameDemo.updateStatus(`${count} entities selected.`);
        }

        this.gameDemo.updateSpawnButtonState();
    }

    clearAllSelections(bypassCheck = false) {
        if (!bypassCheck && this.isSelecting) return;
        this.selectionOperationInProgress = true;

        try {
            const result = clear_selection();
            const clearResult = JSON.parse(result);
            if (!clearResult.success) {
                console.error('Failed to clear selection on server:', clearResult.message);
            }
        } catch (error) {
            console.error('Error clearing selection on server:', error);
        }

        for (const entityId of this.gameDemo.selectedEntityIds) {
            const entity = this.gameDemo.entities.get(entityId);
            if (entity && entity.selectionIndicator) {
                entity.container.removeChild(entity.selectionIndicator);
                entity.selectionIndicator = null;
            }
        }
        this.gameDemo.selectedEntityIds.clear();
        this.gameDemo.updateStatus('Selection cleared.');
        this.gameDemo.updateEntityInfo(null);
        this.gameDemo.updateSpawnButtonState();

        setTimeout(() => {
            this.selectionOperationInProgress = false;
        }, 100);
    }

    selectEntitiesInRectangle(bounds) {
        if (this.isSelecting) return;

        this.isSelecting = true;
        this.selectionOperationInProgress = true;

        try {
            const entitiesInRectangle = this.findEntitiesInRectangle(bounds);

            if (entitiesInRectangle.length > 0) {
                this.processRectangleSelection(entitiesInRectangle);
            }
        } finally {
            this.isSelecting = false;
            setTimeout(() => {
                this.selectionOperationInProgress = false;
            }, 100);
        }
    }

    findEntitiesInRectangle(bounds) {
        const entities = [];
        for (const [id, entity] of this.gameDemo.entities) {
            if (this.isEntityInBounds(entity, bounds)) {
                entities.push(id);
            }
        }
        return entities;
    }

    isEntityInBounds(entity, bounds) {
        return entity.container.x >= bounds.x &&
               entity.container.x <= bounds.x + bounds.width &&
               entity.container.y >= bounds.y &&
               entity.container.y <= bounds.y + bounds.height;
    }

    processRectangleSelection(entitiesInRectangle) {
        this.clearAlertSelections();
        this.updateExistingSelections(entitiesInRectangle);
        this.addNewSelections(entitiesInRectangle);
        this.updateSelectionStatus(entitiesInRectangle.length);
    }

    clearAlertSelections() {
        for (const entityId of this.gameDemo.selectedEntityIds) {
            const entity = this.gameDemo.entities.get(entityId);
            if (entity && entity.entityType === 'alert') {
                this.deselectEntity(entityId, true);
            }
        }
    }

    updateExistingSelections(entitiesInRectangle) {
        for (const entityId of this.gameDemo.selectedEntityIds) {
            const entity = this.gameDemo.entities.get(entityId);
            const isPlayerMovableUnit = entity && entity.faction === 'Player' && entity.entityType === 'vehicle';

            if (!entitiesInRectangle.includes(entityId) || !isPlayerMovableUnit) {
                this.deselectEntity(entityId, true);
            }
        }
    }

    addNewSelections(entitiesInRectangle) {
        let addedCount = 0;
        for (const entityId of entitiesInRectangle) {
            if (!this.gameDemo.selectedEntityIds.has(entityId)) {
                if (this.gameDemo.selectedEntityIds.size >= GAME_CONFIG.LIMITS.maxGroupSize) {
                    break;
                }

                const entity = this.gameDemo.entities.get(entityId);
                if (entity && entity.faction === 'Player' && entity.entityType === 'vehicle') {
                    if (this.selectEntity(entityId, true, false)) {
                        addedCount++;
                    }
                }
            }
        }
    }

    updateSelectionStatus(totalFound) {
        const selectedCount = this.gameDemo.selectedEntityIds.size;
        if (selectedCount > 0) {
            const status = totalFound > GAME_CONFIG.LIMITS.maxGroupSize
                ? `Selected ${selectedCount} units (found ${totalFound}, limited to ${GAME_CONFIG.LIMITS.maxGroupSize})`
                : `Selected ${selectedCount} units (updated group)`;
            this.gameDemo.updateStatus(status);
        } else {
            this.gameDemo.updateStatus('No selectable units in selection area');
        }
    }

    selectAllPlayerUnits() {
        if (this.isSelecting) return;
        this.isSelecting = true;
        this.selectionOperationInProgress = true;

        try {
            this.clearAllSelections(true);

            const playerUnits = [];
            for (const [id, entity] of this.gameDemo.entities) {
                if (entity.faction === 'Player' && entity.entityType === 'vehicle') {
                    playerUnits.push(id);
                }
            }

            if (playerUnits.length > 0) {
                for (const unitId of playerUnits) {
                    this.selectEntity(unitId, true, false);
                }

                this.gameDemo.updateStatus(`Selected all ${playerUnits.length} player units`);
            } else {
                this.gameDemo.updateStatus('No player units found to select');
            }
        } finally {
            this.isSelecting = false;
            setTimeout(() => {
                this.selectionOperationInProgress = false;
            }, 1000);
        }
    }

    selectSameTypeUnits(entityId) {
        if (this.isSelecting) return;
        this.isSelecting = true;
        this.selectionOperationInProgress = true;

        try {
            const targetEntity = this.gameDemo.entities.get(entityId);
            if (!targetEntity) {
                this.gameDemo.updateStatus('Target entity not found');
                return;
            }

            this.clearAllSelections(true);

            const targetVehicleType = targetEntity.vehicleType;
            const targetEntityType = targetEntity.entityType;
            const targetFaction = targetEntity.faction;

            const sameTypeUnits = [];

            for (const [id, entity] of this.gameDemo.entities) {
                if (entity.entityType === targetEntityType &&
                    entity.vehicleType === targetVehicleType &&
                    entity.faction === targetFaction) {

                    const distance = Math.sqrt(
                        (entity.gameX - targetEntity.gameX) ** 2 +
                        (entity.gameY - targetEntity.gameY) ** 2
                    );

                    if (distance <= 200) {
                        sameTypeUnits.push(id);
                    }
                }
            }

            if (sameTypeUnits.length > 0) {
                const unitsToSelect = sameTypeUnits.slice(0, GAME_CONFIG.LIMITS.maxGroupSize);

                let selectedCount = 0;
                for (let i = 0; i < unitsToSelect.length; i++) {
                    const unitId = unitsToSelect[i];
                    const isFirst = i === 0;
                    const selectionSuccess = this.selectEntity(unitId, true, !isFirst);
                    if (selectionSuccess) {
                        selectedCount++;
                    }
                }

                const totalFound = sameTypeUnits.length;
                const actuallySelected = selectedCount;
                if (totalFound > GAME_CONFIG.LIMITS.maxGroupSize) {
                    this.gameDemo.updateStatus(`Selected ${actuallySelected} ${targetVehicleType} units of same type (found ${totalFound}, limited to ${GAME_CONFIG.LIMITS.maxGroupSize})`);
                } else {
                    this.gameDemo.updateStatus(`Selected ${actuallySelected} ${targetVehicleType} units of same type`);
                }
            } else {
                this.gameDemo.updateStatus(`No other ${targetVehicleType} units found in visibility range`);
            }
        } finally {
            this.isSelecting = false;
            setTimeout(() => {
                this.selectionOperationInProgress = false;
            }, 100);
        }
    }

    selectAllPlayerUnitsAtBase() {
        if (this.isSelecting) return;
        this.isSelecting = true;
        this.selectionOperationInProgress = true;

        try {
            this.clearAllSelections(true);

            if (this.gameDemo.bases.size === 0) {
                this.gameDemo.updateStatus('No base found to select units from');
                return;
            }

            const baseId = Array.from(this.gameDemo.bases.keys())[0];
            const base = this.gameDemo.bases.get(baseId);

            const unitsAtBase = [];

            for (const [id, entity] of this.gameDemo.entities) {
                if (entity.faction === 'Player' && entity.entityType === 'vehicle') {
                    const distance = Math.sqrt(
                        (entity.gameX - base.x) ** 2 +
                        (entity.gameY - base.y) ** 2
                    );

                    if (distance <= GAME_CONFIG.DISTANCES.baseUnitRadius) {
                        unitsAtBase.push(id);
                    }
                }
            }

            if (unitsAtBase.length > 0) {
                let selectedCount = 0;
                for (let i = 0; i < unitsAtBase.length && selectedCount < GAME_CONFIG.LIMITS.maxGroupSize; i++) {
                    const unitId = unitsAtBase[i];
                    const isFirst = i === 0;
                    const selectionSuccess = this.selectEntity(unitId, true, !isFirst);
                    if (selectionSuccess) {
                        selectedCount++;
                    }
                }

                this.gameDemo.updateStatus(`Selected ${selectedCount} player units at base`);
            } else {
                this.gameDemo.updateStatus('No player units found at base');
            }
        } finally {
            this.isSelecting = false;
            setTimeout(() => {
                this.selectionOperationInProgress = false;
            }, 100);
        }
    }

    hasPlayerUnitsSelected() {
        for (const entityId of this.gameDemo.selectedEntityIds) {
            const entity = this.gameDemo.entities.get(entityId);
            if (entity && entity.faction === 'Player') {
                return true;
            }
        }
        return false;
    }
}
