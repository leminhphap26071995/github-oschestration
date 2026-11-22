#!/usr/bin/env node
import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const API_VERSION = '2026-03-10';
const DEFAULT_API = 'https://api.github.com';

function validateRepository(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    throw new Error('INVALID_GITHUB_REPOSITORY');
  }
  return value;
}

function classifyStatus(status) {
  if (status >= 200 && status < 300) return 'ALLOWED';
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 403) return 'DENIED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  return 'API_ERROR';
}

async function parseJson(response) {
  try { return await response.json(); } catch { return null; }
}

export async function auditToken({ token, repository, sha, apiUrl = DEFAULT_API, fetchImpl = globalThis.fetch }) {
  if (typeof token !== 'string' || token.length === 0) throw new Error('MISSING_GITHUB_TOKEN');
  const repo = validateRepository(repository);
  if (typeof sha !== 'string' || !/^[a-f0-9]{40}$/i.test(sha)) throw new Error('INVALID_GITHUB_SHA');
  if (typeof fetchImpl !== 'function') throw new Error('FETCH_UNAVAILABLE');

  const root = apiUrl.replace(/\/+$/, '');
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: 'Bearer ' + token,
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'github-actions-token-permission-audit',
  };
  const records = [];

  async function probe(name, path, requiredPermission) {
    try {
      const response = await fetchImpl(root + path, { method: 'GET', headers });
      const body = await parseJson(response);
      const record = {
        name, method: 'GET', status: response.status,
        result: classifyStatus(response.status), requiredPermission,
        acceptedPermissions: response.headers.get('x-accepted-github-permissions'),
        oauthScopes: response.headers.get('x-oauth-scopes'),
      };
      records.push(record);
      return { record, body };
    } catch {
      const record = {
        name, method: 'GET', status: null, result: 'NETWORK_ERROR',
        requiredPermission, acceptedPermissions: null, oauthScopes: null,
      };
      records.push(record);
      return { record, body: null };
    }
  }

  const actionsRuns = await probe(
    'Actions: list workflow runs',
    '/repos/' + repo + '/actions/runs?per_page=1',
    'actions:read',
  );

  if (actionsRuns.record.result === 'ALLOWED' &&
      Array.isArray(actionsRuns.body?.workflow_runs) &&
      actionsRuns.body.workflow_runs.length > 0) {
    const runId = actionsRuns.body.workflow_runs[0]?.id;
    if (Number.isSafeInteger(runId) && runId > 0) {
      await probe(
        'Actions: list jobs for latest visible run',
        '/repos/' + repo + '/actions/runs/' + runId + '/jobs?per_page=1',
        'actions:read',
      );
    } else {
      records.push({
        name: 'Actions: list jobs for latest visible run', method: 'GET',
        status: null, result: 'SKIPPED_INVALID_RUN_ID', requiredPermission: 'actions:read',
        acceptedPermissions: null, oauthScopes: null,
      });
    }
  } else {
    records.push({
      name: 'Actions: list jobs for latest visible run', method: 'GET',
      status: null, result: 'SKIPPED_NO_VISIBLE_RUN', requiredPermission: 'actions:read',
      acceptedPermissions: null, oauthScopes: null,
    });
  }

  await probe(
    'Checks: list check runs for this commit',
    '/repos/' + repo + '/commits/' + sha + '/check-runs?per_page=1',
    'checks:read',
  );
  await probe(
    'Contents: read the audit script at this commit',
    '/repos/' + repo + '/contents/quota-monitor/check_token_permissions.mjs?ref=' + sha,
    'contents:read',
  );

  const requiredFailures = records.filter(record =>
    record.result !== 'ALLOWED' && !record.result.startsWith('SKIPPED_')
  );
  const anyOAuthScopes = records.some(record => record.oauthScopes !== null);

  return {
    ok: requiredFailures.length === 0,
    repository: repo,
    sha,
    records,
    oauthScopesHeader: anyOAuthScopes
      ? [...new Set(records.map(record => record.oauthScopes).filter(Boolean))].join('; ')
      : null,
    requiredFailures,
  };
}

export function renderReport(audit) {
  const lines = [
    '=== GitHub Actions GITHUB_TOKEN permission audit ===',
    'Credential: built-in GitHub Actions GITHUB_TOKEN',
    'Credential type: GitHub App installation access token',
    'Resource scope: repository containing this workflow (' + audit.repository + ')',
    'Lifetime: job-scoped; expires when the job finishes or its effective maximum lifetime is reached',
    'Token value: REDACTED (never printed)',
    '',
    'Declared job permissions:',
    '  actions: read',
    '  checks: read',
    '  contents: read',
    '  metadata: read (implicit)',
    '  all other permission keys: none',
    '',
    'Read-only API probes:',
  ];

  for (const record of audit.records) {
    const status = record.status === null ? 'no HTTP response' : 'HTTP ' + record.status;
    lines.push('  - ' + record.name + ': ' + record.result + ' (' + status +
      '; endpoint permission: ' + record.requiredPermission + ')');
    lines.push('      X-Accepted-GitHub-Permissions: ' +
      (record.acceptedPermissions || 'not returned'));
  }

  lines.push('');
  lines.push('X-OAuth-Scopes: ' + (audit.oauthScopesHeader ||
    'not returned; expected for the GITHUB_TOKEN App installation token'));
  lines.push('Header semantics: X-Accepted-GitHub-Permissions describes endpoint requirements, not granted permissions.');
  lines.push('Public-repository API success proves endpoint availability; it is not a complete token-permission inventory.');
  lines.push('Overall read-probe result: ' + (audit.ok ? 'PASS' : 'FAIL'));
  return lines.join('\n') + '\n';
}

async function main() {
  const audit = await auditToken({
    token: process.env.GITHUB_TOKEN,
    repository: process.env.GITHUB_REPOSITORY,
    sha: process.env.GITHUB_SHA,
    apiUrl: process.env.GITHUB_API_URL || DEFAULT_API,
  });
  const report = renderReport(audit);
  process.stdout.write(report);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, report, 'utf8');
  }
  if (!audit.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    process.stderr.write('TOKEN_PERMISSION_AUDIT_FAILED: ' + error.message + '\n');
    process.exitCode = 1;
  });
}
