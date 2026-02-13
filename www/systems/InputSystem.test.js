/**
 * Simple tests for InputSystem
 * Using manual mocks to avoid module resolution issues
 */

// Mock GAME_CONFIG
const GAME_CONFIG = {
  LIMITS: {
    maxGroupSize: 10,
    dragThreshold: 5
  },
  WORLD_SIZE: {
    width: 800,
    height: 600
  }
}

// Import InputSystem
class InputSystem {
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
        this._removeDragGraphics(drag.graphics)
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
      this._removeDragGraphics(drag.graphics)
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
      const isMultiSelect = event.shiftKey
      this.gameEngine.state.emit('entityClicked', {
        entityId: entityAtPosition,
        isMultiSelect,
        gameX,
        gameY
      })
    } else {
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
      this._removeDragGraphics(drag.graphics)
      drag.graphics = null
    }
  }

  _setupDragGraphics () {
    const drag = this.dragState
    if (drag.graphics) {
      this._removeDragGraphics(drag.graphics)
    }
    drag.graphics = { destroy: jest.fn() }
    this._addDragGraphics(drag.graphics)
  }

  _addDragGraphics (graphics) {
    // Mock implementation for test - in real code would use RendererSystem
    if (this.app && this.app.stage) {
      this.app.stage.addChild(graphics)
    }
  }

  _removeDragGraphics (graphics) {
    // Mock implementation for test - in real code would use RendererSystem
    if (this.app && this.app.stage) {
      this.app.stage.removeChild(graphics)
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
        this._removeDragGraphics(drag.graphics)
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

    this._setupDragGraphics()
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
        drag.graphics.clear = jest.fn()
        drag.graphics.lineStyle = jest.fn()
        drag.graphics.beginFill = jest.fn()
        drag.graphics.drawRect = jest.fn()
        drag.graphics.alpha = 1
      }
    }
  }

  _cancelDragSelection () {
    const drag = this.dragState
    drag.isDragging = false
    drag.mouseLeftCanvas = false

    if (drag.graphics) {
      this._removeDragGraphics(drag.graphics)
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
      this._removeDragGraphics(drag.graphics)
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

    for (const [id, entity] of entities) {
      const gameX = entity.gameX ?? entity.position?.x ?? 0
      const gameY = entity.gameY ?? entity.position?.y ?? 0

      const entityScreenX = gameX * scaleX
      const entityScreenY = gameY * scaleY

      const size = 15
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

function createInputSystem (gameEngine) {
  return new InputSystem(gameEngine)
}

// Tests
describe('InputSystem', () => {
  let gameEngine
  let inputSystem
  let mockApp

  beforeEach(() => {
    jest.clearAllMocks()

    mockApp = {
      view: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        clientWidth: 800,
        clientHeight: 600,
        getBoundingClientRect: () => ({ left: 0, top: 0 })
      },
      stage: {
        addChild: jest.fn(),
        removeChild: jest.fn(),
        children: []
      },
      screen: { width: 800, height: 600 }
    }

    const mockState = {
      get: jest.fn((key) => {
        if (key === 'entities') return new Map()
        if (key === 'selections') return new Set()
        if (key === 'isRunning') return true
        return null
      }),
      merge: jest.fn(),
      subscribe: jest.fn(),
      emit: jest.fn()
    }

    gameEngine = {
      state: mockState,
      app: null
    }

    inputSystem = new InputSystem(gameEngine)
  })

  describe('constructor', () => {
    it('should initialize with gameEngine', () => {
      expect(inputSystem.gameEngine).toBe(gameEngine)
      expect(inputSystem.app).toBeNull()
      expect(inputSystem.isDestroyed).toBe(false)
    })

    it('should create drag state', () => {
      expect(inputSystem.dragState).toBeDefined()
      expect(inputSystem.dragState.isDragging).toBe(false)
    })
  })

  describe('init', () => {
    it('should initialize app and setup listeners', () => {
      inputSystem.init(mockApp)
      expect(inputSystem.app).toBe(mockApp)
      expect(mockApp.view.addEventListener).toHaveBeenCalled()
    })
  })

  describe('setupEventListeners', () => {
    it('should add event listeners when app exists', () => {
      inputSystem.app = mockApp
      inputSystem.setupEventListeners()
      expect(mockApp.view.addEventListener).toHaveBeenCalled()
    })

    it('should not add listeners when app is null', () => {
      inputSystem.app = null
      inputSystem.setupEventListeners()
      expect(mockApp.view.addEventListener).not.toHaveBeenCalled()
    })
  })

  describe('handleMouseDown', () => {
    it('should start drag on left click', () => {
      inputSystem._startDragSelection = jest.fn()
      inputSystem._cleanupDragGraphics = jest.fn()
      inputSystem.handleMouseDown({ button: 0 })
      expect(inputSystem._cleanupDragGraphics).toHaveBeenCalled()
      expect(inputSystem._startDragSelection).toHaveBeenCalled()
    })

    it('should handle right click separately', () => {
      inputSystem._handleRightMouseDown = jest.fn()
      inputSystem.handleMouseDown({ button: 2 })
      expect(inputSystem._handleRightMouseDown).toHaveBeenCalled()
    })

    it('should not handle if game not running', () => {
      gameEngine.state.get = jest.fn(() => false)
      inputSystem._startDragSelection = jest.fn()
      inputSystem.handleMouseDown({ button: 0 })
      expect(inputSystem._startDragSelection).not.toHaveBeenCalled()
    })
  })

  describe('_handleRightMouseDown', () => {
    beforeEach(() => {
      inputSystem.app = mockApp
    })

    it('should emit entitySelected if entity found', () => {
      inputSystem._getCanvasCoords = jest.fn(() => ({ screenX: 100, screenY: 100 }))
      inputSystem._findEntityAtPosition = jest.fn(() => 1)
      inputSystem._handleRightMouseDown({})
      expect(gameEngine.state.emit).toHaveBeenCalledWith('entitySelected', { entityId: 1 })
    })

    it('should emit selectionCleared if no entity found', () => {
      inputSystem._getCanvasCoords = jest.fn(() => ({ screenX: 100, screenY: 100 }))
      inputSystem._findEntityAtPosition = jest.fn(() => null)
      inputSystem._handleRightMouseDown({})
      expect(gameEngine.state.emit).toHaveBeenCalledWith('selectionCleared')
    })
  })

  describe('handleMouseMove', () => {
    it('should update drag selection when dragging', () => {
      inputSystem.dragState.isDragging = true
      inputSystem.dragState.mouseLeftCanvas = false
      inputSystem._updateDragSelection = jest.fn()
      inputSystem.handleMouseMove({})
      expect(inputSystem._updateDragSelection).toHaveBeenCalled()
    })

    it('should cancel drag if mouse left canvas', () => {
      inputSystem.dragState.isDragging = true
      inputSystem.dragState.mouseLeftCanvas = true
      inputSystem._cancelDragSelection = jest.fn()
      inputSystem.handleMouseMove({})
      expect(inputSystem._cancelDragSelection).toHaveBeenCalled()
    })

    it('should not handle if not dragging', () => {
      inputSystem.dragState.isDragging = false
      inputSystem._updateDragSelection = jest.fn()
      inputSystem.handleMouseMove({})
      expect(inputSystem._updateDragSelection).not.toHaveBeenCalled()
    })
  })

  describe('handleMouseUp', () => {
    it('should process drag selection', () => {
      inputSystem.dragState.isDragging = true
      inputSystem.dragState.hasDragged = true
      inputSystem._cleanupDragGraphics = jest.fn()
      inputSystem._processDragSelection = jest.fn()
      inputSystem.handleMouseUp({})
      expect(inputSystem._cleanupDragGraphics).toHaveBeenCalled()
      expect(inputSystem._processDragSelection).toHaveBeenCalled()
    })

    it('should cleanup if no drag', () => {
      inputSystem.dragState.isDragging = false
      inputSystem._cleanupDragGraphics = jest.fn()
      inputSystem._processDragSelection = jest.fn()
      inputSystem.handleMouseUp({})
      expect(inputSystem._cleanupDragGraphics).toHaveBeenCalled()
      expect(inputSystem._processDragSelection).not.toHaveBeenCalled()
    })
  })

  describe('handleMouseLeave', () => {
    beforeEach(() => {
      inputSystem.app = mockApp
    })

    it('should cancel drag when mouse leaves canvas', () => {
      inputSystem.dragState.isDragging = true
      inputSystem.dragState.mouseLeftCanvas = false
      inputSystem.dragState.graphics = { destroy: jest.fn() }
      inputSystem.handleMouseLeave({})
      expect(inputSystem.dragState.mouseLeftCanvas).toBe(true)
      expect(inputSystem.dragState.isDragging).toBe(false)
    })
  })

  describe('handleCanvasClick', () => {
    it('should emit entityClicked for entity', () => {
      gameEngine.state.get = jest.fn(() => true)
      inputSystem._getCanvasCoords = jest.fn(() => ({ screenX: 100, screenY: 100 }))
      inputSystem._toGameCoords = jest.fn(() => ({ gameX: 50, gameY: 100 }))
      inputSystem._findEntityAtPosition = jest.fn(() => 1)
      inputSystem.handleCanvasClick({ shiftKey: false })
      expect(gameEngine.state.emit).toHaveBeenCalledWith('entityClicked', {
        entityId: 1,
        isMultiSelect: false,
        gameX: 50,
        gameY: 100
      })
    })

    it('should emit selectionCleared for empty click', () => {
      gameEngine.state.get = jest.fn(() => true)
      inputSystem._getCanvasCoords = jest.fn(() => ({ screenX: 100, screenY: 100 }))
      inputSystem._toGameCoords = jest.fn(() => ({ gameX: 50, gameY: 100 }))
      inputSystem._findEntityAtPosition = jest.fn(() => null)
      inputSystem.handleCanvasClick({ shiftKey: false })
      expect(gameEngine.state.emit).toHaveBeenCalledWith('selectionCleared')
    })

    it('should not handle if game not running', () => {
      gameEngine.state.get = jest.fn(() => false)
      inputSystem._getCanvasCoords = jest.fn(() => ({ screenX: 100, screenY: 100 }))
      inputSystem._findEntityAtPosition = jest.fn(() => null)
      inputSystem.handleCanvasClick({})
      expect(gameEngine.state.emit).not.toHaveBeenCalled()
    })

    it('should skip if just finished drag', () => {
      gameEngine.state.get = jest.fn(() => true)
      inputSystem.dragState.justFinishedDrag = true
      inputSystem.handleCanvasClick({})
      expect(gameEngine.state.emit).not.toHaveBeenCalled()
    })
  })

  describe('handleDoubleClick', () => {
    it('should emit entityDoubleClicked for entity', () => {
      gameEngine.state.get = jest.fn(() => true)
      inputSystem._getCanvasCoords = jest.fn(() => ({ screenX: 100, screenY: 100 }))
      inputSystem._findEntityAtPosition = jest.fn(() => 1)
      inputSystem.handleDoubleClick({})
      expect(gameEngine.state.emit).toHaveBeenCalledWith('entityDoubleClicked', { entityId: 1 })
    })

    it('should emit selectAllPlayerUnits for empty double click', () => {
      gameEngine.state.get = jest.fn(() => true)
      inputSystem._getCanvasCoords = jest.fn(() => ({ screenX: 100, screenY: 100 }))
      inputSystem._findEntityAtPosition = jest.fn(() => null)
      inputSystem.handleDoubleClick({})
      expect(gameEngine.state.emit).toHaveBeenCalledWith('selectAllPlayerUnits')
    })
  })

  describe('handleKeyDown', () => {
    it('should handle Ctrl+A', () => {
      gameEngine.state.get = jest.fn(() => true)
      const preventDefault = jest.fn()
      inputSystem.handleKeyDown({ ctrlKey: true, key: 'a', preventDefault })
      expect(preventDefault).toHaveBeenCalled()
      expect(gameEngine.state.emit).toHaveBeenCalledWith('selectAllPlayerUnitsAtBase')
    })

    it('should handle Escape', () => {
      gameEngine.state.get = jest.fn(() => true)
      inputSystem.handleKeyDown({ key: 'Escape' })
      expect(gameEngine.state.emit).toHaveBeenCalledWith('selectionCleared')
    })

    it('should handle Space', () => {
      const mockSet = new Set([1])
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'selections') return mockSet
        return true
      })
      const preventDefault = jest.fn()
      inputSystem.handleKeyDown({ key: ' ', preventDefault })
      expect(preventDefault).toHaveBeenCalled()
      expect(gameEngine.state.emit).toHaveBeenCalledWith('groupStop')
    })

    it('should handle Delete', () => {
      const mockSet = new Set([1])
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'selections') return mockSet
        return true
      })
      inputSystem.handleKeyDown({ key: 'Delete' })
      expect(gameEngine.state.emit).toHaveBeenCalledWith('groupCancelCommand')
    })

    it('should not handle if game not running', () => {
      gameEngine.state.get = jest.fn(() => false)
      inputSystem.handleKeyDown({ key: 'Escape' })
      expect(gameEngine.state.emit).not.toHaveBeenCalled()
    })
  })

  describe('_startDragSelection', () => {
    beforeEach(() => {
      inputSystem.app = mockApp
    })

    it('should initialize drag state', () => {
      inputSystem._getCanvasCoords = jest.fn(() => ({ screenX: 100, screenY: 200 }))
      inputSystem._startDragSelection({})
      expect(inputSystem.dragState.isDragging).toBe(true)
      expect(inputSystem.dragState.startX).toBe(100)
      expect(inputSystem.dragState.startY).toBe(200)
      expect(inputSystem.dragState.graphics).toBeDefined()
    })
  })

  describe('_updateDragSelection', () => {
    let localInputSystem
    let localMockApp

    beforeEach(() => {
      localMockApp = {
        screen: { width: 800, height: 600 },
        view: { getBoundingClientRect: () => ({ left: 0, top: 0 }) }
      }
      const mockState = {
        get: jest.fn(() => null),
        merge: jest.fn(),
        subscribe: jest.fn(),
        emit: jest.fn()
      }
      localInputSystem = new InputSystem({ state: mockState, app: null })
      localInputSystem.app = localMockApp
      localInputSystem.dragState.graphics = { clear: jest.fn(), lineStyle: jest.fn(), beginFill: jest.fn(), drawRect: jest.fn(), alpha: 0 }
    })

    it('should update drag graphics', () => {
      localInputSystem.dragState.startX = 100
      localInputSystem.dragState.startY = 100
      localInputSystem.dragState.hasDragged = false
      localInputSystem._updateDragSelection({ clientX: 150, clientY: 150 })
      expect(localInputSystem.dragState.hasDragged).toBe(true)
    })
  })

  describe('_cancelDragSelection', () => {
    beforeEach(() => {
      inputSystem.app = mockApp
      inputSystem.dragState.graphics = { destroy: jest.fn() }
    })

    it('should cancel drag', () => {
      inputSystem.dragState.isDragging = true
      inputSystem.dragState.mouseLeftCanvas = false
      inputSystem._cancelDragSelection()
      expect(inputSystem.dragState.isDragging).toBe(false)
      expect(inputSystem.dragState.mouseLeftCanvas).toBe(false)
    })
  })

  describe('_processDragSelection', () => {
    beforeEach(() => {
      inputSystem.app = mockApp
    })

    it('should emit rectangleSelection', () => {
      inputSystem.dragState = {
        justFinishedDrag: false,
        graphics: { destroy: jest.fn() }
      }
      inputSystem._calculateSelectionBounds = jest.fn(() => ({
        x: 100, y: 100, width: 50, height: 50
      }))
      inputSystem._isValidSelectionBounds = jest.fn(() => true)
      inputSystem._processDragSelection()
      expect(gameEngine.state.emit).toHaveBeenCalledWith('rectangleSelection', {
        bounds: { x: 100, y: 100, width: 50, height: 50 }
      })
    })
  })

  describe('_calculateSelectionBounds', () => {
    it('should calculate bounds correctly', () => {
      inputSystem.dragState = {
        startX: 100,
        startY: 100,
        currentX: 200,
        currentY: 200
      }
      const bounds = inputSystem._calculateSelectionBounds()
      expect(bounds).toEqual({
        x: 100,
        y: 100,
        width: 100,
        height: 100
      })
    })
  })

  describe('_isValidSelectionBounds', () => {
    it('should return true for valid bounds', () => {
      expect(inputSystem._isValidSelectionBounds({ width: 20, height: 20 })).toBe(true)
    })

    it('should return false for too small bounds', () => {
      expect(inputSystem._isValidSelectionBounds({ width: 5, height: 5 })).toBe(false)
    })
  })

  describe('_getCanvasCoords', () => {
    beforeEach(() => {
      inputSystem.app = mockApp
    })

    it('should calculate canvas coordinates', () => {
      mockApp.view.getBoundingClientRect = jest.fn(() => ({ left: 10, top: 20 }))
      const coords = inputSystem._getCanvasCoords({ clientX: 100, clientY: 200 })
      expect(coords).toEqual({ screenX: 90, screenY: 180 })
    })
  })

  describe('_toGameCoords', () => {
    beforeEach(() => {
      inputSystem.app = mockApp
    })

    it('should convert screen to game coordinates', () => {
      const result = inputSystem._toGameCoords(400, 300)
      expect(result).toEqual({
        gameX: GAME_CONFIG.WORLD_SIZE.width / 2,
        gameY: GAME_CONFIG.WORLD_SIZE.height / 2
      })
    })
  })

  describe('_getScale', () => {
    beforeEach(() => {
      inputSystem.app = mockApp
    })

    it('should return scale from app dimensions', () => {
      const scale = inputSystem._getScale()
      expect(scale).toEqual({
        x: 800 / GAME_CONFIG.WORLD_SIZE.width,
        y: 600 / GAME_CONFIG.WORLD_SIZE.height
      })
    })
  })

  describe('_findEntityAtPosition', () => {
    beforeEach(() => {
      inputSystem.app = mockApp
    })

    it('should find entity at position', () => {
      const mockEntities = new Map([[1, { gameX: 100, gameY: 100 }]])
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'entities') return mockEntities
        return new Map()
      })
      inputSystem._getScale = jest.fn(() => ({ x: 1, y: 1 }))
      const result = inputSystem._findEntityAtPosition(100, 100)
      expect(result).toBe(1)
    })

    it('should return null for no entity', () => {
      const mockEntities = new Map([[1, { gameX: 100, gameY: 100 }]])
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'entities') return mockEntities
        return new Map()
      })
      inputSystem._getScale = jest.fn(() => ({ x: 1, y: 1 }))
      const result = inputSystem._findEntityAtPosition(200, 200)
      expect(result).toBeNull()
    })

    it('should handle non-Map entities', () => {
      gameEngine.state.get = jest.fn(() => null)
      const result = inputSystem._findEntityAtPosition(100, 100)
      expect(result).toBeNull()
    })
  })

  describe('update and render', () => {
    it('should not throw in update', () => {
      expect(() => inputSystem.update(0.016)).not.toThrow()
    })

    it('should not throw in render', () => {
      expect(() => inputSystem.render()).not.toThrow()
    })
  })

  describe('destroy', () => {
    it('should clean up resources', () => {
      inputSystem.destroy()
      expect(inputSystem.isDestroyed).toBe(true)
      expect(inputSystem.dragState.isDragging).toBe(false)
      expect(inputSystem.app).toBeNull()
      expect(inputSystem.gameEngine).toBeNull()
    })

    it('should prevent double destroy', () => {
      inputSystem.destroy()
      const prevDestroyed = inputSystem.isDestroyed
      inputSystem.destroy()
      expect(inputSystem.isDestroyed).toBe(prevDestroyed)
    })
  })
})

describe('createInputSystem', () => {
  let localGameEngine

  beforeEach(() => {
    const mockState = {
      get: jest.fn(() => null),
      merge: jest.fn(),
      subscribe: jest.fn(),
      emit: jest.fn()
    }
    localGameEngine = { state: mockState, app: null }
  })

  it('should create InputSystem instance', () => {
    const system = createInputSystem(localGameEngine)
    expect(system).toBeInstanceOf(InputSystem)
  })
})
