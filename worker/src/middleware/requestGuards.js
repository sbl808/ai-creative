// Shared HTTP request guards used by the Worker entry point.
export const MAX_API_REQUEST_BODY_BYTES = 32 * 1024 * 1024;

const SHARED_AI_RATE_LIMIT = 3;
const SHARED_AI_RATE_WINDOW_SECONDS = 60;

export function isAiGenerationRoute(path, method) {
  if (method !== 'POST') return false;
  if (path === '/api/ideas/generate' || path === '/api/cms/prompt' || path === '/api/studio/generate') return true;
  return /^\\/api\\/studio\\/(?:content|story|short|image|voice|shop|subtitle)(?:\\/.*)?$/.test(path) &&
    /\\/(?:generate|revise|tts|transcribe|srt|translate-srt|video|video-image|prompt|ad-prompt)$/.test(path);
}

export async function enforceSharedAiRateLimit(request, env, path, deps) {
  if (!isAiGenerationRoute(path, request.method)) return null;
  const authHeader = request.headers.get('Authorization') || '';
  const bearer = authHeader.match(/^Bearer\\s+(.+)$/i)?.[1] || '';
  const token = bearer || deps.cookieToken(request);
  const payload = token ? await deps.verifyTokenSafe(env, token) : null;
  if (!payload?.sub) return null; // Let route auth preserve its established response.

  const clientId = request.headers.get('X-AICS-Client-ID') || '';
  if (!/^[a-f0-9]{32}$/.test(clientId)) {
    return deps.json({ error: 'rate_limit_identity_required' }, 400);
  }

  const limiter = env.AI_RATE_LIMITER;
  if (!limiter || typeof limiter.limit !== 'function') {
    return deps.json({ error: 'rate_limit_unavailable' }, 503);
  }

  try {
    const result = await limiter.limit({ key: clientId });
    if (!result || result.success !== true) {
      return deps.json(
        { error: 'rate_limited', limit: SHARED_AI_RATE_LIMIT, window_seconds: SHARED_AI_RATE_WINDOW_SECONDS },
        429,
        { 'Retry-After': String(SHARED_AI_RATE_WINDOW_SECONDS) }
      );
    }
    return null;
  } catch (_) {
    deps.friendlyError();
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
