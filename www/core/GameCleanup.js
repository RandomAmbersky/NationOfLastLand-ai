/**
 * Game cleanup module
 */

import {
  createDisposable,
  TimerManager,
  EventManager,
  GraphicsCleanup,
  Cleanupable
} from '../utils/cleanup.js'

export class GameCleanup extends Cleanupable {
  constructor () {
    super()
    this.timerManager = new TimerManager()
    this.eventManager = new EventManager()
    this.graphicsCleanup = new GraphicsCleanup()
    this.addCleanup(this.timerManager)
    this.addCleanup(this.eventManager)
    this.addCleanup(this.graphicsCleanup)
  }

  createSubsystem () {
    return createDisposable()
  }

  setTimeout (callback, delay) {
    return this.timerManager.setTimeout(callback, delay)
  }

  setInterval (callback, delay) {
    return this.timerManager.setInterval(callback, delay)
  }

  addEventListener (target, event, handler, options) {
    this.eventManager.addEventListener(target, event, handler, options)
  }

  addGraphics (graphics) {
    this.graphicsCleanup.addGraphics(graphics)
  }

  addContainer (container) {
    if (!container) return
    this.addCleanup({
      dispose: () => {
        try {
          container.destroy({
            children: true,
            texture: true,
            baseTexture: true
          })
        } catch (error) {
          console.error('Error destroying container:', error)
        }
      }
    })
  }

  destroy () {
    if (this.isDestroyed) return
    super.destroy()
    this.timerManager.dispose()
    this.eventManager.dispose()
    this.graphicsCleanup.dispose()
  }
}

export function createCleanupScope (cleanupManager) {
  const disposable = createDisposable()
  cleanupManager.addCleanup(disposable)
  return {
    add (resource) {
      disposable.add(resource)
    }
  }
}
