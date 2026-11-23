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

    def test_cv_review_route_has_one_accountable_primary_and_required_technical_support(self):
        route = json.loads((OVERLAY / "references/domain-routing.json").read_text())["domains"]["cv_professional_review"]
        selection = route["role_selection"]
        self.assertEqual(["talent-acquisition-specialist"], selection["primary_roles"])
        self.assertEqual(["technical-hiring-manager"], selection["required_supporting_roles"])
        self.assertIn("technical-hiring-manager", selection["required_supporting_role_conditions"])
        self.assertIn("skills/cv-update-lifecycle/SKILL.md", route["load"])
        self.assertIn("references/cv-update-contract.md", route["load"])

    def test_chatgpt_native_role_loading_is_not_ci_gated(self):
        content = (OVERLAY / "skills/role-context-loading/SKILL.md").read_text()
        self.assertIn("ChatGPT-native role selection is not gated by GitHub Actions", content)
        self.assertIn("CI-generated execution path", content)
        self.assertIn("required_supporting_roles", content)

    def test_cv_lifecycle_assigns_primary_and_supporting_roles(self):
        content = (OVERLAY / "skills/cv-update-lifecycle/SKILL.md").read_text()
        self.assertIn("Talent Acquisition Specialist — accountable primary", content)
        self.assertIn("Technical Hiring Manager — required supporting reviewer", content)
        self.assertIn("SINGLE_SESSION_CROSSCHECK", content)

    def test_new_roles_are_specialized_not_name_only(self):
        ta = OVERLAY / "skills/roles/talent-acquisition-specialist"
        thm = OVERLAY / "skills/roles/technical-hiring-manager"
        self.assertIn("ats", (ta / "knowledge.md").read_text().lower())
        self.assertIn("project dates", (ta / "mindset.md").read_text().lower())
        self.assertIn("ownership ladder", (thm / "mindset.md").read_text().lower())
        self.assertIn("kubernetes", (thm / "knowledge.md").read_text().lower())
        self.assertIn("interview probes", (thm / "workflow.md").read_text().lower())

    def test_missing_role_artifact_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            parent = Path(temp)
            copy = parent / "overlay"
            shutil.copytree(OVERLAY, copy)
            shutil.copy2(ROOT / "plugin/source-sync.json", parent / "source-sync.json")
            shutil.copy2(ROOT / "plugin/live-default-prompt.json", parent / "live-default-prompt.json")
            target = copy / "skills/roles/talent-acquisition-specialist/knowledge.md"
            target.unlink()
            errors = validate(copy)
            self.assertTrue(any("MISSING_ROLE_ARTIFACT:talent-acquisition-specialist:" in error for error in errors))

    def test_default_prompt_matches_live_baseline(self):
        manifest = json.loads((OVERLAY / "plugin.json").read_text())
        baseline = json.loads((ROOT / "plugin/live-default-prompt.json").read_text())
        self.assertEqual(baseline, manifest["extensions"]["com.openai"]["interface"]["defaultPrompt"])


if __name__ == "__main__":
    unittest.main()

    def test_all_roles_have_specialist_depth_and_level_calibration(self):
        index = json.loads((OVERLAY / "references/role-specialization-index.json").read_text())
        self.assertEqual(35, len(index["roles"]))
        self.assertEqual("PROHIBITED", index["generic_role_fallback"])
        self.assertTrue((OVERLAY / "references/professional-level-contract.md").is_file())
        self.assertTrue((OVERLAY / "references/role-specialization-quality-gate.md").is_file())
        for role in index["roles"]:
            bundle = OVERLAY / role["bundle"]
            mindset = (bundle / "mindset.md").read_text(encoding="utf-8").lower()
            knowledge = (bundle / "knowledge.md").read_text(encoding="utf-8")
            workflow = (bundle / "workflow.md").read_text(encoding="utf-8")
            self.assertTrue(all(level in mindset for level in ("junior", "mid", "senior", "principal")), role["role_id"])
            self.assertGreaterEqual(len(__import__("re").findall(r"https?://", knowledge)), 2, role["role_id"])
            self.assertGreater(len(workflow), 250, role["role_id"])
            self.assertNotRegex(knowledge, r"(?i)generic role fallback|general model knowledge is a source")
