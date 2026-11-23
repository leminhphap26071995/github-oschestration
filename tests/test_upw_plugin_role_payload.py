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


    def test_role_artifacts_are_distinct_for_every_registered_role(self):
        base = json.loads((OVERLAY / "references/role-registry.json").read_text())
        ext = json.loads((OVERLAY / "references/role-registry.extensions.json").read_text())
        contents = {name: [] for name in ARTIFACTS}
        for role in base["roles"]:
            for rel in role["bundle"]:
                contents[Path(rel).name].append((OVERLAY / rel).read_text(encoding="utf-8"))
        for role in ext["roles"]:
            for artifact in ARTIFACTS:
                contents[artifact].append((OVERLAY / role["bundle"] / artifact).read_text(encoding="utf-8"))
        for artifact, values in contents.items():
            self.assertEqual(35, len(values), artifact)
            self.assertEqual(35, len(set(values)), artifact)

    def test_cv_route_has_conditional_ba_and_interview_trainer(self):
        route = json.loads((OVERLAY / "references/domain-routing.json").read_text())["domains"]["cv_professional_review"]
        selection = route["role_selection"]
        self.assertIn("ba", selection["supporting_roles"])
        self.assertIn("Business Analyst is conditional", selection["selection_rule"])
        self.assertIn("Interview Trainer is conditional only", selection["selection_rule"])
        self.assertTrue(any("source conflicts" in rule.lower() for rule in route["special_rules"]))
        registry = json.loads((OVERLAY / "references/role-registry.json").read_text())
        extension = json.loads((OVERLAY / "references/role-registry.extensions.json").read_text())
        ids = {r["role"] for r in registry["roles"]} | {r["role_id"] for r in extension["roles"]}
        self.assertTrue(set(selection["primary_roles"] + selection["supporting_roles"] + selection["required_supporting_roles"]).issubset(ids))

    def test_cv_source_conflict_and_provenance_contract_is_candidate_agnostic(self):
        skill = (OVERLAY / "skills/cv-update-lifecycle/SKILL.md").read_text(encoding="utf-8")
        contract = (OVERLAY / "references/cv-update-contract.md").read_text(encoding="utf-8")
        self.assertIn("Source authority and conflict resolution", skill)
        self.assertIn("source_conflict_id", contract)
        self.assertIn("tenure_assessment", contract)
        self.assertIn("PRACTICE", skill)
        for forbidden in ("Symphony", "Cargo Note", "Flamingo", "Trustify", "Guardian"):
            self.assertNotIn(forbidden, skill)
            self.assertNotIn(forbidden, contract)
        for role in ("talent-acquisition-specialist", "technical-hiring-manager", "interview-trainer"):
            content = "\\n".join((OVERLAY / "skills/roles" / role / name).read_text(encoding="utf-8") for name in ("SKILL.md", "knowledge.md", "workflow.md"))
            self.assertIn("PRACTICE", content, role)
            self.assertIn("EXPOSURE", content, role)

    def test_source_blob_manifest_is_exact_and_fails_on_mutation(self):
        meta = json.loads((ROOT / "plugin/source-sync.json").read_text(encoding="utf-8"))
        self.assertEqual(200, meta["chatgpt_payload_file_count"])
        self.assertEqual(200, len(meta["source_blob_shas"]))
        with tempfile.TemporaryDirectory() as temp:
            parent = Path(temp)
            copy = parent / "overlay"
            shutil.copytree(OVERLAY, copy)
            shutil.copy2(ROOT / "plugin/source-sync.json", parent / "source-sync.json")
            shutil.copy2(ROOT / "plugin/live-default-prompt.json", parent / "live-default-prompt.json")
            target = copy / "skills/cv-update-lifecycle/SKILL.md"
            target.write_text(target.read_text(encoding="utf-8") + "\\nMUTATION\\n", encoding="utf-8")
            errors = validate(copy)
            self.assertTrue(any("SOURCE_BLOB_SHA_MISMATCH:plugin/overlay/skills/cv-update-lifecycle/SKILL.md" == e for e in errors))

    def test_default_prompt_matches_live_baseline(self):
        manifest = json.loads((OVERLAY / "plugin.json").read_text())
        baseline = json.loads((ROOT / "plugin/live-default-prompt.json").read_text())
        self.assertEqual(baseline, manifest["extensions"]["com.openai"]["interface"]["defaultPrompt"])


if __name__ == "__main__":
    unittest.main()
