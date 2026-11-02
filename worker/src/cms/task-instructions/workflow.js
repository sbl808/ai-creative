// Task Instructions workflow service.
// Coordinates catalog and instruction repositories; it does not call AI providers.

import { getTaskCatalogItem } from '../repositories/task-catalog.js';
import {
  ensureTaskInstructionSet,
  getTaskInstructionDraft,
  createTaskInstructionVersion,
  getTaskInstructionVersion,
  recordTaskInstructionReview,
  listTaskInstructionReviews,
  publishTaskInstructionVersion,
  activatePublishedTaskInstructionVersion,
  getActiveTaskInstructionVersion,
  verifyTaskInstructionVersionIntegrity,
} from '../repositories/task-instructions.js';

function requireTask(task) {
  if (!task) throw new Error('task_not_found');
  return task;
}

async function getTaskOrFail(env, taskId) {
  return requireTask(await getTaskCatalogItem(env, taskId));
}

async function getVersionForTaskOrFail(env, taskId, versionId) {
  const task = await getTaskOrFail(env, taskId);
  const version = await getTaskInstructionVersion(env, versionId);
  if (!version) throw new Error('version_not_found');
  const instructionSet = await ensureTaskInstructionSet(env, task.task_id);
  if (version.instruction_id !== instructionSet.instruction_id) {
    throw new Error('version_task_mismatch');
  }
  return { task, instructionSet, version };
}

export async function initializeTaskInstructions(env, taskId, initialFields = {}) {
  await getTaskOrFail(env, taskId);
  const instructionSet = await ensureTaskInstructionSet(env, taskId, initialFields);
  const draft = await getTaskInstructionDraft(env, taskId);
  if (!draft) throw new Error('task_instruction_draft_not_found');
  return { instruction_set: instructionSet, draft };
}

export async function submitTaskInstructions(env, taskId, createdBy = null) {
  await getTaskOrFail(env, taskId);
  const draft = await getTaskInstructionDraft(env, taskId);
  if (!draft) throw new Error('task_instruction_draft_not_found');
  return createTaskInstructionVersion(env, taskId, createdBy);
}

export async function reviewTaskInstructions(env, versionId, decision, reviewedBy = null, comment = null) {
  const version = await getTaskInstructionVersion(env, versionId);
  if (!version) throw new Error('version_not_found');
  await verifyTaskInstructionVersionIntegrity(version);
  return recordTaskInstructionReview(env, versionId, decision, reviewedBy, comment);
}

export async function publishTaskInstructions(env, taskId, versionId) {
  const { version } = await getVersionForTaskOrFail(env, taskId, versionId);
  if (version.status !== 'approved') throw new Error('approval_required');
  await verifyTaskInstructionVersionIntegrity(version);
  return publishTaskInstructionVersion(env, taskId, versionId);
}

export async function rollbackTaskInstructions(env, taskId, versionId) {
  const { version } = await getVersionForTaskOrFail(env, taskId, versionId);
  if (version.status !== 'published') throw new Error('invalid_version_state');
  await verifyTaskInstructionVersionIntegrity(version);
  const instructionSet = await activatePublishedTaskInstructionVersion(env, taskId, versionId);
  return { instruction_set: instructionSet, version };
}

export async function getTaskInstructionReviewHistory(env, versionId) {
  const version = await getTaskInstructionVersion(env, versionId);
  if (!version) throw new Error('version_not_found');
  return listTaskInstructionReviews(env, versionId);
}

// Runtime resolver: disabled/unknown tasks and missing or corrupt published
// instructions fail closed before any prompt can be assembled.
export async function resolvePublishedTaskInstructions(env, taskId) {
  const task = await getTaskOrFail(env, taskId);
  if (!task.enabled) throw new Error('task_disabled');

  const version = await getActiveTaskInstructionVersion(env, task.task_id);
  if (!version) throw new Error('task_instruction_not_published');

  await verifyTaskInstructionVersionIntegrity(version);
  return {
    task,
    instruction_version: version,
    task_instructions: version.fields,
  };
}
