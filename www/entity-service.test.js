const { EntityService } = require('./entity-service.js')

describe('EntityService', () => {
  let gameDemo
  let entityService

  beforeEach(() => {
    gameDemo = {
      stateManager: {
        getEntityState: jest.fn(),
        getSelectionState: jest.fn()
      }
    }
    entityService = new EntityService(gameDemo)
  })

  describe('createEntity', () => {
    it('should create entity with default values', () => {
      const entityData = { id: 1 }
      const entity = entityService.createEntity(entityData)
      expect(entity).toEqual({
        id: 1,
        entityType: 'vehicle',
        vehicleType: 'scout',
        fraction: null,
        gameX: 0,
        gameY: 0
      })
    })

    it('should handle entity_type field', () => {
      const entityData = { id: 1, entity_type: 'base' }
      const entity = entityService.createEntity(entityData)
      expect(entity.entityType).toBe('base')
    })

    it('should determine vehicleType from subtype for scout', () => {
      const entityData = { id: 1, subtype: 'Scout Car' }
      const entity = entityService.createEntity(entityData)
      expect(entity.vehicleType).toBe('scout')
    })

    it('should determine vehicleType from subtype for heavy tank', () => {
      const entityData = { id: 1, subtype: 'Heavy Tank' }
      const entity = entityService.createEntity(entityData)
      expect(entity.vehicleType).toBe('tank')
    })

    it('should determine vehicleType from subtype for armored truck', () => {
      const entityData = { id: 1, subtype: 'Armored Truck' }
      const entity = entityService.createEntity(entityData)
      expect(entity.vehicleType).toBe('transport')
    })

    it('should handle alert subtypes with underscore', () => {
      const entityData = { id: 1, subtype: 'alert_Raider' }
      const entity = entityService.createEntity(entityData)
      expect(entity.vehicleType).toBe('alert_Raider')
    })

    it('should handle raiders', () => {
      const entityData = { id: 1, subtype: 'raider' }
      const entity = entityService.createEntity(entityData)
      expect(entity.vehicleType).toBe('raider')
    })

    it('should handle positions as arrays (Rust format)', () => {
      const entityData = { id: 1, position: [100, 200] }
      const entity = entityService.createEntity(entityData)
      expect(entity.gameX).toBe(100)
      expect(entity.gameY).toBe(200)
    })

    it('should handle positions as objects', () => {
      const entityData = { id: 1, position: { x: 150, y: 250 } }
      const entity = entityService.createEntity(entityData)
      expect(entity.gameX).toBe(150)
      expect(entity.gameY).toBe(250)
    })

    it('should spread remaining entityData properties', () => {
      const entityData = { id: 1, subtype: 'Scout Car', extraProperty: 'value', anotherProp: 42 }
      const entity = entityService.createEntity(entityData)
      expect(entity.extraProperty).toBe('value')
      expect(entity.anotherProp).toBe(42)
    })
  })

  describe('findPlayerBase', () => {
    it('should find player base when it exists', () => {
      const baseEntity = { id: 1, entityType: 'base', fraction: 'Player' }
      gameDemo.stateManager.getEntityState = jest.fn(() => ({ entities: new Map([[1, baseEntity]]) }))
      const result = entityService.findPlayerBase()
      expect(result).toBe(baseEntity)
    })

    it('should return null when no player base exists', () => {
      gameDemo.stateManager.getEntityState = jest.fn(() => ({ entities: new Map([[1, { entityType: 'vehicle', fraction: 'Player' }]]) }))
      const result = entityService.findPlayerBase()
      expect(result).toBeNull()
    })

    it('should return null when base belongs to enemy', () => {
      const enemyBase = { id: 1, entityType: 'base', fraction: 'Enemy' }
      gameDemo.stateManager.getEntityState = jest.fn(() => ({ entities: new Map([[1, enemyBase]]) }))
      const result = entityService.findPlayerBase()
      expect(result).toBeNull()
    })
  })

  describe('isPlayerBaseSelected', () => {
    it('should return true when player base is selected', () => {
      const baseEntity = { id: 1, entityType: 'base', fraction: 'Player' }
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({ selectedEntityIds: new Set([1]) }))
      gameDemo.stateManager.getEntityState = jest.fn(() => ({ entities: new Map([[1, baseEntity]]) }))
      const result = entityService.isPlayerBaseSelected()
      expect(result).toBe(true)
    })

    it('should return false when no base is selected', () => {
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({ selectedEntityIds: new Set([1]) }))
      gameDemo.stateManager.getEntityState = jest.fn(() => ({ entities: new Map([[1, { entityType: 'vehicle', fraction: 'Player' }]]) }))
      const result = entityService.isPlayerBaseSelected()
      expect(result).toBe(false)
    })

    it('should return false when player vehicle is selected but not base', () => {
      const vehicleEntity = { id: 1, entityType: 'vehicle', fraction: 'Player' }
      gameDemo.stateManager.getSelectionState = jest.fn(() => ({ selectedEntityIds: new Set([1]) }))
      gameDemo.stateManager.getEntityState = jest.fn(() => ({ entities: new Map([[1, vehicleEntity]]) }))
      const result = entityService.isPlayerBaseSelected()
      expect(result).toBe(false)
    })
  })

  describe('getEntitiesByType', () => {
    it('should return entities of specified type', () => {
      const base1 = { id: 1, entityType: 'base' }
      const base2 = { id: 2, entityType: 'base' }
      const vehicle = { id: 3, entityType: 'vehicle' }
      gameDemo.stateManager.getEntityState = jest.fn(() => ({ entities: new Map([[1, base1], [2, base2], [3, vehicle]]) }))
      const result = entityService.getEntitiesByType('base')
      expect(result).toHaveLength(2)
      expect(result).toContain(base1)
      expect(result).toContain(base2)
    })

    it('should return empty array when no entities match', () => {
      gameDemo.stateManager.getEntityState = jest.fn(() => ({ entities: new Map([[1, { entityType: 'base' }]]) }))
      const result = entityService.getEntitiesByType('vehicle')
      expect(result).toEqual([])
    })
  })

  describe('getEntitiesByFraction', () => {
    it('should return entities of specified fraction', () => {
      const playerUnit1 = { id: 1, fraction: 'Player' }
      const playerUnit2 = { id: 2, fraction: 'Player' }
      const enemyUnit = { id: 3, fraction: 'Enemy' }
      gameDemo.stateManager.getEntityState = jest.fn(() => ({ entities: new Map([[1, playerUnit1], [2, playerUnit2], [3, enemyUnit]]) }))
      const result = entityService.getEntitiesByFraction('Player')
      expect(result).toHaveLength(2)
      expect(result).toContain(playerUnit1)
      expect(result).toContain(playerUnit2)
    })

    it('should return empty array when no entities match', () => {
      gameDemo.stateManager.getEntityState = jest.fn(() => ({ entities: new Map([[1, { fraction: 'Player' }]]) }))
      const result = entityService.getEntitiesByFraction('Enemy')
      expect(result).toEqual([])
    })
  })

  describe('entityExists', () => {
    it('should return true when entity exists', () => {
      gameDemo.stateManager.getEntityState = jest.fn(() => ({ entities: new Map([[1, { id: 1 }]]) }))
      const result = entityService.entityExists(1)
      expect(result).toBe(true)
    })

    it('should return false when entity does not exist', () => {
      gameDemo.stateManager.getEntityState = jest.fn(() => ({ entities: new Map([[1, { id: 1 }]]) }))
      const result = entityService.entityExists(999)
      expect(result).toBe(false)
    })
  })
})
