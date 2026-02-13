/**
 * Transformer mixin - Provides transformer property for coordinate transformation
 * Used by systems that need to convert between game and screen coordinates
 */

export class TransformerProvider {
  constructor () {
    this.transformer = null
  }

  setTransformer (transformer) {
    this.transformer = transformer
  }

  getTransformer () {
    return this.transformer
  }

  // Common init pattern for systems
  _initTransformer (app) {
    if (!this.transformer && app) {
      this.transformer = app?.renderer?.transformer || null
    }
  }
}

export class TransformerMixin {
  constructor () {
    this.transformer = null
  }

  setTransformer (transformer) {
    this.transformer = transformer
  }

  getTransformer () {
    return this.transformer
  }

  // Common init pattern for systems
  _initTransformer (app) {
    if (!this.transformer && app) {
      this.transformer = app?.renderer?.transformer || null
    }
  }
}
