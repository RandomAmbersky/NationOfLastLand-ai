/* eslint-env jest */
/**
 * Tests for input-handler.js
 */
// Mock PIXI

// Mock document before importing
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
global.document = {
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
};
global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};
global.Event = class Event {
  constructor(type, options = {}) {
    this.type = type;
    this.clientX = options.clientX || 0;
    this.clientY = options.clientY || 0;
    this.button = options.button || 0;
    this.key = options.key || "";
    this.shiftKey = options.shiftKey || false;
    this.ctrlKey = options.ctrlKey || false;
  }
};

global.PIXI = {
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

import { InputHandler } from "./input-handler.js";

describe("InputHandler", () => {
  let gameDemo;
  let inputHandler;

  beforeAll(() => {
    // Setup document keydown listener mock
    jest.spyOn(document, "addEventListener").mockImplementation((event, cb) => {
      if (event === "keydown") {
        global.keydownHandler = cb;
      }
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    gameDemo = {
      isInitialized: true,
      app: {
        view: {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          getBoundingClientRect: () => ({ left: 0, top: 0 }),
        },
        screen: { width: 800, height: 600 },
        stage: {
          children: [],
          addChild(child) {
            this.children.push(child);
          },
          removeChild(child) {
            const idx = this.children.indexOf(child);
            if (idx > -1) this.children.splice(idx, 1);
          },
        },
      },
      selectedEntityIds: new Set(),
      updateStatus: jest.fn(),
    };

    // Add missing properties
    gameDemo.entityRenderer = {
      findEntityAtPosition: jest.fn(() => null),
    };
    gameDemo.selectionManager = {
      clearAllSelections: jest.fn(),
      selectEntity: jest.fn(),
      selectSameTypeUnits: jest.fn(),
      selectAllPlayerUnits: jest.fn(),
      selectAllPlayerUnitsAtBase: jest.fn(),
      isPlayerBaseSelected: jest.fn(() => false),
      handleEntityClick: jest.fn(),
    };

    inputHandler = new InputHandler(gameDemo);
  });

  describe("constructor", () => {
    it("should initialize drag state", () => {
      expect(inputHandler._dragState).toBeDefined();
      expect(inputHandler._dragState.isDragging).toBe(false);
      expect(inputHandler._dragState.startX).toBe(0);
      expect(inputHandler._dragState.startY).toBe(0);
    });
  });

  describe("setupEventListeners", () => {
    it("should add event listeners to canvas", () => {
      inputHandler.setupEventListeners();
      expect(gameDemo.app.view.addEventListener).toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function),
      );
      expect(gameDemo.app.view.addEventListener).toHaveBeenCalledWith(
        "mousemove",
        expect.any(Function),
      );
      expect(gameDemo.app.view.addEventListener).toHaveBeenCalledWith(
        "mouseup",
        expect.any(Function),
      );
      expect(gameDemo.app.view.addEventListener).toHaveBeenCalledWith(
        "mouseleave",
        expect.any(Function),
      );
      expect(gameDemo.app.view.addEventListener).toHaveBeenCalledWith(
        "click",
        expect.any(Function),
      );
      expect(gameDemo.app.view.addEventListener).toHaveBeenCalledWith(
        "dblclick",
        expect.any(Function),
      );
    });

    it("should add keydown event listener to document", () => {
      inputHandler.setupEventListeners();
      expect(document.addEventListener).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
    });
  });

  describe("handleMouseDown", () => {
    it("should not handle when not initialized", () => {
      gameDemo.isInitialized = false;
      const event = { button: 0 };
      inputHandler.handleMouseDown(event);
      expect(inputHandler._dragState.isDragging).toBe(false);
    });

    it("should handle right mouse button differently", () => {
      const event = { button: 2, clientX: 100, clientY: 200 };
      gameDemo.entityRenderer = {
        findEntityAtPosition: jest.fn(() => null),
      };
      gameDemo.selectionManager = {
        clearAllSelections: jest.fn(),
        selectEntity: jest.fn(),
      };

      inputHandler.handleMouseDown(event);

      expect(gameDemo.selectionManager.clearAllSelections).toHaveBeenCalled();
    });

    it("should start drag selection for left mouse button", () => {
      const event = { button: 0, clientX: 100, clientY: 200 };
      inputHandler.handleMouseDown(event);

      expect(inputHandler._dragState.isDragging).toBe(true);
      expect(inputHandler._dragState.startX).toBe(100);
      expect(inputHandler._dragState.startY).toBe(200);
    });
  });

  describe("handleMouseMove", () => {
    it("should not handle when not dragging", () => {
      inputHandler._dragState.isDragging = false;
      const event = { clientX: 150, clientY: 250 };
      inputHandler.handleMouseMove(event);
      expect(inputHandler._dragState.currentX).toBe(0);
    });

    it("should update drag position when dragging", () => {
      inputHandler._dragState.isDragging = true;
      inputHandler._dragState.mouseLeftCanvas = false;
      const event = { clientX: 150, clientY: 250 };
      inputHandler.handleMouseMove(event);

      expect(inputHandler._dragState.currentX).toBe(150);
      expect(inputHandler._dragState.currentY).toBe(250);
    });
  });

  describe("handleMouseUp", () => {
    it("should process drag selection when dragging ended", () => {
      inputHandler._dragState.isDragging = true;
      inputHandler._dragState.hasDragged = true;
      inputHandler._dragState.mouseLeftCanvas = false;
      const processDragSpy = jest.spyOn(inputHandler, "_processDragSelection");

      inputHandler.handleMouseUp({});

      expect(processDragSpy).toHaveBeenCalled();
    });
  });

  describe("handleMouseLeave", () => {
    it("should mark mouse as left canvas when dragging", () => {
      inputHandler._dragState.isDragging = true;
      inputHandler.handleMouseLeave({});

      expect(inputHandler._dragState.mouseLeftCanvas).toBe(true);
      expect(inputHandler._dragState.isDragging).toBe(false);
    });
  });

  describe("handleCanvasClick", () => {
    it("should not handle when not initialized", () => {
      gameDemo.isInitialized = false;
      inputHandler.handleCanvasClick({});
    });

    it("should clear selection when clicked on empty space with no selection", () => {
      inputHandler._dragState.justFinishedDrag = false;
      gameDemo.entityRenderer.findEntityAtPosition.mockReturnValue(null);
      gameDemo.selectedEntityIds = new Set();

      inputHandler.handleCanvasClick({ clientX: 100, clientY: 200 });

      expect(gameDemo.selectionManager.clearAllSelections).toHaveBeenCalled();
    });
  });

  describe("_getCanvasCoords", () => {
    it("should calculate canvas coordinates relative to bounding rect", () => {
      gameDemo.app.view.getBoundingClientRect = () => ({ left: 100, top: 50 });
      const event = { clientX: 200, clientY: 150 };

      const result = inputHandler._getCanvasCoords(event);

      expect(result.screenX).toBe(100);
      expect(result.screenY).toBe(100);
    });
  });

  describe("_toGameCoords", () => {
    it("should convert screen coordinates to game coordinates", () => {
      const result = inputHandler._toGameCoords(400, 300);

      expect(result.gameX).toBe(400);
      expect(result.gameY).toBe(300);
    });
  });

  describe("_startDragSelection", () => {
    it("should initialize drag state", () => {
      const event = { clientX: 100, clientY: 200 };

      inputHandler._startDragSelection(event);

      expect(inputHandler._dragState.isDragging).toBe(true);
      expect(inputHandler._dragState.startX).toBe(100);
      expect(inputHandler._dragState.startY).toBe(200);
    });
  });
});
import { InputHandler } from './input-handler.js';
import { GAME_CONFIG } from './game-config.js';

// Mock PIXI
global.PIXI = {
  Graphics: class {
    constructor() {
      this.children = [];
      this.alpha = 1;
      this.x = 0;
      this.y = 0;
    }
    lineStyle() { return this; }
    beginFill() { return this; }
    endFill() { return this; }
    drawCircle() { return this; }
    drawRect() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    clear() { return this; }
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
jest.mock('./game-config.js', () => ({
  GAME_CONFIG: {
    WORLD_SIZE: { width: 800, height: 600 },
    ENTITY_SIZES: {
      scout: 8,
      tank: { width: 20, height: 16 },
      transport: { width: 24, height: 20 },
      base: { width: 30, height: 30 },
      alert: { hidden: 8, revealed: 12 }
    },
    COLORS: {
      player: { scout: 0x4CAF50, tank: 0xFF5722, transport: 0x2196F3 },
      enemy: { scout: 0x2E7D32, tank: 0xB71C1C, transport: 0x0D47A1 },
      wild: { scout: 0x8D6E63, tank: 0x8D6E63, transport: 0x8D6E63 },
      neutral: { scout: 0x00BCD4, tank: 0x00BCD4, transport: 0x00BCD4 },
      base: 0x2196F3,
      alert: 0xB8860B,
      selection: { player: 0x0080FF, enemy: 0xFF0000 }
    },
    DISTANCES: {
      clickTolerance: 20,
      alertClickRadius: 15,
      baseUnitRadius: 50,
      combatRange: 20,
      alertRevealRange: 25
    },
    LIMITS: { maxGroupSize: 12, dragThreshold: 5 },
    UI: {
      fontSize: { label: 10, damage: 14 },
      indicatorSize: 12,
      targetIndicatorSize: 10,
      explosionScale: 3.0,
      healthBarLength: 10
    },
    VISIBILITY: { range: 200, sameTypeUnitRadius: 200 },
    TIMEOUTS: { targetIndicator: 2000, alertHighlight: 3000 }
  }
}));

describe('InputHandler - Additional Coverage Tests', () => {
  let gameDemo;
  let inputHandler;

  beforeEach(() => {
    gameDemo = {
      isInitialized: true,
      app: {
        view: {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          getBoundingClientRect: () => ({ left: 0, top: 0 }),
        },
        screen: { width: 800, height: 600 },
        stage: {
          children: [],
          addChild(child) {
            this.children.push(child);
          },
          removeChild(child) {
            const idx = this.children.indexOf(child);
            if (idx > -1) this.children.splice(idx, 1);
          },
        },
      },
      selectedEntityIds: new Set(),
      updateStatus: jest.fn(),
    };

    // Add missing properties
    gameDemo.entityRenderer = {
      findEntityAtPosition: jest.fn(() => null),
      findAlertAtPosition: jest.fn(() => null),
    };
    gameDemo.selectionManager = {
      clearAllSelections: jest.fn(),
      selectEntity: jest.fn(),
      selectSameTypeUnits: jest.fn(),
      selectAllPlayerUnits: jest.fn(),
      selectAllPlayerUnitsAtBase: jest.fn(),
      isPlayerBaseSelected: jest.fn(() => false),
      handleEntityClick: jest.fn(),
    };
    gameDemo.setGroupTarget = jest.fn();
    gameDemo.entities = new Map();

    inputHandler = new InputHandler(gameDemo);
  });

  describe('handleDoubleClick', () => {
    it('should handle double click on entity', async () => {
      const event = { clientX: 100, clientY: 200 };
      gameDemo.entityRenderer.findEntityAtPosition.mockReturnValue(1);
      
      await inputHandler.handleDoubleClick(event);
      
      expect(gameDemo.selectionManager.selectSameTypeUnits).toHaveBeenCalledWith(1);
    });

    it('should handle double click on empty space', async () => {
      const event = { clientX: 100, clientY: 200 };
      gameDemo.entityRenderer.findEntityAtPosition.mockReturnValue(null);
      
      await inputHandler.handleDoubleClick(event);
      
      expect(gameDemo.selectionManager.selectAllPlayerUnits).toHaveBeenCalled();
    });

    it('should not handle when not initialized', async () => {
      gameDemo.isInitialized = false;
      const event = { clientX: 100, clientY: 200 };
      
      await inputHandler.handleDoubleClick(event);
      
      expect(gameDemo.selectionManager.selectSameTypeUnits).not.toHaveBeenCalled();
    });
  });

  describe('handleKeyDown', () => {
    it('should handle Ctrl+A', () => {
      const event = { ctrlKey: true, key: 'a', preventDefault: jest.fn() };
      
      inputHandler.handleKeyDown(event);
      
      expect(gameDemo.selectionManager.selectAllPlayerUnitsAtBase).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle Escape key', () => {
      const event = { key: 'Escape' };
      
      inputHandler.handleKeyDown(event);
      
      expect(gameDemo.selectionManager.clearAllSelections).toHaveBeenCalled();
      expect(gameDemo.updateStatus).toHaveBeenCalledWith('Selection cleared (Escape key)');
    });

    it('should handle Space key with selected entities', () => {
      gameDemo.selectedEntityIds = new Set([1]);
      gameDemo.entities.set(1, { gameX: 100, gameY: 200 });
      const event = { key: ' ', preventDefault: jest.fn() };
      
      inputHandler.handleKeyDown(event);
      
      expect(gameDemo.setGroupTarget).toHaveBeenCalledWith(100, 200);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle Delete key with selected entities', () => {
      gameDemo.selectedEntityIds = new Set([1]);
      gameDemo.entities.set(1, { gameX: 100, gameY: 200 });
      const event = { key: 'Delete' };
      
      inputHandler.handleKeyDown(event);
      
      expect(gameDemo.setGroupTarget).toHaveBeenCalledWith(100, 200);
    });

    it('should not handle keys when not initialized', () => {
      gameDemo.isInitialized = false;
      const event = { key: 'Escape' };
      
      inputHandler.handleKeyDown(event);
      
      expect(gameDemo.selectionManager.clearAllSelections).not.toHaveBeenCalled();
    });
  });

  describe('_cancelDragSelection', () => {
    it('should cancel drag selection', () => {
      inputHandler._dragState.isDragging = true;
      inputHandler._dragState.mouseLeftCanvas = true;
      inputHandler._dragState.graphics = {
        children: [],
        removeChild: jest.fn()
      };
      gameDemo.app.stage.removeChild = jest.fn();
      
      inputHandler._cancelDragSelection();
      
      expect(inputHandler._dragState.isDragging).toBe(false);
      expect(inputHandler._dragState.mouseLeftCanvas).toBe(false);
    });
  });

  describe('_processDragSelection', () => {
    it('should process valid drag selection', () => {
      inputHandler._dragState.startX = 0;
      inputHandler._dragState.startY = 0;
      inputHandler._dragState.currentX = 100;
      inputHandler._dragState.currentY = 100;
      
      // Mock selectionManager method
      gameDemo.selectionManager.selectEntitiesInRectangle = jest.fn();
      
      inputHandler._processDragSelection();
      
      expect(gameDemo.selectionManager.selectEntitiesInRectangle).toHaveBeenCalled();
    });

    it('should not process invalid drag selection', () => {
      inputHandler._dragState.startX = 0;
      inputHandler._dragState.startY = 0;
      inputHandler._dragState.currentX = 1;
      inputHandler._dragState.currentY = 1; // Too small
      
      // Mock selectionManager method
      gameDemo.selectionManager.selectEntitiesInRectangle = jest.fn();
      
      inputHandler._processDragSelection();
      
      expect(gameDemo.selectionManager.selectEntitiesInRectangle).not.toHaveBeenCalled();
    });
  });

  describe('_calculateSelectionBounds', () => {
    it('should calculate selection bounds', () => {
      inputHandler._dragState.startX = 50;
      inputHandler._dragState.startY = 50;
      inputHandler._dragState.currentX = 150;
      inputHandler._dragState.currentY = 200;
      
      const bounds = inputHandler._calculateSelectionBounds();
      
      expect(bounds).toEqual({
        x: 50,
        y: 50,
        width: 100,
        height: 150
      });
    });
  });

  describe('_isValidSelectionBounds', () => {
    it('should validate selection bounds', () => {
      const validBounds = { width: 10, height: 10 };
      const invalidBounds = { width: 1, height: 1 };
      
      expect(inputHandler._isValidSelectionBounds(validBounds)).toBe(true);
      expect(inputHandler._isValidSelectionBounds(invalidBounds)).toBe(false);
    });
  });
});