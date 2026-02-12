/* eslint-env jest */
const { CoordinateService } = require('./coordinate-service.js')
const { GAME_CONFIG } = require('./config/game-config.js')

describe('CoordinateService', () => {
  let gameDemo
  let coordinateService

  beforeEach(() => {
    gameDemo = {
      app: {
        screen: { width: 800, height: 600 },
        view: { getBoundingClientRect: () => ({ left: 0, top: 0 }) }
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
      coordinateService.getScale()
      expect(coordinateService._scaleCache).not.toBeNull()
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
  })

  describe('gameToScreen', () => {
    it('should convert game coordinates to screen coordinates', () => {
      const scale = coordinateService.getScale()
      const result = coordinateService.gameToScreen(500, 400)
      expect(result.x).toBeCloseTo(500 * scale.x)
      expect(result.y).toBeCloseTo(400 * scale.y)
    })
  })

  describe('getCanvasCoords', () => {
    it('should calculate canvas coordinates relative to bounding rect', () => {
      gameDemo.app.view.getBoundingClientRect = () => ({ left: 100, top: 50 })
      const event = { clientX: 200, clientY: 150 }
      const result = coordinateService.getCanvasCoords(event)
      expect(result.screenX).toBe(100)
      expect(result.screenY).toBe(100)
    })
  })
})
