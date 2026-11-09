#!/usr/bin/env python3
"""Validate the UPW plugin release overlay without external dependencies."""
import argparse
import json
from pathlib import Path

REQUIRED = [
    "plugin.json",
    ".codex-plugin/plugin.json",
    "skills/project-ticket-context-isolation/SKILL.md",
    "skills/github-actions-run-lifecycle/SKILL.md",
    "skills/context-recovery/SKILL.md",
    "skills/project-authority-router/SKILL.md",
    "skills/session-continuity/SKILL.md",
    "skills/always-on-guard/SKILL.md",
    "skills/execution-preflight/SKILL.md",
    "skills/cicd-full-flow/SKILL.md",
    "skills/workflow-contract/SKILL.md",
    "references/host-execution-and-quota-contract.md",
]

def validate(root: Path):
    errors = [f"MISSING:{p}" for p in REQUIRED if not (root / p).is_file()]
    if errors:
        return errors
    try:
        standard = json.loads((root / "plugin.json").read_text(encoding="utf-8"))
        host = json.loads((root / ".codex-plugin/plugin.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"INVALID_MANIFEST:{exc}"]
    if standard.get("version") != host.get("version"):
        errors.append("MANIFEST_VERSION_MISMATCH")
    if "UPW" not in standard.get("keywords", []):
        errors.append("UPW_KEYWORD_MISSING")
    interface = host.get("interface", {})
    if interface.get("displayName") != "UPW":
        errors.append("DISPLAY_NAME_NOT_UPW")
    if "Unified Project Workflow" not in interface.get("longDescription", ""):
        errors.append("FULL_NAME_MISSING_FROM_DESCRIPTION")
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
    }
    for rel, tokens in checks.items():
        content = (root / rel).read_text(encoding="utf-8").lower()
        for token in tokens:
            if token.lower() not in content:
                errors.append(f"TOKEN_MISSING:{rel}:{token}")
    return errors

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    errors = validate(args.root)
    if errors:
        print("\n".join(errors))
        raise SystemExit(1)
    version = json.loads((args.root / "plugin.json").read_text())["version"]
    print(f"OVERLAY_VALID version={version}")
if __name__ == "__main__":
    main()
