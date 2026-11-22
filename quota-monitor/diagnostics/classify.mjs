const QUOTA_PATTERNS = [
  /github actions[^\n]{0,160}(?:spending (?:limit|cap)[^\n]{0,50}(?:reached|exceeded)|included (?:compute )?(?:minutes|usage)[^\n]{0,50}(?:exhausted|used up)|billing (?:is )?(?:blocked|disabled|suspended)|payment required|usage blocked)/i,
  /actions billing[^\n]{0,120}(?:spending (?:limit|cap)|included (?:compute )?(?:minutes|usage)|exhausted|blocked|payment required)/i,
  /(?:your )?account (?:is currently )?(?:over its spending limit|has exceeded its included usage)[^\n]{0,100}(?:github actions|actions)/i,
  /(?:included minutes|included compute usage) (?:for|on) github actions[^\n]{0,80}(?:exhausted|used up|blocked)/i,
];
const PERMISSION_PATTERNS = [
  /resource not accessible by integration/i,
  /github actions (?:token|workflow token).{0,100}(?:does not have|lacks|missing).{0,80}permission/i,
  /insufficient permissions for (?:the )?github actions token/i,
  /not authorized to perform this action/i,
  /environment protection rule.{0,100}(?:approval|required reviewers|denied)/i,
  /required reviewers? (?:have not|has not) approved/i,
];
const ADMISSION_PATTERNS = [
  /github actions (?:is )?disabled for this repository/i,
  /actions (?:are|is) disabled by (?:the )?(?:repository|organization|enterprise) policy/i,
  /workflow execution is disabled for this repository/i,
  /this repository is not permitted to use github actions/i,
  /workflow state:\s*disabled_(?:inactivity|manually)/i,
  /\bdisabled_(?:inactivity|manually)\b/i,
];
const ACTION_RUNTIME_PATTERNS = [
  /node\.js\s+(?:16|20)\s+(?:actions|runtime).{0,100}(?:deprecated|retired|no longer supported)/i,
  /node\.js\s+(?:16|20)\s+actions? (?:are|is) deprecated/i,
  /unsupported node\.js runtime/i,
  /action requires a newer runner version/i,
  /runner version is below the minimum required version/i,
];
const RUNNER_PATTERNS = [
  /no hosted runner available for this job/i,
  /no runner matching the specified labels was found/i,
  /unable to find a runner matching the specified labels/i,
  /all hosted runners are busy and waiting for a runner to become available/i,
  /runner group.{0,80}(?:unavailable|not found|not authorized)/i,
];
const API_RATE_LIMIT_PATTERNS = [
  /api rate limit exceeded for (?:user|installation)/i,
  /you have exceeded a secondary rate limit/i,
  /secondary rate limit.*github/i,
];
const ARTIFACT_QUOTA_PATTERNS = [
  /artifact storage (?:limit|quota).{0,80}(?:exceeded|reached|full)/i,
  /actions artifact storage limit has been reached/i,
];
const WORKFLOW_SYNTAX_PATTERNS = [
  /could not parse as yaml/i,
  /yaml: line \d+:/i,
  /syntax-check/i,
];
const WORKFLOW_SCHEMA_PATTERNS = [
  /workflow is not valid/i,
  /invalid workflow file/i,
  /unexpected value/i,
  /unrecognized function/i,
  /required property/i,
  /property .* is not allowed/i,
  /unexpected key|unknown key|unknown property/i,
];
const STATIC_ANALYSIS_PATTERNS = [
  /shellcheck reported issue in this script/i,
  /\bSC\d{4}\b.*(?:warning|error)/i,
  /hadolint.{0,80}(?:warning|error)/i,
  /eslint.{0,80}warning/i,
  /ruff.{0,80}warning/i,
];
const IMPLEMENTATION_PATTERNS = [
  /\bassertionerror\b/i,
  /\bassertion failed\b/i,
  /\bexpected .{1,100} (?:to equal|to be|but (?:got|received))\b/i,
  /\btests? failed\b/i,
  /\bcompilation failed\b/i,
  /\berror ts\d{3,5}\b/i,
  /\btype error\b/i,
];
const STEP_ERROR = /process completed with exit code [1-9]\d*|error: process completed with exit code|##\[error\]/i;

export function sanitizeText(value) {
  return String(value ?? "")
    .replace(/Authorization:\s*Bearer\s+\S+/gi, "Authorization: Bearer [REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9_./+=-]{12,}/g, "Bearer [REDACTED]")
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, "[REDACTED_TOKEN]")
    .replace(/\b(token|secret|password|api[_-]?key|private[_-]?key)\s*[:=]\s*[^,\s;]+/gi, "$1=[REDACTED]")
    .replace(/##\[(error|warning|notice|group|endgroup|debug|command|add-mask|set-output|save-state)\]/gi, "[GH_ACTION_COMMAND_ESCAPED:$1]")
    .replace(/::(error|warning|notice|group|endgroup|debug|add-mask|set-output|save-state)::/gi, "[GH_ACTION_COMMAND_ESCAPED]")
    .replace(/(https:\/\/[^\s?]+)\?[^\s]*/g, "$1?[REDACTED_QUERY]")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

function annotationText(annotation) {
  return [annotation?.path, annotation?.title, annotation?.message, annotation?.raw_details]
    .filter(Boolean).join(" ");
}

function textMatches(patterns, value) {
  const text = String(value ?? "");
  return patterns.some(pattern => pattern.test(text));
}

function evidenceLines(source, value, patterns, type) {
  return String(value ?? "").split(/\r?\n/)
    .filter(line => textMatches(patterns, line))
    .slice(0, 5)
    .map(line => ({ source, type, message: sanitizeText(line) }));
}

function unique(values) {
  return [...new Set(values)];
}

function canonicalizeLegacy(classification) {
  const map = {
    QUOTA_EXHAUSTED: "ACTIONS_BILLING_QUOTA_EXHAUSTED",
    PERMISSION_DENIED: "PERMISSION_OR_POLICY_DENIED",
    RUNNER_UNAVAILABLE: "RUNNER_UNAVAILABLE",
    STEP_FAILURE: "STEP_FAILURE",
    NOT_FAILED: "NOT_FAILED",
    LOG_PUBLICATION_PENDING: "LOG_PUBLICATION_PENDING",
    EXECUTION_EVIDENCE_MISSING: "EXECUTION_EVIDENCE_MISSING",
    UNKNOWN: "UNKNOWN",
  };
  return map[classification] || classification;
}

export function classifyJob({ job = {}, annotations = [], logs = { status: "NOT_REQUESTED", text: "" } } = {}) {
  const annotationValues = annotations.map(annotationText);
  const logText = logs.text || "";
  const annotationTextValue = annotationValues.join("\n");
  const allText = annotationTextValue + "\n" + logText;
  const evidence = [];
  const classifications = [];

  const workflowParserOutput =
    annotations.some(annotation => /^\.github\/workflows\/.+\.ya?ml$/i.test(annotation?.path || "")) ||
    /(?:\.github\/workflows\/|workflow:)[^\s:]+:\d+:\d+:/i.test(allText);
  if (workflowParserOutput && textMatches(WORKFLOW_SYNTAX_PATTERNS, allText)) {
    classifications.push("WORKFLOW_YAML_SYNTAX_ERROR");
    evidence.push(
      ...evidenceLines("annotation", annotationTextValue, WORKFLOW_SYNTAX_PATTERNS, "WORKFLOW_YAML_SYNTAX_ERROR"),
      ...evidenceLines("job_log", logText, WORKFLOW_SYNTAX_PATTERNS, "WORKFLOW_YAML_SYNTAX_ERROR"),
    );
  } else if (workflowParserOutput && textMatches(WORKFLOW_SCHEMA_PATTERNS, allText)) {
    classifications.push("WORKFLOW_SCHEMA_OR_EXPRESSION_ERROR");
    evidence.push(
      ...evidenceLines("annotation", annotationTextValue, WORKFLOW_SCHEMA_PATTERNS, "WORKFLOW_SCHEMA_OR_EXPRESSION_ERROR"),
      ...evidenceLines("job_log", logText, WORKFLOW_SCHEMA_PATTERNS, "WORKFLOW_SCHEMA_OR_EXPRESSION_ERROR"),
    );
  }

  if (textMatches(QUOTA_PATTERNS, allText)) {
    classifications.push("ACTIONS_BILLING_QUOTA_EXHAUSTED");
    evidence.push(
      ...evidenceLines("annotation", annotationTextValue, QUOTA_PATTERNS, "ACTIONS_BILLING_QUOTA_EXHAUSTED"),
      ...evidenceLines("job_log", logText, QUOTA_PATTERNS, "ACTIONS_BILLING_QUOTA_EXHAUSTED"),
    );
  }
  if (textMatches(STATIC_ANALYSIS_PATTERNS, allText)) {
    classifications.push("STATIC_ANALYSIS_WARNING");
    evidence.push(
      ...evidenceLines("annotation", annotationTextValue, STATIC_ANALYSIS_PATTERNS, "STATIC_ANALYSIS_WARNING"),
      ...evidenceLines("job_log", logText, STATIC_ANALYSIS_PATTERNS, "STATIC_ANALYSIS_WARNING"),
    );
  }
  if (textMatches(PERMISSION_PATTERNS, allText)) {
    classifications.push("PERMISSION_OR_POLICY_DENIED");
    evidence.push(
      ...evidenceLines("annotation", annotationTextValue, PERMISSION_PATTERNS, "PERMISSION_OR_POLICY_DENIED"),
      ...evidenceLines("job_log", logText, PERMISSION_PATTERNS, "PERMISSION_OR_POLICY_DENIED"),
    );
  }
  if (textMatches(ADMISSION_PATTERNS, allText)) {
    classifications.push("ACTIONS_ADMISSION_BLOCKED");
    evidence.push(
      ...evidenceLines("annotation", annotationTextValue, ADMISSION_PATTERNS, "ACTIONS_ADMISSION_BLOCKED"),
      ...evidenceLines("job_log", logText, ADMISSION_PATTERNS, "ACTIONS_ADMISSION_BLOCKED"),
    );
  }
  if (textMatches(ACTION_RUNTIME_PATTERNS, allText)) {
    classifications.push("ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED");
    evidence.push(
      ...evidenceLines("annotation", annotationTextValue, ACTION_RUNTIME_PATTERNS, "ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED"),
      ...evidenceLines("job_log", logText, ACTION_RUNTIME_PATTERNS, "ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED"),
    );
  }
  if (textMatches(RUNNER_PATTERNS, allText)) {
    classifications.push("RUNNER_UNAVAILABLE");
    evidence.push(
      ...evidenceLines("annotation", annotationTextValue, RUNNER_PATTERNS, "RUNNER_UNAVAILABLE"),
      ...evidenceLines("job_log", logText, RUNNER_PATTERNS, "RUNNER_UNAVAILABLE"),
    );
  }
  if (textMatches(API_RATE_LIMIT_PATTERNS, allText)) {
    classifications.push("API_RATE_LIMITED");
    evidence.push(
      ...evidenceLines("annotation", annotationTextValue, API_RATE_LIMIT_PATTERNS, "API_RATE_LIMITED"),
      ...evidenceLines("job_log", logText, API_RATE_LIMIT_PATTERNS, "API_RATE_LIMITED"),
    );
  }
  if (textMatches(ARTIFACT_QUOTA_PATTERNS, allText)) {
    classifications.push("ARTIFACT_STORAGE_QUOTA_EXHAUSTED");
    evidence.push(
      ...evidenceLines("annotation", annotationTextValue, ARTIFACT_QUOTA_PATTERNS, "ARTIFACT_STORAGE_QUOTA_EXHAUSTED"),
      ...evidenceLines("job_log", logText, ARTIFACT_QUOTA_PATTERNS, "ARTIFACT_STORAGE_QUOTA_EXHAUSTED"),
    );
  }

  const failedSteps = (Array.isArray(job.steps) ? job.steps : [])
    .filter(step => step?.conclusion === "failure");
  const implementationFailure = textMatches(IMPLEMENTATION_PATTERNS, allText);
  if (failedSteps.length > 0 || STEP_ERROR.test(logText)) {
    classifications.push(implementationFailure ? "STEP_IMPLEMENTATION_FAILURE" : "STEP_FAILURE");
    if (failedSteps.length > 0) {
      for (const step of failedSteps.slice(0, 5)) {
        evidence.push({
          source: "job_metadata",
          type: implementationFailure ? "STEP_IMPLEMENTATION_FAILURE" : "STEP_FAILURE",
          message: "Failed step: " + sanitizeText(step.name || "unnamed step"),
        });
      }
    }
    evidence.push(...evidenceLines("job_log", logText, [STEP_ERROR, ...IMPLEMENTATION_PATTERNS],
      implementationFailure ? "STEP_IMPLEMENTATION_FAILURE" : "STEP_FAILURE"));
  }

  const distinct = unique(classifications);
  let classification;
  if (distinct.length > 0) {
    classification = distinct[0];
  } else if (job.status === "queued" || job.status === "waiting" || job.status === "pending") {
    classification = "RUNNER_NOT_ASSIGNED_YET";
    evidence.push({
      source: "job_metadata",
      type: "LIFECYCLE",
      message: "The job is queued or waiting; runner assignment is not a quota signal.",
    });
  } else if (job.status === "in_progress" && job.runner_id !== null && job.runner_id !== undefined && job.runner_id !== 0) {
    classification = "RUNNER_ASSIGNED";
  } else if (job.status === "in_progress") {
    classification = "EXECUTION_IN_PROGRESS";
  } else if (logs.status === "LOG_PUBLICATION_PENDING") {
    classification = "LOG_PUBLICATION_PENDING";
    evidence.push({
      source: "job_logs_api",
      type: "EVIDENCE_GAP",
      message: "The failed job log is not available from the provider yet; the underlying cause remains unknown.",
    });
  } else if (job.conclusion === "success" || job.conclusion === "skipped") {
    classification = "NOT_FAILED";
  } else if (job.conclusion === null || job.conclusion === undefined || job.conclusion === "failure") {
    classification = "UNKNOWN";
    evidence.push({
      source: "job_metadata",
      type: "EVIDENCE_GAP",
      message: job.runner_id === 0
        ? "runner_id is explicitly 0 and no authoritative provider cause was found; this is not quota evidence."
        : "The job has no authoritative root-cause evidence in the retrieved annotations or logs.",
    });
  } else {
    classification = "UNKNOWN";
  }

  const legacy = {
    ACTIONS_BILLING_QUOTA_EXHAUSTED: "QUOTA_EXHAUSTED",
    PERMISSION_OR_POLICY_DENIED: "PERMISSION_DENIED",
    ACTIONS_ADMISSION_BLOCKED: "ACTIONS_ADMISSION_BLOCKED",
    ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED: "ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED",
    STATIC_ANALYSIS_WARNING: "STATIC_ANALYSIS_WARNING",
    RUNNER_UNAVAILABLE: "RUNNER_UNAVAILABLE",
    STEP_IMPLEMENTATION_FAILURE: "STEP_FAILURE",
    STEP_FAILURE: "STEP_FAILURE",
    NOT_FAILED: "NOT_FAILED",
    LOG_PUBLICATION_PENDING: "LOG_PUBLICATION_PENDING",
    UNKNOWN: "UNKNOWN",
    RUNNER_NOT_ASSIGNED_YET: "RUNNER_NOT_ASSIGNED_YET",
    RUNNER_ASSIGNED: "RUNNER_ASSIGNED",
    EXECUTION_IN_PROGRESS: "EXECUTION_IN_PROGRESS",
  };

  const legacyClassification = classification === "UNKNOWN" && job.conclusion === "failure"
    ? "EXECUTION_EVIDENCE_MISSING"
    : legacy[classification] || classification;
  return {
    classification: legacyClassification,
    primary_classification: classification,
    classifications: distinct.length ? distinct : [classification],
    evidence,
    evidence_gap: classification === "UNKNOWN" || classification === "LOG_PUBLICATION_PENDING",
  };
}

export function classifyRun({
  source = {},
  jobs = [],
  jobsStatus = "RETRIEVED",
  checkSuite = { status: "NOT_REQUESTED", check_runs: [] },
  workflowDiagnostic = "",
  workflowDiagnosticStatus = "NOT_PROVIDED",
} = {}) {
  const evidence = [];
  const classifications = [];
  const suiteRuns = Array.isArray(checkSuite.check_runs) ? checkSuite.check_runs : [];
  const suiteText = suiteRuns.map(item => [
    item.output?.title,
    item.output?.summary,
    item.output?.text,
    ...(item.annotations || []).map(annotationText),
  ].filter(Boolean).join("\n")).join("\n");
  const combined = String(workflowDiagnostic || "") + "\n" + suiteText;

  if (textMatches(WORKFLOW_SYNTAX_PATTERNS, workflowDiagnostic)) {
    classifications.push("WORKFLOW_YAML_SYNTAX_ERROR");
    evidence.push(...evidenceLines("actionlint", workflowDiagnostic, WORKFLOW_SYNTAX_PATTERNS, "WORKFLOW_YAML_SYNTAX_ERROR"));
  } else if (textMatches(WORKFLOW_SCHEMA_PATTERNS, workflowDiagnostic)) {
    classifications.push("WORKFLOW_SCHEMA_OR_EXPRESSION_ERROR");
    evidence.push(...evidenceLines("actionlint", workflowDiagnostic, WORKFLOW_SCHEMA_PATTERNS, "WORKFLOW_SCHEMA_OR_EXPRESSION_ERROR"));
  }
  if (textMatches(QUOTA_PATTERNS, suiteText)) {
    classifications.push("ACTIONS_BILLING_QUOTA_EXHAUSTED");
    evidence.push(...evidenceLines("check_suite", suiteText, QUOTA_PATTERNS, "ACTIONS_BILLING_QUOTA_EXHAUSTED"));
  }
  if (textMatches(ADMISSION_PATTERNS, suiteText)) {
    classifications.push("ACTIONS_ADMISSION_BLOCKED");
    evidence.push(...evidenceLines("check_suite", suiteText, ADMISSION_PATTERNS, "ACTIONS_ADMISSION_BLOCKED"));
  }
  if (textMatches(ACTION_RUNTIME_PATTERNS, suiteText)) {
    classifications.push("ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED");
    evidence.push(...evidenceLines("check_suite", suiteText, ACTION_RUNTIME_PATTERNS, "ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED"));
  }
  if (textMatches(STATIC_ANALYSIS_PATTERNS, suiteText)) {
    classifications.push("STATIC_ANALYSIS_WARNING");
    evidence.push(...evidenceLines("check_suite", suiteText, STATIC_ANALYSIS_PATTERNS, "STATIC_ANALYSIS_WARNING"));
  }
  if (textMatches(PERMISSION_PATTERNS, suiteText)) {
    classifications.push("PERMISSION_OR_POLICY_DENIED");
    evidence.push(...evidenceLines("check_suite", suiteText, PERMISSION_PATTERNS, "PERMISSION_OR_POLICY_DENIED"));
  }
  if (textMatches(ARTIFACT_QUOTA_PATTERNS, suiteText)) {
    classifications.push("ARTIFACT_STORAGE_QUOTA_EXHAUSTED");
    evidence.push(...evidenceLines("check_suite", suiteText, ARTIFACT_QUOTA_PATTERNS, "ARTIFACT_STORAGE_QUOTA_EXHAUSTED"));
  }
  if (textMatches(RUNNER_PATTERNS, suiteText)) {
    classifications.push("RUNNER_UNAVAILABLE");
    evidence.push(...evidenceLines("check_suite", suiteText, RUNNER_PATTERNS, "RUNNER_UNAVAILABLE"));
  }

  if (jobsStatus !== "RETRIEVED") {
    if (classifications.length === 0) {
      classifications.push("UNKNOWN");
      evidence.push({
        source: "jobs_api",
        type: "EVIDENCE_GAP",
        message: "The attempt-scoped jobs collection was not retrieved; an empty local array is not evidence of zero jobs.",
      });
    }
  } else if (jobs.length === 0 && classifications.length === 0) {
    if (source.status === "completed" && source.conclusion === "success") {
      classifications.push("NOT_FAILED");
    } else if (source.status && source.status !== "completed") {
      classifications.push("OBSERVATION_WINDOW_IN_PROGRESS");
      evidence.push({
        source: "run_metadata",
        type: "LIFECYCLE",
        message: "The source workflow run is not terminal and currently has no job records.",
      });
    } else {
      classifications.push("UNKNOWN");
      evidence.push({
        source: "run_metadata",
        type: "EVIDENCE_GAP",
        message: "The provider run is terminal with zero job records; no authoritative cause was present in the retrieved check-suite evidence.",
      });
    }
  }

  if (jobs.length > 0) {
    for (const job of jobs) {
      for (const item of job.classifications || [job.primary_classification || job.classification]) {
        if (item === "LOG_PUBLICATION_PENDING") {
          classifications.push(item, "UNKNOWN");
        } else if (item && item !== "NOT_FAILED") {
          classifications.push(item);
        }
      }
    }
    if (classifications.length === 0) classifications.push(source.status === "completed" && source.conclusion === "success" ? "NOT_FAILED" : "UNKNOWN");
  }

  const uniqueClasses = unique(classifications);
  const priority = [
    "WORKFLOW_YAML_SYNTAX_ERROR",
    "WORKFLOW_SCHEMA_OR_EXPRESSION_ERROR",
    "ACTIONS_BILLING_QUOTA_EXHAUSTED",
    "ACTIONS_ADMISSION_BLOCKED",
    "ACTION_RUNTIME_RETIRED_OR_UNSUPPORTED",
    "STATIC_ANALYSIS_WARNING",
    "ARTIFACT_STORAGE_QUOTA_EXHAUSTED",
    "PERMISSION_OR_POLICY_DENIED",
    "RUNNER_UNAVAILABLE",
    "STEP_IMPLEMENTATION_FAILURE",
    "STEP_FAILURE",
    "API_RATE_LIMITED",
    "RUNNER_ASSIGNED",
    "EXECUTION_IN_PROGRESS",
    "RUNNER_NOT_ASSIGNED_YET",
    "OBSERVATION_WINDOW_IN_PROGRESS",
    "UNKNOWN",
    "LOG_PUBLICATION_PENDING",
    "NOT_FAILED",
  ];
  const ordered = priority.filter(item => uniqueClasses.includes(item));
  return {
    classification: ordered[0] || "UNKNOWN",
    classifications: ordered.length ? ordered : ["UNKNOWN"],
    evidence,
    evidence_gap: ordered.includes("UNKNOWN") || ordered.includes("OBSERVATION_WINDOW_IN_PROGRESS") || ordered.includes("LOG_PUBLICATION_PENDING"),
    workflow_diagnostic_status: workflowDiagnosticStatus,
  };
}

export function fieldState(object, key) {
  if (!Object.prototype.hasOwnProperty.call(object ?? {}, key)) return { state: "MISSING" };
  if (object[key] === null) return { state: "NULL", value: null };
  return { state: "PRESENT", value: object[key] };
}
