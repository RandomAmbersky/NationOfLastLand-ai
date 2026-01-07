import { GAME_CONFIG } from './game-config.js';

/**
 * Управляет обработкой ввода пользователя (мышь, клавиатура)
 */
export class InputHandler {
    constructor(gameDemo) {
        this.gameDemo = gameDemo;
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
    }

    setupEventListeners() {
        const canvas = this.gameDemo.app.view;
        canvas.addEventListener('mousedown', (event) => this.handleMouseDown(event));
        canvas.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        canvas.addEventListener('mouseup', (event) => this.handleMouseUp(event));
        canvas.addEventListener('mouseleave', (event) => this.handleMouseLeave(event));
        canvas.addEventListener('mouseenter', (event) => this.handleMouseEnter(event));
        canvas.addEventListener('click', (event) => this.handleCanvasClick(event));
        canvas.addEventListener('dblclick', (event) => this.handleDoubleClick(event));
        canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
    }

    handleMouseDown(event) {
        if (!this.gameDemo.isInitialized) return;

        if (event.button === 2) {
            this.handleRightMouseDown(event);
            return;
        }

        this.cleanupDragGraphics();
        this.startDragSelection(event);
    }

    handleRightMouseDown(event) {
        const rect = this.gameDemo.app.view.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        const entityAtPosition = this.gameDemo.entityRenderer.findEntityAtPosition(screenX, screenY);

        if (entityAtPosition !== null) {
            const entity = this.gameDemo.entities.get(entityAtPosition);
            if (entity) {
                let entityType = entity.entityType === 'vehicle' ? entity.vehicleType : entity.entityType;
                const faction = entity.faction || 'Unknown';

                if (!entityType || entityType === 'unknown') {
                    if (faction === 'Wild') {
                        entityType = 'wild_creature';
                    } else if (faction === 'Neutral') {
                        entityType = 'neutral_entity';
                    } else {
                        entityType = 'unit';
                    }
                }

                this.gameDemo.updateStatus(`Entity #${entityAtPosition}: ${entityType} (${faction}) - Info displayed in panel`);
            }
            this.gameDemo.displayEntityInfo(entityAtPosition);
        } else {
            this.gameDemo.selectionManager.clearAllSelections();
        }
    }

    handleMouseMove(event) {
        if (!this.dragSelection.isDragging) return;

        if (this.dragSelection.mouseLeftCanvas) {
            this.cancelDragSelection();
            return;
        }

        this.updateDragSelection(event);
    }

    handleMouseUp(event) {
        this.cleanupDragGraphics();

        if (!this.dragSelection.isDragging) return;

        if (this.dragSelection.mouseLeftCanvas) {
            this.cancelDragSelection();
            return;
        }

        const wasDragging = this.dragSelection.hasDragged;
        this.dragSelection.isDragging = false;

        if (wasDragging) {
            this.processDragSelection();
        }
    }

    handleMouseLeave(event) {
        if (!this.dragSelection.isDragging) return;

        this.dragSelection.mouseLeftCanvas = true;
        this.dragSelection.isDragging = false;
        this.dragSelection.hasDragged = false;

        if (this.dragSelection.graphics) {
            this.gameDemo.app.stage.removeChild(this.dragSelection.graphics);
            this.dragSelection.graphics = null;
        }
    }

    handleMouseEnter(event) {
        // Mouse entered canvas - no action needed for drag selection
        // mouseLeftCanvas flag is reset in handleMouseDown for new drags
    }

    handleCanvasClick(event) {
        if (!this.gameDemo.isInitialized) return;

        if (this.dragSelection.justFinishedDrag) {
            this.dragSelection.justFinishedDrag = false;
            return;
        }

        const rect = this.gameDemo.app.view.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        if (screenX < 0 || screenX > this.gameDemo.app.screen.width || screenY < 0 || screenY > this.gameDemo.app.screen.height) {
            return;
        }

        const gameX = (screenX / this.gameDemo.app.screen.width) * this.gameDemo.gameWidth;
        const gameY = (screenY / this.gameDemo.app.screen.height) * this.gameDemo.gameHeight;

        const entityAtPosition = this.gameDemo.entityRenderer.findEntityAtPosition(screenX, screenY);

        if (entityAtPosition !== null) {
            this.gameDemo.selectionManager.handleEntityClick(entityAtPosition, false, event);
        } else if (this.gameDemo.selectedEntityIds.size > 0) {
            const alertAtPosition = this.gameDemo.entityRenderer.findAlertAtPosition(gameX, gameY);

            if (alertAtPosition !== null) {
                this.gameDemo.setGroupTarget(alertAtPosition.x, alertAtPosition.y);
                this.gameDemo.updateStatus(`Moving group to alert at (${alertAtPosition.x.toFixed(1)}, ${alertAtPosition.y.toFixed(1)})`);
                this.gameDemo.entityRenderer.highlightTargetAlert(alertAtPosition);
            } else {
                this.gameDemo.setGroupTarget(gameX, gameY);
            }
        } else {
            this.gameDemo.selectionManager.clearAllSelections();
        }
    }

    handleDoubleClick(event) {
        if (!this.gameDemo.isInitialized) return;

        const rect = this.gameDemo.app.view.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        const entityId = this.gameDemo.entityRenderer.findEntityAtPosition(screenX, screenY);

        if (entityId !== null) {
            this.gameDemo.selectionManager.selectSameTypeUnits(entityId);
        } else {
            this.gameDemo.selectionManager.selectAllPlayerUnits();
            this.gameDemo.updateStatus(`Double click on empty space - Selected all player units`);
        }
    }

    handleKeyDown(event) {
        if (!this.gameDemo.isInitialized) return;

        if (event.ctrlKey && event.key === 'a') {
            event.preventDefault();
            this.gameDemo.selectionManager.selectAllPlayerUnitsAtBase();
            return;
        }

        switch (event.key) {
            case 'Escape':
                this.gameDemo.selectionManager.clearAllSelections();
                this.gameDemo.updateStatus('Selection cleared (Escape key)');
                break;

            case ' ': // Spacebar
                if (this.gameDemo.selectedEntityIds.size > 0) {
                    for (const entityId of this.gameDemo.selectedEntityIds) {
                        const entity = this.gameDemo.entities.get(entityId);
                        if (entity) {
                            this.gameDemo.setEntityTarget(entityId, entity.gameX, entity.gameY);
                        }
                    }
                    this.gameDemo.updateStatus(`Stopped ${this.gameDemo.selectedEntityIds.size} unit(s) (Spacebar)`);
                }
                event.preventDefault();
                break;

            case 'Delete':
                if (this.gameDemo.selectedEntityIds.size > 0) {
                    for (const entityId of this.gameDemo.selectedEntityIds) {
                        const entity = this.gameDemo.entities.get(entityId);
                        if (entity) {
                            this.gameDemo.setEntityTarget(entityId, entity.gameX, entity.gameY);
                        }
                    }
                    this.gameDemo.updateStatus(`Cancelled commands for ${this.gameDemo.selectedEntityIds.size} unit(s) (Delete key)`);
                }
                break;
        }
    }

    cleanupDragGraphics() {
        if (this.dragSelection.graphics && !this.dragSelection.isDragging) {
            this.gameDemo.app.stage.removeChild(this.dragSelection.graphics);
            this.dragSelection.graphics = null;
        }
    }

    startDragSelection(event) {
        this.cleanupDragGraphics();

        const rect = this.gameDemo.app.view.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        if (this.dragSelection.mouseLeftCanvas) {
            this.dragSelection.isDragging = false;
            this.dragSelection.mouseLeftCanvas = false;
            if (this.dragSelection.graphics) {
                this.gameDemo.app.stage.removeChild(this.dragSelection.graphics);
                this.dragSelection.graphics = null;
            }
        }

        this.dragSelection.isDragging = true;
        this.dragSelection.startX = screenX;
        this.dragSelection.startY = screenY;
        this.dragSelection.currentX = screenX;
        this.dragSelection.currentY = screenY;
        this.dragSelection.hasDragged = false;
        this.dragSelection.mouseLeftCanvas = false;

        if (this.dragSelection.graphics) {
            this.gameDemo.app.stage.removeChild(this.dragSelection.graphics);
            this.dragSelection.graphics = null;
        }

        this.dragSelection.graphics = new PIXI.Graphics();
        this.dragSelection.graphics.alpha = 0;
        this.dragSelection.graphics.zIndex = 1000;
        this.gameDemo.app.stage.addChild(this.dragSelection.graphics);
    }

    updateDragSelection(event) {
        const rect = this.gameDemo.app.view.getBoundingClientRect();
        const newX = event.clientX - rect.left;
        const newY = event.clientY - rect.top;

        const clampedX = Math.max(0, Math.min(newX, this.gameDemo.app.screen.width));
        const clampedY = Math.max(0, Math.min(newY, this.gameDemo.app.screen.height));

        this.dragSelection.currentX = clampedX;
        this.dragSelection.currentY = clampedY;

        const dragDistance = Math.sqrt(
            (clampedX - this.dragSelection.startX) ** 2 +
            (clampedY - this.dragSelection.startY) ** 2
        );

        if (dragDistance > GAME_CONFIG.LIMITS.dragThreshold) {
            if (!this.dragSelection.hasDragged) {
                this.dragSelection.hasDragged = true;
            }

            if (this.dragSelection.graphics) {
                this.dragSelection.graphics.clear();
                this.dragSelection.graphics.lineStyle(2, 0x00FF00, 0.8);
                this.dragSelection.graphics.beginFill(0x00FF00, 0.2);

                const x = Math.min(this.dragSelection.startX, this.dragSelection.currentX);
                const y = Math.min(this.dragSelection.startY, this.dragSelection.currentY);
                const width = Math.abs(this.dragSelection.currentX - this.dragSelection.startX);
                const height = Math.abs(this.dragSelection.currentY - this.dragSelection.startY);

                if (width > 1 && height > 1) {
                    this.dragSelection.graphics.drawRect(x, y, width, height);
                    this.dragSelection.graphics.alpha = 1;
                } else {
                    this.dragSelection.graphics.alpha = 0;
                }
            }
        }
    }

    cancelDragSelection() {
        this.dragSelection.isDragging = false;
        this.dragSelection.mouseLeftCanvas = false;

        if (this.dragSelection.graphics) {
            this.gameDemo.app.stage.removeChild(this.dragSelection.graphics);
            this.dragSelection.graphics = null;
        }
    }

    processDragSelection() {
        const selectionBounds = this.calculateSelectionBounds();

        if (this.isValidSelectionBounds(selectionBounds)) {
            this.dragSelection.justFinishedDrag = true;
            this.gameDemo.selectionManager.selectEntitiesInRectangle(selectionBounds);
        } else {
            this.dragSelection.justFinishedDrag = false;
        }

        this.finalizeSelection();
    }

    calculateSelectionBounds() {
        return {
            x: Math.min(this.dragSelection.startX, this.dragSelection.currentX),
            y: Math.min(this.dragSelection.startY, this.dragSelection.currentY),
            width: Math.abs(this.dragSelection.currentX - this.dragSelection.startX),
            height: Math.abs(this.dragSelection.currentY - this.dragSelection.startY)
        };
    }

    isValidSelectionBounds(bounds) {
        return bounds.width > GAME_CONFIG.LIMITS.dragThreshold &&
               bounds.height > GAME_CONFIG.LIMITS.dragThreshold;
    }

    finalizeSelection() {
        if (this.dragSelection.graphics) {
            this.gameDemo.app.stage.removeChild(this.dragSelection.graphics);
            this.dragSelection.graphics = null;
        }
    }
}