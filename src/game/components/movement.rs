//! Movement component for entities that can move

use serde::{Deserialize, Serialize};

/// Represents movement capabilities and current movement state
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Movement {
    pub speed: f32,
    pub current_speed: f32,
    pub target_x: Option<f32>,
    pub target_y: Option<f32>,
}

impl Movement {
    pub fn new(speed: f32) -> Self {
        Self {
            speed,
            current_speed: 0.0,
            target_x: None,
            target_y: None,
        }
    }

    /// Set a target position to move towards
    pub fn set_target(&mut self, x: f32, y: f32) {
        self.target_x = Some(x);
        self.target_y = Some(y);
    }

    /// Clear the current target
    pub fn clear_target(&mut self) {
        self.target_x = None;
        self.target_y = None;
    }

    /// Check if entity has a target
    pub fn has_target(&self) -> bool {
        self.target_x.is_some() && self.target_y.is_some()
    }

    /// Get target position if it exists
    pub fn target_position(&self) -> Option<(f32, f32)> {
        match (self.target_x, self.target_y) {
            (Some(x), Some(y)) => Some((x, y)),
            _ => None,
        }
    }

    /// Check if entity is currently moving
    pub fn is_moving(&self) -> bool {
        self.current_speed > 0.0
    }
}
