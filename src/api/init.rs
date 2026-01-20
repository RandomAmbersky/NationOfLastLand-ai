use crate::config::GameConfig;
use crate::game::{
    components::{Base, FractionComponent, Health, Movement, Position, Selection, Vehicle},
    Alert, GameWorld,
};
use hecs::World;
use serde::{Deserialize, Serialize};
use std::sync::{OnceLock, RwLock};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EntityData {
    pub id: u32,
    pub position: Option<Position>,
    pub entity_type: String,
    pub subtype: Option<String>, // vehicle_type for vehicles, alert_type for alerts
    pub fraction: Option<String>, // fraction name (Player, Enemy, Neutral, Wild)
    pub is_selected: bool,       // whether this entity is currently selected
    pub health: Option<(f32, f32)>, // (current, maximum) health values, None if no health component
    pub movement: Option<Movement>, // movement component if entity can move
}

#[derive(Serialize, Deserialize)]
pub struct GameState {
    pub time: f32,
    pub entities_count: usize,
    pub entities: Vec<EntityData>,
    pub alerts_count: usize,
    pub debug_messages: Vec<String>,
    pub removed_entities: Vec<u32>, // Entities that were removed from selection during this update
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

        // Create initial player vehicles using the same logic as create_vehicle function
        use crate::api::create_vehicle::create_vehicle_in_world;
        let entity1 = create_vehicle_in_world(&mut world.world, "scout", 350.0, 250.0);
        world.debug_messages.push(format!("Created player scout car at (350, 250) with entity ID {}", entity1.id()));

        let entity2 = create_vehicle_in_world(&mut world.world, "scout", 450.0, 350.0);
        world.debug_messages.push(format!("Created player scout car at (450, 350) with entity ID {}", entity2.id()));
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
            removed_entities: Vec::new(), // No entities removed during init
        };

        serde_json::to_string(&state)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    } else {
        Err(JsValue::from_str("Failed to initialize game world"))
    }
}

pub fn get_entities_data(world: &World) -> Vec<EntityData> {
    let mut entities = Vec::new();

    // Проходим циклом по всем entity которые есть в мире
    for entity_ref in world.iter() {
        let entity_id = entity_ref.entity();

        // Определяем тип entity и собираем данные
        let (entity_type, subtype) = if let Some(alert) = world.get::<&Alert>(entity_id).ok() {
            // Alert entity
            (
                "alert".to_string(),
                Some(format!("{:?}_{:?}", alert.alert_type, alert.state)),
            )
        } else if let Some(base) = world.get::<&Base>(entity_id).ok() {
            // Base entity
            (
                "base".to_string(),
                Some(format!("floors_{}", base.floors.len())),
            )
        } else if let Some(vehicle) = world.get::<&Vehicle>(entity_id).ok() {
            // Vehicle entity
            (
                "vehicle".to_string(),
                Some(vehicle.vehicle_type.name().to_string()),
            )
        } else {
            // Other entity
            (
                "unknown".to_string(),
                None,
            )
        };

        // Читаем fraction отдельно для всех entity
        let faction = world.get::<&FractionComponent>(entity_id).ok()
            .map(|fraction_component| fraction_component.fraction.name().to_string());

        // Читаем позицию отдельно для всех entity
        let position = world.get::<&Position>(entity_id).ok().map(|p| *p);

        // Проверяем состояние выделения
        let is_selected = world.get::<&Selection>(entity_id).ok()
            .map(|selection| selection.is_selected)
            .unwrap_or(false);

        // Получаем информацию о здоровье
        let health = world.get::<&Health>(entity_id).ok()
            .map(|h| (h.current, h.maximum));

        // Получаем информацию о движении
        let movement = world.get::<&Movement>(entity_id).ok()
            .map(|m| *m);

        entities.push(EntityData {
            id: entity_id.id(),
            position,
            entity_type,
            subtype,
            fraction: faction,
            is_selected,
            health,
            movement,
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
