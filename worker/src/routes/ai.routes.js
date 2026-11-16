import { generateText } from '../ai/ai-service/index.js';
import { getAIErrorHttpStatus } from '../ai/errors/index.js';

export async function handleAiRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const url = new URL(request.url);
  const { bearer, verifyTokenSafe, json, friendlyError } = deps;

      // Cloudflare Rate Limiting: five connection tests per verified user per 60 seconds.
      // This endpoint never persists rate-limit counters or user identifiers in D1.
      // API key connection test is authenticated; callers may test a new key before saving it.
      if (path === '/api/ai/test' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload || !payload.sub) return json({ error: 'invalid_token' }, 401, cors);
        const limiter = env?.AI_TEST_RATE_LIMITER;
        if (!limiter || typeof limiter.limit !== 'function') {
          return json({ error: 'rate_limit_unavailable' }, 503, cors);
        }
        try {
          const decision = await limiter.limit({ key: String(payload.sub) });
          if (!decision?.success) {
            return json({ error: 'rate_limited', limit: 5, window_seconds: 60 }, 429, {
              ...cors,
              'Retry-After': '60',
            });
          }
        } catch (_) {
          return json({ error: 'rate_limit_unavailable' }, 503, cors);
        }
        const body = await request.json().catch(() => null);
        if (!body) return json({ error: 'bad_request' }, 400, cors);
        const prompt = String(body.prompt || 'Reply with OK').slice(0, 500);
        const model = String(body.model || 'gemini-3.5-flash-lite').slice(0, 120);
        try {
          const apiKey = String(body.apiKey || '').trim();
          const out = await generateText(env, { model, prompt, apiKey, validationMode: 'connection_test' });
          return json({ ok: true, output: out }, 200, cors);
        } catch (e) {
          return json({ error: 'ai_error', code: e?.code || 'provider_error', detail: friendlyError(e) }, getAIErrorHttpStatus(e), cors);
        }
      }

  return null;
}
