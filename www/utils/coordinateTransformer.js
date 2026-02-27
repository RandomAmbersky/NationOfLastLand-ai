import { GAME_CONFIG } from '../config/game-config.js'

/**
 * Coordinate Transformer - Centralized coordinate normalization and transformation
 * Consolidates all coordinate-related logic in one place
 */
export class CoordinateTransformer {
  constructor (app) {
    this.app = app
    this._scaleCache = null
  }

  /**
   * Normalize coordinates to {x, y} object
   * Supports: number, array [x, y], object {x, y}
   * @param {*} gameX - Game X coordinate (number, array, or object)
   * @param {*} gameY - Game Y coordinate (optional if gameX is object/array)
   * @returns {Object} Normalized coordinates {x, y}
   */
  normalizeCoords (gameX, gameY) {
    // If gameX is array [x, y]
    if (Array.isArray(gameX)) {
      return { x: gameX[0] ?? 0, y: gameX[1] ?? 0 }
    }
    // If gameX is object {x, y}
    if (gameX && typeof gameX === 'object' && !Array.isArray(gameX)) {
      return { x: gameX.x ?? 0, y: gameY?.y ?? gameX.y ?? 0 }
    }
    // If gameX is number, gameY is number
    return { x: gameX ?? 0, y: gameY ?? 0 }
  }

  /**
   * Get scale from app dimensions to world dimensions
   * @returns {Object} Scale factors {x, y}
   */
  getScale () {
    if (!this.app) return { x: 1, y: 1 }

    if (!this._scaleCache) {
      const w = this.app.screen?.width ?? this.app.view?.width ?? GAME_CONFIG.WORLD_SIZE.width
      const h = this.app.screen?.height ?? this.app.view?.height ?? GAME_CONFIG.WORLD_SIZE.height
      const scaleX = (w && Number.isFinite(w)) ? w / GAME_CONFIG.WORLD_SIZE.width : 1
      const scaleY = (h && Number.isFinite(h)) ? h / GAME_CONFIG.WORLD_SIZE.height : 1
      this._scaleCache = {
        x: Number.isFinite(scaleX) ? scaleX : 1,
        y: Number.isFinite(scaleY) ? scaleY : 1
      }
    }
    return this._scaleCache
  }

  /**
   * Invalidate scale cache (call on resize)
   */
  invalidateScaleCache () {
    this._scaleCache = null
  }

  /**
   * Convert game coordinates to screen coordinates
   * @param {number} gameX - Game X coordinate
   * @param {number} gameY - Game Y coordinate
   * @returns {Object} Screen coordinates {x, y}
   */
  gameToScreen (gameX, gameY) {
    const { x: scaleX, y: scaleY } = this.getScale()
    const { x, y } = this.normalizeCoords(gameX, gameY)
    return { x: x * scaleX, y: y * scaleY }
  }

  /**
   * Convert screen coordinates to game coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {Object} Game coordinates {x, y}
   */
  screenToGame (screenX, screenY) {
    if (!this.app) return { x: 0, y: 0 }

    const width = this.app.screen.width
    const height = this.app.screen.height
    return {
      x: (screenX / width) * GAME_CONFIG.WORLD_SIZE.width,
      y: (screenY / height) * GAME_CONFIG.WORLD_SIZE.height
    }
  }

  /**
   * Convert game coordinates to screen coordinates with container offset
   * @param {number} gameX - Game X coordinate
   * @param {number} gameY - Game Y coordinate
   * @returns {Object} Screen coordinates {x, y}
   */
  getScreenCoords (gameX, gameY) {
    return this.gameToScreen(gameX, gameY)
  }
}

/**
 * Create a new CoordinateTransformer instance
 * @param {PIXI.Application} app - Pixi.js application
 * @returns {CoordinateTransformer} New transformer instance
 */
export function createCoordinateTransformer (app) {
  return new CoordinateTransformer(app)
}
