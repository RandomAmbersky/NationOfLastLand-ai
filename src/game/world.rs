use hecs::World;
use crate::game::systems::{alert, combat, movement};

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

        // Run alert systems
        alert::update_alert_system(&mut self.world, dt);

        // Run movement systems
        movement::update_movement_system(&mut self.world, dt);

        // Run combat systems
        combat::update_combat_system(&mut self.world, dt);
    }
}

impl Default for GameWorld {
    fn default() -> Self {
        Self::new()
    }
}
