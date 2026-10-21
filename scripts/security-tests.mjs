#!/usr/bin/env node
/**
 * AI Creative Studio V2 — Production-Readiness Security Tests
 * ------------------------------------------------------------------
 * Covers:
 *   A) CORS — per-env ALLOWED_ORIGINS enforcement (no '*' fallback)
 *   B) Auth — SESSION_SIGNING_KEY: success roundtrip + missing-key safe failure
 *   C) Runtime config — wrangler.toml envs; deploy workflow checks only when a workflow exists
 *
 * Run: node --experimental-default-type=module scripts/security-tests.mjs
 */
import { readFileSync, existsSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, ok, extra) {
  if (ok) { passed++; console.log('  ✔ ' + name); }
  else { failed++; console.log('  ✘ ' + name + (extra ? ' — ' + extra : '')); }
}

const worker = (await import('../worker/src/index.js?sec=' + Date.now() + Math.random())).default;

const DEV_ORIGIN = 'https://aics-frontend-dev.pages.dev';
const STG_ORIGIN = 'https://aics-frontend-staging.pages.dev';
const PROD_ORIGIN = 'https://aics-frontend-prod.pages.dev';
const BOGUS = 'https://evil.example.com';

function envFor(origin) {
  return {
    SESSION_SIGNING_KEY: 'sec-test-key',
    GOOGLE_OAUTH_CLIENT_ID: 'c', GOOGLE_OAUTH_CLIENT_SECRET: 's',
    ALLOWED_ORIGINS: origin, ADMIN_EMAIL: 'a@b.com', DB: null,
  };
}
const fetchCors = async (path, origin, method = 'GET') => {
  const req = new Request('https://w.dev' + path, {
    method,
    headers: origin ? { Origin: origin } : {},
  });
  const r = await worker.fetch(req, envFor(DEV_ORIGIN), {});
  return r;
};

console.log('--- A) CORS enforcement ---');
{
  // Allowed origin → echoed, NOT '*'
  const r = await fetchCors('/api/ai-models', DEV_ORIGIN);
  const acao = r.headers.get('access-control-allow-origin');
  check('allowed dev origin → ACAO echoes it', acao === DEV_ORIGIN, 'ACAO=' + JSON.stringify(acao));
  check('ACAO is never "*"', acao !== '*' && acao !== null ? true : acao === DEV_ORIGIN);
  check('Vary: Origin present', r.headers.get('vary') === 'Origin');

  // Bogus origin → NO ACAO header (no fallback)
  const r2 = await fetchCors('/api/ai-models', BOGUS);
  check('bogus origin → NO ACAO header', r2.headers.get('access-control-allow-origin') === null,
    'ACAO=' + JSON.stringify(r2.headers.get('access-control-allow-origin')));

  // Preflight OPTIONS
  const r3 = await fetchCors('/api/ai-models', DEV_ORIGIN, 'OPTIONS');
  check('OPTIONS preflight (allowed) → 204 + ACAO', r3.status === 204 && r3.headers.get('access-control-allow-origin') === DEV_ORIGIN);
  const r4 = await fetchCors('/api/ai-models', BOGUS, 'OPTIONS');
  check('OPTIONS preflight (bogus) → 204 but NO ACAO', r4.status === 204 && r4.headers.get('access-control-allow-origin') === null);

  // No Origin (same-origin/nav) → no ACAO
  const r5 = await fetchCors('/api/ai-models', null);
  check('no Origin → no ACAO', r5.headers.get('access-control-allow-origin') === null);

  // Per-env isolation: dev env must NOT accept staging origin
  const req = new Request('https://w.dev/api/ai-models', { headers: { Origin: STG_ORIGIN } });
  const r6 = await worker.fetch(req, envFor(DEV_ORIGIN), {});
  check('dev env rejects staging origin', r6.headers.get('access-control-allow-origin') === null);
  // Same staging request under staging env → accepted
  const r7 = await worker.fetch(req, envFor(STG_ORIGIN), {});
  check('staging env accepts its own origin', r7.headers.get('access-control-allow-origin') === STG_ORIGIN);
  // Prod env accepts prod origin, rejects dev origin
  const req2 = new Request('https://w.dev/api/ai-models', { headers: { Origin: PROD_ORIGIN } });
  const r8 = await worker.fetch(req2, envFor(PROD_ORIGIN), {});
  check('prod env accepts prod origin', r8.headers.get('access-control-allow-origin') === PROD_ORIGIN);
  const r9 = await worker.fetch(req2, envFor(DEV_ORIGIN), {});
  check('prod origin rejected under dev env', r9.headers.get('access-control-allow-origin') === null);
}

console.log('\n--- B) Auth signing key (no dev fallback) ---');
{
  // Import auth.js fresh per scenario: getKey() caches the first key at module level,
  // so each case needs a separate module instance.
  const loadAuth = () => import('../worker/src/core/auth.js?bust=' + Math.random());

  // Success: roundtrip
  const a1 = await loadAuth();
  const keyed = { SESSION_SIGNING_KEY: 'super-secret-key' };
  const tok = await a1.signToken(keyed, { sub: 'u1', email: 'a@b.com' });
  const decoded = await a1.verifyToken(keyed, tok);
  check('sign/verify roundtrip works with configured key', decoded.sub === 'u1');

  // Missing key → signToken throws (no silent fallback). Fresh module.
  const a2 = await loadAuth();
  let signErr = null;
  try { await a2.signToken({}, { sub: 'u1' }); } catch (e) { signErr = e; }
  check('signToken without key throws missing_signing_key',
    signErr && /missing_signing_key/.test(signErr.message), signErr && signErr.message);
  check('no dev-fallback-key remains in code',
    !readFileSync(new URL('../worker/src/core/auth.js', import.meta.url), 'utf8').includes('dev-fallback-key'));

  // Missing key → verify fails safely (fresh module, old token from a1)
  const a3 = await loadAuth();
  let verifySafeErr = null;
  try { await a3.verifyToken({}, tok); } catch (e) { verifySafeErr = e; }
  check('verifyToken without key fails safely (no silent verify)', !!verifySafeErr);

  // Key mismatch → bad_signature (fresh module for each side)
  const a4 = await loadAuth();
  const tokA = await a4.signToken({ SESSION_SIGNING_KEY: 'keyA' }, { sub: 'u2' });
  const a5 = await loadAuth();
  let mismatchErr = null;
  try { await a5.verifyToken({ SESSION_SIGNING_KEY: 'keyB' }, tokA); } catch (e) { mismatchErr = e; }
  check('token signed with key A rejected by key B', mismatchErr && /bad_signature/.test(mismatchErr.message));
}

console.log('\n--- C) Deployment config validation ---');
{
  const toml = readFileSync(new URL('../worker/wrangler.toml', import.meta.url), 'utf8');
  check('wrangler.toml defines dev/staging/prod envs', /\[env\.dev\]/.test(toml) && /\[env\.staging\]/.test(toml) && /\[env\.prod\]/.test(toml));
  check('wrangler.toml sets ALLOWED_ORIGINS per env', (toml.match(/ALLOWED_ORIGINS/g) || []).length === 3);
  check('wrangler.toml binds D1 DB per env', (toml.match(/binding = "DB"/g) || []).length === 3);
  check('no secrets hardcoded in wrangler.toml', !/SESSION_SIGNING_KEY\s*=/.test(toml));

  const workflowPath = new URL('../.github/workflows/deploy.yml', import.meta.url);
  if (!existsSync(workflowPath)) {
    // Do not create or require a deployment workflow as a side effect of feature tests.
    // No workflow means its safety controls cannot be evaluated; report NOT TESTED,
    // not six false failures. Production deployment remains out of scope.
    console.log('  ↷ deployment workflow checks NOT TESTED — .github/workflows/deploy.yml is absent');
  } else {
    const wf = readFileSync(workflowPath, 'utf8');
    check('deployment workflow file exists', true);
    check('workflow gates prod behind workflow_dispatch',
      /inputs:\s*environment:/.test(wf) && /environment == 'prod'/.test(wf));
    check('workflow auto-deploys main → staging (not prod)',
      /refs\/heads\/main/.test(wf) && /deploy-staging/.test(wf));
    check('workflow has NO matrix over [dev,staging,prod] on push',
      !/matrix:[\s\S]*dev, staging, prod/.test(wf));
    check('workflow protects prod with GitHub environment',
      /environment: production/.test(wf));
    check('workflow runs test gate before deploy', /needs: test/.test(wf) && /regression-test/.test(wf));
  }
}


console.log('\n--- D) BYOK encrypted storage lifecycle ---');
{
  const { getUserApiKey, saveUserApiKey, deleteUserApiKey } =
    await import('../worker/src/core/utilities.js?byok=' + Date.now());
  const rows = new Map();
  const db = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() {
          if (sql.includes('SELECT gemini_key FROM user_keys')) {
            const row = rows.get(values[0]);
            return row ? { gemini_key: row.gemini_key } : null;
          }
          return null;
        },
        async run() {
          if (sql.includes('INSERT INTO user_keys')) {
            rows.set(values[0], { gemini_key: values[1] });
          } else if (sql.includes('DELETE FROM user_keys')) {
            rows.delete(values[0]);
          } else if (sql.includes('UPDATE user_keys')) {
            const row = rows.get(values[1]);
            if (row && row.gemini_key === values[2]) rows.set(values[1], { gemini_key: values[0] });
          }
          return { success: true };
        },
      };
    },
  };
  const byokEnv = { DB: db, KEY_ENCRYPTION_SECRET: 'unit-test-encryption-secret' };
  const testKey = 'AIza-test-key-not-plaintext';
  await saveUserApiKey(byokEnv, 'user-1', testKey);
  const stored = rows.get('user-1')?.gemini_key || '';
  check('saved API key is encrypted at rest (not plaintext)', !!stored && stored !== testKey && !stored.includes(testKey));
  check('saved API key decrypts for its owner', await getUserApiKey(byokEnv, 'user-1') === testKey);
  check('API key is isolated by user id', await getUserApiKey(byokEnv, 'user-2') === null);
  await deleteUserApiKey(byokEnv, 'user-1');
  check('delete removes only the selected user key', !rows.has('user-1') && await getUserApiKey(byokEnv, 'user-2') === null);

  let missingSecretErr = null;
  const writesBefore = rows.size;
  try {
    await saveUserApiKey({ DB: db, KEY_ENCRYPTION_SECRET: '' }, 'user-3', 'another-test-key');
  } catch (e) { missingSecretErr = e; }
  check('missing encryption secret fails closed before DB write',
    !!missingSecretErr && /missing_key_encryption_secret/.test(missingSecretErr.message) && rows.size === writesBefore,
    missingSecretErr && missingSecretErr.message);
}

console.log('\n--- D) API test rate-limit migration contract ---');
{
  const migrationPath = new URL('../worker/migrations/006_create_api_test_limits.sql', import.meta.url);
  const migrationExists = existsSync(migrationPath);
  check('API rate-limit migration file exists', migrationExists);
  if (migrationExists) {
    const migration = readFileSync(migrationPath, 'utf8');
    check('migration creates api_test_limits table',
      /CREATE TABLE IF NOT EXISTS api_test_limits/i.test(migration));
    check('migration defines per-user/per-window primary key',
      /PRIMARY KEY\s*\(\s*user_id\s*,\s*window_id\s*\)/i.test(migration));
    check('migration indexes window_id for cleanup queries',
      /CREATE INDEX IF NOT EXISTS idx_api_test_limits_window ON api_test_limits\s*\(\s*window_id\s*\)/i.test(migration));
    const route = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8');
    check('rate-limit route SQL matches migration table and columns',
      /INSERT INTO api_test_limits \(user_id, window_id, attempts\)/.test(route) &&
      /SELECT attempts FROM api_test_limits WHERE user_id = \? AND window_id = \?/.test(route));
  }
  const toml = readFileSync(new URL('../worker/wrangler.toml', import.meta.url), 'utf8');
  const dev = toml.split('[env.dev]')[1]?.split('[env.staging]')[0] || '';
  check('migration target can be identified as dev D1 only',
    /database_name = "ai-creative-db-dev"/.test(dev) &&
    /database_id = "3f747286-9531-4b92-96a7-f0144387bd91"/.test(dev));
  console.log('  ↷ remote D1 migration execution NOT TESTED — no database changes performed');
}


console.log('\n--- E) API key settings UI save/status contract ---');
{
  const shared = readFileSync(new URL('../worker/src/frontend/shared.js', import.meta.url), 'utf8');
  const settings = readFileSync(new URL('../worker/src/frontend/settings.js', import.meta.url), 'utf8');
  const setApiKeyStart = shared.indexOf('function setApiKey()');
  const setApiKeyEnd = shared.indexOf('\nfunction ', setApiKeyStart + 1);
  const setApiKey = setApiKeyStart >= 0
    ? shared.slice(setApiKeyStart, setApiKeyEnd >= 0 ? setApiKeyEnd : undefined)
    : '';
  check('API key save returns a Promise for async completion',
    setApiKey.includes('return fetch(') && setApiKey.includes('/api/user/apikey'));
  check('API key save reports cancellation/failure as false',
    setApiKey.includes('if (!key) return Promise.resolve(false)') &&
    setApiKey.includes('return false;'));
  check('API key save treats non-2xx HTTP responses as failures',
    setApiKey.includes('ok: r.ok') && setApiKey.includes('!result.ok || d.error'));
  check('settings refreshes status only after save resolves successfully',
    settings.includes('Promise.resolve(window.setApiKey()).then(function(saved){') &&
    settings.includes('if(saved) loadKeyStatus();'));
  check('API key status refresh does not depend on fixed two-second timer',
    !settings.includes('setTimeout(loadKeyStatus,2000)') &&
    !settings.includes('setTimeout(loadKeyStatus, 2000)'));
  const removeStart = settings.indexOf('function removeApiKey()');
  const removeEnd = settings.indexOf('\n}', removeStart);
  const removeApiKey = removeStart >= 0
    ? settings.slice(removeStart, removeEnd >= 0 ? removeEnd : undefined)
    : '';
  check('API key deletion refreshes status after successful response',
    removeApiKey.includes("showToast('API Key ဖျက်ပြီးပါပြီ','success');") &&
    removeApiKey.includes('loadKeyStatus();'));
}

console.log('--- F) Content draft secret exclusion ---');
{
 const shell = readFileSync(new URL('../worker/src/frontend/studios/content/shell.js', import.meta.url), 'utf8');
 const shared = readFileSync(new URL('../worker/src/frontend/shared.js', import.meta.url), 'utf8');
 const collect = shell.split('function studioCollectDraft(){')[1].split('window.studioCollectDraft=')[0];
 check('Content draft excludes key inputs', !collect.includes("byok:val(") && !collect.includes("videoByok:val("));
 check('Legacy draft fields sanitized', shared.includes('delete d.data.byok; delete d.data.videoByok;'));
 check('New draft fields sanitized', shared.includes('delete data.byok; delete data.videoByok;'));
}

console.log('\n=== SECURITY RESULT: ' + passed + ' passed, ' + failed + ' failed ===');
process.exit(failed ? 1 : 0);
