use crate::api::init::GAME_WORLD;
use crate::game::components::*;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct DeviceInfo {
    pub device_type: String,
    pub name: String,
    pub description: String,
}

#[derive(Serialize, Deserialize)]
pub struct EntityInfo {
    pub id: u32,
    pub entity_type: String,
    pub subtype: Option<String>,
    pub faction: Option<String>,
    pub position: (f32, f32),
    pub health: Option<(f32, f32)>, // (current, max)
    pub damage: Option<f32>,
    pub damage_type: Option<String>,
    pub devices: Vec<DeviceInfo>,
    pub combat_cooldown: Option<(f32, f32)>, // (current, max)
    pub speed: Option<f32>,
    pub is_selected: bool,
}

#[wasm_bindgen]
pub fn get_entity_info(entity_id: u32) -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let world = world
            .read()
            .map_err(|_| JsValue::from_str("Failed to acquire read lock"))?;

        // Find entity by ID (using entity.id() to match get_entities_data and select_entity format)
        let mut found_entity = None;
        // Use a query that matches all entities
        for (entity, ()) in world.world.query::<()>().iter() {
            if entity.id() == entity_id {
                found_entity = Some(entity);
                break;
            }
        }

        let entity = match found_entity {
            Some(entity) => entity,
            None => return Err(JsValue::from_str("Entity not found")),
        };

        // Get basic entity data
        let mut entity_info = EntityInfo {
            id: entity_id,
            entity_type: "unknown".to_string(),
            subtype: None,
            faction: None,
            position: (0.0, 0.0),
            health: None,
            damage: None,
            damage_type: None,
            devices: Vec::new(),
            combat_cooldown: None,
            speed: None,
            is_selected: false,
        };

        // Get position
        if let Ok(mut query) = world.world.query_one::<&Position>(entity) {
            if let Some(position) = query.get() {
                entity_info.position = (position.x, position.y);
            }
        }

        // Get faction
        if let Ok(mut query) = world.world.query_one::<&FactionComponent>(entity) {
            if let Some(faction_component) = query.get() {
                entity_info.faction = Some(faction_component.faction.name().to_string());
            }
        }

        // Get selection state
        if let Ok(mut query) = world.world.query_one::<&Selection>(entity) {
            if let Some(selection) = query.get() {
                entity_info.is_selected = selection.is_selected;
            }
        }

        // Check if it's a vehicle
        if let Ok(mut query) = world.world.query_one::<&Vehicle>(entity) {
            if let Some(vehicle) = query.get() {
                entity_info.entity_type = "vehicle".to_string();
                entity_info.subtype = Some(vehicle.vehicle_type.name().to_string());
                entity_info.speed = Some(vehicle.vehicle_type.base_speed());

                // Get devices
                for device in &vehicle.devices {
                    entity_info.devices.push(DeviceInfo {
                        device_type: format!("{:?}", device.device_type),
                        name: device.name.clone(),
                        description: device.description.clone(),
                    });
                }
            }
        }

        // Check if it's an alert
        if let Ok(mut query) = world.world.query_one::<&Alert>(entity) {
            if let Some(alert) = query.get() {
                entity_info.entity_type = "alert".to_string();
                entity_info.subtype = Some(format!("{:?}_{:?}", alert.alert_type, alert.state));
            }
        }

        // Check if it's a base
        if let Ok(mut query) = world.world.query_one::<&Base>(entity) {
            if let Some(base) = query.get() {
                entity_info.entity_type = "base".to_string();
                entity_info.subtype = Some(format!("floors_{}", base.floors.len()));
            }
        }

        // Get health
        if let Ok(mut query) = world.world.query_one::<&Health>(entity) {
            if let Some(health) = query.get() {
                entity_info.health = Some((health.current, health.maximum));
            }
        }

        // Get damage capability
        if let Ok(mut query) = world.world.query_one::<&Damage>(entity) {
            if let Some(damage) = query.get() {
                entity_info.damage = Some(damage.amount);
                entity_info.damage_type = Some(format!("{:?}", damage.damage_type));
            }
        }

        // Get combat cooldown
        if let Ok(mut query) = world.world.query_one::<&CombatCooldown>(entity) {
            if let Some(cooldown) = query.get() {
                entity_info.combat_cooldown = Some((cooldown.current, cooldown.max));
            }
        }

        // Serialize and return
        serde_json::to_string(&entity_info)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    } else {
        Err(JsValue::from_str("Game world not initialized"))
    }
}
