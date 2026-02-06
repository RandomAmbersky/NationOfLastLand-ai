/* eslint-env jest */
/**
 * Tests for game-state-manager.js
 */
jest.mock('./wasm-imports.js', () => ({
  gameInit: jest.fn(),
  create_vehicle: jest.fn(),
  update: jest.fn(),
  set_group_target: jest.fn(),
  create_base: jest.fn(),
  build_floor: jest.fn(),
  create_random_alert: jest.fn(),
  clear_selection: jest.fn(),
  get_entities_data: jest.fn()
}))

const { GameStateManager } = require('./game-state-manager.js')

describe('GameStateManager', () => {
  let gameDemo
  let gameStateManager

  beforeEach(() => {
    gameDemo = {
      isInitialized: false,
      stateManager: {
        updateGameState: jest.fn(),
        getGameState: jest.fn(() => ({ isInitialized: false, autoUpdateEnabled: false }))
      },
      entityRenderer: {
        showTargetIndicator: jest.fn(),
        alertHighlight: null,
        clearTargetIndicator: jest.fn()
      },
      app: {
        stage: {
          removeChild: jest.fn()
        }
      },
      selectedEntityIds: new Set(),
      updateStatus: jest.fn(),
      updateSpawnButtonState: jest.fn(),
      startGameLoop: jest.fn(),
      entities: new Map(),
      syncEntitiesWithGameState: jest.fn(),
      updateSelectedEntityInfo: jest.fn(),
      setGroupTarget: jest.fn(),
      updateSelectionState: jest.fn(),
      isGameLoopRunning: false
    }

    gameStateManager = new GameStateManager(gameDemo)
  })

  describe('initializeGame', () => {
    it('should initialize game and update state', async () => {
      const { gameInit } = require('./wasm-imports.js')
      gameInit.mockReturnValue(JSON.stringify({
        time: 10,
        entities_count: 5,
        alerts_count: 2,
        debug_messages: []
      }))
      gameDemo.isInitialized = false

      await gameStateManager.initializeGame()

      expect(gameInit).toHaveBeenCalled()
      expect(gameDemo.stateManager.updateGameState).toHaveBeenCalledWith({
        isInitialized: true,
        autoUpdateEnabled: false,
        time: 10,
        entitiesCount: 5,
        alertsCount: 2
      })
      expect(gameDemo.updateStatus).toHaveBeenCalled()
    })

    it('should handle initialization error', async () => {
      const { gameInit } = require('./wasm-imports.js')
      gameInit.mockImplementation(() => { throw new Error('Init failed') })
      gameDemo.isInitialized = false

      await gameStateManager.initializeGame()

      expect(gameDemo.updateStatus).toHaveBeenCalledWith('Game initialization failed: Init failed')
    })
  })

  describe('spawnVehicle', () => {
    beforeEach(() => {
      gameDemo.isInitialized = true
      gameDemo.stateManager.getGameState = jest.fn(() => ({ isInitialized: true, autoUpdateEnabled: false }))
    })

    it('should not spawn if not initialized', async () => {
      gameDemo.isInitialized = false

      await gameStateManager.spawnVehicle()

      expect(gameDemo.updateStatus).toHaveBeenCalledWith('Please initialize the game first!')
    })

    it('should not spawn if player base not selected', async () => {
      gameDemo.selectionManager = {
        isPlayerBaseSelected: jest.fn(() => false)
      }

      await gameStateManager.spawnVehicle()

      expect(gameDemo.updateStatus).toHaveBeenCalledWith('Cannot spawn vehicle: Please select a player base first!')
    })

    it('should spawn vehicle successfully', async () => {
      const { create_vehicle } = require('./wasm-imports.js')
      gameDemo.selectionManager = {
        isPlayerBaseSelected: jest.fn(() => true),
        selectEntity: jest.fn()
      }
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set([1])
      }))
      gameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, { entityType: 'base', fraction: 'Player', gameX: 100, gameY: 200 }]])
      }))
      gameDemo.updateSpawnButtonState = jest.fn()

      create_vehicle.mockReturnValue(JSON.stringify({
        success: true,
        id: 42,
        message: 'Vehicle created'
      }))

      await gameStateManager.spawnVehicle()

      expect(create_vehicle).toHaveBeenCalled()
      expect(gameDemo.selectionManager.selectEntity).toHaveBeenCalledWith(42, true, true)
      expect(gameDemo.updateStatus).toHaveBeenCalledWith(expect.stringContaining('Vehicle spawned'))
    })
  })

  describe('createBase', () => {
    beforeEach(() => {
      gameDemo.isInitialized = true
      gameDemo.bases = new Map()
    })

    it('should create base successfully', async () => {
      const { create_base } = require('./wasm-imports.js')
      create_base.mockReturnValue(JSON.stringify({
        id: 1,
        x: 100,
        y: 200,
        floors: [],
        current_storage_usage: 0,
        total_storage_capacity: 100
      }))

      await gameStateManager.createBase()

      expect(create_base).toHaveBeenCalled()
      expect(gameDemo.bases.get(1)).toBeDefined()
      expect(gameDemo.updateStatus).toHaveBeenCalled()
    })
  })

  describe('buildFloor', () => {
    beforeEach(() => {
      gameDemo.isInitialized = true
      gameDemo.bases = new Map([[1, { id: 1, floors: [] }]])
    })

    it('should not build floor if no bases available', async () => {
      gameDemo.bases = new Map()

      await gameStateManager.buildFloor()

      expect(gameDemo.updateStatus).toHaveBeenCalledWith('No bases available. Create a base first!')
    })

    it('should build floor successfully', async () => {
      const { build_floor } = require('./wasm-imports.js')
      build_floor.mockReturnValue(JSON.stringify({
        id: 1,
        floors: [{ type: 'storage' }]
      }))

      await gameStateManager.buildFloor()

      expect(build_floor).toHaveBeenCalled()
      expect(gameDemo.bases.get(1).floors.length).toBe(1)
      expect(gameDemo.updateStatus).toHaveBeenCalled()
    })
  })

  describe('startAutoUpdate', () => {
    it('should enable auto update', () => {
      gameStateManager.startAutoUpdate()

      expect(gameDemo.stateManager.updateGameState).toHaveBeenCalledWith({ autoUpdateEnabled: true })
      expect(gameDemo.updateStatus).toHaveBeenCalled()
      expect(gameDemo.startGameLoop).toHaveBeenCalled()
    })
  })

  describe('stopAutoUpdate', () => {
    it('should disable auto update', () => {
      gameStateManager.stopAutoUpdate()

      expect(gameDemo.stateManager.updateGameState).toHaveBeenCalledWith({ autoUpdateEnabled: false })
      expect(gameDemo.updateStatus).toHaveBeenCalled()
    })
  })

  describe('updateOnce', () => {
    it('should update game state', () => {
      gameDemo.isInitialized = true
      gameDemo.lastUpdate = Date.now() - 1000
      gameDemo.stateManager.updateGameState = jest.fn()

      const { update } = require('./wasm-imports.js')
      update.mockReturnValue(JSON.stringify({
        time: 15.5,
        entities_count: 6,
        alerts_count: 3,
        removed_entities: [],
        entities: []
      }))

      gameStateManager.updateOnce()

      expect(update).toHaveBeenCalled()
      expect(gameDemo.stateManager.updateGameState).toHaveBeenCalledWith({
        time: 15.5,
        entitiesCount: 6,
        alertsCount: 3
      })
    })
  })

  describe('setGroupTarget', () => {
    it('should set group target successfully', async () => {
      const { set_group_target } = require('./wasm-imports.js')
      set_group_target.mockReturnValue(JSON.stringify({
        success: true,
        message: 'Target set'
      }))

      await gameStateManager.setGroupTarget(100, 200)

      expect(set_group_target).toHaveBeenCalledWith(100, 200)
      expect(gameDemo.updateStatus).toHaveBeenCalledWith('Group target set: Target set')
    })

    it('should handle group target failure', async () => {
      const { set_group_target } = require('./wasm-imports.js')
      set_group_target.mockReturnValue(JSON.stringify({
        success: false,
        message: 'Invalid target'
      }))

      await gameStateManager.setGroupTarget(100, 200)

      expect(gameDemo.updateStatus).toHaveBeenCalledWith('Failed to set group target: Invalid target')
    })
  })

  describe('gameLoop', () => {
    it('should call updateOnce when auto update enabled', () => {
      gameDemo.isInitialized = true
      gameDemo.stateManager.getGameState = jest.fn(() => ({
        isInitialized: true,
        autoUpdateEnabled: true
      }))

      gameStateManager.gameLoop()

      expect(gameStateManager.updateOnce).toHaveBeenCalled()
    })

    it('should not call updateOnce when auto update disabled', () => {
      gameDemo.isInitialized = true
      gameDemo.stateManager.getGameState = jest.fn(() => ({
        isInitialized: true,
        autoUpdateEnabled: false
      }))

      gameStateManager.gameLoop()

      expect(gameStateManager.updateOnce).not.toHaveBeenCalled()
    })
  })
})
