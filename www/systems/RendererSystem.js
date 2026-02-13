/**
 * Renderer System - Handles entity rendering and visual effects
 * Extracted from original EntityRenderer for better separation of concerns
 */

import { GAME_CONFIG } from '../config/game-config.js'
import { createRepository } from '../core/EntityRepository.js'
import { drawEntity, createEntitySprite } from '../utils/entity-drawer.js'
import { TransformerProvider } from '../utils/TransformerMixin.js'

export class RendererSystem extends TransformerProvider {
  constructor (gameEngine, coordinateService = null) {
    super()
    this.gameEngine = gameEngine
    this.coordinateService = coordinateService
    this.app = null
    this.targetIndicator = null
    this.alertHighlight = null
    this.gridContainer = null
    this.isDestroyed = false
    this.entityRepository = null
  }

  init (app) {
    this.app = app
    this.entityRepository = createRepository(this.gameEngine.state)
    this.setupGrid()
    this.gameEngine.app = app
    this.gameEngine.rendererSystem = this
    // Initialize transformer from app
    if (!this.transformer && this.app) {
      this.transformer = this.getTransformer()
    }
  }

  /**
   * Получить отрисованную сущность по ID
   */
  getEntity (id) {
    return this.entityRepository.getById(id)
  }

  /**
   * Get the coordinate transformer instance
   * Override to support coordinateService, otherwise uses mixin's getTransformer()
   */
  getTransformer() {
    if (this.transformer) return this.transformer
    if (this.coordinateService && this.coordinateService.getTransformer) {
      return this.coordinateService.getTransformer()
    }
    // Use mixin's getTransformer() which has fallback chain
    return super.getTransformer()
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
    const transformer = this.getTransformer()
    if (!transformer) return { x: 0, y: 0, scaleX: 1, scaleY: 1 }
    
    const { x, y } = transformer.normalizeCoords(gameX, gameY)
    const { x: scaleX, y: scaleY } = transformer.getScale()
    return { x: x * scaleX, y: y * scaleY, scaleX, scaleY }
  }

  /**
   * Обновить позицию сущности на основе данных из state.entities
   */
  updateEntityPosition (id, gameX, gameY) {
    const entity = this.getEntity(id)
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
    const entityData = {
      id,
      entity_type: entityType,
      subtype: vehicleType,
      fraction: faction,
      position: { x, y }
    }

    const coords = this._toScreenCoords(x, y)

    const entity = createEntitySprite(id, coords.x, coords.y, entityData)
    entity.screenX = coords.x
    entity.screenY = coords.y
    entity.gameX = x
    entity.gameY = y

    this.addToStage(entity.container)

    // Добавляем в state.entities через репозиторий
    this.entityRepository.add(entity)

    return entity
  }

  /**
   * Удалить сущность из state.entities
   */
  removeEntity (id) {
    this.entityRepository.remove(id)
    
    // Also remove from stage if exists
    const entities = this.gameEngine.state.get('entities')
    const entity = entities.get(id)
    if (entity && entity.container) {
      this.removeFromStage(entity.container)
      entity.container.destroy({ children: true, texture: true, baseTexture: true })
    }
  }

  showTargetIndicator (gameX, gameY) {
    if (this.targetIndicator) {
      this.removeFromStage(this.targetIndicator)
      this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
      this.targetIndicator = null
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
    const gridConfig = GAME_CONFIG.GRID
    gridGraphics.lineStyle(1, gridConfig.color, gridConfig.alpha)

    const gridSize = gridConfig.spacing
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
    this.setupGrid()
  }

  update (_dt) {
    // Scale is calculated on demand via transformer.getScale()
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
    const transformer = this.getTransformer()
    return transformer ? transformer.getScale() : { x: 1, y: 1 }
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
    this.entityRepository = null
  }
}

export function createRenderer (gameEngine, coordinateService = null) {
  return new RendererSystem(gameEngine, coordinateService)
}
