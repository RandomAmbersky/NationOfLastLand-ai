/**
 * Game Engine - Central coordinator for game systems
 * Manages system lifecycle, updates, and rendering
 */

import { StateContainer } from './StateContainer.js'
import { createCoordinateTransformer } from '../utils/coordinateTransformer.js'

export class System {
  constructor (gameEngine) {
    this.gameEngine = gameEngine
    this.isDestroyed = false
  }

  update (_dt) {}

  render () {}

  destroy () {
    this.isDestroyed = true
    this.gameEngine = null
  }
}

export class GameEngine {
  constructor (config = {}) {
    this.config = config
    this.state = new StateContainer({
      isRunning: false,
      lastUpdate: Date.now(),
      deltaTime: 0,
      time: 0,
      entities: new Map(),
      selections: new Set(),
      bases: new Map()
    })
    this.systems = []
    this._loopId = null
    this._lastFrameTime = 0
    this.app = null
    this.transformer = null
  }

  setApp (app) {
    this.app = app
    // Create transformer once and share across systems
    this.transformer = createCoordinateTransformer(app)
  }

  getTransformer () {
    return this.transformer
  }

  addSystem (system) {
    if (!system || typeof system.update !== 'function') {
      throw new Error('GameEngine: System must have update() method')
    }
    this.systems.push(system)
    system.update = system.update.bind(system)
    system.render = system.render.bind(system)
    // Pass shared transformer to system if it has setTransformer method
    if (typeof system.setTransformer === 'function' && this.transformer) {
      system.setTransformer(this.transformer)
    }
  }

  removeSystem (system) {
    const index = this.systems.indexOf(system)
    if (index > -1) {
      this.systems.splice(index, 1)
    }
  }

  start () {
    if (this.state.get('isRunning')) return

    this.state.merge({ isRunning: true }, 'engineStarted')
    this._lastFrameTime = performance.now()
    this._scheduleFrame()
  }

  stop () {
    if (!this.state.get('isRunning')) return

    this.state.merge({ isRunning: false }, 'engineStopped')
    if (this._loopId) {
      globalThis.cancelAnimationFrame(this._loopId)
      this._loopId = null
    }
  }

  update (_dt) {
    this.state.merge({ deltaTime: _dt, time: this.state.get('time') + _dt })

    this.systems.forEach(s => { if (!s.isDestroyed) s.update(_dt) })
  }

  render () {
    this.systems.forEach(s => { if (!s.isDestroyed) s.render() })
  }

  _loop (now) {
    if (!this.state || !this.state.get('isRunning')) return

    const dt = (now - this._lastFrameTime) / 1000
    this._lastFrameTime = now

    const cappedDt = Math.min(dt, 0.1)

    this.update(cappedDt)
    this.render()

    this._scheduleFrame()
  }

  _scheduleFrame () {
    this._loopId = requestAnimationFrame((now) => this._loop(now))
  }

  destroy () {
    this.stop()

    this.systems.forEach(s => { if (!s.isDestroyed) s.destroy() })

    this.systems = []
    this.transformer = null
    this.state.destroy()
  }
}

export function createEngine (config = {}) {
  return new GameEngine(config)
}
