/**
 * Immutable State Container
 * Manages game state with versioning and reactive updates
 */

export class StateContainer {
  constructor (initialState = {}) {
    this._state = { ...initialState }
    this._version = 0
    this._eventHandlers = new Map()
  }

  getState () {
    return JSON.parse(JSON.stringify(this._state))
  }

  get (key) {
    return this._state[key]
  }

  getVersion () {
    return this._version
  }

  setState (updater, eventType = null) {
    if (typeof updater !== 'function') {
      throw new Error('StateContainer: updater must be a function')
    }

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

  mergeMap (key, updateFn, eventType = null) {
    const state = this._state[key]
    if (state instanceof Map) {
      const updated = updateFn(state)
      if (updated !== state) {
        this._state[key] = updated
        this._version++
        if (eventType) {
          this.emit(eventType, this._state)
        } else {
          this.emit('stateUpdated', this._state)
        }
      }
      return state
    }
    return this.merge({ [key]: updateFn(state || new Map()) }, eventType)
  }

  mergeSet (key, updateFn, eventType = null) {
    const state = this._state[key]
    if (state instanceof Set) {
      const updated = updateFn(state)
      if (updated !== state) {
        this._state[key] = updated
        this._version++
        if (eventType) {
          this.emit(eventType, this._state)
        } else {
          this.emit('stateUpdated', this._state)
        }
      }
      return state
    }
    return this.merge({ [key]: updateFn(state || new Set()) }, eventType)
  }

  subscribe (event, handler) {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set())
    }
    this._eventHandlers.get(event).add(handler)

    return () => this.unsubscribe(event, handler)
  }

  unsubscribe (event, handler) {
    const handlers = this._eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  emit (event, data) {
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

  reset (initialState = {}) {
    this._state = { ...initialState }
    this._version = 0
    this.emit('stateReset', this._state)
  }

  merge (partial, eventType = null) {
    if (typeof partial !== 'object' || partial === null) {
      throw new Error('StateContainer: partial must be an object')
    }
    this.setState(prev => ({ ...prev, ...partial }), eventType)
  }

  hasChangedSince (version) {
    return this._version > version
  }

  destroy () {
    this._eventHandlers.clear()
    this._state = null
  }
}

export function createContainer (initialState = {}) {
  return new StateContainer(initialState)
}
