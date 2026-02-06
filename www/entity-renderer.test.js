/* eslint-env jest */
/**
 * Tests for entity-renderer.js
 */
jest.mock('./game-config.js', () => ({
  GAME_CONFIG: {
    WORLD_SIZE: { width: 800, height: 600 },
    ENTITY_SIZES: { scout: 8, tank: { width: 20, height: 16 }, transport: { width: 24, height: 20 }, base: { width: 30, height: 30 }, alert: { hidden: 8, revealed: 12 } },
    COLORS: {
      player: { scout: 0x4CAF50, tank: 0xFF5722, transport: 0x2196F3 },
      enemy: { scout: 0x2E7D32, tank: 0xB71C1C, transport: 0x0D47A1 },
      wild: { scout: 0x8D6E63, tank: 0x8D6E63, transport: 0x8D6E63 },
      neutral: { scout: 0x00BCD4, tank: 0x00BCD4, transport: 0x00BCD4 },
      base: 0x2196F3,
      alert: 0xB8860B,
      selection: { player: 0x0080FF, enemy: 0xFF0000 }
    },
    DISTANCES: { clickTolerance: 20, alertClickRadius: 15, baseUnitRadius: 50, combatRange: 20, alertRevealRange: 25 },
    LIMITS: { maxGroupSize: 12, dragThreshold: 5 },
    UI: { fontSize: { label: 10, damage: 14 }, indicatorSize: 12, targetIndicatorSize: 10, explosionScale: 3.0, healthBarLength: 10 },
    VISIBILITY: { range: 200, sameTypeUnitRadius: 200 },
    TIMEOUTS: { targetIndicator: 2000, alertHighlight: 3000 }
  }
}))

const { EntityRenderer } = require('./entity-renderer.js')

describe('EntityRenderer', () => {
  let gameDemo
  let entityRenderer

  beforeEach(() => {
    gameDemo = {
      app: {
        screen: { width: 800, height: 600 },
        view: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
        stage: {
          children: [],
          addChild(child) { this.children.push(child) },
          removeChild(child) {
            const idx = this.children.indexOf(child)
            if (idx > -1) this.children.splice(idx, 1)
          }
        }
      },
      entities: new Map()
    }

    // Mock CoordinateService
    jest.mock('./coordinate-service.js', () => ({
      CoordinateService: jest.fn().mockImplementation(() => ({
        gameToScreen: jest.fn((x, y) => ({ x: x * 2, y: y * 2 })),
        getScreenCoords: jest.fn((x, y) => ({ x: x * 2, y: y * 2 }))
      }))
    }))

    entityRenderer = new EntityRenderer(gameDemo)
  })

  describe('updateEntityPosition', () => {
    it('should update entity position when entity exists', () => {
      const container = { x: 0, y: 0, addChild: jest.fn(), removeChild: jest.fn() }
      const entity = { container, x: 0, y: 0, gameX: 0, gameY: 0 }
      gameDemo.entities.set(1, entity)

      entityRenderer.updateEntityPosition(1, 100, 200)

      expect(entity.gameX).toBe(100)
      expect(entity.gameY).toBe(200)
    })

    it('should not update when entity does not exist', () => {
      const container = { x: 0, y: 0, addChild: jest.fn(), removeChild: jest.fn() }
      const entity = { container, x: 0, y: 0, gameX: 0, gameY: 0 }
      gameDemo.entities.set(1, entity)

      entityRenderer.updateEntityPosition(999, 100, 200)

      expect(entity.gameX).toBe(0)
    })
  })

  describe('findEntityAtPosition', () => {
    it('should find closest entity within tolerance', () => {
      const container = { x: 400, y: 300, addChild: jest.fn(), removeChild: jest.fn() }
      gameDemo.entities.set(1, { container, gameX: 400, gameY: 300 })

      const foundId = entityRenderer.findEntityAtPosition(400, 300)

      expect(foundId).toBe(1)
    })

    it('should return null when entity is outside tolerance', () => {
      const container = { x: 400, y: 300, addChild: jest.fn(), removeChild: jest.fn() }
      gameDemo.entities.set(1, { container, gameX: 400, gameY: 300 })

      const foundId = entityRenderer.findEntityAtPosition(0, 0)

      expect(foundId).toBeNull()
    })
  })

  describe('showTargetIndicator', () => {
    it('should create target indicator at screen position', () => {
      entityRenderer.showTargetIndicator(100, 200)

      expect(entityRenderer.targetIndicator).toBeDefined()
    })

    it('should clear existing timeout before creating new one', () => {
      jest.useFakeTimers()
      entityRenderer.showTargetIndicator(100, 200)
      entityRenderer.showTargetIndicator(150, 250)

      expect(setTimeout).toHaveBeenCalledTimes(2)
      jest.useRealTimers()
    })
  })

  describe('clearTargetIndicator', () => {
    it('should clear timeout and remove indicator', () => {
      const indicator = { children: [], addChild: jest.fn(), removeChild: jest.fn() }
      entityRenderer.targetIndicator = indicator
      gameDemo.app.stage.addChild(indicator)

      entityRenderer.clearTargetIndicator()

      expect(entityRenderer.targetIndicator).toBeNull()
      expect(gameDemo.app.stage.children.includes(indicator)).toBe(false)
    })
  })
})
