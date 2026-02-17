/**
 * Cleanup utilities for resource management
 */

/**
 * Disposable interface for cleanup management
 */
export interface Disposable {
  dispose (): void
}

/**
 * Creates a disposable container for managing cleanup of resources
 */
export function createDisposable (): Disposable {
  const resources: Disposable[] = []

  return {
    add (resource: Disposable | (() => void)): void {
      if (resource && typeof (resource as Disposable).dispose === 'function') {
        resources.push(resource as Disposable)
      } else if (typeof resource === 'function') {
        resources.push({ dispose: resource })
      }
    },

    dispose (): void {
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
export class TimerManager implements Disposable {
  private timers: Set<number>
  private isDisposed: boolean

  constructor () {
    this.timers = new Set()
    this.isDisposed = false
  }

  setTimeout (callback: () => void, delay: number): number {
    if (this.isDisposed) return -1
    const timerId = setTimeout(() => {
      if (!this.isDisposed) {
        callback()
      }
    }, delay)
    this.timers.add(timerId)
    return timerId
  }

  setInterval (callback: () => void, delay: number): number {
    if (this.isDisposed) return -1
    const intervalId = setInterval(() => {
      if (!this.isDisposed) {
        callback()
      }
    }, delay)
    this.timers.add(intervalId)
    return intervalId
  }

  clearTimeout (timerId: number): void {
    this.timers.delete(timerId)
    clearTimeout(timerId)
  }

  clearAll (): void {
    this.timers.forEach(timerId => {
      clearTimeout(timerId)
      clearInterval(timerId)
    })
    this.timers.clear()
  }

  dispose (): void {
    this.isDisposed = true
    this.clearAll()
  }
}

/**
 * Manages event listener cleanup
 */
export class EventManager implements Disposable {
  private listeners: Map<string, { target: EventTarget, event: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions }[]>
  private isDisposed: boolean

  constructor () {
    this.listeners = new Map()
    this.isDisposed = false
  }

  addEventListener (target: EventTarget, event: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    if (this.isDisposed) return
    const key = target + '-' + event
    if (!this.listeners.has(key)) {
      this.listeners.set(key, [])
    }
    this.listeners.get(key)?.push({ target, event, handler, options })
    target.addEventListener(event, handler, options)
  }

  removeEventListener (target: EventTarget, event: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    target.removeEventListener(event, handler, options)
  }

  removeListenersForTarget (target: EventTarget): void {
    this.listeners.forEach((listeners) => {
      listeners.forEach(({ event, handler, options }) => {
        target.removeEventListener(event, handler, options)
      })
    })
    this.listeners.clear()
  }

  dispose (): void {
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
export class GraphicsCleanup implements Disposable {
  private graphicsList: Set<PIXI.Graphics>
  private isDisposed: boolean

  constructor () {
    this.graphicsList = new Set()
    this.isDisposed = false
  }

  addGraphics (graphics: PIXI.Graphics): void {
    if (this.isDisposed || !graphics) return
    this.graphicsList.add(graphics)
  }

  removeGraphics (graphics: PIXI.Graphics): void {
    this.graphicsList.delete(graphics)
  }

  destroyAll (): void {
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

  dispose (): void {
    this.isDisposed = true
    this.destroyAll()
  }
}
