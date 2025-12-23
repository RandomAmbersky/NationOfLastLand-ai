use crate::game::GameWorld;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct GameState {
    pub time: f32,
    pub entities_count: usize,
}

#[wasm_bindgen]
pub fn init() -> Result<String, JsValue> {
    let world = GameWorld::new();
    let state = GameState {
        time: world.time,
        entities_count: world.world.len() as usize,
    };

    serde_json::to_string(&state)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}
