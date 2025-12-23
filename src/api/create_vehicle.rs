use crate::api::init::GAME_WORLD;
use crate::game::components::{Position, Vehicle, VehicleType};
use hecs::Entity;
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
            let vehicle_type_enum = match vehicle_type {
                "scout" => VehicleType::ScoutCar,
                "tank" => VehicleType::HeavyTank,
                "transport" => VehicleType::ArmoredTruck,
                _ => VehicleType::ScoutCar, // Default to scout
            };

            // Create position and vehicle components
            let position = Position::new(x, y);
            let vehicle = Vehicle::new(vehicle_type_enum);

            // Spawn entity in ECS world
            let entity = world.world.spawn((position, vehicle));

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
