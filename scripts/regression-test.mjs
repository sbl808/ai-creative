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
import { readFile } from 'node:fs/promises';
import { checkFeature } from '../worker/src/core/featureSettings.js';
import { listEnabledModels, resolveModel, getAiModelById, resolveAiModel } from '../worker/src/core/aiModels.js';
import { isStudioEnabled } from '../worker/src/core/studioSettings.js';
import { BRAIN_LAYER_ORDER, buildBrainPrompt } from '../worker/src/core/cmsBrain.js';
import { STUDIO_REGISTRY } from '../worker/src/config/studios.js';
import { FEATURE_REGISTRY } from '../worker/src/config/features.js';
import { validateContactUrl, normalizePlanInput } from '../worker/src/core/planCatalog.js';

const worker = (await import('../worker/src/index.js?r=' + Date.now())).default;

// ---------------------------------------------------------------- mock env
class MockD1 {
  constructor(rows = {}) {
    this.rows = { ...rows, users: rows.users || {} };
    this.apiTestLimits = new Map(); this.apiGenerationLimits = new Map();
    this.featureSettings = new Map(); this.studioSettings = new Map();
    this.planCatalog = new Map((rows.planCatalog || [
      { plan_key: 'FREE', name: 'Free', icon: 'sparkles', description: '', price_amount: null, price_currency: null, billing_period: '', features_json: '[]', enabled: 1, sort_order: 0 },
      { plan_key: 'PRO', name: 'Pro', icon: 'crown', description: '', price_amount: null, price_currency: null, billing_period: '', features_json: '[]', enabled: 1, sort_order: 1 },
    ]).map(row => [row.plan_key, { ...row }]));
    this.planContacts = new Map([['facebook_messenger_url', ''], ['telegram_url', '']]);
  }
  prepare(sql) {
    const self = this;
    return {
      bind(...args) { this._args = args; return this; },
      async first() {
        if (/SELECT COUNT\(\*\) AS count FROM users WHERE plan=\?/.test(sql)) {
          const plan = String(this._args[0]);
          return { count: Object.values(self.rows.users || {}).filter(row => String(row.plan || '') === plan).length };
        }
        if (sql.startsWith('SELECT plan, expiry FROM users WHERE id = ?')) {
          const id = this._args && this._args[0];
          return (self.rows.users || {})[id] || null;
        }
        if (sql.startsWith('SELECT enabled, access, limit_value FROM feature_settings WHERE feature_id=?')) {
          return self.featureSettings.get(String(this._args && this._args[0])) || null;
        }
        if (sql.startsWith('SELECT attempts FROM api_test_limits WHERE user_id = ? AND window_id = ?')) {
          return { attempts: self.apiTestLimits.get(String(this._args[0]) + ':' + this._args[1]) || 0 };
        }
        if (sql.startsWith('SELECT attempts FROM api_generation_limits WHERE user_id = ? AND window_id = ?')) {
          return { attempts: self.apiGenerationLimits.get(String(this._args[0]) + ':' + this._args[1]) || 0 };
        }
        return null;
      },
      async all() {
        if (/FROM plan_catalog/.test(sql)) {
          let items = [...self.planCatalog.values()];
          if (/WHERE enabled=1/.test(sql)) items = items.filter(row => Number(row.enabled) === 1);
          items.sort((a,b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.plan_key).localeCompare(String(b.plan_key)));
          return { results: items.map(row => ({ ...row })) };
        }
        if (/FROM plan_contact_settings/.test(sql)) return { results: [...self.planContacts.entries()].map(([setting_key,setting_value]) => ({ setting_key, setting_value })) };
        if (/FROM studio_settings/.test(sql)) return { results: [...self.studioSettings.entries()].map(([studio_id, enabled]) => ({ studio_id, enabled })) };
        if (/FROM feature_settings/.test(sql)) return { results: [...self.featureSettings.entries()].map(([feature_id, row]) => ({ feature_id, ...row })) };
        if (/FROM users/.test(sql)) return { results: Object.values(self.rows.users || {}) };
        if (/FROM projects/.test(sql)) return { results: [] };
        return { results: [] };
      },
      async run() {
        let changes = 0;
        if (/INSERT INTO plan_catalog/.test(sql)) {
          const [plan_key,name,icon,description,price_amount,price_currency,billing_period,features_json,enabled,sort_order] = this._args;
          if (self.planCatalog.has(String(plan_key))) throw new Error('UNIQUE constraint failed: plan_catalog.plan_key');
          self.planCatalog.set(String(plan_key), { plan_key,name,icon,description,price_amount,price_currency,billing_period,features_json,enabled,sort_order });
          changes = 1;
        }
        if (/UPDATE plan_catalog SET/.test(sql)) {
          const [name,icon,description,price_amount,price_currency,billing_period,features_json,enabled,sort_order,plan_key] = this._args;
          if (self.planCatalog.has(String(plan_key))) {
            self.planCatalog.set(String(plan_key), { ...self.planCatalog.get(String(plan_key)), name,icon,description,price_amount,price_currency,billing_period,features_json,enabled,sort_order });
            changes = 1;
          }
        }
        if (/DELETE FROM plan_catalog WHERE plan_key=\?/.test(sql)) changes = self.planCatalog.delete(String(this._args[0])) ? 1 : 0;
        if (/INSERT INTO plan_contact_settings/.test(sql)) {
          self.planContacts.set(String(this._args[0]), String(this._args[1] || ''));
          changes = 1;
        }
        if (/INSERT OR IGNORE INTO studio_settings/.test(sql)) {
          const id = String(this._args[0]);
          if (!self.studioSettings.has(id)) { self.studioSettings.set(id, Number(this._args[1])); changes = 1; }
        }
        if (/INSERT OR IGNORE INTO feature_settings/.test(sql)) {
          const id = String(this._args[0]);
          if (!self.featureSettings.has(id)) { self.featureSettings.set(id, { enabled: 1, access: String(this._args[1]), limit_value: 0 }); changes = 1; }
        }
        if (/INSERT INTO api_test_limits/.test(sql)) {
          const key = String(this._args[0]) + ':' + this._args[1];
          self.apiTestLimits.set(key, (self.apiTestLimits.get(key) || 0) + 1);
        }
        if (/INSERT INTO api_generation_limits/.test(sql)) {
          const key = String(this._args[0]) + ':' + this._args[1];
          self.apiGenerationLimits.set(key, (self.apiGenerationLimits.get(key) || 0) + 1);
        }
        return { success: true, meta: { changes } };
      },
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
console.log('— AI model task compatibility —');
await check('Model dropdown filters by Studio task and category', async () => {
  const story = await listEnabledModels({}, 'text', 'FREE', 'story.text');
  const voice = await listEnabledModels({}, 'voice', 'FREE', 'voice.voice');
  const incompatible = await listEnabledModels({}, 'voice', 'FREE', 'story.text');
  return {
    ok: story.length > 0 && story.every(m => m.category === 'text' && m.supported_tasks.includes('story.text')) &&
      voice.length > 0 && voice.every(m => m.supported_tasks.includes('voice.voice')) && incompatible.length === 0,
    msg: `story=${story.length} voice=${voice.length} incompatible=${incompatible.length}`,
  };
});
await check('Resolver rejects task-incompatible user choices and defaults', async () => {
  const valid = await resolveModel({}, 'text', 'FREE', 'gemini-3.5-flash-lite', 'story.text');
  const invalid = await resolveModel({}, 'voice', 'FREE', 'gemini-2.5-flash-preview-tts', 'story.text');
  return { ok: valid === 'gemini-3.5-flash-lite' && invalid === '', msg: `valid=${valid} invalid=${invalid}` };
});
await check('AI model metadata resolver exposes provider and enforces active task support', async () => {
  const model = await getAiModelById({}, 'gemini-3.5-flash-lite');
  const compatible = await resolveAiModel({}, 'gemini-3.5-flash-lite', 'story.text');
  const incompatible = await resolveAiModel({}, 'gemini-3.5-flash-lite', 'voice.voice');
  return {
    ok: model?.provider === 'gemini' && compatible?.id === model.id && incompatible === null,
    msg: 'provider=' + model?.provider + ' compatible=' + !!compatible + ' incompatible=' + !!incompatible,
  };
});


await check('AI model API applies Studio task filtering', async () => {
  const compatible = await get('/api/ai-models?category=text&task=story.text', await withToken());
  const incompatible = await get('/api/ai-models?category=voice&task=story.text', await withToken());
  const good = await compatible.json();
  const bad = await incompatible.json();
  return {
    ok: compatible.status === 200 && incompatible.status === 200 &&
      good.items.length > 0 && good.items.every(m => m.category === 'text') &&
      bad.items.length === 0,
    msg: `compatible=${good.items.length} incompatible=${bad.items.length}`,
  };
});

console.log('— Plan Catalog validation —');
await check('Plan Catalog keeps display data separate from permissions', async () => {
  const p = normalizePlanInput({ plan_key: 'PRO', name: 'PRO', features: ['More tools'] }, null);
  return { ok: p.plan_key === 'PRO' && p.enabled === 1 && JSON.parse(p.features_json)[0] === 'More tools', msg: JSON.stringify(p) };
});
await check('Plan Catalog rejects malformed feature JSON', async () => {
  try { normalizePlanInput({ plan_key: 'TEAM', name: 'Team', features: '{bad' }, null); return { ok: false, msg: 'accepted malformed JSON' }; }
  catch (e) { return { ok: e.message === 'invalid_features', msg: e.message }; }
});
await check('Contact URL requires HTTPS', async () => {
  try { validateContactUrl('telegram_url', 'http://t.me/support'); return { ok: false, msg: 'accepted HTTP' }; }
  catch (e) { return { ok: e.message === 'invalid_contact_url', msg: e.message }; }
});
await check('Contact URL rejects lookalike Telegram host', async () => {
  try { validateContactUrl('telegram_url', 'https://t.me.example.test/support'); return { ok: false, msg: 'accepted lookalike host' }; }
  catch (e) { return { ok: e.message === 'invalid_contact_url', msg: e.message }; }
});
await check('Contact URL accepts valid Messenger and Telegram destinations', async () => {
  const fb = validateContactUrl('facebook_messenger_url', 'https://m.me/aics_support');
  const tg = validateContactUrl('telegram_url', 'https://t.me/aics_support');
  return { ok: fb === 'https://m.me/aics_support' && tg === 'https://t.me/aics_support', msg: fb + ' / ' + tg };
});

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

console.log('— Plan Catalog public API —');
await check('GET /api/plans → public read-only catalog without auth', async () => {
  const r = await get('/api/plans');
  const d = await r.json();
  return { ok: r.status === 200 && d.ok === true && Array.isArray(d.items) && !!d.contacts, msg: 'status=' + r.status + ' ' + JSON.stringify(d).slice(0, 180) };
});
await check('GET /api/admin/plans remains admin-authenticated', async () => {
  const r = await get('/api/admin/plans');
  return { ok: r.status === 401, msg: 'status=' + r.status };
});

console.log('— Plan Catalog admin CRUD and contact security —');
await check('Unauthenticated admin plan create/update/delete and contact update are rejected', async () => {
  const cases = [
    ['/api/admin/plans','POST',{plan_key:'TEAM',name:'Team'}],
    ['/api/admin/plans/PRO','PUT',{name:'Changed'}],
    ['/api/admin/plans/TEAM','DELETE',undefined],
    ['/api/admin/plan-contacts','PUT',{facebook_messenger_url:'https://m.me/support',telegram_url:''}],
  ];
  const statuses = [];
  for (const [path,method,body] of cases) {
    const response = await worker.fetch(new Request('https://test.local' + path, {
      method,
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    }), env, {});
    statuses.push(response.status);
  }
  return { ok: statuses.every(status => status === 401), msg: 'statuses=' + statuses.join(',') };
});
await check('Admin can create, update, list and archive a display-only plan', async () => {
  const db = new MockD1({});
  const testEnv = { ...env, DB: db };
  const headers = await withToken();
  const create = await worker.fetch(new Request('https://test.local/api/admin/plans', { method:'POST', headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify({plan_key:'TEAM',name:'Team',icon:'users',price_amount:12,price_currency:'USD',features:['Team tools']}) }), testEnv, {});
  const created = await create.json();
  const update = await worker.fetch(new Request('https://test.local/api/admin/plans/TEAM', { method:'PUT', headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify({name:'Team Plus',icon:'users',enabled:0,features:['Team tools','Priority support']}) }), testEnv, {});
  const updated = await update.json();
  const listed = await worker.fetch(new Request('https://test.local/api/admin/plans', { headers }), testEnv, {});
  const listBody = await listed.json();
  const row = db.planCatalog.get('TEAM');
  return { ok:create.status===200 && created.ok && update.status===200 && updated.ok && listed.status===200 && listBody.items.some(x=>x.plan_key==='TEAM' && x.enabled===false) && row.name==='Team Plus' && JSON.parse(row.features_json).length===2, msg:`create=${create.status} update=${update.status} list=${listed.status} row=${row && row.name} enabled=${row && row.enabled}` };
});
await check('Admin cannot delete FREE/PRO or a plan assigned to a user', async () => {
  const db = new MockD1({ users: { 'u1': { plan:'TEAM', expiry:null } } });
  db.planCatalog.set('TEAM',{plan_key:'TEAM',name:'Team',icon:'users',description:'',price_amount:null,price_currency:null,billing_period:'',features_json:'[]',enabled:1,sort_order:2});
  const testEnv = { ...env, DB: db };
  const headers = await withToken();
  const delFree = await worker.fetch(new Request('https://test.local/api/admin/plans/FREE',{method:'DELETE',headers}),testEnv,{});
  const delPro = await worker.fetch(new Request('https://test.local/api/admin/plans/PRO',{method:'DELETE',headers}),testEnv,{});
  const delAssigned = await worker.fetch(new Request('https://test.local/api/admin/plans/TEAM',{method:'DELETE',headers}),testEnv,{});
  return { ok:delFree.status===409 && delPro.status===409 && delAssigned.status===409 && db.planCatalog.has('FREE') && db.planCatalog.has('PRO') && db.planCatalog.has('TEAM'), msg:`FREE=${delFree.status} PRO=${delPro.status} assigned=${delAssigned.status}` };
});
await check('Admin contact update accepts allowed HTTPS destinations and rejects invalid hosts', async () => {
  const db = new MockD1({});
  const testEnv = { ...env, DB: db };
  const headers = await withToken();
  const good = await worker.fetch(new Request('https://test.local/api/admin/plan-contacts',{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({facebook_messenger_url:'https://m.me/aics_support',telegram_url:'https://t.me/aics_support'})}),testEnv,{});
  const bad = await worker.fetch(new Request('https://test.local/api/admin/plan-contacts',{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({facebook_messenger_url:'https://evil.example/aics',telegram_url:'https://t.me/aics_support'})}),testEnv,{});
  const got = await worker.fetch(new Request('https://test.local/api/admin/plan-contacts',{headers}),testEnv,{});
  const contacts = await got.json();
  return { ok:good.status===200 && bad.status===400 && got.status===200 && contacts.contacts.facebook_messenger_url==='https://m.me/aics_support' && contacts.contacts.telegram_url==='https://t.me/aics_support', msg:`good=${good.status} bad=${bad.status} read=${got.status} contacts=${JSON.stringify(contacts.contacts)}` };
});
await check('Public plan catalog excludes archived plans and exposes only validated contact URLs', async () => {
  const db = new MockD1({});
  db.planCatalog.set('HIDDEN',{plan_key:'HIDDEN',name:'Hidden',icon:'eye-off',description:'',price_amount:null,price_currency:null,billing_period:'',features_json:'[]',enabled:0,sort_order:3});
  db.planContacts.set('facebook_messenger_url','https://m.me/aics_support');
  db.planContacts.set('telegram_url','javascript:alert(1)');
  const r = await worker.fetch(new Request('https://test.local/api/plans'),{...env,DB:db},{});
  const body = await r.json();
  return { ok:r.status===200 && body.ok && body.items.every(item=>item.plan_key!=='HIDDEN') && body.contacts.facebook_messenger_url==='https://m.me/aics_support' && body.contacts.telegram_url==='', msg:`status=${r.status} plans=${body.items.map(x=>x.plan_key).join(',')} contacts=${JSON.stringify(body.contacts)}` };
});
await check('Plan Catalog metadata does not grant PRO-only Feature Gate access to FREE users', async () => {
  const db = new MockD1({ users: { 'user-1': { plan:'FREE', expiry:null } } });
  const result = await checkFeature({DB:db},'story.video_image','FREE','1');
  return { ok:result.ok===false && result.reason==='pro_only', msg:JSON.stringify(result) };
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

console.log('— BYOK API security contracts —');
const send = (path, method, headers = {}, body) => worker.fetch(new Request('https://test.local' + path, {
  method,
  headers: { ...headers, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
}), env, {});
await check('POST /api/user/apikey → 401 without token', async () => {
  const r = await send('/api/user/apikey', 'POST', {}, { key: 'test-key' });
  return { ok: r.status === 401, msg: `status=${r.status}` };
});
await check('GET /api/user/apikey/status → 401 without token', async () => {
  const r = await send('/api/user/apikey/status', 'GET');
  return { ok: r.status === 401, msg: `status=${r.status}` };
});
await check('DELETE /api/user/apikey → 401 without token', async () => {
  const r = await send('/api/user/apikey', 'DELETE');
  return { ok: r.status === 401, msg: `status=${r.status}` };
});
await check('POST /api/ai/test → 401 without token', async () => {
  const r = await send('/api/ai/test', 'POST', {}, { prompt: 'Reply OK' });
  return { ok: r.status === 401, msg: `status=${r.status}` };
});
await check('POST /api/user/apikey → 400 for blank key (authenticated)', async () => {
  const r = await send('/api/user/apikey', 'POST', await withToken(), { key: '   ' });
  const body = await r.json();
  return { ok: r.status === 400 && body.error === 'missing_key', msg: `status=${r.status} error=${body.error}` };
});
await check('POST /api/user/apikey → fails closed if encryption secret is missing', async () => {
  // Make this contract explicit instead of relying on the shared test env
  // continuing to omit KEY_ENCRYPTION_SECRET in future test setup changes.
  const headers = await withToken();
  const missingSecretEnv = { ...env, KEY_ENCRYPTION_SECRET: '' };
  const r = await worker.fetch(new Request('https://test.local/api/user/apikey', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'test-key' }),
  }), missingSecretEnv, {});
  const body = await r.json();
  return { ok: r.status === 500 && body.error === 'db_error', msg: `status=${r.status} error=${body.error}` };
});

console.log('— API connection-test rate limit —');
await check('POST /api/ai/test → 503 when rate-limit DB is unavailable', async () => {
  const headers = await withToken();
  const noDbEnv = { ...env, DB: null };
  const r = await worker.fetch(new Request('https://test.local/api/ai/test', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}',
  }), noDbEnv, {});
  const body = await r.json();
  return { ok: r.status === 503 && body.error === 'rate_limit_unavailable', msg: `status=${r.status} error=${body.error}` };
});
await check('POST /api/ai/test → allows five attempts, blocks sixth in same window', async () => {
  const rateEnv = { ...env, DB: new MockD1({}) };
  const headers = await withToken();
  const statuses = [];
  // Invalid JSON intentionally stops after the rate-limit check, so this test
  // never calls Gemini or makes an external network request.
  for (let i = 0; i < 6; i++) {
    const r = await worker.fetch(new Request('https://test.local/api/ai/test', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{',
    }), rateEnv, {});
    statuses.push(r.status);
  }
  return { ok: statuses.slice(0, 5).every(status => status === 400) && statuses[5] === 429,
    msg: `statuses=${statuses.join(',')}` };
});

console.log('— STEP 10: shared AI generation rate-limit runtime tests —');
await check('Six Studios share one 30-request bucket; request 31 is blocked', async () => {
  const rateEnv = { ...env, DB: new MockD1({}) };
  const headers = await withToken();
  const paths = [
    '/api/studio/story/generate',
    '/api/studio/content/generate',
    '/api/studio/short/video',
    '/api/studio/image/prompt',
    '/api/studio/voice/tts',
    '/api/studio/shop/content/generate',
  ];
  const statuses = [];
  // Empty but valid JSON reaches each route's input validation after rate limiting.
  // No Gemini/provider call can occur because every route returns a missing-input error.
  for (let i = 0; i < 30; i++) {
    const path = paths[i % paths.length];
    const r = await worker.fetch(new Request('https://test.local' + path, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}',
    }), rateEnv, {});
    statuses.push(r.status);
  }
  const blocked = await worker.fetch(new Request('https://test.local/api/studio/voice/tts', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}',
  }), rateEnv, {});
  const blockedBody = await blocked.json();
  return {
    ok: statuses.every(status => status === 400) &&
      blocked.status === 429 &&
      blockedBody.error === 'rate_limited' &&
      Number(blocked.headers.get('Retry-After')) > 0,
    msg: `first30=${[...new Set(statuses)].join(',')} blocked=${blocked.status} error=${blockedBody.error} retry=${blocked.headers.get('Retry-After')}`,
  };
});
await check('shared generation limit is isolated per authenticated user', async () => {
  const rateEnv = { ...env, DB: new MockD1({}) };
  const userOne = await signToken(env, { sub: 'rate-user-one', email: 'one@example.test' });
  const userTwo = await signToken(env, { sub: 'rate-user-two', email: 'two@example.test' });
  for (let i = 0; i < 30; i++) {
    await worker.fetch(new Request('https://test.local/api/studio/story/generate', {
      method: 'POST', headers: { Authorization: 'Bearer ' + userOne, 'Content-Type': 'application/json' }, body: '{}',
    }), rateEnv, {});
  }
  const r = await worker.fetch(new Request('https://test.local/api/studio/image/prompt', {
    method: 'POST', headers: { Authorization: 'Bearer ' + userTwo, 'Content-Type': 'application/json' }, body: '{}',
  }), rateEnv, {});
  return { ok: r.status === 400, msg: `second user status=${r.status} (expected route validation 400)` };
});
await check('shared generation limit fails closed when D1 is unavailable', async () => {
  const headers = await withToken();
  const noDbEnv = { ...env, DB: null };
  const r = await worker.fetch(new Request('https://test.local/api/studio/story/generate', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}',
  }), noDbEnv, {});
  const body = await r.json();
  return { ok: r.status === 503 && body.error === 'rate_limit_unavailable', msg: `status=${r.status} error=${body.error}` };
});
await check('shared generation limit fails closed when D1 query throws', async () => {
  const headers = await withToken();
  const brokenDb = { prepare() { throw new Error('simulated D1 outage'); } };
  const r = await worker.fetch(new Request('https://test.local/api/studio/story/generate', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}',
  }), { ...env, DB: brokenDb }, {});
  const body = await r.json();
  return { ok: r.status === 503 && body.error === 'rate_limit_unavailable', msg: `status=${r.status} error=${body.error}` };
});

console.log('— Feature gate regression —');
async function makeFullyInitializedSettingsDb() {
  const db = new MockD1({});
  for (const studioId of Object.keys(STUDIO_REGISTRY)) db.studioSettings.set(studioId, 1);
  for (const [featureId, def] of Object.entries(FEATURE_REGISTRY)) {
    db.featureSettings.set(featureId, { enabled: 1, access: def.access, limit_value: 0 });
  }
  return db;
}
async function requestWithMockedProvider(envForRequest, path, body) {
  const headers = await withToken();
  const originalFetch = globalThis.fetch;
  // If a missing gate lets the request reach a provider, return a local mock response.
  // This prevents all external network calls during this regression test.
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'mock_provider_block' }), {
    status: 503, headers: { 'Content-Type': 'application/json' },
  });
  try {
    return await worker.fetch(new Request('https://test.local' + path, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }), envForRequest, {});
  } finally {
    globalThis.fetch = originalFetch;
  }
}
await check('FREE user is blocked from PRO-only Story Video Image before AI call', async () => {
  env.DB.rows.users['user-1'] = { plan: 'FREE', expiry: null };
  env.DB.featureSettings.delete('story.video_image');
  const r = await send('/api/studio/story/video-image', 'POST', await withToken(), { prompt: 'test prompt' });
  const body = await r.json();
  return { ok: r.status === 403 && body.error === 'pro_only', msg: `status=${r.status} error=${body.error}` };
});
await check('Expired PRO account is treated as FREE for PRO-only Story Video Image', async () => {
  env.DB.rows.users['user-1'] = { plan: 'PRO', expiry: '2000-01-01T00:00:00.000Z' };
  env.DB.featureSettings.delete('story.video_image');
  const r = await send('/api/studio/story/video-image', 'POST', await withToken(), { prompt: 'test prompt' });
  const body = await r.json();
  env.DB.rows.users['user-1'] = { plan: 'FREE', expiry: null };
  return { ok: r.status === 403 && body.error === 'pro_only', msg: `status=${r.status} error=${body.error}` };
});
await check('Admin-disabled Story Generate feature returns 403 before AI call', async () => {
  const db = await makeFullyInitializedSettingsDb();
  db.rows.users['user-1'] = { plan: 'FREE', expiry: null };
  db.featureSettings.set('story.generate', { enabled: 0, access: 'FREE', limit_value: 0 });
  const r = await requestWithMockedProvider({ ...env, DB: db }, '/api/studio/story/generate', { idea: 'test idea', type: '1' });
  const body = await r.json();
  return { ok: r.status === 403 && body.error === 'feature_disabled', msg: `status=${r.status} error=${body.error}` };
});
await check('Generic Generate honors Admin-disabled content.generate when all settings rows exist', async () => {
  const db = await makeFullyInitializedSettingsDb();
  db.rows.users['user-1'] = { plan: 'FREE', expiry: null };
  db.featureSettings.set('content.generate', { enabled: 0, access: 'FREE', limit_value: 0 });
  const r = await requestWithMockedProvider({ ...env, DB: db }, '/api/studio/generate', {
    studio: 'CONTENT', type: '1', idea: 'test idea', apiKey: 'mock-key',
  });
  const body = await r.json();
  return { ok: r.status === 403 && body.error === 'feature_disabled', msg: `status=${r.status} error=${body.error}` };
});
await check('Generic Generate honors Admin-disabled story.generate when all settings rows exist', async () => {
  const db = await makeFullyInitializedSettingsDb();
  db.rows.users['user-1'] = { plan: 'FREE', expiry: null };
  db.featureSettings.set('story.generate', { enabled: 0, access: 'FREE', limit_value: 0 });
  const r = await requestWithMockedProvider({ ...env, DB: db }, '/api/studio/generate', {
    studio: 'STORY', type: '1', idea: 'test idea', apiKey: 'mock-key',
  });
  const body = await r.json();
  return { ok: r.status === 403 && body.error === 'feature_disabled', msg: `status=${r.status} error=${body.error}` };
});
await check('Admin-disabled Content Generate feature returns 403 before AI call', async () => {
  env.DB.rows.users['user-1'] = { plan: 'FREE', expiry: null };
  env.DB.featureSettings.set('content.generate', { enabled: 0, access: 'FREE', limit_value: 0 });
  const r = await send('/api/studio/content/generate', 'POST', await withToken(), { idea: 'test idea', type: '1' });
  const body = await r.json();
  env.DB.featureSettings.delete('content.generate');
  return { ok: r.status === 403 && body.error === 'feature_disabled', msg: `status=${r.status} error=${body.error}` };
});
await check('FREE user cannot use Type 2 on a FREE-registry Content Generate feature', async () => {
  env.DB.rows.users['user-1'] = { plan: 'FREE', expiry: null };
  env.DB.featureSettings.delete('content.generate');
  const r = await send('/api/studio/content/generate', 'POST', await withToken(), { idea: 'test idea', type: '2' });
  const body = await r.json();
  return { ok: r.status === 403 && body.error === 'pro_only', msg: `status=${r.status} error=${body.error}` };
});

console.log('— Admin settings initialization —');
await check('Settings initialization requires admin authorization', async () => {
  const r = await send('/api/admin/settings/initialize', 'POST', {}, {});
  return { ok: r.status === 401, msg: 'status=' + r.status };
});
await check('Initialization fills missing rows and preserves existing OFF overrides; repeat is idempotent', async () => {
  const db = new MockD1({});
  db.studioSettings.set('story', 0);
  db.featureSettings.set('content.generate', { enabled: 0, access: 'PRO', limit_value: 7 });
  const testEnv = { ...env, DB: db };
  const headers = await withToken();
  const first = await worker.fetch(new Request('https://test.local/api/admin/settings/initialize', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}',
  }), testEnv, {});
  const firstBody = await first.json();
  const second = await worker.fetch(new Request('https://test.local/api/admin/settings/initialize', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}',
  }), testEnv, {});
  const secondBody = await second.json();
  const expectedStudioAdds = Object.keys(STUDIO_REGISTRY).length - 1;
  const expectedFeatureAdds = Object.keys(FEATURE_REGISTRY).length - 1;
  const preserve = db.studioSettings.get('story') === 0 &&
    db.featureSettings.get('content.generate').enabled === 0 &&
    db.featureSettings.get('content.generate').access === 'PRO' &&
    db.featureSettings.get('content.generate').limit_value === 7;
  return {
    ok: first.status === 200 && firstBody.ok === true &&
      firstBody.studiosAdded === expectedStudioAdds &&
      firstBody.featuresAdded === expectedFeatureAdds &&
      second.status === 200 && secondBody.studiosAdded === 0 && secondBody.featuresAdded === 0 &&
      db.studioSettings.size === Object.keys(STUDIO_REGISTRY).length &&
      db.featureSettings.size === Object.keys(FEATURE_REGISTRY).length && preserve,
    msg: 'first=' + JSON.stringify(firstBody) + ' second=' + JSON.stringify(secondBody) + ' preserve=' + preserve,
  };
});
await check('Non-admin cannot initialize settings', async () => {
  const token = await signToken(env, { sub: 'user-2', email: 'not-admin@example.test' });
  const r = await worker.fetch(new Request('https://test.local/api/admin/settings/initialize', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}',
  }), { ...env, DB: new MockD1({}) }, {});
  return { ok: r.status === 403, msg: 'status=' + r.status };
});

console.log('— Studio gate missing-row policy —');
await check('Fresh empty Studio settings table uses registry defaults', async () => {
  const enabled = await isStudioEnabled({ DB: new MockD1({}) }, 'story');
  return { ok: enabled === true, msg: 'enabled=' + enabled };
});
await check('Missing Studio row fails closed after settings have been persisted', async () => {
  const db = new MockD1({});
  db.studioSettings.set('content', 1);
  const enabled = await isStudioEnabled({ DB: db }, 'story');
  return { ok: enabled === false, msg: 'enabled=' + enabled };
});

console.log('— Studio gate database failure safety —');
await check('Studio Gate denies access when the settings database is missing', async () => {
  const enabled = await isStudioEnabled({}, 'story');
  return { ok: enabled === false, msg: 'enabled=' + enabled };
});
await check('Studio Gate denies access when the settings database query throws', async () => {
  const brokenDb = { prepare() { throw new Error('simulated D1 outage'); } };
  const enabled = await isStudioEnabled({ DB: brokenDb }, 'story');
  return { ok: enabled === false, msg: 'enabled=' + enabled };
});

console.log('— AI Brain canonical 12-layer order —');
await check('Brain prompt follows the canonical 12-layer order regardless of object insertion order', async () => {
  const config = {};
  [...BRAIN_LAYER_ORDER].reverse().forEach((layer) => { config[layer] = 'content for ' + layer; });
  const prompt = buildBrainPrompt(config);
  const positions = BRAIN_LAYER_ORDER.map((layer) => prompt.indexOf(layer + ':'));
  return {
    ok: positions.every((pos, i) => pos >= 0 && (i === 0 || pos > positions[i - 1])),
    msg: 'layers=' + positions.join(','),
  };
});
await check('Brain prompt preserves legacy CMS key ordering when no canonical layer IDs exist', async () => {
  const prompt = buildBrainPrompt({ final_output: 'out', prompt: 'prompt', role: 'role', knowledge: 'knowledge' });
  const positions = ['ROLE:', 'KNOWLEDGE:', 'PROMPT:', 'FINAL_OUTPUT:'].map((label) => prompt.indexOf(label));
  return {
    ok: positions.every((pos) => pos >= 0) && positions.every((pos, i) => i === 0 || pos > positions[i - 1]),
    msg: 'legacy=' + positions.join(','),
  };
});

await check('Brain prompt preserves legacy keys alongside canonical 12-layer keys', async () => {
  const prompt = buildBrainPrompt({
    '11_POST_NOTE': 'post-note content',
    '00_GATEKEEPER': 'gate content',
    role: 'legacy role content',
    prompt: 'legacy prompt content',
  });
  const canonicalPos = prompt.indexOf('00_GATEKEEPER:');
  const legacyRolePos = prompt.indexOf('ROLE:');
  const legacyPromptPos = prompt.indexOf('PROMPT:');
  const postNotePos = prompt.indexOf('11_POST_NOTE:');
  return {
    ok: canonicalPos >= 0 && canonicalPos < postNotePos &&
      legacyRolePos > postNotePos && legacyPromptPos > legacyRolePos &&
      prompt.includes('legacy role content') && prompt.includes('legacy prompt content'),
    msg: `canonical=${canonicalPos},post=${postNotePos},role=${legacyRolePos},prompt=${legacyPromptPos}`,
  };
});

await check('Generic generation endpoint blocks a disabled Studio before Feature Gate or AI call', async () => {
  const headers = await withToken();
  const testEnv = { ...env, DB: new MockD1({}) };
  testEnv.DB.studioSettings.set('story', 0);
  const r = await worker.fetch(new Request('https://test.local/api/studio/generate', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ studio: 'STORY', type: '1', idea: 'test idea' }),
  }), testEnv, {});
  const body = await r.json();
  return { ok: r.status === 403 && body.error === 'studio_disabled', msg: `status=${r.status} error=${body.error}` };
});

console.log('— Feature gate missing-row policy —');
await check('Fresh empty Feature settings table uses registry defaults', async () => {
  const result = await checkFeature({ DB: new MockD1({}) }, 'content.generate', 'FREE', '1');
  return { ok: result.ok === true, msg: JSON.stringify(result) };
});
await check('Missing Feature row fails closed after settings have been persisted', async () => {
  const db = new MockD1({});
  db.featureSettings.set('content.revise', { enabled: 1, access: 'FREE', limit_value: 0 });
  const result = await checkFeature({ DB: db }, 'content.generate', 'FREE', '1');
  return { ok: !result.ok && result.reason === 'disabled', msg: JSON.stringify(result) };
});

console.log('— Feature gate database failure safety —');
await check('Feature Gate denies access when the settings database is missing', async () => {
  const result = await checkFeature({}, 'content.generate', 'FREE', '1');
  return { ok: !result.ok && result.reason === 'settings_unavailable', msg: JSON.stringify(result) };
});
await check('Feature Gate denies access when the settings database query throws', async () => {
  const brokenDb = { prepare() { throw new Error('simulated D1 outage'); } };
  const result = await checkFeature({ DB: brokenDb }, 'content.generate', 'FREE', '1');
  return { ok: !result.ok && result.reason === 'settings_unavailable', msg: JSON.stringify(result) };
});

console.log('— Stage 13: feature-gate coverage for image and SRT routes —');
const stage13Cases = [
  { path: '/api/studio/content/video-image', feature: 'content.video_image', body: { prompt: 'test prompt', type: '1' } },
  { path: '/api/studio/content/srt', feature: 'content.srt', body: { audioBase64: 'YWJj' } },
  { path: '/api/studio/content/translate-srt', feature: 'content.translate_srt', body: { srtText: '1\\n00:00:00,000 --> 00:00:01,000\\nHello' } },
  { path: '/api/studio/short/video-image', feature: 'short.video_image', body: { prompt: 'test prompt', type: '1' } },
  { path: '/api/studio/image/generate', feature: 'image.generate', body: { prompt: 'test prompt', type: '1' } },
  { path: '/api/studio/shop/video-image', feature: 'shop.video_image', body: { prompt: 'test prompt', type: '1' } },
];
await check('all six Stage 13 routes reject requests without a valid token', async () => {
  const statuses = [];
  for (const item of stage13Cases) {
    const r = await send(item.path, 'POST', {}, item.body);
    statuses.push(r.status);
  }
  return { ok: statuses.every(status => status === 401), msg: `statuses=${statuses.join(',')}` };
});
await check('Admin-disabled Stage 13 features are blocked before any AI/provider call', async () => {
  env.DB.rows.users['user-1'] = { plan: 'FREE', expiry: null };
  const failures = [];
  for (const item of stage13Cases) {
    env.DB.featureSettings.set(item.feature, { enabled: 0, access: 'FREE', limit_value: 0 });
    const r = await send(item.path, 'POST', await withToken(), item.body);
    const body = await r.json();
    env.DB.featureSettings.delete(item.feature);
    if (r.status !== 403 || body.error !== 'feature_disabled') {
      failures.push(item.path + ': status=' + r.status + ' error=' + body.error);
    }
  }
  return { ok: failures.length === 0, msg: failures.join('; ') || 'all six returned 403 feature_disabled' };
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


console.log('— AI Studio task forwarding contracts —');
const studioTaskContracts={story:['story.text','story.image'],content:['content.text','content.voice','content.image','content.transcribe'],short:['short.text','short.image'],image:['image.text','image.image'],voice:['voice.voice','voice.transcribe'],shop:['shop.text','shop.image']};
for(const [studio,tasks] of Object.entries(studioTaskContracts)){
 await check(studio+' forwards task IDs to the AI Service',async()=>{
  const source=await readFile(new URL('../worker/src/studios/'+studio+'.js',import.meta.url),'utf8');
  const missing=tasks.filter(task=>!source.includes("task: '"+task+"'"));
  return {ok:missing.length===0,msg:missing.length?'missing='+missing.join(','):'all task IDs forwarded'};
 });
}

console.log('\n=== RESULT: ' + passed + ' passed, ' + failed + ' failed ===');
if (failed > 0) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.msg));
  process.exit(1);
}
