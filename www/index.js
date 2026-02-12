/**
 * Centralized exports for the Nation of Last Land game frontend
 */

// Core modules
export { StateContainer, createContainer } from './core/StateContainer.js'
export { GameEngine, System, createEngine } from './core/GameEngine.js'

// Selection service
export { SelectionIndicator, createSelectionIndicator } from './services/SelectionIndicator.js'

// Game systems
export { RendererSystem, createRenderer } from './systems/RendererSystem.js'
export { InputSystem, createInputSystem } from './systems/InputSystem.js'
export { SelectionSystem, createSelectionSystem } from './systems/SelectionSystem.js'
export { GameStateSystem, createGameStateSystem } from './systems/GameStateSystem.js'

// Game demo
export { GameDemo } from './game-demo.js'
export { GameDemo as GameEngineDemo, createGameDemo as createGameEngineDemo } from './game-engine.js'

// Service modules
export { CoordinateService } from './coordinate-service.js'
export { EntityService } from './entity-service.js'

// Utils
export { calculateDistance, calculateDistanceBetween, clamp, lerp } from './utils/math.js'
export { CoordinateTransformer, createCoordinateTransformer } from './utils/coordinate-transformer.js'

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
