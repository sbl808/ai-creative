import { generateShopContent, reviseShopContent, generateShopVideo, generateShopVideoImage } from '../../studios/shop.js';

export async function handleShopStudioRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, getUserApiKey, friendlyError, ndjsonResponse } = deps;

      // ===== Shop Studio — Tab 1: Generate =====
      if (path === '/api/studio/shop/content/generate' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.idea) return json({ error: 'missing_idea' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'shop.content_generate', plan, reqType, cors); if (denied) return denied; }
        // ===== GLOBAL RESULT STREAMING — real-time NDJSON stream (Accept: application/x-ndjson) =====
        if (String(request.headers.get('Accept') || '').indexOf('application/x-ndjson') !== -1) {
          return ndjsonResponse(async (send) => {
            let apiKey = body.apiKey;
            if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
            const out = await generateShopContent(env, {
              model: body.model, idea: body.idea, type: reqType, plan, apiKey, images: body.images || [],
              onChunk: (t) => send({ type: 'chunk', text: t }),
            });
            await trackUsageSafe(env, payload.sub, 'ai');
            send({ type: 'done', result: out });
          }, cors);
        }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateShopContent(env, { model: body.model,  idea: body.idea, type: reqType, plan, apiKey, images: body.images || [] });
          await trackUsageSafe(env, payload.sub, 'ai');
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'shop_content_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Shop Studio — Tab 1: Revise (Chat) =====
      if (path === '/api/studio/shop/content/revise' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.instruction) return json({ error: 'missing_instruction' }, 400, cors);
        if (!body.currentContent) return json({ error: 'missing_current_content' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'shop.content_revise', plan, reqType, cors); if (denied) return denied; }
        // ===== GLOBAL RESULT STREAMING — real-time NDJSON stream =====
        if (String(request.headers.get('Accept') || '').indexOf('application/x-ndjson') !== -1) {
          return ndjsonResponse(async (send) => {
            let apiKey = body.apiKey;
            if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
            const out = await reviseShopContent(env, {
              model: body.model,
              idea: body.idea || '', type: reqType, currentContent: body.currentContent,
              instruction: body.instruction, plan, apiKey,
              onChunk: (t) => send({ type: 'chunk', text: t }),
            });
            send({ type: 'done', result: out });
          }, cors);
        }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await reviseShopContent(env, { model: body.model, 
            idea: body.idea || '', type: reqType, currentContent: body.currentContent,
            instruction: body.instruction, plan, apiKey,
          });
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'revise_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Shop Studio — Tab 2: Video Plan =====
      if (path === '/api/studio/shop/video/generate' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.idea) return json({ error: 'missing_idea' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'shop.video_generate', plan, reqType, cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateShopVideo(env, { model: body.model,  idea: body.idea, type: reqType, plan, apiKey, images: body.images || [] });
          await trackUsageSafe(env, payload.sub, 'ai');
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'video_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Shop Studio — Tab 2: Video Scene/Character/Product Image =====
      if (path === '/api/studio/shop/video-image' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.prompt) return json({ error: 'missing_prompt' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'shop.video_image', plan, reqType, cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateShopVideoImage(env, { model: body.model, prompt: body.prompt, plan, apiKey, images: body.images || [] });
          return json({ ok: true, data: out.data, mimeType: out.mimeType }, 200, cors);
        } catch (e) {
          return json({ error: 'image_error', detail: friendlyError(e) }, 500, cors);
        }
      }

  return null;
}
