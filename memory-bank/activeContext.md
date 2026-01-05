# Nation of Last Land - Active Context

## Current Development Status

### Project Phase: Foundation Establishment
The project is in early development with core architecture established but minimal gameplay systems implemented. The ECS framework is set up with basic components and API structure, but core game mechanics remain to be built.

## Current Work Focus

### Immediate Priorities
1. **Core System Implementation**: Movement, combat, and alert systems ✅ (Combat system fixed for entities without Vehicle components)
2. **Unit Targeting System**: ✅ Added click-to-attack functionality for hostile units
3. **Selection Management**: ✅ Implemented exclusive unit selection - selecting new units automatically clears previous selections
4. **Alert Target Assignment**: ✅ Vehicles now receive movement targets when clicking on alerts
5. **API Completion**: Full WebAssembly API with game loop integration
6. **Configuration System**: YAML-based unit and balance configuration
7. **Basic Gameplay Loop**: Functional game with unit creation and updates

### Active Development Areas
- **ECS Component Design**: Refining component structure for game systems
- **API Function Implementation**: Building WASM interface functions
- **Configuration Loading**: Setting up runtime configuration system
- **Game State Management**: Designing state serialization and persistence

## Recent Changes & Decisions

### Architecture Decisions Made
- **ECS Framework**: Adopted hecs for entity component system implementation
- **WebAssembly First**: Primary target platform with cross-compilation potential
- **YAML Configuration**: Human-readable configuration files for game balance
- **JSON State Communication**: Standardized API response format

### Code Structure Established
- **Modular Organization**: Clear separation between game logic, API, and configuration
- **Component Library**: Basic ECS components (Position, Health, Movement, etc.) defined
- **API Skeleton**: WebAssembly functions for init, create_vehicle, and update implemented
- **Configuration Framework**: YAML loading infrastructure in place
- **Selection Management**: Exclusive unit selection system - selecting new units automatically clears previous selections

## Next Steps & Roadmap

### Short-term Goals (Next 2-4 weeks)
1. **Movement System**: Implement unit movement toward targets
2. **Basic Combat**: Add damage calculation and health management
3. **Alert System**: Create random event generation and processing
4. **Game Loop Integration**: Connect ECS systems to API update function

### Medium-term Goals (1-3 months)
1. **Base Building**: Implement vertical base expansion with floors
2. **Vehicle Customization**: Add modular device system
3. **Crew Management**: Implement anthropomorphic cat crew system
4. **Research Mechanics**: Add science collection and laboratory system

### Long-term Vision (3-6 months)
1. **Time Rewind**: Core mechanic implementation with skill preservation
2. **Full UI Integration**: Complete web interface with all game systems
3. **Balance Tuning**: Extensive playtesting and game balance adjustments
4. **Multi-platform**: Desktop and mobile port considerations

## Active Considerations

### Technical Decisions Pending
- **Pathfinding Algorithm**: A* vs flow field vs simple steering behaviors
- **State Persistence**: How to handle game saves with time rewind mechanics
- **UI Framework**: Web-based UI technology for game interface
- **Performance Optimization**: Strategies for handling large unit counts

### Design Questions Open
- **Risk/Reward Balance**: How punishing should avatar death feel?
- **Progression Curve**: Rate of base expansion and crew development
- **Resource Complexity**: How many resource types and their interactions?
- **Crew Agency**: How much independent behavior should cats exhibit?

### Implementation Challenges
- **WebAssembly Debugging**: Limited debugging tools and workflow complexity
- **State Synchronization**: Keeping internal ECS state and external UI in sync
- **Configuration Validation**: Ensuring YAML configurations are valid at runtime
- **Performance Scaling**: Maintaining smooth performance with increasing complexity

## Current Blockers & Dependencies

### Technical Blockers
- **WASM Tooling**: Learning curve for WebAssembly development workflow
- **ECS Patterns**: Adapting game design to ECS constraints and benefits
- **Serialization Boundaries**: Managing data conversion between Rust and JavaScript

### Knowledge Gaps
- **Game Balance**: Experience with strategic game balancing
- **Web Performance**: Optimization techniques for browser-based games
- **UI/UX Design**: Creating intuitive interfaces for complex strategy mechanics

## Risk Assessment

### High-Risk Areas
- **Core Mechanic Complexity**: Time rewind with selective preservation is technically challenging
- **Performance Requirements**: Maintaining smooth performance across different browsers
- **Scope Creep**: Rich feature set (crew equipment, research, base building) could expand indefinitely

### Mitigation Strategies
- **Incremental Development**: Build core systems before advanced features
- **Prototype Testing**: Create minimal viable versions of complex systems
- **Modular Architecture**: Design systems to be developed and tested independently
- **Regular Checkpoints**: Frequent testing of core gameplay loops

## Collaboration & Communication

### Development Workflow
- **Solo Development**: Currently single developer project
- **Documentation Focus**: Emphasis on clear technical documentation
- **Iterative Process**: Build, test, refine cycle for each system

### Quality Assurance
- **Unit Testing**: Core system testing with Rust's testing framework
- **Integration Testing**: Full API function testing
- **Manual Testing**: Gameplay testing in web environment
- **Performance Monitoring**: Regular performance profiling and optimization
