//! Base management system for Nation of Last Land

use crate::game::components::{Base, FloorType, BaseConstruction, AssignedToFloor, Position, Selection};
use hecs::World;

/// Update base construction progress
pub fn update_base_construction_system(world: &mut World, dt: f32) {
    let mut completed_constructions = Vec::new();

    // Update construction progress
    for (entity, construction) in world.query::<&mut BaseConstruction>().iter() {
        construction.time_spent += dt;
        construction.progress = (construction.time_spent / construction.total_time).min(1.0);

        // Check if construction is complete
        if construction.progress >= 1.0 {
            completed_constructions.push(entity);
        }
    }

    // Complete constructions
    for entity in completed_constructions {
        if let Ok(_construction) = world.get::<&BaseConstruction>(entity) {
            if let Ok(mut base) = world.get::<&mut Base>(entity) {
                // Find the floor that was being constructed (last floor, inoperational)
                if let Some(floor) = base.floors.last_mut() {
                    if !floor.is_operational {
                        floor.is_operational = true;
                    }
                }
            }
        }

        // Remove construction component
        let _ = world.remove_one::<BaseConstruction>(entity);
    }
}

/// Update floor operations and efficiency
pub fn update_floor_operations_system(world: &mut World, _dt: f32) {
    // Update storage floors
    for (_entity, base) in world.query::<&mut Base>().iter() {
        for floor in &mut base.floors {
            match floor.floor_type {
                FloorType::Storage => {
                    // Storage floors don't need active updates, just capacity tracking
                }
                FloorType::Laboratory => {
                    // Update research progress if operational and has research target
                    if floor.is_operational && floor.research_target.is_some() {
                        // Research progress would be handled by assigned researchers
                        // For now, just simulate slow progress
                        floor.research_progress += 0.01 * floor.efficiency_multiplier();
                        if floor.research_progress >= 1.0 {
                            // Research complete - would trigger technology unlock
                            floor.research_progress = 0.0;
                            floor.research_target = None;
                        }
                    }
                }
                FloorType::Repair => {
                    // Repair operations handled by assigned technicians
                }
                FloorType::Rest => {
                    // Rest operations handled by assigned caretakers
                }
            }
        }
    }
}

/// Create a new base entity
pub fn create_base(world: &mut World, position: (f32, f32)) -> hecs::Entity {
    let base = Base::new(get_next_base_id(world), position);
    let selection = Selection::new();
    let faction = crate::game::components::FactionComponent::new(crate::game::components::Faction::Player);
    world.spawn((base, Position { x: position.0, y: position.1 }, selection, faction))
}

/// Assign a unit to a specific floor in a base
pub fn assign_unit_to_floor(
    world: &mut World,
    unit_entity: hecs::Entity,
    base_entity: hecs::Entity,
    floor_index: usize,
) -> Result<(), &'static str> {
    // Check if base exists and has the specified floor
    let base_id = {
        let base = world.get::<&Base>(base_entity)
            .map_err(|_| "Base entity not found")?;

        if floor_index >= base.floors.len() {
            return Err("Floor index out of bounds");
        }

        let floor = &base.floors[floor_index];

        // Check if floor has capacity
        if !floor.has_capacity() {
            return Err("Floor has no available capacity");
        }

        base.id
    };

    // Determine role based on floor type - need to query again since we dropped the borrow
    let role = {
        let base = world.get::<&Base>(base_entity)
            .map_err(|_| "Base entity not found")?;
        let floor = &base.floors[floor_index];

        match floor.floor_type {
            FloorType::Storage => crate::game::components::FloorRole::StorageWorker,
            FloorType::Laboratory => crate::game::components::FloorRole::Researcher,
            FloorType::Repair => crate::game::components::FloorRole::RepairTechnician,
            FloorType::Rest => crate::game::components::FloorRole::Caretaker,
        }
    };

    // Add assignment component
    let assignment = AssignedToFloor {
        base_id,
        floor_index,
        role,
    };

    let _ = world.insert_one(unit_entity, assignment);

    Ok(())
}

/// Start construction of a new floor on a base
pub fn start_floor_construction(
    world: &mut World,
    base_entity: hecs::Entity,
    floor_type: FloorType,
) -> Result<(), &'static str> {
    // Check if base can expand and floor type is unlocked
    {
        let base = world.get::<&Base>(base_entity)
            .map_err(|_| "Base entity not found")?;

        // Check if base can expand
        if !base.can_expand() {
            return Err("Base cannot expand further");
        }

        // Check if floor type is unlocked
        if !base.can_build_floor(&floor_type) {
            return Err("Floor type not unlocked at current reputation level");
        }
    }

    // Now modify the base
    {
        let mut base = world.get::<&mut Base>(base_entity)
            .map_err(|_| "Base entity not found")?;

        // Add floor to base (starts inoperational)
        base.add_floor(floor_type.clone())?;
    }

    // Add construction component
    let construction = BaseConstruction {
        floor_type,
        progress: 0.0,
        total_time: 30.0, // 30 seconds construction time
        time_spent: 0.0,
    };

    let _ = world.insert_one(base_entity, construction);

    Ok(())
}

/// Get the next available base ID
fn get_next_base_id(world: &World) -> u32 {
    let mut max_id = 0;
    for (_entity, base) in world.query::<&Base>().iter() {
        max_id = max_id.max(base.id);
    }
    max_id + 1
}

/// Get all units assigned to a specific base
pub fn get_units_assigned_to_base(world: &World, base_id: u32) -> Vec<(hecs::Entity, AssignedToFloor)> {
    world.query::<&AssignedToFloor>()
        .iter()
        .filter(|(_, assignment)| assignment.base_id == base_id)
        .map(|(entity, assignment)| (entity, assignment.clone()))
        .collect()
}

/// Get all units assigned to a specific floor
pub fn get_units_on_floor(world: &World, base_id: u32, floor_index: usize) -> Vec<(hecs::Entity, AssignedToFloor)> {
    world.query::<&AssignedToFloor>()
        .iter()
        .filter(|(_, assignment)| assignment.base_id == base_id && assignment.floor_index == floor_index)
        .map(|(entity, assignment)| (entity, assignment.clone()))
        .collect()
}
