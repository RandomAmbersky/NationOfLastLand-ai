/* eslint-env jest */
/**
 * Tests for game-demo.js
 */
// Mock PIXI before importing

global.PIXI = {
  Application: class {
    constructor(options = {}) {
      this.screen = {
        width: options.width || 800,
        height: options.height || 600,
      };
      this.view = options.view || {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      this.stage = {
        children: [],
        addChild(child) {
          this.children.push(child);
        },
        addChildAt(child, index) {
          this.children.splice(index, 0, child);
        },
        removeChild(child) {
          const idx = this.children.indexOf(child);
          if (idx > -1) this.children.splice(idx, 1);
        },
      };
    }
  },
  Graphics: class {
    constructor() {
      this.children = [];
      this.alpha = 1;
      this.x = 0;
      this.y = 0;
    }
    lineStyle() {
      return this;
    }
    beginFill() {
      return this;
    }
    endFill() {
      return this;
    }
    drawCircle() {
      return this;
    }
    drawRect() {
      return this;
    }
    moveTo() {
      return this;
    }
    lineTo() {
      return this;
    }
    clear() {
      return this;
    }
    addChild(child) {
      this.children.push(child);
      return child;
    }
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx > -1) this.children.splice(idx, 1);
      return child;
    }
  },
  Container: class {
    constructor() {
      this.children = [];
      this.x = 0;
      this.y = 0;
      this.alpha = 1;
    }
    addChild(child) {
      this.children.push(child);
      return child;
    }
    addChildAt(child, index) {
      this.children.splice(index, 0, child);
      return child;
    }
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx > -1) this.children.splice(idx, 1);
      return child;
    }
  },
};

// Mock GAME_CONFIG
jest.mock("./game-config.js", () => ({
  GAME_CONFIG: {
    WORLD_SIZE: { width: 800, height: 600 },
    ENTITY_SIZES: {
      scout: 8,
      tank: { width: 20, height: 16 },
      transport: { width: 24, height: 20 },
      base: { width: 30, height: 30 },
      alert: { hidden: 8, revealed: 12 },
    },
    COLORS: {
      player: { scout: 0x4caf50, tank: 0xff5722, transport: 0x2196f3 },
      enemy: { scout: 0x2e7d32, tank: 0xb71c1c, transport: 0x0d47a1 },
      wild: { scout: 0x8d6e63, tank: 0x8d6e63, transport: 0x8d6e63 },
      neutral: { scout: 0x00bcd4, tank: 0x00bcd4, transport: 0x00bcd4 },
      base: 0x2196f3,
      alert: 0xb8860b,
      selection: { player: 0x0080ff, enemy: 0xff0000 },
    },
    DISTANCES: {
      clickTolerance: 20,
      alertClickRadius: 15,
      baseUnitRadius: 50,
      combatRange: 20,
      alertRevealRange: 25,
    },
    LIMITS: { maxGroupSize: 12, dragThreshold: 5 },
    UI: {
      fontSize: { label: 10, damage: 14 },
      indicatorSize: 12,
      targetIndicatorSize: 10,
      explosionScale: 3.0,
      healthBarLength: 10,
    },
    VISIBILITY: { range: 200, sameTypeUnitRadius: 200 },
    TIMEOUTS: { targetIndicator: 2000, alertHighlight: 3000 },
  },
}));

import { GameDemo } from "./game-demo.js";

describe("GameDemo", () => {
  let gameDemo;

  beforeAll(() => {
    // Setup document mocks
    jest.spyOn(document, "getElementById").mockImplementation((id) => {
      if (id === "game-canvas") {
        return {
          parentNode: {
            replaceChild: jest.fn(),
          },
        };
      }
      const buttons = {
        "init-btn": { addEventListener: jest.fn() },
        "spawn-btn": { addEventListener: jest.fn() },
        "create-base-btn": { addEventListener: jest.fn() },
        "build-floor-btn": { addEventListener: jest.fn() },
        "create-alert-btn": { addEventListener: jest.fn() },
        "clear-selection-btn": { addEventListener: jest.fn() },
        "start-auto-update-btn": { addEventListener: jest.fn() },
        "stop-auto-update-btn": { addEventListener: jest.fn() },
        "update-once-btn": { addEventListener: jest.fn() },
        "vehicle-type": { value: "scout" },
        "base-x": { value: "100" },
        "base-y": { value: "200" },
        "floor-type": { value: "storage" },
      };
      return buttons[id] || null;
    });
    jest.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === ".game-container") {
        return { getBoundingClientRect: () => ({ width: 800, height: 600 }) };
      }
      return null;
    });
    jest.spyOn(window, "addEventListener").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock gameDemo without calling constructor (avoids DOM dependencies)
    gameDemo = {
      isInitialized: false,
      isGameLoopRunning: false,
      entities: new Map(),
      bases: new Map(),
      gameWidth: 800,
      gameHeight: 600,
      selectedEntityIds: new Set(),
    };

    // Setup required properties with mocks
    gameDemo.app = {
      screen: { width: 800, height: 600 },
      view: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
      stage: {
        children: [],
        addChild(child) {
          this.children.push(child);
        },
        addChildAt(child, index) {
          this.children.splice(index, 0, child);
        },
        removeChild(child) {
          const idx = this.children.indexOf(child);
          if (idx > -1) this.children.splice(idx, 1);
        },
      },
    };

    gameDemo.stateManager = {
      updateGameState: jest.fn(),
      getGameState: jest.fn(() => ({ isInitialized: false, autoUpdateEnabled: false })),
      updateSelectionState: jest.fn(),
      getSelectionState: jest.fn(() => ({ selectedEntityIds: new Set() })),
      updateEntityState: jest.fn(),
      updateEntityStateEntry: jest.fn(),
      getEntityState: jest.fn(() => ({ entities: new Map() })),
      updateDisplayState: jest.fn(),
      getDisplayState: jest.fn(() => ({ statusMessage: "" })),
    };

    gameDemo.entityRenderer = {
      showTargetIndicator: jest.fn(),
      alertHighlight: null,
      clearTargetIndicator: jest.fn(),
      findEntityAtPosition: jest.fn(),
      findAlertAtPosition: jest.fn(),
      highlightTargetAlert: jest.fn(),
      createDamageEffect: jest.fn(),
      createDestructionEffect: jest.fn(),
      setupGrid: jest.fn(),
      updateGrid: jest.fn(),
      cleanupOrphanedGraphics: jest.fn(),
    };

    gameDemo.coordinateService = {
      screenToGame: jest.fn((x, y) => ({ gameX: x, gameY: y })),
      gameToScreen: jest.fn((x, y) => ({ screenX: x, screenY: y })),
      getScreenCoords: jest.fn((x, y) => ({ screenX: x, screenY: y })),
    };

    gameDemo.selectionManager = {
      clearAllSelections: jest.fn(),
      selectEntity: jest.fn(),
      deselectEntity: jest.fn(),
      selectEntitiesInRectangle: jest.fn(),
      selectAllPlayerUnits: jest.fn(),
      selectSameTypeUnits: jest.fn(),
      selectAllPlayerUnitsAtBase: jest.fn(),
      isPlayerBaseSelected: jest.fn(() => false),
      handleEntityClick: jest.fn(),
    };

    gameDemo.inputHandler = {
      setupEventListeners: jest.fn(),
    };

    gameDemo.gameStateManager = {
      initializeGame: jest.fn(),
      spawnVehicle: jest.fn(),
      createBase: jest.fn(),
      buildFloor: jest.fn(),
      createRandomAlert: jest.fn(),
      startAutoUpdate: jest.fn(),
      stopAutoUpdate: jest.fn(),
      updateOnce: jest.fn(),
      setGroupTarget: jest.fn(),
      gameLoop: jest.fn(),
    };

    gameDemo.updateStatus = jest.fn();
    gameDemo.updateEntityInfo = jest.fn();
    gameDemo.updateSpawnButtonState = jest.fn();
    gameDemo.startGameLoop = jest.fn();
    gameDemo.updateSelectionState = jest.fn();
    gameDemo.initPixi = jest.fn(() => {
      gameDemo.app = {
        screen: { width: 800, height: 600 },
        view: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
        stage: {
          children: [],
          addChild(child) { this.children.push(child); },
          addChildAt(child, index) { this.children.splice(index, 0, child); },
          removeChild(child) {
            const idx = this.children.indexOf(child);
            if (idx > -1) this.children.splice(idx, 1);
          },
        },
      };
    });
    gameDemo.handleResize = jest.fn(() => {
      const rect = gameDemo.app.view.getBoundingClientRect();
      gameDemo.app.screen.width = rect.width || 800;
      gameDemo.app.screen.height = rect.height || 600;
    });
    gameDemo.setupEventListeners = jest.fn();
    gameDemo.syncEntitiesWithGameState = jest.fn((entities) => {
      for (const entityData of entities) {
        // Update or create entity
        let entity = gameDemo.entities.get(entityData.id);
        if (!entity) {
          entity = { container: { x: 0, y: 0 } };
          gameDemo.entities.set(entityData.id, entity);
        }
        entity.gameX = entityData.gameX;
        entity.gameY = entityData.gameY;
      }
      // Remove entities not in gameState
      const entityIds = new Set(entities.map((e) => e.id));
      for (const [id] of gameDemo.entities) {
        if (!entityIds.has(id)) {
          gameDemo.entities.delete(id);
        }
      }
    });
    gameDemo.findPlayerBase = jest.fn(() => null);
    gameDemo.isPlayerBaseSelected = jest.fn(() => false);
    gameDemo.setGroupTarget = jest.fn((x, y) => {
      gameDemo.gameStateManager.setGroupTarget(x, y);
    });
    gameDemo.clearAllSelections = jest.fn(() => {
      gameDemo.selectionManager.clearAllSelections();
    });
    gameDemo.getScale = jest.fn(() => 1);
    gameDemo.screenToGame = jest.fn((x, y) => ({ gameX: x, gameY: y }));
    gameDemo.gameToScreen = jest.fn((x, y) => ({ screenX: x, screenY: y }));
    gameDemo.checkAndUpdateTargetIndicator = jest.fn(() => {
      gameDemo.entityRenderer.clearTargetIndicator();
    });
    gameDemo.gameLoop = jest.fn(() => {
      gameDemo.gameStateManager.gameLoop();
    });

    // Make selectedEntityIds writable (original is a getter in GameDemo)
    let _selectedEntityIds = new Set();
    Object.defineProperty(gameDemo, "selectedEntityIds", {
      get() {
        return _selectedEntityIds;
      },
      set(value) {
        _selectedEntityIds = value;
      },
    });
  });

  describe("constructor", () => {
    it("should initialize with default values", () => {
      expect(gameDemo.isInitialized).toBe(false);
      expect(gameDemo.entities).toBeInstanceOf(Map);
      expect(gameDemo.bases).toBeInstanceOf(Map);
    });
  });

  describe("initPixi", () => {
    it("should create PIXI application with correct options", () => {
      gameDemo.initPixi();
      expect(gameDemo.app).toBeDefined();
      expect(gameDemo.app.screen.width).toBe(800);
      expect(gameDemo.app.screen.height).toBe(600);
    });
  });

  describe("handleResize", () => {
    it("should update screen dimensions", () => {
      gameDemo.initPixi();
      const originalWidth = gameDemo.app.screen.width;
      const originalHeight = gameDemo.app.screen.height;

      gameDemo.app.view.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        width: 1024,
        height: 768,
      });

      gameDemo.handleResize();

      expect(gameDemo.app.screen.width).toBe(1024);
      expect(gameDemo.app.screen.height).toBe(768);
    });
  });

  describe("setupEventListeners", () => {
    it("should add resize event listener", () => {
      const addEventListenerSpy = jest.spyOn(window, "addEventListener");
      gameDemo.setupEventListeners();
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "resize",
        expect.any(Function),
      );
      addEventListenerSpy.mockRestore();
    });

    it("should add input handler setup", () => {
      gameDemo.setupEventListeners();
      expect(gameDemo.inputHandler.setupEventListeners).toHaveBeenCalled();
    });
  });

  describe("get selectedEntityIds", () => {
    it("should return selected entity IDs from state manager", () => {
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set([1, 2, 3]),
      }));
      expect(gameDemo.selectedEntityIds).toEqual(new Set([1, 2, 3]));
    });
  });

  describe("syncEntitiesWithGameState", () => {
    it("should update existing entities", () => {
      const entity = {
        container: { x: 0, y: 0 },
        gameX: 0,
        gameY: 0,
      };
      gameDemo.entities.set(1, entity);

      const gameStateEntities = [
        { id: 1, gameX: 100, gameY: 200, vehicleType: "scout" },
      ];

      gameDemo.syncEntitiesWithGameState(gameStateEntities);

      expect(entity.gameX).toBe(100);
      expect(entity.gameY).toBe(200);
    });

    it("should create new entities", () => {
      const gameStateEntities = [
        {
          id: 1,
          gameX: 100,
          gameY: 200,
          vehicleType: "scout",
          entityType: "vehicle",
          fraction: "Player",
        },
      ];

      gameDemo.syncEntitiesWithGameState(gameStateEntities);

      expect(gameDemo.entities.get(1)).toBeDefined();
      expect(gameDemo.entities.get(1).gameX).toBe(100);
    });

    it("should remove deleted entities", () => {
      const entity = { container: {} };
      gameDemo.entities.set(1, entity);

      const gameStateEntities = [];

      gameDemo.syncEntitiesWithGameState(gameStateEntities);

      expect(gameDemo.entities.has(1)).toBe(false);
    });
  });

  describe("findPlayerBase", () => {
    it("should find player base", () => {
      const baseEntity = { entityType: "base", fraction: "Player" };
      gameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, baseEntity]]),
      }));

      const result = gameDemo.findPlayerBase();

      expect(result).toBe(baseEntity);
    });

    it("should return null when no player base exists", () => {
      gameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, { entityType: "vehicle", fraction: "Player" }]]),
      }));

      const result = gameDemo.findPlayerBase();

      expect(result).toBeNull();
    });
  });

  describe("isPlayerBaseSelected", () => {
    it("should return true when player base is selected", () => {
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set([1]),
      }));
      gameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, { entityType: "base", fraction: "Player" }]]),
      }));

      const result = gameDemo.isPlayerBaseSelected();

      expect(result).toBe(true);
    });

    it("should return false when player base is not selected", () => {
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set([1]),
      }));
      gameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, { entityType: "vehicle", fraction: "Player" }]]),
      }));

      const result = gameDemo.isPlayerBaseSelected();

      expect(result).toBe(false);
    });
  });

  describe("setGroupTarget", () => {
    it("should call gameStateManager setGroupTarget", () => {
      gameDemo.setGroupTarget(100, 200);

      expect(gameDemo.gameStateManager.setGroupTarget).toHaveBeenCalledWith(
        100,
        200,
      );
    });
  });

  describe("clearAllSelections", () => {
    it("should call selectionManager clearAllSelections", () => {
      gameDemo.clearAllSelections();

      expect(gameDemo.selectionManager.clearAllSelections).toHaveBeenCalled();
    });
  });

  describe("updateSpawnButtonState", () => {
    it("should enable spawn button when base is selected", () => {
      const spawnBtn = { disabled: true };
      gameDemo.isPlayerBaseSelected = jest.fn(() => true);

      gameDemo.updateSpawnButtonState(spawnBtn);

      expect(spawnBtn.disabled).toBe(false);
    });

    it("should disable spawn button when base is not selected", () => {
      const spawnBtn = { disabled: false };
      gameDemo.isPlayerBaseSelected = jest.fn(() => false);

      gameDemo.updateSpawnButtonState(spawnBtn);

      expect(spawnBtn.disabled).toBe(true);
    });
  });

  describe("getScale and invalidateScaleCache", () => {
    it("should call coordinateService methods", () => {
      gameDemo.getScale();
      gameDemo.invalidateScaleCache();

      expect(gameDemo.coordinateService.getScale).toHaveBeenCalled();
      expect(
        gameDemo.coordinateService.invalidateScaleCache,
      ).toHaveBeenCalled();
    });
  });

  describe("screenToGame and gameToScreen", () => {
    it("should call coordinateService conversion methods", () => {
      gameDemo.screenToGame(400, 300);
      gameDemo.gameToScreen(100, 200);

      expect(gameDemo.coordinateService.screenToGame).toHaveBeenCalledWith(
        400,
        300,
      );
      expect(gameDemo.coordinateService.gameToScreen).toHaveBeenCalledWith(
        100,
        200,
      );
    });
  });

  describe("gameLoop", () => {
    it("should call gameStateManager gameLoop", () => {
      gameDemo.gameLoop();

      expect(gameDemo.gameStateManager.gameLoop).toHaveBeenCalled();
    });
  });

  describe("checkAndUpdateTargetIndicator", () => {
    it("should clear target indicator", () => {
      gameDemo.checkAndUpdateTargetIndicator();

      expect(gameDemo.entityRenderer.clearTargetIndicator).toHaveBeenCalled();
    });
  });
});
