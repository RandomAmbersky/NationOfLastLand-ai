//! Faction component for entity team identification

use serde::{Deserialize, Serialize};

/// Faction/team identifier for entities
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Faction {
    Player,     // Player-controlled units
    Enemy,      // Enemy AI units
    Neutral,    // Neutral entities (traders, civilians, etc.)
    Wild,       // Wild creatures (mutants, animals)
}

impl Faction {
    /// Check if two factions are hostile towards each other
    pub fn is_hostile_towards(&self, other: &Faction) -> bool {
        match (self, other) {
            // Player and Enemy are hostile to each other
            (Faction::Player, Faction::Enemy) => true,
            (Faction::Enemy, Faction::Player) => true,

            // Wild creatures attack everyone except their own kind
            (Faction::Wild, Faction::Wild) => false,
            (Faction::Wild, _) => true,
            (_, Faction::Wild) => true,

            // Neutral entities don't attack anyone
            (Faction::Neutral, _) => false,
            (_, Faction::Neutral) => false,

            // Same faction - never hostile
            (a, b) if a == b => false,

            // Default: not hostile
            _ => false,
        }
    }

    /// Check if two factions are allies
    pub fn is_ally(&self, other: &Faction) -> bool {
        !self.is_hostile_towards(other) && self != other
    }

    /// Get faction name as string
    pub fn name(&self) -> &'static str {
        match self {
            Faction::Player => "Player",
            Faction::Enemy => "Enemy",
            Faction::Neutral => "Neutral",
            Faction::Wild => "Wild",
        }
    }
}

impl Default for Faction {
    fn default() -> Self {
        Faction::Player
    }
}

/// Faction component for entities
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct FactionComponent {
    pub faction: Faction,
}

impl FactionComponent {
    pub fn new(faction: Faction) -> Self {
        Self { faction }
    }

    pub fn player() -> Self {
        Self::new(Faction::Player)
    }

    pub fn enemy() -> Self {
        Self::new(Faction::Enemy)
    }

    pub fn neutral() -> Self {
        Self::new(Faction::Neutral)
    }

    pub fn wild() -> Self {
        Self::new(Faction::Wild)
    }
}
