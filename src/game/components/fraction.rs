//! Fraction component for entity team identification

use serde::{Deserialize, Serialize};

/// Fraction/team identifier for entities
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Fraction {
    Player,     // Player-controlled units
    Enemy,      // Enemy AI units
    Neutral,    // Neutral entities (traders, civilians, etc.)
    Wild,       // Wild creatures (mutants, animals)
}

impl Fraction {
    /// Check if two fractions are hostile towards each other
    pub fn is_hostile_towards(&self, other: &Fraction) -> bool {
        match (self, other) {
            // Player and Enemy are hostile to each other
            (Fraction::Player, Fraction::Enemy) => true,
            (Fraction::Enemy, Fraction::Player) => true,

            // Player considers Wild creatures hostile
            (Fraction::Player, Fraction::Wild) => true,
            (Fraction::Wild, Fraction::Player) => true,

            // Wild creatures attack everyone except their own kind
            (Fraction::Wild, Fraction::Wild) => false,
            (Fraction::Wild, _) => true,
            (_, Fraction::Wild) => true,

            // Neutral entities don't attack anyone
            (Fraction::Neutral, _) => false,
            (_, Fraction::Neutral) => false,

            // Same fraction - never hostile
            (a, b) if a == b => false,

            // Default: not hostile
            _ => false,
        }
    }

    /// Check if two fractions are allies
    pub fn is_ally(&self, other: &Fraction) -> bool {
        !self.is_hostile_towards(other) && self != other
    }

    /// Get fraction name as string
    pub fn name(&self) -> &'static str {
        match self {
            Fraction::Player => "Player",
            Fraction::Enemy => "Enemy",
            Fraction::Neutral => "Neutral",
            Fraction::Wild => "Wild",
        }
    }
}

impl Default for Fraction {
    fn default() -> Self {
        Fraction::Player
    }
}

/// Fraction component for entities
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct FractionComponent {
    pub fraction: Fraction,
}

impl FractionComponent {
    pub fn new(fraction: Fraction) -> Self {
        Self { fraction }
    }

    pub fn player() -> Self {
        Self::new(Fraction::Player)
    }

    pub fn enemy() -> Self {
        Self::new(Fraction::Enemy)
    }

    pub fn neutral() -> Self {
        Self::new(Fraction::Neutral)
    }

    pub fn wild() -> Self {
        Self::new(Fraction::Wild)
    }
}
