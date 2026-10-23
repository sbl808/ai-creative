// BYOK user API-key routes extracted from the main Worker router.
// Preserve existing authentication, validation, storage calls, and response shapes.
export async function handleUserApiKeyRoutes(request, env, cors, deps) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/user/apikey' && request.method === 'POST') {
    const token = deps.bearer(request);
    if (!token) return deps.json({ error: 'unauthorized' }, 401, cors);
    const payload = await deps.verifyTokenSafe(env, token);
    if (!payload || !payload.sub) return deps.json({ error: 'invalid_token' }, 401, cors);
    const body = await request.json().catch(() => null);
    if (!body || !body.key || !String(body.key).trim()) return deps.json({ error: 'missing_key' }, 400, cors);
    try {
      await deps.saveUserApiKey(env, payload.sub, String(body.key).trim());
      return deps.json({ ok: true }, 200, cors);
    } catch (e) {
      return deps.json({ error: 'db_error', detail: deps.friendlyError(e) }, 500, cors);
    }
  }

  if (path === '/api/user/apikey/status' && request.method === 'GET') {
    const token = deps.bearer(request);
    if (!token) return deps.json({ error: 'unauthorized' }, 401, cors);
    const payload = await deps.verifyTokenSafe(env, token);
    if (!payload || !payload.sub) return deps.json({ error: 'invalid_token' }, 401, cors);
    try {
      const key = await deps.getUserApiKey(env, payload.sub);
      return deps.json({ hasKey: !!key }, 200, cors);
    } catch (e) {
      return deps.json({ error: 'apikey_status_failed', detail: deps.friendlyError(e) }, 500, cors);
    }
  }

  if (path === '/api/user/apikey' && request.method === 'DELETE') {
    const token = deps.bearer(request);
    if (!token) return deps.json({ error: 'unauthorized' }, 401, cors);
    const payload = await deps.verifyTokenSafe(env, token);
    if (!payload || !payload.sub) return deps.json({ error: 'invalid_token' }, 401, cors);
    try {
      await deps.deleteUserApiKey(env, payload.sub);
      return deps.json({ ok: true }, 200, cors);
    } catch (e) {
      return deps.json({ error: 'apikey_delete_failed', detail: deps.friendlyError(e) }, 500, cors);
    }
  }

  return null;
}
