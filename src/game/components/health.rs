//! Health component for damageable entities

use serde::{Deserialize, Serialize};

/// Represents the health status of an entity
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Health {
    pub current: f32,
    pub maximum: f32,
}

impl Health {
    pub fn new(maximum: f32) -> Self {
        Self {
            current: maximum,
            maximum,
        }
    }

    /// Check if the entity is alive (has health > 0)
    pub fn is_alive(&self) -> bool {
        self.current > 0.0
    }

    /// Check if the entity is at full health
    pub fn is_full(&self) -> bool {
        self.current >= self.maximum
    }

    /// Get health percentage (0.0 to 1.0)
    pub fn percentage(&self) -> f32 {
        if self.maximum <= 0.0 {
            0.0
        } else {
            (self.current / self.maximum).clamp(0.0, 1.0)
        }
    }

    /// Take damage, returns true if entity died
    pub fn take_damage(&mut self, damage: f32) -> bool {
        self.current = (self.current - damage).max(0.0);
        !self.is_alive()
    }

    /// Heal the entity, returns amount actually healed
    pub fn heal(&mut self, amount: f32) -> f32 {
        let old_health = self.current;
        self.current = (self.current + amount).min(self.maximum);
        self.current - old_health
    }

    /// Restore to full health
    pub fn restore_full(&mut self) {
        self.current = self.maximum;
    }
}
