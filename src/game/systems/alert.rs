//! Alert system for random event generation and management

use crate::game::components::{Alert, AlertState, AlertType, Position, Health, Faction};
use crate::game::systems::combat;
use rand::Rng;

/// Update alert system: check for reveals and completions
pub fn update_alert_system(world: &mut hecs::World, _dt: f32) {
    // Check for alerts that should be revealed
    check_alert_reveals(world);

    // Check for completed alerts
    check_alert_completions(world);

    // TODO: Generate new alerts periodically
}

/// Check if any hidden alerts should be revealed based on nearby units
fn check_alert_reveals(world: &mut hecs::World) {
    // Get all positions of alive units (vehicles with health)
    let mut unit_positions = Vec::new();
    for (_entity, (position, health)) in world.query::<(&Position, &Health)>().iter() {
        if health.is_alive() {
            unit_positions.push(*position);
        }
    }

    // Check each hidden alert against unit positions and collect info
    let mut alerts_to_reveal = Vec::new();

    for (entity, alert) in world.query::<&Alert>().iter() {
        if alert.state == AlertState::Hidden {
            for &unit_pos in &unit_positions {
                if alert.should_reveal(&unit_pos) {
                    alerts_to_reveal.push((entity, alert.alert_type, alert.position));
                    break;
                }
            }
        }
    }

    // Reveal alerts and spawn their entities
    for (alert_entity, alert_type, position) in alerts_to_reveal {
        let spawned_entity_ids = spawn_alert_entities(world, alert_type, &position);

        // Now update the alert component
        if let Ok(mut alert) = world.get::<&mut Alert>(alert_entity) {
            alert.reveal(spawned_entity_ids);
            println!("Alert {:?} revealed at ({}, {})!", alert_type, position.x, position.y);
        }

        // Remove the alert entity from the world after revealing
        let _ = world.despawn(alert_entity);
        println!("Alert entity {:?} removed after revelation", alert_entity.id());
    }
}

/// Check for completed alerts (all spawned entities defeated)
fn check_alert_completions(world: &mut hecs::World) {
    // Get all entity IDs that are alive (have health > 0)
    let mut alive_entity_ids = std::collections::HashSet::new();
    for (entity, health) in world.query::<&Health>().iter() {
        if health.is_alive() {
            alive_entity_ids.insert(entity.id());
        }
    }

    // Update alerts with destroyed entities
    for (_entity, alert) in world.query::<&mut Alert>().iter() {
        if alert.state == AlertState::Revealed {
            // Remove entity IDs that are no longer alive
            alert.spawned_entity_ids.retain(|&entity_id| alive_entity_ids.contains(&entity_id));

            if alert.is_completed() {
                println!("Alert {:?} completed! Reputation reward: {}", alert.alert_type, alert.reputation_reward);
                // TODO: Add reputation to player
            }
        }
    }
}

/// Spawn entities for a revealed alert
fn spawn_alert_entities(world: &mut hecs::World, alert_type: AlertType, position: &Position) -> Vec<u32> {
    let mut spawned = Vec::new();
    let mut rng = rand::thread_rng();

    match alert_type {
        AlertType::TrashAlert => {
            // Spawn 1-3 hostile scavengers (wild faction - hostile to everyone)
            let count = rng.gen_range(1..=3);
            for _i in 0..count {
                let offset_x = rng.gen_range(-10.0..10.0);
                let offset_y = rng.gen_range(-10.0..10.0);
                let entity_pos = Position::new(position.x + offset_x, position.y + offset_y);

                let health = Health::new(30.0);
                let movement = crate::game::components::Movement::new(4.0);
                let entity = world.spawn((entity_pos, health, movement));
                spawned.push(entity.id());

                // Add combat capabilities
                combat::add_combat_to_vehicle(world, entity);

                // Add wild faction (hostile to everyone)
                combat::add_faction_to_entity(world, entity, Faction::Wild);

                println!("Spawned hostile scavenger at ({}, {})", entity_pos.x, entity_pos.y);
            }
        }
        AlertType::WasteAlert => {
            // Spawn 1-2 toxic mutants (wild faction - hostile to everyone)
            let count = rng.gen_range(1..=2);
            for _i in 0..count {
                let offset_x = rng.gen_range(-15.0..15.0);
                let offset_y = rng.gen_range(-15.0..15.0);
                let entity_pos = Position::new(position.x + offset_x, position.y + offset_y);

                let health = Health::new(50.0);
                let movement = crate::game::components::Movement::new(5.0);
                let entity = world.spawn((entity_pos, health, movement));
                spawned.push(entity.id());

                // Add combat capabilities
                combat::add_combat_to_vehicle(world, entity);

                // Add wild faction (hostile to everyone)
                combat::add_faction_to_entity(world, entity, Faction::Wild);

                println!("Spawned toxic mutant at ({}, {})", entity_pos.x, entity_pos.y);
            }
        }
        AlertType::MutantAlert => {
            // Spawn 2-4 mutant creatures with movement (wild faction)
            let count = rng.gen_range(2..=4);
            for _i in 0..count {
                let offset_x = rng.gen_range(-20.0..20.0);
                let offset_y = rng.gen_range(-20.0..20.0);
                let entity_pos = Position::new(position.x + offset_x, position.y + offset_y);

                let health = Health::new(80.0);
                let movement = crate::game::components::Movement::new(5.0);
                let entity = world.spawn((entity_pos, health, movement));
                spawned.push(entity.id());

                // Add combat capabilities
                combat::add_combat_to_vehicle(world, entity);

                // Add wild faction
                combat::add_faction_to_entity(world, entity, Faction::Wild);

                println!("Spawned mutant creature at ({}, {})", entity_pos.x, entity_pos.y);
            }
        }
        AlertType::RaiderAlert => {
            // Spawn 1-2 raider vehicles (enemy faction)
            let count = rng.gen_range(1..=2);
            for _i in 0..count {
                let offset_x = rng.gen_range(-25.0..25.0);
                let offset_y = rng.gen_range(-25.0..25.0);
                let entity_pos = Position::new(position.x + offset_x, position.y + offset_y);

                let health = Health::new(100.0);
                let movement = crate::game::components::Movement::new(8.0); // Give them movement capability
                let vehicle = crate::game::components::Vehicle::new(crate::game::components::VehicleType::ArmoredTruck);
                let entity = world.spawn((entity_pos, health, movement, vehicle));
                spawned.push(entity.id());

                // Add combat capabilities
                combat::add_combat_to_vehicle(world, entity);

                // Add enemy faction
                combat::add_faction_to_entity(world, entity, Faction::Enemy);

                println!("Spawned raider vehicle at ({}, {})", entity_pos.x, entity_pos.y);
            }
        }
        AlertType::SurvivorAlert => {
            // Spawn survivor group (neutral, but can be rescued)
            let entity_pos = *position;
            let health = Health::new(50.0);
            let entity = world.spawn((entity_pos, health));
            spawned.push(entity.id());

            // Add neutral faction
            combat::add_faction_to_entity(world, entity, Faction::Neutral);

            println!("Spawned survivor group at ({}, {})", entity_pos.x, entity_pos.y);
        }
        AlertType::TraderAlert => {
            // Spawn wandering trader (neutral)
            let entity_pos = *position;
            let health = Health::new(75.0);
            let entity = world.spawn((entity_pos, health));
            spawned.push(entity.id());

            // Add neutral faction
            combat::add_faction_to_entity(world, entity, Faction::Neutral);

            println!("Spawned wandering trader at ({}, {})", entity_pos.x, entity_pos.y);
        }
        AlertType::ResourceDepositAlert => {
            // Spawn resource deposit (neutral)
            let entity_pos = *position;
            let health = Health::new(100.0);
            let entity = world.spawn((entity_pos, health));
            spawned.push(entity.id());

            // Add neutral faction
            combat::add_faction_to_entity(world, entity, Faction::Neutral);

            println!("Spawned resource deposit at ({}, {})", entity_pos.x, entity_pos.y);
        }
    }

    spawned
}

/// Spawn a random alert in the game world
pub fn spawn_random_alert(world: &mut hecs::World) {
    let alert = generate_random_alert();
    world.spawn((alert,));
}

/// Generate a random alert at a random position
pub fn generate_random_alert() -> Alert {
    let mut rng = rand::thread_rng();

    // Random position within visible map area (800x600), with margin from edges
    let x = rng.gen_range(50.0..750.0);
    let y = rng.gen_range(50.0..550.0);

    // Random alert type with weights
    let alert_types = [
        (AlertType::TrashAlert, 40),         // 40% chance
        (AlertType::WasteAlert, 25),         // 25% chance
        (AlertType::MutantAlert, 15),        // 15% chance
        (AlertType::RaiderAlert, 10),        // 10% chance
        (AlertType::SurvivorAlert, 5),       // 5% chance
        (AlertType::TraderAlert, 3),         // 3% chance
        (AlertType::ResourceDepositAlert, 2), // 2% chance
    ];

    let total_weight: u32 = alert_types.iter().map(|(_, w)| w).sum();
    let mut choice = rng.gen_range(0..total_weight);

    let mut selected_type = AlertType::TrashAlert;
    for (alert_type, weight) in alert_types.iter() {
        if choice < *weight {
            selected_type = *alert_type;
            break;
        }
        choice -= weight;
    }

    // Alert-specific parameters
    let (reveal_distance, reputation_reward) = match selected_type {
        AlertType::TrashAlert => (25.0, 10.0),
        AlertType::WasteAlert => (30.0, 25.0),
        AlertType::MutantAlert => (35.0, 50.0),
        AlertType::RaiderAlert => (40.0, 75.0),
        AlertType::SurvivorAlert => (35.0, 60.0),
        AlertType::TraderAlert => (30.0, 0.0),
        AlertType::ResourceDepositAlert => (28.0, 40.0),
    };

    Alert::new(selected_type, x, y, reveal_distance, reputation_reward)
}
