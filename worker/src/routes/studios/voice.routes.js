import { generateVoiceAudio, transcribeAudio, generateVoiceSrt, translateVoiceSrt } from '../../studios/voice/index.js';
import { transcribeAudio as transcribeSubtitleAudio } from '../../studios/subtitle.js';

const SUBTITLE_TRANSCRIPTION_MAX_BYTES = 5 * 1024 * 1024;

export function base64DecodedByteLength(value) {
  if (typeof value !== 'string' || value.length % 4 !== 0) return -1;
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return Math.max(0, (value.length / 4) * 3 - padding);
}

export async function handleVoiceStudioRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, friendlyError, ndjsonResponse } = deps;

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
          const apiKey = body.apiKey;
          const out = await generateVoiceAudio(env, { model: body.model,
            text: body.text,
            voiceName: body.voiceName || 'Kore',
            plan, apiKey,
          });
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
        if (!body || typeof body.audioBase64 !== 'string' || !body.audioBase64.trim()) {
          return json({ error: 'missing_audio' }, 400, cors);
        }
        const studioId = body.studio == null ? 'voice' : String(body.studio);
        if (studioId !== 'voice' && studioId !== 'subtitle') {
          return json({ error: 'invalid_studio' }, 400, cors);
        }
        if (studioId === 'subtitle' && base64DecodedByteLength(body.audioBase64) > SUBTITLE_TRANSCRIPTION_MAX_BYTES) {
          return json({ error: 'audio_too_large', max_bytes: SUBTITLE_TRANSCRIPTION_MAX_BYTES }, 413, cors);
        }
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, studioId === 'subtitle' ? 'subtitle.transcribe' : 'voice.transcribe', plan, reqType, cors); if (denied) return denied; }
        try {
          const apiKey = body.apiKey;
          const transcribe = studioId === 'subtitle'
            ? (deps.transcribeSubtitleAudio || transcribeSubtitleAudio)
            : transcribeAudio;
          const out = await transcribe(env, { model: body.model,
            audioBase64: body.audioBase64,
            mimeType: body.mimeType || 'audio/mpeg',
            type: reqType, plan, apiKey,
          });
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
          const apiKey = body.apiKey;
          const out = await generateVoiceSrt(env, { model: body.model, 
            audioBase64: body.audioBase64,
            knownText: typeof body.knownText === 'string' ? body.knownText : '',
            mimeType: body.mimeType || 'audio/mpeg',
            type: String(body.type || '2'), plan, apiKey,
          });
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
          const apiKey = body.apiKey;
          const out = await translateVoiceSrt(env, { model: body.model, 
            srtText: body.srtText,
            direction: body.direction || 'MY_TO_CN',
            type: String(body.type || '2'), plan, apiKey,
          });
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'translate_error', detail: friendlyError(e) }, 500, cors);
        }
      }

  return null;
}
