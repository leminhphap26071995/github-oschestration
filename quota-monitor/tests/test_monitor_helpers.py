import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("enrich_report", ROOT / "enrich_report.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class EnrichReportTests(unittest.TestCase):
    def test_metrics_split_linux_windows_and_storage_skus(self):
        rows = [
            {"sku": "actions_linux", "unit_type": "minutes", "gross_quantity": 100,
             "discount_quantity": 20, "net_quantity": 80, "net_amount": 0.48},
            {"sku": "actions_windows", "unit_type": "minutes", "gross_quantity": 50,
             "discount_quantity": 10, "net_quantity": 40, "net_amount": 0.40},
            {"sku": "actions_storage", "unit_type": "GB-hours", "gross_quantity": 200,
             "discount_quantity": 0, "net_quantity": 200, "net_amount": 0.02},
            {"sku": "actions_cache_storage", "unit_type": "GB-hours", "gross_quantity": 80,
             "discount_quantity": 0, "net_quantity": 80, "net_amount": 0.01},
        ]
        result = module.metrics(rows)
        self.assertEqual(80, result["runner_minutes_by_os"]["linux"]["net_minutes"])
        self.assertEqual(40, result["runner_minutes_by_os"]["windows"]["net_minutes"])
        self.assertEqual(0, result["runner_minutes_by_os"]["macos"]["net_minutes"])
        self.assertEqual(200, result["storage_by_type"]["artifact_storage"]["net_quantity"])
        self.assertEqual(80, result["storage_by_type"]["cache_storage"]["net_quantity"])
        self.assertEqual(0.03, result["storage_net_amount"])

    def test_unknown_account_does_not_become_zero(self):
        result = module.metrics([], unknown=True)
        self.assertIsNone(result["runner_minutes_by_os"]["linux"]["net_minutes"])
        self.assertIsNone(result["storage_net_amount"])

    def test_enrich_updates_private_dashboard_and_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            report = {
                "collected_at_utc": "2026-11-09T00:00:00+00:00",
                "billing_period": "2026-11",
                "accounts": [{
                    "scope": "user", "owner": "alice", "status": "OK",
                    "summary_error": None,
                    "usage_items": [{"sku": "actions_linux", "unit_type": "minutes",
                                     "gross_quantity": 10, "discount_quantity": 0,
                                     "net_quantity": 10, "net_amount": 0.06}],
                    "repositories": [],
                }],
            }
            (root / "usage-latest.json").write_text(json.dumps(report))
            (root / "usage-history.json").write_text(json.dumps([{
                "collected_at_utc": report["collected_at_utc"], "status": "OK"
            }]))
            (root / "dashboard.md").write_text("# Existing dashboard\n")
            (root / "organization-discovery.json").write_text(json.dumps({
                "status": "OK", "configured_count": 1, "discovered_count": 2,
                "error": None,
            }))
            result = module.enrich(root)
            self.assertEqual(10, result["accounts"][0]["metrics"]["runner_minutes_by_os"]["linux"]["net_minutes"])
            dashboard = (root / "dashboard.md").read_text()
            self.assertIn("Runner minutes by operating system", dashboard)
            self.assertIn("Actions storage usage and cost", dashboard)
            history = json.loads((root / "usage-history.json").read_text())
            self.assertEqual(10, history[-1]["linux_minutes"])


if __name__ == "__main__":
    unittest.main()
