#!/usr/bin/env python3
"""Add OS and storage SKU views to the collector's private JSON and Markdown outputs."""
import argparse
import json
from pathlib import Path

STORAGE = {
    "actions_storage": "artifact_storage",
    "actions_cache_storage": "cache_storage",
    "actions_custom_image_storage": "custom_image_storage",
}
MINUTES = {"minute", "minutes"}
START = "<!-- actions-cost-breakdown:start -->"
END = "<!-- actions-cost-breakdown:end -->"


def category(sku):
    if sku.startswith("actions_linux"):
        return "linux"
    if sku.startswith("actions_windows"):
        return "windows"
    if sku.startswith("actions_macos"):
        return "macos"
    return STORAGE.get(sku, "other_actions")


def sum_field(rows, field):
    if not rows:
        return 0.0
    values = [row.get(field) for row in rows]
    if any(value is None for value in values):
        return None
    return round(sum(values), 6)


def unknown_metrics():
    os_metrics = {os_name: {"gross_minutes": None, "discounted_minutes": None,
                            "net_minutes": None, "net_amount": None}
                  for os_name in ("linux", "windows", "macos")}
    storage = {name: {"unit_type": "unknown", "gross_quantity": None,
                      "discount_quantity": None, "net_quantity": None,
                      "net_amount": None}
               for name in STORAGE.values()}
    return {"runner_minutes_by_os": os_metrics, "storage_by_type": storage,
            "runner_net_amount": None, "storage_net_amount": None,
            "total_actions_net_amount": None}


def metrics(rows, unknown=False):
    if unknown:
        return unknown_metrics()
    os_metrics = {}
    minute_rows = [r for r in rows if str(r.get("unit_type", "")).lower() in MINUTES]
    for os_name in ("linux", "windows", "macos"):
        selected = [r for r in minute_rows if category(str(r.get("sku", ""))) == os_name]
        os_metrics[os_name] = {
            "gross_minutes": sum_field(selected, "gross_quantity"),
            "discounted_minutes": sum_field(selected, "discount_quantity"),
            "net_minutes": sum_field(selected, "net_quantity"),
            "net_amount": sum_field(selected, "net_amount"),
        }
    storage = {}
    storage_rows = []
    for sku, name in STORAGE.items():
        selected = [r for r in rows if str(r.get("sku", "")).lower() == sku]
        units = sorted({str(r.get("unit_type", "unknown")) for r in selected})
        storage[name] = {
            "unit_type": units[0] if len(units) == 1 else ("mixed" if units else "unknown"),
            "gross_quantity": sum_field(selected, "gross_quantity"),
            "discount_quantity": sum_field(selected, "discount_quantity"),
            "net_quantity": sum_field(selected, "net_quantity"),
            "net_amount": sum_field(selected, "net_amount"),
        }
        storage_rows.extend(selected)
    return {
        "runner_minutes_by_os": os_metrics,
        "storage_by_type": storage,
        "runner_net_amount": sum_field(minute_rows, "net_amount"),
        "storage_net_amount": sum_field(storage_rows, "net_amount"),
        "total_actions_net_amount": sum_field(rows, "net_amount"),
    }


def attach(report):
    for account in report.get("accounts", []):
        account["metrics"] = metrics(account.get("usage_items", []),
                                     unknown=bool(account.get("summary_error")))
        for repository in account.get("repositories", []):
            repository["metrics"] = metrics(repository.get("usage_items", []),
                                            unknown=repository.get("status") != "OK")
    return report


def fmt(value, digits=3):
    return "UNKNOWN" if value is None else f"{value:,.{digits}f}"


def append_dashboard(path, report, discovery):
    current = path.read_text(encoding="utf-8")
    if START in current:
        current = current.split(START, 1)[0].rstrip() + "\n"
    lines = [START, "", "## Runner minutes by operating system", "",
             "| Billing owner | Linux minutes | Windows minutes | macOS minutes | Runner cost |",
             "|---|---:|---:|---:|---:|"]
    for account in report.get("accounts", []):
        m = account["metrics"]
        os_rows = m["runner_minutes_by_os"]
        lines.append(f"| {account['owner']} | {fmt(os_rows['linux']['net_minutes'])} "
                     f"| {fmt(os_rows['windows']['net_minutes'])} "
                     f"| {fmt(os_rows['macos']['net_minutes'])} "
                     f"| USD {fmt(m['runner_net_amount'], 4)} |")
    lines += ["", "## Actions storage usage and cost", "",
              "| Billing owner | Storage SKU | Net quantity | API unit | Net amount |",
              "|---|---|---:|---|---:|"]
    for account in report.get("accounts", []):
        for name, value in account["metrics"]["storage_by_type"].items():
            lines.append(f"| {account['owner']} | {name} | {fmt(value['net_quantity'])} "
                         f"| {value['unit_type']} | USD {fmt(value['net_amount'], 4)} |")
    lines += ["", "## Repository OS and storage breakdown", "",
              "| Repository | Linux min | Windows min | macOS min | Storage cost | Total Actions cost |",
              "|---|---:|---:|---:|---:|---:|"]
    repositories = [r for a in report.get("accounts", []) for r in a.get("repositories", [])]
    for repo in repositories:
        m = repo["metrics"]
        os_rows = m["runner_minutes_by_os"]
        lines.append(f"| {repo['full_name']} | {fmt(os_rows['linux']['net_minutes'])} "
                     f"| {fmt(os_rows['windows']['net_minutes'])} "
                     f"| {fmt(os_rows['macos']['net_minutes'])} "
                     f"| USD {fmt(m['storage_net_amount'], 4)} "
                     f"| USD {fmt(m['total_actions_net_amount'], 4)} |")
    if not repositories:
        lines.append("| Repository attribution unavailable from current billing endpoint | — | — | — | — | — |")
    lines += ["", "## Organization discovery", "",
              f"- Status: {discovery.get('status', 'UNKNOWN')}",
              f"- Configured organizations: {discovery.get('configured_count', 'UNKNOWN')}",
              f"- Discovered owner organizations: {discovery.get('discovered_count', 'UNKNOWN')}",
              f"- Discovery error: {discovery.get('error') or 'none'}", END, ""]
    path.write_text(current + "\n".join(lines), encoding="utf-8")


def enrich(report_dir):
    directory = Path(report_dir)
    latest_path = directory / "usage-latest.json"
    report = json.loads(latest_path.read_text(encoding="utf-8"))
    discovery_path = directory / "organization-discovery.json"
    discovery = json.loads(discovery_path.read_text(encoding="utf-8")) if discovery_path.exists() else {}
    report["organization_discovery"] = discovery
    attach(report)
    latest_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    history_path = directory / "usage-history.json"
    history = json.loads(history_path.read_text(encoding="utf-8"))
    if history and history[-1].get("collected_at_utc") == report.get("collected_at_utc"):
        accounts = report.get("accounts", [])
        def aggregate(path):
            values = [path(a) for a in accounts]
            return None if any(v is None for v in values) else round(sum(values), 6)
        history[-1].update({
            "linux_minutes": aggregate(lambda a: a["metrics"]["runner_minutes_by_os"]["linux"]["net_minutes"]),
            "windows_minutes": aggregate(lambda a: a["metrics"]["runner_minutes_by_os"]["windows"]["net_minutes"]),
            "macos_minutes": aggregate(lambda a: a["metrics"]["runner_minutes_by_os"]["macos"]["net_minutes"]),
            "storage_net_amount": aggregate(lambda a: a["metrics"]["storage_net_amount"]),
        })
        if discovery.get("error"):
            history[-1]["status"] = "PARTIAL" if history[-1].get("status") != "UNKNOWN" else "UNKNOWN"
        history_path.write_text(json.dumps(history, indent=2) + "\n", encoding="utf-8")
    append_dashboard(directory / "dashboard.md", report, discovery)
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--report-dir", required=True)
    args = parser.parse_args()
    report = enrich(args.report_dir)
    print(f"ENRICHED_ACTIONS_METRICS owners={len(report.get('accounts', []))} "
          f"repositories={sum(len(a.get('repositories', [])) for a in report.get('accounts', []))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
