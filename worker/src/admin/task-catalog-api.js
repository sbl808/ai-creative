// Admin API handlers for Task Catalog metadata.
import {
  listTaskCatalog,
  getTaskCatalogItem,
  createTaskCatalogItem,
  updateTaskCatalogItem,
  setTaskCatalogStatus,
} from '../cms/repositories/task-catalog.js';
import {
  taskApiJson,
  readTaskApiBody,
  taskApiError,
  logTaskAdminAction,
} from './task-api-utils.js';

const BASE = '/api/admin/tasks';

export async function handleTaskCatalogAdminApi(request, path, env, user) {
  if (path !== BASE && !path.startsWith(BASE + '/')) return null;
  const method = request.method;

  try {
    if (path === BASE && method === 'GET') {
      const url = new URL(request.url);
      const filters = {};
      for (const key of ['studio_id', 'category', 'enabled']) {
        if (url.searchParams.has(key)) filters[key] = url.searchParams.get(key);
      }
      return taskApiJson({ ok: true, items: await listTaskCatalog(env, filters) });
    }

    if (path === BASE && method === 'POST') {
      const body = await readTaskApiBody(request);
      if (!body) return taskApiJson({ error: 'invalid_request' }, 400);
      const item = await createTaskCatalogItem(env, body);
      await logTaskAdminAction(env, user, 'task_catalog_create', { task_id: item.task_id });
      return taskApiJson({ ok: true, item }, 201);
    }

    const statusMatch = path.match(/^\/api\/admin\/tasks\/([^/]+)\/status$/);
    if (statusMatch && method === 'PUT') {
      const taskId = decodeURIComponent(statusMatch[1]);
      const body = await readTaskApiBody(request);
      if (!body || typeof body.enabled !== 'boolean') {
        return taskApiJson({ error: 'invalid_task_status' }, 400);
      }
      const item = await setTaskCatalogStatus(env, taskId, body.enabled);
      await logTaskAdminAction(env, user, 'task_catalog_status', {
        task_id: item.task_id,
        enabled: item.enabled,
      });
      return taskApiJson({ ok: true, item });
    }

    const taskMatch = path.match(/^\/api\/admin\/tasks\/([^/]+)$/);
    if (taskMatch) {
      const taskId = decodeURIComponent(taskMatch[1]);
      if (method === 'GET') {
        const item = await getTaskCatalogItem(env, taskId);
        if (!item) return taskApiJson({ error: 'task_not_found' }, 404);
        return taskApiJson({ ok: true, item });
      }
      if (method === 'PUT') {
        const body = await readTaskApiBody(request);
        if (!body) return taskApiJson({ error: 'invalid_request' }, 400);
        const item = await updateTaskCatalogItem(env, taskId, body);
        await logTaskAdminAction(env, user, 'task_catalog_update', { task_id: item.task_id });
        return taskApiJson({ ok: true, item });
      }
    }

    return taskApiJson({ error: 'method_not_allowed' }, 405);
  } catch (error) {
    return taskApiError(error);
  }
}
