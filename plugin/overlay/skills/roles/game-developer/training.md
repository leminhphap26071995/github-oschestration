# Game Developer — Specialist Training Curriculum

## Training contract
Train from mental models to independent implementation. Reading docs or completing an AI-assisted exercise is not mastery. Each module has an explanation, a small lab, a failure/counterexample and an evidence gate. Keep guided, assisted, independent and transfer attempts separate.

## Module 1 — Runtime, time and the game loop
- Learn input/update/simulation/render separation, engine-owned versus application-owned loops, frame pacing, fixed/variable timestep, delta time, accumulator and pause/resume.
- Lab: implement a moving actor and timer-based enemy behavior; compare fixed and variable timestep under simulated frame spikes.
- Counterexamples: 15 FPS vs 120 FPS movement, large delta, pause/resume, input arriving between frames.
- Evidence: explain update ordering; demonstrate stable movement/timing and tests for frame-rate variation.

## Module 2 — Gameplay systems and state
- Learn player intent, commands, state machines, ability lifecycle, collision authority, event flow and data-driven tuning.
- Lab: implement a character controller with idle/run/jump/attack/hit states, cooldown, collision and visible feedback.
- Counterexamples: attack interrupted by hit, landing on boundary, duplicate input, cooldown at pause, invalid transition.
- Evidence: trace one input to state transition and consumer feedback; show positive/negative transition tests.

## Module 3 — Engine/framework and language selection
- Compare engine vs framework vs library; evaluate Unity/C#, Unreal/C++/Blueprints, Godot/GDScript/C#, Phaser/JS/TS, Bevy/Rust and other viable stacks against genre, platform, team skill, license, tooling, performance and lifecycle.
- Lab: build the same tiny interaction in one chosen engine and map which subsystem owns loop, input, physics, rendering, assets and build.
- Counterexamples: assuming a library owns the loop; assuming a plugin/importer works in a different version; selecting an engine before platform constraints.
- Evidence: decision record with tested compatibility and trade-offs, not a popularity ranking.

## Module 4 — Rendering, animation, VFX and assets
- Learn coordinate spaces, camera, sprites/meshes, materials/shaders, texture import, pivots, skeletons, clips, blend trees, alpha and render order.
- Lab: import an animated character and create one hit/impact effect; use PixelFX only if its authoring model fits, then import through the chosen engine's supported route.
- Counterexamples: wrong pivot, transparent fringe, sorting conflict, sprite-sheet frame-duration mismatch, VFX that obscures gameplay.
- Evidence: verify animation and effect in actual runtime at native scale and on contrasting backgrounds.

## Module 5 — Physics, collision and AI
- Learn collision layers, broadphase/narrowphase, rigid/kinematic movement, raycasts, navigation, state/behavior trees and pathfinding costs.
- Lab: implement a moving enemy with patrol/chase/attack/recover states and collision-aware navigation.
- Counterexamples: tunneling, corner snag, unreachable waypoint, target despawn, repeated attack event.
- Evidence: deterministic tests plus runtime behavior at target frame rates.

## Module 6 — Audio, UI, persistence and platform integration
- Learn input mapping, accessibility, HUD/menu state, audio event timing, save/load/versioning and platform lifecycle.
- Lab: connect health/ability state to HUD, sound and save/load; test controller and keyboard input if relevant.
- Counterexamples: stale UI, missing audio device, save migration, focus loss, controller disconnect.
- Evidence: player journey succeeds through actual UI/audio/persistence on target runtime.

## Module 7 — Profiling, optimization and quality
- Learn frame budgets, CPU/GPU profiling, memory/allocation, asset streaming, batching, shader cost and target-specific constraints.
- Lab: capture baseline, identify one measured bottleneck, optimize it and compare same scenario.
- Counterexamples: optimizing a non-bottleneck, improving average FPS while worsening 1% lows, hiding visual regression.
- Evidence: before/after measurements, exact device/build and unchanged gameplay acceptance.

## Module 8 — Complete playable vertical slice
- Lab: deliver a small playable level containing input, one mechanic, one enemy/interaction, animation/VFX/audio, UI, restart/save behavior and target build.
- Acceptance: clean build; reproducible artifact; no blocking state errors; mechanic matches acceptance; tests cover edge cases; actual target runtime/playtest evidence; known limitations and rollback recorded.

## Evaluation rubric
Score each dimension 0–4: (0) absent/incorrect; (1) explains with heavy prompting; (2) completes with guidance/AI assistance; (3) independently implements and verifies the known scenario; (4) transfers the mental model to a changed engine/mechanic/platform and defends trade-offs.

Dimensions: runtime/time model; gameplay state/architecture; engine/API understanding; asset/render/animation integration; physics/AI; debugging/profiling; tests/build/consumer verification; evidence and rollback.

A role readiness claim requires level 3 in the relevant task dimensions and a level-4 transfer challenge for the claimed specialization. Do not average away a critical safety/performance failure. Preserve evidence and distinguish tutorial, lab, assisted, independent and production experience.


## Reference shelf
Start with the official docs for the chosen engine/version: [Unity 2D workflow](https://docs.unity.com/en-us/engine/6000.5/manual/unity2d/2d-game-development/2d-game-creation-wokflow), [Unreal Gameplay Systems](https://dev.epicgames.com/documentation/unreal-engine/gameplay-systems-in-unreal-engine?lang=en-US), [Godot architecture](https://docs.godotengine.org/en/stable/engine_details/architecture/godot_architecture_diagram.html), [Phaser docs](https://phaser.io/oss/docs/) and [Bevy](https://bevy.org/). For industry role boundaries, use [Microsoft Game Dev careers](https://developer.microsoft.com/en-us/games/resources/industry-careers/) and [Ubisoft job roles](https://www.ubisoft.com/en-us/company/careers/locations/articles/our-job-roles). For reusable mental models, use [Game Programming Patterns](https://gameprogrammingpatterns.com/).
