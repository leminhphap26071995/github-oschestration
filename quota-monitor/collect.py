#!/usr/bin/env python3
"""Collect Actions billing usage; write all private data to a private report repo."""
import argparse, json, os, re, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API = "https://api.github.com"
VERSION = "2026-03-10"
ORG_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$")


def get(token, path):
    req = Request(API + path, headers={
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": VERSION,
        "User-Agent": "github-oschestration-actions-monitor",
    })
    try:
        with urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode()), None
    except HTTPError as e:
        return None, f"HTTP_{e.code}"
    except (URLError, TimeoutError):
        return None, "NETWORK_ERROR"
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None, "INVALID_JSON"


def pages(token, path):
    out = []
    for page in range(1, 101):
        sep = "&" if "?" in path else "?"
        data, err = get(token, f"{path}{sep}per_page=100&page={page}")
        if err:
            return out, err
        if not isinstance(data, list):
            return out, "INVALID_RESPONSE"
        out.extend(data)
        if len(data) < 100:
            return out, None
    return out, "PAGINATION_LIMIT"


def path_for(scope, owner, year, month, repo=None):
    root = f"/users/{owner}" if scope == "user" else f"/organizations/{owner}"
    params = {"year": year, "month": month, "product": "Actions"}
    if repo:
        params["repository"] = repo
    return f"{root}/settings/billing/usage/summary?{urlencode(params)}"


def items(data):
    out = []
    for x in (data or {}).get("usageItems", []):
        if not isinstance(x, dict) or str(x.get("product", "Actions")).lower() != "actions":
            continue
        out.append({
            "sku": x.get("sku", "unknown"), "unit_type": x.get("unitType", "unknown"),
            "gross_quantity": float(x.get("grossQuantity", x.get("quantity", 0)) or 0),
            "discount_quantity": float(x.get("discountQuantity", 0) or 0),
            "net_quantity": float(x.get("netQuantity", x.get("quantity", 0)) or 0),
            "gross_amount": float(x.get("grossAmount", 0) or 0),
            "discount_amount": float(x.get("discountAmount", 0) or 0),
            "net_amount": float(x.get("netAmount", 0) or 0),
        })
    return out


def totals(rows):
    minutes = [x for x in rows if str(x["unit_type"]).lower() in ("minute", "minutes")]
    return {
        "gross_minutes": round(sum(x["gross_quantity"] for x in minutes), 3),
        "discounted_minutes": round(sum(x["discount_quantity"] for x in minutes), 3),
        "billable_minutes": round(sum(x["net_quantity"] for x in minutes), 3),
        "net_amount": round(sum(x["net_amount"] for x in rows), 6),
    }


def collect(scope, owner, token, year, month):
    data, err = get(token, path_for(scope, owner, year, month))
    result = {"scope": scope, "owner": owner, "status": "UNKNOWN" if err else "OK",
              "summary_error": err, "usage_items": items(data), "private_repositories": [],
              "repository_list_error": None, "budget": {"status": "NOT_APPLICABLE", "error": None}}
    if scope == "organization":
        budgets, be = get(token, f"/organizations/{owner}/settings/billing/budgets?per_page=100")
        if be:
            result["budget"] = {"status": "UNKNOWN", "error": be}
            if not err: result["status"] = "PARTIAL"
        else:
            budgets = budgets if isinstance(budgets, list) else budgets.get("budgets", []) if isinstance(budgets, dict) else []
            action = [b for b in budgets if isinstance(b, dict) and "action" in str(b.get("budget_product_sku", "")).lower()]
            enforced = [b for b in action if b.get("prevent_further_usage") is True]
            reached = any(float(b.get("spent_amount", b.get("amount_spent", 0)) or 0) >= float(b.get("budget_amount", 0) or 0) for b in enforced)
            result["budget"] = {"status": "HARD_CAP_REACHED" if reached else "HARD_CAP_NOT_REACHED" if enforced else "NO_HARD_CAP_CONFIGURED" if action else "NO_ACTIONS_BUDGET", "error": None}
    if err:
        return result
    if scope == "user":
        repos, re = pages(token, "/user/repos?visibility=private&affiliation=owner&sort=full_name")
        repos = [r for r in repos if r.get("private") and r.get("owner", {}).get("type") == "User"]
    else:
        repos, re = pages(token, f"/orgs/{owner}/repos?type=private&sort=full_name")
        repos = [r for r in repos if r.get("private")]
    result["repository_list_error"] = re
    if re: result["status"] = "PARTIAL"
    for repo in repos:
        name = repo.get("full_name")
        if not isinstance(name, str) or "/" not in name: continue
        d, e = get(token, path_for(scope, owner, year, month, name))
        rows = items(d) if not e else []
        result["private_repositories"].append({"full_name": name, "status": "UNKNOWN" if e else "OK", "error": e, "usage_items": rows, "totals": totals(rows)})
        if e: result["status"] = "PARTIAL"
    result["totals"] = totals(result["usage_items"])
    return result


def org_tokens(raw):
    value = json.loads(raw or "{}")
    if not isinstance(value, dict): raise ValueError("ORG_BILLING_TOKENS_JSON must be a JSON object")
    out = {}
    for org, token in value.items():
        if not isinstance(org, str) or not ORG_RE.fullmatch(org): raise ValueError("Invalid organization login in token map")
        if isinstance(token, str) and token.strip(): out[org] = token.strip()
    return out


def collect_all(user_token, org_map, username):
    now = datetime.now(timezone.utc); y, m = now.year, now.month
    report = {"schema_version": 1, "collected_at_utc": now.isoformat(), "billing_period": f"{y:04d}-{m:02d}",
              "data_source": "GitHub Billing Usage Summary REST API",
              "remaining_included_minutes": "NOT_EXPOSED_BY_USAGE_SUMMARY_API", "accounts": []}
    if user_token and username:
        report["accounts"].append(collect("user", username, user_token, y, m))
    for org, token in sorted(org_map.items()):
        report["accounts"].append(collect("organization", org, token, y, m))
    return report


def render(report, history):
    lines = ["# GitHub Actions Usage Dashboard", "", f"**Period:** `{report['billing_period']}`  ",
             f"**Updated (UTC):** `{report['collected_at_utc']}`", "",
             "> Usage summary reports consumption and billed amount, not remaining included minutes. No remaining balance or percentage is inferred.", "",
             "## Account overview", "", "| Scope | Owner | Private repos | Status | Actions hard cap | Total min | Included min | Billable min | Net amount |", "|---|---|---:|---|---|---:|---:|---:|---:|"]
    for a in report["accounts"]:
        t = a.get("totals", totals(a.get("usage_items", [])))
        lines.append(f"| {a['scope']} | `{a['owner']}` | {len(a.get('private_repositories', []))} | {a['status']} | {a.get('budget', {}).get('status', 'NOT_CHECKED')} | {t['gross_minutes']:,.2f} | {t['discounted_minutes']:,.2f} | {t['billable_minutes']:,.2f} | {t['net_amount']:,.2f} |")
    lines += ["", "## Private repository usage", "", "| Repository | Status | Total min | Included min | Billable min | Net amount |", "|---|---|---:|---:|---:|---:|"]
    repos = [r for a in report["accounts"] for r in a.get("private_repositories", [])]
    for r in sorted(repos, key=lambda x: x["full_name"].lower()):
        t = r["totals"]
        lines.append(f"| `{r['full_name']}` | {r['status']} | {t['gross_minutes']:,.2f} | {t['discounted_minutes']:,.2f} | {t['billable_minutes']:,.2f} | {t['net_amount']:,.2f} |")
    if not repos: lines.append("| — | No private repositories returned | — | — |")
    lines += ["", "## Collection issues", ""]
    issues = []
    for a in report["accounts"]:
        for field, label in (("summary_error", "summary"), ("repository_list_error", "repository list")):
            if a.get(field): issues.append(f"- `{a['scope']}:{a['owner']}` {label}: `{a[field]}`")
        if a.get("budget", {}).get("error"): issues.append(f"- `{a['scope']}:{a['owner']}` budget: `{a['budget']['error']}`")
        for r in a.get("private_repositories", []):
            if r.get("error"): issues.append(f"- `{r['full_name']}`: `{r['error']}`")
    lines += issues or ["- None"]
    lines += ["", "## Recent snapshots", "", "| Collected (UTC) | Period | Owners | Private repos | Total min | Included min | Billable min | Net amount | Status |", "|---|---|---:|---:|---:|---:|---:|---:|---|"]
    for h in reversed(history[-30:]):
        lines.append(f"| `{h.get('collected_at_utc', 'unknown')}` | `{h.get('billing_period', 'unknown')}` | {h.get('owner_count', 0)} | {h.get('repository_count', 0)} | {h.get('gross_minutes', 0):,.2f} | {h.get('discounted_minutes', 0):,.2f} | {h.get('billable_minutes', 0):,.2f} | {h.get('net_amount', 0):,.2f} | {h.get('status', 'UNKNOWN')} |")
    return "\n".join(lines) + "\n"


def write_report(report, directory):
    directory.mkdir(parents=True, exist_ok=True)
    hp = directory / "usage-history.json"
    try: history = json.loads(hp.read_text()) if hp.exists() else []
    except (OSError, json.JSONDecodeError): history = []
    if not isinstance(history, list): history = []
    repos = sum(len(a.get("private_repositories", [])) for a in report["accounts"])
    states = [a.get("status", "UNKNOWN") for a in report["accounts"]]
    status = "UNKNOWN" if not states or all(s == "UNKNOWN" for s in states) else "PARTIAL" if any(s != "OK" for s in states) else "OK"
    total = totals([i for a in report["accounts"] for i in a.get("usage_items", [])])
    history.append({"collected_at_utc": report["collected_at_utc"], "billing_period": report["billing_period"],
                    "owner_count": len(states), "repository_count": repos, **total, "status": status})
    history = history[-365:]
    (directory / "usage-latest.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    hp.write_text(json.dumps(history, indent=2) + "\n")
    (directory / "README.md").write_text(render(report, history))


def main():
    p = argparse.ArgumentParser(); p.add_argument("--report-dir", type=Path, required=True); args = p.parse_args()
    user_token = os.getenv("USER_BILLING_TOKEN", "").strip()
    org_map = org_tokens(os.getenv("ORG_BILLING_TOKENS_JSON", "{}"))
    username = os.getenv("GITHUB_USERNAME", "").strip()
    if not user_token and not org_map:
        print("NO_BILLING_TOKENS_CONFIGURED", file=sys.stderr); return 2
    if user_token and not username:
        print("GITHUB_USERNAME_NOT_CONFIGURED", file=sys.stderr); return 2
    write_report(collect_all(user_token, org_map, username), args.report_dir)
    print("COLLECTION_COMPLETE private_report_files_written=true")
    return 0


if __name__ == "__main__": raise SystemExit(main())
