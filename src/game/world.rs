use hecs::World;
use crate::game::systems::movement;

/// Game world containing all ECS entities and components
pub struct GameWorld {
    pub world: World,
    pub time: f32,
}

impl GameWorld {
    pub fn new() -> Self {
        Self {
            world: World::new(),
            time: 0.0,
        }
    }

    pub fn update(&mut self, dt: f32) {
        self.time += dt;

        // Run movement systems
        movement::demo_movement_system(&mut self.world, self.time);
    }
}

impl Default for GameWorld {
    fn default() -> Self {
        Self::new()
    }
}
