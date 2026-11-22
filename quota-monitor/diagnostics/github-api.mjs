const API_VERSION = "2026-03-10";

export class GitHubApiError extends Error {
  constructor(status, retryAfter = null, code = "GITHUB_API_ERROR") {
    super(code);
    this.name = "GitHubApiError";
    this.status = status;
    this.retryAfter = retryAfter;
    this.code = code;
  }
}

function parseRetryAfter(value, now = Date.now()) {
  if (!value) return null;
  if (/^\d+(?:\.\d+)?$/.test(value.trim())) return Math.ceil(Number(value) * 1000);
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, at - now) : null;
}

function parseNextLink(header) {
  if (!header) return null;
  for (const part of header.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="([^"]+)"/);
    if (match && match[2] === "next") return match[1];
  }
  return null;
}

export function createGitHubApi({
  token,
  apiUrl = "https://api.github.com",
  fetchImpl = globalThis.fetch,
  sleepImpl = ms => new Promise(resolve => setTimeout(resolve, ms)),
  maxLogAttempts = 3,
  maxRetryAfterMs = 5000,
} = {}) {
  if (typeof token !== "string" || token.length === 0) throw new Error("MISSING_GITHUB_TOKEN");
  if (typeof fetchImpl !== "function") throw new Error("FETCH_UNAVAILABLE");

  const apiRoot = new URL(apiUrl);
  if (apiRoot.protocol !== "https:") throw new Error("INVALID_GITHUB_API_URL");
  const apiOrigin = apiRoot.origin;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + token,
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": "github-actions-run-diagnostics",
  };

  function assertApiUrl(value) {
    const url = new URL(value, apiRoot);
    if (url.origin !== apiOrigin) throw new Error("UNTRUSTED_GITHUB_API_URL");
    if (repositoryPath && !url.pathname.startsWith(`/repos/${repositoryPath}/`)) {
      throw new Error("UNTRUSTED_GITHUB_API_PATH");
    }
    return url;
  }

  async function getJson(value) {
    const url = assertApiUrl(value);
    const response = await fetchImpl(url, { method: "GET", headers });
    if (!response.ok) {
      throw new GitHubApiError(
        response.status,
        response.headers.get("retry-after"),
        "HTTP_" + response.status,
      );
    }
    let data;
    try {
      data = await response.json();
    } catch {
      throw new GitHubApiError(response.status, null, "INVALID_JSON_RESPONSE");
    }
    return { data, response };
  }

  async function paginate(value, collection = null) {
    let next = assertApiUrl(value).toString();
    const items = [];
    let pageCount = 0;
    while (next) {
      if (++pageCount > 1000) throw new Error("PAGINATION_LIMIT_EXCEEDED");
      const { data, response } = await getJson(next);
      const pageItems = collection === null ? data : data?.[collection];
      if (!Array.isArray(pageItems)) throw new Error("INVALID_PAGINATION_RESPONSE");
      items.push(...pageItems);
      const candidate = parseNextLink(response.headers.get("link"));
      if (!candidate) {
        next = null;
      } else {
        const candidateUrl = assertApiUrl(candidate);
        next = candidateUrl.toString();
      }
    }
    return { items, pageCount };
  }

  async function downloadJobLogs(jobId) {
    const endpoint = new URL(
      `/repos/${repositoryPath}/actions/jobs/${jobId}/logs`,
      apiRoot,
    );
    let lastStatus = null;
    let lastRetryAfter = null;
    let attempts = 0;

    for (let attempt = 1; attempt <= maxLogAttempts; attempt++) {
      attempts = attempt;
      try {
        const response = await fetchImpl(endpoint, {
          method: "GET",
          headers,
          redirect: "manual",
        });
        lastStatus = response.status;
        lastRetryAfter = response.headers.get("retry-after");

        let logResponse = response;
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get("location");
          if (!location) return {
            status: "REDIRECT_LOCATION_MISSING",
            attempts: attempt,
            http_status: response.status,
            retry_after: lastRetryAfter,
            text: "",
          };
          const signedUrl = new URL(location, endpoint);
          if (signedUrl.protocol !== "https:") return {
            status: "UNSAFE_LOG_REDIRECT",
            attempts: attempt,
            http_status: response.status,
            retry_after: lastRetryAfter,
            text: "",
          };
          // The short-lived signed URL is fetched without the GitHub bearer token.
          logResponse = await fetchImpl(signedUrl, {
            method: "GET",
            headers: { Accept: "text/plain" },
            redirect: "follow",
          });
          lastStatus = logResponse.status;
          lastRetryAfter = logResponse.headers.get("retry-after");
        }

        if (logResponse.ok) {
          return {
            status: "RETRIEVED",
            attempts: attempt,
            http_status: logResponse.status,
            retry_after: null,
            text: await logResponse.text(),
          };
        }
      } catch {
        return {
          status: "NETWORK_ERROR",
          attempts: attempt,
          http_status: lastStatus,
          retry_after: lastRetryAfter,
          text: "",
        };
      }

      const retryable = lastStatus === 404 || lastStatus === 429 ||
        [502, 503, 504].includes(lastStatus);
      if (!retryable || attempt === maxLogAttempts) break;

      const retryAfterMs = lastStatus === 429
        ? parseRetryAfter(lastRetryAfter)
        : null;
      const delay = retryAfterMs ?? Math.min(250 * (2 ** (attempt - 1)), 2000);
      if (delay > maxRetryAfterMs) break;
      await sleepImpl(delay);
    }

    return {
      status: lastStatus === 404
        ? "LOG_PUBLICATION_PENDING"
        : lastStatus === 429
          ? "API_RATE_LIMITED"
          : "API_ERROR",
      attempts,
      http_status: lastStatus,
      retry_after: lastRetryAfter,
      text: "",
    };
  }

  let repositoryPath = "";
  function setRepository(owner, repo) {
    if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
      throw new Error("INVALID_REPOSITORY");
    }
    repositoryPath = owner + "/" + repo;
  }

  return { getJson, paginate, downloadJobLogs, setRepository, apiOrigin };
}
