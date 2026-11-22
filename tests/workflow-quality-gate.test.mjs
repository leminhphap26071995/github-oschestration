import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyRootCause,
  collectActionReferences,
  evaluateActionRuntime,
  inspectJobEvidence,
  parseActionRuntime
} from "../scripts/workflow-quality-gate.mjs";

test("classifies a real YAML parser diagnostic", () => {
  assert.equal(classifyRootCause("could not parse as YAML: yaml: line 3: did not find expected ',' or ']' [syntax-check]"), "WORKFLOW_YAML_SYNTAX_ERROR");
});

test("classifies workflow schema and expression diagnostics", () => {
  assert.equal(classifyRootCause("The workflow is not valid. Unexpected value 'stepss'"), "WORKFLOW_SCHEMA_OR_EXPRESSION_ERROR");
  assert.equal(classifyRootCause("Unrecognized function: hashFiles"), "WORKFLOW_SCHEMA_OR_EXPRESSION_ERROR");
});

test("does not infer quota from missing jobs, runner or logs", () => {
  const evidence = inspectJobEvidence({ total_count: 0, jobs: [] });
  assert.equal(evidence.job_count, 0);
  assert.equal(evidence.runner_id_state, "NOT_PRESENT_NO_JOB_RECORD");
  assert.equal(evidence.steps_state, "NOT_PRESENT_NO_JOB_RECORD");
  assert.equal(evidence.quota, "UNKNOWN");
});

test("preserves runner_id zero and empty steps without calling it quota", () => {
  const evidence = inspectJobEvidence([{ runner_id: 0, steps: [] }]);
  assert.equal(evidence.runner_id_state, "PRESENT_ZERO");
  assert.equal(evidence.steps_state, "EMPTY");
  assert.equal(evidence.classification, "RUNNER_UNASSIGNED_NO_STEPS");
  assert.equal(evidence.quota, "UNKNOWN");
});

test("requires explicit billing evidence for quota classification", () => {
  assert.equal(classifyRootCause("GitHub Actions included minutes exhausted; spending limit reached"), "QUOTA_EXHAUSTED");
  assert.equal(classifyRootCause("BlobNotFound"), "UNKNOWN");
  assert.equal(classifyRootCause("Process completed with exit code 1."), "STEP_FAILURE_UNDIAGNOSED");
});

test("parses action metadata and rejects retired Node runtimes", () => {
  assert.equal(parseActionRuntime("name: legacy\nruns:\n  using: node20\n  main: index.js"), "node20");
  assert.equal(parseActionRuntime("name: current\nruns:\n  using: node24\n  main: index.js"), "node24");
  assert.equal(evaluateActionRuntime("node20"), "RETIRED");
  assert.equal(evaluateActionRuntime("node16"), "RETIRED");
  assert.equal(evaluateActionRuntime("node24"), "SUPPORTED");
  assert.equal(evaluateActionRuntime("composite"), "SUPPORTED");
});

test("extracts action references from workflow steps", () => {
  assert.deepEqual(collectActionReferences("steps:\n  - uses: actions/checkout@v7\n  - uses: ./local/action\n"), ["actions/checkout@v7", "./local/action"]);
});
