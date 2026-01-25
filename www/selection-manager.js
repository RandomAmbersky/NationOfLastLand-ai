import { select_entity, deselect_entity, clear_selection, handle_entity_selection } from './wasm-imports.js'
import { GAME_CONFIG } from './game-config.js'
import { SelectionIndicatorManager } from './selection-indicator.js'
import { EntityService } from './entity-service.js'
import { calculateDistance } from './utils.js'

/**
     * Управляет выделением сущностей
     */
export class SelectionManager {
  constructor (gameDemo) {
    this.gameDemo = gameDemo
    this.isSelecting = false
    this.selectionIndicatorManager = new SelectionIndicatorManager(gameDemo)
    this.entityService = new EntityService(gameDemo)
  }

  async handleEntityClick (entityId, isMultiSelect, event) {
    const entity = this.gameDemo.entities.get(entityId)
    if (!entity) return

    if (this.isSelecting) return
    this.isSelecting = true

    try {
      const selectionResult = await this._performEntitySelection(entityId, isMultiSelect)

      if (selectionResult.success) {
        // Обрабатываем различные действия
        switch (selectionResult.action) {
          case 'EntitySelected':
            this.gameDemo.displayEntityInfo(entityId)
            break
          case 'EntityDeselected':
            if (selectionResult.selected_entities.length === 1) {
              this.gameDemo.displayEntityInfo(selectionResult.selected_entities[0])
            } else {
              this.gameDemo.updateEntityInfo(null)
            }
            break
          case 'GroupTargetAssigned':
            if (selectionResult.target_assigned) {
              this._showGroupTargetingIndicator(selectionResult.target_assigned)
            }
            break
          case 'SelectionCleared':
            this.gameDemo.updateEntityInfo(null)
            break
        }

        // Обновляем кнопки и статус
        this.gameDemo.updateSpawnButtonState()
        this.gameDemo.updateStatus(selectionResult.message)
      } else {
        this.gameDemo.updateStatus(`Ошибка выбора: ${selectionResult.message}`)
      }
    } catch (error) {
      console.error('Ошибка при выборе сущности:', error)
      this.gameDemo.updateStatus('Ошибка при выборе сущности')
    } finally {
      this.isSelecting = false
    }
  }

  _updateLocalSelectionState (selectionResult) {
    // Синхронизируем локальное состояние с состоянием из Rust
    const newSelectedIds = new Set(selectionResult.selected_entities)

    // Обновляем индикаторы выделения
    this.selectionIndicatorManager.updateSelectionIndicators(newSelectedIds)

    // Обновляем множество выбранных ID
    this.gameDemo.selectedEntityIds = newSelectedIds
  }

  _showGroupTargetingIndicator (targetAssignment) {
    const renderer = this.gameDemo.entityRenderer
    if (renderer.alertHighlight) {
      this.gameDemo.app.stage.removeChild(renderer.alertHighlight)
      renderer.alertHighlight = null
    }

    renderer.showTargetIndicator(targetAssignment.target_x, targetAssignment.target_y)

    const targetEntity = this.gameDemo.entities.get(targetAssignment.target_entity_id)
    const targetType = targetEntity ? (targetEntity.vehicleType || targetEntity.entityType) : 'unknown'
    const targetFaction = targetEntity ? (targetEntity.fraction || 'Unknown') : 'Unknown'

    this.gameDemo.updateStatus(`Группа атакует: ${targetType} (#${targetAssignment.target_entity_id}) ${targetFaction}`)
  }

  /**
     * Выполняет выбор сущности через handle_entity_selection и обновляет локальное состояние
     */
  async _performEntitySelection (entityId, isMultiSelect) {
    const currentSelectedIds = Array.from(this.gameDemo.selectedEntityIds)
    const result = await handle_entity_selection(entityId, isMultiSelect, currentSelectedIds)
    const selectionResult = JSON.parse(result)

    if (selectionResult.success) {
      // Обновляем локальное состояние на основе результата из Rust
      this._updateLocalSelectionState(selectionResult)
    }

    return selectionResult
  }

  selectEntity (entityId, bypassCheck = false, exclusive = true) {
    if (!bypassCheck && this.isSelecting) return false

    // Clear target indicator when selecting a new entity
    if (this.gameDemo.selectedEntityIds.size > 0 && !this.gameDemo.selectedEntityIds.has(entityId)) {
      this.gameDemo.entityRenderer.clearTargetIndicator()
    }

    if (this.gameDemo.selectedEntityIds.has(entityId)) return true

    if (this.gameDemo.selectedEntityIds.size >= GAME_CONFIG.LIMITS.maxGroupSize) {
      return false
    }

    try {
      const result = select_entity(entityId, exclusive)
      const selectionResult = JSON.parse(result)
      if (selectionResult.success) {
        this.gameDemo.selectedEntityIds.add(entityId)
        const entity = this.gameDemo.entities.get(entityId)
        if (entity) {
          // Все алерты подсвечиваются как враг
          const isAlert = entity.entityType === 'alert'
          const isEnemy = entity.fraction === 'Enemy' || entity.fraction === 'Wild' || isAlert
          this.selectionIndicatorManager.createSelectionIndicator(entity, isEnemy)
        }

        const count = this.gameDemo.selectedEntityIds.size
        if (count > 1) {
          this.gameDemo.updateStatus(`${count} юнитов выделено.`)
        }
        this.gameDemo.updateSpawnButtonState()
        // this.gameDemo.updateSelectedEntityInfo();
        return true
      }
      return false
    } catch {
      return false
    }
  }

  deselectEntity (entityId, bypassCheck = false) {
    if (!bypassCheck && this.isSelecting) return
    if (!this.gameDemo.selectedEntityIds.has(entityId)) return

    this.gameDemo.selectedEntityIds.delete(entityId)
    const entity = this.gameDemo.entities.get(entityId)
    if (entity && entity.selectionIndicator) {
      this.selectionIndicatorManager.removeSelectionIndicator(entity)
    }

    // Note: We no longer call deselect_entity API here since entity removal
    // is now handled automatically by the selection cleanup system
    // and communicated via the game state update

    this._updateSelectionStatus()
    // this.gameDemo.updateSelectedEntityInfo();
  }

  clearAllSelections (bypassCheck = false) {
    if (!bypassCheck && this.isSelecting) return

    try {
      const result = clear_selection()
      const clearResult = JSON.parse(result)
      if (!clearResult.success) {
        console.error('Не удалось очистить выделение на сервере:', clearResult.message)
      }
    } catch (error) {
      console.error('Ошибка очистки выделения на сервере:', error)
    }

    // Используем централизованный метод для очистки состояния
    // Получаем все текущие выделенные сущности и очищаем их
    const allSelected = Array.from(this.gameDemo.selectedEntityIds)
    this.gameDemo.updateSelectionState(allSelected)

    this.gameDemo.updateStatus('Выделение снято.')
    this.gameDemo.updateEntityInfo(null)
    this.gameDemo.updateSpawnButtonState()
  }

  async selectEntitiesInRectangle (bounds) {
    if (this.isSelecting) return

    this.isSelecting = true

    try {
      const entitiesInRectangle = this._findEntitiesInRectangle(bounds)
      if (entitiesInRectangle.length > 0) {
        await this._processRectangleSelection(entitiesInRectangle)
      }
    } finally {
      this.isSelecting = false
    }
  }

  _findEntitiesInRectangle (bounds) {
    const entities = []
    for (const [id, entity] of this.gameDemo.entities) {
      if (this._isEntityInBounds(entity, bounds)) {
        entities.push(id)
      }
    }
    return entities
  }

  _isEntityInBounds (entity, bounds) {
    return entity.container.x >= bounds.x &&
               entity.container.x <= bounds.x + bounds.width &&
               entity.container.y >= bounds.y &&
               entity.container.y <= bounds.y + bounds.height
  }

  async _processRectangleSelection (entitiesInRectangle) {
    this._clearAlertSelections()

    const playerMovableUnits = entitiesInRectangle.filter(id => {
      const entity = this.gameDemo.entities.get(id)
      return entity &&
                   entity.fraction === 'Player' &&
                   entity.entityType === 'vehicle'
    })

    if (playerMovableUnits.length === 0) {
      this.gameDemo.updateStatus('Нет подвижных юнитов игрока в области выделения')
      return
    }

    this.clearAllSelections(true)

    const maxSize = GAME_CONFIG.LIMITS.maxGroupSize
    const unitsToSelect = playerMovableUnits.slice(0, maxSize)

    // Используем handle_entity_selection для каждого юнита с isMultiSelect=true
    // чтобы получить правильное отображение группы
    for (const entityId of unitsToSelect) {
      try {
        const selectionResult = await this._performEntitySelection(entityId, true)
        if (selectionResult.success) {
          // Обрабатываем действия выбора для последнего выбранного юнита
          if (selectionResult.action === 'EntitySelected') {
            this.gameDemo.displayEntityInfo(entityId)
          }
        } else {
          console.warn(`Не удалось выбрать юнит ${entityId}:`, selectionResult.message)
        }
      } catch (error) {
        console.error('Ошибка при выборе сущности рамкой:', error)
      }
    }

    // Если выбран только один юнит, показываем его информацию
    if (this.gameDemo.selectedEntityIds.size === 1) {
      const selectedEntityId = Array.from(this.gameDemo.selectedEntityIds)[0]
      this.gameDemo.displayEntityInfo(selectedEntityId)
    }
  }

  _clearAlertSelections () {
    for (const entityId of this.gameDemo.selectedEntityIds) {
      const entity = this.gameDemo.entities.get(entityId)
      if (entity && entity.entityType === 'alert') {
        this.deselectEntity(entityId, true)
      }
    }
  }

  // Метод оставлен для совместимости, но теперь использует SelectionIndicatorManager
  _createSelectionIndicator (entity, isEnemy = false) {
    this.selectionIndicatorManager.createSelectionIndicator(entity, isEnemy)
  }

  _updateSelectionStatus () {
    const count = this.gameDemo.selectedEntityIds.size
    if (count === 0) {
      this.gameDemo.updateStatus('Выделение снято.')
      this.gameDemo.updateEntityInfo(null)
    } else {
      this.gameDemo.updateStatus(`${count} юнитов выделено.`)
    }
    this.gameDemo.updateSpawnButtonState()
  }

  /**
     * Выбрать всех подвижных юнитов игрока (с новой логикой группы)
     */
  async selectAllPlayerUnits () {
    this.clearAllSelections(true)

    // Собираем всех подвижных юнитов игрока
    const playerMovableUnits = []
    for (const [entityId, entity] of this.gameDemo.entities) {
      if (entity.fraction === 'Player' && entity.entityType === 'vehicle') {
        playerMovableUnits.push(entityId)
      }
    }

    if (playerMovableUnits.length === 0) {
      this.gameDemo.updateStatus('Нет доступных юнитов игрока')
      return
    }

    const maxSize = GAME_CONFIG.LIMITS.maxGroupSize
    const unitsToSelect = playerMovableUnits.slice(0, maxSize)

    // Используем handle_entity_selection для каждого юнита с isMultiSelect=true
    // чтобы получить правильное отображение группы
    for (const entityId of unitsToSelect) {
      try {
        const selectionResult = await this._performEntitySelection(entityId, true)
        if (!selectionResult.success) {
          console.warn(`Не удалось выбрать юнит ${entityId}:`, selectionResult.message)
        }
      } catch (error) {
        console.error('Ошибка при выборе всех юнитов:', error)
      }
    }
  }

  /**
     * Выбрать все юниты того же типа
     */
  selectSameTypeUnits (entityId) {
    const entity = this.gameDemo.entities.get(entityId)
    if (!entity) return

    const targetType = entity.vehicleType || entity.entityType
    const targetFaction = entity.fraction

    this.clearAllSelections(true)

    let addedCount = 0
    const maxSize = GAME_CONFIG.LIMITS.maxGroupSize

    for (const [id, ent] of this.gameDemo.entities) {
      if (this.gameDemo.selectedEntityIds.size >= maxSize) break
      const entityType = ent.vehicleType || ent.entityType
      if (entityType === targetType && ent.fraction === targetFaction) {
        if (this.selectEntity(id, true, false)) {
          addedCount++
        }
      }
    }

    this.gameDemo.updateStatus(`Выделено ${addedCount} юнитов типа ${targetType}`)
    // this.gameDemo.updateSelectedEntityInfo();
  }

  /**
     * Выбрать всех подвижных юнитов игрока у базы
     */
  selectAllPlayerUnitsAtBase () {
    // Find player base first
    const baseEntity = this.entityService.findPlayerBase()

    if (!baseEntity) {
      this.gameDemo.updateStatus('База игрока не найдена')
      return
    }

    this.clearAllSelections(true)

    // Select the base first
    for (const [entityId, entity] of this.gameDemo.entities) {
      if (entity.fraction === 'Player' && entity.entityType === 'base' && entity.id === baseEntity.id) {
        this.selectEntity(entityId, true, false)
        break
      }
    }

    // Then select all player vehicles
    let addedCount = 1 // Base is already selected
    const maxSize = GAME_CONFIG.LIMITS.maxGroupSize
    const baseRange = 100 // Units within 100 units of base

    for (const [entityId, entity] of this.gameDemo.entities) {
      if (this.gameDemo.selectedEntityIds.size >= maxSize) break
      if (entity.fraction === 'Player' && entity.entityType === 'vehicle') {
        const distance = calculateDistance(entity.gameX, entity.gameY, baseEntity.gameX, baseEntity.gameY)
        if (distance <= baseRange) {
          if (this.selectEntity(entityId, true, false)) {
            addedCount++
          }
        }
      }
    }

    this.gameDemo.updateStatus(`Выделено ${addedCount} юнитов у базы`)
    // this.gameDemo.updateSelectedEntityInfo();
  }
}
