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
import vm from 'node:vm';
import { handleAuthRoutes, safeOAuthRedirect, createOAuthStateCookieValue, verifyOAuthStateCookieValue } from '../worker/src/routes/auth.routes.js';

// Node-only HTMLRewriter shim for this source-level test suite.
// Production requests use Cloudflare Worker's native HTMLRewriter implementation.
if (typeof globalThis.HTMLRewriter === 'undefined') {
  globalThis.HTMLRewriter = class TestHTMLRewriter {
    constructor() { this.rules = []; }
    on(selector, handler) {
      this.rules.push({ selector, handler });
      return this;
    }
    transform(response) {
      const rules = this.rules;
      const body = new ReadableStream({
        async start(controller) {
          try {
            let html = await response.text();
            for (const rule of rules) {
              const tag = rule.selector;
              const pattern = new RegExp('<' + tag + '\\b([^>]*)>', 'gi');
              html = html.replace(pattern, (match, attributes) => {
                const element = {
                  attributes,
                  setAttribute(name, value) {
                    if (!this.attributes.includes(name + '=')) {
                      this.attributes += ' ' + name + '="' + value + '"';
                    }
                  },
                };
                rule.handler.element(element);
                return '<' + tag + element.attributes + '>';
              });
            }
            controller.enqueue(new TextEncoder().encode(html));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
  };
}

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

  // JSON responses must not be cached, including Story Video Plan user-data routes.
  const noStoreCases = [
    { path: '/api/ai-models', method: 'GET', label: 'general JSON API' },
    { path: '/api/studio/story/video', method: 'POST', label: 'Story Video Plan generation API' },
    { path: '/api/studio/story/video-image', method: 'POST', label: 'Story Video Plan image API' },
  ];
  for (const testCase of noStoreCases) {
    const response = await worker.fetch(new Request('https://w.dev' + testCase.path, {
      method: testCase.method,
    }), envFor(DEV_ORIGIN), {});
    check(testCase.label + ' returns Cache-Control: no-store',
      response.headers.get('cache-control') === 'no-store',
      'Cache-Control=' + JSON.stringify(response.headers.get('cache-control')));
  }

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

console.log('\\n--- B) Shared error message XSS regression ---');
{
  const sharedUi = readFileSync(new URL('../worker/src/frontend/shared-ui.js', import.meta.url), 'utf8');
  const scriptMarker = 'export const AICS_ERROR_SCRIPT = \`';
  const scriptStart = sharedUi.indexOf(scriptMarker);
  const scriptEnd = scriptStart >= 0 ? sharedUi.indexOf('\n`;', scriptStart) : -1;
  const errorScript = scriptStart >= 0 && scriptEnd > scriptStart
    ? sharedUi.slice(scriptStart + scriptMarker.length, scriptEnd)
    : '';
  check('shared error dialog script is present', !!errorScript);

  if (errorScript) {
    const errorElement = {
      style: {},
      children: [],
      textContent: '',
      appendChild(node) { this.children.push(node); },
    };
    const document = {
      getElementById(id) { return id === 'errorMsg' ? errorElement : null; },
      createElement(tagName) { return { tagName, style: {}, textContent: '' }; },
      createTextNode(text) { return { nodeType: 3, textContent: String(text) }; },
    };
    const hostilePrefix = '<svg onload=alert(1)>';
    const hostileMessage = '<img src=x onerror=alert(1)>';
    vm.runInNewContext(errorScript + '\naicsShowError(prefix, error);', {
      document, String, prefix: hostilePrefix, error: { message: hostileMessage },
    });

    check('error prefix and message remain literal text nodes',
      errorElement.children.length === 3 &&
      errorElement.children[0].tagName === 'span' &&
      errorElement.children[0].textContent === hostilePrefix &&
      errorElement.children[1].nodeType === 3 &&
      errorElement.children[1].textContent === ' ' &&
      errorElement.children[2].nodeType === 3 &&
      errorElement.children[2].textContent === hostileMessage);
    check('error rendering does not assign attacker-controlled innerHTML',
      !errorScript.includes('el.innerHTML'));
  }
}

console.log('\\n--- B) Worker log data minimization contract ---');
{
  const index = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8');
  const friendlyStart = index.indexOf('function friendlyError()');
  const friendlyEnd = friendlyStart >= 0 ? index.indexOf('\n}', friendlyStart) : -1;
  const friendlyBlock = friendlyStart >= 0 && friendlyEnd > friendlyStart
    ? index.slice(friendlyStart, friendlyEnd + 2)
    : '';
  const studioLogStart = index.indexOf("console.error('[AICS] studio page load failed");
  const studioLogEnd = studioLogStart >= 0 ? index.indexOf('} catch (_) {}', studioLogStart) : -1;
  const studioLogBlock = studioLogStart >= 0 && studioLogEnd > studioLogStart
    ? index.slice(studioLogStart, studioLogEnd)
    : '';
  check('generic error logging excludes exception details',
    !!friendlyBlock && !friendlyBlock.includes('.stack') && !friendlyBlock.includes('.message') && !friendlyBlock.includes('JSON.stringify') && !friendlyBlock.includes('String(e)'));
  check('studio load error logging excludes slug and exception details',
    !!studioLogBlock && !studioLogBlock.includes('slug:') && !studioLogBlock.includes('message:') && !studioLogBlock.includes('.stack') && !studioLogBlock.includes('.message') && !studioLogBlock.includes('JSON.stringify') && !studioLogBlock.includes('String(e)'));
}

console.log('\n--- B) HTML Content Security Policy rollout ---');
{
  const page = await worker.fetch(
    new Request('https://w.dev/'),
    envFor(DEV_ORIGIN),
    {}
  );
  const policy = page.headers.get('content-security-policy-report-only') || '';
  check('HTML pages receive CSP in report-only mode', !!policy && !page.headers.has('content-security-policy'));
  check('CSP policy restricts script sources to the same origin', policy.includes("script-src 'self'"));
  check('CSP disallows inline script attributes in target policy', policy.includes("script-src-attr 'none'"));
  check('CSP disables object embeds and framing', policy.includes("object-src 'none'") && policy.includes("frame-ancestors 'none'"));
  check('CSP does not allow unsafe-inline scripts', !policy.includes("'unsafe-inline'"));
  const nonceMatch = policy.match(/script-src 'self' 'nonce-([A-Za-z0-9+/]{22}==)'/);
  check('HTML CSP includes a valid per-response nonce', !!nonceMatch);
  check('CSP nonce is shared by script elements and styles',
    !!nonceMatch &&
    policy.includes(`script-src-elem 'self' 'nonce-${nonceMatch[1]}'`) &&
    policy.includes(`style-src 'self' 'nonce-${nonceMatch[1]}'`));
  const page2 = await worker.fetch(new Request('https://w.dev/'), envFor(DEV_ORIGIN), {});
  const policy2 = page2.headers.get('content-security-policy-report-only') || '';
  const nonceMatch2 = policy2.match(/script-src 'self' 'nonce-([A-Za-z0-9+/]{22}==)'/);
  check('separate HTML responses receive different CSP nonces',
    !!nonceMatch && !!nonceMatch2 && nonceMatch[1] !== nonceMatch2[1]);
  const html = await page.clone().text();
  const inlineElements = [...html.matchAll(/<(script|style)\b([^>]*)>/gi)];
  check('HTML contains inline script/style elements for nonce validation', inlineElements.length >= 2);
  check('every script/style element receives the CSP response nonce',
    !!nonceMatch && inlineElements.length >= 2 &&
    inlineElements.every((match) => match[2].includes('nonce="' + nonceMatch[1] + '"')));
  const api = await worker.fetch(
    new Request('https://w.dev/api/ai-models'),
    envFor(DEV_ORIGIN),
    {}
  );
  check('JSON API response does not receive HTML CSP header', !api.headers.has('content-security-policy-report-only'));
}

console.log('\n--- C) OAuth redirect and state security ---');
{
  const workerOrigin = 'https://worker.example.com';
  const oauthEnv = {
    SESSION_SIGNING_KEY: 'oauth-test-secret',
    ALLOWED_ORIGINS: DEV_ORIGIN + ',https://aics-frontend-staging.pages.dev',
  };
  check('relative OAuth next path resolves to same-origin /app',
    safeOAuthRedirect('/app', workerOrigin, oauthEnv) === workerOrigin + '/app');
  check('same-origin absolute OAuth redirect is allowed',
    safeOAuthRedirect(workerOrigin + '/app', workerOrigin, oauthEnv) === workerOrigin + '/app');
  check('cross-origin frontend redirect falls back to cookie-owning Worker origin',
    safeOAuthRedirect(DEV_ORIGIN + '/app', workerOrigin, oauthEnv) === workerOrigin + '/app');
  check('lookalike frontend hostname is rejected',
    safeOAuthRedirect(DEV_ORIGIN + '.attacker.example/app', workerOrigin, oauthEnv) === workerOrigin + '/app');
  check('unlisted external redirect origin is rejected',
    safeOAuthRedirect('https://evil.example.com/steal', workerOrigin, oauthEnv) === workerOrigin + '/app');
  check('javascript redirect scheme is rejected',
    safeOAuthRedirect('javascript:alert(1)', workerOrigin, oauthEnv) === workerOrigin + '/app');
  check('credential-bearing redirect URL is rejected',
    safeOAuthRedirect('https://user:pass@' + DEV_ORIGIN.slice('https://'.length) + '/app', workerOrigin, oauthEnv) === workerOrigin + '/app');

  const now = Date.now();
  const cookie = await createOAuthStateCookieValue(oauthEnv, 'test-state-nonce', DEV_ORIGIN + '/app', now);
  const verified = await verifyOAuthStateCookieValue(oauthEnv, cookie, now);
  check('signed OAuth state cookie validates and preserves redirect target',
    !!verified && verified.state === 'test-state-nonce' && verified.redirectTo === DEV_ORIGIN + '/app');
  check('tampered OAuth state cookie is rejected',
    await verifyOAuthStateCookieValue(oauthEnv, cookie + 'x', now) === null);
  check('expired OAuth state cookie is rejected',
    await verifyOAuthStateCookieValue(oauthEnv, cookie, now + 11 * 60 * 1000) === null);
  check('OAuth state cookie fails closed without signing key',
    await verifyOAuthStateCookieValue({}, cookie, now) === null);

  const routeDeps = {
    json: (data, status, headers) => new Response(JSON.stringify(data), {
      status, headers: { 'Content-Type': 'application/json', ...headers },
    }),
    friendlyError: () => 'safe error',
    readBody: async () => ({}),
    verifyTokenSafe: async () => null,
    cookieToken: () => null,
    clearSessionCookie: () => '',
  };
  const loginResponse = await handleAuthRoutes(
    new Request(workerOrigin + '/api/auth/login?next=' + encodeURIComponent(DEV_ORIGIN + '/app')),
    { ...oauthEnv, GOOGLE_OAUTH_CLIENT_ID: 'oauth-client-id' }, {}, routeDeps
  );
  const googleAuthUrl = new URL(loginResponse.headers.get('Location'));
  const stateCookieHeader = loginResponse.headers.get('Set-Cookie') || '';
  const stateCookieValue = decodeURIComponent((stateCookieHeader.split(';')[0].split('=').slice(1).join('=')) || '');
  check('Google login sends opaque random state and sets HttpOnly state cookie',
    googleAuthUrl.hostname === 'accounts.google.com' &&
    !!googleAuthUrl.searchParams.get('state') &&
    googleAuthUrl.searchParams.get('state') !== DEV_ORIGIN + '/app' &&
    /HttpOnly/.test(stateCookieHeader) && /Secure/.test(stateCookieHeader) &&
    /SameSite=Lax/.test(stateCookieHeader) && /Max-Age=600/.test(stateCookieHeader));
  const invalidCallback = await handleAuthRoutes(
    new Request(workerOrigin + '/api/auth/callback?code=not-exchanged&state=attacker-state'),
    oauthEnv, {}, routeDeps
  );
  check('callback rejects missing browser state before exchanging OAuth code',
    invalidCallback.status === 400 &&
    (await invalidCallback.json()).error === 'invalid_oauth_state' &&
    /Max-Age=0/.test(invalidCallback.headers.get('Set-Cookie') || ''));

  const authRoute = readFileSync(new URL('../worker/src/routes/auth.routes.js', import.meta.url), 'utf8');
  const sharedFrontend = readFileSync(new URL('../worker/src/frontend/shared.js', import.meta.url), 'utf8');
  check('OAuth callback requires matching browser-bound state',
    authRoute.includes('suppliedState === statePayload.state') && authRoute.includes('invalid_oauth_state'));
  check('OAuth callback redirects with browser-only profile fragment and without token in URL',
    authRoute.includes('Location: appendOAuthProfileName(statePayload.redirectTo, user.name)') &&
    authRoute.includes("params.set('aics_profile_name', name)") &&
    authRoute.includes('target.hash = params.toString()') &&
    !authRoute.includes('#token='));
  check('OAuth callback clears one-time state cookie',
    authRoute.includes('Max-Age=0') && authRoute.includes('withClearedState(response)'));
  check('frontend no longer imports tokens from URL fragments',
    !sharedFrontend.includes("h.indexOf('#token=')") && !sharedFrontend.includes("decodeURIComponent(h.slice(7))"));
}

console.log('\n--- D) Auth signing key (no dev fallback) ---');
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

  // Regression tests for JWT exp enforcement. Build correctly signed tokens with
  // controlled payloads so these cases exercise verification, not bad signatures.
  const makeSignedToken = async (secret, payload) => {
    const toB64Url = (value) => btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const header = toB64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = toB64Url(JSON.stringify(payload));
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(header + '.' + body));
    const sig = toB64Url(String.fromCharCode(...new Uint8Array(signature)));
    return header + '.' + body + '.' + sig;
  };
  const expiryCases = [
    { label: 'expired JWT is rejected', payload: { sub: 'u-expired', exp: Math.floor(Date.now() / 1000) - 1 } },
    { label: 'JWT without exp is rejected', payload: { sub: 'u-no-exp' } },
    { label: 'JWT with string exp is rejected', payload: { sub: 'u-string-exp', exp: String(Math.floor(Date.now() / 1000) + 3600) } },
    { label: 'JWT with unsafe integer exp is rejected', payload: { sub: 'u-unsafe-exp', exp: Number.MAX_SAFE_INTEGER + 1 } },
  ];
  for (const testCase of expiryCases) {
    const auth = await loadAuth();
    const signed = await makeSignedToken('jwt-expiry-test-key', testCase.payload);
    let verifyErr = null;
    try {
      await auth.verifyToken({ SESSION_SIGNING_KEY: 'jwt-expiry-test-key' }, signed);
    } catch (e) {
      verifyErr = e;
    }
    check(testCase.label, !!verifyErr && /expired/.test(verifyErr.message), verifyErr && verifyErr.message);
  }
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



console.log('\n--- D) Retired D1 BYOK helper contract ---');
{
  const utilities = await import('../worker/src/core/utilities.js?legacy-byok-retired=' + Date.now());
  const legacyExports = ['getUserApiKey', 'saveUserApiKey', 'deleteUserApiKey'];
  check('legacy D1 BYOK helpers are no longer exported',
    legacyExports.every((name) => !(name in utilities)));

  const utilitiesSource = readFileSync(new URL('../worker/src/core/utilities.js', import.meta.url), 'utf8');
  check('shared utilities contain no legacy D1 BYOK storage or encryption code',
    !/user_keys|KEY_ENCRYPTION_SECRET|encryptSecret|decryptSecret/.test(utilitiesSource));
}

console.log('\\n--- D) API connection-test Cloudflare rate-limit contract ---');
{
  const route = readFileSync(new URL('../worker/src/routes/ai.routes.js', import.meta.url), 'utf8');
  const toml = readFileSync(new URL('../worker/wrangler.toml', import.meta.url), 'utf8');
  check('connection-test route uses dedicated Cloudflare binding and no D1 counter SQL',
    route.includes('AI_CONNECTION_TEST_RATE_LIMITER') &&
    route.includes('payload.sub') &&
    !route.includes('api_test_limits') && !route.includes('env.DB.prepare'));
  for (const envName of ['dev', 'staging', 'prod']) {
    // Wrangler rate-limit bindings are declared as array tables after the
    // [env.*] sections, so do not scope them by splitting on [env.*].
    const rateLimitTables = [...toml.matchAll(
      new RegExp('\\[\\[env\\.' + envName + '\\.ratelimits\\]\\]([\\s\\S]*?)(?=\\n\\[\\[env\\.|\\s*$)', 'g')
    )].map((match) => match[1]);
    const connectionTestTable = rateLimitTables.find((table) =>
      /name = "AI_CONNECTION_TEST_RATE_LIMITER"/.test(table)
    ) || '';
    const simpleConfig = connectionTestTable.match(
      new RegExp('\\[env\\.' + envName + '\\.ratelimits\\.simple\\]\\s*limit = (\\d+)\\s*period = (\\d+)')
    );
    check(envName + ' connection-test limit is five per 60 seconds',
      !!connectionTestTable && !!simpleConfig &&
      Number(simpleConfig[1]) === 5 && Number(simpleConfig[2]) === 60,
      connectionTestTable.slice(0, 180));
  }
  check('legacy api_test_limits migration is retained without runtime dependency',
    existsSync(new URL('../worker/migrations/006_create_api_test_limits.sql', import.meta.url)) &&
    !/api_test_limits/.test(route));
  console.log('  ↷ namespace IDs 2111/2112/2113 are provisional; verify account-wide uniqueness before remote deployment.');
  console.log('  ↷ no remote D1 migration or Cloudflare resource operation performed.');
}

console.log('\n--- E) Shared AI generation rate-limit contract ---');
{
  const route = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8');
  const guards = readFileSync(new URL('../worker/src/middleware/requestGuards.js', import.meta.url), 'utf8');
  const config = readFileSync(new URL('../worker/wrangler.toml', import.meta.url), 'utf8');
  check('generation routes use a three-per-60-second Cloudflare limit',
    /const SHARED_AI_RATE_LIMIT = 3/.test(guards) &&
    /SHARED_AI_RATE_WINDOW_SECONDS = 60/.test(guards) &&
    /AI_GENERATION_RATE_LIMITER/.test(guards) &&
    !/api_generation_limits|env\.DB\.prepare/.test(guards) &&
    /enforceSharedAiRateLimit\(request, env, path, \{/.test(route));
  check('Cloudflare AI rate limiter is configured for dev, staging, and prod',
    (config.match(/name = "AI_GENERATION_RATE_LIMITER"/g) || []).length === 3 &&
    (config.match(/limit = 3/g) || []).length >= 3 &&
    (config.match(/period = 60/g) || []).length >= 3);
  check('rate-limit covers six Studio families and excludes CMS prompt',
    !/path === '\/api\/cms\/prompt'/.test(guards) &&
    /content\|story\|short\|image\|voice\|shop\|subtitle/.test(guards));
  console.log('  ↷ Namespace IDs must be checked for account-wide uniqueness before remote deployment.');
}

console.log('\n--- E) Browser-local BYOK settings save/status contract ---');
{
  const shared = readFileSync(new URL('../worker/src/frontend/shared.js', import.meta.url), 'utf8');
  const settings = readFileSync(new URL('../worker/src/frontend/settings.js', import.meta.url), 'utf8');
  const runtime = readFileSync(new URL('../worker/src/frontend/storage/byok-runtime.js', import.meta.url), 'utf8');
  check('API key save delegates to encrypted IndexedDB repository',
    shared.includes('AICS_BYOK.saveGemini(key)') &&
    runtime.includes("window.AICS_API_KEYS.save(accountId, 'gemini', key, first)"));
  check('API key save reports cancellation/failure as false',
    shared.includes('if (!key) return Promise.resolve(false)') && shared.includes('return false;'));
  check('API key passphrase is held in memory only',
    runtime.includes("var passphrase = ''") &&
    !runtime.includes('localStorage.setItem') && !runtime.includes('sessionStorage') && !runtime.includes('document.cookie'));
  check('settings status is read from browser-local IndexedDB',
    settings.includes('AICS_BYOK.hasGemini()') && !settings.includes('/api/user/apikey/status'));
  check('connection test decrypts key locally before transient request',
    settings.includes('AICS_BYOK.withGeminiKey(') && settings.includes("api('/api/ai/test'"));
  check('frontend no longer calls D1-backed API key save/status/delete routes',
    !shared.includes('/api/user/apikey') && !settings.includes('/api/user/apikey'));
  check('settings refreshes status only after save resolves successfully',
    settings.includes('Promise.resolve(window.setApiKey()).then(function(saved){') && settings.includes('if(saved) loadKeyStatus();'));
  check('API key status refresh does not depend on fixed two-second timer',
    !settings.includes('setTimeout(loadKeyStatus,2000)') && !settings.includes('setTimeout(loadKeyStatus, 2000)'));
  const removeStart = settings.indexOf('function removeApiKey()');
  const removeEnd = settings.indexOf('\n}', removeStart);
  const removeApiKey = removeStart >= 0 ? settings.slice(removeStart, removeEnd >= 0 ? removeEnd : undefined) : '';
  check('API key deletion refreshes browser-local status after success',
    removeApiKey.includes('AICS_BYOK.removeGemini()') && removeApiKey.includes('loadKeyStatus();'));
}
console.log('\n--- F) API request body size protection ---');
{
  const limit = 32 * 1024 * 1024;
  const oversizedHeaderRequest = new Request('https://w.dev/api/test-body-limit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': String(limit + 1) },
    body: '{}',
  });
  const headerResponse = await worker.fetch(oversizedHeaderRequest, envFor(DEV_ORIGIN), {});
  check('API POST rejects declared Content-Length above 32 MiB with 413',
    headerResponse.status === 413 &&
    (await headerResponse.json()).error === 'request_body_too_large');

  const oversizedStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(limit + 1));
      controller.close();
    },
  });
  const streamedRequest = new Request('https://w.dev/api/test-body-limit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: oversizedStream,
    duplex: 'half',
  });
  check('API POST rejects oversized streamed body when Content-Length is absent',
    streamedRequest.headers.get('Content-Length') === null &&
    (await worker.fetch(streamedRequest, envFor(DEV_ORIGIN), {})).status === 413);

  const smallRequest = new Request('https://w.dev/api/test-body-limit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  });
  const smallResponse = await worker.fetch(smallRequest, envFor(DEV_ORIGIN), {});
  check('API POST under the body limit is not rejected by size guard', smallResponse.status !== 413);
}

console.log('--- F) Content draft secret exclusion ---');
{
 const shell = readFileSync(new URL('../worker/src/frontend/studios/content/shell.js', import.meta.url), 'utf8');
 const adapter = readFileSync(new URL('../worker/src/frontend/storage/studio-drafts.js', import.meta.url), 'utf8');
 const collect = shell.split('function studioCollectDraft(){')[1].split('window.studioCollectDraft=')[0];
 check('Content draft excludes key inputs', !collect.includes("byok:val(") && !collect.includes("videoByok:val("));
 check('Legacy draft fields sanitized', adapter.includes('safeDraftData(studio, legacy)') &&
   adapter.includes('delete data.byok;') && adapter.includes('delete data.videoByok;'));
 check('New draft fields sanitized', adapter.includes('safeDraftData(studio, draft)') &&
   adapter.includes('delete data.byok;') && adapter.includes('delete data.videoByok;'));
}

console.log('\n--- G) Multimodal request input limits ---');
{
  const { validateMultimodalInputs } = await import('../worker/src/core/ai.js?limits=' + Date.now());
  const validImage = { mimeType: 'image/png', base64: 'YWJj' };
  check('multimodal accepts a valid image input',
    validateMultimodalInputs('Describe this image', [validImage]).length === 1);
  let tooManyImages = '';
  try { validateMultimodalInputs('prompt', Array.from({ length: 6 }, () => validImage)); }
  catch (e) { tooManyImages = e.message; }
  check('multimodal rejects more than five images', tooManyImages === 'too_many_images');
  let invalidMime = '';
  try { validateMultimodalInputs('prompt', [{ mimeType: 'text/plain', base64: 'YWJj' }]); }
  catch (e) { invalidMime = e.message; }
  check('multimodal rejects non-image MIME types', invalidMime === 'invalid_image');
  let oversizedPrompt = '';
  try { validateMultimodalInputs('p'.repeat(100001), []); }
  catch (e) { oversizedPrompt = e.message; }
  check('multimodal rejects prompts over 100000 characters', oversizedPrompt === 'prompt_too_large');
  let oversizedImage = '';
  try { validateMultimodalInputs('prompt', [{ mimeType: 'image/png', base64: 'x'.repeat(12 * 1024 * 1024 + 1) }]); }
  catch (e) { oversizedImage = e.message; }
  check('multimodal rejects a single image over 12 MiB encoded characters', oversizedImage === 'image_too_large');
  let oversizedTotal = '';
  try {
    const part = 'x'.repeat(10 * 1024 * 1024 + 1);
    validateMultimodalInputs('prompt', [
      { mimeType: 'image/png', base64: part },
      { mimeType: 'image/png', base64: part },
    ]);
  } catch (e) { oversizedTotal = e.message; }
  check('multimodal rejects combined image payload over 20 MiB encoded characters', oversizedTotal === 'images_too_large');
}

console.log('\n--- CMS prompt authorization contracts ---');
{
  const index = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8');
  const admin = readFileSync(new URL('../worker/src/admin/api.js', import.meta.url), 'utf8');
  const cmsRoute = readFileSync(new URL('../worker/src/routes/cms.routes.js', import.meta.url), 'utf8');
  const genericStudioRoute = readFileSync(new URL('../worker/src/routes/studio.routes.js', import.meta.url), 'utf8');
  const studio = readFileSync(new URL('../worker/src/studio.js', import.meta.url), 'utf8');
  const cms = readFileSync(new URL('../worker/src/core/cms.js', import.meta.url), 'utf8');
  const adminGateAt = index.indexOf('const adminResp = await adminApi(request, path, env, verifyToken)');
  const cmsDispatchAt = index.indexOf('const cmsResponse = await handleCmsRoutes(request, env, cors');
  check('CMS prompt route checks Admin email locally', cmsRoute.includes("String(env.ADMIN_EMAIL || '').trim()") && cmsRoute.includes("detail: 'admin only'"));
  check('Shared CMS Admin gate runs before route dispatch', adminGateAt >= 0 && cmsDispatchAt > adminGateAt && admin.includes("path.indexOf('/api/cms/') === 0"));
  check('CMS prompt response requires valid identity and Admin email', cmsRoute.includes("!payload || !payload.sub || !payload.email") && cmsRoute.includes('system_prompt: buildSystemPrompt(c)'));
  check('CMS test page remains non-production only', index.includes("if (!isProdEnv && path === '/cms-test') return htmlPage(cmsTestPage())"));
  check('Studio generation keeps server-side CMS integration', genericStudioRoute.includes('generateStudio') && /getCMSData|buildSystemPrompt/.test(studio) && cms.includes('export { getCMSData, buildSystemPrompt }'));
}
console.log('\n--- Shop Reference Removal Delegation Contract ---');
{
  const shopActions = readFileSync(new URL('../worker/src/frontend/studios/shop/actions.js', import.meta.url), 'utf8');
  const renderStart = shopActions.indexOf('function renderRefPreview');
  const renderEnd = shopActions.indexOf('// ===================== Type Chips', renderStart);
  const render = shopActions.slice(renderStart, renderEnd);
  const removeStart = shopActions.indexOf('function removeShopReference');
  const removeEnd = shopActions.indexOf('function setTypeChip', removeStart);
  const remove = shopActions.slice(removeStart, removeEnd);
  check('Shop reference remove buttons use delegated data attributes, not onclick handlers',
    render.includes("setAttribute('data-shop-action','removeShopReference')") &&
    render.includes("setAttribute('data-shop-arg2',String(idx))") &&
    !render.includes('x.onclick='));
  check('Shop reference removal converts delegated string indices before validation',
    remove.includes('var numericIndex=Number(index)') &&
    remove.includes('Number.isInteger(numericIndex)') &&
    remove.includes('list.splice(numericIndex,1)'));
  check('Shop delegated dispatcher explicitly allows reference removal',
    shopActions.includes("'shopMainNav','removeShopReference'"));
}


console.log('--- Admin UI Event Delegation Contract ---');
{
  const adminUi = readFileSync(new URL('../worker/src/admin/ui.js', import.meta.url), 'utf8');
  const delegatedHandlers = adminUi.match(/\bdata-admin-(?:click|change)\s*=/g) || [];
  check('Admin UI has migrated all 54 click/change handlers to data attributes',
    delegatedHandlers.length === 54 &&
    !/\bon(?:click|change)\s*=/i.test(adminUi),
    'delegated=' + delegatedHandlers.length);
  check('Admin UI delegates click and change events from document',
    adminUi.includes("document.addEventListener('click'") &&
    adminUi.includes("document.addEventListener('change'") &&
    adminUi.includes("closest('[data-admin-click]')") &&
    adminUi.includes("closest('[data-admin-change]')"));
  check('Admin UI dispatcher only accepts allow-listed action names',
    adminUi.includes('if (!match || !ADMIN_ACTIONS[match[1]]) return false;') &&
    adminUi.includes("'switchTab','closeNav','toggleNav'") &&
    adminUi.includes("'editBrain','delBrain','toggleStudio'"));
  check('Admin UI event dispatcher does not evaluate handler strings as JavaScript',
    !/\beval\s*\(|new\s+Function\s*\(/.test(adminUi));
}


console.log('\n--- Admin UI CSP Inline Style Contract ---');
{
  const adminUi = readFileSync(new URL('../worker/src/admin/ui.js', import.meta.url), 'utf8');
  const adminStyleClasses = adminUi.match(/\.admin-style-\d{2}\s*\{/g) || [];
  check('Admin UI has no inline style attributes', !/\bstyle\s*=/i.test(adminUi));
  check('Admin UI does not assign element.style properties', !/\.style(?:\.|\[)/.test(adminUi));
  check('Admin UI maps all former static inline styles to CSS classes',
    adminStyleClasses.length === 21 &&
    adminUi.includes('.admin-style-01{') &&
    adminUi.includes('.admin-style-21{'),
    'classes=' + adminStyleClasses.length);
  check('Admin UI replaces dynamic dashboard styles with state classes',
    adminUi.includes('health-state-on') && adminUi.includes('health-state-off') &&
    adminUi.includes('health-dot-off') && adminUi.includes('health-status-on') &&
    adminUi.includes('health-status-off'));
  check('Admin loading visibility uses CSP-safe CSS classes',
    adminUi.includes("$('loading').classList.add('loading-error')") &&
    adminUi.includes("$('loading').classList.add('hidden')") &&
    adminUi.includes('.loading-error{display:block!important}'));
}


console.log('\\n--- Worker Test Pages CSP Inline Style Contract ---');
{
  const index = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8');
  const styleInjectionCount = (index.match(/\+\s*TEST_PAGE_STYLES\s*\+/g) || []).length;
  check('Worker HTML pages contain no inline style attributes',
    !/\bstyle\s*=/i.test(index));
  check('Worker HTML pages do not assign element.style properties',
    !/\.style(?:\.|\s*\[)/.test(index));
  check('shared test-page stylesheet is nonce-injected by htmlPage',
    index.includes('const TEST_PAGE_STYLES =') &&
    index.includes(".on('style'") &&
    index.includes("element.setAttribute('nonce', nonce)") &&
    styleInjectionCount === 6,
    'style injections=' + styleInjectionCount);
  check('test-page stylesheet defines responsive page and component classes',
    index.includes('.test-page{') &&
    index.includes('.disabled-page{') &&
    index.includes('.test-output-image{') &&
    index.includes('@media(max-width:480px)'));
  check('dynamic test image uses a CSS class instead of inline styles',
    index.includes('im.className="test-output-image"') &&
    !index.includes('im.style.'));
}


console.log('\\n--- Settings UI CSP Inline Style Contract ---');
{
  const settings = readFileSync(new URL('../worker/src/frontend/settings.js', import.meta.url), 'utf8');
  check('Settings UI has no inline style attributes', !/\bstyle\s*=/i.test(settings));
  check('Settings UI does not assign element.style properties', !/\.style(?:\.|\s*\[)/.test(settings));
  check('Settings tab visibility uses the hidden property and CSP-safe CSS',
    settings.includes("p.hidden=true") &&
    settings.includes("getElementById(tabs[name]).hidden=false") &&
    settings.includes('.tab-panel[hidden]{display:none!important;}'));
  check('Settings dynamic profile and login markup uses CSS classes',
    settings.includes('settings-profile-name') &&
    settings.includes('settings-save-name') &&
    settings.includes('settings-login-required') &&
    settings.includes('settings-login-link'));
  check('Settings plan catalog uses reusable CSS classes, not inline styles',
    settings.includes('plan-catalog-user') &&
    settings.includes('plan-catalog-grid') &&
    settings.includes('plan-catalog-card') &&
    settings.includes('plan-catalog-features') &&
    settings.includes('plan-catalog-links'));
  check('Settings plan cards remain mobile responsive',
    settings.includes('grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))') &&
    settings.includes('@media(max-width:600px){.settings-login-required'));
}


console.log('\n--- Shared UI Dynamic HTML Injection Contract ---');
{
  const sharedSource = readFileSync(new URL('../worker/src/frontend/shared.js', import.meta.url), 'utf8');
  const shared = await import('../worker/src/frontend/shared.js?shared-xss-contract=' + Date.now());
  const hostile = '"><img src=x onerror=alert(1)>&\'';
  check('Shared HTML escaping encodes text and attribute metacharacters',
    shared.escapeHtml(hostile) === '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;&amp;&#39;');
  check('App and Studio sidebar external links escape configured URLs',
    (sharedSource.match(/escapeHtml\(SITE_LINKS\.(?:telegram|facebook)\)/g) || []).length === 4);
  check('AI model options use DOM value/textContent instead of HTML interpolation',
    sharedSource.includes('option.value = String(m.id') &&
    sharedSource.includes('option.textContent = String(m.name') &&
    !sharedSource.includes("html += '<option value=\'") &&
    !sharedSource.includes('sel.innerHTML = html'));
  check('Audience choices are rendered as text nodes',
    sharedSource.includes("button.textContent = String(v == null ?") &&
    !sharedSource.includes(" + v + '</button>'"));
  check('Studio action labels are rendered as text and class tokens are validated',
    sharedSource.includes('button.textContent = String(a.label).replace') &&
    sharedSource.includes('/^[a-zA-Z0-9_-]+$/.test(token)') &&
    !sharedSource.includes(" + a.label + '</button>'"));
  check('Stepper labels are rendered through textContent',
    sharedSource.includes('stepLabel.textContent = String(s.label') &&
    !sharedSource.includes(" + s.label + '</span>"));
  const hostileShell = shared.renderStudioShell({
    id: '</script><script>alert(1)</script>',
    nameMy: '<img src=x onerror=alert(1)>',
    modelCat: '" onfocus="alert(1)',
    modelTask: '"><script>alert(1)</script>',
    steps: [{ label: '</script><img src=x onerror=alert(1)>' }],
    content: '<div class="trusted-test-content"></div>',
  });
  check('Studio title and model attributes are HTML escaped',
    hostileShell.includes('&lt;img src=x onerror=alert(1)&gt;') &&
    hostileShell.includes('data-category="&quot; onfocus=&quot;alert(1)') &&
    hostileShell.includes('data-task="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"'));
  check('Shell ID and step JSON cannot terminate the inline script',
    hostileShell.includes('\\u003c/script\\u003e\\u003cscript\\u003ealert(1)') &&
    !hostileShell.includes('</script><script>alert(1)</script>'));
  const inlineScript = hostileShell.match(/<script>\s*([\s\S]*?)<\/script>/i);
  let scriptSyntaxValid = false;
  try { if (inlineScript) { new vm.Script(inlineScript[1]); scriptSyntaxValid = true; } } catch (_) {}
  check('Generated Studio shell script remains syntactically valid', scriptSyntaxValid);
}



console.log('\\n--- Story Session History DOM XSS Regression ---');
{
  const sharedSource = readFileSync(new URL('../worker/src/frontend/shared.js', import.meta.url), 'utf8');
  const functionStart = sharedSource.indexOf('function sidebarSessionHistoryScript() {');
  const functionEnd = sharedSource.indexOf('\nfunction oauthProfileNameBootstrapScript()', functionStart);
  const functionSource = functionStart >= 0 && functionEnd > functionStart
    ? sharedSource.slice(functionStart, functionEnd)
    : '';
  check('Story session history script is present', !!functionSource);
  check('Story session history rendering does not use HTML parsing sinks',
    !!functionSource &&
    !functionSource.includes('.innerHTML') &&
    !functionSource.includes('insertAdjacentHTML'));

  if (functionSource) {
    const factoryContext = { String, Date, Intl, Promise, isNaN };
    vm.runInNewContext(functionSource + '\nthis.createSessionHistoryScript = sidebarSessionHistoryScript;', factoryContext);
    const sessionScript = factoryContext.createSessionHistoryScript();
    const hostileId = 'session-"><img src=x onerror=alert(1)>';
    const hostileTitle = '<img src=x onerror=alert(1)> & "Story"';
    const records = [
      { id: hostileId, title: hostileTitle, updatedAt: '2026-11-26T08:00:00.000Z' },
      { id: 'session-page-2', title: '<svg onload=alert(2)>Page 2</svg>', updatedAt: '2026-11-26T08:01:00.000Z' },
    ];
    let listCalls = 0;
    let htmlSinkCalls = 0;

    function makeNode(tagName) {
      let textValue = '';
      const node = {
        tagName: String(tagName).toUpperCase(),
        children: [],
        attributes: {},
        className: '',
        type: '',
        title: '',
        disabled: false,
        isConnected: true,
        classList: {
          values: new Set(),
          add(value) { this.values.add(value); },
          remove(value) { this.values.delete(value); },
          toggle(value, force) {
            const enabled = force === undefined ? !this.values.has(value) : !!force;
            if (enabled) this.values.add(value);
            else this.values.delete(value);
            return enabled;
          },
          contains(value) { return this.values.has(value); },
        },
        setAttribute(name, value) { this.attributes[name] = String(value); },
        getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; },
        appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
        querySelector(selector) {
          if (selector === '.aics-session-item') return this.children.find((child) => child.className === 'aics-session-item') || null;
          return null;
        },
        querySelectorAll(selector) {
          if (selector === '.aics-session-item') return this.children.filter((child) => child.className === 'aics-session-item');
          return [];
        },
        insertAdjacentHTML() { htmlSinkCalls++; },
      };
      Object.defineProperty(node, 'textContent', {
        get() { return textValue + this.children.map((child) => child.textContent || '').join(''); },
        set(value) { textValue = String(value == null ? '' : value); this.children = []; },
      });
      Object.defineProperty(node, 'innerHTML', {
        get() { return ''; },
        set() { htmlSinkCalls++; },
      });
      return node;
    }

    const root = makeNode('section');
    const listNode = makeNode('div');
    const moreButton = makeNode('button');
    const nodes = {
      aicsSessionHistory: root,
      aicsSessionHistoryList: listNode,
      aicsSessionLoadMore: moreButton,
    };
    const document = {
      getElementById(id) { return nodes[id] || null; },
      createElement(tagName) { return makeNode(tagName); },
    };
    const window = {
      AICS_SESSIONS: {
        list() {
          const result = listCalls++ === 0
            ? { items: [records[0]], nextCursor: 'cursor-2', hasMore: true }
            : { items: [records[1]], nextCursor: null, hasMore: false };
          return Promise.resolve(result);
        },
      },
    };
    vm.runInNewContext(sessionScript, {
      document, window, Promise, Date, Intl, isNaN, String,
      console: { error() {} },
      setTimeout() { return 0; },
      __sbToast() {},
    });
    await new Promise((resolve) => setImmediate(resolve));

    const firstButton = listNode.children.find((child) => child.className === 'aics-session-item');
    const firstTitle = firstButton && firstButton.children.find((child) => child.className === 'aics-session-title');
    check('hostile session title remains literal text in a DOM text node',
      !!firstTitle && firstTitle.textContent === hostileTitle);
    check('hostile session ID is stored as an attribute value, not parsed as markup',
      !!firstButton && firstButton.getAttribute('data-session-id') === hostileId);
    check('delegated Story session action marker is preserved',
      !!firstButton && firstButton.getAttribute('data-aics-sidebar-action') === 'open-story-session');
    check('session history performs no innerHTML or insertAdjacentHTML writes',
      htmlSinkCalls === 0);

    if (window.aicsLoadMoreStorySessions) {
      await window.aicsLoadMoreStorySessions();
    }
    const sessionButtons = listNode.children.filter((child) => child.className === 'aics-session-item');
    const secondTitle = sessionButtons[1] && sessionButtons[1].children.find((child) => child.className === 'aics-session-title');
    check('Load More appends the next page without replacing the first page',
      sessionButtons.length === 2 && !!secondTitle && secondTitle.textContent === records[1].title);
    check('Load More visibility continues to use the existing CSS class contract',
      moreButton.classList.contains('is-hidden'));
    check('pagination also avoids HTML parsing sinks', htmlSinkCalls === 0);
  }
}

console.log('\n--- Shared UI CSP Inline Style Contract ---');
{
  const sharedSource = readFileSync(new URL('../worker/src/frontend/shared.js', import.meta.url), 'utf8');
  const inlineStyles = sharedSource.match(/\bstyle\s*=/gi) || [];
  check('Shared UI has no inline style attributes', inlineStyles.length === 0, 'inline styles=' + inlineStyles.length);
  check('Admin links use CSS classes and class-based visibility',
    (sharedSource.match(/class="side-btn aics-admin-link"/g) || []).length === 2 &&
    sharedSource.includes('.aics-app .aics-admin-link{display:none;}') &&
    sharedSource.includes('.aics-app .aics-admin-link.is-visible{display:flex;}') &&
    sharedSource.includes("al.classList.toggle(\\'is-visible\\', !!d.is_admin)") &&
    !sharedSource.includes("al.style.display ="));
  const adminLinkTags = [...sharedSource.matchAll(/<a\b[^>]*\bid="adminLink"[^>]*>/g)].map(([tag]) => tag);
  check('Admin sidebar links have exactly one class attribute',
    adminLinkTags.length === 2 &&
    adminLinkTags.every((tag) => (tag.match(/\bclass\s*=/g) || []).length === 1));
  check('Story session Load More visibility uses a hidden CSS class',
    sharedSource.includes('class="aics-session-more is-hidden"') &&
    sharedSource.includes('.aics-app .aics-session-more.is-hidden{display:none;}') &&
    sharedSource.includes("moreButton.classList.toggle('is-hidden', !hasMore)") &&
    sharedSource.includes("moreButton.classList.add('is-hidden')") &&
    !sharedSource.includes('moreButton.style.display'));
  check('Studio sidebar reuses the shared flex-column layout without inline styles',
    sharedSource.includes('<div class="sidebar" id="sidebar">') &&
    sharedSource.includes('.aics-app .layout > .sidebar{display:flex;flex-direction:column;'));
  check('Studio work area uses a responsive CSS class instead of inline styles',
    sharedSource.includes('class="aics-work aics-work-content" id="aicsWork"') &&
    sharedSource.includes('.aics-app .aics-work-content{max-width:820px;margin:0 auto;width:100%;}') &&
    sharedSource.includes('@media (max-width:767px){'));
}


console.log('\n--- Task Instructions UI CSP Inline Style Contract ---');
{
  const taskUi = readFileSync(new URL('../worker/src/admin/task-instructions-ui.js', import.meta.url), 'utf8');
  const taskCss = taskUi.match(/export const TASK_INSTRUCTIONS_CSS = `([\s\S]*?)`;/);
  check('Task Instructions UI has no inline style attributes', !/\bstyle\s*=/i.test(taskUi));
  check('Task Instructions UI does not assign element.style properties', !/\.style(?:\.|\s*\[)/.test(taskUi));
  check('Task Instructions form description keeps its full-row layout via CSS class',
    taskUi.includes('class="task-form-description"') &&
    !!taskCss && taskCss[1].includes('.task-form-description{grid-column:1/-1}'));
  check('Task Instructions textareas preserve compact and preview heights via CSS classes',
    taskUi.includes('class="task-textarea-compact"') &&
    taskUi.includes('class="task-textarea-preview"') &&
    !!taskCss &&
    taskCss[1].includes('.task-field textarea.task-textarea-compact{min-height:70px}') &&
    taskCss[1].includes('.task-field textarea.task-textarea-preview{min-height:100px}'));
  check('Task Instructions preview headings and row actions use reusable CSS classes',
    taskUi.includes('class="card-title task-preview-output-title"') &&
    taskUi.includes("button.classList.add('task-row-action')") &&
    !!taskCss &&
    taskCss[1].includes('.task-preview-output-title{margin-top:12px}') &&
    taskCss[1].includes('.task-row-action{margin-right:5px}'));
  check('Task Instructions mobile layout rules remain in place',
    !!taskCss && taskCss[1].includes('@media(max-width:760px)') &&
    taskCss[1].includes('.task-form-grid,.task-preview-grid{grid-template-columns:1fr}'));
}

console.log('\n=== SECURITY RESULT: ' + passed + ' passed, ' + failed + ' failed ===');
process.exit(failed ? 1 : 0);
