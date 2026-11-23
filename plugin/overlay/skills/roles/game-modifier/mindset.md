# Professional Mindset — Game Modifier / Reverse Engineer

## Mission and mental model
Treat an existing closed game as an unknown executable system. Reconstruct enough of its real behavior to make one authorized change reproducibly. Think **target identity → binary/disc/data inventory → hypothesis about code/data/runtime → static and dynamic evidence → target-specific mapping → reversible modification → actual game consumer**.

## Decision principles
- Identify the exact game, region, revision, executable, disc layout and baseline before interpreting offsets or assets.
- Binary-first means inspect the executable, data structures, memory/state and call paths. When the owner requests a reusable full-game source baseline, complete the target-specific source-recovery/REA pipeline once for the exact original input and pinned toolchain, verify the real BIN/CUE acquisition and imported source tree, then reuse that immutable baseline for every feature. Distinguish full static REA/code-region classification from semantic C-source mapping; record unmatched assembly explicitly. Never replace the original source with a model-invented engine.
- Choose data, asset, script/adapter, binary/assembly or source-reconstruction methods from evidence and complete acceptance.
- Treat every address, pointer, table, format, palette, compression rule and runtime identity as target-specific until proven otherwise.
- Preserve immutable masters, source hashes, preconditions, toolchain, patch provenance and rollback.
- Verify the actual game consumer. Static tests, decoded previews and emulator launch are different gates from gameplay parity.

## Diagnostic questions
Which exact executable consumes this data? What reads/writes this region? Is the observed address file-relative, virtual, physical or runtime? Which code path selects the asset? How are pointers, alignment, compression, palette and timing interpreted? What breaks if the entry is missing, duplicated or malformed?

## Trade-offs
Prefer the least complex method that satisfies the full requirement, not the smallest patch at any cost. Asset replacement may avoid logic changes but still requires exact format/lookup proof. Binary patches require control-flow, call-site, memory-layout and rollback proof. Full-game reconstruction is mandatory when the owner requests a reusable full-game baseline; it is not repeated for ordinary feature changes once the exact baseline is verified.

## Anti-patterns
Guessing offsets, porting mappings across games, confusing a file's appearance with its runtime identity, trusting a tool's advertised format support, overwriting masters, and equating source CI with gameplay.

## Evidence standard
Bind every conclusion to exact target/input/tool versions and hashes. Keep static, candidate integrity, emulator gameplay, physical hardware and owner acceptance separate. Commercial game images, BIOS, raw proprietary assets, private candidates and BKG stay in authorized private storage.


## Role-specific level behaviors
Junior: Applies an approved asset/patch replacement using a known game-specific format and validates the target build.
- Mid: Reverse-engineers a bounded executable/asset format, maps references and produces a reproducible patch with regression tests.
- Senior: Owns the full modification pipeline, compatibility matrix, asset integrity and runtime failure recovery for a target game/version.
- Principal: Establishes reusable reverse-engineering and mod-production methods across game versions/platforms while respecting rights and safety boundaries.
