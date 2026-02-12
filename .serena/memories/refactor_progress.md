# Frontend Architecture Refactor - Progress

## Completed Steps

### Created Files

**Core Module (`www/core/`):**
- `StateContainer.js` - Immutable state container with versioning and event subscriptions
- `GameEngine.js` - Central coordinator for game systems with update/render loop

**Systems Module (`www/systems/`):**
- `RendererSystem.js` - Handles entity rendering and visual effects
- `InputSystem.js` - Handles user input (mouse, keyboard)
- `SelectionSystem.js` - Handles entity selection and group management
- `GameStateSystem.js` - Handles game state management and WASM communication

**Services Module (`www/services/`):**
- `SelectionIndicator.js` - Manages visual selection indicators

**Utils Module (`www/utils/`):**
- `math.js` - Mathematical utility functions

**Updated Files:**
- `www/index.js` - Centralized exports including new modules

## Architecture Overview

```
www/
├── core/
│   ├── StateContainer.js     # Immutable state with versioning
│   ├── GameEngine.js         # Central coordinator (update/render loop)
│   └── GameCleanup.js        # Existing cleanup utilities
├── systems/
│   ├── RendererSystem.js     # Entity rendering
│   ├── InputSystem.js        # Input handling
│   ├── SelectionSystem.js    # Entity selection
│   └── GameStateSystem.js    # WASM state management
├── services/
│   └── SelectionIndicator.js # Visual indicators
├── utils/
│   ├── math.js               # Math utilities
│   └── cleanup.js            # Existing cleanup utilities
├── config/
│   └── game-config.js        # Existing config
├── index.js                  # Centralized exports
└── game-demo.js              # Main controller (simplified)
```

## Key Principles

1. **Immutable State** - StateContainer не мутирует, возвращает новые состояния
2. **System Separation** - Каждая система отвечает за конкретную функцию
3. **Event-Driven** - Системы общаются через события на GameEngine
4. **Cleanup Pattern** - Все компоненты поддерживают destroy()

## New System Interface

```javascript
class System {
  constructor(gameEngine) { this.gameEngine = gameEngine }
  init(app) {}            // Initialize with Pixi app
  update(dt) {}           // Logic update
  render() {}             // Render update
  destroy() {}            // Cleanup
}
```

## StateContainer API

```javascript
new StateContainer(initialState)
  .getState()           // Get deep copy of state
  .get(key)             // Get specific value
  .setState(updater)    // Immutable update
  .merge(partial)       // Shallow merge
  .subscribe(event, handler)
  .emit(event, data)
  .getVersion()         // Get version number
```

## GameEngine API

```javascript
new GameEngine()
  .addSystem(system)
  .removeSystem(system)
  .start()
  .stop()
  .update(dt)
  .render()
  .destroy()
```

## Migration Notes

Old → New:
- `GameDemo` → `GameEngine` + `GameStateSystem`
- `CoreStateManager` → `StateContainer` (immutable)
- `EntityRenderer` → `RendererSystem`
- `InputHandler` → `InputSystem`
- `SelectionManager` → `SelectionSystem`

## Next Steps

1. Тестирование новой системы
2. Добавить TypeScript для type safety
3. Настроить процесс сборки (Vite/webpack)
4. Интегрировать GameCleanup в архитектуру

- Test the new system integration
- Add TypeScript for type safety
- Set up build process (Vite/webpack)
- Integrate GameCleanup into architecture