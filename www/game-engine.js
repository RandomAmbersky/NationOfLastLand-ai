/**
 * Game Engine Demo - Simple game controller using GameEngine
 * Uses GameEngine as central coordinator with built-in systems
 */

import { GameEngine, createEngine } from './core/GameEngine.js'
import { GameStateSystem, createGameStateSystem } from './systems/GameStateSystem.js'
import { RendererSystem, createRenderer } from './systems/RendererSystem.js'
import { GAME_CONFIG } from './config/game-config.js'

/**
 * Main Game Controller using GameEngine
 * Simplified architecture - GameEngine coordinates all systems
 */
export class GameDemo {
  constructor () {
    // Initialize GameEngine as central coordinator
    this.gameEngine = createEngine()

    // Initialize game state system (handles WASM communication)
    this.gameStateSystem = createGameStateSystem(this.gameEngine)

    // Initialize renderer system (handles entity rendering)
    this.rendererSystem = createRenderer(this.gameEngine)

    // Add systems to engine
    this.gameEngine.addSystem(this.gameStateSystem)
    this.gameEngine.addSystem(this.rendererSystem)

    // State - legacy compatibility with CoreStateManager interface
    this.app = null
    this.isInitialized = false
    this.lastUpdate = Date.now()

    // Use GameEngine's state
    this.entities = this.gameEngine.state.get('entities')
    this.bases = this.gameEngine.state.get('bases')

    // Event subscriptions
    this._setupEventSubscriptions()
  }

  /**
   * Setup event subscriptions for system communication
   */
  _setupEventSubscriptions () {
    const state = this.gameEngine.state

    // Subscribe to state changes
    state.subscribe('entitiesUpdated', (_newState) => {
      this.entities = _newState.entities
    })

    state.subscribe('selectionsChanged', (_newState) => {
      // Handle selection changes
    })
  }

  /**
   * Initialize Pixi.js
   */
  initPixi () {
    const canvasContainer = document.querySelector('.game-container')
    if (!canvasContainer) {
      console.error('GameEngineDemo.initPixi: .game-container not found')
      return
    }

    const rect = canvasContainer.getBoundingClientRect()

    this.app = new PIXI.Application({
      width: rect.width,
      height: rect.height,
      backgroundColor: 0x2a2a2a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    })

    const canvas = document.getElementById('game-canvas')
    if (canvas && canvas.parentNode) {
      canvas.parentNode.replaceChild(this.app.view, canvas)
    }

    this.gameWidth = GAME_CONFIG.WORLD_SIZE.width
    this.gameHeight = GAME_CONFIG.WORLD_SIZE.height

    // Store app in gameEngine for systems that need it
    this.gameEngine.app = this.app

    // Initialize renderer system with app
    if (this.rendererSystem) {
      this.rendererSystem.init(this.app)
    }

    // Add resize handler
    window.addEventListener('resize', () => this.handleResize())
  }

  /**
   * Handle window resize
   */
  handleResize () {
    const canvasContainer = document.querySelector('.game-container')
    const rect = canvasContainer.getBoundingClientRect()

    if (this.app) {
      this.app.renderer.resize(rect.width, rect.height)
    }
  }

   /**
    * Initialize game
    */
   async initializeGame () {
      try {
        // Initialize Pixi.js first
        this.initPixi()
        
        const result = await this.gameStateSystem.initializeGame()
        this.isInitialized = true
        this.gameEngine.start()
        // Update status in DOM
        const statusEl = document.getElementById('status')
        if (statusEl) {
          statusEl.textContent = result.success ? 'Game initialized successfully!' : `Error: ${result.error}`;
        }
        return result
      } catch (error) {
        console.error('Game initialization error:', error)
        const statusEl = document.getElementById('status')
        if (statusEl) {
          statusEl.textContent = `Error: ${error.message}`;
        }
        return { success: false, error: error.message }
      }
    }

  /**
   * Update game loop
   */
  updateGameLoop (dt) {
    try {
      const result = this.gameStateSystem.update(dt)
      // Also call render after update
      this.gameEngine.render()
      return result
    } catch (error) {
      console.error('Game update error:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Start auto game loop
   */
  startAutoUpdate () {
    if (!this.isInitialized) {
      console.warn('Game not initialized yet')
      return
    }
    this.gameEngine.start()
  }

  /**
   * Stop auto game loop
   */
  stopAutoUpdate () {
    this.gameEngine.stop()
  }

  /**
   * Get scale - legacy compatibility
   */
  getScale () {
    if (!this.app) return { x: 1, y: 1 }
    return {
      x: this.app.screen.width / GAME_CONFIG.WORLD_SIZE.width,
      y: this.app.screen.height / GAME_CONFIG.WORLD_SIZE.height
    }
  }

  /**
   * Invalidate scale cache - legacy compatibility
   */
  invalidateScaleCache () {
    // Scale is recalculated on demand now
  }

  /**
   * Screen to game coordinates - legacy compatibility
   */
  screenToGame (x, y) {
    const { x: scaleX, y: scaleY } = this.getScale()
    return {
      x: (x / scaleX) / GAME_CONFIG.WORLD_SIZE.width,
      y: (y / scaleY) / GAME_CONFIG.WORLD_SIZE.height
    }
  }

  /**
   * Game to screen coordinates - legacy compatibility
   */
  gameToScreen (x, y) {
    const { x: scaleX, y: scaleY } = this.getScale()
    return {
      x: x * scaleX * GAME_CONFIG.WORLD_SIZE.width,
      y: y * scaleY * GAME_CONFIG.WORLD_SIZE.height
    }
  }

  /**
   * Initialize demo (alias for initializeGame)
   */
  async initializeDemo () {
    return this.initializeGame()
  }

  /**
   * Spawn a vehicle
   */
  async spawnVehicle (vehicleType, baseEntity) {
    return this.gameStateSystem.spawnVehicle(vehicleType, baseEntity)
  }

  /**
   * Create a base
   */
  async createBase (x, y) {
    return this.gameStateSystem.createBase(x, y)
  }

  /**
   * Build a floor on a base
   */
  async buildFloor (baseId, floorType) {
    return this.gameStateSystem.buildFloor(baseId, floorType)
  }

  /**
   * Create a random alert
   */
  async createRandomAlert () {
    return this.gameStateSystem.createRandomAlert()
  }

  /**
   * Clear selection
   */
  clearSelection () {
    this.gameStateSystem.clearSelection?.()
  }

  /**
   * Cleanup resources
   */
  destroy () {
    this.gameEngine.destroy()
    if (this.app) {
      this.app.destroy(true)
      this.app = null
    }
  }

  /**
   * Get isDestroyed flag
   */
  get isDestroyed () {
    return this.gameEngine === null
  }
}

/**
 * Create a new GameDemo instance
 */
export function createGameDemo () {
  return new GameDemo()
}
