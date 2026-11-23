import hashlib
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OVERLAY = ROOT / "plugin" / "overlay"
EXCLUDED_PREFIXES = (".codex-plugin/", ".agent-plugin/", ".claude-plugin/", "skills/codex-project-bootstrap/")
EXCLUDED_FILES = {"references/codex-skill-mirror.json", ".upw-overlay-files.json", "README.md"}


class SourceBlobProvenanceTests(unittest.TestCase):
    def test_every_chatgpt_payload_file_matches_canonical_source_blob(self):
        sync = json.loads((ROOT / "plugin/source-sync.json").read_text(encoding="utf-8"))
        expected = sync["source_blob_shas"]
        actual_paths = {"plugin.json"}
        for directory in ("references", "skills"):
            for path in (OVERLAY / directory).rglob("*"):
                if not path.is_file():
                    continue
                relative = path.relative_to(OVERLAY).as_posix()
                if relative in EXCLUDED_FILES or any(relative.startswith(prefix) for prefix in EXCLUDED_PREFIXES):
                    continue
                actual_paths.add(relative)
        expected_paths = {path.removeprefix("plugin/overlay/") for path in expected}
        self.assertEqual(200, len(actual_paths))
        self.assertEqual(actual_paths, expected_paths)
        for source_path, expected_sha in expected.items():
            relative = source_path.removeprefix("plugin/overlay/")
            data = (OVERLAY / relative).read_bytes()
            actual_sha = hashlib.sha1(f"blob {len(data)}\\0".encode("utf-8") + data).hexdigest()
            self.assertEqual(expected_sha, actual_sha, source_path)


if __name__ == "__main__":
    unittest.main()
