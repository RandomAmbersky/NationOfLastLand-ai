// Mock for wasm-imports.js
// This file mocks the WASM imports for testing

const initWasmMock = jest.fn(() => Promise.resolve())
export default initWasmMock
export const initWasm = initWasmMock
export const initSync = jest.fn()
export const init = jest.fn(() => JSON.stringify({ time: 0, entities_count: 0, alerts_count: 0, entities: [] }))
export const update = jest.fn(() => JSON.stringify({ time: 1, entities_count: 0, alerts_count: 0, entities: [], removed_entities: [] }))
export const create_vehicle = jest.fn(() => JSON.stringify({ success: true, id: 1, entity_type: 'vehicle', subtype: 'scout' }))
export const select_entity = jest.fn()
export const deselect_entity = jest.fn()
export const set_group_target = jest.fn()
export const create_base = jest.fn(() => JSON.stringify({ success: true, id: 2, entity_type: 'base' }))
export const build_floor = jest.fn(() => JSON.stringify({ success: true, id: 2, floors_count: 1 }))
export const get_entity_info = jest.fn(() => JSON.stringify({ success: true, id: 1, entity_type: 'vehicle' }))
export const create_random_alert = jest.fn(() => JSON.stringify({ success: true, id: 3, entity_type: 'alert' }))
export const clear_selection = jest.fn()
export const handle_entity_selection = jest.fn(() => JSON.stringify({ success: true }))
export const get_entities_data = jest.fn(() => JSON.stringify({ time: 0, entities_count: 0, alerts_count: 0, entities: [] }))

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
    return JSON.stringify({ time: 0, entities_count: 0, alerts_count: 0, entities: [] })
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
