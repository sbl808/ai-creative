import { getUserSettings, updateUserSettings, getUserPreferences, updateUserPreferences } from '../core/settings.js';
import { getStudioSettings } from '../core/studioSettings.js';

export async function handleUserRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const url = new URL(request.url);
  const { bearer, verifyTokenSafe, json, resolvePlan, friendlyError, readBody } = deps;

      if (path === '/api/users/me' && request.method === 'GET') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const plan = await resolvePlan(env, payload);
        const adminEmail = env.ADMIN_EMAIL || '';
        const isAdmin = Boolean(adminEmail) && String(payload.email || '').toLowerCase() === String(adminEmail).toLowerCase();
        // Phase 3 — User ၏ Settings / Preferences များကိုပါ ပြန်ပို့သည်
        const settings = await getUserSettings(env, payload.sub);
        const preferences = await getUserPreferences(env, payload.sub);
        // Phase 4 — Studio ON/OFF အနေအထားကိုပါ ပြန်ပို့သည် (Sidebar မှ ပိတ်ထားသော Studio ကို ဖျောက်ရန်)
        const studio_settings = await getStudioSettings(env);
        // Phase 12 — Name + Usage Summary (Personal Profile အတွက်)
        let name = '';
        let usage = { ai_requests: 0, image_generations: 0, voice_generations: 0 };
        try {
          const row = env.DB ? await env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(payload.sub).first() : null;
          name = (row && row.name) || '';
          const usageRows = env.DB ? await env.DB.prepare('SELECT category, COUNT(*) AS n FROM usage WHERE user_id = ? GROUP BY category').bind(payload.sub).all() : null;
          if (usageRows && usageRows.results) {
            usageRows.results.forEach(function (r) {
              const cat = String(r.category || '').toUpperCase();
              const n = Number(r.n) || 0;
              if (cat.indexOf('IMAGE') > -1) usage.image_generations += n;
              else if (cat.indexOf('VOICE') > -1) usage.voice_generations += n;
              else usage.ai_requests += n;
            });
          }
        } catch (e) { console.error('[AICS] me usage failed', String(e)); }
        return json({ email: payload.email, name, plan, user_id: payload.sub, is_admin: isAdmin, usage, settings, preferences, studio_settings }, 200, cors);
      }

      // ===== Phase 12 — Personal Profile Name ပြောင်းခြင်း (Server-side Whitelist) =====
      if (path === '/api/users/me/profile' && request.method === 'PUT') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await readBody(request).catch(() => null);
        const name = String((body && body.name) || '').trim().slice(0, 60);
        if (!name) return json({ error: 'missing_name', detail: 'Name မထည့်နိုင်ပါ။' }, 400, cors);
        if (!env.DB) return json({ error: 'db_missing' }, 500, cors);
        await env.DB.prepare('UPDATE users SET name = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(name, payload.sub).run();
        return json({ ok: true, name }, 200, cors);
      }

      // ===== Personal Settings — Profile/Preferences သိမ်းခြင်း (Phase 3) =====
      // Server-side တွင် Whitelist စစ်ပြီးမှသာ သိမ်းသည် (Frontend ကို မယုံပါ)
      if (path === '/api/users/me/settings' && request.method === 'PUT') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') return json({ error: 'bad_request' }, 400, cors);
        try {
          const settings = await updateUserSettings(env, payload.sub, body.settings || {});
          const preferences = await updateUserPreferences(env, payload.sub, body.preferences || {});
          return json({ ok: true, settings, preferences }, 200, cors);
        } catch (e) {
          return json({ error: 'settings_error', detail: friendlyError(e) }, 500, cors);
        }
      }

  return null;
}
