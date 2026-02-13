/**
 * GameState System - Handles game state management via GameApi
 * Uses GameApi abstraction instead of direct WASM calls
 */

import { GameApi } from '../api/GameApi.js'
import { createRepository } from '../core/EntityRepository.js'
import { createEntityData } from '../utils/entityUtils.js'

export class GameStateSystem {
  constructor (gameEngine, gameApi = null) {
    this.gameEngine = gameEngine
    this.gameApi = gameApi
    this.repository = createRepository(gameEngine.state)
    this.isDestroyed = false
    this._unsubscribeHandlers = []
  }

  /**
   * Initialize GameApi with WASM functions
   * @param {Object} wasm - WASM module with functions
   */
  initWasm (wasm) {
    this.gameApi = new GameApi(wasm)
  }

  async initializeGame () {
    if (!this.gameApi) {
      return { success: false, error: 'GameApi not initialized. Call initWasm() first.' }
    }

    try {
      const gameState = await this.gameApi.initialize()

      console.log('GameStateSystem.initializeGame: gameState from WASM:', gameState)

      this.gameEngine.state.merge({
        isRunning: false,
        lastUpdate: Date.now(),
        time: gameState.time,
        entitiesCount: gameState.entities_count,
        alertsCount: gameState.alerts_count
      }, 'gameInitialized')

      if (gameState.entities) {
        const entitiesMap = this.repository.getEntities()
        for (const entity of gameState.entities) {
          const normalizedEntity = createEntityData(entity)
          console.log('GameStateSystem: Parsing entity', entity.id, '->', normalizedEntity)
          console.log('GameStateSystem: entity.gameX:', normalizedEntity.gameX, 'entity.gameY:', normalizedEntity.gameY)
          entitiesMap.set(entity.id, normalizedEntity)
        }
        console.log('GameStateSystem: Merging entities, count:', entitiesMap.size)
        console.log('GameStateSystem: entitiesMap contents:', Array.from(entitiesMap.entries()))
        console.log('GameStateSystem: Emitting entitiesUpdated...')
        this.gameEngine.state.merge({ entities: entitiesMap }, 'entitiesUpdated')
        console.log('GameStateSystem: entitiesUpdated emitted!')
      } else {
        console.log('GameStateSystem: gameState.entities is null/undefined!')
      }

      // Подписываемся на событие клика по юниту - отправляем в state для обработки
      this._unsubscribeHandlers.push(
        this.gameEngine.state.subscribe('entityClicked', (data) => {
          console.log('GameStateSystem: entityClicked event received', data)
          this.gameEngine.state.emit('entityClickedProcessed', data)
        })
      )

      // Подписываемся на событие выбора юнита (правая кнопка мыши)
      this._unsubscribeHandlers.push(
        this.gameEngine.state.subscribe('entitySelected', (data) => {
          this.gameEngine.state.emit('entitySelectedProcessed', data)
        })
      )

      // Подписываемся на событие сброса выделения
      this._unsubscribeHandlers.push(
        this.gameEngine.state.subscribe('selectionCleared', (data) => {
          this.gameEngine.state.emit('selectionClearedProcessed', data)
        })
      )

      // Подписываемся на событие выделения прямоугольником
      this._unsubscribeHandlers.push(
        this.gameEngine.state.subscribe('rectangleSelection', (data) => {
          this.gameEngine.state.emit('rectangleSelectionProcessed', data)
        })
      )

      return { success: true, data: gameState }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async spawnVehicle (vehicleType, baseEntity) {
    if (!this.gameApi) {
      return { success: false, error: 'GameApi not initialized' }
    }

    if (!baseEntity) {
      return { success: false, error: 'No base selected' }
    }

    const distance = 10 + Math.random() * 30
    const angle = Math.random() * Math.PI * 2

    // Rust Position struct serializes as { x, y } object
    const { x: baseX, y: baseY } = baseEntity.position ?? { x: 0, y: 0 }

    const spawnX = baseX + Math.cos(angle) * distance
    const spawnY = baseY + Math.sin(angle) * distance

    try {
      const vehicleData = await this.gameApi.spawnVehicle(vehicleType, spawnX, spawnY)
      return { success: true, data: vehicleData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async createBase (x, y) {
    if (!this.gameApi) {
      return { success: false, error: 'GameApi not initialized' }
    }

    try {
      const baseData = await this.gameApi.createBase(x, y)
      return { success: true, data: baseData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async buildFloor (baseId, floorType) {
    if (!this.gameApi) {
      return { success: false, error: 'GameApi not initialized' }
    }

    try {
      const baseData = await this.gameApi.buildFloor(baseId, floorType)
      return { success: true, data: baseData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async createRandomAlert () {
    if (!this.gameApi) {
      return { success: false, error: 'GameApi not initialized' }
    }

    try {
      const alertData = await this.gameApi.createRandomAlert()
      return { success: true, data: alertData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async setGroupTarget (x, y) {
    if (!this.gameApi) {
      return { success: false, error: 'GameApi not initialized' }
    }

    try {
      this.gameApi.setGroupTarget(x, y)
      return { success: true, data: { x, y } }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async updateGameLoop (dt) {
    if (!this.gameApi) {
      return { success: false, error: 'GameApi not initialized' }
    }

    try {
      const gameState = await this.gameApi.update(dt)

      this.gameEngine.state.merge({
        time: gameState.time,
        entitiesCount: gameState.entities_count,
        alertsCount: gameState.alerts_count
      }, 'gameStateUpdated')

      if (gameState.entities) {
        const entitiesMap = this.repository.getEntities()
        for (const entity of gameState.entities) {
          const normalizedEntity = createEntityData(entity)
          console.log('GameStateSystem: updateGameLoop - Parsing entity', entity.id, '->', normalizedEntity)
          console.log('GameStateSystem: updateGameLoop - entity.gameX:', normalizedEntity.gameX, 'entity.gameY:', normalizedEntity.gameY)
          entitiesMap.set(entity.id, normalizedEntity)
        }
        console.log('GameStateSystem: updateGameLoop - Merging entities, count:', entitiesMap.size)
        console.log('GameStateSystem: updateGameLoop - entitiesMap contents:', Array.from(entitiesMap.entries()))
        this.gameEngine.state.merge({ entities: entitiesMap }, 'entitiesUpdated')
      }

      if (gameState.removed_entities && gameState.removed_entities.length > 0) {
        const selections = this.gameEngine.state.get('selections')
        if (selections instanceof Set) {
          for (const removedId of gameState.removed_entities) {
            selections.delete(removedId)
          }
          this.gameEngine.state.merge({ selections }, 'selectionsChanged')
        }
      }

      return { success: true, data: gameState }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  destroy () {
    if (this.isDestroyed) return
    this.isDestroyed = true

    // Unsubscribe from all state events to prevent memory leaks
    this._unsubscribeHandlers.forEach(unsubscribe => unsubscribe())
    this._unsubscribeHandlers = []

    this.gameApi = null
    this.repository = null
    this.gameEngine = null
  }

  update (dt) {
    // Call updateGameLoop for game state updates
    return this.updateGameLoop(dt)
  }

  render () {
    // GameStateSystem does not render anything
  }

  clearSelection () {
    if (!this.gameApi) {
      return null
    }

    try {
      this.gameApi.clearSelection()
      return null
    } catch (error) {
      return null
    }
  }
}

export function createGameStateSystem (gameEngine, gameApi = null) {
  return new GameStateSystem(gameEngine, gameApi)
}
