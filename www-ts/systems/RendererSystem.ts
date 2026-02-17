/**
 * Renderer System - Handles entity rendering and visual effects
 * Extracted from original EntityRenderer for better separation of concerns
 */

import type { GameEngine, System } from '../core/GameEngine.js'
import type { StateContainer } from '../core/StateContainer.js'
import { GAME_CONFIG } from '../config/game-config.js'
import { createEntitySprite } from '../utils/entityDrawer.js'

export class RendererSystem implements System {
  public gameEngine: GameEngine
  public app: PIXI.Application | null
  public targetIndicator: PIXI.Container | null
  public alertHighlight: PIXI.Container | null
  public gridContainer: PIXI.Container | null
  public isDestroyed: boolean
  private _unsubscribeEntityUpdates: (() => void) | null

  constructor (gameEngine: GameEngine, coordinateService: unknown = null) {
    this.gameEngine = gameEngine
    this.app = null
    this.targetIndicator = null
    this.alertHighlight = null
    this.gridContainer = null
    this.isDestroyed = false
    this._unsubscribeEntityUpdates = null
  }

  init (app: PIXI.Application): void {
    this.app = app
    this.setupGrid()
    this.gameEngine.app = app
    this.gameEngine.rendererSystem = this
    // Subscribe to entity updates
    this._unsubscribeEntityUpdates = this.gameEngine.state.subscribe('entitiesUpdated', (state) => {
      // StateContainer merge() passes the entire state object, not just the updated field
      const entities = state.entities as Map<number, unknown>
      this.handleEntitiesUpdated(entities)
    })
  }

  /**
   * Получить отрисованную сущность по ID
   */
  getEntity (id: number): { container?: PIXI.Container, graphics?: PIXI.Graphics } | null {
    const entities = this.gameEngine.state.get('entities') as Map<number, { container?: PIXI.Container, graphics?: PIXI.Graphics }>
    return entities.get(id) || null
  }

  // ============== Инкапсулирующий API для работы с контейнерами ==============

  /**
   * Get container for an entity
   * @param id - Entity ID
   * @returns Entity container or null
   */
  getEntityContainer (id: number): PIXI.Container | null {
    const entity = this.getEntity(id)
    return entity ? entity.container : null
  }

  /**
   * Get graphics for an entity
   * @param id - Entity ID
   * @returns Entity graphics or null
   */
  getEntityGraphics (id: number): PIXI.Graphics | null {
    const entity = this.getEntity(id)
    return entity ? entity.graphics : null
  }

  /**
   * Get game coordinates for an entity
   * @param id - Entity ID
   * @returns Game coordinates or null
   */
  getEntityCoordinates (id: number): { gameX: number, gameY: number } | null {
    const entity = this.getEntity(id)
    if (!entity) return null
    return { gameX: (entity as { gameX?: number }).gameX ?? 0, gameY: (entity as { gameY?: number }).gameY ?? 0 }
  }

  /**
   * Add entity to container (abstracts addChild)
   * @param entity - Entity object
   * @param container - Parent container
   */
  addEntityToContainer (entity: { container?: PIXI.Container }, container: PIXI.Container): void {
    if (!entity || !entity.container || !container) return
    container.addChild(entity.container)
  }

  /**
   * Remove entity from its container (abstracts removeChild)
   * @param entity - Entity object
   */
  removeEntityFromContainer (entity: { container?: PIXI.Container }): void {
    if (!entity || !entity.container) return
    if (entity.container.parent) {
      entity.container.parent.removeChild(entity.container)
    }
  }

  /**
   * Add container to stage (abstracts addChild)
   * @param container - Container to add
   */
  addToStage (container: PIXI.Container): void {
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
   * @param container - Container to remove
   */
  removeFromStage (container: PIXI.Container): void {
    if (!container || !this.app) return
    if (container.parent) {
      container.parent.removeChild(container)
    }
  }

  /**
   * Transform game coordinates to screen coordinates
   * Returns { x, y, scaleX, scaleY }
   */
  _toScreenCoords (gameX: number, gameY: number): { x: number, y: number, scaleX: number, scaleY: number } {
    const transformer = this.gameEngine.transformer as { normalizeCoords: (x: number, y?: number) => { x: number, y: number }, getScale: () => { x: number, y: number } }
    if (!transformer) return { x: 0, y: 0, scaleX: 1, scaleY: 1 }
    const { x, y } = transformer.normalizeCoords(gameX, gameY)
    const { x: scaleX, y: scaleY } = transformer.getScale()
    return { x: x * scaleX, y: y * scaleY, scaleX, scaleY }
  }

  /**
   * Обновить позицию сущности на основе данных из state.entities
   */
  updateEntityPosition (id: number, gameX: number, gameY: number): void {
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
  setEntitySpawnSystem (entitySpawnSystem: unknown): void {
    this.gameEngine.entitySpawnSystem = entitySpawnSystem
  }

  /**
   * Создать спрайт сущности и добавить в state.entities
   * Возвращает объект сущности с container и graphics
   */
  createEntitySprite (
    id: number,
    x: number,
    y: number,
    vehicleType: string,
    faction: string | null = null,
    entityType: string = 'vehicle'
  ): {
    id: number
    container: PIXI.Container
    graphics: PIXI.Graphics
    type: string
    vehicleType: string
    fraction: string | null
    gameX: number
    gameY: number
    screenX: number
    screenY: number
  } {
    const entityData = {
      id,
      entity_type: entityType,
      subtype: vehicleType,
      fraction,
      position: { x, y }
    }

    const coords = this._toScreenCoords(x, y)

    const entity = createEntitySprite(id, coords.x, coords.y, entityData)
    entity.screenX = coords.x
    entity.screenY = coords.y
    entity.gameX = x
    entity.gameY = y

    this.addToStage(entity.container)

    // Добавляем в state.entities
    const entities = this.gameEngine.state.get('entities') as Map<number, typeof entity>
    entities.set(entity.id, entity)
    this.gameEngine.state.merge({ entities }, 'entitiesUpdated')

    return entity
  }

  /**
   * Удалить сущность из state.entities
   */
  removeEntity (id: number): void {
    const entities = this.gameEngine.state.get('entities') as Map<number, { container?: PIXI.Container }>
    entities.delete(id)
    this.gameEngine.state.merge({ entities }, 'entitiesUpdated')

    // Also remove from stage if exists
    const entity = entities.get(id)
    if (entity && entity.container) {
      this.removeFromStage(entity.container)
      entity.container.destroy({ children: true, texture: true, baseTexture: true })
    }
  }

  showTargetIndicator (gameX: number, gameY: number): void {
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

  clearTargetIndicator (): void {
    if (this.targetIndicator) {
      this.removeFromStage(this.targetIndicator)
      this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
      this.targetIndicator = null
    }
  }

  setupGrid (): void {
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
      gridGraphics.lineTo(scaledX, this.app!.screen.height)
    }

    for (let y = 0; y <= GAME_CONFIG.WORLD_SIZE.height; y += gridSize) {
      const scaledY = y * scaleY
      gridGraphics.moveTo(0, scaledY)
      gridGraphics.lineTo(this.app!.screen.width, scaledY)
    }

    this.gridContainer.addChild(gridGraphics)
    this.addToStage(this.gridContainer)
  }

  updateGrid (): void {
    if (!this.gridContainer) return
    this.setupGrid()
  }

  update (_dt: number): void {
    // Scale is calculated on demand via transformer.getScale()
  }

  /**
   * Handle entitiesUpdated event from state
   * Updates positions of existing entities and creates new ones
   */
  handleEntitiesUpdated (entities: Map<number, unknown>): void {
    if (!entities || !(entities instanceof Map)) return

    for (const [id, entity] of entities) {
      let storedEntity = this.getEntity(id)

      if (!storedEntity && (entity as { gameX?: number, gameY?: number }).gameX !== undefined && (entity as { gameY?: number }).gameY !== undefined) {
        const coords = this._toScreenCoords((entity as { gameX: number }).gameX, (entity as { gameY: number }).gameY)
        storedEntity = createEntitySprite(id, coords.x, coords.y, entity as { gameX: number, gameY: number })
        storedEntity.screenX = coords.x
        storedEntity.screenY = coords.y
        storedEntity.gameX = (entity as { gameX: number }).gameX
        storedEntity.gameY = (entity as { gameY: number }).gameY
        this.addToStage(storedEntity.container)
        // Добавляем в state.entities
        const entitiesMap = this.gameEngine.state.get('entities') as Map<number, typeof storedEntity>
        entitiesMap.set(storedEntity.id, storedEntity)
        this.gameEngine.state.merge({ entities: entitiesMap }, 'entitiesUpdated')
      } else if (storedEntity && storedEntity.container && (entity as { gameX?: number, gameY?: number }).gameX !== undefined && (entity as { gameY?: number }).gameY !== undefined) {
        storedEntity.gameX = (entity as { gameX: number }).gameX
        storedEntity.gameY = (entity as { gameY: number }).gameY
        const coords = this._toScreenCoords((entity as { gameX: number }).gameX, (entity as { gameY: number }).gameY)
        storedEntity.container.x = coords.x
        storedEntity.container.y = coords.y
        storedEntity.x = coords.x
        storedEntity.y = coords.y
      }
    }
  }

  /**
   * Отрисовка сущностей (вызывается из GameEngine.render())
   */
  render (): void {
    // В текущей реализации отрисовка происходит при создании/обновлении сущностей
  }

  /**
   * Get scale factors from transformer
   */
  _getScale (): { x: number, y: number } {
    const transformer = this.gameEngine.transformer
    if (!transformer) {
      console.warn('RendererSystem: _getScale() called but transformer is null!')
    }
    return transformer ? (transformer as { getScale: () => { x: number, y: number } }).getScale() : { x: 1, y: 1 }
  }

  destroy (): void {
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

    if (this.gameEngine.entitySpawnSystem) {
      // this.gameEngine.entitySpawnSystem.destroy()
      this.gameEngine.entitySpawnSystem = null
    }

    this.gameEngine = null as unknown as GameEngine
    this.app = null
  }
}

export function createRenderer (gameEngine: GameEngine, coordinateService: unknown = null): RendererSystem {
  return new RendererSystem(gameEngine, coordinateService)
}
