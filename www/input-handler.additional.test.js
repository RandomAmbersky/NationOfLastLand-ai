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