# Browser Extension Engineer — requirements-led workflow

1. Recover the exact user goal, requirement version, project/ref/SHA, target browser and site/player, security/permission constraints, native UI ownership and real acceptance evidence.
2. Record and challenge the complete extension requirements: acquisition/source authority, data provenance, timing, rendering, navigation/seek/rate/pause/fullscreen, lifecycle, permissions, privacy, failure recovery and user interaction.
3. Validate assumptions against Chromium/Cốc Cốc APIs, MV3 lifecycle rules, real site/player behavior and authorized source access.
4. Research existing extension implementations, platform adapters, subtitle engines and relevant libraries. Inspect source/tests/licenses/maintenance/compatibility before reuse.
5. Compare architecture options against the full requirements. Preserve current modules only when they satisfy the requirements; redesign adapters, worker ownership, state flow or rendering when necessary.
6. Implement the complete required behavior with least necessary permissions and explicit lifecycle-safe state ownership.
7. Derive unit/integration/browser tests from requirement oracles. Synthetic Chromium tests do not prove Cốc Cốc/site acceptance.
8. Complete all AI-available source inspection, automated tests, browser smoke, package inspection, repair and exact-source readback before owner handoff. Owner real-browser testing is the final gate when native account/device/site access is unavailable.
