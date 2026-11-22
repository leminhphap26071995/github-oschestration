#!/usr/bin/env python3
"""UPW message-level context router and quota-aware staging policy.

This module enforces routing semantics after the active host extracts a structured
intent from the user's current message. It is not an NLP model, a Notion/GitHub
connector, or proof of host enforcement. The host must persist/read back outgoing
durable cursors before loading a different persistent context.
"""
from __future__ import annotations

import re
import unicodedata
import unittest
from typing import Any

DOMAIN_CONTEXTS = [
    {
        "id": "software-engineering",
        "aliases": ["software", "coding", "app", "api", "website", "bug", "devops",
                    "cloud", "sre", "kubernetes", "ci/cd", "infrastructure"],
        "profile_path": "domain-packs/software-engineering.md",
        "authority": "explicit-project-source; github-for-versioned-technical-evidence",
    },
    {
        "id": "ai-tooling-lifecycle",
        "aliases": ["ai tooling", "plugin", "plugins", "agent skill", "agent skills",
                    "mcp", "developer tooling", "tool integration", "chatgpt plugin",
                    "chatgpt plugin creator", "vs code extension", "browser automation",
                    "model routing"],
        "profile_path": "domain-packs/ai-tooling-lifecycle.md",
        "authority": "plugin-creator-for-live-chatgpt-plugin; github-for-versioned-source; official-vendor-docs-for-external-tooling; actual-consumer-for-activation-and-invocation",
    },
    {
        "id": "research-writing",
        "aliases": ["research", "investigate", "compare", "report", "policy",
                    "summarize sources", "literature review"],
        "profile_path": "domain-packs/research-writing.md",
        "authority": "claim-to-source-map; no-project-route-for-standalone-research",
    },
    {
        "id": "career-interview",
        "aliases": ["career", "job", "cv", "resume", "interview", "jd",
                    "assessment", "recruiter"],
        "profile_path": "domain-packs/career-interview.md",
        "authority": "notion-interview-campaign-and-checkpoint; cv-jd-source-repositories",
    },
    {
        "id": "learning-training",
        "aliases": ["learn", "course", "training", "study", "mentor", "quiz",
                    "practice", "tutorial"],
        "profile_path": "domain-packs/learning-training.md",
        "authority": "requested-learning-mode; no-forced-quiz-or-persistence",
    },
    {
        "id": "professional-domains",
        "aliases": ["game", "design", "media", "business", "finance", "accounting",
                    "legal", "compliance", "healthcare", "clinical", "science",
                    "manufacturing", "marketing", "sales", "education",
                    "cybersecurity", "logistics", "supply chain"],
        "profile_path": "domain-packs/professional-domains.md",
        "authority": "outcome-derived-specialist-bundle-and-domain-acceptance",
    },
]

INTENT_TYPES = {
    "PROJECT_TASK", "NEW_TOPIC", "DOMAIN_TASK", "STANDALONE",
    "CONTINUE", "SWITCH_BACK", "AMBIGUOUS",
}


def _normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode()
    value = value.casefold().replace("ci cd", "ci/cd")
    return re.sub(r"[^a-z0-9/]+", " ", value).strip()


def validate_domain_registry(registry: list[dict[str, Any]] | None = None) -> list[str]:
    registry = DOMAIN_CONTEXTS if registry is None else registry
    errors: list[str] = []
    ids: set[str] = set()
    aliases: dict[str, str] = {}
    for item in registry:
        domain_id = item.get("id")
        if not domain_id or domain_id in ids:
            errors.append("DUPLICATE_OR_EMPTY_DOMAIN_ID")
        ids.add(domain_id)
        if not item.get("profile_path") or not item.get("authority"):
            errors.append(f"DOMAIN_PROFILE_INCOMPLETE:{domain_id}")
        for alias in item.get("aliases", []):
            key = _normalize(alias)
            if not key:
                errors.append(f"EMPTY_DOMAIN_ALIAS:{domain_id}")
            elif key in aliases and aliases[key] != domain_id:
                errors.append(f"AMBIGUOUS_DOMAIN_ALIAS:{key}")
            else:
                aliases[key] = domain_id
    return errors


def resolve_domain(message: str, explicit_domain_id: str | None = None,
                   registry: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    registry = DOMAIN_CONTEXTS if registry is None else registry
    by_id = {item["id"]: item for item in registry}
    if explicit_domain_id:
        item = by_id.get(explicit_domain_id)
        return ({"status": "RESOLVED", "domain": item} if item else
                {"status": "UNKNOWN_DOMAIN", "domain_id": explicit_domain_id})
    text = f" {_normalize(message)} "
    matches: list[tuple[int, dict[str, Any], str]] = []
    for item in registry:
        for alias in item.get("aliases", []):
            key = _normalize(alias)
            if key and f" {key} " in text:
                matches.append((len(key), item, key))
    if not matches:
        return {"status": "UNKNOWN_DOMAIN"}
    longest = max(length for length, _, _ in matches)
    best = {item["id"]: item for length, item, _ in matches if length == longest}
    if len(best) != 1:
        return {"status": "AMBIGUOUS_DOMAIN", "candidates": sorted(best)}
    return {"status": "RESOLVED", "domain": next(iter(best.values()))}


def _preserve_active(result: dict[str, Any], current: dict[str, Any] | None) -> dict[str, Any]:
    if current:
        active = {**current, "context_state": "ACTIVE"}
        result["active_context"] = active
        result["context_state"] = "ACTIVE"
    else:
        result["active_context"] = None
        result["context_state"] = "STANDBY"
    return result


def _standby(result: dict[str, Any], current: dict[str, Any] | None) -> dict[str, Any]:
    """Plan a return to STANDBY; durable contexts stay ACTIVE until readback."""
    if not current:
        result.update({"active_context": None, "context_state": "STANDBY",
                       "transition_state": "COMMITTED", "transition_order": []})
        return result
    durable = current.get("kind") in {"project", "ticket"}
    outgoing = {**current, "context_state": "ACTIVE" if durable else "STANDBY"}
    result["outgoing_context"] = outgoing
    result["outgoing_context_state"] = outgoing["context_state"]
    result["outgoing_persistence_required"] = durable
    if durable:
        result["pending_action"] = result.get("action")
        result["action"] = "PERSIST_OUTGOING_CURSOR"
        result["active_context"] = {**current, "context_state": "ACTIVE"}
        result["context_state"] = "ACTIVE"
        result["destination_context"] = None
        result["transition_state"] = "PENDING_OUTGOING_PERSISTENCE"
        result["transition_order"] = [
            "PERSIST_OUTGOING_CURSOR", "READ_BACK_OUTGOING_CURSOR",
            "SET_OUTGOING_STANDBY", "CLEAR_ACTIVE_CONTEXT",
        ]
    else:
        result["active_context"] = None
        result["context_state"] = "STANDBY"
        result["transition_state"] = "COMMITTED"
        result["transition_order"] = ["SET_OUTGOING_STANDBY", "CLEAR_ACTIVE_CONTEXT"]
    return result


def _outgoing(result: dict[str, Any], current: dict[str, Any] | None,
              destination: dict[str, Any] | None) -> dict[str, Any]:
    """Resolve a switch without activating a destination before durable readback."""
    if not destination:
        return _preserve_active(result, current)
    switching = bool(current and current.get("context_id") != destination.get("context_id"))
    durable_outgoing = switching and current.get("kind") in {"project", "ticket"}
    if durable_outgoing:
        pending = {**destination, "context_state": "PENDING_ACTIVATION"}
        result["pending_action"] = result.get("action")
        result["action"] = "PERSIST_OUTGOING_CURSOR"
        result["context"] = pending if result.get("context") is not None else result.get("context")
        result["destination_context"] = pending
        result["active_context"] = {**current, "context_state": "ACTIVE"}
        result["context_state"] = "ACTIVE"
        result["outgoing_context"] = {**current, "context_state": "ACTIVE"}
        result["outgoing_context_state"] = "ACTIVE"
        result["outgoing_persistence_required"] = True
        result["transition_state"] = "PENDING_OUTGOING_PERSISTENCE"
        result["transition_order"] = [
            "PERSIST_OUTGOING_CURSOR", "READ_BACK_OUTGOING_CURSOR",
            "SET_OUTGOING_STANDBY", "ACTIVATE_DESTINATION",
        ]
        return result

    active = {**destination, "context_state": "ACTIVE"}
    if result.get("context") is not None:
        result["context"] = active
    result["active_context"] = active
    result["context_state"] = "ACTIVE"
    result["transition_state"] = "COMMITTED"
    if switching:
        outgoing = {**current, "context_state": "STANDBY"}
        result["outgoing_context"] = outgoing
        result["outgoing_context_state"] = "STANDBY"
        result["outgoing_persistence_required"] = False
        result["transition_order"] = ["SET_OUTGOING_STANDBY", "ACTIVATE_DESTINATION"]
    else:
        result["transition_order"] = ["ACTIVATE_DESTINATION"]
    return result


def commit_context_transition(transition: dict[str, Any], *,
                              outgoing_persisted: bool,
                              outgoing_readback_verified: bool,
                              readback_context_id: str | None = None) -> dict[str, Any]:
    """Commit a pending switch only after exact durable cursor readback."""
    if transition.get("transition_state") != "PENDING_OUTGOING_PERSISTENCE":
        return {"action": "INVALID_TRANSITION", "reason": "NO_PENDING_OUTGOING_PERSISTENCE",
                "context_state": transition.get("context_state", "STANDBY")}

    outgoing = transition.get("outgoing_context") or {}
    active = transition.get("active_context") or outgoing

    def blocked(reason: str) -> dict[str, Any]:
        outgoing_active = {**outgoing, "context_state": "ACTIVE"}
        return {
            **transition,
            "action": "BLOCKED",
            "reason": reason,
            "transition_state": "BLOCKED",
            "context_state": "ACTIVE",
            "active_context": {**active, "context_state": "ACTIVE"},
            "outgoing_context": outgoing_active,
            "outgoing_context_state": "ACTIVE",
        }

    if not outgoing_persisted:
        return blocked("OUTGOING_CURSOR_SAVE_FAILED")
    if not outgoing_readback_verified:
        return blocked("OUTGOING_CURSOR_READBACK_FAILED")
    expected_context_id = outgoing.get("context_id")
    if not expected_context_id or readback_context_id != expected_context_id:
        return blocked("OUTGOING_CURSOR_IDENTITY_MISMATCH")

    committed = {
        **{key: value for key, value in transition.items() if key != "pending_action"},
        "action": transition.get("pending_action", transition.get("action")),
        "outgoing_context": {**outgoing, "context_state": "STANDBY"},
        "outgoing_context_state": "STANDBY",
        "outgoing_persistence_required": True,
        "transition_state": "COMMITTED",
    }
    destination = transition.get("destination_context")
    if destination:
        active_destination = {**destination, "context_state": "ACTIVE"}
        committed["context"] = active_destination
        committed["destination_context"] = active_destination
        committed["active_context"] = active_destination
        committed["context_state"] = "ACTIVE"
    else:
        committed["active_context"] = None
        committed["context_state"] = "STANDBY"
    return committed


def complete_context(context: dict[str, Any], *, ticket_status: str | None,
                     all_musts_verified: bool, ai_owned_work_exhausted: bool,
                     adversarial_review_passed: bool, writes_read_back: bool,
                     ticket_done_read_back: bool = False) -> dict[str, Any]:
    """Return to STANDBY only after closure gates and exact ticket-Done readback."""
    missing = []
    durable = context.get("kind") in {"project", "ticket"}
    ticket_is_done = str(ticket_status or "").casefold() == "done"
    if not all_musts_verified:
        missing.append("MUST_ACCEPTANCE_INCOMPLETE")
    if not ai_owned_work_exhausted:
        missing.append("AI_OWNED_WORK_REMAINS")
    if not adversarial_review_passed:
        missing.append("ADVERSARIAL_REVIEW_INCOMPLETE")
    if not writes_read_back:
        missing.append("PERSISTED_WRITES_NOT_READ_BACK")
    if durable and ticket_is_done and not ticket_done_read_back:
        missing.append("TICKET_DONE_NOT_READ_BACK")
    if missing:
        return {"action": "KEEP_ACTIVE", "context_state": "ACTIVE",
                "reason": "CLOSURE_GATE_NOT_SATISFIED", "missing": missing}
    if durable and not ticket_is_done:
        return {"action": "CLOSE_TICKET_REQUIRED", "context_state": "ACTIVE",
                "reason": "TICKET_NOT_DONE", "ticket_status": ticket_status,
                "transition_order": ["UPDATE_TICKET_DONE", "READ_BACK_TICKET_DONE",
                                     "RETURN_TO_STANDBY"]}
    return {"action": "RETURN_TO_STANDBY", "context_state": "STANDBY",
            "active_context": None, "context_id": context.get("context_id"),
            "transition_order": ["CLEAR_ACTIVE_CONTEXT", "SET_CONTEXT_STANDBY"]}

def _project_destination(project_id: str, ticket_id: str | None,
                         project_checkpoints: dict[str, Any],
                         explicit_domain: str | None = None) -> dict[str, Any]:
    record = project_checkpoints.get(project_id)
    if not record:
        return {"action": "NOT_FOUND", "reason": "PROJECT_CHECKPOINT_NOT_FOUND",
                "project_id": project_id}
    project = record.get("project", record)
    if project.get("project_id") != project_id:
        return {"action": "IDENTITY_MISMATCH", "reason": "PROJECT_ID_MISMATCH",
                "project_id": project_id}
    project_domain = project.get("domain")
    if explicit_domain and project_domain and explicit_domain != project_domain:
        return {"action": "IDENTITY_MISMATCH", "reason": "EXPLICIT_DOMAIN_MISMATCH",
                "project_id": project_id}
    tickets = record.get("tickets", {})
    if isinstance(tickets, list):
        tickets = {item.get("ticket_id"): item for item in tickets if isinstance(item, dict)}
    if ticket_id:
        ticket = tickets.get(ticket_id)
        if not ticket:
            return {"action": "NOT_FOUND", "reason": "TICKET_CHECKPOINT_NOT_FOUND",
                    "project_id": project_id, "ticket_id": ticket_id}
        if ticket.get("ticket_id") != ticket_id or ticket.get("project_id") != project_id:
            return {"action": "IDENTITY_MISMATCH", "reason": "TICKET_IDENTITY_MISMATCH",
                    "project_id": project_id, "ticket_id": ticket_id}
        if project_domain and ticket.get("domain") != project_domain:
            return {"action": "IDENTITY_MISMATCH", "reason": "CROSS_DOMAIN_CHECKPOINT_LEAK",
                    "project_id": project_id, "ticket_id": ticket_id}
        if explicit_domain and ticket.get("domain") != explicit_domain:
            return {"action": "IDENTITY_MISMATCH", "reason": "EXPLICIT_DOMAIN_MISMATCH",
                    "project_id": project_id, "ticket_id": ticket_id}
        return {"action": "LOAD_TICKET", "context": {
            "context_id": f"ticket:{project_id}:{ticket_id}", "kind": "ticket",
            "project_id": project_id, "ticket_id": ticket_id,
            "domain_id": ticket.get("domain"), "source_lock": ticket.get("source_lock"),
            "acceptance": ticket.get("acceptance"), "next_action": ticket.get("next_action"),
        }}
    if len(tickets) > 1:
        return {"action": "ASK_CLARIFICATION", "reason": "MULTIPLE_TICKETS",
                "project_id": project_id, "ticket_candidates": sorted(tickets)}
    if len(tickets) == 1:
        only_ticket = next(iter(tickets))
        return _project_destination(project_id, only_ticket, project_checkpoints, explicit_domain)
    return {"action": "LOAD_PROJECT", "context": {
        "context_id": f"project:{project_id}", "kind": "project",
        "project_id": project_id, "domain_id": project_domain,
        "source_lock": project.get("source_lock"),
    }}


def _validate_destination_domain(result: dict[str, Any],
                               registry: list[dict[str, Any]]) -> dict[str, Any]:
    context = result.get("context") or {}
    domain_id = context.get("domain_id")
    entries = {item.get("id"): item for item in registry}
    entry = entries.get(domain_id)
    if not domain_id or entry is None:
        return {"action": "IDENTITY_MISMATCH",
                "reason": "PROJECT_DOMAIN_NOT_IN_NOTION_CONTEXT_REGISTRY",
                "domain_id": domain_id}
    expected_profile = entry.get("profile_path")
    actual_profile = context.get("profile_path")
    if expected_profile and actual_profile and actual_profile != expected_profile:
        return {"action": "IDENTITY_MISMATCH",
                "reason": "DOMAIN_PROFILE_PATH_MISMATCH",
                "domain_id": domain_id,
                "expected_profile_path": expected_profile,
                "actual_profile_path": actual_profile}
    expected_authority = entry.get("authority")
    actual_authority = context.get("authority")
    if expected_authority and actual_authority and actual_authority != expected_authority:
        return {"action": "IDENTITY_MISMATCH",
                "reason": "DOMAIN_AUTHORITY_MISMATCH",
                "domain_id": domain_id,
                "expected_authority": expected_authority,
                "actual_authority": actual_authority}
    if expected_profile and not actual_profile:
        context = {**context, "profile_path": expected_profile}
    if expected_authority and not actual_authority:
        context = {**context, "authority": expected_authority}
    result["context"] = context
    return result

def route_message(intent: dict[str, Any], *,
                  current_context: dict[str, Any] | None = None,
                  context_history: list[dict[str, Any]] | None = None,
                  project_checkpoints: dict[str, Any] | None = None,
                  persistent_route: dict[str, Any] | None = None,
                  registry: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Resolve current-message intent against a host-supplied Notion domain registry.

    Stateful/domain-routed requests fail closed when the Notion registry is absent or
    invalid. DOMAIN_CONTEXTS is a regression fixture, not a production fallback.
    time_gap_seconds is intentionally ignored.
    """
    project_checkpoints = project_checkpoints or {}
    context_history = context_history or []
    intent_type = intent.get("intent_type", "AMBIGUOUS")
    if intent_type not in INTENT_TYPES:
        return _preserve_active({"action": "ASK_CLARIFICATION", "reason": "INVALID_INTENT_TYPE"},
                                current_context)

    requires_notion_registry = not (
        intent_type == "AMBIGUOUS" or
        (intent_type == "STANDALONE" and not intent.get("domain_id"))
    )
    if requires_notion_registry and registry is None:
        return _preserve_active({"action": "BLOCKED",
                                 "reason": "NOTION_CONTEXT_REGISTRY_REQUIRED"},
                                current_context)
    registry = DOMAIN_CONTEXTS if registry is None else registry
    registry_errors = validate_domain_registry(registry)
    if registry_errors:
        return _preserve_active({"action": "BLOCKED",
                                 "reason": "NOTION_CONTEXT_REGISTRY_INVALID",
                                 "registry_errors": registry_errors},
                                current_context)

    if intent_type == "AMBIGUOUS":
        return _preserve_active({"action": "ASK_CLARIFICATION",
                                 "reason": "AMBIGUOUS_CURRENT_INTENT"},
                                current_context)

    if intent_type == "SWITCH_BACK":
        target_id = intent.get("context_id")
        target = next((item for item in reversed(context_history)
                       if item.get("context_id") == target_id), None)
        if not target:
            return _preserve_active({"action": "ASK_CLARIFICATION", "reason": "CONTEXT_NOT_IN_HISTORY"}, current_context)
        if target.get("kind") in {"project", "ticket"}:
            checked = _project_destination(target.get("project_id"),
                                           target.get("ticket_id"),
                                           project_checkpoints,
                                           target.get("domain_id"))
            if checked["action"] not in {"LOAD_PROJECT", "LOAD_TICKET"}:
                return _preserve_active(checked, current_context)
            checked = _validate_destination_domain(checked, registry)
            if checked["action"] != "LOAD_TICKET" and checked["action"] != "LOAD_PROJECT":
                return _preserve_active(checked, current_context)
            return _outgoing(checked, current_context, checked.get("context"))
        restored = _validate_destination_domain({"action": "RESTORE_CONTEXT", "context": target},
                                                 registry)
        if restored.get("action") != "RESTORE_CONTEXT":
            return _preserve_active(restored, current_context)
        return _outgoing(restored, current_context, restored["context"])

    project_id = intent.get("project_id")
    ticket_id = intent.get("ticket_id")
    explicit_domain = intent.get("domain_id")

    if project_id or intent_type == "PROJECT_TASK":
        if not project_id:
            if intent.get("use_persistent_route") and persistent_route:
                project_id = persistent_route.get("project_id")
                if not project_id:
                    return _preserve_active({"action": "ASK_CLARIFICATION", "reason": "PERSISTENT_ROUTE_HAS_NO_PROJECT"}, current_context)
            else:
                return _preserve_active({"action": "ASK_CLARIFICATION", "reason": "PROJECT_TARGET_REQUIRED"}, current_context)
        destination = _project_destination(project_id, ticket_id, project_checkpoints,
                                            explicit_domain)
        if destination.get("action") not in {"LOAD_PROJECT", "LOAD_TICKET"}:
            return _preserve_active(destination, current_context)
        destination = _validate_destination_domain(destination, registry)
        if destination.get("action") not in {"LOAD_PROJECT", "LOAD_TICKET"}:
            return _preserve_active(destination, current_context)
        return _outgoing(destination, current_context, destination.get("context"))

    if intent_type == "CONTINUE":
        if not intent.get("continuation_clear") or not current_context:
            return _preserve_active({"action": "ASK_CLARIFICATION", "reason": "CONTINUATION_NOT_UNAMBIGUOUS"}, current_context)
        if current_context.get("kind") in {"project", "ticket"}:
            checked = _project_destination(current_context.get("project_id"),
                                           current_context.get("ticket_id"),
                                           project_checkpoints,
                                           current_context.get("domain_id"))
            if checked["action"] not in {"LOAD_PROJECT", "LOAD_TICKET"}:
                return _preserve_active(checked, current_context)
            checked = _validate_destination_domain(checked, registry)
            if checked["action"] not in {"LOAD_PROJECT", "LOAD_TICKET"}:
                return _preserve_active(checked, current_context)
            return _outgoing({"action": "CONTINUE_CONTEXT", "context": checked["context"]},
                             current_context, checked["context"])
        checked = _validate_destination_domain(
            {"action": "CONTINUE_CONTEXT", "context": current_context}, registry
        )
        if checked.get("action") != "CONTINUE_CONTEXT":
            return _preserve_active(checked, current_context)
        return _outgoing(checked, current_context, checked["context"])

    if intent_type == "STANDALONE" and not explicit_domain:
        return _standby({"action": "DIRECT_ANSWER"}, current_context)

    domain_result = resolve_domain(intent.get("message", ""), explicit_domain, registry)
    if domain_result["status"] == "AMBIGUOUS_DOMAIN":
        return _preserve_active({"action": "ASK_CLARIFICATION", "reason": "AMBIGUOUS_DOMAIN",
                                 "candidates": domain_result["candidates"]}, current_context)
    if domain_result["status"] != "RESOLVED":
        return _standby({"action": "UNKNOWN_DOMAIN", "reason": "INTAKE_AND_RESEARCH_REQUIRED"}, current_context)
    domain = domain_result["domain"]
    segment_id = intent.get("segment_id")
    context_id = f"ephemeral:{domain['id']}:{segment_id}" if segment_id else f"ephemeral:{domain['id']}"
    destination = {
        "context_id": context_id, "kind": "ephemeral",
        "domain_id": domain["id"], "profile_path": domain["profile_path"],
        "authority": domain["authority"],
    }
    return _outgoing({"action": "EPHEMERAL_CONTEXT", "context": destination},
                     current_context, destination)



def route_message_with_repository_control(
    intent: dict[str, Any], *,
    project_introduction: dict[str, Any],
    requirements: list[dict[str, Any]],
    notion_repository_route: dict[str, Any],
    role_work_packages: list[dict[str, Any]],
    repository_catalog: list[dict[str, Any]] | None = None,
    installations: list[dict[str, Any]] | None = None,
    repositories_by_installation: list[dict[str, Any]] | None = None,
    usage_rows: list[dict[str, Any]] | None = None,
    budget_rows: list[dict[str, Any]] | None = None,
    owner_report: dict[str, Any] | None = None,
    current_context: dict[str, Any] | None = None,
    context_history: list[dict[str, Any]] | None = None,
    project_checkpoints: dict[str, Any] | None = None,
    persistent_route: dict[str, Any] | None = None,
    registry: list[dict[str, Any]] | None = None,
    ci_required: bool = False,
    state: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compose Notion-first context routing with requirement-scoped repo/role resolution.

    Project Introduction contributes only project/goal routing identifiers. Its
    repository hints are ignored. The active host supplies live Notion and GitHub
    data; this function does not perform provider I/O or claim host activation.
    """
    try:
        from .repository_control_plane import (
            project_introduction_route, resolve_task_repositories,
            resume_role_work_package, ready_parallel_work_packages,
            project_state_projection, normalize_repository_inventory,
            compute_actions_usage_projection,
        )
    except ImportError:
        from repository_control_plane import (
            project_introduction_route, resolve_task_repositories,
            resume_role_work_package, ready_parallel_work_packages,
            project_state_projection,
        )

    intro_route = project_introduction_route(project_introduction or {})
    routed_intent = dict(intent)
    if (routed_intent.get("intent_type") == "PROJECT_TASK"
            and not routed_intent.get("project_id") and intro_route.get("project_id")):
        routed_intent["project_id"] = intro_route["project_id"]

    context_route = route_message(
        routed_intent,
        current_context=current_context,
        context_history=context_history,
        project_checkpoints=project_checkpoints,
        persistent_route=persistent_route,
        registry=registry,
    )
    result = {
        "project_introduction_route": intro_route,
        "context_route": context_route,
        "repository_resolution": None,
        "repository_inventory": None,
        "usage_projection": None,
        "role_package_states": [],
        "parallel_batches": [],
    }

    # A durable destination is not active until the outgoing cursor has been
    # persisted and read back. Do not prematurely bind execution state.
    if context_route.get("action") == "PERSIST_OUTGOING_CURSOR":
        result.update({
            "action": "PENDING_CONTEXT_TRANSITION",
            "reason": "OUTGOING_CURSOR_READBACK_REQUIRED",
        })
        return result

    context = context_route.get("context") or context_route.get("active_context") or {}
    if context.get("kind") not in {"project", "ticket"}:
        result.update({"action": context_route.get("action", "CONTEXT_ROUTING_ONLY")})
        return result
    if context_route.get("context_state") != "ACTIVE":
        result.update({"action": "PENDING_CONTEXT_TRANSITION",
                       "reason": "DURABLE_CONTEXT_NOT_ACTIVE"})
        return result
    if not requirements:
        result.update({"action": "REPOSITORY_ROUTE_UNRESOLVED",
                       "reason": "NOTION_REQUIREMENTS_REQUIRED"})
        return result
    if not notion_repository_route:
        result.update({"action": "REPOSITORY_ROUTE_UNRESOLVED",
                       "reason": "NOTION_REPOSITORY_ROUTE_REQUIRED"})
        return result
    if not role_work_packages:
        result.update({"action": "ROLE_PACKAGE_REQUIRED",
                       "reason": "PRIMARY_SPECIALIST_WORK_PACKAGE_REQUIRED"})
        return result

    if repository_catalog is None:
        inventory = normalize_repository_inventory(
            installations or [], repositories_by_installation or []
        )
        result["repository_inventory"] = inventory
        if inventory.get("state") not in {
            "VERIFIED_COMPLETE_FOR_CONNECTED_INSTALLATIONS", "PARTIAL"
        }:
            result.update({"action": "REPOSITORY_INVENTORY_UNAVAILABLE",
                           "reason": inventory.get("state")})
            return result
        repository_catalog = inventory.get("repositories", [])

    if usage_rows is not None or budget_rows is not None or owner_report is not None:
        result["usage_projection"] = compute_actions_usage_projection(
            usage_rows, budget_rows, owner_report
        )

    repository_resolution = resolve_task_repositories(
        requirements, repository_catalog, notion_repository_route,
        ci_required=ci_required,
    )
    result["repository_resolution"] = repository_resolution
    if repository_resolution.get("state") != "RESOLVED":
        result.update({"action": "REPOSITORY_ROUTE_UNRESOLVED",
                       "reason": repository_resolution.get("state")})
        return result

    requirement_ids = {item.get("requirement_id") for item in requirements}
    relevant_packages = [
        package for package in role_work_packages
        if requirement_ids.intersection(package.get("requirement_ids", []))
    ]
    if not relevant_packages:
        result.update({"action": "ROLE_PACKAGE_REQUIRED",
                       "reason": "NO_ROLE_PACKAGE_MATCHES_CURRENT_REQUIREMENTS"})
        return result

    role_states = [
        resume_role_work_package(package) for package in relevant_packages
    ]
    invalid = [item for item in role_states
               if item.get("state") in {"INVALID_WORK_PACKAGE", "ROLE_BUNDLE_INCOMPLETE",
                                        "DONE_WITHOUT_EVIDENCE"}]
    if invalid:
        result.update({"action": "ROLE_PACKAGE_INVALID",
                       "reason": "ROLE_PACKAGE_CONTRACT_FAILED",
                       "role_package_errors": invalid})
        return result

    result.update({
        "action": "LOAD_TASK_EXECUTION_CONTEXT",
        "repository_resolution": repository_resolution,
        "role_package_states": role_states,
        "parallel_batches": ready_parallel_work_packages(relevant_packages),
        "state_projection": project_state_projection(state or {}),
        "active_role_id": next((
            item.get("role_id") for item in role_states
            if item.get("state") in {"CONTINUE_SAME_ROLE", "START_SAME_ROLE",
                                     "BLOCKED_SAME_ROLE"}
        ), None),
    })
    return result


def classify_actions_quota(evidence: dict[str, Any] | None) -> dict[str, Any]:
    """Classify provider evidence; generic API failures never imply Actions quota."""
    if not evidence:
        return {"state": "UNKNOWN", "reason": "NO_PROVIDER_EVIDENCE"}
    message = str(evidence.get("message", "")).casefold()
    product = str(evidence.get("product", "")).casefold()
    billing_owner = evidence.get("billing_owner")
    billing_period = evidence.get("billing_period")
    evidence_source = evidence.get("evidence_source")
    quota_phrase = any(phrase in message for phrase in (
        "actions minutes exhausted", "github actions minutes exceeded",
        "actions spending limit exceeded", "actions budget limit exceeded",
        "actions usage limit reached",
    ))
    if (quota_phrase and "actions" in product and billing_owner and billing_period
            and evidence_source):
        return {"state": "QUOTA_EXHAUSTED", "billing_owner": billing_owner,
                "billing_period": billing_period, "evidence_source": evidence_source}
    if evidence.get("rate_limit_remaining") == 0 or "api rate limit exceeded" in message:
        return {"state": "API_RATE_LIMITED",
                "reset_at": evidence.get("rate_limit_reset") or evidence.get("retry_after")}
    if evidence.get("permission_denied") is True or (
        evidence.get("http_status") == 403 and
        any(term in message for term in ("permission denied", "resource not accessible",
                                         "not authorized", "forbidden"))
    ):
        return {"state": "PERMISSION_DENIED"}
    if evidence.get("executed_step") and evidence.get("failure_log"):
        return {"state": "WORKFLOW_FAILED", "failed_step": evidence["executed_step"]}
    if evidence.get("runner_capacity_failure") is True:
        return {"state": "RUNNER_UNAVAILABLE"}
    return {"state": "UNKNOWN", "reason": "NO_EXPLICIT_BILLING_OR_EXECUTION_CAUSE"}


def select_staging_repository(candidates: list[dict[str, Any]], *,
                              exhausted_billing_owner: str,
                              excluded_owners: tuple[str, ...] = ("huyquanghan-apps",)
                              ) -> dict[str, Any] | None:
    """Choose only an authorized private target with independently verified quota."""
    for repo in candidates:
        owner = repo.get("owner")
        if not owner or owner.casefold() in {x.casefold() for x in excluded_owners}:
            continue
        if repo.get("visibility") != "private" or repo.get("push") is not True:
            continue
        if repo.get("billing_owner") != owner or owner == exhausted_billing_owner:
            continue
        if repo.get("actions_quota_state") != "AVAILABLE_VERIFIED":
            continue
        if not repo.get("quota_evidence_source") or not repo.get("quota_period"):
            continue
        return repo
    return None


def build_sync_pending_manifest(*, upstream: dict[str, str],
                                staging: dict[str, str],
                                quota: dict[str, Any]) -> dict[str, Any]:
    if quota.get("state") != "QUOTA_EXHAUSTED":
        raise ValueError("STAGING_REQUIRES_CONFIRMED_QUOTA_EXHAUSTION")
    required_upstream = ("repository", "ref", "base_sha")
    required_staging = ("repository", "ref", "sha")
    if any(not upstream.get(key) for key in required_upstream):
        raise ValueError("UPSTREAM_SOURCE_IDENTITY_INCOMPLETE")
    if any(not staging.get(key) for key in required_staging):
        raise ValueError("STAGING_SOURCE_IDENTITY_INCOMPLETE")
    return {
        "status": "SYNC_PENDING",
        "upstream": upstream,
        "staging": staging,
        "quota": quota,
        "sync_rule": "preserve-upstream-identity; sync-after-quota-recovery; verify-resulting-sha",
    }


class ContextSwitchingRegressionTests(unittest.TestCase):
    def route(self, intent, **kwargs):
        kwargs.setdefault("registry", DOMAIN_CONTEXTS)
        return route_message(intent, **kwargs)

    def setUp(self):
        self.projects = {
            "papaya": {
                "project": {
                    "project_id": "papaya", "domain": "career-interview",
                    "source_lock": {"repository": "private/career", "ref": "papaya", "sha": "abc"},
                },
                "tickets": {
                    "papaya-assessment": {
                        "project_id": "papaya", "ticket_id": "papaya-assessment",
                        "domain": "career-interview",
                        "source_lock": {"repository": "private/career", "ref": "papaya", "sha": "abc"},
                        "acceptance": ["Q1", "Q5"], "next_action": "Complete Q1",
                    }
                },
            },
            "multi": {
                "project": {"project_id": "multi", "domain": "software-engineering"},
                "tickets": {
                    "one": {"project_id": "multi", "ticket_id": "one", "domain": "software-engineering"},
                    "two": {"project_id": "multi", "ticket_id": "two", "domain": "software-engineering"},
                },
            },
        }
        self.papaya_context = {
            "context_id": "ticket:papaya:papaya-assessment", "kind": "ticket",
            "project_id": "papaya", "ticket_id": "papaya-assessment",
            "domain_id": "career-interview",
        }

    def test_registry_has_unique_profiles_and_aliases(self):
        self.assertEqual([], validate_domain_registry())

    def test_new_topic_does_not_load_previous_project_checkpoint(self):
        result = self.route(
            {"intent_type": "NEW_TOPIC", "message": "Explain Kubernetes networking",
             "segment_id": "topic-2"},
            current_context=self.papaya_context, project_checkpoints=self.projects,
        )
        self.assertEqual("EPHEMERAL_CONTEXT", result["action"])
        self.assertEqual("software-engineering", result["context"]["domain_id"])
        self.assertEqual("ticket:papaya:papaya-assessment",
                         result["outgoing_context"]["context_id"])
        self.assertTrue(result["outgoing_persistence_required"])

    def test_explicit_finance_topic_uses_professional_domain_profile(self):
        result = self.route({"intent_type": "NEW_TOPIC", "message": "finance"})
        self.assertEqual("professional-domains", result["context"]["domain_id"])

    def test_switch_back_restores_exact_ticket_cursor(self):
        result = self.route(
            {"intent_type": "SWITCH_BACK", "context_id": "ticket:papaya:papaya-assessment"},
            current_context={"context_id": "ephemeral:software-engineering:topic-2",
                             "kind": "ephemeral", "domain_id": "software-engineering"},
            context_history=[self.papaya_context], project_checkpoints=self.projects,
        )
        self.assertEqual("LOAD_TICKET", result["action"])
        self.assertEqual("Complete Q1", result["context"]["next_action"])
        self.assertEqual("abc", result["context"]["source_lock"]["sha"])

    def test_ambiguous_continue_asks_instead_of_using_latest_timestamp(self):
        result = self.route({"intent_type": "CONTINUE", "continuation_clear": False},
                               current_context=None, project_checkpoints=self.projects)
        self.assertEqual("ASK_CLARIFICATION", result["action"])

    def test_clear_continue_is_independent_of_elapsed_time(self):
        a = self.route({"intent_type": "CONTINUE", "continuation_clear": True,
                           "time_gap_seconds": 60}, current_context=self.papaya_context,
                          project_checkpoints=self.projects)
        b = self.route({"intent_type": "CONTINUE", "continuation_clear": True,
                           "time_gap_seconds": 60 * 60 * 24 * 90},
                          current_context=self.papaya_context,
                          project_checkpoints=self.projects)
        self.assertEqual(a, b)
        self.assertEqual("CONTINUE_CONTEXT", b["action"])

    def test_project_task_does_not_silently_use_persistent_route(self):
        result = self.route({"intent_type": "PROJECT_TASK"},
                               persistent_route={"project_id": "papaya"},
                               project_checkpoints=self.projects)
        self.assertEqual("ASK_CLARIFICATION", result["action"])

    def test_project_task_uses_route_only_when_intent_authorizes_default(self):
        result = self.route({"intent_type": "PROJECT_TASK", "use_persistent_route": True},
                               persistent_route={"project_id": "papaya"},
                               project_checkpoints=self.projects)
        self.assertEqual("LOAD_TICKET", result["action"])
        self.assertEqual("papaya-assessment", result["context"]["ticket_id"])

    def test_multiple_tickets_require_clarification(self):
        result = self.route({"intent_type": "PROJECT_TASK", "project_id": "multi"},
                               project_checkpoints=self.projects)
        self.assertEqual("ASK_CLARIFICATION", result["action"])
        self.assertEqual(["one", "two"], result["ticket_candidates"])

    def test_cross_project_ticket_injection_is_rejected(self):
        self.projects["papaya"]["tickets"]["papaya-assessment"]["project_id"] = "other"
        result = self.route({"intent_type": "PROJECT_TASK", "project_id": "papaya",
                                "ticket_id": "papaya-assessment"},
                               project_checkpoints=self.projects)
        self.assertEqual("IDENTITY_MISMATCH", result["action"])

    def test_explicit_domain_mismatch_is_rejected(self):
        result = self.route({"intent_type": "PROJECT_TASK", "project_id": "papaya",
                                "ticket_id": "papaya-assessment",
                                "domain_id": "software-engineering"},
                               project_checkpoints=self.projects)
        self.assertEqual("IDENTITY_MISMATCH", result["action"])

    def test_generic_403_does_not_prove_quota_exhaustion(self):
        result = classify_actions_quota({"http_status": 403, "message": "Forbidden"})
        self.assertNotEqual("QUOTA_EXHAUSTED", result["state"])
        self.assertEqual("UNKNOWN", result["state"])

    def test_api_rate_limit_is_not_actions_quota(self):
        result = classify_actions_quota({"http_status": 403,
                                         "message": "API rate limit exceeded"})
        self.assertEqual("API_RATE_LIMITED", result["state"])

    def test_explicit_billing_evidence_confirms_quota(self):
        result = classify_actions_quota({
            "product": "GitHub Actions", "message": "GitHub Actions minutes exceeded",
            "billing_owner": "org-a", "billing_period": "2026-11",
            "evidence_source": "billing-api-response",
        })
        self.assertEqual("QUOTA_EXHAUSTED", result["state"])
        self.assertEqual("org-a", result["billing_owner"])

    def test_quota_phrase_without_owner_period_and_source_is_unknown(self):
        result = classify_actions_quota({"product": "GitHub Actions",
                                         "message": "Actions minutes exhausted"})
        self.assertEqual("UNKNOWN", result["state"])

    def test_staging_requires_private_write_access_and_verified_distinct_quota(self):
        candidates = [
            {"owner": "org-a", "visibility": "private", "push": True,
             "billing_owner": "org-a", "actions_quota_state": "UNKNOWN"},
            {"owner": "org-b", "visibility": "public", "push": True,
             "billing_owner": "org-b", "actions_quota_state": "AVAILABLE_VERIFIED",
             "quota_evidence_source": "billing-api", "quota_period": "2026-11"},
            {"owner": "huyquanghan-apps", "visibility": "private", "push": True,
             "billing_owner": "huyquanghan-apps", "actions_quota_state": "AVAILABLE_VERIFIED",
             "quota_evidence_source": "billing-api", "quota_period": "2026-11"},
            {"owner": "org-b", "visibility": "private", "push": True,
             "billing_owner": "org-b", "actions_quota_state": "AVAILABLE_VERIFIED",
             "quota_evidence_source": "billing-api", "quota_period": "2026-11"},
        ]
        selected = select_staging_repository(candidates, exhausted_billing_owner="org-a")
        self.assertEqual("org-b", selected["owner"])

    def test_no_staging_target_when_quota_is_not_verified(self):
        candidates = [{"owner": "org-b", "visibility": "private", "push": True,
                       "billing_owner": "org-b", "actions_quota_state": "UNKNOWN"}]
        self.assertIsNone(select_staging_repository(candidates,
                                                    exhausted_billing_owner="org-a"))

    def test_sync_pending_manifest_preserves_both_source_identities(self):
        quota = {"state": "QUOTA_EXHAUSTED", "billing_owner": "org-a",
                 "billing_period": "2026-11", "evidence_source": "billing-api"}
        manifest = build_sync_pending_manifest(
            upstream={"repository": "org-a/private-repo", "ref": "main", "base_sha": "aaa"},
            staging={"repository": "org-b/private-stage", "ref": "stage/context-switch", "sha": "bbb"},
            quota=quota,
        )
        self.assertEqual("SYNC_PENDING", manifest["status"])
        self.assertEqual("aaa", manifest["upstream"]["base_sha"])
        self.assertEqual("bbb", manifest["staging"]["sha"])

    def test_staging_manifest_rejects_unconfirmed_quota(self):
        with self.assertRaises(ValueError):
            build_sync_pending_manifest(
                upstream={"repository": "a/r", "ref": "main", "base_sha": "aaa"},
                staging={"repository": "b/r", "ref": "stage", "sha": "bbb"},
                quota={"state": "UNKNOWN"},
            )


    def test_new_topic_transitions_outgoing_standby_and_destination_active(self):
        result = self.route({"intent_type": "NEW_TOPIC", "message": "Kubernetes deployment"},
                            current_context=self.papaya_context)
        self.assertEqual("PERSIST_OUTGOING_CURSOR", result["action"])
        self.assertEqual("PENDING_OUTGOING_PERSISTENCE", result["transition_state"])
        self.assertEqual("ACTIVE", result["context_state"])
        self.assertEqual(self.papaya_context["context_id"], result["active_context"]["context_id"])
        self.assertEqual("PENDING_ACTIVATION", result["destination_context"]["context_state"])
        committed = commit_context_transition(
            result, outgoing_persisted=True, outgoing_readback_verified=True,
            readback_context_id=self.papaya_context["context_id"],
        )
        self.assertEqual("STANDBY", committed["outgoing_context"]["context_state"])
        self.assertEqual("ACTIVE", committed["context"]["context_state"])
        self.assertEqual("software-engineering", committed["active_context"]["domain_id"])
        self.assertEqual("COMMITTED", committed["transition_state"])



    def test_direct_answer_returns_durable_context_to_standby(self):
        result = self.route({"intent_type": "STANDALONE"}, current_context=self.papaya_context)
        self.assertEqual("PERSIST_OUTGOING_CURSOR", result["action"])
        self.assertEqual("ACTIVE", result["context_state"])
        self.assertEqual(self.papaya_context["context_id"], result["active_context"]["context_id"])
        self.assertEqual("DIRECT_ANSWER", result["pending_action"])
        committed = commit_context_transition(
            result, outgoing_persisted=True, outgoing_readback_verified=True,
            readback_context_id=self.papaya_context["context_id"],
        )
        self.assertEqual("DIRECT_ANSWER", committed["action"])
        self.assertEqual("STANDBY", committed["context_state"])
        self.assertIsNone(committed["active_context"])
        self.assertEqual("STANDBY", committed["outgoing_context"]["context_state"])



    def test_ambiguous_intent_preserves_current_active_context(self):
        result = self.route({"intent_type": "AMBIGUOUS"}, current_context=self.papaya_context)
        self.assertEqual("ASK_CLARIFICATION", result["action"])
        self.assertEqual("ACTIVE", result["context_state"])
        self.assertEqual(self.papaya_context["context_id"], result["active_context"]["context_id"])

    def test_missing_notion_registry_fails_closed_for_new_domain(self):
        result = route_message({"intent_type": "NEW_TOPIC", "message": "kubernetes"})
        self.assertEqual("BLOCKED", result["action"])
        self.assertEqual("NOTION_CONTEXT_REGISTRY_REQUIRED", result["reason"])

    def test_switch_back_standbys_outgoing_and_activates_restored_context(self):
        current = {"context_id": "ephemeral:software-engineering:topic-2",
                   "kind": "ephemeral", "domain_id": "software-engineering"}
        result = self.route(
            {"intent_type": "SWITCH_BACK", "context_id": "ticket:papaya:papaya-assessment"},
            current_context=current, context_history=[self.papaya_context],
            project_checkpoints=self.projects,
        )
        self.assertEqual("STANDBY", result["outgoing_context"]["context_state"])
        self.assertEqual("ACTIVE", result["context"]["context_state"])
        self.assertEqual("ACTIVE", result["context_state"])

    def test_completion_rejects_missing_acceptance_and_keeps_context_active(self):
        result = complete_context(
            self.papaya_context, ticket_status="Done", all_musts_verified=False,
            ai_owned_work_exhausted=True, adversarial_review_passed=True,
            writes_read_back=True,
        )
        self.assertEqual("KEEP_ACTIVE", result["action"])
        self.assertIn("MUST_ACCEPTANCE_INCOMPLETE", result["missing"])

    def test_completion_requires_ticket_done_before_standby(self):
        result = complete_context(
            self.papaya_context, ticket_status="In Progress", all_musts_verified=True,
            ai_owned_work_exhausted=True, adversarial_review_passed=True,
            writes_read_back=True,
        )
        self.assertEqual("CLOSE_TICKET_REQUIRED", result["action"])
        self.assertEqual("ACTIVE", result["context_state"])

    def test_done_ticket_with_all_gates_returns_context_to_standby(self):
        result = complete_context(
            self.papaya_context, ticket_status="Done", all_musts_verified=True,
            ai_owned_work_exhausted=True, adversarial_review_passed=True,
            writes_read_back=True, ticket_done_read_back=True,
        )
        self.assertEqual("RETURN_TO_STANDBY", result["action"])
        self.assertEqual("STANDBY", result["context_state"])
        self.assertIsNone(result["active_context"])



    def test_each_session_routing_result_is_independent(self):
        first = self.route({"intent_type": "NEW_TOPIC", "message": "Kubernetes"},
                           current_context=self.papaya_context)
        second = self.route({"intent_type": "STANDALONE"}, current_context=None)
        self.assertEqual("ACTIVE", first["context_state"])
        self.assertEqual(self.papaya_context["context_id"], first["active_context"]["context_id"])
        self.assertEqual("STANDBY", second["context_state"])
        self.assertIsNone(second["active_context"])
        committed = commit_context_transition(
            first, outgoing_persisted=True, outgoing_readback_verified=True,
            readback_context_id=self.papaya_context["context_id"],
        )
        self.assertEqual("ACTIVE", committed["context_state"])
        self.assertEqual("STANDBY", second["context_state"])



    def test_invalid_notion_registry_fails_closed(self):
        result = route_message(
            {"intent_type": "NEW_TOPIC", "message": "kubernetes"},
            registry=[{"id": "duplicate"}, {"id": "duplicate"}],
        )
        self.assertEqual("BLOCKED", result["action"])
        self.assertEqual("NOTION_CONTEXT_REGISTRY_INVALID", result["reason"])

    def test_project_domain_must_exist_in_notion_registry(self):
        projects = {
            "unknown-domain": {
                "project": {"project_id": "unknown-domain", "domain": "unregistered-domain"},
                "tickets": {},
            }
        }
        result = self.route(
            {"intent_type": "PROJECT_TASK", "project_id": "unknown-domain"},
            project_checkpoints=projects,
        )
        self.assertEqual("IDENTITY_MISMATCH", result["action"])
        self.assertEqual("PROJECT_DOMAIN_NOT_IN_NOTION_CONTEXT_REGISTRY", result["reason"])


    def test_switch_transition_order_requires_readback_for_durable_context(self):
        result = self.route({"intent_type": "NEW_TOPIC", "message": "Kubernetes"},
                            current_context=self.papaya_context)
        self.assertEqual("PERSIST_OUTGOING_CURSOR", result["action"])
        self.assertEqual("ACTIVE", result["context_state"])
        self.assertEqual("PENDING_ACTIVATION", result["destination_context"]["context_state"])
        self.assertEqual(
            ["PERSIST_OUTGOING_CURSOR", "READ_BACK_OUTGOING_CURSOR",
             "SET_OUTGOING_STANDBY", "ACTIVATE_DESTINATION"],
            result["transition_order"],
        )



    def test_missing_project_domain_fails_closed(self):
        projects = {"no-domain": {"project": {"project_id": "no-domain"}, "tickets": {}}}
        result = self.route(
            {"intent_type": "PROJECT_TASK", "project_id": "no-domain"},
            project_checkpoints=projects,
        )
        self.assertEqual("IDENTITY_MISMATCH", result["action"])
        self.assertEqual("PROJECT_DOMAIN_NOT_IN_NOTION_CONTEXT_REGISTRY", result["reason"])

    def test_done_transition_requires_ticket_done_readback_order(self):
        result = complete_context(
            self.papaya_context, ticket_status="In Progress", all_musts_verified=True,
            ai_owned_work_exhausted=True, adversarial_review_passed=True,
            writes_read_back=True,
        )
        self.assertEqual(
            ["UPDATE_TICKET_DONE", "READ_BACK_TICKET_DONE", "RETURN_TO_STANDBY"],
            result["transition_order"],
        )


    def test_project_profile_path_must_match_notion_registry(self):
        projects = {
            "papaya": {
                "project": {"project_id": "papaya", "domain": "career-interview",
                            "profile_path": "domain-packs/wrong-profile.md"},
                "tickets": {"papaya-assessment": {"ticket_id": "papaya-assessment"}},
            }
        }
        result = self.route(
            {"intent_type": "PROJECT_TASK", "project_id": "papaya",
             "ticket_id": "papaya-assessment"},
            project_checkpoints=projects,
        )
        self.assertEqual("IDENTITY_MISMATCH", result["action"])
        self.assertEqual("DOMAIN_PROFILE_PATH_MISMATCH", result["reason"])

    def test_project_context_inherits_profile_pointer_from_notion_registry(self):
        projects = {
            "papaya": {
                "project": {"project_id": "papaya", "domain": "career-interview"},
                "tickets": {"papaya-assessment": {"ticket_id": "papaya-assessment"}},
            }
        }
        result = self.route(
            {"intent_type": "PROJECT_TASK", "project_id": "papaya",
             "ticket_id": "papaya-assessment"},
            project_checkpoints=projects,
        )
        self.assertEqual("LOAD_TICKET", result["action"])
        self.assertEqual("domain-packs/career-interview.md",
                         result["context"]["profile_path"])
        self.assertTrue(result["context"]["authority"])

    def test_failed_outgoing_cursor_save_keeps_current_active(self):
        result = self.route({"intent_type": "NEW_TOPIC", "message": "Kubernetes"},
                            current_context=self.papaya_context)
        blocked = commit_context_transition(
            result, outgoing_persisted=False, outgoing_readback_verified=False,
            readback_context_id=None,
        )
        self.assertEqual("BLOCKED", blocked["action"])
        self.assertEqual("OUTGOING_CURSOR_SAVE_FAILED", blocked["reason"])
        self.assertEqual("ACTIVE", blocked["context_state"])
        self.assertEqual(self.papaya_context["context_id"], blocked["active_context"]["context_id"])
        self.assertEqual("ACTIVE", blocked["outgoing_context"]["context_state"])

    def test_outgoing_cursor_readback_identity_mismatch_keeps_current_active(self):
        result = self.route({"intent_type": "NEW_TOPIC", "message": "Kubernetes"},
                            current_context=self.papaya_context)
        blocked = commit_context_transition(
            result, outgoing_persisted=True, outgoing_readback_verified=True,
            readback_context_id="ticket:another-project:another-ticket",
        )
        self.assertEqual("BLOCKED", blocked["action"])
        self.assertEqual("OUTGOING_CURSOR_IDENTITY_MISMATCH", blocked["reason"])
        self.assertEqual("ACTIVE", blocked["context_state"])
        self.assertEqual(self.papaya_context["context_id"], blocked["active_context"]["context_id"])

    def test_done_ticket_status_without_ticket_done_readback_keeps_context_active(self):
        result = complete_context(
            self.papaya_context, ticket_status="Done", all_musts_verified=True,
            ai_owned_work_exhausted=True, adversarial_review_passed=True,
            writes_read_back=True, ticket_done_read_back=False,
        )
        self.assertEqual("KEEP_ACTIVE", result["action"])
        self.assertEqual("ACTIVE", result["context_state"])
        self.assertIn("TICKET_DONE_NOT_READ_BACK", result["missing"])

    def test_ai_tooling_domain_profile_routes_by_current_requirements(self):
        result = self.route({
            "intent_type": "NEW_TOPIC",
            "message": "Update the ChatGPT plugin, agent skills and MCP tool integration",
        })
        self.assertEqual("EPHEMERAL_CONTEXT", result["action"])
        self.assertEqual("ai-tooling-lifecycle", result["context"]["domain_id"])
        self.assertEqual("domain-packs/ai-tooling-lifecycle.md", result["context"]["profile_path"])
        self.assertIn("plugin-creator-for-live-chatgpt-plugin", result["context"]["authority"])


if __name__ == "__main__":
    unittest.main()
