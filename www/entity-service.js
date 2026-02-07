// import { GAME_CONFIG } from './game-config.js'

/**
 * Сервис для работы с сущностями игры
 */
export class EntityService {
  constructor (gameDemo) {
    this.gameDemo = gameDemo
    this.isDestroyed = false
  }

  /**
   * Cleanup метод для очистки ресурсов
   */
  destroy () {
    if (this.isDestroyed) return
    this.isDestroyed = true

    // Очистка ссылок
    this.gameDemo = null
  }

  /**
   * Создание сущности из данных
   */
  createEntity (entityData) {
    // Определяем тип сущности и подтип
    let vehicleType = 'scout' // По умолчанию
    const entityType = entityData.entity_type || 'vehicle'
    const fraction = entityData.fraction || null

    if (entityData.subtype) {
      // Проверяем, содержит ли subtype '_' - это указывает на алерт/развернутую единицу
      if (entityData.subtype.includes('_')) {
        // Сохраняем полный subtype для отображения (обрабатывает алерты, развернутые враги и т.д.)
        vehicleType = entityData.subtype
      } else {
        // Стандартный subtype без подчеркивания
        switch (entityData.subtype) {
          case 'Scout Car':
            vehicleType = 'scout'
            break
          case 'Heavy Tank':
            vehicleType = 'tank'
            break
          case 'Armored Truck':
            vehicleType = 'transport'
            break
          case 'raider':
          case 'hostile':
          case 'static':
            vehicleType = entityData.subtype
            break
          default:
            vehicleType = 'scout'
        }
      }
    }

    // Создаем объект сущности с координатами игры
    // Rust serializes position tuple (f32, f32) as array [x, y]
    const posX =
      entityData.position && Array.isArray(entityData.position)
        ? entityData.position[0]
        : (entityData.position?.x ?? 0)
    const posY =
      entityData.position && Array.isArray(entityData.position)
        ? entityData.position[1]
        : (entityData.position?.y ?? 0)

    return {
      id: entityData.id,
      entityType,
      vehicleType,
      fraction,
      gameX: posX,
      gameY: posY,
      // Добавляем остальные свойства из данных
      ...entityData
    }
  }

  /**
   * Поиск базы игрока
   */
  findPlayerBase () {
    const entitiesState = this.gameDemo.stateManager.getEntityState()

    for (const [_, entity] of entitiesState.entities) {
      if (entity.entityType === 'base' && entity.fraction === 'Player') {
        return entity
      }
    }
    return null
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
   * Получение сущностей по типу
   */
  getEntitiesByType (type) {
    const entitiesState = this.gameDemo.stateManager.getEntityState()
    const result = []

    for (const [_, entity] of entitiesState.entities) {
      if (entity.entityType === type) {
        result.push(entity)
      }
    }

    return result
  }

  /**
   * Получение сущностей по фракции
   */
  getEntitiesByFraction (fraction) {
    const entitiesState = this.gameDemo.stateManager.getEntityState()
    const result = []

    for (const [_, entity] of entitiesState.entities) {
      if (entity.fraction === fraction) {
        result.push(entity)
      }
    }

    return result
  }

  /**
   * Проверка существования сущности
   */
  entityExists (entityId) {
    const entitiesState = this.gameDemo.stateManager.getEntityState()
    return entitiesState.entities.has(entityId)
  }
}
