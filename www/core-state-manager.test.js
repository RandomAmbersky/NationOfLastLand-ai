import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CoreStateManager } from './core-state-manager.js'

describe('CoreStateManager', () => {
  let stateManager

  beforeEach(() => {
    stateManager = new CoreStateManager()
  })

  describe('constructor', () => {
    it('should initialize gameState with default values', () => {
      const gameState = stateManager.getGameState()
      expect(gameState).toEqual({
        isInitialized: false,
        autoUpdateEnabled: false,
        lastUpdate: expect.any(Number),
        time: 0,
        entitiesCount: 0,
        alertsCount: 0
      })
    })

    it('should initialize selectionState', () => {
      const selectionState = stateManager.getSelectionState()
      expect(selectionState.selectedEntityIds).toBeInstanceOf(Set)
      expect(selectionState.selectedEntityIds.size).toBe(0)
    })

    it('should initialize entityState', () => {
      const entityState = stateManager.getEntityState()
      expect(entityState.entities).toBeInstanceOf(Map)
      expect(entityState.bases).toBeInstanceOf(Map)
    })

    it('should initialize displayState', () => {
      const displayState = stateManager.getDisplayState()
      expect(displayState).toEqual({
        statusMessage: 'Ready to initialize...',
        entityInfo: null,
        targetIndicator: null
      })
    })
  })

  describe('updateGameState', () => {
    it('should update gameState properties', () => {
      stateManager.updateGameState({ isInitialized: true, entitiesCount: 5 })
      const gameState = stateManager.getGameState()
      expect(gameState.isInitialized).toBe(true)
      expect(gameState.entitiesCount).toBe(5)
    })

    it('should preserve unchanged properties', () => {
      stateManager.updateGameState({ isInitialized: true })
      const gameState = stateManager.getGameState()
      expect(gameState.autoUpdateEnabled).toBe(false) // Unchanged
    })

    it('should emit gameStateUpdated event', () => {
      const handler = vi.fn()
      stateManager.on('gameStateUpdated', handler)
      
      stateManager.updateGameState({ isInitialized: true })
      
      expect(handler).toHaveBeenCalledWith({ isInitialized: true, autoUpdateEnabled: false, lastUpdate: expect.any(Number), time: 0, entitiesCount: 0, alertsCount: 0 })
    })
  })

  describe('updateSelectionState', () => {
    it('should add selected entities to Set', () => {
      stateManager.updateSelectionState([1, 2, 3])
      
      const selectionState = stateManager.getSelectionState()
      expect(selectionState.selectedEntityIds).toEqual(new Set([1, 2, 3]))
    })

    it('should remove entities when provided removedIds', () => {
      stateManager.updateSelectionState([1, 2, 3])
      stateManager.updateSelectionState([], [2])
      
      const selectionState = stateManager.getSelectionState()
      expect(selectionState.selectedEntityIds).toEqual(new Set([1, 3]))
    })

    it('should emit selectionUpdated event with copied data', () => {
      const handler = vi.fn()
      stateManager.on('selectionUpdated', handler)
      
      stateManager.updateSelectionState([1, 2])
      
      const eventData = handler.mock.calls[0][0]
      expect(eventData.selectedEntityIds).toBeInstanceOf(Set)
      
      // Verify it's a copy (modifying original won't affect stored state)
      const selectionStateBefore = stateManager.getSelectionState()
      selectionStateBefore.selectedEntityIds.add(999)
      
      const selectionStateAfter = stateManager.getSelectionState()
      expect(selectionStateAfter.selectedEntityIds).not.toContain(999)
    })
  })

  describe('updateEntityState', () => {
    it('should replace all entities', () => {
      const entities = [
        { id: 1, name: 'Entity 1' },
        { id: 2, name: 'Entity 2' }
      ]
      
      stateManager.updateEntityState(entities)
      
      const entityState = stateManager.getEntityState()
      expect(entityState.entities.size).toBe(2)
      expect(entityState.entities.get(1)).toEqual({ id: 1, name: 'Entity 1' })
    })

    it('should emit entitiesUpdated event', () => {
      const handler = vi.fn()
      stateManager.on('entitiesUpdated', handler)
      
      const entities = [{ id: 1 }]
      stateManager.updateEntityState(entities)
      
      expect(handler).toHaveBeenCalledWith(expect.any(Map))
    })
  })

  describe('updateEntityStateEntry', () => {
    it('should add or update a single entity', () => {
      stateManager.updateEntityStateEntry({ id: 1, name: 'Entity 1' })
      stateManager.updateEntityStateEntry({ id: 2, name: 'Entity 2' })
      
      const entityState = stateManager.getEntityState()
      expect(entityState.entities.size).toBe(2)
    })

    it('should update existing entity', () => {
      stateManager.updateEntityStateEntry({ id: 1, name: 'Entity 1' })
      stateManager.updateEntityStateEntry({ id: 1, name: 'Updated Entity' })
      
      const entityState = stateManager.getEntityState()
      expect(entityState.entities.get(1).name).toBe('Updated Entity')
    })
  })

  describe('updateDisplayState', () => {
    it('should update displayState properties', () => {
      stateManager.updateDisplayState({ statusMessage: 'New message' })
      const displayState = stateManager.getDisplayState()
      expect(displayState.statusMessage).toBe('New message')
    })

    it('should emit displayUpdated event', () => {
      const handler = vi.fn()
      stateManager.on('displayUpdated', handler)
      
      stateManager.updateDisplayState({ statusMessage: 'Updated' })
      
      expect(handler).toHaveBeenCalledWith({ statusMessage: 'Updated', entityInfo: null, targetIndicator: null })
    })
  })

  describe('getGameState', () => {
    it('should return a copy of gameState', () => {
      const gameState1 = stateManager.getGameState()
      gameState1.isInitialized = true
      
      const gameState2 = stateManager.getGameState()
      expect(gameState2.isInitialized).toBe(false)
    })
  })

  describe('getSelectionState', () => {
    it('should return a copy of selectionState with copied Set', () => {
      const state1 = stateManager.getSelectionState()
      state1.selectedEntityIds.add(1)
      
      const state2 = stateManager.getSelectionState()
      expect(state2.selectedEntityIds).not.toContain(1)
    })
  })

  describe('getEntityState', () => {
    it('should return a copy of entityState with copied Maps', () => {
      const state1 = stateManager.getEntityState()
      state1.entities.set(999, { id: 999 })
      
      const state2 = stateManager.getEntityState()
      expect(state2.entities.has(999)).toBe(false)
    })
  })

  describe('getDisplayState', () => {
    it('should return a copy of displayState', () => {
      const displayState1 = stateManager.getDisplayState()
      displayState1.statusMessage = 'Modified'
      
      const displayState2 = stateManager.getDisplayState()
      expect(displayState2.statusMessage).toBe('Ready to initialize...')
    })
  })

  describe('on/emit', () => {
    it('should register and emit event handlers', () => {
      const handler = vi.fn()
      stateManager.on('testEvent', handler)
      
      stateManager.emit('testEvent', { data: 'test' })
      
      expect(handler).toHaveBeenCalledWith({ data: 'test' })
    })

    it('should handle multiple handlers for same event', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      stateManager.on('testEvent', handler1)
      stateManager.on('testEvent', handler2)
      
      stateManager.emit('testEvent', null)
      
      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })

    it('should handle multiple event types', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      stateManager.on('event1', handler1)
      stateManager.on('event2', handler2)
      
      stateManager.emit('event1', null)
      stateManager.emit('event2', null)
      
      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })

  describe('off', () => {
    it('should remove event handler', () => {
      const handler = vi.fn()
      stateManager.on('testEvent', handler)
      stateManager.off('testEvent', handler)
      
      stateManager.emit('testEvent', null)
      expect(handler).not.toHaveBeenCalled()
    })

    it('should not affect other handlers', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      stateManager.on('testEvent', handler1)
      stateManager.on('testEvent', handler2)
      stateManager.off('testEvent', handler1)
      
      stateManager.emit('testEvent', null)
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })

  describe('reset', () => {
    it('should reset all state properties', () => {
      // Modify state
      stateManager.updateGameState({ isInitialized: true, entitiesCount: 5 })
      stateManager.updateSelectionState([1, 2, 3])
      stateManager.updateEntityState([{ id: 1 }])
      stateManager.updateDisplayState({ statusMessage: 'Modified' })
      
      // Reset
      stateManager.reset()
      
      // Verify reset
      const gameState = stateManager.getGameState()
      expect(gameState.isInitialized).toBe(false)
      expect(gameState.entitiesCount).toBe(0)
      
      const selectionState = stateManager.getSelectionState()
      expect(selectionState.selectedEntityIds.size).toBe(0)
      
      const entityState = stateManager.getEntityState()
      expect(entityState.entities.size).toBe(0)
      
      const displayState = stateManager.getDisplayState()
      expect(displayState.statusMessage).toBe('Ready to initialize...')
    })

    it('should emit stateReset event', () => {
      const handler = vi.fn()
      stateManager.on('stateReset', handler)
      
      stateManager.reset()
      
      expect(handler).toHaveBeenCalledWith({})
    })
  })
})
