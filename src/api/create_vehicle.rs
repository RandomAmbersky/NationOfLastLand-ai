use crate::api::init::{get_game_config, GAME_WORLD};
use crate::game::components::{
    Faction, Health, Movement, Position, Selection, Vehicle, VehicleType,
};
use crate::game::systems::combat;
use crate::game::GameWorld;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct VehicleCreationResult {
    pub id: u32,
    pub success: bool,
    pub message: String,
}

/// Clear selection for all entities in the given world
fn clear_current_selection(world: &mut GameWorld) {
    // Clear selection for all entities
    for (_, selection) in world.world.query::<&mut Selection>().iter() {
        if selection.is_selected {
            selection.deselect();
        }
    }
}

/// Internal function to create a vehicle in a given world (used by both create_vehicle and init)
pub fn create_vehicle_in_world(world: &mut hecs::World, vehicle_type: &str, x: f32, y: f32) -> hecs::Entity {
    // Parse vehicle type enum for other uses
    let vehicle_type_enum = match vehicle_type {
        "scout" => VehicleType::ScoutCar,
        "tank" => VehicleType::HeavyTank,
        "transport" => VehicleType::ArmoredTruck,
        _ => VehicleType::ScoutCar, // Default to scout
    };

    // Get health from config or use fallback
    let base_health = if let Some(config) = get_game_config() {
        let vehicle_config_key = match vehicle_type {
            "scout" => "scout_car",
            "tank" => "heavy_tank",
            "transport" => "armored_truck",
            _ => "scout_car",
        };
        if let Some(vehicle_config) = config.get_vehicle(vehicle_config_key) {
            vehicle_config.base_health
        } else {
            vehicle_type_enum.base_health() // Fallback
        }
    } else {
        vehicle_type_enum.base_health() // Fallback
    };

    // Get speed from config or use fallback
    let base_speed = if let Some(config) = get_game_config() {
        let vehicle_config_key = match vehicle_type {
            "scout" => "scout_car",
            "tank" => "heavy_tank",
            "transport" => "armored_truck",
            _ => "scout_car",
        };
        if let Some(vehicle_config) = config.get_vehicle(vehicle_config_key) {
            vehicle_config.base_speed
        } else {
            vehicle_type_enum.base_speed() // Fallback
        }
    } else {
        vehicle_type_enum.base_speed() // Fallback
    };

    // Create position, movement and vehicle components
    let position = Position::new(x, y);
    let movement = Movement::new(base_speed);
    let vehicle = Vehicle::new(vehicle_type_enum);
    let health = Health::new(base_health);
    let selection = Selection::new();

    // Spawn entity in ECS world
    let entity = world.spawn((position, movement, vehicle, health, selection));

    // Add combat capabilities
    combat::add_combat_to_vehicle(world, entity);

    // Add faction (player faction by default for player-created units)
    combat::add_faction_to_entity(world, entity, Faction::Player);

    entity
}

#[wasm_bindgen]
pub fn create_vehicle(vehicle_type: &str, x: f32, y: f32) -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let mut world = world
            .write()
            .map_err(|_| JsValue::from_str("Failed to acquire write lock"))?;
        // Clear current selection before creating new vehicle
        clear_current_selection(&mut world);

        // Use the shared internal function
        let entity = create_vehicle_in_world(&mut world.world, vehicle_type, x, y);

        let result = VehicleCreationResult {
            id: entity.id(),
            success: true,
            message: format!("Created {} at ({}, {})", vehicle_type, x, y),
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    } else {
        let result = VehicleCreationResult {
            id: 0,
            success: false,
            message: "Game world not initialized".to_string(),
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}
