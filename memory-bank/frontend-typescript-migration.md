# Frontend: TypeScript Migration

## Overview

This document describes the TypeScript migration for the Nation of Last Land frontend. The original JavaScript version is in `www/`, and the TypeScript version is in `www-ts/`.

## Migration Status

The TypeScript version is a 1:1 migration of the JavaScript code with added type safety and modern TypeScript features.

## Directory Structure

```
www-ts/
├── core/
│   ├── GameEngine.ts       # Game engine coordinator
│   └── StateContainer.ts   # Immutable state container
├── systems/
│   ├── EntitySpawnSystem.ts
│   ├── GameStateSystem.ts
│   ├── InputSystem.ts
│   ├── MovementSystem.ts
│   ├── RendererSystem.ts
│   └── SelectionSystem.ts
├── utils/
│   ├── cleanup.ts
│   ├── coordinateTransformer.ts
│   ├── entityDrawer.ts
│   ├── entityUtils.ts
│   └── math.ts
├── services/
│   └── SelectionIndicator.ts
├── api/
│   └── GameApi.ts
├── config/
│   └── game-config.ts
├── index.ts                # Centralized exports
├── wasm-imports.ts         # WASM function imports (mock)
├── server.ts               # Development server
├── tsconfig.json           # TypeScript configuration
└── README.md               # TypeScript version README
```

## Key Differences from JavaScript

1. **Type Safety**: All files are `.ts` with proper TypeScript types
2. **Interfaces**: Added proper interfaces for complex types
3. **Await/Async**: Consistent async/await pattern
4. **ES Module Imports**: Using `import ... from './module.js'`

## Commands

### Build
```bash
cd www-ts
npm install
npm run build
```

### Development
```bash
npm run dev:ts
```

### Test
```bash
npm test
```

## WASM Integration

The TypeScript version uses `wasm-imports.ts` as a mock for WASM functions. In production, these should be replaced with actual WASM bindings.

## Development Server

The TypeScript version uses an Express server (`server.ts`) for development:
- Runs on port 3002 (original JS on 3000)
- Provides live reload support
- Serves from `dist/` directory

## Notes

- The original `www/` directory is NOT modified
- Both versions coexist for comparison
- TypeScript version is the recommended approach for new development