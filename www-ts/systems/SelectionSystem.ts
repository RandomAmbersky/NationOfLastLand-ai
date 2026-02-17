/**
 * Selection System - Handles entity selection and group management
 * Extracted from original SelectionManager for better separation of concerns
 * Implements rules from units_moving_rules.md
 */

import type { GameEngine, System } from '../core/GameEngine.js'
import type { StateContainer } from '../core/StateContainer.js'
import { GAME_CONFIG } from '../config/game-config.js'
import { SelectionIndicator } from '../services/SelectionIndicator.js'
import { canMove, isPlayerUnit } from '../utils/entityUtils.js'

export class SelectionSystem implements System {
  public gameEngine: GameEngine
  public selectionIndicator: SelectionIndicator | null
  public isDestroyed: boolean
  private rendererSystem: unknown | null

  constructor (gameEngine: GameEngine) {
    this.gameEngine = gameEngine
    this.selectionIndicator = null
    this.isDestroyed = false
    this.rendererSystem = null
  }

  init (): void {
    this.rendererSystem = this.gameEngine.rendererSystem || null
    this.selectionIndicator = new SelectionIndicator(this.gameEngine, this.rendererSystem)

    // Pass transformer to selection indicator
    if (this.selectionIndicator && this.gameEngine.transformer) {
      this.selectionIndicator.setTransformer(this.gameEngine.transformer)
    }
  }

  /**
   * Проверяет, может ли юнит двигаться
   */
  _canMove (entity: { entityType?: string, movement?: { canMove?: boolean } }): boolean {
    return canMove(entity)
  }

  /**
   * Проверяет, принадлежит ли юнит игроку
   */
  _isPlayerUnit (entity: { fraction?: string, entityType?: string }): boolean {
    return isPlayerUnit(entity)
  }

  /**
   * Обработка клика по юниту (правила из units_moving_rules.md)
   */
  handleEntityClicked (data: {
    entityId: number
    isMultiSelect: boolean
    gameX: number
    gameY: number
  }): void {
    const { entityId, isMultiSelect, gameX, gameY } = data
    const state = this.gameEngine.state
    const selections = state.get('selections') as Set<number>
    const entities = state.get('entities') as Map<number, { fraction?: string, entityType: string, movement?: { canMove?: boolean } }>
    const clickedEntity = entities.get(entityId)

    if (!clickedEntity) {
      console.warn('handleEntityClicked: clickedEntity not found for id', entityId)
      return
    }

    // Правило 1: Если ничего не выбрано - просто выбираем юнит
    if (selections.size === 0) {
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator?.updateIndicators(selections)
      return
    }

    // Правило 8: Если выбран юнит фракции не игрока и происходит клик по другому юниту
    const firstSelectedId = Array.from(selections)[0]
    const firstSelectedEntity = entities.get(firstSelectedId)

    if (firstSelectedEntity && !this._isPlayerUnit(firstSelectedEntity)) {
      selections.clear()
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator?.updateIndicators(selections)
      return
    }

    // Правило 7: Если выбран юнит игрока который не может двигаться и происходит клик на другом юните
    if (firstSelectedEntity && this._isPlayerUnit(firstSelectedEntity) && !this._canMove(firstSelectedEntity)) {
      // Если кликнули на другого юнита - сбрасываем и выбираем нового
      if (entityId !== firstSelectedId) {
        selections.clear()
        selections.add(entityId)
        state.merge({ selections }, 'selectionsChanged')
        this.selectionIndicator?.updateIndicators(selections)
        return
      }
    }

    // Правило 6: Если выбран один подвижный юнит или группа подвижных юнитов игрока
    // и происходит клик на юните принадлежащем не фракции игрока - он назначается целью
    const allSelectedCanMove = Array.from(selections).every(id => {
      const entity = entities.get(id)
      return entity && this._canMove(entity)
    })

    if (allSelectedCanMove && !this._isPlayerUnit(clickedEntity)) {
      state.emit('groupTargetSet', { targetX: gameX, targetY: gameY, selections: Array.from(selections) })
      return
    }

    // Правило 4: При групповом выделении должны выбираться только юниты игрока и только те которые могут двигаться
    if (isMultiSelect) {
      // Добавляем только юниты игрока, которые могут двигаться
      if (this._isPlayerUnit(clickedEntity) && this._canMove(clickedEntity)) {
        if (selections.size < GAME_CONFIG.LIMITS.maxGroupSize) {
          selections.add(entityId)
          state.merge({ selections }, 'selectionsChanged')
          this.selectionIndicator?.updateIndicators(selections)
        }
      }
      return
    }

    // Если кликнули на уже выбранный юнит - ничего не делаем
    if (selections.has(entityId)) {
      return
    }

    // Правило 2: Если в группе выбран только один юнит и клик по другому юниту игрока
    if (selections.size === 1 && this._isPlayerUnit(clickedEntity) && this._canMove(clickedEntity)) {
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator?.updateIndicators(selections)
      return
    }

    // Если кликнули на юнита не игрока и он не может быть целью (нет подвижных юнитов в выделении)
    if (!this._isPlayerUnit(clickedEntity)) {
      selections.clear()
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator?.updateIndicators(selections)
      return
    }

    // Правило 8: Если выбран юнит не игрока и кликнули на другого - сбрасываем и выбираем нового
    if (!this._isPlayerUnit(firstSelectedEntity)) {
      selections.clear()
      selections.add(entityId)
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator?.updateIndicators(selections)
    }
  }

  /**
   * Обработка клика правой кнопки мыши на юните
   */
  handleEntitySelected (data: { entityId: number }): void {
    const { entityId } = data
    const state = this.gameEngine.state
    const selections = state.get('selections') as Set<number>
    const entities = state.get('entities') as Map<number, unknown>
    const clickedEntity = entities.get(entityId)

    if (!clickedEntity) return

    // Сбрасываем текущее выделение и выбираем юнит
    selections.clear()
    selections.add(entityId)
    state.merge({ selections }, 'selectionsChanged')
    this.selectionIndicator?.updateIndicators(selections)
  }

  /**
   * Обработка клика правой кнопки мыши на пустом месте
   */
  handleSelectionCleared (): void {
    const state = this.gameEngine.state
    const selections = state.get('selections') as Set<number>

    if (selections.size > 0) {
      selections.clear()
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator?.updateIndicators(selections)
    }
  }

  /**
   * Обработка группового выделения прямоугольником
   */
  handleRectangleSelection (data: { bounds: { x: number, y: number, width: number, height: number } }): void {
    const { bounds } = data
    const state = this.gameEngine.state
    const entities = state.get('entities') as Map<number, { fraction?: string, entityType: string, gameX?: number, gameY?: number, position?: { x?: number, y?: number } }>
    const selections = state.get('selections') as Set<number>
    const maxGroupSize = GAME_CONFIG.LIMITS.maxGroupSize

    // Правило 4: при групповом выделении должны выбираться только юниты игрока и только те которые могут двигаться
    // Если в выделении есть юниты чужой фракции, сбрасываем выделение перед новым выбором
    const firstSelectedId = Array.from(selections)[0]
    const firstSelectedEntity = firstSelectedId ? entities.get(firstSelectedId) : null
    if (firstSelectedEntity && !this._isPlayerUnit(firstSelectedEntity)) {
      selections.clear()
    }

    let addedCount = 0
    for (const [id, entity] of entities) {
      if (this._isEntityInBounds(entity, bounds)) {
        // Добавляем только юниты игрока, которые могут двигаться
        if (this._isPlayerUnit(entity) && this._canMove(entity) && !selections.has(id)) {
          if (selections.size + addedCount >= maxGroupSize) break
          selections.add(id)
          addedCount++
        }
      }
    }

    if (addedCount > 0) {
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator?.updateIndicators(selections)
    }
    return addedCount
  }

  selectEntity (entityId: number, isMultiSelect = false): boolean {
    const state = this.gameEngine.state
    const selections = state.get('selections') as Set<number>

    if (selections.has(entityId)) return true

    if (selections.size >= GAME_CONFIG.LIMITS.maxGroupSize && !isMultiSelect) {
      return false
    }

    this.gameEngine.state.emit('selectEntity', {
      entityId,
      isMultiSelect,
      currentSelections: Array.from(selections)
    })

    return true
  }

  deselectEntity (entityId: number): boolean {
    const state = this.gameEngine.state
    const selections = state.get('selections') as Set<number>

    if (selections.has(entityId)) {
      selections.delete(entityId)
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator?.updateIndicators(selections)
      return true
    }
    return false
  }

  clearAll (): boolean {
    const state = this.gameEngine.state
    const selections = state.get('selections') as Set<number>

    if (selections.size > 0) {
      selections.clear()
      state.merge({ selections }, 'selectionsChanged')
      this.selectionIndicator?.updateIndicators(selections)
      return true
    }
    return false
  }

  selectAllPlayerUnits (): number {
    const state = this.gameEngine.state
    const selections = state.get('selections') as Set<number>
    const maxGroupSize = GAME_CONFIG.LIMITS.maxGroupSize
    const entities = state.get('entities') as Map<number, { fraction?: string, entityType: string, movement?: { canMove?: boolean } }>

    let count = 0
    for (const [id, entity] of entities) {
      if (count >= maxGroupSize) break
      if (!selections.has(id) && this._isPlayerUnit(entity) && this._canMove(entity)) {
        selections.add(id)
        count++
      }
    }

    state.merge({ selections }, 'selectionsChanged')
    this.selectionIndicator?.updateIndicators(selections)
    return count
  }

  selectEntitiesInRectangle (bounds: { x: number, y: number, width: number, height: number }): number {
    const state = this.gameEngine.state
    const entities = state.get('entities') as Map<number, unknown>
    const selections = state.get('selections') as Set<number>
    const maxGroupSize = GAME_CONFIG.LIMITS.maxGroupSize

    const entitiesInRect: number[] = []
    for (const [id, entity] of entities) {
      if (this._isEntityInBounds(entity, bounds)) {
        entitiesInRect.push(id)
      }
    }

    const limitedEntities = entitiesInRect.slice(0, maxGroupSize)

    for (const id of limitedEntities) {
      selections.add(id)
    }

    state.merge({ selections }, 'selectionsChanged')
    this.selectionIndicator?.updateIndicators(selections)
    return limitedEntities.length
  }

  _isEntityInBounds (entity: { gameX?: number, gameY?: number, position?: { x?: number, y?: number } }, bounds: { x: number, y: number, width: number, height: number }): boolean {
    if (!entity) return false

    // Используем gameX/gameY из state.entities (координаты в игровом мире)
    // и преобразуем их в экранные координаты
    const gameX = (entity as { gameX?: number }).gameX ?? (entity as { position?: { x?: number } }).position?.x ?? 0
    const gameY = (entity as { gameY?: number }).gameY ?? (entity as { position?: { y?: number } }).position?.y ?? 0

    const { x: scaleX, y: scaleY } = this._getScale()
    const entityScreenX = gameX * scaleX
    const entityScreenY = gameY * scaleY

    return entityScreenX >= bounds.x &&
      entityScreenY >= bounds.y &&
      entityScreenX <= bounds.x + bounds.width &&
      entityScreenY <= bounds.y + bounds.height
  }

  _getScale (): { x: number, y: number } {
    if (!this.gameEngine.transformer) return { x: 1, y: 1 }
    return (this.gameEngine.transformer as { getScale: () => { x: number, y: number } }).getScale()
  }

  setGroupTarget (gameX: number, gameY: number): void {
    const state = this.gameEngine.state
    const selections = state.get('selections') as Set<number>

    this.gameEngine.state.emit('groupTargetSet', {
      targetX: gameX,
      targetY: gameY,
      selections: Array.from(selections)
    })
  }

  updateIndicators (selections: Set<number>): void {
    this.selectionIndicator?.updateIndicators(selections)
  }

  update (_dt: number): void {
    // Update method for System interface
  }

  render (): void {
    // Render method for System interface
  }

  destroy (): void {
    if (this.isDestroyed) return
    this.isDestroyed = true

    if (this.selectionIndicator) {
      this.selectionIndicator.destroy()
      this.selectionIndicator = null
    }

    this.gameEngine = null as unknown as GameEngine
  }
}

export function createSelectionSystem (gameEngine: GameEngine): SelectionSystem {
  return new SelectionSystem(gameEngine)
}
