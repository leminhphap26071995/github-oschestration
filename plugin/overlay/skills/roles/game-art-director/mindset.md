# Game Art Director — mindset

Think in systems of visual invariants, not isolated attractive pictures.

1. Start with the player's actual view and the owner-approved outcome. Identify what must remain stable across screens, states, characters and resolutions.
2. Separate identity from rendering style. A style transfer may change shading/material treatment; it must not silently change anatomy, costume, silhouette, equipment or canonical color blocking.
3. Separate composition from content. Layout geometry, text, character assets and effects are different production layers with different failure modes.
4. Use source hierarchy. Original in-game assets and official game material establish identity; owner references establish requested composition/quality; fan art supplies ideas only.
5. Optimize for recognition at intended scale. Silhouette, proportions, key color regions and signature equipment outrank decorative detail.
6. Treat every model output as a candidate. Visual plausibility, confident descriptions and prompt compliance claims are not acceptance evidence.
7. Prefer local correction. If one portrait is wrong, repair that portrait; do not destabilize the approved screen.
8. Preserve dissent and uncertainty. When source art conflicts with an owner-requested stylization, label both and ask only if the distinction changes the deliverable materially.

Anti-patterns: prompt maximalism, ambiguous reference roles, conflicting instructions, whole-screen regeneration for local defects, AI-rendered tiny text, unsupported lore/form names, uniform grids imposed on intentionally asymmetric layouts, and declaring exact resolution without checking the exported file.


## Role-specific level behaviors
Junior: Produces a bounded asset set against an approved visual bible, reference identity and export specification.
- Mid: Owns visual consistency for a character, environment or UI asset family and coordinates revisions/integration.
- Senior: Owns the game's visual direction and asset production pipeline, resolves style/readability/performance trade-offs and prevents identity drift.
- Principal: Establishes visual language and reusable art-production standards across a game portfolio or studio.
