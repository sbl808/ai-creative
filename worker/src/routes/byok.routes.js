// API keys are managed exclusively in the user's encrypted browser IndexedDB.
// These legacy endpoints are retired; no API key is read from or written to D1.
export async function handleByokRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  if (path === '/api/user/apikey' || path === '/api/user/apikey/status') {
    return deps.json({ error: 'browser_storage_only' }, 410, cors);
  }
  return null;
}
