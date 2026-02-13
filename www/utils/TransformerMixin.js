/**
 * TransformerProvider - Provides consistent transformer handling across systems
 * Replaces TransformerMixin with cleaner composition pattern
 */

import { createCoordinateTransformer } from './coordinate-transformer.js'

/**
 * Shared transformer provider that can be composed into classes
 * Manages transformer through explicit injection or fallback chain
 */
export class TransformerProvider {
  constructor() {
    this.transformer = null
  }

  setTransformer(transformer) {
    this.transformer = transformer
  }

  getTransformer() {
    if (this.transformer) return this.transformer
    if (this.gameEngine?.transformer) return this.gameEngine.transformer
    if (this.rendererSystem?.transformer) return this.rendererSystem.transformer
    if (this.app) return this.transformer
    return null
  }

  initTransformerFromApp(app) {
    if (!app) return null
    this.transformer = createCoordinateTransformer(app)
    return this.transformer
  }
}

export class TransformerMixin extends TransformerProvider {}
