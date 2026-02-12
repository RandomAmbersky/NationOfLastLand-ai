/**
 * Selection Indicator Service - Manages visual selection indicators
 * Handles selection rings and info overlays for entities
 */

import { GAME_CONFIG } from '../config/game-config.js'

export class SelectionIndicator {
  constructor(gameEngine) {
    this.gameEngine = gameEngine
    this.isDestroyed = false
  }

  createSelectionIndicator(entity, isEnemy = false) {
     const app = this._getApp()
     if (!app) return
     if (!entity || !entity.container) return
     const graphics = new PIXI.Graphics()
     const color = isEnemy
       ? GAME_CONFIG.COLORS.selection.enemy
       : GAME_CONFIG.COLORS.selection.player
     graphics.lineStyle(3, color, 1)
     graphics.drawCircle(0, 0, 12)
     entity.container.addChild(graphics)
     entity.selectionIndicator = graphics
   }

  _getApp () {
     // Try to get app from gameEngine first (for SelectionSystem)
     if (this.gameEngine.app) return this.gameEngine.app
     // Fallback to state container's app (for legacy)
     return null
   }

  removeSelectionIndicator(entity) {
    if (entity && entity.selectionIndicator) {
      entity.container.removeChild(entity.selectionIndicator)
      entity.selectionIndicator = null
    }
  }

  removeInfoIndicator(entity) {
    if (entity && entity.infoIndicator) {
      entity.container.removeChild(entity.infoIndicator)
      if (entity.infoIndicator.destroy) {
        entity.infoIndicator.destroy({ children: true, texture: true, baseTexture: true })
      }
      entity.infoIndicator = null
    }
  }

  updateIndicators(selections) {
     const app = this._getApp()
     if (!app) return
     
     // Get entities from gameEngine state
     const entities = this.gameEngine.state.get('entities')

     // Remove infoIndicator from all entities
     for (const [, entity] of entities) {
       if (entity.infoIndicator) {
         this.removeInfoIndicator(entity)
       }
     }

     for (const [entityId, entity] of entities) {
       if (entity.selectionIndicator && !selections.has(entityId)) {
         this.removeSelectionIndicator(entity)
       }
     }

     for (const entityId of selections) {
       const entity = entities.get(entityId)
       if (entity && !entity.selectionIndicator) {
         const isEnemy =
           entity.fraction === 'Enemy' ||
           entity.fraction === 'Wild' ||
           entity.entityType === 'alert'
         this.createSelectionIndicator(entity, isEnemy)
       }
     }
   }

  destroy() {
    if (this.isDestroyed) return
    this.isDestroyed = true

    const entities = this.gameEngine.state.get('entities')
    for (const [_entityId, entity] of entities) {
      if (entity && entity.selectionIndicator) {
        this.removeSelectionIndicator(entity)
      }
      if (entity && entity.infoIndicator) {
        this.removeInfoIndicator(entity)
      }
    }

    this.gameEngine = null
  }

  validateAndFixSelectionState() {
    const selections = this.gameEngine.state.get('selections')
    const entities = this.gameEngine.state.get('entities')
    let hadFixes = false

    for (const [entityId, entity] of entities) {
      if (entity.selectionIndicator && !selections.has(entityId)) {
        console.warn('Entity ' + entityId + ' has indicator but not in selection - removing')
        this.removeSelectionIndicator(entity)
        hadFixes = true
      }
    }

    for (const entityId of selections) {
      const entity = entities.get(entityId)
      if (entity && !entity.selectionIndicator) {
        console.warn('Entity ' + entityId + ' is selected but missing indicator - adding')
        const isEnemy =
          entity.fraction === 'Enemy' ||
          entity.fraction === 'Wild' ||
          entity.entityType === 'alert'
        this.createSelectionIndicator(entity, isEnemy)
        hadFixes = true
      }
    }

    for (const entityId of selections) {
      if (!entities.has(entityId)) {
        console.warn('Entity ' + entityId + ' in selection but no longer exists - removing from selection')
        selections.delete(entityId)
        hadFixes = true
      }
    }

    return !hadFixes
  }
}

export function createSelectionIndicator(gameEngine) {
  return new SelectionIndicator(gameEngine)
}
