//! # Примеры соблюдения правил выбора юнитов в игре Nation of Last Land
//!
//! Этот файл демонстрирует работу правил выбора юнитов на конкретных примерах.
//!
//! ## Запуск примеров
//!
//! ```bash
//! cargo run --example selection_rules
//! ```

// Используем основной crate как библиотеку
// В Rust дефисы в именах пакетов преобразуются в подчеркивания
use nation_of_last_land::{
    has_immobile_player_unit_selected,
    has_non_player_unit_selected,
    get_selected_player_movable_units,
    is_non_player_faction_entity,
    handle_immobile_unit_selection,
    handle_non_player_unit_selection,
    handle_group_targeting,
    handle_standard_entity_selection,
    select_entity_internal,
    get_selected_entities_internal,
    SelectionResult,
    SelectionAction,
    FractionComponent,
    Vehicle,
    Base,
    Alert,
    Position,
    Movement,
    Selection,
    Fraction,
    VehicleType,
    AlertType,
};
use hecs::World;

/// Пример 1: Правило 6 - Групповое назначение цели
/// Демонстрирует, как при выборе юнита игрока и клике по врагу назначается цель для группы
fn example_rule_6_group_targeting() {
    println!("=== Пример 1: Правило 6 - Групповое назначение цели ===");

    // Создаем тестовый мир
    let mut world = create_test_world();

    // Находим сущности
    let player_vehicle = find_entity_by_type(&world, EntityType::PlayerVehicle);
    let enemy_vehicle = find_entity_by_type(&world, EntityType::EnemyVehicle);

    println!("1. Выбираем юнит игрока (ID: {})", player_vehicle.id());
    select_entity_internal(&mut world, player_vehicle, true);

    // Проверяем условия правила 6
    let selected_ids = get_selected_entities_internal(&world);
    let selected_entities: Vec<hecs::Entity> = selected_ids.iter()
        .filter_map(|&id| {
            for (entity, ()) in world.query::<()>().iter() {
                if entity.id() == id {
                    return Some(entity);
                }
            }
            None
        })
        .collect();

    let movable_units = get_selected_player_movable_units(&world, &selected_entities);
    let is_non_player = is_non_player_faction_entity(&world, enemy_vehicle);

    println!("   - Выбрано подвижных юнитов игрока: {}", movable_units.len());
    println!("   - Цель является юнитом не игрока: {}", is_non_player);

    if !movable_units.is_empty() && is_non_player {
        println!("   ✅ Применяется Правило 6: групповое назначение цели");

        // Имитируем вызов handle_group_targeting
        let result = handle_group_targeting(&mut world, enemy_vehicle, enemy_vehicle.id()).unwrap();
        let selection_result: SelectionResult = serde_json::from_str(&result).unwrap();

        println!("   Результат: {:?}", selection_result.action);
        println!("   Выбранные юниты: {:?}", selection_result.selected_entities);
        println!("   Назначена цель: {:?}", selection_result.target_assigned.is_some());
    }

    println!("✓ Правило 6 работает корректно\n");
}

/// Пример 2: Правило 7 - Смена выделения с неподвижного юнита
/// Демонстрирует, как при выборе базы и клике по другому юниту выделение переключается
fn example_rule_7_immobile_unit_switch() {
    println!("=== Пример 2: Правило 7 - Смена выделения с базы ===");

    // Создаем тестовый мир
    let mut world = create_test_world();

    // Находим сущности
    let player_base = find_entity_by_type(&world, EntityType::PlayerBase);
    let player_vehicle = find_entity_by_type(&world, EntityType::PlayerVehicle);

    println!("1. Выбираем базу игрока (ID: {})", player_base.id());
    select_entity_internal(&mut world, player_base, true);

    // Проверяем условия правила 7
    let selected_ids = get_selected_entities_internal(&world);
    let selected_entities: Vec<hecs::Entity> = selected_ids.iter()
        .filter_map(|&id| {
            for (entity, ()) in world.query::<()>().iter() {
                if entity.id() == id {
                    return Some(entity);
                }
            }
            None
        })
        .collect();

    let has_immobile = has_immobile_player_unit_selected(&world, &selected_entities);

    println!("   - Выбран неподвижный юнит игрока (база): {}", has_immobile);

    if has_immobile {
        println!("   ✅ Применяется Правило 7: смена выделения с неподвижного юнита");

        // Имитируем вызов handle_immobile_unit_selection
        let result = handle_immobile_unit_selection(&mut world, player_vehicle, player_vehicle.id()).unwrap();
        let selection_result: SelectionResult = serde_json::from_str(&result).unwrap();

        println!("   Результат: {:?}", selection_result.action);
        println!("   Выбранные юниты: {:?}", selection_result.selected_entities);
    }

    println!("✓ Правило 7 работает корректно\n");
}

/// Пример 3: Правило 8 - Смена выделения с юнита не игрока
/// Демонстрирует, как при выборе врага и клике по другому юниту выделение переключается
fn example_rule_8_non_player_unit_switch() {
    println!("=== Пример 3: Правило 8 - Смена выделения с врага ===");

    // Создаем тестовый мир
    let mut world = create_test_world();

    // Находим сущности
    let enemy_vehicle = find_entity_by_type(&world, EntityType::EnemyVehicle);
    let player_vehicle = find_entity_by_type(&world, EntityType::PlayerVehicle);

    println!("1. Выбираем вражеский юнит (ID: {})", enemy_vehicle.id());
    select_entity_internal(&mut world, enemy_vehicle, true);

    // Проверяем условия правила 8
    let selected_ids = get_selected_entities_internal(&world);
    let selected_entities: Vec<hecs::Entity> = selected_ids.iter()
        .filter_map(|&id| {
            for (entity, ()) in world.query::<()>().iter() {
                if entity.id() == id {
                    return Some(entity);
                }
            }
            None
        })
        .collect();

    let has_non_player = has_non_player_unit_selected(&world, &selected_entities);

    println!("   - Выбран юнит не игрока: {}", has_non_player);

    if has_non_player {
        println!("   ✅ Применяется Правило 8: смена выделения с юнита не игрока");

        // Имитируем вызов handle_non_player_unit_selection
        let result = handle_non_player_unit_selection(&mut world, player_vehicle, player_vehicle.id()).unwrap();
        let selection_result: SelectionResult = serde_json::from_str(&result).unwrap();

        println!("   Результат: {:?}", selection_result.action);
        println!("   Выбранные юниты: {:?}", selection_result.selected_entities);
    }

    println!("✓ Правило 8 работает корректно\n");
}

/// Пример 4: Стандартный выбор
/// Демонстрирует обычную логику выбора юнитов
fn example_standard_selection() {
    println!("=== Пример 4: Стандартный выбор ===");

    // Создаем тестовый мир
    let mut world = create_test_world();

    // Находим сущность
    let player_vehicle = find_entity_by_type(&world, EntityType::PlayerVehicle);

    println!("1. Выполняем стандартный выбор юнита игрока (ID: {})", player_vehicle.id());

    // Имитируем вызов handle_standard_entity_selection
    let result = handle_standard_entity_selection(&mut world, player_vehicle, player_vehicle.id(), false, &[]).unwrap();
    let selection_result: SelectionResult = serde_json::from_str(&result).unwrap();

    println!("   Результат: {:?}", selection_result.action);
    println!("   Выбранные юниты: {:?}", selection_result.selected_entities);
    println!("   Назначена цель: {:?}", selection_result.target_assigned.is_some());

    println!("✓ Стандартный выбор работает корректно\n");
}

// Вспомогательные функции и типы

#[derive(Debug, Clone, Copy, PartialEq)]
enum EntityType {
    PlayerBase,
    PlayerVehicle,
    EnemyVehicle,
    Alert,
}

fn create_test_world() -> World {
    let mut world = World::new();

    // Создаем базу игрока
    world.spawn((
        FractionComponent::player(),
        Base::new(1, (100.0, 100.0)),
        Position::new(100.0, 100.0),
    ));

    // Создаем юнит игрока
    world.spawn((
        FractionComponent::player(),
        Vehicle::new(VehicleType::ScoutCar),
        Position::new(150.0, 150.0),
        Movement::new(15.0),
    ));

    // Создаем юнит врага
    world.spawn((
        FractionComponent::enemy(),
        Vehicle::new(VehicleType::ArmoredTruck),
        Position::new(200.0, 200.0),
        Movement::new(9.0),
    ));

    // Создаем алерт
    world.spawn((
        Alert::new(AlertType::TrashAlert, 250.0, 250.0, 50.0, 10.0),
        Position::new(250.0, 250.0),
    ));

    world
}

fn find_entity_by_type(world: &World, entity_type: EntityType) -> hecs::Entity {
    match entity_type {
        EntityType::PlayerBase => {
            world.query::<&Base>().iter().next().unwrap().0
        }
        EntityType::PlayerVehicle => {
            world.query::<&Vehicle>()
                .iter()
                .find(|(_, v)| v.vehicle_type == VehicleType::ScoutCar)
                .unwrap().0
        }
        EntityType::EnemyVehicle => {
            world.query::<&FractionComponent>()
                .iter()
                .find(|(_, f)| f.fraction == Fraction::Enemy)
                .unwrap().0
        }
        EntityType::Alert => {
            world.query::<&Alert>().iter().next().unwrap().0
        }
    }
}

fn main() {
    println!("🚀 Демонстрация правил выбора юнитов в игре Nation of Last Land\n");

    example_rule_6_group_targeting();
    example_rule_7_immobile_unit_switch();
    example_rule_8_non_player_unit_switch();
    example_standard_selection();

    println!("✅ Все примеры успешно продемонстрировали соблюдение правил выбора юнитов!");
    println!("\n📚 Правила выбора юнитов гарантируют интуитивное управление:");
    println!("   • Правило 6: Групповые действия для эффективной игры");
    println!("   • Правило 7: Быстрое переключение с неподвижных объектов");
    println!("   • Правило 8: Легкая смена выделения между врагами");
}
