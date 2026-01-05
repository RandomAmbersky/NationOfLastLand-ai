//! Base and floor components for the Nation of Last Land game

use serde::{Deserialize, Serialize};

/// Represents a player base with multiple floors
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Base {
    /// Unique identifier for the base
    pub id: u32,
    /// Position of the base on the map
    pub position: (f32, f32),
    /// Current floors in the base (from bottom to top)
    pub floors: Vec<Floor>,
    /// Maximum number of floors this base can have
    pub max_floors: usize,
    /// Current reputation level (unlocks new floor types)
    pub reputation_level: u32,
}

/// Types of floors that can be built in a base
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum FloorType {
    /// Storage floor for resources
    Storage,
    /// Laboratory floor for research
    Laboratory,
    /// Repair floor for unit maintenance
    Repair,
    /// Rest floor for crew recovery
    Rest,
}

impl FloorType {
    /// Get the display name for this floor type
    pub fn name(&self) -> &'static str {
        match self {
            FloorType::Storage => "Storage",
            FloorType::Laboratory => "Laboratory",
            FloorType::Repair => "Repair",
            FloorType::Rest => "Rest",
        }
    }

    /// Get the description for this floor type
    pub fn description(&self) -> &'static str {
        match self {
            FloorType::Storage => "Stores resources and materials",
            FloorType::Laboratory => "Conducts research and develops technologies",
            FloorType::Repair => "Repairs and maintains vehicles",
            FloorType::Rest => "Allows crew members to rest and recover",
        }
    }

    /// Get the reputation level required to unlock this floor type
    pub fn required_reputation_level(&self) -> u32 {
        match self {
            FloorType::Storage => 1,    // Basic floor, available from start
            FloorType::Laboratory => 2, // Requires some reputation
            FloorType::Repair => 3,     // Requires more reputation
            FloorType::Rest => 4,       // Most advanced floor
        }
    }

    /// Get the base cost in reputation to build this floor type
    pub fn base_cost(&self) -> u32 {
        match self {
            FloorType::Storage => 50,
            FloorType::Laboratory => 150,
            FloorType::Repair => 250,
            FloorType::Rest => 350,
        }
    }
}

/// Represents a single floor in a base
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Floor {
    /// Type of this floor
    pub floor_type: FloorType,
    /// Current upgrade level of this floor (1-3)
    pub level: u32,
    /// Whether this floor is operational (has power/crew)
    pub is_operational: bool,
    /// Current capacity usage (for storage floors)
    pub capacity_used: u32,
    /// Maximum capacity (for storage floors)
    pub capacity_max: u32,
    /// Current research progress (for laboratory floors)
    pub research_progress: f32,
    /// Current research target (for laboratory floors)
    pub research_target: Option<String>,
}

/// Component for units assigned to a specific base floor
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssignedToFloor {
    /// ID of the base this unit is assigned to
    pub base_id: u32,
    /// Index of the floor in the base (0 = bottom floor)
    pub floor_index: usize,
    /// Role this unit serves on this floor
    pub role: FloorRole,
}

/// Roles that units can serve on different floor types
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum FloorRole {
    /// Working in storage (loading/unloading resources)
    StorageWorker,
    /// Conducting research in laboratory
    Researcher,
    /// Repairing vehicles in repair bay
    RepairTechnician,
    /// Maintaining/resting crew in rest area
    Caretaker,
}

/// Component for tracking base construction progress
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BaseConstruction {
    /// Type of floor being constructed
    pub floor_type: FloorType,
    /// Current construction progress (0.0 to 1.0)
    pub progress: f32,
    /// Total time required for construction
    pub total_time: f32,
    /// Time spent constructing so far
    pub time_spent: f32,
}

impl Base {
    /// Create a new base with default storage floor
    pub fn new(id: u32, position: (f32, f32)) -> Self {
        let storage_floor = Floor {
            floor_type: FloorType::Storage,
            level: 1,
            is_operational: true,
            capacity_used: 0,
            capacity_max: 100,
            research_progress: 0.0,
            research_target: None,
        };

        Self {
            id,
            position,
            floors: vec![storage_floor],
            max_floors: 5, // Can be upgraded later
            reputation_level: 1,
        }
    }

    /// Check if a floor type can be built at current reputation level
    pub fn can_build_floor(&self, floor_type: &FloorType) -> bool {
        self.reputation_level >= floor_type.required_reputation_level()
    }

    /// Calculate cost to build a new floor
    pub fn calculate_floor_cost(&self, floor_type: &FloorType) -> u32 {
        // Cost increases with number of floors and floor type complexity
        let base_cost = floor_type.base_cost();
        let floor_multiplier = 1.0 + (self.floors.len() as f32 * 0.2);
        (base_cost as f32 * floor_multiplier) as u32
    }

    /// Check if base can have more floors
    pub fn can_expand(&self) -> bool {
        self.floors.len() < self.max_floors
    }

    /// Add a new floor to the base
    pub fn add_floor(&mut self, floor_type: FloorType) -> Result<(), &'static str> {
        if !self.can_expand() {
            return Err("Base has reached maximum floor capacity");
        }

        if !self.can_build_floor(&floor_type) {
            return Err("Insufficient reputation level for this floor type");
        }

        let capacity_max = match floor_type {
            FloorType::Storage => 100,
            FloorType::Laboratory => 0, // No capacity limit
            FloorType::Repair => 1,     // One vehicle at a time
            FloorType::Rest => 10,      // Crew capacity
        };

        let floor = Floor {
            floor_type,
            level: 1,
            is_operational: false, // Starts inoperational until built
            capacity_used: 0,
            capacity_max,
            research_progress: 0.0,
            research_target: None,
        };

        self.floors.push(floor);
        Ok(())
    }

    /// Get total storage capacity across all storage floors
    pub fn total_storage_capacity(&self) -> u32 {
        self.floors
            .iter()
            .filter(|f| f.floor_type == FloorType::Storage)
            .map(|f| f.capacity_max)
            .sum()
    }

    /// Get current storage usage across all storage floors
    pub fn current_storage_usage(&self) -> u32 {
        self.floors
            .iter()
            .filter(|f| f.floor_type == FloorType::Storage)
            .map(|f| f.capacity_used)
            .sum()
    }
}

impl Floor {
    /// Check if this floor can accommodate more units/items
    pub fn has_capacity(&self) -> bool {
        match self.floor_type {
            FloorType::Storage => self.capacity_used < self.capacity_max,
            FloorType::Laboratory => true, // Unlimited researchers
            FloorType::Repair => self.capacity_used < self.capacity_max,
            FloorType::Rest => self.capacity_used < self.capacity_max,
        }
    }

    /// Get efficiency multiplier based on floor level
    pub fn efficiency_multiplier(&self) -> f32 {
        match self.level {
            1 => 1.0,
            2 => 1.5,
            3 => 2.0,
            _ => 1.0,
        }
    }
}

impl Default for Base {
    fn default() -> Self {
        Self::new(0, (400.0, 300.0))
    }
}
