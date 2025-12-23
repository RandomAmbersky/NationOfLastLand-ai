use crate::api::init::{GAME_WORLD, get_game_config};
use crate::game::components::{Position, Movement, Vehicle, VehicleType, Health, Faction};
use crate::game::systems::combat;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct VehicleCreationResult {
    pub id: u32,
    pub success: bool,
    pub message: String,
}

#[wasm_bindgen]
pub fn create_vehicle(vehicle_type: &str, x: f32, y: f32) -> Result<String, JsValue> {
    unsafe {
        if let Some(world) = &mut GAME_WORLD {
            // Parse vehicle type from string
            let vehicle_config_key = match vehicle_type {
                "scout" => "scout_car",
                "tank" => "heavy_tank",
                "transport" => "armored_truck",
                _ => "scout_car", // Default to scout
            };

            // Parse vehicle type enum for other uses
            let vehicle_type_enum = match vehicle_type {
                "scout" => VehicleType::ScoutCar,
                "tank" => VehicleType::HeavyTank,
                "transport" => VehicleType::ArmoredTruck,
                _ => VehicleType::ScoutCar, // Default to scout
            };

            // Get health from config as well
            let base_health = if let Some(config) = get_game_config() {
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

            // Spawn entity in ECS world
            let entity = world.world.spawn((position, movement, vehicle, health));

            // Add combat capabilities
            combat::add_combat_to_vehicle(&mut world.world, entity);

            // Add faction (player faction by default for player-created units)
            combat::add_faction_to_entity(&mut world.world, entity, Faction::Player);

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
}
