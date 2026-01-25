/**
 * Utility functions for common mathematical operations
 */

/**
 * Calculate Euclidean distance between two points
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @returns {number} Distance between the two points
 */
export function calculateDistance (x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

/**
 * Calculate distance between two objects with x and y properties
 * @param {{x: number, y: number}} pos1 - First position object
 * @param {{x: number, y: number}} pos2 - Second position object
 * @returns {number} Distance between the two positions
 */
export function calculateDistanceBetween (pos1, pos2) {
  return calculateDistance(pos1.x, pos1.y, pos2.x, pos2.y)
}
