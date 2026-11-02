// Task Catalog repository.
// Stores platform-managed task metadata only; user content stays in browser IndexedDB.

import { getStudio } from '../../config/studios.js';
import { AI_CAPABILITIES_BY_CATEGORY, MODEL_CATEGORIES } from '../../config/models.js';

const TASK_ID_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const TASK_CATEGORIES = new Set(MODEL_CATEGORIES);
const CAPABILITIES_BY_CATEGORY = AI_CAPABILITIES_BY_CATEGORY;

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

function normalizeStudioId(value) {
  const studioId = String(value || '').trim().toLowerCase();
  if (!studioId || !getStudio(studioId)) throw new Error('invalid_studio_id');
  return studioId;
}

function normalizeCategory(value) {
  const category = String(value || '').trim().toLowerCase();
  if (!TASK_CATEGORIES.has(category)) throw new Error('invalid_task_category');
  return category;
}

function normalizeCapabilities(value, category) {
  let input = value;
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch (_) {
      throw new Error('invalid_task_capabilities');
    }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('invalid_task_capabilities');
  }

  const anyOf = input.any_of;
  if (!Array.isArray(anyOf) || anyOf.length === 0 || anyOf.length > 20) {
    throw new Error('invalid_task_capabilities');
  }

  const allowed = new Set(CAPABILITIES_BY_CATEGORY[category] || []);
  const normalized = [];
  for (const item of anyOf) {
    if (typeof item !== 'string') throw new Error('invalid_task_capabilities');
    const capability = item.trim().toLowerCase();
    if (!capability || capability.length > 80 || !allowed.has(capability)) {
      throw new Error('invalid_task_capabilities');
    }
    if (!normalized.includes(capability)) normalized.push(capability);
  }

  return { any_of: normalized };
}

function normalizeName(value) {
  const name = String(value || '').trim();
  if (!name || name.length > 120) throw new Error('invalid_task_name');
  return name;
}

function normalizeDescription(value) {
  const description = value === undefined || value === null ? '' : String(value).trim();
  if (description.length > 1000) throw new Error('invalid_task_description');
  return description;
}

function normalizeEnabled(value) {
  if (value === true || value === 1) return 1;
  if (value === false || value === 0) return 0;
  throw new Error('invalid_task_status');
}

function normalizeTaskInput(input, options = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('invalid_task');
  }

  const category = normalizeCategory(input.category);
  const task = {
    studio_id: normalizeStudioId(input.studio_id),
    name: normalizeName(input.name),
    category,
    required_capabilities_json: JSON.stringify(
      normalizeCapabilities(input.required_capabilities_json ?? input.required_capabilities, category)
    ),
    description: normalizeDescription(input.description),
  };

  if (options.includeTaskId) task.task_id = normalizeTaskId(input.task_id);
  if (input.enabled !== undefined) {
    if (!options.allowEnabled) throw new Error('task_status_requires_status_endpoint');
    task.enabled = normalizeEnabled(input.enabled);
  }
  return task;
}

function mapTaskRow(row) {
  if (!row) return null;
  let requiredCapabilities;
  try {
    requiredCapabilities = JSON.parse(row.required_capabilities_json);
  } catch (_) {
    throw new Error('invalid_task_capabilities');
  }
  return {
    task_id: row.task_id,
    studio_id: row.studio_id,
    name: row.name,
    category: row.category,
    required_capabilities: requiredCapabilities,
    description: row.description || '',
    enabled: row.enabled === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listTaskCatalog(env, filters = {}) {
  requireDatabase(env);
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
    throw new Error('invalid_task_filters');
  }

  const clauses = [];
  const values = [];

  if (filters.studio_id !== undefined && filters.studio_id !== '') {
    clauses.push('studio_id = ?');
    values.push(normalizeStudioId(filters.studio_id));
  }
  if (filters.category !== undefined && filters.category !== '') {
    clauses.push('category = ?');
    values.push(normalizeCategory(filters.category));
  }
  if (filters.enabled !== undefined && filters.enabled !== '') {
    clauses.push('enabled = ?');
    values.push(normalizeEnabled(filters.enabled));
  }

  const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
  const { results } = await env.DB.prepare(
    'SELECT task_id, studio_id, name, category, required_capabilities_json, description, enabled, created_at, updated_at ' +
    'FROM task_catalog' + where + ' ORDER BY studio_id, category, task_id'
  ).bind(...values).all();

  return (results || []).map(mapTaskRow);
}

export async function getTaskCatalogItem(env, taskId) {
  requireDatabase(env);
  const id = normalizeTaskId(taskId);
  const row = await env.DB.prepare(
    'SELECT task_id, studio_id, name, category, required_capabilities_json, description, enabled, created_at, updated_at ' +
    'FROM task_catalog WHERE task_id = ?'
  ).bind(id).first();
  return mapTaskRow(row);
}

export async function createTaskCatalogItem(env, input) {
  requireDatabase(env);
  const task = normalizeTaskInput(input, { includeTaskId: true, allowEnabled: true });
  const enabled = task.enabled === undefined ? 1 : task.enabled;

  try {
    await env.DB.prepare(
      "INSERT INTO task_catalog (task_id, studio_id, name, category, required_capabilities_json, description, enabled, created_at, updated_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    ).bind(
      task.task_id,
      task.studio_id,
      task.name,
      task.category,
      task.required_capabilities_json,
      task.description,
      enabled
    ).run();
  } catch (error) {
    const message = String(error && error.message || error).toLowerCase();
    if (message.includes('unique') || message.includes('primary key')) {
      throw new Error('task_already_exists');
    }
    throw error;
  }

  return getTaskCatalogItem(env, task.task_id);
}

export async function updateTaskCatalogItem(env, taskId, input) {
  requireDatabase(env);
  const id = normalizeTaskId(taskId);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('invalid_task');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'task_id')) {
    throw new Error('task_id_is_immutable');
  }

  const task = normalizeTaskInput(input);
  const result = await env.DB.prepare(
    "UPDATE task_catalog SET studio_id = ?, name = ?, category = ?, required_capabilities_json = ?, description = ?, updated_at = datetime('now') " +
    'WHERE task_id = ?'
  ).bind(
    task.studio_id,
    task.name,
    task.category,
    task.required_capabilities_json,
    task.description,
    id
  ).run();

  if (!result || !result.meta || Number(result.meta.changes) === 0) {
    throw new Error('task_not_found');
  }
  return getTaskCatalogItem(env, id);
}

export async function setTaskCatalogStatus(env, taskId, enabled) {
  requireDatabase(env);
  const id = normalizeTaskId(taskId);
  const status = normalizeEnabled(enabled);
  const result = await env.DB.prepare(
    "UPDATE task_catalog SET enabled = ?, updated_at = datetime('now') WHERE task_id = ?"
  ).bind(status, id).run();

  if (!result || !result.meta || Number(result.meta.changes) === 0) {
    throw new Error('task_not_found');
  }
  return getTaskCatalogItem(env, id);
}
