/**
 * GameState System - Handles game state management via GameApi
 * Uses GameApi abstraction instead of direct WASM calls
 */

import type { GameEngine, System } from '../core/GameEngine.js'
import type { StateContainer } from '../core/StateContainer.js'
import { GameApi } from '../api/GameApi.js'
import { createEntityData } from '../utils/entityUtils.js'

export class GameStateSystem implements System {
  public gameEngine: GameEngine
  public gameApi: GameApi
  public isDestroyed: boolean
  private _unsubscribeHandlers: (() => void)[]

  constructor (gameEngine: GameEngine, gameApi: GameApi | null = null) {
    this.gameEngine = gameEngine
    this.gameApi = gameApi || new GameApi()
    this.isDestroyed = false
    this._unsubscribeHandlers = []
  }

  async initializeGame (): Promise<{ success: boolean, error?: string, data?: unknown }> {
    if (!this.gameApi) {
      return { success: false, error: 'GameApi not initialized' }
    }

    try {
      const gameState = await this.gameApi.initialize()

      this.gameEngine.state.merge({
        isRunning: false,
        lastUpdate: Date.now(),
        time: gameState.time,
        entitiesCount: gameState.entities_count,
        alertsCount: gameState.alerts_count
      }, 'gameInitialized')

      if (gameState.entities) {
        const entitiesMap = this.gameEngine.state.get('entities') as Map<number, { id: number }>
        for (const entity of gameState.entities) {
          const normalizedEntity = createEntityData(entity)
          entitiesMap.set(entity.id, normalizedEntity)
        }
        this.gameEngine.state.merge({ entities: entitiesMap }, 'entitiesUpdated')
      }

      // Подписываемся на событие клика по юниту - отправляем в state для обработки
      this._unsubscribeHandlers.push(
        this.gameEngine.state.subscribe('entityClicked', (data) => {
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
      return { success: false, error: (error as Error).message }
    }
  }

  async spawnVehicle (vehicleType: string, baseEntity: { position?: { x?: number, y?: number } }): Promise<{ success: boolean, error?: string, data?: unknown }> {
    if (!this.gameApi) {
      return { success: false, error: 'GameApi not initialized' }
    }

    if (!baseEntity) {
      return { success: false, error: 'No base selected' }
    }

    const distance = 10 + Math.random() * 30
    const angle = Math.random() * Math.PI * 2

    // Rust Position struct serializes as { x, y } object
    const { x: baseX = 0, y: baseY = 0 } = baseEntity.position ?? { x: 0, y: 0 }

    const spawnX = baseX + Math.cos(angle) * distance
    const spawnY = baseY + Math.sin(angle) * distance

    try {
      const vehicleData = await this.gameApi.spawnVehicle(vehicleType, spawnX, spawnY)
      return { success: true, data: vehicleData }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async createBase (x: number, y: number): Promise<{ success: boolean, error?: string, data?: unknown }> {
    if (!this.gameApi) {
      return { success: false, error: 'GameApi not initialized' }
    }

    try {
      const baseData = await this.gameApi.createBase(x, y)
      return { success: true, data: baseData }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async buildFloor (baseId: number, floorType: string): Promise<{ success: boolean, error?: string, data?: unknown }> {
    if (!this.gameApi) {
      return { success: false, error: 'GameApi not initialized' }
    }

    try {
      const baseData = await this.gameApi.buildFloor(baseId, floorType)
      return { success: true, data: baseData }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async createRandomAlert (): Promise<{ success: boolean, error?: string, data?: unknown }> {
    if (!this.gameApi) {
      return { success: false, error: 'GameApi not initialized' }
    }

    try {
      const alertData = await this.gameApi.createRandomAlert()
      return { success: true, data: alertData }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async setGroupTarget (x: number, y: number): Promise<{ success: boolean, error?: string, data?: { x: number, y: number } }> {
    if (!this.gameApi) {
      return { success: false, error: 'GameApi not initialized' }
    }

    try {
      this.gameApi.setGroupTarget(x, y)
      return { success: true, data: { x, y } }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async updateGameLoop (dt: number): Promise<{ success: boolean, error?: string, data?: unknown }> {
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
        const entitiesMap = this.gameEngine.state.get('entities') as Map<number, { id: number }>
        for (const entity of gameState.entities) {
          const normalizedEntity = createEntityData(entity)
          entitiesMap.set(entity.id, normalizedEntity)
        }
        this.gameEngine.state.merge({ entities: entitiesMap }, 'entitiesUpdated')
      }

      if (gameState.removed_entities && gameState.removed_entities.length > 0) {
        const selections = this.gameEngine.state.get('selections') as Set<number>
        if (selections instanceof Set) {
          for (const removedId of gameState.removed_entities) {
            selections.delete(removedId)
          }
          this.gameEngine.state.merge({ selections }, 'selectionsChanged')
        }
      }

      return { success: true, data: gameState }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  destroy (): void {
    if (this.isDestroyed) return
    this.isDestroyed = true

    // Unsubscribe from all state events to prevent memory leaks
    this._unsubscribeHandlers.forEach(unsubscribe => unsubscribe())
    this._unsubscribeHandlers = []

    this.gameApi = null as unknown as GameApi
    this.gameEngine = null as unknown as GameEngine
  }

  update (dt: number): { success: boolean, error?: string, data?: unknown } {
    // Call updateGameLoop for game state updates
    return this.updateGameLoop(dt)
  }

  render (): void {
    // GameStateSystem does not render anything
  }

  clearSelection (): null {
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

export function createGameStateSystem (gameEngine: GameEngine, gameApi: GameApi | null = null): GameStateSystem {
  return new GameStateSystem(gameEngine, gameApi)
}
