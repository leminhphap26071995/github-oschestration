import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("quota_monitor", ROOT / "collect.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class QuotaMonitorTests(unittest.TestCase):
    def test_usage_totals_keep_units_separate(self):
        rows = module.items({"usageItems": [
            {"product": "Actions", "sku": "actions_linux", "unitType": "minutes", "netQuantity": 120, "netAmount": 0.72},
            {"product": "Actions", "sku": "actions_storage", "unitType": "GB-hours", "netQuantity": 5, "netAmount": 0.10},
            {"product": "Packages", "sku": "packages_storage", "unitType": "GB-hours", "netQuantity": 9, "netAmount": 0.90},
        ]})
        self.assertEqual({"net_minutes": 120.0, "net_amount": 0.82}, module.totals(rows))

    def test_per_repository_filter_is_encoded(self):
        path = module.path_for("organization", "example-org", 2026, 11, "example-org/private-repo")
        self.assertIn("repository=example-org%2Fprivate-repo", path)
        self.assertIn("product=Actions", path)

    def test_org_token_map_rejects_invalid_login(self):
        with self.assertRaises(ValueError):
            module.org_tokens('{"bad/org":"token"}')

    def test_remaining_included_minutes_not_inferred(self):
        report = module.collect_all("", {}, "leminhphap26071995")
        self.assertEqual("NOT_EXPOSED_BY_USAGE_SUMMARY_API", report["remaining_included_minutes"])

    def test_dashboard_disclaims_remaining_balance(self):
        report = {"billing_period": "2026-11", "collected_at_utc": "2026-11-09T00:00:00+00:00",
                  "accounts": [{"scope": "organization", "owner": "example-org", "status": "OK",
                                "usage_items": [], "private_repositories": [], "totals": {"net_minutes": 0, "net_amount": 0}}]}
        self.assertIn("not remaining included minutes", module.render(report, []))

    def test_report_files_are_written(self):
        report = {"schema_version": 1, "collected_at_utc": "2026-11-09T00:00:00+00:00", "billing_period": "2026-11",
                  "accounts": [{"scope": "user", "owner": "test-user", "status": "OK", "usage_items": [],
                                "private_repositories": [], "totals": {"net_minutes": 0, "net_amount": 0}}]}
        with tempfile.TemporaryDirectory() as tmp:
            module.write_report(report, Path(tmp))
            for name in ("README.md", "usage-latest.json", "usage-history.json"):
                self.assertTrue((Path(tmp) / name).is_file())


if __name__ == "__main__":
    unittest.main()
