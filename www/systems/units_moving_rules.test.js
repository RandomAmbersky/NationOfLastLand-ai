/**
 * Tests for units_moving_rules.md — проверка правил выделения и движения юнитов.
 * Использует реальный SelectionSystem (с моками только для config и SelectionIndicator).
 */

jest.mock('../config/game-config.js', () => ({
  GAME_CONFIG: {
    LIMITS: { maxGroupSize: 10, dragThreshold: 5 },
    WORLD_SIZE: { width: 800, height: 600 }
  }
}))

jest.mock('../services/SelectionIndicator.js', () => ({
  SelectionIndicator: class {
    updateIndicators () {}
    destroy () {}
    setTransformer () {}
  }
}))

import { SelectionSystem } from './SelectionSystem.js'

function createGameEngine (entitiesMap, selectionsSet = new Set()) {
  const state = {
    get: jest.fn((key) => {
      if (key === 'entities') return entitiesMap
      if (key === 'selections') return selectionsSet
      return null
    }),
    merge: jest.fn(),
    emit: jest.fn()
  }
  return {
    state,
    transformer: null,
    rendererSystem: null
  }
}

function entity (overrides = {}) {
  return {
    entityType: 'vehicle',
    fraction: 'Player',
    gameX: 0,
    gameY: 0,
    ...overrides
  }
}

describe('units_moving_rules.md', () => {
  describe('Правило 2: ничего не выбрано — клик по юниту выбирает его', () => {
    it('добавляет юнит в selections при пустом выделении', () => {
      const entities = new Map([[1, entity({ id: 1 })]])
      const selections = new Set()
      const engine = createGameEngine(entities, selections)
      const system = new SelectionSystem(engine)
      system.selectionIndicator = { updateIndicators: jest.fn() }

      system.handleEntityClicked({ entityId: 1, isMultiSelect: false, gameX: 10, gameY: 20 })

      expect(selections.has(1)).toBe(true)
      expect(selections.size).toBe(1)
      expect(engine.state.merge).toHaveBeenCalled()
    })
  })

  describe('Правило 4: групповое выделение — только юниты игрока и только подвижные', () => {
    it('при прямоугольном выделении добавляет только подвижных игрока', () => {
      const entities = new Map([
        [1, entity({ id: 1, gameX: 50, gameY: 50 })],
        [2, entity({ id: 2, fraction: 'Hostile', gameX: 60, gameY: 60 })],
        [3, entity({ id: 3, entityType: 'base', fraction: 'Player', gameX: 70, gameY: 70 })]
      ])
      const selections = new Set()
      const engine = createGameEngine(entities, selections)
      const system = new SelectionSystem(engine)
      system.selectionIndicator = { updateIndicators: jest.fn() }
      system._getScale = () => ({ x: 1, y: 1 })
      // bounds в экранных координатах; при scale 1 gameX=50 попадает в rect 0,0,300,300
      const bounds = { x: 0, y: 0, width: 300, height: 300 }

      system.handleRectangleSelection({ bounds })

      expect(selections.has(1)).toBe(true)
      expect(selections.has(2)).toBe(false)
      expect(selections.has(3)).toBe(false)
    })

    it('при Shift+клик добавляет только подвижного юнита игрока', () => {
      const entities = new Map([
        [1, entity({ id: 1 })],
        [2, entity({ id: 2, fraction: 'Hostile' })]
      ])
      const selections = new Set([1])
      const engine = createGameEngine(entities, selections)
      const system = new SelectionSystem(engine)
      system.selectionIndicator = { updateIndicators: jest.fn() }

      system.handleEntityClicked({ entityId: 2, isMultiSelect: true, gameX: 0, gameY: 0 })

      expect(selections.has(2)).toBe(false)
      expect(selections.size).toBe(1)
    })
  })

  describe('Правило 5: чужой юнит не остаётся при групповом выделении', () => {
    it('при прямоугольном выделении сбрасывает врага из selections', () => {
      const entities = new Map([
        [1, entity({ id: 1, fraction: 'Hostile', gameX: 50, gameY: 50 })],
        [2, entity({ id: 2, gameX: 100, gameY: 100 })]
      ])
      const selections = new Set([1])
      const engine = createGameEngine(entities, selections)
      const system = new SelectionSystem(engine)
      system.selectionIndicator = { updateIndicators: jest.fn() }
      system._getScale = () => ({ x: 1, y: 1 })
      const bounds = { x: 0, y: 0, width: 300, height: 300 }

      system.handleRectangleSelection({ bounds })

      expect(selections.has(1)).toBe(false)
      expect(selections.has(2)).toBe(true)
    })
  })

  describe('Правило 6: подвижные игрока выбраны + клик по чужому → цель, выделение не сбрасывается', () => {
    it('эмитит groupTargetSet и не меняет selections', () => {
      const entities = new Map([
        [1, entity({ id: 1 })],
        [2, entity({ id: 2, fraction: 'Hostile' })]
      ])
      const selections = new Set([1])
      const engine = createGameEngine(entities, selections)
      const system = new SelectionSystem(engine)
      system.selectionIndicator = { updateIndicators: jest.fn() }

      system.handleEntityClicked({ entityId: 2, isMultiSelect: false, gameX: 100, gameY: 200 })

      expect(engine.state.emit).toHaveBeenCalledWith('groupTargetSet', {
        targetX: 100,
        targetY: 200,
        selections: [1]
      })
      expect(selections.has(1)).toBe(true)
      expect(selections.size).toBe(1)
    })
  })

  describe('Правило 7: неподвижный юнит игрока выбран + клик по другому → сброс и выбор нового', () => {
    it('сбрасывает выделение и выбирает кликнутого юнита', () => {
      const entities = new Map([
        [1, entity({ id: 1, entityType: 'base', fraction: 'Player' })],
        [2, entity({ id: 2 })]
      ])
      const selections = new Set([1])
      const engine = createGameEngine(entities, selections)
      const system = new SelectionSystem(engine)
      system.selectionIndicator = { updateIndicators: jest.fn() }

      system.handleEntityClicked({ entityId: 2, isMultiSelect: false, gameX: 0, gameY: 0 })

      expect(selections.has(1)).toBe(false)
      expect(selections.has(2)).toBe(true)
      expect(selections.size).toBe(1)
    })
  })

  describe('Правило 8: выбран чужой + клик по другому юниту → сброс и выбор нового', () => {
    it('сбрасывает первого и выбирает второго', () => {
      const entities = new Map([
        [1, entity({ id: 1, fraction: 'Hostile' })],
        [2, entity({ id: 2, fraction: 'Neutral' })]
      ])
      const selections = new Set([1])
      const engine = createGameEngine(entities, selections)
      const system = new SelectionSystem(engine)
      system.selectionIndicator = { updateIndicators: jest.fn() }

      system.handleEntityClicked({ entityId: 2, isMultiSelect: false, gameX: 0, gameY: 0 })

      expect(selections.has(1)).toBe(false)
      expect(selections.has(2)).toBe(true)
      expect(selections.size).toBe(1)
    })
  })

  describe('Правило 9: ПКМ по пустому месту — сброс выделения', () => {
    it('handleSelectionCleared очищает selections', () => {
      const selections = new Set([1, 2])
      const engine = createGameEngine(new Map(), selections)
      const system = new SelectionSystem(engine)
      system.selectionIndicator = { updateIndicators: jest.fn() }

      system.handleSelectionCleared()

      expect(selections.size).toBe(0)
      expect(engine.state.merge).toHaveBeenCalled()
    })
  })

  describe('Правило 10: ПКМ по юниту — сброс выделения и выбор этого юнита', () => {
    it('handleEntitySelected очищает выделение и выбирает только кликнутого', () => {
      const entities = new Map([[1, entity({ id: 1 })], [2, entity({ id: 2 })]])
      const selections = new Set([2])
      const engine = createGameEngine(entities, selections)
      const system = new SelectionSystem(engine)
      system.selectionIndicator = { updateIndicators: jest.fn() }

      system.handleEntitySelected({ entityId: 1 })

      expect(selections.size).toBe(1)
      expect(selections.has(1)).toBe(true)
      expect(selections.has(2)).toBe(false)
      expect(engine.state.merge).toHaveBeenCalled()
    })
  })
})
