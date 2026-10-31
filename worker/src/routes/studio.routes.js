import { generateStudio } from '../studio.js';

export async function handleGenericStudioRoute(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const url = new URL(request.url);
  const { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, getUserApiKey, trackUsageSafe, friendlyError, getStudio, isStudioEnabled } = deps;

      if (path === '/api/studio/generate' && request.method === 'POST') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const body = await request.json().catch(() => null);
        if (!body || !body.studio || !body.idea) return json({ error: 'missing_studio_or_idea' }, 400, cors);
        // The generic endpoint must honor the same server-side Studio Gate as dedicated routes.
        const requestedStudio = String(body.studio).toLowerCase();
        if (getStudio(requestedStudio)) {
          const studioEnabled = await isStudioEnabled(env, requestedStudio);
          if (!studioEnabled) return json({ error: 'studio_disabled', message: 'This studio is currently disabled.' }, 403, cors);
        }
        const plan = await resolvePlan(env, payload);
        const reqType = String(body.type || '1');
        // Generic Generate must honor the selected studio's Admin feature gate as well as the shared gate.
        const studioFeatureId = requestedStudio === 'content' ? 'content.generate'
          : requestedStudio === 'story' ? 'story.generate'
          : null;
        if (studioFeatureId) {
          const studioFeatureDenied = await requireFeature(env, studioFeatureId, plan, reqType, cors);
          if (studioFeatureDenied) return studioFeatureDenied;
        }
        { const denied = await requireFeature(env, 'generate', plan, reqType, cors); if (denied) return denied; }
        try {
          // BYOK: Request ထဲ Key မပါလျှင် User သိမ်းထားသော Key ကို အလိုအလျောက် ရှာသည်
          let apiKey = body.apiKey;
          if (!apiKey) apiKey = await getUserApiKey(env, payload.sub);
          const out = await generateStudio(env, {
            studio: String(body.studio).toUpperCase(),
            type: String(body.type || '1'),
            idea: body.idea,
            plan,
            apiKey,
            model: body.model,
          });
          await trackUsageSafe(env, payload.sub, 'ai');
          return json(out, 200, cors);
        } catch (e) {
          return json({ error: 'studio_error', detail: friendlyError(e) }, 500, cors);
        }
      }

  return null;
}
