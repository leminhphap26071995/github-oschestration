#!/usr/bin/env python3
"""Requirements-first repository and role continuity control plane.

The active host supplies normalized Notion routing/access data and GitHub inventory.
This module makes deterministic selection decisions; it is not a Notion/GitHub client
and does not claim provider or host execution that was not observed.
"""
from __future__ import annotations

from typing import Any

VISIBILITIES = {"public", "private", "internal"}
RELATIONSHIPS = {
    "SOURCE", "EXECUTION", "CONSUMER", "TEST", "DEPENDENCY", "OBSERVER", "MIRROR"
}
WORK_PACKAGE_STATES = {
    "READY", "IN_PROGRESS", "BLOCKED", "HANDOFF", "DONE", "SUPERSEDED"
}
ROLE_ARTIFACTS = ("SKILL.md", "mindset.md", "knowledge.md", "workflow.md")
REPO_USAGE_STATES = {
    "AVAILABLE_VERIFIED", "NEAR_LIMIT", "QUOTA_EXHAUSTED",
    "REPORTED_QUOTA_EXHAUSTED", "UNKNOWN", "API_RATE_LIMITED",
    "PERMISSION_DENIED", "NOT_CONFIGURED", "NOT_EXPOSED", "STALE"
}


def project_introduction_route(project_introduction: dict[str, Any]) -> dict[str, Any]:
    """Project Introduction is a router to Notion, never a repository authority."""
    return {
        "action": "RESOLVE_NOTION_PROJECT_AND_REQUIREMENTS",
        "project_id": project_introduction.get("project_id"),
        "goal_id": project_introduction.get("goal_id"),
        "repository_authority": "NOTION_REQUIREMENT_SCOPED_ACCESS",
        "ignore_project_intro_repository_hints": True,
    }


def validate_repository_catalog(repositories: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    seen: set[str] = set()
    for repo in repositories:
        full_name = repo.get("full_name")
        if not full_name or "/" not in full_name:
            errors.append("REPOSITORY_FULL_NAME_REQUIRED")
            continue
        if full_name.casefold() in seen:
            errors.append(f"DUPLICATE_REPOSITORY:{full_name}")
        seen.add(full_name.casefold())
        if repo.get("visibility") not in VISIBILITIES:
            errors.append(f"INVALID_VISIBILITY:{full_name}")
        if not repo.get("owner"):
            errors.append(f"OWNER_REQUIRED:{full_name}")
        if not isinstance(repo.get("permissions"), dict):
            errors.append(f"PERMISSIONS_REQUIRED:{full_name}")
        usage = repo.get("actions_usage") or {}
        if usage.get("state") and usage["state"] not in REPO_USAGE_STATES:
            errors.append(f"INVALID_ACTIONS_USAGE_STATE:{full_name}")
    return errors


def _data_is_public_safe(classification: str) -> bool:
    return classification in {"PUBLIC", "PUBLIC_SAFE", "SANITIZED_GENERIC"}


def resolve_task_repositories(
    requirements: list[dict[str, Any]],
    repositories: list[dict[str, Any]],
    notion_route: dict[str, Any],
    *,
    ci_required: bool = False,
) -> dict[str, Any]:
    """Map each requirement to Notion-authorized repos and choose one execution target.

    Visibility is a placement/cost attribute, not a blanket denial. Public repos are
    eligible for public-safe material; private data remains on private/internal repos.
    Notion's requirement-scoped route is the authorization input.
    """
    errors = validate_repository_catalog(repositories)
    if errors:
        return {"state": "INVALID_CATALOG", "errors": errors}
    if not notion_route or not notion_route.get("requirement_repositories"):
        return {"state": "NOTION_ROUTE_REQUIRED", "errors": ["NOTION_REQUIREMENT_REPOSITORY_MAP_REQUIRED"]}

    catalog = {r["full_name"].casefold(): r for r in repositories}
    requirements_by_id = {r["requirement_id"]: r for r in requirements if r.get("requirement_id")}
    if len(requirements_by_id) != len(requirements):
        return {"state": "INVALID_REQUIREMENTS", "errors": ["REQUIREMENT_IDS_MUST_BE_UNIQUE_AND_PRESENT"]}

    mapped: dict[str, list[dict[str, Any]]] = {rid: [] for rid in requirements_by_id}
    candidates: list[dict[str, Any]] = []
    for binding in notion_route["requirement_repositories"]:
        full_name = str(binding.get("repository", "")).casefold()
        repo = catalog.get(full_name)
        if not repo:
            return {"state": "ROUTE_REPOSITORY_NOT_IN_CATALOG",
                    "errors": [f"REPOSITORY_NOT_VISIBLE:{binding.get('repository')}"]}
        relationship = binding.get("relationship")
        if relationship not in RELATIONSHIPS:
            return {"state": "INVALID_ROUTE", "errors": [f"INVALID_RELATIONSHIP:{relationship}"]}
        if binding.get("notion_access") != "GRANTED":
            return {"state": "ACCESS_NOT_GRANTED", "errors": [f"NOTION_ACCESS_NOT_GRANTED:{repo['full_name']}"]}
        if repo.get("archived") or repo.get("permissions", {}).get("push") is not True:
            if relationship == "EXECUTION":
                continue
        req_ids = binding.get("requirement_ids", [])
        if not req_ids:
            return {"state": "INVALID_ROUTE", "errors": [f"REQUIREMENT_IDS_REQUIRED:{repo['full_name']}"]}
        for rid in req_ids:
            if rid not in requirements_by_id:
                return {"state": "INVALID_ROUTE", "errors": [f"UNKNOWN_REQUIREMENT:{rid}"]}
            mapped[rid].append({
                "repository": repo["full_name"],
                "relationship": relationship,
                "ref": binding.get("ref"),
                "sha": binding.get("sha"),
            })
        if relationship == "EXECUTION":
            classification = binding.get("data_classification") or "PRIVATE"
            if repo["visibility"] == "public" and not _data_is_public_safe(classification):
                continue
            if repo["visibility"] == "internal" and classification == "PRIVATE":
                continue
            if ci_required:
                usage = repo.get("actions_usage") or {}
                if usage.get("state") != "AVAILABLE_VERIFIED":
                    continue
            candidates.append({**binding, "_repo": repo})

    unmapped = sorted(rid for rid, values in mapped.items() if not values)
    if unmapped:
        return {"state": "REQUIREMENTS_UNMAPPED", "unmapped_requirement_ids": unmapped}

    # Notion may nominate a preferred target; otherwise choose the eligible target
    # with the broadest requirement coverage. Deterministic tie-break by full name.
    preferred = [c for c in candidates if c.get("task_scoped_active") is True]
    if len(preferred) > 1:
        return {"state": "MULTIPLE_ACTIVE_EXECUTION_REPOSITORIES",
                "repositories": sorted(c["_repo"]["full_name"] for c in preferred)}
    if preferred:
        active = preferred[0]
    else:
        if not candidates:
            return {"state": "NO_ELIGIBLE_EXECUTION_REPOSITORY",
                    "reason": "NO_NOTION_AUTHORIZED_REPOSITORY_MATCHES_REQUIREMENTS_AND_CAPABILITIES"}
        active = sorted(
            candidates,
            key=lambda c: (-len(c.get("requirement_ids", [])), c["_repo"]["full_name"].casefold())
        )[0]

    repo = active["_repo"]
    return {
        "state": "RESOLVED",
        "active_execution_repository": {
            "full_name": repo["full_name"],
            "ref": active.get("ref") or repo.get("default_branch"),
            "sha": active.get("sha"),
            "visibility": repo["visibility"],
            "billing_owner": (repo.get("actions_usage") or {}).get("billing_owner"),
            "actions_usage": repo.get("actions_usage") or {"state": "UNKNOWN"},
        },
        "requirement_repository_map": mapped,
        "repository_roles": sorted({
            item["relationship"] for items in mapped.values() for item in items
        }),
        "selection_reason": "NOTION_REQUIREMENTS_AND_ACCESS_PLUS_REPOSITORY_CAPABILITIES",
    }


def resume_role_work_package(work_package: dict[str, Any]) -> dict[str, Any]:
    """Continue the same unfinished role; completed packages are not repeated."""
    required = (
        "work_package_id", "requirement_ids", "role_id", "role_bundle_version",
        "deliverables", "dependencies", "acceptance_evidence", "status", "source_sha", "last_result",
        "first_unmet_criterion", "next_action"
    )
    missing = [key for key in required if key not in work_package]
    if missing:
        return {"state": "INVALID_WORK_PACKAGE", "missing": missing}
    status = work_package["status"]
    if status not in WORK_PACKAGE_STATES:
        return {"state": "INVALID_WORK_PACKAGE", "errors": [f"INVALID_STATUS:{status}"]}
    artifacts = set(work_package.get("role_artifacts", []))
    missing_artifacts = [name for name in ROLE_ARTIFACTS if name not in artifacts]
    if missing_artifacts:
        return {"state": "ROLE_BUNDLE_INCOMPLETE", "missing_artifacts": missing_artifacts}
    if status == "DONE":
        if not all(work_package.get(key) for key in (
            "implementation_ref", "verification_evidence", "consumer_evidence",
            "adversarial_review", "readback_verified"
        )) or not work_package.get("acceptance_evidence"):
            return {"state": "DONE_WITHOUT_EVIDENCE", "role_id": work_package["role_id"]}
        return {"state": "ALREADY_DONE", "role_id": work_package["role_id"],
                "work_package_id": work_package["work_package_id"]}
    if status == "SUPERSEDED":
        return {"state": "SUPERSEDED", "role_id": work_package["role_id"]}
    if status == "BLOCKED":
        state = "BLOCKED_SAME_ROLE"
    elif status == "READY":
        state = "START_SAME_ROLE"
    else:
        state = "CONTINUE_SAME_ROLE"
    return {
        "state": state,
        "role_id": work_package["role_id"],
        "work_package_id": work_package["work_package_id"],
        "first_unmet_criterion": work_package["first_unmet_criterion"],
        "next_action": work_package["next_action"],
        "last_updated_by_role": work_package.get("last_updated_by_role"),
        "owner_session_reference": work_package.get("owner_session_reference"),
    }


def ready_parallel_work_packages(work_packages: list[dict[str, Any]]) -> list[list[str]]:
    """Return dependency-ready batches with no overlapping write ownership."""
    by_id = {wp["work_package_id"]: wp for wp in work_packages}
    completed = {wp["work_package_id"] for wp in work_packages if wp.get("status") == "DONE"}
    pending = {wp["work_package_id"] for wp in work_packages
               if wp.get("status") == "READY"}
    batches: list[list[str]] = []
    while pending:
        ready = [by_id[wid] for wid in sorted(pending)
                 if set(by_id[wid].get("dependencies", [])) <= completed]
        batch: list[str] = []
        claimed_paths: set[str] = set()
        for wp in ready:
            paths = set(wp.get("write_paths", []))
            if claimed_paths.isdisjoint(paths):
                batch.append(wp["work_package_id"])
                claimed_paths.update(paths)
        if not batch:
            break
        batches.append(batch)
        completed.update(batch)
        pending.difference_update(batch)
    return batches


def work_package_completion_gate(work_package: dict[str, Any]) -> dict[str, Any]:
    """A report/checkpoint cannot close implementation without consumer evidence."""
    required = {
        "source_sha": "SOURCE_IDENTITY_MISSING",
        "acceptance_evidence": "ACCEPTANCE_EVIDENCE_MISSING",
        "implementation_ref": "IMPLEMENTATION_NOT_READ_BACK",
        "verification_evidence": "VERIFICATION_EVIDENCE_MISSING",
        "consumer_evidence": "CONSUMER_EVIDENCE_MISSING",
        "adversarial_review": "ADVERSARIAL_REVIEW_MISSING",
        "readback_verified": "SOURCE_READBACK_MISSING",
    }
    missing = [reason for key, reason in required.items() if not work_package.get(key)]
    if missing:
        return {"state": "NOT_DONE", "missing": missing}
    return {"state": "DONE", "role_id": work_package.get("role_id"),
            "work_package_id": work_package.get("work_package_id")}


def project_state_projection(state: dict[str, Any]) -> dict[str, Any]:
    """Keep project, ticket, requirement, repo, package and session states orthogonal."""
    keys = (
        "project_status", "ticket_status", "requirement_status",
        "repository_state", "work_package_status", "session_state",
    )
    return {key: state.get(key, "UNKNOWN") for key in keys}
