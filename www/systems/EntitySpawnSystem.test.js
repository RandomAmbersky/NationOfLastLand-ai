/**
 * Simple tests for EntitySpawnSystem
 */

import { EntitySpawnSystem } from './EntitySpawnSystem.js'

class MockContainer {
  constructor() {
    this.x = 0
    this.y = 0
    this.addChild = jest.fn()
    this.removeChild = jest.fn()
    this.destroy = jest.fn()
  }
}

class MockApplication {
  constructor() {
    this.stage = {
      addChild: jest.fn(),
      removeChild: jest.fn(),
      addChildAt: jest.fn(),
      children: []
    }
    this.screen = {
      width: 800,
      height: 600
    }
    this.view = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      clientWidth: 800,
      clientHeight: 600,
      getBoundingClientRect: () => ({ left: 0, top: 0 })
    }
  }
}

describe('EntitySpawnSystem', () => {
  let gameEngine
  let entitySpawnSystem
  let mockApp
  let mockRendererSystem

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockApp = new MockApplication()
    mockRendererSystem = {
      addToStage: jest.fn(),
      removeFromStage: jest.fn(),
      transformer: {
        gameToScreen: jest.fn((x, y) => ({ x: x, y: y }))
      }
    }
    
    const mockState = {
      get: jest.fn((key) => {
        if (key === 'entities') return new Map()
        if (key === 'isRunning') return true
        return null
      }),
      merge: jest.fn(),
      subscribe: jest.fn(),
      emit: jest.fn()
    }

    gameEngine = {
      state: mockState,
      app: mockApp,
      rendererSystem: mockRendererSystem
    }

    entitySpawnSystem = new EntitySpawnSystem(gameEngine, mockRendererSystem)
    entitySpawnSystem.init(mockApp)
  })

  describe('constructor', () => {
    it('should initialize with gameEngine', () => {
      expect(entitySpawnSystem.gameEngine).toBe(gameEngine)
      expect(entitySpawnSystem.spawnQueue).toEqual([])
      expect(entitySpawnSystem.deletionQueue).toEqual(new Set())
    })
  })

  describe('queueSpawn', () => {
    it('should add entity to spawn queue', () => {
      const entityData = { id: 1 }
      entitySpawnSystem.queueSpawn(entityData)
      expect(entitySpawnSystem.spawnQueue).toHaveLength(1)
      expect(entitySpawnSystem.spawnQueue[0]).toBe(entityData)
    })
  })

  describe('queueDeletion', () => {
    it('should add entity to deletion queue', () => {
      entitySpawnSystem.queueDeletion(1)
      expect(entitySpawnSystem.deletionQueue).toContain(1)
    })
  })

  describe('processSpawns', () => {
    it('should process entity spawns', () => {
      const entityData = {
        id: 1,
        position: { x: 100, y: 200 },
        subtype: 'scout',
        fraction: 'Player',
        entity_type: 'vehicle'
      }
      entitySpawnSystem.queueSpawn(entityData)
      
      const newEntities = entitySpawnSystem.processSpawns()
      expect(newEntities.length).toBe(1)
      expect(newEntities[0].id).toBe(1)
    })

    it('should return empty array when queue is empty', () => {
      const newEntities = entitySpawnSystem.processSpawns()
      expect(newEntities.length).toBe(0)
    })
  })

  describe('processDeletions', () => {
    it('should process entity deletions', () => {
      // Add entity to state
      const stateEntities = new Map()
      stateEntities.set(1, { container: new MockContainer() })
      gameEngine.state.get = jest.fn((key) => key === 'entities' ? stateEntities : null)
      
      entitySpawnSystem.queueDeletion(1)
      const deletedCount = entitySpawnSystem.processDeletions()
      expect(deletedCount).toBe(1)
    })

    it('should return 0 when queue is empty', () => {
      const deletedCount = entitySpawnSystem.processDeletions()
      expect(deletedCount).toBe(0)
    })
  })

  describe('destroy', () => {
    it('should clean up resources', () => {
      entitySpawnSystem.destroy()
      expect(entitySpawnSystem.isDestroyed).toBe(true)
      expect(entitySpawnSystem.gameEngine).toBeNull()
      expect(entitySpawnSystem.app).toBeNull()
      expect(entitySpawnSystem.spawnQueue).toEqual([])
      expect(entitySpawnSystem.deletionQueue.size).toBe(0)
    })
  })
})
