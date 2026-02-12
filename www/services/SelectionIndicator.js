/**
 * Selection Indicator Service - Manages visual selection indicators
 * Handles selection rings and info overlays for entities
 * Works through RendererSystem for entity access
 */

import { GAME_CONFIG } from '../config/game-config.js'
import { createCoordinateTransformer } from '../utils/coordinate-transformer.js'

export class SelectionIndicator {
  constructor(gameEngine, rendererSystem = null) {
    this.gameEngine = gameEngine
    this.rendererSystem = rendererSystem
    this.transformer = null
    this.isDestroyed = false
  }

  setTransformer (transformer) {
    this.transformer = transformer
  }

  init(app) {
    // Use transformer from RendererSystem or GameEngine if available
    if (this.rendererSystem && this.rendererSystem.transformer) {
      this.transformer = this.rendererSystem.transformer
    } else if (this.gameEngine && this.gameEngine.transformer) {
      this.transformer = this.gameEngine.transformer
    } else {
      this.transformer = createCoordinateTransformer(app)
    }
    
    // Если RendererSystem не был передан в конструктор, пытаемся получить его из gameEngine
    if (!this.rendererSystem && this.gameEngine.rendererSystem) {
      this.rendererSystem = this.gameEngine.rendererSystem
    }
  }

  createSelectionIndicator(entity, isEnemy = false) {
     if (!this.transformer) return
     if (!entity || !entity.container) return
     
     const indicatorGraphics = new PIXI.Graphics()
     const color = isEnemy
       ? GAME_CONFIG.COLORS.selection.enemy
       : GAME_CONFIG.COLORS.selection.player
     indicatorGraphics.lineStyle(3, color, 1)
     indicatorGraphics.drawCircle(0, 0, 12)
     
     // Используем RendererSystem для добавления в контейнер
     this.rendererSystem.addEntityToContainer({ container: indicatorGraphics }, entity.container)
     
     entity.selectionIndicator = indicatorGraphics
   }

  removeSelectionIndicator(entity) {
    if (entity && entity.selectionIndicator) {
      // Используем RendererSystem для удаления из контейнера
      this.rendererSystem.removeEntityFromContainer({ container: entity.selectionIndicator })
      entity.selectionIndicator = null
    }
  }

  removeInfoIndicator(entity) {
    if (entity && entity.infoIndicator) {
      // Используем RendererSystem для удаления из контейнера
      this.rendererSystem.removeEntityFromContainer({ container: entity.infoIndicator })
      
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
    this.rendererSystem = null
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
