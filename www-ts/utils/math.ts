/**
 * Utility functions for common mathematical operations
 */

export function calculateDistance (x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

export function calculateDistanceBetween (pos1: { x: number, y: number }, pos2: { x: number, y: number }): number {
  return calculateDistance(pos1.x, pos1.y, pos2.x, pos2.y)
}

export function clamp (value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function lerp (start: number, end: number, t: number): number {
  return start + (end - start) * t
}
