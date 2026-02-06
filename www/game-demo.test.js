/* eslint-env jest */
/**
 * Tests for game-demo.js
 */
jest.mock('./game-config.js', () => ({
  GAME_CONFIG: {
    WORLD_SIZE: { width: 800, height: 600 },
    ENTITY_SIZES: { scout: 8, tank: { width: 20, height: 16 }, transport: { width: 24, height: 20 }, base: { width: 30, height: 30 }, alert: { hidden: 8, revealed: 12 } },
    COLORS: {
      player: { scout: 0x4CAF50, tank: 0xFF5722, transport: 0x2196F3 },
      enemy: { scout: 0x2E7D32, tank: 0xB71C1C, transport: 0x0D47A1 },
      wild: { scout: 0x8D6E63, tank: 0x8D6E63, transport: 0x8D6E63 },
      neutral: { scout: 0x00BCD4, tank: 0x00BCD4, transport: 0x00BCD4 },
      base: 0x2196F3,
      alert: 0xB8860B,
      selection: { player: 0x0080FF, enemy: 0xFF0000 }
    },
    DISTANCES: { clickTolerance: 20, alertClickRadius: 15, baseUnitRadius: 50, combatRange: 20, alertRevealRange: 25 },
    LIMITS: { maxGroupSize: 12, dragThreshold: 5 },
    UI: { fontSize: { label: 10, damage: 14 }, indicatorSize: 12, targetIndicatorSize: 10, explosionScale: 3.0, healthBarLength: 10 },
    VISIBILITY: { range: 200, sameTypeUnitRadius: 200 },
    TIMEOUTS: { targetIndicator: 2000, alertHighlight: 3000 }
  }
}))

const { GameDemo } = require('./game-demo.js')

describe('GameDemo', () => {
  let gameDemo

  beforeEach(() => {
    gameDemo = new GameDemo()
    gameDemo.app = {
      screen: { width: 800, height: 600 },
      view: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
      stage: {
        children: [],
        addChild(child) { this.children.push(child) },
        removeChild(child) {
          const idx = this.children.indexOf(child)
          if (idx > -1) this.children.splice(idx, 1)
        }
      }
    }
    gameDemo.isInitialized = true
    gameDemo.entities = new Map()
    gameDemo.bases = new Map()
    gameDemo.stateManager = {
      updateGameState: jest.fn(),
      getGameState: jest.fn(() => ({ isInitialized: true })),
      updateSelectionState: jest.fn(),
      getSelectionState: jest.fn(() => ({ selectedEntityIds: new Set() })),
      updateEntityState: jest.fn(),
      updateEntityStateEntry: jest.fn(),
      getEntityState: jest.fn(() => ({ entities: new Map() })),
      updateDisplayState: jest.fn(),
      getDisplayState: jest.fn(() => ({ statusMessage: '' }))
    }
    gameDemo.entityRenderer = {
      updateEntityPosition: jest.fn(),
      createEntitySprite: jest.fn(),
      findEntityAtPosition: jest.fn(),
      findAlertAtPosition: jest.fn(),
      showTargetIndicator: jest.fn(),
      clearTargetIndicator: jest.fn(),
      highlightTargetAlert: jest.fn(),
      createDamageEffect: jest.fn(),
      createDestructionEffect: jest.fn(),
      setupGrid: jest.fn(),
      updateGrid: jest.fn(),
      cleanupOrphanedGraphics: jest.fn()
    }
    gameDemo.coordinateService = {
      screenToGame: jest.fn((x, y) => ({ gameX: x, gameY: y })),
      gameToScreen: jest.fn((x, y) => ({ screenX: x, screenY: y })),
      getScreenCoords: jest.fn((x, y) => ({ screenX: x, screenY: y }))
    }
    gameDemo.selectionManager = {
      clearAllSelections: jest.fn(),
      selectEntity: jest.fn(),
      deselectEntity: jest.fn(),
      selectEntitiesInRectangle: jest.fn(),
      selectAllPlayerUnits: jest.fn(),
      selectSameTypeUnits: jest.fn(),
      selectAllPlayerUnitsAtBase: jest.fn(),
      isPlayerBaseSelected: jest.fn(() => false),
      handleEntityClick: jest.fn()
    }
    gameDemo.inputHandler = {
      setupEventListeners: jest.fn()
    }
    gameDemo.gameStateManager = {
      initializeGame: jest.fn(),
      spawnVehicle: jest.fn(),
      createBase: jest.fn(),
      buildFloor: jest.fn(),
      createRandomAlert: jest.fn(),
      startAutoUpdate: jest.fn(),
      stopAutoUpdate: jest.fn(),
      updateOnce: jest.fn(),
      setGroupTarget: jest.fn(),
      gameLoop: jest.fn()
    }
    gameDemo.updateStatus = jest.fn()
    gameDemo.updateEntityInfo = jest.fn()
    gameDemo.updateSpawnButtonState = jest.fn()
    gameDemo.startGameLoop = jest.fn()
    gameDemo.selectedEntityIds = new Set()
  })

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(gameDemo.isInitialized).toBe(false)
      expect(gameDemo.entities).toBeInstanceOf(Map)
      expect(gameDemo.bases).toBeInstanceOf(Map)
    })
  })

  describe('initPixi', () => {
    it('should create PIXI application with correct options', () => {
      gameDemo.initPixi()
      expect(gameDemo.app).toBeDefined()
      expect(gameDemo.app.screen.width).toBe(800)
      expect(gameDemo.app.screen.height).toBe(600)
    })
  })

  describe('handleResize', () => {
    it('should update screen dimensions', () => {
      gameDemo.initPixi()
      const originalWidth = gameDemo.app.screen.width
      const originalHeight = gameDemo.app.screen.height

      gameDemo.app.view.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1024, height: 768 })

      gameDemo.handleResize()

      expect(gameDemo.app.screen.width).toBe(1024)
      expect(gameDemo.app.screen.height).toBe(768)
    })
  })

  describe('setupEventListeners', () => {
    it('should add resize event listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      gameDemo.setupEventListeners()
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
      addEventListenerSpy.mockRestore()
    })

    it('should add input handler setup', () => {
      gameDemo.setupEventListeners()
      expect(gameDemo.inputHandler.setupEventListeners).toHaveBeenCalled()
    })
  })

  describe('get selectedEntityIds', () => {
    it('should return selected entity IDs from state manager', () => {
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set([1, 2, 3])
      }))
      expect(gameDemo.selectedEntityIds).toEqual(new Set([1, 2, 3]))
    })
  })

  describe('syncEntitiesWithGameState', () => {
    it('should update existing entities', () => {
      const entity = {
        container: { x: 0, y: 0 },
        gameX: 0,
        gameY: 0
      }
      gameDemo.entities.set(1, entity)

      const gameStateEntities = [
        { id: 1, gameX: 100, gameY: 200, vehicleType: 'scout' }
      ]

      gameDemo.syncEntitiesWithGameState(gameStateEntities)

      expect(entity.gameX).toBe(100)
      expect(entity.gameY).toBe(200)
    })

    it('should create new entities', () => {
      const gameStateEntities = [
        { id: 1, gameX: 100, gameY: 200, vehicleType: 'scout', entityType: 'vehicle', fraction: 'Player' }
      ]

      gameDemo.syncEntitiesWithGameState(gameStateEntities)

      expect(gameDemo.entities.get(1)).toBeDefined()
      expect(gameDemo.entities.get(1).gameX).toBe(100)
    })

    it('should remove deleted entities', () => {
      const entity = { container: {} }
      gameDemo.entities.set(1, entity)

      const gameStateEntities = []

      gameDemo.syncEntitiesWithGameState(gameStateEntities)

      expect(gameDemo.entities.has(1)).toBe(false)
    })
  })

  describe('findPlayerBase', () => {
    it('should find player base', () => {
      const baseEntity = { entityType: 'base', fraction: 'Player' }
      gameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, baseEntity]])
      }))

      const result = gameDemo.findPlayerBase()

      expect(result).toBe(baseEntity)
    })

    it('should return null when no player base exists', () => {
      gameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, { entityType: 'vehicle', fraction: 'Player' }]])
      }))

      const result = gameDemo.findPlayerBase()

      expect(result).toBeNull()
    })
  })

  describe('isPlayerBaseSelected', () => {
    it('should return true when player base is selected', () => {
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set([1])
      }))
      gameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, { entityType: 'base', fraction: 'Player' }]])
      }))

      const result = gameDemo.isPlayerBaseSelected()

      expect(result).toBe(true)
    })

    it('should return false when player base is not selected', () => {
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set([1])
      }))
      gameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, { entityType: 'vehicle', fraction: 'Player' }]])
      }))

      const result = gameDemo.isPlayerBaseSelected()

      expect(result).toBe(false)
    })
  })

  describe('setGroupTarget', () => {
    it('should call gameStateManager setGroupTarget', () => {
      gameDemo.setGroupTarget(100, 200)

      expect(gameDemo.gameStateManager.setGroupTarget).toHaveBeenCalledWith(100, 200)
    })
  })

  describe('clearAllSelections', () => {
    it('should call selectionManager clearAllSelections', () => {
      gameDemo.clearAllSelections()

      expect(gameDemo.selectionManager.clearAllSelections).toHaveBeenCalled()
    })
  })

  describe('updateSpawnButtonState', () => {
    it('should enable spawn button when base is selected', () => {
      const spawnBtn = { disabled: true }
      gameDemo.isPlayerBaseSelected = jest.fn(() => true)

      gameDemo.updateSpawnButtonState(spawnBtn)

      expect(spawnBtn.disabled).toBe(false)
    })

    it('should disable spawn button when base is not selected', () => {
      const spawnBtn = { disabled: false }
      gameDemo.isPlayerBaseSelected = jest.fn(() => false)

      gameDemo.updateSpawnButtonState(spawnBtn)

      expect(spawnBtn.disabled).toBe(true)
    })
  })

  describe('getScale and invalidateScaleCache', () => {
    it('should call coordinateService methods', () => {
      gameDemo.getScale()
      gameDemo.invalidateScaleCache()

      expect(gameDemo.coordinateService.getScale).toHaveBeenCalled()
      expect(gameDemo.coordinateService.invalidateScaleCache).toHaveBeenCalled()
    })
  })

  describe('screenToGame and gameToScreen', () => {
    it('should call coordinateService conversion methods', () => {
      gameDemo.screenToGame(400, 300)
      gameDemo.gameToScreen(100, 200)

      expect(gameDemo.coordinateService.screenToGame).toHaveBeenCalledWith(400, 300)
      expect(gameDemo.coordinateService.gameToScreen).toHaveBeenCalledWith(100, 200)
    })
  })

  describe('gameLoop', () => {
    it('should call gameStateManager gameLoop', () => {
      gameDemo.gameLoop()

      expect(gameDemo.gameStateManager.gameLoop).toHaveBeenCalled()
    })
  })

  describe('checkAndUpdateTargetIndicator', () => {
    it('should clear target indicator', () => {
      gameDemo.checkAndUpdateTargetIndicator()

      expect(gameDemo.entityRenderer.clearTargetIndicator).toHaveBeenCalled()
    })
  })
})
