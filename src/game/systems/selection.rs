//! Selection system for managing unit selection and groups

use crate::game::components::Selection;

/// Update selection system: clean up invalid selections
pub fn update_selection_system(world: &mut hecs::World) {
    // Get all entity IDs that currently exist in the world
    let mut existing_entity_ids = std::collections::HashSet::new();
    for (entity, ()) in world.query::<()>().iter() {
        existing_entity_ids.insert(entity.id());
    }

    // Check all selected entities and deselect those that no longer exist
    // This handles cases where selected entities were destroyed
    let mut deselected_count = 0;
    for (entity, selection) in world.query::<&mut Selection>().iter() {
        if selection.is_selected && !existing_entity_ids.contains(&entity.id()) {
            // This shouldn't happen since despawn removes all components,
            // but it's a safety check
            selection.deselect();
            deselected_count += 1;
        }
    }

    if deselected_count > 0 {
        println!("Selection system: deselected {} non-existent entities", deselected_count);
    }
}
