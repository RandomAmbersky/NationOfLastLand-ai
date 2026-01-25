import { calculateDistance } from './utils.js'

/**
 * Сервис для работы с сущностями игры
 */
export class EntityService {
  constructor (gameDemo) {
    this.gameDemo = gameDemo
  }

  /**
     * Находит базу игрока
     * @returns {Object|null} Сущность базы игрока или null, если не найдена
     */
  findPlayerBase () {
    for (const [, entity] of this.gameDemo.entities) {
      if (entity.fraction === 'Player' && entity.entityType === 'base') {
        return entity
      }
    }
    return null
  }

  /**
     * Проверяет, выбрана ли база игрока
     * @returns {boolean} true, если выбрана база игрока
     */
  isPlayerBaseSelected () {
    for (const entityId of this.gameDemo.selectedEntityIds) {
      const entity = this.gameDemo.entities.get(entityId)
      if (entity && entity.entityType === 'base' && entity.fraction === 'Player') {
        return true
      }
    }
    return false
  }

  /**
     * Находит сущность по типу и фракции
     * @param {string} entityType - Тип сущности
     * @param {string} faction - Фракция сущности
     * @returns {Array} Массив сущностей, соответствующих критериям
     */
  findEntitiesByTypeAndFaction (entityType, faction) {
    const result = []
    for (const [, entity] of this.gameDemo.entities) {
      if (entity.entityType === entityType && entity.fraction === faction) {
        result.push(entity)
      }
    }
    return result
  }

  /**
     * Находит все подвижные юниты игрока
     * @returns {Array} Массив сущностей подвижных юнитов игрока
     */
  findAllPlayerMovableUnits () {
    const result = []
    for (const [, entity] of this.gameDemo.entities) {
      if (entity.fraction === 'Player' && entity.entityType === 'vehicle') {
        result.push(entity)
      }
    }
    return result
  }

  /**
     * Находит сущности в радиусе от указанной позиции
     * @param {number} x - Координата X центра
     * @param {number} y - Координата Y центра
     * @param {number} radius - Радиус поиска
     * @param {function} filterFn - Функция фильтрации сущностей
     * @returns {Array} Массив сущностей в радиусе
     */
  findEntitiesInRadius (x, y, radius, filterFn = null) {
    const result = []
    for (const [, entity] of this.gameDemo.entities) {
      if (filterFn && !filterFn(entity)) continue

      const distance = calculateDistance(entity.gameX, entity.gameY, x, y)

      if (distance <= radius) {
        result.push(entity)
      }
    }
    return result
  }

  /**
     * Получает сущность по ID
     * @param {number} entityId - ID сущности
     * @returns {Object|null} Сущность или null, если не найдена
     */
  getEntityById (entityId) {
    return this.gameDemo.entities.get(entityId) || null
  }

  /**
     * Проверяет существование сущности
     * @param {number} entityId - ID сущности
     * @returns {boolean} true, если сущность существует
     */
  entityExists (entityId) {
    return this.gameDemo.entities.has(entityId)
  }
}
