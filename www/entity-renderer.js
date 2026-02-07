import { GAME_CONFIG } from './game-config.js'
import { CoordinateService } from './coordinate-service.js'
import { calculateDistance } from './utils.js'

/**
 * Управляет рендерингом сущностей и визуальными эффектами
 */
export class EntityRenderer {
  constructor (gameDemo) {
    this.gameDemo = gameDemo
    this.targetIndicator = null
    this.targetIndicatorTimeout = null
    this.alertHighlight = null
    this.alertHighlightTimeout = null
    this.gridContainer = null
    this.isDestroyed = false
    this.coordinateService = new CoordinateService(gameDemo)
  }

  /**
   * Cleanup метод для очистки ресурсов
   */
  destroy () {
    if (this.isDestroyed) return
    this.isDestroyed = true

    // Очистка таймеров
    if (this.targetIndicatorTimeout) {
      clearTimeout(this.targetIndicatorTimeout)
      this.targetIndicatorTimeout = null
    }
    if (this.alertHighlightTimeout) {
      clearTimeout(this.alertHighlightTimeout)
      this.alertHighlightTimeout = null
    }

    // Удаление target indicator
    if (this.targetIndicator) {
      this.gameDemo.app.stage.removeChild(this.targetIndicator)
      this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
      this.targetIndicator = null
    }

    // Удаление alert highlight
    if (this.alertHighlight) {
      this.gameDemo.app.stage.removeChild(this.alertHighlight)
      this.alertHighlight.destroy({ children: true, texture: true, baseTexture: true })
      this.alertHighlight = null
    }

    // Удаление grid container
    if (this.gridContainer) {
      this.gameDemo.app.stage.removeChild(this.gridContainer)
      this.gridContainer.destroy({ children: true, texture: true, baseTexture: true })
      this.gridContainer = null
    }

    // Очистка reference на gameDemo
    this.gameDemo = null
    this.coordinateService = null
  }

  /**
   * Обновление позиции существующей сущности
   */
  updateEntityPosition (id, gameX, gameY) {
    const entity = this.gameDemo.entities.get(id)

    if (!entity || !entity.container) {
      return
    }

    const scaleX = this.gameDemo.app.screen.width / GAME_CONFIG.WORLD_SIZE.width
    const scaleY = this.gameDemo.app.screen.height / GAME_CONFIG.WORLD_SIZE.height
    const screenX = gameX * scaleX
    const screenY = gameY * scaleY

    entity.container.x = screenX
    entity.container.y = screenY
    entity.x = screenX
    entity.y = screenY
    entity.gameX = gameX
    entity.gameY = gameY
  }

  setupGrid () {
    this.updateGrid()
  }

  updateGrid () {
    if (this.gridContainer) {
      this.gameDemo.app.stage.removeChild(this.gridContainer)
    }

    this.gridContainer = new PIXI.Container()
    const gridGraphics = new PIXI.Graphics()
    gridGraphics.lineStyle(1, 0x444444, 0.5)

    const gridSize = 50
    const scaleX = this.gameDemo.app.screen.width / GAME_CONFIG.WORLD_SIZE.width
    const scaleY = this.gameDemo.app.screen.height / GAME_CONFIG.WORLD_SIZE.height

    for (let x = 0; x <= GAME_CONFIG.WORLD_SIZE.width; x += gridSize) {
      const scaledX = x * scaleX
      gridGraphics.moveTo(scaledX, 0)
      gridGraphics.lineTo(scaledX, this.gameDemo.app.screen.height)
    }

    for (let y = 0; y <= GAME_CONFIG.WORLD_SIZE.height; y += gridSize) {
      const scaledY = y * scaleY
      gridGraphics.moveTo(0, scaledY)
      gridGraphics.lineTo(this.gameDemo.app.screen.width, scaledY)
    }

    this.gridContainer.addChild(gridGraphics)
    this.gameDemo.app.stage.addChildAt(this.gridContainer, 0)
  }

  cleanupOrphanedGraphics () {
    for (let i = this.gameDemo.app.stage.children.length - 1; i >= 0; i--) {
      const child = this.gameDemo.app.stage.children[i]
      if (child instanceof PIXI.Graphics) {
        const isEssential = child === this.gridContainer ||
                    child === this.targetIndicator ||
                    child === this.alertHighlight
        if (!isEssential) {
          this.gameDemo.app.stage.removeChild(child)
        }
      }
    }
  }

  createEntitySprite (id, x, y, vehicleType, faction = null, entityType = 'vehicle') {
    const scaleX = this.gameDemo.app.screen.width / GAME_CONFIG.WORLD_SIZE.width
    const scaleY = this.gameDemo.app.screen.height / GAME_CONFIG.WORLD_SIZE.height
    const screenX = x * scaleX
    const screenY = y * scaleY

    const graphics = new PIXI.Graphics()
    let color
    let alpha = 1.0

    if (entityType === 'base') {
      color = 0x2196F3
      graphics.beginFill(color)
      graphics.drawRect(-15, -15, 30, 30)
    } else {
      switch (vehicleType) {
        case 'scout':
          color = faction === 'Neutral'
            ? GAME_CONFIG.COLORS.neutral.scout
            : faction === 'Wild'
              ? GAME_CONFIG.COLORS.wild.scout
              : faction === 'Enemy' ? GAME_CONFIG.COLORS.enemy.scout : GAME_CONFIG.COLORS.player.scout
          graphics.beginFill(color)
          graphics.drawCircle(0, 0, 8)
          break
        case 'tank':
          color = faction === 'Neutral'
            ? GAME_CONFIG.COLORS.neutral.tank
            : faction === 'Wild'
              ? GAME_CONFIG.COLORS.wild.tank
              : faction === 'Enemy' ? GAME_CONFIG.COLORS.enemy.tank : GAME_CONFIG.COLORS.player.tank
          graphics.beginFill(color)
          graphics.drawRect(-10, -8, 20, 16)
          break
        case 'transport':
          color = faction === 'Neutral'
            ? GAME_CONFIG.COLORS.neutral.transport
            : faction === 'Wild'
              ? GAME_CONFIG.COLORS.wild.transport
              : faction === 'Enemy' ? GAME_CONFIG.COLORS.enemy.transport : GAME_CONFIG.COLORS.player.transport
          graphics.beginFill(color)
          graphics.drawRect(-12, -10, 24, 20)
          break
        default:
          if (vehicleType && vehicleType.includes('_')) {
            // eslint-disable-next-line no-unused-vars
            const [__, alertState] = vehicleType.split('_')

            if (alertState === 'Hidden') {
              color = GAME_CONFIG.COLORS.alert
              alpha = 0.7
              graphics.lineStyle(2, color, alpha)
              graphics.drawCircle(0, 0, 8)
              graphics.moveTo(-3, -6)
              graphics.lineTo(3, -6)
              graphics.lineTo(3, -2)
              graphics.lineTo(0, 0)
              graphics.lineTo(0, 4)
              graphics.moveTo(0, 6)
              graphics.lineTo(0, 7)
            } else {
              color = GAME_CONFIG.COLORS.alert
              graphics.lineStyle(3, color, 1)
              graphics.drawCircle(0, 0, 12)
              graphics.moveTo(-4, -8)
              graphics.lineTo(4, -8)
              graphics.lineTo(4, -3)
              graphics.lineTo(0, -1)
              graphics.lineTo(0, 5)
              graphics.moveTo(0, 7)
              graphics.lineTo(0, 8)
            }
            break
          }
          color = faction === 'Neutral'
            ? GAME_CONFIG.COLORS.neutral.scout
            : faction === 'Wild'
              ? GAME_CONFIG.COLORS.wild.scout
              : faction === 'Enemy' ? GAME_CONFIG.COLORS.enemy.scout : GAME_CONFIG.COLORS.player.scout
          graphics.beginFill(color)
          graphics.drawCircle(0, 0, 8)
          break
      }
    }

    graphics.alpha = alpha
    graphics.endFill()

    const text = new PIXI.Text(id.toString(), {
      fontSize: 10,
      fill: 0xFFFFFF,
      align: 'center'
    })
    text.anchor.set(0.5)
    text.y = -20

    const container = new PIXI.Container()
    container.addChild(graphics)
    container.addChild(text)
    container.x = screenX
    container.y = screenY

    this.gameDemo.app.stage.addChild(container)
    this.gameDemo.entities.set(id, {
      container,
      x: screenX,
      y: screenY,
      gameX: x,
      gameY: y,
      vehicleType,
      entityType,
      faction
    })
  }

  findEntityAtPosition (x, y) {
    let closestEntity = null
    let closestDistance = 20

    for (const [id, entity] of this.gameDemo.entities) {
      const distance = calculateDistance(entity.container.x, entity.container.y, x, y)
      if (distance < closestDistance) {
        closestDistance = distance
        closestEntity = id
      }
    }

    return closestEntity
  }

  findAlertAtPosition (gameX, gameY) {
    let closestAlert = null
    let closestDistance = 15

    for (const [id, entity] of this.gameDemo.entities) {
      if (entity.entityType === 'alert') {
        const distance = calculateDistance(entity.gameX, entity.gameY, gameX, gameY)
        if (distance < closestDistance) {
          closestDistance = distance
          closestAlert = { x: entity.gameX, y: entity.gameY, id }
        }
      }
    }

    return closestAlert
  }

  // Helper method to get screen coordinates from game coordinates
  getScreenCoords (gameX, gameY) {
    return this.coordinateService.gameToScreen(gameX, gameY)
  }

  showTargetIndicator (gameX, gameY) {
    if (this.isDestroyed) return

    // Clear any existing timeout to prevent memory leaks
    if (this.targetIndicatorTimeout) {
      clearTimeout(this.targetIndicatorTimeout)
      this.targetIndicatorTimeout = null
    }

    if (this.targetIndicator) {
      this.gameDemo.app.stage.removeChild(this.targetIndicator)
      this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
      this.targetIndicator = null
    }

    const screenCoords = this.getScreenCoords(gameX, gameY)
    const graphics = new PIXI.Graphics()
    graphics.lineStyle(2, 0xFF0000, 1)
    graphics.drawCircle(0, 0, 10)
    graphics.moveTo(-15, 0)
    graphics.lineTo(15, 0)
    graphics.moveTo(0, -15)
    graphics.lineTo(0, 15)
    graphics.x = screenCoords.x
    graphics.y = screenCoords.y

    this.gameDemo.app.stage.addChild(graphics)
    this.targetIndicator = graphics

    this.targetIndicatorTimeout = setTimeout(() => {
      if (!this.isDestroyed && this.targetIndicator) {
        this.gameDemo.app.stage.removeChild(this.targetIndicator)
        this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
        this.targetIndicator = null
      }
      this.targetIndicatorTimeout = null
    }, GAME_CONFIG.TIMEOUTS.targetIndicator)
  }

  clearTargetIndicator () {
    if (this.isDestroyed) return

    // Clear timeout first to prevent memory leaks
    if (this.targetIndicatorTimeout) {
      clearTimeout(this.targetIndicatorTimeout)
      this.targetIndicatorTimeout = null
    }

    // Remove indicator from stage
    if (this.targetIndicator) {
      this.gameDemo.app.stage.removeChild(this.targetIndicator)
      this.targetIndicator.destroy({ children: true, texture: true, baseTexture: true })
      this.targetIndicator = null
    }
  }

  highlightTargetAlert (alert) {
    if (this.isDestroyed) return

    if (this.alertHighlight) {
      this.gameDemo.app.stage.removeChild(this.alertHighlight)
      this.alertHighlight.destroy({ children: true, texture: true, baseTexture: true })
    }

    const screenCoords = this.getScreenCoords(alert.x, alert.y)
    const graphics = new PIXI.Graphics()
    graphics.lineStyle(4, GAME_CONFIG.COLORS.alert, 1)
    graphics.drawCircle(0, 0, 20)
    graphics.alertId = alert.id
    graphics.x = screenCoords.x
    graphics.y = screenCoords.y

    this.gameDemo.app.stage.addChild(graphics)
    this.alertHighlight = graphics

    this.alertHighlightTimeout = setTimeout(() => {
      if (!this.isDestroyed && this.alertHighlight) {
        this.gameDemo.app.stage.removeChild(this.alertHighlight)
        this.alertHighlight.destroy({ children: true, texture: true, baseTexture: true })
        this.alertHighlight = null
      }
      this.alertHighlightTimeout = null
    }, GAME_CONFIG.TIMEOUTS.alertHighlight)
  }

  createDamageEffect (attackerId, targetId, damage) {
    const attacker = this.gameDemo.entities.get(attackerId)
    const target = this.gameDemo.entities.get(targetId)

    if (!attacker || !target) return

    const graphics = new PIXI.Graphics()
    graphics.lineStyle(3, 0xFF0000, 0.8)
    graphics.moveTo(attacker.container.x, attacker.container.y)
    graphics.lineTo(target.container.x, target.container.y)

    const angle = Math.atan2(target.container.y - attacker.container.y, target.container.x - attacker.container.x)
    const arrowLength = 15
    const arrowAngle = Math.PI / 6

    graphics.moveTo(target.container.x, target.container.y)
    graphics.lineTo(
      target.container.x - arrowLength * Math.cos(angle - arrowAngle),
      target.container.y - arrowLength * Math.sin(angle - arrowAngle)
    )
    graphics.moveTo(target.container.x, target.container.y)
    graphics.lineTo(
      target.container.x - arrowLength * Math.cos(angle + arrowAngle),
      target.container.y - arrowLength * Math.sin(angle + arrowAngle)
    )

    this.gameDemo.app.stage.addChild(graphics)

    const damageText = new PIXI.Text(`-${damage.toFixed(1)}`, {
      fontSize: 14,
      fill: 0xFF0000,
      fontWeight: 'bold',
      stroke: 0xFFFFFF,
      strokeThickness: 2
    })
    damageText.anchor.set(0.5)
    damageText.x = (attacker.container.x + target.container.x) / 2
    damageText.y = (attacker.container.y + target.container.y) / 2 - 10

    this.gameDemo.app.stage.addChild(damageText)

    const flashGraphics = new PIXI.Graphics()
    flashGraphics.beginFill(0xFF0000, 0.3)
    flashGraphics.drawCircle(0, 0, 25)
    flashGraphics.endFill()
    flashGraphics.x = target.container.x
    flashGraphics.y = target.container.y
    this.gameDemo.app.stage.addChild(flashGraphics)

    let alpha = 1.0
    const animate = () => {
      alpha -= 0.05
      graphics.alpha = alpha
      damageText.alpha = alpha
      flashGraphics.alpha = alpha * 0.5

      if (alpha > 0) {
        requestAnimationFrame(animate)
      } else {
        this.gameDemo.app.stage.removeChild(graphics)
        this.gameDemo.app.stage.removeChild(damageText)
        this.gameDemo.app.stage.removeChild(flashGraphics)
      }
    }
    animate()
  }

  createDestructionEffect (entityId) {
    if (this.isDestroyed) return

    const entity = this.gameDemo.entities.get(entityId)
    if (!entity) return

    const explosionGraphics = new PIXI.Graphics()
    explosionGraphics.beginFill(0xFFA500, 0.8)
    explosionGraphics.drawCircle(0, 0, 5)
    explosionGraphics.endFill()
    explosionGraphics.x = entity.container.x
    explosionGraphics.y = entity.container.y
    this.gameDemo.app.stage.addChild(explosionGraphics)

    const particles = []
    for (let i = 0; i < 8; i++) {
      const particle = new PIXI.Graphics()
      particle.beginFill(0xFF4500, 0.6)
      particle.drawCircle(0, 0, 2)
      particle.endFill()
      particle.x = entity.container.x
      particle.y = entity.container.y
      particle.vx = (Math.random() - 0.5) * 200
      particle.vy = (Math.random() - 0.5) * 200
      this.gameDemo.app.stage.addChild(particle)
      particles.push({ particle, vx: particle.vx, vy: particle.vy })
    }

    let scale = 1.0
    let particleAlpha = 1.0
    const animate = () => {
      if (this.isDestroyed) {
        // Cleanup on destroy during animation
        this.gameDemo.app.stage.removeChild(explosionGraphics)
        particles.forEach(p => p.particle.destroy({ children: true, texture: true, baseTexture: true }))
        return
      }

      scale += 0.1
      explosionGraphics.scale.set(scale)
      explosionGraphics.alpha = Math.max(0, 1.0 - scale * 0.2)

      particleAlpha -= 0.02
      for (const p of particles) {
        p.particle.x += p.vx * 0.016
        p.particle.y += p.vy * 0.016
        p.particle.alpha = particleAlpha
        p.vx *= 0.98
        p.vy *= 0.98
      }

      if (scale < 3.0) {
        requestAnimationFrame(animate)
      } else {
        this.gameDemo.app.stage.removeChild(explosionGraphics)
        particles.forEach(p => {
          this.gameDemo.app.stage.removeChild(p.particle)
          p.particle.destroy({ children: true, texture: true, baseTexture: true })
        })
      }
    }
    requestAnimationFrame(animate)
  }

  /**
   * Cleanup сущности при её удалении
   * @param {number|string} entityId - ID сущности для удаления
   */
  removeEntity (entityId) {
    if (this.isDestroyed) return

    const entity = this.gameDemo.entities.get(entityId)
    if (!entity) return

    // Удаляем container с stage
    if (entity.container) {
      this.gameDemo.app.stage.removeChild(entity.container)
      entity.container.destroy({ children: true, texture: true, baseTexture: true })
    }

    // Удаляем из entities map
    this.gameDemo.entities.delete(entityId)
  }

  /**
   * Cleanup всех сущностей
   */
  cleanupAllEntities () {
    if (this.isDestroyed) return

    for (const [id, entity] of this.gameDemo.entities) {
      if (entity.container) {
        this.gameDemo.app.stage.removeChild(entity.container)
        entity.container.destroy({ children: true, texture: true, baseTexture: true })
      }
    }
    this.gameDemo.entities.clear()
  }
}
