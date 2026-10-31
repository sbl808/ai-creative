// Phase 5 — AI Creative Studio Admin Panel (Dashboard / CMS / Users / Studios / Features / Usage / Logs)
// Phase 4 — Studio Control (ON/OFF) ထည့်သည် (Rule 14 — Admin က Code မပြင်ဘဲ ထိန်းချုပ်နိုင်)
// Phase 5 — Free/Pro Feature ထိန်းချုပ် + Usage Statistics + Admin Logs (Rules 12/15/16/18)
// Served at /admin. Admin-only — Server-side တွင် အမြဲ စစ်ဆေးသည် (Rule 13).

import { setStudioEnabled, getStudioSettings } from './core/studioSettings.js';
import { STUDIO_REGISTRY } from './config/studios.js';
import { FEATURE_REGISTRY } from './config/features.js';
import { getFeatureSettings, setFeatureSetting } from './core/featureSettings.js';
import { getAiModels, setAiModel, deleteAiModel } from './core/aiModels.js';
import { logAdminAction, listAdminLogs } from './core/adminLogs.js';
import { listPlanCatalog, savePlanCatalogItem, deletePlanCatalogItem, getPlanContactSettings, updatePlanContactSettings } from './core/planCatalog.js';

export async function adminApi(request, path, env, verifyToken) {
  const isCms = (path === '/api/cms' || path.indexOf('/api/cms/') === 0);
  const isUsers = (path === '/api/admin/users' || path.indexOf('/api/admin/users/') === 0);
  const isStudios = (path === '/api/admin/studios' || path.indexOf('/api/admin/studios/') === 0);
  const isSettingsInit = (path === '/api/admin/settings/initialize');
  const isFeatures = (path === '/api/admin/features' || path.indexOf('/api/admin/features/') === 0);
  const isModels = (path === '/api/admin/models' || path.indexOf('/api/admin/models/') === 0);
  const isDashboard = (path === '/api/admin/dashboard');
  const isUsage = (path === '/api/admin/usage');
  const isLogs = (path === '/api/admin/logs');
  const isBrain = (path === '/api/brain' || path.indexOf('/api/brain/') === 0);
  const isPlans = (path === '/api/admin/plans' || path.indexOf('/api/admin/plans/') === 0 || path === '/api/admin/plan-contacts');
  if (!isCms && !isUsers && !isStudios && !isSettingsInit && !isFeatures && !isModels && !isDashboard && !isUsage && !isLogs && !isBrain && !isPlans) return null;

  const method = request.method;
  const authHeader = request.headers.get('Authorization') || '';
  let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  // Phase 11 — Admin Panel Page မှ Fetch များတွင် Cookie Session ကိုပါ လက်ခံသည် (Header ဦးစားပေး)
  if (!token) {
    const c = request.headers.get('Cookie') || '';
    const m = c.match(/(?:^|;\s*)aics_token=([^;]+)/);
    if (m) token = decodeURIComponent(m[1]);
  }
  if (!token) return json({ error: 'unauthorized', detail: 'login required' }, 401);
  let user = null;
  try {
    user = await verifyToken(env, token);
  } catch (_) {
    return json({ error: 'unauthorized', detail: 'login required' }, 401);
  }
  if (!user || !user.email) return json({ error: 'unauthorized', detail: 'login required' }, 401);
  const adminEmail = String(env.ADMIN_EMAIL || '').trim();
  if (!adminEmail || String(user.email).trim().toLowerCase() !== adminEmail.toLowerCase()) {
    return json({ error: 'forbidden', detail: 'admin only' }, 403);
  }

  // ===== Plan Catalog: display metadata only; existing Feature Gate remains authoritative =====
  if (path === '/api/admin/plans' && method === 'GET') {
    try { return json({ ok: true, items: await listPlanCatalog(env, true) }); }
    catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 503); }
  }
  if (path === '/api/admin/plans' && method === 'POST') {
    try {
      const item = await savePlanCatalogItem(env, await readBody(request));
      await logAdminAction(env, user.email, 'plan_create', item.plan_key);
      return json({ ok: true, item });
    } catch (e) {
      const msg = String(e && e.message || e);
      return json({ error: msg, detail: msg }, msg === 'db_unavailable' ? 503 : 400);
    }
  }
  if (path.indexOf('/api/admin/plans/') === 0) {
    const key = decodeURIComponent(path.slice('/api/admin/plans/'.length)).toUpperCase();
    if (method === 'PUT') {
      try {
        const item = await savePlanCatalogItem(env, await readBody(request), key);
        await logAdminAction(env, user.email, 'plan_update', key);
        return json({ ok: true, item });
      } catch (e) {
        const msg = String(e && e.message || e);
        return json({ error: msg, detail: msg }, msg === 'db_unavailable' ? 503 : (msg === 'plan_not_found' ? 404 : 400));
      }
    }
    if (method === 'DELETE') {
      try {
        await deletePlanCatalogItem(env, key);
        await logAdminAction(env, user.email, 'plan_delete', key);
        return json({ ok: true });
      } catch (e) {
        const msg = String(e && e.message || e);
        const status = msg === 'db_unavailable' ? 503 : (msg === 'plan_not_found' ? 404 : (msg === 'plan_in_use' || msg === 'core_plan_protected' ? 409 : 400));
        return json({ error: msg, detail: msg }, status);
      }
    }
  }
  if (path === '/api/admin/plan-contacts' && method === 'GET') {
    try { return json({ ok: true, contacts: await getPlanContactSettings(env) }); }
    catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 503); }
  }
  if (path === '/api/admin/plan-contacts' && method === 'PUT') {
    try {
      const contacts = await updatePlanContactSettings(env, await readBody(request));
      await logAdminAction(env, user.email, 'plan_contacts_update', 'Facebook Messenger / Telegram');
      return json({ ok: true, contacts });
    } catch (e) {
      const msg = String(e && e.message || e);
      return json({ error: msg, detail: msg }, msg === 'db_unavailable' ? 503 : 400);
    }
  }

  const COLS = ['studio','plan','type','core','memory','knowledge','workflow','template','prompt','quality_check','final_output'];

  if (path === '/api/cms' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM cms_prompts ORDER BY studio, plan, type').all();
    return json({ ok: true, items: results });
  }

  if (path === '/api/cms' && method === 'POST') {
    const body = await readBody(request);
    if (!body || !body.studio || !body.plan || !body.type) return json({ error: 'missing_fields', detail: 'studio, plan, type required' }, 400);
    const vals = COLS.map(c => (body[c] === undefined || body[c] === null) ? '' : String(body[c]));
    vals[0] = vals[0].toUpperCase();
    vals[1] = vals[1].toUpperCase();
    try {
      await env.DB.prepare('INSERT OR REPLACE INTO cms_prompts (studio,plan,type,core,memory,knowledge,workflow,template,prompt,quality_check,final_output,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime(\'now\'))').bind(...vals).run();
      await logAdminAction(env, user.email, 'cms_create', vals[0] + '/' + vals[1] + '/' + vals[2]);
      return json({ ok: true });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  if (path.indexOf('/api/cms/') === 0) {
    const id = decodeURIComponent(path.slice('/api/cms/'.length));
    if (method === 'PUT') {
      const body = await readBody(request);
      const sets = COLS.map(c => c + '=?').join(',');
      const vals = COLS.map(c => (body && body[c] !== undefined && body[c] !== null) ? String(body[c]) : '');
      vals[0] = vals[0].toUpperCase();
      vals[1] = vals[1].toUpperCase();
      try {
        await env.DB.prepare('UPDATE cms_prompts SET ' + sets + ', updated_at=datetime(\'now\') WHERE id=?').bind(...vals, id).run();
        await logAdminAction(env, user.email, 'cms_update', 'id=' + id + ' ' + vals[0] + '/' + vals[1] + '/' + vals[2]);
        return json({ ok: true });
      } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM cms_prompts WHERE id=?').bind(id).run();
      await logAdminAction(env, user.email, 'cms_delete', 'id=' + id);
      return json({ ok: true });
    }
  }

  // ===== Brain CMS (12-Layer — additive; cms_prompts ကို မထိ) =====
  if (path === '/api/brain' && method === 'GET') {
    try {
      const { results } = await env.DB.prepare('SELECT * FROM cms_brain ORDER BY scope, module, type, key').all();
      return json({ ok: true, items: results });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }
  if (path === '/api/brain' && method === 'POST') {
    const body = await readBody(request);
    if (!body || !body.scope || !body.module || !body.key) return json({ error: 'missing_fields', detail: 'scope, module, key required' }, 400);
    const scope = String(body.scope).toUpperCase();
    const module = String(body.module).toUpperCase();
    const type = String(body.type || 'BASE').toUpperCase();
    const plan = String(body.plan || 'FREE').toUpperCase();
    const key = String(body.key).trim();
    const val = (body.value === undefined || body.value === null) ? '' : String(body.value);
    const version = parseInt(body.version, 10) > 0 ? parseInt(body.version, 10) : 1;
    try {
      await env.DB.prepare(
        'INSERT INTO cms_brain (scope,module,type,plan,key,value,active,version,updated_at) VALUES (?,?,?,?,?,?,1,?,datetime(\'now\')) ' +
        'ON CONFLICT(scope,module,type,plan,key) DO UPDATE SET value=excluded.value, active=1, version=excluded.version, updated_at=excluded.updated_at'
      ).bind(scope, module, type, plan, key, val, version).run();
      await logAdminAction(env, user.email, 'brain_create', scope + '/' + module + '/' + type + '/' + key);
      return json({ ok: true });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }
  if (path.indexOf('/api/brain/') === 0) {
    const id = decodeURIComponent(path.slice('/api/brain/'.length));
    if (method === 'PUT') {
      const body = await readBody(request);
      if (!body || !body.scope || !body.module || !body.key) return json({ error: 'missing_fields', detail: 'scope, module, key required' }, 400);
      try {
        await env.DB.prepare(
          'UPDATE cms_brain SET scope=?, module=?, type=?, plan=?, key=?, value=?, version=?, updated_at=datetime(\'now\') WHERE id=?'
        ).bind(
          String(body.scope).toUpperCase(), String(body.module).toUpperCase(), String(body.type || 'BASE').toUpperCase(),
          String(body.plan || 'FREE').toUpperCase(), String(body.key).trim(),
          (body.value === undefined || body.value === null) ? '' : String(body.value),
          parseInt(body.version, 10) > 0 ? parseInt(body.version, 10) : 1,
          id
        ).run();
        await logAdminAction(env, user.email, 'brain_update', 'id=' + id);
        return json({ ok: true });
      } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM cms_brain WHERE id=?').bind(id).run();
      await logAdminAction(env, user.email, 'brain_delete', 'id=' + id);
      return json({ ok: true });
    }
  }

  if (path === '/api/admin/users' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT id, email, plan, expiry, created_at FROM users ORDER BY created_at DESC').all();
    return json({ ok: true, items: results });
  }

  if (path.indexOf('/api/admin/users/') === 0 && method === 'PUT') {
    const id = decodeURIComponent(path.slice('/api/admin/users/'.length));
    const body = await readBody(request);
    const plan = (body && body.plan === 'PRO') ? 'PRO' : 'FREE';
    const expiry = (body && body.expiry) ? String(body.expiry) : null;
    try {
      await env.DB.prepare('UPDATE users SET plan=?, expiry=?, updated_at=datetime(\'now\') WHERE id=?').bind(plan, expiry, id).run();
      await logAdminAction(env, user.email, 'user_plan', 'user_id=' + id + ' → ' + plan);
      return json({ ok: true });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  // ===== Explicit admin-only settings initialization; existing overrides are never overwritten =====
  if (path === '/api/admin/settings/initialize' && method === 'POST') {
    if (!env || !env.DB) return json({ error: 'db_unavailable' }, 503);
    try {
      let studiosAdded = 0;
      let featuresAdded = 0;
      for (const id of Object.keys(STUDIO_REGISTRY)) {
        const result = await env.DB.prepare(
          "INSERT OR IGNORE INTO studio_settings (studio_id, enabled, updated_at) VALUES (?, ?, datetime('now'))"
        ).bind(id, STUDIO_REGISTRY[id].enabled === false ? 0 : 1).run();
        studiosAdded += Number(result && result.meta && result.meta.changes || 0);
      }
      for (const id of Object.keys(FEATURE_REGISTRY)) {
        const def = FEATURE_REGISTRY[id];
        const result = await env.DB.prepare(
          "INSERT OR IGNORE INTO feature_settings (feature_id, enabled, access, limit_value, updated_at) VALUES (?, 1, ?, 0, datetime('now'))"
        ).bind(id, def.access).run();
        featuresAdded += Number(result && result.meta && result.meta.changes || 0);
      }
      await logAdminAction(env, user.email, 'settings_initialize', 'studios_added=' + studiosAdded + ', features_added=' + featuresAdded);
      return json({ ok: true, studiosAdded, featuresAdded });
    } catch (e) {
      return json({ error: 'initialization_failed', detail: String(e && e.message || e) }, 500);
    }
  }

  // ===== Studios Control (Phase 4 — Admin က Code မပြင်ဘဲ ON/OFF ပြုလုပ်နိုင်) =====
  if (path === '/api/admin/studios' && method === 'GET') {
    try {
      const settings = await getStudioSettings(env);
      const items = Object.keys(STUDIO_REGISTRY).map((id) => ({
        id,
        name: STUDIO_REGISTRY[id].name,
        nameMy: STUDIO_REGISTRY[id].nameMy,
        enabled: settings[id] !== false,
      }));
      return json({ ok: true, items });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  if (path.indexOf('/api/admin/studios/') === 0 && method === 'PUT') {
    const id = decodeURIComponent(path.slice('/api/admin/studios/'.length));
    const body = await readBody(request);
    try {
      const r = await setStudioEnabled(env, id, !!(body && body.enabled));
      await logAdminAction(env, user.email, 'studio_toggle', r.id + ' → ' + (r.enabled ? 'ON' : 'OFF'));
      return json({ ok: true, id: r.id, enabled: r.enabled });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  // ===== Phase 5 — Features (Free/Pro Config — Rule 15) =====
  if (path === '/api/admin/features' && method === 'GET') {
    try {
      const settings = await getFeatureSettings(env);
      const items = Object.keys(FEATURE_REGISTRY).map((id) => ({
        id,
        name: FEATURE_REGISTRY[id].name,
        nameMy: FEATURE_REGISTRY[id].nameMy,
        desc: FEATURE_REGISTRY[id].desc || '',
        enabled: settings[id].enabled,
        access: settings[id].access,
        limit_value: settings[id].limit_value,
      }));
      return json({ ok: true, items });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  if (path.indexOf('/api/admin/features/') === 0 && method === 'PUT') {
    const id = decodeURIComponent(path.slice('/api/admin/features/'.length));
    const body = await readBody(request);
    try {
      const r = await setFeatureSetting(env, id, body || {});
      await logAdminAction(env, user.email, 'feature_update', r.id + ' → enabled=' + r.enabled + ', access=' + r.access + ', limit=' + r.limit_value);
      return json({ ok: true, id: r.id, enabled: r.enabled, access: r.access, limit_value: r.limit_value });
    } catch (e) { return json({ error: 'unknown_feature', detail: String(e && e.message || e) }, 400); }
  }

  // ===== Phase C — AI Models (List / Add / Update / Delete) =====
  if (path === '/api/admin/models' && method === 'GET') {
    try {
      const items = await getAiModels(env);
      return json({ ok: true, items });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  if (path === '/api/admin/models' && method === 'POST') {
    const body = await readBody(request);
    try {
      const r = await setAiModel(env, body || {});
      await logAdminAction(env, user.email, 'model_create', r.id + ' [' + r.category + ']');
      return json({ ok: true, ...r });
    } catch (e) { return json({ error: String(e && e.message || e) === 'last_model' ? 'last_model' : 'model_error', detail: String(e && e.message || e) }, 400); }
  }

  if (path.indexOf('/api/admin/models/') === 0 && method === 'PUT') {
    const id = decodeURIComponent(path.slice('/api/admin/models/'.length));
    const body = await readBody(request);
    try {
      const r = await setAiModel(env, Object.assign({ id }, body || {}));
      await logAdminAction(env, user.email, 'model_update', r.id + ' → enabled=' + r.enabled + ', plan=' + r.plan_access + ', default=' + r.is_default);
      return json({ ok: true, ...r });
    } catch (e) { return json({ error: String(e && e.message || e) === 'last_model' ? 'last_model' : 'model_error', detail: String(e && e.message || e) }, 400); }
  }

  if (path.indexOf('/api/admin/models/') === 0 && method === 'DELETE') {
    const id = decodeURIComponent(path.slice('/api/admin/models/'.length));
    try {
      const r = await deleteAiModel(env, id);
      if (r.ok) {
        await logAdminAction(env, user.email, 'model_delete', id);
        return json({ ok: true });
      }
      return json({ error: 'not_found', detail: 'Model မတွေ့ပါ' }, 404);
    } catch (e) { return json({ error: 'last_model', detail: String(e && e.message || e) }, 400); }
  }

  // ===== Phase 5 — Dashboard Statistics =====
  if (path === '/api/admin/dashboard' && method === 'GET') {
    try {
      const users = await env.DB.prepare('SELECT COUNT(*) AS c FROM users').first();
      const pro = await env.DB.prepare("SELECT COUNT(*) AS c FROM users WHERE plan='PRO'").first();
      // Phase 13 (Option 2): Creations ကို Browser IndexedDB တွင်သာ သိမ်းသည် — Dashboard တွင် မရေတွက်တော့ပါ
      const projects = await env.DB.prepare('SELECT COUNT(*) AS c FROM projects').first();
      const aiToday = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM usage WHERE category='ai' AND date(created_at)=date('now')").first();
      const voiceToday = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM usage WHERE category='voice' AND date(created_at)=date('now')").first();
      const imageToday = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM usage WHERE category='image' AND date(created_at)=date('now')").first();
      const recent = await env.DB.prepare('SELECT email, plan, created_at FROM users ORDER BY created_at DESC LIMIT 5').all();
      return json({
        ok: true,
        stats: {
          users: (users && users.c) || 0,
          pro: (pro && pro.c) || 0,
          projects: (projects && projects.c) || 0,
          ai_today: (aiToday && aiToday.s) || 0,
          voice_today: (voiceToday && voiceToday.s) || 0,
          image_today: (imageToday && imageToday.s) || 0,
        },
        recent: (recent && recent.results) || [],
      });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  // ===== Phase 5 — Usage Statistics =====
  if (path === '/api/admin/usage' && method === 'GET') {
    try {
      const daily = await env.DB.prepare("SELECT date(created_at) AS day, category, SUM(amount) AS total FROM usage GROUP BY day, category ORDER BY day DESC LIMIT 28").all();
      const byUser = await env.DB.prepare("SELECT u.email, COUNT(*) AS calls, SUM(us.amount) AS total FROM usage us JOIN users u ON u.id=us.user_id GROUP BY us.user_id ORDER BY total DESC LIMIT 10").all();
      return json({ ok: true, daily: (daily && daily.results) || [], byUser: (byUser && byUser.results) || [] });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  // ===== Phase 5 — Admin Logs (Audit) =====
  if (path === '/api/admin/logs' && method === 'GET') {
    try {
      const items = await listAdminLogs(env, 100);
      return json({ ok: true, items });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  return null;
}

async function readBody(request) { try { return await request.json(); } catch (e) { return null; } }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }); }
