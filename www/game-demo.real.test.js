/* eslint-env jest */
/**
 * Tests for game-demo.js - Real implementation tests
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
      this.renderer = {
        resize: jest.fn()
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
import { initWasm } from "./wasm-imports.js";

// Mock dependencies
jest.mock("./core-state-manager.js");
jest.mock("./game-state-manager.js");
jest.mock("./selection-manager.js");
jest.mock("./entity-renderer.js");
jest.mock("./input-handler.js");
jest.mock("./coordinate-service.js");
jest.mock("./entity-service.js");
jest.mock("./selection-indicator.js");
jest.mock("./wasm-imports.js");

describe("GameDemo - Real Implementation Tests", () => {
  beforeEach(() => {
    // Mock document
    const statusDiv = { textContent: "" };
    const entityInfoDiv = { style: {}, textContent: "" };
    
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
        "status": statusDiv,
        "entity-info": entityInfoDiv,
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

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe("createEntityInfoText with object formats", () => {
    it("should create entity info with object position and health formats", () => {
      const gameDemo = new GameDemo();
      const entityInfo = {
        id: 1,
        vehicle_type: "scout",
        fraction: "Player",
        position: { x: 100, y: 200 },
        health: { current: 50, max: 100 },
        combat: { damage: 10 },
      };

      const result = gameDemo.createEntityInfoText(entityInfo, false);

      expect(result).toContain("⚔️ ЮНИТ #1");
      expect(result).toContain("Тип: scout");
      expect(result).toContain("Фракция: Player");
      expect(result).toContain("Позиция: (100.0, 200.0)");
      expect(result).toContain("Здоровье: 50/100");
      expect(result).toContain("Урон: 10");
    });

    it("should create base info with object storage format", () => {
      const gameDemo = new GameDemo();
      const entityInfo = {
        id: 1,
        position: { x: 150, y: 250 },
        floors: [{ type: "command" }],
        storage: { current: 300, capacity: 500 },
      };

      const result = gameDemo.createEntityInfoText(entityInfo, true);

      expect(result).toContain("🏢 БАЗА #1");
      expect(result).toContain("Позиция: (150.0, 250.0)");
      expect(result).toContain("Этажей: 1");
      expect(result).toContain("Типы: command");
      expect(result).toContain("Хранение: 300/500");
    });

    it("should handle null position", () => {
      const gameDemo = new GameDemo();
      const entityInfo = {
        id: 1,
        vehicle_type: "transport",
        fraction: "Neutral",
        position: null,
      };

      const result = gameDemo.createEntityInfoText(entityInfo, false);

      expect(result).toContain("⚔️ ЮНИТ #1");
      expect(result).toContain("Тип: transport");
      expect(result).toContain("Позиция: (0.0, 0.0)");
    });
  });

  describe("updateStatus with real DOM", () => {
    it("should update status in state manager and DOM", () => {
      const gameDemo = new GameDemo();
      const statusDiv = document.getElementById("status");

      gameDemo.updateStatus("Test status");

      expect(gameDemo.stateManager.updateDisplayState).toHaveBeenCalledWith({
        statusMessage: "Test status",
      });
      expect(statusDiv.textContent).toBe("Test status");
    });
  });

  describe("updateEntityInfo with real DOM", () => {
    it("should show entity info in DOM", () => {
      const gameDemo = new GameDemo();
      const entityInfoDiv = document.getElementById("entity-info");

      gameDemo.updateEntityInfo("Entity info");

      expect(gameDemo.stateManager.updateDisplayState).toHaveBeenCalledWith({
        entityInfo: "Entity info",
      });
      expect(entityInfoDiv.style.display).toBe("block");
      expect(entityInfoDiv.textContent).toBe("Entity info");
    });

    it("should hide entity info when null", () => {
      const gameDemo = new GameDemo();
      const entityInfoDiv = document.getElementById("entity-info");

      gameDemo.updateEntityInfo(null);

      expect(entityInfoDiv.style.display).toBe("none");
    });
  });

  describe("updateSelectionState", () => {
    it("should update selection state with state manager", () => {
      const gameDemo = new GameDemo();
      const mockSelectionState = { selectedEntityIds: new Set([1, 2, 3]) };
      gameDemo.stateManager.getSelectionState = jest.fn(() => mockSelectionState);

      gameDemo.updateSelectionState([4, 5]);

      expect(gameDemo.stateManager.updateSelectionState).toHaveBeenCalledWith(
        [1, 2, 3],
        [4, 5]
      );
    });
  });

  describe("syncEntitiesWithGameState", () => {
    it("should remove deleted entities", () => {
      const gameDemo = new GameDemo();
      const entity = { container: {} };
      gameDemo.entities.set(1, entity);

      const gameStateEntities = [];

      gameDemo.syncEntitiesWithGameState(gameStateEntities);

      expect(gameDemo.entities.has(1)).toBe(false);
    });
  });
});
