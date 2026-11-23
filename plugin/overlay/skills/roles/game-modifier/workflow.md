# Game Modifier — role-specific workflow

Apply `skills/always-on-guard/SKILL.md` first and obey the shared status/handoff schema in `skills/workflow-contract/SKILL.md`.

1. Recover game/version, executable/disc layout, live target repo/ref/HEAD, current patch/mapping/candidate, task capsule and first unmet gate.
2. Investigate binary/code/control flow, memory/state, tables/scripts/formats/assets, callers and runtime behavior needed to explain the complete requested change. When the owner requests a full-game reconstructed source baseline, full-game decompilation/reconstruction is mandatory; a feature-only trace or partial index is not a substitute.
3. Select evidence-supported data/asset/script/assembly/source-reconstruction methods that together satisfy the complete owner-approved scope. Optimize unnecessary complexity without dropping required behavior, coverage, mappings or acceptance evidence. Preserve original master, preconditions, hashes, toolchain and rollback.
4. Before claiming an input/build blocker, inspect relevant Issue history, transfer/release receipts, cache, staged inputs, task capsule and live HEAD; distinguish method failure from missing dependency and continue independent work.
5. Run source/regression checks, candidate integrity and consumer gameplay separately; Android DuckStation, GD10 hardware and owner/BKG approval are independent gates when required.
6. Read back material writes and bind results to the exact source/ref/SHA, record ID, model/data/build version or runtime observation relevant to this role.
7. Reconcile every original acceptance criterion. Clearly list open/unknown/blocked/failed nodes and continue all runnable authorized AI-owned work; never claim the overall request complete while an in-scope item remains unfinished.

## PixelFX workflow for VFX and sprite-animation work

When a requirement involves pixel-art VFX, hit effects, spell effects, particles, pickups, UI animation or sprite-sheet authoring, consult the PixelFX specialist guidance in `knowledge.md`. Treat PixelFX as an authoring/prototyping tool, not as a universal game-mod runtime or a substitute for target-specific reverse engineering.

Before choosing an output, inspect the target game's actual asset format, palette/transparency rules, dimensions, animation timing, layering/blending, storage/compression, pointers or lookup tables, and runtime draw path. For JavaScript browser/WebGL games, direct library integration may be appropriate. For engines that consume sprite sheets, render transparent PNG sheets plus frame JSON and import them using the engine's supported path. For closed legacy consoles such as PS1, assume neither JavaScript execution nor Aseprite JSON ingestion: use PixelFX to author/reference frames, then perform a separately evidenced conversion/insertion into the game's native format and verify it in the real game.

Render and inspect the exported frames at the target's native display scale. Validate import, palette/CLUT mapping, transparency, ordering, frame duration, pivot/origin, VRAM/texture constraints and actual gameplay appearance. `tools/check.mjs` is a PixelFX source-quality check only; it does not prove target-game compatibility or gameplay acceptance.
