/**
 * GameState System - Handles game state management and WASM communication
 * Extracted from original GameStateManager for better separation of concerns
 */

import {
  initWasm,
  gameInit,
  create_vehicle,
  update,
  set_group_target,
  create_base,
  build_floor,
  create_random_alert,
  clear_selection as _clearSelection
} from '../wasm-imports.js'

export class GameStateSystem {
  constructor(gameEngine) {
    this.gameEngine = gameEngine
    this.isDestroyed = false
  }

  async initializeGame() {
    try {
      // Initialize WASM if not already initialized
      await initWasm()
      const result = gameInit()
      const gameState = JSON.parse(result)

      this.gameEngine.state.merge({
        isRunning: false,
        lastUpdate: Date.now(),
        time: gameState.time,
        entitiesCount: gameState.entities_count,
        alertsCount: gameState.alerts_count
      }, 'gameInitialized')

      if (gameState.entities) {
        const existingEntities = this.gameEngine.state.get('entities')
        const entitiesMap = existingEntities instanceof Map ? existingEntities : new Map()
        for (const entity of gameState.entities) {
          entitiesMap.set(entity.id, entity)
        }
        this.gameEngine.state.merge({ entities: entitiesMap }, 'entitiesUpdated')
      }

      // Подписываемся на событие клика по юниту
      this.gameEngine.state.subscribe('entityClicked', (data) => {
        console.log('GameStateSystem: entityClicked event received', data)
        this.selectionSystem?.handleEntityClicked(data)
        this._handleEntityClicked(data)
      })

      // Подписываемся на событие выбора юнита (правая кнопка мыши)
      this.gameEngine.state.subscribe('entitySelected', (data) => {
        this.selectionSystem?.handleEntitySelected(data)
      })

      // Подписываемся на событие сброса выделения
      this.gameEngine.state.subscribe('selectionCleared', (data) => {
        this.selectionSystem?.handleSelectionCleared(data)
      })

      // Подписываемся на событие выделения прямоугольником
      this.gameEngine.state.subscribe('rectangleSelection', (data) => {
        this.selectionSystem?.handleRectangleSelection(data)
      })

      return { success: true, data: gameState }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async spawnVehicle(vehicleType, baseEntity) {
    if (!baseEntity) {
      return { success: false, error: 'No base selected' }
    }

    const distance = 10 + Math.random() * 30
    const angle = Math.random() * Math.PI * 2

    // Rust Position struct serializes as { x, y } object
    const { x: baseX, y: baseY } = this.gameEngine.coordinateService?.normalizeCoords(baseEntity.position, baseEntity.gameX) ?? { x: 0, y: 0 }

    const spawnX = baseX + Math.cos(angle) * distance
    const spawnY = baseY + Math.sin(angle) * distance

    try {
      const result = create_vehicle(vehicleType, spawnX, spawnY)
      const creationResult = JSON.parse(result)

      if (creationResult.success) {
        return { success: true, data: creationResult }
      }
      return { success: false, error: creationResult.message }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async createBase(x, y) {
    try {
      const result = create_base(x, y)
      const baseInfo = JSON.parse(result)
      return { success: true, data: baseInfo }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async buildFloor(baseId, floorType) {
    try {
      const result = build_floor(baseId, floorType)
      const updatedBase = JSON.parse(result)
      return { success: true, data: updatedBase }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async createRandomAlert() {
    try {
      const result = create_random_alert()
      const alertResult = JSON.parse(result)
      return { success: true, data: alertResult }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async setGroupTarget(x, y) {
    try {
      const result = set_group_target(x, y)
      const groupResult = JSON.parse(result)
      return { success: true, data: groupResult }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  updateGameLoop(dt) {
    try {
      const result = update(dt)
      const gameState = JSON.parse(result)

      this.gameEngine.state.merge({
        time: gameState.time,
        entitiesCount: gameState.entities_count,
        alertsCount: gameState.alerts_count
      }, 'gameStateUpdated')

      if (gameState.entities) {
        const existingEntities = this.gameEngine.state.get('entities')
        const entitiesMap = existingEntities instanceof Map ? existingEntities : new Map()
        for (const entity of gameState.entities) {
          entitiesMap.set(entity.id, entity)
        }
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

  destroy() {
    if (this.isDestroyed) return
    this.isDestroyed = true
    this.gameEngine = null
  }

  update(dt) {
    // Call updateGameLoop for game state updates
    return this.updateGameLoop(dt)
  }

  render() {
    // GameStateSystem does not render anything
  }

  clearSelection() {
    try {
      return _clearSelection()
    } catch (error) {
      return null
    }
  }

  _handleEntityClicked(data) {
    const { entityId, isMultiSelect, gameX, gameY } = data
    const entities = this.gameEngine.state.get('entities')
    const entity = entities.get(entityId)

    if (entity) {
      console.log('Entity clicked:', entity)
      // Здесь можно добавить отображение параметров юнита в UI
      // Например, обновить элемент DOM с информацией о юните
      this._showEntityInfo(entity)
    }
  }

  _showEntityInfo(entity) {
    // Пытаемся найти элемент для отображения информации
    const entityInfoEl = document.getElementById('entity-info')
    if (entityInfoEl) {
      // Получаем тип: приоритет от subtype (из Rust), затем entity_type
      const typeValue = entity.subtype || entity.entity_type || 'N/A'
      // Получаем фракцию
      const fractionValue = entity.fraction || 'N/A'
      // Получаем позицию: приоритет от gameX/gameY, затем из position
      const gameX = entity.gameX ?? (entity.position?.x ?? 0)
      const gameY = entity.gameY ?? (entity.position?.y ?? 0)
      const info = `
ID: ${entity.id}
Тип: ${typeValue}
Фракция: ${fractionValue}
Позиция: (${gameX.toFixed(1)}, ${gameY.toFixed(1)})
       `
      entityInfoEl.textContent = info
      entityInfoEl.style.display = 'block'
    }
  }
}

export function createGameStateSystem(gameEngine) {
  return new GameStateSystem(gameEngine)
}
