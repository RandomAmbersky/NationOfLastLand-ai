// import { GAME_CONFIG } from './game-config.js'

/**
 * Сервис для работы с сущностями игры
 */
export class EntityService {
  constructor (gameEngine) {
    this.gameEngine = gameEngine
    this.isDestroyed = false
  }

  /**
   * Cleanup метод для очистки ресурсов
   */
  destroy () {
    if (this.isDestroyed) return
    this.isDestroyed = true

    // Очистка ссылок
    this.gameEngine = null
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
     // Rust Position struct serializes as { x, y } object or array [x, y]
     let posX = 0
     let posY = 0
     if (entityData.position) {
       if (Array.isArray(entityData.position)) {
         posX = entityData.position[0] ?? 0
         posY = entityData.position[1] ?? 0
       } else {
         posX = entityData.position.x ?? 0
         posY = entityData.position.y ?? 0
       }
     }

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
    const entities = this.gameEngine.state.get('entities')

    for (const [_, entity] of entities) {
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
    const selectionState = this.gameEngine.state.get('selection')
    const entities = this.gameEngine.state.get('entities')

    for (const entityId of selectionState.selectedEntityIds) {
      const entity = entities.get(entityId)
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
    const entities = this.gameEngine.state.get('entities')
    const result = []

    for (const [_, entity] of entities) {
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
    const entities = this.gameEngine.state.get('entities')
    const result = []

    for (const [_, entity] of entities) {
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
    const entities = this.gameEngine.state.get('entities')
    return entities.has(entityId)
  }
}
