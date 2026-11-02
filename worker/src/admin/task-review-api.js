// Admin API handlers for Task Instruction review, publish and rollback.
import { getTaskInstructionVersion } from '../cms/repositories/task-instructions.js';
import {
  reviewTaskInstructions,
  publishTaskInstructions,
  rollbackTaskInstructions,
  getTaskInstructionReviewHistory,
} from '../cms/task-instructions/workflow.js';
import { getTaskCatalogItem } from '../cms/repositories/task-catalog.js';
import {
  taskApiJson,
  readTaskApiBody,
  taskApiError,
  logTaskAdminAction,
} from './task-api-utils.js';

const TASKS = '/api/admin/tasks';
const VERSIONS = '/api/admin/task-versions';

export async function handleTaskReviewAdminApi(request, path, env, user) {
  const isTaskPath = path === TASKS || path.startsWith(TASKS + '/');
  const isVersionPath = path.startsWith(VERSIONS + '/');
  if (!isTaskPath && !isVersionPath) return null;

  const method = request.method;
  try {
    const reviewHistoryMatch = path.match(/^\/api\/admin\/task-versions\/([^/]+)\/reviews$/);
    if (reviewHistoryMatch && method === 'GET') {
      const versionId = decodeURIComponent(reviewHistoryMatch[1]);
      return taskApiJson({ ok: true, items: await getTaskInstructionReviewHistory(env, versionId) });
    }

    const approveMatch = path.match(/^\/api\/admin\/task-versions\/([^/]+)\/(approve|reject)$/);
    if (approveMatch && method === 'POST') {
      const versionId = decodeURIComponent(approveMatch[1]);
      const decision = approveMatch[2] === 'approve' ? 'approved' : 'rejected';
      const body = await readTaskApiBody(request) || {};
      const version = await reviewTaskInstructions(
        env, versionId, decision, user.email, body.comment
      );
      await logTaskAdminAction(env, user, 'task_instruction_' + decision, {
        version_id: version.version_id,
      });
      return taskApiJson({ ok: true, version });
    }

    const publishMatch = path.match(/^\/api\/admin\/task-versions\/([^/]+)\/publish$/);
    if (publishMatch && method === 'POST') {
      const versionId = decodeURIComponent(publishMatch[1]);
      const version = await getTaskInstructionVersion(env, versionId);
      if (!version) return taskApiJson({ error: 'version_not_found' }, 404);
      const owner = await env.DB.prepare(
        'SELECT task_id FROM task_instruction_sets WHERE instruction_id = ?'
      ).bind(version.instruction_id).first();
      if (!owner) return taskApiJson({ error: 'task_instruction_set_not_found' }, 404);
      const result = await publishTaskInstructions(env, owner.task_id, versionId);
      await logTaskAdminAction(env, user, 'task_instruction_publish', {
        task_id: owner.task_id,
        version_id: versionId,
      });
      return taskApiJson({ ok: true, ...result });
    }

    const rollbackMatch = path.match(/^\/api\/admin\/tasks\/([^/]+)\/rollback$/);
    if (rollbackMatch && method === 'POST') {
      const taskId = decodeURIComponent(rollbackMatch[1]);
      const body = await readTaskApiBody(request);
      if (!body || !body.versionId) return taskApiJson({ error: 'version_id_required' }, 400);
      const result = await rollbackTaskInstructions(env, taskId, body.versionId);
      await logTaskAdminAction(env, user, 'task_instruction_rollback', {
        task_id: taskId,
        version_id: body.versionId,
      });
      return taskApiJson({ ok: true, ...result });
    }

    return null;
  } catch (error) {
    return taskApiError(error);
  }
}
