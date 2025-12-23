# Nation of Last Land - System Patterns

## Architecture Overview

### ECS Architecture Pattern
The game uses Entity Component System (ECS) architecture implemented with the `hecs` library:

```
Entity (ID) ────┐
                ├── Component A
                ├── Component B
                └── Component C

System ────┬─── Query Components
           ├── Process Logic
           └── Update Components
```

**Key Benefits:**
- **Composition over Inheritance**: Flexible entity composition
- **Performance**: Cache-friendly data access patterns
- **Modularity**: Systems operate independently
- **Scalability**: Easy addition of new entity types

## Core Component Patterns

### Position Component Pattern
```rust
#[derive(Component)]
struct Position {
    x: f32,
    y: f32,
}
```
- **Universal**: Applied to all movable entities
- **Immutable Reference**: Systems read position for calculations
- **Update Pattern**: Movement systems modify position values

### Health Component Pattern
```rust
#[derive(Component)]
struct Health {
    current: f32,
    maximum: f32,
}
```
- **Damage Integration**: Combat systems reduce current health
- **Death Trigger**: Systems check for current <= 0
- **Regeneration**: Separate systems for healing mechanics

### Movement Component Pattern
```rust
#[derive(Component)]
struct Movement {
    target: Option<(f32, f32)>,
    speed: f32,
    path: Vec<(f32, f32)>,
}
```
- **Target-based**: Entities move toward specified coordinates
- **Pathfinding Integration**: Pre-calculated paths stored in component
- **Speed Variation**: Different entity types have different movement speeds

## System Design Patterns

### Query System Pattern
```rust
fn movement_system(world: &mut World) {
    let mut query = world.query::<(&mut Position, &Movement)>();
    for (pos, mov) in query.iter() {
        // Movement logic
    }
}
```
- **Parallel Processing**: Multiple systems can query simultaneously
- **Data Locality**: Systems access only needed components
- **Composition**: Complex behavior from simple system combinations

### State Machine Pattern
```rust
enum AlertState {
    Hidden,
    Revealed,
    Active,
    Completed,
}

#[derive(Component)]
struct Alert {
    state: AlertState,
    // ... other fields
}
```
- **Finite States**: Clear state transitions for game entities
- **System Separation**: Different systems handle different states
- **Event-driven**: State changes trigger system responses

### Configuration-Driven Pattern
```yaml
# config/units.yml
vehicles:
  - type: "tank"
    health: 100
    speed: 50
    devices: ["turret", "armor"]
```
- **External Configuration**: Game balance in human-readable files
- **Runtime Loading**: Configuration loaded at startup
- **Modding Support**: Easy balance changes without code modification

## API Design Patterns

### Command-Query Separation
```rust
// Commands (modify state)
fn create_vehicle(type: &str, position: (f32, f32)) -> String

// Queries (read state)
fn update(dt: f32) -> String  // Returns current state
```
- **Pure Functions**: API functions have no side effects except through return values
- **State Passing**: Game state passed explicitly through function parameters
- **Serialization Boundary**: Clear separation between internal Rust types and external JSON

### Builder Pattern for Entity Creation
```rust
impl VehicleBuilder {
    fn new(vehicle_type: &str) -> Self { ... }
    fn with_position(self, x: f32, y: f32) -> Self { ... }
    fn with_devices(self, devices: Vec<String>) -> Self { ... }
    fn build(self, world: &mut World) -> Entity { ... }
}
```
- **Fluent Interface**: Method chaining for complex entity construction
- **Validation**: Builder validates configuration before entity creation
- **Flexibility**: Optional components added conditionally

## Data Flow Patterns

### Game Loop Pattern
```
Input ──► API ──► Systems ──► World Update ──► Serialization ──► Output
   ▲         ▲         ▲            ▲               ▲            │
   └─────────┴─────────┴────────────┴───────────────┘            ▼
                                                        External State
```

**Phases:**
1. **Input Processing**: External commands processed
2. **System Updates**: ECS systems update entity state
3. **World Synchronization**: Entity changes applied
4. **State Serialization**: Current state converted to JSON
5. **Output Delivery**: State sent to external interface

### Event-Driven Pattern
```rust
struct GameEvent {
    event_type: EventType,
    entity: Entity,
    data: EventData,
}

enum EventType {
    UnitDestroyed,
    AlertTriggered,
    ResourceCollected,
}
```
- **Decoupled Systems**: Events allow loose coupling between systems
- **Delayed Processing**: Events can be queued for end-of-frame processing
- **Audit Trail**: Events provide game state change history

## Component Relationship Patterns

### Composite Entity Pattern
```
Vehicle Entity
├── Position
├── Health
├── Movement
├── Vehicle (type, devices)
└── Crew (assigned cats)
```
- **Hierarchical Composition**: Entities contain other entities
- **Relationship Management**: Systems maintain referential integrity
- **Lifecycle Coupling**: Child entities affected by parent state changes

### Resource Ownership Pattern
```rust
#[derive(Component)]
struct ResourceStorage {
    owner: Entity,  // Owning base
    resource_type: ResourceType,
    amount: f32,
    capacity: f32,
}
```
- **Ownership Tracking**: Resources linked to controlling entities
- **Transfer Logic**: Systems handle resource movement between owners
- **Capacity Management**: Automatic limiting and overflow handling

## Error Handling Patterns

### Result-Based Error Handling
```rust
fn create_vehicle(vehicle_type: &str, position: (f32, f32)) -> Result<Entity, GameError> {
    // Validation and creation logic
}
```
- **Explicit Errors**: All error conditions explicitly handled
- **Error Propagation**: Errors bubble up to API boundary
- **Graceful Degradation**: System failures don't crash entire game

### Validation Pattern
```rust
impl VehicleConfig {
    fn validate(&self) -> Result<(), ValidationError> {
        // Configuration validation logic
    }
}
```
- **Precondition Checking**: Validate data before processing
- **Early Failure**: Fail fast on invalid configurations
- **Clear Error Messages**: Descriptive validation error reporting

## Performance Patterns

### Component Iteration Optimization
```rust
// Cache query results
let mut positions: Vec<(Entity, &Position)> = world.query::<&Position>().collect();

// Process cached results
for (entity, pos) in positions.iter() {
    // Processing logic
}
```
- **Query Caching**: Avoid repeated query overhead
- **Batch Processing**: Process multiple entities together
- **Memory Layout**: Components stored contiguously for cache efficiency

### System Ordering Pattern
```rust
// Update order matters for dependent systems
movement_system(world);     // Update positions first
collision_system(world);    // Then check collisions
combat_system(world);       // Finally resolve combat
```
- **Dependency Management**: Systems run in correct order
- **Data Dependencies**: Later systems depend on earlier system results
- **Consistency**: Ensures game state remains consistent across updates
