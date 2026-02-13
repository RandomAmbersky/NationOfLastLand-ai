/**
 * Movement System - Handles entity movement and pathfinding
 * Processes move commands from SelectionSystem and updates entity positions
 */

import { GAME_CONFIG } from '../config/game-config.js'
import { TransformerProvider } from '../utils/TransformerMixin.js'

export class MovementSystem extends TransformerProvider {
  constructor(gameEngine) {
    super()
    this.gameEngine = gameEngine
    this.moveCommands = new Map() // entityId -> {x, y, speed}
    this.isDestroyed = false
  }

  /**
   * Queue a move command for an entity
   * @param {number} entityId - Entity ID to move
   * @param {number} targetX - Target X coordinate
   * @param {number} targetY - Target Y coordinate
   * @param {number} speed - Movement speed (optional)
   */
  queueMoveCommand(entityId, targetX, targetY, speed = null) {
    const entity = this.getEntity(entityId)
    if (!entity) {
      console.warn('MovementSystem: Entity not found', entityId)
      return false
    }

    // Entities that can't move
    if (entity.entityType === 'base') {
      console.warn('MovementSystem: Base cannot move', entityId)
      return false
    }
    if (entity.entityType === 'alert') {
      console.warn('MovementSystem: Alert cannot move', entityId)
      return false
    }

    const currentX = entity.gameX ?? 0
    const currentY = entity.gameY ?? 0
    const distance = Math.hypot(targetX - currentX, targetY - currentY)

    // Don't queue moves shorter than threshold
    if (distance < 1) return false

    this.moveCommands.set(entityId, {
      targetX,
      targetY,
      speed: speed ?? this.getDefaultSpeed(entity),
      distance,
      progress: 0
    })

    return true
  }

  /**
   * Get default movement speed based on entity type
   * @param {Object} entity - Entity object
   * @returns {number} Default speed
   */
  getDefaultSpeed(entity) {
    const type = entity.vehicleType || entity.type || 'scout'
    const speeds = {
      scout: 60,
      tank: 40,
      transport: 50,
      raider: 70,
      hostile: 55,
      static: 0
    }
    return speeds[type] ?? 50
  }

  /**
   * Get entity by ID from state
   * @param {number} entityId - Entity ID
   * @returns {Object|null} Entity object or null
   */
  getEntity(entityId) {
    const entities = this.gameEngine.state.get('entities')
    if (!(entities instanceof Map)) return null
    return entities.get(entityId)
  }

  /**
   * Process all pending movement commands
   * @param {number} dt - Delta time in seconds
   */
  processMovements(dt) {
    if (this.moveCommands.size === 0) return

    const entities = this.gameEngine.state.get('entities')
    let changed = false

    for (const [entityId, command] of this.moveCommands) {
      const entity = entities.get(entityId)
      if (!entity) {
        this.moveCommands.delete(entityId)
        continue
      }

      // Calculate movement
      const currentX = entity.gameX ?? 0
      const currentY = entity.gameY ?? 0
      const dx = command.targetX - currentX
      const dy = command.targetY - currentY
      const distance = Math.hypot(dx, dy)

      if (distance <= 0) {
        this.moveCommands.delete(entityId)
        continue
      }

      // Move towards target
      const moveDistance = command.speed * dt
      if (moveDistance >= distance) {
        // Arrived at target
        entity.gameX = command.targetX
        entity.gameY = command.targetY
        this.moveCommands.delete(entityId)
        changed = true
      } else {
        // Continue moving
        const progress = moveDistance / distance
        entity.gameX = currentX + dx * progress
        entity.gameY = currentY + dy * progress
        changed = true
      }
    }

    if (changed) {
      this.gameEngine.state.merge({ entities }, 'entitiesUpdated')
    }
  }

  /**
   * Clear all pending move commands for an entity
   * @param {number} entityId - Entity ID
   */
  clearMoveCommand(entityId) {
    this.moveCommands.delete(entityId)
  }

  /**
   * Clear all pending move commands
   */
  clearAllCommands() {
    this.moveCommands.clear()
  }

  update(dt) {
    this.processMovements(dt)
  }

  render() {
    // Movement doesn't render anything directly
    // RendererSystem will render updated positions
  }

  destroy() {
    if (this.isDestroyed) return
    this.isDestroyed = true
    this.moveCommands.clear()
    this.gameEngine = null
  }
}

export function createMovementSystem(gameEngine) {
  return new MovementSystem(gameEngine)
}
