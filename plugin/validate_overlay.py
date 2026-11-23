#!/usr/bin/env python3
"""Fail-closed validation for the ChatGPT-only UPW plugin overlay."""
import json
import hashlib
import re
from pathlib import Path, PurePosixPath

REQUIRED = [
    "plugin.json",
    "references/role-registry.json",
    "references/role-registry.extensions.json",
    "references/domain-routing.json",
    "references/professional-capability-catalog.json",
    "references/professional-capability-catalog.extensions.json",
    "references/cv-update-contract.md",
    "references/professional-level-contract.md",
    "references/role-specialization-index.json",
    "references/role-specialization-quality-gate.md",
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
    if not isinstance(manifest.get("version"), str) or manifest.get("version") != meta.get("plugin_version"):
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
    route = next((x for x in prompts or [] if isinstance(x, str) and x.startswith("PLUGIN UPDATE ROUTING:")), "")
    if "CHATGPT_NATIVE_PRIMARY" not in route or "GITHUB_BUILD_BACKUP" not in route:
        errors.append("PLUGIN_UPDATE_ROUTE_MARKERS_MISSING")
    if "only when a concrete ChatGPT host limitation" not in route:
        errors.append("GITHUB_BACKUP_NOT_FAIL_CLOSED")
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

    specialization = read_json(root / "references/role-specialization-index.json", errors)
    if specialization is None:
        return errors
    indexed = {r.get("role_id") for r in specialization.get("roles", [])}
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

    if indexed != role_ids:
        errors.append("ROLE_SPECIALIZATION_INDEX_REGISTRY_MISMATCH")
    if len(indexed) != 35 or specialization.get("generic_role_fallback") != "PROHIBITED":
        errors.append("ROLE_SPECIALIZATION_INDEX_INVALID")
    for role in specialization.get("roles", []):
        role_id = role.get("role_id", "UNKNOWN")
        bundle = root / role.get("bundle", "")
        mindset = bundle / "mindset.md"
        knowledge = bundle / "knowledge.md"
        workflow = bundle / "workflow.md"
        if mindset.is_file():
            body = mindset.read_text(encoding="utf-8").lower()
            if not all(level in body for level in ("junior", "mid", "senior", "principal")):
                errors.append(f"ROLE_LEVEL_BEHAVIOR_MISSING:{role_id}")
            if "## Decision discipline" in body:errors.append(f"GENERIC_DECISION_DISCIPLINE_DUPLICATED:{role_id}")
        if knowledge.is_file():
            body = knowledge.read_text(encoding="utf-8")
            if len(re.findall(r"https?://", body)) < 2:
                errors.append(f"ROLE_SOURCE_ANCHORS_MISSING:{role_id}")
            if re.search(r"(?i)generic role fallback|general model knowledge is a source", body):
                errors.append(f"GENERIC_ROLE_KNOWLEDGE:{role_id}")
            if "## Source-use boundary" in body:errors.append(f"GENERIC_SOURCE_BOUNDARY_DUPLICATED:{role_id}")
        if workflow.is_file() and workflow.stat().st_size < 250:
            errors.append(f"ROLE_WORKFLOW_TOO_SHALLOW:{role_id}")

    expected = meta.get("source_blob_shas", {})
    actual = {}
    candidates = [root / "plugin.json"]
    for directory in ("references", "skills"):
        candidates.extend(p for p in (root / directory).rglob("*") if p.is_file())
    for path in candidates:
        rel = path.relative_to(root.parent.parent).as_posix()
        if rel.endswith("references/codex-skill-mirror.json"):
            continue
        data = path.read_bytes()
        actual[rel] = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
    if set(actual) != set(expected):
        errors.append("SOURCE_BLOB_PATH_SET_MISMATCH")
    elif actual != expected:
        errors.append("SOURCE_BLOB_SHA_MISMATCH")

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

    cv_route = routing.get("domains", {}).get("cv_professional_review", {})
    selection = cv_route.get("role_selection", {})
    if selection.get("primary_roles") != ["talent-acquisition-specialist"]:
        errors.append("CV_ROUTE_MUST_HAVE_ONE_TALENT_ACQUISITION_PRIMARY")
    if selection.get("required_supporting_roles") != ["technical-hiring-manager"]:
        errors.append("CV_ROUTE_TECHNICAL_HIRING_MANAGER_REQUIRED_SUPPORT_MISSING")
    if "technical-hiring-manager" not in selection.get("required_supporting_role_conditions", {}):
        errors.append("CV_ROUTE_TECHNICAL_SUPPORT_CONDITION_MISSING")
    role_context_path = root / "skills/role-context-loading/SKILL.md"
    if role_context_path.is_file():
        role_context = role_context_path.read_text(encoding="utf-8")
        if "ChatGPT-native role selection is not gated by GitHub Actions" not in role_context:
            errors.append("CHATGPT_NATIVE_ROLE_LOADING_GATE_CONFLICT")
        if "CI-generated execution path" not in role_context:
            errors.append("CI_GENERATED_ROLE_PATH_NOT_DISTINGUISHED")
    else:
        errors.append("ROLE_CONTEXT_LOADING_SKILL_MISSING")
    cv_skill = (root / "skills/cv-update-lifecycle/SKILL.md").read_text(encoding="utf-8")
    if "Talent Acquisition Specialist — accountable primary" not in cv_skill:
        errors.append("CV_LIFECYCLE_PRIMARY_ROLE_NOT_EXPLICIT")
    if "Technical Hiring Manager — required supporting reviewer" not in cv_skill:
        errors.append("CV_LIFECYCLE_TECHNICAL_SUPPORT_NOT_EXPLICIT")
    if "SINGLE_SESSION_CROSSCHECK" not in cv_skill:
        errors.append("CV_LIFECYCLE_CROSSCHECK_LABEL_MISSING")

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
