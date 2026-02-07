/**
 * Centralized exports for the Nation of Last Land game frontend
 */

// Core modules
export { CoreStateManager } from './core-state-manager.js'

// State managers
export { GameStateManager } from './game-state-manager.js'

// Game systems
export { SelectionManager } from './selection-manager.js'
export { EntityRenderer } from './entity-renderer.js'
export { InputHandler } from './input-handler.js'
export { EntityService } from './entity-service.js'
export { SelectionIndicatorManager } from './selection-indicator.js'
export { CoordinateService } from './coordinate-service.js'

// Game demo
export { GameDemo } from './game-demo.js'

// Configuration
export { GAME_CONFIG } from './game-config.js'

// Utils
export { calculateDistance, calculateDistanceBetween } from './utils.js'

// WASM imports
export { initWasm, init, gameInit, create_vehicle, update, select_entity, deselect_entity, set_group_target, create_base, build_floor, get_entity_info, create_random_alert, clear_selection, handle_entity_selection, get_entities_data } from './wasm-imports.js'

// Cleanup utilities
export { GameCleanup, createCleanupScope } from './core/GameCleanup.js'
export {
  createDisposable,
  TimerManager,
  EventManager,
  GraphicsCleanup,
  Cleanupable
} from './utils/cleanup.js'
