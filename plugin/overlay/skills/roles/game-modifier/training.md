# Game Modifier — Specialist Training Curriculum

## Training contract
Train reverse engineering as disciplined hypothesis reconstruction, not offset guessing. Start with synthetic/homebrew fixtures and public documentation; use commercial game data only when the owner supplies/authorizes it, and keep raw images, BIOS and proprietary assets in authorized private storage. A lab or AI-assisted patch is not independent mastery.

## Module 1 — Target identity and evidence hygiene
- Learn platform/region/revision, disc layout, executable discovery, hashes, baseline, permissions and private-data handling.
- Lab: inventory a synthetic PS1 disc tree; identify SYSTEM.CNF/executable and produce a sanitized manifest.
- Counterexamples: wrong region, revision mismatch, stale candidate, file path mistaken for runtime identity.
- Evidence: reproducible target identity record with hashes and no commercial bytes in public artifacts.

## Module 2 — Binary and CPU mental model
- Learn MIPS R3000A basics, instruction decoding, registers, stack/calling conventions, branches, delay slots, memory map and file/virtual/runtime address translation.
- Lab: analyze a small synthetic MIPS executable in Ghidra or another verified disassembler; map one function and its callers.
- Counterexamples: wrong load base, branch-delay misunderstanding, sign/zero extension, pointer vs integer, file offset vs virtual address.
- Evidence: source-backed disassembly notes, control-flow graph and repeatable address calculations.

## Module 3 — Static and dynamic reverse engineering
- Learn strings/symbols, xrefs, function boundaries, data/code distinction, watchpoints, breakpoints, memory snapshots, traces and state-transition observation.
- Lab: trace a synthetic menu selection value into a gameplay initialization consumer using debugger observations.
- Counterexamples: dead code, misleading string reference, multiple call paths, stale memory value, event order.
- Evidence: call/dataflow map that distinguishes observed edges from hypotheses.

## Module 4 — Data structures and asset formats
- Learn containers/archives, compression, pointers, alignment, checksums, texture/palette/CLUT, animation timing, audio/video and lookup tables.
- Lab: inspect a synthetic archive and replace a generated image in a documented sample format; preserve offsets and integrity.
- Counterexamples: same-looking asset with different palette, compressed member, pointer table, duplicate ID, padding/alignment mismatch.
- Evidence: parser/export/import roundtrip plus native-format validation. Never assume every PS1 image is TIM or uncompressed.

## Module 5 — Choose the modification method
- Compare data-table edit, asset replacement, script/adapter, binary/assembly patch and source reconstruction.
- Lab: implement the same synthetic behavior change via data edit and code patch; justify the selected route against risk and acceptance.
- Counterexamples: patch overlaps live code/table; replacement asset is never consumed; source tests pass while target loader rejects the file.
- Evidence: method decision, preconditions, consumer path and rejected alternatives.

## Module 6 — Reversible patch engineering
- Learn patch preconditions, expected bytes, exact source SHA, patch application, rollback, code cave/branch safety, register/stack preservation and target-specific mappings.
- Lab: create an idempotent patcher for a synthetic binary with positive, wrong-version, already-patched and rollback cases.
- Counterexamples: partial write, wrong executable, offset drift, overlapping patch, second application.
- Evidence: hashes before/after, patch receipt, rollback and negative tests.

## Module 7 — Real consumer and gameplay verification
- Learn emulator/runtime identity, input paths, rendering/asset consumption, save state pitfalls, frame timing and hardware differences.
- Lab: on an authorized target, verify one bounded change in the actual game consumer; keep emulator, hardware and owner acceptance separate.
- Counterexamples: preview differs from game; asset loads only on another stage; emulator cache hides replacement; behavior differs on hardware.
- Evidence: exact game/build/emulator/device, reproducible steps, actual gameplay capture/observation and limitations.

## Module 8 — Candidate delivery and acceptance
- Build a reproducible private candidate; inspect integrity/format, SHA-256, provenance, toolchain, rollback and owner-facing instructions.
- Acceptance: exact target identified; change traceable to requirement; source checks and candidate integrity pass; actual gameplay gate recorded; no private commercial bytes exposed; owner approval remains explicit.

## Evaluation rubric
Score each dimension 0–4: (0) absent/incorrect; (1) explains with heavy prompting; (2) completes with guidance/AI assistance; (3) independently reproduces the known target workflow; (4) transfers to a new binary/data format and justifies a different method from evidence.

Dimensions: target identity; binary/CPU analysis; static/dynamic trace; asset/data format; method selection; patch safety/rollback; consumer verification; evidence/provenance/privacy.

A role readiness claim requires level 3 in relevant dimensions and level-4 transfer for the claimed specialization. Synthetic fixtures prove only the modeled behavior; they do not prove parity with a commercial game. Never claim gameplay acceptance without the actual game consumer.


## Reference shelf
- [NSA Ghidra Software Reverse Engineering](https://www.nsa.gov/serve-from-netstorage/ghidra/index.html) — disassembly, decompilation, graphing, scripting and supported processor formats.
- [RetroReversing PS1 notes](https://github.com/RetroReversing/retroReversing/blob/master/categories/consoles/PS1.md) — community reference for PS1 executable discovery, MIPS analysis and tools; validate each claim against the actual target.
- [PSX Development Links Center](https://ps1.consoledev.net/) — index of PS1 documentation, emulators, toolchains, reverse-engineering and programming resources.
- [PixelFX source](https://github.com/patch-gg/pixelfx) — VFX authoring source; preserve its license/NOTICE and verify target-native integration separately.
- [PSXRecompStudio legal and asset policy](https://mao2009.github.io/PSXRecompStudio/legal.html) — reference for keeping commercial images, BIOS and proprietary game data out of public repositories/artifacts.

These are reference sources, not evidence that a specific game's executable, format, memory map or runtime behaves the same way. Always bind analysis to exact target/version and direct observation.
