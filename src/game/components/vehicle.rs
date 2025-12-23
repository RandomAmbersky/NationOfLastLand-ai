//! Vehicle components and types

use serde::{Deserialize, Serialize};

/// Types of vehicles in the game
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum VehicleType {
    ScoutCar,
    ArmoredTruck,
    HeavyTank,
}

impl VehicleType {
    /// Get base health for vehicle type
    pub fn base_health(&self) -> f32 {
        match self {
            VehicleType::ScoutCar => 50.0,
            VehicleType::ArmoredTruck => 150.0,
            VehicleType::HeavyTank => 300.0,
        }
    }

    /// Get base speed for vehicle type
    pub fn base_speed(&self) -> f32 {
        match self {
            VehicleType::ScoutCar => 5.0,
            VehicleType::ArmoredTruck => 3.0,
            VehicleType::HeavyTank => 1.5,
        }
    }

    /// Get vehicle name as string
    pub fn name(&self) -> &'static str {
        match self {
            VehicleType::ScoutCar => "Scout Car",
            VehicleType::ArmoredTruck => "Armored Truck",
            VehicleType::HeavyTank => "Heavy Tank",
        }
    }
}

/// Vehicle component for entities that are vehicles
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Vehicle {
    pub vehicle_type: VehicleType,
    pub devices: Vec<Device>,
}

impl Vehicle {
    pub fn new(vehicle_type: VehicleType) -> Self {
        Self {
            vehicle_type,
            devices: Vec::new(),
        }
    }

    /// Add a device to the vehicle
    pub fn add_device(&mut self, device: Device) {
        self.devices.push(device);
    }

    /// Remove a device from the vehicle
    pub fn remove_device(&mut self, index: usize) -> Option<Device> {
        if index < self.devices.len() {
            Some(self.devices.remove(index))
        } else {
            None
        }
    }

    /// Check if vehicle has a specific device type
    pub fn has_device_type(&self, device_type: DeviceType) -> bool {
        self.devices.iter().any(|d| d.device_type == device_type)
    }

    /// Get all devices of a specific type
    pub fn devices_of_type(&self, device_type: DeviceType) -> Vec<&Device> {
        self.devices.iter().filter(|d| d.device_type == device_type).collect()
    }
}

/// Types of devices that can be installed on vehicles
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DeviceType {
    // Turrets
    LightTurret,
    HeavyTurret,
    PlasmaTurret,
    AcidTurret,

    // Accelerators
    SpeedBooster,
    TurboEngine,
    HoverModule,

    // Armor
    ReinforcedPlates,
    EnergyShield,
    RadiationShield,
    AcidResistantCoating,

    // Stealth
    CloakingDevice,
    NoiseDampener,
    DecoyLauncher,

    // Other
    CargoExpander,
    RepairDrone,
    SensorArray,
}

/// Device that can be installed on a vehicle
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Device {
    pub device_type: DeviceType,
    pub name: String,
    pub description: String,
}

impl Device {
    pub fn new(device_type: DeviceType, name: &str, description: &str) -> Self {
        Self {
            device_type,
            name: name.to_string(),
            description: description.to_string(),
        }
    }

    /// Get device name based on type
    pub fn default_name(device_type: DeviceType) -> &'static str {
        match device_type {
            DeviceType::LightTurret => "Light Turret",
            DeviceType::HeavyTurret => "Heavy Turret",
            DeviceType::PlasmaTurret => "Plasma Turret",
            DeviceType::AcidTurret => "Acid Turret",
            DeviceType::SpeedBooster => "Speed Booster",
            DeviceType::TurboEngine => "Turbo Engine",
            DeviceType::HoverModule => "Hover Module",
            DeviceType::ReinforcedPlates => "Reinforced Plates",
            DeviceType::EnergyShield => "Energy Shield",
            DeviceType::RadiationShield => "Radiation Shield",
            DeviceType::AcidResistantCoating => "Acid Resistant Coating",
            DeviceType::CloakingDevice => "Cloaking Device",
            DeviceType::NoiseDampener => "Noise Dampener",
            DeviceType::DecoyLauncher => "Decoy Launcher",
            DeviceType::CargoExpander => "Cargo Expander",
            DeviceType::RepairDrone => "Repair Drone",
            DeviceType::SensorArray => "Sensor Array",
        }
    }
}
