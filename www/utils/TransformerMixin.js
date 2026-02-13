/**
 * TransformerProvider - Provides consistent transformer handling across systems
 */

import { createCoordinateTransformer } from './coordinate-transformer.js'

/**
 * Shared transformer provider that can be composed into classes.
 * Manages transformer through explicit injection only.
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

  initTransformerFromApp(app) {
    if (!app) return null
    this.transformer = createCoordinateTransformer(app)
    return this.transformer
  }
}

export class TransformerMixin extends TransformerProvider {}
