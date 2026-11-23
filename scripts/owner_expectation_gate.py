#!/usr/bin/env python3
"""Fail-closed structural gate for owner expectation preservation and terminal closure."""
import argparse,json,re,sys
from pathlib import Path
SHA=re.compile(r"^[0-9a-f]{40}$")
STATUSES={"PASS","FAIL","UNKNOWN","BLOCKED","OWNER_PENDING"}
QUALITY=("consumer_verification","adversarial_review","remote_readback")
def txt(v): return isinstance(v,str) and bool(v.strip())
def ev(items,sha): return isinstance(items,list) and bool(items) and all(isinstance(x,dict) and txt(x.get("ref")) and x.get("verified_source_sha")==sha and txt(x.get("observed_result")) for x in items)
def validate(contract,receipt,mode="validate"):
 errors=[]
 if not isinstance(contract,dict) or not isinstance(receipt,dict): return ["contract and receipt must be JSON objects"]
 for k in ("goal_id","original_expectation","requirements"):
  if k not in contract: errors.append("contract missing "+k)
 if errors: return errors
 if not txt(contract["goal_id"]) or not txt(contract["original_expectation"]): errors.append("contract goal identity and original expectation must be non-empty")
 reqs=contract["requirements"]
 if not isinstance(reqs,list): return errors+["contract requirements must be a list"]
 must={}
 for i,x in enumerate(reqs):
  if not isinstance(x,dict): errors.append(f"requirement {i} must be an object"); continue
  rid=x.get("id")
  if not txt(rid) or rid in must: errors.append(f"requirement {i} has empty or duplicate id"); continue
  if x.get("priority")=="MUST":
   must[rid]=x
   for k in ("statement","acceptance_oracle","target_consumer"):
    if not txt(x.get(k)): errors.append(f"MUST {rid} missing {k}")
 if not must: errors.append("contract has no MUST requirements")
 if receipt.get("goal_id")!=contract.get("goal_id"): errors.append("receipt goal_id does not match original contract")
 src=receipt.get("source")
 if not isinstance(src,dict) or not all(txt(src.get(k)) for k in ("repository","ref","sha")) or not SHA.fullmatch(str(src.get("sha",""))): errors.append("receipt source must identify repository, ref and exact SHA"); sha=None
 else: sha=src["sha"]
 arr=receipt.get("acceptance")
 if not isinstance(arr,list): errors.append("receipt acceptance must be a list"); arr=[]
 seen={}
 for i,x in enumerate(arr):
  if not isinstance(x,dict): errors.append(f"acceptance {i} must be an object"); continue
  cid=x.get("criterion_id")
  if not txt(cid) or cid in seen: errors.append(f"acceptance {i} has empty or duplicate criterion_id"); continue
  seen[cid]=x
  if x.get("status") not in STATUSES: errors.append(f"criterion {cid} has invalid status")
  if x.get("status")=="PASS" and (sha is None or not ev(x.get("evidence"),sha)): errors.append(f"criterion {cid} PASS lacks evidence bound to exact source SHA")
 missing=set(must)-set(seen)
 if missing: errors.append("receipt dropped original MUST criteria: "+", ".join(sorted(missing)))
 remaining=receipt.get("remaining_ai_owned_work"); opened=receipt.get("open_gates")
 if not isinstance(remaining,list): errors.append("remaining_ai_owned_work must be a list"); remaining=["UNKNOWN"]
 if not isinstance(opened,list): errors.append("open_gates must be a list"); opened=["UNKNOWN"]
 if mode=="close":
  if receipt.get("state")!="COMPLETED_VERIFIED": errors.append("close requires state COMPLETED_VERIFIED")
  for rid in must:
   if seen.get(rid,{}).get("status")!="PASS": errors.append("MUST not PASS: "+rid)
  if remaining: errors.append("AI-owned work remains; terminal closure prohibited")
  if opened: errors.append("mandatory/open gates remain; terminal closure prohibited")
  q=receipt.get("quality_gates")
  if not isinstance(q,dict): errors.append("quality_gates missing")
  else:
   for name in QUALITY:
    x=q.get(name)
    if not isinstance(x,dict) or x.get("status")!="PASS" or sha is None or not ev(x.get("evidence"),sha): errors.append("quality gate not verified: "+name)
 elif mode=="handoff":
  if receipt.get("state")!="BLOCKED_OWNER_ONLY": errors.append("handoff requires state BLOCKED_OWNER_ONLY")
  if remaining: errors.append("AI-owned work remains; owner handoff prohibited")
  blockers=receipt.get("owner_only_blockers")
  if not isinstance(blockers,list) or not blockers: errors.append("owner-only blockers must be explicit"); blockers=[]
  ids=set()
  for b in blockers:
   if not isinstance(b,dict) or b.get("owner_exclusive") is not True or not txt(b.get("reason")) or not txt(b.get("required_owner_action")) or not txt(b.get("evidence_ref")): errors.append("owner-only blocker lacks exclusivity, reason, action or evidence")
   elif txt(b.get("id")): ids.add(b["id"])
  if set(map(str,opened))!=ids: errors.append("open_gates must contain only evidenced owner-only blocker IDs")
 elif mode!="validate": errors.append("unknown mode")
 return errors
def main():
 p=argparse.ArgumentParser(description=__doc__); p.add_argument("--contract",type=Path,required=True); p.add_argument("--receipt",type=Path,required=True); p.add_argument("--mode",choices=("validate","close","handoff"),default="validate"); a=p.parse_args()
 try: c=json.loads(a.contract.read_text()); r=json.loads(a.receipt.read_text())
 except (OSError,ValueError) as e: print("FAIL: "+str(e),file=sys.stderr); return 2
 errors=validate(c,r,a.mode)
 if errors:
  [print("FAIL: "+x,file=sys.stderr) for x in errors]; return 1
 print("PASS: owner expectation gate; structural and SHA binding only, not evidence authenticity"); return 0
if __name__=="__main__": raise SystemExit(main())
