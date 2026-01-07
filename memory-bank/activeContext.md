# Nation of Last Land - Active Context

## Current Development Status

### Project Phase: Foundation Establishment
The project is in early development with core architecture established but minimal gameplay systems implemented. The ECS framework is set up with basic components and API structure, but core game mechanics remain to be built.

## Current Work Focus

### Immediate Priorities ✅
1. **Core System Implementation**: ✅ Movement, combat, and alert systems complete
2. **Unit Targeting System**: ✅ Click-to-attack functionality implemented
3. **Selection Management**: ✅ Exclusive unit selection working
4. **Alert Target Assignment**: ✅ Vehicles receive movement targets from alerts
5. **Base Building System**: ✅ Complete vertical expansion with specialized floors
6. **API Completion**: Full WebAssembly API with game loop integration
7. **Configuration System**: YAML-based unit and balance configuration
8. **Basic Gameplay Loop**: Functional game with unit creation and updates
9. **Group Selection Rules**: ✅ Verified implementation of units_moving_rules.md - both rules working correctly
10. **Dead Unit Filtering**: ✅ Fixed issue where dead units continued to display in UI - added health checks to get_entities_data() and get_entity_info()

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
1. **Resource Management**: Implement reputation and metal resource systems
2. **Crew Management**: Add anthropomorphic cat crew with health and fatigue
3. **Research System**: Create science collection and laboratory mechanics
4. **Equipment System**: Implement cat equipment with slot conflicts
5. **Initial Base**: Add starting base to game initialization

### Medium-term Goals (1-3 months)
1. **Vehicle Devices**: Add modular equipment system for vehicles
2. **Time Rewind**: Implement core mechanic with selective progress preservation
3. **Multiple Bases**: Base construction and management system
4. **UI Integration**: Complete web interface for all game systems

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
