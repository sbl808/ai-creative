// Admin API handlers for Task Instruction drafts, versions, submission and preview.
import { getTaskCatalogItem } from '../cms/repositories/task-catalog.js';
import {
  ensureTaskInstructionSet,
  getTaskInstructionDraft,
  saveTaskInstructionDraft,
  resetTaskInstructionDraft,
  listTaskInstructionVersions,
  getTaskInstructionVersion,
} from '../cms/repositories/task-instructions.js';
import { submitTaskInstructions } from '../cms/task-instructions/workflow.js';
import { getGlobalPolicyConfig } from '../cms/global-policies/index.js';
import { getStudioStoryTypeConfig } from '../cms/studio-brains/index.js';
import { buildPromptContext } from '../prompt/orchestrator/index.js';
import {
  taskApiJson,
  readTaskApiBody,
  taskApiError,
  logTaskAdminAction,
} from './task-api-utils.js';

const TASKS = '/api/admin/tasks';
const VERSIONS = '/api/admin/task-versions';

function normalizePlan(value) {
  const plan = String(value || 'FREE').trim().toUpperCase();
  if (!['FREE', 'PRO'].includes(plan)) throw new Error('invalid_plan');
  return plan;
}

function normalizeUserInput(value) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length > 64) {
    throw new Error('invalid_user_input');
  }
  for (const fieldValue of Object.values(value)) {
    if (typeof fieldValue !== 'string' && typeof fieldValue !== 'number' &&
        typeof fieldValue !== 'boolean') {
      throw new Error('invalid_user_input');
    }
    if (typeof fieldValue === 'string' && fieldValue.length > 30000) {
      throw new Error('invalid_user_input');
    }
    if (typeof fieldValue === 'number' && !Number.isFinite(fieldValue)) {
      throw new Error('invalid_user_input');
    }
  }
  return value;
}

function normalizeUserPrompt(value) {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > 20000) {
    throw new Error('invalid_user_prompt');
  }
  return value;
}

function normalizeRuntimeParameters(value) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid_runtime_parameters');
  }
  if (Object.keys(value).length > 32) throw new Error('too_many_runtime_parameters');
  for (const parameterValue of Object.values(value)) {
    if (typeof parameterValue !== 'string' && typeof parameterValue !== 'number' &&
        typeof parameterValue !== 'boolean') {
      throw new Error('invalid_runtime_parameters');
    }
    if (typeof parameterValue === 'string' && parameterValue.length > 2000) {
      throw new Error('invalid_runtime_parameters');
    }
    if (typeof parameterValue === 'number' && !Number.isFinite(parameterValue)) {
      throw new Error('invalid_runtime_parameters');
    }
  }
  return value;
}

export async function handleTaskInstructionsAdminApi(request, path, env, user) {
  const isTaskPath = path === TASKS || path.startsWith(TASKS + '/');
  const isVersionPath = path.startsWith(VERSIONS + '/');
  if (!isTaskPath && !isVersionPath) return null;
  const method = request.method;

  try {
    const versionMatch = path.match(/^\/api\/admin\/task-versions\/([^/]+)$/);
    if (versionMatch && method === 'GET') {
      const version = await getTaskInstructionVersion(env, decodeURIComponent(versionMatch[1]));
      if (!version) return taskApiJson({ error: 'version_not_found' }, 404);
      return taskApiJson({ ok: true, version });
    }

    const draftMatch = path.match(/^\/api\/admin\/tasks\/([^/]+)\/draft$/);
    if (draftMatch) {
      const taskId = decodeURIComponent(draftMatch[1]);
      if (method === 'GET') {
        const task = await getTaskCatalogItem(env, taskId);
        if (!task) return taskApiJson({ error: 'task_not_found' }, 404);
        await ensureTaskInstructionSet(env, taskId, {});
        const draft = await getTaskInstructionDraft(env, taskId);
        if (!draft) throw new Error('task_instruction_draft_not_found');
        return taskApiJson({ ok: true, draft });
      }
      if (method === 'PUT') {
        const body = await readTaskApiBody(request);
        if (!body || body.expectedRevision === undefined || body.fields === undefined) {
          return taskApiJson({ error: 'invalid_request' }, 400);
        }
        const draft = await saveTaskInstructionDraft(
          env, taskId, body.fields, body.expectedRevision, user.email
        );
        await logTaskAdminAction(env, user, 'task_instruction_draft_save', {
          task_id: taskId,
          revision: draft.revision,
        });
        return taskApiJson({ ok: true, draft });
      }
    }

    const resetMatch = path.match(/^\/api\/admin\/tasks\/([^/]+)\/draft\/reset$/);
    if (resetMatch && method === 'POST') {
      const taskId = decodeURIComponent(resetMatch[1]);
      const body = await readTaskApiBody(request);
      if (!body || body.expectedRevision === undefined) {
        return taskApiJson({ error: 'invalid_request' }, 400);
      }
      const draft = await resetTaskInstructionDraft(
        env, taskId, body.expectedRevision, user.email
      );
      await logTaskAdminAction(env, user, 'task_instruction_draft_reset', {
        task_id: taskId,
        revision: draft.revision,
      });
      return taskApiJson({ ok: true, draft });
    }

    const versionsMatch = path.match(/^\/api\/admin\/tasks\/([^/]+)\/versions$/);
    if (versionsMatch && method === 'GET') {
      const taskId = decodeURIComponent(versionsMatch[1]);
      const task = await getTaskCatalogItem(env, taskId);
      if (!task) return taskApiJson({ error: 'task_not_found' }, 404);
      return taskApiJson({ ok: true, items: await listTaskInstructionVersions(env, taskId) });
    }

    const submitMatch = path.match(/^\/api\/admin\/tasks\/([^/]+)\/submit$/);
    if (submitMatch && method === 'POST') {
      const taskId = decodeURIComponent(submitMatch[1]);
      const version = await submitTaskInstructions(env, taskId, user.email);
      await logTaskAdminAction(env, user, 'task_instruction_submit', {
        task_id: taskId,
        version_id: version.version_id,
      });
      return taskApiJson({ ok: true, version }, 201);
    }

    const previewMatch = path.match(/^\/api\/admin\/tasks\/([^/]+)\/preview$/);
    if (previewMatch && method === 'POST') {
      const taskId = decodeURIComponent(previewMatch[1]);
      const body = await readTaskApiBody(request) || {};
      const task = await getTaskCatalogItem(env, taskId);
      if (!task) return taskApiJson({ error: 'task_not_found' }, 404);
      const draft = await getTaskInstructionDraft(env, taskId);
      if (!draft) throw new Error('task_instruction_draft_not_found');

      const plan = normalizePlan(body.plan);
      const globalPolicy = await getGlobalPolicyConfig(env, plan);
      let studioBrain = {};
      if (task.studio_id === 'story' && body.storyTypeId !== undefined) {
        studioBrain = await getStudioStoryTypeConfig(env, body.storyTypeId, plan);
      }
      const runtimeParameters = normalizeRuntimeParameters(body.runtimeParameters);
      const context = buildPromptContext({
        globalPolicy,
        studioBrain,
        taskInstructions: draft.fields,
        userInput: normalizeUserInput(body.userInput),
        userPrompt: normalizeUserPrompt(body.userPrompt),
      });

      // Runtime parameters are deliberately returned separately and never merged
      // into trusted instruction fields or written to storage/logs.
      return taskApiJson({
        ok: true,
        task_id: task.task_id,
        draft_revision: draft.revision,
        sources: {
          global_policy: Object.keys(globalPolicy).length > 0,
          studio_brain: Object.keys(studioBrain).length > 0,
          task_instructions: Object.keys(draft.fields).length > 0,
        },
        prompt: {
          system: context.system,
          user: context.prompt,
          fields: context.fields,
        },
        runtime_parameters: runtimeParameters,
        preview_only: true,
        provider_called: false,
      });
    }

    return null;
  } catch (error) {
    return taskApiError(error);
  }
}
