/**
 * Entity Spawn System - Handles entity creation and deletion
 * Separates creation concerns from rendering logic
 */

import { EntityService } from '../entity-service.js'
import { createCoordinateTransformer } from '../utils/coordinate-transformer.js'

export class EntitySpawnSystem {
  constructor(gameEngine, rendererSystem = null) {
    this.gameEngine = gameEngine
    this.entityService = new EntityService(gameEngine)
    this.rendererSystem = rendererSystem
    this.transformer = null
    this.isDestroyed = false
  }

  init(app) {
    this.app = app
    this.transformer = createCoordinateTransformer(app)
    
    // Если RendererSystem не был передан в конструктор, пытаемся получить его из gameEngine
    if (!this.rendererSystem && this.gameEngine.rendererSystem) {
      this.rendererSystem = this.gameEngine.rendererSystem
    }
  }

  /**
   * Create a new entity sprite
   * @param {number} id - Entity ID
   * @param {number} x - Game X coordinate
   * @param {number} y - Game Y coordinate
   * @param {string} vehicleType - Vehicle type (scout, tank, transport)
   * @param {string} faction - Entity faction
   * @param {string} entityType - Entity type (vehicle, base, alert)
   * @returns {Object} Created entity object
   */
  createEntitySprite(id, x, y, vehicleType, faction = null, entityType = 'vehicle') {
    const app = this.gameEngine.app
    if (!app) {
      console.error('EntitySpawnSystem: app not initialized')
      return null
    }

    const coords = this.transformer.gameToScreen(x, y)
    const screenX = coords.x
    const screenY = coords.y

    const graphics = new PIXI.Graphics()
    let color

    if (entityType === 'base') {
      color = 0x2196F3
      graphics.beginFill(color)
      graphics.drawRect(-15, -15, 30, 30)
    } else if (entityType === 'alert') {
      color = this._getAlertColor(faction)
      graphics.beginFill(color)
      graphics.moveTo(0, -8)
      graphics.lineTo(6, 6)
      graphics.lineTo(-6, 6)
      graphics.closePath()
      graphics.endFill()
    } else {
      color = this._getVehicleColor(vehicleType, faction)
      graphics.beginFill(color)
      this._drawVehicleShape(graphics, vehicleType)
    }

    graphics.endFill()

    const container = new PIXI.Container()
    container.addChild(graphics)
    container.x = screenX
    container.y = screenY
    container.gameX = x
    container.gameY = y
    
    // Используем RendererSystem для добавления на stage
    this.rendererSystem.addToStage(container)

    const entity = {
      id,
      container,
      graphics,
      type: entityType,
      vehicleType,
      faction,
      gameX: x,
      gameY: y,
      screenX,
      screenY
    }

    // Update state.entities
    this._updateEntityInState(id, entity)

    return entity
  }

  /**
   * Remove an entity from rendering and state
   * @param {number} id - Entity ID
   */
  removeEntity(id) {
    const entities = this.gameEngine.state.get('entities')
    if (!(entities instanceof Map)) return

    const entity = entities.get(id)
    if (!entity || !entity.container) return

    // Remove from stage using RendererSystem API
    this.rendererSystem.removeFromStage(entity.container)
    
    entity.container.destroy({ children: true, texture: true, baseTexture: true })

    // Remove from state
    entities.delete(id)
    this.gameEngine.state.merge({ entities }, 'entitiesUpdated')
  }

  /**
   * Update existing entity with new container/graphics
   * @param {number} id - Entity ID
   * @param {Object} entity - Entity object with container and graphics
   */
  updateEntity(id, entity) {
    this._updateEntityInState(id, entity)
  }

  /**
   * Process all pending entity spawns
   * @param {Map} entities - Current entities from state
   */
  processSpawns(entities) {
    if (!(entities instanceof Map)) return []

    const newEntities = []
    for (const [id, entityData] of entities) {
      // Check if entity needs to be spawned (no container)
      if (!entityData.container) {
        const entityType = entityData.entity_type || entityData.type || 'vehicle'
        const vehicleType = entityData.subtype || entityData.vehicleType
        const faction = entityData.fraction
        const x = entityData.position?.x ?? entityData.gameX ?? 0
        const y = entityData.position?.y ?? entityData.gameY ?? 0

        const entity = this.createEntitySprite(
          id,
          x,
          y,
          vehicleType,
          faction,
          entityType
        )

        if (entity) {
          newEntities.push(entity)
        }
      }
    }

    return newEntities
  }

  /**
   * Process all pending entity deletions
   * @param {Map} entities - Current entities from state
   * @returns {number} Count of deleted entities
   */
  processDeletions(entities) {
    if (!(entities instanceof Map)) return 0

    let deletedCount = 0
    const stateEntities = this.gameEngine.state.get('entities')

    if (!(stateEntities instanceof Map)) return 0

    for (const [id, storedEntity] of stateEntities) {
      if (!entities.has(id)) {
        this.removeEntity(id)
        deletedCount++
      }
    }

    return deletedCount
  }

  // Private methods

  _updateEntityInState(id, entity) {
    const entities = this.gameEngine.state.get('entities')
    if (!(entities instanceof Map)) return

    const existingEntity = entities.get(id)
    if (existingEntity) {
      entities.set(id, { ...existingEntity, ...entity })
    } else {
      entities.set(id, entity)
    }
    this.gameEngine.state.merge({ entities }, 'entitiesUpdated')
  }

  _getAlertColor(faction) {
    // Use default yellow for alerts
    return 0xFFFF00
  }

  _getVehicleColor(vehicleType, faction) {
    const colors = {
      scout: { player: 0x4CAF50, enemy: 0xF44336, neutral: 0x9E9E9E },
      tank: { player: 0x3F51B5, enemy: 0xD32F2F, neutral: 0x757575 },
      transport: { player: 0x2196F3, enemy: 0x9C27B0, neutral: 0x607D8B }
    }

    const vehicleColors = colors[vehicleType] || colors.scout
    const factionColors = {
      Player: vehicleColors.player,
      Enemy: vehicleColors.enemy,
      Neutral: vehicleColors.neutral,
      Wild: vehicleColors.enemy,
      default: vehicleColors.neutral
    }

    return factionColors[faction] || factionColors.default
  }

  _drawVehicleShape(graphics, vehicleType) {
    switch (vehicleType) {
      case 'scout':
        graphics.drawRect(-4, -4, 8, 8)
        break
      case 'tank':
        graphics.drawRect(-10, -8, 20, 16)
        break
      case 'transport':
        graphics.drawRect(-12, -10, 24, 20)
        break
      default:
        // Unknown type - white square
        graphics.drawRect(-4, -4, 8, 8)
    }
  }

  destroy() {
    if (this.isDestroyed) return
    this.isDestroyed = true

    this.gameEngine = null
    this.entityService = null
    this.transformer = null
    this.app = null
  }
}

export function createEntitySpawnSystem(gameEngine) {
  return new EntitySpawnSystem(gameEngine)
}
