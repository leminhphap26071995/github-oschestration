#!/usr/bin/env python3
"""Build a ChatGPT-only Plugin Creator ZIP with root-relative paths."""
import argparse
import json
from pathlib import Path, PurePosixPath
from zipfile import ZIP_DEFLATED, ZipFile

EXCLUDED_PREFIXES = (".codex-plugin/", ".agent-plugin/", ".claude-plugin/", "skills/codex-project-bootstrap/")
EXCLUDED_FILES = { "references/codex-skill-mirror.json", ".upw-overlay-files.json", "README.md" }

def package(root: Path, output: Path):
    root = root.resolve()
    manifest = json.loads((root / "plugin.json").read_text(encoding="utf-8"))
    onboarding = manifest["extensions"]["com.openai"]["onboardingSkill"]
    if onboarding != "./skills/chatgpt-runtime-onboarding/SKILL.md":
        raise SystemExit("CHATGPT_ONBOARDING_PATH_INVALID")
    output.parent.mkdir(parents=True, exist_ok=True)
    written = []
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        candidates = [root / "plugin.json"]
        for directory in ("references", "skills"):
            candidates.extend(p for p in (root / directory).rglob("*") if p.is_file())
        for path in sorted(set(candidates)):
            relative = path.relative_to(root).as_posix()
            if relative in EXCLUDED_FILES or any(relative.startswith(prefix) for prefix in EXCLUDED_PREFIXES):
                continue
            posix = PurePosixPath(relative)
            if posix.is_absolute() or ".." in posix.parts or "\\" in relative:
                raise SystemExit(f"UNSAFE_ARCHIVE_PATH:{relative}")
            if not (relative == "plugin.json" or relative.startswith("references/") or relative.startswith("skills/")):
                raise SystemExit(f"UNEXPECTED_ARCHIVE_PATH:{relative}")
            archive.write(path, relative)
            written.append(relative)
    with ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise SystemExit("ZIP_INTEGRITY_FAILED")
        names = set(archive.namelist())
        required = {"plugin.json", "skills/chatgpt-runtime-onboarding/SKILL.md", "skills/cv-update-lifecycle/SKILL.md"}
        if not required.issubset(names):
            raise SystemExit(f"ZIP_REQUIRED_CONTENT_MISSING:{sorted(required - names)}")
        if any(name.startswith((".codex-plugin/", ".agent-plugin/", ".claude-plugin/", "skills/codex-project-bootstrap/")) for name in names):
            raise SystemExit("CLI_ONLY_CONTENT_IN_CHATGPT_ARCHIVE")
        if any(name.startswith("plugin/overlay/") or name.startswith("/") or ".." in PurePosixPath(name).parts for name in names):
            raise SystemExit("ARCHIVE_ROOT_LAYOUT_INVALID")
        if len([n for n in names if n.endswith("/SKILL.md")]) < 1:
            raise SystemExit("CHATGPT_SKILL_CONTENT_NOT_DETECTED")
    return len(written)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    count = package(args.root, args.output)
    print(f"CHATGPT_PLUGIN_PACKAGED version={json.loads((args.root/'plugin.json').read_text())['version']} files={count} output={args.output}")

if __name__ == "__main__":
    main()
