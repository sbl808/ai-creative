// Shared HTTP request guards used by the Worker entry point.
export const MAX_API_REQUEST_BODY_BYTES = 32 * 1024 * 1024;


const SHARED_AI_RATE_LIMIT = 30;
const SHARED_AI_RATE_WINDOW_MS = 10 * 60 * 1000;

export function isAiGenerationRoute(path, method) {
  if (method !== 'POST') return false;
  if (path === '/api/ideas/generate' || path === '/api/cms/prompt' || path === '/api/studio/generate') return true;
  return /^\/api\/studio\/(?:content|story|short|image|voice|shop)(?:\/.*)?$/.test(path) &&
    /\/(?:generate|revise|tts|transcribe|srt|translate-srt|video|video-image|prompt|ad-prompt)$/.test(path);
}

export async function enforceSharedAiRateLimit(request, env, path, deps) {
  if (!isAiGenerationRoute(path, request.method)) return null;
  const authHeader = request.headers.get('Authorization') || '';
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  const token = bearer || deps.cookieToken(request);
  const payload = token ? await deps.verifyTokenSafe(env, token) : null;
  if (!payload?.sub) return null; // Let route auth preserve its established response.
  if (!env.DB) return deps.json({ error: 'rate_limit_unavailable' }, 503);

  const windowId = Math.floor(Date.now() / SHARED_AI_RATE_WINDOW_MS);
  try {
    await env.DB.prepare(
      'INSERT INTO api_generation_limits (user_id, window_id, attempts) VALUES (?, ?, 1) ' +
      'ON CONFLICT(user_id, window_id) DO UPDATE SET attempts = attempts + 1'
    ).bind(payload.sub, windowId).run();
    const row = await env.DB.prepare(
      'SELECT attempts FROM api_generation_limits WHERE user_id = ? AND window_id = ?'
    ).bind(payload.sub, windowId).first();
    if (!row || row.attempts > SHARED_AI_RATE_LIMIT) {
      const retryAfter = Math.max(1, Math.ceil(((windowId + 1) * SHARED_AI_RATE_WINDOW_MS - Date.now()) / 1000));
      return deps.json({ error: 'rate_limited', limit: SHARED_AI_RATE_LIMIT, window_seconds: 600 }, 429, {
        'Retry-After': String(retryAfter),
      });
    }
    return null;
  } catch (e) {
    deps.friendlyError(e);
    return deps.json({ error: 'rate_limit_unavailable' }, 503);
  }
}

export async function isApiRequestBodyTooLarge(request) {
  if (!request.url || !new URL(request.url).pathname.startsWith('/api/') || request.method !== 'POST') {
    return false;
  }
  const declaredLength = request.headers.get('Content-Length');
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0) return true;
    if (length > MAX_API_REQUEST_BODY_BYTES) return true;
    // HTTP runtimes validate framing; the declared length allows a cheap early reject.
    return false;
  }
  if (!request.body) return false;

  // Content-Length may be absent for streamed/chunked requests. Inspect a clone with
  // a bounded reader so the original request body remains available to route handlers.
  const reader = request.clone().body.getReader();
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return false;
      total += value.byteLength;
      if (total > MAX_API_REQUEST_BODY_BYTES) {
        try { await reader.cancel('request_body_too_large'); } catch (_) {}
        return true;
      }
    }
  } catch (_) {
    try { await reader.cancel('request_body_read_failed'); } catch (_) {}
    return true;
  }
}
