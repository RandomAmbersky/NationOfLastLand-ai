/**
 * TransformerMixin - Provides consistent transformer handling across systems
 * Eliminates duplicate transformer initialization logic
 */

import { createCoordinateTransformer } from './coordinate-transformer.js'

/**
 * Returns a class that extends the given base class with transformer functionality
 * @param {Function} BaseClass - Base class to extend
 * @returns {Function} Extended class
 */
export function withTransformer(BaseClass) {
  return class extends BaseClass {
    transformer = null

    /**
     * Set the transformer instance
     * @param {Object} transformer - CoordinateTransformer instance
     */
    setTransformer(transformer) {
      this.transformer = transformer
    }

    /**
     * Get the transformer, with fallback chain
     * @returns {Object|null} CoordinateTransformer or null
     */
    _getTransformer() {
      if (this.transformer) return this.transformer

      // Fallback chain
      if (this.gameEngine?.transformer) return this.gameEngine.transformer
      if (this.rendererSystem?.transformer) return this.rendererSystem.transformer
      if (this.app) {
        return this.transformer = createCoordinateTransformer(this.app)
      }

      return null
    }
  }
}
