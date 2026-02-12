/**
 * Selection System - Handles entity selection and group management
 * Extracted from original SelectionManager for better separation of concerns
 * Implements rules from units_moving_rules.md
 */

import { GAME_CONFIG } from '../config/game-config.js'
import { SelectionIndicator } from '../services/SelectionIndicator.js'
import { EntityService } from '../entity-service.js'

export class SelectionSystem {
  constructor (gameEngine) {
    this.gameEngine = gameEngine
    this.selectionIndicator = null
    this.entityService = null
    this.isDestroyed = false
    this._typeIndex = new Map()
    this._factionIndex = new Map()
  }

  init (app) {
    this.app = app
    this.selectionIndicator = new SelectionIndicator(this.gameEngine)
    this.entityService = new EntityService(this.gameEngine)
    this._buildIndices()
  }

  _buildIndices () {
    const entities = this.gameEngine.state.get('entities')
    this._typeIndex.clear()
    this._factionIndex.clear()

    for (const [id, entity] of entities) {
      const type = entity.vehicleType || entity.type
      if (!this._typeIndex.has(type)) {
        this._typeIndex.set(type, [])
      }
      this._typeIndex.get(type).push(id)

      const faction = entity.fraction
      if (faction) {
        if (!this._factionIndex.has(faction)) {
          this._factionIndex.set(faction, [])
        }
        this._factionIndex.get(faction).push(id)
      }
    }
  }

  _getIndex (key, value) {
    if (key === 'type') return this._typeIndex.get(value) || []
    if (key === 'faction') return this._factionIndex.get(value) || []
    return []
  }

  _getScale () {
    if (!this.gameEngine.app) return { x: 1, y: 1 }
    return {
      x: this.gameEngine.app.screen.width / GAME_CONFIG.WORLD_SIZE.width,
      y: this.gameEngine.app.screen.height / GAME_CONFIG.WORLD_SIZE.height
    }
  }

  /**
   * Проверяет, может ли юнит двигаться
   */
  _canMove (entity) {
    // Базы не могут двигаться
    if (entity.entityType === 'base') return false
    // Алерты не могут двигаться
    if (entity.entityType === 'alert') return false
    // По умолчанию юниты могут двигаться
    return true
  }

  /**
   * Проверяет, принадлежит ли юнит игроку
   */
  _isPlayerUnit (entity) {
    return entity.fraction === 'Player'
  }

   /**
    * Обработка клика по юниту (правила из units_moving_rules.md)
    */
   handleEntityClicked (data) {
     const { entityId, isMultiSelect, gameX, gameY } = data
     console.log('SelectionSystem.handleEntityClicked:', data)
     const state = this.gameEngine.state
     const selections = state.get('selections')
     const entities = state.get('entities')
     const clickedEntity = entities.get(entityId)
     console.log('clickedEntity:', clickedEntity)

     if (!clickedEntity) {
       console.warn('handleEntityClicked: clickedEntity not found for id', entityId)
       return
     }

    // Если ничего не выбрано - просто выбираем юнит
    if (selections.size === 0) {
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator.updateIndicators(selections)
      return
    }

    // Если в группе выбран только один юнит
    if (selections.size === 1) {
      const selectedEntityId = Array.from(selections)[0]
      const selectedEntity = entities.get(selectedEntityId)

      // Если выбран юнит игрока и кликнули на юнит не игрока - назначаем целью
      if (this._isPlayerUnit(selectedEntity) && !this._isPlayerUnit(clickedEntity)) {
        state.emit('groupTargetSet', { targetX: gameX, targetY: gameY, selections: Array.from(selections) })
        return
      }

      // Если выбран юнит не игрока и кликнули на другого - сбрасываем и выбираем нового
      if (!this._isPlayerUnit(selectedEntity)) {
        selections.clear()
        selections.add(entityId)
        state.merge({ selections }, 'selectionsChanged')
        this.selectionIndicator.updateIndicators(selections)
        return
      }

      // Если выбран юнит игрока и кликнули на другого юнита игрока - добавляем в группу
      if (this._isPlayerUnit(clickedEntity)) {
        if (isMultiSelect) {
          if (selections.size < GAME_CONFIG.LIMITS.maxGroupSize) {
            selections.add(entityId)
            state.merge({ selections }, 'selectionsChanged')
            this.selectionIndicator.updateIndicators(selections)
          }
        } else {
          // Если не multi-select, сбрасываем и выбираем нового
          selections.clear()
          selections.add(entityId)
          state.merge({ selections }, 'selectionsChanged')
          this.selectionIndicator.updateIndicators(selections)
        }
        return
      }
    }

    // Если выбрана группа юнитов игрока
    if (selections.size > 1) {
      // Проверяем, все ли выбранные юниты могут двигаться
      const allCanMove = Array.from(selections).every(id => {
        const entity = entities.get(id)
        return entity && this._canMove(entity)
      })

      // Если все юниты могут двигаться и кликнули на юнита не игрока - назначаем целью
      if (allCanMove && !this._isPlayerUnit(clickedEntity)) {
        state.emit('groupTargetSet', { targetX: gameX, targetY: gameY, selections: Array.from(selections) })
        return
      }

      // Если выбран юнит не игрока и кликнули на другого - сбрасываем и выбираем нового
      const firstSelectedId = Array.from(selections)[0]
      const firstSelectedEntity = entities.get(firstSelectedId)
      if (!this._isPlayerUnit(firstSelectedEntity)) {
        selections.clear()
        selections.add(entityId)
        state.merge({ selections }, 'selectionsChanged')
        this.selectionIndicator.updateIndicators(selections)
        return
      }

      // Если выбран юнит игрока и кликнули на другого юнита игрока - добавляем в группу
      if (this._isPlayerUnit(clickedEntity)) {
        if (isMultiSelect) {
          if (selections.size < GAME_CONFIG.LIMITS.maxGroupSize) {
            selections.add(entityId)
            state.merge({ selections }, 'selectionsChanged')
            this.selectionIndicator.updateIndicators(selections)
          }
        } else {
          // Если не multi-select, сбрасываем и выбираем нового
          selections.clear()
          selections.add(entityId)
          state.merge({ selections }, 'selectionsChanged')
          this.selectionIndicator.updateIndicators(selections)
        }
        return
      }
    }
  }

  /**
   * Обработка клика правой кнопкой мыши на юните
   */
  handleEntitySelected (data) {
    const { entityId } = data
    const state = this.gameEngine.state
    const selections = state.get('selections')
    const entities = state.get('entities')
    const clickedEntity = entities.get(entityId)

    if (!clickedEntity) return

    // Сбрасываем текущее выделение и выбираем юнит
    selections.clear()
    selections.add(entityId)
    state.merge({ selections }, 'selectionsChanged')
    this.selectionIndicator.updateIndicators(selections)
  }

  /**
   * Обработка клика правой кнопкой мыши на пустом месте
   */
  handleSelectionCleared () {
    const state = this.gameEngine.state
    const selections = state.get('selections')

    if (selections.size > 0) {
      selections.clear()
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator.updateIndicators(selections)
    }
  }

  /**
   * Обработка группового выделения прямоугольником
   */
  handleRectangleSelection (data) {
    const { bounds } = data
    const state = this.gameEngine.state
    const entities = state.get('entities')
    const selections = state.get('selections')
    const maxGroupSize = GAME_CONFIG.LIMITS.maxGroupSize

    const entitiesInRect = []
    for (const [id, entity] of entities) {
      if (this._isEntityInBounds(entity, bounds)) {
        // Добавляем только юниты игрока
        if (this._isPlayerUnit(entity)) {
          entitiesInRect.push(id)
        }
      }
    }

    const limitedEntities = entitiesInRect.slice(0, maxGroupSize)

    for (const id of limitedEntities) {
      selections.add(id)
    }

    state.merge({ selections }, 'selectionsChanged')
    this.selectionIndicator.updateIndicators(selections)
    return limitedEntities.length
  }

  selectEntity (entityId, isMultiSelect = false) {
    const state = this.gameEngine.state
    const selections = state.get('selections')

    if (selections.has(entityId)) return true

    if (selections.size >= GAME_CONFIG.LIMITS.maxGroupSize && !isMultiSelect) {
      return false
    }

    this.gameEngine.state.emit('selectEntity', {
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
      if (this.selectionIndicator) {
        this.selectionIndicator.updateIndicators(selections)
      }
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
      if (this.selectionIndicator) {
        this.selectionIndicator.updateIndicators(selections)
      }
      return true
    }
    return false
  }

  selectAllPlayerUnits () {
    const state = this.gameEngine.state
    const selections = state.get('selections')
    const maxGroupSize = GAME_CONFIG.LIMITS.maxGroupSize

    const playerUnits = this._getIndex('faction', 'Player')
    let count = 0
    for (const id of playerUnits) {
      if (count >= maxGroupSize) break
      if (!selections.has(id)) {
        selections.add(id)
        count++
      }
    }

    state.merge({ selections }, 'selectionsChanged')
    if (this.selectionIndicator) {
      this.selectionIndicator.updateIndicators(selections)
    }
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
    if (this.selectionIndicator) {
      this.selectionIndicator.updateIndicators(selections)
    }
    return limitedEntities.length
  }

  _isEntityInBounds (entity, bounds) {
    if (!entity) return false

    // Используем gameX/gameY из state.entities (координаты в игровом мире)
    // и преобразуем их в экранные координаты
    const gameX = entity.gameX ?? entity.position?.x ?? 0
    const gameY = entity.gameY ?? entity.position?.y ?? 0

    const { x: scaleX, y: scaleY } = this._getScale()
    const entityScreenX = gameX * scaleX
    const entityScreenY = gameY * scaleY

    return entityScreenX >= bounds.x &&
           entityScreenY >= bounds.y &&
           entityScreenX <= bounds.x + bounds.width &&
           entityScreenY <= bounds.y + bounds.height
  }

  selectSameType (entityId) {
    const state = this.gameEngine.state
    const selections = state.get('selections')
    const maxGroupSize = GAME_CONFIG.LIMITS.maxGroupSize

    const entity = this.gameEngine.state.get('entities').get(entityId)
    if (!entity) return 0

    const targetType = entity.vehicleType || entity.type
    const sameTypeEntities = this._getIndex('type', targetType)

    let count = 0
    for (const id of sameTypeEntities) {
      if (count >= maxGroupSize) break
      if (!selections.has(id)) {
        selections.add(id)
        count++
      }
    }

    state.merge({ selections }, 'selectionsChanged')
    if (this.selectionIndicator) {
      this.selectionIndicator.updateIndicators(selections)
    }
    return count
  }

  setGroupTarget (gameX, gameY) {
    const state = this.gameEngine.state
    const selections = state.get('selections')

    this.gameEngine.state.emit('groupTargetSet', {
      targetX: gameX,
      targetY: gameY,
      selections: Array.from(selections)
    })
  }

  updateIndicators (selections) {
    if (this.selectionIndicator) {
      this.selectionIndicator.updateIndicators(selections)
    }
  }

  update (_dt) {
    this._buildIndices()
  }

  render () {}

  destroy () {
    if (this.isDestroyed) return
    this.isDestroyed = true

    if (this.selectionIndicator) {
      this.selectionIndicator.destroy()
    }

    this.selectionIndicator = null
    this.entityService = null
    this.gameEngine = null
  }
}

export function createSelectionSystem (gameEngine) {
  return new SelectionSystem(gameEngine)
}
