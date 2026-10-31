import { generateIdeas, validateIdeasBrief } from '../core/ideas.js';

export async function handleIdeasRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const url = new URL(request.url);
  const { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, getUserApiKey, trackUsageSafe, friendlyError } = deps;

      if (path === '/api/ideas/generate' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload || !payload.sub) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        const validation = validateIdeasBrief(body);
        if (!validation.ok) return json({ error: validation.error, field: validation.field }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const denied = await requireFeature(env, 'ideas.generate', plan, '1', cors);
        if (denied) return denied;
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const ideas = await generateIdeas(env, { brief: body, plan, apiKey });
          if (!Array.isArray(ideas) || ideas.length !== 3) return json({ error: 'invalid_ai_output' }, 502, cors);
          await trackUsageSafe(env, payload.sub, 'ai');
          return json({ ok: true, count: 3, ideas }, 200, cors);
        } catch (e) {
          if (e && e.message === 'cms_prompt_missing') {
            return json({ error: 'cms_prompt_missing', detail: 'Idea Workspace Prompt ကို Admin CMS မှာ အရင်ပြင်ဆင်ပါ။' }, 503, cors);
          }
          if (e && /^invalid_(?:ai_output|ideas_count|idea|suggested_studio)$/.test(e.message)) {
            return json({ error: e.message }, 502, cors);
          }
          return json({ error: 'ideas_generation_failed', detail: friendlyError(e) }, 502, cors);
        }
      }

  return null;
}
