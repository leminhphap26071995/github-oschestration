# Plugin Capability Map — AM Integration Boundary

## Why this map exists
The connected Plugin Creator inventory exposed 11 owner-created plugins. AM reuses their reusable orchestration patterns while avoiding a hard dependency on specialized or experimental integrations. This is an inventory of the accessible owner-created plugin set, not a claim that every installed ChatGPT/third-party plugin in every workspace was enumerated.

| Existing plugin | Reusable strength | AM integration rule |
|---|---|---|
| `ai-mod-game` | Short-command activation, live repo recovery, evidence-first E2E, artifact integrity and durable checkpoints | Use universal recovery/execution loop; load game-specific binary/storage gates only for Game Mod. |
| `chatgpt-workflow` | Professional roles, PM/BA/lead/QA accountability, graph-based goal convergence, adaptive mentoring, recovery and handoff | Route to relevant role mindset and require real dispatch/evidence; role labels alone are not worker execution. |
| `career-training` | Adaptive core, interview/career routing, mentor, quiz, flashcard, practice and plan modes | Load only for relevant goals; use authentic authorized evidence and observed attempts. |
| `lyon-ai-orchestration` | Goal graph, proactive self-critique, CI diagnosis, bounded repair and checkpoints | Reuse goal-to-evidence convergence; retry only with a new hypothesis, test or evidence. |
| `github-pat-admin` | GitHub repository, Actions, artifacts and PR operations with explicit permission boundaries | Use connected GitHub tools only for granted scopes; verify exact SHA and actual run/job evidence. |
| `lyon-pro-multi-chat` | Host/runtime capability probing for multi-chat | Optional adapter; probe actual host support, never promise absent child-chat execution. |
| `lyon-pro-chat-orchestration` | Native child-session handoff pattern | Optional host-specific adapter; not part of the portable core contract. |
| `google-community-private` v0.1.5 | Workflow over existing authorized Google Drive connection | Use only if native Drive app is connected and authorized; verify read/write results. |
| `google-community-private` v0.4.2 | Google account/OAuth setup exploration | Treat linking as unverified until host registration and live authentication are observed. |
| `google-community-private-tc002` | Google-hosted Drive MCP integration trial | Experimental optional adapter; do not assume connection/authentication works. |
| `google-community-private-web-mcp` | MCP-first Google Workspace search proof | Experimental optional adapter; require verified connection and live query evidence. |

## Unified AM capability layers
1. **Core always-on:** goal discovery, authority routing, acceptance graph, plan/execute/verify/repair, evidence states, security and checkpoint/recovery.
2. **Domain pack:** software/operations, research/writing, career/interview, learning/training, business/planning or user-defined domain.
3. **Tool adapter:** GitHub, Drive, Notion, browser, local execution, provider or multi-chat. Discover actual tools and authorization at runtime.
4. **Runtime proof:** record actual invocation/result and exact revision where applicable. A skill, manifest or connector listing is not proof it executed.

## Non-goals and limits
- Do not bundle OAuth secrets, private CV/JD, learner checkpoints or proprietary project data.
- Do not claim other plugins are installed/invoked/authenticated just because they appear in an inventory.
- Do not pretend experimental OAuth or native multi-chat adapters are connected.
- A plugin cannot edit host Project Instructions directly or keep a model running after session termination without a verified executor.
- The portable GitHub core is vendor-neutral; ChatGPT plugin activation is a host adapter and is not guaranteed in every AI product.
