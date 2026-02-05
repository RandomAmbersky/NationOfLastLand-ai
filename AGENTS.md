# AGENTS.md

This document provides essential information for agents working in this codebase. It covers project structure, key technologies, build processes, testing, and important patterns.

## Project Overview

This is a strategy RTS game called "Nation of Last Land" with a unique time rewind mechanic in a post-apocalyptic world. The game features anthropomorphic cats as crew members, modular vehicle equipment system, and base building mechanics.

## Technology Stack

### Backend (Rust)
- **Language**: Rust 2021
- **ECS Framework**: hecs (Entity Component System)
- **Serialization**: serde + YAML for configuration
- **WebAssembly Target**: wasm-bindgen for web integration
- **Random Generation**: rand crate

### Frontend (JavaScript/TypeScript)
- **Web Framework**: Vanilla JavaScript with Pixi.js for rendering
- **Build System**: wasm-pack for WebAssembly compilation
- **Development Server**: Node.js with serve package

## Project Structure

```
.
├── src/                    # Rust backend code
│   ├── lib.rs              # Main library entry point
│   ├── game/               # Game logic (ECS components and systems)
│   │   ├── mod.rs
│   │   ├── world.rs        # Game world management
│   │   ├── components/     # ECS components
│   │   └── systems/        # ECS systems
│   ├── api/                # WebAssembly API functions
│   ├── config/             # Configuration loading
│   └── types/              # Shared data types
├── www/                    # Web frontend
│   ├── core-state-manager.js # Centralized game state management
│   ├── entity-renderer.js    # Rendering logic
│   ├── game-state-manager.js # Game state management
│   └── *.js                  # Other frontend JavaScript files
├── Cargo.toml              # Rust project configuration
├── package.json            # Node.js package configuration
└── demo.sh                 # Development demo script
```

## Key Components

### ECS Architecture
The game uses the hecs ECS framework for managing game entities:

- **Components**: Data containers for entity properties (Position, Vehicle, Combat, etc.)
- **Systems**: Logic that operates on components
- **World**: Container holding all entities and their components

Key systems implemented:
- Movement System: Entity movement with pathfinding
- Combat System: Damage calculation and entity death
- Alert System: Random event generation
- Selection System: Unit selection and grouping
- Base System: Base building and floor operations

### Game Components
- `Vehicle`: Vehicle type, devices, and equipment
- `Position`: Entity coordinates
- `Movement`: Speed and movement behavior
- `Combat`: Health, damage, and attack logic
- `Selection`: Selection state and group management
- `Base`: Base building and floor operations

### API Functions
WebAssembly functions exposed to JavaScript:
- `initialize_game()`: Initialize game world
- `spawn_vehicle()`: Create new vehicle entity
- `update_game()`: Main game loop update
- `get_entities_data()`: Get current entity information

## Build and Development Process

### Backend Build
```bash
# Build for development
wasm-pack build --target web --out-dir www/pkg --dev

# Build for release
wasm-pack build --target web --out-dir www/pkg --release

# Run tests (if any)
cargo test
```

### Frontend Development
```bash
# Install dependencies
npm install

# Build and run demo server
npm run dev

# Build for production
npm run build-release
```

### Development Demo
```bash
# Run the demo script
./demo.sh
```

## Testing Approach

### Backend Testing
- Unit tests for individual components and systems
- Integration tests for system interactions
- Testing of the ECS world update cycle

### Frontend Testing
- Manual testing through the demo interface
- Visual verification of game mechanics

## Important Patterns and Conventions

### ECS Implementation
- All game objects are entities in the ECS world
- Components hold data only, systems handle logic
- Systems run in a specific order (Combat first, then Movement, etc.)
- Components are kept simple and focused

### Game State Management
- Game world state is centralized in `GameWorld` struct
- Time-based updates with delta time handling
- Debug messages collected for diagnostics
- Entity removal tracking for selection cleanup

### JavaScript State Management
- `CoreStateManager` provides centralized state for frontend
- Event-driven architecture for state updates
- Immutable state patterns where appropriate
- Clear separation between game logic and rendering

### Configuration
- YAML-based configuration files for game balance
- Configuration loaded at startup
- Unit definitions in `config/units.yml`

## Gotchas and Non-Obvious Patterns

1. **Time Rewind Mechanics**: The game has a time rewind feature (not fully implemented yet) that resets the world state upon avatar death.

2. **Component Relationships**: Components are designed to be small and focused, with systems handling interactions between them rather than complex component methods.

3. **ECS Update Order**: Combat systems run before movement systems to handle deaths immediately, ensuring correct behavior.

4. **Selection Management**: Selection cleanup system removes entities from selection when they die, tracked via `removed_entities`.

5. **WebAssembly Integration**: The Rust backend exposes functions through wasm-bindgen for JavaScript interaction.

6. **Module System**: The vehicle equipment system is implemented with `DeviceType` enums that can be added to vehicles dynamically.

7. **Frontend State Management**: The `CoreStateManager` centralizes all game state and provides event emission for reactive updates.

8. **Configuration Loading**: Game balance is managed through YAML configuration files.

## Commands Reference

### Build Commands
```bash
# Build development version
npm run build

# Build release version
npm run build-release

# Clean build artifacts
npm run clean
```

### Development Commands
```bash
# Start development server with auto-rebuild
npm run dev

# Run Rust tests
cargo test

# Build documentation (if available)
cargo doc
```

## Deployment

The game is intended to run in a web browser as a WebAssembly application. The frontend is built using the wasm-pack toolchain, and the demo server provides a simple way to test the game.

## CI/CD

The project doesn't appear to have a defined CI/CD pipeline documented in the repository, but build scripts are provided for local development and testing.

## Additional Context

The project has a strong focus on game mechanics and does not appear to use advanced game engine features like physics or audio systems. It emphasizes the ECS architecture for game logic and has a modular approach to vehicle equipment and base building mechanics.