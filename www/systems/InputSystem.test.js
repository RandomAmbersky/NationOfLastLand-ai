import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { InputSystem, createInputSystem } from './InputSystem.js'
import { GAME_CONFIG } from '../config/game-config.js'

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
      expect(mockApp.view.addEventListener).toHaveBeenCalledTimes(6)
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should not setup if no app', () => {
      const system = new InputSystem(gameEngine)
      const result = system.init(null)
      expect(result).toBeUndefined()
    })
  })

  describe('setupEventListeners', () => {
    it('should add all event listeners', () => {
      inputSystem.setupEventListeners()
      expect(mockApp.view.addEventListener).toHaveBeenCalledTimes(6)
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should not setup if no app', () => {
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
    it('should cancel drag when mouse leaves canvas', () => {
      inputSystem.dragState.isDragging = true
      inputSystem.dragState.mouseLeftCanvas = false
      inputSystem._cancelDragSelection = jest.fn()
      inputSystem.handleMouseLeave({})
      expect(inputSystem.dragState.mouseLeftCanvas).toBe(true)
      expect(inputSystem.dragState.isDragging).toBe(false)
      expect(inputSystem._cancelDragSelection).toHaveBeenCalled()
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

  describe('_cleanupDragGraphics', () => {
    it('should cleanup graphics if not dragging', () => {
      const mockGraphics = { destroy: jest.fn() }
      inputSystem.dragState.graphics = mockGraphics
      inputSystem.dragState.isDragging = false
      inputSystem._cleanupDragGraphics()
      expect(mockApp.stage.removeChild).toHaveBeenCalledWith(mockGraphics)
    })
  })

  describe('_startDragSelection', () => {
    it('should initialize drag state', () => {
      inputSystem._getCanvasCoords = jest.fn(() => ({ screenX: 100, screenY: 200 }))
      inputSystem._startDragSelection({})
      expect(inputSystem.dragState.isDragging).toBe(true)
      expect(inputSystem.dragState.startX).toBe(100)
      expect(inputSystem.dragState.startY).toBe(200)
      expect(inputSystem.dragState.graphics).toBeDefined()
    })

    it('should remove existing graphics', () => {
      const oldGraphics = { destroy: jest.fn() }
      inputSystem.dragState.graphics = oldGraphics
      inputSystem._startDragSelection({})
      expect(mockApp.stage.removeChild).toHaveBeenCalledWith(oldGraphics)
    })
  })

  describe('_updateDragSelection', () => {
    it('should update drag graphics', () => {
      inputSystem.dragState.startX = 100
      inputSystem.dragState.startY = 100
      inputSystem.dragState.hasDragged = false
      const mockGraphics = { drawRect: jest.fn() }
      inputSystem.dragState.graphics = mockGraphics
      inputSystem._updateDragSelection({ clientX: 150, clientY: 150 })
      expect(inputSystem.dragState.hasDragged).toBe(true)
      expect(mockGraphics.drawRect).toHaveBeenCalled()
    })
  })

  describe('_cancelDragSelection', () => {
    it('should cancel drag', () => {
      inputSystem.dragState.isDragging = true
      inputSystem.dragState.mouseLeftCanvas = false
      const mockGraphics = { destroy: jest.fn() }
      inputSystem.dragState.graphics = mockGraphics
      inputSystem._cancelDragSelection()
      expect(inputSystem.dragState.isDragging).toBe(false)
      expect(inputSystem.dragState.mouseLeftCanvas).toBe(false)
      expect(mockApp.stage.removeChild).toHaveBeenCalledWith(mockGraphics)
    })
  })

  describe('_processDragSelection', () => {
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

    it('should not emit if bounds invalid', () => {
      inputSystem.dragState = {
        justFinishedDrag: false,
        graphics: { destroy: jest.fn() }
      }
      inputSystem._calculateSelectionBounds = jest.fn(() => ({
        x: 100, y: 100, width: 5, height: 5
      }))
      inputSystem._isValidSelectionBounds = jest.fn(() => false)
      inputSystem._processDragSelection()
      expect(gameEngine.state.emit).not.toHaveBeenCalled()
    })
  })

  describe('_calculateSelectionBounds', () => {
    it('should calculate bounds correctly', () => {
      inputSystem.dragState = {
        startX: 100, startY: 100,
        currentX: 200, currentY: 200
      }
      const bounds = inputSystem._calculateSelectionBounds()
      expect(bounds).toEqual({
        x: 100, y: 100,
        width: 100, height: 100
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
    it('should calculate canvas coordinates', () => {
      mockApp.view.getBoundingClientRect = jest.fn(() => ({ left: 10, top: 20 }))
      const coords = inputSystem._getCanvasCoords({ clientX: 100, clientY: 200 })
      expect(coords).toEqual({ screenX: 90, screenY: 180 })
    })
  })

  describe('_toGameCoords', () => {
    it('should convert screen to game coordinates', () => {
      const result = inputSystem._toGameCoords(400, 300)
      expect(result).toEqual({
        gameX: GAME_CONFIG.WORLD_SIZE.width / 2,
        gameY: GAME_CONFIG.WORLD_SIZE.height / 2
      })
    })
  })

  describe('_getScale', () => {
    it('should return scale from app dimensions', () => {
      const scale = inputSystem._getScale()
      expect(scale).toEqual({
        x: 800 / GAME_CONFIG.WORLD_SIZE.width,
        y: 600 / GAME_CONFIG.WORLD_SIZE.height
      })
    })
  })

  describe('_findEntityAtPosition', () => {
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
  it('should create InputSystem instance', () => {
    const system = createInputSystem(gameEngine)
    expect(system).toBeInstanceOf(InputSystem)
  })
})
