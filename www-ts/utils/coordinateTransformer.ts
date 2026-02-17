/**
 * Coordinate Transformer - Centralized coordinate normalization and transformation
 * Consolidates all coordinate-related logic in one place
 */

import { GAME_CONFIG } from '../config/game-config.js'

export class CoordinateTransformer {
  private app: unknown
  private _scaleCache: { x: number, y: number } | null

  constructor (app: unknown) {
    this.app = app
    this._scaleCache = null
  }

  /**
   * Normalize coordinates to {x, y} object
   * Supports: number, array [x, y], object {x, y}
   * @param gameX - Game X coordinate (number, array, or object)
   * @param gameY - Game Y coordinate (optional if gameX is object/array)
   * @returns Normalized coordinates {x, y}
   */
  normalizeCoords (gameX: number | number[] | { x?: number, y?: number }, gameY?: number): { x: number, y: number } {
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
   * @returns Scale factors {x, y}
   */
  getScale (): { x: number, y: number } {
    if (!this.app) return { x: 1, y: 1 }

    if (!this._scaleCache) {
      const canvas = (this.app asPIXI.Application).view
      this._scaleCache = {
        x: canvas.width / GAME_CONFIG.WORLD_SIZE.width,
        y: canvas.height / GAME_CONFIG.WORLD_SIZE.height
      }
    }
    return this._scaleCache
  }

  /**
   * Invalidate scale cache (call on resize)
   */
  invalidateScaleCache (): void {
    this._scaleCache = null
  }

  /**
   * Convert game coordinates to screen coordinates
   * @param gameX - Game X coordinate
   * @param gameY - Game Y coordinate
   * @returns Screen coordinates {x, y}
   */
  gameToScreen (gameX: number, gameY: number): { x: number, y: number } {
    const { x: scaleX, y: scaleY } = this.getScale()
    const { x, y } = this.normalizeCoords(gameX, gameY)
    return { x: x * scaleX, y: y * scaleY }
  }

  /**
   * Convert screen coordinates to game coordinates
   * @param screenX - Screen X coordinate
   * @param screenY - Screen Y coordinate
   * @returns Game coordinates {x, y}
   */
  screenToGame (screenX: number, screenY: number): { x: number, y: number } {
    if (!this.app) return { x: 0, y: 0 }

    const width = (this.app asPIXI.Application).screen.width
    const height = (this.app asPIXI.Application).screen.height
    return {
      x: (screenX / width) * GAME_CONFIG.WORLD_SIZE.width,
      y: (screenY / height) * GAME_CONFIG.WORLD_SIZE.height
    }
  }

  /**
   * Convert game coordinates to screen coordinates with container offset
   * @param gameX - Game X coordinate
   * @param gameY - Game Y coordinate
   * @returns Screen coordinates {x, y}
   */
  getScreenCoords (gameX: number, gameY: number): { x: number, y: number } {
    return this.gameToScreen(gameX, gameY)
  }
}

export function createCoordinateTransformer (app: unknown): CoordinateTransformer {
  return new CoordinateTransformer(app)
}
