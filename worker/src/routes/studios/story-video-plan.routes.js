import { generateStoryVideoPlan, generateStoryVideoImage } from '../../studios/story-video-plan.js';
import { generateVideoPlan } from '../../video-plans/engine.js';

// Story Video Plan API routes are isolated from Story Studio routes.
export async function handleStoryVideoPlanRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, friendlyError } = deps;

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
          const apiKey = body.apiKey;
          const out = await generateVideoPlan({
            studioId: 'story',
            generate: () => generateStoryVideoPlan(env, {
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
            }),
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
          const apiKey = body.apiKey;
          const out = await generateStoryVideoImage(env, { model: body.model, prompt: body.prompt, plan, apiKey });
          return json({ ok: true, data: out.data, mimeType: out.mimeType }, 200, cors);
        } catch (e) {
          return json({ error: 'image_error', detail: friendlyError(e) }, 500, cors);
        }
      }

  return null;
}
