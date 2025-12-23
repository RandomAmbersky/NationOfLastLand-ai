//! Crew components for managing anthropomorphic cats

use serde::{Deserialize, Serialize};

/// Types of crew roles in vehicles
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CrewRole {
    Driver,
    Gunner,
    Passenger,
}

impl CrewRole {
    pub fn name(&self) -> &'static str {
        match self {
            CrewRole::Driver => "Driver",
            CrewRole::Gunner => "Gunner",
            CrewRole::Passenger => "Passenger",
        }
    }
}

/// Crew member (anthropomorphic cat)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CrewMember {
    pub id: u64,
    pub name: String,
    pub role: CrewRole,
    pub level: u32,
    pub experience: f32,
    pub fatigue: f32, // 0.0 to 1.0
    pub is_injured: bool,
}

impl CrewMember {
    pub fn new(id: u64, name: &str, role: CrewRole) -> Self {
        Self {
            id,
            name: name.to_string(),
            role,
            level: 1,
            experience: 0.0,
            fatigue: 0.0,
            is_injured: false,
        }
    }

    /// Check if crew member is available for duty
    pub fn is_available(&self) -> bool {
        !self.is_injured && self.fatigue < 1.0
    }

    /// Add experience and check for level up
    pub fn add_experience(&mut self, amount: f32) -> bool {
        self.experience += amount;
        let exp_needed = self.level as f32 * 100.0; // Simple leveling formula
        if self.experience >= exp_needed {
            self.experience -= exp_needed;
            self.level += 1;
            true // Leveled up
        } else {
            false // No level up
        }
    }

    /// Increase fatigue
    pub fn add_fatigue(&mut self, amount: f32) {
        self.fatigue = (self.fatigue + amount).clamp(0.0, 1.0);
    }

    /// Reduce fatigue (rest)
    pub fn reduce_fatigue(&mut self, amount: f32) {
        self.fatigue = (self.fatigue - amount).max(0.0);
    }

    /// Heal injury
    pub fn heal(&mut self) {
        self.is_injured = false;
    }

    /// Injure the crew member
    pub fn injure(&mut self) {
        self.is_injured = true;
    }
}

/// Crew component for vehicles that can carry crew members
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Crew {
    pub members: Vec<CrewMember>,
    pub max_capacity: usize,
}

impl Crew {
    pub fn new(max_capacity: usize) -> Self {
        Self {
            members: Vec::new(),
            max_capacity,
        }
    }

    /// Add a crew member if there's space
    pub fn add_member(&mut self, member: CrewMember) -> Result<(), &'static str> {
        if self.members.len() >= self.max_capacity {
            return Err("Vehicle is at maximum crew capacity");
        }
        self.members.push(member);
        Ok(())
    }

    /// Remove a crew member by ID
    pub fn remove_member(&mut self, id: u64) -> Option<CrewMember> {
        let pos = self.members.iter().position(|m| m.id == id)?;
        Some(self.members.remove(pos))
    }

    /// Get crew member by ID
    pub fn get_member(&self, id: u64) -> Option<&CrewMember> {
        self.members.iter().find(|m| m.id == id)
    }

    /// Get mutable crew member by ID
    pub fn get_member_mut(&mut self, id: u64) -> Option<&mut CrewMember> {
        self.members.iter_mut().find(|m| m.id == id)
    }

    /// Get all available crew members
    pub fn available_members(&self) -> Vec<&CrewMember> {
        self.members.iter().filter(|m| m.is_available()).collect()
    }

    /// Check if vehicle has a driver
    pub fn has_driver(&self) -> bool {
        self.members.iter().any(|m| m.role == CrewRole::Driver && m.is_available())
    }

    /// Check if vehicle has a gunner
    pub fn has_gunner(&self) -> bool {
        self.members.iter().any(|m| m.role == CrewRole::Gunner && m.is_available())
    }

    /// Get crew efficiency based on member status
    pub fn efficiency(&self) -> f32 {
        if self.members.is_empty() {
            return 0.0;
        }

        let total_efficiency: f32 = self.members.iter()
            .map(|m| {
                if !m.is_available() {
                    0.0
                } else {
                    // Efficiency based on level and fatigue
                    let base_efficiency = m.level as f32 * 0.1;
                    base_efficiency * (1.0 - m.fatigue)
                }
            })
            .sum();

        total_efficiency / self.members.len() as f32
    }
}
