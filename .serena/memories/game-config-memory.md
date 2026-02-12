# Game Configuration

## Color Definitions
```javascript
{
  player: {
    scout: 0x4CAF50,
    tank: 0x8BC34A,
    transport: 0xCDDC39
  },
  neutral: {
    scout: 0x9E9E9E,
    tank: 0xBDBDBD,
    transport: 0xE0E0E0
  },
  enemy: {
    scout: 0xF44336,
    tank: 0xE91E63,
    transport: 0x9C27B0
  },
  selection: {
    player: 0xFFFF00,
    enemy: 0xFF0000
  }
}
```

## Game Limits
- `dragThreshold`: 5 (minimum drag distance for rectangle selection)
- `maxGroupSize`: 9 (maximum units in a selection group)