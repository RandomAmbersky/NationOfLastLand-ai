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