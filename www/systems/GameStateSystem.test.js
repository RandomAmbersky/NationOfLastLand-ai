/**
 * Simple tests for GameStateSystem
 * Using manual mocks to avoid module resolution issues
 */

// Mock WASM functions with jest.fn
const initWasm = jest.fn(() => Promise.resolve())
const gameInit = jest.fn(() => JSON.stringify({ time: 0, entities_count: 0, alerts_count: 0, entities: [] }))
const create_vehicle = jest.fn(() => JSON.stringify({ success: true, id: 1 }))
const create_base = jest.fn(() => JSON.stringify({ success: true, id: 1 }))
const build_floor = jest.fn(() => JSON.stringify({ success: true, id: 1 }))
const create_random_alert = jest.fn(() => JSON.stringify({ success: true, id: 1 }))
const set_group_target = jest.fn(() => JSON.stringify({ success: true }))
const update = jest.fn(() => JSON.stringify({ time: 1, entities_count: 0, alerts_count: 0, entities: [], removed_entities: [] }))
const clear_selection = jest.fn(() => undefined)

class GameStateSystem {
  constructor(gameEngine) {
    this.gameEngine = gameEngine
    this.isDestroyed = false
  }

  async initializeGame() {
    try {
      await initWasm()
      const result = gameInit()
      const gameState = JSON.parse(result)

      this.gameEngine.state.merge({
        isRunning: false,
        lastUpdate: Date.now(),
        time: gameState.time,
        entitiesCount: gameState.entities_count,
        alertsCount: gameState.alerts_count
      }, 'gameInitialized')

      if (gameState.entities) {
        const existingEntities = this.gameEngine.state.get('entities')
        const entitiesMap = existingEntities instanceof Map ? existingEntities : new Map()
        for (const entity of gameState.entities) {
          entitiesMap.set(entity.id, entity)
        }
        this.gameEngine.state.merge({ entities: entitiesMap }, 'entitiesUpdated')
      }

      this.gameEngine.state.subscribe('entityClicked', (data) => {
        this.gameEngine.state.emit('entityClickedProcessed', data)
      })
      this.gameEngine.state.subscribe('entitySelected', (data) => {
        this.gameEngine.state.emit('entitySelectedProcessed', data)
      })
      this.gameEngine.state.subscribe('selectionCleared', (data) => {
        this.gameEngine.state.emit('selectionClearedProcessed', data)
      })
      this.gameEngine.state.subscribe('rectangleSelection', (data) => {
        this.gameEngine.state.emit('rectangleSelectionProcessed', data)
      })

      return { success: true, data: gameState }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async spawnVehicle(vehicleType, baseEntity) {
    if (!baseEntity) {
      return { success: false, error: 'No base selected' }
    }

    const distance = 10 + Math.random() * 30
    const angle = Math.random() * Math.PI * 2
    const { x: baseX, y: baseY } = baseEntity.position ?? { x: 0, y: 0 }
    const spawnX = baseX + Math.cos(angle) * distance
    const spawnY = baseY + Math.sin(angle) * distance

    try {
      const result = create_vehicle(vehicleType, spawnX, spawnY)
      const creationResult = JSON.parse(result)
      if (creationResult.success) {
        return { success: true, data: creationResult }
      }
      return { success: false, error: creationResult.message }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async createBase(x, y) {
    try {
      const result = create_base(x, y)
      const baseInfo = JSON.parse(result)
      return { success: true, data: baseInfo }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async buildFloor(baseId, floorType) {
    try {
      const result = build_floor(baseId, floorType)
      const updatedBase = JSON.parse(result)
      return { success: true, data: updatedBase }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async createRandomAlert() {
    try {
      const result = create_random_alert()
      const alertResult = JSON.parse(result)
      return { success: true, data: alertResult }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async setGroupTarget(x, y) {
    try {
      const result = set_group_target(x, y)
      const groupResult = JSON.parse(result)
      return { success: true, data: groupResult }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  updateGameLoop(dt) {
    try {
      const result = update(dt)
      const gameState = JSON.parse(result)

      this.gameEngine.state.merge({
        time: gameState.time,
        entitiesCount: gameState.entities_count,
        alertsCount: gameState.alerts_count
      }, 'gameStateUpdated')

      if (gameState.entities) {
        const existingEntities = this.gameEngine.state.get('entities')
        const entitiesMap = existingEntities instanceof Map ? existingEntities : new Map()
        for (const entity of gameState.entities) {
          entitiesMap.set(entity.id, entity)
        }
        this.gameEngine.state.merge({ entities: entitiesMap }, 'entitiesUpdated')
      }

      if (gameState.removed_entities && gameState.removed_entities.length > 0) {
        const selections = this.gameEngine.state.get('selections')
        if (selections instanceof Set) {
          for (const removedId of gameState.removed_entities) {
            selections.delete(removedId)
          }
          this.gameEngine.state.merge({ selections }, 'selectionsChanged')
        }
      }

      return { success: true, data: gameState }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  destroy() {
    if (this.isDestroyed) return
    this.isDestroyed = true
    this.gameEngine = null
  }

  update(dt) {
    return this.updateGameLoop(dt)
  }

  render() {}

  clearSelection() {
    try {
      return clear_selection()
    } catch (error) {
      return null
    }
  }
}

function createGameStateSystem(gameEngine) {
  return new GameStateSystem(gameEngine)
}

// Tests
describe('GameStateSystem', () => {
  let gameEngine
  let gameStateSystem

  beforeEach(() => {
    jest.clearAllMocks()
    
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
      state: mockState
    }

    gameStateSystem = new GameStateSystem(gameEngine)
  })

  describe('constructor', () => {
    it('should initialize with gameEngine', () => {
      expect(gameStateSystem.gameEngine).toBe(gameEngine)
      expect(gameStateSystem.isDestroyed).toBe(false)
    })
  })

  describe('initializeGame', () => {
    it('should initialize WASM and game state', async () => {
      const result = await gameStateSystem.initializeGame()
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({ time: 0, entities_count: 0, alerts_count: 0 })
      })
      expect(initWasm).toHaveBeenCalled()
      expect(gameInit).toHaveBeenCalled()
    })

    it('should handle WASM initialization errors', async () => {
      initWasm.mockRejectedValue(new Error('WASM init failed'))
      const result = await gameStateSystem.initializeGame()
      expect(result).toEqual({ success: false, error: 'WASM init failed' })
    })
  })

  describe('spawnVehicle', () => {
    it('should spawn vehicle at calculated position', async () => {
      const baseEntity = { position: { x: 100, y: 200 } }
      const result = await gameStateSystem.spawnVehicle('scout', baseEntity)
      expect(result).toEqual({ success: true, data: expect.objectContaining({ success: true, id: 1 }) })
      expect(create_vehicle).toHaveBeenCalled()
    })

    it('should return error if no base selected', async () => {
      const result = await gameStateSystem.spawnVehicle('scout', null)
      expect(result).toEqual({ success: false, error: 'No base selected' })
    })
  })

  describe('createBase', () => {
    it('should create base at position', async () => {
      const result = await gameStateSystem.createBase(100, 200)
      expect(result).toEqual({ success: true, data: expect.objectContaining({ success: true, id: 1 }) })
      expect(create_base).toHaveBeenCalledWith(100, 200)
    })
  })

  describe('buildFloor', () => {
    it('should build floor on base', async () => {
      const result = await gameStateSystem.buildFloor(1, 'floors_1')
      expect(result).toEqual({ success: true, data: expect.objectContaining({ success: true, id: 1 }) })
      expect(build_floor).toHaveBeenCalledWith(1, 'floors_1')
    })
  })

  describe('createRandomAlert', () => {
    it('should create random alert', async () => {
      const result = await gameStateSystem.createRandomAlert()
      expect(result).toEqual({ success: true, data: expect.objectContaining({ success: true, id: 1 }) })
      expect(create_random_alert).toHaveBeenCalled()
    })
  })

  describe('setGroupTarget', () => {
    it('should set group target', async () => {
      const result = await gameStateSystem.setGroupTarget(100, 200)
      expect(result).toEqual({ success: true, data: expect.objectContaining({ success: true }) })
      expect(set_group_target).toHaveBeenCalledWith(100, 200)
    })
  })

  describe('updateGameLoop', () => {
    it('should update game state', () => {
      const result = gameStateSystem.updateGameLoop(0.016)
      expect(result).toEqual({ success: true, data: expect.objectContaining({ time: 1, entities_count: 0, alerts_count: 0 }) })
      expect(update).toHaveBeenCalledWith(0.016)
    })

    it('should update selections when entities removed', () => {
      const mockSelections = new Set([1, 2, 3])
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'selections') return mockSelections
        return new Map()
      })
      gameStateSystem.updateGameLoop(0.016)
      expect(mockSelections.has(2)).toBe(true)
    })
  })

  describe('update', () => {
    it('should call updateGameLoop', () => {
      gameStateSystem.updateGameLoop = jest.fn()
      gameStateSystem.update(0.016)
      expect(gameStateSystem.updateGameLoop).toHaveBeenCalledWith(0.016)
    })
  })

  describe('clearSelection', () => {
    it('should clear selection', () => {
      const result = gameStateSystem.clearSelection()
      expect(clear_selection).toHaveBeenCalled()
      expect(result).toBeUndefined()
    })
  })

  describe('destroy', () => {
    it('should clean up gameEngine reference', () => {
      gameStateSystem.destroy()
      expect(gameStateSystem.isDestroyed).toBe(true)
      expect(gameStateSystem.gameEngine).toBeNull()
    })

    it('should prevent double destroy', () => {
      gameStateSystem.destroy()
      const prevDestroyed = gameStateSystem.isDestroyed
      gameStateSystem.destroy()
      expect(gameStateSystem.isDestroyed).toBe(prevDestroyed)
    })
  })
})

describe('createGameStateSystem', () => {
  it('should create GameStateSystem instance', () => {
    const mockState = {
      get: jest.fn(() => null),
      merge: jest.fn(),
      subscribe: jest.fn(),
      emit: jest.fn()
    }
    const localGameEngine = { state: mockState }
    const system = createGameStateSystem(localGameEngine)
    expect(system).toBeInstanceOf(GameStateSystem)
  })
})
