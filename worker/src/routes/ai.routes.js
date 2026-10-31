import { generateText } from '../core/ai/aiService.js';
import { getAIErrorHttpStatus } from '../core/ai/errors.js';

export async function handleAiRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const url = new URL(request.url);
  const { bearer, verifyTokenSafe, json, friendlyError, getUserApiKey } = deps;

      // D1-backed fixed-window limit: five connection tests per user per ten minutes.
      // A shared database provides consistent limits across Worker isolates.
      // API key connection test is authenticated; callers may test a new key before saving it.
      if (path === '/api/ai/test' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload || !payload.sub) return json({ error: 'invalid_token' }, 401, cors);
        if (!env.DB) return json({ error: 'rate_limit_unavailable' }, 503, cors);
        try {
          const windowId = Math.floor(Date.now() / 600000);
          await env.DB.prepare('INSERT INTO api_test_limits (user_id, window_id, attempts) VALUES (?, ?, 1) ON CONFLICT(user_id, window_id) DO UPDATE SET attempts = attempts + 1').bind(payload.sub, windowId).run();
          const usage = await env.DB.prepare('SELECT attempts FROM api_test_limits WHERE user_id = ? AND window_id = ?').bind(payload.sub, windowId).first();
          if (!usage || usage.attempts > 5) return json({ error: 'rate_limited' }, 429, { ...cors, 'Retry-After': String(Math.ceil(((windowId + 1) * 600000 - Date.now()) / 1000)) });
        } catch (e) { friendlyError(e); return json({ error: 'rate_limit_unavailable' }, 503, cors); }
        const body = await request.json().catch(() => null);
        if (!body) return json({ error: 'bad_request' }, 400, cors);
        const prompt = String(body.prompt || 'Reply with OK').slice(0, 500);
        const model = String(body.model || 'gemini-3.5-flash-lite').slice(0, 120);
        try {
          const apiKey = String(body.apiKey || '').trim() || await getUserApiKey(env, payload.sub);
          const out = await generateText(env, { model, prompt, apiKey, validationMode: 'connection_test' });
          return json({ ok: true, output: out }, 200, cors);
        } catch (e) {
          return json({ error: 'ai_error', code: e?.code || 'provider_error', detail: friendlyError(e) }, getAIErrorHttpStatus(e), cors);
        }
      }

  return null;
}
