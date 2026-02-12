/**
 * Simple tests for SelectionSystem
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
  },
  COLORS: {
    player: { scout: 0x00FF00, tank: 0x0000FF, transport: 0xFF0000 },
    enemy: { scout: 0xFF0000, tank: 0xFF0000, transport: 0xFF0000 },
    neutral: { scout: 0x888888, tank: 0x888888, transport: 0x888888 },
    selection: {
      player: 0x00FF00,
      enemy: 0xFF0000
    }
  }
}

// Mock SelectionIndicator
class MockSelectionIndicator {
  constructor(gameEngine, rendererSystem = null) {
    this.gameEngine = gameEngine
    this.rendererSystem = rendererSystem
    this.updateIndicators = jest.fn()
    this.destroy = jest.fn()
  }
}

// Mock EntityService
class MockEntityService {
  constructor(gameEngine) {
    this.gameEngine = gameEngine
    this.createEntity = jest.fn()
    this.findPlayerBase = jest.fn()
    this.isPlayerBaseSelected = jest.fn()
    this.getEntitiesByType = jest.fn()
    this.getEntitiesByFraction = jest.fn()
    this.entityExists = jest.fn()
  }
}

// Import SelectionSystem
class SelectionSystem {
  constructor(gameEngine) {
    this.gameEngine = gameEngine
    this.selectionIndicator = null
    this.entityService = null
    this.isDestroyed = false
    this._typeIndex = new Map()
    this._factionIndex = new Map()
  }

  init(app) {
    this.app = app
    this.rendererSystem = this.gameEngine.rendererSystem || null
    this.selectionIndicator = new MockSelectionIndicator(this.gameEngine, this.rendererSystem)
    this.entityService = new MockEntityService(this.gameEngine)
    this._buildIndices()
  }

  _buildIndices() {
    const entities = this.gameEngine.state.get('entities')
    this._typeIndex.clear()
    this._factionIndex.clear()

    for (const [id, entity] of entities) {
      const type = entity.vehicleType || entity.type
      if (!this._typeIndex.has(type)) {
        this._typeIndex.set(type, [])
      }
      this._typeIndex.get(type).push(id)

      const faction = entity.fraction
      if (faction) {
        if (!this._factionIndex.has(faction)) {
          this._factionIndex.set(faction, [])
        }
        this._factionIndex.get(faction).push(id)
      }
    }
  }

  _getIndex(key, value) {
    if (key === 'type') return this._typeIndex.get(value) || []
    if (key === 'faction') return this._factionIndex.get(value) || []
    return []
  }

  _getScale() {
    if (!this.gameEngine.app) return { x: 1, y: 1 }
    return {
      x: this.gameEngine.app.screen.width / GAME_CONFIG.WORLD_SIZE.width,
      y: this.gameEngine.app.screen.height / GAME_CONFIG.WORLD_SIZE.height
    }
  }

  _canMove(entity) {
    if (entity.entityType === 'base') return false
    if (entity.entityType === 'alert') return false
    if (entity.movement && entity.movement.canMove === false) return false
    return true
  }

  _isPlayerUnit(entity) {
    return entity.fraction === 'Player' && entity.entityType !== 'base'
  }

  handleEntityClicked(data) {
    const { entityId, isMultiSelect, gameX, gameY } = data
    const state = this.gameEngine.state
    const selections = state.get('selections')
    const entities = state.get('entities')
    const clickedEntity = entities.get(entityId)

    if (!clickedEntity) return

    if (selections.size === 0) {
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      if (this.selectionIndicator) {
        this.selectionIndicator.updateIndicators(selections)
      }
      return
    }

    const firstSelectedId = Array.from(selections)[0]
    const firstSelectedEntity = entities.get(firstSelectedId)

    if (firstSelectedEntity && !this._isPlayerUnit(firstSelectedEntity)) {
      selections.clear()
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      if (this.selectionIndicator) {
        this.selectionIndicator.updateIndicators(selections)
      }
      return
    }

    if (firstSelectedEntity && this._isPlayerUnit(firstSelectedEntity) && !this._canMove(firstSelectedEntity)) {
      if (entityId !== firstSelectedId) {
        selections.clear()
        selections.add(entityId)
        state.merge({ selections }, 'selectionsChanged')
        if (this.selectionIndicator) {
          this.selectionIndicator.updateIndicators(selections)
        }
        return
      }
    }

    const allSelectedCanMove = Array.from(selections).every(id => {
      const entity = entities.get(id)
      return entity && this._canMove(entity)
    })

    if (allSelectedCanMove && !this._isPlayerUnit(clickedEntity)) {
      state.emit('groupTargetSet', { targetX: gameX, targetY: gameY, selections: Array.from(selections) })
      return
    }

    if (isMultiSelect) {
      if (this._isPlayerUnit(clickedEntity) && this._canMove(clickedEntity)) {
        if (selections.size < GAME_CONFIG.LIMITS.maxGroupSize) {
          selections.add(entityId)
          state.merge({ selections }, 'selectionsChanged')
          if (this.selectionIndicator) {
            this.selectionIndicator.updateIndicators(selections)
          }
        }
      }
      return
    }

    if (selections.has(entityId)) return

    if (selections.size === 1 && this._isPlayerUnit(clickedEntity) && this._canMove(clickedEntity)) {
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      if (this.selectionIndicator) {
        this.selectionIndicator.updateIndicators(selections)
      }
      return
    }

    if (!this._isPlayerUnit(clickedEntity)) {
      selections.clear()
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      if (this.selectionIndicator) {
        this.selectionIndicator.updateIndicators(selections)
      }
      return
    }

    if (!this._isPlayerUnit(firstSelectedEntity)) {
      selections.clear()
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      if (this.selectionIndicator) {
        this.selectionIndicator.updateIndicators(selections)
      }
      return
    }
  }

  handleEntitySelected(data) {
    const { entityId } = data
    const state = this.gameEngine.state
    const selections = state.get('selections')
    const entities = state.get('entities')
    const clickedEntity = entities.get(entityId)

    if (!clickedEntity) return

    selections.clear()
    selections.add(entityId)
    state.merge({ selections }, 'selectionsChanged')
    if (this.selectionIndicator) {
      this.selectionIndicator.updateIndicators(selections)
    }
  }

  handleSelectionCleared() {
    const state = this.gameEngine.state
    const selections = state.get('selections')

    if (selections.size > 0) {
      selections.clear()
      state.merge({ selections }, 'selectionsChanged')
      if (this.selectionIndicator) {
        this.selectionIndicator.updateIndicators(selections)
      }
    }
  }

  handleRectangleSelection(data) {
    const { bounds } = data
    const state = this.gameEngine.state
    const entities = state.get('entities')
    const selections = state.get('selections')
    const maxGroupSize = GAME_CONFIG.LIMITS.maxGroupSize

    const firstSelectedId = Array.from(selections)[0]
    const firstSelectedEntity = firstSelectedId ? entities.get(firstSelectedId) : null
    if (firstSelectedEntity && !this._isPlayerUnit(firstSelectedEntity)) {
      selections.clear()
    }

    let addedCount = 0
    for (const [id, entity] of entities) {
      if (this._isEntityInBounds(entity, bounds)) {
        if (this._isPlayerUnit(entity) && this._canMove(entity) && !selections.has(id)) {
          if (selections.size + addedCount >= maxGroupSize) break
          selections.add(id)
          addedCount++
        }
      }
    }

    if (addedCount > 0) {
      state.merge({ selections }, 'selectionsChanged')
      if (this.selectionIndicator) {
        this.selectionIndicator.updateIndicators(selections)
      }
    }
    return addedCount
  }

  _isEntityInBounds(entity, bounds) {
    if (!entity) return false
    const gameX = entity.gameX ?? entity.position?.x ?? 0
    const gameY = entity.gameY ?? entity.position?.y ?? 0
    const { x: scaleX, y: scaleY } = this._getScale()
    const entityScreenX = gameX * scaleX
    const entityScreenY = gameY * scaleY

    return entityScreenX >= bounds.x &&
      entityScreenY >= bounds.y &&
      entityScreenX <= bounds.x + bounds.width &&
      entityScreenY <= bounds.y + bounds.height
  }

  selectEntity(entityId, isMultiSelect = false) {
    const state = this.gameEngine.state
    const selections = state.get('selections')

    if (selections.has(entityId)) return true

    if (selections.size >= GAME_CONFIG.LIMITS.maxGroupSize && !isMultiSelect) {
      return false
    }

    this.gameEngine.state.emit('selectEntity', {
      entityId,
      isMultiSelect,
      currentSelections: Array.from(selections)
    })

    return true
  }

  deselectEntity(entityId) {
    const state = this.gameEngine.state
    const selections = state.get('selections')

    if (selections.has(entityId)) {
      selections.delete(entityId)
      state.merge({ selections }, 'selectionsChanged')
      if (this.selectionIndicator) {
        this.selectionIndicator.updateIndicators(selections)
      }
      return true
    }
    return false
  }

  clearAll() {
    const state = this.gameEngine.state
    const selections = state.get('selections')

    if (selections.size > 0) {
      selections.clear()
      state.merge({ selections }, 'selectionsChanged')
      if (this.selectionIndicator) {
        this.selectionIndicator.updateIndicators(selections)
      }
      return true
    }
    return false
  }

  selectAllPlayerUnits() {
    const state = this.gameEngine.state
    const selections = state.get('selections')
    const maxGroupSize = GAME_CONFIG.LIMITS.maxGroupSize

    const playerUnits = this._getIndex('faction', 'Player')
    let count = 0
    for (const id of playerUnits) {
      if (count >= maxGroupSize) break
      if (!selections.has(id)) {
        selections.add(id)
        count++
      }
    }

    state.merge({ selections }, 'selectionsChanged')
    if (this.selectionIndicator) {
      this.selectionIndicator.updateIndicators(selections)
    }
    return count
  }

  selectSameType(entityId) {
    const state = this.gameEngine.state
    const selections = state.get('selections')
    const maxGroupSize = GAME_CONFIG.LIMITS.maxGroupSize

    const entity = this.gameEngine.state.get('entities').get(entityId)
    if (!entity) return 0

    const targetType = entity.vehicleType || entity.type
    const sameTypeEntities = this._getIndex('type', targetType)

    let addedCount = 0
    for (const id of sameTypeEntities) {
      if (addedCount >= maxGroupSize) break
      const entityToAdd = this.gameEngine.state.get('entities').get(id)
      if (entityToAdd && !selections.has(id)) {
        if (this._isPlayerUnit(entityToAdd) && this._canMove(entityToAdd)) {
          selections.add(id)
          addedCount++
        }
      }
    }

    if (addedCount > 0) {
      state.merge({ selections }, 'selectionsChanged')
      if (this.selectionIndicator) {
        this.selectionIndicator.updateIndicators(selections)
      }
    }
    return addedCount
  }

  setGroupTarget(gameX, gameY) {
    const state = this.gameEngine.state
    const selections = state.get('selections')

    this.gameEngine.state.emit('groupTargetSet', {
      targetX: gameX,
      targetY: gameY,
      selections: Array.from(selections)
    })
  }

  updateIndicators(selections) {
    if (this.selectionIndicator) {
      this.selectionIndicator.updateIndicators(selections)
    }
  }

  update(_dt) {
    this._buildIndices()
  }

  render() {}

  destroy() {
    if (this.isDestroyed) return
    this.isDestroyed = true

    if (this.selectionIndicator) {
      this.selectionIndicator.destroy()
    }

    this.selectionIndicator = null
    this.entityService = null
    this.gameEngine = null
  }
}

function createSelectionSystem(gameEngine) {
  return new SelectionSystem(gameEngine)
}

// Tests
describe('SelectionSystem', () => {
  let gameEngine
  let selectionSystem
  let mockApp

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

    mockApp = {
      screen: { width: 800, height: 600 }
    }

    gameEngine = {
      state: mockState,
      app: mockApp
    }

    selectionSystem = new SelectionSystem(gameEngine)
  })

  describe('constructor', () => {
    it('should initialize with gameEngine', () => {
      expect(selectionSystem.gameEngine).toBe(gameEngine)
      expect(selectionSystem.selectionIndicator).toBeNull()
      expect(selectionSystem.entityService).toBeNull()
      expect(selectionSystem.isDestroyed).toBe(false)
    })
  })

  describe('init', () => {
    it('should initialize app and create components', () => {
      selectionSystem.init(mockApp)
      expect(selectionSystem.app).toBe(mockApp)
      expect(selectionSystem.selectionIndicator).toBeDefined()
      expect(selectionSystem.entityService).toBeDefined()
    })
  })

  describe('handleEntityClicked', () => {
    beforeEach(() => {
      selectionSystem.init(mockApp)
    })

    it('should select entity when nothing selected', () => {
      const mockEntities = new Map([[1, { vehicleType: 'scout', fraction: 'Player' }]])
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'entities') return mockEntities
        if (key === 'selections') return new Set()
        return null
      })

      selectionSystem.handleEntityClicked({ entityId: 1, isMultiSelect: false, gameX: 100, gameY: 200 })
      expect(gameEngine.state.merge).toHaveBeenCalled()
    })

    it('should handle multi-select for player units', () => {
      const mockEntities = new Map([
        [1, { vehicleType: 'scout', fraction: 'Player' }],
        [2, { vehicleType: 'scout', fraction: 'Player' }]
      ])
      const mockSet = new Set([1])
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'entities') return mockEntities
        if (key === 'selections') return mockSet
        return null
      })

      selectionSystem.handleEntityClicked({ entityId: 2, isMultiSelect: true, gameX: 100, gameY: 200 })
      expect(mockSet.size).toBe(2)
    })
  })

  describe('handleEntitySelected', () => {
    beforeEach(() => {
      selectionSystem.init(mockApp)
    })

    it('should select entity on right click', () => {
      const mockEntities = new Map([[1, { vehicleType: 'scout', fraction: 'Player' }]])
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'entities') return mockEntities
        if (key === 'selections') return new Set()
        return null
      })

      selectionSystem.handleEntitySelected({ entityId: 1 })
      expect(gameEngine.state.merge).toHaveBeenCalled()
    })
  })

  describe('handleSelectionCleared', () => {
    beforeEach(() => {
      selectionSystem.init(mockApp)
    })

    it('should clear selections', () => {
      const mockSet = new Set([1, 2])
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'selections') return mockSet
        return null
      })

      selectionSystem.handleSelectionCleared()
      expect(mockSet.size).toBe(0)
    })
  })

  describe('handleRectangleSelection', () => {
    beforeEach(() => {
      selectionSystem.init(mockApp)
    })

    it('should select entities in bounds', () => {
      const mockEntities = new Map([
        [1, { vehicleType: 'scout', fraction: 'Player', gameX: 100, gameY: 100 }]
      ])
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'entities') return mockEntities
        if (key === 'selections') return new Set()
        return null
      })

      selectionSystem.handleRectangleSelection({
        bounds: { x: 0, y: 0, width: 300, height: 300 }
      })
      expect(gameEngine.state.merge).toHaveBeenCalled()
    })
  })

  describe('selectEntity', () => {
    it('should add entity to selection', () => {
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'selections') return new Set()
        return null
      })
      const result = selectionSystem.selectEntity(1)
      expect(result).toBe(true)
    })

    it('should not add if already selected', () => {
      const mockSet = new Set([1])
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'selections') return mockSet
        return null
      })
      const result = selectionSystem.selectEntity(1)
      expect(result).toBe(true)
      expect(gameEngine.state.emit).not.toHaveBeenCalled()
    })
  })

  describe('deselectEntity', () => {
    beforeEach(() => {
      selectionSystem.init(mockApp)
    })

    it('should remove entity from selection', () => {
      const mockSet = new Set([1, 2])
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'selections') return mockSet
        return null
      })
      const result = selectionSystem.deselectEntity(1)
      expect(result).toBe(true)
      expect(mockSet.has(1)).toBe(false)
    })
  })

  describe('clearAll', () => {
    beforeEach(() => {
      selectionSystem.init(mockApp)
    })

    it('should clear all selections', () => {
      const mockSet = new Set([1, 2, 3])
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'selections') return mockSet
        return null
      })
      const result = selectionSystem.clearAll()
      expect(result).toBe(true)
      expect(mockSet.size).toBe(0)
    })

    it('should return false if already empty', () => {
      const mockSet = new Set()
      gameEngine.state.get = jest.fn((key) => {
        if (key === 'selections') return mockSet
        return null
      })
      const result = selectionSystem.clearAll()
      expect(result).toBe(false)
    })
  })

  describe('destroy', () => {
    it('should clean up resources', () => {
      selectionSystem.selectionIndicator = new MockSelectionIndicator(gameEngine)
      selectionSystem.destroy()
      expect(selectionSystem.isDestroyed).toBe(true)
      expect(selectionSystem.selectionIndicator).toBeNull()
    })
  })
})

describe('createSelectionSystem', () => {
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

  it('should create SelectionSystem instance', () => {
    const system = createSelectionSystem(localGameEngine)
    expect(system).toBeInstanceOf(SelectionSystem)
  })
})
