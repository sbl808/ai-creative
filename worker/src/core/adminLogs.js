// Minimal platform audit log service.
// Only allowlisted action/result codes and a timestamp are persisted.
const ACTION_CODES = new Set([
  'plan_create', 'plan_update', 'plan_delete', 'plan_contacts_update',
  'cms_create', 'cms_update', 'cms_delete',
  'brain_create', 'brain_update', 'brain_delete',
  'user_plan', 'settings_initialize', 'studio_toggle', 'feature_update',
  'model_create', 'model_update', 'model_delete',
  'task_instruction_draft_save', 'task_instruction_draft_reset',
  'task_instruction_submit', 'task_instruction_approved',
  'task_instruction_rejected', 'task_instruction_publish',
  'task_instruction_rollback', 'task_catalog_create',
  'task_catalog_status', 'task_catalog_update',
]);
const RESULT_CODES = new Set(['success']);

async function logAdminAction(env, actionCode, resultCode = 'success') {
  if (!env || !env.DB) return;
  const action = String(actionCode || '');
  const result = String(resultCode || '');
  if (!ACTION_CODES.has(action) || !RESULT_CODES.has(result)) return;
  try {
    await env.DB.prepare(
      "INSERT INTO admin_logs (action_code, result_code, created_at) VALUES (?, ?, datetime('now'))"
    ).bind(action, result).run();
  } catch (_) { /* Best-effort audit logging; never disrupt the main action. */ }
}

async function listAdminLogs(env, limit) {
  if (!env || !env.DB) return [];
  const n = Number(limit) > 0 ? Math.min(Number(limit), 200) : 50;
  try {
    const { results } = await env.DB.prepare(
      'SELECT action_code, result_code, created_at FROM admin_logs ORDER BY id DESC LIMIT ?'
    ).bind(n).all();
    return results;
  } catch (_) { return []; }
}

export { logAdminAction, listAdminLogs };
