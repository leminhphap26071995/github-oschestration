#!/usr/bin/env python3
"""Read-only GitHub Actions billing collector. Never prints credentials or usage rows."""
import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API = "https://api.github.com"
VERSION = "2026-03-10"
ORG_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$")
UNKNOWN_TOTALS = {k: None for k in
                  ("gross_minutes", "discounted_minutes", "billable_minutes", "net_amount")}


def get(token, path):
    req = Request(API + path, headers={
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": VERSION,
        "User-Agent": "github-actions-usage-monitor",
    })
    try:
        with urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8")), None
    except HTTPError as exc:
        return None, f"HTTP_{exc.code}"
    except (URLError, TimeoutError):
        return None, "NETWORK_ERROR"
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None, "INVALID_JSON"


def pages(token, path):
    result = []
    for page in range(1, 101):
        sep = "&" if "?" in path else "?"
        data, error = get(token, f"{path}{sep}{urlencode({'per_page': 100, 'page': page})}")
        if error:
            return result, error
        if not isinstance(data, list):
            return result, "INVALID_RESPONSE"
        result.extend(data)
        if len(data) < 100:
            return result, None
    return result, "PAGINATION_LIMIT"


def path_for(scope, owner, year, month, repository=None):
    root = f"/users/{owner}" if scope == "user" else f"/organizations/{owner}"
    query = {"year": year, "month": month, "product": "Actions"}
    if repository:
        query["repository"] = repository
    return f"{root}/settings/billing/usage/summary?{urlencode(query)}"


def as_number(value):
    try:
        return None if value is None or value == "" else float(value)
    except (TypeError, ValueError):
        return None


def items(data):
    output = []
    for item in (data or {}).get("usageItems", []):
        if not isinstance(item, dict):
            continue
        product = str(item.get("product", "Actions"))
        if product.lower() != "actions":
            continue
        output.append({
            "product": product, "sku": item.get("sku", "unknown"),
            "unit_type": item.get("unitType", "unknown"),
            "gross_quantity": as_number(item.get("grossQuantity", item.get("quantity"))),
            "discount_quantity": as_number(item.get("discountQuantity")),
            "net_quantity": as_number(item.get("netQuantity", item.get("quantity"))),
            "gross_amount": as_number(item.get("grossAmount")),
            "discount_amount": as_number(item.get("discountAmount")),
            "net_amount": as_number(item.get("netAmount")),
        })
    return output


def total(rows, field, digits=3):
    values = [row.get(field) for row in rows]
    return None if any(value is None for value in values) else round(sum(values), digits)


def totals(rows):
    minutes = [r for r in rows if str(r.get("unit_type", "")).lower() in ("minute", "minutes")]
    return {
        "gross_minutes": total(minutes, "gross_quantity"),
        "discounted_minutes": total(minutes, "discount_quantity"),
        "billable_minutes": total(minutes, "net_quantity"),
        "net_amount": total(rows, "net_amount", 6),
    }


def org_tokens(raw):
    value = json.loads(raw or "{}")
    if not isinstance(value, dict):
        raise ValueError("ORG_BILLING_TOKENS_JSON must be a JSON object")
    result = {}
    for org, token in value.items():
        if not isinstance(org, str) or not ORG_RE.fullmatch(org):
            raise ValueError("Invalid organization login in token map")
        if isinstance(token, str) and token.strip():
            result[org] = token.strip()
    return result


def org_targets(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    values = data.get("organizations") if isinstance(data, dict) else None
    if not isinstance(values, list):
        raise ValueError("targets file must contain an organizations array")
    result = []
    for org in values:
        if not isinstance(org, str) or not ORG_RE.fullmatch(org):
            raise ValueError("Invalid organization login in targets file")
        if org not in result:
            result.append(org)
    return result


def budget_matches(budget):
    values = budget.get("budget_product_skus")
    if not isinstance(values, list):
        values = [budget.get("budget_product_sku")]
    return any(isinstance(v, str) and
               (v.lower() == "actions" or v.lower().startswith("actions_"))
               for v in values)


def budget_spend(budget, account_rows, repositories):
    scope = str(budget.get("budget_scope", "")).lower()
    if scope in ("organization", "enterprise"):
        rows = account_rows
        if rows is None:
            return None
    elif scope == "repository":
        entity = str(budget.get("budget_entity_name", "")).strip().lower()
        repo = next((r for r in repositories if
                     r["full_name"].lower() == entity or
                     r["full_name"].split("/", 1)[-1].lower() == entity), None)
        if repo is None or repo["status"] != "OK":
            return None
        rows = repo["usage_items"]
    else:
        return None
    return totals(rows)["net_amount"]


def evaluate_budgets(data, account_rows, repositories, error=None):
    if error:
        return {"status": "UNKNOWN", "error": error, "items": []}
    values = data.get("budgets", []) if isinstance(data, dict) else data
    values = values if isinstance(values, list) else []
    budgets = [b for b in values if isinstance(b, dict) and budget_matches(b)]
    result = []
    for b in budgets:
        amount = as_number(b.get("budget_amount"))
        spend = budget_spend(b, account_rows, repositories)
        enforced = b.get("prevent_further_usage") is True
        status = ("BUDGET_WITHOUT_HARD_CAP" if not enforced else
                  "UNKNOWN_SPEND" if amount is None or spend is None else
                  "HARD_CAP_REACHED" if spend >= amount else "HARD_CAP_NOT_REACHED")
        result.append({
            "id": b.get("id"), "scope": b.get("budget_scope", "unknown"),
            "entity": b.get("budget_entity_name", ""),
            "product_skus": b.get("budget_product_skus") or [b.get("budget_product_sku")],
            "budget_amount": amount, "prevent_further_usage": enforced,
            "observed_net_amount": spend, "status": status,
        })
    states = [b["status"] for b in result]
    status = ("NO_ACTIONS_BUDGET" if not states else
              "HARD_CAP_REACHED" if "HARD_CAP_REACHED" in states else
              "UNKNOWN_SPEND" if "UNKNOWN_SPEND" in states else
              "HARD_CAP_NOT_REACHED" if "HARD_CAP_NOT_REACHED" in states else
              "BUDGET_WITHOUT_HARD_CAP")
    return {"status": status, "error": None, "items": result}


def collect(scope, owner, token, year, month):
    if not token:
        return {
            "scope": scope, "owner": owner, "status": "UNKNOWN",
            "summary_error": "BILLING_TOKEN_NOT_CONFIGURED",
            "usage_items": [], "totals": UNKNOWN_TOTALS.copy(),
            "repositories": [], "repository_list_error": "BILLING_TOKEN_NOT_CONFIGURED",
            "budget": {"status": "UNKNOWN" if scope == "organization" else "NOT_APPLICABLE",
                       "error": "BILLING_TOKEN_NOT_CONFIGURED" if scope == "organization" else None,
                       "items": []},
        }
    summary, summary_error = get(token, path_for(scope, owner, year, month))
    rows = items(summary) if not summary_error else []
    if scope == "user":
        repos, list_error = pages(token, "/user/repos?visibility=all&affiliation=owner&sort=full_name")
        repos = [r for r in repos if r.get("owner", {}).get("type") == "User"
                 and r.get("owner", {}).get("login", "").lower() == owner.lower()]
    else:
        repos, list_error = pages(token, f"/orgs/{owner}/repos?type=all&sort=full_name")
        repos = [r for r in repos if r.get("owner", {}).get("login", "").lower() == owner.lower()]
    repository_rows = []
    for repo in repos:
        name = repo.get("full_name")
        if not isinstance(name, str) or "/" not in name:
            continue
        data, error = get(token, path_for(scope, owner, year, month, name))
        repo_items = items(data) if not error else []
        repository_rows.append({
            "full_name": name, "visibility": "private" if repo.get("private") else "public",
            "archived": bool(repo.get("archived", False)),
            "status": "UNKNOWN" if error else "OK", "error": error,
            "usage_items": repo_items,
            "totals": totals(repo_items) if not error else UNKNOWN_TOTALS.copy(),
        })
    budget = {"status": "NOT_APPLICABLE", "error": None, "items": []}
    if scope == "organization":
        data, error = get(token, f"/organizations/{owner}/settings/billing/budgets?per_page=100")
        budget = evaluate_budgets(data, rows if not summary_error else None,
                                  repository_rows, error)
    errors = [summary_error, list_error, budget.get("error")]
    errors += [r["error"] for r in repository_rows]
    errors = [e for e in errors if e]
    status = "UNKNOWN" if summary_error and list_error else "PARTIAL" if errors else "OK"
    return {
        "scope": scope, "owner": owner, "status": status,
        "summary_error": summary_error, "usage_items": rows,
        "totals": totals(rows) if not summary_error else UNKNOWN_TOTALS.copy(),
        "repositories": repository_rows, "repository_list_error": list_error,
        "budget": budget,
    }


def collect_all(user_token, org_map, username, organizations):
    now = datetime.now(timezone.utc)
    year, month = now.year, now.month
    accounts = [collect("user", username, user_token, year, month)]
    accounts += [collect("organization", org, org_map.get(org), year, month)
                 for org in organizations]
    return {
        "schema_version": 2, "collected_at_utc": now.isoformat(),
        "billing_period": f"{year:04d}-{month:02d}",
        "data_source": "GitHub Billing Usage Summary REST API",
        "remaining_included_minutes": "NOT_EXPOSED_BY_USAGE_SUMMARY_API",
        "accounts": accounts,
    }


def fmt(value, digits=2):
    return "UNKNOWN" if value is None else f"{value:,.{digits}f}"


def render(report, history):
    lines = [
        "# GitHub Actions Usage Dashboard", "",
        f"Billing period: {report['billing_period']}  ",
        f"Updated (UTC): {report['collected_at_utc']}", "",
        "> Shows Actions consumption and billed amounts. The API does not expose remaining included-minute allowance; no balance or percentage is inferred.",
        "", "## Account and organization overview", "",
        "| Scope | Owner | Repositories | Status | Actions budget | Total min | Included min | Billable min | Net amount |",
        "|---|---|---:|---|---|---:|---:|---:|---:|",
    ]
    for a in report["accounts"]:
        count = str(len(a["repositories"])) if a["repository_list_error"] is None else "UNKNOWN"
        t = a["totals"]
        lines.append(
            f"| {a['scope']} | {a['owner']} | {count} | {a['status']} "
            f"| {a['budget']['status']} | {fmt(t['gross_minutes'])} "
            f"| {fmt(t['discounted_minutes'])} | {fmt(t['billable_minutes'])} "
            f"| {fmt(t['net_amount'], 4)} |"
        )
    lines += ["", "## Repository breakdown", "",
              "| Repository | Visibility | Archived | Status | Total min | Included min | Billable min | Net amount |",
              "|---|---|---:|---|---:|---:|---:|---:|"]
    repos = [r for a in report["accounts"] for r in a["repositories"]]
    for r in sorted(repos, key=lambda x: x["full_name"].lower()):
        t = r["totals"]
        lines.append(
            f"| {r['full_name']} | {r['visibility']} | {'yes' if r['archived'] else 'no'} "
            f"| {r['status']} | {fmt(t['gross_minutes'])} | {fmt(t['discounted_minutes'])} "
            f"| {fmt(t['billable_minutes'])} | {fmt(t['net_amount'], 4)} |"
        )
    if not repos:
        lines.append("| — | — | — | No repository usage rows returned | — | — | — | — |")
    lines += ["", "## Organization Actions budgets", "",
              "| Organization | Scope | Entity | Budget | Observed net amount | Hard cap | Status |",
              "|---|---|---|---:|---:|---|---|"]
    budget_rows = [(a["owner"], b) for a in report["accounts"] if a["scope"] == "organization"
                   for b in a["budget"]["items"]]
    for owner, b in budget_rows:
        lines.append(
            f"| {owner} | {b['scope']} | {b['entity']} | {fmt(b['budget_amount'])} "
            f"| {fmt(b['observed_net_amount'], 4)} | {'yes' if b['prevent_further_usage'] else 'no'} "
            f"| {b['status']} |"
        )
    if not budget_rows:
        lines.append("| — | — | — | — | — | — | No Actions budget returned or configured |")
    lines += ["", "## Collection issues", ""]
    issues = []
    for a in report["accounts"]:
        for key, label in (("summary_error", "usage summary"),
                           ("repository_list_error", "repository inventory")):
            if a.get(key):
                issues.append(f"- {a['scope']}:{a['owner']} {label}: {a[key]}")
        if a["budget"].get("error"):
            issues.append(f"- {a['scope']}:{a['owner']} budget: {a['budget']['error']}")
        issues += [f"- {r['full_name']}: {r['error']}"
                   for r in a["repositories"] if r.get("error")]
    lines += issues or ["- None"]
    lines += ["", "## Recent snapshots", "",
              "| Collected (UTC) | Period | Owners | Repositories | Total min | Included min | Billable min | Net amount | Status |",
              "|---|---|---:|---:|---:|---:|---:|---:|---|"]
    for h in reversed(history[-30:]):
        lines.append(
            f"| {h.get('collected_at_utc', 'unknown')} | {h.get('billing_period', 'unknown')} "
            f"| {h.get('owner_count', 0)} | {h.get('repository_count', 0)} "
            f"| {fmt(h.get('gross_minutes'))} | {fmt(h.get('discounted_minutes'))} "
            f"| {fmt(h.get('billable_minutes'))} | {fmt(h.get('net_amount'), 4)} "
            f"| {h.get('status', 'UNKNOWN')} |"
        )
    return "\n".join(lines) + "\n"


def write_report(report, directory):
    directory.mkdir(parents=True, exist_ok=True)
    history_path = directory / "usage-history.json"
    try:
        history = json.loads(history_path.read_text(encoding="utf-8")) if history_path.exists() else []
    except (OSError, json.JSONDecodeError):
        history = []
    if not isinstance(history, list):
        history = []
    accounts = report["accounts"]
    keys = ("gross_minutes", "discounted_minutes", "billable_minutes", "net_amount")
    aggregate = {}
    for key in keys:
        values = [a["totals"][key] for a in accounts]
        aggregate[key] = None if any(v is None for v in values) else round(sum(values), 6 if key == "net_amount" else 3)
    statuses = [a["status"] for a in accounts]
    status = "UNKNOWN" if all(s == "UNKNOWN" for s in statuses) else "PARTIAL" if any(s != "OK" for s in statuses) else "OK"
    history.append({
        "collected_at_utc": report["collected_at_utc"],
        "billing_period": report["billing_period"],
        "owner_count": len(accounts),
        "repository_count": sum(len(a["repositories"]) for a in accounts),
        **aggregate, "status": status,
    })
    history = history[-365:]
    (directory / "usage-latest.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    history_path.write_text(json.dumps(history, indent=2) + "\n", encoding="utf-8")
    (directory / "dashboard.md").write_text(render(report, history), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--report-dir", type=Path, required=True)
    parser.add_argument("--org-targets-file", type=Path, required=True)
    args = parser.parse_args()
    username = os.getenv("GITHUB_USERNAME", "").strip()
    if not username:
        print("GITHUB_USERNAME_NOT_CONFIGURED", file=sys.stderr)
        return 2
    report = collect_all(
        os.getenv("USER_BILLING_TOKEN", "").strip(),
        org_tokens(os.getenv("ORG_BILLING_TOKENS_JSON", "{}")),
        username, org_targets(args.org_targets_file),
    )
    write_report(report, args.report_dir)
    counts = {s: sum(a["status"] == s for a in report["accounts"])
              for s in ("OK", "PARTIAL", "UNKNOWN")}
    print(f"COLLECTION_COMPLETE owners={len(report['accounts'])} "
          f"repositories={sum(len(a['repositories']) for a in report['accounts'])} "
          f"ok={counts['OK']} partial={counts['PARTIAL']} unknown={counts['UNKNOWN']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
