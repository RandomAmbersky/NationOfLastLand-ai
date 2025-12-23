# Nation of Last Land - Project Brief

## Project Overview
Nation of Last Land is a strategic RTS game in the tower defense genre featuring a unique time rewind mechanic in a post-apocalyptic world. Players control a faction of anthropomorphic cats building and expanding survival bases.

## Core Unique Mechanic
The central gameplay element is **avatar death risk**. When sending units on missions, players risk the life of their leader SP1 "Excellent". Death triggers a time rewind - all achievements reset except the avatar's skills.

## Project Scope
- **Genre**: Strategic RTS / Tower Defense
- **Theme**: Post-apocalyptic world with anthropomorphic cats
- **Core Loop**: Base building, unit management, mission deployment with risk/reward
- **Unique Feature**: Time rewind mechanic with selective progress preservation
- **Target Platform**: Web (WebAssembly) with potential desktop/mobile ports

## Key Requirements
1. **Time Rewind System**: Core mechanic where avatar death resets the world but preserves skills
2. **Base Expansion**: Vertical base building with modular floors (storage, labs, repair, rest)
3. **Vehicle System**: Mechanized machines with modular device customization
4. **Crew Management**: Anthropomorphic cat crew with equipment, fatigue, and health systems
5. **Research System**: Multi-type science collection and laboratory research progression
6. **Economic Balance**: Reputation and multi-tier resource management (silver, gold, platinum)

## Technical Foundation
- **Language**: Rust with WebAssembly compilation
- **Architecture**: ECS (Entity Component System) using hecs
- **Data Format**: YAML for configuration, JSON for state communication
- **API**: WebAssembly functions for game initialization, unit creation, and game loop

## Success Criteria
- Functional time rewind mechanic with skill preservation
- Balanced risk/reward system for mission deployment
- Engaging progression through base expansion and research
- Intuitive controls for unit management and base operations
- Performance supporting multiple units and large maps

## Development Status
Currently in early development phase with core ECS architecture established. Basic components and API structure implemented, ready for system development.
