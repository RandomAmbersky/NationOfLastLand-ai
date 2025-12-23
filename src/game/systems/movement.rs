//! Movement system for entity position updates

use crate::game::components::Position;

/// Simple demo movement: make entities move in circles around the center
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
