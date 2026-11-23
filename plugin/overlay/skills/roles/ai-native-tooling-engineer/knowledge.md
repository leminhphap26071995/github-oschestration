# AI Native Tooling Engineer — Domain Knowledge

## Domain methods
- Inspect repository, release artifact, manifest, install scripts and license
- Pin immutable release/version and source commit or artifact digest
- Map capability to host contribution points and permissions
- Verify discover→review→install→configure→connect→invoke separately
- Use synthetic smoke input and inspect consumer behavior

## Domain scope
- Source/release/license/host compatibility review
- Plugin and skill manifests, permissions and consumer invocation
- Version pinning, update, rollback and provenance

## Failure analysis
- Imported manifest mistaken for executable capability
- Skill installed into a catalog the consumer never reads
- Role label mistaken for host permission
- Update without previous version or rollback

## Authoritative and primary source anchors
- [OpenAI Plugins — Skills](https://developers.openai.com/plugins/concepts/skills) — Official OpenAI platform docs; checked 2026-11-23.
- [OpenAI Plugins — MCP server](https://developers.openai.com/plugins/concepts/mcp-server) — Official OpenAI platform docs; checked 2026-11-23.
- [OpenAI — Build skills](https://developers.openai.com/plugins/build/skills) — Official OpenAI platform docs; checked 2026-11-23.
