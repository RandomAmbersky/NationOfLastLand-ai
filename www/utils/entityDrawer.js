/**
 * Entity Drawer - Centralized entity rendering logic
 * Extracts drawing code from RendererSystem and EntitySpawnSystem to eliminate duplication
 */

import { GAME_CONFIG } from '../config/game-config.js'

// PIXI is expected to be available globally (loaded via script tag in index.html)
const PIXI_AVAILABLE = typeof PIXI !== 'undefined'
if (!PIXI_AVAILABLE) {
  console.error('PIXI is not available in entityDrawer.js!')
}

/**
 * Get entity color based on type and faction
 * @param {string} vehicleType - Vehicle type (scout, tank, transport)
 * @param {string|null} faction - Faction name (Player, Enemy, Neutral, Wild)
 * @returns {number} Color value
 */
export function getEntityColor (vehicleType, faction) {
  console.log('getEntityColor: vehicleType:', vehicleType, 'faction:', faction)
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
  console.log('drawEntityShape: drawing', vehicleType)
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
  console.log('drawEntityShape: done, graphics children:', graphics.children?.length)
}

/**
 * Draw base shape on graphics
 * @param {PIXI.Graphics} graphics - Graphics object
 */
export function drawBaseShape (graphics) {
  console.log('drawBaseShape: drawing')
  graphics.drawRect(-15, -15, 30, 30)
  console.log('drawBaseShape: done, graphics children:', graphics.children?.length)
}

/**
 * Draw alert shape on graphics
 * @param {PIXI.Graphics} graphics - Graphics object
 */
export function drawAlertShape (graphics) {
  console.log('drawAlertShape: drawing')
  graphics.moveTo(0, -8)
  graphics.lineTo(6, 6)
  graphics.lineTo(-6, 6)
  graphics.closePath()
  console.log('drawAlertShape: done, graphics children:', graphics.children?.length)
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

  console.log('drawEntity: entityType:', entityType, 'vehicleType:', vehicleType, 'faction:', faction)

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

  console.log('createEntitySprite: Creating entity', id, 'at', x, y, 'with data', entityData)
  console.log('createEntitySprite: PIXI available:', typeof PIXI !== 'undefined')

  // Create graphics
  const graphics = new PIXI.Graphics()
  if (!graphics) {
    console.error('createEntitySprite: Failed to create graphics!')
    return null
  }
  console.log('createEntitySprite: graphics created:', graphics, 'type:', graphics.constructor?.name)
  console.log('createEntitySprite: calling drawEntity with entityData:', entityData)
  drawEntity(graphics, { ...entityData, fraction })
  console.log('createEntitySprite: after drawEntity, graphics has beginFill/endFill')

  // Verify graphics is drawing by checking if beginFill/endFill work
  try {
    graphics.beginFill(0xFF0000)
    graphics.drawRect(-5, -5, 10, 10)
    graphics.endFill()
    console.log('createEntitySprite: graphics.beginFill/drawRect/endFill worked')
  } catch (e) {
    console.error('createEntitySprite: Error with graphics methods:', e)
  }

  // Create container
  const container = new PIXI.Container()
  console.log('createEntitySprite: container created:', container)
  container.addChild(graphics)
  console.log('createEntitySprite: after addChild, container.children.length:', container.children?.length)
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

  console.log('createEntitySprite: container children after addChild:', container.children?.length)
  console.log('createEntitySprite: Created entity', id, 'with container children:', container.children?.length)
  console.log('createEntitySprite: graphics === container.children[0]:', graphics === container.children?.[0])
  // Verify the graphics is actually drawing something by checking if it has drawing commands
  console.log('createEntitySprite: graphics is valid:', !!graphics)
  return entity
}
