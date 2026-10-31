import { generateContent, reviseContent, generateContentVoice, generateContentVideo, generateContentVideoImage, generateContentSrt, translateContentSrt } from '../../studios/content.js';

export async function handleContentStudioRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, getUserApiKey, friendlyError, ndjsonResponse, isStudioEnabled } = deps;

      // ===== Content Studio — Tab 1: Generate =====
      // ===== Studio API — Disabled Studio ကို Server-side တွင် ပိတ်သည် (Rule 14) =====
      // UI တွင် ဖျောက်ထားရုံဖြင့် မရ — API ကိုယ်တိုင် စစ်ဆေးသည်
      {
        const studioApiId = (path.match(/^\/api\/studio\/(story|content|short|image|voice|shop)\//) || [])[1];
        if (studioApiId) {
          const enabled = await isStudioEnabled(env, studioApiId);
          if (!enabled) return json({ error: 'studio_disabled', message: 'This studio is currently disabled.' }, 403, cors);
        }
      }

      if (path === '/api/studio/content/generate' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.idea) return json({ error: 'missing_idea' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const genLevel = String(body.generationLevel || body.type || '1');
        { const denied = await requireFeature(env, 'content.generate', plan, genLevel, cors); if (denied) return denied; }
        // ===== GLOBAL RESULT STREAMING — real-time NDJSON stream (Accept: application/x-ndjson) =====
        if (String(request.headers.get('Accept') || '').indexOf('application/x-ndjson') !== -1) {
          return ndjsonResponse(async (send) => {
            let apiKey = body.apiKey;
            if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
            const out = await generateContent(env, {
              model: body.model,
              idea: body.idea,
              generationLevel: genLevel,
              contentType: String(body.contentType || 'Other'),
              platform: body.platform,
              product: body.product,
              goal: body.goal,
              cta: body.cta,
              plan, apiKey,
              onChunk: (t) => send({ type: 'chunk', text: t }),
            });
            await trackUsageSafe(env, payload.sub, 'ai');
            send({ type: 'done', result: out });
          }, cors);
        }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateContent(env, {
            model: body.model,
            idea: body.idea,
            generationLevel: genLevel,
            contentType: String(body.contentType || 'Other'),
            platform: body.platform,
            product: body.product,
            goal: body.goal,
            cta: body.cta,
            plan, apiKey,
          });
          await trackUsageSafe(env, payload.sub, 'ai');
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'content_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Content Studio — Tab 1: Revise (Chat) =====
      if (path === '/api/studio/content/revise' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.feedback) return json({ error: 'missing_feedback' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const genLevel = String(body.generationLevel || body.type || '1');
        { const denied = await requireFeature(env, 'content.revise', plan, genLevel, cors); if (denied) return denied; }
        // ===== GLOBAL RESULT STREAMING — real-time NDJSON stream =====
        if (String(request.headers.get('Accept') || '').indexOf('application/x-ndjson') !== -1) {
          return ndjsonResponse(async (send) => {
            let apiKey = body.apiKey;
            if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
            const out = await reviseContent(env, {
              model: body.model,
              originalContent: body.originalContent || '',
              originalSpeaking: body.originalSpeaking || '',
              originalVoice: body.originalVoice || '',
              feedback: body.feedback,
              generationLevel: genLevel,
              contentType: String(body.contentType || 'Other'),
              plan, apiKey,
              onChunk: (t) => send({ type: 'chunk', text: t }),
            });
            send({ type: 'done', result: out });
          }, cors);
        }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await reviseContent(env, { model: body.model, 
            originalContent: body.originalContent || '',
            originalSpeaking: body.originalSpeaking || '',
            originalVoice: body.originalVoice || '',
            feedback: body.feedback,
            generationLevel: genLevel,
            contentType: String(body.contentType || 'Other'),
            plan, apiKey,
          });
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'revise_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Content Studio — Tab 1: Text → Voice (TTS) =====
      if (path === '/api/studio/content/tts' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.text) return json({ error: 'missing_text' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const genLevel = String(body.generationLevel || body.type || '1');
        { const denied = await requireFeature(env, 'content.tts', plan, genLevel, cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateContentVoice(env, { model: body.model,
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

      // ===== Content Studio — Tab 2: Video Plan =====
      if (path === '/api/studio/content/video' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.idea) return json({ error: 'missing_idea' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const genLevel = String(body.generationLevel || body.type || '1');
        { const denied = await requireFeature(env, 'content.video', plan, genLevel, cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateContentVideo(env, {
            model: body.model,
            idea: body.idea,
            generationLevel: genLevel,
            contentType: String(body.contentType || 'Other'),
            plan, apiKey,
          });
          await trackUsageSafe(env, payload.sub, 'ai');
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'video_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Content Studio — Tab 2: Video Scene Image =====
      if (path === '/api/studio/content/video-image' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.prompt) return json({ error: 'missing_prompt' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'content.video_image', plan, reqType, cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateContentVideoImage(env, { model: body.model, prompt: body.prompt, plan, apiKey });
          return json({ ok: true, data: out.data, mimeType: out.mimeType }, 200, cors);
        } catch (e) {
          return json({ error: 'image_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Content Studio — Tab 3: SRT from Audio =====
      if (path === '/api/studio/content/srt' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.audioBase64) return json({ error: 'missing_audio' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        { const denied = await requireFeature(env, 'content.srt', plan, '1', cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateContentSrt(env, { model: body.model, 
            audioBase64: body.audioBase64,
            mimeType: body.mimeType || 'audio/mpeg',
            apiKey,
          });
          return json({ ok: true, srt: out.srt }, 200, cors);
        } catch (e) {
          return json({ error: 'srt_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Content Studio — Tab 3: Translate SRT =====
      if (path === '/api/studio/content/translate-srt' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.srtText) return json({ error: 'missing_srt' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        { const denied = await requireFeature(env, 'content.translate_srt', plan, '1', cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await translateContentSrt(env, { model: body.model, 
            srtText: body.srtText,
            direction: body.direction || 'my-to-cn',
            apiKey,
          });
          return json({ ok: true, srt: out.srt }, 200, cors);
        } catch (e) {
          return json({ error: 'translate_error', detail: friendlyError(e) }, 500, cors);
        }
      }

  return null;
}
