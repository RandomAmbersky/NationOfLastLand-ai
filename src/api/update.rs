use crate::api::init::{get_entities_data, GameState, GAME_WORLD};
use crate::game::Alert;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn update(dt: f32) -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let mut world = world
            .write()
            .map_err(|_| JsValue::from_str("Failed to acquire write lock"))?;

        world.update(dt);

        let entities = get_entities_data(&world.world);
        let alerts_count = world.world.query::<&Alert>().iter().count();
        let debug_messages = world.debug_messages.clone();
        world.debug_messages.clear(); // Clear after sending

        // Get removed entities from the world (populated during update)
        let removed_entities = world.removed_entities.clone();

        let state = GameState {
            time: world.time,
            entities_count: entities.len(),
            entities,
            alerts_count,
            debug_messages,
            removed_entities,
        };

        serde_json::to_string(&state)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    } else {
        Err(JsValue::from_str("Game world not initialized"))
    }
}
