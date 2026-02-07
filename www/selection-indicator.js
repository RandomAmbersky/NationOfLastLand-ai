import { GAME_CONFIG } from "./game-config.js"

export class SelectionIndicatorManager {
  constructor (gameDemo) {
    this.gameDemo = gameDemo
    this.isDestroyed = false
  }

  createSelectionIndicator (entity, isEnemy = false) {
    const graphics = new PIXI.Graphics()
    const color = isEnemy
      ? GAME_CONFIG.COLORS.selection.enemy
      : GAME_CONFIG.COLORS.selection.player
    graphics.lineStyle(3, color, 1)
    graphics.drawCircle(0, 0, 12)
    entity.container.addChild(graphics)
    entity.selectionIndicator = graphics
  }

  removeSelectionIndicator (entity) {
    if (entity && entity.selectionIndicator) {
      entity.container.removeChild(entity.selectionIndicator)
      entity.selectionIndicator = null
    }
  }

  removeInfoIndicator (entity) {
    if (entity && entity.infoIndicator) {
      entity.container.removeChild(entity.infoIndicator)
      if (entity.infoIndicator.destroy) {
        entity.infoIndicator.destroy({ children: true, texture: true, baseTexture: true })
      }
      entity.infoIndicator = null
    }
  }

  updateSelectionIndicators (selectedEntityIds) {
    for (const [entityId, entity] of this.gameDemo.entities) {
      if (entity.selectionIndicator && !selectedEntityIds.has(entityId)) {
        this.removeSelectionIndicator(entity)
      }
    }
    for (const entityId of selectedEntityIds) {
      const entity = this.gameDemo.entities.get(entityId)
      if (entity && !entity.selectionIndicator) {
        const isEnemy =
          entity.fraction === "Enemy" ||
          entity.fraction === "Wild" ||
          entity.entityType === "alert"
        console.log("Creating indicator for entity " + entityId + ", isEnemy=" + isEnemy)
        this.createSelectionIndicator(entity, isEnemy)
      }
    }
  }

  destroy () {
    if (this.isDestroyed) return
    this.isDestroyed = true
    for (const [entityId, entity] of this.gameDemo.entities) {
      if (entity && entity.selectionIndicator) {
        this.removeSelectionIndicator(entity)
      }
      if (entity && entity.infoIndicator) {
        this.removeInfoIndicator(entity)
      }
    }
    this.gameDemo = null
  }
}
