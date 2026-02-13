/**
 * Tests for GameStateSystem with GameApi auto-bind
 */

import { GameStateSystem } from './GameStateSystem.js'

describe('GameStateSystem', () => {
  let gameEngine
  let gameStateSystem

  beforeEach(() => {
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
  })

  describe('constructor', () => {
    it('should initialize with gameEngine and auto-create GameApi', () => {
      gameStateSystem = new GameStateSystem(gameEngine)
      expect(gameStateSystem.gameEngine).toBe(gameEngine)
      expect(gameStateSystem.gameApi).toBeDefined()
      expect(gameStateSystem.gameApi.initialize).toBeDefined()
      expect(gameStateSystem.isDestroyed).toBe(false)
    })

    it('should use provided gameApi if passed', () => {
      const mockApi = { initialize: jest.fn() }
      gameStateSystem = new GameStateSystem(gameEngine, mockApi)
      expect(gameStateSystem.gameApi).toBe(mockApi)
    })
  })

  describe('initializeGame', () => {
    it('should initialize game state', async () => {
      gameStateSystem = new GameStateSystem(gameEngine)
      const result = await gameStateSystem.initializeGame()

      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          time: 0,
          entities_count: 0,
          alerts_count: 0
        })
      })
    })
  })

  describe('destroy', () => {
    it('should cleanup resources', () => {
      gameStateSystem = new GameStateSystem(gameEngine)
      gameStateSystem.destroy()

      expect(gameStateSystem.isDestroyed).toBe(true)
      expect(gameStateSystem.gameApi).toBeNull()
      expect(gameStateSystem.repository).toBeNull()
      expect(gameStateSystem.gameEngine).toBeNull()
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
    const system = new GameStateSystem(localGameEngine)
    expect(system).toBeInstanceOf(GameStateSystem)
  })
})
