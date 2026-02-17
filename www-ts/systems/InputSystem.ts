/**
 * Input System - Handles user input (mouse, keyboard)
 * Extracted from original InputHandler for better separation of concerns
 */

import type { GameEngine, System } from '../core/GameEngine.js'
import type { StateContainer } from '../core/StateContainer.js'
import { GAME_CONFIG } from '../config/game-config.js'

export class InputSystem implements System {
  public gameEngine: GameEngine
  public app: PIXI.Application | null
  public rendererSystem: unknown | null
  public dragState: {
    isDragging: boolean
    startX: number
    startY: number
    currentX: number
    currentY: number
    graphics: PIXI.Graphics | null
    hasDragged: boolean
    justFinishedDrag: boolean
    mouseLeftCanvas: boolean
  }
  public isDestroyed: boolean
  private boundHandlers: Record<string, (e: Event) => void>

  constructor (gameEngine: GameEngine, rendererSystem: unknown | null = null) {
    this.gameEngine = gameEngine
    this.app = null
    this.rendererSystem = rendererSystem
    this.dragState = this._createDragState()
    this.isDestroyed = false
    this.boundHandlers = {}
  }

  _createDragState (): {
    isDragging: boolean
    startX: number
    startY: number
    currentX: number
    currentY: number
    graphics: PIXI.Graphics | null
    hasDragged: boolean
    justFinishedDrag: boolean
    mouseLeftCanvas: boolean
  } {
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

  init (app: PIXI.Application): void {
    this.app = app

    // If RendererSystem was not passed to constructor, try to get it from gameEngine
    if (!this.rendererSystem && this.gameEngine.rendererSystem) {
      this.rendererSystem = this.gameEngine.rendererSystem
    }

    this.setupEventListeners()
  }

  setupEventListeners (): void {
    if (!this.app) return
    const canvas = this.app.view

    // Create bound handlers for later removal
    this.boundHandlers.mouseDown = (e) => this.handleMouseDown(e as MouseEvent)
    this.boundHandlers.mouseMove = (e) => this.handleMouseMove(e as MouseEvent)
    this.boundHandlers.mouseUp = (e) => this.handleMouseUp(e as MouseEvent)
    this.boundHandlers.mouseLeave = (e) => this.handleMouseLeave(e as MouseEvent)
    this.boundHandlers.click = (e) => this.handleCanvasClick(e as MouseEvent)
    this.boundHandlers.doubleClick = (e) => this.handleDoubleClick(e as MouseEvent)
    this.boundHandlers.contextMenu = (e) => e.preventDefault()
    this.boundHandlers.keyDown = (e) => this.handleKeyDown(e as KeyboardEvent)

    canvas.addEventListener('mousedown', this.boundHandlers.mouseDown)
    canvas.addEventListener('mousemove', this.boundHandlers.mouseMove)
    canvas.addEventListener('mouseup', this.boundHandlers.mouseUp)
    canvas.addEventListener('mouseleave', this.boundHandlers.mouseLeave)
    canvas.addEventListener('click', this.boundHandlers.click)
    canvas.addEventListener('dblclick', this.boundHandlers.doubleClick)
    canvas.addEventListener('contextmenu', this.boundHandlers.contextMenu)
    document.addEventListener('keydown', this.boundHandlers.keyDown)
  }

  handleMouseDown (event: MouseEvent): void {
    if (!this.gameEngine.state.get('isRunning')) return

    if (event.button === 2) {
      this._handleRightMouseDown(event)
      return
    }

    this._cleanupDragGraphics()
    this._startDragSelection(event)
  }

  _handleRightMouseDown (event: MouseEvent): void {
    const { screenX, screenY } = this._getCanvasCoords(event)
    const entityAtPosition = this._findEntityAtPosition(screenX, screenY)

    if (entityAtPosition !== null) {
      this.gameEngine.state.emit('entitySelected', { entityId: entityAtPosition })
    } else {
      this.gameEngine.state.emit('selectionCleared')
    }
  }

  handleMouseMove (event: MouseEvent): void {
    const drag = this.dragState
    if (!drag.isDragging) return

    if (drag.mouseLeftCanvas) {
      this._cancelDragSelection()
      return
    }

    this._updateDragSelection(event)
  }

  handleMouseUp (event: MouseEvent): void {
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
        drag.graphics?.parent?.removeChild(drag.graphics)
        drag.graphics = null
      }
    }
  }

  handleMouseLeave (event: MouseEvent): void {
    const drag = this.dragState
    if (!drag.isDragging) return

    drag.mouseLeftCanvas = true
    drag.isDragging = false
    drag.hasDragged = false

    if (drag.graphics) {
      this.rendererSystem?.removeFromStage({ container: drag.graphics })
      drag.graphics = null
    }
  }

  handleCanvasClick (event: MouseEvent): void {
    if (!this.gameEngine.state.get('isRunning')) return

    const drag = this.dragState
    if (drag.justFinishedDrag) {
      drag.justFinishedDrag = false
      return
    }

    const { screenX, screenY } = this._getCanvasCoords(event)
    const transformer = this.gameEngine.transformer
    const { gameX, gameY } = (transformer as { screenToGame: (x: number, y: number) => { x: number, y: number } }).screenToGame(screenX, screenY)

    const entityAtPosition = this._findEntityAtPosition(screenX, screenY)

    if (entityAtPosition !== null) {
      // Клик по юниту
      const isMultiSelect = event.shiftKey
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

  handleDoubleClick (event: MouseEvent): void {
    if (!this.gameEngine.state.get('isRunning')) return

    const { screenX, screenY } = this._getCanvasCoords(event)
    const entityId = this._findEntityAtPosition(screenX, screenY)

    if (entityId !== null) {
      this.gameEngine.state.emit('entityDoubleClicked', { entityId })
    } else {
      this.gameEngine.state.emit('selectAllPlayerUnits')
    }
  }

  handleKeyDown (event: KeyboardEvent): void {
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

  _cleanupDragGraphics (): void {
    const drag = this.dragState
    if (drag.graphics && !drag.isDragging) {
      this.rendererSystem?.removeFromStage({ container: drag.graphics })
      drag.graphics = null
    }
  }

  _startDragSelection (event: MouseEvent): void {
    this._cleanupDragGraphics()

    const { screenX, screenY } = this._getCanvasCoords(event)
    const drag = this.dragState

    if (drag.mouseLeftCanvas) {
      drag.isDragging = false
      drag.mouseLeftCanvas = false
      if (drag.graphics) {
        drag.graphics?.parent?.removeChild(drag.graphics)
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
      this.rendererSystem?.removeFromStage({ container: drag.graphics })
      drag.graphics = null
    }

    drag.graphics = new PIXI.Graphics()
    drag.graphics.alpha = 0
    drag.graphics.zIndex = 1000
    this.rendererSystem?.addToStage(drag.graphics)
  }

  _updateDragSelection (event: MouseEvent): void {
    const { screenX, screenY } = this._getCanvasCoords(event)
    const drag = this.dragState

    const clampedX = Math.max(0, Math.min(screenX, this.app!.screen.width))
    const clampedY = Math.max(0, Math.min(screenY, this.app!.screen.height))

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

  _cancelDragSelection (): void {
    const drag = this.dragState
    drag.isDragging = false
    drag.mouseLeftCanvas = false

    if (drag.graphics) {
      this.rendererSystem?.removeFromStage({ container: drag.graphics })
      drag.graphics = null
    }
  }

  _processDragSelection (): void {
    const bounds = this._calculateSelectionBounds()
    const drag = this.dragState

    if (this._isValidSelectionBounds(bounds)) {
      drag.justFinishedDrag = true
      this.gameEngine.state.emit('rectangleSelection', { bounds })
    } else {
      drag.justFinishedDrag = false
    }

    if (drag.graphics) {
      this.rendererSystem?.removeFromStage({ container: drag.graphics })
      drag.graphics = null
    }
  }

  _calculateSelectionBounds (): {
    x: number
    y: number
    width: number
    height: number
  } {
    const drag = this.dragState
    return {
      x: Math.min(drag.startX, drag.currentX),
      y: Math.min(drag.startY, drag.currentY),
      width: Math.abs(drag.currentX - drag.startX),
      height: Math.abs(drag.currentY - drag.startY)
    }
  }

  _isValidSelectionBounds (bounds: { x: number, y: number, width: number, height: number }): boolean {
    return (
      bounds.width > GAME_CONFIG.LIMITS.dragThreshold &&
      bounds.height > GAME_CONFIG.LIMITS.dragThreshold
    )
  }

  _getCanvasCoords (event: MouseEvent): { screenX: number, screenY: number } {
    const rect = this.app!.view.getBoundingClientRect()
    return {
      screenX: event.clientX - rect.left,
      screenY: event.clientY - rect.top
    }
  }

  _findEntityAtPosition (screenX: number, screenY: number): number | null {
    const entities = this.gameEngine.state.get('entities') as Map<number, { gameX?: number, gameY?: number, position?: { x?: number, y?: number } }>
    if (!(entities instanceof Map)) return null

    const transformer = this.gameEngine.transformer
    const { gameX, gameY } = (transformer as { screenToGame: (x: number, y: number) => { x: number, y: number } }).screenToGame(screenX, screenY)

    // Ищем сущность, которая отрисована и содержит точку
    const hitRadius = GAME_CONFIG.LIMITS.entityHitRadius ?? 15

    for (const [id, entity] of entities) {
      const entityGameX = (entity as { gameX?: number }).gameX ?? (entity as { position?: { x?: number } }).position?.x ?? 0
      const entityGameY = (entity as { gameY?: number }).gameY ?? (entity as { position?: { y?: number } }).position?.y ?? 0

      // Сравниваем в игровых координатах
      if (Math.abs(gameX - entityGameX) <= hitRadius &&
        Math.abs(gameY - entityGameY) <= hitRadius) {
        return id
      }
    }
    return null
  }

  update (_dt: number): void {
    // Update method for System interface
  }

  render (): void {
    // Render method for System interface
  }

  destroy (): void {
    if (this.isDestroyed) return
    this.isDestroyed = true

    // Remove event listeners to prevent memory leaks
    if (this.app && this.boundHandlers) {
      const canvas = this.app.view
      canvas.removeEventListener('mousedown', this.boundHandlers.mouseDown)
      canvas.removeEventListener('mousemove', this.boundHandlers.mouseMove)
      canvas.removeEventListener('mouseup', this.boundHandlers.mouseUp)
      canvas.removeEventListener('mouseleave', this.boundHandlers.mouseLeave)
      canvas.removeEventListener('click', this.boundHandlers.click)
      canvas.removeEventListener('dblclick', this.boundHandlers.doubleClick)
      canvas.removeEventListener('contextmenu', this.boundHandlers.contextMenu)
      document.removeEventListener('keydown', this.boundHandlers.keyDown)
    }

    this.dragState = this._createDragState()
    this.boundHandlers = {}
    this.app = null
    this.gameEngine = null as unknown as GameEngine
  }
}

export function createInputSystem (gameEngine: GameEngine): InputSystem {
  return new InputSystem(gameEngine)
}
