/* eslint-env jest */
/**
 * Tests for entity-renderer.js
 */

// Mock setTimeout globally before importing
global.setTimeout = jest.fn((cb) => 1);
global.clearTimeout = jest.fn();

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

// Mock CoordinateService before importing
jest.mock("./coordinate-service.js", () => ({
  CoordinateService: jest.fn().mockImplementation(() => ({
    gameToScreen: jest.fn((x, y) => ({ x: x * 2, y: y * 2 })),
    getScreenCoords: jest.fn((x, y) => ({ x: x * 2, y: y * 2 })),
  })),
}));

import { EntityRenderer } from "./entity-renderer.js";

describe("EntityRenderer", () => {
  let gameDemo;
  let entityRenderer;

  beforeEach(() => {
    jest.clearAllMocks();

    gameDemo = {
      app: {
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
      },
      entities: new Map(),
    };

    entityRenderer = new EntityRenderer(gameDemo);
  });

  describe("updateEntityPosition", () => {
    it("should update entity position when entity exists", () => {
      const container = {
        x: 0,
        y: 0,
        addChild: jest.fn(),
        removeChild: jest.fn(),
      };
      const entity = { container, x: 0, y: 0, gameX: 0, gameY: 0 };
      gameDemo.entities.set(1, entity);

      entityRenderer.updateEntityPosition(1, 100, 200);

      expect(entity.gameX).toBe(100);
      expect(entity.gameY).toBe(200);
    });

    it("should not update when entity does not exist", () => {
      const container = {
        x: 0,
        y: 0,
        addChild: jest.fn(),
        removeChild: jest.fn(),
      };
      const entity = { container, x: 0, y: 0, gameX: 0, gameY: 0 };
      gameDemo.entities.set(1, entity);

      entityRenderer.updateEntityPosition(999, 100, 200);

      expect(entity.gameX).toBe(0);
    });
  });

  describe("findEntityAtPosition", () => {
    it("should find closest entity within tolerance", () => {
      const container = {
        x: 400,
        y: 300,
        addChild: jest.fn(),
        removeChild: jest.fn(),
      };
      gameDemo.entities.set(1, { container, gameX: 400, gameY: 300 });

      const foundId = entityRenderer.findEntityAtPosition(400, 300);

      expect(foundId).toBe(1);
    });

    it("should return null when entity is outside tolerance", () => {
      const container = {
        x: 400,
        y: 300,
        addChild: jest.fn(),
        removeChild: jest.fn(),
      };
      gameDemo.entities.set(1, { container, gameX: 400, gameY: 300 });

      const foundId = entityRenderer.findEntityAtPosition(0, 0);

      expect(foundId).toBeNull();
    });
  });

  describe("showTargetIndicator", () => {
    it("should create target indicator at screen position", () => {
      entityRenderer.showTargetIndicator(100, 200);

      expect(entityRenderer.targetIndicator).toBeDefined();
    });

    it("should clear existing timeout before creating new one", () => {
      entityRenderer.showTargetIndicator(100, 200);
      entityRenderer.showTargetIndicator(150, 250);

      expect(global.setTimeout).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearTargetIndicator", () => {
    it("should clear timeout and remove indicator", () => {
      const indicator = {
        children: [],
        addChild: jest.fn(),
        removeChild: jest.fn(),
      };
      entityRenderer.targetIndicator = indicator;
      gameDemo.app.stage.addChild(indicator);

      entityRenderer.clearTargetIndicator();

      expect(entityRenderer.targetIndicator).toBeNull();
      expect(gameDemo.app.stage.children.includes(indicator)).toBe(false);
    });
  });

  describe("setupGrid", () => {
    it("should setup grid", () => {
      entityRenderer.setupGrid();
      expect(entityRenderer.gridContainer).toBeDefined();
    });
  });

  describe("updateGrid", () => {
    it("should update grid", () => {
      // First setup grid
      entityRenderer.setupGrid();
      expect(entityRenderer.gridContainer).toBeDefined();

      // Then update it
      entityRenderer.updateGrid();
      expect(entityRenderer.gridContainer).toBeDefined();
    });
  });

  describe("cleanupOrphanedGraphics", () => {
    it("should cleanup orphaned graphics", () => {
      const mockGraphics = {
        children: [],
        addChild: jest.fn(),
        removeChild: jest.fn(),
      };

      gameDemo.app.stage.children.push(mockGraphics);
      entityRenderer.gridContainer = {};

      entityRenderer.cleanupOrphanedGraphics();

      // Should remove orphaned graphics
      expect(gameDemo.app.stage.children.length).toBe(1); // Grid container remains
    });
  });

  describe("createEntitySprite", () => {
    it("should create entity sprite for player scout", () => {
      entityRenderer.createEntitySprite(
        1,
        100,
        200,
        "scout",
        "Player",
        "vehicle",
      );

      const entity = gameDemo.entities.get(1);
      expect(entity).toBeDefined();
      expect(entity.vehicleType).toBe("scout");
      expect(entity.faction).toBe("Player");
    });

    it("should create entity sprite for enemy tank", () => {
      entityRenderer.createEntitySprite(
        2,
        150,
        250,
        "tank",
        "Enemy",
        "vehicle",
      );

      const entity = gameDemo.entities.get(2);
      expect(entity).toBeDefined();
      expect(entity.vehicleType).toBe("tank");
      expect(entity.faction).toBe("Enemy");
    });

    it("should create entity sprite for base", () => {
      entityRenderer.createEntitySprite(3, 200, 300, "base", "Player", "base");

      const entity = gameDemo.entities.get(3);
      expect(entity).toBeDefined();
      expect(entity.entityType).toBe("base");
    });

    it("should create entity sprite for alert", () => {
      entityRenderer.createEntitySprite(
        4,
        250,
        350,
        "alert_Revealed",
        null,
        "alert",
      );

      const entity = gameDemo.entities.get(4);
      expect(entity).toBeDefined();
      expect(entity.vehicleType).toBe("alert_Revealed");
      expect(entity.entityType).toBe("alert");
    });
  });

  describe("findAlertAtPosition", () => {
    it("should find alert at position", () => {
      // Create an alert entity
      entityRenderer.createEntitySprite(
        1,
        100,
        200,
        "alert_Revealed",
        null,
        "alert",
      );

      const alert = entityRenderer.findAlertAtPosition(100, 200);
      expect(alert).toBeDefined();
      expect(alert.id).toBe(1);
    });

    it("should return null when no alert found", () => {
      const alert = entityRenderer.findAlertAtPosition(500, 500);
      expect(alert).toBeNull();
    });
  });

  describe("highlightTargetAlert", () => {
    it("should highlight target alert", () => {
      const alert = { x: 100, y: 200, id: 1 };
      entityRenderer.highlightTargetAlert(alert);

      expect(entityRenderer.alertHighlight).toBeDefined();
      expect(entityRenderer.alertHighlight.alertId).toBe(1);
    });
  });

  describe("createDamageEffect", () => {
    it("should create damage effect", () => {
      // Create entities first
      entityRenderer.createEntitySprite(
        1,
        100,
        200,
        "scout",
        "Player",
        "vehicle",
      );
      entityRenderer.createEntitySprite(
        2,
        150,
        250,
        "scout",
        "Enemy",
        "vehicle",
      );

      entityRenderer.createDamageEffect(1, 2, 10);

      // Check that graphics were added to stage
      expect(gameDemo.app.stage.children.length).toBeGreaterThan(2);
    });

    it("should not create damage effect when entities dont exist", () => {
      entityRenderer.createDamageEffect(999, 888, 10);
      // Should not throw error
    });
  });

  describe("createDestructionEffect", () => {
    it("should create destruction effect", () => {
      // Create entity first
      entityRenderer.createEntitySprite(
        1,
        100,
        200,
        "scout",
        "Player",
        "vehicle",
      );

      entityRenderer.createDestructionEffect(1);

      // Check that graphics were added to stage
      expect(gameDemo.app.stage.children.length).toBeGreaterThan(1);
    });

    it("should not create destruction effect when entity doesnt exist", () => {
      entityRenderer.createDestructionEffect(999);
      // Should not throw error
    });
  });
});
