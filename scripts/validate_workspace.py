#!/usr/bin/env python3
"""Dependency-free structural validator; does not prove runtime/plugin activation."""
import argparse, json, re, sys
from pathlib import Path
REQUIRED=["AGENTS.md","README.md","PROJECT-INTRO-TEMPLATE.md","AI-ARCHITECTURE-WORKFLOW.md","ai-workflow.instance.json",".ai-workflow/CURRENT.json","domain-packs/registry.json","schemas/goal.schema.json","schemas/context-index.schema.json","schemas/context-checkpoint.schema.json","docs/PROFESSIONAL-CAPABILITY-ARCHITECTURE.md","docs/EXECUTION-ENVIRONMENT-AND-QUOTA-GOVERNANCE.md","docs/GITHUB-ACTIONS-RUN-LIFECYCLE.md","docs/CONTEXT-ISOLATION-AND-PROJECT-SWITCHING.md","domain-packs/professional-domains.md"]
def check(root):
    errors=[]
    for rel in REQUIRED:
        if not (root/rel).is_file(): errors.append("MISSING:"+rel)
    if errors: return errors
    try:
        cfg=json.loads((root/"ai-workflow.instance.json").read_text())
        idx=json.loads((root/".ai-workflow/CURRENT.json").read_text())
        reg=json.loads((root/"domain-packs/registry.json").read_text())
        goal_schema=json.loads((root/"schemas/goal.schema.json").read_text())
        index_schema=json.loads((root/"schemas/context-index.schema.json").read_text())
        checkpoint_schema=json.loads((root/"schemas/context-checkpoint.schema.json").read_text())
    except (OSError,json.JSONDecodeError) as e: return ["INVALID_JSON:"+str(e)]
    if cfg.get("schema_version")!=2: errors.append("CONFIG_SCHEMA_VERSION")
    if cfg.get("require_evidence") is not True: errors.append("EVIDENCE_GATE_DISABLED")
    if cfg.get("context_index_path")!=".ai-workflow/CURRENT.json": errors.append("CONTEXT_INDEX_ROUTE_MISMATCH")
    if cfg.get("project_checkpoint_pattern")!=".ai-workflow/projects/<project-id>/CURRENT.json": errors.append("PROJECT_CHECKPOINT_PATTERN_MISMATCH")
    if cfg.get("ticket_checkpoint_pattern")!=".ai-workflow/projects/<project-id>/tickets/<ticket-id>/CURRENT.json": errors.append("TICKET_CHECKPOINT_PATTERN_MISMATCH")
    if cfg.get("context_resolution")!="explicit-project-ticket; never-latest-modified-checkpoint": errors.append("UNSAFE_CONTEXT_RESOLUTION")
    if idx.get("schema_version")!=2 or idx.get("kind")!="context-index": errors.append("INVALID_CONTEXT_INDEX")
    if idx.get("active_context") is not None: errors.append("GLOBAL_ACTIVE_CONTEXT_FORBIDDEN")
    project_ids=set()
    for p in idx.get("projects",[]):
        pid=p.get("project_id")
        if not pid or pid in project_ids: errors.append("DUPLICATE_OR_EMPTY_PROJECT_ID")
        project_ids.add(pid)
        expected=f".ai-workflow/projects/{pid}/CURRENT.json"
        if p.get("checkpoint_path")!=expected: errors.append("PROJECT_CHECKPOINT_PATH_MISMATCH:"+str(pid))
        cp=root/expected
        if not cp.is_file(): errors.append("MISSING_PROJECT_CHECKPOINT:"+str(pid)); continue
        try: state=json.loads(cp.read_text())
        except (OSError,json.JSONDecodeError): errors.append("INVALID_PROJECT_CHECKPOINT:"+str(pid)); continue
        if state.get("kind")!="project-checkpoint" or state.get("project_id")!=pid: errors.append("PROJECT_CHECKPOINT_IDENTITY_MISMATCH:"+str(pid))
        for tid in state.get("tickets",[]):
            tp=root/f".ai-workflow/projects/{pid}/tickets/{tid}/CURRENT.json"
            if not tp.is_file(): errors.append("MISSING_TICKET_CHECKPOINT:"+str(pid)+":"+str(tid)); continue
            try: ticket=json.loads(tp.read_text())
            except (OSError,json.JSONDecodeError): errors.append("INVALID_TICKET_CHECKPOINT:"+str(tid)); continue
            if ticket.get("kind")!="ticket-checkpoint" or ticket.get("project_id")!=pid or ticket.get("ticket_id")!=tid: errors.append("TICKET_CONTEXT_IDENTITY_MISMATCH:"+str(tid))
            if ticket.get("domain")!=state.get("domain"): errors.append("CROSS_DOMAIN_CHECKPOINT_LEAK:"+str(tid))
    if index_schema.get("properties",{}).get("schema_version",{}).get("const")!=2: errors.append("CONTEXT_INDEX_SCHEMA_VERSION")
    if checkpoint_schema.get("properties",{}).get("kind",{}).get("enum")!=["project-checkpoint","ticket-checkpoint"]: errors.append("CONTEXT_CHECKPOINT_SCHEMA_KINDS")
    if not isinstance(reg.get("packs"),list) or not reg["packs"]: errors.append("EMPTY_DOMAIN_REGISTRY")
    for p in reg.get("packs",[]):
        if not (root/str(p.get("path",""))).is_file(): errors.append("MISSING_DOMAIN_PACK:"+str(p.get("id")))
    capability=reg.get("capability_discovery",{})
    if capability.get("generic_role_fallback")!="PROHIBITED": errors.append("GENERIC_ROLE_FALLBACK_NOT_PROHIBITED")
    if capability.get("contract")!="docs/PROFESSIONAL-CAPABILITY-ARCHITECTURE.md": errors.append("CAPABILITY_CONTRACT_ROUTE_MISMATCH")
    role_doc=(root/"docs/PROFESSIONAL-CAPABILITY-ARCHITECTURE.md").read_text()
    for token in ["outcome-to-profession discovery","mindset.md","acceptance oracle","Game Director","Art Director","Clinical","Finance"]:
        if token.lower() not in role_doc.lower(): errors.append("PROFESSIONAL_CAPABILITY_TOKEN_MISSING:"+token)
    host_doc=(root/"docs/EXECUTION-ENVIRONMENT-AND-QUOTA-GOVERNANCE.md").read_text()
    for token in ["MODEL_GUIDED","HOST_ENFORCED","network/DNS","QUOTA_EXHAUSTED","runner_id=0","image"]:
        if token.lower() not in host_doc.lower(): errors.append("HOST_QUOTA_TOKEN_MISSING:"+token)
    actions_doc=(root/"docs/GITHUB-ACTIONS-RUN-LIFECYCLE.md").read_text()
    for token in ["RUNNER_WARMUP_PENDING","JOB_STARTUP_PENDING","LOG_PUBLICATION_PENDING","OBSERVATION_WINDOW_EXPIRED","Retry-After"]:
        if token.lower() not in actions_doc.lower(): errors.append("ACTIONS_LIFECYCLE_TOKEN_MISSING:"+token)
    context_doc=(root/"docs/CONTEXT-ISOLATION-AND-PROJECT-SWITCHING.md").read_text()
    for token in ["NEVER_LATEST_TIMESTAMP","Game Mod","VS Code Extension","Career/Interview","project checkpoint","ticket checkpoint"]:
        if token.lower() not in context_doc.lower(): errors.append("CONTEXT_ISOLATION_TOKEN_MISSING:"+token)
    intro=(root/"PROJECT-INTRO-TEMPLATE.md").read_text()
    if len(intro)>=8000: errors.append("PROJECT_INTRO_OVER_8000_CHARS")
    if any(x in intro.lower() for x in ["ai-workflow-archtiecture","leminhphap","lyonpro"]): errors.append("TEMPLATE_HARDCODES_OWNER_OR_REPO")
    if goal_schema.get("properties",{}).get("status",{}).get("enum") is None: errors.append("GOAL_SCHEMA_STATUS_MISSING")
    workflow_dir = root / ".github" / "workflows"
    if workflow_dir.is_dir():
        workflow_files = sorted(list(workflow_dir.glob("*.yml")) + list(workflow_dir.glob("*.yaml")))
        for workflow in workflow_files:
            if re.search(r"(?m)^\s*workflow_dispatch\s*:", workflow.read_text()):
                errors.append("WORKFLOW_DISPATCH_FORBIDDEN:" + workflow.name)
    return errors
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--root",type=Path,default=Path.cwd()); a=ap.parse_args()
    errors=check(a.root.resolve())
    print(json.dumps({"result":"PASS" if not errors else "FAIL","scope":"PORTABLE_STRUCTURAL_CONFORMANCE_ONLY","runtime_activation":"NOT_VERIFIED","errors":errors},indent=2))
    sys.exit(1 if errors else 0)
if __name__=="__main__": main()
