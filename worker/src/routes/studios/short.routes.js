import { generateShort, reviseShort, generateShortVideoPlan, generateShortVideoImage } from '../../studios/short.js';

export async function handleShortStudioRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, getUserApiKey, friendlyError, ndjsonResponse } = deps;

      // ===== Short Studio — Tab 1: Generate =====
      if (path === '/api/studio/short/generate' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.idea) return json({ error: 'missing_idea' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'short.generate', plan, reqType, cors); if (denied) return denied; }
        // ===== GLOBAL RESULT STREAMING — real-time NDJSON stream (Accept: application/x-ndjson) =====
        if (String(request.headers.get('Accept') || '').indexOf('application/x-ndjson') !== -1) {
          return ndjsonResponse(async (send) => {
            let apiKey = body.apiKey;
            if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
            const out = await generateShort(env, {
              model: body.model, idea: body.idea, type: reqType, plan, apiKey,
              onChunk: (t) => send({ type: 'chunk', text: t }),
            });
            await trackUsageSafe(env, payload.sub, 'ai');
            send({ type: 'done', result: out });
          }, cors);
        }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateShort(env, { model: body.model,  idea: body.idea, type: reqType, plan, apiKey });
          await trackUsageSafe(env, payload.sub, 'ai');
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'short_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Short Studio — Tab 1: Revise (Chat) =====
      if (path === '/api/studio/short/revise' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.instruction) return json({ error: 'missing_instruction' }, 400, cors);
        if (!body.currentShort) return json({ error: 'missing_current_short' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'short.revise', plan, reqType, cors); if (denied) return denied; }
        // ===== GLOBAL RESULT STREAMING — real-time NDJSON stream =====
        if (String(request.headers.get('Accept') || '').indexOf('application/x-ndjson') !== -1) {
          return ndjsonResponse(async (send) => {
            let apiKey = body.apiKey;
            if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
            const out = await reviseShort(env, {
              model: body.model,
              idea: body.idea || '', type: reqType, currentShort: body.currentShort,
              instruction: body.instruction, plan, apiKey,
              onChunk: (t) => send({ type: 'chunk', text: t }),
            });
            send({ type: 'done', result: out });
          }, cors);
        }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await reviseShort(env, { model: body.model, 
            idea: body.idea || '', type: reqType, currentShort: body.currentShort,
            instruction: body.instruction, plan, apiKey,
          });
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'revise_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Short Studio — Tab 2: Video Plan (with Reference Images) =====
      if (path === '/api/studio/short/video' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.idea) return json({ error: 'missing_idea' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'short.video', plan, reqType, cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateShortVideoPlan(env, { model: body.model, 
            idea: body.idea, type: reqType, plan, apiKey,
            images: body.images || [],
            // Short Video Production Setup (Step 04) — additive, backward compatible
            videoStyle: body.videoStyle || '',
            aspectRatio: body.aspectRatio || '9:16',
            duration: body.duration || '30 sec',
            sceneDuration: body.sceneDuration || '5 sec',
            visualStyle: body.visualStyle || '',
            cameraStyle: body.cameraStyle || '',
            language: body.language || 'မြန်မာ',
            characterContinuity: body.characterContinuity || 'true',
            additionalInstructions: body.additionalInstructions || '',
          });
          await trackUsageSafe(env, payload.sub, 'ai');
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'video_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Short Studio — Tab 2: Video Scene/Character Image =====
      if (path === '/api/studio/short/video-image' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.prompt) return json({ error: 'missing_prompt' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'short.video_image', plan, reqType, cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateShortVideoImage(env, { model: body.model, prompt: body.prompt, plan, apiKey });
          return json({ ok: true, data: out.data, mimeType: out.mimeType }, 200, cors);
        } catch (e) {
          return json({ error: 'image_error', detail: friendlyError(e) }, 500, cors);
        }
      }

  return null;
}
