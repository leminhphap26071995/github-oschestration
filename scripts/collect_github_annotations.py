#!/usr/bin/env python3
"""Collect annotations for one exact GitHub Actions workflow run."""
from __future__ import annotations
import argparse, json, os, re, sys, urllib.error, urllib.parse, urllib.request
from typing import Any

API_ROOT = "https://api.github.com"

class GitHubAPIError(RuntimeError):
    pass

class GitHubAnnotationsCollector:
    def __init__(self, token: str, opener=None, api_root: str = API_ROOT):
        if not token:
            raise ValueError("GH_TOKEN is required")
        self.token = token
        self.opener = opener or urllib.request.urlopen
        self.api_root = api_root.rstrip("/")

    def _get_json(self, url: str):
        request = urllib.request.Request(url, headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "github-actions-annotation-collector",
        })
        try:
            with self.opener(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8")), response.headers.get("Link")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            if exc.code == 404:
                detail = "resource missing or token cannot access target repository; cross-repository private access requires an authorized token. " + detail
            raise GitHubAPIError(f"GitHub API HTTP {exc.code} for {url}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise GitHubAPIError(f"GitHub API transport error for {url}: {exc}") from exc

    def _pages(self, url: str, key: str | None = None):
        values, next_url = [], url
        while next_url:
            payload, link = self._get_json(next_url)
            page = payload if key is None else payload.get(key)
            if not isinstance(page, list):
                raise GitHubAPIError(f"Expected a JSON array from {next_url}")
            values.extend(page)
            match = re.search(r'<([^>]+)>;\s*rel="next"', link or "")
            next_url = match.group(1) if match else None
        return values

    @staticmethod
    def _resolve_check_run(job, repository: str, run_id: int):
        url = job.get("check_run_url")
        if not isinstance(url, str):
            raise GitHubAPIError(f"Job {job.get('id')} has no check_run_url")
        parts = [p for p in urllib.parse.urlparse(url).path.split("/") if p]
        try:
            i = parts.index("repos")
            actual_repo = f"{parts[i+1]}/{parts[i+2]}"
            j = parts.index("check-runs")
            check_id = parts[j+1]
        except (ValueError, IndexError) as exc:
            raise GitHubAPIError(f"Invalid check_run_url: {url}") from exc
        if actual_repo.lower() != repository.lower():
            raise GitHubAPIError(f"Job {job.get('id')} points to {actual_repo}, not {repository}")
        if not check_id.isdigit():
            raise GitHubAPIError(f"Invalid check-run ID in {url}")
        if int(job.get("run_id", -1)) != run_id:
            raise GitHubAPIError(f"Job {job.get('id')} belongs to run {job.get('run_id')}, not {run_id}")
        return check_id

    def collect(self, repository: str, run_id: int, check_run_id: int | None = None):
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
            raise ValueError("repository must use owner/repo format")
        if run_id <= 0 or (check_run_id is not None and check_run_id <= 0):
            raise ValueError("run_id and check_run_id must be positive integers")
        repo_path = urllib.parse.quote(repository, safe="/")
        run, _ = self._get_json(f"{self.api_root}/repos/{repo_path}/actions/runs/{run_id}")
        actual_repo = (run.get("repository") or {}).get("full_name")
        if int(run.get("id", -1)) != run_id or not actual_repo or actual_repo.lower() != repository.lower():
            raise GitHubAPIError(f"Run identity mismatch: requested {repository}#{run_id}, API returned {actual_repo}#{run.get('id')}")
        attempt = int(run.get("run_attempt") or 1)
        jobs_url = f"{self.api_root}/repos/{repo_path}/actions/runs/{run_id}/attempts/{attempt}/jobs?per_page=100"
        jobs = self._pages(jobs_url, "jobs")
        if not jobs:
            raise GitHubAPIError(f"Run {run_id} attempt {attempt} returned no jobs")
        resolved = [(job, self._resolve_check_run(job, repository, run_id)) for job in jobs]
        if check_run_id is not None:
            resolved = [(job, cid) for job, cid in resolved if cid == str(check_run_id)]
            if not resolved:
                raise GitHubAPIError(f"Check run {check_run_id} does not belong to {repository} run {run_id}")
        check_runs, annotations = [], []
        for job, cid in resolved:
            url = f"{self.api_root}/repos/{repo_path}/check-runs/{cid}/annotations?per_page=100"
            records = self._pages(url)
            check_runs.append({
                "check_run_id": int(cid), "job_id": job.get("id"), "job_name": job.get("name"),
                "status": job.get("status"), "conclusion": job.get("conclusion"), "annotations": records,
            })
            annotations.extend({
                "check_run_id": int(cid), "job_id": job.get("id"), "job_name": job.get("name"),
                "job_conclusion": job.get("conclusion"), **record,
            } for record in records)
        return {
            "schema_version": 1, "repository": repository, "run_id": run_id, "run_attempt": attempt,
            "workflow_name": run.get("name"), "workflow_path": run.get("path"), "head_sha": run.get("head_sha"),
            "run_status": run.get("status"), "run_conclusion": run.get("conclusion"),
            "jobs": [{
                "job_id": job.get("id"), "job_name": job.get("name"), "check_run_id": int(cid),
                "status": job.get("status"), "conclusion": job.get("conclusion"),
            } for job, cid in resolved],
            "check_runs": check_runs, "annotation_count": len(annotations), "annotations": annotations,
        }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", required=True, help="Target owner/repo")
    parser.add_argument("--run-id", required=True, type=int, help="Exact Actions run ID")
    parser.add_argument("--check-run-id", type=int, help="Optional check-run ID; defaults to all jobs in the run")
    parser.add_argument("--output", help="Write JSON to a file instead of stdout")
    args = parser.parse_args()
    try:
        result = GitHubAnnotationsCollector(os.environ.get("GH_TOKEN", "")).collect(
            args.repository, args.run_id, args.check_run_id)
    except (ValueError, GitHubAPIError) as exc:
        print(f"annotation collection failed: {exc}", file=sys.stderr)
        return 2
    rendered = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        with open(args.output, "w", encoding="utf-8") as stream:
            stream.write(rendered)
    else:
        sys.stdout.write(rendered)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
