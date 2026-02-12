# Frontend Architecture Refactor - Nation of Last Land

## Summary

JS Frontend рефакторинг без изменения Rust кода. Создана новая система модулей с better separation of concerns.

## New Architecture Structure

```
www/
├── core/                           # Core modules
│   ├── StateContainer.js          # Immutable state container
│   ├── GameEngine.js              # Central coordinator (update/render loop)
│   ├── EntityRepository.js        # Centralized entity access
│   └── GameCleanup.js             # Cleanup utilities
├── systems/                        # Game systems
│   ├── RendererSystem.js          # Entity rendering
│   ├── InputSystem.js             # Input handling (mouse, keyboard)
│   ├── SelectionSystem.js         # Entity selection & groups
│   ├── GameStateSystem.js         # WASM state management
│   └── EntitySpawnSystem.js       # Entity spawn/deletion queue
├── services/                       # Service modules
│   └── SelectionIndicator.js      # Visual indicators
├── utils/
│   ├── math.js                    # Math utilities
│   ├── cleanup.js                 # Cleanup utilities
│   ├── coordinate-transformer.js  # Coordinate conversion
│   └── entity-utils.js            # Entity operation utilities
├── config/
│   └── game-config.js             # Centralized config
├── index.js                        # Centralized exports
└── wasm-imports.js                 # WASM function exports
```

## Files Status

**Old files that were REMOVED:**
- `game-demo.js`
- `core-state-manager.js`
- `game-state-manager.js`
- `selection-manager.js`
- `entity-renderer.js`
- `input-handler.js`

All old duplicate files have been removed. The architecture is now clean with new modular systems.

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

| Старый файл | Новый модуль | Примечание |
|-------------|--------------|------------|
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

1. Тестирование новой системы
2. Добавить TypeScript для type safety
3. Настроить процесс сборки (Vite/webpack)
4. Интегрировать GameCleanup в архитектуру