// Per-request CORS policy. Only explicitly configured origins are echoed.
export function buildCors(request, env) {
  const reqOrigin = request.headers.get('Origin') || '';
  const allowed = String((env && env.ALLOWED_ORIGINS) || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const out = {
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
  if (reqOrigin && allowed.includes(reqOrigin)) {
    out['Access-Control-Allow-Origin'] = reqOrigin;
  }
  return out;
}
