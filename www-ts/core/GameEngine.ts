/**
 * Game Engine - Central coordinator for game systems
 * Manages system lifecycle, updates, and rendering
 */

import type { StateContainer } from './StateContainer.js'

export interface System {
  update (dt: number): void
  render (): void
  destroy (): void
  isDestroyed: boolean
}

export class GameEngine {
  public config: Record<string, unknown>
  public state: StateContainer
  public systems: System[]
  public _loopId: number | null
  public _lastFrameTime: number
  public app: unknown | null
  public transformer: unknown | null

  constructor (config: Record<string, unknown> = {}) {
    this.config = config
    this.state = new StateContainer({
      isRunning: false,
      lastUpdate: Date.now(),
      deltaTime: 0,
      time: 0,
      entities: new Map<unknown, unknown>(),
      selections: new Set<unknown>(),
      bases: new Map<unknown, unknown>()
    })
    this.systems = []
    this._loopId = null
    this._lastFrameTime = 0
    this.app = null
    this.transformer = null
  }

  setApp (app: unknown): void {
    this.app = app
    // Transformer is set via setApp from outside
  }

  getTransformer (): unknown {
    return this.transformer
  }

  addSystem (system: System): void {
    if (!system || typeof system.update !== 'function') {
      throw new Error('GameEngine: System must have update() method')
    }
    this.systems.push(system)
    system.update = system.update.bind(system)
    system.render = system.render.bind(system)
    // Systems now access transformer via gameEngine.transformer
  }

  removeSystem (system: System): void {
    const index = this.systems.indexOf(system)
    if (index > -1) {
      this.systems.splice(index, 1)
    }
  }

  start (): void {
    if (this.state.get('isRunning')) return

    this.state.merge({ isRunning: true }, 'engineStarted')
    this._lastFrameTime = performance.now()
    this._scheduleFrame()
  }

  stop (): void {
    if (!this.state.get('isRunning')) return

    this.state.merge({ isRunning: false }, 'engineStopped')
    if (this._loopId) {
      globalThis.cancelAnimationFrame(this._loopId)
      this._loopId = null
    }
  }

  update (dt: number): void {
    this.state.merge({ deltaTime: dt, time: this.state.get('time') + dt })

    this.systems.forEach(s => { if (!s.isDestroyed) s.update(dt) })
  }

  render (): void {
    this.systems.forEach(s => { if (!s.isDestroyed) s.render() })
  }

  _loop (now: number): void {
    if (!this.state || !this.state.get('isRunning')) return

    const dt = (now - this._lastFrameTime) / 1000
    this._lastFrameTime = now

    const cappedDt = Math.min(dt, 0.1)

    this.update(cappedDt)
    this.render()

    this._scheduleFrame()
  }

  _scheduleFrame (): void {
    this._loopId = requestAnimationFrame((now) => this._loop(now))
  }

  destroy (): void {
    this.stop()

    this.systems.forEach(s => { if (!s.isDestroyed) s.destroy() })

    this.systems = []
    this.transformer = null
    this.state.destroy()
  }
}

export function createEngine (config: Record<string, unknown> = {}): GameEngine {
  return new GameEngine(config)
}
