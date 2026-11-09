import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAppJwt, prepare } from '../prepare_app_tokens.mjs';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

test('App JWT uses short-lived RS256 claims', () => {
  const jwt = createAppJwt('12345', privateKey, 1800000000);
  const [header, payload, signature] = jwt.split('.');
  assert.equal(JSON.parse(Buffer.from(header, 'base64url').toString()).alg, 'RS256');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  assert.equal(claims.iss, '12345');
  assert.equal(claims.iat, 1799999940);
  assert.equal(claims.exp, 1800000540);
  assert.ok(signature.length > 100);
});

test('one App mints org tokens and records missing installations without leaking tokens', async () => {
  const root = await mkdtemp(join(tmpdir(), 'actions-app-tokens-'));
  const targetsFile = join(root, 'targets.json');
  const outputTargetsFile = join(root, 'runtime-targets.json');
  const discoveryFile = join(root, 'report', 'organization-discovery.json');
  const githubEnv = join(root, 'github-env');
  await writeFile(targetsFile, JSON.stringify({ organizations: ['org-a', 'org-not-installed'] }));

  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET', body: options.body });
    if (String(url).includes('/app/installations?')) {
      return new Response(JSON.stringify([
        { id: 101, account: { login: 'org-a', type: 'Organization' } },
        { id: 202, account: { login: 'org-b', type: 'Organization' } },
        { id: 303, account: { login: 'personal-user', type: 'User' } },
      ]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const match = String(url).match(/\/app\/installations\/(\d+)\/access_tokens$/);
    if (match) {
      return new Response(JSON.stringify({ token: 'installation-token-' + match[1] }),
        { status: 201, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 404 });
  };

  try {
    const result = await prepare({
      targetsFile, outputTargetsFile, discoveryFile, githubEnv,
      appId: '12345', privateKey, userBillingToken: 'user-token-secret',
    });
    assert.equal(result.organization_count, 3);
    assert.equal(result.token_count, 2);
    assert.equal(result.installation_errors[0].error, 'APP_NOT_INSTALLED');
    const targets = JSON.parse(await readFile(outputTargetsFile, 'utf8'));
    assert.deepEqual(targets.organizations, ['org-a', 'org-not-installed', 'org-b']);
    const env = await readFile(githubEnv, 'utf8');
    assert.match(env, /USER_BILLING_TOKEN=user-token-secret/);
    assert.match(env, /"org-a":"installation-token-101"/);
    assert.match(env, /"org-b":"installation-token-202"/);
    assert.ok(calls.some(call => call.method === 'POST' && call.url.endsWith('/app/installations/101/access_tokens')));
    assert.ok(calls.every(call => !String(call.body || '').includes('user-token-secret')));
    const discoveryText = await readFile(discoveryFile, 'utf8');
    assert.ok(!discoveryText.includes('installation-token-101'));
    assert.ok(!discoveryText.includes('user-token-secret'));
  } finally {
    globalThis.fetch = originalFetch;
    await rm(root, { recursive: true, force: true });
  }
});
