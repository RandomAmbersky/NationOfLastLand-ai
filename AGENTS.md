# AGENTS.md

This document provides essential information for agents working in this codebase. It covers project structure, key technologies, build processes, testing, and important patterns.

## Project Overview

**Nation of Last Land** is a strategic RTS/tower defense game with a unique time rewind mechanic in a post-apocalyptic world. The core gameplay revolves around risking the life of your leader SP1 "Excellent" - when sent on missions, death triggers a time rewind resetting the world except for the avatar's skills.

### Core Features
- **Time Rewind Mechanic**: Avatar death resets the world but preserves skills
- **Anthropomorphic Cat Crew**: Independent movement, vehicle boarding (driver/gunner), fatigue system
- **Vehicle Equipment System**: Modular device customization (turrets, accelerators, armor, stealth)
- **Vertical Base Building**: Specialized floors (Storage, Laboratory, Repair, Rest)
- **Research System**: Multi-type science collection (biological, technological, ecological)
- **Resource Economy**: Reputation + silver/gold/platinum resources
- **Equipment System**: Items for cats (helmets, glasses, rings) with slot conflicts

## Technology Stack

### Backend (Rust)
- **Language**: Rust 2021 edition
- **ECS Framework**: hecs 0.10 (Entity Component System)
- **Serialization**: serde + serde_derive, serde_yaml, serde_json
- **WebAssembly Target**: wasm-bindgen 0.2 + serde-wasm-bindgen 0.6
- **JavaScript Interop**: js-sys 0.3, web-sys 0.3 (console feature)
- **Random Generation**: rand 0.9, getrandom 0.3 (wasm_js feature)

### Frontend (JavaScript)
- **Web Framework**: Vanilla JavaScript with Pixi.js for rendering
- **Build System**: wasm-pack for WebAssembly compilation
- **Development Server**: Node.js with serve package
- **Testing**: Jest with jsdom environment

## Project Structure

```
.
├── src/                    # Rust backend code
│   ├── lib.rs              # WASM library entry point with exports
│   ├── game/               # Core game logic (ECS)
│   │   ├── mod.rs
│   │   ├── world.rs        # GameWorld struct and update loop
│   │   ├── components/     # ECS component definitions
│   │   │   ├── mod.rs
│   │   │   ├── position.rs
│   │   │   ├── health.rs
│   │   │   ├── movement.rs
│   │   │   ├── vehicle.rs
│   │   │   ├── fraction.rs
│   │   │   ├── alert.rs
│   │   │   ├── base.rs
│   │   │   ├── combat.rs
│   │   │   ├── crew.rs
│   │   │   ├── damage.rs
│   │   │   └── selection.rs
│   │   └── systems/        # ECS system implementations
│   │       ├── mod.rs
│   │       ├── movement.rs
│   │       ├── combat.rs
│   │       ├── alert.rs
│   │       ├── selection.rs
│   │       └── base.rs
│   ├── config/             # YAML configuration loading
│   │   ├── mod.rs
│   │   └── units.yml       # Vehicle configurations
│   ├── api/                # WebAssembly API functions
│   │   ├── mod.rs
│   │   ├── init.rs
│   │   ├── create_vehicle.rs
│   │   ├── update.rs
│   │   ├── movement.rs
│   │   ├── group.rs
│   │   ├── entity_info.rs
│   │   ├── create_alert.rs
│   │   ├── base.rs
│   │   └── ...             # More API modules
│   └── types/              # Shared data types
│       └── mod.rs
├── config/                 # YAML configuration files
│   ├── units.yml
│   ├── alerts.yml
│   └── upgrades.yml
├── www/                    # Web frontend (Vanilla JS + Pixi.js)
│   ├── index.js            # Centralized exports
│   ├── core/               # Core engine modules
│   │   ├── GameEngine.js
│   │   ├── StateContainer.js
│   │   ├── EntityRepository.js
│   │   └── GameCleanup.js
│   ├── systems/            # Game systems
│   │   ├── RendererSystem.js
│   │   ├── InputSystem.js
│   │   ├── SelectionSystem.js
│   │   ├── GameStateSystem.js
│   │   └── EntitySpawnSystem.js
│   ├── utils/              # Utility functions
│   │   ├── entity-utils.js
│   │   ├── cleanup.js
│   │   ├── math.js
│   │   └── coordinate-transformer.js
│   ├── services/           # Service modules
│   │   └── SelectionIndicator.js
│   ├── config/             # Frontend configuration
│   │   └── game-config.js
│   ├── pkg/                # Compiled WASM output
│   └── *.test.js           # Jest test files
├── examples/               # Rust examples
│   └── selection_rules.rs
├── docs/                   # Documentation
│   ├── concept.md
│   ├── game-design.md
│   ├── technical-spec.md
│   └── ...                 # Other docs
├── memory-bank/            # Cursor/agent memory files
│   ├── projectbrief.md
│   ├── productContext.md
│   ├── systemPatterns.md
│   ├── techContext.md
│   ├── activeContext.md
│   └── progress.md
├── AGENTS.md               # This file
├── Cargo.toml              # Rust project configuration
├── package.json            # Node.js package configuration
└── demo.sh                 # Development demo script
```

## Game Components

### ECS Component Types
- **Position** (f32 x, y): Entity location
- **Health** (current, maximum): Entity HP tracking
- **Movement** (target, speed, path): Entity movement data
- **Vehicle** (type, devices): Vehicle-specific data with modifiable devices
- **Fraction**: Entity allegiance (Player, Hostile, Wild, Neutral)
- **Alert** (state: Hidden/Revealed/Active/Completed): Event states
- **Base** (floors, capacity): Base building with specialized floors
- **Crew**: Cat crew members with health and fatigue
- **Damage** (type, resistance): Damage types and resistances
- **Selection**: Selection state and group membership

### Component Patterns
- **Pure data only**: Components hold data, systems handle logic
- **Composition over inheritance**: Complex entities composed from multiple components
- **Data locality**: Systems iterate over specific component queries

## API Functions

### WebAssembly Exports (src/lib.rs)
- `get_entities_data() -> Result<String, JsValue>`: Get current entity state as JSON
- `create_vehicle(type: &str, x: f32, y: f32)`: Create vehicle entity
- `update(dt: f32)`: Main game loop update
- `select_entity(entity_id: u32)`: Select entity
- `deselect_entity(entity_id: u32)`: Deselect entity
- `clear_selection()`: Clear all selections
- `set_group_target(x: f32, y: f32)`: Set movement target for selected group
- `handle_entity_selection(x: f32, y: f32)`: Handle click selection
- `create_base(x: f32, y: f32)`: Create player base
- `build_floor(floor_type: &str)`: Build floor on base
- `get_entity_info(entity_id: u32) -> String`: Get entity details
- `create_random_alert()`: Spawn random alert
- `init() -> String`: Initialize game world

### Component API Helper Functions
- **EntityRepository**: `get()`, `set()`, `delete()`, `has()`
- **StateContainer**: `get()`, `setState()`, `merge()`, `subscribe()`, `emit()`
- **entity-utils**: `createEntityData()`, `findPlayerBase()`, `isPlayerBaseSelected()`, `getEntitiesByType()`, `getEntitiesByFraction()`, `entityExists()`, `canMove()`, `isPlayerUnit()`

## Game Loop Order

Systems run in specific order (see `src/game/world.rs:24-55`):
1. **Combat** (first): Handle deaths immediately
2. **Alert**: Spawn alerts every 15s, update alert states
3. **Movement**: Move entities toward targets
4. **Selection**: Cleanup dead entities from selection
5. **Base**: Build floors, repair units

## Frontend Architecture

### Core Modules (www/core/)
- **GameEngine.js**: Central coordinator managing system lifecycle
- **StateContainer.js**: Immutable state with versioning and event emission
- **EntityRepository.js**: Entity storage and lookup
- **GameCleanup.js**: Resource cleanup management

### Systems (www/systems/)
- **RendererSystem.js**: Pixi.js rendering
- **InputSystem.js**: Mouse/touch input handling
- **SelectionSystem.js**: Unit selection logic
- **GameStateSystem.js**: Game state management using GameApi (auto-binds to WASM)
- **EntitySpawnSystem.js**: Entity creation and management

### Utilities (www/utils/)
- **entity-utils.js**: Pure functions for entity operations
- **cleanup.js**: Disposable pattern, TimerManager, EventManager, GraphicsCleanup
- **math.js**: Distance calculations, clamping, interpolation
- **coordinate-transformer.js**: Coordinate transformation

### Configuration
- **game-config.js**: Centralized game settings, colors, limits, distances
- **api/GameApi.js**: Game API abstraction with auto-bound WASM functions

## Testing Approach

### Backend Testing
- **Unit tests**: Individual components and systems with Rust's testing framework
- **Integration tests**: Full API function testing
- **Example tests**: `examples/selection_rules.rs` validates selection logic
- **Run**: `cargo test`

### Frontend Testing
- **Test Framework**: Jest with jsdom environment
- **Setup**: jest.setup.js, www/jest.setup.js
- **Run**: `npm test`
- **Watch**: `npm run test:watch`
- **Coverage**: `npm run test:coverage`
- **Manual testing**: Web interface through demo server

## Important Patterns and Conventions

### Rust/ECS Implementation
- **ECS Framework**: hecs for entity management with query-based system iteration
- **Component Design**: Pure data containers only - systems handle all logic
- **Update Order**: Combat → Alert → Movement → Selection cleanup → Base (critical for correctness)
- **State Management**: `GameWorld` struct contains World, time, debug_messages, removed_entities
- **Serialization**: serde for Rust types, serde_wasm_bindgen for WASM boundary
- **Component Module Structure**: `src/game/components/mod.rs` re-exports all components
- **System Module Structure**: `src/game/systems/mod.rs` re-exports all systems

### JavaScript State Management
- **StateContainer**: Immutable state with versioning and event emission
- **GameApi**: Auto-binds to WASM functions, no manual initialization needed
- **Event-driven**: Systems subscribe to state changes via `subscribe()`
- **EntityRepository**: Map-based entity storage with `get()`, `set()`, `delete()`
- **Cleanup Patterns**: `createDisposable()`, `TimerManager`, `EventManager`, `GraphicsCleanup`
- **Separation**: Game logic (Rust) vs rendering/input (JavaScript)

### Configuration Files
- **Rust**: `config/` directory with YAML files (units.yml, alerts.yml, upgrades.yml)
- **JavaScript**: `www/config/game-config.js` with GAME_CONFIG object
- **YAML Schema**: VehicleConfig, DeviceConfig, CrewMemberConfig in `src/config/mod.rs`
- **Runtime Loading**: serde_yaml for config loading at startup

## Gotchas and Non-Obvious Patterns

### Rust/ECS Gotchas
1. **Update Order Matters**: Combat runs FIRST to handle deaths before movement. Dead units must be filtered before display.
2. **Dead Unit Bug**: Dead units were showing in UI - fix requires health checks in `get_entities_data()` and `get_entity_info()` API functions
3. **Selection Cleanup**: `removed_entities` in `GameWorld` tracks dead units removed from selection each update
4. **Component Naming**: Components use Rust types, not enums - Vehicle is a component, not an enum
5. **Health Tracking**: Dead entities should not be displayed - API must filter by health > 0

### JavaScript Gotchas
6. **Entity Data Format**: Rust Position serializes as `{x, y}` or `[x, y]` - handle both in JavaScript
7. **State Immutability**: StateContainer creates new state objects - don't mutate directly
8. **Entity Type Detection**: Alerts have subtype with underscore (e.g., "alert_hostile") for detection
9. **Selection Rules**: See `units_moving_rules.md` for exact selection behavior:
   - Exclusive selection (only player units)
   - Group selection filters only movable units
   - Click enemy while selecting = assign target (no reset)
   - Click immobile unit = reset and select new
10. **Cleanup Required**: Pixi.js graphics must be destroyed to prevent memory leaks
11. **Timer/Event Management**: Use TimerManager and EventManager for automatic cleanup
12. **GameApi Auto-Bind**: GameApi automatically binds to WASM functions - no manual initialization needed. Remove `initWasm()` calls from code.
13. **WASM Function Imports**: WASM functions are now imported directly in `api/GameApi.js` - no need to wrap them in `wasm-imports.js`

### Configuration Gotchas
14. **YAML Validation**: No runtime validation - invalid YAML causes parse errors
15. **Device Conflicts**: Some devices can't be combined - documented in config
16. **Slot Blocking**: Helmets block glasses/headphones, armor blocks sleeves/gloves

## Commands Reference

### Build Commands
```bash
# Build development version (wasm-pack with dev profile)
npm run build

# Build release version (optimized)
npm run build-release

# Clean WASM artifacts
npm run clean

# Clean Rust artifacts
cargo clean

# Run Rust tests
cargo test
```

### Development Commands
```bash
# Build and start dev server
npm run dev

# Run Jest tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage

# Build for production
npm run build-release
```

## Memory Bank Files

The project uses Cursor's Memory Bank system (see `.cursor/rules/memory-bank.mdc`):

### Core Files (Required)
1. **projectbrief.md**: Foundation document defining core requirements and goals
2. **productContext.md**: Why this project exists, problems solved, UX goals
3. **activeContext.md**: Current work focus, recent changes, next steps
4. **systemPatterns.md**: Architecture, key decisions, design patterns
5. **techContext.md**: Technologies, setup, constraints, dependencies
6. **progress.md**: What works, what's left, current status, known issues

### Updating Memory Bank
When asked to **update memory bank**, review ALL files and document:
- Current state of work
- Recent decisions and changes
- Next steps and active considerations

### Current Status (from memory-bank)
- **ECS Foundation**: Complete with hecs framework
- **Implemented Systems**: Movement, Combat, Alert, Base Building, Selection
- **Partial Systems**: Resource, Research, Crew, Equipment
- **Not Started**: Time Rewind (core mechanic), Multi-base Management

## Deployment

The game runs in web browsers as a WebAssembly application:
1. **Build**: `npm run build` or `npm run build-release`
2. **Serve**: Use `npm run dev` or `./demo.sh`
3. **Demo controls**: Initialize Game → Spawn Vehicle → Watch movement

## CI/CD

No formal CI/CD pipeline documented, but build scripts are provided for local development and testing.

## Additional Context

### Current Development Focus
- **Phase**: Core system implementation complete, advanced features in progress
- **Active Development**: Research system, crew management, equipment system
- **Key Blockers**: Time rewind implementation, multi-base management

### Technical Debt
- **Game Loop Integration**: Systems need connection to update() API function
- **State Serialization**: Current JSON output needs real game state
- **Entity Creation**: create_vehicle() returns success but needs entity spawning
- **Configuration Validation**: No runtime validation of YAML files

### Project Goals (from TODO.md)
- ✅ **Completed**: ECS setup, basic components, WASM API, game loop integration
- **In Progress**: Movement, combat, alert, base building, selection systems
- **Pending**: Resource system, research system, crew system, equipment system
- **Future**: Time rewind, multiple bases, fog of war, pathfinding

### Important Documentation Files
- **`docs/game-design.md`**: Comprehensive game mechanics documentation
- **`docs/technical-spec.md`**: Technical architecture overview
- **`units_moving_rules.md`**: Selection behavior specifications (Russian)
- **`TODO.md`**: Development roadmap and task tracking
