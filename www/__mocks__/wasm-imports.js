// Mock for wasm-imports.js
// This file mocks the WASM imports for testing

const initWasmMock = jest.fn(() => Promise.resolve())
export default initWasmMock
export const initWasm = initWasmMock
export const initSync = jest.fn()
export const init = jest.fn(() => Promise.resolve())
export const gameInit = jest.fn(() => Promise.resolve())
export const create_vehicle = jest.fn()
export const update = jest.fn()
export const select_entity = jest.fn()
export const deselect_entity = jest.fn()
export const set_group_target = jest.fn()
export const create_base = jest.fn()
export const build_floor = jest.fn()
export const get_entity_info = jest.fn()
export const create_random_alert = jest.fn()
export const clear_selection = jest.fn()
export const handle_entity_selection = jest.fn()
export const get_entities_data = jest.fn()

// Mock GameApi class
export class GameApi {
  constructor (wasm = null) {
    this.wasm = wasm || {
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
  }

  async initialize () {
    return { time: 0, entities_count: 0, alerts_count: 0, entities: [] }
  }

  async spawnVehicle (type, x, y) {
    return { success: true, id: 1, entity_type: 'vehicle', position: { x, y } }
  }

  async createBase (x, y) {
    return { success: true, id: 2, entity_type: 'base', position: { x, y } }
  }

  async buildFloor (baseId, floorType) {
    return { success: true, id: baseId, floors_count: 1 }
  }

  async createRandomAlert () {
    return { success: true, id: 3, entity_type: 'alert' }
  }

  setGroupTarget (x, y) {
    return { success: true }
  }

  clearSelection () {}
}
