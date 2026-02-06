/**
 * Централизованный менеджер состояния игры
 * Отвечает за управление состоянием всех компонентов игры
 */
export class CoreStateManager {
  constructor () {
    // Состояния игры
    this.gameState = {
      isInitialized: false,
      autoUpdateEnabled: false,
      lastUpdate: Date.now(),
      time: 0,
      entitiesCount: 0,
      alertsCount: 0
    }

    // Состояния выделения
    this.selectionState = {
      selectedEntityIds: new Set(),
      selectedEntities: new Map()
    }

    // Состояния сущностей
    this.entityState = {
      entities: new Map(),
      bases: new Map()
    }

    // Состояния отображения
    this.displayState = {
      statusMessage: 'Ready to initialize...',
      entityInfo: null,
      targetIndicator: null
    }

    // Словарь обработчиков событий
    this.eventHandlers = new Map()
  }

  // Обновление игрового состояния
  updateGameState (newState) {
    // console.log("updateGameState: setting newState =", newState);
    Object.assign(this.gameState, newState)
    // console.log(
    // "updateGameState: after assign, autoUpdateEnabled =",
    // this.gameState.autoUpdateEnabled,
    // );
    this.emit('gameStateUpdated', this.gameState)
  }

  // Обновление состояния выделения
  updateSelectionState (selectedIds, removedIds = []) {
    // Удаление устаревших сущностей
    for (const id of removedIds) {
      this.selectionState.selectedEntityIds.delete(id)
      this.selectionState.selectedEntities.delete(id)
    }

    // Добавление новых сущностей
    for (const id of selectedIds) {
      this.selectionState.selectedEntityIds.add(id)
    }

    // Передаем копию состояния, чтобы избежать мутирующих изменений
    this.emit('selectionUpdated', {
      selectedEntityIds: new Set(this.selectionState.selectedEntityIds),
      selectedEntities: new Map(this.selectionState.selectedEntities)
    })
  }

  // Обновление состояния сущностей (старая версия для массивов)
  updateEntityState (entities) {
    this.entityState.entities.clear()
    for (const entity of entities) {
      this.entityState.entities.set(entity.id, entity)
    }
    this.emit('entitiesUpdated', this.entityState.entities)
  }

  // Обновление одной сущности (используется при создании через entityService)
  updateEntityStateEntry (entity) {
    this.entityState.entities.set(entity.id, entity)
    this.emit('entitiesUpdated', this.entityState.entities)
  }

  // Обновление отображения
  updateDisplayState (newState) {
    Object.assign(this.displayState, newState)
    this.emit('displayUpdated', this.displayState)
  }

  // Получение состояния
  getGameState () {
    return { ...this.gameState }
  }

  getSelectionState () {
    return {
      ...this.selectionState,
      selectedEntityIds: new Set(this.selectionState.selectedEntityIds)
    }
  }

  getEntityState () {
    const result = {
      ...this.entityState,
      entities: new Map(this.entityState.entities),
      bases: new Map(this.entityState.bases)
    }
    return result
  }

  getDisplayState () {
    return { ...this.displayState }
  }

  // Методы для работы с событиями
  on (event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event).push(handler)
  }

  off (event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event)
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  emit (event, data) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event)
      handlers.forEach((handler) => handler(data))
    }
  }

  // Сброс состояния
  reset () {
    this.gameState = {
      isInitialized: false,
      autoUpdateEnabled: false,
      lastUpdate: Date.now(),
      time: 0,
      entitiesCount: 0,
      alertsCount: 0
    }

    this.selectionState = {
      selectedEntityIds: new Set(),
      selectedEntities: new Map()
    }

    this.entityState = {
      entities: new Map(),
      bases: new Map()
    }

    this.displayState = {
      statusMessage: 'Ready to initialize...',
      entityInfo: null,
      targetIndicator: null
    }

    this.emit('stateReset', {})
  }
}
