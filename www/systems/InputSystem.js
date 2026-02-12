/**
 * Input System - Handles user input (mouse, keyboard)
 * Extracted from original InputHandler for better separation of concerns
 */

import { GAME_CONFIG } from '../config/game-config.js'

export class InputSystem {
  constructor (gameEngine) {
    this.gameEngine = gameEngine
    this.app = null
    this.dragState = this._createDragState()
    this.isDestroyed = false
  }

  _createDragState () {
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
    }
  }

  init (app) {
    this.app = app
    this.setupEventListeners()
  }

  setupEventListeners () {
    if (!this.app) return
    const canvas = this.app.view
    canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e))
    canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e))
    canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e))
    canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e))
    canvas.addEventListener('click', (e) => this.handleCanvasClick(e))
    canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e))
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    document.addEventListener('keydown', (e) => this.handleKeyDown(e))
  }

  handleMouseDown (event) {
    if (!this.gameEngine.state.get('isRunning')) return

    if (event.button === 2) {
      this._handleRightMouseDown(event)
      return
    }

    this._cleanupDragGraphics()
    this._startDragSelection(event)
  }

   _handleRightMouseDown (event) {
    const { screenX, screenY } = this._getCanvasCoords(event)
    const entityAtPosition = this._findEntityAtPosition(screenX, screenY)

    if (entityAtPosition !== null) {
      this.gameEngine.state.emit('entitySelected', { entityId: entityAtPosition })
    } else {
      this.gameEngine.state.emit('selectionCleared')
    }
  }

  handleMouseMove (event) {
    const drag = this.dragState
    if (!drag.isDragging) return

    if (drag.mouseLeftCanvas) {
      this._cancelDragSelection()
      return
    }

    this._updateDragSelection(event)
  }

  handleMouseUp (_event) {
    this._cleanupDragGraphics()

    const drag = this.dragState
    if (!drag.isDragging) return

    if (drag.mouseLeftCanvas) {
      this._cancelDragSelection()
      return
    }

    const wasDragging = drag.hasDragged
    drag.isDragging = false

    if (wasDragging) {
      this._processDragSelection()
    } else {
      if (drag.graphics) {
        this.app.stage.removeChild(drag.graphics)
        drag.graphics = null
      }
    }
  }

  handleMouseLeave (_event) {
    const drag = this.dragState
    if (!drag.isDragging) return

    drag.mouseLeftCanvas = true
    drag.isDragging = false
    drag.hasDragged = false

    if (drag.graphics) {
      this.app.stage.removeChild(drag.graphics)
      drag.graphics = null
    }
  }

  handleCanvasClick (event) {
     if (!this.gameEngine.state.get('isRunning')) return

     const drag = this.dragState
     if (drag.justFinishedDrag) {
       drag.justFinishedDrag = false
       return
     }

     const { screenX, screenY } = this._getCanvasCoords(event)
     const { gameX, gameY } = this._toGameCoords(screenX, screenY)

     const entityAtPosition = this._findEntityAtPosition(screenX, screenY)

      if (entityAtPosition !== null) {
        // Клик по юниту
        const isMultiSelect = event.shiftKey
        console.log('InputSystem: entity clicked, id=', entityAtPosition, 'shiftKey=', isMultiSelect)
        this.gameEngine.state.emit('entityClicked', {
          entityId: entityAtPosition,
          isMultiSelect,
          gameX,
          gameY
        })
      } else {
       // Клик по пустому месту - сбрасываем выделение
       this.gameEngine.state.emit('selectionCleared')
     }
   }

  handleDoubleClick (event) {
    if (!this.gameEngine.state.get('isRunning')) return

    const { screenX, screenY } = this._getCanvasCoords(event)
    const entityId = this._findEntityAtPosition(screenX, screenY)

     if (entityId !== null) {
       this.gameEngine.state.emit('entityDoubleClicked', { entityId })
     } else {
       this.gameEngine.state.emit('selectAllPlayerUnits')
     }
  }

  handleKeyDown (event) {
    if (!this.gameEngine.state.get('isRunning')) return

     if (event.ctrlKey && event.key === 'a') {
       event.preventDefault()
       this.gameEngine.state.emit('selectAllPlayerUnitsAtBase')
       return
     }

     switch (event.key) {
       case 'Escape':
         this.gameEngine.state.emit('selectionCleared')
         break

       case ' ':
         if (this.gameEngine.state.get('selections').size > 0) {
           this.gameEngine.state.emit('groupStop')
         }
         event.preventDefault()
         break

       case 'Delete':
         if (this.gameEngine.state.get('selections').size > 0) {
           this.gameEngine.state.emit('groupCancelCommand')
         }
         break
     }
  }

  _cleanupDragGraphics () {
    const drag = this.dragState
    if (drag.graphics && !drag.isDragging) {
      this.app.stage.removeChild(drag.graphics)
      drag.graphics = null
    }
  }

  _startDragSelection (event) {
    this._cleanupDragGraphics()

    const { screenX, screenY } = this._getCanvasCoords(event)
    const drag = this.dragState

    if (drag.mouseLeftCanvas) {
      drag.isDragging = false
      drag.mouseLeftCanvas = false
      if (drag.graphics) {
        this.app.stage.removeChild(drag.graphics)
        drag.graphics = null
      }
    }

    drag.isDragging = true
    drag.startX = screenX
    drag.startY = screenY
    drag.currentX = screenX
    drag.currentY = screenY
    drag.hasDragged = false
    drag.mouseLeftCanvas = false

    if (drag.graphics) {
      this.app.stage.removeChild(drag.graphics)
      drag.graphics = null
    }

    drag.graphics = new PIXI.Graphics()
    drag.graphics.alpha = 0
    drag.graphics.zIndex = 1000
    this.app.stage.addChild(drag.graphics)
  }

  _updateDragSelection (event) {
    const { screenX, screenY } = this._getCanvasCoords(event)
    const drag = this.dragState

    const clampedX = Math.max(0, Math.min(screenX, this.app.screen.width))
    const clampedY = Math.max(0, Math.min(screenY, this.app.screen.height))

    drag.currentX = clampedX
    drag.currentY = clampedY

    const dragDistance = Math.hypot(clampedX - drag.startX, clampedY - drag.startY)

    if (dragDistance > GAME_CONFIG.LIMITS.dragThreshold) {
      if (!drag.hasDragged) {
        drag.hasDragged = true
      }

      if (drag.graphics) {
        drag.graphics.clear()
        drag.graphics.lineStyle(2, 0x00ff00, 0.8)
        drag.graphics.beginFill(0x00ff00, 0.2)

        const x = Math.min(drag.startX, drag.currentX)
        const y = Math.min(drag.startY, drag.currentY)
        const width = Math.abs(drag.currentX - drag.startX)
        const height = Math.abs(drag.currentY - drag.startY)

        if (width > 1 && height > 1) {
          drag.graphics.drawRect(x, y, width, height)
          drag.graphics.alpha = 1
        } else {
          drag.graphics.alpha = 0
        }
      }
    }
  }

  _cancelDragSelection () {
    const drag = this.dragState
    drag.isDragging = false
    drag.mouseLeftCanvas = false

    if (drag.graphics) {
      this.app.stage.removeChild(drag.graphics)
      drag.graphics = null
    }
  }

  _processDragSelection () {
    const bounds = this._calculateSelectionBounds()
    const drag = this.dragState

     if (this._isValidSelectionBounds(bounds)) {
       drag.justFinishedDrag = true
       this.gameEngine.state.emit('rectangleSelection', { bounds })
     } else {
       drag.justFinishedDrag = false
     }

    if (drag.graphics) {
      this.app.stage.removeChild(drag.graphics)
      drag.graphics = null
    }
  }

  _calculateSelectionBounds () {
    const drag = this.dragState
    return {
      x: Math.min(drag.startX, drag.currentX),
      y: Math.min(drag.startY, drag.currentY),
      width: Math.abs(drag.currentX - drag.startX),
      height: Math.abs(drag.currentY - drag.startY)
    }
  }

  _isValidSelectionBounds (bounds) {
    return (
      bounds.width > GAME_CONFIG.LIMITS.dragThreshold &&
      bounds.height > GAME_CONFIG.LIMITS.dragThreshold
    )
  }

  _getCanvasCoords (event) {
    const rect = this.app.view.getBoundingClientRect()
    return {
      screenX: event.clientX - rect.left,
      screenY: event.clientY - rect.top
    }
  }

  _toGameCoords (screenX, screenY) {
     return {
       gameX: (screenX / this.app.screen.width) * GAME_CONFIG.WORLD_SIZE.width,
       gameY: (screenY / this.app.screen.height) * GAME_CONFIG.WORLD_SIZE.height
     }
   }

  _getScale () {
     return {
       x: this.app.screen.width / GAME_CONFIG.WORLD_SIZE.width,
       y: this.app.screen.height / GAME_CONFIG.WORLD_SIZE.height
     }
   }

    _findEntityAtPosition (screenX, screenY) {
     const entities = this.gameEngine.state.get('entities')
     if (!(entities instanceof Map)) return null

     const { x: scaleX, y: scaleY } = this._getScale()
     
     // Ищем сущность, которая отрисована и содержит точку
     for (const [id, entity] of entities) {
       // Используем gameX/gameY из state.entities (координаты в игровом мире)
       // и преобразуем их в экранные координаты
       const gameX = entity.gameX ?? entity.position?.x ?? 0
       const gameY = entity.gameY ?? entity.position?.y ?? 0
       
       // Преобразуем игровые координаты в экранные
       const entityScreenX = gameX * scaleX
       const entityScreenY = gameY * scaleY
       
       // Примерная проверка попадания (для квадратных сущностей)
       const size = 15 // Примерный размер сущности (половина ширины/высоты)
       if (screenX >= entityScreenX - size && screenX <= entityScreenX + size &&
           screenY >= entityScreenY - size && screenY <= entityScreenY + size) {
         return id
       }
     }
     return null
   }

  update (_dt) {}

  render () {}

  destroy () {
    if (this.isDestroyed) return
    this.isDestroyed = true
    this.dragState = this._createDragState()
    this.app = null
    this.gameEngine = null
  }
}

export function createInputSystem (gameEngine) {
  return new InputSystem(gameEngine)
}
