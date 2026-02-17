#Nation of Last Land - TypeScript Version

This is the TypeScript version of the Nation of Last Land game frontend. The original JavaScript version is in the `www/` directory.

## Directory Structure

```
www-ts/
├── core/              # Core engine modules
│   ├── GameEngine.ts  # Game engine coordinator
│   └── StateContainer.ts  # Immutable state container
├── systems/           # Game systems
│   ├── EntitySpawnSystem.ts
│   ├── GameStateSystem.ts
│   ├── InputSystem.ts
│   ├── MovementSystem.ts
│   ├── RendererSystem.ts
│   └── SelectionSystem.ts
├── utils/             # Utility functions
│   ├── cleanup.ts
│   ├── coordinateTransformer.ts
│   ├── entityDrawer.ts
│   ├── entityUtils.ts
│   └── math.ts
├── services/          # Service modules
│   └── SelectionIndicator.ts
├── api/               # Game API (WASM abstraction)
│   └── GameApi.ts
├── config/            # Configuration
│   └── game-config.ts
├── index.ts           # Centralized exports
├── wasm-imports.ts    # WASM function imports (mock)
├── server.ts          # Development server
├── tsconfig.json      # TypeScript configuration
└── package.json       # npm package configuration
```

## Usage

### Environment Setup

1. Install dependencies:
```bash
cd www-ts
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

### Development

Start the development server:
```bash
npm run dev:ts
```

This will:
1. Build the TypeScript code
2. Start a development server on port 3002

### Production Build

Build for production:
```bash
npm run build
```

The output will be in `www-ts/dist/`

## Key Differences from JavaScript Version

1. **Type Safety**: TypeScript adds static type checking
2. **Modern Syntax**: Uses ES2020+ features with better module support
3. **Enhanced IDE Support**: Better autocomplete and refactoring support
4. **Separate Folder**: Original JS version in `www/`, TypeScript in `www-ts/`

## Configuration

- TypeScript config: `tsconfig.json`
- Package config: `package.json`
- Server config: `server.ts`

## Notes

- WASM imports are mocked in `wasm-imports.ts` - replace with actual WASM bindings in production
- The original JavaScript version in `www/` is not modified
- Both versions can coexist for comparison and migration tracking
