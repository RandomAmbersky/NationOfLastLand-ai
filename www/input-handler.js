import { GAME_CONFIG } from './game-config.js';

/**
 * Управляет обработкой ввода пользователя (мышь, клавиатура)
 */
export class InputHandler {
    constructor(gameDemo) {
        this.gameDemo = gameDemo;
        this._dragState = this._createDragState();
    }

    _createDragState() {
        return {
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
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    handleMouseDown(event) {
        if (!this.gameDemo.isInitialized) return;

        if (event.button === 2) {
            this._handleRightMouseDown(event);
            return;
        }

        this._cleanupDragGraphics();
        this._startDragSelection(event);
    }

    _handleRightMouseDown(event) {
        const { screenX, screenY } = this._getCanvasCoords(event);
        const entityAtPosition = this.gameDemo.entityRenderer.findEntityAtPosition(screenX, screenY);

        if (entityAtPosition !== null) {
            this.gameDemo.selectionManager.clearAllSelections(true);
            this.gameDemo.selectionManager.selectEntity(entityAtPosition, true, true);
            this.gameDemo.displayEntityInfo(entityAtPosition);
        } else {
            this.gameDemo.selectionManager.clearAllSelections(true);
        }
    }

    handleMouseMove(event) {
        const drag = this._dragState;
        if (!drag.isDragging) return;

        if (drag.mouseLeftCanvas) {
            this._cancelDragSelection();
            return;
        }

        this._updateDragSelection(event);
    }

    handleMouseUp(event) {
        this._cleanupDragGraphics();

        const drag = this._dragState;
        if (!drag.isDragging) return;

        if (drag.mouseLeftCanvas) {
            this._cancelDragSelection();
            return;
        }

        const wasDragging = drag.hasDragged;
        drag.isDragging = false;

        if (wasDragging) {
            this._processDragSelection();
        }
    }

    handleMouseLeave(event) {
        const drag = this._dragState;
        if (!drag.isDragging) return;

        drag.mouseLeftCanvas = true;
        drag.isDragging = false;
        drag.hasDragged = false;

        if (drag.graphics) {
            this.gameDemo.app.stage.removeChild(drag.graphics);
            drag.graphics = null;
        }
    }

    handleCanvasClick(event) {
        if (!this.gameDemo.isInitialized) return;

        const drag = this._dragState;
        if (drag.justFinishedDrag) {
            drag.justFinishedDrag = false;
            return;
        }

        const { screenX, screenY } = this._getCanvasCoords(event);
        const { gameX, gameY } = this._toGameCoords(screenX, screenY);

        const entityAtPosition = this.gameDemo.entityRenderer.findEntityAtPosition(screenX, screenY);

        if (entityAtPosition !== null) {
            // Проверяем, нажата ли клавиша Shift для множественного выбора
            const isMultiSelect = event.shiftKey;
            this.gameDemo.selectionManager.handleEntityClick(entityAtPosition, isMultiSelect, event);
        } else {
            // Клик по пустому месту - установка цели для группы или снятие выделения
            if (this.gameDemo.selectedEntityIds.size > 0) {
                this.gameDemo.setGroupTarget(gameX, gameY);
            } else {
                this.gameDemo.selectionManager.clearAllSelections();
            }
        }
    }

    handleDoubleClick(event) {
        if (!this.gameDemo.isInitialized) return;

        const { screenX, screenY } = this._getCanvasCoords(event);
        const entityId = this.gameDemo.entityRenderer.findEntityAtPosition(screenX, screenY);

        if (entityId !== null) {
            this.gameDemo.selectionManager.selectSameTypeUnits(entityId);
        } else {
            this.gameDemo.selectionManager.selectAllPlayerUnits();
            this.gameDemo.updateStatus('Double click on empty space - Selected all player units');
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

            case ' ':
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

    _cleanupDragGraphics() {
        const drag = this._dragState;
        if (drag.graphics && !drag.isDragging) {
            this.gameDemo.app.stage.removeChild(drag.graphics);
            drag.graphics = null;
        }
    }

    _startDragSelection(event) {
        this._cleanupDragGraphics();

        const { screenX, screenY } = this._getCanvasCoords(event);
        const drag = this._dragState;

        if (drag.mouseLeftCanvas) {
            drag.isDragging = false;
            drag.mouseLeftCanvas = false;
            if (drag.graphics) {
                this.gameDemo.app.stage.removeChild(drag.graphics);
                drag.graphics = null;
            }
        }

        drag.isDragging = true;
        drag.startX = screenX;
        drag.startY = screenY;
        drag.currentX = screenX;
        drag.currentY = screenY;
        drag.hasDragged = false;
        drag.mouseLeftCanvas = false;

        if (drag.graphics) {
            this.gameDemo.app.stage.removeChild(drag.graphics);
            drag.graphics = null;
        }

        drag.graphics = new PIXI.Graphics();
        drag.graphics.alpha = 0;
        drag.graphics.zIndex = 1000;
        this.gameDemo.app.stage.addChild(drag.graphics);
    }

    _updateDragSelection(event) {
        const { screenX, screenY } = this._getCanvasCoords(event);
        const drag = this._dragState;

        const clampedX = Math.max(0, Math.min(screenX, this.gameDemo.app.screen.width));
        const clampedY = Math.max(0, Math.min(screenY, this.gameDemo.app.screen.height));

        drag.currentX = clampedX;
        drag.currentY = clampedY;

        const dragDistance = Math.sqrt(
            (clampedX - drag.startX) ** 2 + (clampedY - drag.startY) ** 2
        );

        if (dragDistance > GAME_CONFIG.LIMITS.dragThreshold) {
            if (!drag.hasDragged) {
                drag.hasDragged = true;
            }

            if (drag.graphics) {
                drag.graphics.clear();
                drag.graphics.lineStyle(2, 0x00FF00, 0.8);
                drag.graphics.beginFill(0x00FF00, 0.2);

                const x = Math.min(drag.startX, drag.currentX);
                const y = Math.min(drag.startY, drag.currentY);
                const width = Math.abs(drag.currentX - drag.startX);
                const height = Math.abs(drag.currentY - drag.startY);

                if (width > 1 && height > 1) {
                    drag.graphics.drawRect(x, y, width, height);
                    drag.graphics.alpha = 1;
                } else {
                    drag.graphics.alpha = 0;
                }
            }
        }
    }

    _cancelDragSelection() {
        const drag = this._dragState;
        drag.isDragging = false;
        drag.mouseLeftCanvas = false;

        if (drag.graphics) {
            this.gameDemo.app.stage.removeChild(drag.graphics);
            drag.graphics = null;
        }
    }

    _processDragSelection() {
        const bounds = this._calculateSelectionBounds();
        const drag = this._dragState;

        if (this._isValidSelectionBounds(bounds)) {
            drag.justFinishedDrag = true;
            this.gameDemo.selectionManager.selectEntitiesInRectangle(bounds);
        } else {
            drag.justFinishedDrag = false;
        }

        if (drag.graphics) {
            this.gameDemo.app.stage.removeChild(drag.graphics);
            drag.graphics = null;
        }
    }

    _calculateSelectionBounds() {
        const drag = this._dragState;
        return {
            x: Math.min(drag.startX, drag.currentX),
            y: Math.min(drag.startY, drag.currentY),
            width: Math.abs(drag.currentX - drag.startX),
            height: Math.abs(drag.currentY - drag.startY)
        };
    }

    _isValidSelectionBounds(bounds) {
        return bounds.width > GAME_CONFIG.LIMITS.dragThreshold &&
               bounds.height > GAME_CONFIG.LIMITS.dragThreshold;
    }

    _getCanvasCoords(event) {
        const rect = this.gameDemo.app.view.getBoundingClientRect();
        return {
            screenX: event.clientX - rect.left,
            screenY: event.clientY - rect.top
        };
    }

    _toGameCoords(screenX, screenY) {
        return {
            gameX: (screenX / this.gameDemo.app.screen.width) * this.gameDemo.gameWidth,
            gameY: (screenY / this.gameDemo.app.screen.height) * this.gameDemo.gameHeight
        };
    }
}
