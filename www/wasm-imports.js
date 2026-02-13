// Импорты функций WebAssembly
// Exports WASM functions directly for use in GameApi
import { initSync, init } from './pkg/nation_of_last_land.js'

export { default as initWasm } from './pkg/nation_of_last_land.js'
export { initSync }
export { init }

// Экспортируем функции WASM для прямого использования
export { create_vehicle, update, select_entity, deselect_entity, set_group_target, create_base, build_floor, get_entity_info, create_random_alert, clear_selection, handle_entity_selection, get_entities_data } from './pkg/nation_of_last_land.js'
