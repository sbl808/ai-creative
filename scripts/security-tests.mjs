#!/usr/bin/env node
/**
 * AI Creative Studio V2 — Production-Readiness Security Tests
 * ------------------------------------------------------------------
 * Covers:
 *   A) CORS — per-env ALLOWED_ORIGINS enforcement (no '*' fallback)
 *   B) Auth — SESSION_SIGNING_KEY: success roundtrip + missing-key safe failure
 *   C) Deployment config — wrangler.toml envs + controlled deploy.yml flow
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

  const wf = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
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

console.log('\n=== SECURITY RESULT: ' + passed + ' passed, ' + failed + ' failed ===');
process.exit(failed ? 1 : 0);
