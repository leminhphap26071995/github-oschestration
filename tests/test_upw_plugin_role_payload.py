import json
import shutil
import tempfile
import unittest
from pathlib import Path

from plugin.validate_overlay import validate

ROOT = Path(__file__).resolve().parents[1]
OVERLAY = ROOT / "plugin" / "overlay"
ARTIFACTS = ("SKILL.md", "mindset.md", "knowledge.md", "workflow.md")


class UpwPluginRolePayloadTests(unittest.TestCase):
    def test_overlay_is_complete_and_chatgpt_only(self):
        self.assertEqual([], validate(OVERLAY))
        self.assertFalse((OVERLAY / ".codex-plugin").exists())
        self.assertFalse((OVERLAY / ".agent-plugin").exists())
        self.assertFalse((OVERLAY / "skills/codex-project-bootstrap").exists())

    def test_all_registered_roles_have_four_artifacts(self):
        base = json.loads((OVERLAY / "references/role-registry.json").read_text())
        ext = json.loads((OVERLAY / "references/role-registry.extensions.json").read_text())
        ids = set()
        for role in base["roles"]:
            ids.add(role["role"])
            self.assertEqual(set(ARTIFACTS), {Path(p).name for p in role["bundle"]})
            for rel in role["bundle"]:
                self.assertTrue((OVERLAY / rel).is_file(), rel)
        for role in ext["roles"]:
            ids.add(role["role_id"])
            for artifact in ARTIFACTS:
                rel = Path(role["bundle"]) / artifact
                self.assertTrue((OVERLAY / rel).is_file(), str(rel))
        self.assertEqual(35, len(ids))
        self.assertEqual(30, len(base["roles"]))
        self.assertEqual(5, len(ext["roles"]))
        self.assertIn("talent-acquisition-specialist", ids)
        self.assertIn("technical-hiring-manager", ids)

    def test_cv_review_route_has_distinct_hr_and_technical_roles(self):
        route = json.loads((OVERLAY / "references/domain-routing.json").read_text())["domains"]["cv_professional_review"]
        self.assertEqual({"talent-acquisition-specialist", "technical-hiring-manager"}, set(route["role_selection"]["primary_roles"]))
        self.assertIn("skills/cv-update-lifecycle/SKILL.md", route["load"])
        self.assertIn("references/cv-update-contract.md", route["load"])

    def test_new_roles_are_specialized_not_name_only(self):
        ta = OVERLAY / "skills/roles/talent-acquisition-specialist"
        thm = OVERLAY / "skills/roles/technical-hiring-manager"
        self.assertIn("ATS", (ta / "knowledge.md").read_text())
        self.assertIn("project dates", (ta / "mindset.md").read_text())
        self.assertIn("ownership ladder", (thm / "mindset.md").read_text())
        self.assertIn("Kubernetes", (thm / "knowledge.md").read_text())
        self.assertIn("interview probes", (thm / "workflow.md").read_text())

    def test_missing_role_artifact_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            copy = Path(temp) / "overlay"
            shutil.copytree(OVERLAY, copy)
            target = copy / "skills/roles/talent-acquisition-specialist/knowledge.md"
            target.unlink()
            self.assertTrue(any(x.startswith("MISSING_ROLE_ARTIFACT:talent-acquisition-specialist:") for x in validate(copy)))

    def test_default_prompt_matches_live_baseline(self):
        manifest = json.loads((OVERLAY / "plugin.json").read_text())
        baseline = json.loads((ROOT / "plugin/live-default-prompt.json").read_text())
        self.assertEqual(baseline, manifest["extensions"]["com.openai"]["interface"]["defaultPrompt"])


if __name__ == "__main__":
    unittest.main()
