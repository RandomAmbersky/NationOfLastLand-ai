const { GAME_CONFIG } = require('./game-config.js')

describe('GAME_CONFIG', () => {
  describe('WORLD_SIZE', () => {
    it('should have correct width and height', () => {
      expect(GAME_CONFIG.WORLD_SIZE.width).toBe(800)
      expect(GAME_CONFIG.WORLD_SIZE.height).toBe(600)
    })
  })

  describe('ENTITY_SIZES', () => {
    it('should have scout size', () => {
      expect(GAME_CONFIG.ENTITY_SIZES.scout).toBe(8)
    })
    it('should have tank size', () => {
      expect(GAME_CONFIG.ENTITY_SIZES.tank.width).toBe(20)
      expect(GAME_CONFIG.ENTITY_SIZES.tank.height).toBe(16)
    })
    it('should have transport size', () => {
      expect(GAME_CONFIG.ENTITY_SIZES.transport.width).toBe(24)
      expect(GAME_CONFIG.ENTITY_SIZES.transport.height).toBe(20)
    })
    it('should have base size', () => {
      expect(GAME_CONFIG.ENTITY_SIZES.base.width).toBe(30)
      expect(GAME_CONFIG.ENTITY_SIZES.base.height).toBe(30)
    })
    it('should have alert sizes', () => {
      expect(GAME_CONFIG.ENTITY_SIZES.alert.hidden).toBe(8)
      expect(GAME_CONFIG.ENTITY_SIZES.alert.revealed).toBe(12)
    })
  })

  describe('COLORS', () => {
    it('should have player colors', () => {
      expect(GAME_CONFIG.COLORS.player.scout).toBe(0x4CAF50)
      expect(GAME_CONFIG.COLORS.player.tank).toBe(0xFF5722)
      expect(GAME_CONFIG.COLORS.player.transport).toBe(0x2196F3)
    })
    it('should have enemy colors', () => {
      expect(GAME_CONFIG.COLORS.enemy.scout).toBe(0x2E7D32)
      expect(GAME_CONFIG.COLORS.enemy.tank).toBe(0xB71C1C)
      expect(GAME_CONFIG.COLORS.enemy.transport).toBe(0x0D47A1)
    })
    it('should have wild colors', () => {
      expect(GAME_CONFIG.COLORS.wild.scout).toBe(0x8D6E63)
      expect(GAME_CONFIG.COLORS.wild.tank).toBe(0x8D6E63)
      expect(GAME_CONFIG.COLORS.wild.transport).toBe(0x8D6E63)
    })
    it('should have neutral colors', () => {
      expect(GAME_CONFIG.COLORS.neutral.scout).toBe(0x00BCD4)
      expect(GAME_CONFIG.COLORS.neutral.tank).toBe(0x00BCD4)
      expect(GAME_CONFIG.COLORS.neutral.transport).toBe(0x00BCD4)
    })
    it('should have base color', () => {
      expect(GAME_CONFIG.COLORS.base).toBe(0x2196F3)
    })
    it('should have alert color', () => {
      expect(GAME_CONFIG.COLORS.alert).toBe(0xB8860B)
    })
    it('should have selection colors', () => {
      expect(GAME_CONFIG.COLORS.selection.player).toBe(0x0080FF)
      expect(GAME_CONFIG.COLORS.selection.enemy).toBe(0xFF0000)
    })
  })

  describe('DISTANCES', () => {
    it('should have click tolerance', () => {
      expect(GAME_CONFIG.DISTANCES.clickTolerance).toBe(20)
    })
    it('should have alert click radius', () => {
      expect(GAME_CONFIG.DISTANCES.alertClickRadius).toBe(15)
    })
    it('should have base unit radius', () => {
      expect(GAME_CONFIG.DISTANCES.baseUnitRadius).toBe(50)
    })
    it('should have combat range', () => {
      expect(GAME_CONFIG.DISTANCES.combatRange).toBe(20)
    })
    it('should have alert reveal range', () => {
      expect(GAME_CONFIG.DISTANCES.alertRevealRange).toBe(25)
    })
  })

  describe('LIMITS', () => {
    it('should have max group size', () => {
      expect(GAME_CONFIG.LIMITS.maxGroupSize).toBe(12)
    })
    it('should have drag threshold', () => {
      expect(GAME_CONFIG.LIMITS.dragThreshold).toBe(5)
    })
  })

  describe('UI', () => {
    it('should have font sizes', () => {
      expect(GAME_CONFIG.UI.fontSize.label).toBe(10)
      expect(GAME_CONFIG.UI.fontSize.damage).toBe(14)
    })
    it('should have indicator sizes', () => {
      expect(GAME_CONFIG.UI.indicatorSize).toBe(12)
      expect(GAME_CONFIG.UI.targetIndicatorSize).toBe(10)
    })
    it('should have explosion scale', () => {
      expect(GAME_CONFIG.UI.explosionScale).toBe(3.0)
    })
    it('should have health bar length', () => {
      expect(GAME_CONFIG.UI.healthBarLength).toBe(10)
    })
  })

  describe('VISIBILITY', () => {
    it('should have range', () => {
      expect(GAME_CONFIG.VISIBILITY.range).toBe(200)
    })
    it('should have same type unit radius', () => {
      expect(GAME_CONFIG.VISIBILITY.sameTypeUnitRadius).toBe(200)
    })
  })

  describe('TIMEOUTS', () => {
    it('should have target indicator timeout', () => {
      expect(GAME_CONFIG.TIMEOUTS.targetIndicator).toBe(2000)
    })
    it('should have alert highlight timeout', () => {
      expect(GAME_CONFIG.TIMEOUTS.alertHighlight).toBe(3000)
    })
  })
})
