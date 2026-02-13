/**
 * Renderer System - Handles entity rendering and visual effects
 * Extracted from original EntityRenderer for better separation of concerns
 */

import { GAME_CONFIG } from '../config/game-config.js'
import { createRepository } from '../core/EntityRepository.js'
import { createEntitySprite } from '../utils/entityDrawer.js'

export class RendererSystem {
  constructor (gameEngine, coordinateService = null) {
    this.gameEngine = gameEngine
    this.coordinateService = coordinateService
    this.app = null
    this.targetIndicator = null
    this.alertHighlight = null
    this.gridContainer = null
    this.isDestroyed = false
    this.entityRepository = null
    this._unsubscribeEntityUpdates = null
  }

  init (app) {
    this.app = app
    this.entityRepository = createRepository(this.gameEngine.state)
    this.setupGrid()
    this.gameEngine.app = app
    this.gameEngine.rendererSystem = this
    // Subscribe to entity updates
    this._unsubscribeEntityUpdates = this.gameEngine.state.subscribe('entitiesUpdated', (state) => {
      // StateContainer merge() passes the entire state object, not just the updated field
      const entities = state.entities
      console.log('RendererSystem: entitiesUpdated event received, entities count:', entities?.size)
      this.handleEntitiesUpdated(entities)
    })
  }

  /**
   * Получить отрисованную сущность по ID
   */
  getEntity (id) {
    return this.entityRepository.getById(id)
  }

  // ============== Инкапсулирующий API для работы с контейнерами ==============

  /**
   * Get container for an entity
   * @param {number} id - Entity ID
   * @returns {PIXI.Container|null} Entity container or null
   */
  getEntityContainer (id) {
    const entity = this.getEntity(id)
    return entity ? entity.container : null
  }

  /**
   * Get graphics for an entity
   * @param {number} id - Entity ID
   * @returns {PIXI.Graphics|null} Entity graphics or null
   */
  getEntityGraphics (id) {
    const entity = this.getEntity(id)
    return entity ? entity.graphics : null
  }

  /**
   * Get game coordinates for an entity
   * @param {number} id - Entity ID
   * @returns {{gameX: number, gameY: number}|null} Game coordinates or null
   */
  getEntityCoordinates (id) {
    const entity = this.getEntity(id)
    if (!entity) return null
    return { gameX: entity.gameX, gameY: entity.gameY }
  }

  /**
   * Add entity to container (abstracts addChild)
   * @param {Object} entity - Entity object
   * @param {PIXI.Container} container - Parent container
   */
  addEntityToContainer (entity, container) {
    if (!entity || !entity.container || !container) return
    container.addChild(entity.container)
  }

  /**
   * Remove entity from its container (abstracts removeChild)
   * @param {Object} entity - Entity object
   */
  removeEntityFromContainer (entity) {
    if (!entity || !entity.container) return
    if (entity.container.parent) {
      entity.container.parent.removeChild(entity.container)
    }
  }

  /**
   * Add container to stage (abstracts addChild)
   * @param {PIXI.Container} container - Container to add
   */
  addToStage (container) {
    if (!container) {
      console.error('RendererSystem.addToStage: container is null/undefined!')
      return
    }
    if (!this.app) {
      console.error('RendererSystem.addToStage: app is null! container:', container)
      return
    }
    console.log('RendererSystem.addToStage: Adding container to stage, children count:', container.children?.length)
    this.app.stage.addChild(container)
  }

  /**
   * Remove container from stage (abstracts removeChild)
   * @param {PIXI.Container} container - Container to remove
   */
  removeFromStage (container) {
    if (!container || !this.app) return
    if (container.parent) {
      container.parent.removeChild(container)
    }
  }

  /**
   * Transform game coordinates to screen coordinates
   * Returns { x, y, scaleX, scaleY }
   */
  _toScreenCoords (gameX, gameY) {
    const transformer = this.gameEngine.transformer
    if (!transformer) {
      console.warn('RendererSystem: _toScreenCoords called but transformer is null! gameX:', gameX, 'gameY:', gameY)
      return { x: 0, y: 0, scaleX: 1, scaleY: 1 }
    }

    const { x, y } = transformer.normalizeCoords(gameX, gameY)
    const { x: scaleX, y: scaleY } = transformer.getScale()
    const result = { x: x * scaleX, y: y * scaleY, scaleX, scaleY }
    return result
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
  setEntitySpawnSystem (entitySpawnSystem) {
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
   * Handle entitiesUpdated event from state
   * Updates positions of existing entities and creates new ones
   */
  handleEntitiesUpdated (entities) {
    if (!entities) {
      console.error('RendererSystem: entities is null/undefined')
      return
    }
    if (!(entities instanceof Map)) {
      console.error('RendererSystem: entities is not a Map', entities)
      return
    }

    console.log('RendererSystem: Processing', entities.size, 'entities')

    for (const [id, entity] of entities) {
      // Check if entity already exists in repository
      let storedEntity = this.getEntity(id)

      if (!storedEntity && entity.gameX !== undefined && entity.gameY !== undefined) {
        // Create new entity sprite
        const coords = this._toScreenCoords(entity.gameX, entity.gameY)
        console.log('RendererSystem: Creating entity', id, 'at', coords, 'from entity data', entity)
        storedEntity = createEntitySprite(id, coords.x, coords.y, entity)
        storedEntity.screenX = coords.x
        storedEntity.screenY = coords.y
        storedEntity.gameX = entity.gameX
        storedEntity.gameY = entity.gameY
        // Add container to stage (Pixi.js rendering)
        this.addToStage(storedEntity.container)
        this.entityRepository.add(storedEntity)
        console.log('RendererSystem: Created entity', id, 'with container:', storedEntity.container)
      } else if (storedEntity && entity.gameX !== undefined && entity.gameY !== undefined) {
        // Update position of existing entity
        storedEntity.gameX = entity.gameX
        storedEntity.gameY = entity.gameY
        // Update container position
        const coords = this._toScreenCoords(entity.gameX, entity.gameY)
        storedEntity.container.x = coords.x
        storedEntity.container.y = coords.y
        storedEntity.x = coords.x
        storedEntity.y = coords.y
        console.log('RendererSystem: Updated entity', id, 'to', coords)
      }
    }
  }

  /**
   * Отрисовка сущностей (вызывается из GameEngine.render())
   */
  render () {
    // В текущей реализации отрисовка происходит при создании/обновлении сущностей
    // Этот метод может быть использован для дополнительной отрисовки (эффекты и т.д.)
    const entities = this.entityRepository.getEntities()
    if (entities.size > 0 && !this.app) {
      console.warn('RendererSystem: render() called but app is null!')
    }
  }

  /**
   * Get scale factors from transformer
   */
  _getScale () {
    const transformer = this.gameEngine.transformer
    if (!transformer) {
      console.warn('RendererSystem: _getScale() called but transformer is null!')
    }
    return transformer ? transformer.getScale() : { x: 1, y: 1 }
  }

  destroy () {
    if (this.isDestroyed) return
    this.isDestroyed = true

    // Unsubscribe from entity updates
    if (this._unsubscribeEntityUpdates) {
      this._unsubscribeEntityUpdates()
      this._unsubscribeEntityUpdates = null
    }

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
