use crate::api::init::GameState;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn update(dt: f32) -> Result<String, JsValue> {
    // TODO: Update game world
    let state = GameState {
        time: 0.0, // TODO: Get from actual world
        entities_count: 0, // TODO: Get from actual world
    };

    serde_json::to_string(&state)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}
