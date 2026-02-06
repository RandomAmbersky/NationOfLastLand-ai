export class CoordinateService {
  constructor (gameDemo) {
    this.gameDemo = gameDemo
    this._scaleCache = null
  }

  getScale () {
    return { x: 1, y: 1 }
  }

  invalidateScaleCache () {
    this._scaleCache = null
  }

  screenToGame (x, y) {
    return { x, y }
  }

  gameToScreen (x, y) {
    return { x, y }
  }

  getScreenCoords (gameX, gameY) {
    return { x: gameX, y: gameY }
  }
}
