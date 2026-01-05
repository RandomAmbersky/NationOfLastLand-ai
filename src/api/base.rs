//! Base management API functions for WebAssembly

use crate::api::GAME_WORLD;
use crate::game::components::{Base, FloorType};
use crate::game::systems::base;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct BaseInfo {
    pub id: u32,
    pub position: (f32, f32),
    pub floors: Vec<FloorInfo>,
    pub max_floors: usize,
    pub reputation_level: u32,
    pub total_storage_capacity: u32,
    pub current_storage_usage: u32,
}

#[derive(Serialize, Deserialize)]
pub struct FloorInfo {
    pub floor_type: String,
    pub level: u32,
    pub is_operational: bool,
    pub capacity_used: u32,
    pub capacity_max: u32,
    pub research_progress: f32,
    pub research_target: Option<String>,
    pub efficiency_multiplier: f32,
}

/// Create a new base at the specified position
#[wasm_bindgen]
pub fn create_base(x: f32, y: f32) -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let mut world = world
            .write()
            .map_err(|_| JsValue::from_str("Failed to acquire write lock"))?;

        let entity = base::create_base(&mut world.world, (x, y));

        // Get the created base info
        let base = world
            .world
            .get::<&Base>(entity)
            .map_err(|_| JsValue::from_str("Failed to get created base"))?;

        let base_info = BaseInfo {
            id: base.id,
            position: base.position,
            floors: base
                .floors
                .iter()
                .map(|f| FloorInfo {
                    floor_type: f.floor_type.name().to_string(),
                    level: f.level,
                    is_operational: f.is_operational,
                    capacity_used: f.capacity_used,
                    capacity_max: f.capacity_max,
                    research_progress: f.research_progress,
                    research_target: f.research_target.clone(),
                    efficiency_multiplier: f.efficiency_multiplier(),
                })
                .collect(),
            max_floors: base.max_floors,
            reputation_level: base.reputation_level,
            total_storage_capacity: base.total_storage_capacity(),
            current_storage_usage: base.current_storage_usage(),
        };

        serde_json::to_string(&base_info)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    } else {
        Err(JsValue::from_str("Game world not initialized"))
    }
}

/// Get information about all bases
#[wasm_bindgen]
pub fn get_bases() -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let world = world
            .read()
            .map_err(|_| JsValue::from_str("Failed to acquire read lock"))?;

        let mut bases = Vec::new();

        for (_entity, base) in world.world.query::<&Base>().iter() {
            bases.push(BaseInfo {
                id: base.id,
                position: base.position,
                floors: base
                    .floors
                    .iter()
                    .map(|f| FloorInfo {
                        floor_type: f.floor_type.name().to_string(),
                        level: f.level,
                        is_operational: f.is_operational,
                        capacity_used: f.capacity_used,
                        capacity_max: f.capacity_max,
                        research_progress: f.research_progress,
                        research_target: f.research_target.clone(),
                        efficiency_multiplier: f.efficiency_multiplier(),
                    })
                    .collect(),
                max_floors: base.max_floors,
                reputation_level: base.reputation_level,
                total_storage_capacity: base.total_storage_capacity(),
                current_storage_usage: base.current_storage_usage(),
            });
        }

        serde_json::to_string(&bases)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    } else {
        Err(JsValue::from_str("Game world not initialized"))
    }
}

/// Start construction of a new floor on a base
#[wasm_bindgen]
pub fn build_floor(base_id: u32, floor_type: &str) -> Result<String, JsValue> {
    let floor_type_enum = match floor_type {
        "storage" => FloorType::Storage,
        "laboratory" => FloorType::Laboratory,
        "repair" => FloorType::Repair,
        "rest" => FloorType::Rest,
        _ => return Err(JsValue::from_str("Invalid floor type")),
    };

    if let Some(world) = GAME_WORLD.get() {
        let mut world = world
            .write()
            .map_err(|_| JsValue::from_str("Failed to acquire write lock"))?;

        // Find the base entity by ID
        let mut base_entity = None;
        for (entity, base) in world.world.query::<&Base>().iter() {
            if base.id == base_id {
                base_entity = Some(entity);
                break;
            }
        }

        let base_entity = base_entity.ok_or_else(|| JsValue::from_str("Base not found"))?;

        base::start_floor_construction(&mut world.world, base_entity, floor_type_enum)
            .map_err(|e| JsValue::from_str(e))?;

        // Return updated base info
        let base = world
            .world
            .get::<&Base>(base_entity)
            .map_err(|_| JsValue::from_str("Failed to get updated base"))?;

        let base_info = BaseInfo {
            id: base.id,
            position: base.position,
            floors: base
                .floors
                .iter()
                .map(|f| FloorInfo {
                    floor_type: f.floor_type.name().to_string(),
                    level: f.level,
                    is_operational: f.is_operational,
                    capacity_used: f.capacity_used,
                    capacity_max: f.capacity_max,
                    research_progress: f.research_progress,
                    research_target: f.research_target.clone(),
                    efficiency_multiplier: f.efficiency_multiplier(),
                })
                .collect(),
            max_floors: base.max_floors,
            reputation_level: base.reputation_level,
            total_storage_capacity: base.total_storage_capacity(),
            current_storage_usage: base.current_storage_usage(),
        };

        serde_json::to_string(&base_info)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    } else {
        Err(JsValue::from_str("Game world not initialized"))
    }
}

/// Assign a unit to a base floor
#[wasm_bindgen]
pub fn assign_unit_to_floor(unit_id: u32, base_id: u32, floor_index: usize) -> Result<(), JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let mut world = world
            .write()
            .map_err(|_| JsValue::from_str("Failed to acquire write lock"))?;

        // Find unit entity by ID (using entity ID)
        let unit_entity = hecs::Entity::from_bits(unit_id as u64)
            .ok_or_else(|| JsValue::from_str("Invalid unit ID"))?;

        // Find base entity by ID
        let mut base_entity = None;
        for (entity, base) in world.world.query::<&Base>().iter() {
            if base.id == base_id {
                base_entity = Some(entity);
                break;
            }
        }

        let base_entity = base_entity.ok_or_else(|| JsValue::from_str("Base not found"))?;

        base::assign_unit_to_floor(&mut world.world, unit_entity, base_entity, floor_index)
            .map_err(|e| JsValue::from_str(e))
    } else {
        Err(JsValue::from_str("Game world not initialized"))
    }
}

/// Get available floor types that can be built
#[wasm_bindgen]
pub fn get_available_floor_types(base_id: u32) -> Result<String, JsValue> {
    if let Some(world) = GAME_WORLD.get() {
        let world = world
            .read()
            .map_err(|_| JsValue::from_str("Failed to acquire read lock"))?;

        // Find base by ID
        let mut base_reputation = None;
        for (_entity, base) in world.world.query::<&Base>().iter() {
            if base.id == base_id {
                base_reputation = Some(base.reputation_level);
                break;
            }
        }

        let reputation_level =
            base_reputation.ok_or_else(|| JsValue::from_str("Base not found"))?;

        let available_types: Vec<String> = vec![
            FloorType::Storage,
            FloorType::Laboratory,
            FloorType::Repair,
            FloorType::Rest,
        ]
        .into_iter()
        .filter(|ft| reputation_level >= ft.required_reputation_level())
        .map(|ft| ft.name().to_lowercase())
        .collect();

        serde_json::to_string(&available_types)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    } else {
        Err(JsValue::from_str("Game world not initialized"))
    }
}
