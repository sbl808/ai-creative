// Generic Studio generation route extracted from the main Worker router.
// Keep auth, validation, plan gates, BYOK fallback, usage tracking, and response shape unchanged.
export async function handleStudioGenerateRoutes(request, env, cors, deps) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/studio/generate' && request.method === 'POST') {
    const token = deps.bearer(request);
    if (!token) return deps.json({ error: 'unauthorized' }, 401, cors);
    const payload = await deps.verifyTokenSafe(env, token);
    if (!payload) return deps.json({ error: 'invalid_token' }, 401, cors);
    const body = await request.json().catch(() => null);
    if (!body || !body.studio || !body.idea) return deps.json({ error: 'missing_studio_or_idea' }, 400, cors);
    const plan = await deps.resolvePlan(env, payload);
    const reqType = String(body.type || '1');
    { const denied = await deps.requireFeature(env, 'generate', plan, reqType, cors); if (denied) return denied; }
    try {
      // BYOK: use the request key first, then the user's saved key.
      let apiKey = body.apiKey;
      if (!apiKey) apiKey = await deps.getUserApiKey(env, payload.sub);
      const out = await deps.generateStudio(env, {
        studio: String(body.studio).toUpperCase(),
        type: String(body.type || '1'),
        idea: body.idea,
        plan,
        apiKey,
        model: body.model,
      });
      await deps.trackUsageSafe(env, payload.sub, 'ai');
      return deps.json(out, 200, cors);
    } catch (e) {
      return deps.json({ error: 'studio_error', detail: deps.friendlyError(e) }, 500, cors);
    }
  }

  return null;
}
