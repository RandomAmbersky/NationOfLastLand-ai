# Nation of Last Land - WebAssembly Demo

This is a demonstration of WebAssembly functionality using Rust and Pixi.js for rendering.

## Features

- **WebAssembly Backend**: Game logic runs in Rust compiled to WebAssembly
- **Real-time Rendering**: Pixi.js renders entities in real-time
- **Entity Management**: ECS-based entity system with position tracking
- **Interactive Demo**: Full selection and movement controls
- **Movement System**: Entity movement based on game commands
- **Memory Management**: Proper cleanup mechanism for Web resources

## How to Run

### Option 1: Using npm scripts
```bash
# Install dependencies (if needed)
npm install

# Build and serve the demo
npm run dev
```

### Option 2: Manual build and serve
```bash
# Build WebAssembly
wasm-pack build --target web --out-dir www/pkg --dev

# Serve the demo
npx serve www -l 3000
```

Then open http://localhost:3000 in your browser.

## Demo Controls

1. **Initialize Game**: Click "Initialize Game" to set up the ECS world
2. **Spawn Vehicles**: Use WASM commands to create vehicles
3. **Select Entities**: Left-click to select entities
4. **Move Entities**: Right-click to set a movement target
5. **Multi-Select**: Hold Shift and click to select multiple entities
6. **Rectangle Select**: Drag to select multiple entities at once
7. **Clear Selection**: Press Esc to clear all selections
8. **Watch Movement**: Selected entities will move toward their targets

## Architecture

### System-Based Architecture

- **GameEngine** (`core/GameEngine.js`): Central coordinator for game systems
- **StateContainer** (`core/StateContainer.js`): Immutable state management with versioning
- **RendererSystem** (`systems/RendererSystem.js`): Entity rendering and visual effects
- **InputSystem** (`systems/InputSystem.js`): Mouse and keyboard input handling
- **SelectionSystem** (`systems/SelectionSystem.js`): Entity selection and grouping
- **GameStateSystem** (`systems/GameStateSystem.js`): WASM state management
- **MovementSystem** (`systems/MovementSystem.js`): Entity movement processing
- **EntitySpawnSystem** (`systems/EntitySpawnSystem.js`): Entity spawn and deletion queue management

### Utility Modules

- `utils/cleanup.js` - Cleanup utilities (TimerManager, EventManager, GraphicsCleanup)
- `utils/math.js` - Mathematical utility functions
- `utils/coordinateTransformer.js` - Coordinate conversion utilities
- `utils/TransformerMixin.js` - Transformer provider for systems
- `utils/entityUtils.js` - Entity operation utilities
- `config/game-config.js` - Centralized game configuration

## Files

- `index.html` - Main HTML page with Pixi.js canvas
- `index.js` - Centralized exports for all modules
- `wasm-imports.js` - WASM function exports
- `pkg/` - Generated WebAssembly package

### Core Modules

- `core/GameEngine.js` - Central coordinator for game systems
- `core/StateContainer.js` - Immutable state management with versioning
- `core/EntityRepository.js` - Centralized entity access
- `core/GameCleanup.js` - Main cleanup manager

### System Modules

- `systems/GameStateSystem.js` - WASM state management
- `systems/RendererSystem.js` - Entity rendering and visual effects
- `systems/InputSystem.js` - Mouse and keyboard input handling
- `systems/SelectionSystem.js` - Entity selection and grouping
- `systems/MovementSystem.js` - Entity movement processing
- `systems/EntitySpawnSystem.js` - Entity spawn/deletion queue

### Service Modules

- `services/SelectionIndicator.js` - Visual selection indicators

### Utility Modules

- `utils/cleanup.js` - Cleanup utilities (TimerManager, EventManager, GraphicsCleanup)
- `utils/math.js` - Mathematical utility functions
- `utils/coordinateTransformer.js` - Coordinate conversion utilities
- `utils/TransformerMixin.js` - Transformer provider for systems
- `utils/entityUtils.js` - Entity operation utilities

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

Each major component has a `destroy()` method that:
1. Stops all timers and intervals
2. Removes event listeners
3. Destroys Pixi.js graphics and containers
4. Cleans up references to prevent memory leaks

Call `gameEngine.destroy()` when shutting down the game to clean up all resources.

### Example

```javascript
import { GameEngine, GameStateSystem, RendererSystem } from "./index.js";

const gameEngine = new GameEngine();
const gameStateSystem = new GameStateSystem(gameEngine);
const rendererSystem = new RendererSystem(gameEngine);

gameEngine.addSystem(gameStateSystem);
gameEngine.addSystem(rendererSystem);

// ... play game ...

// When done, cleanup all resources
gameEngine.destroy();
```
