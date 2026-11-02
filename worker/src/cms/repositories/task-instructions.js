// Task Instructions repository.
// Stores platform-managed trusted instructions only; user-created content stays in IndexedDB.

const TASK_ID_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/;
const RESERVED_FIELD_NAMES = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_FIELDS = 64;
const MAX_FIELD_VALUE_LENGTH = 30000;
const MAX_FIELDS_JSON_LENGTH = 100000;

function requireDatabase(env) {
  if (!env || !env.DB) throw new Error('db_unavailable');
}

function normalizeTaskId(value) {
  const taskId = String(value || '').trim().toLowerCase();
  if (!TASK_ID_PATTERN.test(taskId) || taskId.length > 100) {
    throw new Error('invalid_task_id');
  }
  return taskId;
}

function normalizeId(value, errorCode) {
  const id = String(value || '').trim();
  if (!id || id.length > 100) throw new Error(errorCode);
  return id;
}

function createId() {
  if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== 'function') {
    throw new Error('secure_id_generation_unavailable');
  }
  return globalThis.crypto.randomUUID();
}

function normalizeFields(value) {
  let fields = value;
  if (typeof fields === 'string') {
    try {
      fields = JSON.parse(fields);
    } catch (_) {
      throw new Error('invalid_instruction_fields');
    }
  }
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw new Error('invalid_instruction_fields');
  }

  const entries = Object.entries(fields);
  if (entries.length > MAX_FIELDS) throw new Error('too_many_instruction_fields');

  const normalized = {};
  for (const [key, fieldValue] of entries) {
    if (!FIELD_NAME_PATTERN.test(key) || RESERVED_FIELD_NAMES.has(key)) {
      throw new Error('invalid_instruction_field_name');
    }
    if (
      typeof fieldValue !== 'string' &&
      typeof fieldValue !== 'number' &&
      typeof fieldValue !== 'boolean'
    ) {
      throw new Error('invalid_instruction_field_value');
    }
    if (typeof fieldValue === 'string' && fieldValue.length > MAX_FIELD_VALUE_LENGTH) {
      throw new Error('instruction_field_too_large');
    }
    normalized[key] = fieldValue;
  }

  const serialized = JSON.stringify(normalized);
  if (serialized.length > MAX_FIELDS_JSON_LENGTH) {
    throw new Error('instruction_fields_too_large');
  }
  return normalized;
}

function canonicalizeFields(fields) {
  const canonical = {};
  Object.keys(fields).sort().forEach((key) => {
    canonical[key] = fields[key];
  });
  return JSON.stringify(canonical);
}

async function hashFields(fields) {
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    throw new Error('content_hash_unavailable');
  }
  const bytes = new TextEncoder().encode(canonicalizeFields(fields));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function mapInstructionSet(row) {
  if (!row) return null;
  return {
    instruction_id: row.instruction_id,
    task_id: row.task_id,
    active_version_id: row.active_version_id || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapDraft(row) {
  if (!row) return null;
  let fields;
  try {
    fields = JSON.parse(row.fields_json);
  } catch (_) {
    throw new Error('invalid_instruction_fields');
  }
  return {
    draft_id: row.draft_id,
    instruction_id: row.instruction_id,
    fields,
    revision: Number(row.revision),
    updated_by: row.updated_by || null,
    updated_at: row.updated_at,
  };
}

function mapVersion(row) {
  if (!row) return null;
  let fields;
  try {
    fields = JSON.parse(row.fields_json);
  } catch (_) {
    throw new Error('invalid_instruction_fields');
  }
  return {
    version_id: row.version_id,
    instruction_id: row.instruction_id,
    version_number: Number(row.version_number),
    fields,
    content_hash: row.content_hash,
    status: row.status,
    created_by: row.created_by || null,
    created_at: row.created_at,
    published_at: row.published_at || null,
  };
}

function mapReview(row) {
  if (!row) return null;
  return {
    review_id: row.review_id,
    version_id: row.version_id,
    decision: row.decision,
    reviewed_by: row.reviewed_by || null,
    comment: row.comment || null,
    reviewed_at: row.reviewed_at,
  };
}

async function getInstructionSetRow(env, taskId) {
  return env.DB.prepare(
    'SELECT instruction_id, task_id, active_version_id, created_at, updated_at ' +
    'FROM task_instruction_sets WHERE task_id = ?'
  ).bind(taskId).first();
}

export async function getTaskInstructionSet(env, taskId) {
  requireDatabase(env);
  const id = normalizeTaskId(taskId);
  return mapInstructionSet(await getInstructionSetRow(env, id));
}

export async function ensureTaskInstructionSet(env, taskId, initialFields = {}) {
  requireDatabase(env);
  const id = normalizeTaskId(taskId);
  const fields = normalizeFields(initialFields);
  const task = await env.DB.prepare(
    'SELECT task_id FROM task_catalog WHERE task_id = ?'
  ).bind(id).first();
  if (!task) throw new Error('task_not_found');

  const existing = await getInstructionSetRow(env, id);
  if (existing) return mapInstructionSet(existing);

  const instructionId = createId();
  const draftId = createId();
  const statements = [
    env.DB.prepare(
      "INSERT OR IGNORE INTO task_instruction_sets (instruction_id, task_id, active_version_id, created_at, updated_at) " +
      "VALUES (?, ?, NULL, datetime('now'), datetime('now'))"
    ).bind(instructionId, id),
    env.DB.prepare(
      "INSERT OR IGNORE INTO task_instruction_drafts (draft_id, instruction_id, fields_json, revision, updated_by, updated_at) " +
      "SELECT ?, instruction_id, ?, 1, NULL, datetime('now') FROM task_instruction_sets WHERE task_id = ? " +
      "AND NOT EXISTS (SELECT 1 FROM task_instruction_drafts d WHERE d.instruction_id = task_instruction_sets.instruction_id)"
    ).bind(draftId, JSON.stringify(fields), id),
  ];

  await env.DB.batch(statements);
  const created = await getInstructionSetRow(env, id);
  if (!created) throw new Error('task_instruction_set_create_failed');
  return mapInstructionSet(created);
}

export async function getTaskInstructionDraft(env, taskId) {
  requireDatabase(env);
  const id = normalizeTaskId(taskId);
  const row = await env.DB.prepare(
    'SELECT d.draft_id, d.instruction_id, d.fields_json, d.revision, d.updated_by, d.updated_at ' +
    'FROM task_instruction_drafts d ' +
    'INNER JOIN task_instruction_sets s ON s.instruction_id = d.instruction_id ' +
    'WHERE s.task_id = ?'
  ).bind(id).first();
  return mapDraft(row);
}

export async function saveTaskInstructionDraft(env, taskId, fieldsInput, expectedRevision, updatedBy = null) {
  requireDatabase(env);
  const id = normalizeTaskId(taskId);
  const fields = normalizeFields(fieldsInput);
  const revision = Number(expectedRevision);
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new Error('invalid_expected_revision');
  }
  const actor = updatedBy === null || updatedBy === undefined ? null : String(updatedBy).trim().slice(0, 200);

  const result = await env.DB.prepare(
    "UPDATE task_instruction_drafts SET fields_json = ?, revision = revision + 1, updated_by = ?, updated_at = datetime('now') " +
    'WHERE instruction_id = (SELECT instruction_id FROM task_instruction_sets WHERE task_id = ?) AND revision = ?'
  ).bind(JSON.stringify(fields), actor, id, revision).run();

  if (!result || !result.meta || Number(result.meta.changes) === 0) {
    const current = await getTaskInstructionDraft(env, id);
    if (!current) {
      const task = await env.DB.prepare('SELECT task_id FROM task_catalog WHERE task_id = ?').bind(id).first();
      if (!task) throw new Error('task_not_found');
      throw new Error('task_instruction_draft_not_found');
    }
    throw new Error('revision_conflict');
  }
  return getTaskInstructionDraft(env, id);
}

export async function resetTaskInstructionDraft(env, taskId, expectedRevision, updatedBy = null) {
  requireDatabase(env);
  const id = normalizeTaskId(taskId);
  const instructionSet = await getInstructionSetRow(env, id);
  if (!instructionSet) {
    const task = await env.DB.prepare('SELECT task_id FROM task_catalog WHERE task_id = ?').bind(id).first();
    if (!task) throw new Error('task_not_found');
    throw new Error('task_instruction_set_not_found');
  }

  let fields = {};
  if (instructionSet.active_version_id) {
    const active = await env.DB.prepare(
      'SELECT fields_json FROM task_instruction_versions WHERE instruction_id = ? AND version_id = ? AND status = ?'
    ).bind(instructionSet.instruction_id, instructionSet.active_version_id, 'published').first();
    if (!active) throw new Error('instruction_integrity_error');
    fields = JSON.parse(active.fields_json);
  }
  return saveTaskInstructionDraft(env, id, fields, expectedRevision, updatedBy);
}

export async function createTaskInstructionVersion(env, taskId, createdBy = null) {
  requireDatabase(env);
  const id = normalizeTaskId(taskId);
  const instructionSet = await getInstructionSetRow(env, id);
  if (!instructionSet) throw new Error('task_instruction_set_not_found');

  const draft = await getTaskInstructionDraft(env, id);
  if (!draft) throw new Error('task_instruction_draft_not_found');

  const fields = normalizeFields(draft.fields);
  const fieldsJson = canonicalizeFields(fields);
  const contentHash = await hashFields(fields);
  const latest = await env.DB.prepare(
    'SELECT COALESCE(MAX(version_number), 0) AS latest_version FROM task_instruction_versions WHERE instruction_id = ?'
  ).bind(instructionSet.instruction_id).first();
  const versionNumber = Number(latest && latest.latest_version || 0) + 1;
  const versionId = createId();
  const actor = createdBy === null || createdBy === undefined ? null : String(createdBy).trim().slice(0, 200);

  try {
    await env.DB.prepare(
      "INSERT INTO task_instruction_versions (version_id, instruction_id, version_number, fields_json, content_hash, status, created_by, created_at, published_at) " +
      "VALUES (?, ?, ?, ?, ?, 'pending', ?, datetime('now'), NULL)"
    ).bind(versionId, instructionSet.instruction_id, versionNumber, fieldsJson, contentHash, actor).run();
  } catch (error) {
    const message = String(error && error.message || error).toLowerCase();
    if (message.includes('unique')) throw new Error('task_instruction_version_conflict');
    throw error;
  }

  return getTaskInstructionVersion(env, versionId);
}

export async function listTaskInstructionVersions(env, taskId) {
  requireDatabase(env);
  const id = normalizeTaskId(taskId);
  const { results } = await env.DB.prepare(
    'SELECT v.version_id, v.instruction_id, v.version_number, v.fields_json, v.content_hash, v.status, v.created_by, v.created_at, v.published_at ' +
    'FROM task_instruction_versions v ' +
    'INNER JOIN task_instruction_sets s ON s.instruction_id = v.instruction_id ' +
    'WHERE s.task_id = ? ORDER BY v.version_number DESC'
  ).bind(id).all();
  return (results || []).map(mapVersion);
}

export async function getTaskInstructionVersion(env, versionId) {
  requireDatabase(env);
  const id = normalizeId(versionId, 'invalid_version_id');
  const row = await env.DB.prepare(
    'SELECT version_id, instruction_id, version_number, fields_json, content_hash, status, created_by, created_at, published_at ' +
    'FROM task_instruction_versions WHERE version_id = ?'
  ).bind(id).first();
  return mapVersion(row);
}

export async function listTaskInstructionReviews(env, versionId) {
  requireDatabase(env);
  const id = normalizeId(versionId, 'invalid_version_id');
  const { results } = await env.DB.prepare(
    'SELECT review_id, version_id, decision, reviewed_by, comment, reviewed_at ' +
    'FROM task_instruction_reviews WHERE version_id = ? ORDER BY reviewed_at DESC, review_id DESC'
  ).bind(id).all();
  return (results || []).map(mapReview);
}

export async function recordTaskInstructionReview(env, versionId, decision, reviewedBy = null, comment = null) {
  requireDatabase(env);
  const id = normalizeId(versionId, 'invalid_version_id');
  const normalizedDecision = String(decision || '').trim().toLowerCase();
  if (!['approved', 'rejected'].includes(normalizedDecision)) {
    throw new Error('invalid_review_decision');
  }
  const actor = reviewedBy === null || reviewedBy === undefined ? null : String(reviewedBy).trim().slice(0, 200);
  const reviewComment = comment === null || comment === undefined ? null : String(comment).trim().slice(0, 2000);
  const reviewId = createId();

  const results = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO task_instruction_reviews (review_id, version_id, decision, reviewed_by, comment, reviewed_at) " +
      "SELECT ?, version_id, ?, ?, ?, datetime('now') FROM task_instruction_versions " +
      "WHERE version_id = ? AND status = 'pending'"
    ).bind(reviewId, normalizedDecision, actor, reviewComment, id),
    env.DB.prepare(
      'UPDATE task_instruction_versions SET status = ? WHERE version_id = ? AND status = ?'
    ).bind(normalizedDecision, id, 'pending'),
  ]);

  if (!results || !results[0] || !results[1] ||
      Number(results[0].meta && results[0].meta.changes) !== 1 ||
      Number(results[1].meta && results[1].meta.changes) !== 1) {
    const version = await getTaskInstructionVersion(env, id);
    if (!version) throw new Error('version_not_found');
    throw new Error('invalid_version_state');
  }
  return getTaskInstructionVersion(env, id);
}

export async function publishTaskInstructionVersion(env, taskId, versionId) {
  requireDatabase(env);
  const task = normalizeTaskId(taskId);
  const version = normalizeId(versionId, 'invalid_version_id');
  const instructionSet = await getInstructionSetRow(env, task);
  if (!instructionSet) throw new Error('task_instruction_set_not_found');

  const results = await env.DB.batch([
    env.DB.prepare(
      "UPDATE task_instruction_versions SET status = 'published', published_at = datetime('now') " +
      "WHERE version_id = ? AND instruction_id = ? AND status = 'approved'"
    ).bind(version, instructionSet.instruction_id),
    env.DB.prepare(
      "UPDATE task_instruction_sets SET active_version_id = ?, updated_at = datetime('now') " +
      "WHERE instruction_id = ? AND EXISTS (" +
      "SELECT 1 FROM task_instruction_versions WHERE version_id = ? AND instruction_id = ? AND status = 'published')"
    ).bind(version, instructionSet.instruction_id, version, instructionSet.instruction_id),
  ]);

  const versionRow = await getTaskInstructionVersion(env, version);
  if (!versionRow) throw new Error('version_not_found');
  if (versionRow.instruction_id !== instructionSet.instruction_id) {
    throw new Error('version_task_mismatch');
  }
  if (versionRow.status !== 'published') throw new Error('approval_required');

  const refreshed = await getInstructionSetRow(env, task);
  if (!refreshed || refreshed.active_version_id !== version) {
    throw new Error('task_instruction_publish_failed');
  }
  return { instruction_set: mapInstructionSet(refreshed), version: versionRow, batch_results: results };
}

export async function getActiveTaskInstructionVersion(env, taskId) {
  requireDatabase(env);
  const id = normalizeTaskId(taskId);
  const row = await env.DB.prepare(
    'SELECT v.version_id, v.instruction_id, v.version_number, v.fields_json, v.content_hash, v.status, v.created_by, v.created_at, v.published_at ' +
    'FROM task_instruction_sets s ' +
    'INNER JOIN task_instruction_versions v ON v.instruction_id = s.instruction_id AND v.version_id = s.active_version_id ' +
    'WHERE s.task_id = ? AND v.status = ?'
  ).bind(id, 'published').first();
  return mapVersion(row);
}
