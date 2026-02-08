import {
  clear_selection,
  handle_entity_selection,
  get_entity_info
} from './wasm-imports.js'
import { GAME_CONFIG } from './game-config.js'
import { SelectionIndicatorManager } from './selection-indicator.js'
import { EntityService } from './entity-service.js'
import { calculateDistance } from './utils.js'

/**
 * Управляет выделением сущностей
 * Merged functionality from BatchSelectionHelper and RectangleSelectionProcessor
 */
export class SelectionManager {
  constructor (gameDemo) {
    this.gameDemo = gameDemo
    this.isSelecting = false
    this.isDestroyed = false
    this.selectionIndicatorManager = new SelectionIndicatorManager(gameDemo)
    this.entityService = new EntityService(gameDemo)
  }

  /**
   * Cleanup метод для очистки ресурсов
   */
  destroy () {
    if (this.isDestroyed) return
    this.isDestroyed = true

    // Очистка selection indicator manager
    if (this.selectionIndicatorManager) {
      this.selectionIndicatorManager.destroy()
    }

    // Очистка ссылок
    this.gameDemo = null
    this.selectionIndicatorManager = null
    this.entityService = null
  }

  async handleEntityClick (entityId, isMultiSelect, _event) {
    const entity = this.gameDemo.stateManager
      .getEntityState()
      .entities.get(entityId)
    if (!entity) return

    if (this.isSelecting) return
    this.isSelecting = true

    try {
      const selectionResult = await this._performEntitySelection(
        entityId,
        isMultiSelect
      )

      if (selectionResult.success) {
        // Обрабатываем различные действия
        switch (selectionResult.action) {
          case 'EntitySelected':
            this.gameDemo.displayEntityInfo(entityId)
            break
          case 'EntityDeselected':
            if (selectionResult.selected_entities.length === 1) {
              this.gameDemo.displayEntityInfo(
                selectionResult.selected_entities[0]
              )
            } else {
              this.gameDemo.updateEntityInfo(null)
            }
            break
          case 'GroupTargetAssigned':
            if (selectionResult.target_assigned) {
              this._showGroupTargetingIndicator(
                selectionResult.target_assigned
              )
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

    // Получаем старые ID перед обновлением
    const oldSelectedIds = new Set(
      this.gameDemo.stateManager.getSelectionState().selectedEntityIds
    )

    // Обновляем индикаторы выделения
    this.selectionIndicatorManager.updateSelectionIndicators(newSelectedIds)

    // Вычисляем удаленные ID (были выбраны, но теперь не выбраны)
    const removedIds = []
    for (const id of oldSelectedIds) {
      if (!newSelectedIds.has(id)) {
        removedIds.push(id)
      }
    }

    // Вычисляем новые ID (не были выбраны, но теперь выбраны)
    const addedIds = []
    for (const id of newSelectedIds) {
      if (!oldSelectedIds.has(id)) {
        addedIds.push(id)
      }
    }

    // Обновляем множество выбранных ID через менеджер состояния
    this.gameDemo.stateManager.updateSelectionState(addedIds, removedIds)
  }

  _showGroupTargetingIndicator (targetAssignment) {
    const renderer = this.gameDemo.entityRenderer
    if (renderer.alertHighlight) {
      this.gameDemo.app.stage.removeChild(renderer.alertHighlight)
      renderer.alertHighlight = null
    }

    renderer.showTargetIndicator(
      targetAssignment.target_x,
      targetAssignment.target_y
    )

    const targetEntity = this.gameDemo.stateManager
      .getEntityState()
      .entities.get(targetAssignment.target_entity_id)
    const targetType = targetEntity
      ? targetEntity.vehicleType || targetEntity.entityType
      : 'unknown'
    const targetFaction = targetEntity
      ? targetEntity.fraction || 'Unknown'
      : 'Unknown'

    this.gameDemo.updateStatus(
      `Группа атакует: ${targetType} (#${targetAssignment.target_entity_id}) ${targetFaction}`
    )
  }

  /**
   * Выполняет выбор сущности через handle_entity_selection и обновляет локальное состояние
   */
  async _performEntitySelection (entityId, isMultiSelect) {
    const selectionState = this.gameDemo.stateManager.getSelectionState()
    const currentSelectedIds = Array.from(selectionState.selectedEntityIds)
    const result = await handle_entity_selection(
      entityId,
      isMultiSelect,
      currentSelectedIds
    )
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
    const selectionState = this.gameDemo.stateManager.getSelectionState()
    if (
      selectionState.selectedEntityIds.size > 0 &&
      !selectionState.selectedEntityIds.has(entityId)
    ) {
      this.gameDemo.entityRenderer.clearTargetIndicator()
    }

    if (selectionState.selectedEntityIds.has(entityId)) return true

    if (
      selectionState.selectedEntityIds.size >= GAME_CONFIG.LIMITS.maxGroupSize
    ) {
      return false
    }

    try {
      // Используем handle_entity_selection вместо select_entity
      // Это позволяет получить правильный список выделенных сущностей из Rust
      const currentSelectedIds = Array.from(selectionState.selectedEntityIds)
      const isMultiSelect = !exclusive
      const result = handle_entity_selection(
        entityId,
        isMultiSelect,
        currentSelectedIds
      )
      const selectionResult = JSON.parse(result)

      if (selectionResult.success) {
        // Обновляем локальное состояние на основе результата из Rust
        this._updateLocalSelectionState(selectionResult)
        return true
      }
      return false
    } catch (error) {
      console.error('Ошибка при выборе сущности:', error)
      return false
    }
  }

  deselectEntity (entityId, bypassCheck = false) {
    if (!bypassCheck && this.isSelecting) return
    const selectionState = this.gameDemo.stateManager.getSelectionState()
    if (!selectionState.selectedEntityIds.has(entityId)) return

    this.gameDemo.stateManager.updateSelectionState([], [entityId])
    const entity = this.gameDemo.stateManager
      .getEntityState()
      .entities.get(entityId)
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
        console.error(
          'Не удалось очистить выделение на сервере:',
          clearResult.message
        )
      }
    } catch (error) {
      console.error('Ошибка очистки выделения на сервере:', error)
    }

    // Используем централизованный метод для очистки состояния
    const selectionState = this.gameDemo.stateManager.getSelectionState()
    const allSelected = Array.from(selectionState.selectedEntityIds)

    // Обновляем состояние через менеджер
    this.gameDemo.stateManager.updateSelectionState([], allSelected)

    // Удаляем визуальные индикаторы для всех ранее выбранных сущностей
    for (const entityId of allSelected) {
      const entity = this.gameDemo.entities.get(entityId)
      if (entity && entity.selectionIndicator) {
        this.selectionIndicatorManager.removeSelectionIndicator(entity)
      }
    }

    this.gameDemo.updateStatus('Выделение снято.')
    this.gameDemo.updateEntityInfo(null)
    this.gameDemo.updateSpawnButtonState()
  }

  /**
   * Отображение информации о сущности
   */
  async displayEntityInfo (entityId) {
    try {
      // Используем централизованный метод для отображения информации
      const entitiesState = this.gameDemo.stateManager.getEntityState()
      const entityData = entitiesState.entities.get(entityId)

      if (!entityData) {
        this.gameDemo.updateEntityInfo('Entity no longer exists')
        return
      }

      // Ищем сущность в gameDemo.entities для получения container (данные рендеринга)
      const entityFromMap = this.gameDemo.entities.get(entityId)
      const entity = entityFromMap || entityData

      // Получаем информацию о сущности через WASM
      const result = get_entity_info(entityId)
      const entityInfo = JSON.parse(result)

      // Используем централизованную логику создания текста информации
      const isBase = entity && entity.entityType === 'base'
      const infoText = this.gameDemo.createEntityInfoText(entityInfo, isBase)

      // Обновляем отображение
      this.gameDemo.updateEntityInfo(infoText)

      // Добавляем индикатор информации
      if (
        entity &&
        entity.container &&
        !entity.selectionIndicator &&
        !entity.infoIndicator
      ) {
        const infoGraphics = new PIXI.Graphics()
        // Use blue color for info display (like alerts)
        infoGraphics.lineStyle(3, 0x0080ff, 1)
        infoGraphics.drawCircle(0, 0, 12)
        entity.container.addChild(infoGraphics)
        entity.infoIndicator = infoGraphics // Store reference to remove later
      }
    } catch (error) {
      console.error('Error getting entity info:', error)
      this.gameDemo.updateEntityInfo(
        `❌ Error loading entity info: ${error.message}`
      )
    }
  }

  // ========== Merged from BatchSelectionHelper ==========

  /**
   * Выбрать всех подвижных юнитов игрока
   */
  async selectAllPlayerUnits () {
    this.clearAllSelections(true)

    const entitiesState = this.gameDemo.stateManager.getEntityState()
    const playerMovableUnits = []
    for (const [entityId, entity] of entitiesState.entities) {
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
    let successCount = 0

    for (const entityId of unitsToSelect) {
      try {
        const selectionResult = await this._performEntitySelection(entityId, true)
        if (selectionResult.success) {
          successCount++
        }
      } catch (error) {
        console.error('Ошибка при выборе юнита:', error)
      }
    }

    if (successCount > 0) {
      this.gameDemo.updateStatus(`Выделено ${successCount} подвижных юнитов игрока`)
    }
  }

  // ========== Merged from RectangleSelectionProcessor ==========

  /**
   * Найти сущности в прямоугольной области
   */
  _findEntitiesInRectangle (bounds) {
    const entities = []
    console.log('=== DEBUG: Rectangle Selection ===')
    console.log('Rectangle bounds:', bounds)
    for (const [id, entity] of this.gameDemo.entities) {
      const isInBounds = this._isEntityInBounds(entity, bounds)
      console.log(
        `Entity ${id} (${entity.vehicleType}, ${entity.fraction}): container.x=${entity.container?.x}, container.y=${entity.container?.y}, inBounds=${isInBounds}`
      )
      if (isInBounds) {
        entities.push(id)
      }
    }
    console.log('Entities in rectangle:', entities)
    return entities
  }

  /**
   * Проверить, находится ли сущность в границах
   */
  _isEntityInBounds (entity, bounds) {
    const entityId = entity.id || entity.entityId
    const entityWithContainer = this.gameDemo.entities.get(entityId) || entity

    return (
      entityWithContainer.container &&
      entityWithContainer.container.x >= bounds.x &&
      entityWithContainer.container.x <= bounds.x + bounds.width &&
      entityWithContainer.container.y >= bounds.y &&
      entityWithContainer.container.y <= bounds.y + bounds.height
    )
  }

  /**
   * Обработать выделение прямоугольной областью
   */
  async _processRectangleSelection (entitiesInRectangle) {
    this._clearAlertSelections()

    console.log('=== DEBUG: Processing Rectangle Selection ===')
    console.log('Entities in rectangle (IDs):', entitiesInRectangle)

    const playerMovableUnits = entitiesInRectangle.filter((id) => {
      const entity = this.gameDemo.stateManager
        .getEntityState()
        .entities.get(id)
      console.log(
        `Entity ${id}: fraction=${entity?.fraction}, entityType=${entity?.entityType}, isPlayerUnit=${entity?.fraction === 'Player' && entity?.entityType === 'vehicle'}`
      )
      return (
        entity &&
        entity.fraction === 'Player' &&
        entity.entityType === 'vehicle'
      )
    })

    console.log('Player movable units (IDs):', playerMovableUnits)

    if (playerMovableUnits.length === 0) {
      this.gameDemo.updateStatus('Нет подвижных юнитов игрока в области выделения')
      return
    }

    this.clearAllSelections(true)
    console.log('=== DEBUG: After clearAllSelections ===')
    const selectionStateAfterClear = this.gameDemo.stateManager.getSelectionState()
    console.log('Selected entity IDs after clear:', Array.from(selectionStateAfterClear.selectedEntityIds))

    const maxSize = GAME_CONFIG.LIMITS.maxGroupSize
    const unitsToSelect = playerMovableUnits.slice(0, maxSize)

    for (const entityId of unitsToSelect) {
      try {
        const selectionResult = await this._performEntitySelection(entityId, true)
        if (selectionResult.success) {
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

    console.log('=== DEBUG: After Rectangle Selection ===')
    const selectionState = this.gameDemo.stateManager.getSelectionState()
    console.log('Selected entity IDs:', Array.from(selectionState.selectedEntityIds))

    if (selectionState.selectedEntityIds.size === 1) {
      const selectedEntityId = Array.from(selectionState.selectedEntityIds)[0]
      this.gameDemo.displayEntityInfo(selectedEntityId)
    }
  }

  /**
   * Очистить выделение алертов
   */
  _clearAlertSelections () {
    const selectionState = this.gameDemo.stateManager.getSelectionState()
    for (const entityId of selectionState.selectedEntityIds) {
      const entity = this.gameDemo.stateManager.getEntityState().entities.get(entityId)
      if (entity && entity.entityType === 'alert') {
        this.deselectEntity(entityId, true)
      }
    }
  }

  _updateSelectionStatus () {
    const selectionState = this.gameDemo.stateManager.getSelectionState()
    const count = selectionState.selectedEntityIds.size
    if (count === 0) {
      this.gameDemo.updateStatus('Выделение снято.')
      this.gameDemo.updateEntityInfo(null)
    } else {
      this.gameDemo.updateStatus(`${count} юнитов выделено.`)
    }
    this.gameDemo.updateSpawnButtonState()
  }

  /**
   * Проверка, выбрана ли база игрока
   */
  isPlayerBaseSelected () {
    const selectionState = this.gameDemo.stateManager.getSelectionState()
    const entitiesState = this.gameDemo.stateManager.getEntityState()

    for (const entityId of selectionState.selectedEntityIds) {
      const entity = entitiesState.entities.get(entityId)
      if (
        entity &&
        entity.entityType === 'base' &&
        entity.fraction === 'Player'
      ) {
        return true
      }
    }
    return false
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
    const entitiesState = this.gameDemo.stateManager.getEntityState()
    for (const [entityId, entity] of entitiesState.entities) {
      if (
        entity.fraction === 'Player' &&
        entity.entityType === 'base' &&
        entity.id === baseEntity.id
      ) {
        this.selectEntity(entityId, true, false)
        break
      }
    }

    // Then select all player vehicles
    let addedCount = 1 // Base is already selected
    const maxSize = GAME_CONFIG.LIMITS.maxGroupSize
    const baseRange = 100 // Units within 100 units of base

    for (const [entityId, entity] of entitiesState.entities) {
      if (
        this.gameDemo.stateManager.getSelectionState().selectedEntityIds.size >=
        maxSize
      ) { break }
      if (entity.fraction === 'Player' && entity.entityType === 'vehicle') {
        const distance = calculateDistance(
          entity.gameX,
          entity.gameY,
          baseEntity.gameX,
          baseEntity.gameY
        )
        if (distance <= baseRange) {
          if (this.selectEntity(entityId, true, false)) {
            addedCount++
          }
        }
      }
    }

    this.gameDemo.updateStatus(`Выделено ${addedCount} юнитов у базы`)
  }

  /**
   * Выбрать все юниты того же типа
   */
  selectSameTypeUnits (entityId) {
    const entity = this.gameDemo.stateManager
      .getEntityState()
      .entities.get(entityId)
    if (!entity) return

    const targetType = entity.vehicleType || entity.entityType
    const targetFaction = entity.fraction

    // Проверяем, является ли юнит юнитом игрока
    const isPlayerUnit =
      entity.fraction === 'Player' || entity.fraction === 'PlayerBase'

    // Правило: при групповом выделении выбираются только юниты игрока
    // Если кликнули на юните не игрока - просто выбираем этот юнит, а не группу
    if (!isPlayerUnit) {
      this.clearAllSelections(true)
      this.selectEntity(entityId, true, true)
      this.gameDemo.updateStatus(`Выделен юнит ${targetType}`)
      return
    }

    // Юнит игрока - выбираем всех подвижных юнитов игрока того же типа
    this.clearAllSelections(true)

    let addedCount = 0
    const maxSize = GAME_CONFIG.LIMITS.maxGroupSize
    const entitiesState = this.gameDemo.stateManager.getEntityState()

    for (const [id, ent] of entitiesState.entities) {
      if (
        this.gameDemo.stateManager.getSelectionState().selectedEntityIds.size >=
        maxSize
      ) { break }
      // Выбираем только юниты игрока (не enemy/wild/alert)
      // Проверяем что это vehicle (подвижный юнит)
      if (ent.fraction === 'Player' && ent.entityType === 'vehicle') {
        if (this.selectEntity(id, true, false)) {
          addedCount++
        }
      }
    }

    // Если не выбрано ни одного подвижного юнита (возможно кликнули на базу),
    // то выбираем только её
    const selectionState = this.gameDemo.stateManager.getSelectionState()
    if (addedCount === 0) {
      // Выбираем исходный юнит (базу)
      this.selectEntity(entityId, true, true)
      this.gameDemo.updateStatus('Выбрана база')
    } else {
      this.gameDemo.updateStatus(
        `Выделено ${addedCount} подвижных юнитов игрока`
      )
    }
  }
}
