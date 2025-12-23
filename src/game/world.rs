use hecs::World;
use crate::game::systems::{alert, combat, movement};

/// Game world containing all ECS entities and components
pub struct GameWorld {
    pub world: World,
    pub time: f32,
    pub last_alert_spawn: f32,
    pub debug_messages: Vec<String>,
}

impl GameWorld {
    pub fn new() -> Self {
        Self {
            world: World::new(),
            time: 0.0,
            last_alert_spawn: 0.0,
            debug_messages: Vec::new(),
        }
    }

    pub fn update(&mut self, dt: f32) {
        self.time += dt;

        // Spawn new alerts periodically (every 15 seconds)
        if self.time - self.last_alert_spawn > 15.0 {
            alert::spawn_random_alert(&mut self.world);
            self.last_alert_spawn = self.time;
            self.debug_messages.push(format!("Spawned new random alert at time {:.1}s", self.time));
        }

        // Run alert systems
        alert::update_alert_system(&mut self.world, dt);

        // Run movement systems
        movement::update_movement_system(&mut self.world, dt);

        // Run combat systems
        combat::update_combat_system(self, dt);
    }
}

impl Default for GameWorld {
    fn default() -> Self {
        Self::new()
    }
}
