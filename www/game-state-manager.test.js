/* eslint-env jest */
/**
 * Tests for game-state-manager.js
 */

// Mock document
const mockGetElementById = jest.fn();
global.document = {
  getElementById: mockGetElementById,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock wasm imports - use function to avoid hoisting issues
jest.mock("./wasm-imports.js", () => ({
  gameInit: jest.fn(),
  create_vehicle: jest.fn(),
  update: jest.fn(),
  set_group_target: jest.fn(),
  create_base: jest.fn(),
  build_floor: jest.fn(),
  create_random_alert: jest.fn(),
  clear_selection: jest.fn(),
}));

import { GameStateManager } from "./game-state-manager.js";

describe("GameStateManager", () => {
  let gameDemo;
  let gameStateManager;

  beforeAll(() => {
    // Setup document mocks
    jest.spyOn(document, "getElementById").mockImplementation((id) => {
      const elements = {
        "vehicle-type": { value: "scout" },
        "base-x": { value: "100" },
        "base-y": { value: "200" },
        "floor-type": { value: "storage" },
      };
      return elements[id] || null;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    gameDemo = {
      isInitialized: false,
      stateManager: {
        updateGameState: jest.fn(),
        getGameState: jest.fn(() => ({ isInitialized: false, autoUpdateEnabled: false })),
        updateSelectionState: jest.fn(),
        getSelectionState: jest.fn(() => ({ selectedEntityIds: new Set() })),
        updateEntityState: jest.fn(),
        updateEntityStateEntry: jest.fn(),
        getEntityState: jest.fn(() => ({ entities: new Map() })),
        updateDisplayState: jest.fn(),
        getDisplayState: jest.fn(() => ({ statusMessage: "" })),
      },
      entityRenderer: {
        showTargetIndicator: jest.fn(),
        alertHighlight: null,
        clearTargetIndicator: jest.fn(),
        findEntityAtPosition: jest.fn(),
        highlightTargetAlert: jest.fn(),
        createDamageEffect: jest.fn(),
        createDestructionEffect: jest.fn(),
        setupGrid: jest.fn(),
        updateGrid: jest.fn(),
        cleanupOrphanedGraphics: jest.fn(),
      },
      app: {
        stage: {
          removeChild: jest.fn(),
        },
      },
      selectedEntityIds: new Set(),
      updateStatus: jest.fn(),
      updateSpawnButtonState: jest.fn(),
      startGameLoop: jest.fn(),
      displayEntityInfo: jest.fn(),
      entities: new Map(),
      syncEntitiesWithGameState: jest.fn(),
      updateSelectedEntityInfo: jest.fn(),
      setGroupTarget: jest.fn(),
      updateSelectionState: jest.fn(),
      isGameLoopRunning: false,
    };

    gameStateManager = new GameStateManager(gameDemo);
  });

  describe("initializeGame", () => {
    it("should initialize game and update state", async () => {
      const { gameInit } = jest.requireMock("./wasm-imports.js");
      gameInit.mockReturnValue(
        JSON.stringify({
          time: 10,
          entities_count: 5,
          alerts_count: 2,
          debug_messages: [],
        }),
      );
      gameDemo.isInitialized = false;

      await gameStateManager.initializeGame();

      expect(gameInit).toHaveBeenCalled();
      expect(gameDemo.stateManager.updateGameState).toHaveBeenCalledWith({
        isInitialized: true,
        autoUpdateEnabled: false,
        time: 10,
        entitiesCount: 5,
        alertsCount: 2,
      });
      expect(gameDemo.updateStatus).toHaveBeenCalled();
    });

    it("should handle initialization error", async () => {
      const { gameInit } = jest.requireMock("./wasm-imports.js");
      gameInit.mockImplementation(() => {
        throw new Error("Init failed");
      });
      gameDemo.isInitialized = false;

      await gameStateManager.initializeGame();

      expect(gameDemo.updateStatus).toHaveBeenCalledWith(
        "Game initialization failed: Init failed",
      );
    });
  });

  describe("spawnVehicle", () => {
    beforeEach(() => {
      gameDemo.isInitialized = true;
      gameDemo.stateManager.getGameState = jest.fn(() => ({
        isInitialized: true,
        autoUpdateEnabled: false,
      }));
    });

    it("should not spawn if not initialized", async () => {
      gameDemo.isInitialized = false;

      await gameStateManager.spawnVehicle();

      expect(gameDemo.updateStatus).toHaveBeenCalledWith(
        "Please initialize the game first!",
      );
    });

    it("should not spawn if player base not selected", async () => {
      gameDemo.selectionManager = {
        isPlayerBaseSelected: jest.fn(() => false),
      };

      await gameStateManager.spawnVehicle();

      expect(gameDemo.updateStatus).toHaveBeenCalledWith(
        "Cannot spawn vehicle: Please select a player base first!",
      );
    });

    it("should spawn vehicle successfully", async () => {
      gameDemo.selectionManager = {
        isPlayerBaseSelected: jest.fn(() => true),
        selectEntity: jest.fn(),
      };
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set([1]),
      }));
      gameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([
          [1, { entityType: "base", fraction: "Player", gameX: 100, gameY: 200 }],
        ]),
      }));
      gameDemo.updateSpawnButtonState = jest.fn();

      // Mock document element for vehicle type
      const mockVehicleType = { value: "scout" };
      mockGetElementById.mockImplementation((id) => {
        if (id === "vehicle-type") return mockVehicleType;
        return null;
      });

      const { create_vehicle } = jest.requireMock("./wasm-imports.js");
      create_vehicle.mockReturnValue(
        JSON.stringify({
          success: true,
          id: 42,
          message: "Vehicle created",
        }),
      );

      await gameStateManager.spawnVehicle();

      expect(create_vehicle).toHaveBeenCalled();
      expect(gameDemo.selectionManager.selectEntity).toHaveBeenCalledWith(
        42,
        true,
        true,
      );
      expect(gameDemo.updateStatus).toHaveBeenCalledWith(
        expect.stringContaining("Vehicle spawned"),
      );
    });
  });

  describe("createBase", () => {
    beforeEach(() => {
      gameDemo.isInitialized = true;
      gameDemo.bases = new Map();
    });

    it("should create base successfully", async () => {
      // Mock document elements for base coordinates
      const mockBaseX = { value: "100" };
      const mockBaseY = { value: "200" };
      mockGetElementById.mockImplementation((id) => {
        if (id === "base-x") return mockBaseX;
        if (id === "base-y") return mockBaseY;
        return null;
      });

      const { create_base } = jest.requireMock("./wasm-imports.js");
      create_base.mockReturnValue(
        JSON.stringify({
          id: 1,
          x: 100,
          y: 200,
          floors: [],
          current_storage_usage: 0,
          total_storage_capacity: 100,
        }),
      );

      await gameStateManager.createBase();

      expect(create_base).toHaveBeenCalled();
      expect(gameDemo.bases.get(1)).toBeDefined();
      expect(gameDemo.updateStatus).toHaveBeenCalled();
    });
  });

  describe("buildFloor", () => {
    beforeEach(() => {
      gameDemo.isInitialized = true;
      gameDemo.bases = new Map([[1, { id: 1, floors: [] }]]);
    });

    it("should not build floor if no bases available", async () => {
      gameDemo.bases = new Map();

      await gameStateManager.buildFloor();

      expect(gameDemo.updateStatus).toHaveBeenCalledWith(
        "No bases available. Create a base first!",
      );
    });

    it("should build floor successfully", async () => {
      const { build_floor } = jest.requireMock("./wasm-imports.js");
      // Mock document element for floor type
      const mockFloorType = { value: "storage" };
      mockGetElementById.mockImplementation((id) => {
        if (id === "floor-type") return mockFloorType;
        return null;
      });

      build_floor.mockReturnValue(
        JSON.stringify({
          id: 1,
          floors: [{ type: "storage" }],
        }),
      );

      await gameStateManager.buildFloor();

      expect(build_floor).toHaveBeenCalled();
      expect(gameDemo.bases.get(1).floors.length).toBe(1);
      expect(gameDemo.updateStatus).toHaveBeenCalled();
    });
  });

  describe("startAutoUpdate", () => {
    it("should enable auto update", () => {
      gameStateManager.startAutoUpdate();

      expect(gameDemo.stateManager.updateGameState).toHaveBeenCalledWith({
        autoUpdateEnabled: true,
      });
      expect(gameDemo.updateStatus).toHaveBeenCalled();
      expect(gameDemo.startGameLoop).toHaveBeenCalled();
    });
  });

  describe("stopAutoUpdate", () => {
    it("should disable auto update", () => {
      gameStateManager.stopAutoUpdate();

      expect(gameDemo.stateManager.updateGameState).toHaveBeenCalledWith({
        autoUpdateEnabled: false,
      });
      expect(gameDemo.updateStatus).toHaveBeenCalled();
    });
  });

  describe("updateOnce", () => {
    it("should update game state", () => {
      const { update } = jest.requireMock("./wasm-imports.js");
      gameDemo.isInitialized = true;
      gameDemo.lastUpdate = Date.now() - 1000;
      gameDemo.stateManager.updateGameState = jest.fn();

      update.mockReturnValue(
        JSON.stringify({
          time: 15.5,
          entities_count: 6,
          alerts_count: 3,
          removed_entities: [],
          entities: [],
        }),
      );

      gameStateManager.updateOnce();

      expect(update).toHaveBeenCalled();
      expect(gameDemo.stateManager.updateGameState).toHaveBeenCalledWith({
        time: 15.5,
        entitiesCount: 6,
        alertsCount: 3,
      });
    });
  });

  describe("setGroupTarget", () => {
    it("should set group target successfully", async () => {
      const { set_group_target } = jest.requireMock("./wasm-imports.js");
      set_group_target.mockReturnValue(
        JSON.stringify({
          success: true,
          message: "Target set",
        }),
      );

      await gameStateManager.setGroupTarget(100, 200);

      expect(set_group_target).toHaveBeenCalledWith(100, 200);
      expect(gameDemo.updateStatus).toHaveBeenCalledWith(
        "Group target set: Target set",
      );
    });

    it("should handle group target failure", async () => {
      const { set_group_target } = jest.requireMock("./wasm-imports.js");
      set_group_target.mockReturnValue(
        JSON.stringify({
          success: false,
          message: "Invalid target",
        }),
      );

      await gameStateManager.setGroupTarget(100, 200);

      expect(gameDemo.updateStatus).toHaveBeenCalledWith(
        "Failed to set group target: Invalid target",
      );
    });
  });

  describe("gameLoop", () => {
    it("should call updateOnce when auto update enabled", () => {
      gameDemo.isInitialized = true;
      gameDemo.stateManager.getGameState = jest.fn(() => ({
        isInitialized: true,
        autoUpdateEnabled: true,
      }));

      // Mock updateOnce to avoid actual implementation
      gameStateManager.updateOnce = jest.fn();

      gameStateManager.gameLoop();

      expect(gameStateManager.updateOnce).toHaveBeenCalled();
    });

    it("should not call updateOnce when auto update disabled", () => {
      gameDemo.isInitialized = true;
      gameDemo.stateManager.getGameState = jest.fn(() => ({
        isInitialized: true,
        autoUpdateEnabled: false,
      }));

      // Mock updateOnce to avoid actual implementation
      gameStateManager.updateOnce = jest.fn();

      gameStateManager.gameLoop();

      expect(gameStateManager.updateOnce).not.toHaveBeenCalled();
    });
  });
});
import { GameStateManager } from './game-state-manager.js';

// Mock document
const mockGetElementById = jest.fn();
global.document = {
  getElementById: mockGetElementById,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock wasm imports
jest.mock('./wasm-imports.js', () => ({
  gameInit: jest.fn(),
  create_vehicle: jest.fn(),
  update: jest.fn(),
  set_group_target: jest.fn(),
  create_base: jest.fn(),
  build_floor: jest.fn(),
  create_random_alert: jest.fn(),
  clear_selection: jest.fn(),
}));

describe('GameStateManager - Additional Coverage Tests', () => {
  let gameDemo;
  let gameStateManager;

  beforeAll(() => {
    // Setup document mocks
    jest.spyOn(document, 'getElementById').mockImplementation((id) => {
      const elements = {
        'vehicle-type': { value: 'scout' },
        'base-x': { value: '100' },
        'base-y': { value: '200' },
        'floor-type': { value: 'storage' },
      };
      return elements[id] || null;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    gameDemo = {
      isInitialized: false,
      stateManager: {
        updateGameState: jest.fn(),
        getGameState: jest.fn(() => ({ isInitialized: false, autoUpdateEnabled: false })),
        updateSelectionState: jest.fn(),
        getSelectionState: jest.fn(() => ({ selectedEntityIds: new Set() })),
        updateEntityState: jest.fn(),
        updateEntityStateEntry: jest.fn(),
        getEntityState: jest.fn(() => ({ entities: new Map() })),
        updateDisplayState: jest.fn(),
        getDisplayState: jest.fn(() => ({ statusMessage: '' })),
      },
      entityRenderer: {
        showTargetIndicator: jest.fn(),
        alertHighlight: null,
        clearTargetIndicator: jest.fn(),
        findEntityAtPosition: jest.fn(),
        highlightTargetAlert: jest.fn(),
        createDamageEffect: jest.fn(),
        createDestructionEffect: jest.fn(),
        setupGrid: jest.fn(),
        updateGrid: jest.fn(),
        cleanupOrphanedGraphics: jest.fn(),
      },
      app: {
        stage: {
          removeChild: jest.fn(),
        },
      },
      selectedEntityIds: new Set(),
      updateStatus: jest.fn(),
      updateSpawnButtonState: jest.fn(),
      startGameLoop: jest.fn(),
      displayEntityInfo: jest.fn(),
      entities: new Map(),
      syncEntitiesWithGameState: jest.fn(),
      updateSelectedEntityInfo: jest.fn(),
      setGroupTarget: jest.fn(),
      updateSelectionState: jest.fn(),
      isGameLoopRunning: false,
      lastUpdate: Date.now() - 1000,
    };

    gameStateManager = new GameStateManager(gameDemo);
  });

  describe('_checkInitialized', () => {
    it('should return true when game is initialized', () => {
      gameDemo.isInitialized = true;
      
      const result = gameStateManager._checkInitialized();
      
      expect(result).toBe(true);
    });

    it('should return false and update status when game is not initialized', () => {
      gameDemo.isInitialized = false;
      
      const result = gameStateManager._checkInitialized();
      
      expect(result).toBe(false);
      expect(gameDemo.updateStatus).toHaveBeenCalledWith('Please initialize the game first!');
    });
  });

  describe('_handleTargetSet', () => {
    it('should handle target set with clear selection', () => {
      gameDemo.entityRenderer.alertHighlight = {};
      gameDemo.app.stage.removeChild = jest.fn();
      gameDemo.selectionManager = {
        clearAllSelections: jest.fn()
      };
      
      gameStateManager._handleTargetSet(100, 200, true);
      
      expect(gameDemo.entityRenderer.showTargetIndicator).toHaveBeenCalledWith(100, 200);
      expect(gameDemo.selectionManager.clearAllSelections).toHaveBeenCalled();
      expect(gameDemo.app.stage.removeChild).toHaveBeenCalled();
      expect(gameDemo.entityRenderer.alertHighlight).toBeNull();
    });

    it('should handle target set without clear selection', () => {
      gameDemo.entityRenderer.alertHighlight = {};
      gameDemo.app.stage.removeChild = jest.fn();
      gameDemo.selectionManager = {
        clearAllSelections: jest.fn()
      };
      
      gameStateManager._handleTargetSet(100, 200, false);
      
      expect(gameDemo.entityRenderer.showTargetIndicator).toHaveBeenCalledWith(100, 200);
      expect(gameDemo.selectionManager.clearAllSelections).not.toHaveBeenCalled();
      expect(gameDemo.app.stage.removeChild).toHaveBeenCalled();
      expect(gameDemo.entityRenderer.alertHighlight).toBeNull();
    });
  });

  describe('createRandomAlert', () => {
    it('should not create alert when not initialized', async () => {
      gameDemo.isInitialized = false;
      
      await gameStateManager.createRandomAlert();
      
      expect(gameDemo.updateStatus).toHaveBeenCalledWith('Please initialize the game first!');
    });

    it('should create random alert successfully', async () => {
      gameDemo.isInitialized = true;
      const { create_random_alert } = require('./wasm-imports.js');
      create_random_alert.mockReturnValue(JSON.stringify({
        success: true,
        id: 1,
        message: 'Alert created'
      }));
      
      await gameStateManager.createRandomAlert();
      
      expect(create_random_alert).toHaveBeenCalled();
      expect(gameDemo.updateStatus).toHaveBeenCalledWith(expect.stringContaining('Random alert created'));
    });

    it('should handle alert creation failure', async () => {
      gameDemo.isInitialized = true;
      const { create_random_alert } = require('./wasm-imports.js');
      create_random_alert.mockReturnValue(JSON.stringify({
        success: false,
        message: 'Failed to create alert'
      }));
      
      await gameStateManager.createRandomAlert();
      
      expect(gameDemo.updateStatus).toHaveBeenCalledWith(expect.stringContaining('Failed to create alert'));
    });

    it('should handle error during alert creation', async () => {
      gameDemo.isInitialized = true;
      const { create_random_alert } = require('./wasm-imports.js');
      create_random_alert.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      await gameStateManager.createRandomAlert();
      
      expect(gameDemo.updateStatus).toHaveBeenCalledWith(expect.stringContaining('Alert creation failed'));
    });
  });

  describe('buildFloor', () => {
    it('should not build floor when not initialized', async () => {
      gameDemo.isInitialized = false;
      
      await gameStateManager.buildFloor();
      
      expect(gameDemo.updateStatus).toHaveBeenCalledWith('Please initialize the game first!');
    });

    it('should handle error during floor building', async () => {
      gameDemo.isInitialized = true;
      gameDemo.bases = new Map([[1, { id: 1, floors: [] }]]);
      const { build_floor } = require('./wasm-imports.js');
      build_floor.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      await gameStateManager.buildFloor();
      
      expect(gameDemo.updateStatus).toHaveBeenCalledWith(expect.stringContaining('Floor building failed'));
    });
  });

  describe('createBase', () => {
    it('should not create base when not initialized', async () => {
      gameDemo.isInitialized = false;
      
      await gameStateManager.createBase();
      
      expect(gameDemo.updateStatus).toHaveBeenCalledWith('Please initialize the game first!');
    });

    it('should handle error during base creation', async () => {
      gameDemo.isInitialized = true;
      const { create_base } = require('./wasm-imports.js');
      create_base.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      await gameStateManager.createBase();
      
      expect(gameDemo.updateStatus).toHaveBeenCalledWith(expect.stringContaining('Base creation failed'));
    });
  });
});