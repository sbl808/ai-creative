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

  return null;
}
