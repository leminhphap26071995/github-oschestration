import importlib.util,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location("owner_expectation_gate",ROOT/"scripts/owner_expectation_gate.py")
G=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(G)
SHA="a"*40
def contract(): return {"goal_id":"G1","original_expectation":"Complete the owner's outcome","requirements":[{"id":"M1","priority":"MUST","statement":"Deliver feature","acceptance_oracle":"Consumer works","target_consumer":"app"}]}
def receipt():
 e=[{"ref":"run://1","verified_source_sha":SHA,"observed_result":"Consumer verified"}]
 return {"goal_id":"G1","source":{"repository":"o/r","ref":"main","sha":SHA},"state":"COMPLETED_VERIFIED","acceptance":[{"criterion_id":"M1","status":"PASS","evidence":e}],"remaining_ai_owned_work":[],"open_gates":[],"quality_gates":{k:{"status":"PASS","evidence":e} for k in G.QUALITY}}
class GateTests(unittest.TestCase):
 def test_complete_passes(self): self.assertEqual([],G.validate(contract(),receipt(),"close"))
 def test_missing_must_fails(self):
  r=receipt(); r["acceptance"]=[]; self.assertTrue(any("dropped original MUST" in x for x in G.validate(contract(),r,"close")))
 def test_remaining_ai_work_fails(self):
  r=receipt(); r["remaining_ai_owned_work"]=["unfinished work"]; self.assertTrue(any("AI-owned work remains" in x for x in G.validate(contract(),r,"close")))
 def test_open_gate_fails(self):
  r=receipt(); r["open_gates"]=["consumer"]; self.assertTrue(any("gates remain" in x for x in G.validate(contract(),r,"close")))
 def test_sha_mismatch_fails(self):
  r=receipt(); r["acceptance"][0]["evidence"][0]["verified_source_sha"]="b"*40; self.assertTrue(any("lacks evidence bound" in x for x in G.validate(contract(),r,"close")))
 def test_missing_adversarial_review_fails(self):
  r=receipt(); del r["quality_gates"]["adversarial_review"]; self.assertTrue(any("adversarial_review" in x for x in G.validate(contract(),r,"close")))
 def test_handoff_fails_with_ai_work(self):
  r=receipt(); r["state"]="BLOCKED_OWNER_ONLY"; r["remaining_ai_owned_work"]=["test"]; r["owner_only_blockers"]=[{"id":"B","owner_exclusive":True,"reason":"physical access","required_owner_action":"test device","evidence_ref":"proof"}]; r["open_gates"]=["B"]; self.assertTrue(any("owner handoff prohibited" in x for x in G.validate(contract(),r,"handoff")))
 def test_handoff_requires_proof(self):
  r=receipt(); r["state"]="BLOCKED_OWNER_ONLY"; r["owner_only_blockers"]=[{"id":"B","owner_exclusive":False,"reason":"unknown","required_owner_action":"do work","evidence_ref":"none"}]; r["open_gates"]=["B"]; self.assertTrue(any("lacks exclusivity" in x for x in G.validate(contract(),r,"handoff")))
if __name__=="__main__": unittest.main()
