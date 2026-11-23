# Game Developer — Specialist Knowledge

## Domain foundations
A game is a time-dependent interactive simulation. The runtime commonly processes input, advances simulation (gameplay/AI/physics), updates animation/audio and renders a frame. The engine may own this loop; a lower-level library may require the game to own it. Time-step policy, pause/resume, frame pacing, determinism and input latency are gameplay correctness concerns, not merely implementation details.

## Gameplay architecture
Model player intent, commands, state machines, abilities, rules, world state, collision, physics, events, animation and feedback as explicit systems with clear ownership. Use composition/components or ECS where it reduces coupling and supports data locality; use scene graphs/object hierarchies where they fit the engine. Data-driven definitions help designers iterate but must retain inspectable contracts and validation. Distinguish authoritative simulation state from presentation-only effects.

## Engines, frameworks and languages — choose, do not assume
- Unity: C#; GameObjects/Components, scenes, 2D/3D pipelines, animation, physics, UI, profiling and platform build tooling.
- Unreal Engine: C++ and Blueprints; Gameplay Framework, Actors/Components, input, StateTree/Behavior Trees, navigation, physics, Gameplay Ability System, rendering and profiling.
- Godot: GDScript and C# (plus supported extension routes); SceneTree/Node scene model, server subsystems for rendering/audio/physics, platform drivers and MainLoop.
- Phaser: JavaScript/TypeScript; browser-focused 2D framework with Canvas/WebGL, scenes, cameras, input, game objects, animation and supported physics integrations.
- Bevy: Rust and ECS; components/resources/systems, schedules, renderer/render graph, scenes, assets, animation and platform targets.
- Other valid choices include GameMaker/GML, MonoGame/C#, LibGDX/Java-Kotlin, LÖVE/Lua, SDL/Raylib/C-C++, custom C++/Rust engines. Validate current version, license, platform support, ecosystem and team constraints before selection.

## Specialist disciplines
Gameplay programming; engine/runtime; tools and asset pipelines; graphics/rendering/shaders; animation/rigging; physics/collision; AI/pathfinding; audio; UI/UX implementation; networking/multiplayer; platform integration; build/release; profiling/optimization. A general Game Developer role routes to the relevant specialist discipline rather than assuming one person is expert in every subdomain.

## Rendering and asset pipeline
Understand coordinate spaces, camera transforms, materials, shader stages, render passes, batching, texture formats/compression, mipmaps, alpha/blend modes, color spaces and GPU/CPU boundaries. Asset import settings, pivots, skeletons, animation clips, compression and runtime references are part of the consumer contract. PixelFX can author pixel-art VFX and export sprite sheets; integration depends on the target engine/importer and must be verified.

## Simulation, physics and AI
Choose fixed/variable timestep based on determinism and stability needs; account for accumulator/interpolation and large-delta behavior. Understand collision layers, broadphase/narrowphase, raycasts, rigid/kinematic bodies, navmeshes, behavior trees, state machines, utility AI and pathfinding costs. Never treat presentation animation as authoritative collision or state.

## Performance and testing
Measure frame time (CPU/GPU), memory, allocation/GC, asset load, draw calls/batches, shader cost and network latency where relevant. Optimize the measured bottleneck while protecting gameplay. Use deterministic seeds/replays, unit/simulation tests, integration tests, scene/content validation, target-device profiling and real playtests. Test frame-rate variation, pause/resume, save/load, input edge cases, collision boundaries and low-end targets.

## Sources and version discipline
Official engine docs and platform docs outrank generic examples. Verify engine/API version and importer behavior. Useful references: Microsoft Game Dev industry disciplines; Ubisoft role descriptions; Unity 2D creation workflow; Unreal Gameplay Systems; Godot architecture; Phaser docs; Bevy engine docs; Game Programming Patterns. These are reference families, not proof that a particular target supports a feature.


## Reference sources (checked 2026-11-05)
- Microsoft Game Dev — industry disciplines and engineering/programming roles: https://developer.microsoft.com/en-us/games/resources/industry-careers/
- Ubisoft — professional responsibilities across game design, level design, art, animation, programming and gameplay programming: https://www.ubisoft.com/en-us/company/careers/locations/articles/our-job-roles
- Unity 6.0 — 2D game creation workflow and profiling/testing/publishing sequence: https://docs.unity.com/en-us/engine/6000.5/manual/unity2d/2d-game-development/2d-game-creation-wokflow
- Unreal Engine 5.8 — Gameplay Systems, framework, AI, physics and ability systems: https://dev.epicgames.com/documentation/unreal-engine/gameplay-systems-in-unreal-engine?lang=en-US
- Godot stable — engine architecture, scene/server/driver layers and main loop: https://docs.godotengine.org/en/stable/engine_details/architecture/godot_architecture_diagram.html
- Phaser — current 2D browser framework documentation and versioned API references: https://phaser.io/oss/docs/
- Bevy — Rust/ECS, rendering, animation, assets and platform overview: https://bevy.org/
- Game Programming Patterns — game loop, update method, component and optimization patterns: https://gameprogrammingpatterns.com/

Use the source matching the chosen engine/version. These sources define capability patterns, not project-specific implementation facts or runtime acceptance.
