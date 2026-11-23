import json
import shutil
import tempfile
import unittest
from pathlib import Path

from plugin.validate_overlay import validate

REPO_ROOT = Path(__file__).resolve().parents[1]
OVERLAY_ROOT = REPO_ROOT / "plugin" / "overlay"
ROLE_ARTIFACTS = ("SKILL.md", "mindset.md", "knowledge.md", "workflow.md")


class UpwPluginRolePayloadTests(unittest.TestCase):
    def test_complete_overlay_passes(self):
        self.assertEqual([], validate(OVERLAY_ROOT))

    def test_all_three_manifests_share_name_and_version(self):
        root = json.loads((OVERLAY_ROOT / "plugin.json").read_text(encoding="utf-8"))
        codex = json.loads((OVERLAY_ROOT / ".codex-plugin/plugin.json").read_text(encoding="utf-8"))
        agent = json.loads((OVERLAY_ROOT / ".agent-plugin/plugin.json").read_text(encoding="utf-8"))
        self.assertEqual(root["name"], codex["name"])
        self.assertEqual(root["name"], agent["name"])
        self.assertEqual(root["version"], codex["version"])
        self.assertEqual(root["version"], agent["version"])
        self.assertEqual("./skills", agent["skills"])

    def test_all_registered_roles_have_complete_four_artifact_bundles(self):
        base = json.loads((OVERLAY_ROOT / "references/role-registry.json").read_text(encoding="utf-8"))
        extensions = json.loads((OVERLAY_ROOT / "references/role-registry.extensions.json").read_text(encoding="utf-8"))
        role_ids = set()

        self.assertEqual(set(ROLE_ARTIFACTS), set(base["required_files"]))
        self.assertEqual(set(ROLE_ARTIFACTS), set(extensions["required_artifacts"]))

        for role in base["roles"]:
            role_ids.add(role["role"])
            self.assertEqual(set(ROLE_ARTIFACTS), {Path(item).name for item in role["bundle"]})
            for relative in role["bundle"]:
                self.assertTrue((OVERLAY_ROOT / relative).is_file(), relative)

        for role in extensions["roles"]:
            role_ids.add(role["role_id"])
            for artifact in extensions["required_artifacts"]:
                relative = Path(role["bundle"]) / artifact
                self.assertTrue((OVERLAY_ROOT / relative).is_file(), str(relative))

        self.assertEqual(9, len(role_ids))
        self.assertIn("ai-native-tooling-engineer", role_ids)

    def test_missing_role_artifact_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            copy = Path(temp) / "overlay"
            shutil.copytree(OVERLAY_ROOT, copy)
            relative = Path("skills/roles/ai-native-tooling-engineer/knowledge.md")
            (copy / relative).unlink()
            errors = validate(copy)
            self.assertIn(
                f"MISSING_ROLE_ARTIFACT:ai-native-tooling-engineer:{relative.as_posix()}",
                errors,
            )

    def test_discovery_and_domain_registries_are_wired(self):
        catalog = json.loads((OVERLAY_ROOT / "references/professional-capability-catalog.json").read_text(encoding="utf-8"))
        domain = json.loads((OVERLAY_ROOT / "references/domain-routing.json").read_text(encoding="utf-8"))
        self.assertEqual("PROHIBITED", catalog["generic_role_fallback"])
        self.assertTrue(domain["domains"])
        self.assertTrue(domain["rules"])


if __name__ == "__main__":
    unittest.main()
