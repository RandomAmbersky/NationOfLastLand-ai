/**
 * Game Configuration
 * Centralized configuration for game settings, colors, and limits
 */

export const GAME_CONFIG = {
  // World dimensions
  WORLD_SIZE: {
    width: 800,
    height: 600
  },

  // Entity sizes for different types
  ENTITY_SIZES: {
    scout: 8,
    tank: { width: 20, height: 16 },
    transport: { width: 24, height: 20 },
    base: { width: 30, height: 30 },
    alert: { hidden: 8, revealed: 12 }
  },

  // Colors for different entity types
  COLORS: {
    // Player faction colors
    player: {
      scout: 0x4CAF50,
      tank: 0xFF5722,
      transport: 0x2196F3
    },

    // Enemy faction colors
    enemy: {
      scout: 0x2E7D32,
      tank: 0xB71C1C,
      transport: 0x0D47A1
    },

    // Wild faction colors
    wild: {
      scout: 0x8D6E63,
      tank: 0x8D6E63,
      transport: 0x8D6E63
    },

    // Neutral faction colors
    neutral: {
      scout: 0x00BCD4,
      tank: 0x00BCD4,
      transport: 0x00BCD4
    },

    // Base color
    base: 0x2196F3,

    // Alert color
    alert: 0xB8860B,

    // Selection indicator colors
    selection: {
      player: 0x0080FF,
      enemy: 0xFF0000
    }
  },

  // Distance and range settings
  DISTANCES: {
    clickTolerance: 20,
    alertClickRadius: 15,
    baseUnitRadius: 50,
    combatRange: 20,
    alertRevealRange: 25
  },

  // Game limits and thresholds
  LIMITS: {
    // Minimum drag distance for rectangle selection (pixels)
    dragThreshold: 5,
    // Maximum number of units in a selection group
    maxGroupSize: 12,
    // Entity size for click/touch detection (radius in pixels)
    entityHitRadius: 15,
    // Movement speed limits
    maxSpeed: 100,
    // Zoom limits
    minZoom: 0.5,
    maxZoom: 2.0
  },

  // Animation settings
  ANIMATION: {
    // Duration for selection indicator fade
    selectionFadeDuration: 200,
    // Damage indicator duration
    damageFlashDuration: 300,
    // Move command indicator duration
    moveIndicatorDuration: 1000
  },

  // UI settings
  UI: {
    fontSize: {
      label: 10,
      damage: 14
    },
    indicatorSize: 12,
    targetIndicatorSize: 10,
    explosionScale: 3.0,
    healthBarLength: 10
  },

  // Grid settings for rendering
  GRID: {
    // Grid line spacing
    spacing: 50,
    // Grid line color
    color: 0x444444,
    // Grid line alpha
    alpha: 0.5
  },

  // Visibility settings
  VISIBILITY: {
    range: 200,
    sameTypeUnitRadius: 200
  },

  // Timeout settings (milliseconds)
  TIMEOUTS: {
    targetIndicator: 2000,
    alertHighlight: 3000
  }
}

// Export as default
export default GAME_CONFIG
