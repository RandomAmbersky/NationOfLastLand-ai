# Nation of Last Land - WebAssembly Demo

This is a simple demonstration of WebAssembly functionality using Rust and Pixi.js for rendering.

## Features

- **WebAssembly Backend**: Game logic runs in Rust compiled to WebAssembly
- **Real-time Rendering**: Pixi.js renders entities in real-time
- **Entity Management**: ECS-based entity system with position tracking
- **Interactive Demo**: Spawn vehicles and watch them move in circular patterns

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

## Architecture

- **Rust/WebAssembly**: Core game logic, entity management, movement systems
- **JavaScript/Pixi.js**: Rendering engine, user interface, WebAssembly integration
- **ECS Pattern**: Entity Component System for scalable game architecture

## Files

- `index.html` - Main HTML page with Pixi.js canvas
- `app.js` - JavaScript application logic and WebAssembly integration
- `pkg/` - Generated WebAssembly package
  - `nation_of_last_land.js` - JavaScript bindings
  - `nation_of_last_land_bg.wasm` - Compiled WebAssembly module

## Technical Details

- **Language**: Rust with WebAssembly compilation
- **Framework**: ECS using hecs library
- **Rendering**: Pixi.js WebGL renderer
- **Build Tool**: wasm-pack for WebAssembly packaging
- **Serialization**: JSON communication between Rust and JavaScript
