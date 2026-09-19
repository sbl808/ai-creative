#!/usr/bin/env node
/**
 * AI Creative Studio V2 — Route-level regression test (rule 12)
 * --------------------------------------------------------------
 * Imports the real worker (worker/src/index.js) and exercises page + auth +
 * basic API routes with a mocked D1 environment. No external network calls
 * are made (AI endpoints are not invoked).
 *
 * Run: node --experimental-default-type=module scripts/regression-test.mjs
 */
import { signToken } from '../worker/src/core/auth.js';

const worker = (await import('../worker/src/index.js?r=' + Date.now())).default;

// ---------------------------------------------------------------- mock env
class MockD1 {
  constructor(rows = {}) { this.rows = rows; }
  prepare(sql) {
    const self = this;
    return {
      bind(...args) { this._args = args; return this; },
      async first() {
        if (/SELECT plan, expiry FROM users WHERE id = \?/.test(sql)) {
          const id = this._args && this._args[0];
          return (self.rows.users || {})[id] || null;
        }
        return null;
      },
      async all() {
        if (/FROM studio_settings/.test(sql)) return { results: [] };
        if (/FROM users/.test(sql)) return { results: Object.values(self.rows.users || {}) };
        if (/FROM projects/.test(sql)) return { results: [] };
        return { results: [] };
      },
      async run() { return { success: true }; },
    };
  }
}

const env = {
  SESSION_SIGNING_KEY: 'regression-test-secret-key',
  GOOGLE_OAUTH_CLIENT_ID: 'test-client',
  GOOGLE_OAUTH_CLIENT_SECRET: 'test-secret',
  ALLOWED_ORIGINS: 'https://test.local',
  ADMIN_EMAIL: 'a@b.com',
  DB: new MockD1({}),
};

// ---------------------------------------------------------------- helpers
let passed = 0;
let failed = 0;
const failures = [];

async function check(name, fn) {
  try {
    const result = await fn();
    if (result.ok) { passed++; console.log('  ✔ ' + name); }
    else { failed++; failures.push({ name, msg: result.msg }); console.log('  ✘ ' + name + ' — ' + result.msg); }
  } catch (e) {
    failed++; failures.push({ name, msg: 'THREW: ' + e.message }); console.log('  ✘ ' + name + ' — THREW: ' + e.message);
  }
}

const get = (path, headers = {}) => worker.fetch(new Request('https://test.local' + path, { method: 'GET', headers }), env, {});

const withToken = async (extra = {}) => {
  const t = await signToken(env, { sub: 'user-1', email: 'a@b.com', name: 'Test' });
  return { Authorization: 'Bearer ' + t, Cookie: 'aics_token=' + encodeURIComponent(t), ...extra };
};

// ---------------------------------------------------------------- tests
console.log('— Page routes (no session) —');
await check('GET / → 200 API home', async () => {
  const r = await get('/');
  return { ok: r.status === 200 && (await r.text()).includes('API is running'), msg: `status=${r.status}` };
});
await check('GET /login → 200 login page', async () => {
  const r = await get('/login');
  return { ok: r.status === 200, msg: `status=${r.status}` };
});
await check('GET /app → 302 to /login (no session)', async () => {
  const r = await get('/app');
  return { ok: r.status === 302 && r.headers.get('Location').endsWith('/login'), msg: `status=${r.status} loc=${r.headers.get('Location')}` };
});
await check('GET /app/story → 302 to /login (no session)', async () => {
  const r = await get('/app/story');
  return { ok: r.status === 302 && r.headers.get('Location').endsWith('/login'), msg: `status=${r.status}` };
});

console.log('— Studio pages (with session) —');
for (const slug of ['story', 'content', 'short', 'image', 'voice', 'shop']) {
  await check(`GET /app/${slug} → 200 (lazy-loaded page)`, async () => {
    const r = await get('/app/' + slug, await withToken());
    const html = await r.text();
    return {
      ok: r.status === 200 && html.includes('<html') && html.includes('<script>'),
      msg: `status=${r.status} len=${html.length}`,
    };
  });
}
await check('GET /app/bogus → 404 STUDIO_NOT_FOUND (unknown studio)', async () => {
  const r = await get('/app/bogus', await withToken());
  const body = await r.text();
  return { ok: r.status === 404 && body === 'STUDIO_NOT_FOUND', msg: `status=${r.status} body=${JSON.stringify(body)}` };
});

console.log('— Phase 1 loader error contract —');
// Known studio whose module fails to load must be 500 STUDIO_PAGE_LOAD_FAILED,
// NEVER 404. We mutate the shared loader map (same module instance index.js
// uses — imported WITHOUT a cache-buster) and restore it afterwards.
{
  const studioPages = await import('../worker/src/frontend/studioPages.js');
  const original = studioPages.STUDIO_LOADERS.story;
  studioPages.STUDIO_LOADERS.story = async () => { throw new Error('simulated module import failure'); };
  await check('GET /app/story (module load fails) → 500 STUDIO_PAGE_LOAD_FAILED', async () => {
    const r = await get('/app/story', await withToken());
    const body = await r.text();
    return { ok: r.status === 500 && body === 'STUDIO_PAGE_LOAD_FAILED', msg: `status=${r.status} body=${JSON.stringify(body)}` };
  });
  studioPages.STUDIO_LOADERS.story = original;
}
await check('GET /app/story after loader restore → 200 (no regression)', async () => {
  const r = await get('/app/story', await withToken());
  return { ok: r.status === 200, msg: `status=${r.status}` };
});

console.log('— Auth / user API —');
await check('GET /api/users/me → 200 user (token)', async () => {
  const r = await get('/api/users/me', await withToken());
  const j = await r.json();
  return { ok: r.status === 200 && j.user_id === 'user-1', msg: `status=${r.status} ${JSON.stringify(j).slice(0, 120)}` };
});
await check('GET /api/users/me → 401 (no token)', async () => {
  const r = await get('/api/users/me');
  return { ok: r.status === 401, msg: `status=${r.status}` };
});

console.log('— Admin page —');
await check('GET /admin → 200 admin page', async () => {
  const r = await get('/admin', await withToken());
  return { ok: r.status === 200 && (await r.text()).includes('Admin'), msg: `status=${r.status}` };
});

console.log('— Backward compatibility: old import paths still export HTML —');
for (const [slug, exp] of [['story', 'STORY_HTML'], ['content', 'CONTENT_HTML'], ['short', 'SHORT_HTML'], ['image', 'IMAGE_HTML'], ['voice', 'VOICE_HTML'], ['shop', 'SHOP_HTML']]) {
  await check(`frontend/${slug}.js exports ${exp} (shim)`, async () => {
    const mod = await import(`../worker/src/frontend/${slug}.js?c=${Date.now()}`);
    const pageMod = await import(`../worker/src/frontend/studios/${slug}/page.js?c=${Date.now()}`);
    const okType = typeof mod[exp] === 'string';
    return { ok: okType && mod[exp] === pageMod[exp], msg: `type=${typeof mod[exp]}` };
  });
}

console.log('\n=== RESULT: ' + passed + ' passed, ' + failed + ' failed ===');
if (failed > 0) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.msg));
  process.exit(1);
}
