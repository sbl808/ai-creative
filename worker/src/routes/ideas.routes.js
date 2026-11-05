import { generateIdeas, validateIdeasBrief } from '../core/ideas.js';

function noStore(response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('Pragma', 'no-cache');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function handleIdeasRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, getUserApiKey, trackUsageSafe } = deps;

  if (path === '/api/ideas/generate' && request.method === 'POST') {
    const token = bearer(request);
    if (!token) return noStore(json({ error: 'unauthorized' }, 401, cors));
    const payload = await verifyTokenSafe(env, token);
    if (!payload || !payload.sub) return noStore(json({ error: 'invalid_token' }, 401, cors));

    const body = await request.json().catch(() => null);
    const validation = validateIdeasBrief(body);
    if (!validation.ok) {
      return noStore(json({ error: validation.error, field: validation.field }, 400, cors));
    }

    const plan = await resolvePlan(env, payload);
    const denied = await requireFeature(env, 'ideas.generate', plan, '1', cors);
    if (denied) return noStore(denied);

    try {
      const apiKey = body.apiKey || await getUserApiKey(env, payload.sub);
      const ideas = await generateIdeas(env, { brief: { ...body, category: validation.category }, plan, apiKey });
      if (!Array.isArray(ideas) || ideas.length !== 3) {
        return noStore(json({ error: 'invalid_ai_output' }, 502, cors));
      }
      await trackUsageSafe(env, payload.sub, 'ai');
      return noStore(json({ ok: true, count: 3, category: validation.category, ideas }, 200, cors));
    } catch (error) {
      if (error && error.message === 'cms_prompt_missing') {
        return noStore(json({
          error: 'cms_prompt_missing',
          detail: 'Idea Workspace Prompt ကို Admin CMS မှာ အရင်ပြင်ဆင်ပါ။',
        }, 503, cors));
      }
      if (error && /^invalid_(?:ai_output|ideas_count|idea|suggested_studio)$/.test(error.message)) {
        return noStore(json({ error: error.message }, 502, cors));
      }
      // Do not expose provider errors, prompts, credentials, or user-supplied content.
      return noStore(json({ error: 'ideas_generation_failed' }, 502, cors));
    }
  }

  return null;
}
