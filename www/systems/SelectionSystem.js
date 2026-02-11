/**
 * Selection System - Handles entity selection and group management
 * Extracted from original SelectionManager for better separation of concerns
 */

import { GAME_CONFIG } from '../config/game-config.js'
import { SelectionIndicatorManager } from '../services/SelectionIndicator.js'
import { EntityService } from '../services/EntityService.js'

export class SelectionSystem {
  constructor (gameEngine) {
    this.gameEngine = gameEngine
    this.selectionIndicatorManager = null
    this.entityService = null
    this.isDestroyed = false
  }

  init () {
    this.selectionIndicatorManager = new SelectionIndicatorManager(this.gameEngine)
    this.entityService = new EntityService(this.gameEngine)
  }

  selectEntity (entityId, isMultiSelect = false) {
    const state = this.gameEngine.state
    const selections = state.get('selections')

    if (selections.has(entityId)) return true

    if (selections.size >= GAME_CONFIG.LIMITS.maxGroupSize && !isMultiSelect) {
      return false
    }

    this.gameEngine.emit('selectEntity', {
      entityId,
      isMultiSelect,
      currentSelections: Array.from(selections)
    })

    return true
  }

  deselectEntity (entityId) {
    const state = this.gameEngine.state
    const selections = state.get('selections')

    if (selections.has(entityId)) {
      selections.delete(entityId)
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicatorManager.updateIndicators(selections)
      return true
    }
    return false
  }

  clearAll () {
    const state = this.gameEngine.state
    const selections = state.get('selections')

    if (selections.size > 0) {
      selections.clear()
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicatorManager.updateIndicators(selections)
      return true
    }
    return false
  }

  selectAllPlayerUnits () {
    const state = this.gameEngine.state
    const entities = state.get('entities')
    const selections = state.get('selections')
    const maxGroupSize = GAME_CONFIG.LIMITS.maxGroupSize

    let count = 0
    for (const [id, entity] of entities) {
      if (entity.faction === 'Player' && entity.type === 'vehicle' &&
          entity.vehicleType !== 'alert') {
        if (count < maxGroupSize) {
          selections.add(id)
          count++
        }
      }
    }

    state.merge({ selections }, 'selectionsChanged')
    this.selectionIndicatorManager.updateIndicators(selections)
    return count
  }

  selectEntitiesInRectangle (bounds) {
    const state = this.gameEngine.state
    const entities = state.get('entities')
    const selections = state.get('selections')
    const maxGroupSize = GAME_CONFIG.LIMITS.maxGroupSize

    const entitiesInRect = []
    for (const [id, entity] of entities) {
      if (this._isEntityInBounds(entity, bounds)) {
        entitiesInRect.push(id)
      }
    }

    const limitedEntities = entitiesInRect.slice(0, maxGroupSize)

    for (const id of limitedEntities) {
      selections.add(id)
    }

    state.merge({ selections }, 'selectionsChanged')
    this.selectionIndicatorManager.updateIndicators(selections)
    return limitedEntities.length
  }

  _isEntityInBounds (entity, bounds) {
    if (!entity.container) return false

    const entityScreenX = entity.container.x
    const entityScreenY = entity.container.y

    return entityScreenX >= bounds.x &&
           entityScreenY >= bounds.y &&
           entityScreenX <= bounds.x + bounds.width &&
           entityScreenY <= bounds.y + bounds.height
  }

  selectSameType (entityId) {
    const state = this.gameEngine.state
    const entities = state.get('entities')
    const selections = state.get('selections')
    const maxGroupSize = GAME_CONFIG.LIMITS.maxGroupSize

    const entity = entities.get(entityId)
    if (!entity) return 0

    const targetType = entity.vehicleType || entity.type

    let count = 0
    for (const [id, e] of entities) {
      if (e.id === entityId) continue
      if ((e.vehicleType || e.type) === targetType) {
        if (count < maxGroupSize) {
          selections.add(id)
          count++
        }
      }
    }

    state.merge({ selections }, 'selectionsChanged')
    this.selectionIndicatorManager.updateIndicators(selections)
    return count
  }

  setGroupTarget (gameX, gameY) {
    const state = this.gameEngine.state
    const selections = state.get('selections')

    this.gameEngine.emit('groupTargetSet', {
      targetX: gameX,
      targetY: gameY,
      selections: Array.from(selections)
    })
  }

  updateIndicators (selections) {
    this.selectionIndicatorManager.updateIndicators(selections)
  }

  update (dt) {}

  render () {}

  destroy () {
    if (this.isDestroyed) return
    this.isDestroyed = true

    if (this.selectionIndicatorManager) {
      this.selectionIndicatorManager.destroy()
    }

    this.selectionIndicatorManager = null
    this.entityService = null
    this.gameEngine = null
  }
}

export function createSelectionSystem (gameEngine) {
  return new SelectionSystem(gameEngine)
}
