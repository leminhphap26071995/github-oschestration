const QUOTA = /(?:actions?[^\n]{0,100}(?:included minutes?|billing|spending (?:limit|cap)|payment required|usage limit)|(?:included minutes?|spending (?:limit|cap)|billing (?:limit|exhausted)|payment required)[^\n]{0,100}actions?|out of hosted compute minutes)/i;
const PERMISSION = /resource not accessible by integration|permission denied|insufficient permissions|not authorized|access denied|http\s+403\b/i;
const RUNNER = /no hosted runner available|no runner available|runner (?:is )?unavailable|unable to find a runner|all hosted runners are busy|runner group.{0,40}(?:unavailable|not found)/i;
const STEP_ERROR = /process completed with exit code [1-9]\d*|##\[error\]|error: process completed with exit code/i;

export function sanitizeText(value) {
  return String(value ?? "")
    .replace(/Authorization:\s*Bearer\s+\S+/gi, "Authorization: Bearer [REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9_./+=-]{12,}/g, "Bearer [REDACTED]")
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, "[REDACTED_TOKEN]")
    .replace(/(https:\/\/[^\s?]+)\?[^\s]*/g, "$1?[REDACTED_QUERY]")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

function annotationText(annotation) {
  return [annotation.title, annotation.message, annotation.raw_details]
    .filter(Boolean).join(" ");
}

function evidenceLines(source, value, pattern, type) {
  return String(value ?? "").split(/\r?\n/).filter(line => pattern.test(line))
    .slice(0, 3).map(line => ({ source, type, message: sanitizeText(line) }));
}

export function classifyJob({ job, annotations = [], logs = { status: "NOT_REQUESTED", text: "" } }) {
  const annotationValues = annotations.map(annotationText);
  const logText = logs.text || "";
  const allText = [...annotationValues, logText].join("\n");
  let classification;

  if (QUOTA.test(allText)) classification = "QUOTA_EXHAUSTED";
  else if (PERMISSION.test(allText)) classification = "PERMISSION_DENIED";
  else if (RUNNER.test(allText)) classification = "RUNNER_UNAVAILABLE";
  else if ((job.steps || []).some(step => step.conclusion === "failure") || STEP_ERROR.test(logText)) {
    classification = "STEP_FAILURE";
  } else if (logs.status === "LOG_PUBLICATION_PENDING") {
    classification = "LOG_PUBLICATION_PENDING";
  } else if (job.conclusion === "success" || job.conclusion === "skipped") {
    classification = "NOT_FAILED";
  } else {
    classification = "EXECUTION_EVIDENCE_MISSING";
  }

  const evidence = [
    ...evidenceLines("annotation", annotationValues.join("\n"), QUOTA, "QUOTA"),
    ...evidenceLines("job_log", logText, QUOTA, "QUOTA"),
    ...evidenceLines("annotation", annotationValues.join("\n"), PERMISSION, "PERMISSION"),
    ...evidenceLines("job_log", logText, PERMISSION, "PERMISSION"),
    ...evidenceLines("annotation", annotationValues.join("\n"), RUNNER, "RUNNER"),
    ...evidenceLines("job_log", logText, RUNNER, "RUNNER"),
    ...evidenceLines("job_log", logText, STEP_ERROR, "STEP_FAILURE"),
  ].slice(0, 5);

  if (evidence.length === 0 && (job.steps || []).some(step => step.conclusion === "failure")) {
    evidence.push({
      source: "job_metadata",
      type: "STEP_FAILURE",
      message: "A workflow step has conclusion=failure.",
    });
  }

  return { classification, evidence };
}

export function fieldState(object, key) {
  if (!Object.prototype.hasOwnProperty.call(object ?? {}, key)) return { state: "MISSING" };
  if (object[key] === null) return { state: "NULL", value: null };
  return { state: "PRESENT", value: object[key] };
}
