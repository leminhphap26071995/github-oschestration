#!/usr/bin/env python3
"""Discover orgs owned by the billing-token identity and prepare one-token collector env."""
import argparse
import json
import os
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API = "https://api.github.com"
VERSION = "2026-03-10"
ORG_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$")


def request(token, path):
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
        accepted = exc.headers.get("X-Accepted-OAuth-Scopes", "").strip()
        detail = f"HTTP_{exc.code}"
        if accepted:
            detail += f"_ACCEPTED_SCOPES_{accepted.replace(',', '+').replace(' ', '')}"
        return None, detail
    except (URLError, TimeoutError):
        return None, "NETWORK_ERROR"
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None, "INVALID_JSON"


def discover(token):
    if not token:
        return [], "BILLING_TOKEN_NOT_CONFIGURED"
    found = []
    for page in range(1, 101):
        data, error = request(token, f"/user/memberships/orgs?state=active&per_page=100&page={page}")
        if error:
            return found, error
        if not isinstance(data, list):
            return found, "INVALID_RESPONSE"
        for membership in data:
            if not isinstance(membership, dict) or membership.get("state") != "active":
                continue
            if str(membership.get("role", "")).lower() != "admin":
                continue
            organization = membership.get("organization") or {}
            login = organization.get("login") if isinstance(organization, dict) else None
            if isinstance(login, str) and ORG_RE.fullmatch(login):
                if login.lower() not in {x.lower() for x in found}:
                    found.append(login)
        if len(data) < 100:
            return sorted(found, key=str.lower), None
    return sorted(found, key=str.lower), "PAGINATION_LIMIT"


def prepare(targets_file, output_file, discovery_file, token, github_env=None):
    config = json.loads(Path(targets_file).read_text(encoding="utf-8"))
    configured = config.get("organizations", []) if isinstance(config, dict) else None
    if not isinstance(configured, list):
        raise ValueError("targets file must contain an organizations array")
    for org in configured:
        if not isinstance(org, str) or not ORG_RE.fullmatch(org):
            raise ValueError("Invalid organization login in targets file")
    discovered, error = discover(token)
    organizations = list(configured)
    known = {x.lower() for x in organizations}
    for org in discovered:
        if org.lower() not in known:
            organizations.append(org)
            known.add(org.lower())
    Path(output_file).write_text(json.dumps({
        "schema_version": 2,
        "organizations": organizations,
    }, indent=2) + "\n", encoding="utf-8")
    Path(discovery_file).parent.mkdir(parents=True, exist_ok=True)
    Path(discovery_file).write_text(json.dumps({
        "method": "GET /user/memberships/orgs?state=active",
        "role_filter": "admin",
        "status": "UNKNOWN" if error else "OK",
        "error": error,
        "configured_count": len(configured),
        "discovered_count": len(discovered),
        "organization_count": len(organizations),
    }, indent=2) + "\n", encoding="utf-8")
    if token and github_env:
        mapping = {org: token for org in organizations}
        with open(github_env, "a", encoding="utf-8") as stream:
            stream.write(f"USER_BILLING_TOKEN={token}\n")
            stream.write(f"ORG_BILLING_TOKENS_JSON={json.dumps(mapping, separators=(',', ':'))}\n")
    return {"configured": len(configured), "discovered": len(discovered),
            "organizations": len(organizations), "error": error}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--targets-file", required=True)
    parser.add_argument("--output-targets-file", required=True)
    parser.add_argument("--discovery-file", required=True)
    args = parser.parse_args()
    result = prepare(args.targets_file, args.output_targets_file, args.discovery_file,
                     os.getenv("GITHUB_BILLING_TOKEN", "").strip(),
                     os.getenv("GITHUB_ENV"))
    print(f"ORG_DISCOVERY status={'UNKNOWN' if result['error'] else 'OK'} "
          f"configured={result['configured']} discovered={result['discovered']} "
          f"total={result['organizations']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
