#!/usr/bin/env python3
"""Fail-closed validation for the ChatGPT-only UPW plugin overlay."""
import json
from pathlib import Path, PurePosixPath

REQUIRED = [
    "plugin.json",
    "references/role-registry.json",
    "references/role-registry.extensions.json",
    "references/domain-routing.json",
    "references/professional-capability-catalog.json",
    "references/professional-capability-catalog.extensions.json",
    "references/cv-update-contract.md",
    "skills/chatgpt-runtime-onboarding/SKILL.md",
    "skills/cv-update-lifecycle/SKILL.md",
    "skills/professional-capability-discovery/SKILL.md",
    "skills/role-context-loading/SKILL.md",
    "skills/ai-tooling-lifecycle/SKILL.md",
    "skills/project-ticket-context-isolation/SKILL.md",
    "skills/github-actions-run-lifecycle/SKILL.md",
    "skills/context-recovery/SKILL.md",
    "skills/project-authority-router/SKILL.md",
    "skills/session-continuity/SKILL.md",
    "skills/always-on-guard/SKILL.md",
    "skills/ai-manager/SKILL.md",
    "skills/chat-mode-closed-loop/SKILL.md",
    "skills/execution-preflight/SKILL.md",
    "skills/cicd-full-flow/SKILL.md",
    "skills/workflow-contract/SKILL.md",
    "references/host-execution-and-quota-contract.md",
    "references/PROJECT-INTRODUCTION-TEMPLATE.md",
]
ROLE_ARTIFACTS = ("SKILL.md", "mindset.md", "knowledge.md", "workflow.md")

def read_json(path: Path, errors: list[str]):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"INVALID_JSON:{path.name}:{exc}")
        return None

def safe_file(root: Path, relative: str) -> bool:
    if not isinstance(relative, str) or not relative:
        return False
    path = PurePosixPath(relative)
    return not path.is_absolute() and all(p not in ("", ".", "..") for p in path.parts) and root.joinpath(*path.parts).is_file()

def validate(root: Path):
    errors = [f"MISSING:{p}" for p in REQUIRED if not (root / p).is_file()]
    if errors:
        return errors
    meta_path = root.parent / "source-sync.json"
    baseline_path = root.parent / "live-default-prompt.json"
    meta = read_json(meta_path, errors)
    baseline = read_json(baseline_path, errors)
    manifest = read_json(root / "plugin.json", errors)
    base = read_json(root / "references/role-registry.json", errors)
    ext = read_json(root / "references/role-registry.extensions.json", errors)
    routing = read_json(root / "references/domain-routing.json", errors)
    catalog_ext = read_json(root / "references/professional-capability-catalog.extensions.json", errors)
    if any(x is None for x in (meta, baseline, manifest, base, ext, routing, catalog_ext)):
        return errors

    if meta.get("consumer") != "chatgpt":
        errors.append("CONSUMER_MUST_BE_CHATGPT")
    if manifest.get("version") != meta.get("plugin_version") or manifest.get("version") != "0.1.170":
        errors.append("PLUGIN_VERSION_SOURCE_SYNC_MISMATCH")
    openai = manifest.get("extensions", {}).get("com.openai", {})
    onboarding = openai.get("onboardingSkill")
    if onboarding != "./skills/chatgpt-runtime-onboarding/SKILL.md":
        errors.append("CHATGPT_ONBOARDING_PATH_INVALID")
    elif not safe_file(root, onboarding[2:]):
        errors.append("CHATGPT_ONBOARDING_FILE_MISSING")
    prompts = openai.get("interface", {}).get("defaultPrompt")
    if not isinstance(prompts, list) or len(prompts) != meta.get("default_prompt_count"):
        errors.append("DEFAULT_PROMPT_COUNT_MISMATCH")
    if prompts != baseline:
        errors.append("DEFAULT_PROMPT_CHANGED_FROM_LIVE_BASELINE")
    if "UPW" not in manifest.get("keywords", []):
        errors.append("UPW_KEYWORD_MISSING")

    forbidden = [".codex-plugin", ".agent-plugin", ".claude-plugin", "skills/codex-project-bootstrap", "references/codex-skill-mirror.json"]
    for item in forbidden:
        if (root / item).exists():
            errors.append(f"CLI_ONLY_PATH_IN_CHATGPT_OVERLAY:{item}")

    if base.get("required_files") != list(ROLE_ARTIFACTS):
        errors.append("BASE_ROLE_ARTIFACT_CONTRACT_INVALID")
    if ext.get("required_artifacts") != list(ROLE_ARTIFACTS):
        errors.append("EXTENSION_ROLE_ARTIFACT_CONTRACT_INVALID")
    if ext.get("extends") != "references/role-registry.json":
        errors.append("ROLE_EXTENSION_PARENT_MISMATCH")

    role_ids = set()
    base_roles = base.get("roles", [])
    ext_roles = ext.get("roles", [])
    if len(base_roles) != meta.get("base_role_count"):
        errors.append("BASE_ROLE_COUNT_MISMATCH")
    if len(ext_roles) != meta.get("extension_role_count"):
        errors.append("EXTENSION_ROLE_COUNT_MISMATCH")

    for role in base_roles:
        role_id = role.get("role")
        bundle = role.get("bundle")
        if not isinstance(role_id, str) or not isinstance(bundle, list) or len(bundle) != 4:
            errors.append(f"BASE_ROLE_RECORD_INVALID:{role_id}")
            continue
        if role_id in role_ids:
            errors.append(f"DUPLICATE_ROLE_ID:{role_id}")
        role_ids.add(role_id)
        if {PurePosixPath(x).name for x in bundle} != set(ROLE_ARTIFACTS):
            errors.append(f"ROLE_BUNDLE_ARTIFACT_SET_INVALID:{role_id}")
        for rel in bundle:
            if not safe_file(root, rel):
                errors.append(f"MISSING_ROLE_ARTIFACT:{role_id}:{rel}")
            elif (root / rel).stat().st_size < 100:
                errors.append(f"ROLE_ARTIFACT_TOO_SMALL:{role_id}:{rel}")

    for role in ext_roles:
        role_id = role.get("role_id")
        bundle = role.get("bundle")
        if not isinstance(role_id, str) or not isinstance(bundle, str):
            errors.append(f"EXTENSION_ROLE_RECORD_INVALID:{role_id}")
            continue
        if role_id in role_ids:
            errors.append(f"DUPLICATE_ROLE_ID:{role_id}")
        role_ids.add(role_id)
        for artifact in ROLE_ARTIFACTS:
            rel = f"{bundle.rstrip('/')}/{artifact}"
            if not safe_file(root, rel):
                errors.append(f"MISSING_ROLE_ARTIFACT:{role_id}:{rel}")
            elif (root / rel).stat().st_size < 100:
                errors.append(f"ROLE_ARTIFACT_TOO_SMALL:{role_id}:{rel}")

    if len(role_ids) != meta.get("unique_role_count"):
        errors.append("UNIQUE_ROLE_COUNT_MISMATCH")
    if len(role_ids) * 4 != meta.get("required_role_artifacts"):
        errors.append("ROLE_ARTIFACT_TOTAL_MISMATCH")
    for required_role in ("talent-acquisition-specialist", "technical-hiring-manager"):
        if required_role not in role_ids:
            errors.append(f"NEW_CV_ROLE_MISSING:{required_role}")

    for rel, tokens in {
        "talent-acquisition-specialist/SKILL.md": ("ATS", "chronology", "screening"),
        "talent-acquisition-specialist/mindset.md": ("tenure", "project dates", "seniority"),
        "talent-acquisition-specialist/knowledge.md": ("ATS", "credentials", "jurisdiction"),
        "talent-acquisition-specialist/workflow.md": ("owner confirmation", "screening risk"),
    }.items():
        path = root / "skills/roles" / rel
        if not path.is_file():
            continue
        content = path.read_text(encoding="utf-8").lower()
        for token in tokens:
            if token.lower() not in content:
                errors.append(f"TALENT_ACQUISITION_SPECIALTY_TOKEN_MISSING:{rel}:{token}")
    for rel, tokens in {
        "technical-hiring-manager/SKILL.md": ("seniority", "ownership", "technical depth"),
        "technical-hiring-manager/mindset.md": ("ownership ladder", "trade-offs"),
        "technical-hiring-manager/knowledge.md": ("iac", "kubernetes", "devsecops", "sre"),
        "technical-hiring-manager/workflow.md": ("provenance", "ownership", "interview probes"),
    }.items():
        path = root / "skills/roles" / rel
        if not path.is_file():
            continue
        content = path.read_text(encoding="utf-8").lower()
        for token in tokens:
            if token.lower() not in content:
                errors.append(f"TECHNICAL_HIRING_SPECIALTY_TOKEN_MISSING:{rel}:{token}")
    return errors

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    problems = validate(args.root)
    if problems:
        print("\n".join(problems))
        raise SystemExit(1)
    print("UPW_CHATGPT_OVERLAY_VALID: roles=35 artifacts=140 consumer=chatgpt")
