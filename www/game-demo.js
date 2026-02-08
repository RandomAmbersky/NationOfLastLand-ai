import { CoreStateManager } from './core-state-manager.js'
import { GameStateManager } from './game-state-manager.js'
import { SelectionManager } from './selection-manager.js'
import { EntityRenderer } from './entity-renderer.js'
import { InputHandler } from './input-handler.js'
import { CoordinateService } from './coordinate-service.js'
import { EntityService } from './entity-service.js'
import { SelectionIndicatorManager } from './selection-indicator.js'
import { GAME_CONFIG } from './game-config.js'
import { initWasm, get_entity_info } from './wasm-imports.js'

/**
 * Главный класс демонстрации игры
 * Отвечает за координацию всех компонентов
 */
export class GameDemo {
  /**
   * Создает экземпляр игры
   */
  constructor () {
    // Центральное состояние игры
    this.stateManager = new CoreStateManager()

    // Подсистемы
    this.coordinateService = new CoordinateService(this)
    this.entityService = new EntityService(this)
    this.selectionIndicatorManager = new SelectionIndicatorManager(this)
    this.inputHandler = new InputHandler(this)
    this.entityRenderer = new EntityRenderer(this)
    this.selectionManager = new SelectionManager(this)
    this.gameStateManager = new GameStateManager(this)

    // Инициализация состояния
    this.app = null
    this.isInitialized = false
    this.isGameLoopRunning = false
    this.lastUpdate = Date.now()
    this.bases = new Map()
    this.entities = new Map()

    // Установка обработчиков событий
    this.setupEventListeners()

    this.initPixi()
  }

  /**
   * Инициализация Pixi.js
   */
  initPixi () {
    // Get canvas container dimensions
    const canvasContainer = document.querySelector('.game-container')
    const rect = canvasContainer.getBoundingClientRect()

    // Create Pixi.js application with responsive size
    this.app = new PIXI.Application({
      width: rect.width,
      height: rect.height,
      backgroundColor: 0x2a2a2a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    })

    // Add canvas to DOM
    const canvas = document.getElementById('game-canvas')
    canvas.parentNode.replaceChild(this.app.view, canvas)

    // Store original game world size from config
    this.gameWidth = GAME_CONFIG.WORLD_SIZE.width
    this.gameHeight = GAME_CONFIG.WORLD_SIZE.height

    // Setup subsystems
    this.entityRenderer.setupGrid()
    this.inputHandler.setupEventListeners()

    // Add resize handler
    window.addEventListener('resize', () => this.handleResize())
  }

  /**
   * Обработка изменения размера окна
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
   * Настройка обработчиков событий
   */
  setupEventListeners () {
    // Обработчики событий для кнопок
    document
      .getElementById('init-btn')
      .addEventListener('click', () => this.gameStateManager.initializeGame())
    document
      .getElementById('spawn-btn')
      .addEventListener('click', () => this.gameStateManager.spawnVehicle())
    document
      .getElementById('create-base-btn')
      .addEventListener('click', () => this.gameStateManager.createBase())
    document
      .getElementById('build-floor-btn')
      .addEventListener('click', () => this.gameStateManager.buildFloor())
    document
      .getElementById('create-alert-btn')
      .addEventListener('click', () =>
        this.gameStateManager.createRandomAlert()
      )
    const clearSelectionBtn = document.getElementById('clear-selection-btn')
    if (clearSelectionBtn) {
      clearSelectionBtn.addEventListener('click', () =>
        this.selectionManager.clearAllSelections()
      )
    } else {
      console.error('ERROR: clear-selection-btn NOT FOUND!')
    }
    const cleanupBtn = document.getElementById('cleanup-btn')
    if (cleanupBtn) {
      cleanupBtn.addEventListener('click', () => this.destroy())
    } else {
      console.error('ERROR: cleanup-btn NOT FOUND!')
    }
    const startAutoBtn = document.getElementById('start-auto-update-btn')
    if (startAutoBtn) {
      startAutoBtn.addEventListener('click', () =>
        this.gameStateManager.startAutoUpdate()
      )
    } else {
      console.error('ERROR: start-auto-update-btn NOT FOUND!')
    }
    const stopAutoBtn = document.getElementById('stop-auto-update-btn')
    if (stopAutoBtn) {
      stopAutoBtn.addEventListener('click', () =>
        this.gameStateManager.stopAutoUpdate()
      )
    } else {
      console.error('ERROR: stop-auto-update-btn NOT FOUND!')
    }
    const updateOnceBtn = document.getElementById('update-once-btn')
    if (updateOnceBtn) {
      updateOnceBtn.addEventListener('click', () =>
        this.gameStateManager.updateOnce()
      )
    } else {
      console.error('ERROR: update-once-btn NOT FOUND!')
    }
  }

  // Геттер для совместимости с selection-manager.js
  get selectedEntityIds () {
    return this.stateManager.getSelectionState().selectedEntityIds
  }

  /**
   * Инициализация игры
   */
  async init () {
    try {
      // Initialize WebAssembly module
      console.log('Attempting WASM initialization...')

      // First load the WASM module using default export (__wbg_init)
      console.log('Loading WASM module...')
      await initWasm()
      console.log('WASM module loaded successfully')

      console.log('About to call gameStateManager.initializeGame()')
      this.updateStatus(
        'WebAssembly loaded successfully!\nInitializing game automatically...'
      )

      // Automatically initialize the game
      console.log('Calling gameStateManager.initializeGame()')
      await this.gameStateManager.initializeGame()
      console.log('Game initialized successfully!')
    } catch (error) {
      console.error('WASM init error:', error)
      console.error('Stack trace:', error.stack)
      this.updateStatus(
        `Error loading WebAssembly: ${error.message}\n${error.stack}`
      )
      // Try a more specific error message for debugging
    }
  }

  /**
   * Получение масштаба
   */
  getScale () {
    return this.coordinateService.getScale()
  }

  /**
   * Инвалидация кэша масштаба
   */
  invalidateScaleCache () {
    this.coordinateService.invalidateScaleCache()
  }

  /**
   * Обновление состояния выделения
   */
  updateSelectionState (removedEntities = []) {
    const selectionState = this.stateManager.getSelectionState()
    const selectedIds = Array.from(selectionState.selectedEntityIds)

    // Обновляем состояние в менеджере
    this.stateManager.updateSelectionState(selectedIds, removedEntities)
  }

  /**
   * Синхронизация сущностей с игровым состоянием
   */
  syncEntitiesWithGameState (entities) {
    // Множество ID сущностей, которые присутствуют в текущем состоянии
    const currentEntityIds = new Set()

    // Обновляем состояние сущностей и синхронизируем отображение за один проход
    for (const entityData of entities) {
      // Форматируем данные сущности
      const entity = this.entityService.createEntity(entityData)

      // Обновляем состояние
      this.stateManager.updateEntityStateEntry(entity)

      // Обновляем или создаем спрайт
      if (entity && entity.entityType === 'base') {
        this.bases.set(entity.id, entity)
      }

      const existingEntity = this.entities.get(entity.id)

      if (existingEntity) {
        // Обновляем позицию существующего спрайта
        this.entityRenderer.updateEntityPosition(
          entity.id,
          entity.gameX,
          entity.gameY
        )
      } else {
        // Создаем новый спрайт
        this.entityRenderer.createEntitySprite(
          entity.id,
          entity.gameX,
          entity.gameY,
          entity.vehicleType,
          entity.fraction,
          entity.entityType
        )
      }

      currentEntityIds.add(entity.id)
    }

    // Удаляем сущности, которых больше нет в состоянии игры
    for (const [id, existingEntity] of this.entities) {
      if (!currentEntityIds.has(id)) {
        // Удаляем визуальное представление сущности
        if (existingEntity.container) {
          this.app.stage.removeChild(existingEntity.container)
        }
        this.entities.delete(id)
      }
    }
  }

  /**
   * Обновление или создание сущности из игрового состояния
   * (Оставлена для обратной совместимости, если нужна отдельная функция)
   */
  updateOrCreateEntityFromGameState (entityData) {
    // Для обновления существующей сущности без дублирования createEntity
    const entity = this.entities.get(entityData.id)

    if (entity) {
      // Сущность уже существует, обновляем только позицию
      this.entityRenderer.updateEntityPosition(
        entity.id,
        entity.gameX,
        entity.gameY
      )
    }
    // Если сущность не существует в this.entities, syncEntitiesWithGameState уже создаст её спрайт
  }

  /**
   * Обновление статуса
   */
  updateStatus (message) {
    this.stateManager.updateDisplayState({ statusMessage: message })
    const statusDiv = document.getElementById('status')
    if (statusDiv) {
      statusDiv.textContent = message
    }
  }

  /**
   * Обновление информации о сущности
   */
  updateEntityInfo (info) {
    this.stateManager.updateDisplayState({ entityInfo: info })

    const entityInfoDiv = document.getElementById('entity-info')
    if (entityInfoDiv) {
      if (info) {
        entityInfoDiv.style.display = 'block'
        entityInfoDiv.textContent = info
      } else {
        entityInfoDiv.style.display = 'none'
      }
    }
  }

  /**
   * Обновление информации о выделенных сущностях
   */
  async updateSelectedEntityInfo (_entities) {
    const selectionState = this.stateManager.getSelectionState()
    const selectedIds = Array.from(selectionState.selectedEntityIds)

    if (selectedIds.length === 0) {
      this.updateEntityInfo(null)
      return
    }

    // Если выбран только один юнит - используем старую логику
    if (selectedIds.length === 1) {
      await this.selectionManager.displayEntityInfo(selectedIds[0])
      return
    }

    // Если выбрано несколько юнитов - собираем информацию по всем
    const entityState = this.stateManager.getEntityState()
    let multiInfoText = `👥 Выбрано юнитов: ${selectedIds.length}\n\n`

    for (let i = 0; i < selectedIds.length; i++) {
      const entityId = selectedIds[i]
      const entityData = entityState.entities.get(entityId)

      if (entityData) {
        try {
          const result = get_entity_info(entityId)
          const entityInfo = JSON.parse(result)
          const isBase = entityData.entityType === 'base'
          const individualText = this.createEntityInfoText(entityInfo, isBase)

          multiInfoText += `--- ЮНИТ #${entityId} ---\n`
          multiInfoText += individualText
          multiInfoText += '\n'
        } catch (error) {
          console.error(`Error getting info for entity ${entityId}:`, error)
          multiInfoText += `--- ЮНИТ #${entityId} - Ошибка загрузки ---\n`
          multiInfoText += `ID: ${entityId}\n`
          multiInfoText += `Тип: ${entityData.entityType || 'Неизвестно'}\n`
          multiInfoText += '\n'
        }
      } else {
        multiInfoText += `--- ЮНИТ #${entityId} - Не найден ---\n\n`
      }
    }

    this.updateEntityInfo(multiInfoText.trim())
  }

  /**
   * Запуск игрового цикла
   */
  gameLoop () {
    // console.log("gameLoop: calling gameStateManager.gameLoop()");
    this.gameStateManager.gameLoop()
  }

  /**
   * Пересчет позиции в координаты игры
   */
  screenToGame (x, y) {
    return this.coordinateService.screenToGame(x, y)
  }

  /**
   * Пересчет позиции в координаты экрана
   */
  gameToScreen (x, y) {
    return this.coordinateService.gameToScreen(x, y)
  }

  /**
   * Поиск базы игрока
   */
  findPlayerBase () {
    return this.entityService.findPlayerBase()
  }

  /**
   * Проверка, выбрана ли база игрока
   */
  isPlayerBaseSelected () {
    return this.selectionManager.isPlayerBaseSelected()
  }

  /**
   * Обновление состояния кнопки спавна
   */
  updateSpawnButtonState () {
    const spawnBtn = document.getElementById('spawn-btn')
    const isBaseSelected = this.selectionManager.isPlayerBaseSelected()

    if (spawnBtn) {
      spawnBtn.disabled = !isBaseSelected || !this.isInitialized
    }
  }

  /**
   * Очистка всех выделений
   */
  clearAllSelections () {
    this.selectionManager.clearAllSelections()
  }

  /**
   * Установка цели для группы
   */
  setGroupTarget (x, y) {
    this.gameStateManager.setGroupTarget(x, y)
  }

  /**
   * Отображение информации о сущности
   */
  displayEntityInfo (entityId) {
    this.selectionManager.displayEntityInfo(entityId)
  }

  /**
   * Проверка и обновление индикатора цели
   */
  checkAndUpdateTargetIndicator () {
    // Логика проверки цели
  }

  /**
   * Инициализация демо
   */
  async initializeDemo () {
    await this.init()
    this.isInitialized = true

    // Запуск игрового цикла будет при нажатии "Start Auto Update"

    // Подписываемся на события
    this.stateManager.on('gameStateUpdated', (state) => {
      this.onGameStateUpdated(state)
    })

    this.stateManager.on('selectionUpdated', (state) => {
      this.onSelectionUpdated(state)
    })

    this.stateManager.on('entitiesUpdated', (entities) => {
      this.onEntitiesUpdated(entities)
    })

    this.stateManager.on('displayUpdated', (state) => {
      this.onDisplayUpdated(state)
    })
  }

  /**
   * Запуск игрового цикла
   */
  startGameLoop () {
    // Если цикл уже запущен, ничего не делаем
    if (this.isGameLoopRunning) {
      console.log('startGameLoop: game loop already running')
      return
    }
    console.log('startGameLoop: starting game loop...')
    this.isGameLoopRunning = true
    const loop = () => {
      if (!this.isGameLoopRunning) {
        return // Stop the loop if flag is false
      }
      this.gameLoop()
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  // Обработчики событий состояния
  onGameStateUpdated (_state) {
    // Обработка изменений в игровом состоянии
    // console.log("Game state updated:", state);
  }

  onSelectionUpdated (state) {
    // Обновление индикаторов выделения для всех сущностей
    this.selectionIndicatorManager.updateSelectionIndicators(
      state.selectedEntityIds
    )
  }

  onEntitiesUpdated (_entities) {
    // Обработка изменений в сущностях
    // console.log("Entities updated:", entities.size);
  }

  onDisplayUpdated (_state) {
    // Обработка изменений в отображении
    // console.log("Display state updated:", state);
  }

  /**
   * Создание текста информации о сущности
   */
  createEntityInfoText (entityInfo, isBase = false) {
    // Helper function to get position string (handles both array and object formats)
    const getPositionString = (pos) => {
      if (!pos) return '(0.0, 0.0)'
      // Rust serializes tuples as arrays [x, y]
      if (Array.isArray(pos)) {
        return `(${pos[0].toFixed(1)}, ${pos[1].toFixed(1)})`
      }
      // Object format {x, y}
      return `(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`
    }

    // Helper function to get health string (handles both array and object formats)
    const getHealthString = (health) => {
      if (!health) return ''
      // Rust serializes tuples as arrays [current, max]
      if (Array.isArray(health)) {
        return `Здоровье: ${health[0]}/${health[1]}\n`
      }
      // Object format {current, max}
      return `Здоровье: ${health.current}/${health.max}\n`
    }

    if (isBase) {
      let text = `🏢 БАЗА #${entityInfo.id}\n`
      text += `Позиция: ${getPositionString(entityInfo.position)}\n`
      text += `Этажей: ${entityInfo.floors?.length || 0}\n`
      if (entityInfo.floors) {
        const floorNames = entityInfo.floors.map((f) => f.type).join(', ')
        text += `Типы: ${floorNames}\n`
      }
      if (entityInfo.storage) {
        // Handle storage as object {current, capacity}
        const storageCurrent =
          entityInfo.storage.current ?? entityInfo.storage[0] ?? 0
        const storageCapacity =
          entityInfo.storage.capacity ?? entityInfo.storage[1] ?? 0
        text += `Хранение: ${storageCurrent}/${storageCapacity}\n`
      }
      return text
    } else {
      let text = `⚔️ ЮНИТ #${entityInfo.id}\n`
      text += `Тип: ${entityInfo.vehicle_type || entityInfo.subtype || 'Неизвестно'}\n`
      text += `Фракция: ${entityInfo.fraction || 'Нейтрал'}\n`
      text += `Позиция: ${getPositionString(entityInfo.position)}\n`
      if (entityInfo.health) {
        text += getHealthString(entityInfo.health)
      }
      if (entityInfo.combat) {
        // Handle combat as object {damage, damage_type}
        const damage = entityInfo.combat.damage ?? entityInfo.combat[0]
        if (damage !== undefined) {
          text += `Урон: ${damage}\n`
        }
      }
      return text
    }
  }

  /**
   * Cleanup метод для очистки всех ресурсов при завершении работы
   */
  destroy () {
    if (this.isDestroyed) return
    this.isDestroyed = true

    console.log('GameDemo: Starting cleanup...')

    // Остановка игрового цикла
    this.stopGameLoop()

    // Очистка state manager
    if (this.stateManager) {
      this.stateManager.destroy()
    }

    // Очистка input handler (удаление event listeners)
    if (this.inputHandler && this.inputHandler.setupEventListeners) {
      // Event listeners будут удалены при уничтожении Pixi app
    }

    // Очистка entity renderer (удаление всех спрайтов)
    if (this.entityRenderer) {
      this.entityRenderer.cleanupAllEntities()
      this.entityRenderer.destroy()
    }

    // Очистка Pixi.js app
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true, baseTexture: true })
      this.app = null
    }

    // Очистка ссылок на подсистемы
    this.coordinateService = null
    this.entityService = null
    this.selectionIndicatorManager = null
    this.inputHandler = null
    this.selectionManager = null
    this.gameStateManager = null

    // Очистка карт
    this.bases.clear()
    this.entities.clear()

    console.log('GameDemo: Cleanup completed')
  }

  /**
   * Остановка игрового цикла
   */
  stopGameLoop () {
    if (!this.isGameLoopRunning) return
    this.isGameLoopRunning = false
    console.log('GameDemo: Game loop stopped')
  }

  /**
   * Проверка, разрушена ли игра
   */
  get isDestroyed () {
    return !this.app
  }
}

// Global demo instance for onclick handlers
let _demo
