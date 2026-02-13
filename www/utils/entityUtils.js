/**
 * Entity utilities - Pure functions for entity operations
 * No game engine dependencies
 */

/**
 * Create entity data from raw data
 * @param {Object} entityData - Raw entity data
 * @returns {Object} Normalized entity object
 */
export function createEntityData(entityData) {
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
 * Find player's base in entities collection
 * @param {Map<number, Object>} entities - Entities Map
 * @returns {Object|null} Base entity or null
 */
export function findPlayerBase(entities) {
  for (const [, entity] of entities) {
    if (entity.entityType === 'base' && entity.fraction === 'Player') {
      return entity
    }
  }
  return null
}

/**
 * Check if player's base is in selection
 * @param {Set<number>} selections - Current selection set
 * @param {Map<number, Object>} entities - Entities Map
 * @returns {boolean}
 */
export function isPlayerBaseSelected(selections, entities) {
  for (const entityId of selections) {
    const entity = entities.get(entityId)
    if (entity && entity.entityType === 'base' && entity.fraction === 'Player') {
      return true
    }
  }
  return false
}

/**
 * Get entities by type
 * @param {Map<number, Object>} entities - Entities Map
 * @param {string} type - Entity type
 * @returns {Array<Object>} Array of entities
 */
export function getEntitiesByType(entities, type) {
  const result = []
  for (const [, entity] of entities) {
    if (entity.entityType === type) {
      result.push(entity)
    }
  }
  return result
}

/**
 * Get entities by fraction
 * @param {Map<number, Object>} entities - Entities Map
 * @param {string} fraction - Fraction name
 * @returns {Array<Object>} Array of entities
 */
export function getEntitiesByFraction(entities, fraction) {
  const result = []
  for (const [, entity] of entities) {
    if (entity.fraction === fraction) {
      result.push(entity)
    }
  }
  return result
}

/**
 * Check if entity exists
 * @param {Map<number, Object>} entities - Entities Map
 * @param {number} entityId - Entity ID
 * @returns {boolean}
 */
export function entityExists(entities, entityId) {
  return entities.has(entityId)
}

/**
 * Check if entity can move
 * @param {Object} entity - Entity object
 * @returns {boolean}
 */
export function canMove(entity) {
  // Базы не могут двигаться
  if (entity.entityType === 'base') return false
  // Алерты не могут двигаться
  if (entity.entityType === 'alert') return false
  // Если есть флаг movement, проверяем его
  if (entity.movement && entity.movement.canMove === false) return false
  // По умолчанию юниты могут двигаться
  return true
}

/**
 * Check if entity is a player unit
 * @param {Object} entity - Entity object
 * @returns {boolean}
 */
export function isPlayerUnit(entity) {
  return entity.fraction === 'Player' && entity.entityType !== 'base'
}
