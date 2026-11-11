import { generateStory, reviseStory } from '../../studios/story/index.js';

export async function handleStoryStudioRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, friendlyError, ndjsonResponse } = deps;

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
            const apiKey = body.apiKey;
            const out = await generateStory(env, {
              model: body.model, idea: body.idea, type: reqType, plan, apiKey,
              onChunk: (t) => send({ type: 'chunk', text: t }),
            });
            await trackUsageSafe(env, payload.sub, 'ai');
            send({ type: 'done', result: out });
          }, cors);
        }
        try {
          const apiKey = body.apiKey;
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
            const apiKey = body.apiKey;
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
          const apiKey = body.apiKey;
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

  return null;
}
