/**
 * Game Engine Demo - New architecture using GameEngine, Systems, and Services
 * Refactored version of GameDemo with better separation of concerns
 */

import { GameEngine, RendererSystem, InputSystem, SelectionSystem, GameStateSystem } from './index.js'
import { CoordinateService } from './coordinate-service.js'
import { EntityService } from './entity-service.js'
import { GAME_CONFIG } from './config/game-config.js'

/**
 * Main Game Controller using new architecture
 * Coordinates systems through GameEngine
 */
export class GameEngineDemo {
  constructor () {
    // Initialize GameEngine as central coordinator
    this.gameEngine = new GameEngine()

    // Initialize systems
    this.coordinateService = new CoordinateService(this)
    this.rendererSystem = new RendererSystem(this.gameEngine, this.coordinateService)
    this.inputSystem = new InputSystem(this.gameEngine)
    this.selectionSystem = new SelectionSystem(this.gameEngine)
    this.gameStateSystem = new GameStateSystem(this.gameEngine)

    // Add systems to engine
    this.gameEngine.addSystem(this.rendererSystem)
    this.gameEngine.addSystem(this.inputSystem)
    this.gameEngine.addSystem(this.selectionSystem)
    this.gameEngine.addSystem(this.gameStateSystem)

    // Legacy services for compatibility
    this.entityService = new EntityService(this)

    // State - legacy compatibility with CoreStateManager interface
    this.app = null
    this.isInitialized = false
    this.lastUpdate = Date.now()
    this.bases = new Map()
    this.entities = new Map()

    // New state from GameEngine
    this.stateManager = this.gameEngine.state

    // Event subscriptions
    this._setupEventSubscriptions()

    this.initPixi()
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

    // Initialize renderer with app
    this.rendererSystem.init(this.app)

    // Initialize input with app
    this.inputSystem.init(this.app)

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
      this.coordinateService.invalidateScaleCache()
    }
  }

  /**
   * Initialize game
   */
  async initializeGame () {
    try {
      const result = await this.gameStateSystem.initializeGame()
      this.isInitialized = true
      this.gameEngine.start()
      // Update status in DOM
      const statusEl = document.getElementById('status')
      if (statusEl) {
        statusEl.textContent = 'Game initialized successfully!'
      }
      return result
    } catch (error) {
      console.error('Game initialization error:', error)
      const statusEl = document.getElementById('status')
      if (statusEl) {
        statusEl.textContent = `Error: ${error.message}`
      }
      return { success: false, error: error.message }
    }
  }

  /**
   * Update game loop
   */
  updateGameLoop (dt) {
    try {
      return this.gameStateSystem.updateGameLoop(dt)
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
   * Get scale
   */
  getScale () {
    return this.coordinateService.getScale()
  }

  /**
   * Invalidate scale cache
   */
  invalidateScaleCache () {
    this.coordinateService.invalidateScaleCache()
  }

  /**
   * Screen to game coordinates
   */
  screenToGame (x, y) {
    return this.coordinateService.screenToGame(x, y)
  }

  /**
   * Game to screen coordinates
   */
  gameToScreen (x, y) {
    return this.coordinateService.gameToScreen(x, y)
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
 * Create a new GameEngineDemo instance
 */
export function createGameEngineDemo () {
  return new GameEngineDemo()
}
