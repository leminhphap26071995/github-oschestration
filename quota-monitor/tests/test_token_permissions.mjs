import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { auditToken, renderReport } from '../check_token_permissions.mjs';

const token = 'temporary-test-token-must-never-appear';
const repository = 'owner/repository';
const sha = 'a'.repeat(40);

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

test('reports read-only GITHUB_TOKEN API capabilities without exposing the token', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method, authorization: options.headers.Authorization });
    if (String(url).includes('/actions/runs?')) {
      return jsonResponse({ workflow_runs: [{ id: 123 }] }, 200, {
        'x-accepted-github-permissions': 'actions=read',
      });
    }
    if (String(url).includes('/actions/runs/123/jobs')) {
      return jsonResponse({ jobs: [] }, 200, { 'x-accepted-github-permissions': 'actions=read' });
    }
    if (String(url).includes('/check-runs?')) {
      return jsonResponse({ check_runs: [] }, 200, { 'x-accepted-github-permissions': 'checks=read' });
    }
    if (String(url).includes('/contents/quota-monitor/check_token_permissions.mjs')) {
      return jsonResponse({ name: 'check_token_permissions.mjs', type: 'file' }, 200, {
        'x-accepted-github-permissions': 'contents=read',
      });
    }
    throw new Error('Unexpected test URL');
  };

  const audit = await auditToken({ token, repository, sha, fetchImpl });
  const report = renderReport(audit);

  assert.equal(audit.ok, true);
  assert.equal(audit.records.length, 4);
  assert.ok(audit.records.every(record => record.result === 'ALLOWED'));
  assert.equal(calls.length, 4);
  assert.ok(calls.every(call => call.method === 'GET'));
  assert.ok(calls.every(call => call.authorization === 'Bearer ' + token));
  assert.ok(report.includes('actions: read'));
  assert.ok(report.includes('checks: read'));
  assert.ok(report.includes('contents: read'));
  assert.ok(report.includes('metadata: read (implicit)'));
  assert.ok(report.includes('X-OAuth-Scopes: not returned'));
  assert.ok(report.includes('X-Accepted-GitHub-Permissions describes endpoint requirements'));
  assert.ok(!report.includes(token));
});

test('reports missing read permission as denied and separates endpoint-required permission', async () => {
  const fetchImpl = async url => {
    if (String(url).includes('/actions/runs?')) return jsonResponse({ workflow_runs: [] });
    if (String(url).includes('/check-runs?')) {
      return jsonResponse({ message: 'Resource not accessible by integration' }, 403, {
        'x-accepted-github-permissions': 'checks=read',
      });
    }
    if (String(url).includes('/contents/')) return jsonResponse({ name: 'file' });
    throw new Error('Unexpected test URL');
  };

  const audit = await auditToken({ token, repository, sha, fetchImpl });
  const report = renderReport(audit);
  const checks = audit.records.find(record => record.name.startsWith('Checks:'));

  assert.equal(audit.ok, false);
  assert.equal(checks.result, 'DENIED');
  assert.equal(checks.acceptedPermissions, 'checks=read');
  assert.ok(report.includes('DENIED (HTTP 403; endpoint permission: checks:read)'));
});

test('skips the jobs probe when no workflow run is visible without failing the audit', async () => {
  const fetchImpl = async url => {
    if (String(url).includes('/actions/runs?')) return jsonResponse({ workflow_runs: [] });
    if (String(url).includes('/check-runs?')) return jsonResponse({ check_runs: [] });
    if (String(url).includes('/contents/')) return jsonResponse({ type: 'file' });
    throw new Error('Unexpected test URL');
  };

  const audit = await auditToken({ token, repository, sha, fetchImpl });
  const jobs = audit.records.find(record => record.name.includes('list jobs'));
  assert.equal(audit.ok, true);
  assert.equal(jobs.result, 'SKIPPED_NO_VISIBLE_RUN');
});

test('rejects missing credentials and malformed repository or SHA', async () => {
  await assert.rejects(
    () => auditToken({ token: '', repository, sha, fetchImpl: async () => jsonResponse({}) }),
    /MISSING_GITHUB_TOKEN/,
  );
  await assert.rejects(
    () => auditToken({ token, repository: 'not-a-repository', sha, fetchImpl: async () => jsonResponse({}) }),
    /INVALID_GITHUB_REPOSITORY/,
  );
  await assert.rejects(
    () => auditToken({ token, repository, sha: 'short', fetchImpl: async () => jsonResponse({}) }),
    /INVALID_GITHUB_SHA/,
  );
});

test('workflow requests only read permissions, uses the ephemeral token, and has no manual trigger', async () => {
  const workflowUrl = new URL('../../.github/workflows/quota-token-permission-audit.yml', import.meta.url);
  const workflow = await readFile(workflowUrl, 'utf8');
  assert.match(workflow, /permissions:\s*\n\s+actions:\s*read\s*\n\s+checks:\s*read\s*\n\s+contents:\s*read/m);
  assert.match(workflow, /GITHUB_TOKEN:\s*\$\{\{\s*github\.token\s*\}\}/);
  assert.match(workflow, /actions-run-diagnostics\.yml/);
  assert.match(workflow, /quota-monitor\/diagnostics\/\*\*/);
  assert.match(workflow, /test_diagnostics\.mjs/);
  assert.doesNotMatch(workflow, /workflow_dispatch/);
  assert.doesNotMatch(workflow, /secrets\.(?!GITHUB_TOKEN)/);
});
