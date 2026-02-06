import { SelectionManager } from './selection-manager.js';
import { GAME_CONFIG } from './game-config.js';

// Мокаем зависимости
jest.mock('./wasm-imports.js');
jest.mock('./game-config.js');
jest.mock('./selection-indicator.js');
jest.mock('./entity-service.js');
jest.mock('./utils.js');

// Мокаем GAME_CONFIG
GAME_CONFIG.LIMITS = { maxGroupSize: 12 };

describe('SelectionManager', () => {
  let selectionManager;
  let mockGameDemo;

  beforeEach(() => {
    // Создаем мок для gameDemo
    mockGameDemo = {
      stateManager: {
        getSelectionState: jest.fn(),
        updateSelectionState: jest.fn(),
        getEntityState: jest.fn(),
      },
      entityRenderer: {
        clearTargetIndicator: jest.fn(),
      },
      updateStatus: jest.fn(),
      updateEntityInfo: jest.fn(),
      updateSpawnButtonState: jest.fn(),
      displayEntityInfo: jest.fn(),
      app: {
        stage: {
          removeChild: jest.fn(),
        },
      },
      entities: new Map(),
    };

    // Создаем экземпляр SelectionManager
    selectionManager = new SelectionManager(mockGameDemo);
    
    // Мокаем методы SelectionManager
    selectionManager.isSelecting = false;
    selectionManager._updateLocalSelectionState = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('selectEntity', () => {
    test('должен выбрать сущность, если она еще не выбрана', () => {
      // Мокаем состояние выбора
      mockGameDemo.stateManager.getSelectionState.mockReturnValue({
        selectedEntityIds: new Set(),
      });
      
      // Мокаем результат handle_entity_selection
      const mockHandleEntitySelection = require('./wasm-imports.js').handle_entity_selection;
      mockHandleEntitySelection.mockReturnValue(JSON.stringify({
        success: true,
        selected_entities: [1],
        message: 'Entity selected',
        action: 'EntitySelected'
      }));

      // Вызываем метод
      const result = selectionManager.selectEntity(1);
      
      // Проверяем результат
      expect(result).toBe(true);
    });

    test('должен вернуть false, если группа уже максимального размера', () => {
      // Мокаем состояние выбора с максимальным количеством выбранных сущностей
      mockGameDemo.stateManager.getSelectionState.mockReturnValue({
        selectedEntityIds: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
      });

      // Вызываем метод
      const result = selectionManager.selectEntity(13);
      
      // Проверяем результат
      expect(result).toBe(false);
    });
  });

  describe('deselectEntity', () => {
    test('должен отменить выбор сущности', () => {
      // Мокаем состояние выбора
      mockGameDemo.stateManager.getSelectionState.mockReturnValue({
        selectedEntityIds: new Set([1]),
      });
      
      // Мокаем сущность
      const mockEntity = { selectionIndicator: {} };
      mockGameDemo.stateManager.getEntityState.mockReturnValue({
        entities: new Map([[1, mockEntity]]),
      });
      
      // Вызываем метод
      selectionManager.deselectEntity(1);
      
      // Проверяем, что метод updateSelectionState был вызван
      expect(mockGameDemo.stateManager.updateSelectionState).toHaveBeenCalledWith([], [1]);
    });
  });

  describe('clearAllSelections', () => {
    test('должен очистить все выделения', () => {
      // Мокаем clear_selection
      const mockClearSelection = require('./wasm-imports.js').clear_selection;
      mockClearSelection.mockReturnValue(JSON.stringify({
        success: true,
      }));
      
      // Мокаем состояние выбора
      mockGameDemo.stateManager.getSelectionState.mockReturnValue({
        selectedEntityIds: new Set([1, 2, 3]),
      });
      
      // Вызываем метод
      selectionManager.clearAllSelections();
      
      // Проверяем, что метод updateSelectionState был вызван
      expect(mockGameDemo.stateManager.updateSelectionState).toHaveBeenCalledWith([], [1, 2, 3]);
    });
  });

  describe('isPlayerBaseSelected', () => {
    test('должен вернуть true, если база игрока выбрана', () => {
      // Мокаем состояние выбора
      mockGameDemo.stateManager.getSelectionState.mockReturnValue({
        selectedEntityIds: new Set([1]),
      });
      
      // Мокаем сущности
      const mockEntity = { entityType: 'base', fraction: 'Player' };
      mockGameDemo.stateManager.getEntityState.mockReturnValue({
        entities: new Map([[1, mockEntity]]),
      });
      
      // Вызываем метод
      const result = selectionManager.isPlayerBaseSelected();
      
      // Проверяем результат
      expect(result).toBe(true);
    });

    test('должен вернуть false, если база игрока не выбрана', () => {
      // Мокаем состояние выбора
      mockGameDemo.stateManager.getSelectionState.mockReturnValue({
        selectedEntityIds: new Set([1]),
      });
      
      // Мокаем сущности
      const mockEntity = { entityType: 'vehicle', fraction: 'Player' };
      mockGameDemo.stateManager.getEntityState.mockReturnValue({
        entities: new Map([[1, mockEntity]]),
      });
      
      // Вызываем метод
      const result = selectionManager.isPlayerBaseSelected();
      
      // Проверяем результат
      expect(result).toBe(false);
    });
  });
});