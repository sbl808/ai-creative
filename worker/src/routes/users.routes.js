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
    return json({
      email: payload.email,
      plan,
      user_id: payload.sub,
      is_admin: isAdmin,
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
      const [settings, preferenceResult, profileRow] = await Promise.all([
        getLegacyUserSettings(env, payload.sub),
        getLegacyUserPreferences(env, payload.sub),
        env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(payload.sub).first()
      ]);
      return json({
        profile: { name: profileRow && profileRow.name ? String(profileRow.name).slice(0, 60) : '' },
        settings,
        preferences: preferenceResult.preferences,
        migration: { skippedPreferences: preferenceResult.skippedPreferences }
      }, 200, cors);
    } catch (_) {
      return json({ error: 'legacy_settings_unavailable' }, 503, cors);
    }
  }

  return null;
}
