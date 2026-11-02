// Shared HTTP and error helpers for Task Catalog / Task Instructions admin APIs.
import { logAdminAction } from '../core/adminLogs.js';

export function taskApiJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function readTaskApiBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch (_) {
    return null;
  }
}

export function taskApiError(error) {
  const code = String(error && error.message || error);
  const statusByCode = {
    db_unavailable: 503,
    task_not_found: 404,
    version_not_found: 404,
    task_instruction_set_not_found: 404,
    task_instruction_draft_not_found: 404,
    revision_conflict: 409,
    task_already_exists: 409,
    task_id_is_immutable: 409,
    task_status_requires_status_endpoint: 400,
    invalid_version_state: 409,
    approval_required: 409,
    instruction_integrity_error: 409,
    version_task_mismatch: 409,
    task_instruction_publish_failed: 409,
    task_instruction_rollback_failed: 409,
    task_disabled: 409,
    task_instruction_not_published: 409,
    task_instruction_set_create_failed: 500,
    task_instruction_version_conflict: 409,
    secure_id_generation_unavailable: 503,
    content_hash_unavailable: 503,
  };
  if (statusByCode[code]) return taskApiJson({ error: code }, statusByCode[code]);
  if (code.startsWith('invalid_') || code.startsWith('missing_') ||
      code.startsWith('too_many_') || code.startsWith('invalid_prompt_') || code.startsWith('instruction_field_') ||
      code.startsWith('instruction_fields_')) {
    return taskApiJson({ error: code }, 400);
  }
  return taskApiJson({ error: 'internal_error' }, 500);
}

export async function logTaskAdminAction(env, user, action, metadata) {
  const detail = JSON.stringify(metadata || {}).slice(0, 500);
  await logAdminAction(env, user && user.email, action, detail);
}

export function isSameOriginMutation(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch (_) {
    return false;
  }
}
