use crate::api::init::GAME_WORLD;
use crate::game::components::*;
use crate::game::components::selection::Selection;
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
    pub fraction: Option<String>,
    pub position: (f32, f32),
    pub health: Option<(f32, f32)>, // (current, max)
    pub damage: Option<f32>,
    pub damage_type: Option<String>,
    pub devices: Vec<DeviceInfo>,
    pub combat_cooldown: Option<(f32, f32)>, // (current, max)
    pub speed: Option<f32>,
    pub selection: Option<Selection>,
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
            Some(entity) => {
                eprintln!("Entity {} found in world", entity_id);
                entity
            },
            None => {
                eprintln!("Entity {} not found in world", entity_id);
                return Err(JsValue::from_str("Entity not found"));
            }
        };

        // Check if entity is alive (has Health component and is_alive())
        let is_alive = if let Ok(mut query) = world.world.query_one::<&Health>(entity) {
            if let Some(health) = query.get() {
                let alive = health.is_alive();
                eprintln!("Entity {} health check: current={:.1}, max={:.1}, is_alive={}", entity.id(), health.current, health.maximum, alive);
                alive
            } else {
                eprintln!("Entity {} has Health component but query failed", entity.id());
                true // No health component means entity is always "alive" (like bases, alerts, static objects)
            }
        } else {
            eprintln!("Entity {} has no Health component", entity.id());
            true // No health component means entity is always "alive" (like bases, alerts, static objects)
        };

        // Return error for dead entities
        if !is_alive {
            eprintln!("Entity {} is dead - returning error", entity.id());
            return Err(JsValue::from_str("Entity is dead"));
        }

        // Get basic entity data
        let mut entity_info = EntityInfo {
            id: entity_id,
            entity_type: "unknown".to_string(),
            subtype: None,
            fraction: None,
            position: (0.0, 0.0),
            health: None,
            damage: None,
            damage_type: None,
            devices: Vec::new(),
            combat_cooldown: None,
            speed: None,
            selection: None,
        };

        // Get position
        if let Ok(mut query) = world.world.query_one::<&Position>(entity) {
            if let Some(position) = query.get() {
                entity_info.position = (position.x, position.y);
            }
        }

        // Get fraction
        if let Ok(mut query) = world.world.query_one::<&FractionComponent>(entity) {
            if let Some(fraction_component) = query.get() {
                entity_info.fraction = Some(fraction_component.fraction.name().to_string());
            }
        }

        // Get selection state
        if let Ok(mut query) = world.world.query_one::<&Selection>(entity) {
            if let Some(selection) = query.get() {
                entity_info.selection = Some(selection.clone());
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

        // Check if it's a wild entity (spawned from alerts) - has Position, Health, but no Vehicle/Base/Alert components
        if entity_info.entity_type == "unknown" {
            let has_movement = world.world.get::<&Movement>(entity).is_ok();
            let has_vehicle = world.world.get::<&Vehicle>(entity).is_ok();
            let has_alert = world.world.get::<&Alert>(entity).is_ok();
            let has_base = world.world.get::<&Base>(entity).is_ok();

            if !has_vehicle && !has_alert && !has_base {
                // Determine type based on fraction and movement
                if let Some(faction_name) = &entity_info.fraction {
                    match faction_name.as_str() {
                        "Wild" => {
                            if has_movement {
                                entity_info.entity_type = "creature".to_string();
                                entity_info.subtype = Some("hostile".to_string());
                            } else {
                                entity_info.entity_type = "neutral".to_string();
                                entity_info.subtype = Some("static".to_string());
                            }
                        }
                        "Enemy" => {
                            entity_info.entity_type = "enemy".to_string();
                            entity_info.subtype = Some("raider".to_string());
                        }
                        "Neutral" => {
                            entity_info.entity_type = "neutral".to_string();
                            if has_movement {
                                entity_info.subtype = Some("mobile".to_string());
                            } else {
                                entity_info.subtype = Some("static".to_string());
                            }
                        }
                        _ => {
                            entity_info.entity_type = "unit".to_string();
                        }
                    }
                } else {
                    entity_info.entity_type = "unit".to_string();
                }
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
