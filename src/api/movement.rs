use crate::api::init::GAME_WORLD;
use crate::game::components::{Movement, FractionComponent, Fraction};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct MovementResult {
    pub success: bool,
    pub message: String,
}

#[wasm_bindgen]
pub fn set_entity_target(entity_id: u32, target_x: f32, target_y: f32) -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let world = world
            .write()
            .map_err(|_| JsValue::from_str("Failed to acquire write lock"))?;
        // Find the entity by ID
        let mut found_entity_id = None;
        for (entity, _) in world.world.query::<&Movement>().iter() {
            if entity.id() == entity_id {
                found_entity_id = Some(entity);
                break;
            }
        }

        match found_entity_id {
            Some(entity) => {
                // Check if entity belongs to player fraction
                let is_player_entity = if let Ok(faction) = world.world.get::<&FractionComponent>(entity) {
                    faction.fraction == Fraction::Player
                } else {
                    false
                };

                // Players can only set targets for their own units (player fraction)
                if !is_player_entity {
                    let result = MovementResult {
                        success: false,
                        message: format!("Cannot set target for enemy entity {}", entity_id),
                    };
                    return serde_json::to_string(&result)
                        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)));
                }

                // Now get mutable access to the movement component
                match world.world.query_one::<&mut Movement>(entity) {
                    Ok(mut query) => {
                        if let Some(movement) = query.get() {
                            // Set the target
                            movement.set_target(target_x, target_y);

                            let result = MovementResult {
                                success: true,
                                message: format!(
                                    "Target set for entity {}: ({}, {})",
                                    entity_id, target_x, target_y
                                ),
                            };

                            serde_json::to_string(&result).map_err(|e| {
                                JsValue::from_str(&format!("Serialization error: {}", e))
                            })
                        } else {
                            let result = MovementResult {
                                success: false,
                                message: format!(
                                    "Entity {} does not have movement component",
                                    entity_id
                                ),
                            };

                            serde_json::to_string(&result).map_err(|e| {
                                JsValue::from_str(&format!("Serialization error: {}", e))
                            })
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
            }
            None => {
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
