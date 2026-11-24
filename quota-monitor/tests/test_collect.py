import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("quota_monitor", ROOT / "collect.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class QuotaMonitorTests(unittest.TestCase):
    def test_usage_totals_separate_minutes_from_storage(self):
        rows = module.items({"usageItems": [
            {"product": "Actions", "sku": "actions_linux", "unitType": "minutes",
             "grossQuantity": 120, "discountQuantity": 20, "netQuantity": 100,
             "netAmount": 0.72},
            {"product": "Actions", "sku": "actions_storage", "unitType": "GB-hours",
             "grossQuantity": 5, "discountQuantity": 1, "netQuantity": 4,
             "netAmount": 0.10},
            {"product": "Packages", "sku": "packages_storage", "unitType": "GB-hours",
             "netQuantity": 9, "netAmount": 0.90},
        ]})
        self.assertEqual(
            {"gross_minutes": 120.0, "discounted_minutes": 20.0,
             "net_minutes": 100.0, "net_amount": 0.82},
            module.totals(rows),
        )

    def test_missing_discount_quantity_is_unknown_not_zero(self):
        rows = module.items({"usageItems": [
            {"product": "Actions", "sku": "actions_linux", "unitType": "minutes",
             "grossQuantity": 100, "netQuantity": 50, "netAmount": 0.5}
        ]})
        self.assertIsNone(module.totals(rows)["discounted_minutes"])

    def test_repository_filter_is_encoded(self):
        path = module.path_for("organization", "example-org", 2026, 11,
                               "example-org/private-repo")
        self.assertIn("repository=example-org%2Fprivate-repo", path)
        self.assertIn("product=Actions", path)

    def test_user_inventory_includes_public_private_and_owner_repos(self):
        with patch.object(module, "get", return_value=({"usageItems": []}, None)):
            with patch.object(module, "pages", return_value=([
                {"full_name": "alice/private", "owner": {"type": "User", "login": "alice"},
                 "private": True},
                {"full_name": "alice/public", "owner": {"type": "User", "login": "alice"},
                 "private": False},
                {"full_name": "other/repo", "owner": {"type": "User", "login": "other"},
                 "private": True},
            ], None)):
                result = module.collect("user", "alice", "token", 2026, 11)
        self.assertEqual(["alice/private", "alice/public"],
                         [repo["full_name"] for repo in result["repositories"]])
        self.assertEqual("PARTIAL", result["status"])

    def test_user_scope_does_not_query_every_repository(self):
        paths=[]
        usage={"usageItems":[{"product":"Actions","sku":"actions_linux","unitType":"minutes","grossQuantity":60,"discountQuantity":10,"netQuantity":50,"netAmount":0.25}]}
        def fake_get(token,path):paths.append(path);return usage,None
        with patch.object(module,"get",side_effect=fake_get):
            with patch.object(module,"pages",return_value=([{"id":42,"full_name":"alice/private","owner":{"type":"User","login":"alice"},"private":True,"default_branch":"main"}],None)):
                result=module.collect("user","alice","token",2026,11)
        self.assertEqual("OK",result["actions_usage_status"]);self.assertEqual(50.0,result["totals"]["net_minutes"])
        self.assertEqual("NOT_COLLECTED_BY_DESIGN",result["repositories"][0]["status"]);self.assertIsNone(result["repositories"][0]["totals"]["net_minutes"])
        self.assertEqual(1,len(paths));self.assertFalse(any("repository=" in p for p in paths))

    def test_org_scope_queries_only_repositories_with_actions_repository_budgets(self):
        paths=[]
        account_usage={"usageItems":[{"product":"Actions","sku":"actions_linux","unitType":"minutes","grossQuantity":100,"discountQuantity":0,"netQuantity":100,"netAmount":0.5}]}
        repository_usage={"usageItems":[{"product":"Actions","sku":"actions_linux","unitType":"minutes","grossQuantity":20,"discountQuantity":0,"netQuantity":20,"netAmount":0.1}]}
        budgets={"budgets":[{"budget_product_skus":["actions"],"budget_scope":"repository","budget_entity_name":"example-org/budgeted","budget_amount":10,"prevent_further_usage":True}]}
        def fake_get(token,path):
            paths.append(path)
            if path.startswith("/organizations/example-org/settings/billing/usage/summary"):return account_usage,None
            if path.startswith("/organizations/example-org/settings/billing/budgets"):return budgets,None
            if "repository=example-org%2Fbudgeted" in path:return repository_usage,None
            raise AssertionError("Unexpected billing query: "+path)
        with patch.object(module,"get",side_effect=fake_get):
            with patch.object(module,"pages",return_value=([
                {"id":1,"full_name":"example-org/budgeted","owner":{"type":"Organization","login":"example-org"},"private":True,"default_branch":"main"},
                {"id":2,"full_name":"example-org/no-budget","owner":{"type":"Organization","login":"example-org"},"private":True,"default_branch":"main"},
            ],None)):
                result=module.collect("organization","example-org","uat",2026,11)
        self.assertEqual("OK",result["repositories"][0]["status"]);self.assertEqual("NOT_COLLECTED_BY_DESIGN",result["repositories"][1]["status"])
        self.assertEqual(0.1,result["budget"]["items"][0]["observed_net_amount"]);self.assertEqual(3,len(paths))
        self.assertEqual(1,sum("repository=" in p for p in paths))

    def test_collect_all_reuses_one_user_access_token_for_every_authorized_org(self):
        seen=[]
        def fake_collect(scope,owner,token,year,month):
            seen.append((scope,owner,token));return {"scope":scope,"owner":owner,"status":"OK","repositories":[]}
        with patch.object(module,"collect",side_effect=fake_collect):
            module.collect_all("shared-uat",{"alpha-org":"shared-uat","beta-org":"shared-uat"},"alice",["alpha-org","beta-org"],[])
        self.assertEqual([("user","alice","shared-uat"),("organization","alpha-org","shared-uat"),("organization","beta-org","shared-uat")],seen)

    def test_empty_usage_rows_are_unknown_not_zero(self):
        self.assertIsNone(module.totals([])["gross_minutes"])
        self.assertIsNone(module.totals([])["net_amount"])

    def test_missing_tokens_are_unknown_not_zero(self):
        report = module.collect_all("", {}, "alice", ["example-org"])
        self.assertEqual(["UNKNOWN", "UNKNOWN"],
                         [account["status"] for account in report["accounts"]])
        self.assertIsNone(report["accounts"][0]["totals"]["gross_minutes"])
        self.assertEqual("BILLING_TOKEN_NOT_CONFIGURED",
                         report["accounts"][1]["summary_error"])

    def test_org_token_map_rejects_invalid_login(self):
        with self.assertRaises(ValueError):
            module.org_tokens('{"bad/org":"token"}')

    def test_targets_file_is_deduplicated(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "targets.json"
            path.write_text(json.dumps({"organizations": [
                "example-org", "example-org", "second-org"
            ]}))
            self.assertEqual(["example-org", "second-org"], module.org_targets(path))

    def test_empty_targets_support_automatic_user_access_discovery(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "targets.json"
            path.write_text(json.dumps({
                "organizations": [],
                "excluded_organizations": ["huyquanghan-apps"]
            }))
            self.assertEqual([], module.org_targets(path))

    def test_excluded_organization_is_never_collected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "targets.json"
            path.write_text(json.dumps({
                "organizations": ["leminhphap-improvement", "huyquanghan-apps"],
                "excluded_organizations": []
            }))
            self.assertEqual(["leminhphap-improvement"], module.org_targets(path))

    def test_hard_cap_uses_usage_summary_spend(self):
        budgets = {"budgets": [{
            "id": "budget-1", "budget_type": "ProductPricing",
            "budget_product_skus": ["actions"], "budget_scope": "organization",
            "budget_amount": 10, "prevent_further_usage": True,
        }]}
        usage = [{"product": "Actions", "sku": "actions_linux",
                  "unit_type": "minutes", "gross_quantity": 100,
                  "discount_quantity": 0, "net_quantity": 100,
                  "net_amount": 12.5}]
        result = module.evaluate_budgets(budgets, usage, [])
        self.assertEqual("HARD_CAP_REACHED", result["status"])
        self.assertEqual(12.5, result["items"][0]["observed_net_amount"])

    def test_budget_without_enforcement_is_not_a_hard_cap(self):
        budgets = {"budgets": [{
            "budget_type": "ProductPricing", "budget_product_sku": "actions",
            "budget_scope": "organization", "budget_amount": 10,
            "prevent_further_usage": False,
        }]}
        result = module.evaluate_budgets(budgets, None, [])
        self.assertEqual("BUDGET_WITHOUT_HARD_CAP", result["status"])

    def test_unknown_usage_does_not_become_zero_budget_spend(self):
        budgets = {"budgets": [{
            "budget_type": "ProductPricing", "budget_product_sku": "actions",
            "budget_scope": "organization", "budget_amount": 10,
            "prevent_further_usage": True,
        }]}
        result = module.evaluate_budgets(budgets, None, [])
        self.assertEqual("UNKNOWN_SPEND", result["status"])

    def test_dashboard_disclaims_remaining_balance(self):
        report = {
            "billing_period": "2026-11",
            "collected_at_utc": "2026-11-09T00:00:00+00:00",
            "accounts": [{
                "scope": "user", "owner": "alice", "status": "UNKNOWN",
                "usage_items": [], "repositories": [],
                "repository_list_error": "BILLING_TOKEN_NOT_CONFIGURED",
                "summary_error": "BILLING_TOKEN_NOT_CONFIGURED",
                "totals": module.UNKNOWN_TOTALS.copy(),
                "budget": {"status": "NOT_APPLICABLE", "items": []},
            }],
        }
        dashboard = module.render(report, [])
        self.assertIn("empty Actions response is UNKNOWN, not zero", dashboard)
        self.assertIn("remaining included-compute balance is not exposed", dashboard)
        self.assertIn("UNKNOWN", dashboard)
        self.assertNotIn("0.00", dashboard)

    def test_report_files_are_written(self):
        report = {
            "schema_version": 3, "collected_at_utc": "2026-11-09T00:00:00+00:00",
            "billing_period": "2026-11",
            "accounts": [{
                "scope": "user", "owner": "alice", "status": "OK",
                "usage_items": [], "repositories": [], "repository_list_error": None,
                "summary_error": None, "totals": {
                    "gross_minutes": 0, "discounted_minutes": 0,
                    "net_minutes": 0, "net_amount": 0,
                },
                "budget": {"status": "NOT_APPLICABLE", "items": []},
            }],
        }
        with tempfile.TemporaryDirectory() as tmp:
            module.write_report(report, Path(tmp))
            for name in ("dashboard.md", "usage-latest.json", "usage-history.json"):
                self.assertTrue((Path(tmp) / name).is_file())


if __name__ == "__main__":
    unittest.main()
