//! Alert component for random events and missions

use serde::{Deserialize, Serialize};
use crate::game::components::Position;

/// Alert state - tracks whether an alert has been revealed
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AlertState {
    Hidden,    // Not yet revealed
    Revealed,  // Revealed, entities spawned
    Completed, // All entities defeated/cleared
}

/// Alert types that can spawn in the game
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AlertType {
    TrashAlert,
    WasteAlert,
    MutantAlert,
    RaiderAlert,
    SurvivorAlert,
    TraderAlert,
    ResourceDepositAlert,
}

/// Alert component for random events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub alert_type: AlertType,
    pub position: Position,
    pub reveal_distance: f32,
    pub state: AlertState,
    pub reputation_reward: f32,
    pub spawned_entity_ids: Vec<u32>,
}

impl Alert {
    pub fn new(alert_type: AlertType, x: f32, y: f32, reveal_distance: f32, reputation_reward: f32) -> Self {
        Self {
            alert_type,
            position: Position::new(x, y),
            reveal_distance,
            state: AlertState::Hidden,
            reputation_reward,
            spawned_entity_ids: Vec::new(),
        }
    }

    /// Check if a position is close enough to reveal this alert
    pub fn should_reveal(&self, check_pos: &Position) -> bool {
        self.state == AlertState::Hidden && self.position.distance_to(check_pos) <= self.reveal_distance
    }

    /// Mark alert as revealed and record spawned entity IDs
    pub fn reveal(&mut self, entity_ids: Vec<u32>) {
        self.state = AlertState::Revealed;
        self.spawned_entity_ids = entity_ids;
    }

    /// Check if alert is completed (all spawned entities are dead)
    pub fn is_completed(&self) -> bool {
        self.state == AlertState::Revealed && self.spawned_entity_ids.is_empty()
    }

    /// Remove a dead entity from the alert's tracking
    pub fn remove_entity(&mut self, entity_id: u32) {
        self.spawned_entity_ids.retain(|&id| id != entity_id);
        if self.spawned_entity_ids.is_empty() {
            self.state = AlertState::Completed;
        }
    }
}
