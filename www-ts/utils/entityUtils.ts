/**
 * Entity utilities - Pure functions for entity operations
 * No game engine dependencies
 */

/**
 * Create entity data from raw data
 * @param entityData - Raw entity data
 * @returns Normalized entity object
 */
export function createEntityData (entityData: {
  id: number
  entity_type?: string
  subtype?: string
  fraction?: string
  position?: { x: number, y: number } | number[]
}): {
  id: number
  entityType: string
  vehicleType: string
  fraction: string | null
  gameX: number
  gameY: number
  [key: string]: unknown
} {
  // Determine entity type and subtype
  let vehicleType = 'scout' // Default
  const entityType = entityData.entity_type || 'vehicle'
  const fraction = entityData.fraction || null

  if (entityData.subtype) {
    // Check if subtype contains '_' - indicates alert/expanded unit
    if (entityData.subtype.includes('_')) {
      // Save full subtype for display (handles alerts, expanded enemies, etc.)
      vehicleType = entityData.subtype
    } else {
      // Standard subtype without underscore
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

  // Create entity object with game coordinates
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
    // Add remaining properties from data
    ...entityData
  }
}

/**
 * Find player's base in entities collection
 * @param entities - Entities Map
 * @returns Base entity or null
 */
export function findPlayerBase (entities: Map<number, {
  entityType: string
  fraction: string | null
}>): { entityType: string, fraction: string | null } | null {
  for (const [, entity] of entities) {
    if (entity.entityType === 'base' && entity.fraction === 'Player') {
      return entity
    }
  }
  return null
}

/**
 * Check if player's base is in selection
 * @param selections - Current selection set
 * @param entities - Entities Map
 * @returns boolean
 */
export function isPlayerBaseSelected (
  selections: Set<number>,
  entities: Map<number, {
    entityType: string
    fraction: string | null
  }>
): boolean {
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
 * @param entities - Entities Map
 * @param type - Entity type
 * @returns Array of entities
 */
export function getEntitiesByType<T> (
  entities: Map<number, T>,
  type: string
): T[] {
  const result: T[] = []
  for (const [, entity] of entities) {
    if ((entity as { entityType?: string }).entityType === type) {
      result.push(entity)
    }
  }
  return result
}

/**
 * Get entities by fraction
 * @param entities - Entities Map
 * @param fraction - Fraction name
 * @returns Array of entities
 */
export function getEntitiesByFraction<T> (
  entities: Map<number, T>,
  fraction: string
): T[] {
  const result: T[] = []
  for (const [, entity] of entities) {
    if ((entity as { fraction?: string }).fraction === fraction) {
      result.push(entity)
    }
  }
  return result
}

/**
 * Check if entity exists
 * @param entities - Entities Map
 * @param entityId - Entity ID
 * @returns boolean
 */
export function entityExists (entities: Map<number, unknown>, entityId: number): boolean {
  return entities.has(entityId)
}

/**
 * Check if entity can move
 * @param entity - Entity object
 * @returns boolean
 */
export function canMove (entity: {
  entityType?: string
  movement?: { canMove?: boolean }
}): boolean {
  // Bases cannot move
  if (entity.entityType === 'base') return false
  // Alerts cannot move
  if (entity.entityType === 'alert') return false
  // If movement flag exists, check it
  if (entity.movement && entity.movement.canMove === false) return false
  // Default: units can move
  return true
}

/**
 * Check if entity is a player unit
 * @param entity - Entity object
 * @returns boolean
 */
export function isPlayerUnit (entity: {
  fraction?: string
  entityType?: string
}): boolean {
  return entity.fraction === 'Player' && entity.entityType !== 'base'
}
