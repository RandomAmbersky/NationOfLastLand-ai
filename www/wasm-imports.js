// Импорты функций WebAssembly
// Сначала экспортируем default (функцию загрузки WASM)
export { default as initWasm } from '../pkg/nation_of_last_land.js'

// Остальные функции - init и gameInit это одно и то же
export { init, init as gameInit, create_vehicle, update, select_entity, deselect_entity, set_group_target, create_base, build_floor, get_entity_info, create_random_alert, clear_selection, handle_entity_selection, get_entities_data } from '../pkg/nation_of_last_land.js'
