import importlib.util, tempfile, unittest, shutil, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("validator",ROOT/"scripts/validate_workspace.py")
validator=importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)

class WorkspaceTests(unittest.TestCase):
 def copy_workspace(self,d):
  dest=Path(d)/"repo"
  shutil.copytree(ROOT,dest,ignore=shutil.ignore_patterns(".git","__pycache__"))
  return dest

 def test_starter_passes(self):
  self.assertEqual([],validator.check(ROOT))

 def test_intro_below_8000(self):
  self.assertLess(len((ROOT/"PROJECT-INTRO-TEMPLATE.md").read_text()),8000)

 def test_missing_file_fails(self):
  with tempfile.TemporaryDirectory() as d:
   self.assertTrue(any(x.startswith("MISSING:") for x in validator.check(Path(d))))

 def test_missing_pack_fails(self):
  with tempfile.TemporaryDirectory() as d:
   dest=self.copy_workspace(d)
   (dest/"domain-packs/learning-training.md").unlink()
   self.assertIn("MISSING_DOMAIN_PACK:learning-training",validator.check(dest))

 def test_hardcoded_repo_fails(self):
  with tempfile.TemporaryDirectory() as d:
   dest=self.copy_workspace(d)
   p=dest/"PROJECT-INTRO-TEMPLATE.md"
   p.write_text(p.read_text()+"\\nlyonpro\\n")
   self.assertIn("TEMPLATE_HARDCODES_OWNER_OR_REPO",validator.check(dest))

 def test_missing_professional_catalog_fails(self):
  with tempfile.TemporaryDirectory() as d:
   dest=self.copy_workspace(d)
   (dest/"domain-packs/professional-domains.md").unlink()
   self.assertTrue(any(e.startswith("MISSING:domain-packs/professional-domains.md") for e in validator.check(dest)))

 def test_generic_role_fallback_is_forbidden(self):
  with tempfile.TemporaryDirectory() as d:
   dest=self.copy_workspace(d)
   p=dest/"domain-packs/registry.json"
   data=json.loads(p.read_text())
   data["capability_discovery"]["generic_role_fallback"]="ALLOWED"
   p.write_text(json.dumps(data))
   self.assertIn("GENERIC_ROLE_FALLBACK_NOT_PROHIBITED",validator.check(dest))

 def test_professional_capability_contract_has_domain_coverage(self):
  self.assertEqual([], [e for e in validator.check(ROOT) if e.startswith("PROFESSIONAL_CAPABILITY_TOKEN_MISSING:")])

 def test_host_quota_contract_distinguishes_enforcement_and_exhaustion(self):
  self.assertEqual([], [e for e in validator.check(ROOT) if e.startswith("HOST_QUOTA_TOKEN_MISSING:")])

 def test_root_current_is_index_not_global_task(self):
  with tempfile.TemporaryDirectory() as d:
   dest=self.copy_workspace(d)
   p=dest/".ai-workflow/CURRENT.json"
   data=json.loads(p.read_text()); data["active_context"]="game-mod"
   p.write_text(json.dumps(data))
   self.assertIn("GLOBAL_ACTIVE_CONTEXT_FORBIDDEN",validator.check(dest))

 def test_empty_context_index_is_valid(self):
  data=json.loads((ROOT/".ai-workflow/CURRENT.json").read_text())
  self.assertEqual("context-index",data["kind"])
  self.assertIsNone(data["active_context"])
  self.assertEqual([],data["projects"])

 def test_validator_rejects_manual_dispatch(self):
  with tempfile.TemporaryDirectory() as d:
   dest=self.copy_workspace(d)
   (dest/".github/workflows/bad.yml").write_text("on:" + chr(10) + "  workflow_dispatch:" + chr(10))
   self.assertIn("WORKFLOW_DISPATCH_FORBIDDEN:bad.yml",validator.check(dest))

 def test_manual_dispatch_is_forbidden(self):
  for workflow in (ROOT/".github/workflows").glob("*.yml"):
   self.assertNotIn("workflow_dispatch:",workflow.read_text())

 def test_actions_warmup_contract_is_present(self):
  doc=(ROOT/"docs/GITHUB-ACTIONS-RUN-LIFECYCLE.md").read_text()
  self.assertIn("RUNNER_WARMUP_PENDING",doc)
  self.assertIn("empty jobs",doc)
  self.assertIn("OBSERVATION_WINDOW_EXPIRED",doc)

if __name__=="__main__":
 unittest.main()
