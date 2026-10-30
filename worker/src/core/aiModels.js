import {
  AI_MODEL_REGISTRY, AI_TASKS_BY_CATEGORY, AI_CAPABILITIES_BY_CATEGORY,
  MODEL_CATEGORIES,
} from '../config/models.js';

function parseArray(value, fallback) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return fallback.slice();
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : fallback.slice(); }
  catch (_) { return fallback.slice(); }
}

function normalizeModel(model) {
  const category = MODEL_CATEGORIES.includes(model.category) ? model.category : 'text';
  return {
    id: model.id, name: model.name || model.id, category,
    provider: model.provider || 'gemini',
    capabilities: parseArray(model.capabilities_json ?? model.capabilities, AI_CAPABILITIES_BY_CATEGORY[category]),
    supported_tasks: parseArray(model.supported_tasks_json ?? model.supported_tasks, AI_TASKS_BY_CATEGORY[category]),
    status: model.status === 'deprecated' ? 'deprecated' : 'active',
    enabled: model.enabled !== 0 && model.enabled !== false,
    is_default: model.is_default === 1 || model.is_default === true,
    plan_access: model.plan_access === 'PRO' ? 'PRO' : 'FREE',
  };
}

export async function getAiModels(env) {
  const map = {};
  for (const model of AI_MODEL_REGISTRY) map[model.id] = normalizeModel(model);
  if (env?.DB) {
    let results = null;
    try {
      ({ results } = await env.DB.prepare(
        'SELECT id, name, category, enabled, is_default, plan_access, provider, capabilities_json, supported_tasks_json, status FROM ai_models'
      ).all());
    } catch (_) {
      try {
        ({ results } = await env.DB.prepare(
          'SELECT id, name, category, enabled, is_default, plan_access FROM ai_models'
        ).all());
      } catch (_) { results = null; }
    }
    for (const row of results || []) {
      if (!row?.id) continue;
      const model = normalizeModel({ ...row, name: String(row.name || '').trim() || row.id });
      map[model.id] = model;
    }
  }
  return Object.values(map);
}

export async function listEnabledModels(env, category, plan, task) {
  const all = await getAiModels(env);
  return all.filter((model) => {
    if (!model.enabled || model.status !== 'active') return false;
    if (category && model.category !== category) return false;
    if (model.plan_access === 'PRO' && plan !== 'PRO') return false;
    if (task && !model.supported_tasks.includes(task)) return false;
    return true;
  });
}

export async function resolveModel(env, category, plan, userChoice, task) {
  const candidates = await listEnabledModels(env, category, plan, task);
  if (userChoice) {
    const selected = candidates.find((model) => model.id === userChoice);
    if (selected) return selected.id;
  }
  const preferred = candidates.find((model) => model.is_default) || candidates[0];
  if (preferred) return preferred.id;
  const fallback = AI_MODEL_REGISTRY.find((model) =>
    model.category === category && (!task || model.supported_tasks.includes(task))
  );
  return fallback ? fallback.id : '';
}

export async function setAiModel(env, data) {
  if (!env?.DB) throw new Error('db_missing');
  const id = String(data?.id || '').trim();
  if (!id) throw new Error('missing_id');
  const category = MODEL_CATEGORIES.includes(data?.category) ? data.category : 'text';
  const name = String(data?.name || id).trim().slice(0, 80) || id;
  const planAccess = data?.plan_access === 'PRO' ? 'PRO' : 'FREE';
  const enable = data?.enabled !== undefined ? !!data.enabled : true;
  const isDefault = !!data?.is_default;
  const rawProvider = String(data?.provider || 'gemini');
  const provider = /^[a-z0-9_-]{1,40}$/i.test(rawProvider) ? rawProvider.toLowerCase() : 'gemini';
  const capabilities = Array.isArray(data?.capabilities)
    ? [...new Set(data.capabilities.filter(v => typeof v === 'string').map(v => v.slice(0, 60)))].slice(0, 30)
    : AI_CAPABILITIES_BY_CATEGORY[category];
  const supportedTasks = Array.isArray(data?.supported_tasks)
    ? [...new Set(data.supported_tasks.filter(v => AI_TASKS_BY_CATEGORY[category].includes(v)))].slice(0, 30)
    : AI_TASKS_BY_CATEGORY[category];
  const status = data?.status === 'deprecated' ? 'deprecated' : 'active';
  const current = await getAiModels(env);
  const others = current.filter(m => m.category === category && m.id !== id && m.enabled && m.status === 'active');
  if ((!enable || status !== 'active') && others.length === 0) throw new Error('last_model');
  if (isDefault && (!enable || status !== 'active')) throw new Error('invalid_default');
  if (isDefault) await env.DB.prepare('UPDATE ai_models SET is_default=0 WHERE category=?').bind(category).run();

  try {
    await env.DB.prepare(
      'INSERT INTO ai_models (id, name, category, enabled, is_default, plan_access, provider, capabilities_json, supported_tasks_json, status, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime(\'now\')) ' +
      'ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, enabled=excluded.enabled, is_default=excluded.is_default, plan_access=excluded.plan_access, provider=excluded.provider, capabilities_json=excluded.capabilities_json, supported_tasks_json=excluded.supported_tasks_json, status=excluded.status, updated_at=excluded.updated_at'
    ).bind(id, name, category, enable ? 1 : 0, isDefault ? 1 : 0, planAccess, provider, JSON.stringify(capabilities), JSON.stringify(supportedTasks), status).run();
  } catch (error) {
    const message = String(error?.message || error);
    if (!/no such column|has no column named/i.test(message)) throw error;
    await env.DB.prepare(
      'INSERT INTO ai_models (id, name, category, enabled, is_default, plan_access, updated_at) VALUES (?,?,?,?,?,?,datetime(\'now\')) ' +
      'ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, enabled=excluded.enabled, is_default=excluded.is_default, plan_access=excluded.plan_access, updated_at=excluded.updated_at'
    ).bind(id, name, category, enable ? 1 : 0, isDefault ? 1 : 0, planAccess).run();
  }

  let effectiveDefault = isDefault;
  if (enable && !effectiveDefault) {
    const row = await env.DB.prepare('SELECT COUNT(*) AS c FROM ai_models WHERE category=? AND is_default=1 AND enabled=1').bind(category).first();
    if (!row || !row.c || Number(row.c) === 0) {
      await env.DB.prepare('UPDATE ai_models SET is_default=1 WHERE id=?').bind(id).run();
      effectiveDefault = true;
    }
  }
  return { id, name, category, provider, capabilities, supported_tasks: supportedTasks, status, enabled: enable, is_default: effectiveDefault, plan_access: planAccess };
}

export async function deleteAiModel(env, id) {
  if (!env?.DB) throw new Error('db_missing');
  const current = await getAiModels(env);
  const target = current.find(m => m.id === id);
  if (!target) return { ok: false, reason: 'not_found' };
  const others = current.filter(m => m.category === target.category && m.id !== id && m.enabled && m.status === 'active');
  if (others.length === 0) throw new Error('last_model');
  await env.DB.prepare('DELETE FROM ai_models WHERE id=?').bind(id).run();
  return { ok: true };
}
