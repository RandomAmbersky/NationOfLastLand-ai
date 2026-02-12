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

  // Colors for different entity types
  COLORS: {
    // Player faction colors
    player: {
      scout: 0x4CAF50,
      tank: 0x8BC34A,
      transport: 0xCDDC39
    },

    // Neutral faction colors
    neutral: {
      scout: 0x9E9E9E,
      tank: 0xBDBDBD,
      transport: 0xE0E0E0
    },

    // Enemy faction colors
    enemy: {
      scout: 0xF44336,
      tank: 0xE91E63,
      transport: 0x9C27B0
    },

    // Selection indicator colors
    selection: {
      player: 0xFFFF00,
      enemy: 0xFF0000
    }
  },

  // Game limits and thresholds
  LIMITS: {
    // Minimum drag distance for rectangle selection (pixels)
    dragThreshold: 5,
    // Maximum number of units in a selection group
    maxGroupSize: 9,
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

  // Grid settings for rendering
  GRID: {
    // Grid line spacing
    spacing: 50,
    // Grid line color
    color: 0x444444,
    // Grid line alpha
    alpha: 0.5
  }
}

// Export as default
export default GAME_CONFIG
