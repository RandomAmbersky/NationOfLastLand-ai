/**
 * Base class for cleanup-capable objects
 */
export class Cleanupable {
  constructor () {
    this._cleanupables = []
    this._isDestroyed = false
  }

  get isDestroyed () {
    return this._isDestroyed
  }

  addCleanup (resource) {
    if (this._isDestroyed) return
    if (resource && typeof resource.dispose === "function") {
      this._cleanupables.push(resource)
    } else if (typeof resource === "function") {
      this._cleanupables.push({ dispose: resource })
    }
  }

  destroy () {
    if (this._isDestroyed) return
    this._isDestroyed = true
    this._cleanupables.forEach(resource => {
      try {
        resource.dispose()
      } catch (error) {
        console.error("Error during cleanup:", error)
      }
    })
    this._cleanupables.length = 0
  }
}
