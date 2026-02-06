/* eslint-env jest */
/**
 * Tests for selection-indicator.js
 */
jest.mock('./game-config.js', () => ({
  GAME_CONFIG: {
    COLORS: {
      selection: {
        player: 0x0080FF,
        enemy: 0xFF0000
      }
    }
  }
}))

// Mock PIXI
jest.mock('./__mocks__/PIXI.js', () => ({
  Graphics: jest.fn(() => ({
    children: [],
    alpha: 1,
    x: 0,
    y: 0,
    lineStyle () { return this },
    drawCircle () { return this },
    moveTo () { return this },
    lineTo () { return this },
    clear () { return this },
    beginFill () { return this },
    endFill () { return this },
    addChild (child) { this.children.push(child); return child },
    addChildAt (child, index) { this.children.splice(index, 0, child); return child },
    removeChild (child) {
      const idx = this.children.indexOf(child)
      if (idx > -1) this.children.splice(idx, 1)
    }
  }))
}))

const { SelectionIndicatorManager } = require('./selection-indicator.js')

describe('SelectionIndicatorManager', () => {
  let gameDemo
  let selectionIndicatorManager

  beforeEach(() => {
    gameDemo = {
      entities: new Map(),
      stateManager: {
        getSelectionState: jest.fn(() => ({ selectedEntityIds: new Set() }))
      },
      app: {
        stage: {
          children: [],
          addChild (child) { this.children.push(child) },
          removeChild (child) {
            const idx = this.children.indexOf(child)
            if (idx > -1) this.children.splice(idx, 1)
          }
        }
      }
    }
    selectionIndicatorManager = new SelectionIndicatorManager(gameDemo)
  })

  describe('createSelectionIndicator', () => {
    it('should create indicator for player entity', () => {
      const entity = { container: { children: [], addChild: jest.fn() } }
      selectionIndicatorManager.createSelectionIndicator(entity, false)

      expect(entity.selectionIndicator).toBeDefined()
      expect(entity.container.addChild).toHaveBeenCalled()
    })

    it('should create indicator for enemy entity', () => {
      const entity = { container: { children: [], addChild: jest.fn() } }
      selectionIndicatorManager.createSelectionIndicator(entity, true)

      expect(entity.selectionIndicator).toBeDefined()
    })
  })

  describe('removeSelectionIndicator', () => {
    it('should remove indicator from entity container', () => {
      const entity = {
        container: { children: [], removeChild: jest.fn() },
        selectionIndicator: {}
      }
      entity.container.children.push(entity.selectionIndicator)

      selectionIndicatorManager.removeSelectionIndicator(entity)

      expect(entity.selectionIndicator).toBeNull()
      expect(entity.container.removeChild).toHaveBeenCalled()
    })

    it('should not throw when entity is null', () => {
      expect(() => {
        selectionIndicatorManager.removeSelectionIndicator(null)
      }).not.toThrow()
    })

    it('should not throw when entity has no selectionIndicator', () => {
      const entity = { container: { children: [], removeChild: jest.fn() } }

      expect(() => {
        selectionIndicatorManager.removeSelectionIndicator(entity)
      }).not.toThrow()
    })
  })

  describe('updateSelectionIndicators', () => {
    it('should add indicators for selected entities', () => {
      const entity1 = {
        container: { children: [], addChild: jest.fn() },
        fraction: 'Player',
        entityType: 'vehicle'
      }
      gameDemo.entities.set(1, entity1)

      const selectedIds = new Set([1])
      selectionIndicatorManager.updateSelectionIndicators(selectedIds)

      expect(entity1.selectionIndicator).toBeDefined()
    })

    it('should remove indicators for deselected entities', () => {
      const entity = {
        container: { children: [], removeChild: jest.fn() },
        fraction: 'Player',
        entityType: 'vehicle',
        selectionIndicator: {}
      }
      gameDemo.entities.set(1, entity)

      const selectedIds = new Set()
      selectionIndicatorManager.updateSelectionIndicators(selectedIds)

      expect(entity.selectionIndicator).toBeNull()
    })
  })

  describe('validateAndFixSelectionState', () => {
    it('should detect entity in selection but not in entities map', () => {
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({ selectedEntityIds: new Set([999]) }))
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      selectionIndicatorManager.validateAndFixSelectionState()

      expect(consoleWarnSpy).toHaveBeenCalled()
      consoleWarnSpy.mockRestore()
    })

    it('should detect entity selected but no visual indicator', () => {
      const entity = {
        container: { children: [], addChild: jest.fn() },
        fraction: 'Player',
        entityType: 'vehicle'
      }
      gameDemo.entities.set(1, entity)
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({ selectedEntityIds: new Set([1]) }))

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      selectionIndicatorManager.validateAndFixSelectionState()

      expect(consoleWarnSpy).toHaveBeenCalled()
      consoleWarnSpy.mockRestore()
    })

    it('should detect entity with indicator but not in selection', () => {
      const entity = {
        container: { children: [], removeChild: jest.fn() },
        fraction: 'Player',
        entityType: 'vehicle',
        selectionIndicator: {}
      }
      gameDemo.entities.set(1, entity)
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({ selectedEntityIds: new Set() }))

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      selectionIndicatorManager.validateAndFixSelectionState()

      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(entity.selectionIndicator).toBeNull()
      consoleWarnSpy.mockRestore()
    })

    it('should not warn when state is consistent', () => {
      const entity = {
        container: { children: [], addChild: jest.fn() },
        fraction: 'Player',
        entityType: 'vehicle',
        selectionIndicator: {}
      }
      gameDemo.entities.set(1, entity)
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({ selectedEntityIds: new Set([1]) }))

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      selectionIndicatorManager.validateAndFixSelectionState()

      expect(consoleWarnSpy).not.toHaveBeenCalled()
      consoleWarnSpy.mockRestore()
    })
  })
})
