# Nation of Last Land - WebAssembly Demo

This is a simple demonstration of WebAssembly functionality using Rust and Pixi.js for rendering.

## Features

- **WebAssembly Backend**: Game logic runs in Rust compiled to WebAssembly
- **Real-time Rendering**: Pixi.js renders entities in real-time
- **Entity Management**: ECS-based entity system with position tracking
- **Interactive Demo**: Spawn vehicles and watch them move in circular patterns
- **Memory Management**: Proper cleanup mechanism for Web resources

## How to Run

### Option 1: Using npm scripts
\`\`\`bash
# Install dependencies (if needed)
npm install

# Build and serve the demo
npm run dev
\`\`\`

### Option 2: Manual build and serve
\`\`\`bash
# Build WebAssembly
wasm-pack build --target web --out-dir www/pkg --dev

# Serve the demo
npx serve www -l 3000
\`\`\`

Then open http://localhost:3000 in your browser.

## Demo Controls

1. **Initialize Game**: Click "Initialize Game" to set up the ECS world
2. **Spawn Vehicles**: Select a vehicle type and position, then click "Spawn Vehicle"
3. **Watch Animation**: Vehicles will automatically move in circular patterns around the center
4. **Update Game**: Manually trigger game updates (normally happens automatically)
5. **Cleanup & Reset**: Click "Cleanup & Reset" to destroy the game and all resources

## Architecture

### New System-Based Architecture

- **GameEngine** (`core/GameEngine.js`): Central coordinator for game systems
- **StateContainer** (`core/StateContainer.js`): Immutable state management with versioning
- **RendererSystem** (`systems/RendererSystem.js`): Entity rendering and visual effects
- **InputSystem** (`systems/InputSystem.js`): Mouse and keyboard input handling
- **SelectionSystem** (`systems/SelectionSystem.js`): Entity selection and grouping
- **GameStateSystem** (`systems/GameStateSystem.js`): WASM state management
- **SelectionIndicator** (`services/SelectionIndicator.js`): Visual selection indicators

### Legacy Modules (still supported for compatibility)

- `core-state-manager.js` - Centralized game state management (legacy)
- `game-state-manager.js` - Game state and WASM integration (legacy)
- `entity-renderer.js` - Pixi.js rendering and cleanup (legacy)
- `selection-manager.js` - Entity selection and grouping (legacy)
- `input-handler.js` - Mouse and keyboard input handling (legacy)
- `coordinate-service.js` - Coordinate conversion utilities
- `entity-service.js` - Entity query and manipulation
- `selection-indicator.js` - Visual selection indicators

### Utility Modules

- `utils/cleanup.js` - Cleanup utilities (TimerManager, EventManager, GraphicsCleanup)
- `core/GameCleanup.js` - Main cleanup manager
- `utils/math.js` - Mathematical utility functions

## Files: Core game logic, entity management, movement systems
- **JavaScript/Pixi.js**: Rendering engine, user interface, WebAssembly integration
- **ECS Pattern**: Entity Component System for scalable game architecture
- **Cleanup System**: Proper resource management with timer and event cleanup

## Files

- \`index.html\` - Main HTML page with Pixi.js canvas
- \`game-demo.js\` - Main game demo application
- \`pkg/\` - Generated WebAssembly package
  - \`nation_of_last_land.js\` - JavaScript bindings
  - \`nation_of_last_land_bg.wasm\` - Compiled WebAssembly module

### Core Modules

- \`core-state-manager.js\` - Centralized game state management
- \`game-state-manager.js\` - Game state and WASM integration
- \`entity-renderer.js\` - Pixi.js rendering and cleanup
- \`selection-manager.js\` - Entity selection and grouping
- \`input-handler.js\` - Mouse and keyboard input handling
- \`coordinate-service.js\` - Coordinate conversion utilities
- \`entity-service.js\` - Entity query and manipulation
- \`selection-indicator.js\` - Visual selection indicators

### Utility Modules

- \`utils/cleanup.js\` - Cleanup utilities (TimerManager, EventManager, GraphicsCleanup)
- \`core/GameCleanup.js\` - Main cleanup manager
- \`core/Cleanupable.js\` - Base class for cleanup-capable objects

## Technical Details

- **Language**: Rust with WebAssembly compilation
- **Framework**: ECS using hecs library
- **Rendering**: Pixi.js WebGL renderer
- **Build Tool**: wasm-pack for WebAssembly packaging
- **Serialization**: JSON communication between Rust and JavaScript

## Cleanup System

The project includes a comprehensive cleanup mechanism to prevent memory leaks:

### Components

- **TimerManager**: Tracks and clears all timeouts/intervals on destroy
- **EventManager**: Removes all event listeners on destroy
- **GraphicsCleanup**: Destroys all Pixi.js graphics objects
- **Cleanupable**: Base class for objects needing cleanup
- **GameCleanup**: Main cleanup manager combining all subsystems

### Usage

Each major component has a \`destroy()\` method that:
1. Stops all timers and intervals
2. Removes event listeners
3. Destroys Pixi.js graphics and containers
4. Cleans up references to prevent memory leaks

Call \`gameDemo.destroy()\` when shutting down the game to clean up all resources.

### Example

\`\`\`javascript
import { GameDemo } from "./index.js";

const demo = new GameDemo();
await demo.initializeDemo();

// ... play game ...

// When done, cleanup all resources
demo.destroy();
\`\`\`

