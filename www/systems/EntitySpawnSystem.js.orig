/**
 * Entity Spawn System - Manages entity spawn queue and deletion queue
 * Separates creation concerns from rendering logic
 */

import { createRepository } from '../core/EntityRepository.js'

export class EntitySpawnSystem {
  constructor(gameEngine, rendererSystem = null) {
    this.gameEngine = gameEngine
    this.rendererSystem = rendererSystem
    this.spawnQueue = []
    this.deletionQueue = new Set()
    this.repository = null
    this.isDestroyed = false
  }

  init(app) {
    this.app = app
    this.renderer = this.app || null
    this.repository = createRepository(this.gameEngine.state)
    
    // Если RendererSystem не был передан в конструктор, пытаемся получить его из gameEngine
    if (!this.rendererSystem && this.gameEngine.rendererSystem) {
      this.rendererSystem = this.gameEngine.rendererSystem
    }
  }

  /**
   * Queue entity for spawning
   * @param {Object} entityData - Entity data from WASM
   */
  queueSpawn(entityData) {
    this.spawnQueue.push(entityData)
  }

  /**
   * Queue entity for deletion
   * @param {number} id - Entity ID to delete
   */
  queueDeletion(id) {
    this.deletionQueue.add(id)
  }

  /**
   * Process all pending spawns
   * @returns {Array<Object>} Array of created entities
   */
  processSpawns() {
    if (this.spawnQueue.length === 0) return []

    const createdEntities = []
    const entities = this.repository.getEntities()

    for (const entityData of this.spawnQueue) {
      const entity = this._createEntity(entityData)
      if (entity) {
        entities.set(entity.id, entity)
        createdEntities.push(entity)
      }
    }

    this.spawnQueue = []
    this.gameEngine.state.merge({ entities }, 'entitiesUpdated')
    return createdEntities
  }

  /**
   * Process all pending deletions
   * @returns {number} Count of deleted entities
   */
  processDeletions() {
    if (this.deletionQueue.size === 0) return 0

    let deletedCount = 0
    const entities = this.repository.getEntities()

    for (const id of this.deletionQueue) {
      if (entities.has(id)) {
        const entity = entities.get(id)
        
        // Remove from stage using RendererSystem API
        if (this.rendererSystem && entity.container) {
          this.rendererSystem.removeFromStage(entity.container)
          entity.container.destroy({ children: true, texture: true, baseTexture: true })
        }
        
        entities.delete(id)
        deletedCount++
      }
    }

    this.deletionQueue.clear()
    this.gameEngine.state.merge({ entities }, 'entitiesUpdated')
    return deletedCount
  }

  /**
   * Process all pending spawns and deletions
   * @returns {Object} Processing results
   */
  process() {
    const created = this.processSpawns()
    const deleted = this.processDeletions()
    return { created, deleted }
  }

  /**
   * Create entity from data
   * @param {Object} entityData - Entity data
   * @returns {Object|null} Created entity or null
   * @private
   */
  _createEntity(entityData) {
    const renderer = this.rendererSystem || this.renderer
    if (!renderer) {
      console.error('EntitySpawnSystem: renderer not initialized')
      return null
    }

    const coords = renderer.transformer.gameToScreen(
      entityData.position?.x ?? 0,
      entityData.position?.y ?? 0
    )

    // Extract data for entity creation
    const entityType = entityData.entity_type || 'vehicle'
    const vehicleType = entityData.subtype || entityData.vehicleType || 'scout'
    const fraction = entityData.fraction || null

    const graphics = new PIXI.Graphics()
    this._drawEntity(graphics, entityData)
    graphics.endFill()

    const container = new PIXI.Container()
    container.addChild(graphics)
    container.x = coords.x
    container.y = coords.y
    container.gameX = entityData.position?.x ?? 0
    container.gameY = entityData.position?.y ?? 0
    container.entityData = entityData

    // Add to stage using RendererSystem
    this.rendererSystem.addToStage(container)

    return {
      id: entityData.id,
      container,
      graphics,
      type: entityType,
      vehicleType,
      fraction,
      gameX: entityData.position?.x ?? 0,
      gameY: entityData.position?.y ?? 0,
      screenX: coords.x,
      screenY: coords.y
    }
  }

  /**
   * Draw entity graphics
   * @param {PIXI.Graphics} graphics - Graphics object
   * @param {Object} entityData - Entity data
   * @private
   */
  _drawEntity(graphics, entityData) {
    const entityType = entityData.entity_type || 'vehicle'
    const vehicleType = entityData.subtype || entityData.vehicleType || 'scout'
    const faction = entityData.fraction || null

    let color

    if (entityType === 'base') {
      color = 0x2196F3
      graphics.beginFill(color)
      graphics.drawRect(-15, -15, 30, 30)
    } else if (entityType === 'alert') {
      color = 0xB8860B
      graphics.beginFill(color)
      graphics.moveTo(0, -8)
      graphics.lineTo(6, 6)
      graphics.lineTo(-6, 6)
      graphics.closePath()
    } else {
      color = this._getVehicleColor(vehicleType, faction)
      graphics.beginFill(color)
      this._drawVehicleShape(graphics, vehicleType)
    }
  }

  /**
   * Get vehicle color based on type and faction
   * @param {string} vehicleType - Vehicle type
   * @param {string} faction - Faction name
   * @returns {number} Color value
   * @private
   */
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
      Wild: vehicleColors.enemy
    }

    return factionColors[faction] || vehicleColors.neutral
  }

  /**
   * Draw vehicle shape
   * @param {PIXI.Graphics} graphics - Graphics object
   * @param {string} vehicleType - Vehicle type
   * @private
   */
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
        graphics.drawRect(-4, -4, 8, 8)
    }
  }

  destroy() {
    if (this.isDestroyed) return
    this.isDestroyed = true

    // Clear queues
    this.spawnQueue = []
    this.deletionQueue.clear()
    this.repository = null
    this.gameEngine = null
    this.app = null
    this.rendererSystem = null
  }
}

export function createEntitySpawnSystem(gameEngine) {
  return new EntitySpawnSystem(gameEngine)
}
