import { createSign } from 'node:crypto';
import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const API = process.env.GITHUB_API_URL || 'https://api.github.com';
const VERSION = '2026-03-10';
const ORG_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const EXCLUDED_ORGS = new Set(['huyquanghan-apps']);

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

export function createAppJwt(appId, privateKey, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }));
  const unsigned = header + '.' + payload;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  return unsigned + '.' + signer.sign(privateKey).toString('base64url');
}

async function apiRequest(path, token, method = 'GET', body) {
  const response = await fetch(API + path, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': VERSION,
      'User-Agent': 'github-actions-usage-monitor',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const accepted = response.headers.get('x-accepted-oauth-scopes');
    const detail = 'HTTP_' + response.status +
      (accepted ? '_ACCEPTED_SCOPES_' + accepted.replaceAll(',', '+').replaceAll(' ', '') : '');
    throw new Error(detail);
  }
  return response.json();
}

async function listInstallations(jwt) {
  const installations = [];
  for (let page = 1; page <= 100; page += 1) {
    const batch = await apiRequest('/app/installations?per_page=100&page=' + page, jwt);
    if (!Array.isArray(batch)) throw new Error('INVALID_INSTALLATIONS_RESPONSE');
    installations.push(...batch);
    if (batch.length < 100) return installations;
  }
  throw new Error('INSTALLATION_PAGINATION_LIMIT');
}

export async function prepare({ targetsFile, outputTargetsFile, discoveryFile, githubEnv,
  appId, privateKey, userBillingToken }) {
  const config = JSON.parse(await readFile(targetsFile, 'utf8'));
  const configured = config?.organizations ?? [];
  const excludedValues = config?.excluded_organizations ?? [];
  if (!Array.isArray(configured) || configured.some(org => typeof org !== 'string' || !ORG_RE.test(org)) ||
      !Array.isArray(excludedValues) || excludedValues.some(org => typeof org !== 'string' || !ORG_RE.test(org))) {
    throw new Error('INVALID_ORGANIZATION_TARGETS');
  }
  const excluded = new Set([...EXCLUDED_ORGS, ...excludedValues.map(org => org.toLowerCase())]);
  const eligibleConfigured = [...new Set(configured.filter(org => !excluded.has(org.toLowerCase())))];

  let installations = [];
  let discoveryError = null;
  if (!appId || !privateKey) {
    discoveryError = 'GITHUB_APP_CREDENTIALS_NOT_CONFIGURED';
  } else {
    try {
      installations = await listInstallations(createAppJwt(appId, privateKey));
    } catch (error) {
      discoveryError = String(error.message || 'INSTALLATION_DISCOVERY_FAILED');
    }
  }

  const orgInstallations = installations.filter(item =>
    item?.account?.type === 'Organization' &&
    typeof item.account.login === 'string' && ORG_RE.test(item.account.login));
  const excludedInstallations = orgInstallations.filter(item => excluded.has(item.account.login.toLowerCase()));
  const eligibleInstallations = orgInstallations.filter(item => !excluded.has(item.account.login.toLowerCase()));
  const installationByOrg = new Map(eligibleInstallations.map(item => [item.account.login.toLowerCase(), item]));
  const orgs = [...eligibleConfigured];
  for (const item of eligibleInstallations) {
    if (!orgs.some(org => org.toLowerCase() === item.account.login.toLowerCase())) orgs.push(item.account.login);
  }

  const tokenMap = {};
  const installationErrors = [];
  const installationCoverage = [];
  if (appId && privateKey && !discoveryError) {
    const jwt = createAppJwt(appId, privateKey);
    for (const org of orgs) {
      const installation = installationByOrg.get(org.toLowerCase());
      if (!installation) {
        installationErrors.push({ organization: org, error: 'APP_NOT_INSTALLED' });
        continue;
      }
      const selection = installation.repository_selection || 'unknown';
      installationCoverage.push({
        organization: org,
        installation_id: installation.id,
        repository_selection: selection,
      });
      if (selection !== 'all') {
        installationErrors.push({ organization: org, error: 'APP_REPOSITORY_SELECTION_LIMITED' });
      }
      try {
        const token = await apiRequest(
          '/app/installations/' + installation.id + '/access_tokens', jwt, 'POST',
          { permissions: {
            administration: 'read',
            actions: 'read',
            checks: 'read',
            contents: 'read',
          } },
        );
        if (typeof token.token !== 'string' || !token.token) throw new Error('INSTALLATION_TOKEN_MISSING');
        process.stdout.write('::add-mask::' + token.token + String.fromCharCode(10));
        tokenMap[org] = token.token;
      } catch (error) {
        installationErrors.push({ organization: org, error: String(error.message || 'TOKEN_MINT_FAILED') });
      }
    }
  }

  await mkdir(dirname(outputTargetsFile), { recursive: true });
  await writeFile(outputTargetsFile, JSON.stringify({
    schema_version: 3,
    organizations: orgs,
    excluded_organizations: [...excluded].sort(),
  }, null, 2) + '\n');
  await mkdir(dirname(discoveryFile), { recursive: true });
  const discovery = {
    method: 'GitHub App GET /app/installations + POST /app/installations/{id}/access_tokens',
    permission_set: {
      administration: 'read',
      actions: 'read',
      checks: 'read',
      contents: 'read',
      metadata: 'read (implicit)',
    },
    status: discoveryError || installationErrors.length ? 'PARTIAL' : 'OK',
    error: discoveryError,
    configured_count: eligibleConfigured.length,
    discovered_installations: eligibleInstallations.length,
    excluded_installations: excludedInstallations.length,
    organization_count: orgs.length,
    token_count: Object.keys(tokenMap).length,
    installation_coverage: installationCoverage,
    installation_errors: installationErrors,
  };
  await writeFile(discoveryFile, JSON.stringify(discovery, null, 2) + '\n');

  if (githubEnv) {
    const envLines = [];
    if (userBillingToken) {
      process.stdout.write('::add-mask::' + userBillingToken + String.fromCharCode(10));
      envLines.push('USER_BILLING_TOKEN=' + userBillingToken);
    }
    envLines.push('ORG_BILLING_TOKENS_JSON=' + JSON.stringify(tokenMap));
    await appendFile(githubEnv, envLines.join('\n') + '\n');
  }

  return discovery;
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const args = process.argv.slice(2);
  const value = name => {
    const index = args.indexOf(name);
    if (index < 0 || !args[index + 1]) throw new Error('MISSING_ARGUMENT_' + name);
    return args[index + 1];
  };
  const discovery = await prepare({
    targetsFile: value('--targets-file'),
    outputTargetsFile: value('--output-targets-file'),
    discoveryFile: value('--discovery-file'),
    githubEnv: process.env.GITHUB_ENV,
    appId: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
    userBillingToken: process.env.USER_BILLING_TOKEN,
  });
  console.log('ORG_APP_TOKENS status=' + discovery.status +
    ' orgs=' + discovery.organization_count +
    ' tokens=' + discovery.token_count +
    ' installation_errors=' + discovery.installation_errors.length);
}
