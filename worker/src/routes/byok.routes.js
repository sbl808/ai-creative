import { getUserApiKey, saveUserApiKey, deleteUserApiKey } from '../core/utilities.js';

export async function handleByokRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const url = new URL(request.url);
  const { bearer, verifyTokenSafe, json, friendlyError } = deps;

      // ===== BYOK — User ကိုယ်ပိုင် Gemini Key သိမ်းခြင်း / အခြေအနေ စစ်ခြင်း =====
      if (path === '/api/user/apikey' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload || !payload.sub) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.key || !String(body.key).trim()) return json({ error: 'missing_key' }, 400, cors);
        try {
          await saveUserApiKey(env, payload.sub, String(body.key).trim());
          return json({ ok: true }, 200, cors);
        } catch (e) {
          return json({ error: 'db_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      if (path === '/api/user/apikey/status' && request.method === 'GET') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload || !payload.sub) return json({ error: 'invalid_token' }, 401, cors);
        try {
          const key = await getUserApiKey(env, payload.sub);
          return json({ hasKey: !!key }, 200, cors);
        } catch (e) {
          return json({ error: 'apikey_status_failed', detail: friendlyError(e) }, 500, cors);
        }
      }

      if (path === '/api/user/apikey' && request.method === 'DELETE') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload || !payload.sub) return json({ error: 'invalid_token' }, 401, cors);
        try {
          await deleteUserApiKey(env, payload.sub);
          return json({ ok: true }, 200, cors);
        } catch (e) {
          return json({ error: 'apikey_delete_failed', detail: friendlyError(e) }, 500, cors);
        }
      }

  return null;
}
