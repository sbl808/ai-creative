import { generateVoiceAudio } from '../../studios/voice/index.js';

export async function handleVoiceStudioRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, friendlyError } = deps;

  // ===== Voice Studio — Text → Voice (TTS) =====
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
          await trackUsageSafe(env, payload.sub, 'voice');
          return json({ ok: true, data: out.data, mimeType: out.mimeType }, 200, cors);
        } catch (e) {
          return json({ error: 'tts_error', detail: friendlyError(e) }, 500, cors);
        }
      }

  return null;
}
