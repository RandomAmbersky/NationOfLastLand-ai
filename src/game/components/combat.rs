//! Combat-related components for entities

use serde::{Deserialize, Serialize};

/// Combat cooldown component to prevent instant re-attacks
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct CombatCooldown {
    pub current: f32,
    pub max: f32,
}

impl CombatCooldown {
    pub fn new(cooldown_time: f32) -> Self {
        Self {
            current: 0.0,
            max: cooldown_time,
        }
    }

    /// Update cooldown timer
    pub fn update(&mut self, dt: f32) {
        if self.current > 0.0 {
            self.current = (self.current - dt).max(0.0);
        }
    }

    /// Check if entity can attack
    pub fn can_attack(&self) -> bool {
        self.current <= 0.0
    }

    /// Start cooldown after attack
    pub fn start_cooldown(&mut self) {
        self.current = self.max;
    }

    /// Get cooldown progress (0.0 = ready, 1.0 = fully on cooldown)
    pub fn progress(&self) -> f32 {
        if self.max <= 0.0 {
            0.0
        } else {
            self.current / self.max
        }
    }
}
