import { generateVoiceAudio, transcribeAudio, generateVoiceSrt, translateVoiceSrt } from '../../studios/voice.js';

export async function handleVoiceStudioRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, getUserApiKey, friendlyError, ndjsonResponse } = deps;

      // ===== Voice Studio — Tab 1: Text → Voice (TTS) =====
      if (path === '/api/studio/voice/tts' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.text) return json({ error: 'missing_text' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'voice.tts', plan, reqType, cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateVoiceAudio(env, { model: body.model,
            text: body.text,
            voiceName: body.voiceName || 'Kore',
            plan, apiKey,
          });
          await trackUsageSafe(env, payload.sub, 'voice');
          return json({ ok: true, data: out.data, mimeType: out.mimeType }, 200, cors);
        } catch (e) {
          return json({ error: 'tts_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Voice Studio — Tab 2: Audio → Text (Transcribe) =====
      if (path === '/api/studio/voice/transcribe' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.audioBase64) return json({ error: 'missing_audio' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'voice.transcribe', plan, reqType, cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await transcribeAudio(env, { model: body.model, 
            audioBase64: body.audioBase64,
            mimeType: body.mimeType || 'audio/mpeg',
            type: reqType, plan, apiKey,
          });
          await trackUsageSafe(env, payload.sub, 'ai');
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'transcribe_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Voice Studio — Tab 1 & 2: SRT from Audio (PRO only) =====
      if (path === '/api/studio/voice/srt' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.audioBase64) return json({ error: 'missing_audio' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        { const denied = await requireFeature(env, 'voice.srt', plan, String(body.type || '2'), cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateVoiceSrt(env, { model: body.model, 
            audioBase64: body.audioBase64,
            knownText: typeof body.knownText === 'string' ? body.knownText : '',
            mimeType: body.mimeType || 'audio/mpeg',
            type: String(body.type || '2'), plan, apiKey,
          });
          await trackUsageSafe(env, payload.sub, 'ai');
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'srt_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Voice Studio — Tab 1 & 2: Translate SRT (PRO only) =====
      if (path === '/api/studio/voice/translate-srt' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.srtText) return json({ error: 'missing_srt' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        { const denied = await requireFeature(env, 'voice.translate_srt', plan, String(body.type || '2'), cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await translateVoiceSrt(env, { model: body.model, 
            srtText: body.srtText,
            direction: body.direction || 'MY_TO_CN',
            type: String(body.type || '2'), plan, apiKey,
          });
          await trackUsageSafe(env, payload.sub, 'ai');
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'translate_error', detail: friendlyError(e) }, 500, cors);
        }
      }

  return null;
}
