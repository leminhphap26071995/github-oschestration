# Game Art Director — specialist knowledge

## Production model
A game visual deliverable may contain: visual bible, layout master, character/prop sheets, sprite/animation sheets, environment layers, VFX, UI/HUD, font and typography system, asset manifest, integration mapping, target-native conversions and visual QA evidence. Derive only the outputs required by the owner-visible outcome and actual consumer.

## Reference semantics
A reference must have an explicit role: layout master, content/identity reference, style reference, quality benchmark or negative reference. Each role grants influence over different properties. A layout master controls geometry/order/hierarchy; a style reference controls rendering treatment only; a quality benchmark controls finish only. Do not let a quality image replace source identity or layout.

## Generation versus composition
Generative image models are useful for concept exploration, subject illustration, style exploration and local edits. They are probabilistic and may vary exact geometry, repeated subjects, text, counts and small details. When these are acceptance-critical, separate image assets from deterministic UI/layout composition. Typeset exact text with a font/layout engine. Inspect exported metadata and pixels.

## Character identity matrix
For each distinct character/variant record: canonical label, primary source pointer, silhouette, body/anatomy, head/helmet, armor regions, palette, signature equipment, hair/appendages, pose constraints, prohibited substitutions and uncertainty. Keep the identity matrix concise enough to use per asset. Do not mix details from adjacent variants or other titles.

## Visual QA
Measure geometry and content independently from aesthetics. Check dimensions, aspect ratio, counts, ordering, exact labels, alignment, crops, overlaps, repeated-portrait consistency, silhouette, color blocking, signature details, sharpness and intended-scale readability. Use image comparison or overlays when geometry is locked. OCR is a check, not the sole authority for stylized text.

## Evidence and provenance
Record source URL/revision or supplied image identity, capture context when known, prompt version, model/provider when exposed, generation/edit operation, output file identity/hash, dimensions and QA result. Distinguish owner-supplied facts, primary-source verified facts, artist interpretation and unknowns.

## Closed-game integration boundary
A rendered image/mockup does not prove it can be inserted into a game's proprietary format or consumed at runtime. For an existing closed game, the Game Modifier must establish the target's actual asset container, compression, palette/alpha, dimensions, lookup/indexing, runtime draw path and consumer behavior. Keep visual approval, format conversion, candidate integrity and emulator/gameplay acceptance separate.


## Source anchors and version pins (checked 2026-11-23)
- [Unity — 2D game creation workflow](https://docs.unity.com/en-us/engine/6000.0/manual/unity2d/2d-game-development/2d-game-creation-wokflow) — Official engine art/game workflow; current 2026-11-23.
- [Unity — Import sprite or spritesheet](https://docs.unity.com/en-us/engine/6000.7/manual/unity2d/sprite/import-images-sprites) — Official asset import settings; current 2026-11-23.
- [Unreal Engine — Working with Assets](https://dev.epicgames.com/documentation/unreal-engine/working-with-assets-in-unreal-engine) — Official asset pipeline documentation; UE 5.8.

These sources anchor the listed domain methods. Confirm the target engine, model, runtime and release before applying them; do not generalize a version-specific procedure to another game or platform.
