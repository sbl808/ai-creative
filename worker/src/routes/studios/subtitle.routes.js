import { transcribeSubtitleAudio } from '../../studios/subtitle/audio.js';

const SAFE_TRANSCRIPTION_ERROR = 'Something went wrong. Please try again.';

export async function handleSubtitleStudioRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  if (path !== '/api/studio/subtitle/transcribe' || request.method !== 'POST') return null;

  const { bearer, verifyTokenSafe, json, resolvePlan, requireFeature } = deps;
  const token = bearer(request);
  if (!token) return json({ error: 'unauthorized' }, 401, cors);

  const payload = await verifyTokenSafe(env, token);
  const userId = typeof payload?.sub === 'string' ? payload.sub.trim() : '';
  if (!userId) return json({ error: 'invalid_token' }, 401, cors);

  const body = await request.json().catch(() => null);
  if (!body || typeof body.audioBase64 !== 'string' || !body.audioBase64.trim()) {
    return json({ error: 'missing_audio' }, 400, cors);
  }
  if (typeof body.apiKey !== 'string' || !body.apiKey.trim()) {
    return json({ error: 'missing_api_key' }, 400, cors);
  }

  const plan = await resolvePlan(env, payload);
  const reqType = String(body.type || '1');
  const denied = await requireFeature(env, 'subtitle.transcribe', plan, reqType, cors);
  if (denied) return denied;

  // Fail closed: do not process audio when the Cloudflare binding is absent
  // or unavailable. The key is the verified session subject, never the IP.
  const limiter = env?.SUBTITLE_RATE_LIMITER;
  if (!limiter || typeof limiter.limit !== 'function') {
    return json({ error: 'rate_limit_unavailable' }, 503, cors);
  }
  try {
    const decision = await limiter.limit({ key: userId });
    if (!decision?.success) {
      return json({ error: 'rate_limited', limit: 10, window_seconds: 60 }, 429, {
        ...cors,
        'Retry-After': '60',
      });
    }
  } catch (_) {
    return json({ error: 'rate_limit_unavailable' }, 503, cors);
  }

  try {
    const transcribe = deps.transcribeSubtitleAudio || transcribeSubtitleAudio;
    const result = await transcribe(env, {
      audioBase64: body.audioBase64,
      mimeType: body.mimeType || 'audio/mpeg',
      apiKey: body.apiKey,
      model: body.model,
      plan,
    });
    return json({ ok: true, text: result.text }, 200, cors);
  } catch (_) {
    // Never include provider errors, request audio, transcript, or API key.
    return json({ error: 'transcribe_error', detail: SAFE_TRANSCRIPTION_ERROR }, 500, cors);
  }
}
