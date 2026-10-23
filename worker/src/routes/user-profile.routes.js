// User profile and settings route handlers extracted from the main Worker router.
// Keep route paths, validation, response shapes, and service calls behavior-compatible.
export async function handleUserProfileRoutes(request, env, cors, deps) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/users/me/profile' && request.method === 'PUT') {
    const token = deps.bearer(request);
    if (!token) return deps.json({ error: 'unauthorized' }, 401, cors);
    const payload = await deps.verifyTokenSafe(env, token);
    if (!payload) return deps.json({ error: 'invalid_token' }, 401, cors);
    const body = await deps.readBody(request).catch(() => null);
    const name = String((body && body.name) || '').trim().slice(0, 60);
    if (!name) return deps.json({ error: 'missing_name', detail: 'Name မထည့်နိုင်ပါ။' }, 400, cors);
    if (!env.DB) return deps.json({ error: 'db_missing' }, 500, cors);
    await env.DB.prepare('UPDATE users SET name = ?, updated_at = datetime(\\'now\\') WHERE id = ?').bind(name, payload.sub).run();
    return deps.json({ ok: true, name }, 200, cors);
  }

  if (path === '/api/users/me/settings' && request.method === 'PUT') {
    const token = deps.bearer(request);
    if (!token) return deps.json({ error: 'unauthorized' }, 401, cors);
    const payload = await deps.verifyTokenSafe(env, token);
    if (!payload) return deps.json({ error: 'invalid_token' }, 401, cors);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return deps.json({ error: 'bad_request' }, 400, cors);
    try {
      const settings = await deps.updateUserSettings(env, payload.sub, body.settings || {});
      const preferences = await deps.updateUserPreferences(env, payload.sub, body.preferences || {});
      return deps.json({ ok: true, settings, preferences }, 200, cors);
    } catch (e) {
      return deps.json({ error: 'settings_error', detail: deps.friendlyError(e) }, 500, cors);
    }
  }

  return null;
}
