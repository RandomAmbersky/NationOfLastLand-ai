# Advanced Code Improvements - Priority List

## 🔴 High Priority (Critical Issues)

### 1. Event Listener Cleanup
**File**: `www/systems/InputSystem.js:54-65`
**Problem**: Event listeners never removed on destroy()

```javascript
// Add cleanup to destroy()
destroy() {
  if (this.isDestroyed) return
  this.isDestroyed = true
  
  // Remove event listeners
  if (this.app) {
    const canvas = this.app.view
    canvas.removeEventListener('mousedown', this.handleMouseDown)
    canvas.removeEventListener('mousemove', this.handleMouseMove)
    canvas.removeEventListener('mouseup', this.handleMouseUp)
    canvas.removeEventListener('mouseleave', this.handleMouseLeave)
    canvas.removeEventListener('click', this.handleCanvasClick)
    canvas.removeEventListener('dblclick', this.handleDoubleClick)
    canvas.removeEventListener('contextmenu', this.handleContextMenu) // Need to store handler
    document.removeEventListener('keydown', this.handleKeyDown)
  }
  
  // ... rest of cleanup
}
```

**Also**: Need to store bound handlers in constructor:
```javascript
constructor() {
  this.handleMouseDown = this.handleMouseDown.bind(this)
  this.handleMouseMove = this.handleMouseMove.bind(this)
  // ... etc
}
```

---

### 2. StateContainer Subscription Cleanup
**File**: `www/systems/GameStateSystem.js:57-75`
**Problem**: Subscriptions created but never unsubscribed

```javascript
// Store unsubscribe functions
this._unsubscribeHandlers = []

init() {
  this._unsubscribeHandlers.push(
    this.gameEngine.state.subscribe('entitySpawned', this.handleEntitySpawned)
  )
  // ... other subscriptions
}

destroy() {
  // Unsubscribe all
  this._unsubscribeHandlers.forEach(unsubscribe => unsubscribe())
  this._unsubscribeHandlers = []
  
  // ... rest of cleanup
}
```

---

### 3. Transformer Deduplication
**Problem**: Same 12-line logic duplicated in 5+ files

**Solution**: Create a mixin or base class pattern

```javascript
// www/utils/TransformerMixin.js
export function withTransformer(BaseClass) {
  return class extends BaseClass {
    transformer = null
    
    setTransformer(transformer) {
      this.transformer = transformer
    }
    
    _getTransformer() {
      if (this.transformer) return this.transformer
      
      // Fallback chain
      if (this.gameEngine?.transformer) return this.gameEngine.transformer
      if (this.rendererSystem?.transformer) return this.rendererSystem.transformer
      if (this.app) {
        const { createCoordinateTransformer } = require('../utils/coordinate-transformer.js')
        return this.transformer = createCoordinateTransformer(this.app)
      }
      
      return null
    }
  }
}

// Usage:
export class RendererSystem extends withTransformer(class {}) {
  // ... no transformer initialization needed
}
```

---

## 🟡 Medium Priority

### 4. Centralized Entity Lookup
**Files**: `InputSystem.js:344`, `SelectionSystem.js:326`

**Problem**: Duplicate entity lookup logic with different implementations

**Solution**: Create a method in `EntityRepository`:

```javascript
// www/core/EntityRepository.js
findEntityAtScreenCoords(screenX, screenY) {
  const entities = this.getEntities()
  if (!(entities instanceof Map)) return null
  
  const transformer = this.gameEngine?.transformer
  if (!transformer) return null
  
  const { gameX, gameY } = transformer.screenToGame(screenX, screenY)
  const hitRadius = GAME_CONFIG.LIMITS.entityHitRadius || 15
  
  for (const [id, entity] of entities) {
    const entityGameX = entity.gameX ?? entity.position?.x ?? 0
    const entityGameY = entity.gameY ?? entity.position?.y ?? 0
    
    if (Math.abs(gameX - entityGameX) <= hitRadius &&
        Math.abs(gameY - entityGameY) <= hitRadius) {
      return { id, entity }
    }
  }
  return null
}
```

---

### 5. Use Configuration for Grid
**File**: `www/systems/RendererSystem.js:265-267`

**Current**:
```javascript
gridGraphics.lineStyle(1, 0x444444, 0.5)
const gridSize = 50
```

**Should be**:
```javascript
const gridConfig = GAME_CONFIG.GRID
gridGraphics.lineStyle(1, gridConfig.color, gridConfig.alpha)
const gridSize = gridConfig.spacing
```

**Also fix**: Lines 234, 256-278, 282

---

### 6. Optimize Entity Lookup Performance
**Problem**: O(n) linear scan for every click

**Solutions**:

**Option A - Spatial Grid**:
```javascript
class SpatialGrid {
  constructor(cellSize = 50) {
    this.cellSize = cellSize
    this.cells = new Map()
  }
  
  add(entity) {
    const key = this._getCellKey(entity.gameX, entity.gameY)
    if (!this.cells.has(key)) this.cells.set(key, [])
    this.cells.get(key).push(entity)
  }
  
  remove(entity) {
    const key = this._getCellKey(entity.gameX, entity.gameY)
    const cell = this.cells.get(key)
    if (cell) {
      const idx = cell.indexOf(entity)
      if (idx > -1) cell.splice(idx, 1)
    }
  }
  
  query(gameX, gameY, radius) {
    const key = this._getCellKey(gameX, gameY)
    const cell = this.cells.get(key) || []
    // Filter within radius
    return cell.filter(e => {
      const dx = e.gameX - gameX
      const dy = e.gameY - gameY
      return dx*dx + dy*dy <= radius*radius
    })
  }
  
  _getCellKey(x, y) {
    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    return `${cx},${cy}`
  }
}
```

**Option B - QuadTree** (better for sparse areas)

---

### 7. Memoize Coordinate Transformations
**File**: `www/utils/coordinate-transformer.js`

```javascript
class CoordinateTransformer {
  constructor(app) {
    this.app = app
    this._scaleCache = null
    this._transformCache = new Map() // NEW
  }
  
  gameToScreen(gameX, gameY) {
    const key = `${gameX},${gameY}`
    if (this._transformCache.has(key)) {
      return this._transformCache.get(key)
    }
    
    const result = super.gameToScreen(gameX, gameY)
    this._transformCache.set(key, result)
    return result
  }
  
  clearCache() {
    this._transformCache.clear()
  }
}
```

---

## 🟢 Low Priority (Polish)

### 8. Add JSDoc Type Annotations
**Example**:
```javascript
/**
 * Get entity by ID
 * @param {number} id - Entity identifier
 * @returns {Object|null} Entity object or null
 */
getEntity(id) {
  return this.entityRepository.getById(id)
}
```

---

### 9. Remove Debug Console Statements
**File**: `www/systems/SelectionSystem.js:58,63,66,67`

```javascript
// Replace with conditional logging
if (process.env.NODE_ENV === 'development') {
  console.log('SelectionSystem.handleEntityClicked:', data)
}
```

Or create a logger utility.

---

### 10. Add Input Validation
**Example**:
```javascript
/**
 * Add entity to container
 * @param {Object} entity - Entity object
 * @param {PIXI.Container} container - Parent container
 */
addEntityToContainer(entity, container) {
  if (!entity || !container) return
  if (!entity.container) return
  if (!container || !container.addChild) return
  
  container.addChild(entity.container)
}
```

---

### 11. Add Resize Handling
**File**: `www/utils/coordinate-transformer.js`

```javascript
class CoordinateTransformer {
  constructor(app) {
    this.app = app
    this._scaleCache = null
    this._resizeHandler = this._resizeHandler.bind(this)
    window.addEventListener('resize', this._resizeHandler)
  }
  
  _resizeHandler() {
    this.invalidateScaleCache()
  }
  
  destroy() {
    window.removeEventListener('resize', this._resizeHandler)
  }
}
```

---

### 12. Normalize Null/Undefined Handling
**Current**:
```javascript
const hitRadius = GAME_CONFIG.LIMITS.entityHitRadius || 15
```

**Better**:
```javascript
const hitRadius = GAME_CONFIG.LIMITS.entityHitRadius ?? 15
```

Using `??` (nullish coalescing) instead of `||` to allow `0` values.

---

## Implementation Order

1. **Week 1**: Fix memory leaks (Issues #1, #2)
2. **Week 2**: Deduplicate transformer logic (Issue #3)
3. **Week 3**: Centralize entity lookup (Issue #4)
4. **Week 4**: Use config for grid (Issue #5)
5. **Week 5**: Optimize performance (Issues #6, #7)
6. **Week 6**: Polish (Issues #8-12)

## Estimated Effort

- Critical fixes: 2-3 days
- Medium priority: 1 week
- Low priority: 1 week

Total: ~3 weeks for full improvements
