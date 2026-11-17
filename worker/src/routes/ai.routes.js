import { generateText } from '../ai/ai-service/index.js';
import { getAIErrorHttpStatus } from '../ai/errors/index.js';

export async function handleAiRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const url = new URL(request.url);
  const { bearer, verifyTokenSafe, json, friendlyError } = deps;

      // API key connection tests use a separate Cloudflare rate-limit bucket.
      // The verified JWT subject isolates each user's attempts; no counter is stored in D1.
      // Cloudflare's rate-limit counters are approximate and may exceed the configured threshold.
      if (path === '/api/ai/test' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload || !payload.sub) return json({ error: 'invalid_token' }, 401, cors);
        if (!env.AI_CONNECTION_TEST_RATE_LIMITER) {
          return json({ error: 'rate_limit_unavailable' }, 503, cors);
        }
        try {
          const result = await env.AI_CONNECTION_TEST_RATE_LIMITER.limit({ key: String(payload.sub) });
          if (!result?.success) return json({ error: 'rate_limited' }, 429, cors);
        } catch {
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
