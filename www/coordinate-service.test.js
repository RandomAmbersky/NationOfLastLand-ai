/* eslint-env jest */
/**
 * Tests for CoordinateTransformer (replaces CoordinateService tests)
 */
import { CoordinateTransformer } from './utils/coordinate-transformer.js'
import { GAME_CONFIG } from './config/game-config.js'

describe('CoordinateTransformer', () => {
  let transformer
  let mockApp

  beforeEach(() => {
    mockApp = {
      screen: { width: 800, height: 600 },
      view: { width: 800, height: 600 }
    }
    transformer = new CoordinateTransformer(mockApp)
  })

  describe('getScale', () => {
    it('should calculate scale based on screen and world sizes', () => {
      const scale = transformer.getScale()
      expect(scale.x).toBe(800 / GAME_CONFIG.WORLD_SIZE.width)
      expect(scale.y).toBe(600 / GAME_CONFIG.WORLD_SIZE.height)
    })

    it('should cache the scale values', () => {
      const scale1 = transformer.getScale()
      const scale2 = transformer.getScale()
      expect(scale1).toBe(scale2)
    })
  })

  describe('invalidateScaleCache', () => {
    it('should clear the scale cache', () => {
      transformer.getScale()
      expect(transformer._scaleCache).not.toBeNull()
      transformer.invalidateScaleCache()
      expect(transformer._scaleCache).toBeNull()
    })
  })

  describe('screenToGame', () => {
    it('should convert screen coordinates to game coordinates', () => {
      const result = transformer.screenToGame(400, 300)
      expect(result.x).toBe((400 / 800) * GAME_CONFIG.WORLD_SIZE.width)
      expect(result.y).toBe((300 / 600) * GAME_CONFIG.WORLD_SIZE.height)
    })
  })

  describe('gameToScreen', () => {
    it('should convert game coordinates to screen coordinates', () => {
      const scale = transformer.getScale()
      const result = transformer.gameToScreen(500, 400)
      expect(result.x).toBeCloseTo(500 * scale.x)
      expect(result.y).toBeCloseTo(400 * scale.y)
    })
  })

  describe('normalizeCoords', () => {
    it('should normalize array coords', () => {
      const result = transformer.normalizeCoords([100, 200])
      expect(result).toEqual({ x: 100, y: 200 })
    })

    it('should normalize object coords', () => {
      const result = transformer.normalizeCoords({ x: 100, y: 200 })
      expect(result).toEqual({ x: 100, y: 200 })
    })

    it('should normalize separate x,y params', () => {
      const result = transformer.normalizeCoords(100, 200)
      expect(result).toEqual({ x: 100, y: 200 })
    })
  })
})
