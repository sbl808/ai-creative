export async function handleProjectRoutes(request, env, cors, deps) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/projects' && request.method === 'POST') {
    const token = deps.bearer(request);
    if (!token) return deps.json({ error: 'unauthorized' }, 401, cors);
    const payload = await deps.verifyTokenSafe(env, token);
    if (!payload) return deps.json({ error: 'invalid_token' }, 401, cors);
    const body = await deps.readBody(request).catch(() => null);
    if (!body || !body.title) return deps.json({ error: 'missing_title' }, 400, cors);
    try {
      const p = await deps.createProject(env, payload.sub, String(body.title), body.description || '');
      return deps.json({ ok: true, project: p }, 200, cors);
    } catch (e) {
      return deps.json({ error: 'project_error', detail: deps.friendlyError(e) }, 500, cors);
    }
  }

  if (path === '/api/projects' && request.method === 'GET') {
    const token = deps.bearer(request);
    if (!token) return deps.json({ error: 'unauthorized' }, 401, cors);
    const payload = await deps.verifyTokenSafe(env, token);
    if (!payload) return deps.json({ error: 'invalid_token' }, 401, cors);
    try {
      const items = await deps.listProjects(env, payload.sub);
      return deps.json({ items }, 200, cors);
    } catch (e) {
      return deps.json({ error: 'project_error', detail: deps.friendlyError(e) }, 500, cors);
    }
  }

  if (path.startsWith('/api/projects/') && request.method === 'DELETE') {
    const token = deps.bearer(request);
    if (!token) return deps.json({ error: 'unauthorized' }, 401, cors);
    const payload = await deps.verifyTokenSafe(env, token);
    if (!payload) return deps.json({ error: 'invalid_token' }, 401, cors);
    const id = path.split('/').pop();
    if (!id) return deps.json({ error: 'missing_id' }, 400, cors);
    try {
      await deps.deleteProject(env, payload.sub, id);
      return deps.json({ ok: true }, 200, cors);
    } catch (e) {
      return deps.json({ error: 'delete_error', detail: deps.friendlyError(e) }, 500, cors);
    }
  }

  return null;
}
