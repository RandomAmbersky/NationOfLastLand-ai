import { GAME_CONFIG } from './config/game-config.js'

/**
 * Сервис для работы с координатами и масштабированием
 */
export class CoordinateService {
  constructor(gameDemo) {
    this.gameDemo = gameDemo
    this._scaleCache = null
    this.isDestroyed = false
  }

  /**
   * Cleanup метод для очистки ресурсов
   */
  destroy() {
    if (this.isDestroyed) return
    this.isDestroyed = true

    // Очистка кэша
    this._scaleCache = null

    // Очистка ссылок
    this.gameDemo = null
  }

  /**
     * Получает кэшированные значения масштаба
     * @returns {Object} Объект с значениями масштаба по X и Y
     */
  getScale() {
    if (!this._scaleCache) {
      this._scaleCache = {
        x: this.gameDemo.app.screen.width / GAME_CONFIG.WORLD_SIZE.width,
        y: this.gameDemo.app.screen.height / GAME_CONFIG.WORLD_SIZE.height
      }
    }
    return this._scaleCache
  }

  /**
     * Невалидирует кэш масштаба (вызывать при изменении размера)
     */
  invalidateScaleCache() {
    this._scaleCache = null
  }

  /**
     * Конвертирует экранные координаты в игровые
     * @param {number} x - Экранная координата X
     * @param {number} y - Экранная координата Y
     * @returns {Object} Игровые координаты
     */
  screenToGame(x, y) {
    const width = this.gameDemo.app.screen.width
    const height = this.gameDemo.app.screen.height
    return {
      x: (x / width) * GAME_CONFIG.WORLD_SIZE.width,
      y: (y / height) * GAME_CONFIG.WORLD_SIZE.height
    }
  }

  /**
     * Конвертирует игровые координаты в экранные
     * @param {number} x - Игровая координата X
     * @param {number} y - Игровая координата Y
     * @returns {Object} Экранные координаты
     */
  gameToScreen(x, y) {
    const scale = this.getScale()
    return {
      x: x * scale.x,
      y: y * scale.y
    }
  }

  /**
     * Конвертирует игровые координаты в экранные с учетом контейнера
     * @param {number} gameX - Игровая координата X
     * @param {number} gameY - Игровая координата Y
     * @returns {Object} Экранные координаты
     */
  getScreenCoords(gameX, gameY) {
    return this.gameToScreen(gameX, gameY)
  }

  /**
     * Получает координаты клика относительно канваса
     * @param {MouseEvent} event - Событие мыши
     * @returns {Object} Координаты клика
     */
  getCanvasCoords(event) {
    const rect = this.gameDemo.app.view.getBoundingClientRect()
    return {
      screenX: event.clientX - rect.left,
      screenY: event.clientY - rect.top
    }
  }
}
