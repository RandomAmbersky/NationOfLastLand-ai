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

/** Stroke a rectangle (same API as grid: lineStyle + path) so it always renders */
function strokeRect (g, x, y, w, h) {
  g.moveTo(x, y)
  g.lineTo(x + w, y)
  g.lineTo(x + w, y + h)
  g.lineTo(x, y + h)
  g.lineTo(x, y)
}

/**
 * Draw entity shape as path for stroke
 */
export function drawEntityShape (graphics, vehicleType) {
  switch (vehicleType) {
    case 'scout':
      strokeRect(graphics, -4, -4, 8, 8)
      break
    case 'tank':
      strokeRect(graphics, -10, -8, 20, 16)
      break
    case 'transport':
      strokeRect(graphics, -12, -10, 24, 20)
      break
    default:
      strokeRect(graphics, -4, -4, 8, 8)
  }
}

/**
 * Draw base shape as path for stroke
 */
export function drawBaseShape (graphics) {
  strokeRect(graphics, -15, -15, 30, 30)
}

/**
 * Draw alert shape - triangle path
 */
export function drawAlertShape (graphics) {
  graphics.moveTo(0, -8)
  graphics.lineTo(6, 6)
  graphics.lineTo(-6, 6)
  graphics.lineTo(0, -8)
}

/**
 * Draw full entity: use lineStyle + path (same as grid) so it renders in PixiJS 7.
 * Outline only — fill API was not drawing.
 */
export function drawEntity (graphics, entityData) {
  const entityType = entityData.entity_type || 'vehicle'
  const vehicleType = entityData.subtype || entityData.vehicleType || 'scout'
  const faction = entityData.fraction || null

  let color

  if (entityType === 'base') {
    color = GAME_CONFIG.COLORS.base
  } else if (entityType === 'alert') {
    color = GAME_CONFIG.COLORS.alert
  } else {
    color = getEntityColor(vehicleType, faction)
  }

  graphics.lineStyle(2, color, 1)

  if (entityType === 'base') {
    drawBaseShape(graphics)
  } else if (entityType === 'alert') {
    drawAlertShape(graphics)
  } else {
    drawEntityShape(graphics, vehicleType)
  }
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

  // Create graphics
  const graphics = new PIXI.Graphics()
  drawEntity(graphics, { ...entityData, fraction })

  // Create container
  const container = new PIXI.Container()
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
