import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

from plugin.package_overlay import package

ROOT = Path(__file__).resolve().parents[1]
OVERLAY = ROOT / "plugin" / "overlay"


class ChatGPTArchiveContractTests(unittest.TestCase):
    def test_archive_is_deterministic(self):
        with tempfile.TemporaryDirectory() as temp:
            first = Path(temp) / "first.zip"
            second = Path(temp) / "second.zip"
            package(OVERLAY, first)
            package(OVERLAY, second)
            self.assertEqual(first.read_bytes(), second.read_bytes())

    def test_archive_root_and_consumer_boundary(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "upw-chatgpt.zip"
            count = package(OVERLAY, output)
            self.assertEqual(200, count)
            with ZipFile(output) as archive:
                names = set(archive.namelist())
                self.assertIn("plugin.json", names)
                self.assertIn("skills/chatgpt-runtime-onboarding/SKILL.md", names)
                self.assertIn("skills/cv-update-lifecycle/SKILL.md", names)
                self.assertIn("skills/roles/talent-acquisition-specialist/workflow.md", names)
                self.assertIn("skills/roles/technical-hiring-manager/knowledge.md", names)
                self.assertFalse(any(n.startswith((".codex-plugin/", ".agent-plugin/", ".claude-plugin/")) for n in names))
                self.assertFalse(any("codex-project-bootstrap" in n for n in names))
                self.assertFalse(any(n.startswith("plugin/overlay/") for n in names))
                self.assertIsNone(archive.testzip())


if __name__ == "__main__":
    unittest.main()
