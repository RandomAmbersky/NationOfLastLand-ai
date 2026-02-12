/**
 * Renderer System - Handles entity rendering and visual effects
 * Extracted from original EntityRenderer for better separation of concerns
 */

import { GAME_CONFIG } from '../config/game-config.js'
import { createCoordinateTransformer } from '../utils/coordinate-transformer.js'

export class RendererSystem {
  constructor (gameEngine, coordinateService = null) {
    this.gameEngine = gameEngine
    this.coordinateService = coordinateService
    this.transformer = null
    this.app = null
    this.targetIndicator = null
    this.alertHighlight = null
    this.gridContainer = null
    this.isDestroyed = false
    this.entitySpawnSystem = null
  }

  init (app) {
     this.app = app
     this.transformer = createCoordinateTransformer(app)
     this.setupGrid()
     // Добавляем app в gameEngine для использования другими системами
     this.gameEngine.app = app
     // Устанавливаем ссылку на себя в gameEngine для других систем
     this.gameEngine.rendererSystem = this
   }

  /**
   * Получить отрисованную сущность по ID
   */
  getEntity (id) {
    const entities = this.gameEngine.state.get('entities')
    if (!(entities instanceof Map)) return null
    return entities.get(id)
  }

  /**
   * Get the coordinate transformer instance
   */
  _getTransformer() {
    if (this.transformer) return this.transformer
    if (this.coordinateService && this.coordinateService.getTransformer) {
      return this.coordinateService.getTransformer()
    }
    if (this.app) {
      this.transformer = createCoordinateTransformer(this.app)
      return this.transformer
    }
    return null
  }

  // ============== Инкапсулирующий API для работы с контейнерами ==============

  /**
   * Get container for an entity
   * @param {number} id - Entity ID
   * @returns {PIXI.Container|null} Entity container or null
   */
  getEntityContainer(id) {
    const entity = this.getEntity(id)
    return entity ? entity.container : null
  }

  /**
   * Get graphics for an entity
   * @param {number} id - Entity ID
   * @returns {PIXI.Graphics|null} Entity graphics or null
   */
  getEntityGraphics(id) {
    const entity = this.getEntity(id)
    return entity ? entity.graphics : null
  }

  /**
   * Get game coordinates for an entity
   * @param {number} id - Entity ID
   * @returns {{gameX: number, gameY: number}|null} Game coordinates or null
   */
  getEntityCoordinates(id) {
    const entity = this.getEntity(id)
    if (!entity) return null
    return { gameX: entity.gameX, gameY: entity.gameY }
  }

  /**
   * Add entity to container (abstracts addChild)
   * @param {Object} entity - Entity object
   * @param {PIXI.Container} container - Parent container
   */
  addEntityToContainer(entity, container) {
    if (!entity || !entity.container || !container) return
    container.addChild(entity.container)
  }

  /**
   * Remove entity from its container (abstracts removeChild)
   * @param {Object} entity - Entity object
   */
  removeEntityFromContainer(entity) {
    if (!entity || !entity.container) return
    if (entity.container.parent) {
      entity.container.parent.removeChild(entity.container)
    }
  }

  /**
   * Add container to stage (abstracts addChild)
   * @param {PIXI.Container} container - Container to add
   */
  addToStage(container) {
    if (!container || !this.app) return
    this.app.stage.addChild(container)
  }

  /**
   * Remove container from stage (abstracts removeChild)
   * @param {PIXI.Container} container - Container to remove
   */
  removeFromStage(container) {
    if (!container || !this.app) return
    if (container.parent) {
      container.parent.removeChild(container)
    }
  }

  /**
   * Transform game coordinates to screen coordinates
   * Returns { x, y, scaleX, scaleY }
   */
  _toScreenCoords(gameX, gameY) {
    const transformer = this._getTransformer()
    if (!transformer) return { x: 0, y: 0, scaleX: 1, scaleY: 1 }
    
    const { x, y } = transformer.normalizeCoords(gameX, gameY)
    const { x: scaleX, y: scaleY } = transformer.getScale()
    return { x: x * scaleX, y: y * scaleY, scaleX, scaleY }
  }

  /**
   * Обновить позицию сущности на основе данных из state.entities
   */
  updateEntityPosition (id, gameX, gameY) {
    const entities = this.gameEngine.state.get('entities')
    if (!(entities instanceof Map)) return
    
    const entity = entities.get(id)
    if (!entity || !entity.container) return

    const coords = this._toScreenCoords(gameX, gameY)

    entity.container.x = coords.x
    entity.container.y = coords.y
    entity.x = coords.x
    entity.y = coords.y
    entity.gameX = gameX
    entity.gameY = gameY
  }

  /**
   * Установить систему для спавна сущностей
   */
  setEntitySpawnSystem(entitySpawnSystem) {
    this.entitySpawnSystem = entitySpawnSystem
  }

  /**
   * Создать спрайт сущности и добавить в state.entities
   * Возвращает объект сущности с container и graphics
   */
  createEntitySprite (id, x, y, vehicleType, faction = null, entityType = 'vehicle') {
    const coords = this._toScreenCoords(x, y)
    const screenX = coords.x
    const screenY = coords.y
    const posX = x
    const posY = y
    const scaleX = coords.scaleX
    const scaleY = coords.scaleY

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
    container.gameX = posX
    container.gameY = posY
    this.addToStage(container)

    const entity = {
      id,
      container,
      graphics,
      type: entityType,
      vehicleType,
      faction,
      gameX: posX,
      gameY: posY,
      screenX,
      screenY
    }

    // Добавляем в state.entities
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
   * Удалить сущность из state.entities
   */
  removeEntity (id) {
    const entities = this.gameEngine.state.get('entities')
    if (!(entities instanceof Map)) return

    const entity = entities.get(id)
    if (!entity || !entity.container) return

    this.removeFromStage(entity.container)
    entity.container.destroy({ children: true, texture: true, baseTexture: true })

    entities.delete(id)
    this.gameEngine.state.merge({ entities }, 'entitiesUpdated')
  }

  showTargetIndicator (gameX, gameY) {
    if (this.targetIndicator) {
      this.removeFromStage(this.targetIndicator)
      this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
    }

    const coords = this._toScreenCoords(gameX, gameY)
    const screenX = coords.x
    const screenY = coords.y

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
    this.addToStage(container)

    this.targetIndicator = container
  }

  clearTargetIndicator () {
    if (this.targetIndicator) {
      this.removeFromStage(this.targetIndicator)
      this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
      this.targetIndicator = null
    }
  }

  setupGrid () {
    if (this.gridContainer) {
      this.removeFromStage(this.gridContainer)
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
    this.addToStage(this.gridContainer)
  }

  updateGrid () {
    if (!this.gridContainer) return
    if (this.app) {
      this.removeFromStage(this.gridContainer)
      this.gridContainer.destroy({ children: true, texture: true, baseTexture: true })
    }
    this.setupGrid()
  }

  update (_dt) {
    // Scale is calculated on demand via transformer.getScale()
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
   * Get scale factors from transformer
   */
  _getScale() {
    const transformer = this._getTransformer()
    return transformer ? transformer.getScale() : { x: 1, y: 1 }
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

    // Если есть EntitySpawnSystem - делегируем спавн
    if (this.entitySpawnSystem) {
      const newEntities = this.entitySpawnSystem.processSpawns(entities)
      const removedCount = this.entitySpawnSystem.processDeletions(entities)

      console.log('RendererSystem._syncEntities:', {
        entitiesCount,
        newEntitiesCreated: newEntities.length,
        entitiesRemoved: removedCount
      })
      return
    }

    console.warn('RendererSystem._syncEntities: no EntitySpawnSystem available')
  }

  destroy () {
    if (this.isDestroyed) return
    this.isDestroyed = true

    if (this.targetIndicator) {
      this.removeFromStage(this.targetIndicator)
      this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
      this.targetIndicator = null
    }

    if (this.alertHighlight) {
      this.removeFromStage(this.alertHighlight)
      this.alertHighlight.destroy({ children: true, texture: true, baseTexture: true })
      this.alertHighlight = null
    }

    if (this.gridContainer) {
      this.removeFromStage(this.gridContainer)
      this.gridContainer.destroy({ children: true, texture: true, baseTexture: true })
      this.gridContainer = null
    }

    if (this.entitySpawnSystem) {
      this.entitySpawnSystem.destroy()
      this.entitySpawnSystem = null
    }

    this.gameEngine = null
    this.app = null
    this.transformer = null
  }
}

export function createRenderer (gameEngine, coordinateService = null) {
  return new RendererSystem(gameEngine, coordinateService)
}
