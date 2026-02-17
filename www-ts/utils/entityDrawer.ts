/**
 * Entity Drawer - Centralized entity rendering logic
 * Extracts drawing code from RendererSystem and EntitySpawnSystem to eliminate duplication
 */

import { GAME_CONFIG } from '../config/game-config.js'

/**
 * Get entity color based on type and faction
 * @param vehicleType - Vehicle type (scout, tank, transport)
 * @param faction - Faction name (Player, Enemy, Neutral, Wild)
 * @returns Color value
 */
export function getEntityColor (vehicleType: string, faction: string | null): number {
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
 * @param graphics - Graphics object
 * @param vehicleType - Vehicle type (scout, tank, transport)
 */
export function drawEntityShape (graphics: PIXI.Graphics, vehicleType: string): void {
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
 * @param graphics - Graphics object
 */
export function drawBaseShape (graphics: PIXI.Graphics): void {
  graphics.drawRect(-15, -15, 30, 30)
}

/**
 * Draw alert shape on graphics
 * @param graphics - Graphics object
 */
export function drawAlertShape (graphics: PIXI.Graphics): void {
  graphics.moveTo(0, -8)
  graphics.lineTo(6, 6)
  graphics.lineTo(-6, 6)
  graphics.closePath()
}

/**
 * Draw full entity (vehicle/base/alert) with correct color
 * @param graphics - Graphics object
 * @param entityData - Entity data with type, vehicleType, fraction
 */
export function drawEntity (graphics: PIXI.Graphics, entityData: {
  entity_type?: string
  subtype?: string
  vehicleType?: string
  fraction?: string | null
}): void {
  const entityType = entityData.entity_type || 'vehicle'
  const vehicleType = entityData.subtype || entityData.vehicleType || 'scout'
  const faction = entityData.fraction || null

  let color: number

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
 * @param id - Entity ID
 * @param x - Game X position
 * @param y - Game Y position
 * @param entityData - Entity data with type, vehicleType, fraction
 * @returns Entity object with container and graphics
 */
export function createEntitySprite (
  id: number,
  x: number,
  y: number,
  entityData: {
    entity_type?: string
    subtype?: string
    vehicleType?: string
    fraction?: string | null
    position?: { x: number, y: number }
  }
): {
  id: number
  container: PIXI.Container
  graphics: PIXI.Graphics
  type: string
  vehicleType: string
  fraction: string | null
  gameX: number
  gameY: number
  screenX: number
  screenY: number
} {
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
