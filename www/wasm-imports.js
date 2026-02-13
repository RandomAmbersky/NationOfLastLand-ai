// Импорты функций WebAssembly
// Сначала экспортируем default (функцию загрузки WASM)
import initWasmInternal, { initSync, init } from './pkg/nation_of_last_land.js'

// GameApi - создаем с обернутыми функциями
import { GameApi as GameApiClass } from './api/GameApi.js'

export { default as initWasm } from './pkg/nation_of_last_land.js'
export { initSync as gameInit }
export { init }

// Экспортируем обернутые функции
export { create_vehicle, update, select_entity, deselect_entity, set_group_target, create_base, build_floor, get_entity_info, create_random_alert, clear_selection, handle_entity_selection, get_entities_data } from './pkg/nation_of_last_land.js'

// Создаем GameApi с обернутыми функциями
export function createGameApiWithWasm (wasm) {
  // Создаем объект с обернутыми функциями
  const wrappedWasm = {
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
  return new GameApiClass(wrappedWasm)
}
