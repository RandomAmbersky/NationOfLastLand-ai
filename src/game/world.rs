use hecs::World;

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
        // TODO: Run ECS systems here
    }
}

impl Default for GameWorld {
    fn default() -> Self {
        Self::new()
    }
}
