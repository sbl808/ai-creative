import { listPlanCatalog, getPlanContactSettings, validateContactUrl } from '../core/planCatalog.js';

export async function handlePlanRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const url = new URL(request.url);
  const { json } = deps;

      if (path === '/api/plans' && request.method === 'GET') {
        try {
          const items = await listPlanCatalog(env, false);
          const stored = await getPlanContactSettings(env);
          const contacts = { facebook_messenger_url: '', telegram_url: '' };
          for (const key of Object.keys(contacts)) {
            try { contacts[key] = validateContactUrl(key, stored[key]); } catch (_) {}
          }
          return json({ ok: true, items, contacts }, 200, cors);
        } catch (e) {
          return json({ error: 'plan_catalog_unavailable', detail: 'Plan information is temporarily unavailable.' }, 503, cors);
        }
      }

  return null;
}
