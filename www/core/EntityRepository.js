/**
 * Entity Repository - Centralized access to game entities
 * Provides clean abstraction over the Map-based entity storage
 */

export class EntityRepository {
  constructor(stateContainer, key = 'entities') {
    this.state = stateContainer
    this.key = key
  }

  /**
   * Get entities map from state
   * @returns {Map<number, Object>} Map of entities
   */
  getEntities() {
    const entities = this.state.get(this.key)
    if (!(entities instanceof Map)) {
      return new Map()
    }
    return entities
  }

  /**
   * Get a single entity by ID
   * @param {number} id - Entity ID
   * @returns {Object|null} Entity object or null
   */
  getById(id) {
    return this.getEntities().get(id) || null
  }

  /**
   * Check if entity exists
   * @param {number} id - Entity ID
   * @returns {boolean}
   */
  has(id) {
    return this.getEntities().has(id)
  }

  /**
   * Get entities by type
   * @param {string} type - Entity type (vehicle, base, alert)
   * @returns {Array<Object>} Array of entities
   */
  getByType(type) {
    const entities = this.getEntities()
    const result = []
    for (const [, entity] of entities) {
      if (entity.entityType === type || entity.type === type) {
        result.push(entity)
      }
    }
    return result
  }

  /**
   * Get entities by fraction/faction
   * @param {string} fraction - Faction name (Player, Enemy, Neutral, Wild)
   * @returns {Array<Object>} Array of entities
   */
  getByFraction(fraction) {
    const entities = this.getEntities()
    const result = []
    for (const [, entity] of entities) {
      if (entity.fraction === fraction) {
        result.push(entity)
      }
    }
    return result
  }

  /**
   * Get entities by type and fraction
   * @param {string} type - Entity type
   * @param {string} fraction - Faction name
   * @returns {Array<Object>} Array of entities
   */
  getByTypeAndFraction(type, fraction) {
    const entities = this.getEntities()
    const result = []
    for (const [, entity] of entities) {
      const typeMatch = entity.entityType === type || entity.type === type
      const fractionMatch = entity.fraction === fraction
      if (typeMatch && fractionMatch) {
        result.push(entity)
      }
    }
    return result
  }

  /**
   * Find first entity matching filter
   * @param {Object} filter - Filter object with type/fraction properties
   * @returns {Object|null} First matching entity or null
   */
  find(filter) {
    const entities = this.getEntities()
    for (const [, entity] of entities) {
      if (this._matchesFilter(entity, filter)) {
        return entity
      }
    }
    return null
  }

  /**
   * Find player's base
   * @returns {Object|null} Base entity or null
   */
  findPlayerBase() {
    return this.find({ type: 'base', fraction: 'Player' })
  }

  /**
   * Get all player units that can move
   * @returns {Array<Object>} Array of movable player units
   */
  getMovablePlayerUnits() {
    const entities = this.getEntities()
    const result = []
    for (const [, entity] of entities) {
      if (
        entity.fraction === 'Player' &&
        entity.entityType !== 'base' &&
        entity.entityType !== 'alert'
      ) {
        result.push(entity)
      }
    }
    return result
  }

  /**
   * Add or update entity in repository
   * @param {Object} entity - Entity object
   */
  add(entity) {
    const entities = this.getEntities()
    entities.set(entity.id, entity)
    this.state.merge({ [this.key]: entities }, 'entitiesUpdated')
  }

  /**
   * Remove entity by ID
   * @param {number} id - Entity ID
   */
  remove(id) {
    const entities = this.getEntities()
    entities.delete(id)
    this.state.merge({ [this.key]: entities }, 'entitiesUpdated')
  }

  /**
   * Check if entity matches filter
   * @param {Object} entity - Entity to check
   * @param {Object} filter - Filter criteria
   * @returns {boolean}
   * @private
   */
  _matchesFilter(entity, filter) {
    if (!filter) return true
    if (filter.type && entity.entityType !== filter.type && entity.type !== filter.type) {
      return false
    }
    if (filter.fraction && entity.fraction !== filter.fraction) {
      return false
    }
    if (filter.faction && entity.faction !== filter.faction) {
      return false
    }
    return true
  }

  /**
   * Clear all entities
   */
  clear() {
    this.state.merge({ [this.key]: new Map() }, 'entitiesCleared')
  }

  /**
   * Get count of entities
   * @returns {number}
   */
  count() {
    return this.getEntities().size
  }
}

export function createRepository(stateContainer, key = 'entities') {
  return new EntityRepository(stateContainer, key)
}
