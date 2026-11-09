#!/usr/bin/env python3
"""Create a Plugin Creator-compatible overlay ZIP from a versioned plugin tree."""
import argparse
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    manifest = json.loads((root / "plugin.json").read_text(encoding="utf-8"))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(args.output, "w", ZIP_DEFLATED) as archive:
        for path in sorted(root.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(root).as_posix())
    with ZipFile(args.output) as archive:
        bad = archive.testzip()
        if bad:
            raise SystemExit(f"ZIP_INTEGRITY_FAILED:{bad}")
        names = set(archive.namelist())
        for required in ("plugin.json", ".codex-plugin/plugin.json"):
            if required not in names:
                raise SystemExit(f"ZIP_REQUIRED_FILE_MISSING:{required}")
    print(f"PACKAGED version={manifest['version']} files={len(names)} output={args.output}")
if __name__ == "__main__":
    main()
