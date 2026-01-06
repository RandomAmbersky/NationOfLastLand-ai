# Nation of Last Land - TODO List

## Проектные основы
- [x] **setup_project_structure**: Set up Rust project with hecs, serde, and YAML support
- [x] **create_ecs_components**: Design and implement ECS components (Position, Health, Movement, etc.)
- [x] **define_unit_configs**: Create YAML configuration files for units, alerts, and upgrades
- [x] **create_wasm_api**: Implement WebAssembly API functions (init, create_vehicle, update)
- [x] **integrate_game_loop**: Connect ECS systems to game loop and API responses

## Базовые игровые системы
- [ ] **implement_map_system**: Implement map system with tile-based positioning
- [x] **create_alert_system**: Create alert generation and reveal mechanics
- [x] **implement_movement_system**: Implement unit movement towards targets
- [ ] **implement_pathfinding**: Add pathfinding and navigation system for unit movement
- [ ] **add_fog_of_war**: Implement fog of war and area discovery mechanics
- [x] **create_combat_system**: Add combat mechanics with damage types and resistances
- [x] **add_damage_types**: Implement damage types (physical, acid, radiation, fire) and resistance system
- [ ] **implement_vehicle_devices**: Implement modular device system for vehicles (turrets, accelerators, armor, stealth)
- [ ] **add_device_conflicts**: Implement device compatibility and conflict system for vehicles

## Экономическая система
- [ ] **add_resource_system**: Implement reputation system and resource management
- [ ] **implement_resource_system**: Implement multiple resource types (reputation, silver, gold, platinum)
- [ ] **add_resource_alerts**: Add Resource Alert type (silver, gold, platinum deposits)
- [ ] **implement_resource_collection**: Implement resource collection and transportation mechanics
- [ ] **add_storage_floor**: Add FLOOR_STORAGE for storing collected resources

## Система улучшений
- [ ] **implement_upgrade_system**: Create unit purchasing and upgrade mechanics
- [ ] **add_unit_limits**: Add unit limit management and base expansion
- [x] **implement_floor_system**: Implement base expansion with floors (regular FLOORS and FLOOR_REPAIR)
- [ ] **add_repair_mechanics**: Add unit repair mechanics when returning to FLOOR_REPAIR
- [ ] **add_repair_upgrades**: Add FLOOR_REPAIR upgrade system for faster repair speeds

## Система баз
- [ ] **implement_multiple_bases**: Implement multiple base placement and management system
- [ ] **add_base_construction**: Add base construction mechanics and placement restrictions
- [ ] **implement_unit_reassignment**: Implement unit reassignment between different bases
- [ ] **add_resource_distribution**: Implement shared reputation system across all bases

## Исследовательская система
- [ ] **add_science_collection**: Implement science collection after enemy destruction
- [ ] **add_laboratory_floor**: Add FLOOR_LABORATORY for researching collected science
- [ ] **implement_research_system**: Create research system with different science types and benefits
- [ ] **add_laboratory_upgrades**: Add laboratory upgrade system for faster research
- [ ] **add_specialized_laboratories**: Add different laboratory types (biology, technology, ecology, universal)
- [ ] **implement_laboratory_progression**: Implement laboratory progression from specialized to universal

## Система котов
- [ ] **add_crew_system**: Implement anthropomorphic cat crew members with independent movement and vehicle boarding (driver/gunner roles)
- [ ] **add_cat_health**: Add cat health system and healing mechanics
- [ ] **add_cat_transport**: Implement cat transportation between bases
- [ ] **add_rest_floor**: Add FLOOR_REST for cat recovery and fatigue reduction
- [ ] **add_cat_fatigue**: Implement cat fatigue system and recovery mechanics
- [ ] **update_cat_healing**: Add cat healing mechanics in FLOOR_LAB_BIOLOGY
- [ ] **add_main_cat_avatar**: Implement SP1 'Excellent' as player avatar with unique abilities
- [ ] **implement_time_rewind**: Add time rewind mechanic when SP1 dies
- [ ] **add_progress_preservation**: Implement progress preservation system - only SP1 skills survive time rewind

## Система экипировки
- [ ] **add_equipment_system**: Implement equipment system for cats (helmets, glasses, headphones, etc.)
- [ ] **add_workshop_floor**: Add item crafting capabilities to FLOOR_LAB_TECHNOLOGY
- [ ] **add_ring_system**: Implement ring system (3 rings per paw) with various effects
- [ ] **add_equipment_tiers**: Add equipment series system (3 tiers of equipment quality)
- [ ] **add_equipment_conflicts**: Implement equipment slot blocking system (helmets block glasses/headphones, armor blocks shoulder pads/sleeves/gloves)

## Интерфейс и пользовательский опыт
- [ ] **create_game_interface**: Develop main game UI with map, panels, and controls
- [ ] **add_base_ui**: Create detailed base management interface with floors and queues
- [ ] **implement_unit_ui**: Add unit control interface with equipment and device management
- [ ] **add_alert_ui**: Create alert and mission management interface with risk indicators
- [ ] **create_time_rewind_ui**: Implement time rewind screen with progress preservation display

## Оптимизация и качество
- [ ] **add_performance_optimization**: Implement performance optimizations for large numbers of units
- [ ] **implement_save_system**: Add game save/load functionality with progress preservation
- [ ] **add_game_balance**: Implement game balance testing and tuning systems
- [ ] **create_unit_tests**: Add unit tests for core systems and API functions
- [ ] **add_integration_tests**: Implement integration tests for game mechanics and UI
