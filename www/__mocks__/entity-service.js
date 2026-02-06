export const EntityService = class {
  constructor() {
    this.findPlayerBase = jest.fn(() => null);
  }
  
  createEntity(entityData) {
    return entityData;
  }
  
  findPlayerBase() {
    return null;
  }
};
