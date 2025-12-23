use crate::api::init::{GameState, GAME_WORLD, get_entities_data};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn update(dt: f32) -> Result<String, JsValue> {
    unsafe {
        if let Some(world) = &mut GAME_WORLD {
            let world: &mut crate::game::GameWorld = world;
            world.update(dt);

            let entities = get_entities_data(&world.world);
            let state = GameState {
                time: world.time,
                entities_count: world.world.len() as usize,
                entities,
            };

            serde_json::to_string(&state)
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
        } else {
            Err(JsValue::from_str("Game world not initialized"))
        }
    }
}
