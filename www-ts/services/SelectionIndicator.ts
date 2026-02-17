/**
 * Selection Indicator Service - Manages visual selection indicators
 * Handles selection rings and info overlays for entities
 * Works through RendererSystem for entity access
 */

import type { GameEngine, System } from '../core/GameEngine.js'
import { GAME_CONFIG } from '../config/game-config.js'

export class SelectionIndicator implements System {
  public gameEngine: GameEngine
  public rendererSystem: unknown | null
  public transformer: unknown | null
  public isDestroyed: boolean

  constructor (gameEngine: GameEngine, rendererSystem: unknown | null = null) {
    this.gameEngine = gameEngine
    this.rendererSystem = rendererSystem
    this.transformer = null
    this.isDestroyed = false
  }

  setTransformer (transformer: unknown): void {
    this.transformer = transformer
  }

  getTransformer (): unknown | null {
    return this.transformer
  }

  init (app: PIXI.Application): void {
    // Transformer is set via setTransformer from gameEngine
  }

  createSelectionIndicator (entity: { container?: PIXI.Container }, isEnemy = false): void {
    if (!this.transformer) return
    if (!entity || !entity.container) return

    const indicatorGraphics = new PIXI.Graphics()
    const color = isEnemy
      ? GAME_CONFIG.COLORS.selection.enemy
      : GAME_CONFIG.COLORS.selection.player
    indicatorGraphics.lineStyle(3, color, 1)
    indicatorGraphics.drawCircle(0, 0, 12)

    // Add indicator to entity container
    entity.container.addChild(indicatorGraphics)

    if (!entity.container) {
      entity.container = new PIXI.Container()
    }
    entity.selectionIndicator = indicatorGraphics
  }

  removeSelectionIndicator (entity: { container?: PIXI.Container, selectionIndicator?: PIXI.Graphics }): void {
    if (entity && entity.selectionIndicator) {
      entity.selectionIndicator.parent?.removeChild(entity.selectionIndicator)
      entity.selectionIndicator = null
    }
  }

  removeInfoIndicator (entity: { container?: PIXI.Container, infoIndicator?: PIXI.Container }): void {
    if (entity && entity.infoIndicator) {
      entity.infoIndicator.parent?.removeChild(entity.infoIndicator)

      if (entity.infoIndicator.destroy) {
        entity.infoIndicator.destroy({ children: true, texture: true, baseTexture: true })
      }
      entity.infoIndicator = null
    }
  }

  updateIndicators (selections: Set<number>): void {
    if (!this.transformer) return

    // Get entities from gameEngine state
    const entities = this.gameEngine.state.get('entities') as Map<number, unknown>

    // Remove infoIndicator from all entities
    for (const [, entity] of entities) {
      if (entity && (entity as { infoIndicator?: PIXI.Container }).infoIndicator) {
        this.removeInfoIndicator(entity as { container?: PIXI.Container, infoIndicator?: PIXI.Container })
      }
    }

    // Remove selection indicators from non-selected entities
    for (const [entityId, entity] of entities) {
      if (entity && (entity as { selectionIndicator?: PIXI.Graphics }).selectionIndicator && !selections.has(entityId)) {
        this.removeSelectionIndicator(entity as { container?: PIXI.Container, selectionIndicator?: PIXI.Graphics })
      }
    }

    // Add selection indicators for selected entities
    for (const entityId of selections) {
      const entity = entities.get(entityId)
      if (entity && !(entity as { selectionIndicator?: PIXI.Graphics }).selectionIndicator) {
        const isEnemy =
          (entity as { fraction?: string }).fraction === 'Enemy' ||
          (entity as { fraction?: string }).fraction === 'Wild' ||
          (entity as { type?: string }).type === 'alert'
        this.createSelectionIndicator(entity as { container?: PIXI.Container }, isEnemy)
      }
    }
  }

  destroy (): void {
    if (this.isDestroyed) return
    this.isDestroyed = true

    const entities = this.gameEngine.state.get('entities') as Map<number, unknown>
    for (const [, entity] of entities) {
      if (entity && (entity as { selectionIndicator?: PIXI.Graphics }).selectionIndicator) {
        this.removeSelectionIndicator(entity as { container?: PIXI.Container, selectionIndicator?: PIXI.Graphics })
      }
      if (entity && (entity as { infoIndicator?: PIXI.Container }).infoIndicator) {
        this.removeInfoIndicator(entity as { container?: PIXI.Container, infoIndicator?: PIXI.Container })
      }
    }

    this.transformer = null
    this.gameEngine = null as unknown as GameEngine
    this.rendererSystem = null
  }

  validateAndFixSelectionState (): boolean {
    const selections = this.gameEngine.state.get('selections') as Set<number>
    const entities = this.gameEngine.state.get('entities') as Map<number, unknown>
    let hadFixes = false

    for (const [entityId, entity] of entities) {
      if (entity && (entity as { selectionIndicator?: PIXI.Graphics }).selectionIndicator && !selections.has(entityId)) {
        console.warn('Entity ' + entityId + ' has indicator but not in selection - removing')
        this.removeSelectionIndicator(entity as { container?: PIXI.Container, selectionIndicator?: PIXI.Graphics })
        hadFixes = true
      }
    }

    for (const entityId of selections) {
      const entity = entities.get(entityId)
      if (entity && !(entity as { selectionIndicator?: PIXI.Graphics }).selectionIndicator) {
        console.warn('Entity ' + entityId + ' is selected but missing indicator - adding')
        const isEnemy =
          (entity as { fraction?: string }).fraction === 'Enemy' ||
          (entity as { fraction?: string }).fraction === 'Wild' ||
          (entity as { type?: string }).type === 'alert'
        this.createSelectionIndicator(entity as { container?: PIXI.Container }, isEnemy)
        hadFixes = true
      }
    }

    for (const entityId of selections) {
      if (!entities.has(entityId)) {
        console.warn('Entity ' + entityId + ' in selection but no longer exists - removing from selection')
        selections.delete(entityId)
        hadFixes = true
      }
    }

    return !hadFixes
  }

  update (_dt: number): void {
    // Update method for System interface
  }

  render (): void {
    // Render method for System interface
  }
}

export function createSelectionIndicator (gameEngine: GameEngine): SelectionIndicator {
  return new SelectionIndicator(gameEngine)
}
