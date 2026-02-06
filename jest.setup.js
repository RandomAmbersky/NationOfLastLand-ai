// Mock PIXI globally
global.PIXI = {
  Graphics: class {
    constructor() {
      this.children = []
      this.alpha = 1
      this.x = 0
      this.y = 0
      this.scale = { x: 1, y: 1 }
    }
    lineStyle() { return this }
    beginFill() { return this }
    endFill() { return this }
    drawCircle() { return this }
    drawRect() { return this }
    moveTo() { return this }
    lineTo() { return this }
    clear() { return this }
    addChild(child) {
      this.children.push(child)
      return child
    }
    addChildAt(child, index) {
      this.children.splice(index, 0, child)
      return child
    }
    removeChild(child) {
      const idx = this.children.indexOf(child)
      if (idx > -1) this.children.splice(idx, 1)
      return child
    }
  },
  Container: class {
    constructor() {
      this.children = []
      this.x = 0
      this.y = 0
      this.alpha = 1
    }
    addChild(child) {
      this.children.push(child)
      return child
    }
    addChildAt(child, index) {
      this.children.splice(index, 0, child)
      return child
    }
    removeChild(child) {
      const idx = this.children.indexOf(child)
      if (idx > -1) this.children.splice(idx, 1)
      return child
    }
  },
  Text: class {
    constructor(text, style = {}) {
      this.text = text
      this.style = { fontSize: 16, fill: 0xffffff, align: 'left', ...style }
      this.x = 0
      this.y = 0
      this.alpha = 1
      this.anchor = { x: 0, y: 0 }
    }
  }
}
