use crate::api::init::GAME_WORLD;
use crate::game::components::{Selection, FactionComponent, Vehicle, Base, Alert};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct GroupOperationResult {
    pub success: bool,
    pub message: String,
    pub selected_count: Option<u32>,
}

#[derive(Serialize, Deserialize)]
pub struct SelectionResult {
    pub success: bool,
    pub message: String,
    pub action: SelectionAction,
    pub selected_entities: Vec<u32>,
    pub target_assigned: Option<TargetAssignment>,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub enum SelectionAction {
    EntitySelected,
    EntityDeselected,
    GroupTargetAssigned,
    SelectionCleared,
    NoAction,
}

#[derive(Serialize, Deserialize)]
pub struct TargetAssignment {
    pub target_entity_id: u32,
    pub target_x: f32,
    pub target_y: f32,
}

#[wasm_bindgen]
pub fn handle_entity_selection(entity_id: u32, is_multi_select: bool, current_selected_ids: Vec<u32>) -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let mut world = world
            .write()
            .map_err(|_| JsValue::from_str("Failed to acquire write lock"))?;

        // Find the clicked entity
        let mut clicked_entity = None;
        for (entity, ()) in world.world.query::<()>().iter() {
            if entity.id() == entity_id {
                clicked_entity = Some(entity);
                break;
            }
        }

        let clicked_entity = match clicked_entity {
            Some(entity) => entity,
            None => {
                let result = SelectionResult {
                    success: false,
                    message: format!("Entity {} not found", entity_id),
                    action: SelectionAction::NoAction,
                    selected_entities: current_selected_ids,
                    target_assigned: None,
                };
                return serde_json::to_string(&result)
                    .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)));
            }
        };

        // Get current selected entities
        let mut current_selected_entities = Vec::new();
        for &selected_id in &current_selected_ids {
            for (entity, ()) in world.world.query::<()>().iter() {
                if entity.id() == selected_id {
                    current_selected_entities.push(entity);
                    break;
                }
            }
        }

        // Rule 7: If immobile player unit (base) is selected and clicking on another unit
        // Clear selection and select the new unit
        if has_immobile_player_unit_selected(&world.world, &current_selected_entities) {
            return handle_immobile_unit_selection(&mut world.world, clicked_entity, entity_id);
        }

        // Rule 8: If non-player unit is selected and clicking on another unit
        // Clear selection and select the new unit
        if has_non_player_unit_selected(&world.world, &current_selected_entities) {
            return handle_non_player_unit_selection(&mut world.world, clicked_entity, entity_id);
        }

        // Rule 6: If movable player units are selected and clicking on non-player faction unit
        // Assign as target instead of selecting
        let selected_player_movable_units = get_selected_player_movable_units(&world.world, &current_selected_entities);
        if !selected_player_movable_units.is_empty() && is_non_player_faction_entity(&world.world, clicked_entity) {
            return handle_group_targeting(&mut world.world, clicked_entity, entity_id);
        }

        // Standard selection logic
        handle_standard_entity_selection(&mut world.world, clicked_entity, entity_id, is_multi_select, &current_selected_entities)
    } else {
        let result = SelectionResult {
            success: false,
            message: "Game world not initialized".to_string(),
            action: SelectionAction::NoAction,
            selected_entities: current_selected_ids,
            target_assigned: None,
        };
        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

/// Check if any immobile player unit (base) is currently selected
pub fn has_immobile_player_unit_selected(world: &hecs::World, selected_entities: &[hecs::Entity]) -> bool {
    for &entity in selected_entities {
        if let Ok(faction) = world.get::<&FactionComponent>(entity) {
            if faction.faction == crate::game::components::Faction::Player {
                if world.get::<&Base>(entity).is_ok() {
                    return true;
                }
            }
        }
    }
    false
}

/// Check if any non-player unit is currently selected
pub fn has_non_player_unit_selected(world: &hecs::World, selected_entities: &[hecs::Entity]) -> bool {
    for &entity in selected_entities {
        if let Ok(faction) = world.get::<&FactionComponent>(entity) {
            if faction.faction != crate::game::components::Faction::Player {
                return true;
            }
        }
    }
    false
}

/// Get selected movable player units (vehicles)
pub fn get_selected_player_movable_units(world: &hecs::World, selected_entities: &[hecs::Entity]) -> Vec<hecs::Entity> {
    let mut movable_units = Vec::new();
    for &entity in selected_entities {
        if let Ok(faction) = world.get::<&FactionComponent>(entity) {
            if faction.faction == crate::game::components::Faction::Player {
                if world.get::<&Vehicle>(entity).is_ok() {
                    movable_units.push(entity);
                }
            }
        }
    }
    movable_units
}

/// Check if entity belongs to non-player faction or is an alert
pub fn is_non_player_faction_entity(world: &hecs::World, entity: hecs::Entity) -> bool {
    if let Ok(faction) = world.get::<&FactionComponent>(entity) {
        if faction.faction != crate::game::components::Faction::Player {
            return true;
        }
    }
    // Alerts are considered non-player faction
    world.get::<&Alert>(entity).is_ok()
}

/// Handle selection when immobile player unit is selected (Rule 7)
pub fn handle_immobile_unit_selection(world: &mut hecs::World, clicked_entity: hecs::Entity, entity_id: u32) -> Result<String, JsValue> {
    // Clear all selections
    clear_all_selections(world);

    // Select the clicked entity
    select_entity_internal(world, clicked_entity, true);

    let result = SelectionResult {
        success: true,
        message: format!("Selected entity {} (cleared previous immobile unit selection)", entity_id),
        action: SelectionAction::EntitySelected,
        selected_entities: vec![entity_id],
        target_assigned: None,
    };

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Handle selection when non-player unit is selected (Rule 8)
pub fn handle_non_player_unit_selection(world: &mut hecs::World, clicked_entity: hecs::Entity, entity_id: u32) -> Result<String, JsValue> {
    // Clear all selections
    clear_all_selections(world);

    // Select the clicked entity
    select_entity_internal(world, clicked_entity, true);

    let result = SelectionResult {
        success: true,
        message: format!("Selected entity {} (cleared previous non-player unit selection)", entity_id),
        action: SelectionAction::EntitySelected,
        selected_entities: vec![entity_id],
        target_assigned: None,
    };

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Handle group targeting when clicking on non-player faction entity (Rule 6)
pub fn handle_group_targeting(world: &mut hecs::World, target_entity: hecs::Entity, target_entity_id: u32) -> Result<String, JsValue> {
    // Get target position
    let target_pos = if let Ok(pos) = world.get::<&crate::game::components::Position>(target_entity) {
        (pos.x, pos.y)
    } else {
        (0.0, 0.0)
    };

    // Set group target using internal function
    set_group_target_internal(world, target_pos.0, target_pos.1);

    let target_assignment = TargetAssignment {
        target_entity_id,
        target_x: target_pos.0,
        target_y: target_pos.1,
    };

    let result = SelectionResult {
        success: true,
        message: format!("Group targeting assigned to entity {}", target_entity_id),
        action: SelectionAction::GroupTargetAssigned,
        selected_entities: get_selected_entities_internal(world),
        target_assigned: Some(target_assignment),
    };

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Handle standard entity selection logic
pub fn handle_standard_entity_selection(
    world: &mut hecs::World,
    clicked_entity: hecs::Entity,
    entity_id: u32,
    is_multi_select: bool,
    current_selected_entities: &[hecs::Entity]
) -> Result<String, JsValue> {
    // For now, implement simple selection logic
    // This can be expanded based on the original JS logic
    if is_multi_select {
        // Multi-select: toggle selection
        if current_selected_entities.contains(&clicked_entity) {
            deselect_entity_internal(world, clicked_entity);
            let result = SelectionResult {
                success: true,
                message: format!("Deselected entity {}", entity_id),
                action: SelectionAction::EntityDeselected,
                selected_entities: get_selected_entities_internal(world),
                target_assigned: None,
            };
            serde_json::to_string(&result)
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
        } else {
            select_entity_internal(world, clicked_entity, false);
            let result = SelectionResult {
                success: true,
                message: format!("Added entity {} to selection", entity_id),
                action: SelectionAction::EntitySelected,
                selected_entities: get_selected_entities_internal(world),
                target_assigned: None,
            };
            serde_json::to_string(&result)
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
        }
    } else {
        // Single select: clear and select
        clear_all_selections(world);
        select_entity_internal(world, clicked_entity, true);

        let result = SelectionResult {
            success: true,
            message: format!("Selected entity {}", entity_id),
            action: SelectionAction::EntitySelected,
            selected_entities: vec![entity_id],
            target_assigned: None,
        };

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

/// Internal function to select an entity
pub fn select_entity_internal(world: &mut hecs::World, entity: hecs::Entity, exclusive: bool) {
    if exclusive {
        clear_all_selections(world);
    }

    // Add Selection component if not present
    if world.get::<&Selection>(entity).is_err() {
        let selection = Selection::new();
        let _ = world.insert_one(entity, selection);
    }

    // Select the entity
    if let Ok(mut query) = world.query_one::<&mut Selection>(entity) {
        if let Some(selection) = query.get() {
            selection.select();
        }
    }
}

/// Internal function to deselect an entity
fn deselect_entity_internal(world: &mut hecs::World, entity: hecs::Entity) {
    if let Ok(mut query) = world.query_one::<&mut Selection>(entity) {
        if let Some(selection) = query.get() {
            selection.deselect();
        }
    }
}

/// Internal function to clear all selections
fn clear_all_selections(world: &mut hecs::World) {
    for (_, selection) in world.query::<&mut Selection>().iter() {
        if selection.is_selected {
            selection.deselect();
        }
    }
}

/// Internal function to get selected entity IDs
pub fn get_selected_entities_internal(world: &hecs::World) -> Vec<u32> {
    let mut selected_ids = Vec::new();
    for (entity, selection) in world.query::<&Selection>().iter() {
        if selection.is_selected {
            selected_ids.push(entity.id());
        }
    }
    selected_ids
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
            if world.world.get::<&Vehicle>(entity).is_ok() {
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::components::{FactionComponent, Position, Movement, VehicleType, AlertType};
    use crate::game::components::Faction;
    use hecs::World;

    /// Helper function to create a test world with entities
    fn create_test_world() -> World {
        let mut world = World::new();

        // Create player base (immobile unit)
        let player_base = world.spawn((
            FactionComponent::player(),
            Base::new(1, (100.0, 100.0)),
            Position::new(100.0, 100.0),
        ));

        // Create player vehicle (movable unit)
        let player_vehicle = world.spawn((
            FactionComponent::player(),
            Vehicle::new(VehicleType::ScoutCar),
            Position::new(150.0, 150.0),
            Movement::new(15.0),
        ));

        // Create enemy vehicle
        let enemy_vehicle = world.spawn((
            FactionComponent::enemy(),
            Vehicle::new(VehicleType::ArmoredTruck),
            Position::new(200.0, 200.0),
            Movement::new(9.0),
        ));

        // Create alert
        let alert = world.spawn((
            Alert::new(AlertType::TrashAlert, 250.0, 250.0, 50.0, 10.0),
            Position::new(250.0, 250.0),
        ));

        world
    }

    #[test]
    fn test_has_immobile_player_unit_selected() {
        let mut world = create_test_world();

        // Find entities
        let player_base = world.query::<&Base>().iter().next().unwrap().0;
        let player_vehicle = world.query::<&Vehicle>().iter().find(|(_, v)| v.vehicle_type == VehicleType::ScoutCar).unwrap().0;

        // Select player base (immobile unit)
        select_entity_internal(&mut world, player_base, true);

        // Check that immobile player unit is detected as selected
        let selected_entities = get_selected_entities_internal(&world);
        let mut selected_hecs_entities = Vec::new();
        for &id in &selected_entities {
            for (entity, ()) in world.query::<()>().iter() {
                if entity.id() == id {
                    selected_hecs_entities.push(entity);
                    break;
                }
            }
        }

        assert!(has_immobile_player_unit_selected(&world, &selected_hecs_entities));
    }

    #[test]
    fn test_rule_8_non_player_unit_selected() {
        let mut world = create_test_world();

        // Find entities
        let enemy_vehicle = world.query::<&FactionComponent>()
            .iter()
            .find(|(_, f)| f.faction == Faction::Enemy)
            .unwrap().0;
        let player_vehicle = world.query::<&Vehicle>()
            .iter()
            .find(|(_, v)| v.vehicle_type == VehicleType::ScoutCar)
            .unwrap().0;

        // Select enemy vehicle (non-player unit)
        select_entity_internal(&mut world, enemy_vehicle, true);

        // Click on player vehicle - should clear enemy selection and select player vehicle (Rule 8)
        let current_selected = get_selected_entities_internal(&world);
        let result = handle_entity_selection(player_vehicle.id(), false, current_selected).unwrap();
        let selection_result: SelectionResult = serde_json::from_str(&result).unwrap();

        assert!(selection_result.success);
        assert_eq!(selection_result.action, SelectionAction::EntitySelected);
        assert_eq!(selection_result.selected_entities, vec![player_vehicle.id()]);
        assert!(selection_result.target_assigned.is_none());
    }

    #[test]
    fn test_rule_6_group_targeting() {
        let mut world = create_test_world();

        // Find entities
        let player_vehicle = world.query::<&Vehicle>()
            .iter()
            .find(|(_, v)| v.vehicle_type == VehicleType::ScoutCar)
            .unwrap().0;
        let enemy_vehicle = world.query::<&FactionComponent>()
            .iter()
            .find(|(_, f)| f.faction == Faction::Enemy)
            .unwrap().0;

        // Select player vehicle (movable player unit)
        select_entity_internal(&mut world, player_vehicle, true);

        // Click on enemy vehicle - should assign as target instead of selecting (Rule 6)
        let current_selected = get_selected_entities_internal(&world);
        let result = handle_entity_selection(enemy_vehicle.id(), false, current_selected).unwrap();
        let selection_result: SelectionResult = serde_json::from_str(&result).unwrap();

        assert!(selection_result.success);
        assert_eq!(selection_result.action, SelectionAction::GroupTargetAssigned);
        assert_eq!(selection_result.selected_entities, vec![player_vehicle.id()]);
        assert!(selection_result.target_assigned.is_some());

        let target = selection_result.target_assigned.unwrap();
        assert_eq!(target.target_entity_id, enemy_vehicle.id());
    }

    #[test]
    fn test_rule_6_group_targeting_alert() {
        let mut world = create_test_world();

        // Find entities
        let player_vehicle = world.query::<&Vehicle>()
            .iter()
            .find(|(_, v)| v.vehicle_type == VehicleType::ScoutCar)
            .unwrap().0;
        let alert = world.query::<&Alert>().iter().next().unwrap().0;

        // Select player vehicle (movable player unit)
        select_entity_internal(&mut world, player_vehicle, true);

        // Click on alert - should assign as target instead of selecting (Rule 6)
        let current_selected = get_selected_entities_internal(&world);
        let result = handle_entity_selection(alert.id(), false, current_selected).unwrap();
        let selection_result: SelectionResult = serde_json::from_str(&result).unwrap();

        assert!(selection_result.success);
        assert_eq!(selection_result.action, SelectionAction::GroupTargetAssigned);
        assert_eq!(selection_result.selected_entities, vec![player_vehicle.id()]);
        assert!(selection_result.target_assigned.is_some());

        let target = selection_result.target_assigned.unwrap();
        assert_eq!(target.target_entity_id, alert.id());
    }

    #[test]
    fn test_standard_single_selection() {
        let mut world = create_test_world();

        // Find player vehicle
        let player_vehicle = world.query::<&Vehicle>()
            .iter()
            .find(|(_, v)| v.vehicle_type == VehicleType::ScoutCar)
            .unwrap().0;

        // No entities selected initially
        let current_selected = get_selected_entities_internal(&world);
        let result = handle_entity_selection(player_vehicle.id(), false, current_selected).unwrap();
        let selection_result: SelectionResult = serde_json::from_str(&result).unwrap();

        assert!(selection_result.success);
        assert_eq!(selection_result.action, SelectionAction::EntitySelected);
        assert_eq!(selection_result.selected_entities, vec![player_vehicle.id()]);
        assert!(selection_result.target_assigned.is_none());
    }

    #[test]
    fn test_multi_select_toggle() {
        let mut world = create_test_world();

        // Find entities
        let player_base = world.query::<&Base>().iter().next().unwrap().0;
        let player_vehicle = world.query::<&Vehicle>()
            .iter()
            .find(|(_, v)| v.vehicle_type == VehicleType::ScoutCar)
            .unwrap().0;

        // Select player base first
        select_entity_internal(&mut world, player_base, true);

        // Multi-select player vehicle (should add to selection)
        let current_selected = get_selected_entities_internal(&world);
        let result = handle_entity_selection(player_vehicle.id(), true, current_selected).unwrap();
        let selection_result: SelectionResult = serde_json::from_str(&result).unwrap();

        assert!(selection_result.success);
        assert_eq!(selection_result.action, SelectionAction::EntitySelected);
        assert!(selection_result.selected_entities.contains(&player_base.id()));
        assert!(selection_result.selected_entities.contains(&player_vehicle.id()));
        assert!(selection_result.target_assigned.is_none());
    }

    #[test]
    fn test_multi_select_deselect() {
        let mut world = create_test_world();

        // Find player vehicle
        let player_vehicle = world.query::<&Vehicle>()
            .iter()
            .find(|(_, v)| v.vehicle_type == VehicleType::ScoutCar)
            .unwrap().0;

        // Select player vehicle first
        select_entity_internal(&mut world, player_vehicle, true);

        // Multi-select the same vehicle again (should deselect it)
        let current_selected = get_selected_entities_internal(&world);
        let result = handle_entity_selection(player_vehicle.id(), true, current_selected).unwrap();
        let selection_result: SelectionResult = serde_json::from_str(&result).unwrap();

        assert!(selection_result.success);
        assert_eq!(selection_result.action, SelectionAction::EntityDeselected);
        assert!(selection_result.selected_entities.is_empty());
        assert!(selection_result.target_assigned.is_none());
    }
}

// Примеры использования логики выбора юнитов
//
// Этот модуль демонстрирует соблюдение правил выбора юнитов в игре Nation of Last Land.
//
// Правила выбора (Rules):
//
// Правило 6: Групповое назначение цели
// Если выбраны подвижные юниты игрока (vehicle) и клик по юниту не игрока (enemy/alert),
// то назначается цель для группы вместо выбора.
//
// Правило 7: Неподвижный юнит игрока
// Если выбран неподвижный юнит игрока (base) и клик по другому юниту,
// то выделение сбрасывается и выбирается новый юнит.
//
// Правило 8: Юнит не игрока
// Если выбран юнит не игрока (enemy/wild) и клик по другому юниту,
// то выделение сбрасывается и выбирается новый юнит.
//
// Примеры использования:
//
// ```rust,no_run
// use nation_of_last_land::api::group::{handle_entity_selection, SelectionResult};
//
// // Инициализация игрового мира (предполагается, что GAME_WORLD инициализирован)
//
// // Пример 1: Правило 6 - групповое назначение цели
// // 1. Выбрать юнит игрока
// let select_result = handle_entity_selection(player_vehicle_id, false, vec![]);
// // 2. Клик по врагу - назначить цель
// let target_result = handle_entity_selection(enemy_id, false, vec![player_vehicle_id]);
// let result: SelectionResult = serde_json::from_str(&target_result).unwrap();
// assert_eq!(result.action, SelectionAction::GroupTargetAssigned);
//
// // Пример 2: Правило 7 - смена выделения с базы
// // 1. Выбрать базу
// let base_select = handle_entity_selection(base_id, false, vec![]);
// // 2. Клик по юниту - сбросить выделение базы и выбрать юнит
// let unit_select = handle_entity_selection(vehicle_id, false, vec![base_id]);
// let result: SelectionResult = serde_json::from_str(&unit_select).unwrap();
// assert_eq!(result.action, SelectionAction::EntitySelected);
// assert_eq!(result.selected_entities, vec![vehicle_id]);
//
// // Пример 3: Правило 8 - смена выделения с врага
// // 1. Выбрать врага
// let enemy_select = handle_entity_selection(enemy_id, false, vec![]);
// // 2. Клик по другому юниту - сбросить выделение врага
// let switch_select = handle_entity_selection(other_enemy_id, false, vec![enemy_id]);
// let result: SelectionResult = serde_json::from_str(&switch_select).unwrap();
// assert_eq!(result.action, SelectionAction::EntitySelected);
// assert_eq!(result.selected_entities, vec![other_enemy_id]);
// ```

/// Internal function to set group target
fn set_group_target_internal(world: &mut hecs::World, target_x: f32, target_y: f32) {
    let mut selected_entities = Vec::new();

    // Find all selected entities
    for (entity, selection) in world.query::<&Selection>().iter() {
        if selection.is_selected {
            selected_entities.push(entity);
        }
    }

    if selected_entities.is_empty() {
        return;
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
    for (entity, x, y) in assigned_positions {
        // Check if this entity is a vehicle (has Vehicle component) before setting movement target
        if world.get::<&Vehicle>(entity).is_ok() {
            if let Ok(mut query) = world
                .query_one::<&mut crate::game::components::Movement>(entity)
            {
                if let Some(movement) = query.get() {
                    movement.set_target(x, y);
                }
            }
        }
    }
}
