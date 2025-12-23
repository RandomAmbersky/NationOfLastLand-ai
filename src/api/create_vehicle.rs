use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct VehicleCreationResult {
    pub id: u64,
    pub success: bool,
    pub message: String,
}

#[wasm_bindgen]
pub fn create_vehicle(vehicle_type: &str, x: f32, y: f32) -> Result<String, JsValue> {
    // TODO: Implement vehicle creation logic
    let result = VehicleCreationResult {
        id: 0, // TODO: Generate proper ID
        success: true,
        message: format!("Created {} at ({}, {})", vehicle_type, x, y),
    };

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}
