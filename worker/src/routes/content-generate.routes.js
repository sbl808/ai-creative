// Content Studio generation route extracted from the main Worker router.
// Preserve auth, plan gates, BYOK fallback, NDJSON streaming, usage tracking, and response shapes.
export async function handleContentGenerateRoute(request, env, cors, deps) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/studio/content/generate' && request.method === 'POST') {
    const token = deps.bearer(request);
    if (!token) return deps.json({ error: 'unauthorized' }, 401, cors);
    const payload = await deps.verifyTokenSafe(env, token);
    if (!payload) return deps.json({ error: 'invalid_token' }, 401, cors);
    const body = await request.json().catch(() => null);
    if (!body || !body.idea) return deps.json({ error: 'missing_idea' }, 400, cors);
    const plan = await deps.resolvePlan(env, payload);
    const genLevel = String(body.generationLevel || body.type || '1');
    { const denied = await deps.requireFeature(env, 'content.generate', plan, genLevel, cors); if (denied) return denied; }

    // Global result streaming: real-time NDJSON stream when explicitly requested.
    if (String(request.headers.get('Accept') || '').indexOf('application/x-ndjson') !== -1) {
      return deps.ndjsonResponse(async (send) => {
        let apiKey = body.apiKey;
        if (!apiKey) apiKey = await deps.getUserApiKey(env, payload.sub);
        const out = await deps.generateContent(env, {
          model: body.model,
          idea: body.idea,
          generationLevel: genLevel,
          contentType: String(body.contentType || 'Other'),
          platform: body.platform,
          product: body.product,
          goal: body.goal,
          cta: body.cta,
          plan, apiKey,
          onChunk: (t) => send({ type: 'chunk', text: t }),
        });
        await deps.trackUsageSafe(env, payload.sub, 'ai');
        send({ type: 'done', result: out });
      }, cors);
    }

    try {
      let apiKey = body.apiKey;
      if (!apiKey) apiKey = await deps.getUserApiKey(env, payload.sub);
      const out = await deps.generateContent(env, {
        model: body.model,
        idea: body.idea,
        generationLevel: genLevel,
        contentType: String(body.contentType || 'Other'),
        platform: body.platform,
        product: body.product,
        goal: body.goal,
        cta: body.cta,
        plan, apiKey,
      });
      await deps.trackUsageSafe(env, payload.sub, 'ai');
      return deps.json({ ok: true, ...out }, 200, cors);
    } catch (e) {
      return deps.json({ error: 'content_error', detail: deps.friendlyError(e) }, 500, cors);
    }
  }

  return null;
}
