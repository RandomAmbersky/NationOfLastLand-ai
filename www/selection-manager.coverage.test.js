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
GAME_CONFIG.TIMEOUTS = { targetIndicator: 2000 };

describe('SelectionManager - Additional Coverage Tests', () => {
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
        showTargetIndicator: jest.fn(),
        alertHighlight: null,
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
    selectionManager.selectionIndicatorManager = {
      updateSelectionIndicators: jest.fn(),
      removeSelectionIndicator: jest.fn(),
      createSelectionIndicator: jest.fn()
    };
    
    // Мокаем SelectionIndicatorManager в gameDemo
    mockGameDemo.selectionIndicatorManager = selectionManager.selectionIndicatorManager;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('_showGroupTargetingIndicator', () => {
    test('should show group targeting indicator', () => {
      // Мокаем entityRenderer
      mockGameDemo.entityRenderer.alertHighlight = null;
      mockGameDemo.entityRenderer.showTargetIndicator = jest.fn();
      
      // Мокаем stateManager
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([
          [1, { id: 1, vehicleType: 'scout', fraction: 'Player' }]
        ])
      }));
      
      const targetAssignment = {
        target_x: 100,
        target_y: 200,
        target_entity_id: 1
      };

      selectionManager._showGroupTargetingIndicator(targetAssignment);
      
      expect(mockGameDemo.entityRenderer.showTargetIndicator).toHaveBeenCalledWith(100, 200);
      expect(mockGameDemo.updateStatus).toHaveBeenCalled();
    });
  });

  describe('_isEntityInBounds', () => {
    test('should check if entity is in bounds', () => {
      const entity = {
        id: 1
      };
      
      // Add entity with container to gameDemo.entities
      mockGameDemo.entities.set(1, {
        container: {
          x: 50,
          y: 50
        }
      });
      
      const bounds = {
        x: 0,
        y: 0,
        width: 100,
        height: 100
      };

      const result = selectionManager._isEntityInBounds(entity, bounds);
      expect(result).toBe(true);
    });

    test('should return false when entity has no container', () => {
      const entity = {
        id: 1
      };
      
      // Add entity without container to gameDemo.entities
      mockGameDemo.entities.set(1, {});
      
      const bounds = {
        x: 0,
        y: 0,
        width: 100,
        height: 100
      };

      const result = selectionManager._isEntityInBounds(entity, bounds);
      expect(result).toBeFalsy();
    });
  });

  describe('_clearAlertSelections', () => {
    test('should clear alert selections', () => {
      // Мокаем состояние выбора
      mockGameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set([1, 2])
      }));
      
      // Мокаем состояние сущностей
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([
          [1, { id: 1, entityType: 'alert' }],
          [2, { id: 2, entityType: 'vehicle' }]
        ])
      }));
      
      // Мокаем метод deselectEntity
      selectionManager.deselectEntity = jest.fn();

      selectionManager._clearAlertSelections();
      
      expect(selectionManager.deselectEntity).toHaveBeenCalledWith(1, true);
    });
  });

  describe('selectAllPlayerUnitsAtBase', () => {
    test('should select all player units at base', () => {
      // Мокаем метод clearAllSelections
      selectionManager.clearAllSelections = jest.fn();
      
      // Мокаем entityService
      selectionManager.entityService = {
        findPlayerBase: jest.fn(() => ({ id: 1, gameX: 100, gameY: 200 }))
      };
      
      // Мокаем stateManager
      mockGameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set()
      }));
      
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([
          [1, { id: 1, entityType: 'base', fraction: 'Player' }],
          [2, { id: 2, entityType: 'vehicle', fraction: 'Player', gameX: 105, gameY: 205 }],
          [3, { id: 3, entityType: 'vehicle', fraction: 'Enemy', gameX: 105, gameY: 205 }]
        ])
      }));
      
      // Мокаем метод selectEntity
      selectionManager.selectEntity = jest.fn(() => true);

      selectionManager.selectAllPlayerUnitsAtBase();
      
      expect(selectionManager.clearAllSelections).toHaveBeenCalledWith(true);
      expect(selectionManager.selectEntity).toHaveBeenCalled();
    });

    test('should show error when no player base found', () => {
      // Мокаем entityService
      selectionManager.entityService = {
        findPlayerBase: jest.fn(() => null)
      };

      selectionManager.selectAllPlayerUnitsAtBase();
      
      expect(mockGameDemo.updateStatus).toHaveBeenCalledWith('База игрока не найдена');
    });
  });

  describe('displayEntityInfo', () => {
    test('should display entity info', async () => {
      // Мокаем get_entity_info
      const mockGetEntityInfo = require('./wasm-imports.js').get_entity_info;
      mockGetEntityInfo.mockReturnValue(JSON.stringify({
        id: 1,
        vehicle_type: 'scout',
        fraction: 'Player',
        position: [100, 200]
      }));
      
      // Мокаем stateManager
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([
          [1, { id: 1, entityType: 'vehicle', vehicleType: 'scout', fraction: 'Player' }]
        ])
      }));
      
      // Мокаем gameDemo.entities
      mockGameDemo.entities.set(1, {
        id: 1,
        container: {
          addChild: jest.fn()
        }
      });
      
      // Мокаем createEntityInfoText
      mockGameDemo.createEntityInfoText = jest.fn(() => 'Entity Info');

      await selectionManager.displayEntityInfo(1);
      
      expect(mockGetEntityInfo).toHaveBeenCalledWith(1);
      expect(mockGameDemo.updateEntityInfo).toHaveBeenCalledWith('Entity Info');
    });

    test('should handle entity not found', async () => {
      // Мокаем stateManager
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map()
      }));

      await selectionManager.displayEntityInfo(999);
      
      expect(mockGameDemo.updateEntityInfo).toHaveBeenCalledWith('Entity no longer exists');
    });

    test('should handle error when getting entity info', async () => {
      // Мокаем get_entity_info to throw error
      const mockGetEntityInfo = require('./wasm-imports.js').get_entity_info;
      mockGetEntityInfo.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      // Мокаем stateManager
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([
          [1, { id: 1 }]
        ])
      }));

      await selectionManager.displayEntityInfo(1);
      
      expect(mockGameDemo.updateEntityInfo).toHaveBeenCalledWith(expect.stringContaining('Error loading entity info'));
    });
  });
});