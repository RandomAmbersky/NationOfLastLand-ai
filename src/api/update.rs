use crate::api::init::{GameState, GAME_WORLD, get_entities_data};
use crate::game::Alert;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[allow(static_mut_refs)]
pub fn update(dt: f32) -> Result<String, JsValue> {
    unsafe {
        if let Some(world) = unsafe { GAME_WORLD.as_mut() } {
            let world: &mut crate::game::GameWorld = world;
            world.update(dt);

            let entities = get_entities_data(&world.world);
            let alerts_count = world.world.query::<&Alert>().iter().count();
            let debug_messages = world.debug_messages.clone();
            world.debug_messages.clear(); // Clear after sending
            let state = GameState {
                time: world.time,
                entities_count: world.world.len() as usize,
                entities,
                alerts_count,
                debug_messages,
            };

            serde_json::to_string(&state)
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
        } else {
            Err(JsValue::from_str("Game world not initialized"))
        }
    }
}
