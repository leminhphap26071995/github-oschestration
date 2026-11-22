#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

export function classifyRootCause(message = "") {
  const value = String(message);
  if (/could not parse as YAML|yaml syntax|syntax-check/i.test(value)) return "WORKFLOW_YAML_SYNTAX_ERROR";
  if (/workflow is not valid|unexpected value|required property|unrecognized function|invalid workflow file/i.test(value)) return "WORKFLOW_SCHEMA_OR_EXPRESSION_ERROR";
  if (/node\.?js?\s*(16|20).*(deprecated|retired|no longer supported)|runtime.*node(16|20).*(deprecated|retired|removed)/i.test(value)) return "ACTION_RUNTIME_RETIRED";
  if (/no runner matching|runner.*unavailable|runner.*not found/i.test(value)) return "RUNNER_UNAVAILABLE";
  if (/permission denied|resource not accessible by integration|forbidden/i.test(value)) return "PERMISSION_DENIED";
  if (/actions minutes.*(exhausted|limit)|included minutes.*(exhausted|limit)|spending limit|billing limit|payment required/i.test(value)) return "QUOTA_EXHAUSTED";
  if (/process completed with exit code|command failed|step failed/i.test(value)) return "STEP_FAILURE_UNDIAGNOSED";
  return "UNKNOWN";
}

export function inspectJobEvidence(jobsPayload) {
  const jobs = Array.isArray(jobsPayload) ? jobsPayload : jobsPayload?.jobs;
  if (!Array.isArray(jobs)) {
    return { job_count: null, runner_id_state: "MISSING", steps_state: "MISSING", classification: "EXECUTION_EVIDENCE_MISSING", quota: "UNKNOWN" };
  }
  if (jobs.length === 0) {
    return { job_count: 0, runner_id_state: "NOT_PRESENT_NO_JOB_RECORD", steps_state: "NOT_PRESENT_NO_JOB_RECORD", classification: "NO_JOB_RECORD", quota: "UNKNOWN" };
  }
  const job = jobs[0];
  const hasRunner = Object.prototype.hasOwnProperty.call(job, "runner_id");
  const runner = !hasRunner ? "MISSING" : job.runner_id === null ? "EXPLICIT_NULL" : job.runner_id === 0 ? "PRESENT_ZERO" : "PRESENT_NONZERO";
  const hasSteps = Object.prototype.hasOwnProperty.call(job, "steps") && Array.isArray(job.steps);
  const steps = !hasSteps ? "MISSING" : job.steps.length === 0 ? "EMPTY" : "PRESENT";
  const classification = runner === "PRESENT_ZERO" && steps === "EMPTY" ? "RUNNER_UNASSIGNED_NO_STEPS" : "JOB_RECORD_PRESENT";
  return { job_count: jobs.length, runner_id_state: runner, steps_state: steps, classification, quota: "UNKNOWN" };
}

export function parseActionRuntime(metadata = "") {
  const runsAt = String(metadata).search(/^runs:\s*$/m);
  if (runsAt < 0) return null;
  const section = String(metadata).slice(runsAt);
  const match = section.match(/^\s{2,}using:\s*["']?([A-Za-z0-9]+)["']?\s*$/m);
  return match ? match[1].toLowerCase() : null;
}

export function evaluateActionRuntime(runtime) {
  if (runtime === "node24" || runtime === "composite" || runtime === "docker") return "SUPPORTED";
  if (runtime === "node16" || runtime === "node20") return "RETIRED";
  if (runtime?.startsWith("node")) return "UNSUPPORTED";
  return "UNKNOWN";
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function getRemoteMetadata(owner, repoName, actionPath, ref) {
  const rootFile = actionPath ? actionPath + "/action.yml" : "action.yml";
  const candidates = [rootFile, rootFile.replace(/action\.yml$/, "action.yaml")];
  let lastError = "";
  for (const path of candidates) {
    try {
      const apiPath = "repos/" + owner + "/" + repoName + "/contents/" + path + "?ref=" + encodeURIComponent(ref);
      const encoded = execFileSync("gh", ["api", apiPath, "--jq", ".content"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
      if (encoded) return Buffer.from(encoded, "base64").toString("utf8");
    } catch (error) {
      lastError = error.stderr?.toString?.() || error.message || String(error);
    }
  }
  throw new Error(lastError || "action.yml/action.yaml not found");
}

function inspectReference(reference, root) {
  if (reference.startsWith("docker://")) return { reference, runtime: "docker", status: "SUPPORTED", source: "docker-reference" };
  if (reference.startsWith("./")) {
    const dir = join(root, reference);
    const candidates = [join(dir, "action.yml"), join(dir, "action.yaml")];
    const file = candidates.find(existsSync);
    if (!file) return { reference, runtime: null, status: "UNKNOWN", source: "local-metadata-missing" };
    const runtime = parseActionRuntime(readFileSync(file, "utf8"));
    return { reference, runtime, status: evaluateActionRuntime(runtime), source: relative(root, file) };
  }

  const at = reference.lastIndexOf("@");
  if (at < 0) return { reference, runtime: null, status: "UNKNOWN", source: "unpinned-reference" };
  const spec = reference.slice(0, at);
  const ref = reference.slice(at + 1);
  const parts = spec.split("/");
  if (parts.length < 2) return { reference, runtime: null, status: "UNKNOWN", source: "invalid-reference" };
  const owner = parts[0];
  const repoName = parts[1];
  const actionPath = parts.slice(2).join("/");
  try {
    const metadata = getRemoteMetadata(owner, repoName, actionPath, ref);
    const runtime = parseActionRuntime(metadata);
    return { reference, runtime, status: evaluateActionRuntime(runtime), source: owner + "/" + repoName + "/" + (actionPath || ".") + "@" + ref };
  } catch (error) {
    return { reference, runtime: null, status: "UNKNOWN", source: "metadata-unavailable", detail: String(error).split("\n")[0] };
  }
}

export function collectActionReferences(workflowText) {
  return [...String(workflowText).matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)/gm)].map(match => match[1]);
}

export function inspectWorkflowText(workflowText, root = process.cwd()) {
  const references = [...new Set(collectActionReferences(workflowText))];
  return references.map(reference => inspectReference(reference, root));
}

export function main(root = process.cwd()) {
  const workflowFiles = walk(join(root, ".github/workflows")).filter(path => /\.ya?ml$/i.test(path));
  if (workflowFiles.length === 0) throw new Error("No workflow YAML files found.");
  const references = [...new Set(workflowFiles.flatMap(path => collectActionReferences(readFileSync(path, "utf8"))))];
  const results = references.map(reference => inspectReference(reference, root));
  console.log("# Workflow Quality Gate — Action Runtime Inventory");
  console.log("");
  console.log("- Workflow files scanned: " + workflowFiles.length);
  console.log("- Unique action references: " + references.length);
  console.log("");
  for (const result of results) {
    console.log("- " + result.status + ": " + result.reference + " — runtime=" + (result.runtime || "UNKNOWN") + "; source=" + result.source + (result.detail ? "; detail=" + result.detail : ""));
  }
  const failures = results.filter(result => result.status !== "SUPPORTED");
  if (failures.length) {
    console.error("QUALITY_GATE_FAILED: " + failures.length + " action runtime(s) are retired, unsupported or unverified.");
    process.exitCode = 1;
  } else {
    console.log("");
    console.log("QUALITY_GATE_PASS: all referenced action runtimes were resolved and are supported.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
