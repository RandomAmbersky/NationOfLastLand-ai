//! Damage types and resistance components

use serde::{Deserialize, Serialize};

/// Types of damage in the game
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DamageType {
    Physical,
    Acid,
    Radiation,
    Fire,
    Energy,
}

impl DamageType {
    pub fn all() -> &'static [DamageType] {
        &[
            DamageType::Physical,
            DamageType::Acid,
            DamageType::Radiation,
            DamageType::Fire,
            DamageType::Energy,
        ]
    }
}

/// Damage resistance for entities
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct DamageResistance {
    pub physical: f32,
    pub acid: f32,
    pub radiation: f32,
    pub fire: f32,
    pub energy: f32,
}

impl DamageResistance {
    pub fn new(physical: f32, acid: f32, radiation: f32, fire: f32, energy: f32) -> Self {
        Self {
            physical,
            acid,
            radiation,
            fire,
            energy,
        }
    }

    /// Get resistance for a specific damage type
    pub fn get(&self, damage_type: DamageType) -> f32 {
        match damage_type {
            DamageType::Physical => self.physical,
            DamageType::Acid => self.acid,
            DamageType::Radiation => self.radiation,
            DamageType::Fire => self.fire,
            DamageType::Energy => self.energy,
        }
    }

    /// Set resistance for a specific damage type
    pub fn set(&mut self, damage_type: DamageType, resistance: f32) {
        match damage_type {
            DamageType::Physical => self.physical = resistance,
            DamageType::Acid => self.acid = resistance,
            DamageType::Radiation => self.radiation = resistance,
            DamageType::Fire => self.fire = resistance,
            DamageType::Energy => self.energy = resistance,
        }
    }

    /// Apply damage with resistance calculation
    pub fn apply_damage(&self, base_damage: f32, damage_type: DamageType) -> f32 {
        let resistance = self.get(damage_type);
        base_damage * (1.0 - resistance.clamp(0.0, 1.0))
    }
}

impl Default for DamageResistance {
    fn default() -> Self {
        Self::new(0.0, 0.0, 0.0, 0.0, 0.0)
    }
}

/// Damage dealing capability
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Damage {
    pub amount: f32,
    pub damage_type: DamageType,
}

impl Damage {
    pub fn new(amount: f32, damage_type: DamageType) -> Self {
        Self { amount, damage_type }
    }

    /// Calculate actual damage after applying resistance
    pub fn calculate_damage(&self, resistance: &DamageResistance) -> f32 {
        resistance.apply_damage(self.amount, self.damage_type)
    }
}
