---
name: professional-capability-discovery
description: Derive the professional disciplines, specialist roles, deliverables and acceptance methods required by any substantive outcome; prevent generic-role substitution and missing workstreams.
---
# Professional Capability Discovery

## Mission
Infer the professional production system required to achieve the user's outcome. The owner should not need to name routine roles, stages or deliverables. A request for a product, remaster, building, clinical study, financial model, campaign, policy or software system implies the domain methods and professional work products needed to deliver it.

This skill is universal and content-neutral. It does not claim to enumerate every profession. It discovers exact specialties from the outcome, current authoritative sources and the selected domain pack.

## Mandatory outcome-to-deliverable method
Before finalizing a WBS or implementation plan for substantive work:
1. Lock user-visible outcome, target, users, constraints, non-goals, quality attributes and acceptance.
2. Infer the lifecycle: discovery, research, design, creation, implementation, integration, operations, validation, release and maintenance. Omit only demonstrably irrelevant stages.
3. Inventory all required deliverables—not just code or documents. Include art/design, domain analysis, models/calculations, data, workflows, compliance, safety, training, integration, tests, release and operating artifacts as applicable.
4. Map each deliverable to inputs, owner, contributors, downstream consumer, dependencies, variants and observable acceptance oracle.
5. Derive professional disciplines and specialist competencies from those deliverables and causal systems. Do not select roles only from keyword matches or the installed role list.
6. Compose cross-domain role families. PM, Product Manager, BA, Tech Lead and generic Architect coordinate work; they do not replace domain specialists who produce the required work.
7. Research current standards, regulator guidance, professional bodies, vendor documentation and mature implementations when methods are consequential or unfamiliar. Preserve source, date, jurisdiction and edition. Generic model knowledge is a hypothesis, not evidence.
8. Select one accountable primary specialist and load its complete four-artifact bundle. Keep supporting roles as compact scope/expertise/reviewer descriptors; load their full bundle and skills only when actually invoked. Use `skills/role-context-loading/SKILL.md` and the project context compiler when available. Missing specialist artifacts are a capability gap, not permission to fall back to a generic role.
9. Verify coverage: every deliverable has an accountable owner, consumer, dependency and acceptance oracle. Missing work is a routing defect.
10. Re-evaluate during execution. New evidence may require new specialists or workstreams; load the exact bundle before dependent work continues.

## Task-scoped specialist profile contract
Create a complete four-artifact bundle:
- SKILL.md: professional identity, mission, scope, responsibilities, decision rights, outputs and boundaries.
- mindset.md: profession-specific mental models, causal reasoning, diagnostic questions, trade-offs, anti-patterns and evidence standards.
- knowledge.md: methods, standards, tools, units, domain invariants, current sources and failure patterns.
- workflow.md: intake-to-delivery steps, collaboration interfaces, verification, escalation and handoff.

Add acceptance.md and capability-evidence.md when the task needs explicit domain or competency gates. Keep one-off profiles in the project workspace; promote a profile into the shared plugin registry only after review establishes reusable method and acceptance.

## Professional quality rules
- A mindset must explain how the profession thinks, not provide generic motivational prose.
- Role knowledge must distinguish law/standard/guidance, established practice, hypothesis and unknown.
- Include jurisdiction and effective date for legal, tax, clinical, financial and regulated methods.
- Distinguish concept/mockup from production asset, model from measured system, draft from approved instrument, and test design from executed evidence.
- Record competency provenance: source-informed method, AI-assisted execution, independently demonstrated capability or unknown. Reading a bundle is not mastery.
- A role label never proves a separate agent invocation or independent review.

## Game/remaster example
A request to replace a game's graphics automatically implies art direction and asset production. Discover the executable/data/asset/runtime structure, then map game features and character states to art deliverables. Typical roles include Game Director, Art Director, Game Mechanics Analyst, Character and Environment Concept Artists, Sprite/Animation Artist, UI/HUD Artist, VFX Artist, Asset Pipeline Engineer, Reverse Engineer, Rendering/Integration Engineer and Visual QA. Typical outputs include visual bible, character sheets, stage/environment concepts, enemy/boss sheets, animation/state maps, HUD/UI, VFX, asset IDs, target dimensions/palettes/alpha metadata, feature-to-asset map, integrated build and visual QA. Do not wait for the owner to spell out routine production work. Ask only about material subjective choices that cannot be inferred safely.

## Cross-industry coverage
Use references/professional-capability-catalog.json as a representative routing index across software/cloud, cybersecurity, data/AI, game/interactive media, creative production, business/operations, finance/accounting, legal/compliance, healthcare/life sciences, science/manufacturing, built environment, marketing/sales/customer, education, public sector, energy/climate and supply chain/logistics. Also load references/professional-capability-catalog.extensions.json when present; merge domain additions rather than replacing the base catalog.

## AI tooling and developer platform outcomes
Requests to install or maintain AI skills, tools, MCP servers, agent plugins, browser automation, VS Code extensions or model gateways imply distinct specialist deliverables. Use the additive capability catalog and role registry extension. Typical routing: AI Native Tooling Engineer for discovery/installation and skill lifecycle; MCP Integration Engineer for transport/auth/initialize/tools/list/call; VS Code Extension Platform Engineer for extension-host contributions, packaging and release; OmniRoute Model Routing Engineer for model/provider discovery, route/fallback and CLI/UI/API verification. Do not substitute a generic AI Engineer or Tech Lead for these specialties.

For these outcomes, acceptance must distinguish discovered, reviewed, installed, configured, connected, invoked and verified states. An imported manifest or package file alone is not a working integration. Installation is Agent-only and host-approved; role/skill context remains available in Chat, Mentor and Plan.

## Completion gate
Do not mark planning complete until the deliverable-to-specialist map has no unexplained coverage gaps. Do not claim delivery complete until each applicable deliverable is produced, integrated and verified at its required consumer boundary.


## CV and candidate assessment
For CV/resume outcomes, do not collapse recruiter screening and technical hiring into Interview Trainer or Tech Lead. Route to Talent Acquisition Specialist for ATS/recruiter screening and chronology, Technical Hiring Manager for role/seniority/ownership assessment, Interview Trainer for candidate preparation, and only the domain engineers needed to validate technical claims. Use the claim-level contract in `references/cv-update-contract.md`; do not rewrite a claim before its provenance and evidence are reconciled.
