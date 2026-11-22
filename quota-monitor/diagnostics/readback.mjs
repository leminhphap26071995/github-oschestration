#!/usr/bin/env node
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createGitHubApi, GitHubApiError } from "./github-api.mjs";
import { sanitizeText } from "./classify.mjs";

function errorRecord(error) {
  if (error instanceof GitHubApiError) {
    return { status: "API_ERROR", http_status: error.status, retry_after: error.retryAfter, code: error.code };
  }
  return { status: "API_ERROR", http_status: null, retry_after: null, code: sanitizeText(error?.message || "UNEXPECTED_API_ERROR") };
}

function checkRunId(value, repository, apiOrigin) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const prefix = "/repos/" + repository + "/check-runs/";
    if (url.origin !== apiOrigin || !url.pathname.startsWith(prefix)) return null;
    const id = Number(url.pathname.slice(prefix.length));
    if (!Number.isSafeInteger(id) || id <= 0 || url.search || url.hash) return null;
    return id;
  } catch {
    return null;
  }
}

export async function readbackObserverAnnotations({
  repository,
  runId,
  attempt,
  token,
  apiUrl = "https://api.github.com",
  fetchImpl = globalThis.fetch,
} = {}) {
  const api = createGitHubApi({ token, apiUrl, fetchImpl });
  const [owner, repo] = repository.split("/");
  api.setRepository(owner, repo);
  const url = "/repos/" + owner + "/" + repo + "/actions/runs/" + runId +
    "/attempts/" + attempt + "/jobs?per_page=100";
  const page = await api.paginate(url, "jobs");
  const jobs = [];
  for (const job of page.items) {
    const record = {
      job_id: job.id ?? null,
      name: sanitizeText(job.name),
      runner_id: Object.hasOwn(job, "runner_id") ? job.runner_id : "MISSING",
      check_run_id: null,
      annotation_status: "NOT_AVAILABLE",
      annotation_count: 0,
      annotation_page_count: 0,
      annotations: [],
    };
    const id = checkRunId(job.check_run_url, repository, api.apiOrigin);
    if (id === null) {
      record.annotation_status = "INVALID_OR_MISSING_CHECK_RUN_URL";
      jobs.push(record);
      continue;
    }
    record.check_run_id = id;
    try {
      const annotationsUrl = "/repos/" + owner + "/" + repo + "/check-runs/" + id + "/annotations?per_page=100";
      const annotations = await api.paginate(annotationsUrl, null);
      record.annotation_status = "RETRIEVED";
      record.annotation_count = annotations.items.length;
      record.annotation_page_count = annotations.pageCount;
      record.annotations = annotations.items.map(item => ({
        path: sanitizeText(item.path),
        start_line: item.start_line ?? null,
        end_line: item.end_line ?? null,
        annotation_level: sanitizeText(item.annotation_level),
        title: sanitizeText(item.title),
        message: sanitizeText(item.message),
      }));
    } catch (error) {
      record.annotation_status = "API_ERROR";
      record.annotation_error = errorRecord(error);
    }
    jobs.push(record);
  }
  return {
    schema_version: 1,
    recorded_at: new Date().toISOString(),
    observer_run_id: runId,
    observer_run_attempt: attempt,
    repository,
    jobs_page_count: page.pageCount,
    jobs,
  };
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = Number(process.env.GITHUB_RUN_ID);
  const attempt = Number(process.env.GITHUB_RUN_ATTEMPT);
  const token = process.env.GITHUB_TOKEN;
  if (!repository || !Number.isSafeInteger(runId) || runId <= 0 ||
      !Number.isSafeInteger(attempt) || attempt <= 0 || !token) {
    throw new Error("MISSING_OBSERVER_READBACK_CONTEXT");
  }
  const record = await readbackObserverAnnotations({ repository, runId, attempt, token });
  await mkdir("evidence", { recursive: true });
  await writeFile("evidence/observer-annotations.json", JSON.stringify(record, null, 2) + "\n", "utf8");
  const lines = [
    "# Observer Check Run Annotation Readback",
    "",
    "- Observer run: " + runId,
    "- Attempt: " + attempt,
    "- Jobs pages: " + record.jobs_page_count,
    "",
    "| Job ID | Check Run ID | Annotations | Retrieval |",
    "| ---: | ---: | ---: | --- |",
  ];
  for (const job of record.jobs) {
    lines.push("| " + (job.job_id ?? "UNKNOWN") + " | " + (job.check_run_id ?? "UNKNOWN") +
      " | " + job.annotation_count + " | " + job.annotation_status + " |");
  }
  for (const job of record.jobs) {
    for (const annotation of job.annotations) {
      lines.push("- " + annotation.annotation_level + ": " + annotation.path + ":" +
        (annotation.start_line ?? "?") + " — " + annotation.message);
    }
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n", "utf8");
  }
  process.stdout.write(JSON.stringify(record) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    process.stderr.write("ANNOTATION_READBACK_FAILED: " + sanitizeText(error.message) + "\n");
    process.exitCode = 1;
  });
}
