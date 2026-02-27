// Mock PIXI globally
global.PIXI = {
  Graphics: class {
    constructor () {
      this.children = []
      this.alpha = 1
      this.x = 0
      this.y = 0
      this.scale = {
        x: 1,
        y: 1,
        set: jest.fn(function (scale) {
          this.x = scale
          this.y = scale
        })
      }
    }

    lineStyle () { return this }
    beginFill () { return this }
    endFill () { return this }
    drawCircle () { return this }
    drawRect () { return this }
    moveTo () { return this }
    lineTo () { return this }
    clear () { return this }
    addChild (child) {
      this.children.push(child)
      return child
    }

    addChildAt (child, index) {
      this.children.splice(index, 0, child)
      return child
    }

    removeChild (child) {
      const idx = this.children.indexOf(child)
      if (idx > -1) this.children.splice(idx, 1)
      return child
    }

    destroy () { return this }
  },
  Container: class {
    constructor () {
      this.children = []
      this.x = 0
      this.y = 0
      this.alpha = 1
    }

    addChild (child) {
      this.children.push(child)
      return child
    }

    addChildAt (child, index) {
      this.children.splice(index, 0, child)
      return child
    }

    removeChild (child) {
      const idx = this.children.indexOf(child)
      if (idx > -1) this.children.splice(idx, 1)
      return child
    }

    destroy () { return this }
  },
  Text: class {
    constructor (text, style = {}) {
      this.text = text
      this.style = { fontSize: 16, fill: 0xffffff, align: 'left', ...style }
      this.x = 0
      this.y = 0
      this.alpha = 1
      this.anchor = {
        x: 0,
        y: 0,
        set: jest.fn()
      }
    }
  },
  Application: class {
    constructor (options = {}) {
      this.screen = {
        width: options.width || 800,
        height: options.height || 600
      }
      this.view = options.view || {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
      this.stage = {
        children: [],
        addChild (child) { this.children.push(child) },
        removeChild (child) {
          const idx = this.children.indexOf(child)
          if (idx > -1) this.children.splice(idx, 1)
        }
      }
    }
  },
  Sprite: class {
    constructor () {
      this.x = 0
      this.y = 0
      this.alpha = 1
      this.width = 0
      this.height = 0
      this.anchor = { x: 0.5, y: 0.5 }
    }

    setTexture () { return this }
    destroy () {}
  }
}

// Mock setTimeout with jest.fn
global.setTimeout = jest.fn((cb) => {
  return 1
})

// Mock clearTimeout
global.clearTimeout = jest.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
}
