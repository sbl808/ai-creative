import { getLegacyUserSettings, getLegacyUserPreferences } from '../core/settings.js';
import { getStudioSettings } from '../core/studioSettings.js';

export async function handleUserRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const { bearer, verifyTokenSafe, json, resolvePlan } = deps;

  if (path === '/api/users/me' && request.method === 'GET') {
    const token = bearer(request);
    if (!token) return json({ error: 'unauthorized' }, 401, cors);
    const payload = await verifyTokenSafe(env, token);
    if (!payload) return json({ error: 'invalid_token' }, 401, cors);
    const plan = await resolvePlan(env, payload);
    const adminEmail = env.ADMIN_EMAIL || '';
    const isAdmin = Boolean(adminEmail) && String(payload.email || '').toLowerCase() === String(adminEmail).toLowerCase();
    const studio_settings = await getStudioSettings(env);
    let usage = { ai_requests: 0, image_generations: 0, voice_generations: 0 };
    try {
      const usageRows = env.DB
        ? await env.DB.prepare('SELECT category, COUNT(*) AS n FROM usage WHERE user_id = ? GROUP BY category').bind(payload.sub).all()
        : null;
      if (usageRows && usageRows.results) {
        usageRows.results.forEach(function (row) {
          const category = String(row.category || '').toUpperCase();
          const count = Number(row.n) || 0;
          if (category.indexOf('IMAGE') > -1) usage.image_generations += count;
          else if (category.indexOf('VOICE') > -1) usage.voice_generations += count;
          else usage.ai_requests += count;
        });
      }
    } catch (_) {
      // Usage tracking is handled separately; never expose or log user data here.
    }
    return json({
      email: payload.email,
      plan,
      user_id: payload.sub,
      is_admin: isAdmin,
      usage,
      studio_settings
    }, 200, cors);
  }

  // One-time bridge: existing D1 profile/settings are copied into this user's
  // browser IndexedDB. This endpoint is read-only and returns no-store JSON.
  if (path === '/api/users/me/legacy-settings' && request.method === 'GET') {
    const token = bearer(request);
    if (!token) return json({ error: 'unauthorized' }, 401, cors);
    const payload = await verifyTokenSafe(env, token);
    if (!payload) return json({ error: 'invalid_token' }, 401, cors);
    if (!env.DB) return json({ error: 'legacy_settings_unavailable' }, 503, cors);
    try {
      const [settings, preferences, profileRow] = await Promise.all([
        getLegacyUserSettings(env, payload.sub),
        getLegacyUserPreferences(env, payload.sub),
        env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(payload.sub).first()
      ]);
      return json({
        profile: { name: profileRow && profileRow.name ? String(profileRow.name).slice(0, 60) : '' },
        settings,
        preferences
      }, 200, cors);
    } catch (_) {
      return json({ error: 'legacy_settings_unavailable' }, 503, cors);
    }
  }

  return null;
}
