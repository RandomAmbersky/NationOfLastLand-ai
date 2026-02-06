import { describe, it, expect } from 'vitest'
import { calculateDistance, calculateDistanceBetween } from './utils.js'

describe('utils.js - Distance calculations', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // Distance between (0, 0) and (3, 4) should be 5 (3-4-5 triangle)
      expect(calculateDistance(0, 0, 3, 4)).toBe(5)
    })

    it('should return 0 for same points', () => {
      expect(calculateDistance(5, 5, 5, 5)).toBe(0)
    })

    it('should handle negative coordinates', () => {
      // Distance between (-3, -4) and (0, 0) should be 5
      expect(calculateDistance(-3, -4, 0, 0)).toBe(5)
    })

    it('should handle floating point coordinates', () => {
      const result = calculateDistance(0, 0, 1.5, 2)
      expect(result).toBeCloseTo(2.5)
    })
  })

  describe('calculateDistanceBetween', () => {
    it('should calculate distance between two position objects', () => {
      const pos1 = { x: 0, y: 0 }
      const pos2 = { x: 3, y: 4 }
      expect(calculateDistanceBetween(pos1, pos2)).toBe(5)
    })

    it('should return 0 for same position objects', () => {
      const pos = { x: 5, y: 5 }
      expect(calculateDistanceBetween(pos, pos)).toBe(0)
    })

    it('should handle negative coordinates in objects', () => {
      const pos1 = { x: -3, y: -4 }
      const pos2 = { x: 0, y: 0 }
      expect(calculateDistanceBetween(pos1, pos2)).toBe(5)
    })
  })
})
