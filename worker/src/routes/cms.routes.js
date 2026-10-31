import { getCMSData, buildSystemPrompt } from '../core/cms.js';

export async function handleCmsRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const url = new URL(request.url);
  const { bearer, verifyTokenSafe, json, resolvePlan } = deps;

      if (path === '/api/cms/prompt' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload || !payload.sub || !payload.email) return json({ error: 'invalid_token' }, 401, cors);
        // Defense in depth: this endpoint returns the full CMS system prompt.
        // Keep the explicit Admin gate here even though adminApi() also protects /api/cms/*.
        const adminEmail = String(env.ADMIN_EMAIL || '').trim();
        if (!adminEmail || String(payload.email).trim().toLowerCase() !== adminEmail.toLowerCase()) {
          return json({ error: 'forbidden', detail: 'admin only' }, 403, cors);
        }
        const body = await request.json().catch(() => null);
        if (!body) return json({ error: 'bad_request' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const c = await getCMSData(env, body.studio || 'STORY', plan, body.type || '1');
        if (!c) return json({ found: false }, 200, cors);
        return json({ found: true, studio: c.studio, plan: c.plan, type: c.type, system_prompt: buildSystemPrompt(c) }, 200, cors);
      }

  return null;
}
