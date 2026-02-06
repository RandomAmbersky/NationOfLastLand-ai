import { GameDemo } from './game-demo.js';

// Мокаем зависимости
jest.mock('./core-state-manager.js');
jest.mock('./game-state-manager.js');
jest.mock('./selection-manager.js');
jest.mock('./entity-renderer.js');
jest.mock('./input-handler.js');
jest.mock('./coordinate-service.js');
jest.mock('./entity-service.js');
jest.mock('./selection-indicator.js');
jest.mock('./wasm-imports.js');

// Мокаем PIXI
global.PIXI = {
  Application: jest.fn().mockImplementation(() => ({
    view: document.createElement('canvas'),
    renderer: {
      resize: jest.fn()
    },
    stage: {
      removeChild: jest.fn()
    }
  })),
  Graphics: jest.fn().mockImplementation(() => ({
    lineStyle: jest.fn().mockReturnThis(),
    drawCircle: jest.fn().mockReturnThis(),
    clear: jest.fn().mockReturnThis()
  }))
};

// Мокаем document
document.querySelector = jest.fn().mockReturnValue({
  getBoundingClientRect: () => ({ width: 800, height: 600 })
});

document.getElementById = jest.fn().mockImplementation((id) => {
  if (id === 'game-canvas') {
    const canvas = document.createElement('canvas');
    canvas.parentNode = {
      replaceChild: jest.fn()
    };
    return canvas;
  }
  return document.createElement('button');
});

// Мокаем parentNode для canvas элемента
Object.defineProperty(HTMLCanvasElement.prototype, 'parentNode', {
  writable: true,
  value: {
    replaceChild: jest.fn()
  }
});

describe('GameDemo - Additional Coverage Tests', () => {
  let gameDemo;

  beforeEach(() => {
    gameDemo = new GameDemo();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleResize', () => {
    test('should handle resize when app exists', () => {
      // Setup
      gameDemo.app = {
        renderer: {
          resize: jest.fn()
        }
      };
      gameDemo.coordinateService = {
        invalidateScaleCache: jest.fn()
      };

      // Call method
      gameDemo.handleResize();

      // Verify
      expect(gameDemo.app.renderer.resize).toHaveBeenCalled();
      expect(gameDemo.coordinateService.invalidateScaleCache).toHaveBeenCalled();
    });

    test('should not crash when app is null', () => {
      // Setup
      gameDemo.app = null;

      // Should not throw
      expect(() => gameDemo.handleResize()).not.toThrow();
    });
  });

  describe('getScale', () => {
    test('should call coordinateService getScale', () => {
      // Setup
      gameDemo.coordinateService = {
        getScale: jest.fn().mockReturnValue({ x: 1, y: 1 })
      };

      // Call method
      const result = gameDemo.getScale();

      // Verify
      expect(gameDemo.coordinateService.getScale).toHaveBeenCalled();
      expect(result).toEqual({ x: 1, y: 1 });
    });
  });

  describe('invalidateScaleCache', () => {
    test('should call coordinateService invalidateScaleCache', () => {
      // Setup
      gameDemo.coordinateService = {
        invalidateScaleCache: jest.fn()
      };

      // Call method
      gameDemo.invalidateScaleCache();

      // Verify
      expect(gameDemo.coordinateService.invalidateScaleCache).toHaveBeenCalled();
    });
  });

  describe('screenToGame', () => {
    test('should call coordinateService screenToGame', () => {
      // Setup
      gameDemo.coordinateService = {
        screenToGame: jest.fn().mockReturnValue({ gameX: 100, gameY: 200 })
      };

      // Call method
      const result = gameDemo.screenToGame(50, 75);

      // Verify
      expect(gameDemo.coordinateService.screenToGame).toHaveBeenCalledWith(50, 75);
      expect(result).toEqual({ gameX: 100, gameY: 200 });
    });
  });

  describe('gameToScreen', () => {
    test('should call coordinateService gameToScreen', () => {
      // Setup
      gameDemo.coordinateService = {
        gameToScreen: jest.fn().mockReturnValue({ screenX: 50, screenY: 75 })
      };

      // Call method
      const result = gameDemo.gameToScreen(100, 200);

      // Verify
      expect(gameDemo.coordinateService.gameToScreen).toHaveBeenCalledWith(100, 200);
      expect(result).toEqual({ screenX: 50, screenY: 75 });
    });
  });

  describe('findPlayerBase', () => {
    test('should call entityService findPlayerBase', () => {
      // Setup
      const mockBase = { id: 1, entityType: 'base' };
      gameDemo.entityService = {
        findPlayerBase: jest.fn().mockReturnValue(mockBase)
      };

      // Call method
      const result = gameDemo.findPlayerBase();

      // Verify
      expect(gameDemo.entityService.findPlayerBase).toHaveBeenCalled();
      expect(result).toBe(mockBase);
    });
  });

  describe('isPlayerBaseSelected', () => {
    test('should call selectionManager isPlayerBaseSelected', () => {
      // Setup
      gameDemo.selectionManager = {
        isPlayerBaseSelected: jest.fn().mockReturnValue(true)
      };

      // Call method
      const result = gameDemo.isPlayerBaseSelected();

      // Verify
      expect(gameDemo.selectionManager.isPlayerBaseSelected).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('clearAllSelections', () => {
    test('should call selectionManager clearAllSelections', () => {
      // Setup
      gameDemo.selectionManager = {
        clearAllSelections: jest.fn()
      };

      // Call method
      gameDemo.clearAllSelections();

      // Verify
      expect(gameDemo.selectionManager.clearAllSelections).toHaveBeenCalled();
    });
  });

  describe('setGroupTarget', () => {
    test('should call gameStateManager setGroupTarget', () => {
      // Setup
      gameDemo.gameStateManager = {
        setGroupTarget: jest.fn()
      };

      // Call method
      gameDemo.setGroupTarget(100, 200);

      // Verify
      expect(gameDemo.gameStateManager.setGroupTarget).toHaveBeenCalledWith(100, 200);
    });
  });

  describe('displayEntityInfo', () => {
    test('should call selectionManager displayEntityInfo', () => {
      // Setup
      gameDemo.selectionManager = {
        displayEntityInfo: jest.fn()
      };

      // Call method
      gameDemo.displayEntityInfo(1);

      // Verify
      expect(gameDemo.selectionManager.displayEntityInfo).toHaveBeenCalledWith(1);
    });
  });

  describe('updateSelectionState', () => {
    test('should call stateManager updateSelectionState', () => {
      // Setup
      gameDemo.stateManager = {
        getSelectionState: jest.fn().mockReturnValue({
          selectedEntityIds: new Set([1, 2, 3])
        }),
        updateSelectionState: jest.fn()
      };

      // Call method
      gameDemo.updateSelectionState([4, 5]);

      // Verify
      expect(gameDemo.stateManager.updateSelectionState).toHaveBeenCalledWith([1, 2, 3], [4, 5]);
    });
  });

  describe('createEntityInfoText', () => {
    test('should create text for unit with array position and health', () => {
      const entityInfo = {
        id: 1,
        vehicle_type: 'scout',
        fraction: 'Player',
        position: [100, 200],
        health: [50, 100],
        combat: [10]
      };

      const result = gameDemo.createEntityInfoText(entityInfo, false);
      
      expect(result).toContain('⚔️ ЮНИТ #1');
      expect(result).toContain('Тип: scout');
      expect(result).toContain('Фракция: Player');
      expect(result).toContain('Позиция: (100.0, 200.0)');
      expect(result).toContain('Здоровье: 50/100');
      expect(result).toContain('Урон: 10');
    });

    test('should create text for base with array position', () => {
      const entityInfo = {
        id: 1,
        position: [100, 200],
        floors: [
          { type: 'storage' },
          { type: 'defense' }
        ],
        storage: [500, 1000]
      };

      const result = gameDemo.createEntityInfoText(entityInfo, true);
      
      expect(result).toContain('🏢 БАЗА #1');
      expect(result).toContain('Позиция: (100.0, 200.0)');
      expect(result).toContain('Этажей: 2');
      expect(result).toContain('Типы: storage, defense');
      expect(result).toContain('Хранение: 500/1000');
    });

    test('should handle object position format', () => {
      const entityInfo = {
        id: 1,
        position: { x: 100, y: 200 }
      };

      const result = gameDemo.createEntityInfoText(entityInfo, true);
      
      expect(result).toContain('Позиция: (100.0, 200.0)');
    });

    test('should handle object health format', () => {
      const entityInfo = {
        id: 1,
        health: { current: 50, max: 100 }
      };

      const result = gameDemo.createEntityInfoText(entityInfo, false);
      
      expect(result).toContain('Здоровье: 50/100');
    });

    test('should handle object combat format', () => {
      const entityInfo = {
        id: 1,
        combat: { damage: 15 }
      };

      const result = gameDemo.createEntityInfoText(entityInfo, false);
      
      expect(result).toContain('Урон: 15');
    });

    test('should handle missing fields gracefully', () => {
      const entityInfo = {
        id: 1
      };

      const result = gameDemo.createEntityInfoText(entityInfo, false);
      
      expect(result).toContain('⚔️ ЮНИТ #1');
      expect(result).toContain('Тип: Неизвестно');
      expect(result).toContain('Фракция: Нейтрал');
    });
  });
});