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

describe('GameDemo - Additional Tests', () => {
  let gameDemo;

  beforeEach(() => {
    gameDemo = new GameDemo();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEntityInfoText', () => {
    test('должен создавать текст информации для юнита', () => {
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

    test('должен создавать текст информации для юнита с object format', () => {
      const entityInfo = {
        id: 1,
        vehicle_type: 'tank',
        fraction: 'Enemy',
        position: { x: 300, y: 400 },
        health: { current: 75, max: 100 },
        combat: { damage: 25 }
      };

      const result = gameDemo.createEntityInfoText(entityInfo, false);
      
      expect(result).toContain('⚔️ ЮНИТ #1');
      expect(result).toContain('Тип: tank');
      expect(result).toContain('Фракция: Enemy');
      expect(result).toContain('Позиция: (300.0, 400.0)');
      expect(result).toContain('Здоровье: 75/100');
      expect(result).toContain('Урон: 25');
    });

    test('должен создавать текст информации для базы', () => {
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

    test('должен создавать текст информации для базы с object storage format', () => {
      const entityInfo = {
        id: 1,
        position: { x: 150, y: 250 },
        floors: [
          { type: 'command' }
        ],
        storage: { current: 300, capacity: 500 }
      };

      const result = gameDemo.createEntityInfoText(entityInfo, true);
      
      expect(result).toContain('🏢 БАЗА #1');
      expect(result).toContain('Позиция: (150.0, 250.0)');
      expect(result).toContain('Этажей: 1');
      expect(result).toContain('Типы: command');
      expect(result).toContain('Хранение: 300/500');
    });

    test('должен обрабатывать null/undefined значения', () => {
      const entityInfo = {
        id: 1,
        vehicle_type: 'transport',
        fraction: 'Neutral',
        position: null,
        health: null,
        combat: null
      };

      const result = gameDemo.createEntityInfoText(entityInfo, false);
      
      expect(result).toContain('⚔️ ЮНИТ #1');
      expect(result).toContain('Тип: transport');
      expect(result).toContain('Фракция: Neutral');
      expect(result).toContain('Позиция: (0.0, 0.0)');
    });
  });

  describe('onSelectionUpdated', () => {
    test('должен обновлять индикаторы выделения', () => {
      const mockSelectionIndicatorManager = {
        updateSelectionIndicators: jest.fn()
      };
      
      gameDemo.selectionIndicatorManager = mockSelectionIndicatorManager;
      
      const selectionState = {
        selectedEntityIds: new Set([1, 2, 3])
      };

      gameDemo.onSelectionUpdated(selectionState);
      
      expect(mockSelectionIndicatorManager.updateSelectionIndicators).toHaveBeenCalledWith(selectionState.selectedEntityIds);
    });
  });

  describe('updateSelectionState', () => {
    test('должен обновлять состояние выделения через stateManager', () => {
      const mockSelectedIds = [1, 2, 3];
      const mockRemovedEntities = [4, 5];
      
      gameDemo.stateManager.getSelectionState.mockReturnValue({
        selectedEntityIds: new Set(mockSelectedIds)
      });
      
      gameDemo.stateManager.updateSelectionState.mockClear();
      
      gameDemo.updateSelectionState(mockRemovedEntities);
      
      expect(gameDemo.stateManager.updateSelectionState).toHaveBeenCalledWith(mockSelectedIds, mockRemovedEntities);
    });
  });
});