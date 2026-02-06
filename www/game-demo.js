import { CoreStateManager } from "./core-state-manager.js";
import { GameStateManager } from "./game-state-manager.js";
import { SelectionManager } from "./selection-manager.js";
import { EntityRenderer } from "./entity-renderer.js";
import { InputHandler } from "./input-handler.js";
import { CoordinateService } from "./coordinate-service.js";
import { EntityService } from "./entity-service.js";
import { SelectionIndicatorManager } from "./selection-indicator.js";
import { GAME_CONFIG } from "./game-config.js";
import { init } from "./wasm-imports.js";

/**
 * Главный класс демонстрации игры
 * Отвечает за координацию всех компонентов
 */
export class GameDemo {
  /**
   * Создает экземпляр игры
   */
  constructor() {
    // Центральное состояние игры
    this.stateManager = new CoreStateManager();

    // Подсистемы
    this.coordinateService = new CoordinateService(this);
    this.entityService = new EntityService(this);
    this.selectionIndicatorManager = new SelectionIndicatorManager(this);
    this.inputHandler = new InputHandler(this);
    this.entityRenderer = new EntityRenderer(this);
    this.selectionManager = new SelectionManager(this);
    this.gameStateManager = new GameStateManager(this);

    // Инициализация состояния
    this.app = null;
    this.isInitialized = false;
    this.lastUpdate = Date.now();
    this.bases = new Map();
    this.entities = new Map();

    // Установка обработчиков событий
    this.setupEventListeners();

    this.initPixi();
  }

  /**
   * Инициализация Pixi.js
   */
  initPixi() {
    // Get canvas container dimensions
    const canvasContainer = document.querySelector(".game-container");
    const rect = canvasContainer.getBoundingClientRect();

    // Create Pixi.js application with responsive size
    this.app = new PIXI.Application({
      width: rect.width,
      height: rect.height,
      backgroundColor: 0x2a2a2a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Add canvas to DOM
    const canvas = document.getElementById("game-canvas");
    canvas.parentNode.replaceChild(this.app.view, canvas);

    // Store original game world size from config
    this.gameWidth = GAME_CONFIG.WORLD_SIZE.width;
    this.gameHeight = GAME_CONFIG.WORLD_SIZE.height;

    // Setup subsystems
    this.entityRenderer.setupGrid();
    this.inputHandler.setupEventListeners();

    // Add resize handler
    window.addEventListener("resize", () => this.handleResize());
  }

  /**
   * Обработка изменения размера окна
   */
  handleResize() {
    const canvasContainer = document.querySelector(".game-container");
    const rect = canvasContainer.getBoundingClientRect();

    if (this.app) {
      this.app.renderer.resize(rect.width, rect.height);
      this.coordinateService.invalidateScaleCache();
    }
  }

  /**
   * Настройка обработчиков событий
   */
  setupEventListeners() {
    // Обработчики событий для кнопок
    document
      .getElementById("init-btn")
      .addEventListener("click", () => this.gameStateManager.initializeGame());
    document
      .getElementById("spawn-btn")
      .addEventListener("click", () => this.gameStateManager.spawnVehicle());
    document
      .getElementById("create-base-btn")
      .addEventListener("click", () => this.gameStateManager.createBase());
    document
      .getElementById("build-floor-btn")
      .addEventListener("click", () => this.gameStateManager.buildFloor());
    document
      .getElementById("create-alert-btn")
      .addEventListener("click", () =>
        this.gameStateManager.createRandomAlert(),
      );
    document
      .getElementById("clear-selection-btn")
      .addEventListener("click", () =>
        this.selectionManager.clearAllSelections(),
      );
    document
      .getElementById("start-auto-update-btn")
      .addEventListener("click", () => this.gameStateManager.startAutoUpdate());
    document
      .getElementById("stop-auto-update-btn")
      .addEventListener("click", () => this.gameStateManager.stopAutoUpdate());
    document
      .getElementById("update-once-btn")
      .addEventListener("click", () => this.gameStateManager.updateOnce());
  }

  // Геттер для совместимости с selection-manager.js
  get selectedEntityIds() {
    return this.stateManager.getSelectionState().selectedEntityIds;
  }

  /**
   * Инициализация игры
   */
  async init() {
    try {
      // Initialize WebAssembly module
      console.log("Attempting WASM initialization...");

      // Try to call the init function that should be available from import
      if (typeof init !== "undefined") {
        await init();
        console.log("WASM initialized successfully with direct call");
      } else {
        // Fallback approach - try to load WASM directly
        console.log("Direct init not available, trying alternative approach");
        // This approach assumes the WASM module is already loaded via the import
        // We'll try to access it through the window object or global scope
        if (typeof window !== "undefined" && window.init) {
          await window.init();
          console.log("WASM initialized successfully via window object");
        } else {
          throw new Error("init function not available in any known location");
        }
      }

      this.updateStatus(
        "WebAssembly loaded successfully!\nInitializing game automatically...",
      );

      // Automatically initialize the game
      await this.gameStateManager.initializeGame();
    } catch (error) {
      this.updateStatus(`Error loading WebAssembly: ${error.message}`);
      console.error("WASM init error:", error);
      console.error("Stack trace:", error.stack);
      // Try a more specific error message for debugging
      if (typeof init === "undefined") {
        console.error(
          "The init function is undefined - import may have failed",
        );
      }
    }
  }

  /**
   * Получение масштаба
   */
  getScale() {
    return this.coordinateService.getScale();
  }

  /**
   * Инвалидация кэша масштаба
   */
  invalidateScaleCache() {
    this.coordinateService.invalidateScaleCache();
  }

  /**
   * Обновление состояния выделения
   */
  updateSelectionState(removedEntities = []) {
    const selectionState = this.stateManager.getSelectionState();
    const selectedIds = Array.from(selectionState.selectedEntityIds);

    // Обновляем состояние в менеджере
    this.stateManager.updateSelectionState(selectedIds, removedEntities);
  }

  /**
   * Синхронизация сущностей с игровым состоянием
   */
  syncEntitiesWithGameState(entities) {
    // Обновляем состояние сущностей
    this.stateManager.updateEntityState(entities);

    // Синхронизируем сущности с отображением
    for (const entityData of entities) {
      this.createEntityFromGameState(entityData);
    }
  }

  /**
   * Создание сущности из игрового состояния
   */
  createEntityFromGameState(entityData) {
    // Используем централизованную логику создания
    const entity = this.entityService.createEntity(entityData);

    if (entity && entity.entityType === "base") {
      this.bases.set(entity.id, entity);
    }

    // Обновляем отображение
    if (entity) {
      this.entityRenderer.createEntitySprite(
        entity.id,
        entity.gameX,
        entity.gameY,
        entity.vehicleType,
        entity.fraction,
        entity.entityType,
      );
    }
  }

  /**
   * Обновление статуса
   */
  updateStatus(message) {
    this.stateManager.updateDisplayState({ statusMessage: message });
    const statusDiv = document.getElementById("status");
    if (statusDiv) {
      statusDiv.textContent = message;
    }
  }

  /**
   * Обновление информации о сущности
   */
  updateEntityInfo(info) {
    this.stateManager.updateDisplayState({ entityInfo: info });

    const entityInfoDiv = document.getElementById("entity-info");
    if (entityInfoDiv) {
      if (info) {
        entityInfoDiv.style.display = "block";
        entityInfoDiv.textContent = info;
      } else {
        entityInfoDiv.style.display = "none";
      }
    }
  }

  /**
   * Обновление информации о выделенных сущностях
   */
  async updateSelectedEntityInfo(entities) {
    const selectionState = this.stateManager.getSelectionState();
    const selectedIds = Array.from(selectionState.selectedEntityIds);

    if (selectedIds.length > 0) {
      const firstSelectedId = selectedIds[0];
      await this.selectionManager.displayEntityInfo(firstSelectedId);
    } else {
      this.updateEntityInfo(null);
    }
  }

  /**
   * Запуск игрового цикла
   */
  gameLoop() {
    this.gameStateManager.gameLoop();
  }

  /**
   * Пересчет позиции в координаты игры
   */
  screenToGame(x, y) {
    return this.coordinateService.screenToGame(x, y);
  }

  /**
   * Пересчет позиции в координаты экрана
   */
  gameToScreen(x, y) {
    return this.coordinateService.gameToScreen(x, y);
  }

  /**
   * Поиск базы игрока
   */
  findPlayerBase() {
    return this.entityService.findPlayerBase();
  }

  /**
   * Проверка, выбрана ли база игрока
   */
  isPlayerBaseSelected() {
    return this.selectionManager.isPlayerBaseSelected();
  }

  /**
   * Обновление состояния кнопки спавна
   */
  updateSpawnButtonState() {
    const spawnBtn = document.getElementById("spawn-btn");
    const isBaseSelected = this.selectionManager.isPlayerBaseSelected();

    if (spawnBtn) {
      spawnBtn.disabled = !isBaseSelected || !this.isInitialized;
    }
  }

  /**
   * Очистка всех выделений
   */
  clearAllSelections() {
    this.selectionManager.clearAllSelections();
  }

  /**
   * Установка цели для группы
   */
  setGroupTarget(x, y) {
    this.gameStateManager.setGroupTarget(x, y);
  }

  /**
   * Отображение информации о сущности
   */
  displayEntityInfo(entityId) {
    this.selectionManager.displayEntityInfo(entityId);
  }

  /**
   * Проверка и обновление индикатора цели
   */
  checkAndUpdateTargetIndicator() {
    // Логика проверки цели
  }

  /**
   * Инициализация демо
   */
  async initializeDemo() {
    await this.init();
    this.isInitialized = true;

    // Подписываемся на события
    this.stateManager.on("gameStateUpdated", (state) => {
      this.onGameStateUpdated(state);
    });

    this.stateManager.on("selectionUpdated", (state) => {
      this.onSelectionUpdated(state);
    });

    this.stateManager.on("entitiesUpdated", (entities) => {
      this.onEntitiesUpdated(entities);
    });

    this.stateManager.on("displayUpdated", (state) => {
      this.onDisplayUpdated(state);
    });
  }

  // Обработчики событий состояния
  onGameStateUpdated(state) {
    // Обработка изменений в игровом состоянии
    console.log("Game state updated:", state);
  }

  onSelectionUpdated(state) {
    // Обработка изменений в состоянии выделения
    console.log("Selection state updated:", state);
  }

  onEntitiesUpdated(entities) {
    // Обработка изменений в сущностях
    console.log("Entities updated:", entities.size);
  }

  onDisplayUpdated(state) {
    // Обработка изменений в отображении
    console.log("Display state updated:", state);
  }

  /**
   * Создание текста информации о сущности
   */
  createEntityInfoText(entityInfo, isBase = false) {
    if (isBase) {
      let text = `🏢 БАЗА #${entityInfo.id}\n`;
      text += `Позиция: (${entityInfo.position.x.toFixed(1)}, ${entityInfo.position.y.toFixed(1)})\n`;
      text += `Этажей: ${entityInfo.floors?.length || 0}\n`;
      if (entityInfo.floors) {
        const floorNames = entityInfo.floors.map(f => f.type).join(", ");
        text += `Типы: ${floorNames}\n`;
      }
      if (entityInfo.storage) {
        text += `Хранение: ${entityInfo.storage.current}/${entityInfo.storage.capacity}\n`;
      }
      return text;
    } else {
      let text = `⚔️ ЮНИТ #${entityInfo.id}\n`;
      text += `Тип: ${entityInfo.vehicle_type || entityInfo.subtype || "Неизвестно"}\n`;
      text += `Фракция: ${entityInfo.fraction || "Нейтрал"}\n`;
      text += `Позиция: (${entityInfo.position.x.toFixed(1)}, ${entityInfo.position.y.toFixed(1)})\n`;
      if (entityInfo.health) {
        text += `Здоровье: ${entityInfo.health.current}/${entityInfo.health.max}\n`;
      }
      if (entityInfo.combat) {
        text += `Урон: ${entityInfo.combat.damage}\n`;
      }
      return text;
    }
  }
}

// Global demo instance for onclick handlers
let demo;
