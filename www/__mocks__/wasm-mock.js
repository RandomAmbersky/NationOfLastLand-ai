// Mock for WASM files
// This file mocks the WASM module for testing

export const initWasm = jest.fn(() => Promise.resolve())
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

export default initWasm
