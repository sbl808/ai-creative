// CMS prompt route extracted from the main Worker router.
// Keep authentication, plan resolution, defaults, and response shape unchanged.
export async function handleCmsRoutes(request, env, cors, deps) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/cms/prompt' && request.method === 'POST') {
    const token = deps.bearer(request);
    if (!token) return deps.json({ error: 'unauthorized' }, 401, cors);
    const payload = await deps.verifyTokenSafe(env, token);
    if (!payload) return deps.json({ error: 'invalid_token' }, 401, cors);
    const body = await request.json().catch(() => null);
    if (!body) return deps.json({ error: 'bad_request' }, 400, cors);
    const plan = await deps.resolvePlan(env, payload);
    const c = await deps.getCMSData(env, body.studio || 'STORY', plan, body.type || '1');
    if (!c) return deps.json({ found: false }, 200, cors);
    return deps.json({ found: true, studio: c.studio, plan: c.plan, type: c.type, system_prompt: deps.buildSystemPrompt(c) }, 200, cors);
  }

  return null;
}
