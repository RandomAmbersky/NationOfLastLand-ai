/**
 * Entity Spawn System - Manages entity spawn queue and deletion queue
 * Separates creation concerns from rendering logic
 */

import type { GameEngine, System } from '../core/GameEngine.js'
import type { StateContainer } from '../core/StateContainer.js'
import { drawEntity } from '../utils/entityDrawer.js'

export class EntitySpawnSystem implements System {
  public gameEngine: GameEngine
  public spawnQueue: Array<{ id: number, entity_type?: string, subtype?: string, fraction?: string | null, position?: { x: number, y: number } | number[] }>
  public deletionQueue: Set<number>
  public isDestroyed: boolean
  public app: PIXI.Application | null

  constructor (gameEngine: GameEngine) {
    this.gameEngine = gameEngine
    this.spawnQueue = []
    this.deletionQueue = new Set()
    this.isDestroyed = false
    this.app = null
  }

  init (app: PIXI.Application): void {
    this.app = app
  }

  /**
   * Queue entity for spawning
   * @param entityData - Entity data from WASM
   */
  queueSpawn (entityData: { id: number, entity_type?: string, subtype?: string, fraction?: string | null, position?: { x: number, y: number } | number[] }): void {
    this.spawnQueue.push(entityData)
  }

  /**
   * Queue entity for deletion
   * @param id - Entity ID to delete
   */
  queueDeletion (id: number): void {
    this.deletionQueue.add(id)
  }

  /**
   * Process all pending spawns
   * @returns Array of created entities
   */
  processSpawns (): { id: number, container: PIXI.Container, graphics: PIXI.Graphics, type: string, vehicleType: string, fraction: string | null, gameX: number, gameY: number, screenX: number, screenY: number }[] {
    if (this.spawnQueue.length === 0) return []

    const createdEntities: { id: number, container: PIXI.Container, graphics: PIXI.Graphics, type: string, vehicleType: string, fraction: string | null, gameX: number, gameY: number, screenX: number, screenY: number }[] = []
    const entities = this.gameEngine.state.get('entities') as Map<number, { id: number }>

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
   * @returns Count of deleted entities
   */
  processDeletions (): number {
    if (this.deletionQueue.size === 0) return 0

    let deletedCount = 0
    const entities = this.gameEngine.state.get('entities') as Map<number, { container?: PIXI.Container }>

    for (const id of this.deletionQueue) {
      if (entities.has(id)) {
        const entity = entities.get(id)

        // Remove from stage
        if (entity && entity.container) {
          entity.container.parent?.removeChild(entity.container)
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
   * @returns Processing results
   */
  process (): { created: { id: number, container: PIXI.Container, graphics: PIXI.Graphics, type: string, vehicleType: string, fraction: string | null, gameX: number, gameY: number, screenX: number, screenY: number }[], deleted: number } {
    const created = this.processSpawns()
    const deleted = this.processDeletions()
    return { created, deleted }
  }

  /**
   * Create entity from data
   * @param entityData - Entity data
   * @returns Created entity or null
   * @private
   */
  _createEntity (entityData: { id: number, entity_type?: string, subtype?: string, fraction?: string | null, position?: { x: number, y: number } | number[] }): { id: number, container: PIXI.Container, graphics: PIXI.Graphics, type: string, vehicleType: string, fraction: string | null, gameX: number, gameY: number, screenX: number, screenY: number } | null {
    const transformer = this.gameEngine.transformer
    if (!transformer) {
      console.error('EntitySpawnSystem: transformer not available')
      return null
    }
    const coords = (transformer as { gameToScreen: (x: number, y: number) => { x: number, y: number } }).gameToScreen(
      entityData.position?.x ?? 0,
      entityData.position?.y ?? 0
    )

    // Extract data for entity creation
    const entityType = entityData.entity_type || 'vehicle'
    const vehicleType = entityData.subtype || entityData.vehicleType || 'scout'
    const fraction = entityData.fraction || null

    const graphics = new PIXI.Graphics()
    drawEntity(graphics, entityData)

    const container = new PIXI.Container()
    container.addChild(graphics)
    container.x = coords.x
    container.y = coords.y
    container.gameX = entityData.position?.x ?? 0
    container.gameY = entityData.position?.y ?? 0
    container.entityData = entityData

    // Add to stage
    if (this.app && this.app.stage) {
      this.app.stage.addChild(container)
    }

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

  destroy (): void {
    if (this.isDestroyed) return
    this.isDestroyed = true

    // Clear queues
    this.spawnQueue = []
    this.deletionQueue.clear()
    this.gameEngine = null as unknown as GameEngine
    this.app = null
  }

  update (_dt: number): void {
    // Update method for System interface
  }

  render (): void {
    // Render method for System interface
  }
}

export function createEntitySpawnSystem (gameEngine: GameEngine): EntitySpawnSystem {
  return new EntitySpawnSystem(gameEngine)
}
