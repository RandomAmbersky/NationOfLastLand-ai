/**
 * Game API - Abstraction layer over WASM functions
 * Provides clean interface for game operations without exposing WASM internals
 */

// Import WASM functions directly
import { init, create_vehicle, update, select_entity, deselect_entity, set_group_target, create_base, build_floor, get_entity_info, create_random_alert, clear_selection, handle_entity_selection, get_entities_data } from '../wasm-imports.js'

/**
 * @typedef {Object} EntityData
 * @property {number} id - Entity ID
 * @property {string} entity_type - Type of entity (vehicle, base, alert)
 * @property {string} subtype - Subtype (scout, tank, transport, etc.)
 * @property {string} [fraction] - Faction (Player, Enemy, Neutral, Wild)
 * @property {{x: number, y: number}} position - Position
 */

/**
 * @typedef {Object} BaseData
 * @property {number} id - Base ID
 * @property {number} [floors_count] - Number of built floors
 * @property {number} [max_floors] - Maximum floors capacity
 */

/**
 * @typedef {Object} GameState
 * @property {number} time - Game time in seconds
 * @property {number} entities_count - Total entity count
 * @property {number} alerts_count - Active alert count
 * @property {EntityData[]} [entities] - Array of entity data
 */

/**
 * Game API - Abstraction over WASM functions
 * All methods return plain data objects, not JSON strings
 */
export class GameApi {
  /**
   * @param {Object} [wasm] - Optional WASM module with async functions. If not provided, uses default imports.
   * @param {Function} [wasm.init] - Initialize game world
   * @param {Function} [wasm.create_vehicle] - Create vehicle entity
   * @param {Function} [wasm.update] - Update game state
   * @param {Function} [wasm.select_entity] - Select entity
   * @param {Function} [wasm.deselect_entity] - Deselect entity
   * @param {Function} [wasm.clear_selection] - Clear all selections
   * @param {Function} [wasm.set_group_target] - Set target for selected group
   * @param {Function} [wasm.handle_entity_selection] - Handle entity click
   * @param {Function} [wasm.create_base] - Create player base
   * @param {Function} [wasm.build_floor] - Build floor on base
   * @param {Function} [wasm.get_entity_info] - Get entity info
   * @param {Function} [wasm.create_random_alert] - Create random alert
   * @param {Function} [wasm.get_entities_data] - Get all entities
   */
  constructor (wasm = null) {
    // If no wasm provided, bind directly to imports
    if (!wasm) {
      this.wasm = {
        init: () => init(),
        create_vehicle: (type, x, y) => create_vehicle(type, x, y),
        update: (dt) => update(dt),
        select_entity: (id) => select_entity(id),
        deselect_entity: (id) => deselect_entity(id),
        clear_selection: () => clear_selection(),
        set_group_target: (x, y) => set_group_target(x, y),
        handle_entity_selection: (x, y) => handle_entity_selection(x, y),
        create_base: (x, y) => create_base(x, y),
        build_floor: (baseId, floorType) => build_floor(baseId, floorType),
        get_entity_info: (id) => get_entity_info(id),
        create_random_alert: () => create_random_alert(),
        get_entities_data: () => get_entities_data()
      }
    } else {
      this.wasm = wasm
    }
  }

  /**
   * Initialize the game world
   * @returns {Promise<GameState>} Initial game state
   */
  async initialize () {
    if (!this.wasm.init) {
      throw new Error('GameApi: init function not available')
    }
    const result = this.wasm.init()
    return this._parseResult(result)
  }

  /**
   * Spawn a new vehicle
   * @param {string} vehicleType - Type of vehicle (scout, tank, transport)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Promise<EntityData>} Created vehicle data
   */
  async spawnVehicle (vehicleType, x, y) {
    if (!this.wasm.create_vehicle) {
      throw new Error('GameApi: create_vehicle function not available')
    }
    const result = this.wasm.create_vehicle(vehicleType, x, y)
    return this._parseResult(result)
  }

  /**
   * Create a player base
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Promise<BaseData>} Created base data
   */
  async createBase (x, y) {
    if (!this.wasm.create_base) {
      throw new Error('GameApi: create_base function not available')
    }
    const result = this.wasm.create_base(x, y)
    return this._parseResult(result)
  }

  /**
   * Build a floor on base
   * @param {number} baseId - Base entity ID
   * @param {string} floorType - Floor type (storage, laboratory, repair, rest)
   * @returns {Promise<BaseData>} Updated base data
   */
  async buildFloor (baseId, floorType) {
    if (!this.wasm.build_floor) {
      throw new Error('GameApi: build_floor function not available')
    }
    const result = this.wasm.build_floor(baseId, floorType)
    return this._parseResult(result)
  }

  /**
   * Select an entity
   * @param {number} entityId - Entity ID to select
   */
  selectEntity (entityId) {
    if (!this.wasm.select_entity) {
      throw new Error('GameApi: select_entity function not available')
    }
    this.wasm.select_entity(entityId)
  }

  /**
   * Deselect an entity
   * @param {number} entityId - Entity ID to deselect
   */
  deselectEntity (entityId) {
    if (!this.wasm.deselect_entity) {
      throw new Error('GameApi: deselect_entity function not available')
    }
    this.wasm.deselect_entity(entityId)
  }

  /**
   * Clear all selections
   */
  clearSelection () {
    if (!this.wasm.clear_selection) {
      throw new Error('GameApi: clear_selection function not available')
    }
    this.wasm.clear_selection()
  }

  /**
   * Set movement target for selected group
   * @param {number} x - Target X coordinate
   * @param {number} y - Target Y coordinate
   */
  setGroupTarget (x, y) {
    if (!this.wasm.set_group_target) {
      throw new Error('GameApi: set_group_target function not available')
    }
    this.wasm.set_group_target(x, y)
  }

  /**
   * Handle entity selection on click
   * @param {number} x - Click X coordinate
   * @param {number} y - Click Y coordinate
   */
  handleEntitySelection (x, y) {
    if (!this.wasm.handle_entity_selection) {
      throw new Error('GameApi: handle_entity_selection function not available')
    }
    this.wasm.handle_entity_selection(x, y)
  }

  /**
   * Create a random alert
   * @returns {Promise<EntityData>} Created alert data
   */
  async createRandomAlert () {
    if (!this.wasm.create_random_alert) {
      throw new Error('GameApi: create_random_alert function not available')
    }
    const result = this.wasm.create_random_alert()
    return this._parseResult(result)
  }

  /**
   * Get all entities data
   * @returns {Promise<EntityData[]>} Array of entity data
   */
  async getEntitiesData () {
    if (!this.wasm.get_entities_data) {
      throw new Error('GameApi: get_entities_data function not available')
    }
    const result = this.wasm.get_entities_data()
    return this._parseResult(result)
  }

  /**
   * Get info about specific entity
   * @param {number} entityId - Entity ID
   * @returns {Promise<EntityData>} Entity data
   */
  async getEntityInfo (entityId) {
    if (!this.wasm.get_entity_info) {
      throw new Error('GameApi: get_entity_info function not available')
    }
    const result = this.wasm.get_entity_info(entityId)
    return this._parseResult(result)
  }

  /**
   * Update game state
   * @param {number} dt - Delta time in seconds
   * @returns {Promise<GameState>} Updated game state
   */
  async update (dt) {
    if (!this.wasm.update) {
      throw new Error('GameApi: update function not available')
    }
    const result = this.wasm.update(dt)
    return this._parseResult(result)
  }

  /**
   * Parse JSON result from WASM
   * @param {string} jsonString - JSON string from WASM
   * @returns {Object} Parsed object
   * @private
   */
  _parseResult (jsonString) {
    if (typeof jsonString === 'string') {
      try {
        return JSON.parse(jsonString)
      } catch (error) {
        console.error('GameApi: Failed to parse result:', jsonString)
        throw error
      }
    }
    return jsonString
  }
}

/**
 * Create a new GameApi instance
 * @param {Object} [wasm] - Optional WASM module with functions. If not provided, uses default imports.
 * @returns {GameApi} New GameApi instance
 */
export function createGameApi (wasm = null) {
  return new GameApi(wasm)
}
