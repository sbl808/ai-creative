import {
  generateSubtitleSrt,
  translateSubtitleSrt,
} from '../../studios/subtitle.js';

const SUBTITLE_SRT_MAX_AUDIO_BYTES = 5 * 1024 * 1024;

function base64DecodedByteLength(value) {
  if (typeof value !== 'string' || value.length % 4 !== 0) return -1;
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return Math.max(0, (value.length / 4) * 3 - padding);
}

export async function handleSubtitleStudioRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const {
    bearer,
    verifyTokenSafe,
    json,
    resolvePlan,
    requireFeature,
    friendlyError,
  } = deps;

  // ===== Subtitle — Audio → SRT =====
  if (path === '/api/studio/subtitle/srt' && request.method === 'POST') {
    const token = bearer(request);
    if (!token) return json({ error: 'unauthorized' }, 401, cors);

    const payload = await verifyTokenSafe(env, token);
    if (!payload) return json({ error: 'invalid_token' }, 401, cors);

    const body = await request.json().catch(() => null);
    if (!body || typeof body.audioBase64 !== 'string' || !body.audioBase64.trim()) {
      return json({ error: 'missing_audio' }, 400, cors);
    }

    const audioBytes = base64DecodedByteLength(body.audioBase64);
    if (audioBytes < 0) {
      return json({ error: 'invalid_audio' }, 400, cors);
    }
    if (audioBytes > SUBTITLE_SRT_MAX_AUDIO_BYTES) {
      return json({
        error: 'audio_too_large',
        max_bytes: SUBTITLE_SRT_MAX_AUDIO_BYTES,
      }, 413, cors);
    }

    const plan = await resolvePlan(env, payload);
    const reqType = String(body.type || '2');
    const denied = await requireFeature(env, 'subtitle.srt', plan, reqType, cors);
    if (denied) return denied;

    try {
      const out = await generateSubtitleSrt(env, {
        model: body.model,
        audioBase64: body.audioBase64,
        knownText: typeof body.knownText === 'string' ? body.knownText : '',
        mimeType: body.mimeType || 'audio/mpeg',
        type: reqType,
        plan,
        apiKey: body.apiKey,
      });
      return json({ ok: true, ...out }, 200, cors);
    } catch (e) {
      return json({ error: 'srt_error', detail: friendlyError(e) }, 500, cors);
    }
  }

  // ===== Subtitle — Translate SRT =====
  if (path === '/api/studio/subtitle/translate-srt' && request.method === 'POST') {
    const token = bearer(request);
    if (!token) return json({ error: 'unauthorized' }, 401, cors);

    const payload = await verifyTokenSafe(env, token);
    if (!payload) return json({ error: 'invalid_token' }, 401, cors);

    const body = await request.json().catch(() => null);
    if (!body || !body.srtText) {
      return json({ error: 'missing_srt' }, 400, cors);
    }

    const plan = await resolvePlan(env, payload);
    const reqType = String(body.type || '2');
    const denied = await requireFeature(env, 'subtitle.translate_srt', plan, reqType, cors);
    if (denied) return denied;

    try {
      const out = await translateSubtitleSrt(env, {
        model: body.model,
        srtText: body.srtText,
        direction: body.direction || 'MY_TO_CN',
        type: reqType,
        plan,
        apiKey: body.apiKey,
      });
      return json({ ok: true, ...out }, 200, cors);
    } catch (e) {
      return json({ error: 'translate_error', detail: friendlyError(e) }, 500, cors);
    }
  }

  return null;
}
