import { generateVoiceAudio, transcribeAudio, generateVoiceSrt, translateVoiceSrt } from '../../studios/voice/index.js';
import { transcribeSubtitleAudio } from '../../studios/subtitle/audio.js';

const MAX_SUBTITLE_AUDIO_BYTES = 5 * 1024 * 1024;
function getBase64DecodedByteLength(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length % 4 !== 0) return null;

  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const contentLength = value.length - padding;
  if (contentLength === 0) return null;

  // Scan characters directly so very large uploads cannot trigger regex backtracking/stack growth.
  for (let index = 0; index < contentLength; index += 1) {
    const code = value.charCodeAt(index);
    const isAlphaNumeric = (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
    if (!isAlphaNumeric && code !== 43 && code !== 47) return null;
  }
  for (let index = contentLength; index < value.length; index += 1) {
    if (value[index] !== '=') return null;
  }
  if ((padding === 2 && contentLength % 4 !== 2) || (padding === 1 && contentLength % 4 !== 3)) return null;

  return (value.length / 4) * 3 - padding;
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
        if (!body || !body.audioBase64) return json({ error: 'missing_audio' }, 400, cors);
        const isSubtitleRequest = body.studio === 'subtitle';
        if (isSubtitleRequest) {
          const audioBytes = getBase64DecodedByteLength(body.audioBase64);
          if (audioBytes === null) return json({ error: 'invalid_audio' }, 400, cors);
          if (audioBytes > MAX_SUBTITLE_AUDIO_BYTES) {
            return json({ error: 'audio_file_too_large' }, 413, cors);
          }
        }
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        const feature = isSubtitleRequest ? 'subtitle.transcribe' : 'voice.transcribe';
        { const denied = await requireFeature(env, feature, plan, reqType, cors); if (denied) return denied; }
        try {
          const apiKey = body.apiKey;
          const input = {
            model: body.model,
            audioBase64: body.audioBase64,
            mimeType: body.mimeType || 'audio/mpeg',
            type: reqType,
            plan,
            apiKey,
          };
          const out = isSubtitleRequest
            ? await (deps.transcribeSubtitleAudio || transcribeSubtitleAudio)(env, input)
            : await transcribeAudio(env, input);
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
