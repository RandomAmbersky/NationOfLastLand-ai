/**
 * Entity Drawer - Centralized entity rendering logic
 * Extracts drawing code from RendererSystem and EntitySpawnSystem to eliminate duplication
 */

import { GAME_CONFIG } from '../config/game-config.js'

/**
 * Get entity color based on type and faction
 * @param {string} vehicleType - Vehicle type (scout, tank, transport)
 * @param {string|null} faction - Faction name (Player, Enemy, Neutral, Wild)
 * @returns {number} Color value
 */
export function getEntityColor (vehicleType, faction) {
  const colors = {
    scout: {
      Player: GAME_CONFIG.COLORS.player.scout,
      Enemy: GAME_CONFIG.COLORS.enemy.scout,
      Neutral: GAME_CONFIG.COLORS.neutral.scout,
      Wild: GAME_CONFIG.COLORS.enemy.scout
    },
    tank: {
      Player: GAME_CONFIG.COLORS.player.tank,
      Enemy: GAME_CONFIG.COLORS.enemy.tank,
      Neutral: GAME_CONFIG.COLORS.neutral.tank,
      Wild: GAME_CONFIG.COLORS.enemy.tank
    },
    transport: {
      Player: GAME_CONFIG.COLORS.player.transport,
      Enemy: GAME_CONFIG.COLORS.enemy.transport,
      Neutral: GAME_CONFIG.COLORS.neutral.transport,
      Wild: GAME_CONFIG.COLORS.enemy.transport
    }
  }

  const vehicleColors = colors[vehicleType] || colors.scout
  return vehicleColors[faction] || vehicleColors.Neutral
}

/**
 * Draw entity shape on graphics
 * @param {PIXI.Graphics} graphics - Graphics object
 * @param {string} vehicleType - Vehicle type (scout, tank, transport)
 */
export function drawEntityShape (graphics, vehicleType) {
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

/**
 * Draw base shape on graphics
 * @param {PIXI.Graphics} graphics - Graphics object
 */
export function drawBaseShape (graphics) {
  graphics.drawRect(-15, -15, 30, 30)
}

/**
 * Draw alert shape on graphics
 * @param {PIXI.Graphics} graphics - Graphics object
 */
export function drawAlertShape (graphics) {
  graphics.moveTo(0, -8)
  graphics.lineTo(6, 6)
  graphics.lineTo(-6, 6)
  graphics.closePath()
}

/**
 * Draw full entity (vehicle/base/alert) with correct color
 * @param {PIXI.Graphics} graphics - Graphics object
 * @param {Object} entityData - Entity data with type, vehicleType, fraction
 */
export function drawEntity (graphics, entityData) {
  const entityType = entityData.entity_type || 'vehicle'
  const vehicleType = entityData.subtype || entityData.vehicleType || 'scout'
  const faction = entityData.fraction || null

  let color

  if (entityType === 'base') {
    color = GAME_CONFIG.COLORS.base
    graphics.beginFill(color)
    drawBaseShape(graphics)
  } else if (entityType === 'alert') {
    color = GAME_CONFIG.COLORS.alert
    graphics.beginFill(color)
    drawAlertShape(graphics)
  } else {
    color = getEntityColor(vehicleType, faction)
    graphics.beginFill(color)
    drawEntityShape(graphics, vehicleType)
  }
  graphics.endFill()
}

/**
 * Draw entity sprite with full entity data
 * @param {number} id - Entity ID
 * @param {number} x - Game X position
 * @param {number} y - Game Y position
 * @param {Object} entityData - Entity data with type, vehicleType, fraction
 * @returns {Object} Entity object with container and graphics
 */
export function createEntitySprite (id, x, y, entityData) {
  const entityType = entityData.entity_type || 'vehicle'
  const vehicleType = entityData.subtype || entityData.vehicleType || 'scout'
  const fraction = entityData.fraction || null

  // Check if PIXI is available
  if (typeof PIXI === 'undefined') {
    console.error('createEntitySprite: PIXI is not available!')
    return null
  }

  // Create graphics
  const graphics = new PIXI.Graphics()
  if (!graphics) {
    console.error('createEntitySprite: Failed to create graphics!')
    return null
  }
  drawEntity(graphics, { ...entityData, fraction })

  // Create container
  const container = new PIXI.Container()
  if (!container) {
    console.error('createEntitySprite: Failed to create container!')
    return null
  }
  container.addChild(graphics)
  container.x = x
  container.y = y
  container.gameX = x
  container.gameY = y
  container.entityData = entityData

  const entity = {
    id,
    container,
    graphics,
    type: entityType,
    vehicleType,
    fraction,
    gameX: x,
    gameY: y,
    screenX: x,
    screenY: y
  }

  return entity
}
