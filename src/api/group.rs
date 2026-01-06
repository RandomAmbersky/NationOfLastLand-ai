use crate::api::init::GAME_WORLD;
use crate::game::components::Selection;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct GroupOperationResult {
    pub success: bool,
    pub message: String,
    pub selected_count: Option<u32>,
}

#[wasm_bindgen]
pub fn select_entity(entity_id: u32, exclusive: bool) -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let mut world = world
            .write()
            .map_err(|_| JsValue::from_str("Failed to acquire write lock"))?;
        // First find the target entity by ID among all entities
        let mut target_entity = None;
        for (entity, ()) in world.world.query::<()>().iter() {
            if entity.id() == entity_id {
                target_entity = Some(entity);
                break;
            }
        }

        // If exclusive mode, clear all selections first
        let mut cleared_count = 0;
        if exclusive {
            for (_, selection) in world.world.query::<&mut Selection>().iter() {
                if selection.is_selected {
                    selection.deselect();
                    cleared_count += 1;
                }
            }
        }

        match target_entity {
            Some(entity) => {
                // Check if entity belongs to Player faction (or is an alert, which can be selected regardless of faction)
                let is_player_faction = world.world.get::<&crate::game::components::FactionComponent>(entity)
                    .map(|faction| faction.faction == crate::game::components::Faction::Player)
                    .unwrap_or(false);

                let has_movement = world.world.get::<&crate::game::components::Movement>(entity).is_ok();
                let is_base = world.world.get::<&crate::game::components::Base>(entity).is_ok();
                let is_alert = world.world.get::<&crate::game::components::Alert>(entity).is_ok();

                // Alerts can be selected regardless of faction, but other entities must be player faction
                if !is_alert && !is_player_faction {
                    let result = GroupOperationResult {
                        success: false,
                        message: format!("Entity {} is not a player unit", entity_id),
                        selected_count: None,
                    };
                    return serde_json::to_string(&result)
                        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)));
                }

                // Allow selection if entity can move OR is a base OR is an alert
                let is_alert = world.world.get::<&crate::game::components::Alert>(entity).is_ok();
                if !has_movement && !is_base && !is_alert {
                    let result = GroupOperationResult {
                        success: false,
                        message: format!("Entity {} cannot move, is not a base, and is not an alert", entity_id),
                        selected_count: None,
                    };
                    return serde_json::to_string(&result)
                        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)));
                }

                // Check if entity has Selection component
                let has_selection = world.world.get::<&Selection>(entity).is_ok();

                if has_selection {
                    // Entity has Selection component - select it
                    if let Ok(mut query) = world.world.query_one::<&mut Selection>(entity) {
                        if let Some(selection) = query.get() {
                            selection.select();
                            println!(
                                "Selected entity {} (cleared {} others)",
                                entity_id, cleared_count
                            );

                            let result = GroupOperationResult {
                                success: true,
                                message: format!(
                                    "Entity {} selected (cleared {} other selections)",
                                    entity_id, cleared_count
                                ),
                                selected_count: Some(1),
                            };

                            serde_json::to_string(&result)
                                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
                        } else {
                            // Selection component exists but is None - this shouldn't happen
                            let result = GroupOperationResult {
                                success: false,
                                message: format!(
                                    "Entity {} has invalid selection component",
                                    entity_id
                                ),
                                selected_count: None,
                            };

                            serde_json::to_string(&result)
                                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
                        }
                    } else {
                        let result = GroupOperationResult {
                            success: false,
                            message: format!("Entity {} not found", entity_id),
                            selected_count: None,
                        };

                        serde_json::to_string(&result)
                            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
                    }
                } else {
                    // Entity doesn't have Selection component - add it
                    println!("Entity {} doesn't have Selection component, adding it", entity_id);
                    let selection = Selection::new();
                    let _ = world.world.insert_one(entity, selection);

                    // Now select it
                    if let Ok(mut query) = world.world.query_one::<&mut Selection>(entity) {
                        if let Some(selection) = query.get() {
                            selection.select();
                            println!("Added Selection component and selected entity {}", entity_id);

                            let result = GroupOperationResult {
                                success: true,
                                message: format!("Entity {} selected (added Selection component)", entity_id),
                                selected_count: Some(1),
                            };

                            serde_json::to_string(&result)
                                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
                        } else {
                            let result = GroupOperationResult {
                                success: false,
                                message: format!("Failed to add Selection component to entity {}", entity_id),
                                selected_count: None,
                            };

                            serde_json::to_string(&result)
                                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
                        }
                    } else {
                        let result = GroupOperationResult {
                            success: false,
                            message: format!("Failed to add Selection component to entity {}", entity_id),
                            selected_count: None,
                        };

                        serde_json::to_string(&result)
                            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
                    }
                }
            }
            None => {
                let result = GroupOperationResult {
                    success: false,
                    message: format!("Entity {} not found", entity_id),
                    selected_count: None,
                };

                serde_json::to_string(&result)
                    .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
            }
        }
    } else {
        let result = GroupOperationResult {
            success: false,
            message: "Game world not initialized".to_string(),
            selected_count: None,
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

#[wasm_bindgen]
pub fn deselect_entity(entity_id: u32) -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let world = world
            .write()
            .map_err(|_| JsValue::from_str("Failed to acquire write lock"))?;
        // Find the entity by ID among all entities
        let mut found_entity_id = None;
        for (entity, ()) in world.world.query::<()>().iter() {
            if entity.id() == entity_id {
                found_entity_id = Some(entity);
                break;
            }
        }

        match found_entity_id {
            Some(entity) => {
                // Get mutable access to the selection component
                match world.world.query_one::<&mut Selection>(entity) {
                    Ok(mut query) => {
                        if let Some(selection) = query.get() {
                            selection.deselect();

                            let result = GroupOperationResult {
                                success: true,
                                message: format!("Entity {} deselected", entity_id),
                                selected_count: None,
                            };

                            serde_json::to_string(&result).map_err(|e| {
                                JsValue::from_str(&format!("Serialization error: {}", e))
                            })
                        } else {
                            let result = GroupOperationResult {
                                success: false,
                                message: format!(
                                    "Entity {} does not have selection component",
                                    entity_id
                                ),
                                selected_count: None,
                            };

                            serde_json::to_string(&result).map_err(|e| {
                                JsValue::from_str(&format!("Serialization error: {}", e))
                            })
                        }
                    }
                    Err(_) => {
                        let result = GroupOperationResult {
                            success: false,
                            message: format!("Entity {} not found", entity_id),
                            selected_count: None,
                        };

                        serde_json::to_string(&result)
                            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
                    }
                }
            }
            None => {
                let result = GroupOperationResult {
                    success: false,
                    message: format!("Entity {} not found", entity_id),
                    selected_count: None,
                };

                serde_json::to_string(&result)
                    .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
            }
        }
    } else {
        let result = GroupOperationResult {
            success: false,
            message: "Game world not initialized".to_string(),
            selected_count: None,
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

#[wasm_bindgen]
pub fn clear_selection() -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let world = world
            .write()
            .map_err(|_| JsValue::from_str("Failed to acquire write lock"))?;
        let mut count = 0;
        // Clear selection for all entities
        for (_, selection) in world.world.query::<&mut Selection>().iter() {
            if selection.is_selected {
                selection.deselect();
                count += 1;
            }
        }

        let result = GroupOperationResult {
            success: true,
            message: format!("Cleared selection from {} entities", count),
            selected_count: Some(0),
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    } else {
        let result = GroupOperationResult {
            success: false,
            message: "Game world not initialized".to_string(),
            selected_count: None,
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

#[wasm_bindgen]
pub fn set_group_target(target_x: f32, target_y: f32) -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let world = world
            .write()
            .map_err(|_| JsValue::from_str("Failed to acquire write lock"))?;
        let mut selected_entities = Vec::new();

        // Find all selected entities
        for (entity, selection) in world.world.query::<&Selection>().iter() {
            if selection.is_selected {
                selected_entities.push(entity);
            }
        }

        if selected_entities.is_empty() {
            let result = GroupOperationResult {
                success: false,
                message: "No entities selected".to_string(),
                selected_count: Some(0),
            };
            return serde_json::to_string(&result)
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)));
        }

        // Calculate formation positions for the group
        let group_size = selected_entities.len() as f32;
        let formation_radius = (group_size * 15.0).sqrt(); // Adaptive radius based on group size

        let mut assigned_positions = Vec::new();

        for (i, &entity) in selected_entities.iter().enumerate() {
            // Calculate position in formation (circular formation for now)
            let angle = (i as f32 / group_size) * 2.0 * std::f32::consts::PI;
            let offset_x = formation_radius * angle.cos();
            let offset_y = formation_radius * angle.sin();

            let final_x = target_x + offset_x;
            let final_y = target_y + offset_y;

            assigned_positions.push((entity, final_x, final_y));
        }

        // Set targets for all selected entities that are vehicles (have Vehicle component)
        let mut success_count = 0;
        for (entity, x, y) in assigned_positions {
            // Check if this entity is a vehicle (has Vehicle component) before setting movement target
            if world.world.get::<&crate::game::components::Vehicle>(entity).is_ok() {
                if let Ok(mut query) = world
                    .world
                    .query_one::<&mut crate::game::components::Movement>(entity)
                {
                    if let Some(movement) = query.get() {
                        movement.set_target(x, y);
                        success_count += 1;
                    }
                }
            }
        }

        let result = if success_count > 0 {
            GroupOperationResult {
                success: true,
                message: format!(
                    "Set group target for {} entities at ({:.1}, {:.1})",
                    success_count, target_x, target_y
                ),
                selected_count: Some(selected_entities.len() as u32),
            }
        } else {
            GroupOperationResult {
                success: false,
                message: format!(
                    "No valid targets found among {} selected entities",
                    selected_entities.len()
                ),
                selected_count: Some(selected_entities.len() as u32),
            }
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    } else {
        let result = GroupOperationResult {
            success: false,
            message: "Game world not initialized".to_string(),
            selected_count: None,
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

#[wasm_bindgen]
pub fn get_selected_entities() -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let world = world
            .read()
            .map_err(|_| JsValue::from_str("Failed to acquire read lock"))?;
        let mut selected_ids = Vec::new();

        // Find all selected entities
        for (entity, selection) in world.world.query::<&Selection>().iter() {
            if selection.is_selected {
                selected_ids.push(entity.id());
            }
        }

        let count = selected_ids.len();

        #[derive(Serialize)]
        struct SelectedEntitiesResult {
            pub selected_entities: Vec<u32>,
            pub count: usize,
        }

        let result = SelectedEntitiesResult {
            selected_entities: selected_ids,
            count,
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    } else {
        let result = r#"{"selected_entities":[],"count":0}"#;
        Ok(result.to_string())
    }
}
