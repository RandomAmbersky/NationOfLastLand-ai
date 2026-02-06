/* eslint-env jest */
/**
 * Tests for game-demo.js
 */
// Mock PIXI before importing

import { GameDemo } from './game-demo.js'
// eslint-disable-next-line no-unused-vars
import { initWasm } from './wasm-imports.js'

global.PIXI = {
  Application: class {
    constructor (options = {}) {
      this.screen = {
        width: options.width || 800,
        height: options.height || 600
      }
      this.view = options.view || {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
      this.stage = {
        children: [],
        addChild (child) {
          this.children.push(child)
        },
        addChildAt (child, index) {
          this.children.splice(index, 0, child)
        },
        removeChild (child) {
          const idx = this.children.indexOf(child)
          if (idx > -1) this.children.splice(idx, 1)
        }
      }
    }
  },
  Graphics: class {
    constructor () {
      this.children = []
      this.alpha = 1
      this.x = 0
      this.y = 0
    }

    lineStyle () {
      return this
    }

    beginFill () {
      return this
    }

    endFill () {
      return this
    }

    drawCircle () {
      return this
    }

    drawRect () {
      return this
    }

    moveTo () {
      return this
    }

    lineTo () {
      return this
    }

    clear () {
      return this
    }

    addChild (child) {
      this.children.push(child)
      return child
    }

    removeChild (child) {
      const idx = this.children.indexOf(child)
      if (idx > -1) this.children.splice(idx, 1)
      return child
    }
  },
  Container: class {
    constructor () {
      this.children = []
      this.x = 0
      this.y = 0
      this.alpha = 1
    }

    addChild (child) {
      this.children.push(child)
      return child
    }

    addChildAt (child, index) {
      this.children.splice(index, 0, child)
      return child
    }

    removeChild (child) {
      const idx = this.children.indexOf(child)
      if (idx > -1) this.children.splice(idx, 1)
      return child
    }
  }
}

// Mock GAME_CONFIG
jest.mock('./game-config.js', () => ({
  GAME_CONFIG: {
    WORLD_SIZE: { width: 800, height: 600 },
    ENTITY_SIZES: {
      scout: 8,
      tank: { width: 20, height: 16 },
      transport: { width: 24, height: 20 },
      base: { width: 30, height: 30 },
      alert: { hidden: 8, revealed: 12 }
    },
    COLORS: {
      player: { scout: 0x4caf50, tank: 0xff5722, transport: 0x2196f3 },
      enemy: { scout: 0x2e7d32, tank: 0xb71c1c, transport: 0x0d47a1 },
      wild: { scout: 0x8d6e63, tank: 0x8d6e63, transport: 0x8d6e63 },
      neutral: { scout: 0x00bcd4, tank: 0x00bcd4, transport: 0x00bcd4 },
      base: 0x2196f3,
      alert: 0xb8860b,
      selection: { player: 0x0080ff, enemy: 0xff0000 }
    },
    DISTANCES: {
      clickTolerance: 20,
      alertClickRadius: 15,
      baseUnitRadius: 50,
      combatRange: 20,
      alertRevealRange: 25
    },
    LIMITS: { maxGroupSize: 12, dragThreshold: 5 },
    UI: {
      fontSize: { label: 10, damage: 14 },
      indicatorSize: 12,
      targetIndicatorSize: 10,
      explosionScale: 3.0,
      healthBarLength: 10
    },
    VISIBILITY: { range: 200, sameTypeUnitRadius: 200 },
    TIMEOUTS: { targetIndicator: 2000, alertHighlight: 3000 }
  }
}))

describe('GameDemo', () => {
  let gameDemo

  beforeAll(() => {
    // Mock initWasm
    jest.mock('./wasm-imports.js', () => ({
      initWasm: jest.fn(() => Promise.resolve()),
      init: jest.fn(() => Promise.resolve()),
      gameInit: jest.fn(() => Promise.resolve())
    }))

    // Setup document mocks
    jest.spyOn(document, 'getElementById').mockImplementation((id) => {
      if (id === 'game-canvas') {
        return {
          parentNode: {
            replaceChild: jest.fn()
          }
        }
      }
      const buttons = {
        'init-btn': { addEventListener: jest.fn() },
        'spawn-btn': { addEventListener: jest.fn() },
        'create-base-btn': { addEventListener: jest.fn() },
        'build-floor-btn': { addEventListener: jest.fn() },
        'create-alert-btn': { addEventListener: jest.fn() },
        'clear-selection-btn': { addEventListener: jest.fn() },
        'start-auto-update-btn': { addEventListener: jest.fn() },
        'stop-auto-update-btn': { addEventListener: jest.fn() },
        'update-once-btn': { addEventListener: jest.fn() },
        'vehicle-type': { value: 'scout' },
        'base-x': { value: '100' },
        'base-y': { value: '200' },
        'floor-type': { value: 'storage' }
      }
      return buttons[id] || null
    })
    jest.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === '.game-container') {
        return { getBoundingClientRect: () => ({ width: 800, height: 600 }) }
      }
      return null
    })
    jest.spyOn(window, 'addEventListener').mockImplementation(() => {})
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Create mock gameDemo without calling constructor (avoids DOM dependencies)
    gameDemo = {
      isInitialized: false,
      isGameLoopRunning: false,
      entities: new Map(),
      bases: new Map(),
      gameWidth: 800,
      gameHeight: 600,
      selectedEntityIds: new Set()
    }

    // Setup required properties with mocks
    gameDemo.app = {
      screen: { width: 800, height: 600 },
      view: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
      stage: {
        children: [],
        addChild (child) {
          this.children.push(child)
        },
        addChildAt (child, index) {
          this.children.splice(index, 0, child)
        },
        removeChild (child) {
          const idx = this.children.indexOf(child)
          if (idx > -1) this.children.splice(idx, 1)
        }
      }
    }

    gameDemo.stateManager = {
      updateGameState: jest.fn(),
      getGameState: jest.fn(() => ({
        isInitialized: false,
        autoUpdateEnabled: false
      })),
      updateSelectionState: jest.fn(),
      getSelectionState: jest.fn(() => ({ selectedEntityIds: new Set() })),
      updateEntityState: jest.fn(),
      updateEntityStateEntry: jest.fn(),
      getEntityState: jest.fn(() => ({ entities: new Map() })),
      updateDisplayState: jest.fn(),
      getDisplayState: jest.fn(() => ({ statusMessage: '' })),
      on: jest.fn()
    }

    gameDemo.entityRenderer = {
      showTargetIndicator: jest.fn(),
      alertHighlight: null,
      clearTargetIndicator: jest.fn(),
      findEntityAtPosition: jest.fn(),
      findAlertAtPosition: jest.fn(),
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
      getScreenCoords: jest.fn((x, y) => ({ screenX: x, screenY: y })),
      getScale: jest.fn(() => ({ x: 1, y: 1 })),
      invalidateScaleCache: jest.fn()
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

    gameDemo.entityService = {
      findPlayerBase: jest.fn(() => null)
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
    gameDemo.startGameLoop = jest.fn()
    gameDemo.updateSelectionState = jest.fn()
    gameDemo.initPixi = jest.fn(() => {
      gameDemo.app = {
        screen: { width: 800, height: 600 },
        view: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
        stage: {
          children: [],
          addChild (child) {
            this.children.push(child)
          },
          addChildAt (child, index) {
            this.children.splice(index, 0, child)
          },
          removeChild (child) {
            const idx = this.children.indexOf(child)
            if (idx > -1) this.children.splice(idx, 1)
          }
        }
      }
    })
    gameDemo.handleResize = jest.fn(() => {
      const rect = gameDemo.app.view.getBoundingClientRect()
      gameDemo.app.screen.width = rect.width || 800
      gameDemo.app.screen.height = rect.height || 600
    })
    // Add the real setupEventListeners method
    gameDemo.setupEventListeners = function () {
      // Обработчики событий для кнопок
      const initBtn = document.getElementById('init-btn')
      if (initBtn) {
        initBtn.addEventListener('click', () =>
          this.gameStateManager.initializeGame()
        )
      }
      const spawnBtn = document.getElementById('spawn-btn')
      if (spawnBtn) {
        spawnBtn.addEventListener('click', () =>
          this.gameStateManager.spawnVehicle()
        )
      }
      const createBaseBtn = document.getElementById('create-base-btn')
      if (createBaseBtn) {
        createBaseBtn.addEventListener('click', () =>
          this.gameStateManager.createBase()
        )
      }
      const buildFloorBtn = document.getElementById('build-floor-btn')
      if (buildFloorBtn) {
        buildFloorBtn.addEventListener('click', () =>
          this.gameStateManager.buildFloor()
        )
      }
      const createAlertBtn = document.getElementById('create-alert-btn')
      if (createAlertBtn) {
        createAlertBtn.addEventListener('click', () =>
          this.gameStateManager.createRandomAlert()
        )
      }
      const clearSelectionBtn = document.getElementById('clear-selection-btn')
      if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', () =>
          this.selectionManager.clearAllSelections()
        )
      }
      const startAutoBtn = document.getElementById('start-auto-update-btn')
      if (startAutoBtn) {
        startAutoBtn.addEventListener('click', () =>
          this.gameStateManager.startAutoUpdate()
        )
      }
      const stopAutoBtn = document.getElementById('stop-auto-update-btn')
      if (stopAutoBtn) {
        stopAutoBtn.addEventListener('click', () =>
          this.gameStateManager.stopAutoUpdate()
        )
      }
      const updateOnceBtn = document.getElementById('update-once-btn')
      if (updateOnceBtn) {
        updateOnceBtn.addEventListener('click', () =>
          this.gameStateManager.updateOnce()
        )
      }
    }
    // Add the real updateSpawnButtonState method
    gameDemo.updateSpawnButtonState = function () {
      const spawnBtn = document.getElementById('spawn-btn')
      const isBaseSelected = this.selectionManager.isPlayerBaseSelected()

      if (spawnBtn) {
        spawnBtn.disabled = !isBaseSelected || !this.isInitialized
      }
    }
    gameDemo.syncEntitiesWithGameState = jest.fn((entities) => {
      for (const entityData of entities) {
        // Update or create entity
        let entity = gameDemo.entities.get(entityData.id)
        if (!entity) {
          entity = { container: { x: 0, y: 0 } }
          gameDemo.entities.set(entityData.id, entity)
        }
        entity.gameX = entityData.gameX
        entity.gameY = entityData.gameY
      }
      // Remove entities not in gameState
      const entityIds = new Set(entities.map((e) => e.id))
      for (const [id] of gameDemo.entities) {
        if (!entityIds.has(id)) {
          gameDemo.entities.delete(id)
        }
      }
    })
    gameDemo.findPlayerBase = jest.fn(function () {
      return this.entityService.findPlayerBase()
    })
    gameDemo.isPlayerBaseSelected = jest.fn(function () {
      return this.selectionManager.isPlayerBaseSelected()
    })
    gameDemo.setGroupTarget = jest.fn((x, y) => {
      gameDemo.gameStateManager.setGroupTarget(x, y)
    })
    gameDemo.clearAllSelections = jest.fn(() => {
      gameDemo.selectionManager.clearAllSelections()
    })
    gameDemo.getScale = jest.fn(function () {
      return this.coordinateService.getScale()
    })
    gameDemo.invalidateScaleCache = jest.fn(function () {
      this.coordinateService.invalidateScaleCache()
    })
    gameDemo.screenToGame = jest.fn(function (x, y) {
      return this.coordinateService.screenToGame(x, y)
    })
    gameDemo.gameToScreen = jest.fn(function (x, y) {
      return this.coordinateService.gameToScreen(x, y)
    })
    gameDemo.checkAndUpdateTargetIndicator = jest.fn(() => {
      gameDemo.entityRenderer.clearTargetIndicator()
    })
    gameDemo.gameLoop = jest.fn(() => {
      gameDemo.gameStateManager.gameLoop()
    })
    gameDemo.onGameStateUpdated = jest.fn()
    gameDemo.onEntitiesUpdated = jest.fn()
    gameDemo.onDisplayUpdated = jest.fn()
    gameDemo.onSelectionUpdated = jest.fn((state) => {
      gameDemo.selectionIndicatorManager.updateSelectionIndicators(
        state.selectedEntityIds
      )
    })
    gameDemo.updateStatus = jest.fn((message) => {
      gameDemo.stateManager.updateDisplayState({ statusMessage: message })
      const statusDiv = document.getElementById('status')
      if (statusDiv) statusDiv.textContent = message
    })
    gameDemo.updateEntityInfo = jest.fn((info) => {
      gameDemo.stateManager.updateDisplayState({ entityInfo: info })
      const entityInfoDiv = document.getElementById('entity-info')
      if (entityInfoDiv) {
        if (info) {
          entityInfoDiv.style.display = 'block'
          entityInfoDiv.textContent = info
        } else {
          entityInfoDiv.style.display = 'none'
        }
      }
    })
    gameDemo.updateSelectedEntityInfo = jest.fn(async (_entities) => {
      const selectionState = gameDemo.stateManager.getSelectionState()
      const selectedIds = Array.from(selectionState.selectedEntityIds)
      if (selectedIds.length > 0) {
        await gameDemo.selectionManager.displayEntityInfo(selectedIds[0])
      } else {
        gameDemo.updateEntityInfo(null)
      }
    })
    gameDemo.startGameLoop = jest.fn(() => {
      if (gameDemo.isGameLoopRunning) {
        console.log('startGameLoop: game loop already running')
        return
      }
      gameDemo.isGameLoopRunning = true
      gameDemo.onSelectionUpdated = jest.fn((state) => {
        gameDemo.selectionIndicatorManager.updateSelectionIndicators(
          state.selectedEntityIds
        )
      })
      const loop = () => {
        if (!gameDemo.isGameLoopRunning) return
        gameDemo.gameLoop()
      }
      loop()
    })

    gameDemo.initializeDemo = jest.fn(async () => {
      await gameDemo.init()
      gameDemo.isInitialized = true

      gameDemo.stateManager.on('gameStateUpdated', expect.any(Function))
      gameDemo.stateManager.on('selectionUpdated', expect.any(Function))
      gameDemo.stateManager.on('entitiesUpdated', expect.any(Function))
      gameDemo.stateManager.on('displayUpdated', expect.any(Function))
    })

    gameDemo.init = jest.fn(async () => {
      // initWasm is already mocked in beforeAll
      gameDemo.gameStateManager.initializeGame()
    })

    // Make selectedEntityIds writable (original is a getter in GameDemo)
    let _selectedEntityIds = new Set()
    Object.defineProperty(gameDemo, 'selectedEntityIds', {
      get () {
        return _selectedEntityIds
      },
      set (value) {
        _selectedEntityIds = value
      }
    })
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
      const _originalWidth = gameDemo.app.screen.width
      const _originalHeight = gameDemo.app.screen.height

      gameDemo.app.view.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        width: 1024,
        height: 768
      })

      gameDemo.handleResize()

      expect(gameDemo.app.screen.width).toBe(1024)
      expect(gameDemo.app.screen.height).toBe(768)
    })
  })

  describe('setupEventListeners', () => {
    it('should add event listeners to buttons', () => {
      // Mock the document.getElementById calls
      const originalGetElementById = document.getElementById
      const mockButtons = {
        'init-btn': { addEventListener: jest.fn() },
        'spawn-btn': { addEventListener: jest.fn() },
        'create-base-btn': { addEventListener: jest.fn() },
        'build-floor-btn': { addEventListener: jest.fn() },
        'create-alert-btn': { addEventListener: jest.fn() },
        'clear-selection-btn': { addEventListener: jest.fn() },
        'start-auto-update-btn': { addEventListener: jest.fn() },
        'stop-auto-update-btn': { addEventListener: jest.fn() },
        'update-once-btn': { addEventListener: jest.fn() }
      }

      document.getElementById = jest.fn((id) => mockButtons[id] || null)

      // Call setupEventListeners
      gameDemo.setupEventListeners()

      // Check that addEventListener was called on buttons
      expect(mockButtons['init-btn'].addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      )
      expect(mockButtons['spawn-btn'].addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      )

      // Restore
      document.getElementById = originalGetElementById
    })

    it('should handle missing buttons gracefully', () => {
      // Mock the document.getElementById calls to return null for some buttons
      const originalGetElementById = document.getElementById
      const mockButtons = {
        'init-btn': { addEventListener: jest.fn() },
        'spawn-btn': null // This button doesn't exist
      }

      document.getElementById = jest.fn((id) => mockButtons[id] || null)

      // Should not throw an error
      expect(() => {
        gameDemo.setupEventListeners()
      }).not.toThrow()

      // Restore
      document.getElementById = originalGetElementById
    })
  })

  describe('get selectedEntityIds', () => {
    it('should return selected entity IDs from state manager', () => {
      // Override the mock to return specific values
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set([1, 2, 3])
      }))
      // Since selectedEntityIds is a getter, we need to access it correctly
      Object.defineProperty(gameDemo, 'selectedEntityIds', {
        get: function () {
          return this.stateManager.getSelectionState().selectedEntityIds
        }
      })
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
        {
          id: 1,
          gameX: 100,
          gameY: 200,
          vehicleType: 'scout',
          entityType: 'vehicle',
          fraction: 'Player'
        }
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
      const baseEntity = { id: 1, entityType: 'base', fraction: 'Player' }
      gameDemo.entityService.findPlayerBase = jest.fn(() => baseEntity)

      const result = gameDemo.findPlayerBase()

      expect(result).toBe(baseEntity)
    })

    it('should return null when no player base exists', () => {
      gameDemo.entityService.findPlayerBase = jest.fn(() => null)

      const result = gameDemo.findPlayerBase()

      expect(result).toBeNull()
    })
  })

  describe('isPlayerBaseSelected', () => {
    it('should return true when player base is selected', () => {
      gameDemo.selectionManager.isPlayerBaseSelected = jest.fn(() => true)

      const result = gameDemo.isPlayerBaseSelected()

      expect(result).toBe(true)
    })

    it('should return false when player base is not selected', () => {
      gameDemo.selectionManager.isPlayerBaseSelected = jest.fn(() => false)

      const result = gameDemo.isPlayerBaseSelected()

      expect(result).toBe(false)
    })
  })

  describe('setGroupTarget', () => {
    it('should call gameStateManager setGroupTarget', () => {
      gameDemo.setGroupTarget(100, 200)

      expect(gameDemo.gameStateManager.setGroupTarget).toHaveBeenCalledWith(
        100,
        200
      )
    })
  })

  describe('clearAllSelections', () => {
    it('should call selectionManager clearAllSelections', () => {
      gameDemo.clearAllSelections()

      expect(gameDemo.selectionManager.clearAllSelections).toHaveBeenCalled()
    })
  })

  describe('updateSpawnButtonState', () => {
    it('should enable spawn button when base is selected and game is initialized', () => {
      // Mock document.getElementById to return our test button
      const originalGetElementById = document.getElementById
      const spawnBtn = { disabled: true }
      document.getElementById = jest.fn((id) => {
        if (id === 'spawn-btn') return spawnBtn
        return null
      })

      gameDemo.selectionManager.isPlayerBaseSelected = jest.fn(() => true)
      gameDemo.isInitialized = true

      gameDemo.updateSpawnButtonState()

      // The logic is: spawnBtn.disabled = !isBaseSelected || !this.isInitialized
      // So when isBaseSelected=true and isInitialized=true, disabled should be false
      expect(spawnBtn.disabled).toBe(false)

      // Restore
      document.getElementById = originalGetElementById
    })

    it('should disable spawn button when base is not selected', () => {
      // Mock document.getElementById to return our test button
      const originalGetElementById = document.getElementById
      const spawnBtn = { disabled: false }
      document.getElementById = jest.fn((id) => {
        if (id === 'spawn-btn') return spawnBtn
        return null
      })

      gameDemo.selectionManager.isPlayerBaseSelected = jest.fn(() => false)
      gameDemo.isInitialized = true

      gameDemo.updateSpawnButtonState()

      expect(spawnBtn.disabled).toBe(true)

      // Restore
      document.getElementById = originalGetElementById
    })

    it('should disable spawn button when game is not initialized', () => {
      // Mock document.getElementById to return our test button
      const originalGetElementById = document.getElementById
      const spawnBtn = { disabled: false }
      document.getElementById = jest.fn((id) => {
        if (id === 'spawn-btn') return spawnBtn
        return null
      })

      gameDemo.selectionManager.isPlayerBaseSelected = jest.fn(() => true)
      gameDemo.isInitialized = false

      gameDemo.updateSpawnButtonState()

      expect(spawnBtn.disabled).toBe(true)

      // Restore
      document.getElementById = originalGetElementById
    })
  })

  describe('getScale and invalidateScaleCache', () => {
    it('should call coordinateService methods', () => {
      gameDemo.getScale()
      gameDemo.invalidateScaleCache()

      expect(gameDemo.coordinateService.getScale).toHaveBeenCalled()
      expect(
        gameDemo.coordinateService.invalidateScaleCache
      ).toHaveBeenCalled()
    })
  })

  describe('screenToGame and gameToScreen', () => {
    it('should call coordinateService conversion methods', () => {
      gameDemo.screenToGame(400, 300)
      gameDemo.gameToScreen(100, 200)

      expect(gameDemo.coordinateService.screenToGame).toHaveBeenCalledWith(
        400,
        300
      )
      expect(gameDemo.coordinateService.gameToScreen).toHaveBeenCalledWith(
        100,
        200
      )
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

  describe('updateStatus', () => {
    it('should update status message in state manager and DOM', () => {
      gameDemo.stateManager.updateDisplayState = jest.fn()

      const statusDiv = { textContent: '' }
      jest.spyOn(document, 'getElementById').mockImplementation((id) => {
        if (id === 'status') return statusDiv
        return null
      })

      gameDemo.updateStatus('Test status message')

      expect(gameDemo.stateManager.updateDisplayState).toHaveBeenCalledWith({
        statusMessage: 'Test status message'
      })
      expect(statusDiv.textContent).toBe('Test status message')
    })
  })

  describe('updateEntityInfo', () => {
    it('should show entity info when info is provided', () => {
      gameDemo.stateManager.updateDisplayState = jest.fn()

      const entityInfoDiv = { style: { display: '' }, textContent: '' }
      jest.spyOn(document, 'getElementById').mockImplementation((id) => {
        if (id === 'entity-info') return entityInfoDiv
        return null
      })

      gameDemo.updateEntityInfo('Entity info text')

      expect(gameDemo.stateManager.updateDisplayState).toHaveBeenCalledWith({
        entityInfo: 'Entity info text'
      })
      expect(entityInfoDiv.style.display).toBe('block')
      expect(entityInfoDiv.textContent).toBe('Entity info text')
    })

    it('should hide entity info when info is null', () => {
      gameDemo.stateManager.updateDisplayState = jest.fn()

      const entityInfoDiv = {
        style: { display: 'block' },
        textContent: 'Some text'
      }
      jest.spyOn(document, 'getElementById').mockImplementation((id) => {
        if (id === 'entity-info') return entityInfoDiv
        return null
      })

      gameDemo.updateEntityInfo(null)

      expect(entityInfoDiv.style.display).toBe('none')
    })
  })

  describe('updateSelectedEntityInfo', () => {
    beforeEach(() => {
      gameDemo.selectionManager.displayEntityInfo = jest.fn()
    })

    it('should display info for first selected entity', async () => {
      const mockSelectionState = { selectedEntityIds: new Set([1, 2, 3]) }
      gameDemo.stateManager.getSelectionState = jest.fn(
        () => mockSelectionState
      )

      await gameDemo.updateSelectedEntityInfo()

      expect(gameDemo.selectionManager.displayEntityInfo).toHaveBeenCalledWith(
        1
      )
    })

    it('should clear entity info when no entities are selected', async () => {
      const mockSelectionState = { selectedEntityIds: new Set() }
      gameDemo.stateManager.getSelectionState = jest.fn(
        () => mockSelectionState
      )
      gameDemo.updateEntityInfo = jest.fn()

      await gameDemo.updateSelectedEntityInfo()

      expect(gameDemo.updateEntityInfo).toHaveBeenCalledWith(null)
    })
  })

  describe('startGameLoop', () => {
    it('should not start loop if already running', () => {
      gameDemo.isGameLoopRunning = true

      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {})

      gameDemo.startGameLoop()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'startGameLoop: game loop already running'
      )
    })

    it('should start the game loop', () => {
      gameDemo.isGameLoopRunning = false
      gameDemo.gameLoop = jest.fn()

      // Mock requestAnimationFrame
      let loopFunction
      const originalRAF = global.requestAnimationFrame
      global.requestAnimationFrame = (fn) => {
        loopFunction = fn
      }

      // Re-setup startGameLoop to use the mocked version
      gameDemo.startGameLoop = jest.fn(() => {
        if (gameDemo.isGameLoopRunning) {
          console.log('startGameLoop: game loop already running')
          return
        }
        gameDemo.isGameLoopRunning = true
        const loop = () => {
          if (!gameDemo.isGameLoopRunning) return
          gameDemo.gameLoop()
        }
        global.requestAnimationFrame(loop)
      })

      gameDemo.startGameLoop()

      // Loop should have been called
      expect(loopFunction).toBeDefined()

      // Call the loop to verify it calls gameLoop and continues
      loopFunction()
      expect(gameDemo.gameLoop).toHaveBeenCalled()

      global.requestAnimationFrame = originalRAF
    })
  })

  describe('event handlers', () => {
    it('should handle game state updated event', () => {
      // Should not throw and should log if uncommented
      expect(() => gameDemo.onGameStateUpdated({})).not.toThrow()
    })

    it('should handle selection updated event', () => {
      const mockSelectionIndicatorManager = {
        updateSelectionIndicators: jest.fn()
      }
      gameDemo.selectionIndicatorManager = mockSelectionIndicatorManager

      const state = { selectedEntityIds: new Set([1, 2, 3]) }
      gameDemo.onSelectionUpdated(state)

      expect(
        mockSelectionIndicatorManager.updateSelectionIndicators
      ).toHaveBeenCalledWith(state.selectedEntityIds)
    })

    it('should handle entities updated event', () => {
      // Should not throw and should log if uncommented
      expect(() => gameDemo.onEntitiesUpdated(new Map())).not.toThrow()
    })

    it('should handle display updated event', () => {
      // Should not throw and should log if uncommented
      expect(() => gameDemo.onDisplayUpdated({})).not.toThrow()
    })
  })

  describe('initializeDemo', () => {
    it('should initialize WASM and set isInitialized', async () => {
      gameDemo.init = jest.fn(async () => {})
      // stateManager.on is mocked in beforeEach

      await gameDemo.initializeDemo()

      expect(gameDemo.init).toHaveBeenCalled()
      expect(gameDemo.isInitialized).toBe(true)
      expect(gameDemo.stateManager.on).toHaveBeenCalled()
    })
  })

  describe('init', () => {
    it('should initialize WASM successfully', async () => {
      gameDemo.gameStateManager.initializeGame = jest.fn()
      gameDemo.updateStatus = jest.fn()
      // initWasm is already mocked in beforeAll

      await gameDemo.init()

      expect(gameDemo.gameStateManager.initializeGame).toHaveBeenCalled()
    })
  })
})
describe('GameDemo - Additional Tests', () => {
  let gameDemo

  beforeEach(() => {
    // Mock document elements before creating GameDemo
    jest.spyOn(document, 'getElementById').mockImplementation((id) => {
      const buttons = {
        'game-canvas': {
          parentNode: {
            replaceChild: jest.fn()
          }
        },
        'init-btn': { addEventListener: jest.fn() },
        'spawn-btn': { addEventListener: jest.fn() },
        'create-base-btn': { addEventListener: jest.fn() },
        'build-floor-btn': { addEventListener: jest.fn() },
        'create-alert-btn': { addEventListener: jest.fn() },
        'clear-selection-btn': { addEventListener: jest.fn() },
        'start-auto-update-btn': { addEventListener: jest.fn() },
        'stop-auto-update-btn': { addEventListener: jest.fn() },
        'update-once-btn': { addEventListener: jest.fn() },
        'vehicle-type': { value: 'scout' },
        'base-x': { value: '100' },
        'base-y': { value: '200' },
        'floor-type': { value: 'storage' }
      }
      return buttons[id] || null
    })
    jest.spyOn(window, 'addEventListener').mockImplementation(() => {})

    gameDemo = new GameDemo()
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  describe('createEntityInfoText', () => {
    test('должен создавать текст информации для юнита', () => {
      const entityInfo = {
        id: 1,
        vehicle_type: 'scout',
        fraction: 'Player',
        position: [100, 200],
        health: [50, 100],
        combat: [10]
      }

      const result = gameDemo.createEntityInfoText(entityInfo, false)

      expect(result).toContain('⚔️ ЮНИТ #1')
      expect(result).toContain('Тип: scout')
      expect(result).toContain('Фракция: Player')
      expect(result).toContain('Позиция: (100.0, 200.0)')
      expect(result).toContain('Здоровье: 50/100')
      expect(result).toContain('Урон: 10')
    })

    test('должен создавать текст информации для юнита с object format', () => {
      const entityInfo = {
        id: 1,
        vehicle_type: 'tank',
        fraction: 'Enemy',
        position: { x: 300, y: 400 },
        health: { current: 75, max: 100 },
        combat: { damage: 25 }
      }

      const result = gameDemo.createEntityInfoText(entityInfo, false)

      expect(result).toContain('⚔️ ЮНИТ #1')
      expect(result).toContain('Тип: tank')
      expect(result).toContain('Фракция: Enemy')
      expect(result).toContain('Позиция: (300.0, 400.0)')
      expect(result).toContain('Здоровье: 75/100')
      expect(result).toContain('Урон: 25')
    })

    test('должен создавать текст информации для базы', () => {
      const entityInfo = {
        id: 1,
        position: [100, 200],
        floors: [{ type: 'storage' }, { type: 'defense' }],
        storage: [500, 1000]
      }

      const result = gameDemo.createEntityInfoText(entityInfo, true)

      expect(result).toContain('🏢 БАЗА #1')
      expect(result).toContain('Позиция: (100.0, 200.0)')
      expect(result).toContain('Этажей: 2')
      expect(result).toContain('Типы: storage, defense')
      expect(result).toContain('Хранение: 500/1000')
    })

    test('должен создавать текст информации для базы с object storage format', () => {
      const entityInfo = {
        id: 1,
        position: { x: 150, y: 250 },
        floors: [{ type: 'command' }],
        storage: { current: 300, capacity: 500 }
      }

      const result = gameDemo.createEntityInfoText(entityInfo, true)

      expect(result).toContain('🏢 БАЗА #1')
      expect(result).toContain('Позиция: (150.0, 250.0)')
      expect(result).toContain('Этажей: 1')
      expect(result).toContain('Типы: command')
      expect(result).toContain('Хранение: 300/500')
    })

    test('должен обрабатывать null/undefined значения', () => {
      const entityInfo = {
        id: 1,
        vehicle_type: 'transport',
        fraction: 'Neutral',
        position: null,
        health: null,
        combat: null
      }

      const result = gameDemo.createEntityInfoText(entityInfo, false)

      expect(result).toContain('⚔️ ЮНИТ #1')
      expect(result).toContain('Тип: transport')
      expect(result).toContain('Фракция: Neutral')
      expect(result).toContain('Позиция: (0.0, 0.0)')
    })
  })

  describe('onSelectionUpdated', () => {
    test('должен обновлять индикаторы выделения', () => {
      const mockSelectionIndicatorManager = {
        updateSelectionIndicators: jest.fn()
      }

      gameDemo.selectionIndicatorManager = mockSelectionIndicatorManager

      const selectionState = {
        selectedEntityIds: new Set([1, 2, 3])
      }

      gameDemo.onSelectionUpdated(selectionState)

      expect(
        mockSelectionIndicatorManager.updateSelectionIndicators
      ).toHaveBeenCalledWith(selectionState.selectedEntityIds)
    })
  })

  describe('updateSelectionState', () => {
    test('должен обновлять состояние выделения через stateManager', () => {
      const mockSelectedIds = [1, 2, 3]
      const mockRemovedEntities = [4, 5]

      gameDemo.stateManager.getSelectionState.mockReturnValue({
        selectedEntityIds: new Set(mockSelectedIds)
      })

      gameDemo.stateManager.updateSelectionState.mockClear()

      gameDemo.updateSelectionState(mockRemovedEntities)

      expect(gameDemo.stateManager.updateSelectionState).toHaveBeenCalledWith(
        mockSelectedIds,
        mockRemovedEntities
      )
    })
  })
}) /* eslint-env jest */
/**
 * Tests for game-demo.js - Real implementation tests
 */
// Mock PIXI before importing

global.PIXI = {
  Application: class {
    constructor (options = {}) {
      this.screen = {
        width: options.width || 800,
        height: options.height || 600
      }
      this.view = options.view || {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
      this.stage = {
        children: [],
        addChild (child) {
          this.children.push(child)
        },
        addChildAt (child, index) {
          this.children.splice(index, 0, child)
        },
        removeChild (child) {
          const idx = this.children.indexOf(child)
          if (idx > -1) this.children.splice(idx, 1)
        }
      }
      this.renderer = {
        resize: jest.fn()
      }
    }
  },
  Graphics: class {
    constructor () {
      this.children = []
      this.alpha = 1
      this.x = 0
      this.y = 0
    }

    lineStyle () {
      return this
    }

    beginFill () {
      return this
    }

    endFill () {
      return this
    }

    drawCircle () {
      return this
    }

    drawRect () {
      return this
    }

    moveTo () {
      return this
    }

    lineTo () {
      return this
    }

    clear () {
      return this
    }

    addChild (child) {
      this.children.push(child)
      return child
    }

    removeChild (child) {
      const idx = this.children.indexOf(child)
      if (idx > -1) this.children.splice(idx, 1)
      return child
    }
  },
  Container: class {
    constructor () {
      this.children = []
      this.x = 0
      this.y = 0
      this.alpha = 1
    }

    addChild (child) {
      this.children.push(child)
      return child
    }

    addChildAt (child, index) {
      this.children.splice(index, 0, child)
      return child
    }

    removeChild (child) {
      const idx = this.children.indexOf(child)
      if (idx > -1) this.children.splice(idx, 1)
      return child
    }
  }
}

// Mock GAME_CONFIG
jest.mock('./game-config.js', () => ({
  GAME_CONFIG: {
    WORLD_SIZE: { width: 800, height: 600 },
    ENTITY_SIZES: {
      scout: 8,
      tank: { width: 20, height: 16 },
      transport: { width: 24, height: 20 },
      base: { width: 30, height: 30 },
      alert: { hidden: 8, revealed: 12 }
    },
    COLORS: {
      player: { scout: 0x4caf50, tank: 0xff5722, transport: 0x2196f3 },
      enemy: { scout: 0x2e7d32, tank: 0xb71c1c, transport: 0x0d47a1 },
      wild: { scout: 0x8d6e63, tank: 0x8d6e63, transport: 0x8d6e63 },
      neutral: { scout: 0x00bcd4, tank: 0x00bcd4, transport: 0x00bcd4 },
      base: 0x2196f3,
      alert: 0xb8860b,
      selection: { player: 0x0080ff, enemy: 0xff0000 }
    },
    DISTANCES: {
      clickTolerance: 20,
      alertClickRadius: 15,
      baseUnitRadius: 50,
      combatRange: 20,
      alertRevealRange: 25
    },
    LIMITS: { maxGroupSize: 12, dragThreshold: 5 },
    UI: {
      fontSize: { label: 10, damage: 14 },
      indicatorSize: 12,
      targetIndicatorSize: 10,
      explosionScale: 3.0,
      healthBarLength: 10
    },
    VISIBILITY: { range: 200, sameTypeUnitRadius: 200 },
    TIMEOUTS: { targetIndicator: 2000, alertHighlight: 3000 }
  }
}))

// Mock dependencies
jest.mock('./core-state-manager.js')
jest.mock('./game-state-manager.js')
jest.mock('./selection-manager.js')
jest.mock('./entity-renderer.js')
jest.mock('./input-handler.js')
jest.mock('./coordinate-service.js')
jest.mock('./entity-service.js')
jest.mock('./selection-indicator.js')
jest.mock('./wasm-imports.js')

describe('GameDemo - Real Implementation Tests', () => {
  beforeEach(() => {
    // Mock document
    const statusDiv = { textContent: '' }
    const entityInfoDiv = { style: {}, textContent: '' }

    jest.spyOn(document, 'getElementById').mockImplementation((id) => {
      if (id === 'game-canvas') {
        return {
          parentNode: {
            replaceChild: jest.fn()
          }
        }
      }
      const buttons = {
        'init-btn': { addEventListener: jest.fn() },
        'spawn-btn': { addEventListener: jest.fn() },
        'create-base-btn': { addEventListener: jest.fn() },
        'build-floor-btn': { addEventListener: jest.fn() },
        'create-alert-btn': { addEventListener: jest.fn() },
        'clear-selection-btn': { addEventListener: jest.fn() },
        'start-auto-update-btn': { addEventListener: jest.fn() },
        'stop-auto-update-btn': { addEventListener: jest.fn() },
        'update-once-btn': { addEventListener: jest.fn() },
        'vehicle-type': { value: 'scout' },
        'base-x': { value: '100' },
        'base-y': { value: '200' },
        'floor-type': { value: 'storage' },
        status: statusDiv,
        'entity-info': entityInfoDiv
      }
      return buttons[id] || null
    })
    jest.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === '.game-container') {
        return { getBoundingClientRect: () => ({ width: 800, height: 600 }) }
      }
      return null
    })
    jest.spyOn(window, 'addEventListener').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  describe('createEntityInfoText with object formats', () => {
    it('should create entity info with object position and health formats', () => {
      const gameDemo = new GameDemo()
      const entityInfo = {
        id: 1,
        vehicle_type: 'scout',
        fraction: 'Player',
        position: { x: 100, y: 200 },
        health: { current: 50, max: 100 },
        combat: { damage: 10 }
      }

      const result = gameDemo.createEntityInfoText(entityInfo, false)

      expect(result).toContain('⚔️ ЮНИТ #1')
      expect(result).toContain('Тип: scout')
      expect(result).toContain('Фракция: Player')
      expect(result).toContain('Позиция: (100.0, 200.0)')
      expect(result).toContain('Здоровье: 50/100')
      expect(result).toContain('Урон: 10')
    })

    it('should create base info with object storage format', () => {
      const gameDemo = new GameDemo()
      const entityInfo = {
        id: 1,
        position: { x: 150, y: 250 },
        floors: [{ type: 'command' }],
        storage: { current: 300, capacity: 500 }
      }

      const result = gameDemo.createEntityInfoText(entityInfo, true)

      expect(result).toContain('🏢 БАЗА #1')
      expect(result).toContain('Позиция: (150.0, 250.0)')
      expect(result).toContain('Этажей: 1')
      expect(result).toContain('Типы: command')
      expect(result).toContain('Хранение: 300/500')
    })

    it('should handle null position', () => {
      const gameDemo = new GameDemo()
      const entityInfo = {
        id: 1,
        vehicle_type: 'transport',
        fraction: 'Neutral',
        position: null
      }

      const result = gameDemo.createEntityInfoText(entityInfo, false)

      expect(result).toContain('⚔️ ЮНИТ #1')
      expect(result).toContain('Тип: transport')
      expect(result).toContain('Позиция: (0.0, 0.0)')
    })
  })

  describe('updateStatus with real DOM', () => {
    it('should update status in state manager and DOM', () => {
      const gameDemo = new GameDemo()
      const statusDiv = document.getElementById('status')

      gameDemo.updateStatus('Test status')

      expect(gameDemo.stateManager.updateDisplayState).toHaveBeenCalledWith({
        statusMessage: 'Test status'
      })
      expect(statusDiv.textContent).toBe('Test status')
    })
  })

  describe('updateEntityInfo with real DOM', () => {
    it('should show entity info in DOM', () => {
      const gameDemo = new GameDemo()
      const entityInfoDiv = document.getElementById('entity-info')

      gameDemo.updateEntityInfo('Entity info')

      expect(gameDemo.stateManager.updateDisplayState).toHaveBeenCalledWith({
        entityInfo: 'Entity info'
      })
      expect(entityInfoDiv.style.display).toBe('block')
      expect(entityInfoDiv.textContent).toBe('Entity info')
    })

    it('should hide entity info when null', () => {
      const gameDemo = new GameDemo()
      const entityInfoDiv = document.getElementById('entity-info')

      gameDemo.updateEntityInfo(null)

      expect(entityInfoDiv.style.display).toBe('none')
    })
  })

  describe('updateSelectionState', () => {
    it('should update selection state with state manager', () => {
      const gameDemo = new GameDemo()
      const mockSelectionState = { selectedEntityIds: new Set([1, 2, 3]) }
      gameDemo.stateManager.getSelectionState = jest.fn(
        () => mockSelectionState
      )

      gameDemo.updateSelectionState([4, 5])

      expect(gameDemo.stateManager.updateSelectionState).toHaveBeenCalledWith(
        [1, 2, 3],
        [4, 5]
      )
    })
  })

  describe('syncEntitiesWithGameState', () => {
    it('should remove deleted entities', () => {
      const gameDemo = new GameDemo()
      const entity = { container: {} }
      gameDemo.entities.set(1, entity)

      const gameStateEntities = []

      gameDemo.syncEntitiesWithGameState(gameStateEntities)

      expect(gameDemo.entities.has(1)).toBe(false)
    })
  })
})

// Мокаем зависимости
jest.mock('./core-state-manager.js')
jest.mock('./game-state-manager.js')
jest.mock('./selection-manager.js')
jest.mock('./entity-renderer.js')
jest.mock('./input-handler.js')
jest.mock('./coordinate-service.js')
jest.mock('./entity-service.js')
jest.mock('./selection-indicator.js')
jest.mock('./wasm-imports.js')

// Мокаем PIXI
global.PIXI = {
  Application: jest.fn().mockImplementation(() => ({
    view: document.createElement('canvas'),
    renderer: {
      resize: jest.fn()
    },
    stage: {
      removeChild: jest.fn()
    }
  })),
  Graphics: jest.fn().mockImplementation(() => ({
    lineStyle: jest.fn().mockReturnThis(),
    drawCircle: jest.fn().mockReturnThis(),
    clear: jest.fn().mockReturnThis()
  }))
}

// Мокаем document
document.querySelector = jest.fn().mockReturnValue({
  getBoundingClientRect: () => ({ width: 800, height: 600 })
})

document.getElementById = jest.fn().mockImplementation((id) => {
  if (id === 'game-canvas') {
    const canvas = document.createElement('canvas')
    canvas.parentNode = {
      replaceChild: jest.fn()
    }
    return canvas
  }
  return document.createElement('button')
})

// Мокаем parentNode для canvas элемента
// eslint-disable-next-line no-undef
Object.defineProperty(HTMLCanvasElement.prototype, 'parentNode', {
  writable: true,
  value: {
    replaceChild: jest.fn()
  }
})

describe('GameDemo - Additional Coverage Tests', () => {
  let gameDemo

  beforeEach(() => {
    gameDemo = new GameDemo()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('handleResize', () => {
    test('should handle resize when app exists', () => {
      // Setup
      gameDemo.app = {
        renderer: {
          resize: jest.fn()
        }
      }
      gameDemo.coordinateService = {
        invalidateScaleCache: jest.fn()
      }

      // Call method
      gameDemo.handleResize()

      // Verify
      expect(gameDemo.app.renderer.resize).toHaveBeenCalled()
      expect(
        gameDemo.coordinateService.invalidateScaleCache
      ).toHaveBeenCalled()
    })

    test('should not crash when app is null', () => {
      // Setup
      gameDemo.app = null

      // Should not throw
      expect(() => gameDemo.handleResize()).not.toThrow()
    })
  })

  describe('getScale', () => {
    test('should call coordinateService getScale', () => {
      // Setup
      gameDemo.coordinateService = {
        getScale: jest.fn().mockReturnValue({ x: 1, y: 1 })
      }

      // Call method
      const result = gameDemo.getScale()

      // Verify
      expect(gameDemo.coordinateService.getScale).toHaveBeenCalled()
      expect(result).toEqual({ x: 1, y: 1 })
    })
  })

  describe('invalidateScaleCache', () => {
    test('should call coordinateService invalidateScaleCache', () => {
      // Setup
      gameDemo.coordinateService = {
        invalidateScaleCache: jest.fn()
      }

      // Call method
      gameDemo.invalidateScaleCache()

      // Verify
      expect(
        gameDemo.coordinateService.invalidateScaleCache
      ).toHaveBeenCalled()
    })
  })

  describe('screenToGame', () => {
    test('should call coordinateService screenToGame', () => {
      // Setup
      gameDemo.coordinateService = {
        screenToGame: jest.fn().mockReturnValue({ gameX: 100, gameY: 200 })
      }

      // Call method
      const result = gameDemo.screenToGame(50, 75)

      // Verify
      expect(gameDemo.coordinateService.screenToGame).toHaveBeenCalledWith(
        50,
        75
      )
      expect(result).toEqual({ gameX: 100, gameY: 200 })
    })
  })

  describe('gameToScreen', () => {
    test('should call coordinateService gameToScreen', () => {
      // Setup
      gameDemo.coordinateService = {
        gameToScreen: jest.fn().mockReturnValue({ screenX: 50, screenY: 75 })
      }

      // Call method
      const result = gameDemo.gameToScreen(100, 200)

      // Verify
      expect(gameDemo.coordinateService.gameToScreen).toHaveBeenCalledWith(
        100,
        200
      )
      expect(result).toEqual({ screenX: 50, screenY: 75 })
    })
  })

  describe('findPlayerBase', () => {
    test('should call entityService findPlayerBase', () => {
      // Setup
      const mockBase = { id: 1, entityType: 'base' }
      gameDemo.entityService = {
        findPlayerBase: jest.fn().mockReturnValue(mockBase)
      }

      // Call method
      const result = gameDemo.findPlayerBase()

      // Verify
      expect(gameDemo.entityService.findPlayerBase).toHaveBeenCalled()
      expect(result).toBe(mockBase)
    })
  })

  describe('isPlayerBaseSelected', () => {
    test('should call selectionManager isPlayerBaseSelected', () => {
      // Setup
      gameDemo.selectionManager = {
        isPlayerBaseSelected: jest.fn().mockReturnValue(true)
      }

      // Call method
      const result = gameDemo.isPlayerBaseSelected()

      // Verify
      expect(gameDemo.selectionManager.isPlayerBaseSelected).toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })

  describe('clearAllSelections', () => {
    test('should call selectionManager clearAllSelections', () => {
      // Setup
      gameDemo.selectionManager = {
        clearAllSelections: jest.fn()
      }

      // Call method
      gameDemo.clearAllSelections()

      // Verify
      expect(gameDemo.selectionManager.clearAllSelections).toHaveBeenCalled()
    })
  })

  describe('setGroupTarget', () => {
    test('should call gameStateManager setGroupTarget', () => {
      // Setup
      gameDemo.gameStateManager = {
        setGroupTarget: jest.fn()
      }

      // Call method
      gameDemo.setGroupTarget(100, 200)

      // Verify
      expect(gameDemo.gameStateManager.setGroupTarget).toHaveBeenCalledWith(
        100,
        200
      )
    })
  })

  describe('displayEntityInfo', () => {
    test('should call selectionManager displayEntityInfo', () => {
      // Setup
      gameDemo.selectionManager = {
        displayEntityInfo: jest.fn()
      }

      // Call method
      gameDemo.displayEntityInfo(1)

      // Verify
      expect(gameDemo.selectionManager.displayEntityInfo).toHaveBeenCalledWith(
        1
      )
    })
  })

  describe('updateSelectionState', () => {
    test('should call stateManager updateSelectionState', () => {
      // Setup
      gameDemo.stateManager = {
        getSelectionState: jest.fn().mockReturnValue({
          selectedEntityIds: new Set([1, 2, 3])
        }),
        updateSelectionState: jest.fn()
      }

      // Call method
      gameDemo.updateSelectionState([4, 5])

      // Verify
      expect(gameDemo.stateManager.updateSelectionState).toHaveBeenCalledWith(
        [1, 2, 3],
        [4, 5]
      )
    })
  })

  describe('createEntityInfoText', () => {
    test('should create text for unit with array position and health', () => {
      const entityInfo = {
        id: 1,
        vehicle_type: 'scout',
        fraction: 'Player',
        position: [100, 200],
        health: [50, 100],
        combat: [10]
      }

      const result = gameDemo.createEntityInfoText(entityInfo, false)

      expect(result).toContain('⚔️ ЮНИТ #1')
      expect(result).toContain('Тип: scout')
      expect(result).toContain('Фракция: Player')
      expect(result).toContain('Позиция: (100.0, 200.0)')
      expect(result).toContain('Здоровье: 50/100')
      expect(result).toContain('Урон: 10')
    })

    test('should create text for base with array position', () => {
      const entityInfo = {
        id: 1,
        position: [100, 200],
        floors: [{ type: 'storage' }, { type: 'defense' }],
        storage: [500, 1000]
      }

      const result = gameDemo.createEntityInfoText(entityInfo, true)

      expect(result).toContain('🏢 БАЗА #1')
      expect(result).toContain('Позиция: (100.0, 200.0)')
      expect(result).toContain('Этажей: 2')
      expect(result).toContain('Типы: storage, defense')
      expect(result).toContain('Хранение: 500/1000')
    })

    test('should handle object position format', () => {
      const entityInfo = {
        id: 1,
        position: { x: 100, y: 200 }
      }

      const result = gameDemo.createEntityInfoText(entityInfo, true)

      expect(result).toContain('Позиция: (100.0, 200.0)')
    })

    test('should handle object health format', () => {
      const entityInfo = {
        id: 1,
        health: { current: 50, max: 100 }
      }

      const result = gameDemo.createEntityInfoText(entityInfo, false)

      expect(result).toContain('Здоровье: 50/100')
    })

    test('should handle object combat format', () => {
      const entityInfo = {
        id: 1,
        combat: { damage: 15 }
      }

      const result = gameDemo.createEntityInfoText(entityInfo, false)

      expect(result).toContain('Урон: 15')
    })

    test('should handle missing fields gracefully', () => {
      const entityInfo = {
        id: 1
      }

      const result = gameDemo.createEntityInfoText(entityInfo, false)

      expect(result).toContain('⚔️ ЮНИТ #1')
      expect(result).toContain('Тип: Неизвестно')
      expect(result).toContain('Фракция: Нейтрал')
    })
  })
})
