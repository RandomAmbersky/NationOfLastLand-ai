import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CoordinateService } from './coordinate-service.js'
import { GAME_CONFIG } from './game-config.js'

describe('CoordinateService', () => {
  let gameDemo
  let coordinateService

  beforeEach(() => {
    // Mock gameDemo with app.screen
    gameDemo = {
      app: {
        screen: {
          width: 800,
          height: 600
        },
        view: {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0
          })
        }
      }
    }

    coordinateService = new CoordinateService(gameDemo)
  })

  describe('getScale', () => {
    it('should calculate scale based on screen and world sizes', () => {
      const scale = coordinateService.getScale()
      expect(scale.x).toBe(800 / GAME_CONFIG.WORLD_SIZE.width)
      expect(scale.y).toBe(600 / GAME_CONFIG.WORLD_SIZE.height)
    })

    it('should cache the scale values', () => {
      const scale1 = coordinateService.getScale()
      const scale2 = coordinateService.getScale()
      expect(scale1).toBe(scale2)
    })
  })

  describe('invalidateScaleCache', () => {
    it('should clear the scale cache', () => {
      // First call to populate cache
      coordinateService.getScale()
      expect(coordinateService._scaleCache).not.toBeNull()

      // Invalidate cache
      coordinateService.invalidateScaleCache()
      expect(coordinateService._scaleCache).toBeNull()
    })
  })

  describe('screenToGame', () => {
    it('should convert screen coordinates to game coordinates', () => {
      const result = coordinateService.screenToGame(400, 300)
      expect(result.x).toBe((400 / 800) * GAME_CONFIG.WORLD_SIZE.width)
      expect(result.y).toBe((300 / 600) * GAME_CONFIG.WORLD_SIZE.height)
    })

    it('should handle edge cases', () => {
      // Center of screen
      let result = coordinateService.screenToGame(400, 300)
      expect(result).toEqual({ 
        x: (400 / 800) * GAME_CONFIG.WORLD_SIZE.width, 
        y: (300 / 600) * GAME_CONFIG.WORLD_SIZE.height 
      })

      // Top-left corner
      result = coordinateService.screenToGame(0, 0)
      expect(result).toEqual({ x: 0, y: 0 })

      // Bottom-right corner
      result = coordinateService.screenToGame(800, 600)
      expect(result).toEqual({ 
        x: GAME_CONFIG.WORLD_SIZE.width, 
        y: GAME_CONFIG.WORLD_SIZE.height 
      })
    })
  })

  describe('gameToScreen', () => {
    it('should convert game coordinates to screen coordinates', () => {
      const scale = coordinateService.getScale()
      const result = coordinateService.gameToScreen(500, 400)
      expect(result.x).toBeCloseTo(500 * scale.x)
      expect(result.y).toBeCloseTo(400 * scale.y)
    })

    it('should use cached scale values', () => {
      const result = coordinateService.gameToScreen(500, 400)
      const scale = coordinateService.getScale()
      expect(result.x).toBeCloseTo(500 * scale.x)
      expect(result.y).toBeCloseTo(400 * scale.y)
    })
  })

  describe('getScreenCoords', () => {
    it('should call gameToScreen internally', () => {
      const result = coordinateService.getScreenCoords(500, 400)
      const expected = coordinateService.gameToScreen(500, 400)
      expect(result).toEqual(expected)
    })
  })

  describe('getCanvasCoords', () => {
    it('should calculate canvas coordinates relative to bounding rect', () => {
      // Mock getBoundingClientRect to return specific values
      gameDemo.app.view.getBoundingClientRect = () => ({
        left: 100,
        top: 50
      })

      const event = {
        clientX: 200,
        clientY: 150
      }

      const result = coordinateService.getCanvasCoords(event)
      expect(result.screenX).toBe(100) // 200 - 100
      expect(result.screenY).toBe(100) // 150 - 50
    })
  })
})
