// CMS repository: all platform-managed CMS reads and writes live here.
// User-generated content remains in the browser IndexedDB; this module stores CMS configuration only.

const CMS_PROMPT_FIELDS = [
  'studio', 'plan', 'type', 'core', 'memory', 'knowledge',
  'workflow', 'template', 'prompt', 'quality_check', 'final_output',
];

function requireDatabase(env) {
  if (!env || !env.DB) throw new Error('db_unavailable');
}

function normalizeCMSPrompt(input) {
  if (!input || typeof input !== 'object') throw new Error('invalid_cms_prompt');
  const values = CMS_PROMPT_FIELDS.map((field) => {
    const value = input[field];
    return value === undefined || value === null ? '' : String(value);
  });
  values[0] = values[0].trim().toUpperCase();
  values[1] = values[1].trim().toUpperCase();
  values[2] = values[2].trim();
  if (!values[0] || !values[1] || !values[2]) throw new Error('missing_cms_prompt_fields');
  if (!['FREE', 'PRO'].includes(values[1])) throw new Error('invalid_cms_plan');
  if (values[0].length > 64 || values[2].length > 64) throw new Error('invalid_cms_prompt_scope');
  return values;
}

function normalizeBrainEntry(input) {
  if (!input || typeof input !== 'object') throw new Error('invalid_brain_entry');
  const scope = String(input.scope || '').trim().toUpperCase();
  const module = String(input.module || '').trim().toUpperCase();
  const type = String(input.type || 'BASE').trim().toUpperCase();
  const plan = String(input.plan || 'FREE').trim().toUpperCase();
  const key = String(input.key || '').trim();
  const value = input.value === undefined || input.value === null ? '' : String(input.value);
  const versionInput = input.version === undefined || input.version === null || input.version === '' ? 1 : Number(input.version);
  const version = Number.isSafeInteger(versionInput) && versionInput > 0 ? versionInput : null;
  const moduleByScope = {
    GLOBAL_BRAIN: ['GLOBAL_FRAMEWORK'],
    STORY_TYPES: ['STORY_TYPE'],
    STORY_VIDEO: ['VIDEO_KNOWLEDGE', 'VISUAL_STYLE', 'VIDEO_WORKFLOW'],
  };
  if (!scope || !module || !type || !plan || !key) throw new Error('missing_brain_entry_fields');
  if (!moduleByScope[scope] || !moduleByScope[scope].includes(module)) throw new Error('invalid_brain_scope_module');
  if (!['FREE', 'PRO'].includes(plan)) throw new Error('invalid_brain_plan');
  if (!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(type) || key.length > 100) throw new Error('invalid_brain_type_or_key');
  if ((module === 'GLOBAL_FRAMEWORK' || module === 'VIDEO_KNOWLEDGE') && type !== 'BASE') throw new Error('invalid_brain_type_for_module');
  if (module === 'STORY_TYPE' && !/^TYPE_[1-9][0-9]*$/.test(type)) throw new Error('invalid_story_type');
  if (!version) throw new Error('invalid_brain_version');
  return { scope, module, type, plan, key, value, version };
}

function normalizeId(id) {
  const value = Number(id);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('invalid_cms_id');
  return value;
}

export async function getCMSData(env, studio, plan, type) {
  requireDatabase(env);
  const { results } = await env.DB.prepare(
    'SELECT core, memory, knowledge, workflow, template, prompt, quality_check, final_output ' +
    'FROM cms_prompts WHERE lower(studio)=lower(?) AND lower(plan)=lower(?) AND type=?'
  ).bind(studio, plan, type).all();
  return results && results.length ? results[0] : null;
}

export async function listCMSPrompts(env) {
  requireDatabase(env);
  const { results } = await env.DB.prepare('SELECT * FROM cms_prompts ORDER BY studio, plan, type').all();
  return results || [];
}

export async function createCMSPrompt(env, input) {
  requireDatabase(env);
  const values = normalizeCMSPrompt(input);
  await env.DB.prepare(
    "INSERT OR REPLACE INTO cms_prompts (studio,plan,type,core,memory,knowledge,workflow,template,prompt,quality_check,final_output,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))"
  ).bind(...values).run();
  return Object.fromEntries(CMS_PROMPT_FIELDS.map((field, index) => [field, values[index]]));
}

export async function updateCMSPrompt(env, id, input) {
  requireDatabase(env);
  const numericId = normalizeId(id);
  const values = normalizeCMSPrompt(input);
  const sets = CMS_PROMPT_FIELDS.map((field) => field + '=?').join(',');
  await env.DB.prepare(
    "UPDATE cms_prompts SET " + sets + ", updated_at=datetime('now') WHERE id=?"
  ).bind(...values, numericId).run();
  return Object.fromEntries(CMS_PROMPT_FIELDS.map((field, index) => [field, values[index]]));
}

export async function deleteCMSPrompt(env, id) {
  requireDatabase(env);
  return env.DB.prepare('DELETE FROM cms_prompts WHERE id=?').bind(normalizeId(id)).run();
}

export async function listBrainEntries(env) {
  requireDatabase(env);
  const { results } = await env.DB.prepare(
    'SELECT * FROM cms_brain ORDER BY scope, module, type, key'
  ).all();
  return results || [];
}

export async function upsertBrainEntry(env, input) {
  requireDatabase(env);
  const entry = normalizeBrainEntry(input);
  await env.DB.prepare(
    "INSERT INTO cms_brain (scope,module,type,plan,key,value,active,version,updated_at) VALUES (?,?,?,?,?,?,1,?,datetime('now')) " +
    'ON CONFLICT(scope,module,type,plan,key) DO UPDATE SET value=excluded.value, active=1, version=excluded.version, updated_at=excluded.updated_at'
  ).bind(entry.scope, entry.module, entry.type, entry.plan, entry.key, entry.value, entry.version).run();
  return entry;
}

export async function updateBrainEntry(env, id, input) {
  requireDatabase(env);
  const numericId = normalizeId(id);
  const entry = normalizeBrainEntry(input);
  return env.DB.prepare(
    "UPDATE cms_brain SET scope=?, module=?, type=?, plan=?, key=?, value=?, version=?, updated_at=datetime('now') WHERE id=?"
  ).bind(entry.scope, entry.module, entry.type, entry.plan, entry.key, entry.value, entry.version, numericId).run();
}

export async function deleteBrainEntry(env, id) {
  requireDatabase(env);
  return env.DB.prepare('DELETE FROM cms_brain WHERE id=?').bind(normalizeId(id)).run();
}
