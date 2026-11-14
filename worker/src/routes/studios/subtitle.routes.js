import {
  transcribeAudio,
  generateVoiceSrt,
  translateVoiceSrt,
} from '../../studios/voice/index.js';

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

  // ===== Subtitle — Audio → Text =====
  if (path === '/api/studio/subtitle/transcribe' && request.method === 'POST') {
    const token = bearer(request);
    if (!token) return json({ error: 'unauthorized' }, 401, cors);

    const payload = await verifyTokenSafe(env, token);
    if (!payload) return json({ error: 'invalid_token' }, 401, cors);

    const body = await request.json().catch(() => null);
    if (!body || !body.audioBase64) {
      return json({ error: 'missing_audio' }, 400, cors);
    }

    const plan = await resolvePlan(env, payload);
    const reqType = String(body.type || '1');
    const denied = await requireFeature(env, 'voice.transcribe', plan, reqType, cors);
    if (denied) return denied;

    try {
      const out = await transcribeAudio(env, {
        model: body.model,
        audioBase64: body.audioBase64,
        mimeType: body.mimeType || 'audio/mpeg',
        type: reqType,
        plan,
        apiKey: body.apiKey,
      });
      return json({ ok: true, ...out }, 200, cors);
    } catch (e) {
      return json({ error: 'transcribe_error', detail: friendlyError(e) }, 500, cors);
    }
  }

  // ===== Subtitle — Audio → SRT =====
  if (path === '/api/studio/subtitle/srt' && request.method === 'POST') {
    const token = bearer(request);
    if (!token) return json({ error: 'unauthorized' }, 401, cors);

    const payload = await verifyTokenSafe(env, token);
    if (!payload) return json({ error: 'invalid_token' }, 401, cors);

    const body = await request.json().catch(() => null);
    if (!body || !body.audioBase64) {
      return json({ error: 'missing_audio' }, 400, cors);
    }

    const plan = await resolvePlan(env, payload);
    const reqType = String(body.type || '2');
    const denied = await requireFeature(env, 'voice.srt', plan, reqType, cors);
    if (denied) return denied;

    try {
      const out = await generateVoiceSrt(env, {
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
    const denied = await requireFeature(env, 'voice.translate_srt', plan, reqType, cors);
    if (denied) return denied;

    try {
      const out = await translateVoiceSrt(env, {
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
