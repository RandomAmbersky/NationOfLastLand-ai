//! Position component for entity locations

use serde::{Deserialize, Serialize};

/// Represents the position of an entity on the game map
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Position {
    pub x: f32,
    pub y: f32,
}

impl Position {
    pub fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }

    /// Calculate distance to another position
    pub fn distance_to(&self, other: &Position) -> f32 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        (dx * dx + dy * dy).sqrt()
    }

    /// Check if position is within range of another position
    pub fn is_within_range(&self, other: &Position, range: f32) -> bool {
        self.distance_to(other) <= range
    }
}

impl Default for Position {
    fn default() -> Self {
        Self::new(0.0, 0.0)
    }
}
