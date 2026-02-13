/**
 * Entity Spawn System - Manages entity spawn queue and deletion queue
 * Separates creation concerns from rendering logic
 */

import { drawEntity } from '../utils/entity-drawer.js'
import { createRepository } from '../core/EntityRepository.js'
import { TransformerProvider } from '../utils/TransformerMixin.js'

export class EntitySpawnSystem extends TransformerProvider {
  constructor(gameEngine, rendererSystem = null) {
    super()
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
    
    // If RendererSystem was not passed to constructor, try to get it from gameEngine
    if (!this.rendererSystem && this.gameEngine.rendererSystem) {
      this.rendererSystem = this.gameEngine.rendererSystem
    }
    
    // Initialize transformer from app
    if (!this.transformer && this.app) {
      this.transformer = this.getTransformer()
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
    if (!renderer || !renderer.transformer) {
      console.error('EntitySpawnSystem: renderer not initialized or no transformer')
      return null
    }

    const transformer = renderer.transformer
    const coords = transformer.gameToScreen(
      entityData.position?.x ?? 0,
      entityData.position?.y ?? 0
    )

    // Extract data for entity creation
    const entityType = entityData.entity_type || 'vehicle'
    const vehicleType = entityData.subtype || entityData.vehicleType || 'scout'
    const fraction = entityData.fraction || null

    const graphics = new PIXI.Graphics()
    drawEntity(graphics, entityData)
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
