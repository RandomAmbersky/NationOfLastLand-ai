//! Combat system for automatic unit collisions and damage calculation

use crate::game::components::{Position, Health, Damage, DamageResistance, Vehicle, CombatCooldown, FactionComponent, Faction};

/// Update combat system: handle collisions and damage between units
pub fn update_combat_system(world: &mut hecs::World, dt: f32) {
    // Update combat cooldowns first
    for (_entity, cooldown) in world.query::<&mut CombatCooldown>().iter() {
        cooldown.update(dt);
    }

    // Get all entities with position and health (combat-capable units)
    let mut combat_entities = Vec::new();

    for (entity, (position, health)) in world.query::<(&Position, &Health)>().iter() {
        if health.is_alive() {
            combat_entities.push((entity, *position, *health));
        }
    }

    println!("Combat system: {} entities alive", combat_entities.len());

    // Check for collisions between all pairs of combat entities
    for i in 0..combat_entities.len() {
        for j in (i + 1)..combat_entities.len() {
            let (entity_a, pos_a, _health_a) = combat_entities[i];
            let (entity_b, pos_b, _health_b) = combat_entities[j];

            // Simple collision detection - units within 10 units of each other
            let distance = pos_a.distance_to(&pos_b);
            if distance < 10.0 {
                println!("Collision detected between entities {:?} and {:?} at distance {:.1}",
                    entity_a.id(), entity_b.id(), distance);
                // Collision detected - apply combat
                apply_combat_damage(world, entity_a, entity_b);
            }
        }
    }
}

/// Apply combat damage between two colliding entities
fn apply_combat_damage(world: &mut hecs::World, entity_a: hecs::Entity, entity_b: hecs::Entity) {
    println!("Starting combat between entities {:?} and {:?}", entity_a.id(), entity_b.id());

    // Check factions first - same faction units don't attack each other
    let faction_a = world.get::<&FactionComponent>(entity_a)
        .map(|f| f.faction)
        .unwrap_or(Faction::Player); // Default to player faction

    let faction_b = world.get::<&FactionComponent>(entity_b)
        .map(|f| f.faction)
        .unwrap_or(Faction::Player); // Default to player faction

    if !faction_a.is_hostile_towards(&faction_b) {
        println!("Entities {:?} and {:?} are not hostile (faction {:?} vs {:?}), no combat", entity_a.id(), entity_b.id(), faction_a.name(), faction_b.name());
        return;
    }

    println!("Combat confirmed: {:?} vs {:?}", faction_a.name(), faction_b.name());

    // Collect combat information first (to avoid borrow checker issues)
    let mut damage_events = Vec::new();

    // Check entity A's damage capabilities and cooldown
    let can_a_attack = world.get::<&CombatCooldown>(entity_a)
        .map(|c| c.can_attack())
        .unwrap_or(true); // No cooldown component = can always attack

    if can_a_attack {
        if let Ok(damage_a) = world.get::<&Damage>(entity_a) {
            if let Ok(resistance_b) = world.get::<&DamageResistance>(entity_b) {
                let actual_damage = damage_a.calculate_damage(&resistance_b);
                damage_events.push((entity_b, actual_damage, entity_a));
                println!("Entity {:?} will deal {:.1} damage to entity {:?}", entity_a.id(), actual_damage, entity_b.id());
            } else {
                // No resistance, full damage
                damage_events.push((entity_b, damage_a.amount, entity_a));
                println!("Entity {:?} will deal {:.1} damage to entity {:?} (no resistance)", entity_a.id(), damage_a.amount, entity_b.id());
            }
        } else {
            println!("Entity {:?} has no damage component", entity_a.id());
        }
    } else {
        println!("Entity {:?} is on cooldown", entity_a.id());
    }

    // Check entity B's damage capabilities and cooldown (bidirectional)
    let can_b_attack = world.get::<&CombatCooldown>(entity_b)
        .map(|c| c.can_attack())
        .unwrap_or(true); // No cooldown component = can always attack

    if can_b_attack {
        if let Ok(damage_b) = world.get::<&Damage>(entity_b) {
            if let Ok(resistance_a) = world.get::<&DamageResistance>(entity_a) {
                let actual_damage = damage_b.calculate_damage(&resistance_a);
                damage_events.push((entity_a, actual_damage, entity_b));
                println!("Entity {:?} will deal {:.1} damage to entity {:?}", entity_b.id(), actual_damage, entity_a.id());
            } else {
                // No resistance, full damage
                damage_events.push((entity_a, damage_b.amount, entity_b));
                println!("Entity {:?} will deal {:.1} damage to entity {:?} (no resistance)", entity_b.id(), damage_b.amount, entity_a.id());
            }
        } else {
            println!("Entity {:?} has no damage component", entity_b.id());
        }
    } else {
        println!("Entity {:?} is on cooldown", entity_b.id());
    }

    // Apply damage and handle deaths
    let mut entities_to_despawn = Vec::new();

    for (target_entity, damage_amount, attacker_entity) in damage_events {
        if let Ok(mut health) = world.get::<&mut Health>(target_entity) {
            let current_health = health.current;
            let died = health.take_damage(damage_amount);

            // Log combat event
            println!("Entity {:?} dealt {:.1} damage to entity {:?} (health: {:.1} -> {:.1})",
                attacker_entity.id(), damage_amount, target_entity.id(), current_health, health.current);

            // Set cooldown for attacker
            if let Ok(mut cooldown) = world.get::<&mut CombatCooldown>(attacker_entity) {
                cooldown.start_cooldown();
                println!("Entity {:?} started cooldown", attacker_entity.id());
            }

            if died {
                println!("Entity {:?} was destroyed!", target_entity.id());
                entities_to_despawn.push(target_entity);
            }
        } else {
            println!("Could not get health for entity {:?}", target_entity.id());
        }
    }

    let despawn_count = entities_to_despawn.len();
    println!("Combat finished. {} entities to despawn.", despawn_count);

    // Despawn dead entities
    for entity in entities_to_despawn {
        println!("Despawning entity {:?}", entity.id());
        let _ = world.despawn(entity);
    }
}

/// Add combat capabilities to a vehicle entity
pub fn add_combat_to_vehicle(world: &mut hecs::World, entity: hecs::Entity) {
    // Get vehicle type to determine combat capabilities
    let vehicle_type = {
        if let Ok(vehicle) = world.get::<&Vehicle>(entity) {
            vehicle.vehicle_type
        } else {
            return; // No vehicle component, nothing to do
        }
    };

    let (damage_amount, damage_type, attack_cooldown) = match vehicle_type {
        crate::game::components::VehicleType::ScoutCar => (10.0, crate::game::components::DamageType::Physical, 1.0),
        crate::game::components::VehicleType::ArmoredTruck => (15.0, crate::game::components::DamageType::Physical, 1.5),
        crate::game::components::VehicleType::HeavyTank => (25.0, crate::game::components::DamageType::Energy, 2.0),
    };

    // Add damage component
    let damage = Damage::new(damage_amount, damage_type);
    let _ = world.insert_one(entity, damage);

    // Add basic damage resistance based on vehicle type
    let resistance = match vehicle_type {
        crate::game::components::VehicleType::ScoutCar => DamageResistance::new(0.0, 0.0, 0.0, 0.0, 0.0),
        crate::game::components::VehicleType::ArmoredTruck => DamageResistance::new(0.1, 0.0, 0.0, 0.0, 0.0),
        crate::game::components::VehicleType::HeavyTank => DamageResistance::new(0.2, 0.1, 0.1, 0.0, 0.0),
    };
    let _ = world.insert_one(entity, resistance);

    // Add combat cooldown
    let cooldown = CombatCooldown::new(attack_cooldown);
    let _ = world.insert_one(entity, cooldown);
}

/// Add faction component to an entity
pub fn add_faction_to_entity(world: &mut hecs::World, entity: hecs::Entity, faction: Faction) {
    let faction_component = FactionComponent::new(faction);
    let _ = world.insert_one(entity, faction_component);
}
