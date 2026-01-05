use crate::api::init::GAME_WORLD;
use crate::game::components::{Alert, AlertType, Selection};
use crate::game::systems::alert::generate_random_alert;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct AlertCreationResult {
    pub id: u32,
    pub success: bool,
    pub message: String,
}

#[wasm_bindgen]
pub fn create_random_alert() -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let mut world = world
            .write()
            .map_err(|_| JsValue::from_str("Failed to acquire write lock"))?;
        // Generate a random alert
        let alert = generate_random_alert();
        let alert_type = alert.alert_type;
        let position = alert.position;

        // Spawn alert entity with selection component
        let entity = world.world.spawn((alert, Selection::new()));

        let result = AlertCreationResult {
            id: entity.id(),
            success: true,
            message: format!(
                "Created random alert of type {:?} at ({}, {})",
                alert_type, position.x, position.y
            ),
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    } else {
        let result = AlertCreationResult {
            id: 0,
            success: false,
            message: "Game world not initialized".to_string(),
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

#[wasm_bindgen]
pub fn create_alert_at(x: f32, y: f32, alert_type_str: &str) -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let mut world = world
            .write()
            .map_err(|_| JsValue::from_str("Failed to acquire write lock"))?;
        // Parse alert type from string
        let alert_type = match alert_type_str {
            "trash" => AlertType::TrashAlert,
            "waste" => AlertType::WasteAlert,
            "mutant" => AlertType::MutantAlert,
            "raider" => AlertType::RaiderAlert,
            "survivor" => AlertType::SurvivorAlert,
            "trader" => AlertType::TraderAlert,
            "resource" => AlertType::ResourceDepositAlert,
            _ => AlertType::TrashAlert, // Default to trash alert
        };

        // Create alert with default parameters
        let (reveal_distance, reputation_reward) = match alert_type {
            AlertType::TrashAlert => (25.0, 10.0),
            AlertType::WasteAlert => (30.0, 25.0),
            AlertType::MutantAlert => (35.0, 50.0),
            AlertType::RaiderAlert => (40.0, 75.0),
            AlertType::SurvivorAlert => (35.0, 60.0),
            AlertType::TraderAlert => (30.0, 0.0),
            AlertType::ResourceDepositAlert => (28.0, 40.0),
        };

        let alert = Alert::new(alert_type, x, y, reveal_distance, reputation_reward);

        // Spawn alert entity with selection component
        let entity = world.world.spawn((alert, Selection::new()));

        let result = AlertCreationResult {
            id: entity.id(),
            success: true,
            message: format!("Created {} alert at ({}, {})", alert_type_str, x, y),
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    } else {
        let result = AlertCreationResult {
            id: 0,
            success: false,
            message: "Game world not initialized".to_string(),
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}
