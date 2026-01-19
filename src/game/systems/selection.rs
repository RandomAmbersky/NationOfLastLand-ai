//! Selection system for managing unit selection and groups

use crate::game::components::Selection;

/// Update selection system: clean up invalid selections and track removed entities
pub fn update_selection_system(world: &mut hecs::World) -> Vec<u32> {
    // Get all entity IDs that currently exist in the world
    let mut existing_entity_ids = std::collections::HashSet::new();
    for (entity, ()) in world.query::<()>().iter() {
        existing_entity_ids.insert(entity.id());
    }

    // Check all selected entities and deselect those that no longer exist
    // This handles cases where selected entities were destroyed
    let mut deselected_entities = Vec::new();
    for (entity, selection) in world.query::<&mut Selection>().iter() {
        if selection.is_selected && !existing_entity_ids.contains(&entity.id()) {
            // Entity was selected but no longer exists - track it for cleanup
            deselected_entities.push(entity.id());
            selection.deselect();
        }
    }

    if !deselected_entities.is_empty() {
        println!("Selection system: cleaned up {} removed entities from selection", deselected_entities.len());
    }

    deselected_entities
}
