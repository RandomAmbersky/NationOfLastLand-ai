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

  validateAndFixSelectionState () {
    const { selectedEntityIds } = this.gameDemo.stateManager.getSelectionState()
    let hadFixes = false

    // Check entities that have indicators but are not in selection
    for (const [entityId, entity] of this.gameDemo.entities) {
      if (entity.selectionIndicator && !selectedEntityIds.has(entityId)) {
        console.warn(`Entity ${entityId} has indicator but not in selection - removing`)
        this.removeSelectionIndicator(entity)
        hadFixes = true
      }
    }

    // Check entities in selection but missing indicators
    for (const entityId of selectedEntityIds) {
      const entity = this.gameDemo.entities.get(entityId)
      if (entity && !entity.selectionIndicator) {
        console.warn(`Entity ${entityId} is selected but missing indicator - adding`)
        const isEnemy =
          entity.fraction === "Enemy" ||
          entity.fraction === "Wild" ||
          entity.entityType === "alert"
        this.createSelectionIndicator(entity, isEnemy)
        hadFixes = true
      }
    }

    // Check selection for entities that no longer exist
    for (const entityId of selectedEntityIds) {
      if (!this.gameDemo.entities.has(entityId)) {
        console.warn(`Entity ${entityId} in selection but no longer exists - removing from selection`)
        selectedEntityIds.delete(entityId)
        hadFixes = true
      }
    }

    return !hadFixes
  }
}
