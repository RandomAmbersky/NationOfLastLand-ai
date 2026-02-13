# Refactoring Notes - February 2026

## Transformer Pattern Refactoring

### Problem
The codebase had a confusing transformer pattern with:
- `TransformerProvider` base class
- `TransformerMixin` as empty subclass
- `CoordinateTransformer` for actual coordinate logic
- Systems inheriting from `TransformerProvider` and calling `super()`
- `initTransformerFromApp()` method creating transformer internally

### Solution
Simplified transformer handling:

1. **TransformerProvider** - Kept for backward compatibility with `@deprecated` flag
2. **TransformerMixin** - Deprecated, just extends TransformerProvider
3. **Direct property assignment** - Systems now set `this.transformer = transformer` via `setTransformer()`

### Changes Made

#### www/utils/TransformerMixin.js
- Added `@deprecated` comments
- Created `withTransformer()` helper for future migration
- Kept `TransformerProvider` and `TransformerMixin` for compatibility

#### www/systems/MovementSystem.js
- Removed `import { TransformerProvider }`
- Added `this.transformer = null` in constructor
- Added `setTransformer(transformer)` and `getTransformer()` methods

#### www/systems/InputSystem.js
- Removed `import { TransformerProvider }`
- Added `this.transformer = null` in constructor
- Added `setTransformer(transformer)` and `getTransformer()` methods

#### www/services/SelectionIndicator.js
- Removed `import { TransformerProvider }`
- Added `this.transformer = null` in constructor
- Added `setTransformer(transformer)` and `getTransformer()` methods

#### www/systems/EntitySpawnSystem.js
- Removed `import { TransformerProvider }`
- Added `this.transformer = null` in constructor
- Added `setTransformer(transformer)` and `getTransformer()` methods

#### www/systems/SelectionSystem.js
- Removed `import { TransformerProvider }`
- Added `this.transformer = null` in constructor
- Added `setTransformer(transformer)` and `getTransformer()` methods

#### www/systems/RendererSystem.js
- Removed `import { TransformerProvider }`
- Added `this.transformer = null` in constructor
- Added `setTransformer(transformer)` and `getTransformer()` methods

#### www/index.js
- Removed `TransformerProvider` and `TransformerMixin` exports
- Removed them from default export object

### Benefits
- Clearer transformer flow: `GameEngine` creates transformer → passes to systems → systems use it
- No inheritance complexity
- Easier to test (can mock transformer easily)
- Follows composition over inheritance pattern

### Migration Path
Systems can now be refactored to use constructor injection:
```javascript
// Before
class MySystem extends TransformerProvider {
  constructor(gameEngine) {
    super()
    this.gameEngine = gameEngine
  }
}

// After (option 1)
class MySystem {
  constructor(gameEngine) {
    this.gameEngine = gameEngine
    this.transformer = null
  }
  setTransformer(transformer) { this.transformer = transformer }
}

// After (option 2 - future)
class MySystem {
  constructor(gameEngine, transformer) {
    this.gameEngine = gameEngine
    this.transformer = transformer
  }
}
```

---

## EntityRepository Duplication

### Problem
`EntityRepository` duplicated functions from `utils/entity-utils.js`:
- `findPlayerBase()`
- `getEntitiesByType()`
- `getEntitiesByFraction()`

### Solution
- Kept `entity-utils.js` as pure utility functions
- `EntityRepository` now imports and uses these functions
- No code duplication

### Changes Made

#### www/core/EntityRepository.js
- Added import: `import { findPlayerBase, getEntitiesByType, getEntitiesByFraction }`
- `findPlayerBase()` → calls imported function
- `getByType()` → calls imported function
- `getByFraction()` → calls imported function

---

## System Lifecycle Standardization

### Current State
- Systems use duck-typing for transformer injection
- `GameEngine.addSystem()` checks for `setTransformer()` method
- Systems manage their own `init()` if needed

### Recommendations (Future)
- Consider adding standardized `init(app, transformer)` method
- Currently handled per-system basis (e.g., `RendererSystem.init()`)

---

## Test Results
All 153 tests passing:
- ✓ www/utils.test.js
- ✓ www/systems/GameStateSystem.test.js
- ✓ www/systems/RendererSystem.test.js
- ✓ www/systems/SelectionSystem.test.js
- ✓ www/systems/InputSystem.test.js
- ✓ www/game-config.test.js
- ✓ www/entity-service.test.js
- ✓ www/systems/EntitySpawnSystem.test.js

---

## Next Steps
1. Consider removing deprecated `TransformerProvider`/`TransformerMixin` exports after migration
2. Consider implementing constructor injection for transformers
3. Extract SelectionSystem rules to strategies pattern for better testability
4. Document transformer lifecycle in README
