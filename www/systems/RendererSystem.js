/**
 * Renderer System - Handles entity rendering and visual effects
 * Extracted from original EntityRenderer for better separation of concerns
 */

import { GAME_CONFIG } from '../config/game-config.js'

export class RendererSystem {
  constructor (gameEngine) {
    this.gameEngine = gameEngine
    this.app = null
    this.entities = new Map()
    this.targetIndicator = null
    this.alertHighlight = null
    this.gridContainer = null
    this.isDestroyed = false
    this._cachedScale = null
  }

  init (app) {
    this.app = app
    this._updateScaleCache()
    this.setupGrid()
  }

  updateEntityPosition (id, gameX, gameY) {
    const entity = this.entities.get(id)
    if (!entity || !entity.container) return

    const { x: scaleX, y: scaleY } = this._getScale()
    const screenX = gameX * scaleX
    const screenY = gameY * scaleY

    entity.container.x = screenX
    entity.container.y = screenY
    entity.x = screenX
    entity.y = screenY
    entity.gameX = gameX
    entity.gameY = gameY
  }

  createEntitySprite (id, x, y, vehicleType, faction = null, entityType = 'vehicle') {
    const { x: scaleX, y: scaleY } = this._getScale()
    const screenX = x * scaleX
    const screenY = y * scaleY

    const graphics = new PIXI.Graphics()
    let color

    if (entityType === 'base') {
      color = 0x2196F3
      graphics.beginFill(color)
      graphics.drawRect(-15, -15, 30, 30)
    } else {
      switch (vehicleType) {
        case 'scout':
          color = faction === 'Neutral'
            ? GAME_CONFIG.COLORS.neutral.scout
            : (faction === 'Enemy' || faction === 'Wild')
              ? GAME_CONFIG.COLORS.enemy.scout
              : GAME_CONFIG.COLORS.player.scout
          graphics.beginFill(color)
          graphics.drawRect(-4, -4, 8, 8)
          break
        case 'tank':
          color = faction === 'Neutral'
            ? GAME_CONFIG.COLORS.neutral.tank
            : (faction === 'Enemy' || faction === 'Wild')
              ? GAME_CONFIG.COLORS.enemy.tank
              : GAME_CONFIG.COLORS.player.tank
          graphics.beginFill(color)
          graphics.drawRect(-10, -8, 20, 16)
          break
        case 'transport':
          color = faction === 'Neutral'
            ? GAME_CONFIG.COLORS.neutral.transport
            : (faction === 'Enemy' || faction === 'Wild')
              ? GAME_CONFIG.COLORS.enemy.transport
              : GAME_CONFIG.COLORS.player.transport
          graphics.beginFill(color)
          graphics.drawRect(-12, -10, 24, 20)
          break
        default:
          color = 0xFFFFFF
          graphics.beginFill(color)
          graphics.drawRect(-4, -4, 8, 8)
      }
    }

    graphics.endFill()

    const container = new PIXI.Container()
    container.addChild(graphics)
    container.x = screenX
    container.y = screenY
    container.gameX = x
    container.gameY = y
    this.app.stage.addChild(container)

    const entity = {
      id,
      container,
      graphics,
      type: entityType,
      vehicleType,
      faction,
      gameX: x,
      gameY: y,
      screenX,
      screenY
    }

    this.entities.set(id, entity)
    return entity
  }

  removeEntity (id) {
    const entity = this.entities.get(id)
    if (!entity) return

    if (entity.container) {
      this.app.stage.removeChild(entity.container)
      entity.container.destroy({ children: true, texture: true, baseTexture: true })
    }

    this.entities.delete(id)
  }

  showTargetIndicator (gameX, gameY) {
    if (this.targetIndicator) {
      this.app.stage.removeChild(this.targetIndicator)
      this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
    }

    const { x: scaleX, y: scaleY } = this._getScale()
    const screenX = gameX * scaleX
    const screenY = gameY * scaleY

    const container = new PIXI.Container()
    const graphics = new PIXI.Graphics()

    graphics.lineStyle(2, 0x00FF00, 1)
    graphics.drawCircle(0, 0, 10)
    graphics.moveTo(-15, 0)
    graphics.lineTo(15, 0)
    graphics.moveTo(0, -15)
    graphics.lineTo(0, 15)

    container.addChild(graphics)
    container.x = screenX
    container.y = screenY
    this.app.stage.addChild(container)

    this.targetIndicator = container
  }

  clearTargetIndicator () {
    if (this.targetIndicator) {
      this.app.stage.removeChild(this.targetIndicator)
      this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
      this.targetIndicator = null
    }
  }

  setupGrid () {
    if (this.gridContainer) {
      this.app.stage.removeChild(this.gridContainer)
      this.gridContainer.destroy({ children: true, texture: true, baseTexture: true })
    }

    this.gridContainer = new PIXI.Container()
    const gridGraphics = new PIXI.Graphics()
    gridGraphics.lineStyle(1, 0x444444, 0.5)

    const gridSize = 50
    const { x: scaleX, y: scaleY } = this._getScale()

    for (let x = 0; x <= GAME_CONFIG.WORLD_SIZE.width; x += gridSize) {
      const scaledX = x * scaleX
      gridGraphics.moveTo(scaledX, 0)
      gridGraphics.lineTo(scaledX, this.app.screen.height)
    }

    for (let y = 0; y <= GAME_CONFIG.WORLD_SIZE.height; y += gridSize) {
      const scaledY = y * scaleY
      gridGraphics.moveTo(0, scaledY)
      gridGraphics.lineTo(this.app.screen.width, scaledY)
    }

    this.gridContainer.addChild(gridGraphics)
    this.app.stage.addChildAt(this.gridContainer, 0)
  }

  updateGrid () {
    if (!this.gridContainer) return
    if (this.app) {
      this.app.stage.removeChild(this.gridContainer)
      this.gridContainer.destroy({ children: true, texture: true, baseTexture: true })
    }
    this.setupGrid()
  }

  update (_dt) {
    this._updateScaleCache()
  }

  render () {}

  invalidateScaleCache () {
    this._cachedScale = null
  }

  _updateScaleCache () {
    if (!this.app) return
    this._cachedScale = {
      x: this.app.screen.width / GAME_CONFIG.WORLD_SIZE.width,
      y: this.app.screen.height / GAME_CONFIG.WORLD_SIZE.height
    }
  }

  _getScale () {
    return this._cachedScale || { x: 1, y: 1 }
  }

  destroy () {
    if (this.isDestroyed) return
    this.isDestroyed = true

    for (const [_id, entity] of this.entities) {
      if (entity.container) {
        this.app?.stage.removeChild(entity.container)
        entity.container.destroy({ children: true, texture: true, baseTexture: true })
      }
    }
    this.entities.clear()

    if (this.targetIndicator) {
      this.app?.stage.removeChild(this.targetIndicator)
      this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
      this.targetIndicator = null
    }

    if (this.alertHighlight) {
      this.app?.stage.removeChild(this.alertHighlight)
      this.alertHighlight.destroy({ children: true, texture: true, baseTexture: true })
      this.alertHighlight = null
    }

    if (this.gridContainer) {
      this.app?.stage.removeChild(this.gridContainer)
      this.gridContainer.destroy({ children: true, texture: true, baseTexture: true })
      this.gridContainer = null
    }

    this.gameEngine = null
    this.app = null
  }
}

export function createRenderer (gameEngine) {
  return new RendererSystem(gameEngine)
}

