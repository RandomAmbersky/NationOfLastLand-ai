# RendererSystem Resize Handler Fix

## Problem
The `RendererSystem` class caches screen scale factors for performance but does not update them when the window is resized. This causes rendering issues after resizing the browser window.

## Solution
Add window resize event listener that:
1. Invalidates the scale cache (`_cachedScale = null`)
2. Updates the grid (`updateGrid()`)

## Implementation

Add these changes to `www/systems/RendererSystem.js`:

1. Add `_resizeHandler` field to constructor
2. Add `_setupResizeHandler()` method that:
   - Removes existing handler (if any)
   - Creates new handler that invalidates cache and updates grid
   - Adds listener to `window.addEventListener('resize', ...)`
3. Call `_setupResizeHandler()` in `init()`
4. Add `_destroyResizeHandler()` method that removes the event listener
5. Call `_destroyResizeHandler()` in `destroy()`

## Code

```javascript
// In constructor
this._resizeHandler = null

// New method
_setupResizeHandler () {
  if (!this.app) return
  if (this._resizeHandler) {
    window.removeEventListener('resize', this._resizeHandler)
  }
  this._resizeHandler = () => {
    this.invalidateScaleCache()
    this.updateGrid()
  }
  window.addEventListener('resize', this._resizeHandler)
}

// In init()
this._setupResizeHandler()

// New method
_destroyResizeHandler () {
  if (this._resizeHandler) {
    window.removeEventListener('resize', this._resizeHandler)
    this._resizeHandler = null
  }
}

// In destroy()
this._destroyResizeHandler()
```
