# Frontend Architecture Refactor - Nation of Last Land

## Summary

JS Frontend рефакторинг без изменения Rust кода. Создана новая система модулей с better separation of concerns.

## New Architecture Structure

```
www/
├── core/                           # НОВЫЕ: Core modules
│   ├── StateContainer.js          # Immutable state container
│   ├── GameEngine.js              # Central coordinator (update/render loop)
│   └── GameCleanup.js             # Existing cleanup utilities
├── systems/                        # НОВЫЕ: Game systems
│   ├── RendererSystem.js          # Entity rendering
│   ├── InputSystem.js             # Input handling (mouse, keyboard)
│   ├── SelectionSystem.js         # Entity selection & groups
│   └── GameStateSystem.js         # WASM state management
├── services/                       # НОВЫЕ: Service modules
│   └── SelectionIndicator.js      # Visual indicators
├── utils/
│   ├── math.js                    # Math utilities (NEW)
│   └── cleanup.js                 # Existing cleanup utilities
├── config/
│   └── game-config.js             # Existing config
├── index.js                        # Updated: Centralized exports
├── game-demo.js                    # Main controller (оставлен для backward compat)
├── core-state-manager.js           # Оставлен для backward compat
├── game-state-manager.js           # Оставлен для backward compat
├── selection-manager.js            # Оставлен для backward compat
├── entity-renderer.js              # Оставлен для backward compat
├── input-handler.js                # Оставлен для backward compat
└── ... (остальные файлы)
```

## Key Improvements

### 1. Immutable State (StateContainer)
- Версионирование состояния
- Event-driven updates
- Предсказуемое изменение состояния

### 2. Game Engine
- Центральный координатор
- Update/render цикл
- Легковесные системы

### 3. System Pattern
- Каждая система отвечает за конкретную функцию
- Легко тестировать изолированно
- Повторное использование

## Migration Guide

| Old | New | Notes |
|-----|-----|-------|
| `CoreStateManager` | `StateContainer` | Immutable, versioned |
| `GameDemo` | `GameEngine` | Central coordinator |
| `GameStateManager` | `GameStateSystem` | WASM interface |
| `EntityRenderer` | `RendererSystem` | Rendering only |
| `InputHandler` | `InputSystem` | Input handling |
| `SelectionManager` | `SelectionSystem` | Selection logic |

## Usage

```javascript
import { GameEngine, RendererSystem, InputSystem, SelectionSystem, GameStateSystem } from './index.js'

const gameEngine = new GameEngine()

// Add systems
const renderer = new RendererSystem(gameEngine)
const input = new InputSystem(gameEngine)
const selection = new SelectionSystem(gameEngine)
const gameState = new GameStateSystem(gameEngine)

gameEngine.addSystem(renderer)
gameEngine.addSystem(input)
gameEngine.addSystem(selection)
gameEngine.addSystem(gameState)

// Initialize
renderer.init(app)  // Pixi app
input.init(app)

// Start game loop
gameEngine.start()

// Update
gameEngine.update(dt)
gameEngine.render()
```

## Next Steps

1. Обновить `game-demo.js` для использования новой архитектуры
2. Удалить устаревшие файлы (когда миграция завершена)
3. Тестирование новой системы