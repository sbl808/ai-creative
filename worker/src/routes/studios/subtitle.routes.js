import {
  generateSubtitleSrt,
  translateSubtitleSrt,
} from '../../studios/subtitle/index.js';

export async function handleSubtitleStudioRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const {
    bearer,
    verifyTokenSafe,
    json,
    resolvePlan,
    requireFeature,
    trackUsageSafe,
    friendlyError,
  } = deps;

  // Subtitle Studio — Generate SRT from audio.
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
    const type = String(body.type || '2');
    const denied = await requireFeature(env, 'subtitle.srt', plan, type, cors);
    if (denied) return denied;

    try {
      const out = await generateSubtitleSrt(env, {
        model: body.model,
        audioBase64: body.audioBase64,
        knownText: typeof body.knownText === 'string' ? body.knownText : '',
        mimeType: body.mimeType || 'audio/mpeg',
        type,
        plan,
        apiKey: body.apiKey,
      });
      await trackUsageSafe(env, payload.sub, 'ai');
      return json({ ok: true, ...out }, 200, cors);
    } catch (error) {
      return json({ error: 'srt_error', detail: friendlyError(error) }, 500, cors);
    }
  }

  // Subtitle Studio — Translate SRT.
  if (path === '/api/studio/subtitle/translate-srt' && request.method === 'POST') {
    const token = bearer(request);
    if (!token) return json({ error: 'unauthorized' }, 401, cors);

    const payload = await verifyTokenSafe(env, token);
    if (!payload) return json({ error: 'invalid_token' }, 401, cors);

    const body = await request.json().catch(() => null);
    if (!body || typeof body.srtText !== 'string' || !body.srtText.trim()) {
      return json({ error: 'missing_srt' }, 400, cors);
    }

    const plan = await resolvePlan(env, payload);
    const type = String(body.type || '2');
    const denied = await requireFeature(env, 'subtitle.translate_srt', plan, type, cors);
    if (denied) return denied;

    try {
      const out = await translateSubtitleSrt(env, {
        model: body.model,
        srtText: body.srtText,
        direction: body.direction || 'MY_TO_CN',
        type,
        plan,
        apiKey: body.apiKey,
      });
      await trackUsageSafe(env, payload.sub, 'ai');
      return json({ ok: true, ...out }, 200, cors);
    } catch (error) {
      return json({ error: 'translate_error', detail: friendlyError(error) }, 500, cors);
    }
  }

  return null;
}
