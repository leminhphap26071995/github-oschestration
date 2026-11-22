import unittest

from scripts.repository_control_plane import (
    project_introduction_route, project_state_projection,
    ready_parallel_work_packages, resolve_task_repositories,
    resume_role_work_package, work_package_completion_gate,
)


class RepositoryControlPlaneTests(unittest.TestCase):
    def setUp(self):
        self.repos = [
            {"full_name": "org/private-core", "owner": "org", "visibility": "private",
             "archived": False, "default_branch": "main",
             "permissions": {"push": True},
             "actions_usage": {"state": "REPORTED_QUOTA_EXHAUSTED", "billing_owner": "org"}},
            {"full_name": "user/public-runner", "owner": "user", "visibility": "public",
             "archived": False, "default_branch": "main",
             "permissions": {"push": True},
             "actions_usage": {"state": "AVAILABLE_VERIFIED", "billing_owner": "user"}},
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

    def test_ci_requires_provider_verified_available_usage(self):
        result = resolve_task_repositories(self.requirements, self.repos, self.route, ci_required=True)
        self.assertEqual("RESOLVED", result["state"])
        self.assertEqual("user/public-runner",
                         result["active_execution_repository"]["full_name"])

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
            "role_artifacts": ["SKILL.md", "mindset.md", "knowledge.md", "workflow.md"],
            "implementation_ref": "commit:abc",
            "verification_evidence": "tests", "consumer_evidence": "host",
        }
        self.assertEqual("DONE_WITHOUT_EVIDENCE", resume_role_work_package(package)["state"])
        package["adversarial_review"] = "review"
        package["readback_verified"] = True
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
        package = {"implementation_ref": "commit:abc", "verification_evidence": "tests",
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


if __name__ == "__main__":
    unittest.main()

