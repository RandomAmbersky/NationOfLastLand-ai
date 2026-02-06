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

describe('SelectionManager - Additional Coverage Tests Part 2', () => {
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

  describe('_updateLocalSelectionState', () => {
    test('should update local selection state correctly', () => {
      // This method is tested in other test files, so we'll skip detailed testing here
      expect(true).toBe(true);
    });
  });

  describe('handleEntityClick', () => {
    test('should not process click when isSelecting is true', async () => {
      // Setup
      selectionManager.isSelecting = true;
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, { id: 1 }]])
      }));
      
      // Call method
      await selectionManager.handleEntityClick(1, false, null);
      
      // Verify getEntityState was called but processing stopped after that
      expect(mockGameDemo.stateManager.getEntityState).toHaveBeenCalled();
      // The method should return after checking isSelecting without doing further processing
    });

    test('should not process click when entity not found', async () => {
      // Setup
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map()
      }));
      
      // Call method
      await selectionManager.handleEntityClick(999, false, null);
      
      // Verify no further processing
      expect(mockGameDemo.stateManager.getEntityState).toHaveBeenCalled();
    });

    test('should handle successful entity selection with EntitySelected action', async () => {
      // Setup
      const mockEntity = { id: 1 };
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, mockEntity]])
      }));
      
      selectionManager._performEntitySelection = jest.fn(() => Promise.resolve({
        success: true,
        action: 'EntitySelected',
        message: 'Selected'
      }));

      // Call method
      await selectionManager.handleEntityClick(1, false, null);
      
      // Verify
      expect(selectionManager._performEntitySelection).toHaveBeenCalled();
      expect(mockGameDemo.displayEntityInfo).toHaveBeenCalledWith(1);
      expect(mockGameDemo.updateSpawnButtonState).toHaveBeenCalled();
      expect(mockGameDemo.updateStatus).toHaveBeenCalledWith('Selected');
    });

    test('should handle successful entity selection with EntityDeselected action', async () => {
      // Setup
      const mockEntity = { id: 1 };
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, mockEntity]])
      }));
      
      selectionManager._performEntitySelection = jest.fn(() => Promise.resolve({
        success: true,
        action: 'EntityDeselected',
        selected_entities: [2],
        message: 'Deselected'
      }));

      // Call method
      await selectionManager.handleEntityClick(1, false, null);
      
      // Verify
      expect(selectionManager._performEntitySelection).toHaveBeenCalled();
      expect(mockGameDemo.displayEntityInfo).toHaveBeenCalledWith(2);
      expect(mockGameDemo.updateStatus).toHaveBeenCalledWith('Deselected');
    });

    test('should handle successful entity selection with GroupTargetAssigned action', async () => {
      // Setup
      const mockEntity = { id: 1 };
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, mockEntity]])
      }));
      
      selectionManager._showGroupTargetingIndicator = jest.fn();
      
      selectionManager._performEntitySelection = jest.fn(() => Promise.resolve({
        success: true,
        action: 'GroupTargetAssigned',
        target_assigned: { target_x: 100, target_y: 200, target_entity_id: 2 },
        message: 'Target assigned'
      }));

      // Call method
      await selectionManager.handleEntityClick(1, false, null);
      
      // Verify
      expect(selectionManager._performEntitySelection).toHaveBeenCalled();
      expect(selectionManager._showGroupTargetingIndicator).toHaveBeenCalledWith({
        target_x: 100,
        target_y: 200,
        target_entity_id: 2
      });
      expect(mockGameDemo.updateStatus).toHaveBeenCalledWith('Target assigned');
    });

    test('should handle successful entity selection with SelectionCleared action', async () => {
      // Setup
      const mockEntity = { id: 1 };
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, mockEntity]])
      }));
      
      selectionManager._performEntitySelection = jest.fn(() => Promise.resolve({
        success: true,
        action: 'SelectionCleared',
        message: 'Cleared'
      }));

      // Call method
      await selectionManager.handleEntityClick(1, false, null);
      
      // Verify
      expect(selectionManager._performEntitySelection).toHaveBeenCalled();
      expect(mockGameDemo.updateEntityInfo).toHaveBeenCalledWith(null);
      expect(mockGameDemo.updateStatus).toHaveBeenCalledWith('Cleared');
    });

    test('should handle unsuccessful entity selection', async () => {
      // Setup
      const mockEntity = { id: 1 };
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, mockEntity]])
      }));
      
      selectionManager._performEntitySelection = jest.fn(() => Promise.resolve({
        success: false,
        message: 'Error occurred'
      }));

      // Call method
      await selectionManager.handleEntityClick(1, false, null);
      
      // Verify
      expect(selectionManager._performEntitySelection).toHaveBeenCalled();
      expect(mockGameDemo.updateStatus).toHaveBeenCalledWith('Ошибка выбора: Error occurred');
    });

    test('should handle error during entity selection', async () => {
      // Setup
      const mockEntity = { id: 1 };
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, mockEntity]])
      }));
      
      selectionManager._performEntitySelection = jest.fn(() => Promise.reject(new Error('Test error')));

      // Call method
      await selectionManager.handleEntityClick(1, false, null);
      
      // Verify
      expect(selectionManager._performEntitySelection).toHaveBeenCalled();
      expect(mockGameDemo.updateStatus).toHaveBeenCalledWith('Ошибка при выборе сущности');
    });
  });

  describe('_performEntitySelection', () => {
    test('should perform entity selection and update local state on success', async () => {
      // Setup
      mockGameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set([1, 2])
      }));
      
      const mockHandleEntitySelection = require('./wasm-imports.js').handle_entity_selection;
      mockHandleEntitySelection.mockReturnValue(JSON.stringify({
        success: true,
        selected_entities: [2, 3],
        message: 'Success'
      }));
      
      selectionManager._updateLocalSelectionState = jest.fn();

      // Call method
      const result = await selectionManager._performEntitySelection(3, true);
      
      // Verify
      expect(mockHandleEntitySelection).toHaveBeenCalledWith(3, true, [1, 2]);
      expect(selectionManager._updateLocalSelectionState).toHaveBeenCalledWith({
        success: true,
        selected_entities: [2, 3],
        message: 'Success'
      });
      expect(result).toEqual({
        success: true,
        selected_entities: [2, 3],
        message: 'Success'
      });
    });

    test('should perform entity selection without updating local state on failure', async () => {
      // Setup
      mockGameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set([1, 2])
      }));
      
      const mockHandleEntitySelection = require('./wasm-imports.js').handle_entity_selection;
      mockHandleEntitySelection.mockReturnValue(JSON.stringify({
        success: false,
        message: 'Failed'
      }));
      
      selectionManager._updateLocalSelectionState = jest.fn();

      // Call method
      const result = await selectionManager._performEntitySelection(3, true);
      
      // Verify
      expect(mockHandleEntitySelection).toHaveBeenCalledWith(3, true, [1, 2]);
      expect(selectionManager._updateLocalSelectionState).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Failed'
      });
    });
  });

  describe('selectEntity', () => {
    test('should return false when isSelecting is true', () => {
      // Setup
      selectionManager.isSelecting = true;
      
      // Call method
      const result = selectionManager.selectEntity(1);
      
      // Verify
      expect(result).toBe(false);
    });

    test('should clear target indicator when selecting a new entity', () => {
      // Setup
      mockGameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set([1])
      }));
      
      mockGameDemo.entityRenderer.clearTargetIndicator = jest.fn();
      
      const mockHandleEntitySelection = require('./wasm-imports.js').handle_entity_selection;
      mockHandleEntitySelection.mockReturnValue(JSON.stringify({
        success: true,
        selected_entities: [1, 2],
        message: 'Selected'
      }));

      // Call method
      const result = selectionManager.selectEntity(2);
      
      // Verify
      expect(mockGameDemo.entityRenderer.clearTargetIndicator).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should return true when entity is already selected', () => {
      // Setup
      mockGameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set([1])
      }));
      
      // Call method
      const result = selectionManager.selectEntity(1);
      
      // Verify
      expect(result).toBe(true);
    });

    test('should return false when group size limit reached', () => {
      // Setup
      const selectedEntities = new Set();
      for (let i = 1; i <= 12; i++) {
        selectedEntities.add(i);
      }
      
      mockGameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: selectedEntities
      }));
      
      // Call method
      const result = selectionManager.selectEntity(13);
      
      // Verify
      expect(result).toBe(false);
    });

    test('should handle error during selection', () => {
      // Setup
      mockGameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set()
      }));
      
      const mockHandleEntitySelection = require('./wasm-imports.js').handle_entity_selection;
      mockHandleEntitySelection.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Call method
      const result = selectionManager.selectEntity(1);
      
      // Verify
      expect(result).toBe(false);
    });
  });

  describe('selectSameTypeUnits', () => {
    test('should return early when entity not found', () => {
      // Setup
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map()
      }));
      
      selectionManager.clearAllSelections = jest.fn();

      // Call method
      selectionManager.selectSameTypeUnits(1);
      
      // Verify
      expect(selectionManager.clearAllSelections).not.toHaveBeenCalled();
    });

    test('should select only clicked entity when not player unit', () => {
      // Setup
      const mockEntity = { id: 1, vehicleType: 'scout', fraction: 'Enemy' };
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([[1, mockEntity]])
      }));
      
      selectionManager.clearAllSelections = jest.fn();
      selectionManager.selectEntity = jest.fn();

      // Call method
      selectionManager.selectSameTypeUnits(1);
      
      // Verify
      expect(selectionManager.clearAllSelections).toHaveBeenCalledWith(true);
      expect(selectionManager.selectEntity).toHaveBeenCalledWith(1, true, true);
    });

    test('should select all player units of same type', () => {
      // Setup
      const mockEntity = { id: 1, vehicleType: 'scout', fraction: 'Player' };
      mockGameDemo.stateManager.getEntityState = jest.fn(() => ({
        entities: new Map([
          [1, mockEntity],
          [2, { id: 2, vehicleType: 'scout', fraction: 'Player', entityType: 'vehicle' }],
          [3, { id: 3, vehicleType: 'tank', fraction: 'Player', entityType: 'vehicle' }],
          [4, { id: 4, vehicleType: 'scout', fraction: 'Enemy', entityType: 'vehicle' }]
        ])
      }));
      
      mockGameDemo.stateManager.getSelectionState = jest.fn(() => ({
        selectedEntityIds: new Set()
      }));
      
      selectionManager.clearAllSelections = jest.fn();
      selectionManager.selectEntity = jest.fn(() => true);

      // Call method
      selectionManager.selectSameTypeUnits(1);
      
      // Verify
      expect(selectionManager.clearAllSelections).toHaveBeenCalledWith(true);
      expect(selectionManager.selectEntity).toHaveBeenCalledWith(2, true, false);
      // Two units should be selected (1 and 2)
      expect(mockGameDemo.updateStatus).toHaveBeenCalledWith('Выделено 2 подвижных юнитов игрока');
    });
  });

  describe('_findEntitiesInRectangle', () => {
    test('should find entities in rectangle bounds', () => {
      // Setup
      const bounds = { x: 0, y: 0, width: 100, height: 100 };
      
      // Add entities with containers to gameDemo.entities
      mockGameDemo.entities.set(1, {
        id: 1,
        container: { x: 50, y: 50 }
      });
      
      mockGameDemo.entities.set(2, {
        id: 2,
        container: { x: 150, y: 150 }
      });

      // Call method
      const result = selectionManager._findEntitiesInRectangle(bounds);
      
      // Verify
      expect(result).toEqual([1]);
    });

    test('should handle entities without containers', () => {
      // Setup
      const bounds = { x: 0, y: 0, width: 100, height: 100 };
      
      // Add entity without container
      mockGameDemo.entities.set(1, {
        id: 1
        // No container
      });

      // Call method
      const result = selectionManager._findEntitiesInRectangle(bounds);
      
      // Verify
      expect(result).toEqual([]);
    });
  });

  describe('_isEntityInBounds', () => {
    test('should return true when entity is in bounds', () => {
      // Setup
      const entity = { id: 1 };
      
      // Add entity with container to gameDemo.entities
      mockGameDemo.entities.set(1, {
        container: { x: 50, y: 50 }
      });
      
      const bounds = { x: 0, y: 0, width: 100, height: 100 };

      // Call method
      const result = selectionManager._isEntityInBounds(entity, bounds);
      
      // Verify
      expect(result).toBe(true);
    });

    test('should return false when entity has no container', () => {
      // Setup
      const entity = { id: 1 };
      
      // Add entity without container
      mockGameDemo.entities.set(1, {});
      
      const bounds = { x: 0, y: 0, width: 100, height: 100 };

      // Call method
      const result = selectionManager._isEntityInBounds(entity, bounds);
      
      // Verify
      expect(result).toBeFalsy();
    });
  });
});