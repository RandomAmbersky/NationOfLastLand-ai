/**
 * Centralized exports for the Nation of Last Land game frontend
 */

// Core modules
export { StateContainer, createContainer } from "./core/StateContainer.js"
export { GameEngine, System, createEngine } from "./core/GameEngine.js"
export { EntityRepository, createRepository } from "./core/EntityRepository.js"
export { GameCleanup, createCleanupScope } from "./core/GameCleanup.js"

// Selection service
export { SelectionIndicator, createSelectionIndicator } from "./services/SelectionIndicator.js"

// Game systems
export { RendererSystem, createRenderer } from "./systems/RendererSystem.js"
export { InputSystem, createInputSystem } from "./systems/InputSystem.js"
export { SelectionSystem, createSelectionSystem } from "./systems/SelectionSystem.js"
export { GameStateSystem, createGameStateSystem } from "./systems/GameStateSystem.js"
export { EntitySpawnSystem, createEntitySpawnSystem } from "./systems/EntitySpawnSystem.js"
export { MovementSystem, createMovementSystem } from "./systems/MovementSystem.js"


// Utils
export { calculateDistance, calculateDistanceBetween, clamp, lerp } from "./utils/math.js"
export { CoordinateTransformer, createCoordinateTransformer } from "./utils/coordinate-transformer.js"
export { createEntitySprite, getEntityColor, drawEntity, drawEntityShape, drawBaseShape, drawAlertShape } from "./utils/entity-drawer.js"
export { createDisposable, TimerManager, EventManager, GraphicsCleanup, Cleanupable } from "./utils/cleanup.js"
export { TransformerProvider, TransformerMixin } from "./utils/TransformerMixin.js"
export {
  createEntityData,
  findPlayerBase,
  isPlayerBaseSelected,
  getEntitiesByType,
  getEntitiesByFraction,
  entityExists,
  canMove,
  isPlayerUnit
} from "./utils/entity-utils.js"

// WASM imports
export { initWasm, init, gameInit, create_vehicle, update, select_entity, deselect_entity, set_group_target, create_base, build_floor, get_entity_info, create_random_alert, clear_selection, handle_entity_selection, get_entities_data } from "./wasm-imports.js"

export default {
  // Core
  StateContainer,
  createContainer,
  GameEngine,
  System,
  createEngine,
  EntityRepository,
  createRepository,
  GameCleanup,
  createCleanupScope,
  
  // Selection
  SelectionIndicator,
  createSelectionIndicator,
  
  // Systems
  RendererSystem,
  createRenderer,
  InputSystem,
  createInputSystem,
  SelectionSystem,
  createSelectionSystem,
  GameStateSystem,
  createGameStateSystem,
  EntitySpawnSystem,
  createEntitySpawnSystem,
  
  // Utils
  calculateDistance,
  calculateDistanceBetween,
  clamp,
  lerp,
  CoordinateTransformer,
  createCoordinateTransformer,
  createEntitySprite,
  getEntityColor,
  drawEntity,
  drawEntityShape,
  drawBaseShape,
  drawAlertShape,
  createEntityData,
  findPlayerBase,
  isPlayerBaseSelected,
  getEntitiesByType,
  getEntitiesByFraction,
  entityExists,
  canMove,
  isPlayerUnit,
  createDisposable,
  TimerManager,
  EventManager,
  GraphicsCleanup,
  Cleanupable,
  TransformerProvider,
  TransformerMixin,
  
  // WASM
  initWasm,
  init,
  gameInit,
  create_vehicle,
  update,
  select_entity,
  deselect_entity,
  set_group_target,
  create_base,
  build_floor,
  get_entity_info,
  create_random_alert,
  clear_selection,
  handle_entity_selection,
  get_entities_data
}
