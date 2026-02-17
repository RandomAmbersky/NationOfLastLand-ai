/**
 * Immutable State Container
 * Manages game state with versioning and reactive updates
 */

export class StateContainer<T extends Record<string, unknown> = Record<string, unknown>> {
  private _state: T
  private _version: number
  private _eventHandlers: Map<string, Set<(data: T) => void>>

  constructor (initialState: T = {} as T) {
    this._state = { ...initialState }
    this._version = 0
    this._eventHandlers = new Map()
  }

  getState (): Readonly<T> {
    return JSON.parse(JSON.stringify(this._state))
  }

  get<K extends keyof T> (key: K): T[K] {
    return this._state[key]
  }

  getVersion (): number {
    return this._version
  }

  setState (updater: (state: T) => T, eventType: string | null = null): T {
    const newState = updater(this._state)
    if (newState === undefined) {
      throw new Error('StateContainer: updater must return a state object')
    }

    const stateChanged = this._state !== newState
    if (!stateChanged) {
      const hasChanges = Object.keys(newState).some(k =>
        JSON.stringify(this._state[k]) !== JSON.stringify(newState[k])
      )
      if (!hasChanges) {
        return this._state
      }
    }

    this._state = newState
    this._version++

    if (eventType) {
      this.emit(eventType, newState)
    } else {
      this.emit('stateUpdated', newState)
    }

    return newState
  }

  subscribe (event: string, handler: (data: T) => void): () => void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set())
    }
    const handlers = this._eventHandlers.get(event)
    handlers?.add(handler)

    return () => this.unsubscribe(event, handler)
  }

  unsubscribe (event: string, handler: (data: T) => void): void {
    const handlers = this._eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  emit (event: string, data: T): void {
    const handlers = this._eventHandlers.get(event)
    if (handlers) {
      const handlersCopy = new Set(handlers)
      handlersCopy.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error('StateContainer: Error in handler for event:', event, error)
        }
      })
    }
  }

  reset (initialState: T = {} as T): void {
    this._state = { ...initialState }
    this._version = 0
    this.emit('stateReset', this._state)
  }

  merge (partial: Partial<T>, eventType: string | null = null): T {
    if (typeof partial !== 'object' || partial === null) {
      throw new Error('StateContainer: partial must be an object')
    }
    return this.setState(prev => ({ ...prev, ...partial }), eventType)
  }

  hasChangedSince (version: number): boolean {
    return this._version > version
  }

  destroy (): void {
    this._eventHandlers.clear()
    this._state = {} as T
  }
}

export function createContainer<T extends Record<string, unknown> = Record<string, unknown>> (
  initialState: T = {} as T
): StateContainer<T> {
  return new StateContainer(initialState)
}
