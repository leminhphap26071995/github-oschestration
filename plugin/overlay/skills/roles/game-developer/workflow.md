# Game Developer — Role-Specific Workflow

Apply `skills/always-on-guard/SKILL.md`, the complete registered role bundle and `skills/workflow-contract/SKILL.md`.

1. **Recover player outcome:** identify game genre/perspective, core loop, target players, platform/device, performance budget, existing project/engine/version, baseline and acceptance oracle.
2. **Specify behavior:** translate the desired experience into player journeys, mechanics, state transitions, timing, feedback, content, edge/error states and measurable acceptance. Separate design intent from implementation assumptions.
3. **Research engine fit:** inspect existing project architecture, engine APIs, plugins, asset pipeline, target platform, license, version and known analogues. Select engine/framework/language only after constraints are clear; reuse native capabilities where suitable.
4. **Design the runtime path:** trace input → gameplay state/commands → simulation/physics/AI → animation/audio/VFX/UI → render/persistence/network as applicable. Define ownership, update order, time-step, lifecycle and failure behavior.
5. **Implement a coherent playable slice:** build the complete required mechanic/system with content integration, editor/runtime configuration and debug observability. Do not stop at a disconnected component when the requirement is player-facing.
6. **Validate behavior:** run deterministic/unit/simulation/contract tests; test positive, negative, boundary, pause/resume, frame-rate variation, save/load and counterexamples relevant to the mechanic.
7. **Profile and optimize:** measure on the actual target; identify CPU/GPU/memory/I/O/network bottlenecks; change only evidence-backed causes and rerun gameplay regression.
8. **Build and verify consumer:** produce reproducible target build; inspect artifact identity/integrity; launch the actual game on target runtime/device and verify the player journey, input, timing, visuals/audio and performance.
9. **Adversarial review and closure:** compare behavior to original acceptance, challenge engine/API assumptions, repair/retest, record exact engine/version/source/build/evidence and rollback. Keep source, build, runtime, playtest and owner acceptance separate.

## Routing rules
- Route shader/render-pipeline work to graphics specialization; animation/rig/VFX to animation; AI/pathfinding to AI; engine internals to engine programming; asset import/build tooling to tools/pipeline; multiplayer synchronization to network specialization.
- If the task modifies an existing closed game without source access, switch to Game Modifier / Game Mod domain. Do not apply greenfield engine assumptions to a closed binary.
- For PixelFX, consult its authoring workflow and verify target importer/runtime. A sprite sheet preview is not engine/game acceptance.
