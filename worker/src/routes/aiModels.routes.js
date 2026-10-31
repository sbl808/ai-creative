import { listEnabledModels } from '../core/aiModels.js';

export async function handleAiModelRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const url = new URL(request.url);
  const { bearer, verifyTokenSafe, json, resolvePlan } = deps;

      // ===== Phase C — AI Models List (User အတွက် Studio Dropdown) =====
      // ဖွင့်ထားသော + User ၏ Plan နှင့် ကိုက်ညီသော Model များကိုသာ ပြန်ပို့သည်
      if (path === '/api/ai-models' && request.method === 'GET') {
        const token = bearer(request);
        if (!token) return json({ error: 'unauthorized' }, 401, cors);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) return json({ error: 'invalid_token' }, 401, cors);
        const plan = await resolvePlan(env, payload);
        const cat = new URL(request.url).searchParams.get('category') || '';
        const task = String(url.searchParams.get('task') || '').trim().slice(0, 80);
        const items = await listEnabledModels(env, cat || undefined, plan, task || undefined);
        return json({
          ok: true,
          items: items.map((m) => ({ id: m.id, name: m.name, category: m.category, plan_access: m.plan_access })),
        }, 200, cors);
      }

  return null;
}
