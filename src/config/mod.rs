// Configuration module for YAML-based game data

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Device slot configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceSlot {
    pub r#type: String,
    pub allowed: Vec<String>,
}

/// Vehicle configuration from YAML
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VehicleConfig {
    pub name: String,
    pub r#type: String,
    pub base_health: f32,
    pub base_speed: f32,
    pub max_crew: u32,
    pub description: String,
    pub cost_reputation: u32,
    pub devices: Vec<DeviceSlot>,
}

/// Device configuration from YAML
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceConfig {
    pub name: String,
    pub r#type: String,
    pub category: String,
    pub description: String,
    #[serde(default)]
    pub damage: Option<f32>,
    #[serde(default)]
    pub damage_type: Option<String>,
    #[serde(default)]
    pub fire_rate: Option<f32>,
    #[serde(default)]
    pub range: Option<f32>,
    #[serde(default)]
    pub speed_bonus: Option<f32>,
    #[serde(default)]
    pub duration: Option<f32>,
    #[serde(default)]
    pub cooldown: Option<f32>,
    #[serde(default)]
    pub terrain_bonus: Option<f32>,
    #[serde(default)]
    pub resistances: Option<HashMap<String, f32>>,
    #[serde(default)]
    pub cloak_strength: Option<f32>,
    #[serde(default)]
    pub energy_drain: Option<f32>,
    #[serde(default)]
    pub detection_reduction: Option<f32>,
    #[serde(default)]
    pub decoy_count: Option<u32>,
    #[serde(default)]
    pub decoy_lifetime: Option<f32>,
    #[serde(default)]
    pub capacity_bonus: Option<u32>,
    #[serde(default)]
    pub repair_rate: Option<f32>,
    #[serde(default)]
    pub detection_bonus: Option<f32>,
    #[serde(default)]
    pub vision_bonus: Option<f32>,
    pub cost_reputation: u32,
}

/// Crew member configuration from YAML
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrewMemberConfig {
    pub name: String,
    pub role: String,
    pub base_level: u32,
    pub description: String,
    pub cost_reputation: u32,
}

/// Main configuration structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameConfig {
    pub vehicles: HashMap<String, VehicleConfig>,
    pub devices: HashMap<String, DeviceConfig>,
    pub crew_members: HashMap<String, CrewMemberConfig>,
}

impl Default for GameConfig {
    fn default() -> Self {
        Self {
            vehicles: HashMap::new(),
            devices: HashMap::new(),
            crew_members: HashMap::new(),
        }
    }
}

impl GameConfig {
    /// Load configuration from YAML string
    pub fn from_yaml(yaml_str: &str) -> Result<Self, serde_yaml::Error> {
        serde_yaml::from_str(yaml_str)
    }

    /// Get vehicle config by type
    pub fn get_vehicle(&self, vehicle_type: &str) -> Option<&VehicleConfig> {
        self.vehicles.get(vehicle_type)
    }

    /// Get device config by type
    pub fn get_device(&self, device_type: &str) -> Option<&DeviceConfig> {
        self.devices.get(device_type)
    }
}
