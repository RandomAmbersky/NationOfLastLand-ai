/**
 * Selection Indicator Service - Manages visual selection indicators
 * Handles selection rings and info overlays for entities
 * Works through RendererSystem for entity access
 */

import { GAME_CONFIG } from '../config/game-config.js'
import { createCoordinateTransformer } from '../utils/coordinate-transformer.js'

export class SelectionIndicator {
  constructor(gameEngine) {
    this.gameEngine = gameEngine
    this.transformer = null
    this.isDestroyed = false
  }

  init(app) {
    this.transformer = createCoordinateTransformer(app)
  }

  createSelectionIndicator(entity, isEnemy = false) {
     if (!this.transformer) return
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
     if (!this.transformer) return
     
     // Get entities from gameEngine state
     const entities = this.gameEngine.state.get('entities')

     // Remove infoIndicator from all entities
     for (const [, entity] of entities) {
       if (entity && entity.infoIndicator) {
         this.removeInfoIndicator(entity)
       }
     }

     // Remove selection indicators from non-selected entities
     for (const [entityId, entity] of entities) {
       if (entity && entity.selectionIndicator && !selections.has(entityId)) {
         this.removeSelectionIndicator(entity)
       }
     }

     // Add selection indicators for selected entities
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
    for (const [, entity] of entities) {
      if (entity && entity.selectionIndicator) {
        this.removeSelectionIndicator(entity)
      }
      if (entity && entity.infoIndicator) {
        this.removeInfoIndicator(entity)
      }
    }

    this.transformer = null
    this.gameEngine = null
  }

  validateAndFixSelectionState() {
    const selections = this.gameEngine.state.get('selections')
    const entities = this.gameEngine.state.get('entities')
    let hadFixes = false

    for (const [entityId, entity] of entities) {
      if (entity && entity.selectionIndicator && !selections.has(entityId)) {
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
