/**
 * Game configuration constants
 */
export const GAME_CONFIG = {
    WORLD_SIZE: { width: 800, height: 600 },
    ENTITY_SIZES: {
        scout: 8,
        tank: { width: 20, height: 16 },
        transport: { width: 24, height: 20 },
        base: { width: 30, height: 30 },
        alert: { hidden: 8, revealed: 12 }
    },
    COLORS: {
        player: { scout: 0x4CAF50, tank: 0xFF5722, transport: 0x2196F3 },
        enemy: { scout: 0x2E7D32, tank: 0xB71C1C, transport: 0x0D47A1 },
        wild: { scout: 0x8D6E63, tank: 0x8D6E63, transport: 0x8D6E63 },
        neutral: { scout: 0x00BCD4, tank: 0x00BCD4, transport: 0x00BCD4 },
        base: 0x2196F3,
        alert: 0xB8860B,
        selection: { player: 0x0080FF, enemy: 0xFF0000 },
        info: 0x0080FF
    },
    DISTANCES: {
        clickTolerance: 20,
        alertClickRadius: 15,
        baseUnitRadius: 50,
        combatRange: 20,
        alertRevealRange: 25
    },
    LIMITS: {
        maxGroupSize: 12,
        dragThreshold: 5
    },
    UI: {
        fontSize: { label: 10, damage: 14 },
        indicatorSize: 12,
        targetIndicatorSize: 10,
        explosionScale: 3.0,
        healthBarLength: 10
    },
    VISIBILITY: {
        range: 200,
        sameTypeUnitRadius: 200
    },
    TIMEOUTS: {
        targetIndicator: 2000,
        alertHighlight: 3000
    }
};
