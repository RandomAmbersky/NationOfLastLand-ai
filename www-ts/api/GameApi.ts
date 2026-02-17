/**
 * Game API - Abstraction layer over WASM functions
 * Provides clean interface for game operations without exposing WASM internals
 */

import type { StateContainer } from './StateContainer.js'

// Wasm import type
interface WasmModule {
  init: () => string
  create_vehicle: (type: string, x: number, y: number) => string
  update: (dt: number) => string
  select_entity: (id: number) => void
  deselect_entity: (id: number) => void
  set_group_target: (x: number, y: number) => void
  create_base: (x: number, y: number) => string
  build_floor: (baseId: number, floorType: string) => string
  get_entity_info: (id: number) => string
  create_random_alert: () => string
  clear_selection: () => void
  handle_entity_selection: (x: number, y: number) => void
  get_entities_data: () => string
}

/**
 * Entity data interface
 */
export interface EntityData {
  id: number
  entity_type: string
  subtype: string
  fraction?: string
  position: { x: number, y: number } | number[]
}

/**
 * Base data interface
 */
export interface BaseData {
  id: number
  floors_count?: number
  max_floors?: number
}

/**
 * Game state interface
 */
export interface GameState {
  time: number
  entities_count: number
  alerts_count: number
  entities?: EntityData[]
}

/**
 * Game API - Abstraction over WASM functions
 * All methods return plain data objects, not JSON strings
 */
export class GameApi {
  public wasm: WasmModule

  /**
   * @param wasm - Optional WASM module with async functions. If not provided, uses default imports.
   */
  constructor (wasm: Partial<WasmModule> | null = null) {
    // If no wasm provided, bind directly to imports
    if (!wasm) {
      // Import WASM functions directly from local file
      import { init, create_vehicle, update, select_entity, deselect_entity, set_group_target, create_base, build_floor, get_entity_info, create_random_alert, clear_selection, handle_entity_selection, get_entities_data } from '../wasm-imports.js'
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
      this.wasm = wasm as WasmModule
    }
  }

  /**
   * Initialize the game world
   * @returns Initial game state
   */
  async initialize (): Promise<GameState> {
    if (!this.wasm.init) {
      throw new Error('GameApi: init function not available')
    }
    const result = this.wasm.init()
    return this._parseResult(result)
  }

  /**
   * Spawn a new vehicle
   * @param vehicleType - Type of vehicle (scout, tank, transport)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Created vehicle data
   */
  async spawnVehicle (vehicleType: string, x: number, y: number): Promise<EntityData> {
    if (!this.wasm.create_vehicle) {
      throw new Error('GameApi: create_vehicle function not available')
    }
    const result = this.wasm.create_vehicle(vehicleType, x, y)
    return this._parseResult(result)
  }

  /**
   * Create a player base
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Created base data
   */
  async createBase (x: number, y: number): Promise<BaseData> {
    if (!this.wasm.create_base) {
      throw new Error('GameApi: create_base function not available')
    }
    const result = this.wasm.create_base(x, y)
    return this._parseResult(result)
  }

  /**
   * Build a floor on base
   * @param baseId - Base entity ID
   * @param floorType - Floor type (storage, laboratory, repair, rest)
   * @returns Updated base data
   */
  async buildFloor (baseId: number, floorType: string): Promise<BaseData> {
    if (!this.wasm.build_floor) {
      throw new Error('GameApi: build_floor function not available')
    }
    const result = this.wasm.build_floor(baseId, floorType)
    return this._parseResult(result)
  }

  /**
   * Select an entity
   * @param entityId - Entity ID to select
   */
  selectEntity (entityId: number): void {
    if (!this.wasm.select_entity) {
      throw new Error('GameApi: select_entity function not available')
    }
    this.wasm.select_entity(entityId)
  }

  /**
   * Deselect an entity
   * @param entityId - Entity ID to deselect
   */
  deselectEntity (entityId: number): void {
    if (!this.wasm.deselect_entity) {
      throw new Error('GameApi: deselect_entity function not available')
    }
    this.wasm.deselect_entity(entityId)
  }

  /**
   * Clear all selections
   */
  clearSelection (): void {
    if (!this.wasm.clear_selection) {
      throw new Error('GameApi: clear_selection function not available')
    }
    this.wasm.clear_selection()
  }

  /**
   * Set movement target for selected group
   * @param x - Target X coordinate
   * @param y - Target Y coordinate
   */
  setGroupTarget (x: number, y: number): void {
    if (!this.wasm.set_group_target) {
      throw new Error('GameApi: set_group_target function not available')
    }
    this.wasm.set_group_target(x, y)
  }

  /**
   * Handle entity selection on click
   * @param x - Click X coordinate
   * @param y - Click Y coordinate
   */
  handleEntitySelection (x: number, y: number): void {
    if (!this.wasm.handle_entity_selection) {
      throw new Error('GameApi: handle_entity_selection function not available')
    }
    this.wasm.handle_entity_selection(x, y)
  }

  /**
   * Create a random alert
   * @returns Created alert data
   */
  async createRandomAlert (): Promise<EntityData> {
    if (!this.wasm.create_random_alert) {
      throw new Error('GameApi: create_random_alert function not available')
    }
    const result = this.wasm.create_random_alert()
    return this._parseResult(result)
  }

  /**
   * Get all entities data
   * @returns Array of entity data
   */
  async getEntitiesData (): Promise<EntityData[]> {
    if (!this.wasm.get_entities_data) {
      throw new Error('GameApi: get_entities_data function not available')
    }
    const result = this.wasm.get_entities_data()
    return this._parseResult(result)
  }

  /**
   * Get info about specific entity
   * @param entityId - Entity ID
   * @returns Entity data
   */
  async getEntityInfo (entityId: number): Promise<EntityData> {
    if (!this.wasm.get_entity_info) {
      throw new Error('GameApi: get_entity_info function not available')
    }
    const result = this.wasm.get_entity_info(entityId)
    return this._parseResult(result)
  }

  /**
   * Update game state
   * @param dt - Delta time in seconds
   * @returns Updated game state
   */
  async update (dt: number): Promise<GameState> {
    if (!this.wasm.update) {
      throw new Error('GameApi: update function not available')
    }
    const result = this.wasm.update(dt)
    return this._parseResult(result)
  }

  /**
   * Parse JSON result from WASM
   * @param jsonString - JSON string from WASM
   * @returns Parsed object
   * @private
   */
  _parseResult (jsonString: string): unknown {
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
 * @param wasm - Optional WASM module with functions. If not provided, uses default imports.
 * @returns New GameApi instance
 */
export function createGameApi (wasm: Partial<WasmModule> | null = null): GameApi {
  return new GameApi(wasm)
}
