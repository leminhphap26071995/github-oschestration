# Game Modifier — specialist knowledge and failure patterns

## Core method
Binary-first reverse engineering is core to closed-game modding.
Recover game/version, executable/disc layout and live target instructions; inspect binary/code/data/assets, addresses, control flow, memory/state and runtime behavior required by the requested mod. Choose the evidence-supported data/asset/script/assembly/source-reconstruction approach that satisfies the complete owner-approved scope; reduce unnecessary complexity, never required coverage. For a requested full-game baseline, run the game-specific recovery/REA pipeline once per exact input/toolchain identity, then reuse it for feature work.

## Domain-specific invariants and counterexamples
Reverse engineering is core to closed-game modding. A reusable full-game static REA/source baseline is required when the owner requests it; distinguish complete static code-region classification from semantic C-source mapping and list unmatched assembly explicitly. Do not claim full C decompilation when evidence says otherwise. Reuse the baseline for feature work instead of repeating original-disc acquisition/REA. Never assume offsets/assets are portable across games or overwrite immutable master. Source tests, candidate integrity, Android DuckStation gameplay, GD10 hardware and BKG/owner approval are separate gates. Keep commercial media/BIOS/private candidates/BKG out of public GitHub/Actions.

## Full-game baseline and resource-linkage model
When the owner requests full-game decompilation/reconstruction, do not build a feature-shaped substitute or hand-write game mechanics to stand in for the original source. Select the established game-specific REA/matching-decomp toolchain and run its full baseline pipeline once for the exact media identity and pinned tool revision.

1. Verify that the workflow actually acquired the original BIN/CUE: record expected and actual byte counts, SHA-256 for every acquired media file, CUE track references/layout and disc identity. A short workflow duration, successful trigger or manifest-only placeholder is not acquisition evidence.
2. Inspect the decompiler/REA receipt and coverage outputs. Report disc/file inventory, executable and data-region classification, static REA coverage, reconstructed C-source coverage, assembly/unmapped functions, resource extraction/decoding and build equivalence as separate measures. A 100% static classification is not automatically 100% semantic C reconstruction.
3. Verify the imported source tree by exact commit/tree SHA, file inventory, manifest and content hashes. Keep original media immutable/private and preserve project-authored reconstructed source, sanitized maps and provenance in the game branch.
4. For each feature, ChatGPT's engineering work starts from the existing reconstructed source tree: read source, trace callers/control flow/state and data references, then connect symbols/structures to archive entries, offsets, pointer tables, asset hashes, palettes/CLUTs, animation/frame data and the runtime consumer. Every edge must be source- or binary-evidenced; unresolved links remain explicit.
5. Compose the requirement-relevant original source subset, mod implementation and resource mappings in `mod/build-game/`. The build workflow materializes the complete temporary source workspace from the immutable original baseline plus those overlays, then runs the pinned original compiler/linker/CD toolchain. The mod folder is not a new game engine and must not replace the original runtime with ChatGPT-authored mechanics.
6. Produce CHD and DuckStation Data Transfer ZIP as distinct release outputs from that build composition. Verify each artifact's contents, hashes and provenance independently; emulator gameplay and owner acceptance remain separate.

Do not rerun original BIN/CUE acquisition or full REA for every feature. Re-run only when the owner explicitly selects a different input revision/toolchain baseline or a demonstrated integrity gap invalidates the existing baseline.

## PixelFX specialist skill — pixel-art VFX authoring and adaptation

### Capability and correct use
`patch-gg/pixelfx` is an MIT-licensed JavaScript pixel-art VFX authoring library/toolkit. Its upstream README on `main` describes 244 code-authored effects across 21 categories, including moves, fire, explosions, water, ice, lightning, sci-fi, melee, impacts, projectiles, spawn/death, magic, status, weather, UI, pickups, transitions and critters. The hosted gallery may lag the repository (the currently indexed gallery showed 232); verify the live catalog/revision rather than hardcoding a count.

Each effect is code, not a bitmap: a pure effect computes a frame from time (`draw(p, t, o)`), while a simulated effect owns state (`create(o)` with `update(dt)` and `draw(p)`). The renderer composites a color buffer and an additive-light buffer. Effects support seeded variation, palette ramps, flip, angle, light strength and effect-specific options. Character-aware effects can carry `act` metadata for anticipation/wind-up, release poses, hit-stop, shake, target reaction and recovery. Twelve chained moves demonstrate whole attack choreography.

Use PixelFX when it materially helps author, compare, animate or export pixel-art effects. Do not use it as a substitute for extracting/replacing a game's original assets, reverse engineering combat logic, or proving a visual/gameplay change. It does not automatically convert an effect into a target game's proprietary texture/container format.

### Target compatibility decision
- Browser Canvas/WebGL games using JavaScript/TypeScript may integrate the library directly when its rendering/lifecycle model fits.
- Godot, Unity, GameMaker, Defold, LÖVE, Bevy and other engines may consume exported transparent sprite sheets plus Aseprite-style JSON when their importer supports the format; verify the exact engine/importer and settings.
- Closed games and legacy consoles (including PS1) must be treated as native-format targets. PixelFX's JS modules and JSON metadata are not directly executable/importable there. Use rendered PNG frames as source artwork/reference, then reverse-engineer and convert to the target's native texture, palette, compression, animation and indexing structures. For PS1 specifically, establish TIM/CLUT or other actual format evidence from the target image before selecting a converter; do not assume every game asset is TIM or uncompressed.
- If the effect must follow a moving target, use runtime parameters, or react dynamically and the target cannot run JS, port the needed behavior only when requirements justify it. Compare the native port against PixelFX reference renders; otherwise prefer pre-rendered frames.

### Reusable authoring and evaluation loop
1. Identify the target requirement and consumer constraints first: effect role, art direction, native resolution, frame rate/timing, palette, transparency, pivot, layering, loop/one-shot behavior and export format.
2. Search the catalog with `node tools/list.mjs <terms>` and inspect the closest two or three source effects. Prefer adapting an existing effect's palette, seed, flip, angle or declared options over writing a duplicate.
3. Render candidate contact sheets with `node tools/render.mjs <id> --zoom 3`; use `--all` to inspect all frames and `--gif`/`--mp4` for motion. Contact sheets help compare shapes but do not replace full-motion review.
4. For a genuinely new effect, read `docs/AUTHORING.md`, state the design in one line (shape, motion, palette, timing), draft alternatives when art direction is open, and iterate by rendering, visually inspecting and fixing the worst defect. The upstream skill recommends at least three render/inspect/refine rounds; use more for a showpiece.
5. For character attacks, add/use act choreography and inspect consecutive 12-fps steps with `node tools/act.mjs <id>` or MP4. Align hit timing to the effect's actual event, not an eyeballed timestamp.
6. Run `node tools/check.mjs <id>` and repair errors/warnings relevant to the requirement. The checker covers metadata, drawing spills, clean one-shot endings, loop seams, deterministic output, frame cost and act consistency; it is not an engine importer or gameplay test.
7. Export with `node tools/render.mjs <id> --sheet` (or a category) to produce a transparent PNG sprite sheet and JSON frame metadata. Preserve fps, frame rectangles, loop, pivot/origin and per-frame durations. Inspect the actual exported files, not only the preview.
8. Integrate using the target's native importer/converter, then verify in the real consumer at native scale and on relevant backgrounds. Test positive, negative and boundary cases: one-shot completion, loop seam, palette extremes, transparency, animation timing, orientation, layering, clipping and memory/VRAM constraints.

### Pixel-art quality criteria
- Clear silhouette and focal point at 1x/native resolution; avoid speckle noise and flat saturated fills.
- Use crisp pixel rims, trails, sparks and stepped color ramps; reserve additive light for glow and use true translucency for smoke/vapour.
- Give particles distinct size, velocity, delay and lifetime; use fast attack and readable decay.
- Stage effects in anticipation/charge, release/impact, spread, hold and decay; use a brief bright hero frame and hit-stop only when the mechanic calls for it.
- Separate background/foreground layers; floor rings and depth cues must read correctly around characters.
- Loops must be seamless; one-shots must end empty; random variation must be seeded/deterministic; effects must fit their declared canvas and stay within performance budget.
- Judge at the target's real resolution and contrast conditions, not only enlarged previews.

### API and implementation mental model
- `createFrame`, `clearFrame`, `createFx` and `composite` support the library's frame lifecycle; `fx.update(dt)` advances state and `fx.draw(frame, "back"|"front")` places effect layers around the game's character draw.
- Pure effects are time-addressable and naturally repeatable; simulated effects step particles/debris/lights at a fixed internal rate. Do not assume the two models have identical update semantics.
- `palette` is a dark-to-bright ramp; `seed` controls repeatable variation; `flip`, `angle` and `light` are shared placement/render controls. Read `meta.options` for effect-specific controls.
- `act` is timing/choreography data, not the game's combat system. Translate its wind-up, hit and recovery into the target's own animation/state machine; do not copy its dummy skeleton into a game that has its own character rig.
- Sprite-sheet JSON is metadata for supported importers. Validate the target's frame ordering, duration interpretation, pivot and filtering rather than assuming metadata is honored.

### Licensing and provenance
The PixelFX repository states MIT for code/effects, but explicitly excludes its bundled Patch Pixel font from that license. Its effects also contain adaptations from other MIT sources (including Sprite Fusion/Hollow Crown); inspect `LICENSE` and `NOTICE.md` and preserve required notices/attribution for any redistributed adapted code. Do not copy a specific game's proprietary sprite, character, logo or extracted commercial media into generated examples. Record the exact upstream commit/revision and any modifications when adopting it.

### Failure patterns to prevent
- Treating the library's current effect count or gallery count as immutable; repository and deployed gallery can be out of sync.
- Assuming an exported PNG/JSON sheet is already compatible with a closed game or PS1; target-native conversion and runtime evidence are separate requirements.
- Judging only a contact sheet and missing bad motion, frame pops, seams or hit timing; inspect full animation and act strips.
- Treating `tools/check.mjs` PASS as game acceptance; it checks PixelFX authoring invariants, not the game engine/importer.
- Using stock dummy-body effects unchanged with a custom character; regenerate/adapt actor-bound effects or consume timing metadata with the game's own animation.
- Ignoring target palette, alpha, blend, compression, pivot, VRAM, texture page, frame duration or draw-order limits.
- Reusing an effect ID/source or offset across different games without verifying target-specific provenance.

## Shared evidence rules
- Distinguish observed facts, assumptions, inferences and proposals. Generic model knowledge creates hypotheses, not project facts or source definitions.
- Verify source/runtime identity before claiming a tool, test, review, write, deployment or acceptance.
- An absent/empty result requires checking query, scope, pagination, permissions and parser before concluding absence.
- A plan or test added is not a passing check. Preserve failures and counterexamples.
- Use the canonical statuses and handoff schema in `skills/workflow-contract/SKILL.md`; do not define a competing report format.
