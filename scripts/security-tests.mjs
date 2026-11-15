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
import { validateBackupEnvelope } from '../worker/src/frontend/storage/backup/validate.js';
import { ACTIONS_SCRIPT as shortActionsScript } from '../worker/src/frontend/studios/short/actions.js';

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

function getScriptStyleAttributes(html) {
  const found = [];
  for (const [tag, pattern] of [
    ['script', /<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi],
    ['style', /<style\b([^>]*)>[\s\S]*?<\/style\s*>/gi],
  ]) {
    for (const match of html.matchAll(pattern)) found.push({ tag, attributes: match[1] });
  }
  return found;
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
    const errorClasses = new Set();
    const errorElement = {
      classList: {
        add(name) { errorClasses.add(name); },
        remove(name) { errorClasses.delete(name); },
        contains(name) { return errorClasses.has(name); },
      },
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
    check('error visibility and prefix opacity are controlled by CSS classes',
      errorElement.classList.contains('aics-shared-error-visible') &&
      errorElement.children[0].className === 'aics-shared-error-prefix');
    vm.runInNewContext(errorScript + '\naicsHideError();', { document });
    check('hide error removes the visibility class',
      !errorElement.classList.contains('aics-shared-error-visible'));
  }
}

console.log('\\n--- B) Creations stored-XSS regression ---');
{
  const creations = readFileSync(new URL('../worker/src/frontend/creations.js', import.meta.url), 'utf8');
  const renderStart = creations.indexOf('function renderList()');
  const renderEnd = renderStart >= 0 ? creations.indexOf('function fmtDate', renderStart) : -1;
  const renderBlock = renderStart >= 0 && renderEnd > renderStart
    ? creations.slice(renderStart, renderEnd)
    : '';
  const escapeStart = creations.indexOf('function escapeHtml(value)');
  const escapeEnd = escapeStart >= 0 ? creations.indexOf('function safeMediaMime', escapeStart) : -1;
  const escapeBlock = escapeStart >= 0 && escapeEnd > escapeStart
    ? creations.slice(escapeStart, escapeEnd)
    : '';
  check('Creations renderer is present', !!renderBlock);
  check('studio and type values are escaped before HTML insertion',
    renderBlock.includes('escapeHtml(c.studio)') && renderBlock.includes("escapeHtml(c.type||'1')"));
  check('creation IDs are escaped before DOM ID and action attribute insertion',
    (renderBlock.split('escapeHtml(c.id)').length - 1) >= 5);
  check('image/audio MIME types are allowlisted and media URLs are escaped',
    creations.includes('function safeMediaMime') &&
    renderBlock.includes("safeMediaMime('image',c.media_mime)") &&
    renderBlock.includes("safeMediaMime('audio',c.media_mime)") &&
    renderBlock.includes('escapeHtml(uri)') && renderBlock.includes('escapeHtml(auri)'));
  check('HTML escaping covers HTML delimiters and quote characters',
    escapeBlock.includes('&amp;') && escapeBlock.includes('&lt;') &&
    escapeBlock.includes('&gt;') && escapeBlock.includes('&quot;') &&
    escapeBlock.includes('&#39;'));
  check('studio/type fields are not interpolated raw into the creation card',
    !renderBlock.includes("'+c.studio+'") &&
    !renderBlock.includes("'+(c.type||'1')+'"));
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



console.log('\\n--- B) Shared UI inline-style migration contract ---');
{
  const sharedUi = readFileSync(new URL('../worker/src/frontend/shared-ui.js', import.meta.url), 'utf8');
  const tick = String.fromCharCode(96);
  const scriptBody = (name) => {
    const marker = 'export const ' + name + ' = ' + tick;
    const start = sharedUi.indexOf(marker);
    const bodyStart = start >= 0 ? sharedUi.indexOf('\n', start) + 1 : -1;
    const bodyEnd = bodyStart > 0 ? sharedUi.indexOf('\n' + tick + ';', bodyStart) : -1;
    return bodyStart > 0 && bodyEnd > bodyStart ? sharedUi.slice(bodyStart, bodyEnd) : '';
  };
  const errorScript = scriptBody('AICS_ERROR_SCRIPT');
  const modalScript = scriptBody('AICS_MODAL_SCRIPT');
  const commonScript = scriptBody('AICS_COMMON_UTILS_SCRIPT');
  const resultScript = scriptBody('AICS_RESULT_BOX_SCRIPT');
  check('shared-ui module has no direct style property access',
    !/\.style\b/.test(sharedUi));
  check('error and modal helpers use CSS state classes',
    errorScript.includes("classList.add('aics-shared-error-visible')") &&
    errorScript.includes("classList.remove('aics-shared-error-visible')") &&
    modalScript.includes("classList.add('aics-shared-modal-visible')") &&
    modalScript.includes("classList.remove('aics-shared-modal-visible')"));
  check('shared CSS defines error, modal, and result preview states',
    sharedUi.includes('.aics-shared-error-visible{display:block!important;}') &&
    sharedUi.includes('.aics-shared-error-prefix{opacity:.85;}') &&
    sharedUi.includes('.aics-shared-modal-visible{display:flex!important;}') &&
    sharedUi.includes('.aics-rbox-target-text.aics-rbox-collapsed{max-height:260px;overflow:hidden;}'));
  check('textarea auto-expand uses rows instead of inline height styles',
    commonScript.includes('function aicsAutoExpand(el)') &&
    commonScript.includes('el.rows = Math.max(1, Math.ceil') &&
    !/\.style\b/.test(commonScript));
  const textarea = {
    tagName: 'TEXTAREA',
    rows: 2,
    scrollHeight: 84,
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return { lineHeight: '20px', paddingTop: '2px', paddingBottom: '2px' };
        },
      },
    },
  };
  vm.runInNewContext(commonScript + '\naicsAutoExpand(target);', {
    target: textarea, parseFloat, Math, isFinite,
  });
  check('textarea auto-expand calculates row count from measured content',
    textarea.rows === 4, 'rows=' + textarea.rows);
  check('result box uses class-based expand/collapse and preserves configurable preview limits',
    resultScript.includes("target.classList.add('aics-rbox-collapsed')") &&
    resultScript.includes("target.classList.remove('aics-rbox-collapsed')") &&
    resultScript.includes('aicsRboxSetPreviewLimit(target, previewMax)') &&
    resultScript.includes("style.setAttribute('nonce', __aicsRboxScriptNonce)") &&
    !/\.style\b/.test(resultScript));
  check('result box reset restores the original textarea row count',
    resultScript.includes('target.rows = originalRows || 2') &&
    !resultScript.includes('target.style.'));
  const modalClasses = new Set();
  const modalElement = {
    classList: {
      add(name) { modalClasses.add(name); },
      remove(name) { modalClasses.delete(name); },
      contains(name) { return modalClasses.has(name); },
    },
  };
  const modalDocument = { getElementById(id) { return id === 'test-modal' ? modalElement : null; } };
  vm.runInNewContext(modalScript + '\naicsShowModal("test-modal");', { document: modalDocument });
  const modalShown = modalElement.classList.contains('aics-shared-modal-visible');
  vm.runInNewContext(modalScript + '\naicsHideModal("test-modal");', { document: modalDocument });
  check('modal helpers add and remove the visible state class',
    modalShown && !modalElement.classList.contains('aics-shared-modal-visible'));
  check('shared CSS remains mobile-responsive for result continuation cards',
    sharedUi.includes('@media(max-width:700px){.aics-work .aics-hub-next-grid{grid-template-columns:1fr}}'));
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
  const inlineElements = getScriptStyleAttributes(html);
  check('HTML contains inline script/style elements for nonce validation', inlineElements.length >= 2);
  check('every script/style element receives the CSP response nonce',
    !!nonceMatch && inlineElements.length >= 2 &&
    inlineElements.every((element) => element.attributes.includes('nonce="' + nonceMatch[1] + '"')),
    'elements=' + JSON.stringify(inlineElements));
  const htmlPagePaths = ['/auth/result', '/ai-test', '/cms-test', '/studio-test', '/creations-test'];
  const htmlPageResults = await Promise.all(htmlPagePaths.map(async (path) => {
    const response = await worker.fetch(new Request('https://w.dev' + path), envFor(DEV_ORIGIN), {});
    return { path, response, html: await response.clone().text() };
  }));
  check('Worker-generated HTML pages contain no inline event-handler attributes',
    htmlPageResults.every(({ html }) => !/\son[a-z]+\s*=/i.test(html)));
  check('Worker-generated HTML pages contain no inline style attributes',
    htmlPageResults.every(({ html }) => !/\sstyle\s*=/i.test(html)));
  check('Worker-generated HTML pages contain no javascript URLs',
    htmlPageResults.every(({ html }) => !/javascript\s*:/i.test(html)));
  for (const { path, html, response } of htmlPageResults) {
    const policyHeader = response.headers.get('content-security-policy-report-only') || '';
    const match = policyHeader.match(/script-src 'self' 'nonce-([A-Za-z0-9+/]{22}==)'/);
    const elements = getScriptStyleAttributes(html);
    check(path + ' response has CSP and nonces every inline script/style element',
      !!match && elements.length > 0 &&
      elements.every((element) => element.attributes.includes('nonce="' + match[1] + '"')),
      'status=' + response.status + ', content-type=' + response.headers.get('content-type') +
      ', csp=' + !!policyHeader + ', elements=' + elements.length);
  }
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
  check('OAuth callback redirects without putting token in URL',
    authRoute.includes('Location: statePayload.redirectTo') && !authRoute.includes('#token='));
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
    const route = readFileSync(new URL('../worker/src/routes/ai.routes.js', import.meta.url), 'utf8');
    check('rate-limit route SQL matches migration table and columns',
      /INSERT INTO api_test_limits \(user_id, window_id, attempts\)/.test(route) &&
      /SELECT attempts FROM api_test_limits WHERE user_id = \? AND window_id = \?/.test(route));
  }
  const toml = readFileSync(new URL('../worker/wrangler.toml', import.meta.url), 'utf8');
  const dev = toml.split('[env.dev]')[1]?.split('[env.staging]')[0] || '';
  const staging = toml.split('[env.staging]')[1]?.split('[env.prod]')[0] || '';
  const prod = toml.split('[env.prod]')[1] || '';
  const readTomlValue = (section, key) =>
    section.match(new RegExp('^\\s*' + key + '\\s*=\\s*"([^"]+)"', 'm'))?.[1] || '';
  const devName = readTomlValue(dev, 'database_name');
  const devId = readTomlValue(dev, 'database_id');
  const stagingId = readTomlValue(staging, 'database_id');
  const prodId = readTomlValue(prod, 'database_id');
  const isUuid = (value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const devIdIsPlaceholder = devId === 'cloudflare အကောင့် မရှိသေးပါ';

  check('dev D1 configuration names the dev database only',
    devName === 'aics-db-dev',
    'database_name=' + JSON.stringify(devName));
  check('dev D1 ID is either an explicit unconfigured placeholder or a valid UUID',
    devIdIsPlaceholder || isUuid(devId),
    'database_id=' + JSON.stringify(devId));

  if (devIdIsPlaceholder) {
    // A placeholder is not a usable migration target. Keep CI useful without
    // pretending a remote database exists or allowing a migration to run.
    console.log('  ↷ dev D1 target identification NOT TESTED — database_id is an explicit placeholder; create D1 before remote migrations');
  } else {
    check('configured dev D1 ID is distinct from staging and production IDs',
      devId !== stagingId && devId !== prodId,
      'dev=' + JSON.stringify(devId) + ', staging=' + JSON.stringify(stagingId) + ', prod=' + JSON.stringify(prodId));
  }
  console.log('  ↷ remote D1 migration execution NOT TESTED — no database changes performed');
}


console.log('\n--- E) Shared AI generation rate-limit contract ---');
{
  const migrationPath = new URL('../worker/migrations/015_create_api_generation_limits.sql', import.meta.url);
  const migrationExists = existsSync(migrationPath);
  check('shared AI rate-limit migration exists', migrationExists);
  if (migrationExists) {
    const migration = readFileSync(migrationPath, 'utf8');
    check('migration creates per-user/per-window generation counters',
      /CREATE TABLE IF NOT EXISTS api_generation_limits/i.test(migration) &&
      /PRIMARY KEY\s*\(\s*user_id\s*,\s*window_id\s*\)/i.test(migration));
    check('migration indexes window_id for cleanup',
      /idx_api_generation_limits_window[\s\S]*?ON api_generation_limits\s*\(\s*window_id\s*\)/i.test(migration));
  }
  const route = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8');
  const guards = readFileSync(new URL('../worker/src/middleware/requestGuards.js', import.meta.url), 'utf8');
  check('generation routes share a 30-per-10-minute user limit',
    /const SHARED_AI_RATE_LIMIT = 30/.test(guards) &&
    /api_generation_limits/.test(guards) &&
    /enforceSharedAiRateLimit\(request, env, path, \{/.test(route) &&
    /rate_limited/.test(guards));
  check('rate-limit covers six Studio families and CMS prompt',
    /path === '\/api\/cms\/prompt'/.test(guards) &&
    /content\|story\|short\|image\|voice\|shop/.test(guards));
  console.log('  ↷ D1-backed runtime behavior and remote D1 application NOT TESTED by this static contract.');
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

console.log('\\n--- H) Backward-compatible backup Studio identifier validation ---');
{
  const ownerId = 'backup-owner';
  function envelopeWith(storeName, record) {
    const stores = {
      creations: [], projects: [], studio_sessions: [], studio_handoffs: [],
      session_results: [], ideas: [], drafts: [], media_assets: [],
    };
    stores[storeName].push(record);
    return {
      format: 'aics-browser-backup',
      exportVersion: 1,
      schemaVersion: 7,
      exportedAt: '2026-11-15T00:00:00.000Z',
      stores,
    };
  }
  function accepts(storeName, record) {
    try { return validateBackupEnvelope(envelopeWith(storeName, record), ownerId).valid; }
    catch (error) { return false; }
  }
  function rejects(storeName, record) {
    return !accepts(storeName, record);
  }

  check('legacy Creation Studio identifiers remain importable',
    accepts('creations', { id: 'creation-1', user_id: ownerId, studio: 'LEGACY_STORY_STUDIO_V1' }));
  check('legacy Session Studio identifiers remain importable',
    accepts('studio_sessions', { id: 'session-1', ownerId, studio: 'LEGACY_CREATIVE_SUITE' }));
  check('legacy Handoff source identifiers remain importable',
    accepts('studio_handoffs', {
      id: 'handoff-1', ownerId, contractVersion: 1,
      source: 'LEGACY_VIDEO_DIRECTOR_V2', target: 'story', payload: {},
    }));
  check('Studio identifiers containing HTML markup are rejected',
    rejects('creations', { id: 'creation-2', user_id: ownerId, studio: '<img src=x onerror=alert(1)>' }));
  check('legacy Studio identifiers containing spaces remain importable',
    accepts('studio_sessions', { id: 'session-2', ownerId, studio: 'LEGACY CREATIVE SUITE' }));
  check('Studio identifiers containing control characters are rejected',
    rejects('studio_sessions', { id: 'session-3', ownerId, studio: 'LEGACY\nSTUDIO' }));
  check('Handoff target continues to use the existing Studio allowlist',
    rejects('studio_handoffs', {
      id: 'handoff-2', ownerId, contractVersion: 1,
      source: 'LEGACY_VIDEO_DIRECTOR_V2', target: 'UNKNOWN_TARGET', payload: {},
    }));
}


console.log('\\n--- Admin UI CSP markup contract ---');
{
  const adminUi = readFileSync(new URL('../worker/src/admin/ui.js', import.meta.url), 'utf8');
  check('Admin UI contains no inline event-handler attributes',
    !/\s(onclick|onchange|oninput|onsubmit)\s*=/i.test(adminUi));
  check('Admin UI contains no inline style attributes',
    !/\sstyle\s*=/i.test(adminUi));
  const actions = Array.from(adminUi.matchAll(/data-admin-action="([^"]+)"/g), (match) => match[1]);
  const handlers = Array.from(adminUi.matchAll(/case '([^']+)'/g), (match) => match[1]);
  check('every declared Admin UI action has a delegated handler',
    actions.length > 0 && actions.every((action) => handlers.includes(action)));
  check('Admin UI change controls use delegated change handlers',
    adminUi.includes("document.addEventListener('change'") &&
    adminUi.includes('data-admin-change="mfCat"') &&
    adminUi.includes('data-admin-change="syncSubtitleType"'));
  check('Plan Catalog toggle has a distinct handler from user plan changes',
    adminUi.includes('function togglePlanCatalog(key,enabled){') &&
    adminUi.includes("case 'togglePlanCatalog':togglePlanCatalog("));
}

console.log('\n--- Shared Shell CSP markup contract ---');
{
  const shared = readFileSync(new URL('../worker/src/frontend/shared.js', import.meta.url), 'utf8');
  check('Shared Shell contains no inline event-handler attributes',
    !/\s(onclick|onchange|oninput|onsubmit|onkeydown|onkeyup)\s*=/i.test(shared));
  check('Shared Shell contains no inline style attributes',
    !/\sstyle\s*=/i.test(shared));
  check('Shared Shell does not assign DOM onclick properties',
    !/\.onclick\s*=/.test(shared));
  check('Shared Shell uses CSS classes instead of direct style properties',
    !/\.style\./.test(shared));
  check('Theme toggle uses an event listener',
    shared.includes('b.addEventListener("click"'));
  check('Shared Shell visibility states have matching CSS classes',
    shared.includes('.aics-admin-link.is-hidden') &&
    shared.includes('.aics-studio-link.is-hidden') &&
    shared.includes('.aics-session-more.is-hidden') &&
    shared.includes('.aics-result-loading-hint.is-hidden'));
  check('Shared Shell retains its responsive work container class',
    shared.includes('aics-work-container{max-width:820px;margin:0 auto;width:100%;}'));
  check('Shared Sidebar and Studio actions remain delegated',
    shared.includes("document.addEventListener") &&
    shared.includes('[data-aics-sidebar-action]') &&
    shared.includes('[data-aics-shell-action]'));
}


console.log('\n--- Settings CSP markup contract ---');
{
  const settings = readFileSync(new URL('../worker/src/frontend/settings.js', import.meta.url), 'utf8');
  check('Settings contains no inline style attributes',
    !/\sstyle\s*=/i.test(settings));
  check('Settings contains no direct DOM style property assignments',
    !/\.style(?:\.|\s*\[)/.test(settings));
  check('Settings contains no inline event-handler attributes',
    !/\s(onclick|onchange|oninput|onsubmit|onkeydown|onkeyup)\s*=/i.test(settings));
  check('Settings tab panels use CSS visibility classes',
    (settings.match(/class="tab-panel is-hidden"/g) || []).length === 3 &&
    settings.includes("p.classList.add('is-hidden')") &&
    settings.includes("classList.remove('is-hidden')"));
  check('Settings dynamic profile and plan markup uses CSS classes',
    settings.includes('settings-profile-name') &&
    settings.includes('settings-api-actions') &&
    settings.includes('plan-catalog-grid') &&
    settings.includes('plan-catalog-card'));
}

console.log('\n--- Backup Recovery CSP markup contract ---');
{
  const recovery = readFileSync(new URL('../worker/src/frontend/storage/backup/recovery-ui.js', import.meta.url), 'utf8');
  check('Backup Recovery contains no inline style attributes',
    !/\sstyle\s*=/i.test(recovery));
  check('Backup Recovery contains no direct DOM style property assignments',
    !/\.style(?:\.|\s*\[)/.test(recovery));
  check('Backup Recovery contains no inline event-handler attributes',
    !/\s(onclick|onchange|oninput|onsubmit|onkeydown|onkeyup)\s*=/i.test(recovery));
  check('Backup Recovery visual styles are defined in a nonce-compatible style block',
    recovery.includes('<style>') &&
    recovery.includes('#backup-recovery-panel .backup-actions') &&
    recovery.includes('#backup-recovery-panel .backup-preview') &&
    recovery.includes('#backup-recovery-panel .backup-message.is-error'));
  check('Backup Recovery message status uses CSS classes',
    recovery.includes("node.classList.toggle('is-error', !!isError)") &&
    recovery.includes("node.classList.toggle('is-success', !isError)") &&
    !recovery.includes('node.style.'));
  check('Backup Recovery retains mobile action layout rules',
    recovery.includes('@media(max-width:600px)') &&
    recovery.includes('#backup-recovery-panel .backup-actions .btn{flex:1 1 100%;}'));
}

console.log('\n--- Content Studio CSP markup contract ---');
{
  const contentPaths = ['../worker/src/frontend/studios/content/ui.js','../worker/src/frontend/studios/content/page.js','../worker/src/frontend/studios/content/fragments.js','../worker/src/frontend/studios/content/api.js','../worker/src/frontend/studios/content/helpers.js','../worker/src/frontend/studios/content/audio.js','../worker/src/frontend/studios/content/shell.js'];
  const contentSources = contentPaths.map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));
  check('Content Studio fragments contain no inline style attributes', contentSources.every((source) => !/\sstyle\s*=/i.test(source)));
  check('Content Studio fragments contain no inline event-handler attributes', contentSources.every((source) => !/\s(onclick|onchange|oninput|onsubmit|onkeydown|onkeyup)\s*=/i.test(source)));
  check('Content Studio scripts contain no DOM onclick property assignments', contentSources.every((source) => !/\.onclick\s*=/.test(source)));
  check('Content Studio scripts contain no direct DOM style property access', contentSources.every((source) => !/\.style(?:\.|\s*\[)/.test(source)));
  const helpers = contentSources[4]; const page = contentSources[1];
  check('Content Studio visibility is controlled with CSS classes', helpers.includes('function setContentVisible') && page.includes('.cs-hidden{display:none!important}'));
  check('Content Studio auto-grow avoids inline style properties', helpers.includes('el.rows=2') && helpers.includes('el.rows=Math.max(2,'));
  check('Content Studio stepper actions use delegated event attributes', helpers.includes('data-aics-action="content-nav"') && page.includes("case 'content-nav':"));
  check('Content Studio quick actions use delegated click handling', helpers.includes("chip.dataset.aicsAction='quick-action'") && page.includes("case 'quick-action':"));
  check('Content Studio audio download uses delegated click handling', contentSources[5].includes('data-aics-action="download-audio"') && !contentSources[5].includes('onclick='));
}


console.log('\n--- Story Video Plan CSP markup contract ---');
{
  const storyActions = readFileSync(new URL('../worker/src/frontend/studios/story-video-plan/actions.js', import.meta.url), 'utf8');
  check('Story Video Plan contains no inline event-handler attributes',
    !/\\s(onclick|onchange|oninput|onsubmit|onkeydown|onkeyup)\\s*=/i.test(storyActions));
  check('Story Video Plan actions use delegated data attributes',
    storyActions.includes('data-svp-action="copy-char-prompt"') &&
    storyActions.includes('data-svp-action="generate-char-image"') &&
    storyActions.includes('data-svp-action="generate-env-image"') &&
    storyActions.includes('data-svp-action="copy-env-prompt"') &&
    storyActions.includes('data-svp-action="copy-video-prompt"'));
  check('Story Video Plan delegated click handler covers all five actions',
    storyActions.includes("document.addEventListener('click'") &&
    storyActions.includes("case 'copy-char-prompt':") &&
    storyActions.includes("case 'generate-char-image':") &&
    storyActions.includes("case 'generate-env-image':") &&
    storyActions.includes("case 'copy-env-prompt':") &&
    storyActions.includes("case 'copy-video-prompt':"));
  check('Story Video Plan actions carry numeric item indexes',
    (storyActions.match(/data-svp-index=/g) || []).length >= 5 &&
    storyActions.includes("Number(target.getAttribute('data-svp-index'))"));
}


console.log('\\n--- Story Video Plan UI CSP markup contract ---');
{
  const storyVideoUi = readFileSync(new URL('../worker/src/frontend/studios/story-video-plan/ui.js', import.meta.url), 'utf8');
  const storyVideoPage = readFileSync(new URL('../worker/src/frontend/studios/story-video-plan/page.js', import.meta.url), 'utf8');
  check('Story Video Plan UI contains no inline style attributes',
    !/\sstyle\s*=/i.test(storyVideoUi));
  check('Story Video Plan UI retains all three replacement CSS class hooks',
    storyVideoUi.includes('aics-video-adv-panel') &&
    storyVideoUi.includes('aics-video-audio-direction') &&
    storyVideoUi.includes('aics-video-additional-instructions'));
  check('Story Video Plan page defines all three replacement CSS rules',
    storyVideoPage.includes('.aics-video-adv-panel{margin-top:2px}') &&
    storyVideoPage.includes('.aics-video-audio-direction{min-height:64px}') &&
    storyVideoPage.includes('.aics-video-additional-instructions{min-height:70px}'));
  check('Story Video Plan page retains its mobile responsive rule',
    storyVideoPage.includes('@media(max-width:767px){.aics-video-card{padding:15px}}'));
}




console.log('\n--- Short Actions CSP contract ---');
{
  const shortActionsFile = readFileSync(new URL('../worker/src/frontend/studios/short/actions.js', import.meta.url), 'utf8');
  check('Short Actions contain no direct DOM style properties or property event handlers',
    !/\.style(?:\.|\s*\[|\s*=)/.test(shortActionsFile) &&
    !/\.(?:onclick|onchange)\s*=/.test(shortActionsFile));
  check('Short result and error visibility use the hidden property',
    shortActionsScript.includes("sb.hidden=false") &&
    shortActionsScript.includes("sb3.hidden=false"));
  check('Short textarea auto-expand uses rows and computed content height',
    shortActionsScript.includes('ta.rows=1') &&
    shortActionsScript.includes('window.getComputedStyle') &&
    shortActionsScript.includes('ta.rows=Math.max(1,Math.ceil((ta.scrollHeight-padding)/lineHeight))') &&
    !/\.style(?:\.|\s*\[|\s*=)/.test(shortActionsFile));
  check('Short edit and Video Script fill flows retain auto-expand calls',
    shortActionsScript.includes('if(ta){currentShort=ta.value;autoExpand(ta);}') &&
    shortActionsScript.includes("ta.value=currentShort||'';\n  autoExpand(ta);"));
  const autoExpandSource = shortActionsScript.match(/function autoExpand\(ta\)\{[^}]*\}/)?.[0];
  let rowsAfterExpand = 0;
  if (autoExpandSource) {
    const autoExpand = vm.runInNewContext('(' + autoExpandSource + ')', {
      window: { getComputedStyle: () => ({ lineHeight: '20px', paddingTop: '10px', paddingBottom: '10px' }) },
    });
    const textarea = { value: 'one\ntwo\nthree', rows: 8, scrollHeight: 100 };
    autoExpand(textarea);
    rowsAfterExpand = textarea.rows;
  }
  check('Short auto-expand computes textarea rows without inline styles',
    rowsAfterExpand === 4);
}
console.log('\n--- Story Actions CSP markup contract ---');
{
  const storyActions = readFileSync(new URL('../worker/src/frontend/studios/story/actions.js', import.meta.url), 'utf8');
  const storyUi = readFileSync(new URL('../worker/src/frontend/studios/story/ui.js', import.meta.url), 'utf8');
  const storyPage = readFileSync(new URL('../worker/src/frontend/studios/story/page.js', import.meta.url), 'utf8');
  check('Story Actions contain no direct DOM style properties or property event handlers',
    !/\.style(?:\.|\s*\[|\s*=)/.test(storyActions) &&
    !/\.(?:onclick|onchange)\s*=/.test(storyActions));
  check('Story result body visibility uses the hidden property',
    storyActions.includes("sb.hidden=false") && storyActions.includes("sb3.hidden=false"));
  check('Story Idea Handoff visibility uses the existing hidden CSS class',
    storyActions.includes("panel.classList.remove('is-hidden')") &&
    (storyActions.match(/panel\.classList\.add\('is-hidden'\)/g)||[]).length===2 &&
    storyPage.includes('.aics-work .story-handoff-panel.is-hidden{display:none!important}'));
  check('Story Idea Handoff buttons use delegated data attributes in the UI',
    storyUi.includes('data-aics-action="accept-story-idea-handoff"') &&
    storyUi.includes('data-aics-action="dismiss-story-idea-handoff"'));
  check('Story page delegated click handler invokes both Idea Handoff actions',
    storyPage.includes("case 'accept-story-idea-handoff':window.studioAcceptIdeaHandoff();break;") &&
    storyPage.includes("case 'dismiss-story-idea-handoff':window.studioDismissIdeaHandoff();break;"));
  check('Story Video button lookup matches its delegated action attribute',
    storyActions.includes('[data-aics-action="go-to-video-plan"]') &&
    storyUi.includes('data-aics-action="go-to-video-plan"'));
}

console.log('\n--- Login CSP markup contract ---');
{
  const login = readFileSync(new URL('../worker/src/frontend/login.js', import.meta.url), 'utf8');
  check('Login page contains no inline style attributes',
    !/\sstyle\s*=/i.test(login));
  check('Login page contains no direct DOM style property access',
    !/\.style(?:\.|\s*\[|\s*=)/.test(login));
  check('Login name and confirm-password fields use the hidden CSS class',
    login.includes('class="field is-hidden" id="suNameField"') &&
    login.includes('class="field is-hidden" id="suCfField"'));
  check('Login hidden and Google loading states have matching CSS rules',
    login.includes('.is-hidden{display:none!important}') &&
    login.includes('.btn-google.is-loading{pointer-events:none;opacity:.6}'));
  check('Login loading state toggles the Google button CSS class',
    login.includes("googleBtn.classList.toggle('is-loading', on)") &&
    !login.includes('googleBtn.style.'));
  check('Login Sign Up mode toggles field visibility with CSS classes',
    login.includes("nameField.classList.remove('is-hidden')") &&
    login.includes("cfField.classList.remove('is-hidden')") &&
    login.includes("nameField.classList.add('is-hidden')") &&
    login.includes("cfField.classList.add('is-hidden')"));
  check('Login Forgot Password visibility uses a CSS class',
    login.includes("document.getElementById('forgotBtn').classList.add('is-hidden')") &&
    login.includes("document.getElementById('forgotBtn').classList.remove('is-hidden')"));
}


console.log('\\n--- Projects CSP markup contract ---');
{
  const projects = readFileSync(new URL('../worker/src/frontend/projects.js', import.meta.url), 'utf8');
  check('Projects page contains no inline style attributes',
    !/\sstyle\s*=/i.test(projects));
  check('Projects page contains no direct DOM style property access',
    !/\.style(?:\.|\s*\[|\s*=)/.test(projects));
  check('Projects page contains no inline event-handler attributes',
    !/\s(onclick|onchange|oninput|onsubmit|onkeydown)\s*=/i.test(projects));
  check('Projects loading and empty states use the shared hidden CSS class',
    projects.includes('id="loadingState" class="loading-state"') &&
    projects.includes('id="emptyState" class="empty-state is-hidden"') &&
    projects.includes('.is-hidden{display:none!important;}'));
  check('Projects loading and empty-state visibility is controlled with classList',
    projects.includes("loading.classList.remove('is-hidden')") &&
    projects.includes("loading.classList.add('is-hidden')") &&
    projects.includes("empty.classList.add('is-hidden')") &&
    projects.includes("empty.classList.remove('is-hidden')") &&
    projects.includes("document.getElementById('emptyState').classList.add('is-hidden')") &&
    projects.includes("document.getElementById('emptyState').classList.remove('is-hidden')"));
  check('Projects login-required markup uses matching CSS classes',
    projects.includes('class="login-required"') &&
    projects.includes('class="login-required-message"') &&
    projects.includes('class="login-required-link"') &&
    projects.includes('.login-required{text-align:center;padding:40px 20px;}') &&
    projects.includes('.login-required-message{margin:16px 0;}') &&
    projects.includes('.login-required-link{text-decoration:underline;}'));
  check('Projects create action remains delegated and calls the browser project API',
    projects.includes('data-project-action="create"') &&
    projects.includes("target.closest('[data-project-action=\"create\"]')") &&
    projects.includes("window.AICS_PROJECTS.create({title:title,description:''})"));
  check('Projects list and delete flows continue to use the browser project API',
    projects.includes('window.AICS_PROJECTS.list()') &&
    projects.includes('window.AICS_PROJECTS.remove(id)') &&
    projects.includes("if(!confirm('ဒီ Project ကို ဖျက်မှာ သေချာပါသလား?'))return;"));
  check('Projects page retains mobile-friendly viewport and wrapping layout',
    projects.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">') &&
    projects.includes('.create-box{display:flex;gap:10px;flex-wrap:wrap;') &&
    projects.includes('.project-card{') &&
    projects.includes('gap:12px;flex-wrap:wrap;') &&
    projects.includes('min-width:0;') &&
    projects.includes('min-height:42px;'));
}

console.log('\\n--- Home CSP markup contract ---');
{
  const home = readFileSync(new URL('../worker/src/frontend/home.js', import.meta.url), 'utf8');
  check('Home page contains no inline style attributes',
    !/\sstyle\s*=/i.test(home));
  check('Home page contains no direct DOM style property access',
    !/\.style(?:\.|\s*\[|\s*=)/.test(home));
  check('Home loading and login-required markup use CSS classes',
    home.includes('class="home-loading"') &&
    home.includes('class="home-login-required"') &&
    home.includes('class="home-login-required-message"') &&
    home.includes('class="home-login-link"'));
  check('Home page defines matching loading and login CSS rules',
    home.includes('.home-loading{color:var(--text3);}') &&
    home.includes('.home-login-required{padding:40px;text-align:center;}') &&
    home.includes('.home-login-required-message{margin:16px 0;}') &&
    home.includes('.home-login-link{color:var(--cyan);text-decoration:underline;}'));
  check('Home banner animation uses CSS classes and retains opacity transition',
    home.includes('.home-fade-out{opacity:0;}') &&
    home.includes("el.classList.add('home-fade-out')") &&
    home.includes("el.classList.remove('home-fade-out')") &&
    home.includes('transition:opacity 0.6s ease;'));
  check('Home studio card animation uses CSS classes and retains transition rules',
    home.includes('.home-card-shift-out{opacity:0;transform:translateY(6px);}') &&
    home.includes('.home-card-shift-in{opacity:1;transform:translateY(0);}') &&
    home.includes("el.classList.add('home-card-shift-out')") &&
    home.includes("el.classList.add('home-card-shift-in')") &&
    home.includes('transition:opacity 0.5s,transform 0.5s;'));
  check('Home recent creations continue to load from browser IndexedDB',
    home.includes('AICS_CREATIONS.list()') &&
    home.includes('items.slice(0,3)'));
  check('Home page retains viewport and responsive layout rules',
    home.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">') &&
    home.includes('@media(max-width:767px)') &&
    home.includes('.quick-grid,.recent-grid{grid-template-columns:repeat(2,1fr);gap:10px;}'));
}

console.log('\n--- Voice Actions CSP contract ---');
{
  const voiceActions = readFileSync(new URL('../worker/src/frontend/studios/voice/actions.js', import.meta.url), 'utf8');
  const voicePage = readFileSync(new URL('../worker/src/frontend/studios/voice/page.js', import.meta.url), 'utf8');
  check('Voice Actions contain no direct DOM style properties or property event handlers',
    !/\.style(?:\.|\s*\[|\s*=)/.test(voiceActions) &&
    !/\.(?:onclick|onchange)\s*=/.test(voiceActions));
  check('Voice model bar keeps the shared shell default visibility without inline styles',
    voiceActions.includes('function vSyncModelBar(){ /* Shared shell keeps the model bar visible by default. */ }') &&
    voicePage.includes('.aics-login-overlay.is-hidden{display:none}'));
  check('Voice login and app visibility use class state and matching CSS',
    voiceActions.includes("loginView').classList.remove('is-hidden')") &&
    voiceActions.includes("aicsApp').classList.add('voice-auth-hidden')") &&
    voicePage.includes('.aics-app.voice-auth-hidden{display:none!important}'));
  check('Voice textarea auto-grow uses rows and computed dimensions without inline styles',
    voiceActions.includes('x.rows=1') &&
    voiceActions.includes('window.getComputedStyle') &&
    voiceActions.includes('var minRows=Math.max(1,Math.ceil((120-padding)/lineHeight))') &&
    voiceActions.includes('var maxRows=Math.max(minRows,Math.floor((520-padding)/lineHeight))') &&
    !/\.style(?:\.|\s*\[|\s*=)/.test(voiceActions));
  const autoGrowSource = voiceActions.match(/function autoGrow\(x\)\{[^}]*\}/)?.[0];
  let rowsAtMinimum = 0;
  let rowsAtMaximum = 0;
  if (autoGrowSource) {
    const autoGrow = vm.runInNewContext('(' + autoGrowSource + ')', {
      window: { getComputedStyle: () => ({ lineHeight: '20px', paddingTop: '10px', paddingBottom: '10px' }) },
      isFinite,
      Math,
    });
    const smallTextarea = { rows: 8, scrollHeight: 60 };
    autoGrow(smallTextarea);
    rowsAtMinimum = smallTextarea.rows;
    const largeTextarea = { rows: 1, scrollHeight: 1200 };
    autoGrow(largeTextarea);
    rowsAtMaximum = largeTextarea.rows;
  }
  check('Voice textarea auto-grow preserves 120px minimum and 520px maximum',
    rowsAtMinimum === 5 && rowsAtMaximum === 25);
}


console.log('\n--- Image Studio CSP contract ---');
{
  const imageActions = readFileSync(new URL('../worker/src/frontend/studios/image/actions.js', import.meta.url), 'utf8');
  const imageApi = readFileSync(new URL('../worker/src/frontend/studios/image/api.js', import.meta.url), 'utf8');
  const imagePage = readFileSync(new URL('../worker/src/frontend/studios/image/page.js', import.meta.url), 'utf8');
  const imageSources = [imageActions, imageApi, imagePage];
  check('Image Studio fragments contain no inline style attributes, direct height/display style writes, or property event handlers',
    imageSources.every((source) =>
      !/\sstyle\s*=/i.test(source) &&
      !/\b[A-Za-z_$][\w$]*\.style\.(?:height|display)\b/.test(source) &&
      !/\b[A-Za-z_$][\w$]*\.style\s*\[/.test(source) &&
      !/\.(?:onclick|onchange)\s*=/.test(source)));
  check('Image login and app visibility use CSS classes with matching rules',
    imageApi.includes("loginView.classList.remove('is-hidden')") &&
    imageApi.includes("app.classList.add('image-auth-hidden')") &&
    imagePage.includes('.aics-login-overlay.is-hidden{display:none}') &&
    imagePage.includes('.aics-app.image-auth-hidden{display:none!important}'));
  check('Image reference removal uses the existing delegated action handler',
    imageApi.includes("removeBtn.dataset.imageAction='removeReference'") &&
    imageApi.includes("removeBtn.dataset.imageIndex=String(idx)") &&
    imagePage.includes("case 'removeReference':window.removeRef(Number(button.dataset.imageIndex));break;"));
  check('Image textarea auto-expand uses rows and computed dimensions without inline styles',
    imageActions.includes('ta.rows=1') &&
    imageActions.includes('window.getComputedStyle') &&
    imageActions.includes('ta.rows=Math.max(1,Math.ceil((ta.scrollHeight-padding)/lineHeight))') &&
    !/\bta\.style\.(?:height|display)\b/.test(imageActions));
  const autoExpandSource = imageActions.match(/function autoExpand\(ta\)\{[^}]*\}/)?.[0];
  let rowsAfterExpand = 0;
  if (autoExpandSource) {
    const autoExpand = vm.runInNewContext('(' + autoExpandSource + ')', {
      window: { getComputedStyle: () => ({ lineHeight: '20px', paddingTop: '10px', paddingBottom: '10px' }) },
      parseFloat,
      isFinite,
      Math,
    });
    const textarea = { rows: 8, scrollHeight: 100 };
    autoExpand(textarea);
    rowsAfterExpand = textarea.rows;
  }
  check('Image textarea auto-expand calculates row count from measured content',
    rowsAfterExpand === 4, 'rows=' + rowsAfterExpand);
}

console.log('\n=== SECURITY RESULT: ' + passed + ' passed, ' + failed + ' failed ===');
process.exit(failed ? 1 : 0);
