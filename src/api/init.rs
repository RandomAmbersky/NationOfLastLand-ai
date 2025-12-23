use crate::game::{GameWorld, components::Position};
use hecs::World;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EntityData {
    pub id: u32,
    pub x: f32,
    pub y: f32,
    pub entity_type: String,
    pub vehicle_type: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct GameState {
    pub time: f32,
    pub entities_count: usize,
    pub entities: Vec<EntityData>,
}

pub static mut GAME_WORLD: Option<GameWorld> = None;

#[wasm_bindgen]
pub fn init() -> Result<String, JsValue> {
    unsafe {
        GAME_WORLD = Some(GameWorld::new());

        if let Some(world) = &GAME_WORLD {
            let entities = get_entities_data(&world.world);
            let state = GameState {
                time: world.time,
                entities_count: world.world.len() as usize,
                entities,
            };

            serde_json::to_string(&state)
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
        } else {
            Err(JsValue::from_str("Failed to initialize game world"))
        }
    }
}

use crate::game::components::Vehicle;

pub fn get_entities_data(world: &World) -> Vec<EntityData> {
    let mut entities = Vec::new();

    for (entity, position) in world.query::<&Position>().iter() {
        // Try to get vehicle type if entity has Vehicle component
        let vehicle_type = if let Ok(mut query) = world.query_one::<&Vehicle>(entity) {
            if let Some(vehicle) = query.get() {
                Some(vehicle.vehicle_type.name().to_string())
            } else {
                None
            }
        } else {
            None
        };

        entities.push(EntityData {
            id: entity.id(),
            x: position.x,
            y: position.y,
            entity_type: "vehicle".to_string(), // For now, all entities are vehicles
            vehicle_type,
        });
    }

    entities
}
