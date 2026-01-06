use crate::config::GameConfig;
use crate::game::{
    components::{Base, FactionComponent, Position, Selection, Vehicle},
    Alert, GameWorld,
};
use hecs::World;
use serde::{Deserialize, Serialize};
use std::sync::{OnceLock, RwLock};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EntityData {
    pub id: u32,
    pub x: f32,
    pub y: f32,
    pub entity_type: String,
    pub subtype: Option<String>, // vehicle_type for vehicles, alert_type for alerts
    pub faction: Option<String>, // faction name (Player, Enemy, Neutral, Wild)
    pub is_selected: bool,       // whether this entity is currently selected
}

#[derive(Serialize, Deserialize)]
pub struct GameState {
    pub time: f32,
    pub entities_count: usize,
    pub entities: Vec<EntityData>,
    pub alerts_count: usize,
    pub debug_messages: Vec<String>,
}

pub static GAME_WORLD: OnceLock<RwLock<GameWorld>> = OnceLock::new();
pub static GAME_CONFIG: OnceLock<GameConfig> = OnceLock::new();

#[wasm_bindgen]
pub fn init() -> Result<String, JsValue> {
    GAME_WORLD.get_or_init(|| RwLock::new(GameWorld::new()));

    // Load default configuration
    load_default_config();

    // Add initial alerts for testing
    if let Some(world) = GAME_WORLD.get() {
        use crate::game::systems::{alert::spawn_random_alert, base::create_base};
        let mut world = world
            .write()
            .map_err(|_| JsValue::from_str("Failed to acquire write lock"))?;
        // Spawn a few initial alerts
        for _ in 0..2 {
            spawn_random_alert(&mut world.world);
        }
        world
            .debug_messages
            .push("Added 2 initial alerts for testing".to_string());

        // Create initial player base
        create_base(&mut world.world, (400.0, 300.0));
        world
            .debug_messages
            .push("Created initial player base at (400, 300)".to_string());
    }

    if let Some(world) = GAME_WORLD.get() {
        let world = world
            .read()
            .map_err(|_| JsValue::from_str("Failed to acquire read lock"))?;
        let entities = get_entities_data(&world.world);
        let alerts_count = world.world.query::<&Alert>().iter().count();
        let debug_messages = world.debug_messages.clone();
        let state = GameState {
            time: world.time,
            entities_count: entities.len(),
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

pub fn get_entities_data(world: &World) -> Vec<EntityData> {
    let mut entities = Vec::new();

    // Add entities with Position components (vehicles, etc.) but exclude bases and alerts
    for (entity, position) in world.query::<&Position>().without::<&Base>().without::<&Alert>().iter() {
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

        // Try to get selection state if entity has Selection component
        let is_selected = if let Ok(mut query) = world.query_one::<&Selection>(entity) {
            if let Some(selection) = query.get() {
                selection.is_selected
            } else {
                false
            }
        } else {
            false
        };

        entities.push(EntityData {
            id: entity.id(),
            x: position.x,
            y: position.y,
            entity_type: "vehicle".to_string(), // For now, all entities are vehicles
            subtype: vehicle_type,
            faction,
            is_selected,
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
            faction: None,      // Alerts don't have factions
            is_selected: false, // Alerts cannot be selected
        });
    }

    // Add Base entities
    for (entity, (base, position)) in world.query::<(&Base, &Position)>().iter() {
        entities.push(EntityData {
            id: entity.id(),
            x: position.x,
            y: position.y,
            entity_type: "base".to_string(),
            subtype: Some(format!("floors_{}", base.floors.len())),
            faction: Some("Player".to_string()), // Bases belong to player
            is_selected: false,                  // Bases cannot be selected for now
        });
    }
    entities
}

/// Load game configuration from YAML string
#[wasm_bindgen]
pub fn load_config(yaml_str: &str) -> Result<(), JsValue> {
    match GameConfig::from_yaml(yaml_str) {
        Ok(config) => {
            GAME_CONFIG
                .set(config)
                .map_err(|_| JsValue::from_str("Config already loaded"))?;
            Ok(())
        }
        Err(e) => Err(JsValue::from_str(&format!("Failed to parse config: {}", e))),
    }
}

/// Load default embedded configuration
pub fn load_default_config() {
    // Default configuration embedded in code
    let default_config_yaml = include_str!("../../config/units.yml");

    GAME_CONFIG.get_or_init(|| {
        match GameConfig::from_yaml(default_config_yaml) {
            Ok(config) => config,
            Err(e) => {
                // In a real application, this would be a fatal error
                // For now, we'll use default values
                eprintln!("Failed to load default config: {}", e);
                GameConfig::default()
            }
        }
    });
}

/// Get reference to current game config
pub fn get_game_config() -> Option<&'static GameConfig> {
    GAME_CONFIG.get()
}
