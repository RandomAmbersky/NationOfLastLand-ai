/**
 * Utility functions for cleanup management
 */

/**
 * Creates a disposable container for managing cleanup of resources
 */
export function createDisposable () {
  const resources = []

  return {
    add (resource) {
      if (resource && typeof resource.dispose === 'function') {
        resources.push(resource)
      } else if (typeof resource === 'function') {
        resources.push({ dispose: resource })
      }
    },

    dispose () {
      resources.forEach(resource => {
        try {
          resource.dispose()
        } catch (error) {
          console.error('Error during cleanup:', error)
        }
      })
      resources.length = 0
    }
  }
}

/**
 * Manages timer cleanup
 */
export class TimerManager {
  constructor () {
    this.timers = new Set()
    this.isDisposed = false
  }

  setTimeout (callback, delay) {
    if (this.isDisposed) return -1
    const timerId = setTimeout(() => {
      if (!this.isDisposed) {
        callback()
      }
    }, delay)
    this.timers.add(timerId)
    return timerId
  }

  setInterval (callback, delay) {
    if (this.isDisposed) return -1
    const intervalId = setInterval(() => {
      if (!this.isDisposed) {
        callback()
      }
    }, delay)
    this.timers.add(intervalId)
    return intervalId
  }

  clearTimeout (timerId) {
    this.timers.delete(timerId)
    clearTimeout(timerId)
  }

  clearAll () {
    this.timers.forEach(timerId => {
      clearTimeout(timerId)
      clearInterval(timerId)
    })
    this.timers.clear()
  }

  dispose () {
    this.isDisposed = true
    this.clearAll()
  }
}

/**
 * Manages event listener cleanup
 */
export class EventManager {
  constructor () {
    this.listeners = new Map()
    this.isDisposed = false
  }

  addEventListener (target, event, handler, options) {
    if (this.isDisposed) return
    const _key = target + '-' + event
    if (!this.listeners.has(_key)) {
      this.listeners.set(_key, [])
    }
    this.listeners.get(_key).push({ target, event, handler, options })
    target.addEventListener(event, handler, options)
  }

  removeEventListener (target, event, handler, options) {
    target.removeEventListener(event, handler, options)
  }

  removeListenersForTarget (target) {
    this.listeners.forEach((listeners) => {
      listeners.forEach(({ event, handler, options }) => {
        target.removeEventListener(event, handler, options)
      })
    })
    this.listeners.clear()
  }

  dispose () {
    this.isDisposed = true
    this.listeners.forEach((listeners) => {
      listeners.forEach(({ target, event, handler, options }) => {
        try {
          target.removeEventListener(event, handler, options)
        } catch (error) {
          console.error('Error removing event listener:', error)
        }
      })
    })
    this.listeners.clear()
  }
}

/**
 * Creates a cleanup manager for Pixi.js graphics
 */
export class GraphicsCleanup {
  constructor () {
    this.graphicsList = new Set()
    this.isDisposed = false
  }

  addGraphics (graphics) {
    if (this.isDisposed || !graphics) return
    this.graphicsList.add(graphics)
  }

  removeGraphics (graphics) {
    this.graphicsList.delete(graphics)
  }

  destroyAll () {
    this.graphicsList.forEach(graphics => {
      try {
        if (graphics && !graphics.isDestroyed) {
          graphics.destroy({ children: true, texture: true, baseTexture: true })
        }
      } catch (error) {
        console.error('Error destroying graphics:', error)
      }
    })
    this.graphicsList.clear()
  }

  dispose () {
    this.isDisposed = true
    this.destroyAll()
  }
}
