#!/usr/bin/env python3
"""Validate the UPW plugin release overlay and its complete registered role payload."""
import argparse
import json
from pathlib import Path, PurePosixPath

REQUIRED = [
    "plugin.json",
    ".codex-plugin/plugin.json",
    ".agent-plugin/plugin.json",
    "skills/project-ticket-context-isolation/SKILL.md",
    "skills/github-actions-run-lifecycle/SKILL.md",
    "skills/context-recovery/SKILL.md",
    "skills/project-authority-router/SKILL.md",
    "skills/session-continuity/SKILL.md",
    "skills/always-on-guard/SKILL.md",
    "skills/ai-manager/SKILL.md",
    "skills/chat-mode-closed-loop/SKILL.md",
    "skills/concise-human-communication/SKILL.md",
    "skills/live-progress-reconciliation/SKILL.md",
    "skills/goal-convergent-min-context-loop/SKILL.md",
    "references/PROJECT-INTRODUCTION-TEMPLATE.md",
    "skills/execution-preflight/SKILL.md",
    "skills/cicd-full-flow/SKILL.md",
    "skills/workflow-contract/SKILL.md",
    "references/host-execution-and-quota-contract.md",
    "references/role-registry.json",
    "references/domain-routing.json",
    "references/professional-capability-catalog.json",
    "references/role-registry.extensions.json",
    "skills/professional-capability-discovery/SKILL.md",
    "skills/ai-tooling-lifecycle/SKILL.md",
]

ROLE_ARTIFACTS = ["SKILL.md", "mindset.md", "knowledge.md", "workflow.md"]


def _read_json(root: Path, relative: str, errors: list[str]):
    try:
        return json.loads((root / relative).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"INVALID_JSON:{relative}:{exc}")
        return None


def _safe_file(root: Path, relative: str) -> bool:
    if not isinstance(relative, str) or not relative:
        return False
    path = PurePosixPath(relative)
    if path.is_absolute() or any(part in ("", ".", "..") for part in path.parts):
        return False
    return root.joinpath(*path.parts).is_file()


def _validate_role_registry(root: Path, registry: dict, errors: list[str], label: str):
    required = registry.get("required_files")
    if not isinstance(required, list) or set(required) != set(ROLE_ARTIFACTS) or len(required) != 4:
        errors.append(f"ROLE_ARTIFACT_CONTRACT_INVALID:{label}")
        return set()
    roles = registry.get("roles")
    if not isinstance(roles, list) or not roles:
        errors.append(f"ROLE_REGISTRY_EMPTY:{label}")
        return set()
    seen = set()
    for role in roles:
        role_id = (role.get("role") or role.get("role_id")) if isinstance(role, dict) else None
        bundle = role.get("bundle") if isinstance(role, dict) else None
        if not isinstance(role_id, str) or not role_id:
            errors.append(f"ROLE_ID_MISSING:{label}")
            continue
        if role_id in seen:
            errors.append(f"DUPLICATE_ROLE_ID:{label}:{role_id}")
        seen.add(role_id)
        if not isinstance(bundle, list) or len(bundle) != 4:
            errors.append(f"ROLE_BUNDLE_SHAPE_INVALID:{label}:{role_id}")
            continue
        if {PurePosixPath(item).name for item in bundle if isinstance(item, str)} != set(ROLE_ARTIFACTS):
            errors.append(f"ROLE_BUNDLE_ARTIFACT_SET_INVALID:{label}:{role_id}")
        for relative in bundle:
            if not _safe_file(root, relative):
                errors.append(f"MISSING_ROLE_ARTIFACT:{role_id}:{relative}")
    return seen


def _validate_extension_registry(root: Path, registry: dict, errors: list[str]):
    if registry.get("extends") != "references/role-registry.json":
        errors.append("ROLE_EXTENSION_PARENT_MISMATCH")
    required = registry.get("required_artifacts")
    if not isinstance(required, list) or set(required) != set(ROLE_ARTIFACTS) or len(required) != 4:
        errors.append("ROLE_EXTENSION_ARTIFACT_CONTRACT_INVALID")
        return set()
    roles = registry.get("roles")
    if not isinstance(roles, list) or not roles:
        errors.append("ROLE_EXTENSION_REGISTRY_EMPTY")
        return set()
    seen = set()
    for role in roles:
        role_id = role.get("role_id") if isinstance(role, dict) else None
        bundle = role.get("bundle") if isinstance(role, dict) else None
        if not isinstance(role_id, str) or not role_id:
            errors.append("ROLE_EXTENSION_ID_MISSING")
            continue
        if role_id in seen:
            errors.append(f"DUPLICATE_ROLE_EXTENSION_ID:{role_id}")
        seen.add(role_id)
        if not isinstance(bundle, str) or not bundle:
            errors.append(f"ROLE_EXTENSION_BUNDLE_PATH_INVALID:{role_id}")
            continue
        for artifact in required:
            relative = f"{bundle.rstrip('/')}/{artifact}"
            if not _safe_file(root, relative):
                errors.append(f"MISSING_ROLE_ARTIFACT:{role_id}:{relative}")
    return seen


def validate(root: Path):
    errors = [f"MISSING:{path}" for path in REQUIRED if not (root / path).is_file()]
    if errors:
        return errors

    standard = _read_json(root, "plugin.json", errors)
    host = _read_json(root, ".codex-plugin/plugin.json", errors)
    agent = _read_json(root, ".agent-plugin/plugin.json", errors)
    role_registry = _read_json(root, "references/role-registry.json", errors)
    domain_routing = _read_json(root, "references/domain-routing.json", errors)
    capability_catalog = _read_json(root, "references/professional-capability-catalog.json", errors)
    extension_registry = _read_json(root, "references/role-registry.extensions.json", errors)
    if any(value is None for value in (standard, host, agent, role_registry, domain_routing, capability_catalog, extension_registry)):
        return errors

    if standard.get("version") != host.get("version") or standard.get("version") != agent.get("version"):
        errors.append("MANIFEST_VERSION_MISMATCH")
    if agent.get("name") != standard.get("name"):
        errors.append("AGENT_MANIFEST_NAME_MISMATCH")
    if agent.get("skills") != "./skills":
        errors.append("AGENT_MANIFEST_SKILLS_PATH_MISMATCH")
    openai = standard.get("extensions", {}).get("com.openai", {})
    onboarding = openai.get("onboardingSkill")
    if not isinstance(onboarding, str) or not onboarding.startswith("./"):
        errors.append("ROOT_ONBOARDING_SKILL_PATH_MISSING_OR_INVALID")
    else:
        relative = onboarding[2:]
        if not relative.endswith("/SKILL.md") or not _safe_file(root, relative):
            errors.append(f"ROOT_ONBOARDING_SKILL_NOT_PACKAGED:{onboarding}")
    if "UPW" not in standard.get("keywords", []):
        errors.append("UPW_KEYWORD_MISSING")
    interface = host.get("interface", {})
    if interface.get("displayName") != "UPW":
        errors.append("DISPLAY_NAME_NOT_UPW")
    description = interface.get("longDescription", "")
    if not isinstance(description, str) or "requirements-first workflow" not in description.lower():
        errors.append("FULL_NAME_OR_WORKFLOW_DESCRIPTION_MISSING")
    root_prompt = openai.get("interface", {}).get("defaultPrompt")
    host_prompt = interface.get("defaultPrompt")
    if not isinstance(root_prompt, list) or not root_prompt or root_prompt != host_prompt:
        errors.append("DEFAULT_PROMPT_MISSING_OR_MANIFESTS_OUT_OF_SYNC")
    if not any("OWNER-FACING REPORTING:" in item and "do not send progress narration" in item.lower() for item in root_prompt or []):
        errors.append("COMPLETION_ONLY_OWNER_REPORTING_PROMPT_MISSING")

    checks = {
        "skills/project-ticket-context-isolation/SKILL.md": [
            "NEVER_LATEST_TIMESTAMP", "Game Mod", "VS Code Extension",
            "Career/Interview", "ticket checkpoint"
        ],
        "skills/github-actions-run-lifecycle/SKILL.md": [
            "RUNNER_WARMUP_PENDING", "JOB_STARTUP_PENDING", "Retry-After",
            "QUOTA_EXHAUSTED", "OBSERVATION_WINDOW_EXPIRED"
        ],
        "skills/cicd-full-flow/SKILL.md": [
            "github-actions-run-lifecycle", "LOG_PUBLICATION_PENDING", "UNKNOWN"
        ],
        "skills/goal-convergent-min-context-loop/SKILL.md": [
            "execution progress is internal", "do not emit live writingblocks",
            "one final writingblock", "never as a live feed"
        ],
        "skills/chat-mode-closed-loop/SKILL.md": [
            "do not send progress narration", "continuous requirements-led loop in the current session",
            "one final artifact only after execution"
        ],
        "skills/professional-capability-discovery/SKILL.md": [
            "complete four-artifact bundle",
            "Missing specialist artifacts are a capability gap"
        ],
        "skills/ai-tooling-lifecycle/SKILL.md": [
            "references/role-registry.extensions.json", "ai-native-tooling-engineer",
            "mcp-integration-engineer", "vscode-extension-platform-engineer",
            "omniroute-model-routing-engineer"
        ],
    }
    for relative, tokens in checks.items():
        content = (root / relative).read_text(encoding="utf-8").lower()
        for token in tokens:
            if token.lower() not in content:
                errors.append(f"TOKEN_MISSING:{relative}:{token}")

    base_roles = _validate_role_registry(root, role_registry, errors, "base")
    extension_roles = _validate_extension_registry(root, extension_registry, errors)
    if "ai-native-tooling-engineer" not in base_roles or "ai-native-tooling-engineer" not in extension_roles:
        errors.append("AI_NATIVE_TOOLING_ENGINEER_NOT_REGISTERED_IN_BOTH_REGISTRIES")

    if not isinstance(domain_routing.get("rules"), list) or not domain_routing["rules"]:
        errors.append("DOMAIN_ROUTING_RULES_MISSING")
    if not isinstance(domain_routing.get("domains"), dict) or not domain_routing["domains"]:
        errors.append("DOMAIN_ROUTING_DOMAINS_MISSING")
    if capability_catalog.get("discovery_contract") != "skills/professional-capability-discovery/SKILL.md":
        errors.append("CAPABILITY_DISCOVERY_CONTRACT_MISMATCH")
    if capability_catalog.get("generic_role_fallback") != "PROHIBITED":
        errors.append("GENERIC_ROLE_FALLBACK_NOT_PROHIBITED")

    return errors


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    errors = validate(args.root)
    if errors:
        print("\n".join(errors))
        raise SystemExit(1)
    version = json.loads((args.root / "plugin.json").read_text(encoding="utf-8"))["version"]
    print(f"OVERLAY_VALID version={version}")


if __name__ == "__main__":
    main()
