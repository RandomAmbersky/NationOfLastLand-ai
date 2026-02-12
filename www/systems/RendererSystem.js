/**
 * Renderer System - Handles entity rendering and visual effects
 * Extracted from original EntityRenderer for better separation of concerns
 */

import { GAME_CONFIG } from '../config/game-config.js'

export class RendererSystem {
  constructor (gameEngine) {
    this.gameEngine = gameEngine
    this.app = null
    this.targetIndicator = null
    this.alertHighlight = null
    this.gridContainer = null
    this.isDestroyed = false
    this._cachedScale = null
    // Следим за сущностями, которые отрисовали (для очистки при удалении)
    this._renderedEntities = new Map()
  }

  init (app) {
    this.app = app
    this._updateScaleCache()
    this.setupGrid()
  }

  /**
   * Получить отрисованную сущность по ID
   */
  getEntity (id) {
    return this._renderedEntities.get(id)
  }

  /**
   * Обновить позицию сущности на основе данных из state.entities
   */
  updateEntityPosition (id, gameX, gameY) {
    const entity = this._renderedEntities.get(id)
    if (!entity || !entity.container) return

    const { x: scaleX, y: scaleY } = this._getScale()
    const screenX = gameX * scaleX
    const screenY = gameY * scaleY

    entity.container.x = screenX
    entity.container.y = screenY
    entity.x = screenX
    entity.y = screenY
    entity.gameX = gameX
    entity.gameY = gameY
  }

  /**
   * Создать спрайт сущности и добавить в state.entities
   * Возвращает объект сущности с container и graphics
   */
  createEntitySprite (id, x, y, vehicleType, faction = null, entityType = 'vehicle') {
    const { x: scaleX, y: scaleY } = this._getScale()
    const screenX = x * scaleX
    const screenY = y * scaleY

    const graphics = new PIXI.Graphics()
    let color

    if (entityType === 'base') {
      color = 0x2196F3
      graphics.beginFill(color)
      graphics.drawRect(-15, -15, 30, 30)
    } else if (entityType === 'alert') {
      // Алерты - желтые треугольники
      color = GAME_CONFIG.COLORS.alert
      graphics.beginFill(color)
      graphics.moveTo(0, -8)
      graphics.lineTo(6, 6)
      graphics.lineTo(-6, 6)
      graphics.closePath()
      graphics.endFill()
    } else {
      // Виды транспорта: scout, tank, transport
      switch (vehicleType) {
        case 'scout':
          color = faction === 'Neutral'
            ? GAME_CONFIG.COLORS.neutral.scout
            : (faction === 'Enemy' || faction === 'Wild')
              ? GAME_CONFIG.COLORS.enemy.scout
              : GAME_CONFIG.COLORS.player.scout
          graphics.beginFill(color)
          graphics.drawRect(-4, -4, 8, 8)
          break
        case 'tank':
          color = faction === 'Neutral'
            ? GAME_CONFIG.COLORS.neutral.tank
            : (faction === 'Enemy' || faction === 'Wild')
              ? GAME_CONFIG.COLORS.enemy.tank
              : GAME_CONFIG.COLORS.player.tank
          graphics.beginFill(color)
          graphics.drawRect(-10, -8, 20, 16)
          break
        case 'transport':
          color = faction === 'Neutral'
            ? GAME_CONFIG.COLORS.neutral.transport
            : (faction === 'Enemy' || faction === 'Wild')
              ? GAME_CONFIG.COLORS.enemy.transport
              : GAME_CONFIG.COLORS.player.transport
          graphics.beginFill(color)
          graphics.drawRect(-12, -10, 24, 20)
          break
        default:
          // Неизвестный тип транспорта - белый квадрат
          color = 0xFFFFFF
          graphics.beginFill(color)
          graphics.drawRect(-4, -4, 8, 8)
      }
    }

    graphics.endFill()

    const container = new PIXI.Container()
    container.addChild(graphics)
    container.x = screenX
    container.y = screenY
    container.gameX = x
    container.gameY = y
    this.app.stage.addChild(container)

    const entity = {
      id,
      container,
      graphics,
      type: entityType,
      vehicleType,
      faction,
      gameX: x,
      gameY: y,
      screenX,
      screenY
    }

    // Добавляем в отрисованные сущности
    this._renderedEntities.set(id, entity)

    // Обновляем state.entities - добавляем container для рендеринга
    const entities = this.gameEngine.state.get('entities')
    if (entities instanceof Map) {
      const existingEntity = entities.get(id)
      if (existingEntity) {
        // Обновляем существующую сущность контейнером
        entities.set(id, { ...existingEntity, container, graphics })
      } else {
        entities.set(id, entity)
      }
      this.gameEngine.state.merge({ entities }, 'entitiesUpdated')
    }

    return entity
  }

  /**
   * Удалить сущность из отрисованных и из state.entities
   */
  removeEntity (id) {
    const entity = this._renderedEntities.get(id)
    if (!entity) return

    if (entity.container) {
      this.app.stage.removeChild(entity.container)
      entity.container.destroy({ children: true, texture: true, baseTexture: true })
    }

    this._renderedEntities.delete(id)

    // Удаляем из state.entities
    const entities = this.gameEngine.state.get('entities')
    if (entities instanceof Map) {
      entities.delete(id)
      this.gameEngine.state.merge({ entities }, 'entitiesUpdated')
    }
  }

  showTargetIndicator (gameX, gameY) {
    if (this.targetIndicator) {
      this.app.stage.removeChild(this.targetIndicator)
      this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
    }

    const { x: scaleX, y: scaleY } = this._getScale()
    const screenX = gameX * scaleX
    const screenY = gameY * scaleY

    const container = new PIXI.Container()
    const graphics = new PIXI.Graphics()

    graphics.lineStyle(2, 0x00FF00, 1)
    graphics.drawCircle(0, 0, 10)
    graphics.moveTo(-15, 0)
    graphics.lineTo(15, 0)
    graphics.moveTo(0, -15)
    graphics.lineTo(0, 15)

    container.addChild(graphics)
    container.x = screenX
    container.y = screenY
    this.app.stage.addChild(container)

    this.targetIndicator = container
  }

  clearTargetIndicator () {
    if (this.targetIndicator) {
      this.app.stage.removeChild(this.targetIndicator)
      this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
      this.targetIndicator = null
    }
  }

  setupGrid () {
    if (this.gridContainer) {
      this.app.stage.removeChild(this.gridContainer)
      this.gridContainer.destroy({ children: true, texture: true, baseTexture: true })
    }

    this.gridContainer = new PIXI.Container()
    const gridGraphics = new PIXI.Graphics()
    gridGraphics.lineStyle(1, 0x444444, 0.5)

    const gridSize = 50
    const { x: scaleX, y: scaleY } = this._getScale()

    for (let x = 0; x <= GAME_CONFIG.WORLD_SIZE.width; x += gridSize) {
      const scaledX = x * scaleX
      gridGraphics.moveTo(scaledX, 0)
      gridGraphics.lineTo(scaledX, this.app.screen.height)
    }

    for (let y = 0; y <= GAME_CONFIG.WORLD_SIZE.height; y += gridSize) {
      const scaledY = y * scaleY
      gridGraphics.moveTo(0, scaledY)
      gridGraphics.lineTo(this.app.screen.width, scaledY)
    }

    this.gridContainer.addChild(gridGraphics)
    this.app.stage.addChildAt(this.gridContainer, 0)
  }

  updateGrid () {
    if (!this.gridContainer) return
    if (this.app) {
      this.app.stage.removeChild(this.gridContainer)
      this.gridContainer.destroy({ children: true, texture: true, baseTexture: true })
    }
    this.setupGrid()
  }

  update (_dt) {
    this._updateScaleCache()
    // Синхронизируем отрисованные сущности с state.entities
    this._syncEntities()
  }

  /**
   * Отрисовка сущностей (вызывается из GameEngine.render())
   */
  render () {
    // В текущей реализации отрисовка происходит при создании/обновлении сущностей
    // Этот метод может быть использован для дополнительной отрисовки (эффекты и т.д.)
  }

  /**
   * Синхронизация отрисованных сущностей с state.entities
   * Создает новые сущности и удаляет удаленные
   */
  _syncEntities () {
    const entities = this.gameEngine.state.get('entities')
    if (!(entities instanceof Map)) {
      console.warn('RendererSystem._syncEntities: entities is not a Map')
      return
    }

    const entitiesCount = entities.size
    const renderedCount = this._renderedEntities.size

    // Создаем новые сущности, которые еще не отрисованы
    const renderedIds = new Set(this._renderedEntities.keys())
    let createdCount = 0
    
    for (const [id, entityData] of entities) {
      if (!renderedIds.has(id) && entityData.container === undefined) {
        
        // WASM возвращает данные с другими именами полей:
        // - entity_type: 'base', 'alert', 'vehicle'
        // - subtype: specific type (e.g., 'floors_1', 'RaiderAlert_Hidden', 'scout')
        // - fraction: faction name
        // - position: { gameX, gameY }
        
        const entityType = entityData.entity_type || entityData.type || 'vehicle'
        const vehicleType = entityData.subtype || entityData.vehicleType
        const faction = entityData.fraction
        const x = entityData.position?.gameX || entityData.gameX || 0
        const y = entityData.position?.gameY || entityData.gameY || 0
        
        // Сущность есть в state.entities, но не отрисована
        // Создаем спрайт для нее
        this.createEntitySprite(
          entityData.id,
          x,
          y,
          vehicleType,
          faction,
          entityType
        )
        createdCount++
      }
    }

    // Удаляем сущности, которые отрисованы, но нет в state.entities
    let removedCount = 0
    for (const [id, renderedEntity] of this._renderedEntities) {
      if (!entities.has(id)) {
        this.removeEntity(id)
        removedCount++
      }
    }

    if (createdCount > 0 || removedCount > 0) {
    }
  }

  invalidateScaleCache () {
    this._cachedScale = null
  }

  _updateScaleCache () {
    if (!this.app) return
    this._cachedScale = {
      x: this.app.screen.width / GAME_CONFIG.WORLD_SIZE.width,
      y: this.app.screen.height / GAME_CONFIG.WORLD_SIZE.height
    }
  }

  _getScale () {
    return this._cachedScale || { x: 1, y: 1 }
  }

  destroy () {
    if (this.isDestroyed) return
    this.isDestroyed = true

    // Очищаем отрисованные сущности
    for (const [_id, entity] of this._renderedEntities) {
      if (entity.container) {
        this.app?.stage.removeChild(entity.container)
        entity.container.destroy({ children: true, texture: true, baseTexture: true })
      }
    }
    this._renderedEntities.clear()

    if (this.targetIndicator) {
      this.app?.stage.removeChild(this.targetIndicator)
      this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
      this.targetIndicator = null
    }

    if (this.alertHighlight) {
      this.app?.stage.removeChild(this.alertHighlight)
      this.alertHighlight.destroy({ children: true, texture: true, baseTexture: true })
      this.alertHighlight = null
    }

    if (this.gridContainer) {
      this.app?.stage.removeChild(this.gridContainer)
      this.gridContainer.destroy({ children: true, texture: true, baseTexture: true })
      this.gridContainer = null
    }

    this.gameEngine = null
    this.app = null
  }
}

export function createRenderer (gameEngine) {
  return new RendererSystem(gameEngine)
}

