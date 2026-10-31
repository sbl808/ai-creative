import { generateStory, reviseStory, generateStoryVideoPlan, generateStoryVideoImage } from '../../studios/story.js';

export async function handleStoryStudioRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, getUserApiKey, friendlyError, ndjsonResponse, isStudioEnabled } = deps;

      // ===== Story Studio — Tab 1: Generate =====
      if (path === '/api/studio/story/generate' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.idea) return json({ error: 'missing_idea' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'story.generate', plan, reqType, cors); if (denied) return denied; }
        // ===== GLOBAL RESULT STREAMING — real-time NDJSON stream (Accept: application/x-ndjson) =====
        if (String(request.headers.get('Accept') || '').indexOf('application/x-ndjson') !== -1) {
          return ndjsonResponse(async (send) => {
            let apiKey = body.apiKey;
            if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
            const out = await generateStory(env, {
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
          const out = await generateStory(env, { model: body.model,  idea: body.idea, type: reqType, plan, apiKey });
          await trackUsageSafe(env, payload.sub, 'ai');
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'story_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Story Studio — Tab 1: Revise (Chat) =====
      if (path === '/api/studio/story/revise' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.instruction) return json({ error: 'missing_instruction' }, 400, cors);
        if (!body.currentStory) return json({ error: 'missing_current_story' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        { const denied = await requireFeature(env, 'story.revise', plan, reqType, cors); if (denied) return denied; }
        // ===== GLOBAL RESULT STREAMING — real-time NDJSON stream =====
        if (String(request.headers.get('Accept') || '').indexOf('application/x-ndjson') !== -1) {
          return ndjsonResponse(async (send) => {
            let apiKey = body.apiKey;
            if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
            const out = await reviseStory(env, {
              model: body.model,
              idea: body.idea || '',
              type: reqType,
              currentStory: body.currentStory,
              instruction: body.instruction,
              plan, apiKey,
              onChunk: (t) => send({ type: 'chunk', text: t }),
            });
            send({ type: 'done', result: out });
          }, cors);
        }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await reviseStory(env, { model: body.model, 
            idea: body.idea || '',
            type: reqType,
            currentStory: body.currentStory,
            instruction: body.instruction,
            plan, apiKey,
          });
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'revise_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Story Studio — Tab 2: Video Plan (04 Form → 05/06) =====
      // Backward Compat: ယခင် body.idea ကိုလည်း ဆက်လက်လက်ခံသည်။
      // Story Video = Feature-level PRO gate (§3) — Visual Style + Video Workflow သည်
      // Story Video အတွင်းရှိ configuration သာ (type-based gate မသုံးတော့ပါ)။
      if (path === '/api/studio/story/video' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || (!body.idea && !body.story)) return json({ error: 'missing_idea' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        { const denied = await requireFeature(env, 'story.video', plan, '1', cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateStoryVideoPlan(env, {
            model: body.model,
            story: body.story || body.idea || '',
            idea: body.idea || body.story || '',
            type: body.type || '1',
            videoType: body.videoType,
            workflow: body.workflow,
            visualStyle: body.visualStyle,
            storyFacts: body.storyFacts,
            duration: body.duration,
            sceneDuration: body.sceneDuration,
            aspectRatio: body.aspectRatio,
            cameraStyle: body.cameraStyle,
            language: body.language,
            environmentStyle: body.environmentStyle,
            characterContinuity: body.characterContinuity,
            characterConsistency: body.characterConsistency,
            referenceImage: body.referenceImage,
            characterDirection: body.characterDirection || '',
            cameraDirection: body.cameraDirection || '',
            lighting: body.lighting || '',
            environmentDetails: body.environmentDetails || '',
            colorMood: body.colorMood || '',
            transitionPacing: body.transitionPacing || '',
            audioDirection: body.audioDirection || '',
            additionalInstructions: body.additionalInstructions,
            plan, apiKey,
          });
          await trackUsageSafe(env, payload.sub, 'ai');
          return json({ ok: true, ...out }, 200, cors);
        } catch (e) {
          return json({ error: 'video_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // ===== Story Studio — Tab 2: Video Scene/Character Image =====
      // Story Video ၏ အစိတ်အပိုင်း — Feature-level PRO gate အတိုင်း လိုက်နာသည်
      if (path === '/api/studio/story/video-image' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.prompt) return json({ error: 'missing_prompt' }, 400, cors);
        const plan = await resolvePlan(env, payload);
        { const denied = await requireFeature(env, 'story.video_image', plan, '1', cors); if (denied) return denied; }
        try {
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateStoryVideoImage(env, { model: body.model, prompt: body.prompt, plan, apiKey });
          return json({ ok: true, data: out.data, mimeType: out.mimeType }, 200, cors);
        } catch (e) {
          return json({ error: 'image_error', detail: friendlyError(e) }, 500, cors);
        }
      }

  return null;
}
