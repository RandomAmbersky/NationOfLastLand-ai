/**
 * Selection System - Handles entity selection and group management
 * Extracted from original SelectionManager for better separation of concerns
 * Implements rules from units_moving_rules.md
 */

import { GAME_CONFIG } from '../config/game-config.js'
import { SelectionIndicator } from '../services/SelectionIndicator.js'
import { createRepository } from '../core/EntityRepository.js'
import { canMove, isPlayerUnit } from '../utils/entity-utils.js'

export class SelectionSystem {
  constructor(gameEngine) {
    this.gameEngine = gameEngine
    this.selectionIndicator = null
    this.repository = null
    this.transformer = null
    this.isDestroyed = false
  }

  setTransformer (transformer) {
    this.transformer = transformer
  }

  init(app) {
    this.app = app
    // Получаем rendererSystem из gameEngine (устанавливается при инициализации RendererSystem)
    this.rendererSystem = this.gameEngine.rendererSystem || null
    this.selectionIndicator = new SelectionIndicator(this.gameEngine, this.rendererSystem)
    this.repository = createRepository(this.gameEngine.state)
    // Get transformer from RendererSystem or GameEngine
    if (this.rendererSystem && this.rendererSystem.transformer) {
      this.transformer = this.rendererSystem.transformer
    } else if (this.gameEngine && this.gameEngine.transformer) {
      this.transformer = this.gameEngine.transformer
    }
  }

  /**
   * Проверяет, может ли юнит двигаться
   */
  _canMove(entity) {
    return canMove(entity)
  }

  /**
   * Проверяет, принадлежит ли юнит игроку
   */
  _isPlayerUnit(entity) {
    return isPlayerUnit(entity)
  }

  /**
   * Обработка клика по юниту (правила из units_moving_rules.md)
   */
  handleEntityClicked(data) {
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

    // Правило 1: Если ничего не выбрано - просто выбираем юнит
    if (selections.size === 0) {
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator.updateIndicators(selections)
      return
    }

    // Правило 8: Если выбран юнит фракции не игрока и происходит клик по другому юниту
    const firstSelectedId = Array.from(selections)[0]
    const firstSelectedEntity = entities.get(firstSelectedId)

    if (firstSelectedEntity && !this._isPlayerUnit(firstSelectedEntity)) {
      selections.clear()
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator.updateIndicators(selections)
      return
    }

    // Правило 7: Если выбран юнит игрока который не может двигаться и происходит клик на другом юните
    if (firstSelectedEntity && this._isPlayerUnit(firstSelectedEntity) && !this._canMove(firstSelectedEntity)) {
      // Если кликнули на другого юнита - сбрасываем и выбираем нового
      if (entityId !== firstSelectedId) {
        selections.clear()
        selections.add(entityId)
        state.merge({ selections }, 'selectionsChanged')
        this.selectionIndicator.updateIndicators(selections)
        return
      }
    }

    // Правило 6: Если выбран один подвижный юнит или группа подвижных юнитов игрока
    // и происходит клик на юните принадлежащем не фракции игрока - он назначается целью
    const allSelectedCanMove = Array.from(selections).every(id => {
      const entity = entities.get(id)
      return entity && this._canMove(entity)
    })

    if (allSelectedCanMove && !this._isPlayerUnit(clickedEntity)) {
      state.emit('groupTargetSet', { targetX: gameX, targetY: gameY, selections: Array.from(selections) })
      return
    }

    // Правило 4: При групповом выделении должны выбираться только юниты игрока и только те которые могут двигаться
    if (isMultiSelect) {
      // Добавляем только юниты игрока, которые могут двигаться
      if (this._isPlayerUnit(clickedEntity) && this._canMove(clickedEntity)) {
        if (selections.size < GAME_CONFIG.LIMITS.maxGroupSize) {
          selections.add(entityId)
          state.merge({ selections }, 'selectionsChanged')
          this.selectionIndicator.updateIndicators(selections)
        }
      }
      return
    }

    // Если кликнули на уже выбранный юнит - ничего не делаем
    if (selections.has(entityId)) {
      return
    }

    // Правило 2: Если в группе выбран только один юнит и клик по другому юниту игрока
    if (selections.size === 1 && this._isPlayerUnit(clickedEntity) && this._canMove(clickedEntity)) {
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator.updateIndicators(selections)
      return
    }

    // Если кликнули на юнита не игрока и он не может быть целью (нет подвижных юнитов в выделении)
    if (!this._isPlayerUnit(clickedEntity)) {
      selections.clear()
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator.updateIndicators(selections)
      return
    }

    // Правило 8: Если выбран юнит не игрока и кликнули на другого - сбрасываем и выбираем нового
    if (!this._isPlayerUnit(firstSelectedEntity)) {
      selections.clear()
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator.updateIndicators(selections)
      return
    }
  }

  /**
   * Обработка клика правой кнопкой мыши на юните
   */
  handleEntitySelected(data) {
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
  handleSelectionCleared() {
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
  handleRectangleSelection(data) {
    const { bounds } = data
    const state = this.gameEngine.state
    const entities = state.get('entities')
    const selections = state.get('selections')
    const maxGroupSize = GAME_CONFIG.LIMITS.maxGroupSize

    // Правило 4: при групповом выделении должны выбираться только юниты игрока и только те которые могут двигаться
    // Если в выделении есть юниты чужой фракции, сбрасываем выделение перед новым выбором
    const firstSelectedId = Array.from(selections)[0]
    const firstSelectedEntity = firstSelectedId ? entities.get(firstSelectedId) : null
    if (firstSelectedEntity && !this._isPlayerUnit(firstSelectedEntity)) {
      selections.clear()
    }

    let addedCount = 0
    for (const [id, entity] of entities) {
      if (this._isEntityInBounds(entity, bounds)) {
        // Добавляем только юниты игрока, которые могут двигаться
        if (this._isPlayerUnit(entity) && this._canMove(entity) && !selections.has(id)) {
          if (selections.size + addedCount >= maxGroupSize) break
          selections.add(id)
          addedCount++
        }
      }
    }

    if (addedCount > 0) {
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator.updateIndicators(selections)
    }
    return addedCount
  }

  selectEntity(entityId, isMultiSelect = false) {
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

  deselectEntity(entityId) {
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

  clearAll() {
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

  selectAllPlayerUnits() {
    const state = this.gameEngine.state
    const selections = state.get('selections')
    const maxGroupSize = GAME_CONFIG.LIMITS.maxGroupSize
    const entities = state.get('entities')

    let count = 0
    for (const [id, entity] of entities) {
      if (count >= maxGroupSize) break
      if (!selections.has(id) && this._isPlayerUnit(entity) && this._canMove(entity)) {
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

  selectEntitiesInRectangle(bounds) {
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

  _isEntityInBounds(entity, bounds) {
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

  _getScale() {
    if (!this.transformer) return { x: 1, y: 1 }
    return this.transformer.getScale()
  }

  setGroupTarget(gameX, gameY) {
    const state = this.gameEngine.state
    const selections = state.get('selections')

    this.gameEngine.state.emit('groupTargetSet', {
      targetX: gameX,
      targetY: gameY,
      selections: Array.from(selections)
    })
  }

  updateIndicators(selections) {
    if (this.selectionIndicator) {
      this.selectionIndicator.updateIndicators(selections)
    }
  }

  update(_dt) {}

  render() {}

  destroy() {
    if (this.isDestroyed) return
    this.isDestroyed = true

    if (this.selectionIndicator) {
      this.selectionIndicator.destroy()
    }

    this.selectionIndicator = null
    this.repository = null
    this.transformer = null
    this.gameEngine = null
  }
}

export function createSelectionSystem(gameEngine) {
  return new SelectionSystem(gameEngine)
}
