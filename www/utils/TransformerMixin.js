/**
 * Transformer helper - Provides transformer management utilities
 * 
 * NOTE: Deprecated. Use direct transformer property or dependency injection.
 * Kept for backward compatibility during refactoring.
 * 
 * @deprecated Use system.transformer = transformer or pass transformer in constructor
 */

/**
 * @deprecated Use direct property assignment instead
 */
export function withTransformer(BaseClass) {
  return class extends BaseClass {
    constructor(...args) {
      super(...args)
      this.transformer = null
    }
    setTransformer(transformer) {
      this.transformer = transformer
    }
    getTransformer() {
      return this.transformer
    }
  }
}

/**
 * @deprecated Use direct property assignment instead
 */
export class TransformerProvider {
  constructor() {
    this.transformer = null
  }

  setTransformer(transformer) {
    this.transformer = transformer
  }

  getTransformer() {
    return this.transformer
  }
}

/**
 * @deprecated Use TransformerProvider directly
 */
export class TransformerMixin extends TransformerProvider { }
