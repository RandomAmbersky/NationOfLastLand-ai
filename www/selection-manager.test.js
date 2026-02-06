import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SelectionManager } from './selection-manager.js'

// Mock WASM imports
vi.mock('./wasm-imports.js', () => ({
  select_entity: vi.fn(),
  deselect_entity: vi.fn(),
  clear_selection: vi.fn(),
  handle_entity_selection: vi.fn(),
  get_entity_info: vi.fn()
}))

// Mock dependencies
vi.mock('./game-config.js', () => ({
  GAME_CONFIG: {
    LIMITS: { maxGroupSize: 5 },
    COLORS: { alert: 0xFF0000 },
    TIMEOUTS: { targetIndicator: 3000 },
    WORLD_SIZE: { width: 1000, height: 800 }
  }
}))

vi.mock('./utils.js', () => ({
  calculateDistance: vi.fn((x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2))
}))

// Mock selection indicator
const mockSelectionIndicatorManager = {
  updateSelectionIndicators: vi.fn(),
  removeSelectionIndicator: vi.fn(),
  createSelectionIndicator: vi.fn()
}

// Mock entity renderer
const mockEntityRenderer = {
  alertHighlight: null,
  showTargetIndicator: vi.fn(),
  clearTargetIndicator: vi.fn()
}

describe('SelectionManager', () => {
  let gameDemo
  let selectionManager

  beforeEach(() => {
    vi.clearAllMocks()

    gameDemo = {
      stateManager: {
        getEntityState: vi.fn(() => ({
          entities: new Map()
        })),
        getSelectionState: vi.fn(() => ({
          selectedEntityIds: new Set()
        }))
      },
      entityRenderer: mockEntityRenderer,
      app: {
        stage: {
          removeChild: vi.fn()
        }
      },
      entities: new Map(),
      updateStatus: vi.fn(),
      updateEntityInfo: vi.fn(),
      updateSpawnButtonState: vi.fn(),
      createEntityInfoText: vi.fn(() => 'Entity info')
    }

    // Use spy to replace the real classes
    vi.spyOn(require('./selection-indicator.js'), 'SelectionIndicatorManager')
      .mockImplementation(() => mockSelectionIndicatorManager)

    vi.spyOn(require('./entity-service.js'), 'EntityService')
      .mockImplementation(() => ({
        findPlayerBase: vi.fn(),
        isPlayerBaseSelected: vi.fn()
      }))

    selectionManager = new SelectionManager(gameDemo)
  })

  describe('handleEntityClick', () => {
    it('should handle successful entity selection', async () => {
      const entity = { id: 1, fraction: 'Player' }
      gameDemo.stateManager.getEntityState = vi.fn(() => ({
        entities: new Map([[1, entity]])
      }))
      
      vi.mocked(require('./wasm-imports.js').handle_entity_selection)
        .mockReturnValue(JSON.stringify({
          success: true,
          action: 'EntitySelected',
          selected_entities: [1],
          message: 'Entity selected'
        }))

      await selectionManager.handleEntityClick(1, false, null)

      expect(gameDemo.updateStatus).toHaveBeenCalledWith('Entity selected')
    })

    it('should handle entity deselection', async () => {
      const entity = { id: 1, fraction: 'Player' }
      gameDemo.stateManager.getEntityState = vi.fn(() => ({
        entities: new Map([[1, entity]])
      }))
      
      vi.mocked(require('./wasm-imports.js').handle_entity_selection)
        .mockReturnValue(JSON.stringify({
          success: true,
          action: 'EntityDeselected',
          selected_entities: [],
          message: 'Entity deselected'
        }))

      await selectionManager.handleEntityClick(1, false, null)

      expect(gameDemo.updateEntityInfo).toHaveBeenCalledWith(null)
    })

    it('should update spawn button state after selection', async () => {
      const entity = { id: 1, fraction: 'Player' }
      gameDemo.stateManager.getEntityState = vi.fn(() => ({
        entities: new Map([[1, entity]])
      }))
      
      vi.mocked(require('./wasm-imports.js').handle_entity_selection)
        .mockReturnValue(JSON.stringify({
          success: true,
          action: 'EntitySelected',
          selected_entities: [1],
          message: 'Selected'
        }))

      await selectionManager.handleEntityClick(1, false, null)

      expect(gameDemo.updateSpawnButtonState).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      gameDemo.stateManager.getEntityState = vi.fn(() => ({
        entities: new Map()
      }))

      // Should not throw even when entity doesn't exist
      await expect(selectionManager.handleEntityClick(999, false, null)).resolves.not.toThrow()
    })
  })

  describe('selectEntity', () => {
    it('should select an entity successfully', async () => {
      const entity = { id: 1, fraction: 'Player', entityType: 'vehicle' }
      gameDemo.stateManager.getEntityState = vi.fn(() => ({
        entities: new Map([[1, entity]])
      }))
      
      gameDemo.stateManager.getSelectionState = vi.fn(() => ({
        selectedEntityIds: new Set()
      }))

      vi.mocked(require('./wasm-imports.js').handle_entity_selection)
        .mockReturnValue(JSON.stringify({
          success: true,
          action: 'EntitySelected',
          selected_entities: [1],
          message: 'Selected'
        }))

      const result = await selectionManager.selectEntity(1, false, true)

      expect(result).toBe(true)
    })

    it('should return false when selection fails', async () => {
      const entity = { id: 1, fraction: 'Player', entityType: 'vehicle' }
      gameDemo.stateManager.getEntityState = vi.fn(() => ({
        entities: new Map([[1, entity]])
      }))
      
      gameDemo.stateManager.getSelectionState = vi.fn(() => ({
        selectedEntityIds: new Set()
      }))

      vi.mocked(require('./wasm-imports.js').handle_entity_selection)
        .mockReturnValue(JSON.stringify({
          success: false,
          message: 'Failed to select'
        }))

      const result = await selectionManager.selectEntity(1, false, true)

      expect(result).toBe(false)
    })

    it('should return false if already selecting', async () => {
      selectionManager.isSelecting = true
      
      const result = await selectionManager.selectEntity(1, false, true)
      
      expect(result).toBe(false)
    })

    it('should not select if max group size reached', async () => {
      gameDemo.stateManager.getSelectionState = vi.fn(() => ({
        selectedEntityIds: new Set([1, 2, 3, 4, 5]) // Already at max
      }))
      
      const result = selectionManager.selectEntity(6, true, false)
      
      expect(result).toBe(false)
    })
  })

  describe('deselectEntity', () => {
    it('should deselect an entity', () => {
      const entity = { id: 1, selectionIndicator: {} }
      gameDemo.stateManager.getSelectionState = vi.fn(() => ({
        selectedEntityIds: new Set([1])
      }))
      gameDemo.stateManager.getEntityState = vi.fn(() => ({
        entities: new Map([[1, entity]])
      }))

      selectionManager.deselectEntity(1)

      const state = gameDemo.stateManager.getSelectionState()
      expect(state.selectedEntityIds).not.toContain(1)
    })

    it('should remove selection indicator', () => {
      const entity = { id: 1, selectionIndicator: {} }
      gameDemo.stateManager.getSelectionState = vi.fn(() => ({
        selectedEntityIds: new Set([1])
      }))
      gameDemo.stateManager.getEntityState = vi.fn(() => ({
        entities: new Map([[1, entity]])
      }))

      selectionManager.deselectEntity(1)

      expect(mockSelectionIndicatorManager.removeSelectionIndicator).toHaveBeenCalledWith(entity)
    })
  })

  describe('clearAllSelections', () => {
    it('should clear all selections', async () => {
      gameDemo.stateManager.getSelectionState = vi.fn(() => ({
        selectedEntityIds: new Set([1, 2, 3])
      }))

      gameDemo.entities = new Map([
        [1, { selectionIndicator: {} }],
        [2, { selectionIndicator: {} }],
        [3, { selectionIndicator: {} }]
      ])

      vi.mocked(require('./wasm-imports.js').clear_selection)
        .mockReturnValue(JSON.stringify({ success: true }))

      await selectionManager.clearAllSelections()

      expect(gameDemo.stateManager.getSelectionState().selectedEntityIds.size).toBe(0)
    })

    it('should update status message', async () => {
      gameDemo.stateManager.getSelectionState = vi.fn(() => ({
        selectedEntityIds: new Set([1])
      }))

      vi.mocked(require('./wasm-imports.js').clear_selection)
        .mockReturnValue(JSON.stringify({ success: true }))

      await selectionManager.clearAllSelections()

      expect(gameDemo.updateStatus).toHaveBeenCalledWith('Выделение снято.')
    })

    it('should update spawn button state', async () => {
      gameDemo.stateManager.getSelectionState = vi.fn(() => ({
        selectedEntityIds: new Set([1])
      }))

      vi.mocked(require('./wasm-imports.js').clear_selection)
        .mockReturnValue(JSON.stringify({ success: true }))

      await selectionManager.clearAllSelections()

      expect(gameDemo.updateSpawnButtonState).toHaveBeenCalled()
    })
  })

  describe('isPlayerBaseSelected', () => {
    it('should return true when player base is selected', () => {
      const base = { id: 1, entityType: 'base', fraction: 'Player' }
      gameDemo.stateManager.getSelectionState = vi.fn(() => ({
        selectedEntityIds: new Set([1])
      }))
      gameDemo.stateManager.getEntityState = vi.fn(() => ({
        entities: new Map([[1, base]])
      }))

      const result = selectionManager.isPlayerBaseSelected()

      expect(result).toBe(true)
    })

    it('should return false when player vehicle is selected', () => {
      const vehicle = { id: 1, entityType: 'vehicle', fraction: 'Player' }
      gameDemo.stateManager.getSelectionState = vi.fn(() => ({
        selectedEntityIds: new Set([1])
      }))
      gameDemo.stateManager.getEntityState = vi.fn(() => ({
        entities: new Map([[1, vehicle]])
      }))

      const result = selectionManager.isPlayerBaseSelected()

      expect(result).toBe(false)
    })
  })

  describe('selectSameTypeUnits', () => {
    it('should select units of same type for player', () => {
      const entities = new Map([
        [1, { id: 1, vehicleType: 'scout', fraction: 'Player', entityType: 'vehicle' }],
        [2, { id: 2, vehicleType: 'scout', fraction: 'Player', entityType: 'vehicle' }],
        [3, { id: 3, vehicleType: 'tank', fraction: 'Player', entityType: 'vehicle' }]
      ])
      
      gameDemo.stateManager.getEntityState = vi.fn(() => ({ entities }))
      gameDemo.stateManager.getSelectionState = vi.fn(() => ({
        selectedEntityIds: new Set()
      }))

      const selectEntityMock = vi.fn(() => true)
      selectionManager.selectEntity = selectEntityMock

      selectionManager.selectSameTypeUnits(1)

      // Should select at least 2 scout units
      expect(selectEntityMock).toHaveBeenCalled()
    })

    it('should just select the entity for non-player units', () => {
      const entities = new Map([
        [1, { id: 1, vehicleType: 'scout', fraction: 'Enemy', entityType: 'vehicle' }]
      ])
      
      gameDemo.stateManager.getEntityState = vi.fn(() => ({ entities }))
      gameDemo.stateManager.getSelectionState = vi.fn(() => ({
        selectedEntityIds: new Set()
      }))

      const clearAllMock = vi.fn()
      const selectMock = vi.fn(() => true)
      selectionManager.clearAllSelections = clearAllMock
      selectionManager.selectEntity = selectMock

      selectionManager.selectSameTypeUnits(1)

      expect(clearAllMock).toHaveBeenCalled()
      expect(selectMock).toHaveBeenCalledWith(1, true, true)
    })
  })

  describe('selectAllPlayerUnitsAtBase', () => {
    it('should select base and nearby player units', () => {
      const baseEntity = { id: 1, gameX: 0, gameY: 0, fraction: 'Player', entityType: 'base' }
      const unit1 = { id: 2, gameX: 10, gameY: 10, fraction: 'Player', entityType: 'vehicle' }
      const unit2 = { id: 3, gameX: 50, gameY: 50, fraction: 'Player', entityType: 'vehicle' }
      const enemyUnit = { id: 4, gameX: 5, gameY: 5, fraction: 'Enemy', entityType: 'vehicle' }
      
      const entities = new Map([
        [1, baseEntity],
        [2, unit1],
        [3, unit2],
        [4, enemyUnit]
      ])
      
      gameDemo.stateManager.getEntityState = vi.fn(() => ({ entities }))
      
      const findPlayerBaseMock = vi.fn(() => baseEntity)
      selectionManager.entityService.findPlayerBase = findPlayerBaseMock

      const clearAllMock = vi.fn()
      const selectMock = vi.fn(() => true)
      selectionManager.clearAllSelections = clearAllMock
      selectionManager.selectEntity = selectMock

      selectionManager.selectAllPlayerUnitsAtBase()

      expect(clearAllMock).toHaveBeenCalled()
      // Should select base and unit1 (within range), but not unit2 (too far) or enemyUnit
      expect(selectMock).toHaveBeenCalledTimes(2)
    })
  })
})
