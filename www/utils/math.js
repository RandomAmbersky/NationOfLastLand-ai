/**
 * Utility functions for common mathematical operations
 */

export function calculateDistance (x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

export function calculateDistanceBetween (pos1, pos2) {
  return calculateDistance(pos1.x, pos1.y, pos2.x, pos2.y)
}

export function clamp (value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function lerp (start, end, t) {
  return start + (end - start) * t
}
