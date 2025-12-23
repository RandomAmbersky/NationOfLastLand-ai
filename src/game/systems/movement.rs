//! Movement system for entity position updates

use crate::game::components::{Position, Movement};

/// Update movement system: move entities towards their targets
pub fn update_movement_system(world: &mut hecs::World, dt: f32) {
    // Query for entities that have both Position and Movement components
    let mut query = world.query::<(&mut Position, &mut Movement)>();

    for (_entity, (position, movement)) in query.iter() {
        // Skip if no target
        if !movement.has_target() {
            movement.current_speed = 0.0;
            continue;
        }

        // Get target position
        if let Some((target_x, target_y)) = movement.target_position() {
            let target_pos = Position::new(target_x, target_y);
            let distance = position.distance_to(&target_pos);

            // Check if we've reached the target (within small threshold)
            if distance < 1.0 {
                // Arrived at target - stop moving
                movement.clear_target();
                movement.current_speed = 0.0;
                position.x = target_x;
                position.y = target_y;
                continue;
            }

            // Calculate direction vector
            let dx = target_x - position.x;
            let dy = target_y - position.y;

            // Normalize direction
            let length = (dx * dx + dy * dy).sqrt();
            if length > 0.0 {
                let dir_x = dx / length;
                let dir_y = dy / length;

                // Move towards target
                let move_distance = movement.speed * dt;
                if move_distance >= distance {
                    // Would overshoot - move directly to target
                    position.x = target_x;
                    position.y = target_y;
                    movement.clear_target();
                    movement.current_speed = 0.0;
                } else {
                    // Move towards target
                    position.x += dir_x * move_distance;
                    position.y += dir_y * move_distance;
                    movement.current_speed = movement.speed;
                }
            }
        }
    }
}

/// Legacy demo movement system (kept for compatibility)
pub fn demo_movement_system(world: &mut hecs::World, time: f32) {
    let mut i = 0;
    for (_entity, position) in world.query_mut::<&mut Position>() {
        // Create circular movement pattern
        let radius = 100.0 + (i as f32 * 20.0);
        let speed = 0.5 + (i as f32 * 0.1);
        let angle = time * speed + (i as f32 * 1.0);

        position.x = 400.0 + angle.cos() * radius;
        position.y = 300.0 + angle.sin() * radius;

        i += 1;
    }
}
