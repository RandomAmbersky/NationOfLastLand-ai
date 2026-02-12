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
2. **Spawn Vehicles**: Select a vehicle type and position, then click "Spawn Vehicle"
3. **Watch Animation**: Vehicles will automatically move in circular patterns around the center
4. **Update Game**: Manually trigger game updates (normally happens automatically)
5. **Cleanup & Reset**: Click "Cleanup & Reset" to destroy the game and all resources

## Architecture

### System-Based Architecture

- **GameEngine** (`core/GameEngine.js`): Central coordinator for game systems
- **StateContainer** (`core/StateContainer.js`): Immutable state management with versioning
- **RendererSystem** (`systems/RendererSystem.js`): Entity rendering and visual effects
- **InputSystem** (`systems/InputSystem.js`): Mouse and keyboard input handling
- **SelectionSystem** (`systems/SelectionSystem.js`): Entity selection and grouping
- **GameStateSystem** (`systems/GameStateSystem.js`): WASM state management
- **SelectionIndicator** (`services/SelectionIndicator.js`): Visual selection indicators

### Utility Modules

- `utils/cleanup.js` - Cleanup utilities (TimerManager, EventManager, GraphicsCleanup)
- `utils/math.js` - Mathematical utility functions
- `utils/coordinate-transformer.js` - Coordinate conversion utilities
- `config/game-config.js` - Centralized game configuration

## Files

- `index.html` - Main HTML page with Pixi.js canvas
- `index.js` - Centralized exports for all modules
- `game-engine.js` - Main game demo application (GameDemo)
- `pkg/` - Generated WebAssembly package

### Core Modules

- `core/GameEngine.js` - Central coordinator for game systems
- `core/StateContainer.js` - Immutable state management with versioning
- `core/GameCleanup.js` - Main cleanup manager

### System Modules

- `systems/GameStateSystem.js` - WASM state management
- `systems/RendererSystem.js` - Entity rendering and visual effects
- `systems/InputSystem.js` - Mouse and keyboard input handling
- `systems/SelectionSystem.js` - Entity selection and grouping

### Service Modules

- `services/SelectionIndicator.js` - Visual selection indicators

### Utility Modules

- `utils/cleanup.js` - Cleanup utilities (TimerManager, EventManager, GraphicsCleanup)
- `utils/math.js` - Mathematical utility functions
- `utils/coordinate-transformer.js` - Coordinate conversion utilities

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

Call `gameDemo.destroy()` when shutting down the game to clean up all resources.

### Example

```javascript
import { GameDemo } from "./index.js";

const demo = new GameDemo();
await demo.initializeDemo();

// ... play game ...

// When done, cleanup all resources
demo.destroy();
```
