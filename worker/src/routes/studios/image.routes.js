import { generateImagePrompt, generateAdImagePrompt, generateImageFromPrompt } from '../../studios/image.js';

export async function handleImageStudioRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, getUserApiKey, friendlyError, ndjsonResponse } = deps;

      // ===== Image Studio — Tab 1: Image Prompt Generate =====
      if (path === '/api/studio/image/prompt' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.idea) return json({ error: 'missing_idea' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'image.prompt', plan, reqType, cors); if (denied) return denied; }
        // ===== GLOBAL RESULT STREAMING — real-time NDJSON stream (Accept: application/x-ndjson) =====
        if (String(request.headers.get('Accept') || '').indexOf('application/x-ndjson') !== -1) {
          return ndjsonResponse(async (send) => {
            let apiKey = body.apiKey;
            if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
            const out = await generateImagePrompt(env, {
              model: body.model,
              idea: body.idea, type: reqType, plan, apiKey,
              images: body.images,
              onChunk: (t) => send({ type: 'chunk', text: t }),
            });
            send({ type: 'done', result: out });
          }, cors);
        }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateImagePrompt(env, { model: body.model, 
            idea: body.idea, type: reqType, plan, apiKey,
            images: body.images,
          });
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'image_prompt_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Image Studio — Tab 2: Ad Image Prompt Generate =====
      if (path === '/api/studio/image/ad-prompt' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.idea) return json({ error: 'missing_idea' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'image.ad_prompt', plan, reqType, cors); if (denied) return denied; }
        // ===== GLOBAL RESULT STREAMING — real-time NDJSON stream =====
        if (String(request.headers.get('Accept') || '').indexOf('application/x-ndjson') !== -1) {
          return ndjsonResponse(async (send) => {
            let apiKey = body.apiKey;
            if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
            const out = await generateAdImagePrompt(env, {
              model: body.model,
              idea: body.idea, type: reqType, plan, apiKey,
              images: body.images,
              onChunk: (t) => send({ type: 'chunk', text: t }),
            });
            send({ type: 'done', result: out });
          }, cors);
        }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateAdImagePrompt(env, { model: body.model, 
            idea: body.idea, type: reqType, plan, apiKey,
            images: body.images,
          });
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'ad_prompt_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Image Studio — Tab 1 & 2: Generate Actual Image from Prompt =====
      if (path === '/api/studio/image/generate' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.prompt) return json({ error: 'missing_prompt' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'image.generate', plan, reqType, cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateImageFromPrompt(env, { model: body.model, prompt: body.prompt, plan, apiKey });
          await trackUsageSafe(env, payload.sub, 'image');
          return json({ ok: true, data: out.data, mimeType: out.mimeType }, 200, cors);
        } catch (e) {
          return json({ error: 'image_generate_error', detail: friendlyError(e) }, 500, cors);
        }
      }

  return null;
}
