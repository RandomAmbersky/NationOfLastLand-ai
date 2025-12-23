# Nation of Last Land - Technical Context

## Technology Stack

### Core Language & Runtime
- **Rust**: Systems programming language providing memory safety and performance
- **WebAssembly**: Cross-platform compilation target for web deployment
- **wasm-bindgen**: Bridge between Rust and JavaScript for web integration

### ECS Framework
- **hecs**: Entity Component System library for game architecture
- **Entity-based Design**: Flexible object management without inheritance hierarchies
- **Performance Optimized**: Efficient iteration and component access patterns

### Data Management
- **Serde**: Serialization framework with multiple format support
- **YAML**: Human-readable configuration files for game balance
- **JSON**: Runtime state communication between Rust and JavaScript

### Web Integration
- **wasm-bindgen**: Type-safe Rust/JavaScript interop
- **serde-wasm-bindgen**: Efficient serialization for WASM boundary
- **js-sys**: JavaScript standard library bindings
- **web-sys**: Browser API bindings for console logging

## Development Environment

### Build System
- **Cargo**: Rust package manager and build tool
- **wasm-pack**: WebAssembly packaging and optimization
- **Release Profile**: Configured with wasm-opt disabled for debugging

### Project Structure
```
src/
├── lib.rs              # WASM library entry point
├── game/               # Core game logic
│   ├── world.rs       # ECS world management
│   ├── components/    # ECS component definitions
│   └── systems/       # ECS system implementations
├── api/               # WASM API bindings
│   ├── init.rs       # Game initialization
│   ├── create_vehicle.rs  # Unit creation
│   └── update.rs     # Game loop updates
├── config/            # Configuration loading
└── types/             # Shared data types
```

## Technical Constraints

### WebAssembly Limitations
- **No File System Access**: Configuration loaded at compile time
- **Limited Multithreading**: Single-threaded execution model
- **Memory Management**: Manual memory management with Rust ownership
- **Debugging Complexity**: Limited debugging tools compared to native development

### Performance Requirements
- **Real-time Updates**: 60 FPS game loop with consistent timing
- **Scalable Entity Count**: Support for hundreds of simultaneous units
- **Memory Efficiency**: Minimize allocations during game loop
- **Web Performance**: Smooth performance in browser environment

### Architecture Constraints
- **ECS Paradigm**: All game logic must fit ECS component/system model
- **Stateless API**: Functions must be pure with explicit state passing
- **Serialization Boundaries**: Clear separation between internal and external data formats

## Dependencies & Ecosystem

### Core Dependencies
- **hecs = "0.10"**: ECS framework for entity management
- **serde = "1.0"**: Serialization with derive feature for automatic implementations
- **serde_yaml = "0.9"**: YAML parsing for configuration files
- **serde_json = "1.0"**: JSON serialization for API responses

### WebAssembly Dependencies
- **wasm-bindgen = "0.2"**: Core WASM binding functionality
- **serde-wasm-bindgen = "0.6"**: Optimized serde integration
- **js-sys = "0.3"**: JavaScript standard library access
- **web-sys = "0.3"**: Browser API bindings

## Development Workflow

### Build Process
1. **Compile**: Rust code compiled to WebAssembly
2. **Bundle**: wasm-pack creates JavaScript wrapper and TypeScript definitions
3. **Optimize**: Binary optimization for size and performance
4. **Deploy**: Generated files served by web application

### Testing Strategy
- **Unit Tests**: Individual component and system testing
- **Integration Tests**: Full API function testing
- **Performance Benchmarks**: Entity count and update frequency testing
- **Web Testing**: Browser-based testing of WASM functionality

## Platform Considerations

### Primary Platform: Web
- **Browser Compatibility**: Modern browser support with WASM
- **Performance**: GPU acceleration through WebGL (future feature)
- **Storage**: Local storage for save games (future feature)
- **Input**: Mouse and keyboard controls

### Future Platforms
- **Desktop**: Native compilation with potential Unity integration
- **Mobile**: Touch controls and performance optimization
- **Cross-platform**: Shared game logic with platform-specific UI

## Risk Mitigation

### Technical Risks
- **WASM Maturity**: Monitor WebAssembly ecosystem development
- **Performance**: Regular profiling and optimization reviews
- **Browser Support**: Progressive enhancement for different browsers
- **Bundle Size**: Code splitting and lazy loading strategies

### Development Risks
- **Learning Curve**: Team ramp-up on Rust and ECS patterns
- **Debugging**: Investment in WASM debugging tools and techniques
- **Testing**: Comprehensive test suite for complex game systems
