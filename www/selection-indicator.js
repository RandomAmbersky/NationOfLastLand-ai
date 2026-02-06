import { GAME_CONFIG } from './game-config.js'

/**
 * Управляет созданием и управлением индикаторов выделения сущностей
 */
export class SelectionIndicatorManager {
  constructor (gameDemo) {
    this.gameDemo = gameDemo
  }

  /**
   * Создает индикатор выделения для сущности
   * @param {Object} entity - Сущность, для которой нужно создать индикатор
   * @param {boolean} isEnemy - Флаг, указывающий, является ли сущность врагом
   */
  createSelectionIndicator (entity, isEnemy = false) {
    const graphics = new PIXI.Graphics()
    const color = isEnemy
      ? GAME_CONFIG.COLORS.selection.enemy
      : GAME_CONFIG.COLORS.selection.player
    graphics.lineStyle(3, color, 1)
    graphics.drawCircle(0, 0, 12)
    entity.container.addChild(graphics)
    entity.selectionIndicator = graphics
  }

  /**
   * Удаляет индикатор выделения с сущности
   * @param {Object} entity - Сущность, с которой нужно удалить индикатор
   */
  removeSelectionIndicator (entity) {
    if (entity && entity.selectionIndicator) {
      entity.container.removeChild(entity.selectionIndicator)
      entity.selectionIndicator = null
    }
  }

  /**
   * Обновляет состояние индикаторов выделения для всех сущностей
   * @param {Set} selectedEntityIds - Множество ID выбранных сущностей
   */
  updateSelectionIndicators (selectedEntityIds) {
    // Удаляем индикаторы для сущностей, которые больше не выбраны
    for (const [entityId, entity] of this.gameDemo.entities) {
      if (entity.selectionIndicator && !selectedEntityIds.has(entityId)) {
        this.removeSelectionIndicator(entity)
      }
    }

    // Добавляем индикаторы для новых выбранных сущностей
    for (const entityId of selectedEntityIds) {
      const entity = this.gameDemo.entities.get(entityId)
      if (entity && !entity.selectionIndicator) {
        const isEnemy =
          entity.fraction === 'Enemy' ||
          entity.fraction === 'Wild' ||
          entity.entityType === 'alert'
        console.log(
          `Creating indicator for entity ${entityId}, isEnemy=${isEnemy}`
        )
        this.createSelectionIndicator(entity, isEnemy)
      }
    }
  }

  /**
   * Проверяет и исправляет несогласованности в состоянии выделения
   */
  validateAndFixSelectionState () {
    const inconsistencies = []
    const selectedEntityIds =
      this.gameDemo.stateManager.getSelectionState().selectedEntityIds

    // Проверяем, что все выбранные сущности имеют индикаторы
    for (const entityId of selectedEntityIds) {
      const entity = this.gameDemo.entities.get(entityId)
      if (!entity) {
        inconsistencies.push(
          `Entity ${entityId} in selection but not in entities map`
        )
      } else if (!entity.selectionIndicator) {
        inconsistencies.push(
          `Entity ${entityId} selected but has no visual indicator`
        )
      }
    }

    // Проверяем, что все индикаторы соответствуют выделению
    for (const [entityId, entity] of this.gameDemo.entities) {
      if (entity.selectionIndicator && !selectedEntityIds.has(entityId)) {
        inconsistencies.push(
          `Entity ${entityId} has indicator but not in selection`
        )
      }
    }

    if (inconsistencies.length > 0) {
      console.warn(
        'Selection state inconsistencies detected:',
        inconsistencies
      )
      this.updateSelectionIndicators(selectedEntityIds)
    }
  }
}
