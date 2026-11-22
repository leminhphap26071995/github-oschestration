import unittest

from scripts.context_switching import DOMAIN_CONTEXTS, route_message_with_repository_control
from scripts.repository_control_plane import (
    project_introduction_route, project_state_projection,
    ready_parallel_work_packages, resolve_task_repositories,
    resume_role_work_package, work_package_completion_gate,
    normalize_repository_inventory, compute_actions_usage_projection,
)


class RepositoryControlPlaneTests(unittest.TestCase):
    def setUp(self):
        self.repos = [
            {"full_name": "org/private-core", "owner": "org", "visibility": "private",
             "archived": False, "default_branch": "main",
             "permissions": {"push": True},
             "actions_usage": {"state": "REPORTED_QUOTA_EXHAUSTED", "billing_owner": "org"},
             "runner_availability": {"state": "UNKNOWN"}},
            {"full_name": "user/public-runner", "owner": "user", "visibility": "public",
             "archived": False, "default_branch": "main",
             "permissions": {"push": True},
             "actions_usage": {"state": "UNKNOWN", "billing_owner": "user"},
             "runner_availability": {"state": "AVAILABLE_VERIFIED", "evidence_ref": "run:45049088239"}},
        ]
        self.requirements = [{"requirement_id": "R1"}, {"requirement_id": "R2"}]
        self.route = {"requirement_repositories": [
            {"repository": "org/private-core", "relationship": "SOURCE",
             "requirement_ids": ["R1", "R2"], "notion_access": "GRANTED", "ref": "main"},
            {"repository": "user/public-runner", "relationship": "EXECUTION",
             "requirement_ids": ["R1", "R2"], "notion_access": "GRANTED",
             "data_classification": "SANITIZED_GENERIC", "task_scoped_active": True},
        ]}

    def test_project_introduction_only_routes_to_notion(self):
        result = project_introduction_route({
            "project_id": "p1", "goal_id": "g1",
            "repository": "wrong/private-repo",
        })
        self.assertEqual("RESOLVE_NOTION_PROJECT_AND_REQUIREMENTS", result["action"])
        self.assertEqual("NOTION_REQUIREMENT_SCOPED_ACCESS", result["repository_authority"])
        self.assertTrue(result["ignore_project_intro_repository_hints"])

    def test_public_visibility_is_not_blanket_blocker_for_sanitized_work(self):
        result = resolve_task_repositories(self.requirements, self.repos, self.route)
        self.assertEqual("RESOLVED", result["state"])
        self.assertEqual("user/public-runner",
                         result["active_execution_repository"]["full_name"])

    def test_public_repo_rejected_for_private_payload_but_private_source_still_mapped(self):
        route = {"requirement_repositories": [
            {"repository": "org/private-core", "relationship": "SOURCE",
             "requirement_ids": ["R1", "R2"], "notion_access": "GRANTED"},
            {"repository": "user/public-runner", "relationship": "EXECUTION",
             "requirement_ids": ["R1", "R2"], "notion_access": "GRANTED",
             "data_classification": "PRIVATE", "task_scoped_active": True},
        ]}
        result = resolve_task_repositories(self.requirements, self.repos, route)
        self.assertEqual("NO_ELIGIBLE_EXECUTION_REPOSITORY", result["state"])

    def test_ci_requires_verified_runner_availability_not_billing_usage(self):
        result = resolve_task_repositories(self.requirements, self.repos, self.route, ci_required=True)
        self.assertEqual("RESOLVED", result["state"])
        self.assertEqual("user/public-runner",
                         result["active_execution_repository"]["full_name"])
        self.assertEqual("UNKNOWN", result["active_execution_repository"]["actions_usage"]["state"])
        self.assertEqual("AVAILABLE_VERIFIED", result["active_execution_repository"]["runner_availability"]["state"])

    def test_unmapped_requirement_is_not_silently_dropped(self):
        route = {"requirement_repositories": [
            {"repository": "org/private-core", "relationship": "SOURCE",
             "requirement_ids": ["R1"], "notion_access": "GRANTED"},
            {"repository": "user/public-runner", "relationship": "EXECUTION",
             "requirement_ids": ["R1"], "notion_access": "GRANTED",
             "data_classification": "SANITIZED_GENERIC"},
        ]}
        result = resolve_task_repositories(self.requirements, self.repos, route)
        self.assertEqual("REQUIREMENTS_UNMAPPED", result["state"])
        self.assertEqual(["R2"], result["unmapped_requirement_ids"])

    def test_unfinished_role_package_resumes_same_role(self):
        package = {
            "work_package_id": "WP-01", "requirement_ids": ["R4"],
            "role_id": "ai-native-tooling-engineer", "role_bundle_version": "1",
            "deliverables": ["plugin update"], "dependencies": [],
            "acceptance_evidence": [], "status": "IN_PROGRESS",
            "first_unmet_criterion": "update skill", "next_action": "implement",
            "source_sha": "abc123", "last_result": "source inspection complete",
            "role_artifacts": ["SKILL.md", "mindset.md", "knowledge.md", "workflow.md"],
        }
        result = resume_role_work_package(package)
        self.assertEqual("CONTINUE_SAME_ROLE", result["state"])
        self.assertEqual("ai-native-tooling-engineer", result["role_id"])

    def test_completed_role_package_is_not_repeated_without_evidence(self):
        package = {
            "work_package_id": "WP-01", "requirement_ids": ["R4"],
            "role_id": "ai-native-tooling-engineer", "role_bundle_version": "1",
            "deliverables": ["plugin update"], "dependencies": [],
            "acceptance_evidence": [], "status": "DONE",
            "first_unmet_criterion": None, "next_action": None,
            "source_sha": "abc123", "last_result": "complete",
            "role_artifacts": ["SKILL.md", "mindset.md", "knowledge.md", "workflow.md"],
            "implementation_ref": "commit:abc",
            "verification_evidence": "tests", "consumer_evidence": "host",
        }
        self.assertEqual("DONE_WITHOUT_EVIDENCE", resume_role_work_package(package)["state"])
        package["adversarial_review"] = "review"
        package["readback_verified"] = True
        package["acceptance_evidence"] = ["R4"]
        self.assertEqual("ALREADY_DONE", resume_role_work_package(package)["state"])

    def test_parallel_packages_require_dependencies_and_disjoint_write_paths(self):
        packages = [
            {"work_package_id": "A", "status": "READY", "dependencies": [], "write_paths": ["a.py"]},
            {"work_package_id": "B", "status": "READY", "dependencies": [], "write_paths": ["b.py"]},
            {"work_package_id": "C", "status": "READY", "dependencies": ["A"], "write_paths": ["c.py"]},
            {"work_package_id": "D", "status": "READY", "dependencies": [], "write_paths": ["a.py"]},
        ]
        batches = ready_parallel_work_packages(packages)
        self.assertEqual([["A", "B"], ["C", "D"]], batches)

    def test_work_package_done_requires_implementation_and_consumer_evidence(self):
        package = {"source_sha": "abc123", "acceptance_evidence": ["R1"],
                   "implementation_ref": "commit:abc", "verification_evidence": "tests",
                   "consumer_evidence": None, "adversarial_review": "review",
                   "readback_verified": True}
        self.assertEqual("NOT_DONE", work_package_completion_gate(package)["state"])
        package["consumer_evidence"] = "host-observation"
        self.assertEqual("DONE", work_package_completion_gate(package)["state"])

    def test_status_dimensions_remain_independent(self):
        result = project_state_projection({
            "project_status": "ACTIVE", "ticket_status": "In Progress",
            "requirement_status": "PARTIAL", "repository_state": "QUOTA_UNKNOWN",
            "work_package_status": "IN_PROGRESS", "session_state": "ACTIVE",
        })
        self.assertEqual(6, len(result))
        self.assertEqual("In Progress", result["ticket_status"])


    def test_blocked_role_package_keeps_same_role_and_reports_blocked_state(self):
        package = {
            "work_package_id": "WP-01", "requirement_ids": ["R4"],
            "role_id": "ai-native-tooling-engineer", "role_bundle_version": "1",
            "deliverables": ["plugin update"], "dependencies": [],
            "acceptance_evidence": [], "status": "BLOCKED",
            "first_unmet_criterion": "host invocation", "next_action": "recover host evidence",
            "source_sha": "abc123", "last_result": "plugin release readback complete",
            "role_artifacts": ["SKILL.md", "mindset.md", "knowledge.md", "workflow.md"],
        }
        result = resume_role_work_package(package)
        self.assertEqual("BLOCKED_SAME_ROLE", result["state"])
        self.assertEqual("ai-native-tooling-engineer", result["role_id"])

    def test_integrated_router_uses_notion_repo_map_and_ignores_intro_repo_hints(self):
        package = {
            "work_package_id": "WP-01", "requirement_ids": ["R1", "R2"],
            "role_id": "ai-native-tooling-engineer", "role_bundle_version": "1",
            "deliverables": ["control plane"], "dependencies": [],
            "acceptance_evidence": ["R1"], "status": "IN_PROGRESS",
            "first_unmet_criterion": "consumer acceptance", "next_action": "verify host",
            "source_sha": "abc123", "last_result": "module merged",
            "role_artifacts": ["SKILL.md", "mindset.md", "knowledge.md", "workflow.md"],
        }
        checkpoints = {
            "p1": {
                "project": {"project_id": "p1", "domain": "software-engineering"},
                "tickets": {"t1": {"ticket_id": "t1", "project_id": "p1",
                                   "domain": "software-engineering", "source_lock": "main"}},
            }
        }
        result = route_message_with_repository_control(
            {"intent_type": "PROJECT_TASK"},
            project_introduction={"project_id": "p1", "goal_id": "g1",
                                  "repository": "attacker/unapproved"},
            repository_catalog=self.repos,
            requirements=self.requirements,
            notion_repository_route=self.route,
            role_work_packages=[package],
            project_checkpoints=checkpoints,
            registry=DOMAIN_CONTEXTS,
            state={"session_state": "ACTIVE"},
        )
        self.assertEqual("LOAD_TASK_EXECUTION_CONTEXT", result["action"])
        self.assertTrue(result["project_introduction_route"]["ignore_project_intro_repository_hints"])
        self.assertEqual("user/public-runner",
                         result["repository_resolution"]["active_execution_repository"]["full_name"])
        self.assertEqual("CONTINUE_SAME_ROLE", result["role_package_states"][0]["state"])
        self.assertEqual("ai-native-tooling-engineer", result["active_role_id"])
        self.assertEqual("ACTIVE", result["state_projection"]["session_state"])


    def test_normalize_inventory_covers_every_connected_installation(self):
        installations = [
            {"id": 1, "account_login": "user", "account_type": "User",
             "repository_selection": "all"},
            {"id": 2, "account_login": "org", "account_type": "Organization",
             "repository_selection": "all"},
        ]
        pages = [
            {"installation_id": 1, "pagination_complete": True, "repositories": [
                {"repository_full_name": "user/private-a",
                 "owner": {"login": "user", "type": "User"},
                 "visibility": "private", "default_branch": "main",
                 "permissions": {"push": True}, "archived": False},
            ]},
            {"installation_id": 2, "pagination_complete": True, "repositories": [
                {"repository_full_name": "org/public-b",
                 "owner": {"login": "org", "type": "Organization"},
                 "visibility": "public", "default_branch": "main",
                 "permissions": {"push": True}, "archived": False},
            ]},
        ]
        result = normalize_repository_inventory(installations, pages)
        self.assertEqual("VERIFIED_COMPLETE_FOR_CONNECTED_INSTALLATIONS", result["state"])
        self.assertEqual(2, result["installation_count"])
        self.assertEqual(2, result["repository_count"])
        self.assertEqual("CONNECTED_GITHUB_APP_INSTALLATIONS_ONLY", result["coverage_scope"])

    def test_incomplete_or_missing_installation_page_is_partial_not_complete(self):
        installations = [
            {"id": 1, "account_login": "user", "account_type": "User"},
            {"id": 2, "account_login": "org", "account_type": "Organization"},
        ]
        pages = [
            {"installation_id": 1, "pagination_complete": False, "repositories": []},
        ]
        result = normalize_repository_inventory(installations, pages)
        self.assertEqual("PARTIAL", result["state"])
        self.assertEqual([2], result["missing_installation_ids"])
        self.assertEqual([1], result["incomplete_installation_ids"])

    def test_usage_projection_calculates_only_exact_aligned_scope(self):
        usage = [{
            "billing_owner_id": "org-1", "product": "ACTIONS",
            "billing_period": "2026-11", "scope_type": "organization",
            "scope_id": "org-1", "currency": "USD", "usage_amount": 45,
            "collected_at": "2026-11-22T10:00:00Z", "evidence_source": "github_billing_api",
        }]
        budget = [{
            "billing_owner_id": "org-1", "product": "ACTIONS",
            "billing_period": "2026-11", "scope_type": "organization",
            "scope_id": "org-1", "currency": "USD", "budget_amount": 100,
            "prevent_further_usage": True,
        }]
        result = compute_actions_usage_projection(usage, budget)
        self.assertEqual("VERIFIED", result["state"])
        self.assertEqual(45.0, result["records"][0]["usage_percent"])
        self.assertEqual(55.0, result["records"][0]["remaining_amount"])
        self.assertEqual("WITHIN_BUDGET_VERIFIED", result["records"][0]["state"])
        self.assertIsNone(result["exhaustion_timestamp"])

    def test_usage_period_mismatch_never_computes_percentage(self):
        usage = [{
            "billing_owner_id": "org-1", "product": "ACTIONS",
            "billing_period": "2026-11", "scope_type": "organization",
            "scope_id": "org-1", "currency": "USD", "usage_amount": 45,
        }]
        budget = [{
            "billing_owner_id": "org-1", "product": "ACTIONS",
            "billing_period": "2026-10", "scope_type": "organization",
            "scope_id": "org-1", "currency": "USD", "budget_amount": 100,
            "prevent_further_usage": True,
        }]
        result = compute_actions_usage_projection(usage, budget)
        self.assertEqual("PARTIAL", result["state"])
        self.assertIsNone(result["records"][0]["usage_percent"])
        self.assertEqual("BILLING_SCOPE_MISMATCH", result["records"][0]["reason"])

    def test_owner_report_stays_reported_without_provider_rows(self):
        result = compute_actions_usage_projection(
            [], [], {"state": "QUOTA_EXHAUSTED", "owner": "org-1"}
        )
        self.assertEqual("UNKNOWN", result["state"])
        self.assertEqual("REPORTED_QUOTA_EXHAUSTED", result["owner_reported_state"])
        self.assertIsNone(result["exhaustion_timestamp"])

    def test_hard_cap_exhaustion_has_no_inferred_timestamp(self):
        usage = [{
            "billing_owner_id": "org-1", "product": "ACTIONS",
            "billing_period": "2026-11", "scope_type": "organization",
            "scope_id": "org-1", "currency": "USD", "usage_amount": 120,
            "collected_at": "2026-11-22T10:00:00Z",
        }]
        budget = [{
            "billing_owner_id": "org-1", "product": "ACTIONS",
            "billing_period": "2026-11", "scope_type": "organization",
            "scope_id": "org-1", "currency": "USD", "budget_amount": 100,
            "prevent_further_usage": True,
        }]
        result = compute_actions_usage_projection(usage, budget)
        self.assertEqual("QUOTA_EXHAUSTED", result["records"][0]["state"])
        self.assertIsNone(result["records"][0]["exhaustion_timestamp"])

    def test_integrated_router_can_build_catalog_from_installations(self):
        package = {
            "work_package_id": "WP-01", "requirement_ids": ["R1", "R2"],
            "role_id": "ai-native-tooling-engineer", "role_bundle_version": "1",
            "deliverables": ["control plane"], "dependencies": [],
            "acceptance_evidence": ["R1"], "status": "IN_PROGRESS",
            "first_unmet_criterion": "consumer acceptance", "next_action": "verify host",
            "source_sha": "abc123", "last_result": "module merged",
            "role_artifacts": ["SKILL.md", "mindset.md", "knowledge.md", "workflow.md"],
        }
        installations = [{
            "id": 1, "account_login": "user", "account_type": "User",
            "repository_selection": "all",
        }]
        pages = [{
            "installation_id": 1, "pagination_complete": True,
            "repositories": [
                {"repository_full_name": "org/private-core",
                 "owner": {"login": "org", "type": "Organization"},
                 "visibility": "private", "default_branch": "main",
                 "permissions": {"push": True}, "archived": False},
                {"repository_full_name": "user/public-runner",
                 "owner": {"login": "user", "type": "User"},
                 "visibility": "public", "default_branch": "main",
                 "permissions": {"push": True}, "archived": False},
            ],
        }]
        checkpoints = {
            "p1": {
                "project": {"project_id": "p1", "domain": "software-engineering"},
                "tickets": {"t1": {"ticket_id": "t1", "project_id": "p1",
                                   "domain": "software-engineering", "source_lock": "main"}},
            }
        }
        result = route_message_with_repository_control(
            {"intent_type": "PROJECT_TASK"},
            project_introduction={"project_id": "p1", "goal_id": "g1",
                                  "repository": "ignored/repository"},
            requirements=self.requirements,
            notion_repository_route=self.route,
            role_work_packages=[package],
            installations=installations,
            repositories_by_installation=pages,
            project_checkpoints=checkpoints,
            registry=DOMAIN_CONTEXTS,
            state={"session_state": "ACTIVE"},
        )
        self.assertEqual("LOAD_TASK_EXECUTION_CONTEXT", result["action"])
        self.assertEqual("VERIFIED_COMPLETE_FOR_CONNECTED_INSTALLATIONS",
                         result["repository_inventory"]["state"])
        self.assertEqual("user/public-runner",
                         result["repository_resolution"]["active_execution_repository"]["full_name"])


    def test_billing_usage_does_not_imply_runner_availability(self):
        repos = [dict(repo) for repo in self.repos]
        repos[1] = dict(repos[1])
        repos[1]["actions_usage"] = {"state": "WITHIN_BUDGET_VERIFIED"}
        repos[1]["runner_availability"] = {"state": "UNKNOWN"}
        result = resolve_task_repositories(
            self.requirements, repos, self.route, ci_required=True
        )
        self.assertEqual("NO_ELIGIBLE_EXECUTION_REPOSITORY", result["state"])


if __name__ == "__main__":
    unittest.main()

