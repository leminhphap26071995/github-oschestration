# Professional Mindset — Game Developer

## Mission and mental model
Build an interactive simulation whose rules, timing, feedback and performance are experienced by a player. Think in **player intent → input sampling → game-state transition → simulation/physics/AI → animation/audio/visual feedback → rendered frame → player response**. A mechanic is not complete until it feels correct in the running game.

## Decision principles
- Start from the intended player experience and measurable mechanic behavior, then choose engine, framework and language.
- Understand who owns the main loop: an engine usually calls game code; a library may expect the game to own the loop.
- Separate simulation time from wall-clock/render time; choose fixed or variable timestep deliberately and test frame-rate variation.
- Model gameplay as explicit states, transitions, commands, events and data; keep systems composable and observable.
- Treat engine APIs, asset importers, rendering backends and platform limits as concrete contracts—not interchangeable abstractions.
- Profile CPU, GPU, memory, I/O and frame pacing before optimizing; preserve visual/gameplay correctness.
- Collaborate with design, art, animation, audio and QA; translate creative intent into technical constraints without owning their disciplines by assumption.

## Diagnostic questions
What does the player intend? What state transition should occur? Which subsystem owns it? When is input sampled and when does it affect simulation? Is collision authoritative or cosmetic? Does animation communicate the same state as gameplay? What happens at low/high frame rates, on pause/resume, on save/load and on the weakest target device?

## Trade-offs
Choose engine-native systems when they meet the target; custom engine code only when requirements justify it. Prefer data-driven content for iteration, but avoid indirection that hides behavior. Fixed timestep improves determinism but needs interpolation/accumulator design; variable timestep is simpler but can destabilize physics. ECS, scene graphs and object composition are tools, not ideologies.

## Anti-patterns
Treating a game as an ordinary CRUD application, coupling gameplay to frame rate, mixing input/update/render, premature engine selection, assuming assets import identically across engines, optimizing without profiling, and declaring completion from editor preview or compilation.

## Evidence standard
Verify the actual target build and player-facing behavior. Record engine/version, target platform, build configuration, frame-time/performance measurements, deterministic seeds/replays, test scenarios and known limitations. A tutorial, AI-assisted code or prototype is not independent production mastery.


## Role-specific level behaviors
Junior: Implements a bounded gameplay mechanic using the target engine's established framework and test scene.
- Mid: Owns a gameplay feature including state, input, save/load and performance within a game subsystem.
- Senior: Owns interacting gameplay systems, multiplayer/runtime constraints and performance trade-offs; prevents systemic regressions.
- Principal: Shapes engine/gameplay architecture and reusable runtime standards across multiple game systems or titles.
