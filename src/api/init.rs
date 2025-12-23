use crate::game::{GameWorld, Alert, components::{Position, FactionComponent, Vehicle}};
use crate::config::GameConfig;
use wasm_bindgen::prelude::*;
use hecs::World;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EntityData {
    pub id: u32,
    pub x: f32,
    pub y: f32,
    pub entity_type: String,
    pub subtype: Option<String>, // vehicle_type for vehicles, alert_type for alerts
    pub faction: Option<String>, // faction name (Player, Enemy, Neutral, Wild)
}

#[derive(Serialize, Deserialize)]
pub struct GameState {
    pub time: f32,
    pub entities_count: usize,
    pub entities: Vec<EntityData>,
    pub alerts_count: usize,
    pub debug_messages: Vec<String>,
}

pub static mut GAME_WORLD: Option<GameWorld> = None;
pub static mut GAME_CONFIG: Option<GameConfig> = None;

#[wasm_bindgen]
pub fn init() -> Result<String, JsValue> {
    unsafe {
        GAME_WORLD = Some(GameWorld::new());

        // Load default configuration
        load_default_config();

        // Add initial alerts for testing
        if let Some(world) = &mut GAME_WORLD {
            use crate::game::systems::alert::spawn_random_alert;
            // Spawn a few initial alerts
            for _ in 0..2 {
                spawn_random_alert(&mut world.world);
            }
            world.debug_messages.push("Added 2 initial alerts for testing".to_string());
        }

        if let Some(world) = &GAME_WORLD {
            let entities = get_entities_data(&world.world);
            let alerts_count = world.world.query::<&Alert>().iter().count();
            let debug_messages = world.debug_messages.clone();
            let state = GameState {
                time: world.time,
                entities_count: world.world.len() as usize,
                entities,
                alerts_count,
                debug_messages,
            };

            serde_json::to_string(&state)
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
        } else {
            Err(JsValue::from_str("Failed to initialize game world"))
        }
    }
}

pub fn get_entities_data(world: &World) -> Vec<EntityData> {
    let mut entities = Vec::new();

    // Add entities with Position components (vehicles, etc.)
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

        // Try to get faction if entity has FactionComponent
        let faction = if let Ok(mut query) = world.query_one::<&FactionComponent>(entity) {
            if let Some(faction_component) = query.get() {
                Some(faction_component.faction.name().to_string())
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
            subtype: vehicle_type,
            faction,
        });
    }

    // Add Alert entities (show all alerts, but mark their state)
    for (entity, alert) in world.query::<&Alert>().iter() {
        entities.push(EntityData {
            id: entity.id(),
            x: alert.position.x,
            y: alert.position.y,
            entity_type: "alert".to_string(),
            subtype: Some(format!("{:?}_{:?}", alert.alert_type, alert.state)),
            faction: None, // Alerts don't have factions
        });
    }

    entities
}

/// Load game configuration from YAML string
#[wasm_bindgen]
pub fn load_config(yaml_str: &str) -> Result<(), JsValue> {
    match GameConfig::from_yaml(yaml_str) {
        Ok(config) => {
            unsafe {
                GAME_CONFIG = Some(config);
            }
            Ok(())
        }
        Err(e) => Err(JsValue::from_str(&format!("Failed to parse config: {}", e)))
    }
}

/// Load default embedded configuration
pub fn load_default_config() {
    // Default configuration embedded in code
    let default_config_yaml = include_str!("../../config/units.yml");

    match GameConfig::from_yaml(default_config_yaml) {
        Ok(config) => {
            unsafe {
                GAME_CONFIG = Some(config);
            }
        }
        Err(e) => {
            // In a real application, this would be a fatal error
            // For now, we'll use default values
            eprintln!("Failed to load default config: {}", e);
            unsafe {
                GAME_CONFIG = Some(GameConfig::default());
            }
        }
    }
}

/// Get reference to current game config
pub fn get_game_config() -> Option<&'static GameConfig> {
    unsafe { GAME_CONFIG.as_ref() }
}
