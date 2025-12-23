use crate::api::init::GAME_WORLD;
use crate::game::components::Movement;
use hecs::Entity;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct MovementResult {
    pub success: bool,
    pub message: String,
}

#[wasm_bindgen]
pub fn set_entity_target(entity_id: u32, target_x: f32, target_y: f32) -> Result<String, JsValue> {
    unsafe {
        if let Some(world) = &mut GAME_WORLD {
            // Find the entity by ID
            let entity = match Entity::from_bits(entity_id as u64) {
                Some(entity) => entity,
                None => {
                    let result = MovementResult {
                        success: false,
                        message: "Invalid entity ID".to_string(),
                    };
                    return serde_json::to_string(&result)
                        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)));
                }
            };

            // Try to get the movement component for this entity
            match world.world.query_one::<&mut Movement>(entity) {
                Ok(mut query) => {
                    if let Some(movement) = query.get() {
                        // Set the target
                        movement.set_target(target_x, target_y);

                        let result = MovementResult {
                            success: true,
                            message: format!("Target set for entity {}: ({}, {})", entity_id, target_x, target_y),
                        };

                        serde_json::to_string(&result)
                            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
                    } else {
                        let result = MovementResult {
                            success: false,
                            message: format!("Entity {} does not have movement component", entity_id),
                        };

                        serde_json::to_string(&result)
                            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
                    }
                }
                Err(_) => {
                    let result = MovementResult {
                        success: false,
                        message: format!("Entity {} not found", entity_id),
                    };

                    serde_json::to_string(&result)
                        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
                }
            }
        } else {
            let result = MovementResult {
                success: false,
                message: "Game world not initialized".to_string(),
            };

            serde_json::to_string(&result)
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
        }
    }
}
